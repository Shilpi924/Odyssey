const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Grant geolocation permissions and mock location
  const context = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: 37.7749, longitude: -122.4194 } // San Francisco
  });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()} | Location: ${msg.location().url}`);
    }
  });
  page.on('pageerror', exception => {
    errors.push(`Uncaught Exception: ${exception}`);
  });
  page.on('requestfailed', request => {
    errors.push(`Request failed: ${request.url()} - ${request.failure().errorText}`);
  });
  page.on('response', response => {
    if (response.status() >= 400 && response.status() !== 404) {
       // Only logging >= 400. 404 is checked too.
       errors.push(`Response error: ${response.url()} - ${response.status()}`);
    }
    if(response.status() === 404) {
       errors.push(`404 Not Found: ${response.url()}`);
    }
  });

  console.log('Navigating to http://localhost:3007...');
  await page.goto('http://localhost:3007');
  await page.waitForLoadState('networkidle');
  console.log('Homepage loaded.');

  // Check for the "Hikes near me" action card and click it
  console.log('Clicking "Hikes near me" action card...');
  const hikeCard = page.locator('text=Hikes near me').first();
  await hikeCard.click();

  console.log('Waiting for search page to load...');
  await page.waitForURL('**/search?q=hikes**');
  await page.waitForLoadState('networkidle');

  // Wait for Trails
  console.log('Waiting for trails to load...');
  try {
    await page.waitForSelector('.flex.flex-col.gap-4 > div', { timeout: 15000 });
    console.log('Trails loaded!');
  } catch (e) {
    console.log('Timeout waiting for trails. Taking a screenshot of the page state...');
    await page.screenshot({ path: 'test-error.png' });
  }

  // Look for any trails
  const trailCards = await page.locator('.flex.flex-col.gap-4 > div').count();
  console.log(`Found ${trailCards} trail cards (approx)`);

  await browser.close();

  console.log('--- TEST COMPLETED ---');
  if (errors.length > 0) {
    console.log('Errors found during test:');
    errors.forEach(e => console.log(e));
    process.exit(1);
  } else {
    console.log('No console errors found!');
    process.exit(0);
  }
})();
