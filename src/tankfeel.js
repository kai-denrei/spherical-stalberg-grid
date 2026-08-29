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
};

export function makeTankFeel() {
  return { hoverT: 0, settleT: 99, t: 0 };
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
  return st;
}

// Call when the tank sets down, to start the rock.
export function landTankFeel(st) { st.settleT = 0; }

// Write the state onto a unit. Units with no hover split (a dot cloud, the
// procedural tank) are left alone — they have no suspension to compress.
export function applyTankFeel(unit, st, p = TANK_FEEL) {
  const body = unit && unit.userData && unit.userData.hoverBody;
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
  if (st.settleT < 1.1) {
    const d = Math.exp(-st.settleT * p.decay);
    body.rotation.x = Math.sin(st.settleT * 15) * p.rock * d;
    body.rotation.z = Math.cos(st.settleT * 11) * p.rock * 0.62 * d;
  } else if (body.rotation.x || body.rotation.z) {
    body.rotation.x = 0;
    body.rotation.z = 0;
  }
}

// --- health, as a diegetic readout -----------------------------------------
// The mast on the tank's back is the health gauge: cool blue at full, through
// amber, to red. A number in a corner of the HUD tells you the same thing, but
// this one is ON the machine you are watching.
const HEALTH_STOPS = [
  [0.0, [1.00, 0.18, 0.12]],  // red
  [0.5, [1.00, 0.55, 0.10]],  // orange
  [1.0, [0.55, 0.90, 1.00]],  // light blue
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

// Paint a unit's health beam. Safe on units that have none.
export function applyTankHealth(unit, frac) {
  const beam = unit && unit.userData && unit.userData.healthBeam;
  if (!beam) return;
  const [r, g, b] = healthColor(frac);
  const mats = Array.isArray(beam.material) ? beam.material : [beam.material];
  for (const m of mats) {
    if (!m) continue;
    if (m.color) m.color.setRGB(r, g, b);
    if (m.emissive) m.emissive.setRGB(r * 0.85, g * 0.85, b * 0.85);
  }
}
