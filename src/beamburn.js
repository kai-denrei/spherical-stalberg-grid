// beamburn.js — WHAT THE BEAM BURNS THROUGH, and what that costs it.
//
// This was inline in td-tab's fire loop, which meant the beam lab could not
// show it: the lab drew a ribbon of whatever length its slider said, and the
// one mechanic a tuning session most needs to see — the beam SHORTENING into
// a crowd — existed only on the board. A lab that cannot show the mechanic is
// a lab that tunes the wrong thing.
//
// So it lives here, pure, and both surfaces call it. That is the standing
// testability line in this project (pure decision module + thin effectful
// module) and it is also the anti-drift line: the lab cannot disagree with the
// game about the drop-off, because there is only one copy of the rule.
//
// THE RULE, in one paragraph. The beam pierces — it does not stop at the
// first body — but every body it passes through eats into the reach it has
// left, so it visibly shortens rather than sailing on. Fodder is nearly free;
// a solid core takes a big bite, and three of those stop it dead. Separately,
// mass in the beam SLOWS its sweep (drag), which is the inverse of knock-back:
// nothing is pushed, something is held, and a beam lagging its twin is the
// weapon's own motion saying "there is something in here you should not ram".
//
// Pure module: no DOM, no three.js.

// Penetration, as FRACTIONS of the reach — see beamranks.js for why this
// cannot be an absolute distance once reach climbs with rank.
export { PEN_SOFT_FRAC, PEN_HARD_FRAC } from './beamranks.js';
import { PEN_SOFT_FRAC, PEN_HARD_FRAC } from './beamranks.js';

// Drag, per body in the beam. Absolute, not fractional: this is about how
// much MASS is in the beam, and a heavier target does not get lighter because
// the pilot was promoted.
export const DRAG_SOFT = 0.10;   // per rammable body
export const DRAG_HARD = 0.55;   // per unrammable one — the solid core bites
export const DRAG_CAP = 0.90;    // never a full stall: it always creeps

// How much of its remaining reach one body costs, in the same units as
// `reach`. `hard` is the not-rammable tier — the colour the whole board
// already reads danger by.
export function penaltyFor(reach, hard) {
  return reach * (hard ? PEN_HARD_FRAC : PEN_SOFT_FRAC);
}

// A WALL ENDS THE BEAM, and bites it in the same currency a body does.
//
// Not a flat penalty on contact: measured, a beam standing on ground whose
// whole two-hop neighbourhood is open still clips rock at 2.5 of its 2.6
// cells, because this map is dense. A flat penalty therefore fired in the
// NORMAL state and bogged the weapon everywhere. Bite is 0 when the wall is
// out at the tip and 1 at point-blank.
export function wallBite(hitAt, reach) {
  if (!(reach > 0) || !(hitAt >= 0)) return 0;
  return Math.max(0, 1 - hitAt / reach);
}

// THE BURN. Walk the bodies NEAREST FIRST — the order is the whole mechanic,
// because what stops the beam is what is in FRONT, and something behind a
// wall of armour is simply never reached.
//
//   bodies  [{ t, hard, ref }] — t is distance along the beam, any unit, so
//           long as it matches `len` and `reach`. Sorted here, not by the
//           caller, so no caller can get the order wrong.
//   len     the beam's length after any WALL stop (<= reach)
//   reach   the beam's full clear-air reach, which sets the penalty scale
//   bite    0..1 from wallBite(), charged as drag exactly like a body
//
// Returns:
//   reachLeft  where the beam actually ends — draw THIS, not len
//   drag       0..1, how much this beam's sweep is slowed this frame
//   hits       the bodies actually reached, nearest first, each with the
//              reach remaining when the beam got to it
//   stoppedBy  the body that ended it, or null if it ran out of bodies
export function burn(bodies, len, reach, bite = 0) {
  const along = bodies.slice().sort((a, b) => a.t - b.t);
  let drag = DRAG_HARD * bite;
  let reachLeft = len;
  const hits = [];
  let stoppedBy = null;
  for (const b of along) {
    if (b.t > reachLeft) break;            // the beam died before this one
    hits.push({ ...b, reachAt: reachLeft });
    drag += b.hard ? DRAG_HARD : DRAG_SOFT;
    reachLeft -= penaltyFor(reach, b.hard);
    if (reachLeft <= b.t) {                // it stops IN this one
      reachLeft = b.t;
      stoppedBy = b;
      break;
    }
  }
  return { reachLeft, drag, hits, stoppedBy };
}

// How far the sweep advances this frame under that load. Capped so the beam
// always creeps and never freezes; uncapped at the top so a beam that spends
// its burst inside a hard cluster simply does not finish its arc.
export function sweepAdvance(dt, burstSeconds, drag) {
  return (dt / burstSeconds) * (1 - Math.min(DRAG_CAP, drag));
}

// A READOUT for the lab: what a given line-up costs, body by body. Same
// numbers the game runs on — it calls burn() rather than restating the rule.
export function burnReport(bodies, len, reach, bite = 0) {
  const r = burn(bodies, len, reach, bite);
  const rows = r.hits.map((h) => ({
    t: h.t,
    hard: h.hard,
    cost: penaltyFor(reach, h.hard),
    reachAt: h.reachAt,
  }));
  const reached = new Set(r.hits.map((h) => h.t));
  const missed = bodies.filter((b) => !reached.has(b.t)).sort((a, b) => a.t - b.t);
  return { ...r, rows, missed };
}
