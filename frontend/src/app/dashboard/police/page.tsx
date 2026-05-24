'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertOctagon, CheckCircle, Navigation, Radio, Activity, Map as MapIcon, Crosshair, Users, Signal, Video, Maximize, AlertTriangle, Cpu, Volume2, Search, BarChart3, Wind, Droplets } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PointMaterial, Line } from '@react-three/drei';
import * as THREE from 'three';
import io from 'socket.io-client';
import CyberAmbulance from '@/components/CyberAmbulance';

const socket = io('http://localhost:5005');

// ---------------------------------------------------------
// 3D HOLOGRAPHIC CITY PROJECTION (React Three Fiber)
// ---------------------------------------------------------

function HolographicCity({ activeRoute }: { activeRoute: boolean }) {
  const buildingCount = 300;
  
  const [positions, scales] = useMemo(() => {
    const pos = new Float32Array(buildingCount * 3);
    const scl = new Float32Array(buildingCount * 3);
    let i = 0;
    for (let x = -20; x < 20; x += 2.5) {
      for (let z = -20; z < 20; z += 2.5) {
        if (Math.abs(x) < 3 || Math.abs(z) < 3) continue; // main cross roads
        if (i >= buildingCount) break;
        
        const height = Math.random() * 5 + 1;
        pos[i * 3] = x + (Math.random() * 1 - 0.5);
        pos[i * 3 + 1] = height / 2;
        pos[i * 3 + 2] = z + (Math.random() * 1 - 0.5);
        
        scl[i * 3] = 1.8;
        scl[i * 3 + 1] = height;
        scl[i * 3 + 2] = 1.8;
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
      
      // Gentle floating pulse
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length / 3]}>
        <boxGeometry>
          <instancedBufferAttribute attach="attributes-offset" args={[positions, 3]} />
        </boxGeometry>
        {/* Wireframe holographic look */}
        <meshBasicMaterial 
          color="#00c2ff" 
          wireframe 
          transparent 
          opacity={0.15} 
        />
      </instancedMesh>
      
      <instancedMesh args={[undefined, undefined, positions.length / 3]}>
        <boxGeometry>
          <instancedBufferAttribute attach="attributes-offset" args={[positions, 3]} />
        </boxGeometry>
        <meshStandardMaterial 
          color="#030b14" 
          transparent 
          opacity={0.8}
          roughness={0.8}
        />
      </instancedMesh>
    </group>
  );
}

function TrafficCorridors({ activeRoute }: { activeRoute: boolean }) {
  // Main highlighted corridor
  const mainPath = [
    new THREE.Vector3(-15, 0.1, -1.5),
    new THREE.Vector3(0, 0.1, -1.5),
    new THREE.Vector3(0, 0.1, 15),
  ];
  
  // Secondary crossing paths (amber)
  const crossPath1 = [new THREE.Vector3(-15, 0.1, 5), new THREE.Vector3(15, 0.1, 5)];
  const crossPath2 = [new THREE.Vector3(8, 0.1, -15), new THREE.Vector3(8, 0.1, 15)];

  const routeColor = activeRoute ? "#22c55e" : "#00c2ff"; // Green when active (cleared)

  return (
    <group>
      <Line points={mainPath} color={routeColor} lineWidth={5} opacity={0.8} transparent />
      {activeRoute && <Line points={mainPath} color={routeColor} lineWidth={15} opacity={0.2} transparent />}
      
      <Line points={crossPath1} color={activeRoute ? "#ef4444" : "#f59e0b"} lineWidth={2} opacity={0.5} transparent dashed dashSize={0.5} />
      <Line points={crossPath2} color={activeRoute ? "#ef4444" : "#f59e0b"} lineWidth={2} opacity={0.5} transparent dashed dashSize={0.5} />
      
      {/* Node Points */}
      <mesh position={[0, 0.2, -1.5]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 16]} />
        <meshBasicMaterial color={activeRoute ? "#22c55e" : "#00c2ff"} transparent opacity={0.5} />
      </mesh>
      <mesh position={[-10, 0.2, -1.5]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 16]} />
        <meshBasicMaterial color={activeRoute ? "#22c55e" : "#00c2ff"} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function DataParticles({ activeRoute }: { activeRoute: boolean }) {
  const count = 300;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = Math.random() * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return pos;
  }, [count]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <PointMaterial size={0.05} color={activeRoute ? "#ff3131" : "#00c2ff"} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function CommandMapScene({ activeRoute }: { activeRoute: boolean }) {
  useFrame(({ camera, pointer }) => {
    // Top-down tactical isometric view, responsive to mouse
    camera.position.lerp(new THREE.Vector3(pointer.x * 2 - 15, 20, pointer.y * 2 + 15), 0.05);
    camera.lookAt(0, 0, 0);
  });

  const path = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-15, 0.1, -1.5),
    new THREE.Vector3(0, 0.1, -1.5),
    new THREE.Vector3(0, 0.1, 15),
  ]), []);

  return (
    <>
      <color attach="background" args={['#010308']} />
      <fog attach="fog" args={['#010308', 20, 50]} />
      <ambientLight intensity={0.5} color="#00c2ff" />
      {activeRoute && <pointLight position={[0, 10, 0]} intensity={2} color="#ff3131" distance={30} />}
      
      {/* Tactical Grid Floor */}
      <gridHelper args={[60, 60, '#00c2ff', '#00c2ff']} position={[0, 0, 0]} material-opacity={0.1} material-transparent />
      <gridHelper args={[60, 12, '#00c2ff', '#00c2ff']} position={[0, 0, 0]} material-opacity={0.05} material-transparent />
      
      <HolographicCity activeRoute={activeRoute} />
      <TrafficCorridors activeRoute={activeRoute} />
      <DataParticles activeRoute={activeRoute} />
      
      {activeRoute && (
         <CyberAmbulance 
           isEmergency={activeRoute} 
           isIdle={false} 
           path={path} 
           speed={0.15} 
         />
      )}
      
      {/* Scanning Laser Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial color="#00c2ff" transparent opacity={0.02} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

// ---------------------------------------------------------
// UI WIDGET COMPONENTS
// ---------------------------------------------------------

function HUDPanel({ children, title, icon, color = "blue", className = "" }: any) {
  const colors: Record<string, string> = {
    blue: "border-blue-500/30 bg-[#040b16]/80 text-blue-400",
    red: "border-red-500/30 bg-[#160404]/80 text-red-500",
    green: "border-green-500/30 bg-[#04160a]/80 text-green-400",
    amber: "border-amber-500/30 bg-[#161004]/80 text-amber-500"
  };

  return (
    <div className={`relative rounded-xl overflow-hidden backdrop-blur-xl border ${colors[color].split(' ')[0]} ${colors[color].split(' ')[1]} shadow-2xl ${className}`}>
      <div className={`px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/5`}>
        <div className="flex items-center gap-2">
          <div className={colors[color].split(' ')[2]}>{icon}</div>
          <h3 className="font-bold text-white tracking-widest uppercase text-[10px]">{title}</h3>
        </div>
        <div className="flex gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${colors[color].split(' ')[2].replace('text-', 'bg-')} animate-pulse`} />
        </div>
      </div>
      <div className="p-4 relative z-10">
        {children}
      </div>
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/30" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/30" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/30" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/30" />
    </div>
  );
}

// ---------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------

type Alert = {
  id: string;
  unit: string;
  etaExpected: string;
  etaRange: string;
  confidence: number;
  bottleneckNode: string;
  bottleneckRisk: string;
  status: 'PENDING' | 'ACKNOWLEDGED';
};

export default function PoliceDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeRoute, setActiveRoute] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ':' + now.getMilliseconds().toString().padStart(3, '0'));
    }, 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    socket.on('emergency_alert', (data) => {
      let etaExpected = data.eta || '10.5m';
      let etaRange = '10 - 14m';
      let confidence = 0.78;
      let bottleneckNode = 'Sector 7 Junction';
      let bottleneckRisk = '65%';

      if (data.simulation) {
        etaExpected = `${data.simulation.eta.expected}m`;
        etaRange = `${data.simulation.eta.best}m - ${data.simulation.eta.worst}m`;
        confidence = data.simulation.eta.confidence;
      }
      if (data.timeline && data.timeline.length > 0) {
        const highestRisk = [...data.timeline].sort((a,b) => b.bottleneckRisk - a.bottleneckRisk)[0];
        bottleneckNode = highestRisk.authority;
        bottleneckRisk = `${Math.round(highestRisk.bottleneckRisk * 100)}%`;
      }

      setAlerts(prev => [
        { 
          id: Math.random().toString(), 
          unit: data.unit || 'UNIT-ALPHA-7', 
          etaExpected,
          etaRange,
          confidence,
          bottleneckNode,
          bottleneckRisk,
          status: 'PENDING' 
        },
        ...prev
      ]);
      setActiveRoute(true);
    });

    return () => { socket.off('emergency_alert'); };
  }, []);

  const acknowledgeAlert = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a));
  };

  return (
    <div className="h-screen w-full bg-[#010308] relative overflow-hidden font-sans text-white">
      
      {/* 3D Map Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [-15, 20, 15], fov: 35 }}>
          <CommandMapScene activeRoute={activeRoute} />
        </Canvas>
      </div>

      {/* Global Vignette & Scanlines */}
      <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)]" />
      <div className="absolute inset-0 z-10 pointer-events-none opacity-10 mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]" />

      {/* Top Header Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-start pointer-events-none">
        <div className="flex gap-4">
          <div className="bg-black/60 backdrop-blur-md border border-blue-500/30 rounded-lg px-4 py-2 flex items-center gap-3 shadow-[0_0_15px_rgba(0,194,255,0.2)]">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-xs font-bold tracking-widest uppercase">Traffic Command Center</span>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-4 py-2 flex items-center gap-4">
             <div className="flex items-center gap-2 text-white/70 text-xs font-mono"><Cpu className="w-3 h-3 text-purple-400" /> AI CORE ONLINE</div>
             <div className="w-px h-4 bg-white/20" />
             <div className="flex items-center gap-2 text-white/70 text-[10px] font-mono tracking-widest">{currentTime}</div>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="absolute inset-0 z-20 pt-20 pb-6 px-6 pointer-events-none flex gap-6">
        
        {/* LEFT PANEL: Dispatch & Controls */}
        <div className="w-[380px] h-full flex flex-col gap-4 pointer-events-auto overflow-y-auto custom-scrollbar pr-2 pb-20">
          
          <HUDPanel title="Voice Command Assistant" icon={<Volume2 className="w-4 h-4" />} color="blue">
            <div className="flex items-center gap-4 bg-black/40 border border-blue-500/20 p-3 rounded-lg relative overflow-hidden">
               <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                 <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping" />
               </div>
               <div>
                 <p className="text-[10px] text-blue-400/80 uppercase tracking-widest mb-0.5">Listening to Command Net</p>
                 <p className="text-xs font-mono text-white/90">"Clear Sector 4, Priority Override"</p>
               </div>
               <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-blue-500 to-blue-500/0 opacity-50 animate-[scan_2s_linear_infinite]" />
            </div>
          </HUDPanel>

          <HUDPanel title="Emergency Dispatch Queue" icon={<AlertOctagon className="w-4 h-4" />} color={alerts.length > 0 ? "red" : "blue"}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] text-white/50 uppercase tracking-widest">Active Units</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${alerts.length > 0 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-blue-500/20 text-blue-400 border-blue-500/50'}`}>
                {alerts.length} TARGETS
              </span>
            </div>

            <AnimatePresence>
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, scale: 0.9, height: 0 }}
                  className={`bg-black/50 border rounded-xl p-4 mb-4 ${alert.status === 'PENDING' ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-green-500/30'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className={`text-sm font-bold flex items-center gap-2 ${alert.status === 'PENDING' ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                        {alert.status === 'PENDING' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        {alert.unit}
                      </h4>
                      <p className="text-[10px] text-white/50 font-mono mt-1">SAPS PRIORITY OVERRIDE</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-white/40 uppercase mb-0.5">Live ETA</div>
                      <div className="text-lg font-mono font-bold text-white">{alert.etaExpected}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                       <div className="text-[9px] text-white/40 uppercase tracking-widest">Risk Node</div>
                       <div className="text-xs text-yellow-400 font-bold truncate">{alert.bottleneckNode}</div>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                       <div className="text-[9px] text-white/40 uppercase tracking-widest">Clearance Prob.</div>
                       <div className="text-xs text-blue-400 font-bold">{Math.round(alert.confidence * 100)}%</div>
                    </div>
                  </div>

                  {alert.status === 'PENDING' ? (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="w-full py-2.5 bg-red-600/90 hover:bg-red-500 text-white rounded-lg font-black text-[10px] tracking-widest uppercase transition-colors flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                    >
                      <Crosshair className="w-3 h-3" /> Execute Route Clearance
                    </button>
                  ) : (
                    <div className="w-full py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg font-bold text-[10px] tracking-widest uppercase text-center flex justify-center items-center gap-2">
                      <Signal className="w-3 h-3 animate-pulse" /> Signals Preempted
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {alerts.length === 0 && (
              <div className="text-center text-white/30 py-8 text-xs font-mono border border-dashed border-white/10 rounded-xl">
                SYSTEM STANDBY.
                <br/>NO ACTIVE CLEARANCE REQUESTS.
              </div>
            )}
          </HUDPanel>

          <HUDPanel title="Live Signal Overrides" icon={<Activity className="w-4 h-4" />} color="green">
             <div className="space-y-2">
                {[
                  { name: "Junction 4A", status: "GREEN HELD", time: "02:14" },
                  { name: "Bridge 9 Access", status: "CIVILIAN HALT", time: "00:45" },
                  { name: "Sector 7 Main", status: "AI MANAGED", time: "AUTO" }
                ].map((sig, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-black/40 border border-green-500/10">
                     <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
                       <span className="text-xs text-white/80">{sig.name}</span>
                     </div>
                     <div className="text-right">
                       <div className="text-[9px] text-green-400 font-bold">{sig.status}</div>
                       <div className="text-[9px] text-white/40 font-mono">{sig.time}</div>
                     </div>
                  </div>
                ))}
             </div>
          </HUDPanel>

        </div>

        <div className="flex-1" /> {/* Empty space for Holographic Map */}

        {/* RIGHT PANEL: Surveillance & Analytics */}
        <div className="w-[320px] h-full flex flex-col gap-4 pointer-events-auto overflow-y-auto custom-scrollbar pr-2 pb-20">
          
          <HUDPanel title="Live Surveillance Nodes" icon={<Video className="w-4 h-4" />} color="blue">
            <div className="space-y-3">
              {/* Drone Feed 1 */}
              <div className="relative w-full aspect-video bg-black/80 rounded-lg overflow-hidden border border-white/10 group cursor-pointer">
                <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[8px] text-red-400 font-mono tracking-widest uppercase">AIR-UNIT 1</span>
                </div>
                <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay pointer-events-none group-hover:bg-transparent transition-colors" />
                <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-60 mix-blend-luminosity scale-105 group-hover:scale-100 transition-transform duration-700" />
                <Maximize className="absolute bottom-2 right-2 w-4 h-4 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* CCTV Feed 2 */}
              <div className="relative w-full aspect-video bg-black/80 rounded-lg overflow-hidden border border-white/10 group cursor-pointer">
                <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[8px] text-blue-400 font-mono tracking-widest uppercase">CAM 42 (CP JUNC)</span>
                </div>
                <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-luminosity scale-105 group-hover:scale-100 transition-transform duration-700" />
              </div>
            </div>
          </HUDPanel>

          <HUDPanel title="Traffic Density & AI Analytics" icon={<BarChart3 className="w-4 h-4" />} color="blue">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] text-white/50 uppercase tracking-widest mb-1.5">
                  <span>Sector 4 Density</span>
                  <span className="text-yellow-400 font-bold">HIGH (82%)</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/10">
                  <div className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 w-[82%] relative">
                    <div className="absolute inset-0 bg-white/20 animate-[scan_1s_linear_infinite]" />
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-[10px] text-white/50 uppercase tracking-widest mb-1.5">
                  <span>Clearance Success Prob.</span>
                  <span className="text-blue-400 font-bold">94%</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/10">
                  <div className="h-full bg-blue-500 w-[94%]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                 <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                    <p className="text-[9px] text-white/40 uppercase mb-1">Avg Clearance</p>
                    <p className="text-sm font-bold text-white font-mono">1.4s / node</p>
                 </div>
                 <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                    <p className="text-[9px] text-white/40 uppercase mb-1">Civilian Halt</p>
                    <p className="text-sm font-bold text-white font-mono">4,201 veh</p>
                 </div>
              </div>
            </div>
          </HUDPanel>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 0px; }
      `}} />
    </div>
  );
}
