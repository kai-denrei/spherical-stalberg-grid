# spherical-stalberg-grid — working notes for Claude sessions

Stålberg organic quad grid on a sphere, grown into a proto-game.
Five 3D tabs (grid / maze / organic / battle / heart) + an in-app docs tab.
Public: https://kai-denrei.github.io/spherical-stalberg-grid/ (Pages,
`max-age=600` CDN lag; the DEV LOG tab header shows the served build
token — the corner badge was retired from the game view).

## Orient first

- `.deban/` — decision log (decisions, dead ends, lessons). Read
  `_index.md` first. Sync it via /deban after meaningful sessions.
  It is gitignored: local working memory, never published.
- `DEVLOG.md` — per-commit technical log, newest first. Add an entry for
  every substantive commit (get the hash first, then append + commit).
- `HOW-IT-WORKS.md` — by-concept explainer. Both render in-app.

## Hard rules

- After editing any `src/*.js`, HTML, or CSS: run `./scripts/bust.sh --quiet`
  (rewrites `?v=` tokens incl. ES-module imports). NEVER put `?v=` on
  `../vendor/` imports — a tokened vendor URL loads a second copy of three.js.
  Bust output commits ATOMICALLY: stage everything it touched, never just
  your own files — a partial commit ships stale import tokens. A pre-push
  guard enforces this: `scripts/check-tokens.sh` fails on split tokens or a
  tokened vendor import, wired via `.githooks/pre-push`. Enable it once per
  clone with `git config core.hooksPath .githooks` (it's local config, not
  committed); run `./scripts/check-tokens.sh` by hand anytime.
- `npm test` = Node invariant suites (grid topology, dungeon, creatures,
  units). Keep green; they don't cover the render layer.
- Headless verification: Chrome with `--use-angle=swiftshader
  --enable-unsafe-swiftshader` (NOT `--disable-gpu`, it kills WebGL).
  Headless WITHOUT those flags uses the real M4 through ANGLE Metal
  (measured 2026-09-03: ~45 G sine-folds/s vs SwiftShader's 1.4) — that is
  the path for RENDERS, not for correctness runs: `scripts/cine-capture.mjs
  --url … --seconds N --fps 30 --size 1920x1080 --out renders/x` drives a
  scene that called `installCine` (src/cine/kit.js) one frame per
  `__cine.seek(t)` over CDP and encodes with ffmpeg; `#portal?bench=SIZE:FRAMES:STEPS:OCTAVES`
  times the wormhole at a full-frame pixel count; `?gl=1` names the GL.
  Console lines (e.g. the `?tick` state logs) only surface with
  `--enable-logging=stderr` — without it they're absent, not broken.
  Virtual time does not advance `performance.now()` → use the URL hooks:
  `?tick=N` (simulate N seconds), `?walk=N`, `?points=`, `?look=`,
  `?walltops=`, `?creature=`, `?spawn=`, `?view=`, `?devlog=1`, `?unit=`,
  `?tune=1` (opens the unit viewer's feel tuner), `?labels=1`, `?sweep=0`,
  `?fire=N`, `?tutstep=N` (clear N scripted tutorial pairs), `?log=roadmap`,
  `?perf=N` (TD: report draw calls / tris / points for one whole frame —
  set `info.autoReset=false` first; the minimap is a 2D canvas radar now,
  so the main renderer is the only WebGL context), `?layout=N` (TD: print every HUD box and every overlap —
  headless will not lay out below ~500px, it lays out wide and CROPS, so
  rectangles are the only trustworthy way to check a phone layout),
  `?cine=N` (park the cold open N seconds in — beats at ~1 / ~5 / ~7, and
  it HOLDS there so the still lands on the beat you asked for; `?cine=0`
  skips it), `?driveout=N` (TD: after the berths land, simulate N seconds
  of motion from the berth and log the cells reached — `?tick` runs at init,
  BEFORE the container model loads, so it cannot answer this),
  `?charge=0..1` (TD: park the wave clock inside the warning window —
  `?tick` drives motion, NOT the wave scheduler, so winding it forward
  leaves the countdown where it was),
  the MINES: `?mines=N` (rack size), `?minelay=N` (lay a row ahead and leave
  it standing — the only way to photograph a field, since the probe blows
  everything it lays), `?minearcs=0` (hide the red fan), `?mineprobe=1`
  (three beats: a row from the front — ONE trip and no chain is the correct
  answer, a claymore's arc points away from the row behind it; the same row
  from behind for the chain; the hull in front of its own mine for the
  friendly fire),
  the RESCUE mission: `?mission=rescue` (the seam every mission hangs on),
  `?survivors=N`, `?lasers=1` (refit the secondaries — they are stripped by
  default, and that is the mission's load-bearing number),
  `?rescueprobe=1` (drive-by at speed, the phone's drive-by with the lever
  at zero, the stop, both seats, delivery, the end card),
  the missions are SELECTABLE now — three buttons in the tab bar's play group
  (TD / rescue / raid, `data-mission` on each) and three cards in the home
  launcher; a mission is read once at boot so those are NAVIGATIONS built by
  `paramLink`, and the empty string is what clears it back to the campaign.
  `?tabprobe=1` logs every tab button with its mission and whether it is lit —
  the tab bar collapses behind ☰, so a screenshot cannot show this.
  RESCUE 2, the raid: `?mission=rescue2` (a LARGER board — it sets points
  1600 / rooms 26 unless the URL already named them — every sector open, no
  waves at all), `?camps=N`, `?garrison=N`, `?rescue2probe=1` (shut out of
  range, open inside it, the doors, the emerge, the walk home, the run-over
  and its splash, the end card), `?campgo=N` (park the hull just inside camp
  N's shot distance and LEAVE it — the probe blows through the sequence in
  one tick, so this is the only way to photograph an open container with
  people walking out of it; it fires at t+5 s, AFTER the berth deploy, which
  drives the hull and would undo it),
  every LAB's deep link: the 🔗 button copies the tab's current panel as a
  URL and writes it into the address bar (astro / metal / beam / portal /
  cine; the units viewer has had its own since before this). Only what
  DIFFERS from the defaults is written, colours lose their `#` (one in a
  query truncates the link at the first colour), and one-shot flags are
  stripped — `src/deeplink.js`, `DROP_KEYS`. `?dlprobe=1` presses the button
  on whichever lab is open and logs the URL, which is the only way the
  round-trip gets checked.
  the ASTRONAUT study (`#astro`): `?tankLen=` and `?personH=` in metres (the
  ratio is the study's whole output and the HUD prints it), `?path=perimeter|
  straight|spot`, `?clear=` (metres of daylight on the lap), `?outline=`
  (the cast's blueprint edges — 0.22 is the cinematic's rim; at the game's
  0.85 a dressed hull reads as a paper cut-out), `?exposure=`, `?env=`,
  `?dist=`/`?az=`/`?el=` (dist is DERIVED from tankLen unless given),
  the mobile shell's own: `?mobile=1|0` (force the shell on/off — a headless
  run is never coarse), `?goto=1`, `?mobbuild=1` + `?pin=1` (with `?layout`:
  enter BUILD through the button, pin a caption + Isao), `?tapprobe=1`,
  `?pressprobe=1`, `?modalprobe=1`, `?wake=1`, `?tier=phone|desktop`,
  `?sw=0`, `?whatsat=x,y` (name the element stack under a point),
  `?coarse=1` (apply the phone's coarse-pointer CSS headless), `?coach=1`,
  `?stickprobe=1`, `?stateprobe=1` (the boot's state every 2 s — run it
  through `scripts/headless-wait.mjs --url … --seconds N`, a REAL-TIME
  headless runner: `--virtual-time-budget` stops the frame loop's clock
  after the first moments, so a cold open, a deploy or a countdown
  replicates wrongly under it),
  `#cine?govprobe=1` (log the device calibration and the wormhole size the
  governor fit; `?fps=N` target, `?gov=0` off, `?t=N` park, `?tier=cinema`),
  `#units?unit=X&export=1&dump=1` (reverse-export the unit as the game
  dresses it: the .glb arrives as `GLBCHUNK i/n <base64>` console lines —
  reassemble from stderr; the EXPORT button in the viewer downloads it),
  `#tabname`.
  Headless clamps windows to ~500px wide and CROPS screenshots — for
  layout bugs, log `innerWidth` from the page before touching CSS. And
  headless=new keeps ~87px of its own bar: `--window-size=908,505` gives a
  908×418 viewport (a phone's), `844,477` gives 844×390 — the `?layout`
  line prints the real viewport; rule against THAT, never the window.
- A `@media (pointer: coarse)` rule cannot be exercised by any desktop
  browser, headless included — pair it with a width clause
  (`, (max-width: 560px)`) or the rules inside are unverifiable and can
  silently do nothing. The TD tab has the inverse tool: `?mobile=1&coarse=1`
  rewrites the coarse media conditions in the loaded sheets so the ruler
  measures the phone's blocks for real (a phone screenshot found the radar
  over the console while `?layout` said 0 overlaps — measure with `?coarse=1`
  BEFORE trusting a shell layout). Also mind source order: `#td-tut`'s base rule is
  declared after the mobile blocks, so an override up there loses.
- maze/organic/battle/heart tabs are ~900-line siblings (cp+sed lineage).
  When batch-patching them: anchor on CODE lines (comments drift first),
  assert per file, treat a mid-script abort as the designed outcome.
  Extraction of a shared board core is named debt — deferred while the
  tabs still diverge.
- Derive render-coupled values (camera facing, turret aim) FROM the
  render transforms (`getWorldQuaternion`), never re-derive with your own
  sign conventions. three.js lookAt: plain Object3D faces +Z, cameras −Z.

## Outside resources

- `~/Dev/Braille` — the dot-cloud shape lab these models come from
  (`fun-shapes/index.html`, ~200 generators). Same idiom as `creatures.js`:
  a function returning `[x,y,z]` / `[x,y,z,1]` points ending in `fitUnit`.
  Porting = copy the generator + its primitives into `src/braillelab.js`
  and add the name to `BRAILLE_SHAPES`. Copy VERBATIM; the lab keeps
  improving and re-porting should stay mechanical.
- `~/Dev/blueprint-to-life` — sibling repo. Source of the `cb-badge`
  cache-bust toolkit we share, the blueprint/callout idiom behind the unit
  viewer's `labels`, and a **solved** service-worker + cache-bust pattern
  (copy it rather than re-deriving when the PWA item comes up).

## Architecture in one breath

Pure math modules (`grid.js` sphere pipeline, `dungeon.js` BFS carve +
open-field variant, `creatures.js` Braille dot-clouds, `cellindex.js`
voxel-hash) are DOM-free and Node-tested. `units.js` + `looks.js` are
data-driven factories (unit kinds cloud|mesh; looks own all colors, incl.
zonal fields). The grid plays four roles — geometry generator, collision
oracle, semantic map, AI nav-graph — and only kinematics is decoupled:
manual mode is free movement querying `cellindex` for collision; auto
navigates the graph; handoff eases via `virtualStart`. Manual defaults to
rolling forward (mobile ergonomics); who-controls is binary and shown in
the HUD.

## Conventions

- Deterministic everything: mulberry32 streams from `params.seed`;
  no `Math.random` in game logic.
- Serve: `npm run serve` (python http.server :8144 — often already
  running in the background from a prior session).
- Commits: explain the why; end with the Co-Authored-By + Claude-Session
  trailer; push to `origin main` (repo: kai-denrei/spherical-stalberg-grid).
- Telegram the operator (see ~/CLAUDE.md) on milestones, not chatter.
