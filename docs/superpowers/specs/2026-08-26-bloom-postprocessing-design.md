# Bloom post-processing — design

2026-08-26. Add the EffectComposer + UnrealBloom + output chain the PoC
deliberately deferred, across the four neon tabs (td, battle, heart, tank3).

## Why now

The decision log deferred this: *"Tron neon = additive blending, no bloom
chain vendored (6-module EffectComposer cost deferred until a look earns
it)."* Comparing feel against HokorobiTawaa located the cost of that
deferral — HK runs `UnrealBloomPass` at strength 0.9 with `AdditiveBlending`
across every projectile and particle, and a material part of "HK looks
better" is literally post-processing we chose not to build. Our looks system
already emits additive vertex-coloured edges (`tronColors`), so the emissive
content exists; only the bloom stage is missing.

## Decisions

1. **Vendor the exact matching version.** Our vendored three is **r160**;
   `~/Dev/sonar-cave/node_modules/three` is **0.160.1** — an exact match. Copy
   from there rather than the r169/r170 copies in other projects (postprocessing
   ↔ core drift across 9 revisions is a real risk).
2. **Flat in `vendor/`,** matching the existing `OrbitControls.js` convention.
3. **One shared `src/postfx.js`,** so a tab opts in with two lines and all four
   share tuning defaults.
4. **All four neon tabs** in this change: td, battle, heart, tank3.
5. **Main renderer only.** The minimap and sprite-icon renderers must not be
   composed.

## Verified integration map

- **Vendored three:** `vendor/three.module.js`, `REVISION = '160'`. Existing
  vendor modules import `./three.module.js` (bare, untokened).
- **Source:** `~/Dev/sonar-cave/node_modules/three/examples/jsm/` — all ten
  required files present at 0.160.1:
  `postprocessing/{EffectComposer,Pass,RenderPass,ShaderPass,MaskPass,UnrealBloomPass,OutputPass}.js`
  and `shaders/{CopyShader,LuminosityHighPassShader,OutputShader}.js`.
- **Their imports need rewriting:** `from 'three'` → `from './three.module.js'`
  (the bare specifier is the dual-instance trap in our dead-end log);
  `from '../shaders/X.js'` → `from './X.js'` once flattened. Sibling imports
  (`./Pass.js`, `./MaskPass.js`, `./ShaderPass.js`) are already correct when flat.
- **Guards:** `bust.sh` excludes vendor dirs; `check-tokens.sh` fails on any
  `vendor/…?v=`. Vendored files therefore stay token-free by construction.
- **Per-tab shape** (consistent across all four):

  | tab | main renderer | camera var | main render callsites | aux renderers (do NOT compose) |
  |---|---|---|---|---|
  | td | `renderer` @114 | `camera` | 3561 (paused), 3695 (live) | `mapRenderer` @127, `waveSpriteRenderer` @1905 |
  | battle | `renderer` @76 | `camera` | 1215 | `mapRenderer` @89 |
  | heart | `renderer` @107 | `camera` | 2273 (paused), 2370 (live) | `mapRenderer` @120, `waveSpriteRenderer` @1256 |
  | tank3 | `renderer` @28 | **`cam`** | 440 | — |

  Each has `resize()` calling `renderer.setSize(w, h)` and
  `addEventListener('resize', resize)`; each has `const gui = new GUI({…})`.

## Section 1 — vendoring

Copy the ten files flat into `vendor/`. Rewrite imports as above. Acceptance:
`grep -rn "from 'three'" vendor/` returns nothing, and every intra-vendor
import is a `./`-relative path with no `?v=`.

## Section 2 — `src/postfx.js`

A small render-layer helper (imports three + the vendored passes; no DOM):

```js
makeBloom(renderer, scene, camera, opts) -> {
  render(),                 // composer.render() when enabled, else renderer.render()
  setSize(w, h),            // composer + bloom resolution
  setParams({strength, radius, threshold}),
  setEnabled(bool),
  get enabled()
}
```

- Chain: `RenderPass → UnrealBloomPass → OutputPass`.
- **`OutputPass` terminates the chain** — the composer's targets are linear, so
  without it the scene washes out (the classic "bloom made everything grey").
- **Resolution scale:** bloom render target at `scale × (w, h)`; default `1.0`,
  and `0.5` on coarse-pointer devices (`matchMedia('(pointer: coarse)')`), since
  UnrealBloomPass builds a mip chain and is the expensive stage on mobile.
- **Defaults:** `strength 0.9` (HK's value), `radius 0.4`, `threshold 0.85`,
  `enabled true`.
- Camera is passed by reference at construction; tabs that swap cameras pass a
  getter or update `renderPass.camera` — tank3/td use a single main camera
  object, so a direct reference is sufficient.

## Section 3 — wiring (all four tabs)

Per tab, four edits:
1. Import `makeBloom` from `./postfx.js`.
2. Construct after the main camera exists:
   `const postfx = makeBloom(renderer, scene, camera, {});` (tank3: `cam`).
3. In `resize()`, after `renderer.setSize(w, h)`, add `postfx.setSize(w, h);`.
4. Replace **only the main-renderer** `renderer.render(scene, camera)` calls
   with `postfx.render();` — including the paused-branch call in td and heart.
   `mapRenderer` / `waveSpriteRenderer` calls are untouched.

**GUI:** a `bloom` folder per tab — `enabled`, `strength` (0–3), `radius`
(0–1), `threshold` (0–1) — all live via `setParams`/`setEnabled`, no rebuild.

Sibling-patch discipline (per CLAUDE.md): anchor on CODE lines not comments,
assert per file, and treat a mid-script abort as the designed outcome.

## Section 4 — testing, scope

**Files:** `vendor/` (10 new), `src/postfx.js` (new), `src/{td,battle,heart,tank3}-tab.js`,
`HOW-IT-WORKS.md`, `DEVLOG.md`.

**Testing.** `npm test` stays green (pure cores untouched; regression guard).
`./scripts/check-tokens.sh` must pass — no `?v=` on any vendor import.
Headless (SwiftShader + `--enable-logging=stderr`, :8144), **screenshot each
tab before and after** and compare:
- `?tutorial=0#td`, `#battle`, `#heart`, `#tank3` — no JS errors, and the neon
  edges visibly glow.
- **Console must be free of "Multiple instances of Three.js imported"** — the
  specific failure this vendoring risks.
- One tab with `bloom.enabled=false` still renders correctly (fallback path).

**Out of scope:** the other tabs (grid/maze/organic/tank/tank2), per-look bloom
presets, selective/luminance-masked bloom, any change to the looks system or
materials.
