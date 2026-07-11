'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RouteRecorder({ trail, onRouteSave }) {
  const [isRecording, setIsRecording] = useState(false);
  const [routeData, setRouteData] = useState({
    points: [],
    distance: 0,
    elevation: [],
    startTime: null,
    duration: 0
  });
  const [watchId, setWatchId] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [watchId]);

  const startRecording = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsRecording(true);
    setRouteData({
      points: [],
      distance: 0,
      elevation: [],
      startTime: new Date(),
      duration: 0
    });

    // Start timer
    timerRef.current = setInterval(() => {
      setRouteData(prev => ({
        ...prev,
        duration: Math.floor((new Date() - prev.startTime) / 1000)
      }));
    }, 1000);

    // Start tracking location
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, altitude, accuracy } = position.coords;
        const timestamp = new Date();

        setRouteData(prev => {
          const newPoints = [...prev.points, { lat: latitude, lng: longitude, alt: altitude, timestamp }];
          const newDistance = calculateDistance(prev.points);
          const newElevation = altitude ? [...prev.elevation, altitude] : prev.elevation;

          return {
            ...prev,
            points: newPoints,
            distance: newDistance,
            elevation: newElevation
          };
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Error getting location. Please enable GPS.');
        stopRecording();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    setWatchId(id);
  };

  const stopRecording = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const calculateDistance = (points) => {
    if (points.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += haversineDistance(
        points[i - 1].lat,
        points[i - 1].lng,
        points[i].lat,
        points[i].lng
      );
    }
    return totalDistance;
  };

  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatDistance = (miles) => {
    if (miles < 1) {
      return `${(miles * 5280).toFixed(0)} ft`;
    }
    return `${miles.toFixed(2)} mi`;
  };

  const calculateElevationGain = () => {
    if (routeData.elevation.length < 2) return 0;
    let gain = 0;
    for (let i = 1; i < routeData.elevation.length; i++) {
      const diff = routeData.elevation[i] - routeData.elevation[i - 1];
      if (diff > 0) gain += diff;
    }
    return gain;
  };

  const saveRoute = () => {
    const routeToSave = {
      ...routeData,
      trailId: trail?.id,
      trailName: trail?.name,
      elevationGain: calculateElevationGain(),
      endTime: new Date()
    };

    onRouteSave?.(routeToSave);
    stopRecording();
  };

  const exportToGPX = () => {
    if (routeData.points.length === 0) return;

    const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Odyssey" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${trail?.name || 'Recorded Route'}</name>
    <trkseg>`;

    const gpxPoints = routeData.points
      .map(point => `      <trkpt lat="${point.lat}" lon="${point.lng}">${point.alt ? `<ele>${point.alt}</ele>` : ''}<time>${point.timestamp.toISOString()}</time></trkpt>`)
      .join('\n');

    const gpxFooter = `    </trkseg>
  </trk>
</gpx>`;

    const gpxContent = gpxHeader + '\n' + gpxPoints + '\n' + gpxFooter;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trail?.name || 'route'}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Route Recorder</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-slate-400 text-sm">
            {isRecording ? 'Recording' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{formatDistance(routeData.distance)}</p>
          <p className="text-xs text-slate-400">Distance</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{formatDuration(routeData.duration)}</p>
          <p className="text-xs text-slate-400">Duration</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{routeData.points.length}</p>
          <p className="text-xs text-slate-400">Points</p>
        </div>
      </div>

      {/* Elevation Gain */}
      {routeData.elevation.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-3 mb-4 text-center">
          <p className="text-lg font-bold text-white">{calculateElevationGain().toFixed(0)} ft</p>
          <p className="text-xs text-slate-400">Elevation Gain</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Start Recording
          </button>
        ) : (
          <>
            <button
              onClick={stopRecording}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              Stop
            </button>
            <button
              onClick={saveRoute}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save
            </button>
          </>
        )}
        {routeData.points.length > 0 && (
          <button
            onClick={exportToGPX}
            className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-xl font-medium transition-colors"
            title="Export GPX"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// GPX file importer
export function GPXImporter({ onGPXLoad }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.name.endsWith('.gpx')) {
      alert('Please upload a GPX file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const gpxContent = e.target.result;
        const parsedRoute = parseGPX(gpxContent);
        onGPXLoad?.(parsedRoute, file.name);
      } catch (error) {
        console.error('Error parsing GPX:', error);
        alert('Error parsing GPX file');
      }
    };
    reader.readAsText(file);
  };

  const parseGPX = (gpxContent) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');

    const trackPoints = xmlDoc.getElementsByTagName('trkpt');
    const points = [];

    for (let i = 0; i < trackPoints.length; i++) {
      const point = trackPoints[i];
      const lat = parseFloat(point.getAttribute('lat'));
      const lon = parseFloat(point.getAttribute('lon'));
      const ele = point.getElementsByTagName('ele')[0]?.textContent;
      const time = point.getElementsByTagName('time')[0]?.textContent;

      points.push({
        lat,
        lng: lon,
        elevation: ele ? parseFloat(ele) : null,
        time: time ? new Date(time) : null
      });
    }

    // Calculate stats
    let distance = 0;
    let elevationGain = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      // Distance
      const R = 3958.8;
      const dLat = ((curr.lat - prev.lat) * Math.PI) / 180;
      const dLon = ((curr.lng - prev.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((prev.lat * Math.PI) / 180) *
          Math.cos((curr.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance += R * c;

      // Elevation gain
      if (prev.elevation && curr.elevation) {
        const diff = curr.elevation - prev.elevation;
        if (diff > 0) elevationGain += diff;
      }
    }

    return {
      points,
      distance,
      elevationGain,
      pointCount: points.length
    };
  };

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
        dragActive
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx"
        onChange={handleFileInput}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-3">
        <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <div>
          <p className="text-white font-medium">Import GPX Route</p>
          <p className="text-slate-400 text-sm mt-1">
            Drag & drop or <button onClick={() => fileInputRef.current?.click()} className="text-indigo-400 hover:text-indigo-300">browse</button>
          </p>
        </div>
      </div>
    </div>
  );
}
