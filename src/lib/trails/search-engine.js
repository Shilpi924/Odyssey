import { getParkById, getTrailsByParkId } from './catalog';

const ENTITY_INDEX = [
  { type: 'park', id: 'nps-yose', name: 'Yosemite National Park', aliases: ['yosemite', 'yosemite national park', 'yosemite np'] },
  { type: 'region', id: 'yosemite-valley', parkId: 'nps-yose', name: 'Yosemite Valley', aliases: ['yosemite valley', 'the valley'] },
];

function terms(value) {
  return String(value || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

function textIncludesAll(text, requestedTerms) {
  const haystack = new Set(terms(text));
  return requestedTerms.every(term => haystack.has(term));
}

export function resolveSearchEntity(query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return null;

  const parkTrails = getTrailsByParkId('nps-yose');
  const trailMatch = parkTrails.find(trail =>
    [trail.name, ...trail.aliases].some(name => normalized === name.toLowerCase())
  );
  if (trailMatch) return { type: 'trail', id: trailMatch.id, name: trailMatch.name, parkId: trailMatch.geography.parkId, confidence: 1 };

  const entityMatch = ENTITY_INDEX
    .map(entity => ({
      ...entity,
      matchedAlias: entity.aliases.find(alias => normalized.includes(alias)),
    }))
    .filter(entity => entity.matchedAlias)
    .sort((a, b) => b.matchedAlias.length - a.matchedAlias.length)[0];
  if (!entityMatch) return null;
  return { type: entityMatch.type, id: entityMatch.id, name: entityMatch.name, parkId: entityMatch.parkId, confidence: 0.95 };
}

export function deriveSearchFilters(query, preferences = {}) {
  const normalized = String(query || '').toLowerCase();
  const requestedDifficulty = preferences.hiking?.difficulty;
  const difficulties = Array.isArray(requestedDifficulty) ? requestedDifficulty : requestedDifficulty ? [requestedDifficulty] : [];
  for (const difficulty of ['Easy', 'Moderate', 'Hard', 'Strenuous']) {
    if (normalized.includes(difficulty.toLowerCase()) && !difficulties.includes(difficulty)) difficulties.push(difficulty);
  }
  const features = [];
  if (/waterfall|falls/.test(normalized)) features.push('Waterfall');
  if (/lake/.test(normalized)) features.push('Lake');
  if (/summit|peak/.test(normalized)) features.push('Summit');
  if (/scenic|views?/.test(normalized)) features.push('Scenic');
  return { difficulties, features, activities: ['Hiking'] };
}

export function trailMatchesFilters(trail, filters) {
  if (filters.difficulties?.length && !filters.difficulties.includes(trail.difficulty)) return false;
  if (filters.activities?.length && !filters.activities.some(activity => trail.activities.includes(activity))) return false;
  if (filters.features?.length && !filters.features.every(feature => trail.features.includes(feature))) return false;
  if (filters.maxDistanceMiles != null && (trail.route.distanceMiles == null || trail.route.distanceMiles > filters.maxDistanceMiles)) return false;
  if (filters.excludeStatuses?.includes(trail.access.status)) return false;
  return true;
}

export function scoreTrail(trail, { query, entity, filters }) {
  const queryTerms = terms(query).filter(term => !['hike', 'hikes', 'hiking', 'trail', 'trails', 'in', 'near'].includes(term));
  const searchable = [trail.name, ...trail.aliases, ...trail.features, trail.geography.region].join(' ');
  const nameMatch = terms(trail.name).filter(term => queryTerms.includes(term)).length;
  const exactTrail = entity?.type === 'trail' && entity.id === trail.id;
  const geographicMatch = entity && (entity.id === trail.geography.parkId || entity.parkId === trail.geography.parkId);
  const filterMatches = [
    !filters.difficulties?.length || filters.difficulties.includes(trail.difficulty),
    !filters.features?.length || filters.features.every(feature => trail.features.includes(feature)),
  ].filter(Boolean).length;
  const completeness = [trail.route.distanceMiles, trail.route.elevationGainFeet, trail.source.sourceUrl].filter(value => value != null).length;

  return (exactTrail ? 100 : 0)
    + (geographicMatch ? 30 : 0)
    + nameMatch * 12
    + (textIncludesAll(searchable, queryTerms) ? 10 : 0)
    + filterMatches * 8
    + completeness * 2
    - (trail.access.status === 'Closed' ? 100 : 0);
}

export function searchCatalog({ query, preferences = {}, limit = 10 }) {
  const entity = resolveSearchEntity(query);
  if (!entity) return null;
  const parkId = entity.type === 'park' ? entity.id : entity.parkId;
  const park = getParkById(parkId);
  const filters = deriveSearchFilters(query, preferences);
  const candidates = getTrailsByParkId(parkId);
  const results = candidates
    .filter(trail => trailMatchesFilters(trail, { ...filters, excludeStatuses: ['Closed'] }))
    .map(trail => ({ trail, score: scoreTrail(trail, { query, entity, filters }) }))
    .sort((a, b) => b.score - a.score || a.trail.name.localeCompare(b.trail.name))
    .slice(0, limit);

  return { entity, park, filters, results, candidateCount: candidates.length };
}

export function toLegacySearchResult(trail, score, origin) {
  const distanceFromOrigin = origin
    ? distanceMiles(origin.lat, origin.lng, trail.trailhead.lat, trail.trailhead.lng).toFixed(1)
    : null;
  return {
    name: trail.name,
    placeId: trail.id,
    lat: trail.trailhead.lat,
    lng: trail.trailhead.lng,
    distance: distanceFromOrigin,
    difficulty: trail.difficulty,
    length: trail.route.distanceMiles != null ? `${trail.route.distanceMiles} miles` : null,
    elevationGain: trail.route.elevationGainFeet != null ? `${trail.route.elevationGainFeet.toLocaleString()} ft` : null,
    rating: trail.quality.rating,
    userRatingsTotal: trail.quality.reviewCount,
    features: trail.features,
    photos: trail.media.photos,
    vicinity: [trail.geography.region, trail.geography.state].filter(Boolean).join(', '),
    routeType: trail.route.type,
    access: trail.access,
    sourceAttribution: trail.source.attribution,
    sourceUrl: trail.source.sourceUrl,
    relevanceScore: score,
  };
}

function distanceMiles(lat1, lon1, lat2, lon2) {
  const radius = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

