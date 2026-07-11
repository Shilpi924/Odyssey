'use client';

import { useState, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

// Sample trail locations for demo
const SAMPLE_TRAILS = [
  { name: 'Eagle Peak Trail', lat: 37.7749, lng: -122.4194, difficulty: 'Moderate' },
  { name: 'Sunset Ridge', lat: 37.7849, lng: -122.4094, difficulty: 'Easy' },
  { name: 'Mountain View Loop', lat: 37.7649, lng: -122.4294, difficulty: 'Strenuous' },
];

export default function MapPreview() {
  const [viewState, setViewState] = useState({
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 13
  });

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            <span>Interactive Trail Map</span>
          </h3>
          <p className="text-slate-400 text-sm mt-1">Click on trails to see details</p>
        </div>
        
        <div className="relative h-[300px] md:h-[400px]">
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle={OSM_STYLE}
            attributionControl={false}
          >
            {SAMPLE_TRAILS.map((trail, index) => (
              <Marker
                key={index}
                longitude={trail.lng}
                latitude={trail.lat}
                anchor="bottom"
              >
                <div className="cursor-pointer group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white transition-transform group-hover:scale-110 ${
                    trail.difficulty === 'Easy' ? 'bg-emerald-500' :
                    trail.difficulty === 'Moderate' ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {trail.name}
                  </div>
                </div>
              </Marker>
            ))}
          </Map>

          {/* Overlay badges */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <div className="bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white border border-slate-700">
              <span className="text-emerald-400">●</span> Easy
            </div>
            <div className="bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white border border-slate-700">
              <span className="text-amber-400">●</span> Moderate
            </div>
            <div className="bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white border border-slate-700">
              <span className="text-rose-400">●</span> Strenuous
            </div>
          </div>

          {/* Demo badge */}
          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-slate-300 border border-slate-700">
            Demo view · San Francisco
          </div>
        </div>
      </div>
    </div>
  );
}
