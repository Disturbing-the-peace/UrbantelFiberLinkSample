'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, X, Loader2 } from 'lucide-react';

// Fix for default marker icon in Leaflet with Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface MapModalProps {
  address: string;
  name: string;
  lat?: number;
  lng?: number;
  onClose: () => void;
}

export default function MapModal({ address, name, lat, lng, onClose }: MapModalProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(false);
  const [finalLat, setFinalLat] = useState<number | null>(null);
  const [finalLng, setFinalLng] = useState<number | null>(null);

  // Geocode address if no coordinates provided
  useEffect(() => {
    const geocodeAddress = async () => {
      if (lat && lng) {
        setFinalLat(lat);
        setFinalLng(lng);
        return;
      }

      setIsGeocoding(true);
      setGeocodeError(false);

      try {
        // Use Nominatim (OpenStreetMap) geocoding API
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        );
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          setFinalLat(parseFloat(data[0].lat));
          setFinalLng(parseFloat(data[0].lon));
        } else {
          // Fallback to Davao del Sur if geocoding fails
          setFinalLat(6.7499);
          setFinalLng(125.3570);
          setGeocodeError(true);
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        // Fallback to Davao del Sur
        setFinalLat(6.7499);
        setFinalLng(125.3570);
        setGeocodeError(true);
      } finally {
        setIsGeocoding(false);
      }
    };

    geocodeAddress();
  }, [address, lat, lng]);

  // Initialize map once coordinates are available
  useEffect(() => {
    if (!mapContainerRef.current || finalLat === null || finalLng === null) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([finalLat, finalLng], 16);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Add marker
      markerRef.current = L.marker([finalLat, finalLng])
        .addTo(mapRef.current)
        .bindPopup(`<b>${name}</b><br>${address}`)
        .openPopup();
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [finalLat, finalLng, address, name]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Location
              </h2>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                <p className="text-sm font-medium">{name}</p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {address}
              </p>
              {geocodeError && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                  ⚠️ Exact location not found. Showing approximate area.
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Map Container */}
        {isGeocoding ? (
          <div className="w-full h-[400px] md:h-[500px] flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#00A191] mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Finding location...</p>
            </div>
          </div>
        ) : (
          <div 
            ref={mapContainerRef}
            className="w-full h-[400px] md:h-[500px]"
          />
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[#00A191] dark:text-[#14B8A6] hover:underline"
          >
            <MapPin className="w-4 h-4" />
            Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
