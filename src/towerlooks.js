// towerlooks.js — the tower VISUAL registry.
//
// Tower combat math lives in towers.js and must never be touched to change
// how a tower looks. This file is the seam: a look is a named builder that
// turns a tower def into an Object3D, and swapping looks rebuilds only the
// `obj` on a tower — key, def, tier, cell, cooldown and spend are game
// state and stay exactly where they were.
//
// The contract a look MUST satisfy, read off td-tab's call sites:
//   - returns a THREE.Group that raycasts (tap-to-select hits it)
//   - userData.baseScale : placement multiplies by this
//   - userData.tick(t)   : optional idle animation
//   - userData.lift      : optional, how far off the surface
// Every look shares the same MAST (base, column, collar) so they read as
// one family of machine and only the head changes.
//
// `preload` is optional and returns a Promise. It exists for looks whose
// assets arrive asynchronously — a GLB, say — so those can drop in later
// without reshaping this interface. A look with no preload is ready
// immediately; a look whose preload has not resolved falls back.
import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { makeTowerMast, makeTowerUnit } from './units.js?v=21e3a718';

// def.shape -> a solid primitive, so the SOLID look keeps each tower's
// silhouette identity from towers.js rather than inventing its own.
function solidHeadGeometry(shape) {
  switch (shape) {
    case 'cone':      return new THREE.ConeGeometry(0.42, 0.86, 7);
    case 'pyramid':   return new THREE.ConeGeometry(0.46, 0.8, 4);
    case 'teardrop':  return new THREE.ConeGeometry(0.36, 0.95, 10);
    case 'bipyramid': return new THREE.OctahedronGeometry(0.5);
    case 'gear':      return new THREE.TorusGeometry(0.34, 0.16, 6, 8);
    case 'spiral':    return new THREE.TorusKnotGeometry(0.3, 0.1, 48, 6, 2, 3);
    case 'dspiral':   return new THREE.TorusKnotGeometry(0.3, 0.1, 48, 6, 3, 2);
    case 'sphere':
    default:          return new THREE.IcosahedronGeometry(0.46, 0);
  }
}

// SOLID: the same mast, but a faceted tinted head with bright edges
// instead of the dot cloud. Reads as machined hardware rather than a
// hovering swarm — the clearest possible contrast at a glance, which is
// what makes it useful for judging the swap.
function makeTowerSolid(def) {
  const { g, head, edge } = makeTowerMast(def);
  const body = new THREE.MeshLambertMaterial({
    color: def.color, emissive: new THREE.Color(def.color).multiplyScalar(0.18),
  });
  const geo = solidHeadGeometry(def.shape);
  const mesh = new THREE.Mesh(geo, body);
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
  head.add(mesh);
  // slower than the cloud and with no bob: solid mass should feel heavier
  const spin = (def.spin ?? 0.6) * 0.45;
  g.userData.tick = (t) => { head.rotation.y = t * spin; };
  return g;
}

// --- GLB looks ------------------------------------------------------------
// Models arrive asynchronously, which is the whole reason the registry has
// preload/lookReady: until the bytes land, build() falls back to braille so
// a tower is never invisible.

// bust.sh's fingerprint-urls.py rewrites HTML attributes and CSS url() only —
// never JS string literals — so a path built here would ship untokened.
// Reading the <meta name="cb"> tag it already maintains gets it for free.
function bustToken() {
  const m = typeof document !== 'undefined' && document.querySelector('meta[name="cb"]');
  const v = m && m.content ? m.content.trim() : '';
  return v ? `?v=${encodeURIComponent(v)}` : '';
}

// Collapse an authored model to ONE MESH PER MATERIAL. The heptapod is 109
// separate meshes; eight towers of it would be ~870 draw calls, doubled
// again by the bloom's second scene render. Merging drops that to ~7 per
// tower. The cost is the model's rig: the merged mesh is one rigid body, so
// the turret can no longer turn. For a walker that has DUG IN to be a
// tower, holding still is in character — a fair trade for the draw calls.
function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    // mergeGeometries requires an identical attribute set across the batch,
    // and returns null rather than throwing if they differ — so normalize
    // down to the two attributes every part is guaranteed to have.
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const key = mats[0];
    if (!byMat.has(key)) byMat.set(key, []);
    byMat.get(key).push(g);
  });
  const out = new THREE.Group();
  for (const [mat, geos] of byMat) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) { // defensive: keep the parts rather than lose them
      for (const g of geos) out.add(new THREE.Mesh(g, mat));
      continue;
    }
    out.add(new THREE.Mesh(merged, mat));
  }
  return out;
}

// Normalize an authored model into the mast's envelope: rest it on y=0,
// centre it in x/z, and fit it to a target HEIGHT — capped by a maximum
// footprint. Height is what makes a tower read as a tower; the cap stops a
// wide model (the heptapod is nearly 5 units across and 2.5 tall) from
// sprawling over neighbouring cells.
function normalizeToTower(obj, height, maxSpan) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  const centre = new THREE.Vector3(); box.getCenter(centre);
  const wide = Math.max(size.x, size.z) || 1;
  const k = Math.min(height / (size.y || 1), maxSpan / wide);
  const g = new THREE.Group();
  obj.scale.setScalar(k);
  // x/z centred on the mount, y resting on the surface
  obj.position.set(-centre.x * k, -box.min.y * k, -centre.z * k);
  g.add(obj);
  return g;
}

// Each tower kind must stay tellable apart, so the def's colour goes on as
// EMISSIVE — a neon rim over the model's own materials. Full strength on the
// parts the artist named "glow", a low wash everywhere else: without it a
// dark grey machine simply disappears against a black board with neon wire.
// Unlit materials (KHR_materials_unlit) have no emissive, so they take the
// colour directly.
const GLOW_MATERIALS = /glow/i;
function tintModel(root, color) {
  const c = new THREE.Color(color);
  const wash = c.clone().multiplyScalar(0.28);
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = mats.map((m) => {
      const cl = m.clone(); // clone: the prototype is shared across towers
      const hot = GLOW_MATERIALS.test(m.name || '');
      if (cl.emissive) {
        cl.emissive.copy(hot ? c : wash);
        if ('emissiveIntensity' in cl) cl.emissiveIntensity = hot ? 1.6 : 1.0;
      } else if (cl.color && hot) {
        cl.color.copy(c); // unlit: no emissive channel to use
      }
      return cl;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });
}

function makeGlbLook({ label, url, height, maxSpan }) {
  let proto = null;
  const look = {
    label,
    loaded: false,
    preload() {
      if (look._p) return look._p;
      look._p = new Promise((resolve) => {
        new GLTFLoader().load(`${url}${bustToken()}`,
          (gltf) => {
            proto = normalizeToTower(mergeByMaterial(gltf.scene), height, maxSpan);
            look.loaded = true;
            resolve(true);
          },
          undefined,
          (err) => {
            console.warn(`[towerlooks] ${label} failed to load; falling back`, err);
            resolve(false);
          });
      });
      return look._p;
    },
    build(def) {
      if (!proto) return makeTowerUnit(def); // bytes not in yet — never nothing
      const g = proto.clone(true);
      tintModel(g, def.color);
      g.userData.baseScale = 1 / 1.55;   // same envelope convention as the mast
      g.userData.lift = 0.02;
      g.userData.kind = 'mesh';
      // it is a walker that has DUG IN: the body holds still, only the
      // turret tracks. Uses the model's own rig rather than spinning the
      // whole thing, which would look like it is skating.
      // no tick: merging made it one rigid body, and a dug-in walker
      // holding still is the point
      return g;
    },
  };
  return look;
}

export const TOWER_LOOKS = {
  braille: { label: 'braille', build: makeTowerUnit },
  solid:   { label: 'solid',   build: makeTowerSolid },
  heptapod: makeGlbLook({
    label: 'heptapod',
    url: 'assets/models/heptapod.glb',
    height: 1.35,  // mast units — the braille mast is 1.55 tall
    maxSpan: 2.2,  // but never sprawl wider than this over its neighbours
  }),
};

export const TOWER_LOOK_NAMES = Object.keys(TOWER_LOOKS);
export const DEFAULT_TOWER_LOOK = 'braille';

// Never throws and never returns null: an unknown name (a stale URL hook,
// a saved preference for a look that has since been removed) falls back to
// the default rather than leaving a tower invisible on the board.
export function buildTowerLook(name, def) {
  const look = TOWER_LOOKS[name] || TOWER_LOOKS[DEFAULT_TOWER_LOOK];
  return look.build(def);
}

// Kick off a look's async load if it has one. Resolves to true when the
// look is ready to build for real. Safe to call repeatedly — the promise
// is cached — and safe to call for looks with no assets.
export function preloadLook(name) {
  const look = TOWER_LOOKS[name];
  if (!look || !look.preload) return Promise.resolve(true);
  return look.preload();
}

// A look is usable now if it declares no async assets, or its preload has
// resolved. Callers use this to fall back rather than render nothing.
export function lookReady(name) {
  const look = TOWER_LOOKS[name];
  if (!look) return false;
  return !look.preload || look.loaded === true;
}
