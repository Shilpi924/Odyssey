import { expect, test } from 'vitest';
import { calculateDistance } from './distance';

test('calculates distance between San Francisco and Los Angeles', () => {
  // SF
  const lat1 = 37.7749;
  const lon1 = -122.4194;
  // LA
  const lat2 = 34.0522;
  const lon2 = -118.2437;

  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  
  // Distance is approx 559 km. We allow some tolerance.
  expect(distance).toBeGreaterThan(550);
  expect(distance).toBeLessThan(570);
});

test('calculates distance of 0 for same coordinates', () => {
  const lat = 40.7128;
  const lon = -74.0060;
  expect(calculateDistance(lat, lon, lat, lon)).toBe(0);
});
