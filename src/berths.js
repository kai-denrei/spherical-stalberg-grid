// THE CAMP — where the three life containers stand, and which way each faces.
//
// This used to be chosen INSIDE the container model's async callback, which
// meant the game did not know where the berths were at reset time: it placed
// the tank beside the Heart and teleported it into a berth once the bytes
// landed. That teleport was the jump cut. Worse, the teleport was gated on
// `t < 6` where `t` is page-lifetime, so a retry three minutes in was never
// staged at a berth at all — every reset produced a different opening state.
//
// None of this needs the model. It is graph maths over cells, so it runs
// synchronously with the board and the model merely decorates the answer.
import { sub3, dot3, norm3, scale3 } from './vec3.js';
import { BLOCKED } from './dungeon.js';

function tangentDirTo(graph, from, to) {
  const n = graph.normals[from];
  const d = sub3(graph.centers[to], graph.centers[from]);
  return norm3(sub3(d, scale3(n, dot3(d, n)))); // onto the tangent plane
}

// Which container this hull drives out of. The operator's rule: the FIRST
// tank leaves Container #3, the second #2, the last #1 — so a full hull count
// takes the highest berth and they count down as the run wears on.
// berths[2] IS Container #3: the array is 0-based, the paint is 1-based.
export function berthIndexFor(hp, max = 3) {
  return Math.min(max - 1, Math.max(0, hp - 1));
}

// A chain of three mutually adjacent cells out at distToHeart 3-4, hugging a
// wall. Returns them in painted order (#1, #2, #3) with each one's exit lane,
// or [] when the board has no chain that satisfies the escape rule.
export function computeBerths(dungeon, graph) {
  const inRange = (c2) => dungeon.tags[c2] !== BLOCKED && c2 !== dungeon.spawn
    && dungeon.distToHeart[c2] >= 3 && dungeon.distToHeart[c2] <= 4;
  const open = (c2) => graph.adj[c2].filter((k2) => dungeon.tags[k2] !== BLOCKED).length;
  // EVERY BERTH KEEPS A LANE. Scoring for minimum openness alone was doing its
  // job too well — a berth whose only open neighbours are its two sibling
  // berths is a sealed garage, and each of the three gets used as the spawn as
  // lives run down. An escape lane is a HARD requirement; openness only breaks
  // ties among chains that have one. It still hugs a wall; it can no longer
  // wall itself in.
  const escapes = (c2, chain) => graph.adj[c2]
    .filter((k2) => dungeon.tags[k2] !== BLOCKED && !chain.includes(k2)).length;

  let best = null, bestScore = Infinity;
  for (let j = 0; j < dungeon.tags.length; j++) {
    if (!inRange(j)) continue;
    const nbs = graph.adj[j].filter(inRange);
    for (let a = 0; a < nbs.length; a++) {
      for (let b = a + 1; b < nbs.length; b++) {
        const chain = [nbs[a], j, nbs[b]];
        if (chain.some((c2) => escapes(c2, chain) === 0)) continue;
        const sc = open(nbs[a]) + open(j) + open(nbs[b]);
        if (sc < bestScore) { bestScore = sc; best = chain; }
      }
    }
  }
  if (!best) return [];

  // THE DOORS FACE THE LANE THE HULL LEAVES BY. They used to face the Heart,
  // which is only ever approximately the way out: the exit is a graph
  // neighbour and can sit 40-odd degrees off that bearing, so the hull drove
  // out on a diagonal and clipped its own door frame. Aim the box at the
  // actual exit and the two are the same line by construction. Most-heartward
  // escape wins, so the row still faces home.
  const escapeOf = (c2) => {
    const toHeart = tangentDirTo(graph, c2, dungeon.heart);
    let bestE = -1, bestD = -Infinity;
    for (const nb of graph.adj[c2]) {
      if (dungeon.tags[nb] === BLOCKED || best.includes(nb)) continue;
      const d = dot3(tangentDirTo(graph, c2, nb), toHeart);
      if (d > bestD) { bestD = d; bestE = nb; }
    }
    return bestE;
  };

  const out = best.map((ci) => ({ ci, exit: escapeOf(ci) }));
  // the escape rule above should prevent this; if it ever fails, no camp is
  // better than a camp with a door onto a wall
  return out.some((b) => b.exit < 0) ? [] : out;
}
