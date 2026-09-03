# The stress lab — `?lab=1` on the real board

Date: 2026-09-03. Operator ask: "a test lab in general to measure our FPS; Stålheart and
tank infinite health, sliders to increase waves of enemies until we see fps drop, add and
remove background, change the teleport effect — an environment to stress-test our engine."
Plus the PoC that prompted it: a galaxy drawn once from a seed and shown faint, projected 360°.

## Shape

A URL-flag MODE on the TD board, not a tab. `?lab=1` and nothing else changes: every lab
branch is `lab.on && …`, so a run without the flag executes the code it executes today.
Rejected: a `#lab` tab (a twelfth copy of the board tab — the debt ROADMAP already names);
extending `?sim=` (headless autoplay with bloom off: not interactive, no GPU number).

## Pieces

1. **`src/lab.js`** (pure, tested). `parseLabQuery(search)` → `null` or a lab state seeded
   from the URL (`?lab=1`, `labwave=N`, `labbg=galaxy`, `labfx=corona`, `labseed=N`).
   `LAB_KNOBS` in the `knobs.js` schema so `knobProblems` validates it. `labLine(sample)`
   formats the periodic console line headless runs read.
2. **`src/enemyspec.js`**: `computeWavePlan(wave, round, waveSize, mult = 1)` — `base` is
   multiplied after the opening taper. `mult = 1` is byte-identical to today (tested).
3. **`src/galaxyseed.js`** (pure, tested): the galaxy-forge generators ported verbatim onto
   `mulberry32` — `galaxyParams(seed)` (arms, twist, core, bar, temp, palette, within the
   demo's clamps), `buildGalaxyStars`, `buildGalaxyDust`, `buildFieldStars`. Same seed, same
   arrays.
4. **`src/galaxybake.js`** (three): the demo's star and dust shaders on `THREE.Points`,
   rendered by a `CubeCamera` into a `WebGLCubeRenderTarget` once. No bloom, no composite,
   no intro — the ignite is pinned at "lit". 1024/face desktop, 512/face phone tier.
5. **`src/td-tab.js`**, all under `lab.on`:
   - immortality: `heartHit` skips the decrement; `playerHit` returns before it.
   - `spawnWave` passes `lab.waveMult`; HOLD stops the inter-wave arm and the stall safety;
     FREEZE skips `updateEnemies`.
   - background: the frame's `scene.background = mainBg` becomes the baked cube when the lab
     says so, with `scene.backgroundIntensity` as the "faint". postfx already blacks the
     background for the weighted pass, so it never blooms.
   - portal: the bench's effect registry lifted onto the board — the wormhole uniforms become
     the union of both effects, `setBoardEffect(name)` swaps the fragment source. Cost knobs:
     target size (`whRt.setSize`, texture identity kept so the gates need no rebind), update
     Hz, steps, octaves. Bloom on/off.
   - readout: `perfTick` gains GPU ms from one `EXT_disjoint_timer_query_webgl2` query per
     frame opened around `frame()`. A `LAB …` console line every 2 s.
   - panel: a `lab` folder on the existing lil-gui, added before `buildVarsModal` so it is a
     page in VARS; `?lab=1` opens VARS on it and turns the fps readout on.
6. Tests: `test/lab.mjs`, `test/galaxyseed.mjs`, cases added to `test/tdcore.mjs`; all
   wired into `package.json`'s test string.

## Non-goals

No new tab, no board-core extraction, no change to the game's default background, no
persistence of lab settings, no phone-shell work (the lab is a desktop instrument; it runs on
the phone tier because the flag is tier-agnostic, but nothing is laid out for it).

## Verification

`npm test` green. Headless on the M4 GPU: `?lab=1&fps=1&labbg=galaxy` renders the cube
background, the `LAB` line reports gpu ms, `labwave=8` visibly multiplies the wave, and a run
WITHOUT the flag prints the same `PERF` numbers as before the change.
