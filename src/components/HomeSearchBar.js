'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Natural language parser for voice queries
function parseVoiceQuery(transcript) {
  const lower = transcript.toLowerCase();
  const constraints = {
    difficulty: [],
    features: [],
    maxLength: null,
    minLength: null,
    query: transcript
  };

  // Parse difficulty
  if (lower.includes('easy')) constraints.difficulty.push('Easy');
  if (lower.includes('moderate')) constraints.difficulty.push('Moderate');
  if (lower.includes('strenuous') || lower.includes('hard')) constraints.difficulty.push('Strenuous');
  if (lower.includes('expert') || lower.includes('extreme')) constraints.difficulty.push('Expert');

  // Parse features
  if (lower.includes('dog') || lower.includes('pet')) constraints.features.push('DogFriendly');
  if (lower.includes('shaded') || lower.includes('shade')) constraints.features.push('Shaded');
  if (lower.includes('sunny') || lower.includes('sun')) constraints.features.push('Sunny');
  if (lower.includes('water') || lower.includes('lake') || lower.includes('river')) constraints.features.push('Water');
  if (lower.includes('scenic') || lower.includes('view') || lower.includes('viewpoint')) constraints.features.push('Scenic');
  if (lower.includes('parking')) constraints.features.push('EasyParking');
  if (lower.includes('wildflower') || lower.includes('flower')) constraints.features.push('Wildflowers');

  // Parse length
  const lengthMatch = lower.match(/under\s*(\d+)\s*(mile|mi)/i);
  if (lengthMatch) {
    constraints.maxLength = parseInt(lengthMatch[1]);
  }
  const lengthMatch2 = lower.match(/less than\s*(\d+)\s*(mile|mi)/i);
  if (lengthMatch2) {
    constraints.maxLength = parseInt(lengthMatch2[1]);
  }
  const lengthMatch3 = lower.match(/(\d+)\s*(mile|mi)\s*(or less|or shorter)/i);
  if (lengthMatch3) {
    constraints.maxLength = parseInt(lengthMatch3[1]);
  }

  return constraints;
}

export default function HomeSearchBar() {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interpretedQuery, setInterpretedQuery] = useState(null);
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      const constraints = parseVoiceQuery(query);
      const params = new URLSearchParams();
      params.set('q', query);
      if (constraints.difficulty.length > 0) {
        params.set('difficulty', constraints.difficulty.join(','));
      }
      if (constraints.features.length > 0) {
        params.set('features', constraints.features.join(','));
      }
      if (constraints.maxLength) {
        params.set('maxLength', constraints.maxLength);
      }
      router.push(`/search?${params.toString()}`);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice search not supported in this browser.');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
      setInterpretedQuery(null);
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
      
      // Parse and show interpreted query
      const constraints = parseVoiceQuery(transcript);
      setInterpretedQuery(constraints);
      
      // Auto submit after voice search
      if (transcript.trim()) {
        const params = new URLSearchParams();
        params.set('q', transcript);
        if (constraints.difficulty.length > 0) {
          params.set('difficulty', constraints.difficulty.join(','));
        }
        if (constraints.features.length > 0) {
          params.set('features', constraints.features.join(','));
        }
        if (constraints.maxLength) {
          params.set('maxLength', constraints.maxLength);
        }
        router.push(`/search?${params.toString()}`);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.');
      } else {
        alert('Voice search failed. Please try again.');
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto mb-10 relative z-20">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isListening ? "Listening..." : "Ask Odyssey to find anything..."}
          className={`w-full bg-slate-800/80 backdrop-blur-md border rounded-full pl-6 pr-16 py-4 text-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 shadow-2xl transition-all ${
            isListening 
              ? 'border-red-500 ring-2 ring-red-500/50 animate-pulse' 
              : 'border-slate-600 focus:ring-indigo-500'
          }`}
        />
        <button
          type="button"
          onClick={handleVoiceSearch}
          className={`absolute right-4 p-2 transition-colors ${
            isListening 
              ? 'text-red-400 animate-pulse' 
              : 'text-slate-400 hover:text-indigo-400'
          }`}
          title={isListening ? "Listening..." : "Voice Search"}
        >
          <span className="text-xl">{isListening ? '🔴' : '🎙️'}</span>
        </button>
      </div>
      
      {/* Interpreted query display */}
      {interpretedQuery && (interpretedQuery.difficulty.length > 0 || interpretedQuery.features.length > 0 || interpretedQuery.maxLength) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {interpretedQuery.difficulty.map(d => (
            <span key={d} className="px-2 py-1 bg-indigo-900/50 text-indigo-300 rounded-full border border-indigo-500/30">
              {d}
            </span>
          ))}
          {interpretedQuery.features.map(f => (
            <span key={f} className="px-2 py-1 bg-emerald-900/50 text-emerald-300 rounded-full border border-emerald-500/30">
              {f}
            </span>
          ))}
          {interpretedQuery.maxLength && (
            <span className="px-2 py-1 bg-amber-900/50 text-amber-300 rounded-full border border-amber-500/30">
              Under {interpretedQuery.maxLength}mi
            </span>
          )}
        </div>
      )}
    </form>
  );
}
