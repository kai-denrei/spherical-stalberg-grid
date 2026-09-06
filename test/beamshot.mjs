// beamshot.mjs — the held beam (lance / plasma throw), as invariants.
//
// This exists because of a bug that a screenshot cannot see and a probe only
// caught by accident: the sentry range concluded that beamfx "renders nothing
// in this scene" and rewrote the lance as a plain line. It rendered fine. What
// did not was a ribbon built at the BOARD's cell widths — sub-pixel in a yard
// viewed from fifty cells out. So the size is an explicit argument, and these
// pin that it is honoured, that the two weapons stay distinguishable, and that
// the fade is not silently undone by the shader's own update.
import { makeBeamShot, LANCE_LOOK, THROW_LOOK } from '../src/shotfx.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
// the real THREE vectors — makeBeamShot lerps them, so they must be genuine
const THREE = await import('../vendor/three.module.js');
const a = new THREE.Vector3(0, 1, 0);
const b = new THREE.Vector3(6, 1, 0);
const W = 0.5;

console.log('beamshot:');
const lance = makeBeamShot(a, b, 0x4dff86, 'lance', { glowWidth: W });
const thrown = makeBeamShot(a, b, 0xff8a3c, 'throw', { glowWidth: W });

const gw = (g, k) => g.children[k].material.uniforms.uGlowWidth.value;
const uni = (g, k, n) => g.children[k].material.uniforms[n].value;

check('a beam is built from links', lance.children.length === 5 && thrown.children.length === 5,
  `${lance.children.length}/${thrown.children.length}`);

// THE SIZE IS THE ARGUMENT. Every earlier version of this drawing derived its
// width from a cell, which is what made it invisible in a scene with no cells.
check('the widest link matches the width asked for',
  Math.abs(gw(thrown, 4) - W * THROW_LOOK.width) < W * 0.02,
  `${gw(thrown, 4)} vs ${W}`);
check('width scales linearly with the argument',
  Math.abs(gw(makeBeamShot(a, b, 0, 'throw', { glowWidth: W * 2 }), 4) - gw(thrown, 4) * 2) < 1e-6);

// A LANCE IS NOT A THROWER. Same shader, opposite settings — if these ever
// converge the range and the board stop teaching two weapons.
check('a lance is thinner than a throw by the shared ratio',
  Math.abs(gw(lance, 4) / gw(thrown, 4) - LANCE_LOOK.width / THROW_LOOK.width) < 1e-6,
  `${gw(lance, 4) / gw(thrown, 4)}`);
check('a lance does not jitter and a throw does',
  uni(lance, 2, 'uJitterAmount') === 0 && uni(thrown, 2, 'uJitterAmount') > 0);
check('a lance is steadier than a throw',
  uni(lance, 0, 'uFlicker') < uni(thrown, 0, 'uFlicker'));

// The links are one beam, not a row of beads: only the two real ends taper.
check('only the first link caps at the start',
  uni(lance, 0, 'uCapStart') > 0 && uni(lance, 1, 'uCapStart') === 0
  && uni(lance, 4, 'uCapStart') === 0);
check('only the last link caps at the end',
  uni(lance, 4, 'uCapEnd') > 0 && uni(lance, 0, 'uCapEnd') === 0);
check('the beam opens from muzzle to target',
  gw(lance, 0) < gw(lance, 2) && gw(lance, 2) < gw(lance, 4));

// the links chain end to end and span the whole shot
check('link 0 starts at the muzzle',
  uni(lance, 0, 'uStart').distanceTo(a) < 1e-6);
check('the last link ends at the target',
  uni(lance, 4, 'uEnd').distanceTo(b) < 1e-6);
check('links are contiguous',
  [0, 1, 2, 3].every((k) => uni(lance, k, 'uEnd').distanceTo(uni(lance, k + 1, 'uStart')) < 1e-6));

// THE FADE IS A UNIFORM AND update() OVERWRITES IT. beamfx's update writes
// uAlpha from its burst envelope, so a fade applied before it is thrown away —
// which is a beam that never dims and then vanishes on removal.
lance.userData.setFade(0.25);
check('setFade reaches the uniform', Math.abs(uni(lance, 0, 'uAlpha') - 0.25) < 1e-6);
lance.userData.update(3.5);
check('update does not undo the fade', Math.abs(uni(lance, 0, 'uAlpha') - 0.25) < 1e-6,
  `${uni(lance, 0, 'uAlpha')}`);
check('update advances the shader clock', uni(lance, 0, 'uTime') === 3.5);

console.log(failures ? `\n${failures} FAILURES` : '\nall beamshot invariants hold');
process.exit(failures ? 1 : 0);
