'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Terrain3DPreview({ trail, onToggle3D }) {
  const [is3D, setIs3D] = useState(true);
  const [elevationProfile, setElevationProfile] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateElevationProfile = () => {
      // Simulate elevation profile based on trail difficulty and length
      const points = [];
      const baseElevation = trail.difficulty === 'Easy' ? 500 : trail.difficulty === 'Moderate' ? 1000 : 2000;
      const variation = trail.difficulty === 'Easy' ? 100 : trail.difficulty === 'Moderate' ? 300 : 500;
      
      for (let i = 0; i <= 10; i++) {
        const progress = i / 10;
        const elevation = baseElevation + Math.sin(progress * Math.PI * 2) * variation + (Math.random() - 0.5) * 50;
        points.push({
          distance: progress * (parseFloat(trail.length) || 5),
          elevation: Math.round(elevation),
        });
      }
      
      setElevationProfile(points);
      setLoading(false);
    };

    if (trail) {
      generateElevationProfile();
    }
  }, [trail]);

  const handleToggle3D = () => {
    setIs3D(!is3D);
    if (onToggle3D) {
      onToggle3D(!is3D);
    }
  };

  const maxElevation = Math.max(...elevationProfile.map(p => p.elevation));
  const minElevation = Math.min(...elevationProfile.map(p => p.elevation));
  const elevationGain = maxElevation - minElevation;

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-700 rounded w-1/3"></div>
          <div className="h-24 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <span>🏔️</span> 3D Terrain Preview
        </h3>
        <button
          onClick={handleToggle3D}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            is3D 
              ? 'bg-indigo-500 text-white' 
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {is3D ? '3D On' : '3D Off'}
        </button>
      </div>

      {/* Elevation Profile Chart */}
      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">Elevation Profile</span>
          <span className="text-xs text-slate-400">Gain: {elevationGain}ft</span>
        </div>
        
        <div className="relative h-24 w-full">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            <div className="border-t border-slate-700/30"></div>
            <div className="border-t border-slate-700/30"></div>
            <div className="border-t border-slate-700/30"></div>
            <div className="border-t border-slate-700/30"></div>
          </div>
          
          {/* Elevation line */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1 }}
              d={`M 0 ${100 - ((elevationProfile[0]?.elevation - minElevation) / (maxElevation - minElevation || 1)) * 80} ${elevationProfile.map((p, i) => 
                `L ${i * 10} ${100 - ((p.elevation - minElevation) / (maxElevation - minElevation || 1)) * 80}`
              ).join(' ')}`}
              fill="none"
              stroke="url(#elevationGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Area under the curve */}
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              d={`M 0 ${100 - ((elevationProfile[0]?.elevation - minElevation) / (maxElevation - minElevation || 1)) * 80} ${elevationProfile.map((p, i) => 
                `L ${i * 10} ${100 - ((p.elevation - minElevation) / (maxElevation - minElevation || 1)) * 80}`
              ).join(' ')} L 100 100 L 0 100 Z`}
              fill="url(#elevationGradient)"
            />
            
            <defs>
              <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        {/* Distance markers */}
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0 mi</span>
          <span>{(parseFloat(trail.length) || 5) / 2} mi</span>
          <span>{parseFloat(trail.length) || 5} mi</span>
        </div>
      </div>

      {/* Terrain Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-700/30 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-white">{maxElevation}</div>
          <div className="text-xs text-slate-400">Max Elev</div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-white">{minElevation}</div>
          <div className="text-xs text-slate-400">Min Elev</div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-white">{elevationGain}</div>
          <div className="text-xs text-slate-400">Gain</div>
        </div>
      </div>

      {/* Terrain Type */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>Terrain:</span>
        <span className="text-white font-medium">
          {trail.difficulty === 'Easy' ? 'Gentle slopes' : trail.difficulty === 'Moderate' ? 'Mixed terrain' : 'Steep sections'}
        </span>
      </div>

      {/* 3D Toggle Info */}
      {is3D && (
        <div className="bg-indigo-900/20 rounded-lg p-2 border border-indigo-500/30">
          <p className="text-xs text-indigo-300">
            🎮 Drag to rotate • Scroll to zoom • Right-click to pan
          </p>
        </div>
      )}
    </motion.div>
  );
}
