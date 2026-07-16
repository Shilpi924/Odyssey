'use client';

import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Map, { AttributionControl, Marker, Popup, Source, Layer } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { db } from '@/lib/db';
import { getMapStyleUrl } from '@/lib/map-style';
import TrailCardSkeleton from '@/components/ui/TrailCardSkeleton';
import QuickFilters from '@/components/ui/QuickFilters';
import SearchHistory, { addToHistory } from '@/components/ui/SearchHistory';
import LocationAccessCard from '@/components/privacy/LocationAccessCard';
import TrailResultCard from '@/components/search/TrailResultCard';
import useLocationAccess from '@/hooks/useLocationAccess';
import useResolvedTheme from '@/hooks/useResolvedTheme';

// ─── Constants ─────────────────────────────────────────────────────────────────


const DIFF = {
  Easy:      { bg: 'bg-emerald-500', text: 'text-emerald-300', badge: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30', pin: '#22c55e' },
  Moderate:  { bg: 'bg-amber-500',   text: 'text-amber-300',   badge: 'bg-amber-400/10 text-amber-300 border border-amber-400/30',   pin: '#f59e0b' },
  Strenuous: { bg: 'bg-orange-500',  text: 'text-orange-300',  badge: 'bg-orange-400/10 text-orange-300 border border-orange-400/30', pin: '#f97316' },
  Expert:    { bg: 'bg-rose-500',    text: 'text-rose-300',    badge: 'bg-rose-400/10 text-rose-300 border border-rose-400/30',       pin: '#ef4444' },
};
const getDiff = (d) => DIFF[d] || DIFF.Moderate;

function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extendGeometryBounds(bounds, geometry) {
  if (!geometry?.coordinates) return bounds;
  const pending = [geometry.coordinates];
  while (pending.length > 0) {
    const value = pending.pop();
    if (!Array.isArray(value)) continue;
    if (value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
      bounds.extend([value[0], value[1]]);
      continue;
    }
    pending.push(...value);
  }
  return bounds;
}

const KNOWN_SEARCH_DESTINATIONS = [
  { pattern: /\b(?:mount|mt\.?)?\s*diablo(?: state park)?\b/i, lat: 37.8721, lng: -121.9414, name: 'Mount Diablo State Park, CA' },
  { pattern: /\btuolumne meadows\b/i, lat: 37.8735, lng: -119.3507, name: 'Tuolumne Meadows, Yosemite National Park' },
  { pattern: /\bhetch hetchy\b/i, lat: 37.9463, lng: -119.7870, name: 'Hetch Hetchy, Yosemite National Park' },
  { pattern: /\bmariposa grove\b/i, lat: 37.5063, lng: -119.5988, name: 'Mariposa Grove, Yosemite National Park' },
  { pattern: /\bglacier point\b/i, lat: 37.7275, lng: -119.5738, name: 'Glacier Point, Yosemite National Park' },
  { pattern: /\bwawona\b/i, lat: 37.5362, lng: -119.6552, name: 'Wawona, Yosemite National Park' },
  { pattern: /\byosemite(?: national park)?\b/i, lat: 37.8651, lng: -119.5383, name: 'Yosemite National Park, CA' },
];

function knownSearchDestination(query) {
  return KNOWN_SEARCH_DESTINATIONS.find(destination => destination.pattern.test(query || '')) || null;
}

function isNearbySearch(query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized || /^(hikes?|trails?)$/.test(normalized)) return true;
  return /\b(?:near\s+me|nearby|(?:my\s+)?current\s+location|around\s+me|close\s+to\s+me)\b/.test(normalized);
}

function trailMatchesQuickFilters(trail, activeFilters) {
  return activeFilters.every(filter => {
    if (filter === 'easy') return trail.difficulty === 'Easy';
    if (filter === 'moderate') return trail.difficulty === 'Moderate';
    if (filter === 'scenic') return trail.features?.includes('Scenic');
    return true;
  });
}

function withPlanningPreferences(preferences, searchParams) {
  const difficulty = searchParams.get('difficulty');
  const distance = searchParams.get('distance');
  const hiking = { ...(preferences?.hiking || {}) };
  if (['Easy', 'Moderate', 'Hard', 'Strenuous'].includes(difficulty)) hiking.difficulty = [difficulty];
  if (difficulty === 'Any') delete hiking.difficulty;
  if (['Under 3 miles', '3–5 miles', '5–10 miles'].includes(distance)) hiking.length = distance;
  if (distance === 'Any distance') delete hiking.length;
  return { ...preferences, hiking };
}

function TrailPin({ trail, index, isSelected, onClick }) {
  const markerRef = useRef(null);
  useEffect(() => {
    const element = markerRef.current?.getElement?.();
    if (!element) return;
    element.setAttribute('aria-label', `Show ${trail.name} on map`);
    element.setAttribute('aria-pressed', String(isSelected));
  }, [isSelected, trail.name]);
  return (
    <Marker ref={markerRef} longitude={trail.lng} latitude={trail.lat} onClick={(event) => { event.originalEvent.stopPropagation(); onClick(); }} style={{ zIndex: isSelected ? 100 : 10 }}>
      <div
        className="flex flex-col items-center cursor-pointer"
        style={{ transform: isSelected ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.2s' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-lg"
          style={{
            backgroundColor: isSelected ? 'var(--app-accent)' : 'var(--app-primary-strong)',
            color: isSelected ? 'var(--app-bg)' : '#ffffff',
          }}
        >
          {index + 1}
        </div>
        <div
          className="h-2 w-0.5"
          style={{ backgroundColor: isSelected ? 'var(--app-accent)' : 'var(--app-primary-strong)' }}
        />
      </div>
    </Marker>
  );
}

function UserPin({ position, heading }) {
  const rotation = heading !== null ? heading : 0;
  const userMarkerRef = useRef(null);
  useEffect(() => {
    const element = userMarkerRef.current?.getElement?.();
    if (!element) return;
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', 'Your current location');
    element.tabIndex = -1;
  }, []);
  return (
    <Marker ref={userMarkerRef} longitude={position.lng} latitude={position.lat} style={{ zIndex: 200 }}>
      <div className="flex flex-col items-center gap-1">
        <div className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg border border-blue-400 whitespace-nowrap">
          📍 You are here
        </div>
        <div className="w-0.5 h-2 bg-blue-500" />
        <div className="relative flex items-center justify-center">
          {/* Compass Direction Cone */}
          {heading !== null && (
            <div 
              className="absolute w-16 h-16 pointer-events-none transition-transform duration-300 ease-out"
              style={{ 
                transform: `rotate(${rotation}deg)`,
                background: 'radial-gradient(circle at top, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0) 70%)',
                clipPath: 'polygon(50% 50%, 20% 0%, 80% 0%)',
                top: '-24px'
              }}
            />
          )}
          <div className="absolute w-10 h-10 bg-blue-500/30 rounded-full animate-ping" />
          <div className="w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-lg" />
        </div>
      </div>
    </Marker>
  );
}

function MapPopup({ trail, index, onClose, onStartHike }) {
  const diffBadge = getDiff(trail.difficulty);
  return (
    <Popup
      longitude={trail.lng}
      latitude={trail.lat}
      anchor="bottom"
      offset={28}
      closeButton={false}
      closeOnClick={false}
      maxWidth="18rem"
      onClose={onClose}
    >
      <div className="relative w-64 overflow-hidden rounded-2xl bg-[var(--app-surface)] p-4 text-[var(--app-text)]">
        <button
          type="button"
          aria-label="Close trail details"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-surface-raised)] text-xs text-[var(--app-muted)] hover:text-[var(--app-text)]"
        >
          ✕
        </button>
        <div className="flex items-start gap-2 mb-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent)] text-xs font-bold text-[var(--app-bg)]">{index + 1}</span>
          <h4 className="text-sm font-semibold leading-tight text-[var(--app-text)]">{trail.name}</h4>
        </div>
        {(trail.length || trail.elevationGain || trail.difficulty) && (
          <div className="mb-3 flex gap-2 text-xs text-[var(--app-muted)]">
            {trail.length && <span>🥾 {trail.length}</span>}
            {trail.elevationGain && <span>⬆️ {trail.elevationGain}</span>}
            {trail.difficulty && <span className={`font-semibold ${diffBadge.text}`}>{trail.difficulty}</span>}
          </div>
        )}
        {!trail.difficulty && (
          <p className="mb-3 text-[11px] leading-relaxed text-amber-200">Difficulty is not listed. Verify the official source before starting.</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartHike(trail);
            }}
            className="flex-1 rounded-xl bg-[var(--app-primary)] py-2.5 text-sm font-bold text-[var(--app-bg)] transition-opacity hover:opacity-90"
          >
            🚶 Start Hike
          </button>
        </div>
      </div>
    </Popup>
  );
}

// ─── Safety Panel & Helpers ───────────────────────────────────────────────────

const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

const startBackgroundAudio = () => {
  try {
    const audio = new Audio(SILENT_WAV);
    audio.loop = true;
    audio.play().catch(e => console.warn('Failed to play background audio:', e));
    return audio;
  } catch (e) {
    console.warn('Background audio failed:', e);
    return null;
  }
};

function SafetyPanel({ userLocation, onClose, isOffline }) {
  const [step, setStep] = useState('initial'); // 'initial' | 'danger' | 'safe'
  
  const handleShareLocation = () => {
    const lat = userLocation?.lat?.toFixed(5) || 'Unknown';
    const lng = userLocation?.lng?.toFixed(5) || 'Unknown';
    const acc = userLocation?.accuracy ? Math.round(userLocation.accuracy) : 'unknown';
    const elev = userLocation?.elevation ? Math.round(userLocation.elevation * 3.28084) : 'unknown';
    
    const text = `I am hiking and am lost. My coordinates are: Lat ${lat}, Lng ${lng} (Accuracy: ${acc}m, Elevation: ${elev}ft). Please help.`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My Hiking Coordinates',
        text: text,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert('Location copied to clipboard! You can paste it into SMS or an email.');
    }
  };

  const latText = userLocation?.lat?.toFixed(5) || 'Fetching...';
  const lngText = userLocation?.lng?.toFixed(5) || 'Fetching...';
  const accText = userLocation?.accuracy ? `${Math.round(userLocation.accuracy * 3.28084)} ft` : 'Unavailable';
  const elevText = userLocation?.elevation ? `${Math.round(userLocation.elevation * 3.28084)} ft` : 'Unavailable';
  const timeText = userLocation?.timestamp ? new Date(userLocation.timestamp).toLocaleTimeString() : 'Unavailable';

  return (
    <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl relative">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all"
      >
        ✕ Exit Safety
      </button>

      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <span className="text-3xl animate-pulse">🆘</span>
        <div>
          <h2 className="text-white font-bold text-lg">Safety Mode</h2>
          <p className="text-slate-400 text-xs">Deterministic Emergency Guidelines</p>
        </div>
      </div>

      {/* GPS Information Box */}
      <div className="bg-slate-955 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Live Coordinates</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-400 block text-xs">Latitude</span>
            <span className="text-white font-mono font-bold text-base">{latText}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">Longitude</span>
            <span className="text-white font-mono font-bold text-base">{lngText}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">Accuracy</span>
            <span className={`font-mono font-semibold ${userLocation?.accuracy > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {accText}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">Elevation</span>
            <span className="text-white font-mono font-semibold">{elevText}</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 border-t border-slate-900/50 pt-2 mt-1">
          Last updated: {timeText} | Status: {isOffline ? 'Offline' : 'Connected'}
        </div>
      </div>

      {step === 'initial' && (
        <div className="flex flex-col gap-4">
          <p className="text-slate-300 text-sm leading-relaxed text-center">
            Are you injured, experiencing a medical emergency, or in immediate danger?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setStep('danger')}
              className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 text-base"
            >
              ⚠️ YES, I&apos;m in danger
            </button>
            <button
              onClick={() => setStep('safe')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 text-base"
            >
              🌿 NO, I&apos;m lost but safe
            </button>
          </div>
        </div>
      )}

      {step === 'danger' && (
        <div className="flex flex-col gap-5">
          <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl text-rose-200 text-sm leading-relaxed space-y-2">
            <p className="font-bold text-rose-300">🚨 Immediate Danger Instructions:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Tap below to call local emergency services immediately.</li>
              <li>Read your coordinates exactly to the dispatcher.</li>
              <li>Tell them about any injuries, food, water, and clothing.</li>
              <li>Describe nearby visible landmarks or ridges.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href="tel:911"
              className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 text-base text-center block"
            >
              📞 Call Emergency Services (911)
            </a>
            <button
              onClick={handleShareLocation}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all duration-200 text-sm"
            >
              ✉️ Share Coordinates with Emergency Contact
            </button>
            <button
              onClick={() => setStep('initial')}
              className="text-slate-400 hover:text-white text-xs font-semibold text-center mt-2"
            >
              ← Back to question
            </button>
          </div>
        </div>
      )}

      {step === 'safe' && (
        <div className="flex flex-col gap-5">
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-emerald-200 text-sm leading-relaxed space-y-2">
            <p className="font-bold text-emerald-300">🛑 Safe but Lost Instructions:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>STOP MOVING.</strong> Do not hike blindly to avoid getting further lost.</li>
              <li>Use your locally recorded route (green line) to retrace your path when it is visible.</li>
              <li>Conserve battery: Dim screen, close other apps, put phone in low power mode.</li>
              <li>Stay visible. Keep warm or shaded as weather dictates.</li>
              <li>Use a whistle (3 short blasts) or mirror to signal rescuers.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleShareLocation}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 text-base"
            >
              ✉️ Share Location with Contacts
            </button>
            <button
              onClick={() => setStep('initial')}
              className="text-slate-400 hover:text-white text-xs font-semibold text-center mt-2"
            >
              ← Back to question
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main search content ───────────────────────────────────────────────────────

function HikeSearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const mobileView = searchParams.get('view') === 'map' ? 'map' : 'results';
  const { locationAllowed, locationReady, allowLocation, forgetLocation } = useLocationAccess();
  const resolvedTheme = useResolvedTheme();

  // ── Search state
  const [status, setStatus] = useState('idle');
  const [trails, setTrails] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [source, setSource] = useState(null); // 'catalog' | 'openstreetmap'
  const [locationName, setLocationName] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState({});
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [weather, setWeather] = useState(null);
  const [parkAlerts, setParkAlerts] = useState([]);
  const [alertsFetchedAt, setAlertsFetchedAt] = useState(null);
  const [coverageMessage, setCoverageMessage] = useState('');

  // ── Search input state
  const [searchQuery, setSearchQuery] = useState(query && query !== 'hikes' ? query : '');
  const [showSearchEditor, setShowSearchEditor] = useState(false);
  const groupMode = false;
  const groupDescription = '';
  const searchRadius = 25;
  const priceRange = '';
  
  // ── Filter state
  const [activeFilters, setActiveFilters] = useState([]);
  
  // ── Preloading cache
  const [preloadedData, setPreloadedData] = useState(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadedKey, setPreloadedKey] = useState(null);

  // ── Map state
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(12);
  const [mapToolsOpen, setMapToolsOpen] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapRevision, setMapRevision] = useState(0);
  const [routeGeometries, setRouteGeometries] = useState({});
  const [routeGeometryStatus, setRouteGeometryStatus] = useState({});

  // ── Offline & Saved state
  const [isOffline, setIsOffline] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());

  const handleSaveHike = async (trail) => {
    try {
      const id = `${trail.name}-${trail.lat}`;
      if (savedIds.has(id)) {
        await db.savedHikes.where('id').equals(id).delete();
        setSavedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      } else {
        await db.savedHikes.put({
          id,
          ...trail,
          savedAt: Date.now()
        });
        setSavedIds(prev => new Set(prev).add(id));
      }
    } catch (err) {
      console.error('Error saving hike:', err);
    }
  };

  const cardRefs = useRef([]);
  const mapRef = useRef(null);
  const mapErrorReportedRef = useRef(false);
  const selectedTrailIdRef = useRef(null);

  // ── Hike Tracking state
  const [isHiking, setIsHiking] = useState(false);
  const [activeHike, setActiveHike] = useState(null);
  const [hikeDistance, setHikeDistance] = useState(0);
  const [hikeDuration, setHikeDuration] = useState(0);
  const [hikeElevationGain, setHikeElevationGain] = useState(0);
  const [hikeSpeed, setHikeSpeed] = useState(0);
  const [hikeHeading, setHikeHeading] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const lastLocRef = useRef(null);

  // ── Safety Mode, Compass Heading, Rotation Mode & Trail Track States
  const [hikePath, setHikePath] = useState([]);
  const [rawPath, setRawPath] = useState([]);
  const [isSafetyMode, setIsSafetyMode] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState(null);
  const [mapRotationMode, setMapRotationMode] = useState('north'); // 'north' | 'compass'
  const [gpsStatus, setGpsStatus] = useState('Acquiring'); // 'Acquiring' | 'Good' | 'Weak' | 'Unavailable' | 'Denied'
  const [altitudeHistory, setAltitudeHistory] = useState([]); // rolling altitude points for smoothing
  const [wakeLock, setWakeLock] = useState(null);
  const [recoveredHike, setRecoveredHike] = useState(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [pendingHike, setPendingHike] = useState(null);
  
  const audioRef = useRef(null);
  const hikeTimingsRef = useRef({ startedAt: 0, totalPausedMs: 0, pausedAt: 0 });

  // ── Screen Wake Lock Helpers
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        console.log('Screen Wake Lock acquired.');
      } catch (err) {
        console.warn('Screen Wake Lock failed:', err.message);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLock) {
      try {
        wakeLock.release().then(() => setWakeLock(null));
        console.log('Screen Wake Lock released.');
      } catch {}
    }
  };

  // Re-acquire wake lock if tab is refocused
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isHiking && !isPaused) {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isHiking, isPaused, wakeLock]);

  // ── Network status listener & Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
      } else {
        // A production worker can otherwise serve stale bundles while developing
        // or running browser tests on the same origin.
        navigator.serviceWorker.getRegistrations()
          .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
          .catch(console.error);
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOffline(!navigator.onLine);
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // ── Load saved IDs from Dexie
  useEffect(() => {
    const loadSaved = async () => {
      const allSaved = await db.savedHikes.toArray();
      setSavedIds(new Set(allSaved.map(h => `${h.name}-${h.lat}`)));
    };
    loadSaved();
  }, []);

  // ── Auto-Recovery: Restore Active Hike Session from IndexedDB on Mount
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const activeRecord = await db.activeHikes.where('status').equals('active').first();
        if (activeRecord) {
          // Load route points from IndexedDB
          const points = await db.activeHikePoints
            .where('hikeId')
            .equals(activeRecord.id)
            .toArray();
          
          const sortedPoints = points.sort((a, b) => a.timestamp - b.timestamp);
          const accepted = sortedPoints.filter(p => p.accepted);
          
          setHikeDistance(activeRecord.distanceMeters / 1609.344); // meters to miles
          setHikeElevationGain(activeRecord.elevationGainMeters * 3.28084); // meters to feet
          setHikePath(accepted.map(p => [p.longitude, p.latitude]));
          setRawPath(sortedPoints.map(p => [p.longitude, p.latitude]));
          setIsPaused(activeRecord.pausedAt !== null);

          // Compute accurate recovered elapsed duration from timestamps
          const now = Date.now();
          const duration = Math.floor(
            ((activeRecord.pausedAt || now) - activeRecord.startedAt - activeRecord.totalPausedMs) / 1000
          );
          setHikeDuration(duration);

          hikeTimingsRef.current = {
            startedAt: activeRecord.startedAt,
            totalPausedMs: activeRecord.totalPausedMs,
            pausedAt: activeRecord.pausedAt
          };

          setRecoveredHike(activeRecord);
          setShowRecoveryModal(true);
        }
      } catch (err) {
        console.error('Failed to restore active hike session:', err);
      }
    };
    checkActiveSession();
  }, []);

  // ── Auto-Save Active Hike Session Metadata to IndexedDB
  useEffect(() => {
    if (isHiking && activeHike && recoveredHike) {
      const saveMetadata = async () => {
        try {
          await db.activeHikes.put({
            id: recoveredHike.id,
            name: activeHike.name,
            status: 'active',
            startedAt: hikeTimingsRef.current.startedAt,
            pausedAt: hikeTimingsRef.current.pausedAt,
            totalPausedMs: hikeTimingsRef.current.totalPausedMs,
            distanceMeters: hikeDistance * 1609.344, // miles to meters
            elevationGainMeters: hikeElevationGain / 3.28084 // feet to meters
          });
        } catch (err) {
          console.error('Failed to save active hike metadata:', err);
        }
      };
      saveMetadata();
    }
  }, [isHiking, activeHike, recoveredHike, hikeDistance, hikeElevationGain]);

  // ── Sync Map Rotation Mode with DOM dataset to prevent orientation stale closures
  useEffect(() => {
    document.documentElement.dataset.rotationMode = mapRotationMode;
    if (mapRotationMode === 'north' && mapRef.current) {
      try {
        mapRef.current.setBearing(0); // Reset map rotation
      } catch {}
    }
  }, [mapRotationMode]);

  // ── Watch live GPS location
  useEffect(() => {
    if (!locationAllowed || isHiking || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { accuracy } = pos.coords;
        if (accuracy <= 20) {
          setGpsStatus('Good');
        } else if (accuracy <= 80) {
          setGpsStatus('Weak');
        } else {
          setGpsStatus('Poor');
        }

        setUserLocation({ 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          elevation: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp
        });
      },
      (err) => {
        if (err.code === 1) {
          setGpsStatus('Denied');
          forgetLocation();
        } else {
          setGpsStatus('Unavailable');
        }
        console.log('GPS error', err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationAllowed, isHiking, forgetLocation]);

  // ── Request Persistent Storage
  useEffect(() => {
    const requestPersist = async () => {
      if (navigator.storage && navigator.storage.persist) {
        const persisted = await navigator.storage.persist();
        console.log('Persistent storage status:', persisted);
      }
    };
    requestPersist();
  }, []);

  // ── Watch Device Orientation (Compass)
  useEffect(() => {
    const handleOrientation = (e) => {
      const heading = e.webkitCompassHeading !== undefined ? e.webkitCompassHeading : (360 - e.alpha);
      setDeviceHeading(heading);
      setHikeHeading(heading);

      // Rotate map bearing if Compass-Up is enabled
      const isCompassMode = document.documentElement.dataset.rotationMode === 'compass';
      if (isCompassMode && mapRef.current) {
        try {
          mapRef.current.setBearing(heading);
        } catch {}
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('deviceorientationabsolute', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    };
  }, []);

  // ── Load preferences
  useEffect(() => {
    let next = {};
    const saved = localStorage.getItem('userPreferences');
    if (saved) { try { next = JSON.parse(saved); } catch {} }
    const difficulty = searchParams.get('difficulty');
    const distance = searchParams.get('distance');
    const accessibility = searchParams.get('accessibility');
    const group = searchParams.get('group');
    if (difficulty) next = { ...next, hiking: { ...(next.hiking || {}), difficulty: difficulty.split(',') } };
    if (distance) next = { ...next, hiking: { ...(next.hiking || {}), length: distance } };
    if (accessibility) next = { ...next, accessibility: accessibility.split(',').filter(Boolean) };
    if (group) next = { ...next, groupDynamics: group };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferences(next);
    setPreferencesReady(true);
  }, [searchParams]);

  // ── Background Preloading of Hikes Near Me
  useEffect(() => {
    if (isOffline || !userLocation || status !== 'idle' || searchQuery !== '') return;

    const currentKey = `${userLocation.lat}|${userLocation.lng}|${JSON.stringify(preferences)}|${searchRadius}|${priceRange || 'null'}|${groupMode ? groupDescription : ''}`;
    
    if (preloadedKey === currentKey || isPreloading) return;

    const preload = async () => {
      setIsPreloading(true);
      try {
        const locName = (await getLocationName(userLocation.lat, userLocation.lng)) || `${userLocation.lat.toFixed(3)}, ${userLocation.lng.toFixed(3)}`;
        const res = await fetch('/api/smart-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: userLocation.lat,
            lng: userLocation.lng,
            locationName: locName,
            naturalLanguageQuery: '',
            preferences,
            groupDescription: groupMode ? groupDescription : null,
            radius: searchRadius,
            priceRange: priceRange || null,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPreloadedData({ data, locName });
          setPreloadedKey(currentKey);
        }
      } catch (e) {
        console.warn('Preload failed', e);
      } finally {
        setIsPreloading(false);
      }
    };

    preload();
  }, [userLocation, preferences, searchRadius, priceRange, groupMode, groupDescription, isOffline, status, searchQuery, preloadedKey, isPreloading]);

  const fitTrailCollection = useCallback((trailCollection) => {
    if (!mapRef.current || trailCollection.length === 0) {
      if (userLocation) {
        setMapCenter({ ...userLocation });
        setMapZoom(11);
        mapRef.current?.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 11 });
      }
      return;
    }
    
    const bounds = new maplibregl.LngLatBounds();
    trailCollection.forEach(t => {
      if (t.lat && t.lng) bounds.extend([t.lng, t.lat]);
    });
    if (userLocation && (isNearbySearch(searchQuery) || isHiking)) {
      bounds.extend([userLocation.lng, userLocation.lat]);
    }
    
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, {
        padding: { top: 72, right: 52, bottom: 72, left: 52 },
        duration: 700,
        maxZoom: 13.5,
      });
    }
  }, [isHiking, searchQuery, userLocation]);

  const fitAllTrails = useCallback(() => {
    fitTrailCollection(trails.filter(trail => trailMatchesQuickFilters(trail, activeFilters)));
  }, [activeFilters, fitTrailCollection, trails]);

  function getLocation() {
    return new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
    );
  }

  async function getLocationName(lat, lng) {
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }

  async function getPlaceCoordinates(place) {
    return knownSearchDestination(place);
  }

  const runSearch = useCallback(
    async (locationAuthorized = false, destinationOverride = null) => {
      setStatus('locating');
      setTrails([]);
      setHasMore(true);
      setError('');
      selectedTrailIdRef.current = null;
      setExpandedIdx(null);
      setSelectedIdx(null);
      setWeather(null);
      setParkAlerts([]);
      setAlertsFetchedAt(null);
      setCoverageMessage('');

      const requestedQuery = destinationOverride ?? searchQuery;
      const requestPreferences = withPlanningPreferences(preferences, searchParams);
      const knownDestination = knownSearchDestination(requestedQuery);
      const needsDeviceLocation = isNearbySearch(requestedQuery);
      if (needsDeviceLocation && !locationAllowed && !locationAuthorized) {
        setStatus('location');
        return;
      }

      try {
        // A named place search should not wait for device GPS. GPS is only needed
        // for "near me" searches and distance-from-me features.
        const pos = knownDestination || !needsDeviceLocation ? null : await getLocation();
        const current = pos
          ? { lat: pos.coords.latitude, lng: pos.coords.longitude }
          : knownDestination || { lat: 37.8651, lng: -119.5383 };
        if (pos) setUserLocation(current);
        const plannedDestination = knownDestination || (searchParams.get('plan') && requestedQuery ? await getPlaceCoordinates(requestedQuery) : null);
        const lat = plannedDestination?.lat ?? current.lat;
        const lng = plannedDestination?.lng ?? current.lng;
        setMapCenter({ lat, lng });

        // Check if we have matching preloaded data
        let usePreload = false;
        if (requestedQuery === '' && preloadedData && preloadedKey) {
          const keyParts = preloadedKey.split('|');
          const [pLat, pLng, pPrefs, pRadius, pPrice, pGroup] = keyParts;
          const latDiff = Math.abs(lat - parseFloat(pLat));
          const lngDiff = Math.abs(lng - parseFloat(pLng));
          const currentPrefs = JSON.stringify(requestPreferences);
          
          if (
            latDiff < 0.002 && 
            lngDiff < 0.002 && 
            pPrefs === currentPrefs && 
            pRadius === String(searchRadius) && 
            pPrice === String(priceRange || 'null') && 
            pGroup === (groupMode ? groupDescription : '')
          ) {
            usePreload = true;
          }
        }

        if (usePreload) {
          const { data, locName: pLocName } = preloadedData;
          setLocationName(pLocName);
          setTrails(data.trails || []);
          setWeather(data.weather || null);
          setSource(data.source || 'fast');
          setCoverageMessage(data.coverage?.message || '');
          
          setStatus('done');
          return;
        }

        const unsupportedNamedDestination = requestedQuery.trim() && !needsDeviceLocation && !plannedDestination;
        const locName = plannedDestination?.name || (unsupportedNamedDestination ? '' : await getLocationName(lat, lng));
        setLocationName(locName);
        setStatus('searching');

        // Add to search history
        if (requestedQuery) {
          addToHistory(requestedQuery);
        }

        const res = await fetch('/api/fast-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lng,
            query: requestedQuery,
            preferences: requestPreferences,
            radius: searchRadius,
            priceRange: priceRange || null,
          }),
        });
        
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.error || 'Search failed');
        }
        
        const data = await res.json();
        setTrails(data.trails || []);
        setWeather(data.weather || null);
        setSource(data.source || 'fast');
        setHasMore(Boolean(data.hasMore));
        setCoverageMessage(data.coverage?.message || '');
        setStatus('done');

        if (data.entity?.id === 'nps-yose' || data.entity?.parkId === 'nps-yose') {
          try {
            const alertsResponse = await fetch('/api/park-alerts?parkCode=yose');
            const alertsData = await alertsResponse.json();
            if (alertsResponse.ok && alertsData.available) {
              setParkAlerts(alertsData.alerts || []);
              setAlertsFetchedAt(alertsData.fetchedAt || null);
            }
          } catch {}
        }

      } catch (err) {
        if (err.code === 1) forgetLocation();
        setError(
          err.code === 1
            ? 'Location access denied. Please enable location in your browser.'
            : err.message || 'Something went wrong.'
        );
        setStatus('error');
      }
    },
    [searchQuery, preferences, groupMode, groupDescription, searchRadius, preloadedData, preloadedKey, priceRange, searchParams, locationAllowed, forgetLocation]
  );

  // Filtering is derived data; memoization avoids a second render and stale results.
  const filteredTrails = useMemo(
    () => trails.filter(trail => trailMatchesQuickFilters(trail, activeFilters)),
    [activeFilters, trails]
  );

  // Session Storage Caching
  useEffect(() => {
    if (status === 'done' && trails.length > 0) {
      sessionStorage.setItem('odyssey_verified_search_cache_v1', JSON.stringify({
        query: searchParams.get('q'),
        status,
        trails,
        searchQuery,
        source,
        hasMore,
        weather,
        locationName,
        userLocation,
        coverageMessage
      }));
    }
  }, [status, trails, searchQuery, source, hasMore, weather, locationName, userLocation, searchParams, coverageMessage]);

  // Auto-trigger when navigated from home
  useEffect(() => {
    if (status !== 'idle' || !preferencesReady || !locationReady) return;
    
    sessionStorage.removeItem('odyssey_search_cache');
    const cached = sessionStorage.getItem('odyssey_verified_search_cache_v1');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // If the URL has a query, it must match. If it doesn't have a query, but we have a cache, restore it.
        if (parsed.query === query || (!query && parsed.query)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setStatus(parsed.status);
          setTrails(parsed.trails);
          setSearchQuery(parsed.searchQuery);
          setSource(parsed.source);
          setHasMore(parsed.hasMore);
          setWeather(parsed.weather);
          setCoverageMessage(parsed.coverageMessage || '');
          setLocationName(parsed.locationName);
          setUserLocation(parsed.userLocation);
          return;
        }
      } catch (e) {}
    }

    if ((query || searchParams.get('nearme') === 'true') && status === 'idle') runSearch();
  }, [query, preferencesReady, locationReady]); // eslint-disable-line

  const fitTrailOnMap = useCallback((trail, geometry) => {
    if (!mapRef.current || !trail?.lat || !trail?.lng) return;
    const bounds = extendGeometryBounds(new maplibregl.LngLatBounds(), geometry);
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, {
        padding: { top: 96, right: 72, bottom: 96, left: 72 },
        duration: 650,
        maxZoom: 14,
      });
      return;
    }
    mapRef.current.flyTo({ center: [trail.lng, trail.lat], zoom: 13, duration: 650 });
  }, []);

  const focusTrailOnMap = (idx) => {
    const trail = trails[idx];
    if (!trail?.lat || !trail?.lng) return;
    selectedTrailIdRef.current = trail.placeId || null;
    setSelectedIdx(idx);
    setMapCenter({ lat: trail.lat, lng: trail.lng });
    setMapZoom(13);

    const cachedGeometry = routeGeometries[trail.placeId];
    fitTrailOnMap(trail, cachedGeometry);

    if (!trail.geometryUrl || cachedGeometry || routeGeometryStatus[trail.placeId] === 'loading') return;
    setRouteGeometryStatus(previous => ({ ...previous, [trail.placeId]: 'loading' }));
    fetch(trail.geometryUrl)
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Route geometry unavailable')))
      .then(data => {
        if (!data.geometry) throw new Error('Route geometry unavailable');
        setRouteGeometries(previous => ({ ...previous, [trail.placeId]: data.geometry }));
        setRouteGeometryStatus(previous => ({ ...previous, [trail.placeId]: 'loaded' }));
        if (selectedTrailIdRef.current === trail.placeId) fitTrailOnMap(trail, data.geometry);
      })
      .catch(() => setRouteGeometryStatus(previous => ({ ...previous, [trail.placeId]: 'error' })));
  };

  const showAllTrails = useCallback(() => {
    selectedTrailIdRef.current = null;
    setSelectedIdx(null);
    window.requestAnimationFrame(fitAllTrails);
  }, [fitAllTrails]);

  const toggleTrailDetails = (idx) => {
    setExpandedIdx(current => current === idx ? null : idx);
  };

  const updateQuickFilters = (nextFilters) => {
    selectedTrailIdRef.current = null;
    setSelectedIdx(null);
    setActiveFilters(nextFilters);
    window.requestAnimationFrame(() => {
      fitTrailCollection(trails.filter(trail => trailMatchesQuickFilters(trail, nextFilters)));
    });
  };

  const viewTrailOnMap = (idx) => {
    focusTrailOnMap(idx);
    window.requestAnimationFrame(() => {
      document.getElementById('trail-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const calculateDistanceMiles = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180; 
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2); 
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const startHike = (trail, isRestored = false, isRestoredPaused = false, locationAuthorized = false) => {
    if (!navigator.geolocation) {
      window.alert('GPS is not available in this browser, so hike tracking cannot start.');
      return;
    }
    if (!locationAllowed && !locationAuthorized) {
      setPendingHike({ trail, isRestored, isRestoredPaused });
      return;
    }
    if (!isRestored && userLocation) {
      const distance = calculateDistanceMiles(userLocation.lat, userLocation.lng, trail.lat, trail.lng);
      if (distance > 3.0) {
        if (!window.confirm(`You are over 3 miles away from the trailhead (${distance.toFixed(1)} mi). Starting the hike now may result in inaccurate tracking. Are you sure you want to start?`)) {
          return;
        }
      }
    }

    setIsHiking(true);
    setIsPaused(isRestored ? isRestoredPaused : false);
    setActiveHike(trail);
    document.documentElement.dataset.paused = (isRestored ? isRestoredPaused : false) ? 'true' : 'false';

    const now = Date.now();

    if (!isRestored) {
      const newHikeId = `hike-${now}`;
      const record = {
        id: newHikeId,
        name: trail.name,
        status: 'active',
        startedAt: now,
        pausedAt: null,
        totalPausedMs: 0,
        distanceMeters: 0,
        elevationGainMeters: 0
      };
      
      // Save pointers in state & DB
      db.activeHikes.put(record).catch(err => console.error('DB put failed:', err));
      setRecoveredHike(record);

      hikeTimingsRef.current = { startedAt: now, totalPausedMs: 0, pausedAt: null };
      setHikeDistance(0);
      setHikeDuration(0);
      setHikeElevationGain(0);
      setHikeSpeed(0);
      setHikeHeading(null);
      setHikePath([]);
      setRawPath([]);
      setAltitudeHistory([]);
      lastLocRef.current = null;
    }

    // Start silent audio loop to keep GPS background worker alive
    audioRef.current = startBackgroundAudio();
    requestWakeLock();

    // Timestamp-based duration timer (eliminates drift from tab sleep)
    timerRef.current = setInterval(() => {
      const tNow = Date.now();
      const start = hikeTimingsRef.current.startedAt;
      const totalPaused = hikeTimingsRef.current.totalPausedMs;
      const currentPause = hikeTimingsRef.current.pausedAt ? (tNow - hikeTimingsRef.current.pausedAt) : 0;
      const elapsed = Math.floor((tNow - start - totalPaused - currentPause) / 1000);
      setHikeDuration(Math.max(0, elapsed));
    }, 1000);

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          // If paused, we don't accumulate stats or follow location
          const isCurrentlyPaused = document.documentElement.dataset.paused === 'true';
          if (isCurrentlyPaused) return;

          const { latitude, longitude, altitude, speed, heading, accuracy, altitudeAccuracy } = pos.coords;

          // 1. Log to rawPath representation
          setRawPath(prev => [...prev, [longitude, latitude]]);

          let isAccepted = true;
          let rejectionReason = null;

          // 2. Accuracy Tiers validation
          if (accuracy && accuracy > 40) {
            // Display location using dot but do not add to distance calculations
            isAccepted = false;
            rejectionReason = 'low_accuracy';
          }

          let distanceMoved = 0;
          let elapsedSeconds = 0;
          if (lastLocRef.current) {
            distanceMoved = distanceMiles(lastLocRef.current.lat, lastLocRef.current.lng, latitude, longitude) * 1609.344; // in meters
            elapsedSeconds = (pos.timestamp - lastLocRef.current.timestamp) / 1000;

            // 3. Unrealistic Jump filter (rejects coordinate jumps > 43 km/h / 12 m/s)
            if (elapsedSeconds > 0) {
              const impliedSpeed = distanceMoved / elapsedSeconds;
              if (impliedSpeed > 12) {
                isAccepted = false;
                rejectionReason = 'unrealistic_jump';
              }
            }
          }

          // 4. Dynamic Movement Threshold
          const prevAccuracy = lastLocRef.current?.accuracy || accuracy || 10;
          const movementThreshold = Math.max(5, prevAccuracy * 0.35, accuracy * 0.35); // meters

          // 5. Stationary Check
          // Restricting stationary drift checks to frequent updates (elapsedSeconds < 20)
          // so resume jumps are not misclassified as standing still.
          const likelyStationary = distanceMoved < movementThreshold &&
            elapsedSeconds < 20 &&
            (speed == null || speed < 0.15);

          if (likelyStationary) {
            isAccepted = false;
            rejectionReason = 'stationary_drift';
          }

          // 6. Log point record to IndexedDB
          const currentRecord = recoveredHike || { id: `hike-${hikeTimingsRef.current.startedAt}` };
          db.activeHikePoints.put({
            hikeId: currentRecord.id,
            latitude,
            longitude,
            altitude,
            accuracy,
            altitudeAccuracy,
            heading,
            speed,
            timestamp: pos.timestamp,
            accepted: isAccepted,
            rejectionReason
          }).catch(err => console.error('Failed to record point:', err));

          // 7. Update live tracking stats if accepted
          if (isAccepted) {
            if (lastLocRef.current) {
              const distMilesVal = distanceMoved / 1609.344;
              setHikeDistance(prev => prev + distMilesVal);

              // 8. Altitude Smoothing & Climb Gain Thresholds
              if (altitude !== null) {
                // Falling back to 10 points smoothing + 5 meters threshold if altitudeAccuracy is null
                const hasAltAcc = altitudeAccuracy !== null && altitudeAccuracy !== undefined;
                if (!hasAltAcc || altitudeAccuracy <= 15) {
                  const windowSize = hasAltAcc ? 5 : 10;
                  const newHistory = [...altitudeHistory, altitude].slice(-windowSize);
                  setAltitudeHistory(newHistory);

                  const avgAlt = newHistory.reduce((a, b) => a + b, 0) / newHistory.length;

                  if (lastLocRef.current.avgAlt) {
                    const diffAlt = avgAlt - lastLocRef.current.avgAlt;
                    const climbThreshold = hasAltAcc ? 3 : 5; // meters
                    if (diffAlt >= climbThreshold) {
                      setHikeElevationGain(prev => prev + (diffAlt * 3.28084)); // meters to feet
                    }
                  }
                  lastLocRef.current.avgAlt = avgAlt;
                }
              }
            }

            setHikePath(prev => [...prev, [longitude, latitude]]);
            
            lastLocRef.current = { 
              lat: latitude, 
              lng: longitude, 
              altitude, 
              accuracy, 
              timestamp: pos.timestamp,
              avgAlt: lastLocRef.current?.avgAlt
            };

            if (speed !== null) {
              setHikeSpeed(speed * 2.23694); // m/s to mph
            }
            if (heading !== null) {
              setHikeHeading(heading);
            }
          }

          // Always update dot location circle
          setUserLocation({ 
            lat: latitude, 
            lng: longitude,
            accuracy,
            elevation: altitude,
            heading,
            speed,
            timestamp: pos.timestamp
          });

          if (accuracy <= 20) {
            setGpsStatus('Good');
          } else if (accuracy <= 80) {
            setGpsStatus('Weak');
          } else {
            setGpsStatus('Poor');
          }

          setMapCenter({ lat: latitude, lng: longitude });
          mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 16 });
        },
        (err) => {
          if (err.code === 1) {
            setGpsStatus('Denied');
          } else {
            setGpsStatus('Unavailable');
          }
          console.error(err);
        },
        // Enforce maximum GPS accuracy and bypass local browser location caches
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    }
  };

  const stopHike = async () => {
    setIsHiking(false);
    setIsPaused(false);

    setActiveHike(null);
    setHikePath([]);
    setRawPath([]);
    document.documentElement.dataset.paused = 'false';
    releaseWakeLock();

    if (recoveredHike) {
      try {
        await db.activeHikes.delete(recoveredHike.id);
        await db.activeHikePoints.where('hikeId').equals(recoveredHike.id).delete();
      } catch (err) {
        console.error('Failed to delete active records:', err);
      }
    }
    setRecoveredHike(null);

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Stop background keep-alive audio
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current = null;
    }
  };

  const togglePause = () => {
    setIsPaused(prev => {
      const nextPaused = !prev;
      document.documentElement.dataset.paused = nextPaused ? 'true' : 'false';
      const now = Date.now();

      if (nextPaused) {
        hikeTimingsRef.current.pausedAt = now;
        releaseWakeLock();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (audioRef.current) {
          try { audioRef.current.pause(); } catch {}
        }
      } else {
        if (hikeTimingsRef.current.pausedAt) {
          const pausedDuration = now - hikeTimingsRef.current.pausedAt;
          hikeTimingsRef.current.totalPausedMs += pausedDuration;
          hikeTimingsRef.current.pausedAt = null;
        }
        requestWakeLock();

        // Resume timer
        timerRef.current = setInterval(() => {
          const tNow = Date.now();
          const start = hikeTimingsRef.current.startedAt;
          const totalPaused = hikeTimingsRef.current.totalPausedMs;
          const currentPause = hikeTimingsRef.current.pausedAt ? (tNow - hikeTimingsRef.current.pausedAt) : 0;
          const elapsed = Math.floor((tNow - start - totalPaused - currentPause) / 1000);
          setHikeDuration(Math.max(0, elapsed));
        }, 1000);

        // Resume silent audio keep-alive
        if (audioRef.current) {
          try { audioRef.current.play().catch(() => {}); } catch {}
        }
      }
      return nextPaused;
    });
  };

  const loadMore = async () => {
    if (isLoadingMore || !hasMore || !userLocation) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch('/api/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: userLocation.lat,
          lng: userLocation.lng,
          locationName,
          naturalLanguageQuery: searchQuery,
          preferences,
          groupDescription: groupMode ? groupDescription : null,
          forceMode: source,
          excludeNames: trails.map(t => t.name),
          radius: searchRadius,
          priceRange: priceRange || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to load more');
      const data = await res.json();
      if (!data.trails || data.trails.length === 0) {
        setHasMore(false);
      } else {
        setTrails(prev => [...prev, ...data.trails]);
        if (data.trails.length < 5) setHasMore(false);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load more results.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const hasTrails = status === 'done' && trails.length > 0;
  const selectedTrail = selectedIdx === null ? null : trails[selectedIdx];
  const selectedRouteGeometry = selectedTrail ? routeGeometries[selectedTrail.placeId] : null;
  const mapLocationLabel = locationName || searchQuery || 'this area';
  const mapSummary = selectedTrail
    ? `Showing ${selectedTrail.name}`
    : `${filteredTrails.length} ${filteredTrails.length === 1 ? 'trail' : 'trails'} near ${mapLocationLabel}`;

  useEffect(() => {
    if (mobileView === 'results') return;
    const frame = window.requestAnimationFrame(() => document.getElementById('trail-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => window.cancelAnimationFrame(frame);
  }, [mobileView, hasTrails]);

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-[var(--app-bg)] pb-[var(--mobile-nav-clearance)] font-sans md:h-[100dvh] md:overflow-hidden md:pb-0">

      {pendingHike && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="hike-location-title">
          <div className="w-full max-w-md rounded-3xl border border-emerald-400/30 bg-slate-900 p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-300">Before tracking</p>
            <h2 id="hike-location-title" className="mt-2 text-xl font-bold text-white">Allow location to record this hike?</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">Odyssey will record GPS points for distance and route tracking. Those points stay in this browser on this device and are not uploaded by the current app.</p>
            <p className="mt-2 text-xs text-amber-200/80">This is not emergency navigation. Carry an independent map and verify official conditions.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  const request = pendingHike;
                  allowLocation();
                  setPendingHike(null);
                  startHike(request.trail, request.isRestored, request.isRestoredPaused, true);
                }}
                className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-300"
              >
                Allow location &amp; start
              </button>
              <button type="button" onClick={() => setPendingHike(null)} className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">Not now</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Hike Recovery Modal ── */}
      {showRecoveryModal && recoveredHike && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="text-3xl">🧭</div>
            <h3 className="text-white text-xl font-bold">Unfinished Hike Recovered</h3>
            <p className="text-slate-400 text-sm">
              An active tracking session for <span className="text-emerald-400 font-semibold">{recoveredHike.name}</span> from{' '}
              <span className="text-slate-300 font-semibold">{new Date(recoveredHike.startedAt).toLocaleTimeString()}</span> was recovered.
            </p>
            <div className="text-xs text-slate-500 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 text-left flex flex-col gap-1">
              <div>📍 Distance: <span className="text-slate-300">{(recoveredHike.distanceMeters / 1609.344).toFixed(2)} mi</span></div>
              <div>🏔️ Elevation Gain: <span className="text-slate-300">{(recoveredHike.elevationGainMeters * 3.28084).toFixed(0)} ft</span></div>
              <div>⏱️ Elapsed Duration: <span className="text-slate-300">{Math.floor(hikeDuration / 60)} min {hikeDuration % 60}s</span></div>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <button 
                onClick={() => {
                  setShowRecoveryModal(false);
                  startHike(recoveredHike, true, false); // Resume active
                }} 
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-2xl transition-colors"
              >
                Resume Tracking
              </button>
              <button 
                onClick={() => {
                  setShowRecoveryModal(false);
                  startHike(recoveredHike, true, true); // Keep paused
                }} 
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-2xl transition-colors"
              >
                Keep Paused
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    setShowRecoveryModal(false);
                    // End and save
                    await db.savedHikes.put({
                      name: recoveredHike.name,
                      lat: recoveredHike.lat || 0,
                      lng: recoveredHike.lng || 0,
                      savedAt: Date.now()
                    });
                    stopHike();
                  }} 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-2xl text-sm transition-colors"
                >
                  Save Hike
                </button>
                <button 
                  onClick={() => {
                    setShowRecoveryModal(false);
                    stopHike(); // Discards and deletes active tables records
                  }} 
                  className="flex-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/30 text-rose-400 font-semibold py-2.5 rounded-2xl text-sm transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Offline Banner ── */}
      {isOffline && (
        <div className="shrink-0 bg-rose-600 text-white text-xs font-semibold px-4 py-2 text-center flex items-center justify-center gap-2 z-50">
          <span aria-hidden="true">⚠️</span> You are offline. Showing cached results.
        </div>
      )}

      {/* ── Header ── */}
      <header className="z-20 flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3">
        <Link href="/" aria-label="Back to Discover" className="rounded-lg p-1 text-[var(--app-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-base font-bold text-[var(--app-text)]" title={searchQuery || 'Find a hike'}>
            {searchQuery || 'Find a hike'}
          </h1>
          {locationName && <p className="truncate text-xs text-[var(--app-muted)]">{locationName}</p>}
        </div>
        <button
          type="button"
          aria-label="Open emergency help"
          onClick={() => setIsSafetyMode(true)}
          className="min-h-10 shrink-0 rounded-full border border-rose-500/40 bg-rose-950/40 px-3 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-950/70"
        >
          SOS
        </button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative w-full">
        {/* ── Scrollable results / idle ── */}
        <div id="trail-results" tabIndex={-1} className="relative z-20 order-first flex min-h-0 flex-none flex-col overflow-visible bg-[var(--app-bg)] md:w-1/2 md:flex-1 md:overflow-y-auto">
        {isSafetyMode ? (
          <SafetyPanel
            userLocation={userLocation}
            isOffline={isOffline}
            onClose={() => setIsSafetyMode(false)}
          />
        ) : (
          <>

        {/* Loading states */}
        {status === 'location' && (
          <div className="mx-auto w-full max-w-xl p-6 pt-12">
            <LocationAccessCard
              title="Use your location for nearby trails?"
              description="Odyssey sends your current coordinates to its search service for this nearby search. GPS trail history is recorded only after you start a hike and remains on this device."
              onAllow={() => {
                allowLocation();
                runSearch(true);
              }}
              alternativeLabel="Search Yosemite instead"
              onAlternative={() => {
                const destination = 'Yosemite National Park';
                setSearchQuery(destination);
                runSearch(false, destination);
              }}
            />
          </div>
        )}

        {status === 'locating' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-slate-300 font-medium">Getting your location…</p>
          </div>
        )}

        {status === 'searching' && (
          <div className="flex flex-col gap-4 p-4 mt-2">
            <TrailCardSkeleton />
            <TrailCardSkeleton />
            <TrailCardSkeleton />
          </div>
        )}

        {status === 'error' && (
          <div className="m-6 bg-rose-900/30 border border-rose-500/30 rounded-2xl p-6 text-center">
            <p className="text-rose-300 font-semibold mb-2">Something went wrong</p>
            <p className="text-rose-400/80 text-sm mb-5">{error}</p>
            <button onClick={() => runSearch()} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors">Try Again</button>
          </div>
        )}

        {/* Results */}
        {hasTrails && (
          <>


            <section className="px-4 pt-4" aria-labelledby="search-results-heading">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] pb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="search-results-heading" className="text-lg font-bold text-[var(--app-text)]">
                      {activeFilters.length > 0
                        ? `${filteredTrails.length} of ${trails.length} trails`
                        : `${trails.length} ${trails.length === 1 ? 'trail' : 'trails'}`}
                    </h2>
                    <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--app-muted)]">
                      {source === 'openstreetmap' ? 'Community mapped' : 'Official sources'}
                    </span>
                  </div>
                  {locationName && <p className="mt-1 truncate text-xs text-[var(--app-muted)]">Near {locationName}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-expanded={showSearchEditor}
                    aria-controls="edit-search-panel"
                    onClick={() => setShowSearchEditor(open => !open)}
                    className="min-h-10 rounded-xl px-3 text-sm font-semibold text-[var(--app-primary)] hover:bg-[var(--app-surface)]"
                  >
                    Edit search
                  </button>
                  <QuickFilters activeFilters={activeFilters} onFilter={updateQuickFilters} />
                </div>
              </div>

              {showSearchEditor && (
                <form
                  id="edit-search-panel"
                  className="mt-3 flex gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setShowSearchEditor(false);
                    runSearch(false, searchQuery);
                  }}
                >
                  <label htmlFor="edit-trail-search" className="sr-only">Search for trails</label>
                  <input
                    id="edit-trail-search"
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    placeholder="Trail, park, city, or hikes near me"
                    className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
                  />
                  <button
                    type="submit"
                    disabled={isOffline || !searchQuery.trim()}
                    className="min-h-10 rounded-xl bg-[var(--app-primary)] px-4 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Search
                  </button>
                </form>
              )}

              {source === 'openstreetmap' && (
                <p className="mt-3 text-xs leading-relaxed text-[var(--app-muted)]">
                  Community-mapped results. Confirm access and conditions with the local land manager.
                </p>
              )}
            </section>

            {parkAlerts.length > 0 && (
              <details className="mx-4 mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-amber-200">
                  {parkAlerts.length} current park {parkAlerts.length === 1 ? 'alert' : 'alerts'}
                  {alertsFetchedAt && <span className="ml-2 text-[10px] font-normal text-amber-200/50">Updated {new Date(alertsFetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
                </summary>
                <div className="mt-3 flex flex-col gap-2">
                  {parkAlerts.slice(0, 3).map(alert => (
                    <a key={alert.id} href={alert.url} target="_blank" rel="noreferrer" className="text-xs text-amber-100/80 hover:text-amber-100">
                      <span className="font-semibold">{alert.category}:</span> {alert.title}
                    </a>
                  ))}
                </div>
              </details>
            )}

            {/* Trail cards */}
            <div className="px-4 py-4 flex flex-col gap-4">
              {filteredTrails.length === 0 && activeFilters.length > 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">No trails match your filters</p>
                  <button
                    onClick={() => updateQuickFilters([])}
                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                filteredTrails.map(trail => {
                  const trailIndex = trails.indexOf(trail);
                  const cardKey = trail.placeId || `${trail.name}-${trail.lat}`;
                  return (
                    <TrailResultCard
                      key={cardKey}
                      trail={trail}
                      index={trailIndex}
                      isSelected={expandedIdx === trailIndex}
                      onSelect={() => toggleTrailDetails(trailIndex)}
                      cardRef={(el) => (cardRefs.current[trailIndex] = el)}
                      onSave={() => handleSaveHike(trail)}
                      isSaved={savedIds.has(`${trail.name}-${trail.lat}`)}
                      onStartHike={() => startHike(trail)}
                      onViewMap={() => viewTrailOnMap(trailIndex)}
                      routeStatus={routeGeometryStatus[trail.placeId]}
                    />
                  );
                })
              )}

              {hasMore && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Trails ↓'
                  )}
                </button>
              )}
            </div>
          </>
        )}

        {status === 'done' && !hasTrails && (
          <div className="m-6 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-6 text-center">
            <p className="text-lg font-semibold text-amber-100">No trails found</p>
            <p className="mt-2 text-sm leading-relaxed text-amber-100/70">{coverageMessage || 'Try a nearby park or city, or increase the search radius.'}</p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <button type="button" onClick={() => setStatus('idle')} className="rounded-xl bg-amber-200 px-5 py-2.5 text-sm font-bold text-amber-950">Edit search</button>
              <button type="button" onClick={() => { const nearbyQuery = 'hikes near me'; setSearchQuery(nearbyQuery); runSearch(false, nearbyQuery); }} className="rounded-xl border border-amber-200/30 px-5 py-2.5 text-sm font-bold text-amber-100">Use my location</button>
            </div>
          </div>
        )}

        {/* ── Idle / search input state ── */}
        {status === 'idle' && (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-5 p-6 pt-10">
            <div>
              <p className="text-sm font-semibold text-[var(--app-primary)]">Discover trails</p>
              <h2 className="mt-1 text-2xl font-bold text-[var(--app-text)]">Where do you want to hike?</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--app-muted)]">Search any trail, park, city, or ask for hikes near you.</p>
            </div>

            <form
              className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-lg"
              onSubmit={event => {
                event.preventDefault();
                runSearch(false, searchQuery);
              }}
            >
              <label htmlFor="trail-search" className="sr-only">Search trails</label>
              <input
                id="trail-search"
                type="search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Try “Diablo hike” or “easy trails in Oakland”"
                className="min-h-12 w-full bg-transparent px-3 text-base text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
              />
              <button
                type="submit"
                disabled={isOffline || !searchQuery.trim()}
                className="min-h-12 w-full rounded-xl bg-[var(--app-primary)] px-4 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Search trails
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                const nearbyQuery = 'hikes near me';
                setSearchQuery(nearbyQuery);
                runSearch(false, nearbyQuery);
              }}
              disabled={isOffline}
              className="min-h-12 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-bold text-[var(--app-text)] hover:border-[var(--app-primary)] disabled:opacity-50"
            >
              <span aria-hidden="true">⌖</span> Find hikes near me
            </button>

            <details className="rounded-xl border border-[var(--app-border)] px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--app-muted)]">Search ideas &amp; recent searches</summary>
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Search examples">
                {['Mount Diablo', 'trails near Oakland', 'easy waterfall hike'].map(example => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setSearchQuery(example);
                      runSearch(false, example);
                    }}
                    className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)]"
                  >
                    {example}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <SearchHistory
                  onSelect={historyQuery => {
                    setSearchQuery(historyQuery);
                    runSearch(false, historyQuery);
                  }}
                />
              </div>
            </details>
          </div>
        )}
        </>
        )}
      </div>

      {/* ── Map strip ── */}
      {(hasTrails || isHiking || mobileView !== 'results') && (
        <div id="trail-map" role="region" aria-label="Trail map" className="search-trail-map relative z-10 order-last flex h-[calc(100dvh-var(--mobile-nav-clearance))] min-h-[32rem] shrink-0 flex-col border-t border-slate-700 md:h-full md:min-h-0 md:w-1/2 md:border-l md:border-t-0">
            <Map
              key={`trail-map-${mapRevision}`}
              ref={mapRef}
              initialViewState={{
                longitude: mapCenter?.lng || trails[0]?.lng || -122.4194,
                latitude: mapCenter?.lat || trails[0]?.lat || 37.7749,
                zoom: mapZoom,
                pitch: 0,
                bearing: 0
              }}
              mapStyle={getMapStyleUrl(resolvedTheme)}
              attributionControl={false}
              style={{ width: '100%', height: '100%' }}
              minZoom={4}
              onZoom={(e) => setMapZoom(e.viewState.zoom)}
              onLoad={() => {
                mapErrorReportedRef.current = false;
                setMapError(false);
                if (trails.length > 0) {
                  window.requestAnimationFrame(() => {
                    if (selectedTrail) fitTrailOnMap(selectedTrail, selectedRouteGeometry);
                    else fitAllTrails();
                  });
                }
              }}
              onError={(e) => {
                if (mapErrorReportedRef.current) return;
                mapErrorReportedRef.current = true;
                console.warn('Map provider is temporarily unavailable:', e.error || e);
                setMapError(true);
              }}
            >
              <AttributionControl compact position="bottom-right" />
              {userLocation && <UserPin position={userLocation} heading={deviceHeading} />}

              {/* Live Tracked Path */}
              {isHiking && hikePath.length > 1 && (
                <Source id="hike-track" type="geojson" data={{
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: hikePath
                  }
                }}>
                  <Layer
                    id="hike-track-layer"
                    type="line"
                    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                    paint={{ 'line-color': '#10b981', 'line-width': 4 }}
                  />
                </Source>
              )}

              {filteredTrails.map(trail => {
                const trailIndex = trails.indexOf(trail);
                return trail.lat && trail.lng ? (
                  <TrailPin
                    key={`pin-${trail.placeId || trailIndex}`}
                    trail={trail}
                    index={trailIndex}
                    isSelected={selectedIdx === trailIndex}
                    onClick={() => focusTrailOnMap(trailIndex)}
                  />
                ) : null;
              })}

              {selectedTrail && selectedRouteGeometry && (
                <Source id="selected-route-source" type="geojson" data={selectedRouteGeometry}>
                  <Layer
                    id="selected-route-layer"
                    type="line"
                    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                    paint={{
                      'line-color': resolvedTheme === 'daylight' ? '#0f766e' : '#67e8f9',
                      'line-width': 5,
                      'line-opacity': 0.96,
                    }}
                  />
                </Source>
              )}

              {selectedTrail?.lat && (
                <MapPopup
                  trail={selectedTrail}
                  index={selectedIdx}
                  onClose={showAllTrails}
                  onStartHike={startHike}
                />
              )}

              <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-9rem)] rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]/95 px-3 py-2 shadow-lg backdrop-blur" aria-live="polite">
                <p className="truncate text-xs font-bold text-[var(--app-text)]">{mapSummary}</p>
                {selectedTrail && routeGeometryStatus[selectedTrail.placeId] === 'loading' && (
                  <p className="mt-0.5 text-[10px] text-[var(--app-muted)]">Loading official route…</p>
                )}
                {selectedTrail && routeGeometryStatus[selectedTrail.placeId] === 'error' && (
                  <p className="mt-0.5 text-[10px] text-amber-300">Route line unavailable</p>
                )}
              </div>

              <div className="absolute right-3 top-3 z-20">
                <button
                  type="button"
                  aria-expanded={mapToolsOpen || isHiking}
                  aria-controls="map-tools-panel"
                  onClick={() => setMapToolsOpen(open => !open)}
                  className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]/95 px-3 text-sm font-bold text-[var(--app-text)] shadow-lg backdrop-blur hover:bg-[var(--app-surface-raised)]"
                >
                  Map tools
                </button>
                {(mapToolsOpen || isHiking) && (
                  <div id="map-tools-panel" role="group" aria-label="Map tools" className="mt-2 flex w-44 flex-col gap-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]/95 p-2 shadow-xl backdrop-blur">
                    {userLocation && (
                      <button type="button" onClick={() => { selectedTrailIdRef.current = null; setSelectedIdx(null); setMapCenter({ ...userLocation }); mapRef.current?.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 13 }); }} className="min-h-10 rounded-lg px-3 text-left text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-raised)]">
                        <span aria-hidden="true">📍</span> My location
                      </button>
                    )}
                    {hasTrails && (
                      <button type="button" onClick={showAllTrails} className="min-h-10 rounded-lg px-3 text-left text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-raised)]">
                        <span aria-hidden="true">🔭</span> Show all trails
                      </button>
                    )}
                    <button type="button" onClick={() => setMapRotationMode(mode => mode === 'north' ? 'compass' : 'north')} className="min-h-10 rounded-lg px-3 text-left text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-raised)]">
                      <span aria-hidden="true">🧭</span> {mapRotationMode === 'north' ? 'Compass up' : 'North up'}
                    </button>
                  </div>
                )}
              </div>
            </Map>

          {mapError && (
            <div role="status" className="absolute inset-x-4 top-4 z-40 rounded-xl border border-amber-400/40 bg-slate-950/95 p-4 text-sm text-amber-100 shadow-xl">
              <p className="font-semibold">Basemap temporarily unavailable</p>
              <p className="mt-1 text-xs text-slate-300">Verified trail facts remain available. Do not rely on this map for navigation.</p>
              <button type="button" onClick={() => { mapErrorReportedRef.current = false; setMapError(false); setMapRevision(revision => revision + 1); }} className="mt-3 rounded-lg border border-amber-300/40 px-3 py-1.5 text-xs font-semibold hover:bg-amber-300/10">Retry map</button>
            </div>
          )}

          {/* Active Hike Overlay */}
          {isHiking && activeHike && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl border border-emerald-500 shadow-2xl flex flex-col items-center gap-3 z-50 min-w-[340px] max-w-[90%]">
              <div className="flex w-full justify-between items-center px-1">
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Active Hike</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  gpsStatus === 'Good' ? 'bg-emerald-950/60 border-emerald-700 text-emerald-400' :
                  gpsStatus === 'Weak' ? 'bg-amber-950/60 border-amber-700 text-amber-400' :
                  gpsStatus === 'Poor' ? 'bg-rose-950/60 border-rose-700 text-rose-400' :
                  'bg-indigo-950/60 border-indigo-700 text-indigo-400'
                }`}>
                  {gpsStatus === 'Good' ? '🟢 Good GPS' :
                   gpsStatus === 'Weak' ? '🟡 Weak GPS' :
                   gpsStatus === 'Poor' ? '🔴 Poor GPS' :
                   gpsStatus === 'Denied' ? '🚫 GPS Denied' :
                   '🔵 Acquiring GPS...'}
                </span>
              </div>
              <div className="font-semibold text-lg text-center leading-tight">{activeHike.name}</div>
              
              <div className="flex gap-4 text-sm text-slate-300 w-full justify-between px-2">
                <div className="flex flex-col items-center">
                  <span className="text-xl">{hikeDistance.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Miles</span>
                </div>
                <div className="w-px bg-slate-700"></div>
                <div className="flex flex-col items-center">
                  <span className="text-xl">
                    {Math.floor(hikeDuration / 60)}:{(hikeDuration % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Time</span>
                </div>
                <div className="w-px bg-slate-700"></div>
                <div className="flex flex-col items-center">
                  <span className="text-xl">{Math.round(hikeElevationGain)}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Feet</span>
                </div>
                <div className="w-px bg-slate-700"></div>
                <div className="flex flex-col items-center">
                  <span className="text-xl">
                    {hikeDistance > 0 ? ((hikeDuration / 60) / hikeDistance).toFixed(1) : '0.0'}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Min/Mi</span>
                </div>
                <div className="w-px bg-slate-700"></div>
                <div className="flex flex-col items-center">
                  <span className="text-xl">{hikeHeading !== null ? `${Math.round(hikeHeading)}°` : '--'}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Heading</span>
                </div>
              </div>

              {/* Advisory warnings for battery/background limitations */}
              <div className="w-full text-[10px] text-slate-400 bg-slate-950/40 border border-slate-800 p-2 rounded-xl flex flex-col gap-0.5 text-center leading-normal">
                <div>🔋 High-accuracy GPS uses extra battery. Keep charger handy.</div>
                <div>⚠️ Lock screen or backgrounding can suspend web GPS tracking. Keep screen awake.</div>
              </div>

              <div className="flex w-full gap-2 mt-1">
                <button 
                  onClick={togglePause} 
                  className={`flex-1 text-sm font-bold py-2 rounded-xl transition-colors ${
                    isPaused ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <button 
                  onClick={stopHike} 
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold py-2 rounded-xl transition-colors"
                >
                  Stop Hike
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      </div>
    </div>
  );
}

// ─── Page export ───────────────────────────────────────────────────────────────

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <HikeSearchContent />
    </Suspense>
  );
}
