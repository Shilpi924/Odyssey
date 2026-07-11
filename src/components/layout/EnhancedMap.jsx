'use client';

import { useRef, useEffect, useState } from 'react';
import Map, { Marker, Source, Layer, useMap, NavigationControl, ScaleControl, FullscreenControl, GeolocateControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Map style configurations
const MAP_STYLES = {
  streets: {
    id: 'streets',
    name: 'Streets',
    url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
  },
  terrain: {
    id: 'terrain',
    name: 'Terrain',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }
};

// Generate map style object
function createMapStyle(styleKey) {
  const style = MAP_STYLES[styleKey] || MAP_STYLES.streets;
  return {
    version: 8,
    sources: {
      'osm': {
        type: 'raster',
        tiles: [style.url],
        tileSize: 256,
        attribution: style.attribution
      },
      // Add terrain source for 3D
      'terrain': {
        type: 'raster-dem',
        url: 'https://tilezen.maps.ls.hereapi.com/tilezen/tilezen/v1/terrain/all/{z}/{x}/{y}.png?api_key=YOUR_API_KEY',
        tileSize: 256,
        attribution: '&copy; <a href="https://here.com">HERE</a>'
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
    ],
    terrain: {
      source: 'terrain',
      exaggeration: 1.5
    }
  };
}

// Custom map controller for 3D terrain
function TerrainControl() {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      try {
        map.setTerrain({ source: 'terrain', exaggeration: 1.5 });
      } catch (e) {
        console.warn('Terrain not available:', e);
      }
    }
  }, [map]);

  return null;
}

// Map layer switcher component
function LayerSwitcher({ currentStyle, onStyleChange, showTerrain, onTerrainToggle }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg border border-slate-700 hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-sm font-medium">Layers</span>
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-slate-900/95 backdrop-blur-md rounded-lg shadow-xl border border-slate-700 overflow-hidden">
            <div className="p-2 space-y-1">
              {Object.entries(MAP_STYLES).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => {
                    onStyleChange(key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    currentStyle === key
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-700 p-2">
              <button
                onClick={() => {
                  onTerrainToggle();
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  showTerrain
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                3D Terrain
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced marker with animation
function AnimatedMarker({ children, longitude, latitude, isSelected, onClick }) {
  return (
    <Marker longitude={longitude} latitude={latitude} onClick={onClick}>
      <div
        className="transition-transform duration-300 cursor-pointer"
        style={{ transform: isSelected ? 'scale(1.2)' : 'scale(1)' }}
      >
        {children}
      </div>
    </Marker>
  );
}

// Main enhanced map component
export default function EnhancedMap({
  initialViewState,
  children,
  onMove,
  onMoveEnd,
  style = 'streets',
  showTerrain = false,
  onStyleChange,
  onTerrainToggle,
  className = '',
  ...props
}) {
  const mapStyle = createMapStyle(style);
  const [currentStyle, setCurrentStyle] = useState(style);

  const handleStyleChange = (newStyle) => {
    setCurrentStyle(newStyle);
    onStyleChange?.(newStyle);
  };

  return (
    <div className={`relative ${className}`}>
      <Map
        {...props}
        initialViewState={initialViewState}
        mapStyle={mapStyle}
        onMove={onMove}
        onMoveEnd={onMoveEnd}
        terrain={showTerrain ? { source: 'terrain', exaggeration: 1.5 } : undefined}
        pitch={showTerrain ? 60 : 0}
        bearing={showTerrain ? 0 : 0}
        attributionControl={false}
      >
        {children}

        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <NavigationControl showCompass={true} showZoom={true} />
          <FullscreenControl />
          <GeolocateControl
            trackUserLocation={true}
            showUserHeading={true}
            positionOptions={{ enableHighAccuracy: true }}
          />
        </div>

        <ScaleControl
          maxWidth={100}
          unit="imperial"
          position="bottom-left"
          className="bg-slate-900/90 backdrop-blur-md text-white border border-slate-700 rounded-lg p-2"
        />

        {/* Layer Switcher */}
        <LayerSwitcher
          currentStyle={currentStyle}
          onStyleChange={handleStyleChange}
          showTerrain={showTerrain}
          onTerrainToggle={onTerrainToggle}
        />

        {/* Terrain Control */}
        {showTerrain && <TerrainControl />}
      </Map>
    </div>
  );
}

export { MAP_STYLES, AnimatedMarker };
