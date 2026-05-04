'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface SubscriberLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  plan_name: string;
  plan_category: string;
}

interface SubscriberMapProps {
  locations: SubscriberLocation[];
}

export default function SubscriberMap({ locations }: SubscriberMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapIcon, setMapIcon] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Fix Leaflet default icon issue with Next.js
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Create custom icons for different plan categories
      const createCustomIcon = (color: string) => {
        return L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              background-color: ${color};
              width: 24px;
              height: 24px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              <div style="
                width: 8px;
                height: 8px;
                background-color: white;
                border-radius: 50%;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
              "></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
          popupAnchor: [0, -24],
        });
      };

      setMapIcon({
        Residential: createCustomIcon('#00A191'), // Teal
        Business: createCustomIcon('#00A191'), // Indigo
        Unknown: createCustomIcon('#6B6B80'), // Gray
      });
    }
  }, []);

  if (!isClient || !mapIcon) {
    return (
      <div className="w-full h-[500px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00A191] mb-2"></div>
          <p className="text-[#6B6B80] dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="w-full h-[500px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <p className="text-[#6B6B80] dark:text-gray-400">No subscriber locations available</p>
      </div>
    );
  }

  // Calculate center point (average of all coordinates)
  const centerLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;
  const centerLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;

  // Calculate appropriate zoom level based on spread of coordinates
  const latitudes = locations.map(loc => loc.latitude);
  const longitudes = locations.map(loc => loc.longitude);
  const latSpread = Math.max(...latitudes) - Math.min(...latitudes);
  const lngSpread = Math.max(...longitudes) - Math.min(...longitudes);
  const maxSpread = Math.max(latSpread, lngSpread);
  
  // Determine zoom level (higher zoom = more zoomed in)
  let zoom = 13; // Default for city-level view
  if (maxSpread > 1) zoom = 10; // Regional view
  else if (maxSpread > 0.5) zoom = 11; // Large city view
  else if (maxSpread > 0.1) zoom = 12; // City view
  else if (maxSpread > 0.05) zoom = 13; // District view
  else zoom = 14; // Neighborhood view

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-[#C9B8EC] dark:border-gray-700">
      <MapContainer
        key={`map-${locations.length}-${centerLat}-${centerLng}`}
        center={[centerLat, centerLng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={mapIcon[location.plan_category] || mapIcon.Unknown}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-[#00A191] mb-1">{location.name}</h3>
                <div className="text-sm text-[#1C1C2E]">
                  <p><span className="font-medium">Plan:</span> {location.plan_name}</p>
                  <p><span className="font-medium">Category:</span> {location.plan_category}</p>
                  <p className="text-xs text-[#6B6B80] mt-1">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

