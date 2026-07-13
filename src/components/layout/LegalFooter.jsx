import Link from 'next/link';

const links = [
  ['/legal/terms', 'Terms'],
  ['/legal/privacy', 'Privacy'],
  ['/legal/data-sources', 'Data sources'],
  ['/legal/licenses', 'Licenses'],
  ['/legal/copyright', 'Copyright'],
];

export default function LegalFooter() {
  return (
    <footer className="relative z-30 border-t border-white/10 bg-slate-950 px-5 py-8 pb-28 text-slate-400 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p><span className="font-semibold text-amber-200">Testing build.</span> © 2026 Shilpi Sharma. Not emergency navigation; verify official conditions before every hike.</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-2">
          {links.map(([href, label]) => <Link key={href} href={href} className="hover:text-white">{label}</Link>)}
        </nav>
      </div>
    </footer>
  );
}
