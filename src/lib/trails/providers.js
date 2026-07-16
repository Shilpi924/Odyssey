import { relationToMultiLineString, stitchLineSegments } from './geometry.js';

const CA_STATE_PARKS_TRAIL_LAYER = 'https://services2.arcgis.com/AhxrK3F6WM8ECvDi/arcgis/rest/services/Click_able_Layers/FeatureServer/4/query';
const PROVIDER_USER_AGENT = 'Odyssey/0.1 (+https://github.com/Shilpi924/Odyssey)';

export async function fetchOsmRelationGeometry(relationId, fetchImpl = fetch) {
  if (!/^\d+$/.test(String(relationId))) throw new Error('Invalid OSM relation ID');
  const query = `[out:json][timeout:30];relation(${relationId});out geom;`;
  const url = new URL('https://overpass-api.de/api/interpreter');
  url.searchParams.set('data', query);
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': PROVIDER_USER_AGENT },
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error(`OpenStreetMap geometry request failed (${response.status})`);
  const data = await response.json();
  const relation = data.elements?.find(element => element.type === 'relation');
  if (!relation) throw new Error('OpenStreetMap relation not found');
  return relationToMultiLineString(relation);
}

export async function fetchCaliforniaStateParksTrailGeometry(source, fetchImpl = fetch) {
  const featureIds = source?.featureIds;
  if (!Array.isArray(featureIds) || featureIds.length === 0 || featureIds.length > 25
    || featureIds.some(id => !Number.isInteger(id) || id <= 0)) {
    throw new Error('Invalid California State Parks feature IDs');
  }
  const url = new URL(CA_STATE_PARKS_TRAIL_LAYER);
  url.searchParams.set('objectIds', featureIds.join(','));
  url.searchParams.set('outFields', 'OBJECTID,Unit_Nbr,ROUTENAME,TRLDES,GlobalID');
  url.searchParams.set('returnGeometry', 'true');
  url.searchParams.set('outSR', '4326');
  url.searchParams.set('f', 'geojson');
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/geo+json, application/json', 'User-Agent': PROVIDER_USER_AGENT },
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error(`California State Parks geometry request failed (${response.status})`);
  const data = await response.json();
  const features = (data.features || []).filter(feature => (
    source.unitNumber == null || Number(feature.properties?.Unit_Nbr) === Number(source.unitNumber)
  ));
  const requestedFeatureIds = new Set(featureIds);
  const returnedFeatureIds = features.map(feature => Number(feature.properties?.OBJECTID));
  const returnedFeatureIdSet = new Set(returnedFeatureIds);
  const hasExactFeatureCoverage = returnedFeatureIds.every(id => (
    Number.isInteger(id) && requestedFeatureIds.has(id)
  )) && requestedFeatureIds.size === returnedFeatureIdSet.size
    && [...requestedFeatureIds].every(id => returnedFeatureIdSet.has(id));
  if (!hasExactFeatureCoverage) {
    throw new Error('California State Parks trail geometry is incomplete or unavailable for the requested features');
  }
  const lines = features.flatMap(feature => {
    if (feature.geometry?.type === 'LineString') return [feature.geometry.coordinates];
    if (feature.geometry?.type === 'MultiLineString') return feature.geometry.coordinates;
    return [];
  }).filter(line => line.length >= 2);
  if (!lines.length) throw new Error('California State Parks trail geometry is unavailable');
  return { type: 'MultiLineString', coordinates: stitchLineSegments(lines) };
}

export async function fetchNpsAlerts(parkCode, apiKey, fetchImpl = fetch) {
  if (!apiKey) return { available: false, alerts: [], fetchedAt: null };
  if (!/^[a-z]{4}$/.test(parkCode)) throw new Error('Invalid NPS park code');
  const url = new URL('https://developer.nps.gov/api/v1/alerts');
  url.searchParams.set('parkCode', parkCode);
  url.searchParams.set('limit', '50');
  const response = await fetchImpl(url, {
    headers: { 'X-Api-Key': apiKey },
    next: { revalidate: 900 },
  });
  if (!response.ok) throw new Error(`NPS alerts request failed (${response.status})`);
  const data = await response.json();
  return {
    available: true,
    fetchedAt: new Date().toISOString(),
    alerts: (data.data || []).map(alert => ({
      id: alert.id,
      title: alert.title,
      description: alert.description,
      category: alert.category,
      url: alert.url,
      lastIndexedDate: alert.lastIndexedDate,
    })),
  };
}

export async function fetchNpsParkBoundary(parkCode, apiKey, fetchImpl = fetch) {
  if (!apiKey) return null;
  if (!/^[a-z]{4}$/.test(parkCode)) throw new Error('Invalid NPS park code');
  const response = await fetchImpl(`https://developer.nps.gov/api/v1/mapdata/parkboundaries/${parkCode}`, {
    headers: { 'X-Api-Key': apiKey },
    next: { revalidate: 2592000 },
  });
  if (!response.ok) throw new Error(`NPS boundary request failed (${response.status})`);
  const data = await response.json();
  const feature = data.features?.[0];
  if (!feature?.geometry || !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) throw new Error('NPS boundary geometry is unavailable');
  return {
    type: 'Feature',
    geometry: feature.geometry,
    properties: {
      name: feature.properties?.fullName || feature.properties?.name || parkCode,
      parkCode,
      source: 'U.S. National Park Service',
    },
  };
}
