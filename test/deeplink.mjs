// deeplink.mjs — a lab's state as a URL, as invariants. Two of these are the
// difference between a link that works and one that silently carries half of
// what you meant: the '#' in a colour, and the diff-only rule.
import {
  encodeValue, sameAsDefault, deepLinkQuery, deepLink, DROP_KEYS,
} from '../src/deeplink.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

console.log('values:');
check('a boolean is 1/0', encodeValue(true) === '1' && encodeValue(false) === '0');
check('float noise is dropped', encodeValue(0.22000000000000003) === '0.22');
check('a round number stays round', encodeValue(10) === '10' && encodeValue(1.5) === '1.5');
check('an integer-valued float loses its point', encodeValue(2.0) === '2');
// THE ONE THAT TRUNCATES LINKS. A '#' in a query ends the query.
check('a colour loses its hash', encodeValue('#4b5157') === '4b5157');
check('a plain string is left alone', encodeValue('tank') === 'tank');
check('the encoded form is what "same" means',
  sameAsDefault(0.22, 0.22000000000000003) && !sameAsDefault(0.22, 0.23));

console.log('only what differs:');
{
  const D = { spin: true, outline: 0.22, seed: 4414, base: '#4b5157', subject: 'tank' };
  check('an untouched panel writes nothing', deepLinkQuery({ ...D }, D) === '');
  check('one moved knob writes one key',
    deepLinkQuery({ ...D, outline: 0.5 }, D) === 'outline=0.5');
  check('keys are sorted, so the same state is the same link',
    deepLinkQuery({ ...D, spin: false, outline: 0.5 }, D) === 'outline=0.5&spin=0');
  check('a colour survives as a bare hex',
    deepLinkQuery({ ...D, base: '#ff0000' }, D) === 'base=ff0000');
  check('a key with no default is always written',
    deepLinkQuery({ ...D, extra: 3 }, D) === 'extra=3');
  check('skip drops a key entirely',
    deepLinkQuery({ ...D, outline: 0.5, extra: 3 }, D, { skip: ['extra'] }) === 'outline=0.5');
  check('functions and objects are never written',
    deepLinkQuery({ f: () => {}, o: { a: 1 }, n: 2 }, {}) === 'n=2');
  check('null and undefined are never written',
    deepLinkQuery({ a: null, b: undefined, c: 1 }, {}) === 'c=1');
}

console.log('the whole address:');
{
  const D = { spin: true, outline: 0.22 };
  check('a default panel is just the tab',
    deepLink({ base: 'x.html', hash: 'metal', params: { ...D }, defaults: D }) === 'x.html#metal');
  check('the hash goes last',
    deepLink({ base: 'x.html', hash: 'metal', params: { ...D, outline: 0.5 }, defaults: D })
      === 'x.html?outline=0.5#metal');
  check('a bare hash name is accepted', deepLink({ hash: '#astro' }) === '#astro');

  // CARRY: the seed and the tier are not the lab's, and the link should keep
  // them anyway — they are the context the numbers were found in
  check('context is carried',
    deepLink({ hash: 'metal', carry: '?seed=99&tier=phone', params: { ...D }, defaults: D })
      === '?seed=99&tier=phone#metal');
  check('the live panel beats a stale copy in the URL',
    deepLink({ hash: 'metal', carry: '?outline=9&seed=99', params: { ...D, outline: 0.5 }, defaults: D })
      === '?seed=99&outline=0.5#metal');
  // ...and a key the panel has now set BACK to its default must not survive
  // in the carried search either, or the link reproduces the wrong board
  check('a knob returned to its default is not carried',
    deepLink({ hash: 'metal', carry: '?outline=9', params: { ...D }, defaults: D }) === '#metal');

  // ONE-SHOT FLAGS ARE NOT SHAREABLE. A link that re-runs somebody's probe
  // is a link nobody trusts.
  check('probes are dropped',
    deepLink({ hash: 'td', carry: '?rescue2probe=1&mission=rescue2&seed=7' })
      === '?mission=rescue2&seed=7#td');
  check('a capture flag is dropped', deepLink({ hash: 'cine', carry: '?capture=1&scene=gate' })
    === '?scene=gate#cine');
  check('the drop list can be replaced',
    deepLink({ hash: 'td', carry: '?mission=rescue2', drop: new Set(['mission']) }) === '#td');
}

console.log('round trip:');
{
  // The invariant that matters: a link, parsed by the LABS' OWN rule, must
  // reproduce the panel it was built from. That rule is number / boolean /
  // '#'-prefixed string, and it is copied here from metal-tab and astro-tab.
  const D = { spin: true, outline: 0.22, seed: 4414, gBase: '#4b5157', subject: 'tank', repeat: 2 };
  const live = { ...D, spin: false, outline: 0.47, gBase: '#a1b2c3', repeat: 3.5 };
  const url = deepLink({ base: 'i.html', hash: 'metal', params: live, defaults: D });
  check('no raw hash reached the link', !url.slice(0, url.indexOf('#metal')).includes('#'), url);
  const q = new URLSearchParams(url.slice(url.indexOf('?') + 1, url.indexOf('#')));
  const back = { ...D };
  for (const [k, v] of q.entries()) {
    if (!(k in back)) continue;
    if (typeof back[k] === 'number') { const n = parseFloat(v); if (Number.isFinite(n)) back[k] = n; }
    else if (typeof back[k] === 'boolean') back[k] = v !== '0';
    else if (typeof back[k] === 'string') back[k] = v.startsWith('#') ? v : '#' + v;
  }
  for (const k of Object.keys(live)) {
    if (!sameAsDefault(live[k], back[k])) {
      console.error(`  FAIL round trip on ${k}: ${live[k]} -> ${back[k]}`); failures++;
    }
  }
  check('every knob comes back', true);
  check('the drop list is not empty', DROP_KEYS.size > 10);
}

console.log(failures ? `\n${failures} FAILURES` : '\nall deeplink invariants hold');
process.exit(failures ? 1 : 0);
