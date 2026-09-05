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
import { deepLink, wireDeepLink } from './deeplink.js';
import { sentryUrl } from './sentry.js';
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
  const shooter = makeShooter();
  let aimYaw = 0, aimPitch = 0;      // where the SHOOTER is pointing, radians
  let holdUp = 0, holdSide = 0;      // ...and what they have dialled on, mrad
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
    scene.add(rifle);
    console.log(`SNIPER lancer t${P.tier}: yaw=${!!yawNode} pitch=${!!pitchNode}`
      + ` muzzle=${!!muzzleNode} recoil=${!!recoilNode}`);
  }, undefined, (e) => { hud.textContent = `lancer: failed to load (${e && e.message})`; });

  // --- the range -----------------------------------------------------------
  function clearTargets() {
    while (targets.length) { const t = targets.pop(); scene.remove(t.obj); disposeObj(t.obj); }
  }
  function spawnTargets() {
    clearTargets();
    rng = mulberry32(P.seed >>> 0);
    for (let i = 0; i < Math.round(P.targets); i++) {
      const d = P.range + (rng() * 2 - 1) * P.spread;
      // spread them across the glass, in MILLIRADIANS rather than metres, so
      // they are visibly apart at any distance instead of stacking up at the
      // far end
      const off = (rng() * 2 - 1) * 22;
      const pos = [Math.sin(off / MRAD) * d, 0, Math.cos(off / MRAD) * d];
      const type = TARGET_TYPES[i % TARGET_TYPES.length];
      // the creature, PLUS a post it stands on. At 800 m a dot cloud is a
      // handful of pixels with sky behind it; the post gives it a silhouette
      // to be seen against and a base to mil FROM, which is what makes the
      // rangefinder something a player can do by hand.
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
      const obj2 = grp;
      scene.add(obj2);
      targets.push({ id: i + 1, obj: obj2, pos: [pos[0], TARGET_H * 0.78, pos[2]], alive: true, d });
    }
  }

  // The target under the reticle, and how far away it is — the rangefinder's
  // job, done the same way whether a chip prints it or the player mils it.
  function underReticle() {
    let best = null, bd = Infinity;
    for (const t of targets) {
      if (!t.alive) continue;
      const dx = t.pos[0], dz = t.pos[2];
      const bearing = Math.atan2(dx, dz), elev = Math.atan2(t.pos[1], Math.hypot(dx, dz));
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
    recoil = 0.16;
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

  function hudLine() {
    const u = underReticle();
    const w = windAt(clock, P);
    const wSpeed = Math.hypot(w[0], w[2]);
    const rangeTxt = P.rangefinder
      ? (u ? `${u.range.toFixed(0)} m` : '— no return —')
      : (u ? `mil the target: ${toMrad(TARGET_H, u.range).toFixed(2)} mrad tall` : 'nothing under the cross');
    const sol = P.firingSolution && u ? solution(u.range, P, clock) : null;
    hud.textContent =
      `ZERO ${P.zero} m · ${P.mag}x · hold ${holdUp >= 0 ? '+' : ''}${holdUp.toFixed(2)} up / `
      + `${holdSide >= 0 ? '+' : ''}${holdSide.toFixed(2)} right (mrad)`
      + `\nRANGE ${rangeTxt}`
      + `${P.windRead ? ` · WIND ${wSpeed.toFixed(1)} m/s from ${P.windDir}°` : ' · wind: read the dust'}`
      + `${sol && sol.reached ? ` · SOLUTION ${sol.holdUp.toFixed(2)} up ${sol.holdSide.toFixed(2)} right · ${sol.time.toFixed(2)} s flight` : ''}`
      + `\nBREATH ${'|'.repeat(Math.round(shooter.breath * 12)).padEnd(12, '.')}${shooter.holding ? ' HELD' : ''}`
      + ` · ${shooter.shots} fired · ${shooter.hits} hit`
      + `${Number.isFinite(shooter.best) ? ` · best ${(shooter.best * 100).toFixed(0)} cm` : ''}`
      + `\n${hudNote}`;
  }

  // --- the panel -----------------------------------------------------------
  const gui = new GUI({ title: 'SNIPER', container: root });
  gui.add(P, 'mag', 4, 25, 1).name('magnification').onChange(() => { camera.fov = 60 / P.mag; camera.updateProjectionMatrix(); });
  gui.add(P, 'zero', 50, 1500, 10).name('zero (m)');
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
  const gt = gui.addFolder('the range');
  gt.add(P, 'range', 100, 1800, 10).name('distance').onChange(spawnTargets);
  gt.add(P, 'spread', 0, 800, 10).name('± spread').onChange(spawnTargets);
  gt.add(P, 'targets', 1, 8, 1).name('targets').onChange(spawnTargets);
  gt.add(P, 'targetR', 0.1, 3, 0.05).name('kill radius (m)');
  gt.add(P, 'seed', 1, 9999, 1).onChange(spawnTargets);
  gt.add({ again: () => { spawnTargets(); shooter.shots = 0; shooter.hits = 0; shooter.best = Infinity; } }, 'again').name('reset the range');
  gui.add(P, 'tracer').name('show the tracer');

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

  const clockT = new THREE.Clock();
  let hudT = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!active) return;
    const dt = Math.min(0.05, clockT.getDelta());
    clock += dt;
    stepBreath(shooter, dt, keys.hold, P);
    recoil = Math.max(0, recoil - dt * 0.45);
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
    camera.position.set(0, muzzleHeight(), 0);
    camera.rotation.set(
      aimPitch + (sw[1] + recoil * 9) / MRAD, aimYaw + sw[0] / MRAD, 0, 'YXZ');
    if (yawNode) yawNode.rotation.y = aimYaw;
    if (pitchNode) pitchNode.rotation.x = -(aimPitch + zeroAngle(P.zero, P));
    if (recoilNode) recoilNode.position.z = -recoil;
    stepRounds(dt);
    for (let i = fx.length - 1; i >= 0; i--) {
      if (!fx[i].tick(dt)) { scene.remove(fx[i].obj); disposeObj(fx[i].obj); fx.splice(i, 1); }
    }
    // the plates face the shooter, so a target is a readable rectangle to mil
    for (const t of targets) {
      if (!t.alive) continue;
      if (t.obj.userData.plate) t.obj.userData.plate.lookAt(camera.position);
    }
    paintReticle();
    postfx.render();
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
    }, 2500);
  }

  return { setActive(on) { active = on; if (on) { resize(); clockT.getDelta(); } } };
}
