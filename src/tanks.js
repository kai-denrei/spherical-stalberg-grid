// tanks.js — Atari-Combat tank duel core. Pure logic: no DOM, no three.js.
// Coordinates: XZ plane, x right, z down (top view). heading in radians,
// 0 = +x, π/2 = +z. Tank 0 is the player (red), tank 1 the AI (blue).
// Arena cells are 1 world unit; cell (col c, row r) spans [c,c+1]×[r,r+1].
import { mulberry32 } from './rng.js';

export const TANK_R = 0.42;
export const SHELL_R = 0.12;
export const TURN_RATE = 2.4;       // rad/s
export const DRIVE_SPEED = 4.0;     // units/s
export const REVERSE_SPEED = 2.0;   // half speed, per spec
export const SHELL_SPEED = 11.0;
export const SHELL_RANGE_FRAC = 0.6; // of arena width
export const MAX_BOUNCES = 2;
export const DYING_T = 0.8;
export const INVULN_T = 1.5;
export const KNOCKBACK_SPEED = 3.0;

// --- arenas ---------------------------------------------------------------
// 26×20 ASCII maps. '.' empty, '#' block, '1'/'2' spawns ('1' left).
export const CLASSIC_ARENAS = {
  open: (() => {
    const empty = '.'.repeat(26);
    const rows = Array.from({ length: 20 }, () => empty);
    rows[9] = '..1' + '.'.repeat(20) + '2..';
    return rows;
  })(),
  brackets: [
    '..........................',
    '............##............',
    '............##............',
    '..........................',
    '....##..............##....',
    '....#................#....',
    '....#....##....##....#....',
    '..........................',
    '..........................',
    '..1........##..........2..',
    '..........................',
    '..........................',
    '....#....##....##....#....',
    '....#................#....',
    '....##..............##....',
    '..........................',
    '..........................',
    '............##............',
    '............##............',
    '..........................',
  ],
  maze: [
    '..........................',
    '..####.....####.....####..',
    '..........................',
    '.........#......#.........',
    '..........................',
    '....##.....####.....##....',
    '..........................',
    '..#....##........##....#..',
    '..........................',
    '..1...#....####....#...2..',
    '..........................',
    '..#....##........##....#..',
    '..........................',
    '....##.....####.....##....',
    '..........................',
    '.........#......#.........',
    '..........................',
    '..####.....####.....####..',
    '..........................',
    '..........................',
  ],
};

export function parseArena(rows) {
  const h = rows.length, w = rows[0].length;
  if (rows.some((r) => r.length !== w)) throw new Error('ragged arena');
  const blocks = [];
  const spawnCells = {};
  for (let r = 0; r < h; r++) {
    let run = -1;
    for (let c = 0; c <= w; c++) {
      const ch = c < w ? rows[r][c] : '.';
      if (ch === '#') { if (run < 0) run = c; }
      else if (run >= 0) { blocks.push({ minX: run, maxX: c, minZ: r, maxZ: r + 1 }); run = -1; }
      if (ch === '1' || ch === '2') spawnCells[ch] = [c + 0.5, r + 0.5];
    }
  }
  if (!spawnCells['1'] || !spawnCells['2']) throw new Error('need spawns 1 and 2');
  const [s1, s2] = [spawnCells['1'], spawnCells['2']];
  const spawns = [
    { x: s1[0], z: s1[1], heading: Math.atan2(s2[1] - s1[1], s2[0] - s1[0]) },
    { x: s2[0], z: s2[1], heading: Math.atan2(s1[1] - s2[1], s1[0] - s2[0]) },
  ];
  return { w, h, blocks, spawns };
}

export function arenaConnected(rows) {
  const h = rows.length, w = rows[0].length;
  let start = null, goal = null;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    if (rows[r][c] === '1') start = [c, r];
    if (rows[r][c] === '2') goal = [c, r];
  }
  if (!start || !goal) return false;
  const seen = new Set([start.join(',')]);
  const q = [start];
  while (q.length) {
    const [c, r] = q.shift();
    if (c === goal[0] && r === goal[1]) return true;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      const key = nc + ',' + nr;
      if (nc < 0 || nc >= w || nr < 0 || nr >= h) continue;
      if (rows[nr][nc] === '#' || seen.has(key)) continue;
      seen.add(key); q.push([nc, nr]);
    }
  }
  return false;
}

// Seeded procedural layout: random small rectangles in the left half,
// mirrored to the right; spawn zone kept clear; retried until connected.
export function genArena(seed) {
  const rng = mulberry32(seed >>> 0);
  const W = 26, H = 20;
  for (let attempt = 0; attempt < 20; attempt++) {
    const g = Array.from({ length: H }, () => Array(W).fill('.'));
    const nBlocks = 6 + Math.floor(rng() * 5);
    for (let b = 0; b < nBlocks; b++) {
      const bw = 1 + Math.floor(rng() * 3);
      const bh = 1 + Math.floor(rng() * 3);
      const c0 = 2 + Math.floor(rng() * (11 - bw));
      const r0 = 1 + Math.floor(rng() * (H - 2 - bh));
      if (c0 <= 4 && r0 <= 11 && r0 + bh >= 8) continue; // spawn zone stays clear
      for (let r = r0; r < r0 + bh; r++)
        for (let c = c0; c < c0 + bw; c++) { g[r][c] = '#'; g[r][W - 1 - c] = '#'; }
    }
    g[9][2] = '1'; g[9][23] = '2';
    const rows = g.map((r) => r.join(''));
    if (arenaConnected(rows)) return rows;
  }
  return CLASSIC_ARENAS.open;
}

// --- game -----------------------------------------------------------------
function circleHitsAABB(x, z, r, b) {
  const cx = Math.max(b.minX, Math.min(x, b.maxX));
  const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
  const dx = x - cx, dz = z - cz;
  return dx * dx + dz * dz < r * r;
}

// axis-separated move: blocked axes are dropped so the tank slides.
// Boundaries are clamped; obstacles (blocks, tanks) halt the move on that axis.
function tryMove(game, i, dx, dz) {
  const t = game.tanks[i];
  const { arena, tanks } = game;
  const o = tanks[1 - i];
  let ok = true;

  // Try x movement: clamp to boundaries, check for obstacles
  let newX = t.x + dx;
  const clampedX = Math.max(TANK_R, Math.min(newX, arena.w - TANK_R));
  const xClamped = clampedX !== newX;
  const xBlocked = circleHitsAnyBlock(clampedX, t.z, TANK_R, arena.blocks) ||
                   circleTouches(clampedX, t.z, TANK_R, o.x, o.z);
  if (xBlocked) {
    ok = false;
  } else {
    t.x = clampedX;
    if (xClamped) ok = false;
  }

  // Try z movement: clamp to boundaries, check for obstacles
  let newZ = t.z + dz;
  const clampedZ = Math.max(TANK_R, Math.min(newZ, arena.h - TANK_R));
  const zClamped = clampedZ !== newZ;
  const zBlocked = circleHitsAnyBlock(t.x, clampedZ, TANK_R, arena.blocks) ||
                   circleTouches(t.x, clampedZ, TANK_R, o.x, o.z);
  if (zBlocked) {
    ok = false;
  } else {
    t.z = clampedZ;
    if (zClamped) ok = false;
  }

  return ok;
}

function circleHitsAnyBlock(x, z, r, blocks) {
  for (const b of blocks) if (circleHitsAABB(x, z, r, b)) return true;
  return false;
}

function circleTouches(x, z, r, ox, oz) {
  const dx = x - ox, dz = z - oz;
  return dx * dx + dz * dz < (2 * r) ** 2;
}

function updateTank(game, i, input, dt) {
  const t = game.tanks[i];
  if (t.invulnT > 0) t.invulnT -= dt;
  if (t.state === 'dying') {
    t.dyingT -= dt;
    tryMove(game, i, t.knock[0] * dt, t.knock[1] * dt);
    if (t.dyingT <= 0) respawnBoth(game);
    return;
  }
  t.heading += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * TURN_RATE * dt;
  const ds = input.forward ? DRIVE_SPEED * dt : input.reverse ? -REVERSE_SPEED * dt : 0;
  t.blocked = false;
  if (ds) {
    t.blocked = !tryMove(game, i, Math.cos(t.heading) * ds, Math.sin(t.heading) * ds);
  }
  if (input.fire && !game.shells[i]) fireShell(game, i);
}

function respawnBoth(game) {
  for (let i = 0; i < 2; i++) {
    const s = game.arena.spawns[i], t = game.tanks[i];
    t.x = s.x; t.z = s.z; t.heading = s.heading;
    t.state = 'alive'; t.dyingT = 0; t.invulnT = INVULN_T; t.knock = [0, 0];
    game.shells[i] = null;
  }
  game.events.push({ type: 'respawn' });
}

function step(game, dt, playerInput = {}) {
  game.events.length = 0;
  if (game.winner >= 0) return;
  game.time += dt;
  const inputs = [playerInput, aiStep(game, dt)];
  for (let i = 0; i < 2; i++) updateTank(game, i, inputs[i] || {}, dt);
  for (let i = 0; i < 2; i++) updateShell(game, i, dt);
}

export function createTankGame(p = {}) {
  const params = { seed: 1, arena: 'brackets', pointsToWin: 7, ricochet: false, aiLevel: 1, ...p };
  const rows = params.arena === 'proc' ? genArena(params.seed) : CLASSIC_ARENAS[params.arena];
  if (!rows) throw new Error(`unknown arena ${params.arena}`);
  const arena = parseArena(rows);
  const game = {
    params, arena,
    rng: mulberry32((params.seed ^ 0xc0deba5e) >>> 0),
    tanks: arena.spawns.map((s) => ({
      x: s.x, z: s.z, heading: s.heading, state: 'alive',
      dyingT: 0, invulnT: 0, knock: [0, 0], blocked: false,
    })),
    shells: [null, null],
    score: [0, 0], winner: -1, time: 0, events: [],
    aiMem: makeAiMem(),
  };
  game.step = (dt, input) => step(game, dt, input);
  return game;
}

// --- shells ---------------------------------------------------------------
function fireShell(game, i) {
  const t = game.tanks[i];
  if (t.state !== 'alive') return;
  const dx = Math.cos(t.heading), dz = Math.sin(t.heading);
  game.shells[i] = {
    x: t.x + dx * (TANK_R + SHELL_R + 0.05),
    z: t.z + dz * (TANK_R + SHELL_R + 0.05),
    dx: dx * SHELL_SPEED, dz: dz * SHELL_SPEED,
    traveled: 0, bounces: 0,
  };
  game.events.push({ type: 'fire', tank: i });
}

function killShell(game, i) {
  game.shells[i] = null;
  game.events.push({ type: 'shellDead', tank: i });
}

function updateShell(game, i, dt) {
  const s = game.shells[i];
  if (!s) return;
  const { arena } = game;
  s.x += s.dx * dt; s.z += s.dz * dt;
  s.traveled += SHELL_SPEED * dt;

  // impact: perimeter walls, then blocks. Reflection axis = the wall's
  // normal (perimeter) or the face with the smaller penetration (blocks).
  let hitX = false, hitZ = false, faceX = 0, faceZ = 0;
  if (s.x < SHELL_R) { hitX = true; faceX = SHELL_R; }
  else if (s.x > arena.w - SHELL_R) { hitX = true; faceX = arena.w - SHELL_R; }
  if (s.z < SHELL_R) { hitZ = true; faceZ = SHELL_R; }
  else if (s.z > arena.h - SHELL_R) { hitZ = true; faceZ = arena.h - SHELL_R; }
  if (!hitX && !hitZ) {
    for (const b of arena.blocks) {
      if (!circleHitsAABB(s.x, s.z, SHELL_R, b)) continue;
      const px = Math.min(s.x - (b.minX - SHELL_R), (b.maxX + SHELL_R) - s.x);
      const pz = Math.min(s.z - (b.minZ - SHELL_R), (b.maxZ + SHELL_R) - s.z);
      if (px < pz) { hitX = true; faceX = s.dx > 0 ? b.minX - SHELL_R : b.maxX + SHELL_R; }
      else { hitZ = true; faceZ = s.dz > 0 ? b.minZ - SHELL_R : b.maxZ + SHELL_R; }
      break;
    }
  }
  if (hitX || hitZ) {
    if (!game.params.ricochet || s.bounces >= MAX_BOUNCES) return killShell(game, i);
    s.bounces++;
    if (hitX) { s.x = 2 * faceX - s.x; s.dx = -s.dx; }
    if (hitZ) { s.z = 2 * faceZ - s.z; s.dz = -s.dz; }
    game.events.push({ type: 'bounce', tank: i });
  }
  if (s.traveled >= SHELL_RANGE_FRAC * arena.w) return killShell(game, i);

  // tank hit (scored + verified in Task 4)
  const v = game.tanks[1 - i];
  if (v.state === 'alive' && v.invulnT <= 0) {
    const ddx = s.x - v.x, ddz = s.z - v.z;
    if (ddx * ddx + ddz * ddz < (TANK_R + SHELL_R) ** 2) {
      game.shells[i] = null;
      game.score[i]++;
      const m = Math.hypot(s.dx, s.dz);
      v.state = 'dying'; v.dyingT = DYING_T;
      v.knock = [(s.dx / m) * KNOCKBACK_SPEED, (s.dz / m) * KNOCKBACK_SPEED];
      game.events.push({ type: 'hit', by: i });
      if (game.score[i] >= game.params.pointsToWin) {
        game.winner = i;
        game.events.push({ type: 'matchEnd', winner: i });
      }
    }
  }
}

function makeAiMem() { return {}; }        // replaced in Task 5
function aiStep() { return {}; }           // replaced in Task 5
