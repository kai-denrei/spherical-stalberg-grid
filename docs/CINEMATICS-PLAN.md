# Cinematics — research and plan

Operator, 2026-09-03: three self-contained cinematics, each using one of our
engines "to the fullest". (A) **THE GATE** — the portal at higher resolution
with weathered metal, the wormhole at its highest quality and full screen,
higher-quality aliens passing through. (B) **THE PLANET** — a full view with
beautifully rendered galaxies behind it. (C) **THE TANK** — large, firing
shells, high-render plasma, a better hull texture. Research first; this is
it. Nothing here is built yet.

## 0. What "self-contained" buys, and what it costs

A cinematic is not the board. It has its own scene, its own clock, its own
camera rail, and no game state — which is exactly what lets it spend a whole
frame budget on one effect. The cost is that anything it shows that differs
from the game (a textured hull, a solid alien) is a second version of that
thing, and second versions drift. The plan's answer: **every cinematic draws
the game's own assets and engines at a higher tier**, never a parallel
asset. Where a cinematic wants something the game does not have (PBR maps,
a solid alien), it is added to the asset or engine and the game may use it
at its own tier later. That is the same rule the beam lab and the portal
bench follow ("a tuning surface must be a client of the thing it tunes").

## 1. Inventory — what exists, measured where it has been

| engine | what it is today | headroom | the gap for a cinematic |
|---|---|---|---|
| **Wormhole** (`src/fx/wormhole.frag.js`, `portalfx.js`, `#portal` bench) | raymarched disc, preset 120 steps × 12 octaves, board 384px @ 30 Hz on one shared target (94M–212M sine-folds/frame by tier); bench 512 @ 60 | steps/octaves/exposure are uniforms; twist, hue spread, travel phase integrated by the host | **full screen**: 1080p × 120 × 12 = **3.0 G folds/frame** (16× the bench). Real-time at 30 fps is borderline on the M4; 4K is offline only |
| **Portal ring** (GT-9, `blueprint-to-life/src/portal`, cast in `units.js`) | three counter-rotating arc rows, 8 pod mounts, one accent channel; flat-shaded `MeshStandardMaterial`, grey repaint ladder, no textures | `arcSegment` takes a segment count; every mesh carries uv/uv1/uv2 (the sibling's invariant), so textures map | no PBR maps, no environment to reflect, no shadows, no AO |
| **Galaxies** (`galaxyseed.js`, `galaxybake.js`) | seeded field: 300k galaxy stars + 24k dust + 2.6k field stars, 2 galaxies, palettes; **baked to a cubemap** for the board (+0.23 ms/frame at 1×; live sprites cost 3–5 ms) | live mode exists (it is what the bake renders); seed, count, scale, core are parameters | the bake is board-sized; a cinematic wants a 2048-face bake or the live field for parallax, and bloom on the cores (the board deliberately excludes the sky from bloom) |
| **Planet** (the grid: `grid.js`, `dungeon.js`, the neon wire look) | the game's identity: dark body, additive wire edges, 1-px GL lines | the sphere pipeline is resolution-independent (`?points=`) | no atmosphere, no wide lines (1-px lines vanish at 4K), no terrain material |
| **Tank** (MK-CX/2 GLB, `units.js`) | flat PBR colours, edge outlines, health-tinted glow material, heat sleeves, recoil, shell tracer (`makeBulletCloud`), muzzle callout | the model has UVs; `Turret_Pivot`/`Barrel_Pivot` articulate; the beam rig is a module | no hull texture, no environment, no muzzle flash light, no smoke |
| **Plasma** (`beamdraw.js`, `#beam` lab) | core ribbon + plume points, BOARD_PRESET, per-rank colour ladder, sweep, drag | points count, plume length/width, core width are knobs; the lab is a full client | no heat-haze distortion, no light cast on the hull |
| **Post** (`postfx.js`) | UnrealBloom with per-group weights, OutputPass; vendored three **r160** | the sibling's node_modules carry r160-compatible `GTAOPass`, `SSAOPass`, `SMAAPass`, `TAARenderPass`, `BokehPass`, `FilmPass`, `SSRPass` — vendorable one file each | none vendored; no AA beyond MSAA (the phone tier turns it off) |
| **Lighting** | hemi + two directionals; no shadow maps, no environment map | `castShadow` is already set on the authored meshes | the renderer never enables shadows; nothing reflects |
| **Aliens** (`makeDotEnemy`, the Braille clouds) | 2-px point specks at battlefield density; the game's whole enemy read | the generators are `[x,y,z]` functions (`~/Dev/Braille`, ~200 shapes) | **no engine for "high quality"** — this is the one thing with nothing behind it |
| **Camera** (`startShot`/`poseAt`, the cold open) | a shot is `poseAt(u, out)` over a duration, with beats; `?cine=N` scrubs and holds | the pattern generalises to a rail of keyframes | the rail is code per shot, not data; no fixed-step clock |
| **Capture** | headless SwiftShader screenshots; `preserveDrawingBuffer` for the glossary | Chrome over CDP (the sibling's `scripts/shot.js` drives it with no puppeteer) | no frame-sequence capture, no video encode |

## 2. What good practice says, applied here

1. **Render offline, play back in-app.** The 16 GB machine cannot run a 4K
   wormhole at 60 fps, and does not need to: a cinematic has a fixed clock,
   so it can be rendered at any quality at seconds per frame and encoded to
   video. The in-app version plays the same rail at the real-time tier. Two
   tiers, one rail, one scene — the decision that makes everything else
   affordable.
2. **A fixed-step clock, not `performance.now()`.** `?frame=N&fps=30` sets
   the scene's time to N/30 exactly; every effect that integrates (the
   wormhole's travel phase, the beam's sweep, particles) reads that clock.
   The cold open's `?cine=N` is the seed of this.
3. **Frame capture over CDP, one Chrome, one session.** The sibling's
   `shot.js` pattern: open once, then `Page.captureScreenshot` per frame
   after advancing the clock, PNGs to disk, `ffmpeg` to mp4/webm. Hundreds
   of Chrome launches (one per `--screenshot`) would work but cost ~8 s each.
   Open question below: whether headless Chrome on this Mac can use the real
   GPU (`--use-angle=metal`) instead of SwiftShader — it decides whether a
   1080p wormhole frame costs a second or a minute.
4. **Supersample for AA offline.** Render at 2× and downscale in the encoder
   step; TAA/SMAA are for the real-time tier.
5. **Light the metal with the sky it is under.** The galaxy bake is a
   cubemap already; run it through PMREM and it is the environment map for
   every PBR surface — the ring reflects its own galaxies, the hull picks up
   the nebula's colour. Coherent for free.
6. **Weathered metal = a material, not a paint job.** `MeshPhysicalMaterial`
   with albedo / roughness / normal / (AO) maps. Two sources: **procedural,
   seeded** (a canvas-baked set: base noise, edge wear from a cavity mask,
   streaks along the up axis, rust in the roughness — `~/Dev/procedural-chip-texture`
   is a lead in this idiom), or **authored CC0 sets** (2 K, five maps,
   megabytes each). Procedural first: it obeys "deterministic everything"
   and ships in kilobytes. Clearcoat for the accent rings, iridescence
   (r160 has it) for the wormhole-lit edges is the kind of thing a cinematic
   can afford.
7. **Shadows and contact.** Enable the shadow map (PCFSoft) on the sun, add
   GTAO for contact — the single biggest step from "toy" to "object" on a
   flat-shaded model.
8. **The wormhole full screen is a background, not a disc.** It becomes the
   scene's clear pass; the ring and the aliens render over it with depth.
   An alien "passing through" is a plane-crossing: the part of the body
   behind the aperture plane is rendered through a screen-space refraction /
   chromatic shift, the part in front is solid. Cheap, and it sells the
   crossing better than a dissolve.
9. **Aliens, three options** (the ruling below):
   a. **Dot clouds at cinema density** — the same Braille generators at 10×
      the points, drawn as soft sprites with size attenuation, an additive
      halo and a hard core, motion trails. Keeps the identity exactly.
   b. **Authored solids** — GLB subjects in the sibling, as the machines are.
      The sibling's idiom is machines; organic aliens would be a new idiom
      there.
   c. **Volumetric** — a metaball / SDF body raymarched in a shader (the
      wormhole marcher's cousin), gelatinous, lit by the wormhole. The most
      cinematic, the most work, and it fits the "phage / jelly" lore.
   Recommendation: **a for the swarm, c for the hard tier** — the dot cloud
   is the read the player knows; the solid core inside it is what "hardcore"
   has meant all along.
10. **Wide lines for the wire planet.** three's `Line2`/`LineMaterial`
    (addons, vendorable) give lines a width in pixels; at 4K the 1-px wire
    disappears and the planet's identity with it. An atmosphere is a fresnel
    rim shell (cheap) or a thin scattering shader (Nishita-lite) if the rim
    is not enough.
11. **The tank's might is light and motion, not polygons.** Muzzle flash as
    a sprite plus a point light that touches the hull for two frames; recoil
    (exists); smoke as a few sprite puffs; the shell's tracer (exists); the
    plasma at a cinema preset (thousands of plume points) with a heat-haze
    distortion pass over it; the deck strips and sleeves glowing through
    bloom. The hull texture is item 6.
12. **Rails as data.** `{ t, pos, look, fov, ease }` keyframes with the cold
    open's smoothstep; the shot system already consumes a `poseAt`, so a
    rail compiles to one.
13. **Sound is a rail too.** `audio.js` and `~/Dev/kai-sound-lab` exist;
    out of scope for research, in scope for phase 4.

## 3. Architecture

- **A `#cine` tab**, like `#portal` and `#beam`: a registry of scenes
  (`src/cine/gate.js`, `planet.js`, `tank.js`) over a shared **kit**
  (`src/cine/kit.js`): the fixed-step clock, the rail compiler, the capture
  hooks (`?scene=`, `?frame=`, `?fps=`, `?size=WxH`, `?tier=cinema|live`),
  letterbox and titles.
- **A `cinema` row in `perftier.js`**: wormhole 1024 @ 60, bloom 1.0, dpr 2,
  supersample 2, shadows on, GTAO on. The tier table already exists; a
  cinematic is a third row, not a special case.
- **Materials as a module** (`src/cine/materials.js`): the procedural
  weathered-metal baker (seeded → canvas → textures) and the PMREM of the
  galaxy bake. The game can adopt either later at its tier.
- **Capture harness** (`scripts/cine-capture.mjs`): CDP over Node's
  WebSocket (copied in shape from the sibling's `shot.js`), one Chrome, N
  frames, then `ffmpeg`. Output to `renders/` (gitignored).
- **Aliens**: a `makeCinemaCloud(type, density, look)` beside `makeDotEnemy`
  for option a; an SDF body shader for option c if ruled in.

## 4. Phases

Each phase is small, has a probe, and leaves the game untouched.

| # | phase | done when |
|---|---|---|
| 0 | **Instrument.** Fixed-step clock, `?frame=`, the CDP capture harness, ffmpeg; the GPU-vs-SwiftShader question answered by measurement | a 3 s clip of the existing board renders at 1080p from headless; the seconds-per-frame for a full-screen wormhole is a number |
| 1 | **THE GATE.** Ring at a higher segment count (sibling), procedural weathered PBR + galaxy PMREM, shadows + GTAO, wormhole full screen at the cinema tier, one alien crossing (option a, plus c if ruled), a 12 s rail | a 12 s 1080p clip and a 4K still; the ring reflects the sky; the crossing reads |
| 2 | **THE PLANET.** Galaxy field live or 2048-bake with bloom on the cores, wide-line wire planet, fresnel atmosphere, a slow 15 s orbit rail | a 15 s clip; the wire survives at 4K; galaxies have depth |
| 3 | **THE TANK.** MK-CX/2 with the weathered material + PMREM + outlines, shells with flash/light/smoke/recoil, plasma at a cinema preset with heat haze, a 12 s rail | a 12 s clip; the flash lights the hull; the plasma reads as mass |
| 4 | **Polish + sound.** TAA/SMAA on the live tier, film grain, letterbox, titles; a sound rail per scene | three clips the operator would post |
| 5 | **In-app.** The `#cine` tab plays each rail at the live tier; the roadmap's attract mode and Isao's exposition scenes are hosted here | the attract mode plays from the lock screen at ≥ 30 fps on the desktop tier |

## 5. Rulings — for the operator

1. **The planet's look.** The game's neon-wire identity, elevated (wide
   lines, atmosphere, galaxies), or a "realistic" planet that is a different
   thing from the game? The plan recommends the wire, elevated.
2. **Aliens.** Dot clouds at cinema density (a), authored solids (b),
   volumetric SDF bodies (c), or a mix? The plan recommends a for the swarm
   and c for the hard tier.
3. **Delivery.** Offline video at 4K, in-app real time, or both from one
   rail? The plan recommends both; phase 0's measurement says what the live
   tier can afford.
4. **Textures.** Procedural and seeded (kilobytes, deterministic) or authored
   CC0 sets (megabytes, richer)? The plan recommends procedural first.
5. **Targets.** Aspect and length per cinematic — 16:9, 12–15 s each is the
   plan's guess; 4K30 offline, 1080p60 live.
6. **Sound.** Now, per scene, or after the three pictures stand?

## 6. Open questions and risks

- **Real GPU in headless Chrome on this Mac** is unknown. SwiftShader at
  1080p × 120 steps × 12 octaves is likely tens of seconds a frame; 600
  frames is hours. Phase 0 measures both paths before anything is built on
  them.
- **Memory.** A 4K frame with two bloom composers and a supersample is
  ~400 MB of targets; fine for one Chrome, and the machine's rule is one
  Chrome anyway.
- **Second versions.** The rule in §0 is a rule, not a mechanism; the probe
  for it is that every cinematic scene imports its assets from `units.js` /
  the GLBs, never from a copy.
- **The wormhole is a disc shader.** Going full screen means the throat
  geometry (uThroatRadius, uNear) is tuned for a disc; the bench will need a
  "full frame" mode before the effect is judged.
