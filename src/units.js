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
import { CREATURES, waveJelly, spherePts, bulletPts, heartPts } from './creatures.js?v=9dd0264c';

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
