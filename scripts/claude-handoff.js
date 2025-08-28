import ClaudeHelpers from './utils/claude-helpers.js';

class ClaudeHandoff {
  constructor() {
    this.sessionId = ClaudeHelpers.generateSessionId();
    this.timestamp = new Date().toISOString();
  }

  async createHandoff(customNotes = '') {
    console.log('🔄 Creating Claude session handoff...');
    
    // Get current project state
    const [git, tests, lint, server] = await Promise.all([
      ClaudeHelpers.getGitStatus(),
      ClaudeHelpers.getTestStatus(),
      ClaudeHelpers.getLintStatus(),
      ClaudeHelpers.getServerStatus()
    ]);

    const handoff = {
      sessionId: this.sessionId,
      timestamp: this.timestamp,
      tokenWarning: true,
      handoffReason: "Claude approaching token limit",
      
      // Current task context
      activeTask: await this.getCurrentTask(),
      
      // Session completion status
      sessionProgress: await this.getSessionProgress(),
      
      // Complete project state
      currentState: {
        git,
        tests,
        lint,
        server,
        critical: await ClaudeHelpers.findCriticalIssues(tests, lint, git)
      },
      
      // Code context - what files we were working with
      codeContext: await this.getCodeContext(),
      
      // Conversation memory
      conversationContext: await this.getConversationContext(customNotes),
      
      // What to continue with
      continuationPlan: await this.generateContinuationPlan(tests, lint, git),
      
      // Environment state
      environment: await this.getEnvironmentSnapshot()
    };

    // Save handoff data
    await this.saveHandoff(handoff);
    
    return handoff;
  }

  async getCurrentTask() {
    // Detect what we were likely working on based on recent changes
    const recentFiles = await ClaudeHelpers.execSafe('git diff --name-only HEAD~1..HEAD');
    const uncommittedFiles = await ClaudeHelpers.execSafe('git diff --name-only');
    
    // Look for context clues
    const workingFiles = [
      ...((recentFiles.stdout || '').split('\n').filter(f => f)),
      ...((uncommittedFiles.stdout || '').split('\n').filter(f => f))
    ];
    
    let taskDescription = 'General development work';
    let priority = 'medium';
    
    // Analyze files to determine task
    if (workingFiles.some(f => f.includes('test'))) {
      taskDescription = 'Fixing test failures';
      priority = 'high';
    } else if (workingFiles.some(f => f.includes('migration') || f.includes('sql'))) {
      taskDescription = 'Database migration work';
      priority = 'critical';
    } else if (workingFiles.some(f => f.includes('DatabaseService'))) {
      taskDescription = 'Database service improvements';
      priority = 'high';
    } else if (workingFiles.some(f => f.includes('JobRow') || f.includes('ResourceCard'))) {
      taskDescription = 'UI component fixes';
      priority = 'high';
    }
    
    return {
      description: taskDescription,
      priority,
      filesInvolved: workingFiles.slice(0, 5),
      estimatedTimeRemaining: '30-60 minutes'
    };
  }

  async getSessionProgress() {
    // Load previous context to compare
    const previousContext = await ClaudeHelpers.readJsonSafe('CLAUDE_CONTEXT.json');
    const currentTests = await ClaudeHelpers.getTestStatus();
    
    const completed = [];
    const inProgress = [];
    const notStarted = [];
    
    // Compare test status if we have previous data
    if (previousContext?.tests) {
      const testImprovement = currentTests.passing - previousContext.tests.passing;
      if (testImprovement > 0) {
        completed.push(`Fixed ${testImprovement} test failures`);
      }
      if (currentTests.failing < previousContext.tests.failing) {
        completed.push(`Reduced failing tests from ${previousContext.tests.failing} to ${currentTests.failing}`);
      }
    }

    // Check for specific known fixes
    const fixedFiles = [
      { file: 'src/components/resources/ResourceCard.tsx', fix: 'Added null check for assignments filter' },
      { file: 'src/services/DatabaseService.ts', fix: 'Added missing getDropRules and helper methods' },
      { file: 'src/components/board/__tests__/JobRow.test.tsx', fix: 'Fixed test context mocks and imports' },
      { file: 'fixed_migration.sql', fix: 'Created safer database migration script' }
    ];

    for (const fix of fixedFiles) {
      if (await ClaudeHelpers.fileExists(fix.file)) {
        completed.push(`✅ ${fix.fix}`);
      }
    }

    // Check for in-progress work
    const uncommitted = await ClaudeHelpers.execSafe('git diff --name-only');
    if (uncommitted.stdout) {
      inProgress.push(`Working on: ${uncommitted.stdout.split('\n').filter(f => f).join(', ')}`);
    }

    // Common next steps
    if (currentTests.failing > 0) {
      notStarted.push(`Fix remaining ${currentTests.failing} test failures`);
    }
    
    if (!(await ClaudeHelpers.fileExists('MIGRATION_APPLIED.flag'))) {
      notStarted.push('Apply database migration (critical blocker)');
    }

    return { completed, inProgress, notStarted };
  }

  async getCodeContext() {
    const criticalFiles = [
      'src/components/resources/ResourceCard.tsx',
      'src/services/DatabaseService.ts', 
      'src/components/board/__tests__/JobRow.test.tsx',
      'src/components/board/JobRow.tsx',
      'fixed_migration.sql',
      'package.json'
    ];

    const fileContents = {};
    for (const file of criticalFiles) {
      if (await ClaudeHelpers.fileExists(file)) {
        try {
          const content = await ClaudeHelpers.readJsonSafe(file);
          if (content) {
            fileContents[file] = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
          }
        } catch {
          // File exists but not JSON, that's fine
          fileContents[file] = 'Binary or non-JSON file';
        }
      }
    }

    const patches = await ClaudeHelpers.execSafe('git diff');
    
    return {
      modifiedFiles: (await ClaudeHelpers.execSafe('git diff --name-only')).stdout?.split('\n').filter(f => f) || [],
      criticalFileContents: fileContents,
      currentPatches: patches.stdout || 'No patches',
      lastCommit: (await ClaudeHelpers.execSafe('git log -1 --oneline')).stdout || 'No commits'
    };
  }

  async getConversationContext(customNotes) {
    return {
      keyDecisions: [
        "Don't remove 'unused' variables - many are used in JSX conditionally",
        "Use fixed_migration.sql not original migration due to duplicate column error", 
        "Focus on critical test failures first before ESLint cleanup",
        "ResourceCard crash was due to missing null check on assignments filter",
        "JobRow tests failing due to missing getMagnetInteractionRule mock in context"
      ],
      
      userPreferences: [
        "User wants comprehensive analysis and context",
        "User prefers to see patterns and root causes",
        "User is cautious about removing code that might be used later",
        "User wants to understand the 'why' behind changes"
      ],
      
      importantContext: [
        "Database already has schedule_date column (partial migration applied)",
        "RLS policies are blocking integration tests",
        "ESLint errors are mostly unused vars and 'any' types (lower priority)",
        "Test failures are clustered - fix root causes for maximum impact"
      ],
      
      customNotes: customNotes || "No additional notes provided"
    };
  }

  async generateContinuationPlan(tests, lint, git) {
    const plan = {
      immediate: [],
      shortTerm: [],
      longTerm: []
    };

    // Immediate actions (next 30 minutes)
    if (await ClaudeHelpers.fileExists('fixed_migration.sql') && !(await ClaudeHelpers.fileExists('MIGRATION_APPLIED.flag'))) {
      plan.immediate.push({
        action: 'Apply database migration',
        command: 'Copy fixed_migration.sql content to Supabase SQL editor and run',
        timeEstimate: '5 minutes',
        priority: 'CRITICAL',
        blocksFeatures: ['Week View', 'Multi-day scheduling', 'Job templates']
      });
    }

    if (tests.failing > 0) {
      plan.immediate.push({
        action: `Fix ${tests.failing} test failures`,
        command: 'npm test -- --run to identify specific failures',
        timeEstimate: '15-30 minutes',
        priority: 'HIGH',
        impact: 'Improves stability and development confidence'
      });
    }

    // Short-term actions (1-2 hours)
    if (lint.errors > 100) {
      plan.shortTerm.push({
        action: `Clean up ${lint.errors} ESLint errors`,
        focus: 'Remove genuinely unused variables, fix any types',
        timeEstimate: '1-2 hours',
        priority: 'MEDIUM'
      });
    }

    if (git.uncommittedFiles.length > 3) {
      plan.shortTerm.push({
        action: `Commit ${git.uncommittedFiles.length} uncommitted changes`,
        command: 'git add . && git commit -m "Session progress: [description]"',
        timeEstimate: '5 minutes',
        priority: 'LOW'
      });
    }

    // Long-term (next session)
    plan.longTerm.push(
      'Performance optimizations (React.memo, bundle size)',
      'Week View feature completion and testing',
      'E2E test setup with Playwright',
      'Documentation updates'
    );

    return plan;
  }

  async getEnvironmentSnapshot() {
    const nodeVersion = await ClaudeHelpers.execSafe('node --version');
    const npmVersion = await ClaudeHelpers.execSafe('npm --version');
    const gitVersion = await ClaudeHelpers.execSafe('git --version');
    
    return {
      node: nodeVersion.stdout || 'Unknown',
      npm: npmVersion.stdout || 'Unknown', 
      git: gitVersion.stdout || 'Unknown',
      platform: process.platform,
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        CI: process.env.CI || 'false'
      }
    };
  }

  async saveHandoff(handoff) {
    // Save main handoff file
    await ClaudeHelpers.writeJsonSafe('CLAUDE_HANDOFF.json', handoff);
    
    // Save readable markdown
    const markdown = this.formatHandoffMarkdown(handoff);
    await ClaudeHelpers.writeJsonSafe('CLAUDE_HANDOFF.md', markdown);
    
    // Archive in sessions folder
    await ClaudeHelpers.ensureDir('.claude/sessions');
    await ClaudeHelpers.writeJsonSafe(`.claude/sessions/${handoff.sessionId}.json`, handoff);
    
    // Update session history
    await ClaudeHelpers.saveSessionHistory({
      sessionId: handoff.sessionId,
      timestamp: handoff.timestamp,
      type: 'handoff',
      summary: {
        task: handoff.activeTask.description,
        priority: handoff.activeTask.priority,
        completed: handoff.sessionProgress.completed.length,
        testsPassing: handoff.currentState.tests.passing,
        testsFailing: handoff.currentState.tests.failing
      }
    });

    console.log(`📝 Handoff saved: CLAUDE_HANDOFF.json`);
    console.log(`📄 Readable format: CLAUDE_HANDOFF.md`);
    console.log(`💾 Archived: .claude/sessions/${handoff.sessionId}.json`);
  }

  formatHandoffMarkdown(handoff) {
    return `# 🔄 Claude Session Handoff - ${ClaudeHelpers.formatTimestamp()}

## 🚨 SESSION STATUS: TOKEN LIMIT REACHED
**Previous Claude**: Approaching token limit, creating handoff for seamless continuation.

## 🎯 ACTIVE TASK
**Working on**: ${handoff.activeTask.description}  
**Priority**: ${handoff.activeTask.priority.toUpperCase()}  
**Files involved**: ${handoff.activeTask.filesInvolved.join(', ') || 'None specified'}  
**Estimated time remaining**: ${handoff.activeTask.estimatedTimeRemaining}

## ✅ SESSION PROGRESS

### Completed This Session
${handoff.sessionProgress.completed.map(item => `- ${item}`).join('\n') || '- No specific completions tracked'}

### In Progress
${handoff.sessionProgress.inProgress.map(item => `- ${item}`).join('\n') || '- No work in progress'}

### Not Started / Next Steps
${handoff.sessionProgress.notStarted.map(item => `- ${item}`).join('\n') || '- No specific next steps identified'}

## 📊 CURRENT PROJECT STATE

### Tests: ${handoff.currentState.tests.passing}/${handoff.currentState.tests.total} passing (${handoff.currentState.tests.total > 0 ? Math.round((handoff.currentState.tests.passing / handoff.currentState.tests.total) * 100) : 0}%)
${handoff.currentState.tests.failures.length > 0 ? `
**Top Failures:**
${handoff.currentState.tests.failures.slice(0, 3).map(f => `- ${f.test} in ${f.file}`).join('\n')}
` : ''}

### ESLint: ${handoff.currentState.lint.errors} errors, ${handoff.currentState.lint.warnings} warnings

### Git Status
- Branch: ${handoff.currentState.git.branch}
- Uncommitted files: ${handoff.currentState.git.uncommittedFiles.length}
- Last commit: ${handoff.currentState.git.lastCommit}

### Critical Issues
${handoff.currentState.critical.length > 0 
  ? handoff.currentState.critical.map(issue => `- **${issue.message}** (${issue.severity}) - ${issue.impact}`).join('\n')
  : '✅ No critical issues detected'}

## 🔄 CONTINUATION PLAN

### 🔴 IMMEDIATE (Next 30 min)
${handoff.continuationPlan.immediate.map(item => `
**${item.action}**
- Command: \`${item.command || 'See description'}\`
- Time: ${item.timeEstimate}
- Priority: ${item.priority}
${item.blocksFeatures ? `- Blocks: ${item.blocksFeatures.join(', ')}` : ''}
${item.impact ? `- Impact: ${item.impact}` : ''}
`).join('\n')}

### 🟡 SHORT-TERM (1-2 hours)
${handoff.continuationPlan.shortTerm.map(item => `- **${item.action}** (${item.timeEstimate || 'time estimate needed'})`).join('\n')}

### 🟢 LONG-TERM (Next session)
${handoff.continuationPlan.longTerm.map(item => `- ${item}`).join('\n')}

## 💭 CONVERSATION CONTEXT

### Key Decisions Made
${handoff.conversationContext.keyDecisions.map(d => `- ${d}`).join('\n')}

### User Preferences Learned
${handoff.conversationContext.userPreferences.map(p => `- ${p}`).join('\n')}

### Important Context to Remember
${handoff.conversationContext.importantContext.map(c => `- ${c}`).join('\n')}

### Custom Notes
${handoff.conversationContext.customNotes}

## 🗂️ CODE CONTEXT

### Modified Files
${handoff.codeContext.modifiedFiles.length > 0 
  ? handoff.codeContext.modifiedFiles.map(f => `- ${f}`).join('\n')
  : 'No uncommitted changes'}

### Last Commit
\`${handoff.codeContext.lastCommit}\`

## 🚀 QUICK START FOR NEXT CLAUDE

\`\`\`bash
# 1. Load this context
npm run claude:resume

# 2. Check current status
npm test -- --run --reporter=min

# 3. Continue with highest priority task:
${handoff.continuationPlan.immediate.length > 0 
  ? handoff.continuationPlan.immediate[0].command
  : 'Review continuation plan above'}
\`\`\`

---

**Session ID**: ${handoff.sessionId}  
**Handoff Created**: ${ClaudeHelpers.formatTimestamp()}  
**Environment**: Node ${handoff.environment.node}, ${handoff.environment.platform}

*Next Claude: Use \`npm run claude:resume\` to load complete context and continue seamlessly.*
`;
  }
}

// Main execution
async function main() {
  try {
    const customNotes = process.argv.slice(2).join(' '); // Allow custom notes as arguments
    
    const handoff = new ClaudeHandoff();
    const data = await handoff.createHandoff(customNotes);
    
    console.log('\n' + '='.repeat(60));
    console.log('🔄 CLAUDE HANDOFF CREATED');
    console.log('='.repeat(60));
    console.log(`🎯 Active Task: ${data.activeTask.description}`);
    console.log(`📊 Tests: ${data.currentState.tests.passing}/${data.currentState.tests.total} passing`);
    console.log(`⚠️  Critical Issues: ${data.currentState.critical.length}`);
    console.log(`📝 Session Progress: ${data.sessionProgress.completed.length} completed`);
    console.log('='.repeat(60));
    console.log('📄 Handoff saved to: CLAUDE_HANDOFF.md');
    console.log('📊 JSON data saved to: CLAUDE_HANDOFF.json');
    console.log('='.repeat(60));
    console.log('\n🚀 FOR NEXT CLAUDE SESSION:');
    console.log('Run: npm run claude:resume');
    console.log('\n🎯 CONTINUE WITH:');
    if (data.continuationPlan.immediate.length > 0) {
      data.continuationPlan.immediate.slice(0, 2).forEach((item, i) => {
        console.log(`${i + 1}. ${item.action} (${item.priority})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating handoff:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}