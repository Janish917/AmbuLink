'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Rewind, FastForward, Activity, BarChart2, ShieldAlert, Navigation, Calendar, Award, RefreshCw, Cpu, ChevronRight, Download } from 'lucide-react';
import MapContainer from '@/components/MapContainer';
import axios from 'axios';
import polyline from '@mapbox/polyline';

interface CompletedSession {
  id: string;
  driverId: string;
  status: string;
  severity: number;
  createdAt: string;
  driver?: {
    name: string;
    driverId: string;
  };
  emergencyMode: string;
}

interface TelemetryLog {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  congestionLevel: number;
  timestamp: string;
}

interface RerouteHistory {
  id: string;
  reason: string;
  oldRoutePoints: string;
  newRoutePoints: string;
  oldEta: number;
  newEta: number;
  timestamp: string;
}

interface EmergencyEventLog {
  id: string;
  eventType: string;
  description: string;
  timestamp: string;
}

export default function RouteReplayDashboard() {
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([]);
  const [rerouteHistory, setRerouteHistory] = useState<RerouteHistory[]>([]);
  const [eventLogs, setEventLogs] = useState<EmergencyEventLog[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [obstructionReports, setObstructionReports] = useState<any[]>([]);

  const [activeRoutePoints, setActiveRoutePoints] = useState<[number, number][]>([]);
  const [backupRoutePoints, setBackupRoutePoints] = useState<[number, number][]>([]);
  
  // Playback Control States
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [progressIndex, setProgressIndex] = useState<number>(0);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load list of historical sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get('http://localhost:5005/api/emergency/sessions');
      // Filter out completed or mock completed sessions
      const completed = res.data.filter((s: any) => s.status === 'COMPLETED');
      setSessions(completed);
      if (completed.length > 0) {
        setSelectedSessionId(completed[0].id);
      }
    } catch (err) {
      console.error('Failed to load completed sessions:', err);
    }
  };

  // Load replay data for selected session
  useEffect(() => {
    if (selectedSessionId) {
      fetchReplayData(selectedSessionId);
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [selectedSessionId]);

  const fetchReplayData = async (id: string) => {
    try {
      setIsPlaying(false);
      setProgressIndex(0);
      const res = await axios.get(`http://localhost:5005/api/emergency/replay/sessions/${id}/replay`);
      // Fallback to original endpoint if customized route isn't hit
      const data = res.data;
      
      setSessionDetails(data.session);
      setTelemetryLogs(data.session.telemetryLogs || []);
      setRerouteHistory(data.session.rerouteHistory || []);
      setEventLogs(data.session.eventLogs || []);
      setAnalytics(data.analytics);
      setObstructionReports(data.session.obstructionReports || []);

      // Decode Polylines
      if (data.session.originalRoutePolyline) {
        setActiveRoutePoints(polyline.decode(data.session.originalRoutePolyline) as [number, number][]);
      } else if (data.session.routePolyline) {
        setActiveRoutePoints(polyline.decode(data.session.routePolyline) as [number, number][]);
      }
      
      if (data.session.backupRoutePolyline) {
        setBackupRoutePoints(polyline.decode(data.session.backupRoutePolyline) as [number, number][]);
      } else {
        setBackupRoutePoints([]);
      }
    } catch (err) {
      // Try fallback to base route if path nested incorrectly
      try {
        const resFallback = await axios.get(`http://localhost:5005/api/emergency/sessions/${id}/replay`);
        const data = resFallback.data;
        setSessionDetails(data.session);
        setTelemetryLogs(data.session.telemetryLogs || []);
        setRerouteHistory(data.session.rerouteHistory || []);
        setEventLogs(data.session.eventLogs || []);
        setAnalytics(data.analytics);
        setObstructionReports(data.session.obstructionReports || []);

        if (data.session.originalRoutePolyline) {
          setActiveRoutePoints(polyline.decode(data.session.originalRoutePolyline) as [number, number][]);
        }
        if (data.session.backupRoutePolyline) {
          setBackupRoutePoints(polyline.decode(data.session.backupRoutePolyline) as [number, number][]);
        }
      } catch (e) {
        console.error('Failed to load replay details:', e);
      }
    }
  };

  // Telemetry simulation player timer
  useEffect(() => {
    if (isPlaying && telemetryLogs.length > 0) {
      playbackTimerRef.current = setInterval(() => {
        setProgressIndex(prev => {
          if (prev >= telemetryLogs.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500 / playbackSpeed);
    } else {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, telemetryLogs, playbackSpeed]);

  const handleExport = async () => {
    try {
      const response = await axios({
        url: `http://localhost:5005/api/emergency/sessions/${selectedSessionId}/export`,
        method: 'POST',
        responseType: 'blob', // Important
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mission-replay-${selectedSessionId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  // Determine current active coordinates based on play timeline
  const currentTelemetry = telemetryLogs[progressIndex] || null;
  const currentCoords: [number, number] = currentTelemetry 
    ? [currentTelemetry.lat, currentTelemetry.lng] 
    : (activeRoutePoints[0] || [28.6139, 77.2090]);

  // Evolving heatmap based on elapsed progress coordinates
  const evolvedHeatmap = telemetryLogs.slice(0, progressIndex + 1).map(log => ({
    lat: log.lat,
    lng: log.lng,
    intensity: log.congestionLevel / 100.0,
  }));

  // Evolving preempted traffic signals based on timelines
  const evolvedSignals = [
    { lat: 28.6145, lng: 77.2110, name: 'Connaught Place Signal 1', status: progressIndex >= 2 ? 'GREEN_HELD' : 'NORMAL' },
    { lat: 28.6160, lng: 77.2140, name: 'Connaught Place Signal 2', status: progressIndex >= 4 ? 'GREEN_HELD' : 'NORMAL' },
    { lat: 28.6190, lng: 77.2180, name: 'Connaught Place Signal 3', status: progressIndex >= 8 ? 'GREEN_HELD' : 'NORMAL' }
  ];

  // Filters visible event logs matching elapsed progress index
  const visibleEventLogs = eventLogs.filter((log) => {
    if (!currentTelemetry) return false;
    return new Date(log.timestamp).getTime() <= new Date(currentTelemetry.timestamp).getTime();
  });

  const visibleObstructions = obstructionReports.filter((obs) => {
    if (!currentTelemetry) return false;
    return new Date(obs.createdAt).getTime() <= new Date(currentTelemetry.timestamp).getTime();
  });

  return (
    <div className="h-full flex flex-col bg-[#03050a] p-6 gap-6 text-white overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-400" /> Mission Analytics & Replay Center
          </h2>
          <p className="text-[10px] text-white/50 font-mono mt-0.5">TACTICAL AFTER-ACTION DEBRIEFING SYSTEM</p>
        </div>

        <div className="flex gap-3 pointer-events-auto">
          {/* Mission Select Dropdown */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedSessionId}
              onChange={e => setSelectedSessionId(e.target.value)}
              className="bg-transparent text-xs text-white outline-none border-none cursor-pointer focus:ring-0"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id} className="bg-[#0c0f16]">
                  {s.driver?.name || 'Unit 42'} • Mode: {s.emergencyMode} ({new Date(s.createdAt).toLocaleTimeString()})
                </option>
              ))}
              {sessions.length === 0 && (
                <option className="bg-[#0c0f16]">No Missions Completed Yet</option>
              )}
            </select>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={!selectedSessionId}
            className="flex items-center gap-2 bg-blue-600/90 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/30 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(59,130,246,0.2)]"
          >
            <Download className="w-3.5 h-3.5" /> Export Mission Report
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Left Control Room Sidebar (KPIs, Comparison, Log) */}
        <div className="w-full lg:w-[400px] flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-10">
          {/* Historical Metrics KPI */}
          {analytics && (
            <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <Award className="w-4 h-4" /> AI Performance Score
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl text-center">
                  <p className="text-[8px] text-white/40 uppercase mb-1">Time Saved</p>
                  <p className="text-lg font-bold text-green-400 font-mono">
                    -{Math.round(analytics.delayPreventedSec / 60)}m {analytics.delayPreventedSec % 60}s
                  </p>
                </div>
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl text-center">
                  <p className="text-[8px] text-white/40 uppercase mb-1">ECEI Score</p>
                  <p className="text-lg font-bold text-blue-400 font-mono">{analytics.averageEfficiency}%</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-white/5 text-xs">
                <div className="flex justify-between text-white/60">
                  <span>Reroutes Executed:</span>
                  <span className="font-bold text-white font-mono">{analytics.reroutesCount}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Average Signal Wait:</span>
                  <span className="font-bold text-white font-mono">{analytics.signalResponseSpeedSec}s</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Hospital Prep Time:</span>
                  <span className="font-bold text-white font-mono">{analytics.hospitalPrepTimeSec}s</span>
                </div>
              </div>
            </div>
          )}

          {/* Path Comparison Pane */}
          {sessionDetails && (
            <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Route Comparison
              </h3>

              <div className="space-y-3">
                {/* Primary Route */}
                <div className="p-3 rounded-xl bg-red-950/10 border border-red-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-red-400">Primary CP Route</span>
                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-[9px] border border-red-500/20">CONGESTED</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-white/60 font-mono">
                    <div>ETA: 11 mins</div>
                    <div>Efficiency: 65%</div>
                  </div>
                </div>

                {/* AI Reroute Bypass */}
                {analytics && analytics.reroutesCount > 0 && (
                  <div className="p-3 rounded-xl bg-green-950/10 border border-green-500/20 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-green-400">Janpath AI Bypass</span>
                      <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-[9px] border border-green-500/20 animate-pulse">OPTIMIZED</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-white/60 font-mono">
                      <div>ETA: {sessionDetails.etaExpected || 8} mins</div>
                      <div>Efficiency: 82%</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Obstructions Panel */}
          {visibleObstructions.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl border border-red-500/30 bg-red-950/10 space-y-3">
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 animate-pulse" /> Active Obstructions
              </h3>
              <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                {visibleObstructions.map((obs) => (
                  <div key={obs.id} className="text-xs bg-red-950/20 border border-red-500/20 p-2.5 rounded-lg flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 animate-ping shrink-0" />
                    <div>
                      <div className="font-bold text-red-400 font-mono text-[10px]">{obs.type}</div>
                      {obs.details && <div className="text-[10px] text-white/80 mt-0.5">{obs.details}</div>}
                      <div className="text-[8px] text-white/40 mt-1 font-mono">{new Date(obs.createdAt).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tactical Event Log Timeline */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 flex-1 flex flex-col gap-4 overflow-hidden">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
              <Cpu className="w-4 h-4 text-blue-400" /> System Replay Events
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {visibleEventLogs.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs bg-black/40 border border-white/5 p-2.5 rounded-lg">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      log.eventType === 'REROUTE_ENGAGED' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 
                      log.eventType === 'SIGNAL_PREEMPTED' ? 'bg-blue-500' : 'bg-white/40'
                    }`} />
                    <div className="w-px flex-1 bg-white/10 mt-1" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-mono text-[9px] text-white/40">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    <div className="font-bold text-white/95">{log.eventType.replace('_', ' ')}</div>
                    <div className="text-white/60 text-[10px]">{log.description}</div>
                  </div>
                </div>
              ))}

              {visibleEventLogs.length === 0 && (
                <div className="text-center text-white/30 py-8 text-xs font-mono">
                  PLAYBACK NOT STARTED.
                  <br/>AWAITING TIMELINE EVENTS.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Replay View (Map + scrubbing controls) */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Leaflet Map Viewer */}
          <div className="flex-1 rounded-2xl overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <MapContainer 
              activeRoute={telemetryLogs.length > 0} 
              role="replay" 
              activeRoutePoints={activeRoutePoints}
              backupRoutePoints={backupRoutePoints}
              ambulancePos={currentCoords}
              heatmapData={evolvedHeatmap}
              trafficSignals={evolvedSignals}
              obstructions={visibleObstructions}
            />

            {/* Overlaid stats HUD */}
            {currentTelemetry && (
              <div className="absolute bottom-4 left-4 z-[400] bg-black/80 border border-white/10 rounded-xl p-4 flex gap-6 backdrop-blur shadow-2xl">
                <div>
                  <p className="text-[8px] text-white/40 uppercase mb-0.5">Speed</p>
                  <p className="text-lg font-mono font-bold text-white">{Math.round(currentTelemetry.speed)} <span className="text-[10px] text-white/40">KM/H</span></p>
                </div>
                <div className="w-px h-10 bg-white/15" />
                <div>
                  <p className="text-[8px] text-white/40 uppercase mb-0.5">Heading</p>
                  <p className="text-lg font-mono font-bold text-white">{Math.round(currentTelemetry.heading)}°</p>
                </div>
                <div className="w-px h-10 bg-white/15" />
                <div>
                  <p className="text-[8px] text-white/40 uppercase mb-0.5">Congestion Load</p>
                  <p className={`text-lg font-mono font-bold ${
                    currentTelemetry.congestionLevel > 80 ? 'text-red-500' : currentTelemetry.congestionLevel > 50 ? 'text-yellow-400' : 'text-green-400'
                  }`}>{currentTelemetry.congestionLevel}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline playback HUD controls */}
          <div className="glass-panel rounded-2xl border border-white/10 p-5 flex items-center gap-6">
            <div className="flex items-center gap-2 pointer-events-auto">
              <button 
                onClick={() => setPlaybackSpeed(prev => Math.max(1, prev / 2))}
                className="p-2 rounded-lg border border-white/5 bg-black/40 hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                title="Decrease speed"
              >
                <Rewind className="w-4 h-4" />
              </button>
              
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-[0_0_20px_rgba(59,130,246,0.4)]"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button 
                onClick={() => setPlaybackSpeed(prev => Math.min(8, prev * 2))}
                className="p-2 rounded-lg border border-white/5 bg-black/40 hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                title="Increase speed"
              >
                <FastForward className="w-4 h-4" />
              </button>
              
              <span className="text-[10px] font-mono text-blue-400 font-bold ml-1 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                {playbackSpeed}x SPEED
              </span>
            </div>

            {/* Scrubbing slider */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex justify-between text-[10px] text-white/40 font-mono">
                <span>00:00 (START)</span>
                <span>MISSION ELAPSED TIMELINE</span>
                <span>{telemetryLogs.length > 0 ? `${telemetryLogs.length - 1} SEC (END)` : '00:00'}</span>
              </div>
              
              <div className="w-full relative flex items-center group">
                <input
                  type="range"
                  min="0"
                  max={telemetryLogs.length > 0 ? telemetryLogs.length - 1 : 0}
                  value={progressIndex}
                  onChange={e => {
                    setProgressIndex(Number(e.target.value));
                    setIsPlaying(false); // Pause on scrub
                  }}
                  className="w-full accent-blue-500 bg-white/10 rounded-lg appearance-none h-1.5 cursor-pointer relative z-10"
                />
                
                {/* Event Markers Overlay pins along slider */}
                {telemetryLogs.length > 0 && eventLogs.map((log, index) => {
                  const eventTime = new Date(log.timestamp).getTime();
                  const startTime = new Date(telemetryLogs[0].timestamp).getTime();
                  const endTime = new Date(telemetryLogs[telemetryLogs.length - 1].timestamp).getTime();
                  const fraction = (eventTime - startTime) / (endTime - startTime);
                  
                  if (isNaN(fraction) || fraction < 0 || fraction > 1) return null;

                  return (
                    <div 
                      key={`marker-${index}`}
                      className={`absolute w-2 h-2 rounded-full -translate-y-1/2 top-1/2 z-20 pointer-events-none border border-black ${
                        log.eventType === 'REROUTE_ENGAGED' ? 'bg-green-500' : 
                        log.eventType === 'SIGNAL_PREEMPTED' ? 'bg-blue-400' : 'bg-yellow-500'
                      }`}
                      style={{ left: `calc(${fraction * 100}% - 4px)` }}
                      title={log.description}
                    />
                  );
                })}

                {/* Obstruction Markers Overlay pins along slider */}
                {telemetryLogs.length > 0 && obstructionReports.map((obs, index) => {
                  const obsTime = new Date(obs.createdAt).getTime();
                  const startTime = new Date(telemetryLogs[0].timestamp).getTime();
                  const endTime = new Date(telemetryLogs[telemetryLogs.length - 1].timestamp).getTime();
                  const fraction = (obsTime - startTime) / (endTime - startTime);
                  
                  if (isNaN(fraction) || fraction < 0 || fraction > 1) return null;

                  return (
                    <div 
                      key={`obs-marker-${index}`}
                      className="absolute w-2.5 h-2.5 rounded-full -translate-y-1/2 top-1/2 z-30 pointer-events-none border border-black bg-red-600 animate-pulse shadow-[0_0_8px_#ef4444]"
                      style={{ left: `calc(${fraction * 100}% - 5px)` }}
                      title={`[OBSTRUCTION] ${obs.type}: ${obs.details || ''}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}} />
    </div>
  );
}
