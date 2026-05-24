'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Activity, Navigation, Zap, Map, Radio, Cpu, Bell, Shield, ArrowRight, Server, Globe2, Network, AlertTriangle, Eye, Terminal, Clock, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import CyberAmbulance from '@/components/CyberAmbulance';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, Float, MeshDistortMaterial, Sphere, Line } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ReactLenis } from '@studio-freight/react-lenis';

// ---------------------------------------------------------
// 3D SCENE COMPONENTS
// ---------------------------------------------------------

function CityGrid() {
  const count = 300;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useMemo(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 120;
      const z = (Math.random() - 0.5) * 120;
      const height = Math.random() * 15 + 2;
      
      if (Math.abs(x) < 6) continue;

      dummy.position.set(x, height / 2 - 2, z);
      dummy.scale.set(Math.random() * 3 + 1, height, Math.random() * 3 + 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#03050a" metalness={0.9} roughness={0.1} />
    </instancedMesh>
  );
}

function GlowingPath() {
  const pathRef = useRef<THREE.Mesh>(null);
  const scanlineRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (pathRef.current) {
      (pathRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
        Math.sin(state.clock.elapsedTime * 3) * 2 + 3;
    }
    if (scanlineRef.current) {
      scanlineRef.current.position.z = (state.clock.elapsedTime * 40) % 100 - 50;
    }
  });

  return (
    <group>
      <mesh ref={pathRef} position={[0, -1.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 120]} />
        <meshStandardMaterial color="#ff2d2d" emissive="#ff3131" emissiveIntensity={3} transparent opacity={0.6} />
      </mesh>
      <mesh ref={scanlineRef} position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function Ambulance() {
  const path = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -1.2, -50),
    new THREE.Vector3(0, -1.2, 50)
  ]), []);

  return (
    <CyberAmbulance 
      isEmergency={true} 
      isIdle={false} 
      path={path} 
      speed={0.5} 
      scale={1.5}
    />
  );
}

function Particles() {
  const count = 200;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = Math.random() * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return pos;
  }, [count]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 2;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#00c2ff" transparent opacity={0.6} sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>
  );
}

function SceneContents({ mouse }: { mouse: { x: number, y: number } }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame(() => {
    if (cameraRef.current) {
      cameraRef.current.position.x += (mouse.x * 2 - cameraRef.current.position.x) * 0.05;
      cameraRef.current.position.y += (mouse.y * 1 + 5 - cameraRef.current.position.y) * 0.05;
      cameraRef.current.lookAt(0, 0, -20);
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 5, 20]} fov={50} />
      <color attach="background" args={['#040816']} />
      <fogExp2 attach="fog" args={['#040816', 0.02]} />
      
      <ambientLight intensity={0.1} color="#ffffff" />
      <pointLight position={[10, 20, 10]} intensity={2} color="#00c2ff" />
      <pointLight position={[-10, 10, -10]} intensity={2} color="#ff3131" />
      
      <CityGrid />
      <GlowingPath />
      <Ambulance />
      <Particles />

      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh position={[6, 4, -5]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <MeshDistortMaterial color="#00c2ff" emissive="#00c2ff" emissiveIntensity={3} speed={5} distort={0.6} />
        </mesh>
      </Float>
      <Float speed={3} rotationIntensity={0.8} floatIntensity={2}>
        <mesh position={[-5, 5, -10]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <MeshDistortMaterial color="#ff3131" emissive="#ff3131" emissiveIntensity={4} speed={4} distort={0.7} />
        </mesh>
      </Float>

      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
        <Noise opacity={0.03} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
}

function BackgroundScene({ mouse }: { mouse: { x: number, y: number } }) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas shadows gl={{ antialias: false, powerPreference: "high-performance" }}>
        <SceneContents mouse={mouse} />
      </Canvas>
    </div>
  );
}

// ---------------------------------------------------------
// UI COMPONENTS
// ---------------------------------------------------------

function HolographicCard({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative group p-[1px] rounded-3xl bg-gradient-to-b from-white/10 to-transparent ${className}`}
    >
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-[#00c2ff]/10 to-[#ff3131]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
      <div className="relative h-full bg-[#0b1120]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none" />
        {children}
      </div>
    </motion.div>
  );
}

function StatCounter({ value, label, color, delay }: { value: string, label: string, color: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay, type: "spring" }}
      className="relative p-6 flex flex-col items-center text-center group"
    >
      <div className={`absolute inset-0 bg-${color.split('-')[1]}/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity`} />
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1, delay: delay + 0.5 }}
        className={`text-5xl lg:text-7xl font-black mb-2 tracking-tighter ${color} drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]`}
      >
        {value}
      </motion.div>
      <div className="text-xs lg:text-sm uppercase tracking-[0.2em] text-white/50 font-medium">
        {label}
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const opacityParallax = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <ReactLenis root>
      <main className="min-h-screen bg-[#040816] text-white selection:bg-[#ff3131]/30 overflow-hidden relative font-sans">
        <BackgroundScene mouse={mouse} />

        {/* Cinematic Grain Overlay */}
        <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

        {/* Navigation */}
        <nav className="fixed w-full z-50 px-6 py-5 flex items-center justify-between bg-gradient-to-b from-[#040816] to-transparent">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-[#ff3131]/10 border border-[#ff3131]/20 group-hover:border-[#ff3131]/50 group-hover:bg-[#ff3131]/20 transition-all duration-500 shadow-[0_0_20px_rgba(255,49,49,0.2)]">
              <ShieldAlert className="w-6 h-6 text-[#ff3131] group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div>
              <div className="font-black tracking-widest text-xl text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">SAPS</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#00c2ff]">System Online</div>
            </div>
          </div>
          <div className="flex gap-6 items-center">
            <Link href="/login" className="text-xs tracking-widest uppercase font-bold text-white/50 hover:text-white transition-colors relative group">
              Command Login
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#00c2ff] group-hover:w-full transition-all duration-300" />
            </Link>
            <Link href="/dashboard" className="relative group px-8 py-3 rounded-full overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00c2ff]/20 to-[#ff3131]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative text-xs tracking-widest font-bold uppercase flex items-center gap-3">
                Access Terminal <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
              </span>
            </Link>
          </div>
        </nav>

        {/* HERO SECTION */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 px-6 z-10 perspective-1000">
          <motion.div 
            style={{ y: yParallax, opacity: opacityParallax, rotateX: mouse.y * 5, rotateY: mouse.x * 5 }} 
            className="text-center max-w-6xl mx-auto flex flex-col items-center"
          >
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="flex items-center gap-3 px-5 py-2 rounded-full border border-[#00c2ff]/30 bg-[#00c2ff]/10 backdrop-blur-xl mb-12 shadow-[0_0_30px_rgba(0,194,255,0.2)]"
            >
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00c2ff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00c2ff]"></span>
              </div>
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#00c2ff]">AI Traffic Grid Active</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-7xl md:text-9xl lg:text-[10rem] font-black tracking-tighter mb-8 leading-[0.85]"
            >
              <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">SILENT</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#ff4d4d] via-[#ff3131] to-[#ff4d4d] drop-shadow-[0_0_40px_rgba(255,49,49,0.5)]">AMBULANCE</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white/90 to-white/20">PATH SYSTEM</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="text-xl md:text-2xl text-white/50 max-w-3xl mx-auto mb-16 font-medium leading-relaxed tracking-wide"
            >
              Military-grade AI traffic coordination. Forcing zero-delay emergency response through dynamic smart-city synchronization.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full sm:w-auto"
            >
              <Link href="/dashboard/driver" className="w-full sm:w-auto">
                <button className="relative w-full group px-10 py-5 bg-[#ff3131] rounded-full font-black tracking-widest uppercase transition-all overflow-hidden flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(255,49,49,0.4)] hover:shadow-[0_0_80px_rgba(255,49,49,0.6)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  <Zap className="w-6 h-6 text-white" /> 
                  <span>Initiate Emergency</span>
                </button>
              </Link>
              <Link href="/dashboard/police" className="w-full sm:w-auto">
                <button className="group w-full px-10 py-5 rounded-full font-bold tracking-widest uppercase transition-all border border-white/20 bg-white/5 backdrop-blur-xl hover:bg-white/10 flex items-center justify-center gap-4 hover:border-white/40">
                  <Terminal className="w-6 h-6 text-[#00c2ff]" /> 
                  <span>Access Terminal</span>
                </button>
              </Link>
            </motion.div>
          </motion.div>
          
          {/* Scroll Indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <div className="text-[10px] uppercase tracking-widest text-white/30">System Overview</div>
            <div className="w-[1px] h-12 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
          </motion.div>
        </section>

        {/* CINEMATIC METRICS SECTION */}
        <section className="relative z-20 bg-gradient-to-b from-transparent via-[#050810] to-[#050810] pt-32 pb-20">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <StatCounter value="0.8s" label="AI Path Calc" color="text-[#00c2ff]" delay={0} />
            <StatCounter value="42%" label="Faster Response" color="text-[#ff3131]" delay={0.2} />
            <StatCounter value="78%" label="Traffic Reduction" color="text-white" delay={0.4} />
            <StatCounter value="24/7" label="Autonomous Mon" color="text-green-400" delay={0.6} />
          </div>
        </section>

        {/* SMART CITY NETWORK */}
        <section className="relative z-20 max-w-7xl mx-auto px-6 py-32">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2 space-y-8">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 text-[#00c2ff] font-bold tracking-[0.2em] uppercase text-sm mb-4"
              >
                <Network className="w-5 h-5" /> Sub-System Integration
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-5xl md:text-6xl font-black tracking-tight"
              >
                Living City <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00c2ff] to-blue-600">Nervous System</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-xl text-white/50 leading-relaxed font-light"
              >
                SAPS transforms municipal infrastructure into an intelligent, reactive entity. From traffic signals to police dispatch, every node works autonomously to guarantee a frictionless emergency corridor.
              </motion.p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-8">
                <HolographicCard delay={0.3} className="!p-6">
                  <Server className="w-8 h-8 text-[#00c2ff] mb-4" />
                  <h4 className="text-lg font-bold mb-2">Signal Preemption</h4>
                  <p className="text-sm text-white/50">Direct link to traffic lights, forcing green corridors miles ahead.</p>
                </HolographicCard>
                <HolographicCard delay={0.4} className="!p-6">
                  <Globe2 className="w-8 h-8 text-purple-500 mb-4" />
                  <h4 className="text-lg font-bold mb-2">Global Tracking</h4>
                  <p className="text-sm text-white/50">Sub-second latency GPS syncing across all active emergency units.</p>
                </HolographicCard>
              </div>
            </div>

            <div className="lg:w-1/2 w-full aspect-square relative rounded-full border border-white/5 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00c2ff]/10 to-transparent rounded-full blur-3xl animate-pulse" />
              {/* Abstract Radar UI */}
              <div className="absolute w-[80%] h-[80%] rounded-full border border-white/10" />
              <div className="absolute w-[60%] h-[60%] rounded-full border border-white/10" />
              <div className="absolute w-[40%] h-[40%] rounded-full border border-white/20" />
              <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#00c2ff]/50 to-transparent animate-[spin_4s_linear_infinite]" />
              
              <Activity className="w-12 h-12 text-[#00c2ff] relative z-10" />
              
              {/* Nodes */}
              <div className="absolute top-[20%] left-[20%] w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_red] animate-ping" />
              <div className="absolute bottom-[30%] right-[25%] w-2 h-2 bg-green-500 rounded-full shadow-[0_0_15px_green]" />
              <div className="absolute top-[40%] right-[15%] w-2 h-2 bg-[#00c2ff] rounded-full shadow-[0_0_15px_#00c2ff]" />
            </div>
          </div>
        </section>

        {/* REAL-TIME COMMAND DASHBOARD */}
        <section className="relative z-20 py-32 bg-[#02040a]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-24">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-5xl md:text-7xl font-black mb-6"
              >
                Tactical <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff3131] to-orange-500">Oversight</span>
              </motion.h2>
              <p className="text-xl text-white/50 max-w-3xl mx-auto">A unified, glassmorphic command center providing real-time analytics, routing heatmaps, and autonomous incident management.</p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, type: "spring", stiffness: 50 }}
              className="rounded-[2.5rem] border border-white/10 bg-[#080d1a]/80 backdrop-blur-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] relative"
            >
              {/* Dashboard Header */}
              <div className="h-16 border-b border-white/5 bg-white/5 flex items-center justify-between px-8">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff3131] shadow-[0_0_10px_#ff3131]"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-sm font-mono text-white/40 tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4" /> SECURE UPLINK ESTABLISHED
                </div>
                <div className="flex gap-4">
                  <Clock className="w-4 h-4 text-white/40" />
                  <BarChart2 className="w-4 h-4 text-white/40" />
                </div>
              </div>
              
              {/* Dashboard Body */}
              <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Main Map Area */}
                <div className="lg:col-span-8 rounded-3xl bg-[#03050a] border border-white/5 aspect-video relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity transition-transform duration-1000 group-hover:scale-105"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#040816] via-transparent to-transparent"></div>
                  
                  {/* Grid Overlay */}
                  <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
                  
                  {/* Animated Route Line */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <motion.path 
                      d="M 10,90 C 20,60 50,70 90,20" 
                      fill="none" 
                      stroke="url(#route-gradient)" 
                      strokeWidth="0.8"
                      strokeDasharray="2 1"
                      className="animate-[dash_10s_linear_infinite]"
                    />
                    <defs>
                      <linearGradient id="route-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ff3131" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#ff3131" stopOpacity="1" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Marker */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[20%] right-[10%] flex flex-col items-center"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-[#ff3131] blur-md animate-pulse"></div>
                      <Navigation className="w-10 h-10 text-white relative z-10 drop-shadow-xl" />
                    </div>
                    <div className="mt-4 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-center">
                      <div className="text-xs text-white/50 font-bold uppercase tracking-widest mb-1">Unit Alpha-7</div>
                      <div className="text-xl font-black text-[#ff3131]">ETA 3m 42s</div>
                    </div>
                  </motion.div>
                </div>
                
                {/* Sidebar Metrics */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                      <Activity className="w-5 h-5 text-green-400" />
                      <div className="text-sm font-bold tracking-widest uppercase">System Status</div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs text-white/50 mb-2">
                          <span>Traffic Flow</span>
                          <span className="text-[#00c2ff]">Optimal</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#00c2ff] w-[85%]"></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-white/50 mb-2">
                          <span>Node Latency</span>
                          <span className="text-green-400">12ms</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 w-[95%]"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-6 rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#ff3131]/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-3 mb-6">
                      <AlertTriangle className="w-5 h-5 text-[#ff3131]" />
                      <div className="text-sm font-bold tracking-widest uppercase">Live Event Feed</div>
                    </div>
                    <div className="space-y-4 relative z-10">
                      {[
                        { time: "14:02:11", msg: "Intersection Clear: 5th & Main", type: "success" },
                        { time: "14:03:45", msg: "Traffic Anomaly Detected", type: "warning" },
                        { time: "14:04:10", msg: "Route Recalculated. Saving 42s.", type: "info" },
                        { time: "14:05:00", msg: "Approaching Destination Zone", type: "success" }
                      ].map((evt, i) => (
                        <div key={i} className="flex gap-4 text-sm items-start border-b border-white/5 pb-3">
                          <span className="text-white/30 font-mono text-xs mt-0.5">{evt.time}</span>
                          <span className={`font-medium ${evt.type === 'success' ? 'text-green-400' : evt.type === 'warning' ? 'text-yellow-400' : 'text-[#00c2ff]'}`}>
                            {evt.msg}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="relative z-20 border-t border-white/5 bg-[#02040a] pt-24 pb-12">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <ShieldAlert className="w-8 h-8 text-[#ff3131]" />
                <span className="text-2xl font-black tracking-widest">SAPS</span>
              </div>
              <p className="text-white/40 max-w-sm leading-relaxed">
                Building the foundational infrastructure for autonomous, zero-delay emergency response across modern smart cities.
              </p>
            </div>
            <div>
              <h5 className="font-bold tracking-widest uppercase text-white mb-6 text-sm">System</h5>
              <ul className="space-y-4 text-white/50 text-sm">
                <li className="hover:text-white cursor-pointer transition-colors">Command Interface</li>
                <li className="hover:text-white cursor-pointer transition-colors">API Documentation</li>
                <li className="hover:text-white cursor-pointer transition-colors">Node Network</li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold tracking-widest uppercase text-white mb-6 text-sm">Status</h5>
              <div className="flex items-center gap-3 text-sm text-white/50">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_green] animate-pulse"></div>
                All Systems Operational
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-xs text-white/30 tracking-wider">
              © 2026 AmbuLink Infrastructure. Next-Gen Response.
            </div>
            <div className="flex gap-6">
              <Cpu className="w-5 h-5 text-white/30 hover:text-white cursor-pointer transition-colors" />
              <Eye className="w-5 h-5 text-white/30 hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>
        </footer>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes dash {
            to {
              stroke-dashoffset: -100;
            }
          }
          @keyframes shimmer {
            100% {
              transform: translateX(100%);
            }
          }
        `}} />
      </main>
    </ReactLenis>
  );
}
