'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function ARNavigation({ trail, userLocation, onClose }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [compassHeading, setCompassHeading] = useState(0);
  const [waypoints, setWaypoints] = useState([]);
  const [currentWaypoint, setCurrentWaypoint] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (cameraActive) {
      startCamera();
      startCompass();
      generateWaypoints();
    } else {
      stopCamera();
      stopCompass();
    }

    return () => {
      stopCamera();
      stopCompass();
    };
  }, [cameraActive, trail]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Camera access required for AR navigation');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startCompass = () => {
    if ('DeviceOrientationEvent' in window) {
      const handleOrientation = (event) => {
        if (event.alpha !== null) {
          setCompassHeading(event.alpha);
        }
      };
      window.addEventListener('deviceorientation', handleOrientation);
      return () => window.removeEventListener('deviceorientation', handleOrientation);
    }
  };

  const stopCompass = () => {
    // Event listener cleanup handled in startCompass
  };

  const generateWaypoints = () => {
    if (!trail || !trail.route) return;
    
    // Generate waypoints from trail route
    const route = trail.route;
    const coords = route.geometry?.coordinates || [];
    
    if (coords.length > 0) {
      const points = coords
        .filter((_, i) => i % 5 === 0) // Every 5th point
        .map((coord, i) => ({
          lat: coord[1],
          lng: coord[0],
          name: `Waypoint ${i + 1}`,
          distance: calculateDistance(userLocation?.lat, userLocation?.lng, coord[1], coord[0])
        }))
        .sort((a, b) => a.distance - b.distance);
      
      setWaypoints(points);
      setCurrentWaypoint(points[0]);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 3958.8; // miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x = Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
              Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
    const bearing = Math.atan2(y, x);
    return ((bearing * 180 / Math.PI) + 360) % 360;
  };

  const getDirectionToWaypoint = () => {
    if (!currentWaypoint || !userLocation) return null;
    return calculateBearing(
      userLocation.lat,
      userLocation.lng,
      currentWaypoint.lat,
      currentWaypoint.lng
    );
  };

  const getRelativeDirection = () => {
    const targetBearing = getDirectionToWaypoint();
    if (targetBearing === null) return null;
    return (targetBearing - compassHeading + 360) % 360;
  };

  if (!cameraActive) {
    return (
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-white font-bold text-lg mb-2">📱 AR Navigation</h3>
        <p className="text-slate-400 text-sm mb-4">
          Use your camera to see navigation overlays on the trail
        </p>
        <button
          onClick={() => setCameraActive(true)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors"
        >
          Start AR Navigation
        </button>
      </div>
    );
  }

  const relativeDirection = getRelativeDirection();
  const distanceToWaypoint = currentWaypoint?.distance || 0;

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Camera View */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* AR Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Direction Arrow */}
        {relativeDirection !== null && (
          <motion.div
            animate={{
              rotate: relativeDirection - 90
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="w-24 h-24 bg-indigo-500/80 rounded-full flex items-center justify-center border-4 border-white shadow-2xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
          </motion.div>
        )}

        {/* Distance Info */}
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
          <p className="text-white text-center">
            <span className="text-2xl font-bold">{distanceToWaypoint.toFixed(1)}</span>
            <span className="text-sm ml-1">mi to {currentWaypoint?.name || 'waypoint'}</span>
          </p>
        </div>

        {/* Trail Info */}
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
          <p className="text-white font-semibold">{trail?.name}</p>
          <p className="text-slate-300 text-xs">{trail?.difficulty} · {trail?.length}</p>
        </div>

        {/* Compass */}
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md w-16 h-16 rounded-full border border-white/20 flex items-center justify-center">
          <motion.div
            animate={{ rotate: -compassHeading }}
            className="text-2xl"
          >
            🧭
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex gap-3">
        <button
          onClick={() => setCameraActive(false)}
          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-medium transition-colors"
        >
          Exit AR
        </button>
        <button
          onClick={() => {
            // Switch to next waypoint
            const currentIndex = waypoints.findIndex(w => w === currentWaypoint);
            if (currentIndex < waypoints.length - 1) {
              setCurrentWaypoint(waypoints[currentIndex + 1]);
            }
          }}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors"
        >
          Next Waypoint
        </button>
      </div>
    </div>
  );
}
