// cine/gate.js — THE GATE. A 12-second cinematic (docs/CINEMATICS-PLAN.md,
// phase 1): the wormhole full frame, then the pull back through the
// aperture into the ring, under the galaxy sky.
//
// Draws the game's own assets: the GT-9 ring exactly as units.js casts it
// (makePortalRing — same repaint, same pivots), the wormhole shader at a
// frame-class target, the galaxy bake as sky AND as the environment every
// metal reflects. Nothing here is a second copy of anything (plan §0).
//
// Every time-dependent thing is SET from t: rotors, phases, the camera.
// A capture seeks; the live loop just calls update(t) with a running t.
import * as THREE from '../../vendor/three.module.js';
import { preloadPortalRing, makePortalRing } from '../units.js?v=35fc6c3a';
import { bakeGalaxyCube } from '../galaxybake.js?v=35fc6c3a';
import { SKY_PRESET } from '../galaxyseed.js?v=35fc6c3a';
import { createWormholeTarget, RING_SPIN, TRAVEL } from './wormholebg.js?v=35fc6c3a';
import { compileRail } from './rail.js?v=35fc6c3a';

export const GATE_LEN = 12;

// The rail. The aperture faces +Z and the disc is a unit circle on
// Aperture_Volume, whose scale is the clearance radius (~1.8 m). Beat 1
// sits INSIDE the throat and pulls slowly back — at 0.5 m the disc is 6x
// larger than the frame, so what fills it is the march's centre. Beat 2
// pulls through the plane; the ring resolves around the frame and settles
// at half the height. Beat 3 drifts, for the crossing (phase 1c).
export const GATE_RAIL = [
  // beat 1: the camera HOLDS at 2.3 m, where the 1.8 m disc still fills a
  // 16:9 frame at fov 40 — the tunnel's "flying out" is the march's own
  // uNear ramp (below), not the camera's. No seam, one march per frame.
  { t: 0.0, pos: [0.10, 0.06, 2.30], look: [0.08, 0.05, -2], fov: 40 },
  { t: 4.0, pos: [0.12, 0.08, 2.30], look: [0.06, 0.04, -2] },
  { t: 8.0, pos: [1.60, 0.90, 7.20], look: [0, 0, 0] },
  { t: 12.0, pos: [-0.80, 0.60, 8.00], look: [0, 0.1, 0] },
];

// Beat 1 is the march's own fly-out: the ray's start distance (uNear) ramps
// from inside the throat (0.45) to the tuned 1.5 the board shows, on the
// disc itself. A first cut drew a second, frame-shaped march on a camera
// quad and crossfaded it into the disc — two marches a frame and a hard
// circular seam where their scales met (t=4.6 still). The disc fills the
// frame at 2.3 m anyway, so one march does it.
const NEAR_IN = 0.45, NEAR_OUT = 1.5, BEAT1 = 4.0;

export function createGate({ renderer, scene, camera, tier = {} }) {
  const whSize = tier.wormhole ?? 1024;
  const wh = createWormholeTarget({ size: whSize, filter: tier.name === 'cinema' ? 'nearest' : 'linear' });
  const rail = compileRail(GATE_RAIL, { fov: 40 });

  // THE SKY: the game's bake, at a cinema face size, as background and as
  // the environment (PMREM) — the ring reflects its own galaxies.
  const sky = bakeGalaxyCube(renderer, { ...SKY_PRESET, seed: 4414, face: tier.skyFace ?? 1024, galaxies: 2 });
  scene.background = sky.texture;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromCubemap(sky.texture).texture;
  scene.environmentIntensity = 0.35;

  // LIGHT: a key that casts, a cool fill, the sky for the rest
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.2);
  sun.position.set(6, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -6;
  sun.shadow.camera.right = sun.shadow.camera.top = 6;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xc9d4e6, 0x141216, 0.30));
  // the throat lights the ring's inside: a point light at the aperture,
  // tinted from the preset's hue, so the metal facing the wormhole glows
  const throat = new THREE.PointLight(0xc46cff, 40, 12, 2);
  throat.position.set(0, 0, 0.2);
  scene.add(throat);

  const root = new THREE.Group();
  scene.add(root);
  let ring = null, disc = null, apertureWorld = new THREE.Vector3();
  const rests = {};
  preloadPortalRing().then((ok) => {
    if (!ok) return;
    ring = makePortalRing(0xaee8ff);
    if (!ring) return;
    ring.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // the board's strips carry the tint in DIFFUSE and emissive both; under
    // ACES + the sky environment that clipped to white. The hue goes into
    // emissive over a dark base (the memory's own rule for glow parts), so
    // what bloom lifts is the light, not a white plate.
    for (const m of ring.userData.glows || []) {
      m.color.setHex(0x0e1218);
      if (m.emissive) { m.emissive.setHex(0x8fd4ff); m.emissiveIntensity = 1.1; }
    }
    // The board's grey ladder (RING_REPAINT) lifts every structural material
    // to a light grey WITH a grey emissive, so the ring shows on a black
    // board. Under a sun, a sky and tone mapping that lifts to pastel
    // (matprobe: M_Armour #c2c8ce + emissive #4a5057). A cinematic lights
    // its metal, so the metal goes back to dark greys with no emissive — the
    // base the weathered maps (phase 1b) will sit on.
    const CINE_METAL = {
      M_Armour: [0x4b5157, 0.78, 0.35], M_Turret: [0x454b51, 0.80, 0.35],
      M_Detail: [0x3c4247, 0.70, 0.45], M_Steel: [0x5a6168, 0.50, 0.80],
      M_Rubber: [0x1f2225, 0.95, 0.05],
    };
    const done = new Set();
    ring.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        const spec = CINE_METAL[m.name];
        if (!spec || done.has(m)) continue;
        done.add(m);
        m.color.setHex(spec[0]); m.roughness = spec[1]; m.metalness = spec[2];
        if (m.emissive) m.emissive.setHex(0x000000);
      }
    });
    // the cast is fitted to board scale; bring the aperture back to ~1.8 m
    const ap = ring.userData.aperture;
    if (ap) {
      ring.updateMatrixWorld(true);
      const s = new THREE.Vector3(); ap.getWorldScale(s);
      const k = 1.8 / Math.max(s.x, s.y, 1e-6);
      ring.scale.multiplyScalar(k);
      ring.updateMatrixWorld(true);
      ap.getWorldPosition(apertureWorld);
      // put the aperture at the origin: the rail is authored around it
      ring.position.sub(apertureWorld);
      ring.updateMatrixWorld(true);
      // OPAQUE, unlike the board's additive disc: inside the throat the sky
      // must not shine through the wormhole, and from outside the aperture
      // is a hole into somewhere else, not a glow over the stars
      // ?disc=front|nomap|tone — variants for bisecting a GPU hang that only
      // happens with this disc filling a canvas wider than ~1500 px
      const dv = new URLSearchParams(location.search).get('disc') || '';
      disc = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({
        map: dv === 'nomap' ? null : wh.rt.texture, color: dv === 'nomap' ? 0x8040c0 : 0xffffff,
        side: dv === 'front' ? THREE.FrontSide : THREE.DoubleSide, toneMapped: dv === 'tone',
      }));
      if (new URLSearchParams(location.search).get('nodisc') !== '1') ap.add(disc);
    }
    for (const k of ['rotorA', 'rotorB', 'yaw']) {
      const o = ring.userData[k];
      if (o) rests[k] = k === 'yaw' ? o.rotation.y : o.rotation.z;
    }
    root.add(ring);
    // ?matprobe=1 — name every material on the cast ring with its channels,
    // so a recolour can be aimed at the right ones instead of at /glow/i
    if (new URLSearchParams(location.search).get('matprobe') === '1') {
      const seen = new Map();
      ring.traverse((o) => {
        if (!o.isMesh) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          const k = m.name || '(unnamed)';
          const e = seen.get(k) || { meshes: [], m };
          e.meshes.push(o.name); seen.set(k, e);
        }
      });
      for (const [k, e] of seen) {
        const m = e.m;
        console.log(`MAT ${k} color=#${m.color ? m.color.getHexString() : '-'} emissive=#${m.emissive ? m.emissive.getHexString() : '-'}`
          + ` ei=${m.emissiveIntensity ?? '-'} rough=${m.roughness ?? '-'} metal=${m.metalness ?? '-'}`
          + ` inGlows=${(ring.userData.glows || []).includes(m)} meshes=${e.meshes.length} e.g. ${e.meshes.slice(0, 3).join(',')}`);
      }
    }
  });

  const tmp = new THREE.Vector3();
  function update(t) {
    // the wormhole: travelling hard the whole way; beat 1 flies the ray's
    // start out of the throat (the march's own "inside, then out")
    const u = Math.min(1, t / BEAT1);
    wh.uniforms.uNear.value = NEAR_IN + (NEAR_OUT - NEAR_IN) * (u * u * (3 - 2 * u));
    wh.render(renderer, t, { travelRate: TRAVEL.max, spinRate: 0.15 });
    if (disc && disc.material.map !== wh.rt.texture) { disc.material.map = wh.rt.texture; disc.material.needsUpdate = true; }

    if (ring) {
      const u = ring.userData;
      if (u.rotorA) u.rotorA.rotation.z = rests.rotorA + RING_SPIN.rotorA * t;
      if (u.rotorB) u.rotorB.rotation.z = rests.rotorB + RING_SPIN.rotorB * t;
      if (u.yaw) u.yaw.rotation.y = rests.yaw + RING_SPIN.yaw * t;
    }
    const p = rail.poseAt(t);
    camera.position.set(p.pos[0], p.pos[1], p.pos[2]);
    camera.up.set(p.up[0], p.up[1], p.up[2]);
    camera.lookAt(tmp.set(p.look[0], p.look[1], p.look[2]));
    if (camera.fov !== p.fov) { camera.fov = p.fov; camera.updateProjectionMatrix(); }
  }

  return {
    name: 'gate', duration: GATE_LEN, update,
    ready: () => !!ring,
    wormhole: wh,                                   // the governor's lever
    lockUp: (t) => t < BEAT1 + 1.5,                 // the full-frame beat: never step UP inside it
    dispose() { wh.dispose(); sky.dispose(); pmrem.dispose(); },
  };
}
