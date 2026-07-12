export const YOSEMITE_PARK = Object.freeze({
  id: 'nps-yose',
  slug: 'yosemite-national-park',
  name: 'Yosemite National Park',
  aliases: ['Yosemite', 'Yosemite NP'],
  parkCode: 'yose',
  state: 'CA',
  countryCode: 'US',
  center: { lat: 37.8651, lng: -119.5383 },
  // Search envelope only. Phase 2's importer will replace this with the official
  // NPS MultiPolygon before boundary-intersection membership is authoritative.
  searchBoundary: {
    type: 'Polygon',
    coordinates: [[
      [-119.886, 37.494],
      [-119.196, 37.494],
      [-119.196, 38.186],
      [-119.886, 38.186],
      [-119.886, 37.494],
    ]],
  },
  boundaryAuthority: 'search-envelope',
  source: {
    provider: 'nps',
    externalId: 'yose',
    sourceUrl: 'https://www.nps.gov/yose/index.htm',
    license: 'U.S. federal government work; verify per-asset restrictions',
    attribution: 'Source: National Park Service',
  },
});

