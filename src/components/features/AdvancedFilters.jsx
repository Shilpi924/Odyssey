'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DIFFICULTY_LEVELS = ['Easy', 'Moderate', 'Strenuous', 'Expert'];
const TRAIL_FEATURES = [
  { id: 'shaded', label: 'Shaded', icon: '🌳' },
  { id: 'sunny', label: 'Sunny', icon: '☀️' },
  { id: 'water', label: 'Water Features', icon: '💧' },
  { id: 'summit', label: 'Summit View', icon: '🏔️' },
  { id: 'dogFriendly', label: 'Dog Friendly', icon: '🐾' },
  { id: 'loop', label: 'Loop Trail', icon: '🔄' },
  { id: 'scenic', label: 'Scenic', icon: '📸' },
  { id: 'easyParking', label: 'Easy Parking', icon: '🚗' },
  { id: 'wildflowers', label: 'Wildflowers', icon: '🌸' },
  { id: 'alpine', label: 'Alpine', icon: '🧊' },
];

const LENGTH_RANGES = [
  { id: 'short', label: 'Short (< 3 miles)', min: 0, max: 3 },
  { id: 'medium', label: 'Medium (3-6 miles)', min: 3, max: 6 },
  { id: 'long', label: 'Long (6-10 miles)', min: 6, max: 10 },
  { id: 'extended', label: 'Extended (10+ miles)', min: 10, max: Infinity },
];

const ELEVATION_RANGES = [
  { id: 'flat', label: 'Flat (< 500 ft)', min: 0, max: 500 },
  { id: 'moderate', label: 'Moderate (500-1500 ft)', min: 500, max: 1500 },
  { id: 'steep', label: 'Steep (1500-3000 ft)', min: 1500, max: 3000 },
  { id: 'extreme', label: 'Extreme (3000+ ft)', min: 3000, max: Infinity },
];

const CROWD_LEVELS = [
  { id: 'quiet', label: 'Quiet', icon: '🤫' },
  { id: 'moderate', label: 'Moderate', icon: '👥' },
  { id: 'busy', label: 'Busy', icon: '🔥' },
];

export default function AdvancedFilters({ onFilterChange, initialFilters = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    difficulty: initialFilters.difficulty || [],
    features: initialFilters.features || [],
    length: initialFilters.length || [],
    elevation: initialFilters.elevation || [],
    crowdLevel: initialFilters.crowdLevel || [],
    minRating: initialFilters.minRating || 0,
    maxDistance: initialFilters.maxDistance || 50,
    ...initialFilters
  });
  const [activeTab, setActiveTab] = useState('difficulty');

  useEffect(() => {
    onFilterChange?.(filters);
  }, [filters, onFilterChange]);

  const toggleFilter = (category, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const clearFilters = () => {
    setFilters({
      difficulty: [],
      features: [],
      length: [],
      elevation: [],
      crowdLevel: [],
      minRating: 0,
      maxDistance: 50
    });
  };

  const getActiveFilterCount = () => {
    return (
      filters.difficulty.length +
      filters.features.length +
      filters.length.length +
      filters.elevation.length +
      filters.crowdLevel.length +
      (filters.minRating > 0 ? 1 : 0) +
      (filters.maxDistance < 50 ? 1 : 0)
    );
  };

  const tabs = [
    { id: 'difficulty', label: 'Difficulty', icon: '⚡' },
    { id: 'features', label: 'Features', icon: '✨' },
    { id: 'length', label: 'Length', icon: '📏' },
    { id: 'elevation', label: 'Elevation', icon: '⬆️' },
    { id: 'crowd', label: 'Crowd', icon: '👥' },
    { id: 'rating', label: 'Rating', icon: '⭐' },
    { id: 'distance', label: 'Distance', icon: '📍' },
  ];

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>Filters</span>
        {getActiveFilterCount() > 0 && (
          <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">
            {getActiveFilterCount()}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute top-full right-0 mt-2 w-96 max-h-[80vh] bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <h3 className="text-white font-semibold">Advanced Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Clear All
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-700/50 overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'text-indigo-400 border-b-2 border-indigo-400'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {activeTab === 'difficulty' && (
                  <div className="space-y-2">
                    {DIFFICULTY_LEVELS.map(level => (
                      <button
                        key={level}
                        onClick={() => toggleFilter('difficulty', level)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                          filters.difficulty.includes(level)
                            ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300'
                            : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="font-medium">{level}</span>
                        {filters.difficulty.includes(level) && (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'features' && (
                  <div className="grid grid-cols-2 gap-2">
                    {TRAIL_FEATURES.map(feature => (
                      <button
                        key={feature.id}
                        onClick={() => toggleFilter('features', feature.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm ${
                          filters.features.includes(feature.id)
                            ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300'
                            : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{feature.icon}</span>
                        <span>{feature.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'length' && (
                  <div className="space-y-2">
                    {LENGTH_RANGES.map(range => (
                      <button
                        key={range.id}
                        onClick={() => toggleFilter('length', range.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                          filters.length.includes(range.id)
                            ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300'
                            : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="font-medium">{range.label}</span>
                        {filters.length.includes(range.id) && (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'elevation' && (
                  <div className="space-y-2">
                    {ELEVATION_RANGES.map(range => (
                      <button
                        key={range.id}
                        onClick={() => toggleFilter('elevation', range.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                          filters.elevation.includes(range.id)
                            ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300'
                            : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="font-medium">{range.label}</span>
                        {filters.elevation.includes(range.id) && (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'crowd' && (
                  <div className="space-y-2">
                    {CROWD_LEVELS.map(level => (
                      <button
                        key={level.id}
                        onClick={() => toggleFilter('crowdLevel', level.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          filters.crowdLevel.includes(level.id)
                            ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300'
                            : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-xl">{level.icon}</span>
                        <span className="font-medium">{level.label}</span>
                        {filters.crowdLevel.includes(level.id) && (
                          <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'rating' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-300 text-sm mb-2">Minimum Rating</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <button
                            key={rating}
                            onClick={() => setFilters(prev => ({ ...prev, minRating: rating }))}
                            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                              filters.minRating >= rating
                                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                                : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {rating}+ ★
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'distance' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-300 text-sm mb-2">
                        Maximum Distance: {filters.maxDistance} miles
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={filters.maxDistance}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>5 mi</span>
                        <span>100 mi</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-4 border-t border-slate-700/50">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Quick filter chips for common filters
export function QuickFilters({ filters, onToggle }) {
  const quickFilters = [
    { id: 'easy', label: 'Easy Trails', category: 'difficulty', value: 'Easy' },
    { id: 'dog', label: 'Dog Friendly', category: 'features', value: 'dogFriendly' },
    { id: 'short', label: 'Short Hikes', category: 'length', value: 'short' },
    { id: 'quiet', label: 'Less Crowded', category: 'crowdLevel', value: 'quiet' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {quickFilters.map(filter => {
        const isActive = filters[filter.category]?.includes(filter.value);
        return (
          <button
            key={filter.id}
            onClick={() => onToggle(filter.category, filter.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              isActive
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
