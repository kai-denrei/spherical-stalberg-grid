# TD Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three TD tweaks — move the tutorial portal 20–30 hops down the hall, add build-mode pinch-zoom (closer default), and replace the bullet-triad shell pickups with a new missile dot-cloud.

**Architecture:** Missile is a pure dot-cloud generator ported into `creatures.js` + a `makeMissileCloud` factory in `units.js`; `td-tab.js` swaps the pickup builder to it. Portal distance and pinch-zoom are localized `td-tab.js` edits (+ one `styles.css` rule). Spec: `docs/superpowers/specs/2026-08-25-td-refinements-portal-zoom-missile-design.md`.

**Tech Stack:** Vanilla ES modules, three.js, `td-tab.js` closure, `creatures.js`/`units.js` asset factories.

## Global Constraints

- After editing any `src/*.js`, `index.html`, or `styles.css`: run `./scripts/bust.sh --quiet`, and commit ALL its output atomically (`git add -A`). NEVER token `../vendor/` imports. The pre-push guard (`scripts/check-tokens.sh`) blocks split tokens.
- `npm test` must stay green (regression guard; no new Node tests — this is render/input/tutorial-scripting layer).
- No `Math.random` in game logic. Do NOT push in any task — commits stay local; the controller pushes once at the very end after the final review + deban sync.
- Zoom clamp is `[1.4, 4.0]` (closer min than the old 1.7; same 4.0 max). buildDist default 2.0.
- Portal band: nearest open cell with `distToHeart` in `[20, 30]` (target 25), else the max-`distToHeart` open cell.
- Only the SHELL PICKUP + its glossary icon become missiles; the fired-projectile tracers (`makeBulletCloud` at td-tab.js ~2417 and ~2754) stay bullets — do NOT touch them.
- Commits: explain the why; end with the repo's Co-Authored-By + Claude-Session trailer. DEVLOG + HOW-IT-WORKS in the final task.

## Verified anchors (read before editing; match on CODE, line numbers may drift)

- `missilePts()` source: `/Users/minikai/Dev/Braille/fun-shapes/index.html:617` (code inlined in Task 1).
- `bulletPts` export + `fitUnit`: `src/creatures.js:122` / `:21`. creatures.js is imported by units.js at `units.js:18`.
- `makeBulletCloud`: `src/units.js:770`.
- `spawnOrbAt` pickup shells: `td-tab.js:284` (the `makeBulletCloud` at `:291`).
- `makeTriadIcon` glossary icon: `td-tab.js:1629` (the `makeBulletCloud` at `:1633`); glossary label `'bullet triads'` in `showBriefing`.
- units import in td-tab.js: `td-tab.js:27`.
- Tutorial portal pick: `td-tab.js:1445-1447` (`distToHeart === 1`).
- Build camera/zoom: `buildDist = 2.6` `td-tab.js:829`; pointer decls `buildDragX`/`tapStart` `td-tab.js:1340-1341`; pointerdown `:1342`; pointermove `:1347`; pointerup `:1356`; wheel `:1381` (clamp `[1.7,4.0]`). `cellAtScreen` raycast `:3310` (no change).
- Build CSS class `#tab-td.build` hides thumb-zones: `styles.css` ~349.

---

### Task 1: Missile model + swap shell pickups to missiles

**Files:**
- Modify: `src/creatures.js` (add + export `missilePts`)
- Modify: `src/units.js` (add + export `makeMissileCloud`; import `missilePts`)
- Modify: `src/td-tab.js` (import `makeMissileCloud`; swap `spawnOrbAt` + `makeTriadIcon` to it; relabel glossary)

**Interfaces:**
- Produces: `missilePts()` (695 pts `[x,y,z,(hi)]`, +Y up, unit-radius), `makeMissileCloud(cols)` → `THREE.Points` (`userData.kind='missile'`), drop-in for the pickup slot.

- [ ] **Step 1: Port `missilePts()` into creatures.js**

In `src/creatures.js`, right after `bulletPts()`, add (verbatim from the Braille source; `fitUnit` already exists in this file):

```js
// missile — sleek standalone rocket: pointed nose, banded body, 4 tail fins.
// Ported from ~/Dev/Braille/fun-shapes. 695 pts [x,y,z,(hi)], unit-radius,
// +Y up, tip at y≈+1, one hi point (nose tip). No new deps (uses fitUnit).
export function missilePts() {
  const pts = [], R = 0.16;
  for (let iy = 0; iy <= 22; iy++) { const y = -0.75 + iy / 22 * 1.2; for (let a = 0; a < 14; a++) { const ang = a / 14 * 2 * Math.PI; pts.push([R * Math.cos(ang), y, R * Math.sin(ang)]); } } // body
  for (let iy = 0; iy <= 12; iy++) { const f = iy / 12, y = 0.45 + f * 0.5, r = R * (1 - f * f); for (let a = 0; a < 12; a++) { const ang = a / 12 * 2 * Math.PI; pts.push([r * Math.cos(ang), y, r * Math.sin(ang)]); } } // ogive nose
  pts.push([0, 0.95, 0, 1]); // nose-tip highlight
  for (let k = 0; k < 4; k++) { const ca = Math.cos(k / 4 * 2 * Math.PI), sa = Math.sin(k / 4 * 2 * Math.PI); for (let i = 0; i <= 8; i++) { const f = i / 8; for (let j = 0; j <= 5; j++) { const g = j / 5, x = R + g * 0.16 * (1 - f); pts.push([x * ca, -0.75 + f * 0.3, x * sa]); } } } // 4 tail fins
  return fitUnit(pts);
}
```

- [ ] **Step 2: Verify the generator loads**

Run: `node -e "import('./src/creatures.js').then(m => { const p = m.missilePts(); console.log('missile pts', p.length, 'hi', p.filter(q=>q[3]===1).length); })"`
Expected: `missile pts 695 hi 1`.

- [ ] **Step 3: Add `makeMissileCloud` in units.js**

In `src/units.js`, extend the creatures import (line 18) to include `missilePts` (add it to the existing `{ … }` list). Then add, right after `makeBulletCloud` (ends ~line 791):

```js
// missile dot-cloud — same builder as makeBulletCloud, missile silhouette.
export function makeMissileCloud(cols) {
  const base = missilePts();
  const pos = new Float32Array(base.length * 3);
  const col = new Float32Array(base.length * 3);
  const cBody = new THREE.Color(cols.body);
  const cHi = new THREE.Color(cols.hi);
  for (let i = 0; i < base.length; i++) {
    pos[i * 3] = base[i][0]; pos[i * 3 + 1] = base[i][1]; pos[i * 3 + 2] = base[i][2];
    const c = base[i][3] === 1 ? cHi : cBody;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 2, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.95,
  }));
  pts.userData.kind = 'missile';
  return pts;
}
```

- [ ] **Step 4: Swap the pickup + glossary icon in td-tab.js**

In `src/td-tab.js`, add `makeMissileCloud` to the units import (line 27, the `from './units.js…'` list).

In `spawnOrbAt` (line ~291), change the pickup shell:
```js
      const b = makeBulletCloud({ body: look().orb.color, hi: 0xffffff });
```
to:
```js
      const b = makeMissileCloud({ body: look().orb.color, hi: 0xffffff });
```

In `makeTriadIcon` (line ~1633), change:
```js
      const b = makeBulletCloud({ body: 0xffb000, hi: 0xffffff });
```
to:
```js
      const b = makeMissileCloud({ body: 0xffb000, hi: 0xffffff });
```

And update the glossary label so the card matches: find `'bullet triads'` in `showBriefing` (the `glossCard(…, 'bullet triads', …)` call) and change the label text `'bullet triads'` → `'missile triads'`. Leave the 2417/2754 `makeBulletCloud` tracers untouched.

- [ ] **Step 5: Bust, test, headless-verify missiles on the field**

```bash
./scripts/bust.sh --quiet && npm test
curl -s -o /dev/null http://localhost:8144/ || (npm run serve &>/dev/null & sleep 1)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
  --window-size=1200,800 --virtual-time-budget=10000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/td-missiles.png" \
  "http://localhost:8144/?tutorial=0&wave=1#td" 2>&1 | grep -oiE "Uncaught|TypeError|is not" | head
```
Expected: no error tokens; `npm test` green. VIEW the screenshot — the shell pickups on the field are slim finned missiles (nose up), not the fat bullets. If none are visible in frame, that's OK (they're scattered); the key checks are no errors + missiles render where a pickup is in view.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "td: shell pickups become missiles — port missilePts, makeMissileCloud, swap pickup + glossary icon"
```

---

### Task 2: Tutorial portal — 20–30 hops down the hall

**Files:**
- Modify: `src/td-tab.js` (`tutorial.setup()` portal-cell pick, ~line 1445)

**Interfaces:**
- Consumes: `dungeon.tags`, `dungeon.distToHeart`, `BLOCKED`.
- Produces: the scripted phage portal at a cell 20–30 hops from the heart.

- [ ] **Step 1: Replace the portal-cell scan**

In `tutorial.setup()` (td-tab.js ~1445), replace:
```js
      let portalCi = startCi;
      for (let i = 0; i < dungeon.tags.length; i++) {
        if (dungeon.tags[i] !== BLOCKED && dungeon.distToHeart[i] === 1) { portalCi = i; break; }
      }
```
with (nearest open cell to distToHeart 25, within [20,30]; fallback = farthest open cell):
```js
      // portal 20–30 hops DOWN THE HALL from the heart (target 25); the
      // fodder march back toward the heart and the player intercepts.
      let portalCi = startCi, bestBand = Infinity, farCi = startCi, farD = -1;
      for (let i = 0; i < dungeon.tags.length; i++) {
        if (dungeon.tags[i] === BLOCKED) continue;
        const d = dungeon.distToHeart[i];
        if (d < 0) continue;
        if (d > farD) { farD = d; farCi = i; }
        if (d >= 20 && d <= 30) {
          const off = Math.abs(d - 25);
          if (off < bestBand) { bestBand = off; portalCi = i; }
        }
      }
      if (bestBand === Infinity) portalCi = farCi; // small map: use the farthest cell
```

- [ ] **Step 2: Bust, test, headless-verify the portal is down the hall**

```bash
./scripts/bust.sh --quiet && npm test
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
  --window-size=1200,800 --virtual-time-budget=9000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/td-portal-far.png" \
  "http://localhost:8144/?tutorial=1#td" 2>&1 | grep -oiE "Uncaught|TypeError|is not" | head
```
Expected: no errors. VIEW the screenshot — the phage portal is now clearly separated from the heart/player (down a corridor), not sitting on the heart. Optionally add a temporary console assertion while verifying: the HUD/portal should read as distant; confirm no crash if a seed has no cell in [20,30] (the fallback handles it).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "td tutorial: portal spawns 20–30 hops down the hall, not on the heart"
```

---

### Task 3: Build-mode pinch-zoom + closer default

**Files:**
- Modify: `src/td-tab.js` (`buildDist` default; pointer decls + handlers; wheel clamp)
- Modify: `styles.css` (`#tab-td.build #td-app { touch-action: none }`)

**Interfaces:**
- Consumes: `buildMode`, `cellAtScreen`, `openShop`, `buildYaw`, `params.view`, `camera`, `renderer`, `raycaster`, `ndc`, `towers`, `watchTower`.
- Produces: two-finger pinch zoom in build mode; single-finger yaw drag + tap preserved.

- [ ] **Step 1: Closer default**

td-tab.js line ~829: change `let buildDist = 2.6;` to `let buildDist = 2.0;` (comment still `// wheel/pinch zooms`).

- [ ] **Step 2: Replace the pointer state + handlers**

Replace the block from `let buildDragX = null;` (line ~1340) through the end of the `pointerup` handler (the closing `});` at ~line 1380) with:

```js
  // build-mode input: single finger orbits the azimuth, TWO fingers pinch to
  // zoom. Track pointers by id so a pinch never fires a tower-placing tap.
  const buildPointers = new Map(); // pointerId -> {x, y}
  let pinchPrev = null;            // last two-finger pixel distance
  let pinched = false;             // ≥2 fingers touched this gesture → no tap
  let tapStart = null;
  container.addEventListener('pointerdown', (ev) => {
    if (!buildMode && params.view !== 'bastion') return;
    if (buildMode) {
      buildPointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (buildPointers.size >= 2) { pinched = true; pinchPrev = null; tapStart = null; return; }
    }
    tapStart = [ev.clientX, ev.clientY];
  });
  addEventListener('pointermove', (ev) => {
    if (!buildMode) return;
    const prev = buildPointers.get(ev.pointerId);
    if (!prev) return;
    const dx = ev.clientX - prev.x;
    prev.x = ev.clientX; prev.y = ev.clientY;
    if (buildPointers.size >= 2) {
      const p = [...buildPointers.values()];
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (pinchPrev !== null && d > 0) {
        buildDist = Math.min(4, Math.max(1.4, buildDist * (pinchPrev / d)));
      }
      pinchPrev = d; pinched = true; tapStart = null;
      return;
    }
    if (tapStart && Math.hypot(ev.clientX - tapStart[0], ev.clientY - tapStart[1]) > 8) {
      tapStart = null; // it's an orbit now
    }
    buildYaw += dx * 0.006;
  });
  function endBuildPointer(ev) {
    const wasTap = !pinched && tapStart
      && Math.hypot(ev.clientX - tapStart[0], ev.clientY - tapStart[1]) <= 8;
    buildPointers.delete(ev.pointerId);
    if (buildPointers.size < 2) pinchPrev = null;
    if (buildMode && wasTap) {
      const ci = cellAtScreen(ev.clientX, ev.clientY);
      if (ci !== -1) openShop(ci, ev.clientX, ev.clientY);
    } else if (!buildMode && params.view === 'bastion' && wasTap) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1,
        -((ev.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(towers.map((tw) => tw.obj), true);
      if (hits.length) {
        let obj = hits[0].object;
        while (obj && !towers.some((tw) => tw.obj === obj)) obj = obj.parent;
        watchTower = towers.find((tw) => tw.obj === obj) || null;
      } else {
        watchTower = null;
      }
    }
    if (buildPointers.size === 0) { pinched = false; tapStart = null; }
  }
  addEventListener('pointerup', endBuildPointer);
  addEventListener('pointercancel', endBuildPointer);
```

(This preserves the exact bastion tower-select behavior and the 8px tap threshold; it only adds the pinch + multi-pointer bookkeeping. Verify `renderer`, `ndc`, `raycaster`, `towers`, `watchTower` are the live names — they are, from the original pointerup you're replacing.)

- [ ] **Step 3: Widen the wheel clamp to match**

td-tab.js wheel handler (line ~1382): change `Math.max(1.7, …)` to `Math.max(1.4, …)` (keep the `Math.min(4, …)`):
```js
    buildDist = Math.min(4, Math.max(1.4, buildDist + ev.deltaY * 0.002));
```

- [ ] **Step 4: Capture the pinch in build mode (CSS)**

Append to `styles.css`:
```css
/* build mode: the app owns the pinch (zoom the board, not the page). Driving
   thumb-zones are hidden in build mode, so nothing else needs the gesture. */
#tab-td.build #td-app { touch-action: none; }
```

- [ ] **Step 5: Bust, test, headless-verify closer default + no errors**

```bash
./scripts/bust.sh --quiet && npm test
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
  --window-size=1200,800 --virtual-time-budget=9000 \
  --screenshot="$CLAUDE_JOB_DIR/tmp/td-build-zoom.png" \
  "http://localhost:8144/?tutorial=0&mode=build#td" 2>&1 | grep -oiE "Uncaught|TypeError|is not" | head
```
Expected: no errors. VIEW the screenshot — build mode shows the overhead board noticeably CLOSER than before (cells larger) at the 2.0 default. Pinch itself is a two-finger gesture (not scriptable headless) — self-review the pointer-map math: spreading fingers (d grows) makes `pinchPrev/d < 1` so `buildDist` shrinks = zoom IN; a pinch sets `pinched=true` so no tap fires; single-finger drag still orbits; a clean single tap still opens the shop. Also confirm `?tutorial=1#td` (action view) still drives normally with no error.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "td: build-mode pinch-zoom + closer default (buildDist 2.0, clamp 1.4–4.0, touch-action capture)"
```

---

### Task 4: Docs

**Files:**
- Modify: `HOW-IT-WORKS.md`, `DEVLOG.md`

- [ ] **Step 1: HOW-IT-WORKS.md — append**

```markdown
## TD refinements: portal reach, build zoom, missiles

The tutorial's portal no longer sits on the heart — it spawns 20–30 hops
down the corridor, so the fodder march in and you drive out to meet them.
Build mode zooms: it opens closer (so cells are tappable), desktop keeps
wheel-zoom, and mobile gets two-finger pinch (the board owns the gesture in
build mode, so the page doesn't zoom) — the tap-to-place raycast stays
pixel-accurate at any zoom. And the shell pickups are now missiles: a triad
of the finned `missilePts` dot-cloud (ported from the Braille fun-shapes
lab), still +3 per pickup. Fired tower tracers keep the bullet shape.
```

- [ ] **Step 2: Final headless sweep**

```bash
./scripts/bust.sh --quiet && npm test
for u in "tutorial=1" "tutorial=0&mode=build" "tutorial=0&wave=1"; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --enable-logging=stderr \
    --window-size=1200,800 --virtual-time-budget=9000 \
    --screenshot="$CLAUDE_JOB_DIR/tmp/td-final-$RANDOM.png" \
    "http://localhost:8144/?$u#td" 2>&1 | grep -oiE "Uncaught|TypeError" | head
done
```
Expected: `npm test` green, no error tokens across all three.

- [ ] **Step 3: Commit docs + DEVLOG (NO push — controller pushes after review + deban)**

```bash
git add HOW-IT-WORKS.md
git commit -m "td: HOW-IT-WORKS — portal reach, build zoom, missiles"
git log -1 --format=%h   # note hash H
```

Append the DEVLOG entry (newest-first, after the intro block, `---` separator), then `git add DEVLOG.md && git commit -m "devlog: <H> — td portal/zoom/missiles"`:

```markdown
## `<H>` — Reach, zoom, and missiles

Three TD tweaks. The tutorial portal moved off the heart's doorstep to
20–30 cells down the hall, so the opening reads as a real approach you
drive out to stop. Build mode learned to zoom — it opens closer and takes
a two-finger pinch on mobile (the board captures the gesture so the page
holds still), while the tap-to-place raycast stays exact at any distance.
And the shells you pick up are missiles now — the finned dot-cloud from the
Braille lab, three to a triad, still +3 a grab; the towers' own tracers keep
their bullets.
```

Do NOT `git push` — the controller pushes once after the final whole-branch review and the deban sync.

---

## Final acceptance checklist

- [ ] `npm test` green (no regressions)
- [ ] Tutorial portal is 20–30 hops from the heart (down the hall), fallback for tiny maps
- [ ] Shell pickups (field + tutorial + glossary icon) render as missiles; +3 unchanged; tracers still bullets
- [ ] Build mode opens closer (buildDist 2.0); wheel + pinch clamp [1.4, 4.0]
- [ ] Two-finger pinch zooms the board (not the page); single-finger orbit + tap-to-place preserved; a pinch never places a tower
- [ ] All bust output committed atomically; pre-push guard passes at the end; vendor imports token-free
- [ ] DEVLOG + HOW-IT-WORKS entries present
