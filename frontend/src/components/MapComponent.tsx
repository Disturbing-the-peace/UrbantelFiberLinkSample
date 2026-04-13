'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation?: [number, number];
}

export default function MapComponent({ center, zoom, onLocationSelect, selectedLocation }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(center, zoom);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Add click handler
      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        
        // Remove existing marker
        if (markerRef.current) {
          markerRef.current.remove();
        }
        
        // Add new marker
        markerRef.current = L.marker([lat, lng]).addTo(mapRef.current!);
        
        // Notify parent component
        onLocationSelect(lat, lng);
      });
    }

    // Update map view when center changes
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }

    // Add or update marker if selectedLocation is provided
    if (selectedLocation && mapRef.current) {
      if (markerRef.current) {
        markerRef.current.setLatLng(selectedLocation);
      } else {
        markerRef.current = L.marker(selectedLocation).addTo(mapRef.current);
      }
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom, selectedLocation, onLocationSelect]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-96 rounded-lg border-2 border-gray-300 z-0"
      style={{ minHeight: '384px' }}
    />
  );
}
