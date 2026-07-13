export const DEFAULT_STADIA_STYLE_URL = 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

export function resolveMapStyleUrl(value) {
  const candidate = String(value || '').trim() || DEFAULT_STADIA_STYLE_URL;
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

export const MAP_CONFIG = Object.freeze({
  provider: 'stadia',
  providerName: 'Stadia Maps',
  styleUrl: resolveMapStyleUrl(process.env.NEXT_PUBLIC_MAP_STYLE_URL),
  productionReleaseGate: 'A paid Stadia plan and production-domain authentication are required before release.',
});
