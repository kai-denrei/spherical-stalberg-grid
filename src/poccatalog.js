// poccatalog.js — what each mode IS, grouped by what it demonstrates.
//
// Pure data, no DOM: the home launcher renders it, and the tab shell keeps
// using plain ids. A bare label like "tank2" tells a visitor nothing, and
// this project is a collection of proofs-of-concept someone else is meant to
// be able to browse — so every entry owes an answer to "what does this show
// me?", not just a name.
//
// `id` must match a key in main.js's tab table. An entry may also carry
// `mission`: the same tab, opened with `?mission=<value>` — and an empty
// string means the plain campaign, so "go back" is the same code path as
// "pick one". A mission is read once when the board builds, so those entries
// navigate rather than switching tabs.

export const POC_GROUPS = [
  {
    key: 'game',
    label: 'the game',
    note: 'where the pieces ended up',
    entries: [
      { id: 'td', title: 'TD', line: 'Tower defence on the sphere. Waves, a build mode, eight towers, a tank you drive. The one that is actually a game.' },
      // MISSIONS. Same board, same tank, same gates — a different objective
      // and a different supply. `mission` is read ONCE, when the board builds,
      // so a card here is a LINK rather than a tab switch; the empty string on
      // the TD entry above is what takes you back to the campaign.
      { id: 'td', mission: 'rescue', title: 'rescue', line: 'Six astronauts stranded in the lanes. The hull seats two, you board by STOPPING beside them, and anyone in the hatch dies with the hull. Three hulls, eight shells, six mines, no resupply.' },
      { id: 'td', mission: 'rescue2', title: 'raid', line: 'A bigger map, three camps in clearings, big soft garrisons to ram. Drive up and the container opens — then stand still while they walk out, because a moving hull runs them over.' },
      { id: 'heart', title: 'heart', line: 'Its predecessor: an open battlefield with a Heart to defend and enemies introduced one type per wave.' },
    ],
  },
  {
    key: 'grid',
    label: 'grid studies',
    note: 'the substrate everything else stands on',
    entries: [
      { id: 'grid', title: 'grid', line: 'The Stålberg quad grid, wrapped onto a sphere and relaxed toward squareness. Live dashboard over the whole pipeline.' },
      { id: 'maze', title: 'maze', line: 'Rooms and hallways carved over the cell graph by BFS. Every tile starts as wall; the dungeon is found, not drawn.' },
      { id: 'organic', title: 'organic', line: 'The maze inhabited — a Braille dot-cloud creature walking the graph. Where the half-dotted visual language began.' },
    ],
  },
  {
    key: 'tank',
    label: 'tank studies',
    note: 'kinematics and combat, tried four ways',
    entries: [
      { id: 'battle', title: 'battle', line: 'Combat on the maze: shells, ammo pickups, enemy tanks wandering the dungeon. The first fight.' },
      { id: 'tank', title: 'tank', line: 'An Atari Combat homage. All rules live in a pure core; the tab only draws state and forwards keys.' },
      { id: 'tank2', title: 'tank2', line: 'The same Combat rules on a tiny planet. The game core never learns which camera is watching.' },
      { id: 'tank3', title: 'tank3', line: 'Planet Combat in the Tron skin: mesh tanks, dot-cloud shells, debris on death.' },
    ],
  },
  {
    key: 'reference',
    label: 'reference',
    note: 'for reading rather than playing',
    entries: [
      { id: 'units', title: 'units', line: 'Every unit and tower, alone and up close. Turn one over, hear what it sounds like.' },
      { id: 'sentry', title: 'sentry range', line: 'Six modular turret families on a live range: units pop up, the sentry finds one, slews to it on its own yaw and elevation stops, and shoots it. Every angle and limit is a knob.' },
      { id: 'sniper', title: 'sniper', line: 'First person down a Lancer\u2019s optic at things 800 m away. Bullet drop, time of flight, a gusting alien crosswind, a reticle that will not hold still, a zero you set — and an assist ladder that is the automation arc in miniature.' },
      { id: 'how', title: 'how it works', line: 'The building blocks, by concept: the grid, the dungeon, motion, sound, bloom, models.' },
      { id: 'stack', title: 'tech stack', line: 'What this is built on, and what would or would not fit alongside it.' },
    ],
  },
];

// flat id -> title, for the "you are here" chip in the tab bar
export const POC_TITLES = Object.fromEntries(
  POC_GROUPS.flatMap((g) => g.entries.map((e) => [e.id, e.title])),
);
