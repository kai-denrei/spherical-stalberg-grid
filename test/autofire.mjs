import { wantsSecondary, shellsForAll, LASER_ARC } from '../src/autofire.js';

let pass = 0;
const check = (name, cond) => {
  if (!cond) { console.log(`  FAIL ${name}`); process.exitCode = 1; }
  else { console.log(`  ok   ${name}`); pass++; }
};

console.log('autofire:');

const near = (over) => ({ inRange: true, ahead: 1, rammable: false, ...over });

// THE SECONDARY IS FREE — every directive uses it. This is the operator's
// ruling of 2026-09-01, and the reason it does not disturb the shell rules
// below: conserve conserves the limited shells, not the unlimited secondary.
for (const d of ['wander', 'avoid', 'conserve', 'home', 'portal']) {
  check(`${d} fires the secondary at a rammable target`,
    wantsSecondary(d, [near({ rammable: true })]) === true);
  check(`${d} fires the secondary at a hard target`,
    wantsSecondary(d, [near({ rammable: false })]) === true);
}

// RAM is half an exception: no burning what you are lining up to ram, but
// the hard tier still gets answered.
check('RAM holds fire on a rammable target',
  wantsSecondary('ram', [near({ rammable: true })]) === false);
check('RAM still fires on a hard target',
  wantsSecondary('ram', [near({ rammable: false })]) === true);
check('RAM with both present fires (the hard one qualifies)',
  wantsSecondary('ram', [near({ rammable: true }), near({ rammable: false })]) === true);

// geometry gates apply in every directive
check('out of range does not fire', wantsSecondary('wander', [near({ inRange: false })]) === false);
check('behind the hull does not fire', wantsSecondary('wander', [near({ ahead: -1 })]) === false);
check('exactly on the arc edge fires',
  wantsSecondary('wander', [near({ ahead: LASER_ARC })]) === true);
check('just inside the arc edge does not',
  wantsSecondary('wander', [near({ ahead: LASER_ARC - 1e-9 })]) === false);
check('nothing in range does not fire', wantsSecondary('wander', []) === false);

// SHELLS ARE LIMITED — and this rule is deliberately UNCHANGED by the
// secondary work. Pinned so a future pass cannot quietly relax it.
check('wander spends shells freely', shellsForAll('wander') === true);
check('avoid spends shells freely', shellsForAll('avoid') === true);
check('home spends shells freely', shellsForAll('home') === true);
check('portal spends shells freely', shellsForAll('portal') === true);
check('conserve rations shells', shellsForAll('conserve') === false);
check('ram rations shells', shellsForAll('ram') === false);

console.log(`autofire: ${process.exitCode ? 'FAILURES' : 'all good'} (${pass} checks)`);
