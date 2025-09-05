#!/usr/bin/env node

/**
 * Test script for the automated Claude context management system
 */

import fs from 'fs/promises';
import ClaudeHelpers from './utils/claude-helpers.js';
import ClaudeContextManager from './claude-context-manager.js';
import ClaudeMonitor from './claude-monitor.js';
import ClaudeBridge from './claude-bridge.js';

class AutomatedContextTester {
  constructor() {
    this.testResults = {
      contextManager: { passed: 0, failed: 0, tests: [] },
      monitor: { passed: 0, failed: 0, tests: [] },
      bridge: { passed: 0, failed: 0, tests: [] },
      integration: { passed: 0, failed: 0, tests: [] }
    };
    this.tempFiles = [];
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Testing Automated Claude Context System');
    console.log('=' .repeat(50));

    try {
      // Clean up any existing test data
      await this.cleanup();

      // Test individual components
      await this.testContextManager();
      await this.testTokenMonitor();
      await this.testBridge();

      // Test integration
      await this.testIntegration();

      // Show results
      this.showResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Test Context Manager
   */
  async testContextManager() {
    console.log('\n📝 Testing Context Manager...');

    const manager = new ClaudeContextManager({ verbose: false });

    // Test 1: Initialization
    await this.test('contextManager', 'initialization', async () => {
      await manager.initialize();
      const exists = await GeminiHelpers.fileExists('.claude/current-context.json');
      return exists;
    });

    // Test 2: Context creation
    await this.test('contextManager', 'context creation', async () => {
      await manager.saveContext();
      const context = await GeminiHelpers.readJsonSafe('.claude/current-context.json');
      return context && context.session && context.activeWork;
    });

    // Test 3: Decision tracking
    await this.test('contextManager', 'decision tracking', async () => {
      manager.addDecision('Test decision for automated testing');
      await manager.saveContext();
      const context = await GeminiHelpers.readJsonSafe('.claude/current-context.json');
      return context.memory.keyDecisions.some(d => d.decision.includes('Test decision'));
    });

    // Test 4: Progress tracking
    await this.test('contextManager', 'progress tracking', async () => {
      manager.addProgress('Test progress item');
      await manager.saveContext();
      const context = await GeminiHelpers.readJsonSafe('.claude/current-context.json');
      return context.activeWork.progress.some(p => p.item.includes('Test progress'));
    });

    // Test 5: Markdown summary
    await this.test('contextManager', 'markdown summary', async () => {
      await manager.saveContext();
      const exists = await GeminiHelpers.fileExists('.claude/current-context.md');
      return exists;
    });
  }

  /**
   * Test Token Monitor
   */
  async testTokenMonitor() {
    console.log('\n📊 Testing Token Monitor...');

    const monitor = new ClaudeMonitor({ verbose: false });

    // Test 1: Monitor initialization
    await this.test('monitor', 'initialization', async () => {
      await monitor.initialize();
      return monitor.state && monitor.state.sessionStart;
    });

    // Test 2: Token estimation
    await this.test('monitor', 'token estimation', async () => {
      const estimate = await monitor.updateTokenEstimate(1000);
      return estimate > 0;
    });

    // Test 3: Status checking
    await this.test('monitor', 'status checking', async () => {
      const status = await monitor.getStatus();
      return status && status.usage !== undefined && status.tokens !== undefined;
    });

    // Test 4: Warning system (simulate 80% usage)
    await this.test('monitor', 'warning system', async () => {
      // Set a low token limit to trigger warning
      monitor.options.tokenLimit = 1000;
      await monitor.updateTokenEstimate(850); // 85% usage
      const result = await monitor.checkTokenUsage();
      return result.status === 'warning' || result.status === 'critical';
    });

    // Test 5: Monitor state persistence
    await this.test('monitor', 'state persistence', async () => {
      await monitor.saveMonitorState();
      const exists = await GeminiHelpers.fileExists('.claude/token-monitor.json');
      return exists;
    });
  }

  /**
   * Test Bridge
   */
  async testBridge() {
    console.log('\n🌉 Testing Bridge...');

    const bridge = new ClaudeBridge({ verbose: false });

    // Test 1: Bridge initialization
    await this.test('bridge', 'initialization', async () => {
      await bridge.initialize();
      return true; // If no error, it initialized
    });

    // Test 2: Context loading (with mocked data)
    await this.test('bridge', 'context loading', async () => {
      // Create mock context data
      await this.createMockContext();
      const bridgeData = await bridge.loadPreviousContext();
      return bridgeData && bridgeData.context;
    });

    // Test 3: Memory parsing
    await this.test('bridge', 'memory parsing', async () => {
      await this.createMockMemory();
      const memory = await bridge.parseClaudeMdMemory();
      return memory && memory.decisions && memory.decisions.length > 0;
    });

    // Test 4: Context verification
    await this.test('bridge', 'context verification', async () => {
      const sources = {
        realTime: { session: { id: 'test' }, activeWork: {}, memory: {} },
        memory: { decisions: [] },
        git: { branch: 'main' }
      };
      const result = await bridge.verifyContext(sources);
      return result && result.verified;
    });
  }

  /**
   * Test system integration
   */
  async testIntegration() {
    console.log('\n🔗 Testing System Integration...');

    // Test 1: End-to-end context flow
    await this.test('integration', 'end-to-end context flow', async () => {
      // Create context with manager
      const manager = new ClaudeContextManager({ verbose: false });
      await manager.initialize();
      manager.addDecision('Integration test decision');
      await manager.saveContext();

      // Load with bridge
      const bridge = new ClaudeBridge({ verbose: false });
      await bridge.initialize();
      const bridgeData = await bridge.loadPreviousContext();

      return bridgeData && bridgeData.context.memory.keyDecisions.length > 0;
    });

    // Test 2: Monitor integration
    await this.test('integration', 'monitor integration', async () => {
      const monitor = new ClaudeMonitor({ verbose: false });
      await monitor.initialize();
      const status = await monitor.getStatus();

      // Should be able to read context created by manager
      return status && status.tokens >= 0;
    });

    // Test 3: Schema validation
    await this.test('integration', 'schema validation', async () => {
      const context = await GeminiHelpers.readJsonSafe('.claude/current-context.json');
      if (!context) return false;

      // Basic schema validation
      const required = ['session', 'activeWork', 'memory', 'environment'];
      return required.every(field => context[field] !== undefined);
    });

    // Test 4: File cleanup
    await this.test('integration', 'file cleanup', async () => {
      // Files should exist
      const files = [
        '.claude/current-context.json',
        '.claude/current-context.md'
      ];

      const exists = await Promise.all(files.map(f => ClaudeHelpers.fileExists(f)));
      return exists.every(e => e);
    });

    // Test 5: npm scripts integration
    await this.test('integration', 'npm scripts', async () => {
      // Check if scripts are properly added to package.json
      const pkg = await ClaudeHelpers.readJsonSafe('package.json');
      const requiredScripts = [
        'claude:context:watch',
        'claude:context:update',
        'claude:monitor',
        'claude:bridge'
      ];

      return requiredScripts.every(script => pkg.scripts[script]);
    });
  }

  /**
   * Run individual test
   */
  async test(category, name, testFn) {
    try {
      const result = await testFn();
      if (result) {
        this.testResults[category].passed++;
        console.log(`  ✅ ${name}`);
      } else {
        this.testResults[category].failed++;
        console.log(`  ❌ ${name} - returned false`);
      }
      this.testResults[category].tests.push({ name, passed: !!result });
    } catch (error) {
      this.testResults[category].failed++;
      console.log(`  ❌ ${name} - ${error.message}`);
      this.testResults[category].tests.push({ name, passed: false, error: error.message });
    }
  }

  /**
   * Create mock context data
   */
  async createMockContext() {
    const mockContext = {
      session: {
        id: 'claude-test-session',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        tokenEstimate: 5000
      },
      activeWork: {
        currentTask: 'Testing automated context system',
        files: ['test.js'],
        decisions: [],
        progress: []
      },
      memory: {
        keyDecisions: [{ decision: 'Mock decision', timestamp: new Date().toISOString() }],
        userPreferences: ['Mock preference']
      },
      environment: {
        gitBranch: 'test-branch',
        testStatus: { passing: 10, failing: 0 },
        lintStatus: { errors: 0, warnings: 0 }
      }
    };

    await GeminiHelpers.writeJsonSafe('.claude/current-context.json', mockContext);
    this.tempFiles.push('.claude/current-context.json');
  }

  /**
   * Create mock memory data
   */
  async createMockMemory() {
    const mockMemory = `# BoardOS Claude Memory

# DECISION: [2025-01-20] Use automated context system for better continuity
# PREFERENCE: Verbose logging for debugging
# FIXED: test.js:10 - Fixed mock testing issue
# CURRENT_TASK: Testing the automated context system
`;

    await fs.writeFile('CLAUDE.md', mockMemory);
    this.tempFiles.push('CLAUDE.md');
  }

  /**
   * Show test results
   */
  showResults() {
    console.log('\n🏁 Test Results');
    console.log('=' .repeat(50));

    let totalPassed = 0;
    let totalFailed = 0;

    Object.entries(this.testResults).forEach(([category, results]) => {
      const total = results.passed + results.failed;
      const percentage = total > 0 ? Math.round((results.passed / total) * 100) : 0;
      const status = percentage === 100 ? '✅' : percentage >= 80 ? '⚠️' : '❌';
      
      console.log(`${status} ${category}: ${results.passed}/${total} (${percentage}%)`);
      
      totalPassed += results.passed;
      totalFailed += results.failed;
    });

    const grandTotal = totalPassed + totalFailed;
    const grandPercentage = grandTotal > 0 ? Math.round((totalPassed / grandTotal) * 100) : 0;

    console.log('\n📊 Overall Results');
    console.log(`Total: ${totalPassed}/${grandTotal} tests passed (${grandPercentage}%)`);

    if (grandPercentage >= 90) {
      console.log('🎉 Automated context system is working excellently!');
    } else if (grandPercentage >= 75) {
      console.log('✅ Automated context system is working well with minor issues');
    } else {
      console.log('⚠️ Automated context system needs attention');
    }

    // Show failed tests
    const failedTests = [];
    Object.entries(this.testResults).forEach(([category, results]) => {
      results.tests.forEach(test => {
        if (!test.passed) {
          failedTests.push(`${category}/${test.name}${test.error ? `: ${test.error}` : ''}`);
        }
      });
    });

    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => console.log(`  - ${test}`));
    }
  }

  /**
   * Clean up test files
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up test files...');
    
    const cleanupFiles = [
      '.claude/current-context.json',
      '.claude/current-context.md',
      '.claude/token-monitor.json',
      '.claude/token-warning.json',
      '.claude/token-warning.md',
      '.claude/bridge-data.json',
      '.claude/bridge-summary.md',
      'CLAUDE.md'
    ];

    for (const file of cleanupFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore errors (file might not exist)
      }
    }
  }
}

// Main execution
async function main() {
  const tester = new AutomatedContextTester();
  await tester.runAllTests();
}

// Check if running directly
if (process.argv[1] && process.argv[1].endsWith('test-automated-context.js')) {
  main();
}

export default AutomatedContextTester;