# TD tab — merging Heart with HokorobiTawaa's tower defense

Operator brief: a NEW tab (TD) so nothing already shipped is touched.
Merge the heart tab's action game (drive, ram, shell, hunt portals)
with HokorobiTawaa's towers and credit system. One mode mirrors the
heart's growing-planet rounds. Hard requirements: an EASY switch
between planning/building (top-down, place towers, manage economy) and
POV/third-person action; a minimap switchable between the current
player-centric view and a top-down Heart threat view; and a worked-out
downtime tempo for balance.

Source facts below are from the HokorobiTawaa deep-dive (file refs in
.deban session log; key: `src/units/roster.ts`, `src/game/game.ts`,
`src/render/scene.ts:593-638` targeting, `src/render/effects.ts`
projectiles, `src/main.ts:90-167` placement flow).

## 1. Principles

- **New sibling, zero regression.** `td-tab.js` is a sixth tab. The
  heart tab stays exactly as shipped. Shared code comes from shared
  modules — never from editing heart-tab.
- **The extraction question, faced honestly.** td-tab starts as a copy
  of heart-tab (~2,500 lines) plus tower systems (~700). That is the
  sixth cp+sed sibling; the .deban debt note says siblings burn patch
  cycles. Decision: extract three PURE, Node-testable modules FIRST —
  - `enemyspec.js` — CREATURE_TINTS + ENEMY_SPEC + INTROS (+ bounty)
  - `towers.js` — tower configs, upgrade math, targeting math (DOM-free)
  - `economy.js` — credits/streak/costs/refund math (DOM-free)
  — and copy the rest. heart-tab consumes `enemyspec.js` immediately,
  which proves the extraction and halves future roster drift. Full
  board-core extraction stays deferred (still-diverging siblings).
- **Determinism holds.** Targeting, projectiles, economy run off
  seeded streams; no Math.random.
- **Diegetic-first UI:** towers show their own state (range rings on
  the surface, cooldown glow, tier marks). Same language as the shell
  rack / heat sleeve / gun tint.

## 2. The loop and its tempo

HK's tempo facts: START_DELAY 8 s before wave 1, BETWEEN_DELAY 6 s
between waves, ANNOUNCE_LEAD 4 s, status flow ready→active→ready;
"Continue" loops keep gold+towers at ×1.6 enemy HP.

TD's tempo (the operator's "downtime to be worked out"):

- **BUILD (downtime).** Enemies/waves frozen. Top-down planning
  camera. Place/upgrade/sell, survey portals, plan the sortie.
  Entered automatically when a wave is cleared; enterable anytime via
  the mode toggle (with a 1 s cooldown so it isn't a combat escape
  hatch — entering build mid-assault does NOT freeze, it only swaps
  the camera; the freeze applies only between waves).
- **CALL THE WAVE.** Waves don't auto-start: a big diegetic button
  (the Heart pulses "ready") starts the next wave, HK's 6 s
  BETWEEN_DELAY replaced by player intent. Early-call bonus: +credits
  proportional to time saved (cap ~40), so confident players bank
  income. Idle guard: after 60 s of ready-state, the wave auto-calls
  (keeps the game moving; the number is a knob).
- **ASSAULT (action).** The heart tab's game, unchanged: ram fodder,
  shell the armored, hunt portals — while towers hold lanes. Kills
  pay bounty × streak regardless of who killed (tower, laser, ram).
  Portals still spawn per-wave; destroying them is still the win.

## 3. Modes and cameras (the switch must be trivial)

- **B / 🔨 pad button:** BUILD ↔ ACTION camera toggle, always
  available, eased transition (~0.6 s), no cut.
- BUILD camera: top-down orbit centered on the Heart pole, whole
  active hemisphere in frame; drag orbits, wheel/pinch zooms. (HK has
  5 camera presets; we ship 2 — build + the existing pov/third pair —
  and revisit presets later.)
- ACTION camera: the heart rig, untouched (V still toggles pov/third).
- **M / 🗺 pad button:** minimap swap — player-centric sphere map
  (as today) ↔ Heart-top-down threat view: fixed pole framing showing
  portals, enemy dots, tower range rings. Works in both modes; in
  BUILD the main view already IS the threat view, so the minimap
  defaults to player-centric there (and vice versa).

## 4. Towers on the sphere

Port all eight, HK configs verbatim (costs/dmg/rates), ranges re-based
from HK board units to CELLS (HK board ≈ 22 cells across → ×22, then
tuned in M5):

| tower | cost | dmg | range (cells) | rate/s | attack | special |
|---|---|---|---|---|---|---|
| Single Shot | 40 | 14 | 3.7 | 1.4 | single | — |
| Rapid | 70 | 7 | 3.5 | 3.0 | single | trail |
| Spread | 80 | 6 | 3.1 | 1.0 | spread | 5 pellets |
| Homing | 90 | 9 | 3.5 | 1.2 | homing | steers 6·dt |
| Slow | 100 | 4 | 3.5 | 1.0 | slow-field | ×0.45 for 1.6 s, hits ALL in range |
| AoE | 110 | 12 | 3.5 | 0.9 | mortar | splash 1.5 cells |
| Sniper | 130 | 62 | 7.0 | 0.7 | single | fast round |
| Laser | 220 | 18 | 5.3 | 1.5 | beam | hitscan |

- Upgrades: tier1 = 70% of cost, tier2 = 120%; per tier +55% dmg,
  +8% range, +10% rate; tier-2 specials (mortar +40% splash, spread
  +2 pellets, beam/homing +30% range, single +20% rate). Sell = 75%
  of total spent. (All HK-exact.)
- Damage model conversion: HK hp 20–500 vs our 1–6. Towers deal
  FRACTIONAL damage like our lasers: dmg_ours = dmg_HK / 90 (Single
  Shot ≈ 0.16, Sniper ≈ 0.69) — first-pass constant, M5 tunes.
- Slots = open cells; one tower per cell; tower cells are solid
  (unitBlocker) AND **block enemy pathing**: placement re-lays
  distToHeart (blastWall already proved per-event BFS is affordable).
  Guard: a placement may not disconnect any live portal from the
  Heart — validity check runs the BFS before committing; unreachable
  = red ghost. This is HK's maze-shaping translated to the open field.
- Placement flow (HK's, adapted): in BUILD, tap/click a cell →
  radial/palette with the eight towers + costs (unaffordable locked)
  → pick → ghost + dotted Braille range ring on the surface, green/
  red validity → confirm. Tap an existing tower → upgrade/sell panel
  (tier, next cost, refund). Keyboard: U upgrades the last-selected.
- Targeting: nearest alive enemy within range by chord distance,
  cooldown = 1/rate (HK's stepCombat). Projectiles fly the tangent
  plane like shells; mortar arcs via a normal-lift parabola; homing
  re-steers 6·dt; slow-field tethers everything in range instantly;
  beam is a drawn segment + immediate damage.

## 5. Economy (HK-exact where possible)

- START credit 190. Bounties per type imported (3–45; our roster
  already mirrors theirs). Streak ×(1+0.05·kills) cap ×5; resets when
  an enemy reaches the Heart (leak = heart damage here).
- Ram premium ×1.5 bounty: the action side must stay irresistible,
  and ramming carries personal risk towers never pay. (Open to
  tuning; flagged for operator.)
- Wave-clear reinforcement: HK's fraying grant (130 + wave·8) becomes
  a small every-wave clear bonus (20 + 4·wave) — steadier drip suits
  shorter TD rounds.
- Sphere-native income: CREDIT CACHES spawn far from the pole during
  assault (reuse reward-orb plumbing, new type 'credit', 25–60◆) —
  the hunt pressure that pulls the player out of the turtle.
- HUD: `♥ heart · ◆credit ·  ×mult · round/wave · portals` — one line
  extends the existing heart HUD; credit + multiplier get the glow.

## 6. Growing planet mode

Round r: points = 100 + 50·r, the 12-type intro schedule and
two-per-round unlock, exactly as the heart tab. Towers do NOT persist
across rounds (new sphere): on round clear, all towers auto-sell at
100% (not 75%) into the next round's starting credit — investment
carries as capital, not as furniture.

## 7. Implementation phases (each verifiable, each a commit)

1. **M0 extraction:** enemyspec.js / towers.js / economy.js + Node
   tests (targeting math, upgrade math, streak math); heart-tab
   consumes enemyspec.js — zero-behavior-change commit.
2. **M1 board + modes:** td-tab boots (copy), B toggle build/action
   cameras, M toggle minimaps, build-freeze between waves,
   `?mode=build` hook.
3. **M2 towers:** placement flow (raycast→cell, ghost, validity incl.
   connectivity guard), firing/targeting, projectile kinds, upgrade/
   sell panel. `?tower=key@cell` hook for headless checks.
4. **M3 economy:** credits/streak/bounties, costs, clear bonus,
   credit caches, HUD.
5. **M4 tempo:** call-wave button + early-call bonus + idle guard,
   grace beat, round-clear auto-sell carryover.
6. **M5 balance + polish:** damage-constant tuning, TD briefing cards
   (sprite icons), glossary additions, mobile pass, DEVLOG.

Estimated shape: M0 ~small; M1-M2 the bulk; M3-M5 incremental. Each
phase lands green before the next starts.

## 8. Decisions taken (flag if you disagree)

- Build-freeze only BETWEEN waves; during assault the toggle is
  camera-only. (Full anytime-freeze made build mode a combat pause
  exploit.)
- Towers block enemy pathing, with a connectivity guard.
- Ram premium ×1.5.
- The tank keeps its full kit (shells/lasers/ram) — TD is the
  superset mode.
- Waves are player-called with an idle auto-call at 60 s.
- Towers convert to capital between rounds (100% auto-sell).

## 9. Operator rulings (2026-08-23, answers received)

- **Aura: IMPORT.** TD jellyfish gains HK's aura (×1.4 speed to
  neighbors within range) — a support enemy you prioritize.
- **Heart HP is the one pool.** No separate lives counter.
- **Tanks are NOT invincible, and allies become PURCHASABLE UNITS.**
  This upgrades the economy design: ally tanks join the shop —
  mobile units bought with credits alongside static towers (cost TBD
  in M5, ballpark 150◆; they keep patrol AI + 2 hp; the player's own
  tank keeps its heart-tab mortality rules). The build palette
  therefore has two families: TOWERS (cell-locked) and UNITS (mobile).
- **Camera presets: yes, but the identity is the pair** — top-down
  build view and third-person in-the-fray are THE differentiation and
  get built first-class in M1; HK's other presets can arrive later as
  number keys without touching the core pair.

## 10. Mobile-first control baseline (prerequisite, shipped in heart)

Before TD work, the heart tab's mobile layer was rebuilt (operator
direction, 2026-08-23) and TD inherits it: two-handed hold — left
thumb steers left + drive rocker (▲ hold forward / double-tap cruise,
▼ reverse), right thumb steers right + two triggers (✦ shell,
⚡ laser); modals are height-capped and scrollable (iPhone briefing
was clipped); HUD compacted (shells row deleted — the turret rack is
the counter, ✦n kept for PoV). TD's build-mode button joins the
utility cluster (B / 🔨).
