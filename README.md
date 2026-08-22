# spherical-stalberg-grid

Proof of concept: the Oskar Stålberg organic irregular quad grid
(tri→quad merge → subdivide → relax), ported from the 2D plane to the
surface of a sphere. Standalone, vanilla ES modules, no build step.

Ported from the working 2D implementation in `~/Dev/oskar-procedure`.

## Run

```bash
npm run serve        # python3 -m http.server 8144
# open http://localhost:8144
```

```bash
npm test             # node test/smoke.mjs — pipeline invariants
./scripts/bust.sh    # bump the cache-bust token (assets + module imports)
```

## Pipeline (src/grid.js)

1. **Sample** — Mitchell best-candidate blue noise on S² (`sample.js`).
   Replaces 2D Bridson Poisson-disk.
2. **Triangulate** — spherical Delaunay = 3D convex hull of on-sphere
   points (`hull.js`, three.js quickhull). Replaces planar Delaunator.
   The 2D sliver filter is gone: dropping faces on a closed surface
   would tear holes.
3. **Merge** — random tabu-driven dissolve of triangle pairs into quads.
   Legality checked in the candidate quad's tangent plane. Identical
   bookkeeping to 2D.
4. **Subdivide** — every face → quads (tri→3, quad→4), midpoints shared,
   new vertices projected back onto the sphere. Winding normalized so
   Newell normals point outward.
5. **Relax** — the 2D closed-form closest-square fit, run per quad in
   its own tangent plane; vertices reprojected to the sphere after each
   step.

## Invariants (test/smoke.mjs)

- all faces are quads; mesh is watertight (every edge in exactly 2 quads)
- Euler characteristic V − E + F = 2
- defect law: Σ(4 − valence) = 8 — irregular vertices are *forced* by
  sphere topology; the dashboard marks them (orange v3, cyan v5,
  magenta v6+)
- relaxation reduces squareness error; vertices stay on the sphere

## Dashboard

seed / sample count / blue-noise k / merge bias · live relaxation
(pull rate, cell size, iters per frame) · face color modes: random
cells, squareness heatmap, plain · toggles for faces, wireframe,
defect markers.
