// towerlooks.mjs — the tower visual registry.
//
// The point of the registry is that changing how a tower LOOKS must never
// require touching what a tower DOES. These tests pin the contract that
// makes a swap safe: every look builds every tower in the roster, every
// built object satisfies what td-tab reads off it, and an unknown look
// name degrades to the default instead of leaving an invisible tower.

import { TOWER_LOOKS, TOWER_LOOK_NAMES, DEFAULT_TOWER_LOOK, buildTowerLook, lookReady }
  from '../src/towerlooks.js';
import { TOWERS } from '../src/towers.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

console.log('registry shape:');
check('at least two looks — a registry of one proves nothing',
  TOWER_LOOK_NAMES.length >= 2, TOWER_LOOK_NAMES.join(','));
check('the default is a real look', TOWER_LOOK_NAMES.includes(DEFAULT_TOWER_LOOK));
for (const n of TOWER_LOOK_NAMES) {
  const L = TOWER_LOOKS[n];
  check(`${n}: has a label`, typeof L.label === 'string' && L.label.length > 0);
  check(`${n}: build is a function`, typeof L.build === 'function');
  check(`${n}: preload, if present, is a function`,
    L.preload === undefined || typeof L.preload === 'function');
}

console.log('every look builds every tower in the roster:');
for (const n of TOWER_LOOK_NAMES) {
  let built = 0, bad = '';
  for (const def of TOWERS) {
    try {
      const o = buildTowerLook(n, def);
      if (!o || typeof o.traverse !== 'function') { bad = `${def.key}: not an Object3D`; break; }
      if (typeof o.userData.baseScale !== 'number') { bad = `${def.key}: no baseScale`; break; }
      if (o.userData.tick && typeof o.userData.tick !== 'function') { bad = `${def.key}: bad tick`; break; }
      built++;
    } catch (err) { bad = `${def.key}: threw ${err.message}`; break; }
  }
  check(`${n} builds all ${TOWERS.length}`, built === TOWERS.length && !bad, bad);
}

console.log('the contract td-tab actually relies on:');
{
  const o = buildTowerLook(DEFAULT_TOWER_LOOK, TOWERS[0]);
  check('baseScale is positive', o.userData.baseScale > 0);
  check('tick is callable without throwing', (() => {
    try { o.userData.tick?.(1.3); return true; } catch { return false; }
  })());
  let meshes = 0;
  o.traverse((c) => { if (c.isMesh) meshes++; });
  check('contains meshes, so tap-to-select can raycast it', meshes > 0, `${meshes} meshes`);
}

console.log('degrading safely:');
check('an unknown look falls back rather than returning null',
  !!buildTowerLook('no-such-look', TOWERS[0]));
check('an unknown look still yields a usable object',
  buildTowerLook('no-such-look', TOWERS[0]).userData.baseScale > 0);
check('lookReady is true for a look with no async assets', lookReady(DEFAULT_TOWER_LOOK));
check('lookReady is false for an unknown name', lookReady('no-such-look') === false);

console.log('looks are actually DIFFERENT (a swap you cannot see is not a swap):');
{
  const a = buildTowerLook('braille', TOWERS[0]);
  const b = buildTowerLook('solid', TOWERS[0]);
  const count = (o, pred) => { let n = 0; o.traverse((c) => { if (pred(c)) n++; }); return n; };
  check('braille has a Points head', count(a, (c) => c.isPoints) > 0);
  check('solid has no Points head', count(b, (c) => c.isPoints) === 0);
  check('solid has more meshes than braille',
    count(b, (c) => c.isMesh) > count(a, (c) => c.isMesh));
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\ntower look invariants hold');
