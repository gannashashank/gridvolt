import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Bounding box for India
const INDIA_BOUNDS: L.LatLngBoundsExpression = [
  [6.5, 68.0], // Southwest corner
  [37.5, 97.5], // Northeast corner
];

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

// Clean Editorial Minimal SVGs for Leaflet Markers (Electric Amber Theme)
const userIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-7 h-7 -ml-3.5 -mt-3.5">
          <span class="absolute w-7 h-7 bg-amber-500/20 rounded-full animate-ping"></span>
          <span class="relative w-3.5 h-3.5 bg-skyroot-accent border-2 border-white rounded-none shadow-lg"></span>
         </div>`,
  className: 'custom-div-icon',
});

const providerIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-7 h-7 -ml-3.5 -mt-3.5">
          <span class="relative w-4 h-4 bg-white border-2 border-skyroot-accent rounded-none shadow-md flex items-center justify-center text-[8px] font-mono font-bold text-skyroot-black">
            P
          </span>
         </div>`,
  className: 'custom-div-icon',
});

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface IndiaMapProps {
  userLat: number;
  userLng: number;
  providerLat?: number;
  providerLng?: number;
  providerName?: string;
  onLocationChange?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

export default function IndiaMap({
  userLat,
  userLng,
  providerLat,
  providerLng,
  providerName,
  onLocationChange,
  interactive = false,
}: IndiaMapProps) {
  const isInsideIndia = (lat: number, lng: number) => {
    return lat >= 6.5 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
  };

  let finalLat = userLat;
  let finalLng = userLng;

  if (!isInsideIndia(userLat, userLng)) {
    finalLat = 24.5854; // Udaipur default centroid
    finalLng = 73.7125;
  }

  function MapEvents() {
    const map = useMap();
    useEffect(() => {
      if (!interactive || !onLocationChange) return;

      const clickHandler = (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (isInsideIndia(lat, lng)) {
          onLocationChange(lat, lng);
        } else {
          alert('GridVolt operates within India only. Selected point adjusted to service boundary.');
        }
      };

      map.on('click', clickHandler);
      return () => {
        map.off('click', clickHandler);
      };
    }, [map]);

    return null;
  }

  const mapCenter: [number, number] = [finalLat, finalLng];
  const mapZoom = finalLat === INDIA_CENTER[0] ? 5 : 13;

  return (
    <div className="w-full h-full relative min-h-[320px] bg-skyroot-black">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={4.5}
        className="w-full h-full border border-skyroot-border"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ChangeView center={mapCenter} zoom={mapZoom} />
        <MapEvents />

        {/* User Breakdown Marker */}
        <Marker position={[finalLat, finalLng]} icon={userIcon}>
          <Popup>
            <div className="font-mono text-xs">
              <span className="text-skyroot-accent font-bold uppercase tracking-wider block">
                STRANDED COORDINATE
              </span>
              <span className="text-neutral-300 block text-[11px] mt-1">
                {finalLat.toFixed(4)}, {finalLng.toFixed(4)}
              </span>
            </div>
          </Popup>
        </Marker>

        {/* Provider Marker */}
        {providerLat && providerLng && isInsideIndia(providerLat, providerLng) && (
          <Marker position={[providerLat, providerLng]} icon={providerIcon}>
            <Popup>
              <div className="font-mono text-xs">
                <span className="text-white font-bold uppercase tracking-wider block">
                  RESCUE UNIT: {providerName || 'PROVIDER'}
                </span>
                <span className="text-skyroot-accent text-[10px] block mt-1 uppercase tracking-widest">
                  TELEMETRY LIVE
                </span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
