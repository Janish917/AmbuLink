'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix standard Leaflet icon paths
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const getColoredIcon = (hue: number) => {
  return new L.Icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: `hue-rotate-[${hue}deg] saturate-200`
  });
};

const ambulanceIcons: Record<string, L.Icon> = {
  'Cardiac': new L.Icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [26, 42],
    iconAnchor: [13, 42],
    className: 'hue-rotate-[150deg] saturate-[300%] brightness-110 shadow-lg' // Cyan/Greenish
  }),
  'Trauma': new L.Icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [26, 42],
    iconAnchor: [13, 42],
    className: 'hue-rotate-[0deg] saturate-[300%] brightness-110' // Red
  }),
  'Pediatric': new L.Icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [26, 42],
    iconAnchor: [13, 42],
    className: 'hue-rotate-[240deg] saturate-[300%] brightness-110' // Neon Blue
  }),
  'Standard': new L.Icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [26, 42],
    iconAnchor: [13, 42],
    className: 'hue-rotate-[90deg] saturate-[200%] brightness-100' // Purple
  }),
  'Neonatal': new L.Icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [26, 42],
    iconAnchor: [13, 42],
    className: 'hue-rotate-[290deg] saturate-[300%] brightness-120' // Neon Pink
  })
};

const policeIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [22, 36],
  iconAnchor: [11, 36],
  className: 'hue-rotate-[200deg] saturate-150' // Dark Blue
});

const hospitalIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  className: 'hue-rotate-[120deg] saturate-200 brightness-110' // Green hospital marker
});

const obstructionIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [26, 42],
  iconAnchor: [13, 42],
  className: 'hue-rotate-[330deg] saturate-200 brightness-125' // Bright Neon Red/Orange Alert
});

const signalGreenIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [18, 30],
  iconAnchor: [9, 30],
  className: 'hue-rotate-[140deg] saturate-200' // Cyan / Green held
});

const signalRedIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [18, 30],
  iconAnchor: [9, 30],
  className: 'hue-rotate-[350deg] saturate-200' // Red held
});

const signalNormalIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [18, 30],
  iconAnchor: [9, 30],
  className: 'hue-rotate-[40deg] saturate-150' // Amber / Normal
});

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14.5);
  }, [center, map]);
  return null;
}

export interface MapSector {
  id: string;
  name: string;
  lat: number;
  lng: number;
  density: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  hasPolice: boolean;
}

export interface MapAmbulance {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'EN_ROUTE' | 'ARRIVED' | 'STUCK';
  speed: number;
  eta: number;
  delay: number;
  type: string;
  usingBackup: boolean;
  stabilityScore: number;
  priority: number;
}

export default function SimulatorMap({
  sectors = [],
  blockages = [],
  ambulances = [],
  trafficSignals = [],
  onSelectSector
}: {
  sectors?: MapSector[];
  blockages?: Array<{ id: string, lat: number, lng: number, type: string, details?: string }>;
  ambulances?: MapAmbulance[];
  trafficSignals?: Array<{ lat: number, lng: number, name: string, status: string }>;
  onSelectSector?: (sectorId: string) => void;
}) {
  const defaultCenter: [number, number] = [28.6139, 77.2090]; // CP Delhi Center
  
  // Track center position of map
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);

  // Keep camera centered on first en-route ambulance
  useEffect(() => {
    const activeAmb = ambulances.find(a => a.status === 'EN_ROUTE');
    if (activeAmb) {
      setMapCenter([activeAmb.lat, activeAmb.lng]);
    }
  }, [ambulances]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={14}
      style={{ height: '100%', width: '100%', background: '#02040a' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <MapCenterUpdater center={mapCenter} />

      {/* SECTOR DENSITY HEATMAPS */}
      {sectors.map((sec) => {
        const color = sec.risk === 'HIGH' ? '#f43f5e' : sec.risk === 'MEDIUM' ? '#f59e0b' : '#0ea5e9';
        // Radii scale with density
        const radius = 250 + (sec.density * 2);
        const opacity = 0.08 + (sec.density * 0.0035);

        return (
          <group key={`sector-heat-${sec.id}`}>
            <Circle
              center={[sec.lat, sec.lng]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: opacity,
                weight: sec.hasPolice ? 2 : 0.5,
                dashArray: sec.hasPolice ? '5, 5' : undefined
              }}
              eventHandlers={{
                click: () => onSelectSector && onSelectSector(sec.id)
              }}
            />
            {/* If sector is blocked, render a warning containment ring */}
            {sec.risk === 'HIGH' && sec.density > 80 && (
              <Circle
                center={[sec.lat, sec.lng]}
                radius={180}
                pathOptions={{
                  color: '#f43f5e',
                  fillColor: 'transparent',
                  weight: 1,
                  dashArray: '4, 8'
                }}
              />
            )}
            {/* Police patrol zone indicator */}
            {sec.hasPolice && (
              <Circle
                center={[sec.lat, sec.lng]}
                radius={150}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1,
                  weight: 1
                }}
              />
            )}
          </group>
        );
      })}

      {/* TRAFFIC SIGNAL MARKERS */}
      {trafficSignals.map((sig, idx) => {
        const icon = sig.status === 'GREEN_HELD' ? signalGreenIcon : sig.status === 'RED_HELD' ? signalRedIcon : signalNormalIcon;
        return (
          <Marker
            key={`sig-marker-${idx}`}
            position={[sig.lat, sig.lng]}
            icon={icon}
          >
            <Popup>
              <div className="bg-black/95 text-white p-1 rounded font-mono text-xs">
                <div className="font-bold border-b border-white/10 pb-0.5 mb-1 text-blue-400">{sig.name}</div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/60">Status:</span>
                  <span className={sig.status === 'GREEN_HELD' ? 'text-green-400 font-bold' : sig.status === 'RED_HELD' ? 'text-red-400 font-bold' : 'text-yellow-500'}>
                    {sig.status}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* ROADBLOCKS / OBSTRUCTIONS */}
      {blockages.map((block) => (
        <group key={`blockage-${block.id}`}>
          <Marker
            position={[block.lat, block.lng]}
            icon={obstructionIcon}
          >
            <Popup>
              <div className="bg-black/95 text-white p-1 rounded font-mono text-xs max-w-[200px]">
                <div className="font-bold text-red-500 flex items-center gap-1">⚠️ hazard alert</div>
                <div className="text-[10px] text-white/90 mt-1 uppercase font-bold">{block.type}</div>
                <div className="text-[9px] text-white/60 mt-0.5">{block.details || 'Roadway blocked.'}</div>
              </div>
            </Popup>
          </Marker>
          <Circle
            center={[block.lat, block.lng]}
            radius={180}
            pathOptions={{
              color: '#f43f5e',
              fillColor: '#f43f5e',
              fillOpacity: 0.18,
              weight: 1.5,
              dashArray: '3, 6'
            }}
          />
        </group>
      ))}

      {/* AMBULANCES IN SIMULATION */}
      {ambulances.map((amb) => {
        if (amb.status === 'ARRIVED') return null;
        
        const icon = ambulanceIcons[amb.type] || ambulanceIcons['Standard'];
        const color = amb.usingBackup ? '#c084fc' : '#22d3ee'; // Purple alternate vs Cyan primary

        return (
          <Marker
            key={`amb-marker-${amb.id}`}
            position={[amb.lat, amb.lng]}
            icon={icon}
          >
            <Popup>
              <div className="bg-black/95 text-white p-2 rounded font-mono text-[11px] min-w-[180px]">
                <div className="font-bold border-b border-white/10 pb-1 mb-1 text-cyan-400 flex justify-between">
                  <span>{amb.name}</span>
                  <span className="text-[8px] bg-red-900/50 text-red-300 border border-red-500/30 px-1 rounded">
                    PRIORITY {amb.priority}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-[9px] text-white/70">
                  <span>Status:</span>
                  <span className="font-bold text-white">{amb.status}</span>
                  <span>Speed:</span>
                  <span className="font-bold text-white font-sans">{amb.speed} km/h</span>
                  <span>Live ETA:</span>
                  <span className="font-bold text-yellow-400 font-sans">{amb.eta}m</span>
                  <span>Stability:</span>
                  <span className={amb.stabilityScore > 80 ? 'text-green-400 font-bold' : amb.stabilityScore > 50 ? 'text-yellow-400 font-bold' : 'text-red-500 font-bold'}>
                    {amb.stabilityScore}%
                  </span>
                  <span>Path:</span>
                  <span className="font-bold text-white uppercase">{amb.usingBackup ? 'Bypass' : 'Primary'}</span>
                  <span>Delay:</span>
                  <span className={amb.delay > 0 ? 'text-red-400 font-bold font-sans' : 'text-green-400 font-sans'}>
                    +{amb.delay}s
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* STATIC NODE MARKERS */}
      <Marker position={[28.6250, 77.2250]} icon={hospitalIcon}>
        <Popup>
          <div className="bg-black/95 text-white p-1 rounded font-mono text-xs">
            <div className="font-bold text-green-400">City General Hospital</div>
            <div className="text-[10px] text-white/50">Primary Trauma Care Destination</div>
          </div>
        </Popup>
      </Marker>
      
      <Marker position={[28.6180, 77.2150]} icon={policeIcon}>
        <Popup>
          <div className="bg-black/95 text-white p-1 rounded font-mono text-xs">
            <div className="font-bold text-blue-400">SAPS Operations Command</div>
            <div className="text-[10px] text-white/50">Tactical Control Headquarters</div>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
