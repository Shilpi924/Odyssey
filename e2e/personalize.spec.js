import { test, expect } from '@playwright/test';
import { mockedStadiaStyle, mockedTrailResponse } from './fixtures.js';

test.describe('Personalization Flow', () => {
  test('should allow user to select preferences and save to localStorage', async ({ page }) => {
    // Navigate to personalize page
    await page.goto('/personalize');
    await expect(page.locator('[data-ready]')).toHaveAttribute('data-ready', 'true');
    
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
    await Promise.all([
      page.waitForURL('/'),
      page.click('button:has-text("Save Preferences")'),
    ]);
    
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
    await expect(page.locator('[data-ready]')).toHaveAttribute('data-ready', 'true');
    await expect(page.getByText('Choose your trail colors')).toBeVisible();
    await page.getByRole('button', { name: /Sunset/ }).click();
    await page.getByLabel('Higher contrast').check();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'sunset');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');

    await Promise.all([
      page.waitForURL('/'),
      page.getByRole('button', { name: 'Save Preferences' }).click(),
    ]);
    const preferences = await page.evaluate(() => JSON.parse(localStorage.getItem('userPreferences')));
    expect(preferences.theme).toBe('sunset');
    expect(preferences.highContrast).toBe(true);
  });

  test('clears only scoped Odyssey browser data', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('odyssey_search_history', JSON.stringify(['Half Dome']));
      localStorage.setItem('odysseyHikePlan', JSON.stringify({ location: 'Yosemite' }));
      localStorage.setItem('userPreferences', JSON.stringify({ interests: ['Hiking'] }));
      localStorage.setItem('odyssey_location_access_v1', 'allowed');
      localStorage.setItem('unrelated_test_key', 'keep');
      sessionStorage.setItem('odyssey_verified_search_cache_v1', JSON.stringify({ trails: [] }));
    });
    await page.goto('/personalize');
    await page.getByRole('button', { name: 'Clear searches & plan' }).click();
    const confirmation = page.getByRole('dialog', { name: 'Clear searches and plan?' });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: 'Clear data' }).click();
    await expect(page.getByRole('status')).toContainText('Search, planning, and cached result data were cleared');
    let stored = await page.evaluate(() => ({
      history: localStorage.getItem('odyssey_search_history'),
      plan: localStorage.getItem('odysseyHikePlan'),
      preferences: localStorage.getItem('userPreferences'),
      cache: sessionStorage.getItem('odyssey_verified_search_cache_v1'),
    }));
    expect(stored).toEqual({ history: null, plan: null, preferences: JSON.stringify({ interests: ['Hiking'] }), cache: null });

    await page.getByRole('button', { name: 'Clear all local data' }).click();
    const clearAllConfirmation = page.getByRole('dialog', { name: 'Clear all local Odyssey data?' });
    await expect(clearAllConfirmation).toBeVisible();
    await clearAllConfirmation.getByRole('button', { name: 'Delete data' }).click();
    await expect(page.getByRole('status')).toContainText('All scoped Odyssey data stored by this browser was cleared');
    stored = await page.evaluate(() => ({
      preferences: localStorage.getItem('userPreferences'),
      location: localStorage.getItem('odyssey_location_access_v1'),
      unrelated: localStorage.getItem('unrelated_test_key'),
    }));
    expect(stored).toEqual({ preferences: null, location: null, unrelated: 'keep' });
  });

  test('deletes saved trail records from IndexedDB', async ({ page }) => {
    await page.route('**/api/fast-search', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockedTrailResponse) }));
    await page.route('https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockedStadiaStyle) }));
    await page.route('**/api/park-alerts?parkCode=yose', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ available: true, alerts: [] }) }));
    await page.goto('/search?q=Yosemite&difficulty=Strenuous', { waitUntil: 'domcontentloaded' });
    const trailHeading = page.getByRole('heading', { name: 'Half Dome via the John Muir Trail', level: 3 });
    await expect(trailHeading).toBeVisible({ timeout: 15_000 });
    const trailCard = page.getByRole('article', { name: 'Half Dome via the John Muir Trail' });
    await trailCard.getByRole('button', { name: 'View details' }).click();
    await trailCard.getByRole('button', { name: 'Save trail' }).click();
    await expect(trailCard.getByRole('button', { name: 'Saved' })).toBeVisible();

    await page.goto('/saved');
    await expect(page.getByRole('heading', { name: 'Half Dome via the John Muir Trail', level: 3 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Show your position on saved trails?' })).toBeVisible();

    await page.goto('/personalize');
    await page.getByRole('button', { name: 'Delete saved trails & GPS' }).click();
    const confirmation = page.getByRole('dialog', { name: 'Delete saved trails and GPS?' });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: 'Delete data' }).click();
    await expect(page.getByRole('status')).toContainText('Saved trails, completed activities, and on-device GPS records were deleted');

    await page.goto('/saved');
    await expect(page.getByText('No saved hikes')).toBeVisible();
  });
});
