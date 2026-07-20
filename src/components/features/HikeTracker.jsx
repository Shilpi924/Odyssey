'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function HikeTracker({ trail, onClose }) {
  const [trackingState, setTrackingState] = useState('idle'); // idle, tracking, paused
  const [stats, setStats] = useState({
    distance: 0,
    movingTime: 0,
    totalElapsed: 0,
    currentElevation: 0,
    elevationGain: 0,
    averagePace: 0,
    currentSpeed: 0,
    gpsAccuracy: null,
    batteryLevel: null,
  });
  const [showExitWarning, setShowExitWarning] = useState(false);

  useEffect(() => {
    let interval;
    let watchId;

    if (trackingState === 'tracking') {
      // Update elapsed time
      interval = setInterval(() => {
        setStats(prev => ({
          ...prev,
          totalElapsed: prev.totalElapsed + 1,
        }));
      }, 1000);

      // Watch GPS position
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setStats(prev => ({
              ...prev,
              gpsAccuracy: position.coords.accuracy,
              currentElevation: position.coords.altitude || prev.currentElevation,
              currentSpeed: position.coords.speed || 0,
            }));
          },
          (error) => {
            console.error('GPS error:', error);
          },
          { enableHighAccuracy: true }
        );
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [trackingState]);

  const handleStart = () => {
    setTrackingState('tracking');
  };

  const handlePause = () => {
    setTrackingState('paused');
  };

  const handleResume = () => {
    setTrackingState('tracking');
  };

  const handleFinish = () => {
    setTrackingState('idle');
    // In a real app, save the hike data
  };

  const handleDiscard = () => {
    setTrackingState('idle');
    setStats({
      distance: 0,
      movingTime: 0,
      totalElapsed: 0,
      currentElevation: 0,
      elevationGain: 0,
      averagePace: 0,
      currentSpeed: 0,
      gpsAccuracy: null,
      batteryLevel: null,
    });
  };

  const handleExit = () => {
    if (trackingState === 'tracking' || trackingState === 'paused') {
      setShowExitWarning(true);
    } else {
      onClose();
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getGpsSignalStatus = () => {
    if (!stats.gpsAccuracy) return 'Unknown';
    if (stats.gpsAccuracy < 10) return 'Strong';
    if (stats.gpsAccuracy < 20) return 'Moderate';
    return 'Weak';
  };

  const getGpsSignalColor = () => {
    const status = getGpsSignalStatus();
    if (status === 'Strong') return 'text-emerald-400';
    if (status === 'Moderate') return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900">
      {/* Exit Warning Modal */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-2">Hike in Progress</h3>
            <p className="text-slate-300 text-sm mb-4">
              A hike is currently being recorded. Are you sure you want to leave?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitWarning(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Keep Recording
              </button>
              <button
                onClick={() => {
                  setShowExitWarning(false);
                  onClose();
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
              >
                Leave Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🥾</span>
            {trail?.name || 'Hike Tracker'}
          </h2>
          <button
            onClick={handleExit}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Stats Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Distance" value={`${stats.distance.toFixed(2)} mi`} icon="📍" />
            <StatCard label="Moving Time" value={formatTime(stats.movingTime)} icon="⏱️" />
            <StatCard label="Total Time" value={formatTime(stats.totalElapsed)} icon="🕐" />
            <StatCard label="Elevation" value={`${Math.round(stats.currentElevation)} ft`} icon="⛰️" />
            <StatCard label="Elevation Gain" value={`${Math.round(stats.elevationGain)} ft`} icon="↗️" />
            <StatCard label="Avg Pace" value={`${stats.averagePace.toFixed(1)} min/mi`} icon="🏃" />
            <StatCard label="Current Speed" value={`${stats.currentSpeed.toFixed(1)} mph`} icon="💨" />
            <StatCard label="GPS Accuracy" value={`±${stats.gpsAccuracy ? Math.round(stats.gpsAccuracy) : '--'}m`} icon="📡" color={getGpsSignalColor()} />
          </div>

          {/* GPS Status */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">GPS Signal</p>
                <p className={`font-medium ${getGpsSignalColor()}`}>
                  {getGpsSignalStatus()}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Tracking Status</p>
                <p className={`font-medium ${
                  trackingState === 'tracking' ? 'text-emerald-400' :
                  trackingState === 'paused' ? 'text-amber-400' :
                  'text-slate-400'
                }`}>
                  {trackingState === 'tracking' ? 'Moving' :
                   trackingState === 'paused' ? 'Paused' :
                   'Idle'}
                </p>
              </div>
            </div>
            {stats.gpsAccuracy > 20 && trackingState === 'tracking' && (
              <p className="mt-2 text-xs text-amber-400">
                ⚠️ Weak GPS signal. Distance tracking is temporarily paused to prevent inaccurate mileage.
              </p>
            )}
          </div>

          {/* Battery Status */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">Battery Level</p>
              <p className="font-medium text-white">
                {stats.batteryLevel !== null ? `${Math.round(stats.batteryLevel)}%` : 'Unknown'}
              </p>
            </div>
            <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  stats.batteryLevel > 50 ? 'bg-emerald-400' :
                  stats.batteryLevel > 20 ? 'bg-amber-400' :
                  'bg-rose-400'
                }`}
                style={{ width: `${stats.batteryLevel || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tracking Controls */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          {trackingState === 'idle' && (
            <button
              onClick={handleStart}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all"
            >
              🚀 Start Hike
            </button>
          )}

          {trackingState === 'tracking' && (
            <div className="flex gap-3">
              <button
                onClick={handlePause}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl font-bold text-lg transition-all"
              >
                ⏸️ Pause
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg transition-all"
              >
                ✅ Finish
              </button>
            </div>
          )}

          {trackingState === 'paused' && (
            <div className="space-y-3">
              <button
                onClick={handleResume}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg transition-all"
              >
                ▶️ Resume
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleFinish}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all"
                >
                  ✅ Finish
                </button>
                <button
                  onClick={handleDiscard}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-all"
                >
                  🗑️ Discard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = 'text-white' }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <p className="text-slate-400 text-xs">{label}</p>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
