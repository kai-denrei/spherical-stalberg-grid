# Playtest to-do — operator, 2026-09-01

Four issues from a real device session. Filed, not fixed. Written with enough
code detail that whoever picks one up does not have to re-find the seam.

Common thread worth naming before the list: **three of the four are the game
putting things in front of the player** — chrome, messages, and modes. The
board has grown a lot of surface this month and none of it has been through a
subtraction pass. The last time subtraction was used deliberately here (allies
removed from TD, 2026-08-24) it fixed the problem outright. That is probably
the right instinct for all of items 2–4.

---

## 1. Build placement is unresponsive from orbit

**Symptom (operator):** "building mode from orbit is not very responsive,
sometimes clicking a buildable spot does not work at all."

**Where it lives:** the tap-vs-orbit discrimination and the placement raycast
in `src/td-tab.js` — `pointerdown`/`pointerup` on the build camera, then
raycast → `cellIndex` → `placeError(ci)` → shop radial.

**What to look at, in order:**

- **Tap vs drag threshold.** Build mode uses drag-to-orbit and tap-to-place on
  the same pointer. If the threshold is in raw pixels it will behave
  differently on a phone (higher DPR, shakier finger) than on a trackpad. A
  tap that moves 6px is still a tap to a human.
- **What the ray actually hits.** Towers mount on *wall tops*, and the frontier
  wall tops are painted dim to advertise exactly that. If the raycast targets
  the floor mesh, or the first hit is a decoration (portal cloud, orb, debris,
  the Heart), a legitimate wall-top tap silently misses. Log the hit object
  name on a failed placement before changing anything.
- **`placeError(ci)` failing silently.** A refused placement should always say
  why. The radial has `flashShopNote` for exactly this; if the tap never gets
  as far as opening the radial, the player gets no feedback at all — which is
  indistinguishable from "the game ignored me".
- **Camera distance.** Free-orbit build lets you get far enough out that a cell
  is a few pixels. There may be a zoom range where placement is technically
  working and practically impossible.

**Verify with a probe, not by feel.** Something like `?tapprobe=1`: synthesise
taps across a grid of screen points at a known camera distance, and report how
many resolve to a placeable cell. The failure is intermittent, which is exactly
the kind of thing hand-testing reports wrongly.

---

## 2. The HUD is too busy

**Symptom (operator):** "still way too busy on the HUD."

Not a bug — a design pass. It has accreted: score/best, biomass and multiplier,
hearts, wave counter and sector, the next-wave preview strip, the tower toast,
the objectives row with Isao's status line, the strike/launch console, the
radar, the throttle lever, the two thumb clusters, the mode chip, the ☰ menu.

**Suggested approach:** decide what must be visible *while driving* versus what
belongs in build mode or behind the menu, and cut on that axis rather than
shrinking everything. `body.playing` already exists and already hides chrome
per-frame based on game state — that mechanism is the lever, and it is
under-used.

Worth measuring first: `?layout=N` prints every HUD box and every overlap.
Start from the rectangles, since headless will not lay out below ~500px and
crops instead (a lesson this repo has already paid for twice).

---

## 3. Isao's messages crowd the view

**Symptom (operator):** "the messages from Isao now crowd the place, always
need to dismiss messages that cover the view."

**Where it lives:** `showIntro` / `introEl` (`#td-intro`), the brief queue in
`src/isaobriefs.js`, and `showToast`/`#td-toast`.

**The actual defect is that they are modal and manual.** A status message from a
drone should not require an acknowledgement, and it should not sit over the
board. Two things to decide:

- Should Isao's lines auto-expire like toasts, rather than waiting to be
  dismissed? Almost certainly yes for anything that is not asking a question.
- Should they move out of the play area entirely — into the objectives row,
  which already carries `isaoLine()` — so they never occlude the board?

Note the briefing modal is legitimately modal (it teaches, once, and is
dismissed to begin). Isao's running commentary is not the same thing and should
probably not share the mechanism.

---

## 4. Switching views is too hard — simplify to one or two

**Symptom (operator):** "switching views is too hard… maybe on mobile a larger
button to switch view, and only got 1/2, simplify."

**Current state, measured:** `toggleView()` only swaps `third ↔ orbit`, but
`setView` also accepts `pov`, `bastion` and `drone`, reachable from the GUI,
the `?view=` hook, clicking a tower, and piloting Isao. So the *cycle* is two
but the *set* is five, and which one you are in is not always obvious.

**What the operator is asking for:** on mobile, one large obvious control, and
fewer destinations. Two candidates:

- **Two views, one big button.** Keep drive (`third`) and build (`orbit`), make
  the switch a large touch target, and demote `bastion`/`pov`/`drone` to
  desktop or to the moments that summon them diegetically (clicking a tower,
  piloting Isao).
- **One view.** More radical: if build and drive are the only two states that
  matter, the mode chip already names the destination (`BUILD ↔ TANK`) — the
  view could simply follow the mode and stop being a separate concept.

The second is the subtraction option and is worth considering seriously before
building a bigger button for a control that may not need to exist.

---

## Related

- `docs/SOUND-SNAFU.md` — the audio investigation. Note the update: **sound
  works on iPhone**, which narrows the remaining failure to desktop Safari.
