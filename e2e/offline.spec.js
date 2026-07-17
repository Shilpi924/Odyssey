import { test, expect } from '@playwright/test';
import { mockedStadiaStyle, mockedTrailResponse } from './fixtures.js';

test.describe('Saved Hikes Page', () => {
  test('should render the saved page with no hikes initially', async ({ page }) => {
    await page.goto('/saved');
    
    // Saved trails keep sourced facts locally; the hosted basemap still needs a connection.
    await expect(page.locator('h1')).toContainText('🧭 My Trails');
    
    // Check if empty state is visible
    await expect(page.locator('text=No saved hikes')).toBeVisible();
    await expect(page.getByText('Save verified trail facts')).toBeVisible();
  });

  test('keeps a saved route visible on the offline route canvas', async ({ page, context }) => {
    const trail = {
      ...mockedTrailResponse.trails[0],
      placeId: 'half-dome-jmt',
      sourceKind: 'verified-catalog',
      geometryUrl: '/api/trails/half-dome-jmt/geometry',
    };
    await page.route('**/api/fast-search', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ...mockedTrailResponse, trails: [trail] }),
    }));
    await page.route('**/api/trails/half-dome-jmt/geometry', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        geometry: { type: 'MultiLineString', coordinates: [[[-119.5583, 37.7326], [-119.55, 37.74]]] },
      }),
    }));
    await page.route('https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(mockedStadiaStyle),
    }));
    await page.route('**/api/park-alerts?parkCode=yose', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ available: true, alerts: [] }),
    }));

    await page.goto('/search?q=Yosemite&difficulty=Strenuous', { waitUntil: 'domcontentloaded' });
    const card = page.getByRole('article', { name: 'Half Dome via the John Muir Trail' });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('button', { name: 'View details' }).click();
    await card.getByRole('button', { name: 'Save trail' }).click();
    await expect(card.getByRole('button', { name: 'Saved' })).toBeVisible();

    await page.goto('/saved');

    await expect(page.getByText('Offline route ready')).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByRole('status')).toContainText('Offline route canvas');
  });
});
