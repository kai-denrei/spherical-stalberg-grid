// arc.js — GREAT-CIRCLE MATH, for anything that travels along the ground.
//
// The board is a sphere and the tank's beam is the first thing on it long
// enough for that to matter. At the old 2.6-cell reach a straight chord from
// the muzzle floated 0.27 cells off the surface at its tip — invisible. At
// the rank-15 reach of 10 cells the same chord floats 3.51 cells, which is
// the beam leaving the planet. The error grows as t²/2 and there is no reach
// at which it is worth approximating.
//
// Worse than the drawing, the SIM had three disagreeing notions of "along":
//
//   - the wall walk normalised a chord point (`norm3(from + dir*m)`), which
//     points the right way but under-reaches — 15.7% short at 10 cells,
//     because atan(t) is not t;
//   - the enemy test used the raw chord, so a body sitting on the ground
//     8 cells out was 0.19 world units off the line and simply never hit;
//   - only the drawing lifted, and it lifted the wrong curve.
//
// One parameterisation fixes all three: arc LENGTH. On a unit sphere the
// arc length from a point equals the angle in radians, so a reach of
// `cells * cellSide` world units along the ground is exactly that many
// radians — no conversion, and `arcPoint` lands on the surface by
// construction rather than by a normalise that quietly rescales the distance.
//
// Pure module: no DOM, no three.js, plain [x,y,z] arrays like grid.js.
// `from` must be a unit vector; `dir` must be a UNIT TANGENT at `from`
// (perpendicular to it) — the same thing td-tab already builds by projecting
// the gun's world forward onto the tangent plane.

// The point `s` radians along the great circle leaving `from` toward `dir`.
// Unit length for any s, exactly — this is the circle, not an approximation
// of it.
export function arcPoint(from, dir, s) {
  const c = Math.cos(s), n = Math.sin(s);
  return [
    from[0] * c + dir[0] * n,
    from[1] * c + dir[1] * n,
    from[2] * c + dir[2] * n,
  ];
}

// The unit tangent at that point — the direction the beam is still travelling
// after `s`. It is the derivative of arcPoint, and it stays perpendicular to
// arcPoint(s), which is what makes a swept width sit flat on the ground.
export function arcTangent(from, dir, s) {
  const c = Math.cos(s), n = Math.sin(s);
  return [
    dir[0] * c - from[0] * n,
    dir[1] * c - from[1] * n,
    dir[2] * c - from[2] * n,
  ];
}

// Where does `p` fall along this arc, and how far off it?
//
//   s   arc length from `from` to the nearest point ON the great circle.
//       NEGATIVE when p is behind the muzzle — callers must reject those
//       rather than take an absolute value, or the beam fires backwards.
//   off 3-D distance from p to that arc point. This deliberately counts
//       ALTITUDE as well as lateral offset: something hovering above the
//       ground is not in the beam, and the old chord test measured 3-D
//       distance too, so the hit radii carry over unchanged.
//
// atan2 gives the signed angle directly; no normalise, no acos (which loses
// precision near zero, exactly where the muzzle is).
export function projectToArc(from, dir, p) {
  const a = p[0] * from[0] + p[1] * from[1] + p[2] * from[2];
  const b = p[0] * dir[0] + p[1] * dir[1] + p[2] * dir[2];
  const s = Math.atan2(b, a);
  const q = arcPoint(from, dir, s);
  const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2];
  return { s, off: Math.sqrt(dx * dx + dy * dy + dz * dz) };
}

// How far a straight chord of arc-length `s` sags below the surface at its
// midpoint, in the same units. This is the number that decides how many
// straight segments a curved beam needs: the renderer draws straight ribbons,
// so the arc is approximated by a chain and this is the error of one link.
export function chordSag(s) {
  return 1 - Math.cos(s / 2);
}

// Segments needed to keep that sag under `tol` across a total arc of `s`.
// Solved rather than guessed: sag ≈ (s/n)²/8, so n ≈ s / sqrt(8·tol).
// Clamped to [1, max] because a caller drawing per-segment meshes is paying
// a draw call for each one and a beam is not worth twenty.
export function arcSegments(s, tol, max = 12) {
  if (!(s > 0) || !(tol > 0)) return 1;
  const n = Math.ceil(s / Math.sqrt(8 * tol));
  return Math.max(1, Math.min(max, n));
}
