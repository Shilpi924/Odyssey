// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const capacitor = vi.hoisted(() => ({ isNativePlatform: vi.fn(() => false) }));
const geolocation = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: capacitor }));
vi.mock('@capacitor/geolocation', () => ({ Geolocation: geolocation }));

import { clearWatch, getCurrentPosition, isGeolocationAvailable, watchPosition } from '../src/lib/device-geolocation.js';

describe('device geolocation adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capacitor.isNativePlatform.mockReturnValue(false);
    delete global.navigator;
  });

  it('fails closed when no location provider exists', () => {
    const onError = vi.fn();
    expect(isGeolocationAvailable()).toBe(false);
    getCurrentPosition(vi.fn(), onError);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 2 }));
  });

  it('delegates to browser geolocation on the web', () => {
    const browser = { getCurrentPosition: vi.fn(), watchPosition: vi.fn(() => 7), clearWatch: vi.fn() };
    global.navigator = { geolocation: browser };
    const success = vi.fn();
    getCurrentPosition(success, vi.fn(), { timeout: 1000 });
    expect(browser.getCurrentPosition).toHaveBeenCalledWith(success, expect.any(Function), { timeout: 1000 });
    const handle = watchPosition(success);
    clearWatch(handle);
    expect(browser.clearWatch).toHaveBeenCalledWith(7);
  });

  it('requests native permission before reading GPS', async () => {
    capacitor.isNativePlatform.mockReturnValue(true);
    geolocation.checkPermissions.mockResolvedValue({ location: 'prompt' });
    geolocation.requestPermissions.mockResolvedValue({ location: 'granted' });
    geolocation.getCurrentPosition.mockResolvedValue({ coords: { latitude: 1, longitude: 2 } });
    const success = vi.fn();
    getCurrentPosition(success, vi.fn());
    await vi.waitFor(() => expect(success).toHaveBeenCalled());
    expect(geolocation.requestPermissions).toHaveBeenCalledWith({ permissions: ['location'] });
  });

  it('normalizes native permission denial', async () => {
    capacitor.isNativePlatform.mockReturnValue(true);
    geolocation.checkPermissions.mockResolvedValue({ location: 'denied' });
    geolocation.requestPermissions.mockResolvedValue({ location: 'denied' });
    const onError = vi.fn();
    getCurrentPosition(vi.fn(), onError);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 1 })));
  });
});
