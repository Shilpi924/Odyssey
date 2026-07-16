// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { buildUserContext, distanceMiles, POST as smartSearch } from '../src/app/api/smart-search/route.js';
import { buildHikingSearchQuery, POST as fastSearch } from '../src/app/api/fast-search/route.js';
import { searchVerifiedTrails } from '../src/lib/trails/search-response.js';

describe('Smart Search API Helpers', () => {
  describe('buildHikingSearchQuery', () => {
    it('adds difficulty and trail intent to broad destination searches', () => {
      expect(buildHikingSearchQuery('Yosemite', { hiking: { difficulty: ['Moderate'] } })).toBe('Moderate hiking trails Yosemite');
    });

    it('keeps fallback provider queries generic instead of hardcoding a trail', () => {
      expect(buildHikingSearchQuery('Zion National Park', { hiking: { difficulty: ['Strenuous'] } }))
        .toBe('Strenuous hiking trails Zion National Park');
    });
  });

  describe('catalog-backed fast search', () => {
    it('returns Yosemite results without requiring Google Places', async () => {
      const request = new Request('http://localhost/api/fast-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: 37.8651,
          lng: -119.5383,
          query: 'strenuous hikes in Yosemite',
          preferences: { hiking: { difficulty: ['Strenuous'] } },
        }),
      });
      const response = await fastSearch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.source).toBe('catalog');
      expect(data.trails.map(trail => trail.placeId)).toEqual(expect.arrayContaining(['half-dome-jmt', 'el-capitan-trail']));
    });

    it('expands uncataloged destination searches with community trail data', async () => {
      const requests = [];
      const fetchImpl = async (url) => {
        requests.push(String(url));
        if (String(url).includes('nominatim')) return new Response(JSON.stringify([{
          lat: '37.2982', lon: '-113.0263', display_name: 'Zion National Park, Utah',
        }]));
        return new Response(JSON.stringify({ elements: [{
          type: 'way', id: 42, center: { lat: 37.3, lon: -113.03 },
          tags: { name: 'Summit Trail', highway: 'path' },
        }] }));
      };
      const data = await searchVerifiedTrails({
        lat: 37.2,
        lng: -122.0,
        query: 'Zion National Park',
        fetchImpl,
      });

      expect(data.source).toBe('openstreetmap');
      expect(data.trails).toEqual([expect.objectContaining({ name: 'Summit Trail', sourceKind: 'community' })]);
      expect(data.coverage.verified).toBe(false);
      expect(requests[0]).toContain('q=Zion+National+Park');
      expect(requests[1]).toContain('37.298%2C-113.026');
    });

    it('returns verified Mount Diablo results without a community-provider request', async () => {
      const fetchImpl = vi.fn();
      const data = await searchVerifiedTrails({
        lat: 37.77,
        lng: -122.42,
        query: 'Diablo hike',
        fetchImpl,
      });

      expect(fetchImpl).not.toHaveBeenCalled();
      expect(data.source).toBe('catalog');
      expect(data.coverage.verified).toBe(true);
      expect(data.coverage.supportedParkIds).toEqual(expect.arrayContaining(['nps-yose', 'ca-sp-mount-diablo']));
      expect(data.attribution).toEqual(['Source: California State Parks']);
      expect(data.trails.map(trail => trail.name)).toEqual(expect.arrayContaining(['Mary Bowerman Trail', 'Juniper Trail to Summit']));
      expect(data.trails.every(trail => trail.placeId.startsWith('mount-diablo-'))).toBe(true);
      expect(data.trails.every(trail => trail.distance == null)).toBe(true);
      expect(data.trails.find(trail => trail.name === 'Juniper Trail to Summit')).toMatchObject({
        difficulty: 'Moderate',
        difficultyMethod: 'odyssey-distance-elevation-v1',
      });
    });

    it('resolves near-me searches only when coordinates fall in verified coverage', async () => {
      const response = await fastSearch(new Request('http://localhost/api/fast-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: 37.75, lng: -119.58, query: 'near me' }),
      }));
      const data = await response.json();
      expect(data.coverage.verified).toBe(true);
      expect(data.trails.length).toBeGreaterThan(0);
    });

    it('uses reduced-precision device coordinates for near-me community search', async () => {
      const requests = [];
      const data = await searchVerifiedTrails({
        lat: 37.7749295,
        lng: -122.4194155,
        query: 'hikes near me',
        fetchImpl: async (url) => {
          requests.push(String(url));
          return new Response(JSON.stringify({ elements: [{
            type: 'relation', id: 99, center: { lat: 37.802, lon: -122.456 },
            tags: { name: 'Bay Area Ridge Trail', type: 'route', route: 'hiking' },
          }] }));
        },
      });

      expect(data.trails[0]).toMatchObject({ name: 'Bay Area Ridge Trail', sourceAttribution: '© OpenStreetMap contributors' });
      expect(requests).toHaveLength(1);
      expect(requests[0]).toContain('37.775%2C-122.419');
      expect(requests[0]).not.toContain('37.7749295');
    });

    it('uses verified Mount Diablo coverage for nearby coordinates', async () => {
      const fetchImpl = vi.fn();
      const data = await searchVerifiedTrails({
        lat: 37.88,
        lng: -121.92,
        query: 'hikes near me',
        fetchImpl,
      });
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(data.source).toBe('catalog');
      expect(data.entity).toMatchObject({ id: 'ca-sp-mount-diablo' });
      expect(data.trails.length).toBeGreaterThan(0);
      const distances = data.trails.map(trail => Number(trail.distance));
      expect(distances).toEqual([...distances].sort((a, b) => a - b));
    });

    it('preserves natural near-me filters and uses the supplied origin', async () => {
      const fetchImpl = vi.fn();
      const data = await searchVerifiedTrails({
        lat: 37.88,
        lng: -121.92,
        query: 'easy scenic hikes near me',
        fetchImpl,
      });

      expect(fetchImpl).not.toHaveBeenCalled();
      expect(data.source).toBe('catalog');
      expect(data.filters).toMatchObject({ difficulties: ['Easy'], features: ['Scenic'] });
      expect(data.trails.map(trail => trail.placeId)).toContain('mount-diablo-mary-bowerman-trail');
      expect(data.trails.every(trail => trail.distance != null)).toBe(true);
    });

    it.each(['hikes by my current location', 'trails nearby'])('treats "%s" as device-location intent', async query => {
      const requests = [];
      const data = await searchVerifiedTrails({
        lat: 37.7749295,
        lng: -122.4194155,
        query,
        fetchImpl: async url => {
          requests.push(String(url));
          return new Response(JSON.stringify({ elements: [{
            type: 'way', id: 100, center: { lat: 37.78, lon: -122.42 },
            tags: { name: 'Nearby Trail', highway: 'path' },
          }] }));
        },
      });

      expect(data.trails[0]).toMatchObject({ name: 'Nearby Trail' });
      expect(requests).toHaveLength(1);
      expect(requests[0]).toContain('37.775%2C-122.419');
      expect(requests[0]).not.toContain('nominatim');
    });
  });

  describe('smart search request validation', () => {
    it('returns 400 for an empty JSON body', async () => {
      const response = await smartSearch(new Request('http://localhost/api/smart-search', { method: 'POST' }));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
    });

    it('uses the same sourced catalog for detailed requests', async () => {
      const response = await smartSearch(new Request('http://localhost/api/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: 37.8, lng: -119.5, naturalLanguageQuery: 'strenuous hikes in Yosemite', preferences: { hiking: { difficulty: ['Strenuous'] } } }),
      }));
      const data = await response.json();
      expect(data.source).toBe('catalog');
      expect(data._routedBy).toBe('verifiedCatalog');
      expect(data.weather).toBeNull();
      expect(data.trails.map(trail => trail.placeId)).toContain('half-dome-jmt');
      expect(data.trails.every(trail => !('estimatedWeeklyVisitors' in trail))).toBe(true);
    });
  });
  describe('distanceMiles', () => {
    it('calculates the correct distance between two points', () => {
      // New York City to Los Angeles (approx 2445 miles)
      const dist = distanceMiles(40.7128, -74.0060, 34.0522, -118.2437);
      expect(dist).toBeCloseTo(2445, -1);
    });

    it('returns 0 for the same point', () => {
      const dist = distanceMiles(40.7128, -74.0060, 40.7128, -74.0060);
      expect(dist).toBe(0);
    });
  });

  describe('buildUserContext', () => {
    it('returns empty string if no preferences', () => {
      expect(buildUserContext({})).toBe('');
    });

    it('formats hiking difficulty correctly', () => {
      const context = buildUserContext({
        hiking: { difficulty: ['Easy', 'Moderate'] }
      });
      expect(context).toContain('Preferred difficulty: Easy, Moderate');
    });

    it('formats accessibility and group dynamics correctly', () => {
      const context = buildUserContext({
        groupDynamics: 'My 80-year-old mom',
        accessibility: ['Wheelchair Accessible', 'Paved Paths']
      });
      expect(context).toContain('Group Dynamics: My 80-year-old mom');
      expect(context).toContain('Accessibility Needs: Wheelchair Accessible, Paved Paths');
    });

    it('handles a complete profile', () => {
      const context = buildUserContext({
        hiking: { difficulty: ['Strenuous'], features: ['Shaded', 'Water'], length: 'long', elevation: 'steep' },
        activityLevel: 'Extreme',
        travelWith: 'Solo',
        groupDynamics: 'Just me pushing limits',
        interests: ['Hiking', 'Nature'],
        accessibility: []
      });
      expect(context).toContain('Preferred difficulty: Strenuous');
      expect(context).toContain('Features: shaded, water');
      expect(context).toContain('Length: 5–10 miles');
      expect(context).toContain('Elevation: steep');
      expect(context).toContain('Fitness: Extreme');
      expect(context).toContain('With: Solo');
      expect(context).toContain('Group Dynamics: Just me pushing limits');
      expect(context).toContain('Interests: Hiking, Nature');
    });
  });
});
