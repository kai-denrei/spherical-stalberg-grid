# TD first impressions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sharpen the TD first impression — a frozen laser "defend the heart" opening, transient (no-×) toasts, sticky-manual drive with opt-in auto, and a clear-gated "WAVE OVER → anticipation → next wave" beat.

**Architecture:** All changes are in `src/td-tab.js` + `styles.css`. A new `autoMode` flag replaces the auto-resume timer; a new `#td-toast` transient element replaces the sticky tutorial/override modals; a small wave state machine (`waveActive`/`interClock`/`waveAge`) replaces the rolling wave timer; the tutorial's `setup()` is reframed and gains a `frozen` beat.

**Tech Stack:** Vanilla ES modules, Three.js (vendored), no build step. Deterministic (`whim()`/mulberry32; no `Math.random`).

## Global Constraints

- **Do NOT push in any task — commits stay LOCAL; the controller pushes once at the very end after the final review + deban sync.**
- After editing `src/*.js` / HTML / CSS: run `./scripts/bust.sh --quiet`, then commit ALL its output atomically (`git add -A`). NEVER token a `../vendor/` import. Pre-push guard fails on split tokens.
- `npm test` must stay green (pure cores untouched; regression guard).
- Deterministic only — NO `Math.random`.
- Every task must leave a WORKING game (boots, tutorial runs, waves spawn).
- Commit trailer (exact two lines) on EVERY commit:
  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01QH1hQk64Cw4ZwpAi59Pnat
  ```
- Headless: Chrome `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr`, serve :8144 (`npm run serve &` if down). Anchor on CODE; line numbers drift (td-tab.js ≈3870 lines). Hooks: `?tutorial=0/1`, `?wave=N`, `?mode=build`.

---

### Task 1: Manual-sticky drive, auto opt-in (remove auto-resume)

**Files:**
- Modify: `src/td-tab.js` (manual state ~482-483; params ~54; drive input ~1056-1057; directive chip ~1348-1350; GUI slider ~3527)

**Interfaces:**
- Produces: `let autoMode` (module state, default false = MANUAL); `manualActive()` becomes `() => !autoMode`. `manualClock`, `params.autoResume`, and its slider are removed.
- The HUD mode line (~1851, reads `manualActive()`), `autoGunner`, `updateSmoothDir`, `chooseNext` all consume `manualActive()` unchanged.

- [ ] **Step 1: Replace the manual state (~482-483).**
  ```js
  let autoMode = false; // AUTO is opt-in (the directive chip); MANUAL is sticky
  const manualActive = () => !autoMode;
  ```
  (delete `let manualClock = 99;` and the old `const manualActive = () => manualClock < params.autoResume;`)

- [ ] **Step 2: Drive input reclaims manual, sticky (~1056-1057).** Replace the `manualClock = …` line:
  ```js
  const anyKey = keys.left || keys.right || keys.fast || keys.slow;
  if (anyKey || cruise) autoMode = false; // any drive input takes the wheel — sticky, no timer
  ```
  (keep the `steerHold = anyKey ? 0 : steerHold + dt;` line that follows)

- [ ] **Step 3: The directive chip hands off to auto (~1348-1350).** Replace the three lines after `updateHud();`:
  ```js
  autoMode = true;  // picking a directive is the ONLY way into auto
  steerHold = 1.2;
  cruise = false;
  ```

- [ ] **Step 4: Remove the param + slider.** Delete `autoResume: 10,` (~54) and the `gui.add(params, 'autoResume', …)` line (~3527). Grep `autoResume|manualClock` across `src/` — there must be ZERO remaining references.

- [ ] **Step 5: Bust + test.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -3` → green.

- [ ] **Step 6: Headless — starts MANUAL, no errors.**
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --window-size=1200,800 --virtual-time-budget=8000 --screenshot="$CLAUDE_JOB_DIR/tmp/fi1.png" \
    "http://localhost:8144/?tutorial=0#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  ```
  Expected: no error tokens; VIEW the screenshot — the HUD mode line reads `MANUAL` (not `AUTO · WANDER`).

- [ ] **Step 7: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "td: drive starts MANUAL and stays sticky; AUTO is opt-in via directive (no auto-resume)"
  ```

---

### Task 2: Transient toasts, drop the × (remove sticky tutorial/override modals)

**Files:**
- Modify: `src/td-tab.js` (HTML template — add `#td-toast`; remove `showTutorialChoice` ~1808; init ~3865; msgEl delegation ~1678-1683; `tutBanner` ~1442-1451; `showOverrideModal` ~1822-1834), `styles.css` (add `#td-toast`; remove `#td-msg .msg-x` ~486 and `#td-tut .tut-x` ~950)

**Interfaces:**
- Consumes: `startTutorial()` (~1802), `hideTutBanner()`, `tutEl` (`#td-tut`), the toast pattern from `showTowerToast`.
- Produces: `<div id="td-toast">` + `showToast(html, ms)`; `tutBanner(html, {flash, skip, hold})` (new `hold` opt keeps the banner up — used by Task 3's frozen prompt); `showOverrideModal()` now writes a transient toast.

- [ ] **Step 1: Add the toast element.** In the tab HTML template (beside `#td-tut`/`#td-next`/`#td-tower`), add `<div id="td-toast" class="hidden"></div>`.

- [ ] **Step 2: Generic transient toast + reworked override (replace `showOverrideModal` ~1822-1834).**
  ```js
  const toastEl = root.querySelector('#td-toast');
  let toastTimer = null;
  function showToast(html, ms = 3000) {
    if (!toastEl) return;
    toastEl.innerHTML = html;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), ms);
  }
  // switching back to driving: a brief, non-pausing reminder of the mode model
  function showOverrideModal() {
    showToast(`<div class="wave-num">MANUAL</div>` +
      `<div class="wave-role">you're driving — tap a directive to hand the wheel to auto</div>`);
  }
  ```
  (No `paused`. `showOverrideModal` is still called from `toggleBuild`; keep that call.)

- [ ] **Step 3: Remove the start-choice modal.** Delete `showTutorialChoice` (~1808-1821). At init (~3865) change `if (runTutorial) showTutorialChoice();` → `if (runTutorial) startTutorial();`. In the msgEl delegation (~1678-1683) delete the `msg-ovr-ok`, `msg-tut-play`, and `msg-tut-skip`/`msg-tut-x` branches (the other branches stay).

- [ ] **Step 4: tutBanner — drop the ×, add auto-hide + a `hold` opt (~1442-1451).**
  ```js
  let tutTimer = null;
  function tutBanner(html, opts = {}) {
    tutEl.className = opts.flash ? 'tut-flash' : '';
    tutEl.innerHTML = html + (opts.skip
      ? '<div><button class="tut-skip">skip tutorial</button></div>' : '');
    tutEl.classList.remove('hidden');
    const sk = tutEl.querySelector('.tut-skip');
    if (sk) sk.addEventListener('click', skipTutorial);
    clearTimeout(tutTimer);
    if (!opts.hold) tutTimer = setTimeout(() => tutEl.classList.add('hidden'), 4500);
  }
  ```
  (The `<button class="tut-x">×</button>` prepend and its click wiring are GONE. `hideTutBanner` should also `clearTimeout(tutTimer)`.)

- [ ] **Step 5: CSS.** In `styles.css` add a `#td-toast` block (top-center, translucent like `#td-tut`, `pointer-events:none`, small type; reuse the `.wave-num`/`.wave-role` type styles). Remove the `#td-msg .msg-x` rule (~486-487) and the `#td-tut .tut-x` rule (~950-952).

- [ ] **Step 6: Bust + test.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -3` → green.

- [ ] **Step 7: Headless — no start-choice modal, no × in DOM.**
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --window-size=1200,800 --virtual-time-budget=8000 --screenshot="$CLAUDE_JOB_DIR/tmp/fi2.png" \
    "http://localhost:8144/?tutorial=1#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  ```
  Expected: no error tokens; VIEW the screenshot — the tutorial runs straight into its opening banner (NO Play/Skip choice modal, no × button).

- [ ] **Step 8: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "td: transient toasts — drop the tutorial start-choice modal + the × buttons; override is a 3s toast"
  ```

---

### Task 3: Reframed opening — frozen laser "defend the heart"

**Files:**
- Modify: `src/td-tab.js` (`tutorial` object — add `frozen`; `tutorial.setup` ~1469-1558; the per-frame `frozen` var ~3575; the laser-fire hook ~2479; `tutorial.tick` ~1559 for the frozen safety timer)

**Interfaces:**
- Consumes: `tutBanner(html, {flash, skip, hold})` (Task 2 — use `hold: true` for the frozen prompt), `pulseButton('#td-pad-laser')`, `hideTutBanner`, `makeDotEnemy`, `openNeighbors`, `graph`, `dungeon`.
- Produces: `tutorial.frozen` (boolean) — read by the per-frame `frozen` gate so enemies + waves hold during the opening.

- [ ] **Step 1: Add the flag.** In the `tutorial` object literal (~1466, beside `phase`/`portal`/`fodder`) add `frozen: false,` and `frozenT: 0,`.

- [ ] **Step 2: Freeze the sim during the opening (per-frame `frozen` var ~3575).** Find `const frozen = buildFrozen() || revealLeft > 0;` and add the tutorial freeze:
  ```js
  const frozen = buildFrozen() || revealLeft > 0 || tutorial.frozen;
  ```
  (This gates `updateEnemies` — the 2 phage hold — and is already ANDed into the wave-clock guard.)

- [ ] **Step 3: Reframe `tutorial.setup` (~1469-1558).** Keep the gate-wipe (1473-1477) and the scripted far portal (1504-1529) as-is. Change:
  - The player start cell to NEAR the heart — replace the `d = 2..4` loop bound with `d = 1; d <= 2`:
    ```js
    for (let d = 1; d <= 2 && startCi === dungeon.heart; d++) {
      for (let i = 0; i < dungeon.tags.length; i++) {
        if (dungeon.tags[i] !== BLOCKED && dungeon.distToHeart[i] === d) { startCi = i; break; }
      }
    }
    ```
  - The fodder: spawn **2** phage in the lane just ahead of the tank (a couple hops farther from the heart), NOT from the far portal. Replace the `for (let k = 0; k < 3; k++)` fodder block (1531-1549):
    ```js
    // 2 phage a couple hops out in the lane ahead, marching toward the heart
    this.fodder = [];
    const spec = ENEMY_SPEC.phage;
    const sd = dungeon.distToHeart[startCi];
    const ahead = [];
    for (let i = 0; i < dungeon.tags.length && ahead.length < 2; i++) {
      if (dungeon.tags[i] === BLOCKED) continue;
      const d = dungeon.distToHeart[i];
      if (d >= sd + 2 && d <= sd + 4) ahead.push(i);
    }
    while (ahead.length < 2) ahead.push(this.portal.ci); // degenerate fallback
    for (let k = 0; k < 2; k++) {
      const ci = ahead[k];
      const eObj = makeDotEnemy('phage', { walker: CREATURE_TINTS.phage, walkerHi: 0xffffff });
      const size = spec.size * 0.7; const scale0 = cellSide * size;
      eObj.scale.setScalar(scale0); eObj.userData.s0 = scale0; scene.add(eObj);
      const nx = openNeighbors(ci);
      const e = {
        type: 'phage', spec, scale0, size,
        cur: ci, prev: -1,
        next: nx.length ? nx[Math.floor(whim() * nx.length)] : ci,
        prog: whim() * 0.4, pos: graph.centers[ci].slice(), dir: [0, 1, 0],
        obj: eObj, alive: true, phase: whim() * 6.283,
        hp: spec.hp, behMult: 1, behUntil: -1, touchCd: -1, slowFactor: 1, slowUntil: -1,
      };
      enemies.push(e); this.fodder.push(e);
    }
    ```
  - The opening banner + freeze + laser pulse — replace the `tutBanner('PROTECT THE HEART!', …)` + the 1800ms `setTimeout` swap (1550-1557):
    ```js
    this.frozen = true; this.frozenT = 0;
    tutBanner('SHOOT TO DEFEND THE HEART', { flash: true, hold: true, skip: !!safeSeen() });
    pulseButton('#td-pad-laser');
    this.tShown = 0; this.phase = 'ram';
    ```
    (The `ram` phase's clear→portal transition in `tick` is unchanged — it still spawns shells + pulses `#td-pad-fire` when the 2 phage die.)

- [ ] **Step 4: First laser shot unfreezes (laser-fire hook ~2479).** At the point `const wantFire = keys.laser && guns && !player.won;` add, right after it:
  ```js
  if (wantFire && tutorial.frozen) { tutorial.frozen = false; hideTutBanner(); }
  ```

- [ ] **Step 5: Safety unfreeze (~4s) in `tutorial.tick`.** At the TOP of `tutorial.tick(dt)` (before the phase branches):
  ```js
  if (this.frozen) { this.frozenT += dt; if (this.frozenT > 4) { this.frozen = false; hideTutBanner(); } return; }
  ```
  (While frozen, the tutorial doesn't advance phases; the safety timer + the laser hook both clear it.)

- [ ] **Step 6: Bust + test.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -3` → green.

- [ ] **Step 7: Headless — the frozen laser opening.**
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --window-size=1200,800 --virtual-time-budget=3000 --screenshot="$CLAUDE_JOB_DIR/tmp/fi3.png" \
    "http://localhost:8144/?tutorial=1#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  ```
  Expected: no error tokens; VIEW the screenshot — the tank sits near the heart, 2 phage are in the lane ahead, the **laser** button is pulsing, and the banner reads **"SHOOT TO DEFEND THE HEART"** (still up — the field is frozen; short virtual-time budget so the 4s safety hasn't fired). Confirm in the report that the enemies are held (frozen) and the laser (not fire) is the pulsed button.

- [ ] **Step 8: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "td tutorial: frozen laser opening — tank by the heart, 2 enemies, 'SHOOT TO DEFEND THE HEART'"
  ```

---

### Task 4: "WAVE OVER" beat + anticipation timer (clear-gated + cap)

**Files:**
- Modify: `src/td-tab.js` (wave state near ~185; params ~61; GUI slider ~3529; first-wave seeds ~2216 + ~3498; `spawnWave` ~2261; the wave-clock block ~3617-3625; `updateNextPreview` ~1970-1972; `endTutorial` handoff)

**Interfaces:**
- Consumes: `showToast` (Task 2), `spawnWave`, `enemies`, `spawnPoints`, `computeWavePlan` (preview), `buildFrozen`, `revealLeft`.
- Produces: `waveActive`/`interClock`/`waveAge` state; `params.waveGap`/`params.waveCap` (replacing `params.waveEvery`).

- [ ] **Step 1: Wave state (near `let waveClock = 0;` ~185).** Add:
  ```js
  let waveActive = false; // a wave's enemies are live/uncleared
  let interClock = 0;     // anticipation countdown between waves
  let waveAge = 0;        // seconds since the current wave spawned (safety cap)
  ```
  (`waveClock` may become unused after this task — if so, remove it and its resets; grep `waveClock`.)

- [ ] **Step 2: Params (~61).** Replace `waveEvery: 16,` with:
  ```js
  waveGap: 7,   // seconds of anticipation between a cleared wave and the next
  waveCap: 30,  // safety: force the next wave if the current isn't cleared in time
  ```

- [ ] **Step 3: GUI sliders (~3529).** Replace the `waveEvery` slider with:
  ```js
  gui.add(params, 'waveGap', 3, 20, 1).name('wave gap (s)');
  gui.add(params, 'waveCap', 15, 60, 1).name('wave cap (s)');
  ```

- [ ] **Step 4: spawnWave marks the wave active (~2261, near `wave++`).** Add `waveActive = true; waveAge = 0;` right after `wave++;`.

- [ ] **Step 5: First-wave / expansion seeds.** At the round reset (~2216, was `waveClock = params.waveEvery * 0.6;`) → `waveActive = false; waveAge = 0; interClock = params.waveGap * 0.5;` (opening wave after ~half a gap). At the post-expand seed (~3498, was `waveClock = params.waveEvery * 0.5;`) → `waveActive = false; interClock = 0;`.

- [ ] **Step 6: Rewrite the wave-clock block (~3617-3625).**
  ```js
  if (!player.won && !frozen && !tutorialActive) {
    if (waveActive) {
      waveAge += dt;
      if (enemies.every((e) => !e.alive)) {
        waveActive = false; interClock = 0;
        showToast(`<div class="wave-num">WAVE ${wave} CLEARED</div>` +
          `<div class="wave-role">brace — the next wave is coming</div>`, 2200);
      } else if (waveAge >= params.waveCap && spawnPoints.some((s) => s.alive)) {
        spawnWave(); // safety: the field is stalled — send the next wave anyway
      }
    } else if (spawnPoints.some((s) => s.alive)) {
      interClock += dt;
      if (interClock >= params.waveGap) spawnWave();
    }
  }
  ```

- [ ] **Step 7: Preview copy (updateNextPreview ~1970-1972).** Replace the `frozen`/`when` lines:
  ```js
  const frozen = buildFrozen() || revealLeft > 0;
  let when;
  if (frozen) when = 'ready · leave BUILD to engage';
  else if (waveActive && !enemies.every((e) => !e.alive)) when = 'clear the field';
  else when = `in ${Math.max(0, Math.ceil(params.waveGap - interClock))}s`;
  ```

- [ ] **Step 8: Tutorial handoff.** In `endTutorial` (grep `function endTutorial`), after it sets `tutorialActive = false`, add: `waveActive = enemies.some((e) => e.alive); waveAge = 0; interClock = 0;` so normal pacing resumes cleanly from the tutorial's live wave.

- [ ] **Step 9: Bust + test.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -3` → green. Grep `waveEvery` across `src/` — ZERO references remain.

- [ ] **Step 10: Headless — pacing wires up.**
  ```bash
  for u in "tutorial=0" "tutorial=0&wave=1" "tutorial=1"; do
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
      --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
      --window-size=1200,800 --virtual-time-budget=9000 \
      --screenshot="$CLAUDE_JOB_DIR/tmp/fi4-$RANDOM.png" \
      "http://localhost:8144/?$u#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  done
  ```
  Expected: no error tokens across all three. VIEW the `tutorial=0` shot — the `#td-next` strip shows either `clear the field` (wave live) or `in Ns` (between waves). In the report, reason through: a wave spawns → clearing it shows "WAVE n CLEARED" → the gap counts down → next wave; the cap forces a wave if uncleared; the tutorial still runs.

- [ ] **Step 11: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "td: clear-gated wave pacing — WAVE OVER beat + anticipation gap (waveGap) with a safety cap (waveCap)"
  ```

---

### Task 5: Docs

**Files:**
- Modify: `HOW-IT-WORKS.md`, `DEVLOG.md`

- [ ] **Step 1: HOW-IT-WORKS.md — append.**
  ```markdown
  ## First impressions: a frozen opening, patience, and manual by default

  The tutorial now opens on a held tableau — your tank just ahead of the heart,
  two enemies in the lane, the laser pulsing, "SHOOT TO DEFEND THE HEART." Your
  first shot unfreezes it into live combat, then shells and towers follow.
  Guidance is transient now: brief toasts that fade on their own, no × to
  dismiss and no modal to stop the game. Drive starts in MANUAL and stays there
  — the tank is yours until you tap a directive to hand it to auto, and taking
  the wheel always takes it back. And waves breathe: clear the field and a
  "WAVE OVER" beat plays, then a countdown of anticipation before the next
  wave — with a safety timer so a stalled field can't freeze the war.
  ```

- [ ] **Step 2: Final headless sweep.**
  ```bash
  ./scripts/bust.sh --quiet && npm test 2>&1 | tail -3
  for u in "tutorial=1" "tutorial=0" "tutorial=0&wave=1"; do
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
      --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
      --window-size=1200,800 --virtual-time-budget=9000 \
      --screenshot="$CLAUDE_JOB_DIR/tmp/fi5-$RANDOM.png" \
      "http://localhost:8144/?$u#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  done
  ```
  Expected: `npm test` green, no error tokens.

- [ ] **Step 3: Commit HOW-IT-WORKS, capture hash H.**
  ```bash
  git add HOW-IT-WORKS.md
  git commit -m "td: HOW-IT-WORKS — first impressions (frozen opening, toasts, manual mode, wave pacing)"
  git log -1 --format=%h   # note hash H
  ```

- [ ] **Step 4: DEVLOG.md — prepend a newest-first entry** (top of the list, after the intro/`---`), substituting the real H:
  ```markdown
  ## `<H>` — First impressions

  The TD open got a rewrite for the first thirty seconds. The tutorial starts
  frozen — tank by the heart, two enemies in the lane, the laser lit, "SHOOT TO
  DEFEND THE HEART"; the first shot thaws it. All the guidance is transient
  toasts now (no × buttons, no start-choice modal, nothing that pauses the
  game). Drive is MANUAL by default and sticky — auto is opt-in through the
  directive chip and any input reclaims the wheel, with the idle auto-resume
  timer gone. And waves are clear-gated: clearing the field plays a WAVE OVER
  beat, then an anticipation countdown (waveGap) before the next wave, with a
  waveCap safety so the war never stalls.
  ```
  ```bash
  git add DEVLOG.md
  git commit -m "devlog: <H> — td first impressions"
  ```
  Do NOT push — the controller pushes after the final review + deban sync.

---

## Final acceptance checklist

- [ ] `npm test` green.
- [ ] Drive starts MANUAL and is sticky; the directive chip is the only path into AUTO; any WASD reclaims manual; no `autoResume`/`manualClock`/idle-timer remains.
- [ ] No start-choice modal; no `×` buttons; tutorial/override guidance are transient toasts that fade (~3-4.5s); the frozen-opening prompt holds until the first laser shot.
- [ ] Tutorial opens frozen with the tank by the heart, 2 enemies ahead, the laser pulsing, "SHOOT TO DEFEND THE HEART"; first laser shot (or a 4s safety) unfreezes; then shells → build as before.
- [ ] Waves are clear-gated: clear → "WAVE OVER" beat → `waveGap` countdown → next wave; `waveCap` forces the next wave if stalled; `#td-next` shows "clear the field" vs "in Ns"; no `waveEvery` remains.
- [ ] All bust output committed atomically; vendor imports token-free; pre-push guard passes.
- [ ] DEVLOG + HOW-IT-WORKS entries present.
