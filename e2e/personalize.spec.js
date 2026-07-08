import { test, expect } from '@playwright/test';

test.describe('Personalization Flow', () => {
  test('should allow user to select preferences and save to localStorage', async ({ page }) => {
    // Navigate to personalize page
    await page.goto('/personalize');
    
    // Verify header
    await expect(page.locator('h1')).toContainText('Personalize Your Experience');
    
    // Select Interests
    await page.click('button:has-text("Hiking")');
    
    // Select Hiking specifics
    await page.click('button:has-text("🥾 Moderate")');
    await page.click('button:has-text("☀️ Open / Sunny")');
    await page.click('button:has-text("5–10 miles")');
    
    // Enter Group Dynamics
    const groupDynamicsText = 'Just me and my golden retriever';
    await page.fill('textarea[placeholder="Who are you traveling with?"]', groupDynamicsText);
    
    // Select Accessibility
    await page.click('button:has-text("Paved Paths")');
    
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
    expect(prefs.accessibility).toContain('Paved Paths');
  });
});
