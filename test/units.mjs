// units.mjs — roster sanity: every unit builds, normalizes, and animates.
// three.js runs fine in Node for geometry work (no DOM needed).

import * as THREE from '../vendor/three.module.js';
import { UNITS, UNIT_NAMES, buildUnit } from '../src/units.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

const cols = { walker: 0x54e0c8, walkerHi: 0xffd77a };

for (const name of UNIT_NAMES) {
  console.log(`${name} (${UNITS[name].kind}):`);
  const obj = buildUnit(name, cols);
  check('builds', obj !== null && obj.userData.kind === UNITS[name].kind);
  check('has baseScale', Number.isFinite(obj.userData.baseScale) && obj.userData.baseScale > 0);
  check('has lift', Number.isFinite(obj.userData.lift));

  // normalized: no vertex farther than ~1 from origin (post-scale)
  obj.updateMatrixWorld(true);
  let r = 0;
  const v = new THREE.Vector3();
  obj.traverse((o) => {
    const pos = o.geometry && o.geometry.getAttribute('position');
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (o.isMesh || o.isPoints) v.applyMatrix4(o.matrixWorld);
      r = Math.max(r, v.length());
    }
  });
  check('unit radius (≤1.05)', r <= 1.05, `r=${r.toFixed(3)}`);

  // idle animation runs without exploding
  if (obj.userData.tick) {
    obj.userData.tick(1.7);
    obj.userData.tick(3.4);
    check('tick runs', true);
  }
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nunit invariants hold');
