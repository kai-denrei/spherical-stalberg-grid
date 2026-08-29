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
import { buildUnit, preloadMkcx, makeDebris, makeDotBurst, makeBulletCloud } from './units.js?v=ecff1dca';
import { TANK_FEEL, TANK_FEEL_KNOBS, formatFeelCode, makeTankFeel, stepTankFeel,
  landTankFeel, fireTankFeel, applyTankFeel, applyTankHealth } from './tankfeel.js?v=ecff1dca';
import { FEEL, loadFeel, saveFeel, resetFeel } from './feelstore.js?v=ecff1dca';
import { buildTowerLook, TOWER_LOOK_NAMES, DEFAULT_TOWER_LOOK, preloadLook } from './towerlooks.js';
import { TOWER_BY_KEY } from './towers.js';
import { LOOKS } from './looks.js';
import { makeBloom } from './postfx.js';
import { makeAudio } from './audio.js?v=ecff1dca';
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

  const state = { group: 'friendly', index: 0, towerLook: DEFAULT_TOWER_LOOK, spin: true, sweep: true };
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
  let sweepBtn = null;
  let clock = 0;
  const wreckFx = [];   // debris/burst objects, ticked and reaped
  // A shot is three things — the kick, the shell, and the barrel going
  // red-hot — and the bench had only the kick. Judging "does firing feel
  // right" without the other two is judging a third of it.
  const HEAT_COOL = 3.0;                         // matches td-tab's cannon
  const sleeveCool = new THREE.Color(0x232833);
  const sleeveHot = new THREE.Color(0xff2a10);
  let heat = 0;
  const shells = [];

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
        if (snd.key === 'tank_main') fireShell();
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
    for (const sh of shells) scene.remove(sh);
    shells.length = 0;
    heat = 0;
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
    buildCallouts();   // labels belong to THIS unit's markers, not the last one's
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
    // Drive the unit's own idle animation, so a turret sweeps here as in game.
    // Switchable off: a sweeping turret cannot be judged against the hull
    // axis, and every "the beam looks tilted" report so far has been the
    // sweep rather than the model. Frozen, it returns to its rest pose.
    if (current && current.userData.tick && state.sweep) current.userData.tick(clock);
    if (current && state.spin) current.rotation.y += dt * 0.35;
    // barrel heat: the same cool->hot lerp the game runs, on the same sleeve
    if (heat > 0) heat = Math.max(0, heat - dt);
    const sleeve = current && current.userData.heatSleeve;
    if (sleeve) sleeve.material.color.lerpColors(sleeveCool, sleeveHot, heat / HEAT_COOL);
    for (let i = shells.length - 1; i >= 0; i--) {
      const sh = shells[i];
      sh.position.addScaledVector(sh.userData.vel, dt);
      sh.userData.life -= dt;
      if (sh.userData.life <= 0) { scene.remove(sh); shells.splice(i, 1); }
    }
    // the bench runs the shipping feel driver over the shipping VALUES —
    // FEEL is the same object the TD tab's folder writes to
    stepTankFeel(feel, dt, running, FEEL);
    applyTankFeel(current, feel, FEEL);
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
    drawCallouts();   // after render, so it tracks the frame just drawn
  }

  // Fire everything a shot does. The shell leaves the muzzle ANCHOR and flies
  // along the barrel's own world +Z — derived from the render transform, per
  // the house rule, so it stays right when the turret has swept.
  function fireShell() {
    fireTankFeel(feel, FEEL);
    if (!current) return;
    heat = HEAT_COOL;
    const muzzle = current.userData.muzzle;
    if (!muzzle) return;
    const shell = makeBulletCloud(cols);
    const span = new THREE.Box3().setFromObject(current).getSize(new THREE.Vector3());
    shell.scale.setScalar(Math.max(span.x, span.y, span.z) * 0.03);
    muzzle.getWorldPosition(shell.position);
    const q = new THREE.Quaternion();
    muzzle.getWorldQuaternion(q);
    shell.userData.vel = new THREE.Vector3(0, 0, 1).applyQuaternion(q)
      .multiplyScalar(Math.max(span.x, span.y, span.z) * 2.2);
    shell.userData.life = 1.1;
    scene.add(shell);
    shells.push(shell);
  }

  // --- blueprint callouts ---------------------------------------------------
  // Labels projected onto the model, naming parts by the model's OWN node
  // names. This exists because "the bit at the back that looks tilted" cost a
  // fortnight: the tilt was a 6 deg slew on Turret_Pivot, and neither of us
  // could name the piece we were each looking at.
  const callLayer = root.querySelector('#units-callouts');
  let callTags = [];
  let callOn = false;
  const callProj = new THREE.Vector3();

  function buildCallouts() {
    if (!callLayer) return;
    callLayer.textContent = '';
    callTags = [];
    const marks = (current && current.userData.callouts) || [];
    for (const m of marks) {
      const tag = document.createElement('div');
      tag.className = 'callout';
      const lead = document.createElement('s');   // the leader back to the part
      const name = document.createElement('b');
      name.textContent = m.userData.callout.label;
      const node = document.createElement('i');
      node.textContent = m.userData.callout.node;
      tag.append(lead, name, node);
      const dot = document.createElement('u');    // sits exactly on the part
      dot.className = 'cdot';
      callLayer.append(tag, dot);
      callTags.push({ m, tag, lead, dot });
    }
    callLayer.classList.toggle('hidden', !callOn || !callTags.length);
  }

  const ROW = 24;    // px of vertical room a label needs to stay readable
  const OUT = 34;    // px the label is pushed away from its part, horizontally
  const FOOT = 200;  // px of chrome at the bottom labels must not fall behind

  function drawCallouts() {
    if (!callOn || !callTags.length) return;
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;

    // 1. project every anchor, and measure the model's own screen extent as
    //    we go. Splitting on the CANVAS centre was wrong: the tank is rarely
    //    centred in frame, so nearly every part landed on one side and the
    //    labels piled into a single column far from their parts.
    const sides = { l: [], r: [] };
    let minX = Infinity, maxX = -Infinity, midX = 0, seen = 0;
    for (const t of callTags) {
      t.m.getWorldPosition(callProj).project(camera);
      // a point behind the camera projects to a MIRRORED point in front of it
      if (callProj.z > 1) { t.tag.style.opacity = '0'; t.dot.style.opacity = '0'; t.off = true; continue; }
      t.off = false;
      t.tag.style.opacity = '';
      t.dot.style.opacity = '';
      t.ax = (callProj.x * 0.5 + 0.5) * w;
      t.ay = (-callProj.y * 0.5 + 0.5) * h;
      minX = Math.min(minX, t.ax); maxX = Math.max(maxX, t.ax);
      midX += t.ax; seen++;
    }
    if (!seen) return;
    midX /= seen;
    for (const t of callTags) if (!t.off) sides[t.ax < midX ? 'l' : 'r'].push(t);

    // 2. the two columns sit OUTSIDE the model's silhouette, clamped into the
    //    frame. Labels over the tank hide the thing they are naming.
    const colX = {
      l: Math.max(90, minX - OUT),
      r: Math.min(w - 12, maxX + OUT),
    };

    // 3. declutter each column: sort by height, then walk down enforcing a
    //    minimum gap. Greedy and one-pass — with ~20 labels the cost of
    //    anything cleverer is not repaid, and the leader lines carry the
    //    association anyway once a label has been nudged off its part.
    for (const key of ['l', 'r']) {
      const col = sides[key];
      col.sort((a, b) => a.ay - b.ay);
      let y = -Infinity;
      for (const t of col) {
        t.ly = Math.max(t.ay, y + ROW);
        y = t.ly;
      }
      // The usable band stops above the control row: a label pushed behind
      // the buttons is a label you cannot read, which defeats the point.
      const over = y - (h - FOOT);
      if (over > 0) for (const t of col) t.ly = Math.max(ROW * 0.5, t.ly - over);
      for (const t of col) {
        t.lx = colX[key];
        t.tag.classList.toggle('left', key === 'l');
        // left-hand labels are pulled back by their OWN width, which only a
        // transform percentage knows — a percentage margin would resolve
        // against the layer instead and fling them off screen
        t.tag.style.transform = `translate(${t.lx}px, ${t.ly}px)`
          + (key === 'l' ? ' translateX(-100%)' : '');
        t.dot.style.transform = `translate(${t.ax}px, ${t.ay}px)`;
        // the leader starts at the tag's inner edge and runs back to the part
        const dx = t.ax - t.lx;
        const dy = t.ay - t.ly;
        t.lead.style.width = `${Math.hypot(dx, dy)}px`;
        t.lead.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      }
    }
  }

  sweepBtn = root.querySelector('#units-sweep');
  if (sweepBtn) {
    sweepBtn.addEventListener('click', () => {
      state.sweep = !state.sweep;
      sweepBtn.classList.toggle('on', state.sweep);
      // freezing snaps the turret back to rest, which is the point of it
      if (!state.sweep && current && current.userData.tick) current.userData.tick(0);
    });
    if (new URLSearchParams(location.search).get('sweep') === '0') sweepBtn.click();
  }

  const labelsBtn = root.querySelector('#units-labels');
  if (labelsBtn) {
    labelsBtn.addEventListener('click', () => {
      callOn = !callOn;
      labelsBtn.classList.toggle('on', callOn);
      if (callLayer) callLayer.classList.toggle('hidden', !callOn || !callTags.length);
      drawCallouts();
    });
    // ?labels=1 — headless has no pointer, same reason as ?tune=1
    if (new URLSearchParams(location.search).get('labels')) labelsBtn.click();
  }
  // ?fire=N fires a shell N seconds into the run, so the shell in flight and
  // the red-hot barrel can be caught in a still frame.
  {
    const at = parseFloat(new URLSearchParams(location.search).get('fire'));
    if (Number.isFinite(at)) setTimeout(() => { setEngine(true); fireShell(); }, at * 1000);
  }

  // --- the tuning modal ----------------------------------------------------
  // Sliders are generated from TANK_FEEL_KNOBS and write straight into FEEL,
  // the object the game reads. There is no apply step and nothing to sync:
  // the tank in front of you IS the tank that ships, mid-drag.
  (function wireTuner() {
    const panel = root.querySelector('#units-tuner');
    const list = root.querySelector('#units-tuner-knobs');
    const open = root.querySelector('#units-tune');
    if (!panel || !list || !open) return;
    loadFeel();

    const rows = TANK_FEEL_KNOBS.map((k) => {
      const row = document.createElement('label');
      row.className = 'tuner-row';
      const dp = Math.max(0, Math.ceil(-Math.log10(k.step)));
      row.innerHTML = `<span class="tuner-name"></span>`
        + `<input type="range" min="${k.min}" max="${k.max}" step="${k.step}">`
        + '<output></output>';
      row.querySelector('.tuner-name').textContent = k.label;
      const slider = row.querySelector('input');
      const out = row.querySelector('output');
      const show = () => {
        slider.value = FEEL[k.key];
        out.textContent = Number(FEEL[k.key]).toFixed(dp);
      };
      slider.addEventListener('input', () => { FEEL[k.key] = Number(slider.value); show(); });
      slider.addEventListener('change', saveFeel);
      show();
      return { k, row, show };
    });

    let group = null;
    for (const r of rows) {
      if (r.k.group !== group) {
        group = r.k.group;
        const h = document.createElement('div');
        h.className = 'tuner-group';
        h.textContent = group;
        list.appendChild(h);
      }
      list.appendChild(r.row);
    }
    const refresh = () => { for (const r of rows) r.show(); };

    const setOpen = (on) => {
      panel.classList.toggle('tuner-hidden', !on);
      open.classList.toggle('on', on);
      if (on) refresh();
    };
    open.addEventListener('click', () => setOpen(panel.classList.contains('tuner-hidden')));
    // ?tune=1 opens it on load — headless has no pointer, so without this the
    // panel could only ever be verified by hand.
    if (new URLSearchParams(location.search).get('tune')) setOpen(true);
    root.querySelector('#units-tune-close').addEventListener('click', () => setOpen(false));
    root.querySelector('#units-tune-reset').addEventListener('click', () => { resetFeel(); refresh(); });

    // Copy as SOURCE, not as JSON: the destination is tankfeel.js, and a blob
    // you have to hand-translate is a blob nobody transcribes.
    const copy = root.querySelector('#units-tune-copy');
    const label = copy.querySelector('.label');
    let revert = 0;
    copy.addEventListener('click', async () => {
      clearTimeout(revert);
      try {
        await navigator.clipboard.writeText(formatFeelCode(FEEL));
        copy.classList.add('ok'); label.textContent = 'copied';
      } catch {
        copy.classList.add('fail'); label.textContent = 'copy failed';
      }
      revert = setTimeout(() => {
        copy.classList.remove('ok', 'fail'); label.textContent = 'copy code';
      }, 1600);
    });
  })();

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
