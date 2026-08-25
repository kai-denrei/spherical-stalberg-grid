// main.js — tab shell. Each tab lazily initializes its own renderer/scene the
// first time it's shown and pauses (skips its loop body) while hidden.

import { wireDevlogBadge } from './devlog.js?v=0b4e4775';
import { initGridTab } from './grid-tab.js?v=0b4e4775';
import { initMazeTab } from './maze-tab.js?v=0b4e4775';
import { initOrganicTab } from './organic-tab.js?v=0b4e4775';
import { initBattleTab } from './battle-tab.js?v=0b4e4775';
import { initHeartTab } from './heart-tab.js?v=0b4e4775';
import { initTdTab } from './td-tab.js?v=0b4e4775';
import { initTankTab } from './tank-tab.js?v=0b4e4775';
import { initTank2Tab } from './tank2-tab.js?v=0b4e4775';
import { initTank3Tab } from './tank3-tab.js?v=0b4e4775';
import { initHowTab } from './how-tab.js?v=0b4e4775';

const tabs = {
  grid: { root: document.getElementById('tab-grid'), init: initGridTab, api: null },
  maze: { root: document.getElementById('tab-maze'), init: initMazeTab, api: null },
  organic: { root: document.getElementById('tab-organic'), init: initOrganicTab, api: null },
  battle: { root: document.getElementById('tab-battle'), init: initBattleTab, api: null },
  heart: { root: document.getElementById('tab-heart'), init: initHeartTab, api: null },
  td: { root: document.getElementById('tab-td'), init: initTdTab, api: null },
  tank: { root: document.getElementById('tab-tank'), init: initTankTab, api: null },
  tank2: { root: document.getElementById('tab-tank2'), init: initTank2Tab, api: null },
  tank3: { root: document.getElementById('tab-tank3'), init: initTank3Tab, api: null },
  how: { root: document.getElementById('tab-how'), init: initHowTab, api: null },
};

let current = null;

function activate(name) {
  if (current === name) return;
  for (const [key, tab] of Object.entries(tabs)) {
    const on = key === name;
    tab.root.classList.toggle('tab-hidden', !on);
    document.querySelector(`#tabbar button[data-tab="${key}"]`).classList.toggle('active', on);
    if (on && !tab.api) tab.api = tab.init(tab.root);
    if (tab.api) tab.api.setActive(on);
  }
  current = name;
}

for (const btn of document.querySelectorAll('#tabbar button')) {
  btn.addEventListener('click', () => {
    location.hash = btn.dataset.tab;
    activate(btn.dataset.tab);
    // picking a mode closes the ☰ menu — selection IS the dismissal
    document.body.classList.remove('chrome-open');
  });
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

