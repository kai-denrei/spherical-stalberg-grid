// maze-tab.js — dungeon PoC on the sphere grid. All tiles start elevated
// (walls); rooms + hallways are carved over the cell graph (dungeon.js).
// Two views: the "trench" PoV riding the walker at wall-top height, and the
// whole sphere as a minimap (bottom-left inset). A half-dotted heart sits at
// the graph-farthest cell; the D-pad / arrow keys walk the graph to reach it.

import * as THREE from '../vendor/three.module.js';
import GUI from '../vendor/lil-gui.esm.js';
import { generateSphereMesh, relax } from './grid.js?v=2087595e';
import { generateDungeon, BLOCKED, PATH, ROOM } from './dungeon.js?v=2087595e';
import { mulberry32, randomSeed } from './rng.js?v=2087595e';
import { sub3, add3, scale3, dot3, cross3, norm3, len3, dist3 } from './vec3.js?v=2087595e';

export function initMazeTab(root) {
  let active = false;

  const params = {
    seed: 7,
    points: 400,
    rooms: 6,
    roomRadius: 2,
    extraCorridors: 2,
    wallHeight: 0.03,
    relaxIters: 80,
    view: 'third', // pov | third
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

  // even-ish lighting: the walker can be anywhere on the sphere, so no side
  // may fall into unreadable darkness
  scene.add(new THREE.HemisphereLight(0xc8cfe0, 0x555060, 1.5));
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
  }
  addEventListener('resize', resize);

  // --- state ---------------------------------------------------------------
  let mesh = null, dungeon = null, graph = null;
  let cellSide = 0.08;
  let floorGeo = null, wallGeo = null, floorMesh = null, wallMesh = null;
  let edgeGeo = null, edgeMesh = null;
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
    moves: 0,
    visited: new Set(),
    won: false,
  };
  let whim = mulberry32(1); // the walker's own randomness, reseeded per maze

  // held-key state: steering and pace are continuous while held, not nudges
  const keys = { left: false, right: false, fast: false, slow: false };
  let steerHold = 99; // seconds since the user last steered
  const steeringActive = () => steerHold < 1.2;
  // manual override: ANY WASD press disables auto-wander entirely; it
  // resumes only after params.autoResume seconds without input
  let manualClock = 99;
  let prevSlow = false;
  const manualActive = () => manualClock < params.autoResume;

  const camGoal = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  const tmpObj = new THREE.Object3D();
  // lookAt convention trap: a plain Object3D faces +Z at the target, but a
  // camera renders down -Z (three.js special-cases isCamera in lookAt).
  // The camera goal quaternion MUST come from a camera instance, or the view
  // ends up rotated 180° — staring backward along the heading.
  const tmpCam = new THREE.PerspectiveCamera();

  // --- colors --------------------------------------------------------------
  const COL = {
    path: [0.80, 0.72, 0.52],
    room: [0.86, 0.80, 0.62],
    visited: [0.62, 0.68, 0.58],
    spawn: [0.45, 0.68, 0.80],
    heartFloor: [0.92, 0.45, 0.55],
    wallTop: [0.36, 0.40, 0.47],
    wallSide: [0.22, 0.25, 0.31],
    hintFlash: [0.55, 0.95, 0.75],
  };

  function floorColorOf(ci) {
    if (ci === dungeon.heart) return COL.heartFloor;
    if (ci === dungeon.spawn) return COL.spawn;
    if (player.visited.has(ci)) return COL.visited;
    return dungeon.tags[ci] === ROOM ? COL.room : COL.path;
  }

  // --- geometry ------------------------------------------------------------
  function buildGeometry() {
    const { vertices, quads } = mesh;
    const H = 1 + params.wallHeight;
    const jr = mulberry32(params.seed ^ 0xc0ffee);

    // floors: open cells at the surface
    const fPos = [], fCol = [], ePos = [];
    const pushEdge = (p, q2) => ePos.push(p[0], p[1], p[2], q2[0], q2[1], q2[2]);
    floorOffsets = new Map();
    for (let ci = 0; ci < quads.length; ci++) {
      if (dungeon.tags[ci] === BLOCKED) continue;
      const q = quads[ci];
      floorOffsets.set(ci, fPos.length / 3);
      const [r, g, b] = floorColorOf(ci);
      const j = (jr() - 0.5) * 0.05;
      for (const vi of [q[0], q[1], q[2], q[0], q[2], q[3]]) {
        const p = vertices[vi];
        fPos.push(p[0], p[1], p[2]);
        fCol.push(r + j, g + j, b + j);
      }
      for (let i = 0; i < 4; i++) pushEdge(vertices[q[i]], vertices[q[(i + 1) % 4]]);
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
      const j = (jr() - 0.5) * 0.08;
      pushQuad(top[0], top[1], top[2], top[3], COL.wallTop, j);
      for (let i = 0; i < 4; i++) pushEdge(top[i], top[(i + 1) % 4]);
      for (let i = 0; i < 4; i++) {
        const a = q[i], b = q[(i + 1) % 4];
        const nb = edgeToCell.get(`${b}-${a}`); // twin edge's owner
        if (nb === undefined || dungeon.tags[nb] === BLOCKED) continue;
        // skirt facing the open neighbour, wound outward
        pushQuad(top[(i + 1) % 4], top[i], vertices[a], vertices[b], COL.wallSide, j);
        pushEdge(top[i], vertices[a]);
        pushEdge(top[(i + 1) % 4], vertices[b]);
      }
    }

    for (const [geo, obj] of [[floorGeo, floorMesh], [wallGeo, wallMesh], [edgeGeo, edgeMesh]]) {
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
    edgeMesh = new THREE.LineSegments(edgeGeo,
      new THREE.LineBasicMaterial({ color: 0x171a22, transparent: true, opacity: 0.7 }));
    scene.add(edgeMesh);
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
  function makeHeartTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const heartPath = () => {
      x.beginPath();
      x.moveTo(128, 224);
      x.bezierCurveTo(24, 144, 24, 64, 88, 48);
      x.bezierCurveTo(116, 41, 128, 64, 128, 80);
      x.bezierCurveTo(128, 64, 140, 41, 168, 48);
      x.bezierCurveTo(232, 64, 232, 144, 128, 224);
      x.closePath();
    };
    // left half: solid
    x.save();
    x.beginPath(); x.rect(0, 0, 128, 256); x.clip();
    heartPath(); x.fillStyle = '#ff5f7e'; x.fill();
    x.restore();
    // right half: dotted outline
    x.save();
    x.beginPath(); x.rect(128, 0, 128, 256); x.clip();
    heartPath();
    x.strokeStyle = '#ff5f7e'; x.lineWidth = 7; x.setLineDash([8, 9]); x.stroke();
    x.restore();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function buildActors() {
    for (const o of [heartSprite, playerMesh, markerMesh]) if (o) scene.remove(o);

    heartSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeHeartTexture(), transparent: true, depthTest: true,
    }));
    scene.add(heartSprite);

    // walker size follows the SMALLER of cell width and wall height: the
    // camera eye sits at 0.62×wallHeight, so at low walls a cell-sized cone
    // would tower over the lens and blot out the view ahead. 0.75×wallHeight
    // keeps the cone tip (elevation+height = 0.72×size) under the eye line.
    playerSize = Math.min(cellSide, params.wallHeight * 0.75);
    playerMesh = new THREE.Mesh(
      new THREE.ConeGeometry(playerSize * 0.18, playerSize * 0.5, 10),
      new THREE.MeshLambertMaterial({ color: 0x54e0c8 }),
    );
    scene.add(playerMesh);

    // fat marker so the player reads on the minimap
    markerMesh = new THREE.Mesh(
      new THREE.SphereGeometry(cellSide * 0.32, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x54e0c8 }),
    );
    scene.add(markerMesh);
  }

  function placeActors() {
    const hc = graph.centers[dungeon.heart];
    const hn = graph.normals[dungeon.heart];
    const hPos = add3(hc, scale3(hn, params.wallHeight * 0.6 + cellSide * 0.55));
    heartSprite.position.set(hPos[0], hPos[1], hPos[2]);
    const s = cellSide * 1.9;
    heartSprite.scale.set(s, s, s);

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
      msgEl.innerHTML = `💗 the wanderer found the heart<br>${player.moves} moves · ` +
        `${dungeon.distToHeart[dungeon.spawn]} was the shortest<br>` +
        `<span style="color:#8a93ad">regenerate (panel) for a new maze</span>`;
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

    // manual S (fresh press): turn around, then drive
    if (manual && keys.slow && !prevSlow && player.next !== -1) {
      const old = player.cur;
      player.cur = player.next;
      player.next = old;
      player.prog = 1 - player.prog;
      player.prev = -1;
      player.heading = scale3(player.heading, -1);
    }
    prevSlow = keys.slow;

    // U-turn: heading swung behind the motion — reverse the glide in place.
    // Position is continuous (same chord, opposite direction), so holding A
    // or D sweeps you around and back the way you came with no jump.
    const driving = !manual || keys.fast || keys.slow;
    if ((manual ? driving : steeringActive()) && dot3(player.heading, player.travelDir) < -0.35
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
    const pace = manual
      ? ((keys.fast || keys.slow) ? params.speed * 1.5 : 0)
      : params.speed;
    player.prog += (pace * cellSide * dt) / player.segLen;
    while (player.prog >= 1 && !player.won) {
      const carry = (player.prog - 1) * player.segLen; // leftover distance
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
    const a = graph.centers[player.cur];
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
    });
    graph = dungeon.graph;
    cellSide = mesh.defaultSide;

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

  // --- dashboard -----------------------------------------------------------
  const gui = new GUI({ title: 'sphere dungeon', container: root });
  const viewCtrl = gui.add(params, 'view', ['pov', 'third']).name('camera (V)');
  const speedCtrl = gui.add(params, 'speed', 0.2, 4, 0.1).name('wander speed');
  gui.add(params, 'autoResume', 1, 10, 0.5).name('auto resume (s)');
  const seedCtrl = gui.add(params, 'seed', 0, 99999, 1).onFinishChange(regenerate);
  gui.add(params, 'points', 150, 1200, 10).name('sample points').onFinishChange(regenerate);
  gui.add(params, 'rooms', 2, 12, 1).onFinishChange(regenerate);
  gui.add(params, 'roomRadius', 1, 4, 1).name('room radius').onFinishChange(regenerate);
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
    updateCameraGoal();

    camera.position.lerp(camGoal.pos, 0.14);
    camera.quaternion.slerp(camGoal.quat, 0.14);

    const pulse = 1 + Math.sin(t * 3.4) * 0.08;
    const s = cellSide * 1.9 * pulse;
    heartSprite.scale.set(s, s, s);

    const w = container.clientWidth, h = container.clientHeight;
    renderer.setScissorTest(true);

    // main: trench PoV
    renderer.setViewport(0, 0, w, h);
    renderer.setScissor(0, 0, w, h);
    scene.background = mainBg;
    markerMesh.visible = false;
    // below knee-height walls the PoV camera rides so low that even the scaled
    // cone squats mid-frame — first-person goes clean, minimap keeps the cone.
    // In third person the walker IS the subject: always visible.
    playerMesh.visible = params.view === 'third' || params.wallHeight >= 0.05;
    renderer.render(scene, camera);

    // inset: the sphere as a minimap, player-centred, smoothed-direction up
    const m = Math.min(260, Math.floor(Math.min(w, h) * 0.34));
    const n = norm3(player.pos);
    const hd = player.smoothDir;
    mapCamera.position.set(n[0] * 2.75, n[1] * 2.75, n[2] * 2.75);
    mapCamera.up.set(hd[0], hd[1], hd[2]);
    mapCamera.lookAt(0, 0, 0);
    mapCamera.aspect = 1;
    mapCamera.updateProjectionMatrix();
    renderer.setViewport(14, 14, m, m);
    renderer.setScissor(14, 14, m, m);
    scene.background = mapBg;
    markerMesh.visible = true;
    playerMesh.visible = true;
    renderer.clearDepth();
    renderer.render(scene, mapCamera);

    renderer.setScissorTest(false);
  }

  // debug/demo overrides: ?wall=0.03 forces a wall height,
  // ?walk=N auto-walks N hops along the shortest route to the heart
  // (handy for screenshotting specific configurations)
  const urlParams = new URLSearchParams(location.search);
  const wallOverride = parseFloat(urlParams.get('wall') || '');
  if (Number.isFinite(wallOverride)) params.wallHeight = wallOverride;
  if (urlParams.get('view') === 'third') { params.view = 'third'; viewCtrl.updateDisplay(); }

  regenerate();

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

  resize();
  animate();

  return {
    setActive(on) {
      active = on;
      if (on) { resize(); snapCamera(); }
    },
  };
}
