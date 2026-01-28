'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, Center } from '@react-three/drei';
import * as THREE from 'three';

function AircraftModel({ pitch, roll, yaw }: { pitch: number; roll: number; yaw: number }) {
  const airplaneRef = useRef<THREE.Group>(null!);
  const elevatorRef = useRef<THREE.Mesh>(null!);
  const leftAileronRef = useRef<THREE.Mesh>(null!);
  const rightAileronRef = useRef<THREE.Mesh>(null!);
  const rudderRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    // 1. Rotate the whole plane (Primary Effect)
    // Adjusting axes: pitch is X, roll is Z, yaw is Y
    airplaneRef.current.rotation.x = THREE.MathUtils.lerp(airplaneRef.current.rotation.x, pitch * 0.4, 0.1);
    airplaneRef.current.rotation.z = THREE.MathUtils.lerp(airplaneRef.current.rotation.z, -roll * 0.4, 0.1);
    airplaneRef.current.rotation.y = THREE.MathUtils.lerp(airplaneRef.current.rotation.y, -yaw * 0.4, 0.1);

    // 2. Deflect the surfaces (The "Visual Input")
    elevatorRef.current.rotation.x = pitch * 0.8;
    leftAileronRef.current.rotation.x = -roll * 0.8;
    rightAileronRef.current.rotation.x = roll * 0.8;
    rudderRef.current.rotation.y = yaw * 0.8;
  });

  return (
    <group ref={airplaneRef}>
      <Center>
        {/* FUSELAGE */}
        <mesh>
          <capsuleGeometry args={[0.3, 3, 4, 16]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        
        {/* WING */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.8, 0.05, 5]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>

        {/* AILERONS (Blue) */}
        <mesh ref={leftAileronRef} position={[-0.3, 0.2, 2.0]}>
          <boxGeometry args={[0.2, 0.05, 1]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        <mesh ref={rightAileronRef} position={[-0.3, 0.2, -2.0]}>
          <boxGeometry args={[0.2, 0.05, 1]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>

        {/* ELEVATOR (Orange) */}
        <mesh ref={elevatorRef} position={[-1.7, 0, 0]}>
          <boxGeometry args={[0.4, 0.05, 1.5]} />
          <meshStandardMaterial color="#f97316" />
        </mesh>

        {/* RUDDER (Red) */}
        <mesh ref={rudderRef} position={[-1.7, 0.4, 0]}>
          <boxGeometry args={[0.4, 0.8, 0.05]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      </Center>
    </group>
  );
}

export default function FlightSim() {
  const [controls, setControls] = React.useState({ pitch: 0, roll: 0, yaw: 0 });

  return (
    <div className="w-full h-[600px] flex flex-col md:flex-row bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
      {/* 3D VIEWPORT */}
      <div className="flex-1 relative bg-slate-900">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[5, 4, 5]} fov={50} />
          <OrbitControls enablePan={false} maxDistance={10} minDistance={3} />
          
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <Environment preset="night" />
          <Grid infiniteGrid fadeDistance={20} sectionColor="#1e293b" cellColor="#334155" />

          <Suspense fallback={null}>
            <AircraftModel {...controls} />
          </Suspense>
        </Canvas>
        
        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <div className="text-xs font-mono text-blue-400 bg-black/40 p-2 rounded">
            AXIS_LOCK: ENABLED<br/>
            COORD_MODE: OFF
          </div>
        </div>
      </div>

      {/* CONTROL UI */}
      <div className="w-full md:w-72 p-6 bg-slate-900 border-l border-slate-800 space-y-6">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">Flight Controls</h2>
        
        {['pitch', 'roll', 'yaw'].map((axis) => (
          <div key={axis} className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
              <span>{axis}</span>
              <span className="text-blue-400">{controls[axis as keyof typeof controls]}</span>
            </div>
            <input 
              type="range" min="-0.6" max="0.6" step="0.01" 
              value={controls[axis as keyof typeof controls]}
              onChange={(e) => setControls(prev => ({...prev, [axis]: parseFloat(e.target.value)}))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        ))}

        <button 
          onClick={() => setControls({ pitch: 0, roll: 0, yaw: 0 })}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg border border-slate-700 transition-all"
        >
          RESET TO NEUTRAL
        </button>
      </div>
    </div>
  );
}