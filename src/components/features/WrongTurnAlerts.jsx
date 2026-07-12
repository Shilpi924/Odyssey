'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function WrongTurnAlerts({ trail, userLocation, isActive, onDismiss }) {
  const [offRoute, setOffRoute] = useState(false);
  const [distanceFromRoute, setDistanceFromRoute] = useState(0);
  const [alertShown, setAlertShown] = useState(false);

  useEffect(() => {
    if (!isActive || !userLocation || !trail) return;

    // Simulate distance calculation from route
    const checkRouteDeviation = () => {
      // In a real implementation, this would calculate actual distance from the trail path
      // For simulation, we'll use random deviation
      const deviation = Math.random() * 200; // 0-200 meters
      setDistanceFromRoute(deviation);
      
      // Alert if more than 50 meters off route
      if (deviation > 50 && !alertShown) {
        setOffRoute(true);
        setAlertShown(true);
      } else if (deviation <= 50) {
        setOffRoute(false);
        setAlertShown(false);
      }
    };

    const interval = setInterval(checkRouteDeviation, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [isActive, userLocation, trail, alertShown]);

  const handleDismiss = () => {
    setOffRoute(false);
    setAlertShown(false);
    if (onDismiss) onDismiss();
  };

  const handleGetBackOnRoute = () => {
    // In a real implementation, this would provide navigation back to the trail
    setOffRoute(false);
    setAlertShown(false);
  };

  if (!isActive || !offRoute) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto"
    >
      <div className="bg-rose-900/90 backdrop-blur-md rounded-xl p-4 border-2 border-rose-500/50 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center animate-pulse">
              <span className="text-xl">⚠️</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-bold text-sm mb-1">You&apos;re Off Route!</h4>
            <p className="text-rose-200 text-xs mb-2">
              You&apos;re approximately {Math.round(distanceFromRoute)} meters away from the trail.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleGetBackOnRoute}
                className="flex-1 py-2 bg-white text-rose-900 font-bold text-xs rounded-lg hover:bg-rose-100 transition-colors"
              >
                Get Back on Route
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 bg-rose-800 text-white font-medium text-xs rounded-lg hover:bg-rose-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Navigation guidance component
export function NavigationGuidance({ trail, currentStep, totalSteps }) {
  const guidanceSteps = [
    { instruction: 'Start at trailhead', icon: '🚗', distance: '0 mi' },
    { instruction: 'Follow the main path', icon: '➡️', distance: '0.5 mi' },
    { instruction: 'Turn left at the fork', icon: '↩️', distance: '1.2 mi' },
    { instruction: 'Continue straight', icon: '⬆️', distance: '2.0 mi' },
    { instruction: 'Ascend to viewpoint', icon: '🏔️', distance: '2.8 mi' },
    { instruction: 'Return via same path', icon: '🔄', distance: '5.6 mi' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700 space-y-3"
    >
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span>🧭</span> Navigation Guidance
      </h3>

      <div className="space-y-2">
        {guidanceSteps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
              index === currentStep
                ? 'bg-indigo-500/20 border border-indigo-500/30'
                : index < currentStep
                ? 'bg-emerald-500/10 border border-emerald-500/20 opacity-60'
                : 'bg-slate-700/30'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              index === currentStep
                ? 'bg-indigo-500 text-white'
                : index < currentStep
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-600 text-slate-400'
            }`}>
              {index < currentStep ? '✓' : step.icon}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${
                index === currentStep ? 'text-white font-medium' : 'text-slate-300'
              }`}>
                {step.instruction}
              </p>
            </div>
            <span className="text-xs text-slate-400">{step.distance}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Progress</span>
          <span>{currentStep + 1} of {totalSteps}</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}
