import { test, expect } from '@playwright/test';

const mockedTrailResponse = {
  source: 'catalog', weather: null, entity: { type: 'park', id: 'nps-yose' },
  trails: [{ name: 'Half Dome via the John Muir Trail', lat: 37.7459, lng: -119.5332, distance: '2.5', difficulty: 'Strenuous', length: '16.2 miles', rating: null, userRatingsTotal: 0, features: ['Summit', 'Scenic'], sourceAttribution: 'Source: National Park Service', geometrySource: { provider: 'osm' }, access: { status: 'Unknown', permitRequired: true } }],
};

const mockedStadiaStyle = {
  version: 8,
  sources: {
    attribution: {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: 'attribution', type: 'circle', source: 'attribution' }],
};

test.describe('Search Page Flow', () => {
  // Use a mocked geolocation
  test.use({
    geolocation: { latitude: 37.7749, longitude: -122.4194 },
    permissions: ['geolocation'],
  });

  test('should render search UI and handle basic interactions', async ({ page }) => {
    // Navigate to search page
    await page.goto('/search');
    
    // Wait for the main container
    await page.waitForSelector('h1:has-text("🥾 Hikes Near Me")');
    
    // Check if the loading state is visible or if the page just loads
    const loadingState = page.locator('text=Getting your location…');
    const header = page.locator('h1:has-text("🥾 Hikes Near Me")');
    
    await expect(header).toBeVisible();
  });

  test('mobile results expand safely and render before the map', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/fast-search', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(mockedTrailResponse),
    }));
    await page.route('https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockedStadiaStyle) }));
    await page.route('**/api/park-alerts?parkCode=yose', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ available: true, fetchedAt: '2026-07-13T07:00:00.000Z', alerts: [{ id: 'alert-1', category: 'Park Closure', title: 'Seasonal trail closure', url: 'https://www.nps.gov/yose/' }] }),
    }));

    await page.goto('/search?q=Yosemite&difficulty=Strenuous', { waitUntil: 'domcontentloaded' });
    const result = page.getByRole('heading', { name: 'Half Dome via the John Muir Trail', level: 3 });
    await expect(result).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Current National Park Service alerts')).toBeVisible();
    await expect(page.getByText('Route geometry: OpenStreetMap')).toBeVisible();
    await expect(page.getByText('Permit required')).toBeVisible();
    await expect(page.getByRole('button', { name: /Dog Friendly/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /4\+ Stars/ })).toHaveCount(0);
    await result.click();
    await expect(page.getByRole('button', { name: '🚶 Start Hike' }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: '🗺️ Map' }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: '🥾 Track' }).last()).toBeVisible();

    const resultBox = await result.boundingBox();
    const mapBox = await page.locator('#trail-map').boundingBox();
    expect(mapBox.y).toBeGreaterThan(resultBox.y);
    await expect(page.getByRole('link', { name: 'Stadia Maps' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'OpenStreetMap' })).toBeVisible();
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

  test('shows an explicit coverage boundary instead of provider guesses', async ({ page }) => {
    const browserErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', error => browserErrors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('odyssey_search_history', JSON.stringify(['Half Dome'])));
    await page.goto('/search?q=Zion%20National%20Park');
    await expect(page.getByText('No verified trails found')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Verified trail coverage is currently available for Yosemite National Park.')).toBeVisible();
    const searchYosemite = page.getByRole('button', { name: 'Search Yosemite' });
    await expect(searchYosemite).toBeVisible();
    await expect(page.getByText('37.865, -119.538')).toHaveCount(0);
    await searchYosemite.click();
    await expect(page.getByText('Recent Searches')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zion National Park' })).toBeVisible();
    expect(browserErrors.filter(message => message.includes('Hydration failed'))).toEqual([]);
  });
});
