import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME,
  getLocalSunWindow,
  isDarkTheme,
  isDaylight,
  normalizeDisplayPreferences,
  parseDisplayPreferences,
  resolveTheme,
  serializeDisplayPreferences,
} from '../src/lib/theme';
import { applyDisplayPreferences } from '../src/components/ThemeProvider';
import useResolvedTheme from '../src/hooks/useResolvedTheme';

function ThemeProbe() {
  const theme = useResolvedTheme();
  return createElement('output', { 'aria-label': 'Resolved theme' }, theme);
}

afterEach(() => {
  cleanup();
});

describe('display theme preferences', () => {
  it('normalizes invalid and missing values safely', () => {
    expect(normalizeDisplayPreferences({ theme: 'neon', themeMode: 'random' })).toEqual({
      theme: DEFAULT_THEME,
      themeMode: 'manual',
      highContrast: false,
      reducedMotion: false,
    });
  });

  it('keeps valid accessibility preferences independent of theme', () => {
    expect(normalizeDisplayPreferences({ theme: 'sunset', highContrast: true, reducedMotion: true })).toMatchObject({
      theme: 'sunset', highContrast: true, reducedMotion: true,
    });
  });

  it('resolves a manual theme directly', () => {
    expect(resolveTheme({ theme: 'meadow', themeMode: 'manual' })).toBe('meadow');
  });

  it('matches system light and dark appearances', () => {
    const preferences = { theme: 'sunset', themeMode: 'system' };
    expect(resolveTheme(preferences, { systemDark: false })).toBe('daylight');
    expect(resolveTheme(preferences, { systemDark: true })).toBe('sunset');
  });

  it('identifies light and dark theme metadata for map styling', () => {
    expect(isDarkTheme('daylight')).toBe(false);
    expect(isDarkTheme('alpine')).toBe(true);
    expect(isDarkTheme('future-theme')).toBe(true);
  });

  it('uses Alpine for a dark system when Daylight is selected', () => {
    expect(resolveTheme({ theme: 'daylight', themeMode: 'system' }, { systemDark: true })).toBe('alpine');
  });

  it('switches scheduled appearance at daylight boundaries', () => {
    const preferences = { theme: 'meadow', themeMode: 'scheduled' };
    expect(resolveTheme(preferences, { isDaytime: true })).toBe('daylight');
    expect(resolveTheme(preferences, { isDaytime: false })).toBe('meadow');
  });

  it('uses safe sunrise and sunset fallback without coordinates', () => {
    expect(getLocalSunWindow(new Date(2026, 6, 11))).toEqual({ sunrise: 420, sunset: 1080, estimated: true });
    expect(isDaylight(new Date(2026, 6, 11, 12))).toBe(true);
    expect(isDaylight(new Date(2026, 6, 11, 22))).toBe(false);
  });

  it('calculates a valid local solar window from coordinates', () => {
    const window = getLocalSunWindow(new Date(2026, 6, 11, 12), { latitude: 37.77, longitude: -122.42 });
    expect(window.estimated).toBe(false);
    expect(window.sunrise).toBeLessThan(window.sunset);
    expect(window.sunrise).toBeGreaterThan(0);
    expect(window.sunset).toBeLessThan(1440);
  });

  it('round-trips display cookies and rejects malformed cookies', () => {
    const encoded = serializeDisplayPreferences({ theme: 'sunset', themeMode: 'scheduled', highContrast: true }, 'daylight');
    expect(parseDisplayPreferences(encoded)).toMatchObject({ theme: 'sunset', themeMode: 'scheduled', highContrast: true, resolvedTheme: 'daylight' });
    expect(parseDisplayPreferences('%not-json')).toMatchObject({ theme: DEFAULT_THEME, resolvedTheme: DEFAULT_THEME });
  });

  it('applies theme and accessibility datasets to the document', () => {
    const resolved = applyDisplayPreferences({ theme: 'meadow', highContrast: true, reducedMotion: true }, { hour: 12, systemDark: true });
    expect(resolved).toBe('meadow');
    expect(document.documentElement.dataset.theme).toBe('meadow');
    expect(document.documentElement.dataset.contrast).toBe('high');
    expect(document.documentElement.dataset.motion).toBe('reduced');
  });

  it('updates map consumers when the resolved document theme changes', async () => {
    document.documentElement.dataset.theme = 'alpine';
    render(createElement(ThemeProbe));
    expect(screen.getByLabelText('Resolved theme')).toHaveTextContent('alpine');

    act(() => {
      document.documentElement.dataset.theme = 'daylight';
    });
    await waitFor(() => expect(screen.getByLabelText('Resolved theme')).toHaveTextContent('daylight'));
  });
});
