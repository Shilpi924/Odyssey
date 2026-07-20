'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const MESSAGES = [
  "Lacing up hiking boots...",
  "Consulting the map...",
  "Discovering hidden paths...",
  "Packing some trail mix...",
  "Finding the best viewpoints...",
  "Checking the weather..."
];

export default function CreativeLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-bg)]/80 backdrop-blur-md px-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="flex flex-col items-center justify-center w-full max-w-sm p-8 bg-gradient-to-b from-[var(--app-surface)] to-[var(--app-bg)] rounded-3xl shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)] border border-[var(--app-border)] relative overflow-hidden"
      >
        {/* Decorative background blobs */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl translate-x-1/2 translate-y-1/2" />

        <div className="relative w-28 h-28 mb-8">
          {/* Outer rotating dashed ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-dashed border-emerald-500/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Inner pulsing ring */}
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-emerald-500/50"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Center icon bouncing */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center text-5xl"
            animate={{ 
              y: [0, -12, 0],
              rotate: [-5, 5, -5]
            }}
            transition={{
              y: { duration: 0.6, repeat: Infinity, ease: "easeOut", repeatType: "reverse" },
              rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            🧭
          </motion.div>
        </div>
        
        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 mb-2">
          Scouting Trails
        </h3>
        
        <div className="h-6 w-full relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-medium text-[var(--app-muted)] absolute inset-x-0 text-center"
            >
              {MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
