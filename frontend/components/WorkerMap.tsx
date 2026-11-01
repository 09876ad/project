"use client";
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import L from 'leaflet';

// Fix for default marker icons in Leaflet - ONLY run on client
if (typeof window !== 'undefined') {
  import('leaflet').then((L) => {
    const markerIcon2x = require('leaflet/dist/images/marker-icon-2x.png');
    const markerIcon = require('leaflet/dist/images/marker-icon.png');
    const markerShadow = require('leaflet/dist/images/marker-shadow.png');
    
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x.default || markerIcon2x,
      iconUrl: markerIcon.default || markerIcon,
      shadowUrl: markerShadow.default || markerShadow,
    });
  });
}

// Dynamically import Map components with NO SSR
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-gray-100 flex items-center justify-center">Loading map...</div>
});
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

interface WorkerMapProps {
  workers: any[];
  center?: [number, number];
}

// Demo accounts are based in Bhubaneswar, so the map opens on that city.
const DEFAULT_CENTER: [number, number] = [20.2961, 85.8245];

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

// There are no worker coordinates in the data model, so derive a stable spot
// near the city centre from the worker id instead of re-randomising each render.
function markerPosition(worker: any, index: number, center: [number, number]): [number, number] {
  if (typeof worker?.location?.lat === 'number' && typeof worker?.location?.lng === 'number') {
    return [worker.location.lat, worker.location.lng];
  }
  const seed = String(worker?._id ?? index);
  const lat = center[0] + ((hashString(seed) % 200) - 100) / 5000;
  const lng = center[1] + ((hashString(`${seed}-lng`) % 200) - 100) / 5000;
  return [lat, lng];
}

export default function WorkerMap({ workers, center = DEFAULT_CENTER }: WorkerMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[300px] w-full bg-gray-100 rounded-lg flex items-center justify-center">Loading map...</div>;
  }

  return (
    <div className="h-[300px] w-full rounded-lg overflow-hidden border mt-4 z-0">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {workers.map((worker, index) => {
          return (
            <Marker key={worker._id ?? index} position={markerPosition(worker, index, center)}>
              <Popup>
                <div className="text-sm">
                  <strong>{worker.userId?.name}</strong><br />
                  Rating: {worker.rating || 0} ⭐<br />
                  Status: {worker.insuranceStatus || 'N/A'}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}