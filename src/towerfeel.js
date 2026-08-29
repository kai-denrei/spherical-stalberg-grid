// towerfeel.js — what a braille tower LOOKS like, as data.
//
// Same bargain as tankfeel: the numbers that decide a look are knobs rather
// than constants buried in a builder, described once so the game's GUI and
// the unit viewer's panel are generated from the same table and write to the
// same object. Tuning on the bench is then tuning the build, which is the
// only reason a bench is worth having.
//
// Pure: no DOM, no three.js.

import { TOWER_HEAD_KINDS } from './creatures.js?v=8163013e';
import { makeParams, clampParams, formatKnobs, knobProblems } from './knobs.js?v=8163013e';

// 'per tower' means "use whatever shape towers.js gave this one", which is
// the shipping behaviour. Any other value overrides EVERY tower with that
// head — which is what you want on a bench, where the question is "does this
// shape work at all", not "does it suit the splash tower".
export const HEAD_PER_TOWER = 'per tower';
export const HEAD_CHOICES = [HEAD_PER_TOWER, ...TOWER_HEAD_KINDS];

export const TOWER_FEEL = {
  headShape: HEAD_PER_TOWER,
  headScale: 0.42,   // cloud scale inside the head group
  headLift: 1.12,    // how far the head floats above the mast
  dots: 190,         // points in the cloud — density IS the read at distance
  dotSize: 2.1,      // px, unattenuated: a dot is the same size at any range
  hiEvery: 12,       // every Nth dot is a white highlight
  spin: 0.6,         // radians/s
  bob: 0.045,        // vertical float, model units
  bobRate: 1.9,      // and how fast it floats
};

export const TOWER_FEEL_KNOBS = [
  { key: 'headShape', label: 'head shape', group: 'head', choices: HEAD_CHOICES },
  { key: 'headScale', label: 'head size', group: 'head', min: 0.15, max: 0.9, step: 0.01 },
  { key: 'headLift', label: 'head height', group: 'head', min: 0.6, max: 1.8, step: 0.02 },
  { key: 'dots', label: 'dot count', group: 'dots', min: 60, max: 400, step: 10 },
  { key: 'dotSize', label: 'dot size', group: 'dots', min: 1, max: 5, step: 0.1 },
  { key: 'hiEvery', label: 'highlight every', group: 'dots', min: 4, max: 24, step: 1 },
  { key: 'spin', label: 'spin', group: 'motion', min: 0, max: 2, step: 0.05 },
  { key: 'bob', label: 'bob height', group: 'motion', min: 0, max: 0.15, step: 0.005 },
  { key: 'bobRate', label: 'bob rate', group: 'motion', min: 0, max: 4, step: 0.1 },
];

export const makeTowerParams = (src = TOWER_FEEL) => makeParams(TOWER_FEEL_KNOBS, src);
export const clampTowerParams = (p, src) => clampParams(TOWER_FEEL_KNOBS, p, src);
export const formatTowerFeel = (p) => formatKnobs('TOWER_FEEL', TOWER_FEEL_KNOBS, p);
export const towerKnobProblems = () => knobProblems(TOWER_FEEL_KNOBS, TOWER_FEEL);

// Which head a given tower should wear under the current settings.
export function headKindFor(def, feel = TOWER_FEEL) {
  const want = feel.headShape;
  if (!want || want === HEAD_PER_TOWER) return def.shape || 'sphere';
  return want;
}
