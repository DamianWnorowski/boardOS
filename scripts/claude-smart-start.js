import ClaudeHelpers from './utils/claude-helpers.js';
import { spawn } from 'child_process';
import path from 'path';

class ClaudeSmartStart {
  constructor() {
    this.timestamp = new Date().toISOString();
  }

  async start() {
    console.log('🤖 Claude Smart Start - Analyzing session context...\n');
    
    // Check for handoff file
    const handoffExists = await ClaudeHelpers.fileExists('CLAUDE_HANDOFF.json');
    
    if (handoffExists) {
      return await this.resumeSession();
    } else {
      return await this.startNewSession();
    }
  }

  async resumeSession() {
    console.log('🔄 Handoff detected! Resuming previous session...\n');
    
    // Get handoff age to show user
    const handoff = await ClaudeHelpers.readJsonSafe('CLAUDE_HANDOFF.json');
    const age = handoff ? this.calculateAge(handoff.timestamp) : 'unknown';
    
    console.log(`📝 Handoff created: ${age}`);
    console.log(`🎯 Previous task: ${handoff?.activeTask?.description || 'Unknown'}\n`);
    
    // Run the resume script
    return await this.runScript('claude-resume.js');
  }

  async startNewSession() {
    console.log('🆕 No handoff found. Starting fresh session analysis...\n');
    
    // Check if this looks like a continued session (recent context files)
    const contextExists = await ClaudeHelpers.fileExists('CLAUDE_CONTEXT.json');
    if (contextExists) {
      const context = await ClaudeHelpers.readJsonSafe('CLAUDE_CONTEXT.json');
      const age = context ? this.calculateAge(context.timestamp) : null;
      
      if (age && this.isRecent(context.timestamp)) {
        console.log(`💭 Found recent context (${age}). Building on previous analysis...\n`);
      }
    }
    
    // Run the new session script
    return await this.runScript('claude-session.js');
  }

  calculateAge(timestamp) {
    const past = new Date(timestamp);
    const now = new Date();
    const diffMs = now - past;
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return 'just now';
  }

  isRecent(timestamp) {
    const past = new Date(timestamp);
    const now = new Date();
    const diffHours = (now - past) / (1000 * 60 * 60);
    
    return diffHours < 24; // Less than 24 hours is "recent"
  }

  async runScript(scriptName) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'scripts', scriptName);
      const child = spawn('node', [scriptPath], {
        stdio: 'inherit',
        shell: true
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code });
        } else {
          reject(new Error(`Script ${scriptName} exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkEnvironment() {
    // Quick environment checks
    const nodeVersion = await ClaudeHelpers.execSafe('node --version');
    const inGitRepo = await ClaudeHelpers.execSafe('git rev-parse --is-inside-work-tree');
    const packageExists = await ClaudeHelpers.fileExists('package.json');
    
    const issues = [];
    
    if (!nodeVersion.success) {
      issues.push('❌ Node.js not found');
    }
    
    if (!inGitRepo.success) {
      issues.push('⚠️  Not in a git repository');
    }
    
    if (!packageExists) {
      issues.push('❌ package.json not found');
    }
    
    return { issues, healthy: issues.length === 0 };
  }

  async showPreStartInfo() {
    console.log('🔍 Quick environment check...');
    
    const env = await this.checkEnvironment();
    
    if (env.issues.length > 0) {
      console.log('\n⚠️  Environment Issues:');
      env.issues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
    }
    
    // Show quick stats
    const git = await ClaudeHelpers.getGitStatus();
    const serverRunning = await ClaudeHelpers.getServerStatus();
    
    console.log('📊 Quick Status:');
    console.log(`   📋 Git: ${git.branch} branch, ${git.uncommittedFiles.length} uncommitted files`);
    console.log(`   🌐 Dev Server: ${serverRunning.devServerRunning ? '✅ Running' : '❌ Stopped'} (port ${serverRunning.port})`);
    console.log('');
    
    return env.healthy;
  }
}

// Main execution
async function main() {
  try {
    const smartStart = new ClaudeSmartStart();
    
    // Show pre-start info
    await smartStart.showPreStartInfo();
    
    // Run the appropriate script
    const result = await smartStart.start();
    
    console.log('\n' + '✅ READY TO WORK WITH CLAUDE!'.padStart(40));
    console.log('=' .repeat(60));
    console.log('📄 Context available in: CLAUDE_CONTEXT*.md');
    console.log('🚀 Start coding or ask Claude for help!');
    
    // Clean up old handoff after successful resume
    if (await ClaudeHelpers.fileExists('CLAUDE_HANDOFF.json')) {
      const handoff = await ClaudeHelpers.readJsonSafe('CLAUDE_HANDOFF.json');
      if (handoff) {
        // Archive the handoff
        await ClaudeHelpers.ensureDir('.claude/archive');
        await ClaudeHelpers.writeJsonSafe(`.claude/archive/handoff-${handoff.sessionId}.json`, handoff);
        
        // Remove the active handoff (it's been processed)
        // Comment out removal for now to avoid issues
        // await fs.unlink('CLAUDE_HANDOFF.json');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error during smart start:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   - Make sure you\'re in the boardOS directory');
    console.log('   - Check that Node.js is installed (node --version)');
    console.log('   - Try running: npm install');
    console.log('   - For help: npm run claude:status');
    process.exit(1);
  }
}

// Run smart start
if (process.argv[1] && process.argv[1].endsWith('claude-smart-start.js')) {
  main();
}