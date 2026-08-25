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
import { CREATURES, waveJelly, spherePts, bulletPts, missilePts, heartPts, torusPts, towerHeadPts, enemyDotPts, portalPts } from './creatures.js?v=15db5ee8';

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
export function makeTowerUnit(def) {
  const steel = new THREE.MeshLambertMaterial({ color: 0x27303f });
  const tintM = new THREE.MeshLambertMaterial({ color: def.color });
  const edge = new THREE.LineBasicMaterial({
    color: def.color, transparent: true, opacity: 0.7,
  });
  const g = new THREE.Group();
  const outline = (mesh) => {
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edge));
  };
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.8), steel);
  base.position.y = 0.08;
  outline(base);
  g.add(base);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 0.62, 6), steel);
  column.position.y = 0.47;
  g.add(column);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 6), tintM);
  collar.position.y = 0.8;
  outline(collar);
  g.add(collar);
  // the half-dotted head, floating above the mast
  const head = new THREE.Group();
  head.position.y = 1.12;
  g.add(head);
  const pts = towerHeadPts(def.shape || 'sphere');
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
    size: 2.1, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.95,
  }));
  cloud.scale.setScalar(0.42);
  if (def.shape === 'gear') cloud.rotation.x = 0.28; // show the cog face
  head.add(cloud);
  const spin = def.spin ?? 0.6;
  g.userData.tick = (t) => {
    head.rotation.y = t * spin;
    head.position.y = 1.12 + 0.045 * Math.sin(t * 1.9);
  };
  g.userData.head = head;
  g.userData.lift = 0.02;
  // hand-normalized: total height ~1.55 (head top), footprint 0.8 —
  // normalizeToUnit only measures meshes and would ignore the cloud
  g.scale.setScalar(1 / 1.55);
  g.userData.baseScale = 1 / 1.55;
  g.userData.kind = 'mesh';
  return g;
}

// dot enemies — the WHOLE TD roster as half-dotted STATIC clouds.
// The original three creatures use their rich generators (posed once,
// never re-posed); the borrowed types use enemyDotPts silhouettes.
// Animation is transform-only per type (spin / bob / squash), so a
// hundred of these cost what one waveJelly hero costs.
const DOT_SHAPES = {
  phage: () => CREATURES.phage(),
  amoeba: () => CREATURES.amoeba(),
  jellyfish: () => CREATURES.jellyfish(),
  ghost: () => enemyDotPts('ghost'),
  scoutufo: () => enemyDotPts('ufo'),
  gslime: () => enemyDotPts('slime'),
  drifter: () => enemyDotPts('saturn'),
  corona: () => enemyDotPts('corona'),
  barbed: () => enemyDotPts('seamine'),
  rolling: () => enemyDotPts('seamine'),
  prime: () => enemyDotPts('seamine'),
  knot: () => enemyDotPts('knot'),
};

export function makeDotEnemy(type, cols) {
  const base = (DOT_SHAPES[type] || (() => spherePts(140)))();
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
  const tick = TICKS[type] || ((t) => { pts.rotation.y = Math.sin(t) * 0.25; });
  pts.userData.s0 = 1; // scale captured by the game after sizing
  pts.userData.tick = tick;
  pts.userData.lift = { ghost: 0.9, scoutufo: 0.95, drifter: 0.85, knot: 0.8 }[type] ?? 0.6;
  pts.userData.kind = 'cloud';
  pts.userData.baseScale = 1;
  return pts;
}

// portal — the braille-lab half-dotted STATIC torus: an upright dotted
// ring under the twinkle treatment (per-dot brightness shimmer; no
// re-posing — the ring itself never moves, only its light does).
// userData.setDim(f) scales all brightness — the game dims a portal as
// it takes damage. Ring lies in local X-Y: align +Y to the surface
// normal and it stands like a gate.
export function makePortalCloud(cols, phase = 0, shape = 'torus') {
  const base = portalPts(shape, 1150); // dense — the gates are set pieces
  const pos = new Float32Array(base.length * 3);
  const col = new Float32Array(base.length * 3);
  const baseCol = new Float32Array(base.length * 3);
  const cBody = new THREE.Color(cols.body);
  const cHi = new THREE.Color(cols.hi);
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
    for (let i = 0; i < base.length; i++) {
      const slow = 0.5 + 0.5 * Math.sin(t * 4.2 + phase + hshf(i) * 6.283);
      const fast = 0.65 + 0.35 * Math.sin(t * 9.7 + hshf(i + 71) * 6.283);
      const b = 0.25 + 0.75 * slow * fast;
      attr.setXYZ(i, baseCol[i * 3] * b, baseCol[i * 3 + 1] * b, baseCol[i * 3 + 2] * b);
    }
    attr.needsUpdate = true;
  };
  // per-shape treatment. torus/stargate: the two-frequency shimmer.
  // torii: STATIC — but once every 5 s a twist wave rolls through it
  // (per-point rotation about the vertical, proportional to height).
  // moongate: the Wave treatment, radial ripple in the gate's plane.
  let toriiWasFlat = false;
  const TICKS = {
    torus: twinkle,
    stargate: twinkle,
    torii: (t) => {
      const ph = (t + phase) % 5;
      const amt = ph < 1.0 ? Math.sin(ph * Math.PI) * 0.75 : 0;
      if (amt === 0) {
        if (!toriiWasFlat) { repose((pnt) => pnt); toriiWasFlat = true; }
        return;
      }
      toriiWasFlat = false;
      repose((pnt) => {
        const a = amt * pnt[1];
        const cs = Math.cos(a), sn = Math.sin(a);
        return [pnt[0] * cs - pnt[2] * sn, pnt[1], pnt[0] * sn + pnt[2] * cs];
      });
    },
    moongate: (t) => {
      repose((pnt) => {
        const d = 1 + 0.12 * Math.sin(3 * Math.atan2(pnt[1], pnt[0]) + t * 3 + phase);
        return [pnt[0] * d, pnt[1] * d, pnt[2]];
      });
    },
  };
  pts.userData.tick = TICKS[shape] || twinkle;
  // dim rides the MATERIAL color (multiplies vertex colors), so every
  // treatment — color- or position-based — dims the same way
  pts.userData.setDim = (f) => { pts.material.color.setScalar(f); };
  pts.userData.kind = 'portal';
  pts.userData.sizeScale = 1;
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

export const UNITS = {
  amoeba: { kind: 'cloud' },
  phage: { kind: 'cloud' },
  jellyfish: { kind: 'cloud' },
  tank: { kind: 'mesh', make: makeTank },
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

export function buildUnit(name, cols) {
  const u = UNITS[name] || UNITS.tank;
  return u.kind === 'cloud' ? makeCloud(name, cols) : u.make(cols);
}
