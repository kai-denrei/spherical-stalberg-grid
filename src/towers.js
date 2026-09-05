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

// shape = the half-dotted head silhouette (creatures.js towerHeadPts,
// HK's tower shapes); spin = head idle rate; projPx/trail = HK's
// projectile identity (tracer px size, ghost-trail length); projSpeed
// is PER-TOWER in cells/s (HK's board-unit values ×22) — the tempo IS
// the identity: singles snap, homing glides, the mortar lobs; arc
// marks the mortar's lofted flight.
const ROSTER_V1 = [
  { key: 'single', label: 'Single Shot', color: 0xeaf2ff, cost: 40,
    dmg: 14 / 90, range: 3.7, rate: 1.4, attack: 'single',
    // a six-axis arm: it points at ONE thing and swings to the next, which
    // is what a single-shot tower does. Ported from the Braille lab.
    shape: 'sixaxis', projPx: 5, trail: 0, projSpeed: 20 }, // HK 0.9 — fast, near-hitscan
  { key: 'rapid',  label: 'Rapid',       color: 0x6fe6ff, cost: 70,
    dmg: 7 / 90,  range: 3.5, rate: 3.0, attack: 'single',
    // a delta robot: three arms working in parallel, the fastest mechanism
    // on any production line. Rapid fire, made visible.
    shape: 'delta', spin: 1.5, projPx: 4, trail: 3, projSpeed: 26 }, // HK 1.2
  { key: 'spread', label: 'Spread',      color: 0x2fe6d0, cost: 80,
    dmg: 6 / 90,  range: 3.1, rate: 1.0, attack: 'spread', pellets: 5,
    // a struck-water ripple: concentric rings travelling outward. That IS
    // a spread — one event reaching several places at once.
    shape: 'ripple', projPx: 3.5, trail: 0, projSpeed: 15 }, // HK 0.7
  { key: 'homing', label: 'Homing',      color: 0x5a9bff, cost: 90,
    dmg: 9 / 90,  range: 3.5, rate: 1.2, attack: 'homing',
    // a gripper arm: it reaches out and takes hold of a specific thing,
    // which is what a homing shot does once it has picked its target.
    shape: 'gripper', spin: 0.9, projPx: 5, trail: 6, projSpeed: 13 }, // HK 0.6 — guided, unhurried
  { key: 'slow',   label: 'Slow',        color: 0xc4e6ff, cost: 100,
    // ZERO damage (operator, 2026-09-02: "the slow towers do dmg instead of
    // purely slowing down"). It carried 4/90 a tick — small enough to look
    // like nothing on the panel and large enough to finish wounded fodder,
    // which is a kill the SLOW tower has no business taking.
    dmg: 0,       range: 3.5, rate: 1.0, attack: 'slowfield',
    slowFactor: 0.45, slowDur: 1.6,
    // a broadcast antenna: it emits over an area rather than aiming, which
    // is exactly what a slow FIELD does. Ported from the Braille lab.
    shape: 'broadcast', spin: 0.3 },
  { key: 'aoe',    label: 'AoE',         color: 0x9fc4ff, cost: 110,
    dmg: 12 / 90, range: 3.5, rate: 0.9, attack: 'mortar', splash: 1.5,
    // a MORTAR, literally: tube and baseplate, the thing whose entire job
    // is the lobbed shell this tower fires. The launcher read as generic
    // ordnance; this one is the attack, sculpted.
    // fat round, real smoke: the heaviest shell on the board should read
    // as one in flight, not only on impact
    shape: 'mortar', spin: 0.7, projPx: 12, trail: 6, arc: true, projSpeed: 3.5 }, // a slow deliberate LOB
  { key: 'sniper', label: 'Sniper',      color: 0xffffff, cost: 130,
    // hitscan: the shot IS the trace. A one-off this strong crossing the
    // board as a dot read like everyone else's bullet, only lonelier.
    dmg: 62 / 90, range: 7.0, rate: 0.7, attack: 'single', hitscan: true,
    // a guyed mast: the tallest, thinnest thing here, built to reach. The
    // longest range on the board should look like it out-reaches the rest.
    shape: 'guyed', projPx: 7, trail: 11, projSpeed: 42 }, // HK 1.9 — a streak
  { key: 'laser',  label: 'Laser',       color: 0x9ff5ff, cost: 220,
    dmg: 18 / 90, range: 5.3, rate: 1.5, attack: 'beam',
    // an obelisk: a standing monolith, the one head with no moving parts.
    // A beam weapon does not traverse or reload — it simply channels.
    shape: 'obelisk', spin: 0.5 },
];

// --- ROSTER 2: the sentry-model board ------------------------------------
// A VARIANT, NOT A REPLACEMENT. Roster 1 above is untouched and still the
// default, because the development history is worth keeping and because
// fifteen thousand lines of TD tab should not be forked to change eight
// numbers and eight names. One board, two rosters, chosen once at boot.
//
// The operator's mapping, slot by slot, with Rapid removed and everything
// after it shifted up:
//
//   1 Single  → ROTOR            5 AoE    → MORTAR
//   2 Rapid   → (out)            6 Sniper → LANCER
//   3 Spread  → PLASMA THROWER   7 Laser  → HOWITZER
//   4 Homing  → QUIVER           8 (new)  → HEPTAPOD A6
//     Slow    → RELAY
//
// Three of those are more than a rename and are called out where they sit:
// the Rotor absorbs Rapid's job, the Plasma Thrower is a beam, and the
// Howitzer is artillery rather than the beam its slot used to hold.
//
// `model` names the GLB in assets/models/sentries/ — the Sentry Workshop's
// own contract, which the sentry lab already loads.
const ROSTER_V2 = [
  // ROTOR — the starter, and RAPID'S JOB IS NOW ITS JOB. Removing Rapid
  // took the board's cheap high-rate answer to fodder with it, so the Rotor
  // is Single's slot fired at a rotary cadence: less per round, many more
  // rounds. Revert by putting rate back to 1.4 and dmg to 14/90.
  { key: 'rotor', label: 'Rotor', color: 0xeaf2ff, cost: 45,
    dmg: 9 / 90, range: 3.6, rate: 2.2, attack: 'single',
    model: 'rotor', shape: 'sixaxis', projPx: 4, trail: 2, projSpeed: 24 },
  // PLASMA THROWER — a BEAM, not a spread: the tank's secondary with the
  // reach taken off it. Short range is the whole trade; it out-damages
  // everything at knife distance and covers almost nothing.
  { key: 'plasma', label: 'Plasma Thrower', color: 0x2fe6d0, cost: 80,
    dmg: 15 / 90, range: 2.6, rate: 1.6, attack: 'beam',
    model: 'plasma', shape: 'ripple', spin: 0.8 },
  { key: 'quiver', label: 'Quiver', color: 0x5a9bff, cost: 90,
    dmg: 9 / 90, range: 3.5, rate: 1.2, attack: 'homing',
    model: 'quiver', shape: 'gripper', spin: 0.9, projPx: 5, trail: 6, projSpeed: 13 },
  { key: 'relay', label: 'Relay', color: 0xc4e6ff, cost: 100,
    dmg: 0, range: 3.5, rate: 1.0, attack: 'slowfield',
    slowFactor: 0.45, slowDur: 1.6,
    model: 'relay', shape: 'broadcast', spin: 0.3 },
  { key: 'mortar', label: 'Mortar', color: 0x9fc4ff, cost: 110,
    dmg: 12 / 90, range: 3.5, rate: 0.9, attack: 'mortar', splash: 1.5,
    model: 'mortar', shape: 'mortar', spin: 0.7, projPx: 12, trail: 6, arc: true, projSpeed: 3.5 },
  { key: 'lancer', label: 'Lancer', color: 0xffffff, cost: 130,
    dmg: 62 / 90, range: 7.0, rate: 0.7, attack: 'single', hitscan: true,
    model: 'lancer', shape: 'guyed', projPx: 7, trail: 11, projSpeed: 42 },
  // HOWITZER — the slot Laser used to hold, and a howitzer is not a beam.
  // It is the Mortar's big sister: further, heavier, wider, and slow enough
  // that a wave can walk through the gap between shells. That gives the
  // board TWO lobbed weapons that are actually different rather than one
  // renamed twice.
  { key: 'howitzer', label: 'Howitzer', color: 0x9ff5ff, cost: 220,
    dmg: 34 / 90, range: 5.6, rate: 0.45, attack: 'mortar', splash: 2.4,
    model: 'howitzer', shape: 'mortar', spin: 0.4, projPx: 15, trail: 8, arc: true, projSpeed: 3.0 },
];

// --- the live roster ------------------------------------------------------
// These are LET bindings on purpose: an ES module export is a live binding,
// so every importer sees the switch without any of them holding a stale
// copy — which is what lets one 15k-line tab serve both boards. The pick is
// made ONCE, before the tab is imported (src/roster.js), and never again;
// nothing here is reactive and nothing should be.
export const ROSTERS = {
  1: { id: 1, label: 'campaign', towers: ROSTER_V1,
       order: ['single', 'rapid', 'spread', 'slow', 'homing', 'aoe', 'sniper', 'laser'],
       hackGated: ['aoe'] },
  2: { id: 2, label: 'sentry board', towers: ROSTER_V2,
       order: ['rotor', 'plasma', 'quiver', 'relay', 'mortar', 'lancer', 'howitzer'],
       hackGated: ['mortar'] },
};

export let ROSTER = ROSTERS[1];
export let TOWERS = ROSTER.towers;
export let TOWER_BY_KEY = Object.fromEntries(TOWERS.map((t) => [t.key, t]));
export let TOWER_ORDER = ROSTER.order;
export let HACK_GATED = ROSTER.hackGated;
let WAVE_LADDER = TOWER_ORDER.filter((k) => !HACK_GATED.includes(k));

// Never throws: an unknown id is the campaign, because a stale URL should
// land you on the board that exists rather than on nothing.
export function useRoster(id) {
  ROSTER = ROSTERS[id] || ROSTERS[1];
  TOWERS = ROSTER.towers;
  TOWER_BY_KEY = Object.fromEntries(TOWERS.map((t) => [t.key, t]));
  TOWER_ORDER = ROSTER.order;
  HACK_GATED = ROSTER.hackGated;
  WAVE_LADDER = TOWER_ORDER.filter((k) => !HACK_GATED.includes(k));
  return ROSTER;
}

// THE STARTER TOWER, by position rather than by name. Several call sites
// wanted "the cheapest one" and said `TOWER_BY_KEY.single` — which is a key
// that does not exist on the second board.
export const starterTower = () => TOWERS[0];

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

// --- progressive unlock ladder -------------------------------------------
// Towers unlock by WAVE: ONE new tower each wave, cheap → capstone.
// Cumulative: wave N grants the first N towers (capped at the roster).
// TOWER_ORDER / HACK_GATED / WAVE_LADDER are the live roster's, above.
//
// HACK-GATED: never unlocked by the wave clock — the only source is
// winning a protocol at the Antipode Relay. Sim batch 2026-08-30 showed
// the mid-game locking solid once the full kit arrives by timetable; the
// operator's ruling gates the OP half of the slow+aoe combo behind the
// errand. The wave ladder is TOWER_ORDER minus these, so the capstones
// each arrive one wave earlier than before.

export function unlockedTowerKeys(wave, hacks = 0) {
  const n = Math.max(1, Math.min(WAVE_LADDER.length, Math.floor(wave) || 1));
  const out = WAVE_LADDER.slice(0, n);
  // relay wins decrypt the gated kit first, in gate order; wins beyond
  // that push the wave ladder ahead of the clock
  const h = Math.max(0, Math.floor(hacks));
  for (let i = 0; i < Math.min(h, HACK_GATED.length); i++) out.push(HACK_GATED[i]);
  const extra = h - HACK_GATED.length;
  if (extra > 0) {
    const m = Math.min(WAVE_LADDER.length, n + extra);
    for (const k of WAVE_LADDER.slice(n, m)) out.push(k);
  }
  return out;
}

// The wave a key unlocks on — null for hack-gated keys, which have no
// wave at all (the radial shows the relay glyph instead of a W number).
export function towerUnlockWave(key) {
  const i = WAVE_LADDER.indexOf(key);
  return i < 0 ? null : i + 1;
}
