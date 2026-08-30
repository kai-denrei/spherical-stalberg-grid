// ranks.mjs — the promotion ladder's contract. Assert the rules, derive
// the data: thresholds climb strictly, gold is double-gated on hands-on
// elite kills, and the dice-pip layouts hold their shape (the one change
// the operator asked for by name).
import {
  RANK_MAX, rankToTierLevel, rankLabel, killReq, eliteReq, rankFor,
  starLayout, badgeSVG,
} from '../src/ranks.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.error(`  FAIL ${name} ${detail}`); failures++; }
};

console.log('ladder:');
{
  let mono = true;
  for (let r = 2; r <= RANK_MAX; r++) {
    if (killReq(r) <= killReq(r - 1)) mono = false;
    if (eliteReq(r) < eliteReq(r - 1)) mono = false;
  }
  check('thresholds climb, never dip', mono);
  check('rank 0 exists below the first threshold', rankFor(killReq(1) - 1, 0) === 0);
  check('first threshold promotes', rankFor(killReq(1), 0) === 1);
  // every rank is reachable at exactly its own requirements
  let exact = true;
  for (let r = 1; r <= RANK_MAX; r++) {
    if (rankFor(killReq(r), eliteReq(r)) !== r) exact = false;
  }
  check('every rank reachable at exactly its requirements', exact);
  // monotonic in kills: more kills never demote
  let prev = -1, sorted = true;
  for (let k = 0; k <= killReq(RANK_MAX) + 5; k++) {
    const r = rankFor(k, 999);
    if (r < prev) sorted = false;
    prev = r;
  }
  check('more kills never demote', sorted);
}

console.log('gold gate (hands-on elites):');
{
  check('kills alone cap at the top of silver',
    rankFor(9999, 0) === 10, `got ${rankFor(9999, 0)}`);
  check('each elite pair opens one more gold level',
    rankFor(9999, eliteReq(12)) === 12);
  check('bronze and silver need no elites', eliteReq(10) === 0 && eliteReq(1) === 0);
  check('the top demands the most', eliteReq(RANK_MAX) > eliteReq(RANK_MAX - 1));
}

console.log('tiers:');
{
  const t = (r) => rankToTierLevel(r);
  check('1..5 bronze', t(1).tier === 0 && t(5).tier === 0);
  check('6..10 silver', t(6).tier === 1 && t(10).tier === 1);
  check('11..15 gold', t(11).tier === 2 && t(15).tier === 2);
  check('level wraps 1..5', t(6).level === 1 && t(15).level === 5);
  check('labels read tier + level', rankLabel(12) === 'GOLD 2' && rankLabel(0) === 'UNRANKED');
}

console.log('dice pips (the one asked-for change):');
{
  for (const n of [1, 2, 3]) {
    const ys = new Set(starLayout(n).map(([, y]) => y));
    check(`${n} star(s) sit in a row`, ys.size === 1);
  }
  const four = starLayout(4);
  const xs4 = new Set(four.map(([x]) => x)), ys4 = new Set(four.map(([, y]) => y));
  check('4 stars form a 2x2 square', four.length === 4 && xs4.size === 2 && ys4.size === 2);
  const five = starLayout(5);
  const hasCentre = five.some(([x, y]) => x === 0 && y === 0);
  check('5 stars form a quincunx (2x2 + centre)', five.length === 5 && hasCentre);
  // compact means COMPACT: the pip layouts must not be wider than the row of 3
  const width = (l) => Math.max(...l.map(([x]) => x)) - Math.min(...l.map(([x]) => x));
  check('pips are narrower than the row they replaced',
    width(four) < width(starLayout(3)) && width(five) < width(starLayout(3)));
}

console.log('badges:');
{
  check('unranked draws nothing', badgeSVG(0) === '');
  let all = true, starsMatch = true;
  for (let r = 1; r <= RANK_MAX; r++) {
    const svg = badgeSVG(r);
    if (!svg.includes('<svg')) all = false;
    const { tier, level } = rankToTierLevel(r);
    const stars = (svg.match(/class="st"/g) || []).length;
    if (tier === 2 ? stars !== level : stars !== 0) starsMatch = false;
  }
  check('all 15 badges render', all);
  check('gold star count = level; lower tiers have none', starsMatch);
  check('size parameter lands on the tag', badgeSVG(3, 16).includes('width="16"'));
}

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('ranks: all good');
