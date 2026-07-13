'use client';

import { useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { hasLocationAccess } from '@/lib/location-access';
import { DEFAULT_THEME, isDaylight, normalizeDisplayPreferences, resolveTheme, serializeDisplayPreferences, THEME_COOKIE } from '@/lib/theme';

export function applyDisplayPreferences(preferences = {}, environment = {}) {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  const display = normalizeDisplayPreferences(preferences);
  const theme = resolveTheme(display, {
    hour: environment.hour ?? new Date().getHours(),
    systemDark: environment.systemDark ?? window.matchMedia?.('(prefers-color-scheme: dark)').matches,
    isDaytime: environment.coords ? isDaylight(new Date(), environment.coords) : undefined,
  });
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.contrast = display.highContrast ? 'high' : 'standard';
  document.documentElement.dataset.motion = display.reducedMotion ? 'reduced' : 'full';
  if (environment.persistCookie) {
    document.cookie = `${THEME_COOKIE}=${serializeDisplayPreferences(display, theme)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }
  return theme;
}

export default function ThemeProvider({ children, initialDisplay }) {
  const { data: session } = useSession();

  const loadAndApply = useCallback(() => {
    let preferences = initialDisplay;
    try {
      const saved = JSON.parse(localStorage.getItem('userPreferences') || '{}');
      if (Object.keys(saved).length) preferences = saved;
    } catch {
      // Ignore malformed local preferences and retain the server-provided display.
    }
    const theme = applyDisplayPreferences(preferences, { persistCookie: true });
    if (normalizeDisplayPreferences(preferences).themeMode === 'scheduled' && hasLocationAccess() && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => applyDisplayPreferences(preferences, { coords, persistCookie: true }),
        () => {},
        { maximumAge: 60 * 60 * 1000, timeout: 3000 }
      );
    }
    return theme;
  }, [initialDisplay]);

  useEffect(() => {
    loadAndApply();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => loadAndApply();
    media.addEventListener?.('change', handleChange);
    const timer = window.setInterval(handleChange, 60_000);
    return () => {
      media.removeEventListener?.('change', handleChange);
      window.clearInterval(timer);
    };
  }, [loadAndApply, session?.user?.id]);

  return children;
}
