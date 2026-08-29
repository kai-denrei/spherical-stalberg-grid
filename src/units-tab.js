// units-tab.js — a carousel for looking at one unit at a time, up close,
// and turning it over.
//
// This exists because judging a model inside the game does not work: the
// units are small, the board is busy, and the spawn portal's dot cloud sits
// exactly where the player starts. Every scale, tint and geometry problem in
// the imported models was found here, not in gameplay.
//
// ONE renderer, one unit on screen. A grid of live viewports would need a
// WebGL context each and browsers cap those in the teens; a carousel costs
// one context no matter how long the roster grows.
import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { buildUnit, preloadMkcx, makeDebris, makeDotBurst } from './units.js';
import { TANK_FEEL, makeTankFeel, stepTankFeel, landTankFeel, fireTankFeel, applyTankFeel, applyTankHealth } from './tankfeel.js';
import { buildTowerLook, TOWER_LOOK_NAMES, DEFAULT_TOWER_LOOK, preloadLook } from './towerlooks.js';
import { TOWER_BY_KEY } from './towers.js';
import { LOOKS } from './looks.js';
import { makeBloom } from './postfx.js';
import { makeAudio } from './audio.js?v=76e1f710';
import { GROUPS, GROUP_LABELS, GROUP_EMPTY, entriesIn } from './unitcatalog.js';

export function initUnitsTab(root) {
  let active = false;
  const container = root.querySelector('#units-app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.005, 200);
  // same light rig as the game, or a unit would not look here as it looks there
  scene.add(new THREE.HemisphereLight(0xc8cfe0, 0x555060, 1.5));
  const sun = new THREE.DirectionalLight(0xffe8c8, 1.1);
  sun.position.set(3, 5, 2); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8a96c8, 0.8);
  fill.position.set(-3, 1, -2); scene.add(fill);
  // gentler than the game's: this is an inspection view, and the roster's
  // white-tinted units blow out to a featureless blob at play strength
  const postfx = makeBloom(renderer, scene, camera, { strength: 0.5, threshold: 0.9 });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false; // the unit stays centred; orbit and zoom only

  const state = { group: 'friendly', index: 0, towerLook: DEFAULT_TOWER_LOOK, spin: true };
  // the test bench: the SAME feel driver the game runs, so what you tune here
  // is what ships. `running` is the engine's own notion of running.
  const feel = makeTankFeel();
  let running = false;
  let health = 1;
  const benchEl = root.querySelector('#units-bench');
  const engineBtn = root.querySelector('#units-engine');
  const destroyBtn = root.querySelector('#units-destroy');
  const healthEl = root.querySelector('#units-health');
  let wreckT = 0;   // >0 while the wreck is playing
  let current = null;
  let clock = 0;
  const wreckFx = [];   // debris/burst objects, ticked and reaped

  const nameEl = root.querySelector('#units-name');
  const noteEl = root.querySelector('#units-note');
  const countEl = root.querySelector('#units-count');
  const groupRow = root.querySelector('#units-groups');
  const lookSel = root.querySelector('#units-look');
  const soundRow = root.querySelector('#units-sounds');

  // The viewer plays units as well as showing them — the same panel serves
  // tuning and player lore. Its own mixer instance, so nothing here can
  // disturb the game tab's levels or its voice budget.
  const sfx = makeAudio({ seed: 1 });
  sfx.arm();
  let bed = null;          // the one looping sound a unit may have
  let bedBtn = null;

  function stopBed() {
    if (bed) bed.stop(0.15);
    bed = null;
    if (bedBtn) bedBtn.classList.remove('on');
    bedBtn = null;
  }

  function buildSoundRow(entry) {
    stopBed();
    soundRow.textContent = '';
    const list = entry && entry.sounds ? entry.sounds : [];
    soundRow.classList.toggle('hidden', list.length === 0);
    for (const snd of list) {
      const b = document.createElement('button');
      b.textContent = snd.label;
      b.addEventListener('click', () => {
        // the shot is a gesture, not just a sample: kick the turret too
        if (snd.key === 'tank_main') fireTankFeel(feel, TANK_FEEL);
        if (!snd.loop) { sfx.play(snd.key); return; }
        if (bedBtn === b) { stopBed(); return; }  // toggle off
        stopBed();
        // loop() returns null until the buffer decodes, so only latch a
        // real handle — the same trap that silenced the game's engine bed
        const h = sfx.loop(snd.key, { gain: 1 });
        if (h) { bed = h; bedBtn = b; b.classList.add('on'); }
      });
      soundRow.appendChild(b);
    }
  }

  for (const name of TOWER_LOOK_NAMES) {
    const o = document.createElement('option');
    o.value = name; o.textContent = name;
    lookSel.appendChild(o);
  }
  lookSel.value = state.towerLook;

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    postfx.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const cols = { walker: LOOKS.tronColors.walker, walkerHi: LOOKS.tronColors.walkerHi };

  function clear() {
    if (!current) return;
    scene.remove(current);
    current.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
      else if (m) m.dispose();
    });
    current = null;
  }

  // Frame whatever was built. Units differ in size by more than 10x, so the
  // camera distance is derived from the object's own bounds rather than
  // fixed — otherwise half the roster is a speck and the rest overflows.
  function frame(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    const size = new THREE.Vector3(); box.getSize(size);
    const centre = new THREE.Vector3(); box.getCenter(centre);
    const span = Math.max(size.x, size.y, size.z) || 1;
    const dist = span / (2 * Math.tan((camera.fov * Math.PI) / 360)) * 1.9;
    controls.target.copy(centre);
    camera.position.set(centre.x + dist * 0.55, centre.y + dist * 0.42, centre.z + dist * 0.72);
    camera.near = Math.max(0.001, dist * 0.02);
    camera.far = dist * 40;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function show() {
    clear();
    const list = entriesIn(state.group);
    if (!list.length) {
      nameEl.textContent = '—';
      noteEl.textContent = GROUP_EMPTY[state.group];
      countEl.textContent = '0 / 0';
      buildSoundRow(null);
      return;
    }
    state.index = ((state.index % list.length) + list.length) % list.length;
    const e = list[state.index];
    current = e.kind === 'tower'
      ? buildTowerLook(state.towerLook, TOWER_BY_KEY[e.id])
      : buildUnit(e.id, cols);
    // units carry their own normalization; undo it so everything arrives at
    // a comparable size and the framing maths does the rest
    current.scale.setScalar(1 / (current.userData.baseScale || 1));
    scene.add(current);
    // a full ammo rack reads better than an empty one when you are judging shape
    (current.userData.ammoDots || []).forEach((d) => d.material.color.setHex(0xffffff));
    frame(current);
    nameEl.textContent = e.label;
    noteEl.textContent = e.note || '';
    buildSoundRow(e);
    // the bench only means anything for a unit with a hover split
    const bench = !!(current && current.userData.hoverBody);
    benchEl.classList.toggle('hidden', !bench);
    if (!bench) setEngine(false);
    applyTankHealth(current, health);
    countEl.textContent = `${state.index + 1} / ${list.length}`;
    lookSel.parentElement.classList.toggle('hidden', e.kind !== 'tower');
  }

  function step(d) { state.index += d; show(); }

  function setGroup(g) {
    state.group = g;
    state.index = 0;
    for (const b of groupRow.children) b.classList.toggle('on', b.dataset.group === g);
    show();
  }

  for (const g of GROUPS) {
    const b = document.createElement('button');
    b.dataset.group = g;
    b.textContent = GROUP_LABELS[g];
    b.addEventListener('click', () => setGroup(g));
    groupRow.appendChild(b);
  }

  function setEngine(on) {
    if (on === running) return;
    running = on;
    engineBtn.classList.toggle('on', running);
    engineBtn.textContent = running ? 'engine on' : 'engine off';
    if (running) {
      sfx.play('tank_spool_up');
      if (!bed) {
        const h = sfx.loop('tank_thruster', { gain: 1 });
        if (h) { bed = h; }
      }
    } else {
      sfx.play('tank_spool_down');
      landTankFeel(feel);
      if (bed) { bed.stop(0.12); bed = null; }
    }
  }

  // the wreck, previewable as often as you like — this is a bench, not a run
  function previewWreck() {
    if (!current || wreckT > 0) return;
    setEngine(false);
    feel.hoverT = 0;
    landTankFeel(feel);
    sfx.play('tank_destroyed');
    const up = new THREE.Vector3(0, 1, 0);
    const fx = makeDebris(current, [up.x, up.y, up.z]);
    scene.add(fx); wreckFx.push(fx);
    const burst = makeDotBurst(0xffffff, [0, 1, 0], 54);
    const box = new THREE.Box3().setFromObject(current);
    const c = new THREE.Vector3(); box.getCenter(c);
    burst.scale.setScalar(Math.max(...box.getSize(new THREE.Vector3()).toArray()) * 0.45);
    burst.position.copy(c);
    scene.add(burst); wreckFx.push(burst);
    current.visible = false;
    wreckT = 1.25;
  }

  engineBtn.addEventListener('click', () => setEngine(!running));
  destroyBtn.addEventListener('click', previewWreck);
  healthEl.addEventListener('input', () => {
    health = parseFloat(healthEl.value);
    applyTankHealth(current, health);
  });

  root.querySelector('#units-prev').addEventListener('click', () => step(-1));
  root.querySelector('#units-next').addEventListener('click', () => step(1));
  root.querySelector('#units-spin').addEventListener('click', (ev) => {
    state.spin = !state.spin;
    ev.currentTarget.classList.toggle('on', state.spin);
  });
  lookSel.addEventListener('change', () => {
    state.towerLook = lookSel.value;
    preloadLook(state.towerLook).then(() => { if (active) show(); });
    show();
  });
  addEventListener('keydown', (ev) => {
    if (!active) return;
    if (ev.key === 'ArrowLeft') step(-1);
    else if (ev.key === 'ArrowRight') step(1);
  });
  addEventListener('resize', () => { if (active) resize(); });

  let last = performance.now();
  function animate() {
    requestAnimationFrame(animate);
    if (!active) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    clock += dt;
    // drive the unit's own idle animation, so a turret sweeps here as in game
    if (current && current.userData.tick) current.userData.tick(clock);
    if (current && state.spin) current.rotation.y += dt * 0.35;
    // the bench runs the shipping feel driver, not a copy of it
    stepTankFeel(feel, dt, running, TANK_FEEL);
    applyTankFeel(current, feel, TANK_FEEL);
    for (let i = wreckFx.length - 1; i >= 0; i--) {
      const alive = wreckFx[i].userData.tick && wreckFx[i].userData.tick(dt);
      if (alive === false) { scene.remove(wreckFx[i]); wreckFx.splice(i, 1); }
    }
    if (wreckT > 0) {
      wreckT -= dt;
      if (wreckT <= 0 && current) { current.visible = true; feel.hoverT = 0; landTankFeel(feel); }
    }
    controls.update();
    postfx.render();
  }

  resize();
  animate();

  // deep-link, so a specific unit can be linked to or screenshot headlessly:
  //   #units?group=hostile&unit=knot   ·   ?unitgroup=…&unit=… on the query
  const q = new URLSearchParams(location.search);
  const wantGroup = q.get('unitgroup');
  const wantUnit = q.get('unit');
  setGroup(GROUPS.includes(wantGroup) ? wantGroup : 'friendly');
  if (wantUnit) {
    for (const g of GROUPS) {
      const i = entriesIn(g).findIndex((e) => e.id === wantUnit);
      if (i !== -1) { setGroup(g); state.index = i; show(); break; }
    }
  }
  // async models arrive late; refresh once they land so the first look is real
  preloadMkcx().then(() => { if (active) show(); });

  return {
    setActive(on) {
      active = on;
      if (on) { resize(); show(); }
      else { stopBed(); setEngine(false); } // nothing runs on a tab you left
    },
  };
}
