// radar.js — the old-school PPI sweep behind the minimap. Pure math only:
// the canvas painting lives with the tab, but WHERE a contact sits on the
// scope and HOW bright the phosphor holds it are testable facts, and the
// orientation conventions here are exactly the kind of thing that silently
// flips without a test.
//
// From DeepWatch (~/Documents/Dev/centroid-defense), which proved the idiom:
// a rotating beam, contacts that flare when it passes and decay behind it.
// Ours scopes a SPHERE, so a contact is projected onto the tangent plane of
// the scope's centre — player-centred heading-up, or heart-centred.

import { sub3, scale3, dot3, cross3, norm3 } from './vec3.js?v=f0e808d6';

export const SWEEP_PERIOD = 2.6;   // seconds per revolution
export const PHOSPHOR_DECAY = 1.12; // brightness lost per full turn behind the beam

// Screen basis at a centre point. `up` is what the top of the scope means —
// the player's heading, or the heart pole's tangent. Returns unit vectors:
// fwd (screen up), right (screen right), n (out of the scope).
export function radarBasis(centerPos, up) {
  const n = norm3(centerPos);
  const fwd = norm3(sub3(up, scale3(n, dot3(up, n))));
  const right = norm3(cross3(fwd, n));
  return { n, fwd, right };
}

// A world position onto the scope, in scope-radius units. y is SCREEN y
// (down positive), because the only consumer is a canvas. `clamped` marks a
// contact beyond range, pinned to the rim — off-scope threats still exist.
export function radarProject(pos, centerPos, basis, range) {
  const d = sub3(pos, centerPos);
  let x = dot3(d, basis.right) / range;
  let y = -dot3(d, basis.fwd) / range;
  const len = Math.hypot(x, y);
  const clamped = len > 1;
  if (clamped) { x /= len; y /= len; }
  return { x, y, clamped };
}

// Bearing of a scope point, radians clockwise from screen-north. The sweep
// angle uses the same convention, so phosphor is a plain subtraction.
export function radarBearing(x, y) {
  return Math.atan2(x, -y);
}

export function sweepAngle(t) {
  const TAU = Math.PI * 2;
  return ((t / SWEEP_PERIOD) * TAU) % TAU;
}

// Phosphor brightness for a contact at `bearing` with the beam at `sweep`:
// 1 the instant the beam passes, decaying the further behind it falls,
// never fully dark — a scope that blanks its contacts is not a scope.
export function radarPhosphor(bearing, sweep) {
  const TAU = Math.PI * 2;
  const age = (((sweep - bearing) % TAU) + TAU) % TAU / TAU;
  return Math.max(0.16, 1 - age * PHOSPHOR_DECAY);
}
