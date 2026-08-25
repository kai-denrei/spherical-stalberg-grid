# TD deliberate waves + stargate-only portals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TD progression legible — wave N = N enemy types + N tower types — with a next-wave preview and unlock payoff, and lock portals to the stargate model as type-agnostic sources.

**Architecture:** A pure, Node-tested `computeWavePlan` + a wave-keyed tower ladder become the single progression source. `td-tab.js` re-keys unlocks/intros to `wave`, makes portals type-agnostic neutral stargate sources seeded per sector, rewrites `spawnWave` to spread the plan across portals, and adds a `#td-next` preview strip + tower-unlock toast. `round`/sectors stay as spatial-only.

**Tech Stack:** Vanilla ES modules, Three.js (vendored), no build step. Deterministic (mulberry32; no `Math.random`).

## Global Constraints

- **Do NOT push in any task — commits stay LOCAL; the controller pushes once at the very end after the final review + deban sync.**
- After editing `src/*.js` / HTML / CSS: run `./scripts/bust.sh --quiet`, then commit ALL its output atomically (`git add -A`). NEVER token a `../vendor/` import. Pre-push guard (`scripts/check-tokens.sh`) fails on split tokens.
- `npm test` must stay green — it is the invariant guard for the pure ladder + wave plan (extend it, keep it passing).
- Deterministic game logic only — NO `Math.random`.
- Every task must leave a WORKING game (boots, waves spawn, sector clears) — the four features are interdependent; never ship a half-wired intermediate.
- Commit trailer (exact two lines) on EVERY commit:
  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01QH1hQk64Cw4ZwpAi59Pnat
  ```
- Headless: Chrome `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr`, serve :8144 (`npm run serve &` if down). Anchor on CODE; line numbers drift (td-tab.js ≈3850 lines). Debug hooks: `?wave=N`, `?tutorial=0/1`, `?mode=build`, `?sector=N`, `?reveal=1`.

---

### Task 1: Pure core — wave-keyed ladder + computeWavePlan + tests (+ rewire callers)

**Files:**
- Modify: `src/towers.js` (~101-126), `src/enemyspec.js` (append), `test/tdcore.mjs` (~5-6 imports, ~102-129), `src/td-tab.js` (towers import line + `openShop` ~3359-3369/3380)

**Why td-tab.js here:** removing the `towerUnlockRound`/`TOWER_UNLOCKS` exports breaks any importer at module-load (ES modules hard-fail on a missing named export). This task must rewire every importer so the build stays green — grep `towerUnlockRound|TOWER_UNLOCKS|unlockedTowerKeys` across `src/` and `test/` and update all hits.

**Interfaces:**
- Produces: `TOWER_ORDER` (array), `unlockedTowerKeys(wave)`, `towerUnlockWave(key)` (replacing `TOWER_UNLOCKS`/`unlockedTowerKeys(round)`/`towerUnlockRound`); `computeWavePlan(wave, round, waveSize)` → `{ headline: string, entries: [{type,count}] }`; `typesByWave(wave)` → string[].

- [ ] **Step 1: Rewrite the tower ladder (towers.js).** Replace lines ~101-126 (the `TOWER_UNLOCKS` block through `towerUnlockRound`) with:
  ```js
  // --- progressive unlock ladder -------------------------------------------
  // Towers unlock by WAVE: ONE new tower each wave, cheap → capstone.
  // Cumulative: wave N grants the first N towers (capped at the roster).
  export const TOWER_ORDER = ['single', 'rapid', 'spread', 'slow', 'homing', 'aoe', 'sniper', 'laser'];

  export function unlockedTowerKeys(wave) {
    const n = Math.max(1, Math.min(TOWER_ORDER.length, Math.floor(wave) || 1));
    return TOWER_ORDER.slice(0, n);
  }

  export function towerUnlockWave(key) {
    const i = TOWER_ORDER.indexOf(key);
    return i < 0 ? 1 : i + 1;
  }
  ```

- [ ] **Step 2: Add computeWavePlan (enemyspec.js).** Append to `src/enemyspec.js`:
  ```js
  // deterministic per-wave RNG (no Math.random — keeps the plan reproducible
  // for both the preview and the actual spawn)
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // enemy types available at a wave: the first min(wave,12) INTROS, in order
  export function typesByWave(wave) {
    const n = Math.max(1, Math.min(INTROS.length, Math.floor(wave) || 1));
    return INTROS.slice(0, n).map((iv) => iv.type);
  }

  // per-wave spawn plan: the NEWEST type in bulk + a seeded sprinkle of ≤2
  // earlier types. Counts use the same density tiers as the live spawner so
  // the preview never lies. Pure + deterministic.
  export function computeWavePlan(wave, round = 1, waveSize = 4) {
    const avail = typesByWave(wave);
    const headline = avail[avail.length - 1];
    const earlier = avail.slice(0, -1);
    const rnd = mulberry32((Math.floor(wave) || 1) * 2654435761);
    const pool = earlier.slice();
    const supports = [];
    const k = Math.min(2, pool.length);
    for (let i = 0; i < k; i++) supports.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    const base = waveSize + wave + 2 * (Math.max(1, round) - 1);
    const density = (t) => {
      const s = ENEMY_SPEC[t];
      return s.boss ? 1
        : s.heavy ? Math.max(1, Math.ceil(base / 3))
        : s.rammable ? Math.round(base * 1.4)
        : Math.max(1, Math.ceil(base / 2));
    };
    const entries = [{ type: headline, count: density(headline) }];
    for (const t of supports) entries.push({ type: t, count: Math.max(1, Math.round(density(t) * 0.4)) });
    return { headline, entries };
  }
  ```

- [ ] **Step 3: Update the tests (test/tdcore.mjs).** In the towers import line (~6) replace `unlockedTowerKeys, towerUnlockRound, TOWER_UNLOCKS` with `unlockedTowerKeys, towerUnlockWave, TOWER_ORDER`. In the enemyspec import line (~5) add `computeWavePlan, typesByWave`. Replace the tower-ladder assert block (~102-129) with:
  ```js
  check('wave 1 unlocks single only', JSON.stringify(unlockedTowerKeys(1)) === JSON.stringify(['single']));
  check('wave 2 unlocks single+rapid', JSON.stringify(unlockedTowerKeys(2)) === JSON.stringify(['single', 'rapid']));
  check('unlock clamps below 1', JSON.stringify(unlockedTowerKeys(0)) === JSON.stringify(['single'])
    && JSON.stringify(unlockedTowerKeys(-3)) === JSON.stringify(['single']));
  check('wave N grants N towers (cumulative)', [1, 2, 3, 4, 5, 6, 7, 8].every((w) => unlockedTowerKeys(w).length === w));
  check('all 8 towers by wave 8, capped after', unlockedTowerKeys(8).length === 8 && unlockedTowerKeys(99).length === 8);
  check('every unlocked key is a real tower', unlockedTowerKeys(8).every((k) => TOWER_BY_KEY[k]));
  check('towerUnlockWave: laser=8, single=1, rapid=2', towerUnlockWave('laser') === 8 && towerUnlockWave('single') === 1 && towerUnlockWave('rapid') === 2);
  check('TOWER_ORDER covers the roster', TOWER_ORDER.length === TOWERS.length && TOWER_ORDER.every((k) => TOWER_BY_KEY[k]));

  // --- wave plan -----------------------------------------------------------
  check('wave 1 plan is a single type', (() => { const p = computeWavePlan(1, 1, 4); return p.entries.length === 1 && p.headline === 'phage'; })());
  check('headline is the newest available type', [2, 5, 9, 12].every((w) => computeWavePlan(w, 1, 4).headline === INTROS[Math.min(w, 12) - 1].type));
  check('plan entries = 1 + up to 2 supports', [1, 2, 3, 8, 12].every((w) => { const n = computeWavePlan(w, 1, 4).entries.length; return n >= 1 && n <= 3; }));
  check('supports are earlier types, never the headline', [3, 8, 12].every((w) => { const p = computeWavePlan(w, 1, 4); const avail = typesByWave(w); return p.entries.slice(1).every((e) => e.type !== p.headline && avail.includes(e.type)); }));
  check('wave plan is deterministic', JSON.stringify(computeWavePlan(7, 2, 4)) === JSON.stringify(computeWavePlan(7, 2, 4)));
  check('all wave-plan counts are >= 1', [1, 4, 8, 12, 20].every((w) => computeWavePlan(w, 2, 4).entries.every((e) => e.count >= 1)));
  check('typesByWave grows with wave, caps at 12', typesByWave(1).length === 1 && typesByWave(5).length === 5 && typesByWave(99).length === 12);
  ```
  Keep the existing intro/enemyspec asserts (~15-30) unchanged.

- [ ] **Step 4: Rewire the callers (td-tab.js).** Grep `towerUnlockRound|TOWER_UNLOCKS|unlockedTowerKeys` across `src/` + `test/`. In `src/td-tab.js`: in the `towers.js` import line remove `towerUnlockRound` (and `TOWER_UNLOCKS` if imported), add `towerUnlockWave, TOWER_ORDER` (keep `unlockedTowerKeys`, `TOWER_BY_KEY`, `TOWERS`). In `openShop` (~3359-3369): `unlockedTowerKeys(round)` → `unlockedTowerKeys(wave)`; the locked label `R${towerUnlockRound(def.key)}` → `W${towerUnlockWave(def.key)}`. Change the shop footer hint (~3380) `more unlock as you expand` → `one new tower each wave`. (These are the ONLY openShop unlock changes — Task 3 does NOT touch the shop.) If grep finds any other importer (e.g. another tab), update it too.

- [ ] **Step 5: Run the suite + bust.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -6` → all green.

- [ ] **Step 6: Headless smoke — build still loads.** Load `?tutorial=0#td` headless (as in Task 2 Step 6) and confirm no `Uncaught`/`TypeError` (catches a broken import). Expected: clean.

- [ ] **Step 7: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "td core: wave-keyed tower ladder + pure computeWavePlan (Node-tested), rewire shop"
  ```

---

### Task 2: Stargate-only portals

**Files:**
- Modify: `src/creatures.js` (`portalPts` ~351-447), `src/units.js` (`makePortalCloud` ~644), `src/td-tab.js` (params ~54; GUI ~3493-3494; `reshapePortals` ~3284; `buildPortalObj` ~3254-3256; `?portal` hook ~3790-3795)

**Interfaces:**
- Consumes: nothing new.
- Produces: `portalPts(n)` (stargate-only, no `kind`); `makePortalCloud(cols, phase)`; `buildPortalObj(ci, phase)` (no `type` — neutral tint). `params.portalShape`, the shape dropdown, `reshapePortals`, and the `?portal=` hook are removed.

- [ ] **Step 1: Stargate-only `portalPts` (creatures.js).** In `portalPts` (~351), delete the `torus`/`torii`/`moongate` branches and the `kind` parameter; keep ONLY the stargate geometry. Signature becomes `export function portalPts(n = 1150)`. If `torusPts` (~453) is now unused by any module (grep `torusPts` across `src/`), leave it (harmless) — do NOT delete other tabs' helpers.

- [ ] **Step 2: `makePortalCloud` (units.js ~644).** Drop the `shape` param: `export function makePortalCloud(cols, phase = 0) { const base = portalPts(1150); …`.

- [ ] **Step 3: Neutral stargate `buildPortalObj` (td-tab.js ~3254).** Drop the `type` param and the `params.portalShape` arg; use a neutral tint:
  ```js
  function buildPortalObj(ci, phase) {
    const obj = makePortalCloud({ body: 0xcfd8ff, hi: 0xffffff }, phase);
    // …rest unchanged (scale, position, lane-facing)…
  }
  ```
  Update its call sites: tutorial (~1511) `buildPortalObj(portalCi, whim()*6.283)`; `addSpawnPoint` (~2193) `buildPortalObj(best, whim()*6.283)`; `reshapePortals` (~3289) — see Step 4.

- [ ] **Step 4: Remove the shape switcher.** Delete `params.portalShape` (~54); the GUI dropdown (~3493-3494); the `?portal=` hook (~3790-3795). Replace `reshapePortals` (~3284-3296) with a version that rebuilds via the new signature (still used to carry wound state on rebuilds), OR if nothing else calls it after the dropdown is gone (grep `reshapePortals`), delete it entirely. Grep first; if a live caller remains, keep it with `buildPortalObj(sp.ci, …)`.

- [ ] **Step 5: Bust + test.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -3` → green.

- [ ] **Step 6: Headless — portals render as stargate, no errors.**
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --window-size=1200,800 --virtual-time-budget=9000 --screenshot="$CLAUDE_JOB_DIR/tmp/tdw2.png" \
    "http://localhost:8144/?tutorial=0&wave=3&found=1#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  ```
  Expected: no error tokens; VIEW the screenshot — the gates are the chevroned stargate shape.

- [ ] **Step 7: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "td: portals are stargate-only (drop torii/moongate/torus + shape dropdown), neutral tint"
  ```

---

### Task 3: Anticipation UI — next-wave preview, tower toast, HUD, shop labels

**Files:**
- Modify: `src/td-tab.js` (tab HTML template — add `#td-next`; `updateHud` ~1824-1839; `openShop` unlock source ~3359-3369 + footer; new `updateNextPreview()` + `showTowerToast()`; wire preview into `animate`'s per-frame UI block), `styles.css` (add `#td-next` + toast styles)

**Interfaces:**
- Consumes: `computeWavePlan` (Task 1, enemyspec.js — add to the import), `INTROS`, `wave`, `round`, `waveClock`, `params.waveEvery`, `params.waveSize`, `buildFrozen()`, `revealLeft`, `player.won`, `tutorialActive`, `CREATURE_TINTS`, `TOWER_BY_KEY`, `makeTowerUnit`, `spriteShot`, `waveEl`. (`TOWER_ORDER`/`towerUnlockWave`/the shop change were done in Task 1 — do NOT touch the shop here.)
- Produces: `updateNextPreview()` (called each frame), `showTowerToast(key)` (called by Task 4's spawn).
- Note: this task ships BEFORE the wave-engine rewrite (Task 4). The preview shows `computeWavePlan(wave+1,…)` while the OLD spawner still runs — an expected, working intermediate (the preview reflects the INTENDED plan). `showTowerToast` is defined here but not yet called (Task 4 calls it) — that's fine (a defined, unused function). Verify the strip RENDERS.

- [ ] **Step 1: Imports.** Add `computeWavePlan` to the `enemyspec.js` import (the `towers.js` import was already updated in Task 1).

- [ ] **Step 2: Add the `#td-next` element.** In the tab's HTML template (where `#td-wave`, `#td-tut`, `#td-msg` are defined), add a sibling: `<div id="td-next" class="hidden"></div>`.

- [ ] **Step 3: The preview updater.** Add near `announceWave`:
  ```js
  const nextEl = root.querySelector('#td-next');
  function updateNextPreview() {
    if (player.won || tutorialActive || !nextEl) { nextEl.classList.add('hidden'); return; }
    const n = wave + 1;
    const plan = computeWavePlan(n, round, params.waveSize);
    const chips = plan.entries.map((e, i) => {
      const tint = '#' + CREATURE_TINTS[e.type].toString(16).padStart(6, '0');
      const mark = i === 0 ? '◈' : '●';
      const nm = (INTROS.find((iv) => iv.type === e.type)?.label || e.type).toLowerCase();
      return `<span class="nx-chip" style="color:${tint}">${mark} ${nm} ×${e.count}</span>`;
    }).join('');
    const frozen = buildFrozen() || revealLeft > 0;
    const when = frozen ? 'ready · leave BUILD to engage'
      : `in ${Math.max(0, Math.ceil(params.waveEvery - waveClock))}s`;
    nextEl.innerHTML = `<div class="nx-head">NEXT WAVE ${n} · ${when}</div><div class="nx-row">${chips}</div>`;
    nextEl.classList.remove('hidden');
  }
  ```
  Wire `updateNextPreview()` into `animate`'s per-frame UI section (near where the HUD/wave card are maintained). It's cheap; call every frame.

- [ ] **Step 4: The tower-unlock toast.** Add:
  ```js
  // a distinct build-side toast (own slot, does not collide with the enemy
  // "NEW THREAT" card) when a wave unlocks a new tower
  let towerToastTimer = null;
  function showTowerToast(key) {
    const def = TOWER_BY_KEY[key];
    if (!def) return;
    nextEl && nextEl.classList.add('hidden'); // yield the strip briefly
    waveEl.style.borderColor = '#7fdfff';
    waveEl.style.color = '#7fdfff';
    waveEl.innerHTML = `<div class="wave-num">NEW TOWER UNLOCKED</div>` +
      `<div class="wave-name">${def.label}</div>` +
      `<div class="wave-role">available now in BUILD</div>`;
    const icon = spriteShot('tower-' + key, () => makeTowerUnit(def));
    const img = new Image(); img.src = icon; img.className = 'wave-icon';
    waveEl.insertBefore(img, waveEl.querySelector('.wave-name'));
    waveEl.classList.remove('hidden');
    clearTimeout(towerToastTimer);
    towerToastTimer = setTimeout(() => waveEl.classList.add('hidden'), 3000);
  }
  ```
  (If `waveEl` already has an inline sprite renderer for enemies, this reuses the same card slot but with a static tower icon — acceptable since the enemy card and tower toast never fire in the exact same frame; Task 4 calls `showTowerToast` after `announceWave`.)

- [ ] **Step 5: HUD leads with the wave (updateHud ~1839).** Change the status line to lead with WAVE and show the tower count:
  ```js
  `WAVE ${wave} · ${Math.min(8, Math.max(0, wave))}/8 towers · portals ${spAlive}/${spawnPoints.length} · R${round}${alerts}\n` +
  ```

- [ ] **Step 7: Styles.** Append to `styles.css` a `#td-next` block (top-center strip, translucent card matching `#td-wave`'s aesthetic, `pointer-events:none`, small type; `.nx-head` bold, `.nx-row` flex-wrap of `.nx-chip`) and a `.wave-icon` rule if not already present. Keep it compact for mobile width.

- [ ] **Step 8: Bust + test.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -3` → green.

- [ ] **Step 9: Headless — preview + HUD render.**
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --window-size=1200,800 --virtual-time-budget=9000 --screenshot="$CLAUDE_JOB_DIR/tmp/tdw3.png" \
    "http://localhost:8144/?tutorial=0#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  ```
  Expected: no error tokens; VIEW the screenshot — the `#td-next` strip shows `NEXT WAVE … in Ns` with a chip list, and the HUD leads with `WAVE`.

- [ ] **Step 10: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "td: next-wave preview strip + tower-unlock toast + wave-first HUD + wave-keyed shop labels"
  ```

---

### Task 4: Wave engine — agnostic portals + plan-driven spawn

**Files:**
- Modify: `src/td-tab.js` (`introCount` ~209 removal; `addSpawnPoint` ~2177-2207; `spawnWave` ~2209-2250; the round-reset that seeds portals ~1949/~2155; `expandRound` ~3466-3468; `checkVictory` ~3425; wave clock ~3597; `tutorial.setup` ~1508)

**Interfaces:**
- Consumes: `computeWavePlan(wave, round, params.waveSize)`, `TOWER_ORDER` (Task 1); `showTowerToast(key)`, `updateNextPreview()` (Task 3 — already defined in the closure); `announceWave(intro)`.
- Produces: `seedPortals(n)`; type-agnostic portal records `{ci, hp, obj, alive, found, mapMarker}` (no `type`).

- [ ] **Step 1: De-type portals (addSpawnPoint ~2177).** Drop the `type` param. Neutral minimap marker (`color: 0x9fdcff`). Push a record WITHOUT `type`: `spawnPoints.push({ ci: best, hp: 3, obj, alive: true, found: false, mapMarker });`. Portal obj via the Task-2 `buildPortalObj(best, whim()*6.283)`.

- [ ] **Step 2: seedPortals helper.** Add:
  ```js
  // a sector's gates are spatial sources, not type-bound — seed a small
  // fixed set; the wave plan decides what pours out of them
  function seedPortals(n) { for (let i = 0; i < n; i++) addSpawnPoint(); }
  ```

- [ ] **Step 3: Rewrite spawnWave (~2209-2250).** Declare `seenTypes` with the other wave state near `let wave` (~185): `const seenTypes = new Set(); // headline types already revealed this run` (NOT inline above spawnWave — the reset block in Step 4 references it and lives earlier in the file). Then replace `spawnWave`:
  ```js
  function spawnWave() {
    wave++;
    const plan = computeWavePlan(wave, round, params.waveSize);
    // NEW THREAT reveal the first time a headline type appears
    if (!seenTypes.has(plan.headline)) {
      seenTypes.add(plan.headline);
      const intro = INTROS.find((iv) => iv.type === plan.headline);
      if (intro) announceWave(intro);
    }
    // one new tower unlocks per wave through wave 8
    if (wave >= 1 && wave <= TOWER_ORDER.length) showTowerToast(TOWER_ORDER[wave - 1]);
    const live = spawnPoints.filter((s) => s.alive);
    if (live.length) {
      let pi = 0;
      for (const { type, count } of plan.entries) {
        const spec = ENEMY_SPEC[type];
        for (let k = 0; k < count; k++) {
          const sp = live[pi % live.length]; pi++;
          const obj = makeDotEnemy(type, { walker: CREATURE_TINTS[type], walkerHi: 0xffffff });
          const size = spec.size * 0.7;
          const scale0 = cellSide * size;
          obj.scale.setScalar(scale0); obj.userData.s0 = scale0;
          scene.add(obj);
          const exits = openNeighbors(sp.ci);
          enemies.push({
            type, spec, scale0, size,
            cur: sp.ci, prev: -1,
            next: exits.length ? exits[Math.floor(whim() * exits.length)] : sp.ci,
            prog: whim() * 0.4, pos: graph.centers[sp.ci].slice(), dir: [0, 1, 0],
            obj, alive: true, phase: whim() * 6.283,
            hp: spec.hp, behMult: 1, behUntil: -1, touchCd: -1,
            slowFactor: 1, slowUntil: -1,
          });
        }
      }
    }
    updateHud();
  }
  ```
  (Reset `seenTypes.clear()` wherever `wave` resets to 0 — see Step 5.)

- [ ] **Step 4: Seed round-1 portals.** Find the normal round-reset (the block that does `spawnPoints.length = 0; wave = 0; waveClock = params.waveEvery * 0.6;` ~2155-2168) and, at its end, seed the starting gates and clear the reveal set: append `seenTypes.clear(); seedPortals(2);`. This runs for the normal game; the tutorial overrides it in Step 6.

- [ ] **Step 5: Sector expansion seeds neutral gates (expandRound ~3466-3468).** Replace the `known`-types loop:
  ```js
  seedPortals(2); // fresh neutral gates in the new band
  ```
  (Delete the `const known = INTROS.slice(...)` line.)

- [ ] **Step 6: Tutorial keeps its single scripted gate (tutorial.setup ~1508).** At the START of `tutorial.setup()` (before it builds its scripted portal), wipe any seeded gates so the tutorial has exactly its one:
  ```js
  for (const sp of spawnPoints) { scene.remove(sp.obj); disposeObj(sp.obj); if (sp.mapMarker) { scene.remove(sp.mapMarker); disposeObj(sp.mapMarker); } }
  spawnPoints.length = 0;
  ```
  The tutorial's own `buildPortalObj(portalCi, …)` call (Task-2 signature) and its scripted fodder are unchanged.

- [ ] **Step 7: Remove introCount, fix victory + wave clock.** Delete `const introCount = …` (~209). In `checkVictory` (~3425) change the guard to drop `introCount`:
  ```js
  if (spawnPoints.length > 0 && spawnPoints.every((s) => !s.alive) && enemies.every((e) => !e.alive)) {
  ```
  In the wave-clock condition (~3597) drop `wave < introCount() ||`:
  ```js
  if (waveClock >= params.waveEvery && spawnPoints.some((s) => s.alive)) {
  ```

- [ ] **Step 8: Bust + test.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -3` → green.

- [ ] **Step 9: Headless — the full loop works.**
  ```bash
  for u in "tutorial=0" "tutorial=0&wave=1" "tutorial=0&wave=8&found=1" "tutorial=1"; do
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
      --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
      --window-size=1200,800 --virtual-time-budget=9000 \
      --screenshot="$CLAUDE_JOB_DIR/tmp/tdw4-$RANDOM.png" \
      "http://localhost:8144/?$u#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  done
  ```
  Expected: no error tokens across all four. VIEW the `wave=1` shot (one enemy type, stargate gates present), the `wave=8` shot (headline + a few; a tower toast may show), and confirm `tutorial=1` still runs its scripted single-portal intro. In your report, confirm: round-1 boots WITH portals (not zero), waves spawn from them, and a cleared sector still expands (`?reveal=1` or reasoning).

- [ ] **Step 10: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "td: wave engine — type-agnostic seeded portals + computeWavePlan spawn (wave N = N types)"
  ```

---

### Task 5: Docs

**Files:**
- Modify: `HOW-IT-WORKS.md`, `DEVLOG.md`

- [ ] **Step 1: HOW-IT-WORKS.md — append.**
  ```markdown
  ## Deliberate waves + stargate gates

  Progression now reads off one number — the wave. Wave N fields N enemy
  types and unlocks N tower types (one new tower each wave, cheap → laser by
  wave 8); the newest threat headlines each wave with a few older types mixed
  in. A NEXT WAVE strip previews what's coming and counts it down, a NEW
  TOWER card marks each unlock, and the HUD leads with the wave. Sectors still
  grow the sphere when you clear every gate, but they no longer gate towers or
  types — they're spatial now. And the gates are all one shape: the stargate,
  a neutral source that pours out whatever the wave dictates.
  ```

- [ ] **Step 2: Final headless sweep.**
  ```bash
  ./scripts/bust.sh --quiet && npm test 2>&1 | tail -3
  for u in "tutorial=1" "tutorial=0" "tutorial=0&wave=8&found=1"; do
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
      --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
      --window-size=1200,800 --virtual-time-budget=9000 \
      --screenshot="$CLAUDE_JOB_DIR/tmp/tdw5-$RANDOM.png" \
      "http://localhost:8144/?$u#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  done
  ```
  Expected: `npm test` green, no error tokens.

- [ ] **Step 3: Commit HOW-IT-WORKS, capture hash H.**
  ```bash
  git add HOW-IT-WORKS.md
  git commit -m "td: HOW-IT-WORKS — deliberate waves + stargate gates"
  git log -1 --format=%h   # note hash H
  ```

- [ ] **Step 4: DEVLOG.md — prepend a newest-first entry** (top of the list, after the intro/`---`), substituting the real H:
  ```markdown
  ## `<H>` — Deliberate waves, one true gate

  TD progression collapses onto the wave counter: wave N = N enemy types + N
  tower types (one new tower a wave, capped at the roster), the newest threat
  headlining with a few older types folded in. A NEXT WAVE strip previews and
  counts down what's incoming; a NEW TOWER card marks each unlock; the HUD
  leads with the wave. Portals became type-agnostic neutral **stargate**
  sources — a bounded set per sector, seeded spatially, pouring out whatever
  the wave plan dictates — and the torii/moongate shapes and the shape
  dropdown are gone. Sectors stay as pure spatial growth. The plan itself
  (`computeWavePlan`) and the wave-keyed tower ladder are pure and Node-tested.
  ```
  ```bash
  git add DEVLOG.md
  git commit -m "devlog: <H> — td deliberate waves + stargate gates"
  ```
  Do NOT push — the controller pushes after the final review + deban sync.

---

## Final acceptance checklist

- [ ] `npm test` green — wave-keyed ladder (wave 1 = [single], wave 8 = all 8) + `computeWavePlan` (headline newest, ≤2 earlier supports, deterministic, counts ≥1).
- [ ] Portals are stargate-only (no torii/moongate/torus, no shape dropdown, no `?portal=`), neutral tint, type-agnostic seeded sources (round 1 boots with gates; expand seeds fresh ones; tutorial keeps its single scripted gate).
- [ ] `spawnWave` spreads `computeWavePlan` round-robin across live gates; wave 1 = one type; new-type headline still triggers the "NEW THREAT" card; waves 1–8 fire a NEW TOWER toast.
- [ ] `#td-next` preview strip shows the incoming types + countdown (or "ready" when frozen); HUD leads with WAVE; shop unlocks/labels key off wave (`W{n}`).
- [ ] Sector clear still expands the world (spatial), no longer gating towers/types.
- [ ] All bust output committed atomically; vendor imports token-free; pre-push guard passes.
- [ ] DEVLOG + HOW-IT-WORKS entries present.
