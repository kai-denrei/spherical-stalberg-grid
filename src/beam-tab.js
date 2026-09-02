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
// DEFAULTS only: the meshes are the rig's now (beamdraw.js), and this file
// no longer calls createBeam directly.
import { DEFAULTS } from './beamfx.js';
import { makeBloom } from './postfx.js';
import { LOOKS } from './looks.js';
import { buildCreature, preloadMkcx, SECONDARY_TOE } from './units.js';
import { BEAM_STEPS, beamStep } from './beamranks.js';
import { arcPoint, projectToArc } from './arc.js';
import { burnReport, sweepAdvance } from './beamburn.js';
import { createBeamRig, PLASMA_DEFAULTS } from './beamdraw.js';
import { SAFE_HUES, ALARM_HUES } from './enemyspec.js';

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
  // ...positioned after LAB_R exists: the stage is a sphere now and the old
  // origin-facing camera sat INSIDE it, looking at the far wall of a shell.

  // THE GAME'S LIGHT RIG, not an inspection rig. A beam tuned under gentle
  // studio light will be wrong the moment it fires on the board.
  const hemi = new THREE.HemisphereLight(0xc8cfe0, 0x555060, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe8c8, 0.25);
  scene.add(sun);   // aimed once the stage's radius is known

  const postfx = makeBloom(renderer, scene, camera, {});
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // --- the stage: a piece of the actual PLANET ----------------------------
  //
  // This was a flat slab, and that was fine while the beam was 2.6 cells long
  // and a straight chord floated a quarter of a cell off the ground. It is
  // not fine now: reach climbs to 10 cells with rank, the beam follows a
  // great circle, and a flat stage cannot show the one thing a tuning session
  // most needs to see — whether the beam HUGS.
  //
  // ONE WORLD UNIT IS ONE CELL here, and the sphere carries the board's own
  // curvature: the game runs a unit sphere with cellSide 0.08, so its radius
  // is 1/0.08 = 12.5 cells. Same ratio, bigger numbers, nothing to convert.
  const LAB_R = 12.5;
  const world = new THREE.Group();
  scene.add(world);
  const floor = new THREE.Mesh(
    new THREE.SphereGeometry(LAB_R, 96, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b1016, roughness: 0.95, metalness: 0.05 }));
  world.add(floor);

  // THE RULER. Not a grid — a grid on a sphere is a projection argument. Rings
  // at whole-cell distances from where the tank stands, so the reach of the
  // beam can be READ OFF THE GROUND in the same unit the game talks in. Every
  // fifth ring is brighter, because counting to ten in the dark is a chore.
  function ringAt(cells, bright) {
    const s = cells / LAB_R;                 // cells -> radians on this sphere
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      // a circle of constant arc distance about the pole
      const r = Math.sin(s), y = Math.cos(s);
      pts.push(new THREE.Vector3(Math.cos(a) * r * LAB_R, y * LAB_R, Math.sin(a) * r * LAB_R));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(g, new THREE.LineBasicMaterial({
      color: bright ? 0x00d0ff : 0x0a3a4a, transparent: true,
      opacity: bright ? 0.55 : 0.35,
    }));
  }
  const rings = new THREE.Group();
  for (let c = 1; c <= 12; c++) rings.add(ringAt(c, c % 5 === 0));
  world.add(rings);

  // Now that the pole is a real place, put the camera and the key light over
  // it. Behind and above the tank, looking a couple of cells down range —
  // the angle a player actually watches the weapon from.
  camera.position.set(3.6, LAB_R + 2.4, -5.2);
  sun.position.set(3, LAB_R + 5, 2);
  controls.target.set(0, LAB_R, 2.2);
  controls.update();

  let tank = null, gunL = null, gunR = null;
  function buildTank(lookName) {
    if (tank) { world.remove(tank); tank = null; gunL = gunR = null; }
    // buildCreature takes the look's COLOUR set, not the whole look record —
    // the same two keys every other caller in this project passes
    const L = LOOKS[lookName] || LOOKS.tronColors;
    tank = buildCreature('mkcx', { walker: L.walker ?? 0x9fdcff,
      walkerHi: L.walkerHi ?? 0xffffff });
    // 0.85 of a cell, which is what the board runs — the lab used 1.0 while a
    // cell meant nothing here, and now it means something.
    tank.scale.setScalar(0.85);
    tank.position.set(0, LAB_R, 0);   // standing at the pole; +Z is a tangent
    world.add(tank);
    const guns = tank.userData && tank.userData.laserGuns;
    if (guns && guns.length >= 2) { [gunL, gunR] = guns; }
  }
  buildTank('tronColors');
  preloadMkcx().then(() => { buildTank(P.look); applyToe(); });  // swap in when the bytes land

  // --- the two beams -------------------------------------------------------
  // Each one belongs to a gun: it leaves that gun's muzzle and runs straight
  // down that gun's own barrel. Both the origin and the direction come from
  // the gun's world transform — the standing rule here, and the trap this
  // project has hit three times. Whether they converge is then the toe-in's
  // business, not the beam code's.
  // THE WIDTHS ARE THE BOARD'S, VERBATIM.
  //
  // They used to be lab-scaled — glowWidth 0.055 against beamfx's own 0.47 —
  // because this stage measured in arbitrary world units and the tank was one
  // of them. One unit is one CELL now, which is exactly the unit the game's
  // BEAM_PRESET is written in, so the scaling is not merely unnecessary, it
  // was making the beam eighteen times too thin to see. These are td-tab's
  // numbers, copied across as the numbers they are.
  const WORLD_SCALED = {
    glowWidth: 1.0,
    coreWidth: 0.06,
    jitterAmount: 0.19,
    // The stage opens on the beam a rank-1 pilot actually fires. beamfx's
    // own default glow is #006d8f — which is now the RANK 5 colour, so
    // leaving it would have shown a silver-tier beam and called it the base.
    glowColor: BEAM_STEPS[0].color,
  };
  // Length is measured in CELLS now, on both surfaces. The lab used to scale
  // a world-unit slider by the step's reach relative to rank 1 and note in a
  // comment that the absolute number was the lab's own — an honest fudge that
  // stopped being necessary the moment one unit became one cell.

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
    // REACH, IN CELLS — the game's own unit, on the game's own curvature.
    // Free to drag, because the operator asked to test lengths and not only
    // the four the ladder hands out; the rank picker writes it too.
    reachCells: BEAM_STEPS[0].reach,
    muzzleNudge: 0.0,           // seat the origin exactly at the tip
    // (levelBeams is gone: the direction is projected onto the tangent plane
    // ALWAYS, because the board has no other answer on a sphere and a
    // non-tangent direction is not something arcPoint is defined for.)
    // THE SWEEP. Across one burst the toe-in runs 0 -> amplitude -> 0, so the
    // pair opens parallel, scissors inward to the midpoint and opens again —
    // the beams sweeping the ground in front rather than sitting in one line.
    sweep: true,
    sweepAmplitude: 0.20,       // radians of inward toe at the peak (matches BEAM_SWEEP in td-tab)
    rankStep: BEAM_STEPS[0].minRank,   // which of the four beams is on the stage
    // --- the drop-off bench -----------------------------------------------
    targets: 4,              // invincible bodies laid down the hull centreline
    targetStart: 1.5,        // cells to the first one
    targetGap: 1.4,          // cells between them
    targetSize: 0.5,         // their `size` in the game's sense; radius is 0.8x
                             // (0.4-0.55 is the board's whole roster, and a
                             //  body bigger than the tank hides the beam)
    targetMix: 'alternate',  // which of them are the solid, unrammable tier
    spread: 1.0,                // how far apart the emitters read
    toeIn: SECONDARY_TOE,       // live, so convergence can be tuned by eye
    autoFire: true,
    copyPreset: () => copyPreset(),
    downloadPreset: () => {
      // ...because "copied to the clipboard" is invisible, and a preset you
      // cannot find later is a preset you did not save
      const blob = new Blob([presetJson()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a2 = document.createElement('a');
      a2.href = url;
      a2.download = `beam-in-world-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a2); a2.click(); a2.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      flash('saved .json');
    },
    reset: () => { Object.assign(P, DEFAULTS, WORLD_SCALED); gui.controllersRecursive().forEach((c) => c.updateDisplay()); },
  };

  // THE SAME RIG THE BOARD DRAWS (beamdraw.js): a chained arc root plus a
  // plasma plume, not two straight ribbons. The lab used to build its own
  // pair, which is exactly how a tuning surface ends up describing a weapon
  // that no longer exists.
  const PLASMA = { ...PLASMA_DEFAULTS };
  const rig = createBeamRig({
    scene, guns: 2, preset: P, plasma: PLASMA, seed: 0x91a5be,
    // widths are in CELLS on the board and one unit IS a cell here, so the
    // rig's scale is 1 and the preset transfers across untouched
    widthKeys: [],
  });

  // --- THE TARGETS (operator, 2026-09-02) ---------------------------------
  // "adding invincible enemies to test the drop off."
  //
  // INVINCIBLE on purpose: the drop-off is a standing shape you want to look
  // at and adjust, and bodies that die rearrange it every two seconds. These
  // never lose hp, so the beam's choked length holds still while the sliders
  // move.
  //
  // Colour carries the rammable read, because that is the board's own rule
  // (enemyspec.js: white/grey/yellow/blue are safe, the alarm belts are not)
  // and the whole point of the drop-off is that the two tiers cost different
  // amounts. Reached bodies light up; the ones the beam never gets to go
  // dark, which is the readout that matters — what is behind armour is never
  // reached.
  const SOFT_COL = SAFE_HUES.blue, HARD_COL = ALARM_HUES.purple;
  const targetGroup = new THREE.Group();
  world.add(targetGroup);
  let targets = [];      // [{ mesh, mat, t (cells), hard }]

  function mixAt(i, n, mix) {
    if (mix === 'all rammable') return false;
    if (mix === 'all solid') return true;
    if (mix === 'solid first') return i === 0;
    if (mix === 'solid last') return i === n - 1;
    return i % 2 === 1;                     // alternate
  }

  function buildTargets() {
    for (const t of targets) {
      targetGroup.remove(t.mesh);
      t.mesh.geometry.dispose(); t.mesh.material.dispose();
    }
    targets = [];
    const n = Math.round(P.targets);
    for (let i = 0; i < n; i++) {
      const hard = mixAt(i, n, P.targetMix);
      // the game's own hit radius: cellSide * max(0.4, size*0.8), and a cell
      // is one unit here
      const r = Math.max(0.4, P.targetSize * 0.8);
      const mat = new THREE.MeshStandardMaterial({
        color: hard ? HARD_COL : SOFT_COL, roughness: 0.6, metalness: 0.1,
        emissive: hard ? HARD_COL : SOFT_COL, emissiveIntensity: 0.04,
        transparent: true, opacity: 0.5,
      });
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat);
      targetGroup.add(mesh);
      targets.push({ mesh, mat, t: P.targetStart + i * P.targetGap, hard, r });
    }
    placeTargets();
  }

  // Down the HULL's centreline, not down a gun's — the guns sweep, and a
  // line-up that swings with them is a line-up you cannot read. The sweep
  // scissoring ACROSS a fixed row is the thing worth watching.
  const hullFrom = [0, 1, 0];
  const hullDir = [0, 0, 1];
  function placeTargets() {
    for (const t of targets) {
      const q = arcPoint(hullFrom, hullDir, t.t / LAB_R);
      // seat it on the surface, lifted by its own radius so it sits ON the
      // ground rather than half-buried in it
      const lift = LAB_R + t.r * 0.6;
      t.mesh.position.set(q[0] * lift, q[1] * lift, q[2] * lift);
    }
  }

  // Same rule as the model fix-up: inward is decided by the turret's own
  // side, never by its name.
  // --- the preset, and saying so ------------------------------------------
  function presetJson() {
    const out = {};
    for (const k of Object.keys(DEFAULTS)) out[k] = P[k];
    return JSON.stringify({
      schema: 'laserfx/1',
      id: 'beam-in-world',
      generatedAt: new Date().toISOString(),
      beam: out,
      // the world side is part of the preset HERE in a way it was not in the
      // lab: this beam's look depends on tone mapping and bloom
      world: {
        toneMapping: P.toneMapping, exposure: P.exposure,
        bloom: P.bloom, bloomStrength: P.bloomStrength,
        bgBrightness: P.bgBrightness, look: P.look,
      },
      weapon: {
        envelope: P.envelope, peakIntensity: P.peakIntensity,
        burstSeconds: P.burstSeconds, reachCells: P.reachCells,
        toeIn: P.toeIn, muzzleNudge: P.muzzleNudge,
      },
    }, null, 2);
  }

  // FEEDBACK, because a silent copy is indistinguishable from a broken one —
  // which is exactly how the operator experienced the first version.
  let flashT = 0, flashMsg = '';
  function flash(msg) { flashMsg = msg; flashT = 2.0; }

  function copyPreset() {
    const json = presetJson();
    const ok = () => { flash('preset copied to clipboard'); console.log('BEAMLAB preset:\n' + json); };
    const fail = (why) => {
      // clipboard can refuse on an unfocused document; the textarea route
      // still works there, and the console always has it either way
      try {
        const ta = document.createElement('textarea');
        ta.value = json; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        const done = document.execCommand('copy');
        ta.remove();
        flash(done ? 'preset copied (fallback)' : 'copy refused — see console');
      } catch { flash('copy refused — see console'); }
      console.log(`BEAMLAB preset (clipboard ${why}):\n` + json);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(json).then(ok, () => fail('refused'));
    else fail('unavailable');
  }

  function applyToe(angle) {
    if (!tank) return;
    const a4 = angle === undefined ? P.toeIn : angle;
    for (const name of ['Secondary_L_Pivot', 'Secondary_R_Pivot']) {
      const piv = tank.getObjectByName(name);
      if (!piv) continue;
      piv.rotation.set(0, (piv.position.x < 0 ? 1 : -1) * a4, 0);
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
  gg.add(P, 'reachCells', 0.5, 14, 0.1).name('reach (cells)');
  gg.add(P, 'muzzleNudge', -0.5, 0.5, 0.005).name('muzzle offset');
  gg.add(P, 'spread', 0.2, 3, 0.05);
  gg.add(P, 'toeIn', 0, 0.8, 0.005).name('secondary toe-in').onChange(() => applyToe());
  gg.add(P, 'sweep').name('sweep across burst');
  gg.add(P, 'sweepAmplitude', 0, 0.8, 0.005).name('sweep amplitude');
  // THE RANK PICKER. Colour and reach are the pilot's rank on the board now
  // (beamranks.js), so a lab that only ever showed one of the four steps was
  // a lab lying about three quarters of the weapon. Both transfer EXACTLY
  // now — colour was always unit-free, and reach is in cells on both sides.
  gg.add(P, 'rankStep', BEAM_STEPS.map((b) => b.minRank))
    .name('rank step (1/5/10/15)')
    .onChange((r) => {
      const st = beamStep(Number(r));
      P.glowColor = st.color;
      P.reachCells = st.reach;
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
    });
  gg.open();

  // --- the drop-off bench ---------------------------------------------------
  // The mechanic that had no surface until now: the beam pierces, but every
  // body it passes through eats its remaining reach, so it SHORTENS into a
  // crowd. Lay bodies down the centreline and watch where it dies.
  const gt = gui.addFolder('targets (invincible)');
  gt.add(P, 'targets', 0, 8, 1).name('how many').onChange(buildTargets);
  gt.add(P, 'targetStart', 0.4, 8, 0.1).name('first at (cells)').onChange(buildTargets);
  gt.add(P, 'targetGap', 0.3, 4, 0.1).name('gap (cells)').onChange(buildTargets);
  gt.add(P, 'targetSize', 0.3, 2, 0.05).name('body size').onChange(buildTargets);
  gt.add(P, 'targetMix', ['alternate', 'all rammable', 'all solid',
    'solid first', 'solid last']).name('which are solid').onChange(buildTargets);
  gt.open();
  buildTargets();

  // The plume's shape — the other half of the weapon, and pure taste.
  const gpl = gui.addFolder('plasma');
  gpl.add(PLASMA, 'coreFrac', 0, 1, 0.01).name('hot root length');
  gpl.add(PLASMA, 'flare', 0, 0.8, 0.01).name('tip flare');
  gpl.add(PLASMA, 'rootFlare', 0, 0.3, 0.005).name('root flare');
  gpl.add(PLASMA, 'squash', 0, 1.5, 0.05).name('vertical squash');
  gpl.add(PLASMA, 'flow', 0, 6, 0.05).name('flow speed');
  gpl.add(PLASMA, 'bias', 0.5, 3, 0.05).name('root density');
  gpl.add(PLASMA, 'twist', 0, 24, 0.5).name('corkscrew');
  gpl.add(PLASMA, 'size', 1, 8, 0.1).name('dot size');
  gpl.close();

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
  gui.add(P, 'copyPreset').name('⧉ copy preset');
  gui.add(P, 'downloadPreset').name('⇩ save .json');
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

  // The rig takes the burst FRACTION and applies the bell itself (it is the
  // same bell the board runs), where envelope() above returns the bell's
  // VALUE for the lab's own uniform pushes. Two shapes of the same number —
  // handing the rig the value would square the bell and the beam would sit
  // dim through most of a burst.
  function heatFrac() {
    if (P.envelope !== 'bell' || !P.autoFire) return 0.5;   // 0.5 -> sin = 1
    return Math.min(1, heat / Math.max(0.001, P.burstSeconds));
  }

  // --- aiming: out of the muzzle, straight down the barrel ----------------
  //
  // NOT a shared apex. Each beam leaves its own gun's TIP and continues along
  // that gun's OWN world direction; the inverted V is then a consequence of
  // the toe-in rather than something imposed on top of it. Forcing both beams
  // onto one computed apex point was drawing a shape the guns were not making,
  // which is the same class of mistake as re-deriving a heading instead of
  // reading the transform.
  //
  // No flattening either. The gun pivots carry a real pitch (~10 degrees on
  // this model) and the beam should follow the barrel it comes out of.
  const tipLocal = new WeakMap();
  const bb = new THREE.Box3();
  function gunTipZ(pivot) {
    if (tipLocal.has(pivot)) return tipLocal.get(pivot);
    // the +Z extent of the gun's own subtree, in the pivot's local frame:
    // measured off the model rather than guessed at as an offset
    pivot.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(pivot.matrixWorld).invert();
    bb.makeEmpty();
    pivot.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      o.updateWorldMatrix(true, false);
      const g2 = o.geometry.clone();
      g2.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      g2.computeBoundingBox();
      bb.union(g2.boundingBox);
      g2.dispose();
    });
    const z = Number.isFinite(bb.max.z) ? bb.max.z : 0.5;
    tipLocal.set(pivot, z);
    return z;
  }

  const tmpP = new THREE.Vector3(), tmpQ2 = new THREE.Quaternion();
  const vunit = (v) => { const L = Math.hypot(v.x, v.y, v.z) || 1; return [v.x / L, v.y / L, v.z / L]; };
  const dot3 = (a2, b2) => a2[0] * b2[0] + a2[1] * b2[1] + a2[2] * b2[2];
  const norm3 = (v) => { const L = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / L, v[1] / L, v[2] / L]; };
  const cross3 = (a2, b2) => [a2[1] * b2[2] - a2[2] * b2[1],
    a2[2] * b2[0] - a2[0] * b2[2], a2[0] * b2[1] - a2[1] * b2[0]];

  // WHERE A GUN FIRES FROM AND TOWARD, on the sphere.
  //
  // Both come from the gun's own world transform — the standing rule here,
  // and the trap this project has hit three times. The direction is then
  // projected onto the TANGENT PLANE, always, with no toggle: the board has
  // no other sane answer on a sphere, and a lab option that produced a
  // non-tangent direction would feed arcPoint a vector it is not defined for
  // and draw a curve the weapon cannot make.
  function aimGun(g) {
    const pivot = g === 0 ? gunL : gunR;
    if (pivot) {
      tmpP.set(0, 0, gunTipZ(pivot) + P.muzzleNudge);
      pivot.localToWorld(tmpP);
      const from = vunit(tmpP);
      pivot.getWorldQuaternion(tmpQ2);
      tmpP.set(0, 0, 1).applyQuaternion(tmpQ2);
      const d0 = [tmpP.x, tmpP.y, tmpP.z];
      return { from, dir: norm3([d0[0] - from[0] * dot3(d0, from),
        d0[1] - from[1] * dot3(d0, from), d0[2] - from[2] * dot3(d0, from)]) };
    }
    if (!tank) return null;
    // procedural fallback has no gun pivots: two emitters at the hull front
    tmpP.set((g === 0 ? -0.18 : 0.18) * P.spread, 0.22, 0.35);
    tank.localToWorld(tmpP);
    const from = vunit(tmpP);
    tank.getWorldQuaternion(tmpQ2);
    tmpP.set(0, 0, 1).applyQuaternion(tmpQ2);
    const d0 = [tmpP.x, tmpP.y, tmpP.z];
    return { from, dir: norm3([d0[0] - from[0] * dot3(d0, from),
      d0[1] - from[1] * dot3(d0, from), d0[2] - from[2] * dot3(d0, from)]) };
  }

  // Swing a beam inward by its own phase, toward the hull's centreline —
  // which way "inward" is comes from the gun's own offset from the hull,
  // never from its L/R name.
  function swingDir(from, dir, swing) {
    if (!(swing > 1e-4)) return dir;
    const right = norm3(cross3(from, dir));
    const lat = [from[0] - hullFrom[0], from[1] - hullFrom[1], from[2] - hullFrom[2]];
    const d = dot3(lat, from);
    const latT = [lat[0] - from[0] * d, lat[1] - from[1] * d, lat[2] - from[2] * d];
    const sgn = dot3(latT, right) > 0 ? -1 : 1;
    const c = Math.cos(swing), n = Math.sin(swing) * sgn;
    return norm3([dir[0] * c + right[0] * n, dir[1] * c + right[1] * n,
      dir[2] * c + right[2] * n]);
  }

  function pushParams(alpha) {
    for (const beam of rig.beams) {
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
    rig.color.set(P.glowColor);
  }

  // --- the burn, run on the SAME rule the board runs (beamburn.js) --------
  const beamPhase = [0, 0];
  let lastReport = null;
  function markTargets(reachedSet) {
    for (const t of targets) {
      const hit = reachedSet && reachedSet.has(t);
      // burned bodies light; the ones the beam never gets to go ghostly. The
      // emissive is deliberately modest — under the bloom chain a 1.5 here
      // becomes a white ball that swallows the beam it is meant to be
      // measuring, which is how the first cut of this bench read.
      t.mat.emissiveIntensity = hit ? 0.35 : 0.03;
      t.mat.opacity = hit ? 1 : 0.35;
    }
  }

  function fireFrame(dt, t, alpha) {
    if (alpha === undefined || alpha <= 0) { rig.hide(); markTargets(null); lastReport = null; return; }
    const reach = P.reachCells;
    const reached = new Set();
    const reports = [];
    for (let g = 0; g < 2; g++) {
      const aim = aimGun(g);
      if (!aim) continue;
      const swing = P.sweep
        ? P.sweepAmplitude * Math.sin(Math.min(1, beamPhase[g]) * Math.PI) : P.toeIn * 0;
      const dir = swingDir(aim.from, aim.dir, swing);
      // WHAT IS IN THE BEAM — projected onto this gun's own arc, exactly the
      // query the board runs, so a body the lab shows as reached is a body
      // the game would burn.
      const along = [];
      for (const tg of targets) {
        const pr = projectToArc(aim.from, dir, vunit(tg.mesh.position));
        const sCells = pr.s * LAB_R;
        if (pr.s < 0 || sCells > reach) continue;
        if (pr.off * LAB_R >= tg.r) continue;
        along.push({ t: sCells, hard: tg.hard, ref: tg });
      }
      const rep = burnReport(along, reach, reach, 0);
      for (const h of rep.hits) reached.add(h.ref);
      reports.push(rep);
      rig.draw(g, {
        from: aim.from, dir, len: Math.max(0.05, rep.reachLeft) / LAB_R,
        heat: heatFrac(), lift: LAB_R, scale: 1, time: t, peak: P.peakIntensity,
      });
      // MASS IN THE BEAM SLOWS ITS SWEEP, per beam, so the pair falls out of
      // step — the inverse of knock-back, and the reason the lab shows two
      // phases rather than one shared toe angle.
      beamPhase[g] = Math.min(1, beamPhase[g] + sweepAdvance(dt, P.burstSeconds, rep.drag));
    }
    markTargets(reached);
    lastReport = reports[0] || null;
  }

  // ?labprobe=1 — THE DROP-OFF, as numbers. Reports the burn for each of the
  // four rank steps against the current line-up: where the beam ends, what it
  // burned, and what it never reached. This is the check that the lab and the
  // board agree, because both call beamburn.burn() — if these ever disagree
  // with the game's own ?beamfire probe, one of them has grown a second copy
  // of the rule.
  if (new URLSearchParams(location.search).get('labprobe') === '1') {
    setTimeout(() => {
      for (const st of BEAM_STEPS) {
        const bodies = targets.map((t2) => ({ t: t2.t, hard: t2.hard, ref: t2 }));
        const rep = burnReport(bodies, st.reach, st.reach, 0);
        console.log(`LABPROBE rank=${st.minRank} ${st.name} reach=${st.reach}c`
          + ` ends=${rep.reachLeft.toFixed(2)}c`
          + ` burned=${rep.rows.length}/${bodies.length}`
          + ` missed=${rep.missed.map((m) => m.t.toFixed(1)).join(',') || 'none'}`
          + ` drag=${(rep.drag * 100).toFixed(0)}%`
          + ` | ${rep.rows.map((x) => `${x.hard ? 'SOLID' : 'soft'}@${x.t.toFixed(1)}-${x.cost.toFixed(2)}`).join(' ')}`);
      }
      console.log(`LABPROBE stage radius=${LAB_R} cells (the board's own:`
        + ' unit sphere / cellSide 0.08) · targets='
        + targets.map((t2) => `${t2.hard ? 'SOLID' : 'soft'}@${t2.t.toFixed(1)}`).join(' '));
    }, 900);
  }

  // ?beamprobe=1 — where the beams actually start, point and end. A beam that
  // is long but aimed into the screen looks exactly like a short one, and the
  // difference is three numbers. Walks the ARC now, like everything else here.
  if (new URLSearchParams(location.search).get('beamprobe') === '1') {
    setTimeout(() => {
      const A = aimGun(0), B = aimGun(1);
      if (!A || !B) { console.log('BEAMPROBE INCONCLUSIVE (no guns yet)'); return; }
      const fmt = (v) => v.map((x) => x.toFixed(3)).join(',');
      const guns = gunL && gunR ? 'mkcx pivots' : 'procedural fallback';
      console.log(`BEAMPROBE source=${guns} reach=${P.reachCells} cells`
        + ` stage=sphere r=${LAB_R} cells`);
      console.log(`BEAMPROBE L from=${fmt(A.from)} dir=${fmt(A.dir)}`);
      console.log(`BEAMPROBE R from=${fmt(B.from)} dir=${fmt(B.dir)}`);
      // WHERE THEY MEET, which is the number worth tuning. The first cut of
      // this compared the gap at the muzzles against the gap at the far ends
      // and reported "diverging" — but toed-in beams CROSS and then separate
      // again, so at full length they are wide apart for the right reason. The
      // meaningful figure is the distance at which they are CLOSEST.
      let best = Infinity, bestAt = 0;
      for (let i = 0; i <= 400; i++) {
        const d = (i / 400) * (P.reachCells / LAB_R);
        const pa = arcPoint(A.from, A.dir, d), pb = arcPoint(B.from, B.dir, d);
        const gap = Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]) * LAB_R;
        if (gap < best) { best = gap; bestAt = d * LAB_R; }
      }
      const muzzleGap = Math.hypot(A.from[0] - B.from[0], A.from[1] - B.from[1],
        A.from[2] - B.from[2]) * LAB_R;
      console.log(`BEAMPROBE dirs-dot=${(A.dir[0] * B.dir[0] + A.dir[1] * B.dir[1]
        + A.dir[2] * B.dir[2]).toFixed(4)}`
        + ` muzzle-gap=${muzzleGap.toFixed(3)} cells`
        + ` closest=${best.toFixed(3)} cells at ${bestAt.toFixed(2)} cells`
        + ` (the apex the toe-in produces; ${best < 0.05 ? 'they cross' : 'they never meet'})`);
    }, 1200);
  }

  const copyBtn = root.querySelector('#beam-copy');
  if (copyBtn) copyBtn.addEventListener('click', copyPreset);

  const clock = new THREE.Clock();
  const hud = root.querySelector('#beam-hud');
  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    postfx.setSize(w, h);
  }
  addEventListener('resize', resize);

  // A NEW BURST RESTARTS BOTH SWEEPS TOGETHER. They only decouple under load,
  // which is the whole readout — a beam lagging its twin is the weapon saying
  // there is something in there you should not ram.
  let wasFiring = false;
  function frame() {
    requestAnimationFrame(frame);
    if (!active) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.getElapsedTime();
    const alpha = envelope(dt);
    const nowFiring = alpha !== undefined && alpha > 0;
    if (nowFiring && !wasFiring) { beamPhase[0] = 0; beamPhase[1] = 0; }
    wasFiring = nowFiring;
    // the barrels keep their static toe; the SWEEP is applied to the fired
    // direction per beam (fireFrame), not by rotating the model, because the
    // two beams no longer share one angle once drag pulls them apart
    applyToe(P.toeIn);
    pushParams(alpha);
    fireFrame(dt, t, alpha);
    if (alpha !== undefined) pushParams(alpha);   // draw() rewrites intensity
    controls.update();
    if (flashT > 0) flashT -= dt;
    if (hud) {
      hud.textContent = flashT > 0 ? flashMsg : hudLine(alpha);
      hud.classList.toggle('flash', flashT > 0);
    }
    postfx.render();
  }

  // THE DROP-OFF, IN WORDS. A picture of a short beam and a picture of a beam
  // aimed away are the same picture; the numbers are what tell them apart.
  function hudLine(alpha) {
    const base = `heat ${heat.toFixed(2)}/${P.burstSeconds.toFixed(1)}s`
      + `  ${lock ? 'COOLING' : 'FIRING'}`
      + `  rank ${P.rankStep} · ${P.reachCells.toFixed(1)} cells`
      + `  tone ${P.toneMapping}`;
    if (!lastReport) return base;
    const r = lastReport;
    const rows = r.rows.map((x) => `${x.hard ? 'SOLID' : 'soft'}@${x.t.toFixed(1)}`
      + `−${x.cost.toFixed(2)}`).join(' ');
    return `${base}\n`
      + `beam ends at ${r.reachLeft.toFixed(2)} of ${P.reachCells.toFixed(1)} cells`
      + `  ·  drag ${(r.drag * 100).toFixed(0)}%`
      + `  ·  phases ${beamPhase[0].toFixed(2)}/${beamPhase[1].toFixed(2)}`
      + (rows ? `\nburned: ${rows}` : '\nburned: nothing in the beam')
      + (r.missed.length ? `  ·  NEVER REACHED: ${r.missed.length}` : '');
  }
  frame();

  return {
    setActive(on) { active = on; if (on) { resize(); clock.getDelta(); } },
  };
}
