// smoke.mjs — pipeline invariants, run in Node: `node test/smoke.mjs`
// The render layer is browser-verified; everything below is the math.

import { generateSphereMesh, relax, squarenessError, valences } from '../src/grid.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

for (const seed of [0, 1, 42]) {
  console.log(`seed ${seed}:`);
  const mesh = generateSphereMesh({ seed, n: 300, k: 10, radius: 1 });
  const { vertices, quads } = mesh;

  check('has quads', quads.length > 300, `got ${quads.length}`);
  check('all faces are quads with 4 distinct verts',
    quads.every((q) => q.length === 4 && new Set(q).size === 4));

  // Watertight closed surface: every edge shared by exactly 2 quads.
  const edgeCount = new Map();
  for (const q of quads) {
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
    }
  }
  check('watertight (every edge in exactly 2 quads)',
    [...edgeCount.values()].every((c) => c === 2));

  // Euler characteristic of a sphere: V − E + F = 2.
  const V = vertices.length, E = edgeCount.size, F = quads.length;
  check('Euler V−E+F=2', V - E + F === 2, `got ${V - E + F}`);

  // Discrete defect law for a closed quad mesh on S²: Σ(4 − valence) = 8.
  const val = valences(mesh);
  const defectSum = val.reduce((s, v) => s + (4 - v), 0);
  check('Σ(4−valence)=8', defectSum === 8, `got ${defectSum}`);

  // Every vertex on the sphere.
  const onSphere = vertices.every((p) => Math.abs(Math.hypot(...p) - 1) < 1e-9);
  check('all vertices on sphere (pre-relax)', onSphere);

  // Relaxation reduces squareness error, keeps vertices on-sphere, no NaN.
  const before = squarenessError(mesh);
  relax(mesh, { n_iters: 60, PULL_RATE: 0.25 });
  const after = squarenessError(mesh);
  check('relax reduces squareness error', after < before,
    `before=${before.toFixed(4)} after=${after.toFixed(4)}`);
  check('no NaN after relax', vertices.every((p) => p.every(Number.isFinite)));
  check('all vertices on sphere (post-relax)',
    vertices.every((p) => Math.abs(Math.hypot(...p) - 1) < 1e-9));
  console.log(`  info: V=${V} E=${E} F=${F} err ${before.toFixed(4)} -> ${after.toFixed(4)}`);
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nall invariants hold');
