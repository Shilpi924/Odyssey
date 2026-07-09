'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { db } from '@/lib/db';
import { downloadAreaTiles } from '@/lib/offline-maps';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ─────────────────────────────────────────────────────────────────

const FEAT_ICONS = {
  Shaded: '🌳', Sunny: '☀️', Water: '💧', Summit: '🏔️',
  DogFriendly: '🐾', Loop: '🔄', Scenic: '📸', EasyParking: '🚗',
  Wildflowers: '🌸', Alpine: '🧊',
};

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

const PIN_COLORS = [
  { bg: 'bg-rose-500', cardBg: 'bg-rose-900/40', text: 'text-rose-300', badge: 'bg-rose-400/10 text-rose-300 border border-rose-400/30', border: 'border-rose-400', shadow: 'shadow-rose-900/30', ring: 'ring-rose-500/40' },
  { bg: 'bg-orange-500', cardBg: 'bg-orange-900/40', text: 'text-orange-300', badge: 'bg-orange-400/10 text-orange-300 border border-orange-400/30', border: 'border-orange-400', shadow: 'shadow-orange-900/30', ring: 'ring-orange-500/40' },
  { bg: 'bg-amber-500', cardBg: 'bg-amber-900/40', text: 'text-amber-300', badge: 'bg-amber-400/10 text-amber-300 border border-amber-400/30', border: 'border-amber-400', shadow: 'shadow-amber-900/30', ring: 'ring-amber-500/40' },
  { bg: 'bg-emerald-500', cardBg: 'bg-emerald-900/40', text: 'text-emerald-300', badge: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30', border: 'border-emerald-400', shadow: 'shadow-emerald-900/30', ring: 'ring-emerald-500/40' },
  { bg: 'bg-cyan-500', cardBg: 'bg-cyan-900/40', text: 'text-cyan-300', badge: 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/30', border: 'border-cyan-400', shadow: 'shadow-cyan-900/30', ring: 'ring-cyan-500/40' },
  { bg: 'bg-blue-500', cardBg: 'bg-blue-900/40', text: 'text-blue-300', badge: 'bg-blue-400/10 text-blue-300 border border-blue-400/30', border: 'border-blue-400', shadow: 'shadow-blue-900/30', ring: 'ring-blue-500/40' },
  { bg: 'bg-indigo-500', cardBg: 'bg-indigo-900/40', text: 'text-indigo-300', badge: 'bg-indigo-400/10 text-indigo-300 border border-indigo-400/30', border: 'border-indigo-400', shadow: 'shadow-indigo-900/30', ring: 'ring-indigo-500/40' },
  { bg: 'bg-violet-500', cardBg: 'bg-violet-900/40', text: 'text-violet-300', badge: 'bg-violet-400/10 text-violet-300 border border-violet-400/30', border: 'border-violet-400', shadow: 'shadow-violet-900/30', ring: 'ring-violet-500/40' },
  { bg: 'bg-fuchsia-500', cardBg: 'bg-fuchsia-900/40', text: 'text-fuchsia-300', badge: 'bg-fuchsia-400/10 text-fuchsia-300 border border-fuchsia-400/30', border: 'border-fuchsia-400', shadow: 'shadow-fuchsia-900/30', ring: 'ring-fuchsia-500/40' },
  { bg: 'bg-pink-500', cardBg: 'bg-pink-900/40', text: 'text-pink-300', badge: 'bg-pink-400/10 text-pink-300 border border-pink-400/30', border: 'border-pink-400', shadow: 'shadow-pink-900/30', ring: 'ring-pink-500/40' },
];
const getPinColor = (index) => PIN_COLORS[index % PIN_COLORS.length];

// ─── Weather helpers ───────────────────────────────────────────────────────────

function weatherEmoji(code) {
  if (code == null) return '🌤️';
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

function hikingAdvisory(code, temp) {
  if (code == null) return { text: 'Great hiking conditions!', style: 'bg-emerald-900/40 border-emerald-500/40 text-emerald-200' };
  if (code >= 95) return { text: '⚠️ Dangerous storm — avoid hiking today', style: 'bg-rose-900/50 border-rose-500/40 text-rose-200' };
  if (code >= 80) return { text: 'Rain showers expected — trails may be wet', style: 'bg-blue-900/40 border-blue-500/40 text-blue-200' };
  if (code >= 61) return { text: 'Rainy — bring waterproof layers', style: 'bg-blue-900/40 border-blue-500/40 text-blue-200' };
  if (code >= 45) return { text: 'Foggy — reduced visibility on ridges', style: 'bg-slate-700/60 border-slate-500/40 text-slate-200' };
  if (temp > 95) return { text: '🥵 Extreme heat — start before 8am, shaded trails only', style: 'bg-rose-900/40 border-rose-400/40 text-rose-200' };
  if (temp > 85) return { text: '☀️ Warm day — Claude prioritised shaded trails for you', style: 'bg-amber-900/40 border-amber-500/40 text-amber-200' };
  if (temp < 32) return { text: '🥶 Freezing — watch for ice on trails', style: 'bg-blue-900/40 border-blue-400/40 text-blue-200' };
  return { text: '🌿 Great conditions for hiking!', style: 'bg-emerald-900/40 border-emerald-500/40 text-emerald-200' };
}

// ─── Satellite thumbnail URL ───────────────────────────────────────────────────

function staticMapUrl(lat, lng, apiKey) {
  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}&zoom=15&size=600x250&maptype=hybrid` +
    `&markers=color:blue%7Csize:mid%7C${lat},${lng}&key=${apiKey}`
  );
}

// ─── OSM Map Style ─────────────────────────────────────────────────────────────

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

// ─── Trail Chat Drawer ─────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  'What should I pack?',
  'Is parking hard?',
  'Crowded on weekends?',
  'Safe for kids?',
  'Hardest section?',
  'Best viewpoint?',
];

function TrailChatDrawer({ trail, open, onClose }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const sendMessage = async (msg) => {
    if (!msg.trim() || loading) return;
    const userMsg = { role: 'user', content: msg };
    const next = [...history, userMsg];
    setHistory(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/trail-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trail, question: msg, history }),
      });
      const data = await res.json();
      setHistory([...next, { role: 'assistant', content: data.answer || 'Sorry, no answer.' }]);
    } catch {
      setHistory([...next, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && trail && history.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistory([
        {
          role: 'assistant',
          content: `I know ${trail.name} well! Ask me anything — what to pack, parking, crowds, the hardest section, best viewpoints… 🥾`,
        },
      ]);
    }
    if (!open) {
      setHistory([]);
      setInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trail?.name]);

  // ── Scroll to bottom of chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const handleChatVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Voice search not supported in this browser.');
    const recognition = new SpeechRecognition();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.start();
  };

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 400);
  }, [open]);

  if (!trail) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col bg-slate-900 rounded-t-3xl border-t border-slate-700 shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '75vh' }}
      >
        {/* Handle + header */}
        <div className="shrink-0 flex flex-col items-center pt-3 pb-4 px-5 border-b border-slate-700/60">
          <div className="w-10 h-1 bg-slate-600 rounded-full mb-4" />
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-xl">🥾</span>
              <div>
                <p className="text-white font-semibold text-sm">Ask about this trail</p>
                <p className="text-slate-400 text-xs truncate max-w-[220px]">{trail.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Quick question chips — shown only at start */}
        {history.length <= 1 && (
          <div className="shrink-0 flex gap-2 px-4 py-3 overflow-x-auto border-b border-slate-800/60">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-indigo-900/50 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-800/60 transition-colors whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {history.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-slate-800 text-slate-200 rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' && <span className="mr-1.5">🤖</span>}
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                {[0, 150, 300].map((d) => (
                  <div key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 flex items-center gap-2 p-4 border-t border-slate-700/60">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ask anything about this trail…"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button 
              onClick={handleChatVoiceSearch} 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-400 transition-colors"
              title="Voice Search"
            >
              🎙️
            </button>
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Weather Banner ────────────────────────────────────────────────────────────

function EnvironmentalBanner({ weather }) {
  if (!weather) return null;
  const adv = hikingAdvisory(weather.code, weather.temp);
  
  // Dummy data for Pollen and AQI if not provided by backend yet
  const aqi = weather.aqi || 42; 
  const pollen = weather.pollen || 'Low';

  return (
    <div className={`mx-4 mt-4 px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 shadow-lg backdrop-blur-md bg-opacity-80 ${adv.style}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{weatherEmoji(weather.code)}</span>
        <div className="flex flex-col">
          <p className="font-semibold text-sm">{weather.temp}°F · {weather.condition}</p>
          <div className="flex gap-2 text-xs mt-0.5 opacity-90 font-medium">
            <span>💨 AQI: {aqi}</span>
            <span>🤧 Pollen: {pollen}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end text-xs opacity-80 shrink-0">
        <span className="font-semibold">{adv.text}</span>
        <span>Feels {weather.feelsLike}°F</span>
      </div>
    </div>
  );
}

// ─── Map Pins ──────────────────────────────────────────────────────────────────

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

function MapPopup({ trail, index, onClose, onScrollToCard }) {
  const d = getPinColor(index);
  const diffBadge = getDiff(trail.difficulty);
  return (
    <Marker longitude={trail.lng} latitude={trail.lat} style={{ zIndex: 300 }}>
      <div className="mb-14 w-64 bg-slate-900 border border-slate-600 rounded-2xl shadow-2xl p-4 relative">
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-700 text-slate-400 hover:text-white text-xs flex items-center justify-center"
        >
          ✕
        </button>
        <div className="flex items-start gap-2 mb-2">
          <span className={`shrink-0 w-6 h-6 rounded-full ${d.bg} text-white text-xs font-bold flex items-center justify-center`}>{index + 1}</span>
          <h4 className="text-white text-sm font-semibold leading-tight">{trail.name}</h4>
        </div>
        {(trail.length || trail.elevationGain || trail.difficulty) && (
          <div className="flex gap-2 text-xs text-slate-400 mb-3">
            {trail.length && <span>🥾 {trail.length}</span>}
            {trail.elevationGain && <span>⬆️ {trail.elevationGain}</span>}
            {trail.difficulty && <span className={`font-semibold ${diffBadge.text}`}>{trail.difficulty}</span>}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartHike(trail);
            }}
            className="flex-1 text-xs py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
          >
            🚶 Start Hike
          </button>
        </div>
      </div>
    </Marker>
  );
}

// ─── Elevation Sparkline ────────────────────────────────────────────────────────

function Sparkline({ data }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 24;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex items-end gap-2 text-xs text-slate-400">
      <svg width={width} height={height} className="overflow-visible">
        <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#sparkGradient)" opacity="0.2" />
        <defs>
          <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <span className="mb-0.5">{max}ft</span>
    </div>
  );
}

// ─── AI Trail Card ─────────────────────────────────────────────────────────────

function AITrailCard({ trail, index, isSelected, onSelect, cardRef, onStreetView, onAskAI, onSave, isSaved, onCompareToggle, isComparing, onStartHike }) {
  const d = getPinColor(index);
  const diffBadge = getDiff(trail.difficulty);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleDragEnd = (event, info) => {
    if (info.offset.x > 100) {
      onSave(trail);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
      className={`bg-slate-800/70 backdrop-blur border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 relative ${
        isSelected ? `${d.border} shadow-xl ${d.shadow} ring-1 ${d.ring}` : 'border-slate-700 hover:border-slate-500'
      } ${isComparing ? 'ring-2 ring-emerald-500' : ''}`}
    >
      {/* Swipe Indicator (Background) */}
      <div className="absolute inset-y-0 left-0 w-full bg-emerald-500/20 flex items-center pl-8 -z-10">
        <span className="text-emerald-400 font-bold text-lg">💾 Release to Save</span>
      </div>

      <div className={`${d.cardBg} w-full h-full relative`}>
      {/* Satellite thumbnail */}
      {trail.lat && trail.lng && (
        <div className="relative h-36 w-full overflow-hidden bg-slate-700">
          <img
            src={staticMapUrl(trail.lat, trail.lng, apiKey)}
            alt={trail.name}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
          />
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
            </div>
          )}
          {/* Index badge */}
          <div className={`absolute top-2 left-2 ${d.bg} text-white text-xs font-bold px-2 py-1 rounded-lg shadow`}>
            {index + 1}
          </div>
          {/* Difficulty badge */}
          {trail.difficulty && (
            <div className={`absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-lg shadow backdrop-blur-md ${diffBadge.badge}`}>
              {trail.difficulty}
            </div>
          )}
        </div>
      )}

      <div className="p-5 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-white font-bold text-base leading-tight">{trail.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
              <span>📍 {trail.distance}</span>
              {trail.rating && (
                <span className="flex items-center gap-0.5">
                  <span className="text-amber-400">★</span> {trail.rating}
                  {trail.userRatingsTotal > 0 && ` (${trail.userRatingsTotal.toLocaleString()} on Google Maps)`}
                </span>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="flex flex-col gap-3 overflow-hidden"
            >
        {/* Stats */}
        <div className="flex gap-4 text-sm text-slate-300 items-end">
          {trail.length && <span>🥾 {trail.length}</span>}
          {trail.elevationGain && <span>⬆️ {trail.elevationGain}</span>}
          {trail.estimatedWeeklyVisitors && <span className="text-xs opacity-70">👥 ~{trail.estimatedWeeklyVisitors.toLocaleString()}/wk</span>}
          {trail.sparkline && <Sparkline data={trail.sparkline} />}
        </div>

        {/* Feature tags */}
        {trail.features?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {trail.features.map((f) => (
              <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-slate-700/80 text-slate-300 border border-slate-600/50">
                {FEAT_ICONS[f]} {f}
              </span>
            ))}
          </div>
        )}

        {/* Why it matches — the AI's personalised reasoning */}
        {trail.why && (
          <p className="text-sm text-indigo-200/80 border-l-2 border-indigo-500/60 pl-3 leading-relaxed">
            {trail.why}
          </p>
        )}

        {/* Best time + parking */}
        {(trail.bestTime || trail.parkingNote) && (
          <div className="flex flex-col gap-1">
            {trail.bestTime && <p className="text-xs text-slate-400">⏰ {trail.bestTime}</p>}
            {trail.parkingNote && <p className="text-xs text-slate-400">🚗 {trail.parkingNote}</p>}
          </div>
        )}

        {/* Weather note */}
        {trail.weatherNote && (
          <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl px-3 py-2">
            <p className="text-xs text-blue-300">🌤️ {trail.weatherNote}</p>
          </div>
        )}

        {/* Local tip */}
        {trail.tip && (
          <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-500/20 rounded-xl px-3 py-2.5">
            <span>💡</span>
            <p className="text-xs text-amber-200/80 leading-relaxed">{trail.tip}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave(trail);
            }}
            className={`flex-1 text-xs py-2.5 rounded-xl transition-colors font-medium ${isSaved ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
          >
            {isSaved ? '✓ Saved Offline' : '💾 Download Map'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartHike(trail);
            }}
            className="flex-1 text-xs py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium"
          >
            🚶 Start Hike
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAskAI(trail); }}
            className="flex-1 text-xs py-2.5 bg-indigo-900/50 hover:bg-indigo-800/60 border border-indigo-500/30 text-indigo-300 rounded-xl transition-colors font-medium"
          >
            💬 Ask AI
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCompareToggle(trail); }}
            className={`flex-[0.5] text-xs py-2.5 rounded-xl transition-colors font-medium border ${isComparing ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
          >
            ⚖️
          </button>
        </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </motion.div>
  );
}

// ─── Fast Trail Card (Google Places) ──────────────────────────────────────────

function FastTrailCard({ trail, index, isSelected, onSelect, cardRef, onStreetView, onSave, isSaved, onStartHike }) {
  const d = getPinColor(index);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgSrc = trail.photoRef
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photoreference=${trail.photoRef}&key=${apiKey}`
    : staticMapUrl(trail.lat, trail.lng, apiKey);

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={`${d.cardBg} backdrop-blur border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
        isSelected ? `${d.border} shadow-xl ${d.shadow} ring-1 ${d.ring}` : 'border-slate-700 hover:border-slate-500'
      }`}
    >
      {trail.lat && trail.lng && (
        <div className="relative h-32 w-full overflow-hidden bg-slate-700">
          <img
            src={imgSrc}
            alt={trail.name}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              if (trail.photoRef) e.target.src = staticMapUrl(trail.lat, trail.lng, apiKey);
            }}
          />
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
            </div>
          )}
          <div className={`absolute top-2 left-2 ${d.bg} text-white text-xs font-bold px-2 py-1 rounded-lg shadow`}>
            {index + 1}
          </div>
          {trail.difficulty && (
            <div className={`absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-lg shadow backdrop-blur-md ${getDiff(trail.difficulty).badge}`}>
              {trail.difficulty}
            </div>
          )}
        </div>
      )}

      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-white font-bold text-base leading-tight">{trail.name}</h3>
            <p className="text-slate-500 text-xs mt-0.5 truncate">{trail.vicinity}</p>
          </div>
        </div>
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="flex flex-col gap-2 overflow-hidden"
            >
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>📍 {trail.distance}</span>
          {trail.rating && (
            <span className="flex items-center gap-0.5">
              <span className="text-amber-400">★</span> {trail.rating}
              {trail.userRatingsTotal > 0 && ` (${trail.userRatingsTotal.toLocaleString()} on Google Maps)`}
            </span>
          )}
          {trail.estimatedWeeklyVisitors && <span className="opacity-70">👥 ~{trail.estimatedWeeklyVisitors.toLocaleString()}/wk</span>}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave(trail);
            }}
            className={`flex-1 text-xs py-2.5 rounded-xl transition-colors font-medium ${isSaved ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
          >
            {isSaved ? '✓ Saved Offline' : '💾 Download Map'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartHike(trail);
            }}
            className="flex-1 text-xs py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium"
          >
            🚶 Start Hike
          </button>
        </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Conversation bubble ───────────────────────────────────────────────────────

function ConvBubble({ msg }) {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} px-4`}>
      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-700/80 text-slate-200 rounded-bl-sm'
        }`}
      >
        {msg.role === 'assistant' && <span className="mr-1.5">🤖</span>}
        {msg.display}
      </div>
    </div>
  );
}

// ─── Main search content ───────────────────────────────────────────────────────

function HikeSearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');

  // ── Search state
  const [status, setStatus] = useState('idle');
  const [trails, setTrails] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [source, setSource] = useState(null); // 'ai' | 'fast'
  const [locationName, setLocationName] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState({});
  const [weather, setWeather] = useState(null);

  // ── Search input state
  const [searchQuery, setSearchQuery] = useState(query && query !== 'hikes' ? query : '');
  const [searchMode, setSearchMode] = useState(null); // null=auto | 'ai' | 'fast'
  const [groupMode, setGroupMode] = useState(false);
  const [groupDescription, setGroupDescription] = useState('');
  const [searchRadius, setSearchRadius] = useState(25);

  // ── Map state
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapType, setMapType] = useState('roadmap');
  const [mapZoom, setMapZoom] = useState(12);
  const [showTraffic, setShowTraffic] = useState(false);

  // ── Refinement state
  const [conversation, setConversation] = useState([]);
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // ── Trail chat state
  const [chatTrail, setChatTrail] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);


  // ── Compare state
  const [compareList, setCompareList] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  // ── Voice Search Logic
  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Voice search not supported in this browser.');
    const recognition = new SpeechRecognition();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setRefineInput(transcript);
    };
    recognition.start();
  };

  // ── Compare Logic
  const toggleCompare = (trail) => {
    setCompareList(prev => {
      if (prev.find(t => t.name === trail.name)) return prev.filter(t => t.name !== trail.name);
      if (prev.length >= 3) { alert('You can only compare up to 3 trails.'); return prev; }
      return [...prev, trail];
    });
  };

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
        // 1. Fetch map image to blob via our proxy to bypass CORS
        let blob = null;
        try {
          const url = trail.photoRef 
            ? `/api/proxy-image?photoRef=${trail.photoRef}`
            : `/api/proxy-image?lat=${trail.lat}&lng=${trail.lng}`;
          const res = await fetch(url);
          if (res.ok) blob = await res.blob();
        } catch (e) {
          console.warn('Failed to fetch image proxy', e);
        }

        await db.savedHikes.put({
          id,
          ...trail,
          mapImageBlob: blob,
          savedAt: Date.now()
        });
        setSavedIds(prev => new Set(prev).add(id));
        // Trigger background download of map tiles for this area
        if (trail.lat && trail.lng) {
          downloadAreaTiles(trail.lat, trail.lng).catch(console.error);
        }
      }
    } catch (err) {
      console.error('Error saving hike:', err);
    }
  };

  const cardRefs = useRef([]);
  const mapRef = useRef(null);

  // ── Hike Tracking state
  const [isHiking, setIsHiking] = useState(false);
  const [activeHike, setActiveHike] = useState(null);
  const [hikeDistance, setHikeDistance] = useState(0);
  const [hikeDuration, setHikeDuration] = useState(0);
  const [hikeElevationGain, setHikeElevationGain] = useState(0);
  const [hikeSpeed, setHikeSpeed] = useState(0);
  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const lastLocRef = useRef(null);

  // ── Network status listener & Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
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

  // ── Watch live GPS location
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.log('GPS error', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Load preferences
  useEffect(() => {
    const saved = localStorage.getItem('userPreferences');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) { try { setPreferences(JSON.parse(saved)); } catch {} }
  }, []);

  const fitAllTrails = useCallback(() => {
    if (!mapRef.current || trails.length === 0) {
      if (userLocation) {
        setMapCenter({ ...userLocation });
        setMapZoom(11);
        mapRef.current?.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 11 });
      }
      return;
    }
    
    const bounds = new maplibregl.LngLatBounds();
    trails.forEach(t => {
      if (t.lat && t.lng) bounds.extend([t.lng, t.lat]);
    });
    if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);
    
    mapRef.current.fitBounds(bounds, { padding: 50, duration: 1000, maxZoom: 14 });
    setSelectedIdx(null);
  }, [userLocation, trails]);

  // Auto-fit to top 3 trails when trails load
  useEffect(() => {
    if (trails.length > 0 && mapRef.current && status === 'done') {
      const top = trails.slice(0, 3).filter(t => t.lat && t.lng);
      if (top.length === 0) return;
      
      const bounds = new maplibregl.LngLatBounds();
      top.forEach(t => bounds.extend([t.lng, t.lat]));
      if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);
      
      mapRef.current.fitBounds(bounds, { padding: 50, duration: 1000, maxZoom: 14 });
    }
  }, [trails, status, userLocation]);

  const getLocation = () =>
    new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
    );

  const getLocationName = async (lat, lng) => {
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const d = await r.json();
      if (d.results?.[0]) {
        const comp = d.results[0].address_components;
        const city = comp.find((c) => c.types.includes('locality'))?.long_name;
        const state = comp.find((c) => c.types.includes('administrative_area_level_1'))?.short_name;
        if (city && state) return `${city}, ${state}`;
      }
    } catch {}
    return null;
  };

  const runSearch = useCallback(
    async (forceMode = null) => {
      setStatus('locating');
      setTrails([]);
      setHasMore(true);
      setConversation([]);
      setError('');
      setSelectedIdx(null);
      setWeather(null);

      try {
        const pos = await getLocation();
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLocation({ lat, lng });
        setMapCenter({ lat, lng });

        const locName = (await getLocationName(lat, lng)) || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
        setLocationName(locName);
        setStatus('searching');

        // We always call smart-search, which uses LangGraph to route internally
        const res = await fetch('/api/smart-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lng,
            locationName: locName,
            naturalLanguageQuery: searchQuery,
            preferences,
            groupDescription: groupMode ? groupDescription : null,
            forceMode: forceMode || searchMode || null,
            radius: searchRadius,
          }),
        });
        
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.error || 'Smart search failed');
        }
        
        const data = await res.json();
        setTrails(data.trails || []);
        setWeather(data.weather || null);
        setSource(data.source || 'fast');

        setStatus('done');
      } catch (err) {
        setError(
          err.code === 1
            ? 'Location access denied. Please enable location in your browser.'
            : err.message || 'Something went wrong.'
        );
        setStatus('error');
      }
    },
    [searchQuery, searchMode, preferences, groupMode, groupDescription, searchRadius]
  );

  // Session Storage Caching
  useEffect(() => {
    if (status === 'done' && trails.length > 0) {
      sessionStorage.setItem('odyssey_search_cache', JSON.stringify({
        query: searchParams.get('q'),
        status,
        trails,
        searchQuery,
        source,
        hasMore,
        weather,
        locationName,
        userLocation,
        searchMode
      }));
    }
  }, [status, trails, searchQuery, source, hasMore, weather, locationName, userLocation, searchMode, searchParams]);

  // Auto-trigger when navigated from home
  useEffect(() => {
    if (status !== 'idle') return;
    
    const cached = sessionStorage.getItem('odyssey_search_cache');
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
          setLocationName(parsed.locationName);
          setUserLocation(parsed.userLocation);
          setSearchMode(parsed.searchMode || 'fast');
          return;
        }
      } catch (e) {}
    }

    if (query && status === 'idle') runSearch();
  }, [query]); // eslint-disable-line

  const selectTrail = (idx) => {
    const next = idx === selectedIdx ? null : idx;
    setSelectedIdx(next);
    if (next !== null && trails[next]?.lat) {
      setMapCenter({ lat: trails[next].lat, lng: trails[next].lng });
      setMapZoom(14);
      mapRef.current?.flyTo({ center: [trails[next].lng, trails[next].lat], zoom: 14 });
    }
  };

  const startHike = (trail) => {
    setIsHiking(true);
    setActiveHike(trail);
    setHikeDistance(0);
    setHikeDuration(0);
    setHikeElevationGain(0);
    setHikeSpeed(0);
    lastLocRef.current = null;

    timerRef.current = setInterval(() => {
      setHikeDuration(prev => prev + 1);
    }, 1000);

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, altitude, speed } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter({ lat: latitude, lng: longitude });
          mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 16 });

          if (lastLocRef.current) {
            const dist = distanceMiles(lastLocRef.current.lat, lastLocRef.current.lng, latitude, longitude);
            setHikeDistance(prev => prev + dist);
            
            if (altitude && lastLocRef.current.altitude) {
              const diff = altitude - lastLocRef.current.altitude;
              if (diff > 0) {
                // Convert meters to feet
                setHikeElevationGain(prev => prev + (diff * 3.28084));
              }
            }
          }
          
          if (speed !== null) {
            // Convert m/s to mph
            setHikeSpeed(speed * 2.23694);
          }

          lastLocRef.current = { lat: latitude, lng: longitude, altitude };
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }
  };

  const stopHike = () => {
    setIsHiking(false);
    setActiveHike(null);
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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
          forceMode: source || searchMode || null,
          excludeNames: trails.map(t => t.name),
          radius: searchRadius,
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

  const scrollToCard = (idx) => {
    setSelectedIdx(idx);
    cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleRefine = async () => {
    if (!refineInput.trim() || isRefining) return;
    const userMsg = { role: 'user', content: refineInput, display: refineInput };
    const nextConv = [...conversation, userMsg];
    setConversation(nextConv);
    const pendingInput = refineInput;
    setRefineInput('');
    setIsRefining(true);

    try {
      const res = await fetch('/api/refine-hikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trails,
          userMessage: pendingInput,
          history: conversation.map((m) => ({ role: m.role, content: m.content })),
          preferences,
          locationName,
        }),
      });
      const data = await res.json();
      const claudeMsg = { role: 'assistant', content: data.message, display: data.message };

      if (data.action === 'new_search') {
        setConversation([...nextConv, claudeMsg]);
        // Re-trigger AI search
        setSearchQuery(pendingInput);
        runSearch('ai');
      } else {
        if (data.trails?.length) setTrails(data.trails);
        setConversation([...nextConv, claudeMsg]);
        // Switch to AI source badge if refinement returned AI data
        if (data.trails?.length && source !== 'ai') setSource('ai');
      }
    } catch {
      setConversation([...nextConv, { role: 'assistant', content: 'Sorry, something went wrong.', display: 'Sorry, something went wrong.' }]);
    }
    setIsRefining(false);
  };

  const hasTrails = status === 'done' && trails.length > 0;
  const hikingPrefs = preferences?.hiking || {};
  const hasPrefs = Object.values(hikingPrefs).some((v) => (Array.isArray(v) ? v.length > 0 : !!v));

  return (
    <div className="flex flex-col h-screen bg-slate-900 font-sans overflow-hidden">

      {/* ── Trail Chat drawer ── */}
      <TrailChatDrawer trail={chatTrail} open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* ── Compare Drawer ── */}
      <AnimatePresence>
        {showCompare && compareList.length > 0 && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 w-full sm:w-[400px] bg-slate-900 border-t border-r border-slate-700 shadow-2xl z-50 rounded-tr-3xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">⚖️ Compare Trails</h3>
              <button onClick={() => setShowCompare(false)} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full">✕</button>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="flex gap-4 min-w-max">
                {compareList.map(t => (
                  <div key={t.name} className="w-48 shrink-0 bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
                    <h4 className="text-white font-bold text-sm truncate">{t.name}</h4>
                    <span className={`text-[10px] w-fit px-2 py-0.5 rounded-full ${getDiff(t.difficulty).badge}`}>{t.difficulty}</span>
                    <div className="text-xs text-slate-400 space-y-1 mt-1">
                      <p>📍 {t.distance}</p>
                      <p>🥾 {t.length}</p>
                      <p>⬆️ {t.elevationGain}</p>
                    </div>
                    {t.sparkline && <div className="mt-2"><Sparkline data={t.sparkline} /></div>}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Offline Banner ── */}
      {isOffline && (
        <div className="shrink-0 bg-rose-600 text-white text-xs font-semibold px-4 py-2 text-center flex items-center justify-center gap-2 z-50">
          <span>⚠️</span> You are offline. Showing cached results. Live chat disabled.
        </div>
      )}

      {/* ── Header ── */}
      <header className="shrink-0 border-b border-slate-800 px-4 py-3 flex items-center gap-3 z-20 bg-slate-900">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-base">🥾 Hikes Near Me</h1>
          {locationName && <p className="text-slate-400 text-xs truncate">{locationName}</p>}
        </div>
        {hasPrefs && (
          <Link href="/personalize" className="shrink-0 text-xs text-indigo-400 bg-indigo-900/30 border border-indigo-500/30 px-3 py-1.5 rounded-full">
            ✨ Personalized
          </Link>
        )}
        <Link href="/saved" className="shrink-0 text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-500/30 px-3 py-1.5 rounded-full transition-colors hover:bg-emerald-900/50">
          💾 Saved
        </Link>
        {hasTrails && (
          <button
            onClick={() => runSearch()}
            disabled={isOffline}
            className="shrink-0 text-slate-400 hover:text-white border border-slate-700 px-2.5 py-1.5 rounded-full text-xs transition-all disabled:opacity-50"
          >
            🔄
          </button>
        )}
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative w-full">
      {/* ── Map strip ── */}
      {(hasTrails || userLocation) && (
        <div className="shrink-0 h-[42vh] md:h-full md:w-1/2 relative z-10 border-b md:border-b-0 md:border-l border-slate-700 order-first md:order-last flex flex-col">
            <Map
              ref={mapRef}
              initialViewState={{
                longitude: mapCenter?.lng || -122.4194,
                latitude: mapCenter?.lat || 37.7749,
                zoom: mapZoom
              }}
              mapStyle={OSM_STYLE}
              style={{ width: '100%', height: '100%' }}
              onZoom={(e) => setMapZoom(e.viewState.zoom)}
            >
              {userLocation && <UserPin position={userLocation} />}

              {trails.map((trail, i) =>
                trail.lat && trail.lng ? (
                  <TrailPin key={`pin-${i}`} trail={trail} index={i} isSelected={selectedIdx === i} onClick={() => selectTrail(i)} />
                ) : null
              )}

              {trails.map((trail, i) =>
                trail.route ? (
                  <Source key={`source-${i}`} id={`route-source-${i}`} type="geojson" data={trail.route}>
                    <Layer
                      id={`route-layer-${i}`}
                      type="line"
                      layout={{
                        'line-join': 'round',
                        'line-cap': 'round'
                      }}
                      paint={{
                        'line-color': selectedIdx === i ? '#3b82f6' : '#94a3b8',
                        'line-width': selectedIdx === i ? 4 : 2,
                        'line-dasharray': selectedIdx === i ? [1] : [2, 2]
                      }}
                    />
                  </Source>
                ) : null
              )}

              {selectedIdx !== null && trails[selectedIdx]?.lat && (
                <MapPopup
                  trail={trails[selectedIdx]}
                  index={selectedIdx}
                  onClose={() => setSelectedIdx(null)}
                  onScrollToCard={() => scrollToCard(selectedIdx)}
                />
              )}

              {/* Right-side controls */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
                  <button onClick={() => mapRef.current?.zoomTo(mapZoom + 1)} className="w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-600 rounded-xl text-white text-xl font-bold flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">+</button>
                  <button onClick={() => mapRef.current?.zoomTo(mapZoom - 1)} className="w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-600 rounded-xl text-white text-xl font-bold flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">−</button>
                  {userLocation && (
                    <button onClick={() => { setMapCenter({ ...userLocation }); mapRef.current?.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 13 }); }} title="My location" className="w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-600 rounded-xl text-white text-base flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">📍</button>
                  )}
                  {hasTrails && (
                    <button onClick={fitAllTrails} title="Show all trails" className="w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-600 rounded-xl text-white text-base flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">🔭</button>
                  )}
              </div>
            </Map>

          {/* Active Hike Overlay */}
          {isHiking && activeHike && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl border border-emerald-500 shadow-2xl flex flex-col items-center gap-3 z-50 min-w-[300px]">
              <div className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Active Hike</div>
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
                  <span className="text-xl">{hikeSpeed.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">MPH</span>
                </div>
              </div>
              <button onClick={stopHike} className="mt-1 w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold py-2 rounded-xl transition-colors">
                Stop Hike
              </button>
            </div>
          )}

          {/* Count pill */}
          {hasTrails && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white text-xs font-semibold px-4 py-2 rounded-full border border-slate-600 shadow-lg pointer-events-none">
              {trails.length} trails {mapType === 'satellite' ? '· 3D' : mapType === 'terrain' ? '· Terrain' : ''} · Tap a pin
            </div>
          )}
        </div>
      )}

      {/* ── Scrollable results / idle ── */}
      <div className="flex-1 md:w-1/2 overflow-y-auto bg-slate-900 relative z-20 flex flex-col min-h-0">
        {weather && <EnvironmentalBanner weather={weather} />}

        {/* Loading states */}
        {status === 'locating' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-slate-300 font-medium">Getting your location…</p>
          </div>
        )}

        {status === 'searching' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className={`w-10 h-10 rounded-full border-4 border-t-transparent animate-spin ${source === 'ai' ? 'border-indigo-400' : 'border-amber-400'}`} />
            <p className="text-slate-300 font-medium">
              {source === 'ai' ? '🤖 Claude is finding your perfect trails…' : '⚡ Quick search in progress…'}
            </p>
            {source === 'ai' && <p className="text-slate-500 text-sm text-center max-w-xs px-4">Matching your personality, preferences, and today&apos;s weather</p>}
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


            {/* Source badge + upgrade CTA */}
            <div className="flex justify-between px-4 pt-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {source === 'ai' && (
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-indigo-900/40 border-indigo-500/40 text-indigo-300">
                      🤖 AI-Personalized
                    </span>
                  )}
                  {source === 'fast' && (
                    <button onClick={() => runSearch('ai')} className="text-xs text-indigo-400 underline hover:text-indigo-300 transition-colors">
                      Personalize with AI →
                    </button>
                  )}
                </div>
                {source === 'ai' && (
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                    These hikes are based on your personalized profile. To change your preferences, <Link href="/personalize" className="text-indigo-400 underline hover:text-indigo-300">go to personalize</Link>.
                  </p>
                )}
              </div>
              <p className="text-slate-500 text-xs shrink-0 mt-1.5">{trails.length} found</p>
            </div>

            {/* Active preference chips (AI mode only) */}
            {hasPrefs && source === 'ai' && (
              <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 scrollbar-none">
                {hikingPrefs.difficulty?.map((d) => (
                  <span key={d} className={`shrink-0 text-xs px-3 py-1 rounded-full border ${getDiff(d).badge}`}>{d}</span>
                ))}
                {hikingPrefs.features?.map((f) => (
                  <span key={f} className="shrink-0 text-xs px-3 py-1 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                    {FEAT_ICONS[f]} {f}
                  </span>
                ))}
              </div>
            )}

            {/* Conversational refinement history */}
            {conversation.length > 0 && (
              <div className="flex flex-col gap-2 py-4">
                {conversation.map((msg, i) => <ConvBubble key={i} msg={msg} />)}
                {isRefining && (
                  <div className="flex justify-start px-4">
                    <div className="bg-slate-700/80 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5">
                      {[0, 150, 300].map((d) => (
                        <div key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trail cards */}
            <div className="px-4 py-4 flex flex-col gap-4">
              {trails.map((trail, i) =>
                source === 'ai' ? (
                  <AITrailCard
                    key={i}
                    trail={trail}
                    index={i}
                    isSelected={selectedIdx === i}
                    onSelect={() => selectTrail(i)}
                    cardRef={(el) => (cardRefs.current[i] = el)}
                    onAskAI={(t) => { if (!isOffline) setChatTrail(t); setChatOpen(true); }}
                    onSave={handleSaveHike}
                    isSaved={savedIds.has(`${trail.name}-${trail.lat}`)}
                    onCompareToggle={toggleCompare}
                    isComparing={compareList.some(ct => ct.name === trail.name)}
                    onStartHike={startHike}
                  />
                ) : (
                  <FastTrailCard
                    key={i}
                    trail={trail}
                    index={i}
                    isSelected={selectedIdx === i}
                    onSelect={() => selectTrail(i)}
                    cardRef={(el) => (cardRefs.current[i] = el)}
                    onSave={handleSaveHike}
                    isSaved={savedIds.has(`${trail.name}-${trail.lat}`)}
                    onStartHike={startHike}
                  />
                )
              )}
              <p className="text-center text-slate-600 text-xs pb-4">
                {source === 'ai' ? 'Powered by Claude AI · Open-Meteo weather' : 'Results from Google Places'}
              </p>
              
              {hasMore && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="w-full py-3 mb-24 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2"
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

        {/* ── Idle / search input state ── */}
        {status === 'idle' && (
          <div className="p-6 flex flex-col gap-6">
            <div className="text-center pt-4">
              <p className="text-5xl mb-4">🥾</p>
              <h2 className="text-white text-xl font-bold mb-2">Find your perfect hike</h2>
              <p className="text-slate-400 text-sm">Describe what you&apos;re after, or just tap search</p>
            </div>

            {/* Natural language input */}
            <div>
              <textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={'"Something peaceful with my dog, shaded, not too long…"'}
                rows={3}
                className="w-full bg-slate-800 border border-slate-600 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
              {searchQuery && (
                <p className="text-xs mt-1.5 text-slate-500">
                  <span className="text-indigo-400">🤖 Smart routing enabled</span>
                </p>
              )}
            </div>

            {/* Quick Preferences */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-500 text-xs">Quick Preferences</p>
                <Link href="/personalize" className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors">Full Personalization →</Link>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {['Easy', 'Moderate', 'Strenuous'].map(diff => {
                  const isActive = preferences?.hiking?.difficulty?.includes(diff);
                  return (
                    <button
                      key={diff}
                      onClick={() => {
                        setPreferences(prev => {
                          const curDiff = prev.hiking?.difficulty || [];
                          const nextDiff = isActive ? curDiff.filter(d => d !== diff) : [...curDiff, diff];
                          const next = { ...prev, hiking: { ...(prev.hiking || {}), difficulty: nextDiff } };
                          localStorage.setItem('userPreferences', JSON.stringify(next));
                          return next;
                        });
                      }}
                      className={`shrink-0 text-xs px-4 py-2 rounded-full border font-medium transition-colors ${
                        isActive 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {diff}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual mode override & Radius */}
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <p className="text-slate-500 text-xs mb-2">Search mode</p>
                <div className="flex gap-2">
                  {[
                    [null, '🎯 Auto'],
                    ['ai', '🤖 Always AI'],
                    ['fast', '⚡ Always Quick'],
                  ].map(([mode, label]) => (
                    <button
                      key={String(mode)}
                      onClick={() => setSearchMode(mode)}
                      className={`flex-1 text-xs py-2 rounded-xl border transition-all font-medium ${
                        searchMode === mode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-slate-500 text-xs mb-2">Radius</p>
                <div className="flex gap-2">
                  {[5, 15, 25, 50].map((r) => (
                    <button
                      key={r}
                      onClick={() => setSearchRadius(r)}
                      className={`flex-1 text-xs py-2 rounded-xl border transition-all font-medium ${
                        searchRadius === r ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {r} mi
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Group planning */}
            <div>
              <button
                onClick={() => setGroupMode((g) => !g)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${groupMode ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
              >
                <span className={`w-5 h-5 rounded flex items-center justify-center text-xs border transition-colors ${groupMode ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-slate-500'}`}>
                  {groupMode ? '✓' : '+'}
                </span>
                Planning for a group?
              </button>
              {groupMode && (
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="e.g. I'm fit, my partner has bad knees, and our 6yo is coming"
                  rows={2}
                  className="w-full mt-2.5 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              )}
            </div>

            <button
              onClick={() => runSearch()}
              disabled={isOffline}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-2xl shadow-lg transition-all duration-300 text-base"
            >
              {isOffline ? 'Offline - Connect to search' : 'Find Hikes Near Me →'}
            </button>
          </div>
        )}
      </div>

      {/* ── Refinement bar — sticky bottom (AI-mode only) ── */}
      {hasTrails && !isOffline && (
        <div className="absolute bottom-6 left-4 right-4 z-50 bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 shadow-2xl rounded-2xl px-3 py-3 flex items-center gap-2">
          
          {compareList.length > 0 && (
            <button
              onClick={() => setShowCompare(true)}
              className="w-10 h-10 flex items-center justify-center bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 rounded-xl transition-colors relative"
            >
              ⚖️
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {compareList.length}
              </span>
            </button>
          )}

          <div className="flex-1 relative">
            <input
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
              placeholder="Too long? Different vibe? Just tell me…"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={isRefining}
            />
            {isRefining ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              </div>
            ) : (
              <button onClick={handleVoiceSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                🎙️
              </button>
            )}
          </div>
          <button
            onClick={handleRefine}
            disabled={!refineInput.trim() || isRefining}
            className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
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
