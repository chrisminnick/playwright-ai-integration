import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { chromium } from 'playwright';

class PlaywrightMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'playwright-automation-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.browser = null;
    this.page = null;
    this.actions = [];
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'launch_browser',
          description: 'Launch a new browser instance',
          inputSchema: {
            type: 'object',
            properties: {
              headless: {
                type: 'boolean',
                description: 'Whether to run browser in headless mode',
                default: false,
              },
            },
          },
        },
        {
          name: 'navigate_to',
          description: 'Navigate to a specific URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The URL to navigate to',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'click_element',
          description: 'Click on an element using a selector',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector, XPath, or text content to click',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
                default: 30000,
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'fill_input',
          description: 'Fill an input field with text',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector for the input field',
              },
              text: {
                type: 'string',
                description: 'Text to fill in the input',
              },
            },
            required: ['selector', 'text'],
          },
        },
        {
          name: 'wait_for_element',
          description: 'Wait for an element to be visible',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector for the element to wait for',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
                default: 30000,
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'take_screenshot',
          description: 'Take a screenshot of the current page',
          inputSchema: {
            type: 'object',
            properties: {
              filename: {
                type: 'string',
                description: 'Filename for the screenshot',
                default: 'screenshot.png',
              },
            },
          },
        },
        {
          name: 'get_page_content',
          description: 'Get the current page content and structure',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'github_search',
          description:
            'Specialized search function for GitHub that handles the dynamic search interface',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query to enter',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'inspect_page',
          description:
            'Inspect the current page for forms, inputs, and interactive elements',
          inputSchema: {
            type: 'object',
            properties: {
              elementType: {
                type: 'string',
                description:
                  'Type of elements to inspect: "forms", "inputs", "buttons", or "all"',
                default: 'all',
              },
            },
          },
        },
        {
          name: 'generate_test',
          description: 'Generate a Playwright test from recorded actions',
          inputSchema: {
            type: 'object',
            properties: {
              testName: {
                type: 'string',
                description: 'Name for the generated test',
              },
              description: {
                type: 'string',
                description: 'Description of what the test does',
              },
              actions: {
                type: 'array',
                description: 'Array of actions that were executed',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    arguments: { type: 'object' },
                  },
                },
              },
            },
            required: ['testName'],
          },
        },
        {
          name: 'close_browser',
          description: 'Close the browser instance',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'launch_browser':
            return await this.launchBrowser(args?.headless ?? false);

          case 'navigate_to':
            return await this.navigateTo(args.url);

          case 'click_element':
            return await this.clickElement(args.selector, args.timeout);

          case 'fill_input':
            return await this.fillInput(args.selector, args.text);

          case 'wait_for_element':
            return await this.waitForElement(args.selector, args.timeout);

          case 'take_screenshot':
            return await this.takeScreenshot(args?.filename);

          case 'github_search':
            return await this.githubSearch(args.query);

          case 'inspect_page':
            return await this.inspectPage(args?.elementType || 'all');

          case 'get_page_content':
            return await this.getPageContent();

          case 'generate_test':
            return await this.generateTest(
              args.testName,
              args.description,
              args.actions
            );

          case 'close_browser':
            return await this.closeBrowser();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async launchBrowser(headless = false) {
    // If browser is already running, don't launch a new one
    if (this.browser) {
      return {
        content: [
          {
            type: 'text',
            text: `Browser already running in ${
              headless ? 'headless' : 'headed'
            } mode`,
          },
        ],
      };
    }

    this.browser = await chromium.launch({ headless });
    this.page = await this.browser.newPage();
    this.actions = [];

    return {
      content: [
        {
          type: 'text',
          text: `Browser launched in ${headless ? 'headless' : 'headed'} mode`,
        },
      ],
    };
  }

  async navigateTo(url) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    await this.page.goto(url);
    this.actions.push({
      type: 'navigate',
      url: url,
      code: `await page.goto('${url}');`,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Navigated to ${url}`,
        },
      ],
    };
  }

  async clickElement(selector, timeout = 30000) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    // Common alternative selectors for popular sites
    const alternativeSelectors = {
      github: [
        '[data-target="query-builder.input"]',
        'input[name="q"]',
        '#query-builder-test',
        'input[placeholder*="Search"]',
        'input[aria-label*="Search"]',
        'button[type="submit"]',
        '[data-testid="search-button"]',
      ],
    };

    // Determine site type and get alternative selectors
    const url = await this.page.url();
    let selectorsToTry = [selector];

    if (url.includes('github.com')) {
      selectorsToTry = [...alternativeSelectors.github, selector];
    }

    let lastError = null;

    for (const currentSelector of selectorsToTry) {
      try {
        // Wait for element to be visible and clickable
        await this.page.waitForSelector(currentSelector, {
          timeout: Math.min(timeout, 5000),
          state: 'visible',
        });

        const element = await this.page.locator(currentSelector);
        const isVisible = await element.isVisible();
        const isEnabled = await element.isEnabled();

        if (!isVisible) {
          throw new Error(`Element ${currentSelector} is not visible`);
        }

        if (!isEnabled) {
          throw new Error(
            `Element ${currentSelector} is not enabled/clickable`
          );
        }

        // Scroll element into view if needed
        await element.scrollIntoViewIfNeeded();

        // Click the element
        await element.click();

        this.actions.push({
          type: 'click',
          selector: currentSelector,
          code: `await page.click('${currentSelector}');`,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Successfully clicked element: ${currentSelector}`,
            },
          ],
        };
      } catch (error) {
        lastError = error;
        continue; // Try next selector
      }
    }

    // If all selectors failed, provide detailed error information
    try {
      const clickableElements = await this.page.$$eval(
        'button, input[type="submit"], input[type="button"], a, [onclick], [data-target]',
        (elements) =>
          elements.map((el) => ({
            tag: el.tagName,
            type: el.type || '',
            text: el.textContent?.trim()?.substring(0, 50) || '',
            id: el.id || '',
            class: el.className || '',
            name: el.name || '',
            'data-target': el.getAttribute('data-target') || '',
            'aria-label': el.getAttribute('aria-label') || '',
          }))
      );

      throw new Error(
        `Failed to click element with any selector: ${selectorsToTry.join(
          ', '
        )}. Last error: ${
          lastError.message
        }. Available clickable elements: ${JSON.stringify(clickableElements)}`
      );
    } catch (evalError) {
      throw new Error(
        `Failed to click element ${selector}: ${lastError.message}. Could not inspect available elements: ${evalError.message}`
      );
    }
  }
  async fillInput(selector, text) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    // Common alternative selectors for popular sites
    const alternativeSelectors = {
      github: [
        '[data-target="query-builder.input"]',
        'input[name="q"]',
        '#query-builder-test',
        'input[placeholder*="Search"]',
        'input[aria-label*="Search"]',
      ],
      google: [
        'input[name="q"]',
        'textarea[name="q"]',
        'input[title="Search"]',
      ],
    };

    // Determine site type
    const url = await this.page.url();
    let selectorsToTry = [selector];

    if (url.includes('github.com')) {
      selectorsToTry = [...alternativeSelectors.github, selector];
    } else if (url.includes('google.com')) {
      selectorsToTry = [...alternativeSelectors.google, selector];
    }

    let lastError = null;
    let successfulSelector = null;

    for (const currentSelector of selectorsToTry) {
      try {
        // First, try to wait for the element to be visible
        await this.page.waitForSelector(currentSelector, {
          timeout: 5000,
          state: 'visible',
        });

        // Check if element exists and is visible
        const element = await this.page.locator(currentSelector);
        const isVisible = await element.isVisible();

        if (!isVisible) {
          throw new Error(`Element ${currentSelector} is not visible`);
        }

        // Clear the field first, then fill it
        await this.page.fill(currentSelector, '');
        await this.page.fill(currentSelector, text);

        // Verify the text was actually filled
        const filledValue = await this.page.inputValue(currentSelector);

        successfulSelector = currentSelector;
        this.actions.push({
          type: 'fill',
          selector: currentSelector,
          text: text,
          actualValue: filledValue,
          code: `await page.fill('${currentSelector}', '${text}');`,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Successfully filled input ${currentSelector} with: ${text} (actual value: ${filledValue})`,
            },
          ],
        };
      } catch (error) {
        lastError = error;
        continue; // Try next selector
      }
    }

    // If all selectors failed, provide detailed error information
    try {
      const inputs = await this.page.$$eval(
        'input, textarea, select',
        (elements) =>
          elements.map((el) => ({
            tag: el.tagName,
            type: el.type || 'text',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            'data-target': el.getAttribute('data-target') || '',
            'aria-label': el.getAttribute('aria-label') || '',
            required: el.required || false,
          }))
      );

      throw new Error(
        `Failed to fill input with any selector: ${selectorsToTry.join(
          ', '
        )}. Last error: ${
          lastError.message
        }. Available inputs: ${JSON.stringify(inputs)}`
      );
    } catch (evalError) {
      throw new Error(
        `Failed to fill input ${selector}: ${lastError.message}. Could not inspect available inputs: ${evalError.message}`
      );
    }
  }

  async waitForElement(selector, timeout = 30000) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    await this.page.waitForSelector(selector, { timeout });
    this.actions.push({
      type: 'wait',
      selector: selector,
      code: `await page.waitForSelector('${selector}');`,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Element found: ${selector}`,
        },
      ],
    };
  }

  async takeScreenshot(filename = 'screenshot.png') {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    await this.page.screenshot({ path: filename });
    this.actions.push({
      type: 'screenshot',
      filename: filename,
      code: `await page.screenshot({ path: '${filename}' });`,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Screenshot saved as ${filename}`,
        },
      ],
    };
  }

  async githubSearch(query) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    try {
      // Multiple strategies for GitHub search
      const searchStrategies = [
        // Strategy 1: Use the main search input
        async () => {
          const searchSelectors = [
            '[data-target="query-builder.input"]',
            'input[name="q"]',
            '#query-builder-test',
            'input[placeholder*="Search"]',
            'input[aria-label*="Search"]',
            '.js-site-search-focus',
          ];

          for (const selector of searchSelectors) {
            try {
              await this.page.waitForSelector(selector, {
                timeout: 3000,
                state: 'visible',
              });
              const element = await this.page.locator(selector);

              if (await element.isVisible()) {
                await element.click();
                await element.fill(query);
                await element.press('Enter');
                return selector;
              }
            } catch (e) {
              continue;
            }
          }
          throw new Error('No search input found');
        },

        // Strategy 2: Use keyboard shortcut to open search
        async () => {
          await this.page.keyboard.press('s'); // GitHub's search shortcut
          await this.page.waitForTimeout(500);
          await this.page.keyboard.type(query);
          await this.page.keyboard.press('Enter');
          return 'keyboard-shortcut';
        },

        // Strategy 3: Navigate directly to search URL
        async () => {
          const searchUrl = `https://github.com/search?q=${encodeURIComponent(
            query
          )}`;
          await this.page.goto(searchUrl);
          return 'direct-url';
        },
      ];

      let usedStrategy = null;
      let lastError = null;

      for (let i = 0; i < searchStrategies.length; i++) {
        try {
          usedStrategy = await searchStrategies[i]();
          break;
        } catch (error) {
          lastError = error;
          continue;
        }
      }

      if (!usedStrategy) {
        throw new Error(
          `All GitHub search strategies failed. Last error: ${lastError.message}`
        );
      }

      // Wait for search results to load
      try {
        await this.page.waitForSelector(
          '[data-testid="results-list"], .repo-list, .search-results',
          { timeout: 10000 }
        );
      } catch (e) {
        // Sometimes results load without these specific selectors
        await this.page.waitForTimeout(2000);
      }

      this.actions.push({
        type: 'github_search',
        query: query,
        strategy: usedStrategy,
        code: `// GitHub search for: ${query} using strategy: ${usedStrategy}`,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully performed GitHub search for "${query}" using strategy: ${usedStrategy}`,
          },
        ],
      };
    } catch (error) {
      // Provide debug information
      const currentUrl = await this.page.url();
      const pageTitle = await this.page.title();

      throw new Error(
        `GitHub search failed: ${error.message}. Current URL: ${currentUrl}, Page title: ${pageTitle}`
      );
    }
  }

  async inspectPage(elementType = 'all') {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    const inspection = await this.page.evaluate((type) => {
      const result = {
        url: window.location.href,
        title: document.title,
        forms: [],
        inputs: [],
        buttons: [],
        links: [],
      };

      if (type === 'all' || type === 'forms') {
        const forms = document.querySelectorAll('form');
        forms.forEach((form, index) => {
          const formData = {
            index,
            id: form.id || '',
            action: form.action || '',
            method: form.method || 'GET',
            selectors: [
              `form:nth-of-type(${index + 1})`,
              form.id ? `#${form.id}` : '',
            ].filter(Boolean),
          };
          result.forms.push(formData);
        });
      }

      if (type === 'all' || type === 'inputs') {
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach((input, index) => {
          // Find associated label
          let labelText = '';
          const label = input.id
            ? document.querySelector(`label[for="${input.id}"]`)
            : null;
          if (label) {
            labelText = label.textContent?.trim() || '';
          } else {
            // Check if input is inside a label
            const parentLabel = input.closest('label');
            if (parentLabel) {
              labelText =
                parentLabel.textContent
                  ?.replace(input.value || '', '')
                  .trim() || '';
            }
          }

          const inputData = {
            index,
            tag: input.tagName.toLowerCase(),
            type: input.type || 'text',
            name: input.name || '',
            id: input.id || '',
            placeholder: input.placeholder || '',
            label: labelText,
            required: input.required || false,
            value: input.value || '',
            selectors: [
              input.id ? `#${input.id}` : '',
              input.name ? `[name="${input.name}"]` : '',
              input.placeholder ? `[placeholder="${input.placeholder}"]` : '',
              labelText && input.type !== 'hidden'
                ? `label:has-text("${labelText}") >> input`
                : '',
              `${input.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
            ].filter(Boolean),
          };
          result.inputs.push(inputData);
        });
      }

      if (type === 'all' || type === 'buttons') {
        const buttons = document.querySelectorAll(
          'button, input[type="submit"], input[type="button"], input[type="reset"]'
        );
        buttons.forEach((button, index) => {
          const buttonData = {
            index,
            tag: button.tagName.toLowerCase(),
            type: button.type || '',
            text: button.textContent?.trim() || button.value || '',
            id: button.id || '',
            name: button.name || '',
            disabled: button.disabled || false,
            selectors: [
              button.id ? `#${button.id}` : '',
              button.name ? `[name="${button.name}"]` : '',
              button.textContent?.trim()
                ? `text="${button.textContent.trim()}"`
                : '',
              `${button.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
            ].filter(Boolean),
          };
          result.buttons.push(buttonData);
        });
      }

      return result;
    }, elementType);

    return {
      content: [
        {
          type: 'text',
          text: `Page inspection complete. Found ${
            inspection.forms.length
          } forms, ${inspection.inputs.length} inputs, ${
            inspection.buttons.length
          } buttons.\n\nDetailed inspection:\n${JSON.stringify(
            inspection,
            null,
            2
          )}`,
        },
      ],
    };
  }

  async getPageContent() {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    const title = await this.page.title();
    const url = this.page.url();
    const content = await this.page.content();

    return {
      content: [
        {
          type: 'text',
          text: `Page Title: ${title}\nURL: ${url}\nContent Length: ${content.length} characters`,
        },
      ],
    };
  }

  async generateTest(testName, description = '', providedActions = null) {
    // Use provided actions if available, otherwise fall back to internal actions
    const actionsToUse = providedActions || this.actions;

    const testCode = this.generatePlaywrightTest(
      testName,
      description,
      actionsToUse
    );

    return {
      content: [
        {
          type: 'text',
          text: testCode,
        },
      ],
    };
  }

  generatePlaywrightTest(testName, description, actions) {
    const testDescription = description || testName;

    let testCode = `import { test, expect } from '@playwright/test';\n\n`;
    testCode += `test('${testDescription}', async ({ page }) => {\n`;

    if (actions && actions.length > 0) {
      actions.forEach((action) => {
        // Handle both internal MCP actions (with .code) and AI integration actions (with .name and .arguments)
        if (action.code) {
          // Internal MCP action format
          testCode += `  ${action.code}\n`;
        } else if (action.name && action.arguments) {
          // AI integration action format - convert to Playwright code
          const playwrightCode = this.convertActionToPlaywrightCode(action);
          if (playwrightCode) {
            testCode += `  ${playwrightCode}\n`;
          }
        }
      });
    }

    testCode += `});\n`;

    return testCode;
  }

  convertActionToPlaywrightCode(action) {
    switch (action.name) {
      case 'launch_browser':
        // Browser launch is handled by Playwright test framework, not needed in test code
        return null;

      case 'navigate_to':
        return `await page.goto('${action.arguments.url}');`;

      case 'click_element':
        return `await page.click('${action.arguments.selector}');`;

      case 'fill_input':
        return `await page.fill('${action.arguments.selector}', '${action.arguments.text}');`;

      case 'wait_for_element':
        return `await page.waitForSelector('${action.arguments.selector}');`;

      case 'take_screenshot':
        const filename = action.arguments.filename || 'screenshot.png';
        return `await page.screenshot({ path: '${filename}' });`;

      case 'github_search':
        // For GitHub search, we'll convert it to manual steps
        return `await page.fill('[data-target="query-builder.input"]', '${action.arguments.query}');\n  await page.press('[data-target="query-builder.input"]', 'Enter');`;

      case 'inspect_page':
        // Inspection actions don't translate to test code
        return null;

      case 'get_page_content':
        // Content retrieval doesn't translate to test code
        return null;

      case 'close_browser':
        // Browser closing is handled by Playwright test framework
        return null;

      default:
        return `// Unsupported action: ${action.name}`;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.actions = [];

      return {
        content: [
          {
            type: 'text',
            text: 'Browser closed successfully',
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: 'No browser to close',
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Playwright MCP server running on stdio');
  }
}

const server = new PlaywrightMCPServer();
server.run().catch(console.error);
