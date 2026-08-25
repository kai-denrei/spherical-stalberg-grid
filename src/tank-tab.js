// tank-tab.js — Atari Combat homage: three.js shell + input around the
// pure game core in tanks.js. This file draws state and forwards keys;
// every rule lives (Node-tested) in the core.
import * as THREE from '../vendor/three.module.js';
import GUI from '../vendor/lil-gui.esm.js';
import { createTankGame, DYING_T } from './tanks.js?v=80b0d834';
import { mulberry32 } from './rng.js?v=80b0d834';

const DT = 1 / 60;
const COLORS = {
  ground: 0x9cb04c, surround: 0x6b7f2e, block: 0xd89048,
  red: 0xd23b2f, blue: 0x3556d2, shell: 0xf5f0dc,
};

export function initTankTab(root) {
  let active = true;
  const params = {
    seed: 42, arena: 'brackets', pointsToWin: 7, ricochet: false,
    aiLevel: 1, view: 'top',
  };

  const container = root.querySelector('#tank-app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.surround);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(10, 20, 6);
  scene.add(sun);

  // top-down ortho camera, sized to the arena in resize()
  const topCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  topCam.position.set(13, 40, 10);
  topCam.up.set(0, 0, -1);
  topCam.lookAt(13, 0, 10);

  // perspective camera + view state
  const perspCam = new THREE.PerspectiveCamera(60, 1, 0.05, 200);
  const VIEWS = ['top', 'third', 'pov'];
  // POV anchors ride INSIDE the player tank group so camera placement is
  // derived from render transforms (hard rule), never from heading math.
  const povEye = new THREE.Object3D();
  povEye.position.set(0.1, 0.95, 0);
  const povTarget = new THREE.Object3D();
  povTarget.position.set(6, 0.8, 0);
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    const aspect = w / h;
    const spanZ = Math.max(22, 28 / aspect) / 2; // fit 26×20 + margin
    topCam.left = -spanZ * aspect; topCam.right = spanZ * aspect;
    topCam.top = spanZ; topCam.bottom = -spanZ;
    topCam.updateProjectionMatrix();
    perspCam.aspect = w / h; perspCam.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  // --- meshes --------------------------------------------------------------
  const blockMat = new THREE.MeshLambertMaterial({ color: COLORS.block });
  const shellMat = new THREE.MeshLambertMaterial({ color: COLORS.shell });

  function buildTank(color) {
    // barrel along +x at heading 0; group.rotation.y = -heading maps
    // core (cos h, sin h) onto world (x, z).
    const mat = new THREE.MeshLambertMaterial({ color });
    const g = new THREE.Group();
    const add = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    add(1.0, 0.35, 0.7, 0, 0.28, 0);          // hull
    add(1.1, 0.25, 0.22, 0, 0.13, 0.42);      // tread
    add(1.1, 0.25, 0.22, 0, 0.13, -0.42);     // tread
    add(0.5, 0.28, 0.45, -0.05, 0.6, 0);      // turret
    add(0.7, 0.1, 0.1, 0.55, 0.62, 0);        // barrel
    return g;
  }

  let game = null;
  let arenaGroup = null;
  const tankMeshes = [buildTank(COLORS.red), buildTank(COLORS.blue)];
  const shellMeshes = [0, 1].map(() => new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), shellMat));
  scene.add(...tankMeshes, ...shellMeshes);
  // attach POV anchors to the player (red) tank group
  tankMeshes[0].add(povEye, povTarget);

  // blocky explosion: a handful of cubes scattering from the hit point.
  // Visual-only randomness — own stream, seeded from sim time, so game
  // logic stays deterministic and replays don't drift.
  const debris = [];
  function explodeAt(x, z, color) {
    const rng = mulberry32((game.time * 1000) >>> 0);
    const mat = new THREE.MeshLambertMaterial({ color });
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat);
      m.position.set(x, 0.4, z);
      const a = rng() * Math.PI * 2;
      m.userData.vel = [Math.cos(a) * (1 + rng() * 3), 2 + rng() * 3, Math.sin(a) * (1 + rng() * 3)];
      m.userData.ttl = 0.7;
      debris.push(m);
      scene.add(m);
    }
  }
  function tickDebris(dt) {
    for (let i = debris.length - 1; i >= 0; i--) {
      const m = debris[i], v = m.userData.vel;
      m.userData.ttl -= dt;
      v[1] -= 9 * dt;
      m.position.x += v[0] * dt; m.position.y += v[1] * dt; m.position.z += v[2] * dt;
      m.rotation.x += 5 * dt; m.rotation.z += 4 * dt;
      if (m.userData.ttl <= 0 || m.position.y < 0) {
        scene.remove(m);
        m.geometry.dispose();
        debris.splice(i, 1);
      }
    }
  }

  const scoreEl = root.querySelector('#tank-score');
  const msgEl = root.querySelector('#tank-msg');

  function newMatch() {
    if (arenaGroup) {
      scene.remove(arenaGroup);
      arenaGroup.traverse((o) => o.geometry && o.geometry.dispose());
    }
    game = createTankGame({
      seed: params.seed >>> 0, arena: params.arena,
      pointsToWin: params.pointsToWin, ricochet: params.ricochet,
      aiLevel: params.aiLevel,
    });
    arenaGroup = new THREE.Group();
    const { w, h, blocks } = game.arena;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshLambertMaterial({ color: COLORS.ground }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(w / 2, 0, h / 2);
    arenaGroup.add(ground);
    for (const b of blocks) {
      const bw = b.maxX - b.minX, bd = b.maxZ - b.minZ;
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, 1.2, bd), blockMat);
      m.position.set((b.minX + b.maxX) / 2, 0.6, (b.minZ + b.maxZ) / 2);
      arenaGroup.add(m);
    }
    // perimeter wall: four low slabs just outside the field
    for (const [ww, wd, x, z] of [
      [w + 1, 0.5, w / 2, -0.25], [w + 1, 0.5, w / 2, h + 0.25],
      [0.5, h + 1, -0.25, h / 2], [0.5, h + 1, w + 0.25, h / 2],
    ]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.9, wd), blockMat);
      m.position.set(x, 0.45, z);
      arenaGroup.add(m);
    }
    scene.add(arenaGroup);
    msgEl.classList.add('hidden');
    updateScore();
  }

  function updateScore() {
    scoreEl.innerHTML = `<span class="ts-red">${game.score[0]}</span>`
      + `<span class="ts-blue">${game.score[1]}</span>`;
  }

  function consumeEvents() {
    for (const e of game.events) {
      if (e.type === 'hit') {
        updateScore();
        const victim = game.tanks[1 - e.by];
        explodeAt(victim.x, victim.z, e.by === 0 ? COLORS.blue : COLORS.red);
      }
      if (e.type === 'matchEnd') {
        if (e.winner === 0 && params.aiLevel === unlocked && unlocked < 4) {
          unlocked++;
          localStorage.setItem('tank.unlocked', String(unlocked));
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
  const upPad = root.querySelector('#tank-pad-up');
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
      gui.controllersRecursive().forEach((c2) => c2.updateDisplay());
    }
  });
  addEventListener('keyup', (e) => {
    const k = KEYMAP[e.key];
    if (k) input[k] = false;
  });
  msgEl.addEventListener('click', () => { if (game.winner >= 0) newMatch(); });
  // touch pads
  for (const [id, k] of [['left', 'left'], ['right', 'right'], ['up', 'forward'], ['fire', 'fire']]) {
    const el = root.querySelector(`#tank-pad-${id}`);
    el.addEventListener('pointerdown', (e) => {
      if (k === 'forward') noteFwdTap();
      input[k] = true; el.classList.add('pressed'); e.preventDefault();
    });
    const release = () => { input[k] = false; if (!(k === 'forward' && cruise)) el.classList.remove('pressed'); };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  }

  // --- camera select -------------------------------------------------------
  function activeCamera() {
    if (params.view === 'top') return topCam;
    const tm = tankMeshes[0];
    if (params.view === 'pov') {
      perspCam.position.copy(povEye.getWorldPosition(_v1));
      perspCam.lookAt(povTarget.getWorldPosition(_v2));
    } else { // third person: behind and above, following the tank's facing
      tm.getWorldQuaternion(_q);
      const behind = _v1.set(-7, 4.5, 0).applyQuaternion(_q).add(tm.position);
      perspCam.position.lerp(behind, 0.12);
      perspCam.lookAt(_v2.copy(tm.position).setY(0.6));
    }
    return perspCam;
  }

  // --- sync + loop ---------------------------------------------------------
  function syncScene() {
    for (let i = 0; i < 2; i++) {
      const t = game.tanks[i];
      tankMeshes[i].position.set(t.x, 0, t.z);
      tankMeshes[i].rotation.y = -t.heading;
      // invuln flash + dying spin are render-side only
      tankMeshes[i].visible = !(t.invulnT > 0 && Math.floor(game.time * 10) % 2 === 0);
      if (t.state === 'dying') tankMeshes[i].rotation.y += (DYING_T - t.dyingT) * 0.6;
      const s = game.shells[i];
      shellMeshes[i].visible = !!s;
      if (s) shellMeshes[i].position.set(s.x, 0.62, s.z);
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
    renderer.render(scene, activeCamera());
  }

  // --- panel ---------------------------------------------------------------
  const gui = new GUI({ title: 'tank combat', container: root });
  gui.add(params, 'seed', 0, 99999, 1).onFinishChange(newMatch);
  gui.add(params, 'arena', ['open', 'brackets', 'maze', 'proc']).onChange(newMatch);
  gui.add(params, 'pointsToWin', 1, 15, 1).name('first to').onFinishChange(newMatch);
  gui.add(params, 'ricochet').onChange(newMatch);
  gui.add({ rematch: () => newMatch() }, 'rematch').name('↻ new match');
  if (matchMedia('(pointer: coarse), (max-width: 700px)').matches) gui.close();

  // unlock storage + AI/view controllers
  const readUnlocked = () => Math.min(4, Math.max(1,
    parseInt(localStorage.getItem('tank.unlocked') || '1', 10) || 1));
  let unlocked = readUnlocked();
  let aiCtrl = null;
  function rebuildAiCtrl() {
    if (aiCtrl) aiCtrl.destroy();
    const levels = {};
    ['L1 drunk', 'L2 hunter', 'L3 marksman', 'L4 bank-shot']
      .slice(0, unlocked).forEach((n, i) => { levels[n] = i + 1; });
    aiCtrl = gui.add(params, 'aiLevel', levels).name('AI level').onChange(newMatch);
  }
  rebuildAiCtrl();
  gui.add(params, 'view', VIEWS).name('camera (C)').listen();

  // --- URL hooks (headless verification) ----------------------------------
  const urlParams = new URLSearchParams(location.search);
  const seedOv = parseInt(urlParams.get('seed') || '', 10);
  if (Number.isFinite(seedOv)) params.seed = seedOv;
  const aiOv = parseInt(urlParams.get('ai') || '', 10);
  if (aiOv >= 1 && aiOv <= 4) { params.aiLevel = aiOv; unlocked = Math.max(unlocked, aiOv); rebuildAiCtrl(); }
  const viewOv = urlParams.get('view');
  if (VIEWS.includes(viewOv)) params.view = viewOv;
  gui.controllersRecursive().forEach((c) => c.updateDisplay());

  newMatch();
  animate();

  // ?tick=N synchronously simulates N seconds, then logs a state line
  const tickN = parseFloat(urlParams.get('tick') || '0');
  if (tickN > 0) {
    for (let i = 0; i < Math.round(tickN * 60); i++) { game.step(DT, {}); consumeEvents(); }
    syncScene();
    console.log('TANK ' + JSON.stringify({
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
