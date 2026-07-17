export function isRouteGeometry(value) {
  return Boolean(value
    && ['LineString', 'MultiLineString'].includes(value.type)
    && Array.isArray(value.coordinates)
    && value.coordinates.length > 0);
}

export function isInternalGeometryUrl(value) {
  return /^\/api\/trails\/[a-z0-9-]+\/geometry$/.test(String(value || ''));
}

export async function fetchOfflineRoute(trail, fetchImpl = fetch) {
  if (!isInternalGeometryUrl(trail?.geometryUrl)) return null;
  const response = await fetchImpl(trail.geometryUrl, { headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  const body = await response.json();
  return isRouteGeometry(body.geometry) ? body.geometry : null;
}

export function createSavedHike(trail, route, savedAt = Date.now()) {
  return {
    ...trail,
    id: `${trail.name}-${trail.lat}`,
    savedAt,
    route: isRouteGeometry(route) ? route : null,
    offlineRouteStatus: isRouteGeometry(route) ? 'ready' : 'unavailable',
  };
}
