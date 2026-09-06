// fitmodel.mjs — THE OVERSIZED MODEL, as an invariant instead of a ghost.
//
// Operator, twice: "models for tanks and containers start huge in Chrome",
// and "the oversized tank that only sometimes appears in the TD2 cinematic
// start... those hard-to-reproduce bugs seem difficult to squash for good."
//
// They are, when you hunt them by reproduction. This one was never a moment
// in time — it was a shape of code. fitModel measures an object and scales
// THAT SAME OBJECT, and loadGlb caches by URL, so two callers fitting one
// shared scene compound: the first sets 0.005, the second measures the
// result and sets 1.0, and the model is 170 units across. Intermittent
// because it needs two fits to race; browser-specific because the ordering
// differs; cured by a reset because a reload starts from a raw model.
//
// Made impossible rather than unlikely: the measurement is always taken at
// scale 1. These tests are what stop it coming back.
import * as THREE from '../vendor/three.module.js';
import { fitModel } from '../src/glbmodels.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

// a model 170 units tall and 60 wide, like an unscaled export
function rawModel(h = 170, w = 60) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w));
  m.position.set(0, h / 2, 0);
  const g = new THREE.Group();
  g.add(m);
  return g;
}
const heightOf = (g) => {
  g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g);
  return b.max.y - b.min.y;
};

console.log('one fit:');
{
  const o = rawModel();
  const g = fitModel(o, { height: 1, maxSpan: 1.6 });
  const h = heightOf(g);
  check('a 170-unit model is fitted to its height cap', h <= 1.0001 && h > 0.3, `${h}`);
  check('it reports the scale it used', g.userData.fitScale > 0 && g.userData.fitScale < 1);
}

console.log('TWO fits — the bug:');
{
  const o = rawModel();
  const g1 = fitModel(o, { height: 1, maxSpan: 1.6 });
  const h1 = heightOf(g1);
  // exactly what two callers sharing one cached scene do
  const g2 = fitModel(o, { height: 1, maxSpan: 1.6 });
  const h2 = heightOf(g2);
  check('the second fit gives the SAME size as the first', near(h1, h2, 1e-9), `${h1} then ${h2}`);
  check('...and it is not enormous', h2 <= 1.0001, `${h2} — this is the reported bug`);
  const g3 = fitModel(o, { height: 1, maxSpan: 1.6 });
  check('a third fit is still stable', near(heightOf(g3), h1, 1e-9));
}

console.log('a different target size still works after a fit:');
{
  const o = rawModel();
  fitModel(o, { height: 1, maxSpan: 1.6 });
  const g = fitModel(o, { height: 0.5, maxSpan: 1.6 });
  const h = heightOf(g);
  check('re-fitting to a smaller height is honoured, not compounded',
    h <= 0.5001 && h > 0.2, `${h}`);
}

console.log('degenerate models are refused, not exploded:');
{
  // geometry that never landed: an empty group measures an EMPTY Box3, whose
  // size components are -Infinity. Dividing a height by that is how a model
  // ends up hundreds of times too big instead of erroring.
  const empty = new THREE.Group();
  const g = fitModel(empty, { height: 1, maxSpan: 1.6 });
  check('an empty model is refused', g.userData.fitRefused === true);
  check('...and left at 1:1 rather than scaled to infinity', g.userData.fitScale === 1);
}
{
  const tiny = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(1e-6, 1e-6, 1e-6));
  tiny.add(m);
  const g = fitModel(tiny, { height: 1, maxSpan: 1.6 });
  check('a near-zero model is refused rather than blown up a million times',
    g.userData.fitRefused === true);
}

console.log(failures ? `\n${failures} FAILURES` : '\nall fitModel invariants hold');
process.exit(failures ? 1 : 0);
