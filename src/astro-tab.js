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
import { applyWeatheredMaterial } from './cine/materials.js';

export const ASTRO_URL = 'assets/models/astronaut.glb';
// BOTH SIZES ARE SLIDERS NOW (operator, 2026-09-05: "make the astronaut much
// smaller relative to the tank... put a size slider for the tank and
// astronaut"). The study's whole job is to settle a RATIO, and a ratio
// settled by editing a constant and reloading is a ratio nobody settles.
// These are the defaults it opens on; the HUD prints the ratio the sliders
// are currently making, so the answer can be read off the screen.
const TANK_LEN_M = 10.0, PERSON_M = 1.8;

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
  renderer.toneMappingExposure = 0.85;   // the cinematic's, not the flat cast's — see dressCast
  // (the slider overwrites this once P is read)
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.02, 200);
  const az = (parseFloat(q.get('az')) || 32) * Math.PI / 180, el = (parseFloat(q.get('el')) || 12) * Math.PI / 180;
  // THE FRAME FOLLOWS THE SLIDERS. A fixed 5.2 m was right for a 5.3 m tank
  // and puts the lens inside a 10 m one — and the tank's size is a knob now,
  // so the opening distance has to be derived from it or every new default
  // opens on the inside of the hull.
  const dist = parseFloat(q.get('dist')) || 0;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  function frame(len) {
    const d = dist || len * 1.55;
    camera.position.set(Math.sin(az) * Math.cos(el) * d, len * 0.22 + Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
    controls.target.set(0, len * 0.16, 0);
    controls.update();
  }

  // the metal lab's light: the sky as environment, a key that casts, a fill, a rim
  const sky = bakeGalaxyCube(renderer, { ...SKY_PRESET, seed: 4414, face: 1024, galaxies: 2 });
  scene.background = sky.texture;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromCubemap(sky.texture).texture;
  // the environment is a KNOB here for the same reason the exposure is: a
  // dressed hull and a suited figure are both PBR surfaces that show mostly
  // what they reflect, and at 0.5 the astronaut read as a black silhouette
  scene.environmentIntensity = 0.9;
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.2);
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
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  let grid = null;
  // one metre per square, whatever the scale — the wire IS the ruler this
  // study measures a stride against, so it must stay a known unit
  function layFloor(radius) {
    const r = Math.max(4, Math.ceil(radius));
    floor.scale.setScalar(r);
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
    grid = new THREE.GridHelper(r * 2, r * 2, look.edges.color, look.edges.color);
    grid.material.transparent = true; grid.material.opacity = 0.22;
    grid.position.y = 0.002; grid.visible = P.wire;
    scene.add(grid);
    // the key's shadow box has to cover the same ground or the walker
    // crosses out of its own shadow half way round
    sun.shadow.camera.left = sun.shadow.camera.bottom = -r;
    sun.shadow.camera.right = sun.shadow.camera.top = r;
    sun.shadow.camera.far = r * 4;
    sun.shadow.camera.updateProjectionMatrix();
  }
  const postfx = makeBloom(renderer, scene, camera, { scale: 1, strength: 0.25, radius: 0.5, threshold: 0.4 });

  const P = {
    clip: '', play: true, speed: 1.0, loop: true, stride: 1.3,   // stride: metres per second of travel
    path: 'perimeter',      // perimeter | straight | spot
    personH: PERSON_M,      // metres, tall
    tankLen: TANK_LEN_M,    // metres, longest dimension
    clear: 1.0,             // metres of daylight between the hull and the walk
    outline: 0.22,          // the cast's blueprint edges, as a rim (the cinematic's number)
    exposure: 0.95,         // ...and near the cinematic's exposure, which a textured hull needs
    env: 0.9,               // how much sky the metal and the suit reflect
    spin: false, tank: true, wire: true, scan: false,
  };
  for (const [k, v] of q.entries()) {
    if (!(k in P)) continue;
    if (typeof P[k] === 'number') { const n = parseFloat(v); if (Number.isFinite(n)) P[k] = n; }
    else if (typeof P[k] === 'boolean') P[k] = v !== '0';
    else P[k] = v;
  }

  renderer.toneMappingExposure = P.exposure;   // ...and the URL/knob wins
  scene.environmentIntensity = P.env;
  layFloor(P.tankLen * 0.8);
  frame(P.tankLen);

  // THE ASTRONAUT
  const stage = new THREE.Group(); scene.add(stage);
  let astro = null, mixer = null, clips = [], action = null, height = 1, walkT = 0, bones = 0;
  const astroBox = new THREE.Box3();      // the file's own box, before any scaling
  new GLTFLoader().load(ASTRO_URL, (gltf) => {
    astro = gltf.scene;
    clips = gltf.animations || [];
    astro.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(astro);
    const size = new THREE.Vector3(); box.getSize(size);
    // the file is in centimetres (170 tall): normalise to the slider's
    // metres, feet on the floor. The model already walks down +Z, like the
    // tank, so no rotation is applied here — the perimeter path sets the
    // heading and that is the only place a bearing is decided.
    height = size.y;
    astroBox.copy(box);
    sizeAstro(P.personH);
    astro.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.isSkinnedMesh) o.frustumCulled = false; } if (o.isBone) bones++; });
    stage.add(astro);
    mixer = new THREE.AnimationMixer(astro);
    if (clips.length) { P.clip = clips[0].name; clipCtrl.options(clips.map((c) => c.name)); clipCtrl.setValue(P.clip); playClip(P.clip); }
    hudLine();
    console.log(`ASTRO loaded: ${clips.length} clip(s) ${clips.map((c) => `"${c.name}" ${c.duration.toFixed(2)}s`).join(', ')}; height ${height.toFixed(1)} units -> ${P.personH} m; ${bones} bones`
      + ` | tank ${P.tankLen} m, ratio ${(P.personH / P.tankLen).toFixed(3)}`);
  }, undefined, (e) => { hud.textContent = `astronaut: failed to load (${e && e.message})`; });

  // Re-sizing has to be re-doable, not a one-shot at load: the slider moves
  // it. Both the scale and the recentre are derived from the ORIGINAL box
  // every time, so repeated calls do not compound.
  function sizeAstro(metres) {
    if (!astro) return;
    const k = metres / Math.max(height, 1e-6);
    astro.scale.setScalar(k);
    const c = astroBox.getCenter(new THREE.Vector3());
    astro.position.set(-c.x * k, -astroBox.min.y * k, -c.z * k);
  }

  function playClip(name) {
    if (!mixer) return;
    const clip = clips.find((c) => c.name === name);
    if (!clip) return;
    if (action) action.fadeOut(0.2);
    action = mixer.clipAction(clip);
    action.reset().setLoop(P.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity).fadeIn(0.2).play();
    action.clampWhenFinished = true;
  }

  // THE TANK, for scale — and it is the thing being walked around, so it
  // stands at the ORIGIN rather than parked off to one side. The cast is the
  // board's own; the DRESSING is the cinematic's (`applyWeatheredMaterial`
  // with neither colour nor emissive kept), because the operator asked for
  // "the model for the tank that has the texture" and the board's grey
  // ladder is the un-textured read. This stage has a sky, a key and a fill —
  // it can light its own metal, which is exactly the condition the dark
  // CINE_BASE was written for.
  let tank = null, tankR = 2.5;      // tankR: footprint radius, metres
  const tankBox = new THREE.Box3();  // ...before any scaling, like the astronaut's
  preloadMkcx('mkcx2').then((ok) => {
    if (!ok) return;
    tank = buildCreature('mkcx2', { walker: look.walker, walkerHi: look.walkerHi });
    tank.updateMatrixWorld(true);
    tankBox.setFromObject(tank);
    try {
      const n = applyWeatheredMaterial(tank, { seed: 4414, size: 1024, repeat: 2, normalScale: 0.9,
        envMap: scene.environment, envMapIntensity: 0.9 });
      console.log(`ASTRO tank dressed: ${n} material(s) weathered`);
    } catch (e) { console.warn('ASTRO: dress failed', e); }
    tank.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // ...AND THE CAST'S BLUEPRINT PASS COMES DOWN. A dressed hull still wears
    // the game's white line on every edge at 0.85 opacity — the read that
    // makes it legible at a cell's size on a black board, and the read that
    // walls it in white under a lens (the first still here: a paper cut-out
    // with a textured barrel, exactly the failure `cine/tankscene.js`
    // documents). The lines stay as a rim at `outline`, and the glow parts
    // take the cinematic's dim cyan instead of a white-hot emissive. This is
    // the same treatment the tank cinematic applies, for the same reason.
    dressCast();
    tank.visible = P.tank;
    scene.add(tank);
    sizeTank(P.tankLen);
  });

  function dressCast() {
    if (!tank) return;
    tank.traverse((o) => {
      // only the line sets the cast SHOWS; a hidden set (a callout, a bound)
      // stays hidden — the same rule the cinematic states
      if (o.isLineSegments && o.material && (o.visible || o.userData.astroLine)) {
        o.userData.astroLine = true;
        o.material.opacity = P.outline;
        o.material.transparent = true;
        o.visible = P.outline > 0;
      }
      if (o.isMesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!m) continue;
        if (/^M_Glow/.test(m.name || '') && m.emissive) {
          m.emissive.setHex(0x7df9ff); m.emissiveIntensity = 0.45; m.color.setHex(0x101418);
        } else if (m.type === 'MeshBasicMaterial' && m.color) m.color.setHex(0x3f8a9c);
      }
    });
  }

  // Same shape as sizeAstro: derived from the ORIGINAL box every time, so the
  // slider can be dragged back and forth without compounding. Standing the
  // hull on the floor at the origin also fixes the walk's centre, which is
  // what the perimeter path orbits.
  function sizeTank(metres) {
    if (!tank) return;
    const size = tankBox.getSize(new THREE.Vector3());
    const k = metres / Math.max(size.x, size.y, size.z, 1e-6);
    tank.scale.setScalar(k);
    tank.position.set(0, 0, 0);
    tank.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(tank);
    const c = b.getCenter(new THREE.Vector3());
    tank.position.set(-c.x, -b.min.y, -c.z);
    // the footprint the walk must clear — the half-diagonal of the plan view,
    // not the length, or a walker rounding the corners would clip the hull
    const sz = b.getSize(new THREE.Vector3());
    tankR = 0.5 * Math.hypot(sz.x, sz.z);
    layFloor(tankR + Math.max(0, P.clear) + Math.max(2, metres * 0.25));
    frame(metres);
  }

  function hudLine() {
    hud.textContent = astro
      ? `${clips.length} clip(s) · ${P.clip || '-'} · ${action ? (action.time % (action.getClip().duration || 1)).toFixed(2) : '0.00'} s · ${bones} bones`
        + ` · person ${P.personH.toFixed(2)} m · tank ${P.tankLen.toFixed(1)} m`
        + ` · RATIO ${(P.personH / Math.max(0.01, P.tankLen)).toFixed(3)}`
        + ` · ${P.path}${P.path === 'perimeter' ? ` r=${(tankR + P.clear).toFixed(2)} m (hull ${tankR.toFixed(2)} + ${P.clear.toFixed(2)})` : ''}`
      : 'loading astronaut.glb…';
  }

  const gui = new GUI({ title: 'ASTRONAUT', container: root });
  const clipCtrl = gui.add(P, 'clip', ['-']).name('clip').onChange((v) => playClip(v));
  gui.add(P, 'play').onChange((v) => { if (action) action.paused = !v; });
  gui.add(P, 'speed', 0, 3, 0.05).onChange((v) => { if (mixer) mixer.timeScale = v; });
  gui.add(P, 'loop').onChange(() => playClip(P.clip));
  gui.add(P, 'path', ['perimeter', 'straight', 'spot']).name('walk path');
  gui.add(P, 'stride', 0.2, 4, 0.05).name('metres / s');
  gui.add(P, 'personH', 0.4, 4, 0.05).name('person height (m)').onChange((v) => sizeAstro(v));
  gui.add(P, 'tankLen', 2, 20, 0.1).name('tank length (m)').onChange((v) => sizeTank(v));
  gui.add(P, 'clear', 0, 4, 0.05).name('clearance (m)').onChange(() => sizeTank(P.tankLen));
  gui.add(P, 'outline', 0, 1, 0.02).name('hull edge lines').onChange(() => dressCast());
  gui.add(P, 'exposure', 0.2, 2, 0.05).name('exposure').onChange((v) => { renderer.toneMappingExposure = v; });
  gui.add(P, 'env', 0, 3, 0.05).name('sky reflected').onChange((v) => { scene.environmentIntensity = v; });
  gui.add(P, 'spin').name('turntable');
  gui.add(P, 'tank').name('tank for scale').onChange((v) => { if (tank) tank.visible = v; });
  gui.add(P, 'wire').name('floor wire').onChange((v) => { if (grid) grid.visible = v; });
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
    // ROOT MOTION. The clip walks on the spot; the study carries the stage,
    // so the walk is judged as a walk and not as a treadmill.
    //
    // PERIMETER is the default (operator, 2026-09-05: "make the astronaut
    // walk around the perimeter of the tank, without touching it"): a circle
    // about the hull at its footprint radius plus a clearance, facing along
    // the tangent. The radius comes from the tank's own measured plan
    // diagonal, so it stays honest when either size slider moves — "without
    // touching it" has to hold at every ratio the sliders can make, not just
    // at the one it opens on.
    if (astro && P.play && P.path !== 'spot') {
      walkT += dt * P.stride * P.speed;
      if (P.path === 'perimeter') {
        const R = tankR + Math.max(0, P.clear);
        const a = walkT / Math.max(0.2, R);          // arc length -> angle
        stage.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
        // the model walks down +Z, so the heading is the tangent's own
        // bearing — derived from the path, never a second sign convention
        stage.rotation.y = Math.atan2(Math.cos(a), -Math.sin(a));
      } else {
        stage.position.set(0, 0, ((walkT + 3) % 6) - 3);
        stage.rotation.y = 0;
      }
    } else if (P.path === 'spot') {
      stage.position.set(0, 0, 0);
    }
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
