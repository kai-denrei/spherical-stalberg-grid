// enemyspec.js — the enemy roster as DATA, shared by the heart tab and the
// TD tab (M0 extraction: one source of truth ends the sibling-drift risk
// for roster facts). Pure module: no DOM, no three.js, Node-testable.
//
// Colors are HokorobiTawaa's palette (hue = class, brightness = threat
// rank) for the borrowed types; our original three keep their tints.

export const CREATURE_TINTS = {
  phage: 0xffb84d,
  ghost: 0xfff07a,    // HK E_YELLOW2 — agile flyer
  scoutufo: 0xffe14a, // HK E_YELLOW — fast scout
  amoeba: 0x66ff88,
  jellyfish: 0xff5fd0,
  gslime: 0x53ff8a,   // HK E_GREEN — regenerator
  drifter: 0xffe14a,  // HK E_YELLOW body (+E_BLUE ring baked in the mesh)
  corona: 0xff6a5a,   // HK E_RED — armored tier
  barbed: 0xff3020,   // HK E_RED2 — dangerous tier
  rolling: 0xff9a2e,  // HK E_ORANGE — epic
  prime: 0xb44bff,    // HK E_PURPLE — epic-rare
  knot: 0xff1f1f,     // boss: brightest red on the field
};

// per-type combat spec. speed multiplies the tab's base enemy speed; size
// multiplies cellSide; rammable types die under the tank's treads for
// free, the rest hurt to touch and shrug the ram off. slowOnHit /
// accelOnHit are HokorobiTawaa's on-hit reactions (1.2 s); regen is their
// healOOC (hp/s while unhit for 1.2 s); heavy = epic tier, spawns sparse.
// bounty = HK's credit values, verbatim — the TD economy pays these.
export const ENEMY_SPEC = {
  phage:     { hp: 1, speed: 1.15, size: 0.4,  rammable: true,  heartDmg: 1, erratic: true, bounty: 3 },
  ghost:     { hp: 1, speed: 1.25, size: 0.42, rammable: true,  heartDmg: 1, erratic: true, bounty: 6 },
  scoutufo:  { hp: 1, speed: 1.4,  size: 0.42, rammable: true,  heartDmg: 1, erratic: true, bounty: 7 },
  amoeba:    { hp: 1, speed: 0.75, size: 0.5,  rammable: true,  heartDmg: 1, bounty: 16 },
  jellyfish: { hp: 1, speed: 0.95, size: 0.45, rammable: true,  heartDmg: 1, bounty: 14 },
  gslime:    { hp: 2, speed: 0.7,  size: 0.5,  rammable: true,  heartDmg: 1, regen: 0.25, bounty: 12 },
  drifter:   { hp: 2, speed: 0.85, size: 0.52, rammable: false, heartDmg: 1, erratic: true, bounty: 15 },
  corona:    { hp: 2, speed: 0.8,  size: 0.5,  rammable: false, heartDmg: 2, slowOnHit: 0.6, bounty: 15 },
  barbed:    { hp: 3, speed: 0.7,  size: 0.55, rammable: false, heartDmg: 2, accelOnHit: 1.9, bounty: 20 },
  rolling:   { hp: 4, speed: 0.65, size: 0.6,  rammable: false, heartDmg: 2, slowOnHit: 0.55, heavy: true, bounty: 28 },
  prime:     { hp: 6, speed: 0.55, size: 0.65, rammable: false, heartDmg: 2, regen: 0.35, heavy: true, bounty: 45 },
  knot:      { hp: 5, speed: 0.6,  size: 0.8,  rammable: false, heartDmg: 3, accelOnHit: 1.7, boss: true, bounty: 34 },
};

// one new threat per wave, in HokorobiTawaa's difficulty order (agile →
// support/regen → armored → dangerous → epic → boss); its spawn point is
// created at announce time. role = flavor only; the announce card's ram
// badge (from ENEMY_SPEC) owns the run-over verdict.
export const INTROS = [
  { wave: 1,  type: 'phage',     label: 'THE PHAGE',           role: 'agile swarm · hunt its source' },
  { wave: 2,  type: 'ghost',     label: 'WAVE GHOST',          role: 'agile flyer' },
  { wave: 3,  type: 'scoutufo',  label: 'SCOUT UFO',           role: 'fast scout' },
  { wave: 4,  type: 'amoeba',    label: 'THE AMOEBA',          role: 'crawler · destroy the spawn' },
  { wave: 5,  type: 'jellyfish', label: 'THE JELLYFISH',       role: 'pulse drifter' },
  { wave: 6,  type: 'gslime',    label: 'GREEN SLIME',         role: 'regenerator — ram it before it heals' },
  { wave: 7,  type: 'drifter',   label: 'WAVE SATURN',         role: 'erratic drifter' },
  { wave: 8,  type: 'corona',    label: 'CORONAVIRUS',         role: 'armored ×2 · slows when shot' },
  { wave: 9,  type: 'barbed',    label: 'BARBED MINE',         role: 'SPEEDS UP when shot' },
  { wave: 10, type: 'rolling',   label: 'ROLLING MINE',        role: 'epic · slows when shot' },
  { wave: 11, type: 'prime',     label: 'PRIME MINE',          role: 'epic-rare · REGENERATES' },
  { wave: 12, type: 'knot',      label: 'SOLVING TORUS · BOSS', role: 'accelerates when hit · 3 heart damage' },
];
