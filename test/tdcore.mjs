// tdcore.mjs — invariants for the TD M0 extraction: enemyspec (shared
// roster data), towers (configs + upgrade + targeting math), economy
// (biomass/streak math). All pure modules; no DOM, no three.js.

import { ENEMY_SPEC, INTROS, typesByWave, computeWavePlan, CREATURE_TINTS,
  SAFE_HUES, ALARM_HUES, isSafeHue, isAlarmHue } from '../src/enemyspec.js';
import { TOWERS, TOWER_BY_KEY, MAX_TIER, upgradeCost, effectiveStats, pickTarget, shotInterval, unlockedTowerKeys, towerUnlockWave, TOWER_ORDER, HACK_GATED } from '../src/towers.js';
import { makeEconomy, sellRefund, waveClearBonus, earlyCallBonus, START_BIOMASS, RAM_PREMIUM } from '../src/economy.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

// --- enemyspec -----------------------------------------------------------
console.log('enemyspec:');
check('every intro type has a spec', INTROS.every((iv) => ENEMY_SPEC[iv.type]));
check('every spec type has an intro', Object.keys(ENEMY_SPEC).every((t) => INTROS.some((iv) => iv.type === t)));
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
check('every projectile tower has its own tempo',
  TOWERS.filter((t) => !['beam', 'slowfield'].includes(t.attack)).every((t) => t.projSpeed > 0)
  && TOWER_BY_KEY.sniper.projSpeed > TOWER_BY_KEY.single.projSpeed
  && TOWER_BY_KEY.aoe.projSpeed < TOWER_BY_KEY.homing.projSpeed);
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

// --- the colour safety rule ----------------------------------------------
// Colour tells the player whether a contact goes under the treads, before
// they have parsed its shape. If a hue ever crosses sides the game is lying
// about something that costs a hull, so it is asserted, not trusted.
console.log('enemy colour rule:');
{
  let safeOk = true, alarmOk = true, covered = true;
  for (const [key, spec] of Object.entries(ENEMY_SPEC)) {
    const hex = CREATURE_TINTS[key];
    if (hex === undefined) { covered = false; continue; }
    if (spec.rammable && !isSafeHue(hex)) { safeOk = false; console.error(`    ${key} is rammable but not a safe hue`); }
    if (!spec.rammable && !isAlarmHue(hex)) { alarmOk = false; console.error(`    ${key} is solid but not an alarm hue`); }
  }
  check('every enemy has a tint', covered);
  check('rammable enemies wear a SAFE hue (grey/white/blue/yellow)', safeOk);
  check('solid enemies wear an ALARM hue (orange/green/brown/purple/dark red)', alarmOk);
  check('the two palettes never overlap',
    !Object.values(SAFE_HUES).some((h) => Object.values(ALARM_HUES).includes(h)));
}

// --- economy -------------------------------------------------------------
console.log('economy:');
{
  const eco = makeEconomy();
  check('starts at START_BIOMASS', eco.biomass === START_BIOMASS);
  const first = eco.award(10); // streak 1 → ×1.05
  check('first kill pays bounty × 1.05', first === Math.round(10 * 1.05));
  eco.leak();
  check('leak resets the streak', eco.streak === 0 && eco.multiplier() === 1);
  for (let i = 0; i < 200; i++) eco.award(1);
  check('multiplier caps at ×5', eco.multiplier() === 5);
  const ramPay = makeEconomy().award(10, { ram: true });
  check('ram premium ×1.5', ramPay === Math.round(10 * RAM_PREMIUM * 1.05));
  const eco2 = makeEconomy({ startBiomass: 50 });
  check('spend guards affordability',
    eco2.spend(60) === false && eco2.spend(50) === true && eco2.biomass === 0);
  check('sell refund = 75% of spent', sellRefund(100) === 75);
  check('wave-clear bonus grows', waveClearBonus(5) === 40 && waveClearBonus(1) === 24);
  check('early-call bonus caps', earlyCallBonus(120) === 40 && earlyCallBonus(12) === 12);
}

// --- tower-unlock ladder -------------------------------------------------
console.log('tower unlocks:');
check('wave 1 unlocks single only', JSON.stringify(unlockedTowerKeys(1)) === JSON.stringify(['single']));
check('wave 2 unlocks single+rapid', JSON.stringify(unlockedTowerKeys(2)) === JSON.stringify(['single', 'rapid']));
check('unlock clamps below 1', JSON.stringify(unlockedTowerKeys(0)) === JSON.stringify(['single'])
  && JSON.stringify(unlockedTowerKeys(-3)) === JSON.stringify(['single']));
const LADDER_N = TOWER_ORDER.length - HACK_GATED.length;
check('wave N grants N towers (cumulative, ladder only)',
  Array.from({ length: LADDER_N }, (_, i) => i + 1).every((w) => unlockedTowerKeys(w).length === w));
check('the wave clock NEVER unlocks a gated tower',
  HACK_GATED.every((k) => !unlockedTowerKeys(99).includes(k)));
check('the first relay win decrypts the gate',
  HACK_GATED.every((k) => unlockedTowerKeys(1, 1).includes(k)));
check('wins beyond the gate push the ladder',
  unlockedTowerKeys(2, 2).length === 2 + 1 + 1); // wave 2 + gate + 1 early
check('full kit = ladder by clock + gate by relay',
  unlockedTowerKeys(99, HACK_GATED.length).length === TOWER_ORDER.length);
check('every unlocked key is a real tower', unlockedTowerKeys(99, 9).every((k) => TOWER_BY_KEY[k]));
check('towerUnlockWave: gated keys have NO wave',
  HACK_GATED.every((k) => towerUnlockWave(k) === null)
  && towerUnlockWave('single') === 1 && towerUnlockWave('laser') === LADDER_N);
check('TOWER_ORDER covers the roster', TOWER_ORDER.length === TOWERS.length && TOWER_ORDER.every((k) => TOWER_BY_KEY[k]));

// --- wave plan -----------------------------------------------------------
check('wave 1 plan is a single type', (() => { const p = computeWavePlan(1, 1, 4); return p.entries.length === 1 && p.headline === 'phage'; })());
check('headline is the newest available type', [2, 5, 9, 12].every((w) => computeWavePlan(w, 1, 4).headline === INTROS[Math.min(w, INTROS.length) - 1].type));
// through wave 8 (the unlock ladder) the shape stays learnable; past it the
// INVASION adds flood entries on top, so the cap only binds the ladder
check('ladder waves = 1 + up to 2 supports', [1, 2, 3, 8].every((w) => { const n = computeWavePlan(w, 1, 4).entries.length; return n >= 1 && n <= 3; }));
check('invasion waves flood past the ladder cap', computeWavePlan(12, 1, 4).entries.length > 3);
check('the flood is rammable fodder', (() => {
  const p = computeWavePlan(12, 1, 4);
  return p.entries.slice(-2).every((e) => ['phage', 'ghost'].includes(e.type) && e.count >= 10);
})());
check('the invasion swells the total hard', (() => {
  const tot = (w) => computeWavePlan(w, 1, 4).entries.reduce((a, e) => a + e.count, 0);
  return tot(9) > tot(8) * 2.5;
})());
check('supports are earlier types, never the headline', [3, 8, 12].every((w) => { const p = computeWavePlan(w, 1, 4); const avail = typesByWave(w); return p.entries.slice(1).every((e) => e.type !== p.headline && avail.includes(e.type)); }));
check('wave plan is deterministic', JSON.stringify(computeWavePlan(7, 2, 4)) === JSON.stringify(computeWavePlan(7, 2, 4)));
check('all wave-plan counts are >= 1', [1, 4, 8, 12, 20].every((w) => computeWavePlan(w, 2, 4).entries.every((e) => e.count >= 1)));
check('typesByWave grows with wave, caps at the roster', typesByWave(1).length === 1 && typesByWave(5).length === 5 && typesByWave(99).length === INTROS.length);

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\ntd-core invariants hold');
