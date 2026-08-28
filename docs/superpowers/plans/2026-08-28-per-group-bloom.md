# Per-Group Bloom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the bloom a per-group intensity so map, enemies, tank, towers and effects each glow by a different, live-tunable amount.

**Architecture:** One bloom chain fed a *weighted* render. Per frame the scene is walked and each object's `material.color` scaled by its group's weight; that weighted image goes through `UnrealBloomPass`; the **pure** bloom is read from `renderTargetsHorizontal[0]` (before the pass's additive blend) and added to a normal, unweighted render. Result: `scene + bloom(scene x weights)` — weight controls glow only, never on-screen brightness.

**Tech Stack:** three.js r160 (vendored), EffectComposer/UnrealBloomPass/ShaderPass/OutputPass, lil-gui, plain `.mjs` Node tests.

**Spec:** `docs/superpowers/specs/2026-08-28-per-group-bloom-design.md`

## Global Constraints

- **After editing any `src/*.js`, HTML, or CSS: run `./scripts/bust.sh --quiet`,** then stage EVERYTHING it touched. A partial commit ships stale import tokens.
- **NEVER put `?v=` on `../vendor/` imports.** `bust.sh` REWRITES existing tokens but does not ADD them — a new module's relative imports must be tokened by hand once.
- **Tests are plain `.mjs`** with the house `check(name, cond, detail)` helper and `process.exit(1)` on failure. No framework.
- **`npm test` must stay green** (currently 11 suites). New suites are appended to the `test` script.
- **Other tabs must be unaffected.** `postfx.js` is shared by battle/heart/tank3; with no groups supplied every object resolves to `effects` at weight 1.0, reproducing today's output exactly.
- **Headless cannot measure frame time** — virtual time does not advance `performance.now()`. Perf claims must come from a real browser or not be made.
- **Commits** explain the why and end with:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01APSwAKmtiLRuquobPn9UEg
  ```

---

### Task 1: The pure weight resolver

All group/weight logic lives here as pure functions over plain objects, so it is Node-testable with no WebGL and no DOM. Walks use `.children` (not three's `.traverse`) precisely so fake nodes work in tests.

**Files:**
- Create: `test/bloomweights.mjs`
- Create: `src/bloomweights.js`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `BLOOM_GROUPS` -> `['map','enemies','tank','towers','effects']`
  - `DEFAULT_BLOOM_WEIGHTS` -> `{map:0.35, enemies:1.3, tank:1, towers:1, effects:1}`
  - `clampWeight(w)` -> number in `[0, 3]`, non-finite -> 1
  - `buildWeightMap(groupRoots, weights)` -> `Map<node, number>`; `groupRoots` is `[[group, [roots]], ...]`; descendants inherit; a node listed under two groups keeps the FIRST
  - `materialConflicts(map)` -> `[{material, weights:[a,b]}]`, empty when clean

- [ ] **Step 1: Write the failing test**

Create `test/bloomweights.mjs`:

```javascript
// bloomweights.mjs — the per-group bloom weight resolver.
//
// Pure on purpose: the walk uses .children rather than three's .traverse
// so it can be exercised on plain fake nodes, with no WebGL and no DOM.

import { BLOOM_GROUPS, DEFAULT_BLOOM_WEIGHTS, clampWeight, buildWeightMap, materialConflicts }
  from '../src/bloomweights.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

// minimal stand-in for an Object3D
const node = (name, material = null, children = []) => ({ name, material, children });

console.log('constants:');
check('five groups', BLOOM_GROUPS.length === 5);
check('effects is a group (the default)', BLOOM_GROUPS.includes('effects'));
check('every group has a default weight',
  BLOOM_GROUPS.every((g) => typeof DEFAULT_BLOOM_WEIGHTS[g] === 'number'));
check('map starts dimmer than enemies',
  DEFAULT_BLOOM_WEIGHTS.map < DEFAULT_BLOOM_WEIGHTS.enemies);

console.log('clampWeight:');
check('passes a normal value', clampWeight(1.3) === 1.3);
check('clamps negative to 0', clampWeight(-5) === 0);
check('clamps above 3', clampWeight(99) === 3);
check('NaN falls back to 1', clampWeight(NaN) === 1);
check('undefined falls back to 1', clampWeight(undefined) === 1);

console.log('buildWeightMap — inheritance:');
{
  const leaf = node('leaf');
  const mid = node('mid', null, [leaf]);
  const root = node('root', null, [mid]);
  const m = buildWeightMap([['map', [root]]], { map: 0.35, effects: 1 });
  check('root gets its group weight', m.get(root) === 0.35);
  check('child inherits', m.get(mid) === 0.35);
  check('grandchild inherits', m.get(leaf) === 0.35);
}

console.log('buildWeightMap — separation:');
{
  const a = node('a'), b = node('b');
  const m = buildWeightMap([['map', [a]], ['enemies', [b]]], { map: 0.35, enemies: 1.3 });
  check('each root gets its own weight', m.get(a) === 0.35 && m.get(b) === 1.3);
  check('unlisted nodes are absent (caller applies the default)',
    m.get(node('stranger')) === undefined);
}

console.log('buildWeightMap — robustness:');
{
  const shared = node('shared');
  const m = buildWeightMap([['map', [shared]], ['enemies', [shared]]], { map: 0.35, enemies: 1.3 });
  check('a node in two groups keeps the FIRST', m.get(shared) === 0.35);
}
{
  const m = buildWeightMap([['map', [null, undefined]], ['bogus', [node('x')]]], { map: 0.5 });
  check('null/undefined roots are skipped, not thrown on', m.size === 0);
}
{
  const cyc = node('cyc');
  cyc.children = [cyc]; // pathological, but must not hang
  const m = buildWeightMap([['map', [cyc]]], { map: 0.5 });
  check('a cycle terminates', m.get(cyc) === 0.5 && m.size === 1);
}

console.log('materialConflicts — the silent-bug tripwire:');
{
  const shared = { name: 'shared-mat' };
  const m = new Map([
    [node('a', shared), 0.35],
    [node('b', shared), 1.3],
  ]);
  const c = materialConflicts(m);
  check('detects one material under two weights', c.length === 1, JSON.stringify(c.length));
  check('reports both weights', c[0].weights.includes(0.35) && c[0].weights.includes(1.3));
}
{
  const shared = { name: 'shared-mat' };
  const m = new Map([[node('a', shared), 1], [node('b', shared), 1]]);
  check('silent when the shared material agrees', materialConflicts(m).length === 0);
}
check('silent on materialless nodes',
  materialConflicts(new Map([[node('a'), 1]])).length === 0);

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nbloom weight invariants hold');
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node test/bloomweights.mjs
```

Expected: FAIL — `Cannot find module .../src/bloomweights.js`

- [ ] **Step 3: Write the implementation**

Create `src/bloomweights.js`:

```javascript
// bloomweights.js — which things bloom how much, as pure data + pure
// functions. No three.js import, no DOM: the walk uses .children rather
// than Object3D.traverse so it is testable on plain objects.
//
// One bloom chain is fed a WEIGHTED render of the scene, so a group's
// weight controls how hard it glows without touching how brightly it
// draws. That decoupling is the whole point: the board can stay bright
// cyan and barely bloom, which dimming it could never achieve.

export const BLOOM_GROUPS = ['map', 'enemies', 'tank', 'towers', 'effects'];

// Starting points, not conclusions — derived from the complaint (the board
// reads too hot) rather than from looking at them. Tune with the sliders,
// then write the keepers back here.
export const DEFAULT_BLOOM_WEIGHTS = {
  map: 0.35,      // bright lines, almost no glow
  enemies: 1.3,   // hot against a calmed board
  tank: 1.0,
  towers: 1.0,
  effects: 1.0,   // also the fallback for anything untagged
};

export const MAX_BLOOM_WEIGHT = 3;

export function clampWeight(w) {
  if (typeof w !== 'number' || !Number.isFinite(w)) return 1;
  return Math.min(MAX_BLOOM_WEIGHT, Math.max(0, w));
}

// groupRoots: [[groupName, [rootNode, ...]], ...]
// Descendants inherit their root's weight. A node reachable from two
// groups keeps the FIRST — declaration order is the tie-break, so the
// result never depends on traversal accidents.
export function buildWeightMap(groupRoots, weights) {
  const out = new Map();
  for (const [group, roots] of groupRoots || []) {
    const w = weights && group in weights ? clampWeight(weights[group]) : null;
    if (w === null) continue; // unknown group name: skip rather than guess
    for (const root of roots || []) walk(root, w, out);
  }
  return out;
}

function walk(node, w, out) {
  if (!node || out.has(node)) return; // out.has also breaks cycles
  out.set(node, w);
  const kids = node.children;
  if (!kids) return;
  for (const k of kids) walk(k, w, out);
}

// Tripwire. Cross-group material sharing does not exist today, but if it
// ever appears, the weighted pass would write one weight and render the
// other — a silent, baffling bug. Better to say so out loud.
export function materialConflicts(weightMap) {
  const seen = new Map(); // material -> weight
  const bad = new Map();  // material -> Set(weights)
  for (const [node, w] of weightMap) {
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (!seen.has(mat)) { seen.set(mat, w); continue; }
      if (seen.get(mat) !== w) {
        if (!bad.has(mat)) bad.set(mat, new Set([seen.get(mat)]));
        bad.get(mat).add(w);
      }
    }
  }
  return [...bad].map(([material, ws]) => ({ material, weights: [...ws] }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
node test/bloomweights.mjs
```

Expected: every line `ok`, ending `bloom weight invariants hold`.

- [ ] **Step 5: Append to `npm test` and run the full suite**

In `package.json`, append ` && node test/bloomweights.mjs` to the `test` script.

```bash
npm test
```

Expected: all suites pass.

- [ ] **Step 6: Bust and commit**

```bash
./scripts/bust.sh --quiet && ./scripts/check-tokens.sh
git add -A
git commit -m "$(cat <<'EOF'
bloom: the pure per-group weight resolver

Group names, default weights, clamping, tag inheritance and the
shared-material tripwire, all pure and Node-tested. The walk uses
.children rather than Object3D.traverse specifically so it can be
exercised on plain fake nodes with no WebGL and no DOM.

A node reachable from two groups keeps the FIRST, so declaration order is
the tie-break and the result never depends on traversal accidents. Cycles
terminate. Unknown group names are skipped rather than guessed at.

materialConflicts() exists because cross-group material sharing does not
happen today but would be a silent bug if it ever did: the weighted pass
would write one weight and render another. It fails loud instead.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01APSwAKmtiLRuquobPn9UEg
EOF
)"
```

---

### Task 2: The two-composer render path

**Files:**
- Modify: `src/postfx.js` (whole file rewritten around the new path)

**Interfaces:**
- Consumes: `buildWeightMap`, `materialConflicts`, `clampWeight`, `DEFAULT_BLOOM_WEIGHTS`, `BLOOM_GROUPS` from `src/bloomweights.js`.
- Produces, on the object returned by `makeBloom`:
  - `render()`, `setSize(w,h)`, `setParams({strength,radius,threshold})`, `setEnabled(v)`, `enabled`, `params`, `bloomTargetSize` (all unchanged)
  - `setGroups(fn)` — `fn()` returns `[[group, [roots]], ...]`, read fresh each frame. Pass `null` to disable weighting (the default: every object at weight 1.0, i.e. today's output).
  - `weights` — a live object of group -> number, mutated in place by the GUI.

- [ ] **Step 1: Rewrite `src/postfx.js`**

```javascript
// postfx.js — the bloom chain, with a PER-GROUP intensity.
//
// UnrealBloomPass is a full-screen effect: it has no idea what an object
// is. So per-group bloom is not a parameter, it is a render path. One
// chain is fed a WEIGHTED render of the scene (each object's colour
// scaled by its group's weight), and the pure bloom from that is added to
// a normal, unweighted render:
//
//     output = scene + bloom(scene x weights)
//
// which means a weight changes how hard something GLOWS without changing
// how brightly it DRAWS. That is the point — dimming the board would have
// calmed its glow and its lines together; this calms only the glow.
//
// The trick that makes it clean: r160's UnrealBloomPass blends its result
// additively over its input and ignores this.clear at that step, so the
// pass output is always input+bloom and can't be made bloom-only. But it
// leaves the PURE bloom in renderTargetsHorizontal[0] just before that
// blend, and that texture is readable. No scene term leaks into the add.
import { EffectComposer } from '../vendor/EffectComposer.js';
import { RenderPass } from '../vendor/RenderPass.js';
import { UnrealBloomPass } from '../vendor/UnrealBloomPass.js';
import { ShaderPass } from '../vendor/ShaderPass.js';
import { OutputPass } from '../vendor/OutputPass.js';
import * as THREE from '../vendor/three.module.js';
import { buildWeightMap, materialConflicts, clampWeight, DEFAULT_BLOOM_WEIGHTS }
  from './bloomweights.js';

const COARSE = typeof matchMedia === 'function'
  && matchMedia('(pointer: coarse)').matches;

// The bloom's target size, in DEVICE pixels. EffectComposer sizes every
// pass at device pixels (it multiplies by the renderer's pixelRatio);
// anything that RE-APPLIES a pass size afterwards has to do the same, or
// it silently drops the ratio. Getting this wrong is invisible on a
// dpr-1 display and blocky on every Retina one, so it is pure and tested.
export function bloomTargetSize(cssW, cssH, pixelRatio, scale) {
  const f = (pixelRatio || 1) * (scale || 1);
  return {
    w: Math.max(1, Math.round(cssW * f)),
    h: Math.max(1, Math.round(cssH * f)),
  };
}

// base + bloom, in linear space, before OutputPass converts. Same place
// the bloom was applied before this change.
const AddBloomShader = {
  uniforms: { tDiffuse: { value: null }, tBloom: { value: null } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform sampler2D tBloom;
    varying vec2 vUv;
    void main() { gl_FragColor = texture2D(tDiffuse, vUv) + texture2D(tBloom, vUv); }
  `,
};

export function makeBloom(renderer, scene, camera, opts = {}) {
  const o = {
    strength: 0.9, radius: 0.4, threshold: 0.85, enabled: true,
    // UnrealBloomPass builds a mip chain — halve it on phones
    scale: COARSE ? 0.5 : 1.0,
    ...opts,
  };
  let enabled = o.enabled;
  const weights = { ...DEFAULT_BLOOM_WEIGHTS };
  let groupsFn = null;   // null => no weighting, i.e. the pre-change behaviour
  let warnedConflict = false;

  const size = renderer.getSize(new THREE.Vector2());
  const b0 = bloomTargetSize(size.x, size.y, renderer.getPixelRatio(), o.scale);

  // --- pass A: the weighted scene -> bloom
  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(b0.w, b0.h), o.strength, o.radius, o.threshold);
  bloomComposer.addPass(bloom);

  // --- pass B: the real scene + that bloom
  const finalComposer = new EffectComposer(renderer);
  // EffectComposer's targets are created WITHOUT samples, so compositing
  // silently discards the renderer's antialias:true. On a wireframe board
  // that is the most visible side effect of adding a chain at all — ask
  // for MSAA back (samples survives setSize, so this is set once).
  finalComposer.renderTarget1.samples = 4;
  finalComposer.renderTarget2.samples = 4;
  finalComposer.addPass(new RenderPass(scene, camera));
  const addPass = new ShaderPass(AddBloomShader);
  finalComposer.addPass(addPass);
  // linear render targets -> without OutputPass the whole scene washes out
  finalComposer.addPass(new OutputPass());

  bloomComposer.setSize(size.x, size.y);
  finalComposer.setSize(size.x, size.y);

  // --- weighting: applied before the bloom render, undone straight after
  const saved = [];          // { mat, r, g, b } and { obj, visible }
  const savedVis = [];
  const black = new THREE.Color(0, 0, 0);
  let sceneBgSaved;

  function applyWeights() {
    const map = buildWeightMap(groupsFn(), weights);
    if (!warnedConflict) {
      const bad = materialConflicts(map);
      if (bad.length) {
        warnedConflict = true;
        console.warn(`[postfx] ${bad.length} material(s) shared across bloom groups — ` +
          'the weighted pass can only render one weight. Give them separate materials.', bad);
      }
    }
    const dflt = clampWeight(weights.effects);
    scene.traverse((obj) => {
      const mat = obj.material;
      if (!mat) return;
      const w = map.has(obj) ? map.get(obj) : dflt;
      if (w === 0) { savedVis.push(obj); obj.visible = false; return; }
      if (w === 1) return; // nothing to do — the common case, kept cheap
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        if (!m.color) continue;
        saved.push({ mat: m, r: m.color.r, g: m.color.g, b: m.color.b });
        m.color.setRGB(m.color.r * w, m.color.g * w, m.color.b * w);
      }
    });
    sceneBgSaved = scene.background;
    scene.background = black; // the sky must not bloom
  }

  function restoreWeights() {
    for (const s of saved) s.mat.color.setRGB(s.r, s.g, s.b);
    saved.length = 0;
    for (const obj of savedVis) obj.visible = true;
    savedVis.length = 0;
    scene.background = sceneBgSaved;
  }

  return {
    render() {
      if (!enabled) { renderer.render(scene, camera); return; }
      if (groupsFn) applyWeights();
      bloomComposer.render();
      if (groupsFn) restoreWeights();
      // the PURE bloom, taken before UnrealBloomPass's additive blend
      addPass.uniforms.tBloom.value = bloom.renderTargetsHorizontal[0].texture;
      finalComposer.render();
    },
    setSize(w, h) {
      // ORDER MATTERS: composer.setSize() re-sizes EVERY pass (at device
      // pixels), which would clobber the bloom's scaled target — re-apply
      // the scaled bloom size AFTER it, and in DEVICE pixels too.
      bloomComposer.setSize(w, h);
      finalComposer.setSize(w, h);
      const b = bloomTargetSize(w, h, renderer.getPixelRatio(), o.scale);
      bloom.setSize(b.w, b.h);
    },
    setParams({ strength, radius, threshold } = {}) {
      if (strength !== undefined) bloom.strength = strength;
      if (radius !== undefined) bloom.radius = radius;
      if (threshold !== undefined) bloom.threshold = threshold;
    },
    setEnabled(v) { enabled = !!v; },
    get enabled() { return enabled; },
    // fn() -> [[group, [roots]], ...], read fresh each frame so the caller
    // never has to tell us when its collections change.
    setGroups(fn) { groupsFn = typeof fn === 'function' ? fn : null; },
    weights,
    params: o,
  };
}
```

- [ ] **Step 2: Token the new import by hand**

`bust.sh` rewrites existing `?v=` tokens but does not add them.

```bash
T=$(grep -o 'name="cb" content="[0-9a-f]*"' index.html | sed 's/.*content="//;s/"//')
sed -i '' "s|from './bloomweights.js'|from './bloomweights.js?v=$T'|" src/postfx.js
grep -n "bloomweights" src/postfx.js
```

Expected: the import shows `./bloomweights.js?v=<token>`.

- [ ] **Step 3: Verify the other tabs are byte-identical in behaviour**

No tab calls `setGroups` yet, so `groupsFn` is null and no weighting runs.

```bash
./scripts/bust.sh --quiet && ./scripts/check-tokens.sh && npm test 2>&1 | tail -1
```

Expected: token check OK, all suites pass.

- [ ] **Step 4: Confirm it still renders (battle tab, which has no groups)**

```bash
SP=/private/tmp/claude-501/-Users-minikai-Dev-spherical-stalberg-grid/f288f504-c90b-468f-bab7-dc64324d7f17/scratchpad
rm -rf $SP/t2; mkdir -p $SP/t2
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --no-sandbox \
  --enable-logging=stderr --v=0 --virtual-time-budget=8000 --force-device-scale-factor=2 \
  --window-size=900,700 --user-data-dir=$SP/t2 --screenshot=$SP/task2.png \
  'http://localhost:8144/?tick=3&tutorial=0#td' > $SP/t2.log 2>&1 &
C=$!; ( sleep 60; kill -9 $C 2>/dev/null ) & W=$!
wait $C 2>/dev/null; kill $W 2>/dev/null
grep -iE "uncaught|referenceerror|typeerror|not defined|shader|GLSL" $SP/t2.log | head -5
```

Expected: no matching lines. `timeout` does not exist on macOS — the background watchdog above replaces it. Then LOOK at `$SP/task2.png`: the board must render as before, not black. A black frame means the ShaderPass composite is wrong.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
bloom: two-composer path, ready for per-group weights

UnrealBloomPass is full-screen and has no idea what an object is, so
per-group bloom is a render path, not a parameter. One chain is fed a
WEIGHTED render and its pure bloom is added to a normal unweighted one:
output = scene + bloom(scene x weights). A weight then changes how hard
something GLOWS without changing how brightly it DRAWS — dimming the
board would have calmed its lines and its glow together; this calms only
the glow.

The clean part is where the bloom is read from. r160's UnrealBloomPass
blends its result additively over its input and ignores this.clear at
that step, so the pass output is always input+bloom and cannot be made
bloom-only. But it leaves the pure bloom in renderTargetsHorizontal[0]
just before that blend, and that texture is readable — so no scene term
leaks into the add.

Behaviour is unchanged until a caller supplies setGroups(): with no
groups every object sits at weight 1.0, which is exactly today's output.
That is what keeps battle/heart/tank3 untouched by this.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01APSwAKmtiLRuquobPn9UEg
EOF
)"
```

---

### Task 3: Wire TD's groups and the sliders

**Files:**
- Modify: `src/td-tab.js` (one `setGroups` call; one GUI subfolder)

**Interfaces:**
- Consumes: `postfx.setGroups(fn)`, `postfx.weights` from Task 2; `BLOOM_GROUPS` from Task 1.

- [ ] **Step 1: Supply the group roots**

Groups are read from the collections that already exist, so no creation
site has to be tagged and none can be missed. Add directly after the
`sfx.arm();` lines near the top of `initTdTab`:

```javascript
  // Which things bloom how much. Read fresh every frame from the live
  // collections, so nothing has to be tagged at creation and no new
  // spawn site can silently miss out. Anything not listed here — tracers,
  // debris, bursts, orbs, rewards, the Heart, the range ring — falls
  // through to the `effects` weight.
  postfx.setGroups(() => [
    ['map', [floorMesh, wallMesh, edgeMesh, topMesh]],
    ['tank', [playerMesh]],
    ['enemies', [
      ...enemies.filter((e) => e.alive).map((e) => e.obj),
      ...spawnPoints.filter((s) => s.alive).map((s) => s.obj),
    ]],
    ['towers', towers.map((tw) => tw.obj)],
  ]);
```

- [ ] **Step 2: Add the sliders**

In the GUI block, directly after the existing bloom `threshold` line:

```javascript
  // per-group glow. These are AMOUNTS, not brightness: the map can stay a
  // bright cyan wireframe while barely blooming at all.
  const weightsF = bloomF.addFolder('weights');
  for (const g of BLOOM_GROUPS) {
    weightsF.add(postfx.weights, g, 0, 3, 0.05).name(g);
  }
```

- [ ] **Step 3: Import `BLOOM_GROUPS`**

Add the import next to the others, then stamp it with the CURRENT token
(`bust.sh` rewrites existing tokens but never adds them):

```bash
python3 - <<'EOF'
p='src/td-tab.js'; s=open(p).read()
old = "import { makeBloom } from './postfx.js"
i = s.index(old); j = s.index("\n", i)
s = s[:j+1] + "import { BLOOM_GROUPS } from './bloomweights.js';\n" + s[j+1:]
open(p,'w').write(s)
EOF
T=$(grep -o 'name="cb" content="[0-9a-f]*"' index.html | sed 's/.*content="//;s/"//')
sed -i '' "s|from './bloomweights.js'|from './bloomweights.js?v=$T'|" src/td-tab.js
grep -n bloomweights src/td-tab.js
```

Expected: one import line, ending `./bloomweights.js?v=<token>`.

- [ ] **Step 4: Persist a tuning session**

The spec calls for these to survive a reload, the same way the audio
mixer levels do — a tuning pass is worthless if it evaporates. Add
directly after the slider loop:

```javascript
  // a tuning session must survive a reload
  const BW_KEY = 'ssg.td.bloomWeights';
  try {
    const saved = JSON.parse(localStorage.getItem(BW_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      for (const g of BLOOM_GROUPS) {
        if (typeof saved[g] === 'number') postfx.weights[g] = saved[g];
      }
      weightsF.controllers.forEach((c) => c.updateDisplay());
    }
  } catch { /* private mode or corrupt value — defaults are fine */ }
  weightsF.onChange(() => {
    try { localStorage.setItem(BW_KEY, JSON.stringify(postfx.weights)); } catch { /* ignore */ }
  });
```

- [ ] **Step 5: Verify**

```bash
./scripts/bust.sh --quiet && ./scripts/check-tokens.sh && npm test 2>&1 | tail -1
```

Expected: token check OK, all suites pass.

- [ ] **Step 6: Screenshot and confirm the weights actually bite**

Capture the TD board, then again with `map` forced to 2.5 by temporarily
changing `DEFAULT_BLOOM_WEIGHTS.map` in `src/bloomweights.js`. The two
frames must differ visibly in board glow while the *lines* stay equally
bright. Revert the temporary change afterwards.

This is the check that proves weighting is wired, not just present. A
pair of identical frames means `setGroups` is not reaching the render.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
bloom: per-group weights in TD + the sliders

Five sliders under bloom > weights: map, enemies, tank, towers, effects.

Group membership is read fresh each frame from the collections that
already exist — enemies, spawnPoints, towers, and the four board meshes —
rather than tagged at creation. That means no spawn site has to remember
to tag itself and none can silently miss out, which matters because
enemies are built in several places. Anything unlisted (tracers, debris,
bursts, orbs, rewards, the Heart, the range ring) falls through to the
effects weight.

Starting values are guesses from the complaint, not from looking: map
0.35 because the board read too hot, enemies 1.3 so they carry against a
calmed board, everything else 1.0. They want a tuning pass.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01APSwAKmtiLRuquobPn9UEg
EOF
)"
```

---

### Task 4: Documentation

**Files:**
- Modify: `DEVLOG.md`, `HOW-IT-WORKS.md`

- [ ] **Step 1: Get the hash**

```bash
git log --oneline -3
```

- [ ] **Step 2: DEVLOG entry**

Read the top of `DEVLOG.md` and match the existing entry format exactly
(heading level, hash placement, `---` separators between entries — a
missing separator is the easy mistake). Add an entry at the top covering:
why per-group bloom needed a render path rather than a parameter; the
`renderTargetsHorizontal[0]` detail that makes the composite clean; the
glow-vs-brightness decoupling and why dimming could not have achieved it;
group membership being read from live collections rather than tagged; and
the two-scene-render cost with the phone risk stated plainly.

- [ ] **Step 3: HOW-IT-WORKS section**

Match its by-concept style. Explain for a reader who has not seen the
code: what a full-screen post-process can and cannot know about objects,
why weighting the input is the cheap way to get per-object control, why
that is different from just dimming things, and where to change the
numbers (the sliders live, `DEFAULT_BLOOM_WEIGHTS` permanently).

- [ ] **Step 4: Final verification and push**

```bash
./scripts/bust.sh --quiet && ./scripts/check-tokens.sh && npm test
git add -A
git commit -m "docs: DEVLOG + HOW-IT-WORKS — per-group bloom"
git push origin main
```

Expected: token check silent, all suites green, push accepted by the
pre-push hook.

- [ ] **Step 5: Report what needs a human**

State plainly that the weights have not been *seen*, only reasoned about,
and that the sliders are where they get settled; and that the
two-scene-render cost has not been measured on a phone.
