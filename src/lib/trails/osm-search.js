const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
const USER_AGENT = 'Odyssey/0.1 (+https://github.com/Shilpi924/Odyssey)';
const DEFAULT_RADIUS_METERS = 25_000;

function endpoint(envName, fallback) {
  return process.env[envName] || fallback;
}

function finiteCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export function destinationTerms(query) {
  const destination = String(query || '')
    .replace(/\b(?:easy|moderate|hard|strenuous|expert|scenic|short|long)\b/gi, ' ')
    .replace(/\b(?:hikes?|hiking|trails?|walks?)\b/gi, ' ')
    .replace(/\b(?:near|around|in|at)\s+me\b/gi, ' ')
    .replace(/\b(?:near|around|in|at)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^(?:mount|mt\.?)?\s*diablo$/i.test(destination)) return 'Mount Diablo State Park, California';
  return destination;
}

function centerOf(element) {
  if (element.center) return element.center;
  if (!element.bounds) return null;
  return {
    lat: (element.bounds.minlat + element.bounds.maxlat) / 2,
    lon: (element.bounds.minlon + element.bounds.maxlon) / 2,
  };
}

function difficultyFromTags(tags = {}) {
  const scale = tags.sac_scale;
  if (['demanding_alpine_hiking', 'alpine_hiking', 'difficult_alpine_hiking'].includes(scale)) return 'Strenuous';
  if (scale === 'mountain_hiking' || scale === 'demanding_mountain_hiking') return 'Hard';
  if (scale === 'hiking') return 'Moderate';
  return null;
}

function distanceFromTags(tags = {}) {
  const raw = tags.distance;
  if (!raw) return null;
  const value = Number.parseFloat(String(raw).replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  if (/\bmi(?:les?)?\b/i.test(raw)) return value;
  if (/\b(?:m|meter|metre)s?\b/i.test(raw) && !/\bkm\b/i.test(raw)) return value / 1609.344;
  return value * 0.621371;
}

function featuresFromTags(tags = {}) {
  return [
    tags.route === 'hiking' ? 'Hiking route' : null,
    tags.roundtrip === 'yes' ? 'Loop' : null,
    tags.dog === 'yes' ? 'Dog friendly' : null,
    tags.wheelchair === 'yes' ? 'Wheelchair accessible' : null,
  ].filter(Boolean);
}

function isLikelyTrail(element) {
  if (element.type === 'relation') return ['hiking', 'foot'].includes(element.tags?.route);
  const name = element.tags?.name || '';
  return /\b(?:trail|path|track|fire road)\b/i.test(name)
    || Boolean(element.tags?.sac_scale || element.tags?.trail_visibility);
}

export function osmElementsToTrails(elements = [], origin = null, limit = 10) {
  const seen = new Set();
  return elements.flatMap(element => {
    if (!isLikelyTrail(element)) return [];
    const name = element.tags?.name?.trim();
    const center = centerOf(element);
    const key = name?.toLowerCase();
    if (!name || !center || seen.has(key)) return [];
    seen.add(key);

    const length = distanceFromTags(element.tags);
    const distance = origin
      ? distanceMiles(origin.lat, origin.lng, center.lat, center.lon).toFixed(1)
      : null;
    return [{
      name,
      placeId: `osm-${element.type}-${element.id}`,
      lat: center.lat,
      lng: center.lon,
      distance,
      difficulty: difficultyFromTags(element.tags),
      length: length == null ? null : `${length.toFixed(1)} miles`,
      elevationGain: null,
      rating: null,
      userRatingsTotal: 0,
      features: featuresFromTags(element.tags),
      photos: [],
      vicinity: element.tags?.operator || element.tags?.network || 'Near the searched area',
      routeType: element.tags?.roundtrip === 'yes' ? 'Loop' : null,
      access: { status: element.tags?.access === 'no' ? 'Closed' : 'Unknown' },
      sourceAttribution: OSM_ATTRIBUTION,
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      geometrySource: null,
      geometryUrl: null,
      sourceKind: 'community',
    }];
  })
    .filter(trail => trail.access.status !== 'Closed')
    .sort((a, b) => Number(a.distance ?? Number.POSITIVE_INFINITY) - Number(b.distance ?? Number.POSITIVE_INFINITY))
    .slice(0, limit);
}

export async function geocodeTrailDestination(query, fetchImpl = fetch) {
  const destination = destinationTerms(query);
  if (!destination) return null;
  const url = new URL('/search', endpoint('NOMINATIM_BASE_URL', 'https://nominatim.openstreetmap.org'));
  url.searchParams.set('q', destination);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'us');
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    next: { revalidate: 2_592_000 },
  });
  if (!response.ok) throw new Error(`Destination lookup failed (${response.status})`);
  const result = (await response.json())[0];
  const lat = finiteCoordinate(result?.lat, -90, 90);
  const lng = finiteCoordinate(result?.lon, -180, 180);
  return lat == null || lng == null ? null : { lat, lng, name: result.display_name || destination };
}

export async function searchOsmTrails({ lat, lng, radiusMiles = 15, limit = 10, fetchImpl = fetch }) {
  const latitude = finiteCoordinate(lat, -90, 90);
  const longitude = finiteCoordinate(lng, -180, 180);
  if (latitude == null || longitude == null) return [];

  // About 100 m of precision is enough for nearby discovery and avoids sending
  // an unnecessarily precise device location to the community search service.
  const searchLat = Number(latitude.toFixed(3));
  const searchLng = Number(longitude.toFixed(3));
  const radius = Math.min(Math.max(Number(radiusMiles) * 1609.344 || DEFAULT_RADIUS_METERS, 1_000), 50_000);
  const query = `[out:json][timeout:20];(relation(around:${Math.round(radius)},${searchLat},${searchLng})["type"="route"]["route"~"^(hiking|foot)$"]["name"];way(around:${Math.round(radius)},${searchLat},${searchLng})["highway"~"^(path|track)$"]["name"];);out center tags ${Math.max(limit * 12, 120)};`;
  const url = new URL(endpoint('OVERPASS_BASE_URL', 'https://overpass-api.de/api/interpreter'));
  url.searchParams.set('data', query);
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    next: { revalidate: 3_600 },
  });
  if (!response.ok) throw new Error(`Community trail search failed (${response.status})`);
  const data = await response.json();
  return osmElementsToTrails(data.elements, { lat: latitude, lng: longitude }, limit);
}

function distanceMiles(lat1, lon1, lat2, lon2) {
  const radius = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
