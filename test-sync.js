const { chromium, devices } = require('@playwright/test');

(async () => {
  // Use iPhone 13 Pro device profile to spoof iOS
  const iPhone = devices['iPhone 13 Pro'];
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...iPhone,
    permissions: ['geolocation'],
    geolocation: { latitude: 37.7749, longitude: -122.4194 },
    offline: false // Start online to load the page
  });
  
  const page = await context.newPage();

  page.on('console', msg => {
    if(msg.type() === 'error' || msg.text().includes('queued') || msg.text().includes('sync')) {
      console.log(`[Browser Console]: ${msg.text()}`);
    }
  });

  console.log('Navigating to http://localhost:3007...');
  await page.goto('http://localhost:3007');
  await page.waitForLoadState('networkidle');
  console.log('Homepage loaded.');

  // Click "Hikes near me" action card
  console.log('Clicking "Hikes near me" action card...');
  const hikeCard = page.locator('text=Hikes near me').first();
  await hikeCard.click();

  console.log('Waiting for search page to load...');
  await page.waitForURL('**/search?q=hikes**');
  
  // Wait for Trails
  console.log('Waiting for trails to load...');
  await page.waitForSelector('.flex.flex-col.gap-4 > div', { timeout: 15000 });
  console.log('Trails loaded!');

  // Click the first trail pin or list item
  console.log('Selecting a trail...');
  await page.locator('.flex.flex-col.gap-4 > div').first().click();

  // Click "Start Hike"
  console.log('Starting hike...');
  await page.locator('button:has-text("Start Hike")').click();

  // Wait a moment for the hike overlay to appear
  await page.waitForTimeout(2000);

  // Now, simulate going offline!
  console.log('Going offline...');
  await context.setOffline(true);

  // Stop the hike
  console.log('Stopping hike...');
  await page.locator('button:has-text("Stop Hike")').click();

  // Wait a moment
  await page.waitForTimeout(1000);

  // Check for iOS Warning banner
  const warningVisible = await page.locator('text=iOS Offline Sync Notice').isVisible();
  console.log(`iOS Warning Visible: ${warningVisible}`);

  await browser.close();

  if (!warningVisible) {
    console.error('Test Failed: iOS warning was not visible!');
    process.exit(1);
  }

  console.log('Test Passed: iOS warning displayed successfully!');
  process.exit(0);
})();
