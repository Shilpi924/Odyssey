'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

export default function CommunityHeatmap({ trails, onTrailSelect }) {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const heatmapData = useMemo(() => (trails || []).map((trail, index) => {
    const traffic = trail.estimatedWeeklyVisitors || ((index * 977) % 4900) + 100;
    return { ...trail, traffic, popularity: Math.min(traffic / 5000, 1), lastUpdated: trail.lastUpdated || 'Recently' };
  }), [trails]);

  const getHeatmapColor = (popularity) => {
    if (popularity < 0.2) return 'bg-emerald-500/30 border-emerald-500/50';
    if (popularity < 0.4) return 'bg-yellow-500/30 border-yellow-500/50';
    if (popularity < 0.6) return 'bg-orange-500/30 border-orange-500/50';
    if (popularity < 0.8) return 'bg-red-500/30 border-red-500/50';
    return 'bg-rose-600/40 border-rose-600/60';
  };

  const getTrafficLabel = (popularity) => {
    if (popularity < 0.2) return 'Quiet';
    if (popularity < 0.4) return 'Low Traffic';
    if (popularity < 0.6) return 'Moderate';
    if (popularity < 0.8) return 'Busy';
    return 'Crowded';
  };

  const sortedByTraffic = [...heatmapData].sort((a, b) => b.popularity - a.popularity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <span>🔥</span> Community Heatmap
        </h3>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {showHeatmap ? 'Hide' : 'Show'}
        </button>
      </div>

      {showHeatmap && (
        <>
          {/* Traffic Legend */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50"></span>
              Quiet
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500/50"></span>
              Low
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-orange-500/30 border border-orange-500/50"></span>
              Moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50"></span>
              Busy
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-rose-600/40 border border-rose-600/60"></span>
              Crowded
            </span>
          </div>

          {/* Trail Traffic List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedByTraffic.map((trail, index) => (
              <motion.div
                key={trail.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onTrailSelect && onTrailSelect(index)}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${getHeatmapColor(trail.popularity)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium text-sm">{trail.name}</span>
                  <span className="text-xs font-semibold text-white/80">
                    {getTrafficLabel(trail.popularity)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/70">
                  <span>👥 ~{trail.traffic.toLocaleString()}/wk</span>
                  <span>{trail.distance}</span>
                </div>
                {/* Traffic Bar */}
                <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${trail.popularity * 100}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="h-full bg-white/80 rounded-full"
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Insights */}
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
            <p className="text-xs text-slate-300">
              <span className="font-semibold text-indigo-300">💡 Tip:</span> 
              {heatmapData.length > 0 && heatmapData[0].popularity > 0.7
                ? ' Popular trails may have limited parking. Consider arriving early or exploring quieter alternatives.'
                : ' Great time to explore! Most trails have low traffic today.'}
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}
