# Tank3 (Battle skin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A third tank mode — Tank2's planet-combat rules rendered in the Battle tab's Tron look (neon-cyan grid, mesh tanks, dot-cloud shells, polygon-scatter deaths).

**Architecture:** New `src/tank3-tab.js` over the UNCHANGED `tanks2.js` core (all rules reused). The tab is `tank2-tab.js` copied + renamed, then re-skinned: a Tron geometry builder replaces the olive/orange world, `buildUnit('tank')` replaces the box tanks, `makeBulletCloud` replaces cube shells, `makeDebris` replaces blocky death. Spec: `docs/superpowers/specs/2026-08-25-tank3-battle-skin-design.md`.

**Tech Stack:** Vanilla ES modules, vendored three.js + OrbitControls + lil-gui, `tanks2.js` core, `units.js`/`looks.js` assets, mulberry32.

## Global Constraints

- After editing any `src/*.js`, `index.html`, or `styles.css`: run `./scripts/bust.sh --quiet`. Commit ALL its output atomically (`git add -A`). NEVER put `?v=` tokens on `../vendor/` imports; cross-`src` imports carry the current token.
- Do NOT modify `tanks2.js`, `tanks.js`, `tank2-tab.js`, `battle-tab.js`, `units.js`, `looks.js`, or any existing tab. Tank3 is additive.
- No new rules-tests: the core is unchanged and covered by `test/tanks2.mjs`, which must stay green (`npm test`).
- Camera facing derives from render transforms (anchors parented in the tank group), never from heading math.
- No `Math.random` in game logic; the tab's visual-only randomness (zone baking) uses a mulberry32 seeded from `params.seed`.
- Headless verification: Chrome `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader` (NOT `--disable-gpu`); console lines ONLY appear with `--enable-logging=stderr`. URL: `http://localhost:8144/?tick=5&view=chase#tank3`. Check :8144 responds before `npm run serve`.
- Orientation convention: `makeTank` (from `buildUnit('tank')`) has its barrel along local **+Z**. Tank3 orients tanks so **+Z = heading tangent, +Y = surface normal**. (Tank2's box tank used +X — do not copy that axis.)
- Commits: explain the why; end with the repo's Co-Authored-By + Claude-Session trailer. DEVLOG + HOW-IT-WORKS entries in the final task.

---

### Task 1: Wiring — tabbar, tab div, registration, CSS (incl. Tron score tint)

**Files:**
- Modify: `index.html` (tabbar button after `tank2`; `#tab-tank3` div after `#tab-tank2`)
- Modify: `src/main.js` (import + register key `tank3`)
- Modify: `styles.css` (`#tank3-app` in the app-container rules; `.combat-score.tron` cyan/magenta variant)

**Interfaces:**
- Produces: DOM ids `#tank3-app/#tank3-score/#tank3-msg/#tank3-hint/#tank3-pad-left/right/up/fire`; tab key `tank3`; a `.combat-score.tron` CSS class Tank3's score element will carry.

- [ ] **Step 1: index.html — tabbar button**

After the `tank2` button in `#tabbar`:

```html
    <button data-tab="tank3">tank3</button>
```

- [ ] **Step 2: index.html — tab div**

Immediately after the `#tab-tank2` closing `</div>`:

```html
  <div id="tab-tank3" class="tab tab-hidden">
    <div id="tank3-app"></div>
    <div id="tank3-score" class="combat-score tron"><span class="ts-red">0</span><span class="ts-blue">0</span></div>
    <div id="tank3-msg" class="combat-msg hidden"></div>
    <div id="tank3-pad-left" class="tzone tzone-side tzone-l"><span>&lsaquo;</span></div>
    <div id="tank3-pad-right" class="tzone tzone-side tzone-r"><span>&rsaquo;</span></div>
    <div class="tzone-mid">
      <div id="tank3-pad-up" class="tzone tzone-drive"><span>&and;</span></div>
    </div>
    <button id="tank3-pad-fire" class="tfire tfire-primary" title="FIRE (Space)">&#9673;</button>
    <div id="tank3-hint" class="combat-hint">PLANET COMBAT &middot; battle skin &middot; arrows drive &middot; double-tap &and; cruise &middot; SPACE fire &middot; C camera</div>
  </div>
```

- [ ] **Step 3: main.js — import + register**

Add the import beside the other tab imports (use the current `?v=` token seen on the neighbouring imports; bust renews it):

```js
import { initTank3Tab } from './tank3-tab.js?v=REPLACE_WITH_CURRENT_TOKEN';
```

In the `tabs` object, after the `tank2` entry:

```js
  tank3: { root: document.getElementById('tab-tank3'), init: initTank3Tab, api: null },
```

- [ ] **Step 4: styles.css — app-container fill + Tron score tint**

Add `#tank3-app` to BOTH app-container selector lists (the `position:absolute; inset:0` list AND the `canvas { display:block }` list). They currently end with `#tank2-app` / `#tank2-app canvas`:

```css
#app, #maze-app, #o-app, #b-app, #h-app, #td-app, #tank-app, #tank2-app, #tank3-app {
  position: absolute;
  inset: 0;
}

#app canvas, #maze-app canvas, #o-app canvas, #b-app canvas, #h-app canvas, #td-app canvas, #tank-app canvas, #tank2-app canvas, #tank3-app canvas {
  display: block;
}
```

Then append, right after the `.combat-hint { … }` rule:

```css
/* tank3 (battle/tron skin): score digits in the Tron player/enemy tints */
.combat-score.tron .ts-red { color: #9ff8ff; }
.combat-score.tron .ts-blue { color: #ff2d6f; }
```

- [ ] **Step 5: Bust + test + commit**

```bash
./scripts/bust.sh --quiet
npm test
```
Expected: bust rewrites tokens (vendor untouched); `npm test` green. (The tab JS does not exist yet, so `#tank3` won't init — that's fine; this task only wires the shell.)

```bash
git add -A
git commit -m "tank3: wire tabbar + tab div + app-container fill + tron score tint"
```

---

### Task 2: The Tank3 tab — Tron-skinned planet combat over the tanks2 core

**Files:**
- Create: `src/tank3-tab.js` (from a copy of `src/tank2-tab.js`, renamed, then re-skinned)

**Interfaces:**
- Consumes: `createPlanetTankGame, DYING_T` from `./tanks2.js`; `buildUnit, makeBulletCloud, makeDebris` from `./units.js`; `LOOKS` from `./looks.js`; `mulberry32` from `./rng.js`; `norm3, scale3` from `./vec3.js`; DOM ids + `.combat-score.tron` from Task 1.
- Produces: `initTank3Tab(root) -> { setActive(on) }`, registered in Task 1's `main.js` entry.

- [ ] **Step 1: Copy tank2-tab.js and rename to tank3**

```bash
cp src/tank2-tab.js src/tank3-tab.js
sed -i '' 's/tank2/tank3/g' src/tank3-tab.js
```

Rationale: `sed 's/tank2/tank3/g'` renames `initTank2Tab`, `#tank2-*`, `tank2.unlocked`, `TANK2 `, and the header comment. It does NOT touch the `./tanks2.js` import — `tanks2` contains the substring `tanks2`, not `tank2` (the char after `tank` is `s`, not `2`), so the import is safe.

Verify the import is intact and the renames landed:

```bash
grep -n "from './tanks2.js\|initTank3Tab\|#tank3-app\|tank3.unlocked\|'TANK3 '" src/tank3-tab.js | head
```
Expected: the `./tanks2.js` import present and unchanged; `initTank3Tab`, `#tank3-app`, `tank3.unlocked`, `TANK3` all present.

- [ ] **Step 2: Swap the import block**

Replace the top import lines (currently importing from three/lil-gui/OrbitControls/tanks2/rng/vec3) so units + looks are added. Find:

```js
import { createPlanetTankGame, DYING_T } from './tanks2.js?v=CURRENT';
import { mulberry32 } from './rng.js?v=CURRENT';
import { norm3, scale3 } from './vec3.js?v=CURRENT';
```

Replace with (keep whatever token value is currently there; bust renews it):

```js
import { createPlanetTankGame, DYING_T } from './tanks2.js?v=CURRENT';
import { buildUnit, makeBulletCloud, makeDebris } from './units.js?v=CURRENT';
import { LOOKS } from './looks.js?v=CURRENT';
import { mulberry32 } from './rng.js?v=CURRENT';
import { norm3, scale3 } from './vec3.js?v=CURRENT';
```

- [ ] **Step 3: Swap constants + scene palette to the Tron look**

Find the constants block near the top (from the tank2 copy):

```js
const DT = 1 / 60;
const TANK_SCALE = 0.08;
const COLORS = {
  space: 0x05070d, ground: 0x9cb04c, block: 0xd89048,
  red: 0xd23b2f, blue: 0x3556d2, shell: 0xf5f0dc,
};
```

Replace with:

```js
const DT = 1 / 60;
const TANK_SCALE = 0.09;    // world radius of each tank
const WALL_H = 1.05;        // wall extrusion (× sphere radius)
const LOOK = LOOKS.tronColors;
```

Then in `initTank3Tab`, find the scene/lights setup (copied from tank2):

```js
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.space);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(3, 4, 2);
  scene.add(sun);
```

Replace with the Tron light rig:

```js
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(LOOK.bg);
  scene.add(new THREE.HemisphereLight(LOOK.hemi[0], LOOK.hemi[1], LOOK.hemi[2]));
  const sun = new THREE.DirectionalLight(LOOK.sun[0], LOOK.sun[1]);
  sun.position.set(3, 4, 2);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(LOOK.fill[0], LOOK.fill[1]);
  fill.position.set(-3, -2, -4);
  scene.add(fill);
```

- [ ] **Step 4: Replace the box tanks + cube shells with Battle assets**

Find the tank + shell mesh creation (copied from tank2 — the `buildTank` function and the `tankMeshes` / `shellMeshes` / anchor lines). It looks like:

```js
  function buildTank(color) {
    const mat = new THREE.MeshLambertMaterial({ color });
    const g = new THREE.Group();
    const add = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
    };
    add(1.0, 0.35, 0.7, 0, 0.28, 0);
    add(1.1, 0.25, 0.22, 0, 0.13, 0.42);
    add(1.1, 0.25, 0.22, 0, 0.13, -0.42);
    add(0.5, 0.28, 0.45, -0.05, 0.6, 0);
    add(0.7, 0.1, 0.1, 0.55, 0.62, 0);
    g.scale.setScalar(TANK_SCALE);
    return g;
  }
  const tankMeshes = [buildTank(COLORS.red), buildTank(COLORS.blue)];
  const shellMat = new THREE.MeshLambertMaterial({ color: COLORS.shell });
  const shellMeshes = [0, 1].map(() =>
    new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), shellMat));
  scene.add(...tankMeshes, ...shellMeshes);
  // chase anchors ride INSIDE the tank group: camera derives from world
  // transforms, never from heading math (hard rule).
  const chaseEye = new THREE.Object3D();
  chaseEye.position.set(-3.4, 2.4, 0);
  const chaseTarget = new THREE.Object3D();
  chaseTarget.position.set(2.6, 0.6, 0);
  tankMeshes[0].add(chaseEye, chaseTarget);
  const povEye = new THREE.Object3D();
  povEye.position.set(0.2, 1.15, 0);
  const povTarget = new THREE.Object3D();
  povTarget.position.set(6, 0.7, 0);
  tankMeshes[0].add(povEye, povTarget);
  const VIEWS = ['chase', 'pov', 'orbit'];
```

Replace the whole block above with (Battle mesh tanks, barrel = +Z, anchors on the +Z axis):

```js
  // battle mesh tank; barrel is local +Z. Disable the sweep tick (manual
  // aim). Scale so the normalized-to-unit group renders at TANK_SCALE.
  function makeTankMesh(cols) {
    const g = buildUnit('tank', cols);
    g.userData.tick = null;                                  // no turret sweep
    g.scale.setScalar((g.userData.baseScale ?? 1) * TANK_SCALE);
    return g;
  }
  const tankMeshes = [
    makeTankMesh({ walker: LOOK.walker, walkerHi: LOOK.walkerHi }), // player = cyan
    makeTankMesh({ walker: LOOK.enemy, walkerHi: LOOK.enemyHi }),   // AI = magenta
  ];
  const shellMeshes = [0, 1].map((i) => {
    const m = makeBulletCloud({ body: i === 0 ? LOOK.walkerHi : LOOK.enemyHi, hi: 0xffffff });
    m.scale.setScalar(0.02);
    m.visible = false;
    scene.add(m);
    return m;
  });
  scene.add(...tankMeshes);
  // chase/POV anchors ride INSIDE the player tank group (barrel = +Z, so
  // "behind" is -Z, "ahead" is +Z). Camera derives from their world
  // transforms — never from heading math (hard rule).
  const chaseEye = new THREE.Object3D();
  chaseEye.position.set(0, 2.4, -3.4);
  const chaseTarget = new THREE.Object3D();
  chaseTarget.position.set(0, 0.6, 2.6);
  tankMeshes[0].add(chaseEye, chaseTarget);
  const povEye = new THREE.Object3D();
  povEye.position.set(0, 1.15, 0.2);
  const povTarget = new THREE.Object3D();
  povTarget.position.set(0, 0.7, 6);
  tankMeshes[0].add(povEye, povTarget);
  const VIEWS = ['chase', 'pov', 'orbit'];
```

- [ ] **Step 5: Replace `buildPlanet` with the Tron geometry builder**

Find the entire `buildPlanet()` function (copied from tank2 — it builds the olive ground + orange wall prisms). Replace the whole function with:

```js
  const rgbOf = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

  // Battle/Tron world on the tank2 planet: dark zone-tinted floors, additive
  // neon-cyan edge wires, black-topped neon walls. Zone field = seeded
  // accent centres with gaussian angular falloff, blended per cell (ported
  // from battle-tab's buildGeometry, minus the dungeon tags).
  function buildPlanet() {
    if (planetGroup) {
      scene.remove(planetGroup);
      planetGroup.traverse((o) => o.geometry && o.geometry.dispose());
    }
    planetGroup = new THREE.Group();
    const { mesh, walls, centers } = game.planet;
    const { vertices, quads } = mesh;
    const zs = LOOK.zones;

    // bake the zonal color field
    const zrng = mulberry32((params.seed ^ 0x7c0104) >>> 0);
    const accents = [];
    for (const [hex, count, sigma] of zs.accents) {
      for (let k = 0; k < count; k++) {
        const zz = 2 * zrng() - 1, th = 2 * Math.PI * zrng(), rr = Math.sqrt(Math.max(0, 1 - zz * zz));
        accents.push({ d: [rr * Math.cos(th), zz, rr * Math.sin(th)], c: rgbOf(hex), s: sigma });
      }
    }
    const bc = rgbOf(zs.base);
    const zone = new Float32Array(quads.length * 3);
    for (let ci = 0; ci < quads.length; ci++) {
      const u = centers[ci];
      let r = bc[0] * zs.baseWeight, g = bc[1] * zs.baseWeight, b = bc[2] * zs.baseWeight, W = zs.baseWeight;
      for (const cn of accents) {
        const dv = Math.max(-1, Math.min(1, u[0] * cn.d[0] + u[1] * cn.d[1] + u[2] * cn.d[2]));
        const w = Math.exp(-((Math.acos(dv) / cn.s) ** 2));
        r += cn.c[0] * w; g += cn.c[1] * w; b += cn.c[2] * w; W += w;
      }
      zone[ci * 3] = r / W; zone[ci * 3 + 1] = g / W; zone[ci * 3 + 2] = b / W;
    }
    const tint = (ci) => [zone[ci * 3], zone[ci * 3 + 1], zone[ci * 3 + 2]];

    const fPos = [], fCol = [], ePos = [], eCol = [], wPos = [], wCol = [], tPos = [], tCol = [];
    const pushEdge = (p, q2, ci) => { ePos.push(p[0], p[1], p[2], q2[0], q2[1], q2[2]); const c = tint(ci); eCol.push(c[0], c[1], c[2], c[0], c[1], c[2]); };
    const pushTop = (p, q2, ci) => { tPos.push(p[0], p[1], p[2], q2[0], q2[1], q2[2]); const c = tint(ci); tCol.push(c[0], c[1], c[2], c[0], c[1], c[2]); };
    const pushQuad = (p0, p1, p2, p3, c) => { for (const p of [p0, p1, p2, p0, p2, p3]) wPos.push(p[0], p[1], p[2]); for (let i = 0; i < 6; i++) wCol.push(c[0], c[1], c[2]); };

    // floors (open cells) at the surface
    const lv = zs.floorLevels.path;
    for (let ci = 0; ci < quads.length; ci++) {
      if (walls.has(ci)) continue;
      const q = quads[ci];
      const r = zone[ci * 3] * lv, g = zone[ci * 3 + 1] * lv, b = zone[ci * 3 + 2] * lv;
      for (const vi of [q[0], q[1], q[2], q[0], q[2], q[3]]) { const p = vertices[vi]; fPos.push(p[0], p[1], p[2]); fCol.push(r, g, b); }
      for (let i = 0; i < 4; i++) pushEdge(vertices[q[i]], vertices[q[(i + 1) % 4]], ci);
    }

    // walls: extruded wall cells, black tops, zone-tinted skirts facing open cells
    const edgeToCell = new Map();
    for (let ci = 0; ci < quads.length; ci++) { const q = quads[ci]; for (let i = 0; i < 4; i++) edgeToCell.set(`${q[i]}-${q[(i + 1) % 4]}`, ci); }
    for (const ci of walls) {
      const q = quads[ci];
      const top = q.map((vi) => scale3(norm3(vertices[vi]), WALL_H));
      pushQuad(top[0], top[1], top[2], top[3], [0, 0, 0]); // black top (tron occluder)
      for (let i = 0; i < 4; i++) {
        const a = q[i], b = q[(i + 1) % 4];
        const nb = edgeToCell.get(`${b}-${a}`);
        const facesOpen = nb !== undefined && !walls.has(nb);
        if (facesOpen) {
          const sc = zs.wallSideLevel * 10;
          const sideCol = [zone[ci * 3] * sc, zone[ci * 3 + 1] * sc, zone[ci * 3 + 2] * sc];
          pushQuad(top[(i + 1) % 4], top[i], vertices[a], vertices[b], sideCol);
          pushEdge(top[i], vertices[a], ci);
          pushEdge(top[(i + 1) % 4], vertices[b], ci);
          pushEdge(top[i], top[(i + 1) % 4], ci);
        } else {
          pushTop(top[i], top[(i + 1) % 4], ci);
        }
      }
    }

    const faceMat = () => new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const addFaces = (pos, col) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      planetGroup.add(new THREE.Mesh(g, faceMat()));
    };
    addFaces(fPos, fCol);
    addFaces(wPos, wCol);
    const E = LOOK.edges;
    const addLines = (pos, col) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      planetGroup.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: E.opacity,
        blending: E.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: !E.additive,
      })));
    };
    addLines(ePos, eCol);
    addLines(tPos, tCol);
    scene.add(planetGroup);
  }
```

- [ ] **Step 6: Orient tanks on +Z, and orient/position the dot-cloud shells**

Find `orientTank` (copied from tank2 — it uses `_x = head` i.e. +X barrel):

```js
  function orientTank(group, t) {
    _x.set(...t.head);          // barrel +x = heading
    _y.set(...t.pos);           // up = surface normal
    _z.crossVectors(_x, _y);    // right-handed basis
    _m.makeBasis(_x, _y, _z);
    group.quaternion.setFromRotationMatrix(_m);
    group.position.set(...t.pos);
  }
```

Replace with (+Z = heading for the makeTank barrel):

```js
  function orientTank(group, t) {
    _z.set(...t.head);          // barrel +z = heading
    _y.set(...t.pos);           // up = surface normal (+y)
    _x.crossVectors(_y, _z);    // right = up × forward (right-handed)
    _m.makeBasis(_x, _y, _z);
    group.quaternion.setFromRotationMatrix(_m);
    group.position.set(...t.pos);
  }
```

Then find the shell block inside `syncScene` (copied from tank2):

```js
      const s = game.shells[i];
      shellMeshes[i].visible = !!s;
      if (s) shellMeshes[i].position.set(...scale3(s.pos, 1.015));
```

The bullet cloud's long axis is local **+Y** (per `makeBulletCloud`), so point +Y along the flight tangent `s.dir` with `quaternion.setFromUnitVectors`. Replace with:

```js
      const s = game.shells[i];
      shellMeshes[i].visible = !!s;
      if (s) {
        shellMeshes[i].position.set(...scale3(s.pos, 1.02));
        _v1.set(s.dir[0], s.dir[1], s.dir[2]).normalize();
        shellMeshes[i].quaternion.setFromUnitVectors(_UP, _v1);
        shellMeshes[i].rotateY(game.time * 40); // rifling spin about the flight axis
      }
```

Add a module-level temp `const _UP = new THREE.Vector3(0, 1, 0);` beside the other temp vectors (the `_v1 / _v2 / _q` declaration line, carried over from the tank2 copy). `_v1` already exists there.

- [ ] **Step 7: Replace the blocky explosion with `makeDebris`**

Find the debris section (copied from tank2 — `const debris = []; function explodeAt(...) { … 8 cubes … } function tickDebris(dt) { … }`). Replace the whole `explodeAt` + `tickDebris` pair with:

```js
  // battle polygon-scatter death: bake the struck tank's triangles into a
  // debris mesh that flies apart and fades (units.makeDebris).
  const debris = [];
  function explodeAt(i) {
    const d = makeDebris(tankMeshes[i], game.tanks[i].pos);
    scene.add(d);
    debris.push(d);
  }
  function tickDebris(dt) {
    for (let k = debris.length - 1; k >= 0; k--) {
      if (!debris[k].userData.tick(dt)) {
        scene.remove(debris[k]);
        debris[k].geometry.dispose();
        if (debris[k].material.dispose) debris[k].material.dispose();
        debris.splice(k, 1);
      }
    }
  }
```

Then find the `hit` handler in `consumeEvents` (copied from tank2 — it calls `explodeAt(victim.pos, …)` with a color). Replace that call:

```js
        const victim = game.tanks[1 - e.by];
        explodeAt(victim.pos, e.by === 0 ? COLORS.blue : COLORS.red);
```

with:

```js
        explodeAt(1 - e.by);
```

- [ ] **Step 8: Bust, test, headless-verify the render**

```bash
./scripts/bust.sh --quiet
npm test
curl -s -o /dev/null http://localhost:8144/ || (npm run serve &>/dev/null & sleep 1)
for v in chase pov orbit; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
    --enable-logging=stderr --window-size=1200,800 --virtual-time-budget=12000 \
    --screenshot="$CLAUDE_JOB_DIR/tmp/tank3-$v.png" \
    "http://localhost:8144/?tick=5&ai=2&view=$v#tank3" 2>&1 | grep -oE "TANK3 \{[^}]*\}|Uncaught|TypeError|is not a function"
done
```
Expected: a `TANK3 {…}` line per view and NO error tokens; `npm test` green. VIEW each screenshot and confirm: a dark neon-cyan wire planet, faint zone-tinted floors, the mesh tanks (cyan player, magenta AI) with barrels, dot-cloud shells if any in flight. If the planet is invisible/black or a tank is missing, debug (check the geometry builder attributes and the `+Z` orientation) before committing.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "tank3: planet combat in the battle/tron skin — mesh tanks, dot-cloud shells, neon world"
```

---

### Task 3: Docs + final sweep + push

**Files:**
- Modify: `DEVLOG.md` (newest-first entry)
- Modify: `HOW-IT-WORKS.md` (append a Tank3 section)

- [ ] **Step 1: HOW-IT-WORKS.md — append**

```markdown
## Tank3 (planet combat, Battle skin)

The same planet duel as Tank2 — identical `tanks2.js` core, manual aim,
great-circle shells, the L1–L4 AI ladder with the ghost gunner — wearing
the Battle tab's Tron dress. The tab swaps only the render: the world is
built from `LOOKS.tronColors` (additive neon-cyan edge wires, near-black
void, a seeded zonal colour field over the floors, black-topped neon
walls), the tanks are Battle's `buildUnit('tank')` meshes with their neon
edge outlines (barrel along +Z, turret locked forward because aim is
manual), shells are `makeBulletCloud` Braille dot-clouds, and a hit scatters
the struck tank into its own polygons via `makeDebris`. No core changes —
Tank3 is a skin over proven rules.
```

- [ ] **Step 2: Final headless sweep**

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
  --enable-logging=stderr --window-size=1280,800 --virtual-time-budget=15000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/tank3-final.png" \
  "http://localhost:8144/?tick=12&ai=3&view=chase#tank3" 2>&1 | grep TANK3
```
Expected: a `TANK3 {…}` line. VIEW the screenshot.

- [ ] **Step 3: Commit docs + DEVLOG, push**

```bash
git add HOW-IT-WORKS.md
git commit -m "tank3: HOW-IT-WORKS section"
git log -1 --format=%h   # note hash H (use the Task 2 tab commit hash for the devlog subject if preferred)
```

Append a DEVLOG.md entry (newest-first, after the intro block, `---` separator), then commit as `devlog: <H> — tank3 battle skin`:

```markdown
## `<H>` — Tank2's rules, Battle's clothes

Tank3 is the planet duel in neon. It reuses the whole `tanks2.js` core —
manual aim, great-circle shells, the ghost-gunner AI ladder, the
dead-zone orbit follow — and changes only what you see: a Tron world
(additive cyan wire-grid, near-black void, seeded zone-tinted floors,
black neon walls), Battle's mesh tanks with edge outlines (cyan you,
magenta the AI), Braille dot-cloud shells, and polygon-scatter deaths.
One new tab file; the core never moved.
```

```bash
git add DEVLOG.md
git commit -m "devlog: <H> — tank3 battle skin"
git push origin main
```

Then Telegram the operator (milestone): Tank3 live, `#tank3`.

---

## Final acceptance checklist

- [ ] `npm test` green (unchanged core, `test/tanks2.mjs` passes)
- [ ] `#tank3` deep-link opens a playable duel in the Tron skin
- [ ] `C` cycles chase/pov/orbit (orbit uses the tank2 lead-follow)
- [ ] Tanks render as Battle meshes (cyan player, magenta AI), barrels along heading
- [ ] Shells are dot-clouds; a hit scatters the tank into polygons
- [ ] Score digits are cyan/magenta (`.combat-score.tron`)
- [ ] `?tick/?ai/?view/?seed#tank3` headless prints a `TANK3` line, no errors
- [ ] All bust output committed atomically; vendor imports token-free
- [ ] `tanks2.js` and all existing tabs unchanged
- [ ] DEVLOG + HOW-IT-WORKS entries present
