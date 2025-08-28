import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class ClaudeHelpers {
  static async execSafe(command, options = {}) {
    try {
      const result = await execAsync(command, { 
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        ...options 
      });
      return { 
        success: true, 
        stdout: result.stdout?.trim() || '',
        stderr: result.stderr?.trim() || ''
      };
    } catch (error) {
      return { 
        success: false, 
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || error.message,
        error: error.message
      };
    }
  }

  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  static async readJsonSafe(filePath) {
    try {
      if (await this.fileExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
      }
      return null;
    } catch {
      return null;
    }
  }

  static async writeJsonSafe(filePath, data) {
    try {
      await this.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch {
      return false;
    }
  }

  static async getGitStatus() {
    const status = await this.execSafe('git status --porcelain');
    const branch = await this.execSafe('git branch --show-current');
    const lastCommit = await this.execSafe('git log -1 --oneline');
    const uncommitted = await this.execSafe('git diff --name-only');
    const unpushed = await this.execSafe('git log origin/main..HEAD --oneline');
    
    return {
      branch: branch.stdout || 'unknown',
      hasChanges: status.stdout.length > 0,
      uncommittedFiles: uncommitted.stdout ? uncommitted.stdout.split('\n').filter(f => f) : [],
      unpushedCommits: unpushed.stdout ? unpushed.stdout.split('\n').filter(c => c) : [],
      lastCommit: lastCommit.stdout || 'No commits',
      status: status.stdout || 'Clean'
    };
  }

  static async getTestStatus() {
    const testResult = await this.execSafe('npm test -- --run --reporter=json', { 
      timeout: 60000 
    });
    
    let testData = { numPassedTests: 0, numFailedTests: 0, testResults: [] };
    
    if (testResult.success && testResult.stdout) {
      try {
        // Extract JSON from the output (npm adds extra text)
        const lines = testResult.stdout.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('{') && line.includes('testResults')) {
            testData = JSON.parse(line);
            break;
          }
        }
      } catch (e) {
        // Parse manually if JSON parsing fails
        const passing = (testResult.stdout.match(/(\d+) passed/i) || ['', '0'])[1];
        const failing = (testResult.stdout.match(/(\d+) failed/i) || ['', '0'])[1];
        testData = {
          numPassedTests: parseInt(passing) || 0,
          numFailedTests: parseInt(failing) || 0,
          testResults: []
        };
      }
    }

    return {
      passing: testData.numPassedTests || 0,
      failing: testData.numFailedTests || 0,
      total: (testData.numPassedTests || 0) + (testData.numFailedTests || 0),
      coverage: testData.coverageMap ? this.calculateCoverage(testData.coverageMap) : 0,
      failures: testData.testResults ? this.extractFailures(testData.testResults) : [],
      success: testResult.success
    };
  }

  static async getLintStatus() {
    const result = await this.execSafe('npx eslint . --format json');
    
    let issues = [];
    if (result.stdout) {
      try {
        const eslintOutput = JSON.parse(result.stdout);
        issues = eslintOutput.flatMap(file => 
          file.messages.map(msg => ({
            file: file.filePath.replace(process.cwd(), ''),
            line: msg.line,
            message: msg.message,
            severity: msg.severity === 2 ? 'error' : 'warning',
            rule: msg.ruleId
          }))
        );
      } catch (e) {
        // Fallback parsing
        const errorMatch = result.stderr.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
        if (errorMatch) {
          return {
            total: parseInt(errorMatch[1]) || 0,
            errors: parseInt(errorMatch[2]) || 0,
            warnings: parseInt(errorMatch[3]) || 0,
            issues: []
          };
        }
      }
    }

    return {
      total: issues.length,
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      issues: issues.slice(0, 10) // Top 10 issues
    };
  }

  static async getDatabaseStatus() {
    // Check if migration was applied
    const migrationExists = await this.fileExists('MIGRATION_STATUS.md');
    const handoffExists = await this.fileExists('CLAUDE_HANDOFF.json');
    
    return {
      migrationApplied: false, // Would need database connection to verify
      migrationFileExists: migrationExists,
      handoffExists: handoffExists
    };
  }

  static async getServerStatus() {
    const devServerCheck = await this.execSafe('netstat -ano | grep :5173 || ss -tuln | grep :5173');
    
    return {
      devServerRunning: devServerCheck.success && devServerCheck.stdout.includes('5173'),
      port: 5173
    };
  }

  static extractFailures(testResults) {
    return testResults.flatMap(result => 
      result.assertionResults
        .filter(assertion => assertion.status === 'failed')
        .map(assertion => ({
          test: assertion.title,
          file: result.name,
          error: assertion.failureMessages?.[0] || 'Unknown error'
        }))
    ).slice(0, 10); // Top 10 failures
  }

  static calculateCoverage(coverageMap) {
    if (!coverageMap) return 0;
    // Simplified coverage calculation
    const files = Object.values(coverageMap);
    if (files.length === 0) return 0;
    
    const totalStatements = files.reduce((sum, file) => sum + Object.keys(file.s || {}).length, 0);
    const coveredStatements = files.reduce((sum, file) => 
      sum + Object.values(file.s || {}).filter(count => count > 0).length, 0
    );
    
    return totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0;
  }

  static async findCriticalIssues(testStatus, lintStatus, gitStatus) {
    const critical = [];
    
    // Critical test failures
    if (testStatus.failing > 10) {
      critical.push({
        type: 'test_failures',
        severity: 'high',
        message: `${testStatus.failing} tests failing`,
        impact: 'Blocks development',
        files: testStatus.failures.map(f => f.file).slice(0, 3)
      });
    }

    // Critical lint errors
    if (lintStatus.errors > 100) {
      critical.push({
        type: 'lint_errors',
        severity: 'medium',
        message: `${lintStatus.errors} ESLint errors`,
        impact: 'Code quality issues',
        files: lintStatus.issues.slice(0, 3).map(i => i.file)
      });
    }

    // Uncommitted changes
    if (gitStatus.uncommittedFiles.length > 5) {
      critical.push({
        type: 'uncommitted_changes',
        severity: 'low',
        message: `${gitStatus.uncommittedFiles.length} uncommitted files`,
        impact: 'Risk of losing work',
        files: gitStatus.uncommittedFiles.slice(0, 3)
      });
    }

    return critical;
  }

  static generateSessionId() {
    return `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static formatTimestamp(date = new Date()) {
    return date.toISOString().replace('T', ' ').substr(0, 19);
  }

  static async loadSessionHistory() {
    const historyPath = '.claude/history.json';
    const history = await this.readJsonSafe(historyPath) || { sessions: [] };
    return history.sessions || [];
  }

  static async saveSessionHistory(sessionData) {
    const historyPath = '.claude/history.json';
    const history = await this.readJsonSafe(historyPath) || { sessions: [] };
    history.sessions = history.sessions || [];
    history.sessions.unshift(sessionData);
    
    // Keep only last 10 sessions
    history.sessions = history.sessions.slice(0, 10);
    
    await this.writeJsonSafe(historyPath, history);
  }

  static formatMarkdown(data) {
    return `# Claude Session Context - ${this.formatTimestamp()}

## 🚨 Critical Issues
${data.critical?.map(issue => `- **${issue.message}** (${issue.severity}) - ${issue.impact}`).join('\n') || 'None'}

## 📊 Project Status
- **Tests**: ${data.tests?.passing || 0}/${data.tests?.total || 0} passing (${data.tests?.total > 0 ? Math.round((data.tests.passing / data.tests.total) * 100) : 0}%)
- **ESLint**: ${data.lint?.errors || 0} errors, ${data.lint?.warnings || 0} warnings
- **Git**: ${data.git?.branch || 'unknown'} branch, ${data.git?.uncommittedFiles?.length || 0} uncommitted files
- **Server**: ${data.server?.devServerRunning ? '✅ Running' : '❌ Stopped'} on port ${data.server?.port || 5173}

## 🔄 Recent Changes
${data.git?.uncommittedFiles?.slice(0, 5).map(file => `- ${file}`).join('\n') || 'No uncommitted changes'}

## 🎯 Recommendations
${data.recommendations?.map((rec, i) => `${i + 1}. ${rec}`).join('\n') || 'None'}

## 📝 Session Notes
${data.notes || 'No additional notes'}

---
*Generated at ${this.formatTimestamp()}*
`;
  }
}

export default ClaudeHelpers;