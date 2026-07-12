// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  auditCatalog, getCatalogAttributions, getParksContainingPoint,
  getTrailsByParkId, pointInParkSearchBoundary,
} from '../src/lib/trails/catalog.js';
import { YOSEMITE_PARK } from '../src/data/catalog/parks/yosemite.js';

describe('Phase 2 Yosemite trail catalog', () => {
  it('contains a valid initial Yosemite catalog', () => {
    const audit = auditCatalog();
    expect(audit.valid).toBe(true);
    expect(audit.parkCount).toBe(1);
    expect(audit.trailCount).toBeGreaterThanOrEqual(10);
  });

  it('returns famous and family-friendly trails by park relationship', () => {
    const trails = getTrailsByParkId('nps-yose');
    expect(trails.map(trail => trail.id)).toEqual(expect.arrayContaining([
      'half-dome-jmt', 'el-capitan-trail', 'lower-yosemite-fall-trail', 'bridalveil-fall-trail',
    ]));
  });

  it('indexes points against the Yosemite search boundary', () => {
    expect(pointInParkSearchBoundary({ lat: 37.7459, lng: -119.5332 }, YOSEMITE_PARK)).toBe(true);
    expect(getParksContainingPoint({ lat: 37.7749, lng: -122.4194 })).toEqual([]);
  });

  it('returns required source attribution', () => {
    expect(getCatalogAttributions(getTrailsByParkId('nps-yose'))).toContain('Source: National Park Service');
  });
});

