// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  auditCatalog, getCatalogAttributions, getParksContainingPoint,
  getTrailsByParkId, pointInParkSearchBoundary,
} from '../src/lib/trails/catalog.js';
import { YOSEMITE_PARK } from '../src/data/catalog/parks/yosemite.js';
import { MOUNT_DIABLO_PARK } from '../src/data/catalog/parks/mount-diablo.js';

describe('verified trail catalog', () => {
  it('contains valid Yosemite and Mount Diablo catalogs', () => {
    const audit = auditCatalog();
    expect(audit.valid).toBe(true);
    expect(audit.parkCount).toBeGreaterThanOrEqual(2);
    expect(audit.trailCount).toBeGreaterThanOrEqual(50);
  });

  it('covers Yosemite regions beyond the Valley', () => {
    const regions = new Set(getTrailsByParkId('nps-yose').map(trail => trail.geography.region));
    expect([...regions]).toEqual(expect.arrayContaining(['Yosemite Valley', 'Glacier Point Road', 'Tuolumne Meadows', 'Mariposa Grove', 'Hetch Hetchy', 'Wawona']));
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

  it('indexes Mount Diablo trailheads inside its discovery envelope', () => {
    const trails = getTrailsByParkId('ca-sp-mount-diablo');
    expect(trails).toHaveLength(7);
    expect(trails.every(trail => pointInParkSearchBoundary(trail.trailhead, MOUNT_DIABLO_PARK))).toBe(true);
    expect(getParksContainingPoint({ lat: 37.88, lng: -121.92 }).map(park => park.id)).toContain('ca-sp-mount-diablo');
  });

  it('keeps Mount Diablo facts and geometry tied to California State Parks', () => {
    const trails = getTrailsByParkId('ca-sp-mount-diablo');
    expect(trails.map(trail => trail.id)).toEqual(expect.arrayContaining([
      'mount-diablo-mary-bowerman-trail', 'mount-diablo-juniper-trail-to-summit', 'mount-diablo-falls-trail',
      'mount-diablo-curry-point-to-summit',
    ]));
    expect(trails.every(trail => trail.source.provider === 'ca-state-parks')).toBe(true);
    expect(trails.filter(trail => trail.source.geometry).every(trail => trail.source.geometry.provider === 'ca-state-parks-arcgis')).toBe(true);
    const curryPoint = trails.find(trail => trail.id === 'mount-diablo-curry-point-to-summit');
    expect(curryPoint).toMatchObject({
      difficulty: 'Strenuous',
      route: { distanceMiles: 8.2, elevationGainFeet: 2500 },
    });
    expect(curryPoint.source.geometry).toBeNull();
    expect(getCatalogAttributions(trails)).toEqual(['Source: California State Parks']);
  });

  it('returns required source attribution', () => {
    expect(getCatalogAttributions(getTrailsByParkId('nps-yose'))).toContain('Source: National Park Service');
  });
});
