'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeSearchBar() {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
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
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
      // Auto submit after voice search
      if (transcript.trim()) {
        router.push(`/search?q=${encodeURIComponent(transcript)}`);
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
    </form>
  );
}
