'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { restorePreferencesFromBackup } from '@/lib/preferences';

const DIFFICULTY_OPTIONS = [
  { label: 'Easy', value: 'Easy' },
  { label: 'Moderate', value: 'Moderate' },
  { label: 'Strenuous', value: 'Strenuous' },
  { label: 'Expert', value: 'Expert' }
];

const LENGTH_OPTIONS = [
  { label: '< 2 miles', value: 'short' },
  { label: '2–5 miles', value: 'medium' },
  { label: '5–10 miles', value: 'long' },
  { label: '10+ miles', value: 'verylong' }
];

export default function HomeSearchWidget() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [diffs, setDiffs] = useState([]);
  const [length, setLength] = useState('');

  // Load user default preferences on mount to pre-select progressive filters
  useEffect(() => {
    const loadDefaultPrefs = async () => {
      try {
        const saved = await restorePreferencesFromBackup();
        if (saved?.hiking) {
          if (Array.isArray(saved.hiking.difficulty)) {
            setDiffs(saved.hiking.difficulty.filter(d => d !== 'None'));
          }
          if (saved.hiking.length && saved.hiking.length !== 'None') {
            setLength(saved.hiking.length);
          }
        }
      } catch (err) {
        console.error('Failed to pre-load search widget preferences:', err);
      }
    };
    loadDefaultPrefs();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (query.trim()) {
      params.set('q', query.trim());
    }
    
    if (diffs.length > 0) {
      params.set('difficulty', diffs.join(','));
    }
    
    if (length) {
      params.set('distance', length);
    }
    
    router.push(`/search?${params.toString()}`);
  };

  const toggleDifficulty = (value) => {
    setDiffs(current =>
      current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value]
    );
  };

  return (
    <form onSubmit={handleSearchSubmit} className="w-full max-w-xl mx-auto space-y-4">
      <div className="relative flex items-center bg-white/[0.04] backdrop-blur-md rounded-2xl border border-white/10 p-1.5 focus-within:border-emerald-500/50 shadow-xl transition-all duration-300">
        <span aria-hidden="true" className="pl-4 text-xl text-stone-400">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Where to? Try Yosemite, Diablo, or Oakland..."
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-white outline-none placeholder:text-stone-500"
        />
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-stone-950 font-bold text-sm px-6 py-3 shadow-md transition-all duration-200"
        >
          Search
        </button>
      </div>

      <div className="flex justify-between items-center px-1">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-400 hover:text-white transition-colors"
        >
          <span>{showFilters ? '▼' : '▶'}</span>
          <span>{showFilters ? 'Hide filters' : '⚙️ Customize search filters'}</span>
        </button>
        {(diffs.length > 0 || length) && (
          <button
            type="button"
            onClick={() => {
              setDiffs([]);
              setLength('');
            }}
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-md space-y-4"
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Difficulty</p>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_OPTIONS.map(opt => {
                  const selected = diffs.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleDifficulty(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        selected
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-stone-800/40 border-white/5 text-stone-400 hover:border-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Trail Length</p>
              <div className="flex flex-wrap gap-2">
                {LENGTH_OPTIONS.map(opt => {
                  const selected = length === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLength(selected ? '' : opt.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        selected
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                          : 'bg-stone-800/40 border-white/5 text-stone-400 hover:border-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
