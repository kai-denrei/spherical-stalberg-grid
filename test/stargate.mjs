// stargate.mjs — the gate's shape contract. Two bugs shipped an empty
// portal centre for weeks while geometry probes kept passing: a gallery
// rotY ported as if it were the design (the disc spun edge-on inside a
// ring that never rotates), and a brightness array indexed from i0 instead
// of zero (every write out of bounds whenever the horizon shares a buffer
// with the ring, so the first tick painted the centre black). These pin
// both, the way each actually failed: through the GAME's calling
// convention (i0 = ring length), not the lab's (i0 = 0).
import {
  STARGATE_PTS, STARGATE_STROKE, HORIZON_N, HORIZON_R, stargateHorizon,
} from '../src/stargate.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

console.log('ring:');
{
  check('point order is a drawing order (stroke before chevrons)',
    STARGATE_STROKE < STARGATE_PTS.length,
    `stroke=${STARGATE_STROKE} n=${STARGATE_PTS.length}`);
}

console.log('horizon, called the way the GAME calls it (i0 = ring length):');
{
  const H0 = STARGATE_PTS.length;
  const pos = new Float32Array((H0 + HORIZON_N) * 3);
  const bri = new Float32Array(HORIZON_N);
  for (const t of [0, 1.1, 3.5, 7.0]) {
    const k = stargateHorizon(t, pos, bri, H0);
    check(`t=${t}: fills exactly HORIZON_N dots`, k === H0 + HORIZON_N,
      `k=${k} expected ${H0 + HORIZON_N}`);
    // every brightness LANDS — bri is horizon-local, zero-based. Indexing
    // it by the absolute k dropped all writes out of bounds; the read-back
    // zeros then multiplied the centre to black.
    let dark = 0, minB = Infinity;
    for (let i = 0; i < HORIZON_N; i++) {
      if (bri[i] <= 0) dark++;
      minB = Math.min(minB, bri[i]);
    }
    check(`t=${t}: no dot is dark`, dark === 0,
      `dark=${dark} minB=${minB.toFixed(3)}`);
    // the disc stays IN the ring plane — the ring never rotates, so any
    // rotation here spins the centre edge-on and invisible. Only the small
    // z ripple is allowed. Radius stays measured in the ring's own plane.
    let maxZ = 0, minR = Infinity, maxR = 0;
    for (let i = 0; i < HORIZON_N; i++) {
      const x = pos[(H0 + i) * 3], y = pos[(H0 + i) * 3 + 1], z = pos[(H0 + i) * 3 + 2];
      maxZ = Math.max(maxZ, Math.abs(z));
      const r = Math.hypot(x, y);
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    }
    check(`t=${t}: disc stays in the ring plane`, maxZ < 0.1, `maxZ=${maxZ.toFixed(3)}`);
    check(`t=${t}: radii span the throat`, minR > 0 && maxR > HORIZON_R * 0.95,
      `r=${minR.toFixed(3)}..${maxR.toFixed(3)}`);
  }
  // the surface must MOVE: same dot index, different t, different place
  const pA = new Float32Array((H0 + HORIZON_N) * 3);
  const pB = new Float32Array((H0 + HORIZON_N) * 3);
  stargateHorizon(0, pA, bri, H0);
  stargateHorizon(2, pB, bri, H0);
  let moved = 0;
  for (let i = 0; i < HORIZON_N; i++) {
    const j = (H0 + i) * 3;
    if (Math.hypot(pA[j] - pB[j], pA[j + 1] - pB[j + 1], pA[j + 2] - pB[j + 2]) > 1e-3) moved++;
  }
  check('the centre is animated (dots move between ticks)', moved > HORIZON_N * 0.9,
    `moved=${moved}/${HORIZON_N}`);
}

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('stargate: all good');
