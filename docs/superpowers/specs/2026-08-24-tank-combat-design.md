# Tank Combat tab — design

2026-08-24. A break from TD: a 3D homage to Atari 2600 Combat's tank mode.
Player vs AI on a flat rectangular battlefield with obstacles, three camera
views, AI that starts dumb and gets smarter.

## Decisions (from brainstorm)

- **Fidelity:** faithful core — one shell in flight per tank, limited shell
  range, hit = point + respawn + knockback, first-to-N match. Ricochet is a
  selectable mode built on the same core (deferred until core works, but the
  shell math is designed for it from the start).
- **Visuals:** Atari-blocky extruded to 3D. Olive ground, orange block
  obstacles and perimeter wall, chunky red/blue box tanks. Not the project's
  dot-cloud aesthetic.
- **Controls:** tank controls, desktop-first. Rotate left/right, forward,
  slow reverse (half speed), fire. Mobile gets simple on-screen buttons but
  is not the design driver.
- **AI ramp:** discrete levels L1–L4; beating a level in a match unlocks the
  next (localStorage). Any unlocked level pickable in the panel.
- **Arenas:** both hand-authored classics AND a seeded procedural generator,
  selectable in the panel.
- **Architecture:** Approach A — new self-contained `tank` tab
  (`src/tank-tab.js` render shell) + pure DOM-free logic module
  (`src/tanks.js`) with a Node test suite. No board-tab forking (named debt),
  no coupling into td-tab. Reuses `rng.js`, tab shell, panel/HUD conventions,
  URL hooks.

## Section 1 — rules, arena, logic module

**Arena.** Flat rectangle, ~4:3, solid perimeter wall. Layouts are small
ASCII grid maps (~26×20: `#` block, `1`/`2` spawns). 3–4 hand-authored
classics (open field, the bracket layout from the reference screenshot, a
complex one) plus a procedural generator seeded from `params.seed` that
mirrors obstacles left↔right for fairness. Each map cell becomes an
axis-aligned block; collision is circle-vs-AABB against the block list.

**Tanks.** Position + heading on the plane. Fixed turn rate, fixed forward
speed, reverse at half speed. Tanks collide with walls, blocks, and each
other (stop, no damage). On being hit: short knockback shove in the shell's
travel direction (Combat-style), then respawn.

**Shells.** One in flight per tank; fire input ignored while yours is alive.
Straight flight at fixed speed, max range ≈60% of arena width. Dies on
wall/block impact — unless ricochet mode is on: reflect off surfaces (all
axis-aligned → flip the corresponding velocity component), up to 2 bounces,
range budget accumulates across bounces. Tank hit → point, both respawn at
spawn points with brief invulnerability flash.

**Match.** First to 7 (panel-tunable). Red vs blue score top of screen,
Combat-style. Match end → banner + rematch. All randomness via mulberry32
streams from `params.seed`; no `Math.random`.

**Module boundary.** `tanks.js` exports `createTankGame(params)`:
`step(dt, playerInput)` + read-only state (tank poses, shells, score, arena
blocks, events: `hit`, `respawn`, `matchEnd`). No DOM, no three.js. AI lives
inside the module and emits the same input shape as the player
(`{left, right, forward, reverse, fire}`).

## Section 2 — rendering, cameras, controls

**Look.** Screenshot extruded to 3D. Flat olive ground plane; orange
obstacle slabs (`BoxGeometry`, `MeshLambertMaterial`, one directional +
ambient light like other tabs); low orange perimeter wall. Tanks: ~6 boxes
in one `Group` (hull, treads ×2, turret, barrel), flat saturated red/blue.
Shells: small bright cubes. Hit: brief blocky explosion (a few scaling
boxes). Score: HTML HUD numerals styled pixelated (not 3D digits).

**Cameras** — cycled with `C`, also a panel selector; game state is
camera-agnostic (controls are tank-relative in every view, so switching is
free):

1. **Top-down** (default) — orthographic, straight down, whole arena
   visible. The authentic view.
2. **Third-person** — perspective behind/above the player tank, lerped
   follow, yaw follows tank heading.
3. **POV** — at turret height, facing along the barrel.

Per the hard rule: follow/POV camera facing derives from the tank group's
`getWorldQuaternion`, never re-derived from heading math with own sign
conventions.

**Controls.** `←→`/`AD` rotate, `↑`/`W` forward, `↓`/`S` reverse, `Space`
fire, `C` camera. Mobile: four on-screen corner buttons (left, right,
forward, fire) per existing mobile chrome conventions.

**Panel.** Arena picker (classics + procedural), seed, points-to-win,
ricochet on/off, AI level (unlocked only), camera view.

**URL hooks.** `#tank` deep-link; `?tick=N` advances simulation; `?ai=N`
forces AI level; `?view=top|third|pov` (reuses existing `?view=`
convention).

## Section 3 — AI levels, testing, verification

**AI.** Small per-level state machines producing player-shaped input each
step. Aim error shrinks with level. Dedicated mulberry32 stream → seed +
input script replays identically.

- **L1 "Drunk":** random heading periodically, drives forward, turns away
  from walls on contact, fires on a random timer regardless of aim.
- **L2 "Hunter":** turns toward player's current position; fires only when
  roughly facing them WITH line-of-sight (ray-vs-AABB against block list).
  No target leading; drives straight at you, gets stuck behind cover.
- **L3 "Marksman":** leads target (predicted position from player velocity
  and shell speed), holds fire without line-of-sight, keeps mid-range
  distance, slips behind cover while its shell is in flight.
- **L4 "Bank-shot":** L3 + ricochet aiming when ricochet mode is on
  (mirror player position across wall planes for one-bounce solutions);
  ambushes near cover edges instead of roaming.

**Tests** (`test/tanks.test.js`, joins `npm test`):

- arena parsing: blocks mirrored and in-bounds; both spawns exist and are
  mutually reachable.
- collision: a tank never ends a step inside a block.
- shells: range limit; ricochet reflection is an exact mirror; bounce count
  capped; range accumulates across bounces; one-in-flight rule.
- match flow: scoring, respawn, invulnerability, match-end transitions.
- determinism: same seed + scripted inputs run twice → identical state hash.
- AI invariants: L2 never fires without LOS; L3 lead hits a
  constant-velocity target in open field; L4 finds a known one-bounce
  solution in a fixture arena.

**Headless verification.** Chrome + SwiftShader flags (never
`--disable-gpu`), drive via URL hooks, screenshot all three camera views,
console-log score/state for assertion. After any src/HTML/CSS edit:
`./scripts/bust.sh --quiet`. `npm test` stays green. DEVLOG entry per
substantive commit.

## Out of scope

- Combat's plane/jet modes, invisible-tank variants, timed (2:16) matches.
- Two-player local/remote play.
- Sound.
- Integration with units.js/looks.js/creatures (deliberately off-aesthetic).
