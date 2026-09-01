// isaobriefs — the script is data, so the invariants that matter are shape
// (a beat the presenter cannot paint is a crash, not a typo) and the dwell
// curve that now decides how long each line holds without a tap.
import { BRIEFS, BRIEF_IDS, brief, dwellFor, BRIEF_MIN, BRIEF_MAX, BRIEF_LEAD, BRIEF_WPS } from '../src/isaobriefs.js';

let n = 0, bad = 0;
const ok = (label, cond) => { n++; if (cond) console.log('  ok  ', label); else { bad++; console.log('  FAIL', label); } };

// --- shape: the presenter reads title/face/lines unconditionally
for (const id of BRIEF_IDS) {
  const b = BRIEFS[id];
  ok(`${id} keys its own id`, b.id === id);
  ok(`${id} has a title`, typeof b.title === 'string' && b.title.length > 0);
  ok(`${id} has a face`, typeof b.face === 'string' && b.face.length > 0);
  ok(`${id} has at least one line`, Array.isArray(b.lines) && b.lines.length > 0);
  ok(`${id} lines are all non-empty strings`,
    b.lines.every((l) => typeof l === 'string' && l.trim().length > 0));
}
ok('brief() returns null for an unknown id', brief('nope') === null);

// --- the dwell curve
ok('an empty line still holds the floor', dwellFor('') === BRIEF_MIN);
ok('a null line does not throw', dwellFor(null) === BRIEF_MIN);
ok('a short line holds the floor, not less',
  dwellFor('Empty.') === BRIEF_MIN);
ok('a very long line is capped',
  dwellFor(new Array(400).fill('word').join(' ')) === BRIEF_MAX);
ok('longer lines hold longer, in the band',
  dwellFor('one two three four five six seven eight nine ten eleven twelve')
  > dwellFor('one two three four five six seven'));
ok('the curve is the stated reading speed',
  Math.abs(dwellFor(new Array(16).fill('w').join(' ')) - (BRIEF_LEAD + 16 / BRIEF_WPS)) < 1e-9);
// NEGATIVE CONTROL: the band must actually bind, or these assertions are
// measuring a straight line and would pass for any curve at all.
ok('the floor really is below the cap', BRIEF_MIN < BRIEF_MAX);
ok('a 16-word line lands strictly inside the band — the curve is live, not clamped',
  dwellFor(new Array(16).fill('w').join(' ')) > BRIEF_MIN
  && dwellFor(new Array(16).fill('w').join(' ')) < BRIEF_MAX);

// --- every real beat is readable inside the cap without feeling clipped
for (const id of BRIEF_IDS) {
  const total = BRIEFS[id].lines.reduce((a, l) => a + dwellFor(l), 0);
  ok(`${id} plays itself out in a sane time (${total.toFixed(1)}s)`, total > 2 && total < 45);
}

console.log(bad ? `isaobriefs: ${bad} FAILED of ${n}` : `isaobriefs: all good (${n} checks)`);
process.exit(bad ? 1 : 0);
