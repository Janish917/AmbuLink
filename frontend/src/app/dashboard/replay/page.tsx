'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Rewind, FastForward, Activity, BarChart2 } from 'lucide-react';
import MapContainer from '@/components/MapContainer';

export default function RouteReplayDashboard() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(30);

  return (
    <div className="h-full flex flex-col bg-black p-6 gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-400" /> Route Replay & Analytics
        </h2>
        <div className="px-3 py-1 rounded bg-white/10 text-white/70 text-sm">
          Session ID: #EMR-9823-A
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Analytics Panel */}
        <div className="w-full lg:w-[350px] flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Post-Trip Analysis</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">Estimated Time</span>
                  <span className="text-white">12m 30s</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-full" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">Actual Time (Corridor Active)</span>
                  <span className="text-green-400">8m 15s</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[65%]" />
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/10">
                <div className="text-2xl font-bold text-white mb-1">34%</div>
                <div className="text-xs text-white/50">Time saved vs standard routing</div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Node Interactions</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">Signals Held Green</span>
                <span className="font-bold text-white">4</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">Avg Police ACK Time</span>
                <span className="font-bold text-white">14s</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">Nodes Bypassed</span>
                <span className="font-bold text-white">0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map & Timeline Replay */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 rounded-2xl overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <MapContainer activeRoute={isPlaying} role="police" />
          </div>

          {/* Player Controls */}
          <div className="h-24 glass-panel rounded-2xl border border-white/10 p-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <Rewind className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 rounded-full bg-white text-black hover:bg-white/90 transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
              </button>
              <button className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <FastForward className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <div className="flex justify-between text-xs text-white/50 font-mono">
                <span>00:00</span>
                <span>08:15</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full cursor-pointer relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow cursor-grab"
                  style={{ left: `calc(${progress}% - 8px)` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
