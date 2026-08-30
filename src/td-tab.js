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
import { generateSphereMesh, relax } from './grid.js?v=9c765933';
import { generateDungeon, bfsDist, BLOCKED, PATH, ROOM } from './dungeon.js?v=9c765933';
import { mulberry32, randomSeed } from './rng.js?v=9c765933';
import { sub3, add3, scale3, dot3, cross3, norm3, len3, dist3, segKey } from './vec3.js?v=9c765933';
import { CREATURES, waveJelly } from './creatures.js?v=9c765933';
import { UNITS, UNIT_NAMES, buildUnit, buildCreature, preloadMkcx, preloadServer, makeServerFixture, makeBulletCloud, makeRewardSolid, makeShellSolid, makeDebris, makeDotBurst, makePortalCloud, makeHeartCloud, makeDotEnemy } from './units.js?v=9c765933';
import { LOOKS, LOOK_NAMES } from './looks.js?v=9c765933';
import { makeCellIndex } from './cellindex.js?v=9c765933';
import { CREATURE_TINTS, ENEMY_SPEC, INTROS, computeWavePlan } from './enemyspec.js?v=9c765933';
import { PICKUPS } from './pickups.js?v=9c765933';
import { rankFor, rankLabel, badgeSVG, killReq, eliteReq } from './ranks.js?v=9c765933';
import { makeScore } from './score.js?v=9c765933';
import { TOWERS, TOWER_BY_KEY, MAX_TIER, upgradeCost, effectiveStats, pickTarget, shotInterval, unlockedTowerKeys, towerUnlockWave, TOWER_ORDER } from './towers.js?v=9c765933';
import { makeEconomy, sellRefund } from './economy.js?v=9c765933';
import { makeBloom } from './postfx.js?v=9c765933';
import { TANK_FEEL, TANK_FEEL_KNOBS, makeTankFeel, stepTankFeel, landTankFeel, fireTankFeel, applyTankFeel, applyTankHealth } from './tankfeel.js?v=9c765933';
import { FEEL, loadFeel, saveFeel } from './feelstore.js?v=9c765933';
import { STRIKE_KNOBS, makeStrike, makeStrikeParams, grantStrikes, stepStrike,
  toggleArm, paintTarget, launchStrike, stepFall, skipFall, fallProgress,
  strikeDamage, retargetStrike, orbitProgress } from './strike.js?v=9c765933';
import { radarBasis, radarProject, radarBearing, sweepAngle, radarPhosphor } from './radar.js?v=9c765933';
import { BLOOM_GROUPS } from './bloomweights.js?v=9c765933';
import { TOWER_LOOK_NAMES, DEFAULT_TOWER_LOOK, buildTowerLook, preloadLook } from './towerlooks.js?v=9c765933';
import { makeAudio } from './audio.js?v=9c765933';
import { DEATH_KEYS } from './audiomanifest.js?v=9c765933';

export function initTdTab(root) {
  let active = false;
  let wasPlaying = false; // drives body.playing (mobile hides ALL chrome)

  const params = {
    towerLook: DEFAULT_TOWER_LOOK,
    seed: 7,
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
    const mScale = strike.armed ? 0.52 : 0.32;
    const mCap = strike.armed ? 430 : 240;
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
  // THE SERVER: an invincible fixture at the heart's exact antipode.
  // Finding it offers the HACK — the HDT circuit duel in an overlay —
  // and a win decrypts the next tower ahead of its wave gate.
  let serverObj = null, serverCi = -1, serverGen = 0;
  let serverChamber = []; // the carved vault: floor cells, walls all round
  let serverFound = false, hackedRound = false, hackedUnlocks = 0;
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
  // The tank's field promotion. Only hands-on kills climb it — towers and
  // orbital strikes pay credits, not respect — and the ladder belongs to
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
    'TIGHT!', '接近だ！', 'FEARLESS!', '接近過ぎ！'];
  const HEART_MSGS = ['PROTECT THE HEART!', 'LIVING DANGEROUSLY!',
    'NEED SAFETY BUFFER!', 'LAST LINE HOLDS!'];
  let recklessIdx = 0, heartIdx = 0;
  let heartCalloutCd = 0;   // seconds; near-heart kills happen in bursts
  let streakMark = 0;       // last streak milestone already called out
  let ramCombo = 0, ramComboT = 0;  // count-up + its expiry window
  const RAM_COMBO_GAP = 4;
  // SitRep bookkeeping: everything the end-of-wave recap reports. Bins are
  // 3s buckets of kill tempo — the sparkline is drawn from them.
  let ws = null;
  function resetWaveStats() {
    ws = { t0: simTime, kills: {}, bySrc: { tank: 0, tower: 0, strike: 0 },
      rams: 0, points0: score.points, maxMult: 1, leaks: 0,
      bins: new Array(16).fill(0) };
  }
  function noteWaveKill(type, src) {
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

  function freeBlocked(cand) {
    const ci = cellIndex(cand);
    // the SERVER is solid: a machine you can drive through is a prop, not
    // a fixture (operator field report — the tank phased clean through)
    if (ci === -1 || dungeon.tags[ci] === BLOCKED || ci === serverCi) return true;
    // wide ground keeps the clipping margin; narrow halls trade a little
    // visual overlap for guaranteed passability
    const margin = cellSide * (openCount(ci) <= 3 ? 0.45 : 0.62);
    for (const nb of graph.adj[ci]) {
      if ((dungeon.tags[nb] === BLOCKED || nb === serverCi)
        && dist3(cand, graph.centers[nb]) < margin) return true;
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
  const keys = { left: false, right: false, fast: false, slow: false, laser: false };
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

  const camGoal = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
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
    serverObj = null; serverFound = false;

    // the Braille heart: dot-cloud cycling twinkle → breathe → jelly,
    // flaring orange/red under Wave when hit
    heartSprite = makeHeartCloud(new THREE.Color(look().heart).getHex());
    scene.add(heartSprite);
    // the server sits at the cell whose centre is FARTHEST round the
    // sphere from the heart — the literal antipode, found by minimum dot
    {
      // serverCi was chosen at world build (applySector needs it);
      // this block only casts and seats the model
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
    const hPos = add3(hc, scale3(hn, params.wallHeight * 0.6 + cellSide * 0.55));
    heartSprite.position.set(hPos[0], hPos[1], hPos[2]);
    heartSprite.userData.sizeScale = cellSide * 1.15;
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
  const REVEAL_LEN = 3.2;
  let revealLeft = 0;
  let revealDir = null;
  let revealCells = [];
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
    params.view = v;
    buildMode = v === 'orbit';
    watchTower = null;
    const camBtn = root.querySelector('#td-pad-view');
    if (camBtn) camBtn.textContent = VIEW_TAG[v] || 'T3';
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

  function updateCameraGoal() {
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
    if (revealLeft > 0 && revealDir) {
      // cinematic: whole planet in frame, the new band centered
      const ref = Math.abs(revealDir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const up = norm3(cross3(revealDir, ref));
      const eye = scale3(revealDir, 3.3);
      camGoal.pos.set(eye[0], eye[1], eye[2]);
      tmpCam.position.copy(camGoal.pos);
      tmpCam.up.set(up[0], up[1], up[2]);
      tmpCam.lookAt(0, 0, 0);
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
  function tangentDirTo(from, to) {
    const n = graph.normals[from];
    const d = sub3(graph.centers[to], graph.centers[from]);
    const t = sub3(d, scale3(n, dot3(d, n))); // project onto tangent plane
    return norm3(t);
  }

  function openNeighbors(ci) {
    // towers block PATHING for everyone — they are the walls you buy
    return graph.adj[ci].filter((nb) => dungeon.tags[nb] !== BLOCKED && !towerCells.has(nb));
  }

  // --- the wanderer: exit choice = steering bias + its own whims -----------
  // Scored, not commanded: alignment with the steering intent dominates when
  // the player is actively steering, but unvisited-cell curiosity, a
  // backtrack penalty, and noise keep the walker willful.
  function chooseNext() {
    const exits = openNeighbors(player.cur);
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
        if (upgradeTower(sel)) {
          if (shopCi !== -1) openShop(shopCi); // refresh the radial
        } else if (shopCi !== -1) {
          flashShopNote(upgradeCost(sel.def, sel.tier) === null ? 'max tier' : 'not enough credit');
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
    if (down && k === 'escape') { togglePause(); ev.preventDefault(); return; }
    if (paused) return; // frozen: only ESC gets through
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
  const VIEW_TAG = { pov: 'T1', third: 'T3', orbit: 'O1' };
  function toggleView() {
    const cycle = ['pov', 'third', 'orbit'];
    setView(cycle[(cycle.indexOf(params.view) + 1) % cycle.length]);
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
  root.querySelector('#td-pad-view').addEventListener('click', () => toggleView());
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
  function syncArmUi() {
    // narrate the state; write the DOM only when the state actually moves
    const orbit = strike.reserved > 0 ? Math.round(strike.gauge * 100) : -1;
    const reorbit = strike.cooldown > 0 ? Math.round(orbitProgress(strike) * 100) : -1;
    const key = `${strike.armed}|${strike.target}|${strike.ready}|${strike.reserved}|${orbit}|${reorbit}`;
    if (key === armUiKey) return;
    armUiKey = key;
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
  }

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
        const eObj = makeDotEnemy('phage', { walker: CREATURE_TINTS.phage, walkerHi: 0xffffff });
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
    else if (cl.contains('msg-next')) { round++; hackedRound = false; syncHackBtn(); expandRound(); }
    else if (cl.contains('msg-begin')) { paused = false; msgEl.classList.add('hidden'); }
    else if (cl.contains('msg-glenemy')) showEnemyGlossary();
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

  const heartIcon = () => {
    const h = makeHeartCloud(new THREE.Color(look().heart).getHex());
    h.userData.kind = 'heart';
    h.userData.tick(1.2);
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
      glossCard('#ff6a88', spriteShot('heart', heartIcon), 'the heart', 'at the pole — its fall is the only defeat') +
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
      `<button class="msg-glfriend">pickups</button><br>` +
      `<button class="msg-begin">&rsaquo; begin round ${round}</button>` +
      `</div>`;
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
      glossCard('#ff6a88', spriteShot('heart', heartIcon), 'the heart', `${HEART_MAX} hp · enemy contact drains it · regen charges heal it`) +
      glossCard('#9fdcff', spriteShot('tower-' + params.towerLook, () => buildTowerLook(params.towerLook, TOWER_BY_KEY.single)), 'towers', 'mount on walls only · tap high ground in BUILD mode · upgrade twice · sell 75%') +
      glossCard('#ffb000', spriteShot('triad', makeTriadIcon), 'missile triad', '+3 shells on touch (rack caps at 9) — the ONLY ammo pickup') +
      glossCard('#9ff8ff', spriteShot('orb-power', orbIcon('star', 0x9ff8ff)), 'power sphere', 'far-field reward · +8% speed, permanent') +
      glossCard('#3dff6e', spriteShot('orb-health', orbIcon('cell', 0x3dff6e)), 'health sphere', 'far-field reward · +1 your hp') +
      glossCard('#ff2df0', spriteShot('orb-regen', orbIcon('ring', 0xff2df0)), 'regen charge', 'CARRY it back near the heart: +4 heart hp') +
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
    setHackGame(hackGame);
    hackWrapEl.classList.remove('hidden');
    clearInterval(hackPoll);
    hackPoll = setInterval(() => {
      const ph = readHackPhase();
      if (ph === 'won') closeHack(true);
      else if (ph === 'lost') closeHack(false);
    }, 600);
  }
  function setHackGame(g) {
    if (!HACK_GAMES[g]) g = 'hdt';
    hackGame = g;
    if (hackFrameEl) hackFrameEl.src = HACK_GAMES[g].src;
    for (const b of root.querySelectorAll('.hk-tab')) {
      b.classList.toggle('active', b.dataset.hack === g);
    }
  }
  for (const b of root.querySelectorAll('.hk-tab')) {
    b.addEventListener('click', () => setHackGame(b.dataset.hack));
  }
  function closeHack(won) {
    clearInterval(hackPoll); hackPoll = null;
    if (hackWrapEl) hackWrapEl.classList.add('hidden');
    if (hackFrameEl) hackFrameEl.src = 'about:blank';
    paused = false;
    if (won === true) {
      hackedRound = true;
      hackedUnlocks++;
      const ks = unlockedTowerKeys(wave + hackedUnlocks);
      showTowerToast(ks[ks.length - 1]);
      showToast(`<div class="wave-num">FIRMWARE PATCHED</div>`
        + `<div class="wave-role">schematics decrypted — a tower unlocked ahead of its wave</div>`, 3400);
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
  function showCallout(text, cls, pin = false) {
    if (!calloutsEl) return;
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
  function syncCombo() {
    if (!comboEl) return;
    if (ramCombo < 2) { comboEl.classList.add('hidden'); return; }
    comboEl.textContent = `RAM ×${ramCombo}`;
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
    if (st >= streakMark + 5) {
      streakMark = st - (st % 5);
      showCallout(`STREAK ×${eco.multiplier().toFixed(2)}`, 'co-streak');
    }
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
      + `<div class="sr-line">POINTS +${score.points - ws.points0}`
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
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), ms);
  }
  // switching back to driving: a brief, non-pausing reminder of the mode model
  function showOverrideModal() {
    showToast(`<div class="wave-num">MANUAL</div>` +
      `<div class="wave-role">you're driving — tap a directive to hand the wheel to auto</div>`);
  }
  // The instrument panel. Three reading distances, three brightness tiers:
  // vitals bright and big (sub-second combat reads), resources mid (credit
  // orange as ever, the wave numeral the largest thing on the panel), meta
  // and objectives dim. The who-is-driving line is GONE from the panel —
  // control state lives ON the AUTO button now, where the control is.
  function updateHud() {
    const spAlive = spawnPoints.filter((s) => s.alive).length;
    const alerts = [carryingRegen ? '⬤ REGEN CARRIED' : '',
      cannonHeat > 0 ? 'CANNON HOT' : '',
      laserOverheat ? 'LASER COOLING' : ''].filter(Boolean).join(' · ');
    const hearts = `<span class="hp-heart">${'♥'.repeat(Math.max(0, heartHP))}</span>`
      + `<span class="hp-dim">${'·'.repeat(Math.max(0, HEART_MAX - heartHP))}</span>`;
    statsEl.innerHTML =
      `<div class="hud-meta">SCORE <b>${score.points}</b> · BEST ${score.best}`
      + `${rankBadgeHud ? ' ' + rankBadgeHud : ''}</div>`
      + `<div class="hud-vitals">${hearts} <span class="hud-lbl">HEART</span>`
      + ` <span class="hp-you">♥${playerHP}</span>`
      + ` <span class="hp-ammo${ammo === 0 ? ' out' : ''}">✦${ammo}</span></div>`
      + `<div class="hud-res"><span class="hud-credit">${eco.credit}c`
      + ` ×${eco.multiplier().toFixed(2)}</span>`
      + `<span class="hud-wave">WAVE <b>${wave}</b> · R${round}</span></div>`
      + `<div class="hud-obj">portals ${spAlive}/${spawnPoints.length}`
      + ` · built ${towers.length} · ${Math.min(8, Math.max(0, wave + hackedUnlocks))}/8 towers</div>`
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
  function autoGunner(tNow) {
    // any camera: watching from orbit must not stand your own gun down
    if (manualActive() || player.won || playerDown || paused) return;
    if (ammo <= 0 || cannonHeat > 0) return;
    const R = cellSide * 3.0;
    const shellsForAll = params.directive !== 'conserve' && params.directive !== 'ram';
    let target = null, bd = R;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (!shellsForAll && e.spec.rammable) continue;
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
    const frozen = buildFrozen() || revealLeft > 0;
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
    // a regenerate is a FRESH RUN: sector 1, towers gone, fresh purse.
    // (Round expansion never comes through here — expandRound reveals the
    // same world in place, towers standing.) Clear towers first: stale
    // towerCells would poison openNeighbors during board generation.
    round = 1;
    clearTowers();
    // opening purse: exactly a Rapid (70c) + a Slow (100c) — your first plan
    eco = makeEconomy({ startCredit: 170 });
    score.reset();
    hackedUnlocks = 0; hackedRound = false; syncHackBtn();
    bossCued = false;
    dangerWarnedWave = -1;
    heartCalloutCd = 0; streakMark = 0;
    ramCombo = 0; ramComboT = 0; syncCombo();
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
    placeActors();
    // a fresh board earns a fresh framing — the first-entry courtesy resets
    buildCentered = false;
    if (buildMode) { centerBuildOnHeart(); buildCentered = true; }
    snapCamera();
    paused = false;
    cruise = false;
    msgEl.classList.add('hidden');
    updateHud();
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
    hideSitrep(); // the telegraph outranks the recap
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
      let pi = 0;
      for (const { type, count } of plan.entries) {
        const spec = ENEMY_SPEC[type];
        for (let k = 0; k < count; k++) {
          const sp = live[pi % live.length]; pi++;
          const obj = makeDotEnemy(type, { walker: CREATURE_TINTS[type], walkerHi: 0xffffff });
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
            hp: spec.hp, behMult: 1, behUntil: -1, touchCd: -1,
            slowFactor: 1, slowUntil: -1,
          });
        }
      }
    }
    updateHud();
  }

  const ENEMY_SPEED = 1.0; // cells/s toward the Heart — FASTER still
  function updateEnemies(dt, tNow) {
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
      let pace = ENEMY_SPEED * spec.speed;
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
          syncCombo();
          if (ramCombo >= 10 && ramCombo % 10 === 0) {
            showCallout(`RAM ×${ramCombo}`, 'co-milestone');
          }
          noteStreak();
          creditTankKill(spec);
          killCreature(e, true);
          checkVictory();
          continue;
        }
        if (tNow > e.touchCd) { e.touchCd = tNow + 1.2; playerHit(); }
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
  function refreshRankVisuals() {
    rankBadgeHud = tankRank > 0
      ? `<span class="hud-rank" title="${tankKills} hands-on kills`
        + `${tankEliteKills ? ` · ${tankEliteKills} elite` : ''}">`
        + `${badgeSVG(tankRank, 22)} ${rankLabel(tankRank)}</span>`
      : '';
    updateHud();
  }
  function creditTankKill(spec) {
    tankKills++;
    if (!spec.rammable) tankEliteKills++;
    const r = rankFor(tankKills, tankEliteKills);
    if (r !== tankRank) {
      tankRank = r;
      refreshRankVisuals();
      showToast(`<div class="wave-num">PROMOTED · ${rankLabel(r)}</div>`
        + `<div class="wave-role">${tankKills} hands-on kills</div>`, 2200);
    } else updateHud();
  }
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
      if (src === 'tank') creditTankKill(spec);
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
  const laserBtnEl = root.querySelector('#td-pad-laser');
  let laserBtnBand = -1, laserDrainPct = -1;
  const LASER_RATE = 0.14;    // s between bursts (guns alternate)
  const LASER_DMG = 0.4;      // fodder: 3 grazes; corona: 5 — weak on purpose
  const LASER_MAX_HEAT = 2.4; // s of continuous fire before lockout
  const LASER_COOL = 1.4;     // heat shed per second (lockout ≈ 1.7 s)
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
    const wantFire = keys.laser && guns && !player.won && !playerDown;
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
      laserClock += dt;
      if (laserClock >= LASER_RATE) {
        laserClock = 0;
        sfx.play('tank_secondary'); // 7/s — a tick, not a blast
        const gun = guns[laserSide ^= 1];
        gun.getWorldPosition(tmpV);
        const pos = norm3([tmpV.x, tmpV.y, tmpV.z]); // down to the unit sphere
        gun.getWorldQuaternion(tmpQ);
        tmpV.set(0, 0, 1).applyQuaternion(tmpQ);
        const n = pos;
        const d = [tmpV.x, tmpV.y, tmpV.z];
        const dir = norm3(sub3(d, scale3(n, dot3(d, n))));
        const mesh = makeTracer(0xbfefff, 7, 3);
        scene.add(mesh);
        laserShots.push({ pos, dir, dist: 0, mesh });
      }
    } else {
      laserClock = LASER_RATE; // first bolt leaves the instant you squeeze
    }
    const v = 5.2 * cellSide;
    const maxDist = 2.6 * cellSide;
    for (let i = laserShots.length - 1; i >= 0; i--) {
      const p = laserShots[i];
      p.pos = norm3(add3(p.pos, scale3(p.dir, v * dt)));
      const n = p.pos;
      p.dir = norm3(sub3(p.dir, scale3(n, dot3(p.dir, n))));
      p.dist += v * dt;
      const lift = 1 + params.wallHeight * 0.5;
      // head at the bolt, ghosts strung behind along the flight line
      const attr = p.mesh.geometry.getAttribute('position');
      for (let k = 0; k < attr.count; k++) {
        const off = k * cellSide * 0.085;
        attr.setXYZ(k, (p.pos[0] - p.dir[0] * off) * lift,
          (p.pos[1] - p.dir[1] * off) * lift,
          (p.pos[2] - p.dir[2] * off) * lift);
      }
      attr.needsUpdate = true;
      let dead = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (dist3(p.pos, e.pos) < cellSide * Math.max(0.4, (e.size ?? e.spec.size) * 0.8)) {
          damageEnemy(e, tNow, LASER_DMG, false, 'tank');
          dead = true;
          break;
        }
      }
      if (!dead) {
        const ci = cellIndex(p.pos);
        if ((ci !== -1 && dungeon.tags[ci] === BLOCKED) || p.dist > maxDist) dead = true;
      }
      if (dead) killLaser(i);
    }
  }

  // --- firing: the shot leaves along the turret's CURRENT sweep ------------
  function fire(aimDir = null) {
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
          damageEnemy(e, tNow, 1, true, 'tank');
          // a shell is not a bullet: mortar-class AoE (operator ruling —
          // it used to clip 0.95 cells for half damage; now 1.6 cells with
          // falloff). No on-hit reactions on the splash — the graze must
          // not keep barbed/knot permanently accelerated — and tank-rate
          // pay, because the tank fired it.
          const SHELL_R = cellSide * 1.6;
          for (const e2 of enemies) {
            if (e2 === e || !e2.alive) continue;
            const d2 = dist3(p.pos, e2.pos);
            if (d2 < SHELL_R) {
              damageEnemy(e2, tNow, d2 < SHELL_R * 0.5 ? 0.75 : 0.4, false, 'tank');
            }
          }
          // splash you can SEE: the strike's ring language at shell scale
          const sci = cellIndex(p.pos);
          if (sci !== -1) {
            warnRing(sci, 0xfff2c0, 0.5, SHELL_R * 1.05);
            warnRing(sci, 0xffb347, 0.35, SHELL_R * 0.6);
          }
          const clip = makeDotBurst(0xfff2c0, norm3(p.pos), 48);
          clip.scale.setScalar(cellSide * 1.1);
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
            sp.hp--;
            sp.found = true;
            hit = true;
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
      if (r.type === 'health' || r.type === 'regen') {
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
    setTimeout(() => {
      if (player.won || !playerMesh) return; // a real death happened meanwhile
      playerMesh.visible = true;
      playerDown = false;
      feel.hoverT = 0;
      landTankFeel(feel);   // it drops back in and settles
    }, DEATH_HOLD * 1000);
  }

  function loseGame(reason) {
    if (player.won) return;
    player.won = true; // stops motion; same flag, sadder modal
    destroyPlayer();
    ramCombo = 0; ramComboT = 0; syncCombo(); // no brag over a lost heart
    msgEl.innerHTML = `<div class="msg-head">transmission · last light</div>` +
      `× ${reason}<br>` +
      `${enemies.filter((e) => !e.alive).length}/${enemies.length} enemies destroyed · ` +
      `heart ${Math.max(0, heartHP)}/${HEART_MAX}<br>` +
      `score ${score.points}${score.points >= score.best && score.points > 0
        ? ' · NEW BEST' : ` · best ${score.best}`}<br>` +
      `<button class="msg-regen">⟲ new sector</button>`;
    // let the wreck play before the modal covers it
    setTimeout(() => msgEl.classList.remove('hidden'), DEATH_HOLD * 1000);
  }

  function playerHit() {
    playerHP--;
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
  function loseTank() {
    const stripped = tankRank > 0 ? rankLabel(tankRank) : '';
    destroyPlayer();
    resetTankRank(); // the insignia belonged to that hull
    ramCombo = 0; ramComboT = 0; syncCombo(); // the combo died with it too

    setTimeout(() => {
      if (player.won || !playerMesh) return;   // a real death happened meanwhile
      // back to the entry point, facing the heart, engine cold
      respawnPlayerAtSpawn();
      playerMesh.visible = true;
      playerDown = false;
      feel.hoverT = 0;
      landTankFeel(feel);
      applyTankHealth(playerMesh, playerHP / PLAYER_MAX);
      if (!buildMode) { setView('orbit'); snapCamera(); }
      showToast(`<div class="wave-num">TANK LOST</div>`
        + `<div class="wave-role">${playerHP} left`
        + `${stripped ? ` · ${stripped} insignia lost` : ''}`
        + ` — regroup, then drive out</div>`, 2600);
    }, DEATH_HOLD * 1000);
  }

  // Respawn beside the HEART, not at the spawn gate. The gate is enemy
  // ground by the time you die — a wave is usually pouring out of it — so
  // the old respawn put the wreck straight back into the thing that made it
  // a wreck, and sometimes BEHIND a portal with the wave between you and
  // home. You come back at the thing you are defending, facing outward.
  function respawnPlayerAtSpawn() {
    let ci = dungeon.heart;
    outer:
    for (let d = 1; d <= 3; d++) {
      for (let i = 0; i < dungeon.tags.length; i++) {
        if (dungeon.tags[i] !== BLOCKED && !towerCells.has(i)
          && dungeon.distToHeart[i] === d) { ci = i; break outer; }
      }
    }
    player.freeMode = false;
    player.virtualStart = null;
    player.cur = ci;
    player.prev = -1;
    player.pos = graph.centers[ci].slice();
    player.prog = 0;
    const exits = openNeighbors(ci);
    let e0 = exits[0] ?? ci;
    // OUTWARD, not heartward: you respawn defending, so you are pointed back
    // at the war. Beside the heart, "toward" would aim you into the thing
    // you are protecting.
    for (const e of exits) {
      if (dungeon.distToHeart[e] === dungeon.distToHeart[ci] + 1) { e0 = e; break; }
    }
    player.next = e0;
    player.heading = tangentDirTo(ci, e0);
    player.travelDir = player.heading.slice();
    player.smoothDir = player.travelDir.slice();
    player.segLen = Math.max(1e-9, dist3(graph.centers[ci], graph.centers[e0]));
    throttle = 0; cruise = false; paintThrottle();
    stopEngine(0.1, true);
  }

  function heartHit(dmg = 1) {
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
  // Points are not credits: the scoreboard triples tank kills and scales
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
      placeTowerObj(tower);
      scene.add(tower.obj);
    }
  }

  function placeTower(key, ci) {
    const def = TOWER_BY_KEY[key];
    if (!def) return false;
    const err = placeError(ci);
    if (err) { flashShopNote(err); return false; }
    if (!eco.spend(def.cost)) { flashShopNote('not enough credit'); return false; }
    const obj = buildTowerLook(params.towerLook, def);
    const tower = { key, def, tier: 0, ci, obj, cooldown: 0, spent: def.cost };
    placeTowerObj(tower);
    scene.add(obj);
    towers.push(tower);
    towerByCell.set(ci, tower);
    towerCells.add(ci);
    showRangeRing(ci, effectiveStats(def, 0).range, def.color, 1.6);
    updateHud();
    return true;
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
    eco.addCredit(sellRefund(tower.spent));
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
    let center, items;
    if (existing) {
      const cost = upgradeCost(existing.def, existing.tier);
      center = `<div class="radial-center">${existing.def.key}<br>tier ${existing.tier}</div>`;
      items = [
        cost !== null
          ? { cls: 'shop-up', txt: `upgrade<br>${cost}c`, dis: !eco.canAfford(cost) }
          : { cls: 'shop-up', txt: 'MAX', dis: true },
        { cls: 'shop-sell', txt: `sell<br>+${sellRefund(existing.spent)}c` },
        { cls: 'shop-close', txt: '×' },
      ];
      showRangeRing(ci, effectiveStats(existing.def, existing.tier).range, existing.def.color, 0);
    } else {
      const err = placeError(ci);
      center = `<div class="radial-center">${err ? 'blocked' : eco.credit + 'c'}</div>`;
      const unlocked = new Set(unlockedTowerKeys(wave + hackedUnlocks));
      items = TOWERS.map((def) => {
        const locked = !unlocked.has(def.key);
        return {
          cls: locked ? 'shop-buy locked' : 'shop-buy',
          key: def.key,
          txt: locked ? `${def.key}<br>W${towerUnlockWave(def.key)}` : `${def.key}<br>${def.cost}c`,
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
        `${it.key ? ` data-key="${it.key}"` : ''}${it.dis ? ' disabled' : ''} ` +
        `style="left:${x}px;top:${y}px;${it.bc ? `border-color:${it.bc}aa;` : ''}">${it.txt}</button>`;
    }).join('') + `<div class="shop-note" style="top:${R + 44}px">one new tower each wave</div>`;
    shopEl.classList.remove('hidden');
  }
  shopEl.addEventListener('click', (ev) => {
    const el = ev.target;
    if (!el.classList) return;
    if (el.classList.contains('shop-close')) { closeShop(); return; }
    const tower = towerByCell.get(shopCi);
    if (el.classList.contains('shop-buy') && shopCi !== -1) {
      if (el.classList.contains('locked') || el.hasAttribute('disabled')) return;
      if (placeTower(el.dataset.key, shopCi)) closeShop();
    } else if (el.classList.contains('shop-up') && tower) {
      if (upgradeTower(tower)) openShop(shopCi); // refresh
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

  function checkVictory() {
    if (player.won || tutorialActive) return; // the tutorial is failure/win-proof
    if (spawnPoints.length > 0 && spawnPoints.every((s) => !s.alive) && enemies.every((e) => !e.alive)) {
      player.won = true;
      msgEl.innerHTML = `<div class="msg-head">transmission · combat log</div>` +
        `✦ SECTOR ${round} CLEARED — every portal destroyed<br>` +
        `${wave} waves · heart ${heartHP}/${HEART_MAX} · ` +
        `${towers.length} towers standing · ${eco.credit}c<br>` +
        `<button class="msg-next">&rsaquo; breach sector ${round + 1} — bigger, farther, meaner</button>`;
      msgEl.classList.remove('hidden');
    }
  }

  // sector expansion (HokorobiTawaa's fraying): FLASH WHITE, unseal the
  // next band of the SAME world, re-seed pickups into the new ground,
  // raise fresh portals farther out. Towers and credit persist.
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
    revealLeft = REVEAL_LEN;
    buildGeometry();
    syncServerLift();
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
  const viewCtrl = gui.add(params, 'view', ['pov', 'third', 'orbit'])
    .name('camera (V)').onChange((v) => setView(v));
  const speedCtrl = gui.add(params, 'speed', 0.2, 4, 0.1).name('wander speed');
  const directiveCtrl = gui.add(params, 'directive', DIRECTIVES).name('auto directive').onChange(syncDirectiveChip);
  gui.add(params, 'recoil', 0, 8, 0.1).name('shell recoil');
  gui.add(params, 'waveSize', 1, 6, 1).name('wave size').onFinishChange(regenerate);
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
    requestAnimationFrame(animate);
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

    // paused: keep presenting the frozen frame (both views), zero sim.
    // lastFrame keeps updating above so resume has no dt spike.
    if (paused) {
      playerMesh.visible = params.view !== 'pov';
      postfx.render();
      playerMesh.visible = true;
      drawRadar(t);   // the sweep keeps turning; a dead scope reads as a crash
      return;
    }
    t += dt;

    // BUILD downtime: with the field clear, build mode freezes the WAR —
    // wave clock, motion, combat — while ambient life (portal twinkle,
    // heart moods, debris) and the camera transition keep breathing.
    // Mid-assault the same toggle is camera-only.
    if (revealLeft > 0) {
      revealLeft -= dt;
      if (revealLeft <= 0) {
        revealLeft = 0;
        // the new ground cools back to its true colors; planning begins
        for (const ci of revealCells) paintCell(ci, floorColorOf(ci));
        revealCells = [];
        if (!buildMode) setView('orbit');
        updateHud();
      }
    }
    // first laser input thaws the frozen tutorial opening — checked BEFORE the
    // frozen gate, since updateLasers itself is skipped while frozen
    if (tutorial.frozen && keys.laser) { tutorial.frozen = false; hideTutBanner(); }
    const frozen = buildFrozen() || revealLeft > 0 || tutorial.frozen;
    // The BUILD pause holds the WORLD still, not the DRIVER. Planning with
    // the tank parked where the last wave left it meant switching out of
    // build, repositioning, and switching back — three actions for one
    // intention. A reveal or a tutorial hold still stops everything, because
    // those are the game speaking and it should not be driven over.
    const driveFrozen = revealLeft > 0 || tutorial.frozen;

    bumpLeft = Math.max(0, bumpLeft - dt);
    recoilLeft = Math.max(0, recoilLeft - dt);
    cannonHeat = Math.max(0, cannonHeat - dt);
    // diegetic cannon gauge: the mid-barrel sleeve glows with the heat
    const sleeve = playerMesh && playerMesh.userData.heatSleeve;
    if (sleeve) sleeve.material.color.lerpColors(sleeveCool, sleeveHot, cannonHeat / CANNON_COOL);
    if (!driveFrozen) advanceMotion(dt);
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
        if (enemies.every((e) => !e.alive)) {
          waveActive = false; interClock = 0; waveCharge = 0;
          score.addWave(wave); persistBest();
          if (tutorialActive) {
            showToast(`<div class="wave-num">WAVE ${wave} CLEARED</div>` +
              `<div class="wave-role">brace — the next wave is coming</div>`, 2200);
          } else showSitrep(); // the recap IS the cleared card now
        } else if (waveAge >= params.waveCap && spawnPoints.some((s) => s.alive)) {
          armWave(); // safety: the field is stalled — but it still announces
        }
      } else if (spawnPoints.some((s) => s.alive)) {
        interClock += dt;
        // arm early enough that the countdown consumes the last WAVE_WARN of
        // the gap — the total wait from cleared to spawned is unchanged
        if (interClock >= params.waveGap - WAVE_WARN) armWave();
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
    if (!serverFound && serverCi >= 0 && !playerDown
        && dist3(player.pos, graph.centers[serverCi]) < cellSide * 4) {
      serverFound = true;
      showToast(`<div class="wave-num">SERVER FOUND</div>`
        + `<div class="wave-role">an antipode relay — HACK it for tower firmware</div>`, 3400);
      syncHackBtn();
    }
    // standing at the relay, the game says WHAT TO PRESS — the rail
    // button alone was invisible to a player looking at the machine
    if (hackPromptEl) {
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
        executeStrike(impactCi, t);
        snapCamera();
        // the skip-tap and the impact race; the loser must not buy a tower
        shopMute = 0.8;
      }
      syncStrikeFeed();
    }
    if (armBtn) syncArmUi();
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
    autoGunner(t);
    checkVictory(); // ram kills and heart-contact deaths can end it too
    updateHud();
    updateNextPreview();
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
      waveSpriteRenderer.render(waveScene, waveCam);
    }

    // main view — the map-layer chrome needs no hiding any more; nothing
    // renders that layer
    scene.background = mainBg;
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
      if (e.alive) blip(e.pos, '#5aff8c', e.spec.rammable ? 2.5 : 4);
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
  if (Number.isFinite(wallOverride)) params.wallHeight = wallOverride;
  const viewOv = urlParams.get('view');
  if (['pov', 'third', 'orbit'].includes(viewOv)) { setView(viewOv); }
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

  // ?credit=N pads the purse; ?tower=key@ci,key@ci force-places towers
  // (both headless-verification hooks)
  const creditN = parseInt(urlParams.get('credit') || '0', 10);
  if (creditN > 0) eco.addCredit(creditN);
  const towerSpec = urlParams.get('tower');
  if (towerSpec) {
    for (const part of towerSpec.split(',')) {
      const [key, ciStr] = part.split('@');
      let ci = parseInt(ciStr, 10);
      if (!TOWER_BY_KEY[key] || !Number.isFinite(ci)) continue;
      // seek forward to the nearest placeable cell — raw indices are a
      // lottery on a sealed sector world
      for (let tries = 0; tries < 400 && ci < dungeon.tags.length; tries++, ci++) {
        if (!placeError(ci)) { placeTower(key, ci); break; }
      }
    }
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

  // opening briefing on a clean load; any debug hook means headless/demo,
  // where a frozen sim would break the verification flow
  const debugging = ['walk', 'tick', 'wave', 'blast', 'laser', 'found', 'recoil', 'mode', 'map', 'tower', 'credit', 'shop', 'sector', 'reveal', 'portal', 'lose', 'charge', 'layout', 'perf', 'strike', 'strikefall', 'strikecam', 'gateprobe', 'rank', 'danger', 'callout', 'sitrep', 'server', 'hack']
    .some((k) => urlParams.get(k));
  const tutParam = urlParams.get('tutorial');
  runTutorial = tutParam === '1' || (tutParam !== '0' && !debugging);
  // ?intro=1 forces the manual even under debug hooks (screenshot path);
  // ?intro=0 skips it. On a clean load it fronts whatever comes next.
  const introParam = urlParams.get('intro');
  if (introParam === '1') showIntro();
  else if (!debugging && introParam !== '0') {
    showIntro(() => { if (runTutorial) startTutorial(); else showBriefing(); });
  } else if (runTutorial) startTutorial();
  else if (!debugging) showBriefing();

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
    showCallout(RECKLESS_MSGS[0], 'co-reckless', true);
    showCallout(HEART_MSGS[0], 'co-heart', true);
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
    serverFound = true; syncHackBtn();
    hackPromptForce = true; // pin the prompt for the layout screenshot
    // the model loads async — report again once it should be in the scene
    setTimeout(() => console.log(`SERVER2 placed=${!!serverObj}`
      + `${serverObj ? ` scale=${serverObj.scale.x.toFixed(4)}` : ''}`), 5000);
  }
  // ?hack=1|hdt|bridges|shikaku — straight into the breach (boot checks)
  const hackParam = urlParams.get('hack');
  if (hackParam) {
    serverFound = true; syncHackBtn();
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

  // ?rank=N — jump the ladder for layout checks: grants exactly rank N's
  // requirements (kills AND elites), then renders through the normal path
  const forceRank = parseInt(urlParams.get('rank') || '0', 10);
  if (forceRank > 0) {
    const fr = Math.min(15, forceRank);
    tankKills = killReq(fr);
    tankEliteKills = eliteReq(fr);
    tankRank = rankFor(tankKills, tankEliteKills);
    refreshRankVisuals();
    console.log(`RANK forced=${tankRank} label=${rankLabel(tankRank)}`
      + ` kills=${tankKills} elite=${tankEliteKills}`);
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
