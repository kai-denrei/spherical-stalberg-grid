// home-tab.js — the launcher. Twelve modes in a flat tab bar told a visitor
// nothing: "tank2" is not a description. This is the front door — grouped
// cards, each saying what the thing DEMONSTRATES, so the collection can be
// browsed by someone who has never seen it.
//
// Navigation goes through the EXISTING tab buttons (a synthetic click on
// `#tabbar button[data-tab=…]`) rather than a second code path. One way to
// change mode means one place for it to break, and the hash/active-state
// bookkeeping in main.js keeps working untouched.
//
// Static DOM, built once. No renderer, no loop.

import { POC_GROUPS } from './poccatalog.js?v=e9f13c0d';

export function initHomeTab(root) {
  const el = root.querySelector('#home-grid');
  let built = false;

  function go(id) {
    const btn = document.querySelector(`#tabbar button[data-tab="${id}"]`);
    if (btn) btn.click();
  }

  function build() {
    if (built) return;
    built = true;
    const frag = document.createDocumentFragment();

    for (const group of POC_GROUPS) {
      const sec = document.createElement('section');
      sec.className = 'home-group';

      const head = document.createElement('div');
      head.className = 'home-group-head';
      head.innerHTML = `<h2>${group.label}</h2><span>${group.note}</span>`;
      sec.appendChild(head);

      const row = document.createElement('div');
      row.className = 'home-cards';
      for (const e of group.entries) {
        const card = document.createElement('button');
        card.className = 'home-card';
        card.dataset.go = e.id;
        card.innerHTML = `<span class="home-card-title">${e.title}</span>`
          + `<span class="home-card-line">${e.line}</span>`;
        card.addEventListener('click', () => go(e.id));
        row.appendChild(card);
      }
      sec.appendChild(row);
      frag.appendChild(sec);
    }
    el.appendChild(frag);
  }

  return {
    setActive(on) {
      if (on) build();
    },
  };
}
