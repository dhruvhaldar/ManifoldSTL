"use client";

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

function ComputedGeometry() {
  const { manifoldResult } = useStore();

  const geometry = useMemo(() => {
    if (!manifoldResult) {
      return null;
    }

    // Convert Manifold result back to Three.js BufferGeometry for visualization
    // We treat manifoldResult as any here locally since it comes from unknown in store
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mesh = (manifoldResult as any).getMesh();

    const geom = new THREE.BufferGeometry();

    // We have 3 properties (x, y, z) per vertex
    const vertices = new Float32Array(mesh.vertProperties);
    const indices = new Uint32Array(mesh.triVerts);

    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    geom.computeVertexNormals();

    return geom;
  }, [manifoldResult]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#4a90e2"
        wireframe={true}
        transparent={true}
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function Viewport() {
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [20, 20, 20], fov: 50 }}>
        <color attach="background" args={['transparent']} />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* Environment for reflections if solid mode is added later */}
        <Environment preset="city" />

        {/* The Computed Manifold Geometry */}
        <ComputedGeometry />

        {/* Controls and Helpers */}
        <OrbitControls makeDefault />
        <Grid
          infiniteGrid
          fadeDistance={50}
          fadeStrength={5}
          cellColor="#ffffff"
          sectionColor="#ffffff"
          cellThickness={0.5}
          sectionThickness={1}
        />
        <axesHelper args={[10]} />
      </Canvas>
    </div>
  );
}
