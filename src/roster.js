// roster.js — WHICH BOARD. The one DOM-aware line of the tower roster.
//
// towers.js is pure and Node-tested and must not read `location`; the TD
// tab is fifteen thousand lines and must not be forked to change eight
// names. This module is the seam between those two facts: it reads
// `?roster=` once, at boot, and switches the live roster BEFORE the tab is
// imported.
//
// That ordering is the whole trick and it is not an accident. ES modules
// evaluate depth-first in import order, so main.js importing this file
// FIRST guarantees the switch has already happened by the time td-tab's
// module body runs — and because an ES export is a live binding, every
// importer of TOWERS sees the board that was chosen rather than a copy of
// the default it captured at import time.
//
// A roster, like a mission, is therefore read ONCE and can only change by
// loading the page again. That is why the tab bar's board buttons are
// navigations rather than tab switches.
import { useRoster, ROSTERS } from './towers.js?v=c8bc198b';

export const ROSTER_NOW = (() => {
  const q = new URLSearchParams(location.search).get('roster') || '';
  const id = q === '' ? 1 : Number(q);
  return useRoster(ROSTERS[id] ? id : 1);
})();

// what the URL literally said, so the tab bar can tell "the campaign"
// (no parameter at all) from "roster 1, spelled out" — the empty string is
// what CLEARS the parameter, exactly as it does for a mission
export const ROSTER_PARAM = new URLSearchParams(location.search).get('roster') || '';
