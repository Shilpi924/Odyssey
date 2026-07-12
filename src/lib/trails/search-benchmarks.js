export const SEARCH_QUALITY_TARGETS = Object.freeze({
  precisionAt5: 0.8,
  precisionAt10: 0.75,
  famousTrailRecall: 0.95,
  zeroResultRate: 0.02,
  duplicateRate: 0.01,
  wrongRegionRate: 0.01,
  closedTrailTop5Rate: 0,
  p95ResponseTimeMs: 1500,
});

export const SEARCH_BENCHMARKS = Object.freeze([
  {
    id: 'yosemite-strenuous',
    query: 'Strenuous hikes in Yosemite',
    expectedEntity: { type: 'park', name: 'Yosemite National Park' },
    filters: { difficulty: ['Strenuous'], activities: ['Hiking'] },
    mustIncludeAny: ['half-dome-jmt', 'el-capitan-trail'],
    mustExcludeStatuses: ['Closed'],
  },
  {
    id: 'half-dome-exact',
    query: 'Half Dome',
    expectedEntity: { type: 'trail', name: 'Half Dome' },
    filters: {},
    mustIncludeTop3: ['half-dome-jmt'],
  },
  {
    id: 'yosemite-easy-waterfall',
    query: 'Easy waterfall hikes in Yosemite',
    expectedEntity: { type: 'park', name: 'Yosemite National Park' },
    filters: { difficulty: ['Easy'], features: ['Waterfall'], activities: ['Hiking'] },
    mustIncludeAny: ['lower-yosemite-fall-trail', 'bridalveil-fall-trail'],
  },
  {
    id: 'san-jose-dog-shade',
    query: 'Dog-friendly shaded trails under 5 miles near San Jose',
    expectedEntity: { type: 'locality', name: 'San Jose' },
    filters: { maxDistanceMiles: 5, suitability: ['Dog-friendly'], features: ['Shaded'] },
  },
  {
    id: 'yosemite-valley-nearby',
    query: 'Trails near Yosemite Valley',
    expectedEntity: { type: 'region', name: 'Yosemite Valley' },
    filters: { activities: ['Hiking'] },
    mustNotIncludeOutsideEntity: true,
  },
]);

