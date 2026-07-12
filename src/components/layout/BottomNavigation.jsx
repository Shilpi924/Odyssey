'use client';

import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';

const navItems = [
  { id: 'home', label: 'Discover', icon: '🧭', href: '/' },
  { id: 'search', label: 'Map', icon: '🗺️', href: '/search?view=map#trail-map' },
  { id: 'track', label: 'Track', icon: '🥾', href: '/search?view=track#trail-map', isPrimary: true },
  { id: 'saved', label: 'Saved', icon: '💾', href: '/saved' },
  { id: 'personalize', label: 'Profile', icon: '👤', href: '/personalize' },
];

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedTab, setSelectedTab] = useState(null);
  const activeTab = selectedTab || (pathname === '/search' ? 'search' : navItems.find(item => pathname === item.href)?.id || 'home');

  const handleNav = (item) => {
    setSelectedTab(item.id);
    router.push(item.href);
  };

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
    >
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 px-6 py-3 pb-safe">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item)}
                className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 group"
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-indigo-500/20 rounded-xl"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Icon */}
                <span className={`text-2xl relative z-10 transition-transform duration-300 ${
                  isActive ? 'scale-110' : 'scale-100 group-hover:scale-110'
                }`}>
                  {item.icon}
                </span>

                {/* Label */}
                <span className={`text-xs font-medium relative z-10 transition-colors ${
                  isActive ? 'text-indigo-300' : 'text-slate-400 group-hover:text-slate-300'
                }`}>
                  {item.label}
                </span>

                {/* Active dot */}
                {isActive && (
                  <motion.div
                    layoutId="activeDot"
                    className="absolute -bottom-1 w-1 h-1 bg-indigo-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Safe area for iPhone X+ */}
      <div className="h-safe-area-bottom bg-slate-900" />
    </motion.div>
  );
}

// Floating action button version for quick actions
export function FloatingNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const quickActions = [
    { icon: '🔍', label: 'Search', href: '/search', color: 'bg-indigo-500' },
    { icon: '📍', label: 'Near Me', href: '/search?q=near me', color: 'bg-emerald-500' },
    { icon: '🥾', label: 'Hikes', href: '/search?q=hikes', color: 'bg-amber-500' },
    { icon: '🍔', label: 'Food', href: '/search?q=food', color: 'bg-rose-500' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      <div className="relative">
        {/* Expanded menu */}
        <motion.div
          initial={false}
          animate={{
            height: isOpen ? 'auto' : 0,
            opacity: isOpen ? 1 : 0,
          }}
          className="absolute bottom-16 right-0 overflow-hidden"
        >
          <div className="flex flex-col gap-2 mb-2">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: isOpen ? 1 : 0,
                  opacity: isOpen ? 1 : 0,
                }}
                transition={{
                  delay: isOpen ? index * 0.1 : 0,
                  type: 'spring',
                  stiffness: 200,
                }}
                onClick={() => router.push(action.href)}
                className={`${action.color} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 hover:scale-105 transition-transform`}
              >
                <span className="text-xl">{action.icon}</span>
                <span className="font-medium text-sm">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Main FAB */}
        <motion.button
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-2xl shadow-indigo-500/30 flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform"
        >
          {isOpen ? '✕' : '+'}
        </motion.button>
      </div>
    </div>
  );
}
