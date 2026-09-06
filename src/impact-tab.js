// impact-tab.js — THE IMPACT LAB. What a hit looks like when it lands.
//
// Operator: "augment our laser lab to research spark/flash particles at
// impact — an impact tab with various effects, and a toggleable wall to see
// the effect, for sentries and tank."
//
// The board has had exactly ONE impact effect since it was built: a puff of
// tinted dots, reused for a run-over, a shell, a laser tick and a portal
// collapse. That is why hits feel weightless, and it is not a tuning problem —
// so this lab exists to research the effects themselves (src/impactfx.js) and
// hand the game a recipe per weapon.
//
// THE WALL IS THE INSTRUMENT. An impact in open air tells you almost nothing:
// sparks only read when they spray AWAY from a surface, a shockwave ring only
// reads when it lies flat ON one, and a scorch has nowhere to be without it.
// So the wall angles, and the incidence angle is the single control that
// changes the picture most.
//
// The game's own light rig and bloom chain, for the same reason the beam lab
// uses them: an effect tuned under gentle studio light is wrong the moment it
// fires on the board.
import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import GUI from '../vendor/lil-gui.esm.js';
import { makeBloom } from './postfx.js?v=b9640e2c';
import { bakeGalaxyCube } from './galaxybake.js?v=b9640e2c';
import { SKY_PRESET } from './galaxyseed.js?v=b9640e2c';
import {
  IMPACT_TUNE, IMPACT_KNOBS, IMPACT_FAMILIES, IMPACT_RECIPES,
  makeImpactParams, clampImpactParams, formatImpactTune,
  makeImpactBurst, orientImpact,
} from './impactfx.js?v=b9640e2c';
import { buildCreature, preloadMkcx } from './units.js?v=b9640e2c';
import { sentryUrl, SENTRY_FAMILIES } from './sentry.js?v=b9640e2c';
import { loadGlb } from './glbmodels.js?v=b9640e2c';
import { TOWERS, TOWER_BY_KEY } from './towers.js?v=b9640e2c';
import {
  SENTRY_FX, fxFor, tuneFor, formatSentryFx, formatAllSentryFx,
} from './sentryfx.js?v=b9640e2c';
import { deepLink, wireDeepLink } from './deeplink.js?v=b9640e2c';

// The surfaces a hit can land on. Each is a real answer to "what did I just
// shoot", and the SPARK COLOUR is the biggest part of that answer — a chip
// off painted steel is not a chip off rock, and the eye knows it before it
// knows anything else about the hit.
const SURFACES = {
  armour: { label: 'armour plate', color: 0x6e777e, rough: 0.45, metal: 0.85,
    spark: 0xffd08a, chunk: 0x8a8f94, scorch: 0x0e0b09 },
  rock:   { label: 'rock',         color: 0x54504a, rough: 0.95, metal: 0.0,
    spark: 0xffb066, chunk: 0x6b655c, scorch: 0x14100c },
  hull:   { label: 'hull metal',   color: 0x3f4a52, rough: 0.35, metal: 0.95,
    spark: 0xcfe8ff, chunk: 0x5b6a75, scorch: 0x0a0d10 },
};

export function initImpactTab(root) {
  let active = false;
  const q = new URLSearchParams(location.search);
  const container = root.querySelector('#impact-app');
  const hud = root.querySelector('#impact-hud');

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 200);
  camera.position.set(2.9, 1.5, 3.6);

  // THE GAME'S RIG, not an inspection rig: an effect tuned under gentle
  // studio light is wrong the moment it fires on the board.
  scene.add(new THREE.HemisphereLight(0xc8cfe0, 0x555060, 0.55));
  const sun = new THREE.DirectionalLight(0xffe8c8, 0.25);
  sun.position.set(4, 6, 3);
  scene.add(sun);
  // ...and the board's SKY as an environment. A metal plate with nothing to
  // reflect is black under this rig whatever its albedo, and a black plate
  // makes every effect look good — which is exactly the wrong instrument.
  {
    const sky = bakeGalaxyCube(renderer, { ...SKY_PRESET, seed: 4414, face: 512, galaxies: 2 });
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromCubemap(sky.texture).texture;
    scene.environmentIntensity = 0.55;
  }

  const postfx = makeBloom(renderer, scene, camera, {});
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.95, 0);

  // THE SUBJECT. The lab's job is now: pick a sentry, tune ITS muzzle and
  // ITS impact, export the result as the default. So the panel edits a
  // WORKING COPY of that family's profile rather than a free-floating tune —
  // otherwise "export" has nothing to export and the operator is transcribing
  // numbers by hand, which is the friction this is meant to remove.
  const FX_KEYS = Object.keys(SENTRY_FX);
  let subject = FX_KEYS.includes(q.get('sentry')) ? q.get('sentry') : 'lancer';
  // deep copies: editing the live table would make "revert" impossible and
  // would silently change the running game from a lab panel
  const work = {};
  for (const k of FX_KEYS) {
    const p0 = SENTRY_FX[k];
    work[k] = {
      shot: { ...p0.shot },
      muzzle: { ...p0.muzzle, colors: { ...p0.muzzle.colors }, tune: { ...p0.muzzle.tune } },
      impact: { ...p0.impact, colors: { ...p0.impact.colors }, tune: { ...p0.impact.tune } },
    };
  }
  const prof = () => work[subject];
  const slotOf = () => (P.slot === 'muzzle' ? prof().muzzle : prof().impact);

  const P = {
    slot: 'impact',             // which half of the profile the knobs edit
    recipe: 'shell',            // shell | laser | plasma | light | custom
    source: 'tank',             // tank | sentry — WHO is shooting
    surface: 'armour',
    wall: true,
    wallAngle: 25,              // degrees off square-on. 0 = the camera's enemy
    wallSize: 3.0,
    auto: true, every: 1.1,     // fire on a clock, so a tweak is seen at once
    slow: 1.0,                  // time scale: an impact is 400ms and you will miss it
    trail: true,                // leave scorches standing
    showMuzzle: true,           // fire the muzzle alongside the impact
    size: 1.0,                  // ONE number scales the whole hit
    ...makeImpactParams(),
  };
  // per-family switches for the CUSTOM recipe, so a single effect can be
  // looked at with nothing else on top of it — which is the only way to tune
  // one, since seven at once is a single bright smear
  for (const f of IMPACT_FAMILIES) P[`use_${f}`] = IMPACT_RECIPES.shell.includes(f);

  const P0 = { ...P };
  for (const [k, v] of q.entries()) {
    if (!(k in P)) continue;
    if (typeof P[k] === 'number') { const n = parseFloat(v); if (Number.isFinite(n)) P[k] = n; }
    else if (typeof P[k] === 'boolean') P[k] = v !== '0';
    else P[k] = v;
  }
  clampImpactParams(P, P);   // the URL half of the tune, back inside its ranges

  // --- the wall -------------------------------------------------------------
  let wall = null;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x6e777e, roughness: 0.45, metalness: 0.85 });
  function buildWall() {
    if (wall) { scene.remove(wall); wall.geometry.dispose(); }
    wall = new THREE.Mesh(new THREE.PlaneGeometry(P.wallSize, P.wallSize), wallMat);
    wall.receiveShadow = true;
    scene.add(wall);
    placeWall();
  }
  function placeWall() {
    if (!wall) return;
    wall.visible = P.wall;
    // it stands upright and TURNS about its own vertical: the angle knob is
    // the angle of incidence, which is the control that changes the picture
    // most and the reason the wall moves at all
    wall.position.set(0, P.wallSize * 0.42, 0);
    wall.rotation.set(0, THREE.MathUtils.degToRad(P.wallAngle), 0);
  }
  function surfaceDef() { return SURFACES[P.surface] || SURFACES.armour; }
  function paintWall() {
    const s = surfaceDef();
    wallMat.color.setHex(s.color);
    wallMat.roughness = s.rough;
    wallMat.metalness = s.metal;
    wallMat.needsUpdate = true;
  }
  buildWall(); paintWall();

  // the floor, so the sparks that skid off the wall have somewhere to land
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshStandardMaterial({ color: 0x0d1116, roughness: 1, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new THREE.GridHelper(14, 28, 0x1d4a55, 0x12303a);
  grid.position.y = 0.002;
  scene.add(grid);

  // --- who is shooting ------------------------------------------------------
  // The lab carries the actual shooters rather than a marker, because the
  // MUZZLE HEIGHT and the stand-off decide the incidence angle as much as the
  // wall's own rotation does — a sentry shoots down at a wall the tank shoots
  // level at, and the sparks come off differently.
  const shooters = { tank: null, sentry: null };
  // the barrel tips, in world space. They track the shooters' own stand-off:
  // a muzzle flash that fires where the gun is not is worse than none.
  const MUZZLE = { tank: [-1.75, 0.55, 1.9], sentry: [-1.75, 1.15, 1.9] };
  preloadMkcx('mkcx2').then(() => {
    const t = buildCreature('mkcx2', {});
    if (!t) return;
    t.scale.setScalar(0.9);
    t.position.set(-1.75, 0, 2.3);
    t.rotation.y = Math.PI;      // facing the wall
    shooters.tank = t;
    scene.add(t);
    syncShooter();
  }).catch(() => {});
  // THE SELECTED SENTRY'S OWN MODEL, loaded through the shared cache — the
  // same door the towers use, so the lab looks at what the game ships. Not
  // every FX key has a model (roster 1 has none at all), so a missing one is
  // a normal outcome and leaves the tank standing in.
  const MODEL_FOR = Object.fromEntries(SENTRY_FAMILIES.map((f) => [f.id, f.id]));
  function modelIdFor(key) {
    const def = TOWER_BY_KEY[key] || TOWERS.find((t) => t.key === key);
    if (def && def.model && MODEL_FOR[def.model]) return def.model;
    return MODEL_FOR[key] || null;
  }
  function loadSentryModel() {
    const id = modelIdFor(subject);
    if (shooters.sentry) { scene.remove(shooters.sentry); shooters.sentry = null; }
    if (!id) { syncShooter(); return; }
    loadGlb(sentryUrl(id, 2)).then((proto) => {
      if (!proto || modelIdFor(subject) !== id) return;   // the panel moved on
      const o = proto.clone(true);
      const b = new THREE.Box3().setFromObject(o);
      const sz = b.getSize(new THREE.Vector3());
      o.scale.setScalar(1.3 / Math.max(sz.y, 1e-6));
      o.position.set(-1.75, 0, 2.3);
      o.rotation.y = Math.PI;
      shooters.sentry = o;
      scene.add(o);
      syncShooter();
      if (probeOn) console.log(`IMPACTPROBE model ${subject} -> ${id}_t2.glb`);
    }).catch(() => {});
  }
  loadSentryModel();
  function syncShooter() {
    if (shooters.tank) shooters.tank.visible = P.source === 'tank';
    if (shooters.sentry) shooters.sentry.visible = P.source === 'sentry';
  }

  // --- firing ---------------------------------------------------------------
  const live = [];        // every burst currently ticking
  const standing = [];    // scorches kept when `trail` is on
  let shots = 0, lastFamilies = [];

  // WHERE THE SHOT LANDS. A ray from the muzzle to the wall's plane, so the
  // contact point and the NORMAL are both the wall's own — derived from the
  // transform, never re-derived from the angle knob with a second sign
  // convention, which is the recurring bug this project keeps paying for.
  function contact() {
    const m = MUZZLE[P.source] || MUZZLE.tank;
    const from = new THREE.Vector3(m[0], m[1], m[2]);
    if (!wall || !P.wall) {
      // no wall: fire into open air at the stand-off distance, normal facing
      // the camera. Worth having — it shows exactly how little an impact
      // reads without a surface, which is the lab's first lesson.
      return { point: [0, m[1], 0], normal: [0, 0, 1] };
    }
    wall.updateMatrixWorld(true);
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(wall.quaternion).normalize();
    const p0 = wall.position.clone();
    // A GUN AIMS. Firing straight down -Z from a shooter parked off to one
    // side put every hit on the wall's edge and made the incidence knob a
    // half-truth — the angle between the shot and the surface is what the
    // sparks answer to, and that needs a real line of fire. So: from the
    // muzzle to the aim point, which is the plate's middle at muzzle height.
    const aim = new THREE.Vector3(0, Math.min(P.wallSize * 0.55, Math.max(0.35, from.y)), 0);
    const dir = aim.sub(from).normalize();
    const denom = n.dot(dir);
    let hit;
    if (Math.abs(denom) < 1e-6) hit = p0.clone();
    else {
      const t = n.dot(p0.clone().sub(from)) / denom;
      hit = from.clone().add(dir.clone().multiplyScalar(t));
    }
    // keep it on the plate rather than off its edge at a steep angle
    const half = P.wallSize * 0.45;
    hit.y = Math.min(P.wallSize - 0.2, Math.max(0.2, hit.y));
    hit.x = Math.min(half, Math.max(-half, hit.x));
    // the normal must face the SHOOTER, or every effect fires into the wall
    if (n.dot(from.clone().sub(hit)) < 0) n.negate();
    return { point: [hit.x, hit.y, hit.z], normal: [n.x, n.y, n.z] };
  }

  function currentRecipe() {
    const fx = slotOf();
    if (P.recipe === 'profile') {
      return Array.isArray(fx.recipe) ? fx.recipe : (IMPACT_RECIPES[fx.recipe] || []);
    }
    if (P.recipe !== 'custom') return IMPACT_RECIPES[P.recipe] || IMPACT_RECIPES.light;
    return IMPACT_FAMILIES.filter((f) => P[`use_${f}`]);
  }

  // PULL and PUSH between the panel and the working profile. The knobs are a
  // flat list (lil-gui wants one object) while a profile keeps its deltas in
  // a nested `tune`, so these two functions are the seam — and they are the
  // reason the export can be a copy button instead of a transcription.
  function pullFromProfile() {
    const fx = slotOf();
    // the panel shows the FOLDED tune: base + this family's deltas, so a knob
    // that the family never overrode still shows the value it actually fires
    // with rather than a blank
    Object.assign(P, tuneFor(fx));
    P.size = fx.size;
    for (const f of IMPACT_FAMILIES) P[`use_${f}`] = currentRecipeNames(fx).includes(f);
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }
  function currentRecipeNames(fx) {
    return Array.isArray(fx.recipe) ? fx.recipe : (IMPACT_RECIPES[fx.recipe] || []);
  }
  // ONLY WHAT DIFFERS is written back. A profile that records all 27 knobs is
  // a profile that stops tracking IMPACT_TUNE — change a base value later and
  // every family silently keeps the old one, which is the same drift the
  // towers.js split was done to avoid.
  function pushToProfile() {
    const fx = slotOf();
    const tune = {};
    for (const k of IMPACT_KNOBS) {
      if (Math.abs(P[k.key] - IMPACT_TUNE[k.key]) > 1e-9) tune[k.key] = P[k.key];
    }
    fx.tune = tune;
    fx.size = P.size;
    if (P.recipe === 'custom') fx.recipe = IMPACT_FAMILIES.filter((f) => P[`use_${f}`]);
    else if (P.recipe !== 'profile') fx.recipe = P.recipe;
  }

  function fire() {
    const s = surfaceDef();
    const { point, normal } = contact();
    pushToProfile();                 // the panel IS the profile; keep them one thing
    const fx = slotOf();
    const names = currentRecipe();
    // the SURFACE decides what a chip and a scorch look like; the WEAPON
    // decides everything else. Both matter and neither owns the other, so the
    // surface fills in only what the profile did not name.
    const colors = { spark: s.spark, debris: s.chunk, scorch: s.scorch, ...fx.colors };
    const burst = makeImpactBurst(names, tuneFor(fx), colors, ++shots, fx.size);
    orientImpact(burst, point, normal);
    scene.add(burst);
    live.push(burst);
    lastFamilies = names;
    // ...and the MUZZLE, at the barrel, pointing back down the line of fire.
    // Firing them separately would let a muzzle and an impact be tuned to
    // look wrong together while each looks right alone, which is exactly the
    // mistake a per-effect lab invites.
    if (P.showMuzzle) {
      const mz = prof().muzzle;
      const mNames = Array.isArray(mz.recipe) ? mz.recipe : (IMPACT_RECIPES[mz.recipe] || []);
      if (mNames.length) {
        const m = MUZZLE[P.source] || MUZZLE.tank;
        const mb = makeImpactBurst(mNames, tuneFor(mz), mz.colors, shots + 991, mz.size);
        // +Z out of the "surface" means, at a muzzle, back along the barrel
        // toward where the round came from — so the flash blooms outward
        orientImpact(mb, m, [0, 0, 1]);
        scene.add(mb);
        live.push(mb);
      }
    }
    if (probeOn) {
      console.log(`IMPACTPROBE shot=${shots} sentry=${subject} slot=${P.slot} recipe=${P.recipe} [${names.join(',')}]`
        + ` surface=${P.surface} wall=${P.wall} angle=${P.wallAngle}`
        + ` at=(${point.map((v) => v.toFixed(2)).join(',')})`
        + ` n=(${normal.map((v) => v.toFixed(2)).join(',')}) live=${live.length}`);
    }
  }

  const probeOn = q.get('impactprobe') === '1';

  // --- GUI ------------------------------------------------------------------
  const gui = new GUI({ title: 'SENTRY FX', container: root });
  // 1. PICK A SENTRY. Everything below edits that family's profile.
  gui.add({ sentry: subject }, 'sentry', FX_KEYS).name('sentry').onChange((v) => {
    subject = v;
    P.recipe = 'profile';
    pullFromProfile();
    loadSentryModel();
  });
  gui.add(P, 'slot', ['impact', 'muzzle']).name('tuning').onChange(() => {
    P.recipe = 'profile';
    pullFromProfile();
  });
  gui.add(P, 'recipe', ['profile', 'shell', 'laser', 'plasma', 'light', 'custom']).name('recipe');
  gui.add(P, 'showMuzzle').name('show muzzle too');
  gui.add(P, 'source', ['tank', 'sentry']).name('fired by').onChange(syncShooter);
  gui.add(P, 'surface', Object.keys(SURFACES)).name('surface').onChange(paintWall);
  gui.add({ shoot: () => fire() }, 'shoot').name('FIRE (F)');
  gui.add(P, 'auto').name('auto-fire');
  gui.add(P, 'every', 0.2, 4, 0.1).name('every (s)');
  gui.add(P, 'slow', 0.1, 1, 0.05).name('time scale');
  gui.add(P, 'size', 0.1, 4, 0.05).name('hit size');
  gui.add(P, 'trail').name('keep scorches');

  const gWall = gui.addFolder('wall');
  gWall.add(P, 'wall').name('wall on').onChange(placeWall);
  gWall.add(P, 'wallAngle', -80, 80, 1).name('incidence (deg)').onChange(placeWall);
  gWall.add(P, 'wallSize', 1, 10, 0.5).name('size').onChange(() => { buildWall(); });

  const gCustom = gui.addFolder('custom recipe');
  for (const f of IMPACT_FAMILIES) gCustom.add(P, `use_${f}`).name(f);

  // one folder per family, so tuning a spark never means scrolling past a
  // scorch — the knob table's own `group` decides this, not a second list
  const byGroup = {};
  for (const k of IMPACT_KNOBS) (byGroup[k.group] ||= []).push(k);
  for (const [g, knobs] of Object.entries(byGroup)) {
    const f = gui.addFolder(g);
    for (const k of knobs) f.add(P, k.key, k.min, k.max, k.step).name(k.label);
    f.close();
  }

  // 3. EXPORT — the reason the panel edits a profile rather than a loose
  // tune. What comes out is the exact source of the entry in sentryfx.js, so
  // making a tuning the default is a paste and not a transcription. A tuning
  // that lives in one browser is a tuning that never ships, which is what
  // makes this the load-bearing button on the panel rather than a nicety.
  function exportOne() {
    pushToProfile();
    return formatSentryFx(subject, prof());
  }
  function exportAll() {
    pushToProfile();
    return formatAllSentryFx.call(null) && Object.entries(work)
      .map(([k, p]) => formatSentryFx(k, p)).join('\n');
  }
  function copyOut(src, what) {
    const say = () => { flash(`${what} copied — paste over its entry in src/sentryfx.js`); };
    console.log(`SENTRYFX ${what}:\n${src}`);
    if (navigator.clipboard) navigator.clipboard.writeText(src).then(say, () => {});
    else say();
  }
  const copyBtn = root.querySelector('#impact-copy');
  if (copyBtn) copyBtn.addEventListener('click', () => copyOut(exportOne(), subject));
  gui.add({ exp: () => copyOut(exportOne(), subject) }, 'exp')
    .name('EXPORT this sentry');
  gui.add({ expAll: () => copyOut(exportAll(), 'the whole table') }, 'expAll')
    .name('export ALL families');
  gui.add({ revert: () => {
    const p0 = SENTRY_FX[subject];
    work[subject] = {
      shot: { ...p0.shot },
      muzzle: { ...p0.muzzle, colors: { ...p0.muzzle.colors }, tune: { ...p0.muzzle.tune } },
      impact: { ...p0.impact, colors: { ...p0.impact.colors }, tune: { ...p0.impact.tune } },
    };
    P.recipe = 'profile';
    pullFromProfile();
    flash(`${subject} reverted to its shipped profile`);
  } }, 'revert').name('revert this sentry');
  wireDeepLink(root.querySelector('#impact-link'),
    () => deepLink({ base: location.origin + location.pathname, hash: 'impact', params: P, defaults: P0 }),
    { flash: (m) => flash(m) });

  let flashMsg = '', flashT = 0;
  function flash(m) { flashMsg = m; flashT = 2.0; }

  // open on the SUBJECT's own numbers, not on IMPACT_TUNE's — otherwise the
  // first thing the lab shows is a weapon nobody ships
  if (!q.get('recipe')) P.recipe = 'profile';
  pullFromProfile();

  addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'f' || e.key === 'F') { fire(); e.preventDefault(); }
    if (e.key === 'c' || e.key === 'C') { clearAll(); e.preventDefault(); }
  });

  function clearAll() {
    for (const b of [...live, ...standing]) scene.remove(b);
    live.length = 0; standing.length = 0;
  }

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    postfx.setSize(w, h);
  }
  addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let sinceFire = 0, hudT = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!active) return;
    const raw = Math.min(0.05, clock.getDelta());
    const dt = raw * P.slow;    // an impact is 400ms: without this you miss it
    if (P.auto) {
      sinceFire += raw;
      if (sinceFire >= P.every) { sinceFire = 0; fire(); }
    }
    for (let i = live.length - 1; i >= 0; i--) {
      if (live[i].userData.tick(dt)) continue;
      // KEEP THE SCORCHES. Everything else is over in two seconds; a wall you
      // have shot fifty times should not look like one nobody has touched.
      if (P.trail && (live[i].userData.families || []).includes('scorch')) standing.push(live[i]);
      else scene.remove(live[i]);
      live.splice(i, 1);
    }
    while (standing.length > 40) scene.remove(standing.shift());
    controls.update();
    postfx.render();
    hudT += raw;
    if (hudT > 0.2) {
      hudT = 0;
      if (flashT > 0) { flashT -= 0.2; hud.textContent = flashMsg; }
      else {
        hud.textContent = `${subject.toUpperCase()} · tuning ${P.slot}`
          + ` · ${P.recipe} [${lastFamilies.join(' + ') || '-'}]`
          + ` · ${P.source} → ${surfaceDef().label}`
          + ` · wall ${P.wall ? `${P.wallAngle}°` : 'OFF'}`
          + ` · live ${live.length} · scorches ${standing.length}`
          + ` · x${P.slow.toFixed(2)} time · F fire, C clear`;
      }
    }
  }
  animate();

  // ?impactprobe=1 — fire one of every recipe and report what each produced.
  // A particle effect cannot be checked from a still: a spark shower and a
  // dead emitter are the same photograph one frame after the flash.
  if (probeOn) {
    setTimeout(() => {
      // AUTO-FIRE OFF FIRST. The 6-second beat asserts that every burst
      // returned false and was reaped, and it cannot tell a leak from a shot
      // fired one second ago — with the clock running it reports WRONG on
      // working code, which is the same trap the shove probe fell into.
      const wasAuto = P.auto, wasRecipe = P.recipe;
      P.auto = false;
      for (const name of [...Object.keys(IMPACT_RECIPES), 'custom']) {
        P.recipe = name;
        fire();
      }
      P.recipe = wasRecipe;   // a probe that leaves the panel changed is a probe that lies twice
      // THE EXPORT IS THE POINT, so it is checked rather than assumed. A tune
      // that emits source which does not carry the edit is worse than no
      // export: the operator pastes, the values quietly revert, and the lab
      // looks like it lied.
      {
        P.slot = 'impact';
        P.recipe = 'profile';
        pullFromProfile();
        const before = tuneFor(prof().impact).ringEnd;
        P.ringEnd = before + 0.37;           // an edit no shipped profile has
        P.size = 2.345;
        const src = exportOne();
        const carriesTune = src.includes(`ringEnd: ${Number((before + 0.37).toFixed(3))}`);
        const carriesSize = src.includes('2.35') || src.includes('2.34');
        const onlyDeltas = !src.includes('sparkLife');   // untouched knobs stay out
        console.log(`IMPACTPROBE export sentry=${subject} tune=${carriesTune}`
          + ` size=${carriesSize} deltas-only=${onlyDeltas}`
          + ` ${carriesTune && carriesSize && onlyDeltas ? 'OK'
            : 'WRONG — the export does not carry the edit'}`);
        const all = exportAll().split('\n').filter((l) => /^  \w+: \{ shot:/.test(l)).length;
        console.log(`IMPACTPROBE export-all families=${all}/${FX_KEYS.length}`
          + ` ${all === FX_KEYS.length ? 'OK' : 'WRONG — the table is incomplete'}`);
      }
      setTimeout(() => {
        console.log(`IMPACTPROBE after 1s: live=${live.length} standing=${standing.length}`
          + ` ${live.length > 0 ? 'OK — effects are still running' : 'WRONG — everything died instantly'}`);
      }, 1000);
      setTimeout(() => {
        console.log(`IMPACTPROBE after 6s: live=${live.length} standing=${standing.length}`
          + ` ${live.length === 0 ? 'OK — every burst finished and was reaped'
            : 'WRONG — something never returned false and is leaking'}`);
        P.auto = wasAuto;
      }, 6000);
    }, 1200);
  }

  return {
    setActive(on) { active = on; if (on) { resize(); clock.getDelta(); } },
  };
}
