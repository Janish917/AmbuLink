'use client';

import { useState, useEffect } from 'react';
import { Users, UserX, Clock, ShieldCheck, ShieldAlert, CheckCircle, AlertTriangle, XCircle, Search, Edit2, Check, RefreshCw } from 'lucide-react';
import axios from 'axios';

type Driver = {
  id: string;
  name: string;
  driverId: string;
  phone: string | null;
  email: string | null;
  ambulanceNumber: string | null;
  verificationStatus: string;
  employmentStatus: string;
  shiftType: string;
  shiftStart: string;
  shiftEnd: string;
  joinedAt: string;
  resignedAt: string | null;
  lastLogin: string | null;
  emergencyCount: number;
};

export default function WorkforcePage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');

  // Edit modal / inline edit state
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [editShiftType, setEditShiftType] = useState('MORNING');
  const [editShiftStart, setEditShiftStart] = useState('06:00');
  const [editShiftEnd, setEditShiftEnd] = useState('14:00');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('http://localhost:5005/api/workforce/drivers', { withCredentials: true });
      setDrivers(res.data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.data?.error === 'User not found') {
        window.location.href = '/login';
        return;
      }
      setError(err.response?.data?.error || 'Failed to fetch workforce data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await axios.patch(`http://localhost:5005/api/workforce/driver/${id}/status`, { status: newStatus }, { withCredentials: true });
      // Update local state
      setDrivers(prev => prev.map(d => {
        if (d.id === id) {
          return { 
            ...d, 
            employmentStatus: newStatus,
            resignedAt: newStatus === 'resigned' ? new Date().toISOString() : null
          };
        }
        return d;
      }));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update employment status');
    }
  };

  const handleUpdateShift = async (id: string) => {
    try {
      await axios.patch(`http://localhost:5005/api/workforce/driver/${id}/shift`, {
        shiftType: editShiftType,
        shiftStart: editShiftStart,
        shiftEnd: editShiftEnd
      }, { withCredentials: true });
      
      // Update local state
      setDrivers(prev => prev.map(d => {
        if (d.id === id) {
          return {
            ...d,
            shiftType: editShiftType,
            shiftStart: editShiftStart,
            shiftEnd: editShiftEnd
          };
        }
        return d;
      }));
      setEditingDriverId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update shift timings');
    }
  };

  const startEditShift = (driver: Driver) => {
    setEditingDriverId(driver.id);
    setEditShiftType(driver.shiftType);
    setEditShiftStart(driver.shiftStart);
    setEditShiftEnd(driver.shiftEnd);
  };

  const selectPresetShift = (type: string) => {
    setEditShiftType(type);
    if (type === 'MORNING') {
      setEditShiftStart('06:00');
      setEditShiftEnd('14:00');
    } else if (type === 'EVENING') {
      setEditShiftStart('14:00');
      setEditShiftEnd('22:00');
    } else if (type === 'NIGHT') {
      setEditShiftStart('22:00');
      setEditShiftEnd('06:00');
    }
  };

  // Filtered drivers list
  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.driverId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || d.employmentStatus === statusFilter.toLowerCase();
    const matchesShift = shiftFilter === 'ALL' || d.shiftType === shiftFilter;
    const matchesVerification = verificationFilter === 'ALL' || d.verificationStatus === verificationFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesShift && matchesVerification;
  });

  // KPI calculations
  const totalDrivers = drivers.length;
  const activeCount = drivers.filter(d => d.employmentStatus === 'active' && d.verificationStatus === 'verified').length;
  const pendingCount = drivers.filter(d => d.verificationStatus === 'pending').length;
  
  const morningDuty = drivers.filter(d => d.employmentStatus === 'active' && d.shiftType === 'MORNING').length;
  const eveningDuty = drivers.filter(d => d.employmentStatus === 'active' && d.shiftType === 'EVENING').length;
  const nightDuty = drivers.filter(d => d.employmentStatus === 'active' && d.shiftType === 'NIGHT').length;

  return (
    <div className="min-h-screen bg-black p-6 space-y-6 text-white overflow-y-auto">
      
      {/* Header Panel */}
      <div className="flex justify-between items-center pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40">
            Workforce Management
          </h1>
          <p className="text-xs text-white/50 tracking-wider">Driver History & Smart-City Emergency Shift Scheduling</p>
        </div>
        <button 
          onClick={fetchDrivers} 
          className="p-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className="w-4 h-4" /> Refresh System
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-mono text-xs">
          SYSTEM ERROR: {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#0a0a10]/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-blue-500/5 rounded-full blur-xl" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Active Crew</p>
              <h3 className="text-3xl font-black text-white mt-2 font-mono">{activeCount} <span className="text-xs text-white/40 font-normal">/ {totalDrivers}</span></h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20"><Users className="w-5 h-5" /></div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#0a0a10]/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-yellow-500/5 rounded-full blur-xl" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Verification Pending</p>
              <h3 className="text-3xl font-black text-yellow-400 mt-2 font-mono">{pendingCount}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"><ShieldAlert className="w-5 h-5" /></div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#0a0a10]/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-purple-500/5 rounded-full blur-xl" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Active Shift Distribution</p>
              <div className="flex gap-4 mt-3 text-[10px] font-mono text-white/70">
                <div>🌅 M: <span className="text-purple-400 font-bold">{morningDuty}</span></div>
                <div>🌇 E: <span className="text-purple-400 font-bold">{eveningDuty}</span></div>
                <div>🌃 N: <span className="text-purple-400 font-bold">{nightDuty}</span></div>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20"><Clock className="w-5 h-5" /></div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#0a0a10]/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-green-500/5 rounded-full blur-xl" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Total Emergencies Completed</p>
              <h3 className="text-3xl font-black text-green-400 mt-2 font-mono">
                {drivers.reduce((acc, d) => acc + d.emergencyCount, 0)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20"><ShieldCheck className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      {/* Search & Filters Panel */}
      <div className="p-4 rounded-xl border border-white/5 bg-[#07070b]/60 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30"><Search className="w-4 h-4" /></div>
          <input 
            type="text" 
            placeholder="Search driver name or ID..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-white/30"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Employment: Active</option>
            <option value="SUSPENDED">Employment: Suspended</option>
            <option value="RESIGNED">Employment: Resigned</option>
            <option value="REMOVED">Employment: Removed</option>
          </select>

          <select 
            value={shiftFilter} 
            onChange={e => setShiftFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-white/30"
          >
            <option value="ALL">All Shifts</option>
            <option value="MORNING">Morning Shift</option>
            <option value="EVENING">Evening Shift</option>
            <option value="NIGHT">Night Shift</option>
          </select>

          <select 
            value={verificationFilter} 
            onChange={e => setVerificationFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:border-white/30"
          >
            <option value="ALL">All Verifications</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Workforce Table */}
      <div className="rounded-2xl border border-white/5 bg-[#07070b]/60 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-white/30 font-mono text-sm">
            INITIALIZING WORKFORCE DATA LINK...
          </div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-16 text-white/30 font-mono text-sm uppercase tracking-wider">
            No drivers registered yet
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="text-center py-16 text-white/30 font-mono text-sm uppercase tracking-wider">
            No drivers matching search criteria
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[9px] uppercase tracking-widest text-white/40">
                  <th className="py-4 px-6">Driver details</th>
                  <th className="py-4 px-4">Shift timings</th>
                  <th className="py-4 px-4">Verification</th>
                  <th className="py-4 px-4">Employment</th>
                  <th className="py-4 px-4">Emergencies</th>
                  <th className="py-4 px-4">joined / resigned</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredDrivers.map(driver => {
                  const isEditing = editingDriverId === driver.id;
                  
                  return (
                    <tr key={driver.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Name & ID */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-white tracking-wide">{driver.name}</div>
                        <div className="text-[10px] text-white/40 font-mono mt-0.5">Driver ID: {driver.driverId}</div>
                        <div className="text-[10px] text-white/40 font-mono">{driver.phone || 'No phone'}</div>
                      </td>

                      {/* Shift Timing */}
                      <td className="py-4 px-4">
                        {isEditing ? (
                          <div className="space-y-2 py-1">
                            <div className="flex gap-1.5">
                              {['MORNING', 'EVENING', 'NIGHT'].map(type => (
                                <button 
                                  key={type}
                                  onClick={() => selectPresetShift(type)}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-colors ${editShiftType === type ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-transparent text-white/40 border-white/10'}`}
                                >
                                  {type[0]}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-1 text-[9px] font-mono">
                              <input 
                                value={editShiftStart} 
                                onChange={e => setEditShiftStart(e.target.value)} 
                                className="w-10 bg-black border border-white/10 text-center rounded p-0.5 text-white/80" 
                              />
                              <span className="text-white/30 mt-0.5">-</span>
                              <input 
                                value={editShiftEnd} 
                                onChange={e => setEditShiftEnd(e.target.value)} 
                                className="w-10 bg-black border border-white/10 text-center rounded p-0.5 text-white/80" 
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-white/90 text-[10px] tracking-wider uppercase">
                              {driver.shiftType || 'MORNING'}
                            </div>
                            <div className="text-[10px] text-white/40 font-mono mt-0.5">
                              ⏱ {driver.shiftStart || '06:00'} - {driver.shiftEnd || '14:00'}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1.5 w-max ${
                          driver.verificationStatus === 'verified'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : driver.verificationStatus === 'rejected'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {driver.verificationStatus === 'verified' && <CheckCircle className="w-3 h-3" />}
                          {driver.verificationStatus === 'rejected' && <XCircle className="w-3 h-3" />}
                          {driver.verificationStatus === 'pending' && <AlertTriangle className="w-3 h-3 animate-pulse" />}
                          {driver.verificationStatus}
                        </span>
                      </td>

                      {/* Employment Status */}
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1.5 w-max ${
                          driver.employmentStatus === 'active'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : driver.employmentStatus === 'suspended'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : driver.employmentStatus === 'resigned'
                            ? 'bg-white/5 text-white/40 border-white/10'
                            : 'bg-red-950/20 text-red-500 border-red-500/20'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            driver.employmentStatus === 'active' ? 'bg-blue-400 animate-pulse' :
                            driver.employmentStatus === 'suspended' ? 'bg-amber-400' :
                            driver.employmentStatus === 'resigned' ? 'bg-white/30' : 'bg-red-500'
                          }`} />
                          {driver.employmentStatus}
                        </span>
                      </td>

                      {/* Emergency Count */}
                      <td className="py-4 px-4 font-mono font-bold text-white/80">
                        🚨 {driver.emergencyCount}
                      </td>

                      {/* Dates */}
                      <td className="py-4 px-4 text-[10px] font-mono text-white/50">
                        <div>J: {new Date(driver.joinedAt).toLocaleDateString()}</div>
                        {driver.resignedAt && (
                          <div className="text-red-400 mt-0.5">R: {new Date(driver.resignedAt).toLocaleDateString()}</div>
                        )}
                        <div className="text-white/30 mt-0.5">L: {driver.lastLogin ? new Date(driver.lastLogin).toLocaleTimeString() : 'Never'}</div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex gap-2 justify-end">
                          {isEditing ? (
                            <button 
                              onClick={() => handleUpdateShift(driver.id)}
                              className="p-2 rounded bg-green-600 hover:bg-green-500 text-white font-bold transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => startEditShift(driver)}
                              className="p-2 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 hover:border-white/10 transition-colors"
                              title="Edit Shift"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <select 
                            value={driver.employmentStatus} 
                            onChange={e => handleUpdateStatus(driver.id, e.target.value)}
                            className="bg-[#0f0f15]/80 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/80 focus:outline-none focus:border-white/30 transition-all hover:bg-black/90 cursor-pointer"
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="resigned">Resigned</option>
                            <option value="removed">Removed</option>
                          </select>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
