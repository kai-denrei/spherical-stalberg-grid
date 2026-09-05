// lockon.mjs — the lock and the missile as invariants.
//
// The lock is a MINI-GAME, which means its rules are the thing the player
// is actually playing against; if they drift the game changes without
// anyone deciding it should. And the guidance law has one property worth
// having — a collision course commands nothing — that is easy to break by
// "improving" it, so it is asserted directly.
import {
  LOCK_TUNE, MISSILE_TUNE, makeLock, stepLock, offsetMrad,
  guide, launchMissile, stepMissile, attackPoint, flyMissile, warheadHits,
  scaleMissile,
} from '../src/lockon.js';

let failures = 0;
const check = (what, ok) => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
};

const cand = (off, range = 700, id = 'a') => ({ id, off, range });
// run the lock for `secs` against a fixed candidate, 60 Hz
const soak = (lock, secs, c, tune = LOCK_TUNE) => {
  for (let i = 0; i < Math.round(secs * 60); i++) stepLock(lock, 1 / 60, c, tune);
  return lock;
};

console.log('the gate:');
{
  check('dead on the cross is nothing off',
    Math.abs(offsetMrad([0, 0, 1], [0, 0, 0], [0, 0, 500])) < 1e-9);
  // 5 m up at 500 m is 10 mrad
  check('ten milliradians reads as ten',
    Math.abs(offsetMrad([0, 0, 1], [0, 0, 0], [0, 5, 500]) - 10) < 0.05);
  check('it does not care about the distance, only the angle',
    Math.abs(offsetMrad([0, 0, 1], [0, 0, 0], [0, 10, 1000])
      - offsetMrad([0, 0, 1], [0, 0, 0], [0, 5, 500])) < 1e-6);
  check('behind you is far off', offsetMrad([0, 0, 1], [0, 0, 0], [0, 0, -500]) > 3000);
}

console.log('filling the lock:');
{
  const l = soak(makeLock(), LOCK_TUNE.lockTime * 0.5, cand(2));
  check('half the time is half the meter', Math.abs(l.meter - 0.5) < 0.03 && !l.locked);

  const l2 = soak(makeLock(), LOCK_TUNE.lockTime + 0.1, cand(2));
  check('the full time locks it', l2.locked && l2.id === 'a');

  const l3 = soak(makeLock(), 4, cand(LOCK_TUNE.gateMrad + 1));
  check('outside the gate it never fills', l3.meter === 0 && !l3.locked);

  const l4 = soak(makeLock(), 4, null);
  check('nothing under the cross never fills', l4.meter === 0 && !l4.locked);

  const l5 = soak(makeLock(), 4, cand(2, LOCK_TUNE.maxRange + 100));
  check('too far never fills', !l5.locked);
  const l6 = soak(makeLock(), 4, cand(2, LOCK_TUNE.minRange - 10));
  check('too close never fills', !l6.locked);
}

console.log('losing it:');
{
  // a wobble costs you, but does not reset you: the drain is slower than
  // the fill, and that ratio IS the difficulty of the mini-game
  const l = soak(makeLock(), LOCK_TUNE.lockTime * 0.8, cand(2));
  const peak = l.meter;
  soak(l, 0.2, cand(LOCK_TUNE.gateMrad + 5));
  check('a wobble drains it but does not empty it', l.meter < peak && l.meter > 0);
  check('the drain is slower than the fill', LOCK_TUNE.drain < 1 / (1 / 1) * 1.7 && LOCK_TUNE.drain < 2);

  const l2 = soak(makeLock(), LOCK_TUNE.lockTime * 0.9, cand(2));
  soak(l2, 3, null);
  check('long enough off target forgets which target it was',
    l2.meter === 0 && l2.id === null);

  // SWEEPING IS NOT LOCKING. Half a meter on one enemy and half on the next
  // must not add up to a lock on the next.
  const l3 = makeLock();
  soak(l3, LOCK_TUNE.lockTime * 0.9, cand(2, 700, 'a'));
  soak(l3, LOCK_TUNE.lockTime * 0.5, cand(2, 700, 'b'));
  check('a new target starts a new meter', !l3.locked && l3.id === 'b');
}

console.log('holding it:');
{
  const l = soak(makeLock(), LOCK_TUNE.lockTime + 0.1, cand(2));
  soak(l, 1, cand(LOCK_TUNE.gateMrad + 6));
  check('a LOCKED seeker holds outside the gate', l.locked);
  soak(l, 0.2, cand(LOCK_TUNE.breakMrad + 2));
  check('...but not past the break angle', !l.locked && l.meter === 0);

  const l2 = soak(makeLock(), LOCK_TUNE.lockTime + 0.1, cand(2));
  stepLock(l2, 1 / 60, cand(2, 700, 'b'));
  check('a locked seeker does not jump targets', !l2.locked);
}

console.log('the guidance law:');
{
  // A COLLISION COURSE COMMANDS NOTHING. The missile is closing head-on at
  // a stationary target: the line of sight does not rotate, so PN has
  // nothing to say. Break this and the law is no longer PN.
  const m = { p: [0, 10, 0], v: [0, 0, 300], t: 0 };
  const a = guide(m, [0, 10, 800], [0, 0, 0]);
  check('a collision course commands nothing', Math.hypot(a[0], a[1], a[2]) < 1e-9);

  // ...and a target crossing to the right is chased to the right
  const a2 = guide(m, [0, 10, 800], [40, 0, 0]);
  check('a target crossing right is led right', a2[0] > 1);

  const a3 = guide(m, [0, 10, 800], [-40, 0, 0]);
  check('and crossing left, left', a3[0] < -1);

  // the fins are finite
  const a4 = guide({ p: [0, 10, 0], v: [0, 0, 300], t: 0 }, [0, 10, 60], [900, 0, 0]);
  check('the command is clamped to what the fins can pull',
    Math.hypot(a4[0], a4[1], a4[2]) <= MISSILE_TUNE.accelMax + 1e-6);
}

console.log('top attack:');
{
  const tp = [0, 2, 800];
  const mid = { p: [0, 60, 400], v: [0, 0, 200], t: 2 };
  check('it aims high on the way out', attackPoint(mid, tp, 800)[1] > tp[1] + 20);
  const near = { p: [0, 40, 795], v: [0, 0, 200], t: 3 };
  check('and comes back down onto it at the end',
    attackPoint(near, tp, 800)[1] - tp[1] < 3);
  const atLaunch = { p: [0, 2, 0], v: [0, 0, 40], t: 0 };
  check('the lift starts at nothing', Math.abs(attackPoint(atLaunch, tp, 800)[1] - tp[1]) < 1e-9);
}

console.log('it arrives:');
{
  const shots = [
    ['a stationary target at 700 m', [0, 3, 700], [0, 0, 0]],
    ['one crossing at 8 m/s', [0, 3, 700], [8, 0, 0]],
    ['one closing at 12 m/s', [0, 3, 900], [0, 0, -12]],
    ['one opening at 10 m/s', [0, 3, 500], [0, 0, 10]],
    ['a near one at 200 m', [0, 3, 200], [5, 0, 0]],
    ['off to the side at 700 m', [180, 3, 700], [0, 0, 0]],
    ['a long one at 1600 m', [0, 3, 1600], [6, 0, 0]],
    ['one running away at 1200 m', [0, 3, 1200], [0, 0, 14]],
    ['one high on a wall', [40, 26, 600], [0, 0, 0]],
  ];
  for (const [what, tp, tv] of shots) {
    // launched straight down the sight line — NOT led, which is the promise:
    // the missile solves what the shooter would otherwise have to
    const dir = [tp[0], tp[1] - 2, tp[2]];
    const r = flyMissile([0, 2, 0], dir, tp, tv);
    check(`${what} (${r.miss.toFixed(2)} m)`, r.hit);
  }
  check('the warhead does not need to touch it', warheadHits(MISSILE_TUNE.kill - 0.01));
  check('...but it is not unlimited', !warheadHits(MISSILE_TUNE.kill + 0.01));
}

console.log('the same missile in a smaller world:');
{
  // THE SCALING IS THE POINT: one tune, two worlds. A trajectory flown at
  // k=1/70 and tau=1/2.5 must be the SAME SHAPE as the metre one — so its
  // miss, divided by k, is the metre miss. If this drifts, the sentry range
  // and the sniper range are quietly two different weapons.
  const k = 1 / 70, tau = 1 / 2.5;
  const small = scaleMissile(MISSILE_TUNE, k, tau);
  const big = flyMissile([0, 2, 0], [0, 1, 700], [0, 3, 700], [8, 0, 0]);
  const sm = flyMissile([0, 2 * k, 0], [0, 1, 700], [0, 3 * k, 700 * k], [8 * k / tau, 0, 0], small);
  check(`the shape survives the scaling (${(sm.miss / k).toFixed(2)} vs ${big.miss.toFixed(2)} m)`,
    Math.abs(sm.miss / k - big.miss) < 0.6);
  check('and so does the flight time', Math.abs(sm.time / tau - big.time) < 0.15);
  check('the warhead scales with the world', Math.abs(small.kill - MISSILE_TUNE.kill * k) < 1e-12);

  // ...and it arrives on a range nine units across, which is the actual job
  for (const [what, tp, tv] of [
    ['dead ahead at 8 units', [0, 0.6, 8], [0, 0, 0]],
    ['crossing at 1.6 units/s', [0, 0.6, 8], [1.6, 0, 0]],
    ['close in at 3.5 units', [2, 0.6, 2.9], [0, 0, 0]],
  ]) {
    const r = flyMissile([0, 0.4, 0], [tp[0], tp[1] - 0.4, tp[2]], tp, tv, small);
    check(`${what} (${r.miss.toFixed(3)} units)`, r.miss <= 0.55);
  }
}

console.log('determinism:');
{
  const a = flyMissile([0, 2, 0], [0, 1, 700], [0, 3, 700], [8, 0, 0]);
  const b = flyMissile([0, 2, 0], [0, 1, 700], [0, 3, 700], [8, 0, 0]);
  check('the same shot twice is the same shot', a.miss === b.miss && a.time === b.time);
}

console.log(failures ? `\n${failures} FAILURES` : '\nall lock-on invariants hold');
process.exit(failures ? 1 : 0);
