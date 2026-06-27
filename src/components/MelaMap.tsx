'use client';

import React, { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

// Simple coordinates for Nashik Kumbh Mela hotspots
const POLICE_STATIONS = [
  { name: "Panchavati Police Station", lat: 20.0156, lng: 73.7967 },
  { name: "Bhadrakali Police Station", lat: 19.9978, lng: 73.7892 },
  { name: "Sarkarwada Police Station", lat: 20.0056, lng: 73.7797 },
  { name: "Nashik Road Police Station", lat: 19.9528, lng: 73.8397 }
];

const CCTVS = [
  { id: "Z30-C1", lat: 20.0067, lng: 73.7902 },
  { id: "Z30-C2", lat: 20.0071, lng: 73.7908 },
  { id: "Z30-C3", lat: 20.0061, lng: 73.7904 },
  { id: "Z31-C1", lat: 19.9869, lng: 73.7956 },
  { id: "Z31-C2", lat: 19.9872, lng: 73.7959 }
];

const ZONE_CENTROIDS = [
  { name: "Zone Area 30 (Ramkund Ghat)", lat: 19.9950, lng: 73.7799 },
  { name: "Zone Area 31 (Panchavati Circle)", lat: 19.9863, lng: 73.7825 },
  { name: "Zone Area 8 (Sadhugram Gate)", lat: 19.9989, lng: 73.8648 },
  { name: "Zone Area 21 (Takli Sangam)", lat: 19.9837, lng: 73.8191 },
  { name: "Zone Area 1 (Trimbakeshwar)", lat: 19.9826, lng: 73.7128 }
];

interface MelaMapProps {
  sightingLat?: number;
  sightingLng?: number;
  highlightZone?: string;
}

export default function MelaMap({ sightingLat, sightingLng, highlightZone }: MelaMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const { highContrast } = useApp();

  useEffect(() => {
    // Leaflet can only be initialized on the browser
    if (typeof window === 'undefined' || !mapContainer.current) return;

    import('leaflet').then((L) => {
      // Avoid double initialization
      if (mapInstance.current) {
        mapInstance.current.remove();
      }

      // Default icon fix for Leaflet in Next.js
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Saffron marker for Missing cases
      const missingIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Blue marker for Police stations
      const policeIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Red marker for CCTV
      const cctvIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [20, 32],
        iconAnchor: [10, 32],
        popupAnchor: [1, -30],
        shadowSize: [30, 30]
      });

      // Center map on Ramkund centroid
      const defaultCenter: [number, number] = [19.9950, 73.7799];
      const initialCenter = sightingLat && sightingLng ? [sightingLat, sightingLng] as [number, number] : defaultCenter;

      const map = L.map(mapContainer.current!).setView(initialCenter, 14);
      mapInstance.current = map;

      // Dark theme map tiles (matching government-grade emergency command centers)
      const tileUrl = highContrast
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' // High contrast tile
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'; // Regular Voyager tile

      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> contributors'
      }).addTo(map);

      // Add Police Stations
      POLICE_STATIONS.forEach((station) => {
        L.marker([station.lat, station.lng], { icon: policeIcon })
          .bindPopup(`<strong class="text-slate-100">${station.name}</strong><br/><span class="text-xs text-orange-400 font-medium">Police Assistance Center</span>`)
          .addTo(map);
      });

      // Add CCTVs
      CCTVS.forEach((cctv) => {
        L.marker([cctv.lat, cctv.lng], { icon: cctvIcon })
          .bindPopup(`<strong class="text-slate-100">Camera ${cctv.id}</strong><br/><span class="text-xs text-red-400 font-medium">Live Stream Feed</span>`)
          .addTo(map);
      });

      // Add Zone boundary marker overlays
      ZONE_CENTROIDS.forEach((zone) => {
        const isHighlighted = highlightZone && zone.name.includes(highlightZone);
        
        // Draw a circle representing the Zone reach
        L.circle([zone.lat, zone.lng], {
          color: isHighlighted ? '#eab308' : '#f97316',
          fillColor: isHighlighted ? '#eab308' : '#f97316',
          fillOpacity: isHighlighted ? 0.25 : 0.1,
          radius: 800
        }).bindPopup(`<strong class="text-slate-100">${zone.name}</strong><br/><span class="text-xs text-slate-300">Nashik Command Zone</span>`)
          .addTo(map);
      });

      // Add live sighting marker if provided
      if (sightingLat && sightingLng) {
        L.marker([sightingLat, sightingLng], { icon: missingIcon })
          .bindPopup(`<strong class="text-slate-100">Sighting Point</strong><br/><span class="text-xs text-amber-400 font-medium">Last Ping Coordinates</span>`)
          .addTo(map)
          .openPopup();
      }

    });
  }, [sightingLat, sightingLng, highlightZone, highContrast]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/10 shadow-lg">
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
      <div className="absolute bottom-3 left-3 bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-[10px] space-y-1.5 z-[1000]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block"></span>
          <span className="text-slate-300 font-medium">Police Assistance booths</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block"></span>
          <span className="text-slate-300 font-medium">Active CCTV feeds</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-orange-500 rounded-full inline-block"></span>
          <span className="text-slate-300 font-medium">Kumbh command zones</span>
        </div>
      </div>
    </div>
  );
}
