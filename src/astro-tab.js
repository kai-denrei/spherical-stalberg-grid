// astro-tab.js — THE ASTRONAUT STUDY. A rigged, animated GLB on the lab
// stage: does its animation work for a rescue mission — astronauts in a
// structure, scientists carrying blueprints, the tank sent to get them
// out — and at what scale does a person read next to the MK-CX/2?
//
// The study asks three things of the file, and answers them on screen:
// what clips it carries (this one: a 1.03 s walk cycle, 25 joints, a
// Mixamo-style biped), whether the walk reads on the spot and moving,
// and how tall a person is beside the tank at the game's own ratio. The
// tank is cast the way the board casts it; nothing here is a copy.
import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import GUI from '../vendor/lil-gui.esm.js';
import { makeBloom } from './postfx.js';
import { bakeGalaxyCube } from './galaxybake.js';
import { SKY_PRESET } from './galaxyseed.js';
import { LOOKS } from './looks.js';
import { buildCreature, preloadMkcx } from './units.js';

export const ASTRO_URL = 'assets/models/astronaut.glb';
// the game's ratio: the tank is ~0.85 of a cell long and a cell is ~3.2 m
// in the tank cinematic, so a 1.8 m person is about two thirds of a tank
const TANK_LEN_M = 5.3, PERSON_M = 1.8;

export function initAstroTab(root) {
  let active = false;
  const q = new URLSearchParams(location.search);
  const container = root.querySelector('#astro-app');
  const hud = root.querySelector('#astro-hud');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.02, 200);
  const az = (parseFloat(q.get('az')) || 32) * Math.PI / 180, el = (parseFloat(q.get('el')) || 12) * Math.PI / 180;
  const dist = parseFloat(q.get('dist')) || 5.2;
  camera.position.set(Math.sin(az) * Math.cos(el) * dist, 0.9 + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.target.set(0, 0.9, 0);

  // the metal lab's light: the sky as environment, a key that casts, a fill, a rim
  const sky = bakeGalaxyCube(renderer, { ...SKY_PRESET, seed: 4414, face: 1024, galaxies: 2 });
  scene.background = sky.texture;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromCubemap(sky.texture).texture;
  scene.environmentIntensity = 0.5;
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.0);
  sun.position.set(6, 9, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -6; sun.shadow.camera.right = sun.shadow.camera.top = 6;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8ab4ff, 0.7); fill.position.set(-6, 4, 5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x9fdcff, 0.9); rim.position.set(2, 3, -7); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xc9d4e6, 0x141216, 0.3));
  const look = LOOKS.tronColors;
  // a floor with the board's wire on it, so a stride has a scale
  const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.GridHelper(14, 14, look.edges.color, look.edges.color);
  grid.material.transparent = true; grid.material.opacity = 0.22; grid.position.y = 0.002; scene.add(grid);
  const postfx = makeBloom(renderer, scene, camera, { scale: 1, strength: 0.25, radius: 0.5, threshold: 0.4 });

  const P = {
    clip: '', play: true, speed: 1.0, loop: true, walk: true, stride: 1.3,   // stride: metres per second of travel
    scale: 1.0, spin: false, tank: true, wire: true, scan: false,
  };
  for (const [k, v] of q.entries()) {
    if (!(k in P)) continue;
    if (typeof P[k] === 'number') { const n = parseFloat(v); if (Number.isFinite(n)) P[k] = n; }
    else if (typeof P[k] === 'boolean') P[k] = v !== '0';
    else P[k] = v;
  }

  // THE ASTRONAUT
  const stage = new THREE.Group(); scene.add(stage);
  let astro = null, mixer = null, clips = [], action = null, height = 1, walkT = 0, bones = 0;
  new GLTFLoader().load(ASTRO_URL, (gltf) => {
    astro = gltf.scene;
    clips = gltf.animations || [];
    astro.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(astro);
    const size = new THREE.Vector3(); box.getSize(size);
    // the file is in centimetres (170 tall): normalise to PERSON_M metres,
    // feet on the floor, and turn it to walk down +Z like the tank
    height = size.y;
    const k = PERSON_M / Math.max(height, 1e-6);
    astro.scale.setScalar(k);
    astro.position.set(-box.getCenter(new THREE.Vector3()).x * k, -box.min.y * k, -box.getCenter(new THREE.Vector3()).z * k);
    astro.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.isSkinnedMesh) o.frustumCulled = false; } if (o.isBone) bones++; });
    stage.add(astro);
    mixer = new THREE.AnimationMixer(astro);
    if (clips.length) { P.clip = clips[0].name; clipCtrl.options(clips.map((c) => c.name)); clipCtrl.setValue(P.clip); playClip(P.clip); }
    hudLine();
    console.log(`ASTRO loaded: ${clips.length} clip(s) ${clips.map((c) => `"${c.name}" ${c.duration.toFixed(2)}s`).join(', ')}; height ${height.toFixed(1)} units -> ${PERSON_M} m; ${bones} bones`);
  }, undefined, (e) => { hud.textContent = `astronaut: failed to load (${e && e.message})`; });

  function playClip(name) {
    if (!mixer) return;
    const clip = clips.find((c) => c.name === name);
    if (!clip) return;
    if (action) action.fadeOut(0.2);
    action = mixer.clipAction(clip);
    action.reset().setLoop(P.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity).fadeIn(0.2).play();
    action.clampWhenFinished = true;
  }

  // THE TANK, for scale: the board's own cast, at the game's ratio to a person
  let tank = null;
  preloadMkcx('mkcx2').then((ok) => {
    if (!ok) return;
    tank = buildCreature('mkcx2', { walker: look.walker, walkerHi: look.walkerHi });
    tank.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(tank);
    const size = new THREE.Vector3(); box.getSize(size);
    tank.scale.multiplyScalar(TANK_LEN_M / Math.max(size.x, size.y, size.z, 1e-6));
    tank.updateMatrixWorld(true);
    box.setFromObject(tank);
    tank.position.set(2.6 - box.getCenter(new THREE.Vector3()).x, -box.min.y, -1.2 - box.getCenter(new THREE.Vector3()).z);
    tank.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    tank.visible = P.tank;
    scene.add(tank);
  });

  function hudLine() {
    hud.textContent = astro
      ? `${clips.length} clip(s) · ${P.clip || '-'} · ${action ? (action.time % (action.getClip().duration || 1)).toFixed(2) : '0.00'} s · ${bones} bones · ${PERSON_M} m tall (file ${height.toFixed(0)}) · tank ${TANK_LEN_M} m`
      : 'loading astronaut.glb…';
  }

  const gui = new GUI({ title: 'ASTRONAUT', container: root });
  const clipCtrl = gui.add(P, 'clip', ['-']).name('clip').onChange((v) => playClip(v));
  gui.add(P, 'play').onChange((v) => { if (action) action.paused = !v; });
  gui.add(P, 'speed', 0, 3, 0.05).onChange((v) => { if (mixer) mixer.timeScale = v; });
  gui.add(P, 'loop').onChange(() => playClip(P.clip));
  gui.add(P, 'walk').name('walk along (root motion)');
  gui.add(P, 'stride', 0.2, 4, 0.05).name('metres / s');
  gui.add(P, 'scale', 0.3, 3, 0.05).name('person scale').onChange((v) => { stage.scale.setScalar(v); });
  gui.add(P, 'spin').name('turntable');
  gui.add(P, 'tank').name('tank for scale').onChange((v) => { if (tank) tank.visible = v; });
  gui.add(P, 'wire').name('floor wire').onChange((v) => { grid.visible = v; });
  gui.add(P, 'scan').name('bones (skeleton)').onChange((v) => {
    if (v && astro && !astro.userData.skel) { astro.userData.skel = new THREE.SkeletonHelper(astro); scene.add(astro.userData.skel); }
    if (astro && astro.userData.skel) astro.userData.skel.visible = v;
  });
  const gear = root.querySelector('#astro-gear');
  if (gear) gear.addEventListener('click', () => { root.classList.toggle('panel-hidden'); });

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    postfx.setSize(w, h);
  }
  addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let hudT = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!active) return;
    const dt = Math.min(0.05, clock.getDelta());
    if (mixer && P.play) mixer.update(dt);
    // root motion: the clip walks on the spot; the study moves the stage
    // down +Z at the stride and wraps on the floor, so the walk is judged
    // as a walk and not a treadmill
    if (astro && P.walk && P.play) {
      walkT += dt * P.stride * P.speed;
      stage.position.z = ((walkT + 3) % 6) - 3;
    } else stage.position.z = 0;
    if (P.spin) stage.rotation.y += dt * 0.4;
    controls.update();
    postfx.render();
    hudT += dt; if (hudT > 0.25) { hudT = 0; hudLine(); }
  }
  animate();

  return {
    setActive(on) { active = on; if (on) { resize(); clock.getDelta(); } },
  };
}
