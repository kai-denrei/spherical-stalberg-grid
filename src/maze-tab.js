// maze-tab.js — dungeon PoC on the sphere grid. All tiles start elevated
// (walls); rooms + hallways are carved over the cell graph (dungeon.js).
// Two views: the "trench" PoV riding the walker at wall-top height, and the
// whole sphere as a minimap (bottom-left inset). A half-dotted heart sits at
// the graph-farthest cell; the D-pad / arrow keys walk the graph to reach it.

import * as THREE from '../vendor/three.module.js';
import GUI from '../vendor/lil-gui.esm.js';
import { generateSphereMesh, relax } from './grid.js?v=3af4b749';
import { generateDungeon, BLOCKED, PATH, ROOM } from './dungeon.js?v=3af4b749';
import { mulberry32, randomSeed } from './rng.js?v=3af4b749';
import { sub3, add3, scale3, dot3, cross3, norm3, len3, dist3 } from './vec3.js?v=3af4b749';
import { LOOKS, LOOK_NAMES } from './looks.js?v=3af4b749';
import { makeCellIndex } from './cellindex.js?v=3af4b749';
import { UNIT_NAMES, buildUnit, makeHeartCloud } from './units.js?v=3af4b749';

export function initMazeTab(root) {
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
    unit: 'tank', // roster unit for the spawn button
    speed: 1.1, // cells per second, wanderer pace
    autoResume: 3, // seconds idle before auto-wander resumes
  };

  // --- scene ---------------------------------------------------------------
  const container = root.querySelector('#maze-app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const mainBg = new THREE.Color(0x0d1017);
  scene.background = mainBg;

  const camera = new THREE.PerspectiveCamera(68, 1, 0.004, 50);
  const mapCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);

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
    smoothDir: [0, 1, 0], // rate-limited travelDir — cameras/cone follow THIS
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
  const Y_AXIS = new THREE.Vector3(0, 1, 0);
  const tmpN = new THREE.Vector3();
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

    // walker size follows the SMALLER of cell width and wall height: the
    // camera eye sits at 0.62×wallHeight, so at low walls a cell-sized cone
    // would tower over the lens and blot out the view ahead. 0.75×wallHeight
    // keeps the cone tip (elevation+height = 0.72×size) under the eye line.
    playerSize = Math.min(cellSide, params.wallHeight * 0.75);
    playerMesh = new THREE.Mesh(
      new THREE.ConeGeometry(playerSize * 0.18, playerSize * 0.5, 10),
      new THREE.MeshBasicMaterial({ color: look().walker }), // unlit: must pop under every light rig
    );
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
    const p = add3(player.pos, scale3(n, playerSize * 0.22));
    playerMesh.position.set(p[0], p[1], p[2]);
    markerMesh.position.set(p[0], p[1], p[2]);
    // cone points along the smoothed direction (no snap at cell changes)
    const h = player.smoothDir;
    tmpObj.position.copy(playerMesh.position);
    tmpObj.up.set(n[0], n[1], n[2]);
    tmpObj.lookAt(p[0] + h[0], p[1] + h[1], p[2] + h[2]);
    playerMesh.quaternion.copy(tmpObj.quaternion);
    playerMesh.rotateX(Math.PI / 2); // cone +Y -> forward
  }

  // --- trench / third-person camera ----------------------------------------
  // follows the interpolated position and the SMOOTHED direction
  function updateCameraGoal() {
    const c = player.pos;
    const n = norm3(c);
    const h = player.smoothDir;
    let eye, look;
    if (params.view === 'third') {
      // behind and above: over the wall tops, walker in frame, maze readable
      eye = add3(add3(c, scale3(n, params.wallHeight * 2.6 + cellSide * 1.1)),
        scale3(h, -cellSide * 1.8));
      look = add3(add3(c, scale3(n, params.wallHeight * 0.4)), scale3(h, cellSide * 1.4));
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
    // walker's curiosity, backtrack aversion, and whims all yield
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
        `💗 the wanderer found the heart<br>${player.moves} moves · ` +
        `${dungeon.distToHeart[dungeon.spawn]} was the shortest<br>` +
        `<button class="msg-regen">⟲ regenerate</button>`;
      msgEl.classList.remove('hidden');
    }
  }

  // called once per frame: steer, glide, pick a new exit on each cell arrival
  function advanceMotion(dt) {
    if (player.won || player.next === -1) return;

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
      // (maze: nothing else runs while free)
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
    // Position is continuous (same chord, opposite direction), so holding A
    // or D sweeps you around and back the way you came with no jump.
    if (steeringActive() && dot3(player.heading, player.travelDir) < -0.35
      && player.prog > 0.04 && player.prog < 0.96) {
      const old = player.cur;
      player.cur = player.next;
      player.next = old;
      player.prog = 1 - player.prog;
      player.prev = -1; // forget the backtrack context; this is deliberate
    }

    // motion lives in WORLD space, not grid space: speed is distance/sec
    // (scaled so the slider still reads as average-cells/sec), and prog is
    // that distance over THIS segment's length — a long chord between two
    // large cells takes proportionally longer than a short one. The grid
    // offers the space; the motion just traverses it.
    // manual: motion only while W/S are held; auto: steady wander pace
    const pace = params.speed;
    player.prog += (pace * cellSide * dt) / player.segLen;
    while (player.prog >= 1 && !player.won) {
      const carry = (player.prog - 1) * player.segLen; // leftover distance
      player.virtualStart = null;
      arriveAt(player.next);
      // idle: steering intent drifts toward actual travel so stale input
      // fades. While the user steers, their intent is left untouched.
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
    const t = Math.min(player.prog, 1);
    const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    player.pos = norm3(p); // radius 1
    const n = player.pos;
    const d = sub3(b, player.pos);
    const flat = sub3(d, scale3(n, dot3(d, n)));
    const l = Math.hypot(flat[0], flat[1], flat[2]);
    if (l > 1e-9) player.travelDir = scale3(flat, 1 / l);
    // keep the steering intent in the local tangent plane as we move
    player.heading = norm3(sub3(player.heading, scale3(n, dot3(player.heading, n))));

    updateSmoothDir(dt);
  }

  const STEER_RATE = 2.6; // rad/s while a steer key is held
  function rotate(theta) {
    const n = norm3(player.pos);
    const h = player.heading;
    const c = Math.cos(theta), s = Math.sin(theta);
    const nxh = cross3(n, h);
    player.heading = norm3(add3(scale3(h, c), scale3(nxh, s)));
  }

  // smoothDir chases travelDir at a bounded angular rate, so cameras and the
  // walker sweep through direction changes (new exits, U-turns) instead of
  // snapping. This is THE no-jump guarantee: raw travelDir is discontinuous
  // at every cell arrival; smoothDir never is.
  const SMOOTH_RATE = 5.0; // rad/s
  function updateSmoothDir(dt) {
    const n = norm3(player.pos);
    // both projected into the current tangent plane
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
  holdButton('#pad-up', 'fast');
  holdButton('#pad-left', 'left');
  holdButton('#pad-right', 'right');
  holdButton('#pad-down', 'slow');
  root.querySelector('#pad-hint').addEventListener('click', () => pulseHint());
  root.querySelector('#pad-view').addEventListener('click', () => toggleView());

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
  const statsEl = root.querySelector('#maze-stats');
  const msgEl = root.querySelector('#maze-msg');
  // the modal's regenerate button (event delegation survives innerHTML swaps)
  msgEl.addEventListener('click', (ev) => {
    if (ev.target.classList && ev.target.classList.contains('msg-regen')) regenerate();
  });
  function updateHud() {
    statsEl.textContent =
      `hops to heart ${dungeon.distToHeart[player.cur]}   moves ${player.moves}\n` +
      `open cells ${floorOffsets.size}   walls ${dungeon.tags.length - floorOffsets.size}\n` +
      (manualActive() ? 'MANUAL — release keys to hand back control' : 'auto-wander');
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

    clearUnits();
    buildGeometry();
    buildActors();
    placeActors();
    snapCamera();
    msgEl.classList.add('hidden');
    updateHud();
    console.log(`maze in ${(performance.now() - t0).toFixed(0)}ms — ` +
      `${floorOffsets.size} open cells, spawn→heart ${dungeon.distToHeart[dungeon.spawn]} hops`);
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
    placeActors();
    retintSpawned();
  }


  // --- unit spawning: drop roster units on the board to look at them -------
  const spawned = []; // { name, ci, obj }
  unitBlocker = (cand) => spawned.some((s) => dist3(cand, graph.centers[s.ci]) < cellSide * 0.45);

  function placeSpawned(entry) {
    const c = graph.centers[entry.ci];
    const n = graph.normals[entry.ci];
    const s = cellSide * 0.55;
    const obj = entry.obj;
    obj.scale.setScalar((obj.userData.baseScale ?? 1) * s);
    const lift = s * (obj.userData.lift ?? 0.05);
    obj.position.set(c[0] + n[0] * lift, c[1] + n[1] * lift, c[2] + n[2] * lift);
    // upright on the surface, facing the walker's current heading
    tmpObj.position.copy(obj.position);
    tmpObj.up.set(n[0], n[1], n[2]);
    const h = player.heading;
    tmpObj.lookAt(obj.position.x + h[0], obj.position.y + h[1], obj.position.z + h[2]);
    obj.quaternion.copy(tmpObj.quaternion);
  }

  function spawnUnit() {
    // land on the walker's cell, or the nearest free open neighbour if a
    // unit already stands there — repeat spawns spread instead of stacking
    const taken = new Set(spawned.map((s) => s.ci));
    let ci = player.cur;
    if (taken.has(ci)) {
      const free = openNeighbors(ci).find((nb) => !taken.has(nb));
      if (free !== undefined) ci = free;
    }
    const entry = {
      name: params.unit,
      ci,
      obj: buildUnit(params.unit, { walker: look().walker, walkerHi: look().walkerHi }),
    };
    placeSpawned(entry);
    scene.add(entry.obj);
    spawned.push(entry);
  }

  function clearUnits() {
    for (const s of spawned) scene.remove(s.obj);
    spawned.length = 0;
  }

  // look changes rebuild spawned units in the new tints; regenerate clears
  // them (the board they stood on is gone)
  function retintSpawned() {
    for (const entry of spawned) {
      scene.remove(entry.obj);
      entry.obj = buildUnit(entry.name, { walker: look().walker, walkerHi: look().walkerHi });
      placeSpawned(entry);
      scene.add(entry.obj);
    }
  }

  // --- dashboard -----------------------------------------------------------
  const gui = new GUI({ title: 'sphere dungeon', container: root });
  gui.add(params, 'look', LOOK_NAMES).onChange(applyLook);
  gui.add(params, 'wallTops', ['auto', 'bright', 'dim', 'black'])
    .name('wall tops').onChange(applyLook);
  const gUnits = gui.addFolder('units');
  gUnits.add(params, 'unit', UNIT_NAMES);
  gUnits.add({ spawn: spawnUnit }, 'spawn').name('⊕ spawn at walker');
  gUnits.add({ clear: clearUnits }, 'clear').name('✕ clear units');
  const viewCtrl = gui.add(params, 'view', ['pov', 'third']).name('camera (V)');
  const speedCtrl = gui.add(params, 'speed', 0.2, 4, 0.1).name('wander speed');
  gui.add(params, 'autoResume', 1, 10, 0.5).name('auto resume (s)');
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
    updateHud();
    placeActors();
    for (const s of spawned) if (s.obj.userData.tick) s.obj.userData.tick(t);
    updateCameraGoal();

    camera.position.lerp(camGoal.pos, 0.14);
    camera.quaternion.slerp(camGoal.quat, 0.14);

    heartSprite.userData.tick(t);

    // main view
    scene.background = mainBg;
    markerMesh.visible = false;
    // below knee-height walls the PoV camera rides so low that even the scaled
    // cone squats mid-frame — first-person goes clean, minimap keeps the cone.
    // In third person the walker IS the subject: always visible.
    playerMesh.visible = params.view === 'third' || params.wallHeight >= 0.05;
    renderer.render(scene, camera);

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

  // ?spawn=tank,drone drops units at the walker after ?walk/?tick resolve
  // (deferred below, after regenerate)
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

  for (const name of (urlParams.get('spawn') || '').split(',')) {
    if (name && UNIT_NAMES.includes(name)) { params.unit = name; spawnUnit(); }
  }

  resize();
  animate();

  return {
    setActive(on) {
      active = on;
      if (on) { resize(); snapCamera(); }
    },
  };
}
