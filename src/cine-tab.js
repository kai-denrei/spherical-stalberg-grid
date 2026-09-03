// cine-tab.js — THE CINEMATICS TAB (docs/CINEMATICS-PLAN.md).
//
// A registry of self-contained scenes over one renderer, one bloom chain
// and the capture seam. ?scene=gate picks the scene (default gate),
// ?t=N parks the live loop at N seconds and holds, ?tier=cinema|live sets
// the wormhole target and sky face sizes. scripts/cine-capture.mjs drives
// __cine.seek(t) for the offline render.
import * as THREE from '../vendor/three.module.js';
import { makeBloom } from './postfx.js?v=65f5db19';
import { installCine } from './cine/kit.js?v=65f5db19';
import { createGate } from './cine/gate.js?v=65f5db19';
import { rateFromSample, fitSize, marchBudgetMs, createGovernor } from './cine/governor.js?v=65f5db19';

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
  // a capture page hides the chrome from the first frame (launch mode never seeks)
  if (q.get('capture') === '1') document.body.classList.add('cine-capture');

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, tier.dpr));
  // ?noshadow=1 / ?nobloom=1 / ?nodisc=1 / ?notone=1 — kill-switches for
  // bisecting a frame that hangs the GPU (it happened: every beat where the
  // disc covered the frame at the cinema tier stalled at 1080p)
  renderer.shadowMap.enabled = q.get('noshadow') !== '1';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = q.get('notone') === '1' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.02, 200);
  const postfx = makeBloom(renderer, scene, camera, { scale: 1, strength: 0.32, radius: 0.5, threshold: 0.35 });

  const which = SCENES[q.get('scene')] ? q.get('scene') : 'gate';
  const cine = SCENES[which]({ renderer, scene, camera, tier });

  // THE GOVERNOR (src/cine/governor.js). Live only: a capture has a fixed
  // tier by design. Calibrate this device with one timed march, fit the
  // largest target the frame budget affords, then govern by frame time.
  // ?gov=0 leaves the tier's size alone; ?fps=N sets the target (default
  // 60 on a fine pointer, 30 on a coarse one); ?govprobe=1 logs the pick.
  const govOn = q.get('capture') !== '1' && q.get('gov') !== '0' && cine.wormhole;
  const targetFps = parseFloat(q.get('fps')) || (matchMedia('(pointer: coarse)').matches ? 30 : 60);
  const gov = { rate: 0, calMs: 0, fit: 0, g: null, budget: 1000 / targetFps };
  if (govOn) {
    const wh = cine.wormhole;
    const steps = Math.round(wh.uniforms.uSteps.value), oct = Math.round(wh.uniforms.uTurbOctaves.value);
    gov.calMs = wh.calibrate(renderer, { size: 512 });
    gov.rate = rateFromSample(512, steps, oct, gov.calMs);
    gov.fit = fitSize({ rate: gov.rate, budgetMs: marchBudgetMs(targetFps), steps, octaves: oct });
    wh.setSize(gov.fit);
    gov.g = createGovernor({ budgetMs: gov.budget, initial: gov.fit });
    console.log(`GOV calibrate 512² ${steps}x${oct} = ${gov.calMs.toFixed(1)} ms -> ${(gov.rate / 1e9).toFixed(1)} Gfolds/s;`
      + ` target ${targetFps} fps, march budget ${marchBudgetMs(targetFps).toFixed(1)} ms -> ${gov.fit}px`
      + ` (tier said ${tier.wormhole})`);
    if (q.get('govprobe') === '1') {
      setTimeout(() => console.log(`GOV after 3 s: size=${cine.wormhole.size} frame=${gov.g.frameMs.toFixed(1)} ms`
        + ` steps=${JSON.stringify(gov.g.steps)}`), 3000);
    }
  }

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
  const noBloom = q.get('nobloom') === '1';
  if (noBloom) postfx.setEnabled(false);
  let fpsSmooth = 0;
  function draw(at) {
    cine.update(at);
    if (noBloom) renderer.render(scene, camera); else postfx.render();
    if (hud) {
      const w = cine.wormhole ? cine.wormhole.size : tier.wormhole;
      hud.textContent = `${cine.name} · ${at.toFixed(2)} s / ${cine.duration} s · ${tier.name} · wormhole ${w}px`
        + (gov.g ? ` · ${fpsSmooth.toFixed(0)} fps · ${(gov.rate / 1e9).toFixed(0)} G/s · fit ${gov.fit}`
          + (gov.g.steps.length ? ` · ${gov.g.steps[gov.g.steps.length - 1].why === 'over' ? '↓' : '↑'}${gov.g.size}` : '') : '');
    }
  }
  // ?loop=0 — never draw from the live loop; only a seek draws (a capture
  // page has no use for a live loop, and drawing dozens of frames before the
  // first seek is a variable a bisect wants removed)
  const noLoop = q.get('loop') === '0';
  // ?once=1 — draw ONE frame at ?t once the scene's assets have landed, then
  // stop: the launch-per-frame capture. Under a virtual-time budget the live
  // loop drew hundreds of cinema-cost frames before the screenshot (137 s
  // for one still); this draws one.
  const once = q.get('once') === '1';
  let drewOnce = 0;   // counts draws: a single draw was never composited into the screenshot (9 KB, black); three are
  function frame() {
    requestAnimationFrame(frame);
    if (!active || held || noLoop) return;
    if (once) {
      if (drewOnce >= 2 || !cine.ready()) return;
      drewOnce++; draw(park ?? 0);
      // the FIRST draw of the post chain came back black (11 KB PNG) from a
      // same-task read-back; the second draw is the frame
      if (drewOnce < 2) return;
      console.log(`CINE once drew t=${park ?? 0} tier=${tier.name} ${renderer.domElement.width}x${renderer.domElement.height}`);
      // ?dump=1 — the frame leaves as console chunks (PNGCHUNK i/n base64),
      // read back IN THIS TASK: the compositor never presented a once-drawn
      // frame into headless's --screenshot (9 KB of black, one draw or
      // three), and this path owes the compositor nothing. Same trick the
      // reverse export uses for a .glb.
      if (q.get('dump') === '1') {
        const b64 = renderer.domElement.toDataURL('image/png').split(',')[1];
        const CH = 40000, n = Math.ceil(b64.length / CH);
        for (let i = 0; i < n; i++) console.log(`PNGCHUNK ${i + 1}/${n} ${b64.slice(i * CH, (i + 1) * CH)}`);
      }
      return;
    }
    const dt = Math.min(0.05, clock.getDelta());
    if (park == null) t = (t + dt) % cine.duration; else t = park;
    draw(t);
    if (gov.g) {
      fpsSmooth += ((dt > 0 ? 1 / dt : 60) - fpsSmooth) * 0.1;
      const r = gov.g.tick(dt * 1000, performance.now(), { lockUp: cine.lockUp ? cine.lockUp(t) : false });
      if (r.changed) cine.wormhole.setSize(r.size);
    }
  }
  frame();
  installCine({
    hold: (on) => { held = on; if (!on) clock.getDelta(); },
    seek: (at) => { t = at; draw(at); },
    canvas: renderer.domElement,
  });
  // ?ready=1 — say when the scene's assets have landed (the harness waits)
  window.__cineReady = () => cine.ready();

  return {
    setActive(on) { active = on; if (on) { resize(); clock.getDelta(); } },
  };
}
