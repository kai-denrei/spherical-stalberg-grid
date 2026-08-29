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
];

// Shells are not in the table above because they are not a reward type: they
// spawn on their own clock, come in threes, and reload rather than upgrade.
export const SHELL_PICKUP = {
  type: 'shells',
  label: 'shell rack',
  effect: '+3 shells',
  note: 'the main gun is scarce by design — this is where it comes from',
};

export const PICKUP_BY_TYPE = Object.fromEntries(PICKUPS.map((p) => [p.type, p]));
