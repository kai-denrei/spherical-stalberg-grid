// sim-tab.js — the tier-1 gameplay simulator's CONTROLLER. The simulation
// itself is the REAL game: this tab loads the page into a same-origin
// iframe with ?sim=<style>&seed=N&simfast=K (td-tab's autoplay), collects
// each run's SIMRESULT via postMessage, and aggregates. One iframe at a
// time, reloaded per run — sequential on purpose: this is a 16GB machine
// and parallel game instances are how it kernel-panicked once already.

export function initSimTab(root) {
  const $ = (sel) => root.querySelector(sel);
  const rowsEl = $('#sim-rows');
  const aggEl = $('#sim-agg');
  const statusEl = $('#sim-status');
  const frame = $('#sim-frame');
  let running = false;
  let results = [];

  const median = (xs) => {
    if (!xs.length) return 0;
    const a = [...xs].sort((x, y) => x - y);
    return a.length % 2 ? a[(a.length - 1) / 2]
      : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
  };

  function renderAgg() {
    if (!results.length) { aggEl.innerHTML = ''; return; }
    const wins = results.filter((r) => r.outcome === 'win').length;
    const losses = results.filter((r) => r.outcome === 'loss').length;
    const stalls = results.length - wins - losses;
    aggEl.innerHTML =
      `<b>${results.length} runs</b> · win ${wins} · loss ${losses} · other ${stalls}`
      + ` · median wave <b>${median(results.map((r) => r.wave ?? 0))}</b>`
      + ` · median score <b>${Math.round(median(results.map((r) => r.score ?? 0)))}</b>`
      + ` · median heart ${median(results.map((r) => r.heart ?? 0))}/10`;
  }

  function addRow(r) {
    const tr = document.createElement('tr');
    tr.className = `sim-${r.outcome}`;
    tr.innerHTML = `<td>${r.seed}</td><td>${r.outcome}</td><td>${r.wave ?? '—'}</td>`
      + `<td>${r.round ?? '—'}</td><td>${r.score ?? '—'}</td><td>${r.heart ?? '—'}</td>`
      + `<td>${r.lives ?? '—'}</td><td>${r.towers ?? '—'}</td><td>${r.biomass ?? '—'}</td>`
      + `<td>${r.simT ?? '—'}</td>`;
    rowsEl.appendChild(tr);
  }

  function runOne(style, seed, fast) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (payload) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        removeEventListener('message', onMsg);
        frame.src = 'about:blank'; // release the run's whole world
        resolve(payload);
      };
      // real-time ceiling: 600 sim-seconds at 50x is ~12s plus boot; a run
      // that needs 3 minutes of wall clock is wedged, not slow
      const timer = setTimeout(() => finish(null), 180000);
      const onMsg = (ev) => {
        if (ev.data && ev.data.simresult) finish(ev.data.simresult);
      };
      addEventListener('message', onMsg);
      frame.src = `${location.pathname}?sim=${encodeURIComponent(style)}`
        + `&seed=${seed}&simfast=${fast}#td`;
    });
  }

  async function runBatch() {
    if (running) return;
    running = true;
    results = [];
    rowsEl.innerHTML = '';
    renderAgg();
    const style = $('#sim-style').value;
    const n = Math.max(1, Math.min(200, parseInt($('#sim-seeds').value, 10) || 10));
    const fast = Math.max(1, Math.min(120, parseInt($('#sim-fast').value, 10) || 50));
    for (let i = 0; i < n && running; i++) {
      const seed = 1000 + i; // fixed ladder: styles compare on the SAME seeds
      statusEl.textContent = `run ${i + 1}/${n} · seed ${seed}…`;
      const r = (await runOne(style, seed, fast))
        || { style, seed, outcome: 'stalled' };
      results.push(r);
      addRow(r);
      renderAgg();
    }
    statusEl.textContent = running ? 'done' : 'stopped';
    running = false;
  }

  $('#sim-run').addEventListener('click', runBatch);
  $('#sim-stop').addEventListener('click', () => {
    running = false;
    frame.src = 'about:blank';
    statusEl.textContent = 'stopped';
  });

  return { name: 'sim' };
}
