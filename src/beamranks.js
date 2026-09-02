// beamranks.js — THE BEAM WEARS THE RANK.
//
// The secondary is the one weapon that is purely the pilot's: towers and the
// orbital strike answer to biomass, the beam answers to the ladder in
// ranks.js. So the ladder gets a visible readout that is not a badge in the
// corner — the beam itself changes colour and reach as you climb, and an
// opponent can see what they are up against from across the board.
//
// Four steps at the operator's ranks (2026-09-02): 1, 5, 10, 15. That is NOT
// the 3-tier bronze/silver/gold split — it is one step at entry and then a
// step at each tier CEILING, so the reward lands when a tier is finished
// rather than when it is entered. Gold 5 (the last rank, double-gated on
// elite kills) turns the beam red, and there is nothing above it.
//
// Colours and reaches are the operator's, verbatim. dps is NOT — see below.
//
// Pure module: no DOM, no three.js. td-tab reads a step and applies it; the
// beam lab reads the same table. Changing how the beam LOOKS never edits
// what it DOES — except here, where the operator asked for exactly that, so
// the coupling is written down in one table instead of spread across a file.

// Today's shipped beam, kept as the yardstick every step below is read
// against. Reach in cells, dps sustained (see LASER_DPS in td-tab).
export const BEAM_BASE = { reach: 2.6, dps: 1.7 };

// PENETRATION IS A FRACTION OF REACH, NOT A DISTANCE (the whole reason this
// module can change reach without quietly changing the weapon).
//
// td-tab charges every body the beam burns through against the reach it has
// left, in cells: 0.30 for fodder, 1.10 for a solid core, against a 2.6-cell
// reach — "three solid cores stop it dead". Leave those as absolute cells and
// a rank-15 beam at 10 cells eats three cores with 6.7 cells to spare: the
// choke mechanic silently dies at the exact moment the weapon gets long.
//
// Held as fractions, the struggle is identical at every step and length buys
// what the operator asked length to buy — engagement RANGE — instead of
// smuggling in a penetration buff nobody specified.
export const PEN_SOFT_FRAC = 0.30 / BEAM_BASE.reach;   // ≈0.115 of reach
export const PEN_HARD_FRAC = 1.10 / BEAM_BASE.reach;   // ≈0.423 — 3 stop it

// --- the ladder ----------------------------------------------------------
// minRank is INCLUSIVE and the steps are read top-down: a rank sits in the
// highest step it clears. Rank 0 (unranked, no insignia yet) sits in the
// first step — an unranked pilot still has a gun.
//
// dps IS A PROPOSAL, not an operator number. They specified colour and
// length and said "power/dmg" changes too without naming it. 1.7 is what
// ships today and is deliberately kept as the rank-1 value so nothing about
// the opening of a run moves; from there it is ~1.24x per step, ~1.9x end to
// end. Reach already grows 2.5x across the same span, so the two together
// are a big climb — this is the number to pull down first if rank 15 reads
// as a cheat rather than a career.
export const BEAM_STEPS = [
  { minRank: 1,  color: '#666100', reach: 4,  dps: 1.7, name: 'SODIUM' },
  { minRank: 5,  color: '#006d8f', reach: 6,  dps: 2.1, name: 'CYAN' },
  { minRank: 10, color: '#d357fe', reach: 8,  dps: 2.6, name: 'VIOLET' },
  { minRank: 15, color: '#b51a00', reach: 10, dps: 3.2, name: 'IRON' },
];

// The step a rank fires with. Clamps both ends: below the first minRank and
// above RANK_MAX both resolve rather than returning undefined, because this
// is called from the frame loop and a null here is a black beam.
export function beamStep(rank) {
  const r = Number.isFinite(rank) ? rank : 0;
  let step = BEAM_STEPS[0];
  for (const s of BEAM_STEPS) if (r >= s.minRank) step = s;
  return step;
}

// Does this rank promote the BEAM (as opposed to merely the badge)? The
// toast says something different when it does, so the two are asked apart.
export function isBeamStep(rank) {
  return BEAM_STEPS.some((s) => s.minRank === rank);
}

// Penetration cost in CELLS at a given reach — what td-tab actually charges.
export function penaltyCells(reach, hard) {
  return reach * (hard ? PEN_HARD_FRAC : PEN_SOFT_FRAC);
}
