/**
 * Quick test to verify the Remix dialog shows full content
 * Run with: npx playwright test test-remix-fix.js --headed
 */

const { chromium } = require('playwright');

async function testRemixDialog() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('1. Navigating to Discover page...');
  await page.goto('http://localhost:3001/dashboard/discover');

  // Wait for page to load
  await page.waitForTimeout(2000);

  // Check if we need to login
  const url = page.url();
  if (url.includes('login') || url.includes('auth')) {
    console.log('   Login required - please login manually');
    await page.waitForTimeout(30000); // Wait for manual login
  }

  console.log('2. Looking for Deep Research section...');

  // Try to find and click on a Remix button if posts exist
  const remixButton = page.locator('button:has-text("Remix")').first();

  if (await remixButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('3. Found existing post, clicking Remix...');
    await remixButton.click();
    await page.waitForTimeout(1000);

    // Check the Original Post preview
    const originalPostPreview = page.locator('text=Original Post').locator('..').locator('div.overflow-y-auto');

    if (await originalPostPreview.isVisible()) {
      const previewText = await originalPostPreview.textContent();
      console.log('4. Original Post preview content length:', previewText?.length || 0, 'characters');

      // Check if content is truncated (has "..." at the end without being full)
      const hasLineClamp = await originalPostPreview.locator('p').evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.webkitLineClamp !== 'none';
      }).catch(() => false);

      console.log('5. Has line-clamp restriction:', hasLineClamp);

      if (!hasLineClamp) {
        console.log('✅ SUCCESS: Remix dialog shows full content (no line-clamp)');
      } else {
        console.log('❌ FAIL: Content is still truncated');
      }
    }

    // Take a screenshot
    await page.screenshot({ path: 'remix-dialog-test.png' });
    console.log('6. Screenshot saved to remix-dialog-test.png');

  } else {
    console.log('3. No existing posts with Remix button. Need to run Deep Research first.');
    console.log('   Try searching for a topic in the Deep Research section.');
  }

  // Keep browser open for inspection
  console.log('\nKeeping browser open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('Test complete.');
}

testRemixDialog().catch(console.error);
