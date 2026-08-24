// tanks.mjs — invariants for the tank-combat core (src/tanks.js).
// Pure module; no DOM, no three.js.
import {
  CLASSIC_ARENAS, parseArena, arenaConnected, genArena,
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

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\ntank invariants hold');
