import { getCatalogAttributions, getParks, getParksContainingPoint, getTrailsByParkId } from './catalog';
import { deriveSearchFilters, searchCatalog, toLegacySearchResult } from './search-engine';
import { geocodeTrailDestination, searchOsmTrails } from './osm-search';

const CATALOG_COVERAGE_MESSAGE = 'Verified catalog coverage is available for Yosemite and Mount Diablo; community trail results expand search elsewhere.';
const COMMUNITY_COVERAGE_MESSAGE = 'Showing community-mapped trails from OpenStreetMap. Verify access, conditions, and route details with the local land manager.';

function finiteCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function hasNearbyIntent(query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized || /^(hikes?|trails?)$/.test(normalized)) return true;
  return /\b(?:near\s+me|nearby|(?:my\s+)?current\s+location|around\s+me|close\s+to\s+me)\b/.test(normalized);
}

export async function searchVerifiedTrails({ lat, lng, query, preferences = {}, excludeNames = [], limit = 10, radius = 15, fetchImpl = fetch }) {
  const latitude = finiteCoordinate(lat, -90, 90);
  const longitude = finiteCoordinate(lng, -180, 180);
  const origin = latitude == null || longitude == null ? null : { lat: latitude, lng: longitude };
  const nearbyPark = origin ? getParksContainingPoint(origin)[0] : null;
  const supportedParkIds = getParks().map(park => park.id);
  const requestedQuery = String(query || '').trim();
  const nearbyQuery = hasNearbyIntent(requestedQuery);
  const effectiveQuery = nearbyQuery && nearbyPark
    ? [requestedQuery, nearbyPark.name].filter(Boolean).join(' ')
    : requestedQuery;
  const catalogSearch = effectiveQuery ? searchCatalog({ query: effectiveQuery, preferences, limit: Math.max(limit + excludeNames.length, limit) }) : null;
  const excluded = new Set(excludeNames.map(name => String(name).toLowerCase()));
  const distanceOrigin = nearbyQuery ? origin : null;
  const nearbyFilters = nearbyQuery ? deriveSearchFilters(requestedQuery, preferences) : null;
  if (catalogSearch) {
    const results = catalogSearch.results
      .filter(({ trail }) => !excluded.has(trail.name.toLowerCase()))
      .slice(0, limit);
    const sourceTrails = results.length
      ? results.map(({ trail }) => trail)
      : getTrailsByParkId(catalogSearch.park.id);
    const trails = results.map(({ trail, score }) => ({
      ...toLegacySearchResult(trail, score, distanceOrigin),
      sourceKind: 'verified-catalog',
    }));
    if (distanceOrigin) trails.sort((a, b) => Number(a.distance) - Number(b.distance));

    return {
      trails,
      source: 'catalog',
      weather: null,
      entity: catalogSearch.entity,
      filters: catalogSearch.filters,
      attribution: getCatalogAttributions(sourceTrails),
      hasMore: false,
      coverage: {
        verified: true,
        message: CATALOG_COVERAGE_MESSAGE,
        supportedParkIds,
      },
    };
  }

  try {
    const searchOrigin = nearbyQuery
      ? origin
      : await geocodeTrailDestination(requestedQuery, fetchImpl);
    const communityTrails = searchOrigin
      ? await searchOsmTrails({ ...searchOrigin, radiusMiles: radius, limit: limit + excludeNames.length, fetchImpl })
      : [];
    const trails = communityTrails
      .filter(trail => !excluded.has(trail.name.toLowerCase()))
      .map(trail => nearbyQuery ? trail : { ...trail, distance: null })
      .slice(0, limit);

    return {
      trails,
      source: 'openstreetmap',
      weather: null,
      entity: searchOrigin ? { type: 'area', name: searchOrigin.name || requestedQuery } : null,
      filters: nearbyFilters,
      attribution: ['© OpenStreetMap contributors'],
      hasMore: false,
      coverage: {
        verified: false,
        message: trails.length ? COMMUNITY_COVERAGE_MESSAGE : 'No named community trails were found in this area. Try a nearby park, city, or a larger search radius.',
        supportedParkIds,
      },
    };
  } catch {
    return {
      trails: [],
      source: 'openstreetmap',
      weather: null,
      entity: null,
      filters: nearbyFilters,
      attribution: ['© OpenStreetMap contributors'],
      hasMore: false,
      coverage: {
        verified: false,
        message: 'Community trail search is temporarily unavailable. Please try again shortly.',
        supportedParkIds,
      },
    };
  }
}
