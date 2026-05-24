'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Activity, Eye, EyeOff, Loader2, KeyRound, Lock, ShieldCheck, Cpu, Terminal, Scan, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Canvas, useFrame } from '@react-three/fiber';
import { PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

type RoleType = 'DRIVER' | 'HOSPITAL' | 'POLICE' | null;
type AuthStatus = 'idle' | 'authenticating' | 'success' | 'error';

// ---------------------------------------------------------
// 3D SCENE
// ---------------------------------------------------------

function HolographicParticles({ color }: { color: string }) {
  const count = 500;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50 - 20;
    }
    return pos;
  }, [count]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      pointsRef.current.rotation.z = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <PointMaterial size={0.1} color={color} transparent opacity={0.6} sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>
  );
}

function SceneContents({ mouse, roleColor, authStatus }: { mouse: { x: number, y: number }, roleColor: string, authStatus: AuthStatus }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Shift colors based on auth status
  let targetColorHex = roleColor;
  if (authStatus === 'success') targetColorHex = '#10b981'; // Green
  if (authStatus === 'error') targetColorHex = '#ef4444'; // Red

  const targetColor = new THREE.Color(targetColorHex);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += (mouse.x * 0.2 - groupRef.current.rotation.y) * 0.05;
      groupRef.current.rotation.x += (mouse.y * 0.2 - groupRef.current.rotation.x) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} color={targetColor} intensity={authStatus === 'authenticating' ? 4 : 2} distance={100} />
      
      {/* Digital Grid Floor */}
      <gridHelper args={[100, 100, '#ffffff', targetColor]} position={[0, -10, -20]} rotation={[0, 0, 0]} material-opacity={0.1} material-transparent />
      <gridHelper args={[100, 100, '#ffffff', targetColor]} position={[0, 10, -20]} rotation={[0, 0, 0]} material-opacity={0.05} material-transparent />
      
      <HolographicParticles color={targetColorHex} />
    </group>
  );
}

// ---------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------

export default function LoginPage() {
  const [activeRole, setActiveRole] = useState<RoleType>(null);
  const [hoveredRole, setHoveredRole] = useState<RoleType>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Controlled Inputs
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nonce, setNonce] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Cinematic States
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');
  const [loadingText, setLoadingText] = useState('Establishing Secure Connection...');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const router = useRouter();

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

  const resetForm = () => {
    setUserId('');
    setPassword('');
    setName('');
    setNonce('');
    setOtp('');
    setNewPassword('');
    setErrorMsg('');
    setSuccessMsg('');
    setAuthStatus('idle');
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) return setErrorMsg('Please enter your Terminal ID first');
    
    setErrorMsg(''); 
    setAuthStatus('authenticating');
    setLoadingText('Requesting Uplink OTP...');

    try {
      const res = await axios.post('http://localhost:5005/api/auth/forgot-password', { role: activeRole, id: userId });
      alert(`SYSTEM OTP GENERATED: ${res.data.otp}`);
      setSuccessMsg('OTP has been dispatched. Enter it below.');
      setOtpSent(true);
      setAuthStatus('idle');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to generate OTP');
      setAuthStatus('error');
      setTimeout(() => setAuthStatus('idle'), 2000);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!otp || !newPassword) return setErrorMsg('Please enter Security Code and New Passkey');

    setErrorMsg(''); 
    setAuthStatus('authenticating');
    setLoadingText('Verifying Protocol Override...');

    try {
      await axios.post('http://localhost:5005/api/auth/reset-password', { role: activeRole, id: userId, otp, newPassword });
      setSuccessMsg('Protocol Override Successful. You can now login.');
      setIsForgotPassword(false); 
      setOtpSent(false); 
      setOtp(''); 
      setNewPassword('');
      setAuthStatus('success');
      setTimeout(() => setAuthStatus('idle'), 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Override Failed');
      setAuthStatus('error');
      setTimeout(() => setAuthStatus('idle'), 2000);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId || !password) {
      setErrorMsg('Terminal ID and Passkey are required.');
      setAuthStatus('error');
      setTimeout(() => setAuthStatus('idle'), 2000);
      return;
    }

    setErrorMsg(''); 
    setSuccessMsg(''); 
    setAuthStatus('authenticating');
    setLoadingText('Initiating Secure Tunnel...');

    try {
      if (isRegistering) {
        setLoadingText('Registering Node Protocol...');
        await axios.post('http://localhost:5005/api/auth/register', {
          role: activeRole, id: userId, name: name, password: password, nonce: nonce
        });
        setSuccessMsg('Node registered! Pending AI verification.');
        setIsRegistering(false); 
        setPassword(''); 
        setNonce(''); 
        setName('');
        setAuthStatus('success');
        setTimeout(() => setAuthStatus('idle'), 2000);
      } else {
        // Simulated AI Loading Phases for cinematic effect
        setTimeout(() => setLoadingText('Bypassing Node Security...'), 400);
        setTimeout(() => setLoadingText('AI Verification Running...'), 800);

        const response = await axios.post('http://localhost:5005/api/auth/login', {
          role: activeRole, id: userId, password: password
        }, { withCredentials: true });
        
        setAuthStatus('success');
        setLoadingText('Access Granted. Tunnel Active.');
        
        // Wait for cinematic success animation before redirect
        setTimeout(() => {
          const { user } = response.data;
          if (user.role === 'DRIVER') router.push('/dashboard/driver');
          else if (user.role === 'HOSPITAL') router.push('/dashboard/hospital');
          else if (user.role === 'POLICE') router.push('/dashboard/police');
          else router.push('/dashboard');
        }, 1200);
      }
    } catch (err: any) {
      setAuthStatus('error');
      setErrorMsg(err.response?.data?.error || 'Authorization Failed: Invalid Credentials');
      
      // Reset after glitch
      setTimeout(() => {
        setAuthStatus('idle');
      }, 1500);
    }
  };

  const roles = [
    { 
      id: 'DRIVER', title: 'Ambulance Driver', icon: <Activity className="w-10 h-10" />, placeholder: 'DR12345',
      color: '#ff3131',
      classes: { border: 'border-[#ff3131]/50', bgIcon: 'bg-[#ff3131]/20', textIcon: 'text-[#ff3131]', btn: 'bg-[#ff3131] hover:bg-[#ff4d4d]', shadow: 'shadow-[0_0_30px_rgba(255,49,49,0.3)]' }
    },
    { 
      id: 'HOSPITAL', title: 'Hospital Command', icon: <ShieldCheck className="w-10 h-10" />, placeholder: 'HOSP99',
      color: '#9b5cff',
      classes: { border: 'border-[#9b5cff]/50', bgIcon: 'bg-[#9b5cff]/20', textIcon: 'text-[#9b5cff]', btn: 'bg-[#9b5cff] hover:bg-[#b07eff]', shadow: 'shadow-[0_0_30px_rgba(155,92,255,0.3)]' }
    },
    { 
      id: 'POLICE', title: 'Traffic Police', icon: <Scan className="w-10 h-10" />, placeholder: 'POLICE1',
      color: '#00c2ff',
      classes: { border: 'border-[#00c2ff]/50', bgIcon: 'bg-[#00c2ff]/20', textIcon: 'text-[#00c2ff]', btn: 'bg-[#00c2ff] hover:bg-[#33ceff]', shadow: 'shadow-[0_0_30px_rgba(0,194,255,0.3)]' }
    },
  ];

  const currentRoleConfig = roles.find(r => r.id === (hoveredRole || activeRole)) || { color: '#ffffff' };

  return (
    <div className="min-h-screen bg-[#050816] flex flex-col items-center justify-center relative overflow-hidden font-sans py-12 px-4 perspective-1000">
      
      {/* 3D Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }} gl={{ alpha: true }}>
          <SceneContents mouse={mouse} roleColor={currentRoleConfig.color} authStatus={authStatus} />
        </Canvas>
      </div>

      {/* Cinematic Scanline Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] mix-blend-overlay" />
      <div className="absolute top-0 left-0 w-full h-1 bg-white/20 blur-sm animate-[scan_6s_linear_infinite] z-0 pointer-events-none" />

      {/* Full-screen Success/Error Overlay */}
      <AnimatePresence>
        {authStatus === 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 pointer-events-none bg-green-500/10 mix-blend-overlay" />
        )}
        {authStatus === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 pointer-events-none bg-red-500/20 mix-blend-overlay" />
        )}
      </AnimatePresence>

      <motion.div 
        style={{ rotateX: mouse.y * 2, rotateY: mouse.x * 2 }}
        className="w-full max-w-6xl relative z-10 flex flex-col items-center"
      >
        {/* Header */}
        <div className="text-center mb-16 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
            <Cpu className="w-4 h-4 text-white/50" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold">Secure Access Gateway</span>
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ml-2 ${authStatus === 'error' ? 'bg-red-500' : 'bg-green-500'}`} />
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-4xl md:text-6xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] mb-2 relative"
          >
            SAPS Authorization
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-white/40 tracking-[0.4em] text-sm md:text-base font-light uppercase"
          >
            {authStatus === 'authenticating' ? 'Awaiting AI Clearance...' : 'Select Your Operational Node'}
          </motion.p>
        </div>

        {/* Role Cards */}
        <div className="w-full flex flex-col md:flex-row gap-8 justify-center items-stretch h-full">
          {roles.map((r, idx) => {
            const isActive = activeRole === r.id;
            const isHovered = hoveredRole === r.id;
            
            return (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 40 }}
                animate={authStatus === 'error' && isActive ? { x: [-10, 10, -10, 10, 0] } : { opacity: 1, y: 0, x: 0 }}
                transition={{ duration: authStatus === 'error' ? 0.4 : 0.8, delay: authStatus === 'error' ? 0 : idx * 0.1, type: authStatus === 'error' ? "tween" : "spring", stiffness: 100 }}
                onMouseEnter={() => setHoveredRole(r.id as RoleType)}
                onMouseLeave={() => setHoveredRole(null)}
                onClick={() => {
                  if (!isActive && authStatus !== 'authenticating') {
                    setActiveRole(r.id as RoleType);
                    resetForm();
                    setIsRegistering(false);
                    setIsForgotPassword(false);
                  }
                }}
                className={`relative rounded-[2rem] border transition-all duration-500 overflow-hidden cursor-pointer group ${
                  isActive 
                    ? `flex-[2.5] ${authStatus === 'error' ? 'border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.4)]' : authStatus === 'success' ? 'border-green-500/80 shadow-[0_0_50px_rgba(16,185,129,0.4)]' : r.classes.border} ${r.classes.shadow} bg-[#080d1a]/90 backdrop-blur-3xl` 
                    : `flex-1 border-white/10 hover:${r.classes.border} bg-[#080d1a]/40 backdrop-blur-xl opacity-70 hover:opacity-100 hover:-translate-y-2 hover:shadow-2xl`
                }`}
              >
                {/* Status Glow Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-b opacity-0 transition-opacity duration-500 ${isHovered || isActive ? 'opacity-10' : ''}`} 
                     style={{ 
                       backgroundImage: `linear-gradient(to bottom, ${authStatus === 'error' && isActive ? '#ef4444' : authStatus === 'success' && isActive ? '#10b981' : r.color}22, transparent)` 
                     }} 
                />
                
                {/* Abstract Data Rings */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 border border-white/5 rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 border border-white/5 rounded-full pointer-events-none group-hover:scale-105 transition-transform duration-700 delay-100" />

                {/* Card Header */}
                <div className="p-8 flex flex-col items-center justify-center text-center relative z-10 h-full pointer-events-none">
                  <motion.div 
                    layout="position"
                    className={`p-5 rounded-2xl mb-6 relative overflow-hidden transition-colors duration-500 ${authStatus === 'error' && isActive ? 'text-red-500 bg-red-500/20' : authStatus === 'success' && isActive ? 'text-green-500 bg-green-500/20' : r.classes.textIcon} ${isActive || isHovered ? (authStatus === 'error' || authStatus === 'success' ? '' : r.classes.bgIcon) : 'bg-white/5'}`}
                  >
                    <div className="relative z-10">
                      {authStatus === 'error' && isActive ? <AlertTriangle className="w-10 h-10" /> : authStatus === 'success' && isActive ? <CheckCircle2 className="w-10 h-10" /> : r.icon}
                    </div>
                    {(isActive || isHovered) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent mix-blend-overlay animate-[spin_2s_linear_infinite]" />
                    )}
                  </motion.div>
                  <motion.h2 layout="position" className="text-xl font-bold tracking-widest text-white uppercase">{r.title}</motion.h2>
                  
                  {!isActive && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-[10px] uppercase tracking-widest text-white/30 font-bold group-hover:text-white/50 transition-colors">
                      Click to Access <ArrowRight className="inline w-3 h-3 ml-1" />
                    </motion.div>
                  )}

                  {/* Form Content */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }} 
                        className="w-full mt-8 pt-8 border-t border-white/10 pointer-events-auto"
                      >
                        <form onSubmit={isForgotPassword ? handleResetPassword : onSubmit} className="space-y-5 text-left relative z-20">
                          
                          {/* Register Fields */}
                          <AnimatePresence mode="popLayout">
                            {isRegistering && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-5 overflow-hidden">
                                <div>
                                  <label className="block text-[10px] font-bold text-white/50 mb-2 uppercase tracking-[0.2em]">Auth Nonce</label>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="w-4 h-4 text-white/30" /></div>
                                    <input value={nonce} onChange={e => setNonce(e.target.value)} type="text" placeholder="SAPS-AUTH-2026" className="w-full bg-black/50 border border-white/10 text-white text-sm rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-white/30 transition-colors" disabled={authStatus === 'authenticating'} />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-white/50 mb-2 uppercase tracking-[0.2em]">Operator Name</label>
                                  <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="John Doe" className="w-full bg-black/50 border border-white/10 text-white text-sm rounded-xl py-3 px-4 focus:outline-none focus:border-white/30 transition-colors" disabled={authStatus === 'authenticating'} />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* ID Field */}
                          <div>
                            <label className="block text-[10px] font-bold text-white/50 mb-2 uppercase tracking-[0.2em]">Terminal ID</label>
                            <div className="relative">
                              {!isRegistering && !isForgotPassword && <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Terminal className="w-4 h-4 text-white/30" /></div>}
                              <input value={userId} onChange={e => setUserId(e.target.value)} required type="text" placeholder={r.placeholder} className={`w-full bg-black/50 border ${authStatus === 'error' ? 'border-red-500/50' : 'border-white/10'} text-white text-sm rounded-xl py-3 pr-4 focus:outline-none focus:border-white/30 transition-colors ${isRegistering || isForgotPassword ? 'pl-4' : 'pl-10'}`} disabled={authStatus === 'authenticating'} />
                            </div>
                          </div>

                          {/* Forgot Password OTP Flow */}
                          <AnimatePresence mode="popLayout">
                            {isForgotPassword && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-5 mt-5 overflow-hidden">
                                {!otpSent ? (
                                  <button type="button" onClick={handleForgotPassword} disabled={authStatus === 'authenticating'} className="w-full py-3 bg-white/5 text-white rounded-xl text-xs font-bold border border-white/10 hover:bg-white/10 transition-colors tracking-widest uppercase disabled:opacity-50">
                                    Request Uplink OTP
                                  </button>
                                ) : (
                                  <>
                                    <div>
                                      <label className="block text-[10px] font-bold text-white/50 mb-2 uppercase tracking-[0.2em]">Security Code</label>
                                      <input value={otp} onChange={e => setOtp(e.target.value)} type="text" placeholder="123456" className="w-full bg-black/50 border border-white/10 text-white text-lg rounded-xl py-3 px-4 text-center tracking-[0.5em] font-mono focus:outline-none focus:border-white/30" disabled={authStatus === 'authenticating'} />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-white/50 mb-2 uppercase tracking-[0.2em]">New Passkey</label>
                                      <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="••••••••••••" className="w-full bg-black/50 border border-white/10 text-white text-sm rounded-xl py-3 px-4 focus:outline-none focus:border-white/30" disabled={authStatus === 'authenticating'} />
                                    </div>
                                    <button type="submit" disabled={authStatus === 'authenticating'} className="w-full py-4 bg-white text-black rounded-xl text-sm font-black transition-all mt-4 tracking-widest uppercase disabled:opacity-50">
                                      Verify Protocol
                                    </button>
                                  </>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Password Field */}
                          <AnimatePresence mode="popLayout">
                            {!isForgotPassword && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <label className="block text-[10px] font-bold text-white/50 mb-2 uppercase tracking-[0.2em]">{isRegistering ? 'Set Passkey' : 'Passkey'}</label>
                                <div className="relative">
                                  <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••••••" className={`w-full bg-black/50 border ${authStatus === 'error' ? 'border-red-500/50' : 'border-white/10'} text-white text-sm rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-white/30 transition-colors`} disabled={authStatus === 'authenticating'} />
                                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/60 transition-colors" disabled={authStatus === 'authenticating'}>
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Messages & Loading Phase */}
                          <AnimatePresence mode="popLayout">
                            {authStatus === 'authenticating' && (
                               <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col items-center justify-center gap-2 mt-4 bg-white/5 border border-white/10 rounded-xl p-4">
                                 <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
                                   <div className="absolute top-0 left-0 h-full w-1/2 bg-white/50 animate-[scan_1s_ease-in-out_infinite]" />
                                 </div>
                                 <span className="text-xs font-mono tracking-widest text-white/70 uppercase text-center mt-2">{loadingText}</span>
                               </motion.div>
                            )}
                            {errorMsg && authStatus !== 'authenticating' && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl text-center font-mono tracking-wide">{errorMsg}</motion.div>}
                            {successMsg && authStatus !== 'authenticating' && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-4 rounded-xl text-center font-mono tracking-wide">{successMsg}</motion.div>}
                          </AnimatePresence>

                          {/* Action Button */}
                          {!isForgotPassword && (
                            <button type="submit" disabled={authStatus === 'authenticating' || authStatus === 'success'} className={`relative group w-full py-4 mt-6 rounded-xl font-black text-sm tracking-widest uppercase transition-all overflow-hidden flex items-center justify-center gap-3 ${authStatus === 'success' ? 'bg-green-500' : authStatus === 'error' ? 'bg-red-500' : r.classes.btn} text-white disabled:opacity-80`}>
                              {authStatus !== 'authenticating' && authStatus !== 'success' && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
                              
                              {authStatus === 'authenticating' ? (
                                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                              ) : authStatus === 'success' ? (
                                <span className="relative z-10 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Authorized</span>
                              ) : (
                                <span className="relative z-10">{isRegistering ? 'Register Node' : 'Establish Connection'}</span>
                              )}
                            </button>
                          )}

                          {/* Footer Links */}
                          <div className="pt-6 mt-4 border-t border-white/5 flex justify-between gap-4">
                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsRegistering(!isRegistering); setIsForgotPassword(false); setOtpSent(false); setErrorMsg(''); }} disabled={authStatus === 'authenticating'} className="text-[10px] text-white/40 hover:text-white transition-colors uppercase tracking-[0.2em] font-bold disabled:opacity-50">
                              {isRegistering ? '← Return' : 'New Operator'}
                            </button>
                            {!isRegistering && (
                              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsForgotPassword(!isForgotPassword); setOtpSent(false); setErrorMsg(''); }} disabled={authStatus === 'authenticating'} className="text-[10px] text-white/40 hover:text-white transition-colors uppercase tracking-[0.2em] font-bold disabled:opacity-50">
                                {isForgotPassword ? 'Cancel Override' : 'System Override'}
                              </button>
                            )}
                          </div>

                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { left: -50%; }
          100% { left: 100%; }
        }
      `}} />
    </div>
  );
}
