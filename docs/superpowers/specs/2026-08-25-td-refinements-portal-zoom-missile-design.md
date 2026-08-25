# TD refinements: portal distance + build zoom + missile shells — design

2026-08-25. Three TD tweaks requested together after the tutorial shipped.

## Decisions (from brainstorm)

1. **Tutorial portal distance:** move the scripted phage portal from
   `distToHeart === 1` (on the heart) to **20–30 hops down the hall**;
   fodder march toward the heart, player intercepts. Failure-proof heart
   unchanged.
2. **Build-mode zoom:** pinch-to-zoom on mobile + a closer default zoom;
   desktop wheel-zoom kept. (Rejected: +/- buttons; auto-zoom-only.)
3. **Missile shells:** the shell pickup (bullet-triad = +3) becomes a
   triad of THREE missile dot-clouds (all pickups, tutorial + normal);
   +3 mechanic unchanged; fired-projectile tracers keep the bullet model.

## Verified facts (integration map)

- **Missile model:** `missilePts()` in `/Users/minikai/Dev/Braille/fun-shapes/index.html:617`
  — 695 pts `[x,y,z,(hi)]`, +Y up, unit-radius via `fitUnit` (already in
  creatures.js), 1 hi point (nose tip). Format-identical to `bulletPts()`
  (creatures.js:122); no dependencies beyond `fitUnit`. `makeBulletCloud`
  (units.js:770) reads `base[i][0..2]` + `base[i][3]===1` — a missile
  clone needs zero format changes.
- **Build camera:** hand-rolled follow cam, `PerspectiveCamera(68,…)`
  (td-tab.js:123); no OrbitControls. Build mode = overhead-of-heart view
  at distance `buildDist` (`let buildDist = 2.6`, td-tab.js:829),
  `updateCameraGoal()` build branch at td-tab.js:908, `lookAt(0,0,0)`.
- **Wheel zoom exists** (desktop): `wheel` handler td-tab.js:1381, clamps
  `buildDist` to [1.7, 4.0]. **No pinch** — pointer handlers
  (pointerdown 1342 / pointermove 1347 / pointerup 1356) are
  single-pointer (`buildDragX`, no pointerId map); the "pinch" comment at
  829 was never wired.
- **Tap→cell:** `cellAtScreen(x,y)` (td-tab.js:3310) RAYCASTS
  `[wallMesh, floorMesh]`, takes `hits[0].point`, → `cellIndex(point)`
  (voxel-hash nearest). Fully zoom-aware: zoom in → bigger cells on
  screen → easier tap, NO pick-logic change needed.
- **Build CSS:** `#tab-td.build` already hides the driving thumb-zones
  (styles.css ~349), so `touch-action:none` on the build canvas is safe
  (no driving gestures to preserve in build mode).
- **Shell pickup builder:** `spawnOrbAt(ci)` (td-tab.js, from the tutorial
  refactor) builds a group of 3 `makeBulletCloud` shells (k=-1,0,1);
  `absorbOrb` gives +3. Used by `spawnOneOrb`/`spawnOrbs` (normal) and the
  tutorial.
- **Tutorial portal:** `tutorial.setup()` currently picks
  `distToHeart === 1` for the scripted portal.

## Section 1 — portal distance + missile shells

**Portal (#1).** In `tutorial.setup()`, replace the portal-cell scan
(currently first cell with `distToHeart === 1`) with: scan open
(non-BLOCKED) cells for the one whose `distToHeart` is closest to the
middle of [20,30] (target 25); if none fall in [20,30] (small map/seed),
pick the open cell with the maximum `distToHeart` (clamp toward far). The
player start stays as-is (near heart); the 3 phage fodder still spawn AT
this portal and march toward the heart down the corridor — the player
drives to intercept. Heart stays failure-proof during the tutorial.

**Missile (#3).**
- `creatures.js`: add + `export function missilePts()` verbatim from the
  Braille source (body rings + ogive nose + nose-tip hi + 4 tail fins,
  `return fitUnit(pts)`). No new deps.
- `units.js`: add `export function makeMissileCloud(cols)` — a clone of
  `makeBulletCloud` with `bulletPts()` → `missilePts()` and
  `userData.kind = 'missile'`. Import `missilePts` from creatures.js.
- `td-tab.js`: in `spawnOrbAt`, import + use `makeMissileCloud` for the 3
  pickup shells instead of `makeBulletCloud`. The triad layout (k=-1,0,1),
  scale, spin/hover idle tick, and `absorbOrb` +3 are unchanged. This
  swaps ALL shell pickups (normal + tutorial). Fired projectiles/tracers
  keep `makeBulletCloud` — do not touch them.

## Section 2 — build-mode pinch zoom

- **Closer default + wider clamp:** initial `buildDist = 2.0`; the
  wheel/pinch clamp becomes `[1.4, 4.0]`. `buildDist` persists across
  build sessions (no reset on entry) so the player's chosen zoom sticks.
- **Multi-pointer:** replace the single `buildDragX` with a
  `Map<pointerId, {x,y}>` populated only in build mode.
  - `pointerdown` (build): `pointers.set(ev.pointerId, {x,y})`.
  - `pointermove`: update this pointer. If `pointers.size === 2` → PINCH:
    current two-finger distance vs the stored previous; `buildDist *=
    prevDist / curDist` (spread = zoom in = smaller buildDist), clamped
    [1.4,4.0]; store curDist; set `pinching = true`. If `size === 1` → the
    existing yaw drag (unchanged).
  - `pointerup`/`pointercancel`: `pointers.delete(id)`; if `size < 2`
    clear the pinch baseline (`prevDist = null`).
  - Tap-to-select fires only if the gesture NEVER had 2 pointers
    (`!pinching`) and moved < 8px — preserving the existing tap threshold.
- **Capture the gesture:** styles.css `#tab-td.build #td-app {
  touch-action: none; }` so the browser doesn't page-zoom the pinch.
  Outside build mode: unchanged (driving gestures preserved).
- **No pick change:** `cellAtScreen`'s raycast uses the live `camera`
  (reflecting the lerped `buildDist`), so it's accurate at any zoom.
- Desktop wheel-zoom kept (its clamp updated to [1.4,4.0] to match).

## Section 3 — testing, scope

**Files:** `td-tab.js` (portal pick, spawnOrbAt swap, buildDist default +
clamp, pointer-map/pinch), `creatures.js` (missilePts), `units.js`
(makeMissileCloud), `styles.css` (build touch-action).

**Testing.** No new Node tests (render/input/tutorial-scripting layer;
`towers.js` untouched — `npm test` stays green as a regression guard).
Headless (SwiftShader + `--enable-logging=stderr`):
- `?tutorial=1#td` — the portal sits well down the hall from the
  heart/player (screenshot); no JS errors.
- `?tutorial=0&mode=build#td` — build enters at the closer default, cells
  visibly larger (screenshot).
- `?tutorial=0#td` — field shell pickups render as missiles (screenshot).
- No error tokens in any.
Pinch is a two-finger gesture, not scriptable headless — verified by code
review of the pointer-map + pinch math plus the closer-default screenshot.
`./scripts/bust.sh --quiet` after edits (pre-push token guard enforces
atomic commits). DEVLOG + HOW-IT-WORKS updates.

## Out of scope

- Two-finger PAN (zoom only); pinch/zoom outside build mode.
- Any change to the driving/action camera or the fired-projectile (tracer)
  model.
- Enemy/economy rebalance.
- The deferred cinematic lock-screen camera (still backlog).
- td-tab.js size debt (deferred).
