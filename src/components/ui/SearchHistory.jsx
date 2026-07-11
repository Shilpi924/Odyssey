'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const MAX_HISTORY = 10;

export default function SearchHistory({ onSelect, onClear }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('odyssey_search_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('odyssey_search_history');
    if (onClear) onClear();
  };

  if (history.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium">Recent Searches</span>
        <button
          onClick={clearHistory}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.map((query, i) => (
          <motion.button
            key={`${query}-${i}`}
            onClick={() => onSelect(query)}
            whileTap={{ scale: 0.95 }}
            className="px-3 py-1.5 bg-slate-800/80 text-slate-300 text-xs rounded-full border border-slate-700 hover:border-slate-600 hover:text-white transition-all"
          >
            {query}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export function addToHistory(query) {
  if (!query || query.trim() === '') return;
  
  const saved = localStorage.getItem('odyssey_search_history');
  let history = [];
  if (saved) {
    try {
      history = JSON.parse(saved);
    } catch {}
  }
  
  const newHistory = [query, ...history.filter(h => h !== query)].slice(0, MAX_HISTORY);
  localStorage.setItem('odyssey_search_history', JSON.stringify(newHistory));
}
