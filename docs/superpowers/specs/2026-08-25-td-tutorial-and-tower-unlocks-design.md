# TD tutorial + progressive tower unlocks — design

2026-08-25. A guided onboarding for the TD tab (the default landing tab)
plus a lasting tower-unlock ladder that the tutorial introduces. Operator
ask: a scripted first-run tutorial (protect the heart, ram fodder, pick up
shells, kill the portal, then build towers) with towers unlocking over the
game.

## Decisions (from brainstorm)

- **Trigger:** the tutorial ALWAYS initiates on a fresh TD game; once seen
  (`localStorage['td.tutorialSeen']`), the opening banner shows a prominent
  SKIP button. `?tutorial=1`/`?tutorial=0` forces/suppresses for testing.
- **Unlock scope:** a PROGRESSIVE, lasting ladder (not tutorial-only) — it
  governs normal play too.
- **Unlock pacing:** by ROUND / sector. R1 `single`(normal)+`rapid` · R2
  +`spread`,`slow` · R3 +`homing`,`aoe` · R4 +`sniper` · R5+ +`laser`.
- **Locked towers:** shown DIMMED in the radial shop with their unlock
  round ("R3"), disabled — not hidden.
- **Architecture:** the unlock ladder is a PURE function in `towers.js`
  (Node-tested); the tutorial is an INLINE state machine in `td-tab.js`
  (too coupled to the closure for a clean separate module).
- **Failure-proof:** the heart cannot fall during the scripted phases.
- Rejected: opt-in-only / always-replace-round-1 triggers; tutorial-only
  or wave/enemy-paced unlocks; hiding locked towers; a separate tutorial
  module (leaky 20-field context).

## TD integration map (verified hook points)

- Waves: module vars `wave`, `waveClock`, `params.waveEvery` (16s);
  `spawnWave()` spawns from `spawnPoints[]`; `checkVictory()` clears when
  `wave>=introCount() && every portal !alive && every enemy !alive`. The
  wave-clock block fires `spawnWave()` when `waveClock>=waveEvery`.
- Heart: `dungeon.heart` (cell index); `dungeon.distToHeart[]`. Player
  starts at `dungeon.spawn` (far cell) in `regenerate()` — override
  `player.cur/pos/prev/next/prog/heading/travelDir/smoothDir/segLen` for a
  near-heart start (copy the regenerate init block).
- Enemies: `ENEMY_SPEC` (12 types); `phage` = wave-1 fodder (hp 1,
  rammable). Enemy object shape at td-tab.js spawn loop; ram kill =
  `killCreature(e,true)` free; shell kill via `damageEnemy`.
- Shells: `ammo` (start 3, `AMMO_MAX` 9); `spawnOneOrb()` places a
  bullet-triad at a cell (+3 on pickup via `absorbOrb`); `fire()` guards on
  `ammo<=0`. Set `ammo=0` + suppress orbs for the tutorial; `spawnOneOrb()`
  at chosen cells for the scripted pickups.
- Portals: `spawnPoints[]` entries `{type, ci, hp:3, obj, alive, found,
  mapMarker}`; `buildPortalObj(type, ci, phase)` builds the mesh;
  `recomputePortalDist()` after manual insert. hp-- per shell, dies at 0.
  Win = all portals dead.
- Build: `buildMode` + `toggleBuild()` (B / `#td-pad-build`);
  `placeError(ci)` returns null when legal (`tdFullTags[ci]===BLOCKED` &&
  borders an open cell). Enumerate legal cells by scanning `placeError`.
  `openShop()` builds the radial from `TOWERS.map(...)` — filter it.
  `TOWERS` keys: single, rapid, spread, homing, slow, aoe, sniper, laser.
- UI: `showBriefing()`/`#td-msg` freezes (paused). `announceWave()`/
  `#td-wave` is a non-freezing auto-hiding banner. `paintCell(ci, rgb)`
  writes the floor color buffer (used by `pulseHint`); restore via
  `floorColorOf(ci)`. No button-pulse CSS exists yet.
- Determinism: `whim`/`orbRng` are seeded mulberry32; scripted spawns are
  reproducible when driven synchronously.

## Section 1 — the unlock ladder (pure, tested)

Add to `towers.js`:

- `TOWER_UNLOCKS` — the schedule, e.g. rounds → newly-unlocked keys:
  `{1:['single','rapid'], 2:['spread','slow'], 3:['homing','aoe'],
  4:['sniper'], 5:['laser']}`.
- `unlockedTowerKeys(round)` → the CUMULATIVE set available at `round`
  (round clamps to ≥1; ≥5 returns all 8). Order preserved cheap→capstone.
- `towerUnlockRound(key)` → the round a key unlocks (for the "R3" label).

`td-tab.js`:
- `openShop()` filters `TOWERS` by `unlockedTowerKeys(round)`. Unlocked →
  normal radial item. Locked → dimmed, disabled, labeled with
  `towerUnlockRound(key)` ("R3"). A one-line shop-centre note: "more unlock
  as you expand."
- During the tutorial's BUILD phase, `round` is 1, so the shop naturally
  offers only normal+rapid — the ladder IS the tutorial's tower gate.

Tests (`test/tdcore.mjs`): R1 == `['single','rapid']`; the set strictly
grows round to round; all 8 unlocked by R5; `laser` unlocks last (R5);
every tower key appears exactly once in the schedule;
`unlockedTowerKeys(0)`/negative clamp to R1; `towerUnlockRound` agrees with
the schedule.

## Section 2 — the tutorial state machine (inline in td-tab.js)

A `tutorial` object with `phase` and a per-frame `tick(dt)` called from the
animation loop while `tutorialActive`. Normal wave-clock spawning is gated
off (`if (!tutorialActive) { …waveClock… }`). Phases:

**SETUP** (on start, after `regenerate()`):
- Player → a near-heart cell (`distToHeart` 2–3, nearest available; a few
  hops so the fodder are visibly threatening the heart), copying the
  regenerate player-init block for consistent heading/segments.
- `ammo = 0`; `clearOrbs()`; suppress normal orb spawns.
- Push ONE portal into `spawnPoints[]` at a near-heart cell (hp 3,
  found=true, via `buildPortalObj`); `recomputePortalDist()`.
- Push 3 `phage` fodder into `enemies[]` from that portal cell.
- Banner "PROTECT THE HEART!" (brief centered flash); pulse `#td-pad-fire`;
  callout "Shoot or RAM the enemies!" (no shells yet → RAM works).

**RAM** → wait until the 3 tutorial fodder are all dead. Heart guard
absorbs any that reach it.

**SHELLS** (fodder cleared) → `spawnOneOrb()` at 3 cells beside the player;
callout "Pick up the shells to destroy the portal — it takes 3 shots."

**PORTAL** → player collects shells (`ammo→3`), shoots the portal; wait
until the tutorial portal `hp<=0`. Wave 1 done.

**BUILD** (portal destroyed):
- Banner "Build Towers"; a real `spawnWave()` brings a 2nd portal + a small
  normal wave (war now live).
- Pulse `#td-pad-build`; callout "Towers go on HIGH GROUND, near the edge."
- Animate legal spots: collect `placeError(ci)===null` cells near the
  frontier, `paintCell` pulse ~2.5s, restore via `floorColorOf`.
- Shop gated to normal+rapid (ladder round 1). Ensure starting credits
  cover them (opening purse ~170c ≥ 40+70).

**HANDOFF** → on the FIRST tower placed (or wave-2 cleared, whichever
first): `tutorialActive=false`, `td.tutorialSeen=1`, restore normal wave
clock + orbs, lift the heart guard. Normal TD continues, ladder-governed.

**SKIP** (any phase, only offered once seen): tear down tutorial-only
entities (scripted portal/fodder/orbs), restore normal state, set the flag,
start a normal round.

## Section 3 — UI, testing

- **Callouts:** non-freezing `#td-wave`-style banners; advance on the
  phase's success condition, not a bare timer (a slow player is never
  rushed). "PROTECT THE HEART!" is a larger brief centered flash. A small
  Skip control shows only after first-seen.
- **Button pulse:** new `@keyframes tutorial-pulse` (soft neon
  box-shadow/scale) + `.tutorial-pulse` class, toggled on `#td-pad-fire`
  then `#td-pad-build` per phase, removed on advance. Tron accent colors.
- **Legal-spot animation:** `paintCell` pulse of the current legal cells,
  restored with `floorColorOf` (the `pulseHint` restore pattern).
- **Shop gating UI:** dimmed disabled locked items with unlock-round label;
  shop-centre note.
- **Determinism:** scripted spawns driven synchronously so `?tutorial=1`
  reproduces.

**Verification:** Node tests for `unlockedTowerKeys`/`towerUnlockRound`.
Headless (SwiftShader + `--enable-logging=stderr`): `?tutorial=1` stepped
via `?tick`, screenshot each phase, assert phase banners + scripted
entities; `?tutorial=0` skips cleanly and normal play is unaffected. `npm
test` green; `./scripts/bust.sh --quiet` after edits (committed atomically
— the pre-push token guard enforces it). DEVLOG + HOW-IT-WORKS entries.

## Out of scope

- Audio/voiceover; a full help/replay menu (just Skip + `?tutorial=`).
- Tutorializing later mechanics (lasers, sector expansion, armored-vs-ram)
  beyond wave 1–2.
- Enemy/economy rebalance — only tower AVAILABILITY changes (the ladder).
- td-tab.js size debt (already 3555 lines; shared board-core extraction
  stays deferred — the tutorial adds one focused block, not a refactor).
- Mobile-specific tutorial layout beyond the existing responsive HUD.
