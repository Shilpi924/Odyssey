// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_STADIA_STYLE_URL, MAP_CONFIG, resolveMapStyleUrl } from '../src/lib/map-style.js';

describe('hosted map provider configuration', () => {
  it('defaults to the official Stadia MapLibre style without a client key', () => {
    expect(MAP_CONFIG.provider).toBe('stadia');
    expect(resolveMapStyleUrl()).toBe(DEFAULT_STADIA_STYLE_URL);
    expect(DEFAULT_STADIA_STYLE_URL).not.toContain('api_key');
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
});
