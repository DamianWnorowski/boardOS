/**
 * Business Context Collector
 * Analyzes business logic, domain rules, and application-specific patterns
 */

import GeminiHelpers from '../utils/gemini-helpers.js';
import fs from 'fs/promises';
import path from 'path';

export class BusinessCollector {
  constructor() {
    this.name = 'BusinessCollector';
    this.version = '1.0.0';
    this.businessKeywords = [
      'rule', 'constraint', 'validation', 'business', 'domain',
      'workflow', 'process', 'policy', 'requirement', 'schedule',
      'resource', 'assignment', 'operator', 'equipment', 'safety',
      'shift', 'job', 'attachment', 'magnetic', 'drag', 'drop'
    ];
  }

  /**
   * Collect comprehensive business context
   */
  async collect() {
    const startTime = Date.now();
    
    try {
      const [
        domainModels,
        businessRules,
        workflows,
        validations,
        configurations,
        documentation
      ] = await Promise.all([
        this.analyzeDomainModels(),
        this.analyzeBusinessRules(),
        this.analyzeWorkflows(),
        this.analyzeValidations(),
        this.analyzeConfigurations(),
        this.analyzeBusinessDocumentation()
      ]);

      const context = {
        metadata: {
          collector: this.name,
          version: this.version,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime
        },
        
        domain: domainModels,
        rules: businessRules,
        workflows,
        validations,
        configurations,
        documentation,
        
        analysis: {
          businessComplexity: this.calculateBusinessComplexity(businessRules, workflows, validations),
          domainMaturity: this.assessDomainMaturity(domainModels, businessRules, documentation),
          ruleConsistency: this.analyzeRuleConsistency(businessRules, validations),
          recommendations: this.generateBusinessRecommendations(domainModels, businessRules, workflows)
        },
        
        insights: {
          coreBusinessConcepts: this.identifyCoreBusinessConcepts(domainModels, businessRules),
          businessRisks: this.identifyBusinessRisks(businessRules, validations),
          opportunitiesForAutomation: this.identifyAutomationOpportunities(workflows, businessRules)
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
   * Analyze domain models and entities
   */
  async analyzeDomainModels() {
    const models = {
      entities: [],
      valueObjects: [],
      aggregates: [],
      services: [],
      enums: [],
      interfaces: []
    };

    // Find TypeScript interface and type definitions
    const typeFiles = await this.findTypeDefinitionFiles();
    
    for (const file of typeFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        // Extract interfaces
        const interfaces = this.extractInterfaces(content);
        models.interfaces.push(...interfaces.map(i => ({ ...i, file })));
        
        // Extract enums
        const enums = this.extractEnums(content);
        models.enums.push(...enums.map(e => ({ ...e, file })));
        
        // Extract types
        const types = this.extractTypes(content);
        models.valueObjects.push(...types.map(t => ({ ...t, file })));
        
      } catch (error) {
        continue;
      }
    }

    // Analyze service files
    const serviceFiles = await this.findServiceFiles();
    
    for (const file of serviceFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const services = this.extractServices(content);
        models.services.push(...services.map(s => ({ ...s, file })));
      } catch (error) {
        continue;
      }
    }

    // Identify domain entities vs value objects
    models.entities = this.classifyEntities(models.interfaces);
    models.aggregates = this.identifyAggregates(models.entities, models.interfaces);

    return models;
  }

  /**
   * Analyze business rules
   */
  async analyzeBusinessRules() {
    const rules = {
      explicit: [],
      implicit: [],
      safety: [],
      constraints: [],
      calculations: []
    };

    const codeFiles = await this.findBusinessLogicFiles();
    
    for (const file of codeFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        // Extract explicit business rules (comments and constants)
        rules.explicit.push(...this.extractExplicitRules(content, file));
        
        // Extract implicit rules from validation logic
        rules.implicit.push(...this.extractImplicitRules(content, file));
        
        // Extract safety-related rules
        rules.safety.push(...this.extractSafetyRules(content, file));
        
        // Extract constraint logic
        rules.constraints.push(...this.extractConstraints(content, file));
        
        // Extract calculation rules
        rules.calculations.push(...this.extractCalculations(content, file));
        
      } catch (error) {
        continue;
      }
    }

    // Analyze BoardOS specific rules
    rules.boardOSSpecific = this.extractBoardOSRules(rules);

    return rules;
  }

  /**
   * Analyze workflows and processes
   */
  async analyzeWorkflows() {
    const workflows = {
      userJourneys: [],
      businessProcesses: [],
      stateTransitions: [],
      eventHandlers: []
    };

    const componentFiles = await this.findComponentFiles();
    const serviceFiles = await this.findServiceFiles();
    
    // Analyze component workflows
    for (const file of componentFiles.slice(0, 30)) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        workflows.userJourneys.push(...this.extractUserJourneys(content, file));
        workflows.eventHandlers.push(...this.extractEventHandlers(content, file));
        
      } catch (error) {
        continue;
      }
    }
    
    // Analyze service workflows
    for (const file of serviceFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        workflows.businessProcesses.push(...this.extractBusinessProcesses(content, file));
        workflows.stateTransitions.push(...this.extractStateTransitions(content, file));
        
      } catch (error) {
        continue;
      }
    }

    return workflows;
  }

  /**
   * Analyze validation rules
   */
  async analyzeValidations() {
    const validations = {
      inputValidations: [],
      businessValidations: [],
      dataValidations: [],
      crossFieldValidations: []
    };

    const files = await this.findValidationFiles();
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        validations.inputValidations.push(...this.extractInputValidations(content, file));
        validations.businessValidations.push(...this.extractBusinessValidations(content, file));
        validations.dataValidations.push(...this.extractDataValidations(content, file));
        validations.crossFieldValidations.push(...this.extractCrossFieldValidations(content, file));
        
      } catch (error) {
        continue;
      }
    }

    return validations;
  }

  /**
   * Analyze business configurations
   */
  async analyzeConfigurations() {
    const configurations = {
      businessConfig: {},
      featureFlags: {},
      constants: {},
      rules: {}
    };

    // Check for configuration files
    const configFiles = [
      'src/config/business.ts',
      'src/config/rules.ts',
      'src/config/constants.ts',
      'src/utils/constants.ts',
      'config.json',
      'business-config.json'
    ];

    for (const configFile of configFiles) {
      if (await ClaudeHelpers.fileExists(configFile)) {
        try {
          const content = await fs.readFile(configFile, 'utf-8');
          
          if (configFile.endsWith('.json')) {
            configurations.businessConfig[configFile] = JSON.parse(content);
          } else {
            configurations.constants[configFile] = this.extractConstants(content);
          }
          
        } catch (error) {
          continue;
        }
      }
    }

    // Look for business constants in code
    const codeFiles = await this.findBusinessLogicFiles();
    
    for (const file of codeFiles.slice(0, 20)) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const constants = this.extractBusinessConstants(content);
        
        if (constants.length > 0) {
          configurations.constants[file] = constants;
        }
        
      } catch (error) {
        continue;
      }
    }

    return configurations;
  }

  /**
   * Analyze business documentation
   */
  async analyzeBusinessDocumentation() {
    const documentation = {
      businessDocs: [],
      requirements: [],
      specifications: [],
      userStories: [],
      domainGlossary: {}
    };

    const docFiles = await this.findDocumentationFiles();
    
    for (const file of docFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const fileName = path.basename(file).toLowerCase();
        
        if (fileName.includes('business') || fileName.includes('domain')) {
          documentation.businessDocs.push({
            file,
            content: content.substring(0, 1000), // Preview
            wordCount: content.split(/\s+/).length,
            sections: this.extractMarkdownSections(content)
          });
        }
        
        if (fileName.includes('requirement') || fileName.includes('spec')) {
          documentation.requirements.push({
            file,
            requirements: this.extractRequirements(content)
          });
        }
        
        // Extract glossary terms
        const glossaryTerms = this.extractGlossaryTerms(content);
        Object.assign(documentation.domainGlossary, glossaryTerms);
        
      } catch (error) {
        continue;
      }
    }

    // Extract inline documentation from code
    const codeFiles = await this.findBusinessLogicFiles();
    for (const file of codeFiles.slice(0, 10)) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const inlineDoc = this.extractInlineBusinessDoc(content);
        
        if (inlineDoc.length > 0) {
          documentation.businessDocs.push({
            file,
            type: 'inline',
            documentation: inlineDoc
          });
        }
        
      } catch (error) {
        continue;
      }
    }

    return documentation;
  }

  // Helper methods

  async findTypeDefinitionFiles() {
    const result = await ClaudeHelpers.execSafe('find . -name "*.ts" -o -name "*.tsx" | grep -E "(types|interfaces|models)" | grep -v node_modules | head -20');
    if (!result.stdout) return [];
    return result.stdout.split('\n').filter(f => f);
  }

  async findServiceFiles() {
    const result = await GeminiHelpers.execSafe('find . -name "*service*" -o -name "*Service*" -o -path "*/services/*" | grep -E "\\.(ts|js)$" | grep -v node_modules | head -15');
    if (!result.stdout) return [];
    return result.stdout.split('\n').filter(f => f);
  }

  async findBusinessLogicFiles() {
    const result = await ClaudeHelpers.execSafe('find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v test | head -50');
    if (!result.stdout) return [];
    return result.stdout.split('\n').filter(f => f);
  }

  async findComponentFiles() {
    const result = await ClaudeHelpers.execSafe('find . -path "*/components/*" -name "*.tsx" -o -name "*.jsx" | grep -v node_modules | head -30');
    if (!result.stdout) return [];
    return result.stdout.split('\n').filter(f => f);
  }

  async findValidationFiles() {
    const result = await ClaudeHelpers.execSafe('find . -name "*validation*" -o -name "*validator*" -o -name "*schema*" | grep -E "\\.(ts|js)$" | grep -v node_modules | head -10');
    if (!result.stdout) return [];
    
    // Also include files with validation logic
    const allFiles = await this.findBusinessLogicFiles();
    return [...result.stdout.split('\n').filter(f => f), ...allFiles.slice(0, 20)];
  }

  async findDocumentationFiles() {
    const result = await ClaudeHelpers.execSafe('find . -name "*.md" -o -name "*.txt" | grep -v node_modules | head -20');
    if (!result.stdout) return [];
    return result.stdout.split('\n').filter(f => f);
  }

  // Extraction methods

  extractInterfaces(content) {
    const interfaces = [];
    const interfaceRegex = /interface\s+(\w+)\s*{([^}]*)}/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      const properties = this.extractProperties(body);
      
      interfaces.push({
        name,
        properties,
        isBusinessEntity: this.isBusinessEntity(name, properties)
      });
    }
    
    return interfaces;
  }

  extractEnums(content) {
    const enums = [];
    const enumRegex = /enum\s+(\w+)\s*{([^}]*)}/g;
    let match;
    
    while ((match = enumRegex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      const values = body.split(',').map(v => v.trim()).filter(v => v);
      
      enums.push({
        name,
        values,
        isBusinessEnum: this.businessKeywords.some(keyword => 
          name.toLowerCase().includes(keyword) || 
          values.some(v => v.toLowerCase().includes(keyword))
        )
      });
    }
    
    return enums;
  }

  extractTypes(content) {
    const types = [];
    const typeRegex = /type\s+(\w+)\s*=\s*([^;]+);?/g;
    let match;
    
    while ((match = typeRegex.exec(content)) !== null) {
      const name = match[1];
      const definition = match[2].trim();
      
      types.push({
        name,
        definition,
        isBusinessType: this.isBusinessType(name, definition)
      });
    }
    
    return types;
  }

  extractServices(content) {
    const services = [];
    
    // Look for class definitions that might be services
    const classRegex = /class\s+(\w+)\s*{/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const name = match[1];
      const methods = this.extractMethods(content, match.index);
      
      if (name.includes('Service') || methods.some(m => this.isBusinessMethod(m))) {
        services.push({
          name,
          methods,
          isBusinessService: true
        });
      }
    }
    
    return services;
  }

  extractExplicitRules(content, file) {
    const rules = [];
    
    // Extract from comments
    const commentRegex = /\/\*\*?\s*(.*?(?:rule|constraint|must|should|requirement).*?)\s*\*\//gi;
    let match;
    
    while ((match = commentRegex.exec(content)) !== null) {
      rules.push({
        type: 'explicit_comment',
        text: match[1].replace(/\*/g, '').trim(),
        file,
        line: this.getLineNumber(content, match.index)
      });
    }
    
    // Extract from constants with business meaning
    const constRegex = /const\s+(\w*(?:RULE|CONSTRAINT|LIMIT|MAX|MIN)\w*)\s*=\s*([^;]+);?/gi;
    while ((match = constRegex.exec(content)) !== null) {
      rules.push({
        type: 'business_constant',
        name: match[1],
        value: match[2].trim(),
        file,
        line: this.getLineNumber(content, match.index)
      });
    }
    
    return rules;
  }

  extractImplicitRules(content, file) {
    const rules = [];
    
    // Extract from if conditions that look like business rules
    const ifRegex = /if\s*\(([^{]+)\)\s*{/g;
    let match;
    
    while ((match = ifRegex.exec(content)) !== null) {
      const condition = match[1].trim();
      
      if (this.looksLikeBusinessRule(condition)) {
        rules.push({
          type: 'conditional_rule',
          condition,
          file,
          line: this.getLineNumber(content, match.index)
        });
      }
    }
    
    return rules;
  }

  extractSafetyRules(content, file) {
    const safetyRules = [];
    const safetyKeywords = ['safety', 'must', 'required', 'operator', 'driver', 'equipment'];
    
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      if (safetyKeywords.some(keyword => line.includes(keyword))) {
        // Check if this looks like a safety rule
        if (line.includes('must') || line.includes('required') || line.includes('safety')) {
          safetyRules.push({
            type: 'safety_rule',
            text: lines[i].trim(),
            file,
            line: i + 1
          });
        }
      }
    }
    
    return safetyRules;
  }

  extractConstraints(content, file) {
    const constraints = [];
    
    // Look for validation patterns
    const validationPatterns = [
      /\.length\s*[<>=!]+\s*\d+/g,
      /\w+\s*[<>=!]+\s*\d+/g,
      /\w+\.includes\(/g,
      /\w+\.some\(/g,
      /\w+\.every\(/g
    ];
    
    for (const pattern of validationPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        constraints.push({
          type: 'validation_constraint',
          pattern: match[0],
          file,
          line: this.getLineNumber(content, match.index)
        });
      }
    }
    
    return constraints;
  }

  extractCalculations(content, file) {
    const calculations = [];
    
    // Look for calculation patterns
    const calcRegex = /(\w+)\s*=\s*([^;]+(?:\+|-|\*|\/)[^;]+);?/g;
    let match;
    
    while ((match = calcRegex.exec(content)) !== null) {
      const variable = match[1];
      const expression = match[2];
      
      if (this.looksLikeBusinessCalculation(variable, expression)) {
        calculations.push({
          type: 'calculation',
          variable,
          expression: expression.trim(),
          file,
          line: this.getLineNumber(content, match.index)
        });
      }
    }
    
    return calculations;
  }

  extractBoardOSRules(rules) {
    const boardOSRules = {
      safetyRules: [],
      attachmentRules: [],
      schedulingRules: [],
      resourceRules: []
    };
    
    // Categorize rules specific to BoardOS domain
    const allRules = [...rules.explicit, ...rules.implicit, ...rules.safety, ...rules.constraints];
    
    for (const rule of allRules) {
      const text = rule.text || rule.condition || rule.pattern || '';
      const textLower = text.toLowerCase();
      
      if (textLower.includes('equipment') && (textLower.includes('operator') || textLower.includes('must'))) {
        boardOSRules.safetyRules.push(rule);
      } else if (textLower.includes('attach') || textLower.includes('magnet')) {
        boardOSRules.attachmentRules.push(rule);
      } else if (textLower.includes('schedule') || textLower.includes('job') || textLower.includes('shift')) {
        boardOSRules.schedulingRules.push(rule);
      } else if (textLower.includes('resource') || textLower.includes('assignment')) {
        boardOSRules.resourceRules.push(rule);
      }
    }
    
    return boardOSRules;
  }

  // Additional extraction methods for workflows, validations, etc.
  extractUserJourneys(content, file) {
    const journeys = [];
    
    // Look for event handlers and user interactions
    const eventHandlerRegex = /(onClick|onDrag|onDrop|onSubmit|onChange)\s*=\s*{?([^}]+)}?/g;
    let match;
    
    while ((match = eventHandlerRegex.exec(content)) !== null) {
      journeys.push({
        type: 'user_interaction',
        event: match[1],
        handler: match[2].trim().substring(0, 100),
        file,
        line: this.getLineNumber(content, match.index)
      });
    }
    
    return journeys;
  }

  extractBusinessProcesses(content, file) {
    const processes = [];
    
    // Look for method names that suggest business processes
    const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1];
      
      if (this.isBusinessProcessMethod(methodName)) {
        processes.push({
          name: methodName,
          file,
          line: this.getLineNumber(content, match.index)
        });
      }
    }
    
    return processes;
  }

  // Utility methods

  extractProperties(interfaceBody) {
    const properties = [];
    const lines = interfaceBody.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//')) {
        const propMatch = trimmed.match(/(\w+)(\??):\s*([^;]+);?/);
        if (propMatch) {
          properties.push({
            name: propMatch[1],
            optional: propMatch[2] === '?',
            type: propMatch[3].trim()
          });
        }
      }
    }
    
    return properties;
  }

  isBusinessEntity(name, properties) {
    const businessEntityKeywords = ['resource', 'job', 'assignment', 'operator', 'equipment', 'schedule'];
    return businessEntityKeywords.some(keyword => name.toLowerCase().includes(keyword)) ||
           properties.some(p => businessEntityKeywords.some(keyword => p.name.toLowerCase().includes(keyword)));
  }

  isBusinessType(name, definition) {
    return this.businessKeywords.some(keyword => 
      name.toLowerCase().includes(keyword) || 
      definition.toLowerCase().includes(keyword)
    );
  }

  isBusinessMethod(method) {
    const businessMethodKeywords = ['assign', 'schedule', 'attach', 'validate', 'calculate', 'process'];
    return businessMethodKeywords.some(keyword => method.name.toLowerCase().includes(keyword));
  }

  looksLikeBusinessRule(condition) {
    const businessIndicators = ['length', 'includes', 'type', 'status', 'can', 'must', 'should', 'operator', 'equipment'];
    return businessIndicators.some(indicator => condition.toLowerCase().includes(indicator));
  }

  looksLikeBusinessCalculation(variable, expression) {
    const businessCalcKeywords = ['total', 'count', 'sum', 'price', 'cost', 'time', 'duration', 'hours'];
    return businessCalcKeywords.some(keyword => 
      variable.toLowerCase().includes(keyword) || 
      expression.toLowerCase().includes(keyword)
    );
  }

  isBusinessProcessMethod(methodName) {
    const processKeywords = ['process', 'handle', 'execute', 'perform', 'calculate', 'validate', 'assign', 'schedule'];
    return processKeywords.some(keyword => methodName.toLowerCase().includes(keyword));
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  // Analysis methods

  calculateBusinessComplexity(businessRules, workflows, validations) {
    let score = 0;
    
    score += businessRules.explicit.length * 2;
    score += businessRules.implicit.length * 1.5;
    score += businessRules.safety.length * 3;
    score += businessRules.constraints.length * 1;
    score += workflows.businessProcesses.length * 2;
    score += validations.businessValidations.length * 1.5;
    
    let complexity;
    if (score < 20) complexity = 'LOW';
    else if (score < 50) complexity = 'MEDIUM';
    else if (score < 100) complexity = 'HIGH';
    else complexity = 'VERY_HIGH';
    
    return {
      score,
      complexity,
      factors: {
        rules: businessRules.explicit.length + businessRules.implicit.length,
        safety: businessRules.safety.length,
        workflows: workflows.businessProcesses.length,
        validations: validations.businessValidations.length
      }
    };
  }

  assessDomainMaturity(domainModels, businessRules, documentation) {
    let score = 0;
    
    // Domain modeling maturity
    if (domainModels.entities.length > 5) score += 20;
    if (domainModels.enums.some(e => e.isBusinessEnum)) score += 15;
    if (domainModels.services.length > 0) score += 15;
    
    // Business rules maturity
    if (businessRules.explicit.length > 10) score += 15;
    if (businessRules.safety.length > 0) score += 10;
    if (businessRules.boardOSSpecific) score += 15;
    
    // Documentation maturity
    if (documentation.businessDocs.length > 0) score += 10;
    
    let maturity;
    if (score >= 80) maturity = 'MATURE';
    else if (score >= 60) maturity = 'DEVELOPING';
    else if (score >= 40) maturity = 'BASIC';
    else maturity = 'IMMATURE';
    
    return {
      score,
      maturity,
      strengths: this.identifyDomainStrengths(domainModels, businessRules, documentation),
      gaps: this.identifyDomainGaps(domainModels, businessRules, documentation)
    };
  }

  analyzeRuleConsistency(businessRules, validations) {
    const consistency = {
      score: 100,
      issues: [],
      duplicates: [],
      conflicts: []
    };
    
    // Look for duplicate rules
    const allRules = [...businessRules.explicit, ...businessRules.implicit];
    const ruleTexts = allRules.map(r => (r.text || r.condition || '').toLowerCase());
    
    const duplicates = [];
    for (let i = 0; i < ruleTexts.length; i++) {
      for (let j = i + 1; j < ruleTexts.length; j++) {
        if (ruleTexts[i] && ruleTexts[j] && this.areSimilarRules(ruleTexts[i], ruleTexts[j])) {
          duplicates.push([allRules[i], allRules[j]]);
        }
      }
    }
    
    consistency.duplicates = duplicates.slice(0, 5);
    consistency.score -= duplicates.length * 5;
    
    return consistency;
  }

  generateBusinessRecommendations(domainModels, businessRules, workflows) {
    const recommendations = [];
    
    if (businessRules.explicit.length < 5) {
      recommendations.push({
        type: 'DOCUMENT_RULES',
        priority: 'high',
        message: 'Document explicit business rules',
        action: 'Add comments and documentation for business logic',
        benefit: 'Improves maintainability and knowledge transfer'
      });
    }
    
    if (businessRules.safety.length === 0 && domainModels.entities.some(e => e.name.toLowerCase().includes('equipment'))) {
      recommendations.push({
        type: 'SAFETY_RULES',
        priority: 'critical',
        message: 'Define safety rules for equipment operations',
        action: 'Document and implement safety constraints',
        benefit: 'Prevents unsafe equipment-operator assignments'
      });
    }
    
    if (workflows.businessProcesses.length > 20) {
      recommendations.push({
        type: 'REFACTOR_PROCESSES',
        priority: 'medium',
        message: 'Consider breaking down complex business processes',
        action: 'Split large processes into smaller, focused methods',
        benefit: 'Improves testability and maintainability'
      });
    }
    
    return recommendations;
  }

  identifyCoreBusinessConcepts(domainModels, businessRules) {
    const concepts = [];
    
    // From domain models
    const businessEntities = domainModels.entities.filter(e => e.isBusinessEntity);
    concepts.push(...businessEntities.map(e => ({
      type: 'ENTITY',
      name: e.name,
      importance: 'high',
      source: 'domain_model'
    })));
    
    // From business rules
    const ruleKeywords = this.extractKeywordsFromRules(businessRules);
    const topKeywords = Object.entries(ruleKeywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({
        type: 'CONCEPT',
        name: keyword,
        importance: count > 5 ? 'high' : count > 2 ? 'medium' : 'low',
        source: 'business_rules',
        frequency: count
      }));
    
    concepts.push(...topKeywords);
    
    return concepts;
  }

  identifyBusinessRisks(businessRules, validations) {
    const risks = [];
    
    // Missing safety rules
    if (businessRules.safety.length === 0) {
      risks.push({
        type: 'MISSING_SAFETY_RULES',
        severity: 'high',
        message: 'No explicit safety rules defined',
        impact: 'Potential unsafe operations'
      });
    }
    
    // Complex implicit rules
    const complexImplicitRules = businessRules.implicit.filter(r => 
      (r.condition || '').length > 100
    );
    
    if (complexImplicitRules.length > 0) {
      risks.push({
        type: 'COMPLEX_IMPLICIT_RULES',
        severity: 'medium',
        count: complexImplicitRules.length,
        message: 'Complex business logic embedded in code',
        impact: 'Difficult to maintain and modify business rules'
      });
    }
    
    return risks;
  }

  identifyAutomationOpportunities(workflows, businessRules) {
    const opportunities = [];
    
    // Repetitive validation patterns
    const validationPatterns = businessRules.constraints.map(c => c.pattern);
    const commonPatterns = this.findCommonPatterns(validationPatterns);
    
    if (commonPatterns.length > 0) {
      opportunities.push({
        type: 'VALIDATION_AUTOMATION',
        description: 'Automate common validation patterns',
        patterns: commonPatterns,
        benefit: 'Reduces code duplication and improves consistency'
      });
    }
    
    // Business process automation
    const processableWorkflows = workflows.businessProcesses.filter(p => 
      this.isAutomatableProcess(p.name)
    );
    
    if (processableWorkflows.length > 0) {
      opportunities.push({
        type: 'PROCESS_AUTOMATION',
        description: 'Automate routine business processes',
        processes: processableWorkflows.slice(0, 3),
        benefit: 'Reduces manual effort and errors'
      });
    }
    
    return opportunities;
  }

  // Additional utility methods

  areSimilarRules(rule1, rule2) {
    if (rule1.length < 10 || rule2.length < 10) return false;
    
    const words1 = rule1.split(/\s+/);
    const words2 = rule2.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w));
    
    return commonWords.length / Math.max(words1.length, words2.length) > 0.6;
  }

  extractKeywordsFromRules(businessRules) {
    const keywords = {};
    const allRules = [...businessRules.explicit, ...businessRules.implicit, ...businessRules.safety];
    
    for (const rule of allRules) {
      const text = (rule.text || rule.condition || '').toLowerCase();
      const words = text.match(/\b[a-zA-Z]{4,}\b/g) || [];
      
      for (const word of words) {
        if (this.businessKeywords.includes(word)) {
          keywords[word] = (keywords[word] || 0) + 1;
        }
      }
    }
    
    return keywords;
  }

  findCommonPatterns(patterns) {
    const patternCounts = {};
    
    for (const pattern of patterns) {
      // Normalize pattern
      const normalized = pattern.replace(/\w+/g, 'VAR').replace(/\d+/g, 'NUM');
      patternCounts[normalized] = (patternCounts[normalized] || 0) + 1;
    }
    
    return Object.entries(patternCounts)
      .filter(([, count]) => count > 2)
      .map(([pattern, count]) => ({ pattern, count }))
      .slice(0, 5);
  }

  isAutomatableProcess(processName) {
    const automatableKeywords = ['calculate', 'validate', 'check', 'process', 'generate', 'update'];
    return automatableKeywords.some(keyword => processName.toLowerCase().includes(keyword));
  }

  identifyDomainStrengths(domainModels, businessRules, documentation) {
    const strengths = [];
    
    if (domainModels.entities.filter(e => e.isBusinessEntity).length > 5) {
      strengths.push('Well-defined domain entities');
    }
    
    if (businessRules.safety.length > 0) {
      strengths.push('Safety rules documented');
    }
    
    if (businessRules.explicit.length > 10) {
      strengths.push('Good explicit rule documentation');
    }
    
    return strengths;
  }

  identifyDomainGaps(domainModels, businessRules, documentation) {
    const gaps = [];
    
    if (businessRules.explicit.length < 5) {
      gaps.push('Limited explicit business rule documentation');
    }
    
    if (documentation.businessDocs.length === 0) {
      gaps.push('Missing business domain documentation');
    }
    
    if (domainModels.services.length === 0) {
      gaps.push('No clear domain services identified');
    }
    
    return gaps;
  }

  // Stub implementations for remaining extraction methods
  extractEventHandlers(content, file) { return []; }
  extractStateTransitions(content, file) { return []; }
  extractInputValidations(content, file) { return []; }
  extractBusinessValidations(content, file) { return []; }
  extractDataValidations(content, file) { return []; }
  extractCrossFieldValidations(content, file) { return []; }
  extractConstants(content) { return []; }
  extractBusinessConstants(content) { return []; }
  extractMarkdownSections(content) { return []; }
  extractRequirements(content) { return []; }
  extractGlossaryTerms(content) { return {}; }
  extractInlineBusinessDoc(content) { return []; }
  extractMethods(content, startIndex) { return []; }
}

export default BusinessCollector;