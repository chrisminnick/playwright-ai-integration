# Playwright AI Integration

A powerful integration that allows you to submit natural language prompts to an AI chatbot, which will use a browser through an MCP (Model Context Protocol) server to perform actions and generate Playwright tests automatically.

## Features

- 🤖 **AI-Powered Test Generation**: Use natural language to describe what you want to test
- 🎭 **Playwright Integration**: Automatically generates valid Playwright test code
- 🌐 **Browser Automation**: Real-time browser control through MCP server
- 📡 **WebSocket Updates**: Live feedback as actions are executed
- 🎨 **Beautiful UI**: Clean, modern web interface
- 🔧 **Configurable**: Support for headless/headed browser modes

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │───▶│   Express       │───▶│   OpenAI API    │
│   (Frontend)    │    │   Server        │    │   (GPT-4)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   MCP Server    │
                        │   (Playwright)  │
                        └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   Browser       │
                        │   (Chromium)    │
                        └─────────────────┘
```

## Prerequisites

- Node.js (v18 or higher)
- OpenAI API key
- Modern web browser

## Installation

1. **Navigate to the project directory:**

   ```bash
   cd playwright-ai-integration
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Install Playwright browsers:**

   ```bash
   npm run install-browsers
   ```

4. **Set up environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your OpenAI API key:

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Usage

### Starting the Server

1. **Start the main server:**

   ```bash
   npm start
   ```

2. **Open your browser and navigate to:**
   ```
   http://localhost:3000
   ```

### Using the Interface

1. **Start a Session:**

   - Enter your OpenAI API key (if not set in environment)
   - Click "Start Session" to initialize the MCP server

2. **Submit a Prompt:**

   - Enter a natural language description of what you want to test
   - Examples:
     - "Go to google.com and search for playwright testing"
     - "Navigate to github.com, click on the search box, and search for microsoft/playwright"
     - "Open example.com and take a screenshot of the page"

3. **Watch the Magic:**
   - See real-time updates as actions are executed
   - View the generated Playwright test code
   - Copy the test to use in your project

### Example Prompts

- **Basic Navigation:**

  ```
  Go to example.com and take a screenshot
  ```

- **Form Interaction:**

  ```
  Navigate to httpbin.org/forms/post, fill in the customer name field with "John Doe", and submit the form
  ```

- **Search Functionality:**

  ```
  Go to google.com, search for "playwright testing", and click on the first result
  ```

- **Complex Workflows:**
  ```
  Open github.com, click on sign in, wait for the login form to appear, and take a screenshot
  ```

## Available MCP Tools

The MCP server provides the following tools for browser automation:

- `launch_browser` - Launch a new browser instance
- `navigate_to` - Navigate to a specific URL
- `click_element` - Click on elements using CSS selectors
- `fill_input` - Fill input fields with text
- `wait_for_element` - Wait for elements to appear
- `take_screenshot` - Capture screenshots
- `get_page_content` - Get page information
- `generate_test` - Generate Playwright test code
- `close_browser` - Close the browser instance

## Development

### Project Structure

```
playwright-ai-integration/
├── src/
│   ├── server.js           # Express server with WebSocket support
│   ├── ai-integration.js   # AI service for processing prompts
│   └── mcp-server.js      # MCP server for browser automation
├── public/
│   └── index.html         # Web interface
├── tests/
│   └── example.spec.js    # Example generated test
├── package.json
├── playwright.config.js
└── README.md
```

### Running in Development Mode

```bash
npm run dev
```

This starts the server with file watching enabled.

### Running the MCP Server Standalone

```bash
npm run mcp-server
```

### Running Generated Tests

```bash
npm test
```

Or with UI mode:

```bash
npm run test:ui
```

## API Endpoints

- `POST /api/start-session` - Initialize AI integration session
- `POST /api/process-prompt` - Process a natural language prompt
- `GET /api/session-status` - Get current session status
- `POST /api/stop-session` - Stop the current session

## Configuration

### Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `PORT` - Server port (default: 3000)
- `HEADLESS` - Run browser in headless mode (default: false)

### Playwright Configuration

The project includes a `playwright.config.js` file with optimized settings for:

- Multiple browser support (Chrome, Firefox, Safari)
- Screenshot and video recording on failures
- HTML reporting
- Trace collection

## Troubleshooting

### Common Issues

1. **"MCP server not connected" error:**

   - Ensure Node.js is properly installed
   - Check that no other process is using the required ports
   - Restart the session

2. **"Browser not launched" error:**

   - Run `npm run install-browsers` to install Playwright browsers
   - Check system permissions for browser execution

3. **OpenAI API errors:**

   - Verify your API key is correct and has sufficient credits
   - Check your OpenAI API usage limits

4. **Element not found errors:**
   - The AI might generate selectors that don't exist on the target page
   - Try more specific prompts or different selector strategies

### Debug Mode

Set environment variable for verbose logging:

```bash
DEBUG=* npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Playwright](https://playwright.dev/) for browser automation
- [OpenAI](https://openai.com/) for AI capabilities
- [Model Context Protocol](https://github.com/modelcontextprotocol) for the integration framework
