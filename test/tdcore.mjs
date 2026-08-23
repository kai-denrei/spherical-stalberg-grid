// tdcore.mjs — invariants for the TD M0 extraction: enemyspec (shared
// roster data), towers (configs + upgrade + targeting math), economy
// (credits/streak math). All pure modules; no DOM, no three.js.

import { CREATURE_TINTS, ENEMY_SPEC, INTROS } from '../src/enemyspec.js';
import { TOWERS, TOWER_BY_KEY, MAX_TIER, upgradeCost, effectiveStats, pickTarget, shotInterval } from '../src/towers.js';
import { makeEconomy, sellRefund, waveClearBonus, earlyCallBonus, START_CREDIT, RAM_PREMIUM } from '../src/economy.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

// --- enemyspec -----------------------------------------------------------
console.log('enemyspec:');
check('12 types in spec', Object.keys(ENEMY_SPEC).length === 12);
check('12 intros', INTROS.length === 12);
check('intro waves are 1..12 in order',
  INTROS.every((iv, i) => iv.wave === i + 1));
check('every intro type has spec and tint',
  INTROS.every((iv) => ENEMY_SPEC[iv.type] && CREATURE_TINTS[iv.type] !== undefined));
check('every spec type appears in intros',
  Object.keys(ENEMY_SPEC).every((k) => INTROS.some((iv) => iv.type === k)));
check('boss is not rammable',
  Object.values(ENEMY_SPEC).every((s) => !(s.boss && s.rammable)));
check('bounties positive everywhere',
  Object.values(ENEMY_SPEC).every((s) => s.bounty > 0));
check('hp and speed sane',
  Object.values(ENEMY_SPEC).every((s) => s.hp >= 1 && s.speed > 0 && s.size > 0));

// --- towers --------------------------------------------------------------
console.log('towers:');
check('8 towers', TOWERS.length === 8);
check('keys unique + lookup', new Set(TOWERS.map((t) => t.key)).size === 8
  && TOWER_BY_KEY.sniper.cost === 130);
check('laser is the capstone cost', Math.max(...TOWERS.map((t) => t.cost)) === TOWER_BY_KEY.laser.cost);
check('upgrade costs HK-exact (70%/120%, then maxed)',
  upgradeCost(TOWER_BY_KEY.single, 0) === 28
  && upgradeCost(TOWER_BY_KEY.single, 1) === 48
  && upgradeCost(TOWER_BY_KEY.single, MAX_TIER) === null);
{
  const t0 = effectiveStats(TOWER_BY_KEY.single, 0);
  const t1 = effectiveStats(TOWER_BY_KEY.single, 1);
  check('tier growth: +55% dmg, +8% range, +10% rate',
    Math.abs(t1.dmg / t0.dmg - 1.55) < 1e-9
    && Math.abs(t1.range / t0.range - 1.08) < 1e-9
    && Math.abs(t1.rate / t0.rate - 1.10) < 1e-9);
}
{
  const spread2 = effectiveStats(TOWER_BY_KEY.spread, 2);
  const aoe2 = effectiveStats(TOWER_BY_KEY.aoe, 2);
  const beam2 = effectiveStats(TOWER_BY_KEY.laser, 2);
  const single2 = effectiveStats(TOWER_BY_KEY.single, 2);
  check('tier-2 specials: +2 pellets / +40% splash / +30% range / +20% rate',
    spread2.pellets === 7
    && Math.abs(aoe2.splash / (TOWER_BY_KEY.aoe.splash * (1))) > 1.39
    && Math.abs(beam2.range / (TOWER_BY_KEY.laser.range * 1.16) - 1.3) < 1e-9
    && Math.abs(single2.rate / (TOWER_BY_KEY.single.rate * 1.2) - 1.2) < 1e-9);
}
{
  // targeting: nearest alive in range, injected metric
  const dist = (a, b) => Math.abs(a - b); // 1-D world for the test
  const enemies = [
    { alive: true, pos: 9 },
    { alive: true, pos: 3 },
    { alive: false, pos: 1 },  // dead and nearest — must be skipped
    { alive: true, pos: 20 },  // out of range
  ];
  const hit = pickTarget(0, 10, enemies, dist);
  check('targeting picks nearest ALIVE within range', hit && hit.pos === 3);
  check('targeting null when field empty',
    pickTarget(0, 10, [{ alive: true, pos: 99 }], dist) === null);
  check('shot interval = 1/rate', Math.abs(shotInterval(2) - 0.5) < 1e-12);
}

// --- economy -------------------------------------------------------------
console.log('economy:');
{
  const eco = makeEconomy();
  check('starts at START_CREDIT', eco.credit === START_CREDIT);
  const first = eco.award(10); // streak 1 → ×1.05
  check('first kill pays bounty × 1.05', first === Math.round(10 * 1.05));
  eco.leak();
  check('leak resets the streak', eco.streak === 0 && eco.multiplier() === 1);
  for (let i = 0; i < 200; i++) eco.award(1);
  check('multiplier caps at ×5', eco.multiplier() === 5);
  const ramPay = makeEconomy().award(10, { ram: true });
  check('ram premium ×1.5', ramPay === Math.round(10 * RAM_PREMIUM * 1.05));
  const eco2 = makeEconomy({ startCredit: 50 });
  check('spend guards affordability',
    eco2.spend(60) === false && eco2.spend(50) === true && eco2.credit === 0);
  check('sell refund = 75% of spent', sellRefund(100) === 75);
  check('wave-clear bonus grows', waveClearBonus(5) === 40 && waveClearBonus(1) === 24);
  check('early-call bonus caps', earlyCallBonus(120) === 40 && earlyCallBonus(12) === 12);
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\ntd-core invariants hold');
