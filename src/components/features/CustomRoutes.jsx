'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function CustomRoutes({ onSaveRoute, existingTrails }) {
  const [isCreating, setIsCreating] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeType, setRouteType] = useState('loop');
  const [difficulty, setDifficulty] = useState('moderate');
  const [length, setLength] = useState('medium');
  const [scenicPreference, setScenicPreference] = useState('balanced');
  const [waypoints, setWaypoints] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRoute, setGeneratedRoute] = useState(null);

  const handleGenerateRoute = async () => {
    setIsGenerating(true);
    
    // Simulate AI-powered route generation
    setTimeout(() => {
      const mockRoute = {
        name: routeName || 'Custom Route',
        type: routeType,
        difficulty,
        length,
        scenicPreference,
        waypoints: waypoints.length > 0 ? waypoints : [
          { lat: 37.7749, lng: -122.4194, name: 'Start Point' },
          { lat: 37.7849, lng: -122.4094, name: 'Midpoint' },
          { lat: 37.7949, lng: -122.3994, name: 'End Point' }
        ],
        estimatedTime: length === 'short' ? '1-2 hours' : length === 'medium' ? '2-4 hours' : '4-6 hours',
        elevationGain: difficulty === 'easy' ? '200-500 ft' : difficulty === 'moderate' ? '500-1500 ft' : '1500-3000 ft',
        features: scenicPreference === 'scenic' ? ['Scenic', 'Water', 'Summit'] : ['EasyParking', 'Loop'],
      };
      
      setGeneratedRoute(mockRoute);
      setIsGenerating(false);
    }, 2000);
  };

  const handleSaveRoute = () => {
    if (generatedRoute && onSaveRoute) {
      onSaveRoute(generatedRoute);
      setIsCreating(false);
      setGeneratedRoute(null);
      setRouteName('');
      setWaypoints([]);
    }
  };

  const handleModifyExisting = (trail) => {
    setRouteName(`Modified ${trail.name}`);
    setDifficulty(trail.difficulty?.toLowerCase() || 'moderate');
    setIsCreating(true);
  };

  if (!isCreating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700 space-y-4"
      >
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <span>🗺️</span> Custom Routes
        </h3>
        
        <button
          onClick={() => setIsCreating(true)}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all text-sm"
        >
          ✨ Create Custom Route
        </button>

        {existingTrails && existingTrails.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Modify existing trail:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {existingTrails.slice(0, 3).map((trail, index) => (
                <button
                  key={index}
                  onClick={() => handleModifyExisting(trail)}
                  className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
                >
                  🔄 {trail.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <span>🗺️</span> Create Custom Route
        </h3>
        <button
          onClick={() => setIsCreating(false)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {!generatedRoute ? (
        <>
          {/* Route Name */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Route Name</label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="My Custom Adventure"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Route Type */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Route Type</label>
            <div className="flex gap-2">
              {['loop', 'out-and-back', 'point-to-point'].map((type) => (
                <button
                  key={type}
                  onClick={() => setRouteType(type)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    routeType === type
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {type.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Difficulty</label>
            <div className="flex gap-2">
              {['easy', 'moderate', 'strenuous'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    difficulty === diff
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Length */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Length</label>
            <div className="flex gap-2">
              {['short', 'medium', 'long'].map((len) => (
                <button
                  key={len}
                  onClick={() => setLength(len)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    length === len
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {len.charAt(0).toUpperCase() + len.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Scenic Preference */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Route Style</label>
            <div className="flex gap-2">
              {['efficient', 'balanced', 'scenic'].map((style) => (
                <button
                  key={style}
                  onClick={() => setScenicPreference(style)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    scenicPreference === style
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateRoute}
            disabled={isGenerating}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium rounded-lg transition-all text-sm flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating AI Route...
              </>
            ) : (
              <>
                🤖 Generate with AI
              </>
            )}
          </button>
        </>
      ) : (
        <>
          {/* Generated Route Preview */}
          <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50 space-y-3">
            <h4 className="text-white font-medium text-sm">{generatedRoute.name}</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-400">Type: <span className="text-white">{generatedRoute.type}</span></div>
              <div className="text-slate-400">Difficulty: <span className="text-white">{generatedRoute.difficulty}</span></div>
              <div className="text-slate-400">Time: <span className="text-white">{generatedRoute.estimatedTime}</span></div>
              <div className="text-slate-400">Elevation: <span className="text-white">{generatedRoute.elevationGain}</span></div>
            </div>
            <div className="text-xs text-slate-400">
              Features: {generatedRoute.features.join(', ')}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setGeneratedRoute(null)}
              className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Modify
            </button>
            <button
              onClick={handleSaveRoute}
              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors"
            >
              Save Route
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
