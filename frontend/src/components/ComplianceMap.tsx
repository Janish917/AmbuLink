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
  className: 'hue-rotate-[150deg] saturate-[300%] brightness-110 shadow-lg animate-bounce' // Neon Cyan
});

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

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14.5);
  }, [center, map]);
  return null;
}

// Static database of coordinates for matching
const sectorCoordinates: Record<string, { lat: number, lng: number }> = {
  '1': { lat: 28.6139, lng: 77.2090 }, // Connaught Place Center
  '2': { lat: 28.6210, lng: 77.2150 }, // Janpath North
  '3': { lat: 28.6235, lng: 77.2200 }, // Barakhamba Road
  '4': { lat: 28.6110, lng: 77.2130 }, // Ashoka Road
  '5': { lat: 28.6129, lng: 77.2295 }, // India Gate Circle
  '6': { lat: 28.6220, lng: 77.2260 }, // Tilak Marg
  '7': { lat: 28.6150, lng: 77.2400 }, // Pragati Maidan
  '8': { lat: 28.6250, lng: 77.1950 }, // Mandir Marg
  '9': { lat: 28.6300, lng: 77.2050 }, // Panchkuian Road
  '10': { lat: 28.6320, lng: 77.2220 }, // Minto Road
  '11': { lat: 28.6170, lng: 77.2080 }, // Parliament Street
  '12': { lat: 28.5980, lng: 77.1850 }  // Chanakyapuri
};

export interface SectorLiveCompliance {
  id: string;
  name: string;
  complianceScore: number;
  obstructionScore: number;
  delayRiskScore: number;
  pressure: number;
  hasPolice?: boolean;
}

export interface ComplianceAmbulance {
  id: string;
  name: string;
  currentLat: number;
  currentLng: number;
  status: 'EN_ROUTE' | 'ARRIVED' | 'STUCK';
  speed: number;
  delaySec: number;
}

export default function ComplianceMap({
  sectors = [],
  vehicles = [],
  onSelectSector
}: {
  sectors?: SectorLiveCompliance[];
  vehicles?: ComplianceAmbulance[];
  onSelectSector?: (sectorId: string) => void;
}) {
  const defaultCenter: [number, number] = [28.6139, 77.2090];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);

  // Keep camera centered on first en-route vehicle
  useEffect(() => {
    const activeVehicle = vehicles.find(v => v.status === 'EN_ROUTE');
    if (activeVehicle) {
      setMapCenter([activeVehicle.currentLat, activeVehicle.currentLng]);
    }
  }, [vehicles]);

  const trackingRoute: [number, number][] = [
    [28.6139, 77.2090], // CP Center
    [28.6145, 77.2110], // CP Signal 1
    [28.6160, 77.2140], // CP Signal 2
    [28.6190, 77.2180], // CP Signal 3
    [28.6250, 77.2250]  // Hospital
  ];

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

      {/* AMBULANCE PREDICTIVE ROUTE LINE */}
      <Polyline
        positions={trackingRoute}
        pathOptions={{
          color: '#8b5cf6', // Violet emergency path
          weight: 4,
          opacity: 0.8,
          dashArray: '10, 10'
        }}
      />

      {/* SECTOR COMPLIANCE RINGS */}
      {sectors.map((sec) => {
        const coords = sectorCoordinates[sec.id];
        if (!coords) return null;

        // Color coding: green compliance score >= 80, yellow >= 50, red < 50
        const color = sec.complianceScore >= 80 
          ? '#10b981' // Green
          : sec.complianceScore >= 55 
            ? '#fbbf24' // Yellow
            : '#ef4444'; // Red

        const isLowCompliance = sec.complianceScore < 55;
        const radius = 250 + (sec.pressure * 1.5);
        const opacity = 0.08 + (sec.pressure * 0.002);

        return (
          <group key={`sector-compliance-${sec.id}`}>
            {/* Primary Compliance Radius */}
            <Circle
              center={[coords.lat, coords.lng]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: opacity,
                weight: sec.hasPolice ? 3 : 1.5,
                dashArray: sec.hasPolice ? '5, 5' : undefined
              }}
              eventHandlers={{
                click: () => onSelectSector && onSelectSector(sec.id)
              }}
            />

            {/* Blinking / Pulser outer ring for high resistance / low compliance */}
            {isLowCompliance && (
              <Circle
                center={[coords.lat, coords.lng]}
                radius={radius * 1.3}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: 'transparent',
                  weight: 1,
                  dashArray: '4, 10',
                  opacity: 0.6
                }}
              />
            )}

            {/* Obstruction Likelihood Overlay */}
            {sec.obstructionScore > 50 && (
              <Circle
                center={[coords.lat, coords.lng]}
                radius={150}
                pathOptions={{
                  color: '#dc2626',
                  fillColor: '#dc2626',
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: '3, 6'
                }}
              />
            )}
          </group>
        );
      })}

      {/* RENDER ACTIVE VEHICLES */}
      {vehicles.map((v) => {
        if (v.status === 'ARRIVED') return null;

        return (
          <Marker
            key={`vehicle-compliance-${v.id}`}
            position={[v.currentLat, v.currentLng]}
            icon={ambulanceIcon}
          >
            <Popup>
              <div className="bg-black/95 text-white p-2 rounded font-mono text-[11px] min-w-[180px]">
                <div className="font-bold border-b border-white/10 pb-1 mb-1 text-purple-400 flex justify-between">
                  <span>{v.name}</span>
                  <span className="text-[8px] bg-purple-900/50 text-purple-300 border border-purple-500/30 px-1 rounded">
                    ACTIVE RUN
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-[9px] text-white/70">
                  <span>Status:</span>
                  <span className="font-bold text-white">{v.status}</span>
                  <span>Speed:</span>
                  <span className="font-bold text-white font-sans">{v.speed} km/h</span>
                  <span>Delay:</span>
                  <span className={v.delaySec > 0 ? 'text-red-400 font-bold font-sans' : 'text-green-400 font-sans'}>
                    +{v.delaySec}s
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* STATIC LANDMARKS */}
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
            <div className="font-bold text-blue-400">SAPS Command HQ</div>
            <div className="text-[10px] text-white/50">Compliance Enforcement Core</div>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
