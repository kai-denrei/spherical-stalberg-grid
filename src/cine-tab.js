// cine-tab.js — THE CINEMATICS TAB (docs/CINEMATICS-PLAN.md).
//
// A registry of self-contained scenes over one renderer, one bloom chain
// and the capture seam. ?scene=gate picks the scene (default gate),
// ?t=N parks the live loop at N seconds and holds, ?tier=cinema|live sets
// the wormhole target and sky face sizes. scripts/cine-capture.mjs drives
// __cine.seek(t) for the offline render.
import * as THREE from '../vendor/three.module.js';
import { makeBloom } from './postfx.js?v=ade5ce2d';
import { installCine } from './cine/kit.js?v=ade5ce2d';
import { createGate } from './cine/gate.js?v=ade5ce2d';

const SCENES = { gate: createGate };
// Two tiers (plan §2.1): the same rail, rendered live or offline.
export const CINE_TIERS = {
  live: { name: 'live', wormhole: 512, skyFace: 1024, dpr: 1.5 },
  cinema: { name: 'cinema', wormhole: 2048, skyFace: 2048, dpr: 1 },
};

export function initCineTab(root) {
  const q = new URLSearchParams(location.search);
  const container = root.querySelector('#cine-app');
  const hud = root.querySelector('#cine-hud');
  const tier = CINE_TIERS[q.get('tier')] || (q.get('capture') === '1' ? CINE_TIERS.cinema : CINE_TIERS.live);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, tier.dpr));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.02, 200);
  const postfx = makeBloom(renderer, scene, camera, { scale: 1, strength: 0.32, radius: 0.5, threshold: 0.35 });

  const which = SCENES[q.get('scene')] ? q.get('scene') : 'gate';
  const cine = SCENES[which]({ renderer, scene, camera, tier });

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h);
    postfx.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  let t = 0, held = false, active = false;
  const park = q.get('t') != null ? parseFloat(q.get('t')) : null;
  const clock = new THREE.Clock();
  function draw(at) {
    cine.update(at);
    postfx.render();
    if (hud) hud.textContent = `${cine.name} · ${at.toFixed(2)} s / ${cine.duration} s · ${tier.name} · wormhole ${tier.wormhole}px`;
  }
  function frame() {
    requestAnimationFrame(frame);
    if (!active || held) return;
    const dt = Math.min(0.05, clock.getDelta());
    if (park == null) t = (t + dt) % cine.duration; else t = park;
    draw(t);
  }
  frame();
  installCine({
    hold: (on) => { held = on; if (!on) clock.getDelta(); },
    seek: (at) => { t = at; draw(at); },
  });
  // ?ready=1 — say when the scene's assets have landed (the harness waits)
  window.__cineReady = () => cine.ready();

  return {
    setActive(on) { active = on; if (on) { resize(); clock.getDelta(); } },
  };
}
