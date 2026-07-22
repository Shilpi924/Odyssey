import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const PERMISSION_DENIED = 1;

function nativePlatform() {
  return Capacitor.isNativePlatform();
}

function normalizeError(error) {
  const message = error?.message || 'Location is unavailable.';
  const permissionDenied = error?.code === PERMISSION_DENIED
    || error?.code === 'OS-PLUG-GLOC-0003'
    || /permission.*denied/i.test(message);
  return {
    code: permissionDenied ? PERMISSION_DENIED : (error?.code || 2),
    message,
    cause: error,
  };
}

async function ensureNativePermission() {
  const current = await Geolocation.checkPermissions();
  if (current.location === 'granted') return;
  const requested = await Geolocation.requestPermissions({ permissions: ['location'] });
  if (requested.location !== 'granted') {
    throw { code: PERMISSION_DENIED, message: 'Location permission was denied.' };
  }
}

function webGeolocation() {
  return typeof navigator === 'undefined' ? null : navigator.geolocation;
}

export function isGeolocationAvailable() {
  return nativePlatform() || Boolean(webGeolocation());
}

export function getCurrentPosition(onSuccess, onError = () => {}, options = {}) {
  if (!nativePlatform()) {
    const geolocation = webGeolocation();
    if (!geolocation) {
      onError({ code: 2, message: 'Location is not available on this device.' });
      return;
    }
    geolocation.getCurrentPosition(onSuccess, onError, options);
    return;
  }

  ensureNativePermission()
    .then(() => Geolocation.getCurrentPosition(options))
    .then(onSuccess)
    .catch(error => onError(normalizeError(error)));
}

export function watchPosition(onSuccess, onError = () => {}, options = {}) {
  const handle = { cancelled: false, id: null, native: nativePlatform() };

  if (!handle.native) {
    const geolocation = webGeolocation();
    if (!geolocation) {
      onError({ code: 2, message: 'Location is not available on this device.' });
      return handle;
    }
    handle.id = geolocation.watchPosition(onSuccess, onError, options);
    return handle;
  }

  ensureNativePermission()
    .then(() => Geolocation.watchPosition(options, (position, error) => {
      if (handle.cancelled) return;
      if (error) onError(normalizeError(error));
      else if (position) onSuccess(position);
    }))
    .then(async id => {
      handle.id = id;
      if (handle.cancelled) await Geolocation.clearWatch({ id });
    })
    .catch(error => {
      if (!handle.cancelled) onError(normalizeError(error));
    });

  return handle;
}

export function clearWatch(handle) {
  if (!handle) return;
  handle.cancelled = true;
  if (handle.id === null) return;

  if (handle.native) {
    Geolocation.clearWatch({ id: handle.id }).catch(() => {});
  } else {
    webGeolocation()?.clearWatch(handle.id);
  }
}

