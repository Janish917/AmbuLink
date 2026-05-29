'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const vehicleIcons: Record<string, L.Icon> = {
  'Cardiac Arrest': new L.Icon({
    iconUrl, iconRetinaUrl, shadowUrl,
    iconSize: [26, 42], iconAnchor: [13, 42],
    className: 'hue-rotate-[140deg] saturate-[300%] brightness-110 shadow-2xl' // Cyan/Greenish
  }),
  'Severe Trauma': new L.Icon({
    iconUrl, iconRetinaUrl, shadowUrl,
    iconSize: [26, 42], iconAnchor: [13, 42],
    className: 'hue-rotate-[0deg] saturate-[300%] brightness-110' // Red
  }),
  'Stroke Emergency': new L.Icon({
    iconUrl, iconRetinaUrl, shadowUrl,
    iconSize: [26, 42], iconAnchor: [13, 42],
    className: 'hue-rotate-[240deg] saturate-[300%] brightness-110' // Neon Blue
  }),
  'ICU Transfer': new L.Icon({
    iconUrl, iconRetinaUrl, shadowUrl,
    iconSize: [26, 42], iconAnchor: [13, 42],
    className: 'hue-rotate-[90deg] saturate-[200%] brightness-100' // Purple
  }),
  'Highway Collision': new L.Icon({
    iconUrl, iconRetinaUrl, shadowUrl,
    iconSize: [26, 42], iconAnchor: [13, 42],
    className: 'hue-rotate-[290deg] saturate-[300%] brightness-120' // Neon Pink
  }),
  'Non-Critical Transport': new L.Icon({
    iconUrl, iconRetinaUrl, shadowUrl,
    iconSize: [26, 42], iconAnchor: [13, 42],
    className: 'hue-rotate-[40deg] saturate-[150%] brightness-100' // Orange/Yellow
  })
};

const signalGreenIcon = new L.Icon({
  iconUrl, iconRetinaUrl, shadowUrl,
  iconSize: [18, 30], iconAnchor: [9, 30],
  className: 'hue-rotate-[140deg] saturate-200'
});

const signalRedIcon = new L.Icon({
  iconUrl, iconRetinaUrl, shadowUrl,
  iconSize: [18, 30], iconAnchor: [9, 30],
  className: 'hue-rotate-[350deg] saturate-200'
});

const signalNormalIcon = new L.Icon({
  iconUrl, iconRetinaUrl, shadowUrl,
  iconSize: [18, 30], iconAnchor: [9, 30],
  className: 'hue-rotate-[40deg] saturate-150'
});

const hospitalIcon = new L.Icon({
  iconUrl, iconRetinaUrl, shadowUrl,
  iconSize: [28, 46], iconAnchor: [14, 46],
  className: 'hue-rotate-[120deg] saturate-200'
});

const centerTarget: [number, number] = [28.6139, 77.2090];

function MapViewUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14.5);
  }, [center, map]);
  return null;
}

export interface CoordinatorSector {
  id: string;
  name: string;
  lat: number;
  lng: number;
  density: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  hasPolice: boolean;
}

export interface CoordinatorVehicle {
  id: string;
  name: string;
  currentLat: number;
  currentLng: number;
  emergencyType: string;
  status: string;
  speed: number;
  etaMins: number;
  usingBackup: boolean;
  routePoints: [number, number][];
  backupPoints: [number, number][];
}

export default function CoordinatorMap({
  sectors = [],
  vehicles = [],
  conflicts = [],
  signals = [],
  onSelectSector
}: {
  sectors?: CoordinatorSector[];
  vehicles?: CoordinatorVehicle[];
  conflicts?: any[];
  signals?: any[];
  onSelectSector?: (sectorId: string) => void;
}) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(centerTarget);

  useEffect(() => {
    const activeVeh = vehicles.find(v => v.status === 'EN_ROUTE');
    if (activeVeh) {
      setMapCenter([activeVeh.currentLat, activeVeh.currentLng]);
    }
  }, [vehicles]);

  // Priority color mapping for polyline corridors
  const getCorridorColor = (type: string) => {
    switch (type) {
      case 'Cardiac Arrest': return '#22d3ee'; // Neon Cyan
      case 'Severe Trauma': return '#f43f5e'; // Red
      case 'Stroke Emergency': return '#3b82f6'; // Blue
      case 'ICU Transfer': return '#a855f7'; // Purple
      case 'Highway Collision': return '#ec4899'; // Pink
      default: return '#eab308'; // Orange/Yellow
    }
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={14}
      style={{ height: '100%', width: '100%', background: '#010306' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <MapViewUpdater center={mapCenter} />

      {/* HEAT SECTOR OVERLAYS */}
      {sectors.map(sec => {
        const color = sec.risk === 'HIGH' ? '#f43f5e' : sec.risk === 'MEDIUM' ? '#f59e0b' : '#06b6d4';
        const radius = 250 + sec.density * 2;
        const opacity = 0.07 + sec.density * 0.003;

        return (
          <group key={`coor-sec-${sec.id}`}>
            <Circle
              center={[sec.lat, sec.lng]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: opacity,
                weight: sec.hasPolice ? 2 : 0.5
              }}
              eventHandlers={{
                click: () => onSelectSector && onSelectSector(sec.id)
              }}
            />
            {sec.hasPolice && (
              <Circle
                center={[sec.lat, sec.lng]}
                radius={130}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1,
                  weight: 1,
                  dashArray: '5, 5'
                }}
              />
            )}
          </group>
        );
      })}

      {/* EMERGENCY PRIORITY CORRIDORS (PATH LINES) */}
      {vehicles.map(v => {
        if (v.status !== 'EN_ROUTE') return null;

        const path = v.usingBackup ? v.backupPoints : v.routePoints;
        const color = getCorridorColor(v.emergencyType);

        return (
          <group key={`path-grp-${v.id}`}>
            {/* Inner neon line */}
            <Polyline
              positions={path}
              color={color}
              weight={4}
              opacity={0.85}
              dashArray={v.usingBackup ? '5, 10' : undefined}
            />
            {/* Outer corridor bounds glow */}
            <Polyline
              positions={path}
              color={color}
              weight={12}
              opacity={0.15}
            />
          </group>
        );
      })}

      {/* VEHICLES MARKERS */}
      {vehicles.map(v => {
        if (v.status !== 'EN_ROUTE') return null;

        const icon = vehicleIcons[v.emergencyType] || vehicleIcons['Non-Critical Transport'];
        return (
          <Marker
            key={`veh-marker-${v.id}`}
            position={[v.currentLat, v.currentLng]}
            icon={icon}
          >
            <Popup>
              <div className="bg-black/90 font-mono text-[11px] text-white p-2 rounded min-w-[160px]">
                <div className="font-bold border-b border-white/10 pb-1 mb-1 text-cyan-400">
                  {v.name}
                </div>
                <div className="space-y-0.5 text-[9px] text-white/70">
                  <div>Type: <span className="text-white font-bold">{v.emergencyType}</span></div>
                  <div>Speed: <span className="text-white font-sans">{v.speed} km/h</span></div>
                  <div>Live ETA: <span className="text-yellow-400 font-sans font-bold">{v.etaMins} mins</span></div>
                  <div>Corridor: <span className="text-white uppercase font-bold">{v.usingBackup ? 'Bypass' : 'Primary'}</span></div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* SIGNAL NODES */}
      {signals.map((sig, idx) => {
        const icon = sig.status === 'GREEN_HELD' ? signalGreenIcon : sig.status === 'RED_HELD' ? signalRedIcon : signalNormalIcon;
        return (
          <Marker
            key={`sig-node-${idx}`}
            position={[sig.lat, sig.lng]}
            icon={icon}
          >
            <Popup>
              <div className="bg-black/95 text-white p-1 rounded font-mono text-xs">
                <div className="font-bold text-cyan-400">{sig.signalName}</div>
                <div className="text-[10px] mt-1">
                  Status: <span className={sig.status === 'GREEN_HELD' ? 'text-green-400 font-bold' : sig.status === 'RED_HELD' ? 'text-red-400 font-bold' : 'text-yellow-500'}>{sig.status}</span>
                </div>
                {sig.status !== 'NORMAL' && (
                  <div className="text-[9px] text-white/50 mt-0.5">Preempted for: {sig.holdingFor}</div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* CONFLICT HOTSPOTS WARNINGS */}
      {conflicts.map((conf, idx) => (
        <group key={`hotspot-${idx}`}>
          <Circle
            center={[conf.lat, conf.lng]}
            radius={200}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '4, 8'
            }}
          />
          <Circle
            center={[conf.lat, conf.lng]}
            radius={80}
            pathOptions={{
              color: '#f59e0b',
              fillColor: '#f59e0b',
              fillOpacity: 0.2,
              weight: 1
            }}
          />
        </group>
      ))}

      {/* CITY DESTINATION GENERAL HOSPITAL */}
      <Marker position={[28.6250, 77.2250]} icon={hospitalIcon}>
        <Popup>City General Hospital</Popup>
      </Marker>
    </MapContainer>
  );
}
