import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';

function ShockwaveRing({ delay }: { delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    // Calculate a cycle time offset by delay
    const time = (elapsed + delay) % 2.5;
    const scale = time * 2.2;
    const opacity = Math.max(0, 1 - time / 2.5);

    if (meshRef.current) {
      meshRef.current.scale.set(scale, scale, 1);
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = opacity;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <ringGeometry args={[0.9, 1.0, 32]} />
      <meshBasicMaterial color="#f43f5e" side={THREE.DoubleSide} transparent opacity={1} />
    </mesh>
  );
}

function CenterCore() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (meshRef.current) {
      const pulse = 1 + Math.sin(elapsed * 10) * 0.1;
      meshRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0.1, 0]}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshBasicMaterial color="#f43f5e" />
    </mesh>
  );
}

export default function Pulse3D() {
  return (
    <div className="w-full h-full absolute inset-0 z-0 bg-slate-950/70">
      <Canvas camera={{ position: [0, 5, 6], fov: 45 }}>
        <ambientLight intensity={1.5} />
        
        <CenterCore />
        <ShockwaveRing delay={0} />
        <ShockwaveRing delay={0.8} />
        <ShockwaveRing delay={1.6} />

        <Grid
          position={[0, 0, 0]}
          args={[12, 12]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#334155"
          sectionSize={2.5}
          sectionThickness={1}
          sectionColor="#f43f5e"
          fadeDistance={25}
          infiniteGrid
        />
      </Canvas>
    </div>
  );
}
