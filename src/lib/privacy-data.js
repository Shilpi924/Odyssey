import { LOCATION_ACCESS_KEY } from '@/lib/location-access';

export const SEARCH_AND_PLAN_LOCAL_KEYS = Object.freeze([
  'odyssey_search_history',
  'odysseyHikePlan',
]);

export const SEARCH_SESSION_KEYS = Object.freeze([
  'odyssey_search_cache',
  'odyssey_verified_search_cache_v1',
]);

export const ALL_ODYSSEY_LOCAL_KEYS = Object.freeze([
  ...SEARCH_AND_PLAN_LOCAL_KEYS,
  'userPreferences',
  LOCATION_ACCESS_KEY,
]);

export function clearStorageEntries(storage, keys) {
  if (!storage) return;
  for (const key of keys) storage.removeItem(key);
}

export async function clearTrailRecords(database) {
  await Promise.all([
    database.savedHikes.clear(),
    database.activeHikes.clear(),
    database.activeHikePoints.clear(),
    database.completedActivities?.clear?.(),
  ]);
}

export async function clearBrowserCaches(cacheStorage) {
  if (!cacheStorage) return;
  const names = await cacheStorage.keys();
  await Promise.all(names.map((name) => cacheStorage.delete(name)));
}

export function expireCookie(documentRef, name) {
  if (documentRef) documentRef.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}
