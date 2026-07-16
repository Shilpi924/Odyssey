// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { destinationTerms, osmElementsToTrails } from '../src/lib/trails/osm-search.js';

describe('OpenStreetMap trail search helpers', () => {
  it('extracts a geocodable destination from natural hiking searches', () => {
    expect(destinationTerms('strenuous Diablo hikes')).toBe('Mount Diablo State Park, California');
    expect(destinationTerms('hiking trails around Mount Tamalpais')).toBe('Mount Tamalpais');
    expect(destinationTerms('hikes near me')).toBe('');
  });

  it('keeps missing community facts unknown instead of inventing them', () => {
    const [trail] = osmElementsToTrails([{
      type: 'way', id: 7, center: { lat: 37.86, lon: -121.93 },
      tags: { name: 'Summit Trail', highway: 'path' },
    }], { lat: 37.88, lng: -121.91 });

    expect(trail).toMatchObject({
      name: 'Summit Trail',
      difficulty: null,
      length: null,
      elevationGain: null,
      rating: null,
      sourceKind: 'community',
    });
  });

  it('normalizes sourced OSM hiking metadata without duplicating names', () => {
    const trails = osmElementsToTrails([
      { type: 'relation', id: 1, center: { lat: 37.86, lon: -121.93 }, tags: { name: 'Ridge Trail', route: 'hiking', sac_scale: 'mountain_hiking', distance: '10 km' } },
      { type: 'way', id: 2, center: { lat: 37.87, lon: -121.92 }, tags: { name: 'Ridge Trail', highway: 'path' } },
    ]);

    expect(trails).toHaveLength(1);
    expect(trails[0]).toMatchObject({ difficulty: 'Hard', length: '6.2 miles', features: ['Hiking route'] });
  });

  it('does not present urban streets mapped as paths as hiking results', () => {
    const trails = osmElementsToTrails([
      { type: 'way', id: 3, center: { lat: 37.79, lon: -122.41 }, tags: { name: 'Hamlin Street', highway: 'path' } },
      { type: 'way', id: 4, center: { lat: 37.76, lon: -122.45 }, tags: { name: 'Farnsworth Trail', highway: 'path' } },
    ]);

    expect(trails.map(trail => trail.name)).toEqual(['Farnsworth Trail']);
  });
});
