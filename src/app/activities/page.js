'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import Map, { AttributionControl, Layer, Source } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { activitySyncPayload, activityToGpx, formatDistance, formatDuration, formatPace } from '@/lib/activities';
import { db } from '@/lib/db';
import { getMapStyle } from '@/lib/map-style';
import useResolvedTheme from '@/hooks/useResolvedTheme';

function ActivityMetric({ label, value, tone = 'text-[var(--app-text)]' }) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]/80 p-4">
      <p className={`text-2xl font-semibold tracking-tight ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--app-muted)]">{label}</p>
    </div>
  );
}

function visibilityLabel(value) {
  if (value === 'public') return 'Public later';
  if (value === 'followers') return 'Followers later';
  return 'Only you';
}

function ActivityMap({ activity, offline, theme }) {
  const mapRef = useRef(null);
  const coordinates = activity.route?.coordinates || [];
  if (coordinates.length < 2) {
    return (
      <div className="grid h-full min-h-64 place-items-center rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-bg)]/50 p-8 text-center">
        <div><p className="text-3xl">⌁</p><p className="mt-3 text-sm font-semibold">No route line was recorded</p><p className="mt-1 text-xs text-[var(--app-muted)]">The activity summary is still saved.</p></div>
      </div>
    );
  }
  const [longitude, latitude] = coordinates[0];
  return (
    <div className="relative h-full min-h-64 overflow-hidden rounded-3xl border border-[var(--app-border)]">
      <Map
        key={activity.id}
        ref={mapRef}
        initialViewState={{ longitude, latitude, zoom: 12 }}
        mapStyle={getMapStyle(theme, offline)}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
        onLoad={() => {
          const bounds = coordinates.reduce((value, point) => value.extend(point), new maplibregl.LngLatBounds());
          mapRef.current?.fitBounds(bounds, { padding: 48, duration: 0, maxZoom: 15 });
        }}
      >
        {!offline && <AttributionControl compact position="bottom-right" />}
        <Source id="activity-route" type="geojson" data={{ type: 'Feature', properties: {}, geometry: activity.route }}>
          <Layer id="activity-route-glow" type="line" paint={{ 'line-color': '#071a24', 'line-width': 9, 'line-opacity': 0.5 }} />
          <Layer id="activity-route-line" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#65d6c1', 'line-width': 5 }} />
        </Source>
      </Map>
      {offline && <span className="absolute left-3 top-3 rounded-full border border-emerald-300/30 bg-slate-950/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">Offline route</span>}
    </div>
  );
}

export default function ActivitiesPage() {
  const theme = useResolvedTheme();
  const { data: session } = useSession();
  const [activities, setActivities] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const records = await db.completedActivities.orderBy('completedAt').reverse().toArray();
    setActivities(records);
    const requestedId = new URLSearchParams(window.location.search).get('activity');
    setSelectedId(current => {
      if (requestedId && records.some(record => record.id === requestedId)) return requestedId;
      if (current && records.some(record => record.id === current)) return current;
      return records[0]?.id || null;
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  useEffect(() => {
    setOffline(!navigator.onLine); // eslint-disable-line react-hooks/set-state-in-effect
    const online = () => setOffline(false);
    const offlineListener = () => setOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', offlineListener);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offlineListener);
    };
  }, []);

  const selected = activities.find(activity => activity.id === selectedId) || activities[0] || null;
  const totals = useMemo(() => activities.reduce((value, activity) => ({
    distance: value.distance + Number(activity.distanceMeters || 0),
    duration: value.duration + Number(activity.durationSeconds || 0),
    elevation: value.elevation + Number(activity.elevationGainMeters || 0),
  }), { distance: 0, duration: 0, elevation: 0 }), [activities]);

  const updateActivity = async (id, changes) => {
    await db.completedActivities.update(id, changes);
    setActivities(current => current.map(activity => activity.id === id ? { ...activity, ...changes } : activity));
  };

  const sync = async activity => {
    if (!session?.user) {
      setMessage('Sign in when you want to back up activities across devices. Your local activity is safe.');
      return;
    }
    setBusy(activity.id);
    setMessage('');
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activitySyncPayload(activity)),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Sync failed');
      await updateActivity(activity.id, { syncedAt: body.syncedAt });
      setMessage('Activity backed up to your Odyssey account.');
    } catch (error) {
      setMessage(error.message || 'Activity sync is temporarily unavailable.');
    } finally {
      setBusy(null);
    }
  };

  const downloadGpx = activity => {
    const blob = new Blob([activityToGpx(activity)], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activity.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'odyssey-activity'}.gpx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const remove = async activity => {
    if (!window.confirm(`Delete “${activity.title}” from this device?`)) return;
    await db.completedActivities.delete(activity.id);
    if (activity.syncedAt && session?.user) await fetch(`/api/activities?id=${encodeURIComponent(activity.id)}`, { method: 'DELETE' }).catch(() => {});
    await load();
  };

  return (
    <main className="min-h-screen bg-[var(--app-bg)] pb-24 text-[var(--app-text)] md:pb-12">
      <header className="border-b border-[var(--app-border)] bg-[var(--app-bg)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[var(--app-primary)]">Odyssey Activity</p><h1 className="mt-1 text-lg font-bold">Your outdoor story</h1></div>
          <div className="flex items-center gap-2"><Link href="/saved" className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-sm font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)]">Saved trails</Link><Link href="/search" className="rounded-xl bg-[var(--app-primary)] px-3 py-2 text-sm font-bold text-[var(--app-bg)]">Start a hike</Link></div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[linear-gradient(135deg,var(--app-surface),color-mix(in_srgb,var(--app-primary)_15%,var(--app-bg)))] p-6 shadow-2xl sm:p-10">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--app-primary)]/10 blur-3xl" />
          <div className="relative max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--app-accent)]">Move · remember · grow</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-6xl">Every trail becomes part of your story.</h2><p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--app-muted)] sm:text-lg">Private by default, useful forever. Review your progress, revisit the route, export your data, and choose if you ever want to share.</p></div>
          <div className="relative mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ActivityMetric label="Activities" value={activities.length} />
            <ActivityMetric label="Distance" value={formatDistance(totals.distance)} tone="text-[var(--app-primary)]" />
            <ActivityMetric label="Moving time" value={formatDuration(totals.duration)} />
            <ActivityMetric label="Elevation" value={`${Math.round(totals.elevation * 3.28084).toLocaleString()} ft`} tone="text-[var(--app-accent)]" />
          </div>
        </section>

        {message && <p role="status" className="mt-5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm text-[var(--app-muted)]">{message} {!session?.user && <button type="button" onClick={() => signIn('google')} className="ml-1 font-bold text-[var(--app-primary)]">Sign in →</button>}</p>}

        {activities.length === 0 ? (
          <section className="mt-6 grid min-h-96 place-items-center rounded-[2rem] border border-dashed border-[var(--app-border)] bg-[var(--app-surface)]/50 p-8 text-center">
            <div className="max-w-md"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--app-primary)]/15 text-3xl">🥾</div><h2 className="mt-5 text-2xl font-semibold">Your first activity starts outside.</h2><p className="mt-3 leading-relaxed text-[var(--app-muted)]">Choose a verified trail, start tracking, and finish the hike to create a private activity with route, pace, distance, and elevation.</p><Link href="/search" className="mt-6 inline-flex rounded-xl bg-[var(--app-primary)] px-5 py-3 font-bold text-[var(--app-bg)]">Find your first trail →</Link></div>
          </section>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[.78fr_1.22fr]">
            <section aria-label="Activity history" className="space-y-3">
              <div className="flex items-center justify-between px-1"><h2 className="text-xl font-semibold">Recent adventures</h2><span className="text-xs text-[var(--app-muted)]">Newest first</span></div>
              {activities.map(activity => (
                <button key={activity.id} type="button" onClick={() => setSelectedId(activity.id)} className={`w-full rounded-2xl border p-4 text-left transition-all ${selected?.id === activity.id ? 'border-[var(--app-primary)] bg-[var(--app-primary)]/10 shadow-lg' : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:border-[var(--app-primary)]/50'}`}>
                  <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--app-muted)]">{new Date(activity.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p><h3 className="mt-1 font-bold">{activity.title}</h3></div><span className="rounded-full bg-[var(--app-surface-raised)] px-2.5 py-1 text-[10px] font-bold text-[var(--app-muted)]">{activity.syncedAt ? 'Cloud backup' : 'On device'}</span></div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm"><span><strong>{formatDistance(activity.distanceMeters)}</strong><small className="mt-0.5 block text-[10px] uppercase text-[var(--app-muted)]">Distance</small></span><span><strong>{formatDuration(activity.durationSeconds)}</strong><small className="mt-0.5 block text-[10px] uppercase text-[var(--app-muted)]">Time</small></span><span><strong>{Math.round(activity.elevationGainMeters * 3.28084)} ft</strong><small className="mt-0.5 block text-[10px] uppercase text-[var(--app-muted)]">Gain</small></span></div>
                </button>
              ))}
            </section>

            {selected && (
              <section className="overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xl">
                <div className="h-72 sm:h-80"><ActivityMap activity={selected} offline={offline} theme={theme} /></div>
                <div className="p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--app-primary)]">Hiking activity</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">{selected.title}</h2><p className="mt-2 text-sm text-[var(--app-muted)]">{new Date(selected.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p></div><span className="rounded-full border border-[var(--app-border)] px-3 py-1.5 text-xs font-semibold text-[var(--app-muted)]">🔒 {visibilityLabel(selected.visibility)}</span></div>
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><ActivityMetric label="Distance" value={formatDistance(selected.distanceMeters)} /><ActivityMetric label="Time" value={formatDuration(selected.durationSeconds)} /><ActivityMetric label="Pace" value={formatPace(selected.averagePaceSecondsPerMile)} /><ActivityMetric label="Gain" value={`${Math.round(selected.elevationGainMeters * 3.28084)} ft`} /></div>
                  {selected.notes && <p className="mt-5 rounded-xl border-l-2 border-[var(--app-accent)] bg-[var(--app-bg)]/40 px-4 py-3 text-sm leading-relaxed text-[var(--app-muted)]">{selected.notes}</p>}

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-[var(--app-muted)]">Visibility<select value={selected.visibility} onChange={event => updateActivity(selected.id, { visibility: event.target.value, syncedAt: null })} className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5 text-sm text-[var(--app-text)]"><option value="private">Only me</option><option value="followers">Followers — future sharing</option><option value="public">Public — future sharing</option></select></label>
                    <label className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3 text-sm"><input type="checkbox" checked={selected.hideStartEnd !== false} onChange={event => updateActivity(selected.id, { hideStartEnd: event.target.checked, syncedAt: null })} className="h-4 w-4 accent-emerald-400" /><span><strong className="block">Protect start and finish</strong><small className="text-[var(--app-muted)]">Trim endpoints from cloud backup</small></span></label>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2"><button type="button" onClick={() => downloadGpx(selected)} className="rounded-xl border border-[var(--app-border)] px-4 py-2.5 text-sm font-bold hover:border-[var(--app-primary)]">Export GPX</button><button type="button" disabled={busy === selected.id || offline} onClick={() => sync(selected)} className="rounded-xl bg-[var(--app-primary)] px-4 py-2.5 text-sm font-bold text-[var(--app-bg)] disabled:opacity-40">{busy === selected.id ? 'Backing up…' : selected.syncedAt ? 'Back up changes' : 'Back up activity'}</button><button type="button" onClick={() => remove(selected)} className="ml-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/10">Delete</button></div>
                  <p className="mt-4 text-[11px] leading-relaxed text-[var(--app-muted)]">GPS data stays on this device unless you choose Back up activity. Public and follower discovery are not enabled yet.</p>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
