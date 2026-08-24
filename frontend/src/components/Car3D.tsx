import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

function EVModel() {
  const carGroup = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Mesh[]>([]);

  // Rotate the car slowly on the Y axis and spin wheels
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (carGroup.current) {
      carGroup.current.rotation.y = elapsed * 0.15;
    }
    wheelsRef.current.forEach((wheel) => {
      if (wheel) {
        wheel.rotation.x = elapsed * 1.5;
      }
    });
  });

  const setWheelRef = (el: THREE.Mesh | null, index: number) => {
    if (el) wheelsRef.current[index] = el;
  };

  return (
    <group ref={carGroup} position={[0, 0.4, 0]}>
      {/* 3D EV Car Body */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[2, 0.5, 1]} />
        <meshStandardMaterial color="#0ea5e9" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Car Cabin */}
      <mesh position={[-0.2, 0.55, 0]}>
        <boxGeometry args={[1, 0.4, 0.8]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.6} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Battery Indicator / Neon Charge Ring on the Roof */}
      <mesh position={[-0.2, 0.76, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.04, 8, 32]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>

      {/* Front Headlights */}
      <mesh position={[0.98, 0.15, 0.3]}>
        <boxGeometry args={[0.05, 0.1, 0.2]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
      <mesh position={[0.98, 0.15, -0.3]}>
        <boxGeometry args={[0.05, 0.1, 0.2]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>

      {/* Wheels */}
      {/* Front Left */}
      <mesh ref={(el) => setWheelRef(el, 0)} position={[0.6, 0, 0.55]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      {/* Front Right */}
      <mesh ref={(el) => setWheelRef(el, 1)} position={[0.6, 0, -0.55]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      {/* Back Left */}
      <mesh ref={(el) => setWheelRef(el, 2)} position={[-0.6, 0, 0.55]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      {/* Back Right */}
      <mesh ref={(el) => setWheelRef(el, 3)} position={[-0.6, 0, -0.55]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
    </group>
  );
}

function ChargingRing() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (ringRef.current) {
      // Pulse size and rotate
      const scale = 1 + Math.sin(elapsed * 2) * 0.05;
      ringRef.current.scale.set(scale, scale, 1);
      ringRef.current.rotation.z = -elapsed * 0.5;
    }
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <ringGeometry args={[1.5, 1.7, 64]} />
      <meshBasicMaterial color="#10b981" side={THREE.DoubleSide} transparent opacity={0.65} />
    </mesh>
  );
}

export default function Car3D() {
  return (
    <div className="w-full h-80 md:h-[450px] relative overflow-hidden rounded-2xl bg-slate-900/40 border border-slate-800">
      <Canvas camera={{ position: [3, 2, 4], fov: 40 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 10, 5]} intensity={2.5} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={1.5} color="#06b6d4" />
        <pointLight position={[0, 2, 0]} intensity={2} color="#10b981" />

        <EVModel />
        <ChargingRing />

        <Grid
          position={[0, 0, 0]}
          args={[10, 10]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#334155"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#0ea5e9"
          fadeDistance={30}
          infiniteGrid
        />

        <OrbitControls enableZoom={false} maxPolarAngle={Math.PI / 2 - 0.05} minPolarAngle={0.2} />
      </Canvas>
    </div>
  );
}
