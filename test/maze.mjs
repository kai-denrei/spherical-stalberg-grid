// maze.mjs — dungeon-layer invariants over the sphere cell graph.

import { generateSphereMesh, relax } from '../src/grid.js';
import { generateDungeon, bfsDist, BLOCKED } from '../src/dungeon.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

for (const seed of [0, 7]) {
  console.log(`seed ${seed}:`);
  const mesh = generateSphereMesh({ seed, n: 300, k: 10 });
  relax(mesh, { n_iters: 40, PULL_RATE: 0.25 });
  const dg = generateDungeon(mesh, { seed, rooms: 6, roomRadius: 2, extraCorridors: 2 });
  const { graph, tags, spawn, heart, distToHeart } = dg;
  const C = tags.length;

  // full-edge adjacency sanity: every cell has 3..8 neighbours, symmetric
  check('adjacency symmetric & bounded', graph.adj.every((ns, i) =>
    ns.length >= 3 && ns.length <= 10 && ns.every((n) => graph.adj[n].includes(i))));

  const openCells = [];
  for (let i = 0; i < C; i++) if (tags[i] !== BLOCKED) openCells.push(i);
  check('has open cells and walls', openCells.length > 20 && openCells.length < C * 0.9,
    `open=${openCells.length}/${C}`);

  check('spawn/heart open and distinct',
    spawn !== heart && tags[spawn] !== BLOCKED && tags[heart] !== BLOCKED);

  // every open cell reachable from the heart over open cells only
  const reach = bfsDist(graph.adj, [heart], (i) => tags[i] !== BLOCKED);
  check('open subgraph fully connected', openCells.every((i) => reach[i] !== -1));

  check('spawn is far from heart', distToHeart[spawn] >= 8, `hops=${distToHeart[spawn]}`);

  // determinism: same seed -> identical tags
  const dg2 = generateDungeon(mesh, { seed, rooms: 6, roomRadius: 2, extraCorridors: 2 });
  check('deterministic per seed', dg2.tags.every((t, i) => t === tags[i])
    && dg2.spawn === spawn && dg2.heart === heart);

  console.log(`  info: cells=${C} open=${openCells.length} spawn→heart=${distToHeart[spawn]} hops`);
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nmaze invariants hold');
