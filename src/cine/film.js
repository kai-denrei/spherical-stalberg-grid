// cine/film.js — THE FILM PASS (plan phase 4): letterbox, grain, vignette,
// and a title card — drawn IN THE CANVAS, after the OutputPass, in display
// space. A DOM overlay would be the easy way and the wrong one: the capture
// reads the drawing buffer (kit.js frame()), so anything outside the
// canvas is not in the clip.
//
// Everything is a function of t. The grain is a hash of (pixel, t), so a
// seek lands on the same grain as a play-through and two renders match.
import * as THREE from '../../vendor/three.module.js';
import { ShaderPass } from '../../vendor/ShaderPass.js';

export const FILM_DEFAULTS = {
  bars: 0.1276,       // 2.39:1 inside a 16:9 frame, per side
  grain: 0.045,       // amount, in display units
  vignette: 0.32,     // darkening at the corners
};

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    tTitle: { value: null },
    uBars: { value: FILM_DEFAULTS.bars },
    uGrain: { value: FILM_DEFAULTS.grain },
    uVignette: { value: FILM_DEFAULTS.vignette },
    uTime: { value: 0 },
    uTitleAlpha: { value: 0 },
    uTitleRect: { value: new THREE.Vector4(0.25, 0.42, 0.5, 0.16) },   // x, y, w, h in uv, from the bottom
    uResolution: { value: new THREE.Vector2(1920, 1080) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform sampler2D tTitle;
    uniform float uBars, uGrain, uVignette, uTime, uTitleAlpha;
    uniform vec4 uTitleRect; uniform vec2 uResolution;
    varying vec2 vUv;
    // an integer hash on the pixel and the frame: the same grain for the same t
    float hash(vec3 p) {
      p = fract(p * vec3(443.897, 441.423, 437.195));
      p += dot(p, p.yzx + 19.19);
      return fract((p.x + p.y) * p.z);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // vignette: a soft darkening toward the corners
      vec2 q = vUv - 0.5;
      float v = 1.0 - uVignette * smoothstep(0.35, 0.95, dot(q, q) * 2.0);
      c.rgb *= v;
      // grain: luminance-weighted so the blacks stay black
      float g = hash(vec3(floor(vUv * uResolution), floor(uTime * 24.0))) - 0.5;
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb += g * uGrain * (0.35 + 0.65 * lum);
      // the title card, alpha over the picture
      if (uTitleAlpha > 0.0) {
        vec2 r = (vUv - uTitleRect.xy) / uTitleRect.zw;
        if (r.x >= 0.0 && r.x <= 1.0 && r.y >= 0.0 && r.y <= 1.0) {
          vec4 tt = texture2D(tTitle, r);
          c.rgb = mix(c.rgb, tt.rgb, tt.a * uTitleAlpha);
        }
      }
      // the letterbox last: nothing draws in the bars
      if (vUv.y < uBars || vUv.y > 1.0 - uBars) c.rgb = vec3(0.0);
      gl_FragColor = c;
    }`,
};

/**
 * A title card as a texture: the game's own CRT face (fonts.js `crt` =
 * VT323), drawn once on a 2D canvas. The font must be LOADED before the
 * draw or the card is the fallback face; `await document.fonts.load(...)`
 * before calling this, and a capture's ready() waits on that.
 */
export function makeTitleTexture({ title, sub = '', font = "'VT323', ui-monospace, Menlo, monospace", color = '#8fd4ff', w = 1024, h = 256 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 18;
  g.fillStyle = color;
  g.font = `${Math.round(h * 0.42)}px ${font}`;
  g.fillText(title, w / 2, sub ? h * 0.40 : h * 0.5);
  if (sub) {
    g.shadowBlur = 8;
    g.fillStyle = 'rgba(200, 230, 255, 0.85)';
    g.font = `${Math.round(h * 0.16)}px ${font}`;
    g.fillText(sub, w / 2, h * 0.74);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}

/**
 * The pass. `set(t, { titleAlpha })` per frame; the tab appends it to the
 * post chain after the OutputPass (postfx.addFinalPass).
 */
export function createFilmPass({ bars = FILM_DEFAULTS.bars, grain = FILM_DEFAULTS.grain, vignette = FILM_DEFAULTS.vignette } = {}) {
  const pass = new ShaderPass(FilmShader);
  pass.uniforms.uBars.value = bars;
  pass.uniforms.uGrain.value = grain;
  pass.uniforms.uVignette.value = vignette;
  return {
    pass,
    setTitle(tex) { pass.uniforms.tTitle.value = tex; },
    setSize(w, h) { pass.uniforms.uResolution.value.set(w, h); },
    set(t, { titleAlpha = 0 } = {}) {
      pass.uniforms.uTime.value = t;
      pass.uniforms.uTitleAlpha.value = titleAlpha;
    },
  };
}

// the title's envelope: in over half a second, hold, out over one — a
// function of t, like everything else here
export function titleAlphaAt(t, { from = 0.6, hold = 2.6, fadeIn = 0.5, fadeOut = 0.9 } = {}) {
  if (t < from) return 0;
  if (t < from + fadeIn) return (t - from) / fadeIn;
  if (t < from + fadeIn + hold) return 1;
  if (t < from + fadeIn + hold + fadeOut) return 1 - (t - from - fadeIn - hold) / fadeOut;
  return 0;
}
