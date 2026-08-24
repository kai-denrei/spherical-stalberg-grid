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
