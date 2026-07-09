const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  console.log('Navigating to Odyssey Search...');
  await page.goto('https://odyssey-mlbh42gmo-odyssey9.vercel.app/search?q=hikes', { waitUntil: 'networkidle' });
  // Wait a bit for map tiles and dynamic markers to render
  await page.waitForTimeout(4000); 
  await page.screenshot({ path: '/Users/shilpisharma/Projects/odyssey-screenshot.png', fullPage: true });
  console.log('Saved odyssey-screenshot.png');

  console.log('Navigating to Lumina...');
  await page.goto('https://luminapro.web.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000); // wait for animations
  await page.screenshot({ path: '/Users/shilpisharma/Projects/lumina-screenshot.png', fullPage: true });
  console.log('Saved lumina-screenshot.png');

  await browser.close();
})();
