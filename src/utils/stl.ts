export type STLAnalysis = {
  format: 'ascii' | 'binary';
  triangleCount: number;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
};

const parseAsciiSTL = (source: string): STLAnalysis => {
  const vertexRegex = /^\s*vertex\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)/gm;

  let match: RegExpExecArray | null;
  let vertexCount = 0;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  while ((match = vertexRegex.exec(source)) !== null) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    const z = Number(match[3]);

    min[0] = Math.min(min[0], x);
    min[1] = Math.min(min[1], y);
    min[2] = Math.min(min[2], z);

    max[0] = Math.max(max[0], x);
    max[1] = Math.max(max[1], y);
    max[2] = Math.max(max[2], z);

    vertexCount += 1;
  }

  if (vertexCount === 0 || vertexCount % 3 !== 0) {
    throw new Error('Invalid ASCII STL: malformed vertex data.');
  }

  return {
    format: 'ascii',
    triangleCount: vertexCount / 3,
    boundingBox: { min, max },
  };
};

const parseBinarySTL = (bytes: Uint8Array): STLAnalysis => {
  if (bytes.byteLength < 84) {
    throw new Error('Invalid binary STL: file too small.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangleCount = view.getUint32(80, true);
  const expectedLength = 84 + triangleCount * 50;

  if (expectedLength !== bytes.byteLength) {
    throw new Error('Invalid binary STL: triangle count and file size mismatch.');
  }

  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  let offset = 84;
  for (let tri = 0; tri < triangleCount; tri += 1) {
    offset += 12;

    for (let vertex = 0; vertex < 3; vertex += 1) {
      const x = view.getFloat32(offset, true); offset += 4;
      const y = view.getFloat32(offset, true); offset += 4;
      const z = view.getFloat32(offset, true); offset += 4;

      min[0] = Math.min(min[0], x);
      min[1] = Math.min(min[1], y);
      min[2] = Math.min(min[2], z);

      max[0] = Math.max(max[0], x);
      max[1] = Math.max(max[1], y);
      max[2] = Math.max(max[2], z);
    }

    offset += 2;
  }

  return {
    format: 'binary',
    triangleCount,
    boundingBox: { min, max },
  };
};

export const analyzeSTL = (bytes: Uint8Array): STLAnalysis => {
  const asText = new TextDecoder().decode(bytes);
  const looksLikeAscii = /^\s*solid\b/i.test(asText) && /\n\s*facet\s+normal\s+/i.test(asText);

  if (looksLikeAscii) {
    try {
      return parseAsciiSTL(asText);
    } catch {
      return parseBinarySTL(bytes);
    }
  }

  try {
    return parseBinarySTL(bytes);
  } catch {
    return parseAsciiSTL(asText);
  }
};
