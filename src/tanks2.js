// tanks2.js — planet tank combat core: the Atari Combat duel on a tiny
// Stålberg-grid sphere. Pure logic: no DOM, no three.js. Ports the
// tanks.js contract (input shape, events, match flow, AI ladder) with
// sphere geometry: positions are unit vectors, headings unit tangents,
// distances radians of arc. Radius is 1 everywhere.
import { generateSphereMesh, relax } from './grid.js';
import { buildCellGraph } from './dungeon.js';
import { mulberry32 } from './rng.js';
import {
  norm3, scale3, mean3, dot3, cross3, sub3, dist3, tangentBasis,
} from './vec3.js';

export const TANK_ANG = 0.06;      // tank collision radius (arc)
export const SHELL_ANG = 0.018;
export const TURRET_H = 0.03;      // turret height above surface (of R)
export const TURN_RATE = 2.4;      // rad/s heading spin
export const DRIVE_RATE = Math.PI / 8;  // rad/s of arc: pole to pole in 8 s
export const REVERSE_RATE = DRIVE_RATE / 2;
export const SHELL_RATE = 1.1;     // rad/s of arc
export const SHELL_RANGE = 0.4 * 2 * Math.PI; // 40% of circumference
export const MAX_BOUNCES = 2;
export const DYING_T = 0.8;
export const INVULN_T = 1.5;
export const KNOCK_RATE = 0.8;     // rad/s knockback slide
export const WALL_MARGIN_F = 0.62; // of defaultSide

// --- sphere helpers -------------------------------------------------------
export function rotAbout(p, axis, ang) { // Rodrigues; axis unit
  const c = Math.cos(ang), s = Math.sin(ang);
  const d = dot3(axis, p) * (1 - c);
  return [
    p[0] * c + (axis[1] * p[2] - axis[2] * p[1]) * s + axis[0] * d,
    p[1] * c + (axis[2] * p[0] - axis[0] * p[2]) * s + axis[1] * d,
    p[2] * c + (axis[0] * p[1] - axis[1] * p[0]) * s + axis[2] * d,
  ];
}

export const tangentAt = (v, p) => norm3(sub3(v, scale3(p, dot3(p, v))));

export function tangentDir(p, target) {
  const d = sub3(target, scale3(p, dot3(p, target)));
  const l = Math.hypot(d[0], d[1], d[2]);
  return l < 1e-9 ? null : scale3(d, 1 / l);
}

export const arcBetween = (a, b) =>
  Math.acos(Math.min(1, Math.max(-1, dot3(a, b))));

// --- planet ---------------------------------------------------------------
// Small relaxed sphere mesh + seeded wall clusters. Spawns at the open
// cells nearest the ±X poles; clusters keep 3 side-lengths clear of both;
// open cells must stay connected (retry with a stride-offset seed).
export function generatePlanet(params) {
  const points = params.points ?? 400;
  const wallClusters = params.wallClusters ?? 5;
  for (let attempt = 0; attempt < 12; attempt++) {
    const mesh = generateSphereMesh({
      seed: ((params.seed ?? 1) + attempt * 7919) >>> 0,
      n: points, k: 10, radius: 1,
    });
    relax(mesh, { n_iters: 40 });
    const graphData = buildCellGraph(mesh);
    const adj = graphData.adj;
    const centers = mesh.quads.map((q) =>
      norm3(mean3(q.map((vi) => mesh.vertices[vi]))));
    // NOTE: we compute centers from normalized quad positions rather than using graphData.centers
    // because graphData.centers are scaled by mesh.radius, and we need unit vectors
    const nearestTo = (p) => {
      let best = 0, bd = -2;
      for (let i = 0; i < centers.length; i++) {
        const d = dot3(centers[i], p);
        if (d > bd) { bd = d; best = i; }
      }
      return best;
    };
    const sA = nearestTo([1, 0, 0]);
    const sB = nearestTo([-1, 0, 0]);
    const rng = mulberry32(((params.seed ?? 1) ^ 0x9142) >>> 0);
    const side = mesh.defaultSide;
    const walls = new Set();
    const clearOfSpawns = (ci) =>
      dist3(centers[ci], centers[sA]) > 3 * side
      && dist3(centers[ci], centers[sB]) > 3 * side;
    for (let c = 0; c < wallClusters; c++) {
      let seedCell = -1;
      for (let tries = 0; tries < 40 && seedCell < 0; tries++) {
        const cand = Math.floor(rng() * centers.length);
        if (!walls.has(cand) && clearOfSpawns(cand)) seedCell = cand;
      }
      if (seedCell < 0) continue;
      const cluster = [seedCell];
      walls.add(seedCell);
      const size = 2 + Math.floor(rng() * 4);
      for (let g = 0; g < 12 && cluster.length < size; g++) {
        const from = cluster[Math.floor(rng() * cluster.length)];
        const nbs = adj[from].filter((n) => !walls.has(n) && clearOfSpawns(n));
        if (!nbs.length) continue;
        const pick = nbs[Math.floor(rng() * nbs.length)];
        walls.add(pick);
        cluster.push(pick);
      }
    }
    // connectivity of open cells, spawn to spawn
    const seen = new Set([sA]);
    const q = [sA];
    while (q.length) {
      const c = q.shift();
      for (const nb of adj[c]) if (!walls.has(nb) && !seen.has(nb)) { seen.add(nb); q.push(nb); }
    }
    if (!seen.has(sB)) continue;
    const mkSpawn = (cell, other) => {
      const pos = centers[cell];
      const head = tangentDir(pos, centers[other]) ?? tangentBasis(pos)[0];
      return { cell, pos, head };
    };
    return { mesh, centers, adj, walls, spawns: [mkSpawn(sA, sB), mkSpawn(sB, sA)] };
  }
  // pathological seed: give up on walls, bare planet is always connected
  return generatePlanet({ ...params, wallClusters: 0 });
}
