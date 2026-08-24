// tanks2.mjs — invariants for the planet tank-combat core (src/tanks2.js).
// Pure module; no DOM, no three.js.
import {
  rotAbout, tangentAt, tangentDir, arcBetween, generatePlanet,
  createPlanetTankGame, TANK_ANG, TURRET_H, TURN_RATE, DRIVE_RATE, REVERSE_RATE, WALL_MARGIN_F,
  hasLineOfSight, SHELL_RATE, SHELL_RANGE, SHELL_ANG, MAX_BOUNCES, DYING_T, INVULN_T,
  interceptPos,
} from '../src/tanks2.js';
import { dot3, len3, dist3, cross3, norm3, scale3 } from '../src/vec3.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

console.log('planet:');
{
  const r = rotAbout([1, 0, 0], [0, 0, 1], Math.PI / 2);
  check('rotAbout quarter turn', approx(r[0], 0, 1e-9) && approx(r[1], 1, 1e-9));
  check('tangentAt orthonormalizes', approx(dot3(tangentAt([0.3, 1, 0], [1, 0, 0]), [1, 0, 0]), 0, 1e-9));
  check('tangentDir points along tangent', (() => {
    const d = tangentDir([1, 0, 0], [0, 1, 0]);
    return approx(len3(d), 1, 1e-9) && approx(d[1], 1, 1e-9);
  })());
  check('tangentDir degenerate -> null', tangentDir([1, 0, 0], [2, 0, 0]) === null);
  check('arcBetween right angle', approx(arcBetween([1, 0, 0], [0, 1, 0]), Math.PI / 2, 1e-9));
}
{
  const P = generatePlanet({ seed: 7, points: 400, wallClusters: 5 });
  check('planet has cells + centers + adj', P.centers.length === P.mesh.quads.length
    && P.adj.length === P.centers.length);
  check('centers are unit', P.centers.every((c) => approx(len3(c), 1, 1e-6)));
  check('some walls, not too many', P.walls.size >= 4 && P.walls.size <= 60);
  check('spawns far apart (>120°)', arcBetween(P.spawns[0].pos, P.spawns[1].pos) > (2 * Math.PI) / 3);
  check('spawn cells open', !P.walls.has(P.spawns[0].cell) && !P.walls.has(P.spawns[1].cell));
  const side = P.mesh.defaultSide;
  check('walls clear of spawn rings (>2.5 sides)', [...P.walls].every((w) =>
    dist3(P.centers[w], P.spawns[0].pos) > 2.5 * side
    && dist3(P.centers[w], P.spawns[1].pos) > 2.5 * side));
  check('spawn heads are unit tangents', P.spawns.every((s) =>
    approx(len3(s.head), 1, 1e-6) && approx(dot3(s.head, s.pos), 0, 1e-6)));
  // connectivity: BFS over open cells reaches the other spawn
  const seen = new Set([P.spawns[0].cell]);
  const q = [P.spawns[0].cell];
  while (q.length) {
    const c = q.shift();
    for (const nb of P.adj[c]) if (!P.walls.has(nb) && !seen.has(nb)) { seen.add(nb); q.push(nb); }
  }
  check('open cells connected spawn-to-spawn', seen.has(P.spawns[1].cell));
  check('deterministic', (() => {
    const Q = generatePlanet({ seed: 7, points: 400, wallClusters: 5 });
    return [...P.walls].join() === [...Q.walls].join() && P.spawns[0].cell === Q.spawns[0].cell;
  })());
  const R = generatePlanet({ seed: 8, points: 400, wallClusters: 5 });
  check('seed changes walls', [...P.walls].join() !== [...R.walls].join());
  check('bare planet option', generatePlanet({ seed: 7, points: 400, wallClusters: 0 }).walls.size === 0);
}

console.log('kinematics:');
const DT = 1 / 60;
{
  const g = createPlanetTankGame({ seed: 7, wallClusters: 0, aiLevel: 0 });
  const t = g.tanks[0];
  const h0 = t.head.slice();
  g.step(DT, { left: true });
  const turned = Math.atan2(dot3(cross3(h0, t.head), t.pos), dot3(h0, t.head));
  check('turn rate exact + tangent', approx(turned, TURN_RATE * DT, 1e-6)
    && approx(dot3(t.pos, t.head), 0, 1e-9));
  const p0 = t.pos.slice();
  g.step(DT, { forward: true });
  check('drive rate exact', approx(arcBetween(p0, t.pos), DRIVE_RATE * DT, 1e-6));
  const p1 = t.pos.slice();
  g.step(DT, { reverse: true });
  check('reverse half speed', REVERSE_RATE === DRIVE_RATE / 2
    && approx(arcBetween(p1, t.pos), REVERSE_RATE * DT, 1e-6));
}
{
  // orthonormality survives a long scripted run
  const g = createPlanetTankGame({ seed: 7, wallClusters: 5, aiLevel: 1 });
  for (let i = 0; i < 1000; i++) {
    g.step(DT, { left: i % 7 < 3, forward: i % 3 !== 0, fire: i % 50 === 0 });
  }
  for (const t of g.tanks) {
    check('pos stays unit', approx(len3(t.pos), 1, 1e-6));
    check('head stays unit tangent', approx(len3(t.head), 1, 1e-6)
      && approx(dot3(t.pos, t.head), 0, 1e-6));
  }
}
{
  // wall collision: drive straight at a cluster; never end inside margin
  const g = createPlanetTankGame({ seed: 7, wallClusters: 5, aiLevel: 0 });
  const t = g.tanks[0];
  const wallC = [...g.planet.walls].map((w) => g.planet.centers[w]);
  // aim at the nearest wall center
  let target = wallC[0];
  for (const w of wallC) if (dist3(w, t.pos) < dist3(target, t.pos)) target = w;
  t.head = tangentDir(t.pos, target) ?? t.head;
  let everBlocked = false;
  const margin = WALL_MARGIN_F * g.planet.mesh.defaultSide;
  let ok = true;
  for (let i = 0; i < 60 * 12; i++) {
    g.step(DT, { forward: true });
    everBlocked = everBlocked || g.tanks[0].blocked;
    for (const w of wallC) if (dist3(w, g.tanks[0].pos) < margin * 0.95) ok = false;
  }
  check('never inside wall margin', ok);
  check('blocked flag fired at the wall', everBlocked);
}
{
  // tank-tank separation on a bare planet
  const g = createPlanetTankGame({ seed: 7, wallClusters: 0, aiLevel: 0 });
  const [a, b] = g.tanks;
  b.pos = rotAbout(a.pos, norm3(cross3(a.pos, a.head)), 0.2);
  b.head = tangentAt(b.head, b.pos);
  for (let i = 0; i < 60 * 4; i++) g.step(DT, { forward: true });
  check('tank-tank holds 2·TANK_ANG', arcBetween(g.tanks[0].pos, g.tanks[1].pos) >= 2 * TANK_ANG - 1e-3);
}

console.log('shells + LOS:');
const stagePair = (sepRad, over = {}) => {
  // bare planet; place tanks sepRad apart on a great circle, facing each other
  const g = createPlanetTankGame({ seed: 7, wallClusters: 0, aiLevel: 0, ...over });
  const a = g.tanks[0], b = g.tanks[1];
  a.pos = [1, 0, 0]; a.head = [0, 0, 1];
  b.pos = norm3(rotAbout(a.pos, [0, 1, 0], -sepRad)); // rotate +x toward +z
  b.head = tangentDir(b.pos, a.pos);
  a.head = tangentDir(a.pos, b.pos);
  return g;
};
{
  const g = stagePair(0.25);
  check('LOS true near + clear', hasLineOfSight(g, g.tanks[0].pos, g.tanks[1].pos));
  const g2 = stagePair(Math.PI / 3);
  check('horizon blocks at 60° even with no walls',
    !hasLineOfSight(g2, g2.tanks[0].pos, g2.tanks[1].pos));
}
{
  // wall occlusion: inject a wall on the arc midpoint, inside the horizon
  const g = stagePair(0.4);
  const mid = norm3(rotAbout(g.tanks[0].pos, [0, 1, 0], -0.2));
  g.planet.walls.add(g.cellOf(mid));
  check('wall on the arc blocks LOS', !hasLineOfSight(g, g.tanks[0].pos, g.tanks[1].pos));
}
{
  const g = stagePair(0.3);
  g.step(DT, { fire: true });
  const s = g.shells[0];
  check('fire spawns shell: unit pos, unit tangent dir', !!s
    && approx(len3(s.pos), 1, 1e-6) && approx(dot3(s.pos, s.dir), 0, 1e-6)
    && g.events.some((e) => e.type === 'fire' && e.tank === 0));
  g.step(DT, { fire: true });
  check('one in flight', !g.events.some((e) => e.type === 'fire'));
}
{
  // over-the-horizon hit: 60° apart, no LOS, shell arrives anyway
  const g = stagePair(Math.PI / 3);
  check('no LOS at fire time', !hasLineOfSight(g, g.tanks[0].pos, g.tanks[1].pos));
  g.step(DT, { fire: true });
  let hit = false;
  for (let i = 0; i < 60 * 3 && !hit; i++) {
    g.step(DT, {});
    hit = g.events.some((e) => e.type === 'hit' && e.by === 0);
  }
  check('over-the-horizon hit lands', hit && g.score[0] === 1);
}
{
  // range cap on a miss
  const g = stagePair(Math.PI / 3);
  g.tanks[0].head = tangentAt(rotAbout(g.tanks[0].head, g.tanks[0].pos, 0.5), g.tanks[0].pos); // aim off
  g.step(DT, { fire: true });
  let steps = 0;
  while (g.shells[0] && steps < 60 * 6) { g.step(DT, {}); steps++; }
  check('range-capped flight time', Math.abs(steps * DT - SHELL_RANGE / SHELL_RATE) < 0.15,
    `flew ${(steps * DT).toFixed(2)}s`);
}
{
  // ricochet: wall injected in the path reflects the shell
  const g = stagePair(0.3, { ricochet: true });
  const block = norm3(rotAbout(g.tanks[0].pos, [0, 1, 0], -0.2));
  g.planet.walls.add(g.cellOf(block));
  check('staging: wall cell is not the muzzle cell', g.cellOf(block) !== g.cellOf(g.tanks[0].pos));
  g.tanks[1].pos = rotAbout(g.tanks[1].pos, [0, 1, 0], -1.2); // move target out of the line
  g.tanks[1].head = tangentAt(g.tanks[1].head, g.tanks[1].pos);
  g.step(DT, { fire: true });
  let bounced = false;
  for (let i = 0; i < 60 * 2 && !bounced && g.shells[0]; i++) {
    g.step(DT, {});
    bounced = g.events.some((e) => e.type === 'bounce');
  }
  const s = g.shells[0];
  check('ricochet bounces, dir stays unit tangent', bounced && !!s
    && approx(len3(s.dir), 1, 1e-6) && approx(dot3(s.pos, s.dir), 0, 1e-6)
    && s.bounces === 1);
}

console.log('match flow:');
{
  const g = stagePair(0.25, { pointsToWin: 2 });
  g.step(DT, { fire: true });
  let ev = [];
  for (let i = 0; i < 60 * 2 && !ev.some((e) => e.type === 'hit'); i++) {
    g.step(DT, {});
    ev.push(...g.events);
  }
  check('close-range hit scores', g.score[0] === 1 && ev.some((e) => e.type === 'hit' && e.by === 0));
  check('victim dying with tangent knockDir', g.tanks[1].state === 'dying'
    && approx(dot3(g.tanks[1].knockDir, g.tanks[1].pos), 0, 1e-6));
  for (let i = 0; i < Math.ceil(DYING_T / DT) + 2; i++) g.step(DT, {});
  check('respawn: both at spawns, invulnerable, shells cleared',
    dist3(g.tanks[0].pos, g.planet.spawns[0].pos) < 1e-9
    && dist3(g.tanks[1].pos, g.planet.spawns[1].pos) < 1e-9
    && g.tanks[0].invulnT > 0 && g.tanks[1].invulnT > 0
    && !g.shells[0] && !g.shells[1]);
}
{
  const g = stagePair(0.25);
  g.tanks[1].invulnT = INVULN_T;
  g.step(DT, { fire: true });
  let hit = false;
  for (let i = 0; i < 60 * 3 && g.shells[0]; i++) { g.step(DT, {}); hit = hit || g.score[0] > 0; }
  check('invulnerable tank cannot be hit', !hit && g.score[0] === 0);
}
{
  const g = stagePair(0.25, { pointsToWin: 1 });
  g.step(DT, { fire: true });
  for (let i = 0; i < 60 * 2 && g.winner < 0; i++) g.step(DT, {});
  check('match ends at pointsToWin', g.winner === 0);
  const frozen = JSON.stringify(g.tanks);
  g.step(DT, { forward: true, fire: true });
  check('post-match frozen, events empty', JSON.stringify(g.tanks) === frozen && g.events.length === 0);
}
{
  const snap = (g) => JSON.stringify([g.tanks, g.shells, g.score, g.winner, g.time],
    (k, v) => (typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v));
  const script = (i) => ({
    left: i % 97 < 20, right: i % 89 < 15, forward: i % 7 !== 0,
    reverse: i % 131 < 5, fire: i % 45 === 0,
  });
  const run = () => {
    const g = createPlanetTankGame({ seed: 77, wallClusters: 5, aiLevel: 1, ricochet: true });
    for (let i = 0; i < 600; i++) g.step(DT, script(i));
    return snap(g);
  };
  check('deterministic replay (10s, L1, ricochet)', run() === run());
}

console.log('ai:');
{
  // intercept: target circling at known rate; shell must arrive where it will be
  const shooter = [1, 0, 0];
  const target = norm3(rotAbout(shooter, [0, 1, 0], -0.9));
  const velAxis = [1, 0, 0]; // target circles around +x
  const p = interceptPos(shooter, target, velAxis, 0.3);
  const tFly = arcBetween(shooter, p) / SHELL_RATE;
  const truth = norm3(rotAbout(target, velAxis, 0.3 * tFly));
  check('interceptPos converges on the moving target', arcBetween(p, truth) < 0.01);
}
{
  const g = createPlanetTankGame({ seed: 5, wallClusters: 0, aiLevel: 1 });
  const start = g.tanks[1].pos.slice();
  let fired = 0;
  for (let i = 0; i < 60 * 20; i++) {
    g.step(DT, {});
    fired += g.events.filter((e) => e.type === 'fire' && e.tank === 1).length;
  }
  check('L1 wanders the planet', arcBetween(start, g.tanks[1].pos) > 0.3);
  check('L1 fires blind on a timer', fired >= 3);
}
{
  // L2/L3 never fire without LOS (walled planet, moving player, 20s each)
  for (const lvl of [2, 3]) {
    const g = createPlanetTankGame({ seed: 9, wallClusters: 6, aiLevel: lvl });
    let violations = 0;
    for (let i = 0; i < 60 * 20; i++) {
      g.step(DT, { left: i % 4 === 0, forward: true });
      if (g.events.some((e) => e.type === 'fire' && e.tank === 1)
        && !hasLineOfSight(g, g.tanks[1].pos, g.tanks[0].pos)) violations++;
    }
    check(`L${lvl} only fires with LOS`, violations === 0, `${violations} blind`);
  }
}
{
  // L4 ghost gunner: sees the player, player flees over the horizon,
  // L4 fires at the extrapolated position with NO line of sight.
  const g = createPlanetTankGame({ seed: 5, wallClusters: 0, aiLevel: 4 });
  const a = g.tanks[0], b = g.tanks[1];
  a.pos = [1, 0, 0];
  b.pos = norm3(rotAbout(a.pos, [0, 1, 0], -0.3)); // inside the horizon
  b.head = tangentDir(b.pos, a.pos);
  a.head = tangentDir(a.pos, b.pos) ? scale3(tangentDir(a.pos, b.pos), -1) : a.head; // face AWAY
  let blindFire = false;
  for (let i = 0; i < 60 * 12 && !blindFire; i++) {
    g.step(DT, { forward: true }); // flee straight over the horizon
    if (g.events.some((e) => e.type === 'fire' && e.tank === 1)
      && !hasLineOfSight(g, g.tanks[1].pos, g.tanks[0].pos)) blindFire = true;
  }
  check('L4 fires over the horizon at the ghost', blindFire);
}
{
  // L4 ambush: never saw the player, no ghost -> holds position
  const g = createPlanetTankGame({ seed: 5, wallClusters: 0, aiLevel: 4 });
  const p0 = g.tanks[1].pos.slice(); // spawns are antipodal: no LOS, no track
  for (let i = 0; i < 60 * 3; i++) g.step(DT, {});
  check('L4 holds without a shot', arcBetween(p0, g.tanks[1].pos) < 0.05);
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\ntank2 invariants hold');
