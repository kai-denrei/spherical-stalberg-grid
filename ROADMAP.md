# Roadmap

Where this is going, and what is knowingly unfinished. Newest thinking at
the top of each section. This page is meant to be argued with — if an item
looks wrong, it probably is; use the ⧉ button and send it back.

Three honest labels are used throughout:

- **Committed** — decided, scoped, and next in line.
- **Candidate** — wanted, but the design call has not been made.
- **Question** — we do not yet know the right answer, and guessing would cost more than asking.

---

## Now

The tower-defence tab is the active front. Everything else is maintained,
not advanced.

| area | state |
| --- | --- |
| board + collision + nav | done; one grid serves all four roles |
| tank (mkcx), feel, sound | done; tuned against the unit viewer |
| towers, looks registry | done; swapping a tower's visual is non-destructive |
| waves, economy | wired but **untuned** — see Pacing below |
| tutorial | runs on a deliberately small board (400–600 points) |

---

## Committed

### Tank feel, tuned rather than derived

Model scale, tint strength, bloom weights and audio levels were *derived* —
reasoned from durations, fire rates, RMS envelopes and measured geometry —
not judged by eye or ear. Several have already been corrected on sight.
Every one is now a live control, because a derived value is a starting
point and nothing more. What remains is a deliberate looking-and-listening
pass with those controls in hand.

### One knob schema for the whole feel layer

Today the game holds its own hover parameters and the unit viewer reads the
module defaults, so tuning in the viewer changes nothing that ships. The
knob *schema* moves into `tankfeel.js` and both surfaces build their UI from
it, mutating one shared object — with a copy-as-code button so a good
setting reaches the repo instead of dying in one browser.

### Wave pacing as a curve

Cadence and intensity are hand-set constants (`waveEvery` 16 s, a size
formula) that have never been tuned *as a curve*. The tutorial board is
also assumed to suit the whole unlock run, when only its opening sector has
actually been examined — whether waves 5–8 feel cramped on it is untested.

---

## Candidate

### Mode incentives

Nothing currently *forces* meaningful switching between the macro layer
(building, top-down) and the micro layer (the tank in the fray). The fear
is players camping one mode for the whole run. Levers on the table:
build-only information such as range previews and threat-map detail;
tank-only income; wave events only the tank can answer.

### Teaching through the world

The systems exist but teach themselves unevenly — the briefing text carries
far too much of the load and the world carries too little.

### Economy

Credit caches and purchasable ally units are specified and unbuilt. The
income and cost curves are untuned. An early-call bonus and a wave-clear
drip are already wired but no UI uses them.

### Larger boards, after the tutorial

The tutorial's small board is a deliberate choice. Post-tutorial scale is
named but not designed, and it runs into the generation cost below.

### Attract mode

A lock-screen cinematic flythrough of the sphere. Deferred until the TD
tutorial is settled — it should show the game as it will actually be.

### Installed-PWA / offline mode

True offline and no browser chrome. Blocked on a known conflict: a service
worker must key its cache names off the build token or it silently serves
stale modules and defeats the version badge. Small dedicated project — it
should not be bolted onto TD work.

---

## Ideas to test

- **Deliberate defect placement.** A closed quad sphere is topologically
  forced to contain irregular-valence vertices. Right now the merge
  scatters them. Seeding from a subdivided cube or icosahedron and
  jittering would trade organic randomness for controlled placement — worth
  building as a straight comparison.
- **Curvature-adaptive density.** Uniform cell area, or density varied by
  region for gameplay zones?
- **Incremental `mergeToQuads`.** Maintaining edge→triangle adjacency and
  updating per merge, instead of a full recount per pass, is the single
  biggest scale lever — expected ≥50× at n=4000, which brings 17k-quad
  boards into ~1 s. Prerequisite for 10k+ cell boards on mobile.
- **Generation in a Web Worker**, so the UI never freezes regardless of
  board size.
- **Surfaces other than the sphere.** Cube (curvature at eight corners),
  torus (zero net defect), arbitrary closed meshes. A domain abstraction
  would need exactly four operations: `samplePoints`, `triangulate`,
  `surfaceNormalAt`, `projectToSurface`.

---

## Known debt

- **The five board tabs are siblings, not a shared core.** grid, maze,
  organic, battle and heart are ~900-line cousins by copy-and-edit descent.
  Extracting a shared core is named debt, deliberately deferred while the
  tabs still diverge — extracting too early would freeze the wrong seams.
  Batch-patching them is a known-hazardous operation.
- **Mobile is verified by headless screenshots at 390 px, not by hand.**
  No real-device pass has happened. Headless also clamps windows to ~500 px
  and crops screenshots, so layout bugs must be diagnosed by logging
  `innerWidth`, never by looking.
- **Render-layer tests do not exist.** `npm test` covers grid topology,
  dungeon carving, creatures, units and the pure feel/audio/bloom modules.
  Nothing covers what is actually drawn.
- **At 30k+ quads**, per-frame `Float32Array` rebuilds (~8 MB/frame of
  allocation churn) become the render-side bottleneck before draw calls do.
  In-place buffer writes are the fix, if we go there.

---

## Questions

These are open on purpose. None has a default answer we are happy with.

- **Is the game the project now?** This began as a standalone grid proof of
  concept and is now a proto-game: six tabs, combat, a unit roster, several
  visual identities, a published site. The original phase-2 goals —
  corner-state dual layer, non-sphere surfaces, engine adaptation — have had
  no work since day one, and nothing in the current direction advances them.
  That is entirely fine if it is a decision. It is not fine as drift.
- **Is high defect density a feature or a problem?** Measured at n=600:
  ~21% of vertices are irregular, but most defects are *paired* and cancel.
  It is plausibly exactly what makes the grid look organic. Downstream
  corner-state tiling does not care about valence — multi-cell "special"
  pieces might.
- **What density is the target?** "Works on a sphere" at 200 cells and at
  20,000 cells are different engineering problems, because relaxation is
  iterative and global. No target has ever been stated.
- **Does relaxation stay stable near defect clusters over long runs?**
  Smoke tests run 60 iterations; the live view runs indefinitely. Quad
  flipping and creasing at high iteration and pull rates is unwatched.
