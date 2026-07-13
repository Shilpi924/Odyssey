'use client';

import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Map, { AttributionControl, Marker, Source, Layer } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { db } from '@/lib/db';
import { MAP_CONFIG } from '@/lib/map-style';
import { motion, AnimatePresence } from 'framer-motion';
import TrailCardSkeleton from '@/components/ui/TrailCardSkeleton';
import QuickFilters from '@/components/ui/QuickFilters';
import SearchHistory, { addToHistory } from '@/components/ui/SearchHistory';
import LocationAccessCard from '@/components/privacy/LocationAccessCard';
import useLocationAccess from '@/hooks/useLocationAccess';

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

const KNOWN_SEARCH_DESTINATIONS = [
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

function TrailCardHeader({ trail, index, color, difficulty }) {
  return (
    <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-emerald-950">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_70%_20%,#34d399,transparent_35%),linear-gradient(135deg,transparent_45%,#94a3b8_46%,transparent_48%)]" />
      <div className={`absolute top-2 left-2 ${color.bg} text-white text-xs font-bold px-2 py-1 rounded-lg shadow`}>
        {index + 1}
      </div>
      {trail.difficulty && (
        <div className={`absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-lg shadow backdrop-blur-md ${difficulty.badge}`}>
          {trail.difficulty}
        </div>
      )}
      <p className="absolute bottom-3 left-4 text-xs font-medium text-slate-300">Verified catalog trail</p>
    </div>
  );
}

// ─── Trail Chat Drawer ─────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  'What should I pack?',
  'Is parking hard?',
  'Crowded on weekends?',
  'Safe for kids?',
  'Hardest section?',
  'Best viewpoint?',
];

function TrailChatDrawer({ trail, open, onClose, onTriggerSafetyMode }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const sendMessage = async (msg) => {
    if (!msg.trim() || loading) return;

    // Intercept Safety Keywords
    const safetyKeywords = ['lost', 'injured', 'stranded', 'disoriented', 'unable to return', "i'm lost", "i am lost"];
    if (safetyKeywords.some(keyword => msg.toLowerCase().includes(keyword))) {
      onTriggerSafetyMode?.();
      return;
    }

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
          content: `Ask me about general preparation for ${trail.name}. I only know the sourced facts shown here, not current local conditions. 🥾`,
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

function UserPin({ position, heading }) {
  const rotation = heading !== null ? heading : 0;
  return (
    <Marker longitude={position.lng} latitude={position.lat} style={{ zIndex: 200 }}>
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
  const d = getPinColor(index);
  const diffBadge = getDiff(trail.difficulty);
  return (
    <Marker longitude={trail.lng} latitude={trail.lat} style={{ zIndex: 300 }}>
      <div className="mb-14 w-64 bg-slate-900 border border-slate-600 rounded-2xl shadow-2xl p-4 relative overflow-hidden">
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
            className="flex-1 text-sm bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl font-medium transition-colors"
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

// ─── Skeleton Trail Card ───────────────────────────────────────────────────────

function SkeletonTrailCard() {
  return (
    <div className="bg-slate-800/70 border border-slate-700/50 rounded-2xl overflow-hidden shadow-md animate-pulse">
      <div className="h-36 w-full bg-slate-700/50"></div>
      <div className="p-5 flex flex-col gap-3">
        <div className="h-5 w-3/4 bg-slate-700 rounded"></div>
        <div className="h-4 w-1/2 bg-slate-700 rounded"></div>
        <div className="flex gap-2 mt-2">
          <div className="h-8 w-20 bg-slate-700 rounded-xl"></div>
          <div className="h-8 w-20 bg-slate-700 rounded-xl"></div>
          <div className="h-8 w-20 bg-slate-700 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Trail Card ─────────────────────────────────────────────────────────────

function AITrailCard({ trail, index, isSelected, onSelect, cardRef, onAskAI, onSave, isSaved, onCompareToggle, isComparing, onStartHike, searchMode }) {
  const d = getPinColor(index);
  const diffBadge = getDiff(trail.difficulty);

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
      className={`bg-slate-800/80 backdrop-blur-md border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 relative shadow-lg ${
        isSelected ? `${d.border} shadow-2xl ${d.shadow} ring-2 ${d.ring} -translate-y-1` : 'border-slate-700/70 hover:border-slate-500 hover:shadow-xl hover:-translate-y-0.5'
      } ${isComparing ? 'ring-2 ring-emerald-500' : ''}`}
    >
      {/* Swipe Indicator (Background) */}
      <div className="absolute inset-y-0 left-0 w-full bg-emerald-500/20 flex items-center pl-8 -z-10">
        <span className="text-emerald-400 font-bold text-lg">💾 Release to Save</span>
      </div>

      <div className={`${d.cardBg} w-full h-full relative`}>
      <TrailCardHeader trail={trail} index={index} color={d} difficulty={diffBadge} />

      <div className="p-5 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-white font-bold text-[17px] leading-tight tracking-tight">{trail.name}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1 text-slate-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
              {trail.distance}
            </span>
            {trail.rating && (
              <span className="flex items-center gap-1 bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20">
                <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                {trail.rating}
                {trail.userRatingsTotal > 0 && <span className="text-amber-400/70 ml-0.5">({trail.userRatingsTotal.toLocaleString()})</span>}
              </span>
            )}
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
            {isSaved ? '✓ Saved' : '💾 Save Trail'}
          </button>
          {trail.difficulty ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartHike(trail);
              }}
              className="flex-1 text-xs py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium"
            >
              🚶 Start Hike
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${trail.lat},${trail.lng}`, '_blank');
              }}
              className="flex-1 text-xs py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium"
            >
              🗺️ Navigate
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onAskAI(trail); }}
            className="flex-1 text-xs py-2.5 bg-indigo-900/50 hover:bg-indigo-800/60 border border-indigo-500/30 text-indigo-300 rounded-xl transition-colors font-medium"
          >
            💬 Trail Guide
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

// ─── Verified catalog trail card ──────────────────────────────────────────────

function FastTrailCard({ trail, index, isSelected, onSelect, cardRef, onSave, isSaved, onStartHike }) {
  const d = getPinColor(index);
  const diffBadge = getDiff(trail.difficulty);

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={`${d.cardBg} backdrop-blur-md border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 shadow-lg relative ${
        isSelected ? `${d.border} shadow-2xl ${d.shadow} ring-2 ${d.ring} -translate-y-1` : 'border-slate-700/70 hover:border-slate-500 hover:shadow-xl hover:-translate-y-0.5'
      }`}
    >
      <TrailCardHeader trail={trail} index={index} color={d} difficulty={diffBadge} />

      <div className="p-5 flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-white font-bold text-[17px] leading-tight tracking-tight">{trail.name}</h3>
          <p className="text-slate-400 text-xs truncate">{trail.vicinity}</p>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 font-medium mt-0.5">
            <span className="flex items-center gap-1 text-slate-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
              {trail.distance}
            </span>
            {trail.rating && (
              <span className="flex items-center gap-1 bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20">
                <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                {trail.rating}
                {trail.userRatingsTotal > 0 && <span className="text-amber-400/70 ml-0.5">({trail.userRatingsTotal.toLocaleString()})</span>}
              </span>
            )}
          </div>
          {trail.sourceAttribution && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
              <span>{trail.sourceAttribution}</span>
              {trail.geometrySource && <span className="text-emerald-400">Route geometry: OpenStreetMap</span>}
              {trail.access?.permitRequired && <span className="text-amber-300">Permit required</span>}
              {trail.access?.status && <span>Access: {trail.access.status}</span>}
            </div>
          )}
        </div>
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="flex flex-col gap-2 overflow-hidden"
            >
        <div className="flex gap-2 pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave(trail);
            }}
            className={`flex-1 text-xs py-2.5 rounded-xl transition-colors font-medium ${isSaved ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
          >
            {isSaved ? '✓ Saved' : '💾 Save Trail'}
          </button>
          {trail.difficulty ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartHike(trail);
              }}
              className="flex-1 text-xs py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium"
            >
              🚶 Start Hike
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${trail.lat},${trail.lng}`, '_blank');
              }}
              className="flex-1 text-xs py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium"
            >
              🗺️ Navigate
            </button>
          )}
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
  const mobileView = searchParams.get('view') || 'results';
  const { locationAllowed, locationReady, allowLocation, forgetLocation } = useLocationAccess();

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
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [weather, setWeather] = useState(null);
  const [parkAlerts, setParkAlerts] = useState([]);
  const [alertsFetchedAt, setAlertsFetchedAt] = useState(null);
  const [coverageMessage, setCoverageMessage] = useState('');

  // ── Search input state
  const [searchQuery, setSearchQuery] = useState(query && query !== 'hikes' ? query : '');
  const searchMode = 'fast';
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
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapType, setMapType] = useState('roadmap');
  const [mapZoom, setMapZoom] = useState(12);
  const [showTraffic, setShowTraffic] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapRevision, setMapRevision] = useState(0);

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
            forceMode: searchMode || null,
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
  }, [userLocation, preferences, searchRadius, priceRange, groupMode, groupDescription, isOffline, status, searchQuery, preloadedKey, isPreloading, searchMode]);

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
    async (forceMode = null, locationAuthorized = false, destinationOverride = null) => {
      setStatus('locating');
      setTrails([]);
      setHasMore(true);
      setConversation([]);
      setError('');
      setSelectedIdx(null);
      setWeather(null);
      setParkAlerts([]);
      setAlertsFetchedAt(null);
      setCoverageMessage('');

      const requestedQuery = destinationOverride ?? searchQuery;
      const knownDestination = knownSearchDestination(requestedQuery);
      const needsDeviceLocation = !requestedQuery.trim() || /\b(?:near me|nearby)\b/i.test(requestedQuery);
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
          const currentPrefs = JSON.stringify(preferences);
          
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

        // Use fast-search for default, smart-search for AI mode
        const apiUrl = searchMode === 'ai' ? '/api/smart-search' : '/api/fast-search';
        const body = searchMode === 'ai' 
          ? {
              lat,
              lng,
              locationName: locName,
              naturalLanguageQuery: requestedQuery,
              preferences,
              groupDescription: groupMode ? groupDescription : null,
              forceMode: 'ai',
              radius: searchRadius,
              priceRange: priceRange || null,
            }
          : {
              lat,
              lng,
              query: requestedQuery,
              preferences,
              radius: searchRadius,
              priceRange: priceRange || null,
            };

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
    [searchQuery, searchMode, preferences, groupMode, groupDescription, searchRadius, preloadedData, preloadedKey, priceRange, searchParams, locationAllowed, forgetLocation]
  );

  // Filtering is derived data; memoization avoids a second render and stale results.
  const filteredTrails = useMemo(() => trails.filter(trail => {
    if (activeFilters.length === 0) return true;
      for (const filter of activeFilters) {
        switch (filter) {
          case 'easy':
            if (trail.difficulty !== 'Easy') return false;
            break;
          case 'moderate':
            if (trail.difficulty !== 'Moderate') return false;
            break;
          case 'scenic':
            if (!trail.features?.includes('Scenic')) return false;
            break;
        }
      }
      return true;
    }), [activeFilters, trails]);

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
        searchMode,
        coverageMessage
      }));
    }
  }, [status, trails, searchQuery, source, hasMore, weather, locationName, userLocation, searchMode, searchParams, coverageMessage]);

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

  const selectTrail = (idx) => {
    const next = idx === selectedIdx ? null : idx;
    setSelectedIdx(next);
    if (next !== null && trails[next]?.lat) {
      setMapCenter({ lat: trails[next].lat, lng: trails[next].lng });
      setMapZoom(14);
      mapRef.current?.flyTo({ center: [trails[next].lng, trails[next].lat], zoom: 14 });
    }
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

  const scrollToCard = (idx) => {
    setSelectedIdx(idx);
    cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleRefine = async () => {
    if (!refineInput.trim() || isRefining) return;

    // Intercept Safety Mode Triggers
    const safetyKeywords = ['lost', 'injured', 'stranded', 'disoriented', 'unable to return', "i'm lost", "i am lost"];
    if (safetyKeywords.some(keyword => refineInput.toLowerCase().includes(keyword))) {
      setIsSafetyMode(true);
      setRefineInput('');
      return;
    }

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
      }
    } catch {
      setConversation([...nextConv, { role: 'assistant', content: 'Sorry, something went wrong.', display: 'Sorry, something went wrong.' }]);
    }
    setIsRefining(false);
  };

  const hasTrails = status === 'done' && trails.length > 0;
  const hikingPrefs = preferences?.hiking || {};
  const hasPrefs = Object.values(hikingPrefs).some((v) => (Array.isArray(v) ? v.length > 0 : !!v));

  useEffect(() => {
    if (mobileView === 'results') return;
    const frame = window.requestAnimationFrame(() => document.getElementById('trail-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => window.cancelAnimationFrame(frame);
  }, [mobileView, hasTrails]);

  return (
    <div className="flex flex-col min-h-screen md:h-screen bg-slate-900 font-sans overflow-visible md:overflow-hidden pb-24 md:pb-0">

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

      {/* ── Trail Chat drawer ── */}
      <TrailChatDrawer 
        trail={chatTrail} 
        open={chatOpen} 
        onClose={() => setChatOpen(false)} 
        onTriggerSafetyMode={() => {
          setChatOpen(false);
          setIsSafetyMode(true);
        }}
      />

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
          <h1 className="text-white font-bold text-base">
            {searchQuery ? `🔍 ${searchQuery}` : '🥾 Hikes Near Me'}
          </h1>
          {locationName && <p className="text-slate-400 text-xs truncate">{locationName}</p>}
        </div>
        <button 
          onClick={() => setIsSafetyMode(true)}
          className="shrink-0 text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 rounded-full transition-colors hover:bg-rose-950/60 font-bold"
        >
          🆘 SOS / Lost?
        </button>
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
      {(hasTrails || isHiking || mobileView !== 'results') && (
        <div id="trail-map" className={`shrink-0 ${mobileView === 'results' ? 'h-[55vh]' : 'h-[calc(100vh-9rem)]'} md:h-full md:w-1/2 relative z-10 border-t md:border-t-0 md:border-l border-slate-700 order-last flex flex-col`}>
            <Map
              key={`trail-map-${mapRevision}`}
              ref={mapRef}
              initialViewState={{
                longitude: mapCenter?.lng || -122.4194,
                latitude: mapCenter?.lat || 37.7749,
                zoom: mapZoom,
                pitch: 0,
                bearing: 0
              }}
              mapStyle={MAP_CONFIG.styleUrl}
              attributionControl={false}
              style={{ width: '100%', height: '100%' }}
              minZoom={4}
              onZoom={(e) => setMapZoom(e.viewState.zoom)}
              onLoad={() => setMapError(false)}
              onError={(e) => {
                console.error('Map provider error:', e.error || e);
                setMapError(true);
              }}
            >
              <AttributionControl compact={false} position="bottom-right" />
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
                  onStartHike={startHike}
                />
              )}

              {/* Right-side controls */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
                  <button onClick={() => mapRef.current?.zoomTo(mapZoom + 1)} className="w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-600 rounded-xl text-white text-xl font-bold flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">+</button>
                  <button onClick={() => mapRef.current?.zoomTo(mapZoom - 1)} className="w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-600 rounded-xl text-white text-xl font-bold flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">−</button>
                  <button 
                    onClick={() => setMapRotationMode(prev => prev === 'north' ? 'compass' : 'north')}
                    title={mapRotationMode === 'north' ? "Switch to Compass Up" : "Switch to North Up"}
                    className={`w-10 h-10 backdrop-blur border rounded-xl text-base flex items-center justify-center shadow-lg transition-colors ${
                      mapRotationMode === 'compass' 
                        ? 'bg-indigo-600/90 border-indigo-400 text-white font-bold animate-pulse' 
                        : 'bg-slate-900/90 border-slate-600 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    🧭
                  </button>
                  {userLocation && (
                    <button onClick={() => { setMapCenter({ ...userLocation }); mapRef.current?.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 13 }); }} title="My location" className="w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-600 rounded-xl text-white text-base flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">📍</button>
                  )}
                  {hasTrails && (
                    <button onClick={fitAllTrails} title="Show all trails" className="w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-600 rounded-xl text-white text-base flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">🔭</button>
                  )}
              </div>
            </Map>

          {mapError && (
            <div role="status" className="absolute inset-x-4 top-4 z-40 rounded-xl border border-amber-400/40 bg-slate-950/95 p-4 text-sm text-amber-100 shadow-xl">
              <p className="font-semibold">Basemap temporarily unavailable</p>
              <p className="mt-1 text-xs text-slate-300">Verified trail facts remain available. Do not rely on this map for navigation.</p>
              <button type="button" onClick={() => { setMapError(false); setMapRevision(revision => revision + 1); }} className="mt-3 rounded-lg border border-amber-300/40 px-3 py-1.5 text-xs font-semibold hover:bg-amber-300/10">Retry map</button>
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

          {/* Count pill */}
          {hasTrails && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white text-xs font-semibold px-4 py-2 rounded-full border border-slate-600 shadow-lg pointer-events-none">
              {trails.length} trails {mapType === 'satellite' ? '· 3D' : mapType === 'terrain' ? '· Terrain' : ''} · Tap a pin
            </div>
          )}
        </div>
      )}

      {/* ── Scrollable results / idle ── */}
      <div className="flex-none md:flex-1 md:w-1/2 overflow-visible md:overflow-y-auto bg-slate-900 relative z-20 flex flex-col min-h-0 p-4 pb-28 md:pb-4 order-first">
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
                runSearch(null, true);
              }}
              alternativeLabel="Search Yosemite instead"
              onAlternative={() => {
                const destination = 'Yosemite National Park';
                setSearchQuery(destination);
                runSearch(null, false, destination);
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


            {/* Result context */}
            <div className="flex justify-between px-4 pt-4">
              <div className="flex flex-col gap-2 w-full">
                {source === 'ai' && (
                  <div className="truncate text-xs text-slate-400">
                    Depending on your personalized profile, we have selected these {searchQuery.toLowerCase().includes('food') ? 'food options' : 'trails'} to best match your preferences.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Filters */}
            {parkAlerts.length > 0 && (
              <div className="mx-4 mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-amber-200">Current National Park Service alerts</p>
                  {alertsFetchedAt && <span className="text-[10px] text-amber-200/50">Updated {new Date(alertsFetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {parkAlerts.slice(0, 3).map(alert => (
                    <a key={alert.id} href={alert.url} target="_blank" rel="noreferrer" className="text-xs text-amber-100/80 hover:text-amber-100">
                      <span className="font-semibold">{alert.category}:</span> {alert.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <QuickFilters
              activeFilters={activeFilters}
              onFilter={setActiveFilters}
            />

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
              {filteredTrails.length === 0 && activeFilters.length > 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">No trails match your filters</p>
                  <button 
                    onClick={() => setActiveFilters([])}
                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                filteredTrails.map((trail, i) =>
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
                    searchMode={searchMode}
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
                )
              )}
              <p className="text-center text-slate-600 text-xs pb-4">
                Verified catalog results · check official conditions before hiking
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

        {status === 'done' && !hasTrails && (
          <div className="m-6 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-6 text-center">
            <p className="text-lg font-semibold text-amber-100">No verified trails found</p>
            <p className="mt-2 text-sm leading-relaxed text-amber-100/70">{coverageMessage || 'Verified trail coverage is currently available for Yosemite National Park.'}</p>
            <button type="button" onClick={() => { setSearchQuery('Yosemite National Park'); setStatus('idle'); }} className="mt-5 rounded-xl bg-amber-200 px-5 py-2.5 text-sm font-bold text-amber-950">Search Yosemite</button>
          </div>
        )}

        {/* ── Idle / search input state ── */}
        {status === 'idle' && (
          <div className="p-6 flex flex-col gap-6">
            <div className="text-center pt-4">
              <p className="text-5xl mb-4">🥾</p>
              <h2 className="text-white text-xl font-bold mb-2">Find your perfect hike</h2>
              <p className="text-slate-400 text-sm">Describe what you&apos;re after, or just tap search</p>
            </div>

            {/* Search History */}
            <SearchHistory 
              onSelect={(query) => {
                setSearchQuery(query);
                runSearch();
              }}
            />

            {/* Natural language input */}
            <div>
              <textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={'"Something peaceful with my dog, shaded, not too long…"'}
                rows={3}
                className="w-full bg-slate-800 border border-slate-600 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
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

            <button
              onClick={() => runSearch()}
              disabled={isOffline}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-2xl shadow-lg transition-all duration-300 text-base"
            >
              {isOffline ? 'Offline - Connect to search' : 'Search verified trails →'}
            </button>
          </div>
        )}
        </>
        )}
      </div>

      {/* ── Refinement bar — sticky bottom (AI-mode only) ── */}
      {hasTrails && !isOffline && (
        <div className="fixed md:absolute bottom-24 md:bottom-6 left-4 right-4 md:left-4 md:right-4 z-40 bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 shadow-2xl rounded-2xl px-3 py-3 flex items-center gap-2 md:max-w-[calc(50%-2rem)]">
          
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
