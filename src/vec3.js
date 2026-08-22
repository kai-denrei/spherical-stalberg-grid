// vec3.js — tiny 3D vector helpers on plain [x, y, z] arrays.
export const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len3 = (a) => Math.hypot(a[0], a[1], a[2]);
export const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const norm3 = (a) => {
  const l = len3(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const mean3 = (ps) => {
  let x = 0, y = 0, z = 0;
  for (const p of ps) { x += p[0]; y += p[1]; z += p[2]; }
  const n = ps.length;
  return [x / n, y / n, z / n];
};

// Orthonormal tangent basis at unit normal n (sphere centered at origin:
// n = normalize(surface point)). Returns [u, v] with u ⊥ v ⊥ n.
export function tangentBasis(n) {
  // pick the axis least aligned with n to avoid degeneracy
  const ref = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = norm3(cross3(n, ref));
  const v = cross3(n, u); // already unit: n ⊥ u, both unit
  return [u, v];
}
