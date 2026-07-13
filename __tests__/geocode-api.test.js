// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as geocode } from '../src/app/api/geocode/route.js';

const originalKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalKey) process.env.GOOGLE_MAPS_SERVER_API_KEY = originalKey;
  else delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
});

describe('server geocoding API', () => {
  it('requires an address or valid coordinates', async () => {
    expect((await geocode(new Request('http://localhost/api/geocode'))).status).toBe(400);
    expect((await geocode(new Request('http://localhost/api/geocode?lat=100&lng=1'))).status).toBe(400);
  });

  it('requires the server-only Google key', async () => {
    delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    expect((await geocode(new Request('http://localhost/api/geocode?address=Yosemite'))).status).toBe(503);
  });

  it('uses address lookup without substituting zero coordinates', async () => {
    process.env.GOOGLE_MAPS_SERVER_API_KEY = 'secret';
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'OK', results: [{
      formatted_address: 'Yosemite National Park, CA', place_id: 'place', geometry: { location: { lat: 37.8, lng: -119.5 } },
    }] }) });
    vi.stubGlobal('fetch', fetchImpl);
    const response = await geocode(new Request('http://localhost/api/geocode?address=Yosemite'));
    const requestedUrl = fetchImpl.mock.calls[0][0];
    expect(requestedUrl.searchParams.get('address')).toBe('Yosemite');
    expect(requestedUrl.searchParams.has('latlng')).toBe(false);
    expect(await response.json()).toMatchObject({ label: 'Yosemite National Park, CA', location: { lat: 37.8, lng: -119.5 } });
  });

  it('returns 404 for zero results', async () => {
    process.env.GOOGLE_MAPS_SERVER_API_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ZERO_RESULTS', results: [] }) }));
    expect((await geocode(new Request('http://localhost/api/geocode?lat=1&lng=2'))).status).toBe(404);
  });

  it('returns 502 for an upstream failure', async () => {
    process.env.GOOGLE_MAPS_SERVER_API_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    expect((await geocode(new Request('http://localhost/api/geocode?lat=1&lng=2'))).status).toBe(502);
  });
});
