// radar.mjs — scope math. Orientation conventions flip silently; these pin
// them: heading is up, starboard is right, the beam brightens what it just
// passed, and out-of-range contacts pin to the rim instead of vanishing.
import {
  SWEEP_PERIOD, radarBasis, radarProject, radarBearing, sweepAngle,
  radarPhosphor,
} from '../src/radar.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const approx = (a, b, e = 1e-9) => Math.abs(a - b) < e;

console.log('basis:');
{
  // scope centred on the north pole, heading along +x
  const b = radarBasis([0, 1, 0], [1, 0, 0]);
  check('fwd is the heading', approx(b.fwd[0], 1) && approx(b.fwd[1], 0));
  check('right is starboard', approx(b.right[2], 1) || approx(b.right[2], -1));
  check('basis is orthonormal',
        [b.n, b.fwd, b.right].every((v) => approx(Math.hypot(...v), 1))
        && approx(b.fwd[0] * b.right[0] + b.fwd[1] * b.right[1] + b.fwd[2] * b.right[2], 0));
  // an up hint with a normal component must be flattened, not trusted
  const b2 = radarBasis([0, 1, 0], [0.7, 0.7, 0]);
  check('up hint is projected to the tangent', approx(b2.fwd[1], 0, 1e-6));
}

console.log('projection:');
{
  const c = [0, 1, 0];
  const b = radarBasis(c, [1, 0, 0]);
  const ahead = radarProject([0.5, 1, 0], c, b, 1);
  check('ahead is screen-up', ahead.y < -0.4 && Math.abs(ahead.x) < 1e-9, JSON.stringify(ahead));
  const star = radarProject([0, 1, b.right[2] * 0.5], c, b, 1);
  check('starboard is screen-right', star.x > 0.4 && Math.abs(star.y) < 1e-9);
  check('in range is not clamped', !ahead.clamped);
  const far = radarProject([3, 1, 0], c, b, 1);
  check('beyond range pins to the rim', far.clamped && approx(Math.hypot(far.x, far.y), 1, 1e-9));
  check('the rim keeps the direction', far.y < -0.99);
}

console.log('bearing + sweep:');
{
  check('north is bearing 0', approx(radarBearing(0, -1), 0));
  check('east is +90deg', approx(radarBearing(1, 0), Math.PI / 2));
  check('sweep wraps', sweepAngle(SWEEP_PERIOD * 3) < 1e-6);
  check('quarter period is a quarter turn', approx(sweepAngle(SWEEP_PERIOD / 4), Math.PI / 2, 1e-9));
}

console.log('phosphor:');
{
  check('the beam lights what it touches', approx(radarPhosphor(1.0, 1.0), 1));
  check('just-passed is nearly full', radarPhosphor(0.9, 1.0) > 0.95);
  check('half a turn behind is dim', radarPhosphor(0, Math.PI) < 0.5);
  check('never fully dark', radarPhosphor(1.0 + 0.01, 1.0) >= 0.16,
        'a scope that blanks its contacts is not a scope');
  let prev = 2, mono = true;
  for (let a = 0.01; a < Math.PI * 2; a += 0.1) {
    const v = radarPhosphor(0, a);
    if (v > prev + 1e-9 && a < Math.PI * 2 * (1 - 0.16)) mono = false;
    prev = v;
  }
  check('decay is monotonic behind the beam', mono);
}

console.log(failures ? `\n${failures} FAILURES` : '\nall radar invariants hold');
process.exit(failures ? 1 : 0);
