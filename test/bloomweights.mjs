// bloomweights.mjs — the per-group bloom weight resolver.
//
// Pure on purpose: the walk uses .children rather than three's .traverse
// so it can be exercised on plain fake nodes, with no WebGL and no DOM.

import { BLOOM_GROUPS, DEFAULT_BLOOM_WEIGHTS, clampWeight, buildWeightMap, materialConflicts }
  from '../src/bloomweights.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

// minimal stand-in for an Object3D
const node = (name, material = null, children = []) => ({ name, material, children });

console.log('constants:');
check('five groups', BLOOM_GROUPS.length === 5);
check('effects is a group (the default)', BLOOM_GROUPS.includes('effects'));
check('every group has a default weight',
  BLOOM_GROUPS.every((g) => typeof DEFAULT_BLOOM_WEIGHTS[g] === 'number'));
check('map starts dimmer than enemies',
  DEFAULT_BLOOM_WEIGHTS.map < DEFAULT_BLOOM_WEIGHTS.enemies);

console.log('clampWeight:');
check('passes a normal value', clampWeight(1.3) === 1.3);
check('clamps negative to 0', clampWeight(-5) === 0);
check('clamps above 3', clampWeight(99) === 3);
check('NaN falls back to 1', clampWeight(NaN) === 1);
check('undefined falls back to 1', clampWeight(undefined) === 1);

console.log('buildWeightMap — inheritance:');
{
  const leaf = node('leaf');
  const mid = node('mid', null, [leaf]);
  const root = node('root', null, [mid]);
  const m = buildWeightMap([['map', [root]]], { map: 0.35, effects: 1 });
  check('root gets its group weight', m.get(root) === 0.35);
  check('child inherits', m.get(mid) === 0.35);
  check('grandchild inherits', m.get(leaf) === 0.35);
}

console.log('buildWeightMap — separation:');
{
  const a = node('a'), b = node('b');
  const m = buildWeightMap([['map', [a]], ['enemies', [b]]], { map: 0.35, enemies: 1.3 });
  check('each root gets its own weight', m.get(a) === 0.35 && m.get(b) === 1.3);
  check('unlisted nodes are absent (caller applies the default)',
    m.get(node('stranger')) === undefined);
}

console.log('buildWeightMap — robustness:');
{
  const shared = node('shared');
  const m = buildWeightMap([['map', [shared]], ['enemies', [shared]]], { map: 0.35, enemies: 1.3 });
  check('a node in two groups keeps the FIRST', m.get(shared) === 0.35);
}
{
  const m = buildWeightMap([['map', [null, undefined]], ['bogus', [node('x')]]], { map: 0.5 });
  check('null/undefined roots are skipped, not thrown on', m.size === 0);
}
{
  const cyc = node('cyc');
  cyc.children = [cyc]; // pathological, but must not hang
  const m = buildWeightMap([['map', [cyc]]], { map: 0.5 });
  check('a cycle terminates', m.get(cyc) === 0.5 && m.size === 1);
}

console.log('materialConflicts — the silent-bug tripwire:');
{
  const shared = { name: 'shared-mat' };
  const m = new Map([
    [node('a', shared), 0.35],
    [node('b', shared), 1.3],
  ]);
  const c = materialConflicts(m);
  check('detects one material under two weights', c.length === 1, JSON.stringify(c.length));
  check('reports both weights', c[0].weights.includes(0.35) && c[0].weights.includes(1.3));
}
{
  const shared = { name: 'shared-mat' };
  const m = new Map([[node('a', shared), 1], [node('b', shared), 1]]);
  check('silent when the shared material agrees', materialConflicts(m).length === 0);
}
check('silent on materialless nodes',
  materialConflicts(new Map([[node('a'), 1]])).length === 0);

if (failures > 0) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nbloom weight invariants hold');
