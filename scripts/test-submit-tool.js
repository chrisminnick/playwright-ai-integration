#!/usr/bin/env node

import { AIPlaywrightIntegration } from '../src/ai-integration.js';
import dotenv from 'dotenv';

dotenv.config();

async function testSubmitFormTool() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.log('Please set your OpenAI API key in the .env file');
    process.exit(1);
  }

  console.log('🎭 Testing Direct submit_form Tool\n');

  const integration = new AIPlaywrightIntegration(apiKey);

  try {
    console.log('📡 Starting MCP server...');
    await integration.startMCPServer();
    console.log('✅ MCP server started successfully\n');

    // Test the new submit_form tool specifically
    const testPrompt =
      'Go to httpbin.org/forms/post, fill the customer name with "John Doe" and email with "john@example.com", then use the submit_form tool to submit the form';
    console.log(`🤖 Processing prompt: "${testPrompt}"`);

    // Set up event listener for real-time updates
    integration.on('actionExecuted', (data) => {
      console.log(`   ⚡ Executed: ${data.action.name}`);
      if (data.action.name === 'submit_form') {
        console.log(
          `      Strategy used: ${data.result.content[0]?.text || 'unknown'}`
        );
      }
    });

    const result = await integration.processPrompt(testPrompt);

    if (result.success) {
      console.log('\n✅ submit_form tool test completed successfully!');
      console.log('\n📋 Actions taken:');
      console.log('═'.repeat(50));

      result.executedActions.forEach((action, index) => {
        console.log(
          `${index + 1}. ${action.name}: ${JSON.stringify(action.arguments)}`
        );
      });
      console.log('═'.repeat(50));
    } else {
      console.error('❌ submit_form tool test failed:', result.error);
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
testSubmitFormTool().catch(console.error);
