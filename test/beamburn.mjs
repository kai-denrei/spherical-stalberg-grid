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

console.log('it pierces:');
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
  const one = burn([hard(1)], 10, 10).reachLeft;
  const two = burn([hard(1), hard(2)], 10, 10).reachLeft;
  check('each body takes another bite', two < one, `${two.toFixed(2)} vs ${one.toFixed(2)}`);
  check('a hard body costs more than a soft one',
    penaltyFor(10, true) > penaltyFor(10, false));
  check('fodder is nearly free (<15% of reach)', penaltyFor(10, false) / 10 < 0.15);
}

console.log('three solid cores stop it dead:');
{
  // CLUSTERED AT THE MUZZLE, deliberately. The budget claim (3 x PEN_HARD
  // exceeds the whole reach) is beamranks' to assert; what burn() decides is
  // WHERE the beam dies, and that depends on position as well as cost — a
  // body only stops the beam if it sits beyond the reach that is left when
  // the beam gets to it. Bunched at the muzzle isolates the cost from the
  // spacing, which is the thing under test here.
  const three = burn([hard(0.1), hard(0.2), hard(0.3)], 10, 10);
  check('the third is where it dies', !!three.stoppedBy, 'nothing stopped it');
  check('it stops IN a body, not past one', three.reachLeft === three.stoppedBy.t);
  const two = burn([hard(0.1), hard(0.2)], 10, 10);
  check('two do NOT stop it', two.stoppedBy === null,
    `stopped at ${two.reachLeft}`);
  // and at every rank, because penetration is a fraction of reach
  let everyStep = true;
  for (const st of BEAM_STEPS) {
    const R = st.reach;
    const t3 = burn([hard(R * 0.01), hard(R * 0.02), hard(R * 0.03)], R, R);
    const t2 = burn([hard(R * 0.01), hard(R * 0.02)], R, R);
    if (!t3.stoppedBy || t2.stoppedBy) everyStep = false;
  }
  check('three stop it and two do not at EVERY rank step', everyStep);
  // SPACING MATTERS TOO, and that is not a bug: two hard bodies far enough
  // out DO end the beam, because the second sits past what is left.
  check('two hard bodies far out still stop it — position counts, not just cost',
    !!burn([hard(1), hard(2)], 10, 10).stoppedBy);
}

console.log('what is behind armour is never reached:');
{
  // a hard body up close, then something far out that the beam cannot get to
  const r = burnReport([hard(1), soft(9)], 10, 10);
  check('the far body is not burned', r.hits.length === 1);
  check('...and the report names it as missed',
    r.missed.length === 1 && r.missed[0].t === 9);
  check('the beam ends short of it', r.reachLeft < 9);
}

console.log('order is the mechanic:');
{
  // the SAME bodies, handed over backwards. burn() sorts, so no caller can
  // get this wrong — which is the point of it sorting rather than trusting.
  const fwd = burn([hard(1), soft(2), soft(3)], 10, 10);
  const rev = burn([soft(3), soft(2), hard(1)], 10, 10);
  check('a shuffled list burns identically', fwd.reachLeft === rev.reachLeft
    && fwd.hits.length === rev.hits.length);
  check('the hits come back nearest-first regardless',
    rev.hits.every((h, i) => i === 0 || h.t >= rev.hits[i - 1].t));
  // ...and it must be nearest-first, not farthest: put the armour LAST, still
  // inside the reach the two softs leave behind, and all three burn
  const behind = burn([soft(1), soft(2), hard(5)], 10, 10);
  check('soft bodies in front of armour all burn, and so does the armour',
    behind.hits.length === 3, `${behind.hits.length} hits`);
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
}

console.log('drag slows the sweep but never stalls it:');
{
  const dt = 1 / 60, burst = 2.4;
  const clear = sweepAdvance(dt, burst, 0);
  const loaded = sweepAdvance(dt, burst, 3 * DRAG_HARD);
  check('a clear beam sweeps at full rate', Math.abs(clear - dt / burst) < 1e-12);
  check('a loaded beam sweeps slower', loaded < clear);
  check('it always CREEPS — never zero, however loaded',
    sweepAdvance(dt, burst, 99) > 0, 'a frozen sweep is a stalled weapon');
  check('the cap is what stops the stall',
    Math.abs(sweepAdvance(dt, burst, 99) - (dt / burst) * (1 - DRAG_CAP)) < 1e-12);
  check('soft bodies barely slow it, hard ones bog it', DRAG_SOFT < DRAG_HARD / 4);
}

console.log('the lab readout matches the game:');
{
  // burnReport must not restate the rule — it must CALL it, or the lab and
  // the board drift the first time either is tuned
  const bodies = [soft(1), hard(2), soft(3), hard(7)];
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
