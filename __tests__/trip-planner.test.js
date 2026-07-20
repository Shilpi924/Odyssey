import { describe, expect, it } from 'vitest';
import { buildTripPlan, estimateTrailMinutes, validateTripRequest } from '@/lib/trip-planner';

const trails = [
  {
    name: 'Source Trail',
    placeId: 'source-trail',
    vicinity: 'Summit Area, CA',
    difficulty: 'Moderate',
    length: '4 miles',
    elevationGain: '900 ft',
    routeType: 'Loop',
    access: { status: 'Unknown' },
    sourceKind: 'verified-catalog',
    sourceAttribution: 'Source: Park Service',
    sourceUrl: 'https://example.gov/trail',
  },
  {
    name: 'Sparse Trail',
    placeId: 'sparse-trail',
    vicinity: 'Valley, CA',
    difficulty: null,
    length: null,
    elevationGain: null,
    routeType: 'Point to point',
    sourceKind: 'verified-catalog',
    sourceAttribution: 'Source: Park Service',
    sourceUrl: 'https://example.gov/sparse',
  },
];

describe('trip planner', () => {
  it('sanitizes bounded planning input', () => {
    const result = validateTripRequest({ destination: '  Mount   Diablo  ', days: 99, difficulty: 'Impossible', group: ['Solo', 'Unknown'], notes: 'x'.repeat(600) });
    expect(result.valid).toBe(true);
    expect(result.value).toMatchObject({ destination: 'Mount Diablo', days: 7, difficulty: 'Any', group: ['Solo'] });
    expect(result.value.notes).toHaveLength(500);
  });

  it('rejects an empty destination', () => {
    expect(validateTripRequest({ destination: ' ' })).toMatchObject({ valid: false });
  });

  it('estimates time only when route length is sourced', () => {
    expect(estimateTrailMinutes(trails[0])).toBe(150);
    expect(estimateTrailMinutes(trails[1])).toBeNull();
  });

  it('preserves unknown facts and attaches a source to every day', () => {
    const request = validateTripRequest({ destination: 'Mount Diablo', days: 2, needs: ['Accessible restroom'] }).value;
    const plan = buildTripPlan(request, { trails, entity: { name: 'Mount Diablo' }, coverage: { verified: true, message: 'Verified coverage.' } });
    expect(plan.days).toHaveLength(2);
    expect(plan.days[0]).toMatchObject({ name: 'Source Trail', distance: '4 miles', sourceId: 'source-1' });
    expect(plan.days[1].distance).toBe('Not supplied by source');
    expect(plan.sources[0].url).toBe('https://example.gov/trail');
    expect(plan.unknowns.join(' ')).toContain('not supplied');
    expect(plan.grounding).toBe('verified-catalog');
  });

  it('prioritizes an explicitly sourced preference without inventing suitability', () => {
    const shaded = { ...trails[1], name: 'Shaded Trail', features: ['Shaded'] };
    const request = validateTripRequest({ destination: 'Mount Diablo', days: 1, needs: ['Shade preferred'] }).value;
    const plan = buildTripPlan(request, { trails: [trails[0], shaded], coverage: { verified: true } });
    expect(plan.days[0].name).toBe('Shaded Trail');
    expect(plan.days[0].matchReasons).toContain('Source data lists shade');
  });
});
