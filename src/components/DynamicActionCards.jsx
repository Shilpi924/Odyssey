'use client';

import { useEffect, useState } from 'react';
import ActionCard from './ActionCard';

export default function DynamicActionCards() {
  const [cards, setCards] = useState([
    { title: "Hikes near me", icon: "🥾", description: "Find the best trails and nature walks.", href: "/search?q=hikes" },
    { title: "Food I like", icon: "🍔", description: "Discover restaurants based on your taste.", href: "/search?q=food" },
    { title: "Suggested for you", icon: "✨", description: "Discover what like-minded people with your interests are doing.", href: "/search?q=popular activities for people like me" },
    { title: "Kid-friendly", icon: "👨‍👩‍👧‍👦", description: "Activities perfect for you and your kids.", href: "/search?q=kids" }
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        const newCards = [];
        
        if (prefs.interests?.includes('Hiking')) {
          newCards.push({ title: "Hikes near me", icon: "🥾", description: "Find the best trails and nature walks.", href: "/search?q=hikes" });
        }
        if (prefs.interests?.includes('Food & Drink')) {
          newCards.push({ title: "Food I like", icon: "🍔", description: "Discover restaurants based on your taste.", href: "/search?q=food" });
        }
        if (prefs.travelWith?.toLowerCase().includes('kid') || prefs.groupDynamics?.toLowerCase().includes('kid')) {
          newCards.push({ title: "Kid-friendly", icon: "👨‍👩‍👧‍👦", description: "Activities perfect for you and your kids.", href: "/search?q=kids" });
        }
        if (prefs.interests?.includes('Nightlife')) {
          newCards.push({ title: "Nightlife", icon: "🌙", description: "Find the best bars and clubs.", href: "/search?q=nightlife" });
        }
        if (prefs.interests?.includes('Museums')) {
          newCards.push({ title: "Museums", icon: "🏛️", description: "Explore local museums and history.", href: "/search?q=museums" });
        }
        if (prefs.interests?.includes('Shopping')) {
          newCards.push({ title: "Shopping", icon: "🛍️", description: "Find local boutiques and markets.", href: "/search?q=shopping" });
        }
        if (prefs.interests?.includes('Live Music')) {
          newCards.push({ title: "Live Music", icon: "🎵", description: "Catch a local gig or concert.", href: "/search?q=live music" });
        }

        newCards.push({ title: "Suggested for you", icon: "✨", description: "Discover what like-minded people with your interests are doing.", href: "/search?q=popular activities for people like me" });
        
        // Fill up to 4 cards with defaults if needed
        if (newCards.length < 4) {
           if (!newCards.find(c => c.title === "Hikes near me")) newCards.unshift({ title: "Hikes near me", icon: "🥾", description: "Find the best trails and nature walks.", href: "/search?q=hikes" });
           if (!newCards.find(c => c.title === "Food I like")) newCards.unshift({ title: "Food I like", icon: "🍔", description: "Discover restaurants based on your taste.", href: "/search?q=food" });
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCards(newCards.slice(0, 4));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-16">
      {cards.map((c, i) => (
        <ActionCard key={i} {...c} />
      ))}
    </div>
  );
}
