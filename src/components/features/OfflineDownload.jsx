'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function OfflineDownload({ trail, onDownload, onClose }) {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const downloadDetails = {
    mapArea: '8-mile radius',
    downloadSize: '34 MB',
    lastUpdated: new Date().toLocaleDateString(),
    includes: [
      'Base map area',
      'Trail geometry',
      'Trail details',
      'Trailhead location',
      'AI conversation summary',
      'Emergency contacts',
      'Nearby landmarks',
    ],
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // In a real app, this would trigger the actual download
    setTimeout(() => {
      onDownload?.();
    }, 2000);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    // Simulate verification
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsVerifying(false);
    alert('✅ Offline map verified successfully!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900">
      <div className="h-full overflow-y-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">💾</span>
            Offline Map Download
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Trail Info */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 mb-4">
          <h3 className="text-white font-semibold mb-2">{trail?.name || 'Trail'}</h3>
          <p className="text-slate-400 text-sm">{trail?.vicinity || 'Location unknown'}</p>
        </div>

        {/* Download Details */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 mb-4">
          <h3 className="text-white font-semibold mb-3">Download Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <p className="text-slate-400">Offline Area</p>
              <p className="text-white font-medium">{downloadDetails.mapArea}</p>
            </div>
            <div>
              <p className="text-slate-400">Download Size</p>
              <p className="text-white font-medium">{downloadDetails.downloadSize}</p>
            </div>
            <div>
              <p className="text-slate-400">Last Updated</p>
              <p className="text-white font-medium">{downloadDetails.lastUpdated}</p>
            </div>
            <div>
              <p className="text-slate-400">Map Boundary</p>
              <p className="text-white font-medium">8-mile radius</p>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-3">
            <p className="text-slate-400 text-sm mb-2">Includes:</p>
            <ul className="space-y-1">
              {downloadDetails.includes.map((item, index) => (
                <li key={index} className="text-xs text-slate-300 flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Download Progress */}
        {isDownloading && (
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">Downloading...</span>
              <span className="text-emerald-400 font-bold">{downloadProgress}%</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${downloadProgress}%` }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Download Button */}
        {!isDownloading && downloadProgress === 0 && (
          <button
            onClick={handleDownload}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all mb-4"
          >
            📥 Download Offline Map
          </button>
        )}

        {/* Downloaded State */}
        {downloadProgress === 100 && !isDownloading && (
          <div className="bg-emerald-900/20 rounded-2xl p-4 border border-emerald-500/30 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">✅</span>
              <span className="text-emerald-300 font-semibold">Download Complete</span>
            </div>
            <p className="text-emerald-100/80 text-sm">
              This trail is now available offline. You can access it without an internet connection.
            </p>
          </div>
        )}

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={isVerifying || downloadProgress < 100}
          className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3 rounded-xl font-medium transition-colors mb-4 flex items-center justify-center gap-2"
        >
          {isVerifying ? '⏳ Verifying...' : '🔍 Verify Offline Map'}
        </button>

        {/* Important Notice */}
        <div className="bg-amber-900/20 rounded-2xl p-4 border border-amber-500/30">
          <h3 className="text-amber-300 font-semibold mb-2 flex items-center gap-2">
            <span>ℹ️</span> Important
          </h3>
          <p className="text-amber-100/80 text-sm leading-relaxed">
            This is an offline-ready saved trail, not a complete offline mode. Some features may still require connectivity. 
            Verify your download before heading into areas with limited service.
          </p>
        </div>
      </div>
    </div>
  );
}
