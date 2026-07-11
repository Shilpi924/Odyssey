'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ActionCard from './ActionCard';

export default function DynamicActionCards() {
  const router = useRouter();
  const [cards, setCards] = useState([]);
  const [zipInput, setZipInput] = useState('');
  const [showZipInput, setShowZipInput] = useState(false);

  useEffect(() => {
    // 1. Core Guaranteed Cards (Order is fixed)
    const baseCards = [
      { title: "Hikes near me", icon: "🥾", description: "Find the best trails and nature walks.", href: "/search?q=hikes", label: "Hikes" },
      { title: "Food I like", icon: "🍔", description: "Discover restaurants based on your taste.", href: "/search?q=food", label: "Food" },
      { title: "Kid-friendly", icon: "👨‍👩‍👧‍👦", description: "Activities perfect for you and your kids.", href: "/search?q=kids", label: "Kids" }
    ];

    const personalized = [];
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        if (prefs.interests?.includes('Nightlife')) personalized.push({ title: "Nightlife", icon: "🌙", description: "Find the best bars and clubs.", href: "/search?q=nightlife", label: "Nightlife" });
        if (prefs.interests?.includes('Museums')) personalized.push({ title: "Museums", icon: "🏛️", description: "Explore local museums and history.", href: "/search?q=museums", label: "Museums" });
        if (prefs.interests?.includes('Shopping')) personalized.push({ title: "Shopping", icon: "🛍️", description: "Find local boutiques and markets.", href: "/search?q=shopping", label: "Shopping" });
        if (prefs.interests?.includes('Live Music')) personalized.push({ title: "Live Music", icon: "🎵", description: "Catch a local gig or concert.", href: "/search?q=live music", label: "Live Music" });
      } catch (e) {
        console.error(e);
      }
    }

    const defaultExtras = [
      { title: "Suggested for you", icon: "✨", description: "Discover what like-minded people are doing.", href: "/search?q=popular activities for people like me", label: "Suggestions" },
      { title: "Hidden Gems", icon: "💎", description: "Discover secret, uncrowded trails and spots.", href: "/search?q=hidden gems", label: "Hidden Gems" },
      { title: "Coffee Shops", icon: "☕", description: "Perfect spots for post-hike recovery.", href: "/search?q=coffee", label: "Coffee" },
    ];

    // Combine them, deduplicate by title, and limit to 7 (leaving 1 slot for zip code)
    const allCards = [...baseCards, ...personalized, ...defaultExtras];
    const uniqueCards = Array.from(new Map(allCards.map(c => [c.title, c])).values());
    
    // Limit to 7 normal cards
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCards(uniqueCards.slice(0, 7));
  }, []);

  const handleZipSubmit = (e) => {
    e.preventDefault();
    if (zipInput.trim()) {
      router.push(`/search?q=hikes near ${zipInput.trim()}`);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-16">
      {cards.map((c, i) => (
        <ActionCard key={i} index={i} {...c} />
      ))}
      
      {/* Custom Zip Code Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cards.length * 0.05, duration: 0.4, ease: "easeOut" }}
        onClick={() => {
          if (!showZipInput) setShowZipInput(true);
        }}
        className="cursor-pointer group block relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 p-6 shadow-xl ring-1 ring-white/20 transition-all duration-300 hover:-translate-y-2 hover:bg-indigo-500/30 hover:shadow-2xl hover:ring-white/40 backdrop-blur-md h-full flex flex-col justify-between"
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/30 text-indigo-200 mb-4 text-2xl group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
          📍
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Explore by Zip Code</h3>
          {!showZipInput ? (
            <p className="text-sm text-indigo-100/70 mb-3">Find hikes and places near any location.</p>
          ) : null}
          
          {showZipInput ? (
            <form onSubmit={handleZipSubmit} className="mt-2 flex gap-2">
              <input 
                type="text" 
                placeholder="Enter Zip/Pin" 
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value)}
                autoFocus
                className="w-full bg-slate-900/50 border border-indigo-500/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button type="submit" className="bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-lg">
                Go
              </button>
            </form>
          ) : (
            <button 
              onClick={() => setShowZipInput(true)}
              className="mt-2 text-sm text-indigo-300 font-bold hover:text-indigo-200 flex items-center gap-1"
            >
              Enter Location <span>→</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
