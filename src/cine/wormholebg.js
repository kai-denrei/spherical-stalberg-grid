// cine/wormholebg.js — the wormhole as a RENDER TARGET at any size.
//
// The board marches it into one shared 384px target; the bench into a
// square it sizes from a slider. A cinematic wants the same shader at a
// frame-class size (2048² costs ~140 ms on the M4 at the preset — offline
// money, spent gladly). Same fragment, same uniform names, same integrated
// phases (portalfx.js), so a preset copied off the bench is the truth here.
import * as THREE from '../../vendor/three.module.js';
import { WORMHOLE_FRAG } from '../fx/wormhole.frag.js?v=ade5ce2d';
import { WORMHOLE_PRESET, WORMHOLE_UNIFORM_DEFAULTS, RING_SPIN, TRAVEL } from '../portalfx.js?v=ade5ce2d';

export { RING_SPIN, TRAVEL };

// `width`/`height` for a frame-shaped target (a full-frame pass); `size`
// alone for the square disc. uResolution is the target's own pixels — the
// shader frames its throat in its own aspect.
export function createWormholeTarget({ size = 1024, width = size, height = size, preset = WORMHOLE_PRESET } = {}) {
  const uniforms = {
    uResolution: { value: new THREE.Vector3(width, height, width / height) },
    uTime: { value: 0 }, uMouse: { value: new THREE.Vector4() },
    uTimeScale: { value: 1 }, uTravel: { value: 0 }, uSpinPhase: { value: 0 },
  };
  for (const [k, v] of Object.entries(WORMHOLE_UNIFORM_DEFAULTS)) uniforms[k] = { value: v };
  for (const [k, v] of Object.entries(preset)) uniforms[k] = { value: v };
  const rt = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false,
  });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const cam = new THREE.Camera();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: WORMHOLE_FRAG, uniforms, depthTest: false, depthWrite: false,
  });
  scene.add(new THREE.Mesh(g, mat));
  return {
    rt, uniforms, size, width, height,
    // phases are SET from t, never accumulated: a capture seeks
    render(renderer, t, { travelRate = TRAVEL.max, spinRate = 0.15 } = {}) {
      uniforms.uTime.value = t;
      uniforms.uTimeScale.value = preset.uTimeScale ?? 1;
      uniforms.uTravel.value = travelRate * (preset.uTimeScale ?? 1) * t;
      uniforms.uSpinPhase.value = spinRate * (preset.uTimeScale ?? 1) * t;
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(rt);
      renderer.render(scene, cam);
      renderer.setRenderTarget(prev);
    },
    dispose() { rt.dispose(); g.dispose(); mat.dispose(); },
  };
}
