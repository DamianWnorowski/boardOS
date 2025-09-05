import GeminiHelpers from './utils/gemini-helpers.js';

class GeminiStatus {
  async getQuickStatus() {
    // Run lightweight checks in parallel with error handling
    const [git, server] = await Promise.all([
      GeminiHelpers.getGitStatus().catch(err => ({ error: err.message, branch: 'unknown', uncommittedFiles: [] })),
      GeminiHelpers.getServerStatus().catch(err => ({ error: err.message, devServerRunning: false, port: 'unknown' }))
    ]);

    // Get test and lint status (but don't run full analysis)
    const testResult = await GeminiHelpers.execSafe('npm test -- --run --reporter=min', { timeout: 15000 });
    const lintResult = await GeminiHelpers.execSafe('npx eslint . --format compact', { timeout: 15000 });

    return {
      timestamp: new Date().toISOString(),
      git,
      server,
      tests: this.parseQuickTestResults(testResult),
      lint: this.parseQuickLintResults(lintResult),
      handoffExists: await GeminiHelpers.fileExists('CLAUDE_HANDOFF.json'),
      contextExists: await GeminiHelpers.fileExists('CLAUDE_CONTEXT.json')
    };
  }

  parseQuickTestResults(result) {
    if (!result.success) {
      return { running: false, error: result.stderr };
    }

    const output = result.stdout;
    const passingMatch = output.match(/(\d+) passed/i);
    const failingMatch = output.match(/(\d+) failed/i);

    return {
      running: true,
      passing: passingMatch ? parseInt(passingMatch[1]) : 0,
      failing: failingMatch ? parseInt(failingMatch[1]) : 0,
      summary: output.split('\n').find(line => line.includes('Tests') || line.includes('passed') || line.includes('failed')) || 'Unknown'
    };
  }

  parseQuickLintResults(result) {
    const output = result.stderr || result.stdout || '';
    const problemsMatch = output.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
    
    if (problemsMatch) {
      return {
        total: parseInt(problemsMatch[1]),
        errors: parseInt(problemsMatch[2]),
        warnings: parseInt(problemsMatch[3])
      };
    }

    return { total: 0, errors: 0, warnings: 0 };
  }

  formatQuickStatus(status) {
    const icons = {
      good: '🟢',
      warning: '🟡', 
      error: '🔴'
    };

    // Determine status icons
    const testIcon = status.tests.running 
      ? (status.tests.failing === 0 ? icons.good : status.tests.failing < 10 ? icons.warning : icons.error)
      : icons.error;

    const lintIcon = status.lint.errors < 50 ? icons.good : status.lint.errors < 200 ? icons.warning : icons.error;
    const gitIcon = status.git.uncommittedFiles.length < 3 ? icons.good : icons.warning;
    const serverIcon = status.server.devServerRunning ? icons.good : icons.error;

    return `
🤖 BoardOS Quick Status - ${GeminiHelpers.formatTimestamp()}

${testIcon} Tests: ${status.tests.passing || 0}/${(status.tests.passing || 0) + (status.tests.failing || 0)} passing
${lintIcon} ESLint: ${status.lint.errors} errors, ${status.lint.warnings} warnings  
${gitIcon} Git: ${status.git.branch} (${status.git.uncommittedFiles.length} uncommitted)
${serverIcon} Server: ${status.server.devServerRunning ? 'Running' : 'Stopped'} on port ${status.server.port}

Session: ${status.handoffExists ? '🔄 Handoff available' : status.contextExists ? '📊 Context available' : '🆕 No context'}

💡 Commands:
  npm run gemini:start     # Full context for AI
  npm run gemini:handoff   # Save session state  
  npm run dev             # Start development server
  npm test               # Run full test suite
`;
  }
}

async function main() {
  try {
    const status = new GeminiStatus();
    const quickStatus = await status.getQuickStatus();
    
    console.log(status.formatQuickStatus(quickStatus));
    
    // Save status for reference
    await GeminiHelpers.writeJsonSafe('.gemini/last-status.json', quickStatus);
    
  } catch (error) {
    console.error('❌ Error getting status:', error.message);
    process.exit(1);
  }
}

// Fix for Windows path handling in ES modules
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const scriptPath = resolve(process.argv[1]);

if (__filename === scriptPath) {
  main();
}