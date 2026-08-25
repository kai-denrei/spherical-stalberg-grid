# TD Tutorial + Tower-Unlock Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A scripted first-run TD tutorial (protect the heart → ram fodder → pick up shells → kill the portal → build towers) plus a lasting by-round tower-unlock ladder.

**Architecture:** The unlock ladder is a pure, Node-tested function in `towers.js`; `openShop` in `td-tab.js` filters through it. The tutorial is an inline state machine in `td-tab.js` driven from the animation loop, gating the normal wave clock and heart damage while active. Spec: `docs/superpowers/specs/2026-08-25-td-tutorial-and-tower-unlocks-design.md`.

**Tech Stack:** Vanilla ES modules, `towers.js` (pure), `td-tab.js` (the TD tab closure), plain-Node tests (`test/tdcore.mjs`), three.js render layer, localStorage.

## Global Constraints

- After editing any `src/*.js`, `index.html`, or `styles.css`: run `./scripts/bust.sh --quiet`. Commit ALL its output atomically (`git add -A`) — the pre-push guard (`scripts/check-tokens.sh` via `.githooks/pre-push`) blocks split tokens. NEVER token `../vendor/` imports.
- `npm test` must stay green; the ladder adds assertions to `test/tdcore.mjs`.
- No `Math.random` in game logic; the tutorial's scripted spawns reuse the seeded `whim`/`orbRng` streams already in `td-tab.js`.
- Unlock schedule (verbatim), by round, cheap→capstone: **R1** `single`,`rapid` · **R2** `spread`,`slow` · **R3** `homing`,`aoe` · **R4** `sniper` · **R5** `laser`.
- Trigger: tutorial ALWAYS starts a fresh TD game unless `?tutorial=0`; once `localStorage['td.tutorialSeen']` is set, the opening banner shows a SKIP button. Completing OR skipping sets the flag. `?tutorial=1` forces it on.
- Failure-proof: the heart takes no damage while `tutorialActive`.
- Headless: Chrome `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr` (console lines need the logging flag). Serve on :8144.
- Commits: explain the why; end with the repo's Co-Authored-By + Claude-Session trailer. DEVLOG + HOW-IT-WORKS entries in the final task.

## Verified TD hook points (read these anchors before wiring)

- `round` — `td-tab.js:196` (`let round = 1`). `introCount()` at ~206.
- `spawnWave()` — `td-tab.js:1914`; enemy push shape at `1943-1951`; portal push shape `spawnPoints.push({ type, ci, hp: 3, obj, alive: true, found: false, mapMarker })` at `1910` inside `addSpawnPoint()` (`1882`).
- Player init block — `td-tab.js:1745-1763` (inside `regenerate()` at `1654`).
- `spawnOneOrb()` / `spawnOrbs()` / `absorbOrb()` / `checkAbsorb()` — `td-tab.js:272-347`.
- `buildPortalObj(type, ci, phase)` — `td-tab.js:2959`; `recomputePortalDist()` — `td-tab.js:3005`.
- `placeError(ci)` (null = legal) — `td-tab.js:2618`. `paintCell(ci, rgb)` — `td-tab.js:687`. `floorColorOf(ci)` — `td-tab.js:499`. `pulseHint` restore pattern — `td-tab.js:1382`.
- `openShop(ci, sx, sy)` items array — `td-tab.js:3064`; shop click uses `el.dataset.key` — `td-tab.js:3084`.
- Wave-clock block (gate this) — `td-tab.js:3292-3299`. Heart damage `heartHP -= dmg` — `td-tab.js:2532`.
- `announceWave` banner uses `waveEl` (`#td-wave`) — `td-tab.js:1628`. Init `showBriefing()` unless `debugging` — `td-tab.js:3542-3544`.

---

### Task 1: Tower-unlock ladder (pure, in towers.js)

**Files:**
- Modify: `src/towers.js` (append exports)
- Modify: `test/tdcore.mjs` (append assertions; extend the import)

**Interfaces:**
- Consumes: `TOWERS` (existing, keys: single, rapid, spread, homing, slow, aoe, sniper, laser).
- Produces: `TOWER_UNLOCKS` (array of `{round, keys}`), `unlockedTowerKeys(round) -> string[]` (cumulative, cheap→capstone order, clamps round≥1, ≥5 = all), `towerUnlockRound(key) -> number`.

- [ ] **Step 1: Write the failing test**

Append to `test/tdcore.mjs` (add `unlockedTowerKeys, towerUnlockRound, TOWER_UNLOCKS` to the existing `from '../src/towers.js'` import):

```js
// --- tower-unlock ladder -------------------------------------------------
console.log('tower unlocks:');
check('R1 is exactly single + rapid',
  JSON.stringify(unlockedTowerKeys(1)) === JSON.stringify(['single', 'rapid']));
check('round clamps below 1 to R1',
  JSON.stringify(unlockedTowerKeys(0)) === JSON.stringify(['single', 'rapid'])
  && JSON.stringify(unlockedTowerKeys(-3)) === JSON.stringify(['single', 'rapid']));
check('set grows monotonically each round', (() => {
  for (let r = 2; r <= 6; r++) {
    const prev = unlockedTowerKeys(r - 1), cur = unlockedTowerKeys(r);
    if (cur.length < prev.length) return false;
    if (!prev.every((k) => cur.includes(k))) return false; // never loses a tower
  }
  return true;
})());
check('all 8 towers unlocked by R5',
  unlockedTowerKeys(5).length === 8 && unlockedTowerKeys(99).length === 8);
check('every unlocked key is a real tower',
  unlockedTowerKeys(5).every((k) => TOWER_BY_KEY[k]));
check('laser unlocks last (R5), single/rapid first (R1)',
  towerUnlockRound('laser') === 5 && towerUnlockRound('single') === 1 && towerUnlockRound('rapid') === 1);
check('every tower appears in the schedule exactly once',
  TOWERS.every((t) => towerUnlockRound(t.key) >= 1)
  && TOWER_UNLOCKS.reduce((n, u) => n + u.keys.length, 0) === TOWERS.length);
check('schedule matches spec (R2 spread+slow, R3 homing+aoe, R4 sniper)',
  towerUnlockRound('spread') === 2 && towerUnlockRound('slow') === 2
  && towerUnlockRound('homing') === 3 && towerUnlockRound('aoe') === 3
  && towerUnlockRound('sniper') === 4);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/tdcore.mjs`
Expected: FAIL — `unlockedTowerKeys is not defined` (or an import error).

- [ ] **Step 3: Write the implementation**

Append to `src/towers.js`:

```js
// --- progressive unlock ladder -------------------------------------------
// Towers unlock by ROUND (sector). Cheap → capstone; the laser is earned.
// Cumulative: reaching a round keeps everything from earlier rounds.
export const TOWER_UNLOCKS = [
  { round: 1, keys: ['single', 'rapid'] },
  { round: 2, keys: ['spread', 'slow'] },
  { round: 3, keys: ['homing', 'aoe'] },
  { round: 4, keys: ['sniper'] },
  { round: 5, keys: ['laser'] },
];

export function unlockedTowerKeys(round) {
  const r = Math.max(1, Math.floor(round) || 1);
  const out = [];
  for (const u of TOWER_UNLOCKS) {
    if (u.round <= r) out.push(...u.keys);
  }
  return out;
}

const UNLOCK_ROUND = Object.fromEntries(
  TOWER_UNLOCKS.flatMap((u) => u.keys.map((k) => [k, u.round])));

export function towerUnlockRound(key) {
  return UNLOCK_ROUND[key] ?? 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/tdcore.mjs` — all `ok`, ends `td-core invariants hold`.
Run: `npm test` — green.

- [ ] **Step 5: Commit**

```bash
git add src/towers.js test/tdcore.mjs
git commit -m "td: tower-unlock ladder — pure unlockedTowerKeys(round) by sector"
```

---

### Task 2: Gate the shop by the ladder (dimmed locked towers)

**Files:**
- Modify: `src/td-tab.js` (import from towers.js; the `openShop` items array + the shop click guard)
- Modify: `styles.css` (a `.radial-item.locked` dim style)

**Interfaces:**
- Consumes: `unlockedTowerKeys`, `towerUnlockRound` from `./towers.js`; `round` (`td-tab.js:196`).
- Produces: the shop shows only-unlocked as buyable; locked towers dimmed with "R{n}" and disabled.

- [ ] **Step 1: Import the ladder**

In `src/td-tab.js`, find the existing towers import (it imports `TOWERS, TOWER_BY_KEY, upgradeCost, effectiveStats, …`). Add `unlockedTowerKeys, towerUnlockRound` to that import list.

- [ ] **Step 2: Gate the shop items**

In `openShop` (`td-tab.js:3064`), replace the `items = TOWERS.map((def) => ({ … }))` block (the else-branch, new-placement case) with:

```js
      const err = placeError(ci);
      center = `<div class="radial-center">${err ? 'blocked' : eco.credit + 'c'}</div>`;
      const unlocked = new Set(unlockedTowerKeys(round));
      items = TOWERS.map((def) => {
        const locked = !unlocked.has(def.key);
        return {
          cls: locked ? 'shop-buy locked' : 'shop-buy',
          key: def.key,
          txt: locked ? `${def.key}<br>R${towerUnlockRound(def.key)}` : `${def.key}<br>${def.cost}c`,
          dis: locked || !!err || !eco.canAfford(def.cost),
          bc: '#' + def.color.toString(16).padStart(6, '0'),
        };
      });
      items.push({ cls: 'shop-close', txt: '×' });
```

Then update the shop-centre note text: after the `.map(...).join('')` line that appends `<div class="shop-note" ...></div>`, set its text to `more unlock as you expand`. Change that trailing template to:

```js
    }).join('') + `<div class="shop-note" style="top:${R + 44}px">more unlock as you expand</div>`;
```

(A locked item already carries `disabled` via `it.dis`, so the click handler's `placeTower` never fires for it — but harden it anyway in the next step.)

- [ ] **Step 3: Harden the click guard**

In the `shopEl.addEventListener('click', …)` handler (`td-tab.js:3084`), the `shop-buy` branch calls `placeTower(el.dataset.key, shopCi)`. Guard it against locked keys so a stray click can't place a locked tower:

```js
    if (el.classList.contains('shop-buy') && shopCi !== -1) {
      if (el.classList.contains('locked') || el.hasAttribute('disabled')) return;
      if (placeTower(el.dataset.key, shopCi)) closeShop();
    } else if (el.classList.contains('shop-up') && tower) {
```

- [ ] **Step 4: Dim style for locked items**

Append to `styles.css` near the `#td-shop .radial-item` rules:

```css
#td-shop .radial-item.locked {
  opacity: 0.4;
  filter: grayscale(0.6);
  border-color: rgba(120, 150, 210, 0.3) !important;
  cursor: not-allowed;
}
```

- [ ] **Step 5: Bust, test, headless-verify the gated shop**

```bash
./scripts/bust.sh --quiet && npm test
curl -s -o /dev/null http://localhost:8144/ || (npm run serve &>/dev/null & sleep 1)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
  --window-size=1200,800 --virtual-time-budget=9000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/td-shop-gated.png" \
  "http://localhost:8144/?tutorial=0&mode=build&shop=&reveal=1#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
```
(`?shop=` opens the radial at a default cell; if it needs a cell index, use `?mode=build` and view the screenshot after tapping is not possible headless — instead just confirm no JS error and that the page renders. VIEW the screenshot.) Confirm the radial shows `single`/`rapid` as buyable and `spread…laser` dimmed with `R2…R5`. If `?shop=` needs an explicit cell, drop it and just verify no error + the shop code path via the DOM dump: `--dump-dom … | grep -o 'class="radial-item[^"]*"' | head`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "td: gate the tower shop by the unlock ladder — locked towers dimmed with their round"
```

---

### Task 3: Tutorial scaffolding — DOM, flag, hook, gates, skeleton

**Files:**
- Modify: `index.html` (add `#td-tut` callout element inside `#tab-td`)
- Modify: `styles.css` (`#td-tut`, `.tut-flash`, `.tut-skip`, `@keyframes tutorial-pulse`, `.tutorial-pulse`)
- Modify: `src/td-tab.js` (tutorial state vars + helpers + skeleton object; gate wave clock + heart damage; wire `tick`; `maybeStartTutorial`; `?tutorial=` hook)

**Interfaces:**
- Produces: `tutorialActive` (bool), a `tutorial` object with `.phase` (string) and `.tick(dt)`, `tutBanner(html, {flash, skip})`, `pulseButton(sel|null)`, `startTutorial()`, `endTutorial()`, `skipTutorial()`, `maybeStartTutorial()`. Phase names: `'setup' | 'ram' | 'portal' | 'build' | 'done'` (RAM spawns the shells inline on clear, then goes straight to `portal` — there is no separate `shells` waiting phase). Later tasks fill the phase bodies.

- [ ] **Step 1: index.html — the callout element**

Inside `#tab-td` (after `#td-msg`), add:

```html
    <div id="td-tut" class="hidden"></div>
```

- [ ] **Step 2: styles.css — callout + pulse**

Append:

```css
/* --- TD tutorial: non-freezing callouts + button pulse ------------------- */
#td-tut {
  position: absolute;
  top: 16%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9;
  max-width: min(84vw, 520px);
  text-align: center;
  font: 14px ui-monospace, Menlo, monospace;
  line-height: 1.5;
  color: #cfe9ff;
  background: rgba(6, 14, 22, 0.82);
  border: 1px solid #35ffd0;
  border-radius: 12px;
  padding: 12px 18px;
  text-shadow: 0 0 8px rgba(53, 255, 208, 0.4);
  pointer-events: none;
}
#td-tut.hidden { display: none; }
#td-tut .tut-skip {
  pointer-events: auto;
  margin-top: 10px;
  padding: 6px 16px;
  font: 12px ui-monospace, monospace;
  background: rgba(53, 255, 208, 0.1);
  color: #aefce8;
  border: 1px solid #35ffd0;
  border-radius: 8px;
  cursor: pointer;
}
#td-tut.tut-flash {
  top: 42%;
  font: 700 30px ui-monospace, monospace;
  letter-spacing: 0.08em;
  color: #ff6a88;
  border-color: #ff6a88;
  text-shadow: 0 0 16px rgba(255, 106, 136, 0.6);
}
@keyframes tutorial-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(53, 255, 208, 0); }
  50% { box-shadow: 0 0 0 6px rgba(53, 255, 208, 0.5), 0 0 18px rgba(53, 255, 208, 0.7); }
}
.tutorial-pulse { animation: tutorial-pulse 1.1s ease-in-out infinite; }
```

- [ ] **Step 3: Tutorial state vars + helpers (td-tab.js)**

Near the other module-scope state (e.g. beside `let round = 1;` at `td-tab.js:196`), add:

```js
  let tutorialActive = false;
  let runTutorial = true; // resolved from ?tutorial in the URL-hook block
  const tutEl = root.querySelector('#td-tut');
```

After the DOM/HUD is available (anywhere after `tutEl` is set, e.g. below `pulseHint`), add the helpers:

```js
  // non-freezing tutorial callout; flash = big centred, skip = show Skip
  function tutBanner(html, opts = {}) {
    tutEl.className = opts.flash ? 'tut-flash' : '';
    tutEl.innerHTML = html + (opts.skip
      ? '<div><button class="tut-skip">skip tutorial</button></div>' : '');
    tutEl.classList.remove('hidden');
    const sk = tutEl.querySelector('.tut-skip');
    if (sk) sk.addEventListener('click', skipTutorial);
  }
  function hideTutBanner() { tutEl.classList.add('hidden'); }
  // pulse ONE hud button; pass null to clear all pulses
  let pulsedBtn = null;
  function pulseButton(sel) {
    if (pulsedBtn) pulsedBtn.classList.remove('tutorial-pulse');
    pulsedBtn = sel ? root.querySelector(sel) : null;
    if (pulsedBtn) pulsedBtn.classList.add('tutorial-pulse');
  }
```

- [ ] **Step 4: The tutorial skeleton object**

Add near the helpers:

```js
  // Scripted onboarding. A linear phase machine driven from animate() while
  // tutorialActive. Phase bodies land in later tasks; this is the frame.
  const tutorial = {
    phase: 'setup',
    portal: null,   // the scripted spawn point
    fodder: [],     // the 3 scripted enemies
    tShown: 0,
    setup() { /* task 4 */ },
    tick(dt) { /* task 4 & 5 dispatch on this.phase */ },
    teardown() { pulseButton(null); hideTutBanner(); },
  };

  function startTutorial() {
    tutorialActive = true;
    tutorial.phase = 'setup';
    tutorial.setup();
  }
  function endTutorial() {
    tutorialActive = false;
    tutorial.teardown();
    try { localStorage.setItem('td.tutorialSeen', '1'); } catch (e) { /* private mode */ }
  }
  function skipTutorial() {
    // tear down tutorial-only entities, then hand to a clean normal round
    for (const e of tutorial.fodder) { if (e.alive) { e.alive = false; scene.remove(e.obj); } }
    if (tutorial.portal && tutorial.portal.alive) {
      tutorial.portal.alive = false;
      scene.remove(tutorial.portal.obj);
      const idx = spawnPoints.indexOf(tutorial.portal);
      if (idx >= 0) spawnPoints.splice(idx, 1);
    }
    clearOrbs();
    endTutorial();
    regenerate(); // fresh normal game
  }
  function maybeStartTutorial() {
    if (runTutorial) startTutorial();
  }
```

- [ ] **Step 5: Gate the wave clock and heart damage**

In the wave-clock block (`td-tab.js:3292`), add `!tutorialActive &&` so normal waves don't fire during the scripted phases:

```js
    if (!player.won && !frozen && !tutorialActive) {
      waveClock += dt;
      if (waveClock >= params.waveEvery
        && (wave < introCount() || spawnPoints.some((s) => s.alive))) {
        waveClock = 0;
        spawnWave();
      }
    }
```

At the heart-damage site (`td-tab.js:2532`, `heartHP -= dmg;`), guard it:

```js
    if (!tutorialActive) heartHP -= dmg;
```

- [ ] **Step 6: Drive `tutorial.tick` from animate**

In `animate()`, inside the `if (!frozen)` sim block (just after the wave-clock block), add:

```js
    if (tutorialActive) tutorial.tick(dt);
```

- [ ] **Step 7: URL hook + start wiring**

In the URL-hook section, AFTER `debugging` is computed (`td-tab.js:3542`), resolve the trigger. Do NOT add `'tutorial'` to the `debugging` array — that would suppress the briefing on `?tutorial=0` and, worse, the DEFAULT-on tutorial must not hijack the existing debug hooks (`?wave=`, `?tick=`, …). The rule: run the tutorial when explicitly `?tutorial=1`, OR when it isn't disabled AND no debug param is present:

```js
  const tutParam = urlParams.get('tutorial');
  runTutorial = tutParam === '1' || (tutParam !== '0' && !debugging);
```

Then replace the final `if (!debugging) showBriefing();` (`td-tab.js:3544`) with:

```js
  if (runTutorial) maybeStartTutorial();
  else if (!debugging) showBriefing();
```

So: no params → tutorial (fresh player); `?wave=5` (debug, no `?tutorial`) → normal play, waves run (existing hooks preserved); `?tutorial=1&tick=3` → tutorial + tick (testable); `?tutorial=0` → normal play with the briefing.

- [ ] **Step 8: Bust, test, headless smoke**

```bash
./scripts/bust.sh --quiet && npm test
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
  --window-size=1200,800 --virtual-time-budget=8000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/td-tut-skeleton.png" \
  "http://localhost:8144/?tutorial=1#td" 2>&1 | grep -oiE "Uncaught|TypeError|is not" | head
```
Expected: no error tokens; `npm test` green. (SETUP is still a stub, so nothing spawns yet — this task only proves the scaffolding loads and `tutorialActive` gates cleanly. Also run `?tutorial=0#td` and confirm normal play still boots.)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "td: tutorial scaffolding — callout DOM/CSS, state machine frame, wave/heart gates, ?tutorial hook"
```

---

### Task 4: Tutorial phases SETUP → RAM → SHELLS → PORTAL

**Files:**
- Modify: `src/td-tab.js` (extract `spawnOrbAt`; fill `tutorial.setup()` and the `ram/shells/portal` phase logic in `tutorial.tick`)

**Interfaces:**
- Consumes: `graph`, `dungeon`, `player`, `enemies`, `spawnPoints`, `ammo`, `whim`, `orbRng`, `buildPortalObj`, `recomputePortalDist`, `makeDotEnemy`, `CREATURE_TINTS`, `ENEMY_SPEC`, `openNeighbors`, `tangentDirTo`, `dist3`, `scale3`, `clearOrbs` (all existing in the closure).
- Produces: after this task, `?tutorial=1` plays wave 1: ram 3 phage, shells appear, kill the portal.

- [ ] **Step 1: Extract `spawnOrbAt(ci)` (DRY, reused by the tutorial)**

Refactor `spawnOneOrb()` (`td-tab.js:272`) so the mesh build takes an explicit cell. Add `spawnOrbAt(ci)` containing the body from the `const r = cellSide * 0.14;` line through `orbMeshes.set(ci, group); return true;`, and make `spawnOneOrb()` pick the random `ci` then delegate:

```js
  function spawnOneOrb() {
    const open = [];
    for (let i = 0; i < dungeon.tags.length; i++) {
      if (dungeon.tags[i] !== BLOCKED && i !== dungeon.spawn && i !== dungeon.heart
        && i !== player.cur && !orbMeshes.has(i)) open.push(i);
    }
    if (open.length === 0) return false;
    return spawnOrbAt(open[Math.floor(orbRng() * open.length)]);
  }
  function spawnOrbAt(ci) {
    if (orbMeshes.has(ci)) return false;
    const r = cellSide * 0.14;
    const group = new THREE.Group();
    const phase = orbRng() * 6.283;
    const shells = [];
    for (let k = -1; k <= 1; k++) {
      const b = makeBulletCloud({ body: look().orb.color, hi: 0xffffff });
      b.scale.setScalar(r);
      b.position.set(k * r * 1.7, r * 1.1, 0);
      group.add(b);
      shells.push(b);
    }
    const c = graph.centers[ci];
    const n = graph.normals[ci];
    group.position.set(c[0], c[1], c[2]);
    tmpN.set(n[0], n[1], n[2]);
    group.quaternion.setFromUnitVectors(Y_AXIS, tmpN);
    const baseQ = group.quaternion.clone();
    const spinQ = new THREE.Quaternion();
    group.userData.tick = (t) => {
      spinQ.setFromAxisAngle(Y_AXIS, t * 0.9 + phase);
      group.quaternion.copy(baseQ).multiply(spinQ);
      for (let k = 0; k < 3; k++) {
        shells[k].position.y = r * (1.1 + 0.25 * Math.sin(t * 2.2 + phase + k * 2.1));
      }
    };
    scene.add(group);
    orbMeshes.set(ci, group);
    return true;
  }
```

(Verify against the live `spawnOneOrb` body at `td-tab.js:272-311` as you move it — the body must be byte-identical apart from the parameterized `ci`.)

- [ ] **Step 2: Fill `tutorial.setup()`**

Replace the `setup()` stub. Helpers: pick a near-heart cell and place the player there (mirroring `td-tab.js:1745-1763`); spawn one portal + 3 phage nearby; zero ammo; suppress orbs.

```js
    setup() {
      // player starts a few hops from the heart (distToHeart 2..3)
      let startCi = dungeon.heart;
      for (let d = 2; d <= 4 && startCi === dungeon.heart; d++) {
        for (let i = 0; i < dungeon.tags.length; i++) {
          if (dungeon.tags[i] !== BLOCKED && dungeon.distToHeart[i] === d) { startCi = i; break; }
        }
      }
      player.cur = startCi;
      player.prev = -1;
      player.pos = graph.centers[startCi].slice();
      player.visited = new Set([startCi]);
      const exits = openNeighbors(startCi);
      let e0 = exits[0] ?? startCi;
      for (const e of exits) {
        if (dungeon.distToHeart[e] === dungeon.distToHeart[startCi] - 1) { e0 = e; break; }
      }
      player.heading = tangentDirTo(startCi, e0);
      player.travelDir = player.heading.slice();
      player.smoothDir = player.travelDir.slice();
      player.next = e0;
      player.prog = 0;
      player.segLen = Math.max(1e-9, dist3(graph.centers[startCi], graph.centers[player.next]));

      ammo = 0; updateHud();
      clearOrbs();

      // one portal, near the heart but a couple cells past the player, so
      // the fodder walk toward the heart. Pick a distToHeart-1 cell.
      let portalCi = startCi;
      for (let i = 0; i < dungeon.tags.length; i++) {
        if (dungeon.tags[i] !== BLOCKED && dungeon.distToHeart[i] === 1) { portalCi = i; break; }
      }
      const obj = buildPortalObj('phage', portalCi, whim() * 6.283);
      scene.add(obj);
      const mm = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10),
        new THREE.MeshBasicMaterial({ color: CREATURE_TINTS.phage }));
      const mmp = scale3(graph.centers[portalCi], 1 + params.wallHeight * 1.6);
      mm.position.set(mmp[0], mmp[1], mmp[2]);
      mm.visible = true; scene.add(mm);
      this.portal = { type: 'phage', ci: portalCi, hp: 3, obj, alive: true, found: true, mapMarker: mm };
      spawnPoints.push(this.portal);
      recomputePortalDist();
      wave = 1; // the scripted wave counts as wave 1, so the BUILD-phase
                // spawnWave() (task 5) introduces the wave-2 enemy type

      // 3 phage fodder from the portal
      this.fodder = [];
      const spec = ENEMY_SPEC.phage;
      for (let k = 0; k < 3; k++) {
        const eObj = makeDotEnemy('phage', { walker: CREATURE_TINTS.phage, walkerHi: 0xffffff });
        const scale0 = cellSide * spec.size * 0.7;
        eObj.scale.setScalar(scale0); eObj.userData.s0 = scale0; scene.add(eObj);
        const nx = openNeighbors(portalCi);
        const e = {
          type: 'phage', spec, scale0, size: spec.size,
          cur: portalCi, prev: -1,
          next: nx.length ? nx[Math.floor(whim() * nx.length)] : portalCi,
          prog: whim() * 0.4, pos: graph.centers[portalCi].slice(), dir: [0, 1, 0],
          obj: eObj, alive: true, phase: whim() * 6.283,
          hp: spec.hp, behMult: 1, behUntil: -1, touchCd: -1, slowFactor: 1, slowUntil: -1,
        };
        enemies.push(e); this.fodder.push(e);
      }
      tutBanner('PROTECT THE HEART!', { flash: true, skip: !!safeSeen() });
      this.tShown = 0; this.phase = 'ram';
      // after the flash, swap to the action prompt + pulse fire
      setTimeout(() => {
        if (this.phase !== 'ram') return;
        tutBanner('Shoot or RAM the enemies!', { skip: !!safeSeen() });
        pulseButton('#td-pad-fire');
      }, 1800);
    },
```

Add a tiny `safeSeen()` helper beside the others (reads the flag without throwing in private mode):

```js
  const safeSeen = () => { try { return localStorage.getItem('td.tutorialSeen'); } catch (e) { return null; } };
```

- [ ] **Step 3: Fill the `ram/shells/portal` dispatch in `tutorial.tick`**

```js
    tick(dt) {
      if (this.phase === 'ram') {
        if (this.fodder.every((e) => !e.alive)) {
          // fodder cleared → shells appear beside the player
          const near = openNeighbors(player.cur).slice(0, 3);
          const cells = near.length ? near : [player.cur];
          for (const ci of cells) spawnOrbAt(ci);
          tutBanner('Pick up the shells to destroy the portal — it takes 3 shots.',
            { skip: !!safeSeen() });
          pulseButton('#td-pad-fire');
          this.phase = 'portal';
        }
      } else if (this.phase === 'portal') {
        if (this.portal && !this.portal.alive) {
          this.startBuild(); // task 5
        }
      } else if (this.phase === 'build' || this.phase === 'done') {
        this.tickBuild(dt); // task 5
      }
    },
    startBuild() { /* task 5 */ },
    tickBuild() { /* task 5 */ },
```

- [ ] **Step 4: Bust, test, headless-verify wave 1**

```bash
./scripts/bust.sh --quiet && npm test
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
  --window-size=1200,800 --virtual-time-budget=12000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/td-tut-wave1.png" \
  "http://localhost:8144/?tutorial=1&tick=3#td" 2>&1 | grep -oiE "Uncaught|TypeError|is not" | head
```
Expected: no errors; VIEW the screenshot — the player sits near the heart, a phage portal + fodder are present, "PROTECT THE HEART!" (or the follow-up prompt) shows, the fire button pulses. (Full ram→shells→portal requires live input, not scriptable headless; confirm the SETUP renders and no errors. The `enemies`/portal wiring reuses the exact live shapes so the sim loop drives them normally.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "td tutorial: wave 1 — near-heart start, scripted portal + fodder, no shells then pickups"
```

---

### Task 5: Tutorial phases BUILD → HANDOFF + legal-spot animation

**Files:**
- Modify: `src/td-tab.js` (fill `startBuild`, `tickBuild`; a legal-spot animator; hook first-tower handoff)

**Interfaces:**
- Consumes: `spawnWave`, `placeError`, `paintCell`, `floorColorOf`, `toggleBuild`/`buildMode`, `placeTower` (existing). The unlock ladder from Task 1 already gates the shop to R1 (normal+rapid) because `round === 1`.
- Produces: after this task the tutorial plays end-to-end and hands off to normal play on the first tower placed.

- [ ] **Step 1: `startBuild()` — wave 2 + build prompt + legal-spot pulse**

```js
    startBuild() {
      this.phase = 'build';
      spawnWave(); // a real 2nd wave: new portal + normal enemies (war is live)
      tutBanner('Build Towers. Towers go on HIGH GROUND, near the edge.',
        { skip: !!safeSeen() });
      pulseButton('#td-pad-build');
      this.animateLegalSpots();
    },
    animateLegalSpots() {
      const legal = [];
      for (let ci = 0; ci < dungeon.tags.length; ci++) {
        if (!placeError(ci)) legal.push(ci);
      }
      // pulse a bounded set near the player so it reads on a small planet
      legal.sort((a, b) =>
        dist3(graph.centers[a], player.pos) - dist3(graph.centers[b], player.pos));
      const show = legal.slice(0, 24);
      let pulses = 0;
      const beat = () => {
        const on = pulses % 2 === 0;
        for (const ci of show) paintCell(ci, on ? COL.hintFlash : floorColorOf(ci));
        pulses++;
        if (pulses < 6) setTimeout(beat, 420);
        else for (const ci of show) paintCell(ci, floorColorOf(ci));
      };
      beat();
    },
    tickBuild() {
      // handoff on the first tower built OR when wave-2 enemies are cleared
      if (this.phase !== 'build') return;
      if (towerByCell.size > 0
        || (spawnPoints.every((s) => !s.alive) && enemies.every((e) => !e.alive))) {
        this.phase = 'done';
        hideTutBanner();
        pulseButton(null);
        endTutorial(); // normal wave clock + orbs resume, heart guard lifts
      }
    },
```

(Verify `COL.hintFlash`, `towerByCell`, `dungeon`, `graph`, `enemies`, `spawnPoints` are the live names — they are, per the anchors. `COL` is the look-color table used by `pulseHint`; if the constant is named differently, use the same value `pulseHint` passes to `paintCell`.)

- [ ] **Step 2: Resume orbs on handoff**

`endTutorial()` (Task 3) sets `tutorialActive=false`, which re-enables the wave clock. To restore the normal orb field once, extend `endTutorial()`:

```js
  function endTutorial() {
    tutorialActive = false;
    tutorial.teardown();
    if (orbMeshes.size === 0) spawnOrbs(); // restore the normal shell field
    try { localStorage.setItem('td.tutorialSeen', '1'); } catch (e) { /* private mode */ }
  }
```

- [ ] **Step 3: Bust, test, headless-verify build phase**

```bash
./scripts/bust.sh --quiet && npm test
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
  --window-size=1200,800 --virtual-time-budget=12000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/td-tut-build.png" \
  "http://localhost:8144/?tutorial=1#td" 2>&1 | grep -oiE "Uncaught|TypeError|is not" | head
```
Expected: no errors. Because the ram→portal→build transition needs live play, also do a code-path check: temporarily is not needed — instead confirm the BUILD helpers reference only live names by grepping: `grep -n "animateLegalSpots\|startBuild\|tickBuild\|towerByCell" src/td-tab.js`. VIEW the wave1 screenshot from Task 4 for render health. Confirm `?tutorial=0#td` still boots normal play with the normal briefing.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "td tutorial: wave 2 build intro — legal-spot pulse, BUILD highlight, handoff on first tower"
```

---

### Task 6: Docs + final sweep + push

**Files:**
- Modify: `HOW-IT-WORKS.md`, `DEVLOG.md`

- [ ] **Step 1: HOW-IT-WORKS.md — append**

```markdown
## TD tutorial + tower unlocks

New TD games open on a scripted tutorial (skippable once seen, or
`?tutorial=0`): it starts you a few hops from the heart with no shells,
spawns one phage portal and three fodder — "PROTECT THE HEART!" — and you
ram them; then three shell pickups appear to teach that the portal takes
three shots; then a second wave arrives and the BUILD button pulses with
"towers go on high ground, near the edge," the legal cells flashing so you
see where. It's failure-proof (the heart can't fall) and drives every
spawn itself (the normal wave clock is paused) until you place your first
tower, then hands off to normal play. Tower availability is a by-round
ladder (`towers.js` `unlockedTowerKeys`): normal+rapid at round 1, up to
the laser at round 5; the shop dims locked towers with the round they open.
```

- [ ] **Step 2: Final headless sweep**

```bash
./scripts/bust.sh --quiet && npm test
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
  --window-size=1280,800 --virtual-time-budget=12000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/td-tut-final.png" \
  "http://localhost:8144/?tutorial=1#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
```
Expected: `npm test` green, no error tokens. VIEW the screenshot.

- [ ] **Step 3: Commit docs + DEVLOG, push**

```bash
git add HOW-IT-WORKS.md && git commit -m "td: HOW-IT-WORKS — tutorial + tower unlocks"
git log -1 --format=%h   # note hash H
```

Append the DEVLOG entry (newest-first, after the intro block, `---` separator), then `git add DEVLOG.md && git commit -m "devlog: <H> — td tutorial + tower unlocks"` and `git push origin main` (the pre-push guard verifies tokens):

```markdown
## `<H>` — The first five minutes of TD, taught

TD now opens on a hand-held tutorial instead of a wall of glossary. You
start beside the heart with empty hands as three phage crawl in —
"PROTECT THE HEART!" — and you learn ramming is free. Shells appear; the
portal wants three of them. Then the drums pick up, a second wave lands,
and the BUILD button glows while the buildable high-ground flashes across
the shell. It can't be lost and it drives its own spawns until you plant a
tower, then steps aside. Under it, a by-round unlock ladder now paces the
arsenal — normal and rapid to begin, the laser five sectors deep — with
the shop showing locked towers dimmed behind the round that opens them.
```

Then Telegram the operator (milestone): TD tutorial + tower unlocks live.

---

## Final acceptance checklist

- [ ] `npm test` green (ladder invariants in `test/tdcore.mjs`)
- [ ] `#td` on a fresh game opens the tutorial; `?tutorial=0` = normal play + briefing
- [ ] Wave 1: near-heart start, no shells, 3 phage + portal, ram → shells → 3-shot portal kill
- [ ] Wave 2: BUILD pulses, legal cells flash, shop offers only normal+rapid (round 1 ladder)
- [ ] Handoff on first tower built; heart can't fall while `tutorialActive`; orbs + wave clock resume
- [ ] Skip button appears once seen and tears down cleanly into a normal round
- [ ] Shop dims locked towers with their unlock round; ladder unlocks by sector
- [ ] All bust output committed atomically; pre-push guard passes; vendor imports token-free
- [ ] DEVLOG + HOW-IT-WORKS entries present
