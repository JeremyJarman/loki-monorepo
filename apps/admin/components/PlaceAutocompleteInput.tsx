'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: { types?: string[]; fields?: string[] }
          ) => {
            addListener: (event: string, cb: () => void) => void;
          };
        };
      };
    };
    initPlaceAutocomplete?: () => void;
  }
}

export interface PlaceResult {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

interface PlaceAutocompleteInputProps {
  value: string;
  onChange: (value: string, place?: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  /** When set, loads Google Places API and enables autocomplete. Requires Places API enabled. */
  apiKey?: string;
}

/**
 * Address input with optional Google Places Autocomplete.
 * Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable. When enabled, selecting a place
 * populates name, address, and coordinates via onChange callback.
 */
export function PlaceAutocompleteInput({
  value,
  onChange,
  placeholder = 'Search for a place or enter address',
  className = '',
  apiKey,
}: PlaceAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const autocompleteRef = useRef<unknown>(null);

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    const loadScript = () => {
      if (window.google?.maps?.places) {
        setScriptLoaded(true);
        return;
      }
      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existing) {
        existing.addEventListener('load', () => setScriptLoaded(true));
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      document.head.appendChild(script);
    };

    loadScript();
  }, [apiKey]);

  useEffect(() => {
    if (!scriptLoaded || !inputRef.current || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['name', 'formatted_address', 'geometry'],
    });

    autocompleteRef.current = autocomplete;

    const listener = () => {
      const place = (autocomplete as { getPlace: () => { name?: string; formatted_address?: string; geometry?: { location?: { lat: () => number; lng: () => number } } } }).getPlace();
      if (place.formatted_address) {
        onChange(place.formatted_address, {
          name: place.name || place.formatted_address,
          address: place.formatted_address,
          lat: place.geometry?.location?.lat?.(),
          lng: place.geometry?.location?.lng?.(),
        });
      }
    };

    autocomplete.addListener('place_changed', listener);
    return () => {
      if (window.google?.maps?.event && autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current as google.maps.places.Autocomplete);
      }
    };
  }, [scriptLoaded, onChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
