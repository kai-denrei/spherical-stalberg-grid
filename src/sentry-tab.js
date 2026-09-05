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
  const rings = new THREE.Group(); scene.add(rings);
  const postfx = makeBloom(renderer, scene, camera, { scale: 1, strength: 0.35, radius: 0.5, threshold: 0.35 });

  const P = {
    family: 'needle', tier: 1,
    live: true,            // the range runs; off freezes it for a look
    autoFire: true,
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
  let model = null, yawNode = null, pitchNode = null, recoilNode = null, rotorNode = null;
  let muzzles = [];            // the MUZZLE_nn empties, in order
  let modelSerial = 0;
  let st = makeSentry(P.family, P.tier);
  let range = makeRange();
  let rng = mulberry32(P.seed >>> 0);
  const targetObjs = new Map();   // target id -> mesh
  const tracers = [];             // { mesh, pos, dir, left, id }
  const fx = [];                  // { obj, tick }
  let spin = 0, spinRate = 0;     // the Rotor's barrel cluster
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
    for (const rr of [P.ringMin, P.ringMax]) {
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.sin(a) * rr, 0.01, Math.cos(a) * rr));
      }
      rings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
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
  function loadSentry() {
    const ticket = ++modelSerial;
    const url = sentryUrl(P.family, P.tier);
    loader.load(url, (gltf) => {
      if (ticket !== modelSerial) { disposeObj(gltf.scene); return; }
      if (model) { scene.remove(model); disposeObj(model); }
      model = gltf.scene;
      yawNode = model.getObjectByName('YAW');
      pitchNode = model.getObjectByName('PITCH');
      recoilNode = model.getObjectByName('RECOIL');
      rotorNode = model.getObjectByName('ROTOR');
      // THE MUZZLES, IN ORDER. Sorted by name rather than by traversal, so
      // MUZZLE_00 is the first barrel on every family and the round-robin is
      // the same walk the model's own numbering describes.
      muzzles = [];
      model.traverse((o) => { if (/^MUZZLE_\d+$/.test(o.name || '')) muzzles.push(o); });
      muzzles.sort((a, b) => a.name.localeCompare(b.name));
      // the SIGNAL and IDENTIFICATION rungs are the model's own lights; under
      // a sky and one sun they read as flat paint unless they emit
      model.traverse((o) => {
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
      scene.add(model);
      st = makeSentry(P.family, P.tier);
      console.log(`SENTRY ${P.family} t${P.tier}: ${muzzles.length} muzzle(s)`
        + ` yaw=${!!yawNode} pitch=${!!pitchNode} recoil=${!!recoilNode} rotor=${!!rotorNode}`
        + ` fixed=${!!familyById(P.family).fixed}`);
      hudLine();
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
  function boresight(range3) {
    if (pitchNode) {
      pitchNode.getWorldPosition(pivotW);
      pitchNode.getWorldQuaternion(tmpQ);
      boreDir.set(0, 0, 1).applyQuaternion(tmpQ).normalize();
    } else {
      pivotW.set(0, 1.4, 0);
      boreDir.set(0, 0, 1);
    }
    return borePt.copy(pivotW).addScaledVector(boreDir, range3);
  }

  function shoot(mi, target) {
    const mz = muzzles[Math.min(mi, muzzles.length - 1)];
    const from = new THREE.Vector3();
    if (mz) mz.getWorldPosition(from);      // the ORIGIN is the real muzzle
    else from.set(0, 1.4, 0);
    // ...and the DIRECTION is the boresight, at the target's range. Derived
    // from the render either way — the barrel's own world transform — never
    // from the yaw and elevation the sim asked for, which differ from it
    // during every slew.
    const rng3 = target
      ? Math.hypot(target.pos[0] - pivotW.x, target.pos[1] - pivotW.y, target.pos[2] - pivotW.z)
      : P.ringMax;
    const aimPt = boresight(rng3).clone();
    const dir = aimPt.sub(from);
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
    tracers.push({ mesh, pos: from.clone(), dir, left: dist, id: target ? target.id : -1 });
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
      const res = landedOn([tr.pos.x, tr.pos.y, tr.pos.z], aimed, P)
        ? hitTarget(st, range, tr.id) : null;
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
    for (const id of stepRange(range, dt, rng, P)) dropTarget(id, false);
    for (const t of range.targets) {
      const o = targetObjs.get(t.id) || targetMesh(t);
      // POP UP: they rise out of the ground over a third of a second, which
      // is the whole reason the range is a popper — a target that fades in
      // gives the turret no moment to react to
      o.userData.popT = Math.min(1, (o.userData.popT ?? 0) + dt * 3);
      const e = o.userData.popT * o.userData.popT * (3 - 2 * o.userData.popT);
      o.position.set(t.pos[0], t.pos[1] * e + (e - 1) * 0.8, t.pos[2]);
      if (o.userData.tick) o.userData.tick(range.t + t.id);
    }
  }

  function aimFrame(dt) {
    if (!model) return;
    const fixed = !!familyById(P.family).fixed;
    let inside = false, tgt = null;
    if (pitchNode) pitchNode.getWorldPosition(pivotW);
    if (P.manual || fixed) {
      st.wantYaw = fixed ? 0 : P.yaw;
      st.wantElev = fixed ? 0 : P.elev;
      inside = !fixed;
    } else {
      // it keeps the one it has while that one is still engageable — see
      // pickTarget. `st.target` is the target's ID, not its index: the
      // range's array is rebuilt every step.
      const i = pickTarget(range, P, st.target);
      tgt = i >= 0 ? range.targets[i] : null;
      st.target = tgt ? tgt.id : -1;
      if (tgt) {
        const o = targetObjs.get(tgt.id);
        // aim at where the model IS on screen (mid-pop it is below its
        // resting height), not at where the sim says it will end up...
        const p = o ? [o.position.x, o.position.y, o.position.z] : tgt.pos;
        // ...and FROM THE TRUNNION, not from the model's origin. The pivot
        // sits over a metre above the foundation on every one of these
        // families, and aiming from the floor put a dead-on barrel's rounds
        // that far past the target — err 0.00 and nothing ever hit. The
        // elevation a turret needs is the angle from ITS OWN axis.
        const rel = aimOrigin(p);
        inside = inEnvelope(aimAt(rel), P);
        track(st, rel, P);
      }
    }
    slew(st, dt, P);
    stepGun(st, dt, P);
    if (yawNode && !fixed) yawNode.rotation.y = (st.yaw * Math.PI) / 180;
    // THE ONE NEGATION. The module speaks elevation-positive-up; the PITCH
    // node lifts its nose on a NEGATIVE rotation about +X. Here, once.
    if (pitchNode && !fixed) pitchNode.rotation.x = -(st.elev * Math.PI) / 180;
    if (recoilNode) recoilNode.position.z = -st.recoil;
    if (rotorNode) {
      // the barrel cluster spins UP while the gun is hot and coasts down
      // after — one rate that eases, rather than two states that snap
      spinRate += ((st.cool > 0 ? 16 : 0) - spinRate) * Math.min(1, dt * 2.2);
      spin += spinRate * dt;
      rotorNode.rotation.z = spin;
    }
    if (P.autoFire && !fixed && P.live && canFire(st, inside, P)) {
      shoot(fire(st, muzzles.length, P), tgt);
    }
  }

  // The target, in the turret's own frame: measured from the PITCH pivot,
  // which is where the barrel actually swings from.
  const pivotW = new THREE.Vector3();
  function aimOrigin(p) {
    if (pitchNode) pitchNode.getWorldPosition(pivotW);
    else pivotW.set(0, 0, 0);
    return [p[0] - pivotW.x, p[1] - pivotW.y, p[2] - pivotW.z];
  }

  function hudLine() {
    const f = familyById(P.family);
    const t = st.target >= 0 ? range.targets.find((x) => x.id === st.target) : null;
    hud.textContent = `${f.label} · tier ${P.tier} · ${muzzles.length} muzzle`
      + `${muzzles.length === 1 ? '' : 's'} · ${f.fixed ? 'FIXED — no articulation' : `yaw ${st.yaw.toFixed(1)}° → ${st.wantYaw.toFixed(1)}°`
        + ` · elev ${st.elev.toFixed(1)}° → ${st.wantElev.toFixed(1)}°`
        + ` · err ${aimError(st).toFixed(1)}°${aimError(st) <= P.tolerance ? ' ON TARGET' : ''}`}`
      + `\n${range.targets.length} up · ${t ? `engaging #${t.id} at ${Math.hypot(...t.pos).toFixed(1)}` : 'no target in envelope'}`
      + ` · ${st.rounds} fired · ${st.hits} hit · ${st.kills} killed`
      + `${st.rounds ? ` · ${Math.round((st.hits / st.rounds) * 100)}% on` : ''}`;
    hud.style.color = f.fixed ? '#ffb45e' : '#9fdcff';
  }

  // --- the panel -----------------------------------------------------------
  const gui = new GUI({ title: 'SENTRY RANGE', container: root });
  gui.add(P, 'family', SENTRY_FAMILIES.map((f) => f.id)).onChange(() => loadSentry());
  gui.add(P, 'tier', SENTRY_TIERS).onChange(() => loadSentry());
  gui.add(P, 'live').name('range live');
  gui.add(P, 'autoFire').name('weapons free');
  const gm = gui.addFolder('manual aim');
  gm.add(P, 'manual').name('drive by hand');
  gm.add(P, 'yaw', -180, 180, 1);
  gm.add(P, 'elev', -10, 65, 1).name('elevation');
  gm.close();
  const gd = gui.addFolder('drive');
  gd.add(P, 'yawRate', 10, 720, 5).name('yaw deg/s');
  gd.add(P, 'pitchRate', 5, 360, 5).name('elev deg/s');
  gd.add(P, 'tolerance', 0.2, 15, 0.1).name('on target (deg)');
  const gg = gui.addFolder('gun');
  gg.add(P, 'cooldown', 0.05, 3, 0.05).name('rate of fire (s)');
  gg.add(P, 'recoilKick', 0, 0.6, 0.01).name('recoil');
  gg.add(P, 'recoilBack', 0.05, 2, 0.05).name('recovery');
  gg.add(P, 'muzzleVel', 4, 120, 1).name('muzzle velocity');
  const gr = gui.addFolder('range');
  gr.add(P, 'targets', 1, 12, 1).name('targets up');
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
      console.log(`SENTRYPROBE t+${n}s ${P.family} t${P.tier} muzzles=${muzzles.length}`
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
