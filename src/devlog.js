// devlog.js — clicking the cache-bust badge opens DEVLOG.md in an overlay.
// The badge (#cb-badge) belongs to the cache-busting toolkit and gets
// overwritten on reinstall, so we hook it from outside (capture phase)
// rather than editing cb-badge.js. The markdown renderer below covers
// exactly what DEVLOG.md uses: h1/h2, hr, paragraphs, `code`, **bold**,
// *italic*, [links](…) — not general markdown.

function mdToHtml(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const out = [];
  let para = [];
  const flush = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
  };
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) { flush(); out.push(`<h2>${inline(line.slice(3))}</h2>`); }
    else if (line.startsWith('# ')) { flush(); out.push(`<h1>${inline(line.slice(2))}</h1>`); }
    else if (/^---\s*$/.test(line)) { flush(); out.push('<hr>'); }
    else if (/^\s*$/.test(line)) flush();
    else para.push(line.trim());
  }
  flush();
  return out.join('\n');
}

let overlay = null;
let loaded = false;

function buildOverlay() {
  overlay = document.createElement('div');
  overlay.id = 'devlog-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML =
    '<div id="devlog-panel">' +
    '<button id="devlog-close" title="close (Esc)">×</button>' +
    '<div id="devlog-content">loading…</div>' +
    '</div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) hide();
  });
  overlay.querySelector('#devlog-close').addEventListener('click', hide);
  addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !overlay.classList.contains('hidden')) hide();
  });
}

function hide() {
  overlay.classList.add('hidden');
}

async function show() {
  if (!overlay) buildOverlay();
  overlay.classList.remove('hidden');
  if (loaded) return;
  const el = overlay.querySelector('#devlog-content');
  try {
    const res = await fetch('./DEVLOG.md', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    el.innerHTML = mdToHtml(await res.text());
    loaded = true;
  } catch (err) {
    el.textContent = `could not load DEVLOG.md — ${err.message}`;
  }
}

export function wireDevlogBadge() {
  const hook = () => {
    const badge = document.getElementById('cb-badge');
    if (!badge) return false;
    badge.title = 'dev log';
    // capture + stop: the badge's own copy-token click stays dormant
    badge.addEventListener('click', (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      show();
    }, true);
    return true;
  };
  // cb-badge.js is a deferred classic script, so it has usually run before
  // this module — but don't depend on it
  if (!hook()) {
    let tries = 0;
    const timer = setInterval(() => {
      if (hook() || ++tries > 40) clearInterval(timer);
    }, 250);
  }

  // deep link (and headless-verification hook): ?devlog=1 opens it on load
  if (new URLSearchParams(location.search).get('devlog')) show();
}
