import { expect, test } from 'vitest';
import { lngLatToTile } from '../src/lib/offline-maps';

test('converts SF coordinates to tile at zoom 12', () => {
  const lng = -122.4194;
  const lat = 37.7749;
  const zoom = 12;

  const tile = lngLatToTile(lng, lat, zoom);

  // Values can be verified with an XYZ tile calculator for zoom 12
  // x = Math.floor((lng + 180) / 360 * 2^12)
  // x = Math.floor(57.5806 / 360 * 4096) = Math.floor(655.139) = 655
  expect(tile.x).toBe(655);
  expect(tile.y).toBe(1583);
  expect(tile.z).toBe(12);
});

test('converts London coordinates to tile at zoom 14', () => {
  const lng = -0.1276;
  const lat = 51.5072;
  const zoom = 14;

  const tile = lngLatToTile(lng, lat, zoom);

  expect(tile.x).toBe(8186);
  expect(tile.y).toBe(5448);
  expect(tile.z).toBe(14);
});
