# TD deliberate waves + stargate-only portals — design

2026-08-25. Make TD progression legible and deliberate: wave N = N enemy
types + N tower types, with a clear next-wave preview and a progression
payoff. And lock portals to the stargate model. All in the TD layer
(td-tab.js + towers.js + enemyspec.js + creatures.js/units.js + styles.css),
plus a Node-tested pure wave-plan.

## Decisions (from brainstorm, all approved)

1. **Wave is the single progression ladder.** Enemy types AND tower types
   both key off the `wave` counter, decoupled from `round` (which stays a
   purely spatial sector system). Wave 1 = 1 enemy type + 1 tower; wave N =
   `min(N,12)` enemy types + `min(N,8)` towers.
2. **Wave trigger = auto-timer + a prominent countdown/preview.** (Not a
   player-called button.) `waveEvery` unchanged (16s default).
3. **Wave contents = "newest headlines + a few."** The newest type in bulk +
   a seeded sprinkle of ≤2 earlier types.
4. **Sectors kept, decoupled.** Clearing all portals still triggers the
   reveal + world-growth; it no longer gates towers or enemy types.
5. **Portals are type-agnostic neutral stargate sources.** A sector holds a
   bounded set of stargate portals; each wave every portal emits the wave's
   mix (round-robin). Per-type portal colour is dropped; enemies keep their
   own tints.
6. **Stargate only.** Drop the torii/moongate/torus portal shapes, the shape
   param, and the GUI dropdown.

## Verified integration map (from recon)

- `wave` (td-tab.js:185, timer via `waveClock`/`waveEvery`) and `round`
  (196, sector reveals) are orthogonal today. Tower unlocks key off `round`
  (`unlockedTowerKeys(round)`, towers.js:112); enemy intros key off `wave`
  gated by `introCount()=min(12,2+2·round)` (td-tab.js:209).
- `spawnWave` (td-tab.js:2209): `wave++`; finds `INTROS` entry for the wave,
  `addSpawnPoint(intro.type)` (creates a NEW per-type portal), spawns copies
  of that type across all portals. Density tiers inline: boss 1, heavy
  `base/3`, rammable `base·1.4`, else `base/2`; `base = waveSize + wave +
  2·(round−1)` (2219). Defaults `waveSize:4`, `waveEvery:16` (61-62).
- Portals: `buildPortalObj(type,ci,phase)` (3254) → `makePortalCloud(cols,
  phase, params.portalShape)` (units.js:644) → `portalPts(shape,1150)`
  (creatures.js:351, branches torus/stargate/torii/moongate). Shape via
  `params.portalShape:'torus'` (54) + GUI dropdown (3493) + `reshapePortals`
  (3284). Portal tint `CREATURE_TINTS[type]`.
- `announceWave(intro)` (1923-1945): 4.2s "NEW THREAT" card w/ spinning
  model. Sector card (3475-3482) 3.2s. HUD (1839): `R{round} · wave {wave} ·
  hostiles {alive} · portals {a}/{b}`.
- Tests: `test/tdcore.mjs` asserts the round-keyed tower ladder (104-129) and
  the 12-type intro schedule (15-30).

## Section A — wave-plan + ladders (pure, Node-tested)

**`towers.js`.** Replace the round-keyed cumulative ladder with a
wave-keyed **1-per-step** ladder in the existing order:
`ORDER = ['single','rapid','spread','slow','homing','aoe','sniper','laser']`.
- `unlockedTowerKeys(wave)` → `ORDER.slice(0, clamp(wave,1,8))`.
- `towerUnlockWave(key)` → `ORDER.indexOf(key)+1`.
Wave 1 = `['single']`; wave 8+ = all 8. (Keep the same param name shape so
call sites just pass `wave` instead of `round`.)

**`enemyspec.js`.** Add a pure, deterministic
`computeWavePlan(wave, round, waveSize)` → `{ headline, entries:
[{type,count}] }`:
- `A` = first `min(wave,12)` INTROS types (in intro order).
- `headline` = `A[A.length-1]` (newest).
- supports = seeded pick of ≤2 distinct types from `A\{headline}`
  (mulberry32 seeded on `wave`; wave 1 → 0, wave 2 → 1, wave ≥3 → 2).
- `base = waveSize + wave + 2·(round−1)`; `density(t,b)` = boss→1,
  heavy→`ceil(b/3)`, rammable→`round(b·1.4)`, else→`ceil(b/2)`.
- headline count = `density(headline,base)`; each support = `max(1,
  round(density(t,base)·0.4))`.
- `entries` = headline first, then supports. No `Math.random`.
Also export `typesByWave(wave)` = `A` (for the glossary/preview if needed).

**`test/tdcore.mjs`.** Rewrite the tower-ladder asserts for the wave-keyed
1-per rule (wave 1 = [single]; wave 2 = [single,rapid]; wave 8 = all 8;
`towerUnlockWave('laser')===8`, `single===1`). Add `computeWavePlan` asserts:
headline is the newest available; entries length = `1 + supportsCount`;
supports ⊆ earlier types and never include the headline; determinism (same
inputs → same plan); all counts ≥1; wave-1 plan is a single type.

## Section B — portals: stargate-only, type-agnostic sources

- **`creatures.js`:** `portalPts(n)` returns the stargate geometry only
  (drop the `torus`/`torii`/`moongate` branches and the `kind` arg; keep the
  stargate body). Leave `torusPts` (used elsewhere? verify — if only portals
  used it, remove) intact if referenced by other tabs.
- **`units.js`:** `makePortalCloud(cols, phase)` always builds stargate.
- **`td-tab.js`:** remove `params.portalShape` (54), the GUI dropdown (3493),
  and `reshapePortals` (3284) + its call. `buildPortalObj(ci, phase)` drops
  the `type` param; portals render with a **neutral** tint (e.g. the current
  stargate default `{body:0xcfd8ff, hi:0xffffff}`), not `CREATURE_TINTS`.
- **Agnostic sources:** portals are spatial, not type-bound. `spawnWave` no
  longer creates a portal per new type. Portals are seeded at sector start:
  round 1 seeds a small fixed set (2), and `expandRound` adds a small fixed
  set (2) of neutral portals at the new frontier (reusing the existing
  placement). Victory/expand still = "all portals cleared" (unchanged).
  Each wave spawns its `computeWavePlan` entries **round-robin across all
  live portals**.

## Section C — spawn rewrite (td-tab.js `spawnWave`)

- `wave++`. `const plan = computeWavePlan(wave, round, params.waveSize)`.
- For each `{type,count}` in `plan.entries`, spawn `count` enemies, assigning
  each to the next live portal round-robin (keep the existing per-enemy
  construction/shape-parity with the live factory).
- **New-type reveal:** if `plan.headline` is a type not seen before this run
  (track a `Set seenTypes`), play the existing `announceWave` "NEW THREAT"
  card for it. (Intros ungated — `introCount()` gate removed; a type is
  "introduced" the wave it first headlines.)
- **Tower-unlock toast:** if `wave ≤ 8`, the wave unlocks tower
  `ORDER[wave-1]` → fire a `NEW TOWER · {name}` toast (Section D).
- Keep the wave clock, freeze rules, and `waveEvery` unchanged.

## Section D — anticipation + progression UI

- **`#td-next` preview strip** (new element, top-center, styled like the
  announce card). Shown whenever a wave isn't mid-reveal and the round is
  live. Content, updated each frame:
  - `NEXT WAVE {wave+1} · {ceil(waveEvery − waveClock)}s`
  - a chip row from `computeWavePlan(wave+1, round, waveSize)`: headline
    first (bold, ◈), then supports; each `● {name} ×{count}` with a swatch
    coloured `CREATURE_TINTS[type]`.
  - **Frozen** (build/reveal): clock paused → `NEXT WAVE {n} · ready` + the
    same list + hint `leave BUILD to engage`.
- **New-tower toast:** a distinct DOM slot (own element or a themed variant
  of the announce card), `NEW TOWER · {name}` with the tower's dotted icon
  (`spriteShot`), build-cyan/gold, ~3s — separate from the enemy card so
  they never collide.
- **HUD** leads with the wave: `WAVE {wave} · {unlocked}/8 towers · portals
  {a}/{b} · R{round}` (`unlocked = min(wave,8)`).
- The shop's locked-tower label flips `R{towerUnlockRound}` → `W{towerUnlockWave}`;
  footer hint "more unlock as you expand" → "one new tower each wave".

## Section E — testing, scope

**Files:** `towers.js`, `enemyspec.js`, `test/tdcore.mjs`, `creatures.js`,
`units.js`, `td-tab.js`, `styles.css`, `HOW-IT-WORKS.md`, `DEVLOG.md`.

**Testing.** `computeWavePlan` + the wave-keyed ladder are pure → Node-tested
in `tdcore.mjs` (the invariant guard). The spawn/preview/toast/portal render
layer is headless-verified (SwiftShader + `--enable-logging=stderr`, :8144):
- `?tutorial=0#td` — the `#td-next` preview strip shows `NEXT WAVE …` with an
  incoming chip list; HUD leads with WAVE; no JS errors.
- `?wave=1#td` / `?wave=8#td` (existing debug hook) — screenshots confirm the
  spawn mix (wave 1 single type; wave 8 headline + a few) and portals render
  as stargate; a tower-unlock toast appears at an unlock wave.
- `?tutorial=1#td` — the tutorial still runs (its scripted portal path must
  survive the agnostic-portal change; verify).
- No error tokens; `./scripts/bust.sh --quiet` after edits; `npm test` green.
  DEVLOG + HOW-IT-WORKS updates.

## Out of scope

- Player-called "call wave" button (chose auto-timer + countdown).
- Retiring sectors, or tying them to wave milestones (kept portal-clear).
- Per-type coloured portals (dropped for agnostic neutral stargate).
- Rebalancing enemy stats/economy beyond the new spawn-count rule.
- The deferred cinematic lock-screen camera.
