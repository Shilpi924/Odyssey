'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Badge definitions
const BADGES = [
  { id: 'first_hike', name: 'First Steps', icon: '🥾', description: 'Complete your first hike', requirement: 1, type: 'hikes' },
  { id: 'ten_hikes', name: 'Explorer', icon: '🗺️', description: 'Complete 10 hikes', requirement: 10, type: 'hikes' },
  { id: 'fifty_hikes', name: 'Adventurer', icon: '🏔️', description: 'Complete 50 hikes', requirement: 50, type: 'hikes' },
  { id: 'hundred_hikes', name: 'Legend', icon: '👑', description: 'Complete 100 hikes', requirement: 100, type: 'hikes' },
  { id: 'easy_lover', name: 'Easy Going', icon: '🌱', description: 'Complete 10 easy hikes', requirement: 10, type: 'easy' },
  { id: 'strenuous_master', name: 'Peak Bagger', icon: '⛰️', description: 'Complete 10 strenuous hikes', requirement: 10, type: 'strenuous' },
  { id: 'dog_friendly', name: 'Dog Walker', icon: '🐕', description: 'Complete 5 dog-friendly hikes', requirement: 5, type: 'dog' },
  { id: 'scenic_seeker', name: 'View Hunter', icon: '📸', description: 'Complete 10 scenic hikes', requirement: 10, type: 'scenic' },
  { id: 'water_lover', name: 'Aquaphile', icon: '💧', description: 'Complete 5 hikes with water', requirement: 5, type: 'water' },
  { id: 'streak_3', name: 'On Fire', icon: '🔥', description: '3-day hiking streak', requirement: 3, type: 'streak' },
  { id: 'streak_7', name: 'Week Warrior', icon: '⚔️', description: '7-day hiking streak', requirement: 7, type: 'streak' },
  { id: 'streak_30', name: 'Month Master', icon: '📅', description: '30-day hiking streak', requirement: 30, type: 'streak' },
  { id: 'distance_50', name: 'Marathoner', icon: '🏃', description: 'Hike 50 total miles', requirement: 50, type: 'distance' },
  { id: 'distance_100', name: 'Centurion', icon: '🎖️', description: 'Hike 100 total miles', requirement: 100, type: 'distance' },
  { id: 'elevation_10000', name: 'High Climber', icon: '🧗', description: 'Gain 10,000 ft elevation', requirement: 10000, type: 'elevation' },
];

export default function Gamification({ userId }) {
  const [stats, setStats] = useState({
    totalHikes: 0,
    totalDistance: 0,
    totalElevation: 0,
    currentStreak: 0,
    longestStreak: 0,
    easyHikes: 0,
    strenuousHikes: 0,
    dogFriendlyHikes: 0,
    scenicHikes: 0,
    waterHikes: 0,
  });
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [nextBadges, setNextBadges] = useState([]);

  useEffect(() => {
    if (userId) {
      fetchGamificationData();
    }
  }, [userId]);

  const fetchGamificationData = async () => {
    try {
      const res = await fetch(`/api/gamification/stats?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setEarnedBadges(data.earnedBadges || []);
        
        // Calculate next badges to earn
        const next = BADGES.filter(badge => {
          if (earnedBadges.includes(badge.id)) return false;
          
          switch (badge.type) {
            case 'hikes':
              return data.stats.totalHikes < badge.requirement;
            case 'easy':
              return data.stats.easyHikes < badge.requirement;
            case 'strenuous':
              return data.stats.strenuousHikes < badge.requirement;
            case 'dog':
              return data.stats.dogFriendlyHikes < badge.requirement;
            case 'scenic':
              return data.stats.scenicHikes < badge.requirement;
            case 'water':
              return data.stats.waterHikes < badge.requirement;
            case 'streak':
              return data.stats.currentStreak < badge.requirement;
            case 'distance':
              return data.stats.totalDistance < badge.requirement;
            case 'elevation':
              return data.stats.totalElevation < badge.requirement;
            default:
              return true;
          }
        }).slice(0, 3);
        
        setNextBadges(next);
      }
    } catch (error) {
      console.error('Error fetching gamification data:', error);
    }
  };

  const getProgress = (badge) => {
    switch (badge.type) {
      case 'hikes':
        return Math.min((stats.totalHikes / badge.requirement) * 100, 100);
      case 'easy':
        return Math.min((stats.easyHikes / badge.requirement) * 100, 100);
      case 'strenuous':
        return Math.min((stats.strenuousHikes / badge.requirement) * 100, 100);
      case 'dog':
        return Math.min((stats.dogFriendlyHikes / badge.requirement) * 100, 100);
      case 'scenic':
        return Math.min((stats.scenicHikes / badge.requirement) * 100, 100);
      case 'water':
        return Math.min((stats.waterHikes / badge.requirement) * 100, 100);
      case 'streak':
        return Math.min((stats.currentStreak / badge.requirement) * 100, 100);
      case 'distance':
        return Math.min((stats.totalDistance / badge.requirement) * 100, 100);
      case 'elevation':
        return Math.min((stats.totalElevation / badge.requirement) * 100, 100);
      default:
        return 0;
    }
  };

  const getCurrentValue = (badge) => {
    switch (badge.type) {
      case 'hikes': return stats.totalHikes;
      case 'easy': return stats.easyHikes;
      case 'strenuous': return stats.strenuousHikes;
      case 'dog': return stats.dogFriendlyHikes;
      case 'scenic': return stats.scenicHikes;
      case 'water': return stats.waterHikes;
      case 'streak': return stats.currentStreak;
      case 'distance': return stats.totalDistance;
      case 'elevation': return stats.totalElevation;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Hikes" value={stats.totalHikes} icon="🥾" />
        <StatCard label="Distance" value={`${stats.totalDistance}mi`} icon="📍" />
        <StatCard label="Elevation" value={`${(stats.totalElevation / 1000).toFixed(1)}k ft`} icon="⛰️" />
        <StatCard label="Current Streak" value={`${stats.currentStreak} days`} icon="🔥" highlight={stats.currentStreak >= 3} />
      </div>

      {/* Next Badges to Earn */}
      {nextBadges.length > 0 && (
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <h3 className="text-white font-semibold mb-3">Next Badges</h3>
          <div className="space-y-3">
            {nextBadges.map(badge => (
              <BadgeProgress
                key={badge.id}
                badge={badge}
                progress={getProgress(badge)}
                current={getCurrentValue(badge)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Badges */}
      <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
        <h3 className="text-white font-semibold mb-3">Badges ({earnedBadges.length}/{BADGES.length})</h3>
        <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
          {BADGES.map(badge => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              earned={earnedBadges.includes(badge.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-4 rounded-xl border ${
        highlight 
          ? 'bg-amber-900/30 border-amber-500/50' 
          : 'bg-slate-800/50 border-slate-700/50'
      }`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-white font-bold text-lg">{value}</div>
      <div className="text-slate-400 text-xs">{label}</div>
    </motion.div>
  );
}

function BadgeCard({ badge, earned }) {
  return (
    <motion.div
      whileHover={{ scale: earned ? 1.05 : 1 }}
      className={`p-3 rounded-xl border flex flex-col items-center text-center ${
        earned
          ? 'bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-500/50'
          : 'bg-slate-900/50 border-slate-700/50 opacity-50'
      }`}
      title={badge.description}
    >
      <span className={`text-2xl mb-1 ${earned ? '' : 'grayscale'}`}>{badge.icon}</span>
      <span className="text-xs text-slate-300">{badge.name}</span>
    </motion.div>
  );
}

function BadgeProgress({ badge, progress, current }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{badge.icon}</span>
        <div className="flex-1">
          <div className="flex justify-between text-xs">
            <span className="text-white">{badge.name}</span>
            <span className="text-slate-400">{current}/{badge.requirement}</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full mt-1 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 pl-7">{badge.description}</p>
    </div>
  );
}

export { BADGES };
