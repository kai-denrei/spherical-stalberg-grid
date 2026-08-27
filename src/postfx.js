// postfx.js — the bloom chain the looks arc deferred. One composer per tab;
// the tab swaps its main renderer.render() for postfx.render(). Aux
// renderers (minimap, sprite icons) never go through here.
import { EffectComposer } from '../vendor/EffectComposer.js';
import { RenderPass } from '../vendor/RenderPass.js';
import { UnrealBloomPass } from '../vendor/UnrealBloomPass.js';
import { OutputPass } from '../vendor/OutputPass.js';
import * as THREE from '../vendor/three.module.js';

const COARSE = typeof matchMedia === 'function'
  && matchMedia('(pointer: coarse)').matches;

// The bloom's target size, in DEVICE pixels. EffectComposer sizes every
// pass at device pixels (it multiplies by the renderer's pixelRatio);
// anything that RE-APPLIES a pass size afterwards has to do the same, or
// it silently drops the ratio. Getting this wrong is invisible on a
// dpr-1 display and blocky on every Retina one, so it is pure and tested.
export function bloomTargetSize(cssW, cssH, pixelRatio, scale) {
  const f = (pixelRatio || 1) * (scale || 1);
  return {
    w: Math.max(1, Math.round(cssW * f)),
    h: Math.max(1, Math.round(cssH * f)),
  };
}

export function makeBloom(renderer, scene, camera, opts = {}) {
  const o = {
    strength: 0.9, radius: 0.4, threshold: 0.85, enabled: true,
    // UnrealBloomPass builds a mip chain — halve it on phones
    scale: COARSE ? 0.5 : 1.0,
    ...opts,
  };
  let enabled = o.enabled;
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  // EffectComposer's targets are created WITHOUT samples, so compositing
  // silently discards the renderer's antialias:true. On a wireframe/neon
  // board that is the most visible side effect of adding the chain — ask
  // for MSAA back (samples survives setSize, so this is set once).
  composer.renderTarget1.samples = 4;
  composer.renderTarget2.samples = 4;
  composer.addPass(new RenderPass(scene, camera));
  const b0 = bloomTargetSize(size.x, size.y, renderer.getPixelRatio(), o.scale);
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(b0.w, b0.h), o.strength, o.radius, o.threshold);
  composer.addPass(bloom);
  // linear render targets -> without OutputPass the whole scene washes out
  composer.addPass(new OutputPass());
  composer.setSize(size.x, size.y);

  return {
    render() {
      if (enabled) composer.render();
      else renderer.render(scene, camera);
    },
    setSize(w, h) {
      // ORDER MATTERS: composer.setSize() re-sizes EVERY pass (at device
      // pixels), which would clobber the bloom's scaled target — re-apply
      // the scaled bloom size AFTER it or the half-res path dies silently.
      // The re-apply must ALSO be in device pixels. It wasn't: it used the
      // CSS size, so on a dpr-2 display the bloom ran at a quarter of the
      // frame's linear resolution (composer 1600x914, bloom mip0 400x229)
      // and upsampling that blur beaded every thin bright edge into
      // blocky squares.
      composer.setSize(w, h);
      const b = bloomTargetSize(w, h, renderer.getPixelRatio(), o.scale);
      bloom.setSize(b.w, b.h);
    },
    setParams({ strength, radius, threshold } = {}) {
      if (strength !== undefined) bloom.strength = strength;
      if (radius !== undefined) bloom.radius = radius;
      if (threshold !== undefined) bloom.threshold = threshold;
    },
    setEnabled(v) { enabled = !!v; },
    get enabled() { return enabled; },
    params: o,
  };
}
