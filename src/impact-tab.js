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
import { makeBloom } from './postfx.js';
import { bakeGalaxyCube } from './galaxybake.js';
import { SKY_PRESET } from './galaxyseed.js';
import {
  IMPACT_TUNE, IMPACT_KNOBS, IMPACT_FAMILIES, IMPACT_RECIPES,
  makeImpactParams, clampImpactParams, formatImpactTune,
  makeImpactBurst, orientImpact,
} from './impactfx.js';
import { buildCreature, preloadMkcx } from './units.js';
import { sentryUrl } from './sentry.js';
import { loadGlb } from './glbmodels.js';
import { deepLink, wireDeepLink } from './deeplink.js';

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

  const P = {
    recipe: 'shell',            // shell | laser | plasma | light | custom
    source: 'tank',             // tank | sentry — WHO is shooting
    surface: 'armour',
    wall: true,
    wallAngle: 25,              // degrees off square-on. 0 = the camera's enemy
    wallSize: 3.0,
    auto: true, every: 1.1,     // fire on a clock, so a tweak is seen at once
    slow: 1.0,                  // time scale: an impact is 400ms and you will miss it
    trail: true,                // leave scorches standing
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
  const MUZZLE = { tank: [0, 0.62, 3.2], sentry: [0, 1.55, 3.0] };
  preloadMkcx('mkcx2').then(() => {
    const t = buildCreature('mkcx2', {});
    if (!t) return;
    t.scale.setScalar(0.9);
    t.position.set(1.5, 0, 2.6);
    t.rotation.y = Math.PI;      // facing the wall
    shooters.tank = t;
    scene.add(t);
    syncShooter();
  }).catch(() => {});
  // the Workshop's own Lancer, loaded through the shared cache — the same
  // door the towers use, so the lab is looking at the model the game ships
  loadGlb(sentryUrl('lancer', 2)).then((proto) => {
    if (!proto) return;
    const s = proto.clone(true);
    // one unit tall is not this file's contract, so size it off its own box
    const b = new THREE.Box3().setFromObject(s);
    const sz = b.getSize(new THREE.Vector3());
    s.scale.setScalar(1.7 / Math.max(sz.y, 1e-6));
    s.position.set(1.5, 0, 2.6);
    s.rotation.y = Math.PI;
    shooters.sentry = s;
    scene.add(s);
    syncShooter();
  }).catch(() => {});
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
    const dir = new THREE.Vector3(0, 0, -1);          // the shooter looks down -Z
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
    if (P.recipe !== 'custom') return IMPACT_RECIPES[P.recipe] || IMPACT_RECIPES.light;
    return IMPACT_FAMILIES.filter((f) => P[`use_${f}`]);
  }

  function fire() {
    const s = surfaceDef();
    const { point, normal } = contact();
    const names = currentRecipe();
    const burst = makeImpactBurst(names, P, {
      spark: s.spark, debris: s.chunk, scorch: s.scorch,
    }, ++shots, P.size);
    orientImpact(burst, point, normal);
    scene.add(burst);
    live.push(burst);
    lastFamilies = names;
    if (probeOn) {
      console.log(`IMPACTPROBE shot=${shots} recipe=${P.recipe} [${names.join(',')}]`
        + ` surface=${P.surface} wall=${P.wall} angle=${P.wallAngle}`
        + ` at=(${point.map((v) => v.toFixed(2)).join(',')})`
        + ` n=(${normal.map((v) => v.toFixed(2)).join(',')}) live=${live.length}`);
    }
  }

  const probeOn = q.get('impactprobe') === '1';

  // --- GUI ------------------------------------------------------------------
  const gui = new GUI({ title: 'IMPACT', container: root });
  gui.add(P, 'recipe', ['shell', 'laser', 'plasma', 'light', 'custom']).name('weapon');
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

  const copyBtn = root.querySelector('#impact-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const src = formatImpactTune(P);
      navigator.clipboard.writeText(src).then(
        () => { flash('tune copied to clipboard'); console.log('IMPACT tune:\n' + src); },
        () => console.log('IMPACT tune:\n' + src));
    });
  }
  wireDeepLink(root.querySelector('#impact-link'),
    () => deepLink({ base: location.origin + location.pathname, hash: 'impact', params: P, defaults: P0 }),
    { flash: (m) => flash(m) });

  let flashMsg = '', flashT = 0;
  function flash(m) { flashMsg = m; flashT = 2.0; }

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
        hud.textContent = `${P.recipe} [${lastFamilies.join(' + ') || '-'}]`
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
      for (const name of [...Object.keys(IMPACT_RECIPES), 'custom']) {
        P.recipe = name;
        fire();
      }
      setTimeout(() => {
        console.log(`IMPACTPROBE after 1s: live=${live.length} standing=${standing.length}`
          + ` ${live.length > 0 ? 'OK — effects are still running' : 'WRONG — everything died instantly'}`);
      }, 1000);
      setTimeout(() => {
        console.log(`IMPACTPROBE after 6s: live=${live.length} standing=${standing.length}`
          + ` ${live.length === 0 ? 'OK — every burst finished and was reaped'
            : 'WRONG — something never returned false and is leaking'}`);
      }, 6000);
    }, 1200);
  }

  return {
    setActive(on) { active = on; if (on) { resize(); clock.getDelta(); } },
  };
}
