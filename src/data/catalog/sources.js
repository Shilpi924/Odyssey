export const CATALOG_SOURCES = Object.freeze({
  nps: {
    id: 'nps',
    name: 'U.S. National Park Service',
    kind: 'government-authoritative',
    license: 'U.S. federal government work; verify per-asset restrictions',
    attribution: 'Source: National Park Service',
    homepage: 'https://www.nps.gov/',
    allowedUses: ['park facts', 'trail facts', 'alerts', 'park boundaries'],
    requiresAttribution: true,
  },
  caStateParks: {
    id: 'ca-state-parks',
    name: 'California State Parks',
    kind: 'government-authoritative',
    license: 'Official public information; source materials may be copyrighted',
    attribution: 'Source: California State Parks',
    homepage: 'https://www.parks.ca.gov/',
    allowedUses: ['park facts', 'trail facts', 'accessibility facts', 'trail-use rules'],
    requiresAttribution: true,
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    kind: 'open-community',
    license: 'ODbL 1.0',
    attribution: '© OpenStreetMap contributors',
    homepage: 'https://www.openstreetmap.org/copyright',
    allowedUses: ['trail geometry', 'trailheads', 'paths', 'points of interest'],
    requiresAttribution: true,
    shareAlikeDatabase: true,
  },
  odysseyCurated: {
    id: 'odyssey-curated',
    name: 'Odyssey curated data',
    kind: 'first-party',
    license: 'Proprietary',
    attribution: 'Odyssey',
    allowedUses: ['aliases', 'entity relationships', 'editorial classifications'],
    requiresAttribution: false,
  },
});

export function getCatalogSource(sourceId) {
  return Object.values(CATALOG_SOURCES).find(source => source.id === sourceId) || null;
}
