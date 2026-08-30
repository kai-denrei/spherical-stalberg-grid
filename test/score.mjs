// score.mjs — the scoreboard's contract: hands-on pays most, pressure
// multiplies, the best survives a reset.
import {
  SRC_WEIGHT, POINT_SCALE, fieldMult, killScore, waveScore, makeScore,
  FIELD_CAP,
} from '../src/score.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

console.log('weights:');
{
  check('tank kills outscore tower kills', SRC_WEIGHT.tank > SRC_WEIGHT.tower);
  check('tank kills outscore strike kills', SRC_WEIGHT.tank > SRC_WEIGHT.strike);
  const t = killScore(10, { src: 'tank' }), w = killScore(10, { src: 'tower' });
  check('the weight reaches the number', t === w * SRC_WEIGHT.tank, `${t} vs ${w}`);
  check('a ram pays its premium on top', killScore(10, { src: 'tank', ram: true }) > t);
  check('unknown sources fall back to tower weight',
    killScore(10, { src: 'meteor' }) === w);
}

console.log('field multiplier:');
{
  check('an empty field multiplies by 1', fieldMult(0) === 1);
  let mono = true;
  for (let a = 1; a <= 60; a++) if (fieldMult(a) < fieldMult(a - 1)) mono = false;
  check('more enemies never pay less', mono);
  check('the cap holds', fieldMult(1000) === FIELD_CAP);
  check('a swarmed kill outscores a lone one',
    killScore(10, { src: 'tank', alive: 20 }) > killScore(10, { src: 'tank', alive: 0 }));
}

console.log('waves:');
{
  let mono = true;
  for (let w = 2; w <= 30; w++) if (waveScore(w) <= waveScore(w - 1)) mono = false;
  check('deeper waves are worth more', mono);
}

console.log('the counter:');
{
  const s = makeScore(500);
  s.addKill(10, { src: 'tank' });
  check('kills accumulate', s.points === killScore(10, { src: 'tank' }));
  check('best holds while points are below it', s.best === 500);
  s.addKill(45, { src: 'tank', alive: 30 });
  s.addWave(9);
  const high = s.points;
  check('best follows a new record live', s.best === high && high > 500);
  s.reset();
  check('reset clears points, keeps the best', s.points === 0 && s.best === high);
  check('points scale is chunky (x10 bounty)', killScore(1, {}) === POINT_SCALE);
}

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('score: all good');
