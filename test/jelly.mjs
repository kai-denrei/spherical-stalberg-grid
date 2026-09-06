// jelly.mjs — THE CHEAP BOSS, as invariants.
//
// This exists because the expensive version was measured and refused:
// ~/Dev/Jelly-Baby is 144,464 triangles with 72,234 vertices re-uploaded from
// the CPU every frame, a 4,026-tetrahedron XPBD solve at 240 Hz in WASM, a
// caustics worker and a transmission pass — on WebGPU and three r185. The
// numbers below are the whole argument for the substitute, so they are pinned
// rather than remembered.
import { jellyGeometry, JELLY_TUNE } from '../src/jelly.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

const geo = jellyGeometry();
const pos = geo.attributes.position;
const tris = pos.count / 3;

console.log('the budget:');
check('it is a few thousand triangles, not a hundred thousand',
  tris > 1500 && tris < 6000, `${tris}`);
check('...which is under 5% of the model that was refused', tris / 144464 < 0.05);
check('ONE mesh — the appendages are the body, not parts bolted on',
  geo.attributes.position !== undefined && geo.groups.length <= 1);

console.log('the geometry is sane:');
{
  const a = pos.array;
  let bad = 0, rmin = Infinity, rmax = 0, sum = 0, n = 0;
  for (let i = 0; i < a.length; i += 3) {
    const r = Math.hypot(a[i], a[i + 1], a[i + 2]);
    if (!Number.isFinite(r)) bad++;
    rmin = Math.min(rmin, r); rmax = Math.max(rmax, r);
    sum += r; n++;
  }
  check('no NaN or infinite vertices', bad === 0, `${bad}`);
  check('normalised to a unit extent, so cellSide * size means what it means',
    Math.abs(rmax - 1) < 1e-6, `${rmax}`);
  check('nothing collapses to the origin', rmin > 0.15, `${rmin}`);
  // THE BRIEF: "more of a mass with tentacle-like appendages". If the mean
  // radius approaches the max it is a ball; if it collapses it is a spider.
  const massiness = sum / n / rmax;
  check('it is a MASS with appendages, not a star of limbs',
    massiness > 0.35 && massiness < 0.62, `mean/max = ${massiness.toFixed(2)}`);
  check('...and not a plain sphere either', massiness < 0.85);
  check('normals were computed', geo.attributes.normal !== undefined);
}

console.log('deterministic:');
{
  const a = jellyGeometry(JELLY_TUNE, 3).attributes.position.array;
  const b = jellyGeometry(JELLY_TUNE, 3).attributes.position.array;
  let same = a.length === b.length;
  for (let i = 0; same && i < a.length; i++) if (a[i] !== b[i]) same = false;
  check('the same seed builds the same body — no Math.random anywhere', same);
  const c = jellyGeometry(JELLY_TUNE, 9).attributes.position.array;
  let diff = 0;
  for (let i = 0; i < Math.min(a.length, c.length); i++) if (a[i] !== c[i]) diff++;
  check('a different seed builds a different body', diff > a.length * 0.5);
}

console.log('the tune is coherent:');
check('the appendages are lobes, not spikes — a sharp falloff still leaves a body',
  JELLY_TUNE.tentSharp >= 4 && JELLY_TUNE.tentLen < 1.2);
check('the wobble is a wobble, not a pulse that turns it inside out',
  JELLY_TUNE.wobbleAmp > 0 && JELLY_TUNE.wobbleAmp < 0.25);
check('a hit swells it without doubling it', JELLY_TUNE.hitPulse < 0.5);

console.log(failures ? `\n${failures} FAILURES` : '\nall jelly invariants hold');
process.exit(failures ? 1 : 0);
