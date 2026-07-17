const METERS_PER_MILE = 1609.344;

export const ACTIVITY_VISIBILITIES = Object.freeze(['private', 'followers', 'public']);

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(finite(totalSeconds)));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatDistance(distanceMeters) {
  return `${(Math.max(0, finite(distanceMeters)) / METERS_PER_MILE).toFixed(2)} mi`;
}

export function formatPace(secondsPerMile) {
  const seconds = Math.max(0, Math.round(finite(secondsPerMile)));
  if (!seconds) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} /mi`;
}

export function createCompletedActivity({
  id,
  trail,
  startedAt,
  completedAt = Date.now(),
  durationSeconds,
  distanceMeters,
  elevationGainMeters,
  points = [],
  title,
  notes = '',
  visibility = 'private',
}) {
  const safeVisibility = ACTIVITY_VISIBILITIES.includes(visibility) ? visibility : 'private';
  const acceptedPoints = points
    .filter(point => point?.accepted !== false && Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude))
    .sort((a, b) => finite(a.timestamp) - finite(b.timestamp))
    .map(point => ({
      latitude: point.latitude,
      longitude: point.longitude,
      altitude: Number.isFinite(point.altitude) ? point.altitude : null,
      timestamp: finite(point.timestamp, null),
      accuracy: Number.isFinite(point.accuracy) ? point.accuracy : null,
    }));
  const safeDistance = Math.max(0, finite(distanceMeters));
  const safeDuration = Math.max(0, Math.round(finite(durationSeconds)));
  const route = acceptedPoints.length >= 2 ? {
    type: 'LineString',
    coordinates: acceptedPoints.map(point => [point.longitude, point.latitude]),
  } : null;

  return {
    id: String(id || `activity-${completedAt}`),
    type: 'hike',
    title: String(title || trail?.name || 'Outdoor activity').trim().slice(0, 100),
    trailId: trail?.placeId || trail?.id || null,
    trailName: trail?.name || null,
    sourceAttribution: trail?.sourceAttribution || null,
    startedAt: finite(startedAt, completedAt),
    completedAt: finite(completedAt, Date.now()),
    durationSeconds: safeDuration,
    distanceMeters: safeDistance,
    elevationGainMeters: Math.max(0, finite(elevationGainMeters)),
    averagePaceSecondsPerMile: safeDistance > 0 ? Math.round(safeDuration / (safeDistance / METERS_PER_MILE)) : 0,
    points: acceptedPoints,
    route,
    notes: String(notes || '').trim().slice(0, 2000),
    visibility: safeVisibility,
    hideStartEnd: true,
    syncedAt: null,
  };
}

function xml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function activityToGpx(activity) {
  const points = Array.isArray(activity?.points) ? activity.points : [];
  const trackPoints = points.map(point => {
    const elevation = Number.isFinite(point.altitude) ? `<ele>${point.altitude}</ele>` : '';
    const time = point.timestamp ? `<time>${new Date(point.timestamp).toISOString()}</time>` : '';
    return `      <trkpt lat="${point.latitude}" lon="${point.longitude}">${elevation}${time}</trkpt>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Odyssey" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${xml(activity?.title || 'Odyssey activity')}</name></metadata>
  <trk><name>${xml(activity?.title || 'Odyssey activity')}</name><trkseg>
${trackPoints}
  </trkseg></trk>
</gpx>`;
}

export function activitySyncPayload(activity) {
  let route = activity.route;
  if (activity.hideStartEnd !== false && route?.type === 'LineString' && Array.isArray(route.coordinates)) {
    const trim = Math.min(20, Math.max(1, Math.floor(route.coordinates.length * 0.05)));
    route = route.coordinates.length > trim * 2 + 1
      ? { ...route, coordinates: route.coordinates.slice(trim, -trim) }
      : null;
  }
  return {
    id: activity.id,
    title: activity.title,
    trailId: activity.trailId,
    trailName: activity.trailName,
    startedAt: activity.startedAt,
    completedAt: activity.completedAt,
    durationSeconds: activity.durationSeconds,
    distanceMeters: activity.distanceMeters,
    elevationGainMeters: activity.elevationGainMeters,
    averagePaceSecondsPerMile: activity.averagePaceSecondsPerMile,
    notes: activity.notes,
    visibility: ACTIVITY_VISIBILITIES.includes(activity.visibility) ? activity.visibility : 'private',
    hideStartEnd: activity.hideStartEnd !== false,
    route,
  };
}
