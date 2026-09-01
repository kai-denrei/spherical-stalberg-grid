// corona.frag.js — VENDORED from ~/Dev/procedural3dvisuals:
// shaders/corona.frag with common.glsl inlined, which is what that project's
// own docs/PORTING.md says to do (it resolves #include at runtime; we resolve
// it once, at port time, because this project has no build step).
//
// VERBATIM apart from one mechanical transform: backticks and dollar-braces
// inside the GLSL COMMENTS are escaped, because the source lives here as a
// template literal. The GLSL itself is untouched, so re-porting a newer
// version stays mechanical — the same contract as beamfx.js.
//
// Requires glslVersion: THREE.GLSL3 (tanh() and 'out' are GLSL ES 3.00 only)
// and the four core uniforms: uResolution (DRAWING BUFFER px, never CSS px),
// uTime, uMouse, uTimeScale.
export const CORONA_FRAG = /* glsl */ `
// ─────────────────────────────────────────────────────────────────────────────
// common.glsl — shared preamble for every effect in this sandbox.
//
// Included via  #include "common.glsl"   (double quotes).
// Our runtime resolver handles quoted includes; three.js's own resolveIncludes
// only handles angle-bracket <chunk> form, so the two never collide.
//
// Compiled as GLSL ES 3.00 (THREE.GLSL3). Under GLSL3 three.js does NOT declare
// pc_fragColor or alias gl_FragColor, so every effect declares its own
//     out vec4 fragColor;
// See vendor/three.module.js:20228 for the branch that decides this.
// ─────────────────────────────────────────────────────────────────────────────

// ── Uniforms present in every effect (see src/effect.mjs) ────────────────────
uniform vec3  uResolution;   // (w, h, w/h) in device pixels
uniform float uTime;         // seconds since start, pausable
uniform vec4  uMouse;        // xy = current px, zw = last click px
uniform float uTimeScale;

// ── Constants ───────────────────────────────────────────────────────────────
#define PI   3.14159265359
#define TAU  6.28318530718

// ── Uppercase conveniences ──────────────────────────────────────────────────
// T and R only. The lowercase dialect aliases (f, f2, f3, f4, len, nor) now
// live in xor-dialect.glsl and are included ONLY by files transcribing golfed
// source — they are preprocessor substitutions with no scope, so having them
// project-wide made every identifier named \`f\` a compile error waiting to
// happen. It happened twice. See xor-dialect.glsl.
#define T   (uTime * uTimeScale)
#define R   uResolution

// ── Ray setup ───────────────────────────────────────────────────────────────
// Xor's standard camera. Reproduces  nor(2*C.rgb - R.xyy)  from the golfed
// source. The original leans on gl_FragCoord.z (~0.5) to supply the third
// component as (2*0.5 - R.y); we write -R.y explicitly — a sub-pixel difference,
// but deterministic instead of dependent on the quad's depth.
vec3 rayDir(vec2 fragCoord) {
    return normalize(vec3(2.0 * fragCoord - uResolution.xy, -uResolution.y));
}

// Screen coords normalised to [-1,1] on the short axis, aspect-correct.
vec2 screenUV(vec2 fragCoord) {
    return (2.0 * fragCoord - uResolution.xy) / uResolution.y;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// Xor's turbulence: repeated  p += sin(p.zxy * d + phase) / d  with d doubling.
// Octaves of sine folded through a channel swizzle — organic advection with no
// noise texture and no hash. The .zxy rotation is what stops it collapsing into
// an axis-aligned grid.
vec3 turbulence(vec3 p, float phase, int octaves, float amp, float freq) {
    float d = freq;
    for (int i = 0; i < octaves; i++) {
        d += d;
        p += amp * sin(p.zxy * d + phase) / d;
    }
    return p;
}

// ── Output ──────────────────────────────────────────────────────────────────
// common.glsl owns the fragment output declaration. Under THREE.GLSL3 three.js
// injects neither \`pc_fragColor\` nor a \`gl_FragColor\` alias, so this must be
// declared exactly once per program — here, not in each effect.
out vec4 fragColor;

// Every effect ends with writeOut(colour) instead of assigning fragColor.
//
// A bare ShaderMaterial writes to the framebuffer VERBATIM: three.js applies
// colorspace and tone mapping only via the <colorspace_fragment> /
// <tonemapping_fragment> chunks embedded in its built-in material shaders, and
// a user shader contains neither. So the default path below is faithful to
// fragcoord.xyz — what you author is what you see.
//
// But the prefix still *defines* linearToOutputTexel() and (when tone mapping
// is enabled) toneMapping(). Flipping USE_THREE_OUTPUT_TRANSFORM routes through
// them, which is what the effect will experience if it is dropped into a scene
// that has renderer tone mapping on, or rendered into a target that is later
// composited. Check your effect under BOTH before porting it.
void writeOut(vec3 c) {
#ifdef USE_THREE_OUTPUT_TRANSFORM
  #if defined( TONE_MAPPING )
    c = toneMapping(c);
  #endif
    fragColor = linearToOutputTexel(vec4(c, 1.0));
#else
    fragColor = vec4(c, 1.0);
#endif
}

// ─────────────────────────────────────────────────────────────────────────────
// corona.frag — un-golfed replication of XorDev's "Coronal".
//
// Original (fragcoord.xyz dialect):
//     f z=2,d
//     @(40) {
//       f3 p = z * nor(2*C.rgb - R.xyy), t=p;
//       d=2; @(6) d+=d, p += sin(p.zxy*d+z-T) / d;
//       z += abs(1-len(p.xy))/3;
//       O += f4(1.1-cos(p),)/z/z/abs(len(t.xy)-1)
//     }
//     O = tanh(O / 30)
//
// How it actually works — four independent tricks stacked:
//
//  1. PSEUDO-RAYMARCH. z is distance along the ray. p = z*rd is the sample
//     point. There is no scene: the "geometry" is the unit cylinder x²+y²=1.
//
//  2. DOMAIN WARP drives the step. p is turbulence-warped BEFORE measuring
//     abs(1 - length(p.xy)), so the march advances through a distorted field.
//     This is what makes the plasma churn rather than sit still.
//
//  3. THE SINGULARITY — the load-bearing part. The emission is divided by
//     abs(length(t.xy) - 1) where t is the UN-warped sample. That term hits
//     zero exactly where the ray grazes the unit cylinder, so brightness goes
//     to infinity at the ring and falls off fast either side. Skip this and
//     you get a flat glow instead of a corona edge.
//
//     Note it is x/0, never 0/0: the numerator (uColorBias - cos(p)) has a
//     floor of uColorBias-1 = 0.1, so the worst case is +Inf, and tanh(+Inf)
//     saturates to 1. That is *why* the trick is safe. uEpsilon keeps it
//     strictly finite anyway — some drivers return NaN from tanh(Inf).
//
//  4. 1/z² FALLOFF + tanh TONEMAP. Inverse-square keeps distant samples from
//     washing out the frame; tanh is a cheap soft shoulder that never clips
//     hard, so the blown-out core stays white instead of going magenta.
//
// t (here: \`unwarped\`) is re-taken every iteration, NOT captured once — the
// ring term therefore sweeps outward with z rather than acting as a fixed
// screen-space mask. Getting this wrong yields a static vignette.
// ─────────────────────────────────────────────────────────────────────────────

uniform int   uSteps;        // 40  — march iterations
uniform int   uTurbOctaves;  //  6  — sine-fold octaves per step
uniform float uTurbAmp;      // 1.0 — warp strength
uniform float uTurbFreq;     // 2.0 — base frequency (doubles per octave)
uniform float uStepScale;    // 0.333 — march step damping
uniform float uRingRadius;   // 1.0 — cylinder radius
uniform float uColorBias;    // 1.1 — cosine colour offset
uniform float uExposure;     // 30.0 — tanh divisor
uniform float uEpsilon;      // 1e-4 — singularity clamp

void main() {
    vec3  rd  = rayDir(gl_FragCoord.xy);
    vec3  acc = vec3(0.0);
    float z   = 2.0;

    for (int i = 0; i < uSteps; i++) {
        vec3 p        = z * rd;
        vec3 unwarped = p;                 // \`t\` in the original

        p = turbulence(p, z - T, uTurbOctaves, uTurbAmp, uTurbFreq);

        z += abs(uRingRadius - length(p.xy)) * uStepScale;

        float ring = max(abs(length(unwarped.xy) - uRingRadius), uEpsilon);
        acc += (uColorBias - cos(p)) / (z * z) / ring;
    }

    writeOut(tanh(acc / uExposure));
}
`;
