// pickups.js — the things on the ground worth driving over.
//
// Pure data. It lives out here rather than inside td-tab because the unit
// viewer has to describe the same objects the game spawns, and a second copy
// of this table would drift the first time a colour or an effect changed —
// the viewer would then be teaching the player something that is not true.
//
// Shape carries the meaning, not just colour: a spiked star for speed, a
// rounded cell for health, a ring for the charge you carry home.

export const PICKUPS = [
  {
    type: 'power',
    shape: 'star',
    body: 0x9ff8ff,
    label: 'overdrive',
    effect: 'permanent +8% speed',
    note: 'stacks for the whole run — the earliest ones are worth the most',
  },
  {
    type: 'health',
    shape: 'cell',
    body: 0x3dff6e,
    label: 'repair cell',
    effect: 'you +1 hull',
    note: 'green is health everywhere in this game; capped at your maximum',
  },
  {
    type: 'regen',
    shape: 'ring',
    body: 0xff2df0,
    label: 'regen charge',
    effect: 'carry it home: heart +4',
    note: 'the only pickup you have to DELIVER — picking it up is half the job',
  },
  {
    type: 'shield',
    shape: 'dome',
    body: 0x59c8ff,
    label: 'energy shield',
    effect: '12s shield — touch damage bounces off',
    note: 'a bubble over the hull; it blinks before it dies — count your seconds',
  },
];

// Shells are not in the table above because they are not a reward type: they
// spawn on their own clock, come in threes, and reload rather than upgrade.
export const SHELL_PICKUP = {
  type: 'shells',
  label: 'shell rack',
  effect: '+3 shells',
  note: 'the main gun is scarce by design — this is where it comes from',
};

// The shield RACK is not in the table above for the same reason the shells are
// not: it is not a reward you drive over, it is a thing you SPEND. The unit
// viewer teaches from this file, so it has to be described here or the viewer
// teaches the player something that is not true.
export const SHIELD_RACK = {
  type: 'shieldcharge',
  label: 'shield charge',
  effect: 'S: 10s shield',
  note: 'two charges, then a 2s seam — a chained shield can carry a ram combo across it',
};

// ...and the two ways the field gives you one for free.
export const SHIELD_SOURCES = [
  { label: 'slow tower tap', effect: 'park in its radius: 1.5s of shield per second',
    note: 'the tower stops slowing anything while you drain it, and for 5s after you leave' },
  { label: 'heart charging pad', effect: 'stand on it: 3s of shield per second',
    note: '10s a wave, refilled each wave — the cost is being at the heart, not at the front' },
];

export const PICKUP_BY_TYPE = Object.fromEntries(PICKUPS.map((p) => [p.type, p]));
