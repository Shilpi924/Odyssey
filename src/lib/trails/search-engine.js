import { getParkById, getParks, getTrailsByParkId } from './catalog';

function terms(value) {
  return String(value || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

const GENERIC_TRAIL_SUFFIXES = new Set(['hike', 'trail']);
const GENERIC_QUERY_TERMS = new Set([
  'a', 'an', 'around', 'at', 'by', 'current', 'find', 'for', 'hike', 'hikes',
  'hiking', 'in', 'location', 'me', 'my', 'near', 'nearby', 'of', 'please',
  'show', 'the', 'to', 'trail', 'trails', 'via',
]);

function includesTokenPhrase(queryTerms, phraseTerms) {
  if (!phraseTerms.length || phraseTerms.length > queryTerms.length) return false;
  return queryTerms.some((_, start) =>
    phraseTerms.every((term, offset) => queryTerms[start + offset] === term)
  );
}

function trailAliasVariants(alias) {
  const aliasTerms = terms(alias);
  const variants = [aliasTerms];
  const shortened = [...aliasTerms];
  while (shortened.length > 1 && GENERIC_TRAIL_SUFFIXES.has(shortened.at(-1))) shortened.pop();
  if (shortened.length >= 2 && shortened.length < aliasTerms.length) variants.push(shortened);
  return variants;
}

function entityPriority(type) {
  if (type === 'trail') return 3;
  if (type === 'region') return 2;
  return 1;
}

function textIncludesAll(text, requestedTerms) {
  const haystack = new Set(terms(text));
  return requestedTerms.every(term => haystack.has(term));
}

export function resolveSearchEntity(query) {
  const queryTerms = terms(query);
  if (!queryTerms.length) return null;

  const parks = getParks();
  const parkTrails = parks.flatMap(park => getTrailsByParkId(park.id));
  const trailEntities = parkTrails.map(trail => ({
    type: 'trail',
    id: trail.id,
    name: trail.name,
    parkId: trail.geography.parkId,
    aliases: [trail.name, ...(trail.aliases || [])].flatMap(trailAliasVariants),
  }));
  const parkEntities = parks.map(park => ({
    type: 'park',
    id: park.id,
    name: park.name,
    aliases: [park.name, ...(park.aliases || [])].map(terms),
  }));
  const regions = parks.flatMap(park => [...new Set(getTrailsByParkId(park.id).map(trail => trail.geography.region).filter(Boolean))]
    .map(name => ({ type: 'region', id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), parkId: park.id, name, aliases: [terms(name)] })));
  const entityMatch = [...trailEntities, ...parkEntities, ...regions]
    .flatMap(entity => entity.aliases.map(aliasTerms => ({ ...entity, aliasTerms })))
    .filter(entity => includesTokenPhrase(queryTerms, entity.aliasTerms))
    .sort((a, b) =>
      b.aliasTerms.length - a.aliasTerms.length
      || entityPriority(b.type) - entityPriority(a.type)
      || b.aliasTerms.join(' ').length - a.aliasTerms.join(' ').length
    )[0];
  if (!entityMatch) return null;
  const exactMatch = entityMatch.aliasTerms.length === queryTerms.length;
  return {
    type: entityMatch.type,
    id: entityMatch.id,
    name: entityMatch.name,
    parkId: entityMatch.parkId,
    confidence: exactMatch ? 1 : 0.95,
    matchedAlias: entityMatch.aliasTerms.join(' '),
  };
}

export function deriveSearchFilters(query, preferences = {}) {
  const normalized = String(query || '').toLowerCase();
  const requestedLength = preferences.hiking?.length;
  const distanceRanges = {
    short: { maxDistanceMiles: 2 },
    medium: { minDistanceMiles: 2, maxDistanceMiles: 5 },
    long: { minDistanceMiles: 5, maxDistanceMiles: 10 },
    verylong: { minDistanceMiles: 10 },
    'Under 3 miles': { maxDistanceMiles: 3 },
    '3–5 miles': { minDistanceMiles: 3, maxDistanceMiles: 5 },
    '5–10 miles': { minDistanceMiles: 5, maxDistanceMiles: 10 },
  };
  const requestedDifficulty = preferences.hiking?.difficulty;
  const difficulties = (Array.isArray(requestedDifficulty) ? requestedDifficulty : requestedDifficulty ? [requestedDifficulty] : [])
    .map(difficulty => difficulty === 'Expert' ? 'Strenuous' : difficulty)
    .filter(difficulty => ['Easy', 'Moderate', 'Hard', 'Strenuous'].includes(difficulty));
  for (const difficulty of ['Easy', 'Moderate', 'Hard', 'Strenuous']) {
    if (normalized.includes(difficulty.toLowerCase()) && !difficulties.includes(difficulty)) difficulties.push(difficulty);
  }
  const features = [];
  if (/waterfall|falls/.test(normalized)) features.push('Waterfall');
  if (/lake/.test(normalized)) features.push('Lake');
  if (/summit|peak/.test(normalized)) features.push('Summit');
  if (/scenic|views?/.test(normalized)) features.push('Scenic');
  return { difficulties, features, activities: ['Hiking'], ...(distanceRanges[requestedLength] || {}) };
}

export function trailMatchesFilters(trail, filters) {
  if (filters.difficulties?.length && trail.difficulty && !filters.difficulties.includes(trail.difficulty)) return false;
  if (filters.activities?.length && !filters.activities.some(activity => trail.activities.includes(activity))) return false;
  if (filters.features?.length && !filters.features.every(feature => trail.features.includes(feature))) return false;
  if (filters.minDistanceMiles != null && (trail.route.distanceMiles == null || trail.route.distanceMiles < filters.minDistanceMiles)) return false;
  if (filters.maxDistanceMiles != null && (trail.route.distanceMiles == null || trail.route.distanceMiles > filters.maxDistanceMiles)) return false;
  if (filters.excludeStatuses?.includes(trail.access.status)) return false;
  return true;
}

export function scoreTrail(trail, { query, entity, filters }) {
  const geographicTerms = entity?.type === 'park' || entity?.type === 'region'
    ? new Set(terms(entity.matchedAlias || entity.name))
    : new Set();
  const queryTerms = terms(query).filter(term => !GENERIC_QUERY_TERMS.has(term) && !geographicTerms.has(term));
  const searchable = [trail.name, ...trail.aliases, ...trail.features, trail.geography.region].join(' ');
  const nameMatch = terms(trail.name).filter(term => queryTerms.includes(term)).length;
  const exactTrail = entity?.type === 'trail' && entity.id === trail.id;
  const geographicMatch = entity && (entity.id === trail.geography.parkId || entity.parkId === trail.geography.parkId);
  const filterMatches = [
    !filters.difficulties?.length || filters.difficulties.includes(trail.difficulty),
    !filters.features?.length || filters.features.every(feature => trail.features.includes(feature)),
    filters.minDistanceMiles == null || (trail.route.distanceMiles != null && trail.route.distanceMiles >= filters.minDistanceMiles),
    filters.maxDistanceMiles == null || (trail.route.distanceMiles != null && trail.route.distanceMiles <= filters.maxDistanceMiles),
  ].filter(Boolean).length;
  const completeness = [trail.route.distanceMiles, trail.route.elevationGainFeet, trail.difficulty, trail.source.sourceUrl].filter(value => value != null).length;

  return (exactTrail ? 100 : 0)
    + (geographicMatch ? 30 : 0)
    + nameMatch * 12
    + (queryTerms.length && textIncludesAll(searchable, queryTerms) ? 10 : 0)
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
  const candidates = getTrailsByParkId(parkId)
    .filter(trail => entity.type !== 'region' || trail.geography.region === entity.name);
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
    difficultyMethod: trail.source.difficultyMethod || null,
    sourceAttribution: trail.source.attribution,
    sourceUrl: trail.source.sourceUrl,
    geometrySource: trail.source.geometry,
    geometryUrl: trail.source.geometry ? `/api/trails/${trail.id}/geometry` : null,
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
