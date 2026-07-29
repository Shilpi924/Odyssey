'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { restorePreferencesFromBackup } from '@/lib/preferences';

export default function PreferencesWidget() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await restorePreferencesFromBackup();
        if (saved && Object.keys(saved).length > 0) {
          setPrefs(saved);
        }
      } catch (err) {
        console.error('Failed to load preferences widget:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.02] p-6 h-36 w-full flex items-center justify-center">
        <span className="text-xs text-stone-500">Loading trail preferences…</span>
      </div>
    );
  }

  // Count active hiking/personalization metrics
  const activeDifficulties = prefs?.hiking?.difficulty || [];
  const activeFeatures = prefs?.hiking?.features || [];
  const activeLength = prefs?.hiking?.length || '';
  const activeElevation = prefs?.hiking?.elevation || '';
  const supportingInterests = prefs?.interests?.filter(i => i !== 'Hiking') || [];

  const hasPreferences =
    activeDifficulties.length > 0 ||
    activeFeatures.length > 0 ||
    (activeLength && activeLength !== 'None' && activeLength !== '') ||
    (activeElevation && activeElevation !== 'None' && activeElevation !== '') ||
    supportingInterests.length > 0;

  if (!hasPreferences) {
    return (
      <div className="group rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
              Personalization
            </span>
            <h3 className="mt-2.5 text-base font-semibold text-white">Customize your Odyssey</h3>
            <p className="mt-1 text-xs text-stone-400">
              Select your hiking level and features to get custom recommendations tailored for you or your group.
            </p>
          </div>
          <Link href="/personalize">
            <span className="shrink-0 cursor-pointer rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:brightness-110 text-white font-bold text-xs px-4 py-2.5 shadow-md transition-all duration-200 inline-block">
              Set Up Profile
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/20">
      <div className="absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
      
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            ✓ Preference Engine Active
          </span>
          <h3 className="mt-2.5 text-base font-semibold text-white">Your Hiking Profile</h3>
        </div>
        <Link href="/personalize" className="text-xs font-semibold text-emerald-400 hover:underline">
          Edit Profile
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {/* Difficulty Badges */}
        {activeDifficulties.map((diff) => (
          <span key={diff} className="inline-flex items-center rounded-lg bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 text-xs font-medium text-emerald-300">
            {diff === 'Easy' ? '🌿 Easy' : diff === 'Moderate' ? '🥾 Moderate' : diff === 'Strenuous' ? '⛰️ Strenuous' : diff === 'Expert' ? '🧗 Expert' : diff}
          </span>
        ))}

        {/* Length Badge */}
        {activeLength && activeLength !== 'None' && (
          <span className="inline-flex items-center rounded-lg bg-blue-950/40 border border-blue-800/40 px-2.5 py-1 text-xs font-medium text-blue-300">
            📏 {activeLength === 'short' ? '< 2 miles' : activeLength === 'medium' ? '2-5 miles' : activeLength === 'long' ? '5-10 miles' : activeLength === 'verylong' ? '10+ miles' : activeLength}
          </span>
        )}

        {/* Elevation Badge */}
        {activeElevation && activeElevation !== 'None' && (
          <span className="inline-flex items-center rounded-lg bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 text-xs font-medium text-amber-300">
            📈 {activeElevation === 'flat' ? 'Flat' : activeElevation === 'gentle' ? 'Gentle' : activeElevation === 'moderate' ? 'Moderate' : activeElevation === 'steep' ? 'Steep' : activeElevation}
          </span>
        )}

        {/* Feature Badges */}
        {activeFeatures.slice(0, 3).map((feat) => (
          <span key={feat} className="inline-flex items-center rounded-lg bg-teal-950/40 border border-teal-800/40 px-2.5 py-1 text-xs font-medium text-teal-300">
            ✨ {feat}
          </span>
        ))}
        {activeFeatures.length > 3 && (
          <span className="inline-flex items-center rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300">
            +{activeFeatures.length - 3} more
          </span>
        )}

        {/* Supporting Interests */}
        {supportingInterests.map((interest) => (
          <span key={interest} className="inline-flex items-center rounded-lg bg-indigo-950/40 border border-indigo-800/40 px-2.5 py-1 text-xs font-medium text-indigo-300">
            {interest.split(' ')[0]} {interest.replace(/^[^\s]+\s+/, '')}
          </span>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <Link href="/search?nearme=true" className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-stone-950 text-xs font-bold py-2.5 text-center transition-colors">
          Find matching trails near me
        </Link>
      </div>
    </div>
  );
}
