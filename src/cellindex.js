// cellindex.js — voxel-hash nearest-cell lookup over the sphere's cell
// centers. This is the seam that decouples MOVEMENT from the GRID: free
// (off-graph) motion needs only two questions answered fast — "which cell
// am I over?" (semantics: open/blocked, orbs, heart) and it needs them at
// arbitrary positions, not cell centers. The grid stays the world
// generator, collision oracle, and AI nav-graph; kinematics stop caring
// about it. Same voxel trick as the sampler: surface points in [-1,1]³,
// only ~O(cells) voxels ever occupied, no cube-map seams.

export function makeCellIndex(centers, cellSize) {
  const inv = 1 / cellSize;
  const res = Math.ceil(2 * inv) + 2;
  const vox = (v) => Math.min(res - 1, Math.max(0, Math.floor((v + 1) * inv) + 1));
  const key = (x, y, z) => (x * res + y) * res + z;

  const buckets = new Map();
  for (let i = 0; i < centers.length; i++) {
    const c = centers[i];
    const k = key(vox(c[0]), vox(c[1]), vox(c[2]));
    let list = buckets.get(k);
    if (list === undefined) { list = []; buckets.set(k, list); }
    list.push(i);
  }

  // nearest cell to p (unit-sphere position). Scans expanding voxel shells;
  // one extra ring after the first hit guarantees correctness at borders.
  return (p) => {
    const cx = vox(p[0]), cy = vox(p[1]), cz = vox(p[2]);
    let best = -1, bd = Infinity;
    let foundAt = -1;
    for (let ring = 0; ring < res; ring++) {
      if (foundAt !== -1 && ring > foundAt + 1) break;
      const x0 = Math.max(0, cx - ring), x1 = Math.min(res - 1, cx + ring);
      const y0 = Math.max(0, cy - ring), y1 = Math.min(res - 1, cy + ring);
      const z0 = Math.max(0, cz - ring), z1 = Math.min(res - 1, cz + ring);
      for (let ix = x0; ix <= x1; ix++) {
        for (let iy = y0; iy <= y1; iy++) {
          for (let iz = z0; iz <= z1; iz++) {
            if (ring > 0
              && ix !== cx - ring && ix !== cx + ring
              && iy !== cy - ring && iy !== cy + ring
              && iz !== cz - ring && iz !== cz + ring) continue;
            const list = buckets.get(key(ix, iy, iz));
            if (list === undefined) continue;
            for (const i of list) {
              const c = centers[i];
              const dx = c[0] - p[0], dy = c[1] - p[1], dz = c[2] - p[2];
              const d2 = dx * dx + dy * dy + dz * dz;
              if (d2 < bd) { bd = d2; best = i; }
            }
            if (best !== -1 && foundAt === -1) foundAt = ring;
          }
        }
      }
    }
    return best;
  };
}
