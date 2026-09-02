// portalfx.mjs — the travel ramp and the phase integrator.
//
// The ramp is the operator's sentence turned into a function ("0 by default,
// 5 seconds before a new arrival it increases to max 6"), so the assertions
// are that sentence read back. The integrator is here because it is the fix
// for a shipped bug: a rate that multiplied ACCUMULATED time rewrote history
// every time it moved, and these checks pin the property that broke.
import {
  WORMHOLE_PRESET, WORMHOLE_RENDER, RING_SPIN, TRAVEL,
  travelRate, advancePhase,
} from '../src/portalfx.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

console.log('the ramp says what the operator said:');
{
  check('idle at rest, far from a wave', travelRate(30) === TRAVEL.idle);
  check('still idle at exactly the lead', travelRate(TRAVEL.lead) === TRAVEL.idle);
  check('max at arrival', travelRate(0) === TRAVEL.max);
  check('max=6, lead=5, idle=0 — the operator\'s numbers',
    TRAVEL.max === 6 && TRAVEL.lead === 5 && TRAVEL.idle === 0);
  check('never exceeds max, even past arrival', travelRate(-3) === TRAVEL.max);
  check('garbage in returns idle rather than NaN',
    travelRate(NaN) === TRAVEL.idle && travelRate(undefined) === TRAVEL.idle);
}

console.log('...and it climbs smoothly, without announcing itself:');
{
  let mono = true, inRange = true;
  let prev = travelRate(TRAVEL.lead);
  for (let s = TRAVEL.lead; s >= 0; s -= 0.05) {
    const v = travelRate(s);
    if (v < prev - 1e-12) mono = false;          // never goes backwards
    if (v < TRAVEL.idle || v > TRAVEL.max) inRange = false;
    prev = v;
  }
  check('monotonic from lead to arrival', mono);
  check('always between idle and max', inRange);
  // the whole reason for the ease: a LINEAR ramp leaves a visible kink at the
  // 5-second mark, which announces the mechanic instead of the wave
  const eps = 0.02;
  const justInside = travelRate(TRAVEL.lead - eps);
  check('it leaves idle gently, not with a step',
    justInside < TRAVEL.max * 0.01,
    `${justInside.toFixed(4)} just inside the window`);
  check('...and arrives hard', travelRate(eps) > TRAVEL.max * 0.99);
  check('halfway through the window it is halfway up',
    Math.abs(travelRate(TRAVEL.lead / 2) - TRAVEL.max / 2) < 1e-9);
}

console.log('the phase integrates, so a rate is a rate:');
{
  // THE BUG THIS REPLACES: travel was `elapsed * rate` in the shader, so
  // changing the rate moved the whole history. Integrated, a rate change only
  // affects what comes after it — which is what makes a ramp possible at all.
  const dt = 1 / 60;
  const runAt = (rate, n) => {
    const p = { travel: 0, spin: 0 };
    for (let i = 0; i < n; i++) advancePhase(p, dt, rate, 1, 0);
    return p.travel;
  };
  check('no rate, no travel', runAt(0, 600) === 0);
  check('twice the rate, twice the distance',
    Math.abs(runAt(2, 600) - 2 * runAt(1, 600)) < 1e-9);
  // the property the old version broke: history is not rewritten
  const p = { travel: 0, spin: 0 };
  for (let i = 0; i < 300; i++) advancePhase(p, dt, 0, 1, 0);   // 5s idle
  const afterIdle = p.travel;
  for (let i = 0; i < 300; i++) advancePhase(p, dt, 6, 1, 0);   // then 5s fast
  check('idling first costs nothing, however long you idle', afterIdle === 0);
  check('the fast stretch adds only its own distance',
    Math.abs(p.travel - 6 * 5) < 1e-6, `${p.travel.toFixed(4)}`);
  check('timeScale scales the distance travelled per second',
    Math.abs(advancePhase({ travel: 0, spin: 0 }, 1, 1, 2, 0).travel - 2) < 1e-12);
  check('spin integrates on its own clock',
    advancePhase({ travel: 0, spin: 0 }, 1, 0, 1, 0.15).spin === 0.15);
}

console.log('the tuned preset is the operator\'s, verbatim:');
{
  const want = {
    uSteps: 120, uTurbOctaves: 12, uThroatRadius: 1.98, uExposure: 150,
    uTurbAmp: 1.02, uTimeScale: 1.69, uTwist: 0, uHueSpread: 0.89,
  };
  let all = true;
  for (const [k, v] of Object.entries(want)) if (WORMHOLE_PRESET[k] !== v) all = false;
  check('every uniform matches the bench export', all,
    JSON.stringify(WORMHOLE_PRESET));
  // Cost knobs, deliberately NOT the bench's 512 @ 60: the look is the
  // preset above and is verbatim; these are what the board pays for it.
  check('render settings are the board\'s cost decision, 384 @ 30Hz',
    WORMHOLE_RENDER.size === 384 && WORMHOLE_RENDER.updateHz === 30);
  check('...and the LOOK is untouched by that decision',
    WORMHOLE_PRESET.uSteps === 120 && WORMHOLE_PRESET.uTurbOctaves === 12);
  check('ring spin carried across too',
    RING_SPIN.rotorA === 0.77 && RING_SPIN.rotorB === -0.09 && RING_SPIN.yaw === 0);
  // a number worth having in front of anyone who changes these
  const folds = WORMHOLE_RENDER.size ** 2 * WORMHOLE_PRESET.uSteps
    * WORMHOLE_PRESET.uTurbOctaves;
  console.log(`       (cost: ${(folds / 1e6).toFixed(0)}M sine-folds per rendered frame)`);
  check('the cost is knowable and non-zero', folds > 0);
}

if (failures) { console.error(`portalfx: ${failures} FAILED`); process.exit(1); }
console.log('portalfx: all good');
