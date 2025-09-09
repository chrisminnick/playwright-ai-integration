import { test, expect } from '@playwright/test';

test('example generated test - google search', async ({ page }) => {
  await page.goto('https://google.com');
  await page.fill('input[name="q"]', 'playwright');
  await page.click('input[type="submit"]');
  await page.screenshot({ path: 'search_results.png' });
});
