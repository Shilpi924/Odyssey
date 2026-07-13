// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { elevationStats, geometryDistanceMiles, relationToMultiLineString, stitchLineSegments } from '../src/lib/trails/geometry.js';
import { fetchNpsAlerts, fetchNpsParkBoundary, fetchOsmRelationGeometry } from '../src/lib/trails/providers.js';

describe('route geometry', () => {
  it('stitches adjacent and reversed segments', () => {
    expect(stitchLineSegments([[[0, 0], [1, 1]], [[2, 2], [1, 1]]])).toEqual([[[0, 0], [1, 1], [2, 2]]]);
  });

  it('converts relation members and calculates distance', () => {
    const geometry = relationToMultiLineString({ members: [
      { type: 'way', geometry: [{ lat: 37, lon: -119 }, { lat: 37.01, lon: -119 }] },
    ] });
    expect(geometry.type).toBe('MultiLineString');
    expect(geometryDistanceMiles(geometry)).toBeGreaterThan(0.6);
  });

  it('calculates accumulated elevation gain', () => {
    expect(elevationStats([{ elevationFeet: 100 }, { elevationFeet: 150 }, { elevationFeet: 125 }, { elevationFeet: 200 }]))
      .toEqual({ elevationGainFeet: 125, minElevationFeet: 100, maxElevationFeet: 200 });
  });
});

describe('live-data providers', () => {
  it('parses OSM relation geometry through an injected fetch', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ elements: [{ type: 'relation', members: [
      { type: 'way', geometry: [{ lat: 1, lon: 2 }, { lat: 3, lon: 4 }] },
    ] }] }) });
    expect((await fetchOsmRelationGeometry(123, fetchImpl)).coordinates).toHaveLength(1);
  });

  it('normalizes NPS alerts without exposing the API key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: 'a', title: 'Closure', description: 'Closed', category: 'Park Closure', url: 'https://nps.gov', lastIndexedDate: '2026-01-01' }] }) });
    const result = await fetchNpsAlerts('yose', 'secret', fetchImpl);
    expect(result.alerts[0]).toMatchObject({ title: 'Closure', category: 'Park Closure' });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('returns unavailable alerts when no NPS key is configured', async () => {
    expect(await fetchNpsAlerts('yose', '')).toEqual({ available: false, alerts: [], fetchedAt: null });
  });

  it('rejects invalid provider identifiers before making a request', async () => {
    await expect(fetchOsmRelationGeometry('bad')).rejects.toThrow('Invalid OSM relation ID');
    await expect(fetchNpsAlerts('../bad', 'secret')).rejects.toThrow('Invalid NPS park code');
  });

  it('normalizes official NPS boundary geometry', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [{
      properties: { fullName: 'Yosemite National Park' },
      geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] },
    }] }) });
    const feature = await fetchNpsParkBoundary('yose', 'secret', fetchImpl);
    expect(feature.geometry.type).toBe('MultiPolygon');
    expect(feature.properties).toMatchObject({ name: 'Yosemite National Park', parkCode: 'yose' });
  });

  it('rejects malformed NPS boundary data', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) });
    await expect(fetchNpsParkBoundary('yose', 'secret', fetchImpl)).rejects.toThrow('boundary geometry is unavailable');
  });
});
