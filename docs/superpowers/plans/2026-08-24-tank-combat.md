# Tank Combat Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new `tank` tab — a 3D Atari Combat homage: player vs AI tank duel on a flat rectangular arena with obstacles, three camera views, AI levels L1–L4.

**Architecture:** Pure DOM-free game core in `src/tanks.js` (arena parsing, kinematics, shells, ricochet, scoring, AI) driven by a thin three.js render shell `src/tank-tab.js`. Node test suite `test/tanks.mjs` joins `npm test`. Spec: `docs/superpowers/specs/2026-08-24-tank-combat-design.md`.

**Tech Stack:** Vanilla ES modules, vendored three.js (no build step), lil-gui, mulberry32 PRNG (`src/rng.js`), plain-Node test scripts.

## Global Constraints

- After editing ANY `src/*.js`, `index.html`, or `styles.css`: run `./scripts/bust.sh --quiet`. It rewrites all `?v=` tokens including ES-module imports.
- NEVER put `?v=` tokens on `../vendor/` imports (loads a second three.js copy). Cross-`src/` imports DO get a token — write `?v=dd25bece` (current token); bust.sh renews it.
- No `Math.random` in game logic — all randomness via `mulberry32` streams from the seed. Visual-only effects may use their own mulberry32 stream.
- Render-coupled camera values derive FROM render transforms (`getWorldQuaternion` / `getWorldPosition` / `localToWorld`), never re-derived with own sign conventions. three.js: plain Object3D faces +Z, cameras look down −Z.
- `npm test` must stay green after every task.
- Tests are plain Node scripts: `check(name, cond)` accumulating a `failures` counter, `process.exit(1)` on failure (mirror `test/tdcore.mjs`).
- Commits: explain the why; end with the Co-Authored-By + Claude-Session trailer used by this repo. DEVLOG entries land at tasks 4, 6, 7, 8, 9 (convention: get commit hash first, then append entry + commit `devlog: <hash> — <slug>`).
- Headless verification: Chrome with `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader` (NOT `--disable-gpu`). Serve via `npm run serve` (port 8144, may already be running). URL hooks: query BEFORE hash, e.g. `http://localhost:8144/?tick=5&view=top#tank`.
- Game-core coordinate convention (used everywhere): XZ plane, x right, z down in top view; heading in radians, 0 = +x, π/2 = +z. Tank 0 = player (red), tank 1 = AI (blue). Arena cells are 1 world unit; cell (col c, row r) spans x∈[c,c+1], z∈[r,r+1].

---

### Task 1: Arena data, parser, connectivity, procedural generator

**Files:**
- Create: `src/tanks.js`
- Create: `test/tanks.mjs`
- Modify: `package.json` (append `&& node test/tanks.mjs` to the `test` script)

**Interfaces:**
- Consumes: `mulberry32(seed)` from `src/rng.js` (returns `() => float [0,1)`).
- Produces (later tasks rely on these exact names):
  - `CLASSIC_ARENAS`: `{ open, brackets, maze }`, each an array of 20 strings × 26 chars (`.` empty, `#` block, `1`/`2` spawns).
  - `parseArena(rows) -> { w, h, blocks, spawns }` — `blocks`: array of `{minX, maxX, minZ, maxZ}` (world units, per-row runs of `#` merged); `spawns`: array of 2 `{x, z, heading}` (cell centers, heading facing the other spawn). Throws on ragged rows or missing spawns.
  - `arenaConnected(rows) -> boolean` — BFS over non-`#` cells, spawn 1 reaches spawn 2.
  - `genArena(seed) -> rows` — deterministic, left↔right mirrored, spawns at cells (2,9)/(23,9), connected (retries internally, falls back to `CLASSIC_ARENAS.open`).

- [ ] **Step 1: Write the failing test**

Create `test/tanks.mjs`:

```js
// tanks.mjs — invariants for the tank-combat core (src/tanks.js).
// Pure module; no DOM, no three.js.
import {
  CLASSIC_ARENAS, parseArena, arenaConnected, genArena,
} from '../src/tanks.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

// --- arenas --------------------------------------------------------------
console.log('arenas:');
check('three classics', ['open', 'brackets', 'maze'].every((k) => CLASSIC_ARENAS[k]));
check('classics are 26×20', Object.values(CLASSIC_ARENAS).every(
  (rows) => rows.length === 20 && rows.every((r) => r.length === 26)));
check('classics connected', Object.values(CLASSIC_ARENAS).every(arenaConnected));
{
  const a = parseArena(CLASSIC_ARENAS.open);
  check('open: 26×20 world, no blocks', a.w === 26 && a.h === 20 && a.blocks.length === 0);
  check('open: spawns face each other',
    approx(a.spawns[0].heading, 0) && approx(Math.abs(a.spawns[1].heading), Math.PI));
  check('open: spawns at cell centers',
    a.spawns[0].x % 1 === 0.5 && a.spawns[0].z % 1 === 0.5);
}
{
  const a = parseArena(CLASSIC_ARENAS.brackets);
  check('brackets: has blocks, one row tall each (run-merged)',
    a.blocks.length > 0 && a.blocks.every((b) => b.maxZ - b.minZ === 1 && b.maxX > b.minX));
  check('brackets: blocks in bounds',
    a.blocks.every((b) => b.minX >= 0 && b.maxX <= 26 && b.minZ >= 0 && b.maxZ <= 20));
}
check('parse throws without spawns', (() => {
  try { parseArena(['####', '####']); return false; } catch { return true; }
})());
{
  const rows = genArena(7);
  check('proc: 26×20', rows.length === 20 && rows.every((r) => r.length === 26));
  check('proc: mirrored', rows.every((r) => [...r].every(
    (ch, c) => (ch === '#') === (r[25 - c] === '#'))));
  check('proc: connected with 2 spawns', arenaConnected(rows)
    && rows.some((r) => r.includes('1')) && rows.some((r) => r.includes('2')));
  check('proc: deterministic', rows.join('\n') === genArena(7).join('\n'));
  check('proc: seed changes layout', rows.join('\n') !== genArena(8).join('\n'));
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\ntank invariants hold');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/tanks.mjs`
Expected: FAIL — `Cannot find module '../src/tanks.js'`

- [ ] **Step 3: Write the implementation**

Create `src/tanks.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/tanks.mjs`
Expected: all `ok`, final line `tank invariants hold`

- [ ] **Step 5: Wire into npm test**

In `package.json`, change the `test` script to:

```json
"test": "node test/smoke.mjs && node test/maze.mjs && node test/creatures.mjs && node test/units.mjs && node test/tdcore.mjs && node test/tanks.mjs"
```

Run: `npm test` — Expected: all suites green.

- [ ] **Step 6: Commit**

```bash
git add src/tanks.js test/tanks.mjs package.json
git commit -m "tank: arena maps, parser, connectivity, seeded procedural layouts"
```

(Repo commit trailer applies here and to every commit below.)

---

### Task 2: Game shell, tank kinematics, collision

**Files:**
- Modify: `src/tanks.js` (append)
- Modify: `test/tanks.mjs` (append; extend the import list)

**Interfaces:**
- Consumes: Task 1 exports.
- Produces:
  - `createTankGame(params) -> game`. Params (all optional): `{ seed=1, arena='brackets', pointsToWin=7, ricochet=false, aiLevel=1 }`. `arena` is a classic key or `'proc'`. `aiLevel` 0 = dormant AI (test rig), 1–4 real levels.
  - `game` fields: `params`, `arena` (parsed), `tanks` (2 × `{x, z, heading, state:'alive'|'dying', dyingT, invulnT, knock:[dx,dz], blocked}`), `shells` (2 slots, `null` or shell), `score:[0,0]`, `winner:-1`, `time`, `events:[]`, `rng`, `aiMem`.
  - `game.step(dt, playerInput)` — advances one tick; `playerInput` is `{left, right, forward, reverse, fire}` booleans (all optional). `events` is cleared at the start of every step and filled with this tick's events. Tests may poke `game.tanks[i].x/z/heading` directly to stage scenarios.

- [ ] **Step 1: Write the failing test**

Append to `test/tanks.mjs` (and add `createTankGame, TANK_R, TURN_RATE, DRIVE_SPEED, REVERSE_SPEED` to the import from `../src/tanks.js`):

```js
// --- kinematics + collision ----------------------------------------------
console.log('kinematics:');
const DT = 1 / 60;
{
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0 });
  const h0 = g.tanks[0].heading;
  g.step(DT, { right: true });
  check('turn rate exact', approx(g.tanks[0].heading, h0 + TURN_RATE * DT));
  g.step(DT, { left: true });
  check('left turn symmetric', approx(g.tanks[0].heading, h0));
}
{
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0 });
  const { x, z } = g.tanks[0]; // spawn (2.5, 9.5) heading 0 (+x)
  g.step(DT, { forward: true });
  check('forward speed exact', approx(g.tanks[0].x, x + DRIVE_SPEED * DT) && approx(g.tanks[0].z, z));
  g.step(DT, { reverse: true });
  check('reverse is half speed', REVERSE_SPEED === DRIVE_SPEED / 2
    && approx(g.tanks[0].x, x + (DRIVE_SPEED - REVERSE_SPEED) * DT));
}
{
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0 });
  for (let i = 0; i < 60 * 5; i++) g.step(DT, { reverse: true }); // back into left wall
  check('perimeter clamps at tank radius', approx(g.tanks[0].x, TANK_R, 1e-3)
    && g.tanks[0].blocked);
}
{
  const g = createTankGame({ seed: 1, arena: 'brackets', aiLevel: 0 });
  // stage: aim at the center bar (x 11..13, z 9..10) from the left
  g.tanks[0].x = 9.5; g.tanks[0].z = 9.5; g.tanks[0].heading = 0;
  for (let i = 0; i < 60 * 3; i++) g.step(DT, { forward: true });
  check('block stops tank at expanded AABB', g.tanks[0].x <= 11 - TANK_R + 1e-6);
  // diagonal approach slides along the free axis
  g.tanks[0].x = 9.5; g.tanks[0].z = 8.0; g.tanks[0].heading = Math.PI / 4;
  const z0 = g.tanks[0].z;
  for (let i = 0; i < 30; i++) g.step(DT, { forward: true });
  check('axis-separated slide', g.tanks[0].z > z0);
}
{
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0 });
  g.tanks[1].x = g.tanks[0].x + 2; g.tanks[1].z = g.tanks[0].z; // AI parked ahead
  for (let i = 0; i < 60 * 2; i++) g.step(DT, { forward: true });
  const d = Math.hypot(g.tanks[0].x - g.tanks[1].x, g.tanks[0].z - g.tanks[1].z);
  check('tank-tank collision holds 2R', d >= 2 * TANK_R - 1e-6);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/tanks.mjs`
Expected: FAIL — `createTankGame` not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/tanks.js`:

```js
// --- game -----------------------------------------------------------------
function circleHitsAABB(x, z, r, b) {
  const cx = Math.max(b.minX, Math.min(x, b.maxX));
  const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
  const dx = x - cx, dz = z - cz;
  return dx * dx + dz * dz < r * r;
}

function positionBlocked(game, i, x, z) {
  const { arena, tanks } = game;
  if (x < TANK_R || x > arena.w - TANK_R || z < TANK_R || z > arena.h - TANK_R) return true;
  for (const b of arena.blocks) if (circleHitsAABB(x, z, TANK_R, b)) return true;
  const o = tanks[1 - i];
  const dx = x - o.x, dz = z - o.z;
  return dx * dx + dz * dz < (2 * TANK_R) ** 2;
}

// axis-separated move: blocked axes are dropped so the tank slides.
function tryMove(game, i, dx, dz) {
  const t = game.tanks[i];
  let ok = true;
  if (!positionBlocked(game, i, t.x + dx, t.z)) t.x += dx; else ok = false;
  if (!positionBlocked(game, i, t.x, t.z + dz)) t.z += dz; else ok = false;
  return ok;
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
```

Also add TEMPORARY stubs at the end of the file so this task runs standalone (Task 3 replaces `fireShell`/`updateShell`, Task 5 replaces `aiStep`/`makeAiMem`):

```js
function fireShell() {}                    // replaced in Task 3
function updateShell() {}                  // replaced in Task 3
function makeAiMem() { return {}; }        // replaced in Task 5
function aiStep() { return {}; }           // replaced in Task 5
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/tanks.mjs` — Expected: all `ok`.
Run: `npm test` — Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/tanks.js test/tanks.mjs
git commit -m "tank: game shell, tank kinematics, axis-slide collision"
```

---

### Task 3: Shells — fire, flight, range, ricochet

**Files:**
- Modify: `src/tanks.js` (replace the `fireShell`/`updateShell` stubs)
- Modify: `test/tanks.mjs` (append; import `SHELL_SPEED, SHELL_RANGE_FRAC, SHELL_R, MAX_BOUNCES`)

**Interfaces:**
- Produces: shell objects `{x, z, dx, dz, traveled, bounces}` in `game.shells[i]` (`dx/dz` are velocity, magnitude `SHELL_SPEED`). Events: `{type:'fire', tank}`, `{type:'bounce', tank}`, `{type:'shellDead', tank}`. Hit/score events come in Task 4 — `updateShell` is written complete here including the hit branch, but hit tests live in Task 4.

- [ ] **Step 1: Write the failing test**

Append to `test/tanks.mjs`:

```js
// --- shells ---------------------------------------------------------------
console.log('shells:');
{
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0 });
  g.step(DT, { fire: true });
  check('fire spawns one shell + event', !!g.shells[0]
    && g.events.some((e) => e.type === 'fire' && e.tank === 0));
  const s0x = g.shells[0].x;
  g.step(DT, { fire: true });
  check('one in flight: second fire ignored',
    !g.events.some((e) => e.type === 'fire')
    && approx(g.shells[0].x, s0x + SHELL_SPEED * DT));
  check('shell speed is SHELL_SPEED', approx(Math.hypot(g.shells[0].dx, g.shells[0].dz), SHELL_SPEED));
}
{
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0 });
  g.tanks[1].z = 2.5; // move AI tank out of the firing line
  g.step(DT, { fire: true });
  let steps = 0;
  while (g.shells[0] && steps < 60 * 5) { g.step(DT, {}); steps++; }
  const flight = steps * DT;
  const expected = (SHELL_RANGE_FRAC * 26) / SHELL_SPEED;
  check('range-limited flight time', Math.abs(flight - expected) < 0.1, `flew ${flight}s`);
}
{
  // no ricochet: dies on the wall
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0 });
  g.tanks[0].heading = Math.PI; g.tanks[1].z = 2.5; // fire at the near (left) wall
  g.step(DT, { fire: true });
  let died = false;
  for (let i = 0; i < 60 && !died; i++) { g.step(DT, {}); died = !g.shells[0]; }
  check('wall kills shell without ricochet', died);
}
{
  // ricochet: exact mirror off the left wall
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0, ricochet: true });
  g.tanks[0].heading = Math.PI; g.tanks[1].z = 2.5;
  g.step(DT, { fire: true });
  const vz = g.shells[0].dz;
  let bounced = false;
  for (let i = 0; i < 60 && !bounced; i++) {
    g.step(DT, {});
    bounced = g.events.some((e) => e.type === 'bounce');
  }
  check('ricochet reflects: dx flips, dz preserved, speed unchanged', bounced
    && g.shells[0].dx > 0 && approx(g.shells[0].dz, vz)
    && approx(Math.hypot(g.shells[0].dx, g.shells[0].dz), SHELL_SPEED));
  check('bounce counted', g.shells[0].bounces === 1);
}
{
  // bounce cap: third impact kills even with ricochet on
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0, ricochet: true });
  g.tanks[0].x = 13; g.tanks[0].z = 1.0; g.tanks[0].heading = -Math.PI / 2; // straight up at z=0
  g.tanks[1].z = 18;
  g.step(DT, { fire: true });
  let bounces = 0;
  for (let i = 0; i < 60 * 3 && g.shells[0]; i++) {
    g.step(DT, {});
    bounces += g.events.filter((e) => e.type === 'bounce').length;
  }
  check('bounces capped at MAX_BOUNCES', bounces <= MAX_BOUNCES);
  check('range accumulates across bounces', !g.shells[0]);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/tanks.mjs` — Expected: FAIL on 'fire spawns one shell'.

- [ ] **Step 3: Write the implementation**

In `src/tanks.js`, DELETE the `fireShell`/`updateShell` stubs and add:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/tanks.mjs` then `npm test` — Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/tanks.js test/tanks.mjs
git commit -m "tank: shells — one in flight, range budget, mirror ricochet with bounce cap"
```

---

### Task 4: Hits, knockback, respawn, scoring, match end, determinism

**Files:**
- Modify: `test/tanks.mjs` (append; import `DYING_T, INVULN_T`)
- Modify: `src/tanks.js` (only if a test exposes a bug — the hit branch already landed in Task 3)

**Interfaces:**
- Produces: verified events `{type:'hit', by}`, `{type:'respawn'}`, `{type:'matchEnd', winner}`; `game.winner` ∈ {-1,0,1}; frozen post-match state. Later tasks (tab) rely on exactly these event shapes.

- [ ] **Step 1: Write the failing/verifying test**

Append to `test/tanks.mjs`:

```js
// --- hits, scoring, match flow -------------------------------------------
console.log('match flow:');
const stageDuel = (over = {}) => {
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0, ...over });
  g.tanks[0].x = 8; g.tanks[0].z = 9.5; g.tanks[0].heading = 0;
  g.tanks[1].x = 14; g.tanks[1].z = 9.5;
  return g;
};
const fireAndResolve = (g) => {
  g.step(DT, { fire: true });
  const out = [];
  for (let i = 0; i < 60 * 2; i++) {
    g.step(DT, {});
    out.push(...g.events);
    if (out.some((e) => e.type === 'hit' || e.type === 'shellDead')) break;
  }
  return out;
};
{
  const g = stageDuel();
  const ev = fireAndResolve(g);
  check('point-blank hit scores', g.score[0] === 1 && ev.some((e) => e.type === 'hit' && e.by === 0));
  check('victim dying + knocked in shell direction', g.tanks[1].state === 'dying' && g.tanks[1].knock[0] > 0);
  const zx = g.tanks[1].x;
  for (let i = 0; i < Math.ceil(DYING_T / DT) + 2; i++) g.step(DT, {});
  check('knockback slid the victim', g.tanks[1].x > zx || g.tanks[1].state === 'alive');
  check('respawn: both back at spawns, invulnerable', g.tanks[0].x === g.arena.spawns[0].x
    && g.tanks[1].x === g.arena.spawns[1].x
    && g.tanks[0].invulnT > 0 && g.tanks[1].invulnT > 0
    && !g.shells[0] && !g.shells[1]);
}
{
  const g = stageDuel();
  g.tanks[1].invulnT = INVULN_T;
  const ev = fireAndResolve(g);
  check('invulnerable tank cannot be hit', g.score[0] === 0 && !ev.some((e) => e.type === 'hit'));
}
{
  const g = stageDuel({ pointsToWin: 1 });
  const ev = fireAndResolve(g);
  check('match ends at pointsToWin', g.winner === 0 && ev.some((e) => e.type === 'matchEnd'));
  const frozen = JSON.stringify(g.tanks);
  g.step(DT, { forward: true, fire: true });
  check('post-match state frozen', JSON.stringify(g.tanks) === frozen && g.events.length === 0);
}
{
  // determinism: same seed + same scripted inputs → identical state
  const snap = (g) => JSON.stringify([g.tanks, g.shells, g.score, g.winner, g.time],
    (k, v) => (typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v));
  const script = (i) => ({
    left: i % 97 < 20, right: i % 89 < 15, forward: i % 7 !== 0,
    reverse: i % 131 < 5, fire: i % 45 === 0,
  });
  const run = () => {
    const g = createTankGame({ seed: 77, arena: 'maze', aiLevel: 1, ricochet: true });
    for (let i = 0; i < 60 * 10; i++) g.step(DT, script(i));
    return snap(g);
  };
  check('deterministic replay (10s, AI L1, ricochet)', run() === run());
}
```

- [ ] **Step 2: Run the test**

Run: `node test/tanks.mjs`
Expected: PASS if Task 3's hit branch is correct — this task is a verification gate. Any FAIL here is a real bug in Tasks 2–3 code: debug and fix `src/tanks.js` (do NOT loosen the assertions), then re-run.

- [ ] **Step 3: Run the full suite**

Run: `npm test` — Expected: green.

- [ ] **Step 4: Commit + DEVLOG**

```bash
git add test/tanks.mjs src/tanks.js
git commit -m "tank: match-flow + determinism invariants (hits, knockback, respawn, freeze)"
git log -1 --format=%h   # note hash H
```

Append a DEVLOG.md entry (newest-first, after the header block), then commit it:

```markdown
## `<H>` — A second game grows in the test tube

The tank-combat core (Atari Combat homage) landed as a pure module:
`tanks.js` holds arenas (ASCII maps + a mirrored seeded generator),
tank kinematics with axis-slide collision, one-shell-in-flight
ballistics with exact-mirror ricochet, and the hit → knockback →
respawn → match-end loop. No DOM, no three.js — the whole game is
Node-tested (`test/tanks.mjs`), including a 10-second deterministic
replay. The render tab comes next and will be a thin consumer.
```

```bash
git add DEVLOG.md && git commit -m "devlog: <H> — tank core"
```

---

### Task 5: AI L1 (Drunk) + L2 (Hunter) + line-of-sight

**Files:**
- Modify: `src/tanks.js` (replace `makeAiMem`/`aiStep` stubs; add `hasLineOfSight`)
- Modify: `test/tanks.mjs` (append; import `hasLineOfSight`)

**Interfaces:**
- Produces:
  - `hasLineOfSight(x1, z1, x2, z2, blocks) -> boolean` — segment-vs-AABB slab test against the block list (perimeter not considered).
  - `aiStep(game, dt)` (internal) returns a player-shaped input. AI state in `game.aiMem` `{wanderT, wanderH, fireT, strafeDir, prevPX, prevPZ, pvx, pvz}`. Aim error per level: `AIM_ERR = [0, 0.25, 0.15, 0.06, 0.04]`.
  - Task 6 extends `aiStep` for L3/L4; it consumes `mem.pvx/pvz` (player velocity estimate) which is maintained here.

- [ ] **Step 1: Write the failing test**

Append to `test/tanks.mjs`:

```js
// --- AI L1/L2 + LOS -------------------------------------------------------
console.log('ai 1-2:');
{
  const a = parseArena(CLASSIC_ARENAS.brackets);
  check('LOS clear along empty lane', hasLineOfSight(7, 5.5, 19, 5.5, a.blocks));
  check('LOS blocked by side bracket', !hasLineOfSight(2.5, 5.5, 23.5, 5.5, a.blocks));
  check('LOS blocked by center bar', !hasLineOfSight(2.5, 9.5, 23.5, 9.5, a.blocks));
}
{
  const g = createTankGame({ seed: 5, arena: 'open', aiLevel: 1 });
  const { x, z } = g.tanks[1];
  let fired = 0;
  for (let i = 0; i < 60 * 20; i++) {
    g.step(DT, {});
    fired += g.events.filter((e) => e.type === 'fire' && e.tank === 1).length;
  }
  const moved = Math.hypot(g.tanks[1].x - x, g.tanks[1].z - z);
  check('L1 wanders', moved > 2);
  check('L1 fires on a timer', fired >= 3);
}
{
  const g = createTankGame({ seed: 5, arena: 'open', aiLevel: 2 });
  for (let i = 0; i < 60 * 4; i++) g.step(DT, {});
  const me = g.tanks[1], you = g.tanks[0];
  const bearing = Math.atan2(you.z - me.z, you.x - me.x);
  let d = (bearing - me.heading) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  check('L2 turns toward the player', Math.abs(d) < 0.5, `off by ${d}`);
}
{
  // L2 never fires without line-of-sight (maze, 30 simulated seconds)
  const g = createTankGame({ seed: 9, arena: 'maze', aiLevel: 2 });
  let violations = 0;
  for (let i = 0; i < 60 * 30; i++) {
    g.step(DT, { left: i % 3 === 0, forward: true }); // player circles as bait
    if (g.events.some((e) => e.type === 'fire' && e.tank === 1)
      && !hasLineOfSight(g.tanks[1].x, g.tanks[1].z, g.tanks[0].x, g.tanks[0].z, g.arena.blocks)) {
      violations++;
    }
  }
  check('L2 only fires with LOS', violations === 0, `${violations} blind shots`);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/tanks.mjs` — Expected: FAIL — `hasLineOfSight` not exported (and L1 tests fail on the stub).

- [ ] **Step 3: Write the implementation**

In `src/tanks.js`, DELETE the `makeAiMem`/`aiStep` stubs and add:

```js
// --- line of sight --------------------------------------------------------
function segHitsAABB(x1, z1, x2, z2, b) {
  const dx = x2 - x1, dz = z2 - z1;
  let t0 = 0, t1 = 1;
  for (const [p, d, lo, hi] of [[x1, dx, b.minX, b.maxX], [z1, dz, b.minZ, b.maxZ]]) {
    if (Math.abs(d) < 1e-12) { if (p < lo || p > hi) return false; continue; }
    let a = (lo - p) / d, c = (hi - p) / d;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, c);
    if (t0 > t1) return false;
  }
  return true;
}

export function hasLineOfSight(x1, z1, x2, z2, blocks) {
  for (const b of blocks) if (segHitsAABB(x1, z1, x2, z2, b)) return false;
  return true;
}

// --- AI -------------------------------------------------------------------
// Levels: 1 Drunk (wander + timed blind shots), 2 Hunter (track + LOS-gated
// shots), 3 Marksman (lead + spacing + slip while shell flies, Task 6),
// 4 Bank-shot (L3 + ricochet solutions + ambush, Task 6). Aim error
// shrinks with level. All randomness from game.rng (deterministic).
const AIM_ERR = [0, 0.25, 0.15, 0.06, 0.04];

function makeAiMem() {
  return { wanderT: 0, wanderH: 0, fireT: 1, strafeDir: 1, prevPX: null, prevPZ: null, pvx: 0, pvz: 0 };
}

function angleDiff(a, b) {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function aiStep(game, dt) {
  const lvl = game.params.aiLevel | 0;
  if (lvl <= 0) return {};
  const me = game.tanks[1], you = game.tanks[0];
  const mem = game.aiMem, rng = game.rng;
  if (me.state !== 'alive') return {};

  // player-velocity estimate (L3+ lead aim; cheap to keep always-on)
  if (mem.prevPX !== null && dt > 0) {
    mem.pvx = (you.x - mem.prevPX) / dt;
    mem.pvz = (you.z - mem.prevPZ) / dt;
  }
  mem.prevPX = you.x; mem.prevPZ = you.z;

  const input = {};
  const bearing = Math.atan2(you.z - me.z, you.x - me.x);
  const los = hasLineOfSight(me.x, me.z, you.x, you.z, game.arena.blocks);
  const dist = Math.hypot(you.x - me.x, you.z - me.z);
  let desired, canFire = false;

  if (lvl === 1) {
    mem.wanderT -= dt;
    if (mem.wanderT <= 0 || me.blocked) {
      mem.wanderT = 1.5 + rng() * 2;
      mem.wanderH = rng() * Math.PI * 2;
    }
    desired = mem.wanderH;
    input.forward = true;
    mem.fireT -= dt;
    if (mem.fireT <= 0 && !game.shells[1]) { input.fire = true; mem.fireT = 1 + rng() * 2; }
  } else {
    const aim = aiAimPoint(game, lvl, me, you, mem);
    canFire = aim.canFire;
    desired = Math.atan2(aim.z - me.z, aim.x - me.x) + (rng() - 0.5) * 2 * AIM_ERR[lvl];
    aiMove(game, lvl, input, { me, bearing, dist, los, mem, rng });
    if (input.strafeOverride !== undefined) { desired = input.strafeOverride; canFire = false; delete input.strafeOverride; }
  }

  const dh = angleDiff(desired, me.heading);
  if (dh > 0.06) input.right = true;
  else if (dh < -0.06) input.left = true;
  if (canFire && Math.abs(dh) < 0.12 && !game.shells[1]) input.fire = true;
  return input;
}

// L2 baseline: aim at the player's position, fire only with LOS.
// Task 6 extends this with lead (L3) and bank shots (L4).
function aiAimPoint(game, lvl, me, you) {
  const los = hasLineOfSight(me.x, me.z, you.x, you.z, game.arena.blocks);
  return { x: you.x, z: you.z, canFire: los };
}

// L2 movement: advance when roughly facing the target.
// Task 6 extends with spacing/slip (L3) and ambush (L4).
function aiMove(game, lvl, input, ctx) {
  const facing = Math.abs(angleDiff(ctx.bearing, ctx.me.heading));
  input.forward = facing < 0.6;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/tanks.mjs` then `npm test` — Expected: green (determinism test from Task 4 still passes: AI rng calls are seed-stable).

- [ ] **Step 5: Commit**

```bash
git add src/tanks.js test/tanks.mjs
git commit -m "tank: AI L1 drunk + L2 hunter, slab-test line of sight"
```

---

### Task 6: AI L3 (Marksman) + L4 (Bank-shot)

**Files:**
- Modify: `src/tanks.js` (extend `aiAimPoint`/`aiMove`; add `interceptPoint`, `bankShot`)
- Modify: `test/tanks.mjs` (append; import `interceptPoint, bankShot, SHELL_SPEED`)

**Interfaces:**
- Produces:
  - `interceptPoint(sx, sz, tx, tz, tvx, tvz, speed) -> [x, z] | null` — first-arrival intercept of a constant-velocity target; null when no positive-time solution.
  - `bankShot(sx, sz, tx, tz, arena) -> { aim:[x,z], bounce:[x,z] } | null` — one-bounce firing solution off a perimeter wall: mirrors the target across each wall plane, checks bounce point in bounds, LOS on both legs, total length ≤ shell range.

- [ ] **Step 1: Write the failing test**

Append to `test/tanks.mjs`:

```js
// --- AI L3/L4 -------------------------------------------------------------
console.log('ai 3-4:');
{
  // shooter origin, target at (10,0) drifting (0,3), shell 11 u/s:
  // t = 10/sqrt(112), aim = (10, 3t)
  const p = interceptPoint(0, 0, 10, 0, 0, 3, 11);
  const t = 10 / Math.sqrt(112);
  check('intercept math exact', p && approx(p[0], 10, 1e-6) && approx(p[1], 3 * t, 1e-6));
  check('intercept arrival times agree', approx(Math.hypot(p[0], p[1]), 11 * t, 1e-6));
  check('no intercept on faster receding target', interceptPoint(0, 0, 10, 0, 20, 0, 11) === null);
}
{
  // fixture: center wall (cols 12-13, rows 2..17) with an open lane on top.
  // Bank off z=0: shooter (8.5,4.5) → bounce (13,0) → target (17.5,4.5).
  const fixture = Array.from({ length: 20 }, (_, r) => {
    let row = '.'.repeat(26);
    if (r >= 2 && r <= 17) row = row.slice(0, 12) + '##' + row.slice(14);
    if (r === 9) row = '..1' + row.slice(3, 22) + '2' + row.slice(23);
    return row;
  });
  const a = parseArena(fixture);
  check('fixture: direct LOS blocked', !hasLineOfSight(8.5, 4.5, 17.5, 4.5, a.blocks));
  const bs = bankShot(8.5, 4.5, 17.5, 4.5, a);
  check('bank shot found off top wall', !!bs, JSON.stringify(bs));
  check('bounce point exact', bs && approx(bs.bounce[0], 13, 0.2) && approx(bs.bounce[1], 0, 1e-9));
  check('aim is the mirrored target', bs && approx(bs.aim[0], 17.5, 1e-9) && approx(bs.aim[1], -4.5, 1e-9));
}
{
  // L3 leads a perpendicular runner: shell direction ≠ direct bearing
  const g = createTankGame({ seed: 3, arena: 'open', aiLevel: 3 });
  g.tanks[0].heading = Math.PI / 2; // player runs downward, across the AI's view
  let shell = null, bearingAtFire = 0;
  for (let i = 0; i < 60 * 10 && !shell; i++) {
    g.step(DT, { forward: true });
    if (g.events.some((e) => e.type === 'fire' && e.tank === 1)) {
      shell = g.shells[1];
      bearingAtFire = Math.atan2(g.tanks[0].z - g.tanks[1].z, g.tanks[0].x - g.tanks[1].x);
    }
  }
  const shellAngle = shell ? Math.atan2(shell.dz, shell.dx) : 0;
  check('L3 fired', !!shell);
  check('L3 leads the target', shell && Math.abs(shellAngle - bearingAtFire) > 0.1,
    `lead ${Math.abs(shellAngle - bearingAtFire)}`);
}
{
  // L3 never fires blind (same monitor as L2)
  const g = createTankGame({ seed: 9, arena: 'maze', aiLevel: 3 });
  let violations = 0;
  for (let i = 0; i < 60 * 20; i++) {
    g.step(DT, { right: i % 4 === 0, forward: true });
    if (g.events.some((e) => e.type === 'fire' && e.tank === 1)
      && !hasLineOfSight(g.tanks[1].x, g.tanks[1].z, g.tanks[0].x, g.tanks[0].z, g.arena.blocks)) {
      violations++;
    }
  }
  check('L3 only fires with LOS', violations === 0);
}
{
  // L4 ambush: no LOS, ricochet off → holds position
  const g = createTankGame({ seed: 3, arena: 'brackets', aiLevel: 4, ricochet: false });
  g.tanks[0].x = 3, g.tanks[0].z = 2.5;   // player hidden behind the top-left bracket
  g.tanks[1].x = 21; g.tanks[1].z = 13.5; // AI far side, no LOS
  const { x, z } = g.tanks[1];
  for (let i = 0; i < 60 * 3; i++) g.step(DT, {});
  check('L4 ambushes (holds position without LOS)',
    Math.hypot(g.tanks[1].x - x, g.tanks[1].z - z) < 0.5);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/tanks.mjs` — Expected: FAIL — `interceptPoint` not exported.

- [ ] **Step 3: Write the implementation**

In `src/tanks.js` add the two helpers, then REPLACE `aiAimPoint` and `aiMove` entirely:

```js
// first-arrival intercept of a constant-velocity target:
// solve |target + v·t − shooter| = speed·t  →  a·t² + b·t + c = 0
export function interceptPoint(sx, sz, tx, tz, tvx, tvz, speed) {
  const dx = tx - sx, dz = tz - sz;
  const a = tvx * tvx + tvz * tvz - speed * speed;
  const b = 2 * (dx * tvx + dz * tvz);
  const c = dx * dx + dz * dz;
  let t = null;
  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) > 1e-9) t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const r = Math.sqrt(disc);
      const roots = [(-b - r) / (2 * a), (-b + r) / (2 * a)].filter((v) => v > 1e-9);
      if (roots.length) t = Math.min(...roots);
    }
  }
  return t === null || t <= 0 ? null : [tx + tvx * t, tz + tvz * t];
}

// one-bounce solution off a perimeter wall: mirror the target across each
// wall plane; the straight line to the mirror unfolds into the bank shot.
export function bankShot(sx, sz, tx, tz, arena) {
  const range = SHELL_RANGE_FRAC * arena.w;
  const walls = [
    { aim: [tx, -tz], axis: 'z', at: 0 },
    { aim: [tx, 2 * arena.h - tz], axis: 'z', at: arena.h },
    { aim: [-tx, tz], axis: 'x', at: 0 },
    { aim: [2 * arena.w - tx, tz], axis: 'x', at: arena.w },
  ];
  for (const wl of walls) {
    const [ax, az] = wl.aim;
    let bx, bz;
    if (wl.axis === 'z') {
      const t = (wl.at - sz) / (az - sz);
      if (!(t > 0 && t < 1)) continue;
      bx = sx + (ax - sx) * t; bz = wl.at;
      if (bx < 0 || bx > arena.w) continue;
    } else {
      const t = (wl.at - sx) / (ax - sx);
      if (!(t > 0 && t < 1)) continue;
      bz = sz + (az - sz) * t; bx = wl.at;
      if (bz < 0 || bz > arena.h) continue;
    }
    if (Math.hypot(bx - sx, bz - sz) + Math.hypot(tx - bx, tz - bz) > range) continue;
    if (!hasLineOfSight(sx, sz, bx, bz, arena.blocks)) continue;
    if (!hasLineOfSight(bx, bz, tx, tz, arena.blocks)) continue;
    return { aim: [ax, az], bounce: [bx, bz] };
  }
  return null;
}

// aim selection by level: L2 tracks, L3 leads, L4 adds bank shots.
function aiAimPoint(game, lvl, me, you, mem) {
  const los = hasLineOfSight(me.x, me.z, you.x, you.z, game.arena.blocks);
  let x = you.x, z = you.z, canFire = los;
  if (lvl >= 3 && los) {
    const p = interceptPoint(me.x, me.z, you.x, you.z, mem.pvx, mem.pvz, SHELL_SPEED);
    if (p) { x = p[0]; z = p[1]; }
  }
  if (lvl >= 4 && !los && game.params.ricochet) {
    const bs = bankShot(me.x, me.z, you.x, you.z, game.arena);
    if (bs) { x = bs.aim[0]; z = bs.aim[1]; canFire = true; }
  }
  return { x, z, canFire, los };
}

// movement by level: L2 advances; L3+ keeps spacing and slips sideways
// while its shell flies; L4 holds still (ambush) when it has no shot.
function aiMove(game, lvl, input, ctx) {
  const { me, bearing, dist, los, mem, rng } = ctx;
  if (lvl === 2) {
    input.forward = Math.abs(angleDiff(bearing, me.heading)) < 0.6;
    return;
  }
  const hasShot = los || (lvl >= 4 && game.params.ricochet
    && !!bankShot(me.x, me.z, game.tanks[0].x, game.tanks[0].z, game.arena));
  if (lvl >= 4 && !hasShot) return; // ambush: hold, keep tracking
  if (game.shells[1]) {
    // own shell in flight → can't fire anyway: slip sideways
    if (rng() < 0.005) mem.strafeDir = -mem.strafeDir;
    input.strafeOverride = bearing + (Math.PI / 2) * mem.strafeDir;
    input.forward = true;
    return;
  }
  if (dist > 12) input.forward = true;
  else if (dist < 6) input.reverse = true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/tanks.mjs` then `npm test` — Expected: green.

- [ ] **Step 5: Commit + DEVLOG**

```bash
git add src/tanks.js test/tanks.mjs
git commit -m "tank: AI L3 lead-aim marksman + L4 bank-shot ambusher"
git log -1 --format=%h   # note hash H
```

DEVLOG entry, then `git add DEVLOG.md && git commit -m "devlog: <H> — tank AI ladder"`:

```markdown
## `<H>` — Four brains, one input shape

The tank AI ladder is complete and Node-tested. Every level emits the
same input shape as the player's keys — the AI plays the same game.
L1 wanders and fires blind on a timer; L2 gates fire on a slab-test
line of sight; L3 solves the constant-velocity intercept quadratic to
lead a runner and slips sideways while its shell flies; L4 mirrors
the target across the perimeter walls to unfold one-bounce ricochet
solutions, and simply waits when it has no shot. Aim error shrinks
with level — the ladder is a difficulty dial made of behaviors, not
stat inflation.
```

---

### Task 7: Tab wiring + top-down render + input + HUD

**Files:**
- Create: `src/tank-tab.js`
- Modify: `index.html` (tabbar button + tab div)
- Modify: `src/main.js` (import + register)
- Modify: `styles.css` (score/msg/hint styles)

**Interfaces:**
- Consumes: `createTankGame`, `TANK_R` from `./tanks.js` (with `?v=` token); event shapes from Task 4.
- Produces: `initTankTab(root) -> { setActive(on) }` registered as tab key `tank`. DOM ids used by later tasks: `#tank-app`, `#tank-score`, `#tank-msg`, `#tank-hint`, pads `#tank-pad-left/right/up/fire`.

- [ ] **Step 1: index.html — tabbar + tab div**

In the tabbar (after the TD button):

```html
<button data-tab="tank">tank</button>
```

After the `#tab-td` div:

```html
<div id="tab-tank" class="tab tab-hidden">
  <div id="tank-app"></div>
  <div id="tank-score"><span class="ts-red">0</span><span class="ts-blue">0</span></div>
  <div id="tank-msg" class="hidden"></div>
  <div id="tank-pad-left" class="tzone tzone-side tzone-l"><span>&lsaquo;</span></div>
  <div id="tank-pad-right" class="tzone tzone-side tzone-r"><span>&rsaquo;</span></div>
  <div class="tzone-mid">
    <div id="tank-pad-up" class="tzone tzone-drive"><span>&and;</span></div>
  </div>
  <button id="tank-pad-fire" class="tfire tfire-primary" title="FIRE (Space)">&#9673;</button>
  <div id="tank-hint">COMBAT &middot; arrows drive &middot; SPACE fire &middot; C camera &middot; first to 7</div>
</div>
```

- [ ] **Step 2: main.js — register the tab**

```js
import { initTankTab } from './tank-tab.js?v=dd25bece';
```

and in the `tabs` object (after `td`):

```js
tank: { root: document.getElementById('tab-tank'), init: initTankTab, api: null },
```

- [ ] **Step 3: styles.css — HUD styles (append)**

```css
/* tank tab: Combat-style HUD */
#tank-score { position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
  font: 700 42px/1 ui-monospace, monospace; letter-spacing: .5em; pointer-events: none; z-index: 5; }
#tank-score .ts-red { color: #d23b2f; }
#tank-score .ts-blue { color: #3556d2; }
#tank-msg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font: 700 34px ui-monospace, monospace; color: #fff; background: rgba(0,0,0,.45);
  z-index: 6; cursor: pointer; text-align: center; }
#tank-msg.hidden { display: none; }
#tank-hint { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
  font: 12px ui-monospace, monospace; color: #cfd6e4; opacity: .7; pointer-events: none; z-index: 5; }
```

- [ ] **Step 4: Write src/tank-tab.js**

```js
// tank-tab.js — Atari Combat homage: three.js shell + input around the
// pure game core in tanks.js. This file draws state and forwards keys;
// every rule lives (Node-tested) in the core.
import * as THREE from '../vendor/three.module.js';
import GUI from '../vendor/lil-gui.esm.js';
import { createTankGame } from './tanks.js?v=dd25bece';

const DT = 1 / 60;
const COLORS = {
  ground: 0x9cb04c, surround: 0x6b7f2e, block: 0xd89048,
  red: 0xd23b2f, blue: 0x3556d2, shell: 0xf5f0dc,
};

export function initTankTab(root) {
  let active = true;
  const params = {
    seed: 42, arena: 'brackets', pointsToWin: 7, ricochet: false,
    aiLevel: 1, view: 'top',
  };

  const container = root.querySelector('#tank-app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.surround);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(10, 20, 6);
  scene.add(sun);

  // top-down ortho camera, sized to the arena in resize()
  const topCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  topCam.position.set(13, 40, 10);
  topCam.up.set(0, 0, -1);
  topCam.lookAt(13, 0, 10);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    const aspect = w / h;
    const spanZ = Math.max(22, 28 / aspect) / 2; // fit 26×20 + margin
    topCam.left = -spanZ * aspect; topCam.right = spanZ * aspect;
    topCam.top = spanZ; topCam.bottom = -spanZ;
    topCam.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  // --- meshes --------------------------------------------------------------
  const blockMat = new THREE.MeshLambertMaterial({ color: COLORS.block });
  const shellMat = new THREE.MeshLambertMaterial({ color: COLORS.shell });

  function buildTank(color) {
    // barrel along +x at heading 0; group.rotation.y = -heading maps
    // core (cos h, sin h) onto world (x, z).
    const mat = new THREE.MeshLambertMaterial({ color });
    const g = new THREE.Group();
    const add = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    add(1.0, 0.35, 0.7, 0, 0.28, 0);          // hull
    add(1.1, 0.25, 0.22, 0, 0.13, 0.42);      // tread
    add(1.1, 0.25, 0.22, 0, 0.13, -0.42);     // tread
    add(0.5, 0.28, 0.45, -0.05, 0.6, 0);      // turret
    add(0.7, 0.1, 0.1, 0.55, 0.62, 0);        // barrel
    return g;
  }

  let game = null;
  let arenaGroup = null;
  const tankMeshes = [buildTank(COLORS.red), buildTank(COLORS.blue)];
  const shellMeshes = [0, 1].map(() => new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), shellMat));
  scene.add(...tankMeshes, ...shellMeshes);

  const scoreEl = root.querySelector('#tank-score');
  const msgEl = root.querySelector('#tank-msg');

  function newMatch() {
    if (arenaGroup) {
      scene.remove(arenaGroup);
      arenaGroup.traverse((o) => o.geometry && o.geometry.dispose());
    }
    game = createTankGame({
      seed: params.seed >>> 0, arena: params.arena,
      pointsToWin: params.pointsToWin, ricochet: params.ricochet,
      aiLevel: params.aiLevel,
    });
    arenaGroup = new THREE.Group();
    const { w, h, blocks } = game.arena;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshLambertMaterial({ color: COLORS.ground }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(w / 2, 0, h / 2);
    arenaGroup.add(ground);
    for (const b of blocks) {
      const bw = b.maxX - b.minX, bd = b.maxZ - b.minZ;
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, 1.2, bd), blockMat);
      m.position.set((b.minX + b.maxX) / 2, 0.6, (b.minZ + b.maxZ) / 2);
      arenaGroup.add(m);
    }
    // perimeter wall: four low slabs just outside the field
    for (const [ww, wd, x, z] of [
      [w + 1, 0.5, w / 2, -0.25], [w + 1, 0.5, w / 2, h + 0.25],
      [0.5, h + 1, -0.25, h / 2], [0.5, h + 1, w + 0.25, h / 2],
    ]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.9, wd), blockMat);
      m.position.set(x, 0.45, z);
      arenaGroup.add(m);
    }
    scene.add(arenaGroup);
    msgEl.classList.add('hidden');
    updateScore();
  }

  function updateScore() {
    scoreEl.innerHTML = `<span class="ts-red">${game.score[0]}</span>`
      + `<span class="ts-blue">${game.score[1]}</span>`;
  }

  function consumeEvents() {
    for (const e of game.events) {
      if (e.type === 'hit') updateScore();
      if (e.type === 'matchEnd') {
        msgEl.textContent = e.winner === 0 ? 'RED WINS — click / ENTER for rematch'
          : 'BLUE WINS — click / ENTER for rematch';
        msgEl.classList.remove('hidden');
      }
    }
  }

  // --- input ---------------------------------------------------------------
  const input = {};
  const KEYMAP = {
    ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
    ArrowUp: 'forward', w: 'forward', ArrowDown: 'reverse', s: 'reverse',
    ' ': 'fire',
  };
  addEventListener('keydown', (e) => {
    if (!active) return;
    const k = KEYMAP[e.key];
    if (k) { input[k] = true; e.preventDefault(); }
    if (e.key === 'Enter' && game.winner >= 0) newMatch();
  });
  addEventListener('keyup', (e) => {
    const k = KEYMAP[e.key];
    if (k) input[k] = false;
  });
  msgEl.addEventListener('click', () => { if (game.winner >= 0) newMatch(); });
  // touch pads
  for (const [id, k] of [['left', 'left'], ['right', 'right'], ['up', 'forward'], ['fire', 'fire']]) {
    const el = root.querySelector(`#tank-pad-${id}`);
    el.addEventListener('pointerdown', (e) => { input[k] = true; e.preventDefault(); });
    el.addEventListener('pointerup', () => { input[k] = false; });
    el.addEventListener('pointercancel', () => { input[k] = false; });
  }

  // --- sync + loop ---------------------------------------------------------
  function syncScene() {
    for (let i = 0; i < 2; i++) {
      const t = game.tanks[i];
      tankMeshes[i].position.set(t.x, 0, t.z);
      tankMeshes[i].rotation.y = -t.heading;
      const s = game.shells[i];
      shellMeshes[i].visible = !!s;
      if (s) shellMeshes[i].position.set(s.x, 0.62, s.z);
    }
  }

  let acc = 0;
  let last = performance.now();
  function animate() {
    requestAnimationFrame(animate);
    if (!active) return;
    const now = performance.now();
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= DT) {
      game.step(DT, input);
      consumeEvents();
      acc -= DT;
    }
    syncScene();
    renderer.render(scene, topCam);
  }

  // --- panel ---------------------------------------------------------------
  const gui = new GUI({ title: 'tank combat', container: root });
  gui.add(params, 'seed', 0, 99999, 1).onFinishChange(newMatch);
  gui.add(params, 'arena', ['open', 'brackets', 'maze', 'proc']).onChange(newMatch);
  gui.add(params, 'pointsToWin', 1, 15, 1).name('first to').onFinishChange(newMatch);
  gui.add(params, 'ricochet').onChange(newMatch);
  gui.add({ rematch: () => newMatch() }, 'rematch').name('↻ new match');
  if (matchMedia('(pointer: coarse), (max-width: 700px)').matches) gui.close();

  // --- URL hooks (headless verification) ----------------------------------
  const urlParams = new URLSearchParams(location.search);
  const seedOv = parseInt(urlParams.get('seed') || '', 10);
  if (Number.isFinite(seedOv)) params.seed = seedOv;
  gui.controllersRecursive().forEach((c) => c.updateDisplay());

  newMatch();
  animate();

  // ?tick=N synchronously simulates N seconds, then logs a state line
  const tickN = parseFloat(urlParams.get('tick') || '0');
  if (tickN > 0) {
    for (let i = 0; i < Math.round(tickN * 60); i++) { game.step(DT, {}); consumeEvents(); }
    syncScene();
    console.log('TANK ' + JSON.stringify({
      score: game.score, winner: game.winner,
      t: +game.time.toFixed(2), ai: params.aiLevel,
    }));
  }

  return {
    setActive(on) {
      active = on;
      if (on) { last = performance.now(); resize(); }
    },
  };
}
```

- [ ] **Step 5: Bust tokens + tests**

```bash
./scripts/bust.sh --quiet
npm test
```
Expected: bust rewrites tokens (vendor imports untouched); tests green.

- [ ] **Step 6: Headless verification**

```bash
curl -s -o /dev/null http://localhost:8144/ || (npm run serve &>/dev/null & sleep 1)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
  --window-size=1280,800 --virtual-time-budget=10000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/tank-top.png" \
  "http://localhost:8144/?tick=8#tank" 2>&1 | grep TANK
```
Expected: a `TANK {"score":...}` console line; screenshot shows olive field, orange blocks, red+blue tanks from above. Note headless clamps/crops — judge content, not layout. View the screenshot to confirm.

- [ ] **Step 7: Commit + DEVLOG**

```bash
git add index.html src/main.js src/tank-tab.js styles.css
git commit -m "tank: playable tab — top-down Combat homage over the pure core"
git log -1 --format=%h   # note hash H
```

DEVLOG entry, then `git add DEVLOG.md && git commit -m "devlog: <H> — tank tab playable"`:

```markdown
## `<H>` — 1977 extruded

The tank tab renders: the Combat playfield pulled into 3D — olive
ground, orange slab obstacles, two six-box tanks, an orthographic
camera looking straight down. The tab is a thin consumer: it forwards
keys as an input object, steps the Node-tested core at a fixed 60Hz
accumulator, and copies poses onto meshes (`rotation.y = -heading`,
the one place the sign convention is allowed to live). `?tick=N` runs
the simulation synchronously for headless screenshots.
```

---

### Task 8: Cameras (third/POV), AI-level panel + unlocks, URL hooks

**Files:**
- Modify: `src/tank-tab.js`
- Modify: `src/tanks.js` — no changes expected; listed in case a camera-driven bug surfaces.

**Interfaces:**
- Consumes: tank group world transforms (`getWorldQuaternion`, `localToWorld`).
- Produces: `params.view` ∈ `top|third|pov`, key `C` cycles; localStorage key `tank.unlocked` (int 1–4); URL params `?view=`, `?ai=` (forces level, session-only unlock).

- [ ] **Step 1: Add the perspective camera + view logic**

In `src/tank-tab.js`, after the `topCam` block add:

```js
  const perspCam = new THREE.PerspectiveCamera(60, 1, 0.05, 200);
  const VIEWS = ['top', 'third', 'pov'];
  // POV anchors ride INSIDE the player tank group so camera placement is
  // derived from render transforms (hard rule), never from heading math.
  const povEye = new THREE.Object3D();
  povEye.position.set(0.1, 0.95, 0);
  const povTarget = new THREE.Object3D();
  povTarget.position.set(6, 0.8, 0);
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();
```

In `resize()` add: `perspCam.aspect = w / h; perspCam.updateProjectionMatrix();`

Add `tankMeshes[0].add(povEye, povTarget);` right after the `scene.add(...tankMeshes, ...)` line.

Replace `renderer.render(scene, topCam);` in `animate()` with:

```js
    renderer.render(scene, activeCamera());
```

and add above `animate()`:

```js
  function activeCamera() {
    if (params.view === 'top') return topCam;
    const tm = tankMeshes[0];
    if (params.view === 'pov') {
      perspCam.position.copy(povEye.getWorldPosition(_v1));
      perspCam.lookAt(povTarget.getWorldPosition(_v2));
    } else { // third person: behind and above, following the tank's facing
      tm.getWorldQuaternion(_q);
      const behind = _v1.set(-7, 4.5, 0).applyQuaternion(_q).add(tm.position);
      perspCam.position.lerp(behind, 0.12);
      perspCam.lookAt(_v2.copy(tm.position).setY(0.6));
    }
    return perspCam;
  }
```

- [ ] **Step 2: C key, panel entries, unlocks**

In the keydown handler add:

```js
    if (e.key === 'c' || e.key === 'C') {
      params.view = VIEWS[(VIEWS.indexOf(params.view) + 1) % VIEWS.length];
      gui.controllersRecursive().forEach((c2) => c2.updateDisplay());
    }
```

After the GUI block, add unlock storage + AI/view controllers (and REMOVE nothing — these are additions):

```js
  const readUnlocked = () => Math.min(4, Math.max(1,
    parseInt(localStorage.getItem('tank.unlocked') || '1', 10) || 1));
  let unlocked = readUnlocked();
  let aiCtrl = null;
  function rebuildAiCtrl() {
    if (aiCtrl) aiCtrl.destroy();
    const levels = {};
    ['L1 drunk', 'L2 hunter', 'L3 marksman', 'L4 bank-shot']
      .slice(0, unlocked).forEach((n, i) => { levels[n] = i + 1; });
    aiCtrl = gui.add(params, 'aiLevel', levels).name('AI level').onChange(newMatch);
  }
  rebuildAiCtrl();
  gui.add(params, 'view', VIEWS).name('camera (C)').listen();
```

In `consumeEvents()`, extend the matchEnd branch:

```js
      if (e.type === 'matchEnd') {
        if (e.winner === 0 && params.aiLevel === unlocked && unlocked < 4) {
          unlocked++;
          localStorage.setItem('tank.unlocked', String(unlocked));
          rebuildAiCtrl();
          msgEl.textContent = `RED WINS — LEVEL ${unlocked} UNLOCKED — click / ENTER`;
        } else {
          msgEl.textContent = e.winner === 0 ? 'RED WINS — click / ENTER for rematch'
            : 'BLUE WINS — click / ENTER for rematch';
        }
        msgEl.classList.remove('hidden');
      }
```

(Remove the older plain matchEnd branch from Task 7.)

- [ ] **Step 3: URL hooks**

In the URL-hooks section (before `newMatch()`), add:

```js
  const aiOv = parseInt(urlParams.get('ai') || '', 10);
  if (aiOv >= 1 && aiOv <= 4) { params.aiLevel = aiOv; unlocked = Math.max(unlocked, aiOv); rebuildAiCtrl(); }
  const viewOv = urlParams.get('view');
  if (VIEWS.includes(viewOv)) params.view = viewOv;
```

(Note: `rebuildAiCtrl` must already be defined; keep the GUI block above the URL-hooks block.)

- [ ] **Step 4: Bust + verify all three views headless**

```bash
./scripts/bust.sh --quiet && npm test
for v in top third pov; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
    --window-size=1280,800 --virtual-time-budget=10000 \
    --screenshot="$CLAUDE_JOB_DIR/tmp/tank-$v.png" \
    "http://localhost:8144/?tick=4&ai=2&view=$v#tank" 2>&1 | grep TANK
done
```
Expected: three screenshots — top-down grid, chase view behind the red tank, barrel-forward POV. View each screenshot; confirm the third-person and POV horizons make sense (tank visible from behind in third; barrel/no tank in pov).

- [ ] **Step 5: Commit + DEVLOG**

```bash
git add src/tank-tab.js
git commit -m "tank: three cameras off render transforms, AI ladder unlocks, URL hooks"
git log -1 --format=%h   # note hash H
```

DEVLOG entry, then `git add DEVLOG.md && git commit -m "devlog: <H> — tank cameras + ladder"`:

```markdown
## `<H>` — Same game, three eyes

The tank tab gained its camera set: authentic top-down ortho, a
lerped chase camera, and a turret POV. Both moving views are derived
from the tank group's world transform (`getWorldQuaternion` /
`getWorldPosition` on anchors parented inside the group) — the
same-source rule that already burned us twice elsewhere. Because the
controls are tank-relative, the game core never knows which camera is
live. The AI ladder wired in: beat your highest unlocked level and
the next one opens (localStorage), `?ai=N` forces a level for
headless runs.
```

---

### Task 9: Polish — explosions, invulnerability flash, dying spin, docs

**Files:**
- Modify: `src/tank-tab.js`
- Modify: `HOW-IT-WORKS.md` (new section)

**Interfaces:**
- Consumes: events `hit`, `respawn`; tank fields `state`, `invulnT`, `dyingT`.
- Produces: final feature; no downstream consumers.

- [ ] **Step 1: Explosion debris + flash + spin**

In `src/tank-tab.js` add near the mesh section (import `mulberry32` from `./rng.js?v=dd25bece` at top):

```js
  // blocky explosion: a handful of cubes scattering from the hit point.
  // Visual-only randomness — own stream, seeded from sim time, so game
  // logic stays deterministic and replays don't drift.
  const debris = [];
  function explodeAt(x, z, color) {
    const rng = mulberry32((game.time * 1000) >>> 0);
    const mat = new THREE.MeshLambertMaterial({ color });
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat);
      m.position.set(x, 0.4, z);
      const a = rng() * Math.PI * 2;
      m.userData.vel = [Math.cos(a) * (1 + rng() * 3), 2 + rng() * 3, Math.sin(a) * (1 + rng() * 3)];
      m.userData.ttl = 0.7;
      debris.push(m);
      scene.add(m);
    }
  }
  function tickDebris(dt) {
    for (let i = debris.length - 1; i >= 0; i--) {
      const m = debris[i], v = m.userData.vel;
      m.userData.ttl -= dt;
      v[1] -= 9 * dt;
      m.position.x += v[0] * dt; m.position.y += v[1] * dt; m.position.z += v[2] * dt;
      m.rotation.x += 5 * dt; m.rotation.z += 4 * dt;
      if (m.userData.ttl <= 0 || m.position.y < 0) {
        scene.remove(m);
        m.geometry.dispose();
        debris.splice(i, 1);
      }
    }
  }
```

In `consumeEvents()`, in the `hit` branch add:

```js
        const victim = game.tanks[1 - e.by];
        explodeAt(victim.x, victim.z, e.by === 0 ? COLORS.blue : COLORS.red);
```

In `syncScene()` extend the per-tank loop:

```js
      // invuln flash + dying spin are render-side only
      tankMeshes[i].visible = !(t.invulnT > 0 && Math.floor(game.time * 10) % 2 === 0);
      if (t.state === 'dying') tankMeshes[i].rotation.y += (DYING_T - t.dyingT) * 0.6;
```

(add `DYING_T` to the import from `./tanks.js`), and in `animate()` call `tickDebris(DT)` inside the fixed-step while loop, right after `consumeEvents()`.

- [ ] **Step 2: HOW-IT-WORKS section**

Append to `HOW-IT-WORKS.md`:

```markdown
## Tank combat (the break-time tab)

A 3D homage to Atari 2600 Combat. Everything that decides the game —
arena maps and their mirrored procedural cousin, tank kinematics,
one-shell-in-flight ballistics with mirror ricochet, the L1–L4 AI
ladder — lives in `tanks.js`, a DOM-free module with its own Node
suite. The AI emits the same `{left,right,forward,reverse,fire}`
input shape as the keyboard: four brains, one contract. The tab
(`tank-tab.js`) is a projector: it steps the core at a fixed 60Hz,
copies poses onto box-built meshes, and derives the chase and POV
cameras from the tank group's world transform. Beat your highest AI
level to unlock the next; `C` cycles top-down / third-person / POV.
```

- [ ] **Step 3: Bust + full verification sweep**

```bash
./scripts/bust.sh --quiet
npm test
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
  --window-size=1280,800 --virtual-time-budget=15000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/tank-final.png" \
  "http://localhost:8144/?tick=20&ai=3#tank" 2>&1 | grep TANK
```
Expected: tests green; TANK line shows a nonzero score after 20 simulated seconds at L3 (AI should have landed hits on an idle player). View the screenshot.

- [ ] **Step 4: Commit + DEVLOG + push**

```bash
git add src/tank-tab.js HOW-IT-WORKS.md
git commit -m "tank: explosions, invuln flash, dying spin — the homage feels like the cartridge"
git log -1 --format=%h   # note hash H
```

DEVLOG entry, then `git add DEVLOG.md && git commit -m "devlog: <H> — tank polish"`:

```markdown
## `<H>` — Death is eight cubes

Hit feedback landed: victims spin through their knockback slide,
explode into a fistful of gravity-obeying cubes, and both tanks
respawn blinking. The debris uses its own mulberry32 stream seeded
from sim time — visual chaos, deterministic core. With that, the
Combat homage is complete: core, cameras, ladder, feel.
```

```bash
git push origin main
```

Then notify the operator via Telegram (milestone, per house convention): playable tank tab pushed, with the Pages URL.

---

## Final acceptance checklist

- [ ] `npm test` green (six suites including `tanks.mjs`)
- [ ] `#tank` deep-link opens the tab; match is playable with arrows + space
- [ ] `C` cycles the three views; POV/third derive from world transforms
- [ ] Beating unlocked level advances `tank.unlocked` in localStorage
- [ ] `?tick=N&ai=N&view=V#tank` headless run prints a `TANK` state line
- [ ] All `src` imports carry the current `?v=` token; vendor imports carry none
- [ ] DEVLOG entries present for tasks 4, 6, 7, 8, 9
