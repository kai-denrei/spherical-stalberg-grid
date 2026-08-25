# Dev Log

Newest first. Each entry: what landed, then how it works, for programmers.
Demo links assume `npm run serve` (port 8144) or the
[Pages deploy](https://kai-denrei.github.io/spherical-stalberg-grid/).

---

## `41cf984` — Dimmer walls, and a planet that can grow

Two tank3 tweaks. The wall tops were pure black — occluders that read as
holes in the neon shell; now they wear the tron 'dim' treatment (a faint
dark-blue slab at 0.45× the base with its top wires dropped to 0.28×
opacity), so walls read as faint slabs. And the developer-ish "planet
cells" slider became a plain size picker — small (400 cells, the old
default), medium (900), large (1500) — more cells meaning more world to
duel across.

---

## `0fc5860` — Tank2's rules, Battle's clothes

Tank3 is the planet duel in neon. It reuses the whole `tanks2.js` core —
manual aim, great-circle shells, the ghost-gunner AI ladder, the
dead-zone orbit follow — and changes only what you see: a Tron world
(additive cyan wire-grid, near-black void, seeded zone-tinted floors,
black neon walls), Battle's mesh tanks with edge outlines (cyan you,
magenta the AI), Braille dot-cloud shells, and polygon-scatter deaths.
One new tab file; the core never moved.

---

## `2f8c555` — The Play button comes back on phones

TD's briefing was unstartable on mobile: the Play button was cropped off
the bottom of the modal with no way to reach it — and TD is the default
landing tab, so a phone visitor hit a dead end. The modal was built to
scroll tall briefings (max-height, overflow-y:auto, touch scrolling), but
a later `overflow: hidden` — added to clip the hologram sweep that slides
far past the box — silently reset the scroll axis, so the modal just
clipped its overflow instead. TD's briefing is taller than heart's (it
carries an extra gameplay-tips block), so its Play button fell past the
clip. Fix: the modal is now a flex column that keeps overflow:hidden for
the sweep, scrolls its body in an inner `.msg-scroll`, and pins the
glossary + Play buttons in a `.msg-foot` that's always visible. Both td
and heart briefings use it.

---

## `3d41c65` — One smooth sweep instead of a stutter

The orbit follow stopped stuttering. The old version nudged the camera a
little every frame while red sat near the edge — a staccato jitter. Now
the camera holds dead still while red drives across the face, and when red
reaches the leading edge it commits a single 0.7-second eased sweep that
overshoots: the camera swings so its facing point lands well AHEAD of red
along its heading, dropping red near the back of the frame with most of
the battlefield in front of it. Then it holds again until the next edge.
The trigger is directional — it only fires when red is driving away from
centre — so the big overshoot never re-fires from the trailing side, which
is what made it stutter before. Verified the geometry with a 40-second
drive simulation: leads fire about every five seconds and red never leaves
the visible face.

---

## `63c4730` — The planet turns to keep you in view

Reworked tank2's orbit from a hard lock into a dead-zone follow. Before,
the camera welded red to screen centre and the planet felt dragged along
under a motionless tank. Now the orbit pivots on the planet's centre, so
the globe spins freely and red drives across the visible face on its own.
Only when red nears the limb — measured as a fraction of the visible-cap
angle, which widens as you zoom out — does the camera swing around the
planet to bring it back toward the middle, then hold (with hysteresis so
it glides instead of jittering at the threshold). Free rotate and zoom
still work inside the dead zone.

---

## `7893731` — Orbit that keeps up, and a tidier top edge

Three play-feel changes on tank2. Orbit is the default camera now, and
it follows: each frame the orbit pivot and the camera both translate by
player 1's motion, so the red tank stays framed while you keep free
rotate and zoom — before, driving carried the tank off the far side of
the planet and out of view. And the mode chooser (grid/maze/organic/…)
finally collapses behind the ☰ on desktop the way it already did on
mobile; a game shouldn't wear the dev tab-row across its top. The ☰
sits right of the cache badge and drops the tabs down on click; the
settings panel stays put.

---

## `7322998` — Hands-free forward, both tanks

Double-tap the forward control on either tank tab and it latches
auto-forward — the same cruise gesture the heart and TD tabs use,
now on flat Combat and the planet. It frees a thumb for steering and
firing, which is the whole point on mobile. Reverse or a second
double-tap releases it; the up pad glows while it's on. Two guards make
it robust: leading-edge detection so held-key repeat doesn't false-
toggle, and an OR-then-restore around the step so a late keyup can't
leave forward jammed on after cruise ends. Double-tap zoom stays
suppressed by the global touch-action rule.

---

## `bb6eabf` — Debris pays its own GPU bill

Final-review sweep: each explosion cube now owns its material (the
shared one was disposed with whichever cube died first — the
below-ground early-exit made that reachable, leaving siblings on a
dead material), and the shell contract gained its two missing
assertions: the range budget spans bounces, and the third impact
kills at the two-bounce cap — proven in a two-wall pocket fixture.

---

## `c7071d2` — Gravity is local now

Hit feedback ported to the sphere: the explosion cubes fall toward the
planet's center (local down = minus the surface normal), victims spin
through their knockback slide, respawns blink. With that, planet combat
is complete — same cartridge, rounder world.

---

## `ff7de02` — Three ways to watch a planet fight

Chase rolls the horizon under you; POV puts the curve terrifyingly
close (the mutual horizon is ~28° — an enemy three seconds away is
invisible); orbit hands the whole ball to OrbitControls while the match
keeps running, a war in a snow globe. Ladder unlocks live in
tank2.unlocked — flat-arena wins don't transfer, the planet has to be
earned on the planet.

---

## `c7e1317` — A very small war on a very small world

The planet tab renders: ~400 relaxed quads as a vertex-colored olive
ball in black space, wall cells extruded into orange prisms, the same
six-box tanks riding the surface with up = surface normal (one
makeBasis from the core's pos/head pair — the tab adds no orientation
math of its own). The chase camera hangs off anchors parented inside
the tank group, so the horizon rolls underneath you as you drive.
Shared .combat-* HUD classes now dress both tank tabs.

---

## `3e1ca8c` — The gunner that shoots at where you were going

The planet AI ladder is in. L1–L3 port straight over (wander; track and
fire on sight; lead the target — the intercept solves on the sphere by
iterating flight-time against the target's angular velocity, three
rounds, converges to well under a cell). L4 could not port: bank shots
need mirror walls and a sphere has none. Its replacement is native to
the geometry — shells follow the surface, so L4 keeps a track of your
last seen position and velocity, extrapolates it along its great circle
while you hide behind the curve, and fires at the ghost. No line of
sight, no warning, just artillery from beyond the horizon. Ambush
unchanged: no shot worth taking, no movement worth making.

---

## `ab2a787` — Combat, bent around a sphere

The planet tank core is complete and Node-tested: a ~400-cell relaxed
Stålberg planet with seeded wall clusters, tanks that drive in tangent
frames (position and heading stay an exact orthonormal pair for
thousands of steps), and shells that fly great circles — which makes
over-the-horizon hits physical, no line of sight required. LOS itself is
two tests: does the turret-height chord clear the sphere, and does any
wall cell sit on the arc. Same input shape, same events, same match flow
as the flat core; the geometry is the only thing that changed.

---

## `aa20820` — The arena earns its viewport

The tank tab rendered in a 150px strip: #tank-app was absent from the
app-container CSS rule (position:absolute inset:0) that every other tab
sits in — the plan authored HUD styles but never the container itself.
One selector-list addition; headless canvas went 1280×150 → 1280×813.

---

## `db01069` — Death is eight cubes

Hit feedback landed: victims spin through their knockback slide,
explode into a fistful of gravity-obeying cubes, and both tanks
respawn blinking. The debris uses its own mulberry32 stream seeded
from sim time — visual chaos, deterministic core. With that, the
Combat homage is complete: core, cameras, ladder, feel.

---

## `bd5f3c3` — Same game, three eyes

The tank tab gained its camera set: authentic top-down ortho, a
lerped chase camera, and a turret POV. Both moving views are derived
from the tank group's world transform (`getWorldQuaternion` /
`getWorldPosition` on anchors parented inside the group) — the
same-source rule that already burned us twice elsewhere. Because the
controls are tank-relative, the game core never knows which camera is
live. The AI ladder wired in: beat your highest unlocked level and
the next one opens (localStorage), `?ai=N` forces a level for
headless runs.

---

## `c593885` — 1977 extruded

The tank tab renders: the Combat playfield pulled into 3D — olive
ground, orange slab obstacles, two six-box tanks, an orthographic
camera looking straight down. The tab is a thin consumer: it forwards
keys as an input object, steps the Node-tested core at a fixed 60Hz
accumulator, and copies poses onto meshes (`rotation.y = -heading`,
the one place the sign convention is allowed to live). `?tick=N` runs
the simulation synchronously for headless screenshots.

---

## `0bf5599` — Four brains, one input shape

The tank AI ladder is complete and Node-tested. Every level emits the
same input shape as the player's keys — the AI plays the same game.
L1 wanders and fires blind on a timer; L2 gates fire on a slab-test
line of sight; L3 solves the constant-velocity intercept quadratic to
lead a runner and slips sideways while its shell flies; L4 mirrors
the target across the perimeter walls to unfold one-bounce ricochet
solutions, and simply waits when it has no shot. Aim error shrinks
with level — the ladder is a difficulty dial made of behaviors, not
stat inflation.

---

## `7219824` — A second game grows in the test tube

The tank-combat core (Atari Combat homage) landed as a pure module:
`tanks.js` holds arenas (ASCII maps + a mirrored seeded generator),
tank kinematics with axis-slide collision, one-shell-in-flight
ballistics with exact-mirror ricochet, and the hit → knockback →
respawn → match-end loop. No DOM, no three.js — the whole game is
Node-tested (`test/tanks.mjs`), including a 10-second deterministic
replay. The render tab comes next and will be a thin consumer.

---

## `6083632` — The map teaches, the gates face forward

Two small legibility moves with the same philosophy: encode the rule
in the render. First, buildable ground announces itself — in black
wall-top mode, only the wall cells that BORDER a hallway fill with a
dim tint, which is precisely the set of cells towers may mount (the
placeError border rule, painted). The player reads 'build here' off
the terrain; the deep wall mass and the sealed frontier stay void, so
the contrast survives. One boolean per wall cell at build time, zero
per-frame cost.

Second, portals stopped standing sideways. The upright alignment
always left the gate's azimuth arbitrary, so a torii could face the
wall on both sides of its lane. Now the gate axis turns toward the
open neighbor nearest the Heart — the direction its creatures will
actually march — through the same up-plus-lookAt pattern every unit
uses. A doorway that faces its road: the kind of detail nobody
notices when it's right and everybody feels when it's wrong.

---

## `5d55b1b` — Density with intent

The portals doubled their dots (560 → ~1150), but the commit's real
content is that none of the new dots are noise. The stargate's ring
winds two tube passes so it has thickness; its chevrons became true
V-strokes meeting at inward tips; the horizon is a pool with a core
sparkle. The torii's beams are parallel strands — front and back
planes plus thickness offsets — so the timber reads as wood, not
wireframe, and it gained footing stones, a doubled crown, and the
little gakuzuka strut a real torii has. The moongate got seven
concentric masonry courses with a bright inner rim and rubble
between. Same lesson as ever from the dot-cloud work: granularity is
free at render time (a handful of gates reposing ~1.2k points is
still cheaper than one waveJelly hero) — the craft is in placing the
dots where the structure is.

---

## `75a7e72` — Three new doors, and a rule about cosmetics

Portal silhouettes became a selectable: alongside the original torus,
a STARGATE (nine all-hi chevron clusters on a ring around a dotted
event-horizon fill), a TORII GATE (pillars, upswept kasagi, the tie
beams — static, except a twist wave rolls through it once every five
seconds), and a MOONGATE (thick dotted annulus under the radial Wave
treatment). All half-dotted, all standing on the same +Y-to-normal
alignment the torus established.

The structural point is the swap rule: COSMETICS NEVER RESET THE RUN.
Changing the portal shape rebuilds every standing gate in place —
phases derived from cell indices so the gameplay rng stream is never
consumed, wounded state (shrink + dim) carried over — and the hero
dropdown now swaps the player unit through buildActors() instead of
regenerate(). Dim itself moved off the baked vertex colors onto
material.color, so position-based treatments dim exactly like
color-based ones. And a confession the log owes: the first headless
check of the new hook came back as a BLANK WORLD — the factoring had
left one reference to a removed local, and the whole init chain died
after it. One grep of the console found it; the screenshot alone
would have said 'renderer bug' for an hour.

---

## `7d4ec51` — Tempo is identity

The operator caught a flattening: "make tower shots faster" had been
implemented as one global projectile speed, which made everything
equally fast — and therefore nothing fast. In HK, the tempo IS each
tower's identity: singles and lasers snap, the slow field is a
deliberate electric shock, the mortar is a slow heavy verdict. That
contrast was the feel, and a single constant erased it.

Speeds are now per-tower data in towers.js, HK's exact projSpeed
values converted to cells/s: single 20, rapid 26, spread 15, homing
13 (guided things should glide), sniper 42 — a streak that crosses
its whole range in a sixth of a second — and the mortar dropped to
3.5 with its arc raised, a full second of flight before the splash
lands like a decision. Slow-field and laser stay hitscan. The test
suite gained an ordering invariant (sniper faster than single,
mortar slower than homing) so no future "speed pass" can flatten the
identity again without a red test saying so.

---

## `ad11600` — One key, in context

Small QoL from HK's keyboard map: W or ↑ upgrades the selected tower.
The interesting part is what "selected" means and what it protects —
the shortcut only fires with a selection context live (the tower's
radial open in build mode, or a tower being watched in the bastion
view), and it consumes the key there, so the same W keeps driving the
tank everywhere else. Refusals flash their reason in the radial's
note. Context-scoped rebinding: one key, two meanings, zero conflict.

---

## `276af67` — Opening the door behind you

The operator's note named the flaw precisely: sector reveals kept
opening DEEPER — past the frontier you'd just fought across — because
concentric distance rings can only ever grow outward. The ask: south
if the last reveal was north, east if it was west. Two schemes died
before the third worked, and the corpses are instructive. Raw azimuth
wedges fail on a lane world: a winding width-1 corridor crosses wedge
borders constantly, so everything past the first crossing re-seals as
unreachable — sectors 1 through 3 rendered identically. Gates at four
compass points feeding a multi-source BFS fail differently: when only
a couple of lanes exit the starting disk, the gates collapse onto the
same exits and two sectors own zero cells. The per-sector open-cell
log caught both — numbers, not squinting at screenshots.

The scheme that works is iterative directional growth: each sector
claims an equal share of the remaining land, grown breadth-first from
a seed chosen on the already-open frontier in that sector's compass
direction — one way, then BEHIND, then the perpendicular pair.
Connectivity is by construction (seeds touch open land), balance is
by construction (equal shares), and direction is honored at the seed
even when lane topology makes the growth snake. 146 → 455 → 764 →
1073 → 1380 open cells, four equal reveals, each somewhere new. The
meta-lesson: on graph worlds, geometric partitions (rings, wedges,
Voronoi gates) keep losing to grown partitions — grow the thing you
need connected, and connectivity stops being a constraint to check.

---

## `e3f6499` — The bastion view, and a slow you can see

The camera family grew its defensive seat: BASTION, third in the V
cycle, parks the eye behind the Heart facing the nearest live
portal's lane — the classic tower-defense vantage. The trick that
makes it a system rather than a preset: clicking any tower in view
re-anchors the camera behind THAT tower, facing outward along the
lane it guards (the heart→tower direction, tangent-projected — the
geometry answers "which way does this gun look" for free). Empty
ground hands the watch back to the Heart. It's HK's bastion/action
presets collapsed into one view plus one click.

The slow tower had been mechanically honest and visually mute: a
0.14-second lightning flicker for a 1.6-second debuff. Now the debuff
wears its duration — slowed enemies tint ice-blue for the whole
window via material.color, which multiplies over vertex colors, so
one hex write per enemy per frame recolors a whole dot cloud — and
the tethers linger 0.32 s. Tempo turned up to match the operator's
brief: enemies ×0.7 size at 1.0 cells/s, tower shots at 6.5 cells/s.
Verification had a nice moment: the HUD read 'cannon HOT' with a
×2.00 streak in a run with zero player input — the auto-gunner
confirming itself.

---

## `75420f1` — The reveal becomes a moment, the tank takes orders

Two systems that make the game legible at its two timescales. The
sector reveal stopped being a flash you might miss: clearing a round
now pulls the camera to a full-planet frame aimed at the centroid of
the newly-unsealed band — computed by diffing sealed→open across
applySector — and burns that band's floors hot orange for the length
of the beat, cooling to their true colors as build mode begins. You
see the whole world, and you see exactly what you just earned. The
war is frozen for the 3.2 seconds; strategy resumes where spectacle
ends.

And the auto-wanderer graduated from personality to SOLDIER: the
directive system (dropdown, cycling chip, `AUTO · NAME` in the HUD)
feeds one strong term into the existing exit-scoring — a chase/flee
vector for AVOID and RAM, a descending BFS field for HOME and SEEK
PORTAL (the portal field recomputes whenever one rises or falls).
The same pass gave auto mode a trigger finger: an auto-gunner that
shells the nearest threat in range, rate-limited by the cannon heat
that already existed, aim-overridden through the same tangent
flattening as the turret path. SAVE AMMO and RAM keep shells for the
unrammable tier. The design through-line: high-level orders, not
micro-management — the tank stays willful about the steps and
obedient about the goal.

---

## `7bae749` — The cushion that pinned the tank

The operator felt it before the code showed it: the tank wedging in
width-1 corridors, and if the shells were spent, wedging permanently.
The suspicion — "we increased the hitbox to remove clipping, and an
unintended consequence is getting stuck" — was exactly right. The
wall cushion was born on the open heart battlefield, where walls come
one clump at a time; in a corridor, opposing walls BOTH sit inside
the 0.95-cell band, the sequential pushes zigzag, and a push that
out-muscles the drive step is a pin, not a cushion.

The fix is three principles rather than one number. Margins now adapt
to passage width — a cell with ≤3 open neighbours is a hall, and
halls trade a little visual overlap for guaranteed passability (and
skip diagonal wall collection, which is what jams corners). Pushes
are net-summed then applied once, so opposing walls cancel into
centering instead of fighting. And the applied correction is capped
per frame well below drive speed: a cushion corrects over a few
frames; the moment it can outrun the player, it's a wall. Backstop
for the pathological pocket: if a step and its slide are both
blocked, the tank creeps toward its current cell's center — open
ground by definition. Un-stickable, shells or none. The general
lesson joins the log: any corrective force in a movement system
needs a cap relative to player speed, or geometry will find the spot
where correction becomes capture.

---

## `7961a33` — Seven small honesties

A tweak pass where each item is a tiny usability truth. The mode chip
now names where it takes you — BUILD from the tank, TANK from the
build view — because a button that names where you already are is a
lie of labeling. The app lands on TD, the game it has become. Corridors
narrowed to width 1 so ROOMS read as arenas again. Enemies run at 0.85
cells/s — fast enough that a lane without tower cover feels naked. The
opening purse is exactly one Rapid plus one Slow (170c): the first
build is a decision with no slack, which is a tutorial nobody has to
write. CREDIT became the loud line of the HUD — orange, bold, glowing
— because it is the number the whole TD loop turns on. And the how-to
text left the live HUD entirely: a GAMEPLAY section now lives in the
briefing and pause modals, and the HUD speaks only state words
(AUTO / CRUISE / BUILD · war on). Screens that teach while you fight
teach nothing; screens that teach while you're paused teach.

---

## `9c86d8c` — High ground, wide lanes, and a purge of tanks

The operator's playtest note cut deep: multiple friendly tanks CONFUSE
new players — they read as enemies. TD's answer is subtraction: no
allies at all, just you and your towers. The briefing now shows a
tower sprite where the ally card was, and the SWAP button simply
doesn't exist in TD's markup (the id-stable wiring made removal a
one-line guard).

The board itself went back to HokorobiTawaa's grammar. The open-field
clump carve is deleted — the DUNGEON carve is the map again, tuned
wide: sixteen rooms joined by four-cell corridors are the monster
lanes, and the wall mass between them is HIGH GROUND, the only place
towers may build (mounted on the wall roof, raycast against wallMesh).
The elegant dividend: the connectivity guard became unnecessary by
construction — walls never carry pathing, so no tower placement can
ever dam a lane. A rule that needed a simulated BFS under the old
scheme is now free. And the world is big and pre-decided: 3000 sample
points, ~10k cells, with sector 1 opening just 416 of them — the whole
map exists from frame one, unsealing 25→45→65→85→100% by
heart-distance as rounds clear. Sealed land renders as void, which
makes each white-flash reveal literally materialize new world.

The roster completed its migration into the house language: every
enemy is now a half-dotted static cloud — the original three creatures
posed once from their rich generators, the borrowed nine from new
enemyDotPts silhouettes (dome-ghost, saucer, blob, ringed saturn,
spiked spheres, trefoil knot) — sized ×0.85, transform-idled per
family, bursting into tinted dots on death. A hundred of them cost
what one waveJelly hero costs, which matters because fodder counts
went ×1.4 on top of the wave-and-sector ramp. Hectic, as ordered.

---

## `78838ea` — Towers in the house style, effects in HK's

The mesh-head towers never quite belonged — everything else alive in
this game is half-dotted. Now the towers are too: `towerHeadPts()` in
creatures.js generates one dotted silhouette per HokorobiTawaa tower
shape (cone, spiral, sphere, double helix, pyramid, gear, teardrop,
bipyramid), and `makeTowerUnit` mounts it on an elevated mesh pedestal
— slab, tapered column, tinted collar, neon edges. The operator's
particle-count worry dissolves by construction: the clouds are static
and the idle is transform-only spin+bob, so ~190 dots per tower cost
nothing per frame. The rule the roster taught months ago holds: dot
COUNT is free; per-dot CPU work is the thing that scales badly.

The attack effects now carry HK's identity system. Every projectile is
a tracer — a bright additive head dragging its tower's signature trail
(sniper 11 ghosts, homing 6, rapid 3, single none), implemented as one
tiny Points buffer per shot whose ghosts shift back a slot per frame.
The mortar lofts on a sine arc over its measured throw and detonates
at the end whether it hit or not. The slow field stopped drawing tidy
lines and started throwing LIGHTNING — jagged additive polylines to
every tethered victim plus impact sparks, with jitter computed from
segment index + time so the fx layer never consumes the gameplay rng
stream. Determinism discipline extends all the way into the sparks.

---

## `c5a815d` — The world learns to open

TD's biggest structural borrow yet: HokorobiTawaa's fraying, spherized.
A run now lives on ONE persistent 700-point world, but round 1 only
opens the inner 32% of it (by heart-distance) — the rest of the planet
reads as sealed wall mass, a frontier you can see. Clearing every
portal doesn't regenerate anymore: the screen FLASHES WHITE (HK's
reveal beat, a CSS pulse) and the next band unseals *in place* —
56%, 80%, then the whole sphere. The implementation is two arrays and
a fraction: the full carve is remembered at generation
(tdFullTags/tdFullDist), and applySector() re-derives the open set
from `dist > frac·maxD`; the existing wall renderer does the rest,
because sealed cells simply ARE walls to it.

What persists is the point: towers stand, credit carries, the wave
counter never resets (so the intro schedule flows across sectors), and
new portals rise in the fresh band — the liquidation-carry mechanism
from the new-board era is deleted outright. And the balance flipped to
match the operator's brief — low-hp enemies in flooding counts
(per-portal = waveSize + wave + 2·sector), 16-second wave cadence,
allies cut to two. Without towers you drown by wave three; with a few,
it's a mowing exercise. Sector 3 at wave 6 fields 259 hostiles — the
stress hook made the point better than any tuning argument.

## `f9238df` — The radial comes home

Two build-mode refinements from the operator. First, mode purity: in
build mode the driving controls — steer zones, rocker, both triggers,
SWAP/CAM — disappear entirely (a `.build` class on the tab root),
leaving the board and the BUILD/MAP pair. Planning and fighting are
different instruments; they now look it. Second, the tower shop
became HokorobiTawaa's radial menu instead of a list: circular options
ring the tapped cell at HK's exact sizing formula, key + cost on each
button with the tower's tint on the border, your credit (or the
refusal reason) in a non-interactive center chip, upgrade/sell as a
three-option ring on standing towers. The event delegation classes
survived the re-skin, so none of the buy/upgrade/sell logic moved.

The headless check earned its keep again: the first screenshot showed
the ring pinned to the top-left corner, clipped. Cause: anchoring
measured the *canvas* rect, and when a URL hook opens the shop before
the first `resize()`, the canvas is still at its default 300×150 —
the clamp then pinned everything to the corner. Real taps would never
have hit it, which is exactly why it would have shipped: measure the
container, which is laid out from init, not the canvas, which isn't.

## `5dab5a0` — Chrome learns when it isn't wanted

The iPhone screenshot showed the failure plainly: mid-battle, the
build-token badge and a horizontal tab row sat on top of the HUD, and
the row itself ran past the screen edge — the TD tab literally
unreachable on the device the game now targets. Two structural fixes.
The tab bar stops pretending a phone is a desktop: under the ☰ it's
now a vertical mode menu — column layout, full-width labels, nothing
clipped — and picking a mode closes it, because selection is the
dismissal. And visibility became a STATE, not a toggle the player must
manage: a `body.playing` class, driven per-frame by whichever game tab
is live (`active && !paused && !won`), hides everything non-essential
including the ☰ itself. The chrome returns exactly when the player is
idle — briefing, ESC pause, win/lose — which are precisely the moments
mode-switching makes sense. Leaving a game tab clears the class, so
the doc tabs never inherit a chrome-less screen. The design rule
underneath: don't ask players to close UI; know when they're playing.

## `cdf195d` — TD M2: the maze you buy

Towers are in, and the design's core bet with them: a placed tower is
SOLID and blocks **pathing** — on an open battlefield the towers ARE
the walls, so building is maze-shaping, HK's buildable-band translated
to the sphere. The guard that makes it fair: every placement is
simulated first (add the cell, BFS from the Heart, check every live
portal still reaches) and refused with a reason if it would dam the
flow entirely. blastWall proved per-event BFS affordable months of
commits ago; placement reuses the pattern.

Interaction is tap-first on the build camera: a press that travels
>8 px is an orbit, otherwise it raycasts the floor into the cellindex
oracle and opens the shop — eight towers, affordability locks, hover
previews a dotted Braille range ring; tapping a standing tower offers
HK's exact upgrade/sell economics. Firing runs through towers.js: pure
targeting with the chord metric injected, per-kind delivery (fans,
homing re-steer, mortar splash, slow-field tethers with a new
slowUntil debuff, hitscan beams as additive light). And the economy
breathes end-to-end: every kill from any weapon pays bounty × streak,
rams pay the premium, a Heart breach kills the streak, and round-clear
liquidates towers at 100% into the next round's purse. The headless
proof was pleasingly indirect: force-place three towers, simulate ten
seconds, and read the HUD — ×1.80 streak multiplier means sixteen
enemies died to autonomous fire and paid for themselves.

## `a795ef0` — TD M1: two cameras, one identity

The TD tab exists. It is knowingly the sixth cp+sed sibling — the spec
bounded that cost in advance by moving the shared facts into
enemyspec.js first, and the copy pre-empted the two recorded sibling
traps: every `#h-` CSS selector group got its `#td-` twin via an
anchored script (the organic-tab canvas-collapse bug, not repeated),
and all element ids are td-prefixed (no duplicate-id roulette).

On top of the full heart game, the mode pair the operator called the
differentiation: **B** toggles between ACTION (the heart rig,
untouched) and BUILD — a top-down planning camera over the Heart pole,
drag to orbit, wheel to zoom. The switch costs one boolean because the
camera system was already goal-based: updateCameraGoal computes a
different goal, and the existing lerp eases the transition with no
cut. **M** swaps the minimap for the fixed heart-top-down threat view.
The tempo rule from the spec is live too: build FREEZES the war only
when the field is clear — wave clock and combat stop, ambient life
keeps breathing — while mid-assault the toggle is camera-only, so
build mode can't be used as a combat pause. The HUD names the state
you're in. Towers arrive in M2 onto exactly this camera.

## `a1839ca` — TD M0: the data moves out before the sixth sibling is born

First TD commit, and it deliberately contains no TD gameplay. The
lesson from five cp+sed board tabs is that shared FACTS drift first,
so before td-tab.js exists, the facts moved into pure modules:
`enemyspec.js` (the 12-type roster — tints, specs, intro schedule, now
with HK bounty values), `towers.js` (HK's eight towers re-based to
cells and fractional hp, the exact 70%/120% upgrade economics, and
targeting as a pure function with an *injected* distance metric — the
module picks targets without knowing the world is a sphere), and
`economy.js` (HK's credit loop verbatim: streak++ then bounty ×
multiplier capped ×5, leak resets, 75% refunds — plus the design's ram
premium and wave-tempo bonuses). All Node-tested (26 checks in
test/tdcore.mjs, in the suite), because DOM-free math is the part of a
game you can actually regression-proof.

heart-tab now imports its roster instead of owning it — verified
zero-change headlessly (same waves, same round gating, same HUD).
When TD lands, a balance edit touches one file, not two siblings.

## `2ce7793` — touch-action does not inherit

The double-tap zoom "fix" from two commits back never worked where it
mattered, and the reason is worth engraving: **`touch-action` is not
an inherited property.** Setting it on `html, body` styles exactly two
elements; the WebGL canvases — where every gameplay double-tap
actually lands — never got it, so iOS kept zooming. The working fix is
the universal selector: `* { touch-action: manipulation }`. The one
place that must NOT be manipulation — OrbitControls' canvas on the
grid tab — is safe automatically, because three.js sets inline
`touch-action: none` there, and inline beats stylesheet.

Layered on top: `maximum-scale=1, user-scalable=no` in the viewport
meta (honored in standalone/PWA mode and on Android; Safari
browser-mode ignores it for accessibility — which is exactly why the
CSS does the real work), the full Safari gesture pipeline prevented
(`gesturestart/change/end`), and long-press callout + text selection
off across the play surface, re-enabled on `.mdview` so the in-app
docs stay copyable. The general lesson: when a CSS "fix" for a
browser behavior doesn't take, check inheritance before doubling the
workarounds — half the touch/scroll properties (`touch-action`,
`overscroll-behavior`) are per-element.

## `ccc9d20` — Controls learn to whisper

Second controls pass from the operator, and a philosophy shift: the
maneuvering controls stopped explaining themselves. Steering is now a
pair of tall, flat, unlabeled zones hugging the lower screen edges;
forward/back are two more flat zones stacked dead-center between them.
Their affordance is material, not textual — a translucent panel, a
faint chevron, and a press-glow (`holdButton` now toggles a `.pressed`
class, which matters because `preventDefault` on pointerdown makes
`:active` unreliable). The player discovers how to drive; nothing
tells them. Fire stays explicit and asymmetric by design: the shell is
a big round button on the left, the laser a smaller one on the right —
importance encoded in size. And every emoji left the game surface
(eye, lightning, skull, play, pause…): utilities became SWAP/CAM text
chips, modal buttons use plain glyphs. Emojis render as full-color
sprites on iOS and fought the mono-tron aesthetic everywhere they
appeared. All element ids survived again, so the JS wiring layer paid
for itself a second time — two full control-layout rewrites, zero
game-logic edits.

## `e846569` — The phone becomes a controller

iPhone playtest drove this one. The briefing was clipped under the
status bar and couldn't scroll — the modal's `top: 34%` centering plus
tall card content overflowed both ends of the viewport. Fix: true
centering with `max-height: min(86vh, calc(100dvh - 28px))` and
`overflow-y: auto`. The unit that matters is **dvh**: iOS's `vh`
includes the collapsed toolbar area, so a `vh`-capped modal still
clips; `dvh` tracks the real visible viewport.

Controls rebuilt around how a phone is actually held — two thumbs at
the corners. Left thumb: a big steer-left button at the corner with
the drive rocker above it (hold ▲ forward, double-tap ▲ cruise,
▼ reverse and cruise-kill). Right thumb: steer-right plus the two
tinted triggers, ⚡ laser above ✦ shell. Utilities (⇄ 👁) shrink to a
centered pair. The reflow is pure HTML/CSS — every button keeps its
id, so the game code didn't change a line: the wiring layer earning
its keep. The HUD collapsed with it: the nine-dot shells row is gone
(the turret rack was already the ammo counter — the HUD copy was
redundant the day the rack shipped; a small ✦n survives for PoV where
the turret is hidden), alerts print only when true, and teaching text
left the HUD for the briefing, which owns it.

TD spec gained the operator's rulings: aura imported, one health
pool, ally tanks mortal AND purchasable (the shop will sell UNITS
next to TOWERS), and the identity pair — top-down build view,
third-person fray — as the differentiation to build first.

## `a9891fc` — The full dozen: HokorobiTawaa's roster comes across

Six more enemy types, completing the import of HokorobiTawaa's twelve
in their difficulty order and palette (hue = class, brightness =
threat): Wave Ghost and Scout UFO extend the yellow agile tier, Green
Slime brings the **regenerator** mechanic (healOOC port — hp knits
back after 1.2 s unhit, tracked by `e.lastHitT`; the counter is
ramming, which ignores hp entirely), Wave Saturn is the first
unrammable — yellow body, blue ring baked into the mesh per the
source's dual-coding — and Rolling/Prime Mine form the epic tier,
reusing the seamine mesh exactly as HK does: the tint carries the
tier, not the silhouette. Prime at 6 hp + regen is the pre-boss wall.

The schedule grew to 12 intros and rounds now unlock two types each —
round 1 fields four rammable types, the full roster stands by round 5,
with the boss at wave 12. A 'heavy' spawn tier keeps epics sparse
(base/3). Stress-tested at ?wave=12: 215 hostiles simulated, and the
round gate held — round 1 correctly refused to introduce past its
four. Operator dials: shell recoil to 8 (the max — the dial shipped
three commits ago and immediately got pinned), waveSize to 5.

## `d941e9d` — The game is the front door, and icons that are the thing

The heart tab is now the landing page — a bare URL opens the game;
hash deep-links still reach every other tab. With that, the mobile
posture tightened: the ☰-hidden chrome already made the whole screen
play surface, and now iOS's double-tap zoom is dead site-wide
(`touch-action: manipulation` at the root — non-negotiable once the
CRUISE gesture became a double tap), pinch is blocked via Safari's
`gesturestart`, and overscroll/tap-highlight are off.

The briefing's emoji icons are gone, replaced by the objects
themselves: `spriteShot()` builds the real half-dotted thing — heart
cloud, neon tank, bullet triad, each of the six enemies, the portal
torus, the reward orbs — renders one frame through the announce-card
sprite rig, and snapshots it to a data URL (`preserveDrawingBuffer`
turned on for `toDataURL`). Cached per key: every icon costs one
render per session, and the cards carry images, not live contexts.
The pattern to keep: when a UI needs to show a game object, render
the game object — hand-drawn stand-ins drift, snapshots can't.

Housekeeping with teeth: the ammo *sphere* died (redundant with the
bullet triad — two shapes meaning the same thing taught nothing), the
health sphere went green (color = meaning), and portals got denser
(560 dots) with a two-frequency shimmer — slow per-dot wave times fast
glitter — so a gate reads as continuously alive.

## `495a540` — Portals, glossaries, and walls that thud

The spawn points became what they always were narratively: **portals**.
A new `torusPts` generator in creatures.js (braille-lab's half-dotted
static torus — golden-angle tube winding, every 12th dot hi) feeds
`makePortalCloud`: an upright dotted gate, ring in local X-Y so
aligning +Y to the surface normal stands it up, twinkling in its
enemy's tint. Damage now reads in *light*: `setDim` scales the twinkle
brightness, so each shell visibly dims the gate before the third one
kills it — dying portals fade. Numerically checked in Node (unit
radius, real hole, sparkle layer) rather than screenshot-hunted.

The briefing grew into a real reference: every element is its own card
(tinted icon, name, one line) and two clickable glossaries branch off —
hostiles (generated from `INTROS` + `ENEMY_SPEC`, so copy can't drift
from data: role, hp, arrival wave, ram verdict) and friendlies &
pickups, which finally documents the four reward spheres (ammo +3,
power +8% permanent, health +1, regen carry-home +4). One delegation
handler drives all modal navigation; the sim stays frozen throughout.

Small but felt: mostly-head-on wall hits now fire the same suspension
bump as running over fodder — gated on the into-wall velocity fraction
and the bump timer, so grinding along a wall at a shallow angle doesn't
re-trigger the thud sixty times a second.

## `fc894a3` — The Euler stomp, solid allies, and recoil that fires

Best bug of the day: the bullet triads "rotating into the ground" were
an **Euler stomp**. The pickup group is aligned to its cell's surface
normal via `quaternion.setFromUnitVectors` — and then the idle tick
wrote `rotation.y = t`. In three.js, `rotation` and `quaternion` are
two views of ONE rotation; assigning either replaces the whole
orientation. So every triad actually spun about *world* Y, which looks
right at the pole and tilts shells into the ground everywhere else.
Fix: compose — hold the base alignment quaternion and multiply a
local-Y spin onto it per frame. Sibling of the lookAt-convention trap
already in this log: three.js orientation has more than one API, and
mixing them silently discards work.

Wall overlap at angled approach was margin arithmetic again: irregular
quads put some wall *faces* ~0.7·cellSide from their centers, so the
0.95 margin (up from 0.8, two convergence passes for corners) is what
actually clears the hull. Ally tanks became solid — hard block in
`freeBlocked` plus a softer cushion push, so an ally driving into YOU
separates instead of interpenetrating. And recoil was rebuilt on
operator feedback: whole-body translation read as sliding, not firing.
Now the **turret** takes the kick — slams back with a 70 Hz shudder —
while the hull rocks nose-up and barely shifts. The pitch applies
*after* the lookAt quaternion (rotateX on top of the derived frame),
so it composes with the same-source facing rather than fighting it.
`?recoil=1` freezes a mid-kick pose for screenshots.

## `db390f4` — Recoil as a dial, forward as a choice

Two control-feel changes. Shell recoil became a parameter instead of a
constant: `params.recoil` (GUI slider 0–8, default 3) scales the hull
jolt and camera kick together, and the recoil window widened to
0.35 s. The lesson folded in: when the operator says "more, but
tweakable", ship the dial, not another guess — the default is the
opinion, the slider is the escape hatch.

Manual driving lost its auto-roll. The always-rolls-forward manual was
a mobile-ergonomics bet that proved too aggressive in play — the tank
committed you to motion the moment you touched a steering key. Forward
is now player-triggered: hold W to drive, and a quick **double-tap**
of the forward control (W or ▲) toggles CRUISE — self-rolling until
S/▼ kills it, with W boosting on top. One wrinkle worth recording:
cruise pins the manual-mode clock, otherwise the idle auto-wander
would reclaim the tank three seconds into a hands-off cruise and the
two "auto forward" systems would fight over the throttle. The idle
wanderer itself is unchanged — it remains the tab's ambient mode, with
its own HUD line and `auto resume` slider.

## `197b4a2` — The game gets a shape: briefing, rounds, one win condition

Structure day. The heart tab had mechanics but no arc — now it has
both ends. At the front, a **briefing modal**: every element labeled in
its own color (heart, tank and its controls, allies, triads, fodder vs
spiked reds, spawn points) with the single win condition in bold. The
sim stays frozen until ▶ begin; debug hooks skip the briefing because
headless verification needs a live sim, not a modal. At the back,
**rounds**: round r plays a 100+50r-point board and fields only 2+r
threat types — round 1 is 150 points and pure rammable fodder, fast
and winnable in minutes; corona, barbed, and the knot boss join in
rounds 2, 3, 4 as the sectors grow. Clearing every spawn point offers
the next round on a fresh seed; losing retries the current one. And
the win condition became ONE sentence: destroy every spawn point. The
maze-legacy "found the heart" victory — which ended the battle by
accidentally wandering home — is deleted; the pole is home turf.

The cannon also gained consequence: firing kicks the hull back along
the heading (camera follows) and heats a collar around the barrel's
middle red-hot — 3 s to cool, no second shell until cold. Same
diegetic-gauge pattern as the shell rack and the laser tubes: the
state of your weapons is readable off the tank itself, the HUD only
echoes it. Ram bump strengthened to match (deeper dip, 65% pace loss).

## `248c442` — Pause, a smaller first stage, and the clipping arithmetic

The tank-in-the-wall bug fell to arithmetic, not screenshots. The hull
reaches ~0.5·cellSide from the position. Manual collision blocks at
0.62·cellSide from a wall's *center* — but the wall's face sits at
~0.5, so the guaranteed face clearance was ~0.12·cellSide. The auto
glide never had a margin at all, and corner-diagonal wall cells are
invisible to `graph.adj` (full-edge adjacency only). Conclusion: up to
~0.4·cellSide of visual penetration wasn't a glitch, it was guaranteed
by the numbers. The fix is a soft **wall cushion**: each frame the
player position gets a tangent-plane push out of a 0.8·cellSide band
around blocked centers — diagonals collected by walking the open
neighbours' own adjacency — applied in both modes, *after* travelDir
is derived so the push moves the body but never the aim. Positions are
recomputed from the chord every frame in auto mode, so the cushion
can't accumulate drift; in manual it converges instead of jittering.

Also: ESC pauses (sim fully frozen, both views keep presenting, and
`lastFrame` keeps updating so resume has no dt spike — clamping alone
would still lurch), and the first stage shrank 4000→800 sample points:
~2800 open cells, 61 hops pole-to-spawn, a board you can actually
learn, hunt, and win.

## `275731f` — Lasers earn a trigger, and the early game gets heavier

The mini-lasers looked free because they were free — always on, no
cost, no decision. Now they're a held trigger (Shift, or ⚡ on the pad)
with an overheat: 2.4 s of continuous fire locks the guns until fully
cold (~1.7 s), and there's no feathering the cap — heat is a commitment,
not a rhythm to cheese. The gauge is diegetic in the same spirit as the
turret shell rack: the gun tubes themselves lerp cyan→red with heat
(`lerpColors` on the shared tube material; both guns follow for free).
Bolts got the look pass too — the core shrank to a sliver and gained a
wider additive-blended halo child, which over a dark board reads as
glow without vendoring a bloom chain. The trigger key deliberately does
NOT claim manual control: Shift is a fire button like Space, not a
steering input, so lasering while auto-wandering stays possible.

Balance pass from playtest: heavier early waves (waveSize 2→3), longer
breath between them (18→26 s), and a richer ammo field to pay for it
(triads 10→14, respawn 8→6 s). `?laser=1` holds the trigger for
headless screenshots.

## `dabbb84` — The tank gets an identity: neon lines, a visible magazine, lasers

Three reads on one unit. **Look**: thin white/blue neon edge lines on
the slabs — `EdgesGeometry` line segments added as *children of the
meshes they outline*, so they inherit every part transform for free
(turret lines sweep with the turret; no per-frame sync code). This
exposed a latent test bug: the roster's world-radius check only applied
`matrixWorld` to meshes and points, so line children read untransformed
local coords and "escaped" the unit sphere — the check now transforms
`isLine` too. **Diegetic ammo**: the 3×3 dot rack on the turret roof IS
the shell counter — `updateHud` tints index `< ammo` neon white, the
rest faded grey. Allies never dim (infinite ammo — the rack telling the
truth is the whole point of diegetic UI). **Secondary weapon**: twin
toed-in mini-guns fire weak infinite laser bursts, alternating at ~7/s.
Bolt origin and direction come from the gun groups' world transforms
(the toe-in convergence falls out for free — same-source rule, third
use). The lasers are deliberately toothless where it matters: 0.4
damage, no wall carving, no spawn-point damage, and no on-hit
reactions, because a constant graze would otherwise keep barbed/knot
permanently accelerated. Shells remain the decision; lasers chew fodder
while you drive. Bolts share one geometry+material — at 7 spawns/s,
per-bolt allocation and dispose would thrash for nothing.

## `843e79e` — Announce sprites, the weight of a kill, and a focus bug

The announce card grew its missing centerpiece: a live spinning model of
the introduced enemy, rendered by one persistent 96px alpha-backed
renderer (WebGL contexts are scarce and leak on loss — build one up
front, never per-announcement; the canvas just gets re-inserted after
each `innerHTML` wipe). The card also states the load-bearing fact
outright — green `▼ RAMMABLE — run it over` vs red `✖ DO NOT RAM —
shells only`, generated from `ENEMY_SPEC` so copy can't drift from
mechanics. Running over fodder now *feels* like it: a tinted dot-splat
flattened against the surface (`makeDotBurst`, the Points counterpart
of `makeDebris`, which bakes triangles clouds don't have) and a 0.35 s
suspension bump — pace −50%, camera eye sinks quadratically. The bump
is countdown-seconds rather than a timestamp because the tab runs two
clocks (render `t`, sim `simTime`) and a countdown is valid under both.

The bug of the day: "the settings panel opens by itself, maybe when I
kill something." Actual cause, nothing to do with kills — lil-gui's
title bar is a `<button>`, buttons keep focus after a click, and
browsers re-activate the focused button on Space. Space is the fire
key. Every fix candidate that started from "what does killing an enemy
do?" was chasing a coincidence. Game keys now blur any focused button
before handling (inputs excepted — seed-typing keeps focus). When a UI
element acts "by itself" on a timing that correlates with gameplay,
check what has keyboard focus before auditing the game logic.

## `3870d3d` — The heart learns HokorobiTawaa's escalation grammar

The heart tab's gameplay reshaped around three ideas. **Introductions**:
enemies arrive one type per wave, each announce (`#h-wave` banner, tinted
per enemy) creating that type's spawn point far from the pole — the loop
is identify → hunt the source → destroy it. Schedule: phage, amoeba,
jellyfish (fodder), then the borrowed HokorobiTawaa tier — corona
(armored ×2, slows itself when shot), barbed (×3, *accelerates* when
shot), knot boss (×5, accelerates, 3 heart damage). The on-hit reaction
is one `behMult`/`behUntil` pair per enemy; erratic pace is a sine over
`phase`, so everything stays deterministic. Victory now demands all
types introduced first — early spawn kills just buy quiet. **Ramming**:
`ENEMY_SPEC.rammable` splits the roster; fodder dies on player/ally
contact for free, the dangerous tier survives and bites back on a 1.2 s
per-enemy cooldown (without the cooldown, overlap was a blender).
**Breaching**: a player shell that hits a BLOCKED cell carves it —
stand-in wall block fed to `makeDebris` for the tank-style burst, then
`bfsDist` re-lay and a full `buildGeometry()`; ~single-digit ms at
default density, fine per shot. Deliberate asymmetry: ally shots don't
carve (infinite ammo would strip-mine the map), and the re-laid distance
field means enemies exploit your shortcuts too.

Support: ammo pickups are now triads of `makeBulletCloud` (+3 shells) —
the pickup depicts its payload; minimap self-marker became a pulsing
arrowhead and found spawn points pulse in their tint, both sized against
the *sphere* (cell-relative sizes vanish on dense boards — the map
always frames the whole ball). New headless hooks: `?wave=N` force-runs
wave beats, `?found=1` reveals beacons, `?blast=N` exercises the carve
path. New mesh units keep the transform-tick crowd path; roster
invariants auto-cover them.

## `6db7bae` — Mobile chrome, wall margins, and a heart with moods

Three fixes with one lesson each. **Mobile**: game chrome hides behind
a ☰ on touch devices and the minimap moves top-right — thumbs own the
bottom corners. The debugging story is the entry's real content:
headless Chrome clamps windows to ~500px and CROPS screenshots to the
requested size, so a perfectly-positioned minimap looked clipped for a
whole cycle. When layout misbehaves only in headless, log
`innerWidth` from inside the page before touching CSS. **Collision**:
point-in-open-cell was never enough — the unit has a body. Free
movement now rejects positions within a margin of blocked-cell centers
and slides along walls by stripping the into-wall velocity component;
solid units (enemy tanks, spawn structures) use the same overridable
blocker hook. Creatures stay passable on purpose: their contact IS the
damage. **The heart**: the Braille implicit-surface heart (ray-marched
against `heartF` along a fib lattice) replaces the sprite in all four
tabs, cycling twinkle → breathe → jelly, flaring orange/red under Wave
when hit. State machine in the dot cloud's tick; `hit()` timestamps
against the last ticked time so the flare needs no external clock.

## `5d2eb5a` — The Heart becomes tower defense (and the walls become cover)

Terrain flipped inside-out: instead of carving corridors from solid,
the field opens everything and re-blocks ~20% as random-walk clumps —
the same tags, the same collision oracle, the opposite reading. Walls
are now COVER, and black wall-tops make their silhouettes the terrain
language. Enemies became creature waves from three destructible spawn
points (one per Braille species, 3 hits each), seeking the Heart by
walking the distance field downhill with a 15% wobble so streams braid
instead of queueing. Allies got infinite ammo and a 1.4s fire loop —
the player's job shifts from gunner to ECONOMY: range out for pickups,
carry regen home, and decide when to push a spawn point. Compute note
for the skeptical: a wave of 12 clouds ≈ 7k CPU-reposed points/frame —
fine; the cap to watch is ~40 concurrent creatures before the
mesh-conversion (or shader-pose) lever gets pulled.

## `dfa08b6` — The Heart: possession, return fire, and carried rewards

Sixth tab. Three mechanics worth noting. **Commandeering is a swap, not
a teleport**: the player possesses the nearest ally by exchanging full
kinematic state (position, cell, glide segment, heading), and the
abandoned body rejoins the patrol — so the ally count is conserved and
death becomes a command-transfer rather than an end (your tank dies →
command jumps to the nearest ally, defeat only when none remain).
**Enemies acquire targets symmetrically** — nearest of player, allies,
or the Heart itself within range — which makes the Heart's ♥10 a real
clock and turns ally positioning into the defense. **The regen reward
must be carried**: picking it up sets a flag, healing happens only
within 2 hops of the pole, so the risk/reward loop (rewards spawn at
≥55% of max distance) has a return leg. Also: the win/lose modals
across all tabs became CRT hologram cards (scanlines, sweep, flicker —
the HokorobiTawaa announce recipe) with a clickable regenerate.

## `98ca514` — Tidying pass: bullet, auto-forward, and an honest state of the code

The Braille Bullet (case, ogive, driving band) replaces the sphere
shell — oriented and rifled purely by object transform, zero per-point
work. Manual mode now always rolls forward (S reverses, W boosts): on
a phone, throttle was the finger we didn't have.

**Practices that have earned their keep** (each paid for by a recorded
mistake): derive render-coupled values FROM render transforms (camera
facing, turret aim — twice bitten by sign conventions); make invariants
Node-testable and screenshots deterministic via URL hooks (`?tick`,
`?walk`, `?look`, `?spawn`); fix discontinuities at the source signal
(smoothDir), not per consumer; make "who is in control" binary and
visible; extend data schemas (looks, units) instead of forking code;
when batch-patching sibling files, anchor on code lines — comments
drift first — and let asserts abort atomically.

**The named debt:** maze/organic/battle are ~900-line siblings from
cp+sed lineage. Two patch-script aborts came from their drift. The
extraction (a shared board-core module parameterized by game rules) is
understood but deliberately deferred — the tabs are still diverging,
and extracting a moving target locks in the wrong seams. Extract when
a fourth board tab appears or when the divergence rate drops.

**Roads not yet taken**, in rough order of leverage: the corner-state
dual layer (the actual Townscaper payoff — state on corners, ~6 tile
families, the grid is ready for it); enemies that shoot back + a lose
condition; InstancedMesh crowds; waveJelly as a vertex shader (dot-
cloud swarms); bloom for tron; cube/torus surfaces (the four-role
split makes movement portable to any of them); biolume (gameplay-
coupled zonal lighting); deliberate defect placement.

## `0f7dc78` — Free movement, and what the grid is actually for

The big one is the movement rework. The question was how to separate
Stålberg world generation from movement. The answer that emerged: the
grid plays four roles that were conflated — world-geometry generator,
collision oracle, semantic map (what's on this cell), and AI nav-graph
— and only KINEMATICS needed to leave. In manual mode the position is
now free on the sphere: W drives along your heading at any angle, the
grid answers exactly one question per frame ("which cell is under this
position, and is it open?") via a voxel-hash nearest-cell index, and
cell semantics (visited trail, orb absorption, heart win) key off that
answer. Auto-wander still routes over the graph — it's a navigator, and
navigators SHOULD think in cells. The handoff back is seamless via a
virtualStart glide origin: auto's first segment interpolates from your
actual free position, not a snapped cell center. Also in this commit:
orbs became Braille dotted spheres under five treatments (spin /
breathe / twinkle / wave / scatter — breathe is transform-only and
free; the others re-pose ~170 points, negligible at orb counts), and
destroyed tanks scatter their own polygons — world-space triangle soup,
per-triangle velocities, 1.15s fade. A coming-apart, not an explosion.

## `e066613` — Battle: the sweeping turret becomes the game

Fifth tab. The design seed: the tank's idle animation — a turret
sweeping left to right — is promoted from decoration to mechanic. You
don't aim; you TIME. Firing launches a shell along the turret's current
world heading, computed by taking the turret group's world quaternion,
transforming +Z through it, and flattening into the tangent plane — the
render transform IS the aim, so the visual sweep and the ballistic
truth cannot disagree (a lesson applied from the lookAt bug: derive
from the same source, never re-derive with your own signs). Three
shells to start; orbs switch from food to ammo (+1, cap 9). Enemy
tanks in per-look hostile tints wander the cell graph at 0.45 cells/s
with desynced sweeps; shells ride the surface, die on walls via a
nearest-cell lookup, and clearing the sector wins. AI is deliberately
inert — wander-only — to make the timing mechanic testable in
isolation before enemies learn to shoot back.

## `05f1891` — The unit roster, and dots vs polygons

`src/units.js`: the three dot-cloud creatures plus two new low-poly mesh
units (tank, drone), a spawn dropdown on the maze tab, and any unit as
the organic tab's main creature. The tank answered a design question:
for a battle game with hundreds of units, which construction wins —
half-dotted or polygons? The honest answer is that the axis isn't dots
vs polys, it's *where the animation runs*. Our clouds re-pose ~700
points in JS every frame per instance — charming at 1 unit, 210k
point transforms/frame at 300. Low-poly meshes are static geometry the
GPU transforms; animation is a handful of transform updates (turret
rotation, hover bob), and InstancedMesh collapses hundreds of units into
one draw call per type. So: mesh units for crowds, dot-clouds reserved
for hero units — or, later, waveJelly moved into a vertex shader, which
would let clouds scale too. The roster encodes the split as
`kind: 'cloud' | 'mesh'` so both coexist and the choice is per-unit.

## `f9fddfd` — Four visual identities

`src/looks.js` centralizes every color decision — backgrounds, light
rig, floor/wall vertex palettes, edge treatment, actor tints — and both
board tabs consume it; switching rebakes geometry in place with game
state untouched. The interesting ones: *battlezone* reproduces the
vector-monitor trick where near-black faces exist purely as hidden-line
occluders behind phosphor-green edges, and *tron* fakes neon without a
bloom pass by putting additive-blended pure-cyan lines over a near-black
world — at these edge densities additive overdraw reads as glow.
*clean* drops edge lines entirely and compensates with 1.8× per-cell
tone jitter so faces still separate. `?look=` deep-links a look.

## `a1aae5d` — 170× generation: incremental merge + voxel-hash sampling

Benchmarking showed per-frame costs were a non-issue at every size — the
wall was one-time generation, 92% of it in `mergeToQuads` rebuilding its
full edge-count map and rescanning the triangle list per accepted merge
(≈O(n²)). It now builds an edge→incident-triangles map once and keeps a
candidate pool with O(1) swap-remove uniform random picks; a merge
retires exactly the five edges of the dead triangle pair. Same tabu
semantics, ≈O(n) total. Sampling's O(n²k) nearest-neighbor scan became a
3D voxel hash over [-1,1]³ — points on a sphere need no cube-map seam
logic, and an expanding-shell search with an exact stopping bound keeps
it exact and deterministic. Numbers (M4): n=8000 went 33.4s → 197ms;
64,000 samples → 285k quads in 2.9s, near-linear. Sliders raised to
8,000 points (36k quads, ~1.4s all-in desktop). The new ceiling is the
maze tabs' 80-iteration pre-relax — O(quads) per iteration — and, past
~70k quads on the grid tab, per-frame normal recomputation. One honest
cost: the merge consumes the rng stream differently, so a given seed
produces a different (equally valid) board than pre-fix builds.

## `56d6d58` — Building Blocks: the by-concept companion

`HOW-IT-WORKS.md`, rendered in-app as the fourth tab (`/#how`): the
Stålberg tricks, the sphere port's substitutions and deletions, the
dungeon method's portability property, the motion arc, and what was
actually expensive. Same markdown converter as this overlay (now
exported from `devlog.js`), same `.mdview` styles, full-page article at
72ch. The devlog stays chronological; that document is organized by
concept — read it first if you're new here.

## `36a4b11` — The dev log, readable in-app

Clicking the cache-bust badge (bottom-right) now opens this document in
an overlay. `src/devlog.js` fetches `DEVLOG.md` with `cache: no-store`
and renders it with a ~30-line markdown converter that handles exactly
the constructs used here (headings, rules, paragraphs, code/bold/italic/
links) — HTML-escaped before any tags are introduced. The badge script
is toolkit-owned and reinstall-overwritten, so the click hook attaches
from outside in the capture phase and parks the original copy-token
action with `stopPropagation`. `?devlog=1` deep-links straight to it.

## `8815ba0` — Manual override: WASD claims control, auto resumes on idle

Any WASD/arrow press now switches auto-wander **off** — the walker stands
still unless driven. Release everything and the wanderer's own will resumes
after `auto resume (s)` seconds (default 3). This replaced the
weight-blending model from `acae9b5` the same day.

**Method.** A `manualClock` accumulates seconds since the last held key;
`manualActive()` compares it to the threshold. In manual mode the pace term
is `keys.fast || keys.slow ? speed × 1.5 : 0`, a fresh S press swaps the
current glide segment (turn-around-then-drive), and the smoothed view
direction chases the **steering heading** instead of the travel direction —
so turning in place looks around at a standstill. The design lesson worth
keeping: when the question is *who is in control*, a binary visible mode
(HUD says `MANUAL` / `auto-wander`) beats interpolated authority weights.
Users can feel a mode; they can't feel a coefficient.

## `acae9b5` — Held-key steering, no-jump camera, world-space motion

Three changes in one pass: keys became held-not-tapped (A/D rotate the
steering intent at 2.6 rad/s, with mid-glide U-turns), every visual consumer
switched from raw direction to a smoothed one, and motion was decoupled from
the grid.

**No-jump camera.** The root cause of every camera snap was that
`travelDir` is discontinuous — it changes instantly at each cell arrival and
flips 180° on a reversal. Rather than masking this with heavier camera lerp
(which adds lag everywhere), a `smoothDir` chases `travelDir` at a bounded
5 rad/s: project both into the tangent plane, take the signed angle via
`atan2(dot(cross(s,g),n), dot(s,g))`, clamp the step, rotate. Cameras, the
walker mesh, and the minimap up-vector all read `smoothDir`; none ever see a
discontinuity. Principle: fix the source signal, not each consumer.

**U-turn without teleporting.** When the heading swings behind the motion,
swap `cur↔next` and set `prog = 1−prog`. Same chord, opposite direction —
the position function is continuous through the swap, so reversing produces
zero visual artifact; only the direction changes, and that's smoothed.

**World-space motion** (see also the grid/motion separation note below):
progress advances as `(speed × cellSide × dt) / segLen`, where `segLen` is
the chord length of the current cell-to-cell segment, and leftover distance
carries across arrivals (`carry = (prog−1) × segLen`, next segment starts at
`carry / newSegLen`). Before this, "cells per second" made the walker
visibly lurch — fast across big cells, crawling across small ones. The grid
offers the space; the motion merely traverses it.

## `5e661dd` — Orb respawn, per-creature locomotion, phagocytosis

The maze regrows one orb every N seconds (timer lives inside the motion
step, so `?tick=` simulations regrow food too). Each creature gets a
locomotion profile — `speed(t)` and `hover(t)` — layered over the wander
pace: the amoeba crawls in surge/pause cycles, the phage creeps with rare
`sin¹⁰` darts, the jellyfish floats and thrusts **on the same `3t`
oscillator as the Jelly squash treatment**, so propulsion visibly coincides
with the bell squeeze.

**Phagocytosis.** `waveJelly` gained `reachDir`/`reachAmt`: after the
ripple/squash/spin, any point whose direction aligns with the target gets
pushed radially outward by `1 + amt × 1.15 × alignment⁵` (the 5th power
makes it a pseudopod, not a uniform swell; a small secondary ripple keeps it
reading as membrane). The orb's world direction is transformed into the
creature's local frame each frame via the inverse mesh quaternion.
Absorption switched from cell-arrival to membrane-contact distance, so the
engulf completes the moment the reaching membrane touches.

**Verification note:** instead of screenshot-hunting for a reach moment, the
seeded orb layout was replicated in Node to compute which `?walk=N` value
parks the amoeba beside an orb (N=14 on the default seed). Deterministic
beats lucky.

## `9426f84` — Organic tab: Braille dot-cloud creatures, absorb-and-grow

Third tab, a copy of the maze where the walker is a point-cloud organism
ported verbatim from the Braille *fun-shapes* generators (amoeba /
bacteriophage / jellyfish, ~500–700 points each, unit-normalized, highlight
dots tinted warm). Twelve amber orbs sit on seeded-random open cells;
absorbing one grows the creature ×1.13 and the chase camera pulls back
proportionally.

**Method.** The creatures render as `THREE.Points` with per-vertex color.
The Wave×Jelly treatment — Braille's radial ripple
`d = 1 + 0.14·sin(3θ + 3t − 2y)` composed with the volume-preserving
squash-stretch `sy = 1 + 0.18·sin 3t, sx = 1/√sy`, plus a slow spin —
re-poses the cloud **on the CPU every frame in local space**; the object
transform carries it to the sphere surface. At 700 points this is trivial
work, and it keeps the treatment code line-for-line identical to the Braille
reference instead of a shader translation. A faithful-port detail: the
jellyfish has no highlight dots in the source, so it has none here — the
test that asserted otherwise was fixed, not the shape.

## `58e197e` — The autonomous wanderer

The walker glides continuously and picks its own exits; the player steers a
bias, not a command. Defaults changed to third person over 0.03 walls.

**Method.** At each cell arrival, every open exit is scored:
`2.2 × dot(steeringHeading, exitDir)` + `1.1` if unvisited (curiosity) −
`2.4` for backtracking + seeded noise `±0.8`. Weighted-max-with-noise was
chosen over softmax sampling — same feel, one fewer tuning knob. The
steering intent decays 35% toward the actual travel direction per arrival so
stale input fades. Position interpolates along the chord between cell
centers and is re-normalized onto the sphere each frame.

**Headless testing gotcha:** Chrome's `--virtual-time-budget` does **not**
advance `performance.now()`, so dt-driven motion barely moves during a
screenshot run. `?tick=N` synchronously simulates N seconds of wandering
before the first frame — the only way this feature is screenshot-verifiable.

## `efd8c5b` — Mobile pass + third-person camera

Safe-area insets, `touch-action: manipulation` (kills the 300ms double-tap
delay), 44pt+ hit targets on coarse pointers, PWA manifest + iOS meta tags
+ icons (drawn as SVG, rasterized through headless Chrome since libcairo was
absent). The **service worker is deliberately deferred**: a SW sits between
the browser and the `?v=` cache-busting layer, and a stale SW silently
serves stale modules — if added later it must key cache names off the cb
token. Third person arrived here as a V-key/👁 toggle: eye at
`wallHeight×2.6 + cellSide×1.1` above and 1.8 cells behind, sharing the
same goal-quaternion path as PoV so the lookAt fix covers both.

## `71a434a` — Walker scaled to wall height

At low walls the PoV camera (eye at `0.62 × wallHeight`) sank beneath the
cell-sized walker cone, which then filled the frame. The walker now scales
to `min(cellSide, wallHeight × 0.75)` — tip always below the eye line — and
below knee-height walls it hides from the first-person pass entirely (the
minimap keeps it). Mismatched scaling references are a classic: the cone was
sized by one length scale (cell width) while the camera used another (wall
height).

## `15ec66e` — The camera was mounted backwards

W appeared to walk backward. The movement was correct; the camera was
rotated 180°.

**Root cause.** three.js `lookAt` is convention-split: a plain `Object3D`
faces **+Z** toward the target, but anything with `isCamera` renders down
**−Z** and gets the opposite rotation. The camera's goal quaternion was
computed on a scratch `Object3D` and copied onto the real camera — exactly
180° wrong, permanently. Fix: derive the goal from a throwaway
`PerspectiveCamera`. Corollary recorded in the decision log: every earlier
"framing feels off" iteration had been tuning against a mirrored view.
When a 3D view "faces the wrong way," check the lookAt convention before
touching framing numbers.

## `e023958` — Tank controls + relative paths for Pages

A/D became rotate-in-place (the earlier exit-picking scheme moved the player
sideways and snapped the view every press). All asset references went
relative (`./…`) because GitHub Pages serves project sites under a sub-path
where absolute `/…` URLs 404. The cache-badge script already derives its
path from the favicon link, so it needed no change.

## `e7c70ca` — Maze tab: hallways found, not drawn

The HokorobiTawaa dungeon method transplanted onto the sphere: the quads are
the cell graph (adjacency only across a full shared edge — corner contact
doesn't count), every cell defaults to blocked/elevated, and corridors fall
out of BFS.

**Method.** Room seeds are farthest-point-sampled over the graph (repeated
BFS, take the most distant cell). Each new seed digs a shortest-path
corridor to the nearest already-carved cell; each seed then inflates into a
room (cells within `roomRadius` hops). Extra corridors run `bfsPath` with
the existing hallway interiors in an avoid set, forcing genuinely distinct
routes — cycles, so it's a maze, not a tree. Spawn and heart are the
double-BFS diameter endpoints of the *open* subgraph. Everything is hops on
the graph; no world-space distance is ever measured, which is exactly why
the method survives the transfer from a 2D Voronoi board to a spherical
quad mesh unchanged. Node invariants (`test/maze.mjs`): open subgraph fully
connected, deterministic per seed, spawn→heart 56–69 hops at n=300.

The trench camera cost two dead framings: eye level with the wall tops
reads as an empty plateau on a small sphere (the horizon is ~0.45 rad away —
the 2D "trench height" intuition doesn't transfer), and untextured walls at
close range read as void until an edge-line overlay (cell outlines, wall
rims, corner verticals) restored depth.

## `5fb496e` — The grid itself: Stålberg on a sphere

The founding PoC: Oskar Stålberg's organic quad grid (triangulate → merge
triangle pairs into quads → subdivide everything into quads → relax toward
squareness) ported from the plane to the surface of a sphere, from the
working 2D implementation in `oskar-procedure`.

**Spherical Delaunay = convex hull.** For points *on* a sphere every point
is extreme, and the 3D convex hull's faces are exactly the Delaunay
triangulation (empty-circumcircle ↔ hull face plane). three.js's quickhull
provides it, with globally consistent outward winding for free — the 2D
version had to normalize winding into existence. Blue-noise sampling uses
Mitchell best-candidate (Bridson's grid has no clean S² analogue).

**The topology code didn't change.** Merge and subdivision bookkeeping is
byte-for-byte the 2D algorithm; the only sphere-aware pieces are a
tangent-plane projection (quad legality and relaxation both operate on the
2D shadow of each quad in the tangent plane at its centroid), on-sphere
reprojection of new midpoints/centroids, and Newell-normal winding checks.
One 2D-ism had to be *deleted* rather than ported: the sliver-triangle
filter, because dropping faces on a closed surface tears holes — a bounded
patch can trim its boundary; a sphere has none.

**Relaxation with a constraint.** The 2D closed-form closest-square fit
runs per quad in its tangent plane; accumulated forces are applied in 3D
and every vertex is re-normalized to the sphere. This *defines* squareness
of a spherical quad: squareness of its tangent-plane shadow, subject to
staying on the surface. Converges 0.26 → 0.14 RMS error in 60 iterations.

**What the sphere forces.** A closed all-quad mesh cannot be valence-4
everywhere — Euler's formula demands `Σ(4 − valence) = 8`. About 21% of
vertices come out irregular (v3/v5/v6+), almost all in cancelling pairs
inherited from the construction; the net 8 is topological destiny. The
smoke test asserts watertightness, `V − E + F = 2`, and the defect law on
every seed.

---

## Cross-cutting notes

**Testing without a browser.** All grid, dungeon, and creature math lives
in DOM-free modules (`grid.js`, `dungeon.js`, `creatures.js`) tested by
plain Node scripts asserting invariants, not snapshots. The render layer is
verified with headless Chrome (software WebGL needs
`--use-angle=swiftshader --enable-unsafe-swiftshader`; `--disable-gpu`
kills context creation outright) plus the `?walk=` / `?tick=` / `?wall=` /
`?view=` / `?creature=` URL overrides that make any state screenshotable
deterministically.

**Cache busting.** Every asset and ES-module import carries a `?v=<token>`
bumped by `scripts/bust.sh`. Two hard-won rules: *never* token vendor
imports (ConvexHull imports `./three.module.js` bare — a tokened parallel
URL loads a second copy of three.js), and a stock fingerprinter that
rewrites HTML/CSS is not coverage when the app's real graph is ESM imports
— trace one URL of each asset class before trusting it.
