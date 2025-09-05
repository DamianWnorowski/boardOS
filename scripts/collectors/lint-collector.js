/**
 * Lint Context Collector
 * Analyzes ESLint results and code quality metrics
 */

import ClaudeHelpers from '../utils/claude-helpers.js';

export class LintCollector {
  constructor() {
    this.name = 'LintCollector';
    this.version = '1.0.0';
  }

  /**
   * Collect comprehensive lint context
   */
  async collect() {
    const startTime = Date.now();
    
    try {
      // Run ESLint analysis
      const [eslintResults, tsErrors, prettierCheck] = await Promise.all([
        this.getESLintResults(),
        this.getTypeScriptErrors(),
        this.getPrettierCheck()
      ]);

      const context = {
        metadata: {
          collector: this.name,
          version: this.version,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime
        },
        
        eslint: eslintResults,
        typescript: tsErrors,
        prettier: prettierCheck,
        
        analysis: {
          overallHealth: this.calculateOverallHealth(eslintResults, tsErrors),
          topIssues: this.identifyTopIssues(eslintResults),
          codeQualityScore: this.calculateQualityScore(eslintResults, tsErrors),
          recommendations: this.generateRecommendations(eslintResults, tsErrors, prettierCheck)
        },
        
        insights: {
          patterns: this.analyzePatterns(eslintResults),
          riskAreas: this.identifyRiskAreas(eslintResults),
          improvements: this.suggestImprovements(eslintResults, tsErrors)
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
   * Get ESLint results
   */
  async getESLintResults() {
    const result = await ClaudeHelpers.execSafe('npx eslint . --format json --ext .ts,.tsx,.js,.jsx');
    
    if (!result.stdout) {
      return {
        files: [],
        totalIssues: 0,
        errors: 0,
        warnings: 0,
        fixableIssues: 0
      };
    }

    try {
      const eslintOutput = JSON.parse(result.stdout);
      
      const allIssues = eslintOutput.flatMap(file => 
        file.messages.map(msg => ({
          file: file.filePath.replace(process.cwd(), '').replace(/\\/g, '/'),
          line: msg.line,
          column: msg.column,
          message: msg.message,
          severity: msg.severity === 2 ? 'error' : 'warning',
          rule: msg.ruleId,
          fixable: msg.fix ? true : false
        }))
      );

      const fileAnalysis = eslintOutput.map(file => ({
        file: file.filePath.replace(process.cwd(), '').replace(/\\/g, '/'),
        issues: file.messages.length,
        errors: file.messages.filter(msg => msg.severity === 2).length,
        warnings: file.messages.filter(msg => msg.severity === 1).length,
        fixable: file.messages.filter(msg => msg.fix).length
      })).filter(file => file.issues > 0);

      return {
        files: fileAnalysis,
        allIssues: allIssues,
        totalIssues: allIssues.length,
        errors: allIssues.filter(i => i.severity === 'error').length,
        warnings: allIssues.filter(i => i.severity === 'warning').length,
        fixableIssues: allIssues.filter(i => i.fixable).length,
        ruleBreakdown: this.analyzeRuleBreakdown(allIssues)
      };
      
    } catch (e) {
      // Fallback parsing for non-JSON output
      const errorMatch = result.stderr.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
      if (errorMatch) {
        return {
          files: [],
          allIssues: [],
          totalIssues: parseInt(errorMatch[1]) || 0,
          errors: parseInt(errorMatch[2]) || 0,
          warnings: parseInt(errorMatch[3]) || 0,
          fixableIssues: 0,
          ruleBreakdown: {}
        };
      }
      
      return {
        files: [],
        allIssues: [],
        totalIssues: 0,
        errors: 0,
        warnings: 0,
        fixableIssues: 0,
        ruleBreakdown: {}
      };
    }
  }

  /**
   * Get TypeScript compilation errors
   */
  async getTypeScriptErrors() {
    const result = await ClaudeHelpers.execSafe('npx tsc --noEmit --pretty false');
    
    if (result.success) {
      return {
        hasErrors: false,
        errors: [],
        totalErrors: 0
      };
    }

    const errors = [];
    if (result.stdout) {
      const lines = result.stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/^(.+)\((\d+),(\d+)\): error TS(\d+): (.+)$/);
        if (match) {
          errors.push({
            file: match[1].replace(process.cwd(), '').replace(/\\/g, '/'),
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            code: match[4],
            message: match[5]
          });
        }
      }
    }

    return {
      hasErrors: true,
      errors: errors,
      totalErrors: errors.length
    };
  }

  /**
   * Check Prettier formatting
   */
  async getPrettierCheck() {
    const result = await ClaudeHelpers.execSafe('npx prettier --check . --ignore-path .gitignore');
    
    if (result.success) {
      return {
        isFormatted: true,
        unformattedFiles: [],
        totalUnformatted: 0
      };
    }

    const unformattedFiles = result.stdout ? 
      result.stdout.split('\n').filter(line => line.trim()) : [];

    return {
      isFormatted: false,
      unformattedFiles: unformattedFiles.map(file => file.replace(process.cwd(), '').replace(/\\/g, '/')),
      totalUnformatted: unformattedFiles.length
    };
  }

  /**
   * Analyze rule breakdown
   */
  analyzeRuleBreakdown(allIssues) {
    const breakdown = {};
    
    for (const issue of allIssues) {
      if (!issue.rule) continue;
      
      if (!breakdown[issue.rule]) {
        breakdown[issue.rule] = {
          count: 0,
          errors: 0,
          warnings: 0,
          files: new Set()
        };
      }
      
      breakdown[issue.rule].count++;
      breakdown[issue.rule][issue.severity === 'error' ? 'errors' : 'warnings']++;
      breakdown[issue.rule].files.add(issue.file);
    }

    // Convert Sets to arrays and sort by count
    const sortedRules = Object.entries(breakdown)
      .map(([rule, data]) => ({
        rule,
        count: data.count,
        errors: data.errors,
        warnings: data.warnings,
        files: data.files.size,
        affectedFiles: Array.from(data.files)
      }))
      .sort((a, b) => b.count - a.count);

    return {
      byRule: Object.fromEntries(sortedRules.map(item => [item.rule, item])),
      topRules: sortedRules.slice(0, 10)
    };
  }

  /**
   * Calculate overall code health
   */
  calculateOverallHealth(eslintResults, tsErrors) {
    let score = 100;
    
    // Deduct for ESLint errors
    score -= Math.min(eslintResults.errors * 0.5, 30);
    
    // Deduct for ESLint warnings
    score -= Math.min(eslintResults.warnings * 0.1, 20);
    
    // Deduct for TypeScript errors
    score -= Math.min(tsErrors.totalErrors * 1, 40);
    
    // Bonus for high fixable ratio
    if (eslintResults.totalIssues > 0) {
      const fixableRatio = eslintResults.fixableIssues / eslintResults.totalIssues;
      if (fixableRatio > 0.7) score += 5;
    }

    score = Math.max(0, Math.round(score));
    
    let grade;
    if (score >= 90) grade = 'EXCELLENT';
    else if (score >= 80) grade = 'GOOD';
    else if (score >= 70) grade = 'FAIR';
    else if (score >= 60) grade = 'POOR';
    else grade = 'CRITICAL';

    return {
      score,
      grade,
      factors: {
        eslintErrors: eslintResults.errors,
        eslintWarnings: eslintResults.warnings,
        typescriptErrors: tsErrors.totalErrors,
        fixableIssues: eslintResults.fixableIssues
      }
    };
  }

  /**
   * Identify top issues to fix
   */
  identifyTopIssues(eslintResults) {
    const issues = [];

    // Top rule violations
    const topRules = eslintResults.ruleBreakdown?.topRules || [];
    for (const rule of topRules.slice(0, 5)) {
      issues.push({
        type: 'RULE_VIOLATION',
        priority: rule.errors > 0 ? 'high' : 'medium',
        rule: rule.rule,
        count: rule.count,
        message: `${rule.count} violations of ${rule.rule}`,
        affectedFiles: rule.files
      });
    }

    // Files with most issues
    const topFiles = eslintResults.files
      .sort((a, b) => b.issues - a.issues)
      .slice(0, 5);

    for (const file of topFiles) {
      if (file.issues > 10) {
        issues.push({
          type: 'PROBLEMATIC_FILE',
          priority: file.errors > 5 ? 'high' : 'medium',
          file: file.file,
          issues: file.issues,
          message: `${file.file} has ${file.issues} issues`,
          errors: file.errors,
          warnings: file.warnings
        });
      }
    }

    return issues.sort((a, b) => {
      const priorityScore = { high: 3, medium: 2, low: 1 };
      return priorityScore[b.priority] - priorityScore[a.priority];
    });
  }

  /**
   * Calculate code quality score
   */
  calculateQualityScore(eslintResults, tsErrors) {
    const metrics = {
      lintCompliance: eslintResults.totalIssues === 0 ? 100 : Math.max(0, 100 - eslintResults.totalIssues * 0.2),
      typeCompliance: tsErrors.totalErrors === 0 ? 100 : Math.max(0, 100 - tsErrors.totalErrors * 2),
      maintainability: this.calculateMaintainabilityScore(eslintResults),
      consistency: this.calculateConsistencyScore(eslintResults)
    };

    const overall = (metrics.lintCompliance * 0.3 + 
                    metrics.typeCompliance * 0.4 + 
                    metrics.maintainability * 0.2 + 
                    metrics.consistency * 0.1);

    return {
      overall: Math.round(overall),
      breakdown: metrics
    };
  }

  /**
   * Calculate maintainability score based on complexity-related rules
   */
  calculateMaintainabilityScore(eslintResults) {
    const complexityRules = [
      'complexity',
      'max-depth',
      'max-lines',
      'max-lines-per-function',
      'max-params',
      'max-statements'
    ];

    const complexityIssues = eslintResults.allIssues?.filter(issue => 
      complexityRules.includes(issue.rule)
    ).length || 0;

    return Math.max(0, 100 - complexityIssues * 5);
  }

  /**
   * Calculate consistency score
   */
  calculateConsistencyScore(eslintResults) {
    const styleRules = [
      'indent',
      'quotes',
      'semi',
      'comma-style',
      'brace-style'
    ];

    const styleIssues = eslintResults.allIssues?.filter(issue => 
      styleRules.includes(issue.rule)
    ).length || 0;

    return Math.max(0, 100 - styleIssues * 2);
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(eslintResults, tsErrors, prettierCheck) {
    const recommendations = [];

    // Critical issues first
    if (tsErrors.totalErrors > 0) {
      recommendations.push({
        type: 'TYPESCRIPT_ERRORS',
        priority: 'critical',
        message: `Fix ${tsErrors.totalErrors} TypeScript compilation errors`,
        action: 'Run `npx tsc --noEmit` to see all errors',
        impact: 'Prevents proper type checking and potential runtime errors'
      });
    }

    if (eslintResults.errors > 50) {
      recommendations.push({
        type: 'ESLINT_ERRORS',
        priority: 'high',
        message: `Fix ${eslintResults.errors} ESLint errors`,
        action: 'Focus on the most frequent rule violations first',
        impact: 'Improves code quality and prevents potential bugs'
      });
    }

    // Quick wins
    if (eslintResults.fixableIssues > 20) {
      recommendations.push({
        type: 'AUTO_FIXABLE',
        priority: 'medium',
        message: `${eslintResults.fixableIssues} issues can be auto-fixed`,
        action: 'Run `npx eslint . --fix`',
        impact: 'Quick improvement to code consistency'
      });
    }

    if (!prettierCheck.isFormatted && prettierCheck.totalUnformatted > 0) {
      recommendations.push({
        type: 'CODE_FORMATTING',
        priority: 'low',
        message: `${prettierCheck.totalUnformatted} files need formatting`,
        action: 'Run `npx prettier --write .`',
        impact: 'Improves code readability and consistency'
      });
    }

    // Rule-specific recommendations
    const topRule = eslintResults.ruleBreakdown?.topRules?.[0];
    if (topRule && topRule.count > 10) {
      recommendations.push({
        type: 'RULE_FOCUS',
        priority: 'medium',
        message: `Address ${topRule.rule} violations (${topRule.count} occurrences)`,
        action: `Focus on fixing ${topRule.rule} in most affected files`,
        impact: 'Significant improvement in specific code quality area'
      });
    }

    return recommendations;
  }

  /**
   * Analyze patterns in lint results
   */
  analyzePatterns(eslintResults) {
    const patterns = [];

    // File type patterns
    const fileTypes = {};
    for (const file of eslintResults.files || []) {
      const ext = file.file.split('.').pop();
      if (!fileTypes[ext]) fileTypes[ext] = { files: 0, issues: 0 };
      fileTypes[ext].files++;
      fileTypes[ext].issues += file.issues;
    }

    for (const [ext, data] of Object.entries(fileTypes)) {
      const avgIssues = data.issues / data.files;
      if (avgIssues > 5) {
        patterns.push({
          type: 'FILE_TYPE_ISSUES',
          pattern: `.${ext} files have high issue rate`,
          avgIssues: Math.round(avgIssues * 10) / 10,
          fileCount: data.files
        });
      }
    }

    // Directory patterns
    const directories = {};
    for (const file of eslintResults.files || []) {
      const dir = file.file.substring(0, file.file.lastIndexOf('/')) || '/';
      if (!directories[dir]) directories[dir] = { files: 0, issues: 0 };
      directories[dir].files++;
      directories[dir].issues += file.issues;
    }

    for (const [dir, data] of Object.entries(directories)) {
      const avgIssues = data.issues / data.files;
      if (avgIssues > 8 && data.files > 2) {
        patterns.push({
          type: 'DIRECTORY_ISSUES',
          pattern: `${dir} directory has high issue concentration`,
          avgIssues: Math.round(avgIssues * 10) / 10,
          fileCount: data.files
        });
      }
    }

    return patterns;
  }

  /**
   * Identify risk areas
   */
  identifyRiskAreas(eslintResults) {
    const risks = [];

    // High error concentration
    const highErrorFiles = eslintResults.files?.filter(f => f.errors > 5) || [];
    if (highErrorFiles.length > 0) {
      risks.push({
        type: 'HIGH_ERROR_CONCENTRATION',
        severity: 'high',
        count: highErrorFiles.length,
        message: `${highErrorFiles.length} files with more than 5 errors each`,
        files: highErrorFiles.map(f => f.file)
      });
    }

    // Specific dangerous patterns
    const dangerousRules = ['no-unused-vars', 'no-undef', 'no-unreachable'];
    for (const rule of dangerousRules) {
      const ruleData = eslintResults.ruleBreakdown?.byRule?.[rule];
      if (ruleData && ruleData.count > 5) {
        risks.push({
          type: 'DANGEROUS_PATTERN',
          severity: 'medium',
          rule: rule,
          count: ruleData.count,
          message: `${ruleData.count} ${rule} violations detected`,
          affectedFiles: ruleData.files
        });
      }
    }

    return risks;
  }

  /**
   * Suggest improvements
   */
  suggestImprovements(eslintResults, tsErrors) {
    const improvements = [];

    // Configuration improvements
    if (eslintResults.fixableIssues / Math.max(1, eslintResults.totalIssues) > 0.6) {
      improvements.push({
        type: 'TOOLING',
        suggestion: 'Enable ESLint auto-fix on save in your editor',
        benefit: 'Automatically resolves many style and formatting issues'
      });
    }

    // Gradual improvement strategy
    if (eslintResults.totalIssues > 100) {
      improvements.push({
        type: 'STRATEGY',
        suggestion: 'Implement lint-staged to prevent new issues',
        benefit: 'Prevents accumulation of new lint issues'
      });
    }

    if (tsErrors.totalErrors > 20) {
      improvements.push({
        type: 'TYPESCRIPT',
        suggestion: 'Enable strict TypeScript mode gradually',
        benefit: 'Better type safety and fewer runtime errors'
      });
    }

    return improvements;
  }
}

export default LintCollector;