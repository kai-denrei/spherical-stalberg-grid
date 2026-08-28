// how-tab.js — the static markdown tabs: HOW-IT-WORKS.md (building blocks)
// and TECH-STACK.md (what a visiting dev needs to judge compatibility).
// Both are the same thing — fetch a file, render it, do nothing else — so
// they share one factory rather than two near-identical files. No renderer,
// no loop. Shares the markdown converter and .mdview styles with the devlog
// overlay.

import { mdToHtml } from './devlog.js?v=4ebcb505';

function makeDocTab(root, selector, file) {
  const el = root.querySelector(selector);
  let loaded = false;

  async function load() {
    if (loaded) return;
    try {
      const res = await fetch(`./${file}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      el.innerHTML = mdToHtml(await res.text());
      loaded = true;
    } catch (err) {
      el.textContent = `could not load ${file} — ${err.message}`;
    }
  }

  return {
    setActive(on) {
      if (on) load();
    },
  };
}

export function initHowTab(root) {
  return makeDocTab(root, '#how-content', 'HOW-IT-WORKS.md');
}

export function initStackTab(root) {
  return makeDocTab(root, '#stack-content', 'TECH-STACK.md');
}
