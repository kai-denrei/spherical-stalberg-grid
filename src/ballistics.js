// ballistics.js — THE SNIPER'S PHYSICS: flight, drop, wind, sway, zero, and
// the firing solution. Pure: no DOM, no three.js, Node-tested in
// test/ballistics.mjs. sniper-tab.js owns the scope, the reticle and the rifle.
//
// ONE INTEGRATOR, USED FOR EVERYTHING. The bullet that flies, the drop the
// HUD prints, the hold the reticle marks and the angle the zero solves for
// all come out of `step`. This is the project's standing rule — values that
// must agree with each other are DERIVED from one source, never computed
// twice — and it matters more here than anywhere else it has come up: a
// sniper mechanic is a promise that the number on the screen is the number
// the bullet obeys. Two implementations of "where does it land" is a scope
// that lies, and a scope that lies is not difficult, it is broken.
//
// Coordinates: the shooter is at the origin looking down +Z, +Y is up, +X is
// right. Metres and seconds throughout.

import { makeParams, clampParams, formatKnobs, knobProblems } from './knobs.js?v=2cd00e0f';

export const BALLISTICS_TUNE = {
  muzzleVel: 700,     // m/s
  gravity: 9.81,      // m/s² — a knob, because this is not Earth
  drag: 0.0009,       // per metre of travel, velocity-proportional. Small,
                      // but it is what makes the far shots disproportionately
                      // hard rather than merely further
  zero: 400,          // m — where the scope's line of sight meets the arc
  // ALIEN WINDS (the brief). Strong enough to be the dominant correction at
  // distance, and gusting, so a shot held too long is a different shot.
  wind: 12,           // m/s mean
  windDir: 90,        // degrees; 90 = full value from the left
  gust: 0.45,         // ±fraction of the mean, breathing over gustPeriod
  gustPeriod: 7.0,    // s
  // THE SWAY. Two circles at incommensurate rates, so the reticle never
  // repeats a path the player can learn — plus a slow drift, because a rifle
  // that wobbles around a fixed centre is a rifle you can average out.
  swayFast: 0.55,     // milliradians
  swaySlow: 1.30,
  swayRateFast: 1.9,  // rad/s
  swayRateSlow: 0.61,
  hold: 0.18,         // sway multiplier while the breath is held
  holdSecs: 6.0,      // ...for this long
  holdRecover: 9.0,   // and this long to get it back
};

// The integrator's own settings, NOT player knobs — which is why they are
// constants rather than tune fields: a value in the tune with no knob is a
// value the knob table cannot check, and `knobProblems` says so.
export const STEP = 0.004;    // s per tick
export const MAX_T = 6.0;     // s before a round is written off

export const BALLISTICS_KNOBS = [
  { key: 'muzzleVel', label: 'muzzle velocity (m/s)', group: 'round', min: 120, max: 1400, step: 10 },
  { key: 'gravity', label: 'gravity (m/s²)', group: 'round', min: 0, max: 30, step: 0.1 },
  { key: 'drag', label: 'drag', group: 'round', min: 0, max: 0.01, step: 0.0001 },
  { key: 'zero', label: 'zeroed at (m)', group: 'scope', min: 50, max: 1500, step: 10 },
  { key: 'wind', label: 'wind (m/s)', group: 'wind', min: 0, max: 40, step: 0.5 },
  { key: 'windDir', label: 'wind from (deg)', group: 'wind', min: 0, max: 359, step: 1 },
  { key: 'gust', label: 'gust (±)', group: 'wind', min: 0, max: 1.5, step: 0.05 },
  { key: 'gustPeriod', label: 'gust period (s)', group: 'wind', min: 1, max: 30, step: 0.5 },
  { key: 'swayFast', label: 'sway fast (mrad)', group: 'sway', min: 0, max: 6, step: 0.05 },
  { key: 'swaySlow', label: 'sway slow (mrad)', group: 'sway', min: 0, max: 8, step: 0.05 },
  { key: 'swayRateFast', label: 'sway rate fast', group: 'sway', min: 0.1, max: 8, step: 0.05 },
  { key: 'swayRateSlow', label: 'sway rate slow', group: 'sway', min: 0.05, max: 4, step: 0.01 },
  { key: 'hold', label: 'held-breath sway', group: 'sway', min: 0, max: 1, step: 0.02 },
  { key: 'holdSecs', label: 'breath (s)', group: 'sway', min: 1, max: 20, step: 0.5 },
  { key: 'holdRecover', label: 'recover (s)', group: 'sway', min: 1, max: 30, step: 0.5 },
];

export const makeBallisticsParams = (src = BALLISTICS_TUNE) => makeParams(BALLISTICS_KNOBS, src);
export const clampBallisticsParams = (p, src) => clampParams(BALLISTICS_KNOBS, p, src);
export const formatBallisticsTune = (p) => formatKnobs('BALLISTICS_TUNE', BALLISTICS_KNOBS, p);
export const ballisticsKnobProblems = () => knobProblems(BALLISTICS_KNOBS, BALLISTICS_TUNE);

export const MRAD = 1000;   // milliradians per radian, for the reticle
export const toMrad = (metres, range) => (range > 0 ? (metres / range) * MRAD : 0);
export const fromMrad = (mrad, range) => (mrad / MRAD) * range;

// The wind vector at time t: mean plus a gust that breathes. `windDir` is the
// bearing the wind comes FROM, so a 90° wind pushes the round to the right.
export function windAt(t, tune = BALLISTICS_TUNE) {
  const g = 1 + tune.gust * Math.sin((t / Math.max(0.01, tune.gustPeriod)) * Math.PI * 2);
  const s = tune.wind * g;
  const a = (tune.windDir * Math.PI) / 180;
  return [Math.sin(a) * s, 0, -Math.cos(a) * s];
}

// ONE STEP of the round. Wind acts on the round's velocity RELATIVE to the
// air, which is why a tail wind barely matters and a cross wind is the whole
// correction: the drag term is what couples them, so a drag of zero gives a
// wind of zero effect, correctly.
export function step(s, dt, tune = BALLISTICS_TUNE, w = null) {
  const air = w || windAt(s.t, tune);
  const rvx = s.v[0] - air[0], rvy = s.v[1] - air[1], rvz = s.v[2] - air[2];
  const rel = Math.hypot(rvx, rvy, rvz);
  const k = tune.drag * rel;
  s.v[0] += (-k * rvx) * dt;
  s.v[1] += (-k * rvy - tune.gravity) * dt;
  s.v[2] += (-k * rvz) * dt;
  s.p[0] += s.v[0] * dt;
  s.p[1] += s.v[1] * dt;
  s.p[2] += s.v[2] * dt;
  s.t += dt;
  return s;
}

// A round leaving at `elev` (radians above the sight line) and `az` (radians
// right of it). `frozenWind` pins the gust for a whole flight, which is what
// a real shot experiences — the gust at the moment of firing, not a new one
// each tick.
export function launch(elev, az, tune = BALLISTICS_TUNE, t0 = 0) {
  const v = tune.muzzleVel;
  return {
    p: [0, 0, 0],
    v: [Math.sin(az) * Math.cos(elev) * v, Math.sin(elev) * v, Math.cos(az) * Math.cos(elev) * v],
    t: 0,
    wind: windAt(t0, tune),
  };
}

// Fly it to a given DOWNRANGE distance and report where it is when it gets
// there. `drop` is negative when the round is below the sight line.
export function flyTo(range, elev, az = 0, tune = BALLISTICS_TUNE, t0 = 0) {
  const s = launch(elev, az, tune, t0);
  let last = { ...s, p: s.p.slice(), v: s.v.slice() };
  while (s.p[2] < range && s.t < (tune.maxTime ?? MAX_T)) {
    last = { p: s.p.slice(), v: s.v.slice(), t: s.t };
    step(s, (tune.step ?? STEP), tune, s.wind);
  }
  if (s.t >= (tune.maxTime ?? MAX_T)) return { drop: NaN, drift: NaN, time: s.t, reached: false };
  // linear interpolation onto the exact plane, so the answer does not
  // quantise to the integrator's step
  const span = s.p[2] - last.p[2];
  const f = span > 1e-9 ? (range - last.p[2]) / span : 0;
  return {
    drop: last.p[1] + (s.p[1] - last.p[1]) * f,
    drift: last.p[0] + (s.p[0] - last.p[0]) * f,
    time: last.t + (s.t - last.t) * f,
    reached: true,
  };
}

// THE ZERO: the launch angle at which the round crosses the sight line at
// `range`. Bisection on the same integrator the bullet uses — so the rifle is
// zeroed against its own physics rather than against a formula that agrees
// with them only while the drag is nought.
export function zeroAngle(range, tune = BALLISTICS_TUNE) {
  let lo = 0, hi = 0.15;   // radians; 0.15 is ~8.6°, far past any sane zero
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const r = flyTo(range, mid, 0, tune, 0);
    if (!r.reached || r.drop < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// THE FIRING SOLUTION, for a rifle zeroed at `tune.zero`: how far ABOVE the
// target the reticle must sit, and how far INTO the wind, both in
// milliradians. This is what a chip prints, and what a good shot works out.
export function solution(range, tune = BALLISTICS_TUNE, t0 = 0) {
  const z = zeroAngle(tune.zero, tune);
  const r = flyTo(range, z, 0, tune, t0);
  if (!r.reached) return { drop: NaN, drift: NaN, holdUp: NaN, holdSide: NaN, time: NaN, reached: false };
  return {
    drop: r.drop, drift: r.drift, time: r.time, reached: true,
    // hold UP by the drop and INTO the drift — the signs are the corrections,
    // not the errors, because that is what a shooter reads off a reticle
    holdUp: toMrad(-r.drop, range),
    holdSide: toMrad(-r.drift, range),
  };
}

// --- the shooter ----------------------------------------------------------

export function makeShooter() {
  return { breath: 1, holding: false, shots: 0, hits: 0, best: Infinity };
}

// The breath: holding spends it, letting go recovers it, and it runs out.
// Returns true while the hold is actually steadying anything.
export function stepBreath(sh, dt, want, tune = BALLISTICS_TUNE) {
  const can = want && sh.breath > 0;
  sh.holding = can;
  if (can) { sh.breath = Math.max(0, sh.breath - dt / Math.max(0.01, tune.holdSecs)); return true; }
  // RECOVERY NEEDS A RELEASE. Leaning on the button once the breath is gone
  // must not quietly refill it — otherwise the cost of holding is a stutter
  // in the reticle rather than a decision about when to take the shot, and
  // the honest play becomes "hold it down the whole time".
  if (!want) sh.breath = Math.min(1, sh.breath + dt / Math.max(0.01, tune.holdRecover));
  return false;
}

// WHERE THE RIFLE IS POINTING, relative to where the shooter is aiming it:
// two circles at incommensurate rates so the path never repeats inside a
// shot, in milliradians. A held breath shrinks it but never stops it.
export function sway(t, sh, tune = BALLISTICS_TUNE) {
  const k = sh && sh.holding ? tune.hold : 1;
  const a = t * tune.swayRateFast, b = t * tune.swayRateSlow;
  return [
    (Math.sin(a) * tune.swayFast + Math.cos(b * 1.31) * tune.swaySlow) * k,
    (Math.cos(a * 1.17) * tune.swayFast + Math.sin(b) * tune.swaySlow) * k,
  ];
}

// The rangefinder, as a chip prints it — and as the eye estimates it: a
// target of known height subtending `mrad` in the scope is this far away.
export const rangeFromMrad = (targetHeight, mrad) =>
  (mrad > 1e-6 ? (targetHeight / mrad) * MRAD : Infinity);

// Did it hit? `miss` is the distance from the target's centre in metres.
export const hitsAt = (miss, radius) => miss <= radius;
