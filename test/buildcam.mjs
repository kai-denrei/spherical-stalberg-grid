// buildcam.mjs — the build camera's frame must stay well-conditioned
// ANYWHERE on the sphere, including directly opposite the Heart.
//
// The old build camera stored a centre point and re-derived its up-vector
// each frame as the Heart pole projected into the tangent plane at that
// centre:  up = hn - c * dot(hn, c).  That expression goes to ZERO as c
// approaches -hn, so the camera's orientation becomes undefined at the
// antipode and violently unstable near it. The only thing preventing that
// was a hard 0.9 rad ceiling on how far you could pan.
//
// Cutting the tether means the antipode is reachable, so the frame is now
// CARRIED as a quaternion and rotated incrementally instead of re-derived.
// These tests pin both halves of that claim.

import * as THREE from '../vendor/three.module.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

const hn = new THREE.Vector3(0, 1, 0);            // Heart pole
const t1 = new THREE.Vector3(1, 0, 0);            // a tangent at it

// --- the OLD derivation, reproduced so the failure is documented, not assumed
const oldUp = (c) => hn.clone().addScaledVector(c, -hn.dot(c));

console.log('the old derived up-vector (why this had to change):');
check('fine near the Heart', oldUp(new THREE.Vector3(0, 1, 0.05).normalize()).length() > 0.01);
{
  const nearAnti = new THREE.Vector3(0, -1, 0.01).normalize();
  check('COLLAPSES near the antipode', oldUp(nearAnti).length() < 0.02,
    `len ${oldUp(nearAnti).length().toFixed(5)}`);
  check('exactly zero AT the antipode',
    oldUp(new THREE.Vector3(0, -1, 0)).length() < 1e-12);
}

// --- the carried frame
const Z = new THREE.Vector3(0, 0, 1), Y = new THREE.Vector3(0, 1, 0);
function heartQuat() {
  const z = hn.clone().normalize();
  const y = t1.clone();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  y.crossVectors(z, x).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}
const frameOf = (q) => {
  const c = Z.clone().applyQuaternion(q).normalize();
  const up = Y.clone().applyQuaternion(q).normalize();
  return { c, up, right: new THREE.Vector3().crossVectors(up, c).normalize() };
};

console.log('\nthe carried frame:');
{
  const q = heartQuat();
  const f = frameOf(q);
  check('starts centred on the Heart', f.c.distanceTo(hn) < 1e-6, `c=${f.c.toArray()}`);
  check('starts orthonormal', Math.abs(f.c.dot(f.up)) < 1e-6);
}

// drag all the way around, in small steps, exactly as pointermove does
{
  const q = heartQuat();
  const tmp = new THREE.Quaternion();
  let worstOrtho = 0, worstLen = 1;
  const STEPS = 720; // two full turns' worth of small nudges
  for (let i = 0; i < STEPS; i++) {
    const f = frameOf(q);
    q.premultiply(tmp.setFromAxisAngle(f.up, -0.01));
    q.premultiply(tmp.setFromAxisAngle(f.right, -0.01));
    q.normalize();
    const g = frameOf(q);
    worstOrtho = Math.max(worstOrtho, Math.abs(g.c.dot(g.up)));
    worstLen = Math.min(worstLen, g.up.length());
  }
  check('stays orthonormal through 720 drag steps', worstOrtho < 1e-6,
    `worst |c·up| = ${worstOrtho.toExponential(2)}`);
  check('up NEVER collapses, antipode included', worstLen > 0.999,
    `shortest up = ${worstLen.toFixed(6)}`);
}

// the specific case the old code could not represent
{
  const q = heartQuat();
  const tmp = new THREE.Quaternion();
  const f0 = frameOf(q);
  q.premultiply(tmp.setFromAxisAngle(f0.right, Math.PI)); // straight to the far side
  const f = frameOf(q);
  check('can sit exactly at the antipode', f.c.distanceTo(hn.clone().negate()) < 1e-6,
    `c=${f.c.toArray().map((v) => v.toFixed(3))}`);
  check('and still has a valid up there', Math.abs(f.up.length() - 1) < 1e-6);
  check('and it is still orthogonal to the view', Math.abs(f.c.dot(f.up)) < 1e-6);
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nbuild-camera frame invariants hold');
