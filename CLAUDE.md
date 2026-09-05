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
  `?hangprobe=shot|deploy` (TD: deliberately stall one of the two machines
  that OWN the camera — freeze the cold open's clock, or take the drive speed
  to zero mid-deploy — and report whether the game gets itself back. This is
  the failing test for the recurring "stuck in neither 3rd person nor top
  view" report; without it the liveness checks are a claim, and it caught the
  first cut writing `Infinity` for a zero-speed deploy, which made the one
  case the check exists for the one case it could never catch),
  `?modeprobe=1` (TD: press the shell's DRIVE/BUILD switch four times with
  REAL pointer events — `.click()` skips them, so any capture-phase handler
  that swallows a pointerdown is invisible to a probe and lethal to a thumb),
  `?viewlog=1` (TD: every setView transition with its caller),
  `?tankseen=1` (TD: CAN A PERSON SEE THE TANK, once a second — not "is it in
  the frustum", which is what the view watchdog used to ask and what four
  camera fixes answered while the reports kept coming. It separates
  behind / off-canvas / under the browser chrome / covered-by-<element> /
  too small, and the same verdict is now the DIAG panel's FIRST line, so one
  phone screenshot says which. Headless can model neither `visualViewport`
  nor `env(safe-area-inset-*)`, so a desktop replica can only ever return
  `ok` or a pose fault — which is precisely why the phone reports outlived
  the replica).
  the SNIPER (`#sniper`): `?spawn=N` (N inbound enemies at load — the SPAWN
  button / E key does the same), `?closeup=0` and `?scan=0` (the spotting
  monitor and the PPI), `?phase=calibrate|contact` (phase 1 is a
  black-and-white target and a fixed string; phase 2 is movers), `?allotted=N`,
  `?moverSpeed=`, `?showRifle=1` (you do not see your own rifle down your own
  scope — the camera sits AT the optic, inside the receiver), and
  every `BALLISTICS_TUNE` knob by name (`?zero=`,
  `?wind=`, `?muzzleVel=`, `?gravity=`, `?drag=`, `?swayFast=` …), `?mag=`,
  `?range=`, and the ASSIST LADDER — `?rangefinder=1`, `?windRead=1`,
  `?firingSolution=1`, `?autoHold=1`, each one a chip Isao has not printed
  yet (docs/AUTOMATION-ARC.md). `?sniperprobe=1` fires the same target twice,
  with no hold and with the HUD's own solution, and reports where each landed
  — the whole promise of the mode is that those two numbers come out of ONE
  integrator, so the probe is the thing that keeps them honest.
  the SENTRY RANGE (`#sentry`): `?family=needle|rotor|kiln|quiver|lancer|relay`,
  `?tier=1|2|3`, `?count=N` (a battery, on a ring), `?mount=N` (on a wall —
  and mind the DEAD ZONE it buys: the range's `elevMin` is -35, not the
  workshop viewer's -10, because the trunnion sits ~1.4 units up and at -10
  even a floor-mounted gun is blind out to 7.9 units. The HUD prints the
  blind radius and the ground draws it in red), `?mode=waves|pop`, plus every knob in `SENTRY_TUNE` by name (`?tolerance=25`
  makes it miss, which is the point of the knob), and `?sentryprobe=1` — the
  error falling, the rounds leaving and the targets going down, once a second.
  Models are the Sentry Workshop's, vendored to `assets/models/sentries/`
  under their own name contract: `ROOT→BASE→YAW→PITCH→RECOIL`, `MUZZLE_nn`,
  and six material names. `?tabprobe=1` also lists this tab.
  Each family has a VOICE (`SENTRY_FAMILIES.fire`, plus `ready` for the
  Rotor's minigun spin-up, which plays on the ENGAGEMENT EDGE and not per
  round) — `?voiceprobe=1` logs every sound call with its count, since
  headless cannot hear. The QUIVER is the Javelin: `missile: true` means it
  LOCKS before it fires (`?lockGate=`, `?lockTime=`, `?lockBreak=`, in
  degrees of drive error) and what leaves the tube then homes —
  `src/lockon.js`, the same tune the sniper lab uses, put through
  `scaleMissile` into model units. Fire-and-forget: the lock drops the
  instant a cell is away, or one launcher empties itself into one walker
  while the wave goes past.
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
- THE HACK OVERLAY ON A PHONE. `?hack=hdt|bridges|shikaku` opens it and
  `HACKFIT` logs the fit; `?hackrot=0|1` forces the TURN off/on. The three
  games differ and the turn is PER GAME (`HACK_LANDSCAPE`): HDT is a wide
  circuit board and fills a landscape phone at scale 1, so on a portrait
  phone it is rotated 90° and given the long axis at 1:1. The two pazorukore
  puzzles are squarish boards with side panels — handed a 2:1 viewport they
  clip their own grid INTERNALLY, which the iframe cannot detect (the child
  reports no overflow, it simply lays out wrong) — so they stay upright. The
  ↻ TURN button overrides either way and resets when the game changes.
  `body.hacking` hides `#chrome-toggle`: the ☰ is a child of <body> and the
  overlay a child of the tab, so their z-indexes are in different stacking
  contexts and never compare.
- A `@media (pointer: coarse)` rule cannot be exercised by any desktop
  browser, headless included — pair it with a width clause
  (`, (max-width: 560px)`) or the rules inside are unverifiable and can
  silently do nothing. The TD tab has the inverse tool: `?mobile=1&coarse=1`
  rewrites the coarse media conditions in the loaded sheets so the ruler
  measures the phone's blocks for real (a phone screenshot found the radar
  over the console while `?layout` said 0 overlaps — measure with `?coarse=1`
  BEFORE trusting a shell layout). Also mind source order: `#td-tut`'s base rule is
  declared after the mobile blocks, so an override up there loses.
- TWO TOWER ROSTERS, ONE TAB. `towers.js` holds `ROSTERS[1]` (the campaign,
  untouched) and `ROSTERS[2]` (the sentry board: Rotor / Plasma Thrower /
  Quiver / Relay / Mortar / Lancer / Howitzer, each naming a GLB in
  `assets/models/sentries/`). `TOWERS`/`TOWER_BY_KEY`/`TOWER_ORDER` are
  exported `let` — LIVE bindings — switched once by `src/roster.js`, which
  must be main.js's FIRST import so it runs before td-tab's module body.
  `?roster=2` selects it; the TD2 tab button is a navigation, like a mission.
  `?rosterprobe=1` waits for the look's preload and then reports every tower
  with its model and whether it fell back to a braille mast. `?a6=1` places a
  HEPTAPOD A6 and logs its loop once a second (it clears the landing brief
  first — the board starts `paused` and a probe that does not will measure a
  frozen game and report a frozen unit). A tower's sample is `towerSound(def)`,
  NOT `tower_${key}` — the second roster's keys have no samples of their own.
- The A6 (`src/heptapod.js`, roster 2 slot 8) is the only tower that is not a
  position: patrol a leash around its berth → engage → empty a 6/8/10-rocket
  cassette → walk home → reload. Going home is unconditional, or the magazine
  is decoration. Arc length in radians throughout, so `cells * cellSide`
  compares directly. Its `Walk` clip runs for real: the sentry look merges
  everything the CLIP DOES NOT TOUCH (pivot names read off the animation's own
  tracks, never guessed from names), so the 24 leg joints stay articulated and
  the hull collapses — 70 draw calls against 89 fully unmerged and 4-5 for a
  static tower. Legs run while patrolling / engaging / returning, stop while
  firing and reloading (`userData.setGait`). `applyTowerLook()` runs AT BOOT:
  it used to be reachable only from the panel and `?towerlook=`, so a board
  whose default look has async assets never started the load and every tower
  stayed a braille fallback forever. `?alltowers=1` places one of each and
  says whether any fell back, and prints each tower's LIGHTNESS SPAN — a
  model whose materials all sit at one lightness arrives as a pale mass
  however good the mesh is. `tintModel` with no `shades` does a wash and
  nothing else, and `def.color` for these towers is near-white, so a flat
  0.28 emissive of it drowned a dark model in a dark scene. `SENTRY_TINT`
  (towerlooks.js) is the ladder, keyed to the Workshop's own six material
  names, with Signal / Identification as the glow surfaces via `tintModel`'s
  new `glow` option. The A6 does NOT bob — the clip is the walk — and it
  FACES its heading (basis `up × forward, up, forward`; the models are +Y up,
  +Z forward), with the leg cadence scaled by its measured ground speed. Never address a
  tower by a literal key (`'single'`) — use `starterTower()` or find it by
  `attack`; a literal is a call site that silently does nothing on one board.
- A `?v=` token is part of the module URL, so `./x.js` and `./x.js?v=ab` are
  TWO modules and the browser loads both. ~27 pure modules are already split
  that way (wasted bytes, no bug); for a module with mutable state it is a
  silent correctness bug — the write lands on the copy nobody reads, which is
  how the second roster first came up as the campaign. `bust.sh` only UPDATES
  tokens, never adds them, so an untokened import stays untokened forever.
  `check-tokens.sh` now fails on a split import of any module exporting `let`.
- TD2 towers keep the Workshop's AUTHORED palette (`dressSentry` in
  towerlooks.js) — NOT `tintModel`, which re-hues every surface to the
  tower's colour and is built for the mkcx tank's four muddy olive materials.
  Applied to a palette that was already good it returned a monochrome
  machine, which is why the lab looked better than the game. The identity
  colour is spent only on the SIGNAL / IDENTIFICATION indicator surfaces.
  The board is a darker room than the lab's three-light studio, so the
  authored colours get a x1.35 lift and a faint emissive of their OWN colour.
- A tower wears the Workshop EQUIPMENT TIER matching its upgrade tier
  (t1/t2/t3) — the detail already existed and was being thrown away. Tier 1
  loads up front and the rest lazily (24 models is ~4 MB); a tower wears the
  best tier it has bytes for and starts the load for the one it wants.
  `?towertier=1|2|3` pins one, `?towerscale=` sizes them (default 0.72 —
  detail reads better small; a bulky machine looks moulded, a small one
  machined). `?alltowers=1` prints TRIANGLES, because a merged model has one
  mesh per material however much geometry is in it and the mesh count cannot
  tell a Base tier from a Maximum one.
- TD2's towers use the SENTRY LAB's answers. The look keeps the Workshop's
  pivots through the merge (`mergeByMaterial(scene, ['YAW','PITCH','RECOIL'])`)
  and exposes `head`/`pitchNode`/`recoilNode`/`muzzles`; `aimTower` drives yaw
  and elevation at `SENTRY_TUNE`'s own rates (degrees/second, not a lerp — a
  proportional ease is fastest when it is most wrong), clamps to the envelope,
  measures elevation FROM THE TRUNNION, and carries the one negation
  (`pitch.rotation.x = -elev`). Shots leave a real `MUZZLE_nn` and kick RECOIL.
  The lab owns how a turret MOVES; towers.js still owns what it moves toward.
- PLASMA and LANCE share one beam engine (beamfx `createBeam`, board preset) —
  the thrower is wide, jittery, and thrown DOWN onto a body six times a
  second; the lance is thin, straight, and held for one long burst along the
  ground arc, piercing everything on the line. A lance is NOT stopped by
  terrain (it stands on the high ground and shoots over it — keeping the
  tank's wall-march killed it half a cell out on its own wall), it measures
  `off` on the UNIT sphere (or an enemy pays for its altitude out of a 0.04
  hit radius), and it takes its bearing FROM THE MUZZLE, not the cell centre.
  The lance is GREEN, thin and jitter-free (`def.beamColor`, separate from
  `def.color` so a laser can have a colour without repainting the machine;
  `LANCE_LOOK` vs `THROW_LOOK` — a thrower is a spray of matter, a laser is
  light). The QUIVER fires the sentry lab's own seekers (`attack: 'seeker'`,
  `lock: true`) — lockon.js through `scaleMissile` into unit-sphere radians,
  locked with the DRIVE's error in degrees, fire-and-forget. A seeker's
  ground cull sits a third of a cell BELOW the surface: a top-attack round
  dives onto something standing on the ground, and culling at exactly 1.0
  killed three in four while they were still closing.
  `?plasmaprobe=1` reports beams lit, whether the throw descends, every rig's
  yaw/elev/recoil, how many bodies a lance went through, and each Quiver's
  lock plus the seekers hit/lost tally.
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
- `~/Dev/onkochishin` — a gallery of UI studies (`atelier/<name>/index.html`,
  each self-contained). `atelier/hud-targeting` is the fire-control HUD the
  sniper's readout is built on, on the operator's steer: corner readouts
  carrying only TWO borders each so they read as brackets, a two-tier
  label/value `field`, and the palette (`--cyan #5fe6d6`, `--lock #ffb43d`,
  `--alarm #ff4d4d`, `--phosphor #e8f4f2`). Rebuilt in our own CSS rather
  than vendored — the study is a reference, not a dependency.
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
