// main.js — tab shell. Each tab lazily initializes its own renderer/scene the
// first time it's shown and pauses (skips its loop body) while hidden.

import { wireDevlogBadge } from './devlog.js?v=84667024';
import { initHomeTab } from './home-tab.js?v=84667024';
import { initGridTab } from './grid-tab.js?v=84667024';
import { initMazeTab } from './maze-tab.js?v=84667024';
import { initOrganicTab } from './organic-tab.js?v=84667024';
import { initBattleTab } from './battle-tab.js?v=84667024';
import { initHeartTab } from './heart-tab.js?v=84667024';
import { initTdTab } from './td-tab.js?v=84667024';
import { initTankTab } from './tank-tab.js?v=84667024';
import { initTank2Tab } from './tank2-tab.js?v=84667024';
import { initTank3Tab } from './tank3-tab.js?v=84667024';
import { initUnitsTab } from './units-tab.js?v=84667024';
import { initBeamTab } from './beam-tab.js?v=84667024';
import { initAstroTab } from './astro-tab.js?v=84667024';
import { initMetalTab } from './metal-tab.js?v=84667024';
import { initSentryTab } from './sentry-tab.js';
import { initPortalTab } from './portal-tab.js?v=84667024';
import { initCineTab } from './cine-tab.js?v=84667024';
import { initHowTab, initStackTab, initLogTab } from './how-tab.js?v=84667024';
import { initSimTab } from './sim-tab.js?v=84667024';
import { initRecordTab } from './recordtab.js?v=84667024';
import { applyFontPack, DEFAULT_FONT, DEFAULT_SHOUT_FONT,
  loadTypeFeel } from './fonts.js?v=84667024';
import { paramLink } from './deeplink.js';


// ?coarse=1 — apply the phone's coarse-pointer CSS headless, for ANY tab.
// No desktop browser can match (pointer: coarse); the media conditions in
// the loaded sheets are rewritten so the phone's blocks apply and the
// desktop's do not. Lifted from the TD tab (which keeps its own copy under
// ?mobile=1) so the metal lab's bottom sheet can be verified the same way.
if (new URLSearchParams(location.search).get('coarse') === '1') {
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) {
      if (!(r instanceof CSSMediaRule)) continue;
      const t = r.media.mediaText;
      if (!/pointer:\s*(coarse|fine)|hover:\s*(none|hover)/.test(t)) continue;
      r.media.mediaText = t
        .replace(/\(pointer:\s*coarse\)/g, '(min-width: 0px)')
        .replace(/\(hover:\s*none\)/g, '(min-width: 0px)')
        .replace(/\(pointer:\s*fine\)/g, '(min-width: 99999px)')
        .replace(/\(hover:\s*hover\)/g, '(min-width: 99999px)');
    }
  }
}

// The typeface pack is APP-WIDE and applied before any tab boots: it writes
// custom properties onto <html>, and a tab that measures its own layout on
// first paint must measure the face it will actually keep. ?font=<name>
// picks one (see FONT_PACKS); it also persists, because a look decision the
// operator makes on a phone should survive the reload.
{
  const q = new URLSearchParams(location.search);
  const want = q.get('font');
  const wantShout = q.get('fontshout');
  let saved = null, savedShout = null;
  try {
    saved = localStorage.getItem('ssg-font');
    savedShout = localStorage.getItem('ssg-font-shout');
  } catch (e) { /* private mode */ }
  // the tuned values too, so the first paint is the one that stays — and
  // through loadTypeFeel, which throws away a blob older than the shipped
  // defaults instead of letting it shadow them
  const type = loadTypeFeel();
  const pick = applyFontPack(want || saved || DEFAULT_FONT, document.documentElement,
    type, wantShout || savedShout || DEFAULT_SHOUT_FONT);
  if (want) { try { localStorage.setItem('ssg-font', pick); } catch (e) { /* ignore */ } }
}

const tabs = {
  home: { root: document.getElementById('tab-home'), init: initHomeTab, api: null },
  grid: { root: document.getElementById('tab-grid'), init: initGridTab, api: null },
  maze: { root: document.getElementById('tab-maze'), init: initMazeTab, api: null },
  organic: { root: document.getElementById('tab-organic'), init: initOrganicTab, api: null },
  battle: { root: document.getElementById('tab-battle'), init: initBattleTab, api: null },
  heart: { root: document.getElementById('tab-heart'), init: initHeartTab, api: null },
  td: { root: document.getElementById('tab-td'), init: initTdTab, api: null },
  tank: { root: document.getElementById('tab-tank'), init: initTankTab, api: null },
  tank2: { root: document.getElementById('tab-tank2'), init: initTank2Tab, api: null },
  tank3: { root: document.getElementById('tab-tank3'), init: initTank3Tab, api: null },
  units: { root: document.getElementById('tab-units'), init: initUnitsTab, api: null },
  beam: { root: document.getElementById('tab-beam'), init: initBeamTab, api: null },
  metal: { root: document.getElementById('tab-metal'), init: initMetalTab, api: null },
  sentry: { root: document.getElementById('tab-sentry'), init: initSentryTab, api: null },
  astro: { root: document.getElementById('tab-astro'), init: initAstroTab, api: null },
  portal: { root: document.getElementById('tab-portal'), init: initPortalTab, api: null },
  cine: { root: document.getElementById('tab-cine'), init: initCineTab, api: null },
  how: { root: document.getElementById('tab-how'), init: initHowTab, api: null },
  stack: { root: document.getElementById('tab-stack'), init: initStackTab, api: null },
  sim: { root: document.getElementById('tab-sim'), init: initSimTab, api: null },
  record: { root: document.getElementById('tab-record'), init: initRecordTab, api: null },
  log: { root: document.getElementById('tab-log'), init: initLogTab, api: null },
};

let current = null;

// WHICH MISSION IS RUNNING. The board reads `?mission=` once, when it builds,
// so this cannot change without a reload — which is exactly why the mission
// buttons are navigations and not tab switches.
const missionNow = new URLSearchParams(location.search).get('mission') || '';

function activate(name) {
  if (current === name) return;
  for (const [key, tab] of Object.entries(tabs)) {
    const on = key === name;
    tab.root.classList.toggle('tab-hidden', !on);
    // ...all of them, not the first: TD now has three buttons (the campaign
    // and the two missions) and only the one whose mission is running is the
    // one that is active. querySelector would have lit the campaign whichever
    // mission you were in.
    for (const b of document.querySelectorAll(`#tabbar button[data-tab="${key}"]`)) {
      b.classList.toggle('active', on && (b.dataset.mission ?? missionNow) === missionNow);
    }
    if (on && !tab.api) tab.api = tab.init(tab.root);
    if (tab.api) tab.api.setActive(on);
  }
  current = name;
}

for (const btn of document.querySelectorAll('#tabbar button')) {
  btn.addEventListener('click', () => {
    // A MISSION BUTTON IS A LINK. `?mission=` is read at boot, so switching
    // missions means loading the page again; the empty string on the plain TD
    // button is what CLEARS it and goes back to the campaign, which is one
    // code path for "pick one" and "go back" rather than two.
    const m = btn.dataset.mission;
    if (m !== undefined && m !== missionNow) {
      location.href = paramLink({
        base: location.origin + location.pathname, hash: btn.dataset.tab,
        key: 'mission', value: m, carry: location.search,
      });
      return;
    }
    location.hash = btn.dataset.tab;
    activate(btn.dataset.tab);
    // picking a mode closes the ☰ menu — selection IS the dismissal
    document.body.classList.remove('chrome-open');
  });
}

// ?tabprobe=1 — every tab button, with the mission it selects and whether it
// is lit. TD carries three of them now (the campaign and the two missions)
// and only one may be active; that used to be decided by a querySelector
// that could only ever find the first, which is the kind of thing a
// screenshot of a collapsed menu cannot show.
if (new URLSearchParams(location.search).get('tabprobe') === '1') {
  setTimeout(() => {
    for (const b of document.querySelectorAll('#tabbar button')) {
      console.log(`TABPROBE ${b.dataset.tab || 'home'}`
        + ` mission=${b.dataset.mission === undefined ? '-' : `"${b.dataset.mission}"`}`
        + ` label="${b.textContent.trim()}" active=${b.classList.contains('active')}`);
    }
  }, 400);
}

// deep-link: /#maze or /#grid opens that tab directly.
// Default landing is THE GAME — the TD tab.
const initial = location.hash.slice(1);
activate(tabs[initial] ? initial : 'td');

// iOS: no double-tap zoom (the cruise gesture IS a double tap) and no
// pinch zoom on the play surface. The universal touch-action rule in CSS
// handles double-tap (per-element — it does not inherit); the gesture*
// events are Safari's non-standard pinch pipeline; the viewport meta's
// maximum-scale covers standalone mode and Android.
for (const evt of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(evt, (ev) => ev.preventDefault());
}

wireDevlogBadge();

// mobile: game chrome (tabs, badge, panels) hides behind a hamburger so
// the whole screen is play surface; minimap relocation is pure CSS
const chromeToggle = document.createElement('button');
chromeToggle.id = 'chrome-toggle';
chromeToggle.textContent = '☰';
chromeToggle.title = 'settings & tabs';
chromeToggle.addEventListener('click', () => {
  document.body.classList.toggle('chrome-open');
});
document.body.appendChild(chromeToggle);

