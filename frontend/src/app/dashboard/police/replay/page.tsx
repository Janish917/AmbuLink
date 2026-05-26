'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Play, Pause, FastForward, Rewind, Activity, Clock, Navigation, History, FileText } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PointMaterial, Line } from '@react-three/drei';
import * as THREE from 'three';
import CyberAmbulance from '@/components/CyberAmbulance';

// --- 3D ENVIRONMENT ---
function HolographicCity({ activeRoute }: { activeRoute: boolean }) {
  const buildingCount = 300;
  const [positions, scales] = useMemo(() => {
    const pos = new Float32Array(buildingCount * 3);
    const scl = new Float32Array(buildingCount * 3);
    let i = 0;
    for (let x = -20; x < 20; x += 2.5) {
      for (let z = -20; z < 20; z += 2.5) {
        if (Math.abs(x) < 3 || Math.abs(z) < 3) continue; 
        if (i >= buildingCount) break;
        const height = Math.random() * 5 + 1;
        pos[i * 3] = x + (Math.random() * 1 - 0.5);
        pos[i * 3 + 1] = height / 2;
        pos[i * 3 + 2] = z + (Math.random() * 1 - 0.5);
        scl[i * 3] = 1.8; scl[i * 3 + 1] = height; scl[i * 3 + 2] = 1.8;
        i++;
      }
    }
    return [pos.slice(0, i * 3), scl.slice(0, i * 3)];
  }, []);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const color = new THREE.Color();
  const baseColor = new THREE.Color('#002b5c');
  const alertColor = new THREE.Color('#3b0a11');

  useFrame((state) => {
    if (meshRef.current) {
      const targetColor = activeRoute ? alertColor : baseColor;
      meshRef.current.material.color.lerp(targetColor, 0.05);
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length / 3]}>
        <boxGeometry>
          <instancedBufferAttribute attach="attributes-offset" args={[positions, 3]} />
        </boxGeometry>
        <meshBasicMaterial color="#00c2ff" wireframe transparent opacity={0.15} />
      </instancedMesh>
      <instancedMesh args={[undefined, undefined, positions.length / 3]}>
        <boxGeometry>
          <instancedBufferAttribute attach="attributes-offset" args={[positions, 3]} />
        </boxGeometry>
        <meshStandardMaterial color="#030b14" transparent opacity={0.8} roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

function TrafficCorridors({ activeRoute }: { activeRoute: boolean }) {
  const mainPath = [
    new THREE.Vector3(-15, 0.1, -1.5),
    new THREE.Vector3(0, 0.1, -1.5),
    new THREE.Vector3(0, 0.1, 15),
  ];
  return (
    <group>
      <Line points={mainPath} color={activeRoute ? "#22c55e" : "#00c2ff"} lineWidth={5} opacity={0.8} transparent />
      {activeRoute && <Line points={mainPath} color="#22c55e" lineWidth={15} opacity={0.2} transparent />}
    </group>
  );
}

function PlaybackMapScene({ activeRoute, progress }: { activeRoute: boolean, progress: number }) {
  useFrame(({ camera, pointer }) => {
    camera.position.lerp(new THREE.Vector3(pointer.x * 2 - 15, 20, pointer.y * 2 + 15), 0.05);
    camera.lookAt(0, 0, 0);
  });

  const path = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-15, 0.1, -1.5),
    new THREE.Vector3(0, 0.1, -1.5),
    new THREE.Vector3(0, 0.1, 15),
  ]), []);

  // Update ambulance based on slider progress instead of clock
  const [ambPos, setAmbPos] = useState<[number, number, number]>([-15, 0, -1.5]);
  const [ambRot, setAmbRot] = useState<THREE.Euler>(new THREE.Euler());

  useFrame(() => {
    if (path && progress !== undefined) {
      const pos = path.getPointAt(progress);
      setAmbPos([pos.x, pos.y, pos.z]);
    }
  });

  return (
    <>
      <color attach="background" args={['#010308']} />
      <fog attach="fog" args={['#010308', 20, 50]} />
      <ambientLight intensity={0.5} color="#00c2ff" />
      {activeRoute && <pointLight position={[0, 10, 0]} intensity={2} color="#ff3131" distance={30} />}
      
      <gridHelper args={[60, 60, '#00c2ff', '#00c2ff']} position={[0, 0, 0]} material-opacity={0.1} material-transparent />
      
      <HolographicCity activeRoute={activeRoute} />
      <TrafficCorridors activeRoute={activeRoute} />
      
      {activeRoute && (
         <group position={ambPos}>
             <CyberAmbulance 
               isEmergency={true} 
               isIdle={false} 
               speed={0} // Freeze internal animation
               scale={1}
               initialPosition={[0,0,0]}
             />
         </group>
      )}
    </>
  );
}

// --- UI COMPONENTS ---
function HUDPanel({ children, title, icon, color = "blue", className = "" }: any) {
  const colors: Record<string, string> = {
    blue: "border-blue-500/30 bg-[#040b16]/80 text-blue-400",
    red: "border-red-500/30 bg-[#160404]/80 text-red-500",
    green: "border-green-500/30 bg-[#04160a]/80 text-green-400",
  };

  return (
    <div className={`relative rounded-xl overflow-hidden backdrop-blur-xl border ${colors[color].split(' ')[0]} ${colors[color].split(' ')[1]} shadow-2xl ${className}`}>
      <div className={`px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/5`}>
        <div className="flex items-center gap-2">
          <div className={colors[color].split(' ')[2]}>{icon}</div>
          <h3 className="font-bold text-white tracking-widest uppercase text-[10px]">{title}</h3>
        </div>
      </div>
      <div className="p-4 relative z-10">{children}</div>
    </div>
  );
}

export default function ReplayDashboard() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1

  useEffect(() => {
    fetch('http://localhost:5005/api/emergency/sessions')
      .then(res => res.json())
      .then(data => setSessions(data));
      
    fetch('http://localhost:5005/api/emergency/logs')
      .then(res => res.json())
      .then(data => setLogs(data));
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && activeSession) {
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return p + 0.005;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeSession]);

  return (
    <div className="h-screen w-full bg-[#010308] relative overflow-hidden font-sans text-white">
      
      {/* 3D Map */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [-15, 20, 15], fov: 35 }}>
          <PlaybackMapScene activeRoute={!!activeSession} progress={progress} />
        </Canvas>
      </div>

      <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)]" />

      {/* Top Header */}
      <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-start pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-blue-500/30 rounded-lg px-4 py-2 flex items-center gap-3">
          <History className="w-4 h-4 text-blue-400" />
          <span className="text-blue-400 text-xs font-bold tracking-widest uppercase">Historical Replay Analytics</span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="absolute inset-0 z-20 pt-20 pb-24 px-6 pointer-events-none flex gap-6">
        
        {/* LEFT PANEL: Sessions */}
        <div className="w-[380px] h-full flex flex-col gap-4 pointer-events-auto">
          <HUDPanel title="Session Database" icon={<Database className="w-4 h-4" />} color="blue">
            <div className="space-y-3 h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
               {sessions.map(s => (
                 <div 
                    key={s.id} 
                    onClick={() => { setActiveSession(s); setProgress(0); setIsPlaying(false); }}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${activeSession?.id === s.id ? 'bg-blue-900/30 border-blue-500/50' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
                 >
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold text-white">Session {s.id.slice(0,6)}</span>
                     <span className="text-[10px] text-green-400 font-mono">{s.eceiScore}% ECEI</span>
                   </div>
                   <div className="flex justify-between text-[10px] text-white/50">
                     <span>{new Date(s.startTime).toLocaleTimeString()}</span>
                     <span>Sev: {s.severity}</span>
                   </div>
                 </div>
               ))}
            </div>
          </HUDPanel>

          {activeSession && (
             <HUDPanel title="Route Analytics" icon={<Activity className="w-4 h-4" />} color="green">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2 bg-black/40 border border-white/5 rounded text-center">
                    <p className="text-[9px] text-white/50 uppercase tracking-widest">Expected ETA</p>
                    <p className="text-sm font-bold text-white font-mono">{activeSession.etaExpected}s</p>
                  </div>
                  <div className="p-2 bg-black/40 border border-white/5 rounded text-center">
                    <p className="text-[9px] text-white/50 uppercase tracking-widest">Actual Time</p>
                    <p className="text-sm font-bold text-green-400 font-mono">{(new Date(activeSession.endTime).getTime() - new Date(activeSession.startTime).getTime()) / 1000}s</p>
                  </div>
                </div>
             </HUDPanel>
          )}
        </div>

        <div className="flex-1" />

        {/* RIGHT PANEL: Logs */}
        <div className="w-[340px] h-full flex flex-col gap-4 pointer-events-auto">
          <HUDPanel title="Activity Audit Log" icon={<FileText className="w-4 h-4" />} color="blue">
             <div className="space-y-3 h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {logs.map((log: any) => (
                  <div key={log.id} className="p-2 border-b border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] text-blue-400 font-bold uppercase">{log.action}</span>
                      <span className="text-[9px] text-white/40 font-mono">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-white/70">{log.details}</p>
                  </div>
                ))}
             </div>
          </HUDPanel>
        </div>

      </div>

      {/* BOTTOM SCRUBBER */}
      <div className="absolute bottom-0 left-0 w-full p-6 z-30 pointer-events-auto">
         <div className="max-w-4xl mx-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-6">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!activeSession}
              className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </button>
            
            <div className="flex-1 flex flex-col gap-2">
               <div className="flex justify-between text-[10px] text-white/50 font-mono uppercase tracking-widest">
                 <span>START</span>
                 <span>{(progress * 100).toFixed(0)}% ROUTE CLEARANCE</span>
                 <span>DESTINATION</span>
               </div>
               <input 
                 type="range" 
                 min="0" 
                 max="1" 
                 step="0.001" 
                 value={progress}
                 onChange={(e) => { setProgress(parseFloat(e.target.value)); setIsPlaying(false); }}
                 disabled={!activeSession}
                 className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
               />
            </div>
         </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 0px; }
      `}} />
    </div>
  );
}
