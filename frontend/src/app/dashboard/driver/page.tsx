'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Navigation, Activity, ShieldAlert, Thermometer, Wind, CloudRain, RadioTower, Database, Map, CheckCircle, AlertTriangle, Fingerprint, Battery, Settings, Users, Truck, HeartPulse, Video, Radio, Building2 } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PointMaterial, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import io from 'socket.io-client';
import CyberAmbulance from '@/components/CyberAmbulance';

const socket = io('http://localhost:5005');

// ---------------------------------------------------------
// 3D CITY ENVIRONMENT
// ---------------------------------------------------------

function CityBuildings({ isEmergency }: { isEmergency: boolean }) {
  const buildingCount = 200;
  const [positions, scales] = useMemo(() => {
    const pos = new Float32Array(buildingCount * 3);
    const scl = new Float32Array(buildingCount * 3);
    let i = 0;
    for (let x = -15; x < 15; x += 2) {
      for (let z = -15; z < 15; z += 2) {
        if (Math.abs(x) < 2 || Math.abs(z) < 2) continue;
        if (i >= buildingCount) break;
        const height = Math.random() * 4 + 1;
        pos[i * 3] = x + (Math.random() * 0.5 - 0.25);
        pos[i * 3 + 1] = height / 2;
        pos[i * 3 + 2] = z + (Math.random() * 0.5 - 0.25);
        scl[i * 3] = 1.2; scl[i * 3 + 1] = height; scl[i * 3 + 2] = 1.2;
        i++;
      }
    }
    return [pos.slice(0, i * 3), scl.slice(0, i * 3)];
  }, []);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const baseColor = new THREE.Color('#050e1d');
  const emergencyColor = new THREE.Color('#1a0404');

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.material.color.lerp(isEmergency ? emergencyColor : baseColor, 0.05);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length / 3]}>
      <boxGeometry>
        <instancedBufferAttribute attach="attributes-offset" args={[positions, 3]} />
      </boxGeometry>
      <meshStandardMaterial 
        color="#050e1d" emissive="#02050a" emissiveIntensity={0.5} 
        transparent opacity={0.6} roughness={0.4} metalness={0.8} 
        wireframe={!isEmergency}
      />
    </instancedMesh>
  );
}

function EmergencyRoute({ isEmergency }: { isEmergency: boolean }) {
  const points = [
    new THREE.Vector3(-10, 0.1, -1.5),
    new THREE.Vector3(0, 0.1, -1.5),
    new THREE.Vector3(0, 0.1, 10),
  ];

  return (
    <group>
      <Line points={points} color={isEmergency ? "#ff3131" : "#00c2ff"} lineWidth={3} dashed={true} dashSize={0.5} dashScale={2} opacity={0.3} transparent />
      {isEmergency && <Line points={points} color="#ff3131" lineWidth={10} opacity={0.2} transparent />}
    </group>
  );
}



function TacticalMapScene({ isEmergency }: { isEmergency: boolean }) {
  useFrame(({ camera }) => {
    // Idle camera zooms in tight on holographic ambulance, Emergency camera zooms out for top-down route view
    const targetPos = isEmergency ? new THREE.Vector3(-2, 10, 5) : new THREE.Vector3(-14, 3, 2);
    const targetLookAt = isEmergency ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(-10, 0.5, -1.5);
    
    camera.position.lerp(targetPos, 0.03);
    const currentLookAt = new THREE.Vector3(0,0,0).applyQuaternion(camera.quaternion);
    const newLookAt = currentLookAt.lerp(targetLookAt.clone().sub(camera.position).normalize(), 0.03);
    camera.lookAt(camera.position.clone().add(newLookAt));
  });

  const path = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-10, 0.25, -1.5), new THREE.Vector3(-2, 0.25, -1.5),
    new THREE.Vector3(0, 0.25, -1.5), new THREE.Vector3(0, 0.25, 0),
    new THREE.Vector3(0, 0.25, 8), new THREE.Vector3(0, 0.25, 10),
  ]), []);

  return (
    <>
      <color attach="background" args={['#03050a']} />
      <fog attach="fog" args={['#03050a', isEmergency ? 15 : 5, isEmergency ? 30 : 15]} />
      <ambientLight intensity={0.2} color="#ffffff" />
      <directionalLight position={[10, 20, 5]} intensity={0.5} color="#00c2ff" />
      
      <gridHelper args={[50, 50, isEmergency ? '#ff3131' : '#00c2ff', isEmergency ? '#ff3131' : '#00c2ff']} position={[0, 0, 0]} material-opacity={0.1} material-transparent />
      
      <CityBuildings isEmergency={isEmergency} />
      <EmergencyRoute isEmergency={isEmergency} />
      <CyberAmbulance 
         isEmergency={isEmergency} 
         isIdle={!isEmergency} 
         path={path} 
         speed={0.1} 
         initialPosition={[-10, 0, -1.5]} 
         showHologram={true}
      />
    </>
  );
}

// ---------------------------------------------------------
// UI COMPONENTS
// ---------------------------------------------------------

function HolographicPanel({ children, title, icon, glowing = false, className = "" }: any) {
  return (
    <div className={`relative rounded-xl overflow-hidden backdrop-blur-md border border-white/10 bg-[#060b14]/80 shadow-2xl transition-all duration-500 ${glowing ? 'border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : ''} ${className}`}>
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 bg-white/5">
        <div className={`p-1.5 rounded-lg ${glowing ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-400'}`}>
          {icon}
        </div>
        <h3 className="font-bold text-white tracking-widest uppercase text-[10px]">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function DriverDashboard() {
  const [isEmergency, setIsEmergency] = useState(false);
  const [activationPhase, setActivationPhase] = useState<'IDLE' | 'BIOMETRIC' | 'ACTIVE'>('IDLE');
  const [time, setTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + now.getMilliseconds().toString().padStart(3, '0'));
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const handleActivation = () => {
    if (activationPhase === 'IDLE') {
      setActivationPhase('BIOMETRIC');
      setTimeout(() => {
        setActivationPhase('ACTIVE');
        setIsEmergency(true);
        socket.emit('start_emergency', { unit: 'Unit 42', location: 'Central Hospital Base', eta: '08:45 MIN' });
      }, 2000); // 2 sec biometric scan
    } else if (activationPhase === 'ACTIVE') {
      setActivationPhase('IDLE');
      setIsEmergency(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#03050a] relative overflow-hidden font-sans selection:bg-blue-500/30 text-white">
      
      {/* 3D Map Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [-14, 3, 2], fov: 45 }}>
          <TacticalMapScene isEmergency={isEmergency} />
        </Canvas>
      </div>

      {/* Global Vignette */}
      <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />

      {/* Top HUD */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-start pointer-events-none">
        <div className="flex gap-4">
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
            <RadioTower className={`w-4 h-4 ${isEmergency ? 'text-red-500 animate-pulse' : 'text-green-500'}`} />
            <span className="text-white/80 text-xs font-mono tracking-widest uppercase">{isEmergency ? 'TACTICAL UPLINK' : 'Uplink Stable'}</span>
          </div>
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
            <Database className="w-4 h-4 text-blue-500" />
            <span className="text-white/80 text-xs font-mono tracking-widest">{time}</span>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 flex items-center gap-4">
            <div className="flex items-center gap-2"><Thermometer className="w-3 h-3 text-red-400" /><span className="text-white text-xs font-mono">24°C</span></div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2"><Wind className="w-3 h-3 text-blue-400" /><span className="text-white text-xs font-mono">12 km/h</span></div>
          </div>
        </div>
      </div>

      {/* Left Panel: Mission Readiness & Control */}
      <div className="absolute top-24 left-6 w-[380px] z-20 flex flex-col gap-5 h-[calc(100vh-120px)] overflow-y-auto pr-2 custom-scrollbar">
        
        <HolographicPanel title="Vehicle Diagnostics & Crew" icon={<Settings className="w-4 h-4" />}>
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
            <div className="w-12 h-12 rounded-full border border-blue-500/30 bg-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-widest">Lead Paramedic</p>
              <h3 className="text-sm font-bold text-white">Cmdr. J. Harrison</h3>
              <p className="text-[9px] text-green-400 font-mono mt-0.5">BIOMETRICS VERIFIED</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[9px] text-white/50 uppercase tracking-widest mb-1.5">
                <span>Power Cell / Fuel</span>
                <span className="text-green-400">92%</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-green-500 w-[92%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[9px] text-white/50 uppercase tracking-widest mb-1.5">
                <span>Medical Equipment Auth</span>
                <span className="text-blue-400">100% READY</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-blue-500 w-[100%]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
               <div className="bg-black/40 border border-white/5 p-2 rounded text-center">
                 <p className="text-[8px] text-white/40 uppercase mb-1">Engine Status</p>
                 <p className="text-xs font-mono text-white">IDLE SECURE</p>
               </div>
               <div className="bg-black/40 border border-white/5 p-2 rounded text-center">
                 <p className="text-[8px] text-white/40 uppercase mb-1">Last Maintenance</p>
                 <p className="text-xs font-mono text-white">04:00 HRS</p>
               </div>
            </div>
          </div>
        </HolographicPanel>

        {/* Dynamic Activation Button */}
        <div className="relative mt-2 pointer-events-auto">
          {activationPhase === 'IDLE' && (
             <div className="absolute -top-4 left-0 w-full text-center pointer-events-none">
               <span className="bg-[#03050a] px-2 text-[9px] text-blue-400 font-bold uppercase tracking-[0.2em] animate-pulse">Awaiting Emergency Dispatch</span>
             </div>
          )}
          <button
            onClick={handleActivation}
            disabled={activationPhase === 'BIOMETRIC'}
            className={`w-full relative rounded-xl font-black text-sm tracking-widest uppercase transition-all duration-500 overflow-hidden group
              ${activationPhase === 'IDLE' ? 'bg-red-600/90 hover:bg-red-500 py-6 text-white shadow-[0_0_30px_rgba(220,38,38,0.3)] border border-red-500/50' : 
                activationPhase === 'BIOMETRIC' ? 'bg-blue-900/80 py-6 text-blue-400 border border-blue-500/50' : 
                'bg-red-950/80 hover:bg-red-900 py-4 text-red-500 border border-red-500 shadow-[inset_0_0_20px_rgba(220,38,38,0.2)]'
              }`}
          >
            {activationPhase === 'IDLE' && (
              <>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                  INITIATE EMERGENCY RESPONSE
                </span>
                <div className="absolute -inset-1 bg-red-500/20 blur-lg rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
              </>
            )}

            {activationPhase === 'BIOMETRIC' && (
              <span className="relative z-10 flex items-center justify-center gap-3">
                <Fingerprint className="w-6 h-6 animate-[spin_3s_linear_infinite]" />
                SCANNING BIOMETRICS...
              </span>
            )}

            {activationPhase === 'ACTIVE' && (
              <span className="relative z-10 flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4" /> ABORT EMERGENCY OVERRIDE
              </span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {activationPhase === 'ACTIVE' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-5 mt-2">
              <HolographicPanel title="AI Route Optimization" icon={<Navigation className="w-4 h-4" />} glowing>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded bg-black/40 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30"><Map className="w-4 h-4 text-blue-400" /></div>
                      <div>
                        <p className="text-[9px] text-white/50 uppercase tracking-widest">Destination</p>
                        <p className="text-xs font-bold text-white">City General Trauma Center</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                      <p className="text-[9px] text-white/50 uppercase tracking-widest mb-1">Est. Distance</p>
                      <p className="text-lg font-bold text-white font-mono">4.2<span className="text-[10px] text-white/50 ml-1">KM</span></p>
                    </div>
                    <div className="p-2 rounded bg-red-950/30 border border-red-500/30 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                      <p className="text-[9px] text-red-400/80 uppercase tracking-widest mb-1 relative z-10">Live ETA</p>
                      <p className="text-lg font-bold text-red-500 font-mono relative z-10">06:45<span className="text-[10px] text-red-400/50 ml-1">MIN</span></p>
                    </div>
                  </div>
                </div>
              </HolographicPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Panel: Hospital & Emergency Queue */}
      <div className="absolute top-24 right-6 w-[340px] z-20 flex flex-col gap-5 h-[calc(100vh-120px)] overflow-y-auto pr-2 custom-scrollbar pointer-events-auto">
        
        <HolographicPanel title="Trauma Center Availability" icon={<Building2 className="w-4 h-4" />}>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-black/40 border border-white/5 flex justify-between items-center group cursor-pointer hover:border-blue-500/30 transition-colors">
              <div>
                <h4 className="text-xs font-bold text-white">City General Hospital</h4>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">2.4 KM AWAY</p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold border border-green-500/30">CAPACITY: GOOD</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-black/40 border border-white/5 flex justify-between items-center group cursor-pointer hover:border-blue-500/30 transition-colors">
              <div>
                <h4 className="text-xs font-bold text-white">Metro Central Med</h4>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">5.1 KM AWAY</p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[9px] font-bold border border-yellow-500/30">CAPACITY: MED</span>
              </div>
            </div>
          </div>
        </HolographicPanel>

        <HolographicPanel title="Dispatch Emergency Feed" icon={<Radio className="w-4 h-4" />}>
           <div className="text-[9px] text-white/60 font-mono uppercase tracking-widest space-y-2 relative h-32 overflow-hidden">
             <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-[#060b14]/80 to-transparent z-10" />
             <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#060b14]/80 to-transparent z-10" />
             <motion.div animate={{ y: [-50, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="space-y-2 pt-4">
               <p><span className="text-blue-400">[CMD]</span> Sector 9 clear. Awaiting dispatch.</p>
               <p><span className="text-red-400">[ALERT]</span> Multi-vehicle collision reported on I-95.</p>
               <p><span className="text-green-400">[SYS]</span> Ambulance 42 telemetry online.</p>
               <p><span className="text-yellow-400">[WARN]</span> Heavy civilian traffic near downtown block.</p>
               <p><span className="text-blue-400">[CMD]</span> Dispatching Unit 7 to Trauma Bay 1.</p>
               <p><span className="text-blue-400">[CMD]</span> Sector 9 clear. Awaiting dispatch.</p>
             </motion.div>
           </div>
        </HolographicPanel>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 0px; }
      `}} />
    </div>
  );
}
