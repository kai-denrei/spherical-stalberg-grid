// audiomanifest.mjs — the manifest is data, so the test is a schema and
// a cross-check against the tower roster. The tower check is the point:
// it fails loudly if a tower is ever added without a sound.

import { existsSync } from 'node:fs';
import { SOUNDS, BUSES, DEATH_KEYS, GLOBAL_VOICE_CAP, DISTANCE_K } from '../src/audiomanifest.js';
import { TOWERS } from '../src/towers.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

const keys = Object.keys(SOUNDS);

console.log('schema:');
check('has entries', keys.length >= 17, `got ${keys.length}`);
for (const k of keys) {
  const s = SOUNDS[k];
  if (typeof s.file !== 'string' || !s.file.endsWith('.mp3')) {
    check(`${k}: file is an mp3 path`, false, JSON.stringify(s.file));
  }
  if (!BUSES.includes(s.bus)) check(`${k}: bus is known`, false, s.bus);
  if (!(s.gain > 0 && s.gain <= 2)) check(`${k}: gain in (0,2]`, false, String(s.gain));
  if (!Number.isInteger(s.maxVoices) || s.maxVoices < 1) {
    check(`${k}: maxVoices >= 1`, false, String(s.maxVoices));
  }
  if (!(s.minInterval >= 0)) check(`${k}: minInterval >= 0`, false, String(s.minInterval));
  if (!(s.rateJitter >= 0 && s.rateJitter < 0.5)) {
    check(`${k}: rateJitter in [0,0.5)`, false, String(s.rateJitter));
  }
}
check('every entry passes the schema', failures === 0);

console.log('files on disk:');
for (const k of keys) {
  const path = new URL(`../${SOUNDS[k].file}`, import.meta.url).pathname;
  check(`${k} exists`, existsSync(path), path);
}

console.log('tower coverage:');
for (const t of TOWERS) {
  check(`tower '${t.key}' has a sound`, Object.hasOwn(SOUNDS, `tower_${t.key}`));
}
check('tower_upgrade exists', Object.hasOwn(SOUNDS, 'tower_upgrade'));

console.log('constants:');
check('three death sounds', DEATH_KEYS.length === 3);
check('death keys all resolve', DEATH_KEYS.every((k) => Object.hasOwn(SOUNDS, k)));
check('global cap is sane', GLOBAL_VOICE_CAP >= 8 && GLOBAL_VOICE_CAP <= 64);
check('distance k is positive', DISTANCE_K > 0);

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\naudio manifest invariants hold');
