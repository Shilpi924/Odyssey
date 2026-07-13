// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { deriveSearchFilters, resolveSearchEntity, searchCatalog } from '../src/lib/trails/search-engine.js';

describe('catalog entity resolution', () => {
  it('resolves parks, regions, exact trails, and aliases', () => {
    expect(resolveSearchEntity('strenuous hikes in Yosemite')).toMatchObject({ type: 'park', id: 'nps-yose' });
    expect(resolveSearchEntity('trails near Yosemite Valley')).toMatchObject({ type: 'region', id: 'yosemite-valley' });
    expect(resolveSearchEntity('hikes in Tuolumne Meadows')).toMatchObject({ type: 'region', id: 'tuolumne-meadows' });
    expect(resolveSearchEntity('Half Dome')).toMatchObject({ type: 'trail', id: 'half-dome-jmt' });
    expect(resolveSearchEntity('El Capitan')).toMatchObject({ type: 'trail', id: 'el-capitan-trail' });
  });

  it('leaves uncovered destinations for the fallback provider', () => {
    expect(resolveSearchEntity('hikes in Zion')).toBeNull();
  });
});

describe('structured catalog search', () => {
  it('derives canonical filters from query and preferences', () => {
    expect(deriveSearchFilters('easy waterfall hikes in Yosemite')).toMatchObject({
      difficulties: ['Easy'], features: ['Waterfall'], activities: ['Hiking'],
    });
  });

  it('returns Half Dome and El Capitan for strenuous Yosemite searches', () => {
    const search = searchCatalog({ query: 'strenuous hikes in Yosemite' });
    const ids = search.results.map(result => result.trail.id);
    expect(ids).toEqual(expect.arrayContaining(['half-dome-jmt', 'el-capitan-trail']));
    expect(search.results.every(result => result.trail.difficulty === 'Strenuous')).toBe(true);
  });

  it('ranks exact trail matches first', () => {
    const search = searchCatalog({ query: 'Half Dome' });
    expect(search.results[0].trail.id).toBe('half-dome-jmt');
  });

  it('applies feature filters with AND semantics', () => {
    const search = searchCatalog({ query: 'easy waterfall hikes in Yosemite' });
    expect(search.results.map(result => result.trail.id)).toEqual(expect.arrayContaining([
      'lower-yosemite-fall-trail', 'bridalveil-fall-trail',
    ]));
    expect(search.results.every(result => result.trail.difficulty === 'Easy' && result.trail.features.includes('Waterfall'))).toBe(true);
  });

  it('publishes route provenance for geometry-enabled trails', () => {
    const result = searchCatalog({ query: 'Half Dome' }).results[0].trail;
    expect(result.source.geometry).toMatchObject({ provider: 'osm', relationId: 16315186, license: 'ODbL 1.0' });
  });

  it('keeps region searches inside the selected Yosemite region', () => {
    const search = searchCatalog({ query: 'hikes in Hetch Hetchy' });
    expect(search.results.length).toBeGreaterThan(0);
    expect(search.results.every(result => result.trail.geography.region === 'Hetch Hetchy')).toBe(true);
  });
});
