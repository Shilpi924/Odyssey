// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { normalizeTrail, validateTrail } from '../src/lib/trails/schema.js';
import { SEARCH_BENCHMARKS, SEARCH_QUALITY_TARGETS } from '../src/lib/trails/search-benchmarks.js';

describe('canonical trail schema', () => {
  it('normalizes a legacy search result without losing its important fields', () => {
    const trail = normalizeTrail({
      placeId: 'half-dome-jmt',
      slug: 'half-dome-via-john-muir-trail',
      name: 'Half Dome via the John Muir Trail',
      lat: 37.7459,
      lng: -119.5332,
      distance: '15.2',
      elevationGain: '4800',
      difficulty: 'Strenuous',
      rating: 4.9,
      userRatingsTotal: 1000,
      features: ['Summit', 'Scenic', 'Scenic'],
      sourceProvider: 'odyssey-curated',
    });

    expect(trail.id).toBe('half-dome-jmt');
    expect(trail.route.distanceMiles).toBe(15.2);
    expect(trail.route.elevationGainFeet).toBe(4800);
    expect(trail.quality.reviewCount).toBe(1000);
    expect(trail.features).toEqual(['Summit', 'Scenic']);
  });

  it('accepts a complete canonical trail', () => {
    const result = validateTrail({
      id: 'el-capitan-trail',
      slug: 'el-capitan-trail',
      name: 'El Capitan Trail',
      trailhead: { lat: 37.7341, lng: -119.6377 },
      difficulty: 'Strenuous',
      route: { type: 'Out and back', distanceMiles: 15.4, elevationGainFeet: 4799 },
      access: { status: 'Open' },
      source: { provider: 'odyssey-curated', license: 'Proprietary' },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.trail.route).toMatchObject({ distanceMiles: 15.4, elevationGainFeet: 4799 });
  });

  it('keeps nested canonical facts when normalization is repeated', () => {
    const canonical = normalizeTrail({
      id: 'repeatable-trail', slug: 'repeatable-trail', name: 'Repeatable Trail',
      trailhead: { lat: 37.7, lng: -119.6 }, difficulty: 'Moderate',
      route: { type: 'Loop', distanceMiles: 4.2, elevationGainFeet: 650 },
      quality: { reviewCount: 12 }, source: { provider: 'test' },
    });
    expect(normalizeTrail(canonical)).toMatchObject({
      route: { type: 'Loop', distanceMiles: 4.2, elevationGainFeet: 650 },
      quality: { reviewCount: 12 },
    });
  });

  it('rejects unsafe or noncanonical values', () => {
    const result = validateTrail({
      id: 'bad-trail',
      slug: 'bad-trail',
      name: 'Bad Trail',
      trailhead: { lat: 120, lng: -119 },
      difficulty: 'Very difficult',
      source: { provider: 'test' },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('difficulty must use a canonical value');
    expect(result.errors).toContain('trailhead.lat must be between -90 and 90');
  });
});

describe('search quality contract', () => {
  it('has stable IDs and explicit entity expectations for every benchmark', () => {
    expect(new Set(SEARCH_BENCHMARKS.map(item => item.id)).size).toBe(SEARCH_BENCHMARKS.length);
    expect(SEARCH_BENCHMARKS.every(item => item.query && item.expectedEntity?.type)).toBe(true);
  });

  it('sets ambitious but measurable initial targets', () => {
    expect(SEARCH_QUALITY_TARGETS.precisionAt5).toBeGreaterThanOrEqual(0.8);
    expect(SEARCH_QUALITY_TARGETS.famousTrailRecall).toBeGreaterThanOrEqual(0.95);
    expect(SEARCH_QUALITY_TARGETS.closedTrailTop5Rate).toBe(0);
  });
});
