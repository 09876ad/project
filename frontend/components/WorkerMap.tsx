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
}

export default function WorkerMap({ workers }: WorkerMapProps) {
  const [mounted, setMounted] = useState(false);
  const center: [number, number] = [19.0760, 72.8777]; // Default center (Mumbai)

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
          // Generate slightly different positions for demo
          const lat = center[0] + (Math.random() - 0.5) * 0.05;
          const lng = center[1] + (Math.random() - 0.5) * 0.05;
          
          return (
            <Marker key={index} position={[lat, lng]}>
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