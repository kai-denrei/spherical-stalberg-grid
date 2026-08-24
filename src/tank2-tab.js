// tank2-tab.js — planet Combat: render shell + input around tanks2.js.
// A tiny olive planet in black space; the game core never learns which
// camera is watching it.
import * as THREE from '../vendor/three.module.js';
import GUI from '../vendor/lil-gui.esm.js';
import { createPlanetTankGame, DYING_T } from './tanks2.js?v=0a6d569f';
import { mulberry32 } from './rng.js?v=0a6d569f';
import { norm3, scale3 } from './vec3.js?v=0a6d569f';

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
    ricochet: false, aiLevel: 1, view: 'chase',
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
  }

  function consumeEvents() {
    for (const e of game.events) {
      if (e.type === 'hit') updateScore();
      if (e.type === 'matchEnd') {
        msgEl.textContent = e.winner === 0 ? 'RED WINS — click / ENTER for rematch'
          : 'BLUE WINS — click / ENTER for rematch';
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
  addEventListener('keydown', (e) => {
    if (!active) return;
    const k = KEYMAP[e.key];
    if (k) { input[k] = true; e.preventDefault(); }
    if (e.key === 'Enter' && game.winner >= 0) newMatch();
  });
  addEventListener('keyup', (e) => {
    const k = KEYMAP[e.key];
    if (k) input[k] = false;
  });
  msgEl.addEventListener('click', () => { if (game.winner >= 0) newMatch(); });
  for (const [id, k] of [['left', 'left'], ['right', 'right'], ['up', 'forward'], ['fire', 'fire']]) {
    const el = root.querySelector(`#tank2-pad-${id}`);
    el.addEventListener('pointerdown', (e) => { input[k] = true; el.classList.add('pressed'); e.preventDefault(); });
    for (const ev of ['pointerup', 'pointercancel']) {
      el.addEventListener(ev, () => { input[k] = false; el.classList.remove('pressed'); });
    }
  }

  // --- sync + camera -------------------------------------------------------
  const _m = new THREE.Matrix4();
  const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();

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
      const s = game.shells[i];
      shellMeshes[i].visible = !!s;
      if (s) shellMeshes[i].position.set(...scale3(s.pos, 1.015));
    }
  }

  function updateCamera() {
    const tm = tankMeshes[0];
    tm.updateMatrixWorld();
    cam.position.lerp(chaseEye.getWorldPosition(_v1), 0.15);
    cam.up.copy(_v2.set(0, 1, 0).applyQuaternion(tm.getWorldQuaternion(_q)));
    cam.lookAt(chaseTarget.getWorldPosition(_v2));
  }

  let acc = 0;
  let last = performance.now();
  function animate() {
    requestAnimationFrame(animate);
    if (!active) return;
    const now = performance.now();
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= DT) {
      game.step(DT, input);
      consumeEvents();
      acc -= DT;
    }
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

  // --- URL hooks -----------------------------------------------------------
  const urlParams = new URLSearchParams(location.search);
  const seedOv = parseInt(urlParams.get('seed') || '', 10);
  if (Number.isFinite(seedOv)) params.seed = seedOv;
  gui.controllersRecursive().forEach((c) => c.updateDisplay());

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
