#!/usr/bin/env node

/**
 * Claude Monitor - Token usage monitoring and early warning system
 * Triggers handoff at 80% capacity while Claude is still coherent
 */

import fs from 'fs/promises';
import ClaudeHelpers from './utils/claude-helpers.js';

class ClaudeMonitor {
  constructor(options = {}) {
    this.options = {
      tokenLimit: options.tokenLimit || 200000,
      warningThreshold: options.warningThreshold || 0.8, // 80%
      criticalThreshold: options.criticalThreshold || 0.95, // 95%
      verbose: options.verbose || false,
      ...options
    };
    
    this.contextPath = '.claude/current-context.json';
    this.monitorPath = '.claude/token-monitor.json';
    
    this.state = {
      sessionStart: new Date(),
      tokenEstimate: 0,
      lastWarning: null,
      handoffTriggered: false,
      conversationLength: 0
    };
  }

  /**
   * Initialize the monitor
   */
  async initialize() {
    this.log('🔍 Initializing Claude Monitor...');
    
    // Ensure .claude directory exists
    await ClaudeHelpers.ensureDir('.claude');
    
    // Load existing monitor state
    await this.loadMonitorState();
    
    this.log('✅ Monitor initialized');
  }

  /**
   * Load existing monitor state
   */
  async loadMonitorState() {
    try {
      if (await ClaudeHelpers.fileExists(this.monitorPath)) {
        const existing = await ClaudeHelpers.readJsonSafe(this.monitorPath);
        if (existing && this.isRecentSession(existing)) {
          this.state = { ...this.state, ...existing };
          this.log('📊 Loaded existing monitor state');
        }
      }
    } catch (error) {
      this.log(`⚠️ Could not load monitor state: ${error.message}`, 'warn');
    }
  }

  /**
   * Check if monitor session is recent (same day)
   */
  isRecentSession(state) {
    if (!state.sessionStart) return false;
    const sessionDate = new Date(state.sessionStart);
    const today = new Date();
    return sessionDate.toDateString() === today.toDateString();
  }

  /**
   * Estimate current token usage
   */
  async estimateTokenUsage() {
    try {
      // Method 1: From context manager
      const context = await this.loadContext();
      if (context?.session?.tokenEstimate) {
        return context.session.tokenEstimate;
      }
      
      // Method 2: Estimate from conversation length
      return this.estimateFromConversation();
      
    } catch (error) {
      this.log(`⚠️ Error estimating tokens: ${error.message}`, 'warn');
      return 0;
    }
  }

  /**
   * Load current context
   */
  async loadContext() {
    try {
      if (await ClaudeHelpers.fileExists(this.contextPath)) {
        return await ClaudeHelpers.readJsonSafe(this.contextPath);
      }
    } catch (error) {
      // Ignore errors, fall back to other methods
    }
    return null;
  }

  /**
   * Estimate tokens from conversation length
   */
  estimateFromConversation() {
    // Rough estimation based on time and typical conversation patterns
    const sessionMinutes = (Date.now() - new Date(this.state.sessionStart)) / (1000 * 60);
    
    // Average tokens per minute in active coding session
    const avgTokensPerMinute = 150;
    
    return Math.floor(sessionMinutes * avgTokensPerMinute);
  }

  /**
   * Update token estimate
   */
  async updateTokenEstimate(additionalTokens = 0) {
    const estimated = await this.estimateTokenUsage();
    this.state.tokenEstimate = estimated + additionalTokens;
    this.state.conversationLength++;
    
    await this.saveMonitorState();
    
    return this.state.tokenEstimate;
  }

  /**
   * Check token usage and trigger warnings/handoff
   */
  async checkTokenUsage() {
    const currentTokens = await this.updateTokenEstimate();
    const usage = currentTokens / this.options.tokenLimit;
    
    this.log(`📊 Token usage: ${currentTokens.toLocaleString()} / ${this.options.tokenLimit.toLocaleString()} (${Math.round(usage * 100)}%)`);
    
    // Critical threshold - force handoff
    if (usage >= this.options.criticalThreshold && !this.state.handoffTriggered) {
      return await this.triggerEmergencyHandoff(currentTokens, usage);
    }
    
    // Warning threshold - suggest handoff
    if (usage >= this.options.warningThreshold && !this.state.lastWarning) {
      return await this.triggerWarning(currentTokens, usage);
    }
    
    return {
      status: 'ok',
      usage,
      tokens: currentTokens,
      recommendation: usage > 0.7 ? 'Consider handoff soon' : 'Continue normally'
    };
  }

  /**
   * Trigger warning at 80% usage
   */
  async triggerWarning(tokens, usage) {
    this.state.lastWarning = new Date().toISOString();
    await this.saveMonitorState();
    
    const warning = {
      status: 'warning',
      usage,
      tokens,
      threshold: 'warning',
      message: `⚠️ Token usage at ${Math.round(usage * 100)}% - Consider handoff soon`,
      recommendation: 'Run `npm run claude:handoff` to create handoff',
      timeRemaining: this.estimateTimeRemaining(tokens)
    };
    
    this.log(warning.message, 'warn');
    
    // Save warning to file for Claude to see
    await this.saveWarning(warning);
    
    return warning;
  }

  /**
   * Trigger emergency handoff at 95% usage
   */
  async triggerEmergencyHandoff(tokens, usage) {
    this.state.handoffTriggered = true;
    await this.saveMonitorState();
    
    const handoff = {
      status: 'critical',
      usage,
      tokens,
      threshold: 'critical',
      message: `🚨 CRITICAL: Token usage at ${Math.round(usage * 100)}% - IMMEDIATE HANDOFF REQUIRED`,
      recommendation: 'STOP ALL WORK - Run `npm run claude:handoff` immediately',
      autoHandoff: true
    };
    
    this.log(handoff.message, 'error');
    
    // Save critical warning
    await this.saveWarning(handoff);
    
    // Try to auto-trigger handoff
    if (this.options.autoHandoff) {
      await this.autoTriggerHandoff();
    }
    
    return handoff;
  }

  /**
   * Auto-trigger handoff script
   */
  async autoTriggerHandoff() {
    try {
      this.log('🤖 Auto-triggering handoff...');
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      await execAsync('npm run claude:handoff');
      
      this.log('✅ Handoff triggered automatically');
      
    } catch (error) {
      this.log(`❌ Could not auto-trigger handoff: ${error.message}`, 'error');
    }
  }

  /**
   * Save warning to file for Claude to see
   */
  async saveWarning(warning) {
    const warningFile = '.claude/token-warning.json';
    await ClaudeHelpers.writeJsonSafe(warningFile, {
      ...warning,
      timestamp: new Date().toISOString(),
      sessionId: this.state.sessionId
    });
    
    // Also create human-readable warning
    const readableWarning = `# ⚠️ CLAUDE TOKEN WARNING

${warning.message}

**Usage**: ${Math.round(warning.usage * 100)}%
**Tokens**: ${warning.tokens.toLocaleString()} / ${this.options.tokenLimit.toLocaleString()}
**Recommendation**: ${warning.recommendation}
**Time**: ${new Date().toLocaleString()}

${warning.autoHandoff ? '**AUTOMATIC HANDOFF TRIGGERED**' : 'Run `npm run claude:handoff` when ready to handoff.'}
`;

    await fs.writeFile('.claude/token-warning.md', readableWarning);
  }

  /**
   * Estimate time remaining
   */
  estimateTimeRemaining(currentTokens) {
    const remaining = this.options.tokenLimit - currentTokens;
    const avgTokensPerMinute = 150;
    const minutesRemaining = remaining / avgTokensPerMinute;
    
    if (minutesRemaining < 5) return 'Less than 5 minutes';
    if (minutesRemaining < 15) return `About ${Math.round(minutesRemaining)} minutes`;
    if (minutesRemaining < 60) return `About ${Math.round(minutesRemaining / 5) * 5} minutes`;
    return `About ${Math.round(minutesRemaining / 60)} hour(s)`;
  }

  /**
   * Save monitor state
   */
  async saveMonitorState() {
    try {
      await ClaudeHelpers.writeJsonSafe(this.monitorPath, this.state);
    } catch (error) {
      this.log(`❌ Error saving monitor state: ${error.message}`, 'error');
    }
  }

  /**
   * Get current status
   */
  async getStatus() {
    const result = await this.checkTokenUsage();
    
    return {
      ...result,
      sessionDuration: this.getSessionDuration(),
      conversationLength: this.state.conversationLength,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Get session duration
   */
  getSessionDuration() {
    const duration = Date.now() - new Date(this.state.sessionStart);
    const minutes = Math.floor(duration / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Reset monitor state
   */
  async reset() {
    this.state = {
      sessionStart: new Date(),
      tokenEstimate: 0,
      lastWarning: null,
      handoffTriggered: false,
      conversationLength: 0
    };
    
    await this.saveMonitorState();
    
    // Clean up warning files
    try {
      await fs.unlink('.claude/token-warning.json').catch(() => {});
      await fs.unlink('.claude/token-warning.md').catch(() => {});
    } catch (error) {
      // Ignore cleanup errors
    }
    
    this.log('🔄 Monitor state reset');
  }

  /**
   * Log helper
   */
  log(message, level = 'info') {
    if (this.options.verbose || level === 'error' || level === 'warn') {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ${message}`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    autoHandoff: args.includes('--auto-handoff'),
    tokenLimit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1]) || 200000
  };
  
  const monitor = new ClaudeMonitor(options);
  
  try {
    await monitor.initialize();
    
    switch (command) {
      case 'check':
      case undefined:
        const status = await monitor.getStatus();
        console.log('📊 Claude Token Monitor Status');
        console.log('=' .repeat(40));
        console.log(`Status: ${status.status}`);
        console.log(`Usage: ${Math.round(status.usage * 100)}%`);
        console.log(`Tokens: ${status.tokens.toLocaleString()} / ${options.tokenLimit.toLocaleString()}`);
        console.log(`Session: ${status.sessionDuration}`);
        console.log(`Recommendation: ${status.recommendation}`);
        
        if (status.status === 'warning' || status.status === 'critical') {
          console.log('\n⚠️ WARNING: ' + status.message);
          console.log('💡 ' + status.recommendation);
        }
        break;
        
      case 'reset':
        await monitor.reset();
        console.log('✅ Token monitor reset');
        break;
        
      case 'watch':
        console.log('👁️ Monitoring token usage...');
        setInterval(async () => {
          await monitor.checkTokenUsage();
        }, 60000); // Check every minute
        
        process.stdin.resume();
        break;
        
      default:
        console.log('Usage:');
        console.log('  npm run claude:monitor          # Check current status');
        console.log('  npm run claude:monitor check    # Check current status');
        console.log('  npm run claude:monitor reset    # Reset monitor state');
        console.log('  npm run claude:monitor watch    # Watch continuously');
        console.log('');
        console.log('Options:');
        console.log('  --verbose                       # Verbose output');
        console.log('  --auto-handoff                  # Auto-trigger handoff at 95%');
        console.log('  --limit=N                       # Set token limit (default: 200000)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Check if running directly
if (process.argv[1] && process.argv[1].endsWith('claude-monitor.js')) {
  main();
}

export default ClaudeMonitor;