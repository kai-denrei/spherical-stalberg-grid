# spherical-stalberg-grid — working notes for Claude sessions

Stålberg organic quad grid on a sphere, grown into a proto-game.
Five 3D tabs (grid / maze / organic / battle / heart) + an in-app docs tab.
Public: https://kai-denrei.github.io/spherical-stalberg-grid/ (Pages,
`max-age=600` CDN lag; the corner badge shows the served build token).

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
  Console lines (e.g. the `?tick` state logs) only surface with
  `--enable-logging=stderr` — without it they're absent, not broken.
  Virtual time does not advance `performance.now()` → use the URL hooks:
  `?tick=N` (simulate N seconds), `?walk=N`, `?points=`, `?look=`,
  `?walltops=`, `?creature=`, `?spawn=`, `?view=`, `?devlog=1`, `?unit=`,
  `?tune=1` (opens the unit viewer's feel tuner), `?labels=1`, `?sweep=0`,
  `?fire=N`, `?tutstep=N` (clear N scripted tutorial pairs), `?log=roadmap`,
  `#tabname`.
  Headless clamps windows to ~500px wide and CROPS screenshots — for
  layout bugs, log `innerWidth` from the page before touching CSS.
- maze/organic/battle/heart tabs are ~900-line siblings (cp+sed lineage).
  When batch-patching them: anchor on CODE lines (comments drift first),
  assert per file, treat a mid-script abort as the designed outcome.
  Extraction of a shared board core is named debt — deferred while the
  tabs still diverge.
- Derive render-coupled values (camera facing, turret aim) FROM the
  render transforms (`getWorldQuaternion`), never re-derive with your own
  sign conventions. three.js lookAt: plain Object3D faces +Z, cameras −Z.

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
