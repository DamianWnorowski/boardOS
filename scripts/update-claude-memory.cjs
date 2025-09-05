#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Update CLAUDE.md with latest changes from git commits
 * This keeps the AI context file fresh and informative
 */

class ClaudeMemoryUpdater {
  constructor() {
    this.claudeFile = path.join(__dirname, '..', 'CLAUDE.md');
    this.maxRecentCommits = 5;
  }

  /**
   * Update CLAUDE.md with latest project state
   */
  async updateMemory() {
    console.log('🧠 Updating Claude memory...');
    
    try {
      // Get current CLAUDE.md content
      let currentContent = '';
      if (fs.existsSync(this.claudeFile)) {
        currentContent = await fs.promises.readFile(this.claudeFile, 'utf-8');
      }
      
      // Get recent changes
      const recentChanges = this.getRecentChanges();
      const projectStats = await this.getProjectStats();
      const criticalFiles = this.getCriticalFileUpdates();
      
      // Update memory sections
      const updatedContent = this.updateMemoryContent(
        currentContent,
        recentChanges,
        projectStats,
        criticalFiles
      );
      
      // Write updated content
      await fs.promises.writeFile(this.claudeFile, updatedContent);
      
      console.log('✅ Claude memory updated successfully');
      
    } catch (error) {
      console.error('❌ Failed to update Claude memory:', error.message);
      // Don't fail the commit for memory update issues
    }
  }

  /**
   * Get recent git changes
   */
  getRecentChanges() {
    try {
      const commits = execSync(
        `git log --oneline -${this.maxRecentCommits} --pretty=format:"%h - %s (%cr)"`,
        { encoding: 'utf-8', cwd: path.join(__dirname, '..') }
      ).trim();
      
      return commits.split('\n');
    } catch (error) {
      console.log('No git history available');
      return [];
    }
  }

  /**
   * Get current project statistics
   */
  async getProjectStats() {
    const srcDir = path.join(__dirname, '..', 'src');
    const stats = {
      components: 0,
      hooks: 0,
      contexts: 0,
      services: 0,
      totalFiles: 0,
      linesOfCode: 0
    };

    const countFiles = async (dir, category = null) => {
      try {
        const items = await fs.promises.readdir(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = await fs.promises.stat(fullPath);
          
          if (stat.isDirectory()) {
            let subCategory = category;
            if (item === 'components') subCategory = 'components';
            else if (item === 'hooks') subCategory = 'hooks';
            else if (item === 'context') subCategory = 'contexts';
            else if (item === 'services') subCategory = 'services';
            
            await countFiles(fullPath, subCategory);
          } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
            stats.totalFiles++;
            
            if (category) {
              stats[category]++;
            }
            
            // Count lines of code
            const content = await fs.promises.readFile(fullPath, 'utf-8');
            stats.linesOfCode += content.split('\n').length;
          }
        }
      } catch (error) {
        // Skip directories that don't exist
      }
    };

    await countFiles(srcDir);
    return stats;
  }

  /**
   * Get updates to critical files
   */
  getCriticalFileUpdates() {
    const criticalFiles = [
      'src/context/SchedulerContext.tsx',
      'src/services/DatabaseService.ts',
      'src/components/resources/AssignmentCard.tsx',
      'src/utils/colorSystem.ts'
    ];
    
    const updates = [];
    
    for (const file of criticalFiles) {
      try {
        const lastModified = execSync(
          `git log -1 --pretty=format:"%cr" -- ${file}`,
          { encoding: 'utf-8', cwd: path.join(__dirname, '..') }
        ).trim();
        
        if (lastModified) {
          updates.push({
            file,
            lastModified
          });
        }
      } catch (error) {
        // File might not exist or have git history
      }
    }
    
    return updates;
  }

  /**
   * Update CLAUDE.md content with new information
   */
  updateMemoryContent(currentContent, recentChanges, stats, criticalFiles) {
    const now = new Date().toISOString().split('T')[0];
    
    // Find the recent fixes section or create it
    let updatedContent = currentContent;
    
    // Update recent fixes section
    const recentFixesSection = `## Recent Fixes (${now})

### Latest Changes
${recentChanges.map(change => `- ${change}`).join('\n')}

### Project Statistics
- **Total Files**: ${stats.totalFiles}
- **Components**: ${stats.components}
- **Hooks**: ${stats.hooks}
- **Contexts**: ${stats.contexts}
- **Services**: ${stats.services}
- **Lines of Code**: ${stats.linesOfCode.toLocaleString()}

### Critical File Updates
${criticalFiles.map(file => `- **${file.file}**: Updated ${file.lastModified}`).join('\n')}

`;

    // Replace existing recent fixes or add new section
    const recentFixesRegex = /## Recent Fixes \([^)]+\)[\s\S]*?(?=##|$)/;
    if (recentFixesRegex.test(updatedContent)) {
      updatedContent = updatedContent.replace(recentFixesRegex, recentFixesSection);
    } else {
      // Add after project overview
      const overviewIndex = updatedContent.indexOf('## Key Features');
      if (overviewIndex !== -1) {
        updatedContent = 
          updatedContent.slice(0, overviewIndex) + 
          recentFixesSection + 
          updatedContent.slice(overviewIndex);
      } else {
        updatedContent = recentFixesSection + updatedContent;
      }
    }
    
    return updatedContent;
  }
}

// CLI execution
if (require.main === module) {
  const updater = new ClaudeMemoryUpdater();
  updater.updateMemory().catch(console.error);
}

module.exports = ClaudeMemoryUpdater;