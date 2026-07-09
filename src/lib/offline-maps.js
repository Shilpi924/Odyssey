/**
 * Converts lat/lng/zoom to XYZ tile coordinates
 */
export function lngLatToTile(lng, lat, zoom) {
  const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return { x, y, z: zoom };
}

/**
 * Downloads map tiles around a center point for offline usage.
 * We fetch zoom levels 12, 13, 14, 15 around the trail center.
 */
export async function downloadAreaTiles(lat, lng) {
  const CACHE_NAME = 'odyssey-map-tiles-v1';
  const urls = [];

  // Define radius to download in tiles (roughly 2 tiles around the center = ~5x5 grid)
  const zoomLevels = [12, 13, 14, 15];
  
  zoomLevels.forEach(z => {
    const centerTile = lngLatToTile(lng, lat, z);
    const radius = z <= 13 ? 1 : 2; // fetch fewer tiles at low zoom, more at high zoom

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerTile.x + dx;
        const y = centerTile.y + dy;
        // Construct the URL matching our CartoDB Voyager style
        // e.g. https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png
        urls.push(`https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`);
      }
    }
  });

  try {
    const cache = await caches.open(CACHE_NAME);
    // Fetch and cache all URLs in parallel
    await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url, { mode: 'no-cors' });
          if (res) await cache.put(url, res);
        } catch (e) {
          console.warn(`Failed to cache tile ${url}`, e);
        }
      })
    );
    console.log(`Successfully cached ${urls.length} offline tiles for trail at ${lat},${lng}`);
  } catch (error) {
    console.error('Error opening cache for offline tiles:', error);
  }
}
