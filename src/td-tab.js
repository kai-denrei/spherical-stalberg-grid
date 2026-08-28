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
import { generateSphereMesh, relax } from './grid.js?v=84bfe64f';
import { generateDungeon, bfsDist, BLOCKED, PATH, ROOM } from './dungeon.js?v=84bfe64f';
import { mulberry32, randomSeed } from './rng.js?v=84bfe64f';
import { sub3, add3, scale3, dot3, cross3, norm3, len3, dist3, segKey } from './vec3.js?v=84bfe64f';
import { CREATURES, waveJelly } from './creatures.js?v=84bfe64f';
import { UNITS, UNIT_NAMES, buildUnit, makeOrbCloud, makeBulletCloud, makeMissileCloud, makeDebris, makeDotBurst, makePortalCloud, makeHeartCloud, makeDotEnemy } from './units.js?v=84bfe64f';
import { LOOKS, LOOK_NAMES } from './looks.js?v=84bfe64f';
import { makeCellIndex } from './cellindex.js?v=84bfe64f';
import { CREATURE_TINTS, ENEMY_SPEC, INTROS, computeWavePlan } from './enemyspec.js?v=84bfe64f';
import { TOWERS, TOWER_BY_KEY, MAX_TIER, upgradeCost, effectiveStats, pickTarget, shotInterval, unlockedTowerKeys, towerUnlockWave, TOWER_ORDER } from './towers.js?v=84bfe64f';
import { makeEconomy, sellRefund } from './economy.js?v=84bfe64f';
import { makeBloom } from './postfx.js?v=84bfe64f';
import { BLOOM_GROUPS } from './bloomweights.js?v=84bfe64f';
import { TOWER_LOOK_NAMES, DEFAULT_TOWER_LOOK, buildTowerLook } from './towerlooks.js?v=84bfe64f';
import { makeAudio } from './audio.js?v=84bfe64f';
import { DEATH_KEYS } from './audiomanifest.js?v=84bfe64f';

export function initTdTab(root) {
  let active = false;
  let wasPlaying = false; // drives body.playing (mobile hides ALL chrome)

  const params = {
    towerLook: DEFAULT_TOWER_LOOK,
    seed: 7,
    points: 3000, // ONE big pre-decided lane world; sectors unseal it in bands
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
    creature: 'tank', // any roster unit; the tank has the sweeping turret
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
  const mapCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
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

  // circular minimap: its own small renderer on a round-clipped canvas —
  // scissored insets on the main canvas can only ever be rectangles
  const mapRenderer = new THREE.WebGLRenderer({ antialias: true });
  mapRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  mapRenderer.domElement.className = 'minimap';
  container.appendChild(mapRenderer.domElement);

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
    const m = Math.min(240, Math.floor(Math.min(w, h) * 0.32));
    mapRenderer.setSize(m, m);
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
  let carryingRegen = false;
  let speedBonus = 1; // permanent, from power rewards

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
      const b = makeMissileCloud({ body: look().orb.color, hi: 0xffffff });
      b.scale.setScalar(r);
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
    if (ci === -1 || dungeon.tags[ci] === BLOCKED) return true;
    // wide ground keeps the clipping margin; narrow halls trade a little
    // visual overlap for guaranteed passability
    const margin = cellSide * (openCount(ci) <= 3 ? 0.45 : 0.62);
    for (const nb of graph.adj[ci]) {
      if (dungeon.tags[nb] === BLOCKED
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
    for (const o of [heartSprite, playerMesh, markerMesh]) if (o) scene.remove(o);

    // the Braille heart: dot-cloud cycling twinkle → breathe → jelly,
    // flaring orange/red under Wave when hit
    heartSprite = makeHeartCloud(new THREE.Color(look().heart).getHex());
    scene.add(heartSprite);

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
      playerMesh = buildUnit(params.creature, { walker: look().walker, walkerHi: look().walkerHi });
      playerMesh.scale.setScalar(playerMesh.userData.baseScale); // reset sizing
    }
    scene.add(playerMesh);

    // minimap self-marker: a fat arrowhead nosing along the heading — the
    // map is heading-up, so YOU are the big pulsing arrow pointing up.
    // Sized against the SPHERE, not the cell: the map always frames the
    // whole ball, so cell-relative sizes vanish on dense boards.
    // Geometry pre-rotated so the cone's nose is +Z (lookAt convention).
    markerMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.115, 4).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: look().marker }),
    );
    scene.add(markerMesh);
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
    const turret = playerMesh.userData.turret;
    if (turret) {
      const shudder = rf > 0 ? Math.sin((RECOIL_LEN - recoilLeft) * 70) * 0.03 * rk : 0;
      turret.position.z = (turret.userData.baseZ ?? -0.12) - 0.18 * rk + shudder;
    }
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
    if (rf > 0) playerMesh.rotateX(-0.05 * rk);
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
    const { hn, t1 } = poleFrame();
    bqZ.set(hn[0], hn[1], hn[2]).normalize();
    bqY.set(t1[0], t1[1], t1[2]);
    bqX.crossVectors(bqY, bqZ).normalize();
    bqY.crossVectors(bqZ, bqX).normalize();
    bqM.makeBasis(bqX, bqY, bqZ);
    buildQ.setFromRotationMatrix(bqM);
  }
  const DTAP_MS = 350, DTAP_PX = 24; // double-tap-to-recenter window
  let lastTap = null;
  const anyHostiles = () => enemies.some((e) => e.alive);
  const buildFrozen = () => buildMode && !anyHostiles();
  function toggleBuild() {
    buildMode = !buildMode;
    syncBuildUi();
    updateHud();
    if (!buildMode) showOverrideModal(); // just switched INTO manual drive
  }
  // build mode is a different INSTRUMENT: the driving controls vanish
  // (zones, triggers, SWAP/CAM) leaving only BUILD/MAP and the board
  function syncBuildUi() {
    // The Heart framing is a courtesy on the FIRST entry; afterwards the
    // camera stays where you left it (double-tap rides it home).
    // This lives HERE, not in toggleBuild(), because buildMode is also set
    // directly by the ?mode=build hook and by the tutorial — and with the
    // old `if (!buildCenter) buildCenter = hn` fallback gone, a path that
    // skipped centering left the camera staring at the unlit far side.
    if (buildMode && !buildCentered && graph && dungeon) {
      centerBuildOnHeart();
      buildCentered = true;
    }
    root.classList.toggle('build', buildMode);
    // the chip names the mode you'd SWITCH TO — build↔build makes no sense
    const chip = root.querySelector('#td-pad-build');
    if (chip) chip.textContent = buildMode ? 'MANUAL' : 'BUILD';
    if (!buildMode) closeShop();
  }
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
    let best = exits[0], bestScore = -Infinity;
    for (const e of exits) {
      const dir = tangentDirTo(player.cur, e);
      let score = (active ? 4.5 : 2.2) * dot3(player.heading, dir);
      if (!active && !player.visited.has(e)) score += 1.1;      // curiosity
      if (!active && e === player.prev && exits.length > 1) score -= 2.4;
      if (goalVec) score += 3.2 * goalSign * dot3(dir, goalVec);
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
    if (player.won || player.next === -1) return;
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
      const drive = keys.slow ? -0.55
        : keys.fast ? (cruise ? 1.45 : 1)
        : cruise ? 1 : 0;
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
  const RECOIL_LEN = 0.35;
  let cannonHeat = 0;
  let recoilLeft = 0;
  const recoilFactor = () => Math.max(0, recoilLeft / RECOIL_LEN);
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
    if (down && (k === 'w' || k === 'arrowup')) {
      const sel = towerByCell.get(shopCi)
        || (params.view === 'bastion' && !buildMode ? watchTower : null);
      if (sel && (buildMode || params.view === 'bastion')) {
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
      if (down && m === 'slow') cruise = false;              // brake kills cruise
      keys[m] = down;
      ev.preventDefault();
      return;
    }
    if (down && k === 'escape') { togglePause(); ev.preventDefault(); return; }
    if (paused) return; // frozen: only ESC gets through
    if (down && (k === ' ' || k === 'spacebar')) { fire(); ev.preventDefault(); return; }
    if (down && k === 'h') pulseHint();
    if (down && k === 'v') toggleView();
    if (down && k === 'b') toggleBuild(); // BUILD ↔ ACTION
    if (down && k === 'm') toggleMap();   // minimap ↔ threat view
  }
  addEventListener('keydown', (ev) => onKeyEvent(ev, true));
  addEventListener('keyup', (ev) => onKeyEvent(ev, false));
  addEventListener('blur', () => { keys.left = keys.right = keys.fast = keys.slow = keys.laser = false; });

  function toggleView() {
    const cycle = ['pov', 'third', 'bastion'];
    params.view = cycle[(cycle.indexOf(params.view) + 1) % cycle.length];
    if (params.view !== 'bastion') watchTower = null;
    viewCtrl.updateDisplay();
    updateHud();
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
  holdButton('#td-pad-up', 'fast', noteFastTap); // double-tap ▲ → cruise
  holdButton('#td-pad-laser', 'laser');
  holdButton('#td-pad-left', 'left');
  holdButton('#td-pad-right', 'right');
  holdButton('#td-pad-down', 'slow', () => { cruise = false; });
  root.querySelector('#td-pad-view').addEventListener('click', () => toggleView());
  root.querySelector('#td-pad-build').addEventListener('click', () => toggleBuild());
  function syncDirectiveChip() {
    const chip = root.querySelector('#td-pad-dir');
    if (chip) chip.textContent = DIRECTIVE_LABEL[params.directive] || 'WANDER';
  }
  root.querySelector('#td-pad-dir').addEventListener('click', () => {
    const i = DIRECTIVES.indexOf(params.directive);
    params.directive = DIRECTIVES[(i + 1) % DIRECTIVES.length];
    directiveCtrl.updateDisplay();
    syncDirectiveChip();
    updateHud();
    autoMode = true;  // picking a directive is the ONLY way into auto
    steerHold = 1.2;
    cruise = false;
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
    if (!buildMode && params.view !== 'bastion') return;
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
    if (buildMode && wasTap) {
      // double-tap anywhere rides the view home. Checked BEFORE the shop
      // opens, and it closes whatever the first tap of the pair opened —
      // so the gesture works over a cell, not only over empty board.
      const tnow = performance.now();
      const dbl = lastTap && tnow - lastTap.t < DTAP_MS
        && Math.hypot(ev.clientX - lastTap.x, ev.clientY - lastTap.y) <= DTAP_PX;
      if (dbl) {
        lastTap = null;
        closeShop();
        centerBuildOnHeart();
      } else {
        lastTap = { t: tnow, x: ev.clientX, y: ev.clientY };
        const ci = cellAtScreen(ev.clientX, ev.clientY);
        if (ci !== -1) openShop(ci, ev.clientX, ev.clientY);
      }
    } else if (!buildMode && params.view === 'bastion' && wasTap) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1,
        -((ev.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(towers.map((tw) => tw.obj), true);
      if (hits.length) {
        let obj = hits[0].object;
        while (obj && !towers.some((tw) => tw.obj === obj)) obj = obj.parent;
        watchTower = towers.find((tw) => tw.obj === obj) || null;
      } else {
        watchTower = null;
      }
    }
    if (buildPointers.size === 0) { pinched = false; tapStart = null; }
  }
  addEventListener('pointerup', endBuildPointer);
  addEventListener('pointercancel', endBuildPointer);
  container.addEventListener('wheel', (ev) => {
    if (!buildMode) return;
    buildDist = Math.min(4, Math.max(1.4, buildDist + ev.deltaY * 0.002));
    ev.preventDefault();
  }, { passive: false });
  root.querySelector('#td-pad-fire').addEventListener('click', () => fire());

  // ☆ flash the neighbouring cell that is one hop closer to the heart
  let hintTimer = null;
  // non-freezing tutorial callout; flash = big centred, skip = show Skip, hold = no auto-hide
  let tutTimer = null;
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
      mm.visible = true; scene.add(mm);
      this.portal = { type: 'phage', ci: portalCi, hp: 3, obj, alive: true, found: true, mapMarker: mm };
      spawnPoints.push(this.portal);
      recomputePortalDist();
      wave = 1; // the scripted wave counts as wave 1, so the BUILD-phase
                // spawnWave() (task 5) introduces the wave-2 enemy type

      // 2 phage a couple hops out in the lane ahead, marching toward the heart
      this.fodder = [];
      const spec = ENEMY_SPEC.phage;
      const sd = dungeon.distToHeart[startCi];
      const ahead = [];
      for (let i = 0; i < dungeon.tags.length && ahead.length < 2; i++) {
        if (dungeon.tags[i] === BLOCKED) continue;
        const d = dungeon.distToHeart[i];
        if (d >= sd + 2 && d <= sd + 4) ahead.push(i);
      }
      while (ahead.length < 2) ahead.push(this.portal.ci); // degenerate fallback
      for (let k = 0; k < 2; k++) {
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
        enemies.push(e); this.fodder.push(e);
      }
      this.frozen = true; this.frozenT = 0;
      tutBanner('SHOOT TO DEFEND THE HEART', { flash: true, hold: true, skip: !!safeSeen() });
      pulseButton('#td-pad-laser');
      this.tShown = 0; this.phase = 'ram';
    },
    tick(dt) {
      if (this.frozen) { this.frozenT += dt; if (this.frozenT > 4) { this.frozen = false; hideTutBanner(); } return; }
      if (this.phase === 'ram') {
        if (this.fodder.every((e) => !e.alive)) {
          // fodder cleared → shells appear beside the player
          const near = openNeighbors(player.cur).slice(0, 3);
          const cells = near.length ? near : [player.cur];
          for (const ci of cells) spawnOrbAt(ci);
          tutBanner('Pick up the shells to destroy the portal — it takes 3 shots.',
            { skip: !!safeSeen() });
          pulseButton('#td-pad-fire');
          this.phase = 'portal';
        }
      } else if (this.phase === 'portal') {
        if (this.portal && !this.portal.alive) {
          this.startBuild(); // task 5
        }
      } else if (this.phase === 'build' || this.phase === 'done') {
        this.tickBuild(dt); // task 5
      }
    },
    startBuild() {
      this.phase = 'build';
      // the wave engine spawns only from LIVE gates and no longer self-seeds
      // one per wave — the scripted gate is dead by now, so raise a fresh gate
      // before the 2nd wave or the field is empty and checkVictory false-fires
      seedPortals(1);
      spawnWave(); // a real 2nd wave: fresh gate + normal enemies (war is live)
      tutBanner('Build Towers. Towers go on HIGH GROUND, near the edge.',
        { skip: !!safeSeen() });
      pulseButton('#td-pad-build');
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
    tutorial.phase = 'setup';
    tutorial.setup();
  }
  function endTutorial() {
    tutorialActive = false;
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
  const msgEl = root.querySelector('#td-msg');
  // the modal's buttons (event delegation survives innerHTML swaps)
  msgEl.addEventListener('click', (ev) => {
    const cl = ev.target.classList;
    if (!cl) return;
    if (cl.contains('msg-regen')) regenerate(); // retry the CURRENT round
    else if (cl.contains('msg-next')) { round++; expandRound(); }
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
      const b = makeMissileCloud({ body: 0xffb000, hi: 0xffffff });
      b.scale.setScalar(0.3);
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
  const unitIcon = (type, tint) => () => buildUnit(type, { walker: tint, walkerHi: 0xffffff });

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
    `drive: hold &and; · double-tap &and; = cruise · &or; stops<br>` +
    `steer: the side zones · fire: &#9673; shell · &#8767; laser (overheats)<br>` +
    `B = build/tank · M = map view · in BUILD tap HIGH GROUND to place towers<br>` +
    `ESC pause · RAM the small ones · shells breach walls</div>`;

  // opening briefing: the pieces as cards, the ONE win condition, and two
  // clickable glossaries. The sim stays frozen until the player begins.
  function showBriefing() {
    paused = true;
    msgEl.innerHTML = `<div class="msg-head">transmission · briefing</div>` +
      `<div class="msg-scroll">` +
      `<div class="gcards">` +
      glossCard('#ff6a88', spriteShot('heart', heartIcon), 'the heart', 'at the pole — its fall is the only defeat') +
      glossCard('#9fdcff', spriteShot('tank', unitIcon('tank', look().walker)), 'your tank', 'hold W drive · double-tap W cruise · A/D steer · SPACE shell · SHIFT lasers · ESC pause') +
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
    const orbIcon = (fx, body) => () => makeOrbCloud(fx, { body, hi: 0xffffff }, 1.7);
    msgEl.innerHTML = `<div class="msg-head">glossary · pickups</div>` +
      `<div class="gcards">` +
      glossCard('#ff6a88', spriteShot('heart', heartIcon), 'the heart', `${HEART_MAX} hp · enemy contact drains it · regen charges heal it`) +
      glossCard('#9fdcff', spriteShot('tower-' + params.towerLook, () => buildTowerLook(params.towerLook, TOWER_BY_KEY.single)), 'towers', 'mount on walls only · tap high ground in BUILD mode · upgrade twice · sell 75%') +
      glossCard('#ffb000', spriteShot('triad', makeTriadIcon), 'missile triad', '+3 shells on touch (rack caps at 9) — the ONLY ammo pickup') +
      glossCard('#9ff8ff', spriteShot('orb-power', orbIcon('scatter', 0x9ff8ff)), 'power sphere', 'far-field reward · +8% speed, permanent') +
      glossCard('#3dff6e', spriteShot('orb-health', orbIcon('wave', 0x3dff6e)), 'health sphere', 'far-field reward · +1 your hp') +
      glossCard('#ff2df0', spriteShot('orb-regen', orbIcon('breathe', 0xff2df0)), 'regen charge', 'CARRY it back near the heart: +4 heart hp') +
      `</div><button class="msg-back">← back to briefing</button>`;
    msgEl.classList.remove('hidden');
  }
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
  function updateHud() {
    const alive = enemies.filter((e) => e.alive).length;
    const spAlive = spawnPoints.filter((s) => s.alive).length;
    // compact HUD: the shells row is GONE — the turret rack is the ammo
    // counter (a small ✦n remains for PoV, where the turret isn't visible).
    // Alerts only appear when they're true; the how-to lives in the briefing.
    const alerts = (carryingRegen ? ' · ⬤ REGEN' : '')
      + (cannonHeat > 0 ? ' · cannon HOT' : '')
      + (laserOverheat ? ' · laser COOLING' : '');
    // state words only — the how-to lives in the GAMEPLAY section of the
    // briefing and pause modals. CREDIT is the loud line, in orange.
    statsEl.innerHTML =
      `HEART ${'♥'.repeat(Math.max(0, heartHP)).padEnd(HEART_MAX, '·')}  YOU ♥${playerHP}  ✦${ammo}\n` +
      `<span class="hud-credit">${eco.credit}c ×${eco.multiplier().toFixed(2)}</span> · towers ${towers.length}\n` +
      `WAVE ${wave} · ${Math.min(8, Math.max(0, wave))}/8 towers · portals ${spAlive}/${spawnPoints.length} · R${round}${alerts}\n` +
      (buildMode
        ? (anyHostiles() ? 'BUILD · war on' : 'BUILD · frozen')
        : (manualActive() ? (cruise ? 'CRUISE' : 'MANUAL')
          : `AUTO · ${DIRECTIVE_LABEL[params.directive] || 'WANDER'}`));
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
    if (manualActive() || buildMode || player.won || paused) return;
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
    waveUnit = buildUnit(intro.type, { walker: CREATURE_TINTS[intro.type], walkerHi: 0xffffff });
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
    else if (waveActive && !enemies.every((e) => !e.alive)) when = 'clear the field';
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

    player.cur = dungeon.spawn;
    player.prev = -1;
    player.moves = 0;
    player.won = false;
    player.visited = new Set([dungeon.spawn]);
    player.pos = graph.centers[dungeon.spawn].slice();
    whim = mulberry32((params.seed ^ 0x51eef) >>> 0);
    const exits = openNeighbors(player.cur);
    // start aimed the way to the heart so the opening shot reads
    let e0 = exits[0];
    for (const e of exits) {
      if (dungeon.distToHeart[e] === dungeon.distToHeart[player.cur] - 1) { e0 = e; break; }
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
      if (e.obj.geometry) e.obj.geometry.dispose();
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
    scene.add(mapMarker);
    spawnPoints.push({ ci: best, hp: 3, obj, alive: true, found: false, mapMarker });
    recomputePortalDist();
  }

  // a sector's gates are spatial sources, not type-bound — seed a small
  // fixed set; the wave plan decides what pours out of them
  function seedPortals(n) { for (let i = 0; i < n; i++) addSpawnPoint(); }

  function spawnWave() {
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
      // the slow READS for its full duration: the whole cloud tints ice
      if (e.obj.material) {
        e.obj.material.color.setHex(tNow < e.slowUntil ? 0x8fd4ff : 0xffffff);
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
      if (dist3(e.pos, player.pos) < touchR) {
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
  function damageEnemy(e, tNow, dmg = 1, react = true) {
    const spec = e.spec;
    if (react && spec.slowOnHit) { e.behMult = spec.slowOnHit; e.behUntil = tNow + 1.2; }
    if (react && spec.accelOnHit) { e.behMult = spec.accelOnHit; e.behUntil = tNow + 1.2; }
    e.lastHitT = tNow; // resets the regenerators' out-of-combat clock
    e.hp -= dmg;
    if (e.hp <= 0) {
      eco.award(spec.bounty); // any weapon's kill pays — tower, shell, laser
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
  const LASER_RATE = 0.14;    // s between bursts (guns alternate)
  const LASER_DMG = 0.4;      // fodder: 3 grazes; corona: 5 — weak on purpose
  const LASER_MAX_HEAT = 2.4; // s of continuous fire before lockout
  const LASER_COOL = 1.4;     // heat shed per second (lockout ≈ 1.7 s)
  // thin bright core + a wider additive halo child (soft glow without a
  // bloom chain — additive over the dark board reads as light)
  const laserGeo = new THREE.BoxGeometry(1, 1, 1); // shared; scaled per bolt
  const laserMat = new THREE.MeshBasicMaterial({ color: 0xeafdff, transparent: true, opacity: 0.95 });
  const laserHaloMat = new THREE.MeshBasicMaterial({
    color: 0x4fd8ff, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const Z_AXIS = new THREE.Vector3(0, 0, 1);
  const gunColCool = new THREE.Color(0x7df9ff);
  const gunColHot = new THREE.Color(0xff5340);

  function killLaser(i) {
    scene.remove(laserShots[i].mesh); // geometry/material are shared — keep
    laserShots.splice(i, 1);
  }

  function updateLasers(dt, tNow) {
    const guns = playerMesh && playerMesh.userData.laserGuns;
    const wantFire = keys.laser && guns && !player.won;
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
    // diegetic gauge: both tubes share one material per tank
    if (guns) {
      const tube = guns[0].children[0];
      tube.material.color.lerpColors(gunColCool, gunColHot, laserHeat / LASER_MAX_HEAT);
    }
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
        const mesh = new THREE.Mesh(laserGeo, laserMat);
        mesh.scale.set(cellSide * 0.02, cellSide * 0.02, cellSide * 0.46);
        const halo = new THREE.Mesh(laserGeo, laserHaloMat);
        halo.scale.set(4.5, 4.5, 1.12); // relative to the thin core
        mesh.add(halo);
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
      p.mesh.position.set(p.pos[0] * lift, p.pos[1] * lift, p.pos[2] * lift);
      tmpV.set(p.dir[0], p.dir[1], p.dir[2]);
      p.mesh.quaternion.setFromUnitVectors(Z_AXIS, tmpV);
      let dead = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (dist3(p.pos, e.pos) < cellSide * Math.max(0.4, (e.size ?? e.spec.size) * 0.8)) {
          damageEnemy(e, tNow, LASER_DMG, false);
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
    if (player.won || paused || ammo <= 0 || cannonHeat > 0) return;
    ammo--;
    sfx.play('tank_main'); // the player's own act — always at full presence
    cannonHeat = CANNON_COOL; // the sleeve glows red-hot, cools over 3 s
    recoilLeft = RECOIL_LEN;
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
    if (towerByCell.has(ci)) return; // a mounted tower anchors its wall
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
          damageEnemy(e, tNow);
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
              sp.alive = false;
              scene.remove(sp.obj);
              disposeObj(sp.obj);
              scene.remove(sp.mapMarker);
              disposeObj(sp.mapMarker);
              sp.mapMarker = null;
              recomputePortalDist();
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
  const REWARD_TYPES = [
    { type: 'power', body: 0x9ff8ff, fx: 'scatter' },  // permanent +8% speed
    { type: 'health', body: 0x3dff6e, fx: 'wave' },    // you +1 — GREEN = health
    { type: 'regen', body: 0xff2df0, fx: 'breathe' },  // carry home: heart +4
  ];

  function clearRewards() {
    for (const r of rewardMeshes.values()) {
      scene.remove(r.obj);
      r.obj.geometry.dispose();
    }
    rewardMeshes.clear();
  }

  function spawnRewards() {
    clearRewards();
    let maxD = 0;
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (dungeon.tags[i] !== BLOCKED) maxD = Math.max(maxD, dungeon.distToHeart[i]);
    }
    const far = [];
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (dungeon.tags[i] !== BLOCKED && dungeon.distToHeart[i] >= maxD * 0.55) far.push(i);
    }
    for (let k = 0; k < params.rewards && far.length > 0; k++) {
      const ci = far.splice(Math.floor(whim() * far.length), 1)[0];
      const spec = REWARD_TYPES[k % REWARD_TYPES.length];
      const r = cellSide * 0.24;
      const obj = makeOrbCloud(spec.fx, { body: spec.body, hi: 0xffffff }, whim() * 6.283);
      obj.scale.setScalar(r);
      obj.userData.sizeScale = r;
      const c = graph.centers[ci];
      const n = graph.normals[ci];
      obj.position.set(c[0] + n[0] * r * 1.2, c[1] + n[1] * r * 1.2, c[2] + n[2] * r * 1.2);
      scene.add(obj);
      rewardMeshes.set(ci, { obj, type: spec.type });
    }
  }

  function checkRewards() {
    const r = rewardMeshes.get(player.cur);
    if (r) {
      scene.remove(r.obj);
      r.obj.geometry.dispose();
      rewardMeshes.delete(player.cur);
      sfx.play('tank_pickup');
      if (r.type === 'power') speedBonus *= 1.08;
      else if (r.type === 'health') playerHP = Math.min(PLAYER_MAX, playerHP + 1);
      else if (r.type === 'regen') carryingRegen = true;
      updateHud();
    }
    // deliver a carried regen: near the Heart, it heals
    if (carryingRegen && dungeon.distToHeart[player.cur] <= 2) {
      carryingRegen = false;
      heartHP = Math.min(HEART_MAX, heartHP + 4);
      updateHud();
    }
    for (const orb of rewardMeshes.values()) orb.obj.userData.tick(simTime);
  }

  // --- enemy fire ------------------------------------------------------------
  function loseGame(reason) {
    if (player.won) return;
    player.won = true; // stops motion; same flag, sadder modal
    msgEl.innerHTML = `<div class="msg-head">transmission · last light</div>` +
      `× ${reason}<br>` +
      `${enemies.filter((e) => !e.alive).length}/${enemies.length} enemies destroyed · ` +
      `heart ${Math.max(0, heartHP)}/${HEART_MAX}<br>` +
      `<button class="msg-regen">⟲ new sector</button>`;
    msgEl.classList.remove('hidden');
  }

  function playerHit() {
    playerHP--;
    updateHud();
    if (playerHP > 0) return;
    loseGame('your last tank is gone');
  }

  function heartHit(dmg = 1) {
    eco.leak(); // a breach kills the streak — HK's rule, our Heart
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

  // HT rule: towers build on the HIGH GROUND only — real wall cells (in
  // the un-sealed world) that border the open sector. Low ground belongs
  // to monsters and the player. No connectivity guard needed: walls never
  // carry enemy pathing, so a tower can never dam a lane.
  function placeError(ci) {
    if (ci === -1) return 'nothing there';
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
  function applyTowerLook() {
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

  function stepTowers(dt, tNow) {
    for (const tw of towers) {
      if (tw.obj.userData.tick) tw.obj.userData.tick(tNow + tw.ci);
      tw.cooldown -= dt;
      if (tw.cooldown > 0) continue;
      const eff = effectiveStats(tw.def, tw.tier);
      const range = eff.range * cellSide;
      const tp = graph.centers[tw.ci];
      const target = pickTarget(tp, range, enemies, chord);
      if (!target) continue;
      tw.cooldown = shotInterval(eff.rate);
      // one line, eight towers: the key IS the def key
      sfx.play(`tower_${tw.def.key}`, { dist: camDist(tp) });
      const n = graph.normals[tw.ci];
      const muzzle = add3(tp, scale3(n, cellSide * 0.55));
      const raw = sub3(target.pos, tp);
      const flat = norm3(sub3(raw, scale3(norm3(tp), dot3(raw, norm3(tp)))));
      const atk = tw.def.attack;
      if (atk === 'beam') {
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
      transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
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
    towerShots.push({
      pos: p0, dir, dist: 0, mesh,
      dmg: eff.dmg, splash: (eff.splash || 0) * cellSide, homing,
      range: eff.range * cellSide * 1.35,
      speed: (tw.def.projSpeed ?? 16) * cellSide, // per-tower tempo
      arcTotal, arcH: cellSide * 2.2, color: tw.def.color,
    });
  }

  function killTowerShot(i) {
    scene.remove(towerShots[i].mesh);
    towerShots[i].mesh.geometry.dispose(); // per-shot tracer geometry
    towerShots[i].mesh.material.dispose();
    towerShots.splice(i, 1);
  }

  // splash detonation: tinted burst + damage to everything in the radius
  function detonate(p, tNow) {
    for (const e2 of enemies) {
      if (e2.alive && chord(p.pos, e2.pos) <= p.splash) damageEnemy(e2, tNow, p.dmg, true);
    }
    const boom = makeDotBurst(p.color, norm3(p.pos), 42);
    boom.scale.setScalar(cellSide * 1.1);
    const bp = add3(p.pos, scale3(norm3(p.pos), cellSide * 0.2));
    boom.position.set(bp[0], bp[1], bp[2]);
    scene.add(boom);
    debris.push(boom);
  }

  function updateTowerShots(dt, tNow) {
    for (let i = towerShots.length - 1; i >= 0; i--) {
      const p = towerShots[i];
      const v = p.speed; // each tower's own tempo — HK's feel lives here
      // homing re-steers toward its (living) target each frame
      if (p.homing && p.homing.alive) {
        const raw = sub3(p.homing.pos, p.pos);
        const n0 = norm3(p.pos);
        const want = norm3(sub3(raw, scale3(n0, dot3(raw, n0))));
        p.dir = norm3(add3(scale3(p.dir, 0.75), scale3(want, 0.25)));
      }
      p.pos = norm3(add3(p.pos, scale3(p.dir, v * dt)));
      const n = p.pos;
      p.dir = norm3(sub3(p.dir, scale3(n, dot3(p.dir, n))));
      p.dist += v * dt;
      // mortar lofts: a sine arc over its measured throw
      const arc = p.arcTotal > 0
        ? Math.sin(Math.PI * Math.min(1, p.dist / p.arcTotal)) * p.arcH : 0;
      const lift = 1 + params.wallHeight * 0.5 + arc;
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
          else damageEnemy(e, tNow, p.dmg, true);
          hit = true;
          break;
        }
      }
      if (hit || p.dist > p.range) killTowerShot(i);
    }
  }

  // beams: a thin bright segment that burns out fast — laser + slow tethers
  const beamGeo = new THREE.BoxGeometry(1, 1, 1);
  function spawnBeam(a, b, color, ttl = 0.16) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(beamGeo, mat);
    const mid = scale3(add3(a, b), 0.5 * (1 + params.wallHeight * 0.5));
    mesh.position.set(mid[0], mid[1], mid[2]);
    const d = sub3(b, a);
    const len = len3(d);
    mesh.scale.set(cellSide * 0.03, cellSide * 0.03, Math.max(1e-6, len));
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
  function buildPortalObj(ci, phase) {
    const obj = makePortalCloud({ body: 0xcfd8ff, hi: 0xffffff }, phase);
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
      const unlocked = new Set(unlockedTowerKeys(wave));
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
    // burn the new ground hot — repainted to its true colors when the
    // beat ends (see animate)
    for (const ci of revealCells) paintCell(ci, [1.0, 0.68, 0.16]);
    spawnOrbs();
    spawnRewards();
    seedPortals(2); // fresh neutral gates in the new band
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
    buildActors();
    placeActors();
  });
  gui.add(params, 'look', LOOK_NAMES).onChange(applyLook);
  gui.add(params, 'wallTops', ['auto', 'bright', 'dim', 'black'])
    .name('wall tops').onChange(applyLook);
  const viewCtrl = gui.add(params, 'view', ['pov', 'third', 'bastion']).name('camera (V)');
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

  gui.add(params, 'towerLook', TOWER_LOOK_NAMES).name('tower look').onChange(applyTowerLook);
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
  // --- engine bed ---------------------------------------------------------
  // A continuous loop under everything, gain and pitch both tracking
  // speed: slow crawl reads quiet and low, full drive louder and higher.
  //
  // Speed comes from the ACTUAL per-frame position delta rather than from
  // the drive inputs. One site then covers manual driving, auto
  // navigation, and the handoff eased through virtualStart -- and it
  // follows the house rule of deriving render-coupled values from the
  // render state instead of re-deriving them with a second set of
  // conventions.
  let engineHandle = null;
  let enginePrev = null;    // last frame's position
  let engineLevel = 0;      // smoothed 0..1
  let engineIdle = 0;       // s since the tank last moved
  const ENGINE_STOP = 0.25; // s of stillness before the bed fades out

  function stopEngine(fade = ENGINE_STOP) {
    if (!engineHandle) return;
    engineHandle.stop(fade);
    engineHandle = null;
    engineLevel = 0;
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

    if (moving && !engineHandle) {
      engineHandle = sfx.loop('tank_engine', { gain: 0.001, rate: 0.85 });
    }
    if (engineHandle) {
      if (engineIdle >= ENGINE_STOP) {
        stopEngine();
      } else {
        // gain is nearly linear in level; pitch spans 0.85..1.18 so the
        // bed is felt as effort rather than heard as a repeating clip
        engineHandle.set(0.15 + 0.85 * engineLevel, 0.85 + 0.33 * engineLevel);
      }
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
      scene.background = mainBg;
      markerMesh.visible = false;
      for (const sp of spawnPoints) if (sp.mapMarker) sp.mapMarker.visible = false;
      playerMesh.visible = params.view !== 'pov';
      postfx.render();
      scene.background = mapBg;
      markerMesh.visible = true;
      for (const sp of spawnPoints) {
        if (sp.mapMarker && sp.alive && sp.found) sp.mapMarker.visible = true;
      }
      playerMesh.visible = true;
      mapRenderer.render(scene, mapCamera);
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
        if (!buildMode) { buildMode = true; syncBuildUi(); }
        updateHud();
      }
    }
    // first laser input thaws the frozen tutorial opening — checked BEFORE the
    // frozen gate, since updateLasers itself is skipped while frozen
    if (tutorial.frozen && keys.laser) { tutorial.frozen = false; hideTutBanner(); }
    const frozen = buildFrozen() || revealLeft > 0 || tutorial.frozen;

    bumpLeft = Math.max(0, bumpLeft - dt);
    recoilLeft = Math.max(0, recoilLeft - dt);
    cannonHeat = Math.max(0, cannonHeat - dt);
    // diegetic cannon gauge: the mid-barrel sleeve glows with the heat
    const sleeve = playerMesh && playerMesh.userData.heatSleeve;
    if (sleeve) sleeve.material.color.lerpColors(sleeveCool, sleeveHot, cannonHeat / CANNON_COOL);
    if (!frozen) advanceMotion(dt);
    for (const orb of orbMeshes.values()) orb.userData.tick(t);
    for (let i = debris.length - 1; i >= 0; i--) {
      if (!debris[i].userData.tick(dt)) {
        scene.remove(debris[i]);
        debris[i].geometry.dispose();
        debris.splice(i, 1);
      }
    }
    if (!player.won && !frozen && !tutorialActive) {
      if (waveActive) {
        waveAge += dt;
        if (enemies.every((e) => !e.alive)) {
          waveActive = false; interClock = 0;
          showToast(`<div class="wave-num">WAVE ${wave} CLEARED</div>` +
            `<div class="wave-role">brace — the next wave is coming</div>`, 2200);
        } else if (waveAge >= params.waveCap && spawnPoints.some((s) => s.alive)) {
          spawnWave(); // safety: the field is stalled — send the next wave anyway
        }
      } else if (spawnPoints.some((s) => s.alive)) {
        interClock += dt;
        if (interClock >= params.waveGap) spawnWave();
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
    if (rangeRingTtl > 0) {
      rangeRingTtl -= dt;
      if (rangeRingTtl <= 0) { rangeRingTtl = 0; hideRangeRing(); }
    }
    for (const sp of spawnPoints) {
      if (!sp.alive) continue;
      sp.obj.userData.tick(t);
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

    // main view
    scene.background = mainBg;
    markerMesh.visible = false;
    for (const sp of spawnPoints) if (sp.mapMarker) sp.mapMarker.visible = false;
    // in PoV the camera sits inside the creature — hide it there
    playerMesh.visible = params.view !== 'pov';
    postfx.render();

    // minimap, two modes (M): player-centred heading-up as in the heart
    // tab, or the fixed HEART THREAT VIEW — top-down over the pole,
    // portals/streams/defenses in one glance
    const mapDist = 3.05 * (1 + params.wallHeight);
    if (mapMode === 'heart') {
      const { hn, t1 } = poleFrame();
      mapCamera.position.set(hn[0] * mapDist, hn[1] * mapDist, hn[2] * mapDist);
      mapCamera.up.set(t1[0], t1[1], t1[2]);
      mapCamera.lookAt(0, 0, 0);
    } else {
      const n = norm3(player.pos);
      const hd = player.smoothDir;
      mapCamera.position.set(n[0] * mapDist, n[1] * mapDist, n[2] * mapDist);
      mapCamera.up.set(hd[0], hd[1], hd[2]);
      mapCamera.lookAt(0, 0, 0);
    }
    mapCamera.updateProjectionMatrix();
    scene.background = mapBg;
    markerMesh.visible = true;
    markerMesh.scale.setScalar(1 + 0.25 * Math.sin(t * 5)); // pulse: YOU
    // discovered sources pulse in their own tint
    for (const sp of spawnPoints) {
      if (sp.mapMarker && sp.alive && sp.found) {
        sp.mapMarker.visible = true;
        sp.mapMarker.scale.setScalar(1 + 0.45 * Math.sin(t * 4 + sp.ci));
      }
    }
    playerMesh.visible = true;
    mapRenderer.render(scene, mapCamera);
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
  if (['pov', 'third', 'bastion'].includes(viewOv)) { params.view = viewOv; viewCtrl.updateDisplay(); }
  const lookOverride = urlParams.get('look');
  if (LOOKS[lookOverride]) params.look = lookOverride;
  const wtOverride = urlParams.get('walltops');
  if (['bright', 'dim', 'black'].includes(wtOverride)) params.wallTops = wtOverride;
  const creatureOverride = urlParams.get('creature');
  if (UNITS[creatureOverride]) params.creature = creatureOverride;
  gui.controllersRecursive().forEach((c) => c.updateDisplay());

  regenerate();
  applyLook();

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

  // ?laser=1 holds the laser trigger down (headless visual check)
  if (urlParams.get('laser') === '1') keys.laser = true;

  // ?mode=build / ?map=heart jump straight into the TD viewpoints
  if (urlParams.get('mode') === 'build') { buildMode = true; syncBuildUi(); snapCamera(); }
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
    recoilLeft = RECOIL_LEN * 0.75;
    cannonHeat = CANNON_COOL;
    placeActors();
    paused = true;
  }

  // ?blast=N breaches the N wall cells nearest the player — exercises the
  // carve + debris + rebuild path without needing a live shot
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
  const debugging = ['walk', 'tick', 'wave', 'blast', 'laser', 'found', 'recoil', 'mode', 'map', 'tower', 'credit', 'shop', 'sector', 'reveal', 'portal']
    .some((k) => urlParams.get(k));
  const tutParam = urlParams.get('tutorial');
  runTutorial = tutParam === '1' || (tutParam !== '0' && !debugging);
  if (runTutorial) startTutorial();
  else if (!debugging) showBriefing();

  resize();
  animate();

  return {
    setActive(on) {
      active = on;
      if (!on) stopEngine(0.1); // or the bed drones on while another tab is up
      if (on) { resize(); snapCamera(); }
      else if (wasPlaying) {
        wasPlaying = false;
        document.body.classList.remove('playing');
      }
    },
  };
}
