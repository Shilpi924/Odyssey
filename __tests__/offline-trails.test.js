// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createSavedHike, fetchOfflineRoute, isInternalGeometryUrl, isRouteGeometry } from '../src/lib/offline-trails.js';
import { getMapStyle, OFFLINE_MAP_STYLE } from '../src/lib/map-style.js';

describe('offline trail packs', () => {
  const geometry = { type: 'MultiLineString', coordinates: [[[-119.5, 37.7], [-119.4, 37.8]]] };

  it('accepts route lines and rejects unsupported geometry', () => {
    expect(isRouteGeometry(geometry)).toBe(true);
    expect(isRouteGeometry({ type: 'Polygon', coordinates: [] })).toBe(false);
  });

  it('fetches only canonical internal geometry routes', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ geometry })));
    await expect(fetchOfflineRoute({ geometryUrl: '/api/trails/half-dome-jmt/geometry' }, fetchImpl)).resolves.toEqual(geometry);
    await expect(fetchOfflineRoute({ geometryUrl: 'https://attacker.example/geometry' }, fetchImpl)).resolves.toBeNull();
    expect(isInternalGeometryUrl('/api/trails/half-dome-jmt/geometry')).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('persists route geometry with the saved trail facts', () => {
    expect(createSavedHike({ name: 'Half Dome', lat: 37.7, placeId: 'half-dome-jmt' }, geometry, 123)).toMatchObject({
      id: 'Half Dome-37.7',
      route: geometry,
      savedAt: 123,
      offlineRouteStatus: 'ready',
    });
  });

  it('uses a network-free map style while offline', () => {
    expect(getMapStyle('daylight', true)).toBe(OFFLINE_MAP_STYLE);
    expect(JSON.stringify(OFFLINE_MAP_STYLE)).not.toContain('http');
  });
});
