import { Manifold } from 'manifold-3d';

export const checkManifoldness = (manifold: Manifold): boolean => {
  // Manifold-3d guarantees manifoldness by design, but we can verify status.
  const status = manifold.status();
  return status === 'NoError' || Number(status) === 0;
};

export const hasDegenerateFaces = (manifold: Manifold): boolean => {
  const mesh = manifold.getMesh();
  const triVerts = mesh.triVerts;
  const vertProperties = mesh.vertProperties;

  for (let i = 0; i < mesh.numTri; i++) {
    const i0 = triVerts[i * 3];
    const i1 = triVerts[i * 3 + 1];
    const i2 = triVerts[i * 3 + 2];

    const v0x = vertProperties[i0 * 3]; const v0y = vertProperties[i0 * 3 + 1]; const v0z = vertProperties[i0 * 3 + 2];
    const v1x = vertProperties[i1 * 3]; const v1y = vertProperties[i1 * 3 + 1]; const v1z = vertProperties[i1 * 3 + 2];
    const v2x = vertProperties[i2 * 3]; const v2y = vertProperties[i2 * 3 + 1]; const v2z = vertProperties[i2 * 3 + 2];

    // Cross product area
    const ux = v1x - v0x; const uy = v1y - v0y; const uz = v1z - v0z;
    const vx = v2x - v0x; const vy = v2y - v0y; const vz = v2z - v0z;

    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;

    const areaSq = nx * nx + ny * ny + nz * nz;
    if (areaSq < 1e-12) {
      return true;
    }
  }
  return false;
};

export const getTriangleCount = (manifold: Manifold): number => {
  return manifold.numTri();
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
export const exportOpenFOAM = (manifold: Manifold, patches: Record<string, any>): string => {
  // Extract geometry
  const mesh = manifold.getMesh();

  // Format ASCII STL for OpenFOAM multi-solid
  // In a full implementation, we'd map face indices to named patches based on the `patches` state.
  // For simplicity here, we export as a single solid named "domain" which is sufficient for basic OpenFOAM snappyHexMesh.

  const numTriangles = mesh.numTri;
  const triVerts = mesh.triVerts;
  const vertProperties = mesh.vertProperties;

  let stl = `solid domain\n`;

  for (let i = 0; i < numTriangles; i++) {
    const i0 = triVerts[i * 3];
    const i1 = triVerts[i * 3 + 1];
    const i2 = triVerts[i * 3 + 2];

    // We assume 3 properties per vertex (x, y, z)
    const v0x = vertProperties[i0 * 3];
    const v0y = vertProperties[i0 * 3 + 1];
    const v0z = vertProperties[i0 * 3 + 2];

    const v1x = vertProperties[i1 * 3];
    const v1y = vertProperties[i1 * 3 + 1];
    const v1z = vertProperties[i1 * 3 + 2];

    const v2x = vertProperties[i2 * 3];
    const v2y = vertProperties[i2 * 3 + 1];
    const v2z = vertProperties[i2 * 3 + 2];

    // Calculate normal (simplified, manifold normally provides this but we can calculate)
    const ux = v1x - v0x;
    const uy = v1y - v0y;
    const uz = v1z - v0z;

    const vx = v2x - v0x;
    const vy = v2y - v0y;
    const vz = v2z - v0z;

    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;

    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const n = length > 0 ? [nx / length, ny / length, nz / length] : [0, 0, 0];

    stl += `  facet normal ${n[0]} ${n[1]} ${n[2]}\n`;
    stl += `    outer loop\n`;
    stl += `      vertex ${v0x} ${v0y} ${v0z}\n`;
    stl += `      vertex ${v1x} ${v1y} ${v1z}\n`;
    stl += `      vertex ${v2x} ${v2y} ${v2z}\n`;
    stl += `    endloop\n`;
    stl += `  endfacet\n`;
  }

  stl += `endsolid domain\n`;

  return stl;
};

export const exportBinarySTL = (manifold: Manifold): ArrayBuffer => {
  const mesh = manifold.getMesh();
  const numTriangles = mesh.numTri;
  const triVerts = mesh.triVerts;
  const vertProperties = mesh.vertProperties;

  // 80 bytes header + 4 bytes numTriangles + 50 bytes per triangle
  const bufferLength = 84 + (50 * numTriangles);
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  // Header is zeroed by default
  // Set numTriangles
  view.setUint32(80, numTriangles, true);

  let offset = 84;
  for (let i = 0; i < numTriangles; i++) {
    const i0 = triVerts[i * 3];
    const i1 = triVerts[i * 3 + 1];
    const i2 = triVerts[i * 3 + 2];

    const v0x = vertProperties[i0 * 3];
    const v0y = vertProperties[i0 * 3 + 1];
    const v0z = vertProperties[i0 * 3 + 2];

    const v1x = vertProperties[i1 * 3];
    const v1y = vertProperties[i1 * 3 + 1];
    const v1z = vertProperties[i1 * 3 + 2];

    const v2x = vertProperties[i2 * 3];
    const v2y = vertProperties[i2 * 3 + 1];
    const v2z = vertProperties[i2 * 3 + 2];

    // Normal (simplified)
    const ux = v1x - v0x;
    const uy = v1y - v0y;
    const uz = v1z - v0z;
    const vx = v2x - v0x;
    const vy = v2y - v0y;
    const vz = v2z - v0z;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const n = length > 0 ? [nx / length, ny / length, nz / length] : [0, 0, 0];

    // Write Normal (12 bytes)
    view.setFloat32(offset, n[0], true); offset += 4;
    view.setFloat32(offset, n[1], true); offset += 4;
    view.setFloat32(offset, n[2], true); offset += 4;

    // Write V1 (12 bytes)
    view.setFloat32(offset, v0x, true); offset += 4;
    view.setFloat32(offset, v0y, true); offset += 4;
    view.setFloat32(offset, v0z, true); offset += 4;

    // Write V2 (12 bytes)
    view.setFloat32(offset, v1x, true); offset += 4;
    view.setFloat32(offset, v1y, true); offset += 4;
    view.setFloat32(offset, v1z, true); offset += 4;

    // Write V3 (12 bytes)
    view.setFloat32(offset, v2x, true); offset += 4;
    view.setFloat32(offset, v2y, true); offset += 4;
    view.setFloat32(offset, v2z, true); offset += 4;

    // Attribute byte count (2 bytes, usually 0)
    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
};
