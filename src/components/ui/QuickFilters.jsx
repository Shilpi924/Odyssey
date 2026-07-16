'use client';

import { useId, useState } from 'react';

const FILTERS = [
  { id: 'easy', label: 'Easy', icon: '🟢', group: 'difficulty' },
  { id: 'moderate', label: 'Moderate', icon: '🟡', group: 'difficulty' },
  { id: 'scenic', label: 'Scenic', icon: '📸', group: 'feature' },
];

export default function QuickFilters({ onFilter, activeFilters = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  const toggleFilter = (filter) => {
    const isSelected = activeFilters.includes(filter.id);

    if (isSelected) {
      onFilter(activeFilters.filter(id => id !== filter.id));
      return;
    }

    const withoutSameGroup = filter.group === 'difficulty'
      ? activeFilters.filter(id => !FILTERS.some(option => option.id === id && option.group === 'difficulty'))
      : activeFilters;

    onFilter([...withoutSameGroup, filter.id]);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={activeFilters.length > 0 ? `Filters (${activeFilters.length} active)` : 'Filters'}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(open => !open)}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-semibold text-[var(--app-text)] transition-colors hover:border-[var(--app-primary)]"
      >
        <span aria-hidden="true">⚙</span>
        Filters
        {activeFilters.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--app-primary)] px-1.5 text-[11px] font-bold text-white">
            {activeFilters.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id={panelId}
          className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-[var(--app-border)] bg-[var(--app-raised)] p-3 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--app-text)]">Filter trails</p>
              <p className="mt-0.5 text-xs text-[var(--app-muted)]">Choose one difficulty and any features.</p>
            </div>
            {activeFilters.length > 0 && (
              <button
                type="button"
                onClick={() => onFilter([])}
                className="text-xs font-semibold text-[var(--app-primary)] hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Trail filters">
            {FILTERS.map(filter => {
              const selected = activeFilters.includes(filter.id);
              return (
                <button
                  type="button"
                  key={filter.id}
                  aria-pressed={selected}
                  onClick={() => toggleFilter(filter)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                    selected
                      ? 'border-[var(--app-primary)] bg-[var(--app-primary)] text-white'
                      : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  <span aria-hidden="true">{filter.icon}</span> {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
