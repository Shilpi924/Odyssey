import { isDarkTheme } from './theme';

export const DEFAULT_STADIA_LIGHT_STYLE_URL = 'https://tiles.stadiamaps.com/styles/alidade_smooth.json';
export const DEFAULT_STADIA_DARK_STYLE_URL = 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';
// Kept as a compatibility alias for callers that expect the original dark default.
export const DEFAULT_STADIA_STYLE_URL = DEFAULT_STADIA_DARK_STYLE_URL;

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
const styleUrls = Object.freeze({
  light: resolveMapStyleUrl(
    process.env.NEXT_PUBLIC_MAP_STYLE_LIGHT_URL || sharedStyleOverride,
    DEFAULT_STADIA_LIGHT_STYLE_URL
  ),
  dark: resolveMapStyleUrl(
    process.env.NEXT_PUBLIC_MAP_STYLE_DARK_URL || sharedStyleOverride,
    DEFAULT_STADIA_DARK_STYLE_URL
  ),
});

export const MAP_CONFIG = Object.freeze({
  provider: 'stadia',
  providerName: 'Stadia Maps',
  styleUrl: styleUrls.dark,
  styleUrls,
  productionReleaseGate: 'A paid Stadia plan and production-domain authentication are required before release.',
});

export function getMapStyleUrl(resolvedTheme) {
  return isDarkTheme(resolvedTheme) ? MAP_CONFIG.styleUrls.dark : MAP_CONFIG.styleUrls.light;
}
