// devlog.js — clicking the cache-bust badge opens DEVLOG.md in an overlay.
// The badge (#cb-badge) belongs to the cache-busting toolkit and gets
// overwritten on reinstall, so we hook it from outside (capture phase)
// rather than editing cb-badge.js. The markdown renderer below covers
// exactly what these docs use: h1/h2/h3, hr, paragraphs, bullet lists,
// pipe tables, blockquotes, `code`, **bold**, *italic*, [links](…) — not
// general markdown. Lists and tables were added for TECH-STACK.md, which
// has to be SCANNED rather than read; the blockquote is how a doc marks
// its one load-bearing sentence, which the styles set as a pull-quote.

export function mdToHtml(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const out = [];
  let para = [];
  let list = null;   // open <ul> item buffer
  let table = null;  // open table: { head, rows }
  let quote = null;  // open blockquote line buffer

  const flushPara = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
  };
  const flushList = () => {
    if (!list) return;
    out.push(`<ul>${list.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`);
    list = null;
  };
  const flushTable = () => {
    if (!table) return;
    const th = table.head.map((c) => `<th>${inline(c)}</th>`).join('');
    const tr = table.rows
      .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
      .join('');
    out.push(`<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`);
    table = null;
  };
  const flushQuote = () => {
    if (!quote) return;
    out.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`);
    quote = null;
  };
  const flush = () => { flushPara(); flushList(); flushTable(); flushQuote(); };

  // a pipe row -> cells, tolerating optional leading/trailing pipes
  const cells = (line) => line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

  for (const line of md.split('\n')) {
    const t = line.trim();
    // a run of "> " lines is one blockquote, wrapped lines rejoined
    if (t.startsWith('> ')) { flushPara(); flushList(); flushTable(); (quote ||= []).push(t.slice(2)); continue; }
    flushQuote();
    if (t.startsWith('|')) {
      // the |---|---| separator only marks the header; it draws nothing
      if (/^\|[\s:|-]+\|?$/.test(t)) continue;
      if (!table) table = { head: cells(t), rows: [] };
      else table.rows.push(cells(t));
      flushPara(); flushList();
      continue;
    }
    flushTable();
    if (/^[-*] /.test(t)) { flushPara(); (list ||= []).push(t.slice(2)); continue; }
    // an INDENTED line under an open list continues that item. without this a
    // wrapped bullet used to break into a one-line <li> plus an orphan <p>,
    // splitting any *emphasis* that straddled the wrap.
    if (list && t && /^\s/.test(line)) { list[list.length - 1] += ` ${t}`; continue; }
    flushList();
    if (t.startsWith('### ')) { flush(); out.push(`<h3>${inline(t.slice(4))}</h3>`); }
    else if (t.startsWith('## ')) { flush(); out.push(`<h2>${inline(t.slice(3))}</h2>`); }
    else if (t.startsWith('# ')) { flush(); out.push(`<h1>${inline(t.slice(2))}</h1>`); }
    else if (/^---\s*$/.test(t)) { flush(); out.push('<hr>'); }
    else if (t === '') flush();
    else para.push(t);
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
    '<div id="devlog-content" class="mdview">loading…</div>' +
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
      openLogTab();
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
  if (new URLSearchParams(location.search).get('devlog')) openLogTab();
}

// The log lives in a real tab now, alongside the roadmap and the build token,
// rather than in an overlay of its own. The badge stays as the shortcut to it
// — it is still the fastest answer to "which build am I looking at" — but the
// detail it used to imply is on the page it opens. Navigating by clicking the
// existing tab button keeps one code path owning tab switching.
function openLogTab() {
  const btn = document.querySelector('#tabbar button[data-tab="log"]');
  if (btn) { btn.click(); return; }
  show();   // no tab bar (a stripped page): fall back to the overlay
}
