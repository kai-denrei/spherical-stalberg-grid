// economy.js — HokorobiTawaa's credit system, verbatim math. Pure module:
// no DOM, Node-testable. The TD tab renders the numbers; this owns them.
//
// Loop: kill → bounty × streak-multiplier → credit. Streak grows 5% per
// consecutive kill, caps at ×5, and resets when an enemy LEAKS (reaches
// the Heart). Spending: tower/unit purchase, upgrades; selling refunds
// 75% of everything spent on the piece.

export const START_CREDIT = 190;
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

// early-call bonus: credits proportional to downtime skipped, capped
export function earlyCallBonus(secondsSaved, cap = 40) {
  return Math.min(cap, Math.max(0, Math.round(secondsSaved)));
}

export function makeEconomy(opts = {}) {
  const startCredit = opts.startCredit ?? START_CREDIT;
  let credit = startCredit;
  let streak = 0;
  let score = 0; // cumulative, never spent

  const multiplier = () =>
    Math.min(STREAK_CAP, 1 + STREAK_STEP * streak);

  return {
    get credit() { return credit; },
    get streak() { return streak; },
    get score() { return score; },
    multiplier,
    // a kill: streak grows FIRST, then bounty scales by the multiplier —
    // HK's onKill order exactly (award includes the kill's own streak step)
    award(bounty, { ram = false } = {}) {
      streak++;
      const amount = Math.round(bounty * (ram ? RAM_PREMIUM : 1) * multiplier());
      credit += amount;
      score += amount;
      return amount;
    },
    // an enemy reached the Heart: the streak dies with the moment
    leak() { streak = 0; },
    canAfford(cost) { return credit >= cost; },
    spend(cost) {
      if (credit < cost) return false;
      credit -= cost;
      return true;
    },
    addCredit(n) { credit += n; score += Math.max(0, n); },
  };
}
