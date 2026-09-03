// cine/sound.js — THE SOUND RAIL (plan phase 4, ruling 5.6): a cinematic
// re-uses the game's own sounds where one fits and is SPACE SILENCE where
// none does. No new sound is authored for a cinematic.
//
// A rail is cues: { t, key, gain }, key an audiomanifest.js name. Two
// clients: the cine tab plays a cue through sfx.play the moment the live
// clock crosses it (never on a seek — a capture is silent, the sound goes
// on afterwards), and scripts/cine-mux.mjs lays the same cues onto the
// finished clip with ffmpeg. One rail, two outputs, so they cannot drift.
//
// Pure: no three.js, no DOM. Tested in Node (test/sound.mjs).

export const SOUND_RAILS = {
  // THE GATE: the throat's warning as the march flies out; the tension
  // under the pull-back; the alert as the swarm comes through
  gate: [
    { t: 0.15, key: 'portal_warn', gain: 0.9 },
    { t: 4.2, key: 'boss_tension', gain: 0.55 },
    { t: 7.5, key: 'danger_alert', gain: 0.8 },
    { t: 8.4, key: 'danger_alert', gain: 0.5 },
  ],
  // THE PLANET: space silence, then the tension as the graze begins
  planet: [
    { t: 6.8, key: 'boss_tension', gain: 0.35 },
  ],
  // THE TANK: the engine under everything; three mains; the spool, the
  // beam, the spool down; the thruster as it rolls out
  tank: [
    { t: 0.0, key: 'tank_engine', gain: 0.5 },
    { t: 1.0, key: 'tank_engine', gain: 0.5 },
    { t: 2.0, key: 'tank_engine', gain: 0.5 },
    { t: 3.6, key: 'tank_main', gain: 1.0 },
    { t: 4.7, key: 'tank_main', gain: 1.0 },
    { t: 5.8, key: 'tank_main', gain: 1.0 },
    { t: 6.1, key: 'tank_spool_up', gain: 0.9 },
    { t: 6.3, key: 'tank_beam', gain: 0.9 },
    { t: 9.0, key: 'tank_spool_down', gain: 0.8 },
    { t: 9.0, key: 'tank_thruster', gain: 0.7 },
    { t: 11.6, key: 'tank_thruster', gain: 0.5 },
  ],
};

// The cues a live clock crossed between two frames: (t0, t1]. A loop that
// wraps (t1 < t0) crosses everything after t0 and everything up to t1.
export function cuesBetween(rail, t0, t1) {
  if (!rail || !rail.length) return [];
  if (t1 >= t0) return rail.filter((c) => c.t > t0 && c.t <= t1);
  return rail.filter((c) => c.t > t0 || c.t <= t1);
}
