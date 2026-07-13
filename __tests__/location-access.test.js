// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { LOCATION_ACCESS_KEY, allowLocationAccess, forgetLocationAccess, hasLocationAccess } from '../src/lib/location-access.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe('location access choice', () => {
  it('is denied by default and persists only after an affirmative choice', () => {
    const storage = memoryStorage();
    expect(hasLocationAccess(storage)).toBe(false);
    expect(allowLocationAccess(storage)).toBe(true);
    expect(storage.getItem(LOCATION_ACCESS_KEY)).toBe('allowed');
    expect(hasLocationAccess(storage)).toBe(true);
  });

  it('can be forgotten without clearing unrelated storage', () => {
    const storage = memoryStorage();
    storage.setItem('unrelated', 'keep');
    allowLocationAccess(storage);
    expect(forgetLocationAccess(storage)).toBe(true);
    expect(hasLocationAccess(storage)).toBe(false);
    expect(storage.getItem('unrelated')).toBe('keep');
  });

  it('fails closed when storage is unavailable', () => {
    const unavailable = { getItem: () => { throw new Error('blocked'); } };
    expect(hasLocationAccess(unavailable)).toBe(false);
    expect(allowLocationAccess(null)).toBe(false);
    expect(forgetLocationAccess(null)).toBe(false);
  });
});
