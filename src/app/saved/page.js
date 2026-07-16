'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getMapStyleUrl } from '@/lib/map-style';
import LocationAccessCard from '@/components/privacy/LocationAccessCard';
import useLocationAccess from '@/hooks/useLocationAccess';
import useResolvedTheme from '@/hooks/useResolvedTheme';
import Map, { AttributionControl, Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { motion } from 'framer-motion';

const getPinColor = (index) => {
  const colors = [
    { bg: 'bg-emerald-500', text: 'text-emerald-500' },
    { bg: 'bg-blue-500', text: 'text-blue-500' },
    { bg: 'bg-indigo-500', text: 'text-indigo-500' },
    { bg: 'bg-purple-500', text: 'text-purple-500' },
    { bg: 'bg-pink-500', text: 'text-pink-500' },
    { bg: 'bg-rose-500', text: 'text-rose-500' },
    { bg: 'bg-orange-500', text: 'text-orange-500' },
    { bg: 'bg-amber-500', text: 'text-amber-500' },
  ];
  return colors[index % colors.length];
};

function TrailPin({ trail, index, isSelected, onClick }) {
  const d = getPinColor(index);
  return (
    <Marker longitude={trail.lng} latitude={trail.lat} onClick={(e) => { e.originalEvent.stopPropagation(); onClick(); }} style={{ zIndex: isSelected ? 100 : 10 }}>
      <div
        className="flex flex-col items-center cursor-pointer"
        style={{ transform: isSelected ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.2s' }}
      >
        <div className={`${d.bg} text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white`}>
          {index + 1}
        </div>
        <div className={`w-0.5 h-2 ${d.bg}`} />
      </div>
    </Marker>
  );
}

function UserPin({ position }) {
  return (
    <Marker longitude={position.lng} latitude={position.lat} style={{ zIndex: 200 }}>
      <div className="flex flex-col items-center gap-1">
        <div className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg border border-blue-400 whitespace-nowrap">
          📍 You are here
        </div>
        <div className="w-0.5 h-2 bg-blue-500" />
        <div className="relative flex items-center justify-center">
          <div className="absolute w-10 h-10 bg-blue-500/30 rounded-full animate-ping" />
          <div className="w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-lg" />
        </div>
      </div>
    </Marker>
  );
}

export default function SavedHikesPage() {
  const resolvedTheme = useResolvedTheme();
  const [savedHikes, setSavedHikes] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [quota, setQuota] = useState(null);
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' | 'completed' | 'planned'

  const [selectedIdx, setSelectedIdx] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(12);
  const [mapError, setMapError] = useState(false);
  const [mapRevision, setMapRevision] = useState(0);
  const mapRef = useRef(null);
  const cardRefs = useRef([]);
  const { locationAllowed, allowLocation, forgetLocation } = useLocationAccess();

  const loadQuota = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      setQuota(estimate);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQuota();
  }, []);

  useEffect(() => {
    const load = async () => {
      const hikes = await db.savedHikes.toArray();
      setSavedHikes(hikes);
      
      if (hikes.length > 0) {
        setMapCenter({ lat: hikes[0].lat, lng: hikes[0].lng });
      }
    };
    load();
  }, []);

  // Track live GPS
  useEffect(() => {
    if (!locationAllowed || savedHikes.length === 0 || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === 1) forgetLocation();
        console.log('GPS error', err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationAllowed, savedHikes.length, forgetLocation]);

  const removeHike = async (hike) => {
    await db.savedHikes.delete(hike.id);
    setSavedHikes(prev => {
      const next = prev.filter(h => h.id !== hike.id);
      if (next.length === 0) {
        setSelectedIdx(null);
      } else if (selectedIdx >= next.length) {
        setSelectedIdx(next.length - 1);
      }
      return next;
    });
  };

  const selectHike = (idx) => {
    const next = idx === selectedIdx ? null : idx;
    setSelectedIdx(next);
    if (next !== null && savedHikes[next]) {
      const h = savedHikes[next];
      setMapCenter({ lat: h.lat, lng: h.lng });
      setMapZoom(13);
      mapRef.current?.flyTo({ center: [h.lng, h.lat], zoom: 13, duration: 1000 });
      
      // Scroll card into view
      cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const fitAllHikes = useCallback(() => {
    if (!mapRef.current || savedHikes.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    savedHikes.forEach(h => {
      if (h.lat && h.lng) bounds.extend([h.lng, h.lat]);
    });
    if (userLoc) bounds.extend([userLoc.lng, userLoc.lat]);
    mapRef.current.fitBounds(bounds, { padding: 50, duration: 1000, maxZoom: 14 });
    setSelectedIdx(null);
  }, [userLoc, savedHikes]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans overflow-hidden h-screen">
      <header className="shrink-0 border-b border-slate-800 px-4 py-3 flex items-center gap-3 bg-slate-900 sticky top-0 z-20">
        <Link href="/search" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-white font-bold text-base flex-1">🧭 My Trails</h1>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative w-full">
        {/* Left Side: Hikes List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 md:w-1/2">
          
          {/* Tabs */}
          <div className="flex gap-2 bg-slate-800 p-1 rounded-xl shrink-0">
            {['saved', 'completed', 'planned'].map(tab => (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                whileTap={{ scale: 0.95 }}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'saved' ? '💾 Saved' : tab === 'completed' ? '✅ Completed' : '📅 Planned'}
              </motion.button>
            ))}
          </div>

          {/* Stats */}
          {savedHikes.length > 0 && (
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-center">
                <p className="text-lg font-bold text-white">{savedHikes.length}</p>
                <p className="text-[10px] text-slate-400">Saved</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-center">
                <p className="text-lg font-bold text-emerald-400">0</p>
                <p className="text-[10px] text-slate-400">Completed</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-center">
                <p className="text-lg font-bold text-amber-400">0</p>
                <p className="text-[10px] text-slate-400">Planned</p>
              </div>
            </div>
          )}

          {/* Storage Quota */}
          {quota && (
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Browser Storage</span>
                <span className="text-xs text-slate-400">{formatBytes(quota.usage)} used</span>
              </div>
              <span className="text-[10px] text-slate-500">Saved trail facts and GPS records</span>
            </div>
          )}

          {savedHikes.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center py-12">
              <span className="text-4xl opacity-50">🧭</span>
              <p className="text-slate-400 font-medium">No saved hikes</p>
              <p className="text-slate-500 text-sm max-w-xs">
                Save verified trail facts so you can review them later. The interactive basemap still requires a connection.
              </p>
              <Link href="/search" className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
                Find Hikes
              </Link>
            </div>
          ) : (
            <div className="space-y-4 pb-24">
              {savedHikes.map((hike, idx) => (
                <div 
                  key={hike.id}
                  ref={el => cardRefs.current[idx] = el}
                  onClick={() => selectHike(idx)}
                  className={`bg-slate-800 border rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200 ${
                    selectedIdx === idx ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full ${getPinColor(idx).bg} text-white text-[10px] font-bold flex items-center justify-center`}>
                          {idx + 1}
                        </span>
                        <h3 className="text-white font-bold text-base leading-tight">{hike.name}</h3>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeHike(hike);
                        }} 
                        className="text-rose-400 text-xs px-2 py-1 bg-rose-900/30 hover:bg-rose-900/50 rounded transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                    {hike.vicinity && <p className="text-slate-400 text-xs truncate">{hike.vicinity}</p>}
                    
                    <div className="flex gap-4 text-xs text-slate-300 mt-2">
                      {hike.length && <span>🥾 {hike.length}</span>}
                      {hike.elevationGain && <span>⬆️ {hike.elevationGain}</span>}
                      {hike.difficulty && <span className="text-indigo-300 font-medium">{hike.difficulty}</span>}
                    </div>
                    
                    {hike.why && (
                      <p className="text-sm text-indigo-200 border-l-2 border-indigo-500/50 pl-3 mt-2">{hike.why}</p>
                    )}
                    
                    <p className="text-[10px] text-slate-500 mt-2">
                      Saved on {new Date(hike.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Interactive Map */}
        {savedHikes.length > 0 && (
          <div className="shrink-0 h-[45vh] md:h-full md:w-1/2 relative z-10 border-t md:border-t-0 md:border-l border-slate-700 order-first md:order-last flex flex-col">
            <Map
              key={`saved-map-${mapRevision}`}
              ref={mapRef}
              initialViewState={{
                longitude: mapCenter?.lng || -122.4194,
                latitude: mapCenter?.lat || 37.7749,
                zoom: mapZoom
              }}
              mapStyle={getMapStyleUrl(resolvedTheme)}
              attributionControl={false}
              style={{ width: '100%', height: '100%' }}
              onZoom={(e) => setMapZoom(e.viewState.zoom)}
              onLoad={() => setMapError(false)}
              onError={(event) => {
                console.error('Map provider error:', event.error || event);
                setMapError(true);
              }}
            >
              <AttributionControl compact={false} position="bottom-right" />
              {userLoc && <UserPin position={userLoc} />}

              {savedHikes.map((hike, idx) =>
                hike.lat && hike.lng ? (
                  <TrailPin 
                    key={`pin-${idx}`} 
                    trail={hike} 
                    index={idx} 
                    isSelected={selectedIdx === idx} 
                    onClick={() => selectHike(idx)} 
                  />
                ) : null
              )}

              {savedHikes.map((hike, idx) =>
                hike.route ? (
                  <Source key={`source-${idx}`} id={`route-source-${idx}`} type="geojson" data={hike.route}>
                    <Layer
                      id={`route-layer-${idx}`}
                      type="line"
                      layout={{
                        'line-join': 'round',
                        'line-cap': 'round'
                      }}
                      paint={{
                        'line-color': selectedIdx === idx ? '#3b82f6' : '#94a3b8',
                        'line-width': selectedIdx === idx ? 4 : 2,
                        'line-dasharray': selectedIdx === idx ? [1] : [2, 2]
                      }}
                    />
                  </Source>
                ) : null
              )}

              {/* Map controls */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
                <button onClick={() => mapRef.current?.zoomTo(mapZoom + 1)} className="w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-600 rounded-xl text-white text-xl font-bold flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">+</button>
                <button onClick={() => mapRef.current?.zoomTo(mapZoom - 1)} className="w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-600 rounded-xl text-white text-xl font-bold flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">−</button>
                {userLoc && (
                  <button onClick={() => { setMapCenter({ ...userLoc }); mapRef.current?.flyTo({ center: [userLoc.lng, userLoc.lat], zoom: 13 }); }} title="My location" className="w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-600 rounded-xl text-white text-base flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">📍</button>
                )}
                <button onClick={fitAllHikes} title="Show all saved hikes" className="w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-600 rounded-xl text-white text-base flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">🔭</button>
              </div>
            </Map>
            {mapError && (
              <div role="status" className="absolute inset-x-4 top-4 z-40 rounded-xl border border-amber-400/40 bg-slate-950/95 p-4 text-sm text-amber-100 shadow-xl">
                <p className="font-semibold">Basemap temporarily unavailable</p>
                <p className="mt-1 text-xs text-slate-300">Your saved trail facts are still available. Do not rely on this map for navigation.</p>
                <button type="button" onClick={() => { setMapError(false); setMapRevision(revision => revision + 1); }} className="mt-3 rounded-lg border border-amber-300/40 px-3 py-1.5 text-xs font-semibold hover:bg-amber-300/10">Retry map</button>
              </div>
            )}
            {!locationAllowed && !mapError && (
              <div className="absolute left-4 right-16 top-4 z-30 max-w-md">
                <LocationAccessCard
                  compact
                  title="Show your position on saved trails?"
                  description="Your current position is used to orient this map. Saved GPS trail history remains on this device and is not uploaded."
                  allowLabel="Show my location"
                  onAllow={allowLocation}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
