# Dev Log

Newest first. Each entry: what landed, then how it works, for programmers.
Demo links assume `npm run serve` (port 8144) or the
[Pages deploy](https://kai-denrei.github.io/spherical-stalberg-grid/).

---

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
