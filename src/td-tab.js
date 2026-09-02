// td-tab.js — TOWER DEFENSE mode (heart-tab sibling). M1: adds the
// build/action camera pair and the minimap/threat-view swap on top of
// the full heart game. Towers/economy arrive in M2/M3.
// Original header:
// defend the Heart. An OPEN battlefield (~80% walkable;
// walls are scattered obstacle clumps to maneuver around and shelter
// behind, not corridors) with the Heart at the north pole. Enemies are
// INTRODUCED one type per wave (HokorobiTawaa's announce pattern): each
// introduction creates that type's SPAWN POINT far from the pole — find
// it and destroy it (3 hits). Fodder (phage/amoeba/jellyfish) is RUN
// OVER: the tank is strong, ramming kills them free. The late roster is
// borrowed from HokorobiTawaa and can NOT be rammed: corona (armored,
// slows itself when shot), barbed (accelerates when shot), knot (BOSS).
// Shells also blast walls open — clear your own path to the sources.
// Pickups: bullet triads (+3 shells), speed, health, regen charges
// carried home.
// Win: all types introduced, all spawn points dead, field clear.
// Lose: the Heart falls.

import * as THREE from '../vendor/three.module.js';
import GUI from '../vendor/lil-gui.esm.js';
import { generateSphereMesh, relax } from './grid.js?v=6cbd45c5';
import { generateDungeon, bfsDist, BLOCKED, PATH, ROOM } from './dungeon.js?v=6cbd45c5';
import { mulberry32, randomSeed } from './rng.js?v=6cbd45c5';
import { computeBerths, berthIndexFor } from './berths.js?v=6cbd45c5';
import { wantsSecondary, shellsForAll } from './autofire.js?v=6cbd45c5';
import { printPhase, printOffset, printOn, patternSecsFor } from './printpath.js?v=6cbd45c5';
import { createBeamRig, PLASMA_DEFAULTS, BOARD_PRESET, BEAM_PEAK } from './beamdraw.js?v=6cbd45c5';
import { sub3, add3, scale3, dot3, cross3, norm3, len3, dist3, segKey, tangentDir, tangentBasis } from './vec3.js?v=6cbd45c5';
import { CREATURES, waveJelly } from './creatures.js?v=6cbd45c5';
import { brief, dwellFor } from './isaobriefs.js?v=6cbd45c5';
import { drawEmotion } from './emotions.js?v=6cbd45c5';
import { ACHIEVEMENTS, ACHV_GROUPS, achievement, blankRun, earned, freshlyEarned,
  sanitiseRecord }
  from './achievements.js?v=6cbd45c5';
import { applyFontPack, currentFontPack, FONT_NAMES,
  loadTypeFeel } from './fonts.js?v=6cbd45c5';
import { SECONDARY_TOE, applySecondaryToe } from './units.js?v=6cbd45c5';
import { UNITS, UNIT_NAMES, buildUnit, buildCreature, preloadMkcx, preloadServer, makeServerFixture, makeShieldShell, preloadContainer, makeContainerFixture, preloadFabricator, makeIsaoDrone, makeBulletCloud, makeRewardSolid, makeShellSolid, makeDebris, makeDotBurst, makePortalCloud, makeHeartCloud, makeDotEnemy, preloadTerraformer, makeTerraformerFixture } from './units.js?v=6cbd45c5';
import { LOOKS, LOOK_NAMES } from './looks.js?v=6cbd45c5';
import { makeCellIndex } from './cellindex.js?v=6cbd45c5';
import { CREATURE_TINTS, ENEMY_SPEC, INTROS, computeWavePlan, accentFor } from './enemyspec.js?v=6cbd45c5';
import { PICKUPS } from './pickups.js?v=6cbd45c5';
import { rankFor, rankLabel, badgeSVG, killReq, eliteReq } from './ranks.js?v=6cbd45c5';
import { beamStep, isBeamStep, PEN_SOFT_FRAC, PEN_HARD_FRAC } from './beamranks.js?v=6cbd45c5';
import { burn, sweepAdvance, wallBite as wallBiteFor } from './beamburn.js?v=6cbd45c5';
import { arcPoint, projectToArc, toeForCrossing, crossingForToe } from './arc.js?v=6cbd45c5';
import { makeScore } from './score.js?v=6cbd45c5';
import { TOWERS, TOWER_BY_KEY, MAX_TIER, upgradeCost, effectiveStats, pickTarget, shotInterval, unlockedTowerKeys, towerUnlockWave, TOWER_ORDER } from './towers.js?v=6cbd45c5';
import { makeEconomy, sellRefund } from './economy.js?v=6cbd45c5';
import { makeBloom } from './postfx.js?v=6cbd45c5';
import { TANK_FEEL, TANK_FEEL_KNOBS, makeTankFeel, stepTankFeel, landTankFeel, fireTankFeel, applyTankFeel, applyTankHealth } from './tankfeel.js?v=6cbd45c5';
import { FEEL, loadFeel, saveFeel } from './feelstore.js?v=6cbd45c5';
import { STRIKE_KNOBS, makeStrike, makeStrikeParams, grantStrikes, stepStrike,
  toggleArm, paintTarget, launchStrike, stepFall, skipFall, fallProgress,
  strikeDamage, retargetStrike, orbitProgress } from './strike.js?v=6cbd45c5';
import { radarBasis, radarProject, radarBearing, sweepAngle, radarPhosphor } from './radar.js?v=6cbd45c5';
import { BLOOM_GROUPS } from './bloomweights.js?v=6cbd45c5';
import { TOWER_LOOK_NAMES, DEFAULT_TOWER_LOOK, buildTowerLook, preloadLook } from './towerlooks.js?v=6cbd45c5';
import { makeAudio } from './audio.js?v=6cbd45c5';
import { DEATH_KEYS } from './audiomanifest.js?v=6cbd45c5';

export function initTdTab(root) {
  let active = false;
  let wasPlaying = false; // drives body.playing (mobile hides ALL chrome)

  const params = {
    towerLook: DEFAULT_TOWER_LOOK,
    // app-wide, but it lives in this GUI because this is the tab whose
    // messages the packs were chosen for (src/fonts.js owns the table)
    font: currentFontPack(),
    seed: 7,
    heartLook: 'terraformer', // what stands at the pole — see HEART_LOOKS
    callouts: true,           // the encouragement layer; numbers survive it going off
    // The whole unlock run — every wave until the last tower unlocks — is
    // a guided tutorial, and it should be played on a TIGHT board: at 3000
    // the opening sector was 146 open cells, at 500 it is 84. Cells are
    // also ~2.4x wider, so the board reads chunky and legible rather than
    // sprawling. Sector expansion is unaffected — round 2 still opens 278.
    // Larger maps for the post-tutorial game are a separate, later change.
    points: 500, // ONE pre-decided lane world; sectors unseal it in bands
    rooms: 16,          // lane structure: rooms joined by wide corridors
    roomRadius: 4,
    extraCorridors: 8,
    corridorWidth: 1, // narrow halls between ROOMS — rooms are the arenas
    obstacles: 0.2,     // fraction of the sphere left as wall clumps
    wallHeight: 0.03,
    relaxIters: 80,
    view: 'third', // pov | third
    look: 'tronColors', // visual identity, see looks.js
    wallTops: 'black', // obstacles read as voids; silhouettes matter here
    speed: 1.1, // cells per second, wanderer pace
    recoil: 8, // shell-recoil intensity, dialed to MAX per operator
    directive: 'wander', // auto-mode order: wander/avoid/ram/conserve/home/portal
    // Hover feel, all live-tunable — these were guessed wrong twice, so they
    // are knobs rather than constants. Units: `hoverRise` is in MODEL units
    // (the tank is ~3.24 tall there), because it moves the body group inside
    // the model, not the unit on the sphere.
    // mkcx by default: the authored hover tank. Async — buildUnit falls
    // back to the procedural tank until the bytes land, then
    // onMkcxReady swaps it in.
    creature: 'mkcx',
    // balance (operator pass): heavier early waves, but a richer field —
    // more triads on the ground and a longer breath between waves
    orbs: 14,
    orbRespawn: 6, // seconds between respawns (0 = off)
    waveSize: 4,
    wavesPerSector: 15, // the HOLD phase. Survive these and the gates unseal.
                        // The operator's first guess, not a finding.
    waveGap: 7,   // seconds of anticipation between a cleared wave and the next
    waveCap: 30,  // safety: force the next wave if the current isn't cleared in time
    rewards: 6,
  };

  // creature-specific locomotion: a speed profile over time (multiplies the
  // wander pace) and a hover profile (fraction of unitScale above the floor)
  const MOVES = {
    amoeba: {
      // crawl: pseudopod surge then pause
      speed: (tt) => 0.5 + 0.7 * Math.pow(0.5 + 0.5 * Math.sin(tt * 1.6), 2),
      hover: () => 0,
    },
    phage: {
      // stalk & pounce: creeps, then rare quick darts on spindly legs
      speed: (tt) => 0.45 + 2.8 * Math.pow(0.5 + 0.5 * Math.sin(tt * 0.7), 10),
      hover: (tt) => 0.1 + 0.06 * Math.sin(tt * 2.2),
    },
    tank: {
      // treads: steady, grounded, unhurried
      speed: () => 0.85,
      hover: () => 0,
    },
    drone: {
      // quick hoverer with a slight altitude wobble
      speed: (tt) => 1.25 + 0.15 * Math.sin(tt * 1.1),
      hover: (tt) => 0.35 + 0.08 * Math.sin(tt * 2.3),
    },
    jellyfish: {
      // pulse & drift: thrust on the bell contraction (same 3t as the Jelly
      // treatment, so the push visibly matches the squeeze), then coast
      speed: (tt) => 0.3 + 1.5 * Math.pow(Math.max(0, Math.sin(tt * 3 + 0.4)), 2),
      hover: (tt) => 0.5 + 0.18 * Math.sin(tt * 3 - 0.9),
    },
    corona: {
      // armored roll: slow and inevitable
      speed: () => 0.7,
      hover: (tt) => 0.12 + 0.03 * Math.sin(tt * 1.8),
    },
    barbed: {
      // drifting mine: slow sway
      speed: (tt) => 0.6 + 0.1 * Math.sin(tt * 1.2),
      hover: () => 0.06,
    },
    knot: {
      // the boss glides
      speed: () => 0.55,
      hover: (tt) => 0.3 + 0.06 * Math.sin(tt * 1.4),
    },
  };

  // --- scene ---------------------------------------------------------------
  const container = root.querySelector('#td-app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const mainBg = new THREE.Color(0x0d1017);
  scene.background = mainBg;

  const camera = new THREE.PerspectiveCamera(68, 1, 0.004, 50);
  const postfx = makeBloom(renderer, scene, camera, {});
  // sound. The context can only be born on a user gesture, so arm() wires
  // one-shot listeners and the first tap/keypress creates it. Until then
  // every play() is a silent no-op -- the game never waits on audio.
  const sfx = makeAudio({ seed: 1 });
  sfx.arm();
  // THE ALARM IS THE PROOF OF LIFE. Operator, 2026-09-01: waiting out the
  // cold open to find out whether sound works makes every test cycle cost
  // ten seconds. This fires the moment the context is genuinely running —
  // the same klaxon the first unrammable contact uses — so audio announces
  // itself immediately, on the very first click, before anything else.
  //
  // It also doubles as a diagnostic: if this is silent but ?beep=1 is
  // audible, the fault is in the sample path, not the output.
  sfx.whenRunning(() => {
    // TWO sounds, deliberately, by two completely different routes. The
    // oscillator uses NONE of the sample path — no decoded buffer, no bus,
    // no master, no mix admission — so hearing one and not the other
    // localises the fault without needing a special URL or another round
    // trip. Six attempts failed to ask this question; now every load asks it.
    sfx.beep(880, 220);            // route A: oscillator -> destination
    console.log('AUDIO proof-of-life A: beep (oscillator, no buffer/bus/master)');
  });
  // Route B waits for the samples. Decoding rides the playback context now,
  // so it finishes AFTER the unlock — firing this on `running` alone would
  // ask for a buffer that does not exist yet and be refused.
  sfx.whenReady(() => {
    sfx.play('danger_alert');
    console.log('AUDIO proof-of-life B: danger_alert (decoded sample, full graph)');
    // ...and then MEASURE it, rather than asking anyone to listen. Seven
    // rounds of this bug have ended with "can you tell me what you hear";
    // the analyser on master answers it from inside the page.
    sfx.measureOutput(1500);
  });

  // Which things bloom how much. Read fresh every frame from the live
  // collections, so nothing has to be tagged at creation and no new
  // spawn site can silently miss out. Anything not listed here — tracers,
  // debris, bursts, orbs, rewards, the Heart, the range ring — falls
  // through to the `effects` weight.
  postfx.setGroups(() => [
    ['map', [floorMesh, wallMesh, edgeMesh, topMesh]],
    ['tank', [playerMesh]],
    ['enemies', [
      ...enemies.filter((e) => e.alive).map((e) => e.obj),
      ...spawnPoints.filter((sp) => sp.alive).map((sp) => sp.obj),
    ]],
    ['towers', towers.map((tw) => tw.obj)],
  ]);

  // --- the minimap is a MARKER LAYER, not a second render of the world ------
  // It used to draw the whole scene again, so every object on the board cost
  // two draw calls instead of one — measured at ~1020 calls a frame, and the
  // map was roughly half of it. Now the map camera only sees layer 1: the
  // board itself (four merged meshes), the few hand-placed markers, and ONE
  // pooled blip cloud carrying every enemy and tower.
  //
  // A blip per enemy would have been an object per enemy, which is the cost
  // being removed. One buffer rewritten each frame is one draw call for the
  // lot, however many there are.
  // Layer 1 survives as a tag on the board meshes (harmless), but nothing
  // renders it any more: the minimap's second WebGL scene is gone, replaced
  // by the 2D radar below.
  const MAP_LAYER = 1;

  // --- wave telegraph -------------------------------------------------------
  // A wave used to simply appear. The countdown said so in the corner, but
  // the corner is not where you are looking — so the first you knew of it was
  // enemies already on the board, and the gates themselves gave nothing away.
  //
  // Now the gate CHARGES: it swells, brightens and beats faster over the last
  // few seconds, throwing a shock ring across the floor each beat, quicker as
  // the moment comes. The warning is on the thing the enemies come out of,
  // which is the thing worth watching.
  // 3.0 exactly: the warning sound is 3.7s long and starts here, so it is
  // still running as the first enemy clears the gate — the cue hands over
  // to the thing it warned about rather than stopping a frame before it.
  const WAVE_WARN = 3.0;      // seconds of charge before the wave lands
  let waveCharge = 0;         // 0..1 over that window
  let warnBeat = 0;           // seconds until the next shock ring
  // >= 0 means a wave is ARMED and counting down. Every route to spawnWave
  // goes through this, so a wave cannot arrive without its lead-in.
  let waveIn = -1;

  // --- orbital strike -------------------------------------------------------
  // All logic lives in strike.js (pure, tested); this file owns only what it
  // looks and sounds like. strikeTune is the live knob object the GUI writes.
  const strike = makeStrike();
  const strikeTune = makeStrikeParams();
  let strikeGrace = 0;   // s after launch during which a tap cannot skip
  let shopMute = 0;      // s after impact during which the shop stays shut
  const strikecamEl = root.querySelector('#td-strikecam');
  const scInfoEl = root.querySelector('#sc-info');
  const scRangeEl = root.querySelector('#sc-range');
  let strikingUi = false;
  // The feed: B&W filter class, the ops HUD, and the range counter. The
  // counter is the camera's own distance to the target in fictional metres —
  // it rides the same smoothstep as the fall, so it decelerates hard as the
  // ground arrives, which is what makes the last 200m feel like a held
  // breath rather than a number spinning to zero.
  const STRIKE_M_PER_UNIT = 4800;   // planet radius 1 == ~4.8km of fiction
  const scSkipEl = root.querySelector('#td-strikecam .sc-skip');
  function strikeFeedInfo() {
    const ci = strike.fallCi;
    scInfoEl.textContent =
      `ORBITAL STRIKE · OTS-723\n`
      + `WARHEAD 489KG · KINETIC\n`
      + `TGT CELL ${String(Math.max(0, ci)).padStart(4, '0')} · SECTOR R${round}\n`
      + `FEED SAT-CAM 2 · LIVE`
      + (strike.retargetsLeft > 0 ? `\nVECTOR BURST ×${strike.retargetsLeft}` : '\nVECTOR SPENT');
    scSkipEl.textContent = strike.retargetsLeft > 0
      ? 'TAP GROUND TO RE-AIM · TAP SKY TO SKIP'
      : 'TAP TO SKIP';
  }
  function syncStrikeFeed() {
    const on = strike.falling > 0;
    if (on !== strikingUi) {
      strikingUi = on;
      console.log(`FEED ${on ? 'ON' : 'OFF'} range=${scRangeEl.textContent}`);
      root.classList.toggle('striking', on);
      strikecamEl.classList.toggle('hidden', !on);
      if (on) strikeFeedInfo();
    }
    if (on && strike.fallCi >= 0) {
      const c = graph.centers[strike.fallCi];
      const d = Math.hypot(camera.position.x - c[0], camera.position.y - c[1],
        camera.position.z - c[2]);
      const m = Math.max(0, Math.round(d * STRIKE_M_PER_UNIT / 10) * 10);
      scRangeEl.textContent = `${String(m).padStart(4, '0')}M`;
    }
  }

  // One pooled cloud for every ring, main view only — the map has its blips.
  const WARN_MAX = 1200;   // ~4 rings alive per gate at the fastest cadence
  const warnPos = new Float32Array(WARN_MAX * 3);
  const warnCol = new Float32Array(WARN_MAX * 3);
  const warnGeo = new THREE.BufferGeometry();
  warnGeo.setAttribute('position', new THREE.BufferAttribute(warnPos, 3));
  warnGeo.setAttribute('color', new THREE.BufferAttribute(warnCol, 3));
  warnGeo.setDrawRange(0, 0);
  const warnMesh = new THREE.Points(warnGeo, new THREE.PointsMaterial({
    size: 3.6, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.9,
  }));
  warnMesh.frustumCulled = false;   // the buffer is rewritten; its bounds lie
  scene.add(warnMesh);
  const warnFx = [];   // { c, t1, t2, a, r0, r1, t, life, col }

  // A ring lying ON the surface, so it reads as a shock across the floor
  // rather than a sphere hanging in the air. The basis comes from the cell's
  // own normal; a fixed up-vector degenerates wherever the sphere faces it.
  function warnRing(ci, hex, life, r1) {
    const nrm = graph.normals[ci];
    let t1 = cross3(nrm, [0, 1, 0]);
    if (len3(t1) < 1e-3) t1 = cross3(nrm, [1, 0, 0]);
    t1 = norm3(t1);
    const t2 = norm3(cross3(nrm, t1));
    const c = add3(graph.centers[ci], scale3(nrm, cellSide * 0.12));
    // dense enough to read as a RING and not as scattered dots: the radius
    // grows to several cells, and 34 points across that is just confetti
    const N = 72;
    for (let i = 0; i < N && warnFx.length < WARN_MAX; i++) {
      warnFx.push({ c, t1, t2, a: (i / N) * Math.PI * 2, r0: cellSide * 0.3, r1,
        t: 0, life, col: new THREE.Color(hex) });
    }
  }

  function stepWarnFx(dt) {
    let k = 0;
    for (let i = warnFx.length - 1; i >= 0; i--) {
      warnFx[i].t += dt;
      if (warnFx[i].t >= warnFx[i].life) warnFx.splice(i, 1);
    }
    for (const f of warnFx) {
      const u = f.t / f.life;
      const r = f.r0 + (f.r1 - f.r0) * u;
      const ca = Math.cos(f.a) * r, sa = Math.sin(f.a) * r;
      warnPos[k * 3] = f.c[0] + f.t1[0] * ca + f.t2[0] * sa;
      warnPos[k * 3 + 1] = f.c[1] + f.t1[1] * ca + f.t2[1] * sa;
      warnPos[k * 3 + 2] = f.c[2] + f.t1[2] * ca + f.t2[2] * sa;
      const fade = 1 - u;
      warnCol[k * 3] = f.col.r * fade;
      warnCol[k * 3 + 1] = f.col.g * fade;
      warnCol[k * 3 + 2] = f.col.b * fade;
      k++;
    }
    warnGeo.setDrawRange(0, k);
    warnGeo.attributes.position.needsUpdate = true;
    warnGeo.attributes.color.needsUpdate = true;
  }

  // --- the radar ------------------------------------------------------------
  // The minimap stopped being a minimap the day the board went to one merged
  // mesh — a shrunken copy of the main view told you nothing the main view
  // did not. It is a PPI SCOPE now, DeepWatch's idiom on our sphere: a
  // rotating beam, contacts flaring as it passes and decaying behind it,
  // heading-up around the tank or pole-down over the heart (M still swaps).
  //
  // A 2D canvas, not a third renderer: ~200 contacts a frame is nothing, and
  // it RETIRES the second WebGL context the old map ran on. The class stays
  // 'minimap' so every existing rule — the round clip, the phone corner, the
  // strike promotion, the feed's display:none — applies unchanged.
  const radarEl = document.createElement('canvas');
  radarEl.className = 'minimap';
  container.appendChild(radarEl);
  const radarCtx = radarEl.getContext('2d');
  let radarCss = 200;

  // even-ish lighting: the walker can be anywhere on the sphere, so no side
  // may fall into unreadable darkness
  const hemi = new THREE.HemisphereLight(0xc8cfe0, 0x555060, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe8c8, 1.1);
  sun.position.set(2, 3, 1.5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8a96c8, 0.8);
  fill.position.set(-2.5, -1.5, -3);
  scene.add(fill);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    postfx.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // armed promotes the corner disc to a RADAR: same scene, same culled
    // layer, just more of the screen — the targeting view is the map
    const narrow = w <= 700;
    const mScale = strike.armed ? (narrow ? 0.44 : 0.52) : (narrow ? 0.23 : 0.32);
    const mCap = strike.armed ? (narrow ? 340 : 430) : (narrow ? 138 : 240);
    const m = Math.min(mCap, Math.floor(Math.min(w, h) * mScale));
    radarCss = m;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    radarEl.width = Math.round(m * dpr);
    radarEl.height = Math.round(m * dpr);
    radarEl.style.width = `${m}px`;
    radarEl.style.height = `${m}px`;
  }
  addEventListener('resize', resize);

  // --- state ---------------------------------------------------------------
  let mesh = null, dungeon = null, graph = null;
  let cellSide = 0.08;
  let floorGeo = null, wallGeo = null, floorMesh = null, wallMesh = null;
  let edgeGeo = null, edgeMesh = null;
  let topGeo = null, topMesh = null; // interior wall-top wires, dimmable
  let floorOffsets = null; // cell -> [start,count] into floor color attr (verts)
  let heartSprite = null, playerMesh = null, markerMesh = null;
  // WHAT STANDS AT THE POLE. Both entries satisfy one contract — sizeScale,
  // tick(t), hit() — so swapping them changes how the Stalheart LOOKS and
  // never what it DOES. Same registry seam as looks / towerlooks /
  // unitcatalog, and the reason this could be tried without touching
  // heartHit, the minimap, the bastion camera or the win condition.
  const HEART_LOOKS = {
    terraformer: {
      label: 'terraformer',
      preload: preloadTerraformer,
      make: () => makeTerraformerFixture(new THREE.Color(look().heart).getHex()),
      // a wide machine on a pad wants more room than a dot cloud
      scale: 1.9,
      lift: 0.16,
    },
    cloud: {
      label: 'dot cloud',
      preload: () => Promise.resolve(true),
      make: () => makeHeartCloud(new THREE.Color(look().heart).getHex()),
      scale: 1.15,
      lift: 0.55,
    },
  };
  const heartLook = () => HEART_LOOKS[params.heartLook] || HEART_LOOKS.cloud;
  let heartGen = 0;   // a board rebuild invalidates an in-flight model load
  // THE SERVER: an invincible fixture at the heart's exact antipode.
  // Finding it offers the HACK — the HDT circuit duel in an overlay —
  // and a win decrypts the next tower ahead of its wave gate.
  let serverObj = null, serverCi = -1, serverGen = 0;
  // the LIFE CONTAINERS: 3 near the heart, each { obj, tank } — the spare
  // hulls ARE the lives counter (playerHP - 1 spares stocked)
  let lifeContainers = [];
  // WHERE THE CAMP IS — known synchronously, from the board alone. The
  // container models decorate these cells; they never choose them, which is
  // what lets a reset place the tank once instead of teleporting it later.
  let berths = [];
  let serverChamber = []; // the carved vault: floor cells, walls all round
  // walls the PLAYER opened (shells, strikes) stay open across rounds —
  // demolition is permanent (operator ruling: a breach you paid for does
  // not grow back at the next frontier shift)
  const breachedCells = new Set();
  let serverFound = false, hackedRound = false, hackedUnlocks = 0;
  let hackWins = 0;              // total protocol wins this run
  let missileShop = false;       // hack #2 opens it
  let missilesBought = 0;        // the price climbs with each purchase
  const missileCost = () => 500 + 250 * missilesBought;
  let playerSize = 0.06; // set per-generation in buildActors

  // creature dot-cloud + gameplay state
  let creatureBase = null;   // unit-radius [x,y,z,(hi)] points from creatures.js
  let creatureGeo = null;
  let creaturePos = null;    // Float32Array scratch for waveJelly
  let baseUnitScale = 0.04;  // creature world radius at birth
  let unitScale = 0.04;      // current radius; grows on absorb
  let absorbed = 0;
  const orbMeshes = new Map(); // open-cell index -> orb mesh
  let orbRng = mulberry32(1);  // reseeded per maze
  // which of the three death sounds plays is deterministic per seed, so a
  // replayed board sounds identical (mulberry32, house convention)
  let deathPick = mulberry32(1);

  // Hydraulics you can SEE. The pneumatics already sound like they lift the
  // hull; hoverT is the same gesture in the geometry, so the sound explains
  // a movement instead of decorating one. settleT drives a damped rock as
  // the tank sets back down — it starts high so a fresh spawn doesn't rock.
  const feel = makeTankFeel(); // hover / vibration / touchdown, shared with the viewer
  // The whole-unit lift is gone: on a model with a hover skirt the body
  // rises and the skirt stays planted (see units.js). Units without that
  // split simply do not hover, which is correct — a dot-cloud creature has
  // no suspension to compress.
  let respawnClock = 0;

  // --- battle state --------------------------------------------------------
  const AMMO_MAX = 9;
  let ammo = 3;
  const enemies = [];      // { cur, prev, next, prog, pos, dir, obj, alive }
  const projectiles = [];  // { pos, dir, dist, mesh }
  const debris = [];       // scatter effects, tick(dt) -> alive
  const spawnPoints = [];  // { ci, hp, obj, alive, found, mapMarker } — type-agnostic gates
  let wave = 0;
  let waveActive = false; // a wave's enemies are live/uncleared

  // --- THE SPINE -----------------------------------------------------------
  // A RUN IS FIVE SECTORS, and a sector has two phases in order:
  //
  //   THE PROGRAMME  the sector sends `wavesPerSector` waves. That is how
  //                  many it has; when they are spent, no more come.
  //   THE GATES      kill every one and the sector is yours, at ANY point.
  //
  // Gates are never immune. Drive out, put three shells in one, and it is
  // down — that is the whole of the aggressive line, and it is meant to
  // work. It is also NOT free, which is why it needs no rule to restrain
  // it: every gate you close early is a wave that never arrives, and the
  // kills, the biomass and the score in it never arrive either. Hold the
  // line and you finish rich; end it early and you finish alive. The game
  // balances that on its own, and an immune portal was me not trusting it.
  //
  // Clearing sector 5 is the planet, and the planet is the win.
  //
  // This replaces the TOURS layer, which was a second answer to the same
  // question — "what is a run made of" — that did not nest with the first.
  // A player could finish a tour while a sector sat half-cleared, so the
  // game announced TOUR 1 SURVIVED over a wave counter marching into 16.
  const SECTORS_TOTAL = 5;
  let sectorStartWave = 0;       // the wave this sector's HOLD began at
  let sectorsCleared = 0;
  const sectorWave = () => Math.max(0, wave - sectorStartWave);
  // the programme is spent: no more waves are sent, and whatever gates are
  // still standing are a mop-up rather than a siege
  const programmeDone = () => sectorWave() >= params.wavesPerSector;

  // --- ISAO SPEAKING -------------------------------------------------------
  // A face, a title, and one line at a time. One line, because these are
  // written to be spoken and a wall of text is the thing a voice pass would
  // have to undo. Advancing is a tap anywhere on the panel.
  //
  // It does NOT pause the game. Isao talks between waves and while you
  // drive; a modal for every remark would make him something to get past
  // rather than someone in the vehicle with you.
  const briefEl = root.querySelector('#td-brief');
  const briefFace = root.querySelector('#td-brief-face');
  const briefTitle = root.querySelector('#td-brief-title');
  const briefLine = root.querySelector('#td-brief-line');
  const briefDots = root.querySelector('#td-brief-dots');
  const BRIEF_SEEN = 'td.briefs';
  let briefQ = null, briefAt = 0, briefFaceT = 0;
  // Seconds left on the current LINE. A countdown driven from the frame loop,
  // deliberately not a setTimeout: this file has already paid once for
  // deferred work outliving the run that scheduled it (the death timer that
  // fired after a retry), and a frame-loop accumulator cannot outlive
  // anything. `briefDwell` is kept only to size the progress bar.
  let briefLeft = 0, briefDwell = 1;
  let briefPending = null;   // at most one beat waiting its turn
  const briefSeen = (() => {
    try { const v = JSON.parse(localStorage.getItem(BRIEF_SEEN) || '[]'); return Array.isArray(v) ? v : []; }
    catch { return []; }
  })();

  const briefBar = root.querySelector('#td-brief-bar');
  function paintBrief() {
    if (!briefQ) return;
    briefTitle.textContent = briefQ.title;
    briefLine.textContent = briefQ.lines[briefAt];
    briefDots.textContent = briefQ.lines.map((_, i) => (i === briefAt ? '●' : '○')).join(' ');
    // The bar is the affordance that says THIS WILL PASS. Without it a player
    // who has learned to tap keeps tapping, and the auto-advance buys nothing.
    if (briefBar) briefBar.style.width = `${Math.max(0, Math.min(1, briefLeft / briefDwell)) * 100}%`;
    const ctx = briefFace.getContext('2d');
    drawEmotion(ctx, briefQ.face, { w: briefFace.width, h: briefFace.height, t: briefFaceT });
  }
  function showBrief(id) {
    const b = brief(id);
    if (!b || !briefEl) return;
    if (b.once && briefSeen.includes(id)) return;
    if (b.once && briefPending === id) return;
    // ONE DEEP, AND NO DEEPER. With eight beats two can come due together —
    // the first kill of a wave that has only just been announced, say. Showing
    // the new one on top loses the old one for good, because a `once` beat is
    // marked seen the moment it appears; queueing everything turns Isao into
    // the wall of messages this work exists to remove. So: hold exactly one,
    // and drop any further arrivals on the floor. A beat worth saying twice
    // should not be `once` in the first place.
    if (briefQ) { if (!briefPending) briefPending = id; return; }
    if (b.once) {
      briefSeen.push(id);
      try { localStorage.setItem(BRIEF_SEEN, JSON.stringify(briefSeen)); } catch { /* private mode */ }
    }
    briefQ = b; briefAt = 0; briefFaceT = 0;
    briefDwell = briefLeft = dwellFor(b.lines[0]);
    briefEl.classList.remove('hidden');
    sfx.play('laser_click');
    paintBrief();
  }
  // `auto` = the line ran out of time rather than being tapped through. The
  // click is the player's, so it keeps its click; a line retiring on its own
  // must not make a noise, or the panel is still demanding attention — which
  // is the whole thing being fixed.
  function stepBrief(auto) {
    if (!briefQ) return;
    briefAt++;
    if (briefAt >= briefQ.lines.length) { endBrief(); return; }
    if (!auto) sfx.play('laser_click');
    briefDwell = briefLeft = dwellFor(briefQ.lines[briefAt]);
    paintBrief();
  }
  // The line clock, as a named function rather than four lines inside animate:
  // a probe never runs animate, so anything buried in the frame loop is
  // unverifiable by construction — and this project has already reported a
  // PASS against a fix it had never exercised for exactly that reason.
  function stepBriefClock(dt) {
    if (!briefQ) return;
    briefFaceT += dt;
    briefLeft -= dt;
    if (briefLeft <= 0) stepBrief(true); else paintBrief();
  }
  function endBrief() {
    briefQ = null; briefLeft = 0;
    if (briefEl) briefEl.classList.add('hidden');
    if (briefPending) { const nxt = briefPending; briefPending = null; showBrief(nxt); }
  }
  function clearBriefs() { briefPending = null; endBrief(); }
  if (briefEl) briefEl.addEventListener('click', () => stepBrief(false));

  // --- THE RECORD ----------------------------------------------------------
  // One flat object of run facts, fed to a pure evaluator. Kept as a single
  // mutable record rather than scattered counters so that adding an
  // achievement never means adding a counter somewhere else and hoping the
  // two stay in step.
  const ACHV_KEY = 'td.achievements';
  let run = blankRun();
  let runAchv = [];   // earned THIS run, for the debrief card
  const heldAchv = (() => {
    // through sanitiseRecord, not straight out of JSON.parse: a stored value
    // of the wrong shape is not a corrupt achievement list, it is a crash at
    // boot, and the tab that dies is the whole game
    try { return sanitiseRecord(JSON.parse(localStorage.getItem(ACHV_KEY) || '[]')); }
    catch { return []; }
  })();
  function checkAchievements() {
    const fresh = freshlyEarned(heldAchv, earned(run));
    if (!fresh.length) return;
    for (const id of fresh) heldAchv.push(id);
    try { localStorage.setItem(ACHV_KEY, JSON.stringify(heldAchv)); } catch { /* private mode */ }
    // one at a time, oldest first: a stack of five toasts is a stack nobody
    // reads, and the streak ladder in particular fires in clumps
    for (const id of fresh) if (!runAchv.includes(id)) runAchv.push(id);
    const a = achievement(fresh[0]);
    if (a) {
      sfx.play('tower_upgrade');
      showToast(`<div class="wave-num">&#10022; ${a.name}</div>`
        + `<div class="wave-role">${a.note}</div>`
        + (fresh.length > 1 ? `<div class="wave-role">+${fresh.length - 1} more</div>` : ''),
      3400);
    }
  }
  let interClock = 0;     // anticipation countdown between waves
  let waveAge = 0;        // seconds since the current wave spawned (safety cap)
  const seenTypes = new Set(); // headline types already revealed this run
  // roster data (tints/specs/intros) lives in enemyspec.js — one source
  // of truth shared with the TD tab (M0 extraction). See that module for
  // the field semantics.
  // ROUNDS = SECTORS (HokorobiTawaa's fraying, spherized): ONE persistent
  // world per run. Round 1 opens only a small inner region around the
  // Heart — the rest of the sphere is SEALED (reads as solid wall mass).
  // Clearing every portal flashes the frontier open: a wider ring
  // unseals, farther portals rise, the wave counter keeps counting, and
  // YOUR TOWERS AND PURSE STAY. Two more threat types unlock per round.
  let round = 1;
  let tutorialActive = false;
  let runTutorial = true; // resolved from ?tutorial in the URL-hook block
  const tutEl = root.querySelector('#td-tut');
  let tdFullTags = null;  // the true world, pre-sealing
  let tdFullDist = null;  // heart-distance over the full world
  let tdMaxD = 0;
  // PRE-DECIDED DIRECTIONAL SECTORS: 1 = the inner disk around the Heart;
  // 2..5 = four azimuth lobes, opening in OPPOSITE-ALTERNATING order —
  // the second reveal opens BEHIND the first (south after north), the
  // third and fourth take the perpendicular pair. Expansion sweeps AROUND
  // the planet instead of running deeper down lanes already cleared.
  let tdSectorId = null; // per-cell sector number (1..5); 6 = never (walls)
  // seal/unseal to the current round's fraction; optionally re-pick the
  // player start (only at run start — expansions don't teleport you)
  function applySector(resetSpawn = false) {
    for (let i = 0; i < dungeon.tags.length; i++) {
      dungeon.tags[i] = (tdFullTags[i] !== BLOCKED && tdSectorId[i] <= round)
        ? tdFullTags[i] : BLOCKED;
    }
    let d = bfsDist(graph.adj, [dungeon.heart],
      (i) => dungeon.tags[i] !== BLOCKED);
    // lanes wander across lobe borders: any opened cell the Heart cannot
    // reach yet belongs with a future reveal — seal it back for now
    // (recomputed from scratch each round, so it reopens with its lobe)
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (dungeon.tags[i] !== BLOCKED && d[i] === -1) dungeon.tags[i] = BLOCKED;
    }
    // THE VAULT IS ALWAYS FLOOR. The chamber is exempt from the band gate
    // AND the reachability seal: it renders as an open room inside the
    // rock from round 1, unreachable until a wall is blasted or the
    // frontier arrives — the operator's stated design. Its cells keep
    // distToHeart -1, so nav, rewards, and portal picks all ignore it.
    for (const ci of serverChamber) dungeon.tags[ci] = ROOM;
    // ...and so are the player's breaches: paid-for demolition survives
    // the frontier shift. (Before the seal on purpose — a breach tunnel
    // that connects to the open network is thereby REACHABLE and stays.)
    for (const ci of breachedCells) {
      if (ci !== serverCi && !towerByCell.has(ci)) dungeon.tags[ci] = PATH;
    }
    dungeon.distToHeart = d;
    {
      let n = 0;
      for (let i = 0; i < dungeon.tags.length; i++) if (dungeon.tags[i] !== BLOCKED) n++;
      console.log(`sector ${round}: ${n} open cells`);
    }
    if (resetSpawn) {
      let sp = -1, bd = -1;
      for (let i = 0; i < dungeon.tags.length; i++) {
        if (dungeon.tags[i] !== BLOCKED && dungeon.distToHeart[i] > bd) {
          bd = dungeon.distToHeart[i]; sp = i;
        }
      }
      dungeon.spawn = sp;
    }
  }
  const rewardMeshes = new Map(); // cell -> { obj, type } far-field rewards
  let heartHP = 10;
  const HEART_MAX = 10;
  let playerHP = 3;
  const PLAYER_MAX = 3;
  // A destroyed tank is DOWN, not merely invisible. Without this flag the
  // wreck kept its whole agency through the death hold — it drove (auto),
  // rammed enemies for combo and pay, took touch damage (a second life,
  // gone — the RED accents), and grabbed pickups — all while hidden. The
  // player then 'respawned where they died' because the ghost had driven
  // itself somewhere in the meantime.
  let playerDown = false;
  let carryingRegen = false;
  let speedBonus = 1; // permanent, from power rewards
  // the energy shield: a timed bubble over the hull — touch damage
  // bounces off while it holds. shieldObj is lazy-built, scene-level
  // (positioned each frame like the marker, so parent scale can't warp it)
  const SHIELD_TIME = 12;
  let shieldT = 0;
  let shieldObj = null;
  // The tank's field promotion. Only hands-on kills climb it — towers and
  // orbital strikes pay biomass, not respect — and the ladder belongs to
  // the HULL: lose the tank, lose the insignia. Gold's second gate counts
  // the dangerous (non-rammable) tier killed up close.
  let tankKills = 0, tankEliteKills = 0, tankRank = 0;
  let rankBadgeHud = '';
  // the boss omen (brass, 10s before the knot's wave) and the proximity
  // klaxon (once per wave, first dangerous contact)
  const BOSS_WAVE = INTROS.find((i) => ENEMY_SPEC[i.type]?.boss)?.wave ?? -1;
  let bossCued = false;
  let dangerWarnedWave = -1;
  // Callouts: quick bragging text for the plays worth bragging about.
  // Message lists ROTATE (a counter, not Math.random — house rule) so
  // repeats spread out deterministically.
  const RECKLESS_MSGS = ['RECKLESS!', 'すげ〜！', 'CLOSE CALL!', 'ヤバイ！',
    'TIGHT!', '接近だ！', 'FEARLESS!', '接近過ぎ！',
    "pt1 c'est chaud!", 'ギリギリ', 'NEAR MISS', '危機一髪',
    'DODGE THIS', '助かった', 'DOWN TO THE WIRE', 'あぶねー',
    'SKETCHY', 'セーフ！', 'moins une!', "c'est limite la",
    'ca passe ou ca casse'];
  const HEART_MSGS = ['PROTECT THE HEART!', 'LIVING DANGEROUSLY!',
    'NEED SAFETY BUFFER!', 'LAST LINE HOLDS!'];
  let recklessIdx = 0, heartIdx = 0;
  let heartCalloutCd = 0;   // seconds; near-heart kills happen in bursts
  let streakMark = 0;       // last streak milestone already called out
  let ramCombo = 0, ramComboT = 0;  // count-up + its expiry window
  const RAM_COMBO_GAP = 4;
  // SitRep bookkeeping: everything the end-of-wave recap reports. Bins are
  // 3s buckets of kill tempo — the sparkline is drawn from them.
  // --- SIM autoplay (tier-1 gameplay simulation) --------------------------
  // ?sim=style1|style0 plays the game by policy at ?simfast=K (default 50
  // fixed steps per frame). style1 is the operator's stated modus operandi:
  // ram rammable / avoid solids (the ram directive already avoids nothing —
  // solids shrug rams off, so the flee vector is deliberately NOT applied
  // to it; the tank trades hull for kills exactly like the operator does),
  // SLOW and AOE at bottlenecks, SNIPER everywhere, upgrades with spare
  // biomass. style0 is the deliberate floor: wander, build nothing.
  let simFast = 0, simStyle = null, simPolClock = 0, simDone = false;
  const simCurve = []; // one point per wave CLEAR: the tuning signal
  let simCap = 600; // sim-seconds before a run reports 'timeout'
  function simTrunk() {
    // traffic: greedy descent from each live portal toward the heart; a
    // cell on 2+ routes is trunk — the lanes the policy fortifies
    const count = new Map();
    const live = spawnPoints.filter((sp) => sp.alive);
    for (const sp of live) {
      let cur = sp.ci, guard = 0;
      while (dungeon.distToHeart[cur] > 0 && guard++ < 500) {
        count.set(cur, (count.get(cur) || 0) + 1);
        let best = cur;
        for (const nb of graph.adj[cur]) {
          if (dungeon.tags[nb] !== BLOCKED && dungeon.distToHeart[nb] >= 0
            && dungeon.distToHeart[nb] < dungeon.distToHeart[best]) best = nb;
        }
        if (best === cur) break;
        cur = best;
      }
    }
    const need = Math.min(2, Math.max(1, live.length));
    return [...count.entries()].filter(([, c]) => c >= need).map(([ci]) => ci);
  }
  function simBuild() {
    const trunk = simTrunk();
    if (!trunk.length) return;
    const unlockedSet = new Set(unlockedTowerKeys(wave, hackedUnlocks));
    const have = (k) => towers.reduce((a, tw) => a + (tw.def.key === k ? 1 : 0), 0);
    const wants = [];
    if (have('slow') < 2) wants.push('slow');
    if (have('aoe') < 2) wants.push('aoe');
    wants.push('sniper'); // '...with sniper everywhere'
    // the opening: the preferred kit unlocks at waves 4-7, and the very
    // first batch run proved a policy with no early fallback builds
    // NOTHING and loses the heart by wave 2 — so until the kit arrives,
    // keep pace with the waves using the newest thing unlocked
    if (towers.length < Math.min(4, wave)) {
      wants.unshift(unlockedTowerKeys(wave, hackedUnlocks).pop());
    }
    for (const k of wants) {
      if (!unlockedSet.has(k)) continue;
      const def = TOWER_BY_KEY[k];
      if (!eco.canAfford(def.cost)) return; // save up for the priority buy
      for (const tci of trunk) {
        for (const nb of graph.adj[tci]) {
          if (!placeError(nb)) { orderTower(k, nb); return; }
        }
      }
      break; // unlocked and affordable but nowhere to put it — fall through
    }
    // nothing to place: spend spare biomass on the cheapest upgrade
    let bestT = null, bestC = Infinity;
    for (const tw of towers) {
      const c = upgradeCost(tw.def, tw.tier);
      if (c !== null && c < bestC && eco.canAfford(c)) { bestC = c; bestT = tw; }
    }
    if (bestT) orderUpgrade(bestT);
  }
  // style2 'builder': stay out of trouble, spend EVERYTHING on towers —
  // newest unlocked first, upgrades with the change. This style survives
  // into the mid-game, which is where the biomass-flood question lives.
  function simBuildAll() {
    const trunk = simTrunk();
    if (!trunk.length) return;
    const keys2 = unlockedTowerKeys(wave, hackedUnlocks).slice().reverse();
    for (const k of keys2) {
      const def = TOWER_BY_KEY[k];
      if (!eco.canAfford(def.cost)) continue;
      for (const tci of trunk) {
        for (const nb of graph.adj[tci]) {
          if (!placeError(nb)) { orderTower(k, nb); return; }
        }
      }
    }
    let bestT = null, bestC = Infinity;
    for (const tw of towers) {
      const c = upgradeCost(tw.def, tw.tier);
      if (c !== null && c < bestC && eco.canAfford(c)) { bestC = c; bestT = tw; }
    }
    if (bestT) orderUpgrade(bestT);
  }
  function simPolicy(dt) {
    simPolClock += dt;
    if (simPolClock < 2) return; // decide every 2 SIM-seconds
    simPolClock = 0;
    const wantDir = simStyle === 'style1' ? 'ram'
      : simStyle === 'style2' ? 'avoid' : 'wander';
    if (params.directive !== wantDir || !autoMode) {
      params.directive = wantDir;
      autoMode = true;
    }
    if (simStyle === 'style1') simBuild();
    else if (simStyle === 'style2') simBuildAll();
  }
  function simWatch() {
    if (simDone) return;
    if (player.won) simEmit(heartHP <= 0 || playerHP <= 0 ? 'loss' : 'win');
    else if (t > simCap) simEmit('timeout');
  }
  function simEmit(outcome) {
    simDone = true;
    const payload = { style: simStyle, seed: params.seed >>> 0, outcome, wave, round,
      score: score.points, heart: heartHP, lives: playerHP,
      towers: towers.length, biomass: eco.biomass, simT: Math.round(t),
      curve: simCurve };
    console.log('SIMRESULT ' + JSON.stringify(payload));
    try {
      if (window.parent !== window) window.parent.postMessage({ simresult: payload }, '*');
    } catch { /* sandboxed parent */ }
  }

  // RUN-level bookkeeping: everything the final send-off reports. Wave
  // stats (ws) reset each wave; these accumulate until the run ends.
  let rs = null;
  function resetRunStats() {
    rs = { kills: {}, bySrc: { tank: 0, tower: 0, strike: 0 }, rams: 0,
      strikes: 0, maxCombo: 0, killers: [], maxRank: 0,
      scoreBins: [], binClock: 0 };
  }
  resetRunStats();

  let ws = null;
  function resetWaveStats() {
    ws = { t0: simTime, kills: {}, bySrc: { tank: 0, tower: 0, strike: 0 },
      rams: 0, points0: score.points, maxMult: 1, leaks: 0,
      bins: new Array(16).fill(0) };
  }
  function noteWaveKill(type, src) {
    // the economy, taught at the moment the player has just earned some and
    // not a second before — every kill in the game passes through here
    showBrief('harvest');
    if (rs) {
      rs.kills[type] = (rs.kills[type] || 0) + 1;
      rs.bySrc[src] = (rs.bySrc[src] || 0) + 1;
    }
    if (!ws) return;
    ws.kills[type] = (ws.kills[type] || 0) + 1;
    ws.bySrc[src] = (ws.bySrc[src] || 0) + 1;
    ws.bins[Math.min(15, Math.floor((simTime - ws.t0) / 3))]++;
    ws.maxMult = Math.max(ws.maxMult, eco.multiplier());
  }

  // phagocytosis state, recomputed per frame (amoeba only)
  const reach = { dir: null, amt: 0 };
  const tmpV = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const Y_AXIS = new THREE.Vector3(0, 1, 0);
  const X_AXIS = new THREE.Vector3(1, 0, 0);   // local pitch axis after a lookAt
  const tmpN = new THREE.Vector3();

  // groups (bullet triads, mesh units) carry geometry in children
  function disposeObj(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  function clearOrbs() {
    for (const orb of orbMeshes.values()) {
      scene.remove(orb);
      disposeObj(orb);
    }
    orbMeshes.clear();
  }

  // ammo pickup: THREE half-dotted Braille shells standing side-by-side
  // on a random open cell (never spawn/heart/occupied/under the creature).
  // The set reads as what it gives: +3 bullets.
  function spawnOneOrb() {
    const open = [];
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (dungeon.tags[i] !== BLOCKED && i !== dungeon.spawn && i !== dungeon.heart
        && i !== player.cur && !orbMeshes.has(i)) open.push(i);
    }
    if (open.length === 0) return false;
    return spawnOrbAt(open[Math.floor(orbRng() * open.length)]);
  }
  function spawnOrbAt(ci) {
    if (orbMeshes.has(ci)) return false;
    const r = cellSide * 0.14;
    const group = new THREE.Group();
    const phase = orbRng() * 6.283;
    const shells = [];
    for (let k = -1; k <= 1; k++) {
      const b = makeShellSolid({ body: look().orb.color, hi: 0xffffff });
      b.scale.setScalar(r * 0.62);
      b.position.set(k * r * 1.7, r * 1.1, 0); // side-by-side, noses up
      group.add(b);
      shells.push(b);
    }
    const c = graph.centers[ci];
    const n = graph.normals[ci];
    group.position.set(c[0], c[1], c[2]);
    tmpN.set(n[0], n[1], n[2]);
    group.quaternion.setFromUnitVectors(Y_AXIS, tmpN); // local +Y = surface normal
    // transform-only idle: spin PURELY about the cell's normal. Euler trap:
    // writing rotation.y would REPLACE the alignment quaternion above (they
    // are two views of one rotation) and spin about world-Y — shells then
    // tilt into the ground everywhere but the pole. Compose quaternions:
    // base alignment × local-Y spin.
    const baseQ = group.quaternion.clone();
    const spinQ = new THREE.Quaternion();
    group.userData.tick = (t) => {
      spinQ.setFromAxisAngle(Y_AXIS, t * 0.9 + phase);
      group.quaternion.copy(baseQ).multiply(spinQ);
      for (let k = 0; k < 3; k++) {
        shells[k].position.y = r * (1.1 + 0.25 * Math.sin(t * 2.2 + phase + k * 2.1));
      }
    };
    scene.add(group);
    orbMeshes.set(ci, group);
    return true;
  }

  function spawnOrbs() {
    clearOrbs();
    for (let k = 0; k < params.orbs; k++) spawnOneOrb();
  }

  function absorbOrb(ci) {
    const orb = orbMeshes.get(ci);
    if (!orb) return;
    scene.remove(orb);
    disposeObj(orb);
    orbMeshes.delete(ci);
    absorbed++;
    ammo = Math.min(AMMO_MAX, ammo + 3); // a triad is three shells
    sfx.play('tank_shells');
    updateHud();
  }

  // nearest orb to the creature's position; absorb on contact
  function nearestOrb() {
    let bestCi = -1, bestD = Infinity;
    for (const [ci, orb] of orbMeshes) {
      const dx = orb.position.x - player.pos[0];
      const dy = orb.position.y - player.pos[1];
      const dz = orb.position.z - player.pos[2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < bestD) { bestD = d; bestCi = ci; }
    }
    return { ci: bestCi, d: bestD };
  }

  function checkAbsorb() {
    const { ci, d } = nearestOrb();
    if (ci !== -1 && d < unitScale * 0.85 + cellSide * 0.16) absorbOrb(ci);
  }

  // The walker WANDERS on its own: it glides cell-to-cell continuously and
  // picks each next exit itself. `heading` is the STEERING INTENT (what A/D
  // rotate) — it biases the choice but doesn't command it. `travelDir` is
  // where the walker is actually going; the camera and cone follow that.
  const player = {
    cur: 0, prev: -1,
    next: -1,           // cell being glided toward
    prog: 0,            // 0..1 along cur -> next
    pos: [1, 0, 0],     // interpolated position on the sphere
    travelDir: [0, 1, 0],
    smoothDir: [0, 1, 0], // rate-limited travelDir — cameras/creature follow THIS
    heading: [1, 0, 0], // steering intent, unit tangent
    segLen: 1,          // world length of the current cur->next chord
    freeMode: false,    // true while manual drives the position off-graph
    virtualStart: null, // glide origin when auto resumes from a free position
    moves: 0,
    visited: new Set(),
    won: false,
  };
  let whim = mulberry32(1); // the walker's own randomness, reseeded per maze
  let cellIndex = () => -1; // voxel-hash nearest-cell lookup, built per board
  let unitBlocker = () => false; // per-tab solid units (tanks, structures)

  // free-move collision: the position is blocked if its cell is wall, if it
  // presses into a blocked neighbour's margin (no more nosing into walls),
  // or if a solid unit stands there
  // how many open neighbours a cell has — ≤3 means a narrow hall or a
  // corner pocket, where the anti-clipping margins must relax or the
  // hitbox wedges the tank (the stuck-in-width-1-corridor bug)
  function openCount(ci) {
    let n = 0;
    for (const nb of graph.adj[ci]) if (dungeon.tags[nb] !== BLOCKED) n++;
    return n;
  }

  // a life container blocks like a wall — except for the hull currently
  // berthed in it (spawns start INSIDE and drive out; once out, the box
  // is solid again behind you)
  function containerBlocked(ci) {
    return ci !== player.cur && lifeContainers.some((cc) => cc.ci === ci);
  }
  // ...and while you are still IN a berth, the boxes either side of you do
  // not crowd the exit. The margin test below treats a solid neighbour as a
  // no-go shell around the lane, which between three boxes in a row leaves a
  // gap the hull cannot thread — the second half of the operator's
  // can't-get-out report. Clear of the berth, they go solid again.
  const berthed = () => lifeContainers.some((cc) => cc.ci === player.cur);
  function freeBlocked(cand) {
    const ci = cellIndex(cand);
    // the SERVER is solid: a machine you can drive through is a prop, not
    // a fixture (operator field report — the tank phased clean through)
    if (ci === -1 || dungeon.tags[ci] === BLOCKED || ci === serverCi
      || containerBlocked(ci)) return true;
    // wide ground keeps the clipping margin; narrow halls trade a little
    // visual overlap for guaranteed passability
    const margin = cellSide * (openCount(ci) <= 3 ? 0.45 : 0.62);
    const crowdedBy = berthed()
      ? (nb) => dungeon.tags[nb] === BLOCKED || nb === serverCi
      : (nb) => dungeon.tags[nb] === BLOCKED || nb === serverCi || containerBlocked(nb);
    for (const nb of graph.adj[ci]) {
      if (crowdedBy(nb) && dist3(cand, graph.centers[nb]) < margin) return true;
    }
    return unitBlocker(cand);
  }

  // nearest blocked neighbour's center, for wall sliding
  function nearestWall(cand) {
    const ci = cellIndex(cand);
    if (ci === -1) return null;
    let best = null, bd = Infinity;
    for (const nb of graph.adj[ci]) {
      if (dungeon.tags[nb] !== BLOCKED) continue;
      const d = dist3(cand, graph.centers[nb]);
      if (d < bd) { bd = d; best = graph.centers[nb]; }
    }
    return best;
  }
  // spawn-point structures are solid; creatures stay passable (contact IS
  // their damage — blocking them would neuter the threat)
  unitBlocker = (cand) => spawnPoints.some((s) => s.alive && dist3(cand, graph.centers[s.ci]) < cellSide * 0.6);

  // WALL CUSHION, corridor-safe edition. The first version (0.95 margin,
  // sequential pushes, two passes, diagonal walls) fixed clipping on the
  // open heart battlefield but WEDGED the tank in width-1 corridors:
  // opposing walls both push every frame, sequential application
  // zigzags, and the push out-muscled the drive step — stuck, and with
  // no shells, stuck for good. Three changes make it passage-safe:
  //   1. margins ADAPT: narrow cells (≤3 open neighbours) use a smaller
  //      band and skip diagonal wall collection (diagonals jam corners)
  //   2. pushes are NET-SUMMED then applied once — opposing walls cancel
  //      into centering instead of fighting
  //   3. the applied push is CAPPED per frame well below drive speed —
  //      the cushion corrects clipping over a few frames, never pins
  function wallCushion(pos) {
    const ci = cellIndex(pos);
    if (ci === -1) return pos;
    const narrow = openCount(ci) <= 3;
    const margin = cellSide * (narrow ? 0.6 : 0.95);
    let px = 0, py = 0, pz = 0;
    const seen = new Set([ci]);
    const consider = (w) => {
      const c = graph.centers[w];
      const d = dist3(pos, c);
      if (d >= margin) return;
      const away = sub3(pos, c);
      const n = norm3(pos);
      const tg = sub3(away, scale3(n, dot3(away, n)));
      const l = len3(tg);
      if (l < 1e-9) return;
      const f = (margin - d) / margin;
      px += (tg[0] / l) * f; py += (tg[1] / l) * f; pz += (tg[2] / l) * f;
    };
    for (const nb of graph.adj[ci]) {
      if (seen.has(nb)) continue;
      seen.add(nb);
      if (dungeon.tags[nb] === BLOCKED) { consider(nb); continue; }
      if (!narrow) {
        for (const nb2 of graph.adj[nb]) {
          if (seen.has(nb2)) continue;
          seen.add(nb2);
          if (dungeon.tags[nb2] === BLOCKED) consider(nb2);
        }
      }
    }
    const mag = Math.hypot(px, py, pz);
    if (mag < 1e-9) return pos;
    const step = Math.min(mag * cellSide * 0.3, cellSide * 0.035);
    return norm3(add3(pos, scale3([px / mag, py / mag, pz / mag], step)));
  }

  // held-key state: steering and pace are continuous while held, not nudges
  const keys = { left: false, right: false, fast: false, slow: false, laser: false,
    droneUp: false, droneDown: false };   // the last two only while flying Isao
  // CRUISE: player-triggered auto-forward. A quick double-tap of the
  // forward control (W / ▲) toggles it; S/▼ always kills it.
  let cruise = false;
  // THROTTLE — one lever replacing the ▲/▼ pair. It HOLDS where you put it,
  // so setting it IS cruise; there is no separate mode to engage. Reverse is
  // the same lever continued below zero and capped: backing up cannot match
  // going forward. The zero detent sits proportionally, so the shorter
  // reverse travel shows you that before you try it.
  const THROTTLE_REV = 0.4;                       // reverse ceiling vs forward
  const THROTTLE_ZERO = 1 / (1 + THROTTLE_REV);   // where 0 sits down the track
  let throttle = 0;
  let lastFastTap = -9; // seconds
  function noteFastTap() {
    const s = performance.now() / 1000;
    if (s - lastFastTap < 0.35) cruise = !cruise;
    lastFastTap = s;
  }
  let steerHold = 99; // seconds since the user last steered
  const steeringActive = () => steerHold < 1.2;
  let autoMode = false; // AUTO is opt-in (the directive chip); MANUAL is sticky
  const manualActive = () => !autoMode;

  // --- THE CONTROLS-DEAD PROBE --------------------------------------------
  // Operator, recurring and never reproduced: after a game ends or a tank
  // dies, WASD sometimes does nothing until they fiddle, and AUTO sometimes
  // frees it. Every guess at a fix would be a guess at WHICH of eight gates
  // is latched, so this reports the gate instead. CTL_DEBUG turns the log on
  // for a session; the watchdog below fires on the symptom itself, so the
  // report can come from a phone in real play rather than a repro here.
  // read from location directly: urlParams is declared far below this point,
  // and a const in its temporal dead zone throws at init rather than reading
  // as undefined — the whole tab would fail to boot
  const CTL_DEBUG = /[?&]ctl(probe)?=/.test(location.search);
  // RUN GENERATION. Deferred work started by one run must never land on the
  // next: a timer that repositions the tank is a timer that can reposition
  // somebody else's tank. Bumped by regenerate.
  let runGen = 0;
  let deployCount = 0;
  // counted separately: a death-hold deploy is the one that must never
  // cross a run, and a fresh run's own deploy would mask it in a total
  let tankLostDeploys = 0;
  const ctlState = (tag) => `CTL[${tag}] gen=${runGen} deploys=${deployCount}`
    + ` won=${player.won} down=${playerDown} next=${player.next}`
    + ` free=${player.freeMode} cur=${player.cur}`
    + ` auto=${autoMode} cruise=${cruise} deploying=${deployActive()}`
    + ` throttle=${throttle.toFixed(2)} keys=${Object.entries(keys)
      .filter(([, v]) => v).map(([k2]) => k2).join('+') || '-'}`
    + ` paused=${paused} tutFrozen=${tutorial.frozen}`
    + ` shot=${shotId() || '-'}`
    + ` buildMode=${buildMode} active=${active}`;
  const ctlLog = (tag) => { if (CTL_DEBUG) console.log(ctlState(tag)); };
  // THE WATCHDOG. It watches for the symptom as the player describes it —
  // asking the tank to move and the tank not moving — rather than for any
  // one cause, and prints the whole gate row when it happens. Always on:
  // the bug is rare and lives on the operator's phone, so a probe that only
  // runs under a flag is a probe that will never see it. One line per
  // episode (re-armed only after the tank moves again), so a genuinely
  // wedged hull cannot flood the console.
  let ctlStillFor = 0, ctlBarked = false;
  const ctlLastPos = [0, 0, 0];
  // RAW INPUT, READ BEFORE ANYTHING CAN SWALLOW IT. The first cut of this
  // watchdog asked `keys.fast || ...`, which is the game's BELIEF about the
  // input — so the one failure mode that matters most, a capture-phase
  // listener eating keydown before the game ever sees it, made the watchdog
  // go quiet instead of loud. Registered at init, so it sits ahead of any
  // listener a cinematic adds later and records the press either way.
  let ctlRawT = -9, ctlRawKey = '';
  const CTL_DRIVE_KEYS = ['w', 's', 'a', 'd',
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
  addEventListener('keydown', (ev) => {
    const k = (ev.key || '').toLowerCase();
    if (CTL_DRIVE_KEYS.includes(k)) { ctlRawT = performance.now() / 1000; ctlRawKey = k; }
  }, true);
  let ctlSwallowBarked = false;
  function ctlWatch(dt) {
    // what the player is asking for, not what the game decided to do with it
    const asking = keys.fast || keys.slow || cruise || throttle !== 0;
    const moved = Math.abs(player.pos[0] - ctlLastPos[0])
      + Math.abs(player.pos[1] - ctlLastPos[1])
      + Math.abs(player.pos[2] - ctlLastPos[2]);
    ctlLastPos[0] = player.pos[0]; ctlLastPos[1] = player.pos[1]; ctlLastPos[2] = player.pos[2];
    // a real drive step is orders of magnitude above this; the threshold is
    // here so hover bob and cushion nudges do not read as movement
    if (moved > cellSide * 1e-4) { ctlStillFor = 0; ctlBarked = false; return; }
    if (!asking || player.won || paused) { ctlStillFor = 0; return; }
    ctlStillFor += dt;
    // INPUT SWALLOWED: the player is pressing a drive key and the game's
    // key state never sees it. Reported separately because it is a different
    // fault from a latched gate — something is eating the event.
    const rawAge = performance.now() / 1000 - ctlRawT;
    const gameSees = keys.fast || keys.slow || keys.left || keys.right;
    if (rawAge < 0.5 && !gameSees && !ctlSwallowBarked) {
      ctlSwallowBarked = true;
      console.log(`CTL-SWALLOWED raw '${ctlRawKey}' pressed but keys are all`
        + ` false — something is eating keydown. ${ctlState('swallowed')}`);
    }
    if (gameSees) ctlSwallowBarked = false;
    // a second of asking is well past a wall bump or a frozen beat
    if (ctlStillFor > 1.0 && !ctlBarked) {
      ctlBarked = true;
      console.log(`CTL-DEAD asked ${ctlStillFor.toFixed(1)}s, no motion — ${ctlState('dead')}`);
    }
  }

  const camGoal = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  // two more of the same, for blending between two framings (the cold open)
  // two spare pose slots, for blending one framing into another
  const camA = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  const camB = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  const tmpObj = new THREE.Object3D();
  // lookAt convention trap: a plain Object3D faces +Z at the target, but a
  // camera renders down -Z (three.js special-cases isCamera in lookAt).
  // The camera goal quaternion MUST come from a camera instance, or the view
  // ends up rotated 180° — staring backward along the heading.
  const tmpCam = new THREE.PerspectiveCamera();

  // --- colors: everything visual comes from the active look ----------------
  const look = () => LOOKS[params.look] || LOOKS.solid;
  const rgbOf = (hex) => {
    const c = new THREE.Color(hex);
    return [c.r, c.g, c.b];
  };
  let zoneColors = null; // per-cell [r,g,b] field for zonal looks (tronColors)
  // wall-top treatment: the look supplies a default, the dropdown overrides
  const wallTopMode = () => (params.wallTops === 'auto'
    ? (look().wallTopMode || 'bright') : params.wallTops);

  function floorColorOf(ci) {
    const F = look().floors;
    if (ci === dungeon.heart) return F.heartFloor;
    if (ci === dungeon.spawn) return F.spawn;
    const zs = look().zones;
    if (zs && zoneColors) {
      const lv = player.visited.has(ci) ? zs.floorLevels.visited
        : dungeon.tags[ci] === ROOM ? zs.floorLevels.room : zs.floorLevels.path;
      return [zoneColors[ci * 3] * lv, zoneColors[ci * 3 + 1] * lv, zoneColors[ci * 3 + 2] * lv];
    }
    if (player.visited.has(ci)) return F.visited;
    return dungeon.tags[ci] === ROOM ? F.room : F.path;
  }

  // --- geometry ------------------------------------------------------------
  function buildGeometry() {
    const { vertices, quads } = mesh;
    const H = 1 + params.wallHeight;
    const jr = mulberry32(params.seed ^ 0xc0ffee);

    const mode = wallTopMode();
    const E = look().edges;
    // zonal looks: bake the per-cell color field once per build — seeded
    // accent centers, gaussian angular falloff, blended against the base
    zoneColors = null;
    if (look().zones) {
      const zs = look().zones;
      const zrng = mulberry32((params.seed ^ 0x7c0104) >>> 0);
      const centers = [];
      for (const [hex, count, sigma] of zs.accents) {
        for (let k = 0; k < count; k++) {
          const zz = 2 * zrng() - 1;
          const th = 2 * Math.PI * zrng();
          const rr = Math.sqrt(Math.max(0, 1 - zz * zz));
          centers.push({ d: [rr * Math.cos(th), zz, rr * Math.sin(th)], c: rgbOf(hex), s: sigma });
        }
      }
      const bc = rgbOf(zs.base);
      zoneColors = new Float32Array(quads.length * 3);
      for (let ci = 0; ci < quads.length; ci++) {
        const u = graph.normals[ci];
        let r = bc[0] * zs.baseWeight, g = bc[1] * zs.baseWeight, b = bc[2] * zs.baseWeight;
        let W = zs.baseWeight;
        for (const cn of centers) {
          const dv = Math.max(-1, Math.min(1, u[0] * cn.d[0] + u[1] * cn.d[1] + u[2] * cn.d[2]));
          const w = Math.exp(-((Math.acos(dv) / cn.s) ** 2));
          r += cn.c[0] * w; g += cn.c[1] * w; b += cn.c[2] * w; W += w;
        }
        zoneColors[ci * 3] = r / W;
        zoneColors[ci * 3 + 1] = g / W;
        zoneColors[ci * 3 + 2] = b / W;
      }
    }
    const constEdge = rgbOf(E.color);
    const edgeTint = (ci) => (zoneColors
      ? [zoneColors[ci * 3], zoneColors[ci * 3 + 1], zoneColors[ci * 3 + 2]]
      : constEdge);
    const baseTop = look().walls.top;
    const topFill = mode === 'black' ? [0, 0, 0]
      : mode === 'dim' ? [baseTop[0] * 0.45, baseTop[1] * 0.45, baseTop[2] * 0.45]
      : baseTop;
    // TD's buildable-frontier read: in black mode, wall tops that BORDER a
    // hallway glow dim — exactly the cells towers may mount — while the
    // interior wall mass stays void. The map itself teaches where to build.
    const frontierTop = [baseTop[0] * 0.5, baseTop[1] * 0.5, baseTop[2] * 0.5];
    const topJitter = mode === 'black' ? 0 : 1;
    // floors: open cells at the surface
    const fPos = [], fCol = [], ePos = [], eColA = [], tPos = [], tColA = [];
    // Every interior edge belongs to TWO cells, and each cell emits its own
    // four boundary edges — so without this, half the segments are drawn
    // twice. The edge material is ADDITIVE, so duplicates SUM: a shared
    // edge renders at 2x, and at a vertex, where several already-doubled
    // edges converge on one pixel, brightness stacked up to 14x. That blew
    // past the bloom threshold the edge midspans stayed under, which is
    // what put a bloomed square on every vertex of the floor.
    // One Set for both meshes: a rim segment must not be re-drawn as a
    // wall-top wire either.
    const seenSeg = new Set();
    const firstTime = (p, q2) => {
      const k = segKey(p, q2);
      if (seenSeg.has(k)) return false;
      seenSeg.add(k);
      return true;
    };
    const pushEdge = (p, q2, ci) => {
      if (!firstTime(p, q2)) return;
      ePos.push(p[0], p[1], p[2], q2[0], q2[1], q2[2]);
      const c = edgeTint(ci);
      eColA.push(c[0], c[1], c[2], c[0], c[1], c[2]);
    };
    const pushTopEdge = (p, q2, ci) => {
      if (!firstTime(p, q2)) return;
      tPos.push(p[0], p[1], p[2], q2[0], q2[1], q2[2]);
      const c = edgeTint(ci);
      tColA.push(c[0], c[1], c[2], c[0], c[1], c[2]);
    };
    floorOffsets = new Map();
    for (let ci = 0; ci < quads.length; ci++) {
      if (dungeon.tags[ci] === BLOCKED) continue;
      const q = quads[ci];
      floorOffsets.set(ci, fPos.length / 3);
      const [r, g, b] = floorColorOf(ci);
      const j = (jr() - 0.5) * 0.05 * look().jitter;
      for (const vi of [q[0], q[1], q[2], q[0], q[2], q[3]]) {
        const p = vertices[vi];
        fPos.push(p[0], p[1], p[2]);
        fCol.push(r + j, g + j, b + j);
      }
      for (let i = 0; i < 4; i++) pushEdge(vertices[q[i]], vertices[q[(i + 1) % 4]], ci);
    }

    // walls: blocked cells extruded; top face + skirts on edges facing open cells
    const wPos = [], wCol = [];
    const edgeToCell = new Map();
    for (let ci = 0; ci < quads.length; ci++) {
      const q = quads[ci];
      for (let i = 0; i < 4; i++) {
        const a = q[i], b = q[(i + 1) % 4];
        edgeToCell.set(`${a}-${b}`, ci); // directed edge -> owning cell
      }
    }
    const pushQuad = (p0, p1, p2, p3, col, j) => {
      for (const p of [p0, p1, p2, p0, p2, p3]) wPos.push(p[0], p[1], p[2]);
      for (let i = 0; i < 6; i++) wCol.push(col[0] + j, col[1] + j, col[2] + j);
    };
    for (let ci = 0; ci < quads.length; ci++) {
      if (dungeon.tags[ci] !== BLOCKED) continue;
      const q = quads[ci];
      const top = q.map((vi) => scale3(vertices[vi], H));
      const j = (jr() - 0.5) * 0.08 * look().jitter;
      const nearHall = mode === 'black'
        && graph.adj[ci].some((nb) => dungeon.tags[nb] !== BLOCKED);
      pushQuad(top[0], top[1], top[2], top[3], nearHall ? frontierTop : topFill, j * topJitter);
      // wall-top wires split by audience: rim segments over open cells are
      // part of the wall's silhouette (always drawn, main edge set);
      // interior top wires go to their own dimmable mesh — bright/dim/black
      // is what makes walls read as wire, faint slab, or void on the minimap
      for (let i = 0; i < 4; i++) {
        const a = q[i], b = q[(i + 1) % 4];
        const nb = edgeToCell.get(`${b}-${a}`); // twin edge's owner
        const facesOpen = nb !== undefined && dungeon.tags[nb] !== BLOCKED;
        if (facesOpen) {
          // skirt facing the open neighbour, wound outward + its outline
          const sideCol = zoneColors
            ? [zoneColors[ci * 3] * look().zones.wallSideLevel * 10,
               zoneColors[ci * 3 + 1] * look().zones.wallSideLevel * 10,
               zoneColors[ci * 3 + 2] * look().zones.wallSideLevel * 10]
            : look().walls.side;
          pushQuad(top[(i + 1) % 4], top[i], vertices[a], vertices[b], sideCol, j);
          pushEdge(top[i], vertices[a], ci);
          pushEdge(top[(i + 1) % 4], vertices[b], ci);
          pushEdge(top[i], top[(i + 1) % 4], ci);
        } else {
          pushTopEdge(top[i], top[(i + 1) % 4], ci);
        }
      }
    }

    for (const [geo, obj] of [[floorGeo, floorMesh], [wallGeo, wallMesh], [edgeGeo, edgeMesh], [topGeo, topMesh]]) {
      if (obj) scene.remove(obj);
      if (geo) geo.dispose();
    }
    const faceMat = () => new THREE.MeshLambertMaterial({
      vertexColors: true,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    });
    floorGeo = new THREE.BufferGeometry();
    floorGeo.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
    floorGeo.setAttribute('color', new THREE.Float32BufferAttribute(fCol, 3));
    floorGeo.computeVertexNormals();
    floorMesh = new THREE.Mesh(floorGeo, faceMat());
    scene.add(floorMesh);

    wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
    wallGeo.setAttribute('color', new THREE.Float32BufferAttribute(wCol, 3));
    wallGeo.computeVertexNormals();
    wallMesh = new THREE.Mesh(wallGeo, faceMat());
    scene.add(wallMesh);

    edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(ePos, 3));
    edgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(eColA, 3));
    edgeMesh = new THREE.LineSegments(edgeGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: E.opacity,
        blending: E.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: !E.additive,
      }));
    edgeMesh.visible = E.show;
    scene.add(edgeMesh);

    topGeo = new THREE.BufferGeometry();
    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(tPos, 3));
    topGeo.setAttribute('color', new THREE.Float32BufferAttribute(tColA, 3));
    topMesh = new THREE.LineSegments(topGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true,
        opacity: E.opacity * (mode === 'dim' ? 0.28 : 1),
        blending: E.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: !E.additive,
      }));
    topMesh.visible = E.show && mode !== 'black';
    scene.add(topMesh);
  }

  function paintCell(ci, rgb) {
    const start = floorOffsets.get(ci);
    if (start === undefined) return;
    const attr = floorGeo.getAttribute('color');
    for (let v = 0; v < 6; v++) {
      attr.setXYZ(start + v, rgb[0], rgb[1], rgb[2]);
    }
    attr.needsUpdate = true;
  }

  // --- heart & player objects ---------------------------------------------


  function buildActors() {
    for (const o of [heartSprite, playerMesh, markerMesh, serverObj]) if (o) scene.remove(o);
    for (const c of lifeContainers) scene.remove(c.obj);
    lifeContainers = [];
    serverObj = null; serverFound = false;

    // the Braille heart: dot-cloud cycling twinkle → breathe → jelly,
    // flaring orange/red under Wave when hit
    // the fallback is always the dot cloud: an async model must never leave
    // the pole empty, and the Heart is the thing the whole board defends
    const hl = heartLook();
    const built = hl.make();          // null while an async model is still loading
    heartSprite = built || makeHeartCloud(new THREE.Color(look().heart).getHex());
    scene.add(heartSprite);
    if (!built) {
      // bytes not in yet — build the cloud now, swap when they land
      const want = params.heartLook;
      const hgen = ++heartGen;
      hl.preload().then(() => {
        if (hgen !== heartGen || want !== params.heartLook) return; // board moved on
        const built = hl.make();
        if (!built) return;
        scene.remove(heartSprite);
        heartSprite = built;
        scene.add(heartSprite);
        heartSprite.layers.enable(MAP_LAYER);
        placeActors();
      });
    }
    // the server sits at the cell whose centre is FARTHEST round the
    // sphere from the heart — the literal antipode, found by minimum dot
    {
      // serverCi was chosen at world build (applySector needs it);
      // this block only casts and seats the model
      // THE LIFE CONTAINERS v2 (operator's staging): TWO containers, side
      // by side on the EMPTIEST flank of the heart's chamber — adjacent
      // open cells at distToHeart 2-3, the pair chosen for the fewest
      // open neighbours (a wall-side berth, clear of the lanes). Two
      // hull bays per container; the run's spare tanks rack there, and
      // every spawn — first scene included — drives OUT of a container.
      const cgen = serverGen + 1; // the value ++serverGen produces below
      preloadContainer().then(() => {
        if (cgen !== serverGen || !dungeon) return; // board changed since
        // the camp was chosen with the board; this only casts the boxes
        if (berths.length !== 3) return;
        for (let bi = 0; bi < berths.length; bi++) {
          const ci = berths[bi].ci;
          // THE DOORS FACE THE LANE THE HULL LEAVES BY. They used to face
          // the Heart, which is only ever approximately the way out: the
          // exit is a graph neighbour and can sit 40-odd degrees off that
          // bearing, so the hull drove out on a diagonal and clipped its own
          // door frame (operator, twice). Aim the box at the actual exit and
          // the two are the same line by construction. Most-heartward escape
          // wins, so the row still faces home.
          // the exit is CARRIED, not re-derived here: computeBerths picked
          // it, the doors point at it and DEPLOY drives at it, and those
          // three must never disagree
          const exitCi = berths[bi].exit;
          const ec = graph.centers[exitCi];
          const g = makeContainerFixture(bi + 1); // painted 1-2-3, left to right
          if (!g) break;
          const c = graph.centers[ci];
          const nrm2 = graph.normals[ci];
          // SHALLOW: the full-length box hid its cargo in shadow (operator
          // report). Depth squashed to 0.55 — one hull fits, and you can
          // SEE it from the doors.
          g.scale.set(cellSide * 0.9, cellSide * 0.9, cellSide * 0.9 * 0.55);
          g.position.set(c[0], c[1], c[2]);
          // doors onto the exit lane: the bays still face home, and now the
          // hull's first metre is a straight line through its own doorway
          tmpObj.position.copy(g.position);
          tmpObj.up.set(nrm2[0], nrm2[1], nrm2[2]);
          tmpObj.lookAt(ec[0], ec[1], ec[2]);
          g.quaternion.copy(tmpObj.quaternion);
          const tank = buildCreature('mkcx', look());
          tank.scale.setScalar(0.32);
          // counter-stretch: the parent's z-squash would flatten the hull
          tank.scale.z /= 0.55;
          // AT THE DOORS, not in the middle (operator, 2026-08-31: you could
          // not see there was a hull in there). The fitted box runs z ±0.80
          // with the doors at +z and the hull is ~0.29 long in the same
          // units, so 0.52 puts its nose on the door plane and its whole
          // body in the light.
          tank.position.set(0, 0.12, 0.52);
          g.add(tank);
          scene.add(g);
          // the exit is CARRIED, not re-derived: the doors point at it and
          // the respawn drives at it, and those two must never disagree
          lifeContainers.push({ obj: g, tanks: [tank], ci, exit: exitCi });
        }
        syncLifeContainers();
        // the FIRST SCENE: the opening hull drives out of its bay — if
        // the player has not yet gone anywhere, restage them at the doors
        // ?driveout=N — the operator's can't-get-out report, made testable.
        // Headless cannot drive, and ?tick runs at init, BEFORE this model
        // has loaded, so the one moment the question can be asked is here:
        // simulate N seconds of auto motion from the berth and print the
        // cells actually reached. A path of one cell means still stuck.
        const doN = parseFloat(urlParams.get('driveout') || '0');
        if (doN > 0) {
          const from = player.cur;
          const seen = [from];
          for (let sT = 0; sT < doN; sT += 0.05) {
            advanceMotion(0.05);
            if (player.cur !== seen[seen.length - 1]) seen.push(player.cur);
          }
          placeActors();
          console.log(`DRIVEOUT from=${from}`
            + ` berthed=${lifeContainers.some((cc) => cc.ci === from)}`
            + ` cells=${seen.length} path=${seen.join('>')}`
            + ` next=${player.next} prog=${player.prog.toFixed(3)}`
            + ` won=${player.won} down=${playerDown} free=${player.freeMode}`
            + ` auto=${autoMode} exits=${openNeighbors(from).join('/')}`);
        }
        // escapes=a,b,c is the invariant the operator's can't-get-out report
        // turned into a rule: every berth must show at least 1, or auto-nav
        // has nowhere to steer and the hull sits in the box forever
        console.log(`CONTAINERS placed=${lifeContainers.length}`
          + ` cells=${berths.map((b2) => b2.ci).join(',')}`
          + ` spares=${Math.max(0, playerHP - 1)}`
          + ` exits=${berths.map((b2) => b2.exit).join(',')}`);
      });
      const gen = ++serverGen;
      preloadServer().then(() => {
        if (gen !== serverGen || serverCi < 0) return; // board changed meanwhile
        const g = makeServerFixture();
        if (!g) return;
        const sn = graph.normals[serverCi];
        g.scale.setScalar(cellSide * 2.0);
        tmpN.set(sn[0], sn[1], sn[2]);
        g.quaternion.setFromUnitVectors(Y_AXIS, tmpN);
        scene.add(g);
        serverObj = g;
        syncServerLift();
      });
    }

    playerSize = Math.min(cellSide, params.wallHeight * 0.75);

    // the main unit: dot-cloud creatures keep the full Wave×Jelly +
    // phagocytosis path (creatureBase/creatureGeo); mesh units are static
    // geometry with transform-only idle animation (userData.tick)
    if ((UNITS[params.creature] || {}).kind === 'cloud') {
      creatureBase = CREATURES[params.creature]();
      creaturePos = new Float32Array(creatureBase.length * 3);
      waveJelly(creatureBase, 0, creaturePos);
      const cols = new Float32Array(creatureBase.length * 3);
      const cBody = new THREE.Color(look().walker);
      const cHi = new THREE.Color(look().walkerHi);
      for (let i = 0; i < creatureBase.length; i++) {
        const c = creatureBase[i][3] === 1 ? cHi : cBody;
        cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
      }
      creatureGeo = new THREE.BufferGeometry();
      creatureGeo.setAttribute('position', new THREE.BufferAttribute(creaturePos, 3));
      creatureGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      playerMesh = new THREE.Points(creatureGeo, new THREE.PointsMaterial({
        size: 2.2, sizeAttenuation: false, vertexColors: true,
        transparent: true, opacity: 0.95,
      }));
    } else {
      creatureBase = null;
      creaturePos = null;
      creatureGeo = null;
      playerMesh = buildCreature(params.creature, { walker: look().walker, walkerHi: look().walkerHi });
      playerMesh.scale.setScalar(playerMesh.userData.baseScale); // reset sizing
    }
    scene.add(playerMesh);

    // minimap self-marker: a fat arrowhead nosing along the heading — the
    // map is heading-up, so YOU are the big pulsing arrow pointing up.
    // Sized against the SPHERE, not the cell: the map always frames the
    // whole ball, so cell-relative sizes vanish on dense boards.
    // Geometry pre-rotated so the cone's nose is +Z (lookAt convention).
    // The radar draws YOU itself now. The arrow survives because
    // placeActors drives its transform every frame — parked on the map
    // layer, which nothing renders, so it stays invisible instead of
    // suddenly appearing in the WORLD when the map renderer went away.
    markerMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.115, 4).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: look().marker }),
    );
    markerMesh.layers.set(MAP_LAYER);
    scene.add(markerMesh);
    // Layer 1 is the map's world. Everything here is drawn in BOTH views;
    // everything not here is main-view only, which is the whole saving.
    // Layers are per-object and not inherited, so each one says so itself.
    for (const o of [floorMesh, wallMesh, edgeMesh, topMesh, heartSprite]) {
      if (o) o.layers.enable(MAP_LAYER);
    }
  }

  function placeActors() {
    const hc = graph.centers[dungeon.heart];
    const hn = graph.normals[dungeon.heart];
    const hlp = heartLook();
    const hPos = add3(hc, scale3(hn, params.wallHeight * 0.6 + cellSide * hlp.lift));
    heartSprite.position.set(hPos[0], hPos[1], hPos[2]);
    heartSprite.userData.sizeScale = cellSide * hlp.scale;
    // APPLY IT NOW, not on the next frame. Both looks only read sizeScale
    // inside tick(), so a freshly built Stalheart stands at its raw model
    // size until the frame loop reaches it — which for the Terraformer is
    // 2 world units, about THIRTY cells across. One tick settles it before
    // anything is drawn.
    if (heartSprite.userData.tick) heartSprite.userData.tick(simTime);
    tmpN.set(hn[0], hn[1], hn[2]);
    heartSprite.quaternion.setFromUnitVectors(Y_AXIS, tmpN);

    const n = norm3(player.pos);
    // lift: the unit's own floor offset plus its hover profile
    const prof = MOVES[params.creature];
    const baseLift = creatureGeo ? 0.85 : (playerMesh.userData.lift ?? 0.05);
    const lift = unitScale * (baseLift + (prof ? prof.hover(simTime) : 0));
    let p = add3(player.pos, scale3(n, lift));
    // recoil, reworked: the TURRET takes the kick — it slams back with a
    // high-frequency shudder — while the hull only rocks (pitch below) and
    // shifts a touch. Whole-body translation alone read as sliding, not
    // firing. k scales everything through the 'shell recoil' dial.
    const rf = recoilFactor();
    const rk = params.recoil * rf * rf;
    if (rf > 0) p = add3(p, scale3(player.smoothDir, -unitScale * 0.06 * rk));
    playerMesh.position.set(p[0], p[1], p[2]);
    playerMesh.scale.setScalar(unitScale * (playerMesh.userData.baseScale ?? 1));
    // the energy shield rides the hull: positioned every frame, ticking
    // its shimmer, gone the moment its clock runs out
    if (shieldT > 0) {
      if (!shieldObj) {
        shieldObj = makeShieldShell();
        scene.add(shieldObj);
      }
      shieldObj.visible = true;
      const sp2 = add3(player.pos, scale3(n, lift * 0.9));
      shieldObj.position.set(sp2[0], sp2[1], sp2[2]);
      shieldObj.quaternion.copy(playerMesh.quaternion);
      // sized off the CELL, not unitScale — measured on screen, unitScale
      // put the bubble five cells wide (the mkcx normalization rides it)
      shieldObj.scale.setScalar(cellSide * 0.85);
      shieldObj.userData.tick(simTime, shieldT / SHIELD_TIME);
    } else if (shieldObj) shieldObj.visible = false;
    // marker floats above the wall tops so nothing on the map occludes it
    const mp = scale3(player.pos, 1 + params.wallHeight * 1.6);
    markerMesh.position.set(mp[0], mp[1], mp[2]);
    // upright on the surface, facing the SMOOTHED direction (no snap)
    const h = player.smoothDir;
    tmpObj.position.copy(playerMesh.position);
    tmpObj.up.set(n[0], n[1], n[2]);
    tmpObj.lookAt(p[0] + h[0], p[1] + h[1], p[2] + h[2]);
    playerMesh.quaternion.copy(tmpObj.quaternion);
    // no extra rotation: lookAt with up=n already leaves body +Y ≈ normal
    // — except the recoil rock: a nose-up pitch that eases back down
    // Units with a hover body get their pitch from tankfeel (on the body, a
    // child group, where writing rotation is safe). For the rest, compose it
    // onto the unit — rotateX composes, an Euler write would REPLACE the
    // lookAt quaternion set two lines above.
    if (rf > 0 && !playerMesh.userData.hoverBody) playerMesh.rotateX(-0.05 * rk);
    // touchdown: a damped rock on two axes, ~0.9s. Two different frequencies
    // so it reads as suspension settling rather than a single clean wobble.
    // Hover, vibration and touchdown live on the BODY, not the unit — the
    // hull lifts off a planted skirt. Applied here rather than in
    // updateEngine so it survives every rebuild of playerMesh.
    feel.recoil = recoilLeft;   // the game owns the clock; tankfeel draws it
    applyTankFeel(playerMesh, feel, FEEL);
    applyTankHealth(playerMesh, playerHP / PLAYER_MAX);
    markerMesh.quaternion.copy(tmpObj.quaternion); // arrow nose = heading
  }

  // --- trench / third-person camera ----------------------------------------
  // follows the interpolated position and the SMOOTHED direction
  // --- TD modes: BUILD (top-down planning) vs ACTION (the heart rig) -----
  // B toggles; the shared camGoal + the loop's lerp gives the eased
  // no-cut transition for free. M swaps the minimap for the Heart
  // threat view. Build FREEZES the war only when the field is clear —
  // mid-assault it is camera-only (no combat escape hatch).
  let buildMode = false;
  // SECTOR REVEAL: a short full-planet beat after each clear — the camera
  // pulls out to frame the whole world, aimed at the freshly-unsealed
  // band, whose floors burn hot until the beat ends (then build mode).
  // --- camShot: ONE timed camera override, ONE teardown ------------------
  // Every timed camera takeover in this tab used to own its own clock, its
  // own skip listeners and its own teardown — and each teardown was a fresh
  // chance to get it wrong. One did: endCinematic() guarded on
  // `cineLeft <= 0` while the frame loop had already driven it there, so it
  // returned BEFORE removing a capture-phase keydown handler that
  // preventDefaults and stopImmediatePropagations. That handler then ate
  // every key in the game, permanently, and the briefing it was fronting
  // never opened (operator: "I still cannot move after the cinematic").
  //
  // So: one shot at a time, one teardown path, and the latch is the shot
  // ITSELF — never a clock somebody else has already advanced past.
  let shot = null;        // { id, dur, left, poseAt, onEnd, skippable }
  let shotHold = false;   // ?cine=N parks the clock for a screenshot
  const shotActive = () => shot !== null;
  const shotId = () => (shot ? shot.id : null);

  function startShot({ id, dur, poseAt, onEnd = null, skippable = true }) {
    endShot();   // one at a time, and the outgoing one always tears down
    shot = { id, dur: Math.max(1e-3, dur), left: Math.max(1e-3, dur),
      poseAt, onEnd, skippable };
    if (skippable) {
      addEventListener('keydown', shotSkipKey, true);
      root.addEventListener('pointerdown', shotSkipTap, true);
    }
    snapCamera();   // no glide in: the shot owns frame one
  }

  // Idempotent, and latched on `shot` — the RESOURCE — not on a countdown.
  // `shot` is cleared before onEnd runs, so a shot whose ending starts
  // another shot cannot recurse into its own teardown.
  function endShot() {
    if (!shot) return;
    const s = shot;
    shot = null;
    removeEventListener('keydown', shotSkipKey, true);
    root.removeEventListener('pointerdown', shotSkipTap, true);
    if (s.onEnd) s.onEnd();
  }

  // skippable by anything: a shot you cannot cut is one you resent the
  // second time you see it
  const shotSkipKey = (ev) => {
    if (!shot || !shot.skippable) return;
    ev.preventDefault(); ev.stopImmediatePropagation(); endShot();
  };
  const shotSkipTap = (ev) => {
    if (!shot || !shot.skippable) return;
    ev.stopImmediatePropagation(); endShot();
  };

  function stepShot(dt) {
    if (!shot || shotHold) return;
    shot.left -= dt;
    if (shot.left <= 0) endShot();
  }

  const REVEAL_LEN = 3.2;
  let revealDir = null;
  let revealCells = [];

  // --- THE COLD OPEN -------------------------------------------------------
  // Operator (2026-08-31): the run opens on a cinematic, tutorial or not.
  // Three beats, and they are the three things a player needs to know before
  // anything else: WHERE you are (pull back until the whole vessel is in
  // frame), WHERE you start (dive onto the berth row), and WHO you are (the
  // hero hull drives itself out of berth 3 while you watch).
  //
  // Beat three is not animation. Driving is unfrozen for it and the tank is
  // Two beats now, not three. The old beat 3 — hold the hull frozen and
  // watch it drive itself out — IS the game: DEPLOY does that live, with the
  // player's hand a moment away. So the cinematic ends where DEPLOY begins,
  // and its last frame is the game's first frame.
  const CINE_OUT = 3.0, CINE_DIVE = 3.4;
  const CINE_LEN = CINE_OUT + CINE_DIVE;

  function playCinematic(after, scrub = 0) {
    const n = berthIndexFor(playerHP);
    if (!graph || !dungeon || !berths[n]) { if (after) after(); return; }
    const b = berths[n];
    const bc = graph.centers[b.ci];
    const bn = graph.normals[b.ci];
    const ref = Math.abs(bn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const wUp = norm3(cross3(bn, ref));
    const smooth = (x) => x * x * (3 - 2 * x);
    const look = add3(bc, scale3(bn, params.wallHeight * 0.55));
    startShot({
      id: 'cinematic',
      dur: Math.max(0.001, CINE_LEN - scrub),
      poseAt: (u, out) => {
        const e = scrub + u * (CINE_LEN - scrub);
        if (e < CINE_OUT) {
          // BEAT 1 pulls straight out along the berth's own normal, so the
          // wide shot is still centred on the place it is about to dive back
          // into and the pull-back reads as one continuous move.
          const r = 1.26 + (3.30 - 1.26) * smooth(e / CINE_OUT);
          out.pos.set(bn[0] * r, bn[1] * r, bn[2] * r);
          tmpCam.position.copy(out.pos);
          tmpCam.up.set(wUp[0], wUp[1], wUp[2]);
          tmpCam.lookAt(0, 0, 0);
          out.quat.copy(tmpCam.quaternion);
          return;
        }
        // BEAT 2 does NOT slerp between two framings — that swings the
        // subject out of frame in the middle, which is what the first cut of
        // this did. It moves the EYE and keeps looking at the camp the whole
        // way down, so the box only ever grows. The seam with beat 1 is
        // invisible because the wide eye sits ON the berth's normal.
        //
        // It lands on deployFramePoseFor — the SAME pose DEPLOY opens with,
        // read from one place rather than authored twice. That is what makes
        // "the cinematic's last frame is the first frame of the reset state"
        // true by construction instead of true until someone edits one of
        // them.
        const w = smooth(Math.min(1, (e - CINE_OUT) / CINE_DIVE));
        deployFramePoseFor(n, camA);
        const wide = scale3(bn, 3.30);
        out.pos.set(wide[0] + (camA.pos.x - wide[0]) * w,
          wide[1] + (camA.pos.y - wide[1]) * w,
          wide[2] + (camA.pos.z - wide[2]) * w);
        tmpCam.position.copy(out.pos);
        const up = norm3([0, 1, 2].map((i) => wUp[i] + (bn[i] - wUp[i]) * w));
        tmpCam.up.set(up[0], up[1], up[2]);
        tmpCam.lookAt(look[0], look[1], look[2]);
        out.quat.copy(tmpCam.quaternion);
      },
      onEnd: () => { deployStart(n); if (after) after(); },
    });
  }

  // AUTO DIRECTIVES: high-level orders for the wanderer
  const DIRECTIVES = ['wander', 'avoid', 'ram', 'conserve', 'home', 'portal'];
  const DIRECTIVE_LABEL = {
    wander: 'WANDER', avoid: 'AVOID', ram: 'RAM',
    conserve: 'SAVE AMMO', home: 'HOME', portal: 'PORTAL',
  };
  let portalDist = null; // BFS field to the nearest live portal (directive)
  // BASTION view: third-person from behind the Heart — or behind any
  // tower you click while in it. watchTower null = the Heart.
  let watchTower = null;
  let mapMode = 'player'; // 'player' | 'heart'
  let buildDist = 2.0;      // wheel/pinch zooms
  // Build-mode camera orientation, as a PERSISTENT quaternion rather than
  // a centre point with an up-vector derived from the Heart each frame.
  // That derivation (up = hn projected into the tangent plane at c) goes to
  // zero at the antipode, and the old BUILD_CEIL clamp was the only thing
  // keeping us away from it. Free rotation means you can get there, so the
  // frame has to be carried, not re-derived: centre = +Z·buildQ, up = +Y·buildQ.
  const buildQ = new THREE.Quaternion();
  let buildCentered = false;  // framing the Heart is a FIRST-entry courtesy
  const BQ_Z = new THREE.Vector3(0, 0, 1);
  const BQ_Y = new THREE.Vector3(0, 1, 0);
  const bqC = new THREE.Vector3(), bqU = new THREE.Vector3(), bqR = new THREE.Vector3();
  const bqX = new THREE.Vector3(), bqY = new THREE.Vector3(), bqZ = new THREE.Vector3();
  const bqM = new THREE.Matrix4();
  const bqTmp = new THREE.Quaternion();
  const dragUp = new THREE.Vector3(), dragRight = new THREE.Vector3();

  // NOTE: returns shared temporaries — copy out before calling again.
  function buildFrame() {
    bqC.copy(BQ_Z).applyQuaternion(buildQ).normalize();
    bqU.copy(BQ_Y).applyQuaternion(buildQ).normalize();
    bqR.crossVectors(bqU, bqC).normalize();
    return { c: bqC, up: bqU, right: bqR };
  }

  // Frame the Heart: eye on the pole axis, the pole's tangent as up. Sets
  // the GOAL only — the loop's camera slerp (0.14/frame) does the easing,
  // so a recenter rides home over ~0.4s without its own animation.
  function centerBuildOnHeart() {
    followSuspend = false;
    const { hn, t1 } = poleFrame();
    bqZ.set(hn[0], hn[1], hn[2]).normalize();
    bqY.set(t1[0], t1[1], t1[2]);
    bqX.crossVectors(bqY, bqZ).normalize();
    bqY.crossVectors(bqZ, bqX).normalize();
    bqM.makeBasis(bqX, bqY, bqZ);
    buildQ.setFromRotationMatrix(bqM);
  }
  // Build mode drives now, so the free camera has a duty it did not have
  // before: if the tank leaves the frame, swing to bring it back. Top-down
  // is a real control mode only if the thing you are controlling cannot
  // escape the screen. The follow NEVER fights a drag — a finger on the
  // board owns the view outright — and it eases harder the further out the
  // tank is, so a nudge at the edge is gentle and an off-screen tank is not.
  const followQ = new THREE.Quaternion();
  const followV = new THREE.Vector3();
  // A deliberate pan SUSPENDS the follow — on a phone you explore in
  // flicks, and yielding only while a finger was down meant every lift
  // snapped the view straight back to the tank (operator: 'impossible to
  // explore'). Driving again — or an explicit recenter — re-arms it,
  // which keeps top-down as a real control mode exactly when it is one.
  let followSuspend = false;
  // sealed under a round's frontier the relay stands ON the high ground;
  // when its band reveals, it settles onto the lane floor with it
  function syncServerLift() {
    if (!serverObj || serverCi < 0) return;
    const sc = graph.centers[serverCi];
    const sn = graph.normals[serverCi];
    const lift = dungeon.tags[serverCi] === BLOCKED ? params.wallHeight : 0;
    serverObj.position.set(sc[0] + sn[0] * lift, sc[1] + sn[1] * lift, sc[2] + sn[2] * lift);
  }

  function buildFollowTank(dt) {
    if (!buildMode || strike.falling > 0 || !player.pos) return;
    if (buildPointers.size > 0) return;
    if (followSuspend) {
      if (!(steeringActive() || keys.left || keys.right || keys.fast
        || keys.slow || cruise)) return;
      followSuspend = false; // the player is driving — duty resumes
    }
    followV.set(player.pos[0], player.pos[1], player.pos[2]).project(camera);
    const out = Math.max(Math.abs(followV.x), Math.abs(followV.y));
    if (out < 0.78 && followV.z < 1) return;   // comfortably framed
    // target frame: pole on the tank's normal, keeping the current up so
    // the recenter does not roll the world underneath you
    const nrm = norm3(player.pos);
    bqZ.set(nrm[0], nrm[1], nrm[2]);
    bqY.copy(buildFrame().up);
    bqX.crossVectors(bqY, bqZ).normalize();
    bqY.crossVectors(bqZ, bqX).normalize();
    bqM.makeBasis(bqX, bqY, bqZ);
    followQ.setFromRotationMatrix(bqM);
    const k = Math.min(1, (0.4 + Math.max(0, out - 0.78) * 2.5) * dt * 2.4);
    buildQ.slerp(followQ, k).normalize();
  }

  const DTAP_MS = 350, DTAP_PX = 24; // double-tap-to-recenter window
  let lastTap = null;
  const anyHostiles = () => enemies.some((e) => e.alive);

  // --- ONE MODE ------------------------------------------------------------
  // BUILD/MANUAL used to be a mode switch that traded capabilities: build to
  // place towers but lose the fight controls, drive but lose the board. It
  // is gone. There are only CAMERAS now — orbit (the free strategic view,
  // whole planet at arm's length), third, pov, bastion — and every
  // capability works under every one of them: taps open the shop anywhere,
  // the tank drives anywhere, the auto-gunner fights anywhere.
  //
  // `buildMode` survives as a DERIVED value (view === 'orbit') because
  // twenty read-sites — the drag-orbit gestures, the free-cam branch, the
  // follow-cam — mean exactly "is the free camera up", and that meaning is
  // unchanged. It is assigned in ONE place, here.
  function setView(v) {
    // the drone view needs a drone: he is normally on shift from the first
    // second, but a board that has not finished loading his bytes yet would
    // hand you an empty camera. Ask for him, and fall through to orbit —
    // the view he is the diegetic excuse for — until he arrives.
    if (v === 'drone') {
      spawnIsao();
      if (!isao) v = 'orbit';
    }
    // the Stålheart is only worth explaining once it is IN FRAME, and the
    // build view is the first time the player looks down at the pole
    if (v === 'orbit') showBrief('stalheart');
    params.view = v;
    buildMode = v === 'orbit';
    watchTower = null;
    // TWO BUTTONS, not one cycle. A cycle makes you tap through a view you
    // did not want to reach the one you did, which on a phone mid-wave is
    // the difference between a camera and an obstacle (operator).
    const tankBtn = root.querySelector('#td-pad-tank');
    const orbitBtn = root.querySelector('#td-pad-orbit');
    if (tankBtn) tankBtn.classList.toggle('on', v === 'third' || v === 'pov');
    if (orbitBtn) orbitBtn.classList.toggle('on', v === 'orbit');
    // first orbit entry still frames the heart — a free camera pointed at
    // the dark side of a planet is not a view, it is a bug report
    if (buildMode && !buildCentered && graph && dungeon) {
      centerBuildOnHeart();
      buildCentered = true;
    }
    root.classList.toggle('build', buildMode);
    closeShop();   // the shop is screen-anchored; a view change moves its cell
    if (viewCtrl) viewCtrl.updateDisplay();
    updateHud();
  }

  // HOLD is gone (operator call, 2026-08-30): the wave telegraph gives
  // enough warning that a planning pause earned its keep no longer. The
  // constant stays so every gate on `frozen` reads unchanged.
  const buildFrozen = () => false;
  function toggleMap() {
    mapMode = mapMode === 'player' ? 'heart' : 'player';
    updateHud();
  }
  // stable tangent frame at the Heart pole (for both build cam and threat map)
  function poleFrame() {
    const hn = graph.normals[dungeon.heart];
    const ref = Math.abs(hn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const t1 = norm3(cross3(hn, ref));
    const t2 = cross3(hn, t1);
    return { hn, t1, t2 };
  }

  // When true, updateCameraGoal skips its overrides and yields the PLAIN
  // gameplay pose. That is how DEPLOY learns where the camera is going to
  // end up without re-deriving it: the pose is READ from the one function
  // that owns it, so the handover cannot drift from the shot that precedes
  // it. Re-entrant by exactly one level, and only ever set here.
  let camRaw = false;

  // WHERE THE CAMERA WOULD BE WITH NOTHING OVERRIDING IT. Reading the pose
  // instead of authoring a matching one is what makes every hand-off exact:
  // a prelude that ends here cannot drift from the gameplay camera, because
  // it IS the gameplay camera. DEPLOY blends into it; the DOWN DASH will
  // blend into it too, which is why this is a named function and not a trick
  // inside one `if`.
  function gameplayCameraPose(out) {
    camRaw = true;
    updateCameraGoal();
    camRaw = false;
    out.pos.copy(camGoal.pos);
    out.quat.copy(camGoal.quat);
  }

  function updateCameraGoal() {
    // DEPLOY eases the doorway framing into the gameplay framing over its own
    // progress, so at u=1 the two ARE the same pose and handing the controls
    // over changes nothing on screen.
    if (deploy && !camRaw) {
      const w = deployEase();
      deployFramePoseFor(deploy.n, camA);
      gameplayCameraPose(camB);
      camGoal.pos.lerpVectors(camA.pos, camB.pos, w);
      camGoal.quat.copy(camA.quat).slerp(camB.quat, w);
      return;
    }
    if (shot && !camRaw) {
      shot.poseAt(Math.min(1, Math.max(0, 1 - shot.left / shot.dur)), camGoal);
      return;
    }
    if (strike.falling > 0) {
      // riding the munition down: straight along the target cell's normal,
      // altitude easing on a smoothstep — slow at first, fast near impact,
      // which is what falling feels like. Shake is two incommensurate sines
      // (deterministic; render-only) escalating hard past 85%.
      const ci = strike.fallCi;
      const c = graph.centers[ci];
      const nrm = graph.normals[ci];
      const pr = fallProgress(strike);
      const ez = pr * pr * (3 - 2 * pr);
      const alt = 2.6 - (2.6 - params.wallHeight * 3 - cellSide * 0.8) * ez;
      const shakeAmt = (0.004 + 0.012 * pr + (pr > 0.85 ? (pr - 0.85) * 0.25 : 0)) * cellSide * 8;
      const st = performance.now() * 0.001;
      const ref = Math.abs(nrm[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const t1 = norm3(cross3(nrm, ref));
      const t2 = cross3(nrm, t1);
      const sx = Math.sin(st * 47.0) * shakeAmt;
      const sy = Math.sin(st * 31.7) * shakeAmt;
      const eye = add3(scale3(nrm, 1 + alt), add3(scale3(t1, sx), scale3(t2, sy)));
      camGoal.pos.set(eye[0], eye[1], eye[2]);
      tmpCam.position.copy(camGoal.pos);
      tmpCam.up.set(t1[0], t1[1], t1[2]);
      tmpCam.lookAt(c[0], c[1], c[2]);
      camGoal.quat.copy(tmpCam.quaternion);
      return;
    }
    if (params.view === 'drone' && isao) {
      // RIDING ISAO. Purely a camera for now — he still flies his own
      // orders, you are just on board. The point is diegetic: a free look
      // over the whole shell is a strange power for a tank commander to
      // have, and an obvious one for the survey drone that is already up
      // there. The board answers "how are you seeing this" without a menu.
      //
      // Framed from behind and slightly above his rotor plane, looking
      // where HE is looking: the site on the way out, the print while he
      // works, his drift while he waits. That means the shot is composed by
      // the job rather than by the camera, which is the whole reason to
      // hang a view on a working machine instead of on a free gimbal.
      const bp = isao.obj.position;
      const up = isao.dir;
      // FORWARD IS WHERE THE PILOT IS POINTING — one notion of forward,
      // shared by the stick and the lens.
      //
      // This used to be derived from the JOB (the order's cell, or
      // isao.loiter), which was right when the comment above was written and
      // this view really was only a camera riding along. Piloting arrived
      // later and the camera was never told. Two consequences, both reported
      // by the operator and both measured by ?droneprobe=1: steering swung
      // his heading and the view never followed (camera-swing 0.0deg, so
      // sideways felt dead), and after a turn W flew him off the BACK of the
      // screen (W-after-turn -0.92, so forward was back). With no order,
      // isao.loiter is his own position, so `sub3(aimC, up)` was literally
      // the zero vector and the frame fell through to an arbitrary tangent.
      //
      // The frame still comes from the SPHERE, not from the mesh's facing:
      // hanging it off his quaternion put the lens inside him whenever he
      // was hovering nose-down over a print, and the tangent is stable
      // through every state he has.
      let fwd;
      if (isaoHeading) fwd = isaoHeading.slice();
      else {
        const aimC = isao.order ? norm3(graph.centers[isao.order.ci]) : isao.loiter;
        fwd = sub3(aimC, up);
      }
      fwd = sub3(fwd, scale3(up, dot3(fwd, up)));   // onto the tangent plane
      const fl = len3(fwd);
      fwd = fl > 1e-6 ? scale3(fwd, 1 / fl) : norm3(cross3(up, [0, 1, 0]));
      const back = cellSide * 4.2, lift = cellSide * 1.6;
      camGoal.pos.set(
        bp.x - fwd[0] * back + up[0] * lift,
        bp.y - fwd[1] * back + up[1] * lift,
        bp.z - fwd[2] * back + up[2] * lift,
      );
      tmpCam.position.copy(camGoal.pos);
      tmpCam.up.set(up[0], up[1], up[2]);
      // Aim BETWEEN him and the job, not at either. Aimed at the machine
      // you get a machine and no context; aimed at the site he drops out of
      // frame entirely, which is what the first cut did while he was
      // hovering directly over it. Just past him keeps both.
      const aimCi = isao.order ? isao.order.ci : -1;
      if (aimCi >= 0) {
        const c = graph.centers[aimCi];
        const top = 1 + params.wallHeight;
        const k = 0.45;
        tmpCam.lookAt(
          bp.x + (c[0] * top - bp.x) * k,
          bp.y + (c[1] * top - bp.y) * k,
          bp.z + (c[2] * top - bp.z) * k,
        );
      } else {
        // waiting: past him along the drift, tipped down at the shell —
        // the loiter shot
        tmpCam.lookAt(
          bp.x + fwd[0] * cellSide * 2.2 - up[0] * cellSide * 1.3,
          bp.y + fwd[1] * cellSide * 2.2 - up[1] * cellSide * 1.3,
          bp.z + fwd[2] * cellSide * 2.2 - up[2] * cellSide * 1.3,
        );
      }
      camGoal.quat.copy(tmpCam.quaternion);
      return;
    }
    if (params.view === 'bastion' && !buildMode) {
      // behind the anchor, facing the incoming lane (outward from the
      // Heart through a watched tower; toward the nearest live portal
      // when watching the Heart itself)
      const anchorCi = (watchTower && towers.includes(watchTower)) ? watchTower.ci : dungeon.heart;
      const ac = graph.centers[anchorCi];
      const an = graph.normals[anchorCi];
      const tangentAt = (pnt, toward) => {
        const nn = norm3(pnt);
        const raw = sub3(toward, pnt);
        const flat = sub3(raw, scale3(nn, dot3(raw, nn)));
        const l = len3(flat);
        return l > 1e-9 ? scale3(flat, 1 / l) : [1, 0, 0];
      };
      let lookDir;
      if (anchorCi === dungeon.heart) {
        let bp = null, bd = Infinity;
        for (const sp of spawnPoints) {
          if (!sp.alive) continue;
          const dd = dist3(ac, graph.centers[sp.ci]);
          if (dd < bd) { bd = dd; bp = graph.centers[sp.ci]; }
        }
        lookDir = bp ? tangentAt(ac, bp) : tangentAt(ac, graph.centers[dungeon.spawn]);
      } else {
        lookDir = scale3(tangentAt(ac, graph.centers[dungeon.heart]), -1); // outward
      }
      const eye = add3(add3(ac, scale3(an, params.wallHeight * 4 + cellSide * 2.0)),
        scale3(lookDir, -cellSide * 2.8));
      const look = add3(add3(ac, scale3(an, params.wallHeight)), scale3(lookDir, cellSide * 3));
      camGoal.pos.set(eye[0], eye[1], eye[2]);
      tmpCam.position.copy(camGoal.pos);
      tmpCam.up.set(an[0], an[1], an[2]);
      tmpCam.lookAt(look[0], look[1], look[2]);
      camGoal.quat.copy(tmpCam.quaternion);
      return;
    }
    if (buildMode) {
      // free: no elastic return, no angular ceiling. The carried frame is
      // what makes that safe anywhere on the sphere, antipode included.
      const { c, up } = buildFrame();
      camGoal.pos.copy(c).multiplyScalar(buildDist);
      tmpCam.position.copy(camGoal.pos);
      tmpCam.up.copy(up);
      tmpCam.lookAt(0, 0, 0);
      camGoal.quat.copy(tmpCam.quaternion);
      return;
    }
    const c = player.pos;
    const n = norm3(c);
    const h = player.smoothDir;
    // suspension dip while a ram bump is live: sink the eye, ease out.
    // Recoil pulls the eye straight back along the heading instead.
    const dip = cellSide * 0.95 * bumpFactor() * bumpFactor();
    const kick = cellSide * 0.08 * params.recoil * recoilFactor() * recoilFactor();
    let eye, look;
    if (params.view === 'third') {
      // behind and above; pulls back as the creature grows so it stays framed
      eye = add3(add3(c, scale3(n, params.wallHeight * 2.6 + cellSide * 1.1 + unitScale * 1.8)),
        scale3(h, -(cellSide * 1.8 + unitScale * 1.6)));
      look = add3(add3(c, scale3(n, params.wallHeight * 0.4 + unitScale * 0.5)),
        scale3(h, cellSide * 1.4));
    } else {
      // pov: down IN the corridor slot, below the wall tops, along its throat
      eye = add3(add3(c, scale3(n, params.wallHeight * 0.62)), scale3(h, -cellSide * 0.5));
      look = add3(add3(c, scale3(n, params.wallHeight * 0.28)), scale3(h, cellSide * 2.4));
    }
    if (dip > 0) eye = add3(eye, scale3(n, -dip));
    if (kick > 0) eye = add3(eye, scale3(h, -kick));
    camGoal.pos.set(eye[0], eye[1], eye[2]);
    tmpCam.position.copy(camGoal.pos);
    tmpCam.up.set(n[0], n[1], n[2]);
    tmpCam.lookAt(look[0], look[1], look[2]);
    camGoal.quat.copy(tmpCam.quaternion);
  }

  function snapCamera() {
    updateCameraGoal();
    camera.position.copy(camGoal.pos);
    camera.quaternion.copy(camGoal.quat);
  }

  // --- movement over the cell graph ---------------------------------------
  // the projection itself lives in vec3.js, so berths.js (pure, Node-tested)
  // and this file cannot drift apart; the wrapper just supplies `graph`
  const tangentDirTo = (from, to) =>
    tangentDir(graph.normals[from], graph.centers[from], graph.centers[to]);

  function openNeighbors(ci) {
    // towers block PATHING for everyone — they are the walls you buy
    return graph.adj[ci].filter((nb) => dungeon.tags[nb] !== BLOCKED && !towerCells.has(nb));
  }

  // --- the wanderer: exit choice = steering bias + its own whims -----------
  // Scored, not commanded: alignment with the steering intent dominates when
  // the player is actively steering, but unvisited-cell curiosity, a
  // backtrack penalty, and noise keep the walker willful.
  function chooseNext() {
    let exits = openNeighbors(player.cur);
    // auto never routes THROUGH a berth (free movement already refuses);
    // if the boxes somehow wall the only way out, solidity yields
    const clear = exits.filter((e2) => !containerBlocked(e2));
    if (clear.length) exits = clear;
    if (exits.length === 0) return -1;
    // control mode: while the user steers, their intent dominates — the
    // creature's curiosity, backtrack aversion, and whims all yield
    const active = steeringActive() || manualActive();
    // DIRECTIVE: a high-level order shapes the wander. Vector goals
    // (avoid/ram) become a tangent to chase or flee; field goals
    // (home/portal) score descending hop-distance.
    let goalVec = null, goalField = null, goalSign = 1;
    if (!active) {
      const d = params.directive;
      if (d === 'home') goalField = dungeon.distToHeart;
      else if (d === 'portal' && portalDist) goalField = portalDist;
      else if (d === 'avoid' || d === 'ram') {
        let bt = null, bd = Infinity;
        for (const en of enemies) {
          if (!en.alive) continue;
          if (d === 'ram' && !en.spec.rammable) continue;
          const dd = dist3(player.pos, en.pos);
          if (dd < bd) { bd = dd; bt = en; }
        }
        if (bt && bd < cellSide * 14) {
          const n = norm3(player.pos);
          const raw = sub3(bt.pos, player.pos);
          const flat = sub3(raw, scale3(n, dot3(raw, n)));
          const l = len3(flat);
          if (l > 1e-9) {
            goalVec = scale3(flat, 1 / l);
            goalSign = d === 'avoid' ? -1 : 1;
          }
        }
      }
    }
    // SOLID units hurt to touch, and no autopilot order should drive the
    // hull through one (operator ruling, filed against seek-home): every
    // directive except RAM (its chase must not be disrupted) and AVOID
    // (which already flees everything) gets a flee vector away from the
    // dangerous tier, weighted by proximity so it outvotes the goal field
    // only at close range.
    let fleeVec = null;
    if (!active && params.directive !== 'ram' && params.directive !== 'avoid') {
      const R = cellSide * 4;
      let fx = 0, fy = 0, fz = 0, any = false;
      for (const en of enemies) {
        if (!en.alive || en.spec.rammable) continue;
        const dd = dist3(player.pos, en.pos);
        if (dd > R) continue;
        const w = 1 - dd / R;
        fx += (player.pos[0] - en.pos[0]) * w;
        fy += (player.pos[1] - en.pos[1]) * w;
        fz += (player.pos[2] - en.pos[2]) * w;
        any = true;
      }
      if (any) {
        const n = norm3(player.pos);
        const raw = [fx, fy, fz];
        const flat = sub3(raw, scale3(n, dot3(raw, n)));
        const l = len3(flat);
        if (l > 1e-9) fleeVec = scale3(flat, Math.min(1, l / cellSide) / l);
      }
    }
    let best = exits[0], bestScore = -Infinity;
    for (const e of exits) {
      const dir = tangentDirTo(player.cur, e);
      let score = (active ? 4.5 : 2.2) * dot3(player.heading, dir);
      if (!active && !player.visited.has(e)) score += 1.1;      // curiosity
      if (!active && e === player.prev && exits.length > 1) score -= 2.4;
      if (goalVec) score += 3.2 * goalSign * dot3(dir, goalVec);
      if (fleeVec) score += 3.6 * dot3(dir, fleeVec);
      if (goalField) {
        const gain = goalField[player.cur] - goalField[e];      // +1 closer
        score += 3.2 * Math.max(-1, Math.min(1, gain));
      }
      score += (whim() - 0.5) * (active ? 0.4 : 1.6);           // its own will
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  // NOTE: reaching the heart is NOT a win here (that's the maze tabs'
  // rule) — the pole is home turf. The only victory is checkVictory's:
  // every spawn point destroyed and the field cleared.
  function arriveAt(cell) {
    player.prev = player.cur;
    player.cur = cell;
    player.moves++;
    player.visited.add(cell);
    paintCell(player.prev, floorColorOf(player.prev));
    updateHud();
  }

  // called once per frame: steer, glide (creature-paced), respawn, absorb
  function advanceMotion(dt) {
    if (player.won || playerDown || player.next === -1) return;
    simTime += dt;

    // continuous steering while held; ANY key claims manual control —
    // and an engaged cruise keeps manual alive without touching a key
    const anyKey = keys.left || keys.right || keys.fast || keys.slow;
    if (anyKey || cruise) autoMode = false; // any drive input takes the wheel — sticky, no timer
    steerHold = anyKey ? 0 : steerHold + dt;
    const manual = manualActive();
    if (keys.left) rotate(STEER_RATE * dt);
    if (keys.right) rotate(-STEER_RATE * dt);

    // MANUAL = FREE movement: kinematics leave the grid entirely. W drives
    // along the heading, S reverses, A/D steer continuously; the grid is
    // consulted only as a collision oracle (blocked cell? no entry) and to
    // keep semantics (current cell, visited, absorption) in sync.
    if (manual) {
      player.freeMode = true;
      // forward is PLAYER-TRIGGERED: hold W to drive, or double-tap W/▲
      // to engage CRUISE (rolls on its own; W boosts, S kills it). The
      // old always-rolls-forward manual proved too aggressive.
      // keys still override (a held key is an explicit act); otherwise the
      // lever's resting position is the speed
      const drive = keys.slow ? -0.55
        : keys.fast ? (cruise ? 1.45 : 1)
        : (throttle !== 0 ? throttle : (cruise ? 1 : 0));
      if (drive !== 0) {
        const v = params.speed * speedBonus * cellSide * 1.6 * drive
          * (1 - 0.65 * bumpFactor()); // the run-over drag
        const step = scale3(player.heading, v * dt);
        let cand = norm3(add3(player.pos, step));
        if (freeBlocked(cand)) {
          // slide: strip the into-wall component and try again
          const w = nearestWall(cand);
          if (w) {
            const toWall = norm3(sub3(w, player.pos));
            const into = Math.max(0, dot3(step, toWall));
            // a mostly head-on hit THUDS like running something over;
            // the bumpLeft gate keeps grinding along a wall from
            // re-triggering every frame
            if (into > 0.55 * len3(step) && bumpLeft <= 0) bumpLeft = BUMP_LEN * 0.8;
            const slid = sub3(step, scale3(toWall, into));
            cand = norm3(add3(player.pos, slid));
            if (freeBlocked(cand)) cand = null;
          } else cand = null;
          // wedged with nowhere to slide? creep toward the CURRENT cell's
          // center — it is open ground by definition, so the tank can
          // always un-stick itself, shells or no shells
          if (!cand) {
            const home = graph.centers[player.cur];
            const toHome = sub3(home, player.pos);
            const l = len3(toHome);
            if (l > 1e-6) {
              const creep = norm3(add3(player.pos,
                scale3(toHome, Math.min(1, (v * dt) / l))));
              if (!freeBlocked(creep)) cand = creep;
            }
          }
        }
        if (cand) {
          player.pos = cand;
          player.travelDir = drive > 0 ? player.heading.slice() : scale3(player.heading, -1);
          const ci = cellIndex(cand);
          if (ci !== -1 && ci !== player.cur) arriveAt(ci);
        }
      }
      player.pos = wallCushion(player.pos);
      const nf = norm3(player.pos);
      player.heading = norm3(sub3(player.heading, scale3(nf, dot3(player.heading, nf))));
      updateSmoothDir(dt);
      // food systems keep running while driving free
      if (params.orbRespawn > 0) {
        respawnClock += dt;
        if (respawnClock >= params.orbRespawn) {
          respawnClock = 0;
          if (orbMeshes.size < params.orbs) spawnOneOrb();
        }
      }
      checkAbsorb();
      return;
    }

    // AUTO resumes from wherever free movement left off: the nearest open
    // cell becomes home, and the first glide eases out from the actual
    // position (virtualStart) instead of snapping to a cell center
    if (player.freeMode) {
      player.freeMode = false;
      const ci = cellIndex(player.pos);
      if (ci !== -1 && dungeon.tags[ci] !== BLOCKED) player.cur = ci;
      player.prev = -1;
      player.next = chooseNext();
      player.prog = 0;
      player.virtualStart = player.pos.slice();
      if (player.next !== -1) {
        player.segLen = Math.max(1e-9, dist3(player.pos, graph.centers[player.next]));
      }
    }

    // U-turn: heading swung behind the motion — reverse the glide in place.
    if (steeringActive() && dot3(player.heading, player.travelDir) < -0.35
      && player.prog > 0.04 && player.prog < 0.96) {
      const old = player.cur;
      player.cur = player.next;
      player.next = old;
      player.prog = 1 - player.prog;
      player.prev = -1;
    }

    // orb respawn: the maze regrows food over time
    if (params.orbRespawn > 0) {
      respawnClock += dt;
      if (respawnClock >= params.orbRespawn) {
        respawnClock = 0;
        if (orbMeshes.size < params.orbs) spawnOneOrb();
      }
    }

    // world-space motion: speed is distance/sec over THIS segment's length,
    // so a long chord between large cells takes proportionally longer — the
    // grid offers the space, the motion traverses it. The creature's own
    // locomotion profile modulates the pace on top.
    // manual: motion only while W/S are held; auto: the creature's own pace
    const prof = MOVES[params.creature];
    const pace = params.speed * speedBonus * (prof ? prof.speed(simTime) : 1)
      * (1 - 0.65 * bumpFactor()); // the run-over drag
    player.prog += (pace * cellSide * dt) / player.segLen;
    while (player.prog >= 1 && !player.won) {
      const carry = (player.prog - 1) * player.segLen; // leftover distance
      player.virtualStart = null;
      arriveAt(player.next);
      // idle: steering intent drifts toward actual travel; while the user
      // steers, their intent is left untouched
      if (!steeringActive() && !manualActive()) {
        const td = tangentDirTo(player.prev, player.cur);
        player.heading = norm3(add3(scale3(player.heading, 0.65), scale3(td, 0.35)));
      }
      player.next = chooseNext();
      if (player.next === -1) { player.prog = 0; break; }
      player.segLen = Math.max(1e-9, dist3(graph.centers[player.cur], graph.centers[player.next]));
      player.prog = carry / player.segLen;
    }
    // interpolate along the chord, then push back onto the sphere
    const a = player.virtualStart || graph.centers[player.cur];
    const b = graph.centers[player.next === -1 ? player.cur : player.next];
    const f = Math.min(player.prog, 1);
    const p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    player.pos = norm3(p); // radius 1
    const n = player.pos;
    const d = sub3(b, player.pos);
    const flat = sub3(d, scale3(n, dot3(d, n)));
    const l = Math.hypot(flat[0], flat[1], flat[2]);
    if (l > 1e-9) player.travelDir = scale3(flat, 1 / l);
    // cushion AFTER travelDir so the push shifts the body, not the aim
    player.pos = wallCushion(player.pos);
    // keep the steering intent in the local tangent plane as we move
    player.heading = norm3(sub3(player.heading, scale3(n, dot3(player.heading, n))));

    updateSmoothDir(dt);
    checkAbsorb();
  }
  let simTime = 0;

  // ram bump: running something over has WEIGHT — a short window where the
  // tank loses pace and the camera dips, like the suspension taking it.
  // Countdown-seconds (not a timestamp) so it works on both clocks.
  const BUMP_LEN = 0.5;
  let bumpLeft = 0;
  const bumpFactor = () => Math.max(0, bumpLeft / BUMP_LEN);

  // cannon: firing kicks the tank back (recoil) and heats the barrel
  // sleeve red-hot — no second shell until it cools over 3 s. The sleeve
  // IS the cooldown gauge; the HUD only echoes it.
  const CANNON_COOL = 3.0;
  // the kick's length is a tunable like the rest — read it, never copy it
  const recoilLen = () => FEEL.recoilLen;
  let cannonHeat = 0;
  let recoilLeft = 0;
  const recoilFactor = () => Math.max(0, recoilLeft / recoilLen());
  const sleeveCool = new THREE.Color(0x232833);
  const sleeveHot = new THREE.Color(0xff2a10);

  const STEER_RATE = 2.6; // rad/s while a steer key is held
  function rotate(theta) {
    const n = norm3(player.pos);
    const h = player.heading;
    const c = Math.cos(theta), s = Math.sin(theta);
    const nxh = cross3(n, h);
    player.heading = norm3(add3(scale3(h, c), scale3(nxh, s)));
  }

  // smoothDir chases travelDir at a bounded angular rate — the no-jump
  // guarantee for cameras and the creature at exits and U-turns
  const SMOOTH_RATE = 5.0; // rad/s
  function updateSmoothDir(dt) {
    const n = norm3(player.pos);
    let s = norm3(sub3(player.smoothDir, scale3(n, dot3(player.smoothDir, n))));
    const raw = manualActive() ? player.heading : player.travelDir;
    const g = norm3(sub3(raw, scale3(n, dot3(raw, n))));
    const ang = Math.atan2(dot3(cross3(s, g), n), Math.max(-1, Math.min(1, dot3(s, g))));
    const step = Math.max(-SMOOTH_RATE * dt, Math.min(SMOOTH_RATE * dt, ang));
    const c = Math.cos(step), si = Math.sin(step);
    const nxs = cross3(n, s);
    player.smoothDir = norm3(add3(scale3(s, c), scale3(nxs, si)));
  }

  function onKeyEvent(ev, down) {
    if (!active) return;
    // a clicked button (lil-gui title, d-pad, modal regen) keeps FOCUS, and
    // the browser "clicks" the focused button again on Space — which is the
    // fire key. That's how the panel kept "opening by itself" mid-battle.
    // Drop button focus before handling any game key. Inputs keep focus
    // (typing a seed must not drive the tank's keys into blur).
    if (down && document.activeElement && document.activeElement.tagName === 'BUTTON') {
      document.activeElement.blur();
    }
    const k = ev.key.toLowerCase();
    // QoL: with a tower SELECTED (its radial open, or watched in bastion),
    // W/↑ upgrades it instead of driving — HK's shortcut, kept out of the
    // tank's way by requiring a selection context
    // U upgrades the selected tower. It was W, which is ALSO the drive key —
    // a shortcut that fires while you are steering is a trap, not a shortcut.
    if (down && k === 'u') {
      const sel = towerByCell.get(shopCi);
      if (sel) {
        if (orderUpgrade(sel)) {
          if (shopCi !== -1) openShop(shopCi); // refresh the radial
        } else if (shopCi !== -1) {
          flashShopNote(upgradeCost(sel.def, sel.tier) === null ? 'max tier' : 'not enough biomass');
        }
        ev.preventDefault();
        return;
      }
    }
    const m = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
      arrowup: 'fast', w: 'fast', arrowdown: 'slow', s: 'slow',
      shift: 'laser' }[k];
    if (m) {
      if (down && m === 'fast' && !keys.fast) noteFastTap(); // double-tap → cruise
      // the brake kills BOTH holds, or releasing S would drive off again
      if (down && m === 'slow') { cruise = false; throttle = 0; paintThrottle(); }
      keys[m] = down;
      ev.preventDefault();
      return;
    }
    // the tower radial claims the keyboard while it is up: digits place
    // (1..8 in unlock order — the same order the wheel shows), ESC closes.
    // Claimed even when the placement fails (locked / can't afford), so a
    // miss never falls through and flips the camera instead.
    if (down && shopCi !== -1) {
      if (k === 'escape') { closeShop(); ev.preventDefault(); return; }
      const d = parseInt(k, 10);
      // indexed by the WHEEL's own order (TOWERS), not TOWER_ORDER — the
      // two differ (slow/homing swap), and the digit badge the player
      // reads sits on the wheel: what the badge says is what the key does
      if (d >= 1 && d <= TOWERS.length && !towerByCell.get(shopCi)) {
        const def = TOWERS[d - 1];
        const tkey = def.key;
        const unlocked = new Set(unlockedTowerKeys(wave, hackedUnlocks));
        if (unlocked.has(tkey) && !placeError(shopCi) && eco.canAfford(def.cost)) {
          if (orderTower(tkey, shopCi)) closeShop();
        }
        ev.preventDefault();
        return;
      }
    }
    if (down && k === 'escape') { togglePause(); ev.preventDefault(); return; }
    if (paused) return; // frozen: only ESC gets through
    // FLYING HIM, SPACE AND SHIFT ARE ALTITUDE. Context-scoped exactly like
    // the U-upgrade shortcut: the drone view is the only place these mean
    // anything else, and a tank commander is not firing while he is a drone.
    if (params.view === 'drone' && (k === ' ' || k === 'spacebar' || k === 'shift')) {
      keys[k === 'shift' ? 'droneDown' : 'droneUp'] = down;
      ev.preventDefault();
      return;
    }
    if (down && (k === ' ' || k === 'spacebar')) { fire(); ev.preventDefault(); return; }
    if (down && k === 'h') pulseHint();
    if (down && k === 'v') toggleView();
    if (down && k === 'x' && serverFound && !hackedRound) openHack();
    // views land on number keys and on the letters that say them: 1/M/O all
    // read as "map" and go to orbit, 2 is first person, 3/T third person.
    // The radar's heart/player toggle lives on the MAP button alone now.
    if (down && (k === '1' || k === 'm' || k === 'o')) setView('orbit');
    if (down && k === '2') setView('pov');
    if (down && (k === '3' || k === 't')) setView('third');
    // C for Cheat (moved off M, which is a VIEW now)
    if (down && k === 'c') {
      strike.ready = Math.min(9, strike.ready + 1);
      showToast('<div class="wave-num">CHEAT · MISSILE LOADED</div>'
        + `<div class="wave-role">☄ ready ${strike.ready}</div>`, 1200);
    }
    // Q/E nudge the throttle lever from the keyboard — up for speed, down
    // through zero into reverse. Key auto-repeat does the holding.
    if (down && (k === 'q' || k === 'e')) {
      // FLYING HIM: the same pair is altitude, which is the axis a ground
      // vehicle never had and a drone obviously should
      if (params.view === 'drone') {
        isaoAlt = Math.max(1.2, Math.min(9, isaoAlt + (k === 'q' ? 0.35 : -0.35)));
        return;
      }
      const step = k === 'q' ? 0.12 : -0.12;
      let v2 = throttle + step;
      if (Math.abs(v2) < 0.07) v2 = 0;   // same detent the lever has
      throttle = Math.min(1, Math.max(-THROTTLE_REV, v2));
      if (throttle !== 0) { cruise = false; autoMode = false; }
      paintThrottle();
    }
  }
  addEventListener('keydown', (ev) => onKeyEvent(ev, true));
  addEventListener('keyup', (ev) => onKeyEvent(ev, false));
  addEventListener('blur', () => { keys.left = keys.right = keys.fast = keys.slow = keys.laser = false; });

  // T1 tank first person · T3 tank third person · O1 orbital. Bastion left
  // the cycle (tower-watching was a spectator mode nobody drove from), and
  // nothing auto-centres any more — the two CENTRE buttons do it on demand.
  const VIEW_TAG = { pov: 'T1', third: 'T3', orbit: 'O1', drone: 'BOB' };
  // V toggles the two views that have buttons. POV is parked (operator: it
  // earns its screen space on nobody's phone) but still selectable from the
  // GUI, and the DRONE is not on the cycle at all — you get it by reaching
  // for Isao, which is the point of it.
  function toggleView() {
    setView(params.view === 'third' ? 'orbit' : 'third');
  }

  // touch zones/buttons: press-and-hold, like the keys; onPress fires per
  // fresh tap. The .pressed glow is the zones' only feedback — they carry
  // no labels, so the glow IS the affordance.
  function holdButton(sel, flag, onPress) {
    const el = root.querySelector(sel);
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      if (onPress) onPress();
      keys[flag] = true;
      el.classList.add('pressed');
    });
    for (const evt of ['pointerup', 'pointerleave', 'pointercancel']) {
      el.addEventListener(evt, () => {
        keys[flag] = false;
        el.classList.remove('pressed');
      });
    }
  }
  // --- throttle lever -----------------------------------------------------
  const throtEl = root.querySelector('#td-throttle');
  const throtTrack = throtEl.querySelector('.throttle-track');
  const throtFill = throtEl.querySelector('.throttle-fill');
  const throtHandle = throtEl.querySelector('.throttle-handle');
  const throtRead = throtEl.querySelector('.throttle-read');

  function paintThrottle() {
    const zeroPct = THROTTLE_ZERO * 100;
    // handle position, measured down from the top of the track
    const t = throttle >= 0
      ? THROTTLE_ZERO * (1 - throttle)
      : THROTTLE_ZERO + (-throttle / THROTTLE_REV) * (1 - THROTTLE_ZERO);
    throtHandle.style.top = `${t * 100}%`;
    // the fill grows from the zero line toward the handle, either way
    const a = Math.min(t * 100, zeroPct);
    const b = Math.max(t * 100, zeroPct);
    throtFill.style.top = `${a}%`;
    throtFill.style.height = `${b - a}%`;
    throtEl.classList.toggle('rev', throttle < 0);
    throtEl.classList.toggle('idle', throttle === 0);
    throtRead.textContent = throttle === 0 ? '0' : `${Math.round(throttle * 100)}`;
  }

  function setThrottleFromY(clientY) {
    const r = throtTrack.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientY - r.top) / (r.height || 1)));
    let v = t <= THROTTLE_ZERO
      ? (THROTTLE_ZERO - t) / THROTTLE_ZERO
      : -((t - THROTTLE_ZERO) / (1 - THROTTLE_ZERO)) * THROTTLE_REV;
    if (Math.abs(v) < 0.07) v = 0;   // detent, so "stop" is findable by feel
    throttle = Math.min(1, Math.max(-THROTTLE_REV, v));
    if (throttle !== 0) { cruise = false; autoMode = false; }
    paintThrottle();
  }

  throtEl.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    throtEl.setPointerCapture(ev.pointerId);
    throtEl.classList.add('pressed');
    setThrottleFromY(ev.clientY);
  });
  throtEl.addEventListener('pointermove', (ev) => {
    if (!throtEl.hasPointerCapture(ev.pointerId)) return;
    setThrottleFromY(ev.clientY);
  });
  for (const evt of ['pointerup', 'pointercancel']) {
    throtEl.addEventListener(evt, () => throtEl.classList.remove('pressed'));
  }
  paintThrottle();
  holdButton('#td-pad-laser', 'laser');
  holdButton('#td-pad-left', 'left');
  holdButton('#td-pad-right', 'right');
  root.querySelector('#td-pad-tank').addEventListener('click', () => setView('third'));
  root.querySelector('#td-pad-orbit').addEventListener('click', () => setView('orbit'));
  // CENTRE controls: the camera never sticks to anything now — these two
  // aim the orbital view on demand (and take you there if you are not in it)
  function centerBuildOnTank() {
    followSuspend = false;
    if (!player.pos) return;
    const nrm = norm3(player.pos);
    bqZ.set(nrm[0], nrm[1], nrm[2]);
    bqY.copy(buildFrame().up);
    bqX.crossVectors(bqY, bqZ).normalize();
    bqY.crossVectors(bqZ, bqX).normalize();
    bqM.makeBasis(bqX, bqY, bqZ);
    buildQ.setFromRotationMatrix(bqM);
  }
  root.querySelector('#td-pad-ctrheart').addEventListener('click', () => {
    if (params.view !== 'orbit') setView('orbit');
    centerBuildOnHeart();
    buildDist = 3.4;   // the heart centre IS the strategic pose: whole planet
  });
  root.querySelector('#td-pad-ctrtank').addEventListener('click', () => {
    if (params.view !== 'orbit') setView('orbit');
    centerBuildOnTank();
    buildDist = 2.0;   // the tank centre is tactical: close enough to read cells
  });
  function syncDirectiveChip() {
    const chip = root.querySelector('#td-pad-dir');
    if (chip) chip.textContent = DIRECTIVE_LABEL[params.directive] || 'WANDER';
  }
  // TANK-AUTO: the button opens a small radial of directives instead of
  // blind-cycling six of them — on a phone, cycling meant tapping through
  // five states you did not want to reach the one you did.
  const autoRadial = root.querySelector('#td-auto-radial');
  const AUTO_OPTIONS = [
    ['wander', 'WANDER'], ['avoid', 'AVOID'], ['ram', 'RAM'],
    ['conserve', 'SAVE SHELLS'], ['portal', 'SEEK PORTAL'], ['home', 'SEEK HOME'],
  ];
  for (const [key, label] of AUTO_OPTIONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.dir = key;
    b.addEventListener('click', () => {
      params.directive = key;
      autoMode = true;   // picking a directive is the ONLY way into auto
      steerHold = 1.2;   // give auto its takeover window
      cruise = false;
      directiveCtrl.updateDisplay();
      syncDirectiveChip();
      updateHud();
      autoRadial.classList.add('hidden');
    });
    autoRadial.appendChild(b);
  }
  function syncAutoRadial() {
    for (const b of autoRadial.children) {
      b.classList.toggle('active', b.dataset.dir === params.directive && !manualActive());
    }
  }
  root.querySelector('#td-pad-dir').addEventListener('click', () => {
    const open = autoRadial.classList.toggle('hidden');
    if (!open) syncAutoRadial();
  });
  // any tap that is not the radial closes it — a menu must not linger
  addEventListener('pointerdown', (ev) => {
    if (!autoRadial.classList.contains('hidden')
      && !autoRadial.contains(ev.target)
      && ev.target !== root.querySelector('#td-pad-dir')) {
      autoRadial.classList.add('hidden');
    }
  });

  syncDirectiveChip();
  root.querySelector('#td-pad-map').addEventListener('click', () => toggleMap());

  // build-camera input: drag = azimuth orbit, wheel = zoom, TAP = select a
  // cell (shop/upgrade). A tap is a press that never traveled; anything
  // that moves >8 px is an orbit. Action-mode pointers stay untouched.
  // build-mode input: single finger orbits the azimuth, TWO fingers pinch to
  // zoom. Track pointers by id so a pinch never fires a tower-placing tap.
  const buildPointers = new Map(); // pointerId -> {x, y}
  let pinchPrev = null;            // last two-finger pixel distance
  let pinched = false;             // ≥2 fingers touched this gesture → no tap
  let tapStart = null;
  container.addEventListener('pointerdown', (ev) => {
    // taps are tracked under EVERY camera — the shop opens anywhere now.
    // Drag-orbit and pinch stay orbit-only; the chase cams own their framing.
    if (buildMode) {
      buildPointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (buildPointers.size >= 2) { pinched = true; pinchPrev = null; tapStart = null; return; }
    }
    tapStart = [ev.clientX, ev.clientY];
  });
  addEventListener('pointermove', (ev) => {
    if (!buildMode) return;
    const prev = buildPointers.get(ev.pointerId);
    if (!prev) return;
    const dx = ev.clientX - prev.x;
    const dy = ev.clientY - prev.y;
    prev.x = ev.clientX; prev.y = ev.clientY;
    if (buildPointers.size >= 2) {
      const p = [...buildPointers.values()];
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (pinchPrev !== null && d > 0) {
        buildDist = Math.min(4, Math.max(1.4, buildDist * (pinchPrev / d)));
      }
      pinchPrev = d; pinched = true; tapStart = null;
      return;
    }
    if (tapStart && Math.hypot(ev.clientX - tapStart[0], ev.clientY - tapStart[1]) > 8) {
      tapStart = null; // it's a pan now
    }
    // grab the sphere and roll it: the drag rotates the carried frame about
    // its own up/right axes. Same feel as the old flick-to-pan, but it can
    // go all the way round instead of stopping at a ceiling.
    {
      const f = buildFrame();
      dragUp.copy(f.up);
      dragRight.copy(f.right);
      const k = buildDist * 0.0016; // px → radians, zoom-aware
      followSuspend = true; // exploring: the follow waits for the wheel
      buildQ.premultiply(bqTmp.setFromAxisAngle(dragUp, -dx * k));
      buildQ.premultiply(bqTmp.setFromAxisAngle(dragRight, -dy * k));
      buildQ.normalize();
    }
  });
  function endBuildPointer(ev) {
    const wasTap = !pinched && tapStart
      && Math.hypot(ev.clientX - tapStart[0], ev.clientY - tapStart[1]) <= 8;
    buildPointers.delete(ev.pointerId);
    if (buildPointers.size < 2) pinchPrev = null;
    if (strike.falling > 0 && wasTap) {
      // the feed owns every tap while the munition flies: pointerdown already
      // spent this one on retarget-or-skip, and letting it fall through
      // opened the tower shop underneath the strike camera
      lastTap = null;
    } else if (strike.armed && wasTap) {
      // painting outranks every other tap while armed: the board is a
      // targeting surface until the safety goes back on
      const ci = cellAtScreen(ev.clientX, ev.clientY);
      if (ci !== -1 && paintTarget(strike, ci) === 'locked') {
        sfx.play('tank_shells');
        showRangeRing(ci, strikeTune.blastCells, 0xffb347, 30);
        syncArmUi();
      }
    } else if (wasTap) {
      // double-tap in ORBIT rides the view home AND pulls back to the whole
      // planet — the strategic pose is one gesture from anywhere. Checked
      // BEFORE the shop opens, closing whatever the first tap opened.
      const tnow = performance.now();
      const dbl = buildMode && lastTap && tnow - lastTap.t < DTAP_MS
        && Math.hypot(ev.clientX - lastTap.x, ev.clientY - lastTap.y) <= DTAP_PX;
      if (dbl) {
        lastTap = null;
        closeShop();
        centerBuildOnHeart();
        buildDist = 3.4;
        return;
      }
      lastTap = { t: tnow, x: ev.clientX, y: ev.clientY };
      // TAP ISAO TO RIDE HIM. The drone camera is not on the view cycle,
      // because reaching for the machine you want to look through is a
      // better gesture than tapping past two other cameras to find it. It
      // asks first: a mis-tap that hijacks your camera mid-wave is worse
      // than no shortcut at all.
      if (isao && params.view !== 'drone') {
        const r0 = renderer.domElement.getBoundingClientRect();
        ndc.set(((ev.clientX - r0.left) / r0.width) * 2 - 1,
          -((ev.clientY - r0.top) / r0.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        if (raycaster.intersectObject(isao.obj, true).length) {
          askDroneView();
          return;
        }
      }
      // bastion first claim: a tap on a TOWER watches it
      if (params.view === 'bastion') {
        const r = renderer.domElement.getBoundingClientRect();
        ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1,
          -((ev.clientY - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(towers.map((tw) => tw.obj), true);
        if (hits.length) {
          let obj = hits[0].object;
          while (obj && !towers.some((tw) => tw.obj === obj)) obj = obj.parent;
          watchTower = towers.find((tw) => tw.obj === obj) || null;
          return;
        }
        watchTower = null;
      }
      // the shop opens under EVERY camera — building is not a mode
      const ci = cellAtScreen(ev.clientX, ev.clientY);
      // tapping the SERVER (its cell or a neighbour) is the interaction:
      // hack if it is awake, and say why not if it is not — a silent
      // nothing was exactly the operator's 'cannot find how to interact'
      if (ci !== -1 && serverCi >= 0
          && (ci === serverCi || graph.adj[serverCi].includes(ci))) {
        if (serverFound && !hackedRound) openHack();
        else if (serverFound) {
          showToast(`<div class="wave-num">RELAY PATCHED</div>`
            + `<div class="wave-role">one hack per round — come back next round</div>`, 2200);
        } else if (dungeon.tags[serverCi] === BLOCKED) {
          showToast(`<div class="wave-num">DORMANT RELAY</div>`
            + `<div class="wave-role">beyond the frontier — push the rounds to reach it</div>`, 2600);
        } else {
          showToast(`<div class="wave-num">DORMANT RELAY</div>`
            + `<div class="wave-role">drive the tank closer to wake it</div>`, 2200);
        }
        return;
      }
      if (ci !== -1) openShop(ci, ev.clientX, ev.clientY);
    }
    if (buildPointers.size === 0) { pinched = false; tapStart = null; }
  }
  addEventListener('pointerup', endBuildPointer);
  addEventListener('pointercancel', endBuildPointer);
  container.addEventListener('pointerdown', (ev) => {
    if (strike.falling <= 0 || strikeGrace > 0) return;
    // Aim is two-fold: the paint chose the area, and ONE burst mid-fall can
    // vector the munition onto what the target drifted into. A tap on the
    // GROUND spends the burst; a tap on the sky — or any tap after it is
    // spent — skips to impact.
    if (strike.retargetsLeft > 0) {
      const ci = cellAtScreen(ev.clientX, ev.clientY);
      if (ci !== -1 && retargetStrike(strike, ci)) {
        sfx.play('tank_secondary');
        strikeFeedInfo();   // TGT CELL changes; the feed should say so
        return;
      }
    }
    skipFall(strike);
  });
  container.addEventListener('wheel', (ev) => {
    if (!buildMode) return;
    buildDist = Math.min(4, Math.max(1.4, buildDist + ev.deltaY * 0.002));
    ev.preventDefault();
  }, { passive: false });
  root.querySelector('#td-pad-fire').addEventListener('click', () => fire());

  // --- LAUNCH CONTROL: DeepWatch's console, driving OUR state machine -------
  // The safety toggle arms, the readout narrates, the chunky button goes
  // grey -> orange (needs a target) -> red (authorised). Same ritual, real
  // instrument. armBtn keeps its name: it gates syncArmUi in the loop.
  const armBtn = root.querySelector('#td-launch');
  const safetyEl = root.querySelector('#td-safety');
  const safetyImg = root.querySelector('#td-safety-img');
  const launchBtn = root.querySelector('#td-launch-btn');
  const launchStatus = root.querySelector('#td-launch-status');
  const launchTarget = root.querySelector('#td-launch-target');
  const launchLatin = root.querySelector('#td-launch-latin');
  function refuseArm() {
    // DeepWatch's flickerOrdnance: the console says no, briefly
    armBtn.classList.remove('flicker');
    void armBtn.offsetWidth;
    armBtn.classList.add('flicker');
  }
  let armUiKey = '';
  const buyMissileEl = root.querySelector('#td-buy-missile');
  if (buyMissileEl) buyMissileEl.addEventListener('click', () => {
    if (!missileShop) return;
    const cost = missileCost();
    if (!eco.spend(cost)) {
      showToast(`<div class="wave-num">INSUFFICIENT FUNDS</div>`
        + `<div class="wave-role">the market wants ${fmt(cost)}kg</div>`, 2000);
      return;
    }
    missilesBought++;
    strike.reserved += 1;
    sfx.play('tank_shells');
    showToast(`<div class="wave-num">MISSILE PURCHASED</div>`
      + `<div class="wave-role">entering the queue — next one costs ${fmt(missileCost())}kg</div>`, 2400);
    updateHud(); syncArmUi();
  });

  function syncArmUi() {
    if (buyMissileEl) {
      buyMissileEl.classList.toggle('hidden', !missileShop);
      if (missileShop) buyMissileEl.textContent = `+ ${missileCost()}kg`;
    }
    // narrate the state; write the DOM only when the state actually moves
    const orbit = strike.reserved > 0 ? Math.round(strike.gauge * 100) : -1;
    const reorbit = strike.cooldown > 0 ? Math.round(orbitProgress(strike) * 100) : -1;
    const key = `${strike.armed}|${strike.target}|${strike.ready}|${strike.reserved}|${orbit}|${reorbit}`;
    if (key === armUiKey) return;
    armUiKey = key;
    // the console carries its own armed state, so CSS can decide what a
    // small screen shows: on a phone it is a SWITCH until it is armed, and
    // the readout and the launch key only appear once you have committed
    if (armBtn) armBtn.classList.toggle('armed', strike.armed);
    safetyEl.setAttribute('aria-pressed', String(strike.armed));
    safetyImg.src = strike.armed ? 'assets/ui/switch-on.png' : 'assets/ui/switch-off.png';
    safetyEl.classList.toggle('locked', !strike.armed && (strike.ready <= 0 || strike.cooldown > 0));
    let status, cls = 'status';
    if (strike.armed && strike.target >= 0) { status = 'LAUNCH AUTHORIZED'; cls += ' armed'; }
    else if (strike.armed) { status = 'AWAITING TARGET'; cls += ' armed'; }
    else if (reorbit >= 0) {
      // spent platform repositioning: ready assets exist but must wait
      status = `ENTERING ORBIT ${reorbit}%`;
      cls += ' charging';
    } else if (strike.ready > 0) {
      status = strike.ready > 1 ? `READY ×${strike.ready} · FLIP ON` : 'READY · FLIP TO ON';
      cls += ' ready';
    } else if (strike.reserved > 0) { status = `ORBIT ${orbit}%`; cls += ' charging'; }
    else status = 'STANDBY';
    launchStatus.textContent = status;
    launchStatus.className = cls;
    const locked = strike.target >= 0;
    launchTarget.textContent = locked ? `TGT CELL ${String(strike.target).padStart(4, '0')}` : 'NO TARGET';
    launchTarget.className = locked ? 'target set' : 'target';
    launchBtn.className = 'launch-button' + (strike.armed ? (locked ? ' armed' : ' target') : '');
    launchLatin.textContent = strike.armed && !locked ? 'TARGET' : 'LAUNCH';
  }
  safetyEl.addEventListener('click', () => {
    const r = toggleArm(strike);
    if (r === 'refused') { refuseArm(); return; }
    sfx.play('tank_pickup');   // the click; DeepWatch calls it satisfying
    if (r === 'safe') hideRangeRing();
    armUiKey = ''; syncArmUi();
    resize();   // armed promotes the minimap to a radar; safe demotes it
  });
  launchBtn.addEventListener('click', () => {
    if (strike.armed && strike.target >= 0) {
      const ci = launchStrike(strike, strikeTune);
      if (ci >= 0) {
        strikeGrace = 0.25;   // the launching click must not skip its own cam
        closeShop();          // the camera is about to ride a munition down
        hideRangeRing();
        sfx.play('tank_main');
        showToast('<div class="wave-num">MUNITION RELEASED</div>'
          + '<div class="wave-role">tap to skip to impact</div>', 1400);
      } else refuseArm();
      armUiKey = ''; syncArmUi();
      resize();   // the radar stands down with the safety
      return;
    }
    // orange state: the button itself says what is missing
    refuseArm();
  });

  // The blast itself. Portals inside the radius are not damaged — they are
  // DESTROYED, which is the reason the weapon exists. Enemies take squared
  // falloff. The world does the announcing: rings, a kick of the same shock
  // cloud the wave telegraph uses, and the loudest sample in the manifest.
  function executeStrike(ci, tNow) {
    const before = {
      portals: spawnPoints.filter((q) => q.alive).length,
      enemies: enemies.filter((e) => e.alive).length,
      towers: towers.length,
      walls: dungeon.tags.filter((tg) => tg === BLOCKED).length,
    };
    const c = graph.centers[ci];
    const radius = cellSide * strikeTune.blastCells;
    sfx.play('tank_destroyed', { dist: camDist(c) });
    // Rings tell the TRUTH now: the outermost ring IS the damage radius.
    // The first cut drew them out to 2.2x it, so level-1 fodder stood
    // visibly "inside the blast" and walked away — the visuals were writing
    // a cheque the falloff did not honour.
    warnRing(ci, 0xffffff, 1.0, radius);
    warnRing(ci, 0xffb347, 0.7, radius * 0.72);
    warnRing(ci, 0xfff2c0, 0.45, radius * 0.42);
    // the screen takes the hit too — the sector-reveal flash, borrowed
    flashEl.classList.remove('on');
    void flashEl.offsetWidth;
    flashEl.classList.add('on');
    // the firework: staged dot-burst shells, white core out to ember red,
    // each larger and sparser than the last. One strike per gate means this
    // can afford to be extravagant — it is a set piece, not a particle tax.
    const bn = graph.normals[ci];
    const bp = add3(c, scale3(bn, cellSide * 0.35));
    for (const [hex, sc, cnt] of [
      [0xffffff, 1.5, 140], [0xfff2c0, 2.4, 110],
      [0xffb347, 3.4, 90], [0xff7744, 4.4, 70], [0xff4433, 5.4, 50],
    ]) {
      const burst = makeDotBurst(hex, bn, cnt);
      burst.scale.setScalar(cellSide * sc);
      burst.position.set(bp[0], bp[1], bp[2]);
      scene.add(burst);
      debris.push(burst);
    }
    // Terrain and towers, when the toggles allow. Towers FIRST: a mounted
    // tower anchors its wall (breachWallCell refuses it), so the order is
    // what lets one strike flatten a defended rampart. Walls batch into a
    // single BFS + rebuild — six breaches must not cost six rebuilds.
    // DEEPWATCH is about portals specifically, so it is counted here rather
    // than inferred from the log line below
    strikePortalsBefore = before.portals;
    if (strikeTune.breakTowers) {
      for (const tw of [...towers]) {
        if (dist3(c, graph.centers[tw.ci]) < radius) destroyTower(tw);
      }
    }
    if (strikeTune.breakWalls) {
      let breached = 0;
      for (let ci2 = 0; ci2 < graph.centers.length; ci2++) {
        if (dungeon.tags[ci2] !== BLOCKED) continue;
        if (dist3(c, graph.centers[ci2]) < radius && breachWallCell(ci2)) breached++;
      }
      if (breached > 0) rebuildAfterBreach();
    }
    for (const sp of spawnPoints) {
      if (sp.alive && dist3(c, graph.centers[sp.ci]) < radius) {
        sp.found = true;
        killPortal(sp);
      }
    }
    for (const e of enemies) {
      if (!e.alive) continue;
      const dmg = strikeDamage(dist3(c, e.pos), radius, strikeTune);
      if (dmg > 0) damageEnemy(e, tNow, dmg, false, 'strike');
    }
    updateHud();
    checkVictory();
    // the proof line goes LAST — its first draft sat above the kill loops
    // and reported 2->2 portals on a direct hit: a bug in the REPORTING that
    // read exactly like a bug in the weapon
    console.log(`STRIKE ci=${ci}`
      + ` portals ${before.portals}->${spawnPoints.filter((q) => q.alive).length}`
      + ` enemies ${before.enemies}->${enemies.filter((e) => e.alive).length}`
      + ` towers ${before.towers}->${towers.length}`
      + ` walls ${before.walls}->${dungeon.tags.filter((tg) => tg === BLOCKED).length}`);
    const killed = strikePortalsBefore - spawnPoints.filter((q) => q.alive).length;
    if (killed > 0) { run.strikePortalKills += killed; checkAchievements(); }
  }
  let strikePortalsBefore = 0;

  // ☆ flash the neighbouring cell that is one hop closer to the heart
  let hintTimer = null;
  // non-freezing tutorial callout; flash = big centred, skip = show Skip, hold = no auto-hide
  let tutTimer = null;
  const TUT_BEAT = 4.0;   // seconds of quiet between lessons
  function tutBanner(html, opts = {}) {
    tutEl.className = opts.flash ? 'tut-flash' : '';
    tutEl.innerHTML = html + (opts.skip
      ? '<div><button class="tut-skip">skip tutorial</button></div>' : '');
    tutEl.classList.remove('hidden');
    const sk = tutEl.querySelector('.tut-skip');
    if (sk) sk.addEventListener('click', skipTutorial);
    clearTimeout(tutTimer);
    if (!opts.hold) tutTimer = setTimeout(() => tutEl.classList.add('hidden'), 4500);
  }
  function hideTutBanner() { clearTimeout(tutTimer); tutEl.classList.add('hidden'); }
  // pulse ONE hud button; pass null to clear all pulses
  let pulsedBtn = null;
  function pulseButton(sel) {
    if (pulsedBtn) pulsedBtn.classList.remove('tutorial-pulse');
    pulsedBtn = sel ? root.querySelector(sel) : null;
    if (pulsedBtn) pulsedBtn.classList.add('tutorial-pulse');
  }
  const safeSeen = () => { try { return localStorage.getItem('td.tutorialSeen'); } catch (e) { return null; } };

  // Scripted onboarding. A linear phase machine driven from animate() while
  // tutorialActive. Phase bodies land in later tasks; this is the frame.
  const tutorial = {
    phase: 'setup',
    portal: null,   // the scripted spawn point
    fodder: [],     // the 3 scripted enemies
    tShown: 0,
    frozen: false,
    frozenT: 0,
    setup() {
      // wipe any seeded neutral gates so the tutorial has exactly its one
      // scripted portal (the plan-driven wave engine seeds these at run-start;
      // the tutorial overrides with a hand-scripted phage portal instead)
      for (const sp of spawnPoints) {
        scene.remove(sp.obj); disposeObj(sp.obj);
        if (sp.mapMarker) { scene.remove(sp.mapMarker); disposeObj(sp.mapMarker); }
      }
      spawnPoints.length = 0;
      // player starts very close to the heart (distToHeart 1..2)
      let startCi = dungeon.heart;
      for (let d = 1; d <= 2 && startCi === dungeon.heart; d++) {
        for (let i = 0; i < dungeon.tags.length; i++) {
          if (dungeon.tags[i] !== BLOCKED && dungeon.distToHeart[i] === d) { startCi = i; break; }
        }
      }
      player.cur = startCi;
      player.prev = -1;
      player.pos = graph.centers[startCi].slice();
      player.visited = new Set([startCi]);
      const exits = openNeighbors(startCi);
      let e0 = exits[0] ?? startCi;
      for (const e of exits) {
        if (dungeon.distToHeart[e] === dungeon.distToHeart[startCi] - 1) { e0 = e; break; }
      }
      player.heading = tangentDirTo(startCi, e0);
      player.travelDir = player.heading.slice();
      player.smoothDir = player.travelDir.slice();
      player.next = e0;
      player.prog = 0;
      player.segLen = Math.max(1e-9, dist3(graph.centers[startCi], graph.centers[player.next]));

      ammo = 0; updateHud();
      clearOrbs();

      // portal 20–30 hops DOWN THE HALL from the heart (target 25); the
      // fodder march back toward the heart and the player intercepts.
      let portalCi = startCi, bestBand = Infinity, farCi = startCi, farD = -1;
      for (let i = 0; i < dungeon.tags.length; i++) {
        if (dungeon.tags[i] === BLOCKED) continue;
        const d = dungeon.distToHeart[i];
        if (d < 0) continue;
        if (d > farD) { farD = d; farCi = i; }
        if (d >= 20 && d <= 30) {
          const off = Math.abs(d - 25);
          if (off < bestBand) { bestBand = off; portalCi = i; }
        }
      }
      if (bestBand === Infinity) portalCi = farCi; // small map: use the farthest cell
      const obj = buildPortalObj(portalCi, whim() * 6.283);
      scene.add(obj);
      const mm = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10),
        new THREE.MeshBasicMaterial({ color: CREATURE_TINTS.phage }));
      const mmp = scale3(graph.centers[portalCi], 1 + params.wallHeight * 1.6);
      mm.position.set(mmp[0], mmp[1], mmp[2]);
      mm.visible = true; mm.layers.set(MAP_LAYER); scene.add(mm);
      this.portal = { type: 'phage', ci: portalCi, hp: 3, obj, alive: true, found: true, mapMarker: mm };
      spawnPoints.push(this.portal);
      recomputePortalDist();
      wave = 1; // the scripted wave counts as wave 1, so the BUILD-phase
                // spawnWave() (task 5) introduces the wave-2 enemy type

      // The first pair comes in FAR down the lane. They walk to you, and the
      // walk is the lesson: a pair arriving at arm's length teaches nothing
      // but panic, while eight hops of empty corridor is long enough to look
      // around, find the throttle and decide what to do about them.
      this.startCi = startCi;
      this.fodder = [];
      this.spawnFodder(2, 7, 11);
      this.frozen = true; this.frozenT = 0;
      this.gapT = 0; this.pending = null;
      tutBanner('RAM THEM · drive straight through them', { flash: true, hold: true, skip: !!safeSeen() });
      pulseButton('#td-throttle');
      this.tShown = 0; this.phase = 'ram';
    },

    // A pair of phage in the lane ahead, `dMin`..`dMax` hops FURTHER from the
    // heart than the player — so they march back down the corridor toward
    // both the player and the thing being defended.
    spawnFodder(count, dMin, dMax) {
      const spec = ENEMY_SPEC.phage;
      const sd = dungeon.distToHeart[this.startCi];
      const ahead = [];
      for (let pass = 0; pass < 2 && ahead.length < count; pass++) {
        // second pass widens the band: a small board may not have cells at
        // the preferred distance at all, and an empty wave stalls the phase
        const lo = sd + (pass ? Math.max(2, dMin - 4) : dMin);
        const hi = sd + (pass ? dMax + 8 : dMax);
        for (let i = 0; i < dungeon.tags.length && ahead.length < count; i++) {
          if (dungeon.tags[i] === BLOCKED || ahead.includes(i)) continue;
          const d = dungeon.distToHeart[i];
          if (d >= lo && d <= hi) ahead.push(i);
        }
      }
      while (ahead.length < count) ahead.push(this.portal ? this.portal.ci : this.startCi);
      const made = [];
      for (let k = 0; k < count; k++) {
        const ci = ahead[k];
        const eObj = makeDotEnemy('phage', { walker: CREATURE_TINTS.phage, walkerHi: accentFor('phage') });
        const size = spec.size * 0.7; const scale0 = cellSide * size;
        eObj.scale.setScalar(scale0); eObj.userData.s0 = scale0; scene.add(eObj);
        const nx = openNeighbors(ci);
        const e = {
          type: 'phage', spec, scale0, size,
          cur: ci, prev: -1,
          next: nx.length ? nx[Math.floor(whim() * nx.length)] : ci,
          prog: whim() * 0.4, pos: graph.centers[ci].slice(), dir: [0, 1, 0],
          obj: eObj, alive: true, phase: whim() * 6.283,
          hp: spec.hp, behMult: 1, behUntil: -1, touchCd: -1, slowFactor: 1, slowUntil: -1,
        };
        enemies.push(e); this.fodder.push(e); made.push(e);
      }
      return made;
    },
    // a phase is cleared when every enemy it spawned is down
    fodderClear() { return this.fodder.every((e) => !e.alive); },

    // A BEAT between lessons. Clearing a pair used to hand out the next
    // instruction and the next pair in the same frame, so three lessons went
    // by in the time it takes to read one — no pause to look at the HUD, no
    // moment to notice which control had just lit up. Now the kill lands, a
    // short confirmation says what you just used, and the field stays empty
    // for a few seconds before the next instruction arrives.
    beat(confirm, fn) {
      tutBanner(confirm, { hold: true });
      pulseButton(null);
      this.pending = fn;
      this.gapT = TUT_BEAT;
    },
    // One weapon per pair, in order of how much they cost you: the treads are
    // free, the lasers are free but need aim, the shell is scarce and heats
    // the barrel for three seconds. Two enemies each, so the lesson is a
    // rehearsal rather than a fight — the player is never learning a control
    // and losing at the same time.
    tick(dt) {
      // the opening hold is longer than a banner's read time on purpose: it
      // is also the first look at the board
      if (this.frozen) { this.frozenT += dt; if (this.frozenT > 5.5) { this.frozen = false; } return; }

      // a beat is running: nothing spawns, nothing is asked of the player
      if (this.gapT > 0) {
        this.gapT -= dt;
        if (this.gapT <= 0 && this.pending) {
          const go = this.pending; this.pending = null; go();
        }
        return;
      }

      if (this.phase === 'ram') {
        if (this.fodderClear()) {
          this.phase = 'laser';
          this.beat('Treads done — ramming is free, and it is always available.', () => {
            this.spawnFodder(2, 5, 8);
            tutBanner('Now the SECONDARIES · hold to sweep them with the lasers',
              { hold: true, skip: !!safeSeen() });
            pulseButton('#td-pad-laser');
          });
        }
      } else if (this.phase === 'laser') {
        if (this.fodderClear()) {
          // Shells are scarce, so the lesson hands you some rather than
          // hoping you find a pickup: a tutorial step you can fail to even
          // ATTEMPT is not a tutorial step. Orbs go down beside you as well,
          // because where shells come from is the other half of the lesson.
          this.phase = 'shell';
          this.beat('Lasers done — free to fire, but they need you pointed at it.', () => {
            // Shells are scarce, so the lesson hands you some rather than
            // hoping you find a pickup: a step you can fail to even ATTEMPT
            // is not a step. Orbs go down beside you too, because where
            // shells come from is the other half of the lesson.
            ammo = Math.max(ammo, 3); updateHud();
            const near = openNeighbors(player.cur).slice(0, 2);
            for (const ci of (near.length ? near : [player.cur])) spawnOrbAt(ci);
            this.spawnFodder(2, 5, 8);
            tutBanner('And the SHELL · overkill on these two, but it is how you '
              + 'breach a wall. Shells come from the glowing pickups — you have 3.',
              { hold: true, skip: !!safeSeen() });
            pulseButton('#td-pad-fire');
          });
        }
      } else if (this.phase === 'shell') {
        if (this.fodderClear()) {
          this.collapsePortal();   // clear the field: the next beat has no enemies
          this.phase = 'speed';
          this.beat('Shell done. That is the whole kit: treads, lasers, shell.', () => {
            tutBanner('THROTTLE · drag to set your speed, flick up for full. '
              + 'Below zero reverses — slower than forward, same lever.',
              { hold: true, skip: !!safeSeen() });
            pulseButton('#td-throttle');
            this.speedT = 0;
            this.speedFrom = throttle;
          });
        }
      } else if (this.phase === 'speed') {
        // Advance on USE, not on a timer — the point is that they touch it.
        // The timer is only there so a player who will not is not stranded.
        this.speedT += dt;
        if (Math.abs(throttle - this.speedFrom) > 0.15 || this.speedT > 16) {
          hideTutBanner();
          this.startBuild();
        }
      } else if (this.phase === 'build' || this.phase === 'done') {
        this.tickBuild(dt);
      }
    },

    // The scripted gate has done its job once the three pairs are down. It
    // collapses rather than being shot: destroying it was the old shell
    // lesson, and that lesson now lives on the enemies instead.
    collapsePortal() {
      const p = this.portal;
      if (!p || !p.alive) return;
      p.alive = false;
      scene.remove(p.obj); disposeObj(p.obj);
      if (p.mapMarker) { scene.remove(p.mapMarker); disposeObj(p.mapMarker); }
      const idx = spawnPoints.indexOf(p);
      if (idx >= 0) spawnPoints.splice(idx, 1);
      recomputePortalDist();
    },
    startBuild() {
      this.phase = 'build';
      // the wave engine spawns only from LIVE gates and no longer self-seeds
      // one per wave — the scripted gate is dead by now, so raise a fresh gate
      // before the 2nd wave or the field is empty and checkVictory false-fires
      seedPortals(1);
      spawnWave(); // a real 2nd wave: fresh gate + normal enemies (war is live)
      tutBanner('Build Towers — tap any HIGH GROUND cell, from any camera. '
        + 'The flashing cells are legal.', { skip: !!safeSeen() });
      // no button to pulse: building stopped being a mode. The orbit view is
      // just the best vantage for the lesson, so swing there.
      setView('orbit');
      snapCamera();
      pulseButton(null);
      this.animateLegalSpots();
    },
    animateLegalSpots() {
      const legal = [];
      for (let ci = 0; ci < dungeon.tags.length; ci++) {
        if (!placeError(ci)) legal.push(ci);
      }
      // pulse a bounded set near the player so it reads on a small planet
      legal.sort((a, b) =>
        dist3(graph.centers[a], player.pos) - dist3(graph.centers[b], player.pos));
      const show = legal.slice(0, 24);
      let pulses = 0;
      const beat = () => {
        const on = pulses % 2 === 0;
        for (const ci of show) paintCell(ci, on ? look().floors.hintFlash : floorColorOf(ci));
        pulses++;
        if (pulses < 6) setTimeout(beat, 420);
        else for (const ci of show) paintCell(ci, floorColorOf(ci));
      };
      beat();
    },
    tickBuild() {
      // handoff on the first tower built OR when wave-2 enemies are cleared
      if (this.phase !== 'build') return;
      if (towerByCell.size > 0
        || (spawnPoints.every((s) => !s.alive) && enemies.every((e) => !e.alive))) {
        this.phase = 'done';
        hideTutBanner();
        pulseButton(null);
        endTutorial(); // normal wave clock + orbs resume, heart guard lifts
      }
    },
    teardown() { pulseButton(null); hideTutBanner(); },
  };

  function startTutorial() {
    tutorialActive = true;
    root.classList.add('tutoring');
    tutorial.phase = 'setup';
    tutorial.setup();
  }
  function endTutorial() {
    tutorialActive = false;
    root.classList.remove('tutoring');
    waveActive = enemies.some((e) => e.alive); waveAge = 0; interClock = 0;
    tutorial.teardown();
    if (orbMeshes.size === 0) spawnOrbs(); // restore the normal shell field
    try { localStorage.setItem('td.tutorialSeen', '1'); } catch (e) { /* private mode */ }
  }
  function skipTutorial() {
    // tear down tutorial-only entities, then hand to a clean normal round
    for (const e of tutorial.fodder) { if (e.alive) { e.alive = false; scene.remove(e.obj); } }
    if (tutorial.portal && tutorial.portal.alive) {
      tutorial.portal.alive = false;
      scene.remove(tutorial.portal.obj);
      const idx = spawnPoints.indexOf(tutorial.portal);
      if (idx >= 0) spawnPoints.splice(idx, 1);
    }
    clearOrbs();
    endTutorial();
    regenerate(); // fresh normal game
  }
  function maybeStartTutorial() {
    if (runTutorial) startTutorial();
  }

  function pulseHint() {
    const d = dungeon.distToHeart;
    let next = -1;
    for (const nb of openNeighbors(player.cur)) {
      if (d[nb] === d[player.cur] - 1) { next = nb; break; }
    }
    if (next === -1) return;
    paintCell(next, look().floors.hintFlash);
    clearTimeout(hintTimer);
    const cell = next;
    hintTimer = setTimeout(() => paintCell(cell, floorColorOf(cell)), 900);
  }

  // --- HUD -----------------------------------------------------------------
  const statsEl = root.querySelector('#td-stats');
  statsEl.classList.add('hud-panel'); // the TD tab dresses the shared slot
  const dirBtnEl = root.querySelector('#td-pad-dir');
  const msgEl = root.querySelector('#td-msg');
  // the modal's buttons (event delegation survives innerHTML swaps)
  msgEl.addEventListener('click', (ev) => {
    const cl = ev.target.classList;
    if (!cl) return;
    if (cl.contains('msg-regen')) regenerate(); // retry the CURRENT round
    else if (cl.contains('msg-next')) {
      round++; hackedRound = false; syncHackBtn();
      sectorStartWave = wave;   // the next sector's programme starts here
      strike.reserved += 1; // the platform restocks one round per sector
      expandRound(); syncArmUi();
    }
    else if (cl.contains('msg-lap')) startLap();
    else if (cl.contains('msg-begin')) {
      paused = false; msgEl.classList.add('hidden');
      showBrief('arrival');   // where you are, said once you are actually there
    }
    else if (cl.contains('msg-glenemy')) showEnemyGlossary();
    else if (cl.contains('msg-glachv')) showRecord();
    else if (cl.contains('msg-glfriend')) showFriendGlossary();
    else if (cl.contains('msg-back')) showBriefing();
  });

  // card icons are the ACTUAL half-dotted representations: build the real
  // object, render one frame through the sprite rig, snapshot to a data
  // URL, dispose. Cached by key — each icon is rendered once per session.
  const spriteCache = new Map();
  function spriteShot(key, build) {
    if (spriteCache.has(key)) return spriteCache.get(key);
    const obj = build();
    const kind = obj.userData.kind;
    if (kind === 'cloud' || kind === 'orb' || kind === 'portal' || kind === 'triad' || kind === 'heart') {
      obj.position.y = 0.32; // clouds center on the origin; lift into frame
    }
    if (obj.userData.tick) obj.userData.tick(1.3); // a lively mid-anim pose
    obj.rotation.y += 0.6; // three-quarter view
    waveScene.add(obj);
    waveSpriteRenderer.render(waveScene, waveCam);
    const url = waveSpriteRenderer.domElement.toDataURL();
    waveScene.remove(obj);
    disposeObj(obj);
    spriteCache.set(key, url);
    return url;
  }

  // mini bullet triad, briefing-icon edition
  function makeTriadIcon() {
    const g = new THREE.Group();
    for (let k = -1; k <= 1; k++) {
      const b = makeShellSolid({ body: 0xffb000, hi: 0xffffff });
      b.scale.setScalar(0.19);
      b.position.set(k * 0.52, 0, 0);
      g.add(b);
    }
    g.userData.kind = 'triad';
    return g;
  }

  // the briefing card draws whatever is ACTUALLY at the pole, so the picture
  // can never disagree with the board — the same rule the hostiles glossary
  // follows by generating itself from ENEMY_SPEC
  const heartIcon = () => {
    const h = heartLook().make()
      || makeHeartCloud(new THREE.Color(look().heart).getHex());
    h.userData.kind = 'heart';
    if (h.userData.tick) h.userData.tick(1.2);
    return h;
  };
  const unitIcon = (type, tint) => () => buildCreature(type, { walker: tint, walkerHi: 0xffffff });

  // one element = one little card: real sprite · name · what it does
  const glossCard = (color, iconUrl, name, desc) =>
    `<div class="gcard"><img class="gicon" src="${iconUrl}" alt="">` +
    `<div class="gname" style="color:${color}">${name}</div>` +
    `<div class="gdesc">${desc}</div></div>`;

  // the how-to, in ONE place: shown at the beginning and while paused —
  // never on the live HUD
  const GAMEPLAY_TIPS =
    `<div class="tips-head">gameplay</div>` +
    `<div class="tips">` +
    `drive: drag the throttle · flick up for full · below zero reverses<br>` +
    `steer: the side zones · fire: &#9673; shell · &#8767; laser (overheats)<br>` +
    `B = build/tank · M = map view · in BUILD tap HIGH GROUND to place towers<br>` +
    `ESC pause · RAM the small ones · shells breach walls</div>`;

  // The field manual: one laconic CRT screen shown BEFORE the tutorial on a
  // clean load. Dismiss by tap or any key; whatever was queued (tutorial or
  // briefing) runs after. The sim is frozen while it is up.
  const introEl = root.querySelector('#td-intro');
  let introAfter = null;
  function dismissIntro() {
    if (!introEl || introEl.classList.contains('hidden')) return;
    introEl.classList.add('hidden');
    removeEventListener('keydown', introKey, true);
    paused = false;
    const after = introAfter; introAfter = null;
    if (after) after();
  }
  function introKey(ev) {
    ev.preventDefault();
    ev.stopImmediatePropagation(); // ESC must dismiss, not open the pause menu
    dismissIntro();
  }
  function showIntro(after) {
    if (!introEl) { if (after) after(); return; }
    introAfter = after || null;
    paused = true;
    introEl.classList.remove('hidden');
    introEl.addEventListener('pointerdown', dismissIntro, { once: true });
    addEventListener('keydown', introKey, true);
  }

  // opening briefing: the pieces as cards, the ONE win condition, and two
  // clickable glossaries. The sim stays frozen until the player begins.
  function showBriefing() {
    paused = true;
    msgEl.innerHTML = `<div class="msg-head">transmission · briefing</div>` +
      `<div class="msg-scroll">` +
      `<div class="gcards">` +
      glossCard('#ff6a88', spriteShot('heart', heartIcon), 'the stalheart', 'the terraformer at the pole — without it the colony dies') +
      glossCard('#9fdcff', spriteShot('tank', unitIcon('tank', look().walker)), 'your tank', 'W/Q-E drive · A/D steer · SPACE shell · SHIFT lasers · 1/2/3 views · U upgrade · ESC pause') +
      glossCard('#9fdcff', spriteShot('tower-' + params.towerLook, () => buildTowerLook(params.towerLook, TOWER_BY_KEY.single)), 'towers', 'your army — build them on the HIGH GROUND (walls) in BUILD mode') +
      glossCard('#ffb000', spriteShot('triad', makeTriadIcon), 'missile triads', 'drive over = +3 shells · shells also blast walls open') +
      glossCard('#66ff88', spriteShot('phage', unitIcon('phage', CREATURE_TINTS.phage)), 'fodder', 'soft creatures — RAM them, it’s free') +
      glossCard('#ff5340', spriteShot('barbed', unitIcon('barbed', CREATURE_TINTS.barbed)), 'spiked reds', 'armored — ramming hurts YOU · shells only') +
      glossCard('#ffffff', spriteShot('portal', () => makePortalCloud({ body: 0xcfd8ff, hi: 0xffffff })), 'portals', 'the enemy sources · 3 shells each · dim as they die') +
      `</div>` +
      GAMEPLAY_TIPS +
      `<b>WIN = DESTROY EVERY PORTAL.</b> reaching the heart wins nothing — it's home.` +
      `</div>` +
      `<div class="msg-foot">` +
      `<button class="msg-glenemy">enemy glossary</button> ` +
      `<button class="msg-glachv">the record</button> ` +
      `<button class="msg-glfriend">pickups</button><br>` +
      `<button class="msg-begin">&rsaquo; begin round ${round}</button>` +
      `</div>`;
    msgEl.classList.remove('hidden');
  }

  // THE RECORD. Everything earned and everything not, in one list, grouped
  // the way the table is. Unearned entries keep their NAME and lose their
  // note — a list of question marks tells a player nothing about what to go
  // and do, and a list that spells out every condition removes the reason to
  // wonder. The name is the hint.
  function showRecord() {
    paused = true;
    const held = new Set(heldAchv);
    const rows = ACHV_GROUPS.map((grp) => {
      const inGroup = ACHIEVEMENTS.filter((a) => a.group === grp);
      const got = inGroup.filter((a) => held.has(a.id)).length;
      return `<div class="rec-group">${grp} <i>${got}/${inGroup.length}</i></div>`
        + inGroup.map((a) => {
          const on = held.has(a.id);
          return `<div class="rec-row${on ? ' got' : ''}">`
            + `<span class="rec-mark">${on ? '&#10022;' : '&#9675;'}</span>`
            + `<span class="rec-name">${a.name}</span>`
            + `<span class="rec-note">${on ? a.note : '&mdash;'}</span></div>`;
        }).join('');
    }).join('');
    msgEl.innerHTML = `<div class="msg-head">the record</div>`
      + `<div class="msg-scroll"><div class="rec">${rows}</div></div>`
      + `<div class="go-reason">${held.size}/${ACHIEVEMENTS.length} &middot; the record survives a run; the run does not</div>`
      + `<button class="msg-back">&larr; back to briefing</button>`;
    msgEl.classList.remove('hidden');
  }

  function showEnemyGlossary() {
    paused = true;
    const cards = INTROS.map((iv) => {
      const spec = ENEMY_SPEC[iv.type];
      const tint = '#' + CREATURE_TINTS[iv.type].toString(16).padStart(6, '0');
      const ram = spec.rammable
        ? '<span style="color:#66ff88">▼ rammable</span>'
        : '<span style="color:#ff5340">× do not ram</span>';
      return glossCard(tint, spriteShot(iv.type, unitIcon(iv.type, CREATURE_TINTS[iv.type])), iv.label.toLowerCase(),
        `${iv.role} · ${spec.hp} hp · arrives wave ${iv.wave} · ${ram}`);
    }).join('');
    msgEl.innerHTML = `<div class="msg-head">glossary · hostiles</div>` +
      `<div class="gcards">${cards}` +
      glossCard('#ffffff', spriteShot('portal', () => makePortalCloud({ body: 0xcfd8ff, hi: 0xffffff })), 'portal', 'where they pour from · 3 shells to destroy · dims with each hit · pulses on the minimap once found') +
      `</div><button class="msg-back">← back to briefing</button>`;
    msgEl.classList.remove('hidden');
  }

  function showFriendGlossary() {
    paused = true;
    const orbIcon = (shape, body) => () => makeRewardSolid(shape, { body, hi: 0xffffff }, 1.7);
    msgEl.innerHTML = `<div class="msg-head">glossary · pickups</div>` +
      `<div class="gcards">` +
      glossCard('#ff6a88', spriteShot('heart', heartIcon), 'the stalheart', `${HEART_MAX} hp · enemy contact drains it · regen charges heal it`) +
      glossCard('#9fdcff', spriteShot('tower-' + params.towerLook, () => buildTowerLook(params.towerLook, TOWER_BY_KEY.single)), 'towers', 'mount on walls only · tap high ground in BUILD mode · upgrade twice · sell 75%') +
      glossCard('#ffb000', spriteShot('triad', makeTriadIcon), 'missile triad', '+3 shells on touch (rack caps at 9) — the ONLY ammo pickup') +
      glossCard('#9ff8ff', spriteShot('orb-power', orbIcon('star', 0x9ff8ff)), 'power sphere', 'far-field reward · +8% speed, permanent') +
      glossCard('#3dff6e', spriteShot('orb-health', orbIcon('cell', 0x3dff6e)), 'health sphere', 'far-field reward · +1 your hp') +
      glossCard('#ff2df0', spriteShot('orb-regen', orbIcon('ring', 0xff2df0)), 'regen charge', 'CARRY it back near the heart: +4 heart hp') +
      glossCard('#59c8ff', spriteShot('orb-shield', orbIcon('dome', 0x59c8ff)), 'energy shield', '12s bubble over the hull — touch damage bounces off') +
      `</div><button class="msg-back">← back to briefing</button>`;
    msgEl.classList.remove('hidden');
  }
  // THE HACK: the vendored HDT circuit duel in a same-origin iframe.
  // 3.html is the deep link — the minigame's router parses digits out of
  // the path, so a copy under that name boots straight into game 3 with
  // zero source patching. Same origin means the parent can simply READ
  // the game's own state (window.__cx.game().phase) instead of needing a
  // postMessage protocol added to a finished game.
  // THREE PROTOCOLS on the relay: the HDT circuit duel, and two grid
  // puzzles from pazorukore (BRIDGE = hashiwokakero, SHIKAKU) — vendored
  // build-free at minigames/pzk, selected by its own ?game= query. Win
  // states differ by engine: the duel exposes __cx.game().phase
  // ('WON'/'LOST'); pazorukore exposes __pazoru.phase ('solved' — its
  // puzzles cannot be lost, only abandoned).
  const HACK_GAMES = {
    hdt: { src: 'minigames/hdt/3.html' },
    bridges: { src: 'minigames/pzk/index.html?game=bridges&skin=futuristic' },
    shikaku: { src: 'minigames/pzk/index.html?game=shikaku&skin=futuristic' },
  };
  let hackGame = 'hdt';
  // A DIFFERENT BOARD EVERY BREACH (operator: "it's always the same game").
  // Both engines shipped with a constant seed — pazorukore's defaultParams
  // hardcodes `seed: 1`, and the duel's specs carry the string seeds "hdt",
  // "net" and "orbs" — so every hack served the identical puzzle. Neither
  // is fixed by reloading: the constant is inside the game.
  //
  // The seed is still DERIVED, not random: the house rule is one mulberry32
  // stream off params.seed and no Math.random in game logic, so a replayed
  // run breaches the same puzzles in the same order. hackOpens is what
  // moves it — the count of breaches this run.
  let hackOpens = 0;
  function hackSeed() {
    const rng = mulberry32((params.seed | 0) * 7919 + hackOpens * 104729 + round * 31);
    return (rng() * 0xffffffff) >>> 0;
  }
  // The duel has no URL seed, but its bridge exposes regenerate(spec, seed)
  // — the same call it makes on a DEADLOCK — and game().board carries the
  // spec. So the parent rebuilds the board after the frame boots rather
  // than patching a minified bundle it does not own.
  function reseedHdt(seed, tries = 0) {
    try {
      const w = hackFrameEl && hackFrameEl.contentWindow;
      const cx = w && w.__cx;
      const b = cx && cx.game && cx.game().board;
      if (b && b.spec && cx.regenerate) { cx.regenerate(b.spec, `hdt-${seed}`); return; }
    } catch { /* frame still booting */ }
    if (tries < 40) setTimeout(() => reseedHdt(seed, tries + 1), 120);
  }
  // THE BAR READS THE GAME OUT. The duel keeps a budget for each side and a
  // clock, and showed none of it — the operator could not tell how many
  // attempts they had left, how many the host had, or how close the thing
  // was to ending, so it always ended abruptly. All three are already on
  // the bridge; nobody was asking for them.
  const hackReadEl = root.querySelector('#td-hack-readout');
  function syncHackReadout() {
    if (!hackReadEl) return;
    let txt = '';
    try {
      const w = hackFrameEl && hackFrameEl.contentWindow;
      if (hackGame === 'hdt' && w && w.__cx && w.__cx.game) {
        const g = w.__cx.game();
        if (g && g.pBudget !== undefined) {
          const low = g.pBudget <= 2 ? ' low' : '';
          txt = `<b class="hk-you${low}">YOU ${g.pBudget}</b>`
            + `<b class="hk-them">HOST ${g.eBudget}</b>`
            + (g.timeLeft !== undefined ? `<b class="hk-clock">${Math.ceil(g.timeLeft)}s</b>` : '')
            + (g.phase ? `<b class="hk-phase">${g.phase}</b>` : '');
        }
      } else if (w && w.__pazoru) {
        const ph = w.__pazoru.phase;
        if (ph) txt = `<b class="hk-phase">${String(ph).toUpperCase()}</b>`;
      }
    } catch { /* frame still booting, or gone */ }
    if (hackReadEl.innerHTML !== txt) hackReadEl.innerHTML = txt;
  }

  // FIT THE GAME TO THE FRAME. These are embedded pages with their own
  // responsive layouts, and on a phone the board simply ran off the right
  // edge — the operator saw the logo and a sliver of grid. Rather than
  // fight three separate layouts, the frame is given the width the games
  // were designed for and scaled down to whatever the wrapper actually is.
  const HACK_LOGICAL_W = 560;   // the fallback, for a frame not yet readable
  function fitHackFrame() {
    if (!hackFrameEl || !hackWrapEl || hackWrapEl.classList.contains('hidden')) return;
    const wrap = hackWrapEl.getBoundingClientRect();
    const bar = hackWrapEl.querySelector('.hk-bar');
    const barH = bar ? bar.getBoundingClientRect().height : 0;
    const availW = wrap.width, availH = Math.max(120, wrap.height - barH);
    // ASK THE GAME how wide it wants to be rather than guessing. 560 fitted
    // the duel and left the pazorukore board hanging off the side — they are
    // three different layouts and a single constant was never going to serve
    // all of them. Same-origin, so the child's own scrollWidth is readable;
    // the constant is only the fallback for a frame that has not painted.
    let logical = HACK_LOGICAL_W;
    try {
      const d = hackFrameEl.contentDocument;
      if (d && d.documentElement) {
        logical = Math.max(logical, d.documentElement.scrollWidth, d.body ? d.body.scrollWidth : 0);
      }
    } catch { /* not readable yet */ }
    const scale = Math.min(1, availW / logical);
    if (scale >= 1) {
      // desktop has the room: leave the frame alone entirely
      hackFrameEl.style.width = '';
      hackFrameEl.style.height = '';
      hackFrameEl.style.transform = '';
      return;
    }
    // AND CAP THE HEIGHT. The first cut scaled width only and handed the
    // child a 560x866 viewport — phone-shaped. The pazorukore board sizes
    // its cells from the AVAILABLE HEIGHT, so a very tall frame grew them
    // until the board ran off the side, which is the clipping the operator
    // saw. Capped to a shape those games were actually laid out in, and
    // letterboxed down the middle rather than stretched.
    const logicalH = Math.min(availH / scale, logical * 1.28);
    const usedH = logicalH * scale;
    const padY = Math.max(0, (availH - usedH) / 2);
    hackFrameEl.style.width = `${logical}px`;
    hackFrameEl.style.height = `${logicalH}px`;
    hackFrameEl.style.transformOrigin = 'top left';
    hackFrameEl.style.transform = `translateY(${padY / scale}px) scale(${scale})`;
    if (urlParams.get('hack')) {
      let child = '';
      try {
        const d = hackFrameEl.contentDocument;
        const de = d && d.documentElement;
        if (de) {
          child = ` child=${de.scrollWidth}x${de.scrollHeight}`
            + ` client=${de.clientWidth}x${de.clientHeight}`
            + ` overflows=${de.scrollWidth > de.clientWidth + 1}`;
        }
      } catch { child = ' child=unreadable'; }
      console.log(`HACKFIT avail=${Math.round(availW)}x${Math.round(availH)}`
        + ` logical=${logical} scale=${scale.toFixed(3)}`
        + ` frame=${Math.round(hackFrameEl.getBoundingClientRect().width)}` + child);
    }
  }
  addEventListener('resize', fitHackFrame);

  function readHackPhase() {
    try {
      const w = hackFrameEl.contentWindow;
      if (!w) return null;
      if (hackGame === 'hdt') {
        const cx = w.__cx;
        if (cx && cx.game) {
          const ph = cx.game().phase;
          if (ph === 'WON') return 'won';
          if (ph === 'LOST') return 'lost';
        }
      } else if (w.__pazoru && w.__pazoru.phase === 'solved') return 'won';
    } catch { /* frame still booting */ }
    return null;
  }
  const hackBtnEl = root.querySelector('#td-hack');
  const hackPromptEl = root.querySelector('#td-hackprompt');
  let hackPromptForce = false;
  if (hackPromptEl) hackPromptEl.addEventListener('pointerdown', () => openHack());
  const hackWrapEl = root.querySelector('#td-hackwrap');
  const hackFrameEl = root.querySelector('#td-hackframe');
  let hackPoll = null;
  function syncHackBtn() {
    if (hackBtnEl) hackBtnEl.classList.toggle('hidden', !(serverFound && !hackedRound));
  }
  function openHack() {
    if (!hackWrapEl || !hackFrameEl || hackedRound) return;
    if (!hackWrapEl.classList.contains('hidden')) return; // already breaching
    paused = true;
    sfx.play('server_dialup'); // six seconds of negotiation IS the fiction
    hackOpens++;               // moves the seed: a new board every breach
    setHackGame(hackGame);
    hackWrapEl.classList.remove('hidden');
    fitHackFrame();
    if (hackFrameEl) {
      hackFrameEl.addEventListener('load', () => {
        // twice: once on load, once after the child has laid itself out.
        // Measuring a document that has not painted returns the viewport
        // width, which is the answer that makes the fit a no-op.
        fitHackFrame();
        setTimeout(fitHackFrame, 250);
        setTimeout(fitHackFrame, 900);
      }, { once: true });
    }
    clearInterval(hackPoll);
    hackPoll = setInterval(() => {
      syncHackReadout();
      const ph = readHackPhase();
      if (ph === 'won' || ph === 'lost') endHack(ph === 'won');
    }, 600);
  }

  // A BREACH ENDS ON A BEAT, not on a cut. The overlay used to vanish the
  // instant the game's phase flipped, so a win and a loss felt identical
  // from the outside: the screen you were reading was simply gone
  // (operator). The bar says what happened and holds it for a moment with
  // the board still behind it, then closes.
  let hackEnding = false;
  function endHack(won) {
    if (hackEnding) return;
    hackEnding = true;
    clearInterval(hackPoll); hackPoll = null;
    if (hackReadEl) {
      hackReadEl.innerHTML = won
        ? `<b class="hk-won">&#10022; BREACHED</b>`
        : `<b class="hk-lost">&#10005; TRACED &mdash; LOCKED OUT</b>`;
    }
    sfx.play(won ? 'tower_upgrade' : 'danger_alert');
    setTimeout(() => { hackEnding = false; closeHack(won); }, 1600);
  }
  function setHackGame(g) {
    if (!HACK_GAMES[g]) g = 'hdt';
    hackGame = g;
    const seed = hackSeed();
    if (hackFrameEl) {
      // the pazorukore games take the seed on their own query string; the
      // duel is reseeded through its bridge once it has booted
      hackFrameEl.src = g === 'hdt'
        ? HACK_GAMES[g].src
        : `${HACK_GAMES[g].src}&seed=${seed}`;
      if (g === 'hdt') reseedHdt(seed);
    }
    for (const b of root.querySelectorAll('.hk-tab')) {
      b.classList.toggle('active', b.dataset.hack === g);
    }
  }
  for (const b of root.querySelectorAll('.hk-tab')) {
    b.addEventListener('click', () => setHackGame(b.dataset.hack));
  }
  function closeHack(won) {
    hackEnding = false;
    clearInterval(hackPoll); hackPoll = null;
    if (hackWrapEl) hackWrapEl.classList.add('hidden');
    if (hackFrameEl) hackFrameEl.src = 'about:blank';
    paused = false;
    if (won === true) {
      hackedRound = true;
      hackWins++;
      if (!run.minigamesWon.includes(hackGame)) run.minigamesWon.push(hackGame);
      checkAchievements();
      if (hackWins === 2) {
        // the SECOND win opens the black market: missiles for biomass
        missileShop = true;
        showToast(`<div class="wave-num">BLACK MARKET OPEN</div>`
          + `<div class="wave-role">the relay sells missiles now — expensive, and worth it</div>`, 3600);
        syncArmUi();
      } else {
        hackedUnlocks++;
        const ks = unlockedTowerKeys(wave, hackedUnlocks);
        showTowerToast(ks[ks.length - 1]);
        showToast(`<div class="wave-num">FIRMWARE PATCHED</div>`
          + `<div class="wave-role">${hackedUnlocks <= 1
            ? 'AOE schematics decrypted — the relay held the OP half of the combo'
            : 'a tower unlocked ahead of its wave'}</div>`, 3400);
      }
      updateHud();
    } else if (won === false) {
      showToast(`<div class="wave-num">TRACE COMPLETE</div>`
        + `<div class="wave-role">connection dropped — the relay resets, try again</div>`, 2800);
    }
    syncHackBtn();
  }
  if (hackBtnEl) hackBtnEl.addEventListener('click', openHack);
  const hackAbortEl = root.querySelector('#td-hack-abort');
  if (hackAbortEl) hackAbortEl.addEventListener('click', () => closeHack(null));

  // callout pop-ups + the ram combo counter (both pointer-transparent)
  const calloutsEl = root.querySelector('#td-callouts');
  const comboEl = root.querySelector('#td-combo');
  // WHAT SURVIVES THE ENCOURAGEMENT BEING SWITCHED OFF. The praise is the
  // part the operator wants gone — RECKLESS!, すげ〜!, the heart's lines. The
  // SCORING is not praise: a streak multiplier and a ram count are facts you
  // are playing against, so they stay. With the words stripped, in every
  // language, because "×1.45" is the whole message and "STREAK" was only ever
  // decoration on it.
  const CALLOUT_NUMERIC = { 'co-streak': true, 'co-milestone': true };
  const numbersOnly = (t) => {
    const m = String(t).match(/[×x]\s*[\d.]+/);
    return m ? m[0].replace(/\s+/g, '') : t;
  };

  function showCallout(text, cls, pin = false) {
    if (!calloutsEl) return;
    if (!params.callouts) {
      if (!CALLOUT_NUMERIC[cls]) return;   // the praise goes quiet
      text = numbersOnly(text);
    }
    while (calloutsEl.children.length >= 3) calloutsEl.firstChild.remove();
    const d = document.createElement('div');
    d.className = `callout ${cls}`;
    d.textContent = text;
    calloutsEl.appendChild(d);
    // pin: the forced ?callout=1 path — under a virtual-time budget both
    // the removal timer AND the 1.2s animation outrun the first paint
    if (pin) d.style.animation = 'none';
    else setTimeout(() => d.remove(), 1200);
  }
  // one class on the tab root moves both number slots off the middle of the
  // screen; the CSS owns where, so this never has to know
  function syncCalloutMode() {
    root.classList.toggle('no-callouts', !params.callouts);
    syncCombo();
  }

  function syncCombo() {
    if (!comboEl) return;
    if (ramCombo < 2) { comboEl.classList.add('hidden'); return; }
    comboEl.textContent = params.callouts ? `RAM ×${ramCombo}` : `×${ramCombo}`;
    // the tier is the intensity dial: size and color climb every 10
    comboEl.dataset.tier = String(Math.min(5, Math.floor(ramCombo / 10)));
    comboEl.classList.remove('hidden');
    comboEl.classList.remove('pop');
    void comboEl.offsetWidth; // restart the pop animation
    comboEl.classList.add('pop');
  }
  function noteStreak() {
    // a callout at every 5th consecutive kill — the multiplier made visible
    const st = eco.streak;
    run.bestStreak = Math.max(run.bestStreak, st);
    checkAchievements();
    if (st >= streakMark + 5) {
      streakMark = st - (st % 5);
      showCallout(`STREAK ×${eco.multiplier().toFixed(2)}`, 'co-streak');
    }
    if (rs) rs.maxRank = Math.max(rs.maxRank, tankRank);
    run.maxRank = Math.max(run.maxRank, tankRank);
    checkAchievements();
  }
  function noteKillContext(e, src) {
    noteStreak();
    // hands-on kill of a SOLID unit at arm's length: the reckless family
    if (src === 'tank' && !e.spec.rammable
        && dist3(e.pos, player.pos) < cellSide * 2.4) {
      showCallout(RECKLESS_MSGS[recklessIdx++ % RECKLESS_MSGS.length], 'co-reckless');
    }
    // any kill in the heart's yard — gated, sieges kill by the dozen
    if (heartCalloutCd <= 0
        && dist3(e.pos, graph.centers[dungeon.heart]) < cellSide * 2.5) {
      heartCalloutCd = 6;
      showCallout(HEART_MSGS[heartIdx++ % HEART_MSGS.length], 'co-heart');
    }
  }

  // End-of-wave SitRep: the downtime between waves earns a recap — kills
  // by type as a tinted histogram, kill tempo as a block-glyph sparkline,
  // points and bonuses in one line. Military register, field-manual green.
  // Non-blocking: the tank still drives; tap dismisses, the next wave's
  // telegraph dismisses it regardless.
  const sitrepEl = root.querySelector('#td-sitrep');
  const SPARK = '▁▂▃▄▅▆▇█';
  function sparkline(bins) {
    let last = bins.length - 1;
    while (last > 0 && bins[last] === 0) last--;
    const used = bins.slice(0, Math.max(3, last + 1));
    const top = Math.max(1, ...used);
    return used.map((v) => SPARK[Math.round((v / top) * 7)]).join('');
  }
  function showSitrep() {
    if (!sitrepEl || !ws) return;
    const total = Object.values(ws.kills).reduce((a, b) => a + b, 0);
    if (total === 0) return; // nothing happened; say nothing
    const dur = Math.max(1, Math.round(simTime - ws.t0));
    const top = Math.max(1, ...Object.values(ws.kills));
    const rows = Object.entries(ws.kills).sort((a, b) => b[1] - a[1])
      .map(([type, k]) => {
        const tint = '#' + (CREATURE_TINTS[type] ?? 0xffffff).toString(16).padStart(6, '0');
        return `<div class="sr-row"><span class="sr-name">${type}</span>`
          + `<span class="sr-track"><span class="sr-bar" style="width:${Math.round((k / top) * 100)}%;background:${tint}"></span></span>`
          + `<span class="sr-n">${k}</span></div>`;
      }).join('');
    sitrepEl.innerHTML =
      `<div class="sr-head">&#9626; SITREP &middot; WAVE ${wave} CLEAR &middot; ${dur}s</div>`
      + `<div class="sr-line">KILLS ${total} &mdash; tank ${ws.bySrc.tank}`
      + ` &middot; towers ${ws.bySrc.tower} &middot; orbital ${ws.bySrc.strike}</div>`
      + rows
      + `<div class="sr-line sr-spark">TEMPO ${sparkline(ws.bins)}</div>`
      + `<div class="sr-line">POINTS +${fmt(score.points - ws.points0)}`
      + ` &middot; CLEAR BONUS +${100 + 25 * wave} &middot; PEAK &times;${ws.maxMult.toFixed(2)}</div>`
      + `<div class="sr-line">RAMS ${ws.rams}${ws.leaks ? ` &middot; <span class="sr-leak">LEAKS ${ws.leaks}</span>` : ' &middot; no leaks'}</div>`
      + `<div class="sr-foot">[ tap &mdash; dismiss ]</div>`;
    sitrepEl.classList.remove('hidden');
  }
  function hideSitrep() { if (sitrepEl) sitrepEl.classList.add('hidden'); }
  if (sitrepEl) sitrepEl.addEventListener('pointerdown', (ev) => {
    ev.stopPropagation(); // a dismiss tap must not read as a board tap
    hideSitrep();
  });

  // generic transient toast (non-blocking, auto-hides)
  const toastEl = root.querySelector('#td-toast');
  let toastTimer = null;
  function showToast(html, ms = 3000) {
    if (!toastEl) return;
    toastEl.innerHTML = html;
    // the toast is pointer-transparent by default (it sits over the board);
    // it only accepts taps when it is carrying one to accept
    toastEl.classList.toggle('actionable', html.includes('toast-yes'));
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), ms);
  }
  if (toastEl) {
    toastEl.addEventListener('click', (ev) => {
      if (!ev.target.classList || !ev.target.classList.contains('toast-yes')) return;
      toastEl.classList.add('hidden');
      toastEl.classList.remove('actionable');
      setView('drone');
    });
  }

  // switching back to driving: a brief, non-pausing reminder of the mode model
  function showOverrideModal() {
    showToast(`<div class="wave-num">MANUAL</div>` +
      `<div class="wave-role">you're driving — tap a directive to hand the wheel to auto</div>`);
  }
  // The instrument panel. Three reading distances, three brightness tiers:
  // vitals bright and big (sub-second combat reads), resources mid (biomass
  // orange as ever, the wave numeral the largest thing on the panel), meta
  // and objectives dim. The who-is-driving line is GONE from the panel —
  // control state lives ON the AUTO button now, where the control is.
  function updateHud() {
    if (eco && eco.biomass > run.peakBiomass) { run.peakBiomass = eco.biomass; checkAchievements(); }
    if (lifeContainers.length) syncLifeContainers();
    const spAlive = spawnPoints.filter((s) => s.alive).length;
    const alerts = [shieldT > 0 ? `⛨ SHIELD ${Math.ceil(shieldT)}s` : '',
      carryingRegen ? '⬤ REGEN CARRIED' : '',
      cannonHeat > 0 ? 'CANNON HOT' : '',
      laserOverheat ? 'LASER COOLING' : ''].filter(Boolean).join(' · ');
    const hearts = `<span class="hp-heart">${'♥'.repeat(Math.max(0, heartHP))}</span>`
      + `<span class="hp-dim">${'·'.repeat(Math.max(0, HEART_MAX - heartHP))}</span>`;
    statsEl.innerHTML =
      `<div class="hud-meta">SCORE <b>${fmt(score.points)}</b> · BEST ${fmt(score.best)}`
      + `${rankBadgeHud ? ' ' + rankBadgeHud : ''}</div>`
      + `<div class="hud-vitals">${hearts} <span class="hud-lbl">HEART</span>`
      + ` <span class="hp-you">♥${playerHP}</span>`
      + ` <span class="hp-ammo${ammo === 0 ? ' out' : ''}">✦${ammo}</span></div>`
      + `<div class="hud-res"><span class="hud-biomass">${eco.biomass}kg`
      + ` ×${eco.multiplier().toFixed(2)}</span>`
      + `<span class="hud-wave">WAVE <b>${wave}</b> · R${round}</span></div>`
      + `<div class="hud-obj">portals ${spAlive}/${spawnPoints.length}`
      + ` · ${programmeDone() ? 'WAVES SPENT — CLOSE THE GATES'
        : `wave ${sectorWave() + 1}/${params.wavesPerSector} of sector ${round}`}`
      + ` · built ${towers.length}</div>`
      + isaoLine()
      + (alerts ? `<div class="hud-alert">${alerts}</div>` : '');
    if (dirBtnEl) {
      const eng = !manualActive();
      const lbl = eng ? (DIRECTIVE_LABEL[params.directive] || 'AUTO')
        : (cruise ? 'CRUISE' : 'AUTO');
      if (dirBtnEl.textContent !== lbl) dirBtnEl.textContent = lbl;
      dirBtnEl.classList.toggle('engaged', eng);
    }
    // diegetic shell rack: the 3×3 turret dots ARE the ammo counter —
    // neon white loaded, faded grey spent (allies stay full: infinite ammo)
    const dots = playerMesh && playerMesh.userData.ammoDots;
    if (dots) {
      for (let i = 0; i < dots.length; i++) {
        dots[i].material.color.setHex(i < ammo ? 0xffffff : 0x4a505c);
      }
    }
  }

  // AUTO GUNNER: in auto mode the tank fights for itself — shells at the
  // nearest enemy in range (the 3 s cannon heat is the fire rate). The
  // directives shape it: 'conserve' and 'ram' spend shells only on the
  // unrammable tier; portals are always worth a shell when nothing else
  // is pressing. Manual mode leaves the trigger entirely to the player.
  // AUTO SECONDARY (operator, 2026-09-01). The lasers cost nothing — no
  // ammo, only heat — so auto uses them in EVERY directive. That is why
  // this does not touch the shell rules below: 'conserve' is conserving
  // limited shells, and there is nothing to conserve about the secondary.
  //
  // RAM is the one exception, and only half an exception: it will not burn
  // a target it is lining up to ram, but it still answers the hard tier it
  // refuses to charge.
  let autoLaserWant = false;
  function autoSecondary() {
    autoLaserWant = false;
    if (manualActive() || player.won || playerDown || paused) return;
    if (!playerMesh || laserOverheat) return;
    const R = 2.6 * cellSide;   // the bolt's own reach, same constant it flies
    // this half only MEASURES; wantsSecondary decides, and is Node-tested
    const cands = [];
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = dist3(player.pos, e.pos);
      if (d > R) continue;
      const to = norm3(sub3(e.pos, player.pos));
      cands.push({ inRange: true, ahead: dot3(to, player.heading), rammable: e.spec.rammable });
    }
    autoLaserWant = wantsSecondary(params.directive, cands);
  }

  function autoGunner(tNow) {
    // any camera: watching from orbit must not stand your own gun down
    if (manualActive() || player.won || playerDown || paused) return;
    if (ammo <= 0 || cannonHeat > 0) return;
    const R = cellSide * 3.0;
    const shellsAll = shellsForAll(params.directive);
    let target = null, bd = R;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (!shellsAll && e.spec.rammable) continue;
      const d = dist3(player.pos, e.pos);
      if (d < bd) { bd = d; target = e.pos; }
    }
    if (!target) {
      for (const sp of spawnPoints) {
        if (!sp.alive) continue;
        const d = dist3(player.pos, graph.centers[sp.ci]);
        if (d < bd) { bd = d; target = graph.centers[sp.ci]; }
      }
    }
    if (!target) return;
    const n = norm3(player.pos);
    const raw = sub3(target, player.pos);
    const flat = sub3(raw, scale3(n, dot3(raw, n)));
    const l = len3(flat);
    if (l < 1e-9) return;
    fire(scale3(flat, 1 / l));
  }

  // --- pause (ESC): freeze the simulation, keep presenting the frame ------
  let paused = false;
  function togglePause() {
    if (player.won) return; // the end-of-game modal owns the screen
    paused = !paused;
    if (paused) {
      msgEl.innerHTML = `<div class="msg-head">transmission · paused</div>` +
        `sector frozen<br>ESC resumes` + GAMEPLAY_TIPS;
      msgEl.classList.remove('hidden');
    } else {
      msgEl.classList.add('hidden');
    }
    updateHud();
  }

  // wave announcement banner — HokorobiTawaa's "New Threat" card, complete
  // with its spinning live model of the enemy. The sprite renderer is ONE
  // persistent context created up front (never per-announcement — contexts
  // are a scarce browser resource and leak on loss).
  const waveEl = root.querySelector('#td-wave');
  let waveTimer = null;
  // preserveDrawingBuffer: the glossary snapshots toDataURL() this canvas
  const waveSpriteRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  waveSpriteRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  waveSpriteRenderer.setSize(96, 96);
  waveSpriteRenderer.domElement.className = 'wave-sprite';
  const waveScene = new THREE.Scene();
  const waveCam = new THREE.PerspectiveCamera(38, 1, 0.1, 10);
  waveCam.position.set(0, 0.55, 2.7);
  waveCam.lookAt(0, 0.3, 0);
  waveScene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.6));
  const waveSun = new THREE.DirectionalLight(0xffffff, 1.4);
  waveSun.position.set(2, 3, 2);
  waveScene.add(waveSun);
  let waveUnit = null;

  function announceWave(intro) {
    const tint = '#' + CREATURE_TINTS[intro.type].toString(16).padStart(6, '0');
    const spec = ENEMY_SPEC[intro.type];
    // the one fact the player must not miss: can I drive over it?
    const ram = spec.rammable
      ? '<div class="wave-ram" style="color:#66ff88">▼ RAMMABLE — run it over</div>'
      : '<div class="wave-ram" style="color:#ff5340">× DO NOT RAM — shells only</div>';
    waveEl.style.borderColor = tint;
    waveEl.style.color = tint;
    waveEl.innerHTML = `<div class="wave-num">WAVE ${intro.wave} · NEW THREAT</div>` +
      `<div class="wave-name">${intro.label}</div>` +
      `<div class="wave-role">${intro.role}</div>` + ram;
    // live model between the header and the name (innerHTML wipe means the
    // canvas must be re-inserted each announcement)
    waveEl.insertBefore(waveSpriteRenderer.domElement, waveEl.querySelector('.wave-name'));
    if (waveUnit) { waveScene.remove(waveUnit); disposeObj(waveUnit); }
    waveUnit = buildCreature(intro.type, { walker: CREATURE_TINTS[intro.type], walkerHi: 0xffffff });
    // mesh units stand on y=0, clouds center on the origin — lift clouds
    if (waveUnit.userData.kind === 'cloud') waveUnit.position.y = 0.3;
    waveScene.add(waveUnit);
    waveEl.classList.remove('hidden');
    clearTimeout(waveTimer);
    waveTimer = setTimeout(() => waveEl.classList.add('hidden'), 4200);
  }

  const nextEl = root.querySelector('#td-next');
  function updateNextPreview() {
    if (player.won || tutorialActive || !nextEl) { nextEl && nextEl.classList.add('hidden'); return; }
    const n = wave + 1;
    const plan = computeWavePlan(n, round, params.waveSize);
    const chips = plan.entries.map((e, i) => {
      const tint = '#' + CREATURE_TINTS[e.type].toString(16).padStart(6, '0');
      const mark = i === 0 ? '◈' : '●';
      const nm = (INTROS.find((iv) => iv.type === e.type)?.label || e.type).toLowerCase();
      return `<span class="nx-chip" style="color:${tint}">${mark} ${nm} ×${e.count}</span>`;
    }).join('');
    const frozen = buildFrozen() || shotId() === 'reveal';
    let when;
    if (frozen) when = 'ready · leave BUILD to engage';
    else if (waveActive && !enemies.every((e) => !e.alive)) {
      // mid-wave the chip said 'clear the field' — permanent furniture
      // saying something the board already says. It HIDES now: the chip
      // appears at wave-clear with the countdown and leaves at spawn.
      nextEl.classList.add('hidden');
      return;
    }
    // the armed countdown is the truth once it is running — during a stall
    // the gap clock is not what decides when the wave lands
    else if (waveIn >= 0) when = `in ${Math.max(0, Math.ceil(waveIn))}s`;
    else when = `in ${Math.max(0, Math.ceil(params.waveGap - interClock))}s`;
    nextEl.innerHTML = `<div class="nx-head">NEXT WAVE ${n} · ${when}</div><div class="nx-row">${chips}</div>`;
    nextEl.classList.remove('hidden');
  }

  // tower-unlock toast — own element (#td-tower) so it never clobbers the
  // enemy "NEW THREAT" waveEl card that fires on the same spawnWave() call
  const towerEl = root.querySelector('#td-tower');
  let towerToastTimer = null;
  function showTowerToast(key) {
    const def = TOWER_BY_KEY[key];
    if (!def) return;
    towerEl.style.borderColor = '#7fdfff';
    towerEl.style.color = '#7fdfff';
    towerEl.innerHTML = `<div class="wave-num">NEW TOWER UNLOCKED</div>` +
      `<div class="wave-name">${def.label}</div>` +
      `<div class="wave-role">available now in BUILD</div>`;
    // clear any stale icon before inserting the new one
    const old = towerEl.querySelector('.wave-icon');
    if (old) old.remove();
    const icon = spriteShot(`tower-${params.towerLook}-${key}`, () => buildTowerLook(params.towerLook, def));
    const img = new Image(); img.src = icon; img.className = 'wave-icon';
    towerEl.insertBefore(img, towerEl.querySelector('.wave-name'));
    towerEl.classList.remove('hidden');
    clearTimeout(towerToastTimer);
    towerToastTimer = setTimeout(() => towerEl.classList.add('hidden'), 3000);
  }

  // --- generation ----------------------------------------------------------
  function regenerate() {
    const t0 = performance.now();
    ctlLog('regenerate:before');
    runGen++;   // anything the old run left in flight is now stale by number
    // a regenerate is a FRESH RUN: sector 1, towers gone, fresh purse.
    // (Round expansion never comes through here — expandRound reveals the
    // same world in place, towers standing.) Clear towers first: stale
    // towerCells would poison openNeighbors during board generation.
    round = 1;
    // A FRESH RUN GETS A FRESH AUDIO GRAPH. Beds are owned by handles, and a
    // regenerate throws the owners away — so anything still looping kept
    // looping, and the next run layered its own on top. Two games in, that
    // is two engine beds and every voice either has ever fired still wired
    // to a bus (operator: "the sound started to lag after the second game").
    sfx.panic();
    stopEngine(0, true);
    sectorStartWave = 0; sectorsCleared = 0;
    // the record persists; the RUN's facts do not
    run = blankRun();
    runAchv = [];
    clearTowers();
    // opening biomass: exactly a Rapid (70kg) + a Slow (100kg) — your first plan
    eco = makeEconomy({ startBiomass: 170 });
    score.reset();
    // THE OPENING GARRISON (sim batch: the heart pays half its total in
    // waves 1-3, before any kit exists).
    //
    // It used to stand PRE-BUILT on the walls nearest the heart — two towers
    // that simply existed, behind the Stalheart, doing their work from
    // somewhere the player never looks. Both halves of that were wrong
    // (operator, 2026-09-02): nothing the player builds is built by the
    // player, and that rule should hold from the first second, so ISAO flies
    // out and prints these like any other order; and tucked in behind the
    // heart they were shooting at things that had already arrived.
    //
    // The board opens on a drone doing its job at a place worth looking at.
    // The garrison is still FREE — the biomass is credited before the orders
    // are placed, so orderTower's own spend nets to zero and every other
    // rule (the queue, the travel, the print clock) applies unchanged.
    queueMicrotask(() => {
      eco.addBiomass(TOWER_BY_KEY.single.cost * 2);
      for (const ci of garrisonSites(2)) orderTower('single', ci, { quiet: true });
      spawnIsao();   // on shift from the first second, order or no order
    });
    hackedUnlocks = 0; hackedRound = false; syncHackBtn();
    hackWins = 0; missileShop = false; missilesBought = 0;
    resetRunStats();
    bossCued = false;
    dangerWarnedWave = -1;
    heartCalloutCd = 0; streakMark = 0;
    ramCombo = 0; ramComboT = 0; syncCombo();
    breachedCells.clear(); // a NEW world owes nothing to the old one's holes
    mesh = generateSphereMesh({ seed: params.seed >>> 0, n: params.points, k: 12 });
    relax(mesh, { n_iters: params.relaxIters, PULL_RATE: 0.25 });
    dungeon = generateDungeon(mesh, {
      seed: params.seed >>> 0,
      rooms: params.rooms,
      roomRadius: params.roomRadius,
      extraCorridors: params.extraCorridors,
      corridorWidth: params.corridorWidth,
    });
    graph = dungeon.graph;
    cellSide = mesh.defaultSide;
    // THE CAMP, BEFORE ANY ACTOR IS PLACED. Berth cells are graph maths,
    // so they are known now rather than whenever the container model
    // happens to land — which is what lets a reset place the tank once
    // instead of standing it beside the Heart and teleporting it later.
    berths = computeBerths(dungeon, graph);
    // LANES (HT): keep the dungeon carve — rooms joined by WIDE corridors
    // are the monster lanes, and the wall mass between them is the HIGH
    // GROUND where towers mount. generateDungeon already supplies heart,
    // spawn, and distToHeart over the open subgraph.
    // TD: remember the FULL world, then seal everything beyond round 1's
    // inner sector — the run reveals it back band by band
    tdFullTags = dungeon.tags.slice();
    tdFullDist = Array.from(dungeon.distToHeart);
    tdMaxD = 0;
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (tdFullTags[i] !== BLOCKED) tdMaxD = Math.max(tdMaxD, tdFullDist[i]);
    }
    // THE SERVER'S VAULT (operator's desired pattern, third field report):
    // take the TRUE antipode cell — no walkable filter, the literal pole —
    // and carve an empty CHAMBER into the full world around it: every cell
    // within two hops, a floor disc at least five cells across, ringed by
    // whatever rock was already there. The room may be sealed off at
    // first ON PURPOSE — walls blast open, and a vault you have to breach
    // is the fiction working for us.
    {
      const hc = norm3(graph.centers[dungeon.heart]);
      let best = Infinity; serverCi = -1;
      for (let i = 0; i < graph.centers.length; i++) {
        const d = dot3(norm3(graph.centers[i]), hc);
        if (d < best) { best = d; serverCi = i; }
      }
      serverChamber = [];
      const depth = new Map([[serverCi, 0]]);
      const q = [serverCi];
      while (q.length) {
        const ci = q.shift();
        serverChamber.push(ci);
        if (depth.get(ci) >= 2) continue;
        for (const nb of graph.adj[ci]) {
          if (!depth.has(nb)) { depth.set(nb, depth.get(ci) + 1); q.push(nb); }
        }
      }
      for (const ci of serverChamber) tdFullTags[ci] = ROOM;
    }
    // carve the sector map. Raw azimuth wedges fail on a lane world
    // (corridors cross wedge borders and re-seal as unreachable), and
    // one-gate-per-compass-point collapses when few lanes exit the disk.
    // So: ITERATIVE DIRECTIONAL GROWTH. Each sector claims an equal
    // share of the remaining land, grown breadth-first from a frontier
    // seed picked in its compass direction — sector 2 one way, sector 3
    // BEHIND it, sectors 4/5 the perpendicular pair. Seeds sit on the
    // already-open frontier, so every sector is connected by
    // construction; the applySector re-seal stays as a safety net.
    tdSectorId = new Int8Array(dungeon.tags.length).fill(6);
    {
      const C = dungeon.tags.length;
      const h = graph.normals[dungeon.heart];
      const ref = Math.abs(h[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const t1 = norm3(cross3(h, ref));
      const t2 = cross3(h, t1);
      const cut1 = tdMaxD * 0.3;
      const open = (i) => tdFullTags[i] !== BLOCKED;
      for (let i = 0; i < C; i++) {
        if (open(i) && tdFullDist[i] <= cut1) tdSectorId[i] = 1;
      }
      const beyond = [];
      for (let i = 0; i < C; i++) if (open(i) && tdSectorId[i] === 6) beyond.push(i);
      const unassigned = new Set(beyond);
      const dirs = [t1, scale3(t1, -1), t2, scale3(t2, -1)]; // fwd, BEHIND, side, side
      for (let r = 2; r <= 5; r++) {
        const share = r === 5 ? unassigned.size : Math.ceil(beyond.length / 4);
        const dq = dirs[r - 2];
        let seed = -1, bs = -Infinity;
        for (const i of unassigned) {
          // frontier: touches land that will already be open before round r
          if (!graph.adj[i].some((nb) => open(nb) && !unassigned.has(nb))) continue;
          const sc = dot3(graph.centers[i], dq);
          if (sc > bs) { bs = sc; seed = i; }
        }
        if (seed === -1) break;
        const q2 = [seed];
        unassigned.delete(seed);
        tdSectorId[seed] = r;
        let claimed = 1;
        for (let head = 0; head < q2.length && claimed < share; head++) {
          for (const nb of graph.adj[q2[head]]) {
            if (!unassigned.has(nb)) continue;
            unassigned.delete(nb);
            tdSectorId[nb] = r;
            q2.push(nb);
            claimed++;
            if (claimed >= share) break;
          }
        }
      }
      for (const i of unassigned) tdSectorId[i] = 5; // stragglers ride the last reveal
    }
    applySector(true);
    cellIndex = makeCellIndex(graph.centers, cellSide * 1.7);
    player.freeMode = false;
    player.virtualStart = null;

    // Round start mirrors the death respawn: beside the HEART, not at
    // dungeon.spawn — the carve's "spawn" often lands in the same far band
    // the gates seed into, which put a fresh player nose-to-nose with a
    // forming portal before they had touched a control.
    let startCi = dungeon.heart;
    outer:
    for (let d = 1; d <= 3; d++) {
      for (let i = 0; i < dungeon.tags.length; i++) {
        if (dungeon.tags[i] !== BLOCKED && dungeon.distToHeart[i] === d) { startCi = i; break outer; }
      }
    }
    player.cur = startCi;
    player.prev = -1;
    player.moves = 0;
    player.won = false;
    player.visited = new Set([startCi]);
    player.pos = graph.centers[startCi].slice();
    whim = mulberry32((params.seed ^ 0x51eef) >>> 0);
    const exits = openNeighbors(player.cur);
    // aimed OUTWARD, like the death respawn: starting beside the heart,
    // "toward the heart" would point you into the thing you defend
    let e0 = exits[0];
    for (const e of exits) {
      if (dungeon.distToHeart[e] === dungeon.distToHeart[player.cur] + 1) { e0 = e; break; }
    }
    player.heading = tangentDirTo(player.cur, e0);
    player.travelDir = player.heading.slice();
    player.next = e0;
    player.prog = 0;
    player.smoothDir = player.travelDir.slice();
    player.segLen = Math.max(1e-9, dist3(graph.centers[player.cur], graph.centers[player.next]));

    absorbed = 0;
    baseUnitScale = cellSide * 0.5;
    unitScale = baseUnitScale;
    ammo = 3;
    sfx.reseed(params.seed); // pitch jitter is deterministic per seed
    deathPick = mulberry32((params.seed >>> 0) ^ 0x9e3779b9);
    heartHP = HEART_MAX;
    playerHP = PLAYER_MAX;
    playerDown = false;
    shieldT = 0;
    resetTankRank();
    carryingRegen = false;
    speedBonus = 1;
    for (let i = projectiles.length - 1; i >= 0; i--) killProjectile(i);
    for (let i = laserShots.length - 1; i >= 0; i--) killLaser(i);
    laserClock = 0;
    orbRng = mulberry32((params.seed ^ 0x0b0b5) >>> 0);
    respawnClock = 0;
    simTime = 0;

    buildGeometry();
    buildActors();
    spawnOrbs();
    spawnEnemies();
    spawnRewards();
    // EVERY RESET ENTERS THE WORLD THE SAME WAY. Brand-new game, browser
    // reload, forced reset, retry after a loss — they all come through
    // regenerate, so they all start with the hull in its berth driving out.
    // Preludes only change what the camera was doing beforehand.
    //
    // Deliberately NOT in applyLook: a look swap is a cosmetic, and
    // cosmetics never reset the run.
    //
    // A RESET ALSO ENDS WHATEVER SHOT WAS RUNNING. Regenerate is on the GUI
    // and on Retry, so it can land mid-reveal — and a reveal that survives a
    // reset keeps its skip listeners registered and then fires its onEnd
    // against revealCells captured from the board that no longer exists.
    // Same rule as runGen for timers, one level up: work started by the dead
    // run must not land on the live one.
    endShot();
    // ...and any brief mid-sentence, plus whatever was queued behind it. A
    // reset that leaves Isao talking over the new run is the same defect class
    // as a camera shot surviving one: state from the old run painted on top of
    // the new board.
    clearBriefs();
    revealCells = [];
    deployStart(berthIndexFor(playerHP));
    placeActors();
    // a fresh board earns a fresh framing — the first-entry courtesy resets
    buildCentered = false;
    if (buildMode) { centerBuildOnHeart(); buildCentered = true; }
    snapCamera();
    paused = false;
    cruise = false;
    msgEl.classList.add('hidden');
    updateHud();
    ctlLog('regenerate:after');
    console.log(`heart sector in ${(performance.now() - t0).toFixed(0)}ms — ` +
      `${floorOffsets.size} open cells, ${orbMeshes.size} orbs, ` +
      `spawn→heart ${dungeon.distToHeart[dungeon.spawn]} hops`);
  }

  params.regenerate = regenerate;
  params.previewDestruction = previewDestruction;
  params.randomize = () => {
    params.seed = randomSeed() % 100000;
    seedCtrl.updateDisplay();
    regenerate();
  };


  // swap the whole visual identity in place: backgrounds, light rig, then
  // rebake vertex palettes and actor tints (game state untouched)
  function applyLook() {
    const L = look();
    mainBg.setHex(L.bg);
    mapBg.setHex(L.mapBg);
    hemi.color.setHex(L.hemi[0]);
    hemi.groundColor.setHex(L.hemi[1]);
    hemi.intensity = L.hemi[2];
    sun.color.setHex(L.sun[0]);
    sun.intensity = L.sun[1];
    fill.color.setHex(L.fill[0]);
    fill.intensity = L.fill[1];
    buildGeometry();
    buildActors();
    spawnOrbs(); // orbs bake look colors at spawn
    spawnEnemies();
    spawnRewards();
    placeActors();
  }


  // --- enemies: easy AI, they only wander ----------------------------------
  function clearEnemies() {
    for (const e of enemies) {
      scene.remove(e.obj);
      // traverse, not e.obj.geometry: a non-rammable enemy carries a solid
      // core as a CHILD, and disposing only the root leaks it every wipe
      disposeObj(e.obj);
    }
    enemies.length = 0;
  }

  // hop distance from the player spawn over open cells (enemy placement)
  function bfsDistFromSpawn() {
    const dist = new Int32Array(dungeon.tags.length).fill(-1);
    const queue = [dungeon.spawn];
    dist[dungeon.spawn] = 0;
    for (let head = 0; head < queue.length; head++) {
      const cur = queue[head];
      for (const nb of graph.adj[cur]) {
        if (dist[nb] !== -1 || dungeon.tags[nb] === BLOCKED) continue;
        dist[nb] = dist[cur] + 1;
        queue.push(nb);
      }
    }
    return dist;
  }

  function spawnEnemies() {
    // battle reset — clear all enemies and gates, then seed the starting
    // neutral portals; the wave plan decides what pours out of them
    clearEnemies();
    spawnQueue.length = 0; spawnClock = 0;
    for (const sp of spawnPoints) {
      scene.remove(sp.obj);
      disposeObj(sp.obj);
      if (sp.mapMarker) { scene.remove(sp.mapMarker); disposeObj(sp.mapMarker); }
    }
    spawnPoints.length = 0;
    wave = 0;
    waveActive = false; waveAge = 0; interClock = params.waveGap * 0.5;
    portalDist = null;
    clearTimeout(waveTimer);
    waveEl.classList.add('hidden');
    seenTypes.clear();
    seedPortals(2);
    // a new game means a new magazine: leftovers do not survive regenerate
    strike.reserved = 0; strike.ready = 0; strike.gauge = 0;
    strike.armed = false; strike.target = -1; strike.falling = -1;
    grantStrikes(strike, spawnPoints.filter((sp2) => sp2.alive).length, strikeTune);
  }

  // cheap hop estimate for spreading spawn points (chord distance in cells)
  function hopEstimate(a, b) {
    return dist3(graph.centers[a], graph.centers[b]) / cellSide;
  }

  // a sector's gates are spatial sources, not type-bound — place one far
  // from the heart, spread from existing gates; 3 hits to destroy
  function addSpawnPoint() {
    let maxD = 0;
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (dungeon.tags[i] !== BLOCKED) maxD = Math.max(maxD, dungeon.distToHeart[i]);
    }
    let best = -1, bs = -1;
    for (let ci = 0; ci < dungeon.tags.length; ci++) {
      if (dungeon.tags[ci] === BLOCKED || dungeon.distToHeart[ci] < maxD * 0.55) continue;
      if (spawnPoints.some((s) => s.ci === ci)) continue;
      let s = dungeon.distToHeart[ci];
      for (const other of spawnPoints) s += Math.min(20, hopEstimate(ci, other.ci));
      if (s > bs) { bs = s; best = ci; }
    }
    if (best === -1) best = dungeon.spawn;
    // the source is a PORTAL, standing upright like a gate (local +Y =
    // surface normal); neutral tint — the wave plan decides what pours out
    const obj = buildPortalObj(best, whim() * 6.283);
    scene.add(obj);
    // minimap beacon — neutral blue, dark until the player FINDS the source
    const mapMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x9fdcff }));
    const mm = scale3(graph.centers[best], 1 + params.wallHeight * 1.6);
    mapMarker.position.set(mm[0], mm[1], mm[2]);
    mapMarker.visible = false;
    mapMarker.layers.set(MAP_LAYER);   // map only
    scene.add(mapMarker);
    spawnPoints.push({ ci: best, hp: 3, obj, alive: true, found: false, mapMarker });
    recomputePortalDist();
  }

  // a sector's gates are spatial sources, not type-bound — seed a small
  // fixed set; the wave plan decides what pours out of them
  function seedPortals(n) { for (let i = 0; i < n; i++) addSpawnPoint(); }

  // One place a gate dies, however it died — shells ground it down before,
  // and now a strike vaporises it whole. Both end here.
  // One place a gate dies, however it died. NOTHING on this board is immune —
  // walls breach, towers fall, the strike vaporises. A gate that shrugged off
  // three well-placed shells was the only exception, and it was mine, and it
  // was wrong (operator). Get close, put three in it, and it is down.
  function killPortal(sp) {
    sp.alive = false;
    scene.remove(sp.obj);
    disposeObj(sp.obj);
    if (sp.mapMarker) { scene.remove(sp.mapMarker); disposeObj(sp.mapMarker); }
    sp.mapMarker = null;
    recomputePortalDist();
  }

  // Arm the next wave: one entry point, so nothing can spawn unannounced.
  // Idempotent — a stalled field re-asks every frame and must not re-fire the
  // cue or reset the countdown it is already running.
  // First dangerous contact of the wave: klaxon + a CRT-red warning. Once
  // per wave BY DESIGN — a constant siren is the alarm you learn to ignore.
  const dangerEl = root.querySelector('#td-danger');
  let dangerTimer = null;
  function dangerFlash() {
    sfx.play('danger_alert');
    if (!dangerEl) return;
    dangerEl.classList.remove('hidden');
    clearTimeout(dangerTimer);
    dangerTimer = setTimeout(() => dangerEl.classList.add('hidden'), 1900);
  }

  function armWave() {
    if (waveIn >= 0) return;
    // THE SECTOR HAS A FIXED PROGRAMME. Once it is spent no more waves are
    // sent, whatever the clock thinks — the remaining gates are a mop-up,
    // not a siege, and a sector that kept sending waves forever would make
    // the wave count meaningless again.
    if (programmeDone()) return;
    hideSitrep(); // the telegraph outranks the recap
    showBrief('motive');   // why they come, as the first one is dialled
    waveIn = WAVE_WARN;
    warnBeat = 0;
    waveCharge = 0;
    // one cue, at the nearest opening gate, so it carries a distance and two
    // gates do not announce twice
    let near = Infinity;
    for (const sp of spawnPoints) {
      if (sp.alive) near = Math.min(near, camDist(graph.centers[sp.ci]));
    }
    if (near < Infinity) sfx.play('portal_warn', { dist: near });
  }

  function spawnWave() {
    waveIn = -1;
    resetWaveStats();
    // the release — a wide, brief ring from every gate that is opening
    for (const sp of spawnPoints) {
      if (sp.alive) warnRing(sp.ci, CREATURE_TINTS[sp.type] ?? 0xffffff, 0.75, cellSide * 5.5);
      if (sp.alive) {
        sp.obj.scale.setScalar(sp.obj.userData.sizeScale ?? 1);
        if (sp.obj.userData.setDim) sp.obj.userData.setDim(1);
      }
    }
    waveCharge = 0;
    warnBeat = 0;
    wave++;
    waveActive = true; waveAge = 0;
    const plan = computeWavePlan(wave, round, params.waveSize);
    // NEW THREAT reveal the first time a headline type appears
    if (!seenTypes.has(plan.headline)) {
      seenTypes.add(plan.headline);
      const intro = INTROS.find((iv) => iv.type === plan.headline);
      if (intro) announceWave(intro);
    }
    // one new tower unlocks per wave through wave 8
    if (wave >= 1 && wave <= TOWER_ORDER.length) showTowerToast(TOWER_ORDER[wave - 1]);
    const live = spawnPoints.filter((s) => s.alive);
    if (live.length) {
      const total = plan.entries.reduce((n, e) => n + e.count, 0);
      const gap = Math.min(SPAWN_GAP_MAX, SPAWN_SPREAD / Math.max(1, total));
      spawnQueue.length = 0;
      spawnClock = 0;
      let pi = 0, n = 0;
      for (const { type, count } of plan.entries) {
        for (let k = 0; k < count; k++) {
          spawnQueue.push({ type, sp: live[pi % live.length], at: n * gap });
          pi++; n++;
        }
      }
      // the FIRST one is already through, so a wave never opens on an empty
      // field while the clock counts
      releaseSpawns(0);
    }
    updateHud();
  }

  function releaseSpawns(dtSeconds) {
    spawnClock += dtSeconds;
    while (spawnQueue.length && spawnQueue[0].at <= spawnClock) {
      const { type, sp } = spawnQueue.shift();
      if (!sp.alive) continue;   // its gate died while it was queued
      const spec = ENEMY_SPEC[type];
      const obj = makeDotEnemy(type, { walker: CREATURE_TINTS[type], walkerHi: accentFor(type) });
      const size = spec.size * 0.7;
      const scale0 = cellSide * size;
      obj.scale.setScalar(scale0); obj.userData.s0 = scale0;
      scene.add(obj);
      const exits = openNeighbors(sp.ci);
      enemies.push({
        type, spec, scale0, size,
        cur: sp.ci, prev: -1,
        next: exits.length ? exits[Math.floor(whim() * exits.length)] : sp.ci,
        prog: whim() * 0.4, pos: graph.centers[sp.ci].slice(), dir: [0, 1, 0],
        obj, alive: true, phase: whim() * 6.283,
        // a deterministic pace of its own: identical speeds are what let a
        // clump that chose the same exit stay one silhouette all the way in
        paceJitter: 0.9 + whim() * 0.22,
        hp: spec.hp, behMult: 1, behUntil: -1, touchCd: -1,
        slowFactor: 1, slowUntil: -1,
      });
    }
  }

  // THE WAVE ARRIVES, IT DOES NOT APPEAR. Every enemy in a wave used to be
  // created in one frame, all of them standing on the two portal cells with
  // the same speed — so four phage on two portals read as TWO contacts, and
  // twenty-six read as two blobs. The towers shot at things nobody could
  // see, because the things were inside each other. (Measured: wave 3,
  // 26 alive, distinctCells=2.)
  //
  // Two fixes, and both are needed. The queue staggers WHEN they come
  // through, so a wave walks out of a gate instead of materialising; the
  // pace jitter stops a group that picks the same exit from travelling as
  // one perfectly superimposed silhouette forever after.
  const spawnQueue = [];
  let spawnClock = 0;
  const SPAWN_SPREAD = 3.2;   // seconds a whole wave takes to come through
  const SPAWN_GAP_MAX = 0.45; // ...but never slower than this per contact

  const ENEMY_SPEED = 1.0; // cells/s toward the Heart — FASTER still
  function updateEnemies(dt, tNow) {
    releaseSpawns(dt);
    for (const e of enemies) {
      if (!e.alive) continue;
      const spec = e.spec;
      // HK healOOC: regenerators knit themselves back together while
      // nothing has hit them for 1.2 s — burst them down or ram them
      if (spec.regen && e.hp < spec.hp && tNow - (e.lastHitT ?? -9) > 1.2) {
        e.hp = Math.min(spec.hp, e.hp + spec.regen * dt);
        const sv = e.scale0 * (0.7 + 0.3 * e.hp / spec.hp);
        e.obj.scale.setScalar(sv);
        e.obj.userData.s0 = sv;
      }
      let pace = ENEMY_SPEED * spec.speed * (e.paceJitter ?? 1);
      if (tNow < e.behUntil) pace *= e.behMult; // on-hit reaction window
      if (tNow < e.slowUntil) pace *= e.slowFactor; // slow-tower debuff
      // the slow READS for its full duration: the whole cloud tints ice —
      // and so does the solid core, or a slowed drifter would show a frozen
      // cloud around a body still in its own colour
      const slowed = tNow < e.slowUntil;
      // white clears the tint on the CLOUD (vertexColors multiply), but a
      // solid has to be restored to the colour it was built with
      if (e.obj.material) e.obj.material.color.setHex(slowed ? 0x8fd4ff : 0xffffff);
      const solid = e.obj.userData.solid;
      if (solid && solid.material) {
        solid.material.color.setHex(slowed ? 0x8fd4ff : (solid.userData.baseColor ?? 0xffffff));
      }
      // erratic (phage): HokorobiTawaa velocity bursts, 0.7×–1.3×
      if (spec.erratic) pace *= 0.7 + 0.6 * (0.5 + 0.5 * Math.sin(tNow * 3.1 + e.phase * 7));
      // jink (saucer): a second, faster weave stacked on the bursts —
      // 0.55×–1.45× at 6.3 rad/s reads as a dogfight, not a walk
      if (spec.jink) pace *= 0.55 + 0.9 * (0.5 + 0.5 * Math.sin(tNow * 6.3 + e.phase * 11));
      // tactician (shellback): holds at the EDGE of tower coverage until
      // enough minions arrive to soak fire, then bursts through with them.
      // Re-evaluated at 2 Hz, staggered by phase — towers are few, and a
      // per-frame sweep would be spent on a decision that changes slowly.
      if (spec.tactician) {
        if (tNow >= (e.tacUntil ?? 0)) {
          e.tacUntil = tNow + 0.5 + e.phase * 0.1;
          let covered = false;
          for (const tw of towers) {
            const r = effectiveStats(tw).range * cellSide;
            if (chord(graph.centers[tw.ci], e.pos) < r + cellSide * 1.2) { covered = true; break; }
          }
          if (!covered) e.tacMult = 1;
          else {
            let cover = 0;
            for (const e2 of enemies) {
              if (e2.alive && e2 !== e && dist3(e2.pos, e.pos) < cellSide * 2.4) cover++;
            }
            e.tacMult = cover >= 3 ? 1.9 : 0.3; // burst with the pack, or wait
          }
        }
        pace *= e.tacMult ?? 1;
      }
      // cloaked (phantom): optical camo. A haze most of the time — the
      // cloud sits near-invisible — with a brief shimmer of presence every
      // ~6s. The radar shares the same decloak window: no window, no blip.
      if (spec.cloaked) {
        const vis = ((tNow * 0.16 + e.phase) % 1) < 0.12;
        const op = vis ? 0.55 : 0.14 + 0.05 * Math.sin(tNow * 2.7 + e.phase * 9);
        if (e.obj.material) e.obj.material.opacity = op;
        const core = e.obj.userData.solid;
        if (core && core.material) {
          core.material.transparent = true;
          core.material.opacity = Math.min(1, op * 1.6); // the glint lags the fade
        }
        e.decloaked = vis;
      }
      e.prog += pace * dt;
      while (e.prog >= 1) {
        e.prog -= 1;
        e.prev = e.cur;
        e.cur = e.next;
        // heart-seeking: drawn HARD toward the heart — only a sliver of
        // wobble left so the streams braid but visibly converge
        const exits = openNeighbors(e.cur);
        const down = exits.filter((c) => dungeon.distToHeart[c] < dungeon.distToHeart[e.cur]);
        const pool = (down.length && whim() > 0.05) ? down : exits;
        e.next = pool.length ? pool[Math.floor(whim() * pool.length)] : e.cur;
      }
      const a = graph.centers[e.cur];
      const b = graph.centers[e.next];
      const f = Math.min(e.prog, 1);
      e.pos = norm3([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
      const n = e.pos;
      const raw = sub3(b, e.pos);
      const flat = sub3(raw, scale3(n, dot3(raw, n)));
      const l = Math.hypot(flat[0], flat[1], flat[2]);
      if (l > 1e-9) e.dir = scale3(flat, 1 / l);
      const s = cellSide * (e.size ?? spec.size);
      const lift = s * (e.obj.userData.lift ?? 0.85);
      e.obj.position.set(e.pos[0] + n[0] * lift, e.pos[1] + n[1] * lift, e.pos[2] + n[2] * lift);
      tmpObj.position.copy(e.obj.position);
      tmpObj.up.set(n[0], n[1], n[2]);
      tmpObj.lookAt(e.obj.position.x + e.dir[0], e.obj.position.y + e.dir[1], e.obj.position.z + e.dir[2]);
      e.obj.quaternion.copy(tmpObj.quaternion);
      if (e.obj.userData.tick) e.obj.userData.tick(tNow + e.phase);

      // the Heart: contact costs heartDmg and consumes the creature
      if (dist3(e.pos, graph.centers[dungeon.heart]) < cellSide * 0.75) {
        killCreature(e);
        heartHit(spec.heartDmg);
        continue;
      }
      // the player's tank is strong: fodder dies under the treads for
      // free; the dangerous tier hurts to touch and shrugs the ram off
      // (per-enemy cooldown so overlap isn't a blender)
      const touchR = cellSide * Math.max(0.4, (e.size ?? spec.size) * 0.8);
      // a unit that HURTS to touch is closing in: warn, once per wave
      if (!playerDown && !spec.rammable && dangerWarnedWave !== wave
          && dist3(e.pos, player.pos) < cellSide * 3.5) {
        dangerWarnedWave = wave;
        dangerFlash();
      }
      if (!playerDown && dist3(e.pos, player.pos) < touchR) {
        if (spec.rammable) {
          // run over: tinted splat under the treads + the weight bump
          const burst = makeDotBurst(CREATURE_TINTS[e.type], n);
          burst.scale.setScalar(cellSide * 0.8);
          const bp = add3(e.pos, scale3(n, cellSide * 0.12));
          burst.position.set(bp[0], bp[1], bp[2]);
          scene.add(burst);
          debris.push(burst);
          bumpLeft = BUMP_LEN;
          eco.award(spec.bounty, { ram: true }); // the ram premium
          scoreKill(spec.bounty, { src: 'tank', ram: true,
            alive: enemies.filter((x) => x.alive).length });
          ramCombo++; ramComboT = RAM_COMBO_GAP;
          noteWaveKill(e.type, 'tank');
          if (ws) ws.rams++;
          if (rs) { rs.rams++; rs.maxCombo = Math.max(rs.maxCombo, ramCombo); }
          syncCombo();
          if (ramCombo >= 10 && ramCombo % 10 === 0) {
            showCallout(`RAM ×${ramCombo}`, 'co-milestone');
          }
          noteStreak();
          harvestTankKill(spec);
          killCreature(e, true);
          checkVictory();
          continue;
        }
        if (tNow > e.touchCd) { e.touchCd = tNow + 1.2; playerHit(e.type); }
      }
    }
  }

  function killCreature(e, fx = false) {
    e.alive = false;
    // gated on fx: killCreature is ALSO called with fx=false to tear the
    // board down (tutorial clear, wave reset, regenerate). Ungated, a
    // regenerate would fire a death-sound storm.
    if (fx) {
      sfx.play(DEATH_KEYS[Math.floor(deathPick() * DEATH_KEYS.length) % DEATH_KEYS.length],
        { dist: camDist(e.pos) });
    }
    // mesh enemies blow apart; dot-clouds burst into tinted dots
    if (fx && e.obj.userData.kind === 'mesh') {
      const d = makeDebris(e.obj, norm3(e.pos));
      scene.add(d);
      debris.push(d);
    } else if (fx) {
      const d = makeDotBurst(CREATURE_TINTS[e.type] ?? 0xffffff, norm3(e.pos), 24);
      d.scale.setScalar(cellSide * 0.6);
      const dp = add3(e.pos, scale3(norm3(e.pos), cellSide * 0.15));
      d.position.set(dp[0], dp[1], dp[2]);
      scene.add(d);
      debris.push(d);
    }
    scene.remove(e.obj);
    disposeObj(e.obj);
    updateHud();
  }

  // damage an enemy: shrink-step so it reads, kill at zero. Shells (dmg 1,
  // react) trigger the borrowed on-hit reactions; laser ticks (dmg 0.4,
  // react=false) don't — a constant graze must not keep barbed/knot
  // permanently accelerated. Returns true on kill.
  // `src` decides the pay. The base bounty is HALVED and a tank kill pays
  // double the new base (i.e. the old full bounty): towers earn passively,
  // so passive income is what got cheaper — getting close is what pays now.
  // Rams keep their premium on top; the orbital strike pays base, because
  // nothing about it is close.
  const KILL_PAY = { tank: 1.0, tower: 0.5, strike: 0.5 };

  // --- field promotion ------------------------------------------------------
  // HUD badge only. The first cut ALSO floated a sprite over the hull —
  // directly in front of the camera in third person, blocking exactly the
  // thing the player steers toward. Operator ruling: same-size badge, up
  // top, next to the score it rides with.
  // v3: one hull per shallow container, three in a row. Container i holds
  // a spare while i < HP-1; the spawn commandeers container min(2, HP-1)
  // — the one whose hull just left.
  function syncLifeContainers() {
    if (lifeContainers.length < 3) return;
    const spares = Math.max(0, playerHP - 1);
    lifeContainers.forEach((cc, i) => {
      // a RACKED hull is a spare you have not used; a LIT NUMBER is a life
      // you still have, the one you are driving included. So berth 3 stands
      // empty from the first second and still reads 3 — which is what the
      // painted numerals are for (operator, 2026-08-31).
      const racked = i < spares;
      if (cc.tanks[0]) cc.tanks[0].visible = racked;
      cc.obj.userData.setStocked(racked, null);
      if (cc.obj.userData.setAlive) cc.obj.userData.setAlive(i < playerHP);
    });
  }

  // ISAO's line on the objectives row: what he is doing and how deep the
  // queue is. Silent when there is nothing on the book — a status line that
  // is always lit is a status line nobody reads.
  function isaoLine() {
    if (!orders.length) return '';
    const o = orders[0];
    const what = o.kind === 'upgrade' ? `${o.tower.def.key}+1` : o.key;
    const rest = orders.length > 1 ? ` +${orders.length - 1}` : '';
    // its OWN row, not an appendix to the objectives line: that line already
    // runs to the edge of the box on a phone, and an overflowing status is
    // a status nobody can read
    if (isao && isao.state === 'build') {
      const pct = Math.round(Math.min(1, isao.t / Math.max(0.001, isao.dur)) * 100);
      return `<div class="hud-obj hud-isao">ISAO &#9656; printing ${what} ${pct}%${rest}</div>`;
    }
    return `<div class="hud-obj hud-isao">ISAO &#9656; inbound ${what}${rest}</div>`;
  }

  const fmt = (v) => (v ?? 0).toLocaleString('en-US'); // 3103356 -> 3,103,356

  function refreshRankVisuals() {
    rankBadgeHud = tankRank > 0
      ? `<span class="hud-rank" title="${tankKills} hands-on kills`
        + `${tankEliteKills ? ` · ${tankEliteKills} elite` : ''}">`
        + `${badgeSVG(tankRank, 22)} ${rankLabel(tankRank)}</span>`
      : '';
    applyBeamRank();   // the insignia and the gun are the same readout
    updateHud();
  }
  function harvestTankKill(spec) {
    tankKills++;
    run.tankKills++;
    run.handsOnByType[spec.key || spec.type || ''] =
      (run.handsOnByType[spec.key || spec.type || ''] || 0) + 1;
    if (spec.boss) run.bossHandsOn = true;
    if (!spec.rammable) tankEliteKills++;
    const r = rankFor(tankKills, tankEliteKills);
    if (r !== tankRank) {
      tankRank = r;
      refreshRankVisuals();
      // A BEAM STEP IS A BIGGER EVENT THAN A PROMOTION and says so — four
      // of the fifteen ranks rearm the secondary, and a player who cannot
      // tell those apart learns the ladder is cosmetic.
      showToast(`<div class="wave-num">PROMOTED · ${rankLabel(r)}</div>`
        + (isBeamStep(r)
          ? `<div class="wave-role" style="color:${beamStep(r).color}">`
            + `SECONDARY REARMED · ${beamStep(r).name} · ${beamStep(r).reach} cells</div>`
          : `<div class="wave-role">${tankKills} hands-on kills</div>`),
        isBeamStep(r) ? 3000 : 2200);
    } else updateHud();
  }
  // A NEW RUN starts unranked — this is the ONLY caller left (loseTank used
  // to be the other one, and the pilot outliving the hull is what removed it).
  function resetTankRank() {
    if (!tankKills && !tankRank) return;
    tankKills = 0; tankEliteKills = 0; tankRank = 0;
    refreshRankVisuals();
  }
  function damageEnemy(e, tNow, dmg = 1, react = true, src = 'tower') {
    const spec = e.spec;
    if (react && spec.slowOnHit) { e.behMult = spec.slowOnHit; e.behUntil = tNow + 1.2; }
    if (react && spec.accelOnHit) { e.behMult = spec.accelOnHit; e.behUntil = tNow + 1.2; }
    e.lastHitT = tNow; // resets the regenerators' out-of-combat clock
    e.hp -= dmg;
    if (e.hp <= 0) {
      // any weapon's kill pays — but not the same
      eco.award(Math.max(1, Math.ceil(spec.bounty * (KILL_PAY[src] ?? 0.5))));
      scoreKill(spec.bounty, { src, alive: enemies.filter((x) => x.alive).length });
      noteWaveKill(e.type, src);
      noteKillContext(e, src);
      if (src === 'tank') harvestTankKill(spec);
      killCreature(e, true);
      return true;
    }
    const sv = e.scale0 * (0.7 + 0.3 * Math.max(0, e.hp) / spec.hp);
    e.obj.scale.setScalar(sv);
    e.obj.userData.s0 = sv;
    return false;
  }

  // --- twin mini-lasers: hold-to-fire, they overheat -----------------------
  // Trigger: hold Shift (or the secondary fire button). Fire builds heat;
  // at the cap the guns lock out until fully cooled — the gun tubes glow
  // from cyan to red as the diegetic gauge. Bolt origin/direction derive
  // from the gun groups' WORLD transforms (toe-in included) — same-source
  // rule, third use. No wall carving, no spawn-point damage, no on-hit
  // reactions: shells stay the answer to everything that matters.
  const laserShots = []; // { pos, dir, dist, mesh }
  let laserClock = 0, laserSide = 0;
  let laserHeat = 0, laserOverheat = false;

  // --- the twin beams -----------------------------------------------------
  // ONE PLACE for the preset, so a tuning session in the beam tab drops in as
  // a paste rather than a hunt. Widths are expressed in CELLS and multiplied
  // by cellSide at use: the lab tunes against a 1-unit tank, the board runs a
  // tank about 0.85 of a cell wide, and a width copied across raw is either
  // invisible or swallows the screen.
  // The preset and the peak both live in beamdraw.js now, so a tuning session
  // in the lab lands in ONE file rather than in two that must be kept in
  // agreement by hand.
  const BEAM_PRESET = { ...BOARD_PRESET };
  // THE SWEEP (operator, 2026-09-01). Across the six seconds the toe-in runs
  // 0 -> BEAM_SWEEP -> 0, so the pair opens parallel, scissors inward through
  // the midpoint and opens again: the beams sweep the ground in front instead
  // of burning one fixed line. Damage follows for free, because it is
  // measured against the same swept direction the beam is drawn along.
  //
  // Radians. Started at 0.4 (~23 degrees each side) from the operator's
  // "0 to 4 to 0"; played, that was a wider scissor than the weapon wants —
  // the beams spent the burst pointing away from what was in front of them.
  // 0.2 rad (~11 degrees each side) keeps the traverse legible while the pair
  // stays on target. This is the one number to move.
  const BEAM_SWEEP = 0.20;
  // THE SWEEP IS A MOTOR UNDER LOAD (operator, 2026-09-01). Mass in the beam
  // slows its traverse — per beam, independently — so the pair falls out of
  // step and the tank visibly labours through a crowd. This is the inverse of
  // knock-back: nothing is pushed, something is HELD.
  //
  // The drag is keyed to the tier the whole board already reads by colour:
  // soft rammable things barely slow it, a solid core bogs it hard. So a beam
  // lagging its twin is a DANGER READOUT — the weapon's own motion saying
  // "there is something in here you should not ram", a third channel beside
  // the belt colour and the DO-NOT-RAM badge.
  // DRAG_SOFT / DRAG_HARD / DRAG_CAP are imported from beamburn.js now. The
  // rule moved out whole so the beam lab can show the drop-off without
  // restating it — two copies of this would drift the first time either is
  // tuned, and the lab exists precisely to tune it.
  // ...and the same idea along the OTHER axis: every body burned eats into
  // the reach that is left, so the beam shortens as it struggles through.
  // In cells, against a 2.6-cell reach: fodder is nearly free, three solid
  // cores stop it dead.
  // ...and they are FRACTIONS of the reach now, because the reach is no
  // longer a constant: it climbs with the pilot's rank (beamranks.js). Held
  // as absolute cells, "three solid cores stop it dead" would quietly stop
  // being true the moment a rank-15 beam ran to 10 cells.
  const PEN_SOFT = () => LASER_REACH * PEN_SOFT_FRAC;
  const PEN_HARD = () => LASER_REACH * PEN_HARD_FRAC;
  // A BOGGED BEAM FALLS BEHIND AND STAYS BEHIND. It does not catch up at the
  // end of the burst — that would hide the cost, which is the point of it.
  const beamPhase = [0, 0];
  let beamHitWall = false;   // did either beam clip on rock this frame?
  const CELL_WIDTH_KEYS = ['coreWidth', 'glowWidth', 'jitterAmount'];
  // `beams` is taken by the tower/slow-tether fx pool — these are the tank's
  // Both are views ONTO the rig (beamdraw.js), kept as names because the
  // probes walk them: ?beamfire=1 reads the live glow colour off tankBeams[0]
  // and ?arcprobe walks every plume dot for altitude.
  let tankBeams = null, plasma = null;
  let beamOn = false, beamVoice = null;

  // --- THE PLASMA (operator, 2026-09-02) ----------------------------------
  // "the beam extends in the air, and for game play we should have hug the
  // curvature of the planet, more like plasma flamethrower than pure laser."
  //
  // The anatomy, the meshes and the per-frame update all live in beamdraw.js
  // now. That move is what lets the beam LAB draw this same weapon instead of
  // two straight ribbons on a flat floor — a tuning surface showing a
  // different weapon than the game is worse than none, and this project has
  // already paid for that once with a preset tuned under tone mapping the
  // game did not have.
  //
  // PLASMA is a LIVE object: the GUI mutates it and the rig reads it every
  // frame, so the knobs stay knobs.
  const PLASMA = { ...PLASMA_DEFAULTS };

  let beamRig = null;
  function ensureBeams() {
    if (beamRig) return beamRig;
    beamRig = createBeamRig({
      scene, guns: 2, preset: BEAM_PRESET, plasma: PLASMA,
      seed: (params.seed ^ 0x91a5be) >>> 0,
      widthKeys: CELL_WIDTH_KEYS,
    });
    // tankBeams is what ?beamfire=1 reads the live colour off, and index 0 is
    // still gun 0's first link; plasma is what ?arcprobe walks for altitude
    tankBeams = beamRig.beams;
    plasma = beamRig.plumes;
    applyBeamRank();   // a fresh rig must not be born the base colour
    return beamRig;
  }

  // The colour is written to the LIVE uniform rather than baked into
  // BEAM_PRESET at construction, so a promotion that lands mid-burst
  // recolours the beam already in the air — which is the whole point of
  // putting the readout on the weapon instead of in the corner.
  let beamStepNow = beamStep(0);
  function applyBeamRank() {
    beamStepNow = beamStep(tankRank);
    LASER_DPS = beamStepNow.dps;
    LASER_REACH = beamStepNow.reach;
    if (beamRig) beamRig.setColor(beamStepNow.color);
    applyReachToe();
  }

  // THE TOE SCALES WITH REACH (operator, 2026-09-02: "the toe-in should scale
  // with reach so they always cross").
  //
  // A fixed angle cannot be right across a 2.5x reach ladder: the apex sits
  // at gap/(2·tan(toe)), so the shipped 0.035 rad put it about 9.5 cells out
  // — past a rank-1 beam's whole four cells, and well inside a rank-15 one.
  // Solve for the angle instead, from the muzzle gap MEASURED off the model
  // rather than assumed, so a new tank does not silently break it.
  const TOE_CROSS_FRAC = 0.7;   // they meet at 70% of the reach: out in front,
                                // but comfortably before the tip
  const toeA = new THREE.Vector3(), toeB = new THREE.Vector3();
  function applyReachToe() {
    const guns = playerMesh && playerMesh.userData && playerMesh.userData.laserGuns;
    if (!guns || guns.length < 2 || !playerMesh) return;
    // ZERO THE TOE BEFORE MEASURING. The gap is read off the live world
    // transforms, and those already carry whatever toe was applied last — so
    // measuring without resetting feeds the previous answer back in and the
    // angle walks every time the rank changes.
    applySecondaryToe(playerMesh, 0);
    playerMesh.updateMatrixWorld(true);
    guns[0].getWorldPosition(toeA);
    guns[1].getWorldPosition(toeB);
    const gap = toeA.distanceTo(toeB) / cellSide;          // cells
    const toe = toeForCrossing(gap, TOE_CROSS_FRAC * LASER_REACH);
    applySecondaryToe(playerMesh, toe || SECONDARY_TOE);
    playerMesh.updateMatrixWorld(true);
    lastToe = { gap, toe: toe || SECONDARY_TOE, at: crossingForToe(gap, toe || SECONDARY_TOE) };
  }
  let lastToe = null;

  function drawBeam(i, from, dir, len, heatFrac, lift) {
    ensureBeams().draw(i, {
      from, dir, len, heat: heatFrac,
      lift: lift ?? (1 + params.wallHeight * 0.5),
      scale: cellSide, time: simTime, peak: BEAM_PEAK,
    });
  }

  function hideBeams() {
    if (beamRig) beamRig.hide();
  }

  const laserBtnEl = root.querySelector('#td-pad-laser');
  let laserBtnBand = -1, laserDrainPct = -1;
  // THE SECONDARY IS A BEAM (operator, 2026-09-01). Twin sustained beams out
  // of the secondary muzzles, running straight down each barrel and passing
  // THROUGH everything they touch.
  //
  // 6 seconds is not a feel number: the burst is exactly as long as
  // assets/audio/tank_beam.mp3, so the sound and the fire begin and end
  // together. Change one and the other has to move.
  const LASER_MAX_HEAT = 6.0; // s of fire — the length of the sound
  // COOLDOWN DURATION IS UNCHANGED. It was MAX_HEAT / COOL = 2.4 / 1.4 ≈
  // 1.71 s, and the operator asked for the same cooldown, so the shed rate
  // rises with the budget instead of the lockout stretching to 4.3 s.
  const LASER_COOL = LASER_MAX_HEAT / 1.71;
  // Damage is SUSTAINED, not per bolt. The old bolt stream was about 2.86/s
  // into ONE target. This is well under it (operator: currently overpowered)
  // and the multi-target advantage is now paid for twice — the sweep bogs,
  // and the reach chokes. A beam that reaches three bodies is working hard
  // for them.
  // BOTH ARE THE PILOT'S RANK NOW (operator, 2026-09-02) — see beamranks.js
  // for the four steps and for why penetration had to become a fraction. They
  // are seeded at the rank-1 step and rewritten by applyBeamRank(); `let`
  // rather than `const` is the honest shape for a value the ladder moves.
  let LASER_DPS = beamStep(0).dps;
  let LASER_REACH = beamStep(0).reach;   // cells
  // Bolts were BoxGeometry — literally blocky (operator ruling). They are
  // round tracers now, the same idiom every tower shot speaks: a hot head
  // with three ghosts strung behind it along the flight line.
  const Z_AXIS = new THREE.Vector3(0, 0, 1);
  const gunColCool = new THREE.Color(0x7df9ff);
  const gunColHot = new THREE.Color(0xff5340);
  const gunEmiCool = new THREE.Color(0x06262c);
  const gunEmiHot = new THREE.Color(0xff2200);

  function killLaser(i) {
    scene.remove(laserShots[i].mesh);
    laserShots[i].mesh.geometry.dispose(); // per-bolt tracer geometry now
    laserShots[i].mesh.material.dispose();
    laserShots.splice(i, 1);
  }

  function updateLasers(dt, tNow) {
    const guns = playerMesh && playerMesh.userData.laserGuns;
    // auto holds the SAME trigger the player does, so there is one firing
    // path, one heat model and one overheat lockout — not a parallel copy
    const wantFire = (keys.laser || autoLaserWant) && guns
      && !player.won && !playerDown;
    // heat: build while firing, shed otherwise; overheat locks the trigger
    // until the tubes are fully cold (no feathering the cap)
    if (laserOverheat) {
      laserHeat = Math.max(0, laserHeat - LASER_COOL * dt);
      if (laserHeat === 0) laserOverheat = false;
    } else if (wantFire) {
      laserHeat += dt;
      if (laserHeat >= LASER_MAX_HEAT) { laserHeat = LASER_MAX_HEAT; laserOverheat = true; }
    } else {
      laserHeat = Math.max(0, laserHeat - LASER_COOL * dt);
    }
    // diegetic gauge: both tubes share one material per tank. The mkcx
    // tank exposes a private clone (gunHeatMat) whose EMISSIVE carries the
    // heat — its textured PBR gun barely shows a color multiply, and the
    // emissive is what the bloom chain turns into a visible glow.
    if (guns) {
      const f = laserHeat / LASER_MAX_HEAT;
      const mat = playerMesh.userData.gunHeatMat
        || (guns[0].children[0] && guns[0].children[0].material);
      if (mat && mat.color) {
        mat.color.lerpColors(gunColCool, gunColHot, f);
        if (mat.emissive) {
          mat.emissive.lerpColors(gunEmiCool, gunEmiHot, f);
          mat.emissiveIntensity = 0.3 + 1.7 * f;
        }
      }
      // the sleeves are the gauge that actually READS — same instrument as
      // the cannon's mid-barrel band, driven the same way
      const smat = playerMesh.userData.laserSleeveMat;
      if (smat) smat.color.lerpColors(gunColCool, gunColHot, f);
    }
    // ...and the same cycle on the pad button: white -> orange -> red as
    // heat builds, blinking red through the lockout. Style only when the
    // band CHANGES — per-frame style writes on a button are layout noise.
    if (laserBtnEl) {
      const f = laserHeat / LASER_MAX_HEAT;
      const band = laserOverheat ? 3 : f > 0.66 ? 2 : f > 0.33 ? 1 : 0;
      if (band !== laserBtnBand) {
        laserBtnBand = band;
        const col = ['', '#ffaa44', '#ff6633', '#ff3322'][band];
        laserBtnEl.style.color = col;
        laserBtnEl.style.borderColor = col;
        laserBtnEl.classList.toggle('overheat', band === 3);
        if (band !== 3) laserBtnEl.style.background = '';
      }
      // the cooldown is VISUAL: through the lockout the red drains out of
      // the button bottom-up as the tubes shed heat (4% steps, not every
      // frame — a style write per frame on a button is layout noise)
      if (laserOverheat) {
        const drain = Math.round(f * 25) * 4;
        if (drain !== laserDrainPct) {
          laserDrainPct = drain;
          laserBtnEl.style.background =
            `linear-gradient(to top, rgba(255,51,34,0.5) ${drain}%, rgba(255,51,34,0.08) ${drain}%)`;
        }
      } else laserDrainPct = -1;
    }
    // holding the trigger against locked tubes CLICKS — the gun says no
    if (wantFire && laserOverheat) sfx.play('laser_click');
    if (wantFire && !laserOverheat) {
      // THE BEAMS. One per secondary, each leaving its own muzzle and running
      // straight down its own barrel — the direction is read from the gun's
      // world quaternion, never re-derived, and then flattened onto the
      // tangent plane because the board is a sphere and the weapon has to
      // agree with the ground it fires over.
      if (!beamOn) {
        beamOn = true;
        beamPhase[0] = 0; beamPhase[1] = 0;   // both sweeps start together
        // one 6-second take, started as a loop so the burst can stop it the
        // moment the trigger releases or the tubes lock
        beamVoice = sfx.loop('tank_beam', { gain: 1 });
      }
      const reach = LASER_REACH * cellSide;
      for (let gi = 0; gi < 2 && gi < guns.length; gi++) {
        const gun = guns[gi];
        gun.getWorldPosition(tmpV);
        const from = norm3([tmpV.x, tmpV.y, tmpV.z]);
        // THE MUZZLE'S OWN RADIUS. The beam used to be flattened onto the
        // ground lift and so left from UNDER the hull rather than out of the
        // secondaries — invisible at this scale, obvious in the lab where the
        // tank is drawn 12x larger. Floored at the ground clearance so it
        // still rides over wall tops.
        const gunR = Math.max(tmpV.length(), 1 + params.wallHeight * 0.5);
        gun.getWorldQuaternion(tmpQ);
        tmpV.set(0, 0, 1).applyQuaternion(tmpQ);
        const d0 = [tmpV.x, tmpV.y, tmpV.z];
        let dir = norm3(sub3(d0, scale3(from, dot3(d0, from))));
        // SWEEP IT INWARD, by the bell, toward the hull's centreline. Which
        // way "inward" is comes from the gun's own offset from the hull —
        // never from its L/R name, which is exactly what made the model's
        // toe-in ambiguous in the first place.
        // ...by this beam's OWN phase, which is where the two decouple: the
        // heat clock is shared, the sweeps are not.
        const swing = BEAM_SWEEP * Math.sin(Math.min(1, beamPhase[gi]) * Math.PI);
        if (swing > 1e-4) {
          const lat = sub3(from, player.pos);                     // gun -> out
          const latT = sub3(lat, scale3(from, dot3(lat, from)));  // onto tangent
          const right = norm3(cross3(from, dir));
          // Toward the centreline. This sign was briefly flipped on the
          // strength of a probe that measured separation at FULL REACH — but
          // the guns are already toed in, so the pair crosses before then and
          // the far-end gap grows for BOTH signs. The metric was the bug, not
          // the sign; fixing the probe to measure the crossing point put this
          // back where it started.
          const sgn = dot3(latT, right) > 0 ? -1 : 1;             // toward centre
          const c = Math.cos(swing), sn = Math.sin(swing) * sgn;
          dir = norm3(add3(scale3(dir, c), scale3(right, sn)));
        }
        // WALLS STOP IT, enemies do not. March in half-cells to the first
        // blocked cell so a beam cannot reach through the maze you built.
        let len = reach;
        let bite = 0;
        // ALONG THE GROUND, not through it. `m` is arc length now — on a
        // unit sphere that is radians, so no conversion — and arcPoint lands
        // ON the surface by construction. The old `norm3(from + dir*m)`
        // pointed the right way but under-reached by atan(m) instead of m:
        // 15.7% short at the rank-15 reach, over a cell of missing beam.
        for (let m = cellSide * 0.5; m <= reach; m += cellSide * 0.5) {
          const q = arcPoint(from, dir, m);
          const ci = cellIndex(q);
          if (ci !== -1 && dungeon.tags[ci] === BLOCKED) {
            len = m;
            // HOW MUCH of the beam the rock is eating, not merely THAT there
            // is rock. This map is dense — measured, a beam standing on
            // all-open ground still clips rock at 2.5 of its 2.6 cells, so a
            // flat penalty on contact would bog the weapon EVERYWHERE and the
            // sweep would never move. Bite is the same currency a body pays
            // in: 0 when the wall is out at the tip, 1 at point-blank.
            bite = wallBiteFor(m, reach);
            break;
          }
        }
        // IT PIERCES, BUT IT PAYS TO. Every body the beam passes through eats
        // into what is left of its reach, so it visibly SHORTENS against a
        // crowd — struggling to punch through rather than sailing on. Fodder
        // barely costs it; a solid core takes a big bite. Three of those and
        // the beam dies in the queue.
        //
        // Nearest first, because the order is the whole mechanic: what stops
        // the beam is what is in FRONT, and something behind a wall of armour
        // is simply never reached.
        // WHAT IS IN THE BEAM, measured along the same arc it is drawn on.
        //
        // This used to project onto a straight chord, and at these reaches
        // that is not a rounding error: a body standing on the ground 8 cells
        // out sits 0.19 world units off the chord, against a hit radius of at
        // most 0.13 — so every enemy past about five cells was UNHITTABLE and
        // the rank 5/10/15 beams drew long and killed nothing at the far end.
        // The bug shipped invisible because at the original 2.6-cell reach
        // the chord never left the ground.
        const along = [];
        for (const e of enemies) {
          if (!e.alive) continue;
          const pr = projectToArc(from, dir, e.pos);
          // s is SIGNED — behind the muzzle must be rejected, not folded
          if (pr.s < 0 || pr.s > len) continue;
          const r = cellSide * Math.max(0.4, (e.size ?? e.spec.size) * 0.8);
          if (pr.off >= r) continue;
          // `hard` is beamburn's word for the not-rammable tier — the same
          // read the board already carries in colour
          along.push({ e, t: pr.s, hard: !e.spec.rammable });
        }
        // A WALL BOGS IT LIKE ARMOUR DOES (operator). Burning into rock is
        // the same job as burning through a solid core — the sweep labours,
        // and firing across a corner drags exactly as it should. It is the
        // harsher of the two, in fact: a wall also ends the beam outright,
        // where a body only takes a bite out of the reach.
        if (bite > 0.05) beamHitWall = true;
        // ONE COPY OF THE RULE (beamburn.js). It sorts nearest-first itself,
        // so no caller here or in the lab can get the order wrong — and the
        // order is the whole mechanic.
        // `bite` is reported, not applied: WALL_STALLS makes rock a flat
        // stall now. The explicit wall flag matters — rock exactly at the tip
        // bites 0 and would otherwise read as no wall at all.
        const bu = burn(along, len, reach, bite, len < reach);
        for (const hit of bu.hits) damageEnemy(hit.e, tNow, LASER_DPS * dt, false, 'tank');
        const drag = bu.drag, reachLeft = bu.reachLeft;
        // draw the CHOKED length, not the clear-air one
        drawBeam(gi, from, dir, Math.max(cellSide * 0.15, reachLeft),
          laserHeat / LASER_MAX_HEAT, gunR);
        // ADVANCE THIS BEAM'S SWEEP, slowed by what it is chewing through.
        // Capped so it always creeps, never freezes; uncapped at the top so a
        // beam that spends the burst inside a hard cluster simply does not
        // finish its arc.
        beamPhase[gi] = Math.min(1, beamPhase[gi]
          + sweepAdvance(dt, LASER_MAX_HEAT, drag));
      }
    } else if (beamOn) {
      beamOn = false;
      if (beamVoice) { beamVoice.stop(); beamVoice = null; }
      hideBeams();
    }
  }

  // --- firing: the shot leaves along the turret's CURRENT sweep ------------
  function fire(aimDir = null) {
    closeShop();   // you cannot be shopping and shooting at the same time
    if (player.won || playerDown || paused || ammo <= 0 || cannonHeat > 0) return;
    ammo--;
    sfx.play('tank_main'); // the player's own act — always at full presence
    cannonHeat = CANNON_COOL; // the sleeve glows red-hot, cools over 3 s
    recoilLeft = recoilLen();
    bumpLeft = Math.max(bumpLeft, BUMP_LEN * 0.4); // the shot rocks the hull too
    let dir = aimDir;
    const turret = playerMesh.userData.turret;
    if (!dir && turret) {
      // world +Z of the turret group, flattened into the tangent plane —
      // aim IS the sweep; no sign conventions to get wrong
      turret.getWorldQuaternion(tmpQ);
      tmpV.set(0, 0, 1).applyQuaternion(tmpQ);
      const n = norm3(player.pos);
      const d = [tmpV.x, tmpV.y, tmpV.z];
      dir = norm3(sub3(d, scale3(n, dot3(d, n))));
    } else if (!dir) {
      dir = player.smoothDir.slice(); // turretless units fire straight ahead
    }
    // the Braille bullet, nose along the flight direction
    const mesh = makeBulletCloud({ body: look().walkerHi, hi: 0xffffff });
    mesh.scale.setScalar(cellSide * 0.16);
    scene.add(mesh);
    projectiles.push({ pos: player.pos.slice(), dir, dist: 0, mesh });
    updateHud();
  }

  function killProjectile(i) {
    scene.remove(projectiles[i].mesh);
    projectiles[i].mesh.geometry.dispose();
    projectiles.splice(i, 1);
  }

  // shells breach walls: the cell blows apart the way a tank does (a
  // stand-in wall block feeds makeDebris), opens to floor, and the
  // heart-distance field is re-laid — everyone's nav sees the new gap,
  // enemies included. Clearing your path can shorten theirs.
  function blastWall(ci) {
    if (!breachWallCell(ci)) return;
    rebuildAfterBreach();
  }

  // The tag flip and the debris, WITHOUT the rebuild — so a strike that
  // breaches half a dozen cells pays for one BFS and one geometry build,
  // not six of each.
  function breachWallCell(ci) {
    if (ci === serverCi) return false; // the server is INVINCIBLE — no missile opens it
    if (towerByCell.has(ci)) return false; // a mounted tower anchors its wall
    breachedCells.add(ci); // demolition is permanent across rounds
    dungeon.tags[ci] = PATH;
    const c = graph.centers[ci];
    const n = graph.normals[ci];
    // wall hue, brightened: several looks keep sides near-black and the
    // scatter has to read against them
    const side = look().walls.side;
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(cellSide * 0.9, params.wallHeight, cellSide * 0.9),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(
        Math.min(1, side[0] * 4 + 0.1), Math.min(1, side[1] * 4 + 0.1), Math.min(1, side[2] * 4 + 0.1)) }));
    const bp = scale3(c, 1 + params.wallHeight * 0.5);
    block.position.set(bp[0], bp[1], bp[2]);
    tmpN.set(n[0], n[1], n[2]);
    block.quaternion.setFromUnitVectors(Y_AXIS, tmpN);
    const fx = makeDebris(block, n);
    scene.add(fx);
    debris.push(fx);
    block.geometry.dispose();
    block.material.dispose();
    return true;
  }

  function rebuildAfterBreach() {
    dungeon.distToHeart = bfsDist(graph.adj, [dungeon.heart], (i) => dungeon.tags[i] !== BLOCKED);
    buildGeometry();
  }

  function updateProjectiles(dt, tNow) {
    const v = 3.4 * cellSide;
    const maxDist = 10 * cellSide;
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.pos = norm3(add3(p.pos, scale3(p.dir, v * dt)));
      const n = p.pos;
      p.dir = norm3(sub3(p.dir, scale3(n, dot3(p.dir, n))));
      p.dist += v * dt;
      const lift = 1 + params.wallHeight * 0.5;
      p.mesh.position.set(p.pos[0] * lift, p.pos[1] * lift, p.pos[2] * lift);
      // nose along flight, rifling spin about the flight axis
      tmpV.set(p.dir[0], p.dir[1], p.dir[2]);
      p.mesh.quaternion.setFromUnitVectors(Y_AXIS, tmpV);
      p.mesh.rotateY(p.dist * 60);

      // creature contact: fodder dies to one shell, the dangerous tier
      // soaks its hp and reacts (slows / ACCELERATES) while it lasts
      let hit = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (dist3(p.pos, e.pos) < cellSide * Math.max(0.45, (e.size ?? e.spec.size) * 0.8)) {
          // NINE shells a rack, each one precious — so each one is an
          // EVENT (operator ruling): a direct hit one-shots everything
          // below the heavy tier (dmg 4 kills up to the rolling mine;
          // prime and the Thorus soak it and remember), and the splash
          // genuinely clears a pocket rather than shaving it.
          damageEnemy(e, tNow, 4, true, 'tank');
          const SHELL_R = cellSide * 2.0;
          for (const e2 of enemies) {
            if (e2 === e || !e2.alive) continue;
            const d2 = dist3(p.pos, e2.pos);
            if (d2 < SHELL_R) {
              damageEnemy(e2, tNow, d2 < SHELL_R * 0.5 ? 2 : 1, false, 'tank');
            }
          }
          // an explosion you can HEAR and SEE: the heavy blast lands at
          // the impact (fire already played tank_main at the muzzle), and
          // the strike's full three-ring language at shell scale
          sfx.play('tower_aoe', { dist: camDist(p.pos) });
          const sci = cellIndex(p.pos);
          if (sci !== -1) {
            warnRing(sci, 0xffffff, 0.55, SHELL_R * 1.1);
            warnRing(sci, 0xffb347, 0.4, SHELL_R * 0.65);
            warnRing(sci, 0xfff2c0, 0.28, SHELL_R * 0.35);
          }
          const clip = makeDotBurst(0xfff2c0, norm3(p.pos), 90);
          clip.scale.setScalar(cellSide * 1.6);
          const cp = add3(p.pos, scale3(norm3(p.pos), cellSide * 0.15));
          clip.position.set(cp[0], cp[1], cp[2]);
          scene.add(clip);
          debris.push(clip);
          hit = true;
          break;
        }
      }
      // spawn points soak 3 hits; a landed shell also marks the source
      // FOUND — the minimap beacon starts pulsing
      if (!hit) {
        for (const sp of spawnPoints) {
          if (!sp.alive) continue;
          if (dist3(p.pos, graph.centers[sp.ci]) < cellSide * 0.6) {
            sp.found = true;
            hit = true;
            sp.hp--;
            if (sp.hp <= 0) {
              killPortal(sp);
            } else {
              // wounded: the portal shrinks a step AND its light dims —
              // a dying gate fades before it falls
              const s = sp.obj.userData.sizeScale * (0.65 + 0.35 * (sp.hp / 3));
              sp.obj.scale.setScalar(s);
              if (sp.obj.userData.setDim) sp.obj.userData.setDim(0.2 + 0.8 * (sp.hp / 3));
            }
            updateHud();
            break;
          }
        }
      }
      if (hit) { killProjectile(i); checkVictory(); continue; }

      // wall impact: the shell BREACHES it — one wall per shell
      let bestCi = -1, bd = Infinity;
      for (let ci = 0; ci < graph.centers.length; ci++) {
        const c = graph.centers[ci];
        const dx = c[0] - p.pos[0], dy = c[1] - p.pos[1], dz = c[2] - p.pos[2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bd) { bd = d2; bestCi = ci; }
      }
      if (bestCi !== -1 && dungeon.tags[bestCi] === BLOCKED) {
        blastWall(bestCi);
        killProjectile(i);
        continue;
      }
      if (p.dist > maxDist) killProjectile(i);
    }
  }


  // --- far-field rewards ----------------------------------------------------
  // no ammo sphere: the bullet triad already IS the ammo pickup — two
  // shapes meaning the same thing taught nothing (operator cut)
  // one table, shared with the unit viewer — see src/pickups.js. A second
  // copy would drift the first time a colour or an effect changed, and the
  // viewer would start teaching the player something that is not true.
  const REWARD_TYPES = PICKUPS;

  function clearRewards() {
    for (const r of rewardMeshes.values()) {
      scene.remove(r.obj);
      disposeObj(r.obj); // a solid reward is a GROUP: it has no .geometry
    }
    rewardMeshes.clear();
  }

  function farCells() {
    let maxD = 0;
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (dungeon.tags[i] !== BLOCKED) maxD = Math.max(maxD, dungeon.distToHeart[i]);
    }
    const far = [];
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (dungeon.tags[i] !== BLOCKED && dungeon.distToHeart[i] >= maxD * 0.55
        && !rewardMeshes.has(i)) far.push(i);
    }
    return far;
  }

  function placeReward(spec, ci) {
    const r = cellSide * 0.24;
    const obj = makeRewardSolid(spec.shape, { body: spec.body, hi: 0xffffff }, whim() * 6.283);
    obj.scale.setScalar(r);
    obj.userData.sizeScale = r;
    const c = graph.centers[ci];
    const n = graph.normals[ci];
    obj.position.set(c[0] + n[0] * r * 1.2, c[1] + n[1] * r * 1.2, c[2] + n[2] * r * 1.2);
    scene.add(obj);
    rewardMeshes.set(ci, { obj, type: spec.type });
  }

  function spawnRewards() {
    clearRewards();
    regrowQueue.length = 0; // a new board owes nothing to the old one's picks
    const far = farCells();
    for (let k = 0; k < params.rewards && far.length > 0; k++) {
      const ci = far.splice(Math.floor(whim() * far.length), 1)[0];
      placeReward(REWARD_TYPES[k % REWARD_TYPES.length], ci);
    }
  }

  // Consumables REGROW. Health and heart-regen are the two pickups a long
  // round genuinely runs out of — power stays one-shot (a permanent buff
  // that respawned would be a farm). Each consumed orb schedules one
  // replacement on the far field after a beat; placement reuses the same
  // whim() stream, so a replayed seed regrows identically.
  const REGROW_TIME = 50; // s from pickup to the replacement appearing
  const regrowQueue = []; // { type, t } in simTime
  function stepRegrow() {
    while (regrowQueue.length && simTime >= regrowQueue[0].t) {
      const job = regrowQueue.shift();
      const spec = REWARD_TYPES.find((sp) => sp.type === job.type);
      const far = farCells();
      if (!spec || far.length === 0) continue;
      const ci = far[Math.floor(whim() * far.length)];
      placeReward(spec, ci);
    }
  }

  function checkRewards() {
    if (playerDown) return; // a wreck picks nothing up
    const r = rewardMeshes.get(player.cur);
    if (r) {
      scene.remove(r.obj);
      disposeObj(r.obj); // a solid is a GROUP — .geometry.dispose() would throw
      rewardMeshes.delete(player.cur);
      sfx.play('tank_pickup');
      if (r.type === 'power') speedBonus *= 1.08;
      else if (r.type === 'health') playerHP = Math.min(PLAYER_MAX, playerHP + 1);
      else if (r.type === 'regen') carryingRegen = true;
      else if (r.type === 'shield') {
        shieldT = SHIELD_TIME;
        sfx.play('tank_spool_up'); // the bubble igniting
        showToast(`<div class="wave-num">SHIELD UP</div>`
          + `<div class="wave-role">${SHIELD_TIME}s — touch damage bounces off</div>`, 2200);
      }
      if (r.type === 'health' || r.type === 'regen' || r.type === 'shield') {
        regrowQueue.push({ type: r.type, t: simTime + REGROW_TIME });
      }
      updateHud();
    }
    // deliver a carried regen: near the Heart, it heals
    if (carryingRegen && dungeon.distToHeart[player.cur] <= 2) {
      carryingRegen = false;
      heartHP = Math.min(HEART_MAX, heartHP + 4);
      updateHud();
    }
    stepRegrow();
    for (const orb of rewardMeshes.values()) orb.obj.userData.tick(simTime);
  }

  // --- enemy fire ------------------------------------------------------------
  // The tank dying should be an EVENT. Losing hover is the throughline: the
  // hull drops, the wreck rocks hard on its suspension, and the body bursts.
  // The modal is held back until that has played, or the death reads as a
  // dialog box rather than a destruction.
  const DEATH_HOLD = 1.15; // s of wreck before the modal
  function destroyPlayer() {
    if (!playerMesh) return;
    stopEngine(0.12, true);   // quiet: the hydraulics don't get to set it down
    feel.hoverT = 0;          // hover fails instantly — it DROPS
    landTankFeel(feel);       // and rocks hard as it lands
    sfx.play('tank_destroyed');
    const nrm = norm3(player.pos);
    const fx = makeDebris(playerMesh, nrm);
    scene.add(fx);
    debris.push(fx);
    const burst = makeDotBurst(look().walkerHi, nrm, 54);
    burst.scale.setScalar(cellSide * 0.9);
    const bp = add3(player.pos, scale3(nrm, cellSide * 0.25));
    burst.position.set(bp[0], bp[1], bp[2]);
    scene.add(burst);
    debris.push(burst);
    playerMesh.visible = false;
    playerDown = true;
  }

  // Watching the wreck should not cost a round. This plays the destruction
  // and then puts the tank back, so it can be run over and over from the
  // panel while tuning. It deliberately does NOT touch game state — nothing
  // here ends the run.
  function previewDestruction() {
    if (player.won || !playerMesh) return;
    destroyPlayer();
    const previewGen = runGen;  // same rule as loseTank: a run owns its timers
    setTimeout(() => {
      if (previewGen !== runGen) return;     // the run it was previewing is gone
      if (player.won || !playerMesh) return; // a real death happened meanwhile
      playerMesh.visible = true;
      playerDown = false;
      feel.hoverT = 0;
      landTankFeel(feel);   // it drops back in and settles
    }, DEATH_HOLD * 1000);
  }

  // hover (or tap) a killer's icon on the last transmission: its dossier
  // fills the line below — name, role, and the stats that killed you
  msgEl.addEventListener('pointerover', (ev) => {
    const el = ev.target;
    if (!el.classList || !el.classList.contains('go-killer')) return;
    const type = el.dataset.ktype;
    const spec = ENEMY_SPEC[type];
    const intro = INTROS.find((iv) => iv.type === type);
    const info = msgEl.querySelector('.go-kinfo');
    if (!spec || !info) return;
    info.innerHTML = `<b>${intro ? intro.label : type.toUpperCase()}</b>`
      + ` — ${intro ? intro.role : ''} · ${spec.hp} hp · speed ${spec.speed}`
      + ` · ${spec.rammable ? 'rammable' : '<span class="go-noram">DO NOT RAM</span>'}`
      + ` · bounty ${spec.bounty}`;
  });

  // The verdict lists. Three tiers by how far the run got; picked by
  // score modulo (deterministic per run — a replayed seed gets the same
  // eulogy). Low tier is the low-key diss track the operator ordered.
  const VERDICT_LOW = [
    'SNAFU · K-KILL ×3 · try harder next time',
    'THAT WAS THE TUTORIAL, LAD',
    'the heart deserved better',
    'portals 2 · you 0 · do the math',
    'walked the wrong pole, soldier',
    'the phage send their regards',
    'logistics called — they want the tank back',
    'a bold strategy: dying early',
    'brief. very brief.',
    'the SITREP is one word long: OOF',
  ];
  const VERDICT_MID = [
    'GOOD RUN, LAD',
    'held the line — for a while',
    'a proper scrap, that one',
    'the heart remembers who stood',
    'they earned that one. barely.',
    'decent tread-work, commander',
    'the wall of you nearly held',
    'a fighting retreat, well fought',
    'they will find the wreck FACING them',
    'not the worst transmission we have logged',
  ];
  const VERDICT_HIGH = [
    'OUTSTANDING, COMMANDER',
    'the sector will sing of this',
    'textbook defense · filthy execution',
    'a masterclass in applied violence',
    'the portals BLINKED first',
    'carve this one into the hull',
    'the heart beat louder for you',
    'legendary tread-work · the ranks agree',
    'they will teach this run at the academy',
    'send THIS transmission twice',
  ];
  function loseGame(reason) {
    if (player.won) return;
    player.won = true; // stops motion; same flag, sadder modal
    destroyPlayer();
    ramCombo = 0; ramComboT = 0; syncCombo(); // no brag over a lost heart
    // the verdict: tier by distance travelled, line by score (deterministic)
    const tierList = wave >= 9 || round >= 2 ? VERDICT_HIGH
      : wave >= 4 ? VERDICT_MID : VERDICT_LOW;
    const verdict = tierList[score.points % tierList.length];
    const newBest = score.points >= score.best && score.points > 0;
    // kills histogram, tinted per enemy (the SitRep's row idiom)
    const total = rs ? Object.values(rs.kills).reduce((a, b) => a + b, 0) : 0;
    const top = rs ? Math.max(1, ...Object.values(rs.kills)) : 1;
    const rows = rs ? Object.entries(rs.kills).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([type, k]) => {
        const tint = '#' + (CREATURE_TINTS[type] ?? 0xffffff).toString(16).padStart(6, '0');
        return `<div class="sr-row"><span class="sr-name">${type}</span>`
          + `<span class="sr-track"><span class="sr-bar" style="width:${Math.round((k / top) * 100)}%;background:${tint}"></span></span>`
          + `<span class="sr-n">${k}</span></div>`;
      }).join('') : '';
    // who took each tank: icon cards for the killers, in order
    const killers = rs && rs.killers.length
      ? `<div class="go-killers">TANKS LOST TO ${rs.killers.map((type) =>
        `<img class="go-killer" data-ktype="${type}" src="${spriteShot(type, unitIcon(type, CREATURE_TINTS[type] ?? 0xffffff))}">`
      ).join('')}<div class="go-kinfo">hover a killer for its file</div></div>`
      : `<div class="go-killers">hull intact to the end — the heart fell first</div>`;
    const spark = rs && rs.scoreBins.length >= 3
      ? `<div class="sr-line sr-spark">SCORE ${sparkline(rs.scoreBins.map((v, i, a) => v - (a[i - 1] ?? 0)))}</div>` : '';
    // the operator's wording, verbatim: LAST TRANSMISSION — SNAFU,
    // K-KILL ×(hulls destroyed) — THEN the eulogy and the numbers
    const kkill = PLAYER_MAX - Math.max(0, playerHP);
    const forfeit = '';
    msgEl.innerHTML = `<div class="msg-head">LAST TRANSMISSION</div>`
      + `<div class="go-snafu">SNAFU · K-KILL ×${kkill}</div>`
      + forfeit
      + `<div class="go-verdict${newBest ? ' best' : ''}">${verdict}</div>`
      + `<div class="go-reason">× ${reason}</div>`
      + `<div class="go-grid">`
      + `<span>SCORE <b>${fmt(score.points)}</b>${newBest ? ' <i class="go-best">NEW BEST</i>' : ` · best ${fmt(score.best)}`}</span>`
      + `<span>WAVE <b>${wave}</b> · R${round}</span>`
      + `<span>KILLS <b>${total}</b> — tank ${rs ? rs.bySrc.tank : 0} · towers ${rs ? rs.bySrc.tower : 0} · orbital ${rs ? rs.bySrc.strike : 0}</span>`
      + `<span>RAMS <b>${rs ? rs.rams : 0}</b> · best combo ×${rs ? rs.maxCombo : 0} · strikes ${rs ? rs.strikes : 0}</span>`
      + `<span>heart ${Math.max(0, heartHP)}/${HEART_MAX} · rank ${rs && rs.maxRank > 0 ? rankLabel(rs.maxRank) : 'unranked'}</span>`
      + `</div>`
      + runAchvBlock()
      + rows + spark + killers
      + `<button class="msg-regen">⟲ new sector</button>`;
    // let the wreck play before the modal covers it
    setTimeout(() => msgEl.classList.remove('hidden'), DEATH_HOLD * 1000);
  }

  function playerHit(killerType = null) {
    // the shield takes it: a hard flash on the bubble, nothing on the hull
    if (shieldT > 0) {
      if (shieldObj) shieldObj.material.opacity = 1;
      bumpLeft = Math.max(bumpLeft, BUMP_LEN * 0.5); // the impact still SHOVES
      return;
    }
    playerHP--;
    run.hullsLost++;
    checkAchievements();
    if (rs && killerType) rs.killers.push(killerType);
    updateHud();
    if (playerHP > 0) { loseTank(); return; }
    loseGame('your last tank is gone');
  }

  // Losing a tank is an EVENT, not a subtraction. It used to be neither: the
  // hull counter ticked down and the machine carried on driving, so the most
  // consequential thing that can happen to you was invisible.
  //
  // Now it explodes, and you come back in BUILD — pulled up and out, looking
  // at the whole board, with the wall you did not have time to buy still
  // unbought. That is the decision the loss should hand you, and it is the
  // one place the game can make you take it.
  const DOWN_DASH = 1.0;   // seconds of camera, wreck -> camp

  function loseTank() {
    // THE RANK SURVIVES THE HULL (operator, 2026-09-02). It used to be
    // stripped here — "the insignia belonged to that hull" — and that was a
    // read of who the tank IS. The tank is not the pilot. The pilot is the
    // player: a disembodied thing that occupies one machine at a time, which
    // is the only reason it cannot drive them all at once. Burning a hull
    // costs you the hull.
    //
    // What still dies with the wreck is the RAM COMBO, because that one is
    // genuinely the machine's momentum and nothing carries it out.
    const carried = tankRank > 0 ? rankLabel(tankRank) : '';
    destroyPlayer();
    ramCombo = 0; ramComboT = 0; syncCombo(); // the combo died with it

    // BEAT 1 — the wreck, and the word for it. Losing a hull is the most
    // consequential thing that happens to you and it used to be a toast the
    // size of a wave announcement.
    showToast(`<div class="td-down">MK-CX DOWN!</div>`
      + `<div class="td-down-sub">${playerHP} left`
      + `${carried ? ` · ${carried} carries over` : ''}</div>`,
      (DEATH_HOLD + DOWN_DASH) * 1000);

    // THE DEAD RUN'S TIMER MUST NOT LAND ON THE LIVE ONE. This hold is
    // 1.15s long and RETRY sits on a modal the player can hit inside it —
    // and it used to fire regardless, repositioning a brand-new tank,
    // snapping the camera to orbit and toasting on a run that had lost
    // nothing. Measured, not supposed: ?ctlprobe=1.
    const deathGen = runGen;
    setTimeout(() => {
      if (deathGen !== runGen) return;         // this belonged to a run that is over
      if (player.won || !playerMesh) return;   // a real death happened meanwhile
      const n = berthIndexFor(playerHP);
      // the view the next hull will be driven in — chosen BEFORE the dash, so
      // the pose the dash flies to is the pose the game is about to use
      if (!buildMode) setView('orbit');
      const from = { pos: camera.position.clone(), quat: camera.quaternion.clone() };
      // BEAT 2 — THE DOWN DASH. The camera runs home from the wreck and
      // lands on DEPLOY's opening pose. It used to cut: setView + snapCamera,
      // and you were suddenly somewhere else. Same join the cinematic uses,
      // so a death and a fresh load arrive at an identical frame.
      startShot({
        id: 'downdash',
        dur: DOWN_DASH,
        poseAt: (u, out) => {
          const w = u * u * (3 - 2 * u);
          deployFramePoseFor(n, camA);
          out.pos.lerpVectors(from.pos, camA.pos, w);
          out.quat.copy(from.quat).slerp(camA.quat, w);
        },
        // BEAT 3 — the next hull rolls out of its berth, live.
        onEnd: () => {
          tankLostDeploys++;
          playerMesh.visible = true;
          playerDown = false;
          feel.hoverT = 0;
          landTankFeel(feel);
          applyTankHealth(playerMesh, playerHP / PLAYER_MAX);
          deployStart(n);   // no snapCamera: DEPLOY blends on from here
        },
      });
    }, DEATH_HOLD * 1000);
  }

  // Respawn beside the HEART, not at the spawn gate. The gate is enemy
  // ground by the time you die — a wave is usually pouring out of it — so
  // the old respawn put the wreck straight back into the thing that made it
  // a wreck, and sometimes BEHIND a portal with the wave between you and
  // home. You come back at the thing you are defending, facing outward.
  // --- DEPLOY: the one way a tank enters the world ------------------------
  // Every reset lands here, whatever ran before it — a fresh page load, a
  // retry after a loss, a forced reset, a hull lost mid-run. The hull starts
  // at rest inside its berth, drives ENTIRELY OUT, and hands over in manual.
  // Preludes (the CINEMATIC, the DOWN DASH) differ only in what the camera
  // was doing beforehand; they all end on DEPLOY's first frame, which is what
  // makes the opening state identical however you got to it.
  //
  // "Entirely out" is measured in CELLS, not in metres of model: the box
  // occupies its berth cell, so a hull whose centre has reached the exit
  // cell's centre is clear of it by construction. That stays true when the
  // container model has not loaded at all — which it may not have, since the
  // model is now decoration and DEPLOY does not wait for it.
  //
  // DEPLOY is NOT auto mode and NOT cruise. Auto stays something the player
  // chooses (operator, 2026-09-01); and cruise left engaged by a berth
  // respawn is precisely what made the throttle lever read as dead. It is its
  // own short scripted beat, and it ends with the controls in the player's
  // hands and the lever at zero.
  let deploy = null;   // { n, from[3], to[3], segLen, travelled }
  const deployActive = () => deploy !== null;

  function deployStart(n) {
    const b = berths[n];
    if (!b || !graph) return false;
    deployCount++;
    ctlLog(`deploy:#${n + 1}`);
    player.freeMode = false;
    player.virtualStart = null;
    player.cur = b.ci;
    player.prev = -1;
    player.pos = graph.centers[b.ci].slice();
    player.prog = 0;
    player.next = b.exit;
    player.heading = tangentDirTo(b.ci, b.exit);
    player.travelDir = player.heading.slice();
    player.smoothDir = player.travelDir.slice();
    player.segLen = Math.max(1e-9, dist3(graph.centers[b.ci], graph.centers[b.exit]));
    throttle = 0; cruise = false; autoMode = false;
    paintThrottle();
    stopEngine(0.1, true);
    // only what is NOT derivable: which berth, and how far out we are. from,
    // to and segLen were all functions of `n` and drifted-by-construction.
    deploy = { n, travelled: 0 };
    return true;
  }

  // THE POSE THE WHOLE DESIGN HANGS OFF. Every prelude's last frame is this,
  // so "the cinematic's last frame is the first frame of the reset state" is
  // a property of the code rather than something tuned until it looks right.
  // A low three-quarter standing where the doors face, so the hull rolls
  // toward the lens.
  function deployFramePoseFor(n, out) {
    const b = berths[n];
    if (!b) return;
    const bc = graph.centers[b.ci];
    const bn = graph.normals[b.ci];
    const eye = add3(add3(bc, scale3(bn, params.wallHeight * 1.7 + cellSide * 0.55)),
      scale3(tangentDirTo(b.ci, b.exit), cellSide * 2.1));
    const look = add3(bc, scale3(bn, params.wallHeight * 0.55));
    out.pos.set(eye[0], eye[1], eye[2]);
    tmpCam.position.copy(out.pos);
    tmpCam.up.set(bn[0], bn[1], bn[2]);
    tmpCam.lookAt(look[0], look[1], look[2]);
    out.quat.copy(tmpCam.quaternion);
  }

  // how far through the drive-out we are, eased — the camera blend and the
  // motion share one progress value so they cannot disagree
  function deployProgress() {
    if (!deploy) return 1;
    const b = berths[deploy.n];
    if (!b) return 1;
    const segLen = Math.max(1e-9,
      dist3(graph.centers[b.ci], graph.centers[b.exit]));
    return Math.min(1, deploy.travelled / segLen);
  }
  function deployEase() {
    const u = deployProgress();
    return u * u * (3 - 2 * u);
  }

  function deployStep(dt) {
    if (!deploy) return;
    const b = berths[deploy.n];
    if (!b) { deploy = null; return; }
    const v = params.speed * speedBonus * cellSide * 1.6;
    deploy.travelled += v * dt;
    const u = deployProgress();
    const from = graph.centers[b.ci];
    const to = graph.centers[b.exit];
    const p = [0, 1, 2].map((i) => from[i] + (to[i] - from[i]) * u);
    player.pos = norm3(p);
    player.heading = tangentDirTo(b.ci, b.exit);
    player.travelDir = player.heading.slice();
    player.smoothDir = player.travelDir.slice();
    const ci = cellIndex(player.pos);
    if (ci !== -1 && ci !== player.cur) arriveAt(ci);
    if (u >= 1) {
      // hands over: manual, lever at zero, auto off. Because `keys` is HELD
      // state, a player already leaning on W drives on without a beat — and
      // forward is the direction the hull is already going, so the handover
      // is continuous rather than a stop.
      deploy = null;
      throttle = 0; cruise = false; autoMode = false;
      paintThrottle();
    }
  }

  function heartHit(dmg = 1) {
    run.heartHits += dmg;
    eco.leak(); // a breach kills the streak — HK's rule, our Heart
    streakMark = 0;
    if (ws) ws.leaks++;
    if (!tutorialActive) heartHP -= dmg;
    heartSprite.userData.hit(); // orange/red Wave flare
    updateHud();
    if (heartHP <= 0) loseGame('the heart is lost');
  }

  // ======================= TOWERS (TD M2) ==================================
  // Slots are open cells; a placed tower is SOLID and blocks pathing (the
  // maze you buy). Placement runs a connectivity guard: no live portal may
  // be cut off from the Heart. Firing/targeting math lives in towers.js;
  // this section owns raycast→cell selection, the shop/upgrade panels,
  // projectile kinds, and the economy hookup.
  const towers = [];              // { key, def, tier, ci, obj, cooldown, spent }
  const towerByCell = new Map();  // ci -> tower
  const towerCells = new Set();
  const towerShots = [];          // { pos, dir, dist, mesh, dmg, splash, homing }
  const beams = [];               // { mesh, ttl } laser + slow-tether fx
  let eco = makeEconomy();
  // Points are not biomass: the scoreboard triples tank kills and scales
  // with how swarmed the field was. Best survives across runs (localStorage);
  // it updates LIVE when beaten, so a crash can't eat a record.
  const BEST_KEY = 'td-best-score-v1';
  let score = makeScore((() => {
    try { return +(localStorage.getItem(BEST_KEY) || 0) || 0; } catch { return 0; }
  })());
  function persistBest() {
    try { localStorage.setItem(BEST_KEY, String(score.best)); } catch { /* private mode */ }
  }
  function scoreKill(bounty, opts) {
    score.addKill(bounty, opts);
    persistBest();
  }

  // HT rule: towers build on the HIGH GROUND only — real wall cells (in
  // the un-sealed world) that border the open sector. Low ground belongs
  // to monsters and the player. No connectivity guard needed: walls never
  // carry enemy pathing, so a tower can never dam a lane.
  function placeError(ci) {
    if (ci === -1) return 'nothing there';
    if (ci === serverCi) return 'the server holds this cell';
    if (tdFullTags[ci] !== BLOCKED) return 'towers need HIGH GROUND';
    if (towerByCell.has(ci)) return 'occupied';
    if (!graph.adj[ci].some((nb) => dungeon.tags[nb] !== BLOCKED)) {
      return 'beyond the frontier';
    }
    return null;
  }

  // One placement recipe, used by placement, upgrade and look-swap alike.
  // Tier bulk is DERIVED from tower.tier here rather than accumulated onto
  // the object with multiplyScalar — otherwise the visual silently carries
  // tier state, and any rebuild (a look swap) would quietly lose it.
  const TIER_BULK = 1.12;
  function placeTowerObj(tower) {
    const obj = tower.obj;
    const s = (obj.userData.baseScale ?? 1) * cellSide * 0.62
      * Math.pow(TIER_BULK, tower.tier);
    obj.scale.setScalar(s);
    const c = graph.centers[tower.ci];
    const nrm = graph.normals[tower.ci];
    const top = 1 + params.wallHeight; // mounted on the wall's roof
    obj.position.set(c[0] * top, c[1] * top, c[2] * top);
    tmpN.set(nrm[0], nrm[1], nrm[2]);
    obj.quaternion.setFromUnitVectors(Y_AXIS, tmpN);
  }

  // Swap every tower's VISUAL in place. Game state — key, def, tier, cell,
  // cooldown, spend — is untouched; only `obj` is rebuilt. That is the
  // whole point of the registry.
  // Choosing a player unit. Units whose model loads asynchronously build
  // their procedural fallback right now and swap in when the bytes land, so
  // the choice is instant and the tank is never missing.
  function applyCreature() {
    const chosen = params.creature;
    if (chosen === 'mkcx') {
      preloadMkcx().then((ok) => {
        if (ok && params.creature === chosen) { buildActors(); placeActors(); }
      });
    }
    buildActors();
    placeActors();
  }

  function applyTowerLook() {
    // A look with async assets builds as the fallback right now and gets
    // re-applied once loaded — so choosing it is instant and never blank.
    const chosen = params.towerLook;
    preloadLook(chosen).then((ok) => {
      if (ok && params.towerLook === chosen) rebuildTowerObjects();
    });
    rebuildTowerObjects();
  }

  function rebuildTowerObjects() {
    for (const tower of towers) {
      scene.remove(tower.obj);
      disposeObj(tower.obj);
      tower.obj = buildTowerLook(params.towerLook, tower.def);
      // the rebuilt obj starts at tier 0 — restore the earned pedestal
      if (tower.obj.userData.setTier) tower.obj.userData.setTier(tower.tier);
      placeTowerObj(tower);
      scene.add(tower.obj);
    }
  }

  // placeTower is now the INSTANT path, and it has exactly two legitimate
  // users left: the opening garrison (pre-built before the run, not ordered)
  // and the ?tower= verification hook. Everything the player asks for goes
  // through Isao.
  // WHERE THE OPENING GARRISON GOES.
  //
  // Forward of the heart, not on top of it. Towers mount on WALL cells, so a
  // candidate is a blocked cell with an open neighbour — and "forward" is
  // that neighbour sitting a few cells out from the heart rather than one.
  // Among those, prefer the sites nearest a live gate, because forward only
  // means anything in the direction the wave actually comes from.
  //
  // The two are also kept apart: the first pass of this put both on the same
  // stretch of wall, which is two towers covering one lane and none covering
  // the other.
  const GARRISON_BAND = [3, 6];    // cells from the heart, inclusive
  const GARRISON_APART = 4;        // cells between the two, minimum
  function garrisonSites(want) {
    const gates = spawnPoints.filter((sp) => sp.alive).map((sp) => sp.ci);
    const cand = [];
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (dungeon.tags[i] !== BLOCKED || placeError(i)) continue;
      let best = Infinity;
      for (const nb of graph.adj[i]) {
        const d = dungeon.tags[nb] !== BLOCKED ? dungeon.distToHeart[nb] : -1;
        if (d >= GARRISON_BAND[0] && d <= GARRISON_BAND[1]) best = Math.min(best, d);
      }
      if (best === Infinity) continue;
      // nearest gate, as a straight distance on the sphere in cells
      let toGate = Infinity;
      for (const g of gates) {
        toGate = Math.min(toGate, dist3(graph.centers[i], graph.centers[g]) / cellSide);
      }
      cand.push({ ci: i, toGate: Number.isFinite(toGate) ? toGate : 0, fromHeart: best });
    }
    cand.sort((a, b) => a.toGate - b.toGate);
    const out = [];
    for (const c of cand) {
      if (out.length >= want) break;
      const clear = out.every((o2) =>
        dist3(graph.centers[o2], graph.centers[c.ci]) / cellSide >= GARRISON_APART);
      if (clear) out.push(c.ci);
    }
    // ...and if the band or the spacing could not be satisfied on this board,
    // fall back to ANY legal wall rather than opening with no garrison at all
    if (out.length < want) {
      for (let i = 0; i < dungeon.tags.length && out.length < want; i++) {
        if (dungeon.tags[i] !== BLOCKED || placeError(i) || out.includes(i)) continue;
        if (graph.adj[i].some((nb) => dungeon.tags[nb] !== BLOCKED)) out.push(i);
      }
    }
    return out;
  }

  function placeTower(key, ci) {
    const def = TOWER_BY_KEY[key];
    if (!def) return false;
    const err = placeError(ci);
    if (err) { flashShopNote(err); return false; }
    if (!eco.spend(def.cost)) { flashShopNote('not enough biomass'); return false; }
    commitTower(key, ci, def.cost);
    return true;
  }
  function commitTower(key, ci, spent) {
    const def = TOWER_BY_KEY[key];
    const obj = buildTowerLook(params.towerLook, def);
    const tower = { key, def, tier: 0, ci, obj, cooldown: 0, spent };
    placeTowerObj(tower);
    scene.add(obj);
    towers.push(tower);
    towerByCell.set(ci, tower);
    towerCells.add(ci);
    showRangeRing(ci, effectiveStats(def, 0).range, def.color, 1.6);
    updateHud();
    return tower;
  }

  // --- ISAO: the industrial construction drone ---------------------------
  // Nothing the player builds is built by the player. An order is placed,
  // ISAO flies to the cell, and prints. Two clocks stand between wanting a
  // tower and having one — TRAVEL and BUILD — and that is the whole point:
  // a board of towers is now a sequence of decisions with a cost in time,
  // not a purse spent in one gesture. Biomass leaves the purse at ORDER
  // time (a queue you have not paid for is a queue you would spam), and a
  // cancelled order refunds in full, because nothing was printed.
  //
  // He flies high enough that nothing on the ground reaches him. That is a
  // deliberate simplification, not a physics claim: making him killable is
  // a real design lever and it belongs in a decision, not in a default.
  const ISAO_TINT = 0xbfe6ff;      // pale works blue — the CRT is the warm thing on him now
  const ISAO_ALT = 3.4;            // in wall-heights above the wall tops
  let isaoAlt = ISAO_ALT;          // ...and where the pilot has put him
  const ISAO_CELLS_SEC = 2.6;      // cruise, in cells per second
  const ISAO_BUILD_BASE = 2.0;     // seconds before cost is considered
  const ISAO_BUILD_PER_KG = 1 / 55; // ...and per kg of biomass printed
  const buildSeconds = (cost) => ISAO_BUILD_BASE + cost * ISAO_BUILD_PER_KG;
  // the live type-feel values the tuner writes into, restored from storage
  // through the schema's own clamp — our own localStorage is untrusted input
  // after a schema change, same rule as the feel store
  const TYPE = loadTypeFeel();
  // read-only here: whatever was dialled on the bench is already in force
  function applyType() {
    applyFontPack(currentFontPack(), document.documentElement, TYPE);
  }
  applyType();

  let isao = null;                 // { obj, dir[3], state, t, dur, order }
  let printBeam = null;             // one Line, reused for every print
  const PRINT_TRAIL = 8;            // bead segments behind the head
  const PRINT_TRAIL_STEP = 0.014;   // how far back along the path each one sits
  const orders = [];                // FIFO; orders[0] is the live one
  const orderByCell = new Map();    // ci -> order, for the shop and the cancel
  const isaoRadius = () => 1 + params.wallHeight * isaoAlt + cellSide * 0.5;

  function isaoPos(dir) {
    const r = isaoRadius();
    return [dir[0] * r, dir[1] * r, dir[2] * r];
  }
  // shortest path over the sphere, capped at maxAngle radians this step
  function stepDir(from, to, maxAngle) {
    const d = Math.max(-1, Math.min(1, dot3(from, to)));
    const ang = Math.acos(d);
    if (ang < 1e-5 || maxAngle >= ang) return to.slice();
    const k = maxAngle / ang;
    const s0 = Math.sin((1 - k) * ang) / Math.sin(ang);
    const s1 = Math.sin(k * ang) / Math.sin(ang);
    return norm3(add3(scale3(from, s0), scale3(to, s1)));
  }

  function spawnIsao() {
    if (isao || !graph || !dungeon) return Promise.resolve(false);
    return preloadFabricator().then((ok) => {
      if (!ok || isao || !graph || !dungeon) return;
      const obj = makeIsaoDrone(ISAO_TINT);
      if (!obj) return;
      obj.scale.setScalar(cellSide * 1.15);
      const dir = norm3(graph.centers[dungeon.heart]);
      isao = { obj, dir, state: 'idle', t: 0, dur: 0, order: null, loiter: dir.slice(), gleeT: 0 };
      placeIsao();
      scene.add(obj);
      return true;
    });
  }
  function placeIsao() {
    const p = isaoPos(isao.dir);
    isao.obj.position.set(p[0], p[1], p[2]);
    // up is its own radial; face where it is going (or where it is working)
    // he faces what he is doing: the site while flying to it AND while
    // printing it, his drift when idle. The build case used to fall through
    // to a stale loiter point, so he printed with his back to the work —
    // invisible until a camera was hung off his facing.
    tmpObj.position.copy(isao.obj.position);
    tmpObj.up.set(isao.dir[0], isao.dir[1], isao.dir[2]);

    // WHILE PILOTED HE FACES WHERE HE IS FLYING. This is the bug the operator
    // saw as "rotates on an unnatural axis": the aim below falls back to
    // isao.loiter, and pilotIsao sets loiter to his own POSITION, so the
    // lookAt target sat on top of him, the distance guard skipped the lookAt
    // entirely, and his quaternion was left stale from whatever it last was.
    // He was not rotating oddly — he was not being oriented at all.
    if (params.view === 'drone' && isaoHeading) {
      const ahead = add3(p, scale3(isaoHeading, cellSide));
      tmpObj.lookAt(ahead[0], ahead[1], ahead[2]);
      isao.obj.quaternion.copy(tmpObj.quaternion);
      // LEAN AND BANK, composed as quaternions onto the facing — never
      // written as Euler on the same object, which would replace the whole
      // orientation and put us straight back to an unnatural axis. This
      // project has that dead end on record twice.
      tmpQ.setFromAxisAngle(X_AXIS, isaoLean);
      isao.obj.quaternion.multiply(tmpQ);
      tmpQ.setFromAxisAngle(Z_AXIS, isaoRoll);
      isao.obj.quaternion.multiply(tmpQ);
      return;
    }

    // autonomous: he faces what he is doing — the site while flying to it AND
    // while printing it, his drift when idle
    const aim = isao.order ? norm3(graph.centers[isao.order.ci]) : isao.loiter;
    const t = isaoPos(aim);
    if (dist3(t, p) > 1e-4) tmpObj.lookAt(t[0], t[1], t[2]);
    isao.obj.quaternion.copy(tmpObj.quaternion);
  }

  // the site marker: a ring of points on the wall top, in the tower's own
  // colour, that says "something is coming here". It is the ONLY thing an
  // ordered-but-unbuilt cell shows until Isao arrives — the tower itself
  // grows out of the ground while he prints it, which is a better progress
  // bar than a progress bar.
  function makeSiteRing(ci, color) {
    const c = graph.centers[ci];
    const n = graph.normals[ci];
    const theta = cellSide * 0.42;
    const ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const t1 = norm3(cross3(n, ref));
    const t2 = cross3(n, t1);
    const pos = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * 2 * Math.PI;
      const d = add3(scale3(t1, Math.cos(a)), scale3(t2, Math.sin(a)));
      const p = scale3(norm3(add3(scale3(norm3(c), Math.cos(theta)), scale3(d, Math.sin(theta)))),
        1 + params.wallHeight * 1.02);
      pos.push(p[0], p[1], p[2]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const ring = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 3.0, sizeAttenuation: false, color, transparent: true, opacity: 0.9,
    }));
    scene.add(ring);
    return ring;
  }
  function dropSiteRing(order) {
    if (!order.ring) return;
    scene.remove(order.ring);
    order.ring.geometry.dispose();
    order.ring.material.dispose();
    order.ring = null;
  }

  // `quiet` is for orders the GAME places rather than the player: no click,
  // no range ring, and no printer brief — that brief exists to fire the first
  // time the PLAYER commits to an order, and having the opening garrison
  // spend it teaches the mechanic to nobody.
  function orderTower(key, ci, { quiet = false } = {}) {
    const def = TOWER_BY_KEY[key];
    if (!def) return false;
    const err = placeError(ci);
    if (err) { flashShopNote(err); return false; }
    if (orderByCell.has(ci)) { flashShopNote('already on the list'); return false; }
    if (!eco.spend(def.cost)) {
      flashShopNote('not enough biomass');
      showBrief('biomass');   // he has an opinion about this
      return false;
    }
    const order = { kind: 'tower', ci, key, def, cost: def.cost, ring: makeSiteRing(ci, def.color) };
    orders.push(order);
    orderByCell.set(ci, order);
    if (!quiet) showBrief('printer');   // the first order is when the mechanic is real
    run.maxQueue = Math.max(run.maxQueue, orders.length);
    checkAchievements();
    spawnIsao();
    if (!quiet) {
      sfx.play('laser_click'); // the order goes on the book, not a tower on the wall
      showRangeRing(ci, effectiveStats(def, 0).range, def.color, 1.6);
    }
    updateHud();
    return true;
  }
  function orderUpgrade(tower) {
    const cost = upgradeCost(tower.def, tower.tier);
    if (cost === null) return false;
    if (orderByCell.has(tower.ci)) { flashShopNote('already on the list'); return false; }
    if (!eco.spend(cost)) { flashShopNote('not enough biomass'); return false; }
    const order = { kind: 'upgrade', ci: tower.ci, tower, cost,
      ring: makeSiteRing(tower.ci, tower.def.color) };
    orders.push(order);
    orderByCell.set(tower.ci, order);
    spawnIsao();
    updateHud();
    return true;
  }
  // Cancelling costs nothing: nothing has been printed. The one exception is
  // the order Isao is already standing over — the biomass is in the nozzle
  // by then, and half of it does not come back.
  function cancelOrder(ci) {
    const order = orderByCell.get(ci);
    if (!order) return false;
    const live = orders[0] === order && isao && isao.state === 'build';
    eco.addBiomass(live ? Math.round(order.cost * 0.5) : order.cost);
    dropSiteRing(order);
    if (order.ghost) { scene.remove(order.ghost); disposeObj(order.ghost); order.ghost = null; }
    orders.splice(orders.indexOf(order), 1);
    orderByCell.delete(ci);
    if (isao && isao.order === order) { isao.order = null; isao.state = 'idle'; }
    flashShopNote(live ? 'order aborted — half back' : 'order cancelled');
    updateHud();
    return true;
  }

  function finishOrder(order) {
    dropSiteRing(order);
    if (order.kind === 'tower') {
      if (order.ghost) { scene.remove(order.ghost); disposeObj(order.ghost); order.ghost = null; }
      // re-check: the world moved while he flew (a strike, a sell, a tower
      // someone else put here). If the cell went bad, the biomass comes back.
      if (placeError(order.ci)) {
        eco.addBiomass(order.cost);
        flashShopNote('site lost — biomass returned');
      } else {
        commitTower(order.key, order.ci, order.cost);
        sfx.play('tower_upgrade');
      }
    } else if (towers.includes(order.tower)) {
      order.tower.tier++;
      order.tower.spent += order.cost;
      if (order.tower.obj.userData.setTier) order.tower.obj.userData.setTier(order.tower.tier);
      placeTowerObj(order.tower);
      showRangeRing(order.ci, effectiveStats(order.tower.def, order.tower.tier).range,
        order.tower.def.color, 1.4);
      sfx.play('tower_upgrade');
    } else {
      eco.addBiomass(order.cost);   // the tower was sold or destroyed mid-flight
    }
    orders.shift();
    orderByCell.delete(order.ci);
    isao.gleeT = 2.2;   // a finished print is worth a face
    isao.order = null;
    isao.state = 'idle';
    isao.t = 0;
    updateHud();
  }

  // --- FLYING HIM YOURSELF --------------------------------------------------
  // The drone camera started as a view. The operator wants the machine: in
  // drone view you have the stick, and Isao goes where you point him.
  //
  // His WORK is suspended while you fly — a drone cannot be halfway to a
  // print and under your hand at the same time, and pretending otherwise
  // would mean an order that never completes because you flew off with it.
  // Leave the view and he picks the queue straight back up.
  let isaoHeading = null;    // unit tangent at isao.dir; the way he is pointed
  const ISAO_TURN = 1.9;     // rad/s
  const ISAO_CLIMB = 2.4;    // altitude units per second, held
  // MEASURED. The demand maps about 1:1 to the tilt once it is measured
  // against his CURRENT local up — the early readings of 52 and 37 degrees
  // were the sphere's curvature leaking into the probe, not the model. 0.32
  // rad is a visible ~18 degrees: enough to read as a quadcopter tipping into
  // its acceleration, short of looking like a stall. ?droneprobe=1 prints it.
  const ISAO_LEAN = 0.32;    // rad of nose-down at full forward
  const ISAO_ROLL = 0.24;    // rad of bank into a turn
  let isaoLean = 0, isaoRoll = 0;
  const ISAO_FLY = 3.4;      // cells/s under power
  function pilotIsao(dt) {
    const up = isao.dir;
    // re-project the heading onto the tangent plane every frame: he is
    // flying over a sphere, so "forward" drifts out of plane as he moves
    if (!isaoHeading) {
      const ref = Math.abs(up[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      isaoHeading = norm3(cross3(up, ref));
    }
    let h = sub3(isaoHeading, scale3(up, dot3(isaoHeading, up)));
    const hl = len3(h);
    h = hl > 1e-6 ? scale3(h, 1 / hl) : norm3(cross3(up, [0, 1, 0]));
    const steer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    if (steer) {
      // rotate the heading about the local up — Rodrigues, with the sin/cos
      // of a small angle, which is all a turn on a sphere ever needs
      const a = steer * ISAO_TURN * dt;
      const ca = Math.cos(a), sa = Math.sin(a);
      h = norm3(add3(scale3(h, ca), scale3(cross3(up, h), sa)));
    }
    isaoHeading = h;
    const drive = keys.fast ? 1 : keys.slow ? -0.6 : (throttle !== 0 ? throttle : 0);
    if (drive) {
      const step = ISAO_FLY * cellSide * drive * dt;
      isao.dir = norm3(add3(isao.dir, scale3(h, step)));
      isao.loiter = isao.dir.slice();   // he holds where you left him
    }
    // ALTITUDE ON SPACE / SHIFT, held rather than tapped — a drone climbs
    // while you hold the stick. Q/E still step it discretely for anyone who
    // learned it that way.
    const climb = (keys.droneUp ? 1 : 0) - (keys.droneDown ? 1 : 0);
    if (climb) isaoAlt = Math.max(1.2, Math.min(9, isaoAlt + climb * ISAO_CLIMB * dt));
    // LEAN. A quadcopter does not translate flat: it tips into the direction
    // it is accelerating and rights itself when it stops. The lean EASES
    // toward the demand rather than snapping, which is most of why it reads
    // as a flying thing rather than a sliding one.
    const wantLean = drive * ISAO_LEAN;
    isaoLean += (wantLean - isaoLean) * Math.min(1, dt * 4.5);
    const wantRoll = -steer * ISAO_ROLL;
    isaoRoll += (wantRoll - isaoRoll) * Math.min(1, dt * 4.5);
    isao.obj.userData.spinRotors(dt, Math.abs(drive) * 0.8 + 0.2);
    if (isao.obj.userData.setFace) {
      isao.obj.userData.setFace(drive ? 'focused' : 'curious');
      isao.obj.userData.tickFace(dt);
    }
    placeIsao();
  }

  function updateIsao(dt) {
    if (!isao) return;
    // piloted: the queue waits, and so does everything else he does
    if (params.view === 'drone') { pilotIsao(dt); return; }
    isaoHeading = null;
    const speed = ISAO_CELLS_SEC * cellSide;   // radians per second
    if (isao.state === 'idle') {
      if (orders.length) {
        isao.order = orders[0];
        isao.state = 'travel';
      } else {
        // LOITER. He does not park: he drifts a couple of cells around the
        // heart, which is what makes him read as a machine on shift rather
        // than a prop bolted to the sky.
        const hd = norm3(graph.centers[dungeon.heart]);
        if (dot3(isao.dir, isao.loiter) > 0.99999 || dist3(isao.loiter, hd) < 1e-9) {
          const a = t * 0.37;
          const ref = Math.abs(hd[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
          const t1 = norm3(cross3(hd, ref));
          const t2 = cross3(hd, t1);
          const off = cellSide * 2.2;
          isao.loiter = norm3(add3(hd,
            add3(scale3(t1, Math.cos(a) * off), scale3(t2, Math.sin(a) * off))));
        }
        isao.dir = stepDir(isao.dir, isao.loiter, speed * 0.35 * dt);
      }
    }
    if (isao.state === 'travel' && isao.order) {
      const target = norm3(graph.centers[isao.order.ci]);
      isao.dir = stepDir(isao.dir, target, speed * dt);
      if (dot3(isao.dir, target) > 0.99995) {
        isao.state = 'build';
        isao.t = 0;
        isao.dur = buildSeconds(isao.order.cost);
        isao.shown = -1;
        if (isao.order.kind === 'tower') {
          // the print: the tower itself grows out of the wall top. Built
          // here rather than at order time so a queued site costs nothing
          // but a ring of points.
          const g = buildTowerLook(params.towerLook, isao.order.def);
          isao.order.ghost = g;
          scene.add(g);
        }
      }
    } else if (isao.state === 'build' && isao.order) {
      isao.t += dt;
      const k = Math.min(1, isao.t / isao.dur);
      const g = isao.order.ghost;
      if (g) {
        // same recipe as placeTowerObj, with the height easing up from
        // nothing — scale.y is the print head's progress
        const base = (g.userData.baseScale ?? 1) * cellSide * 0.62;
        g.scale.set(base, base * Math.max(0.02, k), base);
        const c = graph.centers[isao.order.ci];
        const nrm = graph.normals[isao.order.ci];
        const top = 1 + params.wallHeight;
        g.position.set(c[0] * top, c[1] * top, c[2] * top);
        tmpN.set(nrm[0], nrm[1], nrm[2]);
        g.quaternion.setFromUnitVectors(Y_AXIS, tmpN);
      }
      const step = Math.floor(k * 10);
      if (step !== isao.shown) { isao.shown = step; updateHud(); }
      if (isao.t >= isao.dur) finishOrder(isao.order);
    }
    if (!isao) return;
    const working = isao.state === 'build';
    // HIS FACE IS A STATUS LIGHT. Not a performance: four presets from the
    // lab, picked by what he is actually doing, plus a brief GLEE when a
    // print lands because that is the one moment worth a reaction. Nothing
    // here is on a timer of its own — the face follows the state machine,
    // which is what keeps it readable rather than busy.
    if (isao.obj.userData.setFace) {
      const enemiesNear = enemies.filter((e) => e.alive).length;
      isao.obj.userData.setFace(
        isao.gleeT > 0 ? 'glee'
          : enemiesNear >= 10 ? 'scared'
            : working ? 'determined'
              : isao.state === 'travel' ? 'focused'
                : 'scan');
      isao.obj.userData.tickFace(dt);
      if (isao.gleeT > 0) isao.gleeT -= dt;
    }
    // the print beam: ONE line object, rewritten in place. The effects rule
    // on this board is that activity must not add objects, and a beam that
    // exists for the whole build is exactly the thing that would.
    if (working) {
      const noz = isao.obj.userData.nozzle;
      const a = new THREE.Vector3();
      if (noz) noz.getWorldPosition(a); else a.copy(isao.obj.position);
      const c = graph.centers[isao.order.ci];
      const top = 1 + params.wallHeight;
      if (!printBeam) {
        printBeam = new THREE.Line(new THREE.BufferGeometry().setAttribute('position',
          new THREE.BufferAttribute(new Float32Array((PRINT_TRAIL + 2) * 3), 3)),
          new THREE.LineBasicMaterial({
            color: ISAO_TINT, transparent: true, opacity: 0.85,
            blending: THREE.AdditiveBlending, depthWrite: false,
          }));
        scene.add(printBeam);
      }
      // THE HEAD MOVES. A steady line from the nozzle to the middle of the
      // cell reads as a laser; a printer rasters, walks a perimeter, and
      // stops extruding while it travels. printpath.js owns those three
      // patterns and the cycle between them; this only lays them on the
      // cell's tangent plane. The trail is sampled BACKWARDS along the same
      // path rather than remembered, so it stays deterministic and costs no
      // state — and it is what makes a zigzag legible as a zigzag.
      // sized to THIS build, so even the shortest job shows all three
      const { pattern, u } = printPhase(isao.t, patternSecsFor(isao.dur));
      const nrm = graph.normals[isao.order.ci];
      const [t1, t2] = tangentBasis(nrm);
      const R = cellSide * 0.38;
      const bed = (uu) => {
        const [ox, oy] = printOffset(pattern, uu);
        return [0, 1, 2].map((i) =>
          c[i] * top + t1[i] * ox * R + t2[i] * oy * R);
      };
      const pa = printBeam.geometry.attributes.position;
      pa.setXYZ(0, a.x, a.y, a.z);            // the nozzle
      for (let k = 0; k <= PRINT_TRAIL; k++) {
        // clamped at 0 so a trail never wraps into the previous pattern
        const p = bed(Math.max(0, u - k * PRINT_TRAIL_STEP));
        pa.setXYZ(k + 1, p[0], p[1], p[2]);
      }
      pa.needsUpdate = true;
      // the gaps are the point: a nozzle that never stops extruding is a
      // laser again. Retractions at the raster turnarounds, and the whole
      // third pattern is travel moves.
      printBeam.visible = printOn(pattern, u);
      // a printer's flow is not steady; the flicker is deterministic
      printBeam.material.opacity = 0.55 + 0.35 * Math.abs(Math.sin(isao.t * 21));
    } else if (printBeam) printBeam.visible = false;
    isao.obj.userData.spinRotors(dt, working ? 1 : (isao.state === 'travel' ? 0.5 : 0));
    isao.obj.userData.setWork(working ? Math.min(1, isao.t * 3) : 0);
    placeIsao();
  }

  // The strike's version of losing a tower: no refund, and the wreck shows.
  // Selling is a decision; this is a consequence.
  function destroyTower(tower) {
    const c = graph.centers[tower.ci];
    const nrm = graph.normals[tower.ci];
    const burst = makeDotBurst(tower.def.color, nrm, 40);
    burst.scale.setScalar(cellSide * 1.1);
    burst.position.set(c[0] + nrm[0] * cellSide * 0.3, c[1] + nrm[1] * cellSide * 0.3,
      c[2] + nrm[2] * cellSide * 0.3);
    scene.add(burst);
    debris.push(burst);
    scene.remove(tower.obj);
    disposeObj(tower.obj);
    towers.splice(towers.indexOf(tower), 1);
    towerByCell.delete(tower.ci);
    towerCells.delete(tower.ci);
    if (watchTower === tower) watchTower = null;
  }

  function sellTower(tower) {
    eco.addBiomass(sellRefund(tower.spent));
    scene.remove(tower.obj);
    disposeObj(tower.obj);
    towers.splice(towers.indexOf(tower), 1);
    towerByCell.delete(tower.ci);
    towerCells.delete(tower.ci);
    if (watchTower === tower) watchTower = null;
    updateHud();
  }

  function upgradeTower(tower) {
    const cost = upgradeCost(tower.def, tower.tier);
    if (cost === null || !eco.spend(cost)) return false;
    tower.tier++;
    tower.spent += cost;
    // the pedestal IS the tier read: square -> hexagon -> circle
    if (tower.obj.userData.setTier) tower.obj.userData.setTier(tower.tier);
    placeTowerObj(tower); // a tier reads as bulk — derived from tier, not accumulated
    showRangeRing(tower.ci, effectiveStats(tower.def, tower.tier).range, tower.def.color, 1.4);
    updateHud();
    sfx.play('tower_upgrade');
    return true;
  }

  // dotted range ring on the surface — one reusable mesh, house style
  let rangeRing = null;
  let rangeRingTtl = 0;
  function showRangeRing(ci, radiusCells, color, ttl = 0) {
    hideRangeRing();
    const c = graph.centers[ci];
    const n = graph.normals[ci];
    const theta = radiusCells * cellSide; // arc angle on the unit sphere
    const ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const t1 = norm3(cross3(n, ref));
    const t2 = cross3(n, t1);
    const pos = [];
    const SEG = 72;
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * 2 * Math.PI;
      const dir = add3(scale3(t1, Math.cos(a)), scale3(t2, Math.sin(a)));
      const p = scale3(norm3(add3(scale3(norm3(c), Math.cos(theta)), scale3(dir, Math.sin(theta)))),
        1 + params.wallHeight * 0.7);
      pos.push(p[0], p[1], p[2]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    rangeRing = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 2.4, sizeAttenuation: false, color,
      transparent: true, opacity: 0.9,
    }));
    scene.add(rangeRing);
    rangeRingTtl = ttl; // 0 = sticky until hidden
  }
  function hideRangeRing() {
    if (!rangeRing) return;
    scene.remove(rangeRing);
    rangeRing.geometry.dispose();
    rangeRing.material.dispose();
    rangeRing = null;
  }

  // --- firing ------------------------------------------------------------
  const chord = (a, b) => dist3(a, b);
  // distance from the ACTIVE camera to a world point, for audio falloff.
  // Derived from the camera's world position rather than the player's --
  // in bastion view the two are far apart, and what you hear should
  // follow what you're looking through.
  const camDistV = new THREE.Vector3();
  function camDist(p) {
    camera.getWorldPosition(camDistV);
    return Math.hypot(camDistV.x - p[0], camDistV.y - p[1], camDistV.z - p[2]);
  }

  // How fast a head swings onto a new target, radians-ish per second of
  // easing. Slow enough that the traverse READS as the tower noticing you.
  const TRACK_RATE = 5.0;
  const TRACK_EVERY = 0.15;   // seconds between retargets; the ease covers it
  const aimV = new THREE.Vector3();

  // Point a directional head at what it is shooting. Only heads that HAVE a
  // direction get this, and whether one does is read off the geometry
  // (userData.headFacing) rather than a list someone has to remember to
  // update — an arm reaches along +X, an obelisk points nowhere.
  //
  // The bearing is derived FROM the render transform: put the target into the
  // tower group's own local space and take the yaw that aims +Z at it. No
  // sphere trigonometry, and therefore no sign convention to get wrong.
  function aimTower(tw, dt) {
    const head = tw.obj.userData.head;
    const facing = tw.obj.userData.headFacing;
    if (!head || !facing) return;
    tw.aimT = (tw.aimT ?? 0) - dt;
    if (tw.aimT <= 0) {
      tw.aimT = TRACK_EVERY;
      const eff = effectiveStats(tw.def, tw.tier);
      const target = pickTarget(graph.centers[tw.ci], eff.range * cellSide, enemies, chord);
      if (target) {
        aimV.set(target.pos[0], target.pos[1], target.pos[2]);
        tw.obj.worldToLocal(aimV);
        tw.aim = Math.atan2(aimV.x, aimV.z) - facing;
      }
    }
    if (tw.aim === undefined) return;
    // shortest way round, so a target crossing behind does not spin it 350deg
    let d = tw.aim - head.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    head.rotation.y += d * Math.min(1, TRACK_RATE * dt);
  }

  function stepTowers(dt, tNow) {
    for (const tw of towers) {
      // idle first, aim second: the idle sets rotation.y unconditionally, and
      // a tracking head must have the last word on where it looks
      if (tw.obj.userData.tick) tw.obj.userData.tick(tNow + tw.ci);
      aimTower(tw, dt);
      tw.cooldown -= dt;
      if (tw.cooldown > 0) continue;
      const eff = effectiveStats(tw.def, tw.tier);
      const range = eff.range * cellSide;
      const tp = graph.centers[tw.ci];
      let target = pickTarget(tp, range, enemies, chord);
      // the railgun does not shoot THROUGH walls: if the nearest pick is
      // occluded by high ground, take the nearest VISIBLE enemy instead
      if (target && tw.def.hitscan && !losClear(tw.ci, target.pos)) {
        target = null;
        let bd = Infinity;
        for (const e of enemies) {
          if (!e.alive) continue;
          const d = chord(tp, e.pos);
          if (d <= range && d < bd && losClear(tw.ci, e.pos)) { bd = d; target = e; }
        }
      }
      if (!target) continue;
      tw.cooldown = shotInterval(eff.rate);
      // one line, eight towers: the key IS the def key
      sfx.play(`tower_${tw.def.key}`, { dist: camDist(tp) });
      const n = graph.normals[tw.ci];
      const muzzle = add3(tp, scale3(n, cellSide * 0.55));
      const raw = sub3(target.pos, tp);
      const flat = norm3(sub3(raw, scale3(norm3(tp), dot3(raw, norm3(tp)))));
      const atk = tw.def.attack;
      if (tw.def.hitscan) {
        // THE SNIPER IS A HEAVY SHOT, not a beam. The beam pair read as a
        // laser (operator ruling), so now the damage still lands this frame
        // — a sniper does not miss — but what you SEE is one fat slug
        // crossing the whole line in ~0.13s, trailing ghosts, with the
        // impact fx landing when the slug does. Straight line, one round.
        damageEnemy(target, tNow, eff.dmg, true);
        const hitP = add3(target.pos, scale3(norm3(target.pos), cellSide * 0.3));
        spawnSlug(muzzle, hitP, tw.def.color, cellIndex(target.pos));
        warnRing(tw.ci, tw.def.color, 0.35, cellSide * 0.9); // muzzle pulse
      } else if (atk === 'beam') {
        // hitscan: damage now, draw the light
        damageEnemy(target, tNow, eff.dmg, true);
        spawnBeam(muzzle, add3(target.pos, scale3(norm3(target.pos), cellSide * 0.3)), tw.def.color);
      } else if (atk === 'slowfield') {
        // tether EVERY hostile in range: chip damage + the slow
        for (const e of enemies) {
          if (!e.alive || chord(tp, e.pos) > range) continue;
          damageEnemy(e, tNow, eff.dmg, true);
          if (e.alive) {
            e.slowFactor = eff.slowFactor;
            e.slowUntil = tNow + eff.slowDur;
            spawnLightning(muzzle, e.pos, tw.def.color, tNow);
            const spark = makeDotBurst(tw.def.color, norm3(e.pos), 12);
            spark.scale.setScalar(cellSide * 0.3);
            const spp = add3(e.pos, scale3(norm3(e.pos), cellSide * 0.2));
            spark.position.set(spp[0], spp[1], spp[2]);
            scene.add(spark);
            debris.push(spark);
          }
        }
      } else if (atk === 'spread') {
        for (let p = 0; p < eff.pellets; p++) {
          const ang = (p - (eff.pellets - 1) / 2) * 0.22;
          const cs = Math.cos(ang), sn = Math.sin(ang);
          const nn = norm3(tp);
          const nxd = cross3(nn, flat);
          const dir = norm3(add3(scale3(flat, cs), scale3(nxd, sn)));
          spawnTowerShot(muzzle, dir, tw, eff, null);
        }
      } else {
        spawnTowerShot(muzzle, flat, tw, eff, atk === 'homing' ? target : null,
          atk === 'mortar' ? chord(tp, target.pos) : 0);
      }
    }
  }

  // Line of sight for hitscan: sample the chord from the mast's cell to
  // the target every ~0.45 cells; any BLOCKED cell along it (other than
  // the tower's own — the mast stands ON high ground) refuses the shot.
  // Adjacent ridge cells block a shot along the ridge, which is correct:
  // that is what 'not through walls' means for a gun at wall height.
  function losClear(fromCi, toPos) {
    const a = graph.centers[fromCi];
    const steps = Math.max(2, Math.ceil(dist3(a, toPos) / (cellSide * 0.45)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const pmid = norm3([
        a[0] + (toPos[0] - a[0]) * t,
        a[1] + (toPos[1] - a[1]) * t,
        a[2] + (toPos[2] - a[2]) * t]);
      const ci = cellIndex(pmid);
      if (ci !== -1 && ci !== fromCi && dungeon.tags[ci] === BLOCKED) return false;
    }
    return true;
  }

  // HK's projectile identity: every shot is a TRACER — a bright additive
  // head dragging def.trail ghost points that dim toward the tail. Each
  // tracer is one small Points object (≤12 verts), rebuilt per shot.
  function makeTracer(color, px, trailN) {
    const n = trailN + 1;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const f = 1 - i / n; // head bright, tail fading to black (additive)
      col[i * 3] = c.r * f; col[i * 3 + 1] = c.g * f; col[i * 3 + 2] = c.b * f;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      size: px, sizeAttenuation: false, vertexColors: true,
      map: roundDot(), alphaTest: 0.3,
      transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
  }

  // A Points vertex is a SQUARE unless you tell it otherwise, and at 12px
  // (the mortar shell) the corners read. One shared radial-falloff sprite
  // rounds every tracer — built once, on first use.
  let roundDotTex = null;
  function roundDot() {
    if (roundDotTex) return roundDotTex;
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    roundDotTex = new THREE.CanvasTexture(c);
    return roundDotTex;
  }

  function spawnTowerShot(pos, dir, tw, eff, homing, arcTotal = 0) {
    const mesh = makeTracer(tw.def.color, tw.def.projPx ?? 5, tw.def.trail ?? 0);
    const p0 = norm3(pos);
    const lift0 = 1 + params.wallHeight * 0.5;
    const attr = mesh.geometry.getAttribute('position');
    for (let i = 0; i < attr.count; i++) {
      attr.setXYZ(i, p0[0] * lift0, p0[1] * lift0, p0[2] * lift0);
    }
    attr.needsUpdate = true;
    scene.add(mesh);
    // a lobbed shell knows where it will land before it leaves the tube —
    // the marker on that cell is most of the mortar's feel: threat you can
    // read, and step out of
    const landCi = arcTotal > 0
      ? cellIndex(norm3(add3(p0, scale3(dir, arcTotal)))) : -1;
    towerShots.push({
      pos: p0, dir, dist: 0, mesh,
      dmg: eff.dmg, splash: (eff.splash || 0) * cellSide, homing,
      range: eff.range * cellSide * 1.35,
      speed: (tw.def.projSpeed ?? 16) * cellSide, // per-tower tempo
      arcTotal, arcH: cellSide * 2.3, color: tw.def.color, // a lob, not a moonshot
      landCi, markT: 0, px: tw.def.projPx ?? 5,
    });
  }

  function killTowerShot(i) {
    scene.remove(towerShots[i].mesh);
    towerShots[i].mesh.geometry.dispose(); // per-shot tracer geometry
    towerShots[i].mesh.material.dispose();
    towerShots.splice(i, 1);
  }

  // splash detonation: tinted burst + damage to everything in the radius.
  // The show scales with the SPLASH, so a mortar shell that threatens two
  // cells looks like it — and the ground takes a shock ring, the same
  // language as the orbital strike one register down.
  function detonate(p, tNow) {
    for (const e2 of enemies) {
      if (e2.alive && chord(p.pos, e2.pos) <= p.splash) damageEnemy(e2, tNow, p.dmg, true);
    }
    const splashCells = p.splash / cellSide;
    const impactCi = cellIndex(p.pos);
    if (impactCi !== -1 && splashCells > 0.5) {
      warnRing(impactCi, p.color, 0.5, p.splash * 1.1);
    }
    const boom = makeDotBurst(p.color, norm3(p.pos), Math.round(42 + splashCells * 40));
    boom.scale.setScalar(cellSide * (1.1 + splashCells * 0.6));
    const bp = add3(p.pos, scale3(norm3(p.pos), cellSide * 0.2));
    boom.position.set(bp[0], bp[1], bp[2]);
    scene.add(boom);
    debris.push(boom);
  }

  function updateTowerShots(dt, tNow) {
    for (let i = towerShots.length - 1; i >= 0; i--) {
      const p = towerShots[i];
      const v = p.speed; // each tower's own tempo — HK's feel lives here
      // HOMING CHASES, per HokorobiTawaa: the velocity is steered toward the
      // live target's position every frame with a dt-scaled rate — the old
      // fixed 0.75/0.25 blend was frame-rate-DEPENDENT (limp at 30fps, stiff
      // at 120) and too soft to read as pursuit at any of them. k = 6/s is
      // HK's own constant: tight enough to whip round a fleeing phage,
      // loose enough that the curve is visible, which is the whole point.
      if (p.homing && p.homing.alive) {
        const raw = sub3(p.homing.pos, p.pos);
        const n0 = norm3(p.pos);
        const want = norm3(sub3(raw, scale3(n0, dot3(raw, n0))));
        const k = Math.min(1, 6 * dt);
        p.dir = norm3(add3(scale3(p.dir, 1 - k), scale3(want, k)));
      }
      p.pos = norm3(add3(p.pos, scale3(p.dir, v * dt)));
      const n = p.pos;
      p.dir = norm3(sub3(p.dir, scale3(n, dot3(p.dir, n))));
      p.dist += v * dt;
      // mortar lofts: a sine arc over its measured throw
      // BALLISTIC, not a sine hump. Warping the flight fraction (u^1.35)
      // pushes the apex past 60% of the flight and compresses the whole
      // descent into the remainder — the shell hangs, then PLUMMETS, which
      // is what heavy looks like. The old symmetric sine floated down as
      // gently as it rose.
      const u = p.arcTotal > 0 ? Math.min(1, p.dist / p.arcTotal) : 0;
      const uw = Math.pow(u, 1.35);   // (`v` is this scope's speed)
      const arc = p.arcTotal > 0 ? 4 * uw * (1 - uw) * p.arcH : 0;
      const lift = 1 + params.wallHeight * 0.5 + arc;
      // the shell SWELLS toward apex — nearer the top-down camera, and it
      // sells the height even from the chase cam
      if (p.arcTotal > 0) p.mesh.material.size = p.px * (1 + 1.1 * (arc / p.arcH));
      // the landing cell blinks while the shell is up: readable threat,
      // through the same pooled rings as everything else
      if (p.landCi >= 0) {
        p.markT -= dt;
        if (p.markT <= 0) {
          p.markT = 0.3;
          warnRing(p.landCi, p.color, 0.28, p.splash > 0 ? p.splash * 0.85 : cellSide);
        }
      }
      // tracer: ghosts shift back one slot, the head takes the new point
      const attr = p.mesh.geometry.getAttribute('position');
      for (let k = attr.count - 1; k > 0; k--) {
        attr.setXYZ(k, attr.getX(k - 1), attr.getY(k - 1), attr.getZ(k - 1));
      }
      attr.setXYZ(0, p.pos[0] * lift, p.pos[1] * lift, p.pos[2] * lift);
      attr.needsUpdate = true;
      // mortar detonates at the end of its arc, hit or not
      if (p.arcTotal > 0 && p.dist >= p.arcTotal) {
        detonate(p, tNow);
        killTowerShot(i);
        continue;
      }
      let hit = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (chord(p.pos, e.pos) < cellSide * Math.max(0.42, (e.size ?? e.spec.size) * 0.8)) {
          if (p.splash > 0) detonate(p, tNow);
          else {
            damageEnemy(e, tNow, p.dmg, true);
            // HK's hit spark, through the pooled rings — a strike that
            // lands should flash WHERE it landed, and an object per hit
            // would be churn the pool exists to avoid
            warnRing(cellIndex(e.pos), p.color, 0.22, cellSide * 0.55);
          }
          hit = true;
          break;
        }
      }
      if (hit || p.dist > p.range) killTowerShot(i);
    }
  }

  // beams: a thin bright segment that burns out fast — laser + slow tethers
  const beamGeo = new THREE.BoxGeometry(1, 1, 1);
  function spawnBeam(a, b, color, ttl = 0.16, width = 0.03) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(beamGeo, mat);
    const mid = scale3(add3(a, b), 0.5 * (1 + params.wallHeight * 0.5));
    mesh.position.set(mid[0], mid[1], mid[2]);
    const d = sub3(b, a);
    const len = len3(d);
    mesh.scale.set(cellSide * width, cellSide * width, Math.max(1e-6, len));
    tmpV.set(d[0], d[1], d[2]).normalize();
    mesh.quaternion.setFromUnitVectors(Z_AXIS, tmpV);
    scene.add(mesh);
    beams.push({ mesh, ttl, ttl0: ttl });
  }

  // lightning tether (slow field): a jagged additive polyline from the
  // tower head to the victim — HK's slow-tower identity. Jitter is a
  // pure function of segment index + time: deterministic, and it never
  // touches the gameplay rng stream.
  function spawnLightning(a, b, color, tNow) {
    const SEG = 7;
    const pos = new Float32Array((SEG + 1) * 3);
    const d = sub3(b, a);
    const nMid = norm3(scale3(add3(a, b), 0.5));
    let side = cross3(nMid, d);
    const sl = len3(side);
    side = sl > 1e-9 ? scale3(side, 1 / sl) : [0, 1, 0];
    const amp = len3(d) * 0.18;
    for (let i = 0; i <= SEG; i++) {
      const f = i / SEG;
      const jag = (i === 0 || i === SEG) ? 0
        : Math.sin(i * 12.9898 + tNow * 57.7) * amp * Math.sin(Math.PI * f);
      const base = add3(a, scale3(d, f));
      const lifted = scale3(base, 1 + params.wallHeight * 0.5);
      const pnt = add3(lifted, scale3(side, jag));
      pos[i * 3] = pnt[0]; pos[i * 3 + 1] = pnt[1]; pos[i * 3 + 2] = pnt[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(line);
    beams.push({ mesh: line, ttl: 0.32, ttl0: 0.32, dg: true });
  }

  // cosmetic railgun slugs: the hit already landed; the SHOT is what flies
  const slugFx = []; // { a, b, t, dur, mesh, color, ci }
  function spawnSlug(a, b, color, impactCi) {
    const mesh = makeTracer(0xffffff, 14, 6);
    scene.add(mesh);
    slugFx.push({ a, b, t: 0, dur: 0.13, mesh, color, ci: impactCi });
  }
  function stepSlugs(dt) {
    for (let i = slugFx.length - 1; i >= 0; i--) {
      const sl = slugFx[i];
      sl.t += dt;
      const f = Math.min(1, sl.t / sl.dur);
      const attr = sl.mesh.geometry.getAttribute('position');
      for (let k = 0; k < attr.count; k++) {
        const fk = Math.max(0, f - k * 0.045); // ghosts trail the head
        attr.setXYZ(k,
          sl.a[0] + (sl.b[0] - sl.a[0]) * fk,
          sl.a[1] + (sl.b[1] - sl.a[1]) * fk,
          sl.a[2] + (sl.b[2] - sl.a[2]) * fk);
      }
      attr.needsUpdate = true;
      if (f >= 1) {
        // arrival IS the impact: ring + spark land with the slug
        if (sl.ci !== -1) {
          warnRing(sl.ci, 0xffffff, 0.3, cellSide * 0.7);
          warnRing(sl.ci, sl.color, 0.35, cellSide * 0.5);
        }
        scene.remove(sl.mesh);
        sl.mesh.geometry.dispose();
        sl.mesh.material.dispose();
        slugFx.splice(i, 1);
      }
    }
  }

  function updateBeams(dt) {
    for (let i = beams.length - 1; i >= 0; i--) {
      beams[i].ttl -= dt;
      beams[i].mesh.material.opacity = Math.max(0, beams[i].ttl / (beams[i].ttl0 || 0.16)) * 0.9;
      if (beams[i].ttl <= 0) {
        scene.remove(beams[i].mesh);
        beams[i].mesh.material.dispose();
        if (beams[i].dg) beams[i].mesh.geometry.dispose(); // per-bolt geometry
        beams.splice(i, 1);
      }
    }
  }

  function clearTowers() {
    // the order book dies with the board, and so does its biomass: this is
    // a fresh run, not a refund
    for (const o of orders) {
      dropSiteRing(o);
      if (o.ghost) { scene.remove(o.ghost); disposeObj(o.ghost); }
    }
    orders.length = 0;
    orderByCell.clear();
    if (isao) {
      scene.remove(isao.obj);
      disposeObj(isao.obj);
      isao = null;
    }
    for (const tw of towers) { scene.remove(tw.obj); disposeObj(tw.obj); }
    towers.length = 0;
    towerByCell.clear();
    towerCells.clear();
    watchTower = null;
    for (let i = towerShots.length - 1; i >= 0; i--) killTowerShot(i);
    for (let i = beams.length - 1; i >= 0; i--) {
      scene.remove(beams[i].mesh);
      beams[i].mesh.material.dispose();
      beams.splice(i, 1);
    }
    hideRangeRing();
    closeShop();
  }

  // --- shop / upgrade panel (build mode, tap a cell) ----------------------
  // portal object factory — shared by creation and live re-shaping.
  // Orientation: upright (local +Y = surface normal) AND the gate's open
  // face turned down the lane — toward the open neighbor nearest the
  // Heart, where its creatures will march — never sideways into walls.
  // How long a gate takes to draw itself. Long enough to watch — a gate
  // appearing is the most consequential thing that happens on this board and
  // it used to take no time at all.
  const GATE_DIAL = 1.6;

  function buildPortalObj(ci, phase) {
    const obj = makePortalCloud({ body: 0xcfd8ff, hi: 0xffffff }, phase);
    // starts unformed; stepGates draws it in
    obj.userData.dial = 0;
    if (obj.userData.setForm) obj.userData.setForm(0);
    const r = cellSide * 0.7;
    obj.scale.setScalar(r);
    obj.userData.sizeScale = r;
    const c = graph.centers[ci];
    const n = graph.normals[ci];
    obj.position.set(c[0] + n[0] * r * 0.9, c[1] + n[1] * r * 0.9, c[2] + n[2] * r * 0.9);
    let face = null, bd = Infinity;
    for (const nb of graph.adj[ci]) {
      if (dungeon.tags[nb] === BLOCKED) continue;
      const d = dungeon.distToHeart[nb];
      if (d !== -1 && d < bd) { bd = d; face = nb; }
    }
    if (face !== null) {
      const fdir = tangentDirTo(ci, face);
      tmpObj.position.copy(obj.position);
      tmpObj.up.set(n[0], n[1], n[2]);
      tmpObj.lookAt(obj.position.x + fdir[0], obj.position.y + fdir[1], obj.position.z + fdir[2]);
      obj.quaternion.copy(tmpObj.quaternion); // gate axis (+Z) down the lane
    } else {
      tmpN.set(n[0], n[1], n[2]);
      obj.quaternion.setFromUnitVectors(Y_AXIS, tmpN);
    }
    return obj;
  }

  // BFS field to the nearest LIVE portal — the 'portal' directive's map.
  // Recomputed when portals rise or fall; null when none stand.
  function recomputePortalDist() {
    const seeds = spawnPoints.filter((sp) => sp.alive).map((sp) => sp.ci);
    portalDist = seeds.length
      ? bfsDist(graph.adj, seeds, (i) => dungeon.tags[i] !== BLOCKED)
      : null;
  }

  // sector-breach flash: a white full-screen pulse when the world opens
  const flashEl = document.createElement('div');
  flashEl.id = 'td-flash';
  root.appendChild(flashEl);

  const shopEl = document.createElement('div');
  shopEl.id = 'td-shop';
  shopEl.className = 'hidden';
  root.appendChild(shopEl);
  let shopCi = -1;
  let shopPos = null; // screen anchor, remembered across refreshes
  function closeShop() {
    root.classList.remove('shopping');
    shopEl.classList.add('hidden');
    shopCi = -1;
    shopPos = null;
    if (rangeRingTtl === 0) hideRangeRing();
  }
  function flashShopNote(text) {
    const note = shopEl.querySelector('.shop-note');
    if (note) note.textContent = text;
  }
  // RADIAL menu, HokorobiTawaa-style: options ring the tapped cell.
  // R follows HK's sizing (max(66, min(104, 0.3·viewport-min))); the
  // anchor clamps so the ring never leaves the screen.
  function openShop(ci, sx, sy) {
    root.classList.add('shopping');
    // The strike owns the board while it is armed, flying, or just landed.
    // The tap DISPATCH already tries to route around the shop, but a modal
    // that must never appear mid-ritual is guarded at its own door — every
    // future tap path inherits the rule instead of re-implementing it.
    if (strike.armed || strike.falling > 0 || shopMute > 0) return;
    // An unbuildable cell gets NOTHING, not a radial of greyed-out towers
    // with "blocked" in the middle. A modal whose every option is disabled
    // is a wall of no; silence reads as "not here" faster than any label.
    // (An existing tower still opens — that is upgrade/sell, not placement.)
    if (!towerByCell.get(ci) && placeError(ci)) { closeShop(); return; }
    shopCi = ci;
    if (sx == null && shopPos) [sx, sy] = shopPos;
    // measure the CONTAINER, not the canvas: hooks can open the shop
    // before the first resize(), when the canvas still has default size
    const rect = container.getBoundingClientRect();
    const R = Math.max(66, Math.min(104, Math.min(rect.width, rect.height) * 0.3));
    const cx = Math.min(Math.max(sx ?? rect.width / 2, R + 44), rect.width - R - 44);
    const cy = Math.min(Math.max(sy ?? rect.height / 2, R + 44), rect.height - R - 44);
    shopPos = [cx, cy];
    shopEl.style.left = cx + 'px';
    shopEl.style.top = cy + 'px';
    const existing = towerByCell.get(ci);
    const pending = orderByCell.get(ci);
    let center, items;
    if (pending) {
      // an ORDERED cell offers one thing: call it off. Nothing is printed
      // yet, so the biomass comes back whole — unless Isao is already
      // standing over it, and then half of it is in the nozzle.
      const live = orders[0] === pending && isao && isao.state === 'build';
      const back = live ? Math.round(pending.cost * 0.5) : pending.cost;
      const what = pending.kind === 'upgrade' ? `${pending.tower.def.key} +1` : pending.key;
      center = `<div class="radial-center">${what}<br>${live ? 'printing' : 'ordered'}</div>`;
      items = [
        { cls: 'shop-sell', txt: `cancel<br>+${back}kg`, cancel: true },
        { cls: 'shop-close', txt: '×' },
      ];
    } else if (existing) {
      const cost = upgradeCost(existing.def, existing.tier);
      center = `<div class="radial-center">${existing.def.key}<br>tier ${existing.tier}</div>`;
      items = [
        cost !== null
          ? { cls: 'shop-up', txt: `upgrade<br>${cost}kg`, dis: !eco.canAfford(cost) }
          : { cls: 'shop-up', txt: 'MAX', dis: true },
        { cls: 'shop-sell', txt: `sell<br>+${sellRefund(existing.spent)}kg` },
        { cls: 'shop-close', txt: '×' },
      ];
      showRangeRing(ci, effectiveStats(existing.def, existing.tier).range, existing.def.color, 0);
    } else {
      const err = placeError(ci);
      center = `<div class="radial-center">${err ? 'blocked' : eco.biomass + 'kg'}</div>`;
      const unlocked = new Set(unlockedTowerKeys(wave, hackedUnlocks));
      items = TOWERS.map((def) => {
        const locked = !unlocked.has(def.key);
        return {
          cls: locked ? 'shop-buy locked' : 'shop-buy',
          key: def.key,
          txt: locked
            ? `${def.key}<br>${towerUnlockWave(def.key) === null ? '&#8961; RELAY' : 'W' + towerUnlockWave(def.key)}`
            : `${def.key}<br>${def.cost}kg`,
          dis: locked || !!err || !eco.canAfford(def.cost),
          bc: '#' + def.color.toString(16).padStart(6, '0'),
        };
      });
      items.push({ cls: 'shop-close', txt: '×' });
    }
    const n = items.length;
    shopEl.innerHTML = center + items.map((it, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const x = (R * Math.cos(a)).toFixed(0);
      const y = (R * Math.sin(a)).toFixed(0);
      return `<button class="radial-item ${it.cls}"` +
        `${it.key ? ` data-key="${it.key}"` : ''}${it.cancel ? ' data-cancel="1"' : ''}` +
        `${it.dis ? ' disabled' : ''} ` +
        `style="left:${x}px;top:${y}px;${it.bc ? `border-color:${it.bc}aa;` : ''}">` +
        `${it.key ? `<i class="rk">${i + 1}</i>` : ''}${it.txt}</button>`;
    }).join('') + `<div class="shop-note" style="top:${R + 44}px">one new tower each wave</div>`;
    shopEl.classList.remove('hidden');
  }
  shopEl.addEventListener('click', (ev) => {
    const el = ev.target;
    if (!el.classList) return;
    if (el.classList.contains('shop-close')) { closeShop(); return; }
    const tower = towerByCell.get(shopCi);
    if (el.dataset && el.dataset.cancel) {
      cancelOrder(shopCi);
      closeShop();
      return;
    }
    if (el.classList.contains('shop-buy') && shopCi !== -1) {
      if (el.classList.contains('locked') || el.hasAttribute('disabled')) return;
      if (orderTower(el.dataset.key, shopCi)) closeShop();
    } else if (el.classList.contains('shop-up') && tower) {
      if (orderUpgrade(tower)) openShop(shopCi); // refresh
    } else if (el.classList.contains('shop-sell') && tower) {
      sellTower(tower);
      closeShop();
    }
  });
  // range preview while hovering a buy button
  shopEl.addEventListener('pointerover', (ev) => {
    const el = ev.target;
    if (el.classList && el.classList.contains('shop-buy') && shopCi !== -1) {
      const def = TOWER_BY_KEY[el.dataset.key];
      showRangeRing(shopCi, effectiveStats(def, 0).range, def.color, 0);
    }
  });

  // build-mode tap → cell (raycast the floor; a drag is an orbit, not a tap)
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  // The confirm for riding Isao. Not a modal — a modal for a camera change
  // is a bigger deal than a camera change. A toast with a live button, and
  // it times out and goes away like every other toast if you meant to tap
  // the ground behind him.
  function askDroneView() {
    showToast('<div class="wave-num">TAKE THE DRONE?</div>'
      + '<div class="wave-role">ride ISAO — he keeps working, you just watch</div>'
      + '<button class="toast-yes">&rsaquo; TAKE CONTROL</button>', 4000);
  }
  function cellAtScreen(x, y) {
    if (!floorMesh) return -1;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([wallMesh, floorMesh], false);
    if (!hits.length) return -1;
    const p = hits[0].point;
    return cellIndex([p.x, p.y, p.z]);
  }

  // THE PROGRAMME IS SPENT. Not a modal — it is an event on the board, not a
  // decision to make, and pausing for it would break a run that is going
  // well. What changes is that nothing more is coming: the gates standing
  // are the last of it.
  function programmeSpent() {
    sfx.play('boss_tension');
    showToast(`<div class="wave-num">THE WAVES ARE SPENT &middot; SECTOR ${round}</div>`
      + `<div class="wave-role">${params.wavesPerSector} sent, ${params.wavesPerSector} held. `
      + `nothing more is coming &mdash; close the gates and the sector is yours</div>`, 4200);
    updateHud();
  }

  // What this run put on the record, for the cards. Empty renders nothing —
  // a heading over no rows is worse than no heading.
  function runAchvBlock() {
    if (!runAchv.length) return '';
    return `<div class="rec rec-inline">`
      + runAchv.map((id) => {
        const a = achievement(id);
        return a ? `<div class="rec-row got"><span class="rec-mark">&#10022;</span>`
          + `<span class="rec-name">${a.name}</span>`
          + `<span class="rec-note">${a.note}</span></div>` : '';
      }).join('')
      + `</div>`;
  }

  // THE VICTORY LAP. Isao flies the sector you just cleared while you look at
  // what you built — the operator asked for it and it is the right shape: a
  // debrief that only shows numbers throws away the actual reward, which is
  // the board. The debrief is not dismissed, it is PARKED: the button comes
  // back so the sector can be advanced whenever you have had enough.
  let lapReturn = null;
  function startLap() {
    lapReturn = msgEl.innerHTML;
    msgEl.classList.add('hidden');
    paused = false;
    setView('drone');
    if (lapEl) lapEl.classList.remove('hidden');
  }
  function endLap() {
    if (lapEl) lapEl.classList.add('hidden');
    if (lapReturn === null) return;
    msgEl.innerHTML = lapReturn;
    lapReturn = null;
    msgEl.classList.remove('hidden');
    paused = true;
  }
  const lapEl = root.querySelector('#td-lap');
  if (lapEl) lapEl.addEventListener('click', endLap);

  function checkVictory() {
    if (player.won || tutorialActive) return; // the tutorial is failure/win-proof
    if (spawnPoints.length > 0 && spawnPoints.every((s) => !s.alive) && enemies.every((e) => !e.alive)) {
      player.won = true;
      sectorsCleared = round;
      run.sectorsCleared = sectorsCleared;
      run.sectorCleared = true;
      checkAchievements();
      if (round >= SECTORS_TOTAL) {
        run.planetCleared = true;
        checkAchievements();
        // THE PLANET. Every portal dead with the whole shell open — there is
        // no sector left to breach, which is the only reading of "the entire
        // map free" this world actually supports.
        try {
          const p2 = (parseInt(localStorage.getItem('td.planets') || '0', 10) || 0) + 1;
          localStorage.setItem('td.planets', String(p2));
        } catch (e) { /* private mode */ }
        persistBest();
        msgEl.innerHTML = `<div class="msg-head">transmission · final</div>`
          + `<div class="go-verdict best">OBJECT STÅLBERG-9 IS YOURS</div>`
          + `<div class="go-reason">every portal on the shell destroyed, all `
          + `${SECTORS_TOTAL} sectors open — there is nothing left to breach</div>`
          + `<div class="go-grid">`
          + `<span>SCORE <b>${fmt(score.points)}</b></span>`
          + `<span>${wave} waves · ${sectorsCleared} sectors</span>`
          + `<span>heart ${Math.max(0, heartHP)}/${HEART_MAX} · ${towers.length} towers standing</span>`
          + `<span>hulls left ${Math.max(0, playerHP)}/${PLAYER_MAX}</span>`
          + `</div>`
          + runAchvBlock()
          + `<button class="msg-lap">&#9673; walk the planet &mdash; fly it as ISAO</button>`
          + `<button class="msg-regen">&#10226; another planet</button>`;
      } else {
        // THE DEBRIEF. Dismissed by hand, never on a timer: the operator
        // cleared a hard sector and the game moved on before they had
        // registered winning it. Nothing advances until a button is pressed.
        msgEl.innerHTML = `<div class="msg-head">transmission · sector cleared</div>`
          + `<div class="go-verdict">SECTOR ${round} OF ${SECTORS_TOTAL} IS YOURS</div>`
          + `<div class="go-reason">every gate broken &middot; `
          + `${sectorWave()} of ${params.wavesPerSector} waves fought`
          + `${programmeDone() ? ' &mdash; you held the whole programme'
            : ' &mdash; you ended it early, and left biomass in the field'}</div>`
          + `<div class="go-grid">`
          + `<span>SCORE <b>${fmt(score.points)}</b> · best ${fmt(score.best)}</span>`
          + `<span>heart <b>${Math.max(0, heartHP)}</b>/${HEART_MAX} · hulls ${Math.max(0, playerHP)}/${PLAYER_MAX}</span>`
          + `<span>${towers.length} towers standing · ${eco.biomass}kg in hand</span>`
          + `<span>rank ${tankRank > 0 ? rankLabel(tankRank) : 'unranked'} · ${tankKills} hands-on</span>`
          + `</div>`
          + runAchvBlock()
          + `<button class="msg-lap">&#9673; walk the sector &mdash; fly it as ISAO</button>`
          + `<button class="msg-next">&rsaquo; breach sector ${round + 1} — bigger, farther, meaner</button>`;
      }
      msgEl.classList.remove('hidden');
    }
  }

  // sector expansion (HokorobiTawaa's fraying): FLASH WHITE, unseal the
  // next band of the SAME world, re-seed pickups into the new ground,
  // raise fresh portals farther out. Towers and biomass persist.
  function expandRound() {
    flashEl.classList.remove('on');
    void flashEl.offsetWidth; // restart the animation
    flashEl.classList.add('on');
    const beforeTags = dungeon.tags.slice();
    applySector();
    // the freshly-opened band: sealed before, floor now
    revealCells = [];
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (beforeTags[i] === BLOCKED && dungeon.tags[i] !== BLOCKED) {
        revealCells.push(i);
        const c = graph.centers[i];
        cx += c[0]; cy += c[1]; cz += c[2];
      }
    }
    revealDir = revealCells.length ? norm3([cx, cy, cz]) : norm3(graph.normals[dungeon.heart]);
    startShot({
      id: 'reveal',
      dur: REVEAL_LEN,
      poseAt: (u, out) => {
        // whole planet in frame, the new band centred — framing unchanged
        const ref = Math.abs(revealDir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        const up = norm3(cross3(revealDir, ref));
        const eye = scale3(revealDir, 3.3);
        out.pos.set(eye[0], eye[1], eye[2]);
        tmpCam.position.copy(out.pos);
        tmpCam.up.set(up[0], up[1], up[2]);
        tmpCam.lookAt(0, 0, 0);
        out.quat.copy(tmpCam.quaternion);
      },
      onEnd: () => {
        // the new ground cools back to its true colors; planning begins
        for (const ci of revealCells) paintCell(ci, floorColorOf(ci));
        revealCells = [];
        if (!buildMode) setView('orbit');
        updateHud();
      },
    });
    buildGeometry();
    syncServerLift();
    // THE SAFETY NET. Breach persistence keeps corridors open, but a tank
    // parked on a later-band lane it reached THROUGH a breach can still
    // have the band gate reseal the ground under it — walls closing over
    // the hull (operator bug report). If the shift entombed the tank,
    // redeploy it beside the heart and say so.
    if (player.cur >= 0 && dungeon.tags[player.cur] === BLOCKED && !playerDown) {
      deployStart(berthIndexFor(playerHP));
      showToast(`<div class="wave-num">REDEPLOYED</div>`
        + `<div class="wave-role">the frontier shifted over your position</div>`, 3000);
    }
    // burn the new ground hot — repainted to its true colors when the
    // beat ends (see animate)
    for (const ci of revealCells) paintCell(ci, [1.0, 0.68, 0.16]);
    spawnOrbs();
    spawnRewards();
    seedPortals(2); // fresh neutral gates in the new band
    // the new sector's budget arrives with its gates; unspent strikes carry —
    // hoarding one for the next sector is a legitimate play
    grantStrikes(strike, spawnPoints.filter((sp2) => sp2.alive).length, strikeTune);
    recomputePortalDist();
    waveActive = false; interClock = 0;
    player.won = false;
    paused = false;
    msgEl.classList.add('hidden');
    waveEl.style.borderColor = '#ffffff';
    waveEl.style.color = '#ffffff';
    waveEl.innerHTML = `<div class="wave-num">SECTOR ${round}</div>` +
      `<div class="wave-name">THE WORLD GROWS</div>` +
      `<div class="wave-role">new ground · new portals · your towers hold</div>`;
    waveEl.classList.remove('hidden');
    clearTimeout(waveTimer);
    waveTimer = setTimeout(() => waveEl.classList.add('hidden'), 3200);
    updateHud();
  }

  // --- dashboard -----------------------------------------------------------
  const gui = new GUI({ title: 'TD', container: root });
  // hero + portal styling swap IN PLACE — cosmetics never reset a run
  gui.add(params, 'creature', UNIT_NAMES).onChange(() => {
    applyCreature();
  });
  gui.add(params, 'look', LOOK_NAMES).onChange(applyLook);
  gui.add(params, 'wallTops', ['auto', 'bright', 'dim', 'black'])
    .name('wall tops').onChange(applyLook);
  const viewCtrl = gui.add(params, 'view', ['pov', 'third', 'orbit', 'drone'])
    .name('camera (V)').onChange((v) => setView(v));
  const speedCtrl = gui.add(params, 'speed', 0.2, 4, 0.1).name('wander speed');
  const directiveCtrl = gui.add(params, 'directive', DIRECTIVES).name('auto directive').onChange(syncDirectiveChip);
  gui.add(params, 'recoil', 0, 8, 0.1).name('shell recoil');
  gui.add(params, 'callouts').name('callout messages').onChange(syncCalloutMode);
  gui.add(params, 'heartLook', Object.keys(HEART_LOOKS)).name('stalheart')
    .onFinishChange(() => { buildActors(); placeActors(); });
  gui.add(params, 'waveSize', 1, 6, 1).name('wave size').onFinishChange(regenerate);
  gui.add(params, 'wavesPerSector', 5, 40, 1).name('waves per sector');
  gui.add(params, 'waveGap', 3, 20, 1).name('wave gap (s)');
  gui.add(params, 'waveCap', 15, 60, 1).name('wave cap (s)');
  gui.add(params, 'obstacles', 0.05, 0.4, 0.05).onFinishChange(regenerate);
  gui.add(params, 'rewards', 0, 12, 1).onFinishChange(regenerate);
  gui.add(params, 'orbs', 0, 40, 1).name('missile triads').onFinishChange(regenerate);
  gui.add(params, 'orbRespawn', 0, 30, 1).name('triad respawn (s)');
  const seedCtrl = gui.add(params, 'seed', 0, 99999, 1).onFinishChange(regenerate);
  const pointsCtrl = gui.add(params, 'points', 150, 8000, 50).name('sample points').onFinishChange(regenerate);
  gui.add(params, 'rooms', 2, 24, 1).onFinishChange(regenerate);
  gui.add(params, 'roomRadius', 1, 8, 1).name('room radius').onFinishChange(regenerate);
  gui.add(params, 'corridorWidth', 1, 4, 1).name('corridor width').onFinishChange(regenerate);
  gui.add(params, 'extraCorridors', 0, 5, 1).name('extra corridors').onFinishChange(regenerate);
  gui.add(params, 'wallHeight', 0.02, 0.15, 0.005).name('wall height').onFinishChange(regenerate);
  gui.add(params, 'relaxIters', 0, 200, 10).name('relax iters').onFinishChange(regenerate);
  gui.add(params, 'randomize').name('🎲 random seed');
  gui.add(params, 'regenerate').name('↻ regenerate');
  gui.add(params, 'previewDestruction').name('💥 destroy tank (preview)');

  const towerLookCtrl = gui.add(params, 'towerLook', TOWER_LOOK_NAMES)
    .name('tower look').onChange(applyTowerLook);
  gui.add(params, 'font', FONT_NAMES).name('message font').onChange((n) => {
    applyFontPack(n, document.documentElement, TYPE);
    try { localStorage.setItem('ssg-font', n); } catch (e) { /* private mode */ }
  });
  // The type KNOBS live on the units tab's fonts bench, not here. Two GUIs
  // over two copies of the same values is the drift this repo has already
  // paid for once (the hover params vs the viewer's defaults), and the
  // operator's actual complaint was that tuning type mid-game is
  // impossible — a shout lives 1.2 seconds. This tab keeps the face
  // switch, which is a glance, and hands the sliders to the bench.
  // Guessed wrong twice by eye, so they are dialled by hand — but the folder
  // is GENERATED from the shared schema and writes to the shared object. The
  // unit viewer's tuning modal is built from the same list over the same
  // values, so a setting found on the bench is already in force here.
  loadFeel();   // whatever was dialled in the viewer is already in force
  const feelFolders = new Map();
  for (const k of TANK_FEEL_KNOBS) {
    if (!feelFolders.has(k.group)) {
      const f = gui.addFolder(k.group);
      f.close();
      feelFolders.set(k.group, f);
    }
    feelFolders.get(k.group).add(FEEL, k.key, k.min, k.max, k.step)
      .name(k.label).onFinishChange(saveFeel);
  }

  // strike knobs share the schema machinery with the feel folders
  const strikeF = gui.addFolder('orbital strike');
  for (const k of STRIKE_KNOBS) {
    if (k.bool) strikeF.add(strikeTune, k.key).name(k.label);
    else strikeF.add(strikeTune, k.key, k.min, k.max, k.step).name(k.label);
  }
  strikeF.close();

  // THE PLUME, by eye. Colour and reach are the rank's and are not touchable
  // here; the SHAPE of the flame is taste, and taste is judged with the
  // controls in hand rather than reasoned from a number.
  const plasmaF = gui.addFolder('plasma');
  plasmaF.add(PLASMA, 'coreFrac', 0, 1, 0.01).name('hot root length');
  plasmaF.add(PLASMA, 'dots').name('dots on');
  plasmaF.add(PLASMA, 'plumeLen', 0, 1, 0.01).name('dots length (x beam)');
  plasmaF.add(PLASMA, 'plumeWidth', 0, 5, 0.05).name('dots width (x beam)');
  plasmaF.add(PLASMA, 'coreRoot', 0.05, 1, 0.01).name('width at muzzle');
  plasmaF.add(PLASMA, 'squash', 0, 1.5, 0.05).name('vertical squash');
  plasmaF.add(PLASMA, 'flow', 0, 6, 0.05).name('flow speed');
  plasmaF.add(PLASMA, 'bias', 0.5, 3, 0.05).name('root density');
  plasmaF.add(PLASMA, 'twist', 0, 24, 0.5).name('corkscrew');
  plasmaF.add(PLASMA, 'size', 1, 8, 0.1).name('dot size').onChange((v) => {
    if (plasma) for (const pl of plasma) pl.pts.material.size = v;
  });
  plasmaF.close();

  const bloomF = gui.addFolder('bloom');
  bloomF.add(postfx.params, 'enabled').name('enabled').onChange((v) => postfx.setEnabled(v));
  bloomF.add(postfx.params, 'strength', 0, 3, 0.05).onChange((v) => postfx.setParams({ strength: v }));
  bloomF.add(postfx.params, 'radius', 0, 1, 0.01).onChange((v) => postfx.setParams({ radius: v }));
  bloomF.add(postfx.params, 'threshold', 0, 1, 0.01).onChange((v) => postfx.setParams({ threshold: v }));

  // per-group glow. These are AMOUNTS, not brightness: the map can stay a
  // bright cyan wireframe while barely blooming at all.
  const weightsF = bloomF.addFolder('weights');
  for (const g of BLOOM_GROUPS) {
    weightsF.add(postfx.weights, g, 0, 3, 0.05).name(g);
  }
  // a tuning session must survive a reload
  const BW_KEY = 'ssg.td.bloomWeights';
  try {
    const savedW = JSON.parse(localStorage.getItem(BW_KEY) || 'null');
    if (savedW && typeof savedW === 'object') {
      for (const g of BLOOM_GROUPS) {
        if (typeof savedW[g] === 'number') postfx.weights[g] = savedW[g];
      }
      weightsF.controllers.forEach((c) => c.updateDisplay());
    }
  } catch { /* private mode or corrupt value — defaults are fine */ }
  weightsF.onChange(() => {
    try { localStorage.setItem(BW_KEY, JSON.stringify(postfx.weights)); } catch { /* ignore */ }
  });

  // sound. The encode is peak-normalized and the manifest carries each
  // sound's trim gain, so these are the coarse balance -- and the tuning
  // surface, since the levels shipped were derived from durations and
  // fire rates rather than heard.
  const soundF = gui.addFolder('sound');
  const soundState = { ...sfx.levels, mute: sfx.muted };
  soundF.add(soundState, 'master', 0, 1, 0.01).onChange((v) => sfx.setMaster(v));
  soundF.add(soundState, 'towers', 0, 1, 0.01).onChange((v) => sfx.setBus('towers', v));
  soundF.add(soundState, 'tank', 0, 1, 0.01).onChange((v) => sfx.setBus('tank', v));
  soundF.add(soundState, 'enemies', 0, 1, 0.01).onChange((v) => sfx.setBus('enemies', v));
  soundF.add(soundState, 'ui', 0, 1, 0.01).onChange((v) => sfx.setBus('ui', v));
  const muteCtrl = soundF.add(soundState, 'mute').onChange((v) => { sfx.setMute(v); syncSoundChip(); });

  // the pad button and the panel toggle are one state, two surfaces
  const soundBtn = root.querySelector('#td-pad-sound');
  function syncSoundChip() {
    if (soundBtn) {
      soundBtn.textContent = sfx.muted ? '\u{1F507}' : '\u{1F50A}';
      soundBtn.classList.toggle('on', !sfx.muted);
    }
  }
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      sfx.setMute(!sfx.muted);
      soundState.mute = sfx.muted;
      muteCtrl.updateDisplay();
      syncSoundChip();
    });
  }
  syncSoundChip();

  // phones: start with the panel folded so the maze isn't buried
  if (matchMedia('(pointer: coarse), (max-width: 700px)').matches) gui.close();

  // --- render loop: PoV + minimap inset ------------------------------------
  const mapBg = new THREE.Color(0x080a10);
  let t = 0;
  let lastFrame = performance.now();
  // --- engine: hydraulics up, thruster bed, hydraulics down ---------------
  // Three sounds, not one. A single looping sample gave starting and
  // stopping no weight at all; the hydraulics do that work and the thruster
  // just carries the middle.
  //
  // Speed comes from the ACTUAL per-frame position delta rather than from
  // the drive inputs. One site then covers manual driving, auto navigation,
  // and the handoff eased through virtualStart -- and it follows the house
  // rule of deriving render-coupled values from the render state instead of
  // re-deriving them with a second set of conventions.
  let engineHandle = null;
  let enginePrev = null;    // last frame's position
  let engineLevel = 0;      // smoothed 0..1
  let engineIdle = 0;       // s since the tank last moved
  let engineRunning = false; // has the spool-up played and not been undone?
  // short: the hydraulics-down cue should answer the STOP, not trail it
  const ENGINE_STOP = 0.10;  // s of stillness before the bed fades out


  function stopEngine(fade = ENGINE_STOP, quiet = false) {
    if (engineHandle) engineHandle.stop(fade);
    engineHandle = null;
    engineLevel = 0;
    // the rock belongs to SETTING DOWN, not to leaving the tab
    if (engineRunning && !quiet) { sfx.play('tank_spool_down'); landTankFeel(feel); }
    engineRunning = false;
  }

  function updateEngine(dt) {
    if (!playerMesh || dt <= 0) return;
    const p = player.pos;
    if (!enginePrev) { enginePrev = p.slice(); return; }

    // cells/s, normalized against the fastest the tank can legally go
    const moved = dist3(p, enginePrev);
    enginePrev = p.slice();
    const cellsPerSec = moved / dt / cellSide;
    const top = Math.max(0.001, params.speed * speedBonus * 1.6 * 1.45); // cruise+boost
    const target = Math.min(1, cellsPerSec / top);

    // asymmetric smoothing: spin up fast, spool down slow, like an engine
    const k = target > engineLevel ? 6 : 2.5;
    engineLevel += (target - engineLevel) * Math.min(1, k * dt);

    const moving = engineLevel > 0.03 && !paused && !player.won;
    engineIdle = moving ? 0 : engineIdle + dt;

    // slow both ways: an engine SPOOLS. Rising a touch slower than it falls
    // reads as taking up load, then setting the weight back down.
    stepTankFeel(feel, dt, engineRunning, FEEL);

    if (moving && !engineRunning) {
      sfx.play('tank_spool_up'); // hydraulics lift it off the deck
      engineRunning = true;
    }
    // RETRY every frame while moving: sfx.loop returns null until the buffer
    // has decoded, and latching a failed handle is what silenced this bed
    // for whole sessions.
    if (moving && !engineHandle) {
      engineHandle = sfx.loop('tank_thruster', { gain: 0.001, rate: 0.92 });
    }
    if (!moving && engineIdle >= ENGINE_STOP) {
      stopEngine();
    } else if (engineHandle) {
      // gain is nearly linear in level; pitch spans 0.92..1.14 so the bed is
      // felt as effort rather than heard as a repeating clip
      // floor raised from 0.18: the bed was inaudible at a crawl, so it only
      // registered at full speed — which read as "the thruster isn't there"
      engineHandle.set(0.34 + 0.66 * engineLevel, 0.92 + 0.22 * engineLevel);
    }
  }

  function animate() {
    // SIM rides TIMERS, not rAF: under a virtual-time budget the timer
    // queue runs at full speed while BeginFrames are rationed (the same
    // trap every probe in this file documents — used on purpose for once),
    // and in a real browser setTimeout(0) still outruns vsync ~4x.
    if (simFast > 1 && !simDone) setTimeout(animate, 0);
    else requestAnimationFrame(animate);
    if (!active || !mesh) return;
    // active play = no modal up: briefing, pause, and win/lose all count
    // as idle, which is when the mobile chrome (menu button) may return
    const playing = !paused && !player.won;
    if (playing !== wasPlaying) {
      wasPlaying = playing;
      document.body.classList.toggle('playing', playing);
    }
    const now = performance.now();
    const dt = Math.min((now - lastFrame) / 1000, 0.1); // clamp tab-switch gaps
    updateEngine(dt);
    lastFrame = now;
    // SIM fast-forward: K fixed-dt update passes per painted frame, and
    // only every 4th frame paints at all — the sim math is cheap, the
    // paint is not. Fixed 1/30 steps keep collision/touch checks honest
    // (one huge dt would tunnel enemies through everything).
    if (simFast > 1 && !simDone) {
      simFrameNo++;
      // every 30th frame: the PiP view is a courtesy, and under software
      // GL a paint costs more than a hundred sim steps
      const draw = simFrameNo % 30 === 0;
      for (let i = 0; i < simFast; i++) frame(1 / 30, !(draw && i === simFast - 1));
      simWatch();
      return;
    }
    frame(dt, false);
  }

  let simFrameNo = 0;
  // the whole former animate() body: dt-driven update + (skippable) render
  function frame(dt, simSkip) {
    // paused: keep presenting the frozen frame (both views), zero sim.
    // lastFrame keeps updating above so resume has no dt spike.
    if (paused) {
      if (!simSkip) {
        playerMesh.visible = params.view !== 'pov';
        postfx.render();
        playerMesh.visible = true;
        drawRadar(t);   // the sweep keeps turning; a dead scope reads as a crash
      }
      return;
    }
    t += dt;

    // BUILD downtime: with the field clear, build mode freezes the WAR —
    // wave clock, motion, combat — while ambient life (portal twinkle,
    // heart moods, debris) and the camera transition keep breathing.
    // Mid-assault the same toggle is camera-only.
    stepBriefClock(dt);
    stepShot(dt);
    // ANY control input thaws the frozen tutorial opening — checked BEFORE
    // the frozen gate, since updateLasers itself is skipped while frozen.
    //
    // It used to be the LASER key alone, which is the one control the
    // opening does not ask for: the banner says "RAM THEM · drive straight
    // through them" and the throttle is pulsing. So a player who did exactly
    // what they were told pressed W, got nothing back, and read the game as
    // broken for the five or ten seconds it took to try something else
    // (operator, 2026-08-31). The hold is there to give the lane time to
    // matter, not to make the tank feel dead — so the moment a hand touches
    // anything, it is over.
    const handOn = keys.laser || keys.fast || keys.slow || keys.left || keys.right
      || throttle !== 0;
    if (tutorial.frozen && (handOn || cruise)) { tutorial.frozen = false; hideTutBanner(); }
    const frozen = buildFrozen() || shotActive() || tutorial.frozen;
    // The BUILD pause holds the WORLD still, not the DRIVER. Planning with
    // the tank parked where the last wave left it meant switching out of
    // build, repositioning, and switching back — three actions for one
    // intention. A reveal or a tutorial hold still stops everything, because
    // those are the game speaking and it should not be driven over.
    // the cold open holds the hull for its first two beats and lets go for
    // the third — beat three IS the tank driving itself out of the berth
    // DEPLOY drives THROUGH a shot — that is how the cinematic's last frame
    // and DEPLOY's first frame meet — so the gate only stops free driving
    const driveFrozen = shotActive() || tutorial.frozen;

    bumpLeft = Math.max(0, bumpLeft - dt);
    recoilLeft = Math.max(0, recoilLeft - dt);
    cannonHeat = Math.max(0, cannonHeat - dt);
    // diegetic cannon gauge: the mid-barrel sleeve glows with the heat
    const sleeve = playerMesh && playerMesh.userData.heatSleeve;
    if (sleeve) sleeve.material.color.lerpColors(sleeveCool, sleeveHot, cannonHeat / CANNON_COOL);
    // THE SHOP IS NOT A DRIVING AID. It is screen-anchored to a cell, so the
    // moment the tank moves it is pointing at the wrong place — and a radial
    // over the fight is a radial you shoot through (operator, twice). Any
    // hand on the wheel closes it, same rule as the tutorial's opening hold.
    if (shopCi !== -1 && (keys.fast || keys.slow || keys.left || keys.right
      || cruise || throttle !== 0 || keys.fire || keys.laser)) closeShop();
    if (deploy) deployStep(dt);
    else if (!driveFrozen) advanceMotion(dt);
    ctlWatch(dt);
    // Isao keeps his shift through the build downtime — the war may be
    // frozen there, but construction is the thing you came to do. A
    // reveal or the cold open still stops him: those are the game
    // speaking, and nothing should be printing over the top of it.
    if (!frozen) updateIsao(dt);
    for (const orb of orbMeshes.values()) orb.userData.tick(t);
    for (let i = debris.length - 1; i >= 0; i--) {
      if (!debris[i].userData.tick(dt)) {
        scene.remove(debris[i]);
        debris[i].geometry.dispose();
        debris.splice(i, 1);
      }
    }
    if (!player.won && !frozen && !tutorialActive) {
      // An armed wave always gets its full lead-in, whoever asked for it.
      // This used to live inside the between-waves branch, so the stall
      // safety below — which fires while a wave is STILL live — spawned with
      // no charge, no rings and no sound at all. Later rounds hit that path
      // more and more often as waves take longer to clear, which is exactly
      // what "the cues drift in later rounds" looks like from the outside.
      // the orbital window fills in game time, like everything else here
      if (stepStrike(strike, dt, strikeTune) === 'armed') {
        sfx.play('tower_upgrade');
        showToast('<div class="wave-num">ORBITAL ASSET ARMED</div>'
          + '<div class="wave-role">☄ ready — arm, paint, launch</div>', 2200);
      }
      if (waveIn >= 0) {
        waveIn -= dt;
        waveCharge = Math.max(0, Math.min(1, 1 - waveIn / WAVE_WARN));
        warnBeat -= dt;
        if (warnBeat <= 0) {
          // beats accelerate from ~0.7s apart to ~0.18s: the cadence IS
          // the countdown, and it is legible without reading anything
          warnBeat = 0.72 - 0.54 * waveCharge;
          for (const sp of spawnPoints) {
            if (sp.alive) warnRing(sp.ci, CREATURE_TINTS[sp.type] ?? 0xffffff,
              0.55, cellSide * (1.6 + 1.4 * waveCharge));
          }
        }
        if (waveIn <= 0) { waveIn = -1; spawnWave(); }
      }
      if (waveActive) {
        waveAge += dt;
        if (!spawnQueue.length && enemies.every((e) => !e.alive)) {
          waveActive = false; interClock = 0; waveCharge = 0;
          score.addWave(wave); persistBest();
          if (simStyle) {
            simCurve.push({ w: wave, t: Math.round(t), heart: heartHP,
              biomass: eco.biomass, towers: towers.length, score: score.points });
          }
          if (tutorialActive) {
            showToast(`<div class="wave-num">WAVE ${wave} CLEARED</div>` +
              `<div class="wave-role">brace — the next wave is coming</div>`, 2200);
          } else if (sectorWave() === params.wavesPerSector) {
            // the HOLD is over: the gates lose their seals and the sector
            // becomes a hunt. This is the loudest beat in a sector and it
            // gets the loudest card the toast layer has.
            programmeSpent();
            showBrief('gates');
          } else showSitrep(); // the recap IS the cleared card now
        } else if (waveAge >= params.waveCap && spawnPoints.some((s) => s.alive)) {
          armWave(); // safety: the field is stalled — but it still announces
        }
      } else if (spawnPoints.some((s) => s.alive)) {
        interClock += dt;
        // arm early enough that the countdown consumes the last WAVE_WARN of
        // the gap — the total wait from cleared to spawned is unchanged
        const gap = params.waveGap * (wave < 2 ? 1.6 : 1); // breathe early
        if (interClock >= gap - WAVE_WARN) armWave();
      } else if (waveIn < 0) {
        waveCharge = 0;
      }
      // the boss omen: brass from the moment the remaining lead crosses 10s.
      // From a cleared field the whole lead is waveGap (armWave overlaps
      // it), so at the default 7s gap the omen owns the entire pre-boss
      // window; a stall-forced wave still cues off its 3s telegraph.
      if (!bossCued && wave + 1 === BOSS_WAVE && !buildFrozen()) {
        const left = waveIn >= 0 ? waveIn
          : (waveActive ? Infinity : params.waveGap - interClock);
        if (left <= 10) { bossCued = true; sfx.play('boss_tension'); }
      }
    }
    if (tutorialActive) tutorial.tick(dt);
    if (!frozen) {
      updateEnemies(dt, t);
      checkRewards();
      updateProjectiles(dt, t);
      updateLasers(dt, t);
      stepTowers(dt, t);
      updateTowerShots(dt, t);
    }
    updateBeams(dt); // fx fade even during downtime
    stepSlugs(dt);
    if (rangeRingTtl > 0) {
      rangeRingTtl -= dt;
      if (rangeRingTtl <= 0) { rangeRingTtl = 0; hideRangeRing(); }
    }
    if (strikeGrace > 0) strikeGrace -= dt;
    if (shopMute > 0) shopMute -= dt;
    if (heartCalloutCd > 0) heartCalloutCd -= dt;
    if (shieldT > 0) { shieldT -= dt; if (shieldT <= 0) updateHud(); }
    if (rs) {
      rs.binClock += dt;
      if (rs.binClock >= 5) { rs.binClock = 0; rs.scoreBins.push(score.points); }
    }
    if (!serverFound && serverCi >= 0 && !playerDown
        && dist3(player.pos, graph.centers[serverCi]) < cellSide * 4) {
      serverFound = true;
      showToast(`<div class="wave-num">SERVER FOUND</div>`
        + `<div class="wave-role">an antipode relay — HACK it for tower firmware</div>`, 3400);
      syncHackBtn();
    }
    // standing at the relay, the game says WHAT TO PRESS — the rail
    // button alone was invisible to a player looking at the machine
    if (hackPromptEl && !simSkip) {
      const near = hackPromptForce || (serverFound && !hackedRound && serverCi >= 0
        && (!hackWrapEl || hackWrapEl.classList.contains('hidden'))
        && dist3(player.pos, graph.centers[serverCi]) < cellSide * 4.5);
      hackPromptEl.classList.toggle('hidden', !near);
    }
    if (ramComboT > 0) {
      ramComboT -= dt;
      if (ramComboT <= 0) { ramCombo = 0; syncCombo(); }
    }
    {
      const impactCi = stepFall(strike, dt);
      if (impactCi >= 0) {
        if (rs) rs.strikes++;
        executeStrike(impactCi, t);
        snapCamera();
        // the skip-tap and the impact race; the loser must not buy a tower
        shopMute = 0.8;
      }
      if (!simSkip) syncStrikeFeed();
    }
    if (!simSkip && armBtn) syncArmUi();
    stepWarnFx(dt);
    for (const sp of spawnPoints) {
      if (!sp.alive) continue;
      // dial in, then behave normally. The idle twinkle would fight the
      // drawing head for the colour buffer, so it waits its turn.
      const ud = sp.obj.userData;
      if (ud.setForm && ud.dial < 1) {
        ud.dial = Math.min(1, ud.dial + dt / GATE_DIAL);
        ud.setForm(ud.dial);
        // ease the swell in with it, so an opening gate grows as it draws
        const s0 = ud.sizeScale ?? 1;
        sp.obj.scale.setScalar(s0 * (0.55 + 0.45 * ud.dial));
        continue;
      }
      // the charge runs the gate's own idle FASTER, rather than adding a
      // second animation on top of it — one thing accelerating reads as
      // building pressure; two things moving reads as noise
      sp.obj.userData.tick(t * (1 + 2.2 * waveCharge));
      if (sp.obj.userData.setDim) sp.obj.userData.setDim(1 + 1.5 * waveCharge);
      const s0 = sp.obj.userData.sizeScale ?? 1;
      const beat = 1 + waveCharge * (0.18 + 0.12 * Math.sin(t * (9 + 22 * waveCharge)));
      sp.obj.scale.setScalar(s0 * beat);
      // proximity discovers the source: the minimap beacon lights up
      if (!sp.found && dist3(player.pos, graph.centers[sp.ci]) < cellSide * 5) sp.found = true;
    }
    if (simStyle && !simDone) simPolicy(dt);
    autoSecondary();
    autoGunner(t);
    checkVictory(); // ram kills and heart-contact deaths can end it too
    // DOM is the sim's tax collector: an innerHTML rebuild per SIM STEP
    // (120 per painted frame) throttled the fast-forward to ~2s per batch.
    // The HUD only needs to be true when a frame is actually painted.
    if (!simSkip) {
      updateHud();
      updateNextPreview();
    }
    placeActors();

    // phagocytosis: when the amoeba nears an orb, aim the membrane at it.
    // Direction is converted into the creature's FINAL local frame (inverse
    // of the mesh quaternion), where waveJelly applies the stretch.
    reach.dir = null; reach.amt = 0;
    if (params.creature === 'amoeba' && creatureGeo && orbMeshes.size > 0 && !player.won) {
      const { ci, d } = nearestOrb();
      const reachRange = cellSide * 1.7 + unitScale;
      if (ci !== -1 && d < reachRange) {
        const orb = orbMeshes.get(ci);
        tmpV.copy(orb.position).sub(playerMesh.position).normalize()
          .applyQuaternion(tmpQ.copy(playerMesh.quaternion).invert());
        reach.dir = [tmpV.x, tmpV.y, tmpV.z];
        reach.amt = Math.min(1, Math.max(0, 1 - d / reachRange));
      }
    }

    // cloud: Wave×Jelly (+ reach) re-poses the dots; mesh: transform tick
    if (creatureGeo) {
      waveJelly(creatureBase, t, creaturePos, reach.amt > 0 ? { reachDir: reach.dir, reachAmt: reach.amt } : null);
      creatureGeo.getAttribute('position').needsUpdate = true;
    } else if (playerMesh.userData.tick) {
      playerMesh.userData.tick(t);
    }
    buildFollowTank(dt);
    updateCameraGoal();

    camera.position.lerp(camGoal.pos, 0.14);
    camera.quaternion.slerp(camGoal.quat, 0.14);

    heartSprite.userData.tick(t);

    // announce card: spin the introduced enemy while the banner is up
    if (waveUnit && !waveEl.classList.contains('hidden')) {
      waveUnit.rotation.y = t * 0.8; // HokorobiTawaa's announce spin
      if (waveUnit.userData.tick) waveUnit.userData.tick(t);
      if (!simSkip) waveSpriteRenderer.render(waveScene, waveCam);
    }

    // main view — the map-layer chrome needs no hiding any more; nothing
    // renders that layer
    scene.background = mainBg;
    if (simSkip) return; // sim pass: state advanced, nothing painted
    // in PoV the camera sits inside the creature — hide it there
    playerMesh.visible = params.view !== 'pov';
    postfx.render();

    drawRadar(t);
  }

  // The scope. Player mode is heading-up around the tank; heart mode (M) is
  // pole-down over the whole planet. Contacts carry the phosphor: full the
  // instant the beam passes, decaying behind it, never dark.
  function drawRadar(t) {
    if (!graph || !player.pos) return;
    const m = radarCss;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const ctx = radarCtx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = m / 2, cy = m / 2, R = m / 2 - 3;
    // basis + range: heart mode must hold the whole planet (max chord 2.0)
    let cpos, up;
    if (mapMode === 'heart') {
      const { hn, t1 } = poleFrame();
      cpos = graph.centers[dungeon.heart]; up = t1;
      // eslint-disable-next-line no-unused-vars
      void hn;
    } else {
      cpos = player.pos;
      up = player.smoothDir;
    }
    const basis = radarBasis(cpos, up);
    const range = mapMode === 'heart' ? 2.02 : 1.15;
    const sweep = sweepAngle(t);

    // ground: near-black green, three range rings, crosshair, rim
    ctx.fillStyle = '#031007';
    ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(90, 255, 140, 0.18)';
    ctx.lineWidth = 1;
    for (const f of [1 / 3, 2 / 3, 1]) {
      ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.stroke();

    // the beam: a conic trail BUILDING toward the beam line, so the glow
    // sits behind the rotation, then the hot edge itself
    const phi = sweep - Math.PI / 2;   // canvas angles: 0 = +x, clockwise
    const grad = ctx.createConicGradient(phi, cx, cy);
    grad.addColorStop(0, 'rgba(90, 255, 140, 0)');
    grad.addColorStop(0.72, 'rgba(90, 255, 140, 0)');
    grad.addColorStop(1, 'rgba(90, 255, 140, 0.30)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(140, 255, 180, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.sin(sweep), cy - R * Math.cos(sweep));
    ctx.stroke();

    const blip = (pos, style, size, always = false) => {
      const q = radarProject(pos, cpos, basis, range);
      const bri = always ? 1 : radarPhosphor(radarBearing(q.x, q.y), sweep);
      const bx = cx + q.x * R, by = cy + q.y * R;
      ctx.globalAlpha = q.clamped ? bri * 0.5 : bri;
      ctx.fillStyle = style;
      ctx.fillRect(bx - size / 2, by - size / 2, size, size);
      ctx.globalAlpha = 1;
    };

    // towers: dim cyan fixtures — infrastructure, not contacts
    for (const tw of towers) blip(graph.centers[tw.ci], '#4bd7e0', 2.5);
    // enemies: THE contacts, phosphor green, heavies fatter
    for (const e of enemies) {
      if (!e.alive) continue;
      // optical camo: a phantom is a contact only in its decloak window
      if (e.spec.cloaked && !e.decloaked) continue;
      blip(e.pos, '#5aff8c', e.spec.rammable ? 2.5 : 4);
    }
    // gates: amber, pulsing harder as a wave charges. Known ones only —
    // discovery still matters.
    for (const sp of spawnPoints) {
      if (!sp.alive || !sp.found) continue;
      const q = radarProject(graph.centers[sp.ci], cpos, basis, range);
      const r2 = 3 + 1.4 * Math.sin(t * 4 + sp.ci) + waveCharge * 3.5;
      ctx.globalAlpha = 0.55 + 0.45 * radarPhosphor(radarBearing(q.x, q.y), sweep);
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx + q.x * R, cy + q.y * R, Math.max(1.5, r2), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // the heart: what all of this is FOR — red, steady
    blip(graph.centers[dungeon.heart], '#ff4d6a', 5, true);
    // the strike's painted cell, while one is armed
    if (strike.armed && strike.target >= 0) {
      const q = radarProject(graph.centers[strike.target], cpos, basis, range);
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 1.5;
      const bx = cx + q.x * R, by = cy + q.y * R;
      ctx.beginPath();
      ctx.moveTo(bx - 6, by); ctx.lineTo(bx + 6, by);
      ctx.moveTo(bx, by - 6); ctx.lineTo(bx, by + 6);
      ctx.stroke();
    }
    // YOU: a heading wedge at centre (player mode) or a white dot out on the
    // board (heart mode)
    ctx.fillStyle = '#f2f8ff';
    if (mapMode === 'player') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx - 4, cy + 5);
      ctx.lineTo(cx + 4, cy + 5);
      ctx.closePath();
      ctx.fill();
    } else {
      blip(player.pos, '#f2f8ff', 4, true);
    }
  }

  // debug/demo overrides: ?wall=0.03 forces a wall height,
  // ?walk=N auto-walks N hops along the shortest route to the heart
  // (handy for screenshotting specific configurations)
  const urlParams = new URLSearchParams(location.search);
  const wallOverride = parseFloat(urlParams.get('wall') || '');
  const pointsOverride = parseInt(urlParams.get('points') || '', 10);
  if (Number.isFinite(pointsOverride)) params.points = Math.min(16000, Math.max(150, pointsOverride));
  const seedOverride = parseInt(urlParams.get('seed') || '', 10);
  if (Number.isFinite(seedOverride)) params.seed = seedOverride >>> 0;
  const simParam = urlParams.get('sim');
  if (simParam) {
    simStyle = simParam;
    simFast = Math.max(1, Math.min(120, parseInt(urlParams.get('simfast') || '50', 10)));
    simCap = Math.max(30, parseInt(urlParams.get('simcap') || '600', 10));
    console.log(`SIMBOOT style=${simStyle} fast=${simFast} cap=${simCap}`);
    postfx.setEnabled(false);   // bare-minimum paint: no bloom chain
    sfx.setMute(true);          // 50x audio is a fire alarm
    document.body.classList.add('simming');
  }
  if (Number.isFinite(wallOverride)) params.wallHeight = wallOverride;
  const viewOv = urlParams.get('view');
  if (['pov', 'third', 'orbit', 'drone'].includes(viewOv)) { setView(viewOv); }
  // the drone view is the one that can be REFUSED at boot (his bytes are
  // still in flight), so it is re-asked for once he lands rather than
  // silently leaving you in orbit
  if (viewOv === 'drone' && params.view !== 'drone') {
    preloadFabricator().then(() => { spawnIsao().then(() => setView('drone')); });
  }
  if (urlParams.get('callouts') === '0') params.callouts = false;
  syncCalloutMode();
  const heartOverride = urlParams.get('heart');
  if (HEART_LOOKS[heartOverride]) params.heartLook = heartOverride;
  const lookOverride = urlParams.get('look');
  if (LOOKS[lookOverride]) params.look = lookOverride;
  const wtOverride = urlParams.get('walltops');
  if (['bright', 'dim', 'black'].includes(wtOverride)) params.wallTops = wtOverride;
  const creatureOverride = urlParams.get('creature');
  if (UNITS[creatureOverride]) params.creature = creatureOverride;
  gui.controllersRecursive().forEach((c) => c.updateDisplay());

  regenerate();
  applyLook();
  // a unit whose model loads asynchronously needs its bytes kicked off; it
  // renders the procedural fallback until they arrive
  if (params.creature === 'mkcx') applyCreature();

  // ?walk=N teleports the wanderer N hops along the shortest route (demo)
  const walkN = parseInt(urlParams.get('walk') || '0', 10);
  for (let i = 0; i < walkN && !player.won; i++) {
    const d = dungeon.distToHeart;
    const next = openNeighbors(player.cur).find((nb) => d[nb] === d[player.cur] - 1);
    if (next === undefined) break;
    arriveAt(next);
  }
  if (walkN > 0) {
    player.pos = graph.centers[player.cur].slice();
    const td = player.prev >= 0 ? tangentDirTo(player.prev, player.cur)
      : player.travelDir;
    player.travelDir = td;
    player.heading = td.slice();
    player.next = player.won ? -1 : chooseNext();
    player.prog = 0;
    player.smoothDir = player.travelDir.slice();
    if (player.next !== -1) player.segLen = Math.max(1e-9, dist3(graph.centers[player.cur], graph.centers[player.next]));
    snapCamera();
  }

  // ?sector=N jumps the world to sector N pre-opened (headless check of
  // the expansion path; runs before ?wave so portals land in the band)
  const sectorN = parseInt(urlParams.get('sector') || '1', 10);
  if (sectorN > 1) {
    round = sectorN;
    applySector();
    buildGeometry();
  }

  // ?wave=N force-runs N wave beats (introductions included) — headless
  // verification of the announce/spawn flow without waiting wall-clock
  const waveN = parseInt(urlParams.get('wave') || '0', 10);
  for (let i = 0; i < waveN; i++) spawnWave();


  // ?sector=N stands on the SECTOR N debrief, so the card can be
  // photographed without playing fifteen waves five times over.
  const debriefN = parseInt(urlParams.get('debrief') || '0', 10);
  if (debriefN > 0) {
    clearEnemies();
    round = Math.min(SECTORS_TOTAL, debriefN);
    sectorsCleared = round - 1;
    wave = params.wavesPerSector * round;
    sectorStartWave = wave - params.wavesPerSector;
    for (const sp of spawnPoints) sp.alive = false;
    checkVictory();
  }

  // ?planet=1 stands on the second win: the whole shell open, every portal
  // dead. Reachable only by clearing five sectors, so never by hand here.
  if (urlParams.get('planet') === '1') {
    round = SECTORS_TOTAL;
    for (const sp of spawnPoints) sp.alive = false;
    clearEnemies();
    checkVictory();
  }

  // ?found=1 marks every spawn point discovered (minimap beacon check)
  if (urlParams.get('found') === '1') for (const sp of spawnPoints) sp.found = true;

  // ?laser=1 holds the laser trigger down (headless visual check) and
  // reports where the heat actually lands — a color that no one can see is
  // exactly the bug this line exists to catch
  if (urlParams.get('laser') === '1') {
    keys.laser = true;
    for (const at of [2500, 6000, 12000]) {
      setTimeout(() => {
        const m = playerMesh && playerMesh.userData && playerMesh.userData.gunHeatMat;
        const sm = playerMesh && playerMesh.userData && playerMesh.userData.laserSleeveMat;
        console.log(`GUNHEAT t=${at} mat=${!!m} sleeve=${!!sm}`
          + ` kind=${playerMesh && playerMesh.userData.kind}`
          + ` heat=${laserHeat.toFixed(2)}`
          + (m ? ` col=${m.color.getHexString()}` : '')
          + (sm ? ` scol=${sm.color.getHexString()}` : ''));
      }, at);
    }
  }

  // ?mode=build / ?map=heart jump straight into the TD viewpoints
  if (urlParams.get('mode') === 'build') { setView('orbit'); snapCamera(); } // legacy alias for view=orbit
  if (urlParams.get('map') === 'heart') mapMode = 'heart';

  // ?biomass=N pads the purse (?credit=N still works — the old name is an
  // alias so saved debug URLs keep working); ?tower=key@ci,key@ci force-places
  // towers
  // (both headless-verification hooks)
  const biomassN = parseInt(urlParams.get('biomass') || urlParams.get('credit') || '0', 10);
  if (biomassN > 0) eco.addBiomass(biomassN);
  const towerSpec = urlParams.get('tower');
  if (towerSpec) {
    for (const part of towerSpec.split(',')) {
      // key@ci or key@ci@tier — the tier arm exists so the pedestal
      // shapes (square/hex/circle) can be photographed without a mouse
      const [key, ciStr, tierStr] = part.split('@');
      let ci = parseInt(ciStr, 10);
      if (!TOWER_BY_KEY[key] || !Number.isFinite(ci)) continue;
      // seek forward to the nearest placeable cell — raw indices are a
      // lottery on a sealed sector world
      for (let tries = 0; tries < 400 && ci < dungeon.tags.length; tries++, ci++) {
        if (!placeError(ci)) {
          if (placeTower(key, ci)) {
            const want = parseInt(tierStr || '0', 10);
            const tw = towerByCell.get(ci);
            for (let t = 0; tw && t < want; t++) { eco.addBiomass(999); upgradeTower(tw); }
            // report the pedestal actually mounted — the tier read is
            // geometry, so the probe reads geometry
            if (tw) {
              const b = tw.obj.children.find((c) => c.isMesh && Math.abs(c.position.y - 0.08) < 0.02);
              const gp = b && b.geometry.parameters;
              console.log(`TOWERTIER ${key} tier=${tw.tier} base=${b ? b.geometry.type : '?'}`
                + `${gp && gp.radialSegments ? ` seg=${gp.radialSegments}` : ''}`);
            }
          }
          break;
        }
      }
    }
  }

  // ?order=key[,key] puts orders on ISAO's book (a site is chosen for each,
  // so the hook needs no cell ids), and ?isao=N then runs N seconds of his
  // shift. Both are needed because he is asynchronous twice over: the model
  // loads async, and the whole point of the mechanic is that a tower takes
  // wall-clock time to exist — neither of which ?tick can reach.
  // ?beep=1 — a raw oscillator straight to ctx.destination, using none of
  // the sample path. Audible beep + silent game = buffers or gain graph.
  // Neither audible = the context never reaches the speakers.
  if (urlParams.get('beep') === '1') {
    const fire = () => sfx.beep(880, 350);
    if (!fire()) addEventListener('pointerdown', fire, { once: true, capture: true });
    addEventListener('keydown', fire, { capture: true, passive: true });
    addEventListener('pointerdown', fire, { capture: true, passive: true });
  }

  // ?audiogate=N — DOES THE UNLOCK KEEP TRYING? The regression that started
  // all this was a one-shot gate: it removed its listeners synchronously,
  // before resume() had settled, so a single rejected attempt killed audio
  // for the session. Synthetic gestures are untrusted, so every resume here
  // WILL be rejected — which is precisely the failure path worth exercising.
  // Expect repeated "resume rejected (n)" and a rebuild, never silence.
  const gateN = parseInt(urlParams.get('audiogate') || '0', 10);
  if (gateN > 0) {
    let fired = 0;
    const tick = () => {
      if (fired++ >= gateN) {
        console.log(`AUDIOGATE dispatched=${fired - 1} gestures`
          + ' — the AUDIO gesture lines above prove the gate kept trying');
        return;
      }
      // a REAL click is a sequence; dispatching only pointerdown no longer
      // creates a context (see CREATE_EVENTS in audio.js), so send the lot
      window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      window.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      setTimeout(tick, 120);
    };
    tick();
  }

  // ?briefprobe=1 — DOES ISAO LEAVE ON HIS OWN? The operator's complaint was
  // that his lines had to be dismissed by hand, one tap per line, over the
  // board. The fix is only real if a beat plays through and clears itself with
  // NO input at all — which no screenshot can show, because a screenshot of a
  // panel looks the same whether it is about to leave or waiting forever.
  if (urlParams.get('briefprobe') === '1') {
    const beat = brief('gates');
    const total = beat.lines.reduce((a2, l) => a2 + dwellFor(l), 0);
    showBrief('gates');
    const shown = !briefEl.classList.contains('hidden');
    const startAt = briefAt;
    // half a line in: still up, and it must NOT have advanced yet
    stepBriefClock(dwellFor(beat.lines[0]) * 0.5);
    const heldEarly = briefAt === startAt && !briefEl.classList.contains('hidden');
    // past the first line: advanced, with nobody touching it
    stepBriefClock(dwellFor(beat.lines[0]) * 0.6);
    const advanced = briefAt > startAt;
    // run out the rest of the beat
    for (let i = 0; i < 400 && briefQ; i++) stepBriefClock(0.1);
    const cleared = briefQ === null && briefEl.classList.contains('hidden');
    console.log(`BRIEFPROBE shown=${shown} heldForTheFirstLine=${heldEarly}`
      + ` advancedWithNoInput=${advanced} clearedItself=${cleared}`
      + ` | beat=${beat.lines.length} lines, ${total.toFixed(1)}s unattended`
      + ` — ${shown && heldEarly && advanced && cleared ? 'PASS' : 'FAIL'}`);

    // NEGATIVE CONTROL. A clock that ran regardless of dt would pass every
    // assertion above by simply galloping to the end. Show a fresh beat, step
    // it by ZERO, and it must sit exactly where it was put.
    showBrief('printer');
    const at0 = briefAt, up0 = !briefEl.classList.contains('hidden');
    for (let i = 0; i < 50; i++) stepBriefClock(0);
    console.log(`BRIEFPROBE control: stepping by dt=0 fifty times`
      + ` leaves it at line ${briefAt} of ${briefQ ? briefQ.lines.length : 0},`
      + ` still up=${briefQ !== null}`
      + ` — ${up0 && briefAt === at0 && briefQ !== null ? 'PASS (the clock is dt, not calls)' : 'FAIL'}`);
    endBrief();

    // ARE THE NEW BEATS ACTUALLY REACHABLE? A beat with no trigger is a file
    // nobody reads. Each is invoked through the REAL seam it is wired to, not
    // through showBrief, so a mis-wired trigger fails here.
    const trig = [
      ['stalheart', () => setView('orbit')],
      ['motive', () => { waveIn = -1; armWave(); }],
      ['harvest', () => noteWaveKill('phage', 'tank')],
    ];
    for (const [id, fire] of trig) {
      clearBriefs();
      const i = briefSeen.indexOf(id);
      if (i >= 0) briefSeen.splice(i, 1);   // un-see it for the test
      fire();
      console.log(`BRIEFPROBE trigger ${id} — ${briefQ && briefQ.id === id ? 'PASS' : `FAIL (got ${briefQ ? briefQ.id : 'nothing'})`}`);
    }
    clearBriefs();

    // THE ONE-DEEP QUEUE. Two beats coming due together must not lose one:
    // a `once` beat is marked seen the moment it shows, so an interrupted one
    // is gone for good. The second must be held and play next.
    for (const id of ['arrival', 'stalheart']) {
      const i = briefSeen.indexOf(id); if (i >= 0) briefSeen.splice(i, 1);
    }
    showBrief('arrival');
    showBrief('stalheart');
    const first = briefQ && briefQ.id;
    for (let i = 0; i < 600 && briefQ && briefQ.id === first; i++) stepBriefClock(0.1);
    console.log(`BRIEFPROBE queue: showed ${first}, then ${briefQ ? briefQ.id : 'nothing'}`
      + ` — ${first === 'arrival' && briefQ && briefQ.id === 'stalheart' ? 'PASS (the second was held, not lost)' : 'FAIL'}`);
    clearBriefs();

    // ...and the reset teardown, which regenerate() did not have: a beat
    // mid-sentence when the run restarts must not survive onto the new board.
    showBrief('relay');
    const upBefore = !briefEl.classList.contains('hidden');
    regenerate();
    console.log(`BRIEFPROBE reset: up before=${upBefore} up after regenerate=${!briefEl.classList.contains('hidden')}`
      + ` — ${upBefore && briefEl.classList.contains('hidden') ? 'PASS' : 'FAIL'}`);
  }

  // ?beamfire=1 — THE SECONDARY, measured. A beam that renders proves nothing
  // about a weapon: what matters is that the burst is as long as the sound,
  // that the cooldown did not change, and that it burns everything it passes
  // through rather than stopping at the first thing.
  if (urlParams.get('beamfire') === '1') {
    (async () => {
      // YIELD BEFORE MEASURING ANYTHING. An async IIFE's body runs
      // SYNCHRONOUSLY up to its first await, and the rest of init — including
      // the ?rank=N hook several hundred lines below — has not run yet.
      // Without this the probe measures the boot defaults and silently
      // ignores every hook it is paired with: ?rank=15&beamfire=1 reported a
      // rank-0 beam and called it a PASS. Found while wiring the rank steps.
      await new Promise((r) => setTimeout(r, 0));
      const step = 1 / 60;
      keys.laser = true;
      let rise = 0, fell = 0, peakSeen = 0;
      // ALTITUDE MUST BE SAMPLED WHILE THE BEAM IS ON. The first cut of this
      // measured after the trigger released — by then hideBeams() has run,
      // every mesh is invisible, the `visible` guard skips all of them and
      // the max stays 0, which the check read as a PASS. A probe that reports
      // PASS having measured nothing is worse than no probe.
      let arcSample = null;
      const sampleArc = () => {
        const lift = 1 + params.wallHeight * 0.5;
        let coreMax = 0, plumeMax = 0, seenCore = 0, seenPlume = 0;
        if (tankBeams) {
          for (const bm of tankBeams) {
            if (!bm.mesh.visible) continue;
            seenCore++;
            for (const u of [bm.uniforms.uStart, bm.uniforms.uEnd]) {
              if (!u) continue;
              coreMax = Math.max(coreMax, Math.abs(u.value.length() / lift - 1) / cellSide);
            }
          }
        }
        if (plasma) {
          for (const pl of plasma) {
            if (!pl.pts.visible) continue;
            seenPlume++;
            for (let j = 0; j < PLASMA.points; j++) {
              const m = Math.hypot(pl.pos[j * 3], pl.pos[j * 3 + 1], pl.pos[j * 3 + 2]);
              plumeMax = Math.max(plumeMax, Math.abs(m / lift - 1) / cellSide);
            }
          }
        }
        return { coreMax, plumeMax, seenCore, seenPlume };
      };
      // hold the trigger until the tubes lock: that duration IS the burst
      for (let i = 0; i < 60 * 12 && !laserOverheat; i++) {
        updateLasers(step, i * step);
        rise += step;
        peakSeen = Math.max(peakSeen, laserHeat / LASER_MAX_HEAT);
        // 2s in: the bell is well up and the beam is unambiguously drawn
        if (i === 120) arcSample = sampleArc();
      }
      keys.laser = false;
      // ...then release and time the lockout
      for (let i = 0; i < 60 * 20 && laserOverheat; i++) {
        updateLasers(step, 100 + i * step);
        fell += step;
      }
      const okBurst = Math.abs(rise - LASER_MAX_HEAT) < 0.2;
      const okCool = Math.abs(fell - 1.71) < 0.25;
      console.log(`BEAMFIRE burst=${rise.toFixed(2)}s want ${LASER_MAX_HEAT}`
        + ` ${okBurst ? 'PASS' : 'FAIL'}`
        + ` | cooldown=${fell.toFixed(2)}s want ~1.71 ${okCool ? 'PASS' : 'FAIL'}`
        + ` | peak=${peakSeen.toFixed(2)}`);

      // THE COLOUR, read off the LIVE uniform rather than off the table it
      // came from. The table is already Node-tested; what is untested by
      // anything but this line is whether applyBeamRank ever reached the
      // material — and a beam wearing the wrong rank is invisible to every
      // other probe here, because burst, cooldown and pierce all pass in any
      // colour. Pair it with ?rank=N.
      {
        const bmC = tankBeams && tankBeams[0] && tankBeams[0].uniforms.uGlowColor;
        const want = new THREE.Color(beamStepNow.color);
        const got = bmC && bmC.value;
        const okCol = !!got && Math.abs(got.r - want.r) < 1e-3
          && Math.abs(got.g - want.g) < 1e-3 && Math.abs(got.b - want.b) < 1e-3;
        console.log(`BEAMFIRE color=${okCol ? 'PASS' : got ? 'FAIL' : 'INCONCLUSIVE (no beam built)'}`
          + ` rank=${tankRank} step=${beamStepNow.name} want=${beamStepNow.color}`
          + `${got ? ` got=#${got.getHexString()}` : ''}`
          + ` | reach=${LASER_REACH} cells dps=${LASER_DPS}`);
      }

      // DOES IT HUG THE GROUND? The whole point of the arc pass, and the one
      // thing a screenshot argues about and a number does not. Altitude is
      // measured off the drawn vertices themselves — the core links' live
      // endpoint uniforms and every plume dot — divided back out by the lift
      // the renderer applies, so 0 means "on the surface".
      {
        // what the SAME reach would have done as a straight chord, which is
        // what shipped until now — the comparison IS the finding
        const sArc = LASER_REACH * cellSide;
        const wasCells = (Math.sqrt(1 + sArc * sArc) - 1) / cellSide;
        if (!arcSample || !arcSample.seenCore) {
          console.log('ARCPROBE core-hugs=INCONCLUSIVE (no beam was drawn during'
            + ` the burst: core meshes visible=${arcSample ? arcSample.seenCore : 'never sampled'})`);
        } else {
          const okCore = arcSample.coreMax < 0.1;
          console.log(`ARCPROBE core-hugs=${okCore ? 'PASS' : 'FAIL'}`
            + ` max core altitude ${arcSample.coreMax.toFixed(3)} cells (want <0.1)`
            + ` over ${arcSample.seenCore} links`
            + ` | plume ${arcSample.seenPlume ? `spreads ${arcSample.plumeMax.toFixed(2)} cells` : 'NOT DRAWN'}`
            + ` | the old straight chord flew ${wasCells.toFixed(2)} cells at this reach`
            + ` | rank=${tankRank} reach=${LASER_REACH} tank=${creatureGeo ? 'dot-cloud fallback' : 'mesh'}`);
        }
      }

      // PIERCING: line three live enemies up along one beam and check the far
      // ones take damage too. The old bolts stopped at the first.
      const live = enemies.filter((e) => e.alive).slice(0, 3);
      if (live.length < 2) { console.log('BEAMFIRE pierce=INCONCLUSIVE (need 2+ live enemies)'); return; }
      const gunsNow = playerMesh && playerMesh.userData.laserGuns;
      if (!gunsNow || !gunsNow.length) { console.log('BEAMFIRE pierce=INCONCLUSIVE (no guns)'); return; }
      gunsNow[0].getWorldPosition(tmpV);
      const from = norm3([tmpV.x, tmpV.y, tmpV.z]);
      gunsNow[0].getWorldQuaternion(tmpQ);
      tmpV.set(0, 0, 1).applyQuaternion(tmpQ);
      const d0 = [tmpV.x, tmpV.y, tmpV.z];
      const dir = norm3(sub3(d0, scale3(from, dot3(d0, from))));
      // stand them in a row down the beam
      live.forEach((e, k) => { e.pos = norm3(add3(from, scale3(dir, cellSide * (0.7 + k * 0.7)))); });
      const before = live.map((e) => e.hp);
      laserHeat = 0; laserOverheat = false; keys.laser = true;
      for (let i = 0; i < 30; i++) updateLasers(step, 200 + i * step);
      keys.laser = false;
      const hit = live.map((e, k) => e.hp < before[k]);
      // THE CHOKE: does the beam SHORTEN against bodies, and does something
      // behind armour actually go unreached? Piercing that costs nothing is
      // the overpowered version; this measures the price.
      {
        const gunsC = playerMesh && playerMesh.userData.laserGuns;
        const liveC = enemies.filter((e) => e.alive);
        const hardC = liveC.filter((e) => !e.spec.rammable);
        if (gunsC && gunsC.length && hardC.length >= 3) {
          const g6 = gunsC[0];
          g6.getWorldPosition(tmpV);
          const f5 = norm3([tmpV.x, tmpV.y, tmpV.z]);
          g6.getWorldQuaternion(tmpQ);
          tmpV.set(0, 0, 1).applyQuaternion(tmpQ);
          const d5 = norm3(sub3([tmpV.x, tmpV.y, tmpV.z],
            scale3(f5, dot3([tmpV.x, tmpV.y, tmpV.z], f5))));
          // park everything out of the way, then queue three solid cores up
          // the beam with the LAST one just inside the clear-air reach
          for (const e of liveC) e.pos = norm3(add3(player.pos, [0.6, 0.6, 0.6]));
          const at = [0.5, 1.1, 1.9];
          hardC.slice(0, 3).forEach((e, k) => {
            e.hp = 9e9;
            e.pos = norm3(add3(f5, scale3(d5, cellSide * at[k])));
          });
          const last = hardC[2];
          const hp0 = last.hp;
          laserHeat = 0; laserOverheat = false; beamOn = false;
          keys.laser = true;
          for (let i = 0; i < 60; i++) updateLasers(1 / 60, 400 + i / 60);
          keys.laser = false;
          const reached = last.hp < hp0;
          // 3 hard bodies cost 3.3 cells of a 2.6 cell reach: the third is
          // past the end of what is left and must never be touched
          console.log(`BEAMFIRE choke=${!reached ? 'PASS' : 'FAIL'}`
            + ` (three solid cores at ${at.join('/')} cells;`
            + ` the one at ${at[2]} must be UNREACHED — PEN_HARD=${PEN_HARD().toFixed(2)}`
            + ` eats the 2.6-cell reach)`);
          // park them, do NOT kill them: the drag check below needs live
          // bodies, and the first cut of this tidied up by killing everything
          // and turned the next check INCONCLUSIVE
          for (const e of liveC) e.pos = norm3(add3(player.pos, [0.6, 0.6, 0.6]));
        } else console.log('BEAMFIRE choke=INCONCLUSIVE (need 3 unrammable enemies)');
      }

      // DRAG: does a solid core bog the beam harder than soft fodder, and do
      // the two beams genuinely decouple? Run the same burst twice — once
      // with the beam clear, once with a body parked in it — and compare how
      // far the sweep got. A danger readout that reads the same for both
      // tiers is not a readout.
      {
        const gunsD = playerMesh && playerMesh.userData.laserGuns;
        const liveAll = enemies.filter((e) => e.alive);
        const soft = liveAll.find((e) => e.spec.rammable);
        const hard = liveAll.find((e) => !e.spec.rammable);
        if (gunsD && gunsD.length && soft && hard) {
          const parkAt = (e, gi3, dcell) => {
            const g4 = gunsD[gi3];
            g4.getWorldPosition(tmpV);
            const f3 = norm3([tmpV.x, tmpV.y, tmpV.z]);
            g4.getWorldQuaternion(tmpQ);
            tmpV.set(0, 0, 1).applyQuaternion(tmpQ);
            const dd = norm3(sub3([tmpV.x, tmpV.y, tmpV.z],
              scale3(f3, dot3([tmpV.x, tmpV.y, tmpV.z], f3))));
            e.pos = norm3(add3(f3, scale3(dd, cellSide * dcell)));
          };
          const runBurst = () => {
            laserHeat = 0; laserOverheat = false; beamOn = false;
            beamPhase[0] = 0; beamPhase[1] = 0;
            keys.laser = true;
            for (let i = 0; i < 60 * 6; i++) updateLasers(1 / 60, 300 + i / 60);
            keys.laser = false;
            return [beamPhase[0], beamPhase[1]];
          };
          // park everything far away, then bring one body into beam 0
          for (const e of liveAll) e.pos = norm3(add3(player.pos, [0.6, 0.6, 0.6]));
          const clear = runBurst()[0];
          for (const e of liveAll) e.pos = norm3(add3(player.pos, [0.6, 0.6, 0.6]));
          soft.hp = 9e9; parkAt(soft, 0, 0.8);
          const withSoft = runBurst()[0];
          for (const e of liveAll) e.pos = norm3(add3(player.pos, [0.6, 0.6, 0.6]));
          hard.hp = 9e9; parkAt(hard, 0, 0.8);
          const withHard = runBurst()[0];
          const ok = withHard < withSoft - 0.02 && withSoft <= clear + 0.001;
          console.log(`BEAMFIRE drag=${ok ? 'PASS' : 'FAIL'}`
            + ` sweep reached: clear=${clear.toFixed(2)}`
            + ` soft=${withSoft.toFixed(2)} hard=${withHard.toFixed(2)}`
            + ` (a solid core must bog it harder than fodder)`);

          // DO THE TWO BEAMS ACTUALLY FALL OUT OF STEP? Only if a body is in
          // one and not the other — and that is a GEOMETRY question, not an
          // arithmetic one. The beams converge and the enemies are wide, so a
          // single target parked ahead usually sits in BOTH. Report how many
          // beams a lone body loads, because "they desync" is a claim about
          // the board, not about the code.
          const p0 = beamPhase[0], p1 = beamPhase[1];
          const lit = [0, 1].filter((gi4) => {
            const g5 = gunsD[gi4];
            g5.getWorldPosition(tmpV);
            const f4 = norm3([tmpV.x, tmpV.y, tmpV.z]);
            g5.getWorldQuaternion(tmpQ);
            tmpV.set(0, 0, 1).applyQuaternion(tmpQ);
            const dd2 = norm3(sub3([tmpV.x, tmpV.y, tmpV.z],
              scale3(f4, dot3([tmpV.x, tmpV.y, tmpV.z], f4))));
            const w2 = sub3(hard.pos, f4);
            const t3 = Math.max(0, Math.min(LASER_REACH * cellSide, dot3(w2, dd2)));
            const r2 = cellSide * Math.max(0.4, (hard.size ?? hard.spec.size) * 0.8);
            return dist3(add3(f4, scale3(dd2, t3)), hard.pos) < r2;
          }).length;
          console.log(`BEAMFIRE decouple beam0=${p0.toFixed(2)} beam1=${p1.toFixed(2)}`
            + ` | one body loaded ${lit} of 2 beams`
            + ` — ${lit === 2 ? 'SHARED, so the pair bogs together (expected: the'
              + ' beams converge and bodies are wide relative to the muzzle gap)'
              : 'independent, so the pair desyncs'}`);
          for (const e of liveAll) e.alive = false;   // tidy the probe's props
        } else console.log('BEAMFIRE drag=INCONCLUSIVE (need one soft and one hard enemy)');
      }

      // IS THE MODEL'S TOE EVEN REACHING THE BEAM? The beam direction is read
      // off Secondary_*_Gun_Pivot, but the toe is applied to
      // Secondary_*_Pivot — its parent. mergeByMaterial can REPARENT
      // preserved pivots, and if it did, the two are no longer related and
      // the toe is decoration.
      {
        // WHICH TANK IS THIS? headless often never finishes the mkcx load and
        // measures the PROCEDURAL fallback instead — so a reading here can be
        // about a different tank from the one the operator is playing. Say so
        // rather than let the number pass for the model's.
        const gp = playerMesh.getObjectByName('Secondary_L_Gun_Pivot');
        console.log(`BEAMFIRE tank=${gp ? 'mkcx (model pivots)' : 'procedural fallback'}`
          + ` guns=${(playerMesh.userData.laserGuns || []).length}`
          + ` SECONDARY_TOE=${SECONDARY_TOE}`);
      }

      // A WALL MUST BOG IT LIKE ARMOUR. Point him at rock and the sweep should
      // labour exactly as it does inside a solid core — otherwise firing into
      // a corner is free, which is the one place it obviously should not be.
      {
        const liveW = enemies.filter((e) => e.alive);
        for (const e of liveW) e.pos = norm3(add3(player.pos, [0.6, 0.6, 0.6]));
        const sweepFrom = (place) => {
          place();
          // the probe drives updateLasers directly, with no render between —
          // the gun world quaternions the beam reads are only as fresh as the
          // matrices, and placeActors() writes locals, not world matrices
          if (playerMesh) playerMesh.updateMatrixWorld(true);
          laserHeat = 0; laserOverheat = false; beamOn = false;
          beamPhase[0] = 0; beamPhase[1] = 0;
          keys.laser = true;
          for (let i = 0; i < 60 * 6; i++) updateLasers(1 / 60, 500 + i / 60);
          keys.laser = false;
          return beamPhase[0];
        };
        const here = player.cur, heldHeading = player.heading.slice();
        // "open ground" was an ASSUMPTION, and a wrong one — the tank spawns
        // beside the Heart facing rock, so the baseline was ALREADY bogged and
        // the comparison read as no-difference. Go and FIND clear ground: an
        // open cell whose whole 2-hop neighbourhood is open, aimed at an open
        // neighbour, which covers the 2.6-cell reach.
        let openCell = -1, aimCell = -1;
        for (let i = 0; i < dungeon.tags.length && openCell < 0; i++) {
          if (dungeon.tags[i] === BLOCKED) continue;
          const ring1 = graph.adj[i];
          if (ring1.some((nb) => dungeon.tags[nb] === BLOCKED)) continue;
          if (!ring1.every((nb) => graph.adj[nb].every((n2) => dungeon.tags[n2] !== BLOCKED))) continue;
          openCell = i; aimCell = ring1[0];
        }
        if (openCell < 0) { console.log('BEAMFIRE wall=INCONCLUSIVE (no clear ground on this map)'); return; }
        beamHitWall = false;
        const clearRun = sweepFrom(() => {
          player.cur = openCell;
          player.pos = graph.centers[openCell].slice();
          player.heading = tangentDirTo(openCell, aimCell);
          placeActors();
        });
        const clearHitWall = beamHitWall;
        {
          const gW = playerMesh.userData.laserGuns[0];
          gW.getWorldPosition(tmpV);
          const fW = norm3([tmpV.x, tmpV.y, tmpV.z]);
          gW.getWorldQuaternion(tmpQ);
          tmpV.set(0, 0, 1).applyQuaternion(tmpQ);
          const dW = norm3(sub3([tmpV.x, tmpV.y, tmpV.z], scale3(fW, dot3([tmpV.x, tmpV.y, tmpV.z], fW))));
          const walk = [];
          for (let m = cellSide * 0.5; m <= cellSide * LASER_REACH; m += cellSide * 0.5) {
            const ci = cellIndex(norm3(add3(fW, scale3(dW, m))));
            walk.push(ci === -1 ? 'off' : (dungeon.tags[ci] === BLOCKED ? 'ROCK' : 'open'));
          }
          console.log(`BEAMFIRE walk from cell ${openCell} (all-open 2-hop): ${walk.join(' ')}`
            + ` | gunCell=${cellIndex(fW)} standCell=${player.cur}`);
        }
        // now stand him against a wall and aim into it
        let wallCell = -1;
        for (let i = 0; i < dungeon.tags.length && wallCell < 0; i++) {
          if (dungeon.tags[i] !== BLOCKED) continue;
          if (graph.adj[i].some((nb) => dungeon.tags[nb] !== BLOCKED)) wallCell = i;
        }
        let wallRun = clearRun, wallHitWall = false;
        if (wallCell >= 0) {
          beamHitWall = false;
          const open = graph.adj[wallCell].find((nb) => dungeon.tags[nb] !== BLOCKED);
          wallRun = sweepFrom(() => {
            player.cur = open;
            player.pos = graph.centers[open].slice();
            player.heading = tangentDirTo(open, wallCell);
            placeActors();
          });
          wallHitWall = beamHitWall;
        }
        player.cur = here; player.heading = heldHeading;
        // clipping rock at the far tip is the NORMAL case on this map, so it
        // cannot veto the baseline — what must differ is how hard the rock
        // bites, which is exactly what the sweep records.
        const verdict = !wallHitWall ? 'INCONCLUSIVE (never actually faced rock)'
          : wallRun < clearRun - 0.05 ? 'PASS' : 'FAIL';
        console.log(`BEAMFIRE wall=${verdict}`
          + ` sweep reached: baseline=${clearRun.toFixed(2)} (hit rock: ${clearHitWall})`
          + ` into a wall=${wallRun.toFixed(2)} (hit rock: ${wallHitWall})`
          + ` — rock must labour it like a solid core`);
      }

      // THE SWEEP: does the pair actually scissor, and inward? Sample the two
      // beam directions across the burst and watch the angle between them.
      // Parallel at the ends, narrowest at the midpoint, and narrowing (not
      // widening) is what "inward" means — a sign error would still sweep.
      {
        const dirAt = (gi2, hf) => {
          laserHeat = hf * LASER_MAX_HEAT;
          const g3 = playerMesh.userData.laserGuns[gi2];
          g3.getWorldPosition(tmpV);
          const f2 = norm3([tmpV.x, tmpV.y, tmpV.z]);
          g3.getWorldQuaternion(tmpQ);
          tmpV.set(0, 0, 1).applyQuaternion(tmpQ);
          let d2 = norm3(sub3([tmpV.x, tmpV.y, tmpV.z],
            scale3(f2, dot3([tmpV.x, tmpV.y, tmpV.z], f2))));
          const sw = BEAM_SWEEP * Math.sin(Math.min(1, hf) * Math.PI);
          if (sw > 1e-4) {
            const lat = sub3(f2, player.pos);
            const latT = sub3(lat, scale3(f2, dot3(lat, f2)));
            const rg = norm3(cross3(f2, d2));
            const sg = dot3(latT, rg) > 0 ? -1 : 1;
            d2 = norm3(add3(scale3(d2, Math.cos(sw)), scale3(rg, Math.sin(sw) * sg)));
          }
          return { f: f2, d: d2 };
        };
        // WHERE THEY CROSS, not how far apart they end up. The guns are
        // already toed in, so the pair crosses before full reach even at
        // sweep 0 — and past the crossing the separation grows again whether
        // the sweep turns them in OR out. Measuring the far end therefore
        // reports FAIL for both signs, which is exactly what it did. The
        // honest signal is the distance at which they are closest: sweeping
        // inward brings the crossing NEARER the tank.
        // Distance AND gap. "Closest at 0" is also what DIVERGING looks
        // like — the muzzles are then the nearest the beams ever get — so a
        // location alone passes a fan-out trivially. The pair must actually
        // MEET: minimum gap near zero, at a positive distance.
        const crossAt = (hf) => {
          const A = dirAt(0, hf), B = dirAt(1, hf);
          let best = Infinity, at = 0;
          const reach2 = LASER_REACH * cellSide;
          for (let i = 0; i <= 300; i++) {
            const d3 = (i / 300) * reach2;
            const gp = dist3(add3(A.f, scale3(A.d, d3)), add3(B.f, scale3(B.d, d3)));
            if (gp < best) { best = gp; at = d3; }
          }
          return { at: at / cellSide, gap: best / cellSide };
        };
        const c0 = crossAt(0.02), cM = crossAt(0.5), c1 = crossAt(0.98);
        const meets = cM.gap < 0.05 && cM.at > 0.05;     // really crosses, ahead
        const nearer = cM.at < c0.at * 0.9 && cM.at < c1.at * 0.9;
        console.log(`BEAMFIRE sweep=${meets && nearer ? 'PASS' : 'FAIL'}`
          + ` crossing start=${c0.at.toFixed(2)} mid=${cM.at.toFixed(2)}`
          + ` end=${c1.at.toFixed(2)} cells`
          + ` | gap at mid=${cM.gap.toFixed(3)} cells`
          + ` (must MEET ahead of the tank, nearer at the midpoint)`);
        laserHeat = 0;
      }

      console.log(`BEAMFIRE pierce=${hit.every(Boolean) ? 'PASS' : 'FAIL'}`
        + ` (${hit.map((h, k) => `#${k}:${h ? 'burned' : 'untouched'}`).join(' ')})`
        + ` — the old bolts stopped at the first`);
    })();
  }

  // ?heartprobe=1 — WHAT IS ACTUALLY STANDING AT THE POLE. Headless crops, so
  // a screenshot cannot answer whether the Terraformer loaded, how big it is
  // on the board, or whether it is the fallback cloud wearing its name.
  // Rectangles can.
  if (urlParams.get('heartprobe') === '1') {
    let tries = 0;
    const run = () => {
      const isTerra = heartSprite && heartSprite.type === 'Group';
      if (!isTerra && params.heartLook === 'terraformer' && tries++ < 200) {
        setTimeout(run, 25); return;      // bytes still in flight
      }
      placeActors();                       // seat and scale it as the board does
      heartSprite.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(heartSprite);
      const size = new THREE.Vector3(); box.getSize(size);
      let meshes = 0, named = [];
      heartSprite.traverse((o) => {
        if (o.isMesh) meshes++;
        if (/Carriage|Mast|Arm_|Nozzle|Silo/.test(o.name || '')) named.push(o.name);
      });
      const span = Math.max(size.x, size.y, size.z);
      console.log(`HEARTPROBE look=${params.heartLook}`
        + ` node=${heartSprite.type} meshes=${meshes}`
        + ` span=${(span / cellSide).toFixed(2)}cells`
        + ` sizeScale=${(heartSprite.userData.sizeScale / cellSide).toFixed(2)}`
        + ` hasTick=${typeof heartSprite.userData.tick === 'function'}`
        + ` hasHit=${typeof heartSprite.userData.hit === 'function'}`
        + ` pivots=${named.length}`);
      // the contract the registry promises — exercised, not assumed
      let threw = '';
      try { heartSprite.userData.tick(3.2); heartSprite.userData.hit();
            heartSprite.userData.tick(3.3); } catch (e) { threw = String(e); }
      console.log(`HEARTPROBE contract=${threw ? 'FAIL ' + threw : 'PASS'}`
        + ` (tick + hit + tick survive)`);

      // DOES IT STILL STAND ON THE SHELL AFTER TICKING? The first cut wrote
      // g.rotation.z inside tick(), and in three.js writing rotation replaces
      // the quaternion outright — so every frame discarded the normal
      // alignment and the machine leaned over, pad on edge. Upright at the
      // pole and wrong everywhere else is invisible to a probe that only
      // checks the pole, so this compares the object's own up-axis against
      // the shell normal at its cell, AFTER a tick and a hit.
      // ACTIVITY IS SUPPOSED TO BE INTERMITTENT. A screensaver and a working
      // machine both "move"; the difference is whether they ever REST. Sample
      // each pivot across two minutes and report how much of that time it is
      // actually moving — low duty with real range is the shape wanted.
      if (params.heartLook === 'terraformer') {
        const track = { Travel_Carriage: 'position.z', Traverse_Carriage: 'position.x',
          Mast_Stage_2: 'position.y', Arm_Swing: 'rotation.y',
          Arm_Elbow: 'rotation.x', Arm_Wrist: 'rotation.x' };
        const read = (o, path) => path.split('.').reduce((a2, k) => a2[k], o);
        const seen = {};
        for (const k of Object.keys(track)) seen[k] = [];
        for (let i = 0; i < 1200; i++) {
          heartSprite.userData.tick(i * 0.1);
          for (const [name, path] of Object.entries(track)) {
            const o = heartSprite.getObjectByName(name);
            if (o) seen[name].push(read(o, path));
          }
        }
        for (const [name, vals] of Object.entries(seen)) {
          if (!vals.length) { console.log(`HEARTPROBE motion ${name}=ABSENT`); continue; }
          const mn = Math.min(...vals), mx = Math.max(...vals);
          const span2 = mx - mn;
          // "moving" = meaningfully away from its REST value this frame, and
          // rest is the MEDIAN — not the value nearest zero, which was the
          // first cut and read the elbow as 97% busy purely because it rests
          // at a slight bend rather than at 0. With a low duty the median IS
          // the resting pose, by definition.
          const restV = [...vals].sort((a2, b2) => a2 - b2)[Math.floor(vals.length / 2)];
          const busy = vals.filter((v) => Math.abs(v - restV) > span2 * 0.08).length / vals.length;
          console.log(`HEARTPROBE motion ${name} range=${span2.toFixed(3)}`
            + ` duty=${(busy * 100).toFixed(0)}%`
            + ` ${span2 > 1e-4 && busy > 0.02 && busy < 0.6 ? 'OK' : 'CHECK'}`);
        }
      }

      const hn2 = graph.normals[dungeon.heart];
      const up = new THREE.Vector3(0, 1, 0)
        .applyQuaternion(heartSprite.getWorldQuaternion(new THREE.Quaternion()));
      const align = up.x * hn2[0] + up.y * hn2[1] + up.z * hn2[2];
      console.log(`HEARTPROBE upright=${align > 0.999 ? 'PASS' : 'FAIL'}`
        + ` (up . normal = ${align.toFixed(4)}, want 1.0000)`);
    };
    run();
  }

  // ?droneprobe=1 — DOES W FLY ISAO TOWARDS THE SCREEN?
  // Operator: forward is back and sideways does nothing. Control and camera
  // must share one notion of "forward", so this measures them against each
  // other: fly him a step, take the camera's actual forward FROM its
  // quaternion (never re-derived — the standing rule in this repo), flatten
  // both onto the tangent plane and compare. +1 is agreement, -1 is inverted,
  // ~0 is the camera pointing somewhere unrelated to the stick.
  if (urlParams.get('droneprobe') === '1') {
    (async () => {
      await spawnIsao();
      if (!isao) { console.log('DRONEPROBE inconclusive=no isao'); return; }
      setView('drone');
      // ISOLATE THE DRONE CAMERA. updateCameraGoal answers shots and DEPLOY
      // first, and the probe never runs animate, so DEPLOY was still live and
      // every reading came from the deploy blend instead of the drone branch.
      endShot();
      deploy = null;
      const camFwdTangent = () => {
        updateCameraGoal();
        const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camGoal.quat); // cameras look down -Z
        const up = isao.dir;
        const d = [f.x, f.y, f.z];
        const t = sub3(d, scale3(up, dot3(d, up)));
        const l = len3(t);
        return l > 1e-6 ? scale3(t, 1 / l) : null;
      };
      const run = (label, k) => {
        keys.fast = keys.slow = keys.left = keys.right = false;
        keys[k] = true;
        const before = isao.dir.slice();
        const camF = camFwdTangent();
        for (let i = 0; i < 10; i++) pilotIsao(0.05);
        const moved = sub3(isao.dir, before);
        const ml = len3(moved);
        keys[k] = false;
        if (!camF || ml < 1e-9) return `${label}=NOMOVE`;
        const agree = dot3(scale3(moved, 1 / ml), camF);
        return `${label}=${agree.toFixed(2)}`;
      };
      // DOES HE FLY LIKE A DRONE? Facing must follow the heading (the bug was
      // that it followed nothing at all), the body must lean into the demand,
      // and space/shift must climb.
      {
        const nose = () => new THREE.Vector3(0, 0, 1)
          .applyQuaternion(isao.obj.getWorldQuaternion(new THREE.Quaternion()));
        const level = () => {
          keys.fast = keys.slow = keys.left = keys.right = false;
          for (let i = 0; i < 90; i++) pilotIsao(0.05);
        };
        level();
        const restNose = nose();
        const restUp = new THREE.Vector3(0, 1, 0)
          .applyQuaternion(isao.obj.getWorldQuaternion(new THREE.Quaternion()));
        // FACING: the nose must lie along the heading, not somewhere stale
        const hd = new THREE.Vector3(...isaoHeading);
        const faces = restNose.dot(hd);

        // LEAN: hold W and the nose must tip DOWN relative to the local up
        keys.fast = true;
        for (let i = 0; i < 40; i++) pilotIsao(0.05);
        const leanNose = nose();
        keys.fast = false;
        const tipped = leanNose.dot(restUp) - restNose.dot(restUp);

        // CLIMB: space must gain altitude, shift must lose it
        level();
        const a0 = isaoAlt;
        keys.droneUp = true; for (let i = 0; i < 20; i++) pilotIsao(0.05); keys.droneUp = false;
        const a1 = isaoAlt;
        keys.droneDown = true; for (let i = 0; i < 40; i++) pilotIsao(0.05); keys.droneDown = false;
        const a2 = isaoAlt;
        level();

        console.log(`DRONEPROBE facing=${faces > 0.99 ? 'PASS' : 'FAIL'}`
          + ` (nose . heading = ${faces.toFixed(4)}, want 1.0000)`);
        // REST TILT AND ADDED LEAN, separately. The first cut ran asin() over
        // the DIFFERENCE of two dot products, which is not a sine of
        // anything — it read 52 deg at ISAO_LEAN 0.42 and 37.6 at 0.16, a
        // constant offset that is really the MODEL's own pose: this drone is
        // authored nose-down, the way it hangs over a workpiece. The lean the
        // code adds is the second number, and it is the only one tunable.
        // AGAINST HIS CURRENT LOCAL UP, not a stale one. He flies forward for
        // two seconds during this test and the board is a sphere, so the up
        // captured before the run belongs to a different point on it — that
        // curvature was landing in the answer and inflating a 9 degree demand
        // into 37. Measure the tilt where he actually is.
        const ang = (v, upVec) =>
          Math.asin(Math.max(-1, Math.min(1, -v.dot(upVec)))) * 57.2958;
        const restDeg = ang(restNose, restUp);
        const leanUp = new THREE.Vector3(...isao.dir);
        const leanDeg = ang(leanNose, leanUp);
        console.log(`DRONEPROBE lean=${tipped < -0.05 ? 'PASS' : 'FAIL'}`
          + ` rest pose=${restDeg.toFixed(1)} deg (the model's own)`
          + ` -> under W ${leanDeg.toFixed(1)} deg`
          + ` = ${(leanDeg - restDeg).toFixed(1)} deg of added lean`
          + ` at ISAO_LEAN=${ISAO_LEAN}`);
        console.log(`DRONEPROBE climb=${a1 > a0 + 0.1 && a2 < a1 - 0.1 ? 'PASS' : 'FAIL'}`
          + ` (alt ${a0.toFixed(2)} -> space ${a1.toFixed(2)} -> shift ${a2.toFixed(2)})`);
      }

      const fwd = run('W', 'fast');
      const back = run('S', 'slow');
      // and does steering actually swing the view?
      keys.left = true;
      const c0 = camFwdTangent();
      for (let i = 0; i < 10; i++) pilotIsao(0.05);
      keys.left = false;
      const c1 = camFwdTangent();
      const swung = c0 && c1 ? Math.acos(Math.max(-1, Math.min(1, dot3(c0, c1)))) : 0;
      // THE PREDICTION: if the camera ignores the pilot's heading, then after
      // steering a half-turn, W must move him AWAY from the screen. Turning
      // the operator's "forward = back" into something falsifiable.
      keys.right = true;
      for (let i = 0; i < 40; i++) pilotIsao(0.05);   // swing him around
      keys.right = false;
      const afterTurn = run('W-after-turn', 'fast');
      const fv = parseFloat(fwd.split('=')[1]);
      console.log(`DRONEPROBE ${fwd} ${back} ${afterTurn}`
        + ` camera-swing=${(swung * 57.3).toFixed(1)}deg`
        + ` => forward=${fv > 0.8 ? 'PASS' : 'FAIL'}`
        + ` after-turn=${parseFloat(afterTurn.split('=')[1]) > 0.8 ? 'PASS' : 'FAIL'}`
        + ` steering=${swung > 0.1 ? 'PASS' : 'FAIL'}`);
    })();
  }

  // ?gestureprobe=1 — DOES THE FIRST GESTURE REACH THE AUDIO UNLOCK?
  // The context can only be born on a user gesture, and audio.js listens on
  // window in the BUBBLE phase. A shot's skip handlers sit in CAPTURE and
  // call stopImmediatePropagation, so this asks the only question that
  // matters: with a shot running, does a gesture still get through?
  if (urlParams.get('gestureprobe') === '1') {
    let tries = 0;
    const run = () => {
      if (!active && tries++ < 200) { setTimeout(run, 25); return; }
      dismissIntro();
      if (msgEl && !msgEl.classList.contains('hidden')) {
        paused = false; msgEl.classList.add('hidden');
      }
      // stand-ins registered exactly the way audio.js registers its own
      let gotKey = 0, gotTap = 0;
      const onKey = () => { gotKey++; };
      const onTap = () => { gotTap++; };
      for (const [ev, fn] of [['keydown', onKey], ['pointerdown', onTap]]) {
        window.addEventListener(ev, fn, { passive: true, capture: true });
      }
      const fire = () => {
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true }));
        // dispatched INSIDE root — that is where a real tap lands, and where
        // a shot's pointerdown skip handler is listening
        root.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      };
      endShot();
      fire();
      const baseK = gotKey, baseT = gotTap;
      startShot({
        id: 'probe-gesture',
        dur: 99,
        poseAt: (u, out) => { out.pos.copy(camera.position); out.quat.copy(camera.quaternion); },
      });
      fire();
      const duringK = gotKey - baseK, duringT = gotTap - baseT;
      endShot();
      for (const [ev, fn] of [['keydown', onKey], ['pointerdown', onTap]]) {
        window.removeEventListener(ev, fn, true);
      }
      ctlRawT = -9;
      console.log(`GESTUREPROBE idle key=${baseK} tap=${baseT}`
        + ` | during-shot key=${duringK} tap=${duringT}`
        + ` => ${duringK && duringT ? 'PASS' : 'FAIL'} (audio unlock must hear both)`);
    };
    run();
  }

  // ?printprobe=1 — ISAO'S PRINT BEAM, swept across a full pattern cycle.
  // The path maths is Node-tested in printpath.mjs; what this checks is the
  // WIRING: that the head actually moves over the cell (the bed points
  // spread, rather than all landing on one dot the way the old straight
  // beam did) and that the beam blanks during retractions and travel moves.
  if (urlParams.get('printprobe') === '1') {
    (async () => {
      await spawnIsao();
      eco.addBiomass(TOWER_BY_KEY.single.cost);
      for (let ci = 0; ci < dungeon.tags.length; ci++) {
        if (!placeError(ci) && !orderByCell.has(ci)) { orderTower('single', ci); break; }
      }
      // tick until he is actually printing, rather than guessing a number
      let guard = 0;
      while (isao && isao.state !== 'build' && guard++ < 4000) updateIsao(0.02);
      if (!isao || isao.state !== 'build') {
        console.log('PRINTPROBE inconclusive=never reached build state'); return;
      }
      const seen = new Set();
      let offs = 0, spreadMax = 0;
      // sample across three pattern slices, well inside the build
      for (let i = 0; i < 90; i++) {
        updateIsao(0.05);
        if (!printBeam || isao.state !== 'build') break;
        const ph = printPhase(isao.t, patternSecsFor(isao.dur));
        seen.add(ph.pattern);
        if (!printBeam.visible) offs++;
        const pa2 = printBeam.geometry.attributes.position;
        let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
        for (let k = 1; k < pa2.count; k++) {
          mnX = Math.min(mnX, pa2.getX(k)); mxX = Math.max(mxX, pa2.getX(k));
          mnY = Math.min(mnY, pa2.getY(k)); mxY = Math.max(mxY, pa2.getY(k));
        }
        spreadMax = Math.max(spreadMax, Math.hypot(mxX - mnX, mxY - mnY) / cellSide);
      }
      const all = ['zigzag', 'spiral', 'blink'].every((k) => seen.has(k));
      console.log(`PRINTPROBE patterns=${all ? 'PASS' : 'FAIL'} (${[...seen].join('+')})`
        + ` blanks=${offs > 0 ? 'PASS' : 'FAIL'} (${offs} frames off)`
        + ` head-moves=${spreadMax > 0.05 ? 'PASS' : 'FAIL'} (max spread ${spreadMax.toFixed(3)} cells)`);
    })();
  }

  const orderSpec = urlParams.get('order');
  const isaoN = parseFloat(urlParams.get('isao') || urlParams.get('bobby') || '0');
  if (orderSpec || isaoN > 0) {
    (async () => {
      await spawnIsao();
      // the view override is re-applied HERE because ?view=drone is asked
      // for before his bytes have landed, and a probe that ticks his shift
      // from the orbit camera is measuring the wrong camera
      if (urlParams.get('view') === 'drone') setView('drone');
      if (orderSpec) {
        for (const key of orderSpec.split(',')) {
          if (!TOWER_BY_KEY[key]) continue;
          eco.addBiomass(TOWER_BY_KEY[key].cost);   // the hook pays its own way
          for (let ci = 0; ci < dungeon.tags.length; ci++) {
            if (!placeError(ci) && !orderByCell.has(ci)) { orderTower(key, ci); break; }
          }
        }
      }
      for (let sT = 0; sT < isaoN; sT += 0.05) updateIsao(0.05);
      const o = orders[0];
      if (isao) {
        snapCamera();
        console.log(`ISAOCAM view=${params.view}`
          + ` isao=${isao.obj.position.toArray().map((v) => v.toFixed(3)).join(',')}`
          + ` cam=${camera.position.toArray().map((v) => v.toFixed(3)).join(',')}`
          + ` dist=${camera.position.distanceTo(isao.obj.position).toFixed(3)}`
          + ` cellSide=${cellSide.toFixed(3)}`);
      }
      // the beam is the thing being verified here: is the head MOVING (bed
      // points spread out, not one repeated dot) and does it blank
      if (printBeam && isao) {
        const ph = printPhase(isao.t, patternSecsFor(isao.dur));
        const pa2 = printBeam.geometry.attributes.position;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let k = 1; k < pa2.count; k++) {
          minX = Math.min(minX, pa2.getX(k)); maxX = Math.max(maxX, pa2.getX(k));
          minY = Math.min(minY, pa2.getY(k)); maxY = Math.max(maxY, pa2.getY(k));
        }
        const spread = Math.hypot(maxX - minX, maxY - minY);
        console.log(`PRINTBEAM pattern=${ph.pattern} u=${ph.u.toFixed(2)}`
          + ` on=${printBeam.visible} pts=${pa2.count}`
          + ` spread=${(spread / cellSide).toFixed(3)}cells`);
      }
      console.log(`ISAO state=${isao ? isao.state : 'absent'}`
        + ` queue=${orders.length} live=${o ? (o.key || 'upgrade') + '@' + o.ci : '-'}`
        + ` t=${isao ? isao.t.toFixed(2) : '-'}/${isao ? isao.dur.toFixed(2) : '-'}`
        + ` built=${towers.length}`);
      snapCamera();
    })();
  }

  // AFTER ?tower= on purpose: this then exercises the live applyTowerLook()
  // swap over existing towers, not just build-time selection.
  const towerLookOv = urlParams.get('towerlook');
  if (TOWER_LOOK_NAMES.includes(towerLookOv)) {
    params.towerLook = towerLookOv;
    towerLookCtrl.updateDisplay(); // or the panel lies about what is on screen
    applyTowerLook();
  }

  // ?reveal=1 fires a sector-2 expansion immediately (headless check of
  // the full-planet reveal beat)
  if (urlParams.get('reveal') === '1') { round = 2; expandRound(); }

  // ?shop=ci opens the radial on that cell, screen-centered (headless check)
  const shopN = parseInt(urlParams.get('shop') || '-1', 10);
  if (shopN >= 0) openShop(shopN);

  // ?recoil=1 freezes a mid-recoil pose (turret back, hull rocked) so the
  // kick can be screenshot; the sim pauses to hold it
  if (urlParams.get('recoil') === '1') {
    recoilLeft = recoilLen() * 0.75;
    cannonHeat = CANNON_COOL;
    placeActors();
    paused = true;
  }

  // ?blast=N breaches the N wall cells nearest the player — exercises the
  // carve + debris + rebuild path without needing a live shot
  // ?lose=1 kills the tank on the spot, so the wreck can be screenshot
  if (urlParams.get('lose') === '1') loseGame('debug');
  // ?ctlprobe=1 — the reset seam, made deterministic. Lose a tank (which
  // arms the DEATH_HOLD respawn), then RETRY inside that hold, exactly as a
  // player jabbing the button does. The question the log answers is whether
  // the dead run's timer still lands on the live one: a respawn:tank-lost
  // printed AFTER regenerate:after is a repositioning nobody asked for, on
  // a run that has not lost anything.
  // Does a real keydown still reach the game? Shared by every probe that
  // asks it, so the reasoning below lives in exactly one place.
  //
  // DISPATCH ON A DESCENDANT, NOT ON WINDOW. A keydown aimed straight at
  // window makes window the TARGET, and at-target listeners run in
  // registration order with the capture flag IGNORED — which puts the game's
  // own handler (registered at init) ahead of a shot's capture handler
  // (registered later) and reverses the very ordering under test. A real key
  // travels capture -> target -> bubble; so must this.
  function probeKeyReaches() {
    keys.fast = false;
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true }));
    const reached = keys.fast;
    keys.fast = false;
    ctlRawT = -9;   // the synthetic press must not trip the live watchdog
    return reached;
  }

  // ?deployprobe=1 — THE CONSISTENCY QUESTION, made a check. The operator's
  // report was that every reset produced a different opening state; this
  // walks the reset paths in turn and asserts each lands in the SAME shape:
  // the berth its hull count names, heading down that berth's own exit, auto
  // off, cruise off. Then it runs the beat to completion and checks the hull
  // actually left the box, which is what "ENTIRELY OUT" was pointing at.
  if (urlParams.get('deployprobe') === '1') {
    const rows = [];
    const shape = (tag) => {
      const n = berthIndexFor(playerHP);
      const b = berths[n];
      const good = !!b && player.cur === b.ci && player.next === b.exit
        && !autoMode && !cruise;
      rows.push(`${tag}: berth=#${n + 1} cur=${player.cur} want=${b ? b.ci : -1}`
        + ` exit_ok=${!!b && player.next === b.exit}`
        + ` auto=${autoMode} cruise=${cruise} ${good ? 'ok' : 'BAD'}`);
      return good;
    };
    let ok = shape('fresh-load');
    regenerate();               ok = shape('regenerate') && ok;
    playerHP = 2; deployStart(berthIndexFor(playerHP)); ok = shape('hull-2') && ok;
    playerHP = 1; deployStart(berthIndexFor(playerHP)); ok = shape('hull-1') && ok;
    // and the beat itself: drive it to the end, check the hull is out
    playerHP = PLAYER_MAX;
    deployStart(berthIndexFor(playerHP));
    const b0 = berths[berthIndexFor(playerHP)];
    for (let i = 0; i < 600 && deployActive(); i++) deployStep(0.05);
    const out = !!b0 && player.cur === b0.exit && !deployActive()
      && !autoMode && !cruise && throttle === 0;
    rows.forEach((r) => console.log(`DEPLOYPROBE ${r}`));
    console.log(`DEPLOYPROBE shape=${ok ? 'PASS' : 'FAIL'}`
      + ` entirely-out=${out ? 'PASS' : 'FAIL'}`
      + ` (ended at ${player.cur}, wanted ${b0 ? b0.exit : -1},`
      + ` deploying=${deployActive()} auto=${autoMode} cruise=${cruise})`);
  }

  // ?downprobe=1 — LOSING A HULL IS THREE BEATS, NOT A CUT. Asserts the
  // camera actually runs home (a 'downdash' shot exists) and that when it
  // lands the next hull is deploying from the RIGHT berth: lose one and you
  // come out of #2, as the operator specified.
  if (urlParams.get('downprobe') === '1') {
    let tries = 0;
    const run = () => {
      if (!active && tries++ < 200) { setTimeout(run, 25); return; }
      dismissIntro();
      if (msgEl && !msgEl.classList.contains('hidden')) {
        paused = false; msgEl.classList.add('hidden');
      }
      endShot();                 // clear the opening so only the dash is in play
      playerHP = PLAYER_MAX - 1; // the damage path decrements BEFORE loseTank
      loseTank();
      let waits = 0;
      const check = () => {
        if (shotId() !== 'downdash' && waits++ < 300) { setTimeout(check, 20); return; }
        const dashed = shotId() === 'downdash';
        endShot();               // run it to its end, as the frame loop would
        const n = berthIndexFor(playerHP);
        const b = berths[n];
        const ok = dashed && !!b && player.cur === b.ci && deployActive()
          && !playerDown && !autoMode && !cruise;
        console.log(`DOWNPROBE dash=${dashed ? 'PASS' : 'FAIL'}`
          + ` handoff=${ok ? 'PASS' : 'FAIL'}`
          + ` (berth #${n + 1}, cur=${player.cur}, want=${b ? b.ci : -1},`
          + ` deploying=${deployActive()}, down=${playerDown})`);
      };
      check();
    };
    run();
  }

  // ?resetprobe=1 — A RESET ENDS WHATEVER WAS RUNNING. regenerate() is on the
  // GUI and on Retry, so it can land mid-reveal; a shot that survives it keeps
  // its capture-phase skip listener registered and later fires its onEnd
  // against cells from a board that no longer exists.
  if (urlParams.get('resetprobe') === '1') {
    let tries = 0;
    const run = () => {
      if (!active && tries++ < 200) { setTimeout(run, 25); return; }
      dismissIntro();
      if (msgEl && !msgEl.classList.contains('hidden')) {
        paused = false; msgEl.classList.add('hidden');
      }
      let ended = 0;
      startShot({
        id: 'probe-reveal',
        dur: 99,          // long enough that only a reset can end it
        poseAt: (u, out) => { out.pos.copy(camera.position); out.quat.copy(camera.quaternion); },
        onEnd: () => { ended++; },
      });
      const before = shotId();
      regenerate();
      const cleared = !shotActive();
      const reached = probeKeyReaches();
      console.log(`RESETPROBE shot-torn-down=${cleared && ended === 1 && reached ? 'PASS' : 'FAIL'}`
        + ` (was '${before}', cleared ${cleared}, onEnd ${ended}x, key reached ${reached})`);
    };
    run();
  }

  // ?shotprobe=1 — THE TEARDOWN REGRESSION GUARD, for camShot itself.
  // A shot installs a capture-phase keydown handler that stops the event
  // dead. If its teardown is ever skipped, the whole keyboard dies silently
  // and the game looks like it has frozen — which is exactly what shipped
  // for a week. So: start a shot, end it the way the frame loop does (drive
  // the clock past zero, then step), and check a real key still lands.
  if (urlParams.get('shotprobe') === '1') {
    let tries = 0;
    const run = () => {
      if (!active && tries++ < 200) { setTimeout(run, 25); return; }
      // clear the opening first: the briefing legitimately holds the keyboard
      // until dismissed, and this probe is about camShot's teardown, not about
      // the modal's. Testing through a modal measures the wrong thing.
      dismissIntro();
      if (msgEl && !msgEl.classList.contains('hidden')) {
        paused = false; msgEl.classList.add('hidden');
      }
      let ended = 0;
      startShot({
        id: 'probe',
        dur: 0.05,
        poseAt: (u, out) => { out.pos.copy(camera.position); out.quat.copy(camera.quaternion); },
        onEnd: () => { ended++; },
      });
      const wasActive = shotActive();
      stepShot(0.2);   // precisely what animate does: decrement past zero
      const reached = probeKeyReaches();
      const ok = wasActive && !shotActive() && ended === 1 && reached;
      console.log(`SHOTPROBE teardown=${ok ? 'PASS' : 'FAIL'}`
        + ` (started ${wasActive}, cleared ${!shotActive()}, onEnd ${ended}x,`
        + ` key reached ${reached})`);
    };
    run();
  }

  // ?cineprobe=1 — TWO QUESTIONS ABOUT THE COLD OPEN.
  //
  // 1. CAN THE PLAYER MOVE AFTER IT. The operator's report, made a check.
  //    It cannot wait the shot out: under a virtual-time budget
  //    performance.now() does not advance, so the frame loop's dt stays ~0
  //    and the shot never ends on its own. So it reproduces the NATURAL END
  //    exactly as animate leaves it — clock past zero, then stepShot.
  // 2. IS THE LAST FRAME THE FIRST FRAME. The cinematic's final pose must BE
  //    the pose DEPLOY opens on, or the hand-off is a cut.
  if (urlParams.get('cineprobe') === '1') {
    let tries = 0;
    const run = () => {
      if (shotId() !== 'cinematic' && tries++ < 200) { setTimeout(run, 25); return; }
      if (shotId() !== 'cinematic') {
        console.log('CINEPROBE inconclusive=no cinematic started'); return;
      }
      // asked BEFORE the shot ends, while its poseAt still exists
      const n = berthIndexFor(playerHP);
      shot.poseAt(1, camB);
      deployFramePoseFor(n, camA);
      const dp = camB.pos.distanceTo(camA.pos);
      const dq = camB.quat.angleTo(camA.quat);
      const cont = dp < 1e-6 && dq < 1e-6;
      console.log(`CINEPROBE continuity=${cont ? 'PASS' : 'FAIL'}`
        + ` (pos ${dp.toExponential(2)}, angle ${dq.toExponential(2)}, want ~0)`);

      shot.left = -0.05;   // exactly what `shot.left -= dt` leaves behind
      stepShot(0);         // ...and exactly what animate calls next
      const deployed = deployActive();

      // AFTER THE INTRO MEANS AFTER ITS HANDOFF TOO. The cold open hands to
      // the briefing, which legitimately captures the keyboard until it is
      // dismissed — so testing the key the instant the shot ends tests the
      // wrong moment. Dismiss it the way a player does, then ask.
      const introUp = introEl && !introEl.classList.contains('hidden');
      dismissIntro();
      const msgUp = msgEl && !msgEl.classList.contains('hidden');
      if (msgUp) { paused = false; msgEl.classList.add('hidden'); }
      console.log(`CINEPROBE handoff-shape introUp=${introUp} briefingUp=${msgUp}`);
      const reached = probeKeyReaches();
      console.log(`CINEPROBE move-after-intro=${reached ? 'PASS' : 'FAIL'}`
        + ` (W reached the game: ${reached}, want true)`);
      console.log(`CINEPROBE handoff-ran=${deployed ? 'PASS' : 'FAIL'}`
        + ` (the cinematic must hand straight to DEPLOY, not strand it)`);
    };
    run();
  }
  if (urlParams.get('ctlprobe') === '1') {
    ctlLog('probe:start');
    loseTank();
    setTimeout(() => {
      console.log('CTL probe: RETRY pressed mid-hold');
      regenerate();
      const afterRetry = tankLostDeploys;
      // by now the dead run's DEATH_HOLD timer has had its chance. Only
      // tank-lost respawns count: the new run legitimately stages itself at
      // its berths, and a total would score that as the bug.
      setTimeout(() => {
        const crossed = tankLostDeploys - afterRetry;
        console.log(`CTLPROBE stale-death-timer=${crossed === 0 ? 'PASS' : 'FAIL'}`
          + ` (tank-lost deploys after retry: ${crossed}, want 0)`);
        ctlLog('probe:end');
      }, (DEATH_HOLD + 0.8) * 1000);
    }, 200);
  }
  const blastN = parseInt(urlParams.get('blast') || '0', 10);
  for (let i = 0; i < blastN; i++) {
    let best = -1, bd = Infinity;
    for (let ci = 0; ci < dungeon.tags.length; ci++) {
      if (dungeon.tags[ci] !== BLOCKED) continue;
      const d = dist3(player.pos, graph.centers[ci]);
      if (d < bd) { bd = d; best = ci; }
    }
    if (best === -1) break;
    blastWall(best);
  }

  // ?tick=N synchronously simulates N seconds (demo/debug — headless
  // virtual time doesn't advance performance.now, so real motion can't be
  // screenshot-verified without this). Enemies advance too.
  const tickN = parseFloat(urlParams.get('tick') || '0');
  if (tickN > 0) {
    for (let s = 0; s < tickN; s += 0.05) {
      advanceMotion(0.05);
      updateEnemies(0.05, s);
    }
    placeActors();
    snapCamera();
  }

  if (waveN > 0) {
    // ?wave=N now REPORTS what it spawned. The operator sees one contact
    // on a field the towers are clearly shooting into, and "how many are
    // actually there" is not a thing a screenshot can answer.
    const alive = enemies.filter((e) => e.alive);
    const inScene = alive.filter((e) => e.obj && e.obj.parent === scene);
    const visible = alive.filter((e) => e.obj && e.obj.visible);
    const spots = new Set(alive.map((e) => e.cur));
    const byType = {};
    for (const e of alive) byType[e.type] = (byType[e.type] || 0) + 1;
    console.log(`WAVEDUMP wave=${wave} alive=${alive.length} queued=${spawnQueue.length}`
      + ` inScene=${inScene.length} visible=${visible.length}`
      + ` distinctCells=${spots.size} portals=${spawnPoints.filter((s) => s.alive).length}`
      + ` types=${Object.entries(byType).map(([k, v]) => `${k}x${v}`).join(',')}`);
  }
  // opening briefing on a clean load; any debug hook means headless/demo,
  // where a frozen sim would break the verification flow
  // ?audio=1 — report the audio graph every two seconds: how many voices are
  // live and what state the context is in. The leak this was written for is
  // fixed, but "it sounds worse now" is not evidence and this is.
  // ?record=1 opens the record, and ?record=all fills it first — the only
  // way to see every row lit without earning twenty-one of them
  const recQ = urlParams.get('record');
  if (recQ) {
    if (recQ === 'all') {
      heldAchv.length = 0;
      for (const a of ACHIEVEMENTS) heldAchv.push(a.id);
    }
    setTimeout(() => showRecord(), 400);
  }

  // ?brief=<id> plays one of Isao's beats on demand, ignoring the once-only
  // memory — otherwise a beat can be looked at exactly once per browser,
  // ever, which is not a thing you can iterate on
  const briefQ2 = urlParams.get('brief');
  if (briefQ2) {
    const i = briefSeen.indexOf(briefQ2);
    if (i >= 0) briefSeen.splice(i, 1);
    setTimeout(() => showBrief(briefQ2), 500);
  }

  if (urlParams.get('audio') === '1') {
    setInterval(() => {
      console.log(`AUDIO voices=${sfx.voices} ctx=${sfx.contextState}`);
    }, 2000);
  }

  const debugging = ['walk', 'tick', 'wave', 'blast', 'laser', 'found', 'recoil', 'mode', 'map', 'tower', 'biomass', 'credit', 'driveout', 'order', 'isao', 'bobby', 'record', 'debrief', 'armed', 'brief', 'planet', 'shop', 'sector', 'reveal', 'portal', 'lose', 'charge', 'layout', 'perf', 'strike', 'strikefall', 'strikecam', 'gateprobe', 'rank', 'danger', 'callout', 'sitrep', 'server', 'hack', 'shield', 'sim']
    .some((k) => urlParams.get(k));
  const tutParam = urlParams.get('tutorial');
  runTutorial = tutParam === '1' || (tutParam !== '0' && !debugging);
  // ?intro=1 forces the manual even under debug hooks (screenshot path);
  // ?intro=0 skips it. On a clean load it fronts whatever comes next.
  const introParam = urlParams.get('intro');
  // THE COLD OPEN fronts all of it. ?cine=N scrubs N seconds into it (the
  // screenshot path — beats land at ~1 / ~5 / ~8); ?cine=0 skips it. It is
  // deliberately NOT gated on `debugging`: a hook like ?tick has no opinion
  // about the opening, and the cinematic is the thing being verified.
  const cineParam = urlParams.get('cine');
  const wantCine = cineParam !== '0' && (cineParam !== null || !debugging);
  let opening = null;
  if (introParam === '1') opening = () => showIntro();
  else if (!debugging && introParam !== '0') {
    opening = () => showIntro(() => { if (runTutorial) startTutorial(); else showBriefing(); });
  } else if (runTutorial) opening = () => startTutorial();
  else if (!debugging) opening = () => showBriefing();

  if (wantCine) {
    // held until the berths land (or the frame loop's safety net fires) —
    // the opening shot needs the thing it is a shot OF
    const scrub = parseFloat(cineParam || '0');
    if (scrub > 0) shotHold = true;   // ?cine=N parks the clock on that beat
    // nothing to wait for any more: the camp is known with the board, so the
    // opening shot has its subject the moment the tab exists
    playCinematic(opening || (() => {}), scrub);
  } else {
    deployStart(berthIndexFor(playerHP));
    if (opening) opening();
  }

  // ?tutstep=N — clear N scripted pairs, so the later tutorial beats can be
  // reached without a pair of hands. Every other phase here is gated on
  // killing something, which headless verification cannot do, and a beat you
  // cannot screenshot is a beat nobody checks.
  // ?perf=N — after N seconds, report what the frame actually costs. Written
  // because "is the dot count a performance limit?" is a question that should
  // be answered with the renderer's own numbers, not with an instinct.
  const perfAt = parseFloat(urlParams.get('perf') || '0');
  if (perfAt > 0) {
    setTimeout(() => {
      // info resets on every render() and postfx runs several passes, so a
      // naive read reports the bloom's final fullscreen quad and nothing
      // else. Turn autoReset off and let ONE frame accumulate.
      // BOTH renderers. The minimap has its own WebGLRenderer and therefore
      // its own info — reading only the main one measured half the frame and
      // made the map look free, which it very much was not.
      renderer.info.autoReset = false; renderer.info.reset();
      requestAnimationFrame(() => requestAnimationFrame(() => report()));
    }, perfAt * 1000);
    const report = () => {
      const r = renderer.info.render;
      const mem = renderer.info.memory;
      let objs = 0, points = 0, clouds = 0;
      scene.traverse((o) => {
        objs++;
        if (o.isPoints && o.geometry && o.geometry.attributes.position) {
          clouds++; points += o.geometry.attributes.position.count;
        }
      });
      console.log(`PERF viewport=${innerWidth}x${innerHeight} dpr=${devicePixelRatio}`);
      // simTime only advances inside advanceMotion, so it is the honest
      // answer to "is the driver live right now"
      console.log(`PERF build=${buildMode} frozenWorld=${buildFrozen()}`
        + ` simTime=${simTime.toFixed(2)}`);
      console.log(`PERF main calls=${r.calls} tris=${r.triangles} pts=${r.points}`
        + ` | radar=2D, no second WebGL context`
        + ` | scene objects=${objs} clouds=${clouds} cloudVerts=${points}`
        + ` | geometries=${mem.geometries}`);
      renderer.info.autoReset = true;
    };
  }

  // ?layout=N — after N seconds, print the on-screen box of every HUD piece
  // and every overlap between them. A screenshot cannot be trusted for this:
  // headless will not lay out below ~500px, it lays out wide and CROPS, so a
  // phone-sized picture shows phone-sized pixels of a tablet-sized layout.
  // Rectangles do not lie.
  const layoutAt = parseFloat(urlParams.get('layout') || '0');
  if (layoutAt > 0) {
    setTimeout(() => {
      const want = {
        // scoped to THIS tab: the sibling tabs carry the same classes, and
        // querySelector was returning a hidden tab's copy and skipping it
        menu: '#chrome-toggle', modes: '#tab-td .tc-util', hud: '#td-stats',
        map: '#tab-td .minimap', tut: '#td-tut', throttle: '#td-throttle',
        steerL: '#td-pad-left', steerR: '#td-pad-right',
        fire: '#td-pad-fire', laser: '#td-pad-laser',
        launch: '#td-launch', next: '#td-next', card: '#td-sitrep', hack: '#td-hack',
        // the two number slots, which only leave the centre when the
        // encouragement is switched off — and are exactly the pair most
        // likely to land on the HUD when they move
        shout: '#td-callouts', combo: '#td-combo',
      };
      const box = {};
      for (const [k, sel] of Object.entries(want)) {
        const el = document.querySelector(sel);
        // NOT offsetParent: it is null for position:fixed elements, which
        // silently dropped the menu button out of every report
        if (!el || getComputedStyle(el).display === 'none') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        box[k] = r;
        console.log(`LAYOUT ${k.padEnd(9)} x ${Math.round(r.left)}..${Math.round(r.right)}`
          + `  y ${Math.round(r.top)}..${Math.round(r.bottom)}`);
      }
      const keys = Object.keys(box);
      let clashes = 0;
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          const a = box[keys[i]], b = box[keys[j]];
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox > 2 && oy > 2) {
            clashes++;
            console.log(`LAYOUT OVERLAP ${keys[i]} x ${keys[j]}`
              + ` — ${Math.round(ox)}x${Math.round(oy)}px`);
          }
        }
      }
      console.log(`LAYOUT viewport ${innerWidth}x${innerHeight} — ${clashes} overlaps`);
    }, layoutAt * 1000);
  }

  // ?charge=0..1 — park the wave clock inside the warning window, so the
  // telegraph can be seen at a chosen intensity. ?tick does not advance this
  // clock (it drives motion, not the wave scheduler), which is why the
  // countdown sat at the same value however far it was wound forward.
  const chargeAt = parseFloat(urlParams.get('charge') || '-1');
  if (chargeAt >= 0) {
    const c = Math.min(1, chargeAt);
    // stop just short of the gap: at exactly waveGap it spawns and the
    // charge you asked to look at is over before the first frame
    // arm directly and wind the countdown to the requested point: the clock
    // that matters is the armed one now, not the gap
    waveActive = false;
    interClock = params.waveGap - WAVE_WARN;
    armWave();
    waveIn = Math.max(0.05, WAVE_WARN * (1 - c));
    // report what the telegraph is actually doing: a ring a few hundred
    // pixels wide on a distant gate is not something a screenshot settles
    setTimeout(() => {
      const sp = spawnPoints.find((p2) => p2.alive);
      console.log(`CHARGE want=${c} charge=${waveCharge.toFixed(2)} waveIn=${waveIn.toFixed(2)}`
        + ` ringParticles=${warnFx.length} beatIn=${warnBeat.toFixed(2)}s`
        + ` gateScale=${sp ? (sp.obj.scale.x / (sp.obj.userData.sizeScale ?? 1)).toFixed(3) : 'n/a'}`);
    }, 1200);
  }

  // ?strike=N — N strikes ready at once, skipping the window; the ritual
  // still applies. ?strikefall=1 — arm, paint the first live gate and launch
  // after 1.2s, so the fall camera and the blast can be screenshotted.
  const strikeReady = parseInt(urlParams.get('strike') || '0', 10);
  if (strikeReady > 0) { strike.ready = strikeReady; strike.reserved = 0; }
  // ?armed=1 — hold the console ARMED, which on a phone is the only state
  // where the readout and the launch key exist at all. Without it that half
  // of the mobile layout cannot be photographed.
  if (urlParams.get('armed') === '1') {
    strike.ready = Math.max(1, strike.ready);
    strike.armed = true;
    armUiKey = ''; syncArmUi();
  }
  // ?strikecam=1 — the feed overlay + filter, held open on a static frame so
  // the STYLING can be photographed; engagement during a real fall is proven
  // by the FEED log lines instead, because a screenshot cannot reliably race
  // a 2.5s window under a virtual-time budget.
  if (urlParams.get('strikecam')) {
    setTimeout(() => {
      root.classList.add('striking');
      strikecamEl.classList.remove('hidden');
      scInfoEl.textContent = 'ORBITAL STRIKE · OTS-723\nWARHEAD 489KG · KINETIC\n'
        + 'TGT CELL 0408 · SECTOR R1\nFEED SAT-CAM 2 · LIVE\nVECTOR BURST ×1';
      scRangeEl.textContent = '0840M';
    }, 800);
  }
  if (urlParams.get('strikefall')) {
    strike.ready = Math.max(1, strike.ready);
    setTimeout(() => {
      // strikefall=enemy paints the thickest CLUSTER of live enemies instead
      // of a gate, which is how the falloff is verified against things that
      // actually move
      let ci0 = -1;
      if (urlParams.get('strikefall') === 'enemy') {
        let best = -1;
        for (const e of enemies) {
          if (!e.alive) continue;
          const r2 = cellSide * strikeTune.blastCells;
          const near = enemies.filter((o2) => o2.alive && dist3(e.pos, o2.pos) < r2).length;
          if (near > best) { best = near; ci0 = e.cur; }
        }
      }
      const sp = spawnPoints.find((q) => q.alive);
      if (ci0 < 0 && !sp) return;
      toggleArm(strike);
      paintTarget(strike, ci0 >= 0 ? ci0 : sp.ci);
      launchStrike(strike, strikeTune);
      strikeGrace = 0.25;
      // under a virtual-time budget the fall clock (frame dt) barely moves,
      // so the hook exercises the skip — which is also the code path a
      // pressed player takes, and so worth exercising anyway
      setTimeout(() => skipFall(strike), 2100);
    }, 1200);
  }

  // ?danger=1 — force the CRT warning and PIN it: under a virtual-time
  // budget the 1.9s hide-timer fires before the first paint (timers outrun
  // rAF), so a forced warning that also hides itself verifies nothing
  if (urlParams.get('danger') === '1') { dangerFlash(); clearTimeout(dangerTimer); }

  // ?callout=1 — one of each callout + a pinned combo, for layout checks
  if (urlParams.get('callout') === '1') {
    // BOTH scripts on purpose: the callout layer speaks English and
    // Japanese, and a typeface that only looks right in one of them is not
    // a typeface this game can use. The stack holds three, so the heart
    // line yields to the kana.
    showCallout(RECKLESS_MSGS[0], 'co-reckless', true);   // RECKLESS!
    showCallout(RECKLESS_MSGS[1], 'co-heart', true);      // すげ〜！
    showCallout('STREAK ×1.45', 'co-streak', true);
    ramCombo = 23; syncCombo();
    ramComboT = 9999; // pinned: the expiry timer outruns headless paints
  }

  // ?server=1 — report the antipode placement, force discovery (button check)
  if (urlParams.get('server') === '1') {
    const anti = serverCi >= 0
      ? dot3(norm3(graph.centers[serverCi]), norm3(graph.centers[dungeon.heart])).toFixed(3) : '-';
    // how close does the FULL world's carve get to the pole? If lanes never
    // reach it, the server is a landmark nobody can ever touch — a design
    // fact worth measuring, not assuming
    let fullMin = 1;
    const hc2 = norm3(graph.centers[dungeon.heart]);
    for (let i = 0; i < tdFullTags.length; i++) {
      if (tdFullTags[i] !== BLOCKED) fullMin = Math.min(fullMin, dot3(norm3(graph.centers[i]), hc2));
    }
    const clear = serverChamber.filter((ci) => dungeon.tags[ci] !== BLOCKED).length;
    console.log(`SERVER ci=${serverCi} dot=${anti}`
      + ` chamber=${clear}/${serverChamber.length} clear`
      + ` ground=${serverCi >= 0 && dungeon.tags[serverCi] !== BLOCKED ? 'OPEN' : 'sealed'}`);
    serverFound = true; run.serverFound = true; checkAchievements(); syncHackBtn();
    showBrief('relay');
    hackPromptForce = true; // pin the prompt for the layout screenshot
    // the model loads async — report again once it should be in the scene
    setTimeout(() => console.log(`SERVER2 placed=${!!serverObj}`
      + `${serverObj ? ` scale=${serverObj.scale.x.toFixed(4)}` : ''}`), 5000);
  }
  // ?hack=1|hdt|bridges|shikaku — straight into the breach (boot checks)
  const hackParam = urlParams.get('hack');
  if (hackParam) {
    serverFound = true; run.serverFound = true; checkAchievements(); syncHackBtn();
    if (HACK_GAMES[hackParam]) hackGame = hackParam;
    openHack();
  }

  // ?sitrep=1 — fabricated wave stats through the real renderer
  if (urlParams.get('sitrep') === '1') {
    resetWaveStats();
    ws.kills = { phage: 8, ghost: 5, corona: 3, barbed: 1 };
    ws.bySrc = { tank: 7, tower: 9, strike: 1 };
    ws.rams = 5; ws.leaks = 1; ws.maxMult = 1.65;
    ws.bins = [0, 2, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    ws.t0 = simTime - 42;
    showSitrep();
  }

  // ?shield=N — ignite the bubble for N seconds (visual check / playtest)
  const shieldN = parseFloat(urlParams.get('shield') || '0');
  if (shieldN > 0) { shieldT = shieldN; updateHud(); }

  // ?rank=N — jump the ladder for layout checks: grants exactly rank N's
  // requirements (kills AND elites), then renders through the normal path
  const forceRank = parseInt(urlParams.get('rank') || '0', 10);
  if (forceRank > 0) {
    const fr = Math.min(15, forceRank);
    tankKills = killReq(fr);
    tankEliteKills = eliteReq(fr);
    tankRank = rankFor(tankKills, tankEliteKills);
    refreshRankVisuals();
    // ...and report the BEAM the rank arms, because that is now the half of
    // a promotion a screenshot cannot show you: the beam only exists while
    // the trigger is held, so the numbers are the only headless evidence.
    console.log(`RANK forced=${tankRank} label=${rankLabel(tankRank)}`
      + ` kills=${tankKills} elite=${tankEliteKills}`
      + ` | BEAM ${beamStepNow.name} color=${beamStepNow.color}`
      + ` reach=${LASER_REACH} cells dps=${LASER_DPS}`
      + ` pen soft=${PEN_SOFT().toFixed(2)} hard=${PEN_HARD().toFixed(2)}`
      + ` (3 hard = ${(PEN_HARD() * 3).toFixed(2)} of ${LASER_REACH} —`
      + ` ${PEN_HARD() * 3 >= LASER_REACH ? 'STOPS it' : 'does NOT stop it'})`);
    // ...and the toe the reach solved for, with where it actually crosses.
    // Reported rather than asserted: the muzzle gap is measured off whatever
    // model loaded, and a probe that assumed it would be lying on the
    // procedural fallback.
    if (lastToe) {
      console.log(`TOE gap=${lastToe.gap.toFixed(3)} cells`
        + ` toe=${lastToe.toe.toFixed(4)} rad`
        + ` crosses at ${lastToe.at.toFixed(2)} of ${LASER_REACH} cells`
        + ` (${lastToe.at <= LASER_REACH ? 'INSIDE the reach' : 'BEYOND it — they never meet'})`
        + ` | the old fixed ${SECONDARY_TOE} would cross at`
        + ` ${crossingForToe(lastToe.gap, SECONDARY_TOE).toFixed(2)}`);
    } else console.log('TOE not applied (no gun pivots on this tank)');
  }

  // ?garrison=1 — WHERE THE OPENING TWO GO, AND WHO BUILDS THEM.
  //
  // Two claims to check and neither is visible from a screenshot: that the
  // sites are FORWARD of the heart rather than behind it, and that they
  // arrive as ISAO's orders rather than as pre-built towers. Reports the old
  // behaviour's numbers alongside, because "more forward" is a comparison.
  if (urlParams.get('garrison') === '1') {
    const heart = graph.centers[dungeon.heart];
    const gates = spawnPoints.filter((sp) => sp.alive).map((sp) => sp.ci);
    const say = (label, list) => {
      for (const ci of list) {
        let toGate = Infinity;
        for (const g of gates) {
          toGate = Math.min(toGate, dist3(graph.centers[ci], graph.centers[g]) / cellSide);
        }
        console.log(`GARRISON ${label} cell=${ci}`
          + ` ${(dist3(graph.centers[ci], heart) / cellSide).toFixed(2)} cells from the heart`
          + `, ${toGate.toFixed(2)} from the nearest gate`);
      }
    };
    // what the OLD rule picked: hug the heart, first legal wall found
    const old = [];
    for (let d = 1; d <= 4 && old.length < 2; d++) {
      for (let i = 0; i < dungeon.tags.length && old.length < 2; i++) {
        if (dungeon.tags[i] !== BLOCKED || placeError(i) || old.includes(i)) continue;
        if (graph.adj[i].some((nb) => dungeon.tags[nb] !== BLOCKED
          && dungeon.distToHeart[nb] >= 0 && dungeon.distToHeart[nb] <= d)) old.push(i);
      }
    }
    say('OLD (pre-built, hugging the heart)', old);
    say('NEW (ordered, forward)', garrisonSites(2));
    // ISAO IS A GLB, and headless rarely finishes that load — so a run with
    // no towers built means nothing unless the loader's own answer is beside
    // it. Without this line the probe cannot tell "the orders are stuck" from
    // "this environment has no drone".
    preloadFabricator().then((ok) => {
      console.log(`GARRISON fabricator loaded=${ok}`
        + `${ok ? '' : ' — headless has no drone, so nothing here can print'}`);
    });
    // and the mechanic: orders on the book, towers not yet standing
    setTimeout(() => {
      console.log(`GARRISON at t0: orders=${orders.length} towers=${towers.size ?? towers.length ?? 0}`
        + ` isao=${isao ? isao.state : 'none'}`
        + ` — ${orders.length === 2 ? 'ISAO IS BUILDING THEM' : 'NOT ordered'}`);
    }, 300);
    // ...AND THAT THEY ACTUALLY LAND. Driven by calling updateIsao directly
    // rather than by waiting: the drone's travel and print clocks advance in
    // the FRAME LOOP, and headless runs a handful of frames in a whole
    // virtual minute, so a wall-clock wait measures the renderer's frame rate
    // and calls it a build failure. (First reading did exactly that: 40s of
    // virtual time, fabricator loaded, zero towers.)
    // WAIT FOR THE DRONE, do not guess at it. A fixed 1200ms timer fired
    // before preloadFabricator resolved and reported "no drone to drive" on
    // a run where the drone arrived a moment later — a probe racing the thing
    // it is measuring.
    spawnIsao().then(() => {
      const n0 = towers.size ?? towers.length ?? 0;
      if (!isao) { console.log('GARRISON sim: no drone (fabricator never loaded)'); return; }
      let t = 0;
      for (; t < 90 && orders.length; t += 0.05) updateIsao(0.05);
      const n1 = towers.size ?? towers.length ?? 0;
      console.log(`GARRISON simulated ${t.toFixed(1)}s of drone time:`
        + ` towers ${n0} -> ${n1}, orders left ${orders.length}`
        + ` | ${n1 - n0 >= 2 ? 'ISAO BUILT BOTH' : 'DID NOT BUILD'}`);
    });
  }

  // ?ghostprobe=1 — DO ANY ENEMIES DRIFT OFF THEIR OWN POSITION?
  //
  // Operator, wave 2: "there are 2 invisible enemies. they registered as
  // hits, but are not seen." The sim and the render can disagree here — every
  // hit test uses `e.pos`, while what you SEE is `e.obj.position`, and an
  // idle-animation tick runs on the object AFTER the position is written.
  // Anything that writes an absolute component in there (rather than a local
  // offset) moves the body without moving the target.
  //
  // Reports, per live enemy, the distance between where it IS and where it is
  // DRAWN, plus whether the drawn point has fallen inside the planet — which
  // is invisible-but-alive exactly as described.
  if (urlParams.get('ghostprobe') === '1') {
    const gpWave = Math.max(1, parseInt(urlParams.get('ghostwave') || '2', 10));
    dismissIntro();
    for (let w = 0; w < gpWave; w++) spawnWave();
    for (let i = 0; i < 400; i++) releaseSpawns(0.02);
    for (let i = 0; i < 60; i++) updateEnemies(1 / 60, i / 60);
    const byType = new Map();
    for (const e of enemies) {
      if (!e.alive) continue;
      const n2 = e.pos;
      const s2 = cellSide * (e.size ?? e.spec.size);
      const lift = s2 * (e.obj.userData.lift ?? 0.85);
      const want = [n2[0] + n2[0] * lift, n2[1] + n2[1] * lift, n2[2] + n2[2] * lift];
      const p2 = e.obj.position;
      const off = Math.hypot(p2.x - want[0], p2.y - want[1], p2.z - want[2]) / cellSide;
      const r = Math.hypot(p2.x, p2.y, p2.z);
      const rec = byType.get(e.type) || { n: 0, worst: 0, buried: 0 };
      rec.n++; rec.worst = Math.max(rec.worst, off);
      if (r < 1) rec.buried++;      // drawn INSIDE the sphere: unseeable
      byType.set(e.type, rec);
    }
    for (const [t, r] of byType) {
      console.log(`GHOSTPROBE wave<=${gpWave} ${t}: ${r.n} alive`
        + ` | worst draw-vs-sim offset ${r.worst.toFixed(2)} cells`
        + ` | ${r.buried} drawn INSIDE the planet`
        + ` ${r.buried ? '<-- ALIVE AND UNSEEABLE' : 'ok'}`);
    }
  }

  // ?rockprobe=1 — HOW OFTEN IS THE BEAM TOUCHING ROCK?
  //
  // The number the WALL_STALLS ruling turns on. Walls now stall the sweep
  // flat, so if a beam on this map is almost always clipping rock, the sweep
  // is a feature that never runs. Measured rather than argued: sample open
  // cells, fire in eight directions from each, and count how many of those
  // shots find a BLOCKED cell inside the reach — at every rank's reach, since
  // reach is what changed.
  if (urlParams.get('rockprobe') === '1') {
    const open = [];
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (dungeon.tags[i] !== BLOCKED) open.push(i);
    }
    const pick = mulberry32(0x0c0ffee);
    const sample = [];
    for (let i = 0; i < Math.min(160, open.length); i++) {
      sample.push(open[Math.floor(pick() * open.length)]);
    }
    for (const st of [beamStep(0), beamStep(5), beamStep(10), beamStep(15)]) {
      const reachW = st.reach * cellSide;
      let shots = 0, clipped = 0, sumAt = 0;
      for (const ci of sample) {
        const from = norm3(graph.centers[ci]);
        // eight headings around the tangent circle, built off an arbitrary
        // but non-degenerate reference so no direction is privileged
        const ref = Math.abs(from[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        const e1 = norm3(cross3(from, ref));
        const e2 = cross3(from, e1);
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
          const dir = norm3([e1[0] * ca + e2[0] * sa, e1[1] * ca + e2[1] * sa,
            e1[2] * ca + e2[2] * sa]);
          shots++;
          for (let m = cellSide * 0.5; m <= reachW; m += cellSide * 0.5) {
            const q = arcPoint(from, dir, m);
            const ci2 = cellIndex(q);
            if (ci2 !== -1 && dungeon.tags[ci2] === BLOCKED) {
              clipped++; sumAt += m / cellSide; break;
            }
          }
        }
      }
      const pct = (100 * clipped / Math.max(1, shots)).toFixed(1);
      console.log(`ROCKPROBE reach=${st.reach}c ${st.name}`
        + ` clips rock in ${pct}% of ${shots} shots`
        + ` (mean first contact ${clipped ? (sumAt / clipped).toFixed(2) : '-'} cells)`
        + ` — the sweep runs its full arc in the other ${(100 - pct).toFixed(1)}%`);
    }
  }

  // ?rankprobe=N — THE PILOT OUTLIVES THE HULL (operator, 2026-09-02).
  // Force rank N, burn the tank, and check the ladder is still standing —
  // and that the BEAM came back the same colour, because the two are wired
  // through the same refreshRankVisuals and only one of them is visible in
  // the HUD. This is the invariant that regresses in silence: nothing else
  // in the suite would notice a stray resetTankRank() creeping back into
  // loseTank(), and the whole change is that it is not there.
  const rankProbe = parseInt(urlParams.get('rankprobe') || '0', 10);
  if (rankProbe > 0) {
    const rp = Math.min(15, rankProbe);
    tankKills = killReq(rp); tankEliteKills = eliteReq(rp);
    tankRank = rankFor(tankKills, tankEliteKills);
    refreshRankVisuals();
    const before = { rank: tankRank, kills: tankKills, step: beamStepNow.name,
      color: beamStepNow.color, reach: LASER_REACH };
    playerHP = PLAYER_MAX;     // survive the loss: we want the NEXT hull
    loseTank();
    const kept = tankRank === before.rank && tankKills === before.kills;
    const beamKept = beamStepNow.color === before.color && LASER_REACH === before.reach;
    console.log(`RANKPROBE survives-hull=${kept ? 'PASS' : 'FAIL'}`
      + ` rank ${before.rank}->${tankRank} kills ${before.kills}->${tankKills}`
      + ` | beam=${beamKept ? 'PASS' : 'FAIL'}`
      + ` ${before.step}/${before.color}/${before.reach}c ->`
      + ` ${beamStepNow.name}/${beamStepNow.color}/${LASER_REACH}c`
      + ` | (a NEW RUN still starts unranked — that reset lives in regenerate)`);
  }

  // ?gateprobe=1 — report a live gate's geometry: drawRange, and where its
  // horizon dots actually sit. The horizon rendered in the module bench, so
  // if it is missing in game the difference is in THIS file's handling.
  if (urlParams.get('gateprobe')) {
    // rAF-counted, not timer-based: under a virtual-time budget every timer
    // can fire before the FIRST frame renders, and the first cut of this
    // probe reported dial=0 on a gate that simply had not been given a frame
    let gpFrames = 0;
    const gpWait = () => {
      gpFrames++;
      if (gpFrames === 3) {
        // then FORCE formation and tick once — swiftshader cannot render 70
        // frames inside the watchdog, and the question is whether the game
        // path positions the horizon, not how fast headless paints
        const sp = spawnPoints.find((q) => q.alive);
        if (sp && sp.obj.userData.setForm) {
          sp.obj.userData.dial = 1;
          sp.obj.userData.setForm(1);
          sp.obj.userData.tick(2.2);
          gpReport();
        }
      }
      if (gpFrames < 3) requestAnimationFrame(gpWait);
    };
    requestAnimationFrame(gpWait);
    const gpReport = () => {
      const sp = spawnPoints.find((q) => q.alive);
      if (!sp) { console.log('GATE none'); return; }
      const g = sp.obj.geometry;
      const a = g.getAttribute('position');
      const H0 = 435;
      let minR = Infinity, maxR = 0, zeros = 0;
      for (let i = H0; i < a.count; i++) {
        const r = Math.hypot(a.getX(i), a.getY(i), a.getZ(i));
        if (r < 1e-6) zeros++;
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      }
      console.log(`GATE count=${a.count} drawRange=${g.drawRange.count}`
        + ` dial=${sp.obj.userData.dial} horizonR=${minR.toFixed(3)}..${maxR.toFixed(3)}`
        + ` zeros=${zeros} scale=${sp.obj.scale.x.toFixed(3)}`);
      // positions passed three probes while the screen stayed empty — so
      // this pass checks everything ELSE a dot needs: color, material,
      // visibility, and where it lands on SCREEN through the live camera
      const cAttr = g.getAttribute('color');
      const cs = [];
      for (const i of [H0, H0 + 1, H0 + 80, H0 + 173, 0, 200]) {
        cs.push(`i${i}=(${cAttr.getX(i).toFixed(2)},${cAttr.getY(i).toFixed(2)},${cAttr.getZ(i).toFixed(2)})`);
      }
      const m = sp.obj.material;
      console.log(`GATE2 ${cs.join(' ')} matCol=${m.color.getHexString()}`
        + ` op=${m.opacity} vis=${sp.obj.visible} size=${m.size}`);
      sp.obj.updateWorldMatrix(true, false);
      const scr = [];
      for (const i of [H0, H0 + 80, H0 + 173, 0]) {
        const v = new THREE.Vector3(a.getX(i), a.getY(i), a.getZ(i))
          .applyMatrix4(sp.obj.matrixWorld).project(camera);
        scr.push(`i${i}=(${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(3)})`);
      }
      console.log(`GATE3 screen ${scr.join(' ')}`);
    };
  }

  const tutSteps = parseInt(urlParams.get('tutstep') || '0', 10);
  if (runTutorial && tutSteps > 0) {
    let left = tutSteps;
    // Wait for the PHASE to change before clearing the next pair. A fixed
    // delay looks right and is not: under a virtual-time budget the timer
    // chain runs far faster than the render loop, so two clears land between
    // one pair of ticks, the phase advances once, and the run silently ends
    // up short. Poll the thing being driven, never a clock.
    const step = () => {
      if (left-- <= 0) return;
      tutorial.frozen = false;   // the opening hold would swallow the first
      for (const e of tutorial.fodder) {
        if (e.alive) { e.alive = false; scene.remove(e.obj); }
      }
      // Drive the phase machine DIRECTLY rather than waiting for animate()
      // to notice. Under a virtual-time budget, timers run on virtual time
      // while requestAnimationFrame is throttled, so a wait-for-the-loop
      // poll times out and the run silently ends up a phase or two short —
      // which is exactly how this hook failed the first two times.
      tutorial.tick(1 / 60);   // register the clear — this opens the beat
      tutorial.tick(TUT_BEAT + 1);  // ...and run the beat out, so the next
                                    // lesson has actually landed to look at
      setTimeout(step, 120);
    };
    setTimeout(step, 900);
  }

  resize();
  animate();

  return {
    setActive(on) {
      active = on;
      if (!on) stopEngine(0.1, true); // quiet: leaving the tab is not a landing
      if (on) { resize(); snapCamera(); }
      else if (wasPlaying) {
        wasPlaying = false;
        document.body.classList.remove('playing');
      }
    },
  };
}
