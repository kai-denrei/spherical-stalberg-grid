# TD audio — design

2026-08-27. First sound in the project. A shared Web Audio engine
(`src/audio.js`) + a data-driven manifest, wired into the TD tab: one
sound per tower, tank primary/secondary/pickups, a speed-driven engine
bed, and three randomized enemy-death sounds — with a mixer folder in the
TD panel so intensity is tunable by ear.

## Why now

The TD tab is the landing tab and the closest thing the project has to a
game, and it is silent. Every combat event that should have weight —
eight distinct towers firing, a shell leaving the barrel, a phage
popping — currently reads only visually. The bloom pass (2026-08-26) was
the visual half of "make hits feel like hits"; this is the audible half.

Source assets: `~/Downloads/SoundsToUseForTTD/TTD_SoundsShortlist/`,
17 WAVs across `TTD_TowersSounds/`, `Tank_Sounds/`, `EnemiesDying/`.

## Verified audit of the source assets

Probed with `ffprobe`; all 44.1 kHz stereo except
`Tower_Rapid_Ice_casting_55.wav` (48 kHz).

Fire rates from `src/towers.js`; interval = `1 / rate`. **Several samples
outlive their own tower's shot interval** — before any consideration of
multiple towers of the same kind:

| tower | rate | interval | sample | dur | self-overlap |
|---|---|---|---|---|---|
| single | 1.4 | 0.71 s | Single_shot_muffled | 0.56 s | ok |
| rapid | 3.0 | **0.33 s** | Rapid_Ice_casting_55 | 1.54 s | **4.6x** |
| spread | 1.0 | 1.00 s | Spread_light-blast-07 | 0.78 s | ok |
| homing | 1.2 | 0.83 s | Homing_heavy-blast-14 | 0.68 s | ok |
| slow | 1.0 | 1.00 s | Slow_beam-05 | 4.68 s | **4.7x** |
| aoe | 0.9 | 1.11 s | AoE_heavy-blast-03 | 2.08 s | 1.9x |
| sniper | 0.7 | 1.43 s | Sniper_heavy-blast-05 | 1.87 s | 1.3x |
| laser | 1.5 | **0.67 s** | Laser_beam-05 | 4.68 s | **7x** |

Tank secondary is worse: `LASER_RATE = 0.14` (7 bursts/s) against a
1.09 s sample = **7.6x**.

Two further findings:

- **`Tower_Laser_beam-05.wav` and `Tower_Slow_beam-05.wav` are the same
  file** — identical 807 K size and identical 4.683900 s duration. Laser
  and Slow would be audibly indistinguishable.
- **`Tank_Engine_teleport.wav` is loopable.** RMS envelope over the
  1.62 s: -23.6 dB at 0.09 s, peaking -16.4 dB at 0.37-0.65 s, decaying
  to -19.0 dB by 1.49 s. The body from ~0.35 s to ~1.45 s holds within
  ~2.5 dB — steady enough to loop from an inner slice with a crossfade.

Upgrades raise fire rate further — `effectiveStats` gives `x1.2` at
tier 2, plus another `x1.2` for the `single` attack family (`single`,
`rapid`, `sniper`). Fully upgraded, rapid fires at **4.32/s**, a 0.231 s
interval against a 1.54 s sample: **6.7x**. Trims are therefore sized
against the tier-2 interval, not the base.

## Decisions

1. **Ship MP3, commit the WAV masters.** `scripts/audio-build.sh`
   transcodes `assets/audio/src/*.wav` -> `assets/audio/*.mp3`, mono
   96 kbps. ~4.5 MB -> ~350 KB served. Masters are committed (adds ~4.5 MB
   to a 23 MB `.git`) so the build is reproducible without the Downloads
   folder. No build step at serve time — the MP3s are committed too, and
   GitHub Pages serves them directly.
2. **Peak-normalize, don't loudness-normalize.** `-1 dBTP` peak preserves
   the transients that make a blast read as a blast. Artistic level-setting
   lives in the manifest's per-sound `gain`, not in the encode.
3. **Trim every sample to fit its tier-2 fire interval.** Overlap is
   solved at the source, in the build script, rather than papered over at
   runtime. Sizing against tier 2 rather than base rate matters: a fully
   upgraded rapid tower fires at 4.32/s, a 0.231 s interval.
4. **Pitch-split the shared beam file.** Two outputs from `beam-05`:
   `tower_laser` = 0.45 s head at normal pitch (bright, snappy — it is a
   1.5/s pulse gun); `tower_slow` = 0.90 s at `asetrate` 0.70 (dark,
   dragging — it *is* the slow field). Pitch is baked at build time, so
   runtime `playbackRate` is reserved for intentional jitter only.
5. **Speed-driven engine loop**, not one-shots per cell crossing. Starts
   when the tank moves, gain and `playbackRate` both track speed, fades
   out 0.25 s after it stops.
6. **Mixer as a lil-gui `sound` folder** in the existing TD panel
   (alongside `bloom`), plus a persistent speaker button in `#td-pad-row`
   so mute is one tap on mobile without opening the panel. No new CSS.
7. **TD tab only this pass.** `audio.js` and the manifest carry no game
   knowledge, so heart/battle/tank3 adopt later without changing them.

## Asset build table

`scripts/audio-build.sh` drives this table. Pipeline per file:
trim -> pitch (where baked) -> fade-out -> peak-normalize -1 dBTP ->
mono 96 kbps MP3.

**Trims are sized against the tier-2 interval**, computed from
`effectiveStats`: `rate * (1 + 0.1 * tier)` = `x1.2` at tier 2, and the
`single` attack family takes a further `x1.2` — which `single`, `rapid`
and `sniper` all use. A fully upgraded rapid tower fires at 4.32/s.

**Pitch changes duration.** `asetrate` at 0.70 makes a slice ~1.43x
longer, so the script derives `source_trim = output_dur * rate`. The
table's trim column is the **output** duration.

| output | source | tier-2 interval | out dur | rate |
|---|---|---|---|---|
| `tower_single` | Single_shot_muffled | 0.496 s | 0.45 | 1.00 |
| `tower_rapid` | Rapid_Ice_casting_55 | **0.231 s** | 0.22 | 1.00 |
| `tower_spread` | Spread_light-blast-07 | 0.833 s | 0.78 | 1.00 |
| `tower_homing` | Homing_heavy-blast-14 | 0.694 s | 0.66 | 1.00 |
| `tower_slow` | Slow_beam-05 | 0.833 s | 0.80 | **0.70** |
| `tower_laser` | Laser_beam-05 | 0.556 s | 0.45 | 1.00 |
| `tower_aoe` | AoE_heavy-blast-03 | 0.926 s | 0.90 | 1.00 |
| `tower_sniper` | Sniper_heavy-blast-05 | 0.992 s | 0.95 | 1.00 |
| `tower_upgrade` | Tower_upgrade | n/a | 0.79 | 1.00 |
| `tank_main` | MainWeapon_heavy-blast-15 | n/a | 1.20 | 1.00 |
| `tank_secondary` | Secondary_light-blast-09 | **0.14 s** | 0.14 | 1.00 |
| `tank_pickup` | PickUpItem_handling-26 | n/a | 0.45 | 1.00 |
| `tank_shells` | PickUpNewShells_reload-02 | n/a | 0.91 | 1.00 |
| `tank_engine` | Engine_teleport | n/a | **0.35 -> 1.45** | 1.00 |
| `enemy_die_a` | slime-pop | n/a | 0.50 | 1.00 |
| `enemy_die_b` | slime-organic | n/a | 0.57 | 1.00 |
| `enemy_die_c` | splat_quick | n/a | 0.33 | 1.00 |

`tower_slow` therefore trims 0.56 s of source (0.80 x 0.70) and emits
0.80 s of output.

`tank_secondary` at 0.14 s is the transient attack only — which is
correct for a 7-bursts/s stutter gun: it should read as a tick, not a
blast. The 0.14 s figure is `LASER_RATE` itself.

The engine loop is built by taking the 0.35-1.45 s body and crossfading
its tail back over its head (~60 ms) so the loop point is inaudible.

## `src/audio.js` — the engine

DOM-light. No three.js import, no game knowledge. Signal graph:

```
BufferSource -> voiceGain -> busGain[bus] -> masterGain -> destination
```

### Lifecycle

- The `AudioContext` is constructed lazily on the **first user gesture**,
  never at init — browser autoplay policy rejects a context created
  before one, and a suspended context silently swallows everything.
- Buffers fetch and decode in parallel on TD's first activation. Until a
  buffer lands, `play()` for that key is a silent no-op.
- Every entry point is total: audio never throws into the render loop and
  never blocks a frame. A failed fetch or decode logs once and that key
  stays a no-op for the session.

### Cache-busting

Audio URLs get `?v=<token>` read at runtime from `<meta name="cb">`.
`scripts/fingerprint-urls.py` rewrites only HTML tag attributes and CSS
`url()` — it does **not** touch JS string literals — so a path built in
JS would otherwise ship untokened. Reading the meta tag that `bust.sh`
already maintains gets this for free with no new bust patterns and no
change to `check-tokens.sh`.

### Voice management — "managing sound intensity"

Four layers, cheapest first:

1. **Per-key `minInterval`** — a retrigger inside the window is dropped
   outright. This is what keeps eight rapid towers from becoming a buzz.
2. **Per-key `maxVoices`** — over the cap, the oldest voice is stolen
   with a 30 ms gain ramp to zero before `stop()`. Ramping, not an abrupt
   stop, because a hard cut mid-waveform is an audible click.
3. **Global ceiling of 24 concurrent voices** as a backstop, independent
   of any key.
4. **Distance attenuation** — event gain scales by `1 / (1 + d/k)` where
   `d` is the distance from the camera to the event position. Ten laser
   towers across the sphere must not be as loud as the one at your feet.
   Plain gain, **not** a `PannerNode`: true 3D panning on a sphere the
   player orbits is disorienting, and a panner per voice is real cost for
   a cue the player reads visually anyway.

### Determinism

Pitch jitter and the three-way enemy-death pick draw from a dedicated
`mulberry32` stream, per the project's no-`Math.random` rule. Seeded
from `params.seed` so a replayed seed sounds identical.

### API

```js
initOnGesture()                  // idempotent; wires a one-shot listener
load(manifest)                   // fetch + decode all, parallel, tolerant
play(key, { gain, rate, pos })   // one-shot; returns void
loop(key, { gain, rate })        // returns { set(gain, rate), stop(fade) }
setMaster(v) / setBus(name, v) / setMute(bool)
```

### Persistence

Mixer settings (master, four buses, mute) round-trip through
`localStorage` under a single namespaced key.

## `src/audiomanifest.js`

Data-driven table in the house style of `looks.js` / `units.js`:

```
key -> { file, bus, gain, maxVoices, minInterval, rateJitter }
```

Buses: `towers`, `tank`, `enemies`, `ui`.

Because tower keys are `tower_${def.key}` and `towers.js` already carries
`def.key`, **one call site in `stepTowers()` covers all eight towers**.

## Wiring into `td-tab.js` — eight touch points

| site | event | key | bus |
|---|---|---|---|
| `stepTowers()` after the `atk` branch | tower fires | `tower_${tw.def.key}` | towers |
| `upgradeTower()` on success | upgrade bought | `tower_upgrade` | ui |
| `fire()` after `ammo--` | tank primary | `tank_main` | tank |
| `updateLasers()` per burst | tank secondary | `tank_secondary` | tank |
| `absorbOrb()` | missile triad absorbed | `tank_shells` | tank |
| `checkRewards()` on pickup | far-field reward | `tank_pickup` | tank |
| `killCreature(e, fx)` **when `fx` is true** | enemy dies | `enemy_die_{a,b,c}` | enemies |
| player update path | driving | `tank_engine` (loop) | tank |

`killCreature` is gated on `fx` because it is also called with `fx=false`
for board teardown — tutorial clear at line ~1648, wave reset — and an
ungated call would fire a death-sound storm on every regenerate.

Tower and enemy events pass `pos` (the tower's `graph.centers[ci]`, the
enemy's `e.pos`) so distance attenuation applies. Tank events are always
at the camera and pass none.

## Mixer UI

A `sound` folder in the TD `GUI`, after `bloom`:

```
sound
  master   0..1
  towers   0..1
  tank     0..1
  enemies  0..1
  ui       0..1
  mute     bool
```

Plus a speaker toggle appended to `#td-pad-row` (`BUILD | MAP | WANDER |
CAM | speaker`), sharing the existing `.tzone`/pad button styling.

## Testing

`test/audio.test.js`, added to the `npm test` suite:

- **Voice bookkeeping as pure functions.** `minInterval` gating, `maxVoices`
  stealing (oldest first), the global ceiling, and the distance-gain curve
  are extracted as pure functions over a plain state object, so they are
  Node-testable with no `AudioContext` and no DOM.
- **Manifest integrity.** Every manifest key resolves to a file that
  exists under `assets/audio/`; every `bus` is one of the four; every
  tower key in `TOWERS` has a matching `tower_<key>` manifest entry —
  this test fails loudly if a tower is ever added without a sound.
- **Determinism.** The same seed produces the same enemy-death sequence.

Headless smoke, per the project's verification convention:
`?tick=N` run under Chrome with `--use-angle=swiftshader
--enable-unsafe-swiftshader --enable-logging=stderr`, asserting no console
errors. Note that headless has no audio device — this verifies the code
paths don't throw, not that anything is audible.

## Risks and open items

- **Levels are derived, not heard.** Trims and gains come from durations,
  fire rates, and RMS envelopes. They will be in the right ballpark and
  will want a tuning pass by ear; the lil-gui sliders exist partly for
  that. Final values should be written back into the manifest once tuned.
- **`Rapid` vs `Slow` thematic mismatch.** `Tower_Rapid_Ice_casting` is
  thematically a freeze sound and fits the Slow tower better, and at
  1.54 s it badly overruns Rapid's 0.33 s interval. Deferred per decision
  4 (pitch-split handles Slow); worth trying the reassignment once the
  mix is audible.
- **iOS silent switch** mutes Web Audio outright. Not worked around — a
  muted-by-hardware game is the platform's intended behaviour.
- **`.git` grows ~4.5 MB** from the committed WAV masters.

## Out of scope

Music, ambient beds, UI click sounds, heart/battle/tank3 wiring,
positional stereo panning, an overlay mixer dashboard with VU meters.
