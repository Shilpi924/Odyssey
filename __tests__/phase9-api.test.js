// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getGeometry } from '../src/app/api/trails/[id]/geometry/route.js';
import { GET as getParkAlerts } from '../src/app/api/park-alerts/route.js';
import { GET as getParkBoundary } from '../src/app/api/parks/[code]/boundary/route.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('trail geometry API', () => {
  it('returns 404 for an unknown trail', async () => {
    const response = await getGeometry(new Request('http://localhost/api/trails/nope/geometry'), { params: Promise.resolve({ id: 'nope' }) });
    expect(response.status).toBe(404);
  });

  it('returns 404 when a trail has no geometry source', async () => {
    const response = await getGeometry(new Request('http://localhost/api/trails/bridalveil-fall-trail/geometry'), { params: Promise.resolve({ id: 'bridalveil-fall-trail' }) });
    expect(response.status).toBe(404);
  });

  it('returns sourced geometry and calculated distance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ elements: [{ type: 'relation', members: [
      { type: 'way', geometry: [{ lat: 37, lon: -119 }, { lat: 37.01, lon: -119 }] },
    ] }] }) }));
    const response = await getGeometry(new Request('http://localhost/api/trails/half-dome-jmt/geometry'), { params: Promise.resolve({ id: 'half-dome-jmt' }) });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.distanceMiles).toBeGreaterThan(0);
    expect(data.source).toMatchObject({ provider: 'osm', relationId: 16315186 });
  });

  it('returns California State Parks geometry for Mount Diablo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [{
      properties: { OBJECTID: 3217, Unit_Nbr: 203, ROUTENAME: 'Mary Bowerman Trl' },
      geometry: { type: 'LineString', coordinates: [[-121.917, 37.881], [-121.915, 37.883]] },
    }] }) }));
    const response = await getGeometry(new Request('http://localhost/api/trails/mount-diablo-mary-bowerman-trail/geometry'), { params: Promise.resolve({ id: 'mount-diablo-mary-bowerman-trail' }) });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.distanceMiles).toBeGreaterThan(0);
    expect(data.source).toMatchObject({ provider: 'ca-state-parks-arcgis', featureIds: [3217] });
  });

  it('returns 502 when the geometry provider is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const response = await getGeometry(new Request('http://localhost/api/trails/half-dome-jmt/geometry'), { params: Promise.resolve({ id: 'half-dome-jmt' }) });
    expect(response.status).toBe(502);
  });
});

describe('park alerts API', () => {
  it('rejects unsupported park codes', async () => {
    const response = await getParkAlerts(new Request('http://localhost/api/park-alerts?parkCode=bad'));
    expect(response.status).toBe(400);
  });

  it('returns a graceful unavailable response without a key', async () => {
    const previous = process.env.NPS_API_KEY;
    delete process.env.NPS_API_KEY;
    const response = await getParkAlerts(new Request('http://localhost/api/park-alerts?parkCode=yose'));
    if (previous) process.env.NPS_API_KEY = previous;
    expect(await response.json()).toMatchObject({ available: false, alerts: [] });
  });
});

describe('park boundary API', () => {
  it('rejects unsupported parks', async () => {
    const response = await getParkBoundary(new Request('http://localhost'), { params: Promise.resolve({ code: 'bad' }) });
    expect(response.status).toBe(400);
  });

  it('returns an official boundary feature', async () => {
    const previous = process.env.NPS_API_KEY;
    process.env.NPS_API_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [{
      properties: { fullName: 'Yosemite National Park' },
      geometry: { type: 'MultiPolygon', coordinates: [] },
    }] }) }));
    const response = await getParkBoundary(new Request('http://localhost'), { params: Promise.resolve({ code: 'yose' }) });
    if (previous) process.env.NPS_API_KEY = previous;
    else delete process.env.NPS_API_KEY;
    expect(response.status).toBe(200);
    expect((await response.json()).geometry.type).toBe('MultiPolygon');
  });
});
