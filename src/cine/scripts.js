// cine/scripts.js — THE DIRECTOR'S SCRIPTS (plan §9): a cinematic as a
// scripted run of the board itself. A script is a rail (rail.js keys, in
// the board's units — cells — relative to the tank at t=0) and cues the
// board executes when its clock crosses them, the way the sound rail's cues
// fire. The board (td-tab, ?director=NAME) exposes exactly these verbs:
//
//   spawn    { type, count, gate: 'nearest'|'far'|index, every }  queue enemies at a gate
//   tower    { key, count, near: 'heart'|'tank'|'gate' }          Isao-free placement, paid
//   goto     { to: 'gate'|'heart'|'far'|ci }                       AUTO drive to a cell
//   throttle { v }                                                 manual drive, -1..1
//   steer    { v }                                                 -1 left, 0, 1 right (held)
//   fire     {}                                                    one main-gun shell
//   laser    { on }                                                secondaries held on/off
//   engine   { on }                                                spool up (a nudge) / stopEngine
//   view     { name }                                              the board's own views
//   strike   { target: 'crowd'|'gate'|'tank' }                     safety → paint → launch
//   radar    { zoom, over }                                        the scope scaled up in place, over N s
//   hud      { show: 'full'|'radar'|'none' }
//   biomass  { n }
//   warp     { to: 'open'|ci }                                     set the tank down on a cell, stopped
//   gate     { count, hops: [lo, hi] }                              raise gates side by side, hops from the tank
//
// A rail key may say at: 'tank' (default) | 'gates' | 'target' — the frame
// it is authored in; the frame switches at the key (a cut). spawn's gate
// may be 'raised' (the gates the script raised, alternating); strike's
// target may be 'gates'.
//
// A script may also say waves:false (the board's own wave clock held) and
// immune:false (the run can be lost; default: it cannot).
//
// Pure: no three.js, no DOM. Node-tested (test/scripts.mjs): cues in
// range and sorted, every verb known, every rail key well-formed.

export const VERBS = ['spawn', 'tower', 'goto', 'throttle', 'steer', 'fire', 'laser', 'engine', 'view', 'strike', 'radar', 'hud', 'biomass', 'warp', 'gate'];
export const ANCHORS = ['tank', 'gates', 'target'];

// Rail keys: pos/look in CELLS, in the tank's frame at t=0 — x right, y up
// (off the surface), z forward (the tank's heading). The board maps them
// onto the sphere at the tank's start cell.
export const SCRIPTS = {
  // THE RAM: 200 phage from every gate, the tank on AUTO through them,
  // the knot last, the radar zoom on the proximity danger.
  ram: {
    len: 30, seed: 4414, hud: 'radar',
    rail: [
      { t: 0, pos: [-3.0, 1.6, -4.5], look: [0, 0.4, 2], fov: 42 },      // behind-left, low
      { t: 6, pos: [-2.2, 1.2, -3.2], look: [0, 0.4, 3] },
      { t: 12, pos: [3.4, 2.4, -2.0], look: [0, 0.3, 4] },               // swing to the right shoulder
      { t: 19, pos: [0.0, 4.5, -6.0], look: [0, 0.2, 5] },               // up and back: the crowd
      { t: 25, pos: [2.5, 1.0, 4.5], look: [0, 0.6, 0] },                // ahead, the tank coming at us
      { t: 30, pos: [2.5, 1.0, 4.5], look: [0, 0.6, 0] },
    ],
    cues: [
      { t: 0.0, do: 'biomass', n: 2000 },
      { t: 0.0, do: 'hud', show: 'radar' },
      // the crowd on the tank's own path: 140 down the lane it drives up,
      // 60 more from the next gate for the wide shot
      { t: 0.0, do: 'spawn', type: 'phage', count: 140, gate: 'nearest', every: 0.1 },
      { t: 0.0, do: 'spawn', type: 'phage', count: 60, gate: 1, every: 0.15 },
      { t: 0.5, do: 'goto', to: 'gate' },
      { t: 13.0, do: 'spawn', type: 'knot', count: 1, gate: 'nearest', every: 0, scale: 3 },   // ONE large torus boss
      { t: 17.0, do: 'goto', to: 'boss' },
      { t: 20.0, do: 'radar', zoom: 2.8, over: 4.0 },
      { t: 26.0, do: 'goto', to: 'heart' },
    ],
  },

  // THE STRIKE (operator, 2026-09-04: "hit a dual portal from which a
  // large wave emerged — dramatic"): two gates raised side by side, the
  // wave pouring out at the lens, a cut to the tank and the console — the
  // safety, the launch — the strikecam riding the munition down (the
  // board's own camera; the rail yields), and the rail back on the crater
  // and the dead gates as the crowd scatters.
  strike: {
    len: 32, seed: 4414, hud: 'full', waves: false,
    rail: [
      { t: 0, at: 'gates', pos: [0.0, 0.9, 3.2], look: [0, 0.6, 0], fov: 40 },     // in front of the dual portal, facing it
      { t: 5, at: 'gates', pos: [1.6, 1.4, 4.2], look: [0, 0.6, -0.5] },
      { t: 9, at: 'gates', pos: [-1.8, 2.2, 5.5], look: [0, 0.5, 0] },
      { t: 9.05, at: 'tank', pos: [-1.3, 1.1, -2.4], look: [0, 0.6, 1.5] },        // CUT: the tank and the console
      { t: 13, at: 'tank', pos: [-1.1, 1.0, -2.0], look: [0, 0.6, 1.5] },
      { t: 20, at: 'target', pos: [0.0, 2.6, 4.5], look: [0, 0.3, 0] },            // the rail is back at impact: the crater
      { t: 26, at: 'target', pos: [2.6, 3.0, 6.0], look: [0, 0.3, 0] },
      { t: 32, at: 'target', pos: [4.0, 4.5, 9.0], look: [0, 0.2, 0] },
    ],
    cues: [
      { t: 0.0, do: 'biomass', n: 2000 },
      { t: 0.0, do: 'gate', count: 2, hops: [8, 13] },
      { t: 0.0, do: 'spawn', type: 'phage', count: 150, gate: 'raised', every: 0.06 },
      { t: 0.0, do: 'spawn', type: 'drifter', count: 10, gate: 'raised', every: 0.5 },
      { t: 1.0, do: 'spawn', type: 'corona', count: 4, gate: 'raised', every: 1.2 },
      { t: 12.0, do: 'strike', target: 'gates' },
    ],
  },

  // THE TANK v2: engine off, on and off for the hydraulics, on for good,
  // move, a main, the secondaries under the zoom.
  tank: {
    len: 24, seed: 4414, hud: 'none', waves: false,
    rail: [
      { t: 0, pos: [-1.6, 0.5, 1.4], look: [0, 0.3, 0], fov: 36 },      // low, three-quarter front
      { t: 4, pos: [-1.3, 0.6, 1.1], look: [0, 0.35, 0] },
      { t: 8, pos: [1.4, 0.7, -0.9], look: [0, 0.35, 0.4] },             // the other side, as it spools
      { t: 12, pos: [1.2, 0.9, -1.8], look: [0, 0.4, 1.5] },             // behind the shoulder, rolling
      { t: 16, pos: [-1.8, 1.2, 1.6], look: [0, 0.5, 1.5] },             // front-left, the main
      { t: 20, pos: [1.9, 0.8, 2.3], look: [0, 0.5, 0.5] },              // the zoom around, secondaries
      { t: 24, pos: [-2.2, 1.4, -2.0], look: [0, 0.4, 0.5] },
    ],
    cues: [
      { t: 0.0, do: 'hud', show: 'none' },
      { t: 0.0, do: 'warp', to: 'open' },                                 // out of the berth cluster: room
      { t: 0.0, do: 'engine', on: false },
      { t: 2.0, do: 'engine', on: true },
      { t: 4.5, do: 'engine', on: false },
      { t: 6.5, do: 'engine', on: true },
      { t: 9.0, do: 'throttle', v: 0.7 },
      { t: 12.0, do: 'steer', v: 1 },
      { t: 13.5, do: 'steer', v: 0 },
      { t: 15.0, do: 'throttle', v: 0 },
      { t: 16.5, do: 'fire' },
      { t: 19.0, do: 'laser', on: true },
      { t: 23.0, do: 'laser', on: false },
    ],
  },
};

export const SCRIPT_NAMES = Object.keys(SCRIPTS);
