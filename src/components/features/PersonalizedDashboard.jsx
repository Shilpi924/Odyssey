'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModernGlassCard from './ModernGlassCard';

export default function PersonalizedDashboard({ userLocation, weather, userPreferences }) {
  const [timeOfDay, setTimeOfDay] = useState('morning');
  const [recommendations, setRecommendations] = useState([]);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    determineTimeOfDay();
    generateGreeting();
    generateRecommendations();
  }, [weather, userPreferences]);

  const determineTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setTimeOfDay('morning');
    else if (hour >= 12 && hour < 17) setTimeOfDay('afternoon');
    else if (hour >= 17 && hour < 21) setTimeOfDay('evening');
    else setTimeOfDay('night');
  };

  const generateGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Good morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
    else if (hour >= 17 && hour < 21) setGreeting('Good evening');
    else setGreeting('Good night');
  };

  const generateRecommendations = () => {
    const recs = [];
    const hour = new Date().getHours();
    const prefs = userPreferences || {};

    // Time-based recommendations
    if (hour >= 6 && hour < 11) {
      recs.push({
        type: 'time',
        icon: '🌅',
        title: 'Perfect for Morning Hikes',
        description: 'Early trails with great sunrise views',
        action: 'Find sunrise hikes',
        query: 'sunrise hikes near me'
      });
    } else if (hour >= 11 && hour < 15) {
      recs.push({
        type: 'time',
        icon: '☀️',
        title: 'Mid-Day Adventures',
        description: 'Shaded trails for peak sun hours',
        action: 'Find shaded trails',
        query: 'shaded hikes near me'
      });
    } else if (hour >= 15 && hour < 19) {
      recs.push({
        type: 'time',
        icon: '🌤️',
        title: 'Golden Hour Walks',
        description: 'Trails with perfect evening lighting',
        action: 'Find sunset spots',
        query: 'sunset viewpoints near me'
      });
    } else if (hour >= 19 || hour < 6) {
      recs.push({
        type: 'time',
        icon: '🌙',
        title: 'Evening Dining',
        description: 'Great restaurants for dinner',
        action: 'Find dinner spots',
        query: 'dinner restaurants near me'
      });
    }

    // Weather-based recommendations
    if (weather) {
      if (weather.code >= 80) {
        recs.push({
          type: 'weather',
          icon: '🏠',
          title: 'Indoor Activities',
          description: 'Rainy day? Try these indoor options',
          action: 'Find indoor activities',
          query: 'indoor activities near me'
        });
      } else if (weather.temp > 85) {
        recs.push({
          type: 'weather',
          icon: '🌊',
          title: 'Water Activities',
          description: 'Cool off with water-based adventures',
          action: 'Find water activities',
          query: 'lakes beaches near me'
        });
      } else if (weather.temp < 45) {
        recs.push({
          type: 'weather',
          icon: '☕',
          title: 'Cozy Indoor Spots',
          description: 'Warm cafes and indoor attractions',
          action: 'Find cozy spots',
          query: 'cozy cafes near me'
        });
      } else {
        recs.push({
          type: 'weather',
          icon: '🥾',
          title: 'Perfect Hiking Weather',
          description: 'Great conditions for outdoor adventures',
          action: 'Find best hikes',
          query: 'best hikes near me'
        });
      }
    }

    // Interest-based recommendations
    if (prefs.interests?.includes('Food')) {
      recs.push({
        type: 'interest',
        icon: '🍽️',
        title: 'Foodie Adventures',
        description: 'Discover local culinary gems',
        action: 'Find food spots',
        query: 'best restaurants near me'
      });
    }

    if (prefs.interests?.includes('Nightlife')) {
      recs.push({
        type: 'interest',
        icon: '🎉',
        title: 'Nightlife Hotspots',
        description: 'Bars, clubs, and evening entertainment',
        action: 'Find nightlife',
        query: 'nightlife near me'
      });
    }

    if (prefs.interests?.includes('Museums')) {
      recs.push({
        type: 'interest',
        icon: '🏛️',
        title: 'Cultural Exploration',
        description: 'Museums and historical sites',
        action: 'Find museums',
        query: 'museums near me'
      });
    }

    setRecommendations(recs.slice(0, 4));
  };

  const getWeatherIcon = () => {
    if (!weather) return '🌤️';
    if (weather.code >= 95) return '⛈️';
    if (weather.code >= 80) return '🌧️';
    if (weather.code >= 45) return '🌫️';
    if (weather.code >= 0 && weather.code <= 2) return '☀️';
    if (weather.code === 3) return '☁️';
    return '🌤️';
  };

  const getWeatherAdvice = () => {
    if (!weather) return 'Check weather for outdoor activities';
    if (weather.code >= 95) return 'Severe weather - stay indoors';
    if (weather.code >= 80) return 'Rain expected - bring waterproof gear';
    if (weather.temp > 90) return 'Very hot - stay hydrated and seek shade';
    if (weather.temp < 32) return 'Freezing - dress warmly and watch for ice';
    return 'Great conditions for outdoor activities!';
  };

  return (
    <div className="space-y-6">
      {/* Greeting Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-white mb-2">
          {greeting}! 👋
        </h1>
        <p className="text-slate-400">
          Here's what's perfect for you right now
        </p>
      </motion.div>

      {/* Weather Card */}
      {weather && (
        <ModernGlassCard variant="default" className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{getWeatherIcon()}</div>
              <div>
                <p className="text-2xl font-bold text-white">{weather.temp}°F</p>
                <p className="text-slate-400 text-sm">{weather.condition || 'Clear'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-emerald-400 text-sm font-medium">{getWeatherAdvice()}</p>
              <p className="text-slate-400 text-xs mt-1">
                Feels like {weather.feelsLike}°F
              </p>
            </div>
          </div>
        </ModernGlassCard>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <ModernGlassCard variant="indigo" className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🥾</div>
            <div>
              <p className="text-2xl font-bold text-white">12</p>
              <p className="text-indigo-300 text-xs">Trails Nearby</p>
            </div>
          </div>
        </ModernGlassCard>

        <ModernGlassCard variant="emerald" className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⭐</div>
            <div>
              <p className="text-2xl font-bold text-white">4.8</p>
              <p className="text-emerald-300 text-xs">Avg Rating</p>
            </div>
          </div>
        </ModernGlassCard>
      </div>

      {/* Personalized Recommendations */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">For You</h2>
        <div className="space-y-3">
          <AnimatePresence>
            {recommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ModernGlassCard
                  variant="default"
                  className="p-4 cursor-pointer"
                  hover={true}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{rec.icon}</div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{rec.title}</p>
                      <p className="text-slate-400 text-sm">{rec.description}</p>
                    </div>
                    <div className="text-indigo-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </ModernGlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Activity Suggestions Based on Time */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Right Now</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ModernGlassCard
            variant="amber"
            className="p-4 cursor-pointer"
            hover={true}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">🥾</div>
              <p className="text-white font-medium">Quick Hikes</p>
              <p className="text-amber-300 text-xs">Under 2 hours</p>
            </div>
          </ModernGlassCard>

          <ModernGlassCard
            variant="rose"
            className="p-4 cursor-pointer"
            hover={true}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">🍽️</div>
              <p className="text-white font-medium">Food Nearby</p>
              <p className="text-rose-300 text-xs">Open now</p>
            </div>
          </ModernGlassCard>

          <ModernGlassCard
            variant="emerald"
            className="p-4 cursor-pointer"
            hover={true}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">🏞️</div>
              <p className="text-white font-medium">Parks</p>
              <p className="text-emerald-300 text-xs">Within 5 miles</p>
            </div>
          </ModernGlassCard>

          <ModernGlassCard
            variant="indigo"
            className="p-4 cursor-pointer"
            hover={true}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">☕</div>
              <p className="text-white font-medium">Coffee</p>
              <p className="text-indigo-300 text-xs">Highly rated</p>
            </div>
          </ModernGlassCard>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
        <ModernGlassCard variant="default" className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                🥾
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Completed Eagle Peak Trail</p>
                <p className="text-slate-400 text-xs">2 days ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                ⭐
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Reviewed Sunset Point</p>
                <p className="text-slate-400 text-xs">3 days ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                💾
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Saved 3 new trails</p>
                <p className="text-slate-400 text-xs">1 week ago</p>
              </div>
            </div>
          </div>
        </ModernGlassCard>
      </div>
    </div>
  );
}

// Time-based greeting component
export function TimeBasedGreeting() {
  const [greeting, setGreeting] = useState('');
  const [icon, setIcon] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good morning');
      setIcon('🌅');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good afternoon');
      setIcon('☀️');
    } else if (hour >= 17 && hour < 21) {
      setGreeting('Good evening');
      setIcon('🌤️');
    } else {
      setGreeting('Good night');
      setIcon('🌙');
    }
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="text-4xl">{icon}</span>
      <div>
        <p className="text-white font-bold text-xl">{greeting}!</p>
        <p className="text-slate-400 text-sm">Ready for your next adventure?</p>
      </div>
    </div>
  );
}

// Weather-based activity suggestion
export function WeatherActivitySuggestion({ weather }) {
  if (!weather) return null;

  const getSuggestion = () => {
    if (weather.code >= 95) {
      return {
        icon: '🏠',
        title: 'Stay Indoors',
        description: 'Severe weather - try indoor activities',
        action: 'Find indoor options',
        color: 'rose'
      };
    }
    if (weather.code >= 80) {
      return {
        icon: '☕',
        title: 'Cozy Cafes',
        description: 'Rainy day perfect for coffee shops',
        action: 'Find cafes',
        color: 'amber'
      };
    }
    if (weather.temp > 90) {
      return {
        icon: '🌊',
        title: 'Water Activities',
        description: 'Cool off with lakes or beaches',
        action: 'Find water spots',
        color: 'emerald'
      };
    }
    if (weather.temp < 32) {
      return {
        icon: '🏛️',
        title: 'Indoor Attractions',
        description: 'Museums and indoor activities',
        action: 'Find indoor spots',
        color: 'indigo'
      };
    }
    return {
      icon: '🥾',
      title: 'Perfect Hiking Weather',
      description: 'Great conditions for outdoor adventures',
      action: 'Find trails',
      color: 'emerald'
    };
  };

  const suggestion = getSuggestion();

  return (
    <ModernGlassCard variant={suggestion.color} className="p-4">
      <div className="flex items-center gap-4">
        <div className="text-4xl">{suggestion.icon}</div>
        <div className="flex-1">
          <p className="text-white font-semibold">{suggestion.title}</p>
          <p className="text-slate-300 text-sm">{suggestion.description}</p>
        </div>
        <button className="text-white text-sm font-medium opacity-80 hover:opacity-100 transition-opacity">
          {suggestion.action} →
        </button>
      </div>
    </ModernGlassCard>
  );
}
