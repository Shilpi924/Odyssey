import { test, expect } from '@playwright/test';

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
      body: JSON.stringify({
        source: 'fast', weather: null,
        trails: [{ name: 'Half Dome via the John Muir Trail', lat: 37.7459, lng: -119.5332, distance: '2.5', difficulty: 'Strenuous', length: '14–16 miles', rating: 4.9, userRatingsTotal: 1000, features: ['Summit', 'Scenic'] }],
      }),
    }));

    await page.goto('/search?q=Yosemite&difficulty=Strenuous', { waitUntil: 'domcontentloaded' });
    const result = page.getByRole('heading', { name: 'Half Dome via the John Muir Trail', level: 3 });
    await expect(result).toBeVisible({ timeout: 15_000 });
    await result.click();
    await expect(page.getByRole('button', { name: '🚶 Start Hike' }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: '🗺️ Map' }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: '🥾 Track' }).last()).toBeVisible();

    const resultBox = await result.boundingBox();
    const mapBox = await page.locator('#trail-map').boundingBox();
    expect(mapBox.y).toBeGreaterThan(resultBox.y);
  });
});
