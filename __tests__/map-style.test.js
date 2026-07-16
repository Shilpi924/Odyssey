// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STADIA_DARK_STYLE_URL,
  DEFAULT_STADIA_LIGHT_STYLE_URL,
  DEFAULT_STADIA_STYLE_URL,
  getMapStyleUrl,
  MAP_CONFIG,
  resolveMapStyleUrl,
} from '../src/lib/map-style.js';

describe('hosted map provider configuration', () => {
  it('defaults to the official Stadia MapLibre style without a client key', () => {
    expect(MAP_CONFIG.provider).toBe('stadia');
    expect(resolveMapStyleUrl()).toBe(DEFAULT_STADIA_STYLE_URL);
    expect(DEFAULT_STADIA_STYLE_URL).not.toContain('api_key');
    expect(DEFAULT_STADIA_LIGHT_STYLE_URL).not.toContain('api_key');
  });

  it('uses paired light and dark styles for the resolved app theme', () => {
    expect(getMapStyleUrl('daylight')).toBe(DEFAULT_STADIA_LIGHT_STYLE_URL);
    expect(getMapStyleUrl('alpine')).toBe(DEFAULT_STADIA_DARK_STYLE_URL);
    expect(getMapStyleUrl('meadow')).toBe(DEFAULT_STADIA_DARK_STYLE_URL);
    expect(getMapStyleUrl('sunset')).toBe(DEFAULT_STADIA_DARK_STYLE_URL);
    expect(getMapStyleUrl('future-theme')).toBe(DEFAULT_STADIA_DARK_STYLE_URL);
  });

  it('accepts secure hosted style overrides', () => {
    expect(resolveMapStyleUrl('https://maps.example.com/odyssey/style.json'))
      .toBe('https://maps.example.com/odyssey/style.json');
  });

  it('rejects insecure or invalid style overrides', () => {
    expect(() => resolveMapStyleUrl('http://maps.example.com/style.json')).toThrow('HTTPS');
    expect(() => resolveMapStyleUrl('not a URL')).toThrow('valid URL');
  });

  it('allows an HTTP localhost style during development', () => {
    expect(resolveMapStyleUrl('http://localhost:9000/style.json'))
      .toBe('http://localhost:9000/style.json');
  });

  it('uses an explicit secure fallback when no override is supplied', () => {
    expect(resolveMapStyleUrl('', 'https://maps.example.com/fallback.json'))
      .toBe('https://maps.example.com/fallback.json');
  });
});
