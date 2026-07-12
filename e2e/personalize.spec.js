import { test, expect } from '@playwright/test';

test.describe('Personalization Flow', () => {
  test('should allow user to select preferences and save to localStorage', async ({ page }) => {
    // Navigate to personalize page
    await page.goto('/personalize');
    
    // Verify header
    await expect(page.locator('h1')).toContainText('Personalize Your Experience');
    
    // Hiking is always the primary category; select trail specifics.
    await page.click('button:has-text("🥾 Moderate")');
    await page.click('button:has-text("☀️ Open / Sunny")');
    await page.click('button:has-text("5–10 miles")');
    
    // Enter Group Dynamics
    const groupDynamicsText = 'Just me and my golden retriever';
    await page.fill('textarea[placeholder="Who are you traveling with?"]', groupDynamicsText);
    
    // Select Accessibility
    await page.click('button:has-text("Shade preferred")');
    
    // Intercept localStorage before saving
    let localStorageData = null;
    page.on('dialog', dialog => dialog.accept());
    
    // Click Save
    await page.click('button:has-text("Save Preferences")');
    
    // Verify navigation to home page
    await expect(page).toHaveURL('/');
    
    // Verify localStorage data was set correctly
    localStorageData = await page.evaluate(() => localStorage.getItem('userPreferences'));
    const prefs = JSON.parse(localStorageData);
    
    expect(prefs.interests).toContain('Hiking');
    expect(prefs.interests).not.toContain('Food & Drink');
    expect(prefs.hiking.difficulty).toContain('Moderate');
    expect(prefs.hiking.features).toContain('Sunny');
    expect(prefs.hiking.length).toBe('long'); // 5-10 miles maps to 'long'
    expect(prefs.groupDynamics).toBe(groupDynamicsText);
    expect(prefs.accessibility).toContain('Shade preferred');
  });

  test('signed-in users can preview and persist display preferences', async ({ page }) => {
    await page.route('**/api/auth/session', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'theme-user', name: 'Trail Tester', email: 'trail@example.com' }, expires: '2099-01-01T00:00:00.000Z' }),
    }));
    await page.route('**/api/user/preferences', async route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ preferences: {} }) });
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.goto('/personalize');
    await expect(page.getByText('Choose your trail colors')).toBeVisible();
    await page.getByRole('button', { name: /Sunset/ }).click();
    await page.getByLabel('Higher contrast').check();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'sunset');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');

    await page.getByRole('button', { name: 'Save Preferences' }).click();
    await expect(page).toHaveURL('/');
    const preferences = await page.evaluate(() => JSON.parse(localStorage.getItem('userPreferences')));
    expect(preferences.theme).toBe('sunset');
    expect(preferences.highContrast).toBe(true);
  });
});
