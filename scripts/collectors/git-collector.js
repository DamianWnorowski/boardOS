/**
 * Git Context Collector
 * Analyzes git repository state and recent development activity
 */

import ClaudeHelpers from '../utils/claude-helpers.js';

export class GitCollector {
  constructor() {
    this.name = 'GitCollector';
    this.version = '1.0.0';
  }

  /**
   * Collect comprehensive git context
   */
  async collect() {
    const startTime = Date.now();
    
    try {
      // Gather all git information in parallel
      const [
        status,
        branch,
        lastCommit,
        recentCommits,
        uncommitted,
        untracked,
        staged,
        unpushed,
        stashList,
        branchInfo
      ] = await Promise.all([
        this.getStatus(),
        this.getCurrentBranch(),
        this.getLastCommit(),
        this.getRecentCommits(10),
        this.getUncommittedChanges(),
        this.getUntrackedFiles(),
        this.getStagedChanges(),
        this.getUnpushedCommits(),
        this.getStashList(),
        this.getBranchInfo()
      ]);

      const context = {
        metadata: {
          collector: this.name,
          version: this.version,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime
        },
        
        repository: {
          branch: branch || 'unknown',
          lastCommit: lastCommit || 'No commits',
          isClean: !uncommitted.length && !untracked.length && !staged.length,
          hasUnpushedCommits: unpushed.length > 0,
          hasStashes: stashList.length > 0
        },
        
        changes: {
          uncommitted: this.analyzeFileChanges(uncommitted),
          staged: this.analyzeFileChanges(staged),
          untracked: untracked
        },
        
        history: {
          recent: recentCommits,
          unpushed: unpushed,
          stashes: stashList
        },
        
        analysis: {
          developmentPattern: this.analyzeDevelopmentPattern(recentCommits, uncommitted),
          riskLevel: this.calculateRiskLevel(uncommitted, staged, unpushed),
          workingArea: this.identifyWorkingArea(uncommitted, staged)
        },
        
        insights: {
          suggestions: this.generateSuggestions(uncommitted, staged, unpushed, stashList),
          warnings: this.identifyWarnings(uncommitted, unpushed)
        }
      };

      return context;
      
    } catch (error) {
      return {
        error: error.message,
        collector: this.name,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get git status
   */
  async getStatus() {
    const result = await ClaudeHelpers.execSafe('git status --porcelain');
    return result.stdout || '';
  }

  /**
   * Get current branch
   */
  async getCurrentBranch() {
    const result = await ClaudeHelpers.execSafe('git branch --show-current');
    return result.stdout || 'unknown';
  }

  /**
   * Get last commit information
   */
  async getLastCommit() {
    const result = await ClaudeHelpers.execSafe('git log -1 --oneline');
    return result.stdout || 'No commits';
  }

  /**
   * Get recent commits
   */
  async getRecentCommits(count = 10) {
    const result = await ClaudeHelpers.execSafe(`git log -${count} --oneline --date=relative --pretty=format:"%h %s (%cr)"`);
    if (!result.stdout) return [];
    
    return result.stdout.split('\n').map(line => {
      const match = line.match(/^(\w+)\s(.+?)\s\((.+?)\)$/);
      if (match) {
        return {
          hash: match[1],
          message: match[2],
          timeAgo: match[3]
        };
      }
      return { hash: '', message: line, timeAgo: '' };
    });
  }

  /**
   * Get uncommitted changes
   */
  async getUncommittedChanges() {
    const result = await ClaudeHelpers.execSafe('git diff --name-only');
    return result.stdout ? result.stdout.split('\n').filter(f => f) : [];
  }

  /**
   * Get untracked files
   */
  async getUntrackedFiles() {
    const result = await ClaudeHelpers.execSafe('git ls-files --others --exclude-standard');
    return result.stdout ? result.stdout.split('\n').filter(f => f) : [];
  }

  /**
   * Get staged changes
   */
  async getStagedChanges() {
    const result = await ClaudeHelpers.execSafe('git diff --cached --name-only');
    return result.stdout ? result.stdout.split('\n').filter(f => f) : [];
  }

  /**
   * Get unpushed commits
   */
  async getUnpushedCommits() {
    const result = await ClaudeHelpers.execSafe('git log @{u}..HEAD --oneline 2>/dev/null || echo ""');
    return result.stdout ? result.stdout.split('\n').filter(c => c) : [];
  }

  /**
   * Get stash list
   */
  async getStashList() {
    const result = await ClaudeHelpers.execSafe('git stash list');
    return result.stdout ? result.stdout.split('\n').filter(s => s) : [];
  }

  /**
   * Get branch information
   */
  async getBranchInfo() {
    const ahead = await ClaudeHelpers.execSafe('git rev-list --count @{u}..HEAD 2>/dev/null || echo "0"');
    const behind = await ClaudeHelpers.execSafe('git rev-list --count HEAD..@{u} 2>/dev/null || echo "0"');
    
    return {
      ahead: parseInt(ahead.stdout) || 0,
      behind: parseInt(behind.stdout) || 0
    };
  }

  /**
   * Analyze file changes to categorize them
   */
  analyzeFileChanges(files) {
    const analysis = {
      total: files.length,
      byType: {
        components: files.filter(f => f.includes('components/') && f.endsWith('.tsx')).length,
        services: files.filter(f => f.includes('services/') && f.endsWith('.ts')).length,
        utils: files.filter(f => f.includes('utils/') && f.endsWith('.ts')).length,
        tests: files.filter(f => f.includes('test') || f.includes('spec')).length,
        configs: files.filter(f => f.includes('config') || f.endsWith('.json')).length,
        styles: files.filter(f => f.endsWith('.css') || f.endsWith('.scss')).length,
        docs: files.filter(f => f.endsWith('.md')).length
      },
      critical: files.filter(f => 
        f.includes('DatabaseService') || 
        f.includes('SchedulerContext') ||
        f.includes('package.json') ||
        f.includes('tsconfig')
      )
    };

    return analysis;
  }

  /**
   * Analyze development pattern from recent activity
   */
  analyzeDevelopmentPattern(recentCommits, uncommittedFiles) {
    if (recentCommits.length === 0) return 'UNKNOWN';
    
    const commitMessages = recentCommits.map(c => c.message.toLowerCase());
    const hasTestFiles = uncommittedFiles.some(f => f.includes('test'));
    
    // Bug fixing pattern
    if (commitMessages.some(msg => msg.includes('fix') || msg.includes('bug'))) {
      return hasTestFiles ? 'BUG_FIXING_WITH_TESTS' : 'BUG_FIXING';
    }
    
    // Feature development pattern
    if (commitMessages.some(msg => msg.includes('add') || msg.includes('feature') || msg.includes('implement'))) {
      return 'FEATURE_DEVELOPMENT';
    }
    
    // Refactoring pattern
    if (commitMessages.some(msg => msg.includes('refactor') || msg.includes('improve') || msg.includes('clean'))) {
      return 'REFACTORING';
    }
    
    // Test writing pattern
    if (commitMessages.some(msg => msg.includes('test')) || hasTestFiles) {
      return 'TEST_DEVELOPMENT';
    }
    
    return 'GENERAL_DEVELOPMENT';
  }

  /**
   * Calculate risk level based on changes
   */
  calculateRiskLevel(uncommitted, staged, unpushed) {
    let risk = 0;
    
    // Risk from uncommitted changes
    risk += uncommitted.length * 0.1;
    
    // Risk from critical file changes
    const criticalFiles = [...uncommitted, ...staged].filter(f => 
      f.includes('DatabaseService') || 
      f.includes('SchedulerContext') ||
      f.includes('package.json')
    );
    risk += criticalFiles.length * 0.3;
    
    // Risk from unpushed commits
    risk += unpushed.length * 0.2;
    
    if (risk < 0.3) return 'LOW';
    if (risk < 0.7) return 'MEDIUM';
    if (risk < 1.2) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Identify primary working area
   */
  identifyWorkingArea(uncommitted, staged) {
    const allFiles = [...uncommitted, ...staged];
    
    if (allFiles.some(f => f.includes('test'))) return 'TESTING';
    if (allFiles.some(f => f.includes('components/'))) return 'UI_COMPONENTS';
    if (allFiles.some(f => f.includes('services/'))) return 'BACKEND_SERVICES';
    if (allFiles.some(f => f.includes('utils/'))) return 'UTILITIES';
    if (allFiles.some(f => f.includes('context/'))) return 'STATE_MANAGEMENT';
    if (allFiles.length > 0) return 'MIXED';
    
    return 'NONE';
  }

  /**
   * Generate suggestions based on git state
   */
  generateSuggestions(uncommitted, staged, unpushed, stashes) {
    const suggestions = [];
    
    if (uncommitted.length > 5) {
      suggestions.push({
        type: 'COMMIT_CHANGES',
        priority: 'medium',
        message: `You have ${uncommitted.length} uncommitted files. Consider committing related changes together.`,
        action: 'Review and commit changes in logical groups'
      });
    }
    
    if (staged.length > 0 && uncommitted.length === 0) {
      suggestions.push({
        type: 'COMPLETE_COMMIT',
        priority: 'high',
        message: `You have ${staged.length} staged files ready to commit.`,
        action: 'Complete the commit with a descriptive message'
      });
    }
    
    if (unpushed.length > 3) {
      suggestions.push({
        type: 'PUSH_COMMITS',
        priority: 'medium',
        message: `You have ${unpushed.length} unpushed commits.`,
        action: 'Push commits to share progress and backup work'
      });
    }
    
    if (stashes.length > 0) {
      suggestions.push({
        type: 'REVIEW_STASHES',
        priority: 'low',
        message: `You have ${stashes.length} stashed change(s).`,
        action: 'Review stashes and apply or drop as needed'
      });
    }
    
    return suggestions;
  }

  /**
   * Identify potential warnings
   */
  identifyWarnings(uncommitted, unpushed) {
    const warnings = [];
    
    // Check for risky file combinations
    const hasDbChanges = uncommitted.some(f => f.includes('DatabaseService') || f.includes('migration'));
    const hasTestChanges = uncommitted.some(f => f.includes('test'));
    
    if (hasDbChanges && !hasTestChanges) {
      warnings.push({
        type: 'DATABASE_WITHOUT_TESTS',
        severity: 'medium',
        message: 'Database changes detected without corresponding test updates',
        recommendation: 'Consider adding or updating tests for database changes'
      });
    }
    
    if (unpushed.length > 10) {
      warnings.push({
        type: 'MANY_UNPUSHED_COMMITS',
        severity: 'high',
        message: `${unpushed.length} unpushed commits detected`,
        recommendation: 'Push commits to avoid potential loss and enable collaboration'
      });
    }
    
    return warnings;
  }
}

export default GitCollector;