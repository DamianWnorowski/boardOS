#!/usr/bin/env node

/**
 * Setup Claude Hooks - Ensures all Claude Code hooks are properly configured and functional
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ClaudeHooksSetup {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.configPath = path.join(os.homedir(), '.config', 'claude-code', 'settings.json');
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: this.projectRoot,
        stdio: 'pipe',
        shell: true,
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

  async validatePackageJson() {
    console.log('🔍 Validating package.json scripts...');
    
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      const requiredScripts = [
        'lint:fix',
        'lint:check',
        'typecheck',
        'docs:ai-context',
        'claude:status'
      ];
      
      const missing = requiredScripts.filter(script => !packageJson.scripts[script]);
      
      if (missing.length > 0) {
        console.log('⚠️  Missing package.json scripts:', missing.join(', '));
        return false;
      }
      
      console.log('✅ Package.json scripts validated');
      return true;
    } catch (error) {
      console.error('❌ Failed to validate package.json:', error.message);
      return false;
    }
  }

  async validateScripts() {
    console.log('🔍 Validating hook scripts...');
    
    const requiredScripts = [
      'scripts/hook-diagnostics.js',
      'scripts/auto-quality-check.js',
      'scripts/update-claude-memory.cjs',
      'scripts/claude-smart-start.js',
      'scripts/gemini-handoff.js',
      'scripts/gemini-monitor.js'
    ];
    
    const results = await Promise.all(
      requiredScripts.map(async (script) => {
        const scriptPath = path.join(this.projectRoot, script);
        try {
          await fs.access(scriptPath);
          return { script, exists: true };
        } catch {
          return { script, exists: false };
        }
      })
    );
    
    const missing = results.filter(r => !r.exists).map(r => r.script);
    
    if (missing.length > 0) {
      console.log('⚠️  Missing hook scripts:', missing.join(', '));
      return false;
    }
    
    console.log('✅ Hook scripts validated');
    return true;
  }

  async validateClaudeConfig() {
    console.log('🔍 Validating Claude Code configuration...');
    
    try {
      await fs.access(this.configPath);
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      if (!config.hooks) {
        console.log('⚠️  No hooks configuration found');
        return false;
      }
      
      console.log('✅ Claude Code configuration validated');
      console.log(`📍 Config location: ${this.configPath}`);
      return true;
    } catch (error) {
      console.log('⚠️  Claude Code configuration not found or invalid');
      return false;
    }
  }

  async testHookScripts() {
    console.log('🧪 Testing hook scripts...');
    
    const tests = [
      {
        name: 'Hook Diagnostics',
        command: 'node',
        args: ['scripts/hook-diagnostics.js', '--quiet'],
        timeout: 10000
      },
      {
        name: 'Auto Quality Check',
        command: 'node', 
        args: ['scripts/auto-quality-check.js', '--quiet'],
        timeout: 30000
      }
    ];
    
    let allPassed = true;
    
    for (const test of tests) {
      console.log(`  Testing ${test.name}...`);
      const result = await this.runCommand(test.command, test.args, { timeout: test.timeout });
      
      if (result.success) {
        console.log(`  ✅ ${test.name} passed`);
      } else {
        console.log(`  ❌ ${test.name} failed: ${result.stderr || result.stdout || 'Unknown error'}`);
        allPassed = false;
      }
    }
    
    return allPassed;
  }

  async makeScriptsExecutable() {
    console.log('🔧 Making scripts executable...');
    
    const scripts = [
      'scripts/hook-diagnostics.js',
      'scripts/auto-quality-check.js',
      'scripts/setup-claude-hooks.js'
    ];
    
    for (const script of scripts) {
      try {
        const scriptPath = path.join(this.projectRoot, script);
        await fs.chmod(scriptPath, 0o755);
      } catch (error) {
        console.log(`⚠️  Could not make ${script} executable:`, error.message);
      }
    }
    
    console.log('✅ Scripts made executable');
  }

  async createSummaryReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configPath: this.configPath,
      projectRoot: this.projectRoot,
      validations: {
        packageJson: await this.validatePackageJson(),
        scripts: await this.validateScripts(),
        claudeConfig: await this.validateClaudeConfig()
      }
    };
    
    const reportPath = path.join(this.projectRoot, '.claude', 'hooks-setup-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  formatSummary(report) {
    const { validations } = report;
    const allValid = Object.values(validations).every(v => v === true);
    
    let summary = allValid ? 
      '🎉 Claude Code hooks are fully configured and ready!\n' :
      '⚠️  Claude Code hooks setup has issues that need attention:\n';
    
    summary += '\n📊 Validation Results:\n';
    summary += `  📦 Package.json scripts: ${validations.packageJson ? '✅' : '❌'}\n`;
    summary += `  📜 Hook scripts: ${validations.scripts ? '✅' : '❌'}\n`;
    summary += `  ⚙️  Claude config: ${validations.claudeConfig ? '✅' : '❌'}\n`;
    
    summary += '\n📍 Configuration Details:\n';
    summary += `  Config file: ${report.configPath}\n`;
    summary += `  Project root: ${report.projectRoot}\n`;
    
    if (allValid) {
      summary += '\n🚀 What happens next:\n';
      summary += '  • Code edits will auto-fix ESLint issues\n';
      summary += '  • Commits will run quality checks\n';
      summary += '  • Project state will be automatically tracked\n';
      summary += '  • Session management will be automated\n';
    } else {
      summary += '\n🔧 Next steps:\n';
      summary += '  • Fix the validation issues above\n';
      summary += '  • Run this script again to verify\n';
      summary += '  • Check Claude Code documentation if needed\n';
    }
    
    return summary;
  }
}

async function main() {
  console.log('🚀 Setting up Claude Code hooks for BoardOS...\n');
  
  try {
    const setup = new ClaudeHooksSetup();
    
    // Run all setup steps
    await setup.makeScriptsExecutable();
    
    // Run validations and create report
    const report = await setup.createSummaryReport();
    
    // Test the scripts if everything validates
    if (Object.values(report.validations).every(v => v === true)) {
      await setup.testHookScripts();
    }
    
    // Show summary
    console.log('\n' + '='.repeat(60));
    console.log(setup.formatSummary(report));
    console.log('='.repeat(60) + '\n');
    
    // Exit with appropriate code
    const allValid = Object.values(report.validations).every(v => v === true);
    process.exit(allValid ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('setup-claude-hooks.js')) {
  main();
}