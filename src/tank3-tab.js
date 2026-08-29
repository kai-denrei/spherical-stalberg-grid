// tank3-tab.js — planet Combat in the Battle/Tron skin: Tank2's tanks2.js
// rules rendered with buildUnit mesh tanks, makeBulletCloud shells,
// makeDebris deaths, and the LOOKS.tronColors neon world.
import * as THREE from '../vendor/three.module.js';
import GUI from '../vendor/lil-gui.esm.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { createPlanetTankGame, DYING_T } from './tanks2.js?v=8483ae5f';
import { buildUnit, onMkcxReady, makeBulletCloud, makeDebris } from './units.js?v=8483ae5f';
import { LOOKS } from './looks.js?v=8483ae5f';
import { mulberry32 } from './rng.js?v=8483ae5f';
import { norm3, scale3 } from './vec3.js?v=8483ae5f';
import { makeBloom } from './postfx.js?v=8483ae5f';

const DT = 1 / 60;
const TANK_SCALE = 0.09;    // world radius of each tank
const WALL_H = 1.05;        // wall extrusion (× sphere radius)
const LOOK = LOOKS.tronColors;
// planet size = cell count: more cells = a bigger world to fight across
const PLANET_SIZES = { small: 400, medium: 900, large: 1500 };

export function initTank3Tab(root) {
  let active = true;
  const params = {
    seed: 42, planetSize: 'small', wallClusters: 5, pointsToWin: 7,
    ricochet: false, aiLevel: 1, view: 'orbit',
  };

  const container = root.querySelector('#tank3-app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(LOOK.bg);
  scene.add(new THREE.HemisphereLight(LOOK.hemi[0], LOOK.hemi[1], LOOK.hemi[2]));
  const sun = new THREE.DirectionalLight(LOOK.sun[0], LOOK.sun[1]);
  sun.position.set(3, 4, 2);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(LOOK.fill[0], LOOK.fill[1]);
  fill.position.set(-3, -2, -4);
  scene.add(fill);

  const cam = new THREE.PerspectiveCamera(55, 1, 0.005, 50);
  cam.position.set(0, 0, 3);

  const postfx = makeBloom(renderer, scene, cam, {});

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    postfx.setSize(w, h);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const orbit = new OrbitControls(cam, renderer.domElement);
  orbit.enableDamping = true;
  orbit.minDistance = 1.4;
  orbit.maxDistance = 8;
  orbit.enabled = false;

  // --- meshes --------------------------------------------------------------
  // battle mesh tank; barrel is local +Z. Disable the sweep tick (manual
  // aim). Scale so the normalized-to-unit group renders at TANK_SCALE.
  function makeTankMesh(cols) {
    const g = buildUnit('mkcx', cols); // authored hover tank, procedural fallback
    g.userData.tick = null;                                  // no turret sweep
    g.scale.setScalar((g.userData.baseScale ?? 1) * TANK_SCALE);
    return g;
  }
  const TANK_COLS = [
    { walker: LOOK.walker, walkerHi: LOOK.walkerHi }, // player = cyan
    { walker: LOOK.enemy, walkerHi: LOOK.enemyHi },   // AI = magenta
  ];
  const tankMeshes = TANK_COLS.map(makeTankMesh);
  // the mkcx model loads async: rebuild both hulls in place when it lands,
  // keeping each tank's parent, transform and visibility exactly as they are
  onMkcxReady(() => {
    tankMeshes.forEach((old, i) => {
      const next = makeTankMesh(TANK_COLS[i]);
      next.position.copy(old.position);
      next.quaternion.copy(old.quaternion);
      next.visible = old.visible;
      if (old.parent) { old.parent.add(next); old.parent.remove(old); }
      tankMeshes[i] = next;
    });
  });
  const shellMeshes = [0, 1].map((i) => {
    const m = makeBulletCloud({ body: i === 0 ? LOOK.walkerHi : LOOK.enemyHi, hi: 0xffffff });
    m.scale.setScalar(0.02);
    m.visible = false;
    scene.add(m);
    return m;
  });
  scene.add(...tankMeshes);
  // chase/POV anchors ride INSIDE the player tank group (barrel = +Z, so
  // "behind" is -Z, "ahead" is +Z). Camera derives from their world
  // transforms — never from heading math (hard rule).
  const chaseEye = new THREE.Object3D();
  chaseEye.position.set(0, 2.4, -3.4);
  const chaseTarget = new THREE.Object3D();
  chaseTarget.position.set(0, 0.6, 2.6);
  tankMeshes[0].add(chaseEye, chaseTarget);
  const povEye = new THREE.Object3D();
  povEye.position.set(0, 1.15, 0.2);
  const povTarget = new THREE.Object3D();
  povTarget.position.set(0, 0.7, 6);
  tankMeshes[0].add(povEye, povTarget);
  const VIEWS = ['chase', 'pov', 'orbit'];

  let game = null;
  let planetGroup = null;

  const rgbOf = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

  // Battle/Tron world on the tank2 planet: dark zone-tinted floors, additive
  // neon-cyan edge wires, black-topped neon walls. Zone field = seeded
  // accent centres with gaussian angular falloff, blended per cell (ported
  // from battle-tab's buildGeometry, minus the dungeon tags).
  function buildPlanet() {
    if (planetGroup) {
      scene.remove(planetGroup);
      planetGroup.traverse((o) => o.geometry && o.geometry.dispose());
    }
    planetGroup = new THREE.Group();
    const { mesh, walls, centers } = game.planet;
    const { vertices, quads } = mesh;
    const zs = LOOK.zones;

    // bake the zonal color field
    const zrng = mulberry32((params.seed ^ 0x7c0104) >>> 0);
    const accents = [];
    for (const [hex, count, sigma] of zs.accents) {
      for (let k = 0; k < count; k++) {
        const zz = 2 * zrng() - 1, th = 2 * Math.PI * zrng(), rr = Math.sqrt(Math.max(0, 1 - zz * zz));
        accents.push({ d: [rr * Math.cos(th), zz, rr * Math.sin(th)], c: rgbOf(hex), s: sigma });
      }
    }
    const bc = rgbOf(zs.base);
    const zone = new Float32Array(quads.length * 3);
    for (let ci = 0; ci < quads.length; ci++) {
      const u = centers[ci];
      let r = bc[0] * zs.baseWeight, g = bc[1] * zs.baseWeight, b = bc[2] * zs.baseWeight, W = zs.baseWeight;
      for (const cn of accents) {
        const dv = Math.max(-1, Math.min(1, u[0] * cn.d[0] + u[1] * cn.d[1] + u[2] * cn.d[2]));
        const w = Math.exp(-((Math.acos(dv) / cn.s) ** 2));
        r += cn.c[0] * w; g += cn.c[1] * w; b += cn.c[2] * w; W += w;
      }
      zone[ci * 3] = r / W; zone[ci * 3 + 1] = g / W; zone[ci * 3 + 2] = b / W;
    }
    const tint = (ci) => [zone[ci * 3], zone[ci * 3 + 1], zone[ci * 3 + 2]];

    const fPos = [], fCol = [], ePos = [], eCol = [], wPos = [], wCol = [], tPos = [], tCol = [];
    const pushEdge = (p, q2, ci) => { ePos.push(p[0], p[1], p[2], q2[0], q2[1], q2[2]); const c = tint(ci); eCol.push(c[0], c[1], c[2], c[0], c[1], c[2]); };
    const pushTop = (p, q2, ci) => { tPos.push(p[0], p[1], p[2], q2[0], q2[1], q2[2]); const c = tint(ci); tCol.push(c[0], c[1], c[2], c[0], c[1], c[2]); };
    const pushQuad = (p0, p1, p2, p3, c) => { for (const p of [p0, p1, p2, p0, p2, p3]) wPos.push(p[0], p[1], p[2]); for (let i = 0; i < 6; i++) wCol.push(c[0], c[1], c[2]); };

    // floors (open cells) at the surface
    const lv = zs.floorLevels.path;
    for (let ci = 0; ci < quads.length; ci++) {
      if (walls.has(ci)) continue;
      const q = quads[ci];
      const r = zone[ci * 3] * lv, g = zone[ci * 3 + 1] * lv, b = zone[ci * 3 + 2] * lv;
      for (const vi of [q[0], q[1], q[2], q[0], q[2], q[3]]) { const p = vertices[vi]; fPos.push(p[0], p[1], p[2]); fCol.push(r, g, b); }
      for (let i = 0; i < 4; i++) pushEdge(vertices[q[i]], vertices[q[(i + 1) % 4]], ci);
    }

    // walls: extruded wall cells, DIM tops (faint slab = base wall-top × 0.45,
    // the tron 'dim' treatment), zone-tinted skirts facing open cells
    const dimTop = LOOK.walls.top.map((c) => c * 0.45);
    const edgeToCell = new Map();
    for (let ci = 0; ci < quads.length; ci++) { const q = quads[ci]; for (let i = 0; i < 4; i++) edgeToCell.set(`${q[i]}-${q[(i + 1) % 4]}`, ci); }
    for (const ci of walls) {
      const q = quads[ci];
      const top = q.map((vi) => scale3(norm3(vertices[vi]), WALL_H));
      pushQuad(top[0], top[1], top[2], top[3], dimTop); // dim wall top (faint slab)
      for (let i = 0; i < 4; i++) {
        const a = q[i], b = q[(i + 1) % 4];
        const nb = edgeToCell.get(`${b}-${a}`);
        const facesOpen = nb !== undefined && !walls.has(nb);
        if (facesOpen) {
          const sc = zs.wallSideLevel * 10;
          const sideCol = [zone[ci * 3] * sc, zone[ci * 3 + 1] * sc, zone[ci * 3 + 2] * sc];
          pushQuad(top[(i + 1) % 4], top[i], vertices[a], vertices[b], sideCol);
          pushEdge(top[i], vertices[a], ci);
          pushEdge(top[(i + 1) % 4], vertices[b], ci);
          pushEdge(top[i], top[(i + 1) % 4], ci);
        } else {
          pushTop(top[i], top[(i + 1) % 4], ci);
        }
      }
    }

    const faceMat = () => new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const addFaces = (pos, col) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      planetGroup.add(new THREE.Mesh(g, faceMat()));
    };
    addFaces(fPos, fCol);
    addFaces(wPos, wCol);
    const E = LOOK.edges;
    const addLines = (pos, col, op) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      planetGroup.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: op,
        blending: E.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: !E.additive,
      })));
    };
    addLines(ePos, eCol, E.opacity);
    addLines(tPos, tCol, E.opacity * 0.28); // dim wall-top wires
    scene.add(planetGroup);
  }

  // battle polygon-scatter death: bake the struck tank's triangles into a
  // debris mesh that flies apart and fades (units.makeDebris).
  const debris = [];
  function explodeAt(i) {
    const d = makeDebris(tankMeshes[i], game.tanks[i].pos);
    scene.add(d);
    debris.push(d);
  }
  function tickDebris(dt) {
    for (let k = debris.length - 1; k >= 0; k--) {
      if (!debris[k].userData.tick(dt)) {
        scene.remove(debris[k]);
        debris[k].geometry.dispose();
        if (debris[k].material.dispose) debris[k].material.dispose();
        debris.splice(k, 1);
      }
    }
  }

  const scoreEl = root.querySelector('#tank3-score');
  const msgEl = root.querySelector('#tank3-msg');

  function updateScore() {
    scoreEl.innerHTML = `<span class="ts-red">${game.score[0]}</span>`
      + `<span class="ts-blue">${game.score[1]}</span>`;
  }

  function newMatch() {
    game = createPlanetTankGame({
      seed: params.seed >>> 0, points: PLANET_SIZES[params.planetSize] || 400,
      wallClusters: params.wallClusters, pointsToWin: params.pointsToWin,
      ricochet: params.ricochet, aiLevel: params.aiLevel,
    });
    buildPlanet();
    msgEl.classList.add('hidden');
    updateScore();
    syncScene();
    tankMeshes[0].updateMatrixWorld();
    cam.position.copy(chaseEye.getWorldPosition(new THREE.Vector3())); // no first-frame lerp snap
    applyView();
  }

  function consumeEvents() {
    for (const e of game.events) {
      if (e.type === 'hit') {
        updateScore();
        explodeAt(1 - e.by);
      }
      if (e.type === 'matchEnd') {
        if (e.winner === 0 && params.aiLevel === unlocked && unlocked < 4) {
          unlocked++;
          localStorage.setItem('tank3.unlocked', String(unlocked));
          rebuildAiCtrl();
          msgEl.textContent = `RED WINS — LEVEL ${unlocked} UNLOCKED — click / ENTER`;
        } else {
          msgEl.textContent = e.winner === 0 ? 'RED WINS — click / ENTER for rematch'
            : 'BLUE WINS — click / ENTER for rematch';
        }
        msgEl.classList.remove('hidden');
      }
    }
  }

  // --- input ---------------------------------------------------------------
  const input = {};
  const KEYMAP = {
    ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
    ArrowUp: 'forward', w: 'forward', ArrowDown: 'reverse', s: 'reverse',
    ' ': 'fire',
  };
  // CRUISE: double-tap the forward control to latch auto-forward, freeing
  // the player to focus on steering + firing (a mobile ergonomics win).
  // Reverse or a second double-tap releases it. Double-tap zoom is already
  // suppressed globally by `* { touch-action: manipulation }` in styles.css,
  // and pointerdown preventDefault below is the belt to that suspenders.
  let cruise = false;
  let lastFwdTap = -9;
  const upPad = root.querySelector('#tank3-pad-up');
  const reflectCruise = () => { if (upPad) upPad.classList.toggle('pressed', cruise); };
  function noteFwdTap() {
    const s = performance.now() / 1000;
    if (s - lastFwdTap < 0.35) { cruise = !cruise; reflectCruise(); }
    lastFwdTap = s;
  }
  addEventListener('keydown', (e) => {
    if (!active) return;
    const k = KEYMAP[e.key];
    if (k) {
      if (k === 'forward' && !input.forward) noteFwdTap(); // leading edge; ignore key-repeat
      if (k === 'reverse' && cruise) { cruise = false; reflectCruise(); }
      input[k] = true;
      e.preventDefault();
    }
    if (e.key === 'Enter' && game.winner >= 0) newMatch();
    if (e.key === 'c' || e.key === 'C') {
      params.view = VIEWS[(VIEWS.indexOf(params.view) + 1) % VIEWS.length];
      applyView();
      gui.controllersRecursive().forEach((c2) => c2.updateDisplay());
    }
  });
  addEventListener('keyup', (e) => {
    const k = KEYMAP[e.key];
    if (k) input[k] = false;
  });
  msgEl.addEventListener('click', () => { if (game.winner >= 0) newMatch(); });
  for (const [id, k] of [['left', 'left'], ['right', 'right'], ['up', 'forward'], ['fire', 'fire']]) {
    const el = root.querySelector(`#tank3-pad-${id}`);
    el.addEventListener('pointerdown', (e) => {
      if (k === 'forward') noteFwdTap();
      input[k] = true; el.classList.add('pressed'); e.preventDefault();
    });
    for (const ev of ['pointerup', 'pointercancel']) {
      el.addEventListener(ev, () => { input[k] = false; if (!(k === 'forward' && cruise)) el.classList.remove('pressed'); });
    }
  }

  // --- sync + camera -------------------------------------------------------
  const _m = new THREE.Matrix4();
  const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();
  const _UP = new THREE.Vector3(0, 1, 0);
  const _fwd = new THREE.Vector3(), _tgt = new THREE.Vector3(), _axis = new THREE.Vector3();
  let camLead = null; // orbit auto-lead tween: {fromDir, qDelta, dur, t} or null

  function orientTank(group, t) {
    _z.set(...t.head);          // barrel +z = heading
    _y.set(...t.pos);           // up = surface normal (+y)
    _x.crossVectors(_y, _z);    // right = up × forward (right-handed)
    _m.makeBasis(_x, _y, _z);
    group.quaternion.setFromRotationMatrix(_m);
    group.position.set(...t.pos);
  }

  function syncScene() {
    for (let i = 0; i < 2; i++) {
      const t = game.tanks[i];
      orientTank(tankMeshes[i], t);
      tankMeshes[i].visible = !(t.invulnT > 0 && Math.floor(game.time * 10) % 2 === 0);
      if (t.state === 'dying') tankMeshes[i].rotateY((DYING_T - t.dyingT) * 0.6);
      const s = game.shells[i];
      shellMeshes[i].visible = !!s;
      if (s) {
        shellMeshes[i].position.set(...scale3(s.pos, 1.02));
        _v1.set(s.dir[0], s.dir[1], s.dir[2]).normalize();
        shellMeshes[i].quaternion.setFromUnitVectors(_UP, _v1);
        shellMeshes[i].rotateY(game.time * 40); // rifling spin about the flight axis
      }
    }
  }

  function updateCamera() {
    if (params.view === 'orbit') {
      // LEAD follow: hold steady while red drives across the visible face;
      // when it reaches the leading edge, commit ONE eased sweep that
      // overshoots AHEAD along red's heading, dropping it near the back of
      // the frame with most of the battleground in front — then hold again.
      // (One committed animation, not per-frame nudges — those stuttered.)
      const t0 = game.tanks[0];
      const dist = cam.position.length();
      const limb = Math.acos(Math.min(0.999, 1 / Math.max(1.001, dist)));
      if (camLead) {
        camLead.t = Math.min(1, camLead.t + DT / camLead.dur);
        const e = camLead.t * camLead.t * (3 - 2 * camLead.t); // smoothstep ease
        _q.identity().slerp(camLead.qDelta, e);
        cam.position.copy(camLead.fromDir).applyQuaternion(_q).multiplyScalar(dist);
        if (camLead.t >= 1) camLead = null;
      } else {
        _fwd.copy(cam.position).normalize();       // F: point the camera faces
        _tgt.set(t0.pos[0], t0.pos[1], t0.pos[2]); // P: red on the unit sphere
        if (_fwd.angleTo(_tgt) > limb * 0.72) {
          // tangent direction from red back toward F, vs its heading: only
          // lead when red is driving AWAY from F (toward the leading edge),
          // so a big overshoot doesn't instantly re-fire from the far side.
          const dotFP = _fwd.dot(_tgt);
          _axis.copy(_fwd).addScaledVector(_tgt, -dotFP).normalize(); // P->F tangent
          _v1.set(t0.head[0], t0.head[1], t0.head[2]);                // heading
          if (_v1.dot(_axis) < 0) {
            _v2.copy(_tgt).cross(_v1).normalize();                    // great-circle axis
            _axis.copy(_tgt).applyAxisAngle(_v2, limb * 0.9).normalize(); // lead point
            camLead = {
              fromDir: _fwd.clone(),
              qDelta: new THREE.Quaternion().setFromUnitVectors(_fwd.clone(), _axis.clone()),
              dur: 0.7, t: 0,
            };
          }
        }
      }
      orbit.update();
      return;
    }
    const tm = tankMeshes[0];
    tm.updateMatrixWorld();
    const eye = params.view === 'pov' ? povEye : chaseEye;
    const tgt = params.view === 'pov' ? povTarget : chaseTarget;
    cam.position.lerp(eye.getWorldPosition(_v1), params.view === 'pov' ? 1 : 0.15);
    cam.up.copy(_v2.set(0, 1, 0).applyQuaternion(tm.getWorldQuaternion(_q)));
    cam.lookAt(tgt.getWorldPosition(_v2));
  }

  function applyView() {
    orbit.enabled = params.view === 'orbit';
    if (params.view === 'orbit') {
      cam.up.set(0, 1, 0);
      orbit.target.set(0, 0, 0); // orbit the PLANET centre, not the tank
      camLead = null;
      // start with red front-and-centre, a planet-scale distance out
      const tm = tankMeshes[0];
      tm.updateMatrixWorld();
      tm.getWorldPosition(_v1);
      cam.position.copy(_v1).setLength(2.8);
      orbit.update();
    }
  }

  let acc = 0;
  let last = performance.now();
  function animate() {
    requestAnimationFrame(animate);
    if (!active) return;
    const now = performance.now();
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    // cruise ORs into forward for the step, then restores the held state so
    // a later keyup can't leave forward stuck true once cruise disengages.
    const heldFwd = input.forward;
    input.forward = heldFwd || cruise;
    while (acc >= DT) {
      game.step(DT, input);
      consumeEvents();
      tickDebris(DT);
      acc -= DT;
    }
    input.forward = heldFwd;
    syncScene();
    updateCamera();
    postfx.render();
  }

  // --- panel ---------------------------------------------------------------
  const gui = new GUI({ title: 'planet combat', container: root });
  gui.add(params, 'seed', 0, 99999, 1).onFinishChange(newMatch);
  gui.add(params, 'planetSize', ['small', 'medium', 'large']).name('planet size').onChange(newMatch);
  gui.add(params, 'wallClusters', 0, 10, 1).name('wall clusters').onFinishChange(newMatch);
  gui.add(params, 'pointsToWin', 1, 15, 1).name('first to').onFinishChange(newMatch);
  gui.add(params, 'ricochet').onChange(newMatch);
  gui.add({ rematch: () => newMatch() }, 'rematch').name('↻ new match');
  if (matchMedia('(pointer: coarse), (max-width: 700px)').matches) gui.close();

  const readUnlocked = () => Math.min(4, Math.max(1,
    parseInt(localStorage.getItem('tank3.unlocked') || '1', 10) || 1));
  let unlocked = readUnlocked();
  let aiCtrl = null;
  function rebuildAiCtrl() {
    if (aiCtrl) aiCtrl.destroy();
    const levels = {};
    ['L1 drunk', 'L2 hunter', 'L3 marksman', 'L4 ghost gunner']
      .slice(0, unlocked).forEach((n, i) => { levels[n] = i + 1; });
    aiCtrl = gui.add(params, 'aiLevel', levels).name('AI level').onChange(newMatch);
  }
  rebuildAiCtrl();
  gui.add(params, 'view', VIEWS).name('camera (C)').listen().onChange(applyView);
  const bloomF = gui.addFolder('bloom');
  bloomF.add(postfx.params, 'enabled').name('enabled').onChange((v) => postfx.setEnabled(v));
  bloomF.add(postfx.params, 'strength', 0, 3, 0.05).onChange((v) => postfx.setParams({ strength: v }));
  bloomF.add(postfx.params, 'radius', 0, 1, 0.01).onChange((v) => postfx.setParams({ radius: v }));
  bloomF.add(postfx.params, 'threshold', 0, 1, 0.01).onChange((v) => postfx.setParams({ threshold: v }));

  // --- URL hooks -----------------------------------------------------------
  const urlParams = new URLSearchParams(location.search);
  const seedOv = parseInt(urlParams.get('seed') || '', 10);
  if (Number.isFinite(seedOv)) params.seed = seedOv;
  gui.controllersRecursive().forEach((c) => c.updateDisplay());

  const aiOv = parseInt(urlParams.get('ai') || '', 10);
  if (aiOv >= 1 && aiOv <= 4) { params.aiLevel = aiOv; unlocked = Math.max(unlocked, aiOv); rebuildAiCtrl(); }
  const viewOv = urlParams.get('view');
  if (VIEWS.includes(viewOv)) params.view = viewOv;
  applyView();

  newMatch();
  animate();

  const tickN = parseFloat(urlParams.get('tick') || '0');
  if (tickN > 0) {
    for (let i = 0; i < Math.round(tickN * 60); i++) { game.step(DT, {}); consumeEvents(); }
    syncScene();
    console.log('TANK3 ' + JSON.stringify({
      score: game.score, winner: game.winner,
      t: +game.time.toFixed(2), ai: params.aiLevel, view: params.view,
    }));
  }

  return {
    setActive(on) {
      active = on;
      if (on) { last = performance.now(); resize(); }
    },
  };
}
