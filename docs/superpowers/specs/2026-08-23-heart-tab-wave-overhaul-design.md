# Heart tab — wave-introduction overhaul (2026-08-23)

Operator brief (verbatim intent): bullet-triad pickups, wall-destroying
shells, minimap spawn pulses + salient self-marker, harder heart-seeking,
HokorobiTawaa-style one-new-enemy-per-wave introductions, ramming as the
core loop, dangerous/boss enemies borrowed from HokorobiTawaa. TD tab is
LATER — out of scope here.

## 1. Ammo pickups → bullet triads
Orb pickups (`spawnOneOrb`) become a group of THREE `makeBulletCloud`
shells standing upright side-by-side on the cell (the Braille half-dotted
bullet, same as the fired projectile). Pickup grants **+3 shells**
(AMMO_MAX 9 unchanged). Gentle bob + spin via transform-only tick.

## 2. Shells destroy walls
A player projectile that hits a BLOCKED cell carves it to PATH:
tank-style debris explosion (a stand-in wall block fed to `makeDebris`),
`buildGeometry()` rebuild, `distToHeart` recomputed via BFS. One wall per
shell; the shell dies there. Ally shots do NOT carve (infinite ammo would
strip-mine the map). Note the tradeoff is real: carving shortens enemy
routes to the Heart too — "clear the path" cuts both ways.

## 3. Minimap: discovered spawns pulse
`sp.found` flips when the player comes within 5 cells or lands a shell on
it. Found+alive spawns get a map-only marker (MeshBasicMaterial sphere in
the spawn's tint, scale-pulsing ~4 Hz, lifted above wall tops). Visible
only during the minimap render pass (same trick as markerMesh).

## 4. Minimap: salient self-marker
The marker sphere becomes a forward-pointing cone (nose = smoothDir, so
it always points "up" on the heading-up minimap), ~2× bigger, scale-pulse
so the eye finds it instantly. Map-only, as before.

## 5. Enemies drawn harder toward the Heart
Heart-seeking wobble drops from 15% to 5% off-gradient choices; streams
still braid but visibly converge on the pole.

## 6. Wave introductions (HokorobiTawaa announce pattern)
One new enemy type per wave; its SPAWN POINT is created at announce time
(far from the pole, greedily spread from existing spawns). Banner
announcement (`#h-wave`, tinted border, auto-hides ~3.5 s), mirroring
HokorobiTawaa's "New Threat" card. Schedule:

| wave | type      | source                        | idiosyncrasy borrowed |
|------|-----------|-------------------------------|-----------------------|
| 1    | phage     | ours                          | erratic pace (Bacteriophage) |
| 2    | amoeba    | ours                          | — (rammable crawler) |
| 3    | jellyfish | ours                          | — (pulse drifter) |
| 4    | corona    | HokorobiTawaa Coronavirus     | armored ×2, slows itself when shot |
| 5    | barbed    | HokorobiTawaa Barbed Mine     | ×3 hp, ACCELERATES when shot |
| 6    | knot      | HokorobiTawaa Solving Torus   | BOSS ×5 hp, accelerates when hit, 3 heart dmg |

Every wave, each ALIVE spawn point emits its type (fodder counts as
before; corona/barbed at half count; knot 1 per wave). Victory = all six
introduced AND all spawn points destroyed AND field clear.

## 7. Ramming is the core loop
The tank is strong: driving over fodder (phage/amoeba/jellyfish) destroys
it, no damage taken. Dangerous types (corona/barbed/knot) can NOT be run
over: contact costs the player 1 HP (1.2 s per-enemy cooldown so overlap
isn't instant death) and the enemy survives. Same split for allies.
Enemy HP > 1 shows as a scale shrink per hit (spawn-point convention).
New mesh units in units.js: `corona` (spiked sphere, spins), `barbed`
(sea-mine, twists), `knot` (torus knot, slow menace spin) — all crowd-
safe mesh kind, auto-covered by test/units.mjs.

## Out of scope
TD tab (towers, credits, switchable heart-view minimap) — separate
planning round, per operator.
