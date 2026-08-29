// tankfeel.js — how a hover tank FEELS: the body lifting off its skirt, the
// idle vibration while the engine runs, and the rock as it sets back down.
//
// It lives in its own module because two places drive it: the game, and the
// unit viewer's test bench. Tuning it in the viewer and shipping something
// different in the game would defeat the point of the bench, so both call
// exactly this.
//
// No three.js import: it only writes to `.position` / `.rotation` on objects
// handed to it, so it is Node-testable against plain stand-ins.

export const TANK_FEEL = {
  rise: 0.14,      // body lifts this far, in MODEL units
  gearDrop: 0.05,  // and the skirt settles the other way — the GAP is the read
  up: 1.9,         // spool-up rate
  down: 2.6,       // settle rate; a touch quicker, so it drops rather than sinks
  rock: 0.016,     // touchdown tilt, radians
  decay: 5.0,      // how fast that rock dies
  vib: 0.008,      // running vibration, model units — a weak cousin of recoil
  recoilLen: 0.35,     // seconds a shot's kick lasts
  recoilSlide: 0.18,   // turret slides back this far, model units
  recoilShudder: 0.03, // high-frequency judder on the slide
  recoilPitch: 0.05,   // body noses up, radians
};

// --- the knob schema -------------------------------------------------------
// One description of every tunable, so the game's GUI folder and the unit
// viewer's modal are built from the SAME list. They used to be two: the game
// held a hand-written folder over its own `hover*` mirror while the viewer
// read these defaults, which meant tuning in the viewer changed nothing that
// shipped — the exact drift this module was extracted to prevent.
//
// Ranges are deliberately narrow. Every one of these was guessed wrong by eye
// at least once (the first hover rise was 90% of the tank's height), so the
// slider should not be able to reach a value that is obviously absurd.
export const TANK_FEEL_KNOBS = [
  { key: 'rise',          label: 'body rise',      group: 'hover',  min: 0,    max: 0.6,  step: 0.005 },
  { key: 'gearDrop',      label: 'skirt drop',     group: 'hover',  min: 0,    max: 0.3,  step: 0.005 },
  { key: 'up',            label: 'spool up',       group: 'hover',  min: 0.4,  max: 6,    step: 0.1 },
  { key: 'down',          label: 'settle down',    group: 'hover',  min: 0.4,  max: 6,    step: 0.1 },
  { key: 'rock',          label: 'touchdown rock', group: 'hover',  min: 0,    max: 0.06, step: 0.002 },
  { key: 'decay',         label: 'rock decay',     group: 'hover',  min: 1.5,  max: 10,   step: 0.5 },
  { key: 'vib',           label: 'idle vibration', group: 'hover',  min: 0,    max: 0.04, step: 0.001 },
  { key: 'recoilLen',     label: 'kick length',    group: 'recoil', min: 0.05, max: 1,    step: 0.01 },
  { key: 'recoilSlide',   label: 'turret slide',   group: 'recoil', min: 0,    max: 0.6,  step: 0.01 },
  { key: 'recoilShudder', label: 'shudder',        group: 'recoil', min: 0,    max: 0.12, step: 0.005 },
  { key: 'recoilPitch',   label: 'nose-up pitch',  group: 'recoil', min: 0,    max: 0.2,  step: 0.005 },
];

// A fresh, mutable set of values — what the sliders write to.
export function makeFeelParams(src = TANK_FEEL) {
  const p = {};
  for (const k of TANK_FEEL_KNOBS) p[k.key] = src[k.key];
  return p;
}

// Fold a loose object (a stored blob, a URL param) onto a params set, keeping
// only known keys and only finite values inside their declared range. Anything
// restored from outside the app is untrusted input, including our own
// localStorage after a schema change.
export function clampFeelParams(p, src = {}) {
  for (const k of TANK_FEEL_KNOBS) {
    const v = Number(src[k.key]);
    if (Number.isFinite(v)) p[k.key] = Math.min(k.max, Math.max(k.min, v));
  }
  return p;
}

// The tuned values as a paste-ready source block. Without this, a good setting
// lives in one browser and never reaches the repo, which makes the whole bench
// a toy — you can find the right feel and still not be able to ship it.
export function formatFeelCode(p) {
  const groups = [...new Set(TANK_FEEL_KNOBS.map((k) => k.group))];
  const w = Math.max(...TANK_FEEL_KNOBS.map((k) => k.key.length));
  const body = groups.map((g) => TANK_FEEL_KNOBS.filter((k) => k.group === g)
    .map((k) => `  ${(k.key + ':').padEnd(w + 1)} ${round(p[k.key], k.step)},`.padEnd(30)
                + ` // ${k.label}`)
    .join('\n')).join('\n\n');
  return `export const TANK_FEEL = {\n${body}\n};`;
}

// Snap to the slider's own precision, so a drag never emits 0.13999999999.
function round(v, step) {
  const dp = Math.max(0, Math.ceil(-Math.log10(step)));
  return Number(Number(v).toFixed(dp));
}

export function makeTankFeel() {
  return { hoverT: 0, settleT: 99, t: 0, recoil: 0 };
}

// Advance the state. `running` is the engine's own notion of running, so the
// visible gesture and the audible one cannot drift apart.
export function stepTankFeel(st, dt, running, p = TANK_FEEL) {
  if (!(dt > 0)) return st;
  st.t += dt;
  const target = running ? 1 : 0;
  const rate = target > st.hoverT ? p.up : p.down;
  st.hoverT += (target - st.hoverT) * Math.min(1, rate * dt);
  if (st.settleT < 4) st.settleT += dt;
  if (st.recoil > 0) st.recoil = Math.max(0, st.recoil - dt);
  return st;
}

// Call when the tank sets down, to start the rock.
export function landTankFeel(st) { st.settleT = 0; }

// Call on firing. The kick is part of how the tank FEELS, so it lives here
// with the rest of it — the viewer's bench gets the same shot the game does.
export function fireTankFeel(st, p = TANK_FEEL) { st.recoil = p.recoilLen; }

// Write the state onto a unit. Units with no hover split (a dot cloud, the
// procedural tank) are left alone — they have no suspension to compress.
export function applyTankFeel(unit, st, p = TANK_FEEL) {
  if (!unit || !unit.userData) return;

  // --- recoil. The turret takes the kick; it works on any unit with one,
  // hover split or not, so it is handled before the early return below.
  const rf = p.recoilLen > 0 ? Math.max(0, st.recoil / p.recoilLen) : 0;
  const rk = rf * rf;   // squared: a hard hit that lets go quickly
  const turret = unit.userData.turret;
  if (turret) {
    const shudder = rf > 0 ? Math.sin((p.recoilLen - st.recoil) * 70) * p.recoilShudder * rk : 0;
    turret.position.z = (turret.userData.baseZ ?? 0) - p.recoilSlide * rk + shudder;
  }

  const body = unit.userData.hoverBody;
  if (!body) return;
  const h = st.hoverT;

  // The expansion IS the tell: body up, skirt down, so the gap between them
  // opens as the engine takes load and closes as it lets go.
  body.position.y = p.rise * h;
  const gear = unit.userData.hoverGear;
  if (gear) gear.position.y = -p.gearDrop * h;

  // Running vibration — two incommensurate frequencies so it reads as a
  // machine idling rather than as one clean oscillation. Scaled by hover, so
  // it arrives with the engine instead of switching on.
  const v = p.vib * h;
  body.position.x = Math.sin(st.t * 38.0) * v;
  body.position.z = Math.sin(st.t * 29.3) * v * 0.7;

  // Touchdown rock, on the body only: the hull settles onto the skirt.
  // Touchdown rock and recoil pitch both live on the body, SUMMED rather
  // than assigned in turn — firing mid-landing should read as both, and two
  // writes to rotation.x would silently keep only the last.
  let rx = 0, rz = 0;
  if (st.settleT < 1.1) {
    const d = Math.exp(-st.settleT * p.decay);
    rx += Math.sin(st.settleT * 15) * p.rock * d;
    rz += Math.cos(st.settleT * 11) * p.rock * 0.62 * d;
  }
  if (rf > 0) rx += -p.recoilPitch * rk;   // noses up under the kick
  body.rotation.x = rx;
  body.rotation.z = rz;
}

// --- health, as a diegetic readout -----------------------------------------
// The machine's own running lights are the gauge: cool blue at full, through
// amber, to red. A number in a corner of the HUD tells you the same thing, but
// this one is ON the thing you are watching, and it is legible from every
// camera because the accents wrap the hull rather than facing one way.
const DIFFUSE_FLOOR = 0.22;   // how much of the hue survives in the body colour

// Saturated on purpose. These drive EMISSIVE, and a pale tint at full
// emissive resolves to white — the earlier sky-blue full-health stop read as
// "the lights are on", not "the lights are blue". Each channel also ramps one
// way across the three stops, so no colour doubles back on its way down.
const HEALTH_STOPS = [
  [0.0, [1.00, 0.10, 0.04]],  // red
  [0.5, [1.00, 0.45, 0.05]],  // orange
  [1.0, [0.20, 0.70, 1.00]],  // blue
];

export function healthColor(frac) {
  const f = Math.min(1, Math.max(0, frac));
  for (let i = 1; i < HEALTH_STOPS.length; i++) {
    const [b, cb] = HEALTH_STOPS[i];
    if (f > b && i < HEALTH_STOPS.length - 1) continue;
    const [a, ca] = HEALTH_STOPS[i - 1];
    const k = b === a ? 0 : (f - a) / (b - a);
    return [ca[0] + (cb[0] - ca[0]) * k,
            ca[1] + (cb[1] - ca[1]) * k,
            ca[2] + (cb[2] - ca[2]) * k];
  }
  return HEALTH_STOPS[HEALTH_STOPS.length - 1][1];
}

// Resolve a health target down to the materials it paints. The target may be
// a material, a mesh, or an array of either: the mkcx hands over the single
// accent material its running lights all share, while a simpler unit might
// hand over one mesh. Meshes are unwrapped first, since a mesh carrying a
// `material` is not itself one.
function healthMaterials(target, out = []) {
  if (!target) return out;
  if (Array.isArray(target)) { for (const t of target) healthMaterials(t, out); return out; }
  if (target.material) return healthMaterials(target.material, out);
  if (target.color || target.emissive) out.push(target);
  return out;
}

// Paint a unit's health accents. Safe on units that have none.
export function applyTankHealth(unit, frac) {
  const mats = healthMaterials(unit && unit.userData && unit.userData.healthBeam);
  if (!mats.length) return;
  const [r, g, b] = healthColor(frac);
  for (const m of mats) {
    // The hue goes in EMISSIVE and the diffuse stays dark. These are running
    // lights: lit at full diffuse they wash toward white under the scene's
    // key light, and a gauge that reads white at full health is not a gauge.
    // Dark body + hot emissive keeps the strip saturated at every level, and
    // it is the emissive that the bloom pass picks up.
    if (m.color) m.color.setRGB(r * DIFFUSE_FLOOR, g * DIFFUSE_FLOOR, b * DIFFUSE_FLOOR);
    if (m.emissive) m.emissive.setRGB(r, g, b);
  }
}
