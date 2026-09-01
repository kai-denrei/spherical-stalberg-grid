# The First State — design

Date: 2026-09-01
Status: awaiting operator review
Scope: `src/td-tab.js` (TD tab only). Other tabs untouched.

## Problem

The TD tab has no canonical opening state. Four entry paths produce three
different results:

| Path | Today |
|---|---|
| Fresh page load | Placed beside the Heart, then **teleported** into a berth by an async callback |
| Retry after a loss | Placed beside the Heart and **left there** |
| Forced reset / new game | Same as retry |
| Hull loss mid-run | Berth respawn, then a hard `setView('orbit'); snapCamera()` cut |

Two root causes:

1. **Berth cells are chosen inside the async container-model callback.** At
   reset time the game does not know where the berths are, so it places the
   tank beside the Heart and repositions it later. That reposition is the jump
   cut.
2. **The staging guard is `t < 6`, and `t` is page-lifetime** — `t += dt` in
   `animate`, never reset by `regenerate()`. So only the first six seconds of
   the page's life ever stage the player at a berth. A retry three minutes in
   is never staged at all.

The berth *ordering* (`k = playerHP - 1` → #3, #2, #1) is already correct and
`syncLifeContainers` already leaves #3 empty from the first second. That rule
needs enforcing, not inventing.

## Vocabulary

Fixed names, used throughout the code and comments:

| Term | Meaning | When it runs |
|---|---|---|
| **CINEMATIC** | Aerial shot over the battlefield, diving toward Container #3 | First page load only |
| **DEPLOY** | The tank drives *entirely out* of Container #N, then full control | Every reset (full life → #3) and every hull loss (→ #2, then #1) |
| **DOWN DASH** | Large red `MK-CX DOWN!`; camera takes a fast path back to camp | Hull loss only |
| **camp** | The three-container berth row |

Containers are painted 1-2-3 left to right (`makeContainerFixture(bi + 1)`),
and `berths[i]` is Container #(i+1).

## The invariant

Everything hangs off one derived value:

> **`DEPLOY_START(N)`** — tank at rest inside berth #N, doors facing its stored
> exit, camera at the deploy framing.
>
> **Every prelude's last frame *is* `DEPLOY_START(N)`.** DEPLOY runs from it and
> ends in full manual control.

```
First page load:        CINEMATIC ──┐
Any full-life reset:  ──────────────┼──► DEPLOY_START(3) ──► DEPLOY ──► control
Hull loss:              DOWN DASH ──┴──► DEPLOY_START(2|1) ─► DEPLOY ──► control
```

One join point, three ways in. Brand-new game, browser reload, forced reset and
post-loss retry differ only in *which prelude runs* — never in what they land
on. That is what makes the state identical everywhere.

Note this resolves an apparent conflict: a browser reload is a first load, so
it *does* get the CINEMATIC. Consistency is a property of the **state**, not of
the prelude, and the invariant is what guarantees it.

## 1. Berth model (the enabling change)

Extract the berth-chain selection — currently ~50 lines inside
`preloadContainer().then()` — into a pure, synchronous `computeBerths()`.

- Inputs: `dungeon`, `graph` only. No model, no DOM, no async.
- Output: `berths = [{ ci, exit }, …]` in painted order #1, #2, #3.
- Called from the synchronous board build in `regenerate()`, so berth cells
  exist before any actor is placed.
- The selection logic itself is unchanged (distToHeart 3–4 chain, hard escape-lane
  requirement, openness as tie-break, `escapeOf` for the door direction). This is
  a **move, not a rewrite**.

Consequences:

- The tank is placed **once, correctly**, at reset. No retroactive teleport,
  therefore no jump cut.
- The container model load becomes purely decorative: build meshes at
  already-known cells. **It never touches player state again.**
- The CINEMATIC no longer has to wait for the berths to land, so the whole
  "hold the opening until the model arrives" mechanism goes away.

**Berth index rule:** `berthIndex = clamp(playerHP - 1, 0, 2)`. Full life (3) →
index 2 → Container #3; then #2; then #1. Covered by a Node test so it cannot
drift.

## 2. `camShot` — one timed camera override (Approach A)

All three timed camera overrides become instances of one primitive:

```js
startShot({ id, dur, poseAt(u), onEnd, skippable })
```

- Owns `camGoal` while active; `poseAt(u)` for `u ∈ [0,1]`.
- **One teardown path**, latched on its own flag and idempotent.
- The primitive installs and removes its own skip listeners.

Instances: **CINEMATIC**, **DOWN DASH**, and the existing **sector reveal**.

Rationale: every bug this week was a camera/state override with its own ad-hoc
teardown. The `endCinematic()` failure — a guard on `cineLeft` that the frame
loop had already zeroed, leaving a capture-phase `keydown` handler installed
that ate the whole keyboard — is *structurally impossible* once teardown exists
in exactly one place. This is the main reason Approach A was chosen over the
minimal version.

## 3. DEPLOY

Its own state. **Not `autoMode`, not `cruise`.**

```js
deploy = { active, berthIndex, u, dur }
```

**Start (`DEPLOY_START(N)`):**
- `player.cur = berths[N].ci`, `player.pos = centre`
- `player.heading = tangentDirTo(berths[N].ci, berths[N].exit)`
- `throttle = 0`, `cruise = false`, `autoMode = false`
- engine cold, then the deploy's own drive

**Run:** drives along the heading at a fixed pace until the hull is **entirely
out** — clear of the container footprint, not merely a changed cell index. The
release today fires on a cell change, which can leave the hull sitting in the
doorway; that is what "ENTIRELY OUT" is pointing at. The clearance distance is
derived from the container's actual placed depth plus the hull's half-length
plus a margin — **not a magic number**.

**Input:** DEPLOY is on rails for its duration (~0.9–1.2s). It ignores input.
Because `keys` is *held* state, a player already holding W drives the instant
DEPLOY hands over — no input buffering is needed.

**End:** manual control, `throttle = 0`, `cruise = false`, `autoMode = false`.
AUTO stays something the player chooses, always.

**Deploy framing:** a low three-quarter standing where the doors face, so the
hull rolls toward the lens — the framing today's cinematic beat 3 uses, kept
because it is the shot that reads. It is the *start* of the camera lerp below,
not a separate shot.

**Camera:** `lerp(deployFraming, gameplayPose, smoothstep(u))` where
`gameplayPose` is **read from `updateCameraGoal()`**, never re-authored. At
`u = 1` the two are identical, so the control handover changes nothing on
screen. "Last frame = first frame" becomes a property of the code rather than
something tuned until it looks right — this follows the CLAUDE.md rule about
deriving render-coupled values from the render transform.

This deletes `exitCruise` and `releaseExitCruise` entirely. That pair was one
of the confirmed dead-controls causes: a berth respawn left `cruise` engaged, so
the throttle lever read as dead.

## 4. The three preludes

**CINEMATIC** — first page load only, gated on a module-level flag (not on
`regenerate()`). Beat 1: aerial pull-back over the battlefield. Beat 2: dive to
Container #3, **ending exactly at `DEPLOY_START(3)`'s pose**. Skippable. The
current beat 3 ("watch the hull drive itself out") is **removed** — that drive-out
is now DEPLOY, live and under the player's hand a moment later.

**DOWN DASH** — hull loss, in three beats:

1. `MK-CX DOWN!` in large red over the wreck, for the existing `DEATH_HOLD`
   (1.15s). The wreck beat is kept; the banner gives it its voice.
2. The camera takes a fast path from the wreck back to camp (~0.8–1.2s),
   landing on `DEPLOY_START(N)`'s pose.
3. DEPLOY out of Container #N.

Replaces today's hard `setView('orbit'); snapCamera()` cut. **The sim keeps
running throughout** — unchanged from today, where `playerDown` stops the hull
but the war carries on. Your death does not pause the battlefield.

**NONE** — plain reset, retry, forced reset, new game: straight to
`DEPLOY_START(3)`. No modal (the briefing is opening-only and stays reachable
from pause).

## 5. Auto Mode — primary fire

One line in `autoGunner()`:

```js
const shellsForAll = params.directive !== 'ram';   // was: !== 'conserve' && !== 'ram'
```

Primary fire in every directive except RAM; RAM keeps today's restraint,
shelling only the unrammable tier it refuses to charge.

**Consequence to note:** `conserve` is labelled *SAVE AMMO* and will no longer
save ammo — it shapes movement only. The label overstates. Flagged for a
follow-up call; not resolved here.

## 6. Deletions

- `exitCruise`, `releaseExitCruise`
- Berth staging from the async callback: the `t < 6` window, `player.moves <= 1`,
  `stagedRun`, `berthStagings`
- `cinePending`, `beginOpening()`, and the `t > 5` safety net
- Ad-hoc `cineLeft` / `cineCi` / `cineAfter` / `cineOn` / `cineHold` state → folded
  into `camShot`
- The `driveFrozen = … || cineLeft > CINE_WATCH` partial-unfreeze special case
- `respawnPlayerAtSpawn`'s dual mode (berth vs heart-adjacent fallback) — every
  respawn is now a DEPLOY from `berths[clamp(playerHP - 1)]`, including the
  "entombed by a sector shift" redeploy

## 7. Verification

Every probe below must be run as a **negative control first** — with the fix
disabled — and shown to FAIL. A check that cannot fail proves nothing.

- `?deployprobe=1` — across all four reset paths, assert: start cell is
  `berths[playerHP - 1].ci`; heading is down that berth's stored exit;
  `autoMode === false`; `cruise === false`; and at DEPLOY end the hull is
  entirely clear of the container footprint.
- `?cineprobe=1` (extend) — the CINEMATIC's final pose equals `DEPLOY_START(3)`'s
  pose within epsilon, and a real keydown reaches the game after the handoff.
- Node test — berth index mapping: 3 hulls → #3, 2 → #2, 1 → #1.
- `npm test` green; `./scripts/bust.sh --quiet` then an atomic commit.

**Verification rule, learned the hard way this session:** no run may pass
`?cine=0` when the cinematic path is under test. A verification flag that
disables the feature under test is not a verification — that is precisely how
four green headless runs agreed on a build the operator could not play.

## 8. Risks

- **DEPLOY is on rails for ~1s.** This is the one thing that could read as
  "controls dead" again. Mitigations: short, visibly moving, and identical every
  time. The controls watchdog will not false-bark, since it only fires when the
  player is asking *and the tank is not moving*.
- **Berth selection moving out of the callback** must produce byte-identical
  cells to today's, or the camp relocates. The Node test pins the chain for a
  fixed seed.
- `conserve` labelling, above.

## Out of scope

Wider Auto Mode rethink (targeting, directive set, disengage rules, gunner range
and rate) — recorded as a separate backlog item, to be brainstormed on its own.
