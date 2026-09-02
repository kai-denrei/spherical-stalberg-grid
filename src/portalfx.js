// portalfx.js — THE WORMHOLE, as the game runs it.
//
// The portal bench (#portal) tunes this; the board draws it. What lives here
// is the part that must not differ between them: the tuned numbers, and the
// rule that turns rates into phases. The two render sites stay thin.
//
// WHY A PHASE AND NOT A RATE. The shader used to compute travel as
// `T * uSpeed` — accumulated time times a rate — so moving the rate rewrote
// where the field had been for the whole session rather than changing how
// fast it flowed from now on. Measured, one 0.02 slider step moved the image
// by a mean pixel delta of 12.1 at t=2s and 28.1 at t=200s: a jump control
// that got more violent the longer the page had been open. It also made a
// RAMP impossible, and a ramp is exactly what the board wants. So the host
// integrates (phase += rate * dt) and the shader reads the phase.
//
// Pure-ish: this module owns numbers and arithmetic. It builds no three.js
// objects, so it is safe to import from anywhere and testable in Node.

// The operator's tuned wormhole, 2026-09-02, read off the bench's own export.
// Names are the shader's, so a paste is a paste and not a translation.
export const WORMHOLE_PRESET = {
  uSteps: 120,
  uTurbOctaves: 12,
  uThroatRadius: 1.98,
  uExposure: 150,
  uTurbAmp: 1.02,
  uTimeScale: 1.69,
  uTwist: 0,
  uHueSpread: 0.89,
};

// Render settings that are a COST decision rather than a look decision, kept
// apart for that reason: 512 x 120 steps x 12 octaves is ~377M sine-folds a
// frame, and the board has a whole game to draw around it.
export const WORMHOLE_RENDER = { size: 512, updateHz: 60 };

// The ring's own idle, also from the bench.
export const RING_SPIN = { rotorA: 0.77, rotorB: -0.09, yaw: 0 };

// --- the travel ramp ------------------------------------------------------
// "the travel speed is set to 0 by default, but 5 seconds before a new
// arrival of enemies, the travel speed increases to max 6" (operator).
//
// So it is a function of TIME UNTIL the wave, not of anything the portal
// knows about itself — the portal is a mouth that starts to pull just before
// something comes out of it.
export const TRAVEL = { idle: 0, max: 6, lead: 5 };

// Rate at `secs` seconds before the wave lands. Eased rather than linear: a
// linear ramp starts with a visible kink at exactly the 5-second mark, which
// announces the mechanic instead of the wave. smoothstep leaves idle quietly.
export function travelRate(secs, cfg = TRAVEL) {
  if (!Number.isFinite(secs)) return cfg.idle;
  if (secs >= cfg.lead) return cfg.idle;      // still far out: nothing stirs
  if (secs <= 0) return cfg.max;              // arriving, or already here
  const u = 1 - secs / cfg.lead;              // 0 at the lead, 1 at arrival
  return cfg.idle + (cfg.max - cfg.idle) * (u * u * (3 - 2 * u));
}

// Advance the integrated phases. `timeScale` is the shader's own clock
// multiplier, applied here so the phase and the turbulence agree about what a
// second is.
export function advancePhase(phase, dt, rate, timeScale = WORMHOLE_PRESET.uTimeScale,
  spinRate = 0.15) {
  phase.travel += rate * timeScale * dt;
  phase.spin += spinRate * timeScale * dt;
  return phase;
}
