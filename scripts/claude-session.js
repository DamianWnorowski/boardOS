import ClaudeHelpers from './utils/claude-helpers.js';
import path from 'path';

class ClaudeSession {
  constructor() {
    this.sessionId = ClaudeHelpers.generateSessionId();
    this.timestamp = new Date().toISOString();
  }

  async analyzeProject() {
    console.log('🔍 Analyzing BoardOS project...');
    
    // Run all analysis in parallel for speed
    const [git, tests, lint, server, database] = await Promise.all([
      this.analyzeGit(),
      this.analyzeTests(),
      this.analyzeLinting(),
      this.analyzeServer(),
      this.analyzeDatabase()
    ]);

    const analysis = {
      sessionId: this.sessionId,
      timestamp: this.timestamp,
      mode: 'NEW_SESSION',
      
      // Core metrics
      git,
      tests,
      lint,
      server,
      database,
      
      // Analysis
      critical: await ClaudeHelpers.findCriticalIssues(tests, lint, git),
      recommendations: this.generateRecommendations(git, tests, lint, database),
      
      // Context
      projectInfo: await this.getProjectInfo(),
      recentActivity: await this.getRecentActivity(),
      
      // Memory
      previousSession: await this.getLastSession()
    };

    // Save analysis
    await this.saveAnalysis(analysis);
    
    return analysis;
  }

  async analyzeGit() {
    console.log('  📋 Git status...');
    return await ClaudeHelpers.getGitStatus();
  }

  async analyzeTests() {
    console.log('  🧪 Test results...');
    return await ClaudeHelpers.getTestStatus();
  }

  async analyzeLinting() {
    console.log('  🔧 ESLint analysis...');
    return await ClaudeHelpers.getLintStatus();
  }

  async analyzeServer() {
    console.log('  🌐 Server status...');
    return await ClaudeHelpers.getServerStatus();
  }

  async analyzeDatabase() {
    console.log('  🗄️  Database status...');
    return await ClaudeHelpers.getDatabaseStatus();
  }

  async getProjectInfo() {
    const packageJson = await ClaudeHelpers.readJsonSafe('package.json');
    
    return {
      name: packageJson?.name || 'BoardOS',
      version: packageJson?.version || '0.1.0',
      type: 'React + TypeScript + Vite + Supabase',
      mainTech: ['React 18', 'TypeScript', 'Tailwind CSS', 'React DnD', 'Supabase'],
      testFramework: 'Vitest + Testing Library + Playwright'
    };
  }

  async getRecentActivity() {
    const recentCommits = await ClaudeHelpers.execSafe('git log --oneline -5');
    const recentFiles = await ClaudeHelpers.execSafe('find . -name "*.tsx" -o -name "*.ts" -mtime -1 | grep -v node_modules | head -10');
    
    return {
      recentCommits: recentCommits.stdout ? recentCommits.stdout.split('\n').filter(c => c) : [],
      recentlyModified: recentFiles.stdout ? recentFiles.stdout.split('\n').filter(f => f) : [],
      workingDirectory: process.cwd()
    };
  }

  async getLastSession() {
    const history = await ClaudeHelpers.loadSessionHistory();
    return history.length > 0 ? history[0] : null;
  }

  generateRecommendations(git, tests, lint, database) {
    const recommendations = [];
    
    // Critical blockers first
    if (tests.failing > 20) {
      recommendations.push(`🔴 CRITICAL: Fix test failures (${tests.failing} failing) - likely cascading from core issues`);
    }
    
    if (!database.migrationApplied && database.migrationFileExists) {
      recommendations.push('🔴 CRITICAL: Apply database migration to enable Week View and multi-day features');
    }

    // Major issues
    if (tests.failing > 0 && tests.failing <= 20) {
      recommendations.push(`🟡 HIGH: Fix ${tests.failing} test failures for better stability`);
    }

    if (lint.errors > 100) {
      recommendations.push(`🟡 MEDIUM: Clean up ${lint.errors} ESLint errors (focus on unused vars and types)`);
    }

    if (git.uncommittedFiles.length > 3) {
      recommendations.push(`🟢 LOW: Commit ${git.uncommittedFiles.length} uncommitted files`);
    }

    // Development workflow
    if (!tests.success) {
      recommendations.push('🔧 SETUP: Tests not running properly - check test environment');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Project looks healthy! Ready for new features or optimizations');
    }

    return recommendations;
  }

  async saveAnalysis(analysis) {
    // Save detailed JSON
    await ClaudeHelpers.writeJsonSafe('CLAUDE_CONTEXT.json', analysis);
    
    // Save readable markdown
    const markdown = this.formatAsMarkdown(analysis);
    await ClaudeHelpers.writeJsonSafe('CLAUDE_CONTEXT.md', markdown);
    
    // Update session history
    await ClaudeHelpers.saveSessionHistory({
      sessionId: this.sessionId,
      timestamp: this.timestamp,
      type: 'new_session',
      summary: {
        testsPassing: analysis.tests.passing,
        testsFailing: analysis.tests.failing,
        lintErrors: analysis.lint.errors,
        criticalIssues: analysis.critical.length,
        recommendations: analysis.recommendations.length
      }
    });
  }

  formatAsMarkdown(analysis) {
    const passRate = analysis.tests.total > 0 
      ? Math.round((analysis.tests.passing / analysis.tests.total) * 100) 
      : 0;

    return `# BoardOS Claude Context - ${ClaudeHelpers.formatTimestamp()}

## 🔥 CRITICAL ISSUES (Fix First)
${analysis.critical.length > 0 
  ? analysis.critical.map(issue => `### ${issue.message}
- **Impact**: ${issue.impact}
- **Severity**: ${issue.severity.toUpperCase()}
- **Files**: ${issue.files?.join(', ') || 'Multiple'}
`).join('\n')
  : '✅ No critical issues detected!'}

## 📊 PROJECT HEALTH
| Metric | Status | Details |
|--------|--------|---------|
| **Tests** | ${passRate >= 90 ? '🟢' : passRate >= 70 ? '🟡' : '🔴'} | ${analysis.tests.passing}/${analysis.tests.total} passing (${passRate}%) |
| **ESLint** | ${analysis.lint.errors < 50 ? '🟢' : analysis.lint.errors < 200 ? '🟡' : '🔴'} | ${analysis.lint.errors} errors, ${analysis.lint.warnings} warnings |
| **Git** | ${analysis.git.uncommittedFiles.length < 3 ? '🟢' : '🟡'} | ${analysis.git.branch} branch, ${analysis.git.uncommittedFiles.length} uncommitted |
| **Server** | ${analysis.server.devServerRunning ? '🟢' : '🔴'} | Port ${analysis.server.port} ${analysis.server.devServerRunning ? 'running' : 'stopped'} |
| **Database** | ${analysis.database.migrationApplied ? '🟢' : '🔴'} | Migration ${analysis.database.migrationApplied ? 'applied' : 'pending'} |

## 🎯 RECOMMENDED ACTIONS
${analysis.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

## 📈 TEST BREAKDOWN
${analysis.tests.failures.length > 0 ? `
**Top Test Failures:**
${analysis.tests.failures.slice(0, 5).map(failure => `- **${failure.test}** in ${failure.file}
  \`\`\`
  ${failure.error.split('\n')[0]}
  \`\`\`
`).join('')}
` : '✅ All tests passing!'}

## 🔧 LINT ISSUES
${analysis.lint.issues.length > 0 ? `
**Top ESLint Issues:**
${analysis.lint.issues.slice(0, 5).map(issue => `- **${issue.file}:${issue.line}** - ${issue.message} (${issue.rule})`).join('\n')}
` : '✅ No lint issues!'}

## 🔄 RECENT ACTIVITY
**Recent Commits:**
${analysis.recentActivity.recentCommits.slice(0, 3).map(commit => `- ${commit}`).join('\n')}

**Uncommitted Files:**
${analysis.git.uncommittedFiles.length > 0 
  ? analysis.git.uncommittedFiles.slice(0, 5).map(file => `- ${file}`).join('\n')
  : 'None'}

## 💾 SESSION CONTEXT
- **Session ID**: ${analysis.sessionId}
- **Project**: ${analysis.projectInfo.name} v${analysis.projectInfo.version}
- **Tech Stack**: ${analysis.projectInfo.mainTech.join(', ')}
- **Previous Session**: ${analysis.previousSession ? ClaudeHelpers.formatTimestamp(new Date(analysis.previousSession.timestamp)) : 'First session'}

## 🧠 MY ANALYSIS
Based on the current state:
${this.generateInsights(analysis)}

---
*Generated by claude-session.js at ${ClaudeHelpers.formatTimestamp()}*
*Run \`npm run claude:status\` for quick updates*
`;
  }

  generateInsights(analysis) {
    const insights = [];
    
    if (analysis.tests.failing > analysis.tests.passing) {
      insights.push('⚠️  More tests failing than passing - likely systemic issues');
    }
    
    if (analysis.lint.errors > 300 && analysis.tests.failing < 10) {
      insights.push('🔧 High lint errors but tests passing - focus on code quality cleanup');
    }
    
    if (analysis.git.uncommittedFiles.length > 10) {
      insights.push('💾 Many uncommitted changes - consider committing progress');
    }
    
    if (analysis.critical.length === 0 && analysis.tests.failing < 5) {
      insights.push('✅ Project in good shape - ready for new features or optimizations');
    }
    
    if (!analysis.database.migrationApplied) {
      insights.push('🗄️  Database migration pending - this blocks Week View functionality');
    }

    return insights.length > 0 
      ? insights.join('\n') 
      : 'Project metrics look reasonable. Ready to continue development.';
  }
}

// Main execution
async function main() {
  try {
    const session = new ClaudeSession();
    const analysis = await session.analyzeProject();
    
    console.log('\n' + '='.repeat(60));
    console.log('🤖 CLAUDE CONTEXT GENERATED');
    console.log('='.repeat(60));
    console.log(`📊 Tests: ${analysis.tests.passing}/${analysis.tests.total} passing`);
    console.log(`🔧 ESLint: ${analysis.lint.errors} errors`);
    console.log(`📋 Git: ${analysis.git.uncommittedFiles.length} uncommitted files`);
    console.log(`🚨 Critical: ${analysis.critical.length} issues`);
    console.log('='.repeat(60));
    console.log('📄 Full context saved to: CLAUDE_CONTEXT.md');
    console.log('📊 JSON data saved to: CLAUDE_CONTEXT.json');
    console.log('='.repeat(60));
    
    // Show top 3 recommendations
    if (analysis.recommendations.length > 0) {
      console.log('\n🎯 TOP RECOMMENDATIONS:');
      analysis.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error generating context:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}