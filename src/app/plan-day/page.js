'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

const interests = ['Scenic hike', 'Coffee', 'Local food', 'Family activity', 'Museum or culture', 'Sunset view', 'Recovery or wellness'];
const paceOptions = ['Easygoing', 'Balanced', 'Pack it in'];

const timeToMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatTime = (minutes) => {
  const normalized = minutes % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${String(mins).padStart(2, '0')} ${suffix}`;
};

function Toggle({ selected, children, onClick }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-4 py-2 text-sm transition-colors ${selected ? 'border-emerald-300 bg-emerald-300/15 text-emerald-100' : 'border-white/10 bg-white/[.035] text-stone-400 hover:border-white/25'}`}>{children}</button>;
}

export default function PlanDayPage() {
  const [form, setForm] = useState({ location: '', start: '08:00', end: '18:00', pace: 'Balanced', interests: ['Scenic hike', 'Local food', 'Sunset view'] });
  const [generated, setGenerated] = useState(false);
  const toggleInterest = (interest) => setForm((current) => ({ ...current, interests: current.interests.includes(interest) ? current.interests.filter((item) => item !== interest) : [...current.interests, interest] }));

  const itinerary = useMemo(() => {
    const start = timeToMinutes(form.start);
    const hikeLength = form.pace === 'Easygoing' ? 150 : form.pace === 'Balanced' ? 210 : 270;
    const items = [];
    let cursor = start;
    if (form.interests.includes('Coffee')) {
      items.push({ time: cursor, duration: 45, type: 'Fuel up', title: 'Coffee near the trail area', note: 'Choose a locally rated stop after the route is selected.' });
      cursor += 60;
    }
    items.push({ time: cursor, duration: hikeLength, type: 'Main activity', title: 'Trail-time placeholder', note: 'Drafted from your selected timing and pace; not based on live weather or trail conditions.', primary: true });
    cursor += hikeLength + 45;
    if (form.interests.includes('Local food')) {
      items.push({ time: cursor, duration: 75, type: 'After the hike', title: 'Casual local meal', note: 'Prioritize a nearby option with current opening hours.' });
      cursor += 90;
    }
    if (form.interests.includes('Family activity')) items.push({ time: cursor, duration: 90, type: 'Nearby stop', title: 'Family-friendly activity', note: 'Low-effort option within the same area.' });
    else if (form.interests.includes('Museum or culture')) items.push({ time: cursor, duration: 90, type: 'Nearby stop', title: 'Local museum or cultural stop', note: 'Indoor backup if conditions turn.' });
    else if (form.interests.includes('Recovery or wellness')) items.push({ time: cursor, duration: 60, type: 'Recover', title: 'Post-hike recovery', note: 'Stretch, spa, or wellness option near your route.' });
    if (form.interests.includes('Sunset view')) items.push({ time: Math.max(cursor + 100, timeToMinutes(form.end) - 45), duration: 45, type: 'Finish', title: 'Sunset viewpoint', note: 'Timing should be updated using the selected date and local sunset.' });
    return items;
  }, [form]);

  const trailSearch = `/search?${new URLSearchParams({ q: form.location || 'near me', plan: 'day', pace: form.pace }).toString()}`;

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] pb-24 transition-colors duration-300">
      <header className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between border-b border-white/10">
        <Link href="/" className="flex items-center gap-3"><Logo size={38} /><span className="font-bold tracking-[.14em] text-sm">ODYSSEY</span></Link>
        <Link href="/plan" className="text-sm text-stone-400 hover:text-white">Plan only a hike</Link>
      </header>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[.2em] text-[var(--app-accent)]">Day planner</p>
          <h1 className="mt-4 text-4xl sm:text-6xl font-semibold tracking-[-.045em] leading-none">One great hike.<br /><span className="font-serif italic text-emerald-200">A whole day</span> around it.</h1>
          <p className="mt-5 text-lg leading-relaxed text-stone-400">Build a realistic day around the trail—not a disconnected list of places.</p>
        </div>

        <div className="mt-10 grid lg:grid-cols-[.85fr_1.15fr] gap-6 items-start">
          <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-8 transition-colors">
            <label className="text-sm font-semibold" htmlFor="day-location">Where are you going?</label>
            <input id="day-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Yosemite Valley, CA" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-emerald-300" />
            <div className="mt-6 grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Start time<input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="mt-2 block w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none" /></label><label className="text-sm font-semibold">Wrap up<input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="mt-2 block w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none" /></label></div>
            <p className="mt-7 mb-3 text-xs uppercase tracking-widest text-stone-500">Your pace</p>
            <div className="flex flex-wrap gap-2">{paceOptions.map((pace) => <Toggle key={pace} selected={form.pace === pace} onClick={() => setForm({ ...form, pace })}>{pace}</Toggle>)}</div>
            <p className="mt-7 mb-3 text-xs uppercase tracking-widest text-stone-500">Add to my day</p>
            <div className="flex flex-wrap gap-2">{interests.map((interest) => <Toggle key={interest} selected={form.interests.includes(interest)} onClick={() => toggleInterest(interest)}>{interest}</Toggle>)}</div>
            <button type="button" disabled={!form.location.trim()} onClick={() => setGenerated(true)} className="mt-8 w-full rounded-xl bg-[var(--app-accent)] px-5 py-3.5 font-bold text-[#122019] disabled:opacity-35">Build my day →</button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8 min-h-[540px]">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-emerald-300">Suggested flow</p><h2 className="mt-2 text-2xl font-semibold">{generated ? `A day in ${form.location}` : 'Your itinerary preview'}</h2></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-stone-400">{form.pace}</span></div>
            {!generated ? <div className="mt-20 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-dashed border-white/20 text-2xl text-stone-500">☼</div><p className="mt-5 font-medium text-stone-300">Tell us how you want the day to feel.</p><p className="mt-2 text-sm text-stone-500">We’ll keep travel time, trail energy, and recovery in mind.</p></div> : <div className="mt-8">
              {itinerary.map((item, index) => <div key={`${item.time}-${item.title}`} className="grid grid-cols-[74px_20px_1fr] gap-3"><p className="pt-1 text-xs font-mono text-stone-500">{formatTime(item.time)}</p><div className="flex flex-col items-center"><span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${item.primary ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-primary)]'}`} />{index < itinerary.length - 1 && <span className="w-px flex-1 bg-white/10" />}</div><div className="pb-7"><p className="text-[10px] uppercase tracking-widest text-stone-500">{item.type} · {Math.round(item.duration / 15) * 15} min</p><h3 className="mt-1 font-semibold">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-stone-400">{item.note}</p>{item.primary && <Link href={trailSearch} className="mt-3 inline-block text-sm font-semibold text-[var(--app-accent)] hover:brightness-110">Choose the right trail →</Link>}</div></div>)}
              <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-relaxed text-amber-100/75">This is a planning outline. Verify live weather, trail closures, opening hours, and drive times before leaving.</div>
            </div>}
          </section>
        </div>
      </div>
    </main>
  );
}
