const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => logs.push({ type: 'console', text: msg.text(), location: msg.location() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', message: err.message, stack: err.stack }));

  try {
    const res = await page.goto('http://localhost:3001/', { waitUntil: 'load', timeout: 10000 });
    const status = res ? res.status() : 'no-response';
    console.log('HTTP status:', status);

    // give some time for client-side scripts to run
    await page.waitForTimeout(2000);

    // capture console logs
    console.log('Captured logs:');
    if (logs.length === 0) console.log('  (no logs captured)');
    logs.forEach((l, i) => console.log(i + 1 + '.', JSON.stringify(l)));

    // screenshot for inspection
    const screenshotPath = 'tmp/client_screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to', screenshotPath);
  } catch (err) {
    console.error('Script error:', err);
  } finally {
    await browser.close();
  }
})();