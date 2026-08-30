// braillelab.js — shapes ported from the Braille lab.
//
// Source: /Users/minikai/Dev/Braille — fun-shapes/index.html. That lab and
// this project speak the same language already: a generator returns an array
// of [x, y, z] points, [x, y, z, 1] marks a half-dot highlight, and the whole
// thing is normalised by fitUnit(). So a port is a copy of the generator plus
// whatever primitives it stands on, and nothing has to be re-derived.
//
// Copied VERBATIM on purpose. These are authored shapes, and rewriting them
// in our own hand would mean maintaining a divergent second version of
// something the lab will keep improving — re-porting is meant to stay a
// mechanical operation. Only the module wrapper and this note are ours.
//
// The primitives below are the transitive closure of what these nine call:
// struts and joint balls for jointed machinery, lattice/guy helpers for
// towers, a height-field surface for waves. Adding another lab shape usually
// needs no new primitive at all.

function discY(pts, cx, cz, R, y0) { for (let ir = 0; ir <= 6; ir++) { const rr = R * ir / 6, n = Math.max(1, Math.round(24 * ir / 6)); for (let a = 0; a < n; a++) { const ang = a / n * 2 * Math.PI; pts.push([cx + rr * Math.cos(ang), y0, cz + rr * Math.sin(ang)]); } } }

function fitUnit(pts) { let m = 0; for (const p of pts) m = Math.max(m, Math.hypot(p[0], p[1], p[2])); return pts.map((p) => p.length > 3 ? [p[0] / m, p[1] / m, p[2] / m, p[3]] : [p[0] / m, p[1] / m, p[2] / m]); }

function turretRing(pts, c, dir, r, n, hi) {                                        // a ring perpendicular to dir (muzzle brake / hub)
  const T = normV(dir); let n1 = normV(crossV(T, [0, 1, 0.011])); if (!(n1[0] || n1[1] || n1[2])) n1 = [1, 0, 0]; const n2 = crossV(T, n1);
  for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, cs = Math.cos(a), sn = Math.sin(a), p = [c[0] + r * (cs * n1[0] + sn * n2[0]), c[1] + r * (cs * n1[1] + sn * n2[1]), c[2] + r * (cs * n1[2] + sn * n2[2])]; if (hi) p.push(1); pts.push(p); }
}

function cyl(pts, cx, cz, r, y0, y1, rings) { const N = rings || 8; for (let iy = 0; iy <= N; iy++) { const y = y0 + (y1 - y0) * iy / N; for (let a = 0; a < 18; a++) { const ang = a / 18 * 2 * Math.PI; pts.push([cx + r * Math.cos(ang), y, cz + r * Math.sin(ang)]); } } }

function turretBox(pts, c, h, n) {                                                  // solid-surface box: grid on all six faces
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const u = i / n * 2 - 1, v = j / n * 2 - 1;
    pts.push([c[0] + u * h[0], c[1] + v * h[1], c[2] - h[2]], [c[0] + u * h[0], c[1] + v * h[1], c[2] + h[2]]);
    pts.push([c[0] - h[0], c[1] + v * h[1], c[2] + u * h[2]], [c[0] + h[0], c[1] + v * h[1], c[2] + u * h[2]]);
    pts.push([c[0] + u * h[0], c[1] - h[1], c[2] + v * h[2]], [c[0] + u * h[0], c[1] + h[1], c[2] + v * h[2]]); }
}

function jointBall(pts, c, r) { for (let i = 0; i < 40; i++) { const d = fibDir(i, 40); pts.push([c[0] + d[0] * r, c[1] + d[1] * r, c[2] + d[2] * r]); } }

function strut(pts, a, b, r) {
  const T = normV([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), steps = Math.max(4, Math.round(len / 0.09));
  let n1 = normV(crossV(T, [0, 1, 0.011])); if (!(n1[0] || n1[1] || n1[2])) n1 = [1, 0, 0]; const n2 = crossV(T, n1);
  for (let i = 0; i <= steps; i++) { const f = i / steps, c = [a[0] + T[0] * len * f, a[1] + T[1] * len * f, a[2] + T[2] * len * f]; for (let m = 0; m < 6; m++) { const ang = m / 6 * 2 * Math.PI, cs = Math.cos(ang), sn = Math.sin(ang); pts.push([c[0] + r * (cs * n1[0] + sn * n2[0]), c[1] + r * (cs * n1[1] + sn * n2[1]), c[2] + r * (cs * n1[2] + sn * n2[2])]); } }
}

function guys(pts, ys, R) {
  for (let k = 0; k < 3; k++) { const ang = k / 3 * 2 * Math.PI + Math.PI / 2, an = [R * Math.cos(ang), -0.92, R * Math.sin(ang)]; pts.push([an[0], an[1], an[2], 1]);
    for (const y of ys) for (let i = 0; i <= 14; i++) { const f = i / 14; pts.push([an[0] * f, y + (-0.92 - y) * f, an[2] * f]); } }
}

function latticeTower(pts, prof, nLevels, nSides, legR, braceR, phase) {
  const ph = phase == null ? Math.PI / 4 : phase, rings = [];
  for (let l = 0; l <= nLevels; l++) { const pr = prof(l / nLevels), ring = []; for (let s = 0; s < nSides; s++) { const ang = ph + s / nSides * 2 * Math.PI; ring.push([pr[0] * Math.cos(ang), pr[1], pr[0] * Math.sin(ang)]); } rings.push(ring); }
  for (let s = 0; s < nSides; s++) for (let l = 0; l < nLevels; l++) strut(pts, rings[l][s], rings[l + 1][s], legR); // legs
  for (let l = 0; l < nLevels; l++) for (let s = 0; s < nSides; s++) { const s2 = (s + 1) % nSides; strut(pts, rings[l][s], rings[l][s2], braceR); strut(pts, rings[l][s], rings[l + 1][s2], braceR); strut(pts, rings[l][s2], rings[l + 1][s], braceR); }
  for (let s = 0; s < nSides; s++) { const s2 = (s + 1) % nSides; strut(pts, rings[nLevels][s], rings[nLevels][s2], braceR); }
  return rings;
}

function surface(pts, R, n, fn, hi) { for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const x = -R + 2 * R * i / n, z = -R + 2 * R * j / n, y = fn(x, z), p = [x, y, z]; if (hi && hi(x, z, y)) p.push(1); pts.push(p); } }

function shaft(pts, cx, cz, yb, h, wb, wt, capH, glyphEvery, gild) {
  const N = Math.max(8, Math.round(h / 0.08));
  for (let iy = 0; iy <= N; iy++) { const f = iy / N, y = yb + f * h, w = wb + (wt - wb) * f, hi = glyphEvery && iy % glyphEvery === 0 && iy > 1 && iy < N - 1; sqRing(pts, cx, cz, w, y, 7, hi); }
  const yt = yb + h, M = 6; for (let iy = 0; iy <= M; iy++) { const f = iy / M, y = yt + f * capH, w = wt * (1 - f); sqRing(pts, cx, cz, w, y, 6, gild); }
  pts.push([cx, yt + capH, cz, 1]); return yt + capH;
}

function plinth(pts, cx, cz, y, w, hy) { turretBox(pts, [cx, y, cz], [w, hy, w], 5); }

function turretBarrel(pts, base, dir, len, r) {                                     // swept cylinder; returns the muzzle point + a bright bore dot
  const T = normV(dir), steps = Math.max(6, Math.round(len / 0.08)); let n1 = normV(crossV(T, [0, 1, 0.011])); if (!(n1[0] || n1[1] || n1[2])) n1 = [1, 0, 0]; const n2 = crossV(T, n1);
  for (let i = 0; i <= steps; i++) { const f = i / steps, c = [base[0] + T[0] * len * f, base[1] + T[1] * len * f, base[2] + T[2] * len * f]; for (let m = 0; m < 7; m++) { const a = m / 7 * 2 * Math.PI, cs = Math.cos(a), sn = Math.sin(a); pts.push([c[0] + r * (cs * n1[0] + sn * n2[0]), c[1] + r * (cs * n1[1] + sn * n2[1]), c[2] + r * (cs * n1[2] + sn * n2[2])]); } }
  const mz = [base[0] + T[0] * len, base[1] + T[1] * len, base[2] + T[2] * len]; pts.push([mz[0], mz[1], mz[2], 1]); return mz;         // muzzle bore pops
}

function fibDir(i, n) { const g = Math.PI * (3 - Math.sqrt(5)), y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * g; return [r * Math.cos(a), y, r * Math.sin(a)]; }

function crossV(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

function normV(v) { const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1e-6; return [v[0] / l, v[1] / l, v[2] / l]; }

function sqRing(out, cx, cz, w, y, per, hi) { const cor = [[-w, -w], [w, -w], [w, w], [-w, w]]; for (let s = 0; s < 4; s++) { const a = cor[s], b = cor[(s + 1) % 4]; for (let i = 0; i < per; i++) { const f = i / per, p = [cx + a[0] + (b[0] - a[0]) * f, y, cz + a[1] + (b[1] - a[1]) * f]; if (hi) p.push(1); out.push(p); } } }

function armSixAxisPts() {
  const pts = [];
  discY(pts, -0.35, 0, 0.24, -0.92); cyl(pts, -0.35, 0, 0.2, -0.92, -0.66);            // base pedestal
  turretBox(pts, [-0.35, -0.55, 0], [0.16, 0.12, 0.16], 4);                            // J1 rotating base
  const sh = [-0.35, -0.38, 0], el = [-0.08, 0.18, 0], wr = [0.48, 0.34, 0];
  jointBall(pts, sh, 0.13); strut(pts, sh, el, 0.075);                                 // shoulder + upper arm
  jointBall(pts, el, 0.11); strut(pts, el, wr, 0.06);                                  // elbow + forearm
  jointBall(pts, wr, 0.08);                                                            // wrist
  const tool = [0.62, 0.28, 0]; strut(pts, wr, tool, 0.045); turretRing(pts, tool, [1, -0.3, 0], 0.06, 12, 1); // flange/tool
  return fitUnit(pts);
}

function armDeltaPts() {
  const pts = [], yTop = 0.58, plat = [0, -0.34, 0];
  for (let a = 0; a < 40; a++) { const ang = a / 40 * 2 * Math.PI; pts.push([0.56 * Math.cos(ang), yTop, 0.56 * Math.sin(ang)]); } // frame ring
  discY(pts, 0, 0, 0.5, yTop + 0.04);
  for (let k = 0; k < 3; k++) { const ang = Math.PI / 2 + k / 3 * 2 * Math.PI, mot = [0.44 * Math.cos(ang), yTop, 0.44 * Math.sin(ang)], pe = [0.14 * Math.cos(ang), plat[1], 0.14 * Math.sin(ang)];
    turretBox(pts, mot, [0.09, 0.07, 0.09], 2);                                        // motor
    const tang = [-Math.sin(ang), 0, Math.cos(ang)];
    for (const s of [-0.05, 0.05]) strut(pts, [mot[0] + tang[0] * s, mot[1], mot[2] + tang[2] * s], [pe[0] + tang[0] * s * 0.5, pe[1], pe[2] + tang[2] * s * 0.5], 0.02); // parallelogram rods
  }
  discY(pts, 0, 0, 0.15, plat[1]); jointBall(pts, [0, plat[1] - 0.08, 0], 0.06);       // moving platform + tool
  return fitUnit(pts);
}

function armGripperPts() {
  const pts = [];
  discY(pts, -0.35, 0, 0.22, -0.92); turretBox(pts, [-0.35, -0.56, 0], [0.15, 0.11, 0.15], 4);
  const sh = [-0.35, -0.4, 0], el = [-0.05, 0.22, 0], wr = [0.46, 0.08, 0];
  jointBall(pts, sh, 0.12); strut(pts, sh, el, 0.07); jointBall(pts, el, 0.1); strut(pts, el, wr, 0.055); jointBall(pts, wr, 0.07);
  const palm = [0.58, 0.02, 0]; strut(pts, wr, palm, 0.045); turretBox(pts, [palm[0], palm[1], 0], [0.04, 0.05, 0.11], 2); // wrist + palm
  for (const dz of [-0.1, 0.1]) { const k = [palm[0] + 0.16, palm[1] + 0.05, dz]; strut(pts, [palm[0] + 0.04, palm[1] + 0.02, dz], k, 0.024); strut(pts, k, [palm[0] + 0.24, palm[1] - 0.06, dz * 0.45], 0.02); } // two fingers curling inward
  return fitUnit(pts);
}

function twGuyedPts() {
  const pts = [];
  cyl(pts, 0, 0, 0.04, -0.92, 0.95, 24);
  for (let iy = 0; iy <= 8; iy++) { const y = -0.92 + iy / 8 * 1.87; for (let a = 0; a < 3; a++) { const ang = a / 3 * 2 * Math.PI; pts.push([0.05 * Math.cos(ang), y, 0.05 * Math.sin(ang)]); } } // lattice hint
  guys(pts, [0.1, 0.55, 0.92], 0.6);
  pts.push([0, 0.95, 0, 1]);
  return fitUnit(pts);
}

function twBroadcastPts() {
  const pts = [];
  latticeTower(pts, (f) => [0.3 * (1 - 0.55 * f), -0.92 + f * 0.95], 4, 4, 0.02, 0.012);
  cyl(pts, 0, 0, 0.025, 0.03, 0.8, 20);                                                // whip mast
  for (const yb of [0.25, 0.5, 0.7]) for (let a = 0; a < 8; a++) { const ang = a / 8 * 2 * Math.PI; pts.push([0.07 * Math.cos(ang), yb, 0.07 * Math.sin(ang), 1]); } // ring beacons
  cyl(pts, 0, 0, 0.012, 0.8, 1.0, 6); pts.push([0, 1.02, 0, 1]);                        // tip spire
  return fitUnit(pts);
}

function wvRipplePts() { const pts = []; surface(pts, 0.95, 48, (x, z) => { const r = Math.hypot(x, z); return 0.4 * Math.sin(9 * r) / (1 + 3 * r); }, (x, z) => Math.hypot(x, z) < 0.05); return fitUnit(pts); }

function obEgyptianPts() { const pts = []; plinth(pts, 0, 0, -0.86, 0.3, 0.08); shaft(pts, 0, 0, -0.78, 1.42, 0.2, 0.12, 0.24, 3, 1); return fitUnit(pts); }

function launcherPts() {
  const pts = [];
  turretBarrel(pts, [-0.75, 0.05, 0], [1, 0, 0], 1.35, 0.12);                         // main tube
  for (let iy = 0; iy <= 10; iy++) { const f = iy / 10, x = 0.6 + f * 0.32, r = 0.16 * (1 - f * f); for (let a = 0; a < 12; a++) { const ang = a / 12 * 2 * Math.PI; pts.push([x, 0.05 + r * Math.cos(ang), r * Math.sin(ang)]); } } // warhead cone
  pts.push([0.92, 0.05, 0, 1]);
  for (let iy = 0; iy <= 7; iy++) { const f = iy / 7, x = -0.75 - f * 0.28, r = 0.12 + f * 0.1; for (let a = 0; a < 12; a++) { const ang = a / 12 * 2 * Math.PI; pts.push([x, 0.05 + r * Math.cos(ang), r * Math.sin(ang)]); } } // rear venturi flare
  turretBox(pts, [-0.15, -0.28, 0], [0.06, 0.16, 0.05], 3);                           // pistol grip
  turretBox(pts, [0.12, 0.24, 0], [0.12, 0.04, 0.03], 2);                             // top sight rail
  return fitUnit(pts);
}

function bacteriumPts() {
  const pts = [], L = 0.68, R = 0.3;
  for (let ix = -12; ix <= 12; ix++) { const x = ix / 12 * L; for (let a = 0; a < 14; a++) { const ang = a / 14 * 2 * Math.PI; pts.push([x, R * Math.cos(ang), R * Math.sin(ang)]); } } // body
  for (const sgn of [-1, 1]) for (let i = 0; i < 60; i++) { const d = fibDir(i, 60); if (sgn * d[0] < 0) continue; pts.push([sgn * L + d[0] * R, d[1] * R, d[2] * R]); } // caps
  for (let k = 0; k < 4; k++) { const ph = k / 4 * 2 * Math.PI; for (let s = 0; s <= 26; s++) { const f = s / 26, x = -L - 0.05 - f * 0.8, amp = 0.16 * f; pts.push([x, amp * Math.sin(f * 10 + ph) + 0.12 * Math.cos(ph), amp * Math.cos(f * 10 + ph) + 0.12 * Math.sin(ph)]); } } // flagella
  return fitUnit(pts);
}

// --- mortar ------------------------------------------------------------------
// Authored EXPORT rather than a ported generator (half-dotted-mortar.json,
// format v1): the lab's mortarPts, frozen at the pose the operator chose.
// Same convention as everything here — [x,y,z], fourth element = highlight.
export const MORTAR_PTS = [
  [-0.3068,-0.6857,0.0938],[-0.24,-0.7137,0.0564],[-0.2254,-0.7199,-0.0235],[-0.2739,-0.6995,-0.0857],
  [-0.349,-0.668,-0.0834],[-0.3941,-0.649,-0.0183],[-0.3753,-0.6569,0.0606],[-0.2728,-0.6049,0.0938],
  [-0.2061,-0.6329,0.0564],[-0.1915,-0.639,-0.0235],[-0.2399,-0.6187,-0.0857],[-0.315,-0.5871,-0.0834],
  [-0.3601,-0.5682,-0.0183],[-0.3414,-0.5761,0.0606],[-0.2388,-0.524,0.0938],[-0.1721,-0.552,0.0564],
  [-0.1575,-0.5582,-0.0235],[-0.206,-0.5378,-0.0857],[-0.281,-0.5063,-0.0834],[-0.3262,-0.4873,-0.0183],
  [-0.3074,-0.4952,0.0606],[-0.2049,-0.4431,0.0938],[-0.1382,-0.4712,0.0564],[-0.1235,-0.4773,-0.0235],
  [-0.172,-0.4569,-0.0857],[-0.2471,-0.4254,-0.0834],[-0.2922,-0.4065,-0.0183],[-0.2734,-0.4144,0.0606],
  [-0.1709,-0.3623,0.0938],[-0.1042,-0.3903,0.0564],[-0.0896,-0.3965,-0.0235],[-0.1381,-0.3761,-0.0857],
  [-0.2131,-0.3446,-0.0834],[-0.2583,-0.3256,-0.0183],[-0.2395,-0.3335,0.0606],[-0.137,-0.2814,0.0938],
  [-0.0702,-0.3095,0.0564],[-0.0556,-0.3156,-0.0235],[-0.1041,-0.2952,-0.0857],[-0.1792,-0.2637,-0.0834],
  [-0.2243,-0.2448,-0.0183],[-0.2055,-0.2526,0.0606],[-0.103,-0.2006,0.0938],[-0.0363,-0.2286,0.0564],
  [-0.0217,-0.2347,-0.0235],[-0.0701,-0.2144,-0.0857],[-0.1452,-0.1829,-0.0834],[-0.1903,-0.1639,-0.0183],
  [-0.1716,-0.1718,0.0606],[-0.069,-0.1197,0.0938],[-0.0023,-0.1477,0.0564],[0.0123,-0.1539,-0.0235],
  [-0.0362,-0.1335,-0.0857],[-0.1112,-0.102,-0.0834],[-0.1564,-0.083,-0.0183],[-0.1376,-0.0909,0.0606],
  [-0.0351,-0.0389,0.0938],[0.0316,-0.0669,0.0564],[0.0463,-0.073,-0.0235],[-0.0022,-0.0527,-0.0857],
  [-0.0773,-0.0212,-0.0834],[-0.1224,-0.0022,-0.0183],[-0.1036,-0.0101,0.0606],[-0.0011,0.042,0.0938],
  [0.0656,0.014,0.0564],[0.0802,0.0078,-0.0235],[0.0317,0.0282,-0.0857],[-0.0433,0.0597,-0.0834],
  [-0.0885,0.0787,-0.0183],[-0.0697,0.0708,0.0606],[0.0328,0.1228,0.0938],[0.0995,0.0948,0.0564],
  [0.1142,0.0887,-0.0235],[0.0657,0.109,-0.0857],[-0.0094,0.1406,-0.0834],[-0.0545,0.1595,-0.0183],
  [-0.0357,0.1516,0.0606],[0.0668,0.2037,0.0938],[0.1335,0.1757,0.0564],[0.1481,0.1695,-0.0235],
  [0.0997,0.1899,-0.0857],[0.0246,0.2214,-0.0834],[-0.0206,0.2404,-0.0183],[-0.0018,0.2325,0.0606],
  [0.1008,0.2845,0.0938],[0.1675,0.2565,0.0564],[0.1821,0.2504,-0.0235],[0.1336,0.2707,-0.0857],
  [0.0585,0.3023,-0.0834],[0.0134,0.3212,-0.0183],[0.0322,0.3133,0.0606],[0.1347,0.3654,0.0938],
  [0.2014,0.3374,0.0564],[0.216,0.3312,-0.0235],[0.1676,0.3516,-0.0857],[0.0925,0.3831,-0.0834],
  [0.0474,0.4021,-0.0183],[0.0662,0.3942,0.0606],[0.1687,0.4462,0.0938],[0.2354,0.4182,0.0564],[0.25,0.4121,-0.0235],
  [0.2015,0.4324,-0.0857],[0.1265,0.464,-0.0834],[0.0813,0.4829,-0.0183],[0.1001,0.475,0.0606],[0.2026,0.5271,0.0938],
  [0.2693,0.4991,0.0564],[0.284,0.4929,-0.0235],[0.2355,0.5133,-0.0857],[0.1604,0.5448,-0.0834],
  [0.1153,0.5638,-0.0183],[0.1341,0.5559,0.0606],[0.2366,0.608,0.0938],[0.3033,0.5799,0.0564],[0.3179,0.5738,-0.0235],
  [0.2694,0.5942,-0.0857],[0.1944,0.6257,-0.0834],[0.1492,0.6446,-0.0183],[0.168,0.6367,0.0606],
  [0.2705,0.6888,0.0938],[0.3373,0.6608,0.0564],[0.3519,0.6546,-0.0235],[0.3034,0.675,-0.0857],[0.2283,0.7065,-0.0834],
  [0.1832,0.7255,-0.0183],[0.202,0.7176,0.0606],[0.2681,0.6898,0,1],[-0.3092,-0.7288,0],[-0.2466,-0.7288,0],
  [-0.3092,-0.7288,0.0626],[-0.3718,-0.7288,0],[-0.3092,-0.7288,-0.0626],[-0.1841,-0.7288,0],[-0.2207,-0.7288,0.0885],
  [-0.3092,-0.7288,0.1252],[-0.3977,-0.7288,0.0885],[-0.4344,-0.7288,0],[-0.3977,-0.7288,-0.0885],
  [-0.3092,-0.7288,-0.1252],[-0.2207,-0.7288,-0.0885],[-0.1215,-0.7288,0],[-0.1466,-0.7288,0.0939],
  [-0.2153,-0.7288,0.1626],[-0.3092,-0.7288,0.1877],[-0.4031,-0.7288,0.1626],[-0.4718,-0.7288,0.0939],
  [-0.4969,-0.7288,0],[-0.4718,-0.7288,-0.0939],[-0.4031,-0.7288,-0.1626],[-0.3092,-0.7288,-0.1877],
  [-0.2153,-0.7288,-0.1626],[-0.1466,-0.7288,-0.0939],[-0.0589,-0.7288,0],[-0.078,-0.7288,0.0958],
  [-0.1322,-0.7288,0.177],[-0.2134,-0.7288,0.2313],[-0.3092,-0.7288,0.2503],[-0.405,-0.7288,0.2313],
  [-0.4862,-0.7288,0.177],[-0.5405,-0.7288,0.0958],[-0.5595,-0.7288,0],[-0.5405,-0.7288,-0.0958],
  [-0.4862,-0.7288,-0.177],[-0.405,-0.7288,-0.2313],[-0.3092,-0.7288,-0.2503],[-0.2134,-0.7288,-0.2313],
  [-0.1322,-0.7288,-0.177],[-0.078,-0.7288,-0.0958],[0.0037,-0.7288,0],[-0.0116,-0.7288,0.0967],
  [-0.0561,-0.7288,0.1839],[-0.1253,-0.7288,0.2531],[-0.2125,-0.7288,0.2976],[-0.3092,-0.7288,0.3129],
  [-0.4059,-0.7288,0.2976],[-0.4931,-0.7288,0.2531],[-0.5623,-0.7288,0.1839],[-0.6068,-0.7288,0.0967],
  [-0.6221,-0.7288,0],[-0.6068,-0.7288,-0.0967],[-0.5623,-0.7288,-0.1839],[-0.4931,-0.7288,-0.2531],
  [-0.4059,-0.7288,-0.2976],[-0.3092,-0.7288,-0.3129],[-0.2125,-0.7288,-0.2976],[-0.1253,-0.7288,-0.2531],
  [-0.0561,-0.7288,-0.1839],[-0.0116,-0.7288,-0.0967],[0.0663,-0.7288,0],[0.0535,-0.7288,0.0972],
  [0.016,-0.7288,0.1877],[-0.0437,-0.7288,0.2655],[-0.1215,-0.7288,0.3252],[-0.212,-0.7288,0.3627],
  [-0.3092,-0.7288,0.3755],[-0.4064,-0.7288,0.3627],[-0.4969,-0.7288,0.3252],[-0.5747,-0.7288,0.2655],
  [-0.6344,-0.7288,0.1877],[-0.6719,-0.7288,0.0972],[-0.6847,-0.7288,0],[-0.6719,-0.7288,-0.0972],
  [-0.6344,-0.7288,-0.1877],[-0.5747,-0.7288,-0.2655],[-0.4969,-0.7288,-0.3252],[-0.4064,-0.7288,-0.3627],
  [-0.3092,-0.7288,-0.3755],[-0.212,-0.7288,-0.3627],[-0.1215,-0.7288,-0.3252],[-0.0437,-0.7288,-0.2655],
  [0.016,-0.7288,-0.1877],[0.0535,-0.7288,-0.0972],[-0.3054,-0.6863,0.1435],[-0.2484,-0.7102,0.1275],
  [-0.2034,-0.7291,0.0863],[-0.1794,-0.7392,0.028],[-0.1811,-0.7385,-0.0359],[-0.2081,-0.7271,-0.0927],
  [-0.2552,-0.7074,-0.1311],[-0.313,-0.6831,-0.1435],[-0.37,-0.6591,-0.1275],[-0.415,-0.6402,-0.0863],
  [-0.439,-0.6301,-0.028],[-0.4374,-0.6309,0.0359],[-0.4103,-0.6422,0.0927],[-0.3632,-0.662,0.1311],
  [-0.1988,-0.7288,-0.3755],[-0.183,-0.6658,-0.3442],[-0.1673,-0.6027,-0.3129],[-0.1515,-0.5396,-0.2816],
  [-0.1358,-0.4766,-0.2503],[-0.1201,-0.4135,-0.219],[-0.1043,-0.3504,-0.1877],[-0.0886,-0.2873,-0.1564],
  [-0.0728,-0.2243,-0.1252],[-0.0571,-0.1612,-0.0939],[-0.0414,-0.0981,-0.0626],[-0.0256,-0.035,-0.0313],
  [-0.0099,0.028,0],[-0.1988,-0.7288,0.3755],[-0.183,-0.6658,0.3442],[-0.1673,-0.6027,0.3129],[-0.1515,-0.5396,0.2816],
  [-0.1358,-0.4766,0.2503],[-0.1201,-0.4135,0.219],[-0.1043,-0.3504,0.1877],[-0.0886,-0.2873,0.1564],
  [-0.0728,-0.2243,0.1252],[-0.0571,-0.1612,0.0939],[-0.0414,-0.0981,0.0626],[-0.0256,-0.035,0.0313],
  [-0.0099,0.028,0],];

// Our names for them, which are what the tower head picker shows.
// seashell — logarithmic-spiral tube (ported verbatim from the lab's
// shellPts; the tactician enemy wears it under the wave animation)
function shellPts() { const pts = [], k = 0.20, turns = 3.6, Nt = 168, Mf = 11; for (let it = 0; it < Nt; it++) { const th = it / Nt * turns * 2 * Math.PI, R = 0.05 * Math.exp(k * th), ct = Math.cos(th), st = Math.sin(th), tr = R * 0.62; for (let ip = 0; ip < Mf; ip++) { const f = ip / Mf * 2 * Math.PI; pts.push([R * ct + tr * Math.cos(f) * ct, R * st + tr * Math.cos(f) * st, tr * Math.sin(f)]); } } return fitUnit(pts); }

export const BRAILLE_SHAPES = {
  sixaxis: armSixAxisPts,         // six-axis arm — pedestal, shoulder, elbow, wrist, tool flange
  delta: armDeltaPts,             // delta robot — three parallel arms from a fixed frame
  gripper: armGripperPts,         // gripper arm — reach ending in a two-finger claw
  guyed: twGuyedPts,              // guyed mast — thin shaft held by tensioned stays
  broadcast: twBroadcastPts,      // broadcast antenna — tapered mast under a radiator stack
  ripple: wvRipplePts,            // concentric ripple — a struck-water surface, frozen
  obelisk: obEgyptianPts,         // egyptian obelisk — tapered shaft, pyramidion cap
  launcher: launcherPts,
  mortar: () => MORTAR_PTS,        // tube-and-baseplate — the AoE tower's head          // rocket launcher — boxed tubes on a traversing mount
  bacterium: bacteriumPts,        // bacterium — rod body with flagella; an ENEMY candidate
  shell: shellPts,                // seashell spiral — the shellback enemy's body
};

export const BRAILLE_SHAPE_KINDS = Object.keys(BRAILLE_SHAPES);
