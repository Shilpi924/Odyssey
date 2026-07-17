'use client';

import { useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { THEME_COOKIE } from '@/lib/theme';
import { forgetLocationAccess } from '@/lib/location-access';
import {
  ALL_ODYSSEY_LOCAL_KEYS,
  SEARCH_AND_PLAN_LOCAL_KEYS,
  SEARCH_SESSION_KEYS,
  clearBrowserCaches,
  clearStorageEntries,
  clearTrailRecords,
  expireCookie,
} from '@/lib/privacy-data';

export default function LocalDataControls({ signedIn = false }) {
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const perform = async (name, confirmation, action, success) => {
    if (!window.confirm(confirmation)) return;
    setBusy(name);
    setMessage('');
    try {
      await action();
      setMessage(success);
    } catch (error) {
      console.error('Failed to clear local Odyssey data:', error);
      setMessage('Some local data could not be cleared. Try again or clear this site’s browser data.');
    } finally {
      setBusy('');
    }
  };

  const clearSearchAndPlanning = () => perform(
    'search',
    'Clear search history, the saved plan, and cached search results from this browser?',
    async () => {
      clearStorageEntries(window.localStorage, SEARCH_AND_PLAN_LOCAL_KEYS);
      clearStorageEntries(window.sessionStorage, SEARCH_SESSION_KEYS);
    },
    'Search, planning, and cached result data were cleared from this browser.'
  );

  const clearSavedAndGps = () => perform(
    'trails',
    'Delete all saved trails, active and completed activities, and recorded GPS points from this browser? This cannot be undone.',
    () => clearTrailRecords(db),
    'Saved trails, completed activities, and on-device GPS records were deleted.'
  );

  const clearAllLocalData = () => perform(
    'all',
    'Delete all Odyssey activity data, preferences, cached results, and the in-app location choice from this browser? This cannot be undone.',
    async () => {
      await clearTrailRecords(db);
      clearStorageEntries(window.localStorage, ALL_ODYSSEY_LOCAL_KEYS);
      clearStorageEntries(window.sessionStorage, SEARCH_SESSION_KEYS);
      forgetLocationAccess();
      expireCookie(document, THEME_COOKIE);
      await clearBrowserCaches(window.caches);
    },
    'All scoped Odyssey data stored by this browser was cleared.'
  );

  return (
    <section className="mt-8 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-6">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-cyan-300">Privacy &amp; local data</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Control what this browser keeps</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">These controls target Odyssey’s own browser records. They do not change browser-level location permission or delete unrelated website data.</p>
      {signedIn && <p className="mt-2 text-xs text-amber-200/80">Signed-in preferences stored on the server can sync back later. See the Privacy Notice to request server-side deletion.</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button type="button" disabled={Boolean(busy)} onClick={clearSearchAndPlanning} className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50">
          {busy === 'search' ? 'Clearing…' : 'Clear searches & plan'}
        </button>
        <button type="button" disabled={Boolean(busy)} onClick={clearSavedAndGps} className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50">
          {busy === 'trails' ? 'Deleting…' : 'Delete saved trails & GPS'}
        </button>
        <button type="button" disabled={Boolean(busy)} onClick={clearAllLocalData} className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-950/60 disabled:opacity-50">
          {busy === 'all' ? 'Deleting…' : 'Clear all local data'}
        </button>
      </div>
      {message && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200">{message}</p>}
      <p className="mt-4 text-xs text-slate-500">For account information stored on the server, follow the request instructions in the <Link href="/legal/privacy" className="text-cyan-300 underline">Privacy Notice</Link>.</p>
    </section>
  );
}
