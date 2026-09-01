// AUTO MODE's firing decisions, as pure predicates.
//
// These are rules, not effects: given the directive and what is in range,
// should the trigger be held? Keeping them here rather than inline in
// td-tab.js is the project's standing testability line — a pure decision
// module plus a thin effectful one — and it means the operator's rulings
// about which weapon answers which target are enforced by tests instead of
// by whoever last read the comment.

// cos of the half-arc the hull-mounted guns cover. They fire FORWARD, so
// holding the trigger at something behind you is pure heat.
export const LASER_ARC = 0.55;

// THE SECONDARY IS FREE. Lasers cost no ammo, only heat, so auto uses them
// in every directive — there is nothing to conserve about them.
//
// RAM is the one exception and only half an exception (operator,
// 2026-09-01): it will not burn a target it is lining up to ram, but it
// still answers the hard tier it refuses to charge.
export function wantsSecondary(directive, cands, arc = LASER_ARC) {
  return cands.some((c) => c.inRange
    && c.ahead >= arc
    && !(directive === 'ram' && c.rammable));
}

// SHELLS ARE LIMITED, and two directives ration them: 'conserve' because
// saving them is its whole job, 'ram' because a rammable target is free to
// kill with the hull. Both spend shells only on the tier that cannot be
// rammed. Unchanged by the secondary rule above — that is the distinction
// the operator drew: conserve conserves the limited shells, not the
// unlimited secondary.
export function shellsForAll(directive) {
  return directive !== 'conserve' && directive !== 'ram';
}
