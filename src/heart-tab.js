// heart-tab.js — defend the Heart. An OPEN battlefield (~80% walkable;
// walls are scattered obstacle clumps to maneuver around and shelter
// behind, not corridors) with the Heart at the north pole. Enemies are
// INTRODUCED one type per wave (HokorobiTawaa's announce pattern): each
// introduction creates that type's SPAWN POINT far from the pole — find
// it and destroy it (3 hits). Fodder (phage/amoeba/jellyfish) is RUN
// OVER: the tank is strong, ramming kills them free. The late roster is
// borrowed from HokorobiTawaa and can NOT be rammed: corona (armored,
// slows itself when shot), barbed (accelerates when shot), knot (BOSS).
// Shells also blast walls open — clear your own path to the sources.
// Allies hold the line; C / ⇄ commandeers. Pickups: bullet triads (+3
// shells), speed, health, regen charges carried home.
// Win: all types introduced, all spawn points dead, field clear.
// Lose: the Heart falls.

import * as THREE from '../vendor/three.module.js';
import GUI from '../vendor/lil-gui.esm.js';
import { generateSphereMesh, relax } from './grid.js?v=fe5345ef';
import { generateDungeon, bfsDist, BLOCKED, PATH, ROOM } from './dungeon.js?v=fe5345ef';
import { mulberry32, randomSeed } from './rng.js?v=fe5345ef';
import { sub3, add3, scale3, dot3, cross3, norm3, len3, dist3 } from './vec3.js?v=fe5345ef';
import { CREATURES, waveJelly } from './creatures.js?v=fe5345ef';
import { UNITS, UNIT_NAMES, buildUnit, buildCreature, onMkcxReady, makeOrbCloud, makeBulletCloud, makeDebris, makeDotBurst, makePortalCloud, makeHeartCloud } from './units.js?v=fe5345ef';
import { LOOKS, LOOK_NAMES } from './looks.js?v=fe5345ef';
import { makeCellIndex } from './cellindex.js?v=fe5345ef';
import { CREATURE_TINTS, ENEMY_SPEC, INTROS } from './enemyspec.js?v=fe5345ef';
import { makeBloom } from './postfx.js?v=fe5345ef';

export function initHeartTab(root) {
  let active = false;
  let wasPlaying = false; // drives body.playing (mobile hides ALL chrome)

  const params = {
    seed: 7,
    points: 150, // round 1 board — startRound() drives this upward per round
    rooms: 12,          // unused by the open-field terrain, kept for the carve call
    roomRadius: 3,
    extraCorridors: 4,
    corridorWidth: 3,
    obstacles: 0.2,     // fraction of the sphere left as wall clumps
    wallHeight: 0.03,
    relaxIters: 80,
    view: 'third', // pov | third
    look: 'tronColors', // visual identity, see looks.js
    wallTops: 'black', // obstacles read as voids; silhouettes matter here
    speed: 1.1, // cells per second, wanderer pace
    recoil: 8, // shell-recoil intensity, dialed to MAX per operator
    autoResume: 3, // seconds idle before auto-wander resumes
    // mkcx by default: the authored hover tank. Async — buildUnit falls
    // back to the procedural tank until the bytes land, then
    // onMkcxReady swaps it in.
    creature: 'mkcx',
    // balance (operator pass): heavier early waves, but a richer field —
    // more triads on the ground and a longer breath between waves
    orbs: 14,
    orbRespawn: 6, // seconds between respawns (0 = off)
    waveSize: 5,
    waveEvery: 26, // seconds
    friendlies: 4,
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
  const container = root.querySelector('#h-app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const mainBg = new THREE.Color(0x0d1017);
  scene.background = mainBg;

  const camera = new THREE.PerspectiveCamera(68, 1, 0.004, 50);
  const mapCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);

  const postfx = makeBloom(renderer, scene, camera, {});

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
  let respawnClock = 0;

  // --- battle state --------------------------------------------------------
  const AMMO_MAX = 9;
  let ammo = 3;
  const enemies = [];      // { cur, prev, next, prog, pos, dir, obj, alive }
  const projectiles = [];  // { pos, dir, dist, mesh }
  const debris = [];       // scatter effects, tick(dt) -> alive
  const friendlies = [];   // ally tanks: { cur, prev, next, prog, pos, dir, obj, alive, hp }
  const allyShots = [];    // infinite-ammo covering fire: { pos, dir, dist, mesh }
  const spawnPoints = [];  // { type, ci, hp, obj, alive } — one per creature type
  let wave = 0;
  let waveClock = 0;
  // roster data (tints/specs/intros) lives in enemyspec.js — one source
  // of truth shared with the TD tab (M0 extraction). See that module for
  // the field semantics.
  // ROUNDS: clear every spawn point to advance. Each round the board grows
  // and TWO more threat types join the schedule — round 1 fields four
  // rammable types; the full 12-type roster is on the field by round 5.
  let round = 1;
  const roundPoints = () => Math.min(2400, 100 + 50 * round); // r1=150, r2=200…
  const introCount = () => Math.min(INTROS.length, 2 + 2 * round); // r1=4 types
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
    const ci = open[Math.floor(orbRng() * open.length)];
    const r = cellSide * 0.14;
    const group = new THREE.Group();
    const phase = orbRng() * 6.283;
    const shells = [];
    for (let k = -1; k <= 1; k++) {
      const b = makeBulletCloud({ body: look().orb.color, hi: 0xffffff });
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
  function freeBlocked(cand) {
    const ci = cellIndex(cand);
    if (ci === -1 || dungeon.tags[ci] === BLOCKED) return true;
    for (const nb of graph.adj[ci]) {
      if (dungeon.tags[nb] === BLOCKED
        && dist3(cand, graph.centers[nb]) < cellSide * 0.62) return true;
    }
    // ally tanks are solid — no driving through the patrol
    for (const f of friendlies) {
      if (f.alive && dist3(cand, f.pos) < cellSide * 0.5) return true;
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

  // WALL CUSHION — the clipping fix. The hull reaches ~0.5·cellSide from
  // the position, but freeBlocked only guarantees ~0.12·cellSide from a
  // wall FACE (0.62 from its center; the face sits at ~0.5), and the auto
  // glide has no margin at all — so the tank could sit visibly inside a
  // wall. Each frame the position is softly pushed out of a 0.8·cellSide
  // band around blocked centers, sliding in the tangent plane so motion
  // along the wall survives. Diagonal walls matter here: graph.adj is
  // full-edge adjacency only, so corner-blocked cells are collected
  // through the open neighbours' own adjacency.
  function wallCushion(pos) {
    // 0.95: irregular quads put some wall FACES ~0.7·cellSide from their
    // center, and the hull reaches 0.5 — 0.8 still let angled approaches
    // overlap. Two passes so multi-wall pushes (corners) converge.
    const margin = cellSide * 0.95;
    const ci = cellIndex(pos);
    if (ci === -1) return pos;
    let p = pos;
    const seen = new Set([ci]);
    const walls = [];
    for (const nb of graph.adj[ci]) {
      if (seen.has(nb)) continue;
      seen.add(nb);
      if (dungeon.tags[nb] === BLOCKED) { walls.push(nb); continue; }
      for (const nb2 of graph.adj[nb]) {
        if (seen.has(nb2)) continue;
        seen.add(nb2);
        if (dungeon.tags[nb2] === BLOCKED) walls.push(nb2);
      }
    }
    const pushFrom = (c, m) => {
      const d = dist3(p, c);
      if (d >= m) return;
      const away = sub3(p, c);
      const n = norm3(p);
      let tg = sub3(away, scale3(n, dot3(away, n)));
      const l = len3(tg);
      if (l < 1e-9) return;
      tg = scale3(tg, 1 / l);
      p = norm3(add3(p, scale3(tg, (m - d) * 0.8)));
    };
    for (let pass = 0; pass < 2; pass++) {
      for (const w of walls) pushFrom(graph.centers[w], margin);
    }
    // ally tanks are solid too: same soft push, tighter band — two hulls
    // shouldn't interpenetrate but must still squeeze past each other
    for (const f of friendlies) {
      if (f.alive) pushFrom(f.pos, cellSide * 0.7);
    }
    return p;
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
  // manual override: ANY WASD press disables auto-wander entirely; it
  // resumes only after params.autoResume seconds without input
  let manualClock = 99;
  const manualActive = () => manualClock < params.autoResume;

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
    const topJitter = mode === 'black' ? 0 : 1;
    // floors: open cells at the surface
    const fPos = [], fCol = [], ePos = [], eColA = [], tPos = [], tColA = [];
    const pushEdge = (p, q2, ci) => {
      ePos.push(p[0], p[1], p[2], q2[0], q2[1], q2[2]);
      const c = edgeTint(ci);
      eColA.push(c[0], c[1], c[2], c[0], c[1], c[2]);
    };
    const pushTopEdge = (p, q2, ci) => {
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
      pushQuad(top[0], top[1], top[2], top[3], topFill, j * topJitter);
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
      playerMesh = buildCreature(params.creature, { walker: look().walker, walkerHi: look().walkerHi });
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
  function updateCameraGoal() {
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
    return graph.adj[ci].filter((nb) => dungeon.tags[nb] !== BLOCKED);
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
    let best = exits[0], bestScore = -Infinity;
    for (const e of exits) {
      const dir = tangentDirTo(player.cur, e);
      let score = (active ? 4.5 : 2.2) * dot3(player.heading, dir);
      if (!active && !player.visited.has(e)) score += 1.1;      // curiosity
      if (!active && e === player.prev && exits.length > 1) score -= 2.4;
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
    manualClock = (anyKey || cruise) ? 0 : manualClock + dt;
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
    if (down && k === 'c') commandeer();
    if (down && k === 'v') toggleView();
  }
  addEventListener('keydown', (ev) => onKeyEvent(ev, true));
  addEventListener('keyup', (ev) => onKeyEvent(ev, false));
  addEventListener('blur', () => { keys.left = keys.right = keys.fast = keys.slow = keys.laser = false; });

  function toggleView() {
    params.view = params.view === 'pov' ? 'third' : 'pov';
    viewCtrl.updateDisplay();
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
  holdButton('#h-pad-up', 'fast', noteFastTap); // double-tap ▲ → cruise
  holdButton('#h-pad-laser', 'laser');
  holdButton('#h-pad-left', 'left');
  holdButton('#h-pad-right', 'right');
  holdButton('#h-pad-down', 'slow', () => { cruise = false; });
  root.querySelector('#h-pad-hint').addEventListener('click', () => commandeer());
  root.querySelector('#h-pad-view').addEventListener('click', () => toggleView());
  root.querySelector('#h-pad-fire').addEventListener('click', () => fire());

  // ☆ flash the neighbouring cell that is one hop closer to the heart
  let hintTimer = null;
  function pulseHint() {
    const d = dungeon.distToHeart;
    let next = -1;
    for (const nb of openNeighbors(player.cur)) {
      if (d[nb] === d[player.cur] - 1) { next = nb; break; }
    }
    if (next === -1) return;
    paintCell(next, COL.hintFlash);
    clearTimeout(hintTimer);
    const cell = next;
    hintTimer = setTimeout(() => paintCell(cell, floorColorOf(cell)), 900);
  }

  // --- HUD -----------------------------------------------------------------
  const statsEl = root.querySelector('#h-stats');
  const msgEl = root.querySelector('#h-msg');
  // the modal's buttons (event delegation survives innerHTML swaps)
  msgEl.addEventListener('click', (ev) => {
    const cl = ev.target.classList;
    if (!cl) return;
    if (cl.contains('msg-regen')) regenerate(); // retry the CURRENT round
    else if (cl.contains('msg-next')) { round++; params.seed++; startRound(); }
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
      const b = makeBulletCloud({ body: 0xffb000, hi: 0xffffff });
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
  const unitIcon = (type, tint) => () => buildCreature(type, { walker: tint, walkerHi: 0xffffff });

  // one element = one little card: real sprite · name · what it does
  const glossCard = (color, iconUrl, name, desc) =>
    `<div class="gcard"><img class="gicon" src="${iconUrl}" alt="">` +
    `<div class="gname" style="color:${color}">${name}</div>` +
    `<div class="gdesc">${desc}</div></div>`;

  // opening briefing: the pieces as cards, the ONE win condition, and two
  // clickable glossaries. The sim stays frozen until the player begins.
  function showBriefing() {
    paused = true;
    msgEl.innerHTML = `<div class="msg-head">transmission · briefing</div>` +
      `<div class="msg-scroll">` +
      `<div class="gcards">` +
      glossCard('#ff6a88', spriteShot('heart', heartIcon), 'the heart', 'at the pole — its fall is the only defeat') +
      glossCard('#9fdcff', spriteShot('tank', unitIcon('tank', look().walker)), 'your tank', 'hold W drive · double-tap W cruise · A/D steer · SPACE shell · SHIFT lasers · ESC pause') +
      glossCard('#9fdcff', spriteShot('tank', unitIcon('tank', look().walker)), 'allies', 'patrol the pole · infinite ammo · C commandeers') +
      glossCard('#ffb000', spriteShot('triad', makeTriadIcon), 'bullet triads', 'drive over = +3 shells · shells also blast walls open') +
      glossCard('#66ff88', spriteShot('phage', unitIcon('phage', CREATURE_TINTS.phage)), 'fodder', 'soft creatures — RAM them, it’s free') +
      glossCard('#ff5340', spriteShot('barbed', unitIcon('barbed', CREATURE_TINTS.barbed)), 'spiked reds', 'armored — ramming hurts YOU · shells only') +
      glossCard('#ffffff', spriteShot('portal', () => makePortalCloud({ body: 0xcfd8ff, hi: 0xffffff })), 'portals', 'the enemy sources · 3 shells each · dim as they die') +
      `</div>` +
      `<b>WIN = DESTROY EVERY PORTAL.</b> reaching the heart wins nothing — it's home.` +
      `</div>` +
      `<div class="msg-foot">` +
      `<button class="msg-glenemy">enemy glossary</button> ` +
      `<button class="msg-glfriend">friendlies &amp; pickups</button><br>` +
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
    msgEl.innerHTML = `<div class="msg-head">glossary · friendlies &amp; pickups</div>` +
      `<div class="gcards">` +
      glossCard('#ff6a88', spriteShot('heart', heartIcon), 'the heart', `${HEART_MAX} hp · enemy contact drains it · regen charges heal it`) +
      glossCard('#9fdcff', spriteShot('tank', unitIcon('tank', look().walker)), 'ally tank', 'patrols the pole · infinite shells · 2 hp · solid — no driving through · C swaps you in') +
      glossCard('#ffb000', spriteShot('triad', makeTriadIcon), 'bullet triad', '+3 shells on touch (rack caps at 9) — the ONLY ammo pickup') +
      glossCard('#9ff8ff', spriteShot('orb-power', orbIcon('scatter', 0x9ff8ff)), 'power sphere', 'far-field reward · +8% speed, permanent') +
      glossCard('#3dff6e', spriteShot('orb-health', orbIcon('wave', 0x3dff6e)), 'health sphere', 'far-field reward · +1 your hp') +
      glossCard('#ff2df0', spriteShot('orb-regen', orbIcon('breathe', 0xff2df0)), 'regen charge', 'CARRY it back near the heart: +4 heart hp') +
      `</div><button class="msg-back">← back to briefing</button>`;
    msgEl.classList.remove('hidden');
  }
  function updateHud() {
    const alive = enemies.filter((e) => e.alive).length;
    const allies = friendlies.filter((f) => f.alive).length;
    const spAlive = spawnPoints.filter((s) => s.alive).length;
    // compact HUD: the shells row is GONE — the turret rack is the ammo
    // counter (a small ✦n remains for PoV, where the turret isn't visible).
    // Alerts only appear when they're true; the how-to lives in the briefing.
    const alerts = (carryingRegen ? ' · ⬤ REGEN' : '')
      + (cannonHeat > 0 ? ' · cannon HOT' : '')
      + (laserOverheat ? ' · laser COOLING' : '');
    statsEl.textContent =
      `HEART ${'♥'.repeat(Math.max(0, heartHP)).padEnd(HEART_MAX, '·')}  YOU ♥${playerHP}  ✦${ammo}\n` +
      `R${round} · wave ${wave} · hostiles ${alive} · portals ${spAlive}/${spawnPoints.length} · allies ${allies}${alerts}\n` +
      (manualActive()
        ? (cruise ? 'CRUISE — ▼/S stops' : 'MANUAL')
        : 'auto — double-tap ▲/W to cruise');
    // diegetic shell rack: the 3×3 turret dots ARE the ammo counter —
    // neon white loaded, faded grey spent (allies stay full: infinite ammo)
    const dots = playerMesh && playerMesh.userData.ammoDots;
    if (dots) {
      for (let i = 0; i < dots.length; i++) {
        dots[i].material.color.setHex(i < ammo ? 0xffffff : 0x4a505c);
      }
    }
  }

  // --- pause (ESC): freeze the simulation, keep presenting the frame ------
  let paused = false;
  function togglePause() {
    if (player.won) return; // the end-of-game modal owns the screen
    paused = !paused;
    if (paused) {
      msgEl.innerHTML = `<div class="msg-head">transmission · paused</div>` +
        `sector frozen<br>ESC resumes`;
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
  const waveEl = root.querySelector('#h-wave');
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

  // --- generation ----------------------------------------------------------
  function regenerate() {
    const t0 = performance.now();
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
    // OPEN BATTLEFIELD: discard the corridor carve. Everything is open,
    // then ~`obstacles` of the sphere is re-blocked as small clumps —
    // cover to maneuver around, not halls. Pockets sealed off by clumps
    // are turned into wall too (connectivity by construction).
    {
      const C = dungeon.tags.length;
      dungeon.tags.fill(PATH);
      const orng = mulberry32((params.seed ^ 0xba771e) >>> 0);
      const targetBlocked = Math.floor(C * params.obstacles);
      let blocked = 0;
      let guard = 0;
      while (blocked < targetBlocked && guard++ < C) {
        const seedCell = Math.floor(orng() * C);
        // clump: the seed plus a random walk of 2–6 neighbours
        const clump = [seedCell];
        let cur = seedCell;
        const len = 2 + Math.floor(orng() * 5);
        for (let s = 0; s < len; s++) {
          const nbs = graph.adj[cur];
          cur = nbs[Math.floor(orng() * nbs.length)];
          clump.push(cur);
        }
        for (const ci of clump) {
          if (dungeon.tags[ci] !== BLOCKED) { dungeon.tags[ci] = BLOCKED; blocked++; }
        }
      }
      // Heart at the pole: highest +Y OPEN cell; carve its plaza open
      let best = -1, by = -Infinity;
      for (let i = 0; i < C; i++) {
        if (dungeon.tags[i] === BLOCKED) continue;
        if (graph.normals[i][1] > by) { by = graph.normals[i][1]; best = i; }
      }
      dungeon.heart = best;
      for (const nb of graph.adj[best]) dungeon.tags[nb] = PATH;
      // seal unreachable pockets (become obstacles too)
      const reach = bfsDist(graph.adj, [best], (i) => dungeon.tags[i] !== BLOCKED);
      for (let i = 0; i < C; i++) {
        if (dungeon.tags[i] !== BLOCKED && reach[i] === -1) dungeon.tags[i] = BLOCKED;
      }
      dungeon.distToHeart = bfsDist(graph.adj, [best], (i) => dungeon.tags[i] !== BLOCKED);
      let sp = -1, bd = -1;
      for (let i = 0; i < C; i++) {
        if (dungeon.tags[i] !== BLOCKED && dungeon.distToHeart[i] > bd) {
          bd = dungeon.distToHeart[i]; sp = i;
        }
      }
      dungeon.spawn = sp;
    }
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
    heartHP = HEART_MAX;
    playerHP = PLAYER_MAX;
    carryingRegen = false;
    speedBonus = 1;
    for (let i = projectiles.length - 1; i >= 0; i--) killProjectile(i);
    for (let i = allyShots.length - 1; i >= 0; i--) {
      scene.remove(allyShots[i].mesh);
      allyShots[i].mesh.geometry.dispose();
      allyShots.splice(i, 1);
    }
    for (let i = laserShots.length - 1; i >= 0; i--) killLaser(i);
    laserClock = 0;
    orbRng = mulberry32((params.seed ^ 0x0b0b5) >>> 0);
    respawnClock = 0;
    simTime = 0;

    buildGeometry();
    buildActors();
    spawnOrbs();
    spawnEnemies();
    spawnFriendlies();
    spawnRewards();
    placeActors();
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
    spawnFriendlies();
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
    // battle reset. Spawn points are no longer placed up front: each one
    // arrives WITH its wave introduction (HokorobiTawaa's announce beat)
    clearEnemies();
    for (const sp of spawnPoints) {
      scene.remove(sp.obj);
      disposeObj(sp.obj);
      if (sp.mapMarker) { scene.remove(sp.mapMarker); disposeObj(sp.mapMarker); }
    }
    spawnPoints.length = 0;
    wave = 0;
    waveClock = params.waveEvery * 0.6; // first wave arrives sooner
    clearTimeout(waveTimer);
    waveEl.classList.add('hidden');
  }

  // cheap hop estimate for spreading spawn points (chord distance in cells)
  function hopEstimate(a, b) {
    return dist3(graph.centers[a], graph.centers[b]) / cellSide;
  }

  // the introduced type's source: far from the pole, greedily spread from
  // the spawn points already standing; 3 hits to destroy
  function addSpawnPoint(type) {
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
    // the source is a PORTAL: the braille-lab half-dotted static torus,
    // standing upright like a gate (local +Y = surface normal, ring in the
    // local X-Y plane), twinkling in the enemy's tint
    const obj = makePortalCloud({ body: CREATURE_TINTS[type], hi: 0xffffff }, whim() * 6.283);
    const r = cellSide * 0.7;
    obj.scale.setScalar(r);
    obj.userData.sizeScale = r;
    const c = graph.centers[best];
    const n = graph.normals[best];
    obj.position.set(c[0] + n[0] * r * 0.9, c[1] + n[1] * r * 0.9, c[2] + n[2] * r * 0.9);
    tmpN.set(n[0], n[1], n[2]);
    obj.quaternion.setFromUnitVectors(Y_AXIS, tmpN);
    scene.add(obj);
    // minimap beacon in the spawn's tint — dark until the player FINDS the
    // source (comes close or lands a shell), then it pulses on the map.
    // Sphere-relative size, same reasoning as the self-marker.
    const mapMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 10, 10),
      new THREE.MeshBasicMaterial({ color: CREATURE_TINTS[type] }));
    const mm = scale3(c, 1 + params.wallHeight * 1.6);
    mapMarker.position.set(mm[0], mm[1], mm[2]);
    mapMarker.visible = false;
    scene.add(mapMarker);
    spawnPoints.push({ type, ci: best, hp: 3, obj, alive: true, found: false, mapMarker });
  }

  function spawnWave() {
    wave++;
    // only this round's slice of the schedule gets introduced
    const intro = wave <= introCount() ? INTROS.find((iv) => iv.wave === wave) : null;
    if (intro) {
      addSpawnPoint(intro.type);
      announceWave(intro);
    }
    const base = params.waveSize + Math.floor(wave / 3) + (round - 1);
    for (const sp of spawnPoints) {
      if (!sp.alive) continue;
      const spec = ENEMY_SPEC[sp.type];
      // fodder floods; the dangerous tier at half strength; epics sparse;
      // one boss
      const count = spec.boss ? 1
        : spec.heavy ? Math.max(1, Math.floor(base / 3))
        : spec.rammable ? base
        : Math.max(1, Math.ceil(base / 2));
      for (let k = 0; k < count; k++) {
        const obj = buildCreature(sp.type, { walker: CREATURE_TINTS[sp.type], walkerHi: 0xffffff });
        const scale0 = (obj.userData.baseScale ?? 1) * cellSide * spec.size;
        obj.scale.setScalar(scale0);
        scene.add(obj);
        const exits = openNeighbors(sp.ci);
        enemies.push({
          type: sp.type, spec, scale0,
          cur: sp.ci, prev: -1,
          next: exits.length ? exits[Math.floor(whim() * exits.length)] : sp.ci,
          prog: whim() * 0.4, pos: graph.centers[sp.ci].slice(), dir: [0, 1, 0],
          obj, alive: true, phase: whim() * 6.283,
          hp: spec.hp, behMult: 1, behUntil: -1, touchCd: -1,
        });
      }
    }
    updateHud();
  }

  const ENEMY_SPEED = 0.5; // cells per second toward the Heart, fodder pace
  function updateEnemies(dt, tNow) {
    for (const e of enemies) {
      if (!e.alive) continue;
      const spec = e.spec;
      // HK healOOC: regenerators knit themselves back together while
      // nothing has hit them for 1.2 s — burst them down or ram them
      if (spec.regen && e.hp < spec.hp && tNow - (e.lastHitT ?? -9) > 1.2) {
        e.hp = Math.min(spec.hp, e.hp + spec.regen * dt);
        e.obj.scale.setScalar(e.scale0 * (0.7 + 0.3 * e.hp / spec.hp));
      }
      let pace = ENEMY_SPEED * spec.speed;
      if (tNow < e.behUntil) pace *= e.behMult; // on-hit reaction window
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
      const s = cellSide * spec.size;
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
      const touchR = cellSide * Math.max(0.42, spec.size * 0.8);
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
          killCreature(e, true);
          checkVictory();
          continue;
        }
        if (tNow > e.touchCd) { e.touchCd = tNow + 1.2; playerHit(); }
      }
      // allies are tanks too: same ram rule
      for (const fr of friendlies) {
        if (!fr.alive) continue;
        if (dist3(e.pos, fr.pos) < touchR) {
          if (spec.rammable) { killCreature(e, true); }
          else if (tNow > e.touchCd) {
            e.touchCd = tNow + 1.2;
            fr.hp--;
            if (fr.hp <= 0) {
              fr.alive = false;
              const fx = makeDebris(fr.obj, norm3(fr.pos));
              scene.add(fx);
              debris.push(fx);
              scene.remove(fr.obj);
            }
          }
          break;
        }
      }
    }
  }

  function killCreature(e, fx = false) {
    e.alive = false;
    // mesh enemies blow apart like tanks; dot-clouds just wink out
    if (fx && e.obj.userData.kind === 'mesh') {
      const d = makeDebris(e.obj, norm3(e.pos));
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
    if (e.hp <= 0) { killCreature(e, true); return true; }
    e.obj.scale.setScalar(e.scale0 * (0.7 + 0.3 * Math.max(0, e.hp) / spec.hp));
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
        if (dist3(p.pos, e.pos) < cellSide * Math.max(0.4, e.spec.size * 0.8)) {
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
  function fire() {
    if (player.won || paused || ammo <= 0 || cannonHeat > 0) return;
    ammo--;
    cannonHeat = CANNON_COOL; // the sleeve glows red-hot, cools over 3 s
    recoilLeft = RECOIL_LEN;
    bumpLeft = Math.max(bumpLeft, BUMP_LEN * 0.4); // the shot rocks the hull too
    let dir;
    const turret = playerMesh.userData.turret;
    if (turret) {
      // world +Z of the turret group, flattened into the tangent plane —
      // aim IS the sweep; no sign conventions to get wrong
      turret.getWorldQuaternion(tmpQ);
      tmpV.set(0, 0, 1).applyQuaternion(tmpQ);
      const n = norm3(player.pos);
      const d = [tmpV.x, tmpV.y, tmpV.z];
      dir = norm3(sub3(d, scale3(n, dot3(d, n))));
    } else {
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
        if (dist3(p.pos, e.pos) < cellSide * Math.max(0.45, e.spec.size * 0.8)) {
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


  // --- friendlies: patrol near the Heart, commandeerable -------------------
  function clearFriendlies() {
    for (const f of friendlies) scene.remove(f.obj);
    friendlies.length = 0;
  }

  function spawnFriendlies() {
    clearFriendlies();
    const near = [];
    for (let i = 0; i < dungeon.tags.length; i++) {
      const d = dungeon.distToHeart[i];
      if (dungeon.tags[i] !== BLOCKED && d >= 2 && d <= 10) near.push(i);
    }
    for (let k = 0; k < params.friendlies && near.length > 0; k++) {
      const ci = near.splice(Math.floor(whim() * near.length), 1)[0];
      const obj = buildUnit('tank', { walker: look().walker, walkerHi: look().walkerHi });
      obj.scale.setScalar((obj.userData.baseScale ?? 1) * cellSide * 0.55);
      scene.add(obj);
      const exits = openNeighbors(ci);
      friendlies.push({
        cur: ci, prev: -1,
        next: exits.length ? exits[Math.floor(whim() * exits.length)] : ci,
        prog: 0, pos: graph.centers[ci].slice(), dir: [0, 1, 0],
        obj, alive: true, hp: 2,
      });
    }
  }

  const FRIENDLY_SPEED = 0.4;
  function updateFriendlies(dt, tNow) {
    for (const f of friendlies) {
      if (!f.alive) continue;
      f.prog += FRIENDLY_SPEED * dt;
      while (f.prog >= 1) {
        f.prog -= 1;
        f.prev = f.cur;
        f.cur = f.next;
        // patrol: stay within ~10 hops of the Heart, otherwise drift home
        let exits = openNeighbors(f.cur).filter((c) => c !== f.prev);
        if (!exits.length) exits = openNeighbors(f.cur);
        const near = exits.filter((c) => dungeon.distToHeart[c] <= 10);
        const pool = near.length ? near : exits;
        f.next = pool.length ? pool[Math.floor(whim() * pool.length)] : f.prev;
      }
      const a = graph.centers[f.cur];
      const b = graph.centers[f.next];
      const ff = Math.min(f.prog, 1);
      f.pos = norm3([a[0] + (b[0] - a[0]) * ff, a[1] + (b[1] - a[1]) * ff, a[2] + (b[2] - a[2]) * ff]);
      const n = f.pos;
      const raw = sub3(b, f.pos);
      const flat = sub3(raw, scale3(n, dot3(raw, n)));
      const l = Math.hypot(flat[0], flat[1], flat[2]);
      if (l > 1e-9) f.dir = scale3(flat, 1 / l);
      const s = cellSide * 0.55;
      const lift = s * (f.obj.userData.lift ?? 0.05);
      f.obj.position.set(f.pos[0] + n[0] * lift, f.pos[1] + n[1] * lift, f.pos[2] + n[2] * lift);
      tmpObj.position.copy(f.obj.position);
      tmpObj.up.set(n[0], n[1], n[2]);
      tmpObj.lookAt(f.obj.position.x + f.dir[0], f.obj.position.y + f.dir[1], f.obj.position.z + f.dir[2]);
      f.obj.quaternion.copy(tmpObj.quaternion);
      if (f.obj.userData.tick) f.obj.userData.tick(tNow + f.cur);
    }
  }

  // commandeer: possession swap with the nearest living ally — the old body
  // becomes a friendly where you stood, you continue from theirs
  function commandeer() {
    let best = null, bd = Infinity;
    for (const f of friendlies) {
      if (!f.alive) continue;
      const d = dist3(player.pos, f.pos);
      if (d < bd) { bd = d; best = f; }
    }
    if (!best) return;
    const oldCi = player.cur;
    const oldPos = player.pos.slice();
    player.pos = best.pos.slice();
    player.cur = best.cur;
    player.prev = -1;
    player.next = best.next;
    player.prog = best.prog;
    player.segLen = Math.max(1e-9, dist3(graph.centers[player.cur], graph.centers[player.next]));
    player.virtualStart = null;
    player.heading = best.dir.slice();
    player.smoothDir = best.dir.slice();
    playerHP = Math.max(playerHP, best.hp + 1);
    // the abandoned body joins the patrol
    best.cur = oldCi;
    best.prev = -1;
    const exits = openNeighbors(oldCi);
    best.next = exits.length ? exits[Math.floor(whim() * exits.length)] : oldCi;
    best.prog = 0;
    best.pos = oldPos;
    snapCamera();
    updateHud();
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
    const alive = friendlies.filter((f) => f.alive);
    if (alive.length > 0) {
      // your tank dies; command jumps to the nearest ally
      const fx = makeDebris(playerMesh, norm3(player.pos));
      scene.add(fx);
      debris.push(fx);
      playerHP = 2;
      // commandeer() is a swap, so the ally's body takes over where you died
      // and keeps patrolling as wreckage-adjacent irony; command moves on
      commandeer();
    } else {
      loseGame('your last tank is gone');
    }
  }

  function heartHit(dmg = 1) {
    heartHP -= dmg;
    heartSprite.userData.hit(); // orange/red Wave flare
    updateHud();
    if (heartHP <= 0) loseGame('the heart is lost');
  }

  // --- ally covering fire: infinite ammo, holds the line ------------------
  const ALLY_FIRE_RANGE = 3.0; // cells
  function updateAllyFire(dt) {
    const range = ALLY_FIRE_RANGE * cellSide;
    for (const f of friendlies) {
      if (!f.alive) continue;
      f.fireClock = (f.fireClock ?? whim() * 1.4) + dt;
      if (f.fireClock < 1.4) continue;
      let best = null, bd = Infinity;
      for (const e of enemies) {
        if (!e.alive) continue;
        const d = dist3(f.pos, e.pos);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best || bd > range) continue;
      f.fireClock = 0;
      const n = norm3(f.pos);
      const raw = sub3(best.pos, f.pos);
      const flat = sub3(raw, scale3(n, dot3(raw, n)));
      const l = Math.hypot(flat[0], flat[1], flat[2]);
      if (l < 1e-9) continue;
      const mesh = makeBulletCloud({ body: look().walkerHi, hi: 0xffffff });
      mesh.scale.setScalar(cellSide * 0.13);
      scene.add(mesh);
      allyShots.push({ pos: f.pos.slice(), dir: scale3(flat, 1 / l), dist: 0, mesh });
    }
  }

  function updateAllyShots(dt, tNow) {
    const v = 3.0 * cellSide;
    const maxDist = 4.5 * cellSide;
    for (let i = allyShots.length - 1; i >= 0; i--) {
      const p = allyShots[i];
      p.pos = norm3(add3(p.pos, scale3(p.dir, v * dt)));
      const n = p.pos;
      p.dir = norm3(sub3(p.dir, scale3(n, dot3(p.dir, n))));
      p.dist += v * dt;
      const lift = 1 + params.wallHeight * 0.5;
      p.mesh.position.set(p.pos[0] * lift, p.pos[1] * lift, p.pos[2] * lift);
      tmpV.set(p.dir[0], p.dir[1], p.dir[2]);
      p.mesh.quaternion.setFromUnitVectors(Y_AXIS, tmpV);
      p.mesh.rotateY(p.dist * 60);
      let dead = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (dist3(p.pos, e.pos) < cellSide * Math.max(0.4, e.spec.size * 0.8)) {
          damageEnemy(e, tNow);
          dead = true;
          break;
        }
      }
      if (!dead) {
        const ci = cellIndex(p.pos);
        if ((ci !== -1 && dungeon.tags[ci] === BLOCKED) || p.dist > maxDist) dead = true;
      }
      if (dead) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        allyShots.splice(i, 1);
      }
    }
  }

  function checkVictory() {
    if (player.won) return;
    // every threat in THIS round's schedule must have been introduced —
    // an early spawn kill just buys quiet until the next announcement
    if (wave >= introCount() && spawnPoints.length > 0
      && spawnPoints.every((s) => !s.alive) && enemies.every((e) => !e.alive)) {
      player.won = true;
      msgEl.innerHTML = `<div class="msg-head">transmission · combat log</div>` +
        `✦ ROUND ${round} CLEARED — every spawn point destroyed<br>` +
        `${wave} waves · heart ${heartHP}/${HEART_MAX} · ${player.moves} moves<br>` +
        `<button class="msg-next">&rsaquo; round ${round + 1} — bigger sector, meaner waves</button>`;
      msgEl.classList.remove('hidden');
    }
  }

  // next round: a bigger board, a fresh layout, one more threat type
  function startRound() {
    params.points = roundPoints();
    pointsCtrl.updateDisplay();
    seedCtrl.updateDisplay();
    regenerate();
  }

  // --- dashboard -----------------------------------------------------------
  const gui = new GUI({ title: 'the heart', container: root });
  gui.add(params, 'creature', UNIT_NAMES).onChange(regenerate);
  gui.add(params, 'look', LOOK_NAMES).onChange(applyLook);
  gui.add(params, 'wallTops', ['auto', 'bright', 'dim', 'black'])
    .name('wall tops').onChange(applyLook);
  const viewCtrl = gui.add(params, 'view', ['pov', 'third']).name('camera (V)');
  const speedCtrl = gui.add(params, 'speed', 0.2, 4, 0.1).name('wander speed');
  gui.add(params, 'recoil', 0, 8, 0.1).name('shell recoil');
  gui.add(params, 'autoResume', 1, 10, 0.5).name('auto resume (s)');
  gui.add(params, 'waveSize', 1, 6, 1).name('wave size').onFinishChange(regenerate);
  gui.add(params, 'waveEvery', 6, 40, 1).name('wave every (s)');
  gui.add(params, 'obstacles', 0.05, 0.4, 0.05).onFinishChange(regenerate);
  gui.add(params, 'friendlies', 0, 8, 1).onFinishChange(regenerate);
  gui.add(params, 'rewards', 0, 12, 1).onFinishChange(regenerate);
  gui.add(params, 'orbs', 0, 40, 1).name('bullet triads').onFinishChange(regenerate);
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
  const bloomF = gui.addFolder('bloom');
  bloomF.add(postfx.params, 'enabled').name('enabled').onChange((v) => postfx.setEnabled(v));
  bloomF.add(postfx.params, 'strength', 0, 3, 0.05).onChange((v) => postfx.setParams({ strength: v }));
  bloomF.add(postfx.params, 'radius', 0, 1, 0.01).onChange((v) => postfx.setParams({ radius: v }));
  bloomF.add(postfx.params, 'threshold', 0, 1, 0.01).onChange((v) => postfx.setParams({ threshold: v }));

  // phones: start with the panel folded so the maze isn't buried
  if (matchMedia('(pointer: coarse), (max-width: 700px)').matches) gui.close();

  // --- render loop: PoV + minimap inset ------------------------------------
  const mapBg = new THREE.Color(0x080a10);
  let t = 0;
  let lastFrame = performance.now();
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
    lastFrame = now;

    // paused: keep presenting the frozen frame (both views), zero sim.
    // lastFrame keeps updating above so resume has no dt spike.
    if (paused) {
      scene.background = mainBg;
      markerMesh.visible = false;
      for (const sp of spawnPoints) if (sp.mapMarker) sp.mapMarker.visible = false;
      playerMesh.visible = params.view === 'third';
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

    bumpLeft = Math.max(0, bumpLeft - dt);
    recoilLeft = Math.max(0, recoilLeft - dt);
    cannonHeat = Math.max(0, cannonHeat - dt);
    // diegetic cannon gauge: the mid-barrel sleeve glows with the heat
    const sleeve = playerMesh && playerMesh.userData.heatSleeve;
    if (sleeve) sleeve.material.color.lerpColors(sleeveCool, sleeveHot, cannonHeat / CANNON_COOL);
    advanceMotion(dt);
    for (const orb of orbMeshes.values()) orb.userData.tick(t);
    for (let i = debris.length - 1; i >= 0; i--) {
      if (!debris[i].userData.tick(dt)) {
        scene.remove(debris[i]);
        debris[i].geometry.dispose();
        debris.splice(i, 1);
      }
    }
    if (!player.won) {
      waveClock += dt;
      // waves keep coming while introductions remain, even if the player
      // has razed every spawn point standing — the next threat still lands
      if (waveClock >= params.waveEvery
        && (wave < introCount() || spawnPoints.some((s) => s.alive))) {
        waveClock = 0;
        spawnWave();
      }
    }
    updateEnemies(dt, t);
    updateFriendlies(dt, t);
    updateAllyFire(dt);
    updateAllyShots(dt, t);
    checkRewards();
    updateProjectiles(dt, t);
    updateLasers(dt, t);
    for (const sp of spawnPoints) {
      if (!sp.alive) continue;
      sp.obj.userData.tick(t);
      // proximity discovers the source: the minimap beacon lights up
      if (!sp.found && dist3(player.pos, graph.centers[sp.ci]) < cellSide * 5) sp.found = true;
    }
    checkVictory(); // ram kills and heart-contact deaths can end it too
    updateHud();
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
    playerMesh.visible = params.view === 'third';
    postfx.render();

    // minimap: the whole sphere (walls included), player-centred,
    // smoothed-direction up, pulled back so nothing clips the circle
    const n = norm3(player.pos);
    const hd = player.smoothDir;
    const mapDist = 3.05 * (1 + params.wallHeight);
    mapCamera.position.set(n[0] * mapDist, n[1] * mapDist, n[2] * mapDist);
    mapCamera.up.set(hd[0], hd[1], hd[2]);
    mapCamera.lookAt(0, 0, 0);
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
  if (urlParams.get('view') === 'third') { params.view = 'third'; viewCtrl.updateDisplay(); }
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

  // ?wave=N force-runs N wave beats (introductions included) — headless
  // verification of the announce/spawn flow without waiting wall-clock
  const waveN = parseInt(urlParams.get('wave') || '0', 10);
  for (let i = 0; i < waveN; i++) spawnWave();

  // ?found=1 marks every spawn point discovered (minimap beacon check)
  if (urlParams.get('found') === '1') for (const sp of spawnPoints) sp.found = true;

  // ?laser=1 holds the laser trigger down (headless visual check)
  if (urlParams.get('laser') === '1') keys.laser = true;

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
  const debugging = ['walk', 'tick', 'wave', 'blast', 'laser', 'found', 'recoil']
    .some((k) => urlParams.get(k));
  if (!debugging) showBriefing();

  // the default unit's model loads async; swap it in when it lands
  onMkcxReady(() => { buildActors(); placeActors(); });
  resize();
  animate();

  return {
    setActive(on) {
      active = on;
      if (on) { resize(); snapCamera(); }
      else if (wasPlaying) {
        wasPlaying = false;
        document.body.classList.remove('playing');
      }
    },
  };
}
