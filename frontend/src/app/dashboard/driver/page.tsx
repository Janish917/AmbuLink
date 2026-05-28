'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Navigation, Activity, ShieldAlert, Thermometer, Wind, CloudRain, RadioTower, Database, Map, CheckCircle, AlertTriangle, Fingerprint, Battery, Settings, Users, Truck, HeartPulse, Video, Radio, Building2 } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PointMaterial, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import io from 'socket.io-client';
import CyberAmbulance from '@/components/CyberAmbulance';
import MapContainer from '@/components/MapContainer';
import { useAudio } from '@/hooks/useAudio';

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
      const mat = meshRef.current.material as any;
      if (mat && mat.color) {
        mat.color.lerp(isEmergency ? emergencyColor : baseColor, 0.05);
      }
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
  const { playBeep, playSiren, stopSiren } = useAudio();

  // Dynamic Emergency Corridor configurations
  const [emergencyMode, setEmergencyMode] = useState('STANDARD');
  const [manualRadius, setManualRadius] = useState(1500);
  const [recommendedMode, setRecommendedMode] = useState('STANDARD');
  const [recommendationReason, setRecommendationReason] = useState('');

  // Active status from backend
  const [activeCorridorRadius, setActiveCorridorRadius] = useState(1500);
  const [activePublicRadius, setActivePublicRadius] = useState(500);
  const [activeSignalRadius, setActiveSignalRadius] = useState(1200);
  const [activePoliceRadius, setActivePoliceRadius] = useState(2000);
  const [adaptiveReason, setAdaptiveReason] = useState<string | null>(null);
  const [eceiScore, setEceiScore] = useState(85);
  const [estimatedDelayReduction, setEstimatedDelayReduction] = useState(180);

  // Predictive Rerouting & Playback States
  const [routeStability, setRouteStability] = useState(95.0);
  const [rerouteProbability, setRerouteProbability] = useState(5.0);
  const [congestionRisk, setCongestionRisk] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [activeTab, setActiveTab] = useState<'active' | 'backup' | 'fastest'>('active');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [is2DMode, setIs2DMode] = useState(false);
  const [reroutedAlert, setReroutedAlert] = useState<string | null>(null);
  const [reportedObstruction, setReportedObstruction] = useState<{ type: string; details: string | null } | null>(null);
  const [emergencyPressureScore, setEmergencyPressureScore] = useState(20.0);
  const [estimatedDelayIncrease, setEstimatedDelayIncrease] = useState(0);
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
  const [fastestRoutePoints, setFastestRoutePoints] = useState<[number, number][]>([
    [28.6139, 77.2090],
    [28.6110, 77.2130],
    [28.6150, 77.2220],
    [28.6220, 77.2260],
    [28.6250, 77.2250]
  ]);

  const [trafficSignals, setTrafficSignals] = useState<any[]>([
    { lat: 28.6145, lng: 77.2110, name: 'Connaught Place Signal 1', status: 'NORMAL' },
    { lat: 28.6160, lng: 77.2140, name: 'Connaught Place Signal 2', status: 'NORMAL' },
    { lat: 28.6190, lng: 77.2180, name: 'Connaught Place Signal 3', status: 'NORMAL' }
  ]);

  const [alertFeed, setAlertFeed] = useState<string[]>([
    "System check complete. Primary CP corridor active.",
    "Corridor monitoring online. Signal network connected."
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + now.getMilliseconds().toString().padStart(3, '0'));
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Smart recommendation logic based on peak hour and high-speed indicators
  useEffect(() => {
    const hour = new Date().getHours();
    const isPeakHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
    
    if (isPeakHour) {
      setRecommendedMode('ADAPTIVE_AI');
      setRecommendationReason('Heavy peak traffic detected. Adaptive AI will auto-scale radius layers.');
    } else {
      const mockHighwayRoute = true;
      if (mockHighwayRoute) {
        setRecommendedMode('TRAUMA_HIGHWAY');
        setRecommendationReason('High-speed highway route detected. Trauma/Highway mode prepares long-range boundaries.');
      } else {
        setRecommendedMode('STANDARD');
        setRecommendationReason('Balanced traffic conditions detected.');
      }
    }
  }, []);

  // Listen to socket broadcasts to synchronize dynamic simulations
  useEffect(() => {
    socket.on('emergency_alert', (data) => {
      if (data.unit === 'Unit 42') {
        setActiveCorridorRadius(data.corridorRadius || 1500);
        setActivePublicRadius(data.publicAlertRadius || 500);
        setActiveSignalRadius(data.signalAlertRadius || 1200);
        setActivePoliceRadius(data.policeAlertRadius || 2000);
        setAdaptiveReason(data.adaptiveReason || null);
        if (data.simulation) {
          setEceiScore(data.simulation.eceiScore || 85);
          setEstimatedDelayReduction(Math.round(data.simulation.timeSaved.expected * 60) || 120);
        }
      }
    });

    socket.on('telemetry_update', (data) => {
      if (isEmergency) {
        setAmbulanceCoords([data.lat, data.lng]);
        setRouteStability(data.routeStability);
        setRerouteProbability(data.rerouteProbability);
        setCongestionRisk(data.congestionRisk);
        setEstimatedDelayIncrease(data.estimatedDelayIncrease || 0);
        setEmergencyPressureScore(data.emergencyPressureScore || 20.0);
      }
    });

    socket.on('obstruction_reported', (data) => {
      if (isEmergency) {
        playBeep('alert');
        setReportedObstruction({ type: data.type, details: data.details });
        setAlertFeed(prev => [`[WARNING] ${data.type} obstruction reported ahead!`, ...prev]);
        setTimeout(() => setReportedObstruction(null), 6000);
      }
    });

    socket.on('reroute_triggered', (data) => {
      if (isEmergency) {
        playBeep('alert');
        setReroutedAlert(data.reason);
        // Swap primary route coordinates dynamically!
        setActiveRoutePoints(backupRoutePoints);
        setAlertFeed(prev => [`[ALERT] REROUTE ACTIVE: ${data.reason}`, ...prev]);
        setTimeout(() => setReroutedAlert(null), 5000);
      }
    });

    socket.on('signal_preemption', (data) => {
      setTrafficSignals(prev => prev.map(s => s.name === data.signalName ? { ...s, status: data.status } : s));
      setAlertFeed(prev => [`[SIGNAL] Preemption locked on ${data.signalName}`, ...prev]);
    });

    socket.on('emergency_completed', () => {
      setAlertFeed(prev => ["Emergency completed successfully. Base stand-by engaged.", ...prev]);
    });

    return () => {
      socket.off('emergency_alert');
      socket.off('telemetry_update');
      socket.off('reroute_triggered');
      socket.off('signal_preemption');
      socket.off('emergency_completed');
      socket.off('obstruction_reported');
    };
  }, [isEmergency, backupRoutePoints, playBeep]);

  const handleActivation = () => {
    if (activationPhase === 'IDLE') {
      playBeep('alert');
      setActivationPhase('BIOMETRIC');
      setTimeout(() => {
        playBeep('success');
        setActivationPhase('ACTIVE');
        setIsEmergency(true);
        playSiren();
        socket.emit('start_emergency', { 
          unit: 'Unit 42', 
          location: 'Central Hospital Base', 
          eta: '08:45 MIN',
          mode: emergencyMode,
          manualRadius: emergencyMode === 'MANUAL' ? manualRadius : undefined
        });
      }, 2000); // 2 sec biometric scan
    } else if (activationPhase === 'ACTIVE') {
      playBeep('alert');
      setActivationPhase('IDLE');
      setIsEmergency(false);
      stopSiren();
    }
  };

  return (
    <div className="h-screen w-full bg-[#03050a] relative overflow-hidden font-sans selection:bg-blue-500/30 text-white">
      
      {/* Map Background (3D Canvas or 2D Leaflet) */}
      <div className="absolute inset-0 z-0">
        {is2DMode ? (
          <MapContainer 
            activeRoute={isEmergency} 
            role="driver" 
            activeRoutePoints={activeRoutePoints}
            backupRoutePoints={activeTab === 'backup' ? backupRoutePoints : activeTab === 'fastest' ? fastestRoutePoints : undefined}
            ambulancePos={isEmergency ? ambulanceCoords : undefined}
            heatmapData={showHeatmap ? [
              { lat: 28.6145, lng: 77.2110, intensity: 0.8 },
              { lat: 28.6160, lng: 77.2140, intensity: 0.9 },
              { lat: 28.6190, lng: 77.2180, intensity: 0.75 },
              { lat: 28.6120, lng: 77.2100, intensity: 0.3 },
              { lat: 28.6235, lng: 77.2200, intensity: 0.4 }
            ] : []}
            trafficSignals={trafficSignals}
          />
        ) : (
          <Canvas camera={{ position: [-14, 3, 2], fov: 45 }}>
            <TacticalMapScene isEmergency={isEmergency} />
          </Canvas>
        )}
      </div>

      {/* Dynamic Biometric Reroute Warning Banner */}
      <AnimatePresence>
        {reroutedAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -50 }} 
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[500] w-[450px] bg-red-950/90 border border-red-500 rounded-xl p-4 shadow-[0_0_50px_rgba(239,68,68,0.4)] backdrop-blur text-center"
          >
            <div className="text-xs uppercase tracking-widest text-red-500 font-black mb-1 animate-pulse">⚠️ AUTONOMOUS AI REROUTE DETECTED ⚠️</div>
            <div className="text-sm font-bold text-white mb-2">{reroutedAlert}</div>
            <div className="text-[10px] text-red-400/80 font-mono">ENABLING CORRIDOR BYPASS • REDIRECTING UPLINK ROUTE FOR SPEED</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Obstruction Warning Banner */}
      <AnimatePresence>
        {reportedObstruction && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -50 }} 
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[500] w-[450px] bg-amber-950/90 border border-amber-500 rounded-xl p-4 shadow-[0_0_50px_rgba(245,158,11,0.4)] backdrop-blur text-center"
          >
            <div className="text-xs uppercase tracking-widest text-amber-500 font-black mb-1 animate-pulse">⚠️ CAUTION: CORRIDOR OBSTRUCTION REPORTED ⚠️</div>
            <div className="text-sm font-bold text-white mb-2">{reportedObstruction.type}: {reportedObstruction.details || 'Bypass operations initiated'}</div>
            <div className="text-[10px] text-amber-400/80 font-mono">AI CORRIDOR RE-ROUTING SYSTEM STANDBY OR ENGAGED</div>
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* Dynamic Mode Configurator (Visible when IDLE) */}
        {activationPhase === 'IDLE' && (
          <HolographicPanel title="Adaptive Corridor Configurations" icon={<Zap className="w-4 h-4" />}>
            <div className="space-y-4 pointer-events-auto">
              {/* Smart Recommendation Banner */}
              <div className="p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 text-[10px] text-blue-300 font-medium">
                <span className="font-bold uppercase tracking-wider text-blue-400 block mb-0.5">System Recommendation</span>
                {recommendationReason}
              </div>

              {/* Selector Grid */}
              <div className="grid grid-cols-2 gap-2 text-[9px] font-bold uppercase tracking-wider">
                {[
                  { id: 'URBAN_CRITICAL', name: 'Urban Critical', desc: '800m range', icon: '🏙️' },
                  { id: 'STANDARD', name: 'Standard Emergency', desc: '1.5km range', icon: '🚑' },
                  { id: 'TRAUMA_HIGHWAY', name: 'Trauma / Highway', desc: '2.3km range', icon: '🛣️' },
                  { id: 'ADAPTIVE_AI', name: 'Adaptive AI', desc: 'Auto-Calculated', icon: '🧠' },
                  { id: 'MANUAL', name: 'Manual Override', desc: 'Custom Radius', icon: '🎛️' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      playBeep('success');
                      setEmergencyMode(mode.id);
                    }}
                    className={`p-2 rounded-lg border transition-all text-left flex flex-col justify-between ${
                      emergencyMode === mode.id 
                        ? 'bg-blue-600/20 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                        : 'bg-black/40 text-white/60 border-white/5 hover:border-white/20'
                    } ${mode.id === 'MANUAL' ? 'col-span-2' : ''}`}
                  >
                    <span className="flex items-center gap-1">
                      <span>{mode.icon}</span>
                      <span>{mode.name}</span>
                    </span>
                    <span className="text-[7.5px] text-white/40 font-normal mt-0.5">{mode.desc}</span>
                  </button>
                ))}
              </div>

              {/* Manual Slider */}
              {emergencyMode === 'MANUAL' && (
                <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-2">
                  <div className="flex justify-between text-[9px] text-white/50 uppercase tracking-widest">
                    <span>Custom Alert Radius</span>
                    <span className="text-blue-400 font-mono font-bold">{manualRadius}m</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="3500"
                    step="100"
                    value={manualRadius}
                    onChange={e => setManualRadius(Number(e.target.value))}
                    className="w-full accent-blue-500 bg-white/10 rounded-lg appearance-none h-1 cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-white/30 font-mono">
                    <span>500m</span>
                    <span>3500m</span>
                  </div>
                </div>
              )}
            </div>
          </HolographicPanel>
        )}

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
                      <p className="text-lg font-bold text-red-500 font-mono relative z-10">{isEmergency && activeRoutePoints === backupRoutePoints ? '08:00' : '11:00'}<span className="text-[10px] text-red-400/50 ml-1">MIN</span></p>
                    </div>
                  </div>
                </div>
              </HolographicPanel>

              {/* Route Stability & Confidence HUD */}
              <HolographicPanel title="Route Stability & Confidence" icon={<Activity className="w-4 h-4" />} glowing>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Route Stability</span>
                    <span className={`font-mono font-bold ${routeStability > 80 ? 'text-green-400' : routeStability > 60 ? 'text-yellow-400' : 'text-red-500'}`}>{routeStability}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className={`h-full transition-all duration-500 ${routeStability > 80 ? 'bg-green-500' : routeStability > 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${routeStability}%` }} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                      <p className="text-[8px] text-white/40 uppercase mb-1">Reroute Prob.</p>
                      <p className="text-xs font-bold text-white font-mono">{rerouteProbability}%</p>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                      <p className="text-[8px] text-white/40 uppercase mb-1">Delay Increase</p>
                      <p className={`text-xs font-bold font-mono ${estimatedDelayIncrease > 0 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>+{estimatedDelayIncrease}m</p>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                      <p className="text-[8px] text-white/40 uppercase mb-1">Pressure Score</p>
                      <p className="text-xs font-bold text-blue-400 font-mono">{emergencyPressureScore}</p>
                    </div>
                  </div>
                </div>
              </HolographicPanel>

              {/* Multi-Route Control Panel */}
              <HolographicPanel title="Multi-Route Preview" icon={<Map className="w-4 h-4" />} glowing>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-1 text-[8px] font-bold uppercase tracking-wider">
                    <button onClick={() => { playBeep('success'); setActiveTab('active'); }} className={`py-1 rounded border ${activeTab === 'active' ? 'bg-blue-600/20 text-white border-blue-500' : 'bg-black/40 text-white/40 border-white/5'}`}>Primary</button>
                    <button onClick={() => { playBeep('success'); setActiveTab('backup'); }} className={`py-1 rounded border ${activeTab === 'backup' ? 'bg-blue-600/20 text-white border-blue-500' : 'bg-black/40 text-white/40 border-white/5'}`}>Janpath</button>
                    <button onClick={() => { playBeep('success'); setActiveTab('fastest'); }} className={`py-1 rounded border ${activeTab === 'fastest' ? 'bg-blue-600/20 text-white border-blue-500' : 'bg-black/40 text-white/40 border-white/5'}`}>Express</button>
                  </div>

                  <div className="p-2.5 rounded bg-black/40 border border-white/5 text-[10px] space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-white/40">Route Name:</span>
                      <span className="text-white font-bold">{activeTab === 'active' ? 'CP Corridor' : activeTab === 'backup' ? 'Janpath Bypass' : 'Ashoka Express'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Est. Travel Time:</span>
                      <span className="text-green-400 font-bold">{activeTab === 'active' ? '11 mins' : activeTab === 'backup' ? '9 mins' : '7 mins'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Traffic Pressure:</span>
                      <span className={`font-bold ${activeTab === 'active' ? 'text-red-400' : activeTab === 'backup' ? 'text-yellow-400' : 'text-green-400'}`}>{activeTab === 'active' ? '78%' : activeTab === 'backup' ? '45%' : '22%'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Corridor Efficiency:</span>
                      <span className="text-blue-400 font-bold">{activeTab === 'active' ? '65%' : activeTab === 'backup' ? '82%' : '94%'}</span>
                    </div>
                  </div>
                </div>
              </HolographicPanel>

              {/* Tactical System Overlays */}
              <HolographicPanel title="Tactical System Overlays" icon={<Settings className="w-4 h-4" />} glowing>
                <div className="grid grid-cols-2 gap-2 text-[9px] font-bold uppercase tracking-wider">
                  <button onClick={() => { playBeep('success'); setShowHeatmap(!showHeatmap); }} className={`p-2 rounded border text-center transition-colors ${showHeatmap ? 'bg-red-600/20 border-red-500 text-white' : 'bg-black/40 border-white/5 text-white/50'}`}>
                    {showHeatmap ? '🔴 Heatmap ON' : '⚫ Heatmap OFF'}
                  </button>
                  <button onClick={() => { playBeep('success'); setIs2DMode(!is2DMode); }} className={`p-2 rounded border text-center transition-colors ${is2DMode ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/40 border-white/5 text-white/50'}`}>
                    {is2DMode ? '🗺️ 2D Tactical' : '📐 3D Holo'}
                  </button>
                </div>
              </HolographicPanel>

              {/* Smart Corridor Alerts Ticker */}
              <HolographicPanel title="Corridor Warning Net" icon={<Radio className="w-4 h-4" />} glowing>
                <div className="text-[9px] font-mono space-y-1.5 h-20 overflow-y-auto custom-scrollbar">
                  {alertFeed.map((alert, index) => (
                    <div key={index} className={`pb-1 border-b border-white/5 ${alert.startsWith('[ALERT]') ? 'text-red-400 font-bold' : alert.startsWith('[SIGNAL]') ? 'text-green-400' : 'text-white/70'}`}>
                      {alert}
                    </div>
                  ))}
                </div>
              </HolographicPanel>

              {/* Live Emergency Corridor Status Panel */}
              <HolographicPanel title="Live Emergency Corridor Status" icon={<Zap className="w-4 h-4" />} glowing>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-2.5 rounded bg-black/40 border border-red-500/20">
                    <div>
                      <p className="text-[9px] text-white/50 uppercase tracking-widest">Active Mode</p>
                      <p className="text-xs font-black text-red-400 uppercase tracking-wider">{emergencyMode.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-white/50 uppercase tracking-widest">Main Radius</p>
                      <p className="text-xs font-mono font-black text-white">{activeCorridorRadius}m</p>
                    </div>
                  </div>

                  {adaptiveReason && (
                    <div className="p-2.5 rounded border border-yellow-500/20 bg-yellow-500/5 text-[9px] text-yellow-400 font-mono">
                      🧠 AI RATIONALE: {adaptiveReason}
                    </div>
                  )}

                  {/* Layer visualization */}
                  <div className="space-y-2">
                    <div className="text-[8px] text-white/40 uppercase tracking-widest font-bold">Active Shield Layers:</div>
                    
                    <div className="flex items-center justify-between text-[10px] bg-black/40 border border-white/5 px-2.5 py-1.5 rounded">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Public Civilians</span>
                      <span className="font-mono font-bold text-white/80">{activePublicRadius}m</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] bg-black/40 border border-white/5 px-2.5 py-1.5 rounded">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Traffic Signals</span>
                      <span className="font-mono font-bold text-white/80">{activeSignalRadius}m</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] bg-black/40 border border-white/5 px-2.5 py-1.5 rounded">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Police Nodes</span>
                      <span className="font-mono font-bold text-white/80">{activePoliceRadius}m</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                     <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                        <p className="text-[8px] text-white/40 uppercase mb-1">Congestion Bypass</p>
                        <p className="text-xs font-bold text-green-400 font-mono">-{estimatedDelayReduction}s</p>
                     </div>
                     <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                        <p className="text-[8px] text-white/40 uppercase mb-1">Corridor ECEI</p>
                        <p className="text-xs font-bold text-blue-400 font-mono">{eceiScore}%</p>
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
