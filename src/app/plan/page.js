'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

const steps = ['Location', 'Your group', 'Trail fit', 'Review'];
const groups = ['Solo', 'Partner', 'Friends', 'Family with children', 'Older adults', 'Dog'];
const difficulties = ['Easy', 'Moderate', 'Strenuous', 'Any'];
const distances = ['Under 3 miles', '3–5 miles', '5–10 miles', 'Any distance'];
const needs = ['Shade preferred', 'Frequent rest stops', 'Paved or firm surface', 'Avoid steep inclines', 'Accessible restroom', 'Dog-friendly'];

function Choice({ active, children, onClick }) {
  return <button type="button" onClick={onClick} className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${active ? 'border-emerald-300 bg-emerald-300/15 text-emerald-100' : 'border-white/10 bg-white/[.035] text-stone-300 hover:border-white/25'}`}>{children}</button>;
}

export default function PlanPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ location: '', group: [], difficulty: 'Easy', distance: 'Under 3 miles', needs: [] });
  const setOne = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggle = (key, value) => setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));
  const canContinue = step !== 0 || form.location.trim().length > 1;
  const searchUrl = useMemo(() => {
    const params = new URLSearchParams({ q: form.location, plan: 'true', difficulty: form.difficulty, distance: form.distance, group: form.group.join(', '), accessibility: form.needs.join(', ') });
    return `/search?${params.toString()}`;
  }, [form]);

  const finish = () => {
    localStorage.setItem('odysseyHikePlan', JSON.stringify({ ...form, createdAt: new Date().toISOString() }));
    router.push(searchUrl);
  };

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] pb-24 transition-colors duration-300">
      <header className="max-w-5xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between border-b border-white/10">
        <Link href="/" className="flex items-center gap-3"><Logo size={38} /><span className="font-bold tracking-[.14em] text-sm">ODYSSEY</span></Link>
        <Link href="/" className="text-sm text-stone-400 hover:text-white">Save & exit</Link>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[.2em] text-[var(--app-primary)]">Plan a hike</p>
          <div className="mt-5 grid grid-cols-4 gap-2" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((label, i) => <div key={label}><div className={`h-1 rounded-full ${i <= step ? 'bg-emerald-300' : 'bg-white/10'}`} /><p className={`mt-2 text-[10px] sm:text-xs ${i === step ? 'text-white' : 'text-stone-600'}`}>{label}</p></div>)}
          </div>
        </div>

        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-10 shadow-2xl min-h-[440px] transition-colors">
          {step === 0 && <div className="max-w-2xl"><p className="text-sm text-[#d9a14a]">Step 1 of 4</p><h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">Where do you want to hike?</h1><p className="mt-3 text-stone-400">Enter a city, park, or trail area. Odyssey will check nearby trail and weather context.</p><label className="block mt-9 text-sm font-semibold" htmlFor="location">Destination</label><div className="mt-2 flex rounded-xl border border-white/15 bg-black/20 p-2 focus-within:border-emerald-300"><span className="px-3 py-2 text-emerald-300">⌖</span><input id="location" autoFocus value={form.location} onChange={(e) => setOne('location', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && canContinue && setStep(1)} placeholder="Try Yosemite Valley or Boulder, CO" className="w-full bg-transparent px-1 text-lg outline-none placeholder:text-stone-600" /></div><button type="button" onClick={() => setOne('location', 'My current location')} className="mt-4 text-sm font-semibold text-emerald-300 hover:text-emerald-200">⌖ Use my current location</button></div>}

          {step === 1 && <div><p className="text-sm text-[#d9a14a]">Step 2 of 4</p><h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">Who’s coming along?</h1><p className="mt-3 text-stone-400">Choose all that apply. This shapes pace, terrain, and accessibility matches.</p><div className="mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-3">{groups.map((x) => <Choice key={x} active={form.group.includes(x)} onClick={() => toggle('group', x)}>{x}</Choice>)}</div><label className="block mt-8 text-sm text-stone-400">Group notes (optional)</label><input className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-emerald-300" placeholder="e.g. One child and one older adult" /></div>}

          {step === 2 && <div><p className="text-sm text-[#d9a14a]">Step 3 of 4</p><h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">What feels right today?</h1><div className="mt-8 grid md:grid-cols-2 gap-8"><div><p className="mb-3 text-xs uppercase tracking-widest text-stone-500">Difficulty</p><div className="grid grid-cols-2 gap-2">{difficulties.map((x) => <Choice key={x} active={form.difficulty === x} onClick={() => setOne('difficulty', x)}>{x}</Choice>)}</div></div><div><p className="mb-3 text-xs uppercase tracking-widest text-stone-500">Distance</p><div className="grid grid-cols-2 gap-2">{distances.map((x) => <Choice key={x} active={form.distance === x} onClick={() => setOne('distance', x)}>{x}</Choice>)}</div></div></div><p className="mt-8 mb-3 text-xs uppercase tracking-widest text-stone-500">Trail needs</p><div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">{needs.map((x) => <Choice key={x} active={form.needs.includes(x)} onClick={() => toggle('needs', x)}>{x}</Choice>)}</div></div>}

          {step === 3 && <div><p className="text-sm text-[#d9a14a]">Step 4 of 4</p><h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">Ready to find your trail.</h1><p className="mt-3 text-stone-400">Odyssey will rank nearby options and explain how each fits your group and current conditions.</p><dl className="mt-8 divide-y divide-white/10 border-y border-white/10">{[['Location', form.location], ['Group', form.group.join(', ') || 'Not specified'], ['Trail fit', `${form.difficulty} · ${form.distance}`], ['Needs', form.needs.join(', ') || 'None specified']].map(([k,v]) => <div key={k} className="grid grid-cols-[100px_1fr] gap-5 py-4"><dt className="text-sm text-stone-500">{k}</dt><dd className="text-sm font-medium">{v}</dd></div>)}</dl><div className="mt-7 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-relaxed text-amber-100/80"><strong className="text-amber-100">Conditions may have changed.</strong> Verify closures, weather, and official trail notices before starting.</div></div>}
        </section>

        <div className="mt-6 flex items-center justify-between"><button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className={`px-4 py-3 text-sm font-semibold ${step === 0 ? 'invisible' : 'text-stone-300'}`}>← Back</button>{step < 3 ? <button disabled={!canContinue} type="button" onClick={() => setStep((s) => s + 1)} className="rounded-xl bg-[var(--app-accent)] px-6 py-3 font-bold text-[#122019] disabled:cursor-not-allowed disabled:opacity-35">Continue →</button> : <button type="button" onClick={finish} className="rounded-xl bg-[var(--app-accent)] px-6 py-3 font-bold text-[#122019]">Analyze trails →</button>}</div>
      </div>
    </main>
  );
}
