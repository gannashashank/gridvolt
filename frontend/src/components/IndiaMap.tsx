import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Bounding box for India
const INDIA_BOUNDS: L.LatLngBoundsExpression = [
  [6.5, 68.0],  // Southwest corner
  [37.5, 97.5]  // Northeast corner
];

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

// Custom SVGs for Map Markers (prevents React-Leaflet image packaging errors)
const userIcon = L.divIcon({
  html: `<div class="w-8 h-8 -ml-4 -mt-4 flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-rose-500/30 animate-ping"></div>
          <div class="relative w-4 h-4 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center">
            <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
          </div>
         </div>`,
  className: 'custom-div-icon'
});

const providerIcon = L.divIcon({
  html: `<div class="w-8 h-8 -ml-4 -mt-4 flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-pulse"></div>
          <div class="relative w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-lg flex items-center justify-center">
            <span class="text-[9px]">⚡</span>
          </div>
         </div>`,
  className: 'custom-div-icon'
});

// Component to dynamically adjust map view when props update
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
  interactive = false
}: IndiaMapProps) {

  // Coordinate clamping/snapping logic:
  // Approximate box check
  const isInsideIndia = (lat: number, lng: number) => {
    return lat >= 6.5 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
  };

  let finalLat = userLat;
  let finalLng = userLng;

  // Snap to India Centroid if invalid or outside boundary
  if (!isInsideIndia(userLat, userLng)) {
    finalLat = 24.5854; // Udaipur
    finalLng = 73.7125;
    // Notify in console or trigger callback if interactive
    console.log('Location snapped to service area (India centroid).');
  }

  // Handle map click for manual marker positioning
  function MapEvents() {
    const map = useMap();
    useEffect(() => {
      if (!interactive || !onLocationChange) return;

      const clickHandler = (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (isInsideIndia(lat, lng)) {
          onLocationChange(lat, lng);
        } else {
          alert('GridVolt operates within India only. Snap position set back to borders.');
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
    <div className="w-full h-full relative min-h-[300px]">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={4.5}
        className="w-full h-full rounded-xl overflow-hidden border border-slate-800"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ChangeView center={mapCenter} zoom={mapZoom} />
        <MapEvents />

        {/* Stranded User Marker */}
        <Marker position={[finalLat, finalLng]} icon={userIcon}>
          <Popup>
            <div className="text-slate-900 font-medium">
              Your EV Breakdown Location
            </div>
          </Popup>
        </Marker>

        {/* Assigned Provider Marker */}
        {providerLat && providerLng && isInsideIndia(providerLat, providerLng) && (
          <Marker position={[providerLat, providerLng]} icon={providerIcon}>
            <Popup>
              <div className="text-slate-900 font-medium">
                <div>Roadside Charger: <b>{providerName || 'Provider'}</b></div>
                <div className="text-xs text-emerald-600 font-mono">En Route</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
