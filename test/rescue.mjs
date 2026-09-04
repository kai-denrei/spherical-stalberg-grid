// rescue.mjs — the rescue mission's rules as invariants. The mode is made of
// refusals and windows — a pick-up that needs you to STOP, a grab you can
// still undo, a seat count that makes carrying two a bet — and every one of
// them is invisible from the outside until it is wrong.
import {
  RESCUE_TUNE, makeRescue, placeSurvivors, stepBoard, stepGrab, disembark,
  loseCarried, lockOn, waveMix, standing, aboard, missionOver, verdict,
  grabProgress, groundDist, rescueKnobProblems,
} from '../src/rescue.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const CELL = 0.08;
// A ring of candidate cells around the pole, at a spread of hop counts. The
// positions are real unit vectors so the spacing rule is measured the way the
// board measures it.
const cands = (n = 60) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  const r = 0.30 + 0.22 * ((i * 7) % 11) / 10;   // 0.30..0.52 rad from the pole
  return {
    ci: i,
    d: Math.round(r / CELL),                      // ~4..6.5 -> hops
    pos: [Math.sin(r) * Math.cos(a), Math.cos(r), Math.sin(r) * Math.sin(a)],
  };
});

console.log('schema:');
check('knob table is sound', rescueKnobProblems().length === 0, rescueKnobProblems().join('; '));

console.log('placement:');
{
  const st = makeRescue();
  const cs = cands();
  placeSurvivors(st, cs, mulberry32(4414), CELL);
  check('places the whole party', st.survivors.length === RESCUE_TUNE.survivors,
    `got ${st.survivors.length}`);
  check('nobody strands outside the band', st.survivors.every((s) => {
    const c = cs.find((x) => x.ci === s.ci);
    return c.d >= RESCUE_TUNE.bandMin && c.d <= RESCUE_TUNE.bandMax;
  }));
  const gap = RESCUE_TUNE.apart * CELL;
  let closest = Infinity;
  for (let i = 0; i < st.survivors.length; i++) {
    for (let j = i + 1; j < st.survivors.length; j++) {
      closest = Math.min(closest, groundDist(st.survivors[i].pos, st.survivors[j].pos));
    }
  }
  check('a field, not a huddle', closest >= gap, `closest ${(closest / CELL).toFixed(2)} cells`);
  check('nothing short on a board that fits them', st.short === 0);
  check('...at the spacing it was asked for', st.apart === RESCUE_TUNE.apart);

  // THE SPACING DEGRADES BEFORE THE PARTY DOES. A board too tight for three
  // cells apart must still strand the whole party, closer together — the
  // party size is the design, the spacing is the taste.
  const tight2 = makeRescue();
  // a ring only ~18 cells around: six evenly spaced on it are under three
  // cells apart, so the preference CANNOT be met and must give way
  const ring = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2, r = 0.23;
    return { ci: i, d: 8, pos: [Math.sin(r) * Math.cos(a), Math.cos(r), Math.sin(r) * Math.sin(a)] };
  });
  placeSurvivors(tight2, ring, mulberry32(3), CELL);
  check('a tight board still strands the whole party',
    tight2.survivors.length === RESCUE_TUNE.survivors, `got ${tight2.survivors.length}`);
  check('...by giving up spacing, and saying what it managed',
    tight2.apart < RESCUE_TUNE.apart && tight2.short === 0, `apart ${tight2.apart}`);

  // same seed, same board, same people
  const st2 = makeRescue();
  placeSurvivors(st2, cands(), mulberry32(4414), CELL);
  check('deterministic per seed',
    st2.survivors.map((s) => s.ci).join() === st.survivors.map((s) => s.ci).join());
  const st3 = makeRescue();
  placeSurvivors(st3, cands(), mulberry32(9), CELL);
  check('a different seed strands them elsewhere',
    st3.survivors.map((s) => s.ci).join() !== st.survivors.map((s) => s.ci).join());

  // A BOARD THAT CANNOT HOLD THEM SAYS SO. Silently shrinking the objective
  // is how a mission becomes impossible to lose.
  const tight = makeRescue();
  placeSurvivors(tight, cands(4), mulberry32(1), CELL);
  check('a thin board places fewer', tight.survivors.length < RESCUE_TUNE.survivors);
  check('...and reports the shortfall',
    tight.short === RESCUE_TUNE.survivors - tight.survivors.length);
  // out of the band entirely
  const far = makeRescue();
  placeSurvivors(far, cands().map((c) => ({ ...c, d: 40 })), mulberry32(1), CELL);
  check('nothing outside the band is used', far.survivors.length === 0 && far.short === RESCUE_TUNE.survivors);
}

console.log('boarding — the stop clause:');
{
  const st = makeRescue();
  placeSurvivors(st, cands(), mulberry32(4414), CELL);
  const ok = { near: true, slow: true };
  check('driving past does nothing', stepBoard(st, 0, { near: true, slow: false }, 0.5) === null);
  check('parked out of reach does nothing', stepBoard(st, 0, { near: false, slow: true }, 0.5) === null);
  check('near and slow starts the clock', stepBoard(st, 0, ok, 0.5) === 'boarding');
  // ...and it RESETS. This is the whole clause: a pick-up interrupted is a
  // pick-up not made, so the second half-second must not finish the job.
  stepBoard(st, 0, { near: true, slow: false }, 0.1);
  check('an interruption resets the clock', st.survivors[0].boardT === 0);
  check('...so half a second more is not enough', stepBoard(st, 0, ok, 0.5) === 'boarding');
  check('a full second boards', stepBoard(st, 0, ok, 0.6) === 'aboard');
  check('one aboard', aboard(st) === 1 && st.carried === 1);
  check('an aboard survivor is no longer standing', standing(st) === RESCUE_TUNE.survivors - 1);

  // seats
  for (let k = 0; k < 4; k++) stepBoard(st, 1, ok, 0.5);
  check('the second seat fills', aboard(st) === 2);
  check('the third is refused', stepBoard(st, 2, ok, 0.5) === 'full');
  check('...and the refusal does not bank time', st.survivors[2].boardT === 0);

  check('disembarking saves the pair', disembark(st) === 2);
  check('saved counted, seats free', st.saved === 2 && aboard(st) === 0 && st.carried === 0);
  check('saving again saves nobody', disembark(st) === 0);
  check('a saved survivor cannot be re-boarded', stepBoard(st, 0, ok, 2) === null);
}

console.log('the grab window:');
{
  const st = makeRescue();
  placeSurvivors(st, cands(), mulberry32(4414), CELL);
  check('contact announces once', stepGrab(st, 0, true, 0.2) === 'grabbed');
  check('...and only once', stepGrab(st, 0, true, 0.2) === null);
  check('the ring reads the window', Math.abs(grabProgress(st.survivors[0]) - 0.4 / RESCUE_TUNE.grabSecs) < 1e-9);
  check('killing the grabber frees them', stepGrab(st, 0, false, 0.2) === 'freed');
  check('...and they are standing again', st.survivors[0].state === 'standing' && st.survivors[0].grabT === 0);
  check('the clock restarts from zero', stepGrab(st, 0, true, RESCUE_TUNE.grabSecs - 0.05) === 'grabbed');
  check('...and does not run out early', st.survivors[0].state === 'standing');
  check('letting it run out loses them', stepGrab(st, 0, true, 0.1) === 'lost');
  check('counted lost', st.lost === 1 && st.survivors[0].state === 'lost');
  check('a lost survivor cannot be grabbed twice', stepGrab(st, 0, true, 9) === null);
  check('a grabbed survivor cannot be boarded', (() => {
    stepGrab(st, 1, true, 0.2);
    return stepBoard(st, 1, { near: true, slow: true }, 0.9) === null;
  })());
}

console.log('the bet:');
{
  const st = makeRescue();
  placeSurvivors(st, cands(), mulberry32(4414), CELL);
  for (let k = 0; k < 3; k++) stepBoard(st, 0, { near: true, slow: true }, 0.5);
  for (let k = 0; k < 3; k++) stepBoard(st, 1, { near: true, slow: true }, 0.5);
  check('two aboard', aboard(st) === 2);
  check('the hull takes them with it', loseCarried(st) === 2);
  check('...counted lost, not saved', st.lost === 2 && st.saved === 0 && st.carried === 0);
  check('an empty hull loses nobody', loseCarried(st) === 0);
}

console.log('lock-on:');
{
  const st = makeRescue();
  placeSurvivors(st, cands(), mulberry32(4414), CELL);
  const s = st.survivors[0];
  // a point pushed off the survivor along a tangent, by arc length
  const off = (cells) => {
    const n = s.pos;
    const t = [-n[2], 0, n[0]];
    const l = Math.hypot(...t) || 1;
    const u = [t[0] / l, t[1] / l, t[2] / l];
    const a = cells * CELL;
    return [n[0] * Math.cos(a) + u[0] * Math.sin(a),
      n[1] * Math.cos(a) + u[1] * Math.sin(a),
      n[2] * Math.cos(a) + u[2] * Math.sin(a)];
  };
  check('inside the lock radius peels off', lockOn(s, off(1.8), CELL));
  check('outside it does not', !lockOn(s, off(2.4), CELL));
  s.state = 'aboard';
  check('nothing peels off for someone in the hatch', !lockOn(s, off(0.1), CELL));
}

console.log('the mix:');
{
  for (let w = 1; w <= 12; w++) {
    const m = waveMix(w);
    if (m.soft <= m.hard * 2) { console.error(`  FAIL wave ${w} is not mostly soft`); failures++; }
  }
  check('mostly rammable at every wave', true);
  check('wave 1 has no hard core', waveMix(1).hard === 0);
  check('the hard core arrives at wave 2', waveMix(2).hard === 1);
  check('...and caps', waveMix(40).hard === 5);
  check('the soft count climbs', waveMix(6).soft > waveMix(2).soft);
}

console.log('the end:');
{
  const st = makeRescue();
  placeSurvivors(st, cands(), mulberry32(4414), CELL);
  check('not over while anyone stands', !missionOver(st));
  for (const s of st.survivors) s.state = 'lost';
  st.lost = st.survivors.length;
  check('over when nothing stands', missionOver(st));
  const v = verdict(st);
  check('the card scores out of what was PLACED', v.total === st.survivors.length);
  check('a total loss is not a clean sweep', !v.clean && v.none && v.lostIds.length === v.total);

  // ...and the drive home keeps it running
  const st2 = makeRescue();
  placeSurvivors(st2, cands(), mulberry32(4414), CELL);
  for (const s of st2.survivors) s.state = 'lost';
  st2.survivors[0].state = 'aboard';
  check('someone in the hatch keeps the mission alive', !missionOver(st2));
  disembark(st2);
  check('...and delivering them ends it', missionOver(st2));
  check('a clean sweep is the whole party', (() => {
    const st3 = makeRescue();
    placeSurvivors(st3, cands(), mulberry32(4414), CELL);
    for (const s of st3.survivors) s.state = 'saved';
    st3.saved = st3.survivors.length;
    return verdict(st3).clean;
  })());
}

console.log(failures ? `\n${failures} FAILURES` : '\nall rescue invariants hold');
process.exit(failures ? 1 : 0);
