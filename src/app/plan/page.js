'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

const groups = ['Solo', 'Partner', 'Friends', 'Family with children', 'Older adults', 'Dog'];
const difficulties = ['Easy', 'Moderate', 'Strenuous', 'Any'];
const distances = ['Under 3 miles', '3–5 miles', '5–10 miles', 'Any distance'];
const needs = ['Shade preferred', 'Frequent rest stops', 'Paved or firm surface', 'Avoid steep inclines', 'Accessible restroom', 'Dog-friendly'];
const initialForm = { destination: '', days: 1, startDate: '', group: [], difficulty: 'Any', distance: 'Any distance', needs: [], notes: '' };

function Choice({ active, children, onClick }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`rounded-full border px-4 py-2 text-sm transition ${active ? 'border-[var(--app-primary)] bg-[var(--app-glow)] text-[var(--app-primary)]' : 'border-[var(--app-border)] text-[var(--app-muted)] hover:border-white/30 hover:text-[var(--app-text)]'}`}>{children}</button>;
}

function formatPlanDownload(plan) {
  const days = plan.days.map(day => `DAY ${day.day}: ${day.name}\n${day.area} · ${day.difficulty} · ${day.distance} · ${day.elevationGain} · ${day.routeType}\n${day.sourceProvider}: ${day.sourceUrl}`).join('\n\n');
  return `${plan.title}\nCreated ${new Date(plan.createdAt).toLocaleString()}\n\n${plan.aiBrief?.text || plan.summary}\n\n${days}\n\nGEAR\n${plan.gear.map(item => `- ${item}`).join('\n')}\n\nSAFETY\n${plan.safety.map(item => `- ${item}`).join('\n')}\n\nVerify closures, weather, access, and permits before leaving.`;
}

export default function PlanPage() {
  const [form, setForm] = useState(initialForm);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const setOne = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const toggle = (key, value) => setForm(current => ({ ...current, [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value] }));

  useEffect(() => {
    let timer;
    try {
      const draft = JSON.parse(localStorage.getItem('odysseyTripPlanDraft'));
      if (draft?.request) timer = window.setTimeout(() => setForm({ ...initialForm, ...draft.request }), 0);
    } catch { /* Ignore invalid device-local drafts. */ }
    return () => window.clearTimeout(timer);
  }, []);

  async function generate(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('Matching your preferences with sourced trail facts…');
    setPlan(null);
    try {
      const response = await fetch('/api/trip-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not build this trip.');
      setPlan(data.plan);
      localStorage.setItem('odysseyTripPlanDraft', JSON.stringify(data.plan));
      setMessage('Plan saved on this device. Review its sources before heading out.');
      window.setTimeout(() => document.getElementById('trip-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function download() {
    const blob = new Blob([formatPlanDownload(plan)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('Plan downloaded. Map tiles and live conditions are not included.');
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] pb-24">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-[var(--app-border)] px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3"><Logo size={38} /><span className="text-sm font-bold tracking-[.14em]">ODYSSEY</span></Link>
        <Link href="/search" className="text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]">Explore trails</Link>
      </header>

      <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-16">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_.72fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 text-xs text-[var(--app-primary)]"><span aria-hidden="true">✦</span> Source-grounded trip planner</div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-.04em] sm:text-6xl">A trail plan that explains <span className="text-[var(--app-primary)]">why it fits.</span></h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--app-muted)] sm:text-lg">Tell Odyssey what your group needs. It builds a practical itinerary from sourced trail facts—and clearly marks what still needs checking.</p>
          </div>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-5 text-sm leading-6 text-amber-100/85"><strong className="text-amber-100">Plan, then verify.</strong> Closures, weather, fire restrictions, permits, and access can change. Follow the linked land-manager sources before every trip.</div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[.86fr_1.14fr]">
          <form onSubmit={generate} className="h-fit rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-2xl sm:p-8 lg:sticky lg:top-6">
            <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-[var(--app-primary)]">Your trip</p><h2 className="mt-2 text-2xl font-semibold">Set the trail brief</h2></div><span className="rounded-full bg-black/20 px-3 py-1 text-xs text-[var(--app-muted)]">1–7 days</span></div>
            <label htmlFor="destination" className="mt-7 block text-sm font-semibold">Where do you want to go?</label>
            <input id="destination" required minLength={2} value={form.destination} onChange={event => setOne('destination', event.target.value)} placeholder="Mount Diablo, Yosemite, or a nearby city" className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-black/20 px-4 py-3.5 outline-none placeholder:text-stone-600 focus:border-[var(--app-primary)]" />
            <div className="mt-5 grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Days<input type="number" min="1" max="7" value={form.days} onChange={event => setOne('days', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-black/20 px-4 py-3 outline-none focus:border-[var(--app-primary)]" /></label><label className="text-sm font-semibold">Start date <span className="font-normal text-[var(--app-muted)]">optional</span><input type="date" value={form.startDate} onChange={event => setOne('startDate', event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-black/20 px-4 py-3 outline-none focus:border-[var(--app-primary)]" /></label></div>

            <fieldset className="mt-6"><legend className="text-sm font-semibold">Who’s coming?</legend><div className="mt-3 flex flex-wrap gap-2">{groups.map(item => <Choice key={item} active={form.group.includes(item)} onClick={() => toggle('group', item)}>{item}</Choice>)}</div></fieldset>
            <fieldset className="mt-6"><legend className="text-sm font-semibold">Difficulty</legend><div className="mt-3 flex flex-wrap gap-2">{difficulties.map(item => <Choice key={item} active={form.difficulty === item} onClick={() => setOne('difficulty', item)}>{item}</Choice>)}</div></fieldset>
            <fieldset className="mt-6"><legend className="text-sm font-semibold">Distance</legend><div className="mt-3 flex flex-wrap gap-2">{distances.map(item => <Choice key={item} active={form.distance === item} onClick={() => setOne('distance', item)}>{item}</Choice>)}</div></fieldset>
            <fieldset className="mt-6"><legend className="text-sm font-semibold">Must-haves</legend><div className="mt-3 flex flex-wrap gap-2">{needs.map(item => <Choice key={item} active={form.needs.includes(item)} onClick={() => toggle('needs', item)}>{item}</Choice>)}</div></fieldset>
            <label htmlFor="notes" className="mt-6 block text-sm font-semibold">Anything else? <span className="font-normal text-[var(--app-muted)]">optional</span></label>
            <textarea id="notes" maxLength={500} rows={3} value={form.notes} onChange={event => setOne('notes', event.target.value)} placeholder="Slow mornings, scenic lunch stop, first hike after an injury…" className="mt-2 w-full resize-none rounded-xl border border-[var(--app-border)] bg-black/20 px-4 py-3 outline-none placeholder:text-stone-600 focus:border-[var(--app-primary)]" />
            <button disabled={loading} className="mt-6 w-full rounded-xl bg-[var(--app-accent)] px-5 py-4 font-bold text-[#122019] shadow-lg transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60">{loading ? 'Building your plan…' : '✦ Build my trip'}</button>
            <p role="status" aria-live="polite" className={`mt-3 min-h-5 text-center text-xs ${message && !plan && !loading ? 'text-amber-200' : 'text-[var(--app-muted)]'}`}>{message}</p>
          </form>

          <section id="trip-result" aria-live="polite" className="min-h-[620px] scroll-mt-6">
            {!plan && <div className="flex min-h-[620px] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--app-border)] bg-[linear-gradient(145deg,var(--app-surface),transparent)] p-8 text-center"><div className="grid h-16 w-16 place-items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-2xl">⌁</div><h2 className="mt-5 text-2xl font-semibold">Your route story starts here</h2><p className="mt-3 max-w-sm text-sm leading-6 text-[var(--app-muted)]">You’ll get day-by-day trail matches, time estimates, a gear checklist, safety reminders, and direct source links.</p><div className="mt-7 flex flex-wrap justify-center gap-2 text-xs text-[var(--app-muted)]"><span className="rounded-full border border-[var(--app-border)] px-3 py-1.5">No invented reviews</span><span className="rounded-full border border-[var(--app-border)] px-3 py-1.5">Missing facts stay visible</span><span className="rounded-full border border-[var(--app-border)] px-3 py-1.5">Works without an AI key</span></div></div>}
            {plan && <div className="space-y-5">
              <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.18em] text-[var(--app-primary)]">{plan.grounding === 'verified-catalog' ? 'Verified catalog plan' : 'Community-mapped plan'}</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">{plan.title}</h2></div><div className="flex gap-2"><button type="button" onClick={download} className="rounded-xl border border-[var(--app-border)] px-4 py-2.5 text-sm font-semibold hover:bg-white/5">↓ Download</button><Link href={`/search?q=${encodeURIComponent(plan.request.destination)}&plan=true`} className="rounded-xl bg-[var(--app-primary)] px-4 py-2.5 text-sm font-bold text-[#09221d]">Open map</Link></div></div>
                <p className="mt-5 whitespace-pre-line text-base leading-7 text-[var(--app-muted)]">{plan.aiBrief?.text || plan.summary}</p>
                <div className="mt-5 flex items-center gap-2 text-xs text-[var(--app-muted)]"><span className={`h-2 w-2 rounded-full ${plan.aiBrief ? 'bg-emerald-300' : 'bg-amber-300'}`} /><span>{plan.aiBrief ? 'AI briefing checked against cited sources' : 'Deterministic plan — AI briefing not configured'}</span></div>
              </div>

              {plan.days.map(day => <article key={day.day} className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-7"><div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--app-primary)] font-bold text-[#09221d]">{day.day}</div><div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-wider text-[var(--app-muted)]">Day {day.day} · {day.area}</p><h3 className="mt-1 text-2xl font-semibold">{day.name}</h3>{day.matchReasons?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{day.matchReasons.map(reason => <span key={reason} className="rounded-full bg-[var(--app-glow)] px-2.5 py-1 text-xs text-[var(--app-primary)]">✓ {reason}</span>)}</div>}<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Difficulty', day.difficulty], ['Trail length', day.distance], ['Elevation', day.elevationGain], ['Time', day.estimatedMinutes ? `${Math.floor(day.estimatedMinutes / 60)}h ${day.estimatedMinutes % 60 || ''}m` : 'Unknown']].map(([label, value]) => <div key={label} className="rounded-xl bg-black/15 p-3"><p className="text-[10px] uppercase tracking-wider text-[var(--app-muted)]">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border)] pt-4"><p className="text-xs text-[var(--app-muted)]">Access: {day.accessStatus}</p><a href={day.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--app-primary)] hover:underline">{day.sourceProvider} ↗</a></div></div></div></article>)}

              <div className="grid gap-5 sm:grid-cols-2"><div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6"><h3 className="text-lg font-semibold">Pack with purpose</h3><ul className="mt-4 space-y-3 text-sm text-[var(--app-muted)]">{plan.gear.map(item => <li key={item} className="flex gap-2"><span className="text-[var(--app-primary)]">✓</span>{item}</li>)}</ul></div><div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6"><h3 className="text-lg font-semibold">Before you leave</h3><ul className="mt-4 space-y-3 text-sm text-[var(--app-muted)]">{plan.safety.map(item => <li key={item} className="flex gap-2"><span className="text-amber-300">!</span>{item}</li>)}</ul></div></div>

              {(plan.unknowns.length > 0 || plan.coverageMessage) && <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[.05] p-5"><h3 className="text-sm font-semibold text-amber-100">What Odyssey did not assume</h3><ul className="mt-2 space-y-1 text-sm leading-6 text-amber-100/70">{plan.unknowns.map(item => <li key={item}>• {item}</li>)}{plan.coverageMessage && <li>• {plan.coverageMessage}</li>}</ul></div>}

              <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6"><h3 className="text-lg font-semibold">Plan sources</h3><p className="mt-1 text-sm text-[var(--app-muted)]">Trail facts come from these linked records. Open them before you go.</p><div className="mt-4 divide-y divide-[var(--app-border)]">{plan.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 py-3 text-sm hover:text-[var(--app-primary)]"><span><strong>{source.id}</strong> · {source.title}<span className="ml-2 text-[var(--app-muted)]">{source.provider}</span></span><span>↗</span></a>)}</div></div>
            </div>}
          </section>
        </div>
      </div>
    </main>
  );
}
