// sentryfx.mjs — THE GUARD ON THE SPLIT. towers.js keeps what a weapon does;
// sentryfx.js keeps how it looks. The migration moved five fields, and the
// failure mode is not a crash — it is somebody adding a tower next month by
// copying an old one, bringing `projPx` back onto the def, and two copies of
// one number quietly drifting from then on. That is the exact failure this
// codebase has already recorded, so it is a test rather than a comment.
import { ROSTERS } from '../src/towers.js';
import {
  SENTRY_FX, DEFAULT_FX, MOVED_FIELDS, fxFor, shotOf, muzzleOf, impactOf,
  tuneFor, formatSentryFx, formatAllSentryFx,
} from '../src/sentryfx.js';
import { IMPACT_FAMILIES, IMPACT_RECIPES, IMPACT_TUNE } from '../src/impactfx.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

const allTowers = [...ROSTERS[1].towers, ...ROSTERS[2].towers];

console.log('the split holds:');
for (const f of MOVED_FIELDS) {
  const offenders = allTowers.filter((d) => d[f] !== undefined).map((d) => d.key);
  check(`no tower def carries "${f}" any more`, offenders.length === 0,
    `still on: ${offenders.join(', ')} — it moved to sentryfx.js, do not re-add it`);
}
check('towers.js keeps `color` — that is identity, not an effect',
  allTowers.every((d) => typeof d.color === 'number'));

console.log('every tower resolves a profile:');
for (const d of allTowers) {
  const fx = fxFor(d);
  check(`${d.key} has one`, !!fx);
  check(`${d.key} is not silently falling back`, fx !== DEFAULT_FX,
    'no SENTRY_FX entry — it will draw a generic shot');
}
check('an unknown tower still resolves', fxFor({ key: 'nope' }) === DEFAULT_FX);
check('a missing def does not throw', fxFor(null) === DEFAULT_FX);

console.log('the profiles are well formed:');
for (const [key, p] of Object.entries(SENTRY_FX)) {
  check(`${key} has shot, muzzle and impact`, !!(p.shot && p.muzzle && p.impact));
  for (const slot of ['muzzle', 'impact']) {
    const fx = p[slot];
    const names = Array.isArray(fx.recipe) ? fx.recipe : (IMPACT_RECIPES[fx.recipe] || null);
    check(`${key}.${slot} names a real recipe or family list`, names !== null,
      `"${fx.recipe}" is neither a recipe nor a list`);
    if (names) {
      check(`${key}.${slot} names only families that exist`,
        names.every((n) => IMPACT_FAMILIES.includes(n)),
        names.filter((n) => !IMPACT_FAMILIES.includes(n)).join(','));
    }
    check(`${key}.${slot} size is a sane number`,
      Number.isFinite(fx.size) && fx.size >= 0 && fx.size <= 6, `${fx.size}`);
    for (const k of Object.keys(fx.tune || {})) {
      check(`${key}.${slot} tune key "${k}" is a real IMPACT_TUNE knob`, k in IMPACT_TUNE);
    }
    for (const k of Object.keys(fx.colors || {})) {
      check(`${key}.${slot} colour key "${k}" is a real family`, IMPACT_FAMILIES.includes(k));
    }
  }
}

console.log('a weapon that throws nothing draws nothing:');
for (const key of ['slow', 'relay']) {
  const p = SENTRY_FX[key];
  const names = Array.isArray(p.impact.recipe) ? p.impact.recipe : IMPACT_RECIPES[p.impact.recipe];
  check(`${key} has no impact — a field weapon never lands anywhere`, names.length === 0);
}

console.log('tune folding:');
{
  const folded = tuneFor(SENTRY_FX.howitzer.impact);
  check('a delta wins over the base', folded.ringEnd === SENTRY_FX.howitzer.impact.tune.ringEnd);
  check('everything else is the base', folded.sparkLife === IMPACT_TUNE.sparkLife);
  check('the base is not mutated', IMPACT_TUNE.ringEnd !== folded.ringEnd);
  check('no profile is required to have a tune', Object.keys(tuneFor(SENTRY_FX.relay.impact)).length > 0);
}

console.log('the export round-trips:');
{
  // the whole promise of the lab is "tune it, paste it, it is the default".
  // If the emitted source does not parse back to the same profile, that
  // promise is broken silently — the operator pastes and the values move.
  const src = formatSentryFx('lancer', SENTRY_FX.lancer);
  check('emits a single object entry', src.trim().startsWith('lancer: {') && src.trim().endsWith('},'));
  check('keeps beamColor as hex', src.includes('beamColor: 0x4dff86'), src);
  check('names the recipe', src.includes("'laser'"), src);
  const all = formatAllSentryFx();
  check('the whole table emits one line per family',
    all.split('\n').filter((l) => /^  \w+: \{ shot:/.test(l)).length === Object.keys(SENTRY_FX).length);
}

console.log(failures ? `\n${failures} FAILURES` : '\nall sentry-fx invariants hold');
process.exit(failures ? 1 : 0);
