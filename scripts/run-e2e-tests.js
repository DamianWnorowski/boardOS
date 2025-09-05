#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkDevServer() {
  try {
    const response = await fetch('http://localhost:5173');
    return response.ok;
  } catch (err) {
    return false;
  }
}

async function startDevServer() {
  log('🚀 Starting development server...', colors.yellow);
  
  const devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true,
    detached: false
  });

  // Wait for server to be ready
  let retries = 30;
  while (retries > 0) {
    if (await checkDevServer()) {
      log('✅ Development server is ready!', colors.green);
      return devServer;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    retries--;
  }

  throw new Error('Development server failed to start');
}

async function generateDynamicTests() {
  log('\n📝 Generating dynamic tests from business rules...', colors.cyan);
  
  return new Promise((resolve, reject) => {
    const generate = spawn('node', ['scripts/generate-e2e-tests.js'], {
      stdio: 'inherit',
      shell: true
    });

    generate.on('close', (code) => {
      if (code === 0) {
        log('✅ Dynamic tests generated successfully!', colors.green);
        resolve();
      } else {
        reject(new Error(`Test generation failed with code ${code}`));
      }
    });
  });
}

async function runPlaywrightTests(args = []) {
  log('\n🧪 Running E2E tests...', colors.bright + colors.blue);
  
  return new Promise((resolve, reject) => {
    const testArgs = ['test', ...args];
    
    const tests = spawn('npx', ['playwright', ...testArgs], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        CI: process.env.CI || 'false'
      }
    });

    tests.on('close', (code) => {
      if (code === 0) {
        log('\n✅ All tests passed!', colors.bright + colors.green);
        resolve(code);
      } else {
        log(`\n❌ Tests failed with exit code ${code}`, colors.red);
        resolve(code); // Don't reject, just return the code
      }
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let devServer = null;
  let exitCode = 0;

  try {
    log('🔧 BoardOS E2E Test Runner', colors.bright + colors.cyan);
    log('=' .repeat(50), colors.cyan);

    // Check if dev server is already running
    const serverRunning = await checkDevServer();
    
    if (!serverRunning && !args.includes('--no-server')) {
      devServer = await startDevServer();
    } else if (serverRunning) {
      log('✅ Development server already running', colors.green);
    }

    // Generate dynamic tests unless skipped
    if (!args.includes('--skip-generate')) {
      await generateDynamicTests();
    }

    // Check if dynamic tests were generated
    const dynamicTestPath = join(__dirname, '..', 'playwright', 'tests', 'dynamic', 'auto-generated-rules.spec.ts');
    if (!existsSync(dynamicTestPath)) {
      log('⚠️  No dynamic tests found. Run with --generate-only to create them.', colors.yellow);
    }

    // Run tests unless generate-only mode
    if (!args.includes('--generate-only')) {
      // Filter out our custom args before passing to Playwright
      const playwrightArgs = args.filter(arg => 
        !['--skip-generate', '--no-server', '--generate-only'].includes(arg)
      );
      
      exitCode = await runPlaywrightTests(playwrightArgs);
    }

    // Show test report if requested
    if (args.includes('--show-report')) {
      log('\n📊 Opening test report...', colors.cyan);
      spawn('npx', ['playwright', 'show-report'], {
        stdio: 'inherit',
        shell: true
      });
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    exitCode = 1;
  } finally {
    // Clean up dev server if we started it
    if (devServer) {
      log('\n🛑 Stopping development server...', colors.yellow);
      devServer.kill();
    }

    process.exit(exitCode);
  }
}

// Show help if requested
if (process.argv.includes('--help')) {
  console.log(`
${colors.bright}BoardOS E2E Test Runner${colors.reset}

${colors.cyan}Usage:${colors.reset}
  npm run test:e2e [options] [playwright-options]

${colors.cyan}Options:${colors.reset}
  --skip-generate     Skip dynamic test generation
  --no-server        Don't start dev server (assumes it's already running)
  --generate-only    Only generate tests, don't run them
  --show-report      Open HTML report after tests
  --help            Show this help message

${colors.cyan}Playwright Options:${colors.reset}
  --headed          Run tests in headed mode
  --debug           Run tests in debug mode
  --ui              Run tests in UI mode
  --project=name    Run specific project (chromium, firefox, webkit, mobile)
  --grep="pattern"  Run tests matching pattern

${colors.cyan}Examples:${colors.reset}
  npm run test:e2e                    # Generate and run all tests
  npm run test:e2e --headed           # Run tests with visible browser
  npm run test:e2e --ui               # Run tests in interactive UI
  npm run test:e2e --project=mobile   # Run mobile tests only
  npm run test:e2e --grep="drag"      # Run tests with "drag" in name
  npm run test:e2e --generate-only    # Only generate dynamic tests
  `);
  process.exit(0);
}

// Run the test suite
main().catch(err => {
  console.error(err);
  process.exit(1);
});