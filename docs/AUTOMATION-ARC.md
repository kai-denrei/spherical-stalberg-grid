# The automation arc — Isao prints the chips

Operator, 2026-09-05, alongside the sniper lab:

> "One high-level idea: we land on the planet bare-bone, little by little
> Isao automates processes. At first we need to manually aim the towers,
> snipe from a distance, ballistic shots... little by little Isao prints
> the necessary chips to automate the systems."

Recorded here rather than built, because it is a SPINE and it reframes
things that already exist.

## Why it is bigger than a feature

The game already has two of the three pieces and does not use them as a
progression:

- **Isao already prints.** `ISAO takes orders, travels, and prints` is a
  decided mechanic with two clocks; the Terraformer already keeps time in
  waves and prints stores and hulls. A CHIP is one more thing on that bed,
  and it costs the same currency everything else does.
- **The manual/automatic seam already exists, everywhere.** The tank has
  manual vs auto with the directive picker. The towers have `pickTarget`
  and `autoGunner`. The sentry range has `manual aim` beside its tracking.
  The sniper lab's `assist` levels are the same seam a third time.

What the arc adds is that the automatic half is not free at the start.
Every system ships MANUAL, and each chip Isao prints is one system that
starts doing itself.

## The ladder, as it stands today

Each rung is a system that already has both halves written:

| chip | before | after |
|---|---|---|
| RANGEFINDER | read the distance off the reticle | the HUD prints it |
| WIND VANE | read the flags, hold off by eye | the drift is drawn |
| FIRING SOLUTION | hold over by feel | the reticle marks the hold |
| TURRET TRACKING | aim each sentry by hand | `pickTarget` + `slew` |
| TURRET FIRE CONTROL | pull the trigger | `canFire` + `autoGunner` |
| TANK AUTOPILOT | drive it | the directive picker |
| DRONE 2 | one Isao | `spawnAssistant` |

Seven rungs, and six of them are code that exists — the arc is mostly a
matter of GATING what is currently on by default, and pricing it.

## What makes it a good spine, and the risk

**Good:** it makes the early game legibly harder without a difficulty
slider, it gives biomass a sink that changes how the game is PLAYED rather
than how much damage it does, and it explains the drone diegetically —
you are not buying an upgrade, you are watching a machine learn a job.

**The risk, named:** a game whose arc is "it plays itself more and more"
has to make sure the automated version is not simply BETTER. The tank's
manual/auto seam already has this shape and the answer there was that
manual is more capable and auto is cheaper in attention. A chip should buy
ATTENTION, not performance — the sniper's firing solution should be what a
good shot could have worked out, arriving faster, not a shot they could
not have taken.

## Open questions for the operator

- Are chips per-RUN or permanent across a planet? (The rank ladder
  survives the hull; the tower unlocks do not survive a run.)
- Does a chip cost biomass on the debrief, or a Terraformer wave-clock
  slot, or both?
- Can a chip be turned OFF? A player who wants the manual version back is
  a player who has understood the game, and refusing them is odd.
- Does the sniper belong in the campaign at all, or is it a mission type?
