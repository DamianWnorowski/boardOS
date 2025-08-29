import ClaudeHelpers from './utils/claude-helpers.js';

class ClaudeResume {
  constructor() {
    this.timestamp = new Date().toISOString();
  }

  async resumeSession() {
    console.log('📚 Resuming Claude session from handoff...');
    
    // Load handoff data
    const handoff = await ClaudeHelpers.readJsonSafe('CLAUDE_HANDOFF.json');
    if (!handoff) {
      throw new Error('No handoff file found. Use `npm run claude:start` for new session.');
    }

    // Get current project state
    const [git, tests, lint, server] = await Promise.all([
      ClaudeHelpers.getGitStatus(),
      ClaudeHelpers.getTestStatus(), 
      ClaudeHelpers.getLintStatus(),
      ClaudeHelpers.getServerStatus()
    ]);

    const resumeData = {
      sessionId: ClaudeHelpers.generateSessionId(),
      timestamp: this.timestamp,
      mode: 'RESUME_SESSION',
      
      // Previous session context
      handoffData: handoff,
      timeSinceHandoff: this.calculateTimeDifference(handoff.timestamp),
      
      // Current state
      currentState: { git, tests, lint, server },
      
      // What changed since handoff
      changesSinceHandoff: await this.analyzeChangesSinceHandoff(handoff),
      
      // Updated continuation plan
      updatedPlan: await this.updateContinuationPlan(handoff, tests, lint, git),
      
      // Combined context
      combinedContext: await this.createCombinedContext(handoff, { git, tests, lint, server })
    };

    // Save resumed session data
    await this.saveResumedSession(resumeData);

    return resumeData;
  }

  calculateTimeDifference(handoffTimestamp) {
    const handoffTime = new Date(handoffTimestamp);
    const now = new Date();
    const diffMs = now - handoffTime;
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return `${diffDays} day(s) ago`;
    if (diffHours > 0) return `${diffHours} hour(s) ago`;
    return `${diffMinutes} minute(s) ago`;
  }

  async analyzeChangesSinceHandoff(handoff) {
    const previousState = handoff.currentState;
    const currentGit = await ClaudeHelpers.getGitStatus();
    const currentTests = await ClaudeHelpers.getTestStatus();
    const currentLint = await ClaudeHelpers.getLintStatus();

    const changes = {
      git: this.compareGitChanges(previousState.git, currentGit),
      tests: this.compareTestChanges(previousState.tests, currentTests),
      lint: this.compareLintChanges(previousState.lint, currentLint),
      files: await this.getFileChanges(handoff.codeContext.modifiedFiles)
    };

    return changes;
  }

  compareGitChanges(previous, current) {
    return {
      branchChanged: previous.branch !== current.branch,
      newCommits: current.lastCommit !== previous.lastCommit,
      filesChanged: current.uncommittedFiles.length !== previous.uncommittedFiles.length,
      newUncommitted: current.uncommittedFiles.filter(f => !previous.uncommittedFiles.includes(f)),
      committed: previous.uncommittedFiles.filter(f => !current.uncommittedFiles.includes(f))
    };
  }

  compareTestChanges(previous, current) {
    return {
      passingChange: current.passing - previous.passing,
      failingChange: current.failing - previous.failing,
      totalChange: current.total - previous.total,
      improvement: current.passing > previous.passing,
      regression: current.passing < previous.passing
    };
  }

  compareLintChanges(previous, current) {
    return {
      errorChange: current.errors - previous.errors,
      warningChange: current.warnings - previous.warnings,
      improvement: current.errors < previous.errors,
      regression: current.errors > previous.errors
    };
  }

  async getFileChanges(previousModified) {
    const currentModified = (await ClaudeHelpers.execSafe('git diff --name-only')).stdout?.split('\n').filter(f => f) || [];
    
    return {
      stillModified: previousModified.filter(f => currentModified.includes(f)),
      newlyModified: currentModified.filter(f => !previousModified.includes(f)),
      committed: previousModified.filter(f => !currentModified.includes(f))
    };
  }

  async updateContinuationPlan(handoff, tests, lint, git) {
    const originalPlan = handoff.continuationPlan;
    const updatedPlan = {
      immediate: [],
      shortTerm: [],
      longTerm: originalPlan.longTerm // Long-term usually stays same
    };

    // Re-evaluate immediate tasks based on current state
    for (const task of originalPlan.immediate) {
      if (task.action.includes('database migration')) {
        // Check if migration was applied
        const migrationApplied = await ClaudeHelpers.fileExists('MIGRATION_APPLIED.flag');
        if (!migrationApplied) {
          updatedPlan.immediate.push({
            ...task,
            status: 'STILL_NEEDED',
            note: 'Migration still not applied - remains critical'
          });
        } else {
          updatedPlan.immediate.push({
            ...task,
            status: 'COMPLETED',
            note: 'Migration appears to have been applied'
          });
        }
      } else if (task.action.includes('test failures')) {
        if (tests.failing > 0) {
          updatedPlan.immediate.push({
            ...task,
            action: `Fix ${tests.failing} test failures`,
            status: 'UPDATED',
            note: `Was ${handoff.currentState.tests.failing}, now ${tests.failing}`
          });
        } else {
          updatedPlan.immediate.push({
            ...task,
            status: 'COMPLETED', 
            note: 'All tests now passing!'
          });
        }
      }
    }

    // Add new immediate tasks if needed
    if (tests.failing > handoff.currentState.tests.failing) {
      updatedPlan.immediate.push({
        action: `Fix newly broken tests (${tests.failing - handoff.currentState.tests.failing} new failures)`,
        priority: 'HIGH',
        status: 'NEW',
        command: 'npm test -- --run to identify new failures'
      });
    }

    // Update short-term tasks
    for (const task of originalPlan.shortTerm) {
      if (task.action.includes('ESLint')) {
        updatedPlan.shortTerm.push({
          ...task,
          action: `Clean up ${lint.errors} ESLint errors`,
          status: lint.errors < handoff.currentState.lint.errors ? 'IMPROVED' : 'SAME'
        });
      } else {
        updatedPlan.shortTerm.push(task);
      }
    }

    return updatedPlan;
  }

  async createCombinedContext(handoff, currentState) {
    return {
      // Session continuity
      sessionHistory: {
        original: handoff.sessionId,
        resumed: ClaudeHelpers.generateSessionId(),
        timeBetween: this.calculateTimeDifference(handoff.timestamp)
      },
      
      // Task context
      activeTask: handoff.activeTask,
      completedProgress: handoff.sessionProgress.completed,
      
      // Technical context
      codeContext: handoff.codeContext,
      conversationContext: handoff.conversationContext,
      
      // Current vs previous state
      stateComparison: {
        tests: {
          previous: `${handoff.currentState.tests.passing}/${handoff.currentState.tests.total}`,
          current: `${currentState.tests.passing}/${currentState.tests.total}`,
          trend: currentState.tests.passing >= handoff.currentState.tests.passing ? '↗️' : '↘️'
        },
        lint: {
          previous: handoff.currentState.lint.errors,
          current: currentState.lint.errors,
          trend: currentState.lint.errors <= handoff.currentState.lint.errors ? '↗️' : '↘️'
        }
      }
    };
  }

  async saveResumedSession(resumeData) {
    // Save resume data
    await ClaudeHelpers.writeJsonSafe('CLAUDE_CONTEXT_RESUMED.json', resumeData);
    
    // Create comprehensive context markdown
    const markdown = this.formatResumedContext(resumeData);
    await ClaudeHelpers.writeJsonSafe('CLAUDE_CONTEXT_RESUMED.md', markdown);
    
    // Update session history
    await ClaudeHelpers.saveSessionHistory({
      sessionId: resumeData.sessionId,
      timestamp: resumeData.timestamp,
      type: 'resume',
      originalSession: resumeData.handoffData.sessionId,
      summary: {
        timeSinceHandoff: resumeData.timeSinceHandoff,
        testsPassing: resumeData.currentState.tests.passing,
        testsFailing: resumeData.currentState.tests.failing,
        tasksRemaining: resumeData.updatedPlan.immediate.length
      }
    });
  }

  formatResumedContext(resumeData) {
    const handoff = resumeData.handoffData;
    const changes = resumeData.changesSinceHandoff;
    
    return `# 🔄 Claude Session RESUMED - ${ClaudeHelpers.formatTimestamp()}

## 📚 SESSION CONTINUITY
**Resuming from**: ${handoff.sessionId}  
**Original handoff**: ${this.calculateTimeDifference(handoff.timestamp)}  
**Previous Claude was working on**: ${handoff.activeTask.description} (${handoff.activeTask.priority})

## ✅ PREVIOUS SESSION PROGRESS
${handoff.sessionProgress.completed.map(item => `- ${item}`).join('\n')}

## 📊 STATE COMPARISON: THEN → NOW

### Tests: ${handoff.currentState.tests.passing}/${handoff.currentState.tests.total} → ${resumeData.currentState.tests.passing}/${resumeData.currentState.tests.total}
${changes.tests.improvement ? '🎉 **IMPROVEMENT**: ' + changes.tests.passingChange + ' more tests passing!' : ''}
${changes.tests.regression ? '⚠️ **REGRESSION**: ' + Math.abs(changes.tests.passingChange) + ' fewer tests passing' : ''}
${changes.tests.passingChange === 0 ? '➡️ **NO CHANGE**: Test status unchanged' : ''}

### ESLint: ${handoff.currentState.lint.errors} → ${resumeData.currentState.lint.errors} errors
${changes.lint.improvement ? '✨ **IMPROVEMENT**: ' + Math.abs(changes.lint.errorChange) + ' fewer errors!' : ''}
${changes.lint.regression ? '📈 **REGRESSION**: ' + changes.lint.errorChange + ' more errors' : ''}

### Git Changes Since Handoff
${changes.git.newCommits ? '📝 **New commits made**' : ''}
${changes.git.branchChanged ? '🌿 **Branch changed**: ' + resumeData.currentState.git.branch : ''}
${changes.files.committed.length > 0 ? '✅ **Files committed**: ' + changes.files.committed.join(', ') : ''}
${changes.files.newlyModified.length > 0 ? '📝 **New modifications**: ' + changes.files.newlyModified.join(', ') : ''}

## 🎯 UPDATED CONTINUATION PLAN

### 🔴 IMMEDIATE ACTIONS
${resumeData.updatedPlan.immediate.map(task => `
**${task.action}** ${task.status ? `[${task.status}]` : ''}
- Priority: ${task.priority}
- Command: \`${task.command || 'See original plan'}\`
${task.note ? '- Note: ' + task.note : ''}
`).join('\n')}

### 🟡 SHORT-TERM ACTIONS  
${resumeData.updatedPlan.shortTerm.map(task => `- ${task.action} ${task.status ? `[${task.status}]` : ''}`).join('\n')}

## 💭 CONVERSATION MEMORY (From Previous Session)

### Key Decisions to Remember
${handoff.conversationContext.keyDecisions.map(d => `- ${d}`).join('\n')}

### User Preferences
${handoff.conversationContext.userPreferences.map(p => `- ${p}`).join('\n')}

### Critical Context
${handoff.conversationContext.importantContext.map(c => `- ${c}`).join('\n')}

## 🗂️ CODE CONTEXT FROM PREVIOUS SESSION

### Files We Were Working With
${handoff.codeContext.modifiedFiles.length > 0 
  ? handoff.codeContext.modifiedFiles.map(f => `- ${f}`).join('\n')
  : 'No specific files noted'}

### What Changed Since Then
${changes.files.stillModified.length > 0 ? `
**Still modified**: ${changes.files.stillModified.join(', ')}
` : ''}
${changes.files.committed.length > 0 ? `
**Were committed**: ${changes.files.committed.join(', ')}
` : ''}
${changes.files.newlyModified.length > 0 ? `
**Newly modified**: ${changes.files.newlyModified.join(', ')}
` : ''}

## 🚀 READY TO CONTINUE!

### Next Actions (In Priority Order):
${resumeData.updatedPlan.immediate.filter(t => t.status !== 'COMPLETED').map((task, i) => `${i + 1}. ${task.action}`).join('\n')}

### Quick Status Check:
\`\`\`bash
npm test -- --run --reporter=min  # See current test status
npm run lint                      # Check current ESLint status  
git status                        # See what's changed
\`\`\`

## 🧠 MY UNDERSTANDING

I'm now fully caught up on where we left off. The previous Claude was working on **${handoff.activeTask.description}** with **${handoff.activeTask.priority}** priority. 

${changes.tests.improvement ? '🎉 Great news: Tests improved since the handoff! ' : ''}
${changes.tests.regression ? '⚠️ Heads up: Some tests broke since the handoff. ' : ''}

Key things I need to remember:
- ${handoff.conversationContext.keyDecisions[0] || 'No specific decisions noted'}
- ${handoff.conversationContext.importantContext[0] || 'No critical context noted'}

Ready to pick up where we left off and continue making progress! 

---
**Session Resumed**: ${ClaudeHelpers.formatTimestamp()}  
**Original Session**: ${handoff.sessionId}  
**Resumed Session**: ${resumeData.sessionId}
`;
  }
}

// Main execution
async function main() {
  try {
    const resume = new ClaudeResume();
    const data = await resume.resumeSession();
    
    console.log('\n' + '='.repeat(60));
    console.log('📚 CLAUDE SESSION RESUMED');
    console.log('='.repeat(60));
    console.log(`🔄 From: ${data.handoffData.sessionId}`);
    console.log(`⏰ Time since handoff: ${data.timeSinceHandoff}`);
    console.log(`🎯 Task: ${data.handoffData.activeTask.description}`);
    console.log(`📊 Tests: ${data.currentState.tests.passing}/${data.currentState.tests.total} passing`);
    
    // Show changes since handoff
    const changes = data.changesSinceHandoff;
    if (changes.tests.passingChange !== 0) {
      console.log(`📈 Test change: ${changes.tests.passingChange > 0 ? '+' : ''}${changes.tests.passingChange} since handoff`);
    }
    if (changes.lint.errorChange !== 0) {
      console.log(`🔧 Lint change: ${changes.lint.errorChange > 0 ? '+' : ''}${changes.lint.errorChange} errors since handoff`);
    }
    
    console.log('='.repeat(60));
    console.log('📄 Full context: CLAUDE_CONTEXT_RESUMED.md');
    console.log('📊 JSON data: CLAUDE_CONTEXT_RESUMED.json');
    console.log('='.repeat(60));
    
    // Show immediate actions
    const immediateActions = data.updatedPlan.immediate.filter(t => t.status !== 'COMPLETED');
    if (immediateActions.length > 0) {
      console.log('\n🎯 CONTINUE WITH:');
      immediateActions.slice(0, 3).forEach((action, i) => {
        console.log(`${i + 1}. ${action.action} (${action.priority})`);
      });
    } else {
      console.log('\n✅ All immediate tasks from handoff appear completed!');
    }
    
  } catch (error) {
    console.error('❌ Error resuming session:', error.message);
    if (error.message.includes('No handoff file')) {
      console.log('\n💡 Try: npm run claude:start (for new session)');
    }
    process.exit(1);
  }
}

// Check if this script is being run directly
if (process.argv[1] && process.argv[1].endsWith('claude-resume.js')) {
  main();
}