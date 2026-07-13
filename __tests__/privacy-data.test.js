// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { clearBrowserCaches, clearStorageEntries, clearTrailRecords } from '../src/lib/privacy-data.js';

describe('scoped privacy controls', () => {
  it('removes only the requested storage keys', () => {
    const values = new Map([['search', 'remove'], ['unrelated', 'keep']]);
    const storage = { removeItem: (key) => values.delete(key) };
    clearStorageEntries(storage, ['search']);
    expect(values.get('search')).toBeUndefined();
    expect(values.get('unrelated')).toBe('keep');
  });

  it('clears every local trail and GPS table', async () => {
    const database = {
      savedHikes: { clear: vi.fn().mockResolvedValue(undefined) },
      activeHikes: { clear: vi.fn().mockResolvedValue(undefined) },
      activeHikePoints: { clear: vi.fn().mockResolvedValue(undefined) },
    };
    await clearTrailRecords(database);
    expect(database.savedHikes.clear).toHaveBeenCalledOnce();
    expect(database.activeHikes.clear).toHaveBeenCalledOnce();
    expect(database.activeHikePoints.clear).toHaveBeenCalledOnce();
  });

  it('deletes each cache owned by the current origin', async () => {
    const cacheStorage = {
      keys: vi.fn().mockResolvedValue(['pages', 'cross-origin']),
      delete: vi.fn().mockResolvedValue(true),
    };
    await clearBrowserCaches(cacheStorage);
    expect(cacheStorage.delete).toHaveBeenCalledTimes(2);
    expect(cacheStorage.delete).toHaveBeenCalledWith('pages');
    expect(cacheStorage.delete).toHaveBeenCalledWith('cross-origin');
  });
});
