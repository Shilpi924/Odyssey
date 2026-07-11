'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function TrailConditions({ trail, weather }) {
  const [conditions, setConditions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConditions = async () => {
      setLoading(true);
      
      // Simulate trail conditions based on weather and season
      const now = new Date();
      const month = now.getMonth();
      const isSummer = month >= 5 && month <= 8;
      const isWinter = month >= 11 || month <= 2;
      
      let terrainCondition = 'Dry';
      let mosquitoLevel = 'Low';
      let airQuality = 'Good';
      
      // Terrain conditions based on weather
      if (weather) {
        if (weather.code >= 61 && weather.code <= 67) {
          terrainCondition = 'Muddy';
        } else if (weather.code >= 71 && weather.code <= 77) {
          terrainCondition = 'Snow/Ice';
        } else if (weather.code >= 80 && weather.code <= 82) {
          terrainCondition = 'Wet';
        }
      }
      
      // Mosquito activity based on season and weather
      if (isSummer && weather?.temp > 60) {
        mosquitoLevel = weather?.temp > 75 ? 'High' : 'Moderate';
      } else if (!isWinter && weather?.temp > 50) {
        mosquitoLevel = 'Moderate';
      }
      
      // Air quality based on weather conditions
      if (weather?.code >= 45 && weather?.code <= 48) {
        airQuality = 'Poor';
      } else if (weather?.code >= 95) {
        airQuality = 'Unhealthy';
      }
      
      setConditions({
        terrain: terrainCondition,
        mosquito: mosquitoLevel,
        airQuality: airQuality,
        temperature: weather?.temp || null,
        windSpeed: weather?.windSpeed || null,
        precipitation: weather?.code >= 61 && weather?.code <= 82,
      });
      
      setLoading(false);
    };

    fetchConditions();
  }, [trail, weather]);

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

  const getTerrainColor = (terrain) => {
    switch (terrain) {
      case 'Dry': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Wet': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Muddy': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Snow/Ice': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getMosquitoColor = (level) => {
    switch (level) {
      case 'Low': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Moderate': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'High': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getAirQualityColor = (quality) => {
    switch (quality) {
      case 'Good': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Moderate': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Poor': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'Unhealthy': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700 space-y-3"
    >
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span>🌤️</span> Trail Conditions
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Terrain */}
        <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${getTerrainColor(conditions.terrain)}`}>
          <span className="block opacity-70 mb-1">Terrain</span>
          <span className="text-sm">{conditions.terrain}</span>
        </div>
        
        {/* Mosquito */}
        <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${getMosquitoColor(conditions.mosquito)}`}>
          <span className="block opacity-70 mb-1">Mosquitoes</span>
          <span className="text-sm">{conditions.mosquito}</span>
        </div>
        
        {/* Air Quality */}
        <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${getAirQualityColor(conditions.airQuality)}`}>
          <span className="block opacity-70 mb-1">Air Quality</span>
          <span className="text-sm">{conditions.airQuality}</span>
        </div>
        
        {/* Temperature */}
        {conditions.temperature !== null && (
          <div className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 text-xs font-medium text-slate-300">
            <span className="block opacity-70 mb-1">Temperature</span>
            <span className="text-sm">{conditions.temperature}°F</span>
          </div>
        )}
      </div>
      
      {/* Alerts */}
      {conditions.precipitation && (
        <div className="flex items-center gap-2 text-amber-300 text-xs bg-amber-900/20 border border-amber-500/30 rounded-lg px-3 py-2">
          <span>🌧️</span>
          <span>Rain expected - trails may be wet</span>
        </div>
      )}
      
      {conditions.mosquito === 'High' && (
        <div className="flex items-center gap-2 text-rose-300 text-xs bg-rose-900/20 border border-rose-500/30 rounded-lg px-3 py-2">
          <span>🦟</span>
          <span>High mosquito activity - bring repellent</span>
        </div>
      )}
      
      {conditions.airQuality === 'Unhealthy' && (
        <div className="flex items-center gap-2 text-rose-300 text-xs bg-rose-900/20 border border-rose-500/30 rounded-lg px-3 py-2">
          <span>😷</span>
          <span>Poor air quality - consider shorter hike</span>
        </div>
      )}
    </motion.div>
  );
}
