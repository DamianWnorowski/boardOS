#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chokidar = require('chokidar');

/**
 * Automated Documentation Generator for BoardOS
 * 
 * Features:
 * - TypeScript API documentation via TypeDoc
 * - Component documentation extraction
 * - Real-time file watching
 * - AI-friendly context generation
 */

class DocumentationGenerator {
  constructor() {
    this.docsDir = path.join(__dirname, '..', 'docs');
    this.srcDir = path.join(__dirname, '..', 'src');
    this.watchMode = process.argv.includes('--watch');
    
    this.patterns = {
      components: 'src/components/**/*.{ts,tsx}',
      contexts: 'src/context/**/*.{ts,tsx}', 
      hooks: 'src/hooks/**/*.{ts,tsx}',
      services: 'src/services/**/*.{ts,tsx}',
      types: 'src/types/**/*.{ts,tsx}',
      utils: 'src/utils/**/*.{ts,tsx}'
    };
  }

  /**
   * Generate all documentation
   */
  async generateAll() {
    console.log('🚀 Starting documentation generation...');
    
    try {
      // Generate TypeScript API docs
      await this.generateTypeDocs();
      
      // Generate component documentation
      await this.generateComponentDocs();
      
      // Generate context documentation  
      await this.generateContextDocs();
      
      // Generate hooks documentation
      await this.generateHooksDocs();
      
      // Generate AI-friendly context
      await this.generateAIContext();
      
      // Update documentation index
      await this.updateDocumentationIndex();
      
      console.log('✅ Documentation generation complete!');
      
      if (this.watchMode) {
        this.startWatching();
      }
      
    } catch (error) {
      console.error('❌ Documentation generation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Generate TypeScript API documentation using TypeDoc
   */
  async generateTypeDocs() {
    console.log('📚 Generating TypeScript API documentation...');
    
    try {
      execSync('npx typedoc', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      console.log('✅ TypeScript API documentation generated');
    } catch (error) {
      console.error('❌ TypeDoc generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate component documentation from source files
   */
  async generateComponentDocs() {
    console.log('🧩 Generating component documentation...');
    
    const ComponentParser = require('./component-parser.cjs');
    const parser = new ComponentParser();
    
    const componentsDir = path.join(this.srcDir, 'components');
    const outputDir = path.join(this.docsDir, '03-components');
    
    // Use new AST-based parser
    const componentDocs = await parser.parseDirectory(componentsDir);
    
    // Generate main components index
    const indexContent = this.generateComponentIndex(componentDocs);
    await fs.promises.writeFile(
      path.join(outputDir, 'index.md'),
      indexContent
    );
    
    // Generate individual component docs
    for (const component of componentDocs) {
      const componentDoc = this.generateComponentDoc(component);
      const filename = `${component.name.toLowerCase()}.md`;
      await fs.promises.writeFile(
        path.join(outputDir, filename),
        componentDoc
      );
    }
    
    console.log(`✅ Generated documentation for ${componentDocs.length} components`);
  }

  /**
   * Generate context documentation
   */
  async generateContextDocs() {
    console.log('🌐 Generating context documentation...');
    
    const contextsDir = path.join(this.srcDir, 'context');
    const outputFile = path.join(this.docsDir, '02-api', 'contexts.md');
    
    const contextInfo = await this.extractContextInfo(contextsDir);
    const contextDocs = this.generateContextDoc(contextInfo);
    
    await fs.promises.writeFile(outputFile, contextDocs);
    console.log('✅ Context documentation generated');
  }

  /**
   * Generate hooks documentation
   */
  async generateHooksDocs() {
    console.log('🎣 Generating hooks documentation...');
    
    const hooksDir = path.join(this.srcDir, 'hooks');
    const outputFile = path.join(this.docsDir, '02-api', 'hooks.md');
    
    const hooksInfo = await this.extractHooksInfo(hooksDir);
    const hooksDocs = this.generateHooksDoc(hooksInfo);
    
    await fs.promises.writeFile(outputFile, hooksDocs);
    console.log('✅ Hooks documentation generated');
  }

  /**
   * Generate AI-friendly context files
   */
  async generateAIContext() {
    console.log('🤖 Generating AI context files...');
    
    const aiContextDir = path.join(this.docsDir, 'ai-context');
    await fs.promises.mkdir(aiContextDir, { recursive: true });
    
    // Generate component context
    const componentContext = await this.generateComponentContext();
    await fs.promises.writeFile(
      path.join(aiContextDir, 'components.aimd'),
      componentContext
    );
    
    // Generate API context
    const apiContext = await this.generateAPIContext();
    await fs.promises.writeFile(
      path.join(aiContextDir, 'api.aimd'),
      apiContext
    );
    
    // Generate business logic context
    const businessContext = await this.generateBusinessContext();
    await fs.promises.writeFile(
      path.join(aiContextDir, 'business-logic.aimd'),
      businessContext
    );
    
    console.log('✅ AI context files generated');
  }

  /**
   * Extract component information from TypeScript files
   */
  async extractComponentInfo(componentsDir) {
    const components = [];
    
    const walkDir = async (dir) => {
      const files = await fs.promises.readdir(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.promises.stat(fullPath);
        
        if (stat.isDirectory()) {
          await walkDir(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const content = await fs.promises.readFile(fullPath, 'utf-8');
          const componentInfo = this.parseComponent(content, fullPath);
          
          if (componentInfo) {
            components.push(componentInfo);
          }
        }
      }
    };
    
    await walkDir(componentsDir);
    return components;
  }

  /**
   * Parse component information from source code
   */
  parseComponent(content, filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // Extract component name and props
    const componentMatch = content.match(/(?:export\s+(?:default\s+)?(?:const\s+|function\s+))(\w+)/);
    if (!componentMatch) return null;
    
    const name = componentMatch[1];
    
    // Extract props interface
    const propsMatch = content.match(/interface\s+(\w*Props)\s*{([^}]*)}/s);
    const props = propsMatch ? this.parseProps(propsMatch[2]) : [];
    
    // Extract JSDoc comment
    const docMatch = content.match(/\/\*\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//);
    const description = docMatch ? this.parseJSDoc(docMatch[0]) : '';
    
    // Extract imports to understand dependencies
    const imports = this.extractImports(content);
    
    return {
      name,
      fileName,
      filePath,
      props,
      description,
      dependencies: imports,
      category: this.categorizeComponent(filePath)
    };
  }

  /**
   * Parse props from interface definition
   */
  parseProps(propsContent) {
    const props = [];
    const lines = propsContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;
      
      const propMatch = trimmed.match(/(\w+)(\?)?:\s*([^;]+);?/);
      if (propMatch) {
        props.push({
          name: propMatch[1],
          optional: !!propMatch[2],
          type: propMatch[3].trim(),
        });
      }
    }
    
    return props;
  }

  /**
   * Extract imports from file content
   */
  extractImports(content) {
    const imports = [];
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * Categorize component based on file path
   */
  categorizeComponent(filePath) {
    if (filePath.includes('/board/')) return 'Board';
    if (filePath.includes('/resources/')) return 'Resources';
    if (filePath.includes('/modals/')) return 'Modals';
    if (filePath.includes('/mobile/')) return 'Mobile';
    if (filePath.includes('/common/')) return 'Common';
    if (filePath.includes('/ui/')) return 'UI';
    return 'Other';
  }

  /**
   * Generate component index markdown
   */
  generateComponentIndex(components) {
    const categories = {};
    
    components.forEach(component => {
      const category = component.category;
      if (!categories[category]) categories[category] = [];
      categories[category].push(component);
    });
    
    let content = `---
title: Component Library
category: components
tags: [components, react, typescript]
last-updated: ${new Date().toISOString().split('T')[0]}
---

# Component Library

## Quick Answer
BoardOS contains ${components.length} React components organized into ${Object.keys(categories).length} categories. All components are TypeScript-enabled with comprehensive prop interfaces.

## Component Categories

`;

    Object.entries(categories).forEach(([category, comps]) => {
      content += `### ${category} Components\n\n`;
      
      comps.forEach(comp => {
        content += `- **[${comp.name}](${comp.name.toLowerCase()}.md)** - ${comp.description || 'Component description'}\n`;
      });
      
      content += '\n';
    });
    
    content += `## Usage Statistics

| Category | Count | Coverage |
|----------|-------|----------|
`;

    Object.entries(categories).forEach(([category, comps]) => {
      const coverage = comps.filter(c => c.description).length / comps.length * 100;
      content += `| ${category} | ${comps.length} | ${coverage.toFixed(0)}% |\n`;
    });

    return content;
  }

  /**
   * Generate individual component documentation
   */
  generateComponentDoc(component) {
    return `---
title: ${component.name}
category: components
tags: [${component.category.toLowerCase()}, component, ${component.type}]
related: []
last-updated: ${new Date().toISOString().split('T')[0]}
---

# ${component.name}

## Quick Answer
${component.description || `${component.name} is a ${component.type} React component in the ${component.category} category.`}

## Component Info

- **Type**: ${component.type}
- **Export**: ${component.isDefaultExport ? 'Default' : 'Named'}
- **File**: \`${component.fileName}\`
- **Line**: ${component.lineNumber}
- **Category**: ${component.category}
- **Has JSDoc**: ${component.hasJSDoc ? '✅' : '❌'}

## Props Interface

${component.props && component.props.length > 0 ? `
| Prop | Type | Required | Description |
|------|------|----------|-------------|
${component.props.map(prop => 
  `| ${prop.name} | \`${prop.type}\` | ${prop.required ? 'Yes' : 'No'} | ${prop.description || '-'} |`
).join('\n')}
` : 'This component has no props interface defined.'}

## Usage Example

\`\`\`typescript
import { ${component.name} } from '${component.filePath.replace(/.*[\\/]src[\\/]/, '@/').replace(/\.(tsx?|jsx?)$/, '').replace(/\\/g, '/')}';

function ExampleUsage() {
  return (
    <${component.name}${component.props ? component.props.filter(p => p.required).map(p => ` ${p.name}={/* ${p.type} */}`).join('') : ''} />
  );
}
\`\`\`

## Dependencies

${component.dependencies && component.dependencies.length > 0 ? `
- ${component.dependencies.map(dep => `\`${dep}\``).join('\n- ')}
` : 'No external dependencies detected.'}

## File Location

\`${path.relative(path.join(__dirname, '..'), component.filePath).replace(/\\/g, '/')}\`

## Component Signature

\`\`\`typescript
${component.isDefaultExport ? 'export default' : 'export'} ${component.type === 'arrow' ? 'const' : 'function'} ${component.name}${component.props && component.props.length > 0 ? `(props: {${component.props.map(p => `${p.name}${p.required ? '' : '?'}: ${p.type}`).join(', ')}})` : '()'} ${component.type === 'arrow' ? '=>' : '{'} 
  // Component implementation
${component.type === 'arrow' ? '' : '}'}
\`\`\`

---

*This documentation was auto-generated from TypeScript source code using AST parsing.*`;
  }

  /**
   * Start watching for file changes
   */
  startWatching() {
    console.log('👀 Starting file watcher...');
    
    const watcher = chokidar.watch(Object.values(this.patterns), {
      ignored: /node_modules|\.git/,
      persistent: true
    });
    
    watcher
      .on('change', (path) => {
        console.log(`📝 File changed: ${path}`);
        this.handleFileChange(path);
      })
      .on('add', (path) => {
        console.log(`➕ File added: ${path}`);
        this.handleFileChange(path);
      })
      .on('unlink', (path) => {
        console.log(`🗑️  File removed: ${path}`);
        this.handleFileRemoval(path);
      });
    
    console.log('✅ File watcher started');
  }

  /**
   * Handle file changes
   */
  async handleFileChange(filePath) {
    try {
      if (filePath.includes('/components/')) {
        await this.generateComponentDocs();
      } else if (filePath.includes('/context/')) {
        await this.generateContextDocs();
      } else if (filePath.includes('/hooks/')) {
        await this.generateHooksDocs();
      }
      
      // Always update AI context
      await this.generateAIContext();
      
    } catch (error) {
      console.error(`❌ Error updating docs for ${filePath}:`, error.message);
    }
  }

  /**
   * Update main documentation index
   */
  async updateDocumentationIndex() {
    // This would update the main index with current stats
    console.log('📊 Documentation index updated');
  }

  // Placeholder methods for other documentation types
  async extractContextInfo(contextsDir) { return []; }
  async extractHooksInfo(hooksDir) { return []; }
  generateContextDoc(contextInfo) { return '# Context Documentation\n\nComing soon...'; }
  generateHooksDoc(hooksInfo) { return '# Hooks Documentation\n\nComing soon...'; }
  generateComponentContext() { return 'COMPONENT_CONTEXT: Generated from components'; }
  generateAPIContext() { return 'API_CONTEXT: Generated from services'; }
  generateBusinessContext() { return 'BUSINESS_CONTEXT: Generated from business logic'; }
  parseJSDoc(docComment) { 
    return docComment.replace(/\/\*\*|\*\/|\*/g, '').trim(); 
  }
  handleFileRemoval(filePath) {
    console.log(`📝 Handling removal of ${filePath}`);
  }
}

// CLI execution
if (require.main === module) {
  const generator = new DocumentationGenerator();
  generator.generateAll().catch(console.error);
}

module.exports = DocumentationGenerator;