// ISAO'S PRINT PATH — where the nozzle is depositing, moment to moment.
//
// The beam used to be a straight line from the nozzle to the middle of the
// cell, flickering. That reads as a laser, not as a printer. A printer's
// tell is that the HEAD MOVES: it rasters infill, it walks a perimeter, and
// it stops extruding while it travels. So the beam's far end now sweeps a
// path over the cell and the three patterns cycle, which is what makes a
// build look like a build rather than a beam pointed at the ground.
//
// Pure on purpose: these are functions of phase alone — deterministic, no
// clock, no rng — so the shapes can be checked in Node instead of squinted
// at through a browser.

export const PRINT_PATTERNS = ['zigzag', 'spiral', 'blink'];
export const PATTERN_SECS = 1.4;   // how long each one runs before the next
const ZIG_ROWS = 5;                // raster lines across the bed
const SPIRAL_TURNS = 2.5;

// Which pattern is running, and how far through it we are.
// Deliberately handles negative t (a probe may wind the clock backwards).
export function printPhase(t, secs = PATTERN_SECS) {
  const i = Math.floor(t / secs);
  const idx = ((i % PRINT_PATTERNS.length) + PRINT_PATTERNS.length) % PRINT_PATTERNS.length;
  return { pattern: PRINT_PATTERNS[idx], u: t / secs - i };
}

// HOW LONG EACH PATTERN GETS, for a build of this length. A fixed 1.4s
// looked fine until it was measured: a `single` prints in ~2.9s, which is
// two slices, so the third pattern never appeared at all. Sizing the slice
// to the job guarantees every build shows the whole cycle however short it
// is, while longer builds keep the steadier cadence and simply repeat.
export function patternSecsFor(dur, cap = PATTERN_SECS) {
  return Math.max(0.05, Math.min(cap, dur / PRINT_PATTERNS.length));
}

const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);

// Where the head is, as an offset in the unit disc: x and y both in [-1, 1].
// The caller maps this onto the cell's tangent plane.
export function printOffset(pattern, u) {
  const p = clamp01(u);
  if (pattern === 'spiral') {
    // outward walk — a perimeter closing in on itself
    const a = p * SPIRAL_TURNS * Math.PI * 2;
    const r = p;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }
  if (pattern === 'blink') {
    // travel moves: the head hops between parked corners and does not
    // extrude on the way. Four stops, so it reads as deliberate, not jitter.
    const stops = [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]];
    return stops[Math.min(stops.length - 1, Math.floor(p * stops.length))];
  }
  // zigzag (the default): boustrophedon raster, the classic infill
  const row = Math.min(ZIG_ROWS - 1, Math.floor(p * ZIG_ROWS));
  const s = clamp01(p * ZIG_ROWS - row);
  const x = row % 2 === 0 ? s * 2 - 1 : 1 - s * 2;
  const y = -1 + 2 * ((row + 0.5) / ZIG_ROWS);
  return [x, y];
}

// Is the nozzle actually extruding? A printer that never stops laying
// material looks like a laser again — the gaps are the point.
export function printOn(pattern, u) {
  const p = clamp01(u);
  if (pattern === 'blink') {
    // on at each stop, off across the hop between them
    const stops = 4;
    return (p * stops) % 1 < 0.55;
  }
  if (pattern === 'zigzag') {
    // a short retraction at each row turnaround
    const row = p * ZIG_ROWS;
    const s = row - Math.floor(row);
    return s > 0.06 && s < 0.94;
  }
  return true;   // the spiral is one continuous bead
}
