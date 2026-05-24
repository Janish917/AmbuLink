'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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
  markers = []
}: {
  activeRoute?: boolean;
  role?: 'driver' | 'police';
  markers?: Array<{id: string, lat: number, lng: number, type: string}>;
}) {
  const [ambulancePos, setAmbulancePos] = useState<[number, number]>([28.6139, 77.2090]); // New Delhi dummy center

  // Dummy route points for visualization
  const routePoints: [number, number][] = [
    [28.6139, 77.2090],
    [28.6149, 77.2100],
    [28.6159, 77.2150],
    [28.6200, 77.2200],
    [28.6250, 77.2250],
  ];

  useEffect(() => {
    if (activeRoute) {
      // Simulate ambulance movement
      let i = 0;
      const interval = setInterval(() => {
        if (i < routePoints.length) {
          setAmbulancePos(routePoints[i]);
          i++;
        } else {
          clearInterval(interval);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [activeRoute]);

  // Use a dark map tile
  return (
    <MapContainer 
      center={ambulancePos} 
      zoom={14} 
      style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <MapUpdater center={ambulancePos} zoom={15} />
      
      {activeRoute && (
        <>
          <Polyline 
            positions={routePoints} 
            color="#ff4b4b" 
            weight={6} 
            opacity={0.8}
            dashArray="10, 10"
            className="animate-pulse"
          />
          <Marker position={ambulancePos} icon={ambulanceIcon}>
            <Popup className="bg-black text-white border border-white/20">
              <div className="font-bold text-red-500">Ambulance Unit 42</div>
              <div className="text-xs">Emergency Code Red</div>
            </Popup>
          </Marker>

          {/* Dummy Police stations along route */}
          <Marker position={[28.6159, 77.2180]} icon={policeIcon}>
             <Popup>Connaught Place Traffic Post</Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}
