// main.js — tab shell. Each tab lazily initializes its own renderer/scene the
// first time it's shown and pauses (skips its loop body) while hidden.

import { wireDevlogBadge } from './devlog.js?v=2a26021c';
import { initGridTab } from './grid-tab.js?v=2a26021c';
import { initMazeTab } from './maze-tab.js?v=2a26021c';
import { initOrganicTab } from './organic-tab.js?v=2a26021c';
import { initBattleTab } from './battle-tab.js?v=2a26021c';
import { initHeartTab } from './heart-tab.js?v=2a26021c';
import { initHowTab } from './how-tab.js?v=2a26021c';

const tabs = {
  grid: { root: document.getElementById('tab-grid'), init: initGridTab, api: null },
  maze: { root: document.getElementById('tab-maze'), init: initMazeTab, api: null },
  organic: { root: document.getElementById('tab-organic'), init: initOrganicTab, api: null },
  battle: { root: document.getElementById('tab-battle'), init: initBattleTab, api: null },
  heart: { root: document.getElementById('tab-heart'), init: initHeartTab, api: null },
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
  });
}

// deep-link: /#maze or /#organic opens that tab directly
const initial = location.hash.slice(1);
activate(tabs[initial] ? initial : 'grid');

wireDevlogBadge();
