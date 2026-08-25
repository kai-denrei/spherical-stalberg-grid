# Bloom post-processing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vendor the r160-matching EffectComposer + UnrealBloom chain, add a shared `src/postfx.js`, and wire bloom into the four neon tabs (td, battle, heart, tank3) with live GUI controls.

**Architecture:** Ten postprocessing/shader modules vendored flat into `vendor/` with their bare `'three'` specifiers rewritten to `./three.module.js`. One shared `src/postfx.js` exposes `makeBloom()` returning `{render, setSize, setParams, setEnabled, enabled}`. Each tab constructs it once, calls `postfx.setSize` on resize, and swaps its main-renderer draw calls for `postfx.render()`.

**Tech Stack:** Vanilla ES modules, vendored three.js r160, no build step.

## Global Constraints

- **Do NOT push in any task — commits stay LOCAL; the controller pushes once at the very end after the final review + deban sync.**
- After editing `src/*.js` / HTML / CSS: run `./scripts/bust.sh --quiet`, then commit ALL its output atomically (`git add -A`).
- **NEVER put a `?v=` token on a `../vendor/` import.** New vendor files must be token-free; `./scripts/check-tokens.sh` must pass.
- `npm test` must stay green (pure cores untouched; regression guard).
- **The console must never print "Multiple instances of Three.js imported"** — that means a bare `'three'` specifier survived. This is the primary risk of the whole change.
- Every task must leave a WORKING game (all tabs boot and render).
- Commit trailer (exact two lines) on EVERY commit:
  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01QH1hQk64Cw4ZwpAi59Pnat
  ```
- Headless: Chrome `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr`, serve :8144 (`npm run serve &` if down). Anchor on CODE; line numbers drift.

---

### Task 1: Vendor the postprocessing chain

**Files:**
- Create (10): `vendor/{EffectComposer,Pass,RenderPass,ShaderPass,MaskPass,UnrealBloomPass,OutputPass,CopyShader,LuminosityHighPassShader,OutputShader}.js`

**Interfaces:**
- Produces: `vendor/EffectComposer.js` (exports `EffectComposer`), `vendor/RenderPass.js` (`RenderPass`), `vendor/UnrealBloomPass.js` (`UnrealBloomPass`), `vendor/OutputPass.js` (`OutputPass`) — the four Task 2 imports.

- [ ] **Step 1: Copy the ten files flat.** Source is `~/Dev/sonar-cave/node_modules/three/examples/jsm` (three **0.160.1** — exact match for our vendored r160; do NOT use the r169/r170 copies in other projects).
  ```bash
  cd /Users/minikai/Dev/spherical-stalberg-grid
  P=~/Dev/sonar-cave/node_modules/three/examples/jsm
  cp "$P"/postprocessing/{EffectComposer,Pass,RenderPass,ShaderPass,MaskPass,UnrealBloomPass,OutputPass}.js vendor/
  cp "$P"/shaders/{CopyShader,LuminosityHighPassShader,OutputShader}.js vendor/
  ```

- [ ] **Step 2: Rewrite the imports.** Two rewrites across the ten new files:
  ```bash
  cd /Users/minikai/Dev/spherical-stalberg-grid/vendor
  # bare 'three' -> our vendored copy (THE dual-instance trap)
  perl -pi -e "s{ from 'three';}{ from './three.module.js';}g" \
    EffectComposer.js Pass.js RenderPass.js ShaderPass.js MaskPass.js \
    UnrealBloomPass.js OutputPass.js CopyShader.js LuminosityHighPassShader.js OutputShader.js
  # ../shaders/X.js -> ./X.js (they are flat now)
  perl -pi -e "s{\.\./shaders/}{./}g" *.js
  ```

- [ ] **Step 3: Verify no bare specifier and no token survived.**
  ```bash
  cd /Users/minikai/Dev/spherical-stalberg-grid
  echo "--- bare three (must be empty) ---"; grep -rn "from 'three'" vendor/ || echo CLEAN
  echo "--- ../ paths (must be empty) ---"; grep -rn "from '\.\./" vendor/ || echo CLEAN
  echo "--- tokened vendor imports (must be empty) ---"; grep -rnE "vendor/[^'\"]*\?v=" --include='*.js' --include='*.html' . || echo CLEAN
  ./scripts/check-tokens.sh
  ```
  Expected: three CLEANs and the guard passing. If any line prints, FIX before continuing.

- [ ] **Step 4: Sanity-check the module graph resolves.** Every intra-vendor import must name a file that now exists:
  ```bash
  cd /Users/minikai/Dev/spherical-stalberg-grid/vendor
  grep -ho "from '\./[A-Za-z]*\.js'" *.js | sort -u | sed "s/from '\.\///;s/'//" | while read f; do
    [ -f "$f" ] && echo "  OK  $f" || echo "  MISSING $f"
  done
  ```
  Expected: every line `OK`. A `MISSING` means another module needs vendoring — copy it from the same source and re-run Steps 2–4.

- [ ] **Step 5: Test + commit (LOCAL).**
  ```bash
  npm test 2>&1 | tail -3
  git add -A
  git commit -m "vendor: three r160 postprocessing chain (EffectComposer, UnrealBloom, OutputPass)"
  ```

---

### Task 2: `src/postfx.js` + wire TD

**Files:**
- Create: `src/postfx.js`
- Modify: `src/td-tab.js` (import; construct after camera; `resize()` ~146; render calls ~3561 + ~3695; GUI ~3502)

**Interfaces:**
- Consumes: the four vendor exports from Task 1.
- Produces: `makeBloom(renderer, scene, camera, opts) -> {render, setSize, setParams, setEnabled, enabled}` — Task 3 wires the same API into three more tabs.

- [ ] **Step 1: Write `src/postfx.js`.**
  ```js
  // postfx.js — the bloom chain the looks arc deferred. One composer per tab;
  // the tab swaps its main renderer.render() for postfx.render(). Aux
  // renderers (minimap, sprite icons) never go through here.
  import { EffectComposer } from '../vendor/EffectComposer.js';
  import { RenderPass } from '../vendor/RenderPass.js';
  import { UnrealBloomPass } from '../vendor/UnrealBloomPass.js';
  import { OutputPass } from '../vendor/OutputPass.js';
  import * as THREE from '../vendor/three.module.js';

  const COARSE = typeof matchMedia === 'function'
    && matchMedia('(pointer: coarse)').matches;

  export function makeBloom(renderer, scene, camera, opts = {}) {
    const o = {
      strength: 0.9, radius: 0.4, threshold: 0.85, enabled: true,
      // UnrealBloomPass builds a mip chain — halve it on phones
      scale: COARSE ? 0.5 : 1.0,
      ...opts,
    };
    let enabled = o.enabled;
    const size = renderer.getSize(new THREE.Vector2());
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, size.x * o.scale), Math.max(1, size.y * o.scale)),
      o.strength, o.radius, o.threshold);
    composer.addPass(bloom);
    // linear render targets -> without OutputPass the whole scene washes out
    composer.addPass(new OutputPass());
    composer.setSize(size.x, size.y);

    return {
      render() {
        if (enabled) composer.render();
        else renderer.render(scene, camera);
      },
      setSize(w, h) {
        composer.setSize(w, h);
        bloom.setSize(Math.max(1, w * o.scale), Math.max(1, h * o.scale));
      },
      setParams({ strength, radius, threshold } = {}) {
        if (strength !== undefined) bloom.strength = strength;
        if (radius !== undefined) bloom.radius = radius;
        if (threshold !== undefined) bloom.threshold = threshold;
      },
      setEnabled(v) { enabled = !!v; },
      get enabled() { return enabled; },
      params: o,
    };
  }
  ```
  NOTE: `../vendor/` imports carry NO `?v=` token, ever. `./postfx.js` imported from a tab DOES get one (bust handles it).

- [ ] **Step 2: Import in td-tab.js.** Beside the other `./`-relative src imports add:
  ```js
  import { makeBloom } from './postfx.js';
  ```

- [ ] **Step 3: Construct after the main camera exists** (after the `camera` declaration near the renderer, ~line 114-130):
  ```js
  const postfx = makeBloom(renderer, scene, camera, {});
  ```
  If `scene` is declared after `camera`, place this line after BOTH exist.

- [ ] **Step 4: Resize.** In `resize()` (~146), immediately after `renderer.setSize(w, h);`:
  ```js
  postfx.setSize(w, h);
  ```

- [ ] **Step 5: Swap the two MAIN render calls.** At ~3561 (paused branch) and ~3695 (live path), replace `renderer.render(scene, camera);` with:
  ```js
  postfx.render();
  ```
  Do NOT touch `mapRenderer.render(...)` or `waveSpriteRenderer.render(...)`.

- [ ] **Step 6: GUI folder** (near the existing `gui` construction ~3502, after other controls):
  ```js
  const bloomF = gui.addFolder('bloom');
  bloomF.add(postfx.params, 'enabled').name('enabled').onChange((v) => postfx.setEnabled(v));
  bloomF.add(postfx.params, 'strength', 0, 3, 0.05).onChange((v) => postfx.setParams({ strength: v }));
  bloomF.add(postfx.params, 'radius', 0, 1, 0.01).onChange((v) => postfx.setParams({ radius: v }));
  bloomF.add(postfx.params, 'threshold', 0, 1, 0.01).onChange((v) => postfx.setParams({ threshold: v }));
  ```

- [ ] **Step 7: Bust + test.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -3` → green. Then `./scripts/check-tokens.sh` → passes.

- [ ] **Step 8: Headless — bloom renders, and NO dual-three warning.**
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --window-size=1200,800 --virtual-time-budget=9000 --screenshot="$CLAUDE_JOB_DIR/tmp/bloom-td.png" \
    "http://localhost:8144/?tutorial=0#td" 2>&1 | grep -oiE "Uncaught|TypeError|Multiple instances" | head
  ```
  Expected: NO output at all. VIEW the screenshot and confirm the neon edges visibly glow versus the pre-change look. Report both.

- [ ] **Step 9: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "postfx: shared bloom chain + wire the TD tab"
  ```

---

### Task 3: Wire battle, heart, tank3

**Files:**
- Modify: `src/battle-tab.js`, `src/heart-tab.js`, `src/tank3-tab.js`

**Interfaces:**
- Consumes: `makeBloom` from `./postfx.js` (Task 2), same four-edit pattern.

Per-tab anchors (**note the differences** — patch each file individually, assert per file, and treat a mid-script abort as the designed outcome):

| tab | renderer | camera var | construct after | resize | main render callsites | do NOT touch |
|---|---|---|---|---|---|---|
| battle | `renderer` ~76 | `camera` | camera+scene exist | ~108 | **~1215** | `mapRenderer` ~89 |
| heart | `renderer` ~107 | `camera` | camera+scene exist | ~139 | **~2273 (paused), ~2370 (live)** | `mapRenderer` ~120, `waveSpriteRenderer` ~1256 |
| tank3 | `renderer` ~28 | **`cam`** | cam+scene exist | ~47 | **~440** | — |

- [ ] **Step 1: battle-tab.js.** Add `import { makeBloom } from './postfx.js';`; `const postfx = makeBloom(renderer, scene, camera, {});`; `postfx.setSize(w, h);` in `resize()`; replace the ~1215 `renderer.render(scene, camera);` with `postfx.render();`; add the same `bloom` GUI folder near `const gui = new GUI({ title: 'sphere battle', … })` (~1129).

- [ ] **Step 2: heart-tab.js.** Same four edits; camera var is `camera`; replace **BOTH** ~2273 and ~2370 main-render calls; GUI folder near ~2218. Leave `mapRenderer` and `waveSpriteRenderer` alone.

- [ ] **Step 3: tank3-tab.js.** Same, but the camera variable is **`cam`**:
  ```js
  const postfx = makeBloom(renderer, scene, cam, {});
  ```
  Replace the ~440 `renderer.render(scene, cam);` with `postfx.render();`; GUI folder near ~444.

- [ ] **Step 4: Assert each file was patched.**
  ```bash
  cd /Users/minikai/Dev/spherical-stalberg-grid
  for f in battle heart tank3; do
    n=$(grep -c "postfx" src/$f-tab.js)
    echo "$f: $n postfx references (expect >= 5)"
  done
  echo "--- stray main renders left? ---"
  grep -n "renderer.render(scene," src/{battle,heart,tank3}-tab.js || echo "CLEAN (all swapped)"
  ```
  Expected: each ≥5, and CLEAN on the second check (aux renderers use `mapRenderer.render` / `waveSpriteRenderer.render`, which won't match this pattern).

- [ ] **Step 5: Bust + test + guard.** `./scripts/bust.sh --quiet && npm test 2>&1 | tail -3` → green; `./scripts/check-tokens.sh` → passes.

- [ ] **Step 6: Headless — all four tabs, no dual-three, bloom visible.**
  ```bash
  for t in td battle heart tank3; do
    echo "--- $t ---"
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
      --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
      --window-size=1200,800 --virtual-time-budget=9000 \
      --screenshot="$CLAUDE_JOB_DIR/tmp/bloom-$t.png" \
      "http://localhost:8144/?tutorial=0#$t" 2>&1 | grep -oiE "Uncaught|TypeError|Multiple instances" | head
  done
  ```
  Expected: no output for any tab. VIEW all four screenshots; confirm each renders with glow and nothing is washed out (a grey/flat frame means `OutputPass` is missing or mis-ordered).

- [ ] **Step 7: Commit (LOCAL).**
  ```bash
  git add -A
  git commit -m "postfx: wire bloom into battle, heart and tank3"
  ```

---

### Task 4: Docs

**Files:**
- Modify: `HOW-IT-WORKS.md`, `DEVLOG.md`

- [ ] **Step 1: HOW-IT-WORKS.md — append.**
  ```markdown
  ## The bloom the neon was waiting for

  The looks arc built additive, vertex-coloured edges and then stopped short of
  the thing that makes them glow — a post-processing chain was judged too
  expensive until a look earned it. It had. Every neon tab (td, battle, heart,
  tank3) now renders through an EffectComposer: the scene, then UnrealBloom,
  then an output pass that puts the colour back where it belongs. The bloom
  runs at half resolution on phones, because the mip chain is the expensive
  part, and each tab carries live sliders for strength, radius and threshold so
  the look can be dialled in while you watch it.
  ```

- [ ] **Step 2: Final sweep.**
  ```bash
  ./scripts/bust.sh --quiet && npm test 2>&1 | tail -3 && ./scripts/check-tokens.sh
  for t in td battle heart tank3; do
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
      --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
      --window-size=1200,800 --virtual-time-budget=9000 \
      --screenshot="$CLAUDE_JOB_DIR/tmp/bloom-final-$t.png" \
      "http://localhost:8144/?tutorial=0#$t" 2>&1 | grep -oiE "Uncaught|TypeError|Multiple instances" | head
  done
  ```
  Expected: test green, guard passes, no error tokens on any tab.

- [ ] **Step 3: Commit HOW-IT-WORKS, capture hash H.**
  ```bash
  git add HOW-IT-WORKS.md
  git commit -m "docs: HOW-IT-WORKS — the bloom chain"
  git log -1 --format=%h   # note hash H
  ```

- [ ] **Step 4: DEVLOG.md — prepend a newest-first entry** (top of the list, after the intro/`---`), substituting the real H:
  ```markdown
  ## `<H>` — The glow we owed the neon

  The original looks arc ended on a deliberate deferral: additive Tron edges
  shipped, but the bloom chain didn't — "the 6-module EffectComposer cost
  deferred until a look earns it." Comparing feel against HokorobiTawaa found
  the bill for that: HK runs UnrealBloom at 0.9 over additive everything, and a
  real part of "it looks better" was post-processing we'd chosen not to build.
  So the chain is vendored now — ten modules at exactly r160 to match our
  three, their bare `'three'` specifiers rewritten to our copy so the browser
  can't load a second one — behind a shared `postfx.js` that any tab opts into
  with two lines. TD, battle, heart and tank3 all render through it, half-res
  on phones, with live strength/radius/threshold sliders.
  ```
  ```bash
  git add DEVLOG.md
  git commit -m "devlog: <H> — bloom post-processing"
  ```
  Do NOT push — the controller pushes after the final review + deban sync.

---

## Final acceptance checklist

- [ ] Ten vendor modules present, sourced from three 0.160.1, no `from 'three'` and no `../` imports remaining, no `?v=` on any vendor path.
- [ ] `src/postfx.js` exports `makeBloom` with the RenderPass → UnrealBloom → **OutputPass** chain and half-res bloom on coarse pointers.
- [ ] td, battle, heart, tank3 each construct `postfx`, call `postfx.setSize` on resize, and route ALL main-renderer draws through `postfx.render()` — including the paused-branch calls in td and heart.
- [ ] Minimap and sprite-icon renderers still render directly (icons and minimap intact).
- [ ] Each tab has a live `bloom` GUI folder (enabled/strength/radius/threshold).
- [ ] Headless: all four tabs render with visible glow, nothing washed out, and **no "Multiple instances of Three.js"** anywhere.
- [ ] `npm test` green; `./scripts/check-tokens.sh` passes; bust output committed atomically.
- [ ] DEVLOG + HOW-IT-WORKS entries present.
