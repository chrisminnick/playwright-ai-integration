// Quick test for form handling improvements
import { AIPlaywrightIntegration } from './src/ai-integration.js';
import dotenv from 'dotenv';

dotenv.config();

async function testFormHandling() {
  const aiIntegration = new AIPlaywrightIntegration(process.env.OPENAI_API_KEY);

  try {
    console.log('Starting MCP server...');
    await aiIntegration.startMCPServer();

    console.log('Testing form handling...');
    const result = await aiIntegration.processPrompt(
      'Go to https://www.watzthis.com/how-to-contact-us/, inspect the page to understand the form structure, then fill in the name input using "Joe Tester" and make up info for the other inputs, then submit the form.'
    );

    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await aiIntegration.cleanup();
  }
}

testFormHandling();
