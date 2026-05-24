'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Activity, Clock, ShieldAlert, BarChart2, Radio, Target, UserCheck } from 'lucide-react';
import MapContainer from '@/components/MapContainer';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5005');

export default function ControlRoomDashboard() {
  const [activeSessions, setActiveSessions] = useState([
    { 
      id: '1', 
      unit: 'Unit 42', 
      etaExpected: '10.5m', 
      eceiScore: 82,
      severity: 4, 
      status: 'ACTIVE',
      bottleneck: 'CP Junction',
      bottleneckRisk: 0.65
    }
  ]);

  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

  useEffect(() => {
    // Fetch pending registrations on mount
    fetchPendingUsers();

    socket.on('emergency_alert', (data) => {
      let etaExpected = '10.5m';
      let eceiScore = 75;
      let bottleneck = 'Unknown Node';
      let bottleneckRisk = 0.5;

      if (data.simulation) {
        etaExpected = `${data.simulation.eta.expected}m`;
        eceiScore = data.simulation.eceiScore;
      }
      
      if (data.timeline && data.timeline.length > 0) {
        const highestRisk = [...data.timeline].sort((a,b) => b.bottleneckRisk - a.bottleneckRisk)[0];
        bottleneck = highestRisk.authority;
        bottleneckRisk = highestRisk.bottleneckRisk;
      }

      setActiveSessions(prev => [
        { 
          id: Math.random().toString(), 
          unit: data.unit, 
          etaExpected, 
          eceiScore,
          severity: 5, 
          status: 'ACTIVE',
          bottleneck,
          bottleneckRisk
        },
        ...prev
      ]);
    });

    return () => {
      socket.off('emergency_alert');
    };
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5005/api/auth/pending', { withCredentials: true });
      setPendingUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch pending users');
    }
  };

  const verifyUser = async (targetUserId: string) => {
    try {
      await axios.post('http://localhost:5005/api/auth/verify', { targetUserId }, { withCredentials: true });
      // Remove from list
      setPendingUsers(prev => prev.filter(u => u.id !== targetUserId));
    } catch (err) {
      console.error('Failed to verify user');
    }
  };

  return (
    <div className="h-full flex flex-col xl:flex-row bg-black p-6 gap-6 overflow-hidden">
      {/* Left Panel: Analytics & Sessions */}
      <div className="w-full xl:w-[450px] flex flex-col gap-4 z-10 overflow-y-auto pr-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <Network className="w-5 h-5 text-purple-400" /> City Control Center
        </h2>

        {/* Global KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-panel p-3 rounded-xl border border-white/10">
            <div className="text-[10px] text-white/50 uppercase">Active Units</div>
            <div className="text-xl font-bold text-white">{activeSessions.length}</div>
          </div>
          <div className="glass-panel p-3 rounded-xl border border-white/10">
            <div className="text-[10px] text-white/50 uppercase">Avg System ECEI</div>
            <div className="text-xl font-bold text-green-400">78.4</div>
          </div>
          <div className="glass-panel p-3 rounded-xl border border-white/10">
            <div className="text-[10px] text-white/50 uppercase">Global Risk</div>
            <div className="text-xl font-bold text-yellow-400">MODERATE</div>
          </div>
        </div>

        {/* Pending Verification Panel */}
        {pendingUsers.length > 0 && (
          <div className="mt-2 glass-panel p-4 rounded-xl border border-orange-500/40 bg-orange-500/5">
            <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Pending Access Requests ({pendingUsers.length})
            </h3>
            <div className="space-y-3">
              {pendingUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                  <div>
                    <div className="text-sm text-white font-bold">{user.name}</div>
                    <div className="text-[10px] text-white/50 uppercase">{user.role} | {user.driverId || user.hospitalId}</div>
                  </div>
                  <button 
                    onClick={() => verifyUser(user.id)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition-colors"
                  >
                    VERIFY
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Authority Panel */}
        <div className="mt-2 glass-panel p-4 rounded-xl border border-blue-500/30">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> Create New Authority
          </h3>
          <form className="space-y-2" onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            try {
              await axios.post('http://localhost:5005/api/auth/create-authority', {
                role: form.role.value,
                id: form.authId.value,
                name: form.authName.value,
                password: form.authPassword.value
              }, { withCredentials: true });
              alert('Authority Created Successfully!');
              form.reset();
            } catch (err) {
              alert('Failed to create authority. Ensure ID is unique.');
            }
          }}>
            <div className="flex gap-2">
              <select name="role" className="w-1/3 bg-black/40 border border-white/10 text-xs text-white rounded p-2 focus:outline-none">
                <option value="DRIVER">Driver</option>
                <option value="HOSPITAL">Hospital</option>
                <option value="POLICE">Police</option>
              </select>
              <input name="authId" type="text" placeholder="ID (e.g. DR-400)" required className="w-2/3 bg-black/40 border border-white/10 text-xs text-white rounded p-2 focus:outline-none" />
            </div>
            <input name="authName" type="text" placeholder="Full Name" required className="w-full bg-black/40 border border-white/10 text-xs text-white rounded p-2 focus:outline-none" />
            <div className="flex gap-2">
              <input name="authPassword" type="password" placeholder="Password" required minLength={6} className="w-2/3 bg-black/40 border border-white/10 text-xs text-white rounded p-2 focus:outline-none" />
              <button type="submit" className="w-1/3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors">
                CREATE
              </button>
            </div>
          </form>
        </div>

        <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mt-4 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Live Predictive Corridors
        </h3>
        
        <div className="flex-1 space-y-4">
          <AnimatePresence>
            {activeSessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-panel rounded-2xl p-5 border ${
                  session.severity >= 4 ? 'border-red-500/50' : 'border-blue-500/30'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-white/90 text-lg">{session.unit}</div>
                    <div className="text-xs text-white/50">Priority Level {session.severity}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/50 mb-1">EXP ETA</div>
                    <div className={`font-mono font-bold text-xl ${session.severity >= 4 ? 'text-red-400' : 'text-blue-400'}`}>
                      {session.etaExpected}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-black/30 p-2 rounded border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase">ECEI Score</div>
                    <div className={`text-sm font-bold ${session.eceiScore > 80 ? 'text-green-400' : session.eceiScore > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {session.eceiScore} / 100
                    </div>
                  </div>
                  <div className="bg-black/30 p-2 rounded border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase">Critical Bottleneck</div>
                    <div className="text-xs text-white font-medium truncate">{session.bottleneck}</div>
                    <div className="text-[10px] text-red-400 font-bold">{Math.round(session.bottleneckRisk * 100)}% Failure Risk</div>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="text-xs text-white/60 mb-2 uppercase">Recommended Command Action:</div>
                  <button className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all">
                    FORCE MANUAL OVERRIDE ON BOTTLENECK
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Panel: City Map */}
      <div className="flex-1 rounded-2xl overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <MapContainer activeRoute={true} role="police" />
        
        <div className="absolute top-4 right-4 z-[400] flex gap-2">
          <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur border border-white/10 text-xs font-mono text-white/80 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> SIMULATION ENGINE ACTIVE
          </div>
        </div>
      </div>
    </div>
  );
}
