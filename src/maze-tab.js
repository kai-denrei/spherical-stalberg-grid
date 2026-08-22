// maze-tab.js — dungeon PoC on the sphere grid. All tiles start elevated
// (walls); rooms + hallways are carved over the cell graph (dungeon.js).
// Two views: the "trench" PoV riding the walker at wall-top height, and the
// whole sphere as a minimap (bottom-left inset). A half-dotted heart sits at
// the graph-farthest cell; the D-pad / arrow keys walk the graph to reach it.

import * as THREE from '../vendor/three.module.js';
import GUI from '../vendor/lil-gui.esm.js';
import { generateSphereMesh, relax } from './grid.js?v=354e4d92';
import { generateDungeon, BLOCKED, PATH, ROOM } from './dungeon.js?v=354e4d92';
import { mulberry32, randomSeed } from './rng.js?v=354e4d92';
import { sub3, add3, scale3, dot3, cross3, norm3, len3 } from './vec3.js?v=354e4d92';

export function initMazeTab(root) {
  let active = false;

  const params = {
    seed: 7,
    points: 400,
    rooms: 6,
    roomRadius: 2,
    extraCorridors: 2,
    wallHeight: 0.1,
    relaxIters: 80,
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

  const player = {
    cur: 0, prev: -1,
    heading: [1, 0, 0], // unit tangent at cur
    moves: 0,
    visited: new Set(),
    won: false,
  };

  const camGoal = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  const tmpObj = new THREE.Object3D();

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

    playerMesh = new THREE.Mesh(
      new THREE.ConeGeometry(cellSide * 0.18, cellSide * 0.5, 10),
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

    const c = graph.centers[player.cur];
    const n = graph.normals[player.cur];
    const p = add3(c, scale3(n, cellSide * 0.22));
    playerMesh.position.set(p[0], p[1], p[2]);
    markerMesh.position.set(p[0], p[1], p[2]);
    // cone points along heading
    const h = player.heading;
    tmpObj.position.copy(playerMesh.position);
    tmpObj.up.set(n[0], n[1], n[2]);
    tmpObj.lookAt(p[0] + h[0], p[1] + h[1], p[2] + h[2]);
    playerMesh.quaternion.copy(tmpObj.quaternion);
    playerMesh.rotateX(Math.PI / 2); // cone +Y -> forward
  }

  // --- trench camera -------------------------------------------------------
  function updateCameraGoal() {
    const c = graph.centers[player.cur];
    const n = graph.normals[player.cur];
    const h = player.heading;
    // eye level with the wall tops, slightly behind the walker, tilted at the
    // corridor floor ahead — the "trench" framing
    // down IN the corridor slot, below the wall tops, staring along its throat
    const eye = add3(add3(c, scale3(n, params.wallHeight * 0.62)), scale3(h, -cellSide * 0.5));
    const look = add3(add3(c, scale3(n, params.wallHeight * 0.28)), scale3(h, cellSide * 2.4));
    camGoal.pos.set(eye[0], eye[1], eye[2]);
    tmpObj.position.copy(camGoal.pos);
    tmpObj.up.set(n[0], n[1], n[2]);
    tmpObj.lookAt(look[0], look[1], look[2]);
    camGoal.quat.copy(tmpObj.quaternion);
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

  // signed angle of exit dir vs heading around the outward normal:
  // positive = left (CCW seen from outside the sphere).
  function exitAngle(dir) {
    const n = graph.normals[player.cur];
    const h = player.heading;
    return Math.atan2(dot3(cross3(h, dir), n), dot3(h, dir));
  }

  function tryMove(targetAngle, tolerance) {
    if (player.won) return;
    const exits = openNeighbors(player.cur);
    let best = -1, bestOff = Infinity, bestDir = null;
    for (const e of exits) {
      const dir = tangentDirTo(player.cur, e);
      let off = Math.abs(exitAngle(dir) - targetAngle);
      if (off > Math.PI) off = 2 * Math.PI - off;
      if (off < bestOff) { bestOff = off; best = e; bestDir = dir; }
    }
    if (best === -1 || bestOff > tolerance) return; // bump into a wall
    commitMove(best);
  }

  function commitMove(target) {
    player.prev = player.cur;
    player.cur = target;
    player.moves++;
    player.visited.add(target);
    player.heading = tangentDirTo(player.prev, player.cur);
    // re-project heading into the NEW cell's tangent plane
    const n = graph.normals[player.cur];
    player.heading = norm3(sub3(player.heading, scale3(n, dot3(player.heading, n))));

    paintCell(player.prev, floorColorOf(player.prev));
    placeActors();
    updateCameraGoal();
    updateHud();

    if (player.cur === dungeon.heart && !player.won) {
      player.won = true;
      msgEl.innerHTML = `💗 you reached the heart<br>${player.moves} moves · ` +
        `${dungeon.distToHeart[dungeon.spawn]} was the shortest<br>` +
        `<span style="color:#8a93ad">regenerate (panel) for a new maze</span>`;
      msgEl.classList.remove('hidden');
    }
  }

  const FWD = 0, LEFT = Math.PI / 2, RIGHT = -Math.PI / 2, BACK = Math.PI;
  const T_MOVE = THREE.MathUtils.degToRad(70);
  const T_BACK = THREE.MathUtils.degToRad(110);

  function onKey(ev) {
    if (!active) return;
    const k = ev.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') { tryMove(FWD, T_MOVE); ev.preventDefault(); }
    else if (k === 'arrowleft' || k === 'a') { tryMove(LEFT, T_MOVE); ev.preventDefault(); }
    else if (k === 'arrowright' || k === 'd') { tryMove(RIGHT, T_MOVE); ev.preventDefault(); }
    else if (k === 'arrowdown' || k === 's') { tryMove(BACK, T_BACK); ev.preventDefault(); }
    else if (k === 'h') pulseHint();
  }
  addEventListener('keydown', onKey);

  root.querySelector('#pad-up').addEventListener('click', () => tryMove(FWD, T_MOVE));
  root.querySelector('#pad-left').addEventListener('click', () => tryMove(LEFT, T_MOVE));
  root.querySelector('#pad-right').addEventListener('click', () => tryMove(RIGHT, T_MOVE));
  root.querySelector('#pad-down').addEventListener('click', () => tryMove(BACK, T_BACK));
  root.querySelector('#pad-hint').addEventListener('click', () => pulseHint());

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
      `open cells ${floorOffsets.size}   walls ${dungeon.tags.length - floorOffsets.size}`;
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
    const exits = openNeighbors(player.cur);
    // start facing the way to the heart so the first view reads
    let e0 = exits[0];
    for (const e of exits) {
      if (dungeon.distToHeart[e] === dungeon.distToHeart[player.cur] - 1) { e0 = e; break; }
    }
    player.heading = tangentDirTo(player.cur, e0);

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
  const seedCtrl = gui.add(params, 'seed', 0, 99999, 1).onFinishChange(regenerate);
  gui.add(params, 'points', 150, 1200, 10).name('sample points').onFinishChange(regenerate);
  gui.add(params, 'rooms', 2, 12, 1).onFinishChange(regenerate);
  gui.add(params, 'roomRadius', 1, 4, 1).name('room radius').onFinishChange(regenerate);
  gui.add(params, 'extraCorridors', 0, 5, 1).name('extra corridors').onFinishChange(regenerate);
  gui.add(params, 'wallHeight', 0.02, 0.15, 0.005).name('wall height').onFinishChange(regenerate);
  gui.add(params, 'relaxIters', 0, 200, 10).name('relax iters').onFinishChange(regenerate);
  gui.add(params, 'randomize').name('🎲 random seed');
  gui.add(params, 'regenerate').name('↻ regenerate');

  // --- render loop: PoV + minimap inset ------------------------------------
  const mapBg = new THREE.Color(0x080a10);
  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!active || !mesh) return;
    t += 0.016;

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
    renderer.render(scene, camera);

    // inset: the sphere as a minimap, player-centred, heading up
    const m = Math.min(260, Math.floor(Math.min(w, h) * 0.34));
    const n = graph.normals[player.cur];
    const hd = player.heading;
    mapCamera.position.set(n[0] * 2.75, n[1] * 2.75, n[2] * 2.75);
    mapCamera.up.set(hd[0], hd[1], hd[2]);
    mapCamera.lookAt(0, 0, 0);
    mapCamera.aspect = 1;
    mapCamera.updateProjectionMatrix();
    renderer.setViewport(14, 14, m, m);
    renderer.setScissor(14, 14, m, m);
    scene.background = mapBg;
    markerMesh.visible = true;
    renderer.clearDepth();
    renderer.render(scene, mapCamera);

    renderer.setScissorTest(false);
  }

  regenerate();

  // debug/demo: ?walk=N auto-walks N hops along the shortest route to the
  // heart (also handy for screenshotting from inside a corridor)
  const walkN = parseInt(new URLSearchParams(location.search).get('walk') || '0', 10);
  for (let i = 0; i < walkN && !player.won; i++) {
    const d = dungeon.distToHeart;
    const next = openNeighbors(player.cur).find((nb) => d[nb] === d[player.cur] - 1);
    if (next === undefined) break;
    commitMove(next);
  }
  if (walkN > 0) snapCamera();

  resize();
  animate();

  return {
    setActive(on) {
      active = on;
      if (on) { resize(); snapCamera(); }
    },
  };
}
