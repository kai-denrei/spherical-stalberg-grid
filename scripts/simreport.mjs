// simreport.mjs — digest a simdata.jsonl into the wave-tuning picture.
// Usage: node scripts/simreport.mjs <path/to/simdata.jsonl>
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) { console.error('usage: node scripts/simreport.mjs <jsonl>'); process.exit(1); }
const runs = readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => {
  try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);

const med = (xs) => {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
};

const styles = [...new Set(runs.map((r) => r.style))];
for (const st of styles) {
  const rs = runs.filter((r) => r.style === st);
  console.log(`\n=== ${st} · ${rs.length} runs ===`);
  const by = {};
  for (const r of rs) by[r.outcome] = (by[r.outcome] || 0) + 1;
  console.log('outcomes:', JSON.stringify(by),
    '· median final wave', med(rs.map((r) => r.wave)),
    '· median score', med(rs.map((r) => r.score)));
  // the curve: per cleared wave, medians across runs
  const maxW = Math.max(0, ...rs.flatMap((r) => (r.curve || []).map((c) => c.w)));
  if (!maxW) { console.log('(no curve data)'); continue; }
  console.log('wave |  n | heart | credit | towers | clear-t | Δt');
  let prevT = null;
  for (let w = 1; w <= maxW; w++) {
    const pts = rs.flatMap((r) => (r.curve || []).filter((c) => c.w === w));
    if (!pts.length) continue;
    const t = med(pts.map((p) => p.t));
    const dt = prevT === null ? '' : String(Math.round(t - prevT)).padStart(4);
    prevT = t;
    console.log(String(w).padStart(4), '|', String(pts.length).padStart(2), '|',
      String(med(pts.map((p) => p.heart))).padStart(5), '|',
      String(med(pts.map((p) => p.credit))).padStart(6), '|',
      String(med(pts.map((p) => p.towers))).padStart(6), '|',
      String(t).padStart(7), '|', dt);
  }
  // flood detector: first wave where median credit exceeds the price of the
  // most expensive tower x3 — 'money stops being a decision' proxy
  const flood = (() => {
    for (let w = 1; w <= maxW; w++) {
      const pts = rs.flatMap((r) => (r.curve || []).filter((c) => c.w === w));
      if (pts.length && med(pts.map((p) => p.credit)) > 660) return w;
    }
    return null;
  })();
  console.log(flood ? `credit flood (median > 3x priciest tower) from wave ${flood}`
    : 'no credit flood detected in the sampled window');
}
