// sniper-tab.js — THE SNIPER RANGE. First person down a Lancer's optic, at
// things a long way off, with the physics that make the shot interesting:
// drop, time of flight, an alien crosswind that gusts, a reticle that will
// not hold still, a zero you set and a rangefinder you may or may not have.
//
// src/ballistics.js owns every number and is Node-tested. This owns the
// scope, the reticle and the rifle — and the ONE rule that matters here is
// that the round the player watches and the hold the HUD prints come out of
// the same integrator. A sniper mechanic is a promise that the number on the
// glass is the number the bullet obeys.
//
// THE ASSIST LADDER is the automation arc in miniature (docs/AUTOMATION-ARC.md):
// every readout starts OFF and can be switched on one at a time, which is
// both the difficulty knob the operator asked for and a rehearsal of the
// chips Isao is meant to print.
import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import GUI from '../vendor/lil-gui.esm.js';
import { makeBloom } from './postfx.js';
import { bakeGalaxyCube } from './galaxybake.js';
import { SKY_PRESET } from './galaxyseed.js';
import { LOOKS } from './looks.js';
import { makeDotEnemy, makeDotBurst } from './units.js';
import { CREATURE_TINTS, accentFor } from './enemyspec.js';
import { mulberry32 } from './rng.js';
import { makeAudio } from './audio.js';
import { deepLink, wireDeepLink } from './deeplink.js';
import { sentryUrl } from './sentry.js';
import { sweepAngle, radarPhosphor } from './radar.js';
import {
  BALLISTICS_TUNE, MRAD, toMrad, windAt, launch, step, solution, zeroAngle,
  makeShooter, stepBreath, sway, rangeFromMrad, hitsAt, STEP, MAX_T,
} from './ballistics.js';

const TARGET_TYPES = ['phage', 'ghost', 'corona', 'barbed'];
const TARGET_H = 1.9;      // metres — what the rangefinder mil-relation uses

export function initSniperTab(root) {
  let active = false;
  const q = new URLSearchParams(location.search);
  const container = root.querySelector('#sniper-app');
  const hud = root.querySelector('#sniper-hud');
  const reticleEl = root.querySelector('#sniper-reticle');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // the scope: a long lens. FOV is DERIVED from the magnification, so the
  // reticle's milliradians are true on the glass at any zoom — a mil that is
  // not a mil is a scope that cannot be ranged with.
  const camera = new THREE.PerspectiveCamera(6, 1, 0.5, 4000);

  const sky = bakeGalaxyCube(renderer, { ...SKY_PRESET, seed: 4414, face: 1024, galaxies: 2 });
  scene.background = sky.texture;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromCubemap(sky.texture).texture;
  scene.environmentIntensity = 0.7;
  const sun = new THREE.DirectionalLight(0xffe9cf, 2.6); sun.position.set(-40, 60, 30); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8ab4ff, 0.7); fill.position.set(50, 20, -20); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xbfd0e6, 0x1a1712, 0.5));
  const look = LOOKS.tronColors;

  // THE GROUND, out to the far targets. A plane with a wire on it: the wire
  // is the only depth cue a scope has, and without one a target at 900 m and
  // one at 300 m are the same smudge.
  const GROUND = 2200;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(GROUND * 2, GROUND * 2),
    new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  // 100 m squares, faint. At 10x a fine grid piles into a solid band at the
  // horizon and hides exactly the thing the scope is for; a coarse one is a
  // DEPTH CUE, which is the only reason it is here — without it a target at
  // 900 m and one at 300 m are the same smudge.
  const grid = new THREE.GridHelper(GROUND * 2, Math.round((GROUND * 2) / 100),
    look.edges.color, look.edges.color);
  grid.material.transparent = true; grid.material.opacity = 0.07;
  grid.position.y = 0.03; scene.add(grid);
  scene.fog = new THREE.Fog(0x14161c, GROUND * 0.5, GROUND * 2.2);
  const postfx = makeBloom(renderer, scene, camera, { scale: 1, strength: 0.22, radius: 0.5, threshold: 0.5 });

  const P = {
    tier: 2,
    mag: 10,               // scope magnification
    ...BALLISTICS_TUNE,
    range: 700,            // where the next target stands
    spread: 260,           // ...± this
    targets: 4,
    targetR: 0.55,         // metres — the kill radius
    seed: 4414,
    tracer: true,
    // PHASE 1 IS CALIBRATION. A black-and-white target at a known distance
    // and a fixed number of shots: read the conditions, dial the hold, and
    // see your group. Phase 2 is what the calibration was FOR.
    phase: 'calibrate',    // calibrate | contact
    allotted: 5,           // shots in a calibration string
    moverSpeed: 3.2,       // m/s across the line of sight, in contact
    sound: true,
    // YOU DO NOT SEE YOUR OWN RIFLE DOWN YOUR OWN SCOPE. The Lancer is still
    // the gun — its muzzle sets the launch height, its PITCH node carries the
    // optic, its RECOIL node kicks — but the camera sits AT the optic, which
    // is inside the receiver, so leaving it drawn fills the frame with grey
    // metal and nothing else. On for a look at the rig; off to shoot.
    showRifle: false,
    closeup: true,         // the spotting monitor
    scan: true,            // the PPI
    // THE ASSIST LADDER — every one of these is a chip Isao has not printed
    // yet. Off is the game the operator described; on is the difficulty knob.
    rangefinder: false,    // the HUD prints the range
    windRead: false,       // ...and the wind
    firingSolution: false, // ...and marks the hold on the reticle
    autoHold: false,       // ...and simply dials it for you
  };
  const P0 = { ...P };
  for (const [k, v] of q.entries()) {
    if (!(k in P) || typeof P[k] === 'function') continue;
    if (typeof P[k] === 'number') { const n = parseFloat(v); if (Number.isFinite(n)) P[k] = n; }
    else if (typeof P[k] === 'boolean') P[k] = v !== '0';
    else P[k] = v;
  }

  // --- state ---------------------------------------------------------------
  let rifle = null, yawNode = null, pitchNode = null, muzzleNode = null, recoilNode = null;
  const sfx = makeAudio({ seed: 1 });
  // ARM IT. A browser will not start an AudioContext without a gesture, and
  // `makeAudio` only listens for one once it has been asked to — every other
  // tab with sound calls this and the sniper did not, so the gun was silent
  // and nothing said why.
  sfx.arm();
  let saidAudio = false;
  const shooter = makeShooter();
  // THE STRING: a calibration is a fixed number of shots, and what you learn
  // from it is the GROUP — where the rounds went together, not where any one
  // of them went. Held in metres AND milliradians, because the correction a
  // shooter dials is angular and the group they look at is linear.
  const string = [];   // { dx, dy, range, mradX, mradY }
  let aimYaw = 0, aimPitch = 0;      // where the SHOOTER is pointing, radians
  let holdUp = 0, holdSide = 0;      // ...and what they have dialled on, mrad
  // the board's cannon recoil, in the board's own shape: a hard kick eased
  // out over RECOIL_COOL. Bigger than the sentry's because a scope MAGNIFIES
  // the kick — at 10x a tenth of a milliradian is a visible jump, and that
  // is the whole reason a sniper's recoil reads.
  const RECOIL_KICK = 0.42, RECOIL_COOL = 0.55;
  let recoil = 0, clock = 0;
  let rng = mulberry32(P.seed >>> 0);
  const targets = [];                // { obj, pos, id, alive }
  const rounds = [];                 // live bullets
  const fx = [];
  let lastRange = 0, lastShot = null;
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion();

  const disposeObj = (o) => o.traverse((n) => {
    if (n.geometry) n.geometry.dispose();
    const m = n.material;
    if (Array.isArray(m)) m.forEach((x) => x && x.dispose && x.dispose());
    else if (m && m.dispose) m.dispose();
  });

  // --- the rifle -----------------------------------------------------------
  // The Lancer, from the sentry workshop, under its own name contract. The
  // camera rides the PITCH node, so the scope moves with the barrel — which
  // is what makes the recoil kick the view and the sway move the shot.
  new GLTFLoader().load(sentryUrl('lancer', P.tier), (gltf) => {
    rifle = gltf.scene;
    yawNode = rifle.getObjectByName('YAW');
    pitchNode = rifle.getObjectByName('PITCH');
    recoilNode = rifle.getObjectByName('RECOIL');
    rifle.traverse((o) => { if (/^MUZZLE_\d+$/.test(o.name || '')) muzzleNode = muzzleNode || o; });
    rifle.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!m || m.userData.lit) continue;
        m.userData.lit = true;
        if (/^(Signal|Identification)$/.test(m.name || '') && m.emissive) {
          m.emissive.copy(m.color).multiplyScalar(0.8); m.needsUpdate = true;
        }
      }
    });
    rifle.visible = P.showRifle;
    scene.add(rifle);
    if (P.showRifle) frameRifle();
    console.log(`SNIPER lancer t${P.tier}: yaw=${!!yawNode} pitch=${!!pitchNode}`
      + ` muzzle=${!!muzzleNode} recoil=${!!recoilNode}`);
  }, undefined, (e) => { hud.textContent = `lancer: failed to load (${e && e.message})`; });

  // A BLACK AND WHITE TARGET, because "it is unclear what we are shooting
  // at" (operator) — and because a calibration needs rings to read a group
  // against, not a silhouette. Built as concentric discs on one billboard,
  // in metres, so the mil-relation works on it exactly as it does on a
  // person: the black centre is `targetR` across and the outer ring is a
  // known width to mil from.
  // the face is FACE_R radii from the centre; the kill zone is one radius,
  // which is KILL_F of the face
  const FACE_R = 3, KILL_F = 1 / 3;
  function makeCalTarget(radius) {
    // ONE PLANE WITH A DRAWN TEXTURE, not five coplanar discs. The first cut
    // stacked circles 4 mm apart and let `lookAt` turn the stack: at 500 m
    // that offset is far below the depth buffer's resolution, so the rings
    // z-fought and the target rendered as a shattered star. A canvas has no
    // depth at all, draws sharper, and costs one quad.
    const S = 512;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, S, S);
    const mid = S / 2;
    // five rings, outermost first — a paper white and a near-black, both off
    // the extremes so the bloom pass leaves them alone
    // THE FACE IS NOT THE KILL ZONE. Sizing the whole target off the kill
    // radius made a 0.55 m radius into a 5.5 m board that had to stand three
    // metres up to clear its own bottom edge — a billboard, not a range
    // target. The face is a fixed 6 radii across and the innermost ring IS
    // the kill zone, so `hitsAt(miss, targetR)` still scores what you see.
    const RINGS = [[1.0, '#b9b9b4'], [0.78, '#0e0e10'], [0.56, '#b9b9b4'],
      [KILL_F * 1.6, '#0e0e10'], [KILL_F, '#b9b9b4']];
    for (const [f, col] of RINGS) {
      c.fillStyle = col;
      c.beginPath();
      c.arc(mid, mid, mid * f * 0.98, 0, Math.PI * 2);
      c.fill();
    }
    // the aiming cross, so the centre is findable at 800 m where the inner
    // disc is two pixels across
    c.strokeStyle = '#ff3b30';
    c.lineWidth = Math.max(2, S * 0.012);
    c.beginPath();
    c.moveTo(mid, mid - S * 0.42); c.lineTo(mid, mid + S * 0.42);
    c.moveTo(mid - S * 0.42, mid); c.lineTo(mid + S * 0.42, mid);
    c.stroke();
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.colorSpace = THREE.SRGBColorSpace;
    const side = radius * FACE_R * 2;
    const g = new THREE.Group();
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(side, side),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    g.add(face);
    // ...and a stand, so it is a thing standing on the ground rather than a
    // disc hovering over it — which is also what stops the bottom half being
    // buried when the centre sits lower than the radius
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(side * 0.06, side * 0.5, side * 0.06),
      new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.95 }));
    stand.position.y = -side * 0.5;
    g.add(stand);
    g.userData.plate = g;
    g.userData.face = face;
    return g;
  }

  // --- the range -----------------------------------------------------------
  function clearTargets() {
    while (targets.length) { const t = targets.pop(); scene.remove(t.obj); disposeObj(t.obj); }
  }
  function spawnTargets() {
    clearTargets();
    rng = mulberry32(P.seed >>> 0);
    string.length = 0;
    if (P.phase === 'calibrate') {
      // ONE target, dead ahead, at a known distance. A calibration is not a
      // hunt: the range is given, the conditions are given, and the only
      // question is whether you can read them.
      const d = P.range;
      const obj = makeCalTarget(P.targetR);
      // its centre sits one full radius up plus the stand, so the whole face
      // is above the ground rather than half-buried
      // chest height on its stand, near the optic's own line, so a
      // calibration starts with the target ON the cross rather than above it
      const cy = Math.max(1.6, P.targetR * FACE_R + 0.15);
      obj.position.set(0, cy, d);
      scene.add(obj);
      targets.push({ id: 1, obj, pos: [0, cy, d], alive: true, d, cal: true });
      hudNote = `CALIBRATION · ${Math.round(P.allotted)} shots at ${d.toFixed(0)} m`;
      return;
    }
    for (let i = 0; i < Math.round(P.targets); i++) {
      const d = P.range + (rng() * 2 - 1) * P.spread;
      const off = (rng() * 2 - 1) * 22;
      const pos = [Math.sin(off / MRAD) * d, 0, Math.cos(off / MRAD) * d];
      const type = TARGET_TYPES[i % TARGET_TYPES.length];
      // the creature, PLUS a post it stands on. At 800 m a dot cloud is a
      // handful of pixels with sky behind it; the post gives it a silhouette
      // to be seen against and a base to mil FROM.
      const grp = new THREE.Group();
      const obj = makeDotEnemy(type, { walker: CREATURE_TINTS[type], walkerHi: accentFor(type) });
      obj.scale.setScalar(TARGET_H * 0.5);
      obj.position.y = TARGET_H * 0.5;
      grp.add(obj);
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, TARGET_H, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.9 }));
      post.position.y = TARGET_H * 0.5;
      grp.add(post);
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.9),
        new THREE.MeshBasicMaterial({ color: 0xd8c9a8, side: THREE.DoubleSide }));
      plate.position.y = TARGET_H * 0.78;
      grp.add(plate);
      grp.position.set(pos[0], 0, pos[2]);
      grp.userData.plate = plate;
      scene.add(grp);
      // PHASE 2: THEY MOVE. A crossing target is what the time of flight is
      // FOR — at 800 m a round is in the air 1.7 s, and a walker covers five
      // metres in that. The calibration taught the drop; this asks for lead.
      targets.push({ id: i + 1, obj: grp, pos: [pos[0], TARGET_H * 0.78, pos[2]],
        alive: true, d, vx: (rng() < 0.5 ? -1 : 1) * P.moverSpeed * (0.7 + rng() * 0.6) });
    }
    hudNote = `CONTACT · ${targets.length} moving`;
  }

  // The target under the reticle, and how far away it is — the rangefinder's
  // job, done the same way whether a chip prints it or the player mils it.
  function underReticle() {
    let best = null, bd = Infinity;
    for (const t of targets) {
      if (!t.alive) continue;
      const dx = t.pos[0], dz = t.pos[2];
      // measured from the OPTIC's height, not from the ground: a target
      // whose centre is level with the scope is at zero elevation, and the
      // ground-relative version put a 500 m target 12.7 mrad off the cross it
      // was sitting on
      const bearing = Math.atan2(dx, dz);
      const elev = Math.atan2(t.pos[1] - camera.position.y, Math.hypot(dx, dz));
      const off = Math.hypot(bearing - aimYaw, elev - aimPitch) * MRAD;
      if (off < 12 && off < bd) { bd = off; best = t; }
    }
    return best ? { t: best, off: bd, range: Math.hypot(best.pos[0], best.pos[2]) } : null;
  }

  // --- the shot ------------------------------------------------------------
  // The round leaves along the SHOOTER'S aim plus the dialled hold plus the
  // sway — and then it is the integrator's, not the renderer's. Every frame
  // it is stepped by the same function the HUD's solution used.
  function fire() {
    if (stringDone()) {
      const g = group();
      hudNote = `STRING SPENT — ${g.n} shots · dial ${(-g.my).toFixed(2)} up, ${(-g.mx).toFixed(2)} right`
        + ` · group ${(g.ext * 100).toFixed(0)} cm. [reset] for another, or go to CONTACT.`;
      return;
    }
    const sw = sway(clock, shooter, P);
    const yaw = aimYaw + holdSide / MRAD + sw[0] / MRAD;
    const pitch = aimPitch + holdUp / MRAD + sw[1] / MRAD + zeroAngle(P.zero, P);
    const s = launch(0, 0, P, clock);
    // re-aim the launch into world space: the module fires down +Z, the range
    // is a world with a bearing
    const v = P.muzzleVel;
    s.v = [
      Math.sin(yaw) * Math.cos(pitch) * v,
      Math.sin(pitch) * v,
      Math.cos(yaw) * Math.cos(pitch) * v,
    ];
    s.p = [0, muzzleHeight(), 0];
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xfff0c0 }));
    mesh.visible = P.tracer;
    scene.add(mesh);
    rounds.push({ s, mesh, trail: [] });
    // THE MAIN SHELL'S OWN RECOIL AND VOICE (operator). `tank_main` is the
    // board's cannon — the same sample, at full presence, because this IS
    // that gun with a scope on it. The kick is the board's shape too: a hard
    // impulse that eases out, not a constant offset, so the glass jumps and
    // settles rather than sitting displaced.
    if (P.sound) sfx.play('tank_main');
    // ...and say ONCE what the audio context actually did. A browser will not
    // start one without a gesture, so "no sound" has two very different
    // causes — not armed, or armed and still suspended because nothing has
    // been tapped yet — and they are indistinguishable from the outside.
    if (!saidAudio) {
      saidAudio = true;
      console.log(`SNIPER audio: ctx=${sfx.contextState} ready=${sfx.ready}`
        + `${P.sound ? '' : ' (gun sound is OFF in the panel)'}`);
    }
    recoil = RECOIL_KICK;
    shooter.shots++;
    lastShot = { yaw, pitch, at: clock };
    // the muzzle flash, in the game's own dots
    const f = makeDotBurst(0xffe6a8, [0, 0, 1], 14);
    f.scale.setScalar(0.5);
    f.position.set(0, muzzleHeight(), 1.2);
    scene.add(f);
    fx.push({ obj: f, tick: f.userData.tick });
  }

  const muzzleHeight = () => {
    if (!muzzleNode) return 1.5;
    muzzleNode.updateWorldMatrix(true, false);
    muzzleNode.getWorldPosition(tmpV);
    return tmpV.y;
  };

  function stepRounds(dt) {
    for (let i = rounds.length - 1; i >= 0; i--) {
      const r = rounds[i];
      // the SAME integrator the solution used — sub-stepped so a 60 Hz frame
      // does not fly the round through a target
      let n = Math.ceil(dt / STEP);
      n = Math.min(n, 40);
      for (let k = 0; k < n; k++) {
        const before = r.s.p.slice();
        step(r.s, dt / n, P, r.s.wind);
        // did it pass a target between the two positions?
        for (const t of targets) {
          if (!t.alive) continue;
          const d0 = before[2], d1 = r.s.p[2], tz = t.pos[2];
          if (!(d0 <= tz && d1 >= tz)) continue;
          const f = (tz - d0) / Math.max(1e-9, d1 - d0);
          const x = before[0] + (r.s.p[0] - before[0]) * f;
          const y = before[1] + (r.s.p[1] - before[1]) * f;
          const miss = Math.hypot(x - t.pos[0], y - t.pos[1]);
          // EVERY SHOT IS RECORDED, hit or miss — a calibration is about the
          // GROUP, and a string that only remembers its hits cannot tell you
          // that all five went two mils low together.
          if (t.cal || P.phase === 'calibrate') {
            const rng2 = Math.hypot(t.pos[0], t.pos[2]);
            string.push({ dx: x - t.pos[0], dy: y - t.pos[1], range: rng2,
              mradX: toMrad(x - t.pos[0], rng2), mradY: toMrad(y - t.pos[1], rng2) });
          }
          if (hitsAt(miss, P.targetR)) {
            t.alive = false;
            shooter.hits++;
            shooter.best = Math.min(shooter.best, miss);
            const b = makeDotBurst(0xffb45e, [0, 1, 0], 30);
            b.scale.setScalar(1.2);
            b.position.set(t.pos[0], t.pos[1], t.pos[2]);
            scene.add(b); fx.push({ obj: b, tick: b.userData.tick });
            scene.remove(t.obj);
            hudNote = `HIT ${t.id} at ${Math.hypot(t.pos[0], t.pos[2]).toFixed(0)} m · ${(miss * 100).toFixed(0)} cm off centre`;
            // the calibration target stands back up: a string is five shots
            // at ONE target, not five targets
            if (t.cal) t.alive = true;
          } else if (miss < P.targetR * 6) {
            hudNote = `MISS by ${(miss * 100).toFixed(0)} cm at ${Math.hypot(t.pos[0], t.pos[2]).toFixed(0)} m`;
          }
        }
      }
      r.mesh.position.set(r.s.p[0], r.s.p[1], r.s.p[2]);
      r.mesh.visible = P.tracer;
      if (r.s.p[1] < 0 || r.s.t > MAX_T || r.s.p[2] > GROUND) {
        if (r.s.p[1] < 0 && r.s.p[2] < GROUND) {
          const b = makeDotBurst(0x9a8b6a, [0, 1, 0], 16);
          b.scale.setScalar(0.9);
          b.position.set(r.s.p[0], 0.05, r.s.p[2]);
          scene.add(b); fx.push({ obj: b, tick: b.userData.tick });
          if (!hudNote.startsWith('HIT')) hudNote = `SHORT — struck the ground at ${r.s.p[2].toFixed(0)} m`;
        }
        scene.remove(r.mesh); disposeObj(r.mesh);
        rounds.splice(i, 1);
      }
    }
  }
  let hudNote = 'take a shot';

  // THE GROUP. Mean point of impact and spread — the two numbers a
  // calibration exists to produce. The correction is the NEGATIVE of the
  // mean, in milliradians, which is what a shooter dials; the spread is what
  // they cannot dial away and is therefore the honest score.
  function group() {
    if (!string.length) return null;
    const n = string.length;
    const mx = string.reduce((a, s2) => a + s2.mradX, 0) / n;
    const my = string.reduce((a, s2) => a + s2.mradY, 0) / n;
    let ext = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        ext = Math.max(ext, Math.hypot(string[i].dx - string[j].dx, string[i].dy - string[j].dy));
      }
    }
    return { n, mx, my, ext, range: string[0].range };
  }

  // A string is over when the allotment is spent. It does not advance the
  // phase by itself — reading your own group is the point, and a range that
  // moves on while you are looking at it has taken the lesson away.
  function stringDone() {
    return P.phase === 'calibrate' && string.length >= Math.round(P.allotted);
  }

  // --- aiming --------------------------------------------------------------
  // Drag to traverse, at a rate scaled by the MAGNIFICATION: a 20x scope must
  // move half as fast per pixel as a 10x one, or the aim is unusable at the
  // zoom that needs it most.
  let drag = null;
  container.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest && ev.target.closest('button')) return;
    drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
    container.setPointerCapture(ev.pointerId);
  });
  container.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const k = (camera.fov * Math.PI / 180) / Math.max(1, container.clientHeight);
    aimYaw -= (ev.clientX - drag.x) * k;
    aimPitch += (ev.clientY - drag.y) * k;
    aimPitch = Math.max(-0.05, Math.min(0.25, aimPitch));
    drag.x = ev.clientX; drag.y = ev.clientY;
  });
  for (const e of ['pointerup', 'pointercancel']) {
    container.addEventListener(e, () => { drag = null; });
  }
  const keys = { hold: false };
  addEventListener('keydown', (ev) => {
    if (!active) return;
    const k = ev.key.toLowerCase();
    if (k === 'shift') keys.hold = true;
    if (k === ' ' || k === 'spacebar') { fire(); ev.preventDefault(); }
    if (k === 'r') { spawnTargets(); shooter.shots = 0; shooter.hits = 0; }
    // the hold, dialled by hand — the manual half of the firing solution
    if (k === 'arrowup') holdUp += 0.25;
    if (k === 'arrowdown') holdUp -= 0.25;
    if (k === 'arrowleft') holdSide -= 0.25;
    if (k === 'arrowright') holdSide += 0.25;
  });
  addEventListener('keyup', (ev) => { if (ev.key.toLowerCase() === 'shift') keys.hold = false; });

  // --- the reticle ---------------------------------------------------------
  // Drawn in CSS pixels from MILLIRADIANS, so a mil dot is a mil dot at any
  // magnification and the player can range with it.
  function paintReticle() {
    if (!reticleEl) return;
    const h = container.clientHeight || 1;
    const pxPerMrad = h / ((camera.fov * Math.PI / 180) * MRAD);
    const sw = sway(clock, shooter, P);
    const cx = (container.clientWidth || 1) / 2 - sw[0] * pxPerMrad;
    const cy = h / 2 + sw[1] * pxPerMrad;
    const parts = [];
    const line = (x1, y1, x2, y2, o) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#cfe8ff" stroke-width="1" opacity="${o}"/>`;
    parts.push(line(cx - 220, cy, cx - 8, cy, 0.55), line(cx + 8, cy, cx + 220, cy, 0.55));
    parts.push(line(cx, cy - 220, cx, cy - 8, 0.55), line(cx, cy + 8, cx, cy + 220, 0.55));
    // mil dots below the cross, which is where a holdover is read
    for (let m = 1; m <= 12; m++) {
      const y = cy + m * pxPerMrad;
      const w = m % 5 === 0 ? 9 : 4;
      parts.push(line(cx - w, y, cx + w, y, m % 5 === 0 ? 0.8 : 0.45));
      const x = cx + m * pxPerMrad;
      parts.push(line(x, cy - w, x, cy + w, m % 5 === 0 ? 0.7 : 0.35));
      const x2 = cx - m * pxPerMrad;
      parts.push(line(x2, cy - w, x2, cy + w, m % 5 === 0 ? 0.7 : 0.35));
    }
    // the DIALLED hold — where the round is actually going
    const hx = cx + holdSide * pxPerMrad, hy = cy - holdUp * pxPerMrad;
    parts.push(`<circle cx="${hx}" cy="${hy}" r="4" fill="none" stroke="#ffb45e" stroke-width="1.5" opacity="0.95"/>`);
    // ...and, if the chip is printed, where it SHOULD go
    const u = underReticle();
    if (P.firingSolution && u) {
      const sol = solution(u.range, P, clock);
      if (sol.reached) {
        const sx = cx + sol.holdSide * pxPerMrad, sy = cy - sol.holdUp * pxPerMrad;
        parts.push(`<circle cx="${sx}" cy="${sy}" r="8" fill="none" stroke="#66ff88" stroke-width="1.5" opacity="0.9"/>`);
        parts.push(line(sx - 12, sy, sx - 9, sy, 0.9), line(sx + 9, sy, sx + 12, sy, 0.9));
      }
    }
    reticleEl.innerHTML = `<svg width="100%" height="100%">${parts.join('')}</svg>`;
  }

  // THE FIRE-CONTROL READOUT. The panels are written FIELD BY FIELD rather
  // than rebuilt: this runs several times a second and an innerHTML churn is
  // how a HUD becomes the most expensive thing on the frame.
  const F = {};
  const f = (id) => (F[id] || (F[id] = root.querySelector('#' + id)));
  const put = (id, txt, hot = false) => {
    const el = f(id);
    if (!el) return;
    if (el.textContent !== txt) el.textContent = txt;
    if (el.classList) el.classList.toggle('hot', !!hot);
  };
  let chipsBuilt = '';
  function hudLine() {
    const g0 = group();
    const u = underReticle();
    const w = windAt(clock, P);
    const wSpeed = Math.hypot(w[0], w[2]);
    const sol = u ? solution(u.range, P, clock) : null;
    const cal = P.phase === 'calibrate';

    put('fcs-phase', cal ? `PHASE 1 · CALIBRATE` : `PHASE 2 · CONTACT`);
    put('fcs-bearing', `${((aimYaw * 180 / Math.PI + 360) % 360).toFixed(0).padStart(3, '0')}`);

    // SCOPE
    put('f-zero', `${P.zero} m`);
    put('f-mag', `${P.mag}x`);
    put('f-holdup', `${holdUp >= 0 ? '+' : ''}${holdUp.toFixed(2)} mrad`, Math.abs(holdUp) > 0.001);
    put('f-holdside', `${holdSide >= 0 ? '+' : ''}${holdSide.toFixed(2)} mrad`, Math.abs(holdSide) > 0.001);
    put('f-breath', shooter.holding ? 'HELD' : `${Math.round(shooter.breath * 100)}%`, shooter.holding);
    const bar = f('f-breathbar');
    if (bar) {
      bar.style.width = `${Math.round(shooter.breath * 100)}%`;
      bar.style.background = shooter.holding ? '#ffb43d' : '#5fe6d6';
    }

    // TRACK — what is under the cross. The RANGE is the rangefinder chip's
    // to print; without it the player gets the SUBTENSE and mils it himself,
    // which is the manual half of the same job.
    put('f-trackid', u ? `TGT-${String(u.t.id).padStart(2, '0')}` : '— — —');
    put('f-range', u ? (P.rangefinder ? `${u.range.toFixed(0)} m` : 'MIL IT') : '—',
      !!u && P.rangefinder);
    put('f-bearing', u ? `${((Math.atan2(u.t.pos[0], u.t.pos[2]) * 180 / Math.PI + 360) % 360).toFixed(1)}°` : '—');
    put('f-cross', u && u.t.vx ? `${Math.abs(u.t.vx).toFixed(1)} m/s ${u.t.vx > 0 ? 'R' : 'L'}` : 'static');
    put('f-subtense', u ? `${toMrad(TARGET_H, u.range).toFixed(2)} mrad` : '—');

    // BALLISTICS — the solution, if the chip is printed
    const show = sol && sol.reached && P.firingSolution;
    put('f-drop', show ? `${sol.drop.toFixed(2)} m` : (sol && sol.reached ? '— — —' : '—'));
    put('f-drift', show ? `${sol.drift.toFixed(2)} m` : (sol && sol.reached ? '— — —' : '—'));
    put('f-flight', sol && sol.reached ? `${sol.time.toFixed(2)} s` : '—');
    put('f-wind', P.windRead ? `${wSpeed.toFixed(1)} m/s ${P.windDir}°` : 'READ THE DUST',
      P.windRead && wSpeed > P.wind);

    // ACQUISITION
    const spent = stringDone();
    put('f-acq', cal ? (spent ? 'STRING SPENT' : 'CALIBRATING') : (u ? 'TRACKING' : 'SEARCHING'),
      cal ? spent : !!u);
    put('f-string', cal ? `${string.length} / ${Math.round(P.allotted)}` : `${shooter.shots} fired · ${shooter.hits} hit`);
    put('f-group', g0 ? `${(g0.ext * 100).toFixed(0)} cm` : '—', !!g0);
    put('f-corr', g0 ? `${(-g0.my).toFixed(2)} up · ${(-g0.mx).toFixed(2)} right` : '—', !!g0);

    // THE CHIPS. The assist ladder as status lights — which is what it is:
    // four things Isao has or has not printed yet.
    const chips = [['RNG', P.rangefinder], ['WIND', P.windRead],
      ['SOLN', P.firingSolution], ['AUTO', P.autoHold]];
    const key = chips.map(([n, on]) => `${n}${on ? 1 : 0}`).join();
    if (key !== chipsBuilt) {
      chipsBuilt = key;
      const el = f('f-chips');
      if (el) el.innerHTML = chips.map(([n, on]) => `<span class="chip${on ? ' on' : ''}">${n}</span>`).join('');
    }

    const note = f('f-note');
    if (note) {
      if (note.textContent !== hudNote) note.textContent = hudNote;
      note.classList.toggle('hit', hudNote.startsWith('HIT'));
      note.classList.toggle('miss', hudNote.startsWith('MISS') || hudNote.startsWith('SHORT'));
    }
  }

  // --- the panel -----------------------------------------------------------
  const gui = new GUI({ title: 'SNIPER', container: root });
  gui.add(P, 'mag', 4, 25, 1).name('magnification').onChange(() => { camera.fov = 60 / P.mag; camera.updateProjectionMatrix(); });
  gui.add(P, 'zero', 50, 1500, 10).name('zero (m)');
  gui.add(P, 'showRifle').name('inspect the rig').onChange((v) => {
    if (rifle) rifle.visible = v;
    if (v) frameRifle(); else camera.fov = 60 / P.mag;
    camera.updateProjectionMatrix();
  });
  const ga = gui.addFolder('assist — Isao’s chips');
  ga.add(P, 'rangefinder').name('rangefinder');
  ga.add(P, 'windRead').name('wind readout');
  ga.add(P, 'firingSolution').name('firing solution');
  ga.add(P, 'autoHold').name('auto-dial the hold');
  const gr2 = gui.addFolder('the round');
  gr2.add(P, 'muzzleVel', 120, 1400, 10).name('muzzle velocity');
  gr2.add(P, 'gravity', 0, 30, 0.1).name('gravity');
  gr2.add(P, 'drag', 0, 0.01, 0.0001).name('drag');
  const gw = gui.addFolder('alien wind');
  gw.add(P, 'wind', 0, 40, 0.5).name('speed (m/s)');
  gw.add(P, 'windDir', 0, 359, 1).name('from (deg)');
  gw.add(P, 'gust', 0, 1.5, 0.05).name('gust ±');
  gw.add(P, 'gustPeriod', 1, 30, 0.5).name('gust period');
  const gs = gui.addFolder('sway');
  gs.add(P, 'swayFast', 0, 6, 0.05).name('fast (mrad)');
  gs.add(P, 'swaySlow', 0, 8, 0.05).name('slow (mrad)');
  gs.add(P, 'hold', 0, 1, 0.02).name('held-breath ×');
  gs.add(P, 'holdSecs', 1, 20, 0.5).name('breath (s)');
  const gp = gui.addFolder('phase');
  gp.add(P, 'phase', ['calibrate', 'contact']).name('phase').onChange(() => {
    spawnTargets(); shooter.shots = 0; shooter.hits = 0; shooter.best = Infinity;
  });
  gp.add(P, 'allotted', 3, 20, 1).name('shots in a string');
  gp.add(P, 'moverSpeed', 0, 12, 0.2).name('crossing speed (m/s)');
  gp.add(P, 'sound').name('gun sound');

  const gt = gui.addFolder('the range');
  gt.add(P, 'range', 100, 1800, 10).name('distance').onChange(spawnTargets);
  gt.add(P, 'spread', 0, 800, 10).name('± spread').onChange(spawnTargets);
  gt.add(P, 'targets', 1, 8, 1).name('targets').onChange(spawnTargets);
  gt.add(P, 'targetR', 0.1, 3, 0.05).name('kill radius (m)');
  gt.add(P, 'seed', 1, 9999, 1).onChange(spawnTargets);
  gt.add({ again: () => { spawnTargets(); shooter.shots = 0; shooter.hits = 0; shooter.best = Infinity; } }, 'again').name('reset the range');
  gui.add(P, 'tracer').name('show the tracer');
  gui.add(P, 'closeup').name('spotting monitor');
  gui.add(P, 'scan').name('scan');

  wireDeepLink(root.querySelector('#sniper-link'), () => deepLink({
    base: location.origin + location.pathname, hash: 'sniper',
    params: P, defaults: P0, carry: location.search,
  }), { label: 'SNIPER', flash: (m) => { hudNote = m; } });

  const gear = root.querySelector('#sniper-gear');
  if (gear) gear.addEventListener('click', () => root.classList.toggle('panel-hidden'));
  const fireBtn = root.querySelector('#sniper-fire');
  if (fireBtn) fireBtn.addEventListener('click', () => fire());
  const breathBtn = root.querySelector('#sniper-breath');
  if (breathBtn) {
    for (const e of ['pointerdown']) breathBtn.addEventListener(e, () => { keys.hold = true; });
    for (const e of ['pointerup', 'pointerleave', 'pointercancel']) breathBtn.addEventListener(e, () => { keys.hold = false; });
  }
  if (matchMedia('(pointer: coarse)').matches || q.get('mobile') === '1' || innerWidth <= 700) {
    root.classList.add('panel-hidden');
  }

  // INSPECTING THE RIG IS A DIFFERENT CAMERA, not the scope with a mesh in
  // front of it. The optic sits INSIDE the receiver — that is where an optic
  // goes — so drawing the rifle from there fills the frame with grey metal
  // and shows nothing. This backs off and widens out to look at the thing.
  function frameRifle() {
    camera.fov = 38;
    camera.updateProjectionMatrix();
  }

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    postfx.setSize(w, h);
  }
  addEventListener('resize', resize);

  camera.fov = 60 / P.mag;
  camera.updateProjectionMatrix();
  spawnTargets();

  // --- the spotting monitor -------------------------------------------------
  // A SECOND RENDER of the same scene through a long lens, scissored into a
  // corner box. One renderer, one scene — a second WebGL context for a
  // 250 px inset would cost more than the whole range does.
  const closeCam = new THREE.PerspectiveCamera(1, 1, 0.5, 4000);
  const cuBox = root.querySelector('#f-closeup');
  function renderCloseup() {
    if (!cuBox) return;
    const t = (underReticle() || {}).t || targets.find((x) => x.alive);
    const on = P.closeup && !P.showRifle && !!t;
    cuBox.style.display = on ? '' : 'none';
    if (!on) return;
    const r = cuBox.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    const x = r.left - cr.left, yTop = r.top - cr.top;
    const W = container.clientWidth || 1, H = container.clientHeight || 1;
    const d = Math.hypot(t.pos[0] - camera.position.x, t.pos[1] - camera.position.y,
      t.pos[2] - camera.position.z);
    // frame the target at about a third of the box, whatever the range —
    // the point of a spotting scope is that it is the same size every time
    const span = (t.cal ? P.targetR * FACE_R * 2 : TARGET_H) * 3;
    closeCam.fov = Math.max(0.08, (2 * Math.atan(span / (2 * d)) * 180) / Math.PI);
    closeCam.aspect = r.width / r.height;
    closeCam.position.copy(camera.position);
    closeCam.lookAt(t.pos[0], t.pos[1], t.pos[2]);
    closeCam.updateProjectionMatrix();
    const dpr = renderer.getPixelRatio();
    renderer.setRenderTarget(null);
    renderer.autoClear = false;
    renderer.setScissorTest(true);
    // the viewport's y is measured from the BOTTOM of the drawing buffer
    const vy = (H - yTop - r.height) * dpr;
    renderer.setViewport(x * dpr, vy, r.width * dpr, r.height * dpr);
    renderer.setScissor(x * dpr, vy, r.width * dpr, r.height * dpr);
    renderer.clear(true, true, false);
    renderer.render(scene, closeCam);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W * dpr, H * dpr);
    renderer.autoClear = true;
  }

  // --- the scan -------------------------------------------------------------
  // The board's own PPI idiom, on a flat range: a rotating beam, contacts
  // that flare as it passes and decay behind it. `sweepAngle` and
  // `radarPhosphor` come from radar.js — the tested half — while the
  // projection is plain bearing-and-range, because radar.js projects onto a
  // SPHERE's tangent plane and this range is a field.
  const scanCv = root.querySelector('#f-radar');
  const scanCtx = scanCv ? scanCv.getContext('2d') : null;
  const scanBox = root.querySelector('#f-radarbox');
  function drawScan() {
    if (!scanCtx || !scanBox) return;
    if (!P.scan || P.showRifle) { scanBox.style.display = 'none'; return; }
    scanBox.style.display = '';
    const m = scanCv.width, cx = m / 2, cy = m / 2, R = m / 2 - 4;
    const range = Math.max(200, P.range + P.spread + 200);
    const ctx = scanCtx;
    ctx.clearRect(0, 0, m, m);
    ctx.fillStyle = '#03100a';
    ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(95,230,214,0.18)'; ctx.lineWidth = 1;
    for (const f of [1 / 3, 2 / 3, 1]) { ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    // the optic's own field of view, as a wedge — so the scan says where you
    // are looking as well as what is out there
    const half = (camera.fov * Math.PI / 180) * (camera.aspect || 1.6) / 2;
    ctx.fillStyle = 'rgba(95,230,214,0.10)';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, -Math.PI / 2 + aimYaw - half, -Math.PI / 2 + aimYaw + half);
    ctx.closePath(); ctx.fill();
    const sweep = sweepAngle(clock);
    const phi = sweep - Math.PI / 2;
    const grad = ctx.createConicGradient(phi, cx, cy);
    grad.addColorStop(0, 'rgba(95,230,214,0)');
    grad.addColorStop(0.72, 'rgba(95,230,214,0)');
    grad.addColorStop(1, 'rgba(95,230,214,0.26)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(150,255,225,0.8)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.sin(sweep), cy - R * Math.cos(sweep)); ctx.stroke();
    // CONTACTS. The calibration target in blue, as asked; the movers take the
    // alarm colour, and enemies later will simply join them.
    for (const t of targets) {
      if (!t.alive) continue;
      const d = Math.hypot(t.pos[0], t.pos[2]) / range;
      const b = Math.atan2(t.pos[0], t.pos[2]);
      const bx = cx + Math.sin(b) * R * Math.min(1, d);
      const by = cy - Math.cos(b) * R * Math.min(1, d);
      ctx.globalAlpha = radarPhosphor(b, sweep);
      ctx.fillStyle = t.cal ? '#5ab7ff' : '#ff8a5c';
      const sz = t.cal ? 5 : 4;
      ctx.fillRect(bx - sz / 2, by - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
    }
    // YOU, at the centre, facing up the scope's own bearing
    ctx.fillStyle = '#e8f4f2';
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(aimYaw) * 7, cy - Math.cos(aimYaw) * 7);
    ctx.lineTo(cx + Math.sin(aimYaw + 2.5) * 5, cy - Math.cos(aimYaw + 2.5) * 5);
    ctx.lineTo(cx + Math.sin(aimYaw - 2.5) * 5, cy - Math.cos(aimYaw - 2.5) * 5);
    ctx.closePath(); ctx.fill();
  }

  const clockT = new THREE.Clock();
  let hudT = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!active) return;
    const dt = Math.min(0.05, clockT.getDelta());
    clock += dt;
    stepBreath(shooter, dt, keys.hold, P);
    recoil = Math.max(0, recoil - dt * (RECOIL_KICK / RECOIL_COOL));
    // THE CHIP THAT DIALS FOR YOU. Deliberately the LAST rung: it is the one
    // that stops the player doing the interesting part, so it exists to be
    // switched off again.
    if (P.autoHold) {
      const u = underReticle();
      if (u) {
        const sol = solution(u.range, P, clock);
        if (sol.reached) { holdUp = sol.holdUp; holdSide = sol.holdSide; }
      }
    }
    const sw = sway(clock, shooter, P);
    // the scope rides the rifle: aim + sway + recoil
    if (reticleEl) reticleEl.style.display = P.showRifle ? 'none' : '';
    camera.position.set(0, muzzleHeight(), 0);
    // the kick is in MILLIRADIANS of glass, so it reads the same at 4x and
    // at 25x — a recoil expressed in world angle is invisible zoomed out and
    // unusable zoomed in
    const kick = recoil * 26;
    // A CAMERA LOOKS DOWN ITS OWN -Z. Everything else here — the ballistics
    // module, the rifle model, the targets — is built on +Z forward, which is
    // this project's own written rule and the workshop's stated convention.
    // Without the half turn the scope points at the empty half of the range
    // and nothing is ever visible: the target logged as present, in frame and
    // 84 px across, and could not be seen.
    //
    // With rotation.y = PI + yaw the camera's forward is (sin yaw, 0, cos
    // yaw), which is exactly the module's convention, so no other sign
    // changes anywhere.
    camera.rotation.set(
      aimPitch + (sw[1] + kick) / MRAD,
      Math.PI + aimYaw + (sw[0] + kick * 0.22) / MRAD, 0, 'YXZ');
    if (yawNode) yawNode.rotation.y = aimYaw;
    if (pitchNode) pitchNode.rotation.x = -(aimPitch + zeroAngle(P.zero, P));
    if (recoilNode) recoilNode.position.z = -recoil;
    // INSPECT IS ITS OWN CAMERA — and it runs AFTER the pivots, so the rig
    // articulates while you look at it. Backing the eye off but keeping the
    // AIM rotation just looks over the top of the thing; the eye has to be
    // pointed AT it, which is a lookAt and not an aim.
    if (P.showRifle) {
      const t2 = clock * 0.35;
      camera.position.set(Math.sin(t2) * 3.4, muzzleHeight() + 1.15, Math.cos(t2) * 3.4 - 0.4);
      camera.lookAt(0, muzzleHeight() * 0.7, 0.3);
    }
    stepRounds(dt);
    for (let i = fx.length - 1; i >= 0; i--) {
      if (!fx[i].tick(dt)) { scene.remove(fx[i].obj); disposeObj(fx[i].obj); fx.splice(i, 1); }
    }
    // PHASE 2: THEY CROSS. Straight across the line of sight, turning round
    // at the edge of the lane — a crossing target is what the time of flight
    // is for, and at 800 m a 1.7 s flight is five metres of lead.
    for (const t of targets) {
      if (!t.alive) continue;
      if (t.vx) {
        t.pos[0] += t.vx * dt;
        const lane = Math.max(40, t.d * 0.05);
        if (Math.abs(t.pos[0]) > lane) { t.pos[0] = Math.sign(t.pos[0]) * lane; t.vx = -t.vx; }
        t.obj.position.x = t.pos[0];
      }
      if (t.obj.userData.plate) t.obj.userData.plate.lookAt(camera.position);
      if (t.obj.userData.tick) t.obj.userData.tick(clock + t.id);
    }
    paintReticle();
    postfx.render();
    renderCloseup();
    drawScan();
    hudT += dt; if (hudT > 0.15) { hudT = 0; hudLine(); }
  }
  animate();

  // ?sniperprobe=1 — the shot, in numbers. A sniper mechanic is a claim that
  // the HUD's solution and the bullet agree; this fires with the solution
  // dialled and reports where the round actually landed.
  if (q.get('sniperprobe') === '1') {
    setTimeout(() => {
      const t = targets[0];
      if (!t) { console.log('SNIPERPROBE no targets'); return; }
      const range = Math.hypot(t.pos[0], t.pos[2]);
      aimYaw = Math.atan2(t.pos[0], t.pos[2]);
      aimPitch = Math.atan2(t.pos[1] - muzzleHeight(), Math.hypot(t.pos[0], t.pos[2]));
      const sol = solution(range, P, clock);
      console.log(`SNIPERPROBE target ${range.toFixed(0)} m · solution ${sol.holdUp.toFixed(2)} up`
        + ` ${sol.holdSide.toFixed(2)} right · ${sol.time.toFixed(2)} s`
        + ` · drop ${sol.drop.toFixed(2)} m drift ${sol.drift.toFixed(2)} m`);
      // fire it three ways: no hold, the dialled hold, and the chip's
      const runs = [['no hold', 0, 0], ['solution', sol.holdUp, sol.holdSide]];
      const wasPhase = P.phase;
      for (const [tag, hu, hs] of runs) {
        holdUp = hu; holdSide = hs;
        const before = shooter.hits;
        // a still shooter, so the probe measures the PHYSICS and not the sway
        const keep = [P.swayFast, P.swaySlow];
        P.swayFast = 0; P.swaySlow = 0;
        fire();
        for (let k = 0; k < 900 && rounds.length; k++) stepRounds(0.01);
        P.swayFast = keep[0]; P.swaySlow = keep[1];
        console.log(`SNIPERPROBE ${tag}: ${shooter.hits > before ? 'HIT' : 'miss'} — ${hudNote}`);
        t.alive = true;   // stand it back up for the next run
      }
      // ...and the CALIBRATION STRING, which is what phase 1 is for: fire the
      // allotment with the solution dialled and report the group the shooter
      // would read off the card.
      if (wasPhase === 'calibrate') {
        string.length = 0;
        holdUp = sol.holdUp; holdSide = sol.holdSide;
        // A PHYSICS PROBE, NOT A SKILL PROBE: the sway is off, and the clock
        // ADVANCES between shots. What is left in the group is therefore the
        // GUST and nothing else — which is the number worth knowing, because
        // it is the part of the spread no amount of dialling can remove.
        const keepSway = [P.swayFast, P.swaySlow];
        P.swayFast = 0; P.swaySlow = 0;
        for (let n = 0; n < Math.round(P.allotted); n++) {
          clock += 1.7;
          fire();
          for (let k = 0; k < 900 && rounds.length; k++) stepRounds(0.01);
          t.alive = true;
        }
        P.swayFast = keepSway[0]; P.swaySlow = keepSway[1];
        const g = group();
        console.log(`SNIPERPROBE string ${g ? `${g.n} shots · group ${(g.ext * 100).toFixed(0)} cm`
          + ` · correction ${(-g.my).toFixed(2)} up ${(-g.mx).toFixed(2)} right` : 'NOTHING RECORDED'}`
          + ` · spent=${stringDone()}`);
      }
    }, 2500);
  }

  return { setActive(on) { active = on; if (on) { resize(); clockT.getDelta(); } } };
}
