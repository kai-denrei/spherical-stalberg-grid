// jelly.js — THE JELLY MASS. A boss-sized translucent body that wobbles in the
// VERTEX SHADER and costs about what an ordinary unit costs.
//
// Written after measuring ~/Dev/Jelly-Baby as a candidate to import: 144,464
// triangles, 72,234 vertices re-uploaded from the CPU every frame (1.65 MB a
// frame, ~99 MB/s at 60), a 4,026-tetrahedron XPBD solve at 240 Hz in a WASM
// kernel, a caustics worker, a transmission pass, WebGPU and three r185. All
// of that is a physically correct answer to a question this camera cannot ask:
// from orbit the boss is one to two cells across.
//
// So the soft body is deliberately NOT copied. What a player reads — a
// translucent mass that jiggles and has things hanging off it — is a shader,
// and the whole object is:
//
//   ONE closed mesh, ~5k triangles, ONE draw call
//   the tentacles are part of the BODY, displaced out of the same sphere, so
//     there is nothing to rig, nothing to attach and nothing to animate apart
//   wobble entirely in the vertex shader — zero per-frame uploads
//   fake translucency: fresnel rim over a dark interior, which is the same
//     trick the shield's hologram uses (units.js makeShieldShell)
//
// NO EYES AND NO MOUTH (operator). It is a mass, not a creature with a face —
// the moment it has eyes it reads as cute, and the silhouette stops being the
// thing the player is looking at.
import * as THREE from '../vendor/three.module.js';

export const JELLY_TUNE = {
  // three's polyhedron `detail` subdivides each of the 20 faces into
  // (detail+1)^2, NOT 4^detail — 4 gives 500 triangles, not 5,120. 12 is
  // 3,380: enough to keep a tapering appendage smooth, and a fortieth of the
  // mesh the imported version wanted.
  detail: 12,
  tentacles: 9,
  tentLen: 0.66,        // how far a lobe pulls out, as a fraction of the radius
  tentSharp: 11.0,      // lobe falloff — higher is a thinner, longer appendage
  // SPLAYED, not hanging. At 0.55 they pointed almost straight down and the
  // silhouette lost them entirely — a mass with appendages you cannot see is
  // just a mass. Around the equator and a little under is where they read.
  tentDroop: 0.22,      // how far below the equator they sit, 0..1
  lumps: 0.14,          // low-frequency irregularity, so it is not a ball
  wobbleAmp: 0.075,     // vertex-shader displacement, fraction of the radius
  wobbleFreq: 1.9,
  hitPulse: 0.22,       // extra swell on a hit, decaying
};

// A deterministic hash, because nothing in game logic may call Math.random.
const h1 = (i) => {
  const s = Math.sin(i * 127.1 + 11.7) * 43758.5453;
  return s - Math.floor(s);
};

// The tentacle directions: spread around the azimuth and pulled BELOW the
// equator, so the mass sits on the ground with its appendages trailing rather
// than radiating like a star. Uneven on purpose — evenly spaced lobes read as
// a manufactured object.
function tentacleDirs(tune, seed = 3) {
  const out = [];
  const n = Math.max(0, Math.round(tune.tentacles));
  for (let i = 0; i < n; i++) {
    const jitter = (h1(seed + i) - 0.5) * 0.9;
    const az = (i / n) * Math.PI * 2 + jitter;
    // below the equator by tentDroop, with a little variation per lobe
    const el = -tune.tentDroop * (0.55 + 0.6 * h1(seed + i + 40));
    const ce = Math.cos(el), se = Math.sin(el);
    out.push([Math.cos(az) * ce, se, Math.sin(az) * ce]);
  }
  return out;
}

// THE BODY, as a displaced icosphere. Every vertex keeps its direction and
// gains radius from two things: a few low-frequency lumps so it is not a ball,
// and a lobe per tentacle. Because the appendages ARE the sphere, the mesh
// stays closed and the whole thing is one draw call — the alternative, cones
// parented to a body, is N+1 draw calls and a seam at every joint.
export function jellyGeometry(tune = JELLY_TUNE, seed = 3) {
  const geo = new THREE.IcosahedronGeometry(1, Math.max(0, Math.round(tune.detail)));
  const pos = geo.attributes.position;
  const dirs = tentacleDirs(tune, seed);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let r = 1;
    // lumps: three axis-aligned sine lobes is enough to kill the sphere read
    r += tune.lumps * (Math.sin(v.x * 3.1 + 1.3) * Math.sin(v.y * 2.7)
      + Math.sin(v.z * 3.7 + 2.1) * 0.6);
    for (let t = 0; t < dirs.length; t++) {
      const d = dirs[t];
      const k = v.x * d[0] + v.y * d[1] + v.z * d[2];
      if (k <= 0) continue;
      // pow() on the cosine gives a lobe that leaves the body smoothly and
      // tapers to a point — a tentacle, rather than a bump with an edge
      const len = tune.tentLen * (0.6 + 0.8 * h1(seed + t + 90));
      r += len * Math.pow(k, tune.tentSharp);
    }
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  // NORMALISE TO A UNIT EXTENT, so `scale = cellSide * size` means the same
  // thing here as for every other unit. Without this a boss's real size is a
  // function of how far its longest tentacle happened to reach, which is not a
  // number anybody can reason about at the call site.
  let rmax = 0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    rmax = Math.max(rmax, v.length());
  }
  if (rmax > 1e-6) {
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).multiplyScalar(1 / rmax);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.userData = { reach: rmax };   // how much of the extent the lobes claimed
  return geo;
}

const VERT = `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  uniform float uHit;
  varying vec3 vN;
  varying vec3 vV;
  varying float vR;

  void main() {
    vec3 p = position;
    float r = length(p);
    vec3 d = p / max(r, 1e-4);
    // THREE LOBES AT DIFFERENT RATES. One sine is a pulse and reads as
    // breathing; three incommensurate ones never repeat visibly, which is what
    // makes a mass look like it is settling rather than animating.
    float w = sin(d.x * 3.7 + uTime * uFreq)
            + sin(d.y * 4.3 - uTime * uFreq * 0.83) * 0.8
            + sin(d.z * 3.1 + uTime * uFreq * 1.31) * 0.6;
    // the tentacles wobble MORE than the body: they are further out and
    // thinner, and a mass whose appendages move with it reads as rigid
    float tip = smoothstep(1.0, 1.9, r);
    float amp = uAmp * (1.0 + tip * 2.2) + uHit;
    p += d * (w * amp * r);
    vR = r;
    vN = normalize(normalMatrix * normalize(p));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = `
  uniform vec3 uColor;
  uniform vec3 uDeep;
  uniform float uOpacity;
  uniform float uHit;
  varying vec3 vN;
  varying vec3 vV;
  varying float vR;

  void main() {
    // FRESNEL IS THE WHOLE TRICK. Bright where the surface turns away, dark
    // through the middle — that reads as something you can see INTO, which is
    // what "jelly" is. The same shape the shield's hologram uses; here it sits
    // over a dark interior instead of over nothing.
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
    vec3 col = mix(uDeep, uColor, f);
    // the appendages carry more of the bright colour: thin matter transmits
    // more, and it is what separates them from the mass at a glance
    col += uColor * smoothstep(1.1, 2.0, vR) * 0.35;
    col += uColor * uHit * 3.0;
    // never fully opaque and never a ghost: the interior has to be readable
    // as a body or the silhouette stops meaning anything
    // thin at the middle, dense at the rim and denser again down the
    // appendages — that gradient is what says "you are looking THROUGH this"
    float a = uOpacity * (0.30 + 0.70 * f) * (0.85 + 0.35 * smoothstep(1.0, 1.8, vR));
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
`;

// One jelly. `tick(dt)` drives its own clock, `hit()` swells it — the caller
// owns nothing but a position and a scale.
export function makeJelly(cols = {}, tune = JELLY_TUNE, seed = 3) {
  // THE INTERIOR IS THE BODY, DARKENED — not a second hue. Taking `deep` from
  // the caller's `walker` gave a red interior under an orange rim, and two
  // close hues read as a lit solid rather than as something you can see into.
  // A jelly's depth is the same colour with the light gone out of it, so the
  // contrast that sells it is VALUE, not hue.
  const body = new THREE.Color(cols.walkerHi ?? 0x8affd8);
  const deep = body.clone().multiplyScalar(0.12);
  // ...with a breath of the identity colour, so a red boss still reads red at
  // its core rather than as a black hole with a coloured edge
  deep.lerp(new THREE.Color(cols.walker ?? 0x123a34), 0.35).multiplyScalar(0.55);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: tune.wobbleAmp },
      uFreq: { value: tune.wobbleFreq },
      uHit: { value: 0 },
      uColor: { value: body },
      uDeep: { value: deep },
      uOpacity: { value: 0.72 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,     // a translucent body writing depth punches holes in itself
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(jellyGeometry(tune, seed), mat);
  // ABSOLUTE TIME, not dt. The board calls `userData.tick(tNow + e.phase)` and
  // every other unit's tick is written `(t) => …` against that. This one took
  // dt and ACCUMULATED it, so it was adding the whole elapsed time on every
  // frame — t grew quadratically, the sine wobble aliased past the frame rate,
  // and the mass juddered. It looked like a bad animation; it was a unit
  // disagreeing with its host about what the argument means.
  let lastT = null;
  mesh.userData.tick = (t = 0) => {
    const dt = lastT === null ? 0.016 : Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;
    mat.uniforms.uTime.value = t;
    // the hit swell decays; it is a spike, not a state
    const h = mat.uniforms.uHit;
    if (h.value > 0) h.value = Math.max(0, h.value - dt * 1.4);
  };
  mesh.userData.hit = () => { mat.uniforms.uHit.value = tune.hitPulse; };
  // HOW THIS UNIT IS TINTED. The board tints a slowed enemy by writing
  // `material.color`, which a ShaderMaterial does not have — so it says here
  // how to do it instead, rather than the board special-casing a type.
  // Passing null restores the body's own colour.
  mesh.userData.setTint = (hex) => {
    mat.uniforms.uColor.value.set(hex === null || hex === undefined ? body : hex);
  };
  mesh.userData.kind = 'mesh';
  // THE UNIT CONTRACT, which test/units.mjs enforces for every entry in UNITS.
  // baseScale is 1 because jellyGeometry already normalises its extent — the
  // other meshes need a fit pass because they are authored at whatever size
  // their maker felt like.
  mesh.userData.baseScale = 1;
  // ...and it SQUATS. A blob with appendages hanging off its underside sits
  // lower than a hull does: 0.85 is the walking default and floats this one.
  mesh.userData.lift = 0.62;
  return mesh;
}
