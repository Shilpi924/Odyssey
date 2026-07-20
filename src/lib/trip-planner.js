const DIFFICULTIES = new Set(['Easy', 'Moderate', 'Strenuous', 'Any']);
const DISTANCES = new Set(['Under 3 miles', '3–5 miles', '5–10 miles', 'Any distance']);
const GROUPS = new Set(['Solo', 'Partner', 'Friends', 'Family with children', 'Older adults', 'Dog']);
const NEEDS = new Set(['Shade preferred', 'Frequent rest stops', 'Paved or firm surface', 'Avoid steep inclines', 'Accessible restroom', 'Dog-friendly']);

function cleanText(value, maximum) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function allowedList(value, allowed, maximum = 8) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => cleanText(item, 80)).filter(item => allowed.has(item)))].slice(0, maximum);
}

export function validateTripRequest(input) {
  const destination = cleanText(input?.destination, 120);
  const days = Math.min(7, Math.max(1, Number.parseInt(input?.days, 10) || 1));
  const difficulty = DIFFICULTIES.has(input?.difficulty) ? input.difficulty : 'Any';
  const distance = DISTANCES.has(input?.distance) ? input.distance : 'Any distance';
  const group = allowedList(input?.group, GROUPS, 6);
  const needs = allowedList(input?.needs, NEEDS, 6);
  const notes = cleanText(input?.notes, 500);
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(input?.startDate || '')) ? input.startDate : null;

  if (destination.length < 2) return { valid: false, error: 'Enter a park, city, or trail to plan around.' };
  return { valid: true, value: { destination, days, difficulty, distance, group, needs, notes, startDate } };
}

function numericFact(value) {
  const match = String(value || '').replace(/,/g, '').match(/[\d.]+/);
  const number = match ? Number(match[0]) : null;
  return Number.isFinite(number) ? number : null;
}

export function estimateTrailMinutes(trail) {
  const miles = numericFact(trail?.length);
  if (miles == null) return null;
  const gain = numericFact(trail?.elevationGain) || 0;
  return Math.max(30, Math.round((miles * 30 + gain / 30) / 15) * 15);
}

export function formatDuration(minutes) {
  if (!minutes) return 'Time estimate unavailable';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min estimated`;
  return `${hours} hr${hours === 1 ? '' : 's'}${remainder ? ` ${remainder} min` : ''} estimated`;
}

function sourceForTrail(trail, index) {
  return {
    id: `source-${index + 1}`,
    title: trail.name,
    provider: trail.sourceAttribution || (trail.sourceKind === 'verified-catalog' ? 'Official land manager' : 'OpenStreetMap contributors'),
    url: trail.sourceUrl || 'https://www.openstreetmap.org/copyright',
    kind: trail.sourceKind === 'verified-catalog' ? 'official' : 'community',
  };
}

function preferenceScore(trail, request) {
  let score = 0;
  const features = new Set(trail.features || []);
  if (request.difficulty !== 'Any' && trail.difficulty === request.difficulty) score += 8;
  if ((request.group.includes('Family with children') || request.group.includes('Older adults') || request.needs.includes('Avoid steep inclines')) && trail.difficulty === 'Easy') score += 6;
  if (request.needs.includes('Shade preferred') && features.has('Shaded')) score += 8;
  if (request.needs.includes('Paved or firm surface') && [...features].some(feature => /paved|firm/i.test(feature))) score += 8;
  if (request.needs.includes('Frequent rest stops') && numericFact(trail.length) != null) score += Math.max(0, 5 - numericFact(trail.length));
  return score;
}

function matchReasons(trail, request) {
  const reasons = [];
  const features = new Set(trail.features || []);
  if (request.difficulty !== 'Any' && trail.difficulty === request.difficulty) reasons.push(`${trail.difficulty} difficulty match`);
  if (request.distance !== 'Any distance' && trail.length) reasons.push(`${trail.length} route fits your distance filter`);
  if (request.needs.includes('Shade preferred') && features.has('Shaded')) reasons.push('Source data lists shade');
  if ((request.group.includes('Family with children') || request.group.includes('Older adults') || request.needs.includes('Avoid steep inclines')) && trail.difficulty === 'Easy') reasons.push('Easy rating matches your group context');
  return reasons;
}

function gearFor(request, trails) {
  const items = ['Water and electrolytes', 'Downloaded map or paper backup', 'Sun protection', 'First-aid essentials', 'Charged phone and backup power'];
  if (request.group.includes('Dog') || request.needs.includes('Dog-friendly')) items.push('Leash, dog water, and waste bags');
  if (request.group.includes('Family with children')) items.push('Extra snacks and a warm layer for each child');
  if (request.needs.includes('Frequent rest stops')) items.push('Portable seat or planned rest-break gear');
  if (trails.some(trail => numericFact(trail.elevationGain) >= 1000)) items.push('Trekking poles and an extra insulating layer');
  return items;
}

export function buildTripPlan(request, searchResult) {
  const available = searchResult.trails
    .map((trail, index) => ({ trail, index, score: preferenceScore(trail, request) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(item => item.trail)
    .slice(0, request.days);
  const sources = available.map(sourceForTrail);
  const days = available.map((trail, index) => {
    const source = sources[index];
    return {
      day: index + 1,
      trailId: trail.placeId || null,
      name: trail.name,
      area: trail.vicinity || searchResult.entity?.name || request.destination,
      difficulty: trail.difficulty || 'Not supplied by source',
      distance: trail.length || 'Not supplied by source',
      elevationGain: trail.elevationGain || 'Not supplied by source',
      routeType: trail.routeType || 'Not supplied by source',
      estimatedMinutes: estimateTrailMinutes(trail),
      accessStatus: trail.access?.status || 'Unknown — check before leaving',
      sourceId: source.id,
      sourceUrl: source.url,
      sourceProvider: source.provider,
      matchReasons: matchReasons(trail, request),
    };
  });

  const unknowns = [];
  if (days.some(day => day.distance.startsWith('Not supplied'))) unknowns.push('Some trail distances are not supplied by the source.');
  if (days.some(day => day.elevationGain.startsWith('Not supplied'))) unknowns.push('Some elevation gain facts are unavailable.');
  if (days.length < request.days) unknowns.push(`Only ${days.length} sourced trail${days.length === 1 ? '' : 's'} matched, so Odyssey did not invent the remaining day${request.days - days.length === 1 ? '' : 's'}.`);
  if (request.needs.length) unknowns.push('Confirm accessibility, shade, restroom, and dog rules with the land manager; missing facts are not treated as approval.');

  return {
    id: `plan-${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: `${days.length}-day ${request.destination} plan`,
    summary: days.length === 1
      ? `A focused day built around ${days[0].name}, matched to the preferences you provided.`
      : `${days.length} trail days near ${request.destination}, ordered from the strongest available matches.`,
    request,
    grounding: searchResult.coverage?.verified ? 'verified-catalog' : 'community-mapped',
    coverageMessage: searchResult.coverage?.message || null,
    days,
    gear: gearFor(request, available),
    safety: [
      'Check the linked land-manager page for closures, permits, and current conditions.',
      'Share the route and expected return time with a trusted contact.',
      'Turn around for worsening weather, unsafe footing, or insufficient daylight.',
      'Download route information before leaving reliable coverage.',
    ],
    unknowns,
    sources,
  };
}
