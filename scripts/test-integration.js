#!/usr/bin/env node

import { AIPlaywrightIntegration } from '../src/ai-integration.js';
import dotenv from 'dotenv';

dotenv.config();

async function testIntegration() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.log('Please set your OpenAI API key in the .env file');
    process.exit(1);
  }

  console.log('🎭 Testing Playwright AI Integration\n');

  const integration = new AIPlaywrightIntegration(apiKey);

  try {
    console.log('📡 Starting MCP server...');
    await integration.startMCPServer();
    console.log('✅ MCP server started successfully\n');

    // Test prompt
    const testPrompt = 'Go to example.com and take a screenshot';
    console.log(`🤖 Processing prompt: "${testPrompt}"`);

    // Set up event listener for real-time updates
    integration.on('actionExecuted', (data) => {
      console.log(`   ⚡ Executed: ${data.action.name}`);
    });

    const result = await integration.processPrompt(testPrompt);

    if (result.success) {
      console.log('\n✅ Test completed successfully!');
      console.log('\n📋 Generated Test:');
      console.log('═'.repeat(50));

      // Extract the generated test code from results
      const testResult = result.results.find(
        (r) =>
          r.content &&
          r.content[0] &&
          r.content[0].text.includes('import { test, expect }')
      );

      if (testResult) {
        console.log(testResult.content[0].text);
      }
      console.log('═'.repeat(50));
    } else {
      console.error('❌ Test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    console.log('\n🧹 Cleaning up...');
    await integration.cleanup();
    console.log('✅ Cleanup complete');
  }
}

// Run the test
testIntegration().catch(console.error);
