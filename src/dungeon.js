// dungeon.js — rooms-and-hallways carved over the sphere grid's CELL GRAPH.
// Pure logic, NO DOM — unit-tests in Node. Method ported from HokorobiTawaa:
//
//   "We don't draw hallways. We find them." The board is a graph of cells
//   where two cells are connected only if they share a FULL edge (corner
//   contact doesn't count — no diagonal shortcuts through a wall corner).
//   A hallway is the shortest chain of connected cells between two points.
//   Everything defaults to 'blocked' (elevated walls); corridors and rooms
//   are tagged open. Distances are hops on the graph, never world units.
//
// Here the cells are the quads of grid.js's spherical mesh. On a closed
// sphere there is no boundary to hug, so corridors always wrap somewhere
// interesting; the double-BFS diameter trick still finds the "two most
// distant" cells for spawn and heart.

import { mulberry32 } from './rng.js';
import { sub3, dot3, cross3, norm3, mean3, scale3 } from './vec3.js';

export const BLOCKED = 0;
export const PATH = 1;
export const ROOM = 2;

// --- cell graph ------------------------------------------------------------
// adj[i] = quads sharing a FULL edge with quad i (2D rule from
// HokorobiTawaa generate.ts:45 — corner-touching doesn't connect).
export function buildCellGraph(mesh) {
  const { vertices, quads, radius } = mesh;
  const C = quads.length;

  const edgeOwner = new Map(); // "a-b" -> quad index seen first
  const adj = Array.from({ length: C }, () => []);
  for (let qi = 0; qi < C; qi++) {
    const q = quads[qi];
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const other = edgeOwner.get(key);
      if (other === undefined) edgeOwner.set(key, qi);
      else { adj[qi].push(other); adj[other].push(qi); }
    }
  }

  const centers = quads.map((q) => scale3(norm3(mean3(q.map((vi) => vertices[vi]))), radius));
  const normals = centers.map((c) => norm3(c));
  return { adj, centers, normals };
}

// --- BFS primitives --------------------------------------------------------
// Multi-source hop distances. `passable(i)` limits the traversable set;
// unreachable cells get -1.
export function bfsDist(adj, sources, passable = null) {
  const dist = new Int32Array(adj.length).fill(-1);
  const queue = [];
  for (const s of sources) { dist[s] = 0; queue.push(s); }
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    for (const nb of adj[cur]) {
      if (dist[nb] !== -1) continue;
      if (passable && !passable(nb)) continue;
      dist[nb] = dist[cur] + 1;
      queue.push(nb);
    }
  }
  return dist;
}

// Shortest cell chain a -> first cell satisfying `goal`, avoiding `avoid`
// (endpoints exempt). Parent-pointer reconstruction. null if unreachable.
export function bfsPath(adj, start, goal, avoid = null) {
  const parent = new Int32Array(adj.length).fill(-2);
  parent[start] = -1;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    if (goal(cur)) {
      const path = [];
      for (let c = cur; c !== -1; c = parent[c]) path.push(c);
      return path.reverse();
    }
    for (const nb of adj[cur]) {
      if (parent[nb] !== -2) continue;
      if (avoid && avoid.has(nb) && !goal(nb)) continue;
      parent[nb] = cur;
      queue.push(nb);
    }
  }
  return null;
}

// Double-BFS diameter endpoints over a passable subset.
export function diameterEndpoints(adj, passable) {
  let first = -1;
  for (let i = 0; i < adj.length; i++) if (passable(i)) { first = i; break; }
  const argmax = (dist) => {
    let best = -1, bd = -1;
    for (let i = 0; i < dist.length; i++) {
      if (passable(i) && dist[i] > bd) { bd = dist[i]; best = i; }
    }
    return best;
  };
  const a = argmax(bfsDist(adj, [first], passable));
  const b = argmax(bfsDist(adj, [a], passable));
  return [a, b];
}

// --- dungeon generation ----------------------------------------------------
// 1. farthest-point-sample `rooms` seeds over the whole graph
// 2. connect each seed to the nearest already-carved cell with a BFS corridor
// 3. blow each seed up into a room (cells within roomRadius hops)
// 4. extra corridors between random room pairs, avoiding existing hallway
//    interiors -> genuinely distinct routes = cycles = a maze, not a tree
// 5. spawn & heart = double-BFS diameter endpoints of the OPEN subgraph
export function generateDungeon(mesh, {
  seed = 0, rooms = 6, roomRadius = 2, extraCorridors = 2,
} = {}) {
  const graph = buildCellGraph(mesh);
  const { adj } = graph;
  const C = adj.length;
  const rng = mulberry32((seed ^ 0x5bd1e995) >>> 0);

  // 1. room seeds, spread by farthest-point sampling
  const seeds = [Math.floor(rng() * C)];
  while (seeds.length < rooms) {
    const dist = bfsDist(adj, seeds);
    let best = 0, bd = -1;
    for (let i = 0; i < C; i++) if (dist[i] > bd) { bd = dist[i]; best = i; }
    seeds.push(best);
  }

  const tags = new Uint8Array(C).fill(BLOCKED);

  // 2. spanning corridors: each new seed digs to the nearest carved cell
  const carved = new Set([seeds[0]]);
  tags[seeds[0]] = PATH;
  for (let i = 1; i < seeds.length; i++) {
    const path = bfsPath(adj, seeds[i], (c) => carved.has(c));
    if (!path) continue; // cannot happen on a connected closed mesh, but be safe
    for (const c of path) { tags[c] = PATH; carved.add(c); }
  }

  // 3. rooms: blob of cells within roomRadius hops of each seed
  for (const s of seeds) {
    const d = bfsDist(adj, [s]);
    for (let i = 0; i < C; i++) {
      if (d[i] !== -1 && d[i] <= roomRadius) { tags[i] = ROOM; carved.add(i); }
    }
  }

  // 4. extra corridors around the existing hallways (best-effort)
  for (let t = 0; t < extraCorridors; t++) {
    const a = seeds[Math.floor(rng() * seeds.length)];
    let b = seeds[Math.floor(rng() * seeds.length)];
    if (a === b) b = seeds[(seeds.indexOf(a) + 1) % seeds.length];
    const avoid = new Set();
    for (let i = 0; i < C; i++) if (tags[i] === PATH) avoid.add(i);
    const path = bfsPath(adj, a, (c) => c === b, avoid);
    if (!path) continue;
    for (const c of path) { if (tags[c] === BLOCKED) { tags[c] = PATH; carved.add(c); } }
  }

  // 5. spawn & heart: the two most-distant open cells
  const open = (i) => tags[i] !== BLOCKED;
  const [spawn, heart] = diameterEndpoints(adj, open);
  const distToHeart = bfsDist(adj, [heart], open);

  return { graph, tags, seeds, spawn, heart, distToHeart };
}
