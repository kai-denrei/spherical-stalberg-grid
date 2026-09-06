// sentryfx.js — HOW A WEAPON LOOKS. One table, separate from towers.js, which
// keeps what a weapon DOES.
//
// The split, and why it is worth a file: towers.js was half gameplay and half
// look, so "where do I change how the Lancer looks" had two answers and a
// tuning pass had to be pasted into a table full of damage numbers. Now:
//
//   towers.js   dmg, range, rate, cost, attack, splash, lock — and `color`,
//               which is IDENTITY (the range ring, the shop icon, the model's
//               tint), not an effect.
//   sentryfx.js how the shot is drawn, what leaves the barrel, and what
//               happens where it lands.
//   towerlooks  the tower's BODY — `shape` and `spin` stay with towers.js
//               because they describe the braille fallback's head geometry,
//               which is a different subsystem with its own tuner.
//
// THERE IS NO SECOND COPY. Nothing here is duplicated from towers.js; these
// fields were MOVED, and test/sentryfx.mjs fails if a tower def grows one
// back. That guard is the point — this codebase has been bitten before by two
// copies of one number drifting, and a half-migration is worse than none.
//
// Keyed by tower KEY rather than by model id, because roster 1 has no models
// at all and still has to draw its shots.
import { makeParams, clampParams, formatKnobs, knobProblems } from './knobs.js?v=c5963edb';
import { IMPACT_TUNE } from './impactfx.js?v=c5963edb';

// The fields that USED to live on a tower def. If you are looking for why a
// tracer is the size it is, it is here.
//   projPx     the tracer head's size in pixels
//   trail      ghost points dragged behind it, dimming to the tail
//   projSpeed  cells per second
//   beamColor  what a beam weapon THROWS, when that differs from its identity
//   plasma     the beam is a thrown spray rather than a straight line
const SHOT = (projPx, trail, projSpeed, extra = {}) => ({ projPx, trail, projSpeed, ...extra });

// MUZZLE and IMPACT are both `{ recipe, size, colors, tune }`:
//   recipe  a name from IMPACT_RECIPES, or an explicit list of families
//   size    ONE number scaling the whole effect (impactfx authors in local
//           space around the origin, so this is all it takes)
//   colors  per-family overrides — a laser's sparks are not a shell's sparks,
//           and colour is most of what says which weapon hit you
//   tune    deltas onto IMPACT_TUNE, so a family only names what it changes
const FX = (recipe, size, colors = {}, tune = {}) => ({ recipe, size, colors, tune });

export const SENTRY_FX = {
  // --- roster 1, the campaign ---------------------------------------------
  single:   { shot: SHOT(5, 0, 20),
    muzzle: FX('light', 0.5, { flash: 0xffe6b0 }),
    impact: FX('shell', 0.7, { spark: 0xffd08a }) },
  rapid:    { shot: SHOT(4, 3, 26),
    // a fast gun's muzzle has to be SMALL: at four shots a second a big flash
    // is a strobe, and the eye stops reading individual shots
    muzzle: FX('light', 0.32, { flash: 0xfff0cc }, { flashLife: 0.07 }),
    impact: FX('light', 0.5, { spark: 0xffd08a }) },
  spread:   { shot: SHOT(3.5, 0, 15),
    muzzle: FX('light', 0.55, { flash: 0xffdca0 }, { sparkSpread: 1.2 }),
    impact: FX('light', 0.45, { spark: 0xffc888 }) },
  homing:   { shot: SHOT(5, 6, 13),
    muzzle: FX(['flash', 'ember'], 0.6, { flash: 0xcfe0ff, ember: 0xff9a5c }),
    impact: FX('shell', 0.85, { spark: 0xcfe8ff }) },
  slow:     { shot: SHOT(0, 0, 0),
    // a field weapon has no muzzle and no impact: nothing leaves it
    muzzle: FX([], 0), impact: FX([], 0) },
  aoe:      { shot: SHOT(12, 6, 3.5),
    muzzle: FX(['flash', 'ember'], 0.9, { flash: 0xffd9a0, ember: 0xff8a44 }),
    impact: FX('shell', 1.3, { spark: 0xffb066 }, { ringEnd: 0.95, debrisCount: 14 }) },
  sniper:   { shot: SHOT(7, 11, 42),
    muzzle: FX('light', 0.7, { flash: 0xdff2ff }, { flashLife: 0.09 }),
    impact: FX('shell', 0.8, { spark: 0xdff2ff }, { sparkSpeed: 3.2 }) },
  laser:    { shot: SHOT(0, 0, 0),
    muzzle: FX(['flash'], 0.4, { flash: 0x9dffcf }),
    impact: FX('laser', 0.6, { spark: 0x9dffcf, splash: 0x9dffcf }) },

  // --- roster 2, the sentry board -----------------------------------------
  rotor:    { shot: SHOT(4, 2, 24),
    // the minigun. Same reasoning as `rapid`, harder: six barrels at speed
    muzzle: FX('light', 0.3, { flash: 0xffe4a8 }, { flashLife: 0.06, sparkCount: 10 }),
    impact: FX('light', 0.45, { spark: 0xffd08a }) },
  plasma:   { shot: SHOT(0, 0, 0, { plasma: true }),
    muzzle: FX(['flash', 'ember'], 0.5, { flash: 0x2fe6d0, ember: 0x2fe6d0 }),
    // a thrower SPLASHES: it is matter, not light, and it should cling
    impact: FX('plasma', 0.75, { splash: 0x2fe6d0, ember: 0x7ffff0 }) },
  quiver:   { shot: SHOT(5, 6, 13),
    // a launch is smoke and fire, not a flash — the round is leaving slowly
    muzzle: FX(['flash', 'ember'], 0.75, { flash: 0xdfe8ff, ember: 0xff9a5c },
      { emberCount: 26, emberLife: 2.4 }),
    impact: FX('shell', 1.0, { spark: 0x9dc4ff }, { ringEnd: 0.8 }) },
  relay:    { shot: SHOT(0, 0, 0), muzzle: FX([], 0), impact: FX([], 0) },
  mortar:   { shot: SHOT(12, 6, 3.5),
    muzzle: FX(['flash', 'ember'], 0.95, { flash: 0xffd9a0, ember: 0xff8a44 },
      { emberCount: 24 }),
    impact: FX('shell', 1.25, { spark: 0xffb066 }, { ringEnd: 0.95, debrisCount: 14 }) },
  lancer:   { shot: SHOT(7, 11, 42, { beamColor: 0x4dff86 }),
    muzzle: FX(['flash'], 0.45, { flash: 0x4dff86 }, { flashLife: 0.10 }),
    // a LANCE burns rather than breaks: splash and embers, almost no debris
    impact: FX('laser', 0.7, { spark: 0x4dff86, splash: 0x4dff86, ember: 0xb8ffd0 }) },
  howitzer: { shot: SHOT(15, 8, 3.0),
    // the loudest gun on the board should have the biggest muzzle on it
    muzzle: FX(['flash', 'spark', 'ember'], 1.25, { flash: 0xfff0d0, ember: 0xff8a44 },
      { flashLife: 0.18, emberCount: 30 }),
    impact: FX('shell', 1.7, { spark: 0xffc38a }, { ringEnd: 1.25, debrisCount: 18 }) },
  heptapod: { shot: SHOT(6, 7, 12),
    muzzle: FX(['flash', 'ember'], 0.7, { flash: 0xffd0a0, ember: 0xff9a5c },
      { emberCount: 22 }),
    impact: FX('shell', 1.0, { spark: 0xffb45e }) },
};

// The fallback for a tower with no entry — visible rather than invisible, so a
// missing profile shows up as "that looks generic" and not as "nothing fires".
export const DEFAULT_FX = {
  shot: SHOT(5, 0, 16),
  muzzle: FX('light', 0.5, {}),
  impact: FX('light', 0.6, {}),
};

// Resolve a tower def to its profile. The ONE door — a call site that reads
// SENTRY_FX directly will miss the fallback and crash on a roster-1 tower.
export function fxFor(def) {
  if (!def) return DEFAULT_FX;
  return SENTRY_FX[def.key] || DEFAULT_FX;
}

// Convenience readers, so call sites keep the `?? default` in ONE place
// rather than each re-deciding what a missing tracer size means.
export const shotOf = (def) => fxFor(def).shot || DEFAULT_FX.shot;
export const muzzleOf = (def) => fxFor(def).muzzle || DEFAULT_FX.muzzle;
export const impactOf = (def) => fxFor(def).impact || DEFAULT_FX.impact;

// The tune a family actually fires with: IMPACT_TUNE with this profile's
// deltas folded on. Built fresh per call rather than cached, because the lab
// mutates the deltas live and a cache would show the operator yesterday's
// effect while the panel says otherwise.
export function tuneFor(profile, base = IMPACT_TUNE) {
  return { ...base, ...(profile && profile.tune ? profile.tune : {}) };
}

// THE FIELDS THAT MOVED. test/sentryfx.mjs asserts no tower def carries one of
// these, which is what stops the migration from silently half-reverting the
// next time someone adds a tower by copying an old one.
export const MOVED_FIELDS = ['projPx', 'trail', 'projSpeed', 'beamColor', 'plasma'];

// --- the export -----------------------------------------------------------
// "Fine-tune it, then make it the default" is the whole point of the lab, and
// a tuning that lives in one browser is a tuning that never ships. This emits
// the profile as the exact source it came from, ready to paste back over the
// entry in this file.
const hex = (v) => `0x${(v >>> 0).toString(16).padStart(6, '0')}`;
const isHexKey = (k) => /color$/i.test(k);

function fmtColors(colors) {
  const e = Object.entries(colors || {});
  if (!e.length) return '{}';
  return `{ ${e.map(([k, v]) => `${k}: ${hex(v)}`).join(', ')} }`;
}
function fmtTune(tune) {
  const e = Object.entries(tune || {});
  if (!e.length) return '';
  return `,\n      { ${e.map(([k, v]) => `${k}: ${Number(v.toFixed ? v.toFixed(3) : v)}`).join(', ')} }`;
}
function fmtFx(name, fx) {
  const recipe = Array.isArray(fx.recipe)
    ? `[${fx.recipe.map((r) => `'${r}'`).join(', ')}]`
    : `'${fx.recipe}'`;
  return `    ${name}: FX(${recipe}, ${Number(fx.size.toFixed(2))}, ${fmtColors(fx.colors)}${fmtTune(fx.tune)})`;
}

export function formatSentryFx(key, profile) {
  const s = profile.shot || {};
  const extra = Object.entries(s)
    .filter(([k]) => !['projPx', 'trail', 'projSpeed'].includes(k))
    .map(([k, v]) => `${k}: ${isHexKey(k) ? hex(v) : v}`);
  const shot = `SHOT(${s.projPx ?? 0}, ${s.trail ?? 0}, ${s.projSpeed ?? 0}`
    + (extra.length ? `, { ${extra.join(', ')} }` : '') + ')';
  return `  ${key}: { shot: ${shot},\n`
    + `${fmtFx('muzzle', profile.muzzle)},\n`
    + `${fmtFx('impact', profile.impact)} },`;
}

export const formatAllSentryFx = () =>
  Object.entries(SENTRY_FX).map(([k, p]) => formatSentryFx(k, p)).join('\n');
