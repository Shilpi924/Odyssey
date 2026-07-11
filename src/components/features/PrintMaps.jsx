'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function PrintMaps({ trail, onPrint }) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [printFormat, setPrintFormat] = useState('standard');
  const [includeElevation, setIncludeElevation] = useState(true);
  const [includePOI, setIncludePOI] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false);

  const handlePrint = async () => {
    setIsPreparing(true);
    
    // Simulate print preparation
    setTimeout(() => {
      window.print();
      setIsPreparing(false);
      
      if (onPrint) {
        onPrint({
          format: printFormat,
          includeElevation,
          includePOI,
          includeNotes,
        });
      }
    }, 1500);
  };

  const handleDownloadPDF = async () => {
    setIsPreparing(true);
    
    // Simulate PDF generation
    setTimeout(() => {
      // In a real implementation, this would generate a PDF using jsPDF or similar
      const link = document.createElement('a');
      link.href = '#';
      link.download = `${trail.name.replace(/\s+/g, '_')}_map.pdf`;
      link.click();
      setIsPreparing(false);
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700 space-y-4"
    >
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span>🖨️</span> Print Maps
      </h3>

      <p className="text-xs text-slate-400">
        Download a printable map for offline backup and navigation.
      </p>

      {/* Print Format Selection */}
      <div>
        <label className="text-xs text-slate-400 mb-2 block">Format</label>
        <div className="grid grid-cols-3 gap-2">
          {['standard', 'compact', 'detailed'].map((format) => (
            <button
              key={format}
              onClick={() => setPrintFormat(format)}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all capitalize ${
                printFormat === format
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      {/* Print Options */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeElevation}
            onChange={(e) => setIncludeElevation(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-500"
          />
          <span className="text-xs text-slate-300">Include elevation profile</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includePOI}
            onChange={(e) => setIncludePOI(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-500"
          />
          <span className="text-xs text-slate-300">Include points of interest</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeNotes}
            onChange={(e) => setIncludeNotes(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-500"
          />
          <span className="text-xs text-slate-300">Include notes section</span>
        </label>
      </div>

      {/* Preview of what will be printed */}
      <div className="bg-white rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <span className="text-gray-800 font-bold text-sm">{trail.name}</span>
          <span className="text-gray-500 text-xs">{printFormat} format</span>
        </div>
        
        {includeElevation && (
          <div className="h-8 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-400 text-xs">Elevation Profile</span>
          </div>
        )}
        
        {includePOI && (
          <div className="flex gap-1">
            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-xs">💧</div>
            <div className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center text-xs">🏔️</div>
            <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center text-xs">🌲</div>
          </div>
        )}
        
        {includeNotes && (
          <div className="h-6 bg-gray-50 rounded border border-gray-200 flex items-center px-2">
            <span className="text-gray-400 text-xs">Notes: _______________</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handlePrint}
          disabled={isPreparing}
          className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium rounded-lg transition-all text-sm flex items-center justify-center gap-2"
        >
          {isPreparing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Preparing...
            </>
          ) : (
            <>
              🖨️ Print
            </>
          )}
        </button>
        
        <button
          onClick={handleDownloadPDF}
          disabled={isPreparing}
          className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white font-medium rounded-lg transition-all text-sm flex items-center justify-center gap-2"
        >
          📥 PDF
        </button>
      </div>

      {/* Print Tips */}
      <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
        <p className="text-xs text-slate-300">
          <span className="font-semibold text-indigo-300">💡 Tips:</span>
          Print in landscape for better map visibility. Use waterproof paper for outdoor use.
        </p>
      </div>
    </motion.div>
  );
}

// Print stylesheet component (to be included in head)
export function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        body * {
          visibility: hidden;
        }
        .printable-map, .printable-map * {
          visibility: visible;
        }
        .printable-map {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        @page {
          size: landscape;
          margin: 0.5cm;
        }
      }
    `}</style>
  );
}
