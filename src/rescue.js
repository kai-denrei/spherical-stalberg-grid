// rescue.js — THE RESCUE MISSION's rules: who is stranded and where, the
// ferry, the grab, the budget, the wave mix, and the verdict. Pure: no DOM,
// no three.js, Node-tested in test/rescue.mjs. td-tab owns the figures, the
// beacons, the radar chevrons and the sounds.
//
// Design: docs/superpowers/specs/2026-09-05-rescue-mission.md. The operator's
// brief was one paragraph — "a handful of astronauts stranded, requires smart
// use of limited mines and shells to save; lots of rammable enemies and just
// a handful of more difficult one to manage; more tactical" — and the spec
// names every decision taken on top of it. The three that matter most, and
// the reason each is a number here rather than a constant in the board:
//
//   THE STOP CLAUSE. Boarding needs the tank NEAR and SLOW, for a whole
//   second, and resets the moment either stops being true. Without it a
//   pick-up is something that happens while you drive past, which is not a
//   decision; standing still in the open with the horde coming is.
//
//   THE GRAB WINDOW. An enemy reaching a survivor does not kill them, it
//   holds them for grabSecs. Kill it inside that window and they stand up
//   again. A rescue lost in a frame you never saw is a rescue nobody feels
//   they lost fairly — and 1.5 s is exactly one shell, one ram, or one mine
//   you had the sense to lay earlier, which is the sentence the mode is about.
//
//   THE SEATS. Two. A survivor aboard cannot be killed except by losing the
//   hull, and then both go with it. That is what makes carrying a pair a bet
//   rather than an optimisation.

import { makeParams, clampParams, formatKnobs, knobProblems } from './knobs.js?v=5cebd566';
import { dot3 } from './vec3.js?v=5cebd566';

export const RESCUE_TUNE = {
  survivors: 6,
  seats: 2,
  bandMin: 6,          // cells (hops) from the heart: no one strands next door
  bandMax: 14,
  apart: 3,            // cells between two survivors — a field, not a huddle
  boardCells: 1.0,     // how close the hull must be
  boardSecs: 1.0,      // ...and for how long
  boardThrottle: 0.34, // ...with the lever under this. The stop clause, half of it —
  boardSpeed: 0.35,    // ...and the hull actually under this many cells/s, which is
                       // the half that also works on a phone: the shell has no
                       // throttle at all, so read off the lever alone the clause is
                       // unenforceable there and every drive-by would board.
  lockCells: 2.0,      // an enemy this close to a standing survivor peels off
  grabSecs: 1.5,       // the window to kill the grabber
  hulls: 3,
  shells: 8,
  mines: 6,
  // OFF, and the most overrulable number in the file. The beams cost heat,
  // not ammo, so with them on "limited shells" means nothing and the mission
  // is a driving exercise. The rescue hull is a transport with its
  // secondaries stripped.
  lasers: false,
};

export const RESCUE_KNOBS = [
  { key: 'survivors', label: 'stranded', group: 'mission', min: 1, max: 12, step: 1 },
  { key: 'seats', label: 'seats in the hull', group: 'mission', min: 1, max: 4, step: 1 },
  { key: 'bandMin', label: 'nearest (cells)', group: 'mission', min: 2, max: 20, step: 1 },
  { key: 'bandMax', label: 'farthest (cells)', group: 'mission', min: 4, max: 40, step: 1 },
  { key: 'apart', label: 'spacing (cells)', group: 'mission', min: 1, max: 8, step: 1 },
  { key: 'boardCells', label: 'board within (cells)', group: 'ferry', min: 0.4, max: 3, step: 0.1 },
  { key: 'boardSecs', label: 'board time (s)', group: 'ferry', min: 0.2, max: 4, step: 0.1 },
  { key: 'boardThrottle', label: 'board under throttle', group: 'ferry', min: 0.05, max: 1, step: 0.02 },
  { key: 'boardSpeed', label: 'board under (cells/s)', group: 'ferry', min: 0.05, max: 2, step: 0.05 },
  { key: 'lockCells', label: 'lock-on (cells)', group: 'threat', min: 0.5, max: 6, step: 0.5 },
  { key: 'grabSecs', label: 'grab window (s)', group: 'threat', min: 0.3, max: 6, step: 0.1 },
  { key: 'hulls', label: 'hulls', group: 'budget', min: 1, max: 6, step: 1 },
  { key: 'shells', label: 'shells', group: 'budget', min: 0, max: 30, step: 1 },
  { key: 'mines', label: 'mines', group: 'budget', min: 0, max: 30, step: 1 },
  { key: 'lasers', label: 'secondaries fitted', group: 'budget', bool: true },
];

export const makeRescueParams = (src = RESCUE_TUNE) => makeParams(RESCUE_KNOBS, src);
export const clampRescueParams = (p, src) => clampParams(RESCUE_KNOBS, p, src);
export const formatRescueTune = (p) => formatKnobs('RESCUE_TUNE', RESCUE_KNOBS, p);
export const rescueKnobProblems = () => knobProblems(RESCUE_KNOBS, RESCUE_TUNE);

// Great-circle distance between two surface points, in radians — which on a
// unit sphere IS arc length, the standing rule. Same parameterisation as
// mines.js and the beam; a chord here would quietly shrink every radius the
// further out a survivor stranded.
export const groundDist = (a, b) => {
  const c = Math.min(1, Math.max(-1, dot3(a, b) / (Math.hypot(...a) * Math.hypot(...b) || 1)));
  return Math.acos(c);
};

export function makeRescue(tune = RESCUE_TUNE) {
  return {
    survivors: [],   // { id, ci, pos, state, boardT, grabT }
    carried: 0,
    saved: 0,
    lost: 0,
    over: false,
    short: 0,        // how many the board could not hold
    apart: 0,        // the spacing it actually managed, in cells
  };
}

export const standing = (st) => st.survivors.filter((s) => s.state === 'standing').length;
export const aboard = (st) => st.survivors.filter((s) => s.state === 'aboard').length;

// WHERE THEY STRAND. `cands` are cells already filtered by the caller to the
// lanes — the flow from the gates to the heart — as { ci, d, pos }, where `d`
// is hops from the heart and `pos` is a unit vector. Deterministic in `rng`,
// in the band, and never within `apart` cells of one another.
//
// Fewer than asked for is a legal answer, and it is REPORTED (`short`) rather
// than silently accepted: a board that can only hold four is a board the
// verdict must score out of four, and a mission that quietly shrinks its own
// objective is a mission nobody can lose.
export function placeSurvivors(st, cands, rng, cellSide, tune = RESCUE_TUNE) {
  const band = cands.filter((c) => c.d >= tune.bandMin && c.d <= tune.bandMax);
  // deterministic shuffle: one draw per candidate, sorted. Fisher-Yates over
  // the same rng would work too, but this is order-stable under a filter
  // change, which matters when the lane set moves between rounds.
  const order = band.map((c) => ({ c, k: rng() })).sort((a, b) => a.k - b.k).map((x) => x.c);
  // THE SPACING DEGRADES BEFORE THE PARTY DOES. Sector 1 is a deliberately
  // tight board — 84 open cells — and at three cells apart it could only hold
  // four of six, which changes the mission's difficulty for a reason that has
  // nothing to do with the mission. So `apart` is a PREFERENCE, tried and
  // relaxed: the party size is the design, the spacing is the taste.
  const want = Math.round(tune.survivors);
  for (let apart = tune.apart; apart >= 0; apart -= 0.5) {
    st.survivors.length = 0;
    const gap = apart * cellSide;
    for (const c of order) {
      if (st.survivors.length >= want) break;
      if (gap > 0 && st.survivors.some((s) => groundDist(s.pos, c.pos) < gap)) continue;
      st.survivors.push({ id: st.survivors.length + 1, ci: c.ci, pos: c.pos.slice(),
        state: 'standing', boardT: 0, grabT: 0 });
    }
    st.apart = apart;
    if (st.survivors.length >= want) break;
  }
  st.short = want - st.survivors.length;
  return st.survivors;
}

// THE STOP CLAUSE. Both conditions, every frame, or the clock goes back to
// zero — an interrupted pick-up is a pick-up not made. A grabbed survivor
// cannot be boarded: kill what is holding them first.
export function stepBoard(st, i, { near, slow }, dt, tune = RESCUE_TUNE) {
  const s = st.survivors[i];
  if (!s || s.state !== 'standing') return null;
  if (s.grabT > 0) { s.boardT = 0; return null; }
  if (!near || !slow) { s.boardT = 0; return null; }
  if (aboard(st) >= Math.round(tune.seats)) { s.boardT = 0; return 'full'; }
  s.boardT += dt;
  if (s.boardT < tune.boardSecs) return 'boarding';
  s.boardT = 0;
  s.state = 'aboard';
  st.carried = aboard(st);
  return 'aboard';
}

// THE GRAB. `held` is the board's answer to "is something in contact with
// this survivor right now". Rising edge announces; the clock runs while it
// stays true; letting go at any point stands them back up.
export function stepGrab(st, i, held, dt, tune = RESCUE_TUNE) {
  const s = st.survivors[i];
  if (!s || s.state !== 'standing') return null;
  if (!held) {
    if (s.grabT > 0) { s.grabT = 0; return 'freed'; }
    return null;
  }
  const first = s.grabT === 0;
  s.grabT += dt;
  if (s.grabT >= tune.grabSecs) {
    s.state = 'lost';
    s.grabT = 0;
    st.lost++;
    return 'lost';
  }
  return first ? 'grabbed' : null;
}

// 0..1 of the grab window spent — the red ring's fill.
export const grabProgress = (s, tune = RESCUE_TUNE) =>
  Math.max(0, Math.min(1, s.grabT / Math.max(1e-6, tune.grabSecs)));

export function disembark(st) {
  let n = 0;
  for (const s of st.survivors) if (s.state === 'aboard') { s.state = 'saved'; n++; }
  st.saved += n;
  st.carried = 0;
  return n;
}

// The hull is gone, and everyone in it with it. This is the whole reason two
// seats is a bet: it is the only way a survivor who was already safe dies.
export function loseCarried(st) {
  let n = 0;
  for (const s of st.survivors) if (s.state === 'aboard') { s.state = 'lost'; n++; }
  st.lost += n;
  st.carried = 0;
  return n;
}

// Does this enemy peel off the lane for this survivor? A short LOCAL
// override — deliberately not a second BFS field, because the survivors
// stand in the flow the horde is already walking.
export const lockOn = (s, enemyPos, cellSide, tune = RESCUE_TUNE) =>
  s.state === 'standing' && groundDist(s.pos, enemyPos) <= tune.lockCells * cellSide;

// THE MIX. Mostly rammable, with a small growing hard core — the brief's
// "lots of rammable enemies and just a handful of more difficult one".
// A table rather than computeWavePlan: the mission's curve is a design
// statement and it should be readable in one glance.
export function waveMix(w) {
  const n = Math.max(1, Math.round(w));
  const soft = n <= 4 ? [8, 10, 12, 14][n - 1] : 14 + 2 * (n - 4);
  const hard = n === 1 ? 0 : Math.min(5, 1 + Math.floor((n - 2) / 2));
  return { soft, hard };
}

// Over the moment nothing is standing: everyone is saved, aboard-and-lost,
// or dead. Anyone still ABOARD keeps it running — the drive home is the
// mission.
export function missionOver(st) {
  if (st.over) return true;
  st.over = standing(st) === 0 && aboard(st) === 0;
  return st.over;
}

// The end card's numbers. `total` is what the board could actually place,
// not what the tune asked for.
export function verdict(st) {
  const total = st.survivors.length;
  return {
    saved: st.saved,
    lost: st.lost,
    total,
    clean: total > 0 && st.saved === total,
    none: st.saved === 0,
    lostIds: st.survivors.filter((s) => s.state === 'lost').map((s) => s.id),
  };
}
