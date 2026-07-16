import { test, expect } from '@playwright/test';
import { mockedStadiaStyle, mockedTrailResponse } from './fixtures.js';

const mapInteractionTrails = [
  {
    name: 'North Ridge Trail',
    placeId: 'map-north-ridge',
    lat: 37.9,
    lng: -121.94,
    difficulty: 'Moderate',
    length: '2.0 miles',
    elevationGain: '500 ft',
    vicinity: 'North Ridge, CA',
    routeType: 'Out and back',
    features: ['Scenic'],
    sourceKind: 'verified-catalog',
    sourceAttribution: 'Source: Test Parks',
    geometrySource: { provider: 'ca-state-parks-arcgis' },
    geometryUrl: '/api/trails/map-north-ridge/geometry',
    access: { status: 'Open' },
  },
  {
    name: 'South Ridge Trail',
    placeId: 'map-south-ridge',
    lat: 37.84,
    lng: -121.91,
    difficulty: 'Easy',
    length: '1.2 miles',
    elevationGain: '180 ft',
    vicinity: 'South Ridge, CA',
    routeType: 'Loop',
    features: ['Scenic'],
    sourceKind: 'verified-catalog',
    sourceAttribution: 'Source: Test Parks',
    geometrySource: { provider: 'ca-state-parks-arcgis' },
    geometryUrl: '/api/trails/map-south-ridge/geometry',
    access: { status: 'Open' },
  },
];

async function markerCenters(markers) {
  const count = await markers.count();
  return Promise.all(Array.from({ length: count }, async (_, index) => {
    const box = await markers.nth(index).boundingBox();
    return box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null;
  }));
}

async function stableMarkerCenters(markers) {
  let previous = null;
  let stableSamples = 0;
  await expect.poll(async () => {
    const current = await markerCenters(markers);
    const stable = previous && current.every((point, index) => point && previous[index]
      && Math.abs(point.x - previous[index].x) < 0.75
      && Math.abs(point.y - previous[index].y) < 0.75);
    stableSamples = stable ? stableSamples + 1 : 0;
    previous = current;
    return stableSamples;
  }, { timeout: 8_000, intervals: [100, 150, 250, 350, 500] }).toBeGreaterThanOrEqual(2);
  return markerCenters(markers);
}

async function expectMarkersInsideMap(map, markers) {
  await expect.poll(async () => {
    const [mapBox, centers] = await Promise.all([map.boundingBox(), markerCenters(markers)]);
    if (!mapBox || centers.some(center => !center)) return false;
    return centers.every(center => center.x >= mapBox.x + 8
      && center.x <= mapBox.x + mapBox.width - 8
      && center.y >= mapBox.y + 8
      && center.y <= mapBox.y + mapBox.height - 8);
  }, { timeout: 8_000 }).toBe(true);
}

test.describe('Search Page Flow', () => {
  // Use a mocked geolocation
  test.use({
    geolocation: { latitude: 37.7749, longitude: -122.4194 },
    permissions: ['geolocation'],
  });

  test('should render search UI and handle basic interactions', async ({ page }) => {
    await page.goto('/search');

    await expect(page.getByRole('heading', { name: 'Find a hike', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Where do you want to hike?' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search trails' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Find hikes near me' })).toBeVisible();
  });

  test('explains location use before starting a nearby search', async ({ page }) => {
    await page.route('**/api/fast-search', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockedTrailResponse) }));
    await page.route('https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockedStadiaStyle) }));
    await page.route('**/api/park-alerts?parkCode=yose', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ available: true, alerts: [] }) }));

    await page.goto('/search?nearme=true');
    await expect(page.getByRole('heading', { name: 'Use your location for nearby trails?' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('odyssey_location_access_v1'))).toBeNull();

    await page.getByRole('button', { name: 'Allow location' }).click();
    await expect(page.getByRole('heading', { name: 'Half Dome via the John Muir Trail', level: 3 })).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate(() => localStorage.getItem('odyssey_location_access_v1'))).toBe('allowed');
  });

  test('recognizes natural current-location wording before searching', async ({ page }) => {
    await page.goto('/search?q=hikes%20by%20my%20current%20location');
    await expect(page.getByRole('heading', { name: 'Use your location for nearby trails?' })).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate(() => localStorage.getItem('odyssey_location_access_v1'))).toBeNull();
  });

  test('can search Yosemite without granting location', async ({ page }) => {
    await page.route('**/api/fast-search', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockedTrailResponse) }));
    await page.route('https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockedStadiaStyle) }));
    await page.route('**/api/park-alerts?parkCode=yose', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ available: true, alerts: [] }) }));

    await page.goto('/search?nearme=true');
    await page.getByRole('button', { name: 'Search Yosemite instead' }).click();
    await expect(page.getByRole('heading', { name: 'Half Dome via the John Muir Trail', level: 3 })).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate(() => localStorage.getItem('odyssey_location_access_v1'))).toBeNull();
  });

  test('handles denied location without retaining the in-app choice', async ({ page }) => {
    await page.addInitScript(() => {
      const denied = { code: 1, message: 'Permission denied' };
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (_success, error) => queueMicrotask(() => error(denied)),
          watchPosition: (_success, error) => { queueMicrotask(() => error(denied)); return 1; },
          clearWatch: () => {},
        },
      });
    });

    await page.goto('/search?nearme=true');
    await page.getByRole('button', { name: 'Allow location' }).click();
    await expect(page.getByText('Location access denied. Please enable location in your browser.')).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('odyssey_location_access_v1'))).toBeNull();
  });

  test('mobile results expand safely and render before the map', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let submittedPreferences;
    await page.route('**/api/fast-search', route => {
      submittedPreferences ||= route.request().postDataJSON()?.preferences;
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(mockedTrailResponse),
      });
    });
    await page.route('https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockedStadiaStyle) }));
    await page.route('**/api/park-alerts?parkCode=yose', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ available: true, fetchedAt: '2026-07-13T07:00:00.000Z', alerts: [{ id: 'alert-1', category: 'Park Closure', title: 'Seasonal trail closure', url: 'https://www.nps.gov/yose/' }] }),
    }));

    await page.goto('/search?q=Yosemite&difficulty=Strenuous&distance=5%E2%80%9310%20miles', { waitUntil: 'domcontentloaded' });
    const result = page.getByRole('heading', { name: 'Half Dome via the John Muir Trail', level: 3 });
    await expect(result).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    expect(submittedPreferences?.hiking).toMatchObject({ difficulty: ['Strenuous'], length: '5–10 miles' });

    const resultCard = page.getByRole('article', { name: 'Half Dome via the John Muir Trail' });
    await expect(page.getByText('1 current park alert')).toBeVisible();
    await expect(resultCard.getByText('Route geometry: OpenStreetMap')).toHaveCount(0);
    await expect(resultCard.getByText('Permit required')).toHaveCount(0);

    const detailButton = resultCard.getByRole('button', { name: 'View details' });
    await expect(detailButton).toHaveAttribute('aria-expanded', 'false');
    await detailButton.click();
    await expect(resultCard.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true');
    await resultCard.getByText('Source & access', { exact: true }).click();
    await expect(resultCard.getByText('Route geometry: OpenStreetMap')).toBeVisible();
    await expect(resultCard.getByText('Permit required')).toBeVisible();
    await expect(resultCard.getByRole('button', { name: 'View map' })).toBeVisible();

    const primaryNav = page.getByRole('navigation', { name: 'Primary' });
    await expect(primaryNav.getByRole('button')).toHaveCount(4);
    await expect(primaryNav.getByRole('button', { name: 'Track' })).toHaveCount(0);
    await expect(primaryNav.getByRole('button', { name: 'Discover' })).toHaveAttribute('aria-current', 'page');

    await resultCard.getByRole('button', { name: 'Start hike' }).click();
    await expect(page.getByRole('heading', { name: 'Allow location to record this hike?' })).toBeVisible();
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(page.getByText('Active Hike', { exact: true })).toHaveCount(0);

    const resultBox = await result.boundingBox();
    const mapBox = await page.locator('#trail-map').boundingBox();
    expect(mapBox.y).toBeGreaterThan(resultBox.y);
    expect(await page.locator('#trail-results, #trail-map').evaluateAll(elements => elements.map(element => element.id))).toEqual(['trail-results', 'trail-map']);

    await primaryNav.getByRole('button', { name: 'Map', exact: true }).click();
    await expect(page).toHaveURL(/view=map/);
    const mapUrl = new URL(page.url());
    expect(mapUrl.searchParams.get('q')).toBe('Yosemite');
    expect(mapUrl.searchParams.get('difficulty')).toBe('Strenuous');
    expect(mapUrl.searchParams.get('distance')).toBe('5–10 miles');
    await expect(primaryNav.getByRole('button', { name: 'Map', exact: true })).toHaveAttribute('aria-current', 'page');

    await expect.poll(async () => {
      const [visibleMap, bottomNavigation] = await Promise.all([
        page.getByRole('region', { name: 'Trail map' }).boundingBox(),
        primaryNav.boundingBox(),
      ]);
      if (!visibleMap || !bottomNavigation) return Number.NEGATIVE_INFINITY;
      return bottomNavigation.y - (visibleMap.y + visibleMap.height);
    }).toBeGreaterThanOrEqual(-2);

    await expect(page.getByRole('link', { name: 'Stadia Maps' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'OpenStreetMap' })).toBeVisible();
  });

  test('changes map selection only through explicit map actions and restores the overview', async ({ page }) => {
    const geometryRequests = [];
    await page.route('**/api/fast-search', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        source: 'catalog',
        entity: { type: 'park', id: 'map-contract-park' },
        trails: mapInteractionTrails,
        hasMore: false,
      }),
    }));
    await page.route('**/api/trails/map-*/geometry', route => {
      const path = new URL(route.request().url()).pathname;
      geometryRequests.push(path);
      const north = path.includes('map-north-ridge');
      const origin = north ? [-121.94, 37.9] : [-121.91, 37.84];
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          geometry: {
            type: 'LineString',
            coordinates: [origin, [origin[0] + 0.004, origin[1] + 0.004]],
          },
        }),
      });
    });
    await page.route('https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(mockedStadiaStyle),
    }));

    await page.goto('/search?q=Mount%20Diablo');
    const map = page.getByRole('region', { name: 'Trail map' });
    const markers = map.getByRole('button', { name: /^Show .* Trail on map$/ });
    const northMarker = map.getByRole('button', { name: 'Show North Ridge Trail on map' });
    const southMarker = map.getByRole('button', { name: 'Show South Ridge Trail on map' });
    const northCard = page.getByRole('article', { name: 'North Ridge Trail' });
    const southCard = page.getByRole('article', { name: 'South Ridge Trail' });
    const overview = page.getByText('2 trails near Mount Diablo State Park, CA', { exact: true });

    await expect(northCard).toBeVisible({ timeout: 15_000 });
    await expect(markers).toHaveCount(2);
    await expect(overview).toBeVisible();
    await expect(northMarker).toHaveAttribute('aria-pressed', 'false');
    await expect(southMarker).toHaveAttribute('aria-pressed', 'false');
    await expectMarkersInsideMap(map, markers);
    const beforeDetails = await stableMarkerCenters(markers);

    await northCard.getByRole('button', { name: 'View details' }).click();
    await expect(northCard.getByRole('button', { name: 'Hide details' })).toBeVisible();
    await expect(overview).toBeVisible();
    await expect(northMarker).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Close trail details' })).toHaveCount(0);
    expect(geometryRequests).toEqual([]);
    const afterDetails = await stableMarkerCenters(markers);
    for (let index = 0; index < beforeDetails.length; index += 1) {
      expect(Math.abs(afterDetails[index].x - beforeDetails[index].x)).toBeLessThan(2);
      expect(Math.abs(afterDetails[index].y - beforeDetails[index].y)).toBeLessThan(2);
    }

    await northCard.getByRole('button', { name: 'View map' }).click();
    await expect(page.getByText('Showing North Ridge Trail', { exact: true })).toBeVisible();
    await expect(northMarker).toHaveAttribute('aria-pressed', 'true');
    await expect(southMarker).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => geometryRequests.filter(path => path.includes('map-north-ridge')).length).toBe(1);

    await southCard.getByRole('button', { name: 'View details' }).click();
    await expect(page.getByText('Showing North Ridge Trail', { exact: true })).toBeVisible();
    await expect(northMarker).toHaveAttribute('aria-pressed', 'true');
    expect(geometryRequests.filter(path => path.includes('map-south-ridge'))).toEqual([]);

    await southCard.getByRole('button', { name: 'View map' }).click();
    await expect(page.getByText('Showing South Ridge Trail', { exact: true })).toBeVisible();
    await expect(page.getByText('Showing North Ridge Trail', { exact: true })).toHaveCount(0);
    await expect(northMarker).toHaveAttribute('aria-pressed', 'false');
    await expect(southMarker).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => geometryRequests.filter(path => path.includes('map-south-ridge')).length).toBe(1);

    await page.getByRole('button', { name: 'Map tools' }).click();
    await page.getByRole('button', { name: 'Show all trails' }).click();
    await expect(overview).toBeVisible();
    await expect(northMarker).toHaveAttribute('aria-pressed', 'false');
    await expect(southMarker).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Close trail details' })).toHaveCount(0);
    await expectMarkersInsideMap(map, markers);
  });

  test('keeps verified trail facts visible when the hosted basemap fails', async ({ page }) => {
    await page.route('**/api/fast-search', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockedTrailResponse) }));
    await page.route('https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
    await page.goto('/search?q=Yosemite&difficulty=Strenuous', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Half Dome via the John Muir Trail', level: 3 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Basemap temporarily unavailable')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Verified trail facts remain available.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry map' })).toBeVisible();
  });

  test('shows official Mount Diablo facts and loads the state park route', async ({ page }) => {
    const browserErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', error => browserErrors.push(error.message));
    await page.route('**/api/trails/mount-diablo-mary-bowerman-trail/geometry', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ geometry: { type: 'MultiLineString', coordinates: [[[-121.917, 37.881], [-121.915, 37.883]]] } }),
    }));
    await page.route('**/api/trails/mount-diablo-falls-trail/geometry', route => route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Route geometry unavailable' }),
    }));
    await page.route('https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockedStadiaStyle) }));

    await page.goto('/search?q=Diablo%20hike');
    const result = page.getByRole('heading', { name: 'Mary Bowerman Trail', level: 3 });
    await expect(result).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: '7 trails' })).toBeVisible();

    const trailMap = page.getByRole('region', { name: 'Trail map' });
    const maryMarker = page.getByRole('button', { name: 'Show Mary Bowerman Trail on map' });
    await expect.poll(async () => {
      const [mapBounds, markerBounds] = await Promise.all([trailMap.boundingBox(), maryMarker.boundingBox()]);
      return Boolean(mapBounds && markerBounds
        && markerBounds.x >= mapBounds.x
        && markerBounds.x <= mapBounds.x + mapBounds.width
        && markerBounds.y >= mapBounds.y
        && markerBounds.y <= mapBounds.y + mapBounds.height);
    }).toBe(true);

    const card = page.getByRole('article', { name: 'Mary Bowerman Trail' });
    await expect(card.getByText('0.7 miles')).toBeVisible();
    await expect(card.getByText('Source: California State Parks')).toHaveCount(0);
    await expect(page.getByText('Official trail information')).toHaveCount(0);
    await expect(page.getByText(/Officially sourced trail information/)).toHaveCount(0);

    const filterTrigger = page.getByRole('button', { name: 'Filters' });
    await expect(filterTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('button', { name: 'Easy' })).toHaveCount(0);
    await filterTrigger.click();

    const easyFilter = page.getByRole('button', { name: 'Easy' });
    const moderateFilter = page.getByRole('button', { name: 'Moderate' });
    await easyFilter.click();
    await expect(easyFilter).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Curry Point to Summit Hike', level: 3 })).toHaveCount(0);

    await moderateFilter.click();
    await expect(easyFilter).toHaveAttribute('aria-pressed', 'false');
    await expect(moderateFilter).toHaveAttribute('aria-pressed', 'true');
    await easyFilter.click();
    await expect(easyFilter).toHaveAttribute('aria-pressed', 'true');
    await expect(moderateFilter).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Filters (1 active)' }).click();

    const detailButton = card.getByRole('button', { name: 'View details' });
    await detailButton.click();
    await expect(card.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true');
    await expect(card.getByText('Difficulty is estimated from official route facts.')).toBeVisible();
    await expect(card.getByText('Accessible first 0.2 mi')).toBeVisible();
    await expect(card.getByRole('button', { name: 'View map' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Start hike' })).toBeVisible();

    const maryGeometry = page.waitForResponse('**/api/trails/mount-diablo-mary-bowerman-trail/geometry');
    await card.getByRole('button', { name: 'View map' }).click();
    await maryGeometry;
    await expect(page.getByText('Showing Mary Bowerman Trail', { exact: true })).toBeVisible();

    await card.getByText('Source & access', { exact: true }).click();
    await expect(card.getByText('Source: California State Parks')).toBeVisible();
    await expect(card.getByText('Route geometry: California State Parks')).toBeVisible();
    await expect(card.getByText('Current access not listed')).toBeVisible();

    await page.getByRole('button', { name: 'Filters (1 active)' }).click();
    await easyFilter.click();
    await expect(easyFilter).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Filters' }).click();

    const fallsCard = page.getByRole('article', { name: 'Falls Trail' });
    await expect(fallsCard.getByText('Difficulty and trailhead access are not confirmed.')).toHaveCount(0);
    await fallsCard.getByRole('button', { name: 'View details' }).click();
    const fallsGeometry = page.waitForResponse('**/api/trails/mount-diablo-falls-trail/geometry');
    await fallsCard.getByRole('button', { name: 'View map' }).click();
    await fallsGeometry;
    await expect(page.getByText('Showing Falls Trail', { exact: true })).toBeVisible();
    await expect(fallsCard.getByText('Difficulty and trailhead access are not confirmed. Review the source before starting.')).toBeVisible();
    await expect(fallsCard.getByText('The route line is temporarily unavailable.')).toBeVisible();
    await expect(fallsCard.getByRole('button', { name: 'Start hike' })).toBeVisible();
    await expect(fallsCard.getByRole('button', { name: 'Navigate' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Map tools' })).toHaveCount(1);
    await expect(page.getByText('37.865, -119.538')).toHaveCount(0);
    expect(browserErrors.filter(message => message.includes('Hydration failed'))).toEqual([]);
  });
});
