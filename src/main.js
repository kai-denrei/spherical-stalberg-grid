// main.js — tab shell. Each tab lazily initializes its own renderer/scene the
// first time it's shown and pauses (skips its loop body) while hidden.

import { initGridTab } from './grid-tab.js?v=846a8373';
import { initMazeTab } from './maze-tab.js?v=846a8373';

const tabs = {
  grid: { root: document.getElementById('tab-grid'), init: initGridTab, api: null },
  maze: { root: document.getElementById('tab-maze'), init: initMazeTab, api: null },
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

// deep-link: /#maze opens the maze tab directly
activate(location.hash === '#maze' ? 'maze' : 'grid');
