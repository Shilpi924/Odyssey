import { YOSEMITE_PARK } from '@/data/catalog/parks/yosemite';
import { YOSEMITE_TRAILS } from '@/data/catalog/trails/yosemite';
import { getCatalogSource } from '@/data/catalog/sources';
import { normalizeTrail, validateTrail } from './schema';

const PARKS = [YOSEMITE_PARK];
const TRAILS = YOSEMITE_TRAILS.map(normalizeTrail);

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = ((yi > point.lat) !== (yj > point.lat))
      && (point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

export function pointInParkSearchBoundary(point, park) {
  const ring = park?.searchBoundary?.coordinates?.[0];
  return Boolean(ring && pointInRing(point, ring));
}

export function getParkById(parkId) {
  return PARKS.find(park => park.id === parkId) || null;
}

export function getParkByCode(parkCode) {
  return PARKS.find(park => park.parkCode === parkCode) || null;
}

export function getTrailsByParkId(parkId) {
  return TRAILS.filter(trail => trail.geography.parkId === parkId);
}

export function getTrailById(trailId) {
  return TRAILS.find(trail => trail.id === trailId) || null;
}

export function getParksContainingPoint(point) {
  return PARKS.filter(park => pointInParkSearchBoundary(point, park));
}

export function getCatalogAttributions(trails) {
  return [...new Set(trails
    .map(trail => getCatalogSource(trail.source.provider)?.attribution || trail.source.attribution)
    .filter(Boolean))];
}

export function auditCatalog() {
  const errors = [];
  for (const trail of TRAILS) {
    const result = validateTrail(trail);
    if (!result.valid) errors.push({ id: trail.id, errors: result.errors });
    if (!getParkById(trail.geography.parkId)) errors.push({ id: trail.id, errors: ['unknown parkId'] });
    if (!getCatalogSource(trail.source.provider)) errors.push({ id: trail.id, errors: ['unknown source provider'] });
  }
  return { valid: errors.length === 0, errors, parkCount: PARKS.length, trailCount: TRAILS.length };
}
