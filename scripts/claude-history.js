import ClaudeHelpers from './utils/claude-helpers.js';

class ClaudeHistory {
  async showHistory() {
    console.log('📚 Claude Session History\n');
    
    const history = await ClaudeHelpers.loadSessionHistory();
    
    if (history.length === 0) {
      console.log('📭 No session history found.');
      console.log('💡 History is created when you use:');
      console.log('   - npm run claude:start');
      console.log('   - npm run claude:handoff');
      console.log('   - npm run claude:resume');
      return;
    }

    console.log(`Found ${history.length} session(s):\n`);

    for (let i = 0; i < history.length; i++) {
      const session = history[i];
      const age = this.calculateAge(session.timestamp);
      const isRecent = this.isRecent(session.timestamp);
      
      console.log(`${isRecent ? '🟢' : '⚪'} Session ${i + 1} (${age})`);
      console.log(`   📝 Type: ${session.type}`);
      console.log(`   🆔 ID: ${session.sessionId}`);
      
      if (session.summary) {
        const s = session.summary;
        console.log(`   📊 Tests: ${s.testsPassing || 0} passing, ${s.testsFailing || 0} failing`);
        console.log(`   🔧 Issues: ${s.criticalIssues || 0} critical, ${s.lintErrors || 0} lint errors`);
        
        if (session.type === 'handoff') {
          console.log(`   🎯 Task: ${s.task} (${s.priority})`);
          console.log(`   ✅ Completed: ${s.completed || 0} items`);
        } else if (session.type === 'resume') {
          console.log(`   ⏰ From: ${s.originalSession || 'Unknown'}`);
          console.log(`   🔄 Gap: ${s.timeSinceHandoff || 'Unknown'}`);
        }
      }
      
      console.log('');
    }

    // Show trends
    await this.showTrends(history);
  }

  async showTrends(history) {
    if (history.length < 2) return;

    console.log('📈 Trends:');
    
    const testData = history
      .filter(s => s.summary?.testsPassing !== undefined)
      .slice(0, 5) // Last 5 sessions
      .reverse(); // Chronological order

    if (testData.length >= 2) {
      const first = testData[0];
      const last = testData[testData.length - 1];
      
      const testChange = (last.summary.testsPassing || 0) - (first.summary.testsPassing || 0);
      const testIcon = testChange > 0 ? '📈' : testChange < 0 ? '📉' : '➡️';
      
      console.log(`   ${testIcon} Tests: ${testChange >= 0 ? '+' : ''}${testChange} over ${testData.length} sessions`);
    }

    // Show session types
    const types = history.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {});

    console.log(`   🔄 Session types: ${Object.entries(types).map(([type, count]) => `${type}(${count})`).join(', ')}`);
    console.log('');
  }

  calculateAge(timestamp) {
    const past = new Date(timestamp);
    const now = new Date();
    const diffMs = now - past;
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'just now';
  }

  isRecent(timestamp) {
    const past = new Date(timestamp);
    const now = new Date();
    const diffHours = (now - past) / (1000 * 60 * 60);
    
    return diffHours < 2; // Less than 2 hours is "recent"
  }

  async showSessionDetails(sessionId) {
    console.log(`📋 Session Details: ${sessionId}\n`);
    
    // Look for session in history
    const history = await ClaudeHelpers.loadSessionHistory();
    const session = history.find(s => s.sessionId === sessionId);
    
    if (!session) {
      console.log('❌ Session not found in history');
      return;
    }

    console.log(`🕐 Timestamp: ${ClaudeHelpers.formatTimestamp(new Date(session.timestamp))}`);
    console.log(`📝 Type: ${session.type}`);
    
    if (session.summary) {
      console.log('\n📊 Summary:');
      Object.entries(session.summary).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }

    // Look for archived session data
    const archivePath = `.claude/sessions/${sessionId}.json`;
    if (await ClaudeHelpers.fileExists(archivePath)) {
      console.log('\n📄 Full session data available in:');
      console.log(`   ${archivePath}`);
    }
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const history = new ClaudeHistory();
    
    if (args.length > 0) {
      // Show specific session details
      await history.showSessionDetails(args[0]);
    } else {
      // Show history overview
      await history.showHistory();
    }
    
    console.log('💡 Commands:');
    console.log('   npm run claude:history <session-id>  # Show session details');
    console.log('   npm run claude:reset --complete      # Clear all history');
    
  } catch (error) {
    console.error('❌ Error showing history:', error.message);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('claude-history.js')) {
  main();
}