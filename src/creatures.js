// creatures.js — organic dot-cloud units, ported from ~/Dev/Braille
// fun-shapes (half-dotted > organic): amoeba, bacteriophage, jellyfish.
// Each generator returns unit-radius points [x,y,z,(hi)] where hi===1 marks a
// highlight dot (nucleus, leg tips, helical stripe...). waveJelly() is the
// movement treatment: Braille's Wave (radial ripple) composed with Jelly
// (volume-preserving squash-stretch), plus a slow spin.
// Pure logic, NO DOM — Node-testable.

const normV = (v) => {
  const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1e-6;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dotV = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const fibDir = (i, n) => {
  const g = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(1 - y * y);
  const a = i * g;
  return [r * Math.cos(a), y, r * Math.sin(a)];
};
const fitUnit = (pts) => {
  let m = 0;
  for (const p of pts) m = Math.max(m, Math.hypot(p[0], p[1], p[2]));
  return pts.map((p) => (p.length > 3
    ? [p[0] / m, p[1] / m, p[2] / m, p[3]]
    : [p[0] / m, p[1] / m, p[2] / m]));
};

// amoeba — an irregular blob throwing out finger-like pseudopods, with a nucleus
export function amoebaPts() {
  const pts = [], N = 620;
  const pods = [[1, 0.2, 0.3], [-0.6, 0.1, 0.8], [0.2, -0.3, -0.9], [-0.9, 0.4, -0.2], [0.4, 0.85, 0.1]];
  const bump = (d) => {
    let r = 0.6 + 0.06 * Math.sin(4 * d[0] + 3 * d[2]);
    for (const p of pods) r += 0.42 * Math.pow(Math.max(0, dotV(d, normV(p))), 6);
    return r;
  };
  for (let i = 0; i < N; i++) {
    const d = fibDir(i, N), r = bump(d);
    pts.push([d[0] * r, d[1] * r * 0.85, d[2] * r]);
  }
  for (let i = 0; i < 44; i++) {
    const d = fibDir(i, 44);
    pts.push([0.12 + d[0] * 0.17, -0.05 + d[1] * 0.17, d[2] * 0.17, 1]); // nucleus pops
  }
  for (const [cx, cy, cz, vr] of [[-0.3, 0.1, 0.12, 0.12], [0.12, 0.28, -0.16, 0.09]]) {
    for (let a = 0; a < 14; a++) {
      const ang = a / 14 * 2 * Math.PI;
      pts.push([cx + vr * Math.cos(ang), cy + vr * Math.sin(ang), cz]); // vacuoles
    }
  }
  return fitUnit(pts);
}

// bacteriophage — the "lunar lander": icosahedral head, tail sheath, leg fibers
export function phagePts() {
  const pts = [], hy = 0.5, hR = 0.4, tailTop = 0.1, tailBot = -0.35, tr = 0.1;
  for (let i = 0; i < 200; i++) {
    const d = fibDir(i, 200);
    pts.push([d[0] * hR, hy + d[1] * hR, d[2] * hR]); // head capsid
  }
  for (let iy = 0; iy <= 14; iy++) {
    const y = tailTop + (tailBot - tailTop) * iy / 14;
    for (let a = 0; a < 10; a++) {
      const ang = a / 10 * 2 * Math.PI;
      pts.push([tr * Math.cos(ang), y, tr * Math.sin(ang)]); // tail sheath
    }
  }
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * 2 * Math.PI;
    for (const rr of [0.12, 0.2]) pts.push([rr * Math.cos(a), tailBot, rr * Math.sin(a)]); // baseplate
  }
  for (let k = 0; k < 6; k++) {
    const ang = k / 6 * 2 * Math.PI, cx = Math.cos(ang), cz = Math.sin(ang);
    const hip = [0.14 * cx, tailBot, 0.14 * cz];
    const knee = [0.2 * cx, tailBot - 0.05, 0.2 * cz];
    const foot = [0.5 * cx, -0.9, 0.5 * cz];
    for (const [A, B] of [[hip, knee], [knee, foot]]) {
      for (let s = 0; s <= 6; s++) {
        const f = s / 6;
        const p = [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f];
        if (B === foot && s === 6) p.push(1); // foot tips pop
        pts.push(p);
      }
    }
  }
  return fitUnit(pts);
}

// jellyfish — a translucent bell trailing wavy tentacles and frilly oral arms
export function jellyfishPts() {
  const pts = [], R = 0.62;
  for (let i = 0; i < 300; i++) {
    const d = fibDir(i, 300);
    if (d[1] < 0) continue;
    const wob = 1 + 0.05 * Math.sin(6 * Math.atan2(d[2], d[0]));
    pts.push([d[0] * R * wob, 0.2 + d[1] * R * 0.8, d[2] * R * wob]); // bell
  }
  for (let a = 0; a < 40; a++) {
    const ang = a / 40 * 2 * Math.PI;
    pts.push([R * Math.cos(ang), 0.2, R * Math.sin(ang)]); // rim
  }
  for (let k = 0; k < 16; k++) {
    const ang = k / 16 * 2 * Math.PI, cx = R * 0.9 * Math.cos(ang), cz = R * 0.9 * Math.sin(ang);
    for (let s = 0; s <= 20; s++) {
      const f = s / 20, sway = 0.12 * Math.sin(f * 6 + ang * 2);
      pts.push([cx + sway * Math.cos(ang), 0.2 - f * 1.1, cz + sway * Math.sin(ang)]); // tentacles
    }
  }
  for (let k = 0; k < 4; k++) {
    const ang = k / 4 * 2 * Math.PI + 0.4;
    for (let s = 0; s <= 12; s++) {
      const f = s / 12, r = 0.16 * (1 - f * 0.5);
      pts.push([r * Math.cos(ang) + 0.05 * Math.sin(f * 8), 0.15 - f * 0.6, r * Math.sin(ang)]); // oral arms
    }
  }
  return fitUnit(pts);
}

export const CREATURES = {
  amoeba: amoebaPts,
  phage: phagePts,
  jellyfish: jellyfishPts,
};

// Wave × Jelly, composed (Braille fun-shapes treatments):
//   Wave  — radial ripple keyed to azimuth and height, d = 1 + 0.14·sin(3θ + 3t − 2y)
//   Jelly — volume-preserving squash-stretch, sy = 1 + 0.24·sin(3t), sx = 1/√sy
// plus the shared slow rotY spin. Writes local-space positions into `out`
// (Float32Array of length base.length*3).
//
// opts.reachDir + opts.reachAmt: phagocytosis — points whose direction aligns
// with reachDir (FINAL local frame, post-spin) stretch outward, so the
// membrane extends a pseudopod toward the target. Amt 0..1.
export function waveJelly(base, t, out, opts = null) {
  const sy = 1 + 0.18 * Math.sin(t * 3);
  const sx = 1 / Math.sqrt(sy);
  const spin = t * 0.3, cs = Math.cos(spin), sn = Math.sin(spin);
  const rd = opts && opts.reachAmt > 0 ? opts.reachDir : null;
  const ra = rd ? opts.reachAmt : 0;
  // the pseudopod ripples too, so the reach reads as membrane, not a spike
  const raWob = ra * (1 + 0.15 * Math.sin(t * 5));
  for (let i = 0; i < base.length; i++) {
    const p = base[i];
    const d = 1 + 0.14 * Math.sin(3 * Math.atan2(p[2], p[0]) + t * 3 - p[1] * 2);
    const x0 = p[0] * d * sx, y = p[1] * sy, z0 = p[2] * d * sx;
    let x = x0 * cs + z0 * sn;
    let z = -x0 * sn + z0 * cs;
    let yy = y;
    if (rd) {
      const rl = Math.hypot(x, yy, z) || 1e-6;
      const al = (x * rd[0] + yy * rd[1] + z * rd[2]) / rl;
      if (al > 0) {
        const f = 1 + raWob * 1.15 * Math.pow(al, 5);
        x *= f; yy *= f; z *= f;
      }
    }
    out[i * 3] = x;
    out[i * 3 + 1] = yy;
    out[i * 3 + 2] = z;
  }
  return out;
}
