// cine/planet.js — THE WIRE PLANET, as a cinematic draws it.
//
// The game's identity is a dark body under additive wire edges, and the
// sphere pipeline behind it (grid.js) is resolution-independent. A
// cinematic wants that object and nothing of the game around it: no
// dungeon carve, no HUD, no enemies, no towers, no tank — the Stålberg quad
// grid on a sphere, relaxed, drawn as the board draws it. The gate's beat 3
// lands on it (ruling C, 2026-09-04) so the ring ends "at the size it has
// in the game, in a game-world", and THE PLANET (phase 2) orbits it.
//
// Nothing here is a second version of the board: the vertices and quads
// come from generateSphereMesh + relax, the same calls td-tab.js makes, and
// the edge look is the board's own from looks.js, passed in by the scene.
import * as THREE from '../../vendor/three.module.js';
import { generateSphereMesh, relax } from '../grid.js?v=288a8743';

/**
 * @param seed       the sphere's seed — a board seed names a planet
 * @param n          sample points; the board's default is 600, a cinematic
 *                   that shows the whole disc wants fewer, bigger cells
 * @param relaxIters the board uses 80
 * @param radius     world radius the mesh is generated at (scale the group
 *                   afterwards to put it in a scene's metres)
 * @param edges      { color, opacity, additive } — a look's edges block
 * @param body       the dark body colour under the wire
 * @returns a Group with .userData.mesh (the grid), .userData.wire, .userData.body
 */
export function makeWirePlanet({
  seed = 4414, n = 420, relaxIters = 60, radius = 1,
  edges = { color: 0x00e5ff, opacity: 0.9, additive: true },
  body = 0x05070c,
} = {}) {
  const mesh = generateSphereMesh({ seed, n, radius });
  relax(mesh, { n_iters: relaxIters, PULL_RATE: 0.25 });
  const { vertices, quads } = mesh;

  // every quad edge once: a shared edge belongs to two quads
  const seen = new Set();
  const pos = [];
  for (const q of quads) {
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      const key = a < b ? a * 65536 + b : b * 65536 + a;
      if (seen.has(key)) continue;
      seen.add(key);
      const p = vertices[a], r = vertices[b];
      pos.push(p[0], p[1], p[2], r[0], r[1], r[2]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const wire = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: edges.color, transparent: true, opacity: edges.opacity,
    blending: edges.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: !edges.additive,
  }));

  // the body: a hair under the wire so the far side's lines are hidden by
  // depth, and lit (not basic) so the sun's shadow of what stands on it lands
  const bodyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.995, 96, 64),
    new THREE.MeshStandardMaterial({ color: body, roughness: 1, metalness: 0 }));
  bodyMesh.receiveShadow = true;

  const g = new THREE.Group();
  g.add(bodyMesh, wire);
  g.userData.mesh = mesh;
  g.userData.wire = wire;
  g.userData.body = bodyMesh;
  g.userData.cellSide = mesh.defaultSide;
  return g;
}
