// Quick test to verify submit button detection improvements
import { chromium } from 'playwright';

async function testSubmitButtonDetection() {
  console.log('Testing submit button detection...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to httpbin.org forms page
    await page.goto('https://httpbin.org/forms/post');

    // Wait for the page to load
    await page.waitForSelector('form', { timeout: 10000 });

    // Inspect the actual submit button on the page
    const buttonInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;

      const buttons = Array.from(
        form.querySelectorAll(
          'button, input[type="submit"], input[type="button"]'
        )
      );
      return buttons.map((btn) => ({
        tag: btn.tagName,
        type: btn.type || 'default',
        text: btn.textContent?.trim() || btn.value || '',
        id: btn.id || '',
        name: btn.name || '',
        className: btn.className || '',
        outerHTML: btn.outerHTML,
      }));
    });

    console.log('Submit buttons found:', JSON.stringify(buttonInfo, null, 2));

    // Try to find and click the submit button using our improved logic
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:not([type])', // This should match the httpbin.org button
      'button',
      'input[type="button"][value*="submit" i]',
    ];

    let clicked = false;
    for (const selector of submitSelectors) {
      try {
        const element = await page.locator(selector);
        const count = await element.count();

        if (count > 0) {
          const isVisible = await element.first().isVisible();
          if (isVisible) {
            console.log(
              `Found clickable submit button with selector: ${selector}`
            );
            // Don't actually click for this test, just verify we can find it
            clicked = true;
            break;
          }
        }
      } catch (error) {
        console.log(`Selector "${selector}" failed: ${error.message}`);
      }
    }

    if (clicked) {
      console.log('✅ Successfully found submit button');
    } else {
      console.log('❌ Failed to find submit button');
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testSubmitButtonDetection();
