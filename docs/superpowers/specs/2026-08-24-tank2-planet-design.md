# Tank2 — planet tank combat: design

2026-08-24. Sequel to the flat tank tab: the same Atari Combat duel on a
tiny Stålberg-grid planet, curvature as the star mechanic. Operator asks:
very small sphere, lots of curvature, reuse the oskar grid.

## Decisions (from brainstorm)

- **Terrain:** mostly open planet + seeded scattered wall clusters
  (TD-style raised cells). Horizon AND walls are cover. Rejected: bare
  planet (not Combat-like), maze-carve (hides the curvature).
- **Shells:** great-circle flight, range cap ≈40% of circumference —
  beyond the horizon, short of full orbit. Ricochet mode bounces off
  walls (2-bounce cap). Full-orbit shots: future variant, out of scope.
- **Cameras:** chase (default) + turret POV + free orbit view
  (OrbitControls, game keeps running). `C` cycles.
- **AI:** same L1–L4 ladder, sphere-aware LOS; own unlock track
  `tank2.unlocked` (flat wins don't transfer). L4 redesigned (below).
- **Architecture:** Approach A — new pure core `src/tanks2.js` + thin
  `src/tank2-tab.js`. Reuses `grid.js` (small mesh), `cellindex.js`
  (collision oracle), `rng.js`, `vec3.js` where it fits. PORTS the
  `tanks.js` contract (input shape, event names, match flow, AI-ladder
  structure) with sphere geometry substituted. The ~100-line match-flow
  duplication is deliberate and recorded — geometry is 80% of the module;
  a plane/sphere adapter would be the whole API. Flat `tanks.js` stays
  untouched.

## Section 1 — planet and core geometry

**Planet.** `generateSphereMesh({seed, n≈400, radius 1})`, pre-relaxed
~40 iterations synchronously at match start. Cells are huge relative to
the tank (~2 cells per tank length); horizon ~20–25° away at turret
height. Walls: 4–7 seeded clusters of 2–5 adjacent cells, raised prisms;
forbidden within ~2 rings of either spawn. Spawns: open cells nearest two
antipodal poles. BFS connectivity over open cells; reseed-retry until
connected. Everything from `params.seed` via mulberry32.

**Kinematics.** Tank = position (unit vector) + heading (unit tangent).
Turn = rotate heading about the surface normal; drive = rotate position
about `pos × heading` (heading parallel-transported). Fixed turn rate,
forward speed sized to cross the planet (180°) in ~8 s, reverse at half.
Collision: cellindex oracle vs wall cells + tank-tank angular distance
(2·tankR). Blocked motion SLIDES (strip the into-wall component — TD's
pattern) and sets `blocked` for the AI.

**Shells.** State: position (unit vec), direction (unit tangent),
traveled arc. Propagate by rotation about `pos × dir` at surface height.
One in flight per tank. Range cap 0.4·2πR, accumulating across bounces.
Because shells follow the surface, over-the-horizon hits are physical —
shell flight never requires LOS. Wall impact via cellindex; ricochet
reflects direction about the wall's tangent-plane normal (from wall cell
center), 2-bounce cap. Tank hit at angular distance < (tankR+shellR)/R.

**Match flow — identical contract to tanks.js.** Same input shape
`{left,right,forward,reverse,fire}`, same events
`fire|bounce|shellDead|hit|respawn|matchEnd`, hit → knockback shove along
shell direction on the surface → dying (spin/slide) → both respawn with
invulnerability flash, first to 7 (panel-tunable), post-match state
frozen. aiLevel 0 = dormant (test rig).

**LOS (sphere-native).** Visible iff BOTH: (a) horizon test — the
eye→target chord at turret height clears the sphere surface (pure
geometry: angular separation < 2·acos(R/(R+h)) with h = turret height
= 0.03R, giving a mutual horizon ≈ 28°);
(b) occlusion test — no wall cell within a corridor along the great-circle
arc, sampled every half cell against cellindex.

## Section 2 — AI ladder on a sphere

Same levels, player-shaped input, aim error shrinking with level, all
randomness from the game's mulberry32 stream:

- **L1 Drunk** — wanders (re-picks tangent heading on timer or when
  blocked), always forward, fires blind on a timer.
- **L2 Hunter** — steers along the great-circle bearing, fires only with
  LOS. The horizon gates it: it cannot engage until it crests the curve;
  breaking contact over the horizon is a real tactic.
- **L3 Marksman** — leads: target position/velocity projected into the
  shooter's tangent plane (log map), the flat intercept quadratic solved
  there, aim mapped back to the surface. LOS-gated; keeps mid-range
  spacing; slips sideways while its own shell flies.
- **L4 Ghost gunner** — replaces bank shots (no mirror walls on a
  sphere) with the sphere-native weapon: fires WITHOUT LOS at the
  dead-reckoned target — tracks last-seen position + velocity,
  extrapolates along the great circle while the player is hidden, and
  fires when the predicted position is inside shell range. Ambush stays:
  no worthwhile shot → hold and track.

Unlocks: beat your highest unlocked level to open the next;
`tank2.unlocked` (1–4, clamped) in localStorage; `?ai=N` forces a level
for the session without persisting.

**Controls/cameras.** Keys and pads identical to the tank tab. Chase
camera default — derived from the tank group's world transform (up =
surface normal, up-plus-lookAt), curvature always in frame; POV at turret
height along the barrel; orbit = OrbitControls around the planet, game
running. Camera facing derives from render transforms (hard rule); game
state is camera-agnostic.

## Section 3 — tab, rendering, verification

**Tab.** `tank2` tab + tabbar button after `tank`. DOM: `#tank2-app`
(MUST be added to the app-container fill rule in styles.css — the
fullscreen-bug class from the flat tab), `#tank2-score`, `#tank2-msg`,
`#tank2-hint`, `#tank2-pad-left/right/up/fire` on the existing
tzone/tfire classes. HUD styling: extract the tank tab's score/msg/hint
rules into shared `.combat-score` / `.combat-msg` / `.combat-hint`
classes applied to BOTH tabs (replace the id-specific rules; keep the
red/blue span classes).

**Look.** Atari palette on a planet: olive quads with slight seeded
per-cell shade variation (curvature reads), orange wall prisms, the same
6-box red/blue tanks scaled ~0.5 cell with up = surface normal, bright
shell cubes at surface height, blocky debris falling along the local
normal, invuln blink + dying spin ported. Space-black background — a tiny
olive planet in the void. Ambient + one directional light.

**Core boundary.** `tanks2.js` exports `createPlanetTankGame(params)` →
`{step(dt, input), planet, tanks, shells, score, winner, time, events,
params}`; `planet` carries mesh + wall-cell set + spawns for the tab's
geometry build. No DOM, no three.js.

**Panel.** seed, points (~250–700, default 400), wall clusters (0–10,
default 5), points-to-win, ricochet, AI level (unlocked only), camera.

**URL hooks.** `#tank2`, `?tick=N` (synchronous sim + `TANK2 {...}`
console line), `?ai=N`, `?view=chase|pov|orbit`, `?seed=`.

**Testing** (`test/tanks2.mjs`, joins `npm test`):
- planet: open-cell connectivity, spawn separation >120°, spawn rings
  clear of walls, determinism of generation.
- kinematics: |pos|=1 and heading⊥pos preserved over 1000 steps; turn
  rate and speed exact; slide never ends inside a wall cell margin.
- shells: norm preservation along flight; range cap; over-the-horizon
  hit lands (bare planet, tanks 60° apart, no LOS at fire time);
  ricochet preserves tangent norm, bounce cap, range across bounces;
  one-in-flight.
- LOS: wide separation → false with zero walls (horizon); wall on the
  arc → false; near + clear → true.
- match flow: hit/knockback/respawn/invuln/matchEnd/frozen — ported
  assertions.
- determinism: seed + scripted input replay → identical snapshot.
- AI: L2/L3 never fire without LOS; L4 fires without LOS when the
  extrapolated target is in range; L1 wanders and blind-fires.

**Headless.** SwiftShader flags + `--enable-logging=stderr`; screenshot
chase/pov/orbit; assert the `TANK2` state line. bust.sh after every edit,
committed atomically.

## Out of scope

- Two-player, sound, plane/jet modes.
- Sharing a core with flat `tanks.js` (deliberate duplication, recorded).
- Full-orbit trick shots (future variant).
- Reusing looks.js palettes/creatures (Atari palette is the identity).
