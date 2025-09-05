#!/usr/bin/env node

/**
 * AI Context Agent - Intelligently analyzes project state and provides
 * comprehensive context for AI assistants
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import GeminiHelpers from './utils/gemini-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AIContextAgent {
  constructor(options = {}) {
    this.timestamp = new Date().toISOString();
    this.sessionId = this.generateSessionId();
    this.options = {
      verbose: options.verbose || false,
      analyze: options.analyze || false,
      watch: options.watch || false,
      learn: options.learn || false,
      ...options
    };
    
    // Context collectors
    this.collectors = {
      git: null,
      test: null,
      lint: null,
      code: null,
      database: null,
      business: null
    };
    
    // Intelligence components
    this.intelligence = {
      taskInference: null,
      patternRecognition: null,
      priorityCalculator: null
    };
    
    // Memory system
    this.memory = {
      contextHistory: [],
      sessionData: {},
      learningData: {}
    };
  }

  /**
   * Main execution method - orchestrates all context gathering and analysis
   */
  async execute() {
    const startTime = Date.now();
    
    try {
      this.log('🤖 AI Context Agent - Starting intelligent analysis...');
      
      // Phase 1: Initialize collectors
      await this.initializeCollectors();
      
      // Phase 2: Gather raw context data
      const rawContext = await this.gatherRawContext();
      
      // Phase 3: Apply intelligence layer
      const intelligentContext = await this.analyzeContext(rawContext);
      
      // Phase 4: Package for AI consumption
      const packagedContext = await this.packageContext(intelligentContext);
      
      // Phase 5: Save and output results
      await this.saveContext(packagedContext);
      
      const duration = Date.now() - startTime;
      this.log(`✅ Context analysis completed in ${duration}ms`);
      
      if (this.options.verbose) {
        this.outputContext(packagedContext);
      }
      
      return packagedContext;
      
    } catch (error) {
      this.log(`❌ Error in AI Context Agent: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Initialize all context collectors
   */
  async initializeCollectors() {
    this.log('📋 Initializing context collectors...');
    
    const collectorsToInitialize = ['git', 'test', 'lint', 'code', 'database', 'business'];
    let successCount = 0;
    
    for (const collectorName of collectorsToInitialize) {
      try {
        const collectorModule = await import(`./collectors/${collectorName}-collector.js`);
        const CollectorClass = Object.values(collectorModule)[0];
        
        this.collectors[collectorName] = new CollectorClass();
        successCount++;
        this.log(`✅ ${collectorName} collector initialized`);
        
      } catch (error) {
        this.log(`⚠️  ${collectorName} collector failed, using fallback: ${error.message}`, 'warn');
        
        // Fallback collectors
        switch (collectorName) {
          case 'git':
            this.collectors.git = { 
              collect: async () => {
                                const data = await GeminiHelpers.getGitStatus();
                return { ...data, fallback: true };
              }
            };
            break;
          case 'test':
            this.collectors.test = { 
              collect: async () => {
                const data = await GeminiHelpers.getTestStatus();
                return { ...data, fallback: true };
              }
            };
            break;
          case 'lint':
            this.collectors.lint = { 
              collect: async () => {
                const data = await GeminiHelpers.getLintStatus();
                return { ...data, fallback: true };
              }
            };
            break;
          case 'code':
            this.collectors.code = { 
              collect: async () => {
                const data = await this.basicCodeAnalysis();
                return { ...data, fallback: true };
              }
            };
            break;
          case 'database':
            this.collectors.database = { 
              collect: async () => {
                const data = await GeminiHelpers.getDatabaseStatus();
                return { ...data, fallback: true };
              }
            };
            break;
          case 'business':
            this.collectors.business = { 
              collect: async () => {
                const data = await this.basicBusinessAnalysis();
                return { ...data, fallback: true };
              }
            };
            break;
        }
      }
    }
    
    this.log(`🎯 Initialized ${successCount}/${collectorsToInitialize.length} advanced collectors`);
    
    if (successCount === collectorsToInitialize.length) {
      this.log('✅ All advanced collectors ready for comprehensive analysis', 'success');
    } else {
      this.log(`⚠️  ${collectorsToInitialize.length - successCount} collectors using fallbacks`, 'warn');
    }
  }

  /**
   * Gather raw context data from all collectors
   */
  async gatherRawContext() {
    this.log('🔍 Gathering context data...');
    
    const contextPromises = Object.entries(this.collectors).map(async ([name, collector]) => {
      try {
        const data = await collector.collect();
        return [name, { success: true, data }];
      } catch (error) {
        this.log(`⚠️  ${name} collector failed: ${error.message}`, 'warn');
        return [name, { success: false, error: error.message }];
      }
    });
    
    const results = await Promise.all(contextPromises);
    return Object.fromEntries(results);
  }

  /**
   * Apply intelligent analysis to raw context data
   */
  async analyzeContext(rawContext) {
    this.log('🧠 Applying intelligence layer...');
    
    // Initialize intelligence components if needed
    await this.initializeIntelligence();
    
    const analysis = {
      timestamp: this.timestamp,
      sessionId: this.sessionId,
      rawData: rawContext,
      
      // Smart analysis
      currentTask: await this.inferCurrentTask(rawContext),
      criticalIssues: await this.identifyCriticalIssues(rawContext),
      priorities: await this.calculatePriorities(rawContext),
      patterns: await this.recognizePatterns(rawContext),
      
      // Context insights
      recentActivity: this.analyzeRecentActivity(rawContext),
      affectedAreas: this.identifyAffectedAreas(rawContext),
      dependencies: await this.analyzeDependencies(rawContext),
      
      // Recommendations
      recommendations: await this.generateRecommendations(rawContext),
      nextSteps: await this.suggestNextSteps(rawContext)
    };
    
    return analysis;
  }

  /**
   * Package context for AI consumption
   */
  async packageContext(intelligentContext) {
    this.log('📦 Packaging context for AI...');
    
    const packagedContext = {
      metadata: {
        timestamp: this.timestamp,
        sessionId: this.sessionId,
        agentVersion: '1.0.0',
        contextVersion: 2,
        analysisTime: Date.now()
      },
      
      summary: {
        status: this.determineDevelopmentStatus(intelligentContext),
        currentFocus: intelligentContext.currentTask,
        urgentIssues: intelligentContext.criticalIssues.filter(issue => issue.priority === 'critical'),
        confidence: this.calculateConfidence(intelligentContext)
      },
      
      context: {
        project: await this.getProjectContext(),
        development: this.getDevelopmentContext(intelligentContext),
        technical: this.getTechnicalContext(intelligentContext),
        business: this.getBusinessContext(intelligentContext)
      },
      
      actionable: {
        immediateActions: intelligentContext.recommendations.slice(0, 3),
        nextSteps: intelligentContext.nextSteps,
        blockers: this.identifyBlockers(intelligentContext),
        opportunities: this.identifyOpportunities(intelligentContext)
      },
      
      memory: await this.getRelevantMemory(),
      
      rawData: this.options.verbose ? intelligentContext.rawData : null
    };
    
    return packagedContext;
  }

  /**
   * Initialize intelligence components
   */
  async initializeIntelligence() {
    if (!this.intelligence.taskInference) {
      try {
        const { TaskInferenceEngine } = await import('./intelligence/task-inference.js');
        const { PatternRecognition } = await import('./intelligence/pattern-recognition.js');
        const { PriorityCalculator } = await import('./intelligence/priority-calculator.js');
        
        this.intelligence.taskInference = new TaskInferenceEngine();
        this.intelligence.patternRecognition = new PatternRecognition();
        this.intelligence.priorityCalculator = new PriorityCalculator();
        
      } catch (error) {
        // Use basic intelligence if advanced components not available
        this.log('⚠️  Advanced intelligence not available, using basic inference');
      }
    }
  }

  /**
   * Infer current development task from context
   */
  async inferCurrentTask(rawContext) {
    const git = rawContext.git?.data;
    const test = rawContext.test?.data;
    const lint = rawContext.lint?.data;
    
    let task = {
      description: 'General development work',
      confidence: 0.3,
      evidence: [],
      priority: 'medium'
    };
    
    // Analyze git changes
    if (git?.uncommittedFiles?.length > 0) {
      const files = git.uncommittedFiles;
      
      if (files.some(f => f.includes('test'))) {
        task.description = 'Fixing test failures';
        task.confidence = 0.8;
        task.evidence.push('Uncommitted test files detected');
        task.priority = 'high';
      } else if (files.some(f => f.includes('DatabaseService') || f.includes('supabase'))) {
        task.description = 'Database integration work';
        task.confidence = 0.7;
        task.evidence.push('Database-related files modified');
        task.priority = 'high';
      } else if (files.some(f => f.includes('Component') || f.includes('.tsx'))) {
        task.description = 'UI component development';
        task.confidence = 0.6;
        task.evidence.push('React components modified');
        task.priority = 'medium';
      }
    }
    
    // Analyze test failures
    if (test?.failing > 0) {
      if (task.description === 'General development work') {
        task.description = 'Fixing test failures';
        task.priority = 'high';
      }
      task.confidence = Math.min(task.confidence + 0.2, 1.0);
      task.evidence.push(`${test.failing} failing tests detected`);
    }
    
    // Analyze lint errors
    if (lint?.errors > 0) {
      task.evidence.push(`${lint.errors} lint errors detected`);
      if (task.priority === 'medium') {
        task.priority = 'high';
      }
    }
    
    return task;
  }

  /**
   * Identify critical issues requiring immediate attention
   */
  async identifyCriticalIssues(rawContext) {
    const issues = [];
    
    const test = rawContext.test?.data;
    const lint = rawContext.lint?.data;
    const git = rawContext.git?.data;
    const database = rawContext.database?.data;
    
    // Test failures
    if (test?.failing > 0) {
      issues.push({
        type: 'TEST_FAILURE',
        severity: test.failing > 5 ? 'critical' : 'high',
        count: test.failing,
        description: `${test.failing} test(s) failing`,
        impact: 'Prevents confident deployment',
        suggestedAction: 'Review and fix failing tests'
      });
    }
    
    // Lint errors
    if (lint?.errors > 0) {
      issues.push({
        type: 'LINT_ERROR',
        severity: lint.errors > 10 ? 'high' : 'medium',
        count: lint.errors,
        description: `${lint.errors} ESLint error(s)`,
        impact: 'Code quality and consistency issues',
        suggestedAction: 'Fix ESLint errors'
      });
    }
    
    // Uncommitted changes
    if (git?.uncommittedFiles?.length > 0) {
      issues.push({
        type: 'UNCOMMITTED_CHANGES',
        severity: 'low',
        count: git.uncommittedFiles.length,
        description: `${git.uncommittedFiles.length} file(s) with uncommitted changes`,
        impact: 'Risk of losing work',
        suggestedAction: 'Review and commit changes'
      });
    }
    
    // Database connection issues
    if (database && !database.connected) {
      issues.push({
        type: 'DATABASE_CONNECTION',
        severity: 'critical',
        description: 'Database connection failed',
        impact: 'Application will not function',
        suggestedAction: 'Check Supabase configuration and connection'
      });
    }
    
    return issues.sort((a, b) => {
      const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Calculate priorities for different aspects
   */
  async calculatePriorities(rawContext) {
    return {
      testFixes: rawContext.test?.data?.failing > 0 ? 'high' : 'low',
      lintFixes: rawContext.lint?.data?.errors > 0 ? 'medium' : 'low',
      documentation: 'low',
      performance: 'medium',
      features: 'medium'
    };
  }

  /**
   * Recognize development patterns
   */
  async recognizePatterns(rawContext) {
    const patterns = [];
    
    // Pattern: Bug fixing session (many small commits, test focus)
    const git = rawContext.git?.data;
    if (git?.uncommittedFiles?.some(f => f.includes('test')) && 
        rawContext.test?.data?.failing > 0) {
      patterns.push({
        type: 'BUG_FIXING',
        confidence: 0.7,
        evidence: 'Test files modified with failing tests'
      });
    }
    
    // Pattern: Feature development (new components, no major test failures)
    if (git?.uncommittedFiles?.some(f => f.includes('Component')) &&
        rawContext.test?.data?.failing === 0) {
      patterns.push({
        type: 'FEATURE_DEVELOPMENT',
        confidence: 0.6,
        evidence: 'New components with passing tests'
      });
    }
    
    return patterns;
  }

  /**
   * Analyze recent development activity
   */
  analyzeRecentActivity(rawContext) {
    const git = rawContext.git?.data;
    return {
      lastCommit: git?.lastCommit || 'No recent commits',
      uncommittedFiles: git?.uncommittedFiles || [],
      branch: git?.branch || 'unknown',
      hasUnpushedCommits: (git?.unpushedCommits?.length || 0) > 0
    };
  }

  /**
   * Identify areas of the codebase being affected
   */
  identifyAffectedAreas(rawContext) {
    const areas = new Set();
    const files = rawContext.git?.data?.uncommittedFiles || [];
    
    files.forEach(file => {
      if (file.includes('components/')) areas.add('UI Components');
      if (file.includes('services/')) areas.add('Services');
      if (file.includes('utils/')) areas.add('Utilities');
      if (file.includes('context/')) areas.add('Context/State');
      if (file.includes('test')) areas.add('Testing');
      if (file.includes('DatabaseService')) areas.add('Database');
      if (file.includes('hooks/')) areas.add('React Hooks');
    });
    
    return Array.from(areas);
  }

  /**
   * Analyze code dependencies
   */
  async analyzeDependencies(rawContext) {
    // Basic dependency analysis - could be enhanced with AST parsing
    const files = rawContext.git?.data?.uncommittedFiles || [];
    const dependencies = {
      affected: [],
      risks: []
    };
    
    // Core files that affect many others
    const coreFiles = ['DatabaseService.ts', 'SchedulerContext.tsx', 'types/index.ts'];
    
    files.forEach(file => {
      if (coreFiles.some(core => file.includes(core))) {
        dependencies.risks.push({
          file,
          impact: 'high',
          reason: 'Core file that many components depend on'
        });
      }
    });
    
    return dependencies;
  }

  /**
   * Generate actionable recommendations
   */
  async generateRecommendations(rawContext) {
    const recommendations = [];
    const test = rawContext.test?.data;
    const lint = rawContext.lint?.data;
    const git = rawContext.git?.data;
    
    // Test-based recommendations
    if (test?.failing > 0) {
      recommendations.push({
        priority: 'high',
        action: `Fix ${test.failing} failing test(s)`,
        rationale: 'Tests ensure code reliability and prevent regressions',
        estimatedTime: test.failing < 3 ? '15-30 minutes' : '1-2 hours'
      });
    }
    
    // Lint-based recommendations
    if (lint?.errors > 0) {
      recommendations.push({
        priority: 'medium',
        action: `Resolve ${lint.errors} ESLint error(s)`,
        rationale: 'Maintains code quality and consistency',
        estimatedTime: lint.errors < 5 ? '10-20 minutes' : '30-60 minutes'
      });
    }
    
    // Git-based recommendations
    if (git?.uncommittedFiles?.length > 3) {
      recommendations.push({
        priority: 'low',
        action: 'Commit current changes',
        rationale: 'Prevents loss of work and enables better collaboration',
        estimatedTime: '5-10 minutes'
      });
    }
    
    return recommendations;
  }

  /**
   * Suggest next development steps
   */
  async suggestNextSteps(rawContext) {
    const steps = [];
    const currentTask = await this.inferCurrentTask(rawContext);
    
    if (currentTask.description.includes('test')) {
      steps.push('1. Run tests to see current failures');
      steps.push('2. Analyze failure patterns');
      steps.push('3. Fix root causes systematically');
      steps.push('4. Verify fixes with test runs');
    } else if (currentTask.description.includes('component')) {
      steps.push('1. Ensure component renders correctly');
      steps.push('2. Add/update tests for new functionality');
      steps.push('3. Check for accessibility compliance');
      steps.push('4. Test drag-and-drop interactions');
    } else {
      steps.push('1. Review current changes');
      steps.push('2. Run tests and fix any failures');
      steps.push('3. Address lint errors');
      steps.push('4. Commit working changes');
    }
    
    return steps;
  }

  /**
   * Determine overall development status
   */
  determineDevelopmentStatus(intelligentContext) {
    const issues = intelligentContext.criticalIssues;
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    
    if (criticalCount > 0) return 'CRITICAL_ISSUES';
    if (highCount > 2) return 'NEEDS_ATTENTION';
    if (highCount > 0) return 'MINOR_ISSUES';
    return 'STABLE';
  }

  /**
   * Calculate confidence in context analysis
   */
  calculateConfidence(intelligentContext) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on data quality
    if (intelligentContext.rawData.git?.success) confidence += 0.15;
    if (intelligentContext.rawData.test?.success) confidence += 0.15;
    if (intelligentContext.rawData.lint?.success) confidence += 0.1;
    if (intelligentContext.currentTask.confidence > 0.6) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Get project-level context
   */
  async getProjectContext() {
    const packageJson = await GeminiHelpers.readJsonSafe('package.json');
    return {
      name: 'BoardOS Construction Scheduler',
      type: 'React + TypeScript + Supabase',
      stack: ['React 18', 'TypeScript', 'Vite', 'Supabase', 'Tailwind CSS'],
      purpose: 'Real-time drag-and-drop construction job scheduling',
      version: packageJson?.version || '0.1.0'
    };
  }

  /**
   * Get development context
   */
  getDevelopmentContext(intelligentContext) {
    return {
      currentTask: intelligentContext.currentTask,
      recentActivity: intelligentContext.recentActivity,
      affectedAreas: intelligentContext.affectedAreas,
      patterns: intelligentContext.patterns
    };
  }

  /**
   * Get technical context
   */
  getTechnicalContext(intelligentContext) {
    return {
      testStatus: intelligentContext.rawData.test?.data,
      lintStatus: intelligentContext.rawData.lint?.data,
      gitStatus: intelligentContext.rawData.git?.data,
      dependencies: intelligentContext.dependencies
    };
  }

  /**
   * Get business context
   */
  getBusinessContext(intelligentContext) {
    return {
      rules: [
        'Equipment MUST have operators (safety requirement)',
        'Trucks MUST have drivers',
        'Pavers can have up to 2 screwmen',
        'Resources can work multiple shifts with conflict indicators'
      ],
      workflows: [
        'Normal Drag: Move assignment',
        'Ctrl+Drag: Create second shift',
        'Drag off job: Remove assignment'
      ],
      visualIndicators: [
        'Red border: Double shift (day + night)',
        'Teal border: Multiple day jobs',
        'Orange border: Night shift only'
      ]
    };
  }

  /**
   * Identify development blockers
   */
  identifyBlockers(intelligentContext) {
    const blockers = [];
    const criticalIssues = intelligentContext.criticalIssues.filter(i => i.severity === 'critical');
    
    criticalIssues.forEach(issue => {
      blockers.push({
        type: issue.type,
        description: issue.description,
        impact: issue.impact,
        action: issue.suggestedAction
      });
    });
    
    return blockers;
  }

  /**
   * Identify development opportunities
   */
  identifyOpportunities(intelligentContext) {
    const opportunities = [];
    
    // If tests are passing, suggest improvements
    if (intelligentContext.rawData.test?.data?.failing === 0) {
      opportunities.push({
        type: 'IMPROVEMENT',
        description: 'All tests passing - good time for refactoring or new features',
        benefit: 'Code improvement without breaking functionality'
      });
    }
    
    // If lint is clean, suggest advanced features
    if (intelligentContext.rawData.lint?.data?.errors === 0) {
      opportunities.push({
        type: 'ENHANCEMENT',
        description: 'Code quality is good - consider performance optimizations',
        benefit: 'Better user experience and code maintainability'
      });
    }
    
    return opportunities;
  }

  /**
   * Get relevant memory from previous sessions
   */
  async getRelevantMemory() {
    const memory = await GeminiHelpers.readJsonSafe('AI_CONTEXT_MEMORY.json');
    return memory || { sessions: [], patterns: [], decisions: [] };
  }

  /**
   * Save context data for future reference
   */
  async saveContext(context) {
    const contextPath = 'AI_CONTEXT.json';
    const memoryPath = 'AI_CONTEXT_MEMORY.json';
    
    // Save current context
    await GeminiHelpers.writeJsonSafe(contextPath, context);
    
    // Update memory
    let memory = await GeminiHelpers.readJsonSafe(memoryPath) || { sessions: [] };
    memory.sessions = memory.sessions || [];
    memory.sessions.unshift({
      timestamp: this.timestamp,
      sessionId: this.sessionId,
      task: context.summary.currentFocus,
      status: context.summary.status
    });
    
    // Keep only last 10 sessions in memory
    memory.sessions = memory.sessions.slice(0, 10);
    
    await GeminiHelpers.writeJsonSafe(memoryPath, memory);
  }

  /**
   * Output context for human consumption
   */
  outputContext(context) {
    console.log('\n' + '='.repeat(80));
    console.log('🤖 AI CONTEXT ANALYSIS REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📊 STATUS: ${context.summary.status}`);
    console.log(`🎯 FOCUS: ${context.summary.currentFocus.description}`);
    console.log(`🔍 CONFIDENCE: ${Math.round(context.summary.confidence * 100)}%`);
    
    if (context.summary.urgentIssues.length > 0) {
      console.log(`\n⚠️  URGENT ISSUES:`);
      context.summary.urgentIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.description} (${issue.severity})`);
      });
    }
    
    if (context.actionable.immediateActions.length > 0) {
      console.log(`\n🚀 IMMEDIATE ACTIONS:`);
      context.actionable.immediateActions.forEach((action, i) => {
        console.log(`   ${i + 1}. ${action.action} (${action.priority})`);
      });
    }
    
    if (context.actionable.nextSteps.length > 0) {
      console.log(`\n📋 NEXT STEPS:`);
      context.actionable.nextSteps.forEach(step => {
        console.log(`   ${step}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }

  /**
   * Basic code analysis fallback
   */
  async basicCodeAnalysis() {
    const recentFiles = await GeminiHelpers.execSafe('git diff --name-only HEAD~1..HEAD');
    const uncommittedFiles = await GeminiHelpers.execSafe('git diff --name-only');
    
    return {
      recentFiles: recentFiles.stdout ? recentFiles.stdout.split('\n').filter(f => f) : [],
      uncommittedFiles: uncommittedFiles.stdout ? uncommittedFiles.stdout.split('\n').filter(f => f) : [],
      timestamp: this.timestamp
    };
  }

  /**
   * Basic business analysis fallback
   */
  async basicBusinessAnalysis() {
    return {
      coreRules: [
        'Equipment requires operators',
        'Trucks require drivers',
        'Multi-shift support available'
      ],
      lastAnalyzed: this.timestamp
    };
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logging utility
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    let prefix;
    
    switch (level) {
      case 'error': prefix = '❌'; break;
      case 'warn': prefix = '⚠️ '; break;
      case 'success': prefix = '✅'; break;
      default: prefix = 'ℹ️ '; break;
    }
    
    if (this.options.verbose || level !== 'info') {
      console.log(`[${timestamp}] ${prefix} ${message}`);
    }
  }
}

// CLI handling
if (process.argv[1] && process.argv[1].endsWith('ai-context-agent.js')) {
  // Check for help
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🤖 AI Context Agent - Intelligent project analysis for AI assistants

AI CONTEXT COMMANDS:
  npm run ai:context                 # Basic analysis
  npm run ai:context:verbose         # Detailed output  
  npm run ai:context:analyze         # Full analysis with verbose logging
  npm run ai:context:watch           # Watch mode (coming soon)
  npm run ai:generate                # Generate AI context (legacy)

CLAUDE ASSISTANT COMMANDS:
  npm run claude:start               # Smart development session start
  npm run claude:status              # Quick project status check
  npm run claude:handoff             # Create handoff documentation
  npm run claude:history             # View session history
  npm run claude:reset               # Reset Claude context
  npm run claude:resume              # Resume previous session
  npm run claude:session             # Start new Claude session
  npm run claude:update              # Update Claude.md file
  npm run claude:memory              # Update memory system
  npm run setup:claude               # Initial Claude setup

DEVELOPMENT COMMANDS:
  npm run dev                        # Start development server
  npm run dev:docs                   # Start dev server with docs
  npm run build                      # Production build
  npm run preview                    # Preview production build
  npm run lint                       # Run ESLint
  npm run commit                     # Auto commit with message
  npm run save / npm run qs          # Quick save changes

TESTING COMMANDS:
  npm run test                       # Unit tests (Vitest)
  npm run test:e2e                   # E2E tests (Playwright)
  npm run test:e2e:ui                # E2E tests with UI
  npm run test:e2e:debug             # Debug E2E tests
  npm run test:e2e:headed            # E2E tests in headed mode
  npm run test:e2e:chrome            # E2E tests in Chrome only
  npm run test:e2e:firefox           # E2E tests in Firefox only
  npm run test:e2e:webkit            # E2E tests in WebKit only
  npm run test:e2e:mobile            # E2E tests on mobile browsers
  npm run test:e2e:generate          # Generate dynamic E2E tests
  npm run test:e2e:watch             # Watch E2E test rules
  npm run test:e2e:update-snapshots  # Update test snapshots
  npm run test:e2e:report            # Show test report
  npm run test:all                   # Run all tests
  npm run playwright:install         # Install Playwright browsers
  npm run playwright:codegen         # Generate Playwright tests

DOCUMENTATION COMMANDS:
  npm run docs:generate              # Generate documentation
  npm run docs:watch                 # Watch and generate docs
  npm run docs:api                   # Generate API documentation
  npm run docs:build                 # Build all documentation
  npm run docs:ai-context            # Update AI context docs
  npm run docs:export                # Export documentation system

DATABASE COMMANDS:
  npm run migration:check            # Check migration status
  npm run migration:test             # Test database migration

DIRECT USAGE:
  node scripts/ai-context-agent.js [options]

AI CONTEXT OPTIONS:
  --verbose, -v     Show detailed output during analysis
  --analyze         Enable full analysis mode with verbose logging
  --watch           Enable watch mode for continuous analysis
  --learn           Enable learning mode for pattern recognition
  --help, -h        Show this help message

AI CONTEXT FEATURES:
  ✅ Comprehensive project analysis (git, tests, lint, code, database, business)
  ✅ Intelligent task inference and pattern recognition  
  ✅ Critical issue detection with prioritized recommendations
  ✅ AI-optimized context generation for assistant consumption
  ✅ Session memory and learning capabilities
  ✅ Fallback handling for robust analysis

OUTPUT FILES:
  - AI_CONTEXT.json         # Structured context for AI consumption
  - AI_CONTEXT_MEMORY.json  # Session history and learning data

COLLECTORS:
  📋 Git Collector       - Development patterns, commit analysis, risk assessment
  🧪 Test Collector      - Unit/E2E results, coverage analysis, health scoring  
  🔧 Lint Collector      - ESLint, TypeScript, Prettier analysis
  📁 Code Collector      - Structure, complexity, architectural patterns
  🗄️  Database Collector - Supabase config, migrations, database health
  🏗️  Business Collector - Domain rules, workflows, validation patterns

Generated at: ${new Date().toISOString()}
`);
    process.exit(0);
  }

  const options = {
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    analyze: process.argv.includes('--analyze'),
    watch: process.argv.includes('--watch'),
    learn: process.argv.includes('--learn')
  };
  
  const agent = new AIContextAgent(options);
  
  if (options.watch) {
    console.log('👁️  Starting watch mode...');
    // TODO: Implement watch mode
    agent.execute().catch(console.error);
  } else {
    agent.execute().catch(console.error);
  }
}

export default AIContextAgent;