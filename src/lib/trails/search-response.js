import { getParksContainingPoint } from './catalog';
import { searchCatalog, toLegacySearchResult } from './search-engine';

const COVERAGE_MESSAGE = 'Verified trail coverage is currently available for Yosemite National Park.';

function finiteCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export function searchVerifiedTrails({ lat, lng, query, preferences = {}, excludeNames = [], limit = 10 }) {
  const latitude = finiteCoordinate(lat, -90, 90);
  const longitude = finiteCoordinate(lng, -180, 180);
  const origin = latitude == null || longitude == null ? null : { lat: latitude, lng: longitude };
  const nearbyPark = origin ? getParksContainingPoint(origin)[0] : null;
  const requestedQuery = String(query || '').trim();
  const genericNearbyQuery = /^(near me|nearby|hikes?|trails?|hikes? near me|trails? near me)$/i.test(requestedQuery);
  const effectiveQuery = (!requestedQuery || genericNearbyQuery) && nearbyPark?.id === 'nps-yose'
    ? 'Yosemite National Park'
    : requestedQuery;
  const catalogSearch = effectiveQuery ? searchCatalog({ query: effectiveQuery, preferences, limit: Math.max(limit + excludeNames.length, limit) }) : null;
  const excluded = new Set(excludeNames.map(name => String(name).toLowerCase()));
  const results = (catalogSearch?.results || [])
    .filter(({ trail }) => !excluded.has(trail.name.toLowerCase()))
    .slice(0, limit);

  return {
    trails: results.map(({ trail, score }) => toLegacySearchResult(trail, score, origin)),
    source: 'catalog',
    weather: null,
    entity: catalogSearch?.entity || null,
    filters: catalogSearch?.filters || null,
    attribution: ['Source: National Park Service', '© OpenStreetMap contributors'],
    hasMore: false,
    coverage: {
      verified: Boolean(catalogSearch),
      message: COVERAGE_MESSAGE,
      supportedParkIds: ['nps-yose'],
    },
  };
}
