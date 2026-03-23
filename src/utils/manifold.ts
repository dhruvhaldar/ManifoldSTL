import Module from 'manifold-3d';
import type { ManifoldToplevel, Manifold } from 'manifold-3d';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

let wasm: ManifoldToplevel | null = null;

export const initManifold = async (): Promise<ManifoldToplevel> => {
  if (wasm) return wasm;
  const instance = await Module();
  instance.setup();
  wasm = instance;
  return wasm;
};

export const getManifold = (): ManifoldToplevel => {
  if (!wasm) throw new Error("Manifold is not initialized. Call initManifold() first.");
  return wasm;
};

export const createBoundingDomain = (shape: 'box' | 'cylinder', dimensions: [number, number, number]): Manifold => {
  const m = getManifold();

  if (shape === 'box') {
    const [x, y, z] = dimensions;
    // Manifold3D creates box from [0,0,0] to [x,y,z]. We might want to center it.
    const box = m.Manifold.cube([x, y, z], true); // true = center
    return box;
  } else {
    // Manifold cylinder takes (height, radiusLow, radiusHigh, circularSegments, center)
    const [radius, height] = dimensions;
    // By default, it builds along Z axis, centered.
    const cylinder = m.Manifold.cylinder(height, radius, radius, 32, true);
    // Three.js Cylinder is along Y axis, let's rotate Manifold to match Three.js if needed,
    // or just keep it as is. We'll rotate it to match Y-up of Three.js.
    return cylinder.rotate([-90, 0, 0]);
  }
};

export const loadSTLToManifold = (buffer: ArrayBuffer): Manifold => {
  const m = getManifold();

  // Parse with STLLoader
  const loader = new STLLoader();
  const geometry = loader.parse(buffer);

  // Extract vertices and indices to build Manifold mesh
  const positionAttribute = geometry.getAttribute('position');
  const indexAttribute = geometry.getIndex();

  const numVertices = positionAttribute.count;
  const vertices = new Float32Array(numVertices * 3);
  for (let i = 0; i < numVertices; i++) {
    vertices[i * 3] = positionAttribute.getX(i);
    vertices[i * 3 + 1] = positionAttribute.getY(i);
    vertices[i * 3 + 2] = positionAttribute.getZ(i);
  }

  let indices: Uint32Array;

  if (indexAttribute) {
    indices = new Uint32Array(indexAttribute.count);
    for (let i = 0; i < indexAttribute.count; i++) {
      indices[i] = indexAttribute.getX(i);
    }
  } else {
    // Non-indexed geometry
    indices = new Uint32Array(numVertices);
    for (let i = 0; i < numVertices; i++) {
      indices[i] = i;
    }
  }

  // Create Manifold mesh
  const mesh = new m.Mesh({
    numProp: 3,
    vertProperties: vertices,
    triVerts: indices,
  });

  const manifold = new m.Manifold(mesh);

  // TS typings may not have delete() but the underlying object should
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (mesh as any).delete === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mesh as any).delete();
  }

  return manifold;
};

export const computeFluidDomain = (domain: Manifold, target: Manifold | null): Manifold => {
  if (!target) return domain;

  // Boolean difference: Domain - Target
  const result = domain.subtract(target);
  return result;
};
