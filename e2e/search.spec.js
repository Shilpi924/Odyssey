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
});
