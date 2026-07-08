'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';

export default function SavedHikesPage() {
  const [savedHikes, setSavedHikes] = useState([]);
  const [userLoc, setUserLoc] = useState(null);

  useEffect(() => {
    const load = async () => {
      const hikes = await db.savedHikes.toArray();
      
      // Convert blobs to object URLs
      const withUrls = hikes.map(h => ({
        ...h,
        imageUrl: h.mapImageBlob ? URL.createObjectURL(h.mapImageBlob) : null
      }));
      setSavedHikes(withUrls);
    };
    load();
  }, []);

  // Track live GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.log('GPS error', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const removeHike = async (id) => {
    await db.savedHikes.delete(id);
    setSavedHikes(prev => prev.filter(h => h.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans">
      <header className="shrink-0 border-b border-slate-800 px-4 py-3 flex items-center gap-3 bg-slate-900 sticky top-0 z-20">
        <Link href="/search" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-white font-bold text-base flex-1">💾 Offline Hikes</h1>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-6">
        {savedHikes.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
            <span className="text-4xl opacity-50">🧭</span>
            <p className="text-slate-400 font-medium">No saved hikes</p>
            <p className="text-slate-500 text-sm max-w-xs">
              Save hikes while you have an internet connection to view them here on the trail.
            </p>
            <Link href="/search" className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
              Find Hikes
            </Link>
          </div>
        ) : (
          savedHikes.map(hike => (
            <div key={hike.id} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex flex-col">
              
              {/* Static Map Container */}
              <div className="relative h-48 bg-slate-700 w-full overflow-hidden">
                {hike.imageUrl ? (
                  <img src={hike.imageUrl} alt="Map" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">No map image</div>
                )}
                
                {/* Simulated live GPS pin */}
                {userLoc && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 pointer-events-none">
                    <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                      You are here
                    </div>
                    <div className="w-0.5 h-1.5 bg-blue-500" />
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping" />
                      <div className="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-white font-bold text-base">{hike.name}</h3>
                  <button onClick={() => removeHike(hike.id)} className="text-rose-400 text-xs px-2 py-1 bg-rose-900/30 rounded">Remove</button>
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
          ))
        )}
      </div>
    </div>
  );
}
