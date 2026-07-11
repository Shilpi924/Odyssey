'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const FILTERS = [
  { id: 'distance', label: 'Under 5mi', icon: '📍' },
  { id: 'easy', label: 'Easy', icon: '🟢' },
  { id: 'moderate', label: 'Moderate', icon: '🟡' },
  { id: 'rating', label: '4+ Stars', icon: '⭐' },
  { id: 'dog', label: 'Dog Friendly', icon: '🐾' },
  { id: 'scenic', label: 'Scenic', icon: '📸' },
];

export default function QuickFilters({ trails, onFilter, activeFilters }) {
  const [selected, setSelected] = useState(activeFilters || []);

  const toggleFilter = (filterId) => {
    const newSelected = selected.includes(filterId)
      ? selected.filter(id => id !== filterId)
      : [...selected, filterId];
    
    setSelected(newSelected);
    onFilter(newSelected);
  };

  const clearAll = () => {
    setSelected([]);
    onFilter([]);
  };

  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">Quick Filters</span>
        {selected.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <motion.button
            key={filter.id}
            onClick={() => toggleFilter(filter.id)}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              selected.includes(filter.id)
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
            }`}
          >
            {filter.icon} {filter.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
