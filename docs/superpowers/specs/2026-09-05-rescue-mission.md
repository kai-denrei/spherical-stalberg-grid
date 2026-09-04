# Rescue Mission — design (2026-09-05)

Operator's brief, verbatim: *"I am quite keen on testing a little Rescue
Mission; a handful of astronauts stranded, requires smart use of limited
mines and shells to save. Lots of rammable enemies and just a handful of
more difficult one to manage. More tactical."*

Everything below that is not in that paragraph is a decision taken on the
operator's behalf, under their standing instruction for an overnight
session. Each one is flagged **(taken)** with the reason, so they are cheap
to overrule after a play.

## What it is

A MISSION VARIANT of the TD board — `#td?mission=rescue` — not a new tab.
Same planet, same tank, same gates, same mines. Two things change: the
OBJECTIVE and the SUPPLY. Everything else the board already does is
exactly what a rescue needs, and a second copy of it would rot.

## The stranded

Six astronauts stand on the open board, deterministic from `params.seed`,
placed **on the lanes** between the live gates and the Stalheart, six to
fourteen cells out, never adjacent to each other.

**(taken) On the lanes, not scattered at random.** The horde already
flows gate → heart; putting the survivors in that flow means the threat
comes to them without a second nav field, and it makes the map read: the
people you must save are standing in the road.

Each is a small dot-cloud figure (`personPts` in `creatures.js`, the
Braille idiom) with a beacon — a vertical dot column and a slow ring in
survivor-orange — so they read from the orbital view. On the radar they
are an orange chevron that does NOT decay with the sweep: a survivor is
not a contact you have to hunt for.

**(taken) A dot cloud, not the astronaut GLB.** `assets/models/astronaut.glb`
is 3.7 MB of skinned mesh with 25 bones. Six of them animating, at a scale
where a person is a third of a cell wide, is a phone-tier disaster for
something that will occupy twenty pixels. The GLB stays the cinematic and
study asset — see `docs/RESCUE-MISSION-NOTES.md`.

## Ferrying

The hull carries **two at a time**.

- **Boarding.** Within one cell of a standing survivor, at less than a
  third throttle, for one second → they board. Sound `tank_pickup`, a
  rising dot burst, the beacon goes out.
  **(taken) The stop clause.** Without it a pick-up is something that
  happens while you drive past, which is not a decision. Standing still
  for a second in the open, with the horde coming, is the decision.
- **Disembarking.** Drive onto the Stalheart's pad → everyone aboard is
  saved, permanently. The saved count is the score.
- **The gamble.** A survivor aboard cannot be killed — except by losing
  the tank. Lose a hull while carrying two and both are lost with it.
  That is what makes ferrying a pair a bet rather than an optimisation.

## The threat

Waves keep coming from the gates on the board's own clock; there is no
timer. The pressure IS the wave curve, and taking your time is how you
lose. **(taken)** A stopwatch would make it a race; the brief says
tactical.

An enemy that comes within two cells of a **standing** survivor locks on
and walks straight at them — a short local override of the graph walk, not
a second BFS field. On contact the survivor is GRABBED: their ring turns
red and runs down over one and a half seconds. Kill the grabber inside
that window and the survivor is freed and stands again. Let it run out and
they are gone.

**(taken) A grab window, not an instant kill.** A rescue that can be lost
in a frame you did not see is a rescue nobody feels they lost fairly. One
and a half seconds is one shell, one ram, or one mine you laid earlier —
which is the sentence the whole mission is about.

## The supply — the whole tactical budget

No Terraformer, no towers, no biomass, no orbital strike, no ammo
pickups. You start with, and never receive more than:

```
hulls   3      shells  8      mines  6      lasers  OFF
```

**(taken) The lasers are off.** They cost heat, not ammo, so with them on
"limited shells" means nothing at all and the mission is a driving
exercise. The rescue hull is a transport with its secondaries stripped.
This is the single most overrulable number here: `RESCUE_TUNE.lasers`.

Ramming stays free and unlimited — it is the answer to the soft tier, and
the brief asks for lots of them. So the economy of the mission is exactly:
**ram the soft, and spend one of your fourteen shells-and-mines on each
hard one.** A mine laid across the lane an astronaut is standing in is the
mission's signature move, and it is why mines landed first.

## The mix

A fixed programme, in the module rather than through `computeWavePlan`:
mostly rammable fodder with a small, growing hard core.

| wave | soft | hard |
|------|------|------|
| 1    | 8    | 0    |
| 2    | 10   | 1    |
| 3    | 12   | 1    |
| 4    | 14   | 2    |
| 5+   | 14 + 2/wave | 2 + 1 per 2 waves, capped at 5 |

Types come from `ENEMY_SPEC`, chosen by the `rammable` flag — the colour
already carries that read and a test already enforces it.

## The end

The mission ends the moment **no standing survivors remain** — every one
either saved or dead. It also ends when the last hull is gone, with
whatever was saved (and anyone aboard lost). A loss with a score, not a
binary, because "four of six, and the fifth was in the hatch" is the story
the mode exists to produce.

The card: `SAVED n/6`, the names of the lost, shells and mines left, hulls
left. A clean sweep gets its own line.

## 1. The pure module — `src/rescue.js`

No DOM, no three.js, Node-tested in `test/rescue.mjs`.

```
RESCUE_TUNE = {
  survivors: 6, seats: 2,
  bandMin: 6, bandMax: 14,   // cells from the heart
  apart: 3,                  // minimum cells between two survivors
  boardCells: 1.0, boardSecs: 1.0, boardThrottle: 0.34,
  lockCells: 2.0, grabSecs: 1.5,
  hulls: 3, shells: 8, mines: 6, lasers: false,
}
```

- `makeRescue(tune)` → `{ survivors: [], carried: 0, saved: 0, lost: 0, over: false }`
- `placeSurvivors(state, cands, dist, rng, tune)` — `cands` are cell
  indices already filtered to the lanes; `dist[ci]` is hops from the
  heart. Deterministic, in the band, never within `apart` of each other,
  fewer than asked for if the board cannot hold them (and it says so).
- `stepBoard(state, i, { near, slow }, dt, tune)` → `'boarding' | 'aboard' | null`.
  Resets the moment `near` or `slow` goes false — a pick-up interrupted
  is a pick-up not made.
- `stepGrab(state, i, held, dt, tune)` → `'grabbed' | 'freed' | 'lost' | null`.
- `disembark(state)` → the number saved by this call.
- `loseCarried(state)` → the number lost with the hull.
- `lockOn(surv, enemyPos, cellSide, tune)` — is this enemy close enough to
  peel off toward that survivor.
- `waveMix(w, tune)` → `{ soft, hard }` from the table above.
- `standing(state)`, `missionOver(state)`, `verdict(state)`.

Tests: the band and the spacing hold and the placement is deterministic
per seed; a board too small returns fewer and says so; boarding needs BOTH
near and slow and RESETS on either; the seat cap refuses a third; a grab
freed inside the window leaves the survivor standing; a grab that runs out
does not; losing the hull loses exactly what was aboard and nothing saved;
the mission is over when nothing is standing; the mix is mostly soft at
every wave and the hard count caps.

## 2. The board

- `#td?mission=rescue` (and `?mission=` is the seam every later mission
  hangs on). Sets the supply, hides the tower shop, the strike console,
  the biomass readout and the Terraformer line; the objective row becomes
  `SAVED n/6 · ABOARD k/2 · STANDING m`.
- Survivors: the dot-cloud figure + beacon + ring; the radar chevron.
- Per frame: boarding, the grab clock, the local lock-on, disembark on the
  pad.
- The end card through `showBrief`/the verdict modal.
- `?rescueprobe=1` — place, walk the tank onto one, board it, walk it
  home, and log every transition. `?survivors=N`.

## Out of scope (named)

The astronaut GLB on the board; a carry animation; survivors that walk
themselves toward the heart once freed; a timer; pvp; the mission select
card in the menu (the URL is the seam tonight).
