// how-tab.js — the "building blocks" tab: HOW-IT-WORKS.md rendered as a
// full-page article. Static content; no renderer, no loop. Shares the
// markdown converter and .mdview styles with the devlog overlay.

import { mdToHtml } from './devlog.js?v=f7cb767a';

export function initHowTab(root) {
  const el = root.querySelector('#how-content');
  let loaded = false;

  async function load() {
    if (loaded) return;
    try {
      const res = await fetch('./HOW-IT-WORKS.md', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      el.innerHTML = mdToHtml(await res.text());
      loaded = true;
    } catch (err) {
      el.textContent = `could not load HOW-IT-WORKS.md — ${err.message}`;
    }
  }

  return {
    setActive(on) {
      if (on) load();
    },
  };
}
