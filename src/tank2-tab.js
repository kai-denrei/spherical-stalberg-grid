// tank2-tab.js — planet Combat: render shell + input around tanks2.js.
// A tiny olive planet in black space; the game core never learns which
// camera is watching it.
import * as THREE from '../vendor/three.module.js';
import GUI from '../vendor/lil-gui.esm.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { createPlanetTankGame, DYING_T } from './tanks2.js?v=51e02fe7';
import { mulberry32 } from './rng.js?v=51e02fe7';
import { norm3, scale3 } from './vec3.js?v=51e02fe7';

const DT = 1 / 60;
const TANK_SCALE = 0.08;
const COLORS = {
  space: 0x05070d, ground: 0x9cb04c, block: 0xd89048,
  red: 0xd23b2f, blue: 0x3556d2, shell: 0xf5f0dc,
};

export function initTank2Tab(root) {
  let active = true;
  const params = {
    seed: 42, points: 400, wallClusters: 5, pointsToWin: 7,
    ricochet: false, aiLevel: 1, view: 'orbit',
  };

  const container = root.querySelector('#tank2-app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.space);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(3, 4, 2);
  scene.add(sun);

  const cam = new THREE.PerspectiveCamera(55, 1, 0.005, 50);
  cam.position.set(0, 0, 3);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
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
  function buildTank(color) {
    const mat = new THREE.MeshLambertMaterial({ color });
    const g = new THREE.Group();
    const add = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
    };
    add(1.0, 0.35, 0.7, 0, 0.28, 0);
    add(1.1, 0.25, 0.22, 0, 0.13, 0.42);
    add(1.1, 0.25, 0.22, 0, 0.13, -0.42);
    add(0.5, 0.28, 0.45, -0.05, 0.6, 0);
    add(0.7, 0.1, 0.1, 0.55, 0.62, 0);
    g.scale.setScalar(TANK_SCALE);
    return g;
  }
  const tankMeshes = [buildTank(COLORS.red), buildTank(COLORS.blue)];
  const shellMat = new THREE.MeshLambertMaterial({ color: COLORS.shell });
  const shellMeshes = [0, 1].map(() =>
    new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), shellMat));
  scene.add(...tankMeshes, ...shellMeshes);
  // chase anchors ride INSIDE the tank group: camera derives from world
  // transforms, never from heading math (hard rule).
  const chaseEye = new THREE.Object3D();
  chaseEye.position.set(-3.4, 2.4, 0);
  const chaseTarget = new THREE.Object3D();
  chaseTarget.position.set(2.6, 0.6, 0);
  tankMeshes[0].add(chaseEye, chaseTarget);
  const povEye = new THREE.Object3D();
  povEye.position.set(0.2, 1.15, 0);
  const povTarget = new THREE.Object3D();
  povTarget.position.set(6, 0.7, 0);
  tankMeshes[0].add(povEye, povTarget);
  const VIEWS = ['chase', 'pov', 'orbit'];

  let game = null;
  let planetGroup = null;

  function buildPlanet() {
    if (planetGroup) {
      scene.remove(planetGroup);
      planetGroup.traverse((o) => o.geometry && o.geometry.dispose());
    }
    planetGroup = new THREE.Group();
    const { mesh, walls } = game.planet;
    const { vertices, quads } = mesh;
    const shade = mulberry32(mesh.seed ^ 0x51ab);
    const groundC = new THREE.Color(COLORS.ground);
    const tmp = new THREE.Color();
    const pos = [], col = [];
    for (let qi = 0; qi < quads.length; qi++) {
      if (walls.has(qi)) continue;
      tmp.copy(groundC).offsetHSL(0, 0, (shade() - 0.5) * 0.07);
      const q = quads[qi];
      for (const vi of [q[0], q[1], q[2], q[0], q[2], q[3]]) {
        pos.push(...vertices[vi]);
        col.push(tmp.r, tmp.g, tmp.b);
      }
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    gg.computeVertexNormals();
    planetGroup.add(new THREE.Mesh(gg,
      new THREE.MeshLambertMaterial({ vertexColors: true })));
    // wall prisms: top quad lifted radially + four sides
    const wpos = [];
    const H = 1.055;
    for (const qi of walls) {
      const q = quads[qi].map((vi) => vertices[vi]);
      const t = q.map((v) => scale3(norm3(v), H));
      for (const p of [t[0], t[1], t[2], t[0], t[2], t[3]]) wpos.push(...p);
      for (let e = 0; e < 4; e++) {
        const a = q[e], b = q[(e + 1) % 4];
        const ta = t[e], tb = t[(e + 1) % 4];
        for (const p of [a, b, tb, a, tb, ta]) wpos.push(...p);
      }
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
    wg.computeVertexNormals();
    planetGroup.add(new THREE.Mesh(wg,
      new THREE.MeshLambertMaterial({ color: COLORS.block })));
    scene.add(planetGroup);
  }

  // blocky explosion; debris falls along the LOCAL down (toward planet
  // center). Own rng stream seeded from sim time: visual-only randomness.
  const debris = [];
  function explodeAt(p, color) {
    const rng = mulberry32((game.time * 1000) >>> 0);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshLambertMaterial({ color });
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.016), mat);
      m.position.set(...scale3(p, 1.03));
      const dir = norm3([rng() - 0.5, rng() - 0.5, rng() - 0.5]);
      m.userData.vel = scale3(dir, 0.12 + rng() * 0.25);
      m.userData.up = p.slice();
      m.userData.ttl = 0.7;
      debris.push(m);
      scene.add(m);
    }
  }
  function tickDebris(dt) {
    for (let i = debris.length - 1; i >= 0; i--) {
      const m = debris[i], v = m.userData.vel, up = m.userData.up;
      m.userData.ttl -= dt;
      for (let k = 0; k < 3; k++) v[k] -= up[k] * 0.9 * dt; // local gravity
      m.position.x += v[0] * dt; m.position.y += v[1] * dt; m.position.z += v[2] * dt;
      m.rotation.x += 5 * dt; m.rotation.z += 4 * dt;
      if (m.userData.ttl <= 0 || m.position.length() < 0.995) {
        scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
        debris.splice(i, 1);
      }
    }
  }

  const scoreEl = root.querySelector('#tank2-score');
  const msgEl = root.querySelector('#tank2-msg');

  function updateScore() {
    scoreEl.innerHTML = `<span class="ts-red">${game.score[0]}</span>`
      + `<span class="ts-blue">${game.score[1]}</span>`;
  }

  function newMatch() {
    game = createPlanetTankGame({
      seed: params.seed >>> 0, points: params.points,
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
        const victim = game.tanks[1 - e.by];
        explodeAt(victim.pos, e.by === 0 ? COLORS.blue : COLORS.red);
      }
      if (e.type === 'matchEnd') {
        if (e.winner === 0 && params.aiLevel === unlocked && unlocked < 4) {
          unlocked++;
          localStorage.setItem('tank2.unlocked', String(unlocked));
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
  const upPad = root.querySelector('#tank2-pad-up');
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
    const el = root.querySelector(`#tank2-pad-${id}`);
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
  const _fwd = new THREE.Vector3(), _tgt = new THREE.Vector3(), _axis = new THREE.Vector3();
  let camLead = null; // orbit auto-lead tween: {fromDir, qDelta, dur, t} or null

  function orientTank(group, t) {
    _x.set(...t.head);          // barrel +x = heading
    _y.set(...t.pos);           // up = surface normal
    _z.crossVectors(_x, _y);    // right-handed basis
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
      if (s) shellMeshes[i].position.set(...scale3(s.pos, 1.015));
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
    renderer.render(scene, cam);
  }

  // --- panel ---------------------------------------------------------------
  const gui = new GUI({ title: 'planet combat', container: root });
  gui.add(params, 'seed', 0, 99999, 1).onFinishChange(newMatch);
  gui.add(params, 'points', 250, 700, 50).name('planet cells').onFinishChange(newMatch);
  gui.add(params, 'wallClusters', 0, 10, 1).name('wall clusters').onFinishChange(newMatch);
  gui.add(params, 'pointsToWin', 1, 15, 1).name('first to').onFinishChange(newMatch);
  gui.add(params, 'ricochet').onChange(newMatch);
  gui.add({ rematch: () => newMatch() }, 'rematch').name('↻ new match');
  if (matchMedia('(pointer: coarse), (max-width: 700px)').matches) gui.close();

  const readUnlocked = () => Math.min(4, Math.max(1,
    parseInt(localStorage.getItem('tank2.unlocked') || '1', 10) || 1));
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
    console.log('TANK2 ' + JSON.stringify({
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
