import Link from 'next/link';
import Logo from '@/components/Logo';

export default function LegalPage({ title, description, children }) {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-5 pb-24 text-[var(--app-text)] sm:px-8">
      <header className="mx-auto flex max-w-4xl items-center justify-between border-b border-white/10 py-5">
        <Link href="/" className="flex items-center gap-3"><Logo size={36} /><span className="text-sm font-bold tracking-[.14em]">ODYSSEY</span></Link>
        <Link href="/" className="text-sm text-stone-400 hover:text-white">Back home</Link>
      </header>
      <article className="mx-auto max-w-4xl py-12 sm:py-16">
        <p className="text-xs uppercase tracking-[.2em] text-emerald-300">Legal &amp; trust</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-400">{description}</p>
        <p className="mt-4 text-xs text-stone-500">Effective July 13, 2026</p>
        <div className="mt-10 space-y-8 text-sm leading-7 text-stone-300 [&_a]:text-emerald-300 [&_a]:underline [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3">
          {children}
        </div>
      </article>
    </main>
  );
}
