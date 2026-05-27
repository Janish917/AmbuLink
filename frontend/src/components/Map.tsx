'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons issue in Next.js
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const ambulanceIcon = new L.Icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hue-rotate-[140deg] saturate-200' // Make it red-ish
});

const policeIcon = new L.Icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hue-rotate-[-30deg] saturate-200' // Make it blue-ish
});

const hospitalIcon = new L.Icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hue-rotate-[90deg] saturate-200' // Make it purple-ish
});

const signalNormalIcon = new L.Icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  className: 'hue-rotate-[30deg] saturate-200' // Yellow-ish
});

const signalGreenIcon = new L.Icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  className: 'hue-rotate-[220deg] saturate-200' // Green-ish
});

const obstructionIcon = new L.Icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hue-rotate-[340deg] saturate-200 brightness-110' // Bright neon red/orange for obstruction alerts
});

// Map Updater Component to change view when props change
function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function Map({
  activeRoute = false,
  role = 'driver',
  markers = [],
  activeRoutePoints,
  backupRoutePoints,
  ambulancePos,
  heatmapData = [],
  trafficSignals = [],
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
  // Use the provided coordinate or fallback to CP Center
  const defaultCenter: [number, number] = [28.6139, 77.2090];
  const [internalAmbulancePos, setInternalAmbulancePos] = useState<[number, number]>(defaultCenter);

  // Default CP route points if none are passed
  const fallbackRoutePoints: [number, number][] = [
    [28.6139, 77.2090],
    [28.6145, 77.2110],
    [28.6160, 77.2140],
    [28.6190, 77.2180],
    [28.6250, 77.2250]
  ];

  const actualRoutePoints = activeRoutePoints || fallbackRoutePoints;

  // Let ambulance travel along path in real time if no static ambulancePos is given
  useEffect(() => {
    if (activeRoute && !ambulancePos) {
      let i = 0;
      const interval = setInterval(() => {
        if (i < actualRoutePoints.length) {
          setInternalAmbulancePos(actualRoutePoints[i]);
          i++;
        } else {
          i = 0; // restart loop
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeRoute, actualRoutePoints, ambulancePos]);

  // Determine center position to lock camera view on
  const centerPosition = ambulancePos || internalAmbulancePos || defaultCenter;

  return (
    <MapContainer 
      center={centerPosition} 
      zoom={15} 
      style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <MapUpdater center={centerPosition} zoom={15} />

      {/* HEATMAP LAYER OVERLAYS */}
      {heatmapData && heatmapData.map((point, index) => {
        const color = point.intensity > 0.8 ? '#ef4444' : point.intensity > 0.5 ? '#f59e0b' : '#3b82f6';
        return (
          <Circle
            key={`heat-${index}`}
            center={[point.lat, point.lng]}
            radius={200}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.25 * point.intensity,
              weight: 0
            }}
          />
        );
      })}

      {/* BACKUP / ALTERNATE ROUTE (Dashed Blue/Purple) */}
      {activeRoute && backupRoutePoints && backupRoutePoints.length > 0 && (
        <Polyline
          positions={backupRoutePoints}
          color="#3b82f6"
          weight={4}
          opacity={0.5}
          dashArray="5, 10"
        />
      )}

      {/* ACTIVE PRIMARY ROUTE (Neon Red/Green depending on preemption status) */}
      {activeRoute && (
        <Polyline 
          positions={actualRoutePoints} 
          color={role === 'police' || role === 'replay' ? '#10b981' : '#ef4444'} 
          weight={6} 
          opacity={0.8}
          dashArray="10, 10"
          className="animate-pulse"
        />
      )}

      {/* AMBULANCE MARKER */}
      {activeRoute && (
        <Marker position={centerPosition} icon={ambulanceIcon}>
          <Popup className="bg-black text-white border border-white/20">
            <div className="font-bold text-red-500">Ambulance Unit 42</div>
            <div className="text-xs">Emergency Code Red</div>
          </Popup>
        </Marker>
      )}

      {/* TRAFFIC SIGNALS / INTERSECTION OVERLAYS */}
      {trafficSignals && trafficSignals.map((sig, idx) => {
        const isGreen = sig.status === 'GREEN_HELD';
        return (
          <Marker 
            key={`sig-${idx}`} 
            position={[sig.lat, sig.lng]} 
            icon={isGreen ? signalGreenIcon : signalNormalIcon}
          >
            <Popup>
              <div className="font-bold text-xs">{sig.name}</div>
              <div className={`text-[10px] font-semibold ${isGreen ? 'text-green-400' : 'text-yellow-500'}`}>
                Status: {isGreen ? 'GREEN HELD' : 'NORMAL SEQUENCE'}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* OBSTRUCTION MARKERS & CAUTION ZONES */}
      {obstructions && obstructions.map((obs, idx) => (
        <group key={`obs-grp-${obs.id || idx}`}>
          <Marker 
            position={[obs.lat, obs.lng]} 
            icon={obstructionIcon}
          >
            <Popup>
              <div className="font-bold text-xs text-red-500">⚠️ Obstruction: {obs.type}</div>
              {obs.details && <div className="text-[10px] text-gray-300 font-semibold">{obs.details}</div>}
            </Popup>
          </Marker>
          <Circle
            center={[obs.lat, obs.lng]}
            radius={150}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.15,
              weight: 1,
              dashArray: '5, 5'
            }}
          />
        </group>
      ))}

      {/* STATIC SEEDED NODES */}
      <Marker position={[28.6250, 77.2250]} icon={hospitalIcon}>
        <Popup>City General Hospital</Popup>
      </Marker>
      <Marker position={[28.6180, 77.2150]} icon={policeIcon}>
        <Popup>Traffic Command Center</Popup>
      </Marker>

      {/* UNSTABLE ZONE CORRIDOR SECTOR OVERLAYS */}
      {activeRoute && stabilityScore !== undefined && stabilityScore < 70 && (
        <Circle
          center={[28.6160, 77.2140]}
          radius={400}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '6, 6'
          }}
        />
      )}

      {/* PULSING HIGH-RISK INTERSECTIONS */}
      {activeRoute && (congestionRisk === 'HIGH' || (stabilityScore !== undefined && stabilityScore < 70)) && trafficSignals.map((sig, idx) => {
        if (sig.status !== 'GREEN_HELD') {
          return (
            <Circle
              key={`pulse-${idx}`}
              center={[sig.lat, sig.lng]}
              radius={100}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.2,
                weight: 1,
                className: 'animate-pulse'
              }}
            />
          );
        }
        return null;
      })}

      {/* CONGESTION SPREAD VISUALIZATION */}
      {activeRoute && congestionRisk === 'HIGH' && (
        <Circle
          center={[28.6160, 77.2140]}
          radius={250}
          pathOptions={{
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.15,
            weight: 0
          }}
        />
      )}

      {/* SUGGESTED ALTERNATIVE CORRIDOR OVERLAY */}
      {activeRoute && backupRoutePoints && backupRoutePoints.length > 0 && stabilityScore !== undefined && stabilityScore < 70 && (
        <Polyline
          positions={backupRoutePoints}
          color="#00c2ff"
          weight={4}
          opacity={0.8}
          dashArray="4, 8"
        />
      )}
    </MapContainer>
  );
}
