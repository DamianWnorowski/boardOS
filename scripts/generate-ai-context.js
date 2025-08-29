#!/usr/bin/env node

/**
 * Auto-generation script for AI context documentation
 * Extracts API, business logic, and component information from TypeScript files
 * and updates the .aimd files automatically
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  srcDir: path.resolve(__dirname, '../src'),
  docsDir: path.resolve(__dirname, '../docs/ai-context'),
  outputFiles: {
    api: 'api.aimd',
    businessLogic: 'business-logic.aimd',
    components: 'components.aimd'
  },
  excludePaths: ['__tests__', 'test', '.test.', '.spec.']
};

class AIContextGenerator {
  constructor() {
    this.apiData = {
      services: {},
      hooks: {},
      utilities: {},
      contextProviders: {},
      types: {}
    };
    this.businessLogicData = {
      rules: {},
      validations: {},
      constants: {},
      workflows: {}
    };
    this.componentData = {
      coreComponents: {},
      modalComponents: {},
      layoutComponents: {},
      mobileComponents: {},
      uiComponents: {}
    };
  }

  /**
   * Main execution function
   */
  async generate() {
    console.log('🚀 Starting AI Context Documentation Generation...');
    
    try {
      // Parse all TypeScript files
      await this.parseSourceFiles();
      
      // Generate documentation files
      await this.generateAPIContext();
      await this.generateBusinessLogicContext();
      await this.generateComponentContext();
      
      console.log('✅ AI Context Documentation Generated Successfully!');
    } catch (error) {
      console.error('❌ Error generating AI context documentation:', error);
      process.exit(1);
    }
  }

  /**
   * Parse all TypeScript files in the src directory
   */
  async parseSourceFiles() {
    console.log('📁 Parsing source files...');
    
    const files = this.getAllTSFiles(CONFIG.srcDir);
    
    for (const filePath of files) {
      if (this.shouldSkipFile(filePath)) continue;
      
      const content = fs.readFileSync(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );
      
      await this.analyzeFile(filePath, sourceFile, content);
    }
  }

  /**
   * Get all TypeScript files recursively
   */
  getAllTSFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !this.shouldSkipPath(fullPath)) {
        files.push(...this.getAllTSFiles(fullPath));
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Check if file should be skipped
   */
  shouldSkipFile(filePath) {
    return CONFIG.excludePaths.some(exclude => filePath.includes(exclude));
  }

  /**
   * Check if path should be skipped
   */
  shouldSkipPath(dirPath) {
    return CONFIG.excludePaths.some(exclude => dirPath.includes(exclude));
  }

  /**
   * Analyze individual TypeScript file
   */
  async analyzeFile(filePath, sourceFile, content) {
    const relativePath = path.relative(CONFIG.srcDir, filePath);
    const fileCategory = this.categorizeFile(relativePath);
    
    // Extract exports, functions, classes, interfaces
    const exports = this.extractExports(sourceFile, content);
    const functions = this.extractFunctions(sourceFile, content);
    const classes = this.extractClasses(sourceFile, content);
    const interfaces = this.extractInterfaces(sourceFile, content);
    const constants = this.extractConstants(sourceFile, content);
    
    // Categorize based on file path and content
    switch (fileCategory) {
      case 'service':
        this.analyzeServiceFile(relativePath, { exports, functions, classes, interfaces, constants, content });
        break;
      case 'hook':
        this.analyzeHookFile(relativePath, { exports, functions, constants, content });
        break;
      case 'utility':
        this.analyzeUtilityFile(relativePath, { exports, functions, constants, content });
        break;
      case 'component':
        this.analyzeComponentFile(relativePath, { exports, functions, interfaces, content });
        break;
      case 'context':
        this.analyzeContextFile(relativePath, { exports, functions, interfaces, content });
        break;
      case 'type':
        this.analyzeTypeFile(relativePath, { exports, interfaces, constants, content });
        break;
      case 'businessLogic':
        this.analyzeBusinessLogicFile(relativePath, { exports, functions, constants, content });
        break;
    }
  }

  /**
   * Categorize file based on path and content
   */
  categorizeFile(filePath) {
    if (filePath.includes('/services/')) return 'service';
    if (filePath.includes('/hooks/')) return 'hook';
    if (filePath.includes('/utils/')) return 'utility';
    if (filePath.includes('/components/')) return 'component';
    if (filePath.includes('/context/')) return 'context';
    if (filePath.includes('/types/')) return 'type';
    
    // Special business logic files
    if (filePath.includes('attachmentRules') || 
        filePath.includes('ruleCreator') || 
        filePath.includes('colorSystem') ||
        filePath.includes('timeConflictDetection') ||
        filePath.includes('jobUtils')) {
      return 'businessLogic';
    }
    
    return 'unknown';
  }

  /**
   * Extract exports from AST
   */
  extractExports(sourceFile, content) {
    const exports = [];
    
    const visit = (node) => {
      if (ts.isExportDeclaration(node)) {
        // Handle export declarations
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          node.exportClause.elements.forEach(element => {
            exports.push({
              type: 'named',
              name: element.name.text,
              isDefault: false
            });
          });
        }
      } else if (ts.isFunctionDeclaration(node) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
        exports.push({
          type: 'function',
          name: node.name?.text || 'anonymous',
          isDefault: node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword)
        });
      } else if (ts.isClassDeclaration(node) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
        exports.push({
          type: 'class',
          name: node.name?.text || 'anonymous',
          isDefault: node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword)
        });
      } else if (ts.isVariableStatement(node) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            exports.push({
              type: 'variable',
              name: decl.name.text,
              isDefault: false
            });
          }
        });
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return exports;
  }

  /**
   * Extract functions with their JSDoc comments
   */
  extractFunctions(sourceFile, content) {
    const functions = [];
    
    const visit = (node) => {
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        const name = node.name?.text || 'anonymous';
        const jsDoc = this.extractJSDoc(node, content);
        const params = node.parameters.map(param => ({
          name: param.name.getText(),
          type: param.type?.getText() || 'any',
          optional: param.questionToken !== undefined
        }));
        const returnType = node.type?.getText() || 'void';
        
        functions.push({
          name,
          params,
          returnType,
          jsDoc,
          isStatic: node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword),
          isAsync: node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword)
        });
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return functions;
  }

  /**
   * Extract classes with their methods
   */
  extractClasses(sourceFile, content) {
    const classes = [];
    
    const visit = (node) => {
      if (ts.isClassDeclaration(node)) {
        const name = node.name?.text || 'Anonymous';
        const methods = [];
        const properties = [];
        
        node.members.forEach(member => {
          if (ts.isMethodDeclaration(member)) {
            methods.push({
              name: member.name?.getText() || 'anonymous',
              params: member.parameters.map(p => p.name.getText()),
              returnType: member.type?.getText() || 'void',
              isStatic: member.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)
            });
          } else if (ts.isPropertyDeclaration(member)) {
            properties.push({
              name: member.name?.getText() || 'anonymous',
              type: member.type?.getText() || 'any',
              isStatic: member.modifiers?.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword)
            });
          }
        });
        
        classes.push({
          name,
          methods,
          properties,
          jsDoc: this.extractJSDoc(node, content)
        });
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return classes;
  }

  /**
   * Extract interfaces
   */
  extractInterfaces(sourceFile, content) {
    const interfaces = [];
    
    const visit = (node) => {
      if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        const properties = node.members.map(member => {
          if (ts.isPropertySignature(member)) {
            return {
              name: member.name?.getText() || 'unknown',
              type: member.type?.getText() || 'any',
              optional: member.questionToken !== undefined
            };
          }
          return null;
        }).filter(Boolean);
        
        interfaces.push({
          name,
          properties,
          jsDoc: this.extractJSDoc(node, content)
        });
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return interfaces;
  }

  /**
   * Extract constants and enums
   */
  extractConstants(sourceFile, content) {
    const constants = [];
    
    const visit = (node) => {
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name) && decl.initializer) {
            constants.push({
              name: decl.name.text,
              type: 'variable',
              value: decl.initializer.getText()
            });
          }
        });
      } else if (ts.isEnumDeclaration(node)) {
        constants.push({
          name: node.name.text,
          type: 'enum',
          members: node.members.map(member => member.name.getText())
        });
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return constants;
  }

  /**
   * Extract JSDoc comments
   */
  extractJSDoc(node, content) {
    const sourceFile = node.getSourceFile();
    const fullText = sourceFile.getFullText();
    const jsDoc = ts.getJSDocCommentsAndTags(node);
    
    if (jsDoc.length > 0) {
      const comment = jsDoc[0];
      const commentText = fullText.substring(comment.pos, comment.end);
      return commentText.replace(/\/\*\*|\*\/|\* /g, '').trim();
    }
    
    return '';
  }

  /**
   * Analyze service files
   */
  analyzeServiceFile(filePath, data) {
    const serviceName = path.basename(filePath, '.ts').replace('Service', '');
    this.apiData.services[serviceName] = {
      file: `src/${filePath}`,
      description: this.extractDescriptionFromContent(data.content),
      classes: data.classes,
      functions: data.functions,
      exports: data.exports
    };
  }

  /**
   * Analyze hook files
   */
  analyzeHookFile(filePath, data) {
    const hookName = path.basename(filePath, '.ts');
    this.apiData.hooks[hookName] = {
      file: `src/${filePath}`,
      description: this.extractDescriptionFromContent(data.content),
      functions: data.functions,
      exports: data.exports
    };
  }

  /**
   * Analyze utility files
   */
  analyzeUtilityFile(filePath, data) {
    const utilName = path.basename(filePath, '.ts');
    this.apiData.utilities[utilName] = {
      file: `src/${filePath}`,
      description: this.extractDescriptionFromContent(data.content),
      functions: data.functions,
      constants: data.constants,
      exports: data.exports
    };
  }

  /**
   * Analyze component files
   */
  analyzeComponentFile(filePath, data) {
    const componentName = path.basename(filePath, '.tsx');
    const category = this.categorizeComponent(filePath);
    
    if (!this.componentData[category]) {
      this.componentData[category] = {};
    }
    
    this.componentData[category][componentName] = {
      file: `src/${filePath}`,
      description: this.extractDescriptionFromContent(data.content),
      props: this.extractPropsFromComponent(data.content),
      functions: data.functions,
      exports: data.exports
    };
  }

  /**
   * Analyze context files
   */
  analyzeContextFile(filePath, data) {
    const contextName = path.basename(filePath, '.tsx');
    this.apiData.contextProviders[contextName] = {
      file: `src/${filePath}`,
      description: this.extractDescriptionFromContent(data.content),
      interfaces: data.interfaces,
      functions: data.functions,
      exports: data.exports
    };
  }

  /**
   * Analyze type files
   */
  analyzeTypeFile(filePath, data) {
    const typeName = path.basename(filePath, '.ts');
    this.apiData.types[typeName] = {
      file: `src/${filePath}`,
      interfaces: data.interfaces,
      constants: data.constants,
      exports: data.exports
    };
  }

  /**
   * Analyze business logic files
   */
  analyzeBusinessLogicFile(filePath, data) {
    const fileName = path.basename(filePath, '.ts');
    
    // Categorize business logic
    if (fileName.includes('Rule') || fileName.includes('rule')) {
      this.businessLogicData.rules[fileName] = {
        file: `src/${filePath}`,
        description: this.extractDescriptionFromContent(data.content),
        functions: data.functions,
        constants: data.constants
      };
    } else if (fileName.includes('color') || fileName.includes('Color')) {
      this.businessLogicData.workflows[fileName] = {
        file: `src/${filePath}`,
        description: this.extractDescriptionFromContent(data.content),
        functions: data.functions,
        constants: data.constants
      };
    }
  }

  /**
   * Categorize component by file path
   */
  categorizeComponent(filePath) {
    if (filePath.includes('/modal')) return 'modalComponents';
    if (filePath.includes('/layout')) return 'layoutComponents';
    if (filePath.includes('/mobile')) return 'mobileComponents';
    if (filePath.includes('/ui/')) return 'uiComponents';
    if (filePath.includes('/board/') || filePath.includes('/resources/')) return 'coreComponents';
    return 'miscComponents';
  }

  /**
   * Extract component props from React component
   */
  extractPropsFromComponent(content) {
    const propsRegex = /interface\s+(\w+Props)\s*{([^}]*)}/g;
    const props = [];
    let match;
    
    while ((match = propsRegex.exec(content)) !== null) {
      const propsText = match[2];
      const propLines = propsText.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(line => {
          const propMatch = line.match(/(\w+)(\??):\s*([^;]+)/);
          if (propMatch) {
            return {
              name: propMatch[1],
              optional: propMatch[2] === '?',
              type: propMatch[3].trim()
            };
          }
          return null;
        })
        .filter(Boolean);
      
      props.push(...propLines);
    }
    
    return props;
  }

  /**
   * Extract description from file content
   */
  extractDescriptionFromContent(content) {
    // Look for JSDoc at the top of the file
    const jsDocMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.*?)\n\s*\*\//);
    if (jsDocMatch) {
      return jsDocMatch[1].trim();
    }
    
    // Look for single-line comments
    const commentMatch = content.match(/^\/\/\s*(.*?)$/m);
    if (commentMatch) {
      return commentMatch[1].trim();
    }
    
    return '';
  }

  /**
   * Generate API context documentation
   */
  async generateAPIContext() {
    console.log('📝 Generating API context documentation...');
    
    const content = this.buildAPIContextContent();
    const outputPath = path.join(CONFIG.docsDir, CONFIG.outputFiles.api);
    
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  /**
   * Generate business logic context documentation
   */
  async generateBusinessLogicContext() {
    console.log('📝 Generating business logic context documentation...');
    
    const content = this.buildBusinessLogicContextContent();
    const outputPath = path.join(CONFIG.docsDir, CONFIG.outputFiles.businessLogic);
    
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  /**
   * Generate component context documentation
   */
  async generateComponentContext() {
    console.log('📝 Generating component context documentation...');
    
    const content = this.buildComponentContextContent();
    const outputPath = path.join(CONFIG.docsDir, CONFIG.outputFiles.components);
    
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  /**
   * Build API context content
   */
  buildAPIContextContent() {
    let content = `# API Context for BoardOS Construction Scheduler\n\n`;
    content += `*Auto-generated on ${new Date().toISOString()}*\n\n`;
    
    // Services
    content += `## Services\n\n`;
    Object.entries(this.apiData.services).forEach(([name, service]) => {
      content += `### ${name}\n`;
      content += `**File**: \`${service.file}\`\n`;
      if (service.description) {
        content += `**Description**: ${service.description}\n`;
      }
      content += `\n`;
      
      if (service.classes.length > 0) {
        content += `#### Methods:\n`;
        service.classes.forEach(cls => {
          cls.methods.forEach(method => {
            const params = method.params.map(p => `${p}: ${method.returnType}`).join(', ');
            content += `- \`${method.name}(${params})\`${method.isStatic ? ' (static)' : ''}\n`;
          });
        });
        content += `\n`;
      }
      
      if (service.functions.length > 0) {
        content += `#### Functions:\n`;
        service.functions.forEach(func => {
          const params = func.params.map(p => `${p.name}: ${p.type}`).join(', ');
          content += `- \`${func.name}(${params}): ${func.returnType}\`\n`;
        });
        content += `\n`;
      }
    });
    
    // Hooks
    content += `## Hooks\n\n`;
    Object.entries(this.apiData.hooks).forEach(([name, hook]) => {
      content += `### ${name}\n`;
      content += `**File**: \`${hook.file}\`\n`;
      if (hook.description) {
        content += `**Description**: ${hook.description}\n`;
      }
      content += `\n`;
    });
    
    // Utilities
    content += `## Utilities\n\n`;
    Object.entries(this.apiData.utilities).forEach(([name, util]) => {
      content += `### ${name}\n`;
      content += `**File**: \`${util.file}\`\n`;
      if (util.description) {
        content += `**Description**: ${util.description}\n`;
      }
      
      if (util.functions.length > 0) {
        content += `\n#### Functions:\n`;
        util.functions.forEach(func => {
          const params = func.params.map(p => `${p.name}: ${p.type}`).join(', ');
          content += `- \`${func.name}(${params}): ${func.returnType}\`\n`;
        });
      }
      content += `\n`;
    });
    
    return content;
  }

  /**
   * Build business logic context content
   */
  buildBusinessLogicContextContent() {
    let content = `# Business Logic Context for BoardOS Construction Scheduler\n\n`;
    content += `*Auto-generated on ${new Date().toISOString()}*\n\n`;
    
    // Rules
    content += `## Business Rules\n\n`;
    Object.entries(this.businessLogicData.rules).forEach(([name, rule]) => {
      content += `### ${name}\n`;
      content += `**File**: \`${rule.file}\`\n`;
      if (rule.description) {
        content += `**Description**: ${rule.description}\n`;
      }
      content += `\n`;
      
      if (rule.functions.length > 0) {
        content += `#### Functions:\n`;
        rule.functions.forEach(func => {
          content += `- \`${func.name}\` - ${func.jsDoc || 'No description'}\n`;
        });
        content += `\n`;
      }
    });
    
    // Workflows
    content += `## Workflows\n\n`;
    Object.entries(this.businessLogicData.workflows).forEach(([name, workflow]) => {
      content += `### ${name}\n`;
      content += `**File**: \`${workflow.file}\`\n`;
      if (workflow.description) {
        content += `**Description**: ${workflow.description}\n`;
      }
      content += `\n`;
    });
    
    return content;
  }

  /**
   * Build component context content
   */
  buildComponentContextContent() {
    let content = `# Components Context for BoardOS Construction Scheduler\n\n`;
    content += `*Auto-generated on ${new Date().toISOString()}*\n\n`;
    
    // Core Components
    content += `## Core Components\n\n`;
    Object.entries(this.componentData.coreComponents || {}).forEach(([name, component]) => {
      content += `### ${name}\n`;
      content += `**File**: \`${component.file}\`\n`;
      if (component.description) {
        content += `**Description**: ${component.description}\n`;
      }
      
      if (component.props && component.props.length > 0) {
        content += `\n#### Props:\n`;
        component.props.forEach(prop => {
          content += `- \`${prop.name}${prop.optional ? '?' : ''}: ${prop.type}\`\n`;
        });
      }
      content += `\n`;
    });
    
    // Modal Components
    content += `## Modal Components\n\n`;
    Object.entries(this.componentData.modalComponents || {}).forEach(([name, component]) => {
      content += `### ${name}\n`;
      content += `**File**: \`${component.file}\`\n`;
      if (component.description) {
        content += `**Description**: ${component.description}\n`;
      }
      content += `\n`;
    });
    
    return content;
  }
}

// Run the generator if called directly
if (process.argv[1] && process.argv[1].endsWith('generate-ai-context.js')) {
  const generator = new AIContextGenerator();
  generator.generate();
}

export default AIContextGenerator;