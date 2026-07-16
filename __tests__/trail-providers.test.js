// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { elevationStats, geometryDistanceMiles, relationToMultiLineString, stitchLineSegments } from '../src/lib/trails/geometry.js';
import { fetchCaliforniaStateParksTrailGeometry, fetchNpsAlerts, fetchNpsParkBoundary, fetchOsmRelationGeometry } from '../src/lib/trails/providers.js';

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

  it('parses official California State Parks GeoJSON geometry', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [
      {
        properties: { OBJECTID: 3725, Unit_Nbr: 203, ROUTENAME: 'North Peak Trl' },
        geometry: { type: 'LineString', coordinates: [[-121.91, 37.88], [-121.92, 37.89]] },
      },
      {
        properties: { OBJECTID: 3726, Unit_Nbr: 203, ROUTENAME: 'North Peak Trl' },
        geometry: { type: 'LineString', coordinates: [[-121.92, 37.89], [-121.93, 37.9]] },
      },
    ] }) });
    const geometry = await fetchCaliforniaStateParksTrailGeometry({ featureIds: [3725, 3726], unitNumber: 203 }, fetchImpl);
    expect(geometry).toEqual({
      type: 'MultiLineString',
      coordinates: [[[-121.91, 37.88], [-121.92, 37.89], [-121.93, 37.9]]],
    });
    const requestUrl = new URL(fetchImpl.mock.calls[0][0]);
    expect(requestUrl.searchParams.get('objectIds')).toBe('3725,3726');
    expect(requestUrl.searchParams.get('returnGeometry')).toBe('true');
    expect(requestUrl.searchParams.get('outSR')).toBe('4326');
    expect(requestUrl.searchParams.get('f')).toBe('geojson');
  });

  it('rejects partial or unexpected California State Parks feature coverage', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [
      {
        properties: { OBJECTID: 3725, Unit_Nbr: 203, ROUTENAME: 'North Peak Trl' },
        geometry: { type: 'LineString', coordinates: [[-121.91, 37.88], [-121.92, 37.89]] },
      },
      {
        properties: { OBJECTID: 9999, Unit_Nbr: 203, ROUTENAME: 'Unexpected trail' },
        geometry: { type: 'LineString', coordinates: [[-121.92, 37.89], [-121.93, 37.9]] },
      },
    ] }) });

    await expect(fetchCaliforniaStateParksTrailGeometry(
      { featureIds: [3725, 3726], unitNumber: 203 },
      fetchImpl,
    )).rejects.toThrow('geometry is incomplete or unavailable for the requested features');
  });

  it('rejects a requested feature returned from the wrong park unit', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [{
      properties: { OBJECTID: 3217, Unit_Nbr: 999, ROUTENAME: 'Wrong park trail' },
      geometry: { type: 'LineString', coordinates: [[-121.91, 37.88], [-121.92, 37.89]] },
    }] }) });

    await expect(fetchCaliforniaStateParksTrailGeometry(
      { featureIds: [3217], unitNumber: 203 },
      fetchImpl,
    )).rejects.toThrow('geometry is incomplete or unavailable for the requested features');
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
    await expect(fetchCaliforniaStateParksTrailGeometry({ featureIds: ['bad'] })).rejects.toThrow('Invalid California State Parks feature IDs');
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
