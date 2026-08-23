// main.js — tab shell. Each tab lazily initializes its own renderer/scene the
// first time it's shown and pauses (skips its loop body) while hidden.

import { wireDevlogBadge } from './devlog.js?v=e2ffc3bf';
import { initGridTab } from './grid-tab.js?v=e2ffc3bf';
import { initMazeTab } from './maze-tab.js?v=e2ffc3bf';
import { initOrganicTab } from './organic-tab.js?v=e2ffc3bf';
import { initHowTab } from './how-tab.js?v=e2ffc3bf';

const tabs = {
  grid: { root: document.getElementById('tab-grid'), init: initGridTab, api: null },
  maze: { root: document.getElementById('tab-maze'), init: initMazeTab, api: null },
  organic: { root: document.getElementById('tab-organic'), init: initOrganicTab, api: null },
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
