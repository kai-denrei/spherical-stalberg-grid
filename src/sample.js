// sample.js — blue-noise-ish point sampling on the unit sphere.
//
// The 2D pipeline used Bridson Poisson-disk in [0,1]². Bridson needs a
// background grid, which has no clean equivalent on S²; Mitchell's
// best-candidate gives comparable blue-noise quality with no spatial
// structure: for each new point, draw k uniform candidates and keep the one
// farthest from the existing set. O(n²k) — fine at PoC scales (n ≤ ~2000).
//
// Chord distance is used instead of geodesic: monotonically equivalent on a
// sphere, and cheaper.

import { dist3 } from './vec3.js?v=0e1ff229';

// Uniform random point on the unit sphere (area-preserving: z uniform).
export function uniformSpherePoint(rng) {
  const z = 2 * rng() - 1;
  const theta = 2 * Math.PI * rng();
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return [r * Math.cos(theta), r * Math.sin(theta), z];
}

// n points on the unit sphere, best-candidate with k candidates per point.
export function bestCandidateSphere(rng, { n = 600, k = 12 } = {}) {
  const points = [uniformSpherePoint(rng)];
  while (points.length < n) {
    let best = null;
    let bestDist = -1;
    for (let i = 0; i < k; i++) {
      const c = uniformSpherePoint(rng);
      let minD = Infinity;
      for (const p of points) {
        const d = dist3(c, p);
        if (d < minD) minD = d;
        if (minD <= bestDist) break; // cannot beat current best
      }
      if (minD > bestDist) {
        bestDist = minD;
        best = c;
      }
    }
    points.push(best);
  }
  return points;
}
