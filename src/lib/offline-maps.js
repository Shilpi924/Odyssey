export function lon2tile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

export function lat2tile(lat, zoom) {
  return Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
}

export function lngLatToTile(lng, lat, zoom) {
  return {
    x: lon2tile(lng, zoom),
    y: lat2tile(lat, zoom),
    z: zoom
  };
}

export function getBoundingBox(geojson) {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  
  if (!geojson || !geojson.coordinates) return null;

  let coords = geojson.coordinates;
  if (geojson.type === 'Polygon' || geojson.type === 'MultiLineString') {
    coords = coords.flat(1);
  } else if (geojson.type === 'Point') {
    coords = [coords];
  }

  for (const [lng, lat] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  
  // Padding (~500m)
  const paddingLat = 0.005;
  const paddingLng = 0.005;

  return {
    minLat: minLat - paddingLat,
    maxLat: maxLat + paddingLat,
    minLng: minLng - paddingLng,
    maxLng: maxLng + paddingLng,
  };
}

export function generateTileUrls(trail, zoomLevels = [12, 13, 14, 15]) {
  const bbox = getBoundingBox(trail.route?.geometry || trail.geom);
  const urls = [];
  
  if (!bbox) {
    // Fallback: 3x3 grid around center
    const z = 15;
    const centerTlsX = lon2tile(trail.lng, z);
    const centerTlsY = lat2tile(trail.lat, z);
    for (let x = centerTlsX - 2; x <= centerTlsX + 2; x++) {
      for (let y = centerTlsY - 2; y <= centerTlsY + 2; y++) {
        urls.push(`https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`);
      }
    }
    return urls;
  }

  for (const z of zoomLevels) {
    const minX = lon2tile(bbox.minLng, z);
    const maxX = lon2tile(bbox.maxLng, z);
    const minY = lat2tile(bbox.maxLat, z);
    const maxY = lat2tile(bbox.minLat, z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        urls.push(`https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`);
      }
    }
  }

  return urls;
}

export async function downloadAreaTiles(trail, onProgress = null) {
  const CACHE_NAME = 'odyssey-map-tiles-v1';
  const urls = generateTileUrls(trail);
  
  let downloadedCount = 0;
  
  try {
    const cache = await caches.open(CACHE_NAME);
    
    // Process in batches so we don't overwhelm the browser with 1000 concurrent requests
    const batchSize = 10;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (url) => {
          try {
            // First check if already cached
            const exists = await cache.match(url);
            if (!exists) {
              const res = await fetch(url, { mode: 'no-cors' });
              if (res) await cache.put(url, res);
            }
          } catch (e) {
            console.warn(`Failed to cache tile ${url}`, e);
          } finally {
            downloadedCount++;
            if (onProgress) onProgress(downloadedCount, urls.length);
          }
        })
      );
    }
    console.log(`Successfully cached ${urls.length} offline tiles for trail ${trail.name}`);
    return urls.length;
  } catch (error) {
    console.error('Error opening cache for offline tiles:', error);
    throw error;
  }
}

export async function deleteAreaTiles(trail) {
  const CACHE_NAME = 'odyssey-map-tiles-v1';
  const urls = generateTileUrls(trail);
  
  try {
    const cache = await caches.open(CACHE_NAME);
    let deletedCount = 0;
    
    await Promise.all(
      urls.map(async (url) => {
        try {
          const deleted = await cache.delete(url);
          if (deleted) deletedCount++;
        } catch (e) {
          console.warn(`Failed to delete tile ${url}`, e);
        }
      })
    );
    console.log(`Successfully deleted ${deletedCount} offline tiles for trail ${trail.name}`);
    return deletedCount;
  } catch (error) {
    console.error('Error opening cache for tile deletion:', error);
    throw error;
  }
}

export async function clearAllTiles() {
  const CACHE_NAME = 'odyssey-map-tiles-v1';
  try {
    await caches.delete(CACHE_NAME);
    console.log('Successfully cleared all offline map tiles.');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}
