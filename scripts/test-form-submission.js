#!/usr/bin/env node

import { AIPlaywrightIntegration } from '../src/ai-integration.js';
import dotenv from 'dotenv';

dotenv.config();

async function testFormSubmission() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.log('Please set your OpenAI API key in the .env file');
    process.exit(1);
  }

  console.log('🎭 Testing Form Submission with Improved Button Detection\n');

  const integration = new AIPlaywrightIntegration(apiKey);

  try {
    console.log('📡 Starting MCP server...');
    await integration.startMCPServer();
    console.log('✅ MCP server started successfully\n');

    // Test form submission on httpbin.org
    const testPrompt = 'Go to httpbin.org/forms/post, fill in the form with sample data, and submit it';
    console.log(`🤖 Processing prompt: "${testPrompt}"`);

    // Set up event listener for real-time updates
    integration.on('actionExecuted', (data) => {
      console.log(`   ⚡ Executed: ${data.action.name} - ${JSON.stringify(data.action.arguments)}`);
    });

    const result = await integration.processPrompt(testPrompt);

    if (result.success) {
      console.log('\n✅ Form submission test completed successfully!');
      console.log('\n📋 Actions taken:');
      console.log('═'.repeat(50));
      
      result.executedActions.forEach((action, index) => {
        console.log(`${index + 1}. ${action.name}: ${JSON.stringify(action.arguments)}`);
      });

      // Extract the generated test code from results
      const testResult = result.results.find(
        (r) =>
          r.content &&
          r.content[0] &&
          r.content[0].text.includes('import { test, expect }')
      );

      if (testResult) {
        console.log('\n📋 Generated Playwright Test:');
        console.log('═'.repeat(50));
        console.log(testResult.content[0].text);
      }
      console.log('═'.repeat(50));
    } else {
      console.error('❌ Form submission test failed:', result.error);
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
testFormSubmission().catch(console.error);
