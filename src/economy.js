// economy.js — the BIOMASS system. HokorobiTawaa's credit math, verbatim;
// only the substance changed. Pure module: no DOM, Node-testable. The TD
// tab renders the numbers; this owns them.
//
// Biomass is alien tissue rendered down — the one thing the Construction
// Drone can print structures out of. Loop: kill → bounty × streak-multiplier
// → biomass. Streak grows 5% per consecutive kill, caps at ×5, and resets
// when an enemy LEAKS (reaches the Heart). Spending: tower/unit purchase,
// upgrades; selling reclaims 75% of everything rendered into the piece.
//
// Naming note: the module keeps the name `economy` — the economy is the
// system, biomass is the currency inside it.

export const START_BIOMASS = 190;
export const STREAK_STEP = 0.05;
export const STREAK_CAP = 5;
export const REFUND_FRACTION = 0.75;

// operator ruling: ramming pays a premium — personal risk towers never take
export const RAM_PREMIUM = 1.5;

export function sellRefund(spent) {
  return Math.round(spent * REFUND_FRACTION);
}

// wave-clear drip (adapted from HK's fraying grant 130+8·wave — steadier
// small payments suit shorter rounds)
export function waveClearBonus(wave) {
  return 20 + 4 * wave;
}

// early-call bonus: biomass proportional to downtime skipped, capped
export function earlyCallBonus(secondsSaved, cap = 40) {
  return Math.min(cap, Math.max(0, Math.round(secondsSaved)));
}

export function makeEconomy(opts = {}) {
  const startBiomass = opts.startBiomass ?? START_BIOMASS;
  let biomass = startBiomass;
  let streak = 0;
  let score = 0; // cumulative, never spent

  const multiplier = () =>
    Math.min(STREAK_CAP, 1 + STREAK_STEP * streak);

  return {
    get biomass() { return biomass; },
    get streak() { return streak; },
    get score() { return score; },
    multiplier,
    // a kill: streak grows FIRST, then bounty scales by the multiplier —
    // HK's onKill order exactly (award includes the kill's own streak step)
    award(bounty, { ram = false } = {}) {
      streak++;
      const amount = Math.round(bounty * (ram ? RAM_PREMIUM : 1) * multiplier());
      biomass += amount;
      score += amount;
      return amount;
    },
    // an enemy reached the Heart: the streak dies with the moment
    leak() { streak = 0; },
    canAfford(cost) { return biomass >= cost; },
    spend(cost) {
      if (biomass < cost) return false;
      biomass -= cost;
      return true;
    },
    addBiomass(n) { biomass += n; score += Math.max(0, n); },
  };
}
