// unitcatalog.js — every buildable thing in the game, grouped by whose side
// it is on. Pure data: no three.js, no DOM, so the grouping is Node-testable
// and the viewer stays a dumb renderer of whatever this says.
//
// `kind` tells a builder WHICH factory to call — units come from
// units.js buildUnit(), towers from towerlooks.js buildTowerLook() — because
// the two take different arguments and a viewer shouldn't have to guess.
import { ENEMY_SPEC } from './enemyspec.js';
import { TOWERS } from './towers.js';

export const GROUPS = ['friendly', 'neutral', 'hostile'];

export const GROUP_LABELS = {
  friendly: 'friendly',
  neutral: 'neutral',
  hostile: 'not friendly',
};

// What an empty group says for itself, so the viewer never renders a blank
// panel with no explanation.
export const GROUP_EMPTY = {
  friendly: 'no friendly units',
  neutral: 'nothing neutral yet — this side of the board is unwritten',
  hostile: 'no hostiles',
};

const PLAYER_UNITS = [
  { id: 'tank', kind: 'unit', label: 'tank', note: 'the procedural tank — turret sweeps, 9-shell rack, twin mini-guns' },
  { id: 'mkcx', kind: 'unit', label: 'mkcx', note: 'authored hover tank; turret and both secondary guns stay articulated' },
];

// Towers are the player's army too, so they belong on the friendly side.
// Built through the look registry, which is why they carry kind:'tower'.
const TOWER_UNITS = TOWERS.map((t) => ({
  id: t.key, kind: 'tower', label: t.label,
  note: `tower · ${t.cost}c · range ${t.range} · ${t.attack}`,
}));

const HOSTILE_UNITS = Object.keys(ENEMY_SPEC).map((key) => ({
  id: key, kind: 'unit', label: key,
  note: `${ENEMY_SPEC[key].role || 'hostile'} · ${ENEMY_SPEC[key].hp} hp`,
}));

export const UNIT_CATALOG = {
  friendly: [...PLAYER_UNITS, ...TOWER_UNITS],
  neutral: [],
  hostile: HOSTILE_UNITS,
};

export function groupOf(id) {
  for (const g of GROUPS) if (UNIT_CATALOG[g].some((e) => e.id === id)) return g;
  return null;
}

export function entriesIn(group) {
  return UNIT_CATALOG[group] || [];
}
