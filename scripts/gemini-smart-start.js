// eslint-disable-next-line
import GeminiHelpers from './utils/gemini-helpers.js';
import { spawn } from 'child_process';
import path from 'path';
import { IAIProvider } from '../src/ai-providers/IAIProvider';
import { GeminiProvider } from '../src/ai-providers/GeminiProvider';
import { CodexProvider } from '../src/ai-providers/CodexProvider';

class GeminiSmartStart {
  constructor() {
    this.timestamp = new Date().toISOString();
  }

  async start(aiProviderInstance) {
    console.log('🤖 Gemini Smart Start - Analyzing session context...\n');
    
    // Check for handoff file
    const handoffExists = await GeminiHelpers.fileExists('AI_HANDOFF.json');
    
    if (handoffExists) {
      return await this.resumeSession(aiProviderInstance);
    } else {
      return await this.startNewSession(aiProviderInstance);
    }
  }

  async resumeSession(aiProviderInstance) {
    console.log('🔄 Handoff detected! Resuming previous session...\n');
    
    // Get handoff age to show user
    const handoff = await GeminiHelpers.readJsonSafe('CLAUDE_HANDOFF.json');
    const age = handoff ? this.calculateAge(handoff.timestamp) : 'unknown';
    
    console.log(`📝 Handoff created: ${age}`);
    console.log(`🎯 Previous task: ${handoff?.activeTask?.description || 'Unknown'}\n`);
    
    // Run the resume script
    return await this.runScript('gemini-resume.js', aiProviderInstance);
  }

  async startNewSession(aiProviderInstance) {
    console.log('🆕 No handoff found. Starting fresh session analysis...\n');
    
    // Check if this looks like a continued session (recent context files)
    const contextExists = await GeminiHelpers.fileExists('AI_CONTEXT.json');
    if (contextExists) {
      const context = await GeminiHelpers.readJsonSafe('CLAUDE_CONTEXT.json');
      const age = context ? this.calculateAge(context.timestamp) : null;
      
      if (age && this.isRecent(context.timestamp)) {
        console.log(`💭 Found recent context (${age}). Building on previous analysis...\n`);
      }
    }
    
    // Run the new session script
    return await this.runScript('gemini-session.js', aiProviderInstance);
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

  getAIProvider() {
    const activeProvider = process.env.ACTIVE_AI_PROVIDER || 'gemini';
    switch (activeProvider.toLowerCase()) {
      case 'gemini':
        console.log('Using Gemini AI Provider');
        return new GeminiProvider();
      case 'codex':
        console.log('Using Codex AI Provider');
        return new CodexProvider();
      // Add other providers here
      default:
        console.warn(`Unknown AI provider: ${activeProvider}. Defaulting to Gemini.`);
        return new GeminiProvider();
    }
  }

  async runScript(scriptName, aiProviderInstance) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'scripts', scriptName);
      const child = spawn('node', [scriptPath], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, ACTIVE_AI_PROVIDER: aiProviderInstance ? aiProviderInstance.constructor.name.replace('Provider', '').toLowerCase() : '' }
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
    const nodeVersion = await GeminiHelpers.execSafe('node --version');
    const inGitRepo = await GeminiHelpers.execSafe('git rev-parse --is-inside-work-tree');
    const packageExists = await GeminiHelpers.fileExists('package.json');
    
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
    const git = await GeminiHelpers.getGitStatus();
    const serverRunning = await GeminiHelpers.getServerStatus();
    
    console.log('📊 Quick Status:');
    console.log('   📋 Git: ' + git.branch + ' branch, ' + git.uncommittedFiles.length + ' uncommitted files');
    console.log(`   🌐 Dev Server: ${serverRunning.devServerRunning ? '✅ Running' : '❌ Stopped'} (port ${serverRunning.port})`);
    console.log('');
    
    return env.healthy;
  }
}

// Main execution
async function main() {
  try {
    const smartStart = new GeminiSmartStart();
    const aiProviderInstance = smartStart.getAIProvider();
    
    // Show pre-start info
    await smartStart.showPreStartInfo();
    
    // Run the appropriate script
    const result = await smartStart.start(aiProviderInstance);
    
    console.log('\n' + '✅ READY TO WORK WITH GEMINI!'.padStart(40));

    console.log('=' .repeat(60));
    console.log('📄 Context available in: CLAUDE_CONTEXT*.md');
    console.log('🚀 Start coding or ask Gemini for help!');
    
    // Clean up old handoff after successful resume
    if (await GeminiHelpers.fileExists('CLAUDE_HANDOFF.json')) {
      const handoff = await GeminiHelpers.readJsonSafe('CLAUDE_HANDOFF.json');
      if (handoff) {
        // Archive the handoff
        await GeminiHelpers.ensureDir('.gemini/archive');
        await GeminiHelpers.writeJsonSafe(`.gemini/archive/handoff-${handoff.sessionId}.json`, handoff);
        
        // Remove the active handoff (it's been processed)
        // Comment out removal for now to avoid issues
        // await fs.unlink('AI_HANDOFF.json');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error during smart start:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   - Make sure you\'re in the boardOS directory');
    console.log('   - Check that Node.js is installed (node --version)');
    console.log('   - Try running: npm install');
    console.log('   - For help: npm run gemini:status');
    process.exit(1);
  }
}

// Run smart start
if (process.argv[1] && process.argv[1].endsWith('gemini-smart-start.js')) {
  main();
}