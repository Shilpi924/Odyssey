'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_THEME } from '@/lib/theme';

function getSnapshot() {
  return document.documentElement.dataset.theme || DEFAULT_THEME;
}

function getServerSnapshot() {
  return DEFAULT_THEME;
}

function subscribe(onStoreChange) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

export default function useResolvedTheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
