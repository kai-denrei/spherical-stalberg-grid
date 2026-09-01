import { printPhase, printOffset, printOn, patternSecsFor, PRINT_PATTERNS, PATTERN_SECS } from '../src/printpath.js';

let pass = 0;
const check = (name, cond) => {
  if (!cond) { console.log(`  FAIL ${name}`); process.exitCode = 1; }
  else { console.log(`  ok   ${name}`); pass++; }
};

console.log('printpath:');

// --- the cycle ------------------------------------------------------------
check('three patterns, in order', PRINT_PATTERNS.join() === 'zigzag,spiral,blink');
check('starts on zigzag', printPhase(0).pattern === 'zigzag');
check('second slice is spiral', printPhase(PATTERN_SECS * 1.5).pattern === 'spiral');
check('third slice is blink', printPhase(PATTERN_SECS * 2.5).pattern === 'blink');
check('wraps back to zigzag', printPhase(PATTERN_SECS * 3.5).pattern === 'zigzag');
check('u runs 0..1 inside a slice',
  Math.abs(printPhase(PATTERN_SECS * 1.25).u - 0.25) < 1e-9);
// a probe may wind the clock backwards; the modulo must not go negative
check('negative time still names a pattern',
  PRINT_PATTERNS.includes(printPhase(-PATTERN_SECS * 0.5).pattern));
check('negative time keeps u in 0..1',
  printPhase(-PATTERN_SECS * 0.5).u >= 0 && printPhase(-PATTERN_SECS * 0.5).u <= 1);

// --- every pattern stays on the bed ---------------------------------------
const onBed = (p) => {
  for (let i = 0; i <= 200; i++) {
    const [x, y] = printOffset(p, i / 200);
    if (!(Math.abs(x) <= 1.0000001 && Math.abs(y) <= 1.0000001)) return false;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  }
  return true;
};
for (const p of PRINT_PATTERNS) check(`${p} never leaves the bed`, onBed(p));

// out-of-range u must clamp, not fly off — the beam is driven by a live clock
check('u past 1 clamps', printOffset('spiral', 4)[0] === printOffset('spiral', 1)[0]);
check('u below 0 clamps', printOffset('spiral', -4)[0] === printOffset('spiral', 0)[0]);

// --- zigzag is a raster ---------------------------------------------------
// alternate rows must sweep in opposite directions, or it is not a zigzag
const zigMid = (row) => printOffset('zigzag', (row + 0.5) / 5)[0];
check('zigzag rows alternate direction',
  printOffset('zigzag', 0.02)[0] < zigMid(0) && printOffset('zigzag', 0.22)[0] > zigMid(1));
check('zigzag steps down the bed',
  printOffset('zigzag', 0.1)[1] < printOffset('zigzag', 0.9)[1]);
check('zigzag spans the bed width',
  Math.abs(printOffset('zigzag', 0.199)[0]) > 0.9);

// --- spiral winds outward -------------------------------------------------
const rad = (u) => Math.hypot(...printOffset('spiral', u));
check('spiral starts at the centre', rad(0) < 1e-9);
check('spiral radius grows', rad(0.25) < rad(0.5) && rad(0.5) < rad(0.95));
check('spiral actually turns',
  printOffset('spiral', 0.2)[1] !== printOffset('spiral', 0.6)[1]);

// --- blink hops and gaps --------------------------------------------------
check('blink parks at discrete stops',
  printOffset('blink', 0.05)[0] === printOffset('blink', 0.2)[0]);
check('blink moves between stops',
  printOffset('blink', 0.1)[0] !== printOffset('blink', 0.4)[0]);
check('blink extrudes at a stop', printOn('blink', 0.01) === true);
check('blink stops extruding on the hop', printOn('blink', 0.2) === false);

// --- extrusion ------------------------------------------------------------
check('the spiral is one continuous bead', printOn('spiral', 0.5) === true);
check('zigzag retracts at a turnaround', printOn('zigzag', 0.2) === false);
check('zigzag extrudes mid-row', printOn('zigzag', 0.1) === true);
// the gaps must be GAPS, not most of the run — a beam that is off half the
// time reads as broken rather than as printing
const duty = (p) => {
  let on = 0;
  for (let i = 0; i < 1000; i++) if (printOn(p, i / 1000)) on++;
  return on / 1000;
};
check('zigzag is mostly extruding', duty('zigzag') > 0.85);
check('blink is off a meaningful share', duty('blink') > 0.4 && duty('blink') < 0.7);

// --- EVERY BUILD SHOWS ALL THREE -----------------------------------------
// The operator asked for three alternating animations. A fixed slice length
// silently broke that for short jobs: a `single` prints in ~2.9s, which at
// 1.4s a slice is two patterns, never the third. This pins the guarantee
// across the whole plausible range of build durations.
const patternsShownOver = (dur) => {
  const secs = patternSecsFor(dur);
  const seen = new Set();
  for (let i = 0; i <= 400; i++) seen.add(printPhase((i / 400) * dur, secs).pattern);
  return seen;
};
for (const dur of [0.6, 1.0, 2.0, 2.9, 4.0, 6.5, 12]) {
  check(`a ${dur}s build shows all three patterns`, patternsShownOver(dur).size === 3);
}
check('a long build keeps the steady cadence', patternSecsFor(30) === PATTERN_SECS);
check('a short build compresses the cadence', patternSecsFor(1.5) < PATTERN_SECS);
check('a zero-length build cannot divide by zero',
  Number.isFinite(patternSecsFor(0)) && patternSecsFor(0) > 0);

console.log(`printpath: ${process.exitCode ? 'FAILURES' : 'all good'} (${pass} checks)`);
