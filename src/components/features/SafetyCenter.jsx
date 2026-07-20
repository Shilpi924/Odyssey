'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SafetyCenter({ userLocation, trailheadLocation, onClose }) {
  const [gpsData, setGpsData] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    lastUpdate: null,
  });
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [emergencyContact, setEmergencyContact] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [tripShared, setTripShared] = useState(false);

  useEffect(() => {
    // Get GPS data
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsData({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            lastUpdate: new Date(),
          });
        },
        (error) => {
          console.error('GPS error:', error);
        },
        { enableHighAccuracy: true }
      );
    }

    // Get battery level
    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        setBatteryLevel(battery.level * 100);
      });
    }

    // Monitor online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleEmergencyCall = () => {
    window.location.href = 'tel:911';
  };

  const handleShareTrip = () => {
    const tripInfo = {
      trailhead: trailheadLocation,
      currentLocation: gpsData,
      emergencyContact,
      expectedReturn,
      timestamp: new Date().toISOString(),
    };
    
    // In a real app, this would send to a server or share via native share
    if (navigator.share) {
      navigator.share({
        title: 'My Hike Trip Plan',
        text: `I'm hiking at ${trailheadLocation?.name || 'Unknown location'}. Expected return: ${expectedReturn || 'Not specified'}. Emergency contact: ${emergencyContact || 'Not specified'}`,
      });
    }
    setTripShared(true);
  };

  const getGpsSignalStrength = () => {
    if (!gpsData.accuracy) return 'Unknown';
    if (gpsData.accuracy < 10) return 'Strong';
    if (gpsData.accuracy < 20) return 'Moderate';
    return 'Weak';
  };

  const getGpsSignalColor = () => {
    const strength = getGpsSignalStrength();
    if (strength === 'Strong') return 'bg-emerald-400';
    if (strength === 'Moderate') return 'bg-amber-400';
    return 'bg-rose-400';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900">
      <div className="h-full overflow-y-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🛡️</span>
            Safety Center
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Emergency Call Button */}
        <button
          onClick={handleEmergencyCall}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-3 mb-6"
        >
          <span className="text-2xl">📞</span>
          Emergency Call (911)
        </button>

        {/* GPS Status */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 mb-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span>📍</span> Location Status
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400">GPS Signal</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`h-2 w-2 rounded-full ${getGpsSignalColor()}`} />
                <span className="text-white font-medium">{getGpsSignalStrength()}</span>
              </div>
            </div>
            <div>
              <p className="text-slate-400">Accuracy</p>
              <p className="text-white font-medium">
                {gpsData.accuracy ? `±${Math.round(gpsData.accuracy)}m` : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Latitude</p>
              <p className="text-white font-medium">
                {gpsData.latitude ? gpsData.latitude.toFixed(6) : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Longitude</p>
              <p className="text-white font-medium">
                {gpsData.longitude ? gpsData.longitude.toFixed(6) : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Last Update</p>
              <p className="text-white font-medium">
                {gpsData.lastUpdate 
                  ? `${Math.floor((new Date() - gpsData.lastUpdate) / 1000)}s ago`
                  : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Offline Status</p>
              <p className={`font-medium ${isOffline ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isOffline ? 'Offline' : 'Online'}
              </p>
            </div>
          </div>
        </div>

        {/* Battery Status */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 mb-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span>🔋</span> Device Status
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    batteryLevel > 50 ? 'bg-emerald-400' :
                    batteryLevel > 20 ? 'bg-amber-400' :
                    'bg-rose-400'
                  }`}
                  style={{ width: `${batteryLevel || 0}%` }}
                />
              </div>
            </div>
            <span className="text-white font-medium">
              {batteryLevel !== null ? `${Math.round(batteryLevel)}%` : 'Unknown'}
            </span>
          </div>
          {batteryLevel !== null && batteryLevel < 20 && (
            <p className="mt-2 text-xs text-rose-400">
              ⚠️ Low battery - consider ending hike soon
            </p>
          )}
        </div>

        {/* Trip Planning */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 mb-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span>📋</span> Trip Plan
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-sm">Emergency Contact</label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Name and phone number"
                className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm">Expected Return Time</label>
              <input
                type="datetime-local"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(e.target.value)}
                className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleShareTrip}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium text-sm transition-colors"
            >
              {tripShared ? '✓ Trip Shared' : 'Share Trip Plan'}
            </button>
          </div>
        </div>

        {/* Trailhead Navigation */}
        {trailheadLocation && (
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 mb-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>🧭</span> Return to Trailhead
            </h3>
            <p className="text-slate-400 text-sm mb-3">
              Use your downloaded map and saved trailhead marker to navigate back.
            </p>
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium text-sm transition-colors">
              Open Trailhead on Map
            </button>
          </div>
        )}

        {/* Safety Warning */}
        <div className="bg-amber-900/20 rounded-2xl p-4 border border-amber-500/30 mb-4">
          <h3 className="text-amber-300 font-semibold mb-2 flex items-center gap-2">
            <span>⚠️</span> Important Safety Notice
          </h3>
          <p className="text-amber-100/80 text-sm leading-relaxed">
            Conditions may have changed. Verify closures, weather, and official trail notices before starting. 
            If you are injured, in immediate danger, or cannot safely navigate, contact emergency services immediately.
            Do not rely solely on AI-generated directions for navigation.
          </p>
        </div>

        {/* Last Synced Position */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <span>💾</span> Last Synced Position
          </h3>
          <p className="text-slate-400 text-sm">
            {gpsData.lastUpdate 
              ? gpsData.lastUpdate.toLocaleString()
              : 'No position recorded'}
          </p>
        </div>
      </div>
    </div>
  );
}
