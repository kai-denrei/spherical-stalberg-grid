// tanks2.js — planet tank combat core: the Atari Combat duel on a tiny
// Stålberg-grid sphere. Pure logic: no DOM, no three.js. Ports the
// tanks.js contract (input shape, events, match flow, AI ladder) with
// sphere geometry: positions are unit vectors, headings unit tangents,
// distances radians of arc. Radius is 1 everywhere.
import { generateSphereMesh, relax } from './grid.js';
import { buildCellGraph } from './dungeon.js';
import { makeCellIndex } from './cellindex.js';
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

// --- game -----------------------------------------------------------------
export function createPlanetTankGame(p = {}) {
  const params = {
    seed: 1, points: 400, wallClusters: 5,
    pointsToWin: 7, ricochet: false, aiLevel: 1, ...p,
  };
  const planet = generatePlanet(params);
  const game = {
    params, planet,
    cellOf: makeCellIndex(planet.centers, planet.mesh.defaultSide),
    rng: mulberry32((params.seed ^ 0x7ab1e7) >>> 0),
    tanks: planet.spawns.map((s) => ({
      pos: s.pos.slice(), head: s.head.slice(), state: 'alive',
      dyingT: 0, invulnT: 0, knockDir: [0, 0, 0], blocked: false,
    })),
    shells: [null, null],
    score: [0, 0], winner: -1, time: 0, events: [],
    aiMem: makeAiMem(),
  };
  game.step = (dt, input) => step(game, dt, input);
  return game;
}

function hitsWall(game, p) {
  const margin = WALL_MARGIN_F * game.planet.mesh.defaultSide;
  const ci = game.cellOf(p);
  if (game.planet.walls.has(ci)) return true;
  for (const nb of game.planet.adj[ci]) {
    if (game.planet.walls.has(nb) && dist3(p, game.planet.centers[nb]) < margin) return true;
  }
  return false;
}

function blockedAt(game, i, p) {
  if (hitsWall(game, p)) return true;
  const o = game.tanks[1 - i];
  return arcBetween(p, o.pos) < 2 * TANK_ANG;
}

function nearestBlockingWall(game, p) {
  const ci = game.cellOf(p);
  let best = null, bd = Infinity;
  for (const c of [ci, ...game.planet.adj[ci]]) {
    if (!game.planet.walls.has(c)) continue;
    const d = dist3(p, game.planet.centers[c]);
    if (d < bd) { bd = d; best = game.planet.centers[c]; }
  }
  return best;
}

// move along unit tangent dir by arc radians; on block, slide by
// stripping the into-wall component (TD's pattern). Returns moved?
function driveTank(game, i, dir, arc) {
  const t = game.tanks[i];
  const attempt = (d, a) => {
    const axis = norm3(cross3(t.pos, d));
    const np = norm3(rotAbout(t.pos, axis, a));
    return blockedAt(game, i, np) ? null : { np, axis, a };
  };
  let mv = attempt(dir, arc);
  if (!mv) {
    const probeAxis = norm3(cross3(t.pos, dir));
    const probe = norm3(rotAbout(t.pos, probeAxis, arc));
    const w = nearestBlockingWall(game, probe);
    const into = w ? tangentDir(t.pos, w) : null;
    if (into) {
      const slide = sub3(dir, scale3(into, dot3(dir, into)));
      const m = Math.hypot(slide[0], slide[1], slide[2]);
      if (m > 0.25) mv = attempt(scale3(slide, 1 / m), arc * m);
    }
  }
  if (!mv) return false;
  t.head = tangentAt(rotAbout(t.head, mv.axis, mv.a), mv.np);
  t.pos = mv.np;
  return true;
}

function updateTank(game, i, input, dt) {
  const t = game.tanks[i];
  if (t.invulnT > 0) t.invulnT -= dt;
  if (t.state === 'dying') {
    t.dyingT -= dt;
    const kd = tangentAt(t.knockDir, t.pos);
    if (Math.hypot(kd[0], kd[1], kd[2]) > 0.5) driveTank(game, i, kd, KNOCK_RATE * dt);
    if (t.dyingT <= 0) respawnBoth(game);
    return;
  }
  const spin = ((input.left ? 1 : 0) - (input.right ? 1 : 0)) * TURN_RATE * dt;
  if (spin) t.head = tangentAt(rotAbout(t.head, t.pos, spin), t.pos);
  t.blocked = false;
  if (input.forward) t.blocked = !driveTank(game, i, t.head, DRIVE_RATE * dt);
  else if (input.reverse) t.blocked = !driveTank(game, i, scale3(t.head, -1), REVERSE_RATE * dt);
  if (input.fire && !game.shells[i]) fireShell(game, i);
}

function respawnBoth(game) {
  for (let i = 0; i < 2; i++) {
    const s = game.planet.spawns[i], t = game.tanks[i];
    t.pos = s.pos.slice(); t.head = s.head.slice();
    t.state = 'alive'; t.dyingT = 0; t.invulnT = INVULN_T;
    t.knockDir = [0, 0, 0];
    game.shells[i] = null;
  }
  game.events.push({ type: 'respawn' });
}

// player updates first, THEN the AI decides, THEN the AI updates — the
// LOS that authorizes an AI shot is computed against final tick positions
// (race fix ported from tanks.js).
function step(game, dt, playerInput = {}) {
  game.events.length = 0;
  if (game.winner >= 0) return;
  game.time += dt;
  updateTank(game, 0, playerInput, dt);
  updateTank(game, 1, aiStep(game, dt), dt);
  for (let i = 0; i < 2; i++) updateShell(game, i, dt);
}

function fireShell() {}                    // replaced in Task 3
function updateShell() {}                  // replaced in Task 3
function makeAiMem() { return {}; }        // replaced in Task 5
function aiStep() { return {}; }           // replaced in Task 5
