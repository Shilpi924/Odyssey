import { test, expect } from '@playwright/test';

test.describe('Offline Saved Hikes Page', () => {
  test('should render the saved page with no hikes initially', async ({ page }) => {
    await page.goto('/saved');
    
    // Saved trails include offline-ready trail details and cached maps.
    await expect(page.locator('h1')).toContainText('🧭 My Trails');
    
    // Check if empty state is visible
    await expect(page.locator('text=No saved hikes')).toBeVisible();
    await expect(page.locator('text=Save hikes while you have an internet connection')).toBeVisible();
  });
});
