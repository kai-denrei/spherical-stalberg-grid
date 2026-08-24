# Tank3 — planet combat in the Battle skin: design

2026-08-25. A third tank mode: Tank2's rules (planet tank duel on a mini
sphere) wearing the Battle tab's Tron look and assets. Operator ask:
"rules of Tank2 with the look and feel and assets of Battle."

## Decisions (from brainstorm)

- **Aim mechanic:** Tank2 MANUAL aim (steer the tank, shell fires along
  the barrel). The Battle tank's turret points along the barrel — it does
  NOT sweep. Rejected: Battle's sweeping-turret timing-fire (that changes
  Tank2's core rule); a cosmetic-sweep hybrid.
- **Arena:** Tank2's small open planet + scattered wall clusters (the duel
  plays identically), rendered in Battle's Tron look. Rejected: denser
  neon planet (loses curvature); Battle dungeon corridors (changes the
  duel).
- **Rules:** 1v1 duel with the L1–L4 AI ladder incl. the ghost gunner;
  one shell in flight, no ammo/orbs; great-circle shells; ricochet option;
  first-to-N — all inherited unchanged from `tanks2.js`.
- **Assets from Battle:** the `buildUnit('tank', …)` mesh tank (neon edge
  outlines), `makeBulletCloud` dot-cloud shells, `makeDebris` polygon-
  scatter death, `LOOKS.tronColors` palette (neon-cyan additive edges,
  near-black void, zonal color fields, dim neon walls).
- **Cameras:** Tank2's chase / POV / orbit, including the lead-follow
  orbit.
- **Architecture:** Approach A — new `src/tank3-tab.js` over the
  UNCHANGED `tanks2.js` core. Rejected: a skin toggle inside
  `tank2-tab.js` (bloats it, welds two identities); forking `battle-tab.js`
  (mixes rule sets in a 1292-line file).
- **Score digits:** tinted to the Tron player/enemy colors (cyan/magenta),
  not red/blue.

## Section 1 — architecture & core reuse

`tank3-tab.js` (new) initializes like `tank2-tab.js`: it calls
`createPlanetTankGame(params)` from `tanks2.js` (unchanged) for ALL game
logic — sphere kinematics, great-circle shells, hit/knockback/respawn, the
AI ladder, match flow, events. The tab is a pure renderer + input
forwarder with the same fixed-timestep accumulator (1/60, cap 0.1s) and
event handling as the other tank tabs.

- Registered as tab key `tank3` in `src/main.js`; tabbar button after
  `tank2`; `#tab-tank3` div with ids `#tank3-app`, `#tank3-score`,
  `#tank3-msg`, `#tank3-hint`, `#tank3-pad-left/right/up/fire` on the
  shared `.combat-*` and `tzone/tfire` classes.
- `#tank3-app` added to BOTH app-container CSS rules (fill + canvas
  display) from day one — the 150px-strip bug class.
- No changes to `tanks2.js`, `tanks.js`, or existing tabs. No new
  rules-tests: the core is already covered by `test/tanks2.mjs`.

Imports: `createPlanetTankGame, DYING_T` from `./tanks2.js`; `buildUnit,
makeBulletCloud, makeDebris` from `./units.js`; `LOOKS` from `./looks.js`;
`mulberry32` from `./rng.js`; `norm3, scale3, cross3, dot3` from
`./vec3.js`; three.js + OrbitControls + lil-gui from `../vendor/` (no
tokens).

## Section 2 — the Battle skin (rendering)

**World.** Same planet from `generatePlanet` (≈400 cells, scattered wall
clusters, antipodal spawns — unchanged). Rendered Battle-style:
- Background near-black void `0x010107`; the `tronColors` light rig (blue
  hemisphere, blue-white sun `0x8ab4ff`, purple fill `0x33244d`, low
  intensities).
- Floor quads (non-wall cells) as a vertex-colored `MeshLambertMaterial`,
  colored from `LOOKS.tronColors` with its seeded ZONAL color fields
  (amber/white/green/magenta gaussian blobs over a turquoise base), baked
  per cell at build time from the planet seed.
- Additive-blended neon-cyan (`0x00e5ff`, opacity ~0.9) edge wires as
  `LineSegments` (`depthWrite:false`) — the Tron glow.
- Wall clusters extruded as dim neon walls: dark near-black tops,
  zone-tinted sides (Tron `wallTops:'dim'` treatment), replacing Tank2's
  orange prisms.

This ports Battle's floor/zone/edge/wall geometry approach onto the Tank2
planet mesh. It is the meatiest piece; implement it as a focused geometry
builder in the tab (floors+zones, edge lines, wall prisms), reading the
`tronColors` look object.

**Tanks.** `buildUnit('tank', { walker, walkerHi })` per tank — Battle's
mesh tank (hull, treads, turret, barrel, mini-guns, neon edge outlines).
Player tinted `look.walker` (cyan `0x9ff8ff`), AI tinted `look.enemy`
(magenta `0xff2d6f`). Oriented via `makeBasis` so makeTank's barrel (+Z)
aligns with the heading tangent and up is the surface normal. The turret
does NOT sweep (manual aim) — do not call its sweep tick; it points along
the barrel. Scaled to Tank2's tank size (≈`TANK_SCALE` of the planet).
Camera anchors (chase/POV) repositioned for the +Z-barrel orientation.

**Shells & death.** Shells: `makeBulletCloud({ body: look.walkerHi, hi:
0xffffff })`, oriented +Y along the great-circle flight tangent, spun for
rifling, positioned at each `shell.pos` on the surface. On a `hit` event,
the struck tank bursts via `makeDebris(tankMesh, surfaceNormal)` — Battle
polygon-scatter, replacing the blocky cubes. Invuln blink and dying spin
carry over from Tank2 (render-side only).

## Section 3 — panel, HUD, controls, verification

**Panel.** `planet combat` lil-gui: seed, planet cells, wall clusters,
points-to-win, ricochet, AI level (unlocked only), camera. Look fixed to
`tronColors` (no picker). Folded on coarse pointers.

**HUD.** Shared `.combat-msg` / `.combat-hint`; score via `.combat-score`
but with the digits tinted to the Tron player/enemy colors (cyan/magenta)
instead of red/blue — a small CSS variant (e.g. `.combat-score.tron .ts-red
{ color:#9ff8ff } / .ts-blue { color:#ff2d6f }`, applied to `#tank3-score`).
Match-end banner with click/Enter rematch.

**Controls & flow.** arrows/WASD drive, Space fire, `C` camera,
double-tap-forward CRUISE (carried over), Enter/click rematch, four touch
pads. Tank3 AUTO-STARTS on tab open like tank/tank2/battle (no briefing).
Separate `tank3.unlocked` localStorage ladder. URL hooks: `#tank3`,
`?tick=N`, `?ai=N`, `?view=chase|pov|orbit`, `?seed=`.

**Verification.** No new rules-tests (core unchanged; `test/tanks2.mjs`
stays green). Headless per house rules (SwiftShader +
`--enable-logging=stderr`): a `TANK3 {…}` state line via `?tick`, and
chase/pov/orbit screenshots confirming the Tron world renders (neon-cyan
edges, zonal floors, the mesh tank + turret, dot-cloud shells) with no JS
errors. `./scripts/bust.sh --quiet` after edits, committed atomically.
DEVLOG + HOW-IT-WORKS entries.

## Out of scope

- Orbs / ammo economy (Tank2 rules = one shell in flight).
- Battle's dungeon corridors; Battle's 4-enemy wander (Tank3 is 1v1).
- The sweeping-turret timing-fire.
- Sound.
- Any change to `tanks2.js`, `tanks.js`, or existing tabs.
- A shared board core across the tank tabs (named debt; still deferred).
