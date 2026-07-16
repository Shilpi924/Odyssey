export const DEFAULT_THEME = 'alpine';
export const THEME_COOKIE = 'odyssey-display';
export const THEME_IDS = ['alpine', 'meadow', 'sunset', 'daylight'];
export const THEME_MODES = ['manual', 'system', 'scheduled'];

export const THEMES = [
  { id: 'alpine', name: 'Alpine', description: 'Ink blue · glacier teal', colors: ['#071a24', '#65d6c1', '#ffb86b'], dark: true },
  { id: 'meadow', name: 'Meadow', description: 'Forest · fresh sage', colors: ['#101a15', '#91d6a6', '#e7ad61'], dark: true },
  { id: 'sunset', name: 'Sunset', description: 'Plum · desert coral', colors: ['#19151a', '#f09a78', '#f1c27d'], dark: true },
  { id: 'daylight', name: 'Daylight', description: 'Warm paper · evergreen', colors: ['#f4f1e8', '#217a65', '#c87137'], dark: false },
];

export function isDarkTheme(themeId) {
  return THEMES.find(theme => theme.id === themeId)?.dark ?? true;
}

export const normalizeDisplayPreferences = (preferences = {}) => ({
  theme: THEME_IDS.includes(preferences.theme) ? preferences.theme : DEFAULT_THEME,
  themeMode: THEME_MODES.includes(preferences.themeMode) ? preferences.themeMode : 'manual',
  highContrast: Boolean(preferences.highContrast),
  reducedMotion: Boolean(preferences.reducedMotion),
});

const toRadians = (degrees) => degrees * Math.PI / 180;

export function getLocalSunWindow(date = new Date(), coords) {
  if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
    return { sunrise: 7 * 60, sunset: 18 * 60, estimated: true };
  }
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86_400_000);
  const gamma = (2 * Math.PI / 365) * (day - 1);
  const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const latitude = toRadians(Math.max(-89, Math.min(89, coords.latitude)));
  const hourAngle = Math.acos(Math.min(1, Math.max(-1, (Math.cos(toRadians(90.833)) / (Math.cos(latitude) * Math.cos(declination))) - Math.tan(latitude) * Math.tan(declination))));
  const timezoneMinutes = -date.getTimezoneOffset();
  const solarNoon = 720 - (4 * coords.longitude) - equationOfTime + timezoneMinutes;
  const daylightOffset = 4 * (hourAngle * 180 / Math.PI);
  return { sunrise: solarNoon - daylightOffset, sunset: solarNoon + daylightOffset, estimated: false };
}

export function isDaylight(date = new Date(), coords) {
  const { sunrise, sunset } = getLocalSunWindow(date, coords);
  const current = date.getHours() * 60 + date.getMinutes();
  return current >= sunrise && current < sunset;
}

export function resolveTheme(preferences = {}, environment = {}) {
  const display = normalizeDisplayPreferences(preferences);
  const hour = Number.isFinite(environment.hour) ? environment.hour : 12;
  const darkTheme = display.theme === 'daylight' ? DEFAULT_THEME : display.theme;
  if (display.themeMode === 'system') return environment.systemDark ? darkTheme : 'daylight';
  if (display.themeMode === 'scheduled') {
    const daytime = typeof environment.isDaytime === 'boolean' ? environment.isDaytime : hour >= 7 && hour < 18;
    return daytime ? 'daylight' : darkTheme;
  }
  return display.theme;
}

export function serializeDisplayPreferences(preferences, resolvedTheme) {
  const display = normalizeDisplayPreferences(preferences);
  return encodeURIComponent(JSON.stringify({ ...display, resolvedTheme: THEME_IDS.includes(resolvedTheme) ? resolvedTheme : display.theme }));
}

export function parseDisplayPreferences(value) {
  if (!value) return normalizeDisplayPreferences();
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    const display = normalizeDisplayPreferences(parsed);
    return { ...display, resolvedTheme: THEME_IDS.includes(parsed.resolvedTheme) ? parsed.resolvedTheme : display.theme };
  } catch {
    return { ...normalizeDisplayPreferences(), resolvedTheme: DEFAULT_THEME };
  }
}
