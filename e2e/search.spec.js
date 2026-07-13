import { test, expect } from '@playwright/test';
import { mockedStadiaStyle, mockedTrailResponse } from './fixtures.js';

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
    await page.getByRole('button', { name: '🚶 Start Hike' }).last().click();
    await expect(page.getByRole('heading', { name: 'Allow location to record this hike?' })).toBeVisible();
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(page.getByText('Active Hike', { exact: true })).toHaveCount(0);

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
