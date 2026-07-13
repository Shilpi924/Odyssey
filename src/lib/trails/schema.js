export const TRAIL_SCHEMA_VERSION = 1;

export const TRAIL_DIFFICULTIES = Object.freeze(['Easy', 'Moderate', 'Hard', 'Strenuous']);
export const TRAIL_ROUTE_TYPES = Object.freeze(['Out and back', 'Loop', 'Point to point']);
export const TRAIL_STATUSES = Object.freeze(['Open', 'Caution', 'Closed', 'Unknown']);
export const TRAIL_ACTIVITIES = Object.freeze([
  'Hiking', 'Walking', 'Running', 'Backpacking', 'Mountain biking',
  'Horseback riding', 'Snowshoeing', 'Cross-country skiing', 'Climbing',
]);

const REQUIRED_FIELDS = ['id', 'name', 'slug', 'trailhead', 'difficulty', 'source'];

function finiteNumber(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isFinite(number) ? number : null;
}

function compactStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : [values])
    .filter(value => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean))];
}

function normalizePoint(point = {}) {
  return {
    lat: finiteNumber(point.lat),
    lng: finiteNumber(point.lng),
  };
}

export function normalizeTrail(input = {}) {
  const distanceMiles = finiteNumber(input.distanceMiles ?? input.distance);
  const elevationGainFeet = finiteNumber(input.elevationGainFeet ?? input.elevationGain);
  const reviewCount = finiteNumber(input.reviewCount ?? input.userRatingsTotal) ?? 0;

  return {
    schemaVersion: TRAIL_SCHEMA_VERSION,
    id: String(input.id ?? input.placeId ?? '').trim(),
    slug: String(input.slug ?? '').trim(),
    name: String(input.name ?? '').trim(),
    aliases: compactStrings(input.aliases),
    description: String(input.description ?? '').trim(),
    geography: {
      parkId: input.geography?.parkId ?? input.parkId ?? null,
      parkName: input.geography?.parkName ?? input.parkName ?? null,
      region: input.geography?.region ?? input.region ?? null,
      locality: input.geography?.locality ?? input.locality ?? null,
      state: input.geography?.state ?? input.state ?? null,
      countryCode: input.geography?.countryCode ?? input.countryCode ?? 'US',
    },
    trailhead: normalizePoint(input.trailhead ?? { lat: input.lat, lng: input.lng }),
    route: {
      type: input.route?.type ?? input.routeType ?? null,
      geometry: input.route?.geometry ?? input.geometry ?? null,
      distanceMiles,
      elevationGainFeet,
      minElevationFeet: finiteNumber(input.route?.minElevationFeet ?? input.minElevationFeet),
      maxElevationFeet: finiteNumber(input.route?.maxElevationFeet ?? input.maxElevationFeet),
      estimatedMinutes: finiteNumber(input.route?.estimatedMinutes ?? input.estimatedMinutes),
    },
    difficulty: input.difficulty ?? null,
    activities: compactStrings(input.activities?.length ? input.activities : ['Hiking']),
    features: compactStrings(input.features),
    suitability: compactStrings(input.suitability),
    access: {
      status: input.access?.status ?? input.status ?? 'Unknown',
      permitRequired: Boolean(input.access?.permitRequired ?? input.permitRequired),
      reservationRequired: Boolean(input.access?.reservationRequired ?? input.reservationRequired),
      feeRequired: Boolean(input.access?.feeRequired ?? input.feeRequired),
      seasonalNotes: input.access?.seasonalNotes ?? input.seasonalNotes ?? null,
    },
    quality: {
      rating: finiteNumber(input.quality?.rating ?? input.rating),
      reviewCount,
      popularityScore: finiteNumber(input.quality?.popularityScore ?? input.popularityScore),
      completenessScore: finiteNumber(input.quality?.completenessScore ?? input.completenessScore),
    },
    media: {
      photos: compactStrings(input.media?.photos ?? input.photos),
    },
    source: {
      provider: String(input.source?.provider ?? input.sourceProvider ?? '').trim(),
      externalId: input.source?.externalId ?? input.externalId ?? input.placeId ?? null,
      sourceUrl: input.source?.sourceUrl ?? input.sourceUrl ?? null,
      license: input.source?.license ?? input.license ?? null,
      attribution: input.source?.attribution ?? input.attribution ?? null,
      importedAt: input.source?.importedAt ?? input.importedAt ?? null,
      lastVerifiedAt: input.source?.lastVerifiedAt ?? input.lastVerifiedAt ?? null,
      geometry: input.source?.geometry ?? input.geometrySource ?? null,
      difficultyMethod: input.source?.difficultyMethod ?? input.difficultyMethod ?? null,
    },
  };
}

export function validateTrail(input) {
  const trail = normalizeTrail(input);
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    const value = field === 'source' ? trail.source.provider : trail[field];
    if (!value) errors.push(`${field} is required`);
  }
  if (!TRAIL_DIFFICULTIES.includes(trail.difficulty)) errors.push('difficulty must use a canonical value');
  if (trail.route.type && !TRAIL_ROUTE_TYPES.includes(trail.route.type)) errors.push('route.type must use a canonical value');
  if (!TRAIL_STATUSES.includes(trail.access.status)) errors.push('access.status must use a canonical value');
  if (trail.trailhead.lat == null || trail.trailhead.lat < -90 || trail.trailhead.lat > 90) errors.push('trailhead.lat must be between -90 and 90');
  if (trail.trailhead.lng == null || trail.trailhead.lng < -180 || trail.trailhead.lng > 180) errors.push('trailhead.lng must be between -180 and 180');
  if (trail.route.distanceMiles != null && trail.route.distanceMiles < 0) errors.push('route.distanceMiles cannot be negative');
  if (trail.route.elevationGainFeet != null && trail.route.elevationGainFeet < 0) errors.push('route.elevationGainFeet cannot be negative');
  if (trail.quality.rating != null && (trail.quality.rating < 0 || trail.quality.rating > 5)) errors.push('quality.rating must be between 0 and 5');
  if (trail.quality.reviewCount < 0) errors.push('quality.reviewCount cannot be negative');

  return { valid: errors.length === 0, errors, trail };
}
