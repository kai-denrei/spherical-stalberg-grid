// wormhole.frag.js — VENDORED from ~/Dev/procedural3dvisuals:
// shaders/wormhole.frag with common.glsl inlined, which is what that project's
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
export const WORMHOLE_FRAG = /* glsl */ `
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
// wormhole.frag — portal / tunnel-travel effect.
//
// Same four tricks as corona.frag, with three changes that turn a static ring
// into forward travel down a throat:
//
//  A. THE CAMERA MOVES. p.z is offset by uSpeed*time, so the field streams past
//     instead of the ring sitting still. Because the turbulence is a pure
//     function of position, translating the sample point makes the structure
//     flow coherently — you get motion parallax for free.
//
//  B. TWIST WITH DEPTH. p.xy is rotated by an angle proportional to p.z. This
//     is the single cheapest thing that reads as "wormhole" rather than "flying
//     down a pipe" — the walls shear past each other at different rates.
//
//  C. DEPTH-KEYED HUE. The cosine colour term is phase-shifted per channel and
//     by depth, so the throat runs a gradient from mouth to vanishing point
//     instead of one flat colour.
//
// The singularity trick is retained verbatim, measured against the *un-warped,
// un-twisted* sample so the throat edge stays a clean bright rim.
//
// uMinStep exists because the tunnel-wall distance goes to zero at the throat;
// without a floor the march stalls there and burns all its iterations in one
// spot, which shows up as a hard bright ring with no depth behind it.
// ─────────────────────────────────────────────────────────────────────────────

uniform int   uSteps;
uniform int   uTurbOctaves;
uniform float uTurbAmp;
uniform float uTurbFreq;
uniform float uStepScale;
uniform float uThroatRadius;
uniform float uColorBias;
uniform float uExposure;
uniform float uEpsilon;

// TRAVEL AND SPIN ARE PHASES, NOT RATES (2026-09-02).
//
// These were T*uSpeed and T*uSpin — accumulated time times a rate,
// computed here. That makes the rate a JUMP control: moving it does not
// change how fast the field flows from now on, it retroactively rewrites
// where the field has been for the whole session, and the longer the page
// has been open the further one slider notch teleports. Measured: a single
// 0.02 step moved the image by a mean delta of 12.1 at t=2s, 19.4 at t=20s
// and 28.1 at t=200s. Into turbulence, that reads as a reshuffle rather than
// an acceleration — which is exactly the operator's "seems to have no
// effect", and it also makes a smooth ramp impossible.
//
// The host integrates them instead (phase += rate * dt) and sends the phase.
// The rate then means what its name says, a ramp is a ramp, and the value
// stays under the host's control rather than growing with page uptime.
uniform float uTravel;       // accumulated forward distance
uniform float uTwist;        // radians of swirl per unit depth
uniform float uSpinPhase;    // accumulated barrel roll, radians
uniform float uHueSpread;    // per-channel cosine phase offset
uniform float uDepthHue;     // hue shift per unit depth
uniform float uMinStep;      // march step floor — prevents stalling at the wall
uniform float uNear;         // starting distance along the ray

void main() {
    vec3  rd  = rayDir(gl_FragCoord.xy);
    vec3  acc = vec3(0.0);
    float z   = uNear;
    float travel = uTravel;

    for (int i = 0; i < uSteps; i++) {
        vec3 p = z * rd;
        p.z += travel;                                  // (A) fly forward

        p.xy = rot(p.z * uTwist + uSpinPhase) * p.xy;   // (B) twist with depth

        vec3 unwarped = p;

        p = turbulence(p, z - T, uTurbOctaves, uTurbAmp, uTurbFreq);

        float wall = abs(uThroatRadius - length(p.xy));
        z += wall * uStepScale + uMinStep;

        float rim = max(abs(length(unwarped.xy) - uThroatRadius), uEpsilon);

        // (C) depth-keyed hue
        vec3 phase = p + vec3(0.0, 1.0, 2.0) * uHueSpread + unwarped.z * uDepthHue;
        acc += (uColorBias - cos(phase)) / (z * z) / rim;
    }

    writeOut(tanh(acc / uExposure));
}
`;
