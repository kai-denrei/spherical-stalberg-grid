// battle-tab.js — combat on the sphere maze. The player (a tank by
// default) starts with 3 shells; orbs are ammo pickups. Enemy tanks wander
// the dungeon. The player's turret sweeps left-right on its own — hitting
// something means TIMING the shot for the moment the sweep crosses the
// target. Fire: Space or the ✦ pad button. Shots fly along the surface,
// stop at walls, and destroy enemies on contact. Easy AI: enemies only
// wander, for now.

import * as THREE from '../vendor/three.module.js';
import GUI from '../vendor/lil-gui.esm.js';
import { generateSphereMesh, relax } from './grid.js?v=84d0cdef';
import { generateDungeon, BLOCKED, PATH, ROOM } from './dungeon.js?v=84d0cdef';
import { mulberry32, randomSeed } from './rng.js?v=84d0cdef';
import { sub3, add3, scale3, dot3, cross3, norm3, len3, dist3 } from './vec3.js?v=84d0cdef';
import { CREATURES, waveJelly } from './creatures.js?v=84d0cdef';
import { UNITS, UNIT_NAMES, buildUnit, buildCreature, onMkcxReady, makeOrbCloud, makeBulletCloud, makeDebris, ORB_FX, makeHeartCloud } from './units.js?v=84d0cdef';
import { LOOKS, LOOK_NAMES } from './looks.js?v=84d0cdef';
import { makeCellIndex } from './cellindex.js?v=84d0cdef';
import { makeBloom } from './postfx.js?v=84d0cdef';

export function initBattleTab(root) {
  let active = false;

  const params = {
    seed: 7,
    points: 4000,
    rooms: 6,
    roomRadius: 2,
    extraCorridors: 2,
    corridorWidth: 2,
    wallHeight: 0.03,
    relaxIters: 80,
    view: 'third', // pov | third
    look: 'tronColors', // visual identity, see looks.js
    wallTops: 'dim', // auto | bright | dim | black — wall-top wires & fill
    speed: 1.1, // cells per second, wanderer pace
    autoResume: 3, // seconds idle before auto-wander resumes
    // mkcx by default: the authored hover tank. Async — buildUnit falls
    // back to the procedural tank until the bytes land, then
    // onMkcxReady swaps it in.
    creature: 'mkcx2',
    orbs: 10,
    orbRespawn: 8, // seconds between respawns (0 = off)
    enemies: 4,
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
  };

  // --- scene ---------------------------------------------------------------
  const container = root.querySelector('#b-app');
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

  // phagocytosis state, recomputed per frame (amoeba only)
  const reach = { dir: null, amt: 0 };
  const tmpV = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const Y_AXIS = new THREE.Vector3(0, 1, 0);
  const tmpN = new THREE.Vector3();

  function clearOrbs() {
    for (const orb of orbMeshes.values()) {
      scene.remove(orb);
      orb.geometry.dispose();
    }
    orbMeshes.clear();
  }

  // one orb on a random open cell (never spawn/heart/occupied/under the creature)
  function spawnOneOrb() {
    const open = [];
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (dungeon.tags[i] !== BLOCKED && i !== dungeon.spawn && i !== dungeon.heart
        && i !== player.cur && !orbMeshes.has(i)) open.push(i);
    }
    if (open.length === 0) return false;
    const ci = open[Math.floor(orbRng() * open.length)];
    const r = cellSide * 0.19;
    // Braille dotted sphere; treatment drawn from the five effects
    const fx = ORB_FX[Math.floor(orbRng() * ORB_FX.length)];
    const orb = makeOrbCloud(fx, { body: look().orb.color, hi: 0xffffff }, orbRng() * 6.283);
    orb.scale.setScalar(r);
    orb.userData.sizeScale = r;
    const c = graph.centers[ci];
    const n = graph.normals[ci];
    const p = add3(c, scale3(n, r * 1.15));
    orb.position.set(p[0], p[1], p[2]);
    scene.add(orb);
    orbMeshes.set(ci, orb);
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
    orb.geometry.dispose();
    orbMeshes.delete(ci);
    absorbed++;
    ammo = Math.min(AMMO_MAX, ammo + 1); // orbs are shells here, not food
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
  // enemy tanks are solid: no phasing through them
  unitBlocker = (cand) => enemies.some((e) => e.alive && dist3(cand, e.pos) < cellSide * 0.5);

  // held-key state: steering and pace are continuous while held, not nudges
  const keys = { left: false, right: false, fast: false, slow: false };
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

    // fat marker so the player reads on the minimap
    markerMesh = new THREE.Mesh(
      new THREE.SphereGeometry(cellSide * 0.32, 12, 12),
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
    const p = add3(player.pos, scale3(n, lift));
    playerMesh.position.set(p[0], p[1], p[2]);
    playerMesh.scale.setScalar(unitScale * (playerMesh.userData.baseScale ?? 1));
    markerMesh.position.set(p[0], p[1], p[2]);
    // upright on the surface, facing the SMOOTHED direction (no snap)
    const h = player.smoothDir;
    tmpObj.position.copy(playerMesh.position);
    tmpObj.up.set(n[0], n[1], n[2]);
    tmpObj.lookAt(p[0] + h[0], p[1] + h[1], p[2] + h[2]);
    playerMesh.quaternion.copy(tmpObj.quaternion);
    // no extra rotation: lookAt with up=n already leaves body +Y ≈ normal
  }

  // --- trench / third-person camera ----------------------------------------
  // follows the interpolated position and the SMOOTHED direction
  function updateCameraGoal() {
    const c = player.pos;
    const n = norm3(c);
    const h = player.smoothDir;
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

  function arriveAt(cell) {
    player.prev = player.cur;
    player.cur = cell;
    player.moves++;
    player.visited.add(cell);
    paintCell(player.prev, floorColorOf(player.prev));
    updateHud();

    if (cell === dungeon.heart && !player.won) {
      player.won = true;
      msgEl.innerHTML = `<div class="msg-head">transmission · sector log</div>` +
        `💗 the creature found the heart<br>` +
        `${player.moves} moves · ${absorbed} orbs absorbed · ` +
        `size ×${(unitScale / baseUnitScale).toFixed(2)}<br>` +
        `<button class="msg-regen">⟲ regenerate</button>`;
      msgEl.classList.remove('hidden');
    }
  }

  // called once per frame: steer, glide (creature-paced), respawn, absorb
  function advanceMotion(dt) {
    if (player.won || player.next === -1) return;
    simTime += dt;

    // continuous steering while held; ANY key claims manual control
    const anyKey = keys.left || keys.right || keys.fast || keys.slow;
    manualClock = anyKey ? 0 : manualClock + dt;
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
      // mobile-first: manual ALWAYS rolls forward — the player's attention
      // goes to steering and aiming, not throttle. S reverses, W boosts.
      const drive = keys.slow ? -0.55 : keys.fast ? 1.45 : 1;
      if (drive !== 0) {
        const v = params.speed * cellSide * 1.6 * drive;
        const step = scale3(player.heading, v * dt);
        let cand = norm3(add3(player.pos, step));
        if (freeBlocked(cand)) {
          // slide: strip the into-wall component and try again
          const w = nearestWall(cand);
          if (w) {
            const toWall = norm3(sub3(w, player.pos));
            const into = Math.max(0, dot3(step, toWall));
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
    const pace = params.speed * (prof ? prof.speed(simTime) : 1);
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
    // keep the steering intent in the local tangent plane as we move
    player.heading = norm3(sub3(player.heading, scale3(n, dot3(player.heading, n))));

    updateSmoothDir(dt);
    checkAbsorb();
  }
  let simTime = 0;

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
    const k = ev.key.toLowerCase();
    const m = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
      arrowup: 'fast', w: 'fast', arrowdown: 'slow', s: 'slow' }[k];
    if (m) { keys[m] = down; ev.preventDefault(); return; }
    if (down && (k === ' ' || k === 'spacebar')) { fire(); ev.preventDefault(); return; }
    if (down && k === 'h') pulseHint();
    if (down && k === 'v') toggleView();
  }
  addEventListener('keydown', (ev) => onKeyEvent(ev, true));
  addEventListener('keyup', (ev) => onKeyEvent(ev, false));
  addEventListener('blur', () => { keys.left = keys.right = keys.fast = keys.slow = false; });

  function toggleView() {
    params.view = params.view === 'pov' ? 'third' : 'pov';
    viewCtrl.updateDisplay();
  }

  // D-pad: press-and-hold, like the keys
  function holdButton(sel, flag) {
    const el = root.querySelector(sel);
    el.addEventListener('pointerdown', (ev) => { ev.preventDefault(); keys[flag] = true; });
    for (const evt of ['pointerup', 'pointerleave', 'pointercancel']) {
      el.addEventListener(evt, () => { keys[flag] = false; });
    }
  }
  holdButton('#b-pad-up', 'fast');
  holdButton('#b-pad-left', 'left');
  holdButton('#b-pad-right', 'right');
  holdButton('#b-pad-down', 'slow');
  root.querySelector('#b-pad-hint').addEventListener('click', () => pulseHint());
  root.querySelector('#b-pad-view').addEventListener('click', () => toggleView());
  root.querySelector('#b-pad-fire').addEventListener('click', () => fire());

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
  const statsEl = root.querySelector('#b-stats');
  const msgEl = root.querySelector('#b-msg');
  // the modal's regenerate button (event delegation survives innerHTML swaps)
  msgEl.addEventListener('click', (ev) => {
    if (ev.target.classList && ev.target.classList.contains('msg-regen')) regenerate();
  });
  function updateHud() {
    const alive = enemies.filter((e) => e.alive).length;
    statsEl.textContent =
      `shells ${'●'.repeat(ammo).padEnd(AMMO_MAX, '·')} (${ammo})   enemies ${alive}/${enemies.length}\n` +
      `orbs on field ${orbMeshes.size} (each = +1 shell)   moves ${player.moves}\n` +
      (manualActive() ? 'MANUAL — release keys to hand back control' : 'auto-wander') +
      '   ·   SPACE / ✦ fires when the turret lines up';
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
    for (let i = projectiles.length - 1; i >= 0; i--) killProjectile(i);
    orbRng = mulberry32((params.seed ^ 0x0b0b5) >>> 0);
    respawnClock = 0;
    simTime = 0;

    buildGeometry();
    buildActors();
    spawnOrbs();
    spawnEnemies();
    placeActors();
    snapCamera();
    msgEl.classList.add('hidden');
    updateHud();
    console.log(`battle sector in ${(performance.now() - t0).toFixed(0)}ms — ` +
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
    placeActors();
  }


  // --- enemies: easy AI, they only wander ----------------------------------
  function clearEnemies() {
    for (const e of enemies) scene.remove(e.obj);
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
    clearEnemies();
    const d = bfsDistFromSpawn();
    const candidates = [];
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (dungeon.tags[i] !== BLOCKED && d[i] >= 6 && i !== dungeon.heart) candidates.push(i);
    }
    for (let k = 0; k < params.enemies && candidates.length > 0; k++) {
      const ci = candidates.splice(Math.floor(whim() * candidates.length), 1)[0];
      const obj = buildUnit('tank', { walker: look().enemy || 0xd94f4f, walkerHi: look().enemyHi || 0xffd77a });
      obj.scale.setScalar((obj.userData.baseScale ?? 1) * cellSide * 0.55);
      scene.add(obj);
      const exits = openNeighbors(ci);
      enemies.push({
        cur: ci, prev: -1,
        next: exits.length ? exits[Math.floor(whim() * exits.length)] : ci,
        prog: 0, pos: graph.centers[ci].slice(), dir: [0, 1, 0],
        obj, alive: true,
      });
    }
  }

  const ENEMY_SPEED = 0.45; // cells per second — easy mode
  function updateEnemies(dt, tNow) {
    for (const e of enemies) {
      if (!e.alive) continue;
      e.prog += ENEMY_SPEED * dt;
      while (e.prog >= 1) {
        e.prog -= 1;
        e.prev = e.cur;
        e.cur = e.next;
        const exits = openNeighbors(e.cur).filter((c) => c !== e.prev);
        e.next = exits.length ? exits[Math.floor(whim() * exits.length)] : e.prev;
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
      const s = cellSide * 0.55;
      const lift = s * (e.obj.userData.lift ?? 0.05);
      e.obj.position.set(e.pos[0] + n[0] * lift, e.pos[1] + n[1] * lift, e.pos[2] + n[2] * lift);
      tmpObj.position.copy(e.obj.position);
      tmpObj.up.set(n[0], n[1], n[2]);
      tmpObj.lookAt(e.obj.position.x + e.dir[0], e.obj.position.y + e.dir[1], e.obj.position.z + e.dir[2]);
      e.obj.quaternion.copy(tmpObj.quaternion);
      if (e.obj.userData.tick) e.obj.userData.tick(tNow + e.cur); // desync sweeps
    }
  }

  // --- firing: the shot leaves along the turret's CURRENT sweep ------------
  function fire() {
    if (player.won || ammo <= 0) return;
    ammo--;
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

  function updateProjectiles(dt) {
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

      // enemy contact
      let hit = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (dist3(p.pos, e.pos) < cellSide * 0.45) {
          e.alive = false;
          // the tank comes apart: its own polygons scatter and fade
          const fx = makeDebris(e.obj, norm3(e.pos));
          scene.add(fx);
          debris.push(fx);
          scene.remove(e.obj);
          hit = true;
          updateHud();
          if (enemies.every((en) => !en.alive)) {
            player.won = true;
            msgEl.innerHTML = `<div class="msg-head">transmission · combat log</div>` +
              `✦ sector cleared<br>` +
              `${enemies.length} tanks destroyed · ${absorbed} orbs eaten · ${player.moves} moves<br>` +
              `<button class="msg-regen">⟲ new sector</button>`;
            msgEl.classList.remove('hidden');
          }
          break;
        }
      }
      if (hit) { killProjectile(i); continue; }

      // wall impact: nearest cell is a wall -> fizzle
      let bestCi = -1, bd = Infinity;
      for (let ci = 0; ci < graph.centers.length; ci++) {
        const c = graph.centers[ci];
        const dx = c[0] - p.pos[0], dy = c[1] - p.pos[1], dz = c[2] - p.pos[2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bd) { bd = d2; bestCi = ci; }
      }
      if ((bestCi !== -1 && dungeon.tags[bestCi] === BLOCKED) || p.dist > maxDist) {
        killProjectile(i);
      }
    }
  }

  // --- dashboard -----------------------------------------------------------
  const gui = new GUI({ title: 'sphere battle', container: root });
  gui.add(params, 'creature', UNIT_NAMES).onChange(regenerate);
  gui.add(params, 'look', LOOK_NAMES).onChange(applyLook);
  gui.add(params, 'wallTops', ['auto', 'bright', 'dim', 'black'])
    .name('wall tops').onChange(applyLook);
  const viewCtrl = gui.add(params, 'view', ['pov', 'third']).name('camera (V)');
  const speedCtrl = gui.add(params, 'speed', 0.2, 4, 0.1).name('wander speed');
  gui.add(params, 'autoResume', 1, 10, 0.5).name('auto resume (s)');
  gui.add(params, 'enemies', 1, 12, 1).onFinishChange(regenerate);
  gui.add(params, 'orbs', 0, 40, 1).onFinishChange(regenerate);
  gui.add(params, 'orbRespawn', 0, 30, 1).name('orb respawn (s)');
  const seedCtrl = gui.add(params, 'seed', 0, 99999, 1).onFinishChange(regenerate);
  gui.add(params, 'points', 150, 8000, 50).name('sample points').onFinishChange(regenerate);
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
    const now = performance.now();
    const dt = Math.min((now - lastFrame) / 1000, 0.1); // clamp tab-switch gaps
    lastFrame = now;
    t += dt;

    advanceMotion(dt);
    for (const orb of orbMeshes.values()) orb.userData.tick(t);
    for (let i = debris.length - 1; i >= 0; i--) {
      if (!debris[i].userData.tick(dt)) {
        scene.remove(debris[i]);
        debris[i].geometry.dispose();
        debris.splice(i, 1);
      }
    }
    updateEnemies(dt, t);
    updateProjectiles(dt);
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

    // main view
    scene.background = mainBg;
    markerMesh.visible = false;
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

  // ?tick=N synchronously simulates N seconds of wandering (demo/debug —
  // headless virtual time doesn't advance performance.now, so real motion
  // can't be screenshot-verified without this)
  const tickN = parseFloat(urlParams.get('tick') || '0');
  if (tickN > 0) {
    for (let s = 0; s < tickN; s += 0.05) advanceMotion(0.05);
    placeActors();
    snapCamera();
  }

  // the default unit's model loads async; swap it in when it lands
  onMkcxReady(() => { buildActors(); placeActors(); });
  resize();
  animate();

  return {
    setActive(on) {
      active = on;
      if (on) { resize(); snapCamera(); }
    },
  };
}
