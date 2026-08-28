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
import { makeTowerMast, makeTowerUnit } from './units.js?v=80e2e6c9';

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

export const TOWER_LOOKS = {
  braille: { label: 'braille', build: makeTowerUnit },
  solid:   { label: 'solid',   build: makeTowerSolid },
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

// A look is usable now if it declares no async assets, or its preload has
// resolved. Callers use this to fall back rather than render nothing.
export function lookReady(name) {
  const look = TOWER_LOOKS[name];
  if (!look) return false;
  return !look.preload || look.loaded === true;
}
