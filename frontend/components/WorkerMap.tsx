"use client";
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// A divIcon keeps markers independent of Leaflet's PNG assets, which Turbopack
// does not expose with a usable `src` when imported from node_modules.
const workerMarkerIcon = L.divIcon({
  className: 'skilllink-marker',
  html: '<span style="display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#4f46e5;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.45)"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
  popupAnchor: [0, -20],
});

// Dynamically import Map components with NO SSR
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse bg-white/5" />
});
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

export interface WorkerSummary {
  _id: string;
  userId?: { name?: string };
  rating?: number;
  insuranceStatus?: string;
  location?: { lat: number; lng: number };
}

interface WorkerMapProps {
  workers: WorkerSummary[];
  center?: [number, number];
  ratingLabel?: string;
  statusLabel?: string;
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
function markerPosition(worker: WorkerSummary, index: number, center: [number, number]): [number, number] {
  if (typeof worker.location?.lat === 'number' && typeof worker.location?.lng === 'number') {
    return [worker.location.lat, worker.location.lng];
  }
  const seed = String(worker._id ?? index);
  const lat = center[0] + ((hashString(seed) % 200) - 100) / 5000;
  const lng = center[1] + ((hashString(`${seed}-lng`) % 200) - 100) / 5000;
  return [lat, lng];
}

export default function WorkerMap({
  workers,
  center = DEFAULT_CENTER,
  ratingLabel = 'Rating',
  statusLabel = 'Status',
}: WorkerMapProps) {
  return (
    <div className="h-[300px] w-full rounded-lg overflow-hidden border mt-4 z-0">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {workers.map((worker, index) => {
          return (
            <Marker key={worker._id ?? index} position={markerPosition(worker, index, center)} icon={workerMarkerIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>{worker.userId?.name}</strong><br />
                  {ratingLabel}: {worker.rating || 0} ⭐<br />
                  {statusLabel}: {worker.insuranceStatus || 'N/A'}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
