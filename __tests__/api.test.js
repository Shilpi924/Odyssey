// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildUserContext, distanceMiles, POST as smartSearch } from '../src/app/api/smart-search/route.js';
import { buildHikingSearchQuery, POST as fastSearch } from '../src/app/api/fast-search/route.js';

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
  });

  describe('smart search request validation', () => {
    it('returns 400 for an empty JSON body', async () => {
      const response = await smartSearch(new Request('http://localhost/api/smart-search', { method: 'POST' }));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
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
