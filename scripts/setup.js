#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectDir = dirname(__dirname);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('🎭 Playwright AI Integration Setup\n');

  // Check if .env file exists
  const envPath = join(projectDir, '.env');

  if (!existsSync(envPath)) {
    console.log('📝 Setting up environment configuration...\n');

    const apiKey = await question(
      'Enter your OpenAI API Key (or press Enter to skip): '
    );
    const port =
      (await question('Enter port number (default: 3000): ')) || '3000';
    const headless = await question('Run browser in headless mode? (y/N): ');

    const envContent = `# OpenAI API Key (required for AI functionality)
OPENAI_API_KEY=${apiKey}

# Server Configuration
PORT=${port}

# Optional: Set to true for headless browser automation
HEADLESS=${headless.toLowerCase() === 'y' ? 'true' : 'false'}
`;

    writeFileSync(envPath, envContent);
    console.log('✅ Environment configuration saved to .env\n');
  } else {
    console.log('✅ Environment file already exists\n');
  }

  console.log('🚀 Setup complete! You can now:\n');
  console.log('   npm start           - Start the web server');
  console.log('   npm run dev         - Start in development mode');
  console.log('   npm run test-integration - Run a quick test');
  console.log('   npm test           - Run Playwright tests\n');

  console.log(
    '📖 Open http://localhost:' +
      (process.env.PORT || '3000') +
      ' in your browser to get started!\n'
  );

  if (
    !process.env.OPENAI_API_KEY &&
    !readFileSync(envPath, 'utf8').includes('OPENAI_API_KEY=sk-')
  ) {
    console.log(
      "⚠️  Don't forget to add your OpenAI API key to the .env file!"
    );
  }

  rl.close();
}

setup().catch(console.error);
