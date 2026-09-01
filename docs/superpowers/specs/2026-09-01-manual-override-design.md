# MANUAL OVERRIDE — design

Date: 2026-09-01
Status: **SHELVED 2026-09-01** by the operator, design intact and unbuilt.

Not rejected — parked. The reason to hold it is in the design's own risk
section: it ADDS surface (a countdown panel, a button, an embedded minigame)
to a board the operator has just called too busy, where messages crowd the
view and switching views is too hard. Building it now would build on top of
the complaint. The subtraction pass in `docs/PLAYTEST-TODO.md` comes first;
this lands on the cleaner board. Nothing here needs rework when it does — the
open parameters were always going to be settled by play, not by code.
Scope: `src/td-tab.js`, `src/economy.js`, a new pure module, and a vendored
Kika-centroid embed.

## The change in one line

**Losing your last tank stops being the end of the run.** If the defences hold
and the biomass is there, ISAO prints a replacement hull — and while it prints
you may take **MANUAL OVERRIDE** to speed it up.

## Why this, and why now

Three loose threads close at once:

- **The Terraformer gets a job.** It currently looks like industry and does
  nothing industrial — a handsome objective marker. Manufacturing the
  replacement hull makes it load-bearing.
- **The mode-incentive backlog item is answered** (pm, 2026-08-24: *nothing yet
  FORCES meaningful switching between macro and micro*). Being dead becomes
  playing the other half of the game under pressure.
- **Kika-centroid is unblocked** (pm, 2026-08-31: it was stuck as *"a third
  missile source answering to neither of the existing two"*). As an accelerator
  it is not a currency at all, so the objection dissolves.

## The loop

```
last hull lost
   │
   ├─ can you afford it?  ── no ──►  the run ends, as it does today
   │
   yes
   │
   ▼
ISAO begins printing a hull at the Terraformer.  T seconds.
The war does NOT stop. Your towers hold, or they don't.
   │
   │   during T the player has three legitimate moves:
   │     · keep building — biomass still buys towers
   │     · MANUAL OVERRIDE — calibration, higher score cuts T
   │     · watch
   │
   ├─ the Heart falls first ──►  the run ends
   │
   ▼
the hull completes, drives out, DEPLOY as normal
```

## The rules

**Price is BIOMASS, on an escalating curve.** Not score. Score is a readout —
spending it costs nothing you can feel. Biomass competes directly with towers,
so the price is *retroactive*: the question it asks is **"did I overbuild?"**,
answered by a decision made twenty minutes earlier. Escalation is what carries
"one last chance" — sooner or later you cannot pay, and you can see it coming.

**The war continues.** Non-negotiable. If the wave freezes, the entire
tension — *can my defence hold without me?* — evaporates and this becomes a
progress bar.

**Building stays available.** This is the load-bearing decision, not the
printing animation. If the answer to *"what do I do while it prints"* is
"watch", the feature is dead air and a net negative.

**MANUAL OVERRIDE is optional and cannot punish you.** Its worst outcome is
the seconds you spent not watching the board. There is a floor: a poor
calibration is never worse than not playing.

**Higher score, bigger speed-up. Monotonic, no cliff.**

## Rejected: calibration as a pass/fail gate

The considered alternative was 10 rounds, 90+ or game over. Rejected for three
reasons, recorded so it is not re-proposed:

1. **It overwrites the question that makes the feature good.** "Can your
   defence hold without you?" is answered by tower investment. A skill gate
   makes towers irrelevant to the outcome.
2. **The clock has no good answer.** Modal freezes the wave and kills the
   tension; non-modal means a precision puzzle while the Heart is eaten
   off-screen. Both are bad, and a mandatory minigame forces the choice.
3. **It decides runs on an orthogonal skill.** A player good at driving,
   aiming and building loses to centroid estimation.

The accelerator keeps all three options live and scales smoothly instead of
falling off a cliff at 89.

## Why the name is right

The standing rule is **"nothing the player builds is built by the player"** —
ISAO takes the orders, travels and prints, and that separation *is* the
mechanic.

MANUAL OVERRIDE is the single moment that rule breaks. The player's hands go
onto the machine, once, when everything is about to be lost. If it ever becomes
routine it stops meaning anything — which is an argument for keeping it to this
one situation and never adding a second use.

## Architecture

Follows the standing line: **a pure decision module plus a thin effectful one.**

**`src/override.js` (new, pure, Node-tested)**

```
resurrectionPrice(n, base)      → biomass for the n-th resurrection (escalating)
canResurrect(biomass, n, base)  → boolean
speedUp(score)                  → 0..1, the fraction of T removed; monotonic,
                                  floored at 0 so a bad run never costs time
printSeconds(base, score)       → the resulting T
```

All are functions of their arguments alone — no clock, no rng — so the curves
can be tuned and asserted in Node rather than felt out in a browser.

**`src/td-tab.js`** gains one branch in `loseGame` and a print state. The state
machine is ISAO's existing `queued → travel → build(dur) → done`, which already
derives duration from price via `buildSeconds(cost)`.

**The Kika embed** vendors as the two existing minigames did — deep-link plus
same-origin phase polls, service worker neutered. Source:
`kai-denrei/KikaCentroid`. It needs a `window.__kika` bridge upstream to report
its score.

## What the player sees

- **`MK-CX DOWN`** as today, then instead of the lose modal: **`ISAO IS
  PRINTING — 18s`**, counting down, with the price paid shown.
- **A `MANUAL OVERRIDE` button** on that panel. Taking it opens Kika; the
  countdown keeps running and visibly *jumps down* when the score lands, so the
  reward is legible at the moment it is earned.
- **The HUD keeps the wave and heart readouts live** — the point is that you
  can see the thing you might lose.
- The hull materialises on the Terraformer's pad and drives to camp.

## Open parameters — all needing play, not code

| Parameter | Notes |
|---|---|
| **Baseline T** | How long the towers must survive unaided. Too short and there is no tension; too long and it is a punishment. |
| **Price curve** | First resurrection cheap enough to feel like a reprieve, third expensive enough to be a real decision. |
| **Score → speed-up** | Its shape decides whether MANUAL OVERRIDE feels worth leaving the board for. |

These are the numbers that decide whether the feature is good, and none of them
can be settled by writing code.

## Build order — and I would hold to it

1. **The loop with no minigame and no print animation.** Hull loss → pay → wait
   T → deploy. Playable, and it answers whether the *mechanic* is good.
2. **The price and duration curves**, tuned by playing.
3. **MANUAL OVERRIDE** — the Kika embed and the speed-up.
4. **The piece-by-piece print reveal** last. It is the fun part and the least
   likely to be right first time, and the mechanic works with the hull simply
   appearing.

Building 4 first is the tempting mistake.

## Risks

- **Dead air** if building-while-dead is not genuinely useful. Mitigated by
  keeping biomass spendable and the board visible, but worth watching in
  playtest: if players just stare, the feature has failed regardless of polish.
- **Death stops mattering** if the price is too soft. The escalation is the
  whole defence against this.
- **Kika's own difficulty is unknown here.** Its scoring range needs measuring
  before `speedUp()` can be shaped — otherwise the curve is guesswork over a
  distribution nobody has looked at.
