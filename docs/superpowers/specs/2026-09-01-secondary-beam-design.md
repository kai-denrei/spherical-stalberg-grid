# The secondary becomes a beam — design

Date: 2026-09-01
Status: awaiting operator review
Scope: `src/td-tab.js` (the laser system), `src/beamfx.js` (vendored), the
renderer's tone mapping.

## The change

The tank's secondary stops being a stream of travelling bolts and becomes
**two continuous beams in an inverted V, meeting at an apex ahead of the hull**,
pulsing through one burst envelope tied to the heat clock.

## Already done

- `src/beamfx.js` — vendored **verbatim** from the lab (`beam-2026-09-01`).
  One edit: the bare `'three'` specifier became the vendored path, so
  re-porting a newer preset stays mechanical. **The vendor import must never
  carry a `?v=` token** — a tokened vendor URL loads a second copy of three.js.
- `docs/beam-2026-09-01.recipe.md` — the method, not just the numbers.
- `assets/beam-2026-09-01.json` — the preset.

API: `createBeam(start, end, overrides) → { mesh, uniforms, update(t),
setEndpoints(a, b), setAlpha(a) }`. `setAlpha` is the hook this design drives.

## THE BLOCKING FINDING: there is no tone mapping

The recipe is explicit:

> Render with ACES filmic tone mapping (exposure 1). Intensities above 1.0 then
> roll off into white at the core while the fringe keeps its hue, which is most
> of the plasma look. **Without tone mapping the same values just clip flat.**

**This project sets no tone mapping anywhere.** `grep toneMapping src/*.js`
returns nothing. So dropping the beam in as-is will not look like the lab —
the intensity-8 core will clip to flat white instead of blooming into it.

This is not a detail to discover during polish. Either:

- **(a) Enable `ACESFilmicToneMapping` with exposure 1 on the renderer**, and
  accept that it re-grades *the entire game*. Every look, every material, the
  Braille clouds, the CRT palette. That is a significant visual change and
  needs the operator's eye on it before anything else is built.
- **(b) Keep the renderer as-is and re-tune the preset** to sit inside the
  existing range — a different beam from the one in the lab, tuned here.

There is also the **bloom chain** to consider: `postfx.js` runs an
`EffectComposer` with `RenderPass → UnrealBloom → OutputPass`, and tone mapping
must be applied at the right point in that chain or it will fight the bloom.
This project has already been bitten once by the composer silently discarding a
renderer setting (`antialias: true`, found in review).

**Recommendation: settle this first with a spike.** It is the difference
between the effect the operator built and a different one.

## Geometry: the inverted V

Two beams from the two existing gun tubes, converging on a single apex ahead of
the hull.

- Emitters: the gun world positions, as today (`gun.getWorldPosition`).
- Apex: a point on the tangent plane ahead of the hull at the beam's reach.
- Both beams therefore **share one endpoint** and splay back to their tubes —
  the inverted V, meeting at the apex.

**Derive the apex from the render transform, not from a stored heading.** The
guns' world quaternions are the source of truth for where the tank is aiming
(the standing rule in this repo, learned three times). The apex is the point
where the two toed-in tubes already converge, so the V is not an invention —
it is the geometry the model was authored with, drawn.

Apex distance should be the current `maxDist = 2.6 * cellSide`, so the weapon's
reach does not change silently along with its appearance.

## The burst envelope

The operator's shape:

> starts at intensity 0.00, at midpoint hits 8.00, back to 0.00, then it turns
> off and cools — same red-hot effect.

So one burst is a **bell**, not a square wave, and its length is the heat
budget:

```
burst length  = LASER_MAX_HEAT (2.4 s today)
intensity(x)  = 8.0 * sin(x * π)      for x = 0..1 across the burst
                → 0 at both ends, 8.00 at the midpoint
then           lockout, cooling at LASER_COOL (1.4/s) as today
```

Driven through `setAlpha()` — or better, through `uGlowIntensity`, since the
operator specified *intensity* rather than opacity, and the two behave
differently under bloom.

The existing diegetic tell stays: the mid-barrel sleeve already tints
cyan → red with heat, and it will now rise and fall with the bell rather than
with a held trigger.

**Open question:** does holding the trigger re-trigger a second burst
immediately after cooling, or does each burst need a fresh press? A held-key
loop risks becoming the old continuous weapon with extra steps.

## Damage: the part that is not cosmetic

Today the secondary is a **projectile** system: bolts at `LASER_RATE` 0.14 s,
`LASER_DMG` 0.4 each, travelling at 5.2 cells/s to `maxDist` 2.6 cells.

A continuous beam is **hitscan**, and that is a real balance change, not a
reskin:

- Damage becomes per-second along the beam rather than per-bolt on contact.
- It should scale with the intensity bell, so a burst's peak is its midpoint —
  the visual and the damage telling the same story.
- Total damage per burst should start by matching today's: a 2.4 s burst at
  0.14 s intervals is ~17 bolts × 0.4 ≈ **6.8 damage**. Integrating the bell
  to that total keeps the weapon's role unchanged while its feel changes
  completely.
- The unrammable-tier rules and `?autofire` behaviour are unaffected — those
  live in `src/autofire.js` and key off directive, not delivery.

**The apex matters for targeting.** Two converging beams means the damage
volume is a V, not a line. Simplest honest model: test enemies against each
beam segment independently, so standing in one arm is enough to be hit.

## What must not change

- **Reach** — `maxDist` stays, so the weapon's role is unchanged.
- **Heat and lockout** — `LASER_MAX_HEAT`, `LASER_COOL`, the full-cold lockout
  rule, and the gun-tube tint.
- **The trigger** — Shift on desktop, the ⚡ pad on touch.
- **Auto mode's secondary rule** — lasers in every directive except RAM, where
  they answer only the unrammable tier. Tested in `test/autofire.mjs`; those
  tests must stay green.

## Verification

- **`?beamprobe=1`** — sample the envelope across a burst and assert the shape:
  0 at both ends, 8.00 at the midpoint, monotonic on each side, and burst
  length == `LASER_MAX_HEAT`. Bell-vs-square is invisible in a screenshot.
- **Apex geometry** — assert both beams share an endpoint and that the apex sits
  at `maxDist` along the hull's derived forward, taken *from the gun
  quaternions*. This is the class of bug this project has hit three times.
- **Damage parity** — a Node check that the integrated bell over one burst
  equals the old per-bolt total within tolerance, so the change is a re-feel
  and not a stealth buff.
- **Negative controls on all three.** A probe that cannot fail proves nothing.

## Build order

1. **The tone-mapping spike.** Decide (a) or (b). Everything downstream depends
   on it and it re-grades the whole game.
2. **Geometry** — two beams, apex derived from the gun transforms, no envelope.
3. **The envelope** — the bell on intensity, tied to the heat clock.
4. **Damage** — hitscan with parity against the old total.
5. **Delete the projectile path** once the beam is doing the job.
