'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function OutdoorLens({ onIdentify }) {
  const [isActive, setIsActive] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedItem, setIdentifiedItem] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Camera access is required for plant identification. Please enable camera permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  };

  const captureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsIdentifying(true);
    
    // Capture image
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageData);
    stopCamera();

    // Simulate AI identification
    setTimeout(() => {
      const mockIdentifications = [
        {
          name: 'Douglas Fir',
          scientificName: 'Pseudotsuga menziesii',
          confidence: 0.92,
          description: 'A large evergreen conifer native to western North America. Can grow over 250 feet tall.',
          emoji: '🌲',
          category: 'Tree',
          facts: ['Lives 500+ years', 'Important timber species', 'Provides habitat for wildlife']
        },
        {
          name: 'Western Red Cedar',
          scientificName: 'Thuja plicata',
          confidence: 0.88,
          description: 'A large evergreen tree native to the Pacific Northwest. Known for its aromatic wood.',
          emoji: '🌳',
          category: 'Tree',
          facts: ['Sacred to indigenous peoples', 'Used for canoes', 'Natural insect repellent']
        },
        {
          name: 'Salmonberry',
          scientificName: 'Rubus spectabilis',
          confidence: 0.85,
          description: 'A shrub native to the west coast of North America. Produces edible orange-red berries.',
          emoji: '🫐',
          category: 'Plant',
          facts: ['Edible berries', 'Important food source', 'Attracts wildlife']
        },
        {
          name: 'Banana Slug',
          scientificName: 'Ariolimax columbianus',
          confidence: 0.90,
          description: 'A large yellow slug found in the Pacific Northwest. Can grow up to 10 inches long.',
          emoji: '🐌',
          category: 'Wildlife',
          facts: ['Second largest slug species', 'Decomposer', 'Indicator of forest health']
        }
      ];

      const randomItem = mockIdentifications[Math.floor(Math.random() * mockIdentifications.length)];
      setIdentifiedItem(randomItem);
      setIsIdentifying(false);

      if (onIdentify) {
        onIdentify(randomItem);
      }
    }, 2000);
  };

  const handleRetake = () => {
    setIdentifiedItem(null);
    setCapturedImage(null);
    startCamera();
  };

  const handleSaveToLogbook = () => {
    if (identifiedItem) {
      const logbook = JSON.parse(localStorage.getItem('natureLogbook') || '[]');
      const newEntry = {
        ...identifiedItem,
        timestamp: new Date().toISOString(),
        image: capturedImage
      };
      logbook.push(newEntry);
      localStorage.setItem('natureLogbook', JSON.stringify(logbook));
      alert('Saved to your nature logbook!');
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isActive && !identifiedItem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700 space-y-4"
      >
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <span>🔍</span> Outdoor Lens
        </h3>
        
        <p className="text-xs text-slate-400">
          Point your camera at plants, trees, or wildlife to identify them instantly.
        </p>

        <button
          onClick={startCamera}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-lg transition-all text-sm flex items-center justify-center gap-2"
        >
          <span>📷</span>
          Start Camera
        </button>

        {/* Recent identifications */}
        {(() => {
          const logbook = JSON.parse(localStorage.getItem('natureLogbook') || '[]');
          const recent = logbook.slice(-3).reverse();
          if (recent.length === 0) return null;
          
          return (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Recent discoveries:</p>
              {recent.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-slate-700/30 rounded-lg">
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{item.name}</p>
                    <p className="text-slate-400 text-xs">{item.category}</p>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </motion.div>
    );
  }

  if (isActive) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <span>📷</span> Outdoor Lens
          </h3>
          <button
            onClick={stopCamera}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Camera overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 border-2 border-white/50 rounded-lg" />
          </div>
          
          {/* Instructions */}
          <div className="absolute bottom-2 left-2 right-2 text-center">
            <p className="text-white text-xs bg-black/50 px-3 py-1 rounded-full">
              Point at a plant or tree
            </p>
          </div>
        </div>

        <button
          onClick={captureAndIdentify}
          disabled={isIdentifying}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium rounded-lg transition-all text-sm flex items-center justify-center gap-2"
        >
          {isIdentifying ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Identifying...
            </>
          ) : (
            <>
              🔍 Identify
            </>
          )}
        </button>
      </motion.div>
    );
  }

  if (identifiedItem) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <span>🔍</span> Identification Result
          </h3>
          <button
            onClick={() => setIdentifiedItem(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {capturedImage && (
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="bg-slate-700/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{identifiedItem.emoji}</span>
            <div>
              <h4 className="text-white font-bold">{identifiedItem.name}</h4>
              <p className="text-slate-400 text-xs italic">{identifiedItem.scientificName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Confidence:</span>
            <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${identifiedItem.confidence * 100}%` }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
            <span className="text-xs text-emerald-400">{Math.round(identifiedItem.confidence * 100)}%</span>
          </div>

          <p className="text-slate-300 text-sm">{identifiedItem.description}</p>

          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium">Fun Facts:</p>
            {identifiedItem.facts.map((fact, index) => (
              <p key={index} className="text-xs text-slate-300 flex items-start gap-2">
                <span>•</span>
                <span>{fact}</span>
              </p>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRetake}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
          >
            🔄 Retake
          </button>
          <button
            onClick={handleSaveToLogbook}
            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors"
          >
            💾 Save to Logbook
          </button>
        </div>
      </motion.div>
    );
  }
}
