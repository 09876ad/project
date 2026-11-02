"use client";
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: LatLng = { lat: 20.2961, lng: 85.8245 };

// divIcons avoid Leaflet's PNG assets, which Turbopack does not expose with a
// usable `src` when imported from node_modules.
function pinIcon(color: string) {
    return L.divIcon({
        className: 'skilllink-marker',
        html: `<span style="display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.45)"></span>`,
        iconSize: [20, 20],
        iconAnchor: [10, 20],
        popupAnchor: [0, -20],
    });
}

const WorkerIcon = pinIcon('#4f46e5');
const CustomerIcon = pinIcon('#059669');

interface LiveTrackingMapProps {
    workerLocation: LatLng | null;
    customerLocation?: LatLng | null;
    fallbackCenter?: LatLng;
    title?: string;
    workerLabel?: string;
    customerLabel?: string;
}

// Component to update map center when worker moves
function MapUpdater({ workerLocation }: { workerLocation: LatLng | null }) {
    const map = useMap();

    useEffect(() => {
        if (workerLocation) {
            map.setView([workerLocation.lat, workerLocation.lng], 15);
        }
    }, [workerLocation, map]);

    return null;
}

export default function LiveTrackingMap({
    workerLocation,
    customerLocation = null,
    fallbackCenter = DEFAULT_CENTER,
    title,
    workerLabel = 'Worker location',
    customerLabel = 'Customer location',
}: LiveTrackingMapProps) {
    const center = workerLocation ?? customerLocation ?? fallbackCenter;

    return (
        <div className="mt-4">
            {title && <p className="text-white/80 text-sm font-semibold mb-2">{title}</p>}
            <div className="h-[250px] w-full rounded-xl overflow-hidden border border-white/20 shadow-lg">
                <MapContainer
                    center={[center.lat, center.lng]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {customerLocation && (
                        <Marker position={[customerLocation.lat, customerLocation.lng]} icon={CustomerIcon}>
                            <Popup>
                                <div className="text-slate-800">
                                    <strong>{customerLabel}</strong>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {workerLocation && (
                        <Marker position={[workerLocation.lat, workerLocation.lng]} icon={WorkerIcon}>
                            <Popup>
                                <div className="text-slate-800">
                                    <strong>{workerLabel}</strong>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    <MapUpdater workerLocation={workerLocation} />
                </MapContainer>
            </div>
        </div>
    );
}
