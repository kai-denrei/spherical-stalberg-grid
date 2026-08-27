// segkey.mjs — the undirected-segment key used to stop coincident edges
// being drawn twice.
//
// Regression guard for a real bug. td-tab emitted all four boundary edges
// of every open cell, so every interior edge was pushed TWICE -- once per
// adjacent cell -- and the edge material is ADDITIVE, so the duplicates
// summed. Measured on seed 7: 4019 distinct edges, 6016 emitted, and up to
// 14 segment endpoints landing on a single vertex. Vertices ran up to 14x
// the base edge brightness, blew past the bloom threshold that edge
// midspans stayed under, and bloomed into squarish blobs on every vertex.
//
// The subtle part is ORDER INDEPENDENCE: twin edges are wound in opposite
// directions (a->b in one cell, b->a in its neighbour). A key that isn't
// order-independent dedupes nothing at all, silently.

import { segKey } from '../src/vec3.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

const a = [0.1234567, -0.9, 0.5];
const b = [-0.42, 0.0001, 0.77];

console.log('order independence (the whole point):');
check('a->b and b->a give the SAME key', segKey(a, b) === segKey(b, a),
  `${segKey(a, b)} vs ${segKey(b, a)}`);

console.log('distinctness:');
check('different segments differ', segKey(a, b) !== segKey(a, [0.5, 0.5, 0.5]));
check('a degenerate segment is still a key', typeof segKey(a, a) === 'string');
check('near-identical but distinct points differ',
  segKey([0, 0, 0], [1e-3, 0, 0]) !== segKey([0, 0, 0], [2e-3, 0, 0]));

console.log('quantization absorbs float noise:');
check('float dust collapses to one key',
  segKey(a, b) === segKey([0.1234567 + 1e-11, -0.9, 0.5], b));

console.log('real duplicate rate on an actual board:');
{
  const { generateSphereMesh, relax } = await import('../src/grid.js');
  const { generateDungeon, BLOCKED } = await import('../src/dungeon.js');
  const mesh = generateSphereMesh({ seed: 7, n: 3000, k: 10 });
  relax(mesh, { n_iters: 80, PULL_RATE: 0.25 });
  const dg = generateDungeon(mesh, { seed: 7, rooms: 16, roomRadius: 4, extraCorridors: 8 });
  const seen = new Set();
  let emitted = 0, deduped = 0;
  for (let ci = 0; ci < mesh.quads.length; ci++) {
    if (dg.tags[ci] === BLOCKED) continue;
    const q = mesh.quads[ci];
    for (let i = 0; i < 4; i++) {
      emitted++;
      const k = segKey(mesh.vertices[q[i]], mesh.vertices[q[(i + 1) % 4]]);
      if (!seen.has(k)) { seen.add(k); deduped++; }
    }
  }
  console.log(`       ${emitted} emitted -> ${deduped} unique (${(emitted / deduped).toFixed(2)}x duplication)`);
  check('dedupe actually removes ~a third of the segments',
    deduped < emitted * 0.75, `${deduped}/${emitted}`);
  check('dedupe keeps every distinct edge', deduped > emitted * 0.5);
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsegment-key invariants hold');
