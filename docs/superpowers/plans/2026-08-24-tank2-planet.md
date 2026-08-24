# Tank2 Planet Combat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Atari Combat tank duel on a tiny Stålberg-grid planet — horizon as cover, great-circle shells that hit over the curve, L4 as an over-the-horizon "ghost gunner."

**Architecture:** New pure DOM-free core `src/tanks2.js` (sphere kinematics on unit vectors, cellindex collision, ported tanks.js contract: same input shape, event names, match flow, AI ladder) + thin render shell `src/tank2-tab.js`. Reuses `grid.js` (small mesh, ~400 cells), `cellindex.js`, `dungeon.js` graph helpers, `vec3.js`, `rng.js`. Flat `tanks.js` untouched. Spec: `docs/superpowers/specs/2026-08-24-tank2-planet-design.md`.

**Tech Stack:** Vanilla ES modules, vendored three.js + OrbitControls + lil-gui, mulberry32, plain-Node tests.

## Global Constraints

- After editing ANY `src/*.js`, `index.html`, or `styles.css`: run `./scripts/bust.sh --quiet`. Its output commits ATOMICALLY — stage everything it touched, never just your own files. NEVER put `?v=` tokens on `../vendor/` imports. Cross-`src` imports DO get the current token (bust renews it).
- No `Math.random` in game logic — mulberry32 streams only. Visual-only effects may use their own mulberry32 stream.
- Camera facing derives FROM render transforms (`getWorldPosition`/`getWorldQuaternion` on anchors parented in the tank group), never re-derived from heading math.
- `npm test` green after every task. Tests are plain Node scripts, house `check(name, cond)` + `failures` + `process.exit(1)` style (see `test/tanks.mjs`).
- Headless verification: Chrome `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader` (NOT `--disable-gpu`); console lines ONLY appear with `--enable-logging=stderr`. URL form: `http://localhost:8144/?tick=5&view=chase#tank2`. Check :8144 responds before starting `npm run serve`.
- Step architecture (ported from the flat game's race fix — bake in from the start): `step()` = clear events → winner early-return → time += dt → update PLAYER tank → `aiStep(game, dt)` → update AI tank → update shells. The AI holds still (`forward`/`reverse` cleared) on the step it fires. `fireShell` has NO line-of-sight gate — L4 fires without LOS by design.
- Core geometry conventions: sphere radius 1; positions are unit vectors; headings are unit tangents (`dot(pos, head) = 0`); all distances/speeds in radians of arc (chord ≈ arc at these scales, tests use tolerances). Tank 0 = player (red), tank 1 = AI (blue).
- Commits: explain the why; end with the repo's Co-Authored-By + Claude-Session trailer. DEVLOG entries (hash-first, newest-first, separate `devlog:` commit) at tasks 4, 5, 6, 7, 8.

---

### Task 1: Planet generation

**Files:**
- Create: `src/tanks2.js`
- Create: `test/tanks2.mjs`
- Modify: `package.json` (append `&& node test/tanks2.mjs` to `test`)

**Interfaces:**
- Consumes: `generateSphereMesh({seed,n,k,radius})` + `relax(mesh,{n_iters})` from `./grid.js`; `buildCellGraph(mesh)`, `bfsDist(adj, sources, passable)` from `./dungeon.js`; `mulberry32` from `./rng.js`; `norm3, scale3, mean3, dot3, cross3, sub3, dist3, tangentBasis` from `./vec3.js`.
- Produces (later tasks rely on exact names):
  - Constants: `TANK_ANG=0.06`, `SHELL_ANG=0.018`, `TURRET_H=0.03`, `TURN_RATE=2.4`, `DRIVE_RATE=Math.PI/8`, `REVERSE_RATE=DRIVE_RATE/2`, `SHELL_RATE=1.1`, `SHELL_RANGE=0.4*2*Math.PI`, `MAX_BOUNCES=2`, `DYING_T=0.8`, `INVULN_T=1.5`, `KNOCK_RATE=0.8`, `WALL_MARGIN_F=0.62`.
  - `rotAbout(p, axis, ang) -> [x,y,z]` — Rodrigues rotation, axis unit.
  - `tangentAt(v, p) -> unit vec` — v minus its p-component, normalized (p unit).
  - `tangentDir(p, target) -> unit vec | null` — unit tangent at p toward target; null if degenerate.
  - `arcBetween(a, b) -> radians` — acos of clamped dot.
  - `generatePlanet(params) -> { mesh, centers, adj, walls:Set<number>, spawns:[{cell,pos,head}×2] }` — deterministic; spawns at open cells nearest ±X poles, heads facing each other (tangentBasis fallback if degenerate); wall clusters ≥ `3*mesh.defaultSide` arc from both spawns; open cells connected (reseed-retry ≤ 12 attempts, then wallClusters=0 fallback).

- [ ] **Step 1: Write the failing test**

Create `test/tanks2.mjs`:

```js
// tanks2.mjs — invariants for the planet tank-combat core (src/tanks2.js).
// Pure module; no DOM, no three.js.
import {
  rotAbout, tangentAt, tangentDir, arcBetween, generatePlanet,
  TANK_ANG, TURRET_H,
} from '../src/tanks2.js';
import { dot3, len3, dist3 } from '../src/vec3.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

console.log('planet:');
{
  const r = rotAbout([1, 0, 0], [0, 0, 1], Math.PI / 2);
  check('rotAbout quarter turn', approx(r[0], 0, 1e-9) && approx(r[1], 1, 1e-9));
  check('tangentAt orthonormalizes', approx(dot3(tangentAt([0.3, 1, 0], [1, 0, 0]), [1, 0, 0]), 0, 1e-9));
  check('tangentDir points along tangent', (() => {
    const d = tangentDir([1, 0, 0], [0, 1, 0]);
    return approx(len3(d), 1, 1e-9) && approx(d[1], 1, 1e-9);
  })());
  check('tangentDir degenerate -> null', tangentDir([1, 0, 0], [2, 0, 0]) === null);
  check('arcBetween right angle', approx(arcBetween([1, 0, 0], [0, 1, 0]), Math.PI / 2, 1e-9));
}
{
  const P = generatePlanet({ seed: 7, points: 400, wallClusters: 5 });
  check('planet has cells + centers + adj', P.centers.length === P.mesh.quads.length
    && P.adj.length === P.centers.length);
  check('centers are unit', P.centers.every((c) => approx(len3(c), 1, 1e-6)));
  check('some walls, not too many', P.walls.size >= 4 && P.walls.size <= 60);
  check('spawns far apart (>120°)', arcBetween(P.spawns[0].pos, P.spawns[1].pos) > (2 * Math.PI) / 3);
  check('spawn cells open', !P.walls.has(P.spawns[0].cell) && !P.walls.has(P.spawns[1].cell));
  const side = P.mesh.defaultSide;
  check('walls clear of spawn rings (>2.5 sides)', [...P.walls].every((w) =>
    dist3(P.centers[w], P.spawns[0].pos) > 2.5 * side
    && dist3(P.centers[w], P.spawns[1].pos) > 2.5 * side));
  check('spawn heads are unit tangents', P.spawns.every((s) =>
    approx(len3(s.head), 1, 1e-6) && approx(dot3(s.head, s.pos), 0, 1e-6)));
  // connectivity: BFS over open cells reaches the other spawn
  const seen = new Set([P.spawns[0].cell]);
  const q = [P.spawns[0].cell];
  while (q.length) {
    const c = q.shift();
    for (const nb of P.adj[c]) if (!P.walls.has(nb) && !seen.has(nb)) { seen.add(nb); q.push(nb); }
  }
  check('open cells connected spawn-to-spawn', seen.has(P.spawns[1].cell));
  check('deterministic', (() => {
    const Q = generatePlanet({ seed: 7, points: 400, wallClusters: 5 });
    return [...P.walls].join() === [...Q.walls].join() && P.spawns[0].cell === Q.spawns[0].cell;
  })());
  const R = generatePlanet({ seed: 8, points: 400, wallClusters: 5 });
  check('seed changes walls', [...P.walls].join() !== [...R.walls].join());
  check('bare planet option', generatePlanet({ seed: 7, points: 400, wallClusters: 0 }).walls.size === 0);
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\ntank2 invariants hold');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/tanks2.mjs`
Expected: FAIL — `Cannot find module '../src/tanks2.js'`

- [ ] **Step 3: Write the implementation**

Create `src/tanks2.js`:

```js
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
    const centers = mesh.quads.map((q) =>
      norm3(mean3(q.map((vi) => mesh.vertices[vi]))));
    const adj = buildCellGraph(mesh);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/tanks2.mjs` — all `ok`, ends `tank2 invariants hold`.
(The generation test takes a few seconds — mesh relax at n=400.)

- [ ] **Step 5: Wire into npm test + commit**

`package.json` test script gains `&& node test/tanks2.mjs` at the end. Run `npm test` (all seven suites green), then:

```bash
git add src/tanks2.js test/tanks2.mjs package.json
git commit -m "tank2: planet generation — small relaxed sphere, seeded wall clusters, antipodal spawns"
```

---

### Task 2: Game shell, sphere kinematics, collision + slide

**Files:**
- Modify: `src/tanks2.js` (append)
- Modify: `test/tanks2.mjs` (append; extend imports)

**Interfaces:**
- Consumes: Task 1 exports; `makeCellIndex(centers, cellSize)` from `./cellindex.js`.
- Produces:
  - `createPlanetTankGame(p) -> game`. Params: `{seed=1, points=400, wallClusters=5, pointsToWin=7, ricochet=false, aiLevel=1}` (aiLevel 0 = dormant test rig).
  - `game` fields: `params`, `planet`, `cellOf(p)->cellIndex`, `rng`, `tanks` (2 × `{pos, head, state:'alive'|'dying', dyingT, invulnT, knockDir, blocked}`), `shells` (2 slots), `score`, `winner`, `time`, `events`, `aiMem`.
  - `game.step(dt, playerInput)` with input `{left,right,forward,reverse,fire}`; events cleared at step start; step order player → aiStep → AI → shells (Global Constraints).
  - Internal (Task 3+ use): `hitsWall(game, p)`, `blockedAt(game, i, p)`, `driveTank(game, i, dir, arc) -> bool` (slide inside), `respawnBoth(game)`.
  - TEMPORARY stubs replaced later: `fireShell`/`updateShell` (Task 3), `makeAiMem`/`aiStep` (Task 5).

- [ ] **Step 1: Write the failing test**

Append to `test/tanks2.mjs` (extend the tanks2 import with `createPlanetTankGame, TURN_RATE, DRIVE_RATE, REVERSE_RATE, WALL_MARGIN_F`; add `import { dot3, len3, dist3 } ...` names already present):

```js
console.log('kinematics:');
const DT = 1 / 60;
{
  const g = createPlanetTankGame({ seed: 7, wallClusters: 0, aiLevel: 0 });
  const t = g.tanks[0];
  const h0 = t.head.slice();
  g.step(DT, { left: true });
  const turned = Math.atan2(dot3(cross3(h0, t.head), t.pos), dot3(h0, t.head));
  check('turn rate exact + tangent', approx(turned, TURN_RATE * DT, 1e-6)
    && approx(dot3(t.pos, t.head), 0, 1e-9));
  const p0 = t.pos.slice();
  g.step(DT, { forward: true });
  check('drive rate exact', approx(arcBetween(p0, t.pos), DRIVE_RATE * DT, 1e-6));
  const p1 = t.pos.slice();
  g.step(DT, { reverse: true });
  check('reverse half speed', REVERSE_RATE === DRIVE_RATE / 2
    && approx(arcBetween(p1, t.pos), REVERSE_RATE * DT, 1e-6));
}
{
  // orthonormality survives a long scripted run
  const g = createPlanetTankGame({ seed: 7, wallClusters: 5, aiLevel: 1 });
  for (let i = 0; i < 1000; i++) {
    g.step(DT, { left: i % 7 < 3, forward: i % 3 !== 0, fire: i % 50 === 0 });
  }
  for (const t of g.tanks) {
    check('pos stays unit', approx(len3(t.pos), 1, 1e-6));
    check('head stays unit tangent', approx(len3(t.head), 1, 1e-6)
      && approx(dot3(t.pos, t.head), 0, 1e-6));
  }
}
{
  // wall collision: drive straight at a cluster; never end inside margin
  const g = createPlanetTankGame({ seed: 7, wallClusters: 5, aiLevel: 0 });
  const t = g.tanks[0];
  const wallC = [...g.planet.walls].map((w) => g.planet.centers[w]);
  // aim at the nearest wall center
  let target = wallC[0];
  for (const w of wallC) if (dist3(w, t.pos) < dist3(target, t.pos)) target = w;
  t.head = tangentDir(t.pos, target) ?? t.head;
  let everBlocked = false;
  const margin = WALL_MARGIN_F * g.planet.mesh.defaultSide;
  let ok = true;
  for (let i = 0; i < 60 * 12; i++) {
    g.step(DT, { forward: true });
    everBlocked = everBlocked || g.tanks[0].blocked;
    for (const w of wallC) if (dist3(w, g.tanks[0].pos) < margin * 0.95) ok = false;
  }
  check('never inside wall margin', ok);
  check('blocked flag fired at the wall', everBlocked);
}
{
  // tank-tank separation on a bare planet
  const g = createPlanetTankGame({ seed: 7, wallClusters: 0, aiLevel: 0 });
  const [a, b] = g.tanks;
  b.pos = rotAbout(a.pos, norm3(cross3(a.pos, a.head)), 0.2);
  b.head = tangentAt(b.head, b.pos);
  for (let i = 0; i < 60 * 4; i++) g.step(DT, { forward: true });
  check('tank-tank holds 2·TANK_ANG', arcBetween(g.tanks[0].pos, g.tanks[1].pos) >= 2 * TANK_ANG - 1e-3);
}
```

Also extend the top-of-file vec3 import to `import { dot3, len3, dist3, cross3, norm3 } from '../src/vec3.js';`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/tanks2.mjs` — FAIL: `createPlanetTankGame` not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/tanks2.js` (add `import { makeCellIndex } from './cellindex.js';` at top):

```js
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
```

- [ ] **Step 4: Run tests, commit**

`node test/tanks2.mjs` green, `npm test` green, then:

```bash
git add src/tanks2.js test/tanks2.mjs
git commit -m "tank2: sphere kinematics — tangent-frame driving, wall margin + slide, tank separation"
```

---

### Task 3: Shells + line of sight

**Files:**
- Modify: `src/tanks2.js` (replace `fireShell`/`updateShell` stubs; add `hasLineOfSight`)
- Modify: `test/tanks2.mjs` (append; extend imports with `hasLineOfSight, SHELL_RATE, SHELL_RANGE, SHELL_ANG, MAX_BOUNCES`)

**Interfaces:**
- Produces:
  - Shells `{pos, dir, traveled, bounces}` in `game.shells[i]` (pos unit, dir unit tangent, traveled radians).
  - `hasLineOfSight(game, a, b) -> boolean` — horizon test (chord clears surface at `TURRET_H`: separation < `2*acos(1/(1+TURRET_H))`) AND no wall cell on the sampled great-circle arc (every half `defaultSide`).
  - Events `fire|bounce|shellDead` as in tanks.js. Hit branch complete here (score, dying, knockback, matchEnd) — verified in Task 4.
  - Shell flight NEVER requires LOS (over-the-horizon hits are physical).

- [ ] **Step 1: Write the failing test**

Append to `test/tanks2.mjs`:

```js
console.log('shells + LOS:');
const stagePair = (sepRad, over = {}) => {
  // bare planet; place tanks sepRad apart on a great circle, facing each other
  const g = createPlanetTankGame({ seed: 7, wallClusters: 0, aiLevel: 0, ...over });
  const a = g.tanks[0], b = g.tanks[1];
  a.pos = [1, 0, 0]; a.head = [0, 0, 1];
  b.pos = norm3(rotAbout(a.pos, [0, 1, 0], -sepRad)); // rotate +x toward +z
  b.head = tangentDir(b.pos, a.pos);
  a.head = tangentDir(a.pos, b.pos);
  return g;
};
{
  const g = stagePair(0.25);
  check('LOS true near + clear', hasLineOfSight(g, g.tanks[0].pos, g.tanks[1].pos));
  const g2 = stagePair(Math.PI / 3);
  check('horizon blocks at 60° even with no walls',
    !hasLineOfSight(g2, g2.tanks[0].pos, g2.tanks[1].pos));
}
{
  // wall occlusion: inject a wall on the arc midpoint, inside the horizon
  const g = stagePair(0.4);
  const mid = norm3(rotAbout(g.tanks[0].pos, [0, 1, 0], -0.2));
  g.planet.walls.add(g.cellOf(mid));
  check('wall on the arc blocks LOS', !hasLineOfSight(g, g.tanks[0].pos, g.tanks[1].pos));
}
{
  const g = stagePair(0.3);
  g.step(DT, { fire: true });
  const s = g.shells[0];
  check('fire spawns shell: unit pos, unit tangent dir', !!s
    && approx(len3(s.pos), 1, 1e-6) && approx(dot3(s.pos, s.dir), 0, 1e-6)
    && g.events.some((e) => e.type === 'fire' && e.tank === 0));
  g.step(DT, { fire: true });
  check('one in flight', !g.events.some((e) => e.type === 'fire'));
}
{
  // over-the-horizon hit: 60° apart, no LOS, shell arrives anyway
  const g = stagePair(Math.PI / 3);
  check('no LOS at fire time', !hasLineOfSight(g, g.tanks[0].pos, g.tanks[1].pos));
  g.step(DT, { fire: true });
  let hit = false;
  for (let i = 0; i < 60 * 3 && !hit; i++) {
    g.step(DT, {});
    hit = g.events.some((e) => e.type === 'hit' && e.by === 0);
  }
  check('over-the-horizon hit lands', hit && g.score[0] === 1);
}
{
  // range cap on a miss
  const g = stagePair(Math.PI / 3);
  g.tanks[0].head = tangentAt(rotAbout(g.tanks[0].head, g.tanks[0].pos, 0.5), g.tanks[0].pos); // aim off
  g.step(DT, { fire: true });
  let steps = 0;
  while (g.shells[0] && steps < 60 * 6) { g.step(DT, {}); steps++; }
  check('range-capped flight time', Math.abs(steps * DT - SHELL_RANGE / SHELL_RATE) < 0.15,
    `flew ${(steps * DT).toFixed(2)}s`);
}
{
  // ricochet: wall injected in the path reflects the shell
  const g = stagePair(0.3, { ricochet: true });
  const block = norm3(rotAbout(g.tanks[0].pos, [0, 1, 0], -0.12));
  g.planet.walls.add(g.cellOf(block));
  g.tanks[1].pos = rotAbout(g.tanks[1].pos, [0, 1, 0], -1.2); // move target out of the line
  g.tanks[1].head = tangentAt(g.tanks[1].head, g.tanks[1].pos);
  g.step(DT, { fire: true });
  let bounced = false;
  for (let i = 0; i < 60 * 2 && !bounced && g.shells[0]; i++) {
    g.step(DT, {});
    bounced = g.events.some((e) => e.type === 'bounce');
  }
  const s = g.shells[0];
  check('ricochet bounces, dir stays unit tangent', bounced && !!s
    && approx(len3(s.dir), 1, 1e-6) && approx(dot3(s.pos, s.dir), 0, 1e-6)
    && s.bounces === 1);
}
```

- [ ] **Step 2: Run test to verify it fails**

`node test/tanks2.mjs` — FAIL: `hasLineOfSight` not exported.

- [ ] **Step 3: Write the implementation**

In `src/tanks2.js`, DELETE the `fireShell`/`updateShell` stubs; add:

```js
// --- line of sight --------------------------------------------------------
// Visible iff (a) within the mutual horizon at turret height and (b) no
// wall cell sits on the great-circle arc (sampled every half cell).
const HORIZON = 2 * Math.acos(1 / (1 + TURRET_H));

export function hasLineOfSight(game, a, b) {
  const sep = arcBetween(a, b);
  if (sep > HORIZON) return false;
  if (sep < 1e-9) return true;
  const axis = norm3(cross3(a, b));
  const steps = Math.max(2, Math.ceil(sep / (game.planet.mesh.defaultSide * 0.5)));
  for (let s = 1; s < steps; s++) {
    const p = norm3(rotAbout(a, axis, (sep * s) / steps));
    if (game.planet.walls.has(game.cellOf(p))) return false;
  }
  return true;
}

// --- shells ---------------------------------------------------------------
function fireShell(game, i) {
  const t = game.tanks[i];
  if (t.state !== 'alive') return;
  const axis = norm3(cross3(t.pos, t.head));
  const muzzle = TANK_ANG + SHELL_ANG + 0.005;
  const pos = norm3(rotAbout(t.pos, axis, muzzle));
  game.shells[i] = {
    pos, dir: tangentAt(rotAbout(t.head, axis, muzzle), pos),
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
  const arc = SHELL_RATE * dt;
  const axis = norm3(cross3(s.pos, s.dir));
  const prevPos = s.pos, prevDir = s.dir;
  s.pos = norm3(rotAbout(s.pos, axis, arc));
  s.dir = tangentAt(rotAbout(s.dir, axis, arc), s.pos);
  s.traveled += arc;
  const ci = game.cellOf(s.pos);
  if (game.planet.walls.has(ci)) {
    if (!game.params.ricochet || s.bounces >= MAX_BOUNCES) return killShell(game, i);
    s.bounces++;
    s.pos = prevPos; // back out of the wall, then reflect in the tangent plane
    const into = tangentDir(s.pos, game.planet.centers[ci]);
    const d = tangentAt(prevDir, s.pos);
    s.dir = into
      ? tangentAt(sub3(d, scale3(into, 2 * dot3(d, into))), s.pos)
      : scale3(d, -1);
    game.events.push({ type: 'bounce', tank: i });
  }
  if (s.traveled >= SHELL_RANGE) return killShell(game, i);
  const v = game.tanks[1 - i];
  if (v.state === 'alive' && v.invulnT <= 0
    && arcBetween(s.pos, v.pos) < TANK_ANG + SHELL_ANG) {
    game.shells[i] = null;
    game.score[i]++;
    v.state = 'dying'; v.dyingT = DYING_T;
    v.knockDir = tangentAt(s.dir, v.pos);
    game.events.push({ type: 'hit', by: i });
    if (game.score[i] >= game.params.pointsToWin) {
      game.winner = i;
      game.events.push({ type: 'matchEnd', winner: i });
    }
  }
}
```

- [ ] **Step 4: Run tests, commit**

`node test/tanks2.mjs` green, `npm test` green.

```bash
git add src/tanks2.js test/tanks2.mjs
git commit -m "tank2: great-circle shells + horizon/occlusion LOS — over-the-horizon hits are physical"
```

---

### Task 4: Match flow + determinism (verification gate)

**Files:**
- Modify: `test/tanks2.mjs` (append; extend imports with `DYING_T, INVULN_T`)
- Modify: `src/tanks2.js` only if a test exposes a real bug (do not loosen assertions)

**Interfaces:** verified events `hit/respawn/matchEnd`, frozen post-match state, deterministic replay — the exact contract `tank2-tab.js` consumes.

- [ ] **Step 1: Write the verifying test**

Append to `test/tanks2.mjs`:

```js
console.log('match flow:');
{
  const g = stagePair(0.25, { pointsToWin: 2 });
  g.step(DT, { fire: true });
  let ev = [];
  for (let i = 0; i < 60 * 2 && !ev.some((e) => e.type === 'hit'); i++) {
    g.step(DT, {});
    ev.push(...g.events);
  }
  check('close-range hit scores', g.score[0] === 1 && ev.some((e) => e.type === 'hit' && e.by === 0));
  check('victim dying with tangent knockDir', g.tanks[1].state === 'dying'
    && approx(dot3(g.tanks[1].knockDir, g.tanks[1].pos), 0, 1e-6));
  for (let i = 0; i < Math.ceil(DYING_T / DT) + 2; i++) g.step(DT, {});
  check('respawn: both at spawns, invulnerable, shells cleared',
    dist3(g.tanks[0].pos, g.planet.spawns[0].pos) < 1e-9
    && dist3(g.tanks[1].pos, g.planet.spawns[1].pos) < 1e-9
    && g.tanks[0].invulnT > 0 && g.tanks[1].invulnT > 0
    && !g.shells[0] && !g.shells[1]);
}
{
  const g = stagePair(0.25);
  g.tanks[1].invulnT = INVULN_T;
  g.step(DT, { fire: true });
  let hit = false;
  for (let i = 0; i < 60 * 3 && g.shells[0]; i++) { g.step(DT, {}); hit = hit || g.score[0] > 0; }
  check('invulnerable tank cannot be hit', !hit && g.score[0] === 0);
}
{
  const g = stagePair(0.25, { pointsToWin: 1 });
  g.step(DT, { fire: true });
  for (let i = 0; i < 60 * 2 && g.winner < 0; i++) g.step(DT, {});
  check('match ends at pointsToWin', g.winner === 0);
  const frozen = JSON.stringify(g.tanks);
  g.step(DT, { forward: true, fire: true });
  check('post-match frozen, events empty', JSON.stringify(g.tanks) === frozen && g.events.length === 0);
}
{
  const snap = (g) => JSON.stringify([g.tanks, g.shells, g.score, g.winner, g.time],
    (k, v) => (typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v));
  const script = (i) => ({
    left: i % 97 < 20, right: i % 89 < 15, forward: i % 7 !== 0,
    reverse: i % 131 < 5, fire: i % 45 === 0,
  });
  const run = () => {
    const g = createPlanetTankGame({ seed: 77, wallClusters: 5, aiLevel: 1, ricochet: true });
    for (let i = 0; i < 600; i++) g.step(DT, script(i));
    return snap(g);
  };
  check('deterministic replay (10s, L1, ricochet)', run() === run());
}
```

- [ ] **Step 2: Run — expected PASS (gate).** Any FAIL is a real bug in Tasks 2–3: fix the source, never the assertions, and document the fix.

- [ ] **Step 3: `npm test` green, commit + DEVLOG**

```bash
git add test/tanks2.mjs src/tanks2.js
git commit -m "tank2: match-flow + determinism gate over the sphere core"
git log -1 --format=%h   # hash H
```

DEVLOG entry (newest-first; commit as `devlog: <H> — tank2 core`):

```markdown
## `<H>` — Combat, bent around a sphere

The planet tank core is complete and Node-tested: a ~400-cell relaxed
Stålberg planet with seeded wall clusters, tanks that drive in tangent
frames (position and heading stay an exact orthonormal pair for
thousands of steps), and shells that fly great circles — which makes
over-the-horizon hits physical, no line of sight required. LOS itself is
two tests: does the turret-height chord clear the sphere, and does any
wall cell sit on the arc. Same input shape, same events, same match flow
as the flat core; the geometry is the only thing that changed.
```

---

### Task 5: AI ladder — L1/L2/L3 + L4 ghost gunner

**Files:**
- Modify: `src/tanks2.js` (replace `makeAiMem`/`aiStep` stubs; add `interceptPos`)
- Modify: `test/tanks2.mjs` (append; extend imports with `interceptPos, TANK_ANG` if missing)

**Interfaces:**
- Produces:
  - `interceptPos(shooter, target, velAxis, velRate) -> unit vec` — iterative great-circle intercept (3 refinement rounds).
  - `aiStep(game, dt)` internal; `game.aiMem = {wanderT, wanderDir, fireT, strafeSign, prevP, velAxis, velRate, seenPos, seenAxis, seenRate, seenAge}`; `AIM_ERR = [0, 0.25, 0.15, 0.06, 0.04]`; `GHOST_MAX_AGE = 4` (seconds a last-seen track stays shootable).
  - Behavior contract: L1 wander + blind timer fire; L2 tracks bearing, fires only with LOS; L3 leads via `interceptPos`, LOS-gated, spacing (forward > 1.0 rad, reverse < 0.45 rad), sideways slip while own shell flies; L4 additionally fires WITHOUT LOS at the extrapolated last-seen position when it is inside `SHELL_RANGE * 0.95`, and holds position (ambush) when it has no aim at all. AI holds still on the step it fires (all levels ≥ 2).

- [ ] **Step 1: Write the failing test**

Append to `test/tanks2.mjs` (extend the tanks2 import with `interceptPos`; extend the vec3 import with `scale3`):

```js
console.log('ai:');
{
  // intercept: target circling at known rate; shell must arrive where it will be
  const shooter = [1, 0, 0];
  const target = norm3(rotAbout(shooter, [0, 1, 0], -0.9));
  const velAxis = [1, 0, 0]; // target circles around +x
  const p = interceptPos(shooter, target, velAxis, 0.3);
  const tFly = arcBetween(shooter, p) / SHELL_RATE;
  const truth = norm3(rotAbout(target, velAxis, 0.3 * tFly));
  check('interceptPos converges on the moving target', arcBetween(p, truth) < 0.01);
}
{
  const g = createPlanetTankGame({ seed: 5, wallClusters: 0, aiLevel: 1 });
  const start = g.tanks[1].pos.slice();
  let fired = 0;
  for (let i = 0; i < 60 * 20; i++) {
    g.step(DT, {});
    fired += g.events.filter((e) => e.type === 'fire' && e.tank === 1).length;
  }
  check('L1 wanders the planet', arcBetween(start, g.tanks[1].pos) > 0.3);
  check('L1 fires blind on a timer', fired >= 3);
}
{
  // L2/L3 never fire without LOS (walled planet, moving player, 20s each)
  for (const lvl of [2, 3]) {
    const g = createPlanetTankGame({ seed: 9, wallClusters: 6, aiLevel: lvl });
    let violations = 0;
    for (let i = 0; i < 60 * 20; i++) {
      g.step(DT, { left: i % 4 === 0, forward: true });
      if (g.events.some((e) => e.type === 'fire' && e.tank === 1)
        && !hasLineOfSight(g, g.tanks[1].pos, g.tanks[0].pos)) violations++;
    }
    check(`L${lvl} only fires with LOS`, violations === 0, `${violations} blind`);
  }
}
{
  // L4 ghost gunner: sees the player, player flees over the horizon,
  // L4 fires at the extrapolated position with NO line of sight.
  const g = createPlanetTankGame({ seed: 5, wallClusters: 0, aiLevel: 4 });
  const a = g.tanks[0], b = g.tanks[1];
  a.pos = [1, 0, 0];
  b.pos = norm3(rotAbout(a.pos, [0, 1, 0], -0.3)); // inside the horizon
  b.head = tangentDir(b.pos, a.pos);
  a.head = tangentDir(a.pos, b.pos) ? scale3(tangentDir(a.pos, b.pos), -1) : a.head; // face AWAY
  let blindFire = false;
  for (let i = 0; i < 60 * 12 && !blindFire; i++) {
    g.step(DT, { forward: true }); // flee straight over the horizon
    if (g.events.some((e) => e.type === 'fire' && e.tank === 1)
      && !hasLineOfSight(g, g.tanks[1].pos, g.tanks[0].pos)) blindFire = true;
  }
  check('L4 fires over the horizon at the ghost', blindFire);
}
{
  // L4 ambush: never saw the player, no ghost -> holds position
  const g = createPlanetTankGame({ seed: 5, wallClusters: 0, aiLevel: 4 });
  const p0 = g.tanks[1].pos.slice(); // spawns are antipodal: no LOS, no track
  for (let i = 0; i < 60 * 3; i++) g.step(DT, {});
  check('L4 holds without a shot', arcBetween(p0, g.tanks[1].pos) < 0.05);
}
```

- [ ] **Step 2: Run — FAIL: `interceptPos` not exported.**

- [ ] **Step 3: Write the implementation**

DELETE the `makeAiMem`/`aiStep` stubs; add:

```js
// --- AI -------------------------------------------------------------------
// L1 Drunk: wander + blind timer fire. L2 Hunter: track bearing, fire on
// LOS. L3 Marksman: lead via great-circle intercept, spacing, slip while
// its shell flies. L4 Ghost gunner: no bank shots on a sphere — instead
// it dead-reckons the last-seen player along their great circle and fires
// over the horizon without LOS. All randomness from game.rng.
const AIM_ERR = [0, 0.25, 0.15, 0.06, 0.04];
const GHOST_MAX_AGE = 4;

function makeAiMem() {
  return {
    wanderT: 0, wanderDir: null, fireT: 1, strafeSign: 1,
    prevP: null, velAxis: null, velRate: 0,
    seenPos: null, seenAxis: null, seenRate: 0, seenAge: Infinity,
  };
}

const signedAngle = (pos, from, to) =>
  Math.atan2(dot3(cross3(from, to), pos), dot3(from, to));

export function interceptPos(shooter, target, velAxis, velRate) {
  let t = arcBetween(shooter, target) / SHELL_RATE;
  for (let k = 0; k < 3; k++) {
    const p = norm3(rotAbout(target, velAxis, velRate * t));
    t = arcBetween(shooter, p) / SHELL_RATE;
  }
  return norm3(rotAbout(target, velAxis, velRate * t));
}

function aiStep(game, dt) {
  const lvl = game.params.aiLevel | 0;
  if (lvl <= 0) return {};
  const me = game.tanks[1], you = game.tanks[0];
  const mem = game.aiMem, rng = game.rng;
  if (me.state !== 'alive') return {};

  // player track: angular velocity as axis + rate
  if (mem.prevP && dt > 0) {
    const moved = arcBetween(mem.prevP, you.pos);
    mem.velRate = moved / dt;
    if (moved > 1e-7) mem.velAxis = norm3(cross3(mem.prevP, you.pos));
  }
  mem.prevP = you.pos.slice();
  const los = hasLineOfSight(game, me.pos, you.pos);
  if (los) {
    mem.seenPos = you.pos.slice();
    mem.seenAxis = mem.velAxis; mem.seenRate = mem.velRate; mem.seenAge = 0;
  } else mem.seenAge += dt;

  const input = {};
  const bearing = tangentDir(me.pos, you.pos) ?? tangentBasis(me.pos)[0];
  const sep = arcBetween(me.pos, you.pos);
  let desired, canFire = false;

  if (lvl === 1) {
    mem.wanderT -= dt;
    if (mem.wanderT <= 0 || me.blocked || !mem.wanderDir) {
      mem.wanderT = 1.5 + rng() * 2;
      mem.wanderDir = tangentAt(rotAbout(me.head, me.pos, rng() * Math.PI * 2), me.pos);
    }
    mem.wanderDir = tangentAt(mem.wanderDir, me.pos);
    desired = mem.wanderDir;
    input.forward = true;
    mem.fireT -= dt;
    if (mem.fireT <= 0 && !game.shells[1]) { input.fire = true; mem.fireT = 1 + rng() * 2; }
  } else {
    let aimPos = you.pos, hasAim = los;
    if (lvl >= 3 && los && mem.velAxis) {
      aimPos = interceptPos(me.pos, you.pos, mem.velAxis, mem.velRate);
    }
    if (lvl >= 4 && !los && mem.seenPos && mem.seenAge < GHOST_MAX_AGE) {
      const ghost = mem.seenAxis
        ? norm3(rotAbout(mem.seenPos, mem.seenAxis, mem.seenRate * mem.seenAge))
        : mem.seenPos;
      if (arcBetween(me.pos, ghost) < SHELL_RANGE * 0.95) { aimPos = ghost; hasAim = true; }
    }
    desired = tangentDir(me.pos, aimPos) ?? bearing;
    desired = tangentAt(rotAbout(desired, me.pos, (rng() - 0.5) * 2 * AIM_ERR[lvl]), me.pos);
    canFire = hasAim;
    aiMove(game, lvl, input, { me, bearing, sep, mem, rng, hasAim });
    if (input.strafeDir) { desired = input.strafeDir; canFire = false; delete input.strafeDir; }
  }

  const dh = signedAngle(me.pos, me.head, desired);
  if (dh > 0.06) input.left = true;
  else if (dh < -0.06) input.right = true;
  if (canFire && Math.abs(dh) < 0.12 && !game.shells[1]) {
    input.fire = true;
    input.forward = input.reverse = false; // hold still: the aim stays true at fire time
  }
  return input;
}

function aiMove(game, lvl, input, ctx) {
  const { me, bearing, sep, mem, rng, hasAim } = ctx;
  if (lvl === 2) {
    input.forward = Math.abs(signedAngle(me.pos, me.head, bearing)) < 0.6;
    return;
  }
  if (lvl >= 4 && !hasAim) return; // ambush: hold, keep tracking the bearing
  if (game.shells[1]) {
    if (rng() < 0.005) mem.strafeSign = -mem.strafeSign;
    input.strafeDir = tangentAt(
      rotAbout(bearing, me.pos, (mem.strafeSign * Math.PI) / 2), me.pos);
    input.forward = true;
    return;
  }
  if (sep > 1.0) input.forward = true;
  else if (sep < 0.45) input.reverse = true;
}
```

Sign note for the turn gate: `updateTank` turns by `(left − right) · TURN_RATE·dt` about `pos`, and `signedAngle(pos, head, desired)` measures in the same frame — a positive `dh` is closed by `left`. The L2 convergence and L4 tests fail loudly if a sign flips; do not hand-tune, check the frame.

- [ ] **Step 4: Run tests (the AI blocks simulate 12–20s each — expect ~a minute), `npm test`, commit + DEVLOG**

```bash
git add src/tanks2.js test/tanks2.mjs
git commit -m "tank2: AI ladder — great-circle lead, and L4 trades bank shots for over-the-horizon ghosts"
git log -1 --format=%h   # hash H
```

DEVLOG entry (commit `devlog: <H> — tank2 AI`):

```markdown
## `<H>` — The gunner that shoots at where you were going

The planet AI ladder is in. L1–L3 port straight over (wander; track and
fire on sight; lead the target — the intercept solves on the sphere by
iterating flight-time against the target's angular velocity, three
rounds, converges to well under a cell). L4 could not port: bank shots
need mirror walls and a sphere has none. Its replacement is native to
the geometry — shells follow the surface, so L4 keeps a track of your
last seen position and velocity, extrapolates it along its great circle
while you hide behind the curve, and fires at the ghost. No line of
sight, no warning, just artillery from beyond the horizon. Ambush
unchanged: no shot worth taking, no movement worth making.
```

---

### Task 6: Tab — planet render, chase camera, input, HUD (shared classes)

**Files:**
- Create: `src/tank2-tab.js`
- Modify: `index.html` (tabbar button after `tank`; `#tab-tank2` div after `#tab-tank`; add shared HUD classes to the EXISTING tank tab's HUD divs)
- Modify: `src/main.js` (import + register key `tank2`)
- Modify: `styles.css` (generalize `#tank-score/#tank-msg/#tank-hint` rules to `.combat-score/.combat-msg/.combat-hint` classes; add `#tank2-app` to the app-container fill rule)

**Interfaces:**
- Consumes: `createPlanetTankGame, SHELL_RANGE, DYING_T` from `./tanks2.js?v=<current token>`; `mulberry32` from `./rng.js?v=<token>`; `norm3, scale3` from `./vec3.js?v=<token>`; vendor three.js (no token).
- Produces: `initTank2Tab(root) -> {setActive(on)}`; DOM ids `#tank2-app`, `#tank2-score`, `#tank2-msg`, `#tank2-hint`, `#tank2-pad-left/right/up/fire`; `TANK_SCALE = 0.08`; chase camera anchors `chaseEye`/`chaseTarget` inside the player tank group (Task 7 adds POV/orbit on the same pattern).

- [ ] **Step 1: index.html**

Tabbar, after the tank button: `<button data-tab="tank2">tank2</button>`

After `#tab-tank`'s closing div:

```html
<div id="tab-tank2" class="tab tab-hidden">
  <div id="tank2-app"></div>
  <div id="tank2-score" class="combat-score"><span class="ts-red">0</span><span class="ts-blue">0</span></div>
  <div id="tank2-msg" class="combat-msg hidden"></div>
  <div id="tank2-pad-left" class="tzone tzone-side tzone-l"><span>&lsaquo;</span></div>
  <div id="tank2-pad-right" class="tzone tzone-side tzone-r"><span>&rsaquo;</span></div>
  <div class="tzone-mid">
    <div id="tank2-pad-up" class="tzone tzone-drive"><span>&and;</span></div>
  </div>
  <button id="tank2-pad-fire" class="tfire tfire-primary" title="FIRE (Space)">&#9673;</button>
  <div id="tank2-hint" class="combat-hint">PLANET COMBAT &middot; arrows drive &middot; SPACE fire &middot; C camera &middot; the horizon is cover</div>
</div>
```

And on the EXISTING tank tab divs add the classes (ids unchanged — JS queries by id): `#tank-score` gains `class="combat-score"`, `#tank-msg` gains `combat-msg` (keeping `hidden`), `#tank-hint` gains `combat-hint`.

- [ ] **Step 2: styles.css**

Replace the three `#tank-*` HUD rule selectors with classes (same declarations — this is a selector rename, not a restyle): `#tank-score` → `.combat-score`, `#tank-score .ts-red` → `.combat-score .ts-red` (and blue), `#tank-msg`/`#tank-msg.hidden` → `.combat-msg`/`.combat-msg.hidden`, `#tank-hint` → `.combat-hint`. Add `#tank2-app` to BOTH app-container rules (the `position:absolute; inset:0` list and the `canvas { display:block }` list — the flat tab shipped without this and rendered as a 150px strip; do not repeat that).

- [ ] **Step 3: main.js**

```js
import { initTank2Tab } from './tank2-tab.js?v=<current token>';
```
and in `tabs`, after `tank`:
```js
tank2: { root: document.getElementById('tab-tank2'), init: initTank2Tab, api: null },
```

- [ ] **Step 4: Write src/tank2-tab.js**

```js
// tank2-tab.js — planet Combat: render shell + input around tanks2.js.
// A tiny olive planet in black space; the game core never learns which
// camera is watching it.
import * as THREE from '../vendor/three.module.js';
import GUI from '../vendor/lil-gui.esm.js';
import { createPlanetTankGame, DYING_T } from './tanks2.js?v=TOKEN';
import { mulberry32 } from './rng.js?v=TOKEN';
import { norm3, scale3 } from './vec3.js?v=TOKEN';

const DT = 1 / 60;
const TANK_SCALE = 0.08;
const COLORS = {
  space: 0x05070d, ground: 0x9cb04c, block: 0xd89048,
  red: 0xd23b2f, blue: 0x3556d2, shell: 0xf5f0dc,
};

export function initTank2Tab(root) {
  let active = true;
  const params = {
    seed: 42, points: 400, wallClusters: 5, pointsToWin: 7,
    ricochet: false, aiLevel: 1, view: 'chase',
  };

  const container = root.querySelector('#tank2-app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.space);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(3, 4, 2);
  scene.add(sun);

  const cam = new THREE.PerspectiveCamera(55, 1, 0.005, 50);
  cam.position.set(0, 0, 3);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  // --- meshes --------------------------------------------------------------
  function buildTank(color) {
    const mat = new THREE.MeshLambertMaterial({ color });
    const g = new THREE.Group();
    const add = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
    };
    add(1.0, 0.35, 0.7, 0, 0.28, 0);
    add(1.1, 0.25, 0.22, 0, 0.13, 0.42);
    add(1.1, 0.25, 0.22, 0, 0.13, -0.42);
    add(0.5, 0.28, 0.45, -0.05, 0.6, 0);
    add(0.7, 0.1, 0.1, 0.55, 0.62, 0);
    g.scale.setScalar(TANK_SCALE);
    return g;
  }
  const tankMeshes = [buildTank(COLORS.red), buildTank(COLORS.blue)];
  const shellMat = new THREE.MeshLambertMaterial({ color: COLORS.shell });
  const shellMeshes = [0, 1].map(() =>
    new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), shellMat));
  scene.add(...tankMeshes, ...shellMeshes);
  // chase anchors ride INSIDE the tank group: camera derives from world
  // transforms, never from heading math (hard rule).
  const chaseEye = new THREE.Object3D();
  chaseEye.position.set(-3.4, 2.4, 0);
  const chaseTarget = new THREE.Object3D();
  chaseTarget.position.set(2.6, 0.6, 0);
  tankMeshes[0].add(chaseEye, chaseTarget);

  let game = null;
  let planetGroup = null;

  function buildPlanet() {
    if (planetGroup) {
      scene.remove(planetGroup);
      planetGroup.traverse((o) => o.geometry && o.geometry.dispose());
    }
    planetGroup = new THREE.Group();
    const { mesh, walls } = game.planet;
    const { vertices, quads } = mesh;
    const shade = mulberry32(mesh.seed ^ 0x51ab);
    const groundC = new THREE.Color(COLORS.ground);
    const tmp = new THREE.Color();
    const pos = [], col = [];
    for (let qi = 0; qi < quads.length; qi++) {
      if (walls.has(qi)) continue;
      tmp.copy(groundC).offsetHSL(0, 0, (shade() - 0.5) * 0.07);
      const q = quads[qi];
      for (const vi of [q[0], q[1], q[2], q[0], q[2], q[3]]) {
        pos.push(...vertices[vi]);
        col.push(tmp.r, tmp.g, tmp.b);
      }
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    gg.computeVertexNormals();
    planetGroup.add(new THREE.Mesh(gg,
      new THREE.MeshLambertMaterial({ vertexColors: true })));
    // wall prisms: top quad lifted radially + four sides
    const wpos = [];
    const H = 1.055;
    for (const qi of walls) {
      const q = quads[qi].map((vi) => vertices[vi]);
      const t = q.map((v) => scale3(norm3(v), H));
      for (const p of [t[0], t[1], t[2], t[0], t[2], t[3]]) wpos.push(...p);
      for (let e = 0; e < 4; e++) {
        const a = q[e], b = q[(e + 1) % 4];
        const ta = t[e], tb = t[(e + 1) % 4];
        for (const p of [a, b, tb, a, tb, ta]) wpos.push(...p);
      }
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
    wg.computeVertexNormals();
    planetGroup.add(new THREE.Mesh(wg,
      new THREE.MeshLambertMaterial({ color: COLORS.block })));
    scene.add(planetGroup);
  }

  const scoreEl = root.querySelector('#tank2-score');
  const msgEl = root.querySelector('#tank2-msg');

  function updateScore() {
    scoreEl.innerHTML = `<span class="ts-red">${game.score[0]}</span>`
      + `<span class="ts-blue">${game.score[1]}</span>`;
  }

  function newMatch() {
    game = createPlanetTankGame({
      seed: params.seed >>> 0, points: params.points,
      wallClusters: params.wallClusters, pointsToWin: params.pointsToWin,
      ricochet: params.ricochet, aiLevel: params.aiLevel,
    });
    buildPlanet();
    msgEl.classList.add('hidden');
    updateScore();
    syncScene();
    tankMeshes[0].updateMatrixWorld();
    cam.position.copy(chaseEye.getWorldPosition(new THREE.Vector3())); // no first-frame lerp snap
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
  for (const [id, k] of [['left', 'left'], ['right', 'right'], ['up', 'forward'], ['fire', 'fire']]) {
    const el = root.querySelector(`#tank2-pad-${id}`);
    el.addEventListener('pointerdown', (e) => { input[k] = true; el.classList.add('pressed'); e.preventDefault(); });
    for (const ev of ['pointerup', 'pointercancel']) {
      el.addEventListener(ev, () => { input[k] = false; el.classList.remove('pressed'); });
    }
  }

  // --- sync + camera -------------------------------------------------------
  const _m = new THREE.Matrix4();
  const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();

  function orientTank(group, t) {
    _x.set(...t.head);          // barrel +x = heading
    _y.set(...t.pos);           // up = surface normal
    _z.crossVectors(_x, _y);    // right-handed basis
    _m.makeBasis(_x, _y, _z);
    group.quaternion.setFromRotationMatrix(_m);
    group.position.set(...t.pos);
  }

  function syncScene() {
    for (let i = 0; i < 2; i++) {
      const t = game.tanks[i];
      orientTank(tankMeshes[i], t);
      const s = game.shells[i];
      shellMeshes[i].visible = !!s;
      if (s) shellMeshes[i].position.set(...scale3(s.pos, 1.015));
    }
  }

  function updateCamera() {
    const tm = tankMeshes[0];
    tm.updateMatrixWorld();
    cam.position.lerp(chaseEye.getWorldPosition(_v1), 0.15);
    cam.up.copy(_v2.set(0, 1, 0).applyQuaternion(tm.getWorldQuaternion(_q)));
    cam.lookAt(chaseTarget.getWorldPosition(_v2));
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
    updateCamera();
    renderer.render(scene, cam);
  }

  // --- panel ---------------------------------------------------------------
  const gui = new GUI({ title: 'planet combat', container: root });
  gui.add(params, 'seed', 0, 99999, 1).onFinishChange(newMatch);
  gui.add(params, 'points', 250, 700, 50).name('planet cells').onFinishChange(newMatch);
  gui.add(params, 'wallClusters', 0, 10, 1).name('wall clusters').onFinishChange(newMatch);
  gui.add(params, 'pointsToWin', 1, 15, 1).name('first to').onFinishChange(newMatch);
  gui.add(params, 'ricochet').onChange(newMatch);
  gui.add({ rematch: () => newMatch() }, 'rematch').name('↻ new match');
  if (matchMedia('(pointer: coarse), (max-width: 700px)').matches) gui.close();

  // --- URL hooks -----------------------------------------------------------
  const urlParams = new URLSearchParams(location.search);
  const seedOv = parseInt(urlParams.get('seed') || '', 10);
  if (Number.isFinite(seedOv)) params.seed = seedOv;
  gui.controllersRecursive().forEach((c) => c.updateDisplay());

  newMatch();
  animate();

  const tickN = parseFloat(urlParams.get('tick') || '0');
  if (tickN > 0) {
    for (let i = 0; i < Math.round(tickN * 60); i++) { game.step(DT, {}); consumeEvents(); }
    syncScene();
    console.log('TANK2 ' + JSON.stringify({
      score: game.score, winner: game.winner,
      t: +game.time.toFixed(2), ai: params.aiLevel, view: params.view,
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

(Replace `TOKEN` with the current repo token before busting; bust renews it.)

- [ ] **Step 5: bust (commit ALL its output), test, headless verify**

```bash
./scripts/bust.sh --quiet && npm test
curl -s -o /dev/null http://localhost:8144/ || (npm run serve &>/dev/null & sleep 1)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
  --enable-logging=stderr --window-size=1280,900 --virtual-time-budget=15000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/tank2-chase.png" \
  "http://localhost:8144/?tick=6#tank2" 2>&1 | grep TANK2
```
Expected: a `TANK2 {...}` line; screenshot shows a small olive planet against black, curvature obvious, red tank in the near frame from behind, orange wall prisms. VIEW the screenshot and describe it.

- [ ] **Step 6: Commit + DEVLOG**

```bash
git add -A
git commit -m "tank2: playable planet tab — chase camera over a tiny olive world"
git log -1 --format=%h   # hash H
```

DEVLOG entry (commit `devlog: <H> — tank2 tab`):

```markdown
## `<H>` — A very small war on a very small world

The planet tab renders: ~400 relaxed quads as a vertex-colored olive
ball in black space, wall cells extruded into orange prisms, the same
six-box tanks riding the surface with up = surface normal (one
makeBasis from the core's pos/head pair — the tab adds no orientation
math of its own). The chase camera hangs off anchors parented inside
the tank group, so the horizon rolls underneath you as you drive.
Shared .combat-* HUD classes now dress both tank tabs.
```

---

### Task 7: POV + orbit cameras, AI ladder unlocks, URL hooks

**Files:**
- Modify: `src/tank2-tab.js`

**Interfaces:**
- Consumes: OrbitControls from `../vendor/OrbitControls.js` (NO token).
- Produces: `VIEWS = ['chase', 'pov', 'orbit']`, `C` cycles, panel selector `.listen()`; localStorage `tank2.unlocked` (1–4 clamped); `?ai=N` session-raises unlocked; `?view=chase|pov|orbit`.

- [ ] **Step 1: POV anchors + view logic**

After the chase-anchor block add:

```js
  const povEye = new THREE.Object3D();
  povEye.position.set(0.2, 1.15, 0);
  const povTarget = new THREE.Object3D();
  povTarget.position.set(6, 0.7, 0);
  tankMeshes[0].add(povEye, povTarget);
  const VIEWS = ['chase', 'pov', 'orbit'];
```

After the renderer setup add OrbitControls (import `{ OrbitControls } from '../vendor/OrbitControls.js';` — no token):

```js
  const orbit = new OrbitControls(cam, renderer.domElement);
  orbit.enableDamping = true;
  orbit.minDistance = 1.4;
  orbit.maxDistance = 8;
  orbit.enabled = false;
```

Replace `updateCamera()` with:

```js
  function updateCamera() {
    if (params.view === 'orbit') { orbit.update(); return; }
    const tm = tankMeshes[0];
    tm.updateMatrixWorld();
    const eye = params.view === 'pov' ? povEye : chaseEye;
    const tgt = params.view === 'pov' ? povTarget : chaseTarget;
    cam.position.lerp(eye.getWorldPosition(_v1), params.view === 'pov' ? 1 : 0.15);
    cam.up.copy(_v2.set(0, 1, 0).applyQuaternion(tm.getWorldQuaternion(_q)));
    cam.lookAt(tgt.getWorldPosition(_v2));
  }
```

And an `applyView()` used by the C key, panel, and URL hook:

```js
  function applyView() {
    orbit.enabled = params.view === 'orbit';
    if (params.view === 'orbit') {
      cam.up.set(0, 1, 0);
      if (cam.position.length() < 1.4) cam.position.setLength(2.6);
    }
  }
```

- [ ] **Step 2: C key, unlocks, panel, URL hooks**

In keydown add:

```js
    if (e.key === 'c' || e.key === 'C') {
      params.view = VIEWS[(VIEWS.indexOf(params.view) + 1) % VIEWS.length];
      applyView();
      gui.controllersRecursive().forEach((c2) => c2.updateDisplay());
    }
```

After the GUI block:

```js
  const readUnlocked = () => Math.min(4, Math.max(1,
    parseInt(localStorage.getItem('tank2.unlocked') || '1', 10) || 1));
  let unlocked = readUnlocked();
  let aiCtrl = null;
  function rebuildAiCtrl() {
    if (aiCtrl) aiCtrl.destroy();
    const levels = {};
    ['L1 drunk', 'L2 hunter', 'L3 marksman', 'L4 ghost gunner']
      .slice(0, unlocked).forEach((n, i) => { levels[n] = i + 1; });
    aiCtrl = gui.add(params, 'aiLevel', levels).name('AI level').onChange(newMatch);
  }
  rebuildAiCtrl();
  gui.add(params, 'view', VIEWS).name('camera (C)').listen().onChange(applyView);
```

In `consumeEvents()` replace the matchEnd branch:

```js
      if (e.type === 'matchEnd') {
        if (e.winner === 0 && params.aiLevel === unlocked && unlocked < 4) {
          unlocked++;
          localStorage.setItem('tank2.unlocked', String(unlocked));
          rebuildAiCtrl();
          msgEl.textContent = `RED WINS — LEVEL ${unlocked} UNLOCKED — click / ENTER`;
        } else {
          msgEl.textContent = e.winner === 0 ? 'RED WINS — click / ENTER for rematch'
            : 'BLUE WINS — click / ENTER for rematch';
        }
        msgEl.classList.remove('hidden');
      }
```

URL hooks (before `newMatch()`; `rebuildAiCtrl` must already exist):

```js
  const aiOv = parseInt(urlParams.get('ai') || '', 10);
  if (aiOv >= 1 && aiOv <= 4) { params.aiLevel = aiOv; unlocked = Math.max(unlocked, aiOv); rebuildAiCtrl(); }
  const viewOv = urlParams.get('view');
  if (VIEWS.includes(viewOv)) params.view = viewOv;
  applyView();
```

- [ ] **Step 3: bust (commit all), npm test, headless all three views**

```bash
./scripts/bust.sh --quiet && npm test
for v in chase pov orbit; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
    --enable-logging=stderr --window-size=1280,900 --virtual-time-budget=15000 \
    --screenshot="$CLAUDE_JOB_DIR/tmp/tank2-$v.png" \
    "http://localhost:8144/?tick=4&ai=2&view=$v#tank2" 2>&1 | grep TANK2
done
```
VIEW each screenshot: chase = planet curve under the red tank; pov = surface rushing at the camera, horizon close; orbit = the whole planet as a ball. Debug anchor transforms (not sign hand-tuning) if a view is wrong.

- [ ] **Step 4: Commit + DEVLOG**

```bash
git add -A
git commit -m "tank2: pov + orbit views, ladder unlocks, URL hooks"
git log -1 --format=%h  # H
```

DEVLOG (commit `devlog: <H> — tank2 cameras`):

```markdown
## `<H>` — Three ways to watch a planet fight

Chase rolls the horizon under you; POV puts the curve terrifyingly
close (the mutual horizon is ~28° — an enemy three seconds away is
invisible); orbit hands the whole ball to OrbitControls while the match
keeps running, a war in a snow globe. Ladder unlocks live in
tank2.unlocked — flat-arena wins don't transfer, the planet has to be
earned on the planet.
```

---

### Task 8: Polish — debris, flash, spin, docs, final sweep, push

**Files:**
- Modify: `src/tank2-tab.js`
- Modify: `HOW-IT-WORKS.md` (append section)

- [ ] **Step 1: Debris + invuln flash + dying spin**

Add near the mesh section (mulberry32 already imported):

```js
  // blocky explosion; debris falls along the LOCAL down (toward planet
  // center). Own rng stream seeded from sim time: visual-only randomness.
  const debris = [];
  function explodeAt(p, color) {
    const rng = mulberry32((game.time * 1000) >>> 0);
    const mat = new THREE.MeshLambertMaterial({ color });
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.016), mat);
      m.position.set(...scale3(p, 1.03));
      const dir = norm3([rng() - 0.5, rng() - 0.5, rng() - 0.5]);
      m.userData.vel = scale3(dir, 0.12 + rng() * 0.25);
      m.userData.up = p.slice();
      m.userData.ttl = 0.7;
      debris.push(m);
      scene.add(m);
    }
  }
  function tickDebris(dt) {
    for (let i = debris.length - 1; i >= 0; i--) {
      const m = debris[i], v = m.userData.vel, up = m.userData.up;
      m.userData.ttl -= dt;
      for (let k = 0; k < 3; k++) v[k] -= up[k] * 0.9 * dt; // local gravity
      m.position.x += v[0] * dt; m.position.y += v[1] * dt; m.position.z += v[2] * dt;
      m.rotation.x += 5 * dt; m.rotation.z += 4 * dt;
      if (m.userData.ttl <= 0 || m.position.length() < 0.995) {
        scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
        debris.splice(i, 1);
      }
    }
  }
```

In `consumeEvents()` hit branch: `const victim = game.tanks[1 - e.by]; explodeAt(victim.pos, e.by === 0 ? COLORS.blue : COLORS.red);`
In `syncScene()` per-tank loop, after `orientTank`:

```js
      tankMeshes[i].visible = !(t.invulnT > 0 && Math.floor(game.time * 10) % 2 === 0);
      if (t.state === 'dying') tankMeshes[i].rotateY((DYING_T - t.dyingT) * 0.6);
```

In `animate()`, call `tickDebris(DT)` right after `consumeEvents()` inside the fixed-step loop.

- [ ] **Step 2: HOW-IT-WORKS.md — append**

```markdown
## Planet combat (tank2)

The flat tank duel bent around a sphere. `tanks2.js` is a sibling core,
not a fork: same input contract, same events, same match flow — but
positions are unit vectors, headings tangent vectors, and every speed a
radian rate. Shells fly great circles at surface height, which quietly
changes the game: a shot needs no line of sight to land, so cover is
the planet itself. LOS is two questions — does the turret-height chord
clear the sphere, and is any wall cell on the arc. L4 exploits the
first answer: it dead-reckons your last-seen track and shells the ghost
from beyond the horizon. The planet is a ~400-cell relaxed Stålberg
mesh; walls are seeded cell clusters; the cellindex voxel hash answers
"which cell am I over" for tanks and shells alike.
```

- [ ] **Step 3: bust (commit all), npm test, final sweep**

```bash
./scripts/bust.sh --quiet && npm test
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
  --enable-logging=stderr --window-size=1280,900 --virtual-time-budget=20000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/tank2-final.png" \
  "http://localhost:8144/?tick=25&ai=4&view=orbit#tank2" 2>&1 | grep TANK2
```
Expected: TANK2 line (L4 vs an idle player at antipodal spawns may legitimately show 0–0 for a while — L4 holds until it acquires a track; the line itself + rendered orbit view is the gate). VIEW the screenshot.

- [ ] **Step 4: Commit, DEVLOG, push**

```bash
git add -A
git commit -m "tank2: debris falls toward the planet core — polish + docs"
git log -1 --format=%h  # H
```

DEVLOG (commit `devlog: <H> — tank2 polish`), then `git push origin main`:

```markdown
## `<H>` — Gravity is local now

Hit feedback ported to the sphere: the explosion cubes fall toward the
planet's center (local down = minus the surface normal), victims spin
through their knockback slide, respawns blink. With that, planet combat
is complete — same cartridge, rounder world.
```

Then notify the operator via Telegram (milestone): planet combat live, Pages URL + `#tank2`.

---

## Final acceptance checklist

- [ ] `npm test` green (seven suites incl. `tanks2.mjs`)
- [ ] `#tank2` deep-link playable; horizon hides the enemy in chase/POV
- [ ] `C` cycles chase/pov/orbit; orbit shows the whole planet mid-match
- [ ] L4 lands over-the-horizon shots (Node test) and holds when trackless
- [ ] `tank2.unlocked` advances on wins at the highest unlocked level
- [ ] `?tick/?ai/?view/?seed` hooks work headless (with `--enable-logging=stderr`)
- [ ] Both tank tabs' HUDs render via shared `.combat-*` classes; `#tank2-app` fills the viewport
- [ ] All bust output committed atomically; vendor imports token-free
- [ ] DEVLOG entries at tasks 4, 5, 6, 7, 8
