import Link from 'next/link';
import Logo from '@/components/Logo';
import MapPreview from '@/components/MapPreview';

const actions = [
  { href: '/search?nearme=true', eyebrow: 'Use my location', title: 'Find hikes near me', icon: '⌖', tone: 'emerald' },
  { href: '/plan', eyebrow: 'Personalized planning', title: 'Plan for my group', icon: '↗', tone: 'amber' },
  { href: '/saved', eyebrow: 'Works without signal', title: 'Open offline maps', icon: '↓', tone: 'sky' },
];

const proof = [
  ['01', 'Group-aware', 'Match distance, ability, accessibility, and who is coming.'],
  ['02', 'Conditions-aware', 'Weather and trail context are factored into every result.'],
  ['03', 'Trail-ready', 'Save the map, mark the trailhead, and track with live GPS.'],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07130f] text-[#f5f2e8] overflow-hidden pb-24">
      <div className="absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(circle_at_78%_20%,rgba(56,189,150,.16),transparent_34%),radial-gradient(circle_at_15%_15%,rgba(217,161,74,.1),transparent_28%)] pointer-events-none" />

      <nav className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between border-b border-white/10">
        <Link href="/" className="flex items-center gap-3" aria-label="Odyssey home">
          <Logo size={42} />
          <div><p className="font-bold tracking-[.16em] text-sm">ODYSSEY</p><p className="text-[10px] uppercase tracking-[.2em] text-emerald-300/70">Trail intelligence</p></div>
        </Link>
        <div className="flex items-center gap-2 sm:gap-5 text-sm">
          <Link href="/saved" className="hidden sm:block text-stone-300 hover:text-white">Saved trails</Link>
          <Link href="/plan" className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 font-semibold text-emerald-100 hover:bg-emerald-300/20">Plan a hike</Link>
        </div>
      </nav>

      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20">
        <div className="grid lg:grid-cols-[1.04fr_.96fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-300/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.16em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" /> Built for the trail ahead
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl sm:text-6xl xl:text-7xl font-semibold leading-[.98] tracking-[-.055em]">
              The right trail for <span className="text-[#d9a14a] italic font-serif">everyone</span> in your group.
            </h1>
            <p className="mt-7 max-w-xl text-lg sm:text-xl leading-relaxed text-stone-300">
              AI-powered hiking recommendations that consider ability, distance, weather, and accessibility—plus offline maps and live GPS tracking.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link href="/plan" className="rounded-xl bg-[#e8b75f] px-6 py-4 text-center font-bold text-[#122019] hover:bg-[#f2c872] transition-colors">Plan my hike <span className="ml-2">→</span></Link>
              <Link href="/search?nearme=true" className="rounded-xl border border-white/15 bg-white/5 px-6 py-4 text-center font-semibold hover:bg-white/10 transition-colors">Find trails near me</Link>
            </div>
            <p className="mt-4 text-xs text-stone-500">No account required · Official conditions should always be verified before starting</p>
          </div>
          <div className="relative lg:pl-4">
            <div className="absolute -inset-5 rounded-[2rem] bg-emerald-300/10 blur-3xl" />
            <div className="relative [&>div]:!mb-0 [&>div]:!max-w-none"><MapPreview /></div>
            <div className="absolute -bottom-5 -left-1 sm:-left-6 rounded-2xl border border-white/10 bg-[#10241c]/95 p-4 shadow-2xl backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-widest text-emerald-300">Top match · 94%</p>
              <p className="mt-1 font-semibold">Sunset Ridge Loop</p>
              <p className="mt-1 text-xs text-stone-400">Easy · 3.2 mi · mild weather</p>
            </div>
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-3">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5 hover:-translate-y-1 hover:border-emerald-200/30 hover:bg-white/[.06] transition-all">
              <div className="flex items-start justify-between"><p className="text-xs uppercase tracking-[.14em] text-stone-500">{action.eyebrow}</p><span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-lg text-emerald-200 group-hover:bg-emerald-200 group-hover:text-[#07130f]">{action.icon}</span></div>
              <h2 className="mt-6 text-xl font-semibold">{action.title}</h2>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-24">
        <div className="grid lg:grid-cols-[.75fr_1.25fr] gap-12">
          <div><p className="text-xs uppercase tracking-[.2em] text-[#d9a14a]">Why Odyssey</p><h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">Less searching.<br />More confidence.</h2></div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {proof.map(([n, title, copy]) => <div key={n} className="grid grid-cols-[44px_1fr] sm:grid-cols-[64px_180px_1fr] gap-3 py-6 items-start"><span className="font-mono text-xs text-emerald-300">{n}</span><h3 className="font-semibold">{title}</h3><p className="col-start-2 sm:col-start-auto text-sm leading-relaxed text-stone-400">{copy}</p></div>)}
          </div>
        </div>
      </section>
    </main>
  );
}
