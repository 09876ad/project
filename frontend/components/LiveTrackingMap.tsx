"use client";
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LiveTrackingMapProps {
    workerLocation: { lat: number; lng: number } | null;
    customerLocation: { lat: number; lng: number };
    title?: string;
}

// Component to update map center when worker moves
function MapUpdater({ workerLocation }: { workerLocation: { lat: number; lng: number } | null }) {
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
    customerLocation,
    title = "Live Tracking"
}: LiveTrackingMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="h-[250px] bg-white/10 rounded-xl flex items-center justify-center text-white/60">Loading map...</div>;
    }

    return (
        <div className="mt-4">
            {title && <p className="text-white/80 text-sm font-semibold mb-2">{title}</p>}
            <div className="h-[250px] w-full rounded-xl overflow-hidden border border-white/20 shadow-lg">
                <MapContainer
                    center={workerLocation ? [workerLocation.lat, workerLocation.lng] : [customerLocation.lat, customerLocation.lng]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Customer Location Marker */}
                    <Marker position={[customerLocation.lat, customerLocation.lng]} icon={DefaultIcon}>
                        <Popup>
                            <div className="text-slate-800">
                                <strong>Customer Location</strong><br />
                                Destination
                            </div>
                        </Popup>
                    </Marker>

                    {/* Worker Location Marker (Moving) */}
                    {workerLocation && (
                        <Marker position={[workerLocation.lat, workerLocation.lng]} icon={DefaultIcon}>
                            <Popup>
                                <div className="text-slate-800">
                                    <strong>Worker Location</strong><br />
                                    On the way
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