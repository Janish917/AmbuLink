'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix standard Leaflet icon paths
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const ambulanceIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [26, 42],
  iconAnchor: [13, 42],
  popupAnchor: [1, -34],
  className: 'hue-rotate-[180deg] saturate-[250%] brightness-110 shadow-lg animate-bounce' // Neon Cyan/Blue
});

const hospitalNormalIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  className: 'hue-rotate-[120deg] saturate-200 brightness-110' // Green
});

const hospitalHighPressureIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  className: 'hue-rotate-[45deg] saturate-200 brightness-110' // Yellow/Orange
});

const hospitalOverloadedIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  className: 'hue-rotate-[0deg] saturate-[300%] brightness-110 animate-pulse' // Red
});

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

export interface SimulatedHospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icuBedsTotal: number;
  icuBedsOccupied: number;
  traumaBedsTotal: number;
  traumaBedsOccupied: number;
  erQueueLoad: number;
  doctorsAvailable: number;
  doctorsTotal: number;
  surgeryQueueLoad: number;
  status: 'NORMAL' | 'HIGH_PRESSURE' | 'OVERLOADED';
  overloadProbability: number;
  readinessScore: number;
  estimatedIntakeDelay: number;
  inflow: number;
}

export interface HospitalAmbulance {
  id: string;
  name: string;
  currentLat: number;
  currentLng: number;
  status: 'EN_ROUTE' | 'ARRIVED' | 'STUCK';
  speed: number;
  delaySec: number;
  targetHospitalId: string;
  routePoints: [number, number][];
}

export default function HospitalMap({
  hospitals = [],
  ambulance = null,
  onSelectHospital
}: {
  hospitals?: SimulatedHospital[];
  ambulance?: HospitalAmbulance | null;
  onSelectHospital?: (hospitalId: string) => void;
}) {
  const defaultCenter: [number, number] = [28.6139, 77.2090];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);

  // Keep camera centered on active en-route ambulance
  useEffect(() => {
    if (ambulance && ambulance.status === 'EN_ROUTE') {
      setMapCenter([ambulance.currentLat, ambulance.currentLng]);
    }
  }, [ambulance]);

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

      {/* AMBULANCE ROUTE TO RECOVERY PATH */}
      {ambulance && ambulance.status === 'EN_ROUTE' && ambulance.routePoints && (
        <Polyline
          positions={ambulance.routePoints}
          pathOptions={{
            color: '#10b981', // Emerald green representing optimal health-corridor
            weight: 5,
            opacity: 0.85
          }}
        />
      )}

      {/* HOSPITALS LAYER */}
      {hospitals.map((h) => {
        const icon = h.status === 'OVERLOADED' 
          ? hospitalOverloadedIcon 
          : h.status === 'HIGH_PRESSURE' 
            ? hospitalHighPressureIcon 
            : hospitalNormalIcon;

        const color = h.status === 'OVERLOADED'
          ? '#ef4444' // Red
          : h.status === 'HIGH_PRESSURE'
            ? '#fbbf24' // Yellow
            : '#10b981'; // Green

        return (
          <group key={h.id}>
            <Marker
              position={[h.lat, h.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectHospital && onSelectHospital(h.id)
              }}
            >
              <Popup>
                <div className="bg-black/95 text-white p-2.5 rounded font-mono text-[11px] min-w-[200px]">
                  <div className="font-bold border-b border-white/10 pb-1 mb-1 text-emerald-400 flex justify-between">
                    <span>{h.name}</span>
                    <span className={`text-[8px] border px-1 rounded uppercase ${h.status === 'OVERLOADED' ? 'bg-red-900/50 text-red-300 border-red-500/30 animate-pulse' : h.status === 'HIGH_PRESSURE' ? 'bg-yellow-900/50 text-yellow-300 border-yellow-500/30' : 'bg-green-900/50 text-green-300 border-green-500/30'}`}>
                      {h.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 text-[9px] text-white/70 mt-2">
                    <span>ICU Occupancy:</span>
                    <span className="font-bold text-white font-sans">{h.icuBedsOccupied}/{h.icuBedsTotal} ({Math.round((h.icuBedsOccupied/h.icuBedsTotal)*100)}%)</span>
                    
                    <span>Trauma Capacity:</span>
                    <span className="font-bold text-white font-sans">{h.traumaBedsOccupied}/{h.traumaBedsTotal}</span>
                    
                    <span>ER Queue:</span>
                    <span className="font-bold text-white font-sans">{h.erQueueLoad} patient(s)</span>
                    
                    <span>Intake Delay:</span>
                    <span className="font-bold text-yellow-400 font-sans">{Math.round(h.estimatedIntakeDelay / 60)} min</span>
                    
                    <span>AI Readiness:</span>
                    <span className="font-bold text-emerald-400 font-sans">{h.readinessScore}%</span>
                    
                    <span>Active Inflow:</span>
                    <span className="font-bold text-cyan-400 font-sans">{h.inflow} ambulance(s)</span>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-white/5 text-center">
                    <button
                      onClick={() => onSelectHospital && onSelectHospital(h.id)}
                      className="text-[8px] font-bold uppercase tracking-wider text-purple-300 hover:text-white transition-colors"
                    >
                      Trigger Manual Overload
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* Glowing peripheral rings */}
            <Circle
              center={[h.lat, h.lng]}
              radius={280}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: h.status === 'OVERLOADED' ? 0.15 : 0.07,
                weight: h.inflow > 0 ? 2 : 1,
                dashArray: h.status === 'OVERLOADED' ? '3, 6' : undefined
              }}
            />
          </group>
        );
      })}

      {/* AMBULANCE MARKER */}
      {ambulance && ambulance.status === 'EN_ROUTE' && (
        <Marker
          position={[ambulance.currentLat, ambulance.currentLng]}
          icon={ambulanceIcon}
        >
          <Popup>
            <div className="bg-black/95 text-white p-2 rounded font-mono text-[11px] min-w-[160px]">
              <div className="font-bold border-b border-white/10 pb-1 mb-1 text-cyan-400 flex justify-between">
                <span>{ambulance.name}</span>
                <span className="text-[8px] bg-cyan-900/50 text-cyan-300 border border-cyan-500/30 px-1 rounded">
                  TRANSIT
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 text-[9px] text-white/70">
                <span>Speed:</span>
                <span className="font-bold text-white font-sans">{ambulance.speed} km/h</span>
                <span>Transit Delay:</span>
                <span className="font-bold text-red-400 font-sans">+{ambulance.delaySec}s</span>
                <span>Destination:</span>
                <span className="font-bold text-emerald-400 truncate">{hospitals.find(h => h.id === ambulance.targetHospitalId)?.name || 'Loading'}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
