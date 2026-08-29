// how-tab.js — the static markdown tabs. Three of them now: HOW-IT-WORKS.md
// (building blocks), TECH-STACK.md (what a visiting dev needs to judge
// compatibility), and ROADMAP.md (where this is going). All three are the
// same thing — fetch a file, render it, do nothing else — so they share one
// factory rather than three near-identical files. No renderer, no loop.
// Shares the markdown converter and .mdview styles with the devlog overlay.

import { mdToHtml } from './devlog.js?v=76e1f710';

function makeDocTab(root, selector, file) {
  const el = root.querySelector(selector);
  let loaded = false;
  let source = '';  // the raw markdown, kept for the copy button

  async function load() {
    if (loaded) return;
    try {
      const res = await fetch(`./${file}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      source = await res.text();
      el.innerHTML = mdToHtml(source);
      loaded = true;
    } catch (err) {
      el.textContent = `could not load ${file} — ${err.message}`;
    }
  }

  return {
    getSource: () => source,
    setActive(on) {
      if (on) load();
    },
  };
}

// The markdown source IS the shareable form of this page — it is what the
// doc is authored in and it pastes into an issue or a chat unchanged. The
// clipboard API rejects on insecure origins and outside a user gesture, so
// every failure path has to land on the button rather than in the console.
function wireCopy(root, getSource, selector) {
  const btn = root.querySelector(selector);
  if (!btn) return;
  const label = btn.querySelector('.label');
  const glyph = btn.querySelector('.glyph');
  let revert = 0;

  const flash = (cls, text, mark) => {
    clearTimeout(revert);
    btn.classList.remove('ok', 'fail');
    if (cls) btn.classList.add(cls);
    label.textContent = text;
    glyph.textContent = mark;
    revert = setTimeout(() => {
      btn.classList.remove('ok', 'fail');
      label.textContent = 'copy';
      glyph.textContent = '⧉';
    }, 1600);
  };

  btn.addEventListener('click', async () => {
    const text = getSource();
    if (!text) { flash('fail', 'not loaded', '⧉'); return; }
    try {
      await navigator.clipboard.writeText(text);
      flash('ok', 'copied', '✓');
    } catch {
      flash('fail', 'copy failed', '⧉');
    }
  });
}

export function initHowTab(root) {
  return makeDocTab(root, '#how-content', 'HOW-IT-WORKS.md');
}

export function initStackTab(root) {
  const tab = makeDocTab(root, '#stack-content', 'TECH-STACK.md');
  wireCopy(root, tab.getSource, '#stack-copy');
  return tab;
}

// The roadmap is the one page here meant to be argued with, so it gets the
// copy button too — it pastes into an issue or a chat unchanged.
export function initRoadmapTab(root) {
  const tab = makeDocTab(root, '#roadmap-content', 'ROADMAP.md');
  wireCopy(root, tab.getSource, '#roadmap-copy');
  return tab;
}
