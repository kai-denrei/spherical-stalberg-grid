// arc.mjs — great-circle helpers. The interesting assertions are the ones
// that pin the BUG this module was written to remove: a chord and a
// normalised chord both drift from the real arc, and the drift is what made
// a long beam draw into space and hit nothing at its far end.
import { arcPoint, arcTangent, projectToArc, chordSag, arcSegments } from '../src/arc.js';
import { BEAM_STEPS } from '../src/beamranks.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const len = (v) => Math.hypot(v[0], v[1], v[2]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// a from/dir pair that is not axis-aligned, so a sign error cannot hide
const FROM = (() => { const v = [0.3, 0.9, -0.32]; const L = len(v); return v.map((x) => x / L); })();
const DIR = (() => {
  const raw = [1, 0.2, 0.5];
  const d = dot(raw, FROM);
  const t = raw.map((x, i) => x - d * FROM[i]);
  const L = len(t);
  return t.map((x) => x / L);
})();

console.log('the arc stays on the sphere:');
{
  let onSphere = true, perp = true;
  for (let s = 0; s <= 1.6; s += 0.05) {
    if (Math.abs(len(arcPoint(FROM, DIR, s)) - 1) > 1e-12) onSphere = false;
    const t = arcTangent(FROM, DIR, s);
    if (Math.abs(len(t) - 1) > 1e-12) perp = false;
    if (Math.abs(dot(t, arcPoint(FROM, DIR, s))) > 1e-12) perp = false;
  }
  check('every point is EXACTLY unit length, no normalise needed', onSphere);
  check('the tangent is unit and perpendicular to the point', perp);
  check('s=0 is the muzzle', dist(arcPoint(FROM, DIR, 0), FROM) < 1e-12);
  check('the tangent at 0 is the aim direction', dist(arcTangent(FROM, DIR, 0), DIR) < 1e-12);
  // arc length really is arc length: walking in two hops equals one hop
  // start the second hop AT the first hop's point, with the tangent there —
  // starting it back at FROM is what a hasty version of this test does, and
  // it fails against a perfectly correct module
  const two = arcPoint(arcPoint(FROM, DIR, 0.4), arcTangent(FROM, DIR, 0.4), 0.3);
  check('arc length composes (0.4 then 0.3 == 0.7)',
    dist(two, arcPoint(FROM, DIR, 0.7)) < 1e-12);
}

console.log('projectToArc inverts it:');
{
  let round = true;
  for (let s = 0.05; s <= 1.5; s += 0.05) {
    const r = projectToArc(FROM, DIR, arcPoint(FROM, DIR, s));
    if (Math.abs(r.s - s) > 1e-12 || r.off > 1e-12) round = false;
  }
  check('a point ON the arc projects back to its own s, off=0', round);
  // behind the muzzle must come back NEGATIVE, not folded positive: an
  // absolute value here is a beam that fires out of the back of the tank
  const behind = projectToArc(FROM, DIR, arcPoint(FROM, DIR, -0.3));
  check('a point behind the muzzle reports NEGATIVE s', behind.s < 0,
    `got ${behind.s.toFixed(4)}`);
  // altitude counts as being out of the beam
  const above = arcPoint(FROM, DIR, 0.5).map((x) => x * 1.05);
  const r2 = projectToArc(FROM, DIR, above);
  check('something hovering above the arc is OFF it', Math.abs(r2.off - 0.05) < 1e-9,
    `off=${r2.off.toFixed(5)}`);
  check('...but still at the right s', Math.abs(r2.s - 0.5) < 1e-12);
}

console.log('the bug this replaces, measured:');
{
  // cellSide 0.08 on a unit sphere — the board's own numbers
  const CS = 0.08;
  const rows = [];
  for (const step of BEAM_STEPS) {
    const s = step.reach * CS;                     // true arc length
    const chordTip = Math.sqrt(1 + s * s);         // |from + dir*s|
    const floatCells = (chordTip - 1) / CS;        // how far the old draw flew
    const normalisedReach = Math.atan(s);          // where the wall walk landed
    const shortBy = (s - normalisedReach) / CS;    // in cells
    rows.push({ reach: step.reach, floatCells, shortBy });
  }
  const worst = rows[rows.length - 1];
  check('the old chord floated >3 cells off the ground at rank 15',
    worst.floatCells > 3, `${worst.floatCells.toFixed(2)} cells`);
  check('the old chord was invisible at the ORIGINAL 2.6-cell reach',
    (Math.sqrt(1 + (2.6 * CS) ** 2) - 1) / CS < 0.3,
    'which is why nothing caught it until the beam got long');
  check('the normalised wall walk under-reached by >1 cell at rank 15',
    worst.shortBy > 1, `${worst.shortBy.toFixed(2)} cells short`);
  // the one that actually cost damage: a body on the ground at the far end
  // sat further from the chord than any hit radius on the board
  const s8 = 8 * CS;
  const gap = Math.sqrt(1 + s8 * s8) - 1;          // chord tip to surface
  const biggestHitRadius = CS * 1.6;               // a generous size-2 enemy
  check('a body 8 cells out was beyond ANY hit radius on the old chord',
    gap > biggestHitRadius,
    `gap ${gap.toFixed(3)} vs radius ${biggestHitRadius.toFixed(3)}`);
}

console.log('segmenting for the renderer:');
{
  check('a flat-enough arc needs one segment', arcSegments(0.05, 0.001) === 1);
  let holds = true;
  for (const step of BEAM_STEPS) {
    const s = step.reach * 0.08;
    const tol = 0.1 * 0.08;                        // a tenth of a cell
    const n = arcSegments(s, tol);
    if (chordSag(s / n) > tol) holds = false;      // the solve must actually solve it
  }
  check('the segment count really holds sag under a tenth of a cell', holds);
  check('and it is capped, so a beam never costs 20 draw calls',
    arcSegments(100, 1e-9) === 12);
  check('degenerate input returns 1 rather than NaN or Infinity',
    arcSegments(0, 0.1) === 1 && arcSegments(1, 0) === 1 && arcSegments(NaN, 0.1) === 1);
  check('chordSag is zero at zero and grows', chordSag(0) === 0 && chordSag(0.8) > chordSag(0.4));
}

if (failures) { console.error(`arc: ${failures} FAILED`); process.exit(1); }
console.log('arc: all good');
