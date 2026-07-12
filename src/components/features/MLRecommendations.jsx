'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

export default function MLRecommendations({ userId, onTrailSelect }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/recommendations/ml?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
        setPreferences(data.insights || null);
      }
    } catch (error) {
      console.error('Error fetching ML recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const timer = window.setTimeout(fetchRecommendations, 0);
    return () => window.clearTimeout(timer);
  }, [userId, fetchRecommendations]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-slate-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Insights */}
      {preferences && (
        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-2xl p-4 border border-indigo-500/30">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <span>🧠</span> Your Hiking Style
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400">Favorite Difficulty</p>
              <p className="text-white font-medium">{preferences.favoriteDifficulty}</p>
            </div>
            <div>
              <p className="text-slate-400">Avg Distance</p>
              <p className="text-white font-medium">{preferences.avgDistance}mi</p>
            </div>
            <div>
              <p className="text-slate-400">Top Feature</p>
              <p className="text-white font-medium">{preferences.topFeature}</p>
            </div>
            <div>
              <p className="text-slate-400">Best Day</p>
              <p className="text-white font-medium">{preferences.bestDay}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Because you liked...</h3>
          <button
            onClick={fetchRecommendations}
            className="text-indigo-400 hover:text-indigo-300 text-xs"
          >
            Refresh
          </button>
        </div>

        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                reason={rec.reason}
                similarity={rec.similarity}
                onClick={() => onTrailSelect?.(rec)}
                delay={index * 0.1}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">Complete more hikes to get personalized recommendations</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation, reason, similarity, onClick, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 hover:border-indigo-500/50 cursor-pointer transition-all"
    >
      <div className="flex gap-3">
        {/* Similarity Score */}
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
            similarity >= 80 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' :
            similarity >= 60 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' :
            'bg-slate-700 text-slate-400 border border-slate-600'
          }`}>
            {similarity}%
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate">{recommendation.name}</h4>
          <p className="text-slate-400 text-xs mt-1">{recommendation.difficulty} · {recommendation.length}</p>
          
          {/* Reason */}
          <p className="text-indigo-300 text-xs mt-2 line-clamp-2">
            💡 {reason}
          </p>

          {/* Features */}
          <div className="flex gap-1 mt-2 flex-wrap">
            {recommendation.features?.slice(0, 3).map(feature => (
              <span key={feature} className="text-[10px] px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Helper function to analyze hike history
export function analyzeHikeHistory(completedHikes) {
  if (!completedHikes || completedHikes.length === 0) {
    return null;
  }

  const insights = {
    favoriteDifficulty: 'Moderate',
    avgDistance: 5,
    topFeature: 'Scenic',
    bestDay: 'Saturday',
    difficultyCounts: {},
    featureCounts: {},
    dayCounts: {},
    totalDistance: 0,
  };

  completedHikes.forEach(hike => {
    // Count difficulties
    if (hike.difficulty) {
      insights.difficultyCounts[hike.difficulty] = (insights.difficultyCounts[hike.difficulty] || 0) + 1;
    }

    // Count features
    if (hike.features) {
      hike.features.forEach(feature => {
        insights.featureCounts[feature] = (insights.featureCounts[feature] || 0) + 1;
      });
    }

    // Count days
    const day = new Date(hike.completedAt).toLocaleDateString('en-US', { weekday: 'long' });
    insights.dayCounts[day] = (insights.dayCounts[day] || 0) + 1;

    // Sum distance
    if (hike.distance) {
      const dist = parseFloat(hike.distance) || 0;
      insights.totalDistance += dist;
    }
  });

  // Calculate favorite difficulty
  const diffEntries = Object.entries(insights.difficultyCounts);
  if (diffEntries.length > 0) {
    insights.favoriteDifficulty = diffEntries.sort((a, b) => b[1] - a[1])[0][0];
  }

  // Calculate average distance
  insights.avgDistance = (insights.totalDistance / completedHikes.length).toFixed(1);

  // Calculate top feature
  const featureEntries = Object.entries(insights.featureCounts);
  if (featureEntries.length > 0) {
    insights.topFeature = featureEntries.sort((a, b) => b[1] - a[1])[0][0];
  }

  // Calculate best day
  const dayEntries = Object.entries(insights.dayCounts);
  if (dayEntries.length > 0) {
    insights.bestDay = dayEntries.sort((a, b) => b[1] - a[1])[0][0];
  }

  return insights;
}

// Helper function to find similar trails
export function findSimilarTrails(targetTrail, allTrails, maxResults = 5) {
  if (!targetTrail || !allTrails) return [];

  const similarities = allTrails
    .filter(trail => trail.id !== targetTrail.id)
    .map(trail => ({
      ...trail,
      similarity: calculateSimilarity(targetTrail, trail)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);

  return similarities;
}

function calculateSimilarity(trail1, trail2) {
  let score = 0;
  let factors = 0;

  // Difficulty match
  if (trail1.difficulty === trail2.difficulty) {
    score += 30;
  }
  factors += 30;

  // Feature overlap
  const features1 = new Set(trail1.features || []);
  const features2 = new Set(trail2.features || []);
  const intersection = [...features1].filter(f => features2.has(f));
  const union = new Set([...features1, ...features2]);
  const featureSimilarity = union.size > 0 ? (intersection.length / union.size) * 100 : 0;
  score += featureSimilarity * 0.4;
  factors += 40;

  // Length similarity
  if (trail1.length && trail2.length) {
    const len1 = parseFloat(trail1.length) || 0;
    const len2 = parseFloat(trail2.length) || 0;
    const diff = Math.abs(len1 - len2);
    const lengthSimilarity = Math.max(0, 100 - diff * 10);
    score += lengthSimilarity * 0.3;
  }
  factors += 30;

  return Math.round((score / factors) * 100);
}
