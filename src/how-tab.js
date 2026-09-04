// how-tab.js — the static markdown tabs. Three of them now: HOW-IT-WORKS.md
// (building blocks), TECH-STACK.md (what a visiting dev needs to judge
// compatibility), and ROADMAP.md (where this is going). All three are the
// same thing — fetch a file, render it, do nothing else — so they share one
// factory rather than three near-identical files. No renderer, no loop.
// Shares the markdown converter and .mdview styles with the devlog overlay.

import { mdToHtml } from './devlog.js?v=cf6adf11';

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

// The dev log and the roadmap are the same document read in two directions —
// what happened, and what is meant to. They share a slot for that reason: two
// panes behind one tab, rather than two entries in a nav bar that is already
// long. The build token lives here too, because "which build am I looking at"
// is the first question anyone reading a change log actually has.
export function initLogTab(root) {
  const panes = {
    dev: makeDocTab(root, '#log-content', 'DEVLOG.md'),
    roadmap: makeDocTab(root, '#roadmap-content', 'ROADMAP.md'),
  };
  let active = 'dev';

  const build = root.querySelector('#log-build');
  if (build) {
    const meta = document.querySelector('meta[name="cb"]');
    const raw = (meta && meta.getAttribute('content')) || '';
    const token = raw.split('#')[0].trim();
    // a small ⧉ copies the TOKEN, a small 🔗 copies a deep link to this
    // dev log — two icons, not a clickable label (operator ruling: the
    // whole-section click was the wrong affordance)
    build.textContent = '';
    if (token) {
      const label = document.createElement('span');
      label.textContent = `build ${token} `;
      build.appendChild(label);
      const mkBtn = (glyph, title, text) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = glyph;
        b.title = title;
        b.className = 'log-copy';
        b.addEventListener('click', () => {
          if (!(navigator.clipboard && navigator.clipboard.writeText)) return;
          navigator.clipboard.writeText(text).then(() => {
            const was = b.textContent;
            b.textContent = '✓';
            setTimeout(() => { b.textContent = was; }, 900);
          }, () => {});
        });
        return b;
      };
      build.appendChild(mkBtn('⧉', 'copy build token', token));
      build.appendChild(mkBtn('🔗', 'copy deep link to the dev log',
        `${location.origin}${location.pathname}?devlog=1`));
    }
  }

  const bar = root.querySelector('#log-tabs');
  const show = (which) => {
    active = which;
    for (const b of bar.querySelectorAll('button')) {
      b.classList.toggle('active', b.dataset.log === which);
    }
    for (const p of root.querySelectorAll('[data-log-pane]')) {
      p.classList.toggle('hidden', p.dataset.logPane !== which);
    }
    panes[which].setActive(true);
  };
  if (bar) bar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-log]');
    if (b) show(b.dataset.log);
  });

  // the copy button follows the visible pane — copying the doc you are not
  // reading is the kind of surprise that makes people stop trusting a button
  wireCopy(root, () => panes[active].getSource(), '#roadmap-copy');

  return {
    setActive(on) {
      if (!on) return;
      panes[active].setActive(true);
      // ?log=roadmap deep-links the pane, the same way ?unit= does in units
      const want = new URLSearchParams(location.search).get('log');
      if (want && panes[want] && want !== active) show(want);
    },
  };
}
