import ClaudeHelpers from './utils/claude-helpers.js';

class ClaudeSetup {
  async setup() {
    console.log('🚀 Setting up Claude session management...\n');
    
    // Create necessary directories
    const dirs = [
      '.claude',
      '.claude/sessions', 
      '.claude/archive',
      '.claude/current'
    ];

    console.log('📁 Creating directories...');
    for (const dir of dirs) {
      await ClaudeHelpers.ensureDir(dir);
      console.log(`   ✅ ${dir}`);
    }

    // Create initial config files
    console.log('\n⚙️  Creating configuration files...');
    
    // Initialize history
    const historyPath = '.claude/history.json';
    if (!(await ClaudeHelpers.fileExists(historyPath))) {
      await ClaudeHelpers.writeJsonSafe(historyPath, { 
        sessions: [],
        created: new Date().toISOString(),
        version: '1.0.0'
      });
      console.log('   ✅ .claude/history.json');
    } else {
      console.log('   ⚪ .claude/history.json (already exists)');
    }

    // Create .gitignore entries
    console.log('\n📝 Updating .gitignore...');
    await this.updateGitignore();

    // Create sample context
    console.log('\n📊 Running initial analysis...');
    try {
      const result = await ClaudeHelpers.execSafe('npm run claude:start');
      if (result.success) {
        console.log('   ✅ Initial context generated');
      } else {
        console.log('   ⚠️  Initial analysis had issues (normal for first run)');
      }
    } catch (error) {
      console.log('   ⚠️  Could not run initial analysis (will work after setup)');
    }

    return true;
  }

  async updateGitignore() {
    const gitignoreEntries = [
      '',
      '# Claude session management',
      'CLAUDE_CONTEXT.json',
      'CLAUDE_CONTEXT.md', 
      'CLAUDE_HANDOFF.json',
      'CLAUDE_HANDOFF.md',
      'CLAUDE_CONTEXT_RESUMED.json',
      'CLAUDE_CONTEXT_RESUMED.md',
      '.claude/current/',
      '.claude/last-status.json'
    ];

    try {
      let gitignoreContent = '';
      
      if (await ClaudeHelpers.fileExists('.gitignore')) {
        const content = await ClaudeHelpers.readJsonSafe('.gitignore');
        gitignoreContent = typeof content === 'string' ? content : '';
      }

      // Check if our entries are already there
      const hasClaudeEntries = gitignoreContent.includes('# Claude session management');
      
      if (!hasClaudeEntries) {
        gitignoreContent += '\n' + gitignoreEntries.join('\n') + '\n';
        
        // Write back to .gitignore (need to handle as text file)
        const fs = await import('fs/promises');
        await fs.writeFile('.gitignore', gitignoreContent);
        console.log('   ✅ Added Claude entries to .gitignore');
      } else {
        console.log('   ⚪ .gitignore already has Claude entries');
      }
    } catch (error) {
      console.log('   ⚠️  Could not update .gitignore (manual step needed)');
      console.log('       Add these lines to .gitignore:');
      gitignoreEntries.forEach(line => line && console.log(`       ${line}`));
    }
  }

  async verifySetup() {
    console.log('\n🔍 Verifying setup...');
    
    const checks = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'npm', command: 'npm --version' },
      { name: 'Git', command: 'git --version' },
      { name: 'package.json', file: 'package.json' },
      { name: 'Scripts directory', file: 'scripts' },
      { name: 'Claude directory', file: '.claude' }
    ];

    let allGood = true;

    for (const check of checks) {
      if (check.command) {
        const result = await ClaudeHelpers.execSafe(check.command);
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${check.name}: ${result.success ? result.stdout : 'Not found'}`);
        if (!result.success) allGood = false;
      } else if (check.file) {
        const exists = await ClaudeHelpers.fileExists(check.file);
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} ${check.name}: ${exists ? 'Found' : 'Missing'}`);
        if (!exists) allGood = false;
      }
    }

    return allGood;
  }

  showUsageInstructions() {
    console.log(`
🎉 Claude Session Management Setup Complete!

📚 How to use:

  🚀 Start any Claude session:
    npm run claude:start
    
  ⚡ Quick status check:
    npm run claude:status
    
  🔄 When Claude hits token limit:
    npm run claude:handoff
    
  📚 Show session history:
    npm run claude:history
    
  🔄 Reset everything:
    npm run claude:reset

🏗️  What was created:
  - .claude/ directory with session storage
  - Claude scripts in scripts/ directory  
  - Updated package.json with npm scripts
  - Updated .gitignore to exclude temp files

✨ You're all set! Run 'npm run claude:start' to begin.
`);
  }
}

async function main() {
  try {
    console.log('🤖 Claude Session Management Setup');
    console.log('=' .repeat(40));
    
    const setup = new ClaudeSetup();
    
    // Run setup
    await setup.setup();
    
    // Verify everything works
    const isValid = await setup.verifySetup();
    
    if (isValid) {
      console.log('\n' + '🎉 SETUP SUCCESSFUL!'.padStart(30));
      console.log('=' .repeat(40));
      setup.showUsageInstructions();
    } else {
      console.log('\n❌ Setup completed with some issues.');
      console.log('   Check the verification results above.');
      console.log('   The scripts should still work, but some features may be limited.');
    }
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n💡 Try:');
    console.log('   - Make sure you\'re in the project root directory');
    console.log('   - Check that you have write permissions');
    console.log('   - Run: npm install (to ensure dependencies are available)');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}