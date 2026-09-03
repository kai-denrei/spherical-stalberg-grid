// lab.js — THE STRESS LAB, as data (operator, 2026-09-03).
//
// "An environment to stress-test our engine": infinite health, waves
// multiplied until the frame drops, a background that can be put in and
// taken out, the portal effect swapped and its cost knobs turned, and a
// number for all of it. It is a MODE on the real board (`?lab=1`), not a tab:
// a copy of the board would measure a copy, and the ROADMAP already names
// sibling tabs as the debt this repo pays for.
//
// This module is the part that is not three.js: what the lab's state looks
// like, how the URL seeds it, and what its console line says. The board
// consumes it under `lab.on && …` and nothing else — a run without the flag
// runs the code it ran yesterday.
import { clampParams, knobProblems } from './knobs.js';

export const LAB_DEFAULTS = {
  waveMult: 1,           // × computeWavePlan's base, after the opening taper
  holdWaves: false,      // no automatic arming between waves
  freezeEnemies: false,  // updateEnemies skipped: the field stands still
  immortalHeart: true,   // heartHit never decrements
  immortalTank: true,    // playerHit returns before the hull counter
  bg: 'none',            // scene.background: the look's colour, or a baked sky
  galaxySeed: 4414,      // NGC-4414, the demo's own
  galaxyScale: 1,        // the demo's zoom: 2 is twice as near and twice as wide
  galaxies: 1,           // the home galaxy, plus this many minus one on the far sky
  galaxyCore: 1,         // × the seeded core size (seeded small; a big bulge fights the board)
  bgIntensity: 0.5,      // scene.backgroundIntensity — "faint" is a number
  fx: 'wormhole',        // the disc's fragment shader
  whSize: 384,           // wormhole target, px (the tier's, then the knob's)
  whHz: 30,              // wormhole march rate
  steps: 120,            // uSteps — cost is steps × octaves per pixel
  octaves: 12,           // uTurbOctaves
  bloom: true,           // postfx on/off
};

export const LAB_KNOBS = [
  { key: 'waveMult', label: 'wave ×', group: 'waves', min: 1, max: 20, step: 1 },
  { key: 'holdWaves', label: 'hold waves', group: 'waves', bool: true },
  { key: 'freezeEnemies', label: 'freeze enemies', group: 'waves', bool: true },
  { key: 'immortalHeart', label: 'immortal heart', group: 'health', bool: true },
  { key: 'immortalTank', label: 'immortal tank', group: 'health', bool: true },
  { key: 'bg', label: 'background', group: 'sky', choices: ['none', 'galaxy'] },
  { key: 'galaxySeed', label: 'galaxy seed', group: 'sky', min: 0, max: 99999, step: 1 },
  { key: 'galaxyScale', label: 'galaxy size', group: 'sky', min: 0.25, max: 4, step: 0.05 },
  { key: 'galaxies', label: 'galaxies', group: 'sky', min: 1, max: 8, step: 1 },
  { key: 'galaxyCore', label: 'core size ×', group: 'sky', min: 0.25, max: 3, step: 0.05 },
  { key: 'bgIntensity', label: 'sky intensity', group: 'sky', min: 0, max: 1.5, step: 0.05 },
  { key: 'fx', label: 'portal effect', group: 'portal', choices: ['wormhole', 'corona'] },
  { key: 'whSize', label: 'portal target px', group: 'portal', choices: [128, 192, 256, 384, 512, 768] },
  { key: 'whHz', label: 'portal update Hz', group: 'portal', min: 1, max: 60, step: 1 },
  { key: 'steps', label: 'march steps', group: 'portal', min: 8, max: 240, step: 1 },
  { key: 'octaves', label: 'turbulence octaves', group: 'portal', min: 1, max: 16, step: 1 },
  { key: 'bloom', label: 'bloom', group: 'post', bool: true },
];

// The URL → the lab's opening state, or null when the flag is absent. Query
// keys are the knob keys prefixed `lab` (`labwave` is the one alias, because
// "labwaveMult" is not a thing anyone types). The tier's wormhole numbers
// are the starting point for the portal knobs so the lab opens on what the
// board is actually doing, and a bare `?lab=1` changes nothing about it.
const ALIASES = { labwave: 'waveMult', labbg: 'bg', labfx: 'fx', labseed: 'galaxySeed', labscale: 'galaxyScale', labgalaxies: 'galaxies', labcore: 'galaxyCore' };

export function parseLabQuery(search, tier = null) {
  const q = new URLSearchParams(search || '');
  if (q.get('lab') !== '1') return null;
  const state = { on: true, ...LAB_DEFAULTS };
  if (tier && tier.wormhole) {
    state.whSize = tier.wormhole.size;
    state.whHz = tier.wormhole.updateHz;
  }
  const src = {};
  for (const [k, v] of q.entries()) {
    const key = ALIASES[k] || (k.startsWith('lab') && k.length > 3
      ? k[3].toLowerCase() + k.slice(4) : null);
    if (key && key in LAB_DEFAULTS) src[key] = v;
  }
  clampParams(LAB_KNOBS.filter((k) => !k.choices), state, src);   // choices have no range
  for (const k of LAB_KNOBS) {
    if (!k.choices || !(k.key in src)) continue;
    const want = typeof k.choices[0] === 'number' ? Number(src[k.key]) : src[k.key];
    if (k.choices.includes(want)) state[k.key] = want;
  }
  return state;
}

// One line, every couple of seconds, for the headless harness to grep. Every
// field a decision needs, in a fixed order, so two runs diff by eye.
export function labLine(s) {
  const n = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—');
  return `LAB fps=${n(s.fps, 0)} ms=${n(s.ms)} gpu=${n(s.gpuMs)}`
    + ` calls=${s.calls ?? '—'} tris=${s.tris ?? '—'} pts=${s.pts ?? '—'}`
    + ` enemies=${s.enemies ?? '—'} wave=${s.wave ?? '—'} mult=${s.waveMult ?? 1}`
    + ` bg=${s.bg ?? 'none'} fx=${s.fx ?? 'wormhole'} wh=${s.whSize}@${s.whHz}`
    + ` steps=${s.steps} oct=${s.octaves} bloom=${s.bloom ? 1 : 0}`;
}

export function labKnobProblems() {
  return knobProblems(LAB_KNOBS, LAB_DEFAULTS);
}
