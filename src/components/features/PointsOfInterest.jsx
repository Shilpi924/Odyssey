'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function PointsOfInterest({ trail, onPOIClick }) {
  const [pois, setPOIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPOI, setSelectedPOI] = useState(null);

  useEffect(() => {
    const generatePOIs = () => {
      // Simulate POI data based on trail features
      const basePOIs = [
        { id: 1, name: 'Trailhead', type: 'trailhead', icon: '🚗', lat: trail.lat, lng: trail.lng, description: 'Starting point with parking' },
      ];

      const featurePOIs = [];
      
      if (trail.features?.includes('Water')) {
        featurePOIs.push(
          { id: 2, name: 'Waterfall Viewpoint', type: 'waterfall', icon: '💧', lat: trail.lat + 0.001, lng: trail.lng + 0.001, description: 'Scenic waterfall with photo opportunities' },
          { id: 3, name: 'River Crossing', type: 'water', icon: '🌊', lat: trail.lat + 0.002, lng: trail.lng + 0.002, description: 'Bridge crossing over scenic river' }
        );
      }
      
      if (trail.features?.includes('Summit')) {
        featurePOIs.push(
          { id: 4, name: 'Summit Viewpoint', type: 'viewpoint', icon: '🏔️', lat: trail.lat + 0.003, lng: trail.lng + 0.003, description: 'Panoramic views from the peak' },
          { id: 5, name: 'Scenic Overlook', type: 'viewpoint', icon: '📸', lat: trail.lat + 0.0025, lng: trail.lng + 0.0025, description: 'Perfect spot for photos' }
        );
      }
      
      if (trail.features?.includes('Shaded')) {
        featurePOIs.push(
          { id: 6, name: 'Forest Grove', type: 'forest', icon: '🌲', lat: trail.lat + 0.0015, lng: trail.lng + 0.0015, description: 'Shaded area perfect for rest' }
        );
      }
      
      if (trail.features?.includes('EasyParking')) {
        featurePOIs.push(
          { id: 7, name: 'Main Parking Area', type: 'parking', icon: '🅿️', lat: trail.lat - 0.0005, lng: trail.lng - 0.0005, description: 'Large parking lot with restrooms' }
        );
      }

      // Add some generic POIs for all trails
      const genericPOIs = [
        { id: 8, name: 'Rest Area', type: 'rest', icon: '🪑', lat: trail.lat + 0.001, lng: trail.lng - 0.001, description: 'Benches and picnic tables' },
        { id: 9, name: 'Information Board', type: 'info', icon: 'ℹ️', lat: trail.lat + 0.0005, lng: trail.lng + 0.0005, description: 'Trail map and information' },
      ];

      setPOIs([...basePOIs, ...featurePOIs, ...genericPOIs]);
      setLoading(false);
    };

    if (trail) {
      generatePOIs();
    }
  }, [trail]);

  const getPOIColor = (type) => {
    switch (type) {
      case 'trailhead': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'waterfall': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'water': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'viewpoint': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'forest': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'parking': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'rest': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'info': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const handlePOIClick = (poi) => {
    setSelectedPOI(poi);
    if (onPOIClick) {
      onPOIClick(poi);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-700 rounded w-1/3"></div>
          <div className="h-3 bg-slate-700 rounded w-full"></div>
          <div className="h-3 bg-slate-700 rounded w-2/3"></div>
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
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span>📍</span> Points of Interest
        <span className="text-xs text-slate-400 font-normal">({pois.length})</span>
      </h3>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {pois.map((poi, index) => (
          <motion.div
            key={poi.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handlePOIClick(poi)}
            className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
              selectedPOI?.id === poi.id
                ? 'ring-2 ring-indigo-500/50 bg-indigo-900/20'
                : 'hover:bg-slate-700/50'
            } ${getPOIColor(poi.type)}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{poi.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium text-sm">{poi.name}</span>
                  <span className="text-xs text-white/70 capitalize">{poi.type}</span>
                </div>
                <p className="text-xs text-white/70">{poi.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* POI Legend */}
      <div className="flex flex-wrap gap-2 text-xs text-slate-400 pt-2 border-t border-slate-700">
        <span className="flex items-center gap-1">
          <span>🚗</span> Trailhead
        </span>
        <span className="flex items-center gap-1">
          <span>💧</span> Waterfall
        </span>
        <span className="flex items-center gap-1">
          <span>🏔️</span> Viewpoint
        </span>
        <span className="flex items-center gap-1">
          <span>🌲</span> Forest
        </span>
        <span className="flex items-center gap-1">
          <span>🅿️</span> Parking
        </span>
      </div>
    </motion.div>
  );
}
