// ranks.js — the tank's field promotion ladder. 15 ranks in three tiers
// (bronze chevrons, silver chevrons + core diamond, gold stars + laurel),
// drawn from the operator's rank sheet (ranks.html) with one change asked
// for by name: 4 and 5 gold stars sit like dice pips — a 2x2 square and a
// quincunx — instead of an ever-wider row. Tier is derived, never stored.
//
// The ladder is the TANK's, not the player's: only hands-on kills climb it
// (tower and orbital kills pay credits, not respect), and it resets with
// the tank that earned it. Gold has a second gate — the dangerous,
// non-rammable tier must be fought up close.
//
// Pure module: no DOM, no three.js. badgeSVG returns a self-contained
// string; the tab decides where it lands (HUD span, sprite texture).

export const RANK_MAX = 15;
export const TIER_NAME = ['BRONZE', 'SILVER', 'GOLD'];
const TIER_COLOR = ['#b08d57', '#c9ccd1', '#e8c04c'];

export function rankToTierLevel(rank) {
  const tier = Math.floor((rank - 1) / 5);
  const level = ((rank - 1) % 5) + 1;
  return { tier, level };
}

export function rankLabel(rank) {
  if (rank < 1) return 'UNRANKED';
  const { tier, level } = rankToTierLevel(rank);
  return `${TIER_NAME[tier]} ${level}`;
}

// --- the ladder ----------------------------------------------------------
// Cumulative tank kills for rank r: r(r+3)/2 — 2, 5, 9, 14, 20 ... 135.
// Early ranks come fast enough to feel during wave one; gold is a career.
export function killReq(rank) {
  return (rank * (rank + 3)) / 2;
}

// Gold's second gate: hands-on kills of the dangerous (non-rammable) tier.
// 2 per gold level — the units that hurt to touch are the ones that count.
export function eliteReq(rank) {
  return rank > 10 ? (rank - 10) * 2 : 0;
}

// Highest rank both counts support. 0 = unranked (no insignia yet).
export function rankFor(kills, eliteKills) {
  let r = 0;
  for (let i = 1; i <= RANK_MAX; i++) {
    if (kills >= killReq(i) && eliteKills >= eliteReq(i)) r = i;
  }
  return r;
}

// --- star pips -----------------------------------------------------------
// [x, y] offsets around the badge centre. 1-3 read as a row; 4 and 5 fold
// into dice pips (the sheet's row grew wider than the laurel at 4+).
export function starLayout(count) {
  const s = 30, p = 16;
  if (count === 4) return [[-p, -p], [p, -p], [-p, p], [p, p]];
  if (count === 5) return [[-p, -p], [p, -p], [0, 0], [-p, p], [p, p]];
  const out = [];
  for (let i = 0; i < count; i++) out.push([(i - (count - 1) / 2) * s, 0]);
  return out;
}

// --- drawing (verbatim geometry from the sheet, pips swapped in) ---------
function chevron(cx, y, width, height, color) {
  const half = width / 2;
  return `<path d="M ${cx - half} ${y + height} L ${cx} ${y} L ${cx + half} ${y + height}"
    fill="none" stroke="${color}" stroke-width="10"
    stroke-linecap="round" stroke-linejoin="round"/>`;
}

function chevronStack(cx, cy, count, color) {
  const spacing = 16;
  const total = (count - 1) * spacing;
  let out = '';
  for (let i = 0; i < count; i++) {
    out += chevron(cx, cy - total / 2 + i * spacing - 10, 60, 20, color);
  }
  return out;
}

function coreDiamond(cx, cy, fillFraction, color) {
  const size = 14;
  const pts = `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`;
  const bands = 4;
  let out = `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="2"/>`;
  const filled = Math.round(fillFraction * bands);
  for (let i = 0; i < filled; i++) {
    const s = size * (1 - i / bands);
    const p2 = `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`;
    out += `<polygon points="${p2}" fill="${color}" opacity="${0.35 + i * 0.15}"/>`;
  }
  return out;
}

function star(cx, cy, r, color) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`);
  }
  return `<polygon class="st" points="${pts.join(' ')}" fill="${color}" stroke="${color}" stroke-width="1"/>`;
}

function starPips(cx, cy, count, color) {
  // pip layouts get slightly smaller stars so the quincunx stays inside
  // the laurel — compact was the point
  const r = count >= 4 ? 11 : 13;
  return starLayout(count).map(([dx, dy]) => star(cx + dx, cy + dy, r, color)).join('');
}

function laurelFrame(cx, cy, w, h, thickness, color) {
  const rx = w / 2, ry = h / 2;
  return `
    <path d="M ${cx - rx} ${cy + ry * 0.6} Q ${cx - rx - 6} ${cy - ry * 0.4} ${cx - rx * 0.3} ${cy - ry}"
      fill="none" stroke="${color}" stroke-width="${thickness}" stroke-linecap="round" opacity="0.85"/>
    <path d="M ${cx + rx} ${cy + ry * 0.6} Q ${cx + rx + 6} ${cy - ry * 0.4} ${cx + rx * 0.3} ${cy - ry}"
      fill="none" stroke="${color}" stroke-width="${thickness}" stroke-linecap="round" opacity="0.85"/>`;
}

// Self-contained <svg> string, viewBox 0 0 120 120; `size` sets the
// rendered width/height so one function serves 16px HUD and 256px sprite.
export function badgeSVG(rank, size = 120) {
  if (rank < 1) return '';
  const { tier, level } = rankToTierLevel(rank);
  const color = TIER_COLOR[tier];
  const cx = 60, cy = 60;
  let inner = '';
  if (tier === 0) {
    inner = chevronStack(cx, cy, level, color);
  } else if (tier === 1) {
    inner = chevronStack(cx, cy - 6, level, color)
      + coreDiamond(cx, cy + 30, level / 5, color);
  } else {
    inner = laurelFrame(cx, cy, 90, 80, 2 + level * 0.8, color)
      + starPips(cx, cy, level, color);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="56" fill="#151518" stroke="${color}" stroke-width="2" opacity="0.9"/>
    ${inner}
  </svg>`;
}
