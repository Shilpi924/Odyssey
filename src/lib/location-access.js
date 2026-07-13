export const LOCATION_ACCESS_KEY = 'odyssey_location_access_v1';
export const LOCATION_ACCESS_EVENT = 'odyssey:location-access-change';

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  return typeof window === 'undefined' ? null : window.localStorage;
}

function notifyLocationAccessChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(LOCATION_ACCESS_EVENT));
}

export function hasLocationAccess(storage) {
  try {
    return resolveStorage(storage)?.getItem(LOCATION_ACCESS_KEY) === 'allowed';
  } catch {
    return false;
  }
}

export function allowLocationAccess(storage) {
  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    target.setItem(LOCATION_ACCESS_KEY, 'allowed');
  } catch {
    return false;
  }
  notifyLocationAccessChanged();
  return true;
}

export function forgetLocationAccess(storage) {
  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    target.removeItem(LOCATION_ACCESS_KEY);
  } catch {
    return false;
  }
  notifyLocationAccessChanged();
  return true;
}
