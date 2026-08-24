import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, Grid } from '@react-three/drei';
import * as THREE from 'three';

function MovingProvider({ progress }: { progress: number }) {
  const providerRef = useRef<THREE.Group>(null);

  // Position starts at [3, 0.2, 3] and moves to [0, 0.2, 0] as progress goes 0 -> 1
  const startPos = new THREE.Vector3(3, 0.25, 3);
  const endPos = new THREE.Vector3(0, 0.25, 0);

  useFrame((state) => {
    const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, progress);
    if (providerRef.current) {
      providerRef.current.position.copy(currentPos);
      // Spin beacon light
      const elapsed = state.clock.getElapsedTime();
      const beacon = providerRef.current.getObjectByName('beacon');
      if (beacon) {
        beacon.rotation.y = elapsed * 10;
      }
    }
  });

  return (
    <group ref={providerRef}>
      {/* Provider truck cabin body */}
      <mesh>
        <boxGeometry args={[0.5, 0.4, 0.4]} />
        <meshStandardMaterial color="#10b981" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Charger unit on back */}
      <mesh position={[-0.2, 0.2, 0]}>
        <boxGeometry args={[0.3, 0.4, 0.3]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Beacon beacon light */}
      <group name="beacon" position={[0.1, 0.25, 0]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 8]} />
          <meshBasicMaterial color="#0ea5e9" />
        </mesh>
      </group>
    </group>
  );
}

function StrandedUser() {
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (coreRef.current) {
      const scale = 1 + Math.sin(elapsed * 5) * 0.15;
      coreRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={[0, 0.25, 0]}>
      {/* Stranded EV representation */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#f43f5e" />
      </mesh>
      {/* Pulsing ring around user */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.45, 32]} />
        <meshBasicMaterial color="#f43f5e" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

export default function Minimap3D({ status, distanceKm }: { status: string; distanceKm: number }) {
  // Determine progression progress based on request status
  let progress = 0;
  if (status === 'accepted') progress = 0.15;
  else if (status === 'en_route') progress = 0.5;
  else if (status === 'arrived') progress = 0.9;
  else if (status === 'servicing' || status === 'completed') progress = 1.0;

  // Let distance further refine en_route progress if available (e.g. closer distance = higher progress)
  if (status === 'en_route') {
    // assume starting distance is roughly 10km max
    const ratio = Math.max(0, Math.min(1, (10 - distanceKm) / 10));
    progress = 0.2 + ratio * 0.6; // caps between 0.2 and 0.8
  }

  // Draw guidance path lines from provider start position to user
  const pathPoints: [number, number, number][] = [
    [3, 0.05, 3],
    [1.5, 0.05, 2.5],
    [0.5, 0.05, 1.2],
    [0, 0.05, 0]
  ];

  return (
    <div className="w-full h-44 rounded-xl relative overflow-hidden bg-slate-900 border border-slate-800 neon-glow-cyan">
      <div className="absolute top-2 left-2 z-10 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider text-cyan-400 border border-cyan-500/20">
        3D Live Minimap
      </div>

      <Canvas camera={{ position: [4, 4, 4], fov: 38 }} dpr={[1, 1.2]}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 5, 3]} intensity={2} />

        <StrandedUser />
        <MovingProvider progress={progress} />

        <Line
          points={pathPoints}
          color="#0ea5e9"
          lineWidth={2}
          dashed
          dashSize={0.2}
          gapSize={0.1}
        />

        <Grid
          position={[0, 0, 0]}
          args={[8, 8]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#334155"
          sectionSize={2}
          sectionThickness={0.8}
          sectionColor="#0ea5e9"
          fadeDistance={15}
          infiniteGrid
        />
      </Canvas>
    </div>
  );
}
