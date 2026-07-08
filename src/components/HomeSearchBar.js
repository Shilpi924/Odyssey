'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeSearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Voice search not supported in this browser.');
    const recognition = new SpeechRecognition();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      // Auto submit after voice search
      if (transcript.trim()) {
        router.push(`/search?q=${encodeURIComponent(transcript)}`);
      }
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
          placeholder="Ask Odyssey to find anything..."
          className="w-full bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-full pl-6 pr-16 py-4 text-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xl transition-all"
        />
        <button
          type="button"
          onClick={handleVoiceSearch}
          className="absolute right-4 p-2 text-slate-400 hover:text-indigo-400 transition-colors"
          title="Voice Search"
        >
          <span className="text-xl">🎙️</span>
        </button>
      </div>
    </form>
  );
}
