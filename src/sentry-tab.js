// sentry-tab.js — THE SENTRY RANGE. Six modular turret families from the
// Sentry Workshop (https://jelaludo.github.io/SentryTowers_A6/) on a range
// where units pop up, and the turret has to find them, turn to them, and
// shoot them with its own articulation.
//
// The models arrive with a name contract, and this tab is a CLIENT of it
// rather than a second copy of the rig:
//
//   ROOT → BASE → YAW → PITCH → RECOIL      the articulation, every family
//   MUZZLE_00 … MUZZLE_nn                   where a round actually leaves
//   ROTOR                                   the Rotor's barrel cluster
//
// Two rules from this project apply and are worth naming, because both are
// easy to get wrong here and invisible when you do:
//
//   THE RULES ARE PURE AND ELSEWHERE. src/sentry.js owns every angle, every
//   limit and every refusal, and is Node-tested. This file owns meshes.
//
//   VALUES THAT MUST AGREE WITH THE RENDER ARE DERIVED FROM IT. A tracer
//   leaves along the MUZZLE's own world transform (getWorldQuaternion), not
//   along the yaw/elev the sim asked for — those two differ during a slew,
//   and a bullet that leaves along the INTENT rather than the barrel is a
//   bullet that visibly misses its own gun.
import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import GUI from '../vendor/lil-gui.esm.js';
import { makeBloom } from './postfx.js';
import { bakeGalaxyCube } from './galaxybake.js';
import { SKY_PRESET } from './galaxyseed.js';
import { LOOKS } from './looks.js';
import { makeDotEnemy, makeBulletCloud, makeDotBurst } from './units.js';
import { CREATURE_TINTS, accentFor } from './enemyspec.js';
import { mulberry32 } from './rng.js';
import { deepLink, wireDeepLink } from './deeplink.js';
import {
  SENTRY_TUNE, SENTRY_FAMILIES, SENTRY_TIERS, familyById, sentryUrl,
  makeSentry, makeRange, stepRange, pickTarget, track, slew, stepGun,
  canFire, fire, hitTarget, landedOn, aimAt, inEnvelope, aimError,
  placeBattery, relTo, stepWaves, stepWalkers, deadZone, leadPoint,
} from './sentry.js';

// the pop-up units, from the game's own roster — this is a range for OUR
// units, not a new bestiary
const TARGET_TYPES = ['phage', 'ghost', 'corona', 'barbed'];

export function initSentryTab(root) {
  let active = false;
  const q = new URLSearchParams(location.search);
  const container = root.querySelector('#sentry-app');
  const hud = root.querySelector('#sentry-hud');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 400);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;

  const sky = bakeGalaxyCube(renderer, { ...SKY_PRESET, seed: 4414, face: 1024, galaxies: 2 });
  scene.background = sky.texture;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromCubemap(sky.texture).texture;
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.4);
  sun.position.set(6, 10, 5); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8ab4ff, 0.8); fill.position.set(-7, 4, 6); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x9fdcff, 1.0); rim.position.set(2, 3, -8); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xc9d4e6, 0x141216, 0.35));
  const look = LOOKS.tronColors;

  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 72),
    new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  let grid = null;
  // the RANGE RING: the ground marks where targets can pop, so a miss and an
  // out-of-envelope refusal can be told apart by eye
  const ringMat = new THREE.LineBasicMaterial({ color: 0x2b6b96, transparent: true, opacity: 0.5 });
  const deadMat = new THREE.LineBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0.55 });
  const rings = new THREE.Group(); scene.add(rings);
  const postfx = makeBloom(renderer, scene, camera, { scale: 1, strength: 0.35, radius: 0.5, threshold: 0.35 });

  const P = {
    family: 'needle', tier: 1,
    live: true,            // the range runs; off freezes it for a look
    autoFire: true,
    mode: 'waves',         // waves | pop — what the range presents
    walls: true,           // draw the plinth a mounted sentry stands on
    lead: true,            // aim where it WILL be — see leadPoint
    manual: false,         // drive the turret by hand instead of tracking
    yaw: 0, elev: 0,       // ...with these
    seed: 4414,
    tracers: true, envelope: true, wire: true,
    ...SENTRY_TUNE,
  };
  // the defaults, before the URL touches them — the deep link writes only
  // what DIFFERS
  const P0 = { ...P };
  {
    for (const [k, v] of q.entries()) {
      if (!(k in P) || typeof P[k] === 'function') continue;
      if (typeof P[k] === 'number') { const n = parseFloat(v); if (Number.isFinite(n)) P[k] = n; }
      else if (typeof P[k] === 'boolean') P[k] = v !== '0';
      else P[k] = v;
    }
  }

  // --- state ---------------------------------------------------------------
  // THE BATTERY. One entry per sentry: its state (from the pure module), its
  // own clone of the model, and its own pivots and muzzles — because two
  // turrets three units apart do not agree about a single bearing, and each
  // one tracks, cools and recoils on its own clock.
  let proto = null;            // the loaded GLB, cloned per sentry
  const battery = [];          // { st, obj, yaw, pitch, recoil, rotor, muzzles, spin, spinRate, wall }
  let modelSerial = 0;
  const st = makeSentry(P.family, P.tier);   // kept for the HUD's headline
  let range = makeRange();
  let rng = mulberry32(P.seed >>> 0);
  const targetObjs = new Map();   // target id -> mesh
  const tracers = [];             // { mesh, pos, dir, left, id }
  const fx = [];                  // { obj, tick }

  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpM = new THREE.Vector3();

  function disposeObj(o) {
    o.traverse((n) => {
      if (n.geometry) n.geometry.dispose();
      const m = n.material;
      if (Array.isArray(m)) m.forEach((x) => x && x.dispose && x.dispose());
      else if (m && m.dispose) m.dispose();
    });
  }

  function layGround() {
    const r = Math.max(4, Math.ceil(P.ringMax + 2));
    floor.scale.setScalar(r);
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
    grid = new THREE.GridHelper(r * 2, r * 2, look.edges.color, look.edges.color);
    grid.material.transparent = true; grid.material.opacity = 0.18;
    grid.position.y = 0.002; grid.visible = P.wire;
    scene.add(grid);
    // the two ring radii the targets pop between
    while (rings.children.length) {
      const c = rings.children.pop();
      c.geometry.dispose(); rings.remove(c);
    }
    const dz = deadZone(P, gunHeight());
    for (const rr of [P.ringMin, P.ringMax, dz > 0 && Number.isFinite(dz) ? dz : 0]) {
      if (!(rr > 0)) continue;
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.sin(a) * rr, 0.01, Math.cos(a) * rr));
      }
      // the dead ring is drawn in the alarm colour: everything inside it
      // walks under the barrels
      rings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        rr === dz ? deadMat : ringMat));
    }
    frameHome();
  }

  // THE OPENING FRAME IS TOP-DOWN, the board's own build eye (operator: "start
  // with a top down view similar to the main game"). Looking down at about
  // sixty degrees shows the whole ring and where every target pops, which is
  // what this lab is for; the old three-quarter view showed the turret's
  // silhouette and half the range.
  //
  // It is also the RE-CENTRE, because a phone's orbit controls are one finger
  // to turn and two to zoom, and a few seconds of that leaves the range
  // somewhere behind you with no way back.
  function frameHome() {
    // SOLVED, not guessed: back off far enough that the outer ring fits the
    // frame's HEIGHT (the narrow axis on every phone in landscape), then sit
    // at 58 degrees. A hand-picked distance framed the ring at 9 units and
    // cut it off at 6.
    const r = Math.max(4, P.ringMax) * 1.25;
    const d = r / Math.tan((camera.fov * Math.PI) / 360);
    const el = (58 * Math.PI) / 180;
    camera.position.set(0, d * Math.sin(el), d * Math.cos(el));
    controls.target.set(0, 0.6, 0);
    controls.update();
  }

  // --- the model -----------------------------------------------------------
  const loader = new GLTFLoader();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.85, metalness: 0.15 });

  function clearBattery() {
    while (battery.length) {
      const b = battery.pop();
      scene.remove(b.obj); disposeObj(b.obj);
      if (b.wall) { scene.remove(b.wall); b.wall.geometry.dispose(); }
    }
  }

  // One entry, from a clone of the prototype. Static meshes, so a plain
  // clone shares the geometry and the materials — N sentries cost one upload
  // — and the named pivots survive it, which is the whole reason the
  // workshop's contract is worth having.
  function addSentry(pos, i) {
    if (!proto) return null;
    const obj = proto.clone(true);
    const b = {
      st: makeSentry(P.family, P.tier, pos),
      obj,
      yaw: obj.getObjectByName('YAW'),
      pitch: obj.getObjectByName('PITCH'),
      recoil: obj.getObjectByName('RECOIL'),
      rotor: obj.getObjectByName('ROTOR'),
      muzzles: [],
      spin: 0, spinRate: 0,
      wall: null,
    };
    obj.traverse((o) => { if (/^MUZZLE_\d+$/.test(o.name || '')) b.muzzles.push(o); });
    b.muzzles.sort((a, c) => a.name.localeCompare(c.name));
    obj.position.set(pos[0], pos[1], pos[2]);
    // ...and a wall under a mounted one, so the gun is standing ON something
    // rather than floating. Drawn from the mount height, so it is always
    // exactly as tall as the knob says.
    if (pos[1] > 0.01 && P.walls) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1.7, pos[1], 1.7), wallMat);
      w.position.set(pos[0], pos[1] / 2, pos[2]);
      scene.add(w);
      b.wall = w;
    }
    scene.add(obj);
    battery.push(b);
    return b;
  }

  // the trunnion's height above its own feet, measured off the model — the
  // number that makes even a floor-mounted sentry have a dead zone
  let trunnionY = 1.4;
  function gunHeight() { return P.mount + trunnionY; }

  function rebuildBattery() {
    clearBattery();
    if (!proto) return;
    const spots = placeBattery(P);
    spots.forEach((p, i) => addSentry(p, i));
    if (battery[0] && battery[0].pitch) {
      battery[0].obj.updateMatrixWorld(true);
      const w = new THREE.Vector3();
      battery[0].pitch.getWorldPosition(w);
      trunnionY = Math.max(0, w.y - battery[0].st.pos[1]);
    }
    layGround();
    console.log(`SENTRY battery ${battery.length}x ${P.family} t${P.tier}`
      + ` muzzles=${battery[0] ? battery[0].muzzles.length : 0} mount=${P.mount}`
      + ` spread=${P.spread} at [${spots.map((p) => p.map((v) => v.toFixed(1)).join('/')).join(' ')}]`);
    hudLine();
  }

  function loadSentry() {
    const ticket = ++modelSerial;
    const url = sentryUrl(P.family, P.tier);
    loader.load(url, (gltf) => {
      if (ticket !== modelSerial) { disposeObj(gltf.scene); return; }
      clearBattery();
      if (proto) disposeObj(proto);
      proto = gltf.scene;
      // the SIGNAL and IDENTIFICATION rungs are the model's own lights; under
      // a sky and one sun they read as flat paint unless they emit. Done on
      // the PROTOTYPE, so every clone shares the one material.
      proto.traverse((o) => {
        if (!o.isMesh) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (!m || m.userData.sentryLit) continue;
          m.userData.sentryLit = true;
          if (/^(Signal|Identification|Copper)$/.test(m.name || '') && m.emissive) {
            m.emissive.copy(m.color).multiplyScalar(m.name === 'Copper' ? 0.25 : 0.8);
            m.emissiveIntensity = 1;
            m.needsUpdate = true;
          }
        }
      });
      rebuildBattery();
      console.log(`SENTRY ${P.family} t${P.tier}: ${battery[0] ? battery[0].muzzles.length : 0} muzzle(s)`
        + ` yaw=${!!(battery[0] && battery[0].yaw)} pitch=${!!(battery[0] && battery[0].pitch)}`
        + ` recoil=${!!(battery[0] && battery[0].recoil)} rotor=${!!(battery[0] && battery[0].rotor)}`
        + ` fixed=${!!familyById(P.family).fixed}`);
    }, undefined, (e) => {
      hud.textContent = `${P.family} t${P.tier}: failed to load (${e && e.message})`;
    });
  }

  // --- the range -----------------------------------------------------------
  function resetRange() {
    for (const [, o] of targetObjs) { scene.remove(o); disposeObj(o); }
    targetObjs.clear();
    for (const t of tracers) { scene.remove(t.mesh); disposeObj(t.mesh); }
    tracers.length = 0;
    range = makeRange();
    rng = mulberry32(P.seed >>> 0);
    st.rounds = 0; st.hits = 0; st.kills = 0;
    for (const b of battery) { b.st.rounds = 0; b.st.hits = 0; b.st.kills = 0; b.st.target = -1; }
  }

  function targetMesh(t) {
    const type = TARGET_TYPES[t.id % TARGET_TYPES.length];
    const o = makeDotEnemy(type, { walker: CREATURE_TINTS[type], walkerHi: accentFor(type) });
    o.scale.setScalar(0.42);
    o.userData.popT = 0;
    scene.add(o);
    targetObjs.set(t.id, o);
    return o;
  }

  function dropTarget(id, killed) {
    const o = targetObjs.get(id);
    if (!o) return;
    if (killed) {
      const b = makeDotBurst(0xff8a5c, [0, 1, 0], 34);
      b.scale.setScalar(0.5);
      b.position.copy(o.position);
      scene.add(b);
      fx.push({ obj: b, tick: b.userData.tick });
    }
    scene.remove(o); disposeObj(o);
    targetObjs.delete(id);
  }

  // --- shooting ------------------------------------------------------------
  // THE BORESIGHT: the point the TRUNNION's axis is pointing at, out at the
  // target's range. Every muzzle converges on it.
  //
  // This is the one thing a multi-barrel mount forced. Firing each cell
  // straight along its own axis is what a diagram says a launcher does, and
  // it is wrong: the Quiver's eighteen cells sit across two pods, so parallel
  // fire put every round a metre beside a target the gun was dead on. Real
  // mounts are BORESIGHTED — the barrels toe in on a common point. Converging
  // on the axis (rather than on the target itself) keeps the aim honest: if
  // the drive is three degrees off, the boresight is three degrees off and
  // every cell misses together, which is what the tolerance knob is for.
  const boreDir = new THREE.Vector3(), borePt = new THREE.Vector3();
  const pivotW = new THREE.Vector3();

  // The gun's own frame: where the trunnion IS and where it POINTS, both off
  // the render transform. Filled before anything reads them — the first cut
  // measured the range to the target from a `pivotW` the boresight had not
  // set yet, which is a stale reading from whichever sentry fired last.
  function gunFrame(b) {
    if (b.pitch) {
      b.pitch.getWorldPosition(pivotW);
      b.pitch.getWorldQuaternion(tmpQ);
      boreDir.set(0, 0, 1).applyQuaternion(tmpQ).normalize();
    } else {
      pivotW.set(b.st.pos[0], b.st.pos[1] + 1.4, b.st.pos[2]);
      boreDir.set(0, 0, 1);
    }
  }

  function shoot(b, mi, target, aimPt) {
    const mz = b.muzzles[Math.min(mi, b.muzzles.length - 1)];
    const from = new THREE.Vector3();
    if (mz) mz.getWorldPosition(from);      // the ORIGIN is the real muzzle
    else from.set(b.st.pos[0], b.st.pos[1] + 1.4, b.st.pos[2]);
    gunFrame(b);
    // ...and the DIRECTION is the BORESIGHT: the point this gun's own axis is
    // pointing at, out at the target's range. Every muzzle converges on it.
    //
    // Firing each cell straight along its own axis is what a diagram says a
    // launcher does, and it is wrong: the Quiver's eighteen cells sit across
    // two pods, so parallel fire put every round a metre beside a target the
    // gun was dead on. Converging on the AXIS (rather than on the target)
    // keeps the aim honest — three degrees off the drive is three degrees off
    // the boresight, and every cell misses together.
    // the range of the AIM POINT, not of the target. With lead they are not
    // the same place, and a round that stops at the target's PRESENT range
    // falls short of the spot the barrel is pointing at by exactly the lead —
    // so leading the target made every shot miss by the amount of the lead.
    const at = aimPt || (target ? target.pos : null);
    const rng3 = at
      ? Math.hypot(at[0] - pivotW.x, at[1] - pivotW.y, at[2] - pivotW.z)
      : P.ringMax;
    borePt.copy(pivotW).addScaledVector(boreDir, rng3);
    const dir = borePt.clone().sub(from);
    if (dir.lengthSq() < 1e-9) dir.set(0, 0, 1);
    dir.normalize();
    const mesh = makeBulletCloud({ body: look.walkerHi, hi: 0xffffff });
    mesh.scale.setScalar(0.09);
    mesh.position.copy(from);
    scene.add(mesh);
    // it flies to the boresight POINT — so an aim that is off puts the round
    // out at the target's range and beside it, which is what a miss looks
    // like and what landedOn then measures
    const dist = borePt.distanceTo(from) || P.ringMax;
    tracers.push({ mesh, pos: from.clone(), dir, left: dist, id: target ? target.id : -1, by: b });
    // the muzzle flash, in the game's own dots
    const f = makeDotBurst(0xffe6a8, [dir.x, dir.y, dir.z], 16);
    f.scale.setScalar(0.22);
    f.position.copy(from);
    scene.add(f);
    fx.push({ obj: f, tick: f.userData.tick });
  }

  function stepTracers(dt) {
    for (let i = tracers.length - 1; i >= 0; i--) {
      const tr = tracers[i];
      const step = Math.min(tr.left, P.muzzleVel * dt);
      tr.pos.addScaledVector(tr.dir, step);
      tr.left -= step;
      tr.mesh.position.copy(tr.pos);
      if (tr.left > 1e-4) continue;
      // DID IT LAND ON IT? The tracer left along the BARREL, and the barrel is
      // only as close as the drive had got it — so a round fired mid-slew
      // arrives somewhere else, and says so. Without this the tolerance knob
      // would be decoration and every shot would hit.
      const aimed = tr.id >= 0 ? range.targets.find((x) => x.id === tr.id) : null;
      // credited to the SENTRY THAT FIRED IT. Crediting the headline state
      // silently lost every hit: aimFrame rebuilds that from the battery's
      // own totals each frame, so a kill written there was overwritten
      // before anything read it.
      const res = landedOn([tr.pos.x, tr.pos.y, tr.pos.z], aimed, P)
        ? hitTarget(tr.by ? tr.by.st : st, range, tr.id) : null;
      const b = makeDotBurst(res ? 0xffd27f : 0x6f8ea0, [0, 1, 0], res ? 26 : 12);
      b.scale.setScalar(res ? 0.4 : 0.2);
      b.position.copy(tr.pos);
      scene.add(b);
      fx.push({ obj: b, tick: b.userData.tick });
      if (res === 'kill') dropTarget(tr.id, true);
      scene.remove(tr.mesh); disposeObj(tr.mesh);
      tracers.splice(i, 1);
    }
  }

  // --- the frame -----------------------------------------------------------
  function stepRangeFrame(dt) {
    if (P.mode === 'waves') {
      // enemies that walk in and can die. Anything that reaches the guns has
      // GOT THROUGH — it comes off the field and is counted, because a range
      // an enemy walks over and keeps going measures nothing.
      const sent = stepWaves(range, dt, rng, P);
      if (sent) console.log(`SENTRY wave ${range.wave} — ${sent} inbound`);
      for (const id of stepWalkers(range, dt, P)) dropTarget(id, false);
    } else {
      for (const id of stepRange(range, dt, rng, P)) dropTarget(id, false);
    }
    for (const t of range.targets) {
      const o = targetObjs.get(t.id) || targetMesh(t);
      // POP UP: they rise out of the ground over a third of a second, which
      // is the whole reason the range is a popper — a target that fades in
      // gives the turret no moment to react to
      o.userData.popT = Math.min(1, (o.userData.popT ?? 0) + dt * 3);
      const e = o.userData.popT * o.userData.popT * (3 - 2 * o.userData.popT);
      o.position.set(t.pos[0], t.pos[1] * e + (e - 1) * 0.8, t.pos[2]);
      // a walker faces where it is going, which on this range is inward
      if (t.walker) o.lookAt(0, o.position.y, 0);
      if (o.userData.tick) o.userData.tick(range.t + t.id);
    }
  }

  // EVERY SENTRY AIMS FOR ITSELF. Each one asks pickTarget in ITS OWN frame
  // (relTo), so a battery covers each other's blind bearings instead of all
  // three swinging onto the same enemy — and a gun on a wall refuses what it
  // cannot depress to while the one on the ground takes it.
  function aimFrame(dt) {
    const fixed = !!familyById(P.family).fixed;
    let engaged = 0;
    for (const b of battery) {
      const s2 = b.st;
      let inside = false, tgt = null, aimPt = null;
      if (P.manual || fixed) {
        s2.wantYaw = fixed ? 0 : P.yaw;
        s2.wantElev = fixed ? 0 : P.elev;
        inside = !fixed;
      } else {
        const i = pickTarget(range, P, s2.target, s2);
        tgt = i >= 0 ? range.targets[i] : null;
        s2.target = tgt ? tgt.id : -1;
        if (tgt) {
          const o = targetObjs.get(tgt.id);
          const p = o ? [o.position.x, o.position.y, o.position.z] : tgt.pos;
          // ...and FROM THE TRUNNION, not from the model's origin. The pivot
          // sits over a metre above the base on every one of these families;
          // aiming from the base put a dead-on barrel's rounds that far past
          // the target. relTo carries the sentry's own stand, the trunnion
          // carries the rest.
          // LEAD: aim where it WILL be when the round arrives. Without it a
          // sentry hits every stationary mark and misses every walker — at
          // the default velocity a target nine units out has moved 0.56 of a
          // unit by the time the round gets there, and the hit radius is
          // 0.55. It tracks beautifully and kills nothing.
          gunFrame(b);
          const gun = [pivotW.x, pivotW.y, pivotW.z];
          aimPt = (P.lead && tgt.vel) ? leadPoint(p, tgt.vel, gun, P.muzzleVel) : p;
          const rel = [aimPt[0] - gun[0], aimPt[1] - gun[1], aimPt[2] - gun[2]];
          inside = inEnvelope(aimAt(rel), P);
          track(s2, rel, P);
          if (inside) engaged++;
        }
      }
      slew(s2, dt, P);
      stepGun(s2, dt, P);
      if (b.yaw && !fixed) b.yaw.rotation.y = (s2.yaw * Math.PI) / 180;
      // THE ONE NEGATION. The module speaks elevation-positive-up; the PITCH
      // node lifts its nose on a NEGATIVE rotation about +X. Here, once.
      if (b.pitch && !fixed) b.pitch.rotation.x = -(s2.elev * Math.PI) / 180;
      if (b.recoil) b.recoil.position.z = -s2.recoil;
      if (b.rotor) {
        b.spinRate += ((s2.cool > 0 ? 16 : 0) - b.spinRate) * Math.min(1, dt * 2.2);
        b.spin += b.spinRate * dt;
        b.rotor.rotation.z = b.spin;
      }
      if (P.autoFire && !fixed && P.live && canFire(s2, inside, P)) {
        shoot(b, fire(s2, b.muzzles.length, P), tgt, aimPt);
      }
    }
    // the headline state, for the HUD: the first gun's, plus the battery's
    // totals, so one line reads for one turret and for six
    if (battery.length) {
      const f = battery[0].st;
      st.yaw = f.yaw; st.elev = f.elev; st.wantYaw = f.wantYaw; st.wantElev = f.wantElev;
      st.target = f.target;
      st.rounds = battery.reduce((n, b) => n + b.st.rounds, 0);
      st.hits = battery.reduce((n, b) => n + b.st.hits, 0);
      st.kills = battery.reduce((n, b) => n + b.st.kills, 0);
    }
    st.engaged = engaged;
  }

  function hudLine() {
    const f = familyById(P.family);
    const t = st.target >= 0 ? range.targets.find((x) => x.id === st.target) : null;
    const n = battery.length;
    const mz = battery[0] ? battery[0].muzzles.length : 0;
    hud.textContent = `${n > 1 ? `${n}× ` : ''}${f.label} · tier ${P.tier} · ${mz} muzzle`
      + `${mz === 1 ? '' : 's'}${P.mount > 0 ? ` · on a ${P.mount}-unit wall` : ''}`
      + ` · ${f.fixed ? 'FIXED — no articulation' : `yaw ${st.yaw.toFixed(1)}° → ${st.wantYaw.toFixed(1)}°`
        + ` · elev ${st.elev.toFixed(1)}° → ${st.wantElev.toFixed(1)}°`
        + ` · err ${aimError(st).toFixed(1)}°${aimError(st) <= P.tolerance ? ' ON TARGET' : ''}`}`
      + `\n${P.mode === 'waves' ? `wave ${range.wave} · ` : ''}${range.targets.length} up`
      + ` · ${st.engaged || 0}/${n} engaging`
      + ` · ${st.rounds} fired · ${st.hits} hit · ${st.kills} killed`
      + `${st.rounds ? ` · ${Math.round((st.hits / st.rounds) * 100)}% on` : ''}`
      + `${P.mode === 'waves' ? ` · ${range.leaked} through` : ''}`
      // WHAT THE WALL COSTS, in the one number that explains a silent gun:
      // inside this radius the depression stop refuses everything on the
      // ground, and a wave simply walks under the barrels.
      + `${P.mount > 0 ? `\nwall ${P.mount} · depression ${P.elevMin}° · BLIND inside ${deadZone(P, gunHeight()).toFixed(1)} units`
        + `${deadZone(P, gunHeight()) >= P.ringMax ? ' — that is the whole range: give it more depression' : ''}` : ''}`;
    hud.style.color = f.fixed ? '#ffb45e' : '#9fdcff';
  }

  // --- the panel -----------------------------------------------------------
  const gui = new GUI({ title: 'SENTRY RANGE', container: root });
  gui.add(P, 'family', SENTRY_FAMILIES.map((f) => f.id)).onChange(() => loadSentry());
  gui.add(P, 'tier', SENTRY_TIERS).onChange(() => loadSentry());
  gui.add(P, 'mode', ['waves', 'pop']).name('range mode').onChange(() => resetRange());
  gui.add(P, 'live').name('range live');
  gui.add(P, 'autoFire').name('weapons free');
  const gm = gui.addFolder('manual aim');
  gm.add(P, 'manual').name('drive by hand');
  gm.add(P, 'yaw', -180, 180, 1);
  gm.add(P, 'elev', -10, 65, 1).name('elevation');
  gm.close();
  const gb = gui.addFolder('battery');
  gb.add(P, 'count', 1, 6, 1).name('sentries').onChange(() => rebuildBattery());
  gb.add(P, 'spread', 0, 12, 0.5).name('apart').onChange(() => rebuildBattery());
  gb.add(P, 'mount', 0, 8, 0.25).name('wall height').onChange(() => { rebuildBattery(); layGround(); });
  gb.add(P, 'walls').name('draw the wall').onChange(() => rebuildBattery());

  const gd = gui.addFolder('drive');
  gd.add(P, 'yawRate', 10, 720, 5).name('yaw deg/s');
  gd.add(P, 'pitchRate', 5, 360, 5).name('elev deg/s');
  gd.add(P, 'tolerance', 0.2, 15, 0.1).name('on target (deg)');
  gd.add(P, 'elevMin', -80, 0, 1).name('depression stop').onChange(() => layGround());
  gd.add(P, 'elevMax', 5, 89, 1).name('elevation stop');
  const gg = gui.addFolder('gun');
  gg.add(P, 'cooldown', 0.05, 3, 0.05).name('rate of fire (s)');
  gg.add(P, 'recoilKick', 0, 0.6, 0.01).name('recoil');
  gg.add(P, 'recoilBack', 0.05, 2, 0.05).name('recovery');
  gg.add(P, 'muzzleVel', 4, 120, 1).name('muzzle velocity');
  gg.add(P, 'lead').name('lead moving targets');
  const gr = gui.addFolder('range');
  gr.add(P, 'waveSize', 1, 30, 1).name('first wave');
  gr.add(P, 'waveGrow', 0, 10, 1).name('grow by');
  gr.add(P, 'waveGap', 0, 15, 0.5).name('between waves');
  gr.add(P, 'walkSpeed', 0.1, 10, 0.1).name('walk units/s');
  gr.add(P, 'reachRadius', 0.2, 6, 0.1).name('through at');
  gr.add(P, 'targets', 1, 12, 1).name('targets up (pop)');
  gr.add(P, 'hp', 1, 10, 1).name('rounds to kill');
  gr.add(P, 'popMin', 0.2, 8, 0.1).name('up for min');
  gr.add(P, 'popMax', 0.3, 12, 0.1).name('up for max');
  gr.add(P, 'ringMin', 1, 20, 0.5).name('nearest').onChange(layGround);
  gr.add(P, 'ringMax', 2, 40, 0.5).name('farthest').onChange(layGround);
  gr.add(P, 'targetHi', 0, 12, 0.1).name('highest pop');
  gr.add(P, 'seed', 1, 9999, 1).onChange(resetRange);
  gr.add({ again: () => resetRange() }, 'again').name('reset the range');
  const gv = gui.addFolder('view');
  gv.add(P, 'wire').name('floor wire').onChange((v) => { if (grid) grid.visible = v; });
  gv.add(P, 'tracers').name('tracers');
  gv.add({ recentre: () => frameHome() }, 'recentre').name('re-centre the view');
  gv.close();

  wireDeepLink(root.querySelector('#sentry-link'), () => deepLink({
    base: location.origin + location.pathname, hash: 'sentry',
    params: P, defaults: P0, carry: location.search,
  }), { label: 'SENTRY', flash: (m) => { hud.textContent = m; flashUntil = performance.now() + 2200; } });
  let flashUntil = 0;

  // ON A PHONE THE PANEL STARTS SHUT. The lil-gui drawer takes the bottom
  // 46vh, and the frame centres on the whole canvas — so the turret, which is
  // the thing you came to look at, sat underneath it. The gear opens it. This
  // is the same failure the board's own diagnostics now name as "covered":
  // drawn, on glass, with a piece of chrome on top of it.
  if (matchMedia('(pointer: coarse)').matches
    || new URLSearchParams(location.search).get('mobile') === '1'
    || innerWidth <= 700) root.classList.add('panel-hidden');

  const ctr = root.querySelector('#sentry-center');
  if (ctr) ctr.addEventListener('click', () => frameHome());

  const gear = root.querySelector('#sentry-gear');
  if (gear) gear.addEventListener('click', () => root.classList.toggle('panel-hidden'));

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    postfx.setSize(w, h);
  }
  addEventListener('resize', resize);

  layGround();
  loadSentry();

  const clock = new THREE.Clock();
  let hudT = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!active) return;
    const dt = Math.min(0.05, clock.getDelta());
    if (P.live) stepRangeFrame(dt);
    aimFrame(dt);
    stepTracers(dt);
    for (let i = fx.length - 1; i >= 0; i--) {
      if (!fx[i].tick(dt)) { scene.remove(fx[i].obj); disposeObj(fx[i].obj); fx.splice(i, 1); }
    }
    for (const t of tracers) t.mesh.visible = P.tracers;
    controls.update();
    postfx.render();
    hudT += dt;
    if (hudT > 0.2 && performance.now() >= flashUntil) { hudT = 0; hudLine(); }
  }
  animate();

  // ?sentryprobe=1 — the range, in numbers. A turret that tracks is a claim
  // about angles over time, and a screenshot of a barrel cannot settle it:
  // this reports the error falling, the rounds leaving, and the targets going
  // down, for whichever family is loaded.
  if (q.get('sentryprobe') === '1') {
    let n = 0;
    const tick = setInterval(() => {
      if (++n > 8) { clearInterval(tick); return; }
      console.log(`SENTRYPROBE t+${n}s ${battery.length}x${P.family} t${P.tier}`
        + ` muzzles=${battery[0] ? battery[0].muzzles.length : 0} mount=${P.mount} mode=${P.mode}`
        + ` wave=${range.wave} through=${range.leaked} cleared=${range.cleared}`
        + ` blind=${deadZone(P, gunHeight()).toFixed(1)}`
        + ` unreachable=${battery.length && range.targets.length
          ? range.targets.filter((t2) => t2.up && !inEnvelope(aimAt(relTo(battery[0].st, t2.pos)), P)).length : 0}`
        + ` yaw=${st.yaw.toFixed(1)}/${st.wantYaw.toFixed(1)}`
        + ` elev=${st.elev.toFixed(1)}/${st.wantElev.toFixed(1)}`
        + ` err=${aimError(st).toFixed(2)} target=${st.target}`
        + ` up=${range.targets.length} fired=${st.rounds} hit=${st.hits} killed=${st.kills}`
        + ` tracers=${tracers.length}`);
    }, 1000);
  }

  return {
    setActive(on) { active = on; if (on) { resize(); clock.getDelta(); } },
  };
}
