'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const NAV_ITEMS = [
  { id: 'home', label: 'Discover', icon: '🧭', href: '/' },
  { id: 'map', label: 'Map', icon: '🗺️', href: '/search' },
  { id: 'activities', label: 'Activity', icon: '🥾', href: '/activities' },
  { id: 'saved', label: 'Saved', icon: '💾', href: '/saved' },
  { id: 'personalize', label: 'Profile', icon: '👤', href: '/personalize' },
];

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = pathname === '/search'
    ? (searchParams.get('view') === 'map' ? 'map' : 'home')
    : NAV_ITEMS.find(item => item.href === pathname)?.id || 'home';

  const handleNav = (item) => {
    if (item.id !== 'map') {
      router.push(item.href);
      return;
    }

    const params = pathname === '/search'
      ? new URLSearchParams(searchParams.toString())
      : new URLSearchParams();
    params.set('view', 'map');
    router.push(`/search?${params.toString()}#trail-map`);
  };

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="border-t border-[var(--app-border)] bg-[var(--app-bg)]/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="grid grid-cols-5 gap-1">
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                type="button"
                key={item.id}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleNav(item)}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-[var(--app-primary)]/15 text-[var(--app-primary)]'
                    : 'text-[var(--app-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]'
                }`}
              >
                <span aria-hidden="true" className="text-xl leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
