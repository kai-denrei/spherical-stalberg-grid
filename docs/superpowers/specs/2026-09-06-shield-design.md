# The shield — design (2026-09-06)

The energy shield is currently one thing: a 12-second bubble that falls out
of a `dome` pickup and eats touch damage. The operator's brief, in their own
words: "It's very satisfying to rack up bonuses by using shields" — so the
shield stops being a lucky pickup and becomes a system with a look, a supply
ladder, and a use the player can plan around.

Three changes, in the order they were asked for:

1. **The look.** "Less half-dotted, more hologram." It is a 280-dot `Points`
   cloud today (`units.js:1013`) — the same speckle idiom the board uses for
   everything, which is why a bubble made of it reads as debris rather than a
   field.
2. **The supply.** Four ways in instead of one: the pickup, a tap off a Slow
   tower, a charging pad at the heart, and a spendable rack on the `S` key —
   `N`'s sibling.
3. **The shove.** With the shield up, the not-rammable tier is pushed aside
   rather than destroyed. The bubble becomes mobility, never a weapon.

## Rulings (operator, 2026-09-06)

- **All four sources**, not a subset.
- **One capped seconds meter.** Every source tops the same clock up to a
  ceiling; nothing hoards past it.
- **The shove does no damage and costs no shield time.** Flung aside plus a
  stagger, then it walks back into its lane.
- **The rack is 2 charges of 10 seconds** with a **small cooldown** — "tight
  enough that a skilled player could possibly keep a RAMx bonus going by
  avoiding hard-cores in-between."
- **Shader hologram**, not a translucent ball and not dots with a shell
  behind them.

## 1. The shield, as a pure module

`src/shield.js` — no three.js, no DOM, Node-tested in `test/shield.mjs`.
Same shape as `mines.js`: a tune table, a knob list for the feel tuner, a
state factory, and **every refusal in here**. `td-tab.js` keeps the mesh, the
HUD and the keys.

```
SHIELD_TUNE = {
  cap: 20,          // seconds; the meter ceiling, whatever fed it
  pickup: 12,       // the dome pickup, unchanged — the number pickups.js prints
  rackStart: 2,     // charges at the top of a run
  rackCap: 4,       // two spare cases
  caseSize: 2,      // charges in a case
  price: 250,       // kg for a case on the debrief
  deploySecs: 10,   // seconds one charge buys
  coolSecs: 2,      // after the shield DROPS, before S works again
  tapRate: 1.5,     // s of shield per second parked in a Slow tower's radius
  tapOutage: 5,     // s that tower stays out of order after you leave
  stationRate: 3,   // s of shield per second on the heart pad
  stationBudget: 10,// s of shield the pad will give per wave
}
```

State: `{ t, rack, coolUntil, tapped: Map<towerId, until>, stationLeft }`.

The module owns:

- `charge(st, secs)` → adds, clamped to `cap`. The one door every source uses.
- `deploy(st, now)` → `'ok' | 'empty' | 'cooling' | 'up'`. **Refused while
  the shield is up from any source**, and while cooling. A charge can never
  be spent topping up a bubble you already have — that refusal is what forces
  the naked seam the whole rack design hangs on.
- `tick(st, dt, now)` → drains `t`; when it crosses zero it stamps
  `coolUntil = now + coolSecs`. **The cooldown runs from the DROP, not from
  the deploy** — so the seam is a fixed 2s wherever the bubble came from.
- `restock(st, n)` → to `rackCap`; the overflow is lost, as with mines.
- `shoveVec(enemyPos, playerPos, playerHeading)` → the lateral tangent
  direction and magnitude for §4. Pure vector math, so the test can pin the
  one thing that is easy to get wrong: the push is perpendicular to the
  tank's heading **in the tangent plane of the sphere**, not in world space.

## 2. The hologram

`makeShieldShell` in `units.js` returns a `Mesh`, not `Points`: the same
ellipsoid the cloud described (1.05 / 0.8 / 1.3 — the hull is longer than it
is tall), under a `ShaderMaterial` with `blending: AdditiveBlending`,
`depthWrite: false`, `side: DoubleSide`, `transparent: true`.

Uniforms: `uTime`, `uFrac` (life remaining, 0..1), `uHitDir` (a unit vector in
the shell's local space), `uHitT`, `uColor`.

The fragment does four things, added:

- **Fresnel rim** — `pow(1.0 - abs(dot(N, V)), 2.5)`. Near-invisible looking
  straight through the middle, bright where the surface turns away. This is
  the whole difference between a hologram and a ball: you must be able to see
  the board through it while driving.
- **Lattice** — faint lat/long lines off the local position, thin and dim.
- **Sweep** — one band travelling along local Y on a slow loop.
- **Ripple** — a ring expanding from `uHitDir` for ~0.35s after `uHitT`.
  `playerHit` already knows where the contact came from, so the impact flash
  stops being a global opacity spike (`td-tab.js:8174`) and becomes a strike
  landing on a surface at the place it landed.

The **blink under 25%** survives unchanged — `pickups.js` prints "it blinks
before it dies — count your seconds" to the player, and that promise is a
contract, not a detail.

The unit viewer draws the same object, so the shell must keep working with no
game around it: `userData.tick(t, frac)` stays the entry point, and `uHitT`
defaults far in the past so an unhit shell is quiet.

## 3. The four sources

All four call `charge()`. None of them touch `shieldT` directly.

### 3a. The dome pickup — unchanged

12 seconds, `td-tab.js:7982`. It now clamps at the cap like everything else.

### 3b. The Slow-tower tap

Park the hull inside a `slowfield` tower's radius and it **stops slowing
anything** — its field is being drained into your hull instead — pouring
`tapRate` seconds of shield per second parked. It stays out of order for
`tapOutage` seconds after you leave.

In the `slowfield` branch (`td-tab.js:10055`), if the tank is in range: skip
the `e.slowFactor` / `e.slowUntil` writes entirely for that tower, and point
the three lightning bolts at **the tank** instead of at the nearest enemies.
The picture is the explanation — you can see which tower you are draining and
that it is no longer working on the crowd.

The trade is the point: your best crowd-control tower is offline exactly when
you are deep enough to want a bubble, and for five seconds after you leave.
The outage is on the tower (`tw.tapUntil`), so several taps do not stack into
one board-wide blackout.

### 3c. The heart station

A pad on the heart cell — a ring on the ground, lit while it has budget.
Standing on it charges at `stationRate`, drawing down `stationLeft`, which
refills to `stationBudget` at the top of every wave.

It costs no biomass. The cost is being at the heart instead of at the front,
which is the same pull the regen charge already makes — and unlike the regen
charge you get nothing for the trip but the bubble.

### 3d. `S` — the rack

`N`'s sibling at `td-tab.js:3345`, and the mobile button beside it.

**2 charges of 10 seconds, cap 4, a case of 2 for 250kg** on the debrief next
to the mine case. `20s` of rack is exactly the meter cap: the starting rack is
one full bubble, spent in two halves.

The chain is the design:

```
S → 10s shielded → 2s naked → S → 10s shielded → ...
```

`RAM_COMBO_GAP` is 4 seconds (`td-tab.js:1023`), so the 2-second seam does
**not** expire the combo on its own — a player who keeps finding soft bodies
through the gap carries the multiplier straight across. But it is real
exposure: one hard-core contact in those two seconds costs a hull and zeroes
`ramCombo` (`:8221`). The skill being tested is reading the crowd ahead of the
drop and steering the naked seconds through the fodder.

A stocked player chains four charges — 40s of shield across three seams — and
has paid 500kg for it.

## 4. The shove

In the hard-contact branch (`td-tab.js:6411`), with the shield up:

- No damage to the hull, no damage to the enemy, **no shield time spent**.
- `e.shove = { dir, mag: cellSide * 0.9, t: 1.1 }` — laterally off the tank's
  heading, in the tangent plane.
- `e.stagUntil = now + 0.8` — it stands there stunned.
- The hull still takes the `bumpLeft` shove it takes today. The impact reads
  from inside the tank as well as outside it.

**Why an offset and not a move:** `e.pos` is rebuilt from the cell path every
frame (`td-tab.js:6334`), so writing a new position lasts exactly one tick —
the same trap `?a6ram=1` exists to document. The shove is therefore applied
**after** the interpolation, as a decaying offset re-normalised onto the
sphere, and `e.stagUntil` zeroes `pace` so `e.prog` does not advance while it
is out of the lane. The result the player sees: flung out, stunned, then it
slides back into its path and carries on toward the heart.

**The shove does not touch the combo.** Shoving a hard core is not a ram: it
pays nothing, scores nothing, and leaves `ramCombo` and `ramComboT` alone. It
clears the lane so you can reach the next soft body inside the window. This is
the line that keeps the shield from becoming a weapon and keeps `rammable`
the most load-bearing read on the board.

## 5. HUD, docs, and the shop

- The alert line (`td-tab.js:5342`) becomes a **draining bar** with the
  seconds on it, plus a rack pip count `⛨ ×2`.
- Cooling shows: the pips grey for the 2 seconds, so the seam is legible
  rather than a dead key.
- Keys panel (`:4674`, `:4691`) gains `S — deploy a SHIELD (10s)`.
- The debrief gains a shield-case button beside the mine case (`:11382`),
  disabled at rack cap, `SINK.shields = 250`.
- `pickups.js` grows the rack and the station as described objects, since the
  unit viewer teaches from that table and a second copy would drift.
- A tuner group for `SHIELD_KNOBS`, so the outage and the budget can be moved
  by feel without a code change.

## 6. Verification

None of this is screenshot-checkable — a bubble on a still frame says nothing
about a cooldown — so each piece gets a probe, and the probes are the deliverable:

- `?shield=N` — unchanged, ignite the bubble for N seconds.
- `?shieldrack=N` — set the rack.
- `?shieldprobe=1` — the whole ladder in log lines: the meter clamping at the
  cap, one full `S` chain across the seam with the cooldown refusing in the
  middle, a tap cycle with the tower confirmed not slowing and the outage
  expiring, and the station budget running out and refilling on the next wave.
- `?shoveprobe=1` — a hard unit driven into a shielded hull: the offset at its
  peak, the stagger holding `e.prog` still, and the position back on its cell
  path afterwards. It also asserts the hull did not lose HP and `ramCombo` did
  not move.
- `test/shield.mjs` — the pure module: cap clamping, every `deploy` refusal,
  cooldown measured from the drop and not the deploy, restock overflow, the
  station's per-wave budget, and `shoveVec` perpendicular to the heading in
  the tangent plane.

## Deliberately not built

- **A standing dome you leave on a cell.** Considered and dropped: it is a
  whole new board object with its own collision, and the personal bubble is
  what the combo chain needs.
- **Chip damage on the shove.** It would blur the DO-NOT-RAM read the board
  is built on, and that read is worth more than the damage.
- **Uncapped stacking.** A patient player banking a minute of invulnerability
  makes the station and the tap dominant and the rack pointless.
