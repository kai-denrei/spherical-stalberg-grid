// governor.mjs — the sweet spot is arithmetic (fit) and hysteresis (govern).
import { SIZES, rateFromSample, fitSize, marchBudgetMs, createGovernor } from '../src/cine/governor.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

console.log('calibration -> a size, from measured numbers:');
{
  // the M4, measured 2026-09-03: 1024² at 120x12 in 38 ms -> ~40 Gfolds/s
  const m4 = rateFromSample(1024, 120, 12, 38);
  check('the M4 rate is ~40 G/s', m4 > 38e9 && m4 < 42e9, (m4 / 1e9).toFixed(1));
  // 60 fps, the march gets 40% of the frame: 6.7 ms
  const b60 = marchBudgetMs(60);
  check('60 fps march budget ~6.7 ms', Math.abs(b60 - 6.67) < 0.05);
  const s = fitSize({ rate: m4, budgetMs: b60, steps: 120, octaves: 12 });
  console.log(`       M4 @60fps -> ${s}px (${(s * s * 1440 / m4 * 1000).toFixed(1)} ms)`);
  check('...which is 384 (512 would cost 9.4 ms — over)', s === 384);
  const s30 = fitSize({ rate: m4, budgetMs: marchBudgetMs(30), steps: 120, octaves: 12 });
  check('at 30 fps the same machine affords 512', s30 === 512);
  // a phone at a tenth of the M4
  const ph = fitSize({ rate: m4 / 10, budgetMs: marchBudgetMs(30), steps: 120, octaves: 12 });
  check('a phone at a tenth of the M4, 30 fps -> the floor (256)', ph === 256);
  check('the floor is the floor: no rate is below it', fitSize({ rate: 1, budgetMs: 1, steps: 120, octaves: 12 }) === SIZES[0]);
  check('garbage in -> the floor, not NaN', fitSize({ rate: NaN, budgetMs: 10, steps: 120, octaves: 12 }) === SIZES[0]
    && rateFromSample(512, 120, 12, 0) === 0);
  check('a lighter look affords more pixels (steps 60)', fitSize({ rate: m4, budgetMs: b60, steps: 60, octaves: 12 }) === 512);
}

console.log('governing: down fast, up slow, never two steps in a gap, never up on the locked beat:');
{
  const g = createGovernor({ budgetMs: 16.7, initial: 1024 });
  let now = 0;
  const run = (ms, frames, opts) => { let last; for (let i = 0; i < frames; i++) { now += 16.7; last = g.tick(ms, now, opts); } return last; };
  run(16, 60);
  check('at budget: holds', g.size === 1024);
  run(30, 30);   // 0.5 s over
  check('over for half a second: not yet (the hold is 1 s)', g.size === 1024);
  run(30, 60);   // 1.5 s over in total
  check('over for more than a second: one step down', g.size === 768, String(g.size));
  run(30, 60);   // still over, but inside the gap
  check('still over inside the 3 s gap: no second step yet', g.size === 768);
  run(30, 200);  // well past the gap and the hold
  check('...then the next step down', g.size === 512);
  const before = g.size;
  run(5, 400);   // 6.7 s of big headroom
  check('headroom for more than 5 s: one step up', g.size === before + 256 || g.size === 768, String(g.size));
  const b2 = g.size;
  run(5, 400, { lockUp: true });
  check('headroom on the LOCKED beat: no step up', g.size === b2);
  run(60, 200, { lockUp: true });
  check('...but over budget on the locked beat still steps DOWN', g.size < b2);
  check('every step is on the record with a reason', g.steps.length >= 3 && g.steps.every((s) => s.why));
}
console.log('the floor and the ceiling hold:');
{
  const g = createGovernor({ budgetMs: 16.7, initial: 256 });
  let now = 0; for (let i = 0; i < 600; i++) { now += 16.7; g.tick(100, now); }
  check('cannot go below the smallest size', g.size === 256);
  const h = createGovernor({ budgetMs: 16.7, initial: 2048 });
  now = 0; for (let i = 0; i < 2000; i++) { now += 16.7; h.tick(1, now); }
  check('cannot go above the largest', h.size === 2048);
}

if (failures) { console.error(`governor: ${failures} FAILED`); process.exit(1); }
console.log('governor: all good');
