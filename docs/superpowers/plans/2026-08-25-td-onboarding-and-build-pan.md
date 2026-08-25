# TD onboarding + auto-resume + manual-override + build pan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four TD-tab tweaks — a tutorial start-choice modal + banner ×, a calmer auto-resume (10s, or immediate on directive), a TANK→MANUAL rename with an "autonomous until override" modal, and a flick-to-pan build camera clamped to a radius.

**Architecture:** All changes are in `src/td-tab.js` (render/input/tutorial layer) plus small `styles.css` additions. No pure-core modules change. Modals reuse the existing single `#td-msg` element + its click-delegation dispatcher. The build camera gains a `buildCenter` unit vector that the drag pans and an ease-back clamps.

**Tech Stack:** Vanilla ES modules, Three.js (vendored), no build step.

## Global Constraints

- **Do NOT push in any task — commits stay LOCAL; the controller pushes once at the very end after the final review + deban sync.**
- After editing `src/*.js` / HTML / CSS: run `./scripts/bust.sh --quiet`, then commit ALL of its output atomically (`git add -A`). NEVER put a `?v=` token on `../vendor/` imports. The pre-push guard (`scripts/check-tokens.sh`) fails on split/mismatched tokens.
- `npm test` must stay green (pure cores are untouched; it is a regression guard).
- Deterministic game logic only — NO `Math.random` (seeded `whim()` exists; none of these tasks need randomness).
- Commit trailer (exact two lines) on EVERY commit:
  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01QH1hQk64Cw4ZwpAi59Pnat
  ```
- Headless verify: Chrome `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr`, serve on :8144 (`npm run serve &` if not already up). Anchor edits on the CODE shown; line numbers may drift (td-tab.js ≈3560 lines).

---

### Task 1: Auto-resume 10s + immediate on directive

**Files:**
- Modify: `src/td-tab.js` (~line 55, ~3429, ~1327-1333)

**Interfaces:**
- Consumes: `params.autoResume`, module vars `manualClock`, `steerHold`, `cruise` (all mutable `let`/object fields already in scope at the directive handler); `manualActive = () => manualClock < params.autoResume` (484), `steeringActive = () => steerHold < 1.2` (480).
- Produces: nothing new.

- [ ] **Step 1: Raise the idle default.** At `src/td-tab.js:55`:
  ```js
  autoResume: 10, // seconds idle before auto-wander resumes
  ```
  (was `autoResume: 3,`)

- [ ] **Step 2: Widen the slider so 10 isn't pinned at the max.** At `src/td-tab.js:3429`:
  ```js
  gui.add(params, 'autoResume', 1, 15, 0.5).name('auto resume (s)');
  ```
  (was `1, 10, 0.5`)

- [ ] **Step 3: Selecting a directive hands control back to auto immediately.** In the directive chip handler (currently 1327-1333), append three lines after `updateHud();`:
  ```js
  root.querySelector('#td-pad-dir').addEventListener('click', () => {
    const i = DIRECTIVES.indexOf(params.directive);
    params.directive = DIRECTIVES[(i + 1) % DIRECTIVES.length];
    directiveCtrl.updateDisplay();
    syncDirectiveChip();
    updateHud();
    // picking a directive is an AUTO order — resume auto this frame, no idle wait
    manualClock = params.autoResume;
    steerHold = 1.2;
    cruise = false;
  });
  ```
  Verify `cruise` is the module-level `let` (set false elsewhere at ~1319); if it lives under a different name, use that name.

- [ ] **Step 4: Bust + regression test.**
  ```bash
  ./scripts/bust.sh --quiet && npm test 2>&1 | tail -3
  ```
  Expected: all suites green.

- [ ] **Step 5: Headless smoke — no errors.**
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --virtual-time-budget=6000 --screenshot="$CLAUDE_JOB_DIR/tmp/tdx1.png" \
    "http://localhost:8144/?tutorial=0#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  ```
  Expected: no output (start `npm run serve &` first if the URL 404s).

- [ ] **Step 6: Commit (LOCAL, no push).**
  ```bash
  git add -A
  git commit -m "td: auto-resume 10s + instant resume when a directive is picked"
  ```

---

### Task 2: Rename TANK→MANUAL + Manual Override modal (every switch)

**Files:**
- Modify: `src/td-tab.js` (chip label ~843; `toggleBuild` ~832-836; new `showOverrideModal` near the other modal fns ~1750; msgEl delegation ~1623-1632)
- Modify: `styles.css` (add a shared `.msg-x` close-button style)

**Interfaces:**
- Consumes: `msgEl` (`#td-msg`), `paused`, `glossCard(color,iconUrl,name,desc)` (1678), `spriteShot('tank', unitIcon('tank', look().walker))` (1638/1675), `syncBuildUi()`, `updateHud()`.
- Produces: `showOverrideModal()` (called from `toggleBuild`); the `.msg-x` CSS class (Task 3 reuses it); delegation class `msg-ovr-ok`.

- [ ] **Step 1: Rename the chip label.** At `src/td-tab.js:843`:
  ```js
  if (chip) chip.textContent = buildMode ? 'MANUAL' : 'BUILD';
  ```
  (was `'TANK'`)

- [ ] **Step 2: Fire the modal when entering manual drive.** Replace `toggleBuild` (832-836):
  ```js
  function toggleBuild() {
    buildMode = !buildMode;
    syncBuildUi();
    updateHud();
    if (!buildMode) showOverrideModal(); // just switched INTO manual drive
  }
  ```

- [ ] **Step 3: Add the modal.** Insert `showOverrideModal()` right after `showFriendGlossary()` (ends ~1750), before `updateHud`:
  ```js
  // switching into manual drive: remind the player the tank is autonomous
  // until they take the wheel. Shown on EVERY build→manual switch (pauses
  // the war so it can be read un-rammed).
  function showOverrideModal() {
    paused = true;
    msgEl.innerHTML = `<button class="msg-ovr-ok msg-x">×</button>` +
      `<div class="msg-head">⬢ tank · manual override</div>` +
      `<div class="msg-scroll"><div class="gcards">` +
      glossCard('#9fdcff', spriteShot('tank', unitIcon('tank', look().walker)), 'your tank',
        'fights on its own — it patrols, rams, and follows your directive') +
      `</div>` +
      `<div class="tips">Touch the controls to <b>TAKE OVER</b>. Let go and it resumes command in ~10s.<br>Tap a directive to hand command back instantly.</div>` +
      `</div>` +
      `<div class="msg-foot"><button class="msg-ovr-ok">&rsaquo; got it</button></div>`;
    msgEl.classList.remove('hidden');
  }
  ```

- [ ] **Step 4: Dismiss handler.** In the msgEl delegation block (1623-1632), add one branch (before the closing `});`):
  ```js
  else if (cl.contains('msg-ovr-ok')) { paused = false; msgEl.classList.add('hidden'); }
  ```

- [ ] **Step 5: Close-button style.** In `styles.css`, first confirm `#td-msg` establishes a positioning context — if it lacks `position: relative`/`absolute`, add `position: relative;` to its rule. Then append:
  ```css
  #td-msg .msg-x { position: absolute; top: 8px; right: 12px; width: 30px; height: 30px;
    padding: 0; line-height: 28px; text-align: center; font-size: 20px; border-radius: 6px; }
  ```

- [ ] **Step 6: Bust + test.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -3` → green.

- [ ] **Step 7: Headless verify the modal + chip.**
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --virtual-time-budget=6000 --screenshot="$CLAUDE_JOB_DIR/tmp/tdx2.png" \
    "http://localhost:8144/?tutorial=0&mode=build#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  ```
  Expected: no error tokens. (The `mode=build` boot then a build→manual toggle is where the modal fires; a clean load with no errors is the headless bar — the modal itself is exercised by code review since toggling needs interaction.)

- [ ] **Step 8: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "td: rename TANK chip to MANUAL + autonomous-until-override modal on every switch"
  ```

---

### Task 3: Tutorial start-choice modal + in-tutorial banner ×

**Files:**
- Modify: `src/td-tab.js` (new `showTutorialChoice` near the modal fns; `tutBanner` ~1410; init call ~3774; msgEl delegation ~1623-1632)
- Modify: `styles.css` (a `.tut-x` style; reuses `.msg-x` from Task 2)

**Interfaces:**
- Consumes: `msgEl`, `paused`, `glossCard`, `spriteShot('tank', …)`, `startTutorial()` (1578), `showBriefing()` (1695), `skipTutorial()` (1589), `tutEl` (`#td-tut`), `runTutorial`, `debugging`. The `.msg-x` style from Task 2.
- Produces: `showTutorialChoice()`; delegation classes `msg-tut-play`, `msg-tut-skip`, `msg-tut-x`; banner `.tut-x`.

- [ ] **Step 1: Add the start-choice modal.** Insert near the other modal fns (e.g. right after `showOverrideModal` from Task 2):
  ```js
  // shown in place of the tutorial auto-start: choose to play it or skip
  // straight into the normal briefing. The × is a skip.
  function showTutorialChoice() {
    paused = true;
    msgEl.innerHTML = `<button class="msg-tut-x msg-x">×</button>` +
      `<div class="msg-head">transmission · tutorial</div>` +
      `<div class="msg-scroll"><div class="gcards">` +
      glossCard('#9fdcff', spriteShot('tank', unitIcon('tank', look().walker)), 'first time?',
        'a quick run: ram the fodder, grab shells, kill the portal, build a tower') +
      `</div></div>` +
      `<div class="msg-foot">` +
      `<button class="msg-tut-play">&rsaquo; play tutorial</button> ` +
      `<button class="msg-tut-skip">skip</button>` +
      `</div>`;
    msgEl.classList.remove('hidden');
  }
  ```

- [ ] **Step 2: Show it in place of the auto-start.** At `src/td-tab.js:3774`:
  ```js
  if (runTutorial) showTutorialChoice();
  else if (!debugging) showBriefing();
  ```
  (was `if (runTutorial) maybeStartTutorial();`) `maybeStartTutorial` may become unused — leave it defined (harmless) or delete it; do not change `startTutorial`.

- [ ] **Step 3: Delegation for the three choices.** In the msgEl delegation block, add:
  ```js
  else if (cl.contains('msg-tut-play')) { paused = false; msgEl.classList.add('hidden'); startTutorial(); }
  else if (cl.contains('msg-tut-skip') || cl.contains('msg-tut-x')) {
    try { localStorage.setItem('td.tutorialSeen', '1'); } catch (e) { /* private mode */ }
    showBriefing(); // the tutorial world was never set up — go to the normal briefing
  }
  ```
  (Order note: these `cl.contains` checks are independent of Task 2's `msg-ovr-ok`; the shared `msg-x` class is styling-only, dispatch keys off the specific `msg-tut-x`/`msg-ovr-ok` classes.)

- [ ] **Step 4: Banner gets a corner ×.** Replace `tutBanner` (1410-1417):
  ```js
  function tutBanner(html, opts = {}) {
    tutEl.className = opts.flash ? 'tut-flash' : '';
    tutEl.innerHTML = '<button class="tut-x">×</button>' + html + (opts.skip
      ? '<div><button class="tut-skip">skip tutorial</button></div>' : '');
    tutEl.classList.remove('hidden');
    const sk = tutEl.querySelector('.tut-skip');
    if (sk) sk.addEventListener('click', skipTutorial);
    const x = tutEl.querySelector('.tut-x');
    if (x) x.addEventListener('click', skipTutorial);
  }
  ```

- [ ] **Step 5: Banner × style.** In `styles.css`, ensure `#td-tut` has `position: relative;` (add to its rule if missing) and append:
  ```css
  #td-tut .tut-x { position: absolute; top: 4px; right: 8px; width: 24px; height: 24px;
    padding: 0; line-height: 22px; text-align: center; font-size: 16px; border-radius: 5px;
    background: rgba(0,0,0,0.3); pointer-events: auto; }
  ```

- [ ] **Step 6: Bust + test.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -3` → green.

- [ ] **Step 7: Headless verify the start-choice renders.**
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --virtual-time-budget=6000 --screenshot="$CLAUDE_JOB_DIR/tmp/tdx3.png" \
    "http://localhost:8144/?tutorial=1#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  ```
  Expected: no error tokens; VIEW the screenshot and confirm the tutorial choice modal (play tutorial / skip / ×) is on screen.

- [ ] **Step 8: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "td: tutorial start-choice modal (play/skip/x) + in-tutorial banner x"
  ```

---

### Task 4: Build camera flick-to-pan within a limit

**Files:**
- Modify: `src/td-tab.js` (vec helper check ~near other vec fns; `buildDist`/new state ~828-829; `toggleBuild` ~832; `updateCameraGoal` build branch ~908-919; build `pointermove` ~1354-1373)

**Interfaces:**
- Consumes: `poleFrame()` → `{hn, t1, t2}` (arrays, 851); vec helpers `add3`, `scale3`, `norm3`, `dot3` (already used in the build branch); `buildPointers` Map, `buildDist`, `tapStart`, `pinched`; `camGoal`, `tmpCam`.
- Produces: module state `buildCenter` (unit-vector array), `BUILD_MAXR`, `BUILD_CEIL`, and a `cross3` helper if one doesn't already exist.
- Note: `toggleBuild` was already edited by Task 2 (it now ends with `if (!buildMode) showOverrideModal();`). Add the buildCenter line to THAT version.

- [ ] **Step 1: Ensure a cross-product helper exists.** Grep for `cross3` / `cross`. If none is defined in td-tab.js or its imports, add near the other vec helpers (beside `add3`/`scale3`/`dot3`):
  ```js
  const cross3 = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
  ```

- [ ] **Step 2: Add pan state; drop `buildYaw`.** Around `src/td-tab.js:828-829`, remove `let buildYaw = 0;` and add:
  ```js
  let buildDist = 2.0;      // wheel/pinch zooms
  let buildCenter = null;   // unit vec: the surface point under the overhead cam (pan)
  const BUILD_MAXR = 0.6;   // max resting pan angle off the heart (rad)
  const BUILD_CEIL = 0.9;   // hard ceiling while dragging
  ```

- [ ] **Step 3: Reset the center on entering build.** In `toggleBuild` (the Task-2 version), add the center reset when entering build mode:
  ```js
  function toggleBuild() {
    buildMode = !buildMode;
    if (buildMode) buildCenter = poleFrame().hn.slice(); // start centered on the heart
    syncBuildUi();
    updateHud();
    if (!buildMode) showOverrideModal();
  }
  ```

- [ ] **Step 4: Rewrite the build camera branch.** Replace the `if (buildMode) { … }` block in `updateCameraGoal` (908-919):
  ```js
  if (buildMode) {
    const { hn, t1 } = poleFrame();
    if (!buildCenter) buildCenter = hn.slice();
    let c = buildCenter;
    // elastic return: when NOT dragging, ease the center back inside the radius
    const ang = Math.acos(Math.max(-1, Math.min(1, dot3(c, hn))));
    if (buildPointers.size === 0 && ang > BUILD_MAXR) {
      const f = BUILD_MAXR / ang;
      const b = norm3(add3(scale3(hn, 1 - f), scale3(c, f))); // boundary point toward hn
      buildCenter = norm3(add3(scale3(c, 0.85), scale3(b, 0.15)));
      c = buildCenter;
    }
    // stable up: heart pole projected into the tangent plane at c (no spin)
    let up = add3(scale3(hn, 1), scale3(c, -dot3(hn, c)));
    if (dot3(up, up) < 1e-6) up = t1.slice(); // degenerate at the start (c≈hn)
    up = norm3(up);
    const eye = scale3(c, buildDist);
    camGoal.pos.set(eye[0], eye[1], eye[2]);
    tmpCam.position.copy(camGoal.pos);
    tmpCam.up.set(up[0], up[1], up[2]);
    tmpCam.lookAt(0, 0, 0);
    camGoal.quat.copy(tmpCam.quaternion);
    return;
  }
  ```

- [ ] **Step 5: Pan on single-finger drag.** In the build `pointermove` handler (1354-1373), (a) compute BOTH deltas before updating `prev`, and (b) replace the `buildYaw += dx*0.006;` line with the pan. The single-finger portion becomes:
  ```js
  const prev = buildPointers.get(ev.pointerId);
  if (!prev) return;
  const dx = ev.clientX - prev.x;
  const dy = ev.clientY - prev.y;
  prev.x = ev.clientX; prev.y = ev.clientY;
  if (buildPointers.size >= 2) {
    // …unchanged pinch block…
  }
  if (tapStart && Math.hypot(ev.clientX - tapStart[0], ev.clientY - tapStart[1]) > 8) {
    tapStart = null; // it's a pan now
  }
  // flick-to-pan: grab the map — nudge the overhead center across the sphere
  if (buildCenter) {
    const { hn, t1 } = poleFrame();
    const c = buildCenter;
    let up = add3(scale3(hn, 1), scale3(c, -dot3(hn, c)));
    if (dot3(up, up) < 1e-6) up = t1.slice();
    up = norm3(up);
    const right = norm3(cross3(up, c));
    const k = buildDist * 0.0016; // px → tangent nudge, zoom-aware
    let nc = norm3(add3(c, add3(scale3(right, -dx * k), scale3(up, dy * k))));
    const a = Math.acos(Math.max(-1, Math.min(1, dot3(nc, hn))));
    if (a > BUILD_CEIL) { const f = BUILD_CEIL / a; nc = norm3(add3(scale3(hn, 1 - f), scale3(nc, f))); }
    buildCenter = nc;
  }
  ```
  Keep the existing `dx` used only here (the pinch block reads its own `p[]` distances, not `dx`). VERIFY the pan follows the finger (drag right → world moves right; drag down → world moves down); if inverted, flip the sign on the offending term. The `≤8px` tap threshold and the two-finger pinch/zoom must remain intact so a tap still places and a pinch still zooms.

- [ ] **Step 6: Bust + test.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -3` → green.

- [ ] **Step 7: Headless verify build enters centered, no errors.**
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --virtual-time-budget=8000 --window-size=1200,800 --screenshot="$CLAUDE_JOB_DIR/tmp/tdx4.png" \
    "http://localhost:8144/?tutorial=0&mode=build#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  ```
  Expected: no error tokens; VIEW the screenshot — the board is framed overhead the heart. In your report, TRACE the pan/clamp math (drag sign follows finger; hard ceiling caps drag at 0.9 rad; ease-back pulls the center to 0.6 rad when released; up-vector stays heart-aligned so no spin). Multi-touch/drag isn't headless-scriptable — this is a code-review verification plus the centered screenshot.

- [ ] **Step 8: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "td: build camera flick-to-pan within a radius (replaces twist), pinch still zooms"
  ```

---

### Task 5: Docs

**Files:**
- Modify: `HOW-IT-WORKS.md`, `DEVLOG.md`

- [ ] **Step 1: HOW-IT-WORKS.md — append.**
  ```markdown
  ## TD onboarding, calmer auto-drive, and a roaming build camera

  The tutorial now opens with a choice — play it or skip straight to the
  briefing — and you can bail any time from the × on the tutorial banner.
  The tank's auto-driver waits longer before taking back the wheel (~10s
  idle), and picking an Auto directive hands command over at once. The old
  "TANK" mode is now "MANUAL": switching to it pops a card reminding you the
  tank fights on its own until you grab the controls. And the build camera
  is no longer bolted to the heart — flick to pan across the sphere (within
  reach of home) and pinch to zoom, so you can mount towers anywhere.
  ```

- [ ] **Step 2: Final headless sweep.**
  ```bash
  ./scripts/bust.sh --quiet && npm test 2>&1 | tail -3
  for u in "tutorial=1" "tutorial=0" "tutorial=0&mode=build"; do
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
      --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
      --window-size=1200,800 --virtual-time-budget=8000 \
      --screenshot="$CLAUDE_JOB_DIR/tmp/tdx5-$RANDOM.png" \
      "http://localhost:8144/?$u#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
  done
  ```
  Expected: `npm test` green, no error tokens across all three.

- [ ] **Step 3: Commit HOW-IT-WORKS, capture hash H.**
  ```bash
  git add HOW-IT-WORKS.md
  git commit -m "td: HOW-IT-WORKS — onboarding, auto-resume, manual override, build pan"
  git log -1 --format=%h   # note hash H
  ```

- [ ] **Step 4: DEVLOG.md — prepend a newest-first entry** (at the TOP of the entry list, right after the intro/`---` block, above the current newest entry), substituting the real H:
  ```markdown
  ## `<H>` — Onboarding, patience, and a camera that roams

  Four TD tweaks. The tutorial greets you with a real choice — play or skip —
  and wears a × so you're never trapped in it. The auto-driver got patient:
  ~10 seconds of idle before it retakes the wheel, or instantly when you pick
  a directive. "TANK" became "MANUAL", and taking manual drive now says so —
  a card explaining the tank fights autonomously until you grab the controls.
  And build mode unbolted its camera from the heart: flick to pan across the
  planet (elastic within a radius of home), pinch to zoom, tap to place.
  ```
  Then:
  ```bash
  git add DEVLOG.md
  git commit -m "devlog: <H> — td onboarding/auto-resume/manual-override/build-pan"
  ```
  Do NOT push — the controller pushes after the final review + deban sync.

---

## Final acceptance checklist

- [ ] `npm test` green (no regressions).
- [ ] `?tutorial=1` opens a start-choice modal (play / skip / ×); Play runs the tutorial, Skip/× go to the normal briefing and set `td.tutorialSeen`.
- [ ] The in-tutorial banner shows a corner × that skips.
- [ ] `autoResume` default is 10 (slider 1–15); picking a directive resumes auto immediately.
- [ ] The mode chip reads MANUAL; every BUILD→MANUAL switch shows the override modal (Got it / ×), which pauses until dismissed.
- [ ] Build mode enters centered on the heart; single-finger drag pans (follows the finger), clamped to a radius with ease-back; pinch still zooms; tap still places (pixel-accurate at any pan/zoom).
- [ ] All bust output committed atomically; vendor imports token-free; pre-push guard passes at the end.
- [ ] DEVLOG + HOW-IT-WORKS entries present.
