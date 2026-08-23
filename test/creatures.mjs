// creatures.mjs — sanity on the Braille dot-cloud ports.

import { CREATURES, waveJelly } from '../src/creatures.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

for (const [name, gen] of Object.entries(CREATURES)) {
  console.log(`${name}:`);
  const pts = gen();
  check('has points', pts.length > 300, `got ${pts.length}`);
  check('all finite', pts.every((p) => p.slice(0, 3).every(Number.isFinite)));
  const maxR = Math.max(...pts.map((p) => Math.hypot(p[0], p[1], p[2])));
  check('unit radius', Math.abs(maxR - 1) < 1e-9, `max ${maxR}`);
  // jellyfish has no pops in the Braille source; the other two do
  if (name !== 'jellyfish') check('has highlight dots', pts.some((p) => p[3] === 1));

  const out = new Float32Array(pts.length * 3);
  waveJelly(pts, 1.7, out);
  check('treatment output finite', out.every(Number.isFinite));
  // wave+jelly deform but stay bounded: nothing should fly off
  let m = 0;
  for (let i = 0; i < pts.length; i++) {
    m = Math.max(m, Math.hypot(out[i * 3], out[i * 3 + 1], out[i * 3 + 2]));
  }
  check('treatment bounded (<1.6)', m < 1.6, `max ${m.toFixed(3)}`);

  // phagocytosis reach: stretches toward the target, stays bounded
  const out2 = new Float32Array(pts.length * 3);
  waveJelly(pts, 1.7, out2, { reachDir: [1, 0, 0], reachAmt: 1 });
  check('reach output finite', out2.every(Number.isFinite));
  let mx = 0, m2 = 0;
  for (let i = 0; i < pts.length; i++) {
    mx = Math.max(mx, out2[i * 3]);
    m2 = Math.max(m2, Math.hypot(out2[i * 3], out2[i * 3 + 1], out2[i * 3 + 2]));
  }
  const mxBase = Math.max(...Array.from({ length: pts.length }, (_, i) => out[i * 3]));
  // pow(alignment,5) falloff means only near-axis points stretch fully;
  // an 8% max-extent gain already reads as a pseudopod
  check('reach extends +X beyond rest pose', mx > mxBase * 1.08, `${mx.toFixed(2)} vs ${mxBase.toFixed(2)}`);
  check('reach bounded (<3.2)', m2 < 3.2, `max ${m2.toFixed(3)}`);
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\ncreature invariants hold');
