'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import map component to avoid SSR issues
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

interface LocationPickerProps {
  onLocationChange: (location: LocationData) => void;
  initialLocation?: LocationData;
}

export default function LocationPicker({ onLocationChange, initialLocation }: LocationPickerProps) {
  const [location, setLocation] = useState<LocationData | null>(initialLocation || null);
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    // Always show the map when component mounts or initialLocation changes
    setShowMap(true);
    
    // Set default location to Davao del Sur, Philippines if no initial location
    if (!initialLocation) {
      // Default to Digos City, Davao del Sur
      const defaultLocation: LocationData = {
        latitude: 6.7499,
        longitude: 125.3570,
        address: 'Digos City, Davao del Sur, Philippines'
      };
      setLocation(defaultLocation);
      onLocationChange(defaultLocation);
    } else {
      // If there's an initial location, set it
      setLocation(initialLocation);
    }
  }, [initialLocation]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      setShowMap(true);
      return;
    }

    setIsLoadingGeo(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        const address = await reverseGeocode(latitude, longitude);
        
        const locationData: LocationData = {
          latitude,
          longitude,
          address,
        };
        
        setLocation(locationData);
        onLocationChange(locationData);
        setIsLoadingGeo(false);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please use the map to select your location.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please use the map to select your location.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please use the map to select your location.';
            break;
        }
        
        setGeoError(errorMessage);
        setIsLoadingGeo(false);
        setShowMap(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      // Using Nominatim (OpenStreetMap) for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.display_name) {
        return data.display_name;
      }
      
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const handleMapLocationSelect = async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng);
    
    const locationData: LocationData = {
      latitude: lat,
      longitude: lng,
      address,
    };
    
    setLocation(locationData);
    onLocationChange(locationData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Installation Location</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Click on map to select</p>
      </div>

      {/* Use Current Location Button - Only show on HTTPS */}
      {typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost') && (
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isLoadingGeo}
          className="w-full px-4 py-3 bg-[#00A191] text-white rounded-lg hover:bg-[#008c7a] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingGeo ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Getting your location...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Use My Current Location</span>
            </>
          )}
        </button>
      )}

      {/* HTTPS Notice for non-secure connections */}
      {typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">Automatic location requires HTTPS</p>
              <p className="mt-1">Please use the map below to select your location manually.</p>
            </div>
          </div>
        </div>
      )}

      {/* Geolocation Error */}
      {geoError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-red-800 dark:text-red-200">
              <p className="font-medium">Location Error</p>
              <p className="mt-1">{geoError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Location Display */}
      {location && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-green-400 flex-shrink-0 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-200">Location Captured</p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">{location.address}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Map Interface - Always shown */}
      {showMap && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            📍 Click or tap on the map to select your exact installation location
          </p>
          <MapComponent
            center={location ? [location.latitude, location.longitude] : [6.7499, 125.3570]} // Default to Digos City, Davao del Sur
            zoom={location ? 15 : 12}
            onLocationSelect={handleMapLocationSelect}
            selectedLocation={location ? [location.latitude, location.longitude] : undefined}
          />
        </div>
      )}
    </div>
  );
}
