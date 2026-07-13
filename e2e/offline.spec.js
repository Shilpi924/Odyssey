import { test, expect } from '@playwright/test';

test.describe('Saved Hikes Page', () => {
  test('should render the saved page with no hikes initially', async ({ page }) => {
    await page.goto('/saved');
    
    // Saved trails keep sourced facts locally; the basemap remains network-only.
    await expect(page.locator('h1')).toContainText('🧭 My Trails');
    
    // Check if empty state is visible
    await expect(page.locator('text=No saved hikes')).toBeVisible();
    await expect(page.getByText('Save verified trail facts')).toBeVisible();
  });
});
