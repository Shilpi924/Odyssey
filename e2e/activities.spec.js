import { test, expect } from '@playwright/test';
import { mockedStadiaStyle, mockedTrailResponse } from './fixtures.js';

test.describe('Activity tracking', () => {
  test.use({
    geolocation: { latitude: 37.7459, longitude: -119.5332, accuracy: 8 },
    permissions: ['geolocation'],
  });

  test('finishes a hike into a private local activity', async ({ page }) => {
    const browserErrors = [];
    const nativeDialogs = [];
    page.on('console', message => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('dialog', async dialog => {
      nativeDialogs.push(dialog.message());
      await dialog.dismiss();
    });
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
        geometry: { type: 'MultiLineString', coordinates: [[[-119.5332, 37.7459], [-119.5328, 37.7462]]] },
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
    await card.getByRole('button', { name: 'Start hike' }).click();

    const locationDialog = page.getByRole('dialog', { name: 'Allow location to record this hike?' });
    await expect(locationDialog).toBeVisible();
    await locationDialog.getByRole('button', { name: 'Allow location & start' }).click();
    await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();

    await page.getByRole('button', { name: 'Finish' }).click();
    const finishDialog = page.getByRole('dialog', { name: 'Save this adventure.' });
    await expect(finishDialog).toBeVisible();
    await finishDialog.getByRole('button', { name: 'Discard recording' }).click();
    const discardDialog = page.getByRole('dialog', { name: 'Discard this recording?' });
    await expect(discardDialog).toHaveCount(1);
    await discardDialog.getByRole('button', { name: 'Keep recording' }).click();
    await expect(finishDialog).toBeVisible();
    expect(nativeDialogs).toEqual([]);
    await finishDialog.getByLabel('Activity title').fill('Sunrise on Half Dome');
    await finishDialog.getByLabel('Trail notes').fill('Clear skies and a memorable first Odyssey activity.');
    await finishDialog.getByRole('button', { name: 'Save & view activity' }).click();

    await expect.poll(() => browserErrors, { timeout: 2_000 }).toEqual([]);
    await expect(page).toHaveURL(/\/activities\?activity=activity-/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { level: 2, name: 'Sunrise on Half Dome' })).toBeVisible();
    await expect(page.getByText('Only you')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export GPX' })).toBeVisible();
    await expect(page.getByText('Clear skies and a memorable first Odyssey activity.')).toBeVisible();
  });

  test('rejects anonymous cloud activity access', async ({ request }) => {
    const response = await request.get('/api/activities');
    expect(response.status()).toBe(401);
  });
});
