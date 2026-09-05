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

import { POC_GROUPS } from './poccatalog.js?v=84667024';
import { paramLink } from './deeplink.js';

export function initHomeTab(root) {
  const el = root.querySelector('#home-grid');
  let built = false;

  const missionNow = new URLSearchParams(location.search).get('mission') || '';

  // A MISSION IS NOT A TAB SWITCH. The board reads `?mission=` once, when it
  // builds, so picking one is a NAVIGATION — and picking the one you are
  // already on should do nothing rather than reload the board you are looking
  // at. Everything else still goes through the existing tab button, which
  // keeps one code path for the hash and the active state.
  function go(e) {
    if (e.mission !== undefined && e.mission !== missionNow) {
      location.href = paramLink({
        base: location.origin + location.pathname, hash: e.id,
        key: 'mission', value: e.mission, carry: location.search,
      });
      return;
    }
    const btn = document.querySelector(`#tabbar button[data-tab="${e.id}"]`);
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
        if (e.mission !== undefined) card.dataset.mission = e.mission;
        // the card for the mission you are already in says so, rather than
        // offering itself as somewhere else to go
        if (e.mission !== undefined && e.mission === missionNow) card.classList.add('current');
        card.innerHTML = `<span class="home-card-title">${e.title}</span>`
          + `<span class="home-card-line">${e.line}</span>`;
        card.addEventListener('click', () => go(e));
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
