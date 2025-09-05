#!/usr/bin/env node

/**
 * Simple AI context updater
 * Updates .aimd files with current timestamp and basic file information
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  srcDir: path.resolve(__dirname, '../src'),
  docsDir: path.resolve(__dirname, '../docs/ai-context'),
  outputFiles: {
    api: 'api.aimd',
    businessLogic: 'business-logic.aimd', 
    components: 'components.aimd'
  }
};

class SimpleAIContextUpdater {
  constructor() {
    this.stats = {
      totalFiles: 0,
      serviceFiles: 0,
      componentFiles: 0,
      utilityFiles: 0,
      hookFiles: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  async update() {
    console.log('🔄 Updating AI Context Documentation...');
    
    try {
      // Analyze source files
      await this.analyzeSrcFiles();
      
      // Update each context file
      await this.updateAPIContext();
      await this.updateBusinessLogicContext();
      await this.updateComponentContext();
      
      console.log('✅ AI Context Documentation Updated Successfully!');
      console.log(`📊 Stats: ${this.stats.totalFiles} total files analyzed`);
    } catch (error) {
      console.error('❌ Error updating AI context documentation:', error);
      process.exit(1);
    }
  }

  async analyzeSrcFiles() {
    const files = this.getAllTSFiles(CONFIG.srcDir);
    this.stats.totalFiles = files.length;
    
    files.forEach(filePath => {
      const relativePath = path.relative(CONFIG.srcDir, filePath);
      
      if (relativePath.includes('services' + path.sep)) this.stats.serviceFiles++;
      else if (relativePath.includes('components' + path.sep)) this.stats.componentFiles++;
      else if (relativePath.includes('utils' + path.sep)) this.stats.utilityFiles++;
      else if (relativePath.includes('hooks' + path.sep)) this.stats.hookFiles++;
    });
  }

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

  shouldSkipPath(dirPath) {
    const excludePaths = ['__tests__', 'test', 'node_modules', '.git'];
    return excludePaths.some(exclude => dirPath.includes(exclude));
  }

  async updateAPIContext() {
    const filePath = path.join(CONFIG.docsDir, CONFIG.outputFiles.api);
    
    // Read current content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add metadata header
    const metadataHeader = `<!-- AUTO-GENERATED METADATA -->
<!-- Last Updated: ${this.stats.lastUpdated} -->
<!-- Total Files: ${this.stats.totalFiles} -->
<!-- Services: ${this.stats.serviceFiles} -->
<!-- Utilities: ${this.stats.utilityFiles} -->
<!-- Hooks: ${this.stats.hookFiles} -->
<!-- END METADATA -->

`;
    
    // Remove existing metadata if present
    content = content.replace(/<!-- AUTO-GENERATED METADATA -->[\s\S]*?<!-- END METADATA -->\s*\n/g, '');
    
    // Add new metadata at the top
    content = metadataHeader + content;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated API context with metadata');
  }

  async updateBusinessLogicContext() {
    const filePath = path.join(CONFIG.docsDir, CONFIG.outputFiles.businessLogic);
    
    // Read current content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add metadata header
    const metadataHeader = `<!-- AUTO-GENERATED METADATA -->
<!-- Last Updated: ${this.stats.lastUpdated} -->
<!-- Business Logic Files: ${this.stats.utilityFiles} -->
<!-- END METADATA -->

`;
    
    // Remove existing metadata if present
    content = content.replace(/<!-- AUTO-GENERATED METADATA -->[\s\S]*?<!-- END METADATA -->\s*\n/g, '');
    
    // Add new metadata at the top
    content = metadataHeader + content;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated Business Logic context with metadata');
  }

  async updateComponentContext() {
    const filePath = path.join(CONFIG.docsDir, CONFIG.outputFiles.components);
    
    // Read current content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add metadata header
    const metadataHeader = `<!-- AUTO-GENERATED METADATA -->
<!-- Last Updated: ${this.stats.lastUpdated} -->
<!-- Component Files: ${this.stats.componentFiles} -->
<!-- END METADATA -->

`;
    
    // Remove existing metadata if present
    content = content.replace(/<!-- AUTO-GENERATED METADATA -->[\s\S]*?<!-- END METADATA -->\s*\n/g, '');
    
    // Add new metadata at the top
    content = metadataHeader + content;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated Components context with metadata');
  }
}

// Run the updater if called directly
if (process.argv[1] && process.argv[1].endsWith('update-ai-context.js')) {
  const updater = new SimpleAIContextUpdater();
  updater.update().catch(console.error);
}

export default SimpleAIContextUpdater;