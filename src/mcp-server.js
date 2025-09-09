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

          case 'get_page_content':
            return await this.getPageContent();

          case 'generate_test':
            return await this.generateTest(args.testName, args.description);

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

    await this.page.click(selector, { timeout });
    this.actions.push({
      type: 'click',
      selector: selector,
      code: `await page.click('${selector}');`,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Clicked element: ${selector}`,
        },
      ],
    };
  }

  async fillInput(selector, text) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    await this.page.fill(selector, text);
    this.actions.push({
      type: 'fill',
      selector: selector,
      text: text,
      code: `await page.fill('${selector}', '${text}');`,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Filled input ${selector} with: ${text}`,
        },
      ],
    };
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

  async generateTest(testName, description = '') {
    const testCode = this.generatePlaywrightTest(
      testName,
      description,
      this.actions
    );

    return {
      content: [
        {
          type: 'text',
          text: `Generated Playwright test:\n\n${testCode}`,
        },
      ],
    };
  }

  generatePlaywrightTest(testName, description, actions) {
    const testDescription = description || testName;

    let testCode = `import { test, expect } from '@playwright/test';\n\n`;
    testCode += `test('${testDescription}', async ({ page }) => {\n`;

    actions.forEach((action) => {
      testCode += `  ${action.code}\n`;
    });

    testCode += `});\n`;

    return testCode;
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
