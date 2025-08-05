
'use client';

import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';

interface JurisdictionMapPickerProps {
  apiKey: string;
  value: { lat: number; lng: number; address: string };
  onChange: (loc: { lat: number; lng: number; address: string }) => void;
}

export default function JurisdictionMapPicker({ apiKey, value, onChange }: JurisdictionMapPickerProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: ['places'],
  });
  const [marker, setMarker] = useState(value || { lat: 0, lng: 0, address: '' });

  useEffect(() => {
    if (value) setMarker(value);
  }, [value]);

  useEffect(() => {
    if (marker && marker.address) {
      const jurisdictionInput = document.querySelector(
        'input[placeholder="Enter your jurisdiction/state"]'
      ) as HTMLInputElement;
      if (jurisdictionInput && jurisdictionInput.value !== marker.address) {
        jurisdictionInput.value = marker.address;
        jurisdictionInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, [marker]);

  useEffect(() => {
    if (isLoaded && marker.lat === 0 && marker.lng === 0) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const address = results[0].formatted_address;
                setMarker({ lat, lng, address });
                onChange({ lat, lng, address });
              } else {
                setMarker({ lat, lng, address: '' });
                onChange({ lat, lng, address: '' });
              }
            });
          },
          () => {
            setMarker({ lat: 37.7749, lng: -122.4194, address: '' });
            onChange({ lat: 37.7749, lng: -122.4194, address: '' });
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        setMarker({ lat: 37.7749, lng: -122.4194, address: '' });
        onChange({ lat: 37.7749, lng: -122.4194, address: '' });
      }
    }
  }, [isLoaded, marker, onChange]);

  return isLoaded ? (
    <div className="my-2">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '200px' }}
        center={marker.lat !== 0 && marker.lng !== 0 ? { lat: marker.lat, lng: marker.lng } : { lat: 37.7749, lng: -122.4194 }}
        zoom={marker.lat !== 0 ? 12 : 4}
        onClick={async (e) => {
          const lat = e.latLng?.lat();
          const lng = e.latLng?.lng();
          if (lat && lng) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const address = results[0].formatted_address;
                setMarker({ lat, lng, address });
                onChange({ lat, lng, address });
              } else {
                setMarker({ lat, lng, address: '' });
                onChange({ lat, lng, address: '' });
              }
            });
          }
        }}
      >
        {marker.lat !== 0 && marker.lng !== 0 && (
          <Marker position={{ lat: marker.lat, lng: marker.lng }} />
        )}
      </GoogleMap>
    </div>
  ) : (
    <div className="flex items-center justify-center my-2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
      <span className="text-xs text-gray-600">Loading map...</span>
    </div>
  );
}
