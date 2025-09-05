#!/usr/bin/env node

/**
 * Auto Quality Check - Comprehensive validation script for Claude hooks
 * Runs lightweight validation checks without full test suite
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class AutoQualityCheck {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        shell: true,
        timeout: options.timeout || 15000,
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => stdout += data.toString());
      child.stderr?.on('data', (data) => stderr += data.toString());

      child.on('close', (code) => {
        resolve({ code, stdout, stderr, success: code === 0 });
      });

      child.on('error', (error) => {
        resolve({ code: -1, stdout, stderr: error.message, success: false });
      });
    });
  }

  async checkLint() {
    const result = await this.runCommand('npx', ['eslint', '.', '--format', 'json'], { timeout: 20000 });
    
    if (result.success && result.stdout) {
      try {
        const lintResults = JSON.parse(result.stdout);
        const totalErrors = lintResults.reduce((sum, file) => sum + file.errorCount, 0);
        const totalWarnings = lintResults.reduce((sum, file) => sum + file.warningCount, 0);
        
        if (totalErrors > 0) {
          this.errors.push(`${totalErrors} ESLint errors found`);
        }
        if (totalWarnings > 5) {
          this.warnings.push(`${totalWarnings} ESLint warnings found`);
        }
        
        return { errors: totalErrors, warnings: totalWarnings };
      } catch (e) {
        this.warnings.push('Could not parse ESLint results');
        return { errors: 0, warnings: 0 };
      }
    }
    
    return { errors: 0, warnings: 0 };
  }

  async checkTypes() {
    const result = await this.runCommand('npx', ['tsc', '--noEmit'], { timeout: 30000 });
    
    if (!result.success && result.stderr) {
      const typeErrors = (result.stderr.match(/error TS/g) || []).length;
      if (typeErrors > 0) {
        this.errors.push(`${typeErrors} TypeScript errors found`);
      }
      return { errors: typeErrors };
    }
    
    return { errors: 0 };
  }

  async quickTestCheck() {
    // Only run a few quick tests to validate core functionality
    const result = await this.runCommand('npx', ['vitest', 'run', '--reporter=json', '--run', '--bail', '3'], { timeout: 15000 });
    
    if (result.stdout) {
      try {
        const testResults = JSON.parse(result.stdout);
        const failed = testResults.numFailedTests || 0;
        const passed = testResults.numPassedTests || 0;
        
        if (failed > 0) {
          this.errors.push(`${failed} tests failing`);
        }
        
        return { passed, failed };
      } catch (e) {
        // If tests are completely broken, it's an error
        this.errors.push('Tests cannot run - check test environment');
        return { passed: 0, failed: 1 };
      }
    }
    
    return { passed: 0, failed: 0 };
  }

  formatOutput() {
    let output = '';
    
    if (this.errors.length > 0) {
      output += '❌ ERRORS:\n';
      this.errors.forEach(error => output += `  - ${error}\n`);
    }
    
    if (this.warnings.length > 0) {
      output += '⚠️  WARNINGS:\n';
      this.warnings.forEach(warning => output += `  - ${warning}\n`);
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      output += '✅ Quality check passed\n';
    }
    
    return output.trim();
  }

  hasErrors() {
    return this.errors.length > 0;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isVerbose = args.includes('--verbose');
  const isQuiet = args.includes('--quiet');
  
  const checker = new AutoQualityCheck();
  
  try {
    if (isVerbose) console.log('🔍 Running quality checks...');
    
    // Run checks in parallel for speed
    const [lintResult, typeResult, testResult] = await Promise.all([
      checker.checkLint(),
      checker.checkTypes(),
      checker.quickTestCheck()
    ]);
    
    if (isVerbose) {
      console.log(`📝 Lint: ${lintResult.errors} errors, ${lintResult.warnings} warnings`);
      console.log(`🔧 Types: ${typeResult.errors} errors`);
      console.log(`🧪 Tests: ${testResult.passed} passed, ${testResult.failed} failed`);
    }
    
    if (!isQuiet) {
      console.log(checker.formatOutput());
    }
    
    // Exit with error code if there are errors
    process.exit(checker.hasErrors() ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Quality check failed:', error.message);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('auto-quality-check.js')) {
  main();
}

export { AutoQualityCheck };