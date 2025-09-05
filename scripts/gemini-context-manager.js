#!/usr/bin/env node

/**
 * Gemini Context Manager - Real-time context tracking for Gemini sessions
 * Automatically captures and maintains context during active development
 */

import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import { exec } from 'child_process';
import { promisify } from 'util';
import GeminiHelpers from './utils/gemini-helpers.js';

const execAsync = promisify(exec);

class GeminiContextManager {
  constructor(options = {}) {
    this.options = {
      watch: options.watch || false,
      verbose: options.verbose || false,
      autoUpdate: options.autoUpdate !== false,
      ...options
    };
    
    this.contextPath = '.gemini/current-context.json';
    this.geminiMdPath = 'CLAUDE.md';
    this.sessionId = GeminiHelpers.generateSessionId();
    this.startTime = new Date();
    this.autoSaveInterval = null;
    
    // Real-time context accumulator
    this.context = {
      session: {
        id: this.sessionId,
        startTime: this.startTime.toISOString(),
        lastUpdate: null,
        tokenEstimate: 0
      },
      activeWork: {
        currentTask: null,
        files: [],
        decisions: [],
        blockers: [],
        progress: []
      },
      memory: {
        keyDecisions: [],
        userPreferences: [],
        codePatterns: [],
        fixedIssues: []
      },
      metrics: {
        filesModified: 0,
        testsFixed: 0,
        lintErrorsResolved: 0,
        commitsCreated: 0
      },
      environment: {
        gitBranch: null,
        devServerStatus: false,
        testStatus: { passing: 0, failing: 0 },
        lintStatus: { errors: 0, warnings: 0 }
      }
    };
    
    // File watchers
    this.watchers = {
      src: null,
      tests: null,
      git: null
    };
  }

  /**
   * Initialize the context manager
   */
  async initialize() {
    this.log('🚀 Initializing Gemini Context Manager...');
    
    // Ensure .gemini directory exists
    await GeminiHelpers.ensureDir('.gemini');
    
    // Load existing context if available
    await this.loadExistingContext();
    
    // Get initial environment state
    await this.updateEnvironmentState();
    
    // Set up watchers if in watch mode
    if (this.options.watch) {
      await this.setupWatchers();
    }
    
    // Set up periodic saves only in watch mode
    if (this.options.watch) {
      this.startAutoSave();
    }
    
    this.log('✅ Context Manager initialized');
  }

  /**
   * Load existing context from previous session
   */
  async loadExistingContext() {
    try {
      if (await GeminiHelpers.fileExists(this.contextPath)) {
        const existing = await GeminiHelpers.readJsonSafe(this.contextPath);
        if (existing && this.isRecentContext(existing)) {
          this.log('📚 Loading existing context from previous session');
          
          // Merge with current context, keeping recent decisions
          this.context.memory = {
            ...this.context.memory,
            keyDecisions: [...(existing.memory?.keyDecisions || [])].slice(-20),
            userPreferences: [...(existing.memory?.userPreferences || [])].slice(-10),
            codePatterns: [...(existing.memory?.codePatterns || [])].slice(-15)
          };
          
          // Keep active work if session is recent (< 2 hours)
          const hoursSinceUpdate = (Date.now() - new Date(existing.session?.lastUpdate || 0)) / (1000 * 60 * 60);
          if (hoursSinceUpdate < 2) {
            this.context.activeWork = existing.activeWork || this.context.activeWork;
          }
        }
      }
    } catch (error) {
      this.log(`⚠️ Could not load existing context: ${error.message}`, 'warn');
    }
  }

  /**
   * Check if context is recent enough to use
   */
  isRecentContext(context) {
    if (!context?.session?.lastUpdate) return false;
    const daysSinceUpdate = (Date.now() - new Date(context.session.lastUpdate)) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate < 7; // Use context from last week
  }

  /**
   * Update current environment state
   */
  async updateEnvironmentState() {
    try {
      // Git status
      const gitBranch = await GeminiHelpers.execSafe('git branch --show-current');
      this.context.environment.gitBranch = gitBranch.stdout?.trim() || 'unknown';
      
      // Test status
      const testStatus = await GeminiHelpers.getTestStatus();
      this.context.environment.testStatus = {
        passing: testStatus.passing,
        failing: testStatus.failing
      };
      
      // Lint status
      const lintStatus = await GeminiHelpers.getLintStatus();
      this.context.environment.lintStatus = {
        errors: lintStatus.errors,
        warnings: lintStatus.warnings
      };
      
      // Dev server status
      const serverStatus = await GeminiHelpers.getServerStatus();
      this.context.environment.devServerStatus = serverStatus.devServerRunning;
      
    } catch (error) {
      this.log(`⚠️ Error updating environment state: ${error.message}`, 'warn');
    }
  }

  /**
   * Set up file watchers for real-time tracking
   */
  async setupWatchers() {
    this.log('👁️ Setting up file watchers...');
    
    // Watch source files
    this.watchers.src = chokidar.watch('src/**/*.{ts,tsx,js,jsx}', {
      ignored: /node_modules|\.test\.|\.spec\./,
      persistent: true
    });
    
    this.watchers.src
      .on('change', (path) => this.handleFileChange(path))
      .on('add', (path) => this.handleFileAdd(path));
    
    // Watch test results
    this.watchers.tests = chokidar.watch('**/*.{test,spec}.{ts,tsx,js,jsx}', {
      ignored: /node_modules/,
      persistent: true
    });
    
    this.watchers.tests.on('change', () => this.updateTestMetrics());
    
    // Watch git changes
    this.watchers.git = chokidar.watch('.git/HEAD', {
      persistent: true
    });
    
    this.watchers.git.on('change', () => this.handleGitChange());
    
    this.log('✅ Watchers configured');
  }

  /**
   * Handle file changes
   */
  async handleFileChange(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Track file in active work
    if (!this.context.activeWork.files.includes(relativePath)) {
      this.context.activeWork.files.push(relativePath);
      if (this.context.activeWork.files.length > 20) {
        this.context.activeWork.files.shift(); // Keep last 20 files
      }
    }
    
    // Update metrics
    this.context.metrics.filesModified++;
    
    // Try to infer what's being worked on
    await this.inferTaskFromFile(filePath);
    
    // Update context
    await this.saveContext();
    
    this.log(`📝 File changed: ${relativePath}`);
  }

  /**
   * Handle new file creation
   */
  async handleFileAdd(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Record new file creation as a decision
    this.addDecision(`Created new file: ${relativePath}`);
    
    this.log(`✨ File created: ${relativePath}`);
  }

  /**
   * Handle git changes (commits, branch switches)
   */
  async handleGitChange() {
    const prevBranch = this.context.environment.gitBranch;
    await this.updateEnvironmentState();
    
    if (prevBranch !== this.context.environment.gitBranch) {
      this.addDecision(`Switched from branch ${prevBranch} to ${this.context.environment.gitBranch}`);
    }
    
    // Check for new commits
    const lastCommit = await GeminiHelpers.execSafe('git log -1 --oneline');
    if (lastCommit.stdout) {
      this.context.metrics.commitsCreated++;
      this.addProgress(`Commit: ${lastCommit.stdout.trim()}`);
    }
    
    await this.saveContext();
  }

  /**
   * Update test metrics
   */
  async updateTestMetrics() {
    const prevFailing = this.context.environment.testStatus.failing;
    await this.updateEnvironmentState();
    
    const failingDiff = prevFailing - this.context.environment.testStatus.failing;
    if (failingDiff > 0) {
      this.context.metrics.testsFixed += failingDiff;
      this.addProgress(`Fixed ${failingDiff} test(s)`);
    }
    
    await this.saveContext();
  }

  /**
   * Infer current task from file changes
   */
  async inferTaskFromFile(filePath) {
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);
    
    // Infer based on file patterns
    if (fileName.includes('test') || fileName.includes('spec')) {
      this.updateCurrentTask('Fixing test failures');
    } else if (dirName.includes('components')) {
      this.updateCurrentTask('Working on UI components');
    } else if (dirName.includes('services')) {
      this.updateCurrentTask('Updating service layer');
    } else if (fileName.includes('migration')) {
      this.updateCurrentTask('Database migration work');
    } else if (dirName.includes('utils')) {
      this.updateCurrentTask('Updating utility functions');
    }
  }

  /**
   * Update current task
   */
  updateCurrentTask(task) {
    if (this.context.activeWork.currentTask !== task) {
      this.context.activeWork.currentTask = task;
      this.log(`🎯 Current task: ${task}`);
    }
  }

  /**
   * Add a decision to memory
   */
  addDecision(decision, priority = 'normal') {
    const timestamped = {
      decision,
      timestamp: new Date().toISOString(),
      priority
    };
    
    this.context.memory.keyDecisions.push(timestamped);
    
    // Keep last 20 decisions
    if (this.context.memory.keyDecisions.length > 20) {
      this.context.memory.keyDecisions.shift();
    }
    
    // Also update CLAUDE.md if autoUpdate is enabled
    if (this.options.autoUpdate) {
      this.updateGeminiMd('DECISION', decision);
    }
  }

  /**
   * Add progress item
   */
  addProgress(item) {
    this.context.activeWork.progress.push({
      item,
      timestamp: new Date().toISOString()
    });
    
    // Keep last 15 progress items
    if (this.context.activeWork.progress.length > 15) {
      this.context.activeWork.progress.shift();
    }
  }

  /**
   * Add a user preference
   */
  addPreference(preference) {
    if (!this.context.memory.userPreferences.includes(preference)) {
      this.context.memory.userPreferences.push(preference);
      
      if (this.options.autoUpdate) {
        this.updateGeminiMd('PREFERENCE', preference);
      }
    }
  }

  /**
   * Add a fixed issue
   */
  addFixedIssue(file, line, description) {
    const fixed = {
      file,
      line,
      description,
      timestamp: new Date().toISOString()
    };
    
    this.context.memory.fixedIssues.push(fixed);
    
    if (this.options.autoUpdate) {
      this.updateGeminiMd('FIXED', `${file}:${line} - ${description}`);
    }
  }

  /**
   * Update CLAUDE.md with new markers
   */
  async updateGeminiMd(type, content) {
    try {
      const exists = await GeminiHelpers.fileExists(this.geminiMdPath);
      if (!exists) return;
      
      const currentContent = await fs.readFile(this.geminiMdPath, 'utf-8');
      const timestamp = new Date().toISOString().split('T')[0];
      const marker = `\n# ${type}: [${timestamp}] ${content}`;
      
      // Add marker to appropriate section or at end
      const updatedContent = currentContent + marker;
      await fs.writeFile(this.geminiMdPath, updatedContent);
      
    } catch (error) {
      this.log(`⚠️ Could not update CLAUDE.md: ${error.message}`, 'warn');
    }
  }

  /**
   * Save context to file
   */
  async saveContext() {
    this.context.session.lastUpdate = new Date().toISOString();
    this.context.session.tokenEstimate = this.estimateTokens();
    
    try {
      await GeminiHelpers.writeJsonSafe(this.contextPath, this.context);
      
      // Also create a markdown summary
      await this.saveMarkdownSummary();
      
    } catch (error) {
      this.log(`❌ Error saving context: ${error.message}`, 'error');
    }
  }

  /**
   * Save markdown summary for human readability
   */
  async saveMarkdownSummary() {
    const summary = `# Gemini Context - Live Session
Last Updated: ${new Date().toLocaleString()}

## Active Work
- **Current Task**: ${this.context.activeWork.currentTask || 'Not specified'}
- **Files**: ${this.context.activeWork.files.slice(-5).join(', ')}
- **Progress**: ${this.context.activeWork.progress.length} items completed

## Environment
- **Branch**: ${this.context.environment.gitBranch}
- **Tests**: ${this.context.environment.testStatus.passing} passing, ${this.context.environment.testStatus.failing} failing
- **Lint**: ${this.context.environment.lintStatus.errors} errors
- **Dev Server**: ${this.context.environment.devServerStatus ? 'Running' : 'Stopped'}

## Metrics This Session
- Files Modified: ${this.context.metrics.filesModified}
- Tests Fixed: ${this.context.metrics.testsFixed}
- Commits Created: ${this.context.metrics.commitsCreated}

## Recent Decisions
${this.context.memory.keyDecisions.slice(-5).map(d => `- ${d.decision}`).join('\n')}
`;

    await fs.writeFile('.gemini/current-context.md', summary);
  }

  /**
   * Estimate token usage
   */
  estimateTokens() {
    // Rough estimation: ~4 characters per token
    const contextString = JSON.stringify(this.context);
    return Math.floor(contextString.length / 4);
  }

  /**
   * Start auto-save timer
   */
  startAutoSave() {
    this.autoSaveInterval = setInterval(async () => {
      await this.saveContext();
      this.log('💾 Context auto-saved');
    }, 60000); // Save every minute
  }

  /**
   * Log helper
   */
  log(message, level = 'info') {
    if (this.options.verbose || level === 'error') {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ${message}`);
    }
  }

  /**
   * Clean up and exit
   */
  async cleanup() {
    this.log('🧹 Cleaning up...');
    
    // Clear auto-save interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    // Close watchers
    if (this.watchers.src) await this.watchers.src.close();
    if (this.watchers.tests) await this.watchers.tests.close();
    if (this.watchers.git) await this.watchers.git.close();
    
    // Final save
    await this.saveContext();
    
    this.log('👋 Context Manager stopped');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    watch: args.includes('--watch') || args.includes('-w'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    autoUpdate: !args.includes('--no-update')
  };
  
  const manager = new GeminiContextManager(options);
  
  try {
    await manager.initialize();
    
    if (options.watch) {
      this.log('🎯 AI Context Manager running in watch mode');
      console.log('   Press Ctrl+C to stop\n');
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        await manager.cleanup();
        process.exit(0);
      });
      
      // Keep process alive
      process.stdin.resume();
    } else {
      // One-time context capture
      await manager.saveContext();
      console.log('✅ Context captured successfully');
      console.log(`📄 Saved to: ${manager.contextPath}`);
      
      // Clean exit for one-time capture
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Check if running directly
if (process.argv[1] && process.argv[1].endsWith('gemini-context-manager.js')) {
  main();
}

export default GeminiContextManager;