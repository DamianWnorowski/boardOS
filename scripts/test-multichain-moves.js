#!/usr/bin/env node

/**
 * Multi-Chain Moves Test Runner
 * Specialized test runner for multi-chained move scenarios
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class MultiChainTestRunner {
  constructor() {
    this.testFiles = [
      'business-rules/magnet-multichain-interactions.spec.ts',
      'business-rules/advanced-multichain-moves.spec.ts'
    ];
    
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.headless = !process.argv.includes('--headed');
    this.grep = this.getGrepPattern();
  }

  getGrepPattern() {
    const grepIndex = process.argv.indexOf('--grep');
    if (grepIndex !== -1 && process.argv[grepIndex + 1]) {
      return process.argv[grepIndex + 1];
    }
    return null;
  }

  async runTests() {
    console.log('🔗 Multi-Chain Moves Test Suite');
    console.log('=' .repeat(50));
    
    if (this.verbose) {
      console.log(`📋 Configuration:`);
      console.log(`   Headless: ${this.headless}`);
      console.log(`   Grep: ${this.grep || 'all tests'}`);
      console.log('');
    }

    const results = [];
    
    for (const testFile of this.testFiles) {
      console.log(`🧪 Running: ${testFile}`);
      
      const result = await this.runPlaywrightTest(testFile);
      results.push({ testFile, ...result });
      
      if (result.success) {
        console.log(`✅ ${testFile} - PASSED`);
      } else {
        console.log(`❌ ${testFile} - FAILED`);
        if (result.error && this.verbose) {
          console.log(`   Error: ${result.error.slice(0, 200)}...`);
        }
      }
    }

    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('=' .repeat(50));
    
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Test Files: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Test Files:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   ${result.testFile}`);
      });
    }

    console.log('\n🎯 Multi-Chain Test Categories Covered:');
    console.log('   ✓ Basic Chain Operations');
    console.log('   ✓ Equipment-Operator Chains'); 
    console.log('   ✓ Multi-attachment Chains');
    console.log('   ✓ Rapid Operations Testing');
    console.log('   ✓ View Switching Integrity');
    
    return failedTests === 0;
  }

  async runPlaywrightTest(testFile) {
    return new Promise((resolve) => {
      const args = [
        'playwright',
        'test',
        `playwright/tests/${testFile}`,
        '--project=chromium'  // Use chromium for speed
      ];

      if (!this.headless) {
        args.push('--headed');
      }

      if (this.grep) {
        args.push('--grep', this.grep);
      }

      if (this.verbose) {
        args.push('--reporter=list');
      } else {
        args.push('--reporter=dot');
      }

      const process = spawn('npx', args, {
        cwd: projectRoot,
        stdio: this.verbose ? 'inherit' : 'pipe'
      });

      let errorOutput = '';

      if (!this.verbose) {
        process.stderr?.on('data', (data) => {
          errorOutput += data.toString();
        });
      }

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          error: code !== 0 ? errorOutput : null
        });
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  }

  printUsage() {
    console.log(`
Usage: npm run test:multichain [options]

Options:
  --verbose, -v     Verbose output
  --headed          Run tests with browser UI (non-headless)
  --grep <pattern>  Run only tests matching pattern

Examples:
  npm run test:multichain
  npm run test:multichain -- --verbose
  npm run test:multichain -- --grep "chain"
  npm run test:multichain -- --headed --verbose
`);
  }
}

// Main execution
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    new MultiChainTestRunner().printUsage();
    process.exit(0);
  }

  const runner = new MultiChainTestRunner();
  
  try {
    const success = await runner.runTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Test runner error:', error.message);
    process.exit(1);
  }
}

// Only run if called directly
if (process.argv[1] && process.argv[1].endsWith('test-multichain-moves.js')) {
  main();
}