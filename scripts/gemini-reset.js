import GeminiHelpers from './utils/gemini-helpers.js';
import fs from 'fs/promises';

class GeminiReset {
  async reset(options = {}) {
    console.log('🔄 Resetting Gemini session data...\n');
    
    const filesToRemove = [];
    const filesToArchive = [];
    
    // Check what exists
    if (await GeminiHelpers.fileExists('CLAUDE_HANDOFF.json')) {
      filesToArchive.push('CLAUDE_HANDOFF.json');
    }
    
    if (await GeminiHelpers.fileExists('CLAUDE_CONTEXT.json')) {
      filesToArchive.push('CLAUDE_CONTEXT.json');
    }
    
    if (await GeminiHelpers.fileExists('CLAUDE_CONTEXT.md')) {
      filesToRemove.push('CLAUDE_CONTEXT.md');
    }
    
    if (await GeminiHelpers.fileExists('CLAUDE_CONTEXT_RESUMED.json')) {
      filesToArchive.push('CLAUDE_CONTEXT_RESUMED.json');
    }
    
    if (await GeminiHelpers.fileExists('CLAUDE_CONTEXT_RESUMED.md')) {
      filesToRemove.push('CLAUDE_CONTEXT_RESUMED.md');
    }
    
    if (await GeminiHelpers.fileExists('CLAUDE_HANDOFF.md')) {
      filesToRemove.push('CLAUDE_HANDOFF.md');
    }

    // Archive important files before removing
    if (filesToArchive.length > 0 && !options.skipArchive) {
      console.log('📦 Archiving session data...');
      await GeminiHelpers.ensureDir('.gemini/archive');
      
      for (const file of filesToArchive) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveName = `.gemini/archive/${timestamp}-${file}`;
        
        try {
          const content = await GeminiHelpers.readJsonSafe(file);
          await GeminiHelpers.writeJsonSafe(archiveName, content);
          console.log(`   ✅ Archived: ${file} → ${archiveName}`);
        } catch (error) {
          console.log(`   ⚠️  Failed to archive: ${file}`);
        }
      }
    }

    // Remove files
    const allFiles = [...filesToRemove, ...filesToArchive];
    if (allFiles.length > 0) {
      console.log('\n🗑️  Cleaning up session files...');
      
      for (const file of allFiles) {
        try {
          await fs.unlink(file);
          console.log(`   ✅ Removed: ${file}`);
        } catch (error) {
          console.log(`   ⚠️  Failed to remove: ${file}`);
        }
      }
    }

    // Clear session history if requested
    if (options.clearHistory) {
      console.log('\n🗂️  Clearing session history...');
      try {
        const emptyHistory = { sessions: [] };
        await GeminiHelpers.writeJsonSafe('.gemini/history.json', emptyHistory);
        console.log('   ✅ Session history cleared');
      } catch (error) {
        console.log('   ⚠️  Failed to clear history');
      }
    }

    // Clean up temporary files
    const tempFiles = [
      '.gemini/last-status.json',
      '.gemini/current/context.json'
    ];

    console.log('\n🧹 Cleaning temporary files...');
    for (const file of tempFiles) {
      try {
        if (await GeminiHelpers.fileExists(file)) {
          await fs.unlink(file);
          console.log(`   ✅ Removed: ${file}`);
        }
      } catch (error) {
        // Silent fail for temp files
      }
    }

    return {
      filesArchived: filesToArchive.length,
      filesRemoved: allFiles.length,
      historyCleared: options.clearHistory
    };
  }

  async showResetOptions() {
    console.log(`
🔄 Gemini Reset Options:

Basic reset (recommended):
  npm run gemini:reset

Complete reset (clears everything):
  npm run gemini:reset -- --complete

What gets reset:
  ✅ CLAUDE_HANDOFF.json (archived first)
  ✅ CLAUDE_CONTEXT.json (archived first) 
  ✅ Generated .md files (removed)
  ✅ Temporary status files (removed)
  
With --complete:
  ✅ All session history (cleared)
  ✅ All archived files (removed)

Safe to run - your source code is never touched!
`);
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const options = {
      clearHistory: args.includes('--complete') || args.includes('--clear-history'),
      skipArchive: args.includes('--no-archive'),
      help: args.includes('--help') || args.includes('-h')
    };

    if (options.help) {
      const reset = new GeminiReset();
      await reset.showResetOptions();
      return;
    }

    const reset = new GeminiReset();
    const result = await reset.reset(options);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 AI RESET COMPLETE');
    console.log('='.repeat(50));
    console.log(`📦 Files archived: ${result.filesArchived}`);
    console.log(`🗑️  Files removed: ${result.filesRemoved}`);
    console.log(`🗂️  History cleared: ${result.historyCleared ? 'Yes' : 'No'}`);
    console.log('='.repeat(50));
    console.log('\n✨ Ready for fresh Gemini session!');
    console.log('💡 Run: npm run gemini:start');
    
  } catch (error) {
    console.error('❌ Error during reset:', error.message);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('gemini-reset.js')) {
  main();
}