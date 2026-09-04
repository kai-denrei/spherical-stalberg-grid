# Mines — design (2026-09-04)

Proximity landmines on the TD board: a fourth way to put a shell's worth
of damage into the hordes, laid by the tank, from a replenishable count.
Operator's brief: "the user can place them at chokepoints during downtime,
or later for pvp or other game modes"; the M2 SLAM and the Counter-Strike
claymore as inspiration; "strong enough to hurt the portals as 1 shell".

## Rulings (operator, 2026-09-04)

- **B — claymore, directional.** Instant on trigger, damage in a forward
  arc. No fuse. An **arming period** after the drop.
- **Dropped right in front of the tank**, facing the tank's heading. The
  dynamic this buys: laying them while driving *back* — every drop faces
  the enemy you are retreating from, and the field grows between you.
- **Friendly fire**: the tank trips its own mines and takes their damage.
  Mines show as a friendly colour on the radar.
- **Supply**: the Terraformer prints a case on its yard clock, and the
  debrief sells a case for biomass. Start at 10.
- **The arc shows** as a red laser fan on the ground; toggleable off for
  modes where mines should be a secret.
- Shelved for later, noted here so they are not lost: **A** proximity
  with a fuse (a countdown readable on the radar); **C** two mine kinds
  from one pool; **D** the Vulture/spider mine that pops out of the ground
  and chases its target before it blows.

## 1. The mine, as a pure module

`src/mines.js` — no three.js, no DOM, Node-tested in `test/mines.mjs`.

```
MINE_TUNE = {
  start: 10, cap: 20, caseSize: 5,
  armSecs: 2.0,
  fanDepth: 1.0,        // trigger fan, cells, in front of the mine
  arcDeg: 120, reach: 2.5,   // blast arc and reach, cells
  damage: 1,            // a shell's worth, to everything in the arc
  yardEvery: 3,         // waves between Terraformer cases
  price: 200,           // kg, on the debrief
}
```

A mine: `{ id, ci, pos, dir, laidAt, live, alive }` — `pos` a unit vector
(the world point one cell in front of where the tank stood), `dir` a unit
tangent (the tank's heading at the drop). A field: `{ count, mines, next }`.

Functions, all pure, all over unit vectors and cells:

- `makeField(tune)` → a field with `count = tune.start`.
- `layMine(field, { pos, dir, cellAhead, blocked, occupied }, t, tune)` →
  `'laid' | 'empty' | 'blocked' | 'occupied'`. Refuses when the count is
  0, when the cell ahead is BLOCKED, or when a live or arming mine already
  stands on that cell. Decrements the count on success.
- `armMines(field, t, tune)` → the mines whose `t - laidAt >= armSecs`
  become `live`. Returns the ids that armed this call (for the sound).
- `inFan(mine, p, cellSide, tune)` → is the point `p` inside the trigger
  fan: within `fanDepth` cells of the mine's front edge and inside the arc.
  **Arc length on the sphere, never a chord** — the standing rule — via
  the same `arc.js` helpers the beam uses.
- `inArc(mine, p, cellSide, tune)` → inside the 120° arc out to `reach`.
- `trip(field, mine, points, cellSide, tune)` → the mine dies; returns the
  indices of `points` inside its arc (the targets) and the ids of other
  live mines whose `pos` is inside the arc (the chain). Nothing happens
  on a mine that is not yet `live`.
- `chain(field, ids)` → those mines are queued to trip on the following
  frames, front to back (by distance from the first), so a laid row goes
  off as a row.
- `restock(field, n, tune)` → `count = min(cap, count + n)`.

## 2. The blast, in the board (td-tab)

Per frame, after enemies move: for each live mine, test every alive
hostile and the tank against `inFan`; the first hit trips it. On a trip
the board applies, to every target the module returned:

- an enemy: `damageEnemy(e, t, MINE_TUNE.damage, true, 'mine')` — fodder
  dies, the armoured tier loses one shell's worth; rammable or not is
  irrelevant, a mine is a shell, not a ram;
- a gate in the arc: `popPods` and hp − 1 (one of three — "as one shell");
- the tank in the arc: 1 HP through the same door a ram hit uses.

Chained mines trip on the following frames. The blast itself draws with
the existing pieces: `warnRing` in the shell's colour at the mine, a
`makeDotBurst` at each target. No fuse anywhere.

## 3. Controls

- Desktop: `N` lays a mine. The key is free.
- Phone: a third pad beside FIRE and LASER, `#td-pad-mine`, a mine glyph,
  in the thumbs' side.
- The drop is one cell in front of the tank, on the surface, facing the
  tank's heading at that instant. During a deploy, a shot, a pause or
  build mode the key does nothing (the same `driveFrozen` gate the guns
  obey).
- The HUD shows the count beside the shell ammo, same style: `✦3 · ⌖7`.
  At 0 the glyph dims like an empty ammo.

## 4. Supply

- **The yard**: the Terraformer prints a mine case (`caseSize` mines)
  every `yardEvery = 3` waves on its existing clock (`TF`), between the
  store's every-2 and the hull's every-5 so the three never coincide. The
  yard readout names it ("next case in N waves").
- **The debrief**: a row in the `SINK` table — a case for `price` kg,
  beside the spare hull and the strike missile.
- The count caps at `cap = 20`; a case beyond the cap is lost, and the
  yard says so.

## 5. What you see

- **The mine**: a small dot-cloud disc on the ground (the Braille idiom:
  a `makeDotBurst`-style points object, sized in cells), a dim ring while
  arming and a lit one when live.
- **The arc**: a red laser fan on the ground from the mine's front edge
  out to `reach`, drawn with the board's own line material, low opacity,
  built in cells so it follows the curvature. `params.mineArcs` (a look
  knob) and `?minearcs=0` turn it off — the future modes where a mine is
  a secret.
- **The radar**: a live mine is a small friendly-blue triangle pointing
  along its arc; an arming mine is hollow. Same sweep, same phosphor
  decay as every other contact — a laid field is a row of arrowheads you
  can read across the map.
- **Sound**: existing sounds only, per the standing rule — `tank_pickup`
  for the drop, `tower_slow` for the arm, `tank_main` for the blast.

## 6. Tests and probes

`test/mines.mjs` pins the rules with no renderer:

- a mine cannot be laid with an empty count, on a BLOCKED cell, or on a
  cell that already carries one;
- nothing trips during the arm window; the same point trips after it;
- a point in the fan trips, a point beside the fan does not;
- the arc catches a point at 2.4 cells inside 60° and not one at 2.6, and
  not one at 70° off the axis;
- the chain trips a second live mine in the arc and not one behind;
- the count caps at 20 on restock;
- the tank's own position inside the arc is returned as a target.

On the board: `?mines=N` starts with N; `?mineprobe=1` lays a field of
three across a lane, walks a phage through it, and logs the trips, the
targets, the chain order and the tank's HP — the first run of the
feature is a log line, not a play session. `?minearcs=0` is the toggle.

## 7. The metal on the default game

(The operator's second item.) `applyWeatheredMaterial` on the board's
casts — the tank, the containers, the Terraformer, the portal ring — at
the tier's size (512 desktop, 256 phone), **keeping** the board's
emissive grey ladder and its colours: the board is lit at hemi 0.55 /
sun 0.25, and the ladder's emissive rungs are the only reason the
machines read on it. The maps modulate the ladder; the ladder stays.
`materials.js` gains `keepColor` beside `keepEmissive`. `?metal=0`
returns the flat cast. Judged on the board, at the tier, on both
surfaces; the lab's COPY preset is what feeds it. This is a separate
plan from the mines and lands first — it is one call per cast.

## Out of scope (named)

Fused mines (A), two kinds (C), the chasing mine (D); mines in the
director's scripts (a `mine` verb is one line once the board has the
function); pvp.
