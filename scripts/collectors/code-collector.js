/**
 * Code Context Collector
 * Analyzes codebase structure, complexity, and architectural patterns
 */

import ClaudeHelpers from '../utils/claude-helpers.js';
import fs from 'fs/promises';
import path from 'path';

export class CodeCollector {
  constructor() {
    this.name = 'CodeCollector';
    this.version = '1.0.0';
    this.supportedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
    this.excludePaths = ['node_modules', '.git', 'dist', 'build', '.cache'];
  }

  /**
   * Collect comprehensive code context
   */
  async collect() {
    const startTime = Date.now();
    
    try {
      const [
        structure,
        complexity,
        dependencies,
        patterns,
        documentation
      ] = await Promise.all([
        this.analyzeStructure(),
        this.analyzeComplexity(),
        this.analyzeDependencies(),
        this.analyzePatterns(),
        this.analyzeDocumentation()
      ]);

      const context = {
        metadata: {
          collector: this.name,
          version: this.version,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime
        },
        
        structure,
        complexity,
        dependencies,
        patterns,
        documentation,
        
        analysis: {
          architecturalHealth: this.calculateArchitecturalHealth(structure, complexity, patterns),
          maintainabilityScore: this.calculateMaintainabilityScore(complexity, patterns),
          technicalDebt: this.assessTechnicalDebt(complexity, patterns),
          recommendations: this.generateRecommendations(structure, complexity, dependencies)
        },
        
        insights: {
          codeQuality: this.assessCodeQuality(complexity, patterns),
          growthPotential: this.assessGrowthPotential(structure, patterns),
          riskFactors: this.identifyRiskFactors(complexity, patterns, dependencies)
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
   * Analyze codebase structure
   */
  async analyzeStructure() {
    const files = await this.getAllCodeFiles();
    
    const structure = {
      totalFiles: files.length,
      totalLines: 0,
      byExtension: {},
      byDirectory: {},
      largestFiles: [],
      recentFiles: []
    };

    const fileStats = [];

    for (const filePath of files.slice(0, 200)) { // Limit to prevent timeout
      try {
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').length;
        const size = stats.size;
        
        const ext = path.extname(filePath);
        const dir = path.dirname(filePath).split(path.sep)[0] || 'root';
        
        // Update totals
        structure.totalLines += lines;
        
        // By extension
        if (!structure.byExtension[ext]) {
          structure.byExtension[ext] = { files: 0, lines: 0, size: 0 };
        }
        structure.byExtension[ext].files++;
        structure.byExtension[ext].lines += lines;
        structure.byExtension[ext].size += size;
        
        // By directory
        if (!structure.byDirectory[dir]) {
          structure.byDirectory[dir] = { files: 0, lines: 0, size: 0 };
        }
        structure.byDirectory[dir].files++;
        structure.byDirectory[dir].lines += lines;
        structure.byDirectory[dir].size += size;

        fileStats.push({
          path: filePath,
          lines,
          size,
          modified: stats.mtime,
          complexity: this.estimateFileComplexity(content)
        });

      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    // Sort and get top files
    structure.largestFiles = fileStats
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 10)
      .map(f => ({ path: f.path, lines: f.lines, complexity: f.complexity }));

    structure.recentFiles = fileStats
      .sort((a, b) => b.modified - a.modified)
      .slice(0, 10)
      .map(f => ({ path: f.path, modified: f.modified.toISOString(), lines: f.lines }));

    return structure;
  }

  /**
   * Analyze code complexity
   */
  async analyzeComplexity() {
    const files = await this.getAllCodeFiles();
    
    const complexity = {
      averageFileSize: 0,
      complexityScore: 0,
      functionComplexity: { average: 0, max: 0, distribution: {} },
      classComplexity: { average: 0, max: 0, count: 0 },
      nestingDepth: { average: 0, max: 0 },
      duplicateCode: await this.findDuplicates(files.slice(0, 50))
    };

    let totalComplexity = 0;
    let totalSize = 0;
    let fileCount = 0;
    let functionCount = 0;
    let classCount = 0;
    let totalNesting = 0;

    for (const filePath of files.slice(0, 100)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').length;
        
        const fileComplexity = this.analyzeFileComplexity(content);
        
        totalComplexity += fileComplexity.overall;
        totalSize += lines;
        fileCount++;
        
        functionCount += fileComplexity.functions.length;
        classCount += fileComplexity.classes.length;
        totalNesting += fileComplexity.maxNesting;

        // Function complexity distribution
        for (const func of fileComplexity.functions) {
          const bucket = Math.floor(func.complexity / 5) * 5;
          complexity.functionComplexity.distribution[bucket] = 
            (complexity.functionComplexity.distribution[bucket] || 0) + 1;
          
          if (func.complexity > complexity.functionComplexity.max) {
            complexity.functionComplexity.max = func.complexity;
          }
        }

        // Class complexity
        for (const cls of fileComplexity.classes) {
          if (cls.methods > complexity.classComplexity.max) {
            complexity.classComplexity.max = cls.methods;
          }
        }

        if (fileComplexity.maxNesting > complexity.nestingDepth.max) {
          complexity.nestingDepth.max = fileComplexity.maxNesting;
        }

      } catch (error) {
        continue;
      }
    }

    // Calculate averages
    if (fileCount > 0) {
      complexity.averageFileSize = Math.round(totalSize / fileCount);
      complexity.complexityScore = Math.round(totalComplexity / fileCount);
      complexity.nestingDepth.average = Math.round(totalNesting / fileCount);
    }

    if (functionCount > 0) {
      complexity.functionComplexity.average = Math.round(
        Object.entries(complexity.functionComplexity.distribution)
          .reduce((sum, [bucket, count]) => sum + (parseInt(bucket) * count), 0) / functionCount
      );
    }

    if (classCount > 0) {
      complexity.classComplexity.count = classCount;
      complexity.classComplexity.average = Math.round(
        complexity.classComplexity.max / 2 // Rough estimate
      );
    }

    return complexity;
  }

  /**
   * Analyze dependencies
   */
  async analyzeDependencies() {
    const packageJson = await ClaudeHelpers.readJsonSafe('package.json');
    const lockfileExists = await ClaudeHelpers.fileExists('package-lock.json') || 
                          await ClaudeHelpers.fileExists('yarn.lock') || 
                          await ClaudeHelpers.fileExists('pnpm-lock.yaml');

    if (!packageJson) {
      return {
        dependencies: {},
        devDependencies: {},
        analysis: { total: 0, outdated: [], security: [], unused: [] }
      };
    }

    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    
    // Get outdated packages
    const outdatedResult = await ClaudeHelpers.execSafe('npm outdated --json');
    let outdatedPackages = [];
    try {
      if (outdatedResult.stdout) {
        const outdated = JSON.parse(outdatedResult.stdout);
        outdatedPackages = Object.entries(outdated).map(([name, info]) => ({
          name,
          current: info.current,
          wanted: info.wanted,
          latest: info.latest,
          severity: this.calculateUpdateSeverity(info.current, info.latest)
        }));
      }
    } catch (e) {
      // Fallback parsing or ignore
    }

    // Security audit
    const auditResult = await ClaudeHelpers.execSafe('npm audit --json');
    let securityIssues = [];
    try {
      if (auditResult.stdout) {
        const audit = JSON.parse(auditResult.stdout);
        if (audit.vulnerabilities) {
          securityIssues = Object.entries(audit.vulnerabilities).map(([name, vuln]) => ({
            name,
            severity: vuln.severity,
            range: vuln.range,
            via: vuln.via
          }));
        }
      }
    } catch (e) {
      // Fallback or ignore
    }

    return {
      dependencies: deps,
      devDependencies: devDeps,
      analysis: {
        total: Object.keys(deps).length + Object.keys(devDeps).length,
        production: Object.keys(deps).length,
        development: Object.keys(devDeps).length,
        outdated: outdatedPackages,
        security: securityIssues,
        lockfileExists,
        heavyDependencies: this.identifyHeavyDependencies(deps, devDeps)
      }
    };
  }

  /**
   * Analyze architectural patterns
   */
  async analyzePatterns() {
    const files = await this.getAllCodeFiles();
    
    const patterns = {
      frameworks: await this.detectFrameworks(),
      architecturalPatterns: await this.detectArchitecturalPatterns(files),
      designPatterns: await this.detectDesignPatterns(files.slice(0, 50)),
      antiPatterns: await this.detectAntiPatterns(files.slice(0, 50)),
      conventions: await this.analyzeConventions(files.slice(0, 100))
    };

    return patterns;
  }

  /**
   * Analyze documentation coverage
   */
  async analyzeDocumentation() {
    const files = await this.getAllCodeFiles();
    const docFiles = await this.getDocumentationFiles();
    
    let totalFunctions = 0;
    let documentedFunctions = 0;
    let totalClasses = 0;
    let documentedClasses = 0;

    for (const filePath of files.slice(0, 50)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const analysis = this.analyzeFileDocumentation(content);
        
        totalFunctions += analysis.functions.total;
        documentedFunctions += analysis.functions.documented;
        totalClasses += analysis.classes.total;
        documentedClasses += analysis.classes.documented;
        
      } catch (error) {
        continue;
      }
    }

    const functionCoverage = totalFunctions > 0 ? 
      Math.round((documentedFunctions / totalFunctions) * 100) : 0;
    const classCoverage = totalClasses > 0 ? 
      Math.round((documentedClasses / totalClasses) * 100) : 0;

    return {
      coverage: {
        functions: functionCoverage,
        classes: classCoverage,
        overall: Math.round((functionCoverage + classCoverage) / 2)
      },
      files: {
        documentation: docFiles.length,
        readme: await ClaudeHelpers.fileExists('README.md'),
        changelog: await ClaudeHelpers.fileExists('CHANGELOG.md'),
        contributing: await ClaudeHelpers.fileExists('CONTRIBUTING.md')
      },
      quality: {
        hasExamples: docFiles.some(f => f.includes('example')),
        hasApiDocs: docFiles.some(f => f.includes('api')),
        hasArchitecture: docFiles.some(f => f.includes('architecture') || f.includes('design'))
      }
    };
  }

  // Helper methods

  async getAllCodeFiles() {
    const result = await ClaudeHelpers.execSafe(`find . -type f \\( ${this.supportedExtensions.map(ext => `-name "*${ext}"`).join(' -o ')} \\) | grep -v -E "(${this.excludePaths.join('|')})" | head -300`);
    
    if (!result.stdout) return [];
    
    return result.stdout.split('\n').filter(f => f).map(f => f.replace('./', ''));
  }

  async getDocumentationFiles() {
    const result = await ClaudeHelpers.execSafe('find . -type f \\( -name "*.md" -o -name "*.txt" -o -name "*.rst" \\) | grep -v node_modules | head -50');
    
    if (!result.stdout) return [];
    
    return result.stdout.split('\n').filter(f => f).map(f => f.replace('./', ''));
  }

  estimateFileComplexity(content) {
    let complexity = 0;
    
    // Count control structures
    const controlStructures = content.match(/\b(if|else|for|while|switch|case|catch|try)\b/g) || [];
    complexity += controlStructures.length * 2;
    
    // Count function declarations
    const functions = content.match(/\b(function|=>|\bconst\s+\w+\s*=\s*\()/g) || [];
    complexity += functions.length;
    
    // Count nested structures (rough estimate)
    const nestingDepth = this.calculateNestingDepth(content);
    complexity += nestingDepth * 3;
    
    return Math.min(complexity, 100); // Cap at 100
  }

  analyzeFileComplexity(content) {
    const functions = this.extractFunctions(content);
    const classes = this.extractClasses(content);
    const maxNesting = this.calculateNestingDepth(content);
    
    const overall = functions.reduce((sum, f) => sum + f.complexity, 0) + 
                   classes.reduce((sum, c) => sum + c.methods, 0) + 
                   maxNesting * 2;

    return {
      overall: Math.min(overall, 100),
      functions,
      classes,
      maxNesting
    };
  }

  extractFunctions(content) {
    const functionRegex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\(.*?\)\s*=>|\(.*?\)\s*\{))/g;
    const functions = [];
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1] || match[2];
      const startIndex = match.index;
      const functionCode = this.extractFunctionBody(content, startIndex);
      
      functions.push({
        name,
        lines: functionCode.split('\n').length,
        complexity: this.calculateFunctionComplexity(functionCode)
      });
    }
    
    return functions.slice(0, 20); // Limit results
  }

  extractClasses(content) {
    const classRegex = /class\s+(\w+)/g;
    const classes = [];
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const name = match[1];
      const startIndex = match.index;
      const classCode = this.extractClassBody(content, startIndex);
      const methods = (classCode.match(/\b\w+\s*\(/g) || []).length;
      
      classes.push({
        name,
        methods,
        lines: classCode.split('\n').length
      });
    }
    
    return classes.slice(0, 10); // Limit results
  }

  calculateNestingDepth(content) {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of content) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth--;
      }
    }
    
    return maxDepth;
  }

  calculateFunctionComplexity(code) {
    let complexity = 1; // Base complexity
    
    // Cyclomatic complexity
    const controlKeywords = code.match(/\b(if|else|for|while|switch|case|catch|&&|\|\|)\b/g) || [];
    complexity += controlKeywords.length;
    
    return Math.min(complexity, 20); // Cap at 20
  }

  extractFunctionBody(content, startIndex) {
    // Simplified extraction - find matching braces
    let braceCount = 0;
    let inFunction = false;
    let body = '';
    
    for (let i = startIndex; i < content.length && body.length < 1000; i++) {
      const char = content[i];
      
      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}') {
        braceCount--;
      }
      
      if (inFunction) {
        body += char;
        if (braceCount === 0) break;
      }
    }
    
    return body;
  }

  extractClassBody(content, startIndex) {
    // Similar to function body extraction
    return this.extractFunctionBody(content, startIndex);
  }

  async findDuplicates(files) {
    // Simplified duplicate detection
    const duplicates = [];
    const codeBlocks = new Map();
    
    for (const filePath of files.slice(0, 20)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        
        // Check for duplicate blocks of 5+ lines
        for (let i = 0; i < lines.length - 5; i++) {
          const block = lines.slice(i, i + 5).join('\n').trim();
          if (block.length > 100) { // Minimum block size
            const hash = block.replace(/\s+/g, ' '); // Normalize whitespace
            
            if (codeBlocks.has(hash)) {
              duplicates.push({
                files: [codeBlocks.get(hash), `${filePath}:${i + 1}`],
                lines: 5
              });
            } else {
              codeBlocks.set(hash, `${filePath}:${i + 1}`);
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return duplicates.slice(0, 10);
  }

  async detectFrameworks() {
    const packageJson = await ClaudeHelpers.readJsonSafe('package.json');
    if (!packageJson) return [];
    
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const frameworks = [];
    
    const frameworkMap = {
      'react': 'React',
      'vue': 'Vue.js',
      'angular': 'Angular',
      'svelte': 'Svelte',
      'next': 'Next.js',
      'nuxt': 'Nuxt.js',
      'express': 'Express',
      'fastify': 'Fastify',
      'koa': 'Koa',
      'nest': 'NestJS'
    };
    
    for (const [pkg, name] of Object.entries(frameworkMap)) {
      if (Object.keys(deps).some(dep => dep.includes(pkg))) {
        frameworks.push(name);
      }
    }
    
    return frameworks;
  }

  async detectArchitecturalPatterns(files) {
    const patterns = [];
    
    // Look for common architectural patterns in file structure
    const hasMVC = files.some(f => f.includes('models/')) && 
                  files.some(f => f.includes('views/')) && 
                  files.some(f => f.includes('controllers/'));
    if (hasMVC) patterns.push('MVC');
    
    const hasComponents = files.some(f => f.includes('components/'));
    if (hasComponents) patterns.push('Component-Based');
    
    const hasServices = files.some(f => f.includes('services/'));
    if (hasServices) patterns.push('Service Layer');
    
    const hasContext = files.some(f => f.includes('context/'));
    if (hasContext) patterns.push('Context/Provider');
    
    return patterns;
  }

  async detectDesignPatterns(files) {
    const patterns = [];
    
    for (const filePath of files.slice(0, 20)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Factory pattern
        if (content.includes('createFactory') || content.includes('Factory')) {
          patterns.push('Factory');
        }
        
        // Observer pattern
        if (content.includes('subscribe') || content.includes('addEventListener')) {
          patterns.push('Observer');
        }
        
        // Singleton pattern
        if (content.includes('getInstance') || content.match(/static\s+instance/)) {
          patterns.push('Singleton');
        }
        
        // Strategy pattern
        if (content.includes('strategy') || content.match(/\bstrategy\w+/i)) {
          patterns.push('Strategy');
        }
        
      } catch (error) {
        continue;
      }
    }
    
    return [...new Set(patterns)];
  }

  async detectAntiPatterns(files) {
    const antiPatterns = [];
    
    for (const filePath of files.slice(0, 15)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        // God object (very long files)
        const lines = content.split('\n').length;
        if (lines > 1000) {
          antiPatterns.push({
            type: 'God Object',
            file: filePath,
            severity: 'high',
            details: `File has ${lines} lines`
          });
        }
        
        // Callback hell (deep nesting)
        const nestingDepth = this.calculateNestingDepth(content);
        if (nestingDepth > 8) {
          antiPatterns.push({
            type: 'Callback Hell',
            file: filePath,
            severity: 'medium',
            details: `Nesting depth: ${nestingDepth}`
          });
        }
        
        // Magic numbers
        const magicNumbers = content.match(/\b\d{2,}\b/g) || [];
        if (magicNumbers.length > 10) {
          antiPatterns.push({
            type: 'Magic Numbers',
            file: filePath,
            severity: 'low',
            details: `${magicNumbers.length} potential magic numbers`
          });
        }
        
      } catch (error) {
        continue;
      }
    }
    
    return antiPatterns.slice(0, 10);
  }

  async analyzeConventions(files) {
    const conventions = {
      naming: { camelCase: 0, snakeCase: 0, kebabCase: 0 },
      fileNaming: { camelCase: 0, kebabCase: 0, other: 0 },
      indentation: { spaces: 0, tabs: 0, mixed: 0 }
    };
    
    for (const filePath of files.slice(0, 30)) {
      try {
        // File naming
        const fileName = path.basename(filePath, path.extname(filePath));
        if (fileName.includes('-')) conventions.fileNaming.kebabCase++;
        else if (/[A-Z]/.test(fileName)) conventions.fileNaming.camelCase++;
        else conventions.fileNaming.other++;
        
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').slice(0, 50); // Sample first 50 lines
        
        // Indentation analysis
        let spaceIndent = 0, tabIndent = 0;
        for (const line of lines) {
          if (line.startsWith('  ') && !line.startsWith('\t')) spaceIndent++;
          else if (line.startsWith('\t')) tabIndent++;
        }
        
        if (spaceIndent > tabIndent) conventions.indentation.spaces++;
        else if (tabIndent > spaceIndent) conventions.indentation.tabs++;
        else if (spaceIndent > 0 && tabIndent > 0) conventions.indentation.mixed++;
        
        // Variable naming (simplified)
        const variables = content.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g) || [];
        for (const variable of variables.slice(0, 20)) {
          const name = variable.split(/\s+/).pop();
          if (name.includes('_')) conventions.naming.snakeCase++;
          else if (name.includes('-')) conventions.naming.kebabCase++;
          else conventions.naming.camelCase++;
        }
        
      } catch (error) {
        continue;
      }
    }
    
    return conventions;
  }

  analyzeFileDocumentation(content) {
    const functions = (content.match(/function\s+\w+|const\s+\w+\s*=/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    
    const jsdocComments = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
    const inlineComments = (content.match(/\/\/.*$/gm) || []).length;
    
    // Rough estimate of documented functions/classes
    const documentedFunctions = Math.min(functions, jsdocComments + Math.floor(inlineComments / 3));
    const documentedClasses = Math.min(classes, Math.floor(jsdocComments / 2));
    
    return {
      functions: { total: functions, documented: documentedFunctions },
      classes: { total: classes, documented: documentedClasses }
    };
  }

  calculateUpdateSeverity(current, latest) {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    if (currentParts[0] < latestParts[0]) return 'major';
    if (currentParts[1] < latestParts[1]) return 'minor';
    if (currentParts[2] < latestParts[2]) return 'patch';
    return 'none';
  }

  identifyHeavyDependencies(deps, devDeps) {
    const heavyPackages = [
      'webpack', 'babel', 'typescript', 'react', 'vue', 'angular',
      'lodash', 'moment', 'axios', 'express', 'next'
    ];
    
    const allDeps = { ...deps, ...devDeps };
    return Object.keys(allDeps).filter(dep => 
      heavyPackages.some(heavy => dep.includes(heavy))
    );
  }

  // Analysis methods

  calculateArchitecturalHealth(structure, complexity, patterns) {
    let score = 100;
    
    // Structure penalties
    if (structure.totalFiles > 500) score -= 10;
    if (structure.averageFileSize > 300) score -= 15;
    
    // Complexity penalties
    if (complexity.complexityScore > 50) score -= 20;
    if (complexity.nestingDepth.max > 10) score -= 15;
    if (complexity.functionComplexity.max > 15) score -= 10;
    
    // Pattern bonuses
    if (patterns.architecturalPatterns.length > 0) score += 10;
    if (patterns.designPatterns.length > 2) score += 5;
    
    // Anti-pattern penalties
    score -= patterns.antiPatterns.length * 5;
    
    score = Math.max(0, Math.min(100, score));
    
    return {
      score,
      grade: score >= 80 ? 'GOOD' : score >= 60 ? 'FAIR' : 'POOR'
    };
  }

  calculateMaintainabilityScore(complexity, patterns) {
    let score = 100;
    
    score -= Math.min(complexity.duplicateCode.length * 10, 30);
    score -= Math.min((complexity.functionComplexity.max - 10) * 2, 20);
    score -= Math.min((complexity.nestingDepth.max - 5) * 3, 30);
    score += patterns.designPatterns.length * 2;
    
    return Math.max(0, Math.min(100, score));
  }

  assessTechnicalDebt(complexity, patterns) {
    const debt = [];
    
    if (complexity.duplicateCode.length > 0) {
      debt.push({
        type: 'Code Duplication',
        severity: 'medium',
        count: complexity.duplicateCode.length,
        impact: 'Maintenance overhead'
      });
    }
    
    if (complexity.functionComplexity.max > 20) {
      debt.push({
        type: 'High Function Complexity',
        severity: 'high',
        value: complexity.functionComplexity.max,
        impact: 'Difficult to test and maintain'
      });
    }
    
    for (const antiPattern of patterns.antiPatterns.slice(0, 3)) {
      debt.push({
        type: antiPattern.type,
        severity: antiPattern.severity,
        file: antiPattern.file,
        impact: 'Reduces code quality'
      });
    }
    
    return debt;
  }

  generateRecommendations(structure, complexity, dependencies) {
    const recommendations = [];
    
    if (complexity.duplicateCode.length > 5) {
      recommendations.push({
        type: 'REFACTORING',
        priority: 'high',
        message: 'Eliminate code duplication',
        action: 'Extract common functionality into shared utilities'
      });
    }
    
    if (structure.largestFiles.some(f => f.lines > 500)) {
      recommendations.push({
        type: 'CODE_ORGANIZATION',
        priority: 'medium',
        message: 'Break down large files',
        action: 'Split large components into smaller, focused modules'
      });
    }
    
    if (dependencies.analysis.security.length > 0) {
      recommendations.push({
        type: 'SECURITY',
        priority: 'critical',
        message: `Fix ${dependencies.analysis.security.length} security vulnerabilities`,
        action: 'Run `npm audit fix` and update vulnerable packages'
      });
    }
    
    return recommendations;
  }

  assessCodeQuality(complexity, patterns) {
    return {
      complexity: complexity.complexityScore < 30 ? 'good' : complexity.complexityScore < 60 ? 'fair' : 'poor',
      patterns: patterns.designPatterns.length > 0 ? 'good' : 'basic',
      maintainability: complexity.duplicateCode.length < 3 ? 'good' : 'needs improvement'
    };
  }

  assessGrowthPotential(structure, patterns) {
    const factors = [];
    
    if (patterns.architecturalPatterns.includes('Component-Based')) {
      factors.push('Modular architecture supports growth');
    }
    
    if (patterns.architecturalPatterns.includes('Service Layer')) {
      factors.push('Service layer enables easy feature addition');
    }
    
    if (structure.byDirectory.src && structure.byDirectory.tests) {
      factors.push('Good separation of concerns');
    }
    
    return factors;
  }

  identifyRiskFactors(complexity, patterns, dependencies) {
    const risks = [];
    
    if (complexity.functionComplexity.max > 20) {
      risks.push({
        type: 'HIGH_COMPLEXITY',
        severity: 'high',
        message: 'Functions with very high complexity are hard to maintain'
      });
    }
    
    if (dependencies.analysis.security.length > 0) {
      risks.push({
        type: 'SECURITY_VULNERABILITIES',
        severity: 'critical',
        count: dependencies.analysis.security.length
      });
    }
    
    if (patterns.antiPatterns.length > 5) {
      risks.push({
        type: 'ANTI_PATTERNS',
        severity: 'medium',
        count: patterns.antiPatterns.length,
        message: 'Multiple anti-patterns detected'
      });
    }
    
    return risks;
  }
}

export default CodeCollector;