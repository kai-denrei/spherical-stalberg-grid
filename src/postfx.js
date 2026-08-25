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
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(Math.max(1, size.x * o.scale), Math.max(1, size.y * o.scale)),
    o.strength, o.radius, o.threshold);
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
      composer.setSize(w, h);
      bloom.setSize(Math.max(1, w * o.scale), Math.max(1, h * o.scale));
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
