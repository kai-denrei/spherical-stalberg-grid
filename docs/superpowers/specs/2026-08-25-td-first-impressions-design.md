# TD first impressions — tutorial, toasts, manual mode, wave pacing — design

2026-08-25. Four first-impression tweaks to the TD onboarding. All in the TD
layer (`src/td-tab.js` + `styles.css`). Pure cores untouched (`npm test` is a
regression guard).

## Decisions (from brainstorm, all approved)

1. **Reframed opening:** tank spawns just ahead of the heart, 2 enemies in the
   lane, field **frozen**, the **laser** button pulses with "SHOOT TO DEFEND
   THE HEART"; the first laser shot unfreezes into live combat. Then the
   existing portal (shells) → build beats follow.
2. **Transient toasts, no ×:** the tutorial/override modals become brief
   auto-hiding toasts (no pause, no × button). The Play/Skip start-choice
   modal is removed — the tutorial just runs (first-time only).
3. **No auto-resume:** drive starts in **MANUAL** and is sticky; **AUTO** is
   opt-in via the directive chip; any drive input returns to manual. The
   `autoResume` idle timer is deleted.
4. **"WAVE OVER" beat + anticipation timer:** waves are clear-gated — clear
   the field → a "WAVE {n} CLEARED" beat → a deliberate countdown
   (`WAVE_GAP`) → next wave; a `WAVE_CAP` safety timer forces the next wave if
   you stall.

## Verified integration map (recon)

- **Tutorial** (`tutorial` state machine, td-tab.js ~1464-1622): `setup()`
  starts the tank at distToHeart 2-4, spawns **3 phage** from a scripted
  portal ~25 hops out, sets `wave=1`, NOT frozen. Phases setup→ram→portal→
  build→done; banners via `tutBanner(html,{flash,skip})` (~1442) pulsing
  `#td-pad-fire`. Fire buttons: primary shell `#td-pad-fire` (click→`fire()`,
  ~1437); **secondary laser `#td-pad-laser`** (`holdButton(...,'laser')`
  ~1330; fires in animate via `keys.laser` ~2479, overheats).
- **Modals/toasts:** `showTutorialChoice` (~1808, sticky, `paused=true`,
  `.msg-tut-x/.msg-tut-play/.msg-tut-skip`), `showOverrideModal` (~1822,
  sticky, `paused=true`, `.msg-ovr-ok.msg-x`), `tutBanner` (~1442,
  non-freezing, renders `.tut-x`+`.tut-skip`). Transient pattern to copy:
  `announceWave` (4200ms auto-hide, ~1956) / `showTowerToast` (3000ms, ~1997)
  — non-pausing `setTimeout(()=>el.classList.add('hidden'), ms)`. CSS:
  `#td-msg .msg-x` (styles.css ~486), `#td-tut .tut-x` (~950). msgEl
  delegation for `msg-tut-*`/`msg-ovr-ok` (~1678-1682).
- **Manual/auto:** `manualClock` (~482, init 99), `manualActive = () =>
  manualClock < params.autoResume` (~483), `params.autoResume:10` (~54) +
  slider (~3527). `manualClock=(anyKey||cruise)?0:manualClock+dt` (~1057).
  Directive chip `#td-pad-dir` (~1337-1351): cycles `params.directive`, then
  `manualClock=params.autoResume; steerHold=1.2` (instant resume). Consumers
  of `manualActive()`: `autoGunner` (~1871), `updateSmoothDir` (~1244),
  `chooseNext` (~991). Start directive `'wander'` (~53) → starts in AUTO.
- **Wave clock** (animate ~3617): `if(!won&&!frozen&&!tutorialActive){
  waveClock+=dt; if(waveClock>=params.waveEvery && spawnPoints.some(alive)){
  waveClock=0; spawnWave(); }}`. `params.waveEvery:16` (~61); first wave
  `waveClock=waveEvery*0.6` (~2216). NO wave-over detection — rolling timer.
  `#td-next` `updateNextPreview` (~1959): `NEXT WAVE {wave+1} · in
  {ceil(waveEvery-waveClock)}s` + chip list; frozen → "ready · leave BUILD".

## Section 1 — reframed opening (laser, frozen)

- `tutorial.setup()`: place the tank **near the heart** (pick an open cell
  with `distToHeart` in 1..2, facing the outward lane). Spawn **2 phage**
  directly in the lane just ahead (close, marching in) — plus the scripted
  portal far out (kept for the portal phase). Set `tutorial.frozen = true`.
- **Frozen semantics:** while `tutorial.frozen`, `updateEnemies` and the wave
  clock do nothing (enemies hold position), but player movement, aim, and
  fire stay live. Pulse `#td-pad-laser`; banner **"SHOOT TO DEFEND THE
  HEART"** (holds — does not auto-hide — while frozen).
- **Unfreeze:** the first laser shot while `tutorial.frozen` clears it
  (hook where `keys.laser` fires, ~2479). Safety: also clear after ~4s so it
  can never stick. On unfreeze the banner fades; the 2 phage advance.
- Phase flow becomes setup(frozen)→**defend** (laser/ram the 2 phage)→portal
  (shells kill the scripted portal)→build→done. The portal/shell/build
  phases keep their current logic and pulses (`#td-pad-fire`, `#td-pad-build`).

## Section 2 — transient toasts, drop the ×

- **Remove `showTutorialChoice`** and its delegation branches. Init
  (`if (runTutorial) showTutorialChoice()`, ~3847) → `if (runTutorial)
  startTutorial()`. First-run only (localStorage `td.tutorialSeen`,
  unchanged). No Play/Skip modal, no pause.
- **`tutBanner`:** drop the `.tut-x` button (and the `#td-tut .tut-x` CSS).
  Keep the `.tut-skip` **text** link. Banners **auto-hide after ~4s**
  (`setTimeout` like the toasts) EXCEPT the frozen-opening prompt, which holds
  until unfreeze. The phase machine advances on its own triggers regardless of
  banner visibility.
- **`showOverrideModal` → transient toast:** add a dedicated non-pausing
  `<div id="td-toast" class="hidden">` (styled like `#td-tut`, `pointer-events:
  none`, its own `toastTimer`, ~3s auto-hide). `showOverrideModal` writes into
  it, no `paused`, no ×. Copy: **"MANUAL — you're driving. Tap a directive to
  hand the wheel to auto."** Remove the `.msg-ovr-ok`/`.msg-x` sticky wiring
  and the `#td-msg .msg-x` CSS.

## Section 3 — no auto-resume; manual sticky, auto opt-in

- Add `let autoMode = false;` (start MANUAL). Replace `manualActive` with
  `() => !autoMode`. Delete `manualClock`, `params.autoResume`, the slider,
  and the `manualClock=…` line in `advanceMotion`.
- **Directive chip** (`#td-pad-dir`): tapping sets `autoMode = true` AND
  cycles the directive; drop the `manualClock=…; steerHold=1.2` lines (replace
  with `autoMode = true`).
- **Drive input:** any WASD/cruise press sets `autoMode = false` (sticky). Put
  this where the old `manualClock=0` lived (~1057).
- Consumers (`autoGunner`, `updateSmoothDir`, `chooseNext`) read
  `manualActive()` = `!autoMode` unchanged. HUD shows `MANUAL`/`AUTO` from
  `autoMode`.

## Section 4 — "WAVE OVER" beat + anticipation timer

- New state: `let waveActive = false;` (a wave's enemies are live/uncleared),
  `let interClock = 0;` (anticipation countdown), `let waveAge = 0;` (seconds
  since the current wave spawned). **Replace `params.waveEvery` with two
  GUI-tunable params `waveGap: 7` (anticipation countdown) and `waveCap: 30`
  (safety force).** Update the two GUI sliders (`waveEvery` slider → a
  `waveGap` slider 3-20 and a `waveCap` slider 15-60) and the first-wave seed
  (`waveClock=waveEvery*0.6` → seed `interClock` for a short opening gap).
- **Loop (replaces the rolling-timer block ~3617):** when `!won && !frozen &&
  !tutorialActive`:
  - if `waveActive`: `waveAge += dt`. If the field is clear
    (`enemies.every(e=>!e.alive)`) → `waveActive=false; interClock=0;` and show
    the **"WAVE {wave} CLEARED"** beat. Else if `waveAge >= waveCap` → force
    the next wave (spawnWave; `waveAge=0`; keep `waveActive=true`).
  - else (between waves): `interClock += dt`. If `interClock >= waveGap` →
    `spawnWave(); waveActive=true; waveAge=0;`.
  - First wave: seed the between-wave state so the opening wave arrives after
    a short initial `waveGap`.
- `spawnWave` sets `waveActive=true; waveAge=0` on spawn (idempotent with the
  loop).
- **`#td-next` preview:** while `waveActive` and not cleared → `NEXT WAVE
  {n+1} · clear the field`; between waves → `NEXT WAVE {n+1} · in
  {ceil(waveGap-interClock)}s`; frozen → the existing "ready" copy.

## Section 5 — testing, scope

**Files:** `src/td-tab.js`, `styles.css`, `HOW-IT-WORKS.md`, `DEVLOG.md`.

**Testing.** No new Node tests (tutorial/input/pacing/toast layer; pure cores
untouched — `npm test` stays green as a guard). Headless (SwiftShader +
`--enable-logging=stderr`, :8144):
- `?tutorial=1#td` — the opening shows the tank near the heart, 2 phage, the
  **laser** pulsing, the frozen "SHOOT TO DEFEND THE HEART" prompt; no JS
  errors; no start-choice modal.
- `?tutorial=0#td` — HUD reads **MANUAL** at start; the `#td-next` preview
  shows the clear-gated copy; no `.tut-x`/`.msg-x` in the DOM.
- `?tutorial=0&wave=1#td` — a wave spawns; the preview + wave-over beat wire
  up without error.
- No error tokens; `./scripts/bust.sh --quiet` after edits; DEVLOG +
  HOW-IT-WORKS updates.

## Out of scope

- Player-called "call wave" button (kept auto pacing, now clear-gated).
- Rebalancing enemy/tower stats or the wave-plan composition.
- The heart-tab or other tabs' modals/mode logic.
- The deferred cinematic lock-screen camera.
