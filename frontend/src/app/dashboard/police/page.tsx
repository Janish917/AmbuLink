'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertOctagon, CheckCircle, Navigation, Radio, Activity, Map as MapIcon, Crosshair, Users, Signal, Video, Maximize, AlertTriangle, Cpu, Volume2, Search, BarChart3, Wind, Droplets, Zap, Building2, Flame } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PointMaterial, Line } from '@react-three/drei';
import * as THREE from 'three';
import io from 'socket.io-client';
import CyberAmbulance from '@/components/CyberAmbulance';
import MapContainer from '@/components/MapContainer';
import { useAudio } from '@/hooks/useAudio';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

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
      const mat = meshRef.current.material as any;
      if (mat && mat.color) {
        mat.color.lerp(targetColor, 0.05);
      }
      
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
        <bufferAttribute {...({ attach: "attributes-position", count: count, array: positions, itemSize: 3 } as any)} />
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
  // Corridor Layer variables
  emergencyMode: string;
  corridorRadius: number;
  publicAlertRadius: number;
  signalAlertRadius: number;
  policeAlertRadius: number;
  adaptiveReason: string | null;
  corridorEfficiencyScore: number;
};

export default function PoliceDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeRoute, setActiveRoute] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const { playBeep } = useAudio();

  // Predictive Rerouting & Playback States
  const [routeStability, setRouteStability] = useState(95.0);
  const [rerouteProbability, setRerouteProbability] = useState(5.0);
  const [congestionRisk, setCongestionRisk] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [is2DMode, setIs2DMode] = useState(true); // Default 2D on Police view
  const [ambulanceCoords, setAmbulanceCoords] = useState<[number, number]>([28.6139, 77.2090]);
  const [activeRoutePoints, setActiveRoutePoints] = useState<[number, number][]>([
    [28.6139, 77.2090],
    [28.6145, 77.2110],
    [28.6160, 77.2140],
    [28.6190, 77.2180],
    [28.6250, 77.2250]
  ]);
  const [backupRoutePoints, setBackupRoutePoints] = useState<[number, number][]>([
    [28.6139, 77.2090],
    [28.6175, 77.2095],
    [28.6210, 77.2150],
    [28.6235, 77.2200],
    [28.6250, 77.2250]
  ]);

  const [trafficSignals, setTrafficSignals] = useState<any[]>([
    { lat: 28.6145, lng: 77.2110, name: 'Connaught Place Signal 1', status: 'NORMAL' },
    { lat: 28.6160, lng: 77.2140, name: 'Connaught Place Signal 2', status: 'NORMAL' },
    { lat: 28.6190, lng: 77.2180, name: 'Connaught Place Signal 3', status: 'NORMAL' }
  ]);

  const [alertFeed, setAlertFeed] = useState<string[]>([
    "Traffic grid normal. Corridor scans online.",
    "Ready for emergency bypass operations."
  ]);

  const [estimatedDelayIncrease, setEstimatedDelayIncrease] = useState(0);
  const [emergencyPressureScore, setEmergencyPressureScore] = useState(20.0);

  // New Corridor Stability states
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [stabilityScore, setStabilityScore] = useState(95);
  const [congestionRiskLevel, setCongestionRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [signalGridStatus, setSignalGridStatus] = useState('STABLE');
  const [activeObstructionCount, setActiveObstructionCount] = useState(0);
  const [emergencyPressure, setEmergencyPressure] = useState(20);
  const [corridorRadius, setCorridorRadius] = useState(1500);
  const [isMounted, setIsMounted] = useState(false);
  const [stabilityHistory, setStabilityHistory] = useState<{ time: string; stability: number }[]>([
    { time: '0s', stability: 95 }
  ]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
          id: data.id || Math.random().toString(), 
          unit: data.unit || 'UNIT-ALPHA-7', 
          etaExpected,
          etaRange,
          confidence,
          bottleneckNode,
          bottleneckRisk,
          status: 'PENDING',
          // Corridor configs from backend
          emergencyMode: data.emergencyMode || 'STANDARD',
          corridorRadius: data.corridorRadius || 1500,
          publicAlertRadius: data.publicAlertRadius || 500,
          signalAlertRadius: data.signalAlertRadius || 1200,
          policeAlertRadius: data.policeAlertRadius || 2000,
          adaptiveReason: data.adaptiveReason || null,
          corridorEfficiencyScore: data.corridorEfficiencyScore || 85
        },
        ...prev
      ]);
      
      setActiveSessionId(data.id || 'active');
      setActiveRoute(true);
      setStabilityScore(85);
      setCongestionRiskLevel('LOW');
      setSignalGridStatus('STABLE');
      setEmergencyPressure(20);
      setCorridorRadius(data.corridorRadius || 1500);
      setActiveObstructionCount(0);
      setStabilityHistory([{ time: '0s', stability: 85 }]);
      
      playBeep('alert');
    });

    socket.on('telemetry_update', (data) => {
      setAmbulanceCoords([data.lat, data.lng]);
      setRouteStability(data.routeStability);
      setRerouteProbability(data.rerouteProbability);
      setCongestionRisk(data.congestionRisk);
      setEstimatedDelayIncrease(data.estimatedDelayIncrease || 0);
      setEmergencyPressureScore(data.emergencyPressureScore || 20.0);

      // Stability monitor states
      setStabilityScore(data.routeStability);
      setCongestionRiskLevel(data.congestionRisk);
      setSignalGridStatus(data.signalGridStatus || 'STABLE');
      setEmergencyPressure(data.emergencyPressureScore || 20);

      // Warning Net Alerts Ticker integration
      if (data.routeStability < 70) {
        setAlertFeed(prev => {
          if (!prev.includes(`[ALERT] Potential corridor degradation near Sector 17`)) {
            return [`[ALERT] Potential corridor degradation near Sector 17`, ...prev];
          }
          return prev;
        });
      }
      if (data.congestionRisk === 'HIGH') {
        setAlertFeed(prev => {
          if (!prev.includes(`[ALERT] High congestion anomaly detected`)) {
            return [`[ALERT] High congestion anomaly detected`, ...prev];
          }
          return prev;
        });
      }
      if (data.signalGridStatus === 'SIGNAL DELAY DETECTED' || data.signalGridStatus === 'UNSTABLE') {
        setAlertFeed(prev => {
          if (!prev.includes(`[ALERT] Signal synchronization instability detected`)) {
            return [`[ALERT] Signal synchronization instability detected`, ...prev];
          }
          return prev;
        });
      }

      setStabilityHistory(prev => {
        const timeLabel = data.tick !== undefined ? `${Math.round(data.tick * 1.5)}s` : `${prev.length * 1.5}s`;
        const nextHistory = [...prev, { time: timeLabel, stability: data.routeStability }];
        return nextHistory.slice(-10);
      });
    });

    socket.on('reroute_triggered', (data) => {
      playBeep('alert');
      setActiveRoutePoints(backupRoutePoints);
      setAlerts(prev => prev.map(a => ({ ...a, etaExpected: `${data.newEta}m` })));
      setAlertFeed(prev => [`[ALERT] REROUTE ACTIVE: ${data.reason}`, ...prev]);
      setEstimatedDelayIncrease(0); // Reroute stabilizes route
      setEmergencyPressureScore(25.0);
      setStabilityScore(92);
      setCongestionRiskLevel('LOW');
      setSignalGridStatus('STABLE');
    });

    socket.on('signal_preemption', (data) => {
      setTrafficSignals(prev => prev.map(s => s.name === data.signalName ? { ...s, status: data.status } : s));
      setAlertFeed(prev => [`[SIGNAL] Preemption locked on ${data.signalName}`, ...prev]);
    });

    socket.on('corridor_radius_updated', (data) => {
      setCorridorRadius(data.corridorRadius);
      setAlerts(prev => prev.map(a => ({
        ...a,
        corridorRadius: data.corridorRadius,
        publicAlertRadius: data.publicAlertRadius,
        signalAlertRadius: data.signalAlertRadius,
        policeAlertRadius: data.policeAlertRadius
      })));
      setAlertFeed(prev => [`[CORRIDOR] Radius expanded to ${data.corridorRadius}m`, ...prev]);
    });

    socket.on('obstruction_reported', (data) => {
      setActiveObstructionCount(prev => prev + 1);
      setAlertFeed(prev => [`[OBSTRUCTION] ${data.type} obstruction reported ahead!`, ...prev]);
    });

    socket.on('emergency_completed', () => {
      setActiveRoute(false);
      setAlerts([]);
      setAlertFeed(prev => ["Emergency completed successfully.", ...prev]);
      setActiveSessionId(null);
      setActiveObstructionCount(0);
      setStabilityScore(95);
      setCongestionRiskLevel('LOW');
      setSignalGridStatus('STABLE');
      setStabilityHistory([{ time: '0s', stability: 95 }]);
    });

    return () => { 
      socket.off('emergency_alert'); 
      socket.off('telemetry_update');
      socket.off('reroute_triggered');
      socket.off('signal_preemption');
      socket.off('corridor_radius_updated');
      socket.off('obstruction_reported');
      socket.off('emergency_completed');
    };
  }, [playBeep, backupRoutePoints]);

  const acknowledgeAlert = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a));
  };

  const handleActivateAlternate = () => {
    if (!activeSessionId) return;
    playBeep('success');
    socket.emit('police_activate_alternate', { sessionId: activeSessionId });
  };

  const handleOverridePriority = () => {
    if (!activeSessionId) return;
    playBeep('success');
    socket.emit('police_override_priority', { sessionId: activeSessionId });
  };

  const handleForcePreemption = () => {
    if (!activeSessionId) return;
    playBeep('success');
    socket.emit('police_force_preemption', { sessionId: activeSessionId });
  };

  const handleIncreaseRadius = () => {
    if (!activeSessionId) return;
    playBeep('success');
    socket.emit('police_increase_radius', { sessionId: activeSessionId });
  };

  return (
    <div className="h-screen w-full bg-[#010308] relative overflow-hidden font-sans text-white">
      
      {/* Map Background (3D Canvas or 2D Leaflet) */}
      <div className="absolute inset-0 z-0">
        {is2DMode ? (
          <MapContainer 
            activeRoute={activeRoute} 
            role="police" 
            activeRoutePoints={activeRoutePoints}
            backupRoutePoints={backupRoutePoints}
            ambulancePos={activeRoute ? ambulanceCoords : undefined}
            heatmapData={showHeatmap ? [
              { lat: 28.6145, lng: 77.2110, intensity: 0.8 },
              { lat: 28.6160, lng: 77.2140, intensity: 0.9 },
              { lat: 28.6190, lng: 77.2180, intensity: 0.75 },
              { lat: 28.6120, lng: 77.2100, intensity: 0.3 },
              { lat: 28.6235, lng: 77.2200, intensity: 0.4 }
            ] : []}
            trafficSignals={trafficSignals}
            stabilityScore={activeRoute ? stabilityScore : undefined}
            congestionRisk={activeRoute ? congestionRiskLevel : undefined}
          />
        ) : (
          <Canvas camera={{ position: [-15, 20, 15], fov: 35 }}>
            <CommandMapScene activeRoute={activeRoute} />
          </Canvas>
        )}
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

          {/* Corridor Settings & Overrides */}
          <HUDPanel title="Corridor Control Overrides" icon={<Cpu className="w-4 h-4" />} color="blue">
            <div className="grid grid-cols-2 gap-2 text-[9px] font-bold uppercase tracking-wider">
              <button onClick={() => { playBeep('success'); setShowHeatmap(!showHeatmap); }} className={`p-2 rounded border text-center transition-colors ${showHeatmap ? 'bg-red-600/20 border-red-500 text-white' : 'bg-black/40 border-white/5 text-white/50'}`}>
                {showHeatmap ? '🔴 Heatmap ON' : '⚫ Heatmap OFF'}
              </button>
              <button onClick={() => { playBeep('success'); setIs2DMode(!is2DMode); }} className={`p-2 rounded border text-center transition-colors ${is2DMode ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/40 border-white/5 text-white/50'}`}>
                {is2DMode ? '🗺️ 2D Tactical' : '📐 3D Holo'}
              </button>
            </div>
          </HUDPanel>

          {/* Manual Obstruction Reporting Panel */}
          <HUDPanel title="Report Corridor Obstruction" icon={<AlertTriangle className="w-4 h-4" />} color="red">
            <form onSubmit={(e) => {
              e.preventDefault();
              if (alerts.length === 0) {
                alert("No active emergency session.");
                return;
              }
              const form = e.target as HTMLFormElement;
              const type = form.obstructionType.value;
              const details = form.obstructionDetails.value;
              
              socket.emit('report_obstruction', {
                sessionId: alerts[0].id,
                type,
                lat: 28.6160,
                lng: 77.2140,
                details
              });
              
              form.reset();
            }} className="space-y-3">
              <div>
                <label className="block text-[8px] text-white/40 uppercase mb-1">Obstruction Type</label>
                <select name="obstructionType" className="w-full bg-black/60 border border-red-500/20 text-xs text-white rounded p-2 focus:outline-none focus:border-red-500">
                  <option value="ACCIDENT">Accident</option>
                  <option value="PROTEST">Protest</option>
                  <option value="CONSTRUCTION">Construction</option>
                  <option value="FLOOD">Flood</option>
                  <option value="ROADBLOCK">Roadblock</option>
                  <option value="VIP_CONVOY">VIP Convoy</option>
                </select>
              </div>
              <div>
                <label className="block text-[8px] text-white/40 uppercase mb-1">Details / Notes</label>
                <input name="obstructionDetails" type="text" placeholder="e.g. Lanes blocked near outer circle" required className="w-full bg-black/60 border border-red-500/20 text-xs text-white rounded p-2 focus:outline-none focus:border-red-500" />
              </div>
              <button type="submit" className="w-full py-2 bg-red-700/80 hover:bg-red-600 border border-red-500/40 text-white rounded text-xs font-bold uppercase transition-colors tracking-wider">
                Broadcast Roadblock
              </button>
            </form>
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

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                       <div className="text-[9px] text-white/40 uppercase tracking-widest">Risk Node</div>
                       <div className="text-xs text-yellow-400 font-bold truncate">{alert.bottleneckNode}</div>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                       <div className="text-[9px] text-white/40 uppercase tracking-widest">Clearance Prob.</div>
                       <div className="text-xs text-blue-400 font-bold">{Math.round(alert.confidence * 100)}%</div>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5 col-span-2">
                       <div className="text-[9px] text-white/40 uppercase tracking-widest">Live Corridor Risk Monitor</div>
                       <div className="grid grid-cols-2 gap-2 mt-1.5 font-mono text-[9px]">
                         <div className="flex justify-between border-b border-white/5 pb-1">
                           <span className="text-white/40">Stability:</span>
                           <span className={routeStability > 80 ? 'text-green-400 font-bold' : routeStability > 60 ? 'text-yellow-400 font-bold' : 'text-red-500 font-bold'}>{routeStability}%</span>
                         </div>
                         <div className="flex justify-between border-b border-white/5 pb-1">
                           <span className="text-white/40">Delay:</span>
                           <span className={estimatedDelayIncrease > 0 ? 'text-red-400 font-bold' : 'text-green-400'}>+{estimatedDelayIncrease}m</span>
                         </div>
                         <div className="flex justify-between">
                           <span className="text-white/40">Pressure:</span>
                           <span className="text-blue-400 font-bold">{emergencyPressureScore}</span>
                         </div>
                         <div className="flex justify-between">
                           <span className="text-white/40">Risk Level:</span>
                           <span className={congestionRisk === 'HIGH' ? 'text-red-500 font-bold animate-pulse' : congestionRisk === 'MEDIUM' ? 'text-yellow-400 font-bold' : 'text-green-400'}>{congestionRisk}</span>
                         </div>
                       </div>
                    </div>
                  </div>

                  {/* Multi-Layer Corridor Alert Information */}
                  <div className="mb-4 p-3 rounded-xl bg-black/40 border border-white/5 space-y-2.5">
                    <div className="flex justify-between items-center pb-1.5 border-b border-white/10">
                      <span className="text-[9px] text-white/50 uppercase tracking-widest font-bold">Active Corridor ({alert.emergencyMode})</span>
                      <span className="text-[10px] font-mono font-bold text-red-400">{alert.corridorRadius}m Radius</span>
                    </div>
                    {alert.adaptiveReason && (
                      <div className="text-[8px] text-yellow-400/90 font-mono italic">
                        🧠 {alert.adaptiveReason}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-1.5 text-[8px] uppercase tracking-wider font-mono text-center">
                      <div className="p-1 rounded bg-[#0a2212]/50 border border-green-500/20 text-green-300">
                        <div>Civilians</div>
                        <div className="font-bold font-sans text-[9px] mt-0.5">{alert.publicAlertRadius}m</div>
                      </div>
                      <div className="p-1 rounded bg-[#2c1f0a]/50 border border-yellow-500/20 text-yellow-300">
                        <div>Signals</div>
                        <div className="font-bold font-sans text-[9px] mt-0.5">{alert.signalAlertRadius}m</div>
                      </div>
                      <div className="p-1 rounded bg-[#0c182c]/50 border border-blue-500/20 text-blue-300">
                        <div>Police</div>
                        <div className="font-bold font-sans text-[9px] mt-0.5">{alert.policeAlertRadius}m</div>
                      </div>
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

          <HUDPanel title="Corridor Stability Monitor" icon={<Zap className="w-4 h-4" />} color={stabilityScore > 80 ? "green" : stabilityScore > 60 ? "amber" : "red"}>
            <div className="space-y-4">
              
              {/* Dynamic Ring & Score */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div 
                    className="absolute inset-0 rounded-full blur-xl opacity-30 transition-all duration-500 animate-pulse"
                    style={{
                      background: stabilityScore > 80 ? 'rgba(34,197,94,0.4)' : stabilityScore > 60 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'
                    }}
                  />
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="48" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                    <circle cx="64" cy="64" r="48" 
                      stroke={stabilityScore > 80 ? '#22c55e' : stabilityScore > 60 ? '#f59e0b' : '#ef4444'} 
                      strokeWidth="8" fill="transparent"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - stabilityScore / 100)}
                      className="transition-all duration-500 stroke-linecap-round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-mono font-black text-white tracking-tighter">{stabilityScore}%</span>
                    <span className="text-[7.5px] text-white/50 uppercase tracking-widest">Stability</span>
                  </div>
                </div>
              </div>

              {/* Holographic corridor parameters */}
              <div className="p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-[9px] space-y-2">
                <div className="flex justify-between items-center border-b border-white/5 pb-1">
                  <span className="text-white/40">CONGESTION RISK:</span>
                  <span className={`font-bold flex items-center gap-1 ${congestionRiskLevel === 'HIGH' ? 'text-red-500 animate-pulse' : congestionRiskLevel === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'}`}>
                    <Flame className="w-3 h-3" /> {congestionRiskLevel}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-1">
                  <span className="text-white/40">SIGNAL GRID:</span>
                  <span className={`font-bold ${signalGridStatus.startsWith('SIGNAL DELAY') || signalGridStatus === 'UNSTABLE' ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                    {signalGridStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-1">
                  <span className="text-white/40">REROUTE PROBABILITY:</span>
                  <span className="text-blue-400 font-bold">{Math.round(rerouteProbability)}%</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-1">
                  <span className="text-white/40">ACTIVE OBSTRUCTIONS:</span>
                  <span className={`font-bold ${activeObstructionCount > 0 ? 'text-red-400 animate-bounce' : 'text-white'}`}>
                    {activeObstructionCount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40">EMERGENCY PRESSURE:</span>
                  <span className="text-purple-400 font-bold">{emergencyPressure}</span>
                </div>
              </div>

              {/* Live Fluctuation Graph */}
              <div className="p-2 rounded-lg bg-black/50 border border-white/5 space-y-1">
                <p className="text-[8px] text-white/40 uppercase tracking-widest font-mono">Real-Time Stability Log</p>
                <div className="h-[90px] w-full flex items-center justify-center overflow-hidden">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height={90}>
                      <AreaChart data={stabilityHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="stabilityColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={stabilityScore > 80 ? '#22c55e' : stabilityScore > 60 ? '#f59e0b' : '#ef4444'} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={stabilityScore > 80 ? '#22c55e' : stabilityScore > 60 ? '#f59e0b' : '#ef4444'} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="#ffffff20" fontSize={7} tickLine={false} />
                        <YAxis domain={[0, 100]} hide />
                        <Tooltip 
                          contentStyle={{ background: '#090a10', borderColor: '#ffffff20', color: '#fff', fontSize: '9px', borderRadius: '4px' }}
                          labelClassName="text-white/60 font-mono"
                        />
                        <Area type="monotone" dataKey="stability" 
                          stroke={stabilityScore > 80 ? '#22c55e' : stabilityScore > 60 ? '#f59e0b' : '#ef4444'} 
                          strokeWidth={1.5} fillOpacity={1} fill="url(#stabilityColor)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-[10px] text-white/20 uppercase tracking-widest">Connecting telemetry...</div>
                  )}
                </div>
              </div>

              {/* Tactical Actions overriding panel */}
              <div className="space-y-2">
                <p className="text-[8px] text-white/40 uppercase tracking-widest font-mono">Tactical Operations Command</p>
                <div className="grid grid-cols-2 gap-2 text-[9px] font-bold uppercase tracking-wider">
                  <button 
                    onClick={handleActivateAlternate}
                    disabled={!activeRoute || stabilityScore >= 70}
                    className={`p-2 rounded border text-center transition-all ${
                      activeRoute && stabilityScore < 70 
                        ? 'bg-red-600/30 border-red-500 text-red-300 animate-pulse hover:bg-red-600/50 cursor-pointer font-bold' 
                        : 'bg-black/30 border-white/5 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    Activate Alt
                  </button>
                  <button 
                    onClick={handleOverridePriority}
                    disabled={!activeRoute}
                    className={`p-2 rounded border text-center transition-all ${
                      activeRoute 
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 hover:bg-blue-600/40 cursor-pointer font-bold' 
                        : 'bg-black/30 border-white/5 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    Override Priority
                  </button>
                  <button 
                    onClick={handleForcePreemption}
                    disabled={!activeRoute}
                    className={`p-2 rounded border text-center transition-all ${
                      activeRoute 
                        ? 'bg-green-600/20 border-green-500 text-green-300 hover:bg-green-600/40 cursor-pointer font-bold' 
                        : 'bg-black/30 border-white/5 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    Force Preempt
                  </button>
                  <button 
                    onClick={handleIncreaseRadius}
                    disabled={!activeRoute}
                    className={`p-2 rounded border text-center transition-all ${
                      activeRoute 
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300 hover:bg-purple-600/40 cursor-pointer font-bold' 
                        : 'bg-black/30 border-white/5 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    Expand Radius
                  </button>
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
