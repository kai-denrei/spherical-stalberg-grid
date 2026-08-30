# Dev Log

Newest first. Each entry: what landed, then how it works, for programmers.
Demo links assume `npm run serve` (port 8144) or the
[Pages deploy](https://kai-denrei.github.io/spherical-stalberg-grid/).

---

## `3d9ca55` — Demolition is permanent

Field report: pushing toward the server when a round ends, the sector
reassembly sometimes sealed the tank inside solid rock — `applySector`
rebuilds every round's tags from the full world, which quietly regrew
every wall the player had blasted.

The operator proposed the mechanic and it shipped verbatim: **breached
walls stay breached.** Every cell opened by a shell or a strike joins
`breachedCells`, re-applied on every reassembly *before* the reachability
seal — deliberate ordering, because a breach tunnel that connects to the
open network is thereby reachable and survives the seal on its own merit.
A new world clears the set; the server's cell and tower-anchored walls
stay unbreachable.

Persistence alone left one entombment path: a tank parked on a
*later-band* lane it reached through a breach — the band gate reseals
that ground regardless. So the safety net: after each reassembly, a tank
standing on BLOCKED redeploys beside the heart with a REDEPLOYED toast
that says why it moved. The frontier can shift; it cannot bury you.

---

## `10eb089` — The bubble, and the catalogue's budget

**The energy shield.** A fourth pickup (dome orb — it joins `PICKUPS`, so
the viewer's Neutral group and the glossary describe it without being
told): 12 seconds of a dot-shell bubble over the hull — a fibonacci
ellipsoid of 280 additive points, one draw call, bloom doing the energy
read. Touch damage bounces off while it holds (the impact still shoves —
armor stops damage, not physics), the shell flashes on each absorbed hit
and blinks urgent through its last quarter. Regrows like the other
consumables. One measurement mattered: the bubble is sized off the CELL —
the first cut rode `unitScale`, which carries the mkcx normalization, and
came out five cells wide.

**The viewer goes wild.** Every `DOT_SHAPES` entry takes a density factor:
game at d=1, unit viewer at **d=4** — one unit on screen at a time can
afford what a crowd cannot. The shellback's log spiral finally reads as a
nautilus at 1600 dots. Nothing was hand-added for the new roster: the
three invasion enemies and the shield orb all arrive in the viewer
through the derived lists.

---

## `36521a1` — Three ways to be dangerous

The invasion phase (waves 13+) gets its own roster, one behavior each:

- **SAUCER** (wave 13) — the lab's ufo shape, freed when the bacterium
  took scoutufo's slot. Rammable fodder, but `jink` stacks a second,
  faster weave on the erratic bursts — a dogfight, not a walk.
- **SHELLBACK** (wave 14) — the lab's seashell spiral under the wave
  animation. The tactician: it holds at the *edge* of tower coverage
  until three minions arrive as cover, then bursts through with them at
  1.9× — the first enemy that reads your towers. (Geometry lesson: a log
  spiral's mass sits in its outer whorl, so the cloud is centroid-
  recentred and pulled to 0.78 or the solid core floats beside the shell
  and the dots read as dust.)
- **PHANTOM** (wave 15) — the ghost shape under optical camo: a ~0.14
  opacity haze with a brief shimmer of presence every ~6 seconds, and the
  radar shares the same decloak window — no window, no blip. Non-rammable
  on purpose: the danger klaxon becomes the warning for the thing you
  cannot see.

The roster tests were pinned to 12 and failed exactly as the deban lesson
predicted; they now assert relationships (every intro ↔ spec ↔ tint,
`typesByWave` caps at `INTROS.length`) instead of counts.

---

## `49a8b2b` — Three protocols

The relay's breach bar grew tabs: HDT (the circuit duel) is joined by
**BRIDGE** (hashiwokakero) and **SHIKAKU** from the operator's
`pazorukore` engine. The second vendor was cheaper than the first:
pazorukore is vanilla ES modules with no build step — our own idiom — so
the vendor is a straight copy of `index.html + styles.css + src/` into
`minigames/pzk/`, with the manifest link stripped and `initPWA` stubbed
(no service worker inside an iframe). Game selection is its own `?game=`
query; the futuristic skin ships as-is, which is what "same look and
rendering" meant.

Win detection stays the same-origin read with one branch per engine:
`__cx.game().phase` (WON/LOST) for the duel, `__pazoru.phase === 'solved'`
for the puzzles — which cannot be lost, only abandoned, so ABORT is their
only exit without the prize. Any protocol's win patches the firmware.
`?hack=hdt|bridges|shikaku` boots each directly; both puzzles verified
rendering in-frame.

---

## `4703bca` — The vault

Two placement cuts died in the field ("inside a wall", then "ON a wall")
before the operator specified the pattern outright, and it is better than
either attempt: **carve an empty chamber at the true antipode, confirm it
is clear, then seat the server in its centre.**

So the world build now carves a floor disc — every cell within two hops
of the literal minimum-dot cell, 13 cells, five across — into the FULL
world, ringed by whatever rock was already there. The vault is exempt
from both of `applySector`'s gates (band and reachability), so it renders
as an open room inside the rock from round 1. Unreachable at first *on
purpose*: walls blast open, and a vault you have to breach is the fiction
working for us. Its cells keep `distToHeart = -1`, which quietly keeps
nav, rewards, and portal placement out of it. The `?server=1` probe now
prints `chamber=13/13 clear ground=OPEN` — the "confirm before seating"
step, made permanent.

Also: the dev-log copy affordance became a small ⧉ icon (token) plus 🔗
(deep link to `?devlog=1`) — the whole-label click was the wrong
affordance.

---

## `e2c1d31` — The relay stands at the pole properly

Field report: "the server spawned inside a wall, and I cannot find how to
interact with it." Three faults, and a design fact discovered on the way:

- **Placement.** The pure minimum-dot cell was solid rock. The
  current-round walkable minimum sat at dot 0.46 — nowhere near a pole —
  because round 1 seals everything beyond the inner sector. Measurement
  settled it: the FULL world's lanes reach dot **−0.987**, so the server
  now stands on the full-carve cell nearest the true antipode — a real
  lane that a late round will reveal. The far pole is end-game territory
  by the game's own band-reveal design; the server leans into that
  instead of fighting it.
- **The lift.** While its band is sealed the relay is a landmark mounted
  ON the high ground (lifted by `wallHeight`); `syncServerLift` settles
  it onto the lane floor the round its band opens.
- **The silence.** `placeError` suppressed the tower radial on the
  server's cell — correctly — but nothing replaced it, which read as
  "cannot interact". Tapping the server or any neighbour now always
  answers: hack when awake, the one-per-round notice when patched,
  "beyond the frontier — push the rounds" while sealed, "drive closer"
  when open but undiscovered.

---

## `a328217` — The phone gets flicked

Three mobile rulings from live testing:

- **The NEXT WAVE chip is transient.** Mid-wave it read "clear the field"
  — permanent furniture stating what the board already shows. It appears
  at wave-clear with the countdown, leaves at spawn.
- **The console folds vertical.** Safety over readout over 発射, 128px in
  the right column under the radar, instead of a 296px bar across the left
  column. The lane moves left below the chip; the hack button docks under
  the console; the SitRep compacts to die above the throttle. Probe: zero
  overlaps.
- **Orbit is explorable.** `buildFollowTank` yielded only while a finger
  was DOWN — and phones explore in flicks, so every lift let the
  off-frame tank yank the camera home ("impossible to explore"). A pan
  now *suspends* the follow; driving again (steer, keys, cruise) or an
  explicit recenter re-arms it. The duty survives exactly where it is a
  duty: while you are actually driving from top-down.

---

## `1c9f81a` — THE SERVER, and the first hack

Something new: at the heart's exact antipode (minimum-dot cell, measured
−0.999) stands a server — the `server_ceb25b9d` GLB through the standard
fit pipeline, two cells tall, **invincible**: `breachWallCell` refuses its
cell (no strike or shell opens it) and `placeError` keeps towers off it.

Drive within three cells and it is FOUND: a pulsing HACK SERVER button
joins the console rail. The hack opens a full-screen breach overlay — the
dial-up handshake plays, six seconds of negotiation being exactly the
fiction of connecting — around the **HDT circuit duel** from the
`hacking-mini-games` repo, vendored as a static build under
`minigames/hdt/` (relative base, PWA bits stripped so it cannot register
a service worker at our scope).

Two integration moves carried the whole thing:

- **The deep link is a filename.** The minigame's router parses digits
  out of the URL path; serving the built index as `3.html` boots straight
  into game 3. Zero patching of a finished game.
- **Same origin beats a protocol.** The iframe is ours, so the parent
  simply reads the duel's own state — `window.__cx.game().phase` on a
  600 ms poll. WON patches the firmware: the next tower unlocks ahead of
  its wave gate (`unlockedTowerKeys(wave + hackedUnlocks)`). LOST drops
  the connection; the relay resets for another try. One successful hack
  per round; unlocks persist for the run.

`?server=1` reports antipode dot + async placement; `?hack=1` boots the
overlay directly — verified headless with the duel rendering in-frame.

---

## `c4530c0` — Consumables regrow

Health and heart-regen orbs respawn: each consumed one schedules a single
replacement on the far field 50 s after pickup, through the same `whim()`
stream and the same far-field placement rule as the opening spawn — so a
replayed seed regrows identically. Power stays one-shot on purpose: a
permanent speed buff that respawned would be a farm, not a reward. A new
board clears the queue.

---

## `7523a30` — Line of sight, the third heat gauge, and the lane

**The railgun respects walls now.** `losClear` samples the chord from the
mast's cell every ~0.45 cells; any BLOCKED cell along it — other than the
tower's own, since the mast stands ON high ground — refuses the shot, and
the sniper takes the nearest *visible* enemy instead. A shot along a wall
ridge is blocked by the ridge, which is exactly what "not through walls"
means for a gun at wall height.

**Secondary heat, attempt three, right mechanism.** Attempt one lerped a
material that `mergeByMaterial` had shared with half the hull. Attempt
two cloned it and drove emissive — provably changing, still invisible at
gameplay distance (operator confirmed on `1c834a26`). The realization:
the cannon's gauge is legible because it is a **dedicated
MeshBasicMaterial sleeve**, not the model's own PBR. The secondaries now
wear the same instrument — a small sleeve per tube, one shared material,
driven by the same lerp that provably works for the cannon. Lesson filed:
when a working reference exists (the cannon), copy its MECHANISM before
inventing a subtler one.

**The announcement lane.** SitRep, NEW THREAT/TOWER cards, and toasts
move off the sightline into one shared lane — desktop left rail, phone
right column — so they never fight each other and never cover the tank.
Callouts, the combo, and the danger warning stay centred on purpose. The
rectangle probe tracks the card now; zero overlaps at every width the
phone media block covers.

Also: the dev-log build token is click-to-copy, the affordance the
retired corner badge used to carry.

---

## `d2a1efa` — The wreck had agency

The operator's bug report — "respawned on the same spot with RED life
indicators, still ramping up the RAM ×" — decoded into one missing state:
**there was no down-state.** Through the death hold the invisible wreck
kept everything: auto kept driving it, it rammed for combo and pay and
rank, enemies touching it cost a second life (the red accents), and it
grabbed pickups. The "same spot" was wherever the ghost had driven itself
before the respawn timer fired.

`playerDown` now gates motion, touch/ram, the danger warning, both
weapons, the auto gunner, and pickups; it sets in `destroyPlayer` and
clears on every restore path. The ram combo dies with the hull — and at
`loseGame` too, where it used to hover over the last-light modal.

Also: the secondary bolts were `BoxGeometry` — the operator's "too
blocky" was literal. They are round tracers now, the idiom every tower
shot already speaks: hot 7px head, three cyan ghosts strung behind along
the flight line, per-bolt geometry disposed on kill.

---

## `69a4c6c` — Heat that glows, callouts that switch tongues

The secondary tubes clicked but never changed color on the mkcx model.
The root cause was worth the note: `mergeByMaterial` can hand the gun
meshes a material instance **shared with other hull parts** — heating the
shared instance tinted half the deck by an invisible hair — and a color
multiply on a dark textured PBR gun barely shows regardless. The guns now
carry a private clone of their material (shared between the pair only,
stashed as `userData.gunHeatMat`), and the tab drives its **emissive**
channel with heat — faint cyan to `0xff2200`, intensity 0.3 → 2.0 — which
is what the bloom chain amplifies into an actual glow. `?laser=1` now
reports where the heat lands (`GUNHEAT mat/col/emi/int`), because a color
no one can see is exactly the bug a probe must catch — position-only
lessons apply to materials too.

Also: the reckless callouts alternate languages — すげ〜！ ヤバイ！
接近だ！ 接近過ぎ！ interleaved with the English in the deterministic
rotation.

---

## `e34b4d4` — The HUD is an instrument panel now

Preceded by `fe71108` (three tweaks): every autopilot directive except RAM
and AVOID now carries a proximity-weighted flee vector away from the solid
tier — filed against seek-home driving the hull through a barbed; the
secondary's lockout is audible (a dry-fire click — the reload sample's
first transient pitched up, rate-limited by the manifest's `minInterval`
while the play call fires every frame) and legible (the red drains out of
the pad button bottom-up as the tubes cool, 4% steps); CORONAVIRUS → VIRUS
and SOLVING TORUS → THORUS, single-sourced in `INTROS`.

**The rework.** The five-line text block became a CRT panel in the
established console family — subtler than the manual and SitRep, because
this one never goes away. The design rule: three brightness tiers for
three reading distances — vitals bright (red hearts with dim sockets,
cyan tank HP, shells going red at zero), resources mid (orange credit,
the wave numeral largest on the panel), meta/objectives dim, alerts a
transient amber row.

Two ideas carry the rest:

- **Control state lives on the control.** The MANUAL/AUTO line left the
  panel; the AUTO button is amber while engaged and wears its directive's
  name. A state line you read *next to* a button you press was the same
  fact twice.
- **Grouping by tint, not by markup.** Camera buttons cyan (the tank's
  color), system buttons green. No separators, no extra width — the mode
  row still fits a 390px phone, which was the stated preoccupation. The
  phone panel tightens to hold all five rows (alert included) above the
  NEXT WAVE chip; the rectangle probe reports zero overlaps.

---

## `1e4d2f7` — Feel: splash, heat, bragging rights, and a report

Four commits in one playtest cadence (`92aa458`, `577f07a`, `1e4d2f7`):

**Shell splash, mortar class.** 1.6 cells (was 0.95) with falloff — 0.75
inside the half-radius, 0.4 to the edge — and the strike's ring language
at shell scale so the splash is READ, not inferred.

**The secondary's heat, on the pad.** The gun tubes already glowed; now
the laser button runs the same cycle — white → orange → red, blinking
through the lockout. Styled on band *changes* only; per-frame style writes
on a button are layout noise.

**Callouts + the ram combo.** Deterministic rotation (a counter, not
`Math.random`) through RECKLESS!/CLOSE CALL!/TIGHT!/FEARLESS! for
hands-on kills of solid units at arm's length; PROTECT THE HEART! and kin
for kills in the heart's yard, 6s-gated because sieges kill by the dozen;
STREAK ×N every fifth consecutive kill, dying with a leak like the streak
itself. The RAM ×N counter climbs a tier every 10 — size and color, white
through flickering magenta at ×50 — on a 4s window.

**The sniper fires a round, not a ray** (`577f07a`). The beam pair read
as a laser. Damage still lands the same frame, but the visible shot is a
fat slug crossing the line in 0.13s with the impact rings landing when
the slug does.

**End-of-wave SitRep** (`1e4d2f7`). The cleared toast became a report:
kills by source, a tint-coded histogram by type, kill tempo as a
block-glyph sparkline (3s bins), points + clear bonus + peak multiplier,
rams, leaks in red. Non-blocking, tap to dismiss, outranked by the next
telegraph. `?sitrep=1`, `?callout=1` render fabricated states through the
real pipeline — both PIN their displays, because under a virtual-time
budget every removal timer and every 1.2s animation outruns the first
painted frame.

---

## `ee47c12` — The field manual

One CRT screen before the tutorial: green phosphor, scanlines, and eleven
lines that are each a rule of play rather than a paragraph — the heart,
ramming (with the one red line: **do not ram solid elements**), shells,
portals as the win condition, the score's tank bias, insignia, the
orbital-strike ritual, cruise, and building. Below the fold, a keyboard
table that renders only where a keyboard exists (coarse-pointer paired
with a width clause, per the house rule) — touch loads get the thumb-zone
line instead.

Dismissal is anything: tap, or any key — ESC included, captured before
the pause menu can react. The sim is frozen while it is up, and whatever
was queued (tutorial on a first load, briefing otherwise) runs on
dismissal. `?intro=1` forces it under debug hooks for screenshots;
`?intro=0` skips it.

---

## `982a5a9` — The brass before the boss, and an alarm worth believing

Two sounds, one doctrine: a cue should hand over to the thing it warns
about, not stop dead before it.

**The boss omen.** `boss_tension` (21.4s of distorted brass, kept at full
length) starts the moment the remaining lead to the boss wave crosses 10
seconds. The boss wave is *derived* — `INTROS` × `ENEMY_SPEC.boss`, never a
hardcoded 12 — and the lead uses the same math as the NEXT WAVE countdown:
`waveIn` once armed, `waveGap − interClock` in the gap. From a cleared
field the entire lead is `waveGap`, so at the default 7s gap the omen owns
the whole pre-boss window and is still swelling as the knot clears the
gate. Once per run.

**The danger klaxon.** `danger_alert` (1s) plus a CRT-red ⚠ overlay —
phosphor bloom, scanlines, RGB misconvergence, coarse flicker (off under
`prefers-reduced-motion`) — the first time a dangerous (non-rammable)
enemy closes within 3.5 cells of the tank. **Once per wave, by design**: a
constant siren is the alarm you learn to ignore, and this one means STOP
TOUCHING THAT.

One probe lesson re-learned: `?danger=1` originally forced the warning
and let the real 1.9s hide-timer run — under a virtual-time budget the
timer fires before the first paint, so the screenshot showed nothing and
the overlay was fine. The forced path now PINS the overlay; the game path
keeps the timeout.

---

## `03f1d1a` — Points are not credits, and the top of the screen earns its keep

**The scoreboard** (`src/score.js`, pure + tested). Credits buy towers; the
score is the bragging number, and it leans the other way on purpose: tank
kills score **×3** (the economy already pays them ×2 — the leaderboard
belongs to whoever fights hands-on), rams keep their premium, and every
kill scales with how swarmed the field was when it landed (+4% per live
enemy, capped ×2 — pressure is the skill being measured). Wave clears pay
`100 + 25w`. BEST persists in localStorage and updates **live** when
beaten, so a crash can't eat a record; the lose modal reports the final
score and calls out a NEW BEST.

**Four layout rulings in the same pass:**

- The rank sprite over the hull is gone — in third person it hung directly
  in front of the camera, blocking exactly what the player steers toward.
  The insignia (22 px) now rides the HUD's new headline: `SCORE · BEST ·
  [badge] RANK`.
- The launch console is promoted to the top — centred under the mode row
  on desktop, third slot of the left column on phones. A stale mobile
  `bottom:` pin fought the new `top:` and stretched the console 500 px
  tall; the `?layout` rectangle probe caught it (headless lays out wide
  and crops, so rectangles are the only trustworthy phone check).
- The mobile NEXT WAVE chip sat at `top: 8px` centred — written straight
  over the mode row on a 390 px screen. The top now stacks as a left
  column (stats → NEXT WAVE → console) with the radar keeping the right;
  the probe tracks `#td-next` now and reports zero overlaps.
- The corner build badge is retired from the game view. The DEV LOG tab
  header shows the served token (it reads `meta[name="cb"]` itself);
  `?devlog=1` deep-linking survives.

---

## `f9614fa` — Insignia the hull has to live to wear

The operator's 15-rank sheet, in-game. `src/ranks.js` is pure and
Node-tested: bronze chevrons (1–5), silver chevrons over a filling core
diamond (6–10), gold stars in a laurel (11–15); tier is `floor((rank-1)/5)`,
never stored. The one change asked for by name: **4 and 5 stars sit as dice
pips** — a 2×2 square and a quincunx — and `test/ranks.mjs` pins the rule
that pips stay *narrower* than the row of three they replaced.

Three design decisions carry the feature:

- **Only hands-on kills count.** Shells, lasers, and rams credit the
  ladder; tower and orbital kills pay credits, not respect. The ram branch
  bypasses `damageEnemy`, so it credits at the treads.
- **Gold is double-gated.** Cumulative kills follow `r(r+3)/2` (2, 5, 9 …
  135), and each gold level also wants 2 elite (non-rammable) kills up
  close — the units that hurt to touch are the ones that count.
- **The ladder dies with the tank.** `loseTank()` strips it, and the TANK
  LOST toast says which insignia went down with the hull.

One SVG, two homes: inline on the HUD's tank line (13 px, next to YOU —
where the score display will land), and rasterized through
`data:image/svg+xml` → canvas → `CanvasTexture` onto a Sprite pinned over
the hull (0.3 cells — at 0.55 it read as a map marker, not a patch).
`?rank=N` grants exactly rank N's requirements and renders through the
normal path, so layout checks exercise the real pipeline.

---

## `34e3253` — Every shot has a name, and the gate finally has a throat

**Fire identity.** Each tower's shot now *reads* at a glance: the sniper is
a hitscan railgun — a white core beam inside a lingering tint, warn rings at
muzzle and impact; the homing missile chases (steer `k = min(1, 6·dt)`
toward the live target — the HokorobiTawaa feel, a missile that *commits*);
the mortar marks its landing cell the moment it fires, swells as it drops,
and lands with weight. All non-splash hits pop pooled sparks; tracers draw
through a shared round-dot texture (a bare `PointsMaterial` renders squares).

**Keymap.** `1/2/3` = O1/T1/T3 · `M`,`O` = map · `C` = missile cheat ·
`T` = T3 · `Q/E` = throttle ± with a detent · `U` = upgrade (W drives).

**The empty portal centre — root-caused at last.** Two independent faults,
which is *why* it survived several passes; fixing either alone changed
nothing visible:

1. **A gallery artifact ported as design.** The braille-lab horizon applies
   `rotY(t·0.45)` because the *lab gallery* rotates every card by exactly
   that — the disc counter-spins to stay inside the ring, and the lab's
   comment says so. Our ring never rotates, so the same rotY spun the disc
   edge-on inside a face-on ring: an invisible line, most of the time.
2. **A brightness array indexed from the wrong base.** `stargateHorizon`
   wrote `bri[k]` with `k` starting at `i0`. The lab passes `i0=0`; the
   game passes `i0=435` (ring first, horizon after, one buffer) with a
   174-long shimmer array — every write landed out of bounds, Float32Array
   dropped them **silently**, and the first idle tick multiplied every
   centre dot to `(0,0,0)`. The constructor's colors were correct for
   exactly one frame.

The forensic lesson: three geometry probes passed while the player saw an
empty ring, because they measured *positions* — and a rotY about the
vertical doesn't shrink the y-extent, and a black dot has a perfectly good
position. The probe that caught it dumped the **color attribute** and
projected dots through the **live camera** (`?gateprobe=1` keeps both).
Verified the honest way too: parked the strike fall-cam over a forced gate
and looked — empty before, filled after.

The horizon now churns in place — alternating per-ring drift, travelling
shimmer, z-breathe — and is densified 105 → 174 dots (the lab card draws
fat gallery dots on a small canvas; at game scale 105 read as sparse).
`test/stargate.mjs` pins both faults through the *game's* calling
convention (`i0 = ring length`), not the lab's: no dark dots, disc stays in
the ring plane, radii span the throat, and the centre must move between
ticks.

---

## `0e0d7ac` — The platform has to come back

Two stacked missiles could fire back-to-back: the ready cap rationed how many
you *hold*, but nothing rationed the **cadence**. Every launch now puts the
platform out of position for 12 s (knob: *re-orbit time*), and the console
narrates the return in DeepWatch's register — `ENTERING ORBIT 43%`, amber,
safety locked until it reads 100.

Two design points worth the note:

- The cooldown gates **arming**, not the strike already in the air — the
  ritual stays intact, the tube just will not accept the next round yet.
- It runs **independently of the promotion window**: a spent platform
  repositions while the next asset charges, so the two clocks overlap rather
  than queue. Waiting 12 s and *then* 40 s would have doubled the price of
  every shot.

Also this session: silence on unbuildable cells (`58909d0` — a radial whose
every option is disabled is a wall of no; `openShop` refuses at its own door
with the same `placeError` that used to grey the options).

---

## `cb407d4` — T1 / T3 / O1, and a radial instead of a cycle

The camera system is three views and two buttons now. The cycle reads
**T1** (first person) → **T3** (third) → **O1** (orbital) on the CAM button
itself; bastion left the cycle — tower-watching was a spectator mode nobody
drove from. Nothing auto-centres: two explicit CENTRE buttons aim the orbital
view on demand (♥ = heart + whole planet, ◉ = tank up close), each switching
you to O1 if needed. One courtesy kept: the *first* orbit entry still frames
the heart, because a free camera pointed at the dark side of a planet is not
a view, it is a bug report.

**HOLD is gone** (operator call). `buildFrozen()` answers `false` forever
rather than being unpicked from every gate it feeds — the constant carries
the history, the callers stay untouched.

**WANDER became TANK-AUTO**: a small radial of six directives instead of
blind-cycling — on a phone, cycling meant tapping through five states you
did not want to reach the one you did. Picking engages auto (unchanged rule),
and the directive-pick side effects (`steerHold`, cruise-kill) nearly got
lost in the migration — the old handler's tail had them below the anchor.

**The mortar** came down (apex 3.4 → 2.3 cells) and every tracer is round: a
`Points` vertex is a **square** unless given a map, and at 12 px the corners
read. One shared radial-falloff `CanvasTexture` rounds them all.

Nine playtest notes captured in ROADMAP as the operator's list, including
the two with teeth: HK-style *chasing* homing (theirs re-seeks every frame;
ours aims once), and a cooldown-gated danger alarm (no alarm for X seconds
AND a dangerous unit within Y — a proximity alarm, not a siren).

---

## `392833b` — The launch console

The ☄ chip is retired; the strike wears the instrument it came from. Ported
whole from DeepWatch: the hazard border (a repeating-gradient
`border-image` — no image asset), the metal safety toggle with its two PNG
sprites and lit ON/OFF chips, and the chunky 発射 button:

| state | button |
| --- | --- |
| cold | grey, dead cursor |
| armed, no target | orange pulse, label **TARGET** |
| authorised | red pulse, label **LAUNCH**, press-down on commit |

The narration is DeepWatch's register: `STANDBY`, `ORBIT 41%`,
`READY · FLIP TO ON`, `AWAITING TARGET`, `LAUNCH AUTHORIZED`,
`NO TARGET / TGT CELL 0408`.

Underneath, nothing moved — same `strike.js` machine, same refusals, same
radar promotion. The ritual gained an instrument, not new rules. `syncArmUi`
runs every frame, so it writes the DOM only when a state key changes.

Bottom-centre placement: the one band both thumb columns leave free, zero
overlaps at desktop and phone widths, and it stands aside for the munition
feed with the rest of the chrome.

---

## `4d5b494` — The AoE tower is a mortar, and its shell falls like one

The head is `half-dotted-mortar.json` — the lab's authored export, embedded
verbatim (252 points, an angled tube on a baseplate). The launcher read as
generic ordnance; this is the attack, sculpted.

The arc stopped being a sine hump. Symmetric flight floats down exactly as
gently as it rises; warping the flight fraction (`u^1.35`) pushes the apex
past 60% and compresses the descent into what remains — the shell hangs,
then **plummets**. Apex 2.2 → 3.4 cells, round fattened to 12 px with a
six-ghost trail.

The blast scales with the splash it deals, and the ground takes a shock
ring — the orbital strike's language one register down. Show and damage
radius agree, which is the lesson the strike taught.

One catch worth remembering: a shadowed `const v` inside the flight updater
parsed clean at module load — `import()` smoke checks pass — and threw
`Identifier 'v' has already been declared` only when the page actually
evaluated the script. The headless console caught it; the Node parse check
could not have.

---

## `252e89a` — The two tweaks were one scene

The report came as two items: "we spawn behind a portal" and "the portal is
missing its inner design". They were the same moment. The round start used
`dungeon.spawn`, which the carve often lands in the far band the gates seed
into — so a fresh player opened the game nose-to-nose with a forming portal.
And a forming portal genuinely had nothing inside: the horizon dots are
positioned by the idle tick, **which the dial-in skips**, so through the
whole draw-on they sat at the origin. The reveal's final act was a clump in
the gate's throat, then a snap as the first tick placed them.

Both ends fixed: the round start mirrors the death respawn (beside the
heart, aimed **outward** — from distance 1, "toward the heart" points you
into the thing you defend), and the horizon is positioned at t=0 in the
constructor, so the draw-on ends on the disc it was always supposed to end
on. Probed in-game: `drawRange 540, horizonR 0.098..0.580, zeros=0`.

### Guard the door, not the paths

The tower radial kept appearing during strike aiming even though the tap
dispatch routed around it — some path still reached it. Rather than hunt
paths, `openShop` itself now refuses while the strike is armed, flying, or
within 0.8 s of impact (the skip-tap and the landing race; the loser must
not buy a tower). A modal that must never appear mid-ritual is guarded at
its own door; every future tap path inherits the rule.

### The probe that reported a paused game

`?gateprobe=1` faithfully printed `dial=0` — on a game sitting paused at the
briefing, because a URL with no debugging param stops there. Two more
harness truths joined the pile: probes must count **real frames** (under a
virtual-time budget every timer can fire before the first paint), and
swiftshader cannot render 70 frames inside the watchdog, so the probe now
*forces* formation for its second report. The question was "does the game
path position the horizon", not "how fast can headless paint".

---

## `44bc639` — One mode, and a radar where the minimap was

Two structural changes in one sitting, both long promised.

### Cameras instead of modes

BUILD/MANUAL traded capabilities: enter build to place towers but lose the
fight, drive but lose the board. Gone. There are only **cameras** now —
orbit (the old build cam, the strategic pose), third, pov, bastion, cycled on
V — and every capability works under all of them: taps open the shop
anywhere, the tank drives anywhere, the auto-gunner fights anywhere, nothing
hides.

The migration trick: `buildMode` survives as a **derived** value
(`view === 'orbit'`) assigned in exactly one place. Its twenty read-sites —
drag-orbit, pinch, the free-cam branch, the follow-cam — all mean "is the
free camera up", and that meaning is unchanged. Only the write-sites carried
the mode, and those are what died.

The freeze BUILD used to smuggle in is an explicit **HOLD** switch now (same
button, same B key, same self-release when hostiles land) — a capability
with a name instead of a side effect of a camera. Double-tap in orbit pulls
back to the whole planet: strategy is one gesture from anywhere, which was
the point.

### The radar

The minimap stopped being a minimap the day it became a culled marker layer —
a shrunken second render that told you nothing the main view did not. It is
a **PPI scope** now, DeepWatch's idiom brought home: rotating beam, trailing
phosphor, contacts flaring as the beam passes and decaying behind it. Gates
pulse amber harder as a wave charges — the radar shows the telegraph.

It is a 2D canvas, and it **retires the second WebGL context outright**. The
scope math is pure and pinned (`src/radar.js`): heading-up, starboard-right,
out-of-range contacts pin to the rim instead of vanishing — orientation
conventions being exactly the kind of thing that flips silently.

Two details worth their comments: the sweep keeps turning while paused (a
dead scope reads as a crash; a turning one reads as a pause), and the old
YOU arrow had to be parked on the now-unrendered map layer — the map
renderer's absence would otherwise have made it suddenly visible **in the
world**.

### Playtest tweaks folded in

While a munition flies, the feed owns every tap — the retarget/skip tap had
been falling through to the shop dispatch and popping the tower modal under
the strike camera. And the tank's shell carries a small AoE now: half damage
to anything packed against its victim, no on-hit reactions, a clip of sparks
so it reads.

---

## `7a00bb5` — Hit like it looks

### "Within range yet unhurt" had two causes

Only one was the damage number. The rings drew at **2.2×** the damage radius,
so fodder standing visibly "inside the blast" was well outside it — the
visuals wrote a cheque the falloff did not honour. The outermost ring **is**
the damage radius now; the kill line and the drawn line are the same line.

And the falloff was thin: `(1 − d/r)²` pays a quarter of centre damage at
half radius. Fat-middle now — `1 − (d/r)²` — holding 75% at half radius,
zero exactly at the ring. With `dmgCenter` 6 → 10 and `blastCells` 2.4 → 3.2:

```
STRIKE ci=1143 portals 2->2 enemies 18->0 towers 0->0 walls 2152->2129
```

Eighteen enemies, one strike, on a measured cluster hit.

### The blast breaks the world, toggleably

`breakWalls` and `breakTowers`, both defaulting ON. Walls breach through the
same code the shell uses — split into `breachWallCell` + `rebuildAfterBreach`
so six breaches cost **one** BFS and one geometry build. Towers die first and
without refund (selling is a decision; this is a consequence) — and the order
matters, because a mounted tower anchors its wall: tower-first is what lets
one strike flatten a defended rampart.

Booleans joined the knob machinery properly — `bool: true` in the table, a
checkbox in the GUI, coerced-and-vetted on restore — rather than living
outside it and tripping the coverage test.

### Aim is two-fold

The paint chooses the area; **one vectoring burst** mid-fall re-aims onto
what the target drifted into. Tap the ground to spend it, tap the sky — or
anything after it is spent — to skip. Once by default: a second chance, not a
steerable missile, which would make the paint phase pointless. The feed
declares the mode (`VECTOR BURST ×1` / `VECTOR SPENT`), and the fall runs
3.5 s now — long enough to actually use it.

### The reporting bug that read exactly like a weapon bug

The proof line first sat **above** the kill loops and printed
`portals 2->2` on a direct hit. Twenty minutes of falloff suspicion — and the
weapon had been fine; the log was measuring before the work. It goes last
now, with the reason in a comment.

A measurement that runs at the wrong time is worse than no measurement: it
does not say nothing, it says the wrong thing with confidence.

---

## `5b26cd0` — The munition feed, and an inline style that beat the stylesheet

### Build mode follows the driver

Top-down is a real control mode only if the thing you are controlling cannot
escape the screen. When the tank projects outside ~78% of the frame, the free
camera swings its pole toward the tank's normal — keeping the current *up* so
the recenter never rolls the world underneath you — easing harder the further
out it is. A finger on the board owns the view outright; the follow never
fights a drag.

### The fall is a feed

Black-and-white for the ride down — a CSS `filter` on the WebGL canvas, so it
costs compositing only — under scanlines, vignette, corner brackets, a green
crosshair, and an ops HUD (`ORBITAL STRIKE · OTS-723 / WARHEAD 489KG ·
KINETIC / TGT CELL … / FEED SAT-CAM 2 · LIVE`). The game's chrome stands
aside; the feed is a takeover.

The red range counter is honest: it is the camera's own distance to the
target in fictional metres (planet radius ≙ ~4.8 km), so it rides the same
smoothstep as the fall and **decelerates hard as the ground arrives** — the
last 200 m read as a held breath, not a spinner.

The impact is a firework: four staged dot-burst shells, white core to ember
red, over the shock rings. One strike per gate means the set piece is
affordable.

### The bug worth writing down

`#tab-td.striking .minimap { display: none; }` matched the element — verified
with `el.matches()` — was present in the CSSOM — verified by walking
`document.styleSheets` — and the computed display was still `block`.

The probe that ended it printed the element's `style.cssText`:

```
inline=[display: block; width: 162px; height: 162px;]
```

**three.js `setSize` writes `display: block` inline on its canvas**, and an
inline style beats any sheet rule. That earned the stylesheet's one justified
`!important`, with the reason in a comment beside it.

The sequence matters more than the fix: selector matched → rule present →
still losing → *the only remaining suspect is inline*. Three probes, no
staring.

### Verification split by what each method can prove

`?strikecam=1` holds the feed open on a static frame — styling is a
screenshot's job. Engagement during a real fall is proven by `FEED ON/OFF`
log lines — a screenshot cannot reliably race a 2.5 s window under a
virtual-time budget, and this session has now hit that three times.

---

## `1980e32` — The orbital strike

DeepWatch's system (`~/Documents/Dev/centroid-defense`), carried over by its
design and not its code. The part worth carrying is the **ritual**:

```
cannot arm an empty tube
cannot paint unarmed
cannot launch without a lock
the safety re-engages on every launch   <- the design, in one line
```

All of it lives in `src/strike.js` — pure, no DOM — and was pinned in
`test/strike.mjs` **before any pixel existed**. The system's value is in its
refusals, and refusals are cheap to test headlessly and expensive to debug by
eye. The suite also pins the subtler rules: the window pauses at the ready
cap (hoarded time is not banked), and a second launch while one falls is
refused.

### Rationing

Budget arrives with the sector's gates — one strike per two portals, minimum
one — promoting one at a time through a 40 s window. DeepWatch grants per
*wave*, but its wave is the big battle unit, which for us is the **round**.
Later sectors have more gates and therefore more strikes, which is the point:
**one strike kills one gate.** Unspent strikes carry across sectors; a new
game empties the magazine.

### One button, three states

safe (count) → armed (amber, pulsing) → locked (solid: LAUNCH). One control
because the ritual is linear — a second would let the eye skip a step.
Arming promotes the minimap to a radar (same culled layer, more screen), and
while armed a board tap is a targeting act that outranks every other tap.

### The fall

The camera rides the munition down the target's normal, altitude easing on a
smoothstep — slow, then fast, which is what falling feels like — with shake
escalating hard past 85%. It **replaces** the main view rather than rendering
beside it, so it costs nothing: a corner panel would have been the
second-render trap the minimap culling just removed. A tap skips to impact;
the launching tap cannot skip its own cam (0.25 s grace).

### The blast

Gates die whole through `killPortal` — extracted so there is one place a gate
dies, however it died (shells ground it down before; the strike vaporises
it). Enemies take squared falloff through the existing `damageEnemy`, so
bounties and shrink-steps come free.

### The hook tests the honest path

`?strikefall=1` arms, paints the first live gate, launches — and then
**skips**, because under a virtual-time budget the fall clock barely moves
(the `performance.now` trap, again). The skip is also the path a pressed
player takes, so the headless run exercises the one that matters. Verified in
a single frame: `portals 2/2 → 1/2`, blast rings in flight, camera snapped
home, magazine spent.

---

## `59966ba` — Two routes to a wave, one of them silent

### The cues really did drift

There were two routes to `spawnWave`, and only one announced:

```js
} else if (waveAge >= params.waveCap && spawnPoints.some(s => s.alive)) {
  spawnWave();   // safety: the field is stalled
}
```

That branch sits **inside** `if (waveActive)`, while the whole telegraph lived
in the `else`. So a stalled field spawned with no charge, no rings and no
sound — and later rounds hit it more and more often, because bigger waves
take longer to clear. Exactly what "no 3 second delay before the wave
appeared" looks like from the outside, and it gets worse the further you get,
which is why it read as *drift*.

`armWave()` is the single entry point now: it starts a countdown, the
countdown drives the telegraph, and the countdown is the only caller of
`spawnWave`. Idempotent, because a stalled field re-asks every frame. Arming
happens `WAVE_WARN` early, so the total wait from cleared to spawned is
unchanged.

### The export was half the shape

The lab's card calls it **"chevrons + horizon"** and the JSON carried only the
chevrons — because the horizon is a separate `features` function, a function
of *time*, which a point export cannot hold. Ported from `stargateFeatures`:
six concentric rings inside the throat, each shimmering on its own phase, the
whole disc turning slowly on Y so it reads as a surface rather than a pattern.

435 ring points + 105 horizon dots. The horizon sits after the ring in the
buffer, so the existing draw-on reveals them in the right order for nothing:
ring sweeps, chevrons lock, throat lights up.

Worth keeping the lab's own note — `stargatePts` deliberately skips `fitUnit`
so the horizon can share its exact coordinates. Normalising the ring on import
would have silently moved the disc out of it.

### A lost tank is an event

It used to be neither an event nor a loss you could see: the hull counter
ticked down and the machine carried on driving. Now it explodes and you come
back in **build** — pulled up and out, looking at the whole board, with the
wall you did not have time to buy still unbought. That is the decision the
loss should hand you.

It returns to the spawn gate facing the heart, engine cold, throttle zeroed,
free-movement state cleared — or it would resume from wherever the wreck
stopped.

---

## `1b3228a` — The gate dials itself in, and the bacterium swims

### The point order was already the animation

`half-dotted-stargate.json` exported whole into `src/stargate.js`: 435
authored points against our generated 1150, and better ones — the chevrons
are *placed* rather than derived, so it reads as a ring with nine locks
instead of a bright blob.

The order turned out to be the gift:

| indices | what |
| --- | --- |
| 0–406 | one continuous stroke, mean gap 0.095 |
| 407–434 | the nine chevrons, each arriving as a jump |

Revealed in order it draws itself around the ring and then locks its
chevrons. So the draw-on effect is a `setDrawRange` and a bright head behind
it — no keyframes, no second geometry, no extra draw call. It dials over 1.6 s
and swells as it draws.

The head is the only part repainted each step (26 dots, brightest at the
tip); the tail keeps whatever the idle twinkle last wrote, so the two
animations do not fight over the colour buffer.

### `waveJelly` was the obvious thing and was wrong twice

It carries a spin about the body axis, and its squash is on **Y** — which for
a rod lying along Z means the creature lengthens and shortens instead of
flexing. A bacterium does neither.

`swimWave` instead: a travelling sine **along** the body, amplitude growing
toward the tail, plus a volume-preserving radial pulse. Measured:

```
max lateral swing — tail 0.450  head 0.042   (10.8x)
```

The flagella do the work and the head holds its heading, which is what it
looks like when something swims.

### Turned at build time, because lookAt wins

Enemies are oriented every frame by `lookAt`, which overwrites the object's
quaternion — so a rotation set on the object would be silently thrown away.
The model runs along X with flagella at −X, enemies face +Z, so the points are
remapped `(x, y, z) -> (-z, y, x)` **once, at birth**.

It deforms its *points* rather than its transform: 170 points a frame. A
transform can turn a creature; it cannot make one beat.

`portalPts()` is now unreferenced. Left in place — same call as the mesh
creature forms: removing it is a separate decision from replacing what uses
it.

---

## `e77f5b2` — The tank stays yours in BUILD mode

Two things stopped it, and only one was obvious.

**The build pause froze the whole tab**, driver included:

```js
const frozen = buildFrozen() || revealLeft > 0 || tutorial.frozen;
if (!frozen) advanceMotion(dt);
```

That pause exists to hold the *wave* still while you plan, so the world keeps
it and the driver no longer answers to it. A reveal or a tutorial hold still
stops everything, because those are the game speaking and should not be
driven over.

**The steering strips were hidden by CSS** in build mode. So even with the
driver live, the throttle sat there visible with no way to aim it — the
asymmetry was the real bug. They stay now; they are narrow edge strips, and
the middle of the board is still free for the drag that orbits the sphere.

The fire buttons stay hidden and the auto gunner still stands down: building
is not shooting. That is the line the mode draws, and it is a different line
from "you may not move".

The HUD said `BUILD · frozen`, which described the tab and became half true.
It now says what is actually held: `BUILD · wave held · you can drive`.

### Proving it, rather than looking at it

A screenshot cannot show that a thing *would* move. `simTime` only advances
inside `advanceMotion`, so it is the honest answer to "is the driver live":

```
build=true   frozenWorld=true   simTime=0.31
build=false  frozenWorld=false  simTime=0.31
```

Identical — with the world explicitly frozen. The equality is the proof; the
absolute value is small only because virtual time does not advance
`performance.now()`.

---

## `123d0ab` — The gates announce themselves three seconds out

`freezing_gush_01` from the Frost Mage set, through the usual pipeline:
trimmed to 3.70 s, peak-normalized to −1.5 dBFS, mono 96 kbps.

Kept at nearly its full length rather than cut to the 3.0 s lead. The gush is
meant to **still be running** as the first enemy clears the gate, so the cue
hands over to the thing it warned about instead of stopping a frame before
it. `WAVE_WARN` moves 3.2 → 3.0 so the sound starts exactly three seconds
out — long enough to break off, turn, and put distance between you and the
gate, which is the whole point of a warning.

Fired on the **edge** of the charge, once, at the nearest opening gate: it
carries a distance through the falloff, and two gates opening together
announce once rather than twice. `maxVoices: 1` backs that up in the mixer,
and a 2.5 s min-interval is longer than any legitimate re-trigger, so a
stalled wave clock cannot stack the loudest cue in the game on itself.

### The build table could not be annotated

Adding a comment row made the script fail with:

```
missing source: assets/audio/src/
```

The `|`-delimited table loop skipped blank keys but not `#` lines, so a
comment parsed as a key with an empty source path — and the error named the
empty path rather than the line that caused it. Both table loops now skip
comments (the LOOPS table had the same gap; fixing only the one that happened
to break would have left the trap for the next person).

---

## `32be0df` — The gates telegraph a wave before it lands

A wave used to simply appear. The countdown said so in a corner, but the
corner is not where you are looking — so the first you knew of it was enemies
already on the board, and the gate they came out of gave nothing away.

Over the last 3.2 seconds the gate now **charges**:

| | |
| --- | --- |
| its own idle | runs faster — not a second animation layered on top |
| scale + brightness | swell with the charge |
| shock ring | thrown across the floor each beat |
| beat spacing | closes from ~0.7 s to ~0.18 s |
| on spawn | one wide ring per gate, charge spent |

One thing accelerating reads as building pressure; two things moving reads as
noise. And the cadence **is** the countdown — legible without reading
anything.

It runs off the same clock that calls `spawnWave`, so the warning cannot
promise a moment the spawn does not keep.

The rings lie **on** the surface: the basis comes from the cell's own normal,
because a fixed up-vector degenerates wherever the sphere happens to face it.
They are one pooled `Points` cloud rewritten each frame — 144 particles alive
at mid-charge, one draw call. That is the effects direction recorded in
`acc9e3a`, applied.

72 points per ring, not the 34 I started with: the radius grows to several
cells, and 34 points spread across that is confetti rather than a shock front.

**No sound.** Nothing in the manifest belongs to a portal, and the nearest
candidates are the tank's own hydraulics — a wave warning that sounds like
your own vehicle is worse than silence. It wants a new asset.

### `?tick` does not drive the wave scheduler

Wound from 2 s to 10 s, the countdown read the same `in 4s` every time, which
looks exactly like a dead feature. `?tick` advances motion, not the wave
clock. `?charge=0..1` parks the clock inside the warning window instead, and
reports what the telegraph is actually doing:

```
CHARGE want=0    charge=0.06 ringParticles=68  beatIn=0.60s gateScale=1.018
CHARGE want=0.5  charge=0.56 ringParticles=68  beatIn=0.33s gateScale=1.040
CHARGE want=0.95 charge=0.00 ringParticles=136 beatIn=0.00s gateScale=1.000
```

The third line is the wave landing mid-sample — charge spent, gate back to
1.0, and the 136-particle release ring in the air. The whole cycle, in three
lines, from a feature a screenshot could not settle.

---

## `db3e3da` — Bands, and two reasons the first attempt did nothing

Three controls had piled into the phone's bottom-left corner — the primary
fire button, the left steering strip, and the throttle — so the lever sat on
top of the control it was meant to sit beside.

**Left side moves, right side shoots.** Both fire buttons go right, which is
where the hand that is not driving already is:

```
left edge   throttle
beside it   < steer
right edge  > steer, with both fire buttons above it
```

The top had the same problem horizontally: mode row centred, HUD left, map
right, all on one line of a 390 px screen. They stack now — modes on the
first band, HUD and map sharing the second — with the HUD's width capped by
the **map's own sizing expression**, so the wave line stops instead of running
underneath it. The callout clears all three.

Desktop had quietly acquired the same pile-up when the throttle moved left:
it was sitting on the fire button, and the left steering strip on the
minimap. Same reasoning, applied to the base rules.

### `@media (pointer: coarse)` is untestable

No desktop browser reports a coarse pointer, headless included. The entire
first round of fixes went into that block and **did nothing** — and looked
fine, because the screenshot showed rules that had never applied. The
rectangles said `fire x 16..94`: still on the left.

It now reads `@media (pointer: coarse), (max-width: 560px)`. A touch-only
query is a rule nobody can check.

Source order bit too: `#td-tut`'s base rule is declared *after* the mobile
blocks, so at equal specificity an override up there loses. That one moved to
the end of the file.

### Headless will not lay out below ~500px

It lays out wide and **crops**. `--window-size=390,844` produced a 390-wide
image of a 500-wide layout — `innerWidth` said 500 while the screenshot
measured 390 across. Every phone screenshot in this project has been showing
phone-sized pixels of a tablet-sized layout.

So `?layout=N` prints the box of every HUD element and every overlap between
them:

```
LAYOUT throttle  x 14..72   y 283..529
LAYOUT steerL    x 10..94   y 517..705
LAYOUT OVERLAP throttle x steerL — 58x12px
LAYOUT OVERLAP throttle x fire   — 56x78px
```

Rectangles do not lie. They found four collisions that three screenshots had
not, and they confirmed zero overlaps at 1400, 1000 and phone widths after.

---

## `bb95ffe` — The minimap cost 686 draw calls, and it was invisible

Last entry reported ~1020 calls on a wave-4 board and called that the frame.
It was half the frame. The minimap owns a **separate `WebGLRenderer`**, so it
has its own `info` — reading only the main one measured the main view and
made the map look free.

Measured properly, wave 4 with eight towers placed:

| | main | map | total |
| --- | --- | --- | --- |
| before | 1026 | **686** | 1712 |
| after | 1026 | **14** | 1040 |

672 calls — 39% of the whole frame — for a map nobody can tell has changed.

The map camera now sees only layer 1: the board's four merged meshes, the
hand-placed markers, and **one pooled `Points` cloud** carrying every enemy
and tower as a blip. A marker object per enemy would have reintroduced the
exact cost being removed; one buffer rewritten each frame is one draw call
for the lot, however many there are. Layers are per-object and not inherited
in three.js, so each participant enables it explicitly.

### Heads stand on their base, centred on their foot

Two separate mistakes, one after the other:

1. `fitUnit` normalises by *distance from the origin*. That keeps a shape
   inside the unit sphere and says nothing about where its **mass** sits, so
   off-origin shapes hung off the side of the collar.
2. Centring on the bounding box fixed that and broke something else: an arm
   reaches forward, so its silhouette's centre is well in front of its
   pedestal. Centring the **body** hangs the **foot** off the mast.

These are machines that stand on something. So the base is what gets centred,
and the base is what sits at the anchor — `headLift` is now the height of the
head's *foot* (0.86 rests it on the collar) rather than of its middle.

### Directional towers track, and which ones is derived

The arm, gripper and launcher swing onto the nearest target and ease round
the short way. The five symmetric heads keep their idle spin.

Crucially, *which heads have a direction* is read off the geometry — the
horizontal offset of a head's upper points from the mast axis:

| head | facing |
| --- | --- |
| sixaxis, gripper, launcher | ~90° (+X) |
| delta, ripple, broadcast, guyed, obelisk | none |

A hand-maintained list would be one more thing to forget when a shape is
reassigned — and it would have been wrong immediately, because **every ported
arm faces +X**. A tracker assuming +Z would aim ninety degrees off and look
deliberate about it.

The bearing itself comes from the render transform, per the house rule: put
the target into the tower group's local space, take the yaw that aims +Z at
it. No sphere trigonometry, so no sign convention to get wrong.

Ordering matters: aiming runs **after** the idle tick, which writes
`rotation.y` unconditionally and would otherwise win.

---

## `18f1cda` — Dot count was never the budget

The question was whether the dot granularity is a limit we impose for
efficiency, and whether towers should be solid instead. It deserved numbers.
`?perf=N` reports `renderer.info` across one whole frame:

| | wave 4 | wave 8 | wave 4 + 8 towers |
| --- | --- | --- | --- |
| draw calls | 1022 | 1448 | 1026 |
| triangles | 36,654 | 48,494 | 36,654 |
| points drawn | 49,744 | 67,252 | 50,032 |
| scene objects | 437 | 586 | 454 |

**Eight towers cost four draw calls and 0.6% more points.** Going from wave 4
to wave 8 — more enemies, more projectiles, more *objects* — costs 426 calls.

A frame here is priced in draw calls; draw calls scale with object count, not
with detail inside an object. 50k points is nothing to any GPU made this
decade. So raising a head from 190 to 480 dots adds vertices to a call that
already exists: free. 190 was an arbitrary default, never a measured limit.
Default 480 now, ceiling 1200.

Measuring it needs care: `info` resets on every `render()` and postfx runs
several passes, so a naive read reports the bloom's final fullscreen quad —
`calls=1` — and nothing else. Set `info.autoReset = false`, reset, and let one
frame accumulate.

**Decision, recorded in ROADMAP:** dot clouds stay, shapes carry their
authored detail, and the effects layer must be *pooled* — because "lots of
fireworks and explosions" is exactly the thing that adds objects. One `Points`
cloud with a rewritten buffer serves a thousand particles in one call.

### Heads sit on the pedestal now

`fitUnit` normalises by distance from the origin. That keeps a shape inside
the unit sphere and says nothing about where its **mass** sits — and several
lab shapes are deliberately off-origin, because an arm reaches forward from
its base. Mounted on a mast, the head hung off to one side of the collar
instead of standing on it. Ported shapes are recentred on their own bounding
box before resampling.

### FIRE draws what the tower does

Each attack shows its own pattern — a spread fans, a homing shot curves, a
mortar lobs on gravity and bursts where it lands, a beam arrives whole and
fades, a slow field pulses outward. It fires at the tower's **own rate** for
four seconds, because cadence is half of what you are judging, and the range
ring is scaled from `def.range` so reach is to scale rather than decorative.

Built as one pooled `Points` cloud rewritten in place — the same arithmetic as
above, and the reference shape for the effects layer.

---

## `36145b4` — Eight silhouettes, and arrows that hold still

Every tower now wears a distinct head from the Braille lab, matched to what
the tower **does** rather than to what looks good:

| tower | head | why |
| --- | --- | --- |
| single | six-axis arm | points at ONE thing, swings to the next |
| rapid | delta robot | three arms in parallel — the fastest mechanism on any line |
| spread | ripple ring | concentric rings travelling outward *is* a spread |
| homing | gripper arm | reaches out and takes hold of a specific thing |
| slow | broadcast antenna | emits over an area instead of aiming |
| aoe | rocket launcher | lobbed ordnance landing on an area |
| sniper | guyed mast | the tallest, thinnest thing here, built to reach |
| laser | obelisk | a monolith with no moving parts: a beam does not traverse |

Eight heads, eight towers, no repeats.

### The arrows moved in both axes

**Horizontally**: they flanked a caption block with only a `min-width`, so a
long note pushed them apart and every unit put them somewhere new — you had
to re-aim between clicks. Fixed by giving the stage a fixed width and letting
the arrows sit at its edges, plus reserving two lines on the note so wrapping
cannot change the block's height either.

**Vertically** was subtler and survived that fix. The bench row exists only
for units with a hover split, and `display: none` made the whole chrome stack
shorter for towers and pickups — so the arrows were pinned horizontally and
*still* landing somewhere new. `visibility: hidden` reserves the space.

Measured rather than eyeballed: the left arrow's ink spans rows 20–534 on
both a tank and a tower.

### Third time on the same rake

A test checked `formatTowerHeads({ aoe: 'launcher' })` for one "changed"
marker — and `aoe` now *ships* as `launcher`, so nothing was marked and the
suite went red on a correct change. That is the third assertion in this file
broken by a hardcoded shape name (`single: 'cone'` was the second).

The rule, written down properly this time: **assert the rule, derive the
data.** Every one of these tests is about a rule — "an override equal to the
shipped shape is dropped", "changed entries are marked" — and every failure
came from pinning the *example* instead. They now read the roster:

```js
const other = TOWER_HEAD_KINDS.find((k) => k !== TOWERS.find((t) => t.key === 'aoe').shape);
```

---

## `38d0dc9` — A global override that persisted, masking what it was meant to show

The report: the two new tower assignments were not showing in the viewer.
They resolve correctly — `single` → `sixaxis`, `slow` → `broadcast` — so the
bug was upstream of the shapes, in the panel I had shipped one commit before.

Its head picker was a **global** override, and it saved to localStorage.
Choose any shape once, and from then on every tower wears it — including two
that had just been assigned in `towers.js`. The tool built to judge the
shapes was hiding them.

### The control was wrong twice over

It could only ever answer *"does this shape work at all"*, never *"which
tower should wear it"* — and the second is the actual question. And a
per-tower map is the artefact you want to walk away with, because it pastes
straight back as `shape:`.

So the picker is scoped to the selected tower and labelled with it
(`HEAD · SINGLE SHOT`), with a default that reads `as shipped (sixaxis)`
rather than concealing what it would replace. Stepping to the next tower
rebuilds the row — the subject is still `'tower'`, but a row left standing
would assign to the tower you just left.

`copy code` emits both halves now, the second doubling as a checklist:

```
{
  single: "sixaxis",
  aoe:    "launcher",   // <- changed
  …
}
```

### Retiring the old blobs rather than migrating them

Storage moves to `towerfeel.v2` plus a separate `towerheads.v1`. A v1 blob
holds a global `headShape` whose meaning has changed entirely, so reading one
would silently reinstate the masking. `cleanHeads()` vets what comes back: an
assignment equal to the shipped shape is noise, an unknown tower or shape is
dropped.

### The test had a stale literal

`cleanHeads({ single: 'cone', … })` asserted that an assignment matching the
shipped shape is dropped — and passed only while `single` shipped as a cone.
It derives the shipped shape now. The assertion is about the **rule**;
hardcoding the data made it fail the moment a tower was reassigned, which is
precisely the operation it exists to permit.

---

## `d3aa228a` — The shape says what the tower does

`single` wears the six-axis arm, `slow` wears the broadcast antenna. Both
read as the mechanism doing the job rather than as decoration: an arm points
at **one** thing and swings to the next, which is a single-shot tower's whole
behaviour; an antenna emits over an area instead of aiming, which is what a
slow *field* does. The silhouette now says what the tower does before the
tooltip gets a chance to.

The tutorial banner moves from `top: 16%` to a fixed `134px`. At 16% it sat
over the middle distance — exactly where the thing it is telling you to look
at tends to be, so reading the instruction meant not watching the board.

134px clears both the mode row (`top: 52px`) and the four-line HUD block. The
first pass at 96px cleared the buttons and then clipped the wave line
underneath them, which is the sort of thing only a screenshot shows. The big
`.tut-flash` variant carried its own `42%` offset — that is what put the
opening RAM callout dead centre — so it moves too.

---

## `1cb7da6` — Nine shapes from the Braille lab

Source: `~/Dev/Braille`, `fun-shapes/index.html`. The lab and this project
already speak the same language — a generator returns `[x, y, z]` points, a
fourth element marks a half-dot highlight, `fitUnit()` normalises — which is
why `creatures.js` has said "ported from ~/Dev/Braille" at the top since day
one. A port is therefore the generator plus whatever primitives it stands on.

| wanted | generator | note |
| --- | --- | --- |
| six-axis arm | `armSixAxisPts` | asked for: single shot |
| delta robot | `armDeltaPts` | |
| gripper arm | `armGripperPts` | |
| guyed mast | `twGuyedPts` | |
| broadcast antenna | `twBroadcastPts` | asked for: slow |
| ripple ring | `wvRipplePts` | |
| egyptian obelisk | `obEgyptianPts` | |
| rocket launcher | `launcherPts` | |
| bacterium | `bacteriumPts` | an **enemy** candidate |

### Copied verbatim, on purpose

`src/braillelab.js` holds them unaltered, with the transitive closure of
their primitives — struts, joint balls, lattice and guy helpers, a
height-field surface: 17 in all. Rewriting them in our own hand would mean
maintaining a divergent second version of something the lab will keep
improving. Re-porting has to stay mechanical, not a merge.

Taking the closure by hand would have been guesswork; a script walked the
call graph from the nine and stopped when nothing new appeared. The four
names it could not resolve (`dir`, `fn`, `hi`, `prof`) are callback
parameters, not missing helpers.

### Resampled on the way in

They arrive at whatever density their author chose — **506 to 2689 points**
across the nine — and three carry no highlights at all. Left alone, the
dot-count knob would do nothing for them and several would read as flat dust
rather than half-dotted:

```js
const step = src.length / Math.max(1, n);
for (let i = 0; i < n; i++) emit(...src[Math.round(i * step)], i);
```

The authored highlight flags are dropped in the process. That is a real
trade — the lab marked a mast tip deliberately — but `hiEvery` is a knob, and
a knob that three of nine shapes ignore is the failure this file has now
recorded twice.

Adding another lab shape usually needs no new primitive: copy the generator,
add one line to `BRAILLE_SHAPES`.

### The flying saucer is a bacterium

Suggested tentatively, so it is wired the only way that lets it actually be
judged — seen in play. Reverting is one line in `units.js`
(`enemyDotPts('ufo')`).

### Both outside resources are now written down

`CLAUDE.md` records `~/Dev/Braille` and `~/Dev/blueprint-to-life`, including
that the latter has a **solved** service-worker + cache-bust pattern. The
ROADMAP lists our PWA item as blocked on exactly that problem — a SW must key
its cache names off the build token or it serves stale modules and defeats
the badge. Copy it; do not re-derive it.

---

## `101726b` — A bench for towers, and one machinery behind both

Towers get what the tank got: a knob table, a panel generated from it, and
values that *are* what the game builds.

### One machinery, not two

The tank tuner had already proved the shape — params object, clamp-on-restore,
copy-as-source — so rather than a second copy that drifts, `knobs.js` owns it
and each side declares a table:

```js
export const TOWER_FEEL_KNOBS = [
  { key: 'headShape', label: 'head shape', group: 'head', choices: HEAD_CHOICES },
  { key: 'headScale', label: 'head size',  group: 'head', min: 0.15, max: 0.9, step: 0.01 },
  …
];
```

`tankfeel` keeps its exported names — three files import them — but no longer
its own implementation. `knobProblems()` is new: it reports every way a table
can disagree with the constants it names (duplicate key, knob naming nothing,
tunable with no knob, default outside its own slider). That last one is the
trap — a slider whose range excludes the shipped value means the first drag
jumps you somewhere else.

### `headShape` is a choice, not a range

A slider over shape names would interpolate between things that do not.
`'per tower'` keeps each tower's own silhouette from `towers.js`, which is the
shipping behaviour; anything else overrides **every** tower with that head,
which is what a bench wants — the question there is "does this shape work at
all", not "does it suit the mortar".

### Five new heads, and the density bug

`lattice` (a guyed truss), `dish`, `arm` (shoulder, elbow, forearm,
three-finger gripper), `claw`, `sentry`. The arm is the only head in the set
with a **front**, which is what makes its rotation legible.

The first cut of the line-built ones ignored `n` entirely — their point count
fell out of their own structure. So the dot-count knob did nothing for exactly
the shapes that needed density most, and long members came out sparse while
short ones clotted. They now share a segment walker that spreads `n`
proportional to member **length**:

```js
const cnt = Math.max(2, Math.round((len[k] / total) * n));
```

### The panel serves both subjects

Which table it shows follows the selection. Tower knobs rebuild the head in
place — shape, dot count and highlight spacing are baked at build time — but
**without re-framing the camera**, because re-framing mid-drag throws away the
view you are judging in.

### What the test caught

`hiEvery` was decorative for the sphere head. `towerHeadPts` returned
`spherePts()` early, and that helper carries its own fixed highlight rule — so
the knob did nothing on the default head of the spread tower, the one shape
where it mattered most. It is re-emitted through the highlight rule now.

That is the second time in this file a knob has been wired to a panel and not
to the thing it names. Both times a test that asked "does changing it change
anything" found it, and looking at the panel did not.

---

## `eaa446a` — One way to ask for a creature

The viewer was fixed last commit; the tabs it documents were still building
the other thing. `heart` spawned mesh drifters, announced a mesh drifter on
its wave card, and drew mesh drifters as briefing icons — while `td` spawned
clouds and the viewer documented clouds.

`buildCreature(name, cols)` is now the single entry point:

```js
export function buildCreature(name, cols) {
  return ENEMY_SPEC[name] ? makeDotEnemy(name, cols) : buildUnit(name, cols);
}
```

The choice comes from the spec table, not a list at the call site, so adding
a creature does not mean remembering a second place.

| file | sites | what |
| --- | --- | --- |
| heart-tab | 4 | avatar, HUD icon, wave-intro unit, spawned hostiles |
| td-tab | 3 | avatar, HUD icon, wave-intro unit |
| battle-tab | 1 | avatar |
| organic-tab | 1 | avatar |
| maze-tab | 2 | spawn-at-walker, respawn |

Left alone deliberately: `buildUnit('tank')` in battle (the enemy tank) and
heart (the ally), and `buildUnit('mkcx')` in tank3. Those name machines, not
creatures, and have no cloud form to migrate to.

### The field that was one rename from being a trap

`battle` and `organic` branch on `UNITS[x].kind === 'cloud'` to pick the live
Wave × Jelly deform with phagocytosis. That flag selects an **animation
path**, not a representation. A `'mesh'` entry like `drifter` is now built as
a dot cloud and still — correctly — takes the transform-only idle path,
because what it needs is `userData.tick`, which the cloud has.

Read as "how does it move", it is right. Read as "what is it made of", it is
now wrong, and the next person to touch it would have read it the second way.
It says so in the source now.

The hostiles' `make` functions are kept, not deleted: the roster and its
dropdowns still name them, and removing them is a separate decision from
migrating to the form the game ships.

### Batch-patching the siblings

Per the house rule, anchored on code lines rather than comments, with each
file asserting its own match count before writing — so a mid-script abort
leaves earlier files committed and later ones untouched, which is the
designed outcome rather than a mess to unpick. The import rewrite was
asserted too: every file that gained a `buildCreature` call had to already
import `buildUnit`, or the script stops.

---

## `e4b8c53` — The reference screen was showing units the game never spawns

### Two representations, and the viewer picked the wrong one

`UNITS` still carries a **mesh** form for every creature — `makeSaturn`,
`makeCorona`, `makeMine` — that predates the dot clouds. `buildUnit()`
returns that. The tower-defence tab spawns `makeDotEnemy()` instead.

So the drifter on the reference screen was a torus and a sphere, while the
drifter on the board is a dot cloud — and none of the rammable/not tells were
visible there at all, because those live only on the cloud form. A reference
screen that describes something the player will never meet is worse than not
having one: it is confidently wrong.

Catalogue entries now carry `kind: 'enemy'` and the viewer dispatches to
`makeDotEnemy` in the creature's real `CREATURE_TINTS` colour, not the
player's. The caption leads with the tell:

| unit | caption |
| --- | --- |
| phage | RAMMABLE · 1 hp · speed 1.15 |
| drifter | solid core — will NOT ram · 2 hp · speed 0.85 |

### Neutral is no longer empty

The three reward pickups plus the shell rack, each with what it does and why
it matters — including the one thing about the regen charge that cannot be
read off its shape, which is that you have to **carry it home**. The rack is
built as three shells, the way it sits on the ground, and every entry plays
its own collect sound.

### One table, not two

`REWARD_TYPES` moves out of `td-tab.js` into `src/pickups.js`, read by both.
A second copy drifts the first time a colour or an effect changes, and then
the viewer teaches the player something that is not true — which is exactly
the failure this commit fixes, one level down. The pure-data module was
already the house pattern for `enemyspec` and `towers`; pickups just had not
been pulled out yet.

---

## `50d2f05` — Solid means it will stop you

### Bloom, softer and wider

| | was | now |
| --- | --- | --- |
| strength | 0.9 | 0.3 |
| radius | 0.4 | 0.5 |
| threshold | 0.85 | 0.2 |

A 0.85 threshold only ever caught near-white highlights, so bloom read as a
rim on a few bright edges rather than as light in the scene. Biting at 0.2
catches the body colours too — which is exactly why the strength has to come
*down*: the same total light, spread over far more of the frame.

This is the shared default in `postfx.js`, so td/battle/heart/tank3 take it.
The unit viewer passes its own `{strength: 0.5, threshold: 0.9}` and is
deliberately left alone — it is a lit studio on a near-black backdrop, not
the board.

### Rammable, at a glance

Half-dotted is this game's word for "enemy" and it stays that. But a player
has to know, *before* committing the tank, which ones go under the treads and
which stop them dead. So the ones that will not give way carry one piece of
**solid** geometry inside the cloud. Solid means mass, which is the thing
being communicated.

| type | core |
| --- | --- |
| drifter | octahedron |
| corona | ring |
| barbed | icosahedral shell |

Shaped per family so it also reads as part of that creature, and sized to
about a third of the cloud's span — the cloud is still the creature. The
first pass at 0.46 reached the drifter's own ring and the dots stopped
reading as the body at all. Driven off `ENEMY_SPEC.rammable` rather than a
hardcoded list, so a spec change moves the visual with it.

### Two traps worth naming

**The core is a child of the `Points`, not a `Group` wrapping both.** Callers
reach for `obj.geometry` and `obj.material` on the enemy directly:

```js
if (e.obj.material) e.obj.material.color.setHex(...)   // the slow tint
if (e.obj.geometry) e.obj.geometry.dispose();          // the wipe
```

A wrapper turns both of those into silent no-ops — the tint stops working and
the geometry leaks every wipe. This is the same trap the pickups fell into
when they went from `Points` to `Group`. As a child, every existing call site
keeps working and the core comes along for free.

**White is not neutral on a solid.** The slow tint clears itself by setting
white, which is correct on the cloud — its `PointsMaterial` uses
`vertexColors`, so white multiplies to no change. A solid has no vertex
colours to multiply, so white *erases* its body colour. The core records the
colour it was built with (`userData.baseColor`) and is restored to that.

---

## `cff89d2` — Beats between lessons, a bigger tank, leaders that point at it

### Three lessons in the time it takes to read one

Clearing a pair handed out the next instruction *and* the next pair in the
same frame. No pause to look at the HUD, no moment to notice which control
had just lit up — the pacing made the content unreadable regardless of what
it said.

Each lesson now ends in a **beat**:

```
kill lands -> confirmation line, pulse cleared -> 4 s of empty field
           -> next instruction, next pair
```

Instruction banners `hold` instead of auto-hiding after 4.5 s, so what you
are being asked to do is still on screen while you do it. The opening freeze
goes 4 s → 5.5 s; it is not only a banner, it is the first look at the board.

The beat is a `gapT` countdown with a `pending` thunk, checked before any
phase logic — so nothing spawns and nothing is asked while it runs.

### The tank, again

0.54 left it a quarter narrower than the procedural reference and it still
read as small. It now sits just over that width:

| | width | length |
| --- | --- | --- |
| tank (reference) | 0.508 | 0.729 |
| mkcx @ 0.75 | 0.531 | 1.460 |

### The health accents were invisible from above

Every authored glow strip is on the **flanks** — and half this game is played
looking straight down from the build camera, where the colour simply was not
present. Three strips added to the deck: a long one across the stern, a
smaller one behind each secondary. Placed from the model's own fittings
rather than by eye (`EngineDeck_Grille` y 1.57, `Driver_Hatch` y 1.56 → the
deck runs at 1.56–1.57; the secondaries sit at z 2.30). They share the cloned
`M_Glow` material, so they are health-coded for free.

The lift emitters are fattened 1.55× wide, 1.8× tall. At the authored
0.43 × 0.05 they were a hairline at play distance, and a gauge you have to
squint at is not a gauge.

### The leaders pointed away from the tank

The line must start at the label's **transform point**, because that is the
point the angle was measured from — the left edge for a right-hand label, and
the right edge for a left-hand one, where `translateX(-100%)` puts it:

```css
#units-callouts .callout s      { left: 0; }     /* right column */
#units-callouts .callout.left s { left: 100%; }  /* left column  */
```

Anchoring each to the *opposite* edge, as it did, draws every leader away
from the model and off the side of the frame. The columns also clear the
silhouette by 74 px instead of 34, so a label never sits on the part it names.

---

## `f08eed8` — One weapon per pair, a lever with its own beat, and the log tab

### The tank was 4.9x too narrow

The old `baseScale = 0.147` came from comparing the mkcx's **length** against
a corridor's **width**. The mkcx is 2.75:1 where the procedural tank is
1.44:1, so that mistake shrank it by most of that ratio and it read as a toy.

Re-measured against the procedural tank — the unit the board was actually
built around, and the only honest reference available. Both are multiplied by
the same `unitScale`, so `baseScale x raw size` compares world footprints
directly, with no board-density term to get wrong:

| unit | width | length |
| --- | --- | --- |
| tank (reference) | 0.508 | 0.729 |
| mkcx @ 0.147 | 0.104 | 0.286 |
| mkcx @ 0.54 | 0.382 | 1.051 |

A tank may be longer than a lane is wide. It may not be **wider**.

### The tutorial

Three scripted pairs, ordered by what each weapon costs you — treads free,
lasers free but needing aim, shell scarce and heating the barrel for three
seconds. Two enemies each, so a beat is a rehearsal and not a fight: the
player is never learning a control and losing at the same time.

The first pair comes in 7–11 hops out. **The walk is the lesson.** A pair
arriving at arm's length teaches nothing but panic; eight hops of empty
corridor is long enough to look around, find the lever, and decide.

The shell beat *hands over* three rounds as well as dropping pickups. A
tutorial step you can fail to even attempt is not a tutorial step — where
shells come from is the other half of the lesson, not the gate on it.

Then the field empties (the scripted gate collapses rather than being shot,
which was the old shell lesson) and the throttle gets a beat with nothing
else on screen. It advances when the lever is **moved**, not on a timer; the
16 s timeout only exists so a player who will not touch it is not stranded.

### The verification hook that failed twice

`?tutstep=N` clears N scripted pairs so the later beats can be screenshotted
without a pair of hands. The first two versions were wrong in the same way:

```js
setTimeout(step, 900);            // v1: fixed delay
if (phase !== before) next();     // v2: poll the loop
```

Under `--virtual-time-budget`, **timers run on virtual time while
`requestAnimationFrame` is throttled.** So v1's clears outran the ticks — two
landed between one pair of ticks, the phase advanced once, and the run ended
up short. v2 polled for a phase change that the starved loop never made, hit
its timeout, and ended up short in the same way, silently. Only a trace
showed step 3 firing while the phase was still where step 2 had left it.

The fix is to call `tutorial.tick()` directly. Poll the thing being driven,
never a clock — and when the loop is not reliable, drive it yourself.

### Furniture

The throttle moves to the left edge, stacked above the minimap, using the
minimap's own sizing expression so the two travel together — it had been
sitting in the centre, on top of the road ahead. BUILD/MAP/WANDER/CAM/sound
go to the top: they are mode switches, not thumb controls.

The dev log and the roadmap now share one tab as two panes — the same
document read in two directions — with the build token in the header,
because "which build am I looking at" is the first question anyone opening a
change log has. The corner badge remains the shortcut to it.

Worth knowing: **there is no global `.hidden` in this stylesheet.** Every use
is scoped, so a new one silently does nothing until it declares itself. The
roadmap pane showed through behind the dev log for exactly that reason.

---

## `7da0712` — The beam was square all along; the sweep was not

Five asks. The most persistent one turned out to be a measurement problem
rather than a modelling one.

### "The beam in the back is still tilted"

It is not, and has not been since the yaw fix. The **viewer's own idle tick**
sweeps the turret ~45 deg, and the stowage bin — the beam — goes round with
it. Dead-astern with the tick frozen, the tank is symmetric:

| turret | reads as |
| --- | --- |
| swept (default) | barrel out to one side, beam skewed |
| frozen (`sweep` off) | dome, bin and rack all on the hull centreline |

So the fix for the complaint IS the other request in the same message: a
`sweep` toggle (and `?sweep=0`) that stops the turret and returns it to rest.
That rest pose is the only state in which the model can be judged against the
hull axis at all — three separate "it looks tilted" reports were all this.

### The emitters were k² of their size

`attach()` preserves world transform. I attached them into a group that was
**not yet in the scene graph**, so its world matrix was identity — which
means the whole ancestor chain, including `fitModel`'s scale `k`, got baked
into each child's local matrix. Adding the group to the model afterwards
applied `k` a second time.

```js
modelRoot.add(emitters);            // parent FIRST
for (const n of MKCX_LIFTERS) emitters.attach(gear.getObjectByName(n));
```

They were present and correctly placed the whole time, at roughly a tenth
scale. The general rule: `attach()` is only meaningful once the destination
is where it will finally live.

They are six separate objects again rather than one welded batch, so they can
be spaced — the authored z values (−2.35, −0.40, 1.70) bunch at the rear and
overhang at the front. Now at 18/50/82% of the nacelle's span, measured off
the nacelle **batch**: `Nacelle_L` stops existing at the merge, so a lookup by
name finds nothing and quietly leaves the spacing untouched. A dead lookup
that returns `null` and skips is the failure mode to design against here —
nothing throws, the feature just does not happen.

### Labels were splitting on the wrong centre

Left/right was decided against the **canvas** centre. The tank is rarely
centred in frame, so nearly every part fell on one side and the greedy
declutter marched that column off downscreen. They now split on the model's
own projected centre and sit in two columns *outside* its projected
silhouette. Labels drawn over the tank hide the thing they are naming.

### Tuned values are the defaults

The operator's block replaces the derived guesses. Two knob ranges had to
grow to contain them (`rock` 0.06 was the old ceiling; `recoilPitch` 0.125
over the old 0.2) — caught by the schema test that asserts no default sits
outside its own slider, which is exactly the trap it was written for.

Three tests failed on the new values, and all three were **my assertions
encoding the old tuning as an invariant**: a rise rate, a slide distance, and
the secondaries' default share. Rewritten to assert shape rather than value —
the rise must ease over several frames (not at a stated rate), the slide is
measured from its own rest, and each share is tested by naming it explicitly
instead of leaning on the current default. A test that pins a tunable is a
test that fights tuning.

---

## `92597ef` — Three-tier hover, a whole shot in the bench, blueprint labels

Six asks. The first one explained three of the others.

### The hull was never in the body group

`mergeByMaterial` parents each batch to its **owner**, and anything outside a
preserved pivot is owned by the root it is handed — which was the glTF
**scene**, a *sibling* of `MKCX_Root` rather than its parent:

```
G (fit wrapper)
└ scene
  ├ MKCX_Root
  │ ├ Hover_Gear      ← pivot, owns its batches
  │ └ Turret_Pivot    ← pivot, owns its batches
  └ Mesh(root batches) ← hull, nacelles, details… OUTSIDE the model
```

The hover split walks `MKCX_Root`'s children, so it lifted only the
articulated pivots. "Body rise" raised the turret and secondaries off a
stationary hull, which is exactly what it looked like. `inner.attach(c)`
re-parents the batches without moving them.

### Three tiers, not two

Two tiers left nothing to measure the lift against — the whole thing rose in
one piece. The lore settles it: the machine levitates **on** the emitters, so
the emitters are the ground.

| group | motion | holds |
| --- | --- | --- |
| `HoverEmitters` | none, ever | the six lift emitters |
| `HoverGear` | settles by `gearDrop` | nacelles + pylons (the skirt) |
| `HoverBody` | rises by `rise` | everything above |
| ` HullVib` | vibration ×1 | hull and its furniture |
| ` Weapons` | vibration ×`vibWeapons` | turret + secondaries |

Splitting the emitters out of the gear needed no name list. The merge batches
per material and they are the only `M_Glow` parts down there — nacelles are
`M_Armour`, pylons `M_Steel`.

Vibration moved off the body and onto the hull because shaking the body shook
the guns just as hard, which read as the guns being **loose in their mounts**
rather than bolted to an idling machine. `vibWeapons` (0.3) is the share they
keep.

### Recoil immunity is spent, not withheld

The secondaries fire nothing when the main gun does, so the kick should not
read on them — but they sit inside the body that noses up. Immunity has to be
*spent*: their mount counters the body's pitch, and `recoilSecondary` is how
much of it they keep. This cancels their orientation, not the small arc the
body's rotation swings them through; at 0.05 rad that arc is sub-pixel.

### A whole shot in the bench

It had the kick and neither of the other two thirds. The barrel now takes the
same cool→hot lerp the game runs, on the same sleeve; the shell leaves the
muzzle **anchor** along the barrel's own world +Z, so it stays right once the
turret has swept. `?fire=N` fires one N seconds in, for stills.

### Blueprint callouts

Nineteen parts, named by the model's own node names, toggled with `labels`
(or `?labels=1`). Markers are dropped **before** the merge welds those nodes
away, and hung on the nearest surviving pivot, so a turret label sweeps with
the turret. Leader lines plus a one-pass vertical declutter per side; the
usable band stops above the control row.

This exists because "the bit at the back that looks tilted" cost a fortnight.
It was a 6 deg slew on `Turret_Pivot`, and neither of us could name the piece
we were each looking at.

### Two bugs only the browser probe could see

- **`preloadMkcx` was not idempotent.** `loadGlb` caches the *scene*, but
  every caller still ran the body against it — re-merging an already-merged
  scene and re-marking it. Every part whose node is a **Group** (and so
  survives a merge) collected one label per call: three of each. The promise
  is the guard now, not the scene.
- **The secondaries handle was looked up on the unit** while the body group
  was still detached from it, so it came back `undefined` and the recoil
  immunity silently did nothing. Unit tests passed throughout — they use
  stand-ins, and a stand-in cannot have the wrong parent.

---

## `77f2e5d` — One knob schema, a squared turret, and a roadmap tab

Three strands, all about the same thing: making what you judge and what
ships be the same object.

### The turret was six degrees off, and so were the shells

The beam out the back of the turret had read tilted since the mkcx landed.
Centring the sensor mast last time did not fix it, because the mast was
never the beam — it is a hull fitting at the rear-left deck corner. The tilt
is baked into `Turret_Pivot`, which the model ships slewed **6.00 deg** off
the hull axis (`rotation.y = -0.0523`).

That was not only cosmetic. This pivot is never rotated at runtime, and
`fire()` derives the shell's heading from its **world +Z**:

```js
turret.getWorldQuaternion(tmpQ);
tmpV.set(0, 0, 1).applyQuaternion(tmpQ);
```

So the authored yaw made the tank shoot six degrees off from where it
visibly points. `turret.quaternion.identity()` at build time squares the
silhouette and the aim together. The lesson generalises: when aim is derived
from a render transform — which is the house rule — the model's **rest pose
is gameplay data**, not decoration.

### Health moved onto the machine's own lights

The stretched mast read as an extra piece stuck to the deck, which is the
opposite of diegetic. The model puts every accent on ONE material, `M_Glow`:

| accent | count |
| --- | --- |
| lift emitters (nacelles) | 6 |
| hull glow strips | 4 |
| turret glow strips | 2 |
| secondary rings, headlights | 4 |

So the tint is a **single material write** that lands on all of them at
once, wrapping the hull instead of facing one way — legible from every
camera, which the mast never was. The material is cloned per unit first:
the merge preserves material identity and every mkcx descends from one
cached prototype, so painting in place would tint the whole field.

Two corrections the pixels forced. The hue belongs in **emissive** with the
diffuse held at 0.22 — these are running lights, and lit at full diffuse
they resolved to white under the key light. And the stops needed saturating:
the old sky-blue full-health stop read as "the lights are on", not "the
lights are blue", once emissive drove it.

### The bench now tunes the build

`units-tab` could show the tank but not change it in any way that shipped.
`td-tab` held a `params.hover*` mirror behind a hand-written GUI folder;
the viewer read the module defaults. Two sets of numbers that happened to
start equal — the drift `tankfeel.js` exists to prevent, one layer up.

`TANK_FEEL_KNOBS` describes each tunable once (key, label, group, range,
step). Both surfaces are generated from it and both write into `FEEL`, a
single live object in `feelstore.js`. No apply step, nothing to sync. The
four recoil constants get sliders for free, and `RECOIL_LEN` stops being a
second constant — it is a read of `FEEL.recoilLen` now.

`feelstore` is separate because `tankfeel` is pure and Node-tested and
`localStorage` is not available there. Restored blobs go through
`clampFeelParams` as untrusted input: a stored entry can predate a range or
a rename, and a corrupt one should cost the defaults, never a broken tab.

The copy button emits **source**, not JSON — otherwise a good setting lives
in one browser and never reaches the repo, which makes the bench a toy.

Tests assert schema coverage in both directions, that no default sits
outside its own slider range, and that the emitted block rounds to slider
precision rather than `0.13999999999`.

The panel is `position: fixed`. Its parent `#units-chrome` is a
bottom-anchored absolute strip, so an absolute panel hung off the *controls*
rather than the stage, and a percentage `max-height` resolved against that
strip and collapsed the list to zero. Both of which it did, visibly.
`?tune=1` opens it — headless has no pointer.

### And a ROADMAP tab

Three doc tabs now share one factory, so this cost a file and a
registration. It lists the uncomfortable items too — the five board tabs are
still copy-and-edit siblings, mobile has never been checked on a real
device, nothing tests the render layer — because a roadmap that only lists
wins is decoration.

---

## `155e08c` — Recoil moves into the feel driver, so the bench stops lying

The unit viewer exists so the tank can be judged in isolation instead of
mid-firefight. It could play the shell **sound** but never showed the
turret flinch, because the kick was written inline in `td-tab.js`'s frame
loop. A bench that shows a different tank than the game ships is worse
than no bench.

`src/tankfeel.js` now owns recoil next to hover and rock:

| call | does |
| --- | --- |
| `fireTankFeel(st)` | arms the kick (`st.recoil = recoilLen`) |
| `stepTankFeel(st, dt, running)` | decays it toward 0 |
| `applyTankFeel(unit, st)` | draws it onto `userData.turret` / `hoverBody` |

The slide is `baseZ - recoilSlide * rk`, where `rk = rf²` — squared so the
hit lands hard and lets go fast — plus a 70 Hz shudder scaled by the same
factor. It is applied **before** the `hoverBody` early return, so the
procedural tank (a turret, no suspension) still kicks.

Two traps are load-bearing here:

- **`td-tab` keeps the recoil clock.** It drives the camera shake and the
  shell's own flight, so it stays authoritative and hands `recoilLeft` to
  the driver each frame. Two independent clocks would drift.
- **Pitch goes on the body group, not the unit.** The unit's orientation
  comes from `lookAt`; `playerMesh.rotateX` *composes* onto that
  quaternion, but writing `.rotation.x` would *replace* it. tankfeel only
  ever writes rotation on `hoverBody`, a child group with no such
  constraint — and `td-tab`'s own `rotateX` is now gated to units that
  have no hover split.

Rock and recoil pitch are summed into `rx`/`rz` and assigned once. Firing
mid-landing should read as both; two writes to `rotation.x` would silently
keep only the second.

`test/tankfeel.mjs` (30 checks, wired into `npm test`) pins the gestures
rather than the numbers: the rise is gradual (no frame delivers >5% of it),
the *gap* between body and skirt opens rather than the tank levitating as
one lump, the turret returns to `baseZ`, a hover-less unit still kicks, and
recoil composes with rock instead of overwriting it. It also caught a real
wrinkle — the red health stop's blue channel sat *above* orange's, so the
beam dipped fractionally warmer before ramping cool. Two hundredths and
invisible, but the ramp now moves one way on every channel.

---

## `75cdd2d` — Three sounds for one engine, and a viewer that plays units

The tank's engine bed had never worked, and the cause was a design mistake
rather than a tuning one. `loop()` in audio.js returned a stub handle —
`{set(){},stop(){}}` — when it couldn't start. A stub *looks* successful,
so the caller stored it and never asked again. The tank's first move
reliably lands in the window where the AudioContext exists (the keypress
created it) but the mp3 hasn't decoded yet, so one latched stub silenced
the bed for the whole session. It returns `null` now and the caller retries
every frame, which is free: `start()` bails before touching the voice
budget when there's no buffer. Worth remembering as a general shape —
a failure that returns something truthy is worse than one that throws.

The engine is three sounds instead of one: hydraulics lift the tank as it
starts, a thruster bed carries it while it moves, hydraulics set it back
down when it stops. A single looping sample gave starting and stopping no
weight at all. `thruster.wav` is also a much better loop source than the
old teleport whoosh — its RMS holds within ~1 dB across the body against
2.5 dB for the old one — so the 2.90 s loop has no audible seam. The
build script grew a LOOPS table, since it now builds two crossfaded beds
rather than one hardcoded case. The old bed stays in the manifest to
compare against.

The heat sleeve is 3× longer at the same radius, pushed forward so the
longer band still sits on the barrel rather than starting inside the
mantlet. It's the most legible thing on the tank and it was too short a
band to read at gameplay distance.

And the units tab plays sound now, which makes it genuinely dual-use: a
tuning aid and a lore panel in the same control. Each catalogue entry
carries its own sounds, so a tank offers start/moving/stop/shell/lasers/
reload/pickup, a tower offers fire and upgrade, and every hostile offers
all three death sounds — hearing all three is the point, since the game
picks between them from the deterministic stream. `moving` is a loop and
its button toggles. The viewer builds its own mixer instance so nothing
there can disturb the game tab's levels or voice budget, and it latches a
loop handle only when `loop()` returns a real one. Same trap, not repeated.

---

## `8f9cb7f` — The tank you can drive is now a model

`mkcx` joins the unit roster, so it sits in the creature dropdown beside
the procedural tank rather than replacing it.

The interesting part is that the tank is the **opposite** case from the GLB
tower, and the difference is the whole design. A tower can be flattened to
about six draw calls because it holds still. A tank has to *aim* — so the
nodes that move have to survive the merge. `mergeByMaterial()` now takes a
list of pivots to preserve: meshes under one of them merge into *that*
node's local space and stay attached to it, everything else merges into
the root. `Turret_Pivot` and both `Secondary_*_Gun_Pivot`s come through
articulated, so aim still derives from their world quaternions and the
house rule about never re-deriving a render-coupled direction holds. 58
meshes becomes 13. The empty `Object3D`s left behind cost nothing and keep
the artist's transforms exact.

It's recentred on `Hull_Mesh`, not on its bounding box. That sounds fussy
until you measure it: the box centre is (0, 1.69, **1.46**) because the gun
barrel juts 6.87 units forward while the hull sits at the origin. Centring
on the box would have had the tank pivoting around a point out in front of
itself — the kind of bug that reads as "the controls feel wrong" rather
than as a transform error.

The GLB machinery moved into `glbmodels.js` — `loadGlb` (one cached
in-flight load per URL, resolving `null` rather than rejecting, so callers
always have a fallback), `mergeByMaterial`, `fitModel`, `tintModel` — with
`towerlooks.js` refactored onto it rather than keeping a second copy.

Verified the loaded state rather than merely that something built:
`loaded=true meshes=13 turret=true guns=2 baseScale=1.0`. The fallback
reports 17 meshes and 0.497, so those numbers are the real model with its
articulation intact — worth checking, because an earlier probe of mine sat
in the wrong function and would have reported success either way.

---

## `8f58801` — A smaller tutorial board, and a spider that became a tower

Two things, plus a loader.

The board first. The whole unlock run — every wave until the last tower
unlocks — is a guided tutorial, and it was being played on a sprawling
map. `points` went 3000 → 500. That knob is less direct than it looks, so
it was measured rather than guessed: `points` sets the sphere's
resolution, not the arena, and the room carve produces a roughly fixed
number of open cells regardless. The opening sector goes 146 cells at
3000, 118 at 600, **84 at 500**, 73 at 400 — so 600 would have been barely
a change and 500 is a real one. Cells come out ~2.4× wider too, so the
board reads chunky and legible instead of finely sprawling. The thing that
could have broken didn't: the world unseals by sector across rounds, and
round 2 still opens 278 cells against round 1's 84.

Then the GLB. `GLTFLoader` and `BufferGeometryUtils` are vendored at
r160 from the same 0.160.1 tree as the bloom chain, their bare `'three'`
specifiers rewritten to our single copy — the dual-instance trap that arc
already documented. The heptapod walker is now a third tower look.

The registry's `preload`/`lookReady` hook, added speculatively last commit,
earns itself here: choosing `heptapod` builds the braille fallback
immediately and re-applies once the bytes arrive, so the choice is instant
and a tower is never invisible. Both phases were caught in one run —
`meshes=6 points=2`, then `meshes=216 points=0` with `Heptapod_Root` in
the tree.

Three problems the feasibility pass had missed, because it measured local
accessor bounds and ignored node transforms. **Scale**: true world size is
4.83 × 2.51 × 5.34, nearly twice as wide as tall — fitting by footprint
made a squat smear that read as debris, fitting by height alone sprawled
it across neighbouring cells, so it fits to a target height with a span
cap. **Visibility**: a dark grey machine vanishes against a black board of
neon wire, so the def's colour goes on as emissive — full on the parts the
artist named "glow", a low wash elsewhere. **Draw calls**: the model is 109
separate meshes; eight towers would be ~870 draw calls, doubled again by
the bloom's second scene render. Merging per material takes it to 6 per
tower (216 → 12 for two), triangles intact. That costs the rig — a merged
mesh is one rigid body, so the turret can't turn. For a walker that has
dug in to be a tower, holding still is in character.

Also fixed: `?towerlook=` set the param without refreshing the lil-gui
controller, so the panel said `braille` while heptapods were on screen. A
panel that lies about what is rendering is worse than no panel.

---

## `3a762cf` — Towers get a look you can change

The tower visual was welded into `makeTowerUnit`, so trying a different
look meant editing the thing that also knows about mounting, scaling and
the head animation. `towerlooks.js` is the seam: a look is a named builder
that turns a tower def into an Object3D, and swapping one rebuilds only
`tower.obj` — key, def, tier, cell, cooldown and spend are game state and
never move. There's a `tower look` dropdown and a `?towerlook=` hook.

It ships with two looks, because a registry with one entry proves nothing.
Alongside the existing `braille` dot-cloud head there's `solid`: the same
mast, but a faceted tinted head with bright edges and a slower spin, so it
reads as machined mass rather than a hovering swarm. Both call a shared
`makeTowerMast()` split out of `makeTowerUnit()`, so every look is the same
family of machine and only the head differs — and `solid` maps each
`def.shape` to a primitive, so a tower keeps its silhouette identity when
you switch.

One latent coupling got fixed on the way. Tier bulk was applied as
`obj.scale.multiplyScalar(1.12)` — accumulated *onto the object*. That
meant the visual silently carried tier state, and the first look swap
would have quietly reset every upgraded tower to tier-0 size. It's derived
now, `baseScale × 1.12^tier`, inside a shared `placeTowerObj()` used by
placement, upgrade and swap alike.

The swap was verified live rather than at the builder: with two towers on
the board, `braille` renders 2 Points heads and 6 meshes, `solid` renders
0 Points and 8. The `?towerlook=` hook was deliberately moved to run
*after* `?tower=` so it exercises `applyTowerLook()` over existing towers
instead of only choosing at build time — the earlier ordering would have
left that path untested.

`buildTowerLook()` never returns null: an unknown name falls back to the
default rather than leaving an invisible tower on the board. The unused
`preload`/`lookReady` pair is the hook for looks whose assets load
asynchronously, so the heptapod GLB can arrive without reshaping this.

---

## `e8b70d2` — Per-group bloom, and the ally tanks that weren't there

The bloom was one dial for a scene full of different things. Turning it
down to calm the board flattened the enemies; turning it up to make
enemies pop smeared the board. There are five dials now — map, enemies,
tank, towers, effects — under `bloom > weights`, persisted so a tuning
session survives a reload.

The catch is that `UnrealBloomPass` is a full-screen post-process. It has
no idea what an object is, so "bloom per group" isn't a parameter you can
add; it's a render path you have to choose. Three chains, one per group,
would buy fully independent strength/radius/threshold for about 4 scene
renders and 3 mip chains. Scaling each group's material brightness would
be free but welds glow to brightness — you could never have a bright line
that barely blooms, which is exactly what the board needs.

So: one chain, fed a **weighted** render. Each object's colour is scaled
by its group's weight before the bloom pass, and the result is added to a
normal, unweighted render — `scene + bloom(scene × weights)`. A weight
changes how hard something *glows* without changing how brightly it
*draws*. Two scene renders instead of one; the mip chain, the expensive
half, is unchanged.

What makes the composite clean is where the bloom is read from. r160's
`UnrealBloomPass` blends its result additively over its input and ignores
`this.clear` at that step, so the pass output is always `input + bloom`
and can't be made bloom-only. But it leaves the *pure* bloom in
`renderTargetsHorizontal[0]` just before that blend, and that texture is
readable — so no scene term leaks into the add. That detail was checked in
the vendored source before the approach was settled, not after.

Group membership is read fresh each frame from the collections that
already exist — `enemies`, `spawnPoints`, `towers`, the four board meshes
— rather than tagged at creation. Enemies are built in several places, and
a tagging scheme would have meant every future spawn site remembering to
opt in. Anything unlisted falls through to `effects`.

Verified by A/B at a fixed seed: forcing `map` to 2.5 against the shipped
0.35 makes the board's halo appear and vanish while the lines stay equally
bright, and the enemy cluster is pixel-identical in both. Glow moved,
brightness didn't, nothing else was touched.

Also in here: ally tanks are gone from TD. Worth recording *why* that was
cheap — `params.friendlies` was already `0` and never exposed in the GUI,
so none had spawned in a long time. The array was permanently empty, which
meant `playerHit`'s "command jumps to the nearest ally" branch was
unreachable and death already fell through to `loseGame`. 207 lines of a
subsystem carrying full weight while doing nothing. The `C` key and the
"friendlies & pickups" glossary went with it.

The weights themselves have not been *seen*, only reasoned about. That's
what the sliders are for.

---

## `bfb7a2f` — The vertex blobs, and cutting the build camera loose

Two fixes and one of them was not where it looked.

The squarish glow beads on floor vertices read like a bloom setting. They
weren't. Every open cell emitted all four of its own boundary edges, so
every interior edge — which belongs to two cells — was drawn **twice**.
On seed 7: 4019 distinct undirected edges, 6016 segments emitted, and up
to **14 segment endpoints landing on a single vertex**. The edge material
is `AdditiveBlending`, so those overlaps sum. A vertex ran up to 14× the
base edge brightness while the midspans sat near 1–2×, so with
`threshold: 0.85` the bloom picked out vertices specifically and left the
lines alone. On the vertices, in every camera, worst top-down where the
most vertices are in frame — which is exactly how it was reported.

Fixed at the emission point with an order-independent segment key. Order
independence is the whole trick and is what `test/segkey.mjs` guards:
twin edges are wound opposite ways, so a direction-respecting key would
dedupe nothing and do it silently.

There was a real second defect underneath, found first and fixed in
`a1ca152`. `EffectComposer.setSize()` sizes every pass in device pixels;
`postfx.js` re-applied the bloom's size afterwards — to protect the phone
half-res path — but re-applied it in *CSS* pixels. At dpr 2 the bloom ran
on a quarter of the frame's linear resolution (composer 1600×914, mip0
400×229). That didn't create the blobs, it made them blockier. Both are
now tested: `bloomTargetSize` is pure and Node-checked, because a bug
that is invisible at dpr 1 and only bites on Retina is one that comes
back.

Build mode also got cut loose. It used to re-centre on the Heart every
single entry and hold you there on a 0.6 rad elastic tether. Now it
frames the Heart the first time and then stays put, and the drag rolls
the sphere all the way round. That needed more than deleting the clamps:
the camera's up was re-derived each frame as the Heart pole projected
into the tangent plane at the view centre, which collapses to zero at the
antipode — the ceiling was the only thing keeping us away from it. The
frame is carried as a quaternion now and rotated incrementally, so it is
well-conditioned everywhere. Double-tap anywhere rides the view home,
using the camera loop's existing slerp for the easing.

One worth recording: putting the first-entry centring in `toggleBuild()`
shipped a black screen, because `?mode=build` and the tutorial set
`buildMode` directly and the old `if (!buildCenter)` fallback that had
been covering them was gone. Nine passing unit tests didn't catch it; the
first screenshot did.

## `31a582b` — Sound

The game had no audio at all. It has seventeen sounds now, all in the TD
tab: one voice per tower, the tank's shell, twin lasers, both pickups and
a speed-driven engine bed, and three enemy deaths picked at random. A
`sound` folder sits next to `bloom` with master and four bus faders, plus
a mute chip in the touch row.

Most of the work was in the assets, not the code. An audit of the
shortlist against the actual fire rates in `towers.js` turned up three
things worth designing around. Laser and Slow shipped the *same*
`beam-05` file — identical size, identical 4.683900s duration — so the
two towers would have been indistinguishable; they're now two variants
cut from it, the laser a 0.45s head at pitch and the slow 0.80s at
`asetrate` 0.70 so it drags. Most samples outlived their own tower's
shot interval, badly at tier 2 where the `single` attack family
compounds to ×1.44: a fully upgraded rapid tower fires at 4.32/s against
a 1.54s source, 6.7× self-overlap. And the engine sample turned out to
be loopable — its RMS body holds within ~2.5 dB from 0.35s to 1.45s —
so the tank got a real bed instead of one-shots per cell crossing.

`scripts/audio-build.sh` solves the overlap at the source, trimming
every sample to fit its *tier-2* interval, then peak-normalizing in two
passes. Two traps there cost real time. `volumedetect` saturates its
report at 0.0 dB, so it structurally cannot see the overshoot it's being
used to measure — four files read "0.0 dB" and looked fine. `astats`
over float shows the truth: MP3 decoding reconstructs peaks *above* the
encoded sample peak, by +0.9 to +4.3 dB across this set, which Web Audio
clips at the output device. Pass one lifts to −1.5 dBFS, pass two
subtracts the measured overshoot; the script hard-fails if anything
lands at or above full scale. 176K for the set.

The code splits along a testability line. Every decision about *whether*
a sound may play is pure and lives in `audiomix.js` — per-key
min-interval, per-key voice caps, a global 24-voice ceiling, and
inverse-distance falloff — so it's Node-tested with no `AudioContext`
and no DOM. `audio.js` only carries those decisions out. `admit()`
returns an id to *steal* rather than stopping anything itself, because
the caller has to ramp it down over ~30ms first; a hard cut mid-waveform
clicks. The manifest cross-checks `TOWERS`, so adding a tower without a
sound is a test failure rather than a silent gap.

Two details worth knowing. The context is created on the first user
*gesture*, never at init — browsers reject one made earlier, and a
suspended context swallows everything silently, which reads as a bug in
the game rather than as policy. And audio URLs take their `?v=` from the
`<meta name="cb">` tag at runtime, because `fingerprint-urls.py`
rewrites HTML attributes and CSS `url()` but never JS string literals.

Levels were derived from durations, fire rates and RMS envelopes — not
heard. The faders are there partly to fix that.

---

## `0de457f` — The glow we owed the neon

The original looks arc ended on a deliberate deferral: additive Tron edges
shipped, but the bloom chain didn't — "the 6-module EffectComposer cost
deferred until a look earns it." Comparing feel against HokorobiTawaa found
the bill for that: HK runs UnrealBloom at 0.9 over additive everything, and a
real part of "it looks better" was post-processing we'd chosen not to build.
So the chain is vendored now — ten modules at exactly r160 to match our
three, their bare `'three'` specifiers rewritten to our copy so the browser
can't load a second one — behind a shared `postfx.js` that any tab opts into
with two lines. TD, battle, heart and tank3 all render through it, half-res
on phones, with live strength/radius/threshold sliders.

---

## `04eeb1c` — First impressions

The TD open got a rewrite for the first thirty seconds. The tutorial starts
frozen — tank by the heart, two enemies in the lane, the laser lit, "SHOOT TO
DEFEND THE HEART"; the first shot thaws it. All the guidance is transient
toasts now (no × buttons, no start-choice modal, nothing that pauses the
game). Drive is MANUAL by default and sticky — auto is opt-in through the
directive chip and any input reclaims the wheel, with the idle auto-resume
timer gone. And waves are clear-gated: clearing the field plays a WAVE OVER
beat, then an anticipation countdown (waveGap) before the next wave, with a
waveCap safety so the war never stalls.

---

## `5f4862d` — Deliberate waves, one true gate

TD progression collapses onto the wave counter: wave N = N enemy types + N
tower types (one new tower a wave, capped at the roster), the newest threat
headlining with a few older types folded in. A NEXT WAVE strip previews and
counts down what's incoming; a NEW TOWER card marks each unlock; the HUD
leads with the wave. Portals became type-agnostic neutral **stargate**
sources — a bounded set per sector, seeded spatially, pouring out whatever
the wave plan dictates — and the torii/moongate shapes and the shape
dropdown are gone. Sectors stay as pure spatial growth. The plan itself
(`computeWavePlan`) and the wave-keyed tower ladder are pure and Node-tested.

---

## `6f955b9` — Onboarding, patience, and a camera that roams

Four TD tweaks. The tutorial greets you with a real choice — play or skip —
and wears a × so you're never trapped in it. The auto-driver got patient:
~10 seconds of idle before it retakes the wheel, or instantly when you pick
a directive. "TANK" became "MANUAL", and taking manual drive now says so —
a card explaining the tank fights autonomously until you grab the controls.
And build mode unbolted its camera from the heart: flick to pan across the
planet (elastic within a radius of home), pinch to zoom, tap to place.

---

## `16b5be1` — Reach, zoom, and missiles

Three TD tweaks. The tutorial portal moved off the heart's doorstep to
20–30 cells down the hall, so the opening reads as a real approach you
drive out to stop. Build mode learned to zoom — it opens closer and takes
a two-finger pinch on mobile (the board captures the gesture so the page
holds still), while the tap-to-place raycast stays exact at any distance.
And the shells you pick up are missiles now — the finned dot-cloud from the
Braille lab, three to a triad, still +3 a grab; the towers' own tracers keep
their bullets.

---

## `a306ce8` — The first five minutes of TD, taught

TD now opens on a hand-held tutorial instead of a wall of glossary. You
start beside the heart with empty hands as three phage crawl in —
"PROTECT THE HEART!" — and you learn ramming is free. Shells appear; the
portal wants three of them. Then the drums pick up, a second wave lands,
and the BUILD button glows while the buildable high-ground flashes across
the shell. It can't be lost and it drives its own spawns until you plant a
tower, then steps aside. Under it, a by-round unlock ladder now paces the
arsenal — normal and rapid to begin, the laser five sectors deep — with
the shop showing locked towers dimmed behind the round that opens them.

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
