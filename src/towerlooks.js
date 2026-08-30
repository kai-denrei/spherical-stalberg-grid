// towerlooks.js — the tower VISUAL registry.
//
// Tower combat math lives in towers.js and must never be touched to change
// how a tower looks. This file is the seam: a look is a named builder that
// turns a tower def into an Object3D, and swapping looks rebuilds only the
// `obj` on a tower — key, def, tier, cell, cooldown and spend are game
// state and stay exactly where they were.
//
// The contract a look MUST satisfy, read off td-tab's call sites:
//   - returns a THREE.Group that raycasts (tap-to-select hits it)
//   - userData.baseScale : placement multiplies by this
//   - userData.tick(t)   : optional idle animation
//   - userData.lift      : optional, how far off the surface
// Every look shares the same MAST (base, column, collar) so they read as
// one family of machine and only the head changes.
//
// `preload` is optional and returns a Promise. It exists for looks whose
// assets arrive asynchronously — a GLB, say — so those can drop in later
// without reshaping this interface. A look with no preload is ready
// immediately; a look whose preload has not resolved falls back.
import * as THREE from '../vendor/three.module.js';
import { loadGlb, mergeByMaterial, fitModel, tintModel } from './glbmodels.js?v=fa168003';
import { makeTowerMast, makeTowerUnit } from './units.js?v=fa168003';
import { TOWER, HEADS, loadTower } from './feelstore.js?v=fa168003';

// def.shape -> a solid primitive, so the SOLID look keeps each tower's
// silhouette identity from towers.js rather than inventing its own.
function solidHeadGeometry(shape) {
  switch (shape) {
    case 'cone':      return new THREE.ConeGeometry(0.42, 0.86, 7);
    case 'pyramid':   return new THREE.ConeGeometry(0.46, 0.8, 4);
    case 'teardrop':  return new THREE.ConeGeometry(0.36, 0.95, 10);
    case 'bipyramid': return new THREE.OctahedronGeometry(0.5);
    case 'gear':      return new THREE.TorusGeometry(0.34, 0.16, 6, 8);
    case 'spiral':    return new THREE.TorusKnotGeometry(0.3, 0.1, 48, 6, 2, 3);
    case 'dspiral':   return new THREE.TorusKnotGeometry(0.3, 0.1, 48, 6, 3, 2);
    case 'sphere':
    default:          return new THREE.IcosahedronGeometry(0.46, 0);
  }
}

// SOLID: the same mast, but a faceted tinted head with bright edges
// instead of the dot cloud. Reads as machined hardware rather than a
// hovering swarm — the clearest possible contrast at a glance, which is
// what makes it useful for judging the swap.
function makeTowerSolid(def) {
  const { g, head, edge } = makeTowerMast(def);
  const body = new THREE.MeshLambertMaterial({
    color: def.color, emissive: new THREE.Color(def.color).multiplyScalar(0.18),
  });
  const geo = solidHeadGeometry(def.shape);
  const mesh = new THREE.Mesh(geo, body);
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
  head.add(mesh);
  // slower than the cloud and with no bob: solid mass should feel heavier
  const spin = (def.spin ?? 0.6) * 0.45;
  g.userData.tick = (t) => { head.rotation.y = t * spin; };
  return g;
}

// --- GLB looks ------------------------------------------------------------
// Models arrive asynchronously, which is the whole reason the registry has
// preload/lookReady: until the bytes land, build() falls back to braille so
// a tower is never invisible.

function makeGlbLook({ label, url, height, maxSpan, drop = [] }) {
  let proto = null;
  const look = {
    label,
    loaded: false,
    preload() {
      if (look._p) return look._p;
      look._p = loadGlb(url).then((scene) => {
        if (!scene) return false;
        // no pivots preserved: a tower that has dug in holds still, and a
        // fully merged model is ~6 draw calls instead of ~109
        proto = fitModel(mergeByMaterial(scene, [], drop), { height, maxSpan });
        look.loaded = true;
        return true;
      });
      return look._p;
    },
    build(def) {
      if (!proto) return makeTowerUnit(def); // bytes not in yet — never nothing
      const g = proto.clone(true);
      tintModel(g, def.color);
      g.userData.baseScale = 1 / 1.55;   // same envelope convention as the mast
      g.userData.lift = 0.02;
      g.userData.kind = 'mesh';
      return g;
    },
  };
  return look;
}

export const TOWER_LOOKS = {
  // built against the LIVE tuning object, so what the viewer's tower panel
  // shows is what the board raises — no apply step, nothing to sync
  braille: { label: 'braille', build: (def) => makeTowerUnit(def, loadTower(), HEADS) },
  solid:   { label: 'solid',   build: makeTowerSolid },
  heptapod: makeGlbLook({
    label: 'heptapod',
    url: 'assets/models/heptapod.glb',
    height: 1.35,  // mast units — the braille mast is 1.55 tall
    maxSpan: 2.2,  // but never sprawl wider than this over its neighbours
    // a 12-triangle physics proxy the exporter left visible — drawing it
    // lays two big triangles over the model with corners poking out
    drop: ['Hull_Collision'],
  }),
};

export const TOWER_LOOK_NAMES = Object.keys(TOWER_LOOKS);
export const DEFAULT_TOWER_LOOK = 'braille';

// Never throws and never returns null: an unknown name (a stale URL hook,
// a saved preference for a look that has since been removed) falls back to
// the default rather than leaving a tower invisible on the board.
export function buildTowerLook(name, def) {
  const look = TOWER_LOOKS[name] || TOWER_LOOKS[DEFAULT_TOWER_LOOK];
  return look.build(def);
}

// Kick off a look's async load if it has one. Resolves to true when the
// look is ready to build for real. Safe to call repeatedly — the promise
// is cached — and safe to call for looks with no assets.
export function preloadLook(name) {
  const look = TOWER_LOOKS[name];
  if (!look || !look.preload) return Promise.resolve(true);
  return look.preload();
}

// A look is usable now if it declares no async assets, or its preload has
// resolved. Callers use this to fall back rather than render nothing.
export function lookReady(name) {
  const look = TOWER_LOOKS[name];
  if (!look) return false;
  return !look.preload || look.loaded === true;
}
