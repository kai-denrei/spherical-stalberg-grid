// beamranks.mjs — the beam's rank ladder. The operator's four steps are
// asserted VERBATIM (colour and reach are their numbers, and a test is the
// only thing that will notice if a later tuning pass drifts them), and the
// one derived invariant that a tuning pass really could break in silence:
// penetration is a fraction of reach, so "three solid cores stop it dead"
// has to hold at every step, not just at the 2.6-cell one it was tuned on.
import {
  BEAM_STEPS, BEAM_BASE, PEN_SOFT_FRAC, PEN_HARD_FRAC,
  beamStep, isBeamStep, penaltyCells,
} from '../src/beamranks.js';
import { RANK_MAX, rankToTierLevel } from '../src/ranks.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

console.log('the operator\'s table, verbatim:');
{
  const want = [
    [1, '#666100', 4],
    [5, '#006d8f', 6],
    [10, '#d357fe', 8],
    [15, '#b51a00', 10],
  ];
  check('four steps, no more', BEAM_STEPS.length === 4, `got ${BEAM_STEPS.length}`);
  for (const [rank, color, reach] of want) {
    const s = BEAM_STEPS.find((x) => x.minRank === rank);
    check(`rank ${rank}: ${color} at ${reach} cells`,
      !!s && s.color === color && s.reach === reach,
      s ? `got ${s.color} at ${s.reach}` : 'step missing');
  }
}

console.log('resolution:');
{
  check('unranked still has a gun (rank 0 -> first step)',
    beamStep(0) === BEAM_STEPS[0]);
  check('a rank sits in the highest step it clears (4 -> step 0)',
    beamStep(4).reach === 4);
  check('the step boundary is inclusive (5 -> step 1)',
    beamStep(5).reach === 6);
  check('9 has not stepped yet', beamStep(9).reach === 6);
  check('10 steps', beamStep(10).reach === 8);
  check('14 has not stepped yet', beamStep(14).reach === 8);
  check('RANK_MAX is the last step', beamStep(RANK_MAX).reach === 10);
  check('above the ladder clamps rather than falling off',
    beamStep(RANK_MAX + 50) === BEAM_STEPS[3]);
  check('garbage in resolves rather than returning undefined',
    !!beamStep(undefined) && !!beamStep(NaN) && !!beamStep(-3));
  // a null step is a black beam in the frame loop — never allow one
  let allResolve = true;
  for (let r = -1; r <= RANK_MAX + 1; r++) {
    const s = beamStep(r);
    if (!s || !s.color || !(s.reach > 0) || !(s.dps > 0)) allResolve = false;
  }
  check('every rank -1..16 resolves to a usable step', allResolve);
}

console.log('the ladder climbs:');
{
  let mono = true;
  for (let i = 1; i < BEAM_STEPS.length; i++) {
    const a = BEAM_STEPS[i - 1], b = BEAM_STEPS[i];
    if (b.minRank <= a.minRank || b.reach <= a.reach || b.dps <= a.dps) mono = false;
  }
  check('minRank, reach and dps all strictly climb', mono);
  check('rank 1 keeps today\'s shipped dps — the opening of a run does not move',
    BEAM_STEPS[0].dps === BEAM_BASE.dps, `${BEAM_STEPS[0].dps} vs ${BEAM_BASE.dps}`);
  // 1 is entry; 5, 10 and 15 are each a TIER CEILING (bronze 5, silver 5,
  // gold 5) — the reward lands when a tier is finished, not when it is entered
  check('the steps after entry are all tier ceilings',
    BEAM_STEPS.slice(1).every((s) => rankToTierLevel(s.minRank).level === 5));
  check('the first step is entry, rank 1', BEAM_STEPS[0].minRank === 1);
}

console.log('isBeamStep asks the right question:');
{
  const stepping = [];
  for (let r = 1; r <= RANK_MAX; r++) if (isBeamStep(r)) stepping.push(r);
  check('exactly ranks 1, 5, 10, 15 rearm the beam',
    stepping.join(',') === '1,5,10,15', stepping.join(','));
  check('11 of 15 promotions are badge-only',
    RANK_MAX - stepping.length === 11);
}

console.log('penetration survives the length climb:');
{
  // The mechanic as written in td-tab: "three solid cores stop it dead",
  // "fodder is nearly free". Both are claims about FRACTIONS of the reach,
  // and they must hold at 4 cells and at 10 cells identically.
  let threeStop = true, twoSurvive = true, fodderCheap = true, sameShape = true;
  for (const s of BEAM_STEPS) {
    if (penaltyCells(s.reach, true) * 3 < s.reach) threeStop = false;
    if (penaltyCells(s.reach, true) * 2 >= s.reach) twoSurvive = false;
    if (penaltyCells(s.reach, false) > s.reach * 0.15) fodderCheap = false;
    // the ratio is the invariant, not the distance
    const ratio = penaltyCells(s.reach, true) / penaltyCells(s.reach, false);
    if (Math.abs(ratio - PEN_HARD_FRAC / PEN_SOFT_FRAC) > 1e-9) sameShape = false;
  }
  check('three solid cores stop the beam at EVERY step', threeStop);
  check('...and two do not, at every step', twoSurvive);
  check('fodder stays nearly free at every step', fodderCheap);
  check('hard:soft ratio is identical at every step', sameShape);
  check('the fractions reproduce the shipped 2.6-cell tuning',
    Math.abs(PEN_SOFT_FRAC * BEAM_BASE.reach - 0.30) < 1e-9
    && Math.abs(PEN_HARD_FRAC * BEAM_BASE.reach - 1.10) < 1e-9);
  // the regression this module exists to prevent: absolute cells would have
  // let a rank-15 beam eat three cores and keep going
  const naive = 1.10 * 3;
  check('the naive absolute-cell version WOULD have broken at rank 15',
    naive < BEAM_STEPS[3].reach, `${naive} vs ${BEAM_STEPS[3].reach}`);
}

console.log('the climb is a career, not a cheat:');
{
  const first = BEAM_STEPS[0], last = BEAM_STEPS[3];
  check('reach grows 2.5x end to end', Math.abs(last.reach / first.reach - 2.5) < 1e-9);
  check('dps grows less than reach does — length is the reward, not damage',
    last.dps / first.dps < last.reach / first.reach,
    `${(last.dps / first.dps).toFixed(2)}x dps vs ${(last.reach / first.reach).toFixed(2)}x reach`);
  check('dps stays under 2x — the beam is not a different weapon at 15',
    last.dps / first.dps < 2, `${(last.dps / first.dps).toFixed(2)}x`);
}

if (failures) { console.error(`beamranks: ${failures} FAILED`); process.exit(1); }
console.log('beamranks: all good');
