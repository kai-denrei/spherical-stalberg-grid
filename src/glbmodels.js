// glbmodels.js — shared machinery for authored models (.glb) used as game
// pieces. DOM-light; imported by towerlooks.js and units.js.
//
// Three problems every authored model hits here, all of them measured
// rather than assumed:
//
// 1. SCALE. Exported models carry whatever units the artist worked in.
//    Fitting matters in a specific way: these models are much WIDER than
//    they are tall, so fitting by footprint makes a squat smear and fitting
//    by height alone sprawls them over their neighbours. Fit by height,
//    capped by span.
// 2. VISIBILITY. A dark machine vanishes against a black board of neon
//    wire. The game colour goes on as EMISSIVE rather than replacing the
//    model's own materials.
// 3. DRAW CALLS. These models are ~60-110 separate meshes. Merging per
//    material cuts that by an order of magnitude — but merging destroys
//    articulation, so anything that must still MOVE has to be preserved.
import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

// bust.sh's fingerprint-urls.py rewrites HTML attributes and CSS url() only
// — never JS string literals — so a path built here would ship untokened.
// Reading the <meta name="cb"> tag it already maintains gets it for free.
export function bustToken() {
  const m = typeof document !== 'undefined' && document.querySelector('meta[name="cb"]');
  const v = m && m.content ? m.content.trim() : '';
  return v ? `?v=${encodeURIComponent(v)}` : '';
}

// One in-flight load per URL, cached forever. Never rejects: a failed load
// resolves to null so callers fall back to a procedural model rather than
// rendering nothing.
const loads = new Map();
export function loadGlb(url) {
  if (loads.has(url)) return loads.get(url);
  const p = new Promise((resolve) => {
    new GLTFLoader().load(`${url}${bustToken()}`,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => { console.warn(`[glbmodels] ${url} failed to load`, err); resolve(null); });
  });
  loads.set(url, p);
  return p;
}

// Collapse leaf meshes to ONE MESH PER (articulation owner, material).
//
// `pivotNames` are nodes that must keep moving — a turret that aims, a gun
// that tracks. Meshes under one of those merge into THAT node's local space
// and stay attached to it; everything else merges into the root. Empty
// Object3Ds left behind cost nothing and keep the original transforms
// intact, so a preserved pivot still sits exactly where the artist put it.
//
// With no pivots this is a full flatten, which is what a static prop wants.
export function mergeByMaterial(root, pivotNames = []) {
  root.updateMatrixWorld(true);
  const pivots = pivotNames
    .map((n) => root.getObjectByName(n))
    .filter(Boolean);
  const ownerOf = (mesh) => {
    for (let o = mesh; o; o = o.parent) if (pivots.includes(o)) return o;
    return root;
  };

  const batches = new Map(); // owner -> Map(material -> [geometry])
  const originals = [];
  const inv = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const owner = ownerOf(o);
    const g = o.geometry.clone();
    // express the geometry in the OWNER's local space, not the world's
    inv.copy(owner.matrixWorld).invert();
    g.applyMatrix4(inv.multiply(o.matrixWorld));
    // mergeGeometries needs an identical attribute set across the batch and
    // returns null rather than throwing when they differ — so normalize to
    // the two attributes every part is guaranteed to have.
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!batches.has(owner)) batches.set(owner, new Map());
    const byMat = batches.get(owner);
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat).push(g);
    originals.push(o);
  });

  for (const o of originals) o.parent?.remove(o);
  for (const [owner, byMat] of batches) {
    for (const [mat, geos] of byMat) {
      const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      if (!merged) { // defensive: keep the parts rather than lose the model
        for (const g of geos) owner.add(new THREE.Mesh(g, mat));
        continue;
      }
      owner.add(new THREE.Mesh(merged, mat));
    }
  }
  return root;
}

// Fit a model into a target envelope and rest it on y=0.
//
// `recentreOn` names a node to centre horizontally on INSTEAD of the
// bounding box. That matters: a tank's bounding box is skewed forward by
// its gun barrel, so centring on the box would make it pivot around a point
// out in front of itself. Centre on the hull.
export function fitModel(obj, { height, maxSpan, recentreOn = null }) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  const centre = new THREE.Vector3(); box.getCenter(centre);

  let cx = centre.x, cz = centre.z;
  if (recentreOn) {
    const node = obj.getObjectByName(recentreOn);
    if (node) {
      const p = new THREE.Vector3();
      node.getWorldPosition(p);
      cx = p.x; cz = p.z;
    }
  }

  const wide = Math.max(size.x, size.z) || 1;
  const k = Math.min(height / (size.y || 1), maxSpan / wide);
  const g = new THREE.Group();
  obj.scale.setScalar(k);
  obj.position.set(-cx * k, -box.min.y * k, -cz * k);
  g.add(obj);
  g.userData.fitScale = k;
  return g;
}

// Tint an authored model so it reads as a shaded machine rather than a
// single coloured mass.
//
// The naive version — one emissive wash over every material — is what
// produced the mass. Measured on mkcx, its four structural materials sit at
// luminance 0.061 to 0.113: a span of 0.05, all muddy olive-grey. Adding an
// identical wash to each compressed even that away.
//
// So each material gets its own rung on a lightness LADDER, keyed by name.
// Same hue, clearly different values — armour bright, steel dark — which is
// what makes panels, plates and mantlets read as separate surfaces. The
// parts the artist named "glow" keep full emissive colour and sit above the
// ladder entirely.
const GLOW = /glow/i;
const DEFAULT_SHADES = { armour: 1.0, turret: 0.72, detail: 0.5, steel: 0.34 };

function rungFor(name, shades) {
  const n = (name || '').toLowerCase();
  for (const key of Object.keys(shades)) if (n.includes(key)) return shades[key];
  return 0.6; // unnamed / unknown: mid-ladder
}

export function tintModel(root, color, opts = {}) {
  // number = the old wash-only form, kept so the towers keep their look
  const o = typeof opts === 'number' ? { wash: opts } : opts;
  const wash = o.wash ?? 0.28;
  const shades = o.shades ?? null;      // null = wash only, no ladder
  const sat = o.sat ?? 0.55;
  const loFrom = o.lightFrom ?? 0.20;
  const loTo = o.lightTo ?? 0.62;

  const c = new THREE.Color(color);
  const dim = c.clone().multiplyScalar(wash);
  const hsl = {}; c.getHSL(hsl);

  root.traverse((obj) => {
    // outlines are LineSegments, not meshes — they take the tint at full
    // strength, because the bright edge IS the read
    if (obj.isLineSegments && obj.material) {
      const lm = obj.material.clone();
      if (lm.color) lm.color.copy(c);
      obj.material = lm;
      return;
    }
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    obj.material = mats.map((m) => {
      const cl = m.clone(); // clone: prototypes are shared between instances
      const hot = GLOW.test(m.name || '');
      if (hot) {
        if (cl.emissive) {
          cl.emissive.copy(c);
          if ('emissiveIntensity' in cl) cl.emissiveIntensity = 1.6;
        } else if (cl.color) {
          cl.color.copy(c); // unlit: no emissive channel to use
        }
        return cl;
      }
      if (shades && cl.color) {
        const rung = rungFor(m.name, shades);
        // same hue, desaturated toward metal, LIGHTNESS carrying the rung
        cl.color.setHSL(hsl.h, hsl.s * sat, loFrom + (loTo - loFrom) * rung);
        if (cl.emissive) cl.emissive.copy(c).multiplyScalar(wash * 0.45 * rung);
      } else if (cl.emissive) {
        cl.emissive.copy(dim);
      }
      return cl;
    });
    if (obj.material.length === 1) obj.material = obj.material[0];
  });
}

// A 3x3 shell rack, matching the procedural tank's: row-major, index < ammo
// lit. Returned so the caller can hand it to td-tab as userData.ammoDots.
export function makeShellRack(parent, { x = 0, y = 0, z = 0, dot = 0.05, gapX = 0.24, gapZ = 0.28 } = {}) {
  const geo = new THREE.SphereGeometry(dot, 6, 6);
  const dots = [];
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 3; col++) {
      const d = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      d.position.set(x + (col - 1) * gapX, y, z + (r - 1) * gapZ);
      parent.add(d);
      dots.push(d);
    }
  }
  return dots;
}

// --- the house Tron kit ---------------------------------------------------
// Our procedural units are dark bodies wearing bright additive edges; an
// imported model arrives as shaded surfaces with no edges at all, which is
// most of why it reads as a lump next to them. These give a model the same
// language.

// Bright creases on every merged mesh. `angle` is what keeps this from
// becoming a wireframe: EdgesGeometry defaults to 1 degree and would draw
// every triangle boundary. ~28 degrees keeps only the real panel lines.
//
// Built on the PROTOTYPE so the geometry is computed once and every clone
// shares it; tintModel recolours the material per instance.
export function addEdgeOutlines(root, { angle = 28, opacity = 0.85, color = 0xffffff } = {}) {
  const mat = new THREE.LineBasicMaterial({
    color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && o.geometry) meshes.push(o); });
  for (const m of meshes) {
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, angle), mat));
  }
  return root;
}

// A heat sleeve around a gun: the diegetic gauge our tank already uses,
// cool cyan to red as the cannon heats. Returned so the caller can hand it
// over as userData.heatSleeve — td-tab lerps its material colour directly.
export function makeHeatSleeve(parent, { radius = 0.32, len = 0.5, z = 1.4, color = 0x7df9ff } = {}) {
  const geo = new THREE.CylinderGeometry(radius, radius, len, 12, 1, true)
    .rotateX(Math.PI / 2); // barrels run along +Z, cylinders are born along +Y
  const sleeve = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
  }));
  sleeve.position.z = z;
  parent.add(sleeve);
  return sleeve;
}

// Glowing tubes for a pair of guns, matching the procedural tank's
// mini-guns. Inserted at child index 0 because td-tab reads the heat gauge
// off guns[0].children[0] — appending would leave it recolouring a chunk of
// the model instead. One shared material, so both tubes heat together.
export function addGunTubes(guns, { radius = 0.12, len = 1.0, z = 0.5, color = 0x7df9ff } = {}) {
  const geo = new THREE.CylinderGeometry(radius, radius * 1.25, len, 8)
    .rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color });
  for (const gun of guns) {
    const tube = new THREE.Mesh(geo, mat);
    tube.position.z = z;
    gun.add(tube);
    gun.children.splice(gun.children.indexOf(tube), 1);
    gun.children.unshift(tube); // index 0: the gauge td-tab drives
  }
  return mat;
}
