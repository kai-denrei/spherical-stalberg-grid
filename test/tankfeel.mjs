// tankfeel.mjs — invariants for the shared hover/recoil/health driver
// (src/tankfeel.js). Pure module: it only writes .position/.rotation on
// objects handed to it, so plain stand-ins are enough. This suite exists
// because two callers drive it — the game and the viewer's test bench — and
// a drift between them is exactly the bug the module was made to prevent.
import {
  TANK_FEEL, makeTankFeel, stepTankFeel, landTankFeel, fireTankFeel,
  applyTankFeel, applyTankHealth, healthColor,
} from '../src/tankfeel.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

// A stand-in for the bits of a three.js Object3D this module touches.
const node = (baseZ) => ({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  userData: baseZ === undefined ? {} : { baseZ },
});
const tank = ({ turret = true, hover = true, baseZ } = {}) => {
  const u = { userData: {} };
  if (turret) u.userData.turret = node(baseZ);
  if (hover) { u.userData.hoverBody = node(); u.userData.hoverGear = node(); }
  return u;
};
const run = (st, secs, running, dt = 1 / 60) => {
  for (let i = 0; i < Math.round(secs / dt); i++) stepTankFeel(st, dt, running);
  return st;
};

console.log('hover:');
{
  const st = makeTankFeel();
  check('starts settled', st.hoverT === 0 && st.recoil === 0);
  run(st, 4, true);
  check('spools up to full', st.hoverT > 0.99, `hoverT=${st.hoverT}`);
  run(st, 4, false);
  check('spools back down', st.hoverT < 0.01, `hoverT=${st.hoverT}`);

  // Rise is a GESTURE, not a jump: no single frame may deliver most of it.
  const s2 = makeTankFeel();
  stepTankFeel(s2, 1 / 60, true);
  check('one frame moves only a sliver', s2.hoverT < 0.05, `hoverT=${s2.hoverT}`);

  // Down must not be slower than up, or the tank sinks rather than drops.
  check('settle is at least as quick as spool-up', TANK_FEEL.down >= TANK_FEEL.up);
}

console.log('hover geometry:');
{
  const u = tank();
  const st = makeTankFeel();
  run(st, 4, true);
  applyTankFeel(u, st);
  const gap = u.userData.hoverBody.position.y - u.userData.hoverGear.position.y;
  check('body rises', u.userData.hoverBody.position.y > 0);
  check('gear drops', u.userData.hoverGear.position.y < 0);
  check('gap is rise + gearDrop', approx(gap, TANK_FEEL.rise + TANK_FEEL.gearDrop, 1e-3), `gap=${gap}`);
  // The whole point of the split: the gap opens, the tank does not levitate
  // as one lump. Total travel must stay small against tank height (~1 unit).
  check('travel stays subtle', gap < 0.25, `gap=${gap}`);
}

console.log('recoil:');
{
  const u = tank({ baseZ: -0.12 });
  const st = makeTankFeel();
  run(st, 4, true);
  const rest = (() => { applyTankFeel(u, st); return u.userData.turret.position.z; })();
  check('turret rests at baseZ', approx(rest, -0.12, 1e-3), `z=${rest}`);

  fireTankFeel(st);
  check('fire arms the full kick', approx(st.recoil, TANK_FEEL.recoilLen));
  applyTankFeel(u, st);
  check('turret slides back', u.userData.turret.position.z < rest - 0.1,
        `z=${u.userData.turret.position.z}`);
  check('body noses up', u.userData.hoverBody.rotation.x < 0,
        `rx=${u.userData.hoverBody.rotation.x}`);

  run(st, TANK_FEEL.recoilLen + 0.05, true);
  check('recoil expires', st.recoil === 0);
  applyTankFeel(u, st);
  check('turret returns to baseZ', approx(u.userData.turret.position.z, -0.12, 1e-3),
        `z=${u.userData.turret.position.z}`);
}

console.log('recoil without a hover split:');
{
  // The procedural tank has a turret but no body group. It must still kick —
  // this is why the recoil block sits ahead of the hoverBody early return.
  const u = tank({ hover: false });
  const st = makeTankFeel();
  fireTankFeel(st);
  applyTankFeel(u, st);
  check('turret still slides', u.userData.turret.position.z < -0.1,
        `z=${u.userData.turret.position.z}`);
  check('missing baseZ reads as 0', u.userData.turret.position.z > -0.3);
}

console.log('rock + recoil compose:');
{
  // Firing mid-landing must read as BOTH. Two writes to rotation.x would
  // silently keep only the last, which is the bug this asserts against.
  const u = tank();
  const st = makeTankFeel();
  run(st, 4, true);
  landTankFeel(st);
  stepTankFeel(st, 1 / 60, true);
  applyTankFeel(u, st);
  const rockOnly = u.userData.hoverBody.rotation.x;
  const rz = u.userData.hoverBody.rotation.z;
  check('landing rocks the body', rockOnly !== 0 && rz !== 0);
  fireTankFeel(st);
  applyTankFeel(u, st);
  check('recoil adds to the rock', u.userData.hoverBody.rotation.x < rockOnly - 0.01,
        `${rockOnly} -> ${u.userData.hoverBody.rotation.x}`);
  check('roll is untouched by recoil', approx(u.userData.hoverBody.rotation.z, rz));
}

console.log('vibration:');
{
  const u = tank();
  const st = makeTankFeel();
  applyTankFeel(u, st);
  check('still when stopped', u.userData.hoverBody.position.x === 0 && u.userData.hoverBody.position.z === 0);
  run(st, 4, true);
  let maxX = 0;
  for (let i = 0; i < 400; i++) { stepTankFeel(st, 1 / 60, true); applyTankFeel(u, st); maxX = Math.max(maxX, Math.abs(u.userData.hoverBody.position.x)); }
  check('vibrates when running', maxX > TANK_FEEL.vib * 0.5, `maxX=${maxX}`);
  check('vibration stays under the rise', maxX < TANK_FEEL.rise, `maxX=${maxX}`);
}

console.log('tolerates the units that have none of this:');
{
  applyTankFeel(null, makeTankFeel());
  applyTankFeel({}, makeTankFeel());
  applyTankFeel({ userData: {} }, makeTankFeel());
  applyTankHealth({ userData: {} }, 0.5);
  applyTankHealth(null, 0.5);
  check('no throw on bare units', true);
}

console.log('health colour:');
{
  const [r0, g0, b0] = healthColor(0);
  const [r1, g1, b1] = healthColor(1);
  check('full health reads blue', b1 > r1 && b1 > g1, `${r1},${g1},${b1}`);
  check('dead reads red', r0 > g0 && r0 > b0, `${r0},${g0},${b0}`);
  const [rm, gm, bm] = healthColor(0.5);
  check('midpoint is orange', rm > bm && gm > bm && gm < rm, `${rm},${gm},${bm}`);
  check('clamps below 0', healthColor(-3).every((c, i) => approx(c, healthColor(0)[i])));
  check('clamps above 1', healthColor(9).every((c, i) => approx(c, healthColor(1)[i])));
  // Monotonic blue: the beam must not brighten as the tank dies.
  let mono = true, prev = -1;
  for (let f = 0; f <= 1.0001; f += 0.05) { const b = healthColor(f)[2]; if (b < prev - 1e-9) mono = false; prev = b; }
  check('blue rises monotonically with health', mono);
}

console.log('health paint:');
{
  const mat = { color: { setRGB(r, g, b) { this.v = [r, g, b]; } },
                emissive: { setRGB(r, g, b) { this.v = [r, g, b]; } } };
  const u = { userData: { healthBeam: { material: mat } } };
  applyTankHealth(u, 1);
  check('paints colour', !!mat.color.v && mat.color.v[2] > mat.color.v[0]);
  check('emissive trails colour', mat.emissive.v[2] < mat.color.v[2]);
  // Multi-material beams (the merged GLB mast) must all get painted.
  const a = { color: { setRGB(r, g, b) { this.v = [r, g, b]; } } };
  const b = { color: { setRGB(r, g, b) { this.v = [r, g, b]; } } };
  applyTankHealth({ userData: { healthBeam: { material: [a, b] } } }, 0);
  check('paints every material', !!a.color.v && !!b.color.v);
}

console.log(failures ? `\n${failures} FAILURES` : '\nall tankfeel invariants hold');
process.exit(failures ? 1 : 0);
