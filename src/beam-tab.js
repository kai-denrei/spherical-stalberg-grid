// beam-tab.js — THE BEAM LAB, inside our own world.
//
// lab-satisfying-lasers tunes a beam against a neutral stage: near-black
// background, ACES filmic tone mapping, exposure 1. This board has none of
// that — no tone mapping is set anywhere in the project — and the recipe is
// explicit that without it "the same values just clip flat". So a preset that
// sings in the lab has no guarantee of surviving the trip.
//
// Rather than guess the translation, tune it HERE: the game's own light rig,
// the game's bloom chain, the game's look registry, and the actual mkcx with
// its real gun tubes. What you see is what the tank will do.
//
// The one control the lab does not have, and the reason this tab exists:
// TONE MAPPING. Toggle it and watch the whole frame re-grade. That is the
// decision the beam spec is blocked on, and it is an eye decision.
import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import GUI from '../vendor/lil-gui.esm.js';
import { createBeam, DEFAULTS } from './beamfx.js';
import { makeBloom } from './postfx.js';
import { LOOKS } from './looks.js';
import { buildCreature, preloadMkcx, SECONDARY_TOE } from './units.js';

// the heat clock the secondary actually runs on, mirrored from td-tab so the
// envelope tuned here is the envelope the weapon will fire
const LASER_MAX_HEAT = 2.4;
const LASER_COOL = 1.4;

export function initBeamTab(root) {
  let active = false;
  const container = root.querySelector('#beam-app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.005, 400);
  camera.position.set(4.5, 2.6, 6.0);

  // THE GAME'S LIGHT RIG, not an inspection rig. A beam tuned under gentle
  // studio light will be wrong the moment it fires on the board.
  const hemi = new THREE.HemisphereLight(0xc8cfe0, 0x555060, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe8c8, 0.25);
  sun.position.set(3, 5, 2); scene.add(sun);

  const postfx = makeBloom(renderer, scene, camera, {});
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // --- the stage: a slab of board and the tank on it ----------------------
  const world = new THREE.Group();
  scene.add(world);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x0b1016, roughness: 0.95, metalness: 0.05 }));
  world.add(floor);
  const grid = new THREE.GridHelper(60, 60, 0x00d0ff, 0x0a3a4a);
  grid.material.transparent = true; grid.material.opacity = 0.5;
  world.add(grid);

  let tank = null, gunL = null, gunR = null;
  function buildTank(lookName) {
    if (tank) { world.remove(tank); tank = null; gunL = gunR = null; }
    // buildCreature takes the look's COLOUR set, not the whole look record —
    // the same two keys every other caller in this project passes
    const L = LOOKS[lookName] || LOOKS.tronColors;
    tank = buildCreature('mkcx', { walker: L.walker ?? 0x9fdcff,
      walkerHi: L.walkerHi ?? 0xffffff });
    tank.scale.setScalar(1.0);
    world.add(tank);
    const guns = tank.userData && tank.userData.laserGuns;
    if (guns && guns.length >= 2) { [gunL, gunR] = guns; }
  }
  buildTank('tronColors');
  preloadMkcx().then(() => { buildTank(P.look); applyToe(); });  // swap in when the bytes land

  // --- the two beams, an inverted V meeting at an apex ---------------------
  // Emitter positions come from the gun world transforms, never from a stored
  // heading: the standing rule in this project, and the trap it has hit three
  // times. The apex is one shared point ahead of the hull, which is what makes
  // the V a V rather than two independent beams.
  const beamL = createBeam(new THREE.Vector3(), new THREE.Vector3(), DEFAULTS);
  const beamR = createBeam(new THREE.Vector3(), new THREE.Vector3(), DEFAULTS);
  scene.add(beamL.mesh, beamR.mesh);

  // THE LAB'S WIDTHS ARE LAB-SCALED. Its stage puts the beam across several
  // world units; our tank is about one unit long, so glowWidth 0.47 is half a
  // hull and the two beams merge into a single cone instead of reading as a V.
  // beamfx.js keeps the lab's numbers verbatim (re-porting stays mechanical);
  // the STARTING POINT for tuning here is scaled to this world, and the
  // sliders reach far enough down to go further.
  const WORLD_SCALED = {
    glowWidth: 0.055,
    coreWidth: 0.011,
    jitterAmount: 0.006,
  };

  const P = {
    ...DEFAULTS,
    ...WORLD_SCALED,
    // --- the world side, which the lab has no way to show you -------------
    look: 'tronColors',
    toneMapping: 'none',        // THE decision the beam spec is blocked on
    exposure: 1.0,
    bloom: true,
    bloomStrength: 0.3,
    bgBrightness: 0.015,
    // --- the envelope the operator specified ------------------------------
    envelope: 'bell',           // bell = 0 -> peak -> 0 across one burst
    peakIntensity: 8.0,
    burstSeconds: LASER_MAX_HEAT,
    // LENGTH. The apex is where the two beams meet, so this IS the beam
    // length — a long reach was the point of the weapon and 2.2 was barely
    // past the hull. Ranges to 40 so "much longer" is actually reachable.
    apexDistance: 12.0,
    spread: 1.0,                // how far apart the emitters read
    toeIn: SECONDARY_TOE,       // live, so convergence can be tuned by eye
    autoFire: true,
    copyPreset: () => {
      const out = {};
      for (const k of Object.keys(DEFAULTS)) out[k] = P[k];
      const json = JSON.stringify({ schema: 'laserfx/1', id: 'beam-in-world',
        beam: out, world: { toneMapping: P.toneMapping, exposure: P.exposure,
          bloom: P.bloom, bloomStrength: P.bloomStrength,
          peakIntensity: P.peakIntensity, burstSeconds: P.burstSeconds } }, null, 2);
      navigator.clipboard?.writeText(json).then(
        () => console.log('BEAMLAB preset copied to clipboard\n' + json),
        () => console.log('BEAMLAB preset (clipboard refused):\n' + json));
    },
    reset: () => { Object.assign(P, DEFAULTS, WORLD_SCALED); gui.controllersRecursive().forEach((c) => c.updateDisplay()); },
  };

  // Same rule as the model fix-up: inward is decided by the turret's own
  // side, never by its name.
  function applyToe() {
    if (!tank) return;
    for (const name of ['Secondary_L_Pivot', 'Secondary_R_Pivot']) {
      const piv = tank.getObjectByName(name);
      if (!piv) continue;
      piv.rotation.set(0, (piv.position.x < 0 ? 1 : -1) * P.toeIn, 0);
    }
  }

  function applyWorld() {
    const bg = P.bgBrightness;
    scene.background = new THREE.Color(bg, bg, bg * 1.15);
    renderer.toneMapping = P.toneMapping === 'aces' ? THREE.ACESFilmicToneMapping
      : P.toneMapping === 'reinhard' ? THREE.ReinhardToneMapping
        : THREE.NoToneMapping;
    renderer.toneMappingExposure = P.exposure;
    // a material compiled under one tone mapping must be told the rule changed
    scene.traverse((o) => { if (o.isMesh && o.material) {
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.needsUpdate = true;
    } });
    postfx.setEnabled(P.bloom);
    postfx.setParams({ strength: P.bloomStrength });
  }
  applyWorld();

  // --- the panel ----------------------------------------------------------
  const gui = new GUI({ title: 'BEAM', container: root });
  const gw = gui.addFolder('world (what the lab cannot show you)');
  gw.add(P, 'look', Object.keys(LOOKS)).onChange((v) => buildTank(v));
  gw.add(P, 'toneMapping', ['none', 'aces', 'reinhard']).onChange(applyWorld);
  gw.add(P, 'exposure', 0.1, 3, 0.01).onChange(applyWorld);
  gw.add(P, 'bloom').onChange(applyWorld);
  gw.add(P, 'bloomStrength', 0, 2, 0.01).onChange(applyWorld);
  gw.add(P, 'bgBrightness', 0, 0.3, 0.005).onChange(applyWorld);
  gw.open();

  const ge = gui.addFolder('envelope (the weapon, not the lab)');
  ge.add(P, 'envelope', ['bell', 'hold', 'lab']);
  ge.add(P, 'peakIntensity', 0, 12, 0.05);
  ge.add(P, 'burstSeconds', 0.4, 6, 0.1);
  ge.add(P, 'autoFire');
  ge.open();

  const gg = gui.addFolder('geometry');
  gg.add(P, 'apexDistance', 0.4, 40, 0.1).name('beam length (apex)');
  gg.add(P, 'spread', 0.2, 3, 0.05);
  gg.add(P, 'toeIn', 0, 0.6, 0.005).name('secondary toe-in').onChange(applyToe);
  gg.open();

  const gc = gui.addFolder('core');
  gc.addColor(P, 'coreColor');
  gc.add(P, 'coreWidth', 0.001, 0.30, 0.0005);
  gc.add(P, 'coreIntensity', 0, 8, 0.05);
  const gl = gui.addFolder('glow');
  gl.addColor(P, 'glowColor');
  gl.add(P, 'glowWidth', 0.004, 1.20, 0.002);
  gl.add(P, 'glowIntensity', 0, 8, 0.05);
  gl.add(P, 'glowFalloff', 0.5, 8, 0.05);
  const gp = gui.addFolder('caps');
  gp.add(P, 'capStart', 0, 0.4, 0.005);
  gp.add(P, 'capEnd', 0, 0.4, 0.005);
  gp.add(P, 'blast', 0, 6, 0.05);
  const gi = gui.addFolder('interference');
  gi.add(P, 'scrollSpeed', -8, 8, 0.05);
  gi.add(P, 'noiseScale', 0.5, 40, 0.1);
  gi.add(P, 'noiseAmount', 0, 1, 0.01);
  gi.add(P, 'flicker', 0, 1, 0.01);
  const gj = gui.addFolder('instability');
  gj.add(P, 'jitterAmount', 0, 0.40, 0.0005);
  gj.add(P, 'jitterFreq', 1, 200, 1);
  gui.add(P, 'copyPreset').name('copy preset (.json)');
  gui.add(P, 'reset').name('reset to lab defaults');

  // --- the heat clock -----------------------------------------------------
  // One burst is a BELL over the heat budget: 0 at both ends, peak at the
  // midpoint, then a lockout that cools at the game's rate. Tuning the shape
  // here is tuning the weapon, not a preview of it.
  let heat = 0, firing = true, lock = false;
  function envelope(dt) {
    if (P.envelope === 'hold') return 1;
    if (P.envelope === 'lab') return undefined;      // let beamfx run its own
    if (!P.autoFire) { heat = LASER_MAX_HEAT * 0.5; return 1; }
    if (lock) {
      heat = Math.max(0, heat - LASER_COOL * dt);
      if (heat === 0) { lock = false; firing = true; }
      return 0;
    }
    heat += dt;
    if (heat >= P.burstSeconds) { lock = true; return 0; }
    const x = heat / P.burstSeconds;                 // 0..1 across the burst
    return Math.sin(x * Math.PI);                    // 0 -> 1 -> 0
  }

  const a = new THREE.Vector3(), b = new THREE.Vector3(), apex = new THREE.Vector3();
  const fwd = new THREE.Vector3(), q = new THREE.Quaternion();
  function aimBeams() {
    // FROM THE RENDER TRANSFORM. If the guns exist, their world quaternion is
    // where the tank is pointing; falling back to the tank's own is still a
    // read of the transform, never a re-derived heading.
    const src = gunL || tank;
    if (!src) return;
    src.getWorldQuaternion(q);
    fwd.set(0, 0, 1).applyQuaternion(q);
    // FLATTEN IT, exactly as the weapon does. In game the bolt direction is
    // projected onto the tangent plane at the hull before it flies; without
    // the same projection here the guns' own downward toe-in drives the apex
    // through the floor and the tuning is done on geometry the tank will
    // never produce.
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-9) fwd.set(0, 0, 1);
    fwd.normalize();
    if (gunL && gunR) { gunL.getWorldPosition(a); gunR.getWorldPosition(b); }
    else {
      a.set(-0.18 * P.spread, 0.22, 0.35); b.set(0.18 * P.spread, 0.22, 0.35);
      tank.localToWorld(a); tank.localToWorld(b);
    }
    // one shared endpoint: that is what makes it a V and not two beams
    apex.copy(a).add(b).multiplyScalar(0.5).addScaledVector(fwd, P.apexDistance);
    beamL.setEndpoints(a, apex);
    beamR.setEndpoints(b, apex);
  }

  function pushParams(alpha) {
    for (const beam of [beamL, beamR]) {
      for (const k of Object.keys(DEFAULTS)) {
        const u = beam.uniforms['u' + k[0].toUpperCase() + k.slice(1)];
        if (!u) continue;
        if (u.value && u.value.isColor) u.value.set(P[k]);
        else u.value = P[k];
      }
      // the envelope drives INTENSITY, not opacity: the operator specified a
      // 0 -> 8 -> 0 intensity ramp, and under bloom the two read differently
      const gi2 = beam.uniforms.uGlowIntensity;
      if (gi2 && alpha !== undefined) gi2.value = P.peakIntensity * alpha;
      if (alpha !== undefined) beam.setAlpha(alpha > 0 ? 1 : 0);
    }
  }

  const clock = new THREE.Clock();
  const hud = root.querySelector('#beam-hud');
  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    postfx.setSize(w, h);
  }
  addEventListener('resize', resize);

  function frame() {
    requestAnimationFrame(frame);
    if (!active) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.getElapsedTime();
    const alpha = envelope(dt);
    aimBeams();
    pushParams(alpha);
    beamL.update(t); beamR.update(t);
    if (alpha !== undefined) pushParams(alpha);   // update() rewrites uAlpha
    controls.update();
    if (hud) {
      hud.textContent = `heat ${heat.toFixed(2)}/${P.burstSeconds.toFixed(1)}s`
        + `  ${lock ? 'COOLING' : 'FIRING'}`
        + `  intensity ${(P.peakIntensity * (alpha ?? 1)).toFixed(2)}`
        + `  tone ${P.toneMapping}`;
    }
    postfx.render();
  }
  frame();

  return {
    setActive(on) { active = on; if (on) { resize(); clock.getDelta(); } },
  };
}
