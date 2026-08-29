// knobs.mjs — the shared tuning-panel machinery, and both knob tables that
// are built from it. A knob table is a UI contract: if it disagrees with the
// constants it names, the panel silently stops covering something or offers
// a slider that cannot reach the shipped value.
import { makeParams, clampParams, formatKnobs, roundToStep, knobProblems } from '../src/knobs.js';
import { TANK_FEEL, TANK_FEEL_KNOBS, tankKnobProblems, formatFeelCode, makeFeelParams } from '../src/tankfeel.js';
import { TOWER_FEEL, TOWER_FEEL_KNOBS, towerKnobProblems, formatTowerFeel,
  makeTowerParams, headKindFor, HEAD_PER_TOWER } from '../src/towerfeel.js';
import { TOWER_HEAD_KINDS, towerHeadPts } from '../src/creatures.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

console.log('the shared machinery:');
{
  const KN = [
    { key: 'a', label: 'A', group: 'g', min: 0, max: 10, step: 0.5 },
    { key: 'b', label: 'B', group: 'g', choices: ['x', 'y'] },
  ];
  const D = { a: 4, b: 'x' };
  check('no problems in a sound table', knobProblems(KN, D).length === 0);
  const p = makeParams(KN, D);
  check('makeParams copies', p.a === 4 && p.b === 'x');
  p.a = 9;
  check('and is a copy', D.a === 4);

  clampParams(KN, p, { a: 999 });
  check('clamps above max', p.a === 10);
  clampParams(KN, p, { a: -5 });
  check('clamps below min', p.a === 0);
  clampParams(KN, p, { a: 'junk' });
  check('ignores non-numeric', p.a === 0);
  clampParams(KN, p, { nonesuch: 1 });
  check('ignores unknown keys', !('nonesuch' in p));

  check('rounds to step', roundToStep(0.13999999999, 0.005) === 0.14);
  check('integers stay integers', roundToStep(190.0000001, 10) === 190);

  const src = formatKnobs('X', KN, { a: 2.5, b: 'y' });
  check('emits a pasteable block', src.startsWith('export const X = {') && src.endsWith('};'));
  check('quotes a choice value', src.includes('"y"'), src);
  check('does not quote a number', /a:\s+2\.5,/.test(src), src);
}

console.log('problem detection:');
{
  const bad = [
    { key: 'a', label: 'A', group: 'g', min: 0, max: 1, step: 0.1 },
    { key: 'a', label: 'A', group: 'g', min: 0, max: 1, step: 0.1 },
    { key: 'ghost', label: 'G', group: 'g', min: 0, max: 1, step: 0.1 },
    { key: 'c', label: '', group: '', min: 0, max: 1, step: 0.1 },
  ];
  const probs = knobProblems(bad, { a: 5, c: 0.5, orphan: 1 });
  const has = (frag) => probs.some((p) => p.includes(frag));
  check('spots a duplicate key', has('duplicate key'));
  check('spots a knob naming nothing', has('ghost'), probs.join('; '));
  check('spots a default outside its range', has('outside'), probs.join('; '));
  check('spots a missing label', has('missing label'));
  check('spots a tunable with no knob', has('orphan'), probs.join('; '));
}

console.log('the shipped tables:');
{
  // The invariant that matters most: a slider whose range excludes the value
  // the game actually ships means the first drag jumps you somewhere else.
  check('tank table is sound', tankKnobProblems().length === 0, tankKnobProblems().join('; '));
  check('tower table is sound', towerKnobProblems().length === 0, towerKnobProblems().join('; '));
  check('tank block round-trips', formatFeelCode(makeFeelParams()).includes('rise:'));
  check('tower block round-trips', formatTowerFeel(makeTowerParams()).includes('headScale:'));
}

console.log('tower heads:');
{
  // Every choice the picker offers must actually build, or selecting it
  // silently hands back a sphere and the picker is lying.
  const head = TOWER_FEEL_KNOBS.find((k) => k.key === 'headShape');
  check('picker offers per-tower plus every kind',
        head.choices.length === TOWER_HEAD_KINDS.length + 1
        && head.choices[0] === HEAD_PER_TOWER);
  let allOk = true;
  for (const kind of TOWER_HEAD_KINDS) {
    const pts = towerHeadPts(kind, 190);
    const finite = pts.every((p) => [p[0], p[1], p[2]].every(Number.isFinite));
    const spread = Math.max(...pts.map((p) => Math.abs(p[0]) + Math.abs(p[1]) + Math.abs(p[2])));
    if (!pts.length || !finite || !(spread > 0.2)) { allOk = false; console.error(`    ${kind} is degenerate`); }
  }
  check('every head builds finite, non-degenerate points', allOk);

  // Density must follow the knob, or the dot-count slider does nothing for
  // the line-built shapes — which is exactly how they shipped at first.
  let follows = true;
  for (const kind of TOWER_HEAD_KINDS) {
    const lo = towerHeadPts(kind, 100).length;
    const hi = towerHeadPts(kind, 380).length;
    if (!(hi > lo * 2)) { follows = false; console.error(`    ${kind}: ${lo} -> ${hi}`); }
  }
  check('dot count scales every head', follows);

  // hiEvery drives the half-dotted read; 0 or 1 would make every dot a
  // highlight and the shape would stop reading as half-dotted at all.
  const hiCount = (n) => towerHeadPts('sphere', 240, n).filter((p) => p[3] === 1).length;
  check('a smaller spacing means more highlights', hiCount(6) > hiCount(18));
  check('a degenerate spacing is refused', hiCount(0) < 240 && hiCount(1) < 240);

  check('per-tower keeps the tower shape', headKindFor({ shape: 'gear' }, TOWER_FEEL) === 'gear');
  check('an override wins', headKindFor({ shape: 'gear' }, { headShape: 'arm' }) === 'arm');
  check('a shapeless tower falls back to sphere', headKindFor({}, TOWER_FEEL) === 'sphere');
}

console.log(failures ? `\n${failures} FAILURES` : '\nall knob invariants hold');
process.exit(failures ? 1 : 0);
