#!/usr/bin/env node

/**
 * Claude Bridge - Session continuity and context verification
 * Creates seamless transitions between Claude sessions with real context
 */

import fs from 'fs/promises';
import ClaudeHelpers from './utils/claude-helpers.js';

class ClaudeBridge {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      verify: options.verify !== false,
      update: options.update !== false,
      ...options
    };
    
    this.contextPath = '.claude/current-context.json';
    this.bridgePath = '.claude/bridge-data.json';
    this.sessionId = ClaudeHelpers.generateSessionId();
    this.timestamp = new Date().toISOString();
  }

  /**
   * Initialize the bridge for a new session
   */
  async initialize() {
    this.log('🌉 Initializing Claude Bridge...');
    
    // Ensure .claude directory exists
    await ClaudeHelpers.ensureDir('.claude');
    
    this.log('✅ Bridge initialized');
  }

  /**
   * Load and verify context from previous session
   */
  async loadPreviousContext() {
    this.log('📚 Loading previous session context...');
    
    try {
      // Try to load from multiple sources
      const sources = await this.loadContextSources();
      
      // Verify and merge contexts
      const verifiedContext = await this.verifyContext(sources);
      
      // Create bridge data for new session
      const bridgeData = await this.createBridgeData(verifiedContext, sources);
      
      // Save bridge data
      await this.saveBridgeData(bridgeData);
      
      return bridgeData;
      
    } catch (error) {
      this.log(`❌ Error loading previous context: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Load context from multiple sources
   */
  async loadContextSources() {
    const sources = {
      realTime: null,
      handoff: null,
      memory: null,
      git: null
    };
    
    // Real-time context from context manager
    try {
      if (await ClaudeHelpers.fileExists(this.contextPath)) {
        sources.realTime = await ClaudeHelpers.readJsonSafe(this.contextPath);
        this.log('✅ Loaded real-time context');
      }
    } catch (error) {
      this.log('⚠️ Could not load real-time context', 'warn');
    }
    
    // Handoff context (if exists)
    try {
      if (await ClaudeHelpers.fileExists('CLAUDE_HANDOFF.json')) {
        sources.handoff = await ClaudeHelpers.readJsonSafe('CLAUDE_HANDOFF.json');
        this.log('✅ Loaded handoff context');
      }
    } catch (error) {
      this.log('⚠️ Could not load handoff context', 'warn');
    }
    
    // Memory from CLAUDE.md
    try {
      if (await ClaudeHelpers.fileExists('CLAUDE.md')) {
        sources.memory = await this.parseClaudeMdMemory();
        this.log('✅ Loaded CLAUDE.md memory');
      }
    } catch (error) {
      this.log('⚠️ Could not parse CLAUDE.md memory', 'warn');
    }
    
    // Git context
    try {
      sources.git = await this.extractGitContext();
      this.log('✅ Extracted git context');
    } catch (error) {
      this.log('⚠️ Could not extract git context', 'warn');
    }
    
    return sources;
  }

  /**
   * Parse memory markers from CLAUDE.md
   */
  async parseClaudeMdMemory() {
    const content = await fs.readFile('CLAUDE.md', 'utf-8');
    const lines = content.split('\n');
    
    const memory = {
      decisions: [],
      preferences: [],
      fixedIssues: [],
      currentTask: null,
      knownIssues: [],
      architecture: []
    };
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('# DECISION:')) {
        memory.decisions.push(this.parseMemoryLine(trimmed, 'DECISION:'));
      } else if (trimmed.startsWith('# PREFERENCE:')) {
        memory.preferences.push(this.parseMemoryLine(trimmed, 'PREFERENCE:'));
      } else if (trimmed.startsWith('# FIXED:')) {
        memory.fixedIssues.push(this.parseMemoryLine(trimmed, 'FIXED:'));
      } else if (trimmed.startsWith('# CURRENT_TASK:')) {
        memory.currentTask = this.parseMemoryLine(trimmed, 'CURRENT_TASK:');
      } else if (trimmed.startsWith('# KNOWN_ISSUE:')) {
        memory.knownIssues.push(this.parseMemoryLine(trimmed, 'KNOWN_ISSUE:'));
      } else if (trimmed.startsWith('# ARCHITECTURE:')) {
        memory.architecture.push(this.parseMemoryLine(trimmed, 'ARCHITECTURE:'));
      }
    }
    
    return memory;
  }

  /**
   * Parse individual memory line
   */
  parseMemoryLine(line, prefix) {
    const content = line.substring(prefix.length + 1).trim();
    
    // Try to extract timestamp if present
    const timestampMatch = content.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (timestampMatch) {
      return {
        content: timestampMatch[2],
        timestamp: timestampMatch[1],
        raw: line
      };
    }
    
    return {
      content,
      timestamp: null,
      raw: line
    };
  }

  /**
   * Extract current git context
   */
  async extractGitContext() {
    const git = await ClaudeHelpers.getGitStatus();
    
    // Get recent commits for context
    const recentCommits = await ClaudeHelpers.execSafe('git log --oneline -10');
    const recentChanges = await ClaudeHelpers.execSafe('git diff --name-only HEAD~5..HEAD');
    
    return {
      ...git,
      recentCommits: recentCommits.stdout ? recentCommits.stdout.split('\n').filter(c => c) : [],
      recentChanges: recentChanges.stdout ? recentChanges.stdout.split('\n').filter(c => c) : []
    };
  }

  /**
   * Verify context integrity and consistency
   */
  async verifyContext(sources) {
    this.log('🔍 Verifying context integrity...');
    
    const verification = {
      realTimeValid: this.verifyRealTimeContext(sources.realTime),
      handoffValid: this.verifyHandoffContext(sources.handoff),
      memoryValid: this.verifyMemoryContext(sources.memory),
      gitValid: this.verifyGitContext(sources.git),
      consistency: {}
    };
    
    // Cross-verify consistency
    verification.consistency = this.checkConsistency(sources);
    
    // Create verified context
    const verified = this.mergeVerifiedContext(sources, verification);
    
    this.log(`✅ Context verification complete - ${this.getVerificationSummary(verification)}`);
    
    return { verified, verification, sources };
  }

  /**
   * Verify real-time context
   */
  verifyRealTimeContext(context) {
    if (!context) return { valid: false, reason: 'No real-time context found' };
    
    const checks = {
      hasSession: !!context.session,
      hasActiveWork: !!context.activeWork,
      hasEnvironment: !!context.environment,
      recentUpdate: context.session?.lastUpdate && this.isRecentUpdate(context.session.lastUpdate)
    };
    
    const valid = Object.values(checks).every(check => check);
    
    return {
      valid,
      checks,
      age: context.session?.lastUpdate ? this.getAge(context.session.lastUpdate) : 'unknown'
    };
  }

  /**
   * Verify handoff context
   */
  verifyHandoffContext(context) {
    if (!context) return { valid: false, reason: 'No handoff context found' };
    
    const checks = {
      hasActiveTask: !!context.activeTask,
      hasCurrentState: !!context.currentState,
      hasContinuationPlan: !!context.continuationPlan,
      recentHandoff: this.isRecentUpdate(context.timestamp)
    };
    
    const valid = Object.values(checks).every(check => check);
    
    return {
      valid,
      checks,
      age: this.getAge(context.timestamp)
    };
  }

  /**
   * Verify memory context
   */
  verifyMemoryContext(memory) {
    if (!memory) return { valid: false, reason: 'No memory context found' };
    
    const checks = {
      hasDecisions: memory.decisions && memory.decisions.length > 0,
      hasPreferences: memory.preferences && memory.preferences.length > 0,
      hasArchitecture: memory.architecture && memory.architecture.length > 0
    };
    
    return {
      valid: Object.values(checks).some(check => check), // At least one type of memory
      checks,
      counts: {
        decisions: memory.decisions?.length || 0,
        preferences: memory.preferences?.length || 0,
        fixedIssues: memory.fixedIssues?.length || 0
      }
    };
  }

  /**
   * Verify git context
   */
  verifyGitContext(git) {
    if (!git) return { valid: false, reason: 'No git context found' };
    
    return {
      valid: true,
      branch: git.branch,
      uncommitted: git.uncommittedFiles?.length || 0,
      lastCommit: git.lastCommit
    };
  }

  /**
   * Check consistency between sources
   */
  checkConsistency(sources) {
    const consistency = {
      taskAlignment: false,
      fileAlignment: false,
      timeAlignment: false,
      conflicts: []
    };
    
    // Check task alignment
    const tasks = [
      sources.realTime?.activeWork?.currentTask,
      sources.handoff?.activeTask?.description,
      sources.memory?.currentTask?.content
    ].filter(t => t);
    
    if (tasks.length > 1) {
      consistency.taskAlignment = this.areTasksSimilar(tasks);
      if (!consistency.taskAlignment) {
        consistency.conflicts.push('Tasks from different sources don\'t align');
      }
    }
    
    // Check file alignment
    const files = [
      ...(sources.realTime?.activeWork?.files || []),
      ...(sources.handoff?.codeContext?.modifiedFiles || []),
      ...(sources.git?.uncommittedFiles || [])
    ];
    
    consistency.fileAlignment = files.length > 0;
    
    return consistency;
  }

  /**
   * Check if tasks are similar
   */
  areTasksSimilar(tasks) {
    // Simple similarity check - could be more sophisticated
    const keywords = tasks.flatMap(task => 
      task.toLowerCase().split(/\s+/).filter(word => word.length > 3)
    );
    
    const uniqueKeywords = [...new Set(keywords)];
    return uniqueKeywords.length < keywords.length * 0.8; // 80% overlap threshold
  }

  /**
   * Merge verified context
   */
  mergeVerifiedContext(sources, verification) {
    const merged = {
      session: {
        id: this.sessionId,
        timestamp: this.timestamp,
        previousSources: Object.keys(sources).filter(key => sources[key])
      },
      activeWork: this.mergeActiveWork(sources),
      memory: this.mergeMemory(sources),
      environment: this.mergeEnvironment(sources),
      verification: verification
    };
    
    return merged;
  }

  /**
   * Merge active work from sources
   */
  mergeActiveWork(sources) {
    const work = {
      currentTask: null,
      files: [],
      progress: [],
      blockers: []
    };
    
    // Get current task (priority: memory > handoff > real-time)
    work.currentTask = 
      sources.memory?.currentTask?.content ||
      sources.handoff?.activeTask?.description ||
      sources.realTime?.activeWork?.currentTask ||
      'No active task identified';
    
    // Merge files from all sources
    const allFiles = [
      ...(sources.realTime?.activeWork?.files || []),
      ...(sources.handoff?.codeContext?.modifiedFiles || []),
      ...(sources.git?.uncommittedFiles || [])
    ];
    
    work.files = [...new Set(allFiles)].slice(-10); // Keep last 10 unique files
    
    // Merge progress
    work.progress = [
      ...(sources.realTime?.activeWork?.progress || []),
      ...(sources.handoff?.sessionProgress?.completed?.map(item => ({ item, timestamp: sources.handoff.timestamp })) || [])
    ].slice(-15); // Keep last 15 items
    
    return work;
  }

  /**
   * Merge memory from sources
   */
  mergeMemory(sources) {
    return {
      decisions: [
        ...(sources.memory?.decisions || []),
        ...(sources.realTime?.memory?.keyDecisions || [])
      ].slice(-20),
      
      preferences: [
        ...(sources.memory?.preferences || []),
        ...(sources.realTime?.memory?.userPreferences || [])
      ].slice(-10),
      
      fixedIssues: [
        ...(sources.memory?.fixedIssues || []),
        ...(sources.realTime?.memory?.fixedIssues || [])
      ].slice(-15),
      
      architecture: sources.memory?.architecture || []
    };
  }

  /**
   * Merge environment from sources
   */
  mergeEnvironment(sources) {
    return {
      git: sources.git,
      currentState: sources.handoff?.currentState || sources.realTime?.environment,
      lastUpdate: this.timestamp
    };
  }

  /**
   * Create bridge data for new session
   */
  async createBridgeData(verifiedContext, sources) {
    const bridgeData = {
      bridgeId: this.sessionId,
      timestamp: this.timestamp,
      sourceAnalysis: this.analyzeSources(sources),
      context: verifiedContext.verified,
      verification: verifiedContext.verification,
      recommendations: this.generateRecommendations(verifiedContext),
      nextActions: await this.identifyNextActions(verifiedContext),
      continuityScore: this.calculateContinuityScore(verifiedContext)
    };
    
    return bridgeData;
  }

  /**
   * Analyze available sources
   */
  analyzeSources(sources) {
    return {
      available: Object.keys(sources).filter(key => sources[key]),
      quality: {
        realTime: sources.realTime ? this.assessContextQuality(sources.realTime) : null,
        handoff: sources.handoff ? this.assessContextQuality(sources.handoff) : null,
        memory: sources.memory ? this.assessMemoryQuality(sources.memory) : null
      },
      freshness: {
        realTime: sources.realTime?.session?.lastUpdate ? this.getAge(sources.realTime.session.lastUpdate) : null,
        handoff: sources.handoff?.timestamp ? this.getAge(sources.handoff.timestamp) : null
      }
    };
  }

  /**
   * Assess context quality
   */
  assessContextQuality(context) {
    let score = 0;
    
    // Check completeness
    if (context.session || context.sessionId) score += 20;
    if (context.activeWork || context.activeTask) score += 30;
    if (context.memory || context.conversationContext) score += 25;
    if (context.environment || context.currentState) score += 25;
    
    return {
      score,
      quality: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low'
    };
  }

  /**
   * Assess memory quality
   */
  assessMemoryQuality(memory) {
    const counts = {
      decisions: memory.decisions?.length || 0,
      preferences: memory.preferences?.length || 0,
      fixedIssues: memory.fixedIssues?.length || 0,
      architecture: memory.architecture?.length || 0
    };
    
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    return {
      counts,
      total,
      quality: total >= 10 ? 'high' : total >= 5 ? 'medium' : 'low'
    };
  }

  /**
   * Generate recommendations for new session
   */
  generateRecommendations(verifiedContext) {
    const recommendations = [];
    const verification = verifiedContext.verification;
    
    // Context quality recommendations
    if (!verification.realTimeValid.valid) {
      recommendations.push({
        type: 'context',
        priority: 'medium',
        message: 'Consider starting context manager for real-time tracking'
      });
    }
    
    if (!verification.memoryValid.valid) {
      recommendations.push({
        type: 'memory',
        priority: 'low',
        message: 'Add memory markers to CLAUDE.md for better continuity'
      });
    }
    
    // Consistency recommendations
    if (verification.consistency.conflicts.length > 0) {
      recommendations.push({
        type: 'consistency',
        priority: 'high',
        message: `Resolve context conflicts: ${verification.consistency.conflicts.join(', ')}`
      });
    }
    
    return recommendations;
  }

  /**
   * Identify next actions
   */
  async identifyNextActions(verifiedContext) {
    const actions = [];
    const context = verifiedContext.verified;
    
    // Get current environment state
    const testStatus = await ClaudeHelpers.getTestStatus();
    const lintStatus = await ClaudeHelpers.getLintStatus();
    
    // Priority actions based on context
    if (testStatus.failing > 0) {
      actions.push({
        action: `Fix ${testStatus.failing} failing tests`,
        priority: 'high',
        command: 'npm test -- --run',
        reason: 'Test failures affect development stability'
      });
    }
    
    if (context.activeWork?.currentTask) {
      actions.push({
        action: `Continue: ${context.activeWork.currentTask}`,
        priority: 'high',
        reason: 'Resume previous active work'
      });
    }
    
    if (lintStatus.errors > 50) {
      actions.push({
        action: `Address ${lintStatus.errors} lint errors`,
        priority: 'medium',
        command: 'npm run lint',
        reason: 'High lint error count affects code quality'
      });
    }
    
    return actions.slice(0, 5); // Top 5 actions
  }

  /**
   * Calculate continuity score
   */
  calculateContinuityScore(verifiedContext) {
    let score = 0;
    const verification = verifiedContext.verification;
    
    // Source availability (40 points)
    if (verification.realTimeValid.valid) score += 20;
    if (verification.handoffValid.valid) score += 15;
    if (verification.memoryValid.valid) score += 5;
    
    // Consistency (30 points)
    if (verification.consistency.taskAlignment) score += 15;
    if (verification.consistency.fileAlignment) score += 15;
    
    // Freshness (30 points)
    const context = verifiedContext.verified;
    if (context.activeWork?.currentTask) score += 15;
    if (context.activeWork?.files?.length > 0) score += 15;
    
    return {
      score,
      rating: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'
    };
  }

  /**
   * Save bridge data
   */
  async saveBridgeData(bridgeData) {
    // Save structured data
    await ClaudeHelpers.writeJsonSafe(this.bridgePath, bridgeData);
    
    // Save human-readable summary
    const markdown = this.formatBridgeMarkdown(bridgeData);
    await fs.writeFile('.claude/bridge-summary.md', markdown);
    
    this.log('💾 Bridge data saved');
  }

  /**
   * Format bridge data as markdown
   */
  formatBridgeMarkdown(bridgeData) {
    const continuity = bridgeData.continuityScore;
    const verification = bridgeData.verification;
    
    return `# 🌉 Claude Bridge - Session Continuity Report

Generated: ${new Date(bridgeData.timestamp).toLocaleString()}

## 📊 Continuity Score: ${continuity.score}/100 (${continuity.rating.toUpperCase()})

## 🔍 Context Sources Available
${bridgeData.sourceAnalysis.available.map(source => `✅ ${source}`).join('\n')}

## 🎯 Current Task
**${bridgeData.context.activeWork.currentTask}**

## 📂 Active Files
${bridgeData.context.activeWork.files.slice(0, 5).map(file => `- ${file}`).join('\n')}

## 🧠 Memory Summary
- Decisions: ${bridgeData.context.memory.decisions.length}
- Preferences: ${bridgeData.context.memory.preferences.length}  
- Fixed Issues: ${bridgeData.context.memory.fixedIssues.length}

## 🚀 Immediate Next Actions
${bridgeData.nextActions.map((action, i) => `${i + 1}. **${action.action}** (${action.priority})
   ${action.command ? `Command: \`${action.command}\`` : ''}
   Reason: ${action.reason}`).join('\n\n')}

## 💡 Recommendations
${bridgeData.recommendations.map(rec => `- **${rec.type}** (${rec.priority}): ${rec.message}`).join('\n')}

## 🔍 Verification Details
- Real-time Context: ${verification.realTimeValid.valid ? '✅' : '❌'} ${verification.realTimeValid.age ? `(${verification.realTimeValid.age})` : ''}
- Handoff Context: ${verification.handoffValid.valid ? '✅' : '❌'} ${verification.handoffValid.age ? `(${verification.handoffValid.age})` : ''}
- Memory Context: ${verification.memoryValid.valid ? '✅' : '❌'} (${verification.memoryValid.counts?.decisions || 0} decisions)

---
*Bridge ID: ${bridgeData.bridgeId}*
*Use this context to maintain continuity with the previous Claude session.*
`;
  }

  /**
   * Utility methods
   */
  isRecentUpdate(timestamp) {
    const hours = (Date.now() - new Date(timestamp)) / (1000 * 60 * 60);
    return hours < 24;
  }

  getAge(timestamp) {
    const ms = Date.now() - new Date(timestamp);
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day(s) ago`;
    if (hours > 0) return `${hours} hour(s) ago`;
    return `${minutes} minute(s) ago`;
  }

  getVerificationSummary(verification) {
    const valid = [
      verification.realTimeValid.valid,
      verification.handoffValid.valid,
      verification.memoryValid.valid,
      verification.gitValid.valid
    ];
    
    const validCount = valid.filter(v => v).length;
    return `${validCount}/4 sources valid`;
  }

  log(message, level = 'info') {
    if (this.options.verbose || level === 'error') {
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
    verify: !args.includes('--no-verify'),
    update: !args.includes('--no-update')
  };
  
  const bridge = new ClaudeBridge(options);
  
  try {
    await bridge.initialize();
    
    switch (command) {
      case 'load':
      case undefined:
        const bridgeData = await bridge.loadPreviousContext();
        
        if (bridgeData) {
          console.log('🌉 Claude Bridge - Context Loaded');
          console.log('=' .repeat(40));
          console.log(`Continuity Score: ${bridgeData.continuityScore.score}/100 (${bridgeData.continuityScore.rating})`);
          console.log(`Sources: ${bridgeData.sourceAnalysis.available.join(', ')}`);
          console.log(`Current Task: ${bridgeData.context.activeWork.currentTask}`);
          console.log(`Next Actions: ${bridgeData.nextActions.length}`);
          console.log('=' .repeat(40));
          console.log('📄 Full report: .claude/bridge-summary.md');
        } else {
          console.log('⚠️ No context available for bridge');
        }
        break;
        
      default:
        console.log('Usage:');
        console.log('  npm run claude:bridge          # Load and verify context');
        console.log('  npm run claude:bridge load     # Load and verify context');
        console.log('');
        console.log('Options:');
        console.log('  --verbose                      # Verbose output');
        console.log('  --no-verify                    # Skip context verification');
        console.log('  --no-update                    # Skip context updates');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Check if running directly
if (process.argv[1] && process.argv[1].endsWith('claude-bridge.js')) {
  main();
}

export default ClaudeBridge;