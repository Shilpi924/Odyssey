'use client';

import { motion } from 'framer-motion';

export default function TrailCardSkeleton() {
  return (
    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden p-5">
      {/* Image placeholder */}
      <div className="h-36 w-full bg-slate-700/50 rounded-xl mb-4 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Title placeholder */}
      <div className="h-5 w-3/4 bg-slate-700/50 rounded-lg mb-3">
        <motion.div
          className="h-full w-full bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50 rounded-lg"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mb-3">
        <div className="h-4 w-16 bg-slate-700/50 rounded-lg">
          <motion.div
            className="h-full w-full bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50 rounded-lg"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
              delay: 0.1,
            }}
          />
        </div>
        <div className="h-4 w-16 bg-slate-700/50 rounded-lg">
          <motion.div
            className="h-full w-full bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50 rounded-lg"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
              delay: 0.2,
            }}
          />
        </div>
        <div className="h-4 w-16 bg-slate-700/50 rounded-lg">
          <motion.div
            className="h-full w-full bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50 rounded-lg"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
              delay: 0.3,
            }}
          />
        </div>
      </div>

      {/* Feature tags */}
      <div className="flex gap-2">
        <div className="h-6 w-20 bg-slate-700/50 rounded-full">
          <motion.div
            className="h-full w-full bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50 rounded-full"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
              delay: 0.4,
            }}
          />
        </div>
        <div className="h-6 w-20 bg-slate-700/50 rounded-full">
          <motion.div
            className="h-full w-full bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50 rounded-full"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
              delay: 0.5,
            }}
          />
        </div>
      </div>
    </div>
  );
}
