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
| 0 | **Instrument.** ✔ 2026-09-03 — `src/cine/kit.js` (seek seam), `scripts/cine-capture.mjs` (CDP, GPU, ffmpeg), `?bench=` on the portal bench; GPU vs SwiftShader measured (§6) | ✔ a 3 s 1080p clip of the portal bench in 14 s, byte-deterministic across runs; 1080p wormhole = 68.6 ms/frame on the M4 |
| 1 | **THE GATE.** ✔ 2026-09-04 — 1a rail + capture (`gate.js`), 1b procedural weathered PBR (`weathered.js`, `cine/materials.js`) + galaxy PMREM + shadows, 1c the crossing (five phage at cinema density, `cine/cloud.js`), the landing on the wire planet at the game's measured scale (`cine/planet.js`). Not done: a higher segment count, GTAO, the SDF core (deferred by ruling) | ✔ `renders/gate-1080p.mp4` (12 s, 360 frames) and `renders/gate-4k-t11.9/` (the 4K still, 2.6 s a frame); the ring reflects the sky; the crossing reads |
| 2 | **THE PLANET.** ✔ 2026-09-04 — `cine/planetscene.js`: the wire world at the board's resolution, fresnel rim + haze, a 12 s rail wide → close → graze → the gate's silhouette. Wide lines ✔ (the sibling's r180 Line2 trio runs on r160; `widenWire`, width from the frame height). Not done: bloom weighting on the cores | ✔ `renders/planet-1080p.mp4`; the wire survives at 4K (`renders/gate-4k-wide-t11.9/`) |
| 3 | **THE TANK.** ✔ 2026-09-04 — `cine/tankscene.js`: MK-CX/2 with the weathered material + PMREM + outlines as a rim, three shells with flash + light + recoil, the plasma at 4× plume points on the planet's curvature, a roll-out. Not done: smoke, heat haze (cut by ruling) | ✔ `renders/tank-1080p.mp4`; the flash lights the hull |
| 4 | **Polish + sound.** Film pass ✔ 2026-09-04 (`cine/film.js`: letterbox, grain, vignette, VT323 title card, in the canvas). Sound rail ✔ (`cine/sound.js`, played live by the tab, muxed by `scripts/cine-mux.mjs`; the game's own sounds, silence elsewhere). Not done: TAA/SMAA on the live tier | ✔ `renders/{gate,planet,tank}-film-1080p-sound.mp4` |
| 5 | **In-app.** The `#cine` tab plays each rail at the live tier; the roadmap's attract mode and Isao's exposition scenes are hosted here | the attract mode plays from the lock screen at ≥ 30 fps on the desktop tier |

## 5. Rulings — operator, 2026-09-03

All six, per the plan's recommendations: (1) the wire planet, elevated;
(2) dot clouds at cinema density for the swarm, volumetric SDF cores for the
hard tier; (3) both offline video and in-app real time from one rail;
(4) procedural, seeded textures; (5) 16:9, **12 seconds** each; (6) sound
re-uses in-game sounds where one fits and is **space silence** where none
does — no new sound is authored for a cinematic.

### (as they were put)

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

## 6. Phase 0 — measured, 2026-09-03

**Headless Chrome on this Mac uses the real GPU.** With no `--use-angle`
flag (or `--use-angle=metal`) the renderer string is
`ANGLE Metal Renderer: Apple M4`; SwiftShader is only what the verification
recipe asks for. The portal bench's `?bench=SIZE:FRAMES:STEPS:OCTAVES`
times the wormhole at a full-frame pixel count with the readback stall:

| GL | target (px) | steps × octaves | ms / frame | rate |
|---|---|---|---|---|
| M4 (Metal) | 384² (the board) | 120 × 12 | 5.7 | 37 Gfolds/s |
| M4 | 1440² (= 1080p) | 120 × 12 | **68.6** | 43.5 |
| M4 | 2880² (= 4K) | 120 × 12 | 263 | 45.4 |
| M4 | 2880² | 200 × 16 | 575 | 46.1 |
| SwiftShader | 128² | 120 × 12 | 16.9 | **1.4** |

So: the M4 does ~45 G sine-folds a second; SwiftShader ~1.4, thirty times
slower, and did not finish three 384² frames inside five minutes. What it
prices: a **live full-screen wormhole at 1080p is 14.6 fps** at the preset,
so the live tier needs half resolution (~30 ms) or fewer steps; **offline
4K at 200 × 16 is 0.58 s a frame**, a 12-second clip in about 3.5 minutes.

**The capture harness works and is deterministic.** `src/cine/kit.js`
gives a scene a `seek(t)` seam; `scripts/cine-capture.mjs` drives Chrome
over CDP (no SwiftShader flags), one frame per seek, PNGs then ffmpeg. The
portal bench is the first scene on it: a 3 s 1080p clip renders in 14 s at
0.15 s a frame. Frame 1 rendered from two separate Chromes is
byte-identical, and frames 1, 2, 3 are three distinct pictures — after two
bugs the diff caught: rotors accumulated `rate × dt` (a dt of 0 froze them
wherever the live loop had left them, different in every run), and the
corona's update gate compared t to the live loop's last render time, so a
seek to t = 0.03 after the loop had reached t = 2 rendered nothing. Every
time-dependent thing is now SET from t.

## 7. The governor — 2026-09-03

The live tier is not a row in a table; it is measured on the device
(`src/cine/governor.js`, tested). At scene start one march at 512² is timed
with the readback stall (median of three) and gives the device's sine-folds
per second; the largest target whose march fits the frame budget (40% of a
frame at the target fps: 60 on a fine pointer, 30 on a coarse one) is
arithmetic. While the scene plays, a smoothed frame time steps the target
down after a second over budget and up after five seconds of headroom, one
step per three seconds, never up during the full-frame beat. The look is
never touched: only the target's pixels and update rate. The HUD prints the
rate, the fit and every step, so a phone report is a number.

Measured here: the M4 headless calibrates at 25–38 Gfolds/s and fits 384px
at 60 fps, 512 at 30, 256 at 120 — where the tier table said 512. Nothing
has been measured on a phone.

## 8. Open questions and risks

- ~~**The gate's last frames** (operator, 2026-09-03): the ring should end at the size it has in the game, in a game-world.~~ Done 2026-09-04: beat 3 pulls back to the wire planet under the ring, at the MEASURED scale (7.8 m radius under a 3.6 m aperture — the gate spans ~3 cells of a ~12-cell-radius world). `docs/RULINGS-2026-09-04.md` has the night's rulings.
- **UVs and the merge.** `mergeByMaterial` now keeps `uv` when a whole batch has it (2026-09-04); the ring's pod batches still lose theirs (a part without), so the pods wear the dark base, not the maps.


- ~~Real GPU in headless Chrome on this Mac is unknown.~~ Answered in §6:
  it is the M4, thirty times SwiftShader. The verification recipe in
  CLAUDE.md keeps SwiftShader for correctness runs; captures use the GPU.
- **Memory.** A 4K frame with two bloom composers and a supersample is
  ~400 MB of targets; fine for one Chrome, and the machine's rule is one
  Chrome anyway.
- **Second versions.** The rule in §0 is a rule, not a mechanism; the probe
  for it is that every cinematic scene imports its assets from `units.js` /
  the GLBs, never from a copy.
- **The wormhole is a disc shader.** Going full screen means the throat
  geometry (uThroatRadius, uNear) is tuned for a disc; the bench will need a
  "full frame" mode before the effect is judged.

## 9. The second direction — operator, 2026-09-04 morning

After the night's three clips: *720p is enough, especially while the
direction is still moving.* Then five items, each of them **the game**:

1. **THE TANK, longer.** Start with the engine OFF; turn it on and off to
   show the hydraulics and their sounds; on for good, move around, a turret
   shot, then zoom around the tank as it fires the secondaries. A longer
   shot is fine.
2. **THE GATE ends wrong** — an enormous portal on a tiny planet. It should
   be a normal-sized portal on a normally constructed planet, one that is
   *built*: towers, enemies, the tank, action. The portal starts as the
   wormhole, then brings us into the action.
3. **THE RAM.** The tank ramming through dozens and dozens of enemies —
   200 — and toward the end ONE large torus boss; the camera zooms on the
   radar showing the proximity danger climbing.
4. **THE STRIKE.** An orbital strike sequence: the button switch, the
   strikecam, a live target hit.
5. **THE PLANET** — atmosphere and galaxies read; the planet has to be
   *lived-in*: regular game elements going on.

### The decision: a director inside the TD tab

Every item is the board — towers, enemies, the tank, the heart, the radar,
the strike button. A cinematic that draws those from a separate scene is a
second copy of the board, and the board is the one thing this project has
refused to copy (the tabs are named debt for exactly that). So the
cinematics move *into* the board: **director mode** — `#td?director=NAME`
— a seeded, scripted run of the game with a camera rail on top, the input
and any HUD the shot does not want switched off, and the sim stepped at a
fixed dt for capture.

- **Scripts are data** (`src/cine/scripts.js`, pure, Node-tested): a rail
  (`rail.js` keys → `startShot`'s `poseAt`) plus timed cues — `spawn`,
  `tower`, `drive`, `fire`, `laser`, `engine`, `strike`, `hud`, `radar` —
  executed by the board when the sim clock crosses them, the way the sound
  rail's cues are. The board exposes exactly the verbs the scripts use.
- **The capture is the whole page at 720p.** `Page.captureScreenshot`
  composites the WebGL frame with the radar (a 2D canvas) and the HUD (DOM)
  — the radar zoom and the strike button are *in the frame* — and 1280 px
  is under the width that hung the M4. `installCine({ seek })` on the
  board: `seek(t)` steps the sim from where it is to `t` at 1/30 s and
  renders; frames are captured in order in one Chrome (cdp mode).
- **Determinism** is the board's own: seed, no `Math.random`, fixed dt.
  Two renders of a script are the same clip.
- **The night's scenes stay** as the set pieces they are (the wormhole
  full-frame, the weathered metal, the crossing) — THE GATE v2 opens on
  the cine tab's wormhole and *cuts* to the director's board; the tank's
  hydraulics are the game's own `stopEngine`/engine-on with its sounds.

### Order

1. **Director mode** — the seam. Unblocks all five. Probe: a 6 s scripted
   run captured twice is byte-identical.
2. **THE RAM** — the most game: 200 phage from three gates, the tank on
   AUTO through them, the knot last, the radar zoom.
3. **THE STRIKE** — the strikecam already exists; the script arms, presses,
   and the camera follows the fall onto a crowd.
4. **THE TANK v2** — engine off → on/off → on; the drive; a main; the
   secondaries under the zoom.
5. **THE GATE v2** — the cine tab's wormhole beats, then the cut to the
   board: a gate at cell scale with towers around it, the swarm coming out,
   the tank arriving.
6. **THE PLANET v2** — the orbit rail over a built board: gates, towers
   firing, a wave in the lanes.

### Open, for the operator

- The RAM's boss: the **knot** is the board's torus boss (hp 5, not
  rammable). Is the knot the one, or a new, larger torus?
- The STRIKE's target: a crowd at a gate, or the gate itself?
- Length per scene now that "longer is fine": 20 s for the TANK, 30 s for
  the RAM?
