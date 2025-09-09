import OpenAI from 'openai';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export class AIPlaywrightIntegration extends EventEmitter {
  constructor(apiKey) {
    super();
    this.openai = new OpenAI({ apiKey });
    this.mcpProcess = null;
    this.isConnected = false;
    this.messageId = 0;
    this.browserLaunched = false; // Track if browser has been launched
  }

  async startMCPServer() {
    return new Promise((resolve, reject) => {
      this.mcpProcess = spawn('node', ['src/mcp-server.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.mcpProcess.stderr.on('data', (data) => {
        if (data.toString().includes('Playwright MCP server running')) {
          this.isConnected = true;
          resolve();
        }
      });

      this.mcpProcess.on('error', reject);
    });
  }

  async sendMCPRequest(method, params = {}) {
    if (!this.isConnected) {
      throw new Error('MCP server not connected');
    }

    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: ++this.messageId,
        method,
        params,
      };

      const timeout = setTimeout(() => {
        reject(new Error('MCP request timeout'));
      }, 30000);

      const onData = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === request.id) {
            clearTimeout(timeout);
            this.mcpProcess.stdout.off('data', onData);
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch (error) {
          // Ignore parsing errors for partial messages
        }
      };

      this.mcpProcess.stdout.on('data', onData);
      this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async processPrompt(prompt) {
    try {
      // First, analyze the prompt with AI to extract actions
      const actions = await this.analyzePrompt(prompt);

      // Execute the actions through MCP
      const results = [];

      for (const action of actions) {
        const result = await this.executeAction(action);
        results.push(result);
        this.emit('actionExecuted', { action, result });
      }

      // Generate the final test
      if (actions.length > 0) {
        const testResult = await this.sendMCPRequest('tools/call', {
          name: 'generate_test',
          arguments: {
            testName: this.extractTestName(prompt),
            description: prompt,
            actions: actions, // Pass the actions that were executed
          },
        });
        results.push(testResult);
      }

      return {
        success: true,
        prompt,
        actions,
        results,
        message: 'Actions executed successfully and test generated',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        prompt,
      };
    }
  }

  async analyzePrompt(prompt) {
    const browserStatus = this.browserLaunched
      ? 'Browser is already running.'
      : 'No browser is currently running.';

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that converts natural language prompts into structured browser automation actions.

Available actions:
- launch_browser: Launch browser (specify headless: true/false)
- navigate_to: Navigate to URL
- inspect_page: Inspect page for forms, inputs, buttons (elementType: "forms", "inputs", "buttons", or "all")
- github_search: Specialized search for GitHub (use this instead of manual search on GitHub)
- click_element: Click element by selector
- fill_input: Fill input field with text
- wait_for_element: Wait for element to appear
- take_screenshot: Take a screenshot

Return a JSON array of actions. Each action should have:
- name: action name
- arguments: object with action parameters

Example:
For "Go to google.com and search for playwright":
[
  {"name": "launch_browser", "arguments": {"headless": false}},
  {"name": "navigate_to", "arguments": {"url": "https://google.com"}},
  {"name": "fill_input", "arguments": {"selector": "input[name='q']", "text": "playwright"}},
  {"name": "click_element", "arguments": {"selector": "input[type='submit']"}},
  {"name": "take_screenshot", "arguments": {"filename": "search_results.png"}}
]

For GitHub navigation and search:
[
  {"name": "navigate_to", "arguments": {"url": "https://github.com"}},
  {"name": "github_search", "arguments": {"query": "microsoft/playwright"}},
  {"name": "take_screenshot", "arguments": {"filename": "github_search_results.png"}}
]

For manual GitHub search (fallback):
[
  {"name": "navigate_to", "arguments": {"url": "https://github.com"}},
  {"name": "inspect_page", "arguments": {"elementType": "inputs"}},
  {"name": "click_element", "arguments": {"selector": "[data-target='query-builder.input']"}},
  {"name": "fill_input", "arguments": {"selector": "[data-target='query-builder.input']", "text": "microsoft/playwright"}},
  {"name": "wait_for_element", "arguments": {"selector": "[data-testid='results-list']"}},
  {"name": "take_screenshot", "arguments": {"filename": "github_search_results.png"}}
]

For form filling tasks:
1. First navigate to the page
2. Use inspect_page with elementType "forms" or "all" to discover form structure
3. Use the inspection results to generate accurate selectors for form fields
4. Fill inputs using the discovered selectors
5. Submit the form using the discovered submit button selector

For GitHub search tasks:
1. Navigate to github.com
2. Use github_search tool with the search query (this handles GitHub's complex search interface automatically)
3. Optionally take a screenshot of results

IMPORTANT: When working with forms, ALWAYS use inspect_page first to understand the form structure before attempting to fill or submit. This ensures accurate selectors.
For GitHub searches, ALWAYS use the github_search tool instead of manual clicking and filling - it's specifically designed to handle GitHub's dynamic search interface.
Only include launch_browser if this is the first action in a session. For subsequent prompts in the same session, assume the browser is already running and start with navigate_to or other actions.
Use specific CSS selectors when possible.
Be practical and realistic about what can be automated.

Current session status: ${browserStatus}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
    });

    try {
      const actionsText = completion.choices[0].message.content;
      // Extract JSON from the response if it's wrapped in markdown
      const jsonMatch = actionsText.match(
        /```(?:json)?\s*(\[[\s\S]*?\])\s*```/
      );
      const jsonText = jsonMatch ? jsonMatch[1] : actionsText;
      return JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  async executeAction(action) {
    try {
      const result = await this.sendMCPRequest('tools/call', {
        name: action.name,
        arguments: action.arguments,
      });

      // Track browser launch state
      if (action.name === 'launch_browser') {
        this.browserLaunched = true;
      } else if (action.name === 'close_browser') {
        this.browserLaunched = false;
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to execute action ${action.name}: ${error.message}`
      );
    }
  }

  extractTestName(prompt) {
    // Extract a meaningful test name from the prompt
    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .slice(0, 4)
      .join('_');

    return words || 'generated_test';
  }

  async cleanup() {
    if (this.mcpProcess && this.browserLaunched) {
      try {
        await this.sendMCPRequest('tools/call', {
          name: 'close_browser',
          arguments: {},
        });
      } catch (error) {
        // Ignore errors during cleanup
        console.warn('Error during browser cleanup:', error.message);
      }
    }

    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
      this.isConnected = false;
      this.browserLaunched = false;
    }
  }
}
