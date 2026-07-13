import { elevationStats, relationToMultiLineString } from './geometry.js';

export async function fetchOsmRelationGeometry(relationId, fetchImpl = fetch) {
  if (!/^\d+$/.test(String(relationId))) throw new Error('Invalid OSM relation ID');
  const query = `[out:json][timeout:30];relation(${relationId});out geom;`;
  const url = new URL('https://overpass-api.de/api/interpreter');
  url.searchParams.set('data', query);
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Odyssey/0.1 trail-catalog' },
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error(`OpenStreetMap geometry request failed (${response.status})`);
  const data = await response.json();
  const relation = data.elements?.find(element => element.type === 'relation');
  if (!relation) throw new Error('OpenStreetMap relation not found');
  return relationToMultiLineString(relation);
}

export async function fetchElevationProfile(coordinates, apiKey, fetchImpl = fetch) {
  if (!apiKey) return null;
  const points = coordinates.filter((_, index) => index % Math.max(1, Math.ceil(coordinates.length / 200)) === 0).slice(0, 200);
  if (points.length < 2) return null;
  const locations = points.map(([lng, lat]) => `${lat},${lng}`).join('|');
  const url = new URL('https://maps.googleapis.com/maps/api/elevation/json');
  url.searchParams.set('locations', locations);
  url.searchParams.set('key', apiKey);
  const response = await fetchImpl(url, { next: { revalidate: 604800 } });
  if (!response.ok) throw new Error(`Elevation request failed (${response.status})`);
  const data = await response.json();
  if (data.status !== 'OK') throw new Error(`Elevation provider returned ${data.status}`);
  const samples = data.results.map(result => ({
    lat: result.location.lat,
    lng: result.location.lng,
    elevationFeet: result.elevation * 3.28084,
  }));
  return { samples, ...elevationStats(samples) };
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
