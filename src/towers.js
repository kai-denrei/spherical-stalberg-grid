// towers.js — HokorobiTawaa's tower roster and combat MATH, re-based for
// the sphere. Pure module: no DOM, no three.js, Node-testable. The TD tab
// owns rendering, projectile flight, and placement UI; this module owns
// the numbers and the decisions.
//
// Unit conversions from HK (source: HokorobiTawaa src/units/roster.ts):
// - range: HK board units → CELLS (HK board ≈ 22 cells across, ×22,
//   rounded to a tidy first-pass value; M5 tunes).
// - damage: HK hp scale (20–500) → our fractional scale (1–6 hp):
//   dmg_ours = dmg_HK / 90 (Single Shot ≈ 0.16 → 6 shots kill a phage;
//   Sniper ≈ 0.69 one-shots nothing but wounds everything).

export const TOWERS = [
  { key: 'single', label: 'Single Shot', color: 0xeaf2ff, cost: 40,
    dmg: 14 / 90, range: 3.7, rate: 1.4, attack: 'single' },
  { key: 'rapid',  label: 'Rapid',       color: 0x6fe6ff, cost: 70,
    dmg: 7 / 90,  range: 3.5, rate: 3.0, attack: 'single' },
  { key: 'spread', label: 'Spread',      color: 0x2fe6d0, cost: 80,
    dmg: 6 / 90,  range: 3.1, rate: 1.0, attack: 'spread', pellets: 5 },
  { key: 'homing', label: 'Homing',      color: 0x5a9bff, cost: 90,
    dmg: 9 / 90,  range: 3.5, rate: 1.2, attack: 'homing' },
  { key: 'slow',   label: 'Slow',        color: 0xc4e6ff, cost: 100,
    dmg: 4 / 90,  range: 3.5, rate: 1.0, attack: 'slowfield',
    slowFactor: 0.45, slowDur: 1.6 },
  { key: 'aoe',    label: 'AoE',         color: 0x9fc4ff, cost: 110,
    dmg: 12 / 90, range: 3.5, rate: 0.9, attack: 'mortar', splash: 1.5 },
  { key: 'sniper', label: 'Sniper',      color: 0xffffff, cost: 130,
    dmg: 62 / 90, range: 7.0, rate: 0.7, attack: 'single' },
  { key: 'laser',  label: 'Laser',       color: 0x9ff5ff, cost: 220,
    dmg: 18 / 90, range: 5.3, rate: 1.5, attack: 'beam' },
];

export const TOWER_BY_KEY = Object.fromEntries(TOWERS.map((t) => [t.key, t]));

// upgrade economics, HK-exact: tier1 = 70% of purchase, tier2 = 120%,
// two tiers max. Returns null when maxed.
export const MAX_TIER = 2;
export function upgradeCost(def, currentTier) {
  if (currentTier === 0) return Math.round(def.cost * 0.7);
  if (currentTier === 1) return Math.round(def.cost * 1.2);
  return null;
}

// per-tier growth (HK-exact) + tier-2 specials
const UP_DAMAGE = 0.55;
const UP_RANGE = 0.08;
const UP_RATE = 0.1;

// effective stats at a tier: base growth per tier, plus the tier-2
// signature bonus per attack family (HK unit.ts:232-240).
export function effectiveStats(def, tier) {
  const s = {
    dmg: def.dmg * (1 + UP_DAMAGE * tier),
    range: def.range * (1 + UP_RANGE * tier),
    rate: def.rate * (1 + UP_RATE * tier),
    pellets: def.pellets ?? 0,
    splash: def.splash ?? 0,
    slowFactor: def.slowFactor,
    slowDur: def.slowDur,
  };
  if (tier >= 2) {
    if (def.attack === 'mortar') s.splash *= 1.4;
    else if (def.attack === 'spread') s.pellets += 2;
    else if (def.attack === 'beam' || def.attack === 'homing') s.range *= 1.3;
    else if (def.attack === 'single') s.rate *= 1.2;
  }
  return s;
}

// targeting: nearest ALIVE enemy within range (HK stepCombat). The
// distance function is injected so the sphere's chord metric plugs in
// without this module knowing about geometry.
export function pickTarget(towerPos, range, enemies, dist) {
  let best = null;
  let bestD = range;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = dist(towerPos, e.pos);
    if (d <= bestD) { bestD = d; best = e; }
  }
  return best;
}

// cooldown helper: seconds between shots at a rate
export const shotInterval = (rate) => 1 / rate;
