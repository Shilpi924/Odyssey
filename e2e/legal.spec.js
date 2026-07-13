import { test, expect } from '@playwright/test';

const pages = [
  ['/legal/terms', 'Terms of Use'],
  ['/legal/privacy', 'Privacy Notice'],
  ['/legal/data-sources', 'Data Sources & Attribution'],
  ['/legal/licenses', 'Software & License Notices'],
  ['/legal/copyright', 'Copyright & Takedown'],
];

test.describe('Legal and attribution pages', () => {
  for (const [path, heading] of pages) {
    test(`renders ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Legal' })).toBeVisible();
      await expect(page.getByText('Effective July 13, 2026')).toBeVisible();
    });
  }

  test('publishes the generated dependency notice artifact', async ({ request }) => {
    const response = await request.get('/THIRD_PARTY_NOTICES.txt');
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain('# Odyssey Third-Party Notices');
  });
});
