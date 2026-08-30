// lore.mjs — the codex's contract: the roster grows, the codex grows with
// it. Assert the rule (coverage + substance), never the count.
import { LORE, LORE_WORLD, loreText, loreAll } from '../src/lore.js';
import { GROUPS, entriesIn } from '../src/unitcatalog.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

console.log('coverage:');
{
  const missing = [];
  for (const g of GROUPS) {
    for (const e of entriesIn(g)) if (!LORE[e.id]) missing.push(e.id);
  }
  check('every catalogue entry has lore', missing.length === 0, missing.join(','));
}

console.log('substance:');
{
  let thin = [];
  const all = [...LORE_WORLD, ...Object.values(LORE)];
  for (const e of all) {
    if (!e.name || !e.tag || (e.body || '').length < 180 || (e.visual || '').length < 90) {
      thin.push(e.name || '?');
    }
  }
  check('every entry has name, tag, a real body, a real visual prompt',
    thin.length === 0, thin.join(','));
  check('loreText carries both registers',
    loreText(LORE.phage).includes('VISUAL PROMPT:'));
  const ids = Object.keys(LORE);
  const all2 = loreAll(ids);
  check('loreAll contains the world and every unit',
    LORE_WORLD.every((w) => all2.includes(w.name)) && ids.every((i) => all2.includes(LORE[i].name)));
}

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('lore: all good');
