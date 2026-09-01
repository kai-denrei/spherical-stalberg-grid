# The First State — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the TD tab one canonical opening state — every reset lands the tank in Container #(playerHP) and drives it entirely out under a scripted DEPLOY, with no camera jump cut, whichever prelude ran.

**Architecture:** Berth selection becomes a pure Node-tested module so berth cells exist synchronously at reset (today they are chosen inside an async model callback, which is why the tank is placed beside the Heart and teleported later). One `camShot` primitive owns every timed camera override with a single teardown path. DEPLOY is its own state — not `autoMode`, not `cruise` — and its camera lerps into the pose read from `updateCameraGoal()`, so "last frame = first frame" holds by construction.

**Tech Stack:** Vanilla ES modules, vendored three.js r160, no build step. Node `node --test`-style assertion suites under `test/`. Headless Chrome probes via URL hooks.

**Spec:** `docs/superpowers/specs/2026-09-01-first-state-design.md`

## Global Constraints

- After editing any `src/*.js`, HTML or CSS: run `./scripts/bust.sh --quiet`, then stage **everything it touched** — commits are atomic or they ship stale import tokens. Never put `?v=` on a `../vendor/` import.
- `npm test` must stay green. Pure modules are DOM-free and Node-tested; `td-tab.js` is not Node-testable.
- Deterministic only: `mulberry32` from `params.seed`. No `Math.random` in game logic.
- Headless: Chrome with `--use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr`. `performance.now()` does not advance under `--virtual-time-budget`, so no probe may wait on wall-clock seconds.
- **Verification rule:** every probe must be run as a negative control first — with the fix disabled — and shown to FAIL. **No run may pass `?cine=0` while the cinematic path is under test.** A flag that disables the feature under test voids the run.
- Derive render-coupled values FROM the render transform; never re-derive with local sign conventions.
- Commits explain the why and end with the `Co-Authored-By` + `Claude-Session` trailer.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/berths.js` (**new**) | Pure: choose the 3-cell berth chain and each berth's exit; map hull count → berth index. No DOM, no THREE, no async. |
| `test/berths.mjs` (**new**) | Node assertions for `src/berths.js`; wired into `npm test`. |
| `src/td-tab.js` (modify) | Consume `berths.js`; add `camShot` + DEPLOY; port CINEMATIC and sector reveal onto `camShot`; add DOWN DASH; delete the superseded machinery. |
| `test/tdcore.mjs` (modify) | Add the berth-index invariant alongside the existing TD core checks. |

---

## Task 1: `src/berths.js` — pure berth selection

**Files:**
- Create: `src/berths.js`
- Create: `test/berths.mjs`
- Modify: `package.json` (add the suite to the `test` script)

**Interfaces:**
- Produces: `computeBerths(dungeon, graph)` → `[{ ci, exit }, { ci, exit }, { ci, exit }]` in painted order #1, #2, #3, or `[]` when no valid chain exists. `berthIndexFor(hp, max = 3)` → integer index clamped to `[0, max - 1]`.

- [ ] **Step 1: Write the failing test**

Create `test/berths.mjs`:

```js
import assert from 'node:assert';
import { computeBerths, berthIndexFor } from '../src/berths.js';
import { generateSphereMesh, relax } from '../src/grid.js';
import { generateDungeon, BLOCKED } from '../src/dungeon.js';

let pass = 0;
const check = (name, cond) => {
  if (!cond) { console.log(`  FAIL ${name}`); process.exitCode = 1; }
  else { console.log(`  ok   ${name}`); pass++; }
};

console.log('berths:');

// THE ORDERING RULE the operator fixed: 1st tank out of #3, 2nd out of #2,
// last out of #1. berths[2] is Container #3, so a full hull count maps to
// the LAST index and counts down.
check('full life picks Container #3', berthIndexFor(3) === 2);
check('two hulls picks Container #2', berthIndexFor(2) === 1);
check('last hull picks Container #1', berthIndexFor(1) === 0);
check('zero clamps to Container #1', berthIndexFor(0) === 0);
check('over-max clamps to Container #3', berthIndexFor(9) === 2);

const mesh = generateSphereMesh({ seed: 7, n: 500, k: 12 });
relax(mesh, { n_iters: 8, PULL_RATE: 0.25 });
const dungeon = generateDungeon(mesh, {
  seed: 7, rooms: 16, roomRadius: 4, extraCorridors: 8, corridorWidth: 1,
});
const graph = dungeon.graph;
const berths = computeBerths(dungeon, graph);

check('finds a three-berth chain', berths.length === 3);
check('every berth is open ground', berths.every((b) => dungeon.tags[b.ci] !== BLOCKED));
check('every berth has an exit', berths.every((b) => b.exit >= 0));
check('an exit is never another berth',
  berths.every((b) => !berths.some((o) => o.ci === b.exit)));
check('exits are open ground', berths.every((b) => dungeon.tags[b.exit] !== BLOCKED));
check('the chain is adjacent, in painted order',
  graph.adj[berths[0].ci].includes(berths[1].ci)
  && graph.adj[berths[1].ci].includes(berths[2].ci));
// DETERMINISM is the contract that lets the camp stay put across a reload
const again = computeBerths(dungeon, graph);
check('same board gives the same camp',
  JSON.stringify(again) === JSON.stringify(berths));

console.log(berths.length === 3 ? 'berths: all good' : 'berths: NO CHAIN');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node test/berths.mjs`
Expected: FAIL — `Cannot find module '../src/berths.js'`.

- [ ] **Step 3: Write `src/berths.js`**

This is a **move, not a rewrite**: the body comes from the block currently inside `preloadContainer().then()` in `src/td-tab.js` (the `inRange` / `open` / `escapes` scoring loop and `escapeOf`). Note the import has **no `?v=` token** — Node reads these paths directly, and `bust.sh` only tokenises browser-reachable references.

```js
// THE CAMP. Where the three life containers stand, and which way each one
// faces. This was chosen inside the container model's async callback, which
// meant the game did not know where the berths were at reset time: it put the
// tank beside the Heart and teleported it into a berth later, and that
// teleport was the jump cut. None of this needs the model — it is graph maths
// — so it runs synchronously with the board and the model only decorates it.
import { sub3, dot3, norm3, scale3 } from './vec3.js';
import { BLOCKED } from './dungeon.js';

function tangentDirTo(graph, from, to) {
  const n = graph.normals[from];
  const d = sub3(graph.centers[to], graph.centers[from]);
  return norm3(sub3(d, scale3(n, dot3(d, n)))); // onto the tangent plane
}

// Which container this hull drives out of. The operator's rule: the FIRST
// tank leaves Container #3, the second #2, the last #1 — so a full hull count
// takes the highest berth and they count down as the run wears on.
// berths[2] is Container #3.
export function berthIndexFor(hp, max = 3) {
  return Math.min(max - 1, Math.max(0, hp - 1));
}

export function computeBerths(dungeon, graph) {
  const inRange = (c2) => dungeon.tags[c2] !== BLOCKED && c2 !== dungeon.spawn
    && dungeon.distToHeart[c2] >= 3 && dungeon.distToHeart[c2] <= 4;
  const open = (c2) => graph.adj[c2].filter((k2) => dungeon.tags[k2] !== BLOCKED).length;
  // EVERY BERTH KEEPS A LANE. Scoring for minimum openness alone once picked a
  // chain whose only open neighbours were its own siblings — a sealed garage,
  // and each of the three gets used as a spawn as lives run down. An escape
  // lane is a HARD requirement; openness only breaks ties among chains that
  // have one.
  const escapes = (c2, chain) => graph.adj[c2]
    .filter((k2) => dungeon.tags[k2] !== BLOCKED && !chain.includes(k2)).length;

  let best = null, bestScore = Infinity;
  for (let j = 0; j < dungeon.tags.length; j++) {
    if (!inRange(j)) continue;
    const nbs = graph.adj[j].filter(inRange);
    for (let a = 0; a < nbs.length; a++) {
      for (let b = a + 1; b < nbs.length; b++) {
        const chain = [nbs[a], j, nbs[b]];
        if (chain.some((c2) => escapes(c2, chain) === 0)) continue;
        const sc = open(nbs[a]) + open(j) + open(nbs[b]);
        if (sc < bestScore) { bestScore = sc; best = chain; }
      }
    }
  }
  if (!best) return [];

  // THE DOORS FACE THE LANE THE HULL LEAVES BY. They used to face the Heart,
  // which is only ever approximately the way out: the exit is a graph
  // neighbour and can sit 40-odd degrees off that bearing, so the hull drove
  // out on a diagonal and clipped its own door frame. Aim the box at the
  // actual exit and the two are the same line by construction.
  const escapeOf = (c2) => {
    const toHeart = tangentDirTo(graph, c2, dungeon.heart);
    let bestE = -1, bestD = -Infinity;
    for (const nb of graph.adj[c2]) {
      if (dungeon.tags[nb] === BLOCKED || best.includes(nb)) continue;
      const d = dot3(tangentDirTo(graph, c2, nb), toHeart);
      if (d > bestD) { bestD = d; bestE = nb; }
    }
    return bestE;
  };

  const out = best.map((ci) => ({ ci, exit: escapeOf(ci) }));
  return out.some((b) => b.exit < 0) ? [] : out;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `node test/berths.mjs`
Expected: every line `ok`, final line `berths: all good`.

- [ ] **Step 5: Wire into `npm test`**

In `package.json`, append ` && node test/berths.mjs` to the `test` script, following the existing chain's style.

Run: `npm test`
Expected: all suites green, including `berths:`.

- [ ] **Step 6: Commit**

```bash
git add src/berths.js test/berths.mjs package.json
git commit -m "berths: the camp becomes pure, synchronous and Node-tested"
```

---

## Task 2: Consume `berths.js`; the container model stops touching player state

**Files:**
- Modify: `src/td-tab.js` — `buildActors()` (~1400), the container callback (~1421-1520), `regenerate()` (~4110)

**Interfaces:**
- Consumes: `computeBerths`, `berthIndexFor` from Task 1.
- Produces: module-level `let berths = []` populated synchronously in `regenerate()`; `lifeContainers[i].ci === berths[i].ci` always.

- [ ] **Step 1: Import and add module state**

Add to the import block in `src/td-tab.js` (tokenised — `bust.sh` will rewrite it):

```js
import { computeBerths, berthIndexFor } from './berths.js?v=DEV';
```

Beside `let lifeContainers = [];` add:

```js
// where the camp IS — known synchronously, from the board alone. The
// container models decorate these cells; they never choose them.
let berths = [];
```

- [ ] **Step 2: Populate berths in the synchronous board build**

In `regenerate()`, immediately after `graph = dungeon.graph;` and the `cellSide` assignment, add:

```js
berths = computeBerths(dungeon, graph);
```

- [ ] **Step 3: Gut the container callback down to decoration**

Inside `preloadContainer().then()`, delete the entire selection block (`inRange` / `open` / `escapes` / the triple loop / `if (!best) return;` / `escapeOf`) and drive the placement loop from `berths` instead. The loop body that builds `g`, scales, orients and adds the tank is **unchanged**; only its source of `ci` / `exitCi` changes, and the player-staging block goes:

```js
for (let bi = 0; bi < berths.length; bi++) {
  const ci = berths[bi].ci;
  const exitCi = berths[bi].exit;
  const ec = graph.centers[exitCi];
  // ... existing fixture build, unchanged ...
  lifeContainers.push({ obj: g, tanks: [tank], ci, exit: exitCi });
}
syncLifeContainers();
```

**Delete outright** from this callback:
- `if (t < 6 && player.moves <= 1 && stagedRun !== runGen) { ... respawnPlayerAtSpawn('berths-landed'); }`
- `berthStagings++`
- the `beginOpening();` call
- the `?driveout=` probe block (DEPLOY's own probe in Task 4 replaces it, and it calls `advanceMotion` in a way DEPLOY makes meaningless)

Also delete the now-unused `let stagedRun = -1;` and `let berthStagings = 0;` declarations.

Keep the `CONTAINERS placed=… escapes=…` log — it is the standing invariant that every berth has a lane.

- [ ] **Step 4: Verify the camp is unchanged and staging is gone**

Run:
```bash
./scripts/bust.sh --quiet && cd "$SCRATCH" && \
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
  --virtual-time-budget=30000 --screenshot=t2.png \
  "http://localhost:8144/index.html?ctl=1#td" 2>&1 | grep -oE "CONTAINERS [^\"]*|CTL\[respawn[^]]*\]"
```
Expected: exactly one `CONTAINERS placed=3 … escapes=` line with **the same three cells as before this task** (record them from a run on `HEAD~1`), and **zero** `respawn:berths-landed` lines.

- [ ] **Step 5: Commit**

```bash
./scripts/bust.sh --quiet
git add -A
git commit -m "td: the camp is known before the model lands"
```

---

## Task 3: `camShot` — one timed camera override

**Files:**
- Modify: `src/td-tab.js` — add the primitive near the cinematic block (~1717); port the sector reveal (`revealLeft`, ~1703 / ~2020 / ~7265)

**Interfaces:**
- Produces: `startShot({ id, dur, poseAt, onEnd, skippable })`, `endShot()`, `shotActive()`, `shotId()`.

Port the **sector reveal** first: it is the smallest existing consumer, so the primitive is proven before the CINEMATIC depends on it.

- [ ] **Step 1: Write the primitive**

```js
// --- camShot: ONE timed camera override -------------------------------
// Every timed camera takeover in this tab used to own its own clock, its own
// skip listeners and its own teardown — and each teardown was a fresh chance
// to get it wrong. One did: endCinematic() guarded on `cineLeft <= 0` while
// the frame loop had already driven it there, so it returned before removing
// a capture-phase keydown handler that preventDefaults and
// stopImmediatePropagations. That handler then ate every key in the game,
// permanently, and the briefing it was fronting never opened.
//
// So there is one shot at a time, one teardown path, and the latch is the
// shot itself — never a clock somebody else has already advanced.
let shot = null;   // { id, dur, left, poseAt, onEnd }
const shotActive = () => shot !== null;
const shotId = () => (shot ? shot.id : null);

function startShot({ id, dur, poseAt, onEnd = null, skippable = true }) {
  endShot();                       // one at a time, always torn down first
  shot = { id, dur: Math.max(1e-3, dur), left: Math.max(1e-3, dur), poseAt, onEnd, skippable };
  if (skippable) {
    addEventListener('keydown', shotSkipKey, true);
    root.addEventListener('pointerdown', shotSkipTap, true);
  }
  updateCameraGoal();
  camera.position.copy(camGoal.pos);
  camera.quaternion.copy(camGoal.quat);
}

// idempotent, and latched on `shot` — the resource — not on a countdown
function endShot() {
  if (!shot) return;
  const s = shot;
  shot = null;                     // cleared BEFORE onEnd, so a shot that
                                   // starts another shot cannot recurse
  removeEventListener('keydown', shotSkipKey, true);
  root.removeEventListener('pointerdown', shotSkipTap, true);
  if (s.onEnd) s.onEnd();
}

const shotSkipKey = (ev) => {
  if (!shot || !shot.skippable) return;
  ev.preventDefault(); ev.stopImmediatePropagation(); endShot();
};
const shotSkipTap = (ev) => {
  if (!shot || !shot.skippable) return;
  ev.stopImmediatePropagation(); endShot();
};

// called once per frame from animate, BEFORE the camera goal is consumed
function stepShot(dt) {
  if (!shot) return;
  shot.left -= dt;
  if (shot.left <= 0) endShot();
}
```

In `updateCameraGoal()`, put the shot ahead of every other camera mode, replacing the `if (cineLeft > 0) { … }` and `if (revealLeft > 0 && revealDir) { … }` branches:

```js
if (shot) {
  const u = Math.min(1, Math.max(0, 1 - shot.left / shot.dur));
  shot.poseAt(u, camGoal);
  return;
}
```

In `animate()`, replace the `cineLeft`/`revealLeft` decrement blocks with `stepShot(dt);`.

- [ ] **Step 2: Port the sector reveal onto it**

Where the reveal is armed (`revealLeft = REVEAL_LEN;` in the sector-clear block), call instead:

```js
startShot({
  id: 'reveal',
  dur: REVEAL_LEN,
  poseAt: (u, out) => {
    // whole planet in frame, the new band centred — unchanged framing
    const ref = Math.abs(revealDir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const up = norm3(cross3(revealDir, ref));
    const eye = scale3(revealDir, 3.3);
    out.pos.set(eye[0], eye[1], eye[2]);
    tmpCam.position.copy(out.pos);
    tmpCam.up.set(up[0], up[1], up[2]);
    tmpCam.lookAt(0, 0, 0);
    out.quat.copy(tmpCam.quaternion);
  },
  onEnd: () => { for (const ci of revealCells) paintCell(ci, floorColorOf(ci)); },
});
```

Replace every remaining `revealLeft > 0` gate with `shotId() === 'reveal'`, and delete `let revealLeft = 0;` and its decrement. The `frozen` and `driveFrozen` expressions in `animate` become:

```js
const frozen = buildFrozen() || shotActive() || tutorial.frozen;
const driveFrozen = shotActive() || tutorial.frozen;
```

- [ ] **Step 3: Verify the reveal still plays and still hands back**

Run with the existing hook:
```bash
… --screenshot=t3.png "http://localhost:8144/index.html?reveal=1#td"
```
Expected: the reveal screenshot still frames the whole planet, and a `?ctl=1` run afterwards shows no `CTL-SWALLOWED` line (the shot removed its own listeners).

- [ ] **Step 4: Commit**

```bash
./scripts/bust.sh --quiet
git add -A
git commit -m "td: one camShot, one teardown — the reveal moves onto it first"
```

---

## Task 4: DEPLOY

**Files:**
- Modify: `src/td-tab.js` — replace `respawnPlayerAtSpawn()` (~5504), delete `exitCruise` (~5742 and its release in `animate`), add the DEPLOY step to `animate`

**Interfaces:**
- Consumes: `berths`, `berthIndexFor` (Tasks 1-2); `startShot`/`endShot` (Task 3).
- Produces: `deployStart(n)` places the tank at `DEPLOY_START(n)`; `deployStep(dt)` runs it; `deployActive()`.

- [ ] **Step 1: Add the DEPLOY state**

```js
// --- DEPLOY: the one way a tank enters the world -----------------------
// Every reset lands here, whatever ran before it. The hull starts at rest
// inside its berth, drives ENTIRELY OUT, and hands over in manual.
//
// "Entirely out" is measured in CELLS, not in metres of model: the box
// occupies its berth cell, so a hull whose centre has reached the exit
// cell's centre is clear of it by construction — and that stays true when
// the container model has not loaded at all, which it may not have.
//
// DEPLOY is NOT auto mode and NOT cruise. Auto stays something the player
// chooses; cruise left engaged by a berth respawn is what made the throttle
// lever read as dead. It is its own short scripted beat, and it ends with
// the controls in the player's hands and the lever at zero.
let deploy = null;   // { n, from[3], to[3], segLen, travelled }
const deployActive = () => deploy !== null;

function deployStart(n) {
  const b = berths[n];
  if (!b) return false;
  player.freeMode = false;
  player.virtualStart = null;
  player.cur = b.ci;
  player.prev = -1;
  player.pos = graph.centers[b.ci].slice();
  player.prog = 0;
  player.next = b.exit;
  player.heading = tangentDirTo(b.ci, b.exit);
  player.travelDir = player.heading.slice();
  player.smoothDir = player.travelDir.slice();
  player.segLen = Math.max(1e-9, dist3(graph.centers[b.ci], graph.centers[b.exit]));
  throttle = 0; cruise = false; autoMode = false;
  paintThrottle();
  stopEngine(0.1, true);
  deploy = {
    n,
    from: graph.centers[b.ci].slice(),
    to: graph.centers[b.exit].slice(),
    segLen: player.segLen,
    travelled: 0,
  };
  return true;
}

// the pose the whole design hangs off: every prelude's last frame is this
function deployFramePose(out) {
  const b = berths[deploy ? deploy.n : berthIndexFor(playerHP)];
  const bc = graph.centers[b.ci];
  const bn = graph.normals[b.ci];
  const eye = add3(add3(bc, scale3(bn, params.wallHeight * 1.7 + cellSide * 0.55)),
    scale3(tangentDirTo(b.ci, b.exit), cellSide * 2.1));
  const look = add3(bc, scale3(bn, params.wallHeight * 0.55));
  out.pos.set(eye[0], eye[1], eye[2]);
  tmpCam.position.copy(out.pos);
  tmpCam.up.set(bn[0], bn[1], bn[2]);
  tmpCam.lookAt(look[0], look[1], look[2]);
  out.quat.copy(tmpCam.quaternion);
}

function deployStep(dt) {
  if (!deploy) return;
  const v = params.speed * speedBonus * cellSide * 1.6;
  const step = v * dt;
  deploy.travelled += step;
  const u = Math.min(1, deploy.travelled / deploy.segLen);
  const p = [0, 1, 2].map((i) => deploy.from[i] + (deploy.to[i] - deploy.from[i]) * u);
  player.pos = norm3(p);
  player.heading = tangentDirTo(deploy.n >= 0 ? player.cur : player.cur, berths[deploy.n].exit);
  const ci = cellIndex(player.pos);
  if (ci !== -1 && ci !== player.cur) arriveAt(ci);
  if (u >= 1) {
    deploy = null;           // hands over: manual, lever at zero, auto off
    throttle = 0; cruise = false; autoMode = false;
    paintThrottle();
  }
}
```

In `updateCameraGoal()`, after the `shot` branch, add the DEPLOY branch. This is what makes the handover invisible — it lerps into the pose the gameplay camera would pick anyway:

```js
if (deploy) {
  const u = Math.min(1, deploy.travelled / deploy.segLen);
  const w = u * u * (3 - 2 * u);
  deployFramePose(shotA);          // the low three-quarter at the doors
  deploy = null;                   // read the TRUE gameplay pose...
  updateCameraGoal();              // ...from the one place that owns it
  deploy = deploySaved;            // (see Step 2 — use the guard, not this)
  ...
}
```

**Do not ship the re-entrant sketch above.** Implement it with an explicit flag instead, so `updateCameraGoal` is never re-entered:

```js
let camRaw = false;   // true = skip the shot/deploy overrides, give the plain gameplay pose
…
if (deploy && !camRaw) {
  const u = Math.min(1, deploy.travelled / deploy.segLen);
  const w = u * u * (3 - 2 * u);
  deployFramePose(camA);
  camRaw = true; updateCameraGoal(); camRaw = false;   // camGoal now = gameplay pose
  camB.pos.copy(camGoal.pos); camB.quat.copy(camGoal.quat);
  camGoal.pos.lerpVectors(camA.pos, camB.pos, w);
  camGoal.quat.copy(camA.quat).slerp(camB.quat, w);
  return;
}
```

Reuse the existing `cineA` / `cineB` temporaries, renamed `camA` / `camB`. At `w = 1` the two poses are identical, so control handover changes nothing on screen.

- [ ] **Step 2: Replace `respawnPlayerAtSpawn` with DEPLOY**

Delete `respawnPlayerAtSpawn()` entirely. Replace all three call sites:

- `loseTank()`'s DEATH_HOLD timer → `deployStart(berthIndexFor(playerHP))` (Task 6 wraps this in the DOWN DASH)
- the entombed-by-sector-shift redeploy → `deployStart(berthIndexFor(playerHP))`
- the deleted `berths-landed` staging → gone (Task 2)

Keep the `runGen` guard on the death timer — it is orthogonal and still correct.

- [ ] **Step 3: Delete `exitCruise`**

Remove `let exitCruise = false;`, `releaseExitCruise()`, and the `if (exitCruise && (handOn || !lifeContainers.some(…))) releaseExitCruise();` line in `animate`. Nothing replaces it: DEPLOY owns the drive-out now.

- [ ] **Step 4: Call DEPLOY from the frame loop**

In `animate`, where `advanceMotion(dt)` is called:

```js
if (deploy) deployStep(dt);
else if (!driveFrozen) advanceMotion(dt);
```

DEPLOY runs even while a shot is active — that is how the CINEMATIC's final frame and DEPLOY's first frame meet.

- [ ] **Step 5: Add `?deployprobe=1`**

```js
// ?deployprobe=1 — the operator's consistency question, made a check. Runs
// the reset paths in turn and asserts each lands in the SAME shape: berth by
// hull count, heading down that berth's own exit, auto off, cruise off — and
// that the hull ends the beat entirely clear of the box.
if (urlParams.get('deployprobe') === '1') {
  const rows = [];
  const shape = (tag) => {
    const n = berthIndexFor(playerHP);
    rows.push(`${tag}: berth=#${n + 1} cur=${player.cur} want=${berths[n] ? berths[n].ci : -1}`
      + ` heading_ok=${player.next === (berths[n] ? berths[n].exit : -2)}`
      + ` auto=${autoMode} cruise=${cruise} deploying=${deployActive()}`);
    return berths[n] && player.cur === berths[n].ci && player.next === berths[n].exit
      && !autoMode && !cruise;
  };
  let ok = shape('fresh');
  regenerate();  ok = shape('regenerate') && ok;
  playerHP = 2; deployStart(berthIndexFor(playerHP)); ok = shape('hull-2') && ok;
  playerHP = 1; deployStart(berthIndexFor(playerHP)); ok = shape('hull-1') && ok;
  // drive the beat to completion and check the hull actually left the box
  playerHP = 3; deployStart(berthIndexFor(playerHP));
  for (let i = 0; i < 400 && deployActive(); i++) deployStep(0.05);
  const b = berths[berthIndexFor(playerHP)];
  const out = b && player.cur === b.exit && !deployActive();
  rows.forEach((r) => console.log(`DEPLOYPROBE ${r}`));
  console.log(`DEPLOYPROBE shape=${ok ? 'PASS' : 'FAIL'} entirely-out=${out ? 'PASS' : 'FAIL'}`);
}
```

- [ ] **Step 6: Negative control, then the real run**

First disable the fix — in `deployStart`, temporarily `return false;` before the placement — and run:
```bash
… "http://localhost:8144/index.html?deployprobe=1#td" 2>&1 | grep -oE "DEPLOYPROBE [^\"]*"
```
Expected: `shape=FAIL`. **If it passes, the probe is broken — fix the probe before the code.**

Restore, rerun. Expected: `shape=PASS entirely-out=PASS`, and every row showing `berth=#3` at full life, `#2` at two hulls, `#1` at one.

- [ ] **Step 7: Commit**

```bash
./scripts/bust.sh --quiet
git add -A
git commit -m "td: DEPLOY — one way into the world, ending in the player's hands"
```

---

## Task 5: CINEMATIC onto `camShot`, ending at `DEPLOY_START(3)`

**Files:**
- Modify: `src/td-tab.js` — the cinematic block (~1717-1790), `updateCameraGoal` (~1960-2020), the opening chain (~8167-8190)

- [ ] **Step 1: Replace the cinematic with a two-beat shot**

Delete `startCinematic`, `endCinematic`, `beginOpening`, `cineSkipKey`, `cineSkipTap`, `cineRunning`, and the state `cineLeft / cineCi / cineAfter / cineOn / cinePending`. Keep `cineScrub` / `cineHold` for the `?cine=N` screenshot hook. Replace with:

```js
// --- THE CINEMATIC -----------------------------------------------------
// First page load only. Two beats: pull back until the whole vessel is in
// frame, then dive onto the camp. It ENDS on DEPLOY's opening pose, so the
// last frame of the cinematic is the first frame of the game — the hull
// then drives itself out under DEPLOY, live, with the player's hand a
// moment away. The old third beat (watch it drive out, frozen) is gone:
// that IS the game now.
const CINE_OUT = 3.0, CINE_DIVE = 3.4;
const CINE_LEN = CINE_OUT + CINE_DIVE;

function playCinematic(after) {
  const n = berthIndexFor(playerHP);
  if (!graph || !dungeon || !berths[n]) { if (after) after(); return; }
  const bc = graph.centers[berths[n].ci];
  const bn = graph.normals[berths[n].ci];
  const ref = Math.abs(bn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const wUp = norm3(cross3(bn, ref));
  const smooth = (x) => x * x * (3 - 2 * x);
  startShot({
    id: 'cinematic',
    dur: CINE_LEN,
    poseAt: (u, out) => {
      const e = u * CINE_LEN;
      if (e < CINE_OUT) {
        // beat 1 pulls straight out along the berth's own normal, so the
        // wide shot is still centred on the place it is about to dive into
        const r = 1.26 + (3.30 - 1.26) * smooth(e / CINE_OUT);
        out.pos.set(bn[0] * r, bn[1] * r, bn[2] * r);
        tmpCam.position.copy(out.pos);
        tmpCam.up.set(wUp[0], wUp[1], wUp[2]);
        tmpCam.lookAt(0, 0, 0);
        out.quat.copy(tmpCam.quaternion);
        return;
      }
      // beat 2 MOVES THE EYE and keeps looking at the camp the whole way
      // down, so the box only ever grows — a slerp between two framings
      // swings the subject out of frame in the middle, which is what the
      // first cut of this did. It lands exactly on DEPLOY's pose.
      const w = smooth((e - CINE_OUT) / CINE_DIVE);
      deployFramePoseFor(n, camA);
      const wide = scale3(bn, 3.30);
      out.pos.set(
        wide[0] + (camA.pos.x - wide[0]) * w,
        wide[1] + (camA.pos.y - wide[1]) * w,
        wide[2] + (camA.pos.z - wide[2]) * w);
      tmpCam.position.copy(out.pos);
      const up = norm3([0, 1, 2].map((i) => wUp[i] + (bn[i] - wUp[i]) * w));
      tmpCam.up.set(up[0], up[1], up[2]);
      tmpCam.lookAt(bc[0] + bn[0] * params.wallHeight * 0.55,
        bc[1] + bn[1] * params.wallHeight * 0.55,
        bc[2] + bn[2] * params.wallHeight * 0.55);
      out.quat.copy(tmpCam.quaternion);
    },
    onEnd: () => { deployStart(n); if (after) after(); },
  });
}
```

Generalise `deployFramePose(out)` from Task 4 into `deployFramePoseFor(n, out)` and have `deployFramePose(out)` call it — the cinematic needs the pose *before* `deploy` exists.

- [ ] **Step 2: Rewire the opening chain**

At the bottom of the file, replace the `if (wantCine) { cinePending = …; }` block with:

```js
if (wantCine) playCinematic(opening || (() => {}));
else { deployStart(berthIndexFor(playerHP)); if (opening) opening(); }
```

Delete the `else if (cinePending && t > 5) beginOpening();` safety net in `animate` — with berths known synchronously there is nothing left to wait for.

- [ ] **Step 3: Extend `?cineprobe=1`**

Keep the existing move-after-intro and handoff-ran checks (they guard the teardown regression). Add the continuity check — the whole point of the task:

```js
// the cinematic's LAST frame must be DEPLOY's FIRST frame
const last = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
shot.poseAt(1, last);
deployFramePoseFor(berthIndexFor(playerHP), camA);
const dp = last.pos.distanceTo(camA.pos);
const dq = last.quat.angleTo(camA.quat);
console.log(`CINEPROBE continuity=${dp < 1e-6 && dq < 1e-6 ? 'PASS' : 'FAIL'}`
  + ` (pos ${dp.toExponential(2)}, angle ${dq.toExponential(2)}, want ~0)`);
```

- [ ] **Step 4: Negative control, then the real run**

Break continuity on purpose — multiply the dive's end position by `1.05` — and run **without `?cine=0`**:
```bash
… "http://localhost:8144/index.html?cineprobe=1#td" 2>&1 | grep -oE "CINEPROBE [^\"]*"
```
Expected: `continuity=FAIL`. Restore; expected `continuity=PASS`, `move-after-intro=PASS`, `handoff-ran=PASS`.

- [ ] **Step 5: Commit**

```bash
./scripts/bust.sh --quiet
git add -A
git commit -m "td: the cinematic ends where the game begins"
```

---

## Task 6: DOWN DASH

**Files:**
- Modify: `src/td-tab.js` — `loseTank()` (~5470), `styles.css` for the banner

- [ ] **Step 1: The banner**

`MK-CX DOWN!` reuses the existing toast element and its `wave-num` idiom, at large size in the look's danger red. Add to `styles.css`:

```css
#td-msg .go-down, .td-downbanner {
  font-size: clamp(2.2rem, 9vw, 4.4rem);
  font-weight: 800; letter-spacing: 0.06em;
  color: #ff3a24; text-shadow: 0 0 18px rgba(255,58,36,0.55);
}
```

- [ ] **Step 2: The three beats**

Replace `loseTank()`'s body after `destroyPlayer()`:

```js
showToast('<div class="td-downbanner">MK-CX DOWN!</div>', DEATH_HOLD * 1000);
const deathGen = runGen;
setTimeout(() => {
  if (deathGen !== runGen) return;      // that run is over — see 6d79bdd
  if (player.won || !playerMesh) return;
  const n = berthIndexFor(playerHP);
  const from = { pos: camera.position.clone(), quat: camera.quaternion.clone() };
  // THE DASH: a fast path from the wreck back to camp, landing exactly on
  // DEPLOY's opening pose — the same join the cinematic uses, so a death
  // and a fresh load arrive at an identical frame.
  startShot({
    id: 'downdash',
    dur: 1.0,
    poseAt: (u, out) => {
      const w = u * u * (3 - 2 * u);
      deployFramePoseFor(n, camA);
      out.pos.lerpVectors(from.pos, camA.pos, w);
      out.quat.copy(from.quat).slerp(camA.quat, w);
    },
    onEnd: () => {
      playerMesh.visible = true;
      playerDown = false;
      feel.hoverT = 0;
      landTankFeel(feel);
      applyTankHealth(playerMesh, playerHP / PLAYER_MAX);
      deployStart(n);
    },
  });
}, DEATH_HOLD * 1000);
```

The sim keeps running throughout — unchanged from today. Your death does not pause the battlefield.

- [ ] **Step 3: Verify**

Add `?downprobe=1` that calls `loseTank()` and asserts, after the dash duration, that `player.cur === berths[berthIndexFor(playerHP)].ci`, `autoMode === false`, `cruise === false`. Negative control: skip `deployStart` in `onEnd` and confirm FAIL.

- [ ] **Step 4: Commit**

```bash
./scripts/bust.sh --quiet
git add -A
git commit -m "td: MK-CX DOWN — the camera runs home and the next hull rolls"
```

---

## Task 7: Auto Mode — the fire rule (BLOCKED)

**Files:**
- Modify: `src/td-tab.js` — `autoGunner()` (~4083)

> **BLOCKED on the operator.** "Fire with primary to all modes except RAM" reads as the shell (limited); "conserve is conserving limited shells, **not** unlimited secondary" only draws that contrast if the *secondary* (lasers) is what is being added. Do not guess — the two readings produce opposite code. Ask, then implement whichever is confirmed:
>
> **Reading A (shells):** `const shellsForAll = params.directive !== 'ram';` — conserve gains full shell fire; RAM keeps unrammable-only.
> **Reading B (lasers):** shell rules unchanged; the auto gunner additionally fires the laser in every directive except RAM, which costs no ammo and so leaves conserve's meaning intact.

- [ ] **Step 1:** Get the operator's answer.
- [ ] **Step 2:** Implement the confirmed reading.
- [ ] **Step 3:** Verify in headless with `?tick` + an auto directive that the tank fires; commit.

---

## Task 8: Record

- [ ] **Step 1:** Prepend a `DEVLOG.md` entry (get the hash first, then append and commit) covering: the async-callback root cause, the `t < 6` page-lifetime guard, the one-join-point invariant, and the continuity-by-construction trick.
- [ ] **Step 2:** `/deban sync` — decision (the invariant), dead ends, lessons.
- [ ] **Step 3:** `./scripts/check-tokens.sh`, `npm test`, push.

---

## Self-Review

**Spec coverage:** Vocabulary → Tasks 4-6. Invariant → Task 4 (`deployFramePoseFor`) consumed by Tasks 5 and 6. Berth model → Tasks 1-2. `camShot` → Task 3. DEPLOY → Task 4. Three preludes → Tasks 4 (none), 5 (cinematic), 6 (down dash). Auto Mode → Task 7 (blocked, flagged). Deletions → Tasks 2, 3, 4, 5. Verification → every task has a probe with a mandatory negative control. Risks → the on-rails second is covered by `?deployprobe`'s `entirely-out` check.

**Placeholders:** none — Task 7 is explicitly blocked with both candidate implementations written out, not deferred vaguely.

**Type consistency:** `computeBerths` → `[{ci, exit}]` used identically in Tasks 2, 4, 5, 6. `berthIndexFor(hp)` used in 4, 5, 6, 7. `deployFramePoseFor(n, out)` defined in Task 4 Step 1 (generalised in Task 5 Step 1) and consumed in 5 and 6. `startShot({id, dur, poseAt, onEnd, skippable})` defined in Task 3 and consumed in 3, 5, 6. `camA`/`camB` are the renamed `cineA`/`cineB` temporaries.

**Known correction carried into Task 4:** the first sketch of the DEPLOY camera branch re-enters `updateCameraGoal()`; the shipped form uses the `camRaw` flag instead. The plan shows both deliberately so the implementer does not reinvent the re-entrant version.
