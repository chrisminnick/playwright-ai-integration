// Quick test for complex scenarios
import { AIPlaywrightIntegration } from './src/ai-integration.js';
import dotenv from 'dotenv';

dotenv.config();

async function testComplexScenario() {
  const aiIntegration = new AIPlaywrightIntegration(process.env.OPENAI_API_KEY);

  try {
    console.log('Starting MCP server...');
    await aiIntegration.startMCPServer();

    console.log('Testing complex scenario...');
    const result = await aiIntegration.processPrompt(
      'Navigate to github.com, click on the search box, and search for microsoft/playwright'
    );

    console.log('Result:', JSON.stringify(result, null, 2));

    // Extract and display the generated test
    if (result.success && result.results) {
      const testResult = result.results.find(
        (r) =>
          r.content &&
          r.content[0] &&
          r.content[0].text.includes('import { test, expect }')
      );

      if (testResult) {
        console.log('\n📋 Generated Test:');
        console.log('═'.repeat(50));
        console.log(testResult.content[0].text);
        console.log('═'.repeat(50));
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await aiIntegration.cleanup();
  }
}

testComplexScenario();
