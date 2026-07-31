import { isDarkTheme } from './theme';

// OpenStreetMap raster tiles as fallback (free, no API key required)
// Using a more vibrant OSM tile server with better hiking visualization
export const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const DEFAULT_STADIA_LIGHT_STYLE_URL = 'https://tiles.stadiamaps.com/styles/outdoors.json';
export const DEFAULT_STADIA_DARK_STYLE_URL = 'https://tiles.stadiamaps.com/styles/outdoors.json';
// Kept as a compatibility alias for callers that expect the original dark default.
export const DEFAULT_STADIA_STYLE_URL = DEFAULT_STADIA_DARK_STYLE_URL;

export const OFFLINE_MAP_STYLE = Object.freeze({
  version: 8,
  name: 'Odyssey offline route canvas',
  sources: {},
  layers: [{
    id: 'offline-background',
    type: 'background',
    paint: { 'background-color': '#0f172a' },
  }],
});

export function resolveMapStyleUrl(value, fallback = DEFAULT_STADIA_DARK_STYLE_URL) {
  const candidate = String(value || '').trim() || fallback;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('Map style URL must be a valid URL');
  }
  const localDevelopment = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localDevelopment) throw new Error('Map style URL must use HTTPS');
  return url.toString();
}

const sharedStyleOverride = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
const stadiaApiKey = process.env.NEXT_PUBLIC_STADIA_API_KEY;
// Use OSM by default for development (free, no API key)
const useOSMFallback = process.env.NEXT_PUBLIC_USE_OSM_MAP !== 'false';

// Append Stadia API key to style URLs if provided
const appendStadiaKey = (url) => {
  if (!stadiaApiKey || !url.includes('stadiamaps.com')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}api_key=${stadiaApiKey}`;
};

const styleUrls = Object.freeze({
  light: useOSMFallback ? OSM_RASTER_STYLE : appendStadiaKey(resolveMapStyleUrl(
    process.env.NEXT_PUBLIC_MAP_STYLE_LIGHT_URL || sharedStyleOverride,
    DEFAULT_STADIA_LIGHT_STYLE_URL
  )),
  dark: useOSMFallback ? OSM_RASTER_STYLE : appendStadiaKey(resolveMapStyleUrl(
    process.env.NEXT_PUBLIC_MAP_STYLE_DARK_URL || sharedStyleOverride,
    DEFAULT_STADIA_DARK_STYLE_URL
  )),
});

export const MAP_CONFIG = Object.freeze({
  provider: useOSMFallback ? 'osm' : 'stadia',
  providerName: useOSMFallback ? 'OpenStreetMap' : 'Stadia Maps',
  styleUrl: styleUrls.dark,
  styleUrls,
  productionReleaseGate: useOSMFallback 
    ? 'OpenStreetMap tiles are free for development. For production, consider a commercial map provider for better performance and reliability.'
    : 'A paid Stadia plan and production-domain authentication are required before release.',
});

export function getMapStyleUrl(resolvedTheme) {
  return isDarkTheme(resolvedTheme) ? MAP_CONFIG.styleUrls.dark : MAP_CONFIG.styleUrls.light;
}

export function getMapStyle(resolvedTheme, offline = false) {
  if (offline) return OFFLINE_MAP_STYLE;
  return getMapStyleUrl(resolvedTheme);
}
