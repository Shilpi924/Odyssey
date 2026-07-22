'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { db as localDb } from '@/lib/db';
import { THEME_COOKIE } from '@/lib/theme';
import { forgetLocationAccess } from '@/lib/location-access';
import {
  ALL_ODYSSEY_LOCAL_KEYS,
  SEARCH_SESSION_KEYS,
  clearBrowserCaches,
  clearStorageEntries,
  clearTrailRecords,
  expireCookie,
} from '@/lib/privacy-data';

async function clearLocalOdysseyData() {
  await clearTrailRecords(localDb);
  clearStorageEntries(window.localStorage, ALL_ODYSSEY_LOCAL_KEYS);
  clearStorageEntries(window.sessionStorage, SEARCH_SESSION_KEYS);
  forgetLocationAccess();
  expireCookie(document, THEME_COOKIE);
  await clearBrowserCaches(window.caches);
}

export default function AccountDeletionPage() {
  const { data: session, status } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const beginSignIn = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await signIn('google', { callbackUrl: '/account-deletion', redirect: false });
      if (result?.error || !result?.url) throw new Error(result?.error || 'No sign-in URL was returned');
      window.location.assign(result.url);
    } catch (error) {
      console.error('Google sign-in could not start:', error);
      setMessage('Google sign-in could not start. Please try again after confirming the production OAuth callback is configured.');
      setBusy(false);
    }
  };

  const deleteAccountData = async () => {
    setBusy(true);
    setMessage('');
    let serverDeleted = false;
    try {
      const response = await fetch('/api/user/account', { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Deletion failed');
      serverDeleted = true;
      await clearLocalOdysseyData();
      setConfirming(false);
      await signOut({ callbackUrl: '/account-deletion?deleted=1' });
    } catch (error) {
      console.error('Account deletion failed:', error);
      setMessage(serverDeleted
        ? 'Your synced Odyssey account data was deleted, but some records in this browser could not be cleared. Use Profile → Clear all local data or clear this site’s browser data.'
        : 'Odyssey could not delete the synced account data. Please try again; the deletion transaction was not completed.');
      setBusy(false);
    }
  };

  return (
    <main data-ready="true" className="min-h-screen bg-slate-950 px-5 py-16 text-slate-100">
      <ConfirmDialog
        open={confirming}
        title="Delete Odyssey account data?"
        description="This permanently deletes your synced preferences and backed-up activities, including any uploaded route, from Odyssey. It also clears Odyssey data in this browser. It does not delete your Google account. This cannot be undone."
        confirmLabel="Permanently delete"
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={deleteAccountData}
      />
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-7 shadow-2xl sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Privacy control</p>
        <h1 className="mt-3 text-3xl font-bold">Delete your Odyssey account data</h1>
        <p className="mt-4 leading-relaxed text-slate-300">This page works in a web browser and in the Android app. Deletion covers synced preferences and activities you backed up to Odyssey. Local saved trails, searches, and GPS records in this browser are cleared at the same time.</p>

        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 text-sm leading-relaxed text-amber-100">
          Your Google account is only used to verify which Odyssey data belongs to you. Deleting Odyssey data does not delete or change your Google account.
        </div>

        <div className="mt-8">
          {status === 'loading' ? (
            <p role="status" className="text-slate-400">Checking sign-in…</p>
          ) : session?.user ? (
            <div>
              <p className="text-sm text-slate-300">Signed in as <span className="font-semibold text-white">{session.user.email || session.user.name}</span></p>
              <button type="button" disabled={busy} onClick={() => setConfirming(true)} className="mt-4 rounded-xl bg-rose-500 px-5 py-3 font-bold text-white hover:bg-rose-400 disabled:opacity-50">
                Delete Odyssey account data
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-300">Sign in with the same Google account you used for Odyssey so the service can verify and delete the correct records.</p>
              <button type="button" disabled={busy} onClick={beginSignIn} className="mt-4 rounded-xl bg-white px-5 py-3 font-bold text-slate-950 hover:bg-slate-100 disabled:opacity-50">
                {busy ? 'Opening Google…' : 'Continue with Google'}
              </button>
            </div>
          )}
        </div>

        {message && <p role="alert" className="mt-5 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-100">{message}</p>}
        <p className="mt-8 text-xs leading-relaxed text-slate-400">Odyssey may retain limited security or infrastructure logs for their normal short retention period. See the <Link href="/legal/privacy" className="text-cyan-300 underline">Privacy Notice</Link> for details.</p>
        <Link href="/personalize" className="mt-6 inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-200">← Back to Profile</Link>
      </div>
    </main>
  );
}
