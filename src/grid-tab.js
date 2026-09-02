// grid-tab.js — the relax-playground tab: Three.js shell + dashboard around
// the sphere grid pipeline. All grid math lives in grid.js (Node-testable).

import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import GUI from '../vendor/lil-gui.esm.js';
import {
  generateSphereMesh, relaxStep, squarenessError, quadErrors, valences,
} from './grid.js?v=6011d6ec';
import { mulberry32, randomSeed } from './rng.js?v=6011d6ec';

export function initGridTab(root) {
  let active = true;

  const params = {
    // generation
    seed: 42,
    points: 4000,
    candidates: 12,
    quadBias: 1.0,
    // relaxation
    playing: true,
    itersPerFrame: 1,
    pullRate: 0.25,
    sideScale: 1.0,
    // display
    faces: true,
    wireframe: true,
    defects: true,
    colorMode: 'cells', // cells | squareness | plain
  };

  const stats = { quads: 0, verts: 0, v3: 0, v5: 0, 'v6+': 0, error: 0, iter: 0 };

  // --- scene ---------------------------------------------------------------
  const container = root.querySelector('#app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10131a);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(0, 0.8, 2.6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 1.15;
  controls.maxDistance = 8;

  scene.add(new THREE.HemisphereLight(0xf0f4ff, 0x202030, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(3, 4, 2);
  scene.add(sun);
  const sun2 = new THREE.DirectionalLight(0x8899ff, 0.5);
  sun2.position.set(-3, -2, -4);
  scene.add(sun2);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  // --- mesh <-> three glue -------------------------------------------------
  let mesh = null;
  let edgeList = [];
  let cellColors = null;

  let faceGeo = null, faceMesh = null;
  let lineGeo = null, lineMesh = null;
  let pointGeo = null, pointMesh = null;

  const faceMat = new THREE.MeshLambertMaterial({
    vertexColors: true, side: THREE.FrontSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const lineMat = new THREE.LineBasicMaterial({ color: 0x0b0d12, transparent: true, opacity: 0.85 });
  const pointMat = new THREE.PointsMaterial({ size: 9, vertexColors: true, sizeAttenuation: false });

  function disposeAll() {
    for (const [geo, obj] of [[faceGeo, faceMesh], [lineGeo, lineMesh], [pointGeo, pointMesh]]) {
      if (obj) scene.remove(obj);
      if (geo) geo.dispose();
    }
    faceGeo = faceMesh = lineGeo = lineMesh = pointGeo = pointMesh = null;
  }

  function makeCellColors() {
    const rng = mulberry32(mesh.seed ^ 0x9e3779b9);
    cellColors = mesh.quads.map(() => {
      const h = rng();
      const c = new THREE.Color().setHSL(h, 0.45 + rng() * 0.2, 0.62 + rng() * 0.12);
      return [c.r, c.g, c.b];
    });
  }

  const errColorA = new THREE.Color(0x9fe2bf);
  const errColorB = new THREE.Color(0xe74c3c);
  const plainColor = new THREE.Color(0xb8c4d8);

  function faceColorArray() {
    const n = mesh.quads.length;
    const colors = new Float32Array(n * 6 * 3);
    let errs = null;
    if (params.colorMode === 'squareness') errs = quadErrors(mesh, { SIDE_LENGTH: mesh.defaultSide * params.sideScale });
    const tmp = new THREE.Color();
    for (let qi = 0; qi < n; qi++) {
      let r, g, b;
      if (params.colorMode === 'cells') {
        [r, g, b] = cellColors[qi];
      } else if (params.colorMode === 'squareness') {
        const t = Math.min(1, errs[qi] / 0.5);
        tmp.copy(errColorA).lerp(errColorB, t);
        r = tmp.r; g = tmp.g; b = tmp.b;
      } else {
        r = plainColor.r; g = plainColor.g; b = plainColor.b;
      }
      for (let v = 0; v < 6; v++) {
        const o = (qi * 6 + v) * 3;
        colors[o] = r; colors[o + 1] = g; colors[o + 2] = b;
      }
    }
    return colors;
  }

  function facePositionArray() {
    const { vertices, quads } = mesh;
    const pos = new Float32Array(quads.length * 6 * 3);
    let o = 0;
    for (const q of quads) {
      for (const vi of [q[0], q[1], q[2], q[0], q[2], q[3]]) {
        const p = vertices[vi];
        pos[o++] = p[0]; pos[o++] = p[1]; pos[o++] = p[2];
      }
    }
    return pos;
  }

  function buildEdgeList() {
    const seen = new Set();
    edgeList = [];
    for (const q of mesh.quads) {
      for (let i = 0; i < 4; i++) {
        const a = q[i], b = q[(i + 1) % 4];
        const key = a < b ? a * 1e7 + b : b * 1e7 + a;
        if (!seen.has(key)) { seen.add(key); edgeList.push([a, b]); }
      }
    }
  }

  function linePositionArray() {
    const { vertices } = mesh;
    const pos = new Float32Array(edgeList.length * 2 * 3);
    let o = 0;
    for (const [a, b] of edgeList) {
      const pa = vertices[a], pb = vertices[b];
      pos[o++] = pa[0]; pos[o++] = pa[1]; pos[o++] = pa[2];
      pos[o++] = pb[0]; pos[o++] = pb[1]; pos[o++] = pb[2];
    }
    return pos;
  }

  let defectIdx = [];
  function buildDefects() {
    const val = valences(mesh);
    defectIdx = [];
    const colors = [];
    stats.v3 = 0; stats.v5 = 0; stats['v6+'] = 0;
    const c3 = new THREE.Color(0xffb347);
    const c5 = new THREE.Color(0x47d7ff);
    const cX = new THREE.Color(0xff47d7);
    for (let i = 0; i < val.length; i++) {
      if (val[i] === 4) continue;
      defectIdx.push(i);
      const c = val[i] === 3 ? c3 : val[i] === 5 ? c5 : cX;
      colors.push(c.r, c.g, c.b);
      if (val[i] === 3) stats.v3++;
      else if (val[i] === 5) stats.v5++;
      else stats['v6+']++;
    }
    pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(defectPositionArray(), 3));
    pointGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    pointMesh = new THREE.Points(pointGeo, pointMat);
    scene.add(pointMesh);
  }

  function defectPositionArray() {
    const pos = new Float32Array(defectIdx.length * 3);
    let o = 0;
    for (const vi of defectIdx) {
      const p = mesh.vertices[vi];
      const f = 1.004;
      pos[o++] = p[0] * f; pos[o++] = p[1] * f; pos[o++] = p[2] * f;
    }
    return pos;
  }

  function rebuildScene() {
    disposeAll();

    faceGeo = new THREE.BufferGeometry();
    faceGeo.setAttribute('position', new THREE.BufferAttribute(facePositionArray(), 3));
    faceGeo.setAttribute('color', new THREE.BufferAttribute(faceColorArray(), 3));
    faceGeo.computeVertexNormals();
    faceMesh = new THREE.Mesh(faceGeo, faceMat);
    scene.add(faceMesh);

    buildEdgeList();
    lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositionArray(), 3));
    lineMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lineMesh);

    buildDefects();
    applyVisibility();
  }

  function applyVisibility() {
    if (faceMesh) faceMesh.visible = params.faces;
    if (lineMesh) lineMesh.visible = params.wireframe;
    if (pointMesh) pointMesh.visible = params.defects;
  }

  function refreshPositions() {
    faceGeo.getAttribute('position').copyArray(facePositionArray());
    faceGeo.getAttribute('position').needsUpdate = true;
    faceGeo.computeVertexNormals();
    lineGeo.getAttribute('position').copyArray(linePositionArray());
    lineGeo.getAttribute('position').needsUpdate = true;
    pointGeo.getAttribute('position').copyArray(defectPositionArray());
    pointGeo.getAttribute('position').needsUpdate = true;
  }

  function refreshColors() {
    faceGeo.getAttribute('color').copyArray(faceColorArray());
    faceGeo.getAttribute('color').needsUpdate = true;
  }

  // --- generation ----------------------------------------------------------
  function regenerate() {
    const t0 = performance.now();
    mesh = generateSphereMesh({
      seed: params.seed >>> 0,
      n: params.points,
      k: params.candidates,
      radius: 1,
      quadBias: params.quadBias,
    });
    stats.iter = 0;
    stats.quads = mesh.quads.length;
    stats.verts = mesh.vertices.length;
    makeCellColors();
    rebuildScene();
    updateStats();
    console.log(`generated in ${(performance.now() - t0).toFixed(0)}ms — ${stats.quads} quads`);
  }

  params.regenerate = regenerate;
  params.randomize = () => {
    params.seed = randomSeed() % 100000;
    seedCtrl.updateDisplay();
    regenerate();
  };

  // --- stats readout -------------------------------------------------------
  const statsEl = root.querySelector('#stats');
  function updateStats() {
    stats.error = squarenessError(mesh, { SIDE_LENGTH: mesh.defaultSide * params.sideScale });
    statsEl.textContent =
      `quads ${stats.quads}   verts ${stats.verts}   iter ${stats.iter}\n` +
      `defects: v3 ×${stats.v3}   v5 ×${stats.v5}   v6+ ×${stats['v6+']}` +
      `   (Σ(4−v) = 8, forced by topology)\n` +
      `mean squareness error ${stats.error.toFixed(4)}`;
  }

  // --- dashboard -----------------------------------------------------------
  const gui = new GUI({ title: 'spherical stålberg grid', container: root });

  const gGen = gui.addFolder('generation');
  const seedCtrl = gGen.add(params, 'seed', 0, 99999, 1).name('seed');
  seedCtrl.onFinishChange(regenerate);
  gGen.add(params, 'points', 50, 8000, 50).name('sample points').onFinishChange(regenerate);
  gGen.add(params, 'candidates', 2, 40, 1).name('blue-noise k').onFinishChange(regenerate);
  gGen.add(params, 'quadBias', 0, 1, 0.05).name('merge bias').onFinishChange(regenerate);
  gGen.add(params, 'randomize').name('🎲 random seed');
  gGen.add(params, 'regenerate').name('↻ regenerate');

  const gRelax = gui.addFolder('relaxation');
  gRelax.add(params, 'playing').name('play');
  gRelax.add(params, 'itersPerFrame', 1, 10, 1).name('iters / frame');
  gRelax.add(params, 'pullRate', 0.01, 0.6, 0.01).name('pull rate');
  gRelax.add(params, 'sideScale', 0.5, 1.5, 0.01).name('cell size ×');
  gRelax.add({ step: () => { doRelax(1); } }, 'step').name('single step');
  gRelax.add({ reset: () => regenerate() }, 'reset').name('⟲ reset (regen)');

  const gDisp = gui.addFolder('display');
  gDisp.add(params, 'faces').onChange(applyVisibility);
  gDisp.add(params, 'wireframe').onChange(applyVisibility);
  gDisp.add(params, 'defects').name('defect markers').onChange(applyVisibility);
  gDisp.add(params, 'colorMode', ['cells', 'squareness', 'plain'])
    .name('face color').onChange(refreshColors);

  // phones: start with the panel folded so the sphere isn't buried
  if (matchMedia('(pointer: coarse), (max-width: 700px)').matches) gui.close();

  // --- loop ----------------------------------------------------------------
  function doRelax(iters) {
    for (let i = 0; i < iters; i++) {
      relaxStep(mesh, {
        SIDE_LENGTH: mesh.defaultSide * params.sideScale,
        PULL_RATE: params.pullRate,
      });
      stats.iter++;
    }
    refreshPositions();
  }

  let frame = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!active) return;
    if (mesh && params.playing) {
      doRelax(params.itersPerFrame);
      if (params.colorMode === 'squareness' && frame % 5 === 0) refreshColors();
      if (frame % 15 === 0) updateStats();
    }
    frame++;
    controls.update();
    renderer.render(scene, camera);
  }

  regenerate();
  animate();

  return {
    setActive(on) {
      active = on;
      if (on) resize();
    },
  };
}
