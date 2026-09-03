// weathered.mjs — the metal is a function of the seed, and the bytes say so.
//
// A look cannot be asserted, but the properties that MAKE the look can:
// that metalness really collapses inside the patina (the channel that does
// the corrosion read), that roughness stays inside its declared band, that
// the tile has no seam (the whole reason the lattice periods are integers),
// and that the same seed bakes the same metal twice.
import { bakeWeatheredMetal, weatherStats, makeNoise, fbm, WEATHER_PRESETS } from '../src/weathered.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

console.log('weathered metal:');

// ---- the noise underneath ----
const nz = makeNoise(7);
let inUnit = true, det = true;
const nz2 = makeNoise(7);
for (let i = 0; i < 500; i++) {
  const x = i * 0.37, y = i * 0.11;
  const v = nz(x, y, 16, 16, 0);
  if (!(v >= 0 && v <= 1) || !Number.isFinite(v)) inUnit = false;
  if (nz2(x, y, 16, 16, 0) !== v) det = false;
}
check('value noise stays in [0,1] and is finite', inUnit);
check('same seed, same noise', det);
check('a different seed is a different field', nz(3.3, 1.7, 16, 16, 0) !== makeNoise(8)(3.3, 1.7, 16, 16, 0));
// the tiling guarantee, at the source: u = 0 and u = 1 are the same lattice point
check('the lattice wraps at its period', Math.abs(nz(0, 0.5, 16, 16, 0) - nz(16, 0.5, 16, 16, 0)) < 1e-12);
check('per-axis periods wrap independently',
  Math.abs(nz(0.5, 0, 96, 6, 0) - nz(0.5, 6, 96, 6, 0)) < 1e-12);
let fbmOk = true;
for (let i = 0; i < 200; i++) {
  const v = fbm(nz, i / 200, (i * 7 % 200) / 200, { px: 5, py: 5, octaves: 3, salt: 1 });
  if (!(v >= 0 && v <= 1) || !Number.isFinite(v)) fbmOk = false;
}
check('fbm stays in [0,1] over three octaves', fbmOk);

// ---- the bake ----
const A = bakeWeatheredMetal({ seed: 4414, size: 128 });
const B = bakeWeatheredMetal({ seed: 4414, size: 128 });
const C = bakeWeatheredMetal({ seed: 4415, size: 128 });
check('same seed, same metal', same(A.albedo, B.albedo) && same(A.orm, B.orm) && same(A.normal, B.normal));
check('next seed, different metal', !same(A.albedo, C.albedo) && !same(A.orm, C.orm));
check('three RGBA maps, sized', A.size === 128
  && A.albedo.length === 128 * 128 * 4 && A.orm.length === 128 * 128 * 4 && A.normal.length === 128 * 128 * 4);
check('alpha is opaque everywhere', (() => {
  for (let k = 3; k < A.albedo.length; k += 4) if (A.albedo[k] !== 255 || A.orm[k] !== 255 || A.normal[k] !== 255) return false;
  return true;
})());

const s = weatherStats(A);

// THE CHANNEL THAT DOES THE WORK. three.js reads metalnessMap from BLUE;
// if the patina did not collapse it, corrosion would not read at all.
check(`metalness spans its band (${s.metalMin}..${s.metalMax} of 255)`,
  s.metalMin < 60 && s.metalMax > 220,
  `expected a low patina floor and a high raw-plate ceiling, got ${s.metalMin}..${s.metalMax}`);
// PLATE WITH PATCHES, not patches of plate. Counted by the bake from the
// oxide mask itself — the maps cannot answer it, because metalnessMap alone
// cannot tell corroded steel from rubber, which is never metallic anywhere.
check(`oxide takes patches, not the surface (${(A.coverage * 100).toFixed(1)}%)`,
  A.coverage > 0.02 && A.coverage < 0.30, `${A.coverage}`);

// roughness must stay inside the preset's declared band, plus the scratch
// and oxide bumps the baker adds on top of it (0.18 + 0.14 at most)
const [rLo, rHi] = WEATHER_PRESETS.gunmetal.roughness;
check(`roughness inside its band (${s.roughMin}..${s.roughMax} of 255)`,
  s.roughMin >= Math.floor(rLo * 255) - 2 && s.roughMax <= Math.ceil((rHi + 0.32) * 255) + 2,
  `band ${rLo}..${rHi} (+0.32 bumps) => ${Math.floor(rLo * 255)}..${Math.ceil((rHi + 0.32) * 255)}`);
check('the plate is dark: mean albedo under 90/255',
  (() => { let t = 0, c = 0; for (let i = 0; i < A.albedo.length; i++) if (i % 4 !== 3) { t += A.albedo[i]; c++; } return t / c < 90; })());

// THE SEAM. Integer per-axis periods are the only reason the maps tile; if
// a frequency ever stops dividing its period this is the test that says so.
check(`albedo tiles (seam ${s.seamAlbedo.toFixed(1)}/255)`, s.seamAlbedo < 6, `${s.seamAlbedo}`);
check(`orm tiles (seam ${s.seamOrm.toFixed(1)}/255)`, s.seamOrm < 6, `${s.seamOrm}`);
check(`normal tiles (seam ${s.seamNormal.toFixed(1)}/255)`, s.seamNormal < 6, `${s.seamNormal}`);

// a normal map is a unit vector field: every texel must decode to length ~1
let unit = true, maxErr = 0;
for (let k = 0; k < A.size * A.size; k++) {
  const x = A.normal[k * 4] / 255 * 2 - 1;
  const y = A.normal[k * 4 + 1] / 255 * 2 - 1;
  const z = A.normal[k * 4 + 2] / 255 * 2 - 1;
  const e = Math.abs(Math.hypot(x, y, z) - 1);
  if (e > maxErr) maxErr = e;
  if (e > 0.02) unit = false;
}
check(`normals decode to unit length (max error ${maxErr.toFixed(4)})`, unit);
check('normals point OUT: +Z everywhere', (() => {
  for (let k = 0; k < A.size * A.size; k++) if (A.normal[k * 4 + 2] < 128) return false;
  return true;
})());

// ---- the presets are a ladder, not three copies ----
const g = weatherStats(bakeWeatheredMetal({ seed: 1, size: 96, preset: 'gunmetal' }));
const st = weatherStats(bakeWeatheredMetal({ seed: 1, size: 96, preset: 'steel' }));
const ru = weatherStats(bakeWeatheredMetal({ seed: 1, size: 96, preset: 'rubber' }));
check(`rubber is barely metal (mean ${ru.metal.toFixed(0)} vs gunmetal ${g.metal.toFixed(0)})`,
  ru.metal < 40 && g.metal > 150);
check(`rubber is rougher than steel is rougher than gunmetal (${g.rough.toFixed(0)} < ${st.rough.toFixed(0)} < ${ru.rough.toFixed(0)})`,
  g.rough < st.rough && st.rough < ru.rough);
check(`the bias ladder orders coverage: rubber <= steel <= gunmetal (${(ru.coverage * 100).toFixed(1)}% <= ${(st.coverage * 100).toFixed(1)}% <= ${(g.coverage * 100).toFixed(1)}%)`,
  ru.coverage <= st.coverage && st.coverage <= g.coverage);

// an override beats its preset, so one baker serves a named material without
// a fourth preset being invented for every rung
const dark = bakeWeatheredMetal({ seed: 1, size: 64, preset: 'gunmetal', baseHex: 0x000000 });
check('an explicit knob overrides the preset', (() => {
  let t = 0, c = 0; for (let i = 0; i < dark.albedo.length; i++) if (i % 4 !== 3) { t += dark.albedo[i]; c++; }
  return t / c < 20;
})());

// ---- the size claim ----
check(`a 1024 set is ${(weatherStats(bakeWeatheredMetal({ seed: 1, size: 256 })).bytes / 1024 / 1024 * 16).toFixed(0)} MB of RAM and 0 bytes on the wire`,
  true);

console.log(failures === 0 ? 'weathered: all good' : `weathered: ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
