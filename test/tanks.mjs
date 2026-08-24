// tanks.mjs — invariants for the tank-combat core (src/tanks.js).
// Pure module; no DOM, no three.js.
import {
  CLASSIC_ARENAS, parseArena, arenaConnected, genArena,
  createTankGame, TANK_R, TURN_RATE, DRIVE_SPEED, REVERSE_SPEED,
} from '../src/tanks.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

// --- arenas --------------------------------------------------------------
console.log('arenas:');
check('three classics', ['open', 'brackets', 'maze'].every((k) => CLASSIC_ARENAS[k]));
check('classics are 26×20', Object.values(CLASSIC_ARENAS).every(
  (rows) => rows.length === 20 && rows.every((r) => r.length === 26)));
check('classics connected', Object.values(CLASSIC_ARENAS).every(arenaConnected));
{
  const a = parseArena(CLASSIC_ARENAS.open);
  check('open: 26×20 world, no blocks', a.w === 26 && a.h === 20 && a.blocks.length === 0);
  check('open: spawns face each other',
    approx(a.spawns[0].heading, 0) && approx(Math.abs(a.spawns[1].heading), Math.PI));
  check('open: spawns at cell centers',
    a.spawns[0].x % 1 === 0.5 && a.spawns[0].z % 1 === 0.5);
}
{
  const a = parseArena(CLASSIC_ARENAS.brackets);
  check('brackets: has blocks, one row tall each (run-merged)',
    a.blocks.length > 0 && a.blocks.every((b) => b.maxZ - b.minZ === 1 && b.maxX > b.minX));
  check('brackets: blocks in bounds',
    a.blocks.every((b) => b.minX >= 0 && b.maxX <= 26 && b.minZ >= 0 && b.maxZ <= 20));
}
check('parse throws without spawns', (() => {
  try { parseArena(['####', '####']); return false; } catch { return true; }
})());
check('parse throws on ragged rows', (() => {
  try { parseArena(['..1.......', '..2']); return false; } catch { return true; }
})());
{
  const rows = genArena(7);
  check('proc: 26×20', rows.length === 20 && rows.every((r) => r.length === 26));
  check('proc: mirrored', rows.every((r) => [...r].every(
    (ch, c) => (ch === '#') === (r[25 - c] === '#'))));
  check('proc: connected with 2 spawns', arenaConnected(rows)
    && rows.some((r) => r.includes('1')) && rows.some((r) => r.includes('2')));
  check('proc: deterministic', rows.join('\n') === genArena(7).join('\n'));
  check('proc: seed changes layout', rows.join('\n') !== genArena(8).join('\n'));
}

// --- kinematics + collision ----------------------------------------------
console.log('kinematics:');
const DT = 1 / 60;
{
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0 });
  const h0 = g.tanks[0].heading;
  g.step(DT, { right: true });
  check('turn rate exact', approx(g.tanks[0].heading, h0 + TURN_RATE * DT));
  g.step(DT, { left: true });
  check('left turn symmetric', approx(g.tanks[0].heading, h0));
}
{
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0 });
  const { x, z } = g.tanks[0]; // spawn (2.5, 9.5) heading 0 (+x)
  g.step(DT, { forward: true });
  check('forward speed exact', approx(g.tanks[0].x, x + DRIVE_SPEED * DT) && approx(g.tanks[0].z, z));
  g.step(DT, { reverse: true });
  check('reverse is half speed', REVERSE_SPEED === DRIVE_SPEED / 2
    && approx(g.tanks[0].x, x + (DRIVE_SPEED - REVERSE_SPEED) * DT));
}
{
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0 });
  for (let i = 0; i < 60 * 5; i++) g.step(DT, { reverse: true }); // back into left wall
  check('perimeter clamps at tank radius', approx(g.tanks[0].x, TANK_R, 1e-3)
    && g.tanks[0].blocked);
}
{
  const g = createTankGame({ seed: 1, arena: 'brackets', aiLevel: 0 });
  // stage: aim at the center bar (x 11..13, z 9..10) from the left
  g.tanks[0].x = 9.5; g.tanks[0].z = 9.5; g.tanks[0].heading = 0;
  for (let i = 0; i < 60 * 3; i++) g.step(DT, { forward: true });
  check('block stops tank at expanded AABB', g.tanks[0].x <= 11 - TANK_R + 1e-6);
  // diagonal approach slides along the free axis
  g.tanks[0].x = 9.5; g.tanks[0].z = 8.0; g.tanks[0].heading = Math.PI / 4;
  const z0 = g.tanks[0].z;
  for (let i = 0; i < 30; i++) g.step(DT, { forward: true });
  check('axis-separated slide', g.tanks[0].z > z0);
}
{
  const g = createTankGame({ seed: 1, arena: 'open', aiLevel: 0 });
  g.tanks[1].x = g.tanks[0].x + 2; g.tanks[1].z = g.tanks[0].z; // AI parked ahead
  for (let i = 0; i < 60 * 2; i++) g.step(DT, { forward: true });
  const d = Math.hypot(g.tanks[0].x - g.tanks[1].x, g.tanks[0].z - g.tanks[1].z);
  check('tank-tank collision holds 2R', d >= 2 * TANK_R - 1e-6);
}

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\ntank invariants hold');
