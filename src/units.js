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
import { CREATURES, waveJelly } from './creatures.js?v=ab80a3f8';

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
// barrel. ~350 triangles, one Lambert material per tint.
function makeTank(cols) {
  const main = new THREE.MeshLambertMaterial({ color: cols.walker });
  const accent = new THREE.MeshLambertMaterial({ color: cols.walkerHi });
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, parent = g) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(1.3, 0.4, 2.0), main, 0, 0.48, 0);       // hull
  add(new THREE.BoxGeometry(0.42, 0.46, 2.35), main, -0.82, 0.26, 0); // tread L
  add(new THREE.BoxGeometry(0.42, 0.46, 2.35), main, 0.82, 0.26, 0);  // tread R
  const turret = new THREE.Group();
  turret.position.set(0, 0.84, -0.12);
  g.add(turret);
  add(new THREE.BoxGeometry(0.8, 0.34, 1.0), main, 0, 0, 0, turret);
  const barrel = add(new THREE.CylinderGeometry(0.06, 0.085, 1.5, 8), accent, 0, 0.04, 1.15, turret);
  barrel.rotation.x = Math.PI / 2;
  g.userData.turret = turret; // battle aims along this group's world +Z
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

export const UNITS = {
  amoeba: { kind: 'cloud' },
  phage: { kind: 'cloud' },
  jellyfish: { kind: 'cloud' },
  tank: { kind: 'mesh', make: makeTank },
  drone: { kind: 'mesh', make: makeDrone },
};

export const UNIT_NAMES = Object.keys(UNITS);

export function buildUnit(name, cols) {
  const u = UNITS[name] || UNITS.tank;
  return u.kind === 'cloud' ? makeCloud(name, cols) : u.make(cols);
}
