# Per-group bloom — design

2026-08-28. Give the bloom a per-group INTENSITY so the board, the
enemies, the tank, the towers and the effects layer can each glow by a
different amount, tuned live.

## Why now

The single global bloom is one dial for a scene with very different
things in it. Turning it down to calm the board also flattens the
enemies; turning it up to make enemies pop smears the map. The vertex
blob fix (`88c114a`) removed the artefact that was making this worse,
but it did not create room to tune the layers independently — there is
still exactly one strength.

Note what this is NOT solving: the map reading too hot is now a *taste*
problem, not a bug. The duplicate-edge defect that made vertices blow
past the threshold is already fixed.

## The constraint that shapes everything

`UnrealBloomPass` is a full-screen post-process. It has no concept of
objects, so "bloom per group" is not a parameter — it is an architecture
choice. Three were considered:

1. **N bloom chains, one per group**, composited. Fully independent
   strength/radius/threshold. Costs ~4 scene renders + 3 mip chains.
2. **One chain, per-group weights** (chosen). Each group scales how much
   it CONTRIBUTES to a single bloom chain. One extra scene render, one
   mip chain. Shared radius/threshold.
3. **Per-group material brightness, no new passes.** Free, but glow is
   then welded to on-screen brightness: you cannot have a bright line
   that barely blooms, which is exactly what the map needs.

Chosen: **2**. The requirement is amount, not character, and the map case
specifically needs glow decoupled from brightness — which rules out 3.

## Verified mechanism

In the vendored r160 `UnrealBloomPass`, the final step blends the bloom
**additively over its input** and does **not** honour `this.clear` there
(read directly from `vendor/UnrealBloomPass.js`). So the pass output is
always `input + bloom(input)` and cannot be made bloom-only that way.

However the composite step writes the pure bloom into
`renderTargetsHorizontal[0]` *before* that blend, and that texture is
readable. Reading it gives a clean bloom-only source, so the final
composite is `scene + bloom(weightedScene)` with no scene term leaking
in. This is the whole basis of the decoupling and was confirmed in the
vendored source before the design was settled.

## Render path

Per frame, when bloom is enabled:

1. **Weight the scene.** Walk it once. For each object resolve its group,
   scale `material.color` by that group's weight (original saved). A
   weight of exactly 0 sets `visible = false` instead — cheaper than
   drawing black, and exact.
2. **Bloom render.** `RenderPass(scene, camera) -> UnrealBloomPass` into
   the bloom composer. Its output buffer is discarded; the pure bloom is
   taken from `renderTargetsHorizontal[0].texture`. The scene background
   is forced to black for this pass so the sky never contributes.
3. **Restore.** Put back every saved colour and visibility.
4. **Final render.** `RenderPass(scene, camera) -> AddBloom(tBloom) ->
   OutputPass`. The add is in linear space, before `OutputPass` does the
   colour-space conversion — the same place bloom is applied today.

Result: `output = scene + bloom(scene x weights)`.

A group's weight changes only how hard it glows, never how brightly it
draws. The map can stay bright cyan and barely bloom.

## Groups

Objects carry `userData.bloom = '<group>'`. The walk **inherits** the tag
into children, so tagging an enemy's root Group covers its whole dot
cloud. Untagged objects resolve to `effects`, so nothing silently
vanishes if a tag is forgotten.

| group | contents | start weight |
|---|---|---|
| `map` | floor, walls, edges, wall-top wires | 0.35 |
| `enemies` | enemy units, spawn-point gates | 1.30 |
| `tank` | the player unit | 1.00 |
| `towers` | placed towers | 1.00 |
| `effects` | projectiles, tracers, laser bolts, debris, bursts, lightning, orbs, rewards, the Heart, range ring | 1.00 |

`map` starts low because the board reading hot is the complaint that
prompted this; `enemies` starts high so they read against a calmed
board. Both are guesses, to be tuned by eye with the sliders and written
back here once settled.

Ally tanks are absent from this table because they were removed from the
TD tab in `d45020a`.

## Shared-material safety

Cross-group material sharing does not exist today — `units.js` builds
materials per unit and `td-tab.js` hoists only the two laser materials,
both `effects`. But if it ever appears, last-write-wins would be a
silent and baffling bug.

So the walk records the weight each material was assigned this frame and
**warns once** if the same material is seen under two different weights.
It fails loudly instead of quietly rendering the wrong thing.

## GUI

The existing `bloom` folder gains a `weights` subfolder with five
sliders (0..3 each), alongside enabled/strength/radius/threshold.
Persisted the same way the audio mixer levels are, so a tuning session
survives a reload.

## Testing

Pure and Node-tested in `test/bloomweights.mjs`:

- tag inheritance resolves down a parent chain
- an untagged object resolves to `effects`
- an explicit tag overrides an inherited one
- weights clamp to a sane range
- the shared-material conflict detector fires on two weights, stays quiet
  on one

The composite path itself is verified by headless before/after
screenshots at a fixed seed and camera, as with the last two render
fixes. Note what that can and cannot show: it proves the path renders
and that weights visibly change the image; it cannot tell you the values
are *good*.

## Cost, honestly

**Two scene renders per frame instead of one.** The bloom mip chain — the
expensive half — is unchanged, so this is well short of 2x overall. The
scene is light: four merged board meshes plus per-entity objects.

Phones are the risk. They already run bloom at `scale: 0.5`, and this
adds a full second geometry pass. No mitigation is being built up front:
if it bites, the fallback is to keep the single-composer path on coarse
pointers and lose per-group weighting there. Measuring beats
pre-optimising, but the risk is named so it is not a surprise.

Headless cannot measure frame time here — virtual time does not advance
`performance.now()` — so any perf claim must come from a real browser.

## Out of scope

Per-group radius or threshold (that needs multiple chains). Bloom in the
other tabs — `postfx.js` is shared, so battle/heart/tank3 keep the
current single-weight behaviour by defaulting every object to `effects`
at weight 1.0, which reproduces today's output exactly.
