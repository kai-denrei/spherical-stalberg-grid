// knobs.mjs — the shared tuning-panel machinery, and both knob tables that
// are built from it. A knob table is a UI contract: if it disagrees with the
// constants it names, the panel silently stops covering something or offers
// a slider that cannot reach the shipped value.
import { makeParams, clampParams, formatKnobs, roundToStep, knobProblems } from '../src/knobs.js';
import { TANK_FEEL, TANK_FEEL_KNOBS, tankKnobProblems, formatFeelCode, makeFeelParams } from '../src/tankfeel.js';
import { TOWER_FEEL, TOWER_FEEL_KNOBS, towerKnobProblems, formatTowerFeel,
  makeTowerParams, headKindFor, cleanHeads, formatTowerHeads,
  HEAD_CHOICES, HEAD_AS_SHIPPED } from '../src/towerfeel.js';
import { TOWERS } from '../src/towers.js';
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

console.log('bool knobs:');
{
  const KN = [{ key: 'walls', label: 'walls', group: 'g', bool: true }];
  const D = { walls: true };
  check('bool table is sound', knobProblems(KN, D).length === 0, knobProblems(KN, D).join('; '));
  check('a non-boolean default is flagged',
        knobProblems(KN, { walls: 1 }).some((m) => m.includes('non-boolean')));
  const p = makeParams(KN, D);
  clampParams(KN, p, { walls: false });
  check('restores a boolean', p.walls === false);
  clampParams(KN, p, { walls: '1' });
  check("accepts '1' as true", p.walls === true);
  clampParams(KN, p, { walls: 'junk' });
  check('ignores junk', p.walls === true);
  check('formats as bare true/false', formatKnobs('B', KN, { walls: false }).includes('false'));
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
  check('picker offers as-shipped plus every kind',
        HEAD_CHOICES.length === TOWER_HEAD_KINDS.length + 1
        && HEAD_CHOICES[0] === HEAD_AS_SHIPPED);
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

  // Head assignment is BY TOWER KEY. The global override this replaced could
  // only ask "does this shape work at all", and because it persisted it also
  // masked every tower's own head once set — including freshly assigned ones.
  const def = { key: 'aoe', shape: 'gear' };
  check('no assignment keeps the shipped shape', headKindFor(def, {}) === 'gear');
  check('an assignment wins', headKindFor(def, { aoe: 'arm' }) === 'arm');
  check('another tower is unaffected', headKindFor(def, { single: 'arm' }) === 'gear');
  check('as-shipped is not an override', headKindFor(def, { aoe: HEAD_AS_SHIPPED }) === 'gear');
  check('an unknown shape is refused', headKindFor(def, { aoe: 'nonesuch' }) === 'gear');
  check('a shapeless tower falls back to sphere', headKindFor({ key: 'x' }, {}) === 'sphere');

  // derived, not hardcoded: this assertion is about the RULE, and writing a
  // literal shape here made it fail the moment a tower was reassigned
  const asShipped = TOWERS.find((t) => t.key === 'single').shape;
  // pick a head that is NOT what this tower ships with, for the same reason
  const other = TOWER_HEAD_KINDS.find((k) => k !== TOWERS.find((t) => t.key === 'aoe').shape);
  const kept = cleanHeads({ aoe: other, single: asShipped, slow: 'nonesuch', ghost: 'arm' }, TOWERS);
  check('cleanHeads keeps a real override', kept.aoe === other);
  check('drops one equal to the shipped shape', !('single' in kept));
  check('drops an unknown shape', !('slow' in kept));
  check('drops an unknown tower', !('ghost' in kept));

  const src = formatTowerHeads({ aoe: other }, TOWERS);
  check('emits every tower, not just overrides',
        TOWERS.every((t) => src.includes(t.key + ':')));
  check('marks the one that changed',
        src.includes('<- changed') && src.split('<- changed').length === 2, src);
  check('and marks nothing when nothing changed',
        !formatTowerHeads({}, TOWERS).includes('<- changed'));
  const raw = { aoe: 'arm' };
  cleanHeads(raw, TOWERS);
  check('cleanHeads does not mutate its input', Object.keys(raw).length === 1);
}

console.log(failures ? `\n${failures} FAILURES` : '\nall knob invariants hold');
process.exit(failures ? 1 : 0);
