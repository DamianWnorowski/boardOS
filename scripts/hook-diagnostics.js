#!/usr/bin/env node

/**
 * Hook Diagnostics - Lightweight diagnostics for Claude hooks
 * Provides quick status updates without heavy processing
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class HookDiagnostics {
  async getProjectHealth() {
    const projectRoot = path.join(__dirname, '..');
    
    try {
      // Quick file system checks
      const [packageExists, tsconfigExists, eslintExists] = await Promise.all([
        this.fileExists(path.join(projectRoot, 'package.json')),
        this.fileExists(path.join(projectRoot, 'tsconfig.json')),
        this.fileExists(path.join(projectRoot, 'eslint.config.js'))
      ]);
      
      // Get git status
      const gitStatus = await this.getGitStatus();
      
      // Check if dev server is running
      const devServerRunning = await this.checkPort(5173);
      
      return {
        timestamp: new Date().toISOString(),
        files: { packageExists, tsconfigExists, eslintExists },
        git: gitStatus,
        devServer: devServerRunning,
        status: this.calculateOverallStatus({ packageExists, tsconfigExists, eslintExists, gitStatus, devServerRunning })
      };
      
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        status: 'error'
      };
    }
  }

  async fileExists(filepath) {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  async getGitStatus() {
    try {
      const result = await this.runCommand('git', ['status', '--porcelain']);
      const lines = result.stdout.trim().split('\n').filter(line => line.trim());
      
      return {
        clean: lines.length === 0,
        modified: lines.filter(line => line.startsWith(' M')).length,
        untracked: lines.filter(line => line.startsWith('??')).length,
        staged: lines.filter(line => line.startsWith('A ') || line.startsWith('M ')).length
      };
    } catch {
      return { clean: false, error: 'Git not available' };
    }
  }

  async checkPort(port) {
    try {
      const result = await this.runCommand('netstat', ['-ano'], { timeout: 5000 });
      return result.stdout.includes(`:${port}`);
    } catch {
      // Fallback for different platforms
      try {
        const result = await this.runCommand('lsof', [`-i:${port}`], { timeout: 5000 });
        return result.stdout.trim().length > 0;
      } catch {
        return false; // Cannot determine port status
      }
    }
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        shell: true,
        timeout: options.timeout || 5000
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => stdout += data.toString());
      child.stderr?.on('data', (data) => stderr += data.toString());

      child.on('close', (code) => {
        resolve({ code, stdout, stderr, success: code === 0 });
      });

      child.on('error', () => {
        resolve({ code: -1, stdout, stderr: 'Command failed', success: false });
      });
    });
  }

  calculateOverallStatus({ packageExists, tsconfigExists, eslintExists, gitStatus, devServerRunning }) {
    if (!packageExists || !tsconfigExists) return 'critical';
    if (!eslintExists) return 'warning';
    if (gitStatus.modified > 10 || gitStatus.untracked > 5) return 'warning';
    if (!devServerRunning) return 'info';
    return 'good';
  }

  formatStatus(health) {
    const icons = {
      good: '🟢',
      warning: '🟡',
      critical: '🔴',
      info: '🔵',
      error: '❌'
    };

    const icon = icons[health.status] || '❓';
    
    if (health.error) {
      return `${icon} Status: ERROR - ${health.error}`;
    }

    let output = `${icon} Project Health: ${health.status.toUpperCase()}\n`;
    
    if (health.git && !health.git.error) {
      const gitIcon = health.git.clean ? '🟢' : '🟡';
      output += `${gitIcon} Git: ${health.git.clean ? 'Clean' : `${health.git.modified}M ${health.git.untracked}U ${health.git.staged}S`}\n`;
    }
    
    const devIcon = health.devServer ? '🟢' : '🔴';
    output += `${devIcon} Dev Server: ${health.devServer ? 'Running' : 'Stopped'}\n`;
    
    return output.trim();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isQuiet = args.includes('--quiet');
  
  try {
    const diagnostics = new HookDiagnostics();
    const health = await diagnostics.getProjectHealth();
    
    if (!isQuiet) {
      console.log(diagnostics.formatStatus(health));
    }
    
    // Save for reference
    const healthPath = path.join(__dirname, '..', '.claude', 'hook-health.json');
    await fs.mkdir(path.dirname(healthPath), { recursive: true });
    await fs.writeFile(healthPath, JSON.stringify(health, null, 2));
    
  } catch (error) {
    console.error('❌ Diagnostics failed:', error.message);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('hook-diagnostics.js')) {
  main();
}

export { HookDiagnostics };