// perftier.mjs — the render budget is a table; these are the table's rules.
import { TIERS, pickTier, wormholeCost } from '../src/perftier.js';
import { WORMHOLE_PRESET, WORMHOLE_RENDER } from '../src/portalfx.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

console.log('the phone pays less on every axis, and it is written down:');
{
  const d = TIERS.desktop, p = TIERS.phone;
  check('pixel ratio cap lower', p.dprCap < d.dprCap);
  check('no MSAA on the phone', p.antialias === false && d.antialias === true);
  check('wormhole smaller AND slower', p.wormhole.size < d.wormhole.size && p.wormhole.updateHz < d.wormhole.updateHz);
  check('bloom at half res', p.bloomScale === 0.5 && d.bloomScale === 1);
  check('the plan\'s numbers: 256@24', p.wormhole.size === 256 && p.wormhole.updateHz === 24);
  check('desktop wormhole IS portalfx\'s cost decision (one source)',
    d.wormhole.size === WORMHOLE_RENDER.size && d.wormhole.updateHz === WORMHOLE_RENDER.updateHz);
}

console.log('the pick:');
{
  check('coarse + phone-class short side -> phone', pickTier({ coarse: true, shortSide: 390 }) === TIERS.phone);
  check('coarse tablet (short side 900+) -> desktop', pickTier({ coarse: true, shortSide: 1024 }) === TIERS.desktop);
  check('fine pointer, any size -> desktop', pickTier({ coarse: false, shortSide: 390 }) === TIERS.desktop);
  check('forced by name wins', pickTier({ coarse: false, shortSide: 2000, forced: 'phone' }) === TIERS.phone);
  check('an unknown name is ignored, not a crash', pickTier({ coarse: true, shortSide: 390, forced: 'toaster' }) === TIERS.phone);
  check('no facts at all -> desktop', pickTier() === TIERS.desktop);
}

console.log('the cost, so the tier is a number and not a feeling:');
{
  const d = wormholeCost(TIERS.desktop, WORMHOLE_PRESET);
  const p = wormholeCost(TIERS.phone, WORMHOLE_PRESET);
  const ratio = p.foldsPerSec / d.foldsPerSec;
  console.log(`       desktop ${(d.folds / 1e6).toFixed(0)}M/frame ${(d.foldsPerSec / 1e9).toFixed(2)}G/s`
    + ` · phone ${(p.folds / 1e6).toFixed(0)}M/frame ${(p.foldsPerSec / 1e9).toFixed(2)}G/s · ratio ${ratio.toFixed(3)}`);
  check('phone wormhole under 40% of desktop per second', ratio < 0.4, ratio.toFixed(3));
  check('...and the LOOK is untouched (steps/octaves are the preset\'s, not the tier\'s)',
    !('uSteps' in TIERS.phone) && !('uTurbOctaves' in TIERS.phone));
}

if (failures) { console.error(`perftier: ${failures} FAILED`); process.exit(1); }
console.log('perftier: all good');
