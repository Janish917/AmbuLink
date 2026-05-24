'use client';

import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface CyberAmbulanceProps {
  isEmergency: boolean;
  isIdle?: boolean;
  path?: THREE.CatmullRomCurve3;
  speed?: number;
  initialPosition?: [number, number, number];
  scale?: number;
  showHologram?: boolean;
}

export default function CyberAmbulance({ 
  isEmergency, 
  isIdle = false, 
  path, 
  speed = 0.1, 
  initialPosition = [0, 0, 0],
  scale = 1,
  showHologram = false
}: CyberAmbulanceProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sirenLight1 = useRef<THREE.PointLight>(null);
  const sirenLight2 = useRef<THREE.PointLight>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);
  const haloRef = useRef<THREE.Group>(null);
  
  const [progress, setProgress] = useState(0);

  // Styling materials
  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#ffffff', roughness: 0.1, metalness: 0.6, transparent: true, opacity: isIdle && !isEmergency ? 0.8 : 1 
  }), [isIdle, isEmergency]);
  
  const glassMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#00c2ff', roughness: 0.0, metalness: 0.9, transparent: true, opacity: 0.8 
  }), []);
  
  const crossMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#ff3131', emissive: '#ff3131', emissiveIntensity: isEmergency ? 2 : 0.5 
  }), [isEmergency]);

  const wheelMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#111111', roughness: 0.9, metalness: 0.1 
  }), []);

  const headlightMaterial = useMemo(() => new THREE.MeshBasicMaterial({ 
    color: '#ffffff' 
  }), []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      if (!isIdle && path && isEmergency) {
        // Move along path
        setProgress((p) => { 
          const newP = p + delta * speed; 
          return newP > 1 ? 0 : newP; 
        });
        const pos = path.getPointAt(progress);
        groupRef.current.position.copy(pos);
        
        // Calculate tangent for lookAt
        const tangent = path.getTangentAt(progress);
        groupRef.current.lookAt(pos.clone().add(tangent));
        
        // Rotate wheels
        wheelRefs.current.forEach(wheel => {
          if (wheel) wheel.rotation.x += delta * speed * 20;
        });

      } else if (isIdle) {
        // Idle animation (spinning slowly)
        groupRef.current.position.set(initialPosition[0], initialPosition[1], initialPosition[2]);
        groupRef.current.rotation.y += delta * 0.5;
        
        // Reset wheels
        wheelRefs.current.forEach(wheel => {
          if (wheel) wheel.rotation.x = 0;
        });
      }

      // Flashing Sirens
      if (isEmergency && sirenLight1.current && sirenLight2.current) {
        const time = state.clock.elapsedTime * 10;
        sirenLight1.current.intensity = Math.sin(time) > 0 ? 5 : 0;
        sirenLight2.current.intensity = Math.cos(time) > 0 ? 5 : 0;
      }
    }

    // Holographic Halo
    if (haloRef.current && isIdle && !isEmergency) {
      haloRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
      haloRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={new THREE.Vector3(...initialPosition)} scale={scale}>
      
      {/* --- AMBULANCE MESH --- */}
      <group position={[0, 0.4, 0]}>
        
        {/* Main Rear Box (Patient Cabin) */}
        <mesh position={[0, 0.6, -0.4]} material={bodyMaterial}>
          <boxGeometry args={[1.1, 1.2, 1.6]} />
        </mesh>

        {/* Front Cab (Driver area) */}
        <mesh position={[0, 0.3, 0.7]} material={bodyMaterial}>
          <boxGeometry args={[1.0, 0.6, 0.8]} />
        </mesh>
        
        {/* Slanted Windshield */}
        <mesh position={[0, 0.7, 0.5]} rotation={[-Math.PI / 4, 0, 0]} material={glassMaterial}>
          <boxGeometry args={[0.9, 0.6, 0.05]} />
        </mesh>

        {/* Side Windows */}
        <mesh position={[0.51, 0.4, 0.7]} material={glassMaterial}>
          <boxGeometry args={[0.05, 0.3, 0.4]} />
        </mesh>
        <mesh position={[-0.51, 0.4, 0.7]} material={glassMaterial}>
          <boxGeometry args={[0.05, 0.3, 0.4]} />
        </mesh>

        {/* Front Bumper */}
        <mesh position={[0, 0.05, 1.15]} material={wheelMaterial}>
          <boxGeometry args={[1.1, 0.2, 0.2]} />
        </mesh>

        {/* Headlights */}
        {isEmergency && (
           <group position={[0, 0.3, 1.11]}>
             <pointLight color="#ffffff" intensity={2} distance={10} position={[0, 0, 1]} />
           </group>
        )}
        <mesh position={[0.4, 0.3, 1.11]} material={headlightMaterial}>
          <boxGeometry args={[0.2, 0.1, 0.05]} />
        </mesh>
        <mesh position={[-0.4, 0.3, 1.11]} material={headlightMaterial}>
          <boxGeometry args={[0.2, 0.1, 0.05]} />
        </mesh>

        {/* --- MEDICAL SYMBOLS --- */}
        {/* Roof Cross */}
        <group position={[0, 1.21, -0.4]}>
          <mesh material={crossMaterial}><boxGeometry args={[0.8, 0.05, 0.2]} /></mesh>
          <mesh material={crossMaterial}><boxGeometry args={[0.2, 0.05, 0.8]} /></mesh>
        </group>
        {/* Left Side Cross */}
        <group position={[0.56, 0.6, -0.4]} rotation={[0, 0, Math.PI/2]}>
          <mesh material={crossMaterial}><boxGeometry args={[0.5, 0.05, 0.15]} /></mesh>
          <mesh material={crossMaterial}><boxGeometry args={[0.15, 0.05, 0.5]} /></mesh>
        </group>
        {/* Right Side Cross */}
        <group position={[-0.56, 0.6, -0.4]} rotation={[0, 0, Math.PI/2]}>
          <mesh material={crossMaterial}><boxGeometry args={[0.5, 0.05, 0.15]} /></mesh>
          <mesh material={crossMaterial}><boxGeometry args={[0.15, 0.05, 0.5]} /></mesh>
        </group>

        {/* --- SIRENS (Lightbar) --- */}
        <group position={[0, 1.25, 0.3]}>
          {/* Lightbar Base */}
          <mesh material={wheelMaterial}><boxGeometry args={[0.9, 0.05, 0.2]} /></mesh>
          
          {/* Left Red Light */}
          <mesh position={[0.3, 0.05, 0]} material={new THREE.MeshBasicMaterial({ color: '#ff3131' })}>
            <boxGeometry args={[0.3, 0.1, 0.15]} />
          </mesh>
          {isEmergency && <pointLight ref={sirenLight1} color="#ff3131" position={[0.3, 0.2, 0]} distance={10} intensity={0} />}
          
          {/* Right Blue Light */}
          <mesh position={[-0.3, 0.05, 0]} material={new THREE.MeshBasicMaterial({ color: '#00c2ff' })}>
            <boxGeometry args={[0.3, 0.1, 0.15]} />
          </mesh>
          {isEmergency && <pointLight ref={sirenLight2} color="#00c2ff" position={[-0.3, 0.2, 0]} distance={10} intensity={0} />}
        </group>

        {/* Red Emergency Stripes */}
        <mesh position={[0, 0.2, -0.4]} material={crossMaterial}>
          <boxGeometry args={[1.12, 0.1, 1.6]} />
        </mesh>

        {/* --- WHEELS --- */}
        {[
          [0.55, -0.1, 0.7],  // Front Right
          [-0.55, -0.1, 0.7], // Front Left
          [0.55, -0.1, -0.8], // Rear Right
          [-0.55, -0.1, -0.8] // Rear Left
        ].map((pos, idx) => (
          <mesh key={idx} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]} material={wheelMaterial} ref={(el) => { if(el) wheelRefs.current[idx] = el; }}>
            <cylinderGeometry args={[0.25, 0.25, 0.15, 16]} />
            {/* Wheel rim accent */}
            <mesh position={[0, 0.08 * (idx % 2 === 0 ? 1 : -1), 0]}>
               <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
               <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.2} />
            </mesh>
          </mesh>
        ))}

      </group>

      {/* Holographic Idle Ring */}
      {isIdle && !isEmergency && (
        <group ref={haloRef} position={[0, 0.1, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.8, 2.0, 64]} />
            <meshBasicMaterial color="#00c2ff" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[2.2, 2.25, 64]} />
            <meshBasicMaterial color="#00c2ff" transparent opacity={0.1} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* HTML Hologram Text for Dashboard */}
      {showHologram && isIdle && !isEmergency && (
        <Html position={[0, 2.5, 0]} center>
           <div className="bg-[#050b14]/80 border border-blue-500/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-mono text-blue-400 uppercase tracking-widest whitespace-nowrap shadow-[0_0_15px_rgba(0,194,255,0.3)]">
             <div className="flex items-center gap-2 mb-1">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               <span className="text-white font-bold">UNIT-42 READY</span>
             </div>
             <div>Diagnostics: Optimal</div>
           </div>
        </Html>
      )}
      
    </group>
  );
}
