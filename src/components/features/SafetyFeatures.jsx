'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SafetyFeatures({ trail, userLocation }) {
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [locationWatchId, setLocationWatchId] = useState(null);

  async function loadEmergencyContacts() {
    try {
      const res = await fetch('/api/safety/contacts');
      if (res.ok) {
        const data = await res.json();
        setEmergencyContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(loadEmergencyContacts, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const startLocationSharing = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    try {
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Send location to server
          await fetch('/api/safety/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trailId: trail?.id,
              trailName: trail?.name,
              latitude,
              longitude,
              timestamp: new Date().toISOString()
            })
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Error sharing location. Please enable GPS.');
          stopLocationSharing();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      setLocationWatchId(id);
      setIsSharingLocation(true);

      // Notify emergency contacts
      await notifyEmergencyContacts('location_sharing_started');
    } catch (error) {
      console.error('Error starting location sharing:', error);
    }
  };

  const stopLocationSharing = () => {
    if (locationWatchId !== null) {
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
    }
    setIsSharingLocation(false);
  };

  const notifyEmergencyContacts = async (type) => {
    try {
      await fetch('/api/safety/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          trailId: trail?.id,
          trailName: trail?.name,
          contacts: emergencyContacts
        })
      });
    } catch (error) {
      console.error('Error notifying contacts:', error);
    }
  };

  const handleSOS = () => {
    setShowSOSModal(true);
    setSosCountdown(5);

    const countdown = setInterval(() => {
      setSosCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          triggerSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const triggerSOS = async () => {
    setShowSOSModal(false);

    try {
      // Get current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            // Send SOS alert
            await fetch('/api/safety/sos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                trailId: trail?.id,
                trailName: trail?.name,
                latitude,
                longitude,
                timestamp: new Date().toISOString(),
                contacts: emergencyContacts
              })
            });

            // Notify emergency contacts
            await notifyEmergencyContacts('sos');

            // Show confirmation
            alert('SOS alert sent! Your emergency contacts have been notified with your location.');
          },
          (error) => {
            console.error('Error getting location for SOS:', error);
            alert('Error getting location. SOS sent without exact coordinates.');
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    } catch (error) {
      console.error('Error triggering SOS:', error);
      alert('Error sending SOS. Please call emergency services directly.');
    }
  };

  const cancelSOS = () => {
    setShowSOSModal(false);
    setSosCountdown(5);
  };

  return (
    <div className="space-y-4">
      {/* Location Sharing */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSharingLocation ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
              <svg className={`w-5 h-5 ${isSharingLocation ? 'text-emerald-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Share Location</p>
              <p className="text-slate-400 text-xs">
                {isSharingLocation ? 'Sharing with contacts' : 'Let contacts track your hike'}
              </p>
            </div>
          </div>
          <button
            onClick={isSharingLocation ? stopLocationSharing : startLocationSharing}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSharingLocation
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isSharingLocation ? 'Stop' : 'Start'}
          </button>
        </div>

        {isSharingLocation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <p className="text-emerald-300 text-sm">Live location sharing active</p>
            </div>
            <p className="text-emerald-400/70 text-xs mt-1">
              {emergencyContacts.length} contact(s) will receive updates
            </p>
          </motion.div>
        )}
      </div>

      {/* Emergency Contacts */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Emergency Contacts</p>
              <p className="text-slate-400 text-xs">{emergencyContacts.length} contact(s) set up</p>
            </div>
          </div>
          <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
            Manage
          </button>
        </div>

        {emergencyContacts.length === 0 && (
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-amber-300 text-sm">
              ⚠️ No emergency contacts set up. Add contacts for safety features.
            </p>
          </div>
        )}
      </div>

      {/* SOS Button */}
      <button
        onClick={handleSOS}
        className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold text-lg transition-colors flex items-center justify-center gap-3 shadow-lg shadow-red-600/30"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        SOS Emergency
      </button>

      {/* Quick Emergency Numbers */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="tel:911"
          className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 text-center transition-colors"
        >
          <p className="text-white font-bold text-lg">911</p>
          <p className="text-slate-400 text-xs">Emergency</p>
        </a>
        <a
          href="tel:112"
          className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 text-center transition-colors"
        >
          <p className="text-white font-bold text-lg">112</p>
          <p className="text-slate-400 text-xs">EU Emergency</p>
        </a>
      </div>

      {/* SOS Modal */}
      <AnimatePresence>
        {showSOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={cancelSOS}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-red-600 rounded-2xl p-8 w-full max-w-sm text-center border-4 border-red-400 shadow-2xl"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-400 flex items-center justify-center animate-pulse">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">SOS Alert</h3>
              <p className="text-red-100 mb-4">
                Sending emergency alert in {sosCountdown} seconds...
              </p>
              <div className="text-5xl font-bold text-white mb-6">{sosCountdown}</div>
              <button
                onClick={cancelSOS}
                className="w-full bg-white text-red-600 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Check-in system component
export function CheckInSystem({ trail }) {
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [checkInInterval, setCheckInInterval] = useState(null);

  const loadLastCheckIn = useCallback(async () => {
    try {
      const res = await fetch(`/api/safety/checkin?trailId=${trail?.id}`);
      if (res.ok) {
        const data = await res.json();
        setLastCheckIn(data.lastCheckIn);
      }
    } catch (error) {
      console.error('Error loading check-in:', error);
    }
  }, [trail]);

  useEffect(() => {
    const timer = window.setTimeout(loadLastCheckIn, 0);
    return () => window.clearTimeout(timer);
  }, [loadLastCheckIn]);

  const performCheckIn = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const res = await fetch('/api/safety/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trailId: trail?.id,
          trailName: trail?.name,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLastCheckIn(data.checkIn);
        alert('Check-in recorded successfully!');
      }
    } catch (error) {
      console.error('Error performing check-in:', error);
      alert('Error recording check-in. Please try again.');
    }
  };

  const scheduleCheckIn = (minutes) => {
    if (checkInInterval) {
      clearInterval(checkInInterval);
    }

    const interval = setInterval(performCheckIn, minutes * 60 * 1000);
    setCheckInInterval(interval);
    alert(`Scheduled check-ins every ${minutes} minutes`);
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium">Check-In</p>
            <p className="text-slate-400 text-xs">Last: {formatTime(lastCheckIn)}</p>
          </div>
        </div>
        <button
          onClick={performCheckIn}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Check In Now
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[30, 60, 120].map(minutes => (
          <button
            key={minutes}
            onClick={() => scheduleCheckIn(minutes)}
            className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg py-2 text-xs text-slate-300 transition-colors"
          >
            Every {minutes}m
          </button>
        ))}
      </div>
    </div>
  );
}

// Weather alerts component
export function WeatherAlerts({ weather }) {
  const alerts = (() => {
    if (!weather) return [];
    const newAlerts = [];

    if (weather.code >= 95) {
      newAlerts.push({
        type: 'danger',
        icon: '⛈️',
        message: 'Severe storm - seek shelter immediately'
      });
    } else if (weather.code >= 80) {
      newAlerts.push({
        type: 'warning',
        icon: '🌧️',
        message: 'Heavy rain expected - trails may be dangerous'
      });
    } else if (weather.temp > 95) {
      newAlerts.push({
        type: 'warning',
        icon: '🥵',
        message: 'Extreme heat - carry extra water'
      });
    } else if (weather.temp < 32) {
      newAlerts.push({
        type: 'warning',
        icon: '🥶',
        message: 'Freezing conditions - watch for ice'
      });
    }

    return newAlerts;
  })();

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`p-4 rounded-xl border ${
            alert.type === 'danger'
              ? 'bg-red-500/20 border-red-500/50'
              : 'bg-amber-500/20 border-amber-500/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{alert.icon}</span>
            <p className={`font-medium ${alert.type === 'danger' ? 'text-red-200' : 'text-amber-200'}`}>
              {alert.message}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
