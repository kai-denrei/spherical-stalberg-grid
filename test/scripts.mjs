// scripts.mjs — the director's scripts are well-formed before the board runs one.
import { SCRIPTS, VERBS, ANCHORS } from '../src/cine/scripts.js';
import { compileRail } from '../src/cine/rail.js';
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
console.log('director scripts:');
for (const [name, sc] of Object.entries(SCRIPTS)) {
  check(`${name}: length, seed, hud`, sc.len > 0 && Number.isInteger(sc.seed) && ['full', 'radar', 'none'].includes(sc.hud));
  check(`${name}: every cue inside the script`, sc.cues.every((c) => c.t >= 0 && c.t <= sc.len));
  check(`${name}: cues sorted`, sc.cues.every((c, i) => i === 0 || sc.cues[i - 1].t <= c.t));
  check(`${name}: every verb known`, sc.cues.every((c) => VERBS.includes(c.do)), sc.cues.filter((c) => !VERBS.includes(c.do)).map((c) => c.do).join(','));
  const rail = compileRail(sc.rail, { fov: 40 });
  check(`${name}: the rail spans the script (${rail.duration} s)`, rail.duration === sc.len);
  const p = rail.poseAt(sc.len / 2);
  check(`${name}: a pose mid-way is finite`, [...p.pos, ...p.look].every(Number.isFinite) && p.fov > 0);
  check(`${name}: the camera never sits inside the tank`, sc.rail.every((k) => Math.hypot(k.pos[0], k.pos[1], k.pos[2]) > 0.6));
  check(`${name}: every anchor known`, sc.rail.every((k) => !k.at || ANCHORS.includes(k.at)));
}
console.log(failures === 0 ? 'scripts: all good' : `scripts: ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
