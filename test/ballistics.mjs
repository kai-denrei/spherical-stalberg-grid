// ballistics.mjs — the sniper's physics as invariants. The whole promise of
// a sniper mechanic is that the number on the scope is the number the bullet
// obeys, so most of these are about ONE integrator answering every question:
// if the drop the HUD prints and the drop the round takes come from two
// pieces of code, the scope lies, and a scope that lies is not difficult.
import {
  BALLISTICS_TUNE, toMrad, fromMrad, windAt, launch, step, flyTo,
  zeroAngle, solution, makeShooter, stepBreath, sway, rangeFromMrad, hitsAt,
  ballisticsKnobProblems, MRAD,
} from '../src/ballistics.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const T = BALLISTICS_TUNE;
const noWind = { ...T, wind: 0, gust: 0 };
const noDrag = { ...noWind, drag: 0 };

console.log('schema:');
check('knob table is sound', ballisticsKnobProblems().length === 0, ballisticsKnobProblems().join('; '));
check('mrad round-trips', Math.abs(fromMrad(toMrad(2, 800), 800) - 2) < 1e-9);
check('a milliradian is a metre at a kilometre', Math.abs(fromMrad(1, 1000) - 1) < 1e-9);

console.log('drop:');
{
  // FLAT FIRE, NO DRAG: the closed form is 0.5·g·t², and the integrator must
  // agree with it. This is the one case where an independent answer exists,
  // so it is the one case that can check the integrator itself.
  const r = flyTo(600, 0, 0, noDrag);
  const t = 600 / noDrag.muzzleVel;
  const want = -0.5 * noDrag.gravity * t * t;
  check('a level shot falls as ½gt²', Math.abs(r.drop - want) < 0.02,
    `${r.drop.toFixed(3)} vs ${want.toFixed(3)}`);
  check('...and takes the time it should', Math.abs(r.time - t) < 1e-3);

  // ...and the SHAPE holds with drag on, which is what the game flies
  const a = flyTo(400, 0, 0, noWind).drop, b = flyTo(800, 0, 0, noWind).drop;
  check('drop grows faster than range', Math.abs(b) > Math.abs(a) * 3,
    `${a.toFixed(2)} -> ${b.toFixed(2)}`);
  const fast = flyTo(800, 0, 0, { ...noWind, muzzleVel: T.muzzleVel * 2 }).drop;
  check('a faster round drops less', Math.abs(fast) < Math.abs(b) / 3);
  check('no gravity, no drop', Math.abs(flyTo(800, 0, 0, { ...noWind, gravity: 0 }).drop) < 1e-6);
  check('drag costs time', flyTo(800, 0, 0, noWind).time > flyTo(800, 0, 0, noDrag).time);
}

console.log('the zero:');
{
  const z = zeroAngle(T.zero, noWind);
  check('the zero is a small angle up', z > 0 && z < 0.05, `${(z * 1000).toFixed(2)} mrad`);
  // THE DEFINING PROPERTY: at the zero range the round is ON the sight line
  check('the round crosses the sight line AT the zero',
    Math.abs(flyTo(T.zero, z, 0, noWind).drop) < 0.02);
  // ...and the mid-range rise is real: inside the zero it is HIGH
  check('inside the zero it shoots high', flyTo(T.zero / 2, z, 0, noWind).drop > 0.1);
  check('past the zero it shoots low', flyTo(T.zero * 2, z, 0, noWind).drop < -0.5);
  // a further zero is a steeper launch
  check('a longer zero needs more angle', zeroAngle(800, noWind) > zeroAngle(300, noWind));
}

console.log('the firing solution:');
{
  const s4 = solution(T.zero, noWind), s8 = solution(800, noWind);
  check('no hold at the zero', Math.abs(s4.holdUp) < 0.1, s4.holdUp.toFixed(3));
  check('hold UP past the zero', s8.holdUp > 1, s8.holdUp.toFixed(2));
  check('hold DOWN inside it', solution(200, noWind).holdUp < 0);
  // AND IT AGREES WITH THE BULLET. If a shooter dials the solution's hold,
  // the round must land on the sight line — this is the whole promise.
  const range = 900;
  const sol = solution(range, noWind);
  const z = zeroAngle(noWind.zero, noWind);
  const held = flyTo(range, z + sol.holdUp / MRAD, 0, noWind);
  check('dialling the hold puts the round on the line',
    Math.abs(held.drop) < 0.25, `${held.drop.toFixed(3)} m at ${range} m`);
  check('an unreachable range says so', !solution(20000, noWind).reached);
}

console.log('wind:');
{
  const calm = flyTo(800, 0, 0, noWind).drift;
  const blown = flyTo(800, 0, 0, { ...T, gust: 0 }).drift;
  check('a calm shot does not drift', Math.abs(calm) < 1e-6);
  check('a cross wind pushes it', Math.abs(blown) > 1, blown.toFixed(2));
  // 90 degrees is FROM the left, so the round goes right
  check('...to the right, from the left', blown > 0);
  check('the other side pushes the other way',
    flyTo(800, 0, 0, { ...T, gust: 0, windDir: 270 }).drift < 0);
  // A HEAD WIND IS NOT A CROSS WIND. The classic mistake is to apply wind
  // as a flat lateral push; here it acts through drag on the RELATIVE
  // velocity, so a head-on wind barely moves the round sideways at all.
  check('a head wind barely deflects',
    Math.abs(flyTo(800, 0, 0, { ...T, gust: 0, windDir: 0 }).drift) < Math.abs(blown) / 10);
  check('twice the wind is about twice the drift', (() => {
    const d2 = flyTo(800, 0, 0, { ...T, gust: 0, wind: T.wind * 2 }).drift;
    return d2 > blown * 1.7 && d2 < blown * 2.3;
  })());
  check('drift grows faster than range', (() => {
    const a = Math.abs(flyTo(400, 0, 0, { ...T, gust: 0 }).drift);
    const b = Math.abs(flyTo(800, 0, 0, { ...T, gust: 0 }).drift);
    return b > a * 2.2;
  })());
  // NO DRAG MEANS NO WIND. It is the coupling; a "wind" that moved a
  // drag-free round would be a fudge, and this pins that it is not one.
  check('a drag-free round ignores the wind',
    Math.abs(flyTo(800, 0, 0, { ...T, drag: 0, gust: 0 }).drift) < 1e-6);

  // the gust breathes, and a shot held too long is a different shot
  const w0 = windAt(0, T), w1 = windAt(T.gustPeriod / 4, T);
  check('the gust changes the wind', Math.abs(Math.hypot(...w1) - Math.hypot(...w0)) > 1);
  check('...and comes back round', Math.abs(windAt(T.gustPeriod, T)[0] - w0[0]) < 1e-6);
  check('no gust is a steady wind',
    Math.abs(windAt(3, { ...T, gust: 0 })[0] - windAt(9, { ...T, gust: 0 })[0]) < 1e-9);
}

console.log('the shooter:');
{
  const sh = makeShooter();
  check('a fresh shooter has a full breath', sh.breath === 1);
  const wide = Math.hypot(...sway(1.234, sh, T));
  stepBreath(sh, 0.5, true, T);
  check('holding is holding', sh.holding && sh.breath < 1);
  const tight = Math.hypot(...sway(1.234, sh, T));
  check('a held breath steadies the reticle', tight < wide / 2, `${tight.toFixed(2)} vs ${wide.toFixed(2)}`);
  check('...but never stops it', tight > 0);
  // it RUNS OUT
  for (let i = 0; i < 200; i++) stepBreath(sh, 0.1, true, T);
  check('the breath runs out', sh.breath === 0 && !sh.holding);
  check('...and leaning on the button does not refill it', (() => {
    for (let i = 0; i < 50; i++) stepBreath(sh, 0.1, true, T);
    return sh.breath === 0;
  })());
  check('...and the reticle opens again', Math.hypot(...sway(1.234, sh, T)) > tight * 2);
  for (let i = 0; i < 200; i++) stepBreath(sh, 0.1, false, T);
  check('letting go recovers it', sh.breath === 1);

  // the sway is BOUNDED and does not repeat inside a shot
  let max = 0;
  const seen = new Set();
  const fresh = makeShooter();
  for (let t = 0; t < 30; t += 0.05) {
    const [x, y] = sway(t, fresh, T);
    max = Math.max(max, Math.hypot(x, y));
    seen.add(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  check('the sway is bounded', max <= (T.swayFast + T.swaySlow) * 1.45 + 1e-9, max.toFixed(3));
  check('...and does not trace one loop', seen.size > 500, String(seen.size));
}

console.log('the rangefinder:');
{
  // a 1.8 m target subtending 3 mrad is 600 m away
  check('known height and subtense give the range',
    Math.abs(rangeFromMrad(1.8, 3) - 600) < 1e-9);
  check('half the subtense is twice the range',
    Math.abs(rangeFromMrad(1.8, 1.5) - 1200) < 1e-9);
  check('nothing subtended is out of sight', rangeFromMrad(1.8, 0) === Infinity);
  check('it inverts toMrad', Math.abs(rangeFromMrad(1.8, toMrad(1.8, 750)) - 750) < 1e-6);
}

console.log('hits:');
{
  check('dead centre hits', hitsAt(0, 0.4));
  check('the edge hits', hitsAt(0.4, 0.4));
  check('past it misses', !hitsAt(0.41, 0.4));
}

console.log(failures ? `\n${failures} FAILURES` : '\nall ballistics invariants hold');
process.exit(failures ? 1 : 0);
