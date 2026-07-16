import { YOSEMITE_PARK } from '@/data/catalog/parks/yosemite';
import { MOUNT_DIABLO_PARK } from '@/data/catalog/parks/mount-diablo';
import { YOSEMITE_TRAILS } from '@/data/catalog/trails/yosemite';
import { YOSEMITE_EXPANDED_TRAILS } from '@/data/catalog/trails/yosemite-expanded';
import { MOUNT_DIABLO_TRAILS } from '@/data/catalog/trails/mount-diablo';
import { getCatalogSource } from '@/data/catalog/sources';
import { normalizeTrail, validateTrail } from './schema';

const PARKS = [YOSEMITE_PARK, MOUNT_DIABLO_PARK];
const TRAILS = [...YOSEMITE_TRAILS, ...YOSEMITE_EXPANDED_TRAILS, ...MOUNT_DIABLO_TRAILS].map(normalizeTrail);

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

export function getParks() {
  return [...PARKS];
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
    .flatMap(trail => [
      getCatalogSource(trail.source.provider)?.attribution || trail.source.attribution,
      trail.source.geometry?.attribution,
    ])
    .filter(Boolean))];
}

export function auditCatalog() {
  const errors = [];
  const parkIds = new Set();
  for (const park of PARKS) {
    if (parkIds.has(park.id)) errors.push({ id: park.id, errors: ['duplicate park id'] });
    parkIds.add(park.id);
  }
  const trailIds = new Set();
  for (const trail of TRAILS) {
    if (trailIds.has(trail.id)) errors.push({ id: trail.id, errors: ['duplicate trail id'] });
    trailIds.add(trail.id);
    const result = validateTrail(trail);
    if (!result.valid) errors.push({ id: trail.id, errors: result.errors });
    if (!getParkById(trail.geography.parkId)) errors.push({ id: trail.id, errors: ['unknown parkId'] });
    if (!getCatalogSource(trail.source.provider)) errors.push({ id: trail.id, errors: ['unknown source provider'] });
    const geometry = trail.source.geometry;
    if (geometry?.provider === 'osm' && !Number.isInteger(geometry.relationId)) {
      errors.push({ id: trail.id, errors: ['invalid OpenStreetMap relation geometry'] });
    } else if (geometry?.provider === 'ca-state-parks-arcgis'
      && (!Array.isArray(geometry.featureIds) || geometry.featureIds.length === 0
        || geometry.featureIds.some(featureId => !Number.isInteger(featureId) || featureId <= 0))) {
      errors.push({ id: trail.id, errors: ['invalid California State Parks geometry'] });
    } else if (geometry && !['osm', 'ca-state-parks-arcgis'].includes(geometry.provider)) {
      errors.push({ id: trail.id, errors: ['unknown geometry provider'] });
    }
  }
  return { valid: errors.length === 0, errors, parkCount: PARKS.length, trailCount: TRAILS.length };
}
