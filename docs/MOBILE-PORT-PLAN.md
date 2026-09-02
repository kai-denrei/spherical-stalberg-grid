# Mobile port — plan, not a mini version

Operator, 2026-09-02: *"it must go beyond being a mini version … I rely on so
many keyboard shortcuts to build, to switch view, to upgrade, which are not
available on mobile. The HUD simply ported is much too busy. Without touching
the base game on desktop as it is intended to be played."*

This is a plan. Nothing here is built. Every phase ends in a probe, because
this repo has already learned that mobile "verified by feel" is not verified
(`ROADMAP.md`: headless clamps to ~500px and crops; `?layout=N` prints
rectangles; a real-device pass has *never happened*).

---

## 0. The constraint that shapes everything

**Desktop is finished and must not move.** So the port cannot be a pile of
`@media` overrides on the desktop HUD — that is exactly what produced "simply
ported is much too busy". It has to be a **second shell over the same game**.

The game already half-has the seam this needs. Continuous input arrives as a
state object (`keys.fast/slow/left/right/laser…`) that the phone pads *already*
write into; discrete actions are functions (`openShop(ci)`, `orderTower`,
`orderUpgrade`, `toggleBuild`, `setView`, `toggleArm`/launch, `hack`, the auto
directives). Formalise that as an **intent surface** td-tab exposes, and build
the mobile shell as a client of it — a separate module, its own stylesheet
scoped under `body.mobile-shell`, mounted only when the device says so.

```
              ┌──────────────── the game (td-tab.js) ────────────────┐
              │  sim · render · rules · HUD data · intents API        │
              └───────────────┬──────────────────────┬────────────────┘
      keyboard / mouse ───────┘                      └─────── mobile shell
      (existing, untouched)                           (new module, own CSS,
                                                       own DOM, own gestures)
```

Detection: `(pointer: coarse)` **and** `innerWidth < 900`, overridable by
`?mobile=1|0` and a ⚙ toggle, persisted. The existing thirteen phone pads and
the thumb strips are what the shell **replaces**, not extends.

## 1. What the keyboard is actually doing

Every shortcut, and what it *means* — because the port replaces meanings, not
keys:

| keys | meaning | how a touch port does this |
|---|---|---|
| W A S D / arrows, Q E, dbl-W | steer, throttle, cruise | **tap-to-go** on the nav graph (the game already has auto directives and a graph walker); a hold-to-ram thumb; no virtual stick |
| SPACE / SHIFT | shell / plasma | one fire thumb; plasma on hold; autofire already exists (`autoSecondary`, `autoGunner`) and should default **on** |
| 1 / 2 / 3, M, V | orbit / pov / third, map, cycle view | **the view follows the mode.** Two modes, one big button. `pov`, `bastion`, `drone` only where they are summoned diegetically |
| B, tap a cell | build | the tap **is** the command: radial at the finger, on the cell, in build mode |
| U | upgrade | long-press a tower → upgrade; auto-upgrade toggle for the rest |
| H, ESC | hint, pause | ≡ menu (exists) |
| X | hack the relay | a contextual button that appears in range (it already appears; make it the only thing that does) |
| launch console | orbital strike | arm/target/launch as a three-tap on the radar's own console, not a separate panel |

The design consequence: **mobile driving is semi-autonomous.** Tap where to go,
the tank goes; the thumb rams or fires. This is the single largest departure
from desktop and the single biggest reason the port is not a mini version. It
is also a *ruling* — see the open questions.

## 2. What SOTA touch practice says, applied here

Not citations — the practices that survive across the good ports:

1. **Mode-first.** Two modes, each with ≤ 4 targets on screen. DRIVE (third-
   person, radar, fire/ram) and BUILD (orbit, tap-to-place, queue). The mode
   button is the one control that is always big. View is not a concept.
2. **Thumb zones.** Continuous controls in the bottom corners; nothing
   actionable in the top third except ≡; targets ≥ 48px; landscape first
   (a sphere TD wants width). Portrait is a stretch goal on the same intents.
3. **Context beats chords.** A radial at the finger replaces every shortcut
   that was "select then key". Long-press = the secondary action. No swipes
   for anything critical; no hover; nothing that needs a second finger except
   pinch.
4. **Reduce continuous input.** Virtual sticks are how most ports die. The game
   has a nav graph and directive AI — use them. Steering is a desktop pleasure.
5. **Auto-aim is the norm, not a cheat.** Mobile shooters aim for you and let
   you decide *when*. Default autofire on; the thumb is timing.
6. **HUD by subtraction, per mode.** DRIVE: hearts, hulls, biomass, wave clock,
   radar with the sensor, one drone line. BUILD: biomass, queue, unlocks.
   Everything else behind ≡. `body.playing` already hides chrome by state — it
   is the lever, under-used (PLAYTEST-TODO §2).
7. **Messages are captions, not modals.** Isao's lines auto-expire in the
   objectives row (PLAYTEST-TODO §3). The briefing stays modal; it teaches once.
8. **Platform hygiene.** `touch-action: none` on the board, `100dvh`, safe-area
   insets (partly done), orientation guidance, Screen Wake Lock during play,
   `navigator.vibrate` where it exists (Android; iOS Safari has none — every
   haptic needs a visual twin), the PWA/service-worker item from the roadmap
   using the pattern already solved in `~/Dev/blueprint-to-life`.
9. **A performance tier, measured.** Coarse pointer → wormhole 256@24, bloom
   half-res (exists), point budgets. The new fps readout is the instrument.
10. **Verify with probes, then a device.** Headless cannot lay out below
    ~500px, so: rectangles from `?layout=N` at 390×844 both ways, a
    `?touchprobe` that synthesises tap / long-press / drag sequences against
    the shell and asserts the intents fired, and then — finally — a real
    device pass with a checklist.

## 3. Phases

Each phase is small, has a probe, and leaves desktop byte-identical.

| # | phase | done when |
|---|---|---|
| 0 | **Instrument.** `?layout` at phone sizes in both modes; an intent log (`?intents=1`) that prints every intent the game receives with its source | the current phone chrome's overlaps are a list, not an impression |
| 1 | **The seam.** td-tab exposes `intents` (a small object: keys, the discrete actions, state getters); desktop keeps its handler and calls nothing new; detection + `body.mobile-shell`; old pads hidden under the shell | `?mobile=1` on desktop shows an empty shell over an untouched game; `?mobile=0` on a phone shows desktop exactly |
| 2 | **DRIVE mode.** Tap-to-go, hold-to-ram/fire thumb, directive wheel (wander/ram/avoid/home/portal), the mode button, third-person camera; autofire default on | `?touchprobe` drives the tank to a tapped cell and fires; the HUD shows only the DRIVE set |
| 3 | **BUILD mode.** Orbit view, tap → radial at the finger, long-press → upgrade, one-finger drag orbits, pinch zooms; the tap-vs-drag threshold in **DPR-scaled** px; a refused placement always says why (PLAYTEST-TODO §1) | `?tapprobe` resolves ≥ 95% of synthetic taps on wall-tops to a placeable cell |
| 4 | **HUD subtraction + captions.** Per-mode HUD sets; Isao's lines as auto-expiring captions | `?layout` reports zero overlaps at 390×844 landscape in both modes |
| 5 | **Modals for the phone.** Briefing, sector debrief, campaign, variables modal — one column, scrollable, thumb-reachable buttons | each opens and closes by touch in the probe; nothing off-screen |
| 6 | **Hygiene + perf tier.** touch-action, dvh, wake lock, orientation prompt, vibrate-with-visual-twin, the perf tier, the PWA hook | fps readout on a phone-class budget; the tier is a table, not a feeling |
| 7 | **Device pass.** A written checklist, on a real phone, in landscape then portrait | the checklist is filed with results; portrait is decided, not assumed |

## 4. Decisions the operator owns (not the plan's to make)

- **Tap-to-go vs virtual stick.** The plan recommends tap-to-go; it changes the
  feel of the tank from "driving" to "commanding". If manual driving is part of
  the mobile fantasy, phase 2 gets a stick and the plan gets worse.
- **Landscape only, or both.** Landscape first is safe. Portrait costs a second
  layout of every mode.
- **Which views survive.** The plan says two (view follows mode) and demotes
  `pov`/`bastion`/`drone` to their diegetic moments. `drone` (piloting Isao) may
  deserve a mobile home of its own.
- **Autofire default.** On for mobile, off for desktop — the two shells may
  legitimately differ here, and that is the first place they would.
- **Haptics.** Worth doing on Android; invisible on iOS. Decide whether to
  bother.

## 5. What this does *not* do

It does not redesign the game. The rules, the economy, the waves, the towers,
the drones, the debriefs are identical on both shells — the sim does not know
which shell is talking to it. That is the whole point of the seam, and it is
also the test: a run on the phone and a run on the desktop with the same seed
and the same decisions produce the same `SIMRESULT`.
