// beamburn.mjs — the drop-off, which is the mechanic the beam lab exists to
// let someone SEE. The assertions here are the sentences in the design:
// it pierces, it pays to, three solid cores stop it dead, fodder is nearly
// free, and what is behind armour is never reached.
import {
  burn, burnReport, penaltyFor, wallBite, sweepAdvance,
  DRAG_SOFT, DRAG_HARD, DRAG_CAP,
} from '../src/beamburn.js';
import { BEAM_STEPS } from '../src/beamranks.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const soft = (t) => ({ t, hard: false });
const hard = (t) => ({ t, hard: true });

console.log('it pierces the safe tier:');
{
  // three soft bodies in a row, well inside a 10-unit reach
  const r = burn([soft(1), soft(2), soft(3)], 10, 10);
  check('all three are burned, not just the first', r.hits.length === 3);
  check('nothing stopped it', r.stoppedBy === null);
  check('...but it paid: the beam is shorter than it started',
    r.reachLeft < 10, `${r.reachLeft.toFixed(2)}`);
}

console.log('...but it pays to:');
{
  const one = burn([soft(1)], 10, 10).reachLeft;
  const two = burn([soft(1), soft(2)], 10, 10).reachLeft;
  check('each soft body takes another bite', two < one, `${two.toFixed(2)} vs ${one.toFixed(2)}`);
  check('a hard body costs more than a soft one',
    penaltyFor(10, true) > penaltyFor(10, false));
  check('fodder is nearly free (<15% of reach)', penaltyFor(10, false) / 10 < 0.15);
}

console.log('ONE solid core stops it dead:');
{
  // The operator's ruling, 2026-09-02: a hard core blocks the beam entirely,
  // as a wall does. It used to take three, and the weapon punched through the
  // first two.
  const r = burn([hard(3), soft(5), hard(7)], 10, 10);
  check('the FIRST solid core is where it dies', r.stoppedBy && r.stoppedBy.t === 3,
    r.stoppedBy ? `stopped at ${r.stoppedBy.t}` : 'nothing stopped it');
  check('it stops AT that body, not past it', r.reachLeft === 3);
  check('the core itself is still burned — it takes the frame it stopped',
    r.hits.length === 1 && r.hits[0].t === 3);
  check('everything behind it is untouched, soft or hard',
    r.hits.every((h) => h.t <= 3));
  // ...at every rank. Reach buys RANGE and depth through fodder; it never
  // bought penetration through armour (three cores stopped every rank
  // identically) and now it visibly does not.
  let everyStep = true;
  for (const st of BEAM_STEPS) {
    const R = st.reach;
    const one = burn([hard(R * 0.3), soft(R * 0.6)], R, R);
    if (!one.stoppedBy || one.hits.length !== 1) everyStep = false;
  }
  check('one core stops it at EVERY rank step', everyStep);
  // and a beam with nothing hard in it still runs its full length
  const clear = burn([soft(1), soft(2)], 10, 10);
  check('a beam through fodder alone is not stopped', clear.stoppedBy === null);
}

console.log('what is behind armour is never reached:');
{
  // a hard body up close, then something far out that the beam cannot get to
  const r = burnReport([hard(1), soft(9)], 10, 10);
  check('the far body is not burned', r.hits.length === 1);
  check('one core was enough to shadow it', r.stoppedBy && r.stoppedBy.t === 1);
  check('...and the report names it as missed',
    r.missed.length === 1 && r.missed[0].t === 9);
  check('the beam ends short of it', r.reachLeft < 9);
}

console.log('order is the mechanic:');
{
  // the SAME bodies, handed over backwards. burn() sorts, so no caller can
  // get this wrong — which is the point of it sorting rather than trusting.
  const fwd = burn([soft(1), soft(2), hard(3)], 10, 10);
  const rev = burn([hard(3), soft(2), soft(1)], 10, 10);
  check('a shuffled list burns identically', fwd.reachLeft === rev.reachLeft
    && fwd.hits.length === rev.hits.length);
  check('the hits come back nearest-first regardless',
    rev.hits.every((h, i) => i === 0 || h.t >= rev.hits[i - 1].t));
  // ...and it must be nearest-first, not farthest: put the armour LAST and
  // everything in front of it burns, the armour last of all — and there the
  // beam ends
  const behind = burn([soft(1), soft(2), hard(5)], 10, 10);
  check('soft bodies in front of armour all burn, and so does the armour',
    behind.hits.length === 3, `${behind.hits.length} hits`);
  check('...and the armour is where it stops',
    behind.stoppedBy && behind.stoppedBy.t === 5);
}

console.log('a wall bites in the same currency:');
{
  check('a wall at the tip barely bites', wallBite(9.9, 10) < 0.02);
  check('a wall at point-blank bites hard', wallBite(0, 10) === 1);
  check('the bite is clamped, never negative', wallBite(20, 10) === 0);
  check('a degenerate reach returns 0 rather than NaN',
    wallBite(1, 0) === 0 && wallBite(-1, 10) === 0);
  const clear = burn([], 10, 10, 0);
  const scraping = burn([], 10, 10, 1);
  check('a wall drags even with nothing in the beam',
    scraping.drag > clear.drag && clear.drag === 0);
  check('the wall drags exactly like one hard body', scraping.drag === DRAG_HARD);
  // THE 2026-09-02 RULING: rock stalls the sweep flat, not in proportion to
  // how much of the beam it took. The distinguishing case is a wall out at
  // the TIP — bite ~0, which under the old proportional rule contributed
  // almost no drag at all.
  const atTip = burn([], 10, 10, wallBite(9.9, 10), true);
  check('rock at the very TIP still stalls the sweep', atTip.drag === DRAG_HARD,
    `drag ${atTip.drag}`);
  check('...and that is a change: the old proportional rule gave it almost none',
    DRAG_HARD * wallBite(9.9, 10) < 0.01);
  // and the flag is what separates "wall at the tip" from "no wall": bite is
  // 0 in both, so inferring from bite alone cannot tell them apart
  const exactlyAtReach = burn([], 10, 10, wallBite(10, 10), true);
  check('a wall exactly at the reach still counts — the flag decides, not the bite',
    exactlyAtReach.drag === DRAG_HARD && wallBite(10, 10) === 0);
  check('no wall means no wall drag', burn([], 10, 10, 0, false).drag === 0);
  check('one hard body alone already caps the sweep — "entirely slowed"',
    DRAG_HARD >= DRAG_CAP, `${DRAG_HARD} vs cap ${DRAG_CAP}`);
}

console.log('drag slows the sweep but never stalls it:');
{
  const dt = 1 / 60, burst = 2.4;
  const clear = sweepAdvance(dt, burst, 0);
  const loaded = sweepAdvance(dt, burst, DRAG_SOFT * 2);
  check('a clear beam sweeps at full rate', Math.abs(clear - dt / burst) < 1e-12);
  check('a loaded beam sweeps slower', loaded < clear);
  check('it always CREEPS — never zero, however loaded',
    sweepAdvance(dt, burst, 99) > 0, 'a frozen sweep is a stalled weapon');
  check('the cap is what stops the stall',
    Math.abs(sweepAdvance(dt, burst, 99) - (dt / burst) * (1 - DRAG_CAP)) < 1e-12);
  check('soft bodies barely slow it, hard ones bog it', DRAG_SOFT < DRAG_HARD / 4);
}

console.log('the readout says WHAT is holding the sweep:');
{
  // A stalled sweep looks exactly like a broken one — which is how the
  // operator read it — so the report has to name the cause.
  check('rock is named', burnReport([], 10, 10, 0.5, true).stalledBy === 'rock');
  check('a solid core is named',
    burnReport([hard(2)], 10, 10, 0, false).stalledBy === 'a solid core');
  check('a clear beam is not stalled at all',
    burnReport([], 10, 10, 0, false).stalledBy === null);
  check('fodder alone does not stall it',
    burnReport([soft(1), soft(2)], 10, 10, 0, false).stalledBy === null);
}

console.log('the lab readout matches the game:');
{
  // burnReport must not restate the rule — it must CALL it, or the lab and
  // the board drift the first time either is tuned
  const bodies = [soft(1), soft(3), hard(4), soft(7)];
  const a = burn(bodies, 10, 10, 0.3);
  const b = burnReport(bodies, 10, 10, 0.3);
  check('report and burn agree on where the beam ends', a.reachLeft === b.reachLeft);
  check('report and burn agree on drag', a.drag === b.drag);
  check('report and burn agree on what was hit', a.hits.length === b.hits.length);
  check('every row carries its own cost', b.rows.every((r) => r.cost > 0));
  check('rows and misses partition the input',
    b.rows.length + b.missed.length === bodies.length);
}

console.log('degenerate input does not throw:');
{
  check('an empty beam is fine', burn([], 10, 10).hits.length === 0);
  check('a zero-length beam burns nothing', burn([soft(1)], 0, 10).hits.length === 0);
  check('a body exactly at the tip is reached', burn([soft(10)], 10, 10).hits.length === 1);
  check('the input array is not mutated', (() => {
    const inp = [soft(3), soft(1)];
    burn(inp, 10, 10);
    return inp[0].t === 3;
  })(), 'burn() sorted the caller\'s own array');
}

if (failures) { console.error(`beamburn: ${failures} FAILED`); process.exit(1); }
console.log('beamburn: all good');
