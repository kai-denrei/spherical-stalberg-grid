// strike.mjs — the orbital strike's ritual, as invariants. The whole value
// of the system is in its refusals — "can't arm an empty tube", "can't
// launch without a lock" — and those are cheap to pin here and expensive to
// debug by eye, which is why this suite exists before a single pixel does.
import {
  STRIKE_TUNE, STRIKE_KNOBS, makeStrike, grantStrikes, stepStrike,
  toggleArm, paintTarget, launchStrike, stepFall, skipFall, fallProgress,
  strikeDamage, strikeKnobProblems,
} from '../src/strike.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const approx = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const run = (st, secs, dt = 0.1) => {
  let events = 0;
  for (let t = 0; t < secs; t += dt) if (stepStrike(st, dt) === 'armed') events++;
  return events;
};

console.log('schema:');
check('knob table is sound', strikeKnobProblems().length === 0, strikeKnobProblems().join('; '));

console.log('rationing:');
{
  const st = makeStrike();
  check('starts empty', st.ready === 0 && st.reserved === 0 && !st.armed);
  check('two portals grant one', grantStrikes(st, 2) === 1);
  const st2 = makeStrike();
  check('five portals grant two', grantStrikes(st2, 5) === 2);
  const st3 = makeStrike();
  check('one portal still grants the minimum', grantStrikes(st3, 1) === 1);

  // the window promotes ONE at a time, announcing each exactly once
  const st4 = makeStrike();
  grantStrikes(st4, 4);
  check('granted as reserved, not ready', st4.reserved === 2 && st4.ready === 0);
  const events = run(st4, STRIKE_TUNE.windowTime * 2 + 1);
  check('both promote over two windows', st4.ready === 2 && st4.reserved === 0);
  check('each promotion announces once', events === 2, `events=${events}`);

  // the window PAUSES at the cap — hoarded time is not banked
  const st5 = makeStrike();
  st5.reserved = 3; st5.ready = STRIKE_TUNE.maxReady;
  run(st5, STRIKE_TUNE.windowTime * 3);
  check('window pauses at the ready cap', st5.ready === STRIKE_TUNE.maxReady && st5.reserved === 3);
  check('and the gauge holds still', st5.gauge === 0);
}

console.log('the ritual:');
{
  const st = makeStrike();
  check('cannot arm an empty tube', toggleArm(st) === 'refused' && !st.armed);
  check('cannot paint unarmed', paintTarget(st, 7) === 'refused' && st.target === -1);
  check('cannot launch cold', launchStrike(st) === -1);

  st.ready = 1;
  check('arms with a missile loaded', toggleArm(st) === 'armed' && st.armed);
  check('launch still refused without a lock', launchStrike(st) === -1 && st.ready === 1);
  check('paints while armed', paintTarget(st, 7) === 'locked' && st.target === 7);
  check('repainting moves the lock', paintTarget(st, 9) === 'locked' && st.target === 9);
  check('a bad cell is refused', paintTarget(st, -1) === 'refused' && st.target === 9);

  // re-engaging the safety is a full stand-down
  toggleArm(st);
  check('disarming clears the target', !st.armed && st.target === -1);

  toggleArm(st); paintTarget(st, 5);
  const ci = launchStrike(st);
  check('launch returns the cell', ci === 5);
  check('launch spends the missile', st.ready === 0);
  check('the safety re-engages on launch', !st.armed, 'every shot earns its own ritual');
  check('the lock is consumed', st.target === -1);
  check('the strike is in the air', st.falling > 0 && st.fallCi === 5);
  check('a second launch while one falls is refused', (st.ready = 1, st.armed = true, st.target = 3, launchStrike(st)) === -1);
}

console.log('the fall:');
{
  const st = makeStrike();
  st.ready = 1; st.armed = true; st.target = 4;
  launchStrike(st);
  check('progress starts at 0', approx(fallProgress(st), 0, 1e-6));
  let landed = -1;
  for (let i = 0; i < 100 && landed < 0; i++) landed = stepFall(st, 0.05);
  check('lands on the painted cell', landed === 4);
  check('lands exactly once', stepFall(st, 0.05) === -1 && st.falling === -1);
  check('progress reads 1 after landing', fallProgress(st) === 1);

  const st2 = makeStrike();
  st2.ready = 1; st2.armed = true; st2.target = 8;
  launchStrike(st2);
  skipFall(st2);
  check('skip lands next frame', stepFall(st2, 0.016) === 8);
  check('skip on nothing is harmless', (skipFall(st2), stepFall(st2, 0.1)) === -1);
}

console.log('the blast:');
{
  const R = 2.0;
  check('full damage at ground zero', approx(strikeDamage(0, R), STRIKE_TUNE.dmgCenter));
  check('zero at the edge', strikeDamage(R, R) === 0);
  check('zero outside', strikeDamage(R * 3, R) === 0);
  let prev = Infinity, mono = true;
  for (let d = 0; d <= R; d += 0.1) {
    const v = strikeDamage(d, R);
    if (v > prev + 1e-9) mono = false;
    prev = v;
  }
  check('falloff is monotonic', mono);
  check('squared, not linear — the centre hits hard',
        strikeDamage(R * 0.5, R) < STRIKE_TUNE.dmgCenter * 0.5);
  check('a zero radius damages nothing', strikeDamage(0, 0) === 0);
}

console.log(failures ? `\n${failures} FAILURES` : '\nall strike invariants hold');
process.exit(failures ? 1 : 0);
