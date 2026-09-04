// mines.mjs — the claymore's rules as invariants. The refusals and the WEDGE
// are the whole module: a mine that can be stacked, that trips while arming,
// or that catches something standing behind it is a different weapon from the
// one the operator approved, and none of those show up as an error at
// runtime — they show up as a board that feels wrong.
import {
  MINE_TUNE, makeField, layMine, armMines, restock, mineAt,
  inFan, inArc, trip, chain, nextChained, minePolar, mineKnobProblems,
} from '../src/mines.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

const CELL = 0.08;   // the board's own cellSide

// A mine at the north pole facing +x, so every fixture below is readable.
const NORTH = [0, 1, 0];
const EAST = [1, 0, 0];
const mineHere = (field, ci = 0, t = 0) => {
  layMine(field, { pos: NORTH, dir: EAST, cellAhead: ci }, t);
  const m = field.mines[field.mines.length - 1];
  return m;
};
// A surface point `cells` out from that mine at `deg` off its axis. Built
// from the mine's own basis, so the fixture cannot drift from the code.
const at = (mine, cells, deg) => {
  const n = mine.pos, d = mine.dir;
  const side = [n[1] * d[2] - n[2] * d[1], n[2] * d[0] - n[0] * d[2], n[0] * d[1] - n[1] * d[0]];
  const th = (deg * Math.PI) / 180, a = cells * CELL;
  const u = [d[0] * Math.cos(th) + side[0] * Math.sin(th),
    d[1] * Math.cos(th) + side[1] * Math.sin(th),
    d[2] * Math.cos(th) + side[2] * Math.sin(th)];
  return [n[0] * Math.cos(a) + u[0] * Math.sin(a),
    n[1] * Math.cos(a) + u[1] * Math.sin(a),
    n[2] * Math.cos(a) + u[2] * Math.sin(a)];
};

console.log('schema:');
check('knob table is sound', mineKnobProblems().length === 0, mineKnobProblems().join('; '));

console.log('supply and refusals:');
{
  const f = makeField();
  check('starts with the rack full', f.count === MINE_TUNE.start);
  check('lays', layMine(f, { pos: NORTH, dir: EAST, cellAhead: 3 }) === 'laid');
  check('the drop costs one', f.count === MINE_TUNE.start - 1);
  check('a wall refuses', layMine(f, { pos: NORTH, dir: EAST, cellAhead: 4, blocked: true }) === 'blocked');
  check('a blocked drop costs nothing', f.count === MINE_TUNE.start - 1);
  check('the same cell refuses', layMine(f, { pos: NORTH, dir: EAST, cellAhead: 3 }) === 'occupied');
  check('a tower on the cell refuses', layMine(f, { pos: NORTH, dir: EAST, cellAhead: 5, occupied: true }) === 'occupied');
  const empty = makeField({ ...MINE_TUNE, start: 0 });
  check('an empty rack refuses', layMine(empty, { pos: NORTH, dir: EAST, cellAhead: 1 }) === 'empty');
  check('mineAt finds the laid one', mineAt(f, 3) !== null && mineAt(f, 9) === null);
}

console.log('the rack caps:');
{
  const f = makeField();
  check('a case fits under the cap', restock(f, 5) === 5 && f.count === 15);
  check('the case over the cap is clipped', restock(f, 10) === 5 && f.count === MINE_TUNE.cap);
  check('...and nothing more goes in', restock(f, 5) === 0 && f.count === MINE_TUNE.cap);
}

console.log('the arming window:');
{
  const f = makeField();
  const m = mineHere(f, 0, 10);
  const p = at(m, 0.5, 0);
  check('nothing arms early', armMines(f, 10 + MINE_TUNE.armSecs - 0.01).length === 0);
  check('a dead mine does not trip', trip(f, m, [p], CELL).targets.length === 0);
  check('the point survived the arming window', f.mines[0].alive);
  const armed = armMines(f, 10 + MINE_TUNE.armSecs);
  check('it arms on time', armed.length === 1 && armed[0] === m.id);
  check('it announces once', armMines(f, 20).length === 0);
  check('the same point trips it now', trip(f, m, [p], CELL).targets.length === 1);
  check('a tripped mine is gone', !m.alive && !m.live);
}

console.log('the trigger fan:');
{
  const f = makeField();
  const m = mineHere(f);
  armMines(f, MINE_TUNE.armSecs);
  check('a body in the fan trips it', inFan(m, at(m, MINE_TUNE.fanDepth - 0.1, 0), CELL));
  check('a body just past the fan does not', !inFan(m, at(m, MINE_TUNE.fanDepth + 0.1, 0), CELL));
  check('a body beside the fan does not', !inFan(m, at(m, MINE_TUNE.fanDepth - 0.1, 80), CELL));
  check('...but is still inside the blast arc', inArc(m, at(m, MINE_TUNE.fanDepth - 0.1, 50), CELL));
}

console.log('the blast arc:');
{
  const f = makeField();
  const m = mineHere(f);
  check('2.4 cells at 50 degrees is caught', inArc(m, at(m, 2.4, 50), CELL));
  check('2.6 cells straight ahead is not', !inArc(m, at(m, 2.6, 0), CELL));
  check('2.4 cells at 70 degrees is not', !inArc(m, at(m, 2.4, 70), CELL));
  // the wrong implementation everyone writes: |s| along the axis. It fires
  // the claymore backwards and passes every test above.
  check('nothing directly behind is caught', !inArc(m, at(m, 1.0, 180), CELL));
  check('nothing behind and to one side is caught', !inArc(m, at(m, 1.0, 130), CELL));
  check('the polar distance IS arc length', Math.abs(minePolar(m, at(m, 2, 0)).dist - 2 * CELL) < 1e-12);
}

console.log('friendly fire:');
{
  const f = makeField();
  const m = mineHere(f);
  armMines(f, MINE_TUNE.armSecs);
  // the tank's own position, handed in as one more point — the module does
  // not know or care whose it is
  const tank = at(m, 1.5, 20);
  const { targets } = trip(f, m, [at(m, 9, 0), tank], CELL);
  check('the tank in the arc comes back as a target', targets.length === 1 && targets[0] === 1);
}

console.log('the chain:');
{
  const f = makeField();
  const first = mineHere(f, 0);
  // two more inside the first's arc, at different depths, and one behind it
  layMine(f, { pos: at(first, 2.2, 10), dir: EAST, cellAhead: 2 });
  layMine(f, { pos: at(first, 1.2, -10), dir: EAST, cellAhead: 3 });
  layMine(f, { pos: at(first, 1.5, 180), dir: EAST, cellAhead: 4 });
  armMines(f, MINE_TUNE.armSecs);
  const near = f.mines[2].id, far = f.mines[1].id, behind = f.mines[3].id;
  const { chain: ids } = trip(f, first, [], CELL);
  check('both mines in the arc chain', ids.length === 2);
  check('nearest first', ids[0] === near && ids[1] === far);
  check('the one behind is untouched', !ids.includes(behind));
  chain(f, ids);
  check('queueing the same id twice does not double it', chain(f, ids) === 2);
  const a = nextChained(f);
  check('the queue hands them back one per frame, nearest first', a.id === near);
  trip(f, a, [], CELL);
  const b = nextChained(f);
  check('...then the far one', b.id === far);
  trip(f, b, [], CELL);
  check('the queue empties', nextChained(f) === null);
  // an already-dead mine in the queue is skipped rather than tripping twice
  const g = makeField();
  const solo = mineHere(g, 0);
  armMines(g, MINE_TUNE.armSecs);
  chain(g, [solo.id]);
  trip(g, solo, [], CELL);
  check('a mine that died first is skipped in the queue', nextChained(g) === null);
}

console.log(failures ? `\n${failures} FAILURES` : '\nall mine invariants hold');
process.exit(failures ? 1 : 0);
