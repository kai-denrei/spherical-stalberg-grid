# TD onboarding + auto-resume + manual-override + build pan — design

2026-08-25. Four TD tweaks requested together after the missile/portal/pinch
batch shipped. All four live in `src/td-tab.js` (+ `styles.css`); no
pure-core (`towers.js`/`dungeon.js`/etc.) changes, so `npm test` is a
regression guard only.

## Decisions (from brainstorm, all approved)

1. **Tutorial start-choice modal + a banner ×** ("Both"). When the tutorial
   would auto-run, show a choice modal FIRST (Play / Skip / ×); and give the
   in-tutorial banner its own corner × to bail mid-way.
2. **Auto-resume 10s + immediate on directive.** Idle-resume default 3→10s;
   selecting an Auto directive hands control back to auto immediately.
3. **Rename "TANK" → "MANUAL" + override modal on EVERY switch.** The mode
   chip reads MANUAL; switching into manual drive shows a "TANK · MANUAL
   OVERRIDE" modal explaining the tank is autonomous until you take over.
4. **Build camera flick-to-pan within a limit.** Single-finger drag pans the
   overhead center across the sphere (replacing the twist/orbit); clamped to
   a max radius off the heart with elastic ease-back; pinch still zooms.

## Verified integration map (line refs, current state)

- **Tutorial start flow:** init end (`td-tab.js:3774`):
  `if (runTutorial) maybeStartTutorial(); else if (!debugging) showBriefing();`
  So when the tutorial runs, the normal briefing is SKIPPED. `maybeStartTutorial`
  (1602) → `startTutorial` (1578) → `tutorial.setup()` (1435). `endTutorial`
  (1583) sets `td.tutorialSeen`. `skipTutorial` (1589) tears down scripted
  entities + `regenerate()`. Banner via `tutBanner(html, {flash, skip})`
  (1410) — currently only shows a `.tut-skip` button, and only when
  `safeSeen()` (1426) is truthy.
- **Modal machinery:** one `msgEl` (`#td-msg`, 1621) with click delegation
  (1623–1632) dispatching on button classes (`msg-begin`, `msg-glenemy`,
  `msg-glfriend`, `msg-back`, `msg-regen`, `msg-next`). `msg-begin` (1628):
  `paused=false; msgEl.classList.add('hidden')`. Modals set `paused=true` +
  `innerHTML` + remove `.hidden`. `spriteShot('tank', unitIcon('tank',
  look().walker))` (1638/1675) gives the real dotted-tank icon for flair.
- **Auto-resume:** `params.autoResume: 3` (55); `manualActive = () =>
  manualClock < params.autoResume` (484); `manualClock` reset to 0 each frame
  while any drive key or `cruise` is held (1043); `steerHold`/`steeringActive`
  (479–480, `<1.2`). GUI slider `gui.add(params,'autoResume',1,10,0.5)` (3429).
  Directive chip handler (1327–1333) cycles `params.directive` through
  `DIRECTIVES` (818) and calls `directiveCtrl.updateDisplay()` (3427) +
  `syncDirectiveChip()`. Directive shapes auto behavior in `chooseNext`
  (~977) only when NOT steering/manual; it does not flip mode today.
- **Mode chip + toggle:** `toggleBuild` (832) flips `buildMode`, calls
  `syncBuildUi` (839). Chip text set at 843: `buildMode ? 'TANK' : 'BUILD'`.
  No modal on switch. `.build` root class hides driving controls.
- **Build camera:** `buildYaw` (828), `buildDist=2.0` (829). `updateCameraGoal`
  build branch (908–919): `poleFrame()` → `hn,t1,t2`; `up = cos(buildYaw)t1 +
  sin(buildYaw)t2`; `eye = hn*buildDist`; `lookAt(0,0,0)`. Always centered on
  the heart pole — no pan. Pointer handlers (1342–1399): `buildPointers` Map,
  single-finger `buildYaw += dx*0.006` (1372), two-finger pinch zoom (1360),
  `≤8px` tap → `cellAtScreen`→`openShop` (1379). Bastion tower-select branch
  (1382). `cellAtScreen` (≈3337) raycasts the LIVE `camera` → cell index, so
  it is correct at any camera pose (pan needs no pick change).

## Section 1 — tutorial start-choice modal + banner ×

- New `showTutorialChoice()` builds a modal in `msgEl` (`paused=true`): a
  short pitch + a primary **Play Tutorial** (`.msg-tut-play`), a **Skip
  Tutorial** (`.msg-tut-skip`), and a corner **×** (`.msg-tut-x`). Use the
  dotted-tank sprite for flair.
- Init (3774): replace `maybeStartTutorial()` with `showTutorialChoice()` so
  the choice appears in place of the auto-start (no briefing stacking).
- Delegation (add to 1623 block):
  - `.msg-tut-play` → `msgEl.hide(); paused=false; startTutorial();`
  - `.msg-tut-skip` / `.msg-tut-x` → mark `td.tutorialSeen`; `showBriefing()`
    (fall through to the NORMAL briefing/round — the tutorial world was never
    set up, so nothing to tear down). This is the clean skip path at start.
- In-tutorial banner ×: `tutBanner` always renders a corner `.tut-x` wired to
  `skipTutorial` (mid-tutorial bail). The existing `.tut-skip` button stays.
- `?tutorial=1` still forces the choice; `?tutorial=0` / debug hooks suppress
  it (unchanged gate on `runTutorial`).

## Section 2 — auto-resume 10s + immediate on directive

- `params.autoResume: 3 → 10` (55). Slider max `10 → 15` (3429:
  `gui.add(params,'autoResume',1,15,0.5)`), so 10 isn't pinned at the edge.
- Directive chip handler (1327–1333): after switching directive, force auto
  to resume THIS frame — `manualClock = params.autoResume; steerHold = 1.2;
  cruise = false;` (pushes `manualActive()`/`steeringActive()` false and
  drops cruise so the wanderer takes the new order immediately).

## Section 3 — rename TANK→MANUAL + override modal (every switch)

- Chip label (843): `buildMode ? 'TANK' : 'BUILD'` → `buildMode ? 'MANUAL'
  : 'BUILD'`.
- New `showOverrideModal()` (`paused=true`): title **⬢ TANK · MANUAL
  OVERRIDE**, the dotted-tank sprite, copy: *your tank fights on its own — it
  patrols, rams, and follows directives. Touch the controls to TAKE OVER;
  release and it resumes command in ~10s.* One **Got it** button
  (`.msg-ovr-ok`) + a corner **×** (`.msg-ovr-ok`). Dismiss → `paused=false;
  msgEl.hide()`.
- `toggleBuild` (832): after `syncBuildUi()`, if now in manual drive
  (`!buildMode`) call `showOverrideModal()` — fires on EVERY BUILD→MANUAL
  switch (keyboard B and the chip both route through `toggleBuild`). Pauses
  the war while shown so you can read it un-rammed.
- Delegation: add `.msg-ovr-ok` → close (`paused=false; msgEl.hide()`).

## Section 4 — build camera flick-to-pan within a limit

- New `let buildCenter = null;` (unit vec = the overhead point). On entering
  build mode (`toggleBuild` when `buildMode` becomes true), reset
  `buildCenter = poleFrame().hn.slice()` (start centered on the heart).
- `updateCameraGoal` build branch (908–919): `eye = buildCenter * buildDist`;
  `lookAt(0,0,0)`; **stable up** = the heart pole projected into the tangent
  plane at `buildCenter` (`up = normalize(hn − (hn·c)c)`; if degenerate at the
  start where `c≈hn`, fall back to `t1`) — so panning never spins the view.
  `buildYaw` and the cos/sin up are removed.
- Pan input: single-finger `pointermove` in build mode replaces the yaw line.
  Build a tangent basis at `buildCenter` (`right = normalize(cross(up, c))`,
  `up2 = cross(c, right)`), nudge `c` in the tangent plane by the drag delta
  and renormalize (small-angle rotation): grab-the-map feel — dragging the
  finger moves the world WITH it (verify sign: content follows finger; flip
  if inverted). Pan speed scales with `buildDist` so it feels constant across
  zoom.
- Clamp + ease-back: `ang = acos(clamp(dot(c, hn)))`. Hard ceiling while
  dragging (`≈0.9 rad`) so it can't fly off. Max resting radius `MAXR ≈ 0.6
  rad`. In `updateCameraGoal`, when NOT dragging (no build pointer down) and
  `ang > MAXR`, ease `buildCenter` toward the boundary point
  (`slerp(hn→c, MAXR/ang)`) each frame — elastic return to the limit.
- Pinch zoom `[1.4,4.0]` (1360–1366) and wheel unchanged. Tap `≤8px` →
  `cellAtScreen`→`openShop` unchanged (raycasts live camera, correct at any
  pan/zoom). Bastion tap branch unchanged.

## Section 5 — testing, docs, scope

**Files:** `src/td-tab.js` (all four), `styles.css` (tutorial banner × +
modal button styling if needed), `HOW-IT-WORKS.md`, `DEVLOG.md`.

**Testing.** No new Node tests (render/input/tutorial layer; pure cores
untouched — `npm test` stays green). Headless (SwiftShader +
`--enable-logging=stderr`, serve :8144):
- `?tutorial=1#td` — start-choice modal renders (Play/Skip/×); no JS errors.
- After Play, tutorial banner shows a corner ×; after Skip, the normal
  briefing shows.
- `?tutorial=0#td`, toggle build→manual — MANUAL chip + override modal render.
- `?tutorial=0&mode=build#td` — build enters centered on the heart; a
  simulated pan offsets the center then eases back within the limit
  (screenshot + code-review the clamp/ease math; multi-touch isn't
  scriptable). Cells stay tappable.
- No error tokens in any run. `./scripts/bust.sh --quiet` after edits
  (pre-push token guard enforces atomic commits). DEVLOG + HOW-IT-WORKS.

## Out of scope

- Two-finger twist/rotate in build mode (dropped — pan only).
- Any change to the action/driving camera, the tank-tab.js game, or the
  fired-projectile model.
- First-time-only / once-per-session gating of the override modal (chose
  every-switch; the fallback is noted but not built).
- Enemy/economy rebalance; the deferred cinematic lock-screen camera.
