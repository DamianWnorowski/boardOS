/**
 * Test Context Collector
 * Analyzes test results, coverage, and testing patterns
 */

import GeminiHelpers from '../utils/gemini-helpers.js';

export class TestCollector {
  constructor() {
    this.name = 'TestCollector';
    this.version = '1.0.0';
  }

  /**
   * Collect comprehensive test context
   */
  async collect() {
    const startTime = Date.now();
    
    try {
      // Run tests and gather information in parallel
      const [
        testResults,
        e2eResults,
        testFiles,
        coverage,
        recentTestChanges
      ] = await Promise.all([
        this.runUnitTests(),
        this.runE2ETests(),
        this.analyzeTestFiles(),
        this.getCoverage(),
        this.getRecentTestChanges()
      ]);

      const context = {
        metadata: {
          collector: this.name,
          version: this.version,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime
        },
        
        results: {
          unit: testResults,
          e2e: e2eResults,
          overall: this.calculateOverallStatus(testResults, e2eResults)
        },
        
        coverage: coverage,
        
        testSuite: {
          files: testFiles,
          recentChanges: recentTestChanges,
          patterns: this.analyzeTestPatterns(testFiles)
        },
        
        analysis: {
          healthScore: this.calculateHealthScore(testResults, coverage),
          riskAssessment: this.assessTestingRisk(testResults, testFiles),
          recommendations: this.generateRecommendations(testResults, coverage, testFiles)
        },
        
        insights: {
          trends: this.analyzeTrends(testResults, recentTestChanges),
          gaps: this.identifyTestGaps(testFiles, coverage),
          priorities: this.prioritizeTestWork(testResults, coverage)
        }
      };

      return context;
      
    } catch (error) {
      return {
        error: error.message,
        collector: this.name,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run unit tests and parse results
   */
  async runUnitTests() {
    const result = await ClaudeHelpers.execSafe('npm test -- --run --reporter=json 2>/dev/null || npm test -- --run', {
      timeout: 60000
    });
    
    let testData = {
      success: result.success,
      total: 0,
      passing: 0,
      failing: 0,
      skipped: 0,
      duration: 0,
      failures: [],
      suites: []
    };
    
    if (result.stdout) {
      try {
        // Try to parse JSON output first
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('{') && line.includes('testResults')) {
            const jsonData = JSON.parse(line);
            testData = this.parseVitestResults(jsonData);
            break;
          }
        }
      } catch (e) {
        // Parse text output if JSON parsing fails
        testData = this.parseTestTextOutput(result.stdout);
      }
    }
    
    return testData;
  }

  /**
   * Run E2E tests
   */
  async runE2ETests() {
    const result = await GeminiHelpers.execSafe('npx playwright test --reporter=json 2>/dev/null || echo "E2E not available"', {
      timeout: 120000
    });
    
    if (result.stdout && result.stdout.includes('E2E not available')) {
      return { available: false, reason: 'Playwright not configured or available' };
    }
    
    try {
      if (result.stdout && result.stdout.trim().startsWith('{')) {
        const data = JSON.parse(result.stdout);
        return this.parsePlaywrightResults(data);
      }
    } catch (e) {
      // Fallback parsing
    }
    
    return {
      available: true,
      success: result.success,
      summary: 'E2E tests executed but results parsing failed'
    };
  }

  /**
   * Analyze test file structure
   */
  async analyzeTestFiles() {
    const testFiles = await ClaudeHelpers.execSafe('find . -name "*.test.*" -o -name "*.spec.*" | grep -v node_modules');
    const files = testFiles.stdout ? testFiles.stdout.split('\n').filter(f => f) : [];
    
    const analysis = {
      total: files.length,
      byType: {
        unit: files.filter(f => f.includes('.test.')).length,
        integration: files.filter(f => f.includes('.spec.')).length,
        e2e: files.filter(f => f.includes('e2e') || f.includes('playwright')).length
      },
      byArea: {
        components: files.filter(f => f.includes('components/')).length,
        services: files.filter(f => f.includes('services/')).length,
        utils: files.filter(f => f.includes('utils/')).length,
        hooks: files.filter(f => f.includes('hooks/')).length,
        context: files.filter(f => f.includes('context/')).length
      },
      coverage: {
        components: this.calculateTestCoverage(files, 'components/'),
        services: this.calculateTestCoverage(files, 'services/'),
        utils: this.calculateTestCoverage(files, 'utils/')
      }
    };
    
    return analysis;
  }

  /**
   * Get test coverage information
   */
  async getCoverage() {
    const result = await ClaudeHelpers.execSafe('npm test -- --coverage --reporter=json 2>/dev/null || echo "Coverage not available"', {
      timeout: 90000
    });
    
    if (result.stdout && result.stdout.includes('Coverage not available')) {
      return { available: false };
    }
    
    // Parse coverage data if available
    try {
      if (result.stdout) {
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          if (line.includes('coverage') || line.includes('%')) {
            // Extract coverage percentages
            const coverageMatch = line.match(/(\d+(?:\.\d+)?)%/g);
            if (coverageMatch) {
              return {
                available: true,
                overall: parseFloat(coverageMatch[0]) || 0,
                details: this.parseCoverageDetails(result.stdout)
              };
            }
          }
        }
      }
    } catch (e) {
      // Coverage parsing failed
    }
    
    return {
      available: false,
      reason: 'Coverage data could not be parsed'
    };
  }

  /**
   * Get recent test-related changes
   */
  async getRecentTestChanges() {
    const result = await ClaudeHelpers.execSafe('git log --oneline --since="1 week ago" -- "*.test.*" "*.spec.*"');
    const commits = result.stdout ? result.stdout.split('\n').filter(c => c) : [];
    
    const uncommitted = await GeminiHelpers.execSafe('git diff --name-only | grep -E "\\.(test|spec)\\."');
    const uncommittedTests = uncommitted.stdout ? uncommitted.stdout.split('\n').filter(f => f) : [];
    
    return {
      recentCommits: commits.length,
      uncommittedChanges: uncommittedTests.length,
      lastTestCommit: commits[0] || 'No recent test commits',
      modifiedTests: uncommittedTests
    };
  }

  /**
   * Parse Vitest JSON results
   */
  parseVitestResults(data) {
    return {
      success: data.success || false,
      total: data.numTotalTests || 0,
      passing: data.numPassedTests || 0,
      failing: data.numFailedTests || 0,
      skipped: data.numPendingTests || 0,
      duration: data.testResults?.reduce((sum, suite) => sum + (suite.duration || 0), 0) || 0,
      failures: this.extractTestFailures(data.testResults || []),
      suites: data.testResults?.map(suite => ({
        name: suite.name || 'Unknown',
        tests: suite.numTests || 0,
        passing: suite.numPassingTests || 0,
        failing: suite.numFailingTests || 0,
        duration: suite.duration || 0
      })) || []
    };
  }

  /**
   * Parse Playwright JSON results
   */
  parsePlaywrightResults(data) {
    const suites = data.suites || [];
    let total = 0, passing = 0, failing = 0;
    
    suites.forEach(suite => {
      suite.specs?.forEach(spec => {
        spec.tests?.forEach(test => {
          total++;
          if (test.outcome === 'expected') passing++;
          else failing++;
        });
      });
    });
    
    return {
      available: true,
      success: failing === 0,
      total,
      passing,
      failing,
      duration: data.stats?.duration || 0,
      failures: this.extractE2EFailures(suites)
    };
  }

  /**
   * Parse text output when JSON is not available
   */
  parseTestTextOutput(output) {
    const passingMatch = output.match(/(\d+)\s+passed/i);
    const failingMatch = output.match(/(\d+)\s+failed/i);
    const totalMatch = output.match(/Tests:\s*(\d+)\s+passed/i);
    
    const passing = passingMatch ? parseInt(passingMatch[1]) : 0;
    const failing = failingMatch ? parseInt(failingMatch[1]) : 0;
    
    return {
      success: failing === 0,
      total: passing + failing,
      passing,
      failing,
      skipped: 0,
      duration: 0,
      failures: this.extractFailuresFromText(output),
      suites: []
    };
  }

  /**
   * Extract test failures with details
   */
  extractTestFailures(testResults) {
    const failures = [];
    
    testResults.forEach(suite => {
      if (suite.assertionResults) {
        suite.assertionResults.forEach(test => {
          if (test.status === 'failed') {
            failures.push({
              suite: suite.name,
              test: test.title,
              error: test.failureMessages?.[0] || 'Unknown error',
              location: test.location || 'Unknown'
            });
          }
        });
      }
    });
    
    return failures.slice(0, 10); // Limit to first 10 failures
  }

  /**
   * Extract E2E failures
   */
  extractE2EFailures(suites) {
    const failures = [];
    
    suites.forEach(suite => {
      suite.specs?.forEach(spec => {
        spec.tests?.forEach(test => {
          if (test.outcome !== 'expected') {
            failures.push({
              suite: suite.title || 'Unknown Suite',
              test: test.title || 'Unknown Test',
              error: test.errors?.[0]?.message || 'E2E test failed',
              browser: test.projectName || 'Unknown'
            });
          }
        });
      });
    });
    
    return failures.slice(0, 10);
  }

  /**
   * Extract failures from text output
   */
  extractFailuresFromText(output) {
    const failures = [];
    const lines = output.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('FAIL') || line.includes('✗')) {
        failures.push({
          test: line.trim(),
          error: lines[i + 1] || 'No error details',
          location: 'Unknown'
        });
      }
    }
    
    return failures.slice(0, 5);
  }

  /**
   * Parse coverage details
   */
  parseCoverageDetails(output) {
    const details = {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    };
    
    // Extract coverage percentages from output
    const coverageLines = output.split('\n').filter(line => line.includes('%'));
    
    coverageLines.forEach(line => {
      if (line.includes('Statements')) {
        const match = line.match(/(\d+(?:\.\d+)?)%/);
        if (match) details.statements = parseFloat(match[1]);
      } else if (line.includes('Branches')) {
        const match = line.match(/(\d+(?:\.\d+)?)%/);
        if (match) details.branches = parseFloat(match[1]);
      } else if (line.includes('Functions')) {
        const match = line.match(/(\d+(?:\.\d+)?)%/);
        if (match) details.functions = parseFloat(match[1]);
      } else if (line.includes('Lines')) {
        const match = line.match(/(\d+(?:\.\d+)?)%/);
        if (match) details.lines = parseFloat(match[1]);
      }
    });
    
    return details;
  }

  /**
   * Calculate test coverage for specific areas
   */
  calculateTestCoverage(testFiles, area) {
    const areaFiles = testFiles.filter(f => f.includes(area));
    const sourceFiles = this.estimateSourceFiles(area);
    
    return {
      testFiles: areaFiles.length,
      estimatedSourceFiles: sourceFiles,
      coverageRatio: sourceFiles > 0 ? (areaFiles.length / sourceFiles) : 0
    };
  }

  /**
   * Estimate source files for coverage calculation
   */
  estimateSourceFiles(area) {
    // This is a rough estimate - in a real implementation,
    // you'd scan the actual source files
    const estimates = {
      'components/': 50,
      'services/': 5,
      'utils/': 15,
      'hooks/': 3,
      'context/': 5
    };
    
    return estimates[area] || 10;
  }

  /**
   * Calculate overall test status
   */
  calculateOverallStatus(unitResults, e2eResults) {
    const unitPassing = unitResults.failing === 0;
    const e2ePassing = !e2eResults.available || e2eResults.failing === 0;
    
    if (unitPassing && e2ePassing) return 'PASSING';
    if (!unitPassing && e2ePassing) return 'UNIT_FAILING';
    if (unitPassing && !e2ePassing) return 'E2E_FAILING';
    return 'MULTIPLE_FAILING';
  }

  /**
   * Analyze test patterns
   */
  analyzeTestPatterns(testFiles) {
    return {
      namingConventions: this.analyzeNamingPatterns(testFiles.byArea),
      testDistribution: this.analyzeTestDistribution(testFiles.byArea),
      coverageGaps: this.identifyCoverageGaps(testFiles.coverage)
    };
  }

  /**
   * Analyze naming patterns
   */
  analyzeNamingPatterns(byArea) {
    // Simple analysis of test naming consistency
    return {
      consistent: Object.values(byArea).every(count => count > 0) ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      recommendation: 'Follow consistent naming: ComponentName.test.tsx'
    };
  }

  /**
   * Analyze test distribution
   */
  analyzeTestDistribution(byArea) {
    const total = Object.values(byArea).reduce((sum, count) => sum + count, 0);
    const distribution = {};
    
    Object.entries(byArea).forEach(([area, count]) => {
      distribution[area] = total > 0 ? Math.round((count / total) * 100) : 0;
    });
    
    return distribution;
  }

  /**
   * Identify coverage gaps
   */
  identifyCoverageGaps(coverage) {
    const gaps = [];
    
    Object.entries(coverage).forEach(([area, data]) => {
      if (data.coverageRatio < 0.5) {
        gaps.push({
          area,
          severity: data.coverageRatio < 0.2 ? 'HIGH' : 'MEDIUM',
          currentRatio: data.coverageRatio,
          recommendation: `Add more tests for ${area}`
        });
      }
    });
    
    return gaps;
  }

  /**
   * Calculate health score
   */
  calculateHealthScore(testResults, coverage) {
    let score = 0;
    
    // Test success rate (40% of score)
    const successRate = testResults.total > 0 ? (testResults.passing / testResults.total) : 0;
    score += successRate * 0.4;
    
    // Coverage score (30% of score)
    const coverageScore = coverage.available ? (coverage.overall / 100) : 0;
    score += coverageScore * 0.3;
    
    // Test existence (30% of score)
    const hasTests = testResults.total > 0 ? 1 : 0;
    score += hasTests * 0.3;
    
    return Math.round(score * 100);
  }

  /**
   * Assess testing risk
   */
  assessTestingRisk(testResults, testFiles) {
    let risk = 'LOW';
    const issues = [];
    
    if (testResults.failing > 0) {
      risk = 'HIGH';
      issues.push(`${testResults.failing} failing tests`);
    }
    
    if (testFiles.total < 10) {
      risk = risk === 'LOW' ? 'MEDIUM' : 'HIGH';
      issues.push('Low test coverage');
    }
    
    if (testResults.total === 0) {
      risk = 'CRITICAL';
      issues.push('No tests found');
    }
    
    return { level: risk, issues };
  }

  /**
   * Generate testing recommendations
   */
  generateRecommendations(testResults, coverage, testFiles) {
    const recommendations = [];
    
    if (testResults.failing > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: `Fix ${testResults.failing} failing test(s)`,
        rationale: 'Failing tests indicate broken functionality',
        estimatedTime: testResults.failing < 3 ? '30 minutes' : '1-2 hours'
      });
    }
    
    if (testFiles.total < 20) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Increase test coverage',
        rationale: 'More tests improve code reliability and catch regressions',
        estimatedTime: '2-4 hours'
      });
    }
    
    if (!coverage.available) {
      recommendations.push({
        priority: 'LOW',
        action: 'Set up test coverage reporting',
        rationale: 'Coverage metrics help identify untested code',
        estimatedTime: '30 minutes'
      });
    }
    
    return recommendations;
  }

  /**
   * Analyze testing trends
   */
  analyzeTrends(testResults, recentChanges) {
    return {
      testActivity: recentChanges.recentCommits > 0 ? 'ACTIVE' : 'STAGNANT',
      recentCommits: recentChanges.recentCommits,
      pendingChanges: recentChanges.uncommittedChanges,
      trend: recentChanges.recentCommits > 2 ? 'IMPROVING' : 'STABLE'
    };
  }

  /**
   * Identify test gaps
   */
  identifyTestGaps(testFiles, coverage) {
    const gaps = [];
    
    // Coverage gaps
    if (coverage.available && coverage.overall < 70) {
      gaps.push({
        type: 'COVERAGE',
        description: `Overall coverage is ${coverage.overall}% (target: 70%+)`,
        priority: 'MEDIUM'
      });
    }
    
    // Component test gaps
    if (testFiles.byArea.components < 10) {
      gaps.push({
        type: 'COMPONENT_TESTS',
        description: 'Low component test coverage',
        priority: 'HIGH'
      });
    }
    
    return gaps;
  }

  /**
   * Prioritize test work
   */
  prioritizeTestWork(testResults, coverage) {
    const priorities = [];
    
    if (testResults.failing > 0) {
      priorities.push({ task: 'Fix failing tests', priority: 1 });
    }
    
    if (!coverage.available) {
      priorities.push({ task: 'Set up coverage', priority: 3 });
    }
    
    if (testResults.total < 20) {
      priorities.push({ task: 'Write more tests', priority: 2 });
    }
    
    return priorities.sort((a, b) => a.priority - b.priority);
  }
}

export default TestCollector;