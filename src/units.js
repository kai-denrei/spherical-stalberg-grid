// units.js — the unit roster. Two construction kinds:
//
//   cloud — Braille dot-clouds (creatures.js): ~500–700 points re-posed on
//           the CPU every frame by waveJelly. Beautiful, and fine for ONE
//           hero unit; per-vertex CPU animation does not scale to crowds.
//   mesh  — low-poly polygon groups: static geometry, GPU transforms,
//           animation is transform-only (userData.tick rotates/bobs parts).
//           This is the battle-scale path: hundreds of these are cheap,
//           and the step to InstancedMesh (1 draw call per unit type) is
//           mechanical when the time comes.
//
// Conventions: y-up, +Z forward, normalized to unit radius (baseScale holds
// the normalization factor — multiply, don't overwrite, when sizing).
// userData: { kind, lift (fraction of world size to hover above the floor),
// tick(t) (idle animation) }.

import * as THREE from '../vendor/three.module.js';
import { loadGlb, mergeByMaterial, fitModel, tintModel, makeShellRack,
  addEdgeOutlines, makeHeatSleeve } from './glbmodels.js?v=0bb63cd7';
import { CREATURES, waveJelly, swimWave, spherePts, bulletPts, missilePts, heartPts, torusPts, towerHeadPts, enemyDotPts, portalPts } from './creatures.js?v=0bb63cd7';
import { TOWER_FEEL, TOWER_HEADS, headKindFor } from './towerfeel.js?v=0bb63cd7';
import { STARGATE_PTS, STARGATE_STROKE,
  HORIZON_N, stargateHorizon } from './stargate.js?v=0bb63cd7';
import { ENEMY_SPEC } from './enemyspec.js?v=0bb63cd7';

function normalizeToUnit(group) {
  group.updateMatrixWorld(true);
  let r = 0;
  const v = new THREE.Vector3();
  group.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      r = Math.max(r, v.length());
    }
  });
  if (r > 0) group.scale.setScalar(1 / r);
  group.userData.baseScale = group.scale.x;
  return group;
}

// tank — the mesh-unit proof of concept: hull, treads, turret that sweeps,
// barrel. ~350 triangles, one Lambert material per tint. Tron dressing:
// thin neon white/blue edge lines on the slabs (EdgesGeometry children,
// so they ride each part's transform), a 3×3 diegetic shell rack on the
// turret roof (userData.ammoDots — the game tints them full/empty), and
// two toed-in laser mini-guns at the hull front (userData.laserGuns —
// aim derives from THEIR world transforms, same-source principle).
function makeTank(cols) {
  const main = new THREE.MeshLambertMaterial({ color: cols.walker });
  const accent = new THREE.MeshLambertMaterial({ color: cols.walkerHi });
  const edgeWhite = new THREE.LineBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.9 });
  const edgeBlue = new THREE.LineBasicMaterial({ color: 0x5fc9ff, transparent: true, opacity: 0.85 });
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, parent = g) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const outline = (mesh, mat) => {
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), mat));
  };
  const hull = add(new THREE.BoxGeometry(1.3, 0.4, 2.0), main, 0, 0.48, 0);
  outline(hull, edgeWhite);
  const treadL = add(new THREE.BoxGeometry(0.42, 0.46, 2.35), main, -0.82, 0.26, 0);
  const treadR = add(new THREE.BoxGeometry(0.42, 0.46, 2.35), main, 0.82, 0.26, 0);
  outline(treadL, edgeBlue);
  outline(treadR, edgeBlue);
  const turret = new THREE.Group();
  turret.position.set(0, 0.84, -0.12);
  turret.userData.baseZ = -0.12; // recoil slides the turret back from here
  g.add(turret);
  const turretBox = add(new THREE.BoxGeometry(0.8, 0.34, 1.0), main, 0, 0, 0, turret);
  outline(turretBox, edgeWhite);
  const barrel = add(new THREE.CylinderGeometry(0.06, 0.085, 1.5, 8), accent, 0, 0.04, 1.15, turret);
  barrel.rotation.x = Math.PI / 2;
  // cannon heat sleeve: a collar around the barrel's middle that the game
  // glows red-hot after a shot and cools back to gunmetal (userData ref)
  const sleeve = add(new THREE.CylinderGeometry(0.105, 0.105, 0.45, 8),
    new THREE.MeshBasicMaterial({ color: 0x232833 }), 0, 0.04, 0.95, turret);
  sleeve.rotation.x = Math.PI / 2;
  // shell rack: 3×3 dots on the turret roof, row-major — index < ammo lit
  const dotGeo = new THREE.SphereGeometry(0.05, 6, 6);
  const ammoDots = [];
  for (let r = 0; r < 3; r++) {
    for (let c2 = 0; c2 < 3; c2++) {
      const dot = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      dot.position.set((c2 - 1) * 0.24, 0.2, (r - 1) * 0.28);
      turret.add(dot);
      ammoDots.push(dot);
    }
  }
  // mini-guns: hull front corners, ~5° toe-in so the bursts converge ahead
  const gunGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.55, 6).rotateX(Math.PI / 2);
  const gunMat = new THREE.MeshBasicMaterial({ color: 0x7df9ff });
  const laserGuns = [];
  for (const side of [-1, 1]) {
    const gun = new THREE.Group();
    gun.position.set(side * 0.42, 0.42, 1.02);
    gun.rotation.y = -side * 0.09; // +Z toed toward the centerline
    const tube = new THREE.Mesh(gunGeo, gunMat);
    tube.position.z = 0.12;
    gun.add(tube);
    g.add(gun);
    laserGuns.push(gun);
  }
  g.userData.turret = turret; // battle aims along this group's world +Z
  g.userData.ammoDots = ammoDots;
  g.userData.laserGuns = laserGuns;
  g.userData.heatSleeve = sleeve;
  g.userData.tick = (t) => { turret.rotation.y = Math.sin(t * 0.6) * 0.7; };
  g.userData.lift = 0.02;
  normalizeToUnit(g);
  g.userData.kind = 'mesh';
  return g;
}

// drone — second mesh unit: octahedron core in a halo ring, hovers
function makeDrone(cols) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.55),
    new THREE.MeshLambertMaterial({ color: cols.walker }));
  body.position.y = 0.8;
  g.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 6, 26),
    new THREE.MeshLambertMaterial({ color: cols.walkerHi }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.8;
  g.add(ring);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8),
    new THREE.MeshBasicMaterial({ color: cols.walkerHi }));
  eye.position.set(0, 0.8, 0.5);
  g.add(eye);
  g.userData.tick = (t) => {
    body.rotation.y = t * 0.9;
    ring.rotation.y = Math.sin(t * 1.3) * 0.18;
    body.position.y = 0.8 + Math.sin(t * 2.1) * 0.06;
  };
  g.userData.lift = 0.15;
  normalizeToUnit(g);
  g.userData.kind = 'mesh';
  return g;
}

// ghost — HokorobiTawaa's Wave Ghost: agile flyer, pale yellow. Dome +
// skirt + dark eyes; bobs on its inner group while the root stays
// lookAt-owned.
function makeGhost(cols) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = 0.75;
  g.add(inner);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: cols.walker }));
  inner.add(dome);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.5, 10, 1, true),
    new THREE.MeshLambertMaterial({ color: cols.walker, side: THREE.DoubleSide }));
  skirt.position.y = -0.25;
  inner.add(skirt);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1c26 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), eyeMat);
    eye.position.set(side * 0.2, 0.12, 0.46);
    inner.add(eye);
  }
  g.userData.tick = (t) => { inner.position.y = 0.75 + Math.sin(t * 2.4) * 0.12; };
  g.userData.lift = 0.3;
  normalizeToUnit(g);
  g.userData.kind = 'mesh';
  return g;
}

// scoutufo — HokorobiTawaa's Scout UFO: fast scout. Saucer disc + dome +
// spinning underring.
function makeUfo(cols) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = 0.75;
  g.add(inner);
  const disc = new THREE.Mesh(new THREE.SphereGeometry(0.68, 12, 8),
    new THREE.MeshLambertMaterial({ color: cols.walker }));
  disc.scale.y = 0.32;
  inner.add(disc);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: cols.walkerHi }));
  dome.position.y = 0.16;
  inner.add(dome);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 20),
    new THREE.MeshBasicMaterial({ color: cols.walkerHi }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.12;
  inner.add(ring);
  g.userData.tick = (t) => { inner.rotation.y = t * 2.2; };
  g.userData.lift = 0.35;
  normalizeToUnit(g);
  g.userData.kind = 'mesh';
  return g;
}

// gslime — HokorobiTawaa's Green Slime: soft regenerator. A squashed
// blob with a jelly squash-stretch tick.
function makeSlime(cols) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = 0.5;
  g.add(inner);
  const blob = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 9),
    new THREE.MeshLambertMaterial({ color: cols.walker }));
  blob.scale.set(1, 0.68, 1);
  inner.add(blob);
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshBasicMaterial({ color: cols.walkerHi }));
  nucleus.position.y = 0.1;
  inner.add(nucleus);
  g.userData.tick = (t) => {
    const sy = 1 + 0.14 * Math.sin(t * 3.1);
    inner.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
  };
  g.userData.lift = 0.02;
  normalizeToUnit(g);
  g.userData.kind = 'mesh';
  return g;
}

// drifter — HokorobiTawaa's Wave Saturn: erratic drifter, dual-coded
// yellow body + blue ring (E_BLUE 0x5a6bff, per the source roster).
function makeSaturn(cols) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = 0.8;
  g.add(inner);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 9),
    new THREE.MeshLambertMaterial({ color: cols.walker }));
  inner.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 6, 24),
    new THREE.MeshLambertMaterial({ color: 0x5a6bff }));
  ring.rotation.x = Math.PI / 2 + 0.4; // the Saturn tilt
  inner.add(ring);
  g.userData.tick = (t) => {
    inner.rotation.y = t * 0.7;
    inner.rotation.z = Math.sin(t * 1.1) * 0.15;
  };
  g.userData.lift = 0.3;
  normalizeToUnit(g);
  g.userData.kind = 'mesh';
  return g;
}

// corona — HokorobiTawaa's Coronavirus: armored spiked sphere, slows
// itself when shot. Root stays lookAt-owned; the inner group spins.
function makeCorona(cols) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = 0.75;
  g.add(inner);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1),
    new THREE.MeshLambertMaterial({ color: cols.walker }));
  inner.add(core);
  const spikeGeo = new THREE.ConeGeometry(0.11, 0.42, 5);
  const spikeMat = new THREE.MeshLambertMaterial({ color: cols.walkerHi });
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 14; i++) {
    // fibonacci directions so the crown reads from every side
    const y = 1 - (2 * (i + 0.5)) / 14;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * 2.399963;
    const d = new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a));
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    spike.position.copy(d).multiplyScalar(0.72);
    spike.quaternion.setFromUnitVectors(up, d);
    inner.add(spike);
  }
  g.userData.tick = (t) => { inner.rotation.y = t * 0.5; };
  g.userData.lift = 0.12;
  normalizeToUnit(g);
  g.userData.kind = 'mesh';
  return g;
}

// barbed — HokorobiTawaa's Barbed Mine: sea-mine that SPEEDS UP when
// shot. Long barbs, an angry per-tick twist on the inner group.
function makeMine(cols) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = 0.7;
  g.add(inner);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8),
    new THREE.MeshLambertMaterial({ color: cols.walker }));
  inner.add(core);
  const barbGeo = new THREE.CylinderGeometry(0.03, 0.09, 0.6, 5);
  const barbMat = new THREE.MeshLambertMaterial({ color: cols.walkerHi });
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 10; i++) {
    const y = 1 - (2 * (i + 0.5)) / 10;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * 2.399963;
    const d = new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a));
    const barb = new THREE.Mesh(barbGeo, barbMat);
    barb.position.copy(d).multiplyScalar(0.72);
    barb.quaternion.setFromUnitVectors(up, d);
    inner.add(barb);
  }
  g.userData.tick = (t) => { inner.rotation.y = Math.sin(t * 1.5) * 0.5; };
  g.userData.lift = 0.06;
  normalizeToUnit(g);
  g.userData.kind = 'mesh';
  return g;
}

// knot — HokorobiTawaa's Solving Torus boss: accelerates when hit.
// One torus-knot mesh, slow menacing spin + breath on the inner group.
function makeKnot(cols) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = 0.85;
  g.add(inner);
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.15, 48, 8),
    new THREE.MeshLambertMaterial({ color: cols.walker }));
  inner.add(knot);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8),
    new THREE.MeshBasicMaterial({ color: cols.walkerHi }));
  inner.add(eye);
  g.userData.tick = (t) => {
    inner.rotation.y = t * 0.4;
    inner.rotation.x = Math.sin(t * 0.7) * 0.3;
    inner.scale.setScalar(1 + 0.05 * Math.sin(t * 2.4));
  };
  g.userData.lift = 0.25;
  normalizeToUnit(g);
  g.userData.kind = 'mesh';
  return g;
}

// cloud units — self-animating Points (each spawned instance pays the CPU
// re-pose; fine for a handful on display, not for a crowd)
function makeCloud(name, cols) {
  const base = CREATURES[name]();
  const out = new Float32Array(base.length * 3);
  waveJelly(base, 0, out);
  const colors = new Float32Array(base.length * 3);
  const cBody = new THREE.Color(cols.walker);
  const cHi = new THREE.Color(cols.walkerHi);
  for (let i = 0; i < base.length; i++) {
    const c = base[i][3] === 1 ? cHi : cBody;
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(out, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 2.2, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.95,
  }));
  pts.userData.tick = (t) => {
    waveJelly(base, t, out);
    geo.getAttribute('position').needsUpdate = true;
  };
  pts.userData.baseScale = 1;
  pts.userData.lift = 0.85;
  pts.userData.kind = 'cloud';
  return pts;
}

// --- orb clouds: Braille dotted spheres under five treatments -------------
// Each orb is ~170 points; treatments re-pose (or re-tint) per frame. At a
// few dozen orbs this is ~5k point updates/frame — negligible. The hash
// gives each point a stable random phase.
const hsh = (i) => {
  const s = Math.sin(i * 127.1 + 0.7) * 43758.5453;
  return s - Math.floor(s);
};

export const ORB_FX = ['spin', 'breathe', 'twinkle', 'wave', 'scatter'];

export function makeOrbCloud(fx, cols, phase = 0) {
  const base = spherePts(170);
  const pos = new Float32Array(base.length * 3);
  const col = new Float32Array(base.length * 3);
  const cBody = new THREE.Color(cols.body);
  const cHi = new THREE.Color(cols.hi);
  const baseCol = new Float32Array(base.length * 3);
  for (let i = 0; i < base.length; i++) {
    const c = base[i][3] === 1 ? cHi : cBody;
    baseCol[i * 3] = c.r; baseCol[i * 3 + 1] = c.g; baseCol[i * 3 + 2] = c.b;
    pos[i * 3] = base[i][0]; pos[i * 3 + 1] = base[i][1]; pos[i * 3 + 2] = base[i][2];
  }
  col.set(baseCol);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 2, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.95,
  }));

  const repose = (f) => {
    for (let i = 0; i < base.length; i++) {
      const [x, y, z] = f(base[i], i);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    geo.getAttribute('position').needsUpdate = true;
  };

  const tick = {
    spin: (t) => {
      const a = t * 1.5 + phase, c = Math.cos(a), s = Math.sin(a);
      repose((p) => [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]);
    },
    breathe: (t) => {
      // transform-only: cheapest treatment of the five
      pts.scale.setScalar(pts.userData.sizeScale * (1 + 0.16 * Math.sin(t * 2 + phase)));
    },
    twinkle: (t) => {
      const attr = geo.getAttribute('color');
      for (let i = 0; i < base.length; i++) {
        const b = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 3.2 + hsh(i) * 6.283));
        attr.setXYZ(i, baseCol[i * 3] * b, baseCol[i * 3 + 1] * b, baseCol[i * 3 + 2] * b);
      }
      attr.needsUpdate = true;
    },
    wave: (t) => {
      repose((p) => {
        const d = 1 + 0.14 * Math.sin(3 * Math.atan2(p[2], p[0]) + t * 3 - p[1] * 2 + phase);
        return [p[0] * d, p[1], p[2] * d];
      });
    },
    scatter: (t) => {
      const k = Math.pow(Math.max(0, Math.sin(t * 0.9 + phase)), 2);
      repose((p, i) => {
        const r = 1 + 1.0 * k * (0.25 + 0.75 * hsh(i));
        return [p[0] * r, p[1] * r, p[2] * r];
      });
    },
  }[fx] || (() => {});

  pts.userData.kind = 'orb';
  pts.userData.fx = fx;
  pts.userData.sizeScale = 1;
  pts.userData.tick = tick;
  return pts;
}

// --- debris: a unit's own polygons scatter and fade -----------------------
// Bakes the object's world-space triangle soup into one geometry; each
// triangle gets a velocity away from the center (outward-normal bias +
// jitter), drifts, spins around its centroid is skipped — translation and
// fade sell the coming-apart at this scale. tick(dt) -> false when spent.
export function makeDebris(obj, outwardN) {
  obj.updateMatrixWorld(true);
  const center = new THREE.Vector3();
  obj.getWorldPosition(center);
  const triPos = [];
  const triCol = [];
  const v = new THREE.Vector3();
  obj.traverse((m) => {
    if (!m.isMesh) return;
    const g = m.geometry;
    const pos = g.getAttribute('position');
    const idx = g.getIndex();
    const col = m.material.color;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i++) {
      const vi = idx ? idx.getX(i) : i;
      v.fromBufferAttribute(pos, vi).applyMatrix4(m.matrixWorld);
      triPos.push(v.x, v.y, v.z);
      triCol.push(col.r, col.g, col.b);
    }
  });
  const nTri = Math.floor(triPos.length / 9);
  const vels = new Float32Array(nTri * 3);
  const hshf = (i) => { const s = Math.sin(i * 71.7 + 1.3) * 43758.5453; return s - Math.floor(s); };
  const scale = obj.scale.x;
  for (let ti = 0; ti < nTri; ti++) {
    const cx = (triPos[ti * 9] + triPos[ti * 9 + 3] + triPos[ti * 9 + 6]) / 3 - center.x;
    const cy = (triPos[ti * 9 + 1] + triPos[ti * 9 + 4] + triPos[ti * 9 + 7]) / 3 - center.y;
    const cz = (triPos[ti * 9 + 2] + triPos[ti * 9 + 5] + triPos[ti * 9 + 8]) / 3 - center.z;
    const l = Math.hypot(cx, cy, cz) || 1e-6;
    const speed = (0.55 + hshf(ti) * 0.9) * scale;
    vels[ti * 3] = (cx / l + outwardN[0] * 0.6 + (hshf(ti + 99) - 0.5) * 0.5) * speed;
    vels[ti * 3 + 1] = (cy / l + outwardN[1] * 0.6 + (hshf(ti + 202) - 0.5) * 0.5) * speed;
    vels[ti * 3 + 2] = (cz / l + outwardN[2] * 0.6 + (hshf(ti + 307) - 0.5) * 0.5) * speed;
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.Float32BufferAttribute(triPos, 3);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(triCol, 3));
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const LIFE = 1.15;
  let life = 0;
  mesh.userData.tick = (dt) => {
    life += dt;
    for (let ti = 0; ti < nTri; ti++) {
      for (let k = 0; k < 3; k++) {
        const j = ti * 3 + k;
        posAttr.setXYZ(j,
          posAttr.getX(j) + vels[ti * 3] * dt,
          posAttr.getY(j) + vels[ti * 3 + 1] * dt,
          posAttr.getZ(j) + vels[ti * 3 + 2] * dt);
      }
    }
    posAttr.needsUpdate = true;
    mat.opacity = Math.max(0, 1 - life / LIFE);
    return life < LIFE;
  };
  return mesh;
}

// tower — TD defense: a HALF-DOTTED head (creatures.js towerHeadPts,
// one silhouette per HokorobiTawaa tower shape) mounted on an elevated
// mesh pedestal — slab, tapered column, neon-edged. The dot cloud is
// STATIC: idle animation is transform-only (spin + bob on the head
// group), so ~190 dots per tower cost nothing per frame — cheaper than
// one portal. userData.head is the aim/emit point.
// The tower MAST — base, column, collar — shared by every tower look so
// they all read as the same family of machine. A look supplies only the
// head; see towerlooks.js.
export function makeTowerMast(def) {
  const steel = new THREE.MeshLambertMaterial({ color: 0x27303f });
  const tintM = new THREE.MeshLambertMaterial({ color: def.color });
  const edge = new THREE.LineBasicMaterial({
    color: def.color, transparent: true, opacity: 0.7,
  });
  const g = new THREE.Group();
  const outline = (mesh) => {
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edge));
  };
  // THE PEDESTAL IS THE TIER READ (operator ruling): square slab when
  // built, hexagon at the first upgrade, circle at the second — the
  // upgrade state visible from any camera without a label. EdgesGeometry's
  // default threshold culls the smooth sides of the round bases, so the
  // hexagon keeps its corners and the circle reads as two clean rings.
  const TIER_BASE = [
    () => new THREE.BoxGeometry(0.8, 0.16, 0.8),
    () => new THREE.CylinderGeometry(0.46, 0.46, 0.16, 6),
    () => new THREE.CylinderGeometry(0.44, 0.44, 0.16, 28),
  ];
  let base = null;
  const setTier = (t) => {
    if (base) {
      g.remove(base);
      base.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    const idx = Math.max(0, Math.min(TIER_BASE.length - 1, t | 0));
    base = new THREE.Mesh(TIER_BASE[idx](), steel);
    base.position.y = 0.08;
    outline(base);
    g.add(base);
  };
  setTier(0);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 0.62, 6), steel);
  column.position.y = 0.47;
  g.add(column);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 6), tintM);
  collar.position.y = 0.8;
  outline(collar);
  g.add(collar);
  // the head floats above the mast; a look fills this group
  const head = new THREE.Group();
  head.position.y = 1.12;
  g.add(head);
  // hand-normalized: total height ~1.55 (head top), footprint 0.8 —
  // normalizeToUnit only measures meshes and would ignore a dot cloud
  g.scale.setScalar(1 / 1.55);
  g.userData.baseScale = 1 / 1.55;
  g.userData.head = head;
  g.userData.lift = 0.02;
  g.userData.kind = 'mesh';
  g.userData.setTier = setTier;
  return { g, head, tintM, edge, outline };
}

// `feel` is the live tuning object when one is passed, and the shipped
// defaults otherwise — so this function is equally usable from the game, the
// bench, and a Node test with no store in sight.
export function makeTowerUnit(def, feel = TOWER_FEEL, heads = TOWER_HEADS) {
  const { g, head } = makeTowerMast(def);
  // the half-dotted head, floating above the mast
  const kind = headKindFor(def, heads);
  const pts = towerHeadPts(kind, Math.round(feel.dots), feel.hiEvery);
  const pos = new Float32Array(pts.length * 3);
  const col = new Float32Array(pts.length * 3);
  const cBody = new THREE.Color(def.color);
  const cHi = new THREE.Color(0xffffff);
  for (let i = 0; i < pts.length; i++) {
    pos[i * 3] = pts[i][0]; pos[i * 3 + 1] = pts[i][1]; pos[i * 3 + 2] = pts[i][2];
    const c = pts[i][3] === 1 ? cHi : cBody;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const cloud = new THREE.Points(geo, new THREE.PointsMaterial({
    size: feel.dotSize, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.95,
  }));
  cloud.scale.setScalar(feel.headScale);
  // a flat cog seen edge-on is a line; tip it so the teeth read
  if (kind === 'gear') cloud.rotation.x = 0.28;
  head.add(cloud);

  // Which way this head FACES, derived from its own points rather than
  // assumed. The six-axis arm reaches along +X and the launcher's tubes point
  // somewhere else again — a tracking tower that assumed +Z would aim every
  // shape ninety degrees wrong and look deliberate about it.
  //
  // The business end is the upper part of the shape; its horizontal offset
  // from the mast axis is the direction it points. A radially symmetric head
  // averages to nothing, which correctly reads as "no facing".
  {
    let hy = -Infinity, ly = Infinity;
    for (const p of pts) { if (p[1] > hy) hy = p[1]; if (p[1] < ly) ly = p[1]; }
    const band = ly + (hy - ly) * 0.65;
    let sx = 0, sz = 0, c = 0;
    for (const p of pts) if (p[1] >= band) { sx += p[0]; sz += p[2]; c++; }
    const mx = c ? sx / c : 0, mz = c ? sz / c : 0;
    g.userData.headFacing = Math.hypot(mx, mz) > 0.08 ? Math.atan2(mx, mz) : 0;
  }
  // A tower's own `spin` still wins where towers.js sets one — that is per
  // tower character, not a global look setting. The knob is the default for
  // everything that does not care.
  const spin = def.spin ?? feel.spin;
  const lift = feel.headLift;
  g.userData.tick = (t) => {
    head.rotation.y = t * spin;
    head.position.y = lift + feel.bob * Math.sin(t * feel.bobRate);
  };
  head.position.y = lift;
  g.userData.headCloud = cloud;
  return g;
}

// dot enemies — the WHOLE TD roster as half-dotted STATIC clouds.
// The original three creatures use their rich generators (posed once,
// never re-posed); the borrowed types use enemyDotPts silhouettes.
// Animation is transform-only per type (spin / bob / squash), so a
// hundred of these cost what one waveJelly hero costs.
// Every entry takes a DENSITY factor d (default 1): the game builds at
// d=1 (crowds), the unit viewer at d=4 — one unit on screen at a time can
// afford to be generous (operator ruling). The classic CREATURES
// generators carry fixed counts and ignore d.
const DOT_SHAPES = {
  phage: () => CREATURES.phage(),
  amoeba: () => CREATURES.amoeba(),
  jellyfish: () => CREATURES.jellyfish(),
  ghost: (d = 1) => enemyDotPts('ghost', Math.round(150 * d)),
  // The flying saucer, replaced by the lab's bacterium — a rod body with
  // flagella. Reverting is this one line: enemyDotPts('ufo').
  //
  // Turned onto its travel axis at BUILD time, not at render time: enemies
  // are oriented every frame by lookAt, which overwrites the object's
  // quaternion, so a rotation set on the object would be thrown away. The
  // model runs along X with the flagella at -X; enemies face +Z; so
  // (x, y, z) -> (-z, y, x) puts the head forward and the tail behind.
  scoutufo: (d = 1) => towerHeadPts('bacterium', Math.round(170 * d))
    .map((p) => (p.length > 3 ? [-p[2], p[1], p[0], p[3]] : [-p[2], p[1], p[0]])),
  gslime: (d = 1) => enemyDotPts('slime', Math.round(150 * d)),
  drifter: (d = 1) => enemyDotPts('saturn', Math.round(150 * d)),
  corona: (d = 1) => enemyDotPts('corona', Math.round(150 * d)),
  barbed: (d = 1) => enemyDotPts('seamine', Math.round(150 * d)),
  rolling: (d = 1) => enemyDotPts('seamine', Math.round(150 * d)),
  prime: (d = 1) => enemyDotPts('seamine', Math.round(150 * d)),
  knot: (d = 1) => enemyDotPts('knot', Math.round(150 * d)),
  // the invasion roster: the saucer is the lab's ufo (freed when the
  // bacterium took scoutufo's slot); the shellback wears the lab's
  // seashell spiral; the phantom re-uses the ghost — camo does the rest
  saucer: (d = 1) => enemyDotPts('ufo', Math.round(150 * d)),
  // recentred on the CENTROID, not the bbox: a log spiral's mass sits in
  // its outer whorl (measured centroid 0.28, 0.48 after fitUnit), and the
  // solid core renders at the origin — uncentred, the core floated beside
  // the shell instead of inside it
  shellback: (d = 1) => {
    const pts = towerHeadPts('shell', Math.round(400 * d)); // a spiral is all surface — it needs density
    let cx = 0, cy = 0, cz = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
    cx /= pts.length; cy /= pts.length; cz /= pts.length;
    // pulled in to 0.78: a log spiral's outer whorl scatters wide, and at
    // full span the cloud read as dust AROUND the core instead of a body
    const K = 0.78;
    return pts.map((p) => (p.length > 3
      ? [(p[0] - cx) * K, (p[1] - cy) * K, (p[2] - cz) * K, p[3]]
      : [(p[0] - cx) * K, (p[1] - cy) * K, (p[2] - cz) * K]));
  },
  phantom: (d = 1) => enemyDotPts('ghost', Math.round(150 * d)),
};

// The solid core a NON-RAMMABLE enemy wears. Half-dotted is this game's
// word for "enemy", and it stays that — but a player has to be able to tell,
// before committing the tank at it, which ones will go under the treads and
// which ones will stop them dead. So the ones that will not give way carry
// one piece of SOLID geometry inside the cloud. Solid means "this has mass",
// which is exactly the thing being communicated.
//
// Shaped per family rather than one generic lump, so it also reads as part
// of that creature: the drifter's core, the corona's ring, the mine's shell.
// Sized to roughly a THIRD of the cloud's span, not half. The cloud is still
// the creature; the core is the part of it that will not give way. At 0.46
// the octahedron reached the drifter's own ring and the dots stopped reading
// as the body at all.
const HARD_CORE = {
  drifter: () => new THREE.OctahedronGeometry(0.34),
  corona: () => new THREE.TorusGeometry(0.42, 0.12, 8, 16).rotateX(Math.PI / 2),
  barbed: () => new THREE.IcosahedronGeometry(0.32),
  shellback: () => new THREE.SphereGeometry(0.2, 8, 6),
  phantom: () => new THREE.IcosahedronGeometry(0.24), // the Predator glint
};

export function makeDotEnemy(type, cols, dens = 1) {
  const base = (DOT_SHAPES[type] || ((d = 1) => spherePts(Math.round(140 * d))))(dens);
  const pos = new Float32Array(base.length * 3);
  const col = new Float32Array(base.length * 3);
  const cBody = new THREE.Color(cols.walker);
  const cHi = new THREE.Color(cols.walkerHi);
  for (let i = 0; i < base.length; i++) {
    pos[i * 3] = base[i][0]; pos[i * 3 + 1] = base[i][1]; pos[i * 3 + 2] = base[i][2];
    const c = base[i][3] === 1 ? cHi : cBody;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 2.1, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.95,
  }));
  // Swimmers deform their POINTS rather than their transform. It costs a
  // pass over the cloud each frame — 170 points, nothing — and it is the only
  // way a body can flex: a transform can turn a creature but cannot make it
  // beat. Everything else keeps the cheaper transform-only idle below.
  const SWIM = {
    scoutufo: { amp: 0.26, beat: 7.0, along: 4.0, jelly: 0.10 },
    // the shell/wave pairing the operator named: the spiral breathes
    shellback: { amp: 0.20, beat: 4.6, along: 3.0, jelly: 0.16 },
  };
  const swim = SWIM[type];
  if (swim) {
    let zMin = Infinity, zMax = -Infinity;
    for (const p of base) { if (p[2] < zMin) zMin = p[2]; if (p[2] > zMax) zMax = p[2]; }
    const opts = { ...swim, zMin, zMax };
    // no rotation of any kind: it holds its heading and beats
    pts.userData.tick = (t) => {
      swimWave(base, t, pos, opts);
      geo.getAttribute('position').needsUpdate = true;
    };
  }

  // transform-only idles, one flavor per family
  const TICKS = {
    ghost: (t) => { pts.position.y = 0; pts.rotation.y = Math.sin(t * 1.2) * 0.4; },
    scoutufo: (t) => { pts.rotation.y = t * 2.4; },
    gslime: (t) => {
      const sy = 1 + 0.14 * Math.sin(t * 3);
      pts.scale.y = pts.userData.s0 * sy;
      pts.scale.x = pts.scale.z = pts.userData.s0 / Math.sqrt(sy);
    },
    drifter: (t) => { pts.rotation.y = t * 0.8; },
    corona: (t) => { pts.rotation.y = t * 0.9; },
    barbed: (t) => { pts.rotation.y = Math.sin(t * 1.5) * 0.6; },
    rolling: (t) => { pts.rotation.y = t * 1.1; },
    prime: (t) => { pts.rotation.y = t * 0.5; },
    knot: (t) => { pts.rotation.y = t * 0.7; pts.rotation.x = Math.sin(t * 0.8) * 0.3; },
  };
  // a swimmer already has its tick; the table would put the spin back
  if (!swim) {
    pts.userData.tick = TICKS[type] || ((t) => { pts.rotation.y = Math.sin(t) * 0.25; });
  }
  pts.userData.s0 = 1; // scale captured by the game after sizing
  pts.userData.lift = { ghost: 0.9, scoutufo: 0.95, drifter: 0.85, knot: 0.8 }[type] ?? 0.6;
  pts.userData.kind = 'cloud';
  pts.userData.baseScale = 1;

  // The core is a CHILD of the Points, not a Group wrapping both. Callers
  // reach for `obj.geometry` and `obj.material` on the enemy directly, and
  // wrapping would have silently broken the hit flash and the disposal —
  // the same trap the pickups fell into. As a child, every existing call
  // site keeps working and the core just comes along.
  const spec = ENEMY_SPEC[type];
  if (spec && spec.rammable === false) {
    const geo = (HARD_CORE[type] || (() => new THREE.OctahedronGeometry(0.32)))();
    const core = solidWithEdges(geo, cols.walker, cols.walkerHi ?? 0xffffff);
    // The cloud's material is vertexColors, so white is NEUTRAL there and the
    // slow tint can just set white to clear itself. A solid has no vertex
    // colours, so white would erase its body colour instead of clearing a
    // tint — it needs to be told what to go back to.
    core.userData.baseColor = core.material.color.getHex();
    pts.add(core);
    pts.userData.solid = core;   // td-tab tints this alongside the cloud
  }
  return pts;
}

// portal — the braille-lab half-dotted STATIC torus: an upright dotted
// ring under the twinkle treatment (per-dot brightness shimmer; no
// re-posing — the ring itself never moves, only its light does).
// userData.setDim(f) scales all brightness — the game dims a portal as
// it takes damage. Ring lies in local X-Y: align +Y to the surface
// normal and it stands like a gate.
export function makePortalCloud(cols, phase = 0) {
  // The authored lab gate rather than our own generated one. Fewer points
  // (435 against 1150) and far better ones: the chevrons are placed, not
  // derived, and the point ORDER is a drawing order — which is what lets the
  // gate dial itself in with nothing more than a draw range.
  const base = STARGATE_PTS;
  // ring + chevrons first, then the event horizon. The order is deliberate:
  // revealed by index the gate draws its ring, locks its chevrons, and only
  // then does the throat light up — which is the sequence the thing is
  // named for, and it costs nothing but the ordering.
  const N = base.length + HORIZON_N;
  const H0 = base.length;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const baseCol = new Float32Array(N * 3);
  const hBri = new Float32Array(HORIZON_N);   // per-dot shimmer, written per frame
  const cBody = new THREE.Color(cols.body);
  const cHi = new THREE.Color(cols.hi);
  for (let i = 0; i < base.length; i++) {
    const c = base[i][3] === 1 ? cHi : cBody;
    baseCol[i * 3] = c.r; baseCol[i * 3 + 1] = c.g; baseCol[i * 3 + 2] = c.b;
    pos[i * 3] = base[i][0]; pos[i * 3 + 1] = base[i][1]; pos[i * 3 + 2] = base[i][2];
  }
  for (let i = H0; i < N; i++) {
    baseCol[i * 3] = cBody.r; baseCol[i * 3 + 1] = cBody.g; baseCol[i * 3 + 2] = cBody.b;
  }
  // Position the horizon at t=0 IN THE CONSTRUCTOR. Its dots are otherwise
  // placed only by the idle tick, which the dial-in skips — so through the
  // whole draw-on they sat at the ORIGIN, and the reveal's final act was a
  // clump of dots in the gate's throat instead of the disc. Anyone standing
  // next to a forming gate (a fresh spawn, say) watched exactly that.
  stargateHorizon(0, pos, new Float32Array(HORIZON_N), H0);
  col.set(baseCol);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 2.2, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.95,
  }));
  const hshf = (i) => { const s = Math.sin(i * 127.1 + 0.7) * 43758.5453; return s - Math.floor(s); };
  const repose = (f) => {
    for (let i = 0; i < base.length; i++) {
      const [x, y, z] = f(base[i], i);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    geo.getAttribute('position').needsUpdate = true;
  };
  const twinkle = (t) => {
    const attr = geo.getAttribute('color');
    // the horizon is a surface in motion: its dots are placed and lit every
    // frame, where the ring's only ever change brightness
    stargateHorizon(t, pos, hBri, H0);
    for (let i = 0; i < HORIZON_N; i++) {
      const k = H0 + i, b = hBri[i];
      attr.setXYZ(k, Math.min(1, cBody.r * b), Math.min(1, cBody.g * b), Math.min(1, cBody.b * b));
    }
    geo.getAttribute('position').needsUpdate = true;
    for (let i = 0; i < base.length; i++) {
      const slow = 0.5 + 0.5 * Math.sin(t * 4.2 + phase + hshf(i) * 6.283);
      const fast = 0.65 + 0.35 * Math.sin(t * 9.7 + hshf(i + 71) * 6.283);
      const b = 0.25 + 0.75 * slow * fast;
      attr.setXYZ(i, baseCol[i * 3] * b, baseCol[i * 3 + 1] * b, baseCol[i * 3 + 2] * b);
    }
    attr.needsUpdate = true;
  };
  // stargate: two-frequency shimmer (the same twinkle used for the ring)
  pts.userData.tick = twinkle;
  // dim rides the MATERIAL color (multiplies vertex colors), so every
  // treatment — color- or position-based — dims the same way
  pts.userData.setDim = (f) => { pts.material.color.setScalar(f); };

  // --- dialling in ---------------------------------------------------------
  // A gate used to simply be there. Now it DRAWS: the stroke sweeps round the
  // ring, then the nine chevrons lock one after another, and the leading dots
  // burn brighter than the settled ones so the eye follows the head.
  //
  // No keyframes and no second geometry — the lab's own point order already
  // describes the motion, so this is a draw range and a gradient behind it.
  let form = 1;
  const HEAD = 26;   // dots behind the head that still glow hot
  pts.userData.setForm = (f) => {
    form = Math.max(0, Math.min(1, f));
    const shown = Math.max(1, Math.round(form * N));
    geo.setDrawRange(0, shown);
    if (form >= 1) return;
    // repaint only the head; the tail keeps whatever twinkle last wrote
    const attr = geo.getAttribute('color');
    for (let i = Math.max(0, shown - HEAD); i < Math.min(shown, base.length); i++) {
      const heat = 1 - (shown - i) / HEAD;          // 0 at the tail, 1 at the tip
      const b = 1 + 2.4 * heat * heat;
      attr.setXYZ(i, Math.min(1, baseCol[i * 3] * b),
        Math.min(1, baseCol[i * 3 + 1] * b), Math.min(1, baseCol[i * 3 + 2] * b));
    }
    attr.needsUpdate = true;
  };
  pts.userData.formed = () => form >= 1;
  // the chevrons are the last 28 points: a gate is only OPEN once they lock
  pts.userData.chevronAt = STARGATE_STROKE / N;

  pts.userData.kind = 'portal';
  pts.userData.sizeScale = 1;
  return pts;
}

// The energy shield: a dot-shell ellipsoid that hovers over the tank's
// hull. The game's own idiom — a fibonacci sphere of additive points, one
// draw call — rather than a translucent mesh: the bloom chain turns the
// bright dots into the energy read for free. tick(t, frac) shimmers it and
// blinks it URGENT when frac (time remaining, 0..1) runs low.
export function makeShieldShell(colorHex = 0x7fe0ff, n = 280) {
  const pos = new Float32Array(n * 3);
  const GA = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * i + 1) / n;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * GA;
    // ellipsoid: the hull is longer than it is tall
    pos[i * 3] = Math.cos(a) * r * 1.05;
    pos[i * 3 + 1] = y * 0.8;
    pos[i * 3 + 2] = Math.sin(a) * r * 1.3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 4.5, sizeAttenuation: false, color: colorHex,
    transparent: true, opacity: 0.75,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  pts.userData.tick = (t, frac = 1) => {
    pts.rotation.y = t * 0.7;
    const urgent = frac < 0.25;
    const blink = urgent ? (Math.sin(t * 14) > 0 ? 1 : 0.25) : 1;
    pts.material.opacity = (0.6 + 0.25 * Math.sin(t * 3.1)) * blink;
  };
  pts.userData.kind = 'fx';
  return pts;
}

// dot burst — the cloud-unit counterpart of makeDebris: a puff of tinted
// dots scattering outward from a squash point (Points have no triangles
// to explode, so run-over kills get this instead). Caller positions the
// object; velocities favor the tangent plane around `outwardN` so the
// splat hugs the ground like something flattened. tick(dt) -> alive.
export function makeDotBurst(colorHex, outwardN, n = 42) {
  const hshf = (i) => { const s = Math.sin(i * 91.7 + 2.3) * 43758.5453; return s - Math.floor(s); };
  const pos = new Float32Array(n * 3); // all start at the origin
  const vel = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const c = new THREE.Color(colorHex);
  for (let i = 0; i < n; i++) {
    // random dir, flattened against the surface normal, slight upward pop
    const th = hshf(i) * 6.283;
    const up = hshf(i + 50) * 0.55;
    let dx = Math.cos(th), dy = 0, dz = Math.sin(th);
    dx += outwardN[0] * up; dy += outwardN[1] * up; dz += outwardN[2] * up;
    const sp = 0.45 + hshf(i + 100) * 1.1;
    vel[i * 3] = dx * sp; vel[i * 3 + 1] = dy * sp; vel[i * 3 + 2] = dz * sp;
    const b = 0.7 + 0.3 * hshf(i + 150);
    col[i * 3] = c.r * b; col[i * 3 + 1] = c.g * b; col[i * 3 + 2] = c.b * b;
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 2.4, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 1,
  });
  const pts = new THREE.Points(geo, mat);
  const LIFE = 0.7;
  let life = 0;
  pts.userData.tick = (dt) => {
    life += dt;
    for (let i = 0; i < n; i++) {
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    posAttr.needsUpdate = true;
    mat.opacity = Math.max(0, 1 - life / LIFE);
    return life < LIFE;
  };
  return pts;
}

// bullet projectile — the Braille shell as a static dot-cloud. Animation is
// pure object transform: orient +Y along the flight dir, spin about that
// axis for rifling. Zero per-point CPU work per frame.
export function makeBulletCloud(cols) {
  const base = bulletPts();
  const pos = new Float32Array(base.length * 3);
  const col = new Float32Array(base.length * 3);
  const cBody = new THREE.Color(cols.body);
  const cHi = new THREE.Color(cols.hi);
  for (let i = 0; i < base.length; i++) {
    pos[i * 3] = base[i][0]; pos[i * 3 + 1] = base[i][1]; pos[i * 3 + 2] = base[i][2];
    const c = base[i][3] === 1 ? cHi : cBody;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 2, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.95,
  }));
  pts.userData.kind = 'bullet';
  return pts;
}

// missile dot-cloud — same builder as makeBulletCloud, missile silhouette.
export function makeMissileCloud(cols) {
  const base = missilePts();
  const pos = new Float32Array(base.length * 3);
  const col = new Float32Array(base.length * 3);
  const cBody = new THREE.Color(cols.body);
  const cHi = new THREE.Color(cols.hi);
  for (let i = 0; i < base.length; i++) {
    pos[i * 3] = base[i][0]; pos[i * 3 + 1] = base[i][1]; pos[i * 3 + 2] = base[i][2];
    const c = base[i][3] === 1 ? cHi : cBody;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 2, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.95,
  }));
  pts.userData.kind = 'missile';
  return pts;
}

// the Heart itself: a dot-cloud that cycles treatments — twinkle, breathe,
// jelly (3.5s each) — and on hit() flares orange/red under the Wave
// treatment for ~1.6s before recovering. One instance per board; ~620
// points re-posed per frame is nothing.
export function makeHeartCloud(bodyHex) {
  const base = heartPts(620);
  const pos = new Float32Array(base.length * 3);
  const col = new Float32Array(base.length * 3);
  const baseCol = new Float32Array(base.length * 3);
  const cBody = new THREE.Color(bodyHex);
  const cHi = new THREE.Color(0xffffff);
  const hshf = (i) => { const s = Math.sin(i * 127.1 + 0.7) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < base.length; i++) {
    const c = base[i][3] === 1 ? cHi : cBody;
    baseCol[i * 3] = c.r; baseCol[i * 3 + 1] = c.g; baseCol[i * 3 + 2] = c.b;
  }
  col.set(baseCol);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 2.4, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.95,
  }));
  pts.userData.sizeScale = 1;

  const cHurtA = new THREE.Color(0xff5330);
  const cHurtB = new THREE.Color(0xffaa00);
  let lastT = 0;
  let hitUntil = -1;
  let hurtColors = false;

  const setHurtColors = (on) => {
    const attr = geo.getAttribute('color');
    for (let i = 0; i < base.length; i++) {
      if (on) {
        const c = hshf(i) < 0.5 ? cHurtA : cHurtB;
        attr.setXYZ(i, c.r, c.g, c.b);
      } else {
        attr.setXYZ(i, baseCol[i * 3], baseCol[i * 3 + 1], baseCol[i * 3 + 2]);
      }
    }
    attr.needsUpdate = true;
    hurtColors = on;
  };

  const repose = (f) => {
    for (let i = 0; i < base.length; i++) {
      const [x, y, z] = f(base[i], i);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    geo.getAttribute('position').needsUpdate = true;
  };
  const identity = (p) => p;

  pts.userData.tick = (t) => {
    lastT = t;
    const s0 = pts.userData.sizeScale;
    if (t < hitUntil) {
      // HURT: orange/red + Wave
      if (!hurtColors) setHurtColors(true);
      repose((p) => {
        const d = 1 + 0.2 * Math.sin(3 * Math.atan2(p[2], p[0]) + t * 5 - p[1] * 2);
        return [p[0] * d, p[1], p[2] * d];
      });
      pts.scale.setScalar(s0);
      return;
    }
    if (hurtColors) setHurtColors(false);
    const phase = Math.floor(t / 3.5) % 3;
    if (phase === 0) {
      // twinkle
      repose(identity);
      const attr = geo.getAttribute('color');
      for (let i = 0; i < base.length; i++) {
        const b = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 3.2 + hshf(i) * 6.283));
        attr.setXYZ(i, baseCol[i * 3] * b, baseCol[i * 3 + 1] * b, baseCol[i * 3 + 2] * b);
      }
      attr.needsUpdate = true;
      pts.scale.setScalar(s0);
    } else if (phase === 1) {
      // breathe
      repose(identity);
      pts.scale.setScalar(s0 * (1 + 0.14 * Math.sin(t * 2)));
    } else {
      // jelly: volume-preserving squash-stretch
      const sy = 1 + 0.18 * Math.sin(t * 3);
      const sx = 1 / Math.sqrt(sy);
      repose((p) => [p[0] * sx, p[1] * sy, p[2] * sx]);
      pts.scale.setScalar(s0);
    }
  };
  pts.userData.hit = () => { hitUntil = lastT + 1.6; };
  return pts;
}

// --- mkcx: an authored hover tank, as a selectable player unit ----------
//
// The tank is the opposite case from a GLB TOWER. A tower can be flattened
// to a handful of draw calls because it holds still; the tank has to AIM,
// so the nodes that move must survive the merge. These four do:
//   Turret_Pivot            — the main gun; aiming reads its world +Z
//   Secondary_L/R_Gun_Pivot — the twin mini-lasers
// Everything else merges. 58 meshes becomes roughly a dozen.
const MKCX_URL = 'assets/models/mkcx.glb';
// Hover_Gear is the nacelle/lift-emitter skirt — the part that should stay
// planted while the body rises off it. Preserved through the merge for that
// reason, not because it animates on its own.
// Nodes that must survive the merge as addressable objects: the things that
// articulate. Everything else is welded into per-material batches — including
// the glow accents, which is exactly what makes the health tint cheap.
const MKCX_LIFTERS = ['LiftEmitter_L1', 'LiftEmitter_L2', 'LiftEmitter_L3',
  'LiftEmitter_R1', 'LiftEmitter_R2', 'LiftEmitter_R3'];
const MKCX_PIVOTS = ['Turret_Pivot', 'Secondary_L_Gun_Pivot', 'Secondary_R_Gun_Pivot',
  'Hover_Gear', ...MKCX_LIFTERS];
// The barrel glow strips are authored floating +0.20 above the barrel axis.
// At our scale they don't read as strips ON the gun — they read as a stray
// bright line hanging in front of the tank. Dropped before the merge, since
// afterwards they'd be welded into a shared mesh and unaddressable.
// Hull_Collision is a 12-triangle BOX — a physics proxy the exporter left
// visible, not something meant to be drawn. Rendered, its top face reads as
// two big triangles laid over the hull with its corners poking out at the
// front and back. Never render a collision proxy.
const MKCX_DROP = ['Hull_Collision', 'Barrel_Glow_1', 'Barrel_Glow_2'];
let mkcxProto = null;

// Anyone who asks for the mkcx gets its load started for them, and can
// subscribe to know when the real model has replaced the fallback. Without
// this, every tab has to remember to preload, and one that forgets shows
// the procedural tank forever with nothing to say why.
const mkcxReadyCbs = [];
export function onMkcxReady(cb) {
  if (mkcxProto) { cb(); return; }
  mkcxReadyCbs.push(cb);
  preloadMkcx();
}

// Blueprint callouts: which authored node to hang each label on, and what to
// call it in English. Sourced from the model's own node names so a label
// always names something that actually exists to be edited — pointing at "the
// bit near the front" is how the turret stayed 6 deg out of true for weeks.
const MKCX_CALLOUTS = [
  ['Hull_Mesh', 'hull'],
  ['Turret_Pivot', 'primary turret'],
  ['Barrel_Mesh', 'main barrel'],
  ['MuzzleBrake_Mesh', 'muzzle brake'],
  ['Mantlet_Mesh', 'mantlet'],
  ['Sight_Primary', 'primary sight'],
  ['Hatch_Commander', 'commander hatch'],
  ['LauncherPod_L', 'launcher pod'],
  ['Stowage_Bin', 'stowage bin'],
  ['Secondary_L_Pivot', 'secondary turret'],
  ['Secondary_R_Gun_Pivot', 'secondary gun'],
  ['Nacelle_L', 'nacelle (skirt)'],
  ['LiftEmitter_L2', 'lift emitter'],
  ['Pylon_LB', 'pylon'],
  ['Hull_Glow_1', 'accent strip'],
  ['Headlight_R', 'headlight'],
  ['EngineDeck_Grille', 'engine deck'],
  ['Driver_Hatch', 'driver hatch'],
  ['Sensor_Mast', 'sensor mast'],
  ['Callout_4', 'muzzle'],   // authored empty at the barrel tip
];

// Drop an empty at each callout's world position, parented to the model root,
// BEFORE the merge welds those nodes away. Empties are not meshes, so they
// survive the merge untouched and are carried by fitModel's scale and
// recentring like everything else — no coordinates to keep in sync by hand.
function markCallouts(scene) {
  const root = scene.getObjectByName('MKCX_Root') || scene;
  root.updateMatrixWorld(true);
  const marks = [];
  const p = new THREE.Vector3();
  for (const [node, label] of MKCX_CALLOUTS) {
    const o = scene.getObjectByName(node);
    if (!o) continue;
    // Hang the marker on the nearest surviving PIVOT, so a label on the
    // turret sweeps with the turret instead of hovering where the turret
    // used to point. Never on a mesh: the merge removes those, and a child
    // of a removed node goes with it.
    let host = root;
    for (let a = o; a; a = a.parent) {
      if (MKCX_PIVOTS.includes(a.name)) { host = a; break; }
    }
    o.getWorldPosition(p);
    const m = new THREE.Object3D();
    m.position.copy(host.worldToLocal(p.clone()));
    m.userData.callout = { label, node };
    marks.push([host, m]);
  }
  for (const [host, m] of marks) host.add(m);  // after the walk, never during
  return marks.map(([, m]) => m);
}

// One load, one merge, one set of callout markers — no matter how many
// callers ask. loadGlb caches the SCENE, but every caller still ran this
// body against it: re-merging an already-merged scene, and re-marking it,
// which is why parts whose node is a Group (and so survives a merge) ended
// up with a label each per call. The promise, not the scene, is the guard.
let mkcxLoad = null;
// --- the SERVER: a board fixture cast from GLB ---------------------------
// Not a unit: no rig, no tick, no health. fitModel seats the foot at y=0
// inside a wrapper group (unit height, span-capped per the house rule for
// imported models); the tab scales and orients the clone per placement.
let serverProto = null, serverLoad = null;
export function preloadServer() {
  if (serverLoad) return serverLoad;
  serverLoad = loadGlb('assets/models/server.glb').then((scene) => {
    if (!scene) { serverLoad = null; return false; }
    serverProto = fitModel(scene, { height: 1, maxSpan: 0.8 });
    return true;
  });
  return serverLoad;
}
export function makeServerFixture() {
  if (!serverProto) { preloadServer(); return null; }
  const g = serverProto.clone(true);
  g.userData.kind = 'fixture';
  return g;
}

export function preloadMkcx() {
  if (mkcxLoad) return mkcxLoad;
  mkcxLoad = loadGlb(MKCX_URL).then((scene) => {
    if (!scene) { mkcxLoad = null; return false; }   // let a retry happen
    const marks = markCallouts(scene);
    // The merge parents each batch to its OWNER, and everything outside a
    // preserved pivot is owned by the root we hand it — the glTF SCENE, a
    // sibling of MKCX_Root rather than its parent. So the hull, nacelles and
    // details ended up beside the model instead of inside it, and the hover
    // split (which walks MKCX_Root's children) lifted only the articulated
    // pivots: the turret and secondaries rose while the hull stayed put.
    // attach() re-parents them without moving them.
    const merged = mergeByMaterial(scene, MKCX_PIVOTS, MKCX_DROP);
    const inner = merged.getObjectByName('MKCX_Root');
    if (inner) for (const c of [...merged.children]) if (c !== inner) inner.attach(c);
    mkcxProto = fitModel(merged, {
      // NOTE which of these actually binds. The model is 10.82 long (the
      // barrel juts far forward) against 2.86 tall, so maxSpan decides the
      // scale and height never gets a say. Raising span is what makes the
      // tank bigger; the height stays as an upper guard.
      height: 1.3,
      maxSpan: 1.95,
      // The bounding box is skewed +1.46 in Z by the gun barrel while the
      // hull sits at the origin. Centring on the box would make the tank
      // pivot around a point out in FRONT of itself; centre on the hull.
      recentreOn: 'Hull_Mesh',
    });
    // The house look is a dark body wearing bright additive edges. An
    // imported model has none, which is most of why it read as a lump next
    // to the procedural units. Built on the PROTOTYPE so EdgesGeometry runs
    // once and every clone shares it.
    addEdgeOutlines(mkcxProto, { angle: 28, opacity: 0.85 });
    mkcxProto.userData.callouts = marks;
    while (mkcxReadyCbs.length) mkcxReadyCbs.shift()();
    return true;
  });
  return mkcxLoad;
}

export function mkcxReady() { return !!mkcxProto; }

function makeMkcx(cols) {
  // self-starting: asking for it is enough to begin the load
  if (!mkcxProto) { preloadMkcx(); return makeTank(cols); } // never nothing
  const g = mkcxProto.clone(true);
  // A shade LADDER, not a flat wash. The model's four structural materials
  // sit within 0.05 luminance of each other — all muddy olive-grey — so one
  // uniform tint turned the whole tank into a single coloured mass. Giving
  // each material its own lightness rung is what makes armour, turret,
  // detail and steel read as separate plates.
  tintModel(g, cols.walkerHi ?? 0x7df9ff, {
    wash: 0.45,
    shades: { armour: 1.0, turret: 0.74, detail: 0.52, steel: 0.32 },
    sat: 0.5,
    lightFrom: 0.20,
    lightTo: 0.66,
  });

  // The contract td-tab reads off a player unit. turret and laserGuns are
  // the load-bearing ones: aim is derived from their WORLD quaternions, per
  // the house rule about never re-deriving a render-coupled direction.
  const turret = g.getObjectByName('Turret_Pivot');
  if (turret) {
    // The model ships the turret casually slewed 6 deg off the hull axis
    // (quaternion y = -0.0523). That is fine as sculpture and wrong as a
    // machine: this pivot is never rotated at runtime, and `fire()` derives
    // the shell's heading from its WORLD +Z, so the baked yaw made the tank
    // shoot six degrees off from where it visibly points. Zeroing the rest
    // pose squares the beam AND the aim in one move.
    turret.quaternion.identity();
    g.userData.turret = turret;
    turret.userData.baseZ = turret.position.z; // recoil slides back from here
  }
  const guns = ['Secondary_L_Gun_Pivot', 'Secondary_R_Gun_Pivot']
    .map((n) => g.getObjectByName(n))
    .filter(Boolean);

  // Split the tank in two so the hull can lift while the skirt stays down.
  // Raising the WHOLE unit reads as flight; raising only the body off a
  // planted skirt reads as weight on suspension. Everything that is not the
  // hover gear becomes one body group — hull, turret, secondaries, details.
  // Health is diegetic: the machine's own running lights read it out, instead
  // of a gauge bolted on beside them. The model puts every accent — six lift
  // emitters down the nacelles, the turret and hull glow strips, the secondary
  // rings, the headlights — on ONE material, `M_Glow`. So the tint is a single
  // material write that lands on all of them at once, wrapping the hull rather
  // than facing one way, which is what makes it legible from every camera.
  //
  // The material is cloned first, and the clone is shared back across every
  // batch that used it. The merge preserves material identity, so painting the
  // loaded instance in place would tint every OTHER mkcx on the field too —
  // they all descend from one cached prototype.
  let glow = null;
  g.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (let i = 0; i < mats.length; i++) {
      const m = mats[i];
      if (!m || m.name !== 'M_Glow') continue;
      if (!glow) {
        glow = m.clone();
        if (glow.emissive) glow.emissiveIntensity = 1; // lit, not painted
      }
      if (Array.isArray(o.material)) o.material[i] = glow; else o.material = glow;
    }
  });
  if (glow) g.userData.healthBeam = glow;

  // Extra accents ON THE DECK. The authored glow strips all sit on the
  // flanks, so from the top-down build camera — which is half the game — the
  // health colour was not visible at all, and even side-on they were thin
  // enough to miss. These share the cloned M_Glow material, so they are
  // health-coded for free and cost no extra tint bookkeeping.
  //
  // Placed from the model's own deck fittings rather than by eye:
  // EngineDeck_Grille sits at (0, 1.57, -2.40) and Driver_Hatch at
  // (0, 1.56, 1.15), so the deck runs at y 1.56-1.57; the secondaries are at
  // z 2.30, and "behind" them is toward -z.
  const DECK_Y = 1.60;   // just proud of the deck, so it reads as fitted
  const deckStrips = glow ? [
    [0, DECK_Y, -2.92, 2.30, 0.05, 0.42],   // the long one across the stern
    [-0.86, DECK_Y, 1.72, 0.46, 0.05, 0.60], // behind the left secondary
    [0.86, DECK_Y, 1.72, 0.46, 0.05, 0.60],  // and the right
  ] : [];

  // --- the hover rig, in three tiers ---------------------------------------
  // The machine levitates ON the lift emitters, so THEY are what stays welded
  // to the ground; everything above them is free to move. One tier was not
  // enough: raising the whole skirt together made the tank look like it flew
  // off in one piece, with nothing left behind to measure the lift against.
  //
  //   HoverEmitters  planted. the ground reference, never moved.
  //   HoverGear      nacelles + pylons — the skirt, settles by gearDrop.
  //   HoverBody      hull and everything on it, rises by rise.
  //     HullVib      takes the idle vibration at full strength
  //     Weapons      takes a fraction of it, so the guns read as MOUNTED on
  //                  a shaking hull rather than shaking independently
  const gear = g.getObjectByName('Hover_Gear');
  const modelRoot = gear && gear.parent;
  if (modelRoot) {
    // Within the gear the emitters are already separated for us: the merge
    // batches per material, and the emitters are the only M_Glow parts down
    // there — the nacelles are M_Armour and the pylons M_Steel.
    const emitters = new THREE.Group();
    emitters.name = 'HoverEmitters';
    // Added to the model BEFORE anything is attached to it. attach() preserves
    // world transform, so attaching into a group that is not yet in the graph
    // bakes the whole ancestor chain — including fitModel's scale — into the
    // child's local matrix, and adding the group afterwards applies that scale
    // a second time. The emitters came out at k^2: present, correct, and a
    // tenth of the size they should be.
    modelRoot.add(emitters);
    for (const name of MKCX_LIFTERS) {
      const e = gear.getObjectByName(name);
      if (e) emitters.attach(e);
    }

    // Spaced evenly along the nacelle they sit under. The authored z values
    // (-2.35, -0.40, 1.70) are neither centred on the nacelle nor evenly
    // spread — the rear pair bunch and the front one overhangs its end.
    //
    // The span is read off the nacelle BATCH, not a node: `Nacelle_L` stopped
    // existing at the merge, so looking it up by name would quietly find
    // nothing and leave the spacing untouched. The nacelles are the only
    // M_Armour geometry inside the gear, and geometry bounds are already in
    // the space these positions are written in, so no conversion is needed.
    const armour = gear.children.find((c) => {
      const m = Array.isArray(c.material) ? c.material[0] : c.material;
      return c.isMesh && m && m.name === 'M_Armour';
    });
    if (armour && armour.geometry) {
      armour.geometry.computeBoundingBox();
      const nb = armour.geometry.boundingBox;
      const zs = [0.18, 0.5, 0.82];
      for (const e of emitters.children) {
        const i = Number(e.name.slice(-1)) - 1;
        if (i >= 0 && i < zs.length) e.position.z = nb.min.z + (nb.max.z - nb.min.z) * zs[i];
        // Fattened. At the authored 0.43 x 0.05 x 1.15 they were a hairline
        // at play distance, and a health gauge you have to squint at is not
        // one. Wider and taller rather than longer: the length already reads.
        e.scale.set(1.55, 1.8, 1.12);
      }
    }

    const body = new THREE.Group();
    body.name = 'HoverBody';
    // Skip the gear AND the emitters: both are ground-side, and the emitters
    // are already parented here. Without the explicit skip they would be
    // swept into the body and only pulled back out by the re-add below —
    // correct by accident, which is not a thing to leave in a rig.
    for (const c of [...modelRoot.children]) {
      if (c !== gear && c !== emitters) body.add(c);
    }

    // The weapons ride the body but shake less than it does. Both mounts go
    // in together — the primary turret and the secondaries' shared parent.
    const weapons = new THREE.Group();
    weapons.name = 'Weapons';
    // NB: look in `body`, not in `g`. The body group is populated here but
    // not re-attached to the model until further down, so for these few
    // lines everything it holds is invisible to a search from the unit.
    const secondaries = body.getObjectByName('Secondary_Turrets');
    for (const name of ['Turret_Pivot', 'Secondary_Turrets']) {
      const o = body.getObjectByName(name);
      if (o) weapons.add(o);
    }
    // What is left in the body once the weapons are out IS the hull group,
    // so it is moved wholesale rather than picked over by name.
    const hull = new THREE.Group();
    hull.name = 'HullVib';
    for (const c of [...body.children]) hull.add(c);
    // deck accents ride the hull, so they shake with it like the rest of it
    for (const [x, y, z, sx, sy, sz] of deckStrips) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), glow);
      strip.position.set(x, y, z);
      strip.name = 'DeckGlow';
      hull.add(strip);
    }
    body.add(hull);
    body.add(weapons);

    modelRoot.add(body);

    g.userData.hoverEmitters = emitters;
    g.userData.hoverBody = body;   // td-tab lifts THIS, not the unit
    g.userData.hoverGear = gear;   // now the skirt alone
    g.userData.hoverHull = hull;
    g.userData.hoverWeapons = weapons;
    g.userData.secondaries = secondaries;
  }
  // The callout markers came along in the clone; collect the instance's own
  // copies (the prototype's would follow the wrong tank around).
  const callouts = [];
  g.traverse((o) => { if (o.userData && o.userData.callout) callouts.push(o); });
  if (callouts.length) g.userData.callouts = callouts;
  const muzzle = callouts.find((o) => o.userData.callout.node === 'Callout_4');
  if (muzzle) g.userData.muzzle = muzzle;   // where a shell leaves the gun

  if (guns.length) g.userData.laserGuns = guns;
  // The model has no shell rack of its own, so build the procedural tank's
  // one onto the turret roof: 3x3, row-major, index < ammo lit. Parented to
  // the turret so it sweeps with the gun exactly as the original does.
  // Turret_Pivot's local bounds are y 0.07..1.34, so the roof is ~1.34.
  if (turret) {
    // The turret roof the artist drew is a small hexagon; a 3x3 rack sized
    // to be readable overhangs it. So the rack brings its own dark plate,
    // sized to hold all nine — the same read as the procedural tank's.
    g.userData.ammoDots = makeShellRack(turret, {
      // Sampled the turret's roof height across z (|x|<1.2, turret-local):
      // it PEAKS at z=-1.0, y=1.71 and falls away both ways — 1.46 at
      // z=-1.5 and -0.5, 0.96 by z=0. So the rack centres on that crown at
      // z=-1.0, and y=1.98 puts the plate's underside at 1.76, clearing the
      // peak. Earlier values sat the plate BELOW the crown, which is why it
      // clipped through.
      y: 1.98, z: -1.0, dot: 0.15, gapX: 0.46, gapZ: 0.50,
      plate: { pad: 0.34, thickness: 0.14, color: 0x232a38,
        outline: cols.walkerHi ?? 0x7df9ff },
    });
  }
  // The pieces the model doesn't have but our tank does, so the two feel
  // like the same machine shop. Barrel_Pivot survives the merge as an empty
  // at (0, 0.54, 1.05) — a clean anchor for the sleeve.
  const barrel = g.getObjectByName('Barrel_Pivot');
  if (barrel) {
    g.userData.heatSleeve = makeHeatSleeve(barrel, {
      // 3x longer than it was, same radius: the cool->hot gauge is the most
      // legible thing on the tank and it was too short a band to read at
      // gameplay distance. Pushed forward so the longer sleeve still sits on
      // the barrel rather than starting inside the mantlet.
      radius: 0.34, len: 1.65, z: 2.05, color: cols.walkerHi ?? 0x7df9ff,
    });
  }
  // No added gun tubes: the model already HAS secondary gun barrels, and
  // laying ours over them read as glowing bars stuck through the deck. The
  // merged gun mesh is children[0] of each pivot, which is exactly where
  // td-tab looks for the heat gauge — so the model's own gun glows instead.
  // Both share one material so they heat together, as makeTank's do.
  if (guns.length === 2 && guns[0].children[0] && guns[1].children[0]) {
    // CLONE the gun material: mergeByMaterial can hand these meshes the
    // same material instance as other hull parts, so heating the shared
    // instance tinted half the deck by a hair and the guns by nothing
    // visible. A private clone, shared between the two guns only, heats
    // alone — and is stashed on userData so the tab can drive its EMISSIVE
    // channel too (a color multiply on a dark textured PBR gun is nearly
    // invisible; an emissive glow is what the bloom chain amplifies).
    const src = guns[0].children[0].material;
    if (!Array.isArray(src)) {
      const mat = src.clone();
      guns[0].children[0].material = mat;
      guns[1].children[0].material = mat;
      g.userData.gunHeatMat = mat;
      // ...and the emissive alone still never READ at gameplay distance
      // (operator confirmed on 1c834a26): the cannon's gauge is legible
      // because it is a dedicated MeshBasicMaterial SLEEVE, not the model's
      // own PBR. The secondaries get the same instrument — one sleeve per
      // gun, one shared material so both heat together.
      const sl = makeHeatSleeve(guns[0], {
        radius: 0.16, len: 0.62, z: 0.72, color: cols.walkerHi ?? 0x7df9ff });
      const sr = makeHeatSleeve(guns[1], {
        radius: 0.16, len: 0.62, z: 0.72, color: cols.walkerHi ?? 0x7df9ff });
      sr.material.dispose();
      sr.material = sl.material;
      g.userData.laserSleeveMat = sl.material;
    } else {
      guns[1].children[0].material = src;
    }
  }
  g.userData.tick = (t) => { if (turret) turret.rotation.y = Math.sin(t * 0.6) * 0.7; };
  g.userData.lift = 0.02;
  // Rendered size, NOT model normalization — fitModel already fixed the
  // model's proportions; this is what td-tab multiplies by.
  //
  // Measured against the PROCEDURAL TANK, which is the unit the board was
  // actually built around — an absolute measurement needs a reference, and
  // that is the only honest one available. Both units are multiplied by the
  // same `unitScale`, so comparing `baseScale * raw size` compares world
  // footprints directly and is free of any board-density term.
  //
  //            width    length   (world size per unit of unitScale)
  //   tank     0.508    0.729
  //   mkcx     0.382    1.051    at 0.54  — still read as small on the board
  //   mkcx     0.531    1.460    at 0.75  — a shade wider than the reference
  //
  // The previous 0.147 came from comparing the mkcx's LENGTH against a
  // corridor's WIDTH. The mkcx is 2.75:1 where the procedural tank is
  // 1.44:1, so that mistake shrank it by most of that ratio and it read as
  // a toy on the board. A tank may be longer than a lane is wide; it may
  // not be WIDER. 0.54 kept it a quarter narrower than the reference and it
  // still read as small in play, so it now sits just OVER that width — the
  // mkcx is the heavier machine, and the board is built for something this
  // size. The unit viewer divides this out, so its look is unaffected.
  g.userData.baseScale = 0.75;
  g.userData.kind = 'mesh';
  return g;
}

// --- pickups, as SOLIDS ---------------------------------------------------
// Half-dotted clouds are the ENEMY language in this game. Pickups were
// speaking it too, so a power-up on the ground read as something to shoot.
// Solid bodies with bright additive edges put them firmly on the player's
// side of the visual grammar, and shape alone tells the three apart before
// colour does.

// Bright edges, the house Tron read, without the dot cloud.
function solidWithEdges(geo, body, hi) {
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
    color: body, emissive: new THREE.Color(body).multiplyScalar(0.55),
  }));
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({
    color: hi, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));
  return mesh;
}

// Shape carries the meaning: a spiked star for speed, a rounded cell for
// health, a ring for the regen charge you carry home.
const REWARD_GEO = {
  star: () => new THREE.OctahedronGeometry(1, 0),
  cell: () => new THREE.IcosahedronGeometry(0.92, 0),
  ring: () => new THREE.TorusGeometry(0.72, 0.3, 8, 14),
  dome: () => new THREE.SphereGeometry(0.8, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
};

export function makeRewardSolid(shape, cols, phase = 0) {
  const g = new THREE.Group();
  const geo = (REWARD_GEO[shape] || REWARD_GEO.star)();
  const core = solidWithEdges(geo, cols.body, cols.hi ?? 0xffffff);
  g.add(core);
  // hovers and turns, so it reads as a thing placed there rather than debris
  g.userData.tick = (t) => {
    core.rotation.y = t * 0.9 + phase;
    core.rotation.x = Math.sin(t * 0.7 + phase) * 0.25;
    core.position.y = Math.sin(t * 1.6 + phase) * 0.18;
  };
  g.userData.kind = 'mesh';
  return g;
}

// One solid shell: a cone nose on a short body. Three of these make a triad.
export function makeShellSolid(cols) {
  const g = new THREE.Group();
  const body = solidWithEdges(new THREE.CylinderGeometry(0.34, 0.34, 1.0, 8), cols.body, cols.hi ?? 0xffffff);
  g.add(body);
  const nose = solidWithEdges(new THREE.ConeGeometry(0.34, 0.62, 8), cols.body, cols.hi ?? 0xffffff);
  nose.position.y = 0.81;
  g.add(nose);
  g.userData.kind = 'mesh';
  return g;
}

// The roster the tab dropdowns are built from, and the `kind` the board tabs
// branch on. CAREFUL: `kind` here describes which ANIMATION PATH a unit takes
// — 'cloud' means the live Wave x Jelly deform with phagocytosis, 'mesh'
// means transform-only idle via userData.tick — NOT which builder produces
// it. Since the migration to buildCreature, a 'mesh' entry like drifter is
// built as a dot cloud and still takes the transform-only path, which is
// correct. Read this field as "how does it move", never as "what is it made
// of".
//
// The `make` functions for the hostiles (makeSaturn, makeCorona, makeMine and
// friends) are no longer reached for those types — buildCreature routes them
// to makeDotEnemy. They are kept because the roster and its dropdowns still
// name them, and deleting them is a separate decision from migrating.
export const UNITS = {
  amoeba: { kind: 'cloud' },
  phage: { kind: 'cloud' },
  jellyfish: { kind: 'cloud' },
  tank: { kind: 'mesh', make: makeTank },
  mkcx: { kind: 'mesh', make: makeMkcx },
  drone: { kind: 'mesh', make: makeDrone },
  ghost: { kind: 'mesh', make: makeGhost },
  scoutufo: { kind: 'mesh', make: makeUfo },
  gslime: { kind: 'mesh', make: makeSlime },
  drifter: { kind: 'mesh', make: makeSaturn },
  corona: { kind: 'mesh', make: makeCorona },
  barbed: { kind: 'mesh', make: makeMine },
  rolling: { kind: 'mesh', make: makeMine }, // HK reuses the seamine shape
  prime: { kind: 'mesh', make: makeMine },   // ditto — tint carries the tier
  knot: { kind: 'mesh', make: makeKnot },
};

export const UNIT_NAMES = Object.keys(UNITS);

// The ONE way to ask for a creature, so no tab has to remember which of the
// two representations is the real one.
//
// Every hostile has a mesh form in UNITS (makeSaturn, makeCorona, makeMine)
// that predates the dot clouds, and buildUnit still returns it. The clouds
// are what the tower-defence tab spawns, they carry the rammable/not tell,
// and they are what the unit viewer documents — so they are the truth, and a
// tab showing the mesh form is showing a creature the player never meets.
//
// The choice is made from ENEMY_SPEC rather than a list here: anything the
// game has a creature spec for gets its cloud, anything else (the tank, the
// mkcx, the drone) falls through to buildUnit unchanged.
export function buildCreature(name, cols) {
  return ENEMY_SPEC[name] ? makeDotEnemy(name, cols) : buildUnit(name, cols);
}

export function buildUnit(name, cols) {
  const u = UNITS[name] || UNITS.tank;
  return u.kind === 'cloud' ? makeCloud(name, cols) : u.make(cols);
}
