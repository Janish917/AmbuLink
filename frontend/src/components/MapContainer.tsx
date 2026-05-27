'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet Map to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-saps-surface-light/50 animate-pulse flex items-center justify-center">
      <div className="text-white/50 font-medium">Initializing Map System...</div>
    </div>
  )
});

export default function MapContainer({
  activeRoute = false,
  role = 'driver',
  markers = [],
  activeRoutePoints,
  backupRoutePoints,
  ambulancePos,
  heatmapData,
  trafficSignals,
  obstructions = [],
  stabilityScore,
  congestionRisk
}: {
  activeRoute?: boolean;
  role?: 'driver' | 'police' | 'replay';
  markers?: Array<{id: string, lat: number, lng: number, type: string}>;
  activeRoutePoints?: [number, number][];
  backupRoutePoints?: [number, number][];
  ambulancePos?: [number, number];
  heatmapData?: Array<{lat: number, lng: number, intensity: number}>;
  trafficSignals?: Array<{lat: number, lng: number, name: string, status: string}>;
  obstructions?: Array<{id: string, lat: number, lng: number, type: string, details?: string | null}>;
  stabilityScore?: number;
  congestionRisk?: string;
}) {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      <MapComponent 
        activeRoute={activeRoute} 
        role={role} 
        markers={markers}
        activeRoutePoints={activeRoutePoints}
        backupRoutePoints={backupRoutePoints}
        ambulancePos={ambulancePos}
        heatmapData={heatmapData}
        trafficSignals={trafficSignals}
        obstructions={obstructions}
        stabilityScore={stabilityScore}
        congestionRisk={congestionRisk}
      />
    </div>
  );
}
