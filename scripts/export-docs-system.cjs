#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Export the documentation system to another project
 * Usage: node export-docs-system.js /path/to/target/project
 */

class DocsSystemExporter {
  constructor(targetPath) {
    this.targetPath = path.resolve(targetPath);
    this.sourcePath = path.join(__dirname, '..');
    
    this.filesToCopy = [
      // Scripts
      'scripts/generate-docs.cjs',
      'scripts/update-claude-memory.cjs',
      
      // Config files
      'typedoc.json',
      
      // Git hooks
      '.husky/pre-commit',
      '.husky/post-commit',
      
      // Documentation templates
      'docs/index.md',
      'docs/00-getting-started/README.md',
      'docs/02-api/README.md',
      'docs/README.md'
    ];
    
    this.packageJsonUpdates = {
      scripts: {
        "docs:generate": "node scripts/generate-docs.cjs",
        "docs:watch": "node scripts/generate-docs.cjs --watch",
        "docs:api": "typedoc",
        "docs:build": "npm run docs:generate && npm run docs:api",
        "dev:docs": "concurrently \"npm run dev\" \"npm run docs:watch\""
      },
      devDependencies: {
        "typedoc": "^0.28.11",
        "concurrently": "^9.2.1",
        "nodemon": "^3.1.10",
        "chokidar": "^4.0.3"
      }
    };
  }

  async export() {
    console.log(`🚀 Setting up documentation system in: ${this.targetPath}`);
    
    try {
      // Verify target directory exists
      if (!fs.existsSync(this.targetPath)) {
        throw new Error(`Target directory does not exist: ${this.targetPath}`);
      }
      
      // Create necessary directories
      await this.createDirectories();
      
      // Copy files
      await this.copyFiles();
      
      // Update package.json
      await this.updatePackageJson();
      
      // Create customized configs
      await this.createCustomizedConfigs();
      
      // Generate setup instructions
      await this.generateSetupInstructions();
      
      console.log('✅ Documentation system export complete!');
      console.log(`📖 See ${this.targetPath}/DOCS_SETUP.md for next steps`);
      
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      process.exit(1);
    }
  }

  async createDirectories() {
    const dirs = [
      'docs',
      'docs/00-getting-started',
      'docs/01-architecture', 
      'docs/02-api',
      'docs/03-components',
      'docs/04-features',
      'docs/05-development',
      'docs/06-deployment',
      'docs/07-business-logic',
      'docs/ai-context',
      'scripts',
      '.husky'
    ];
    
    for (const dir of dirs) {
      const fullPath = path.join(this.targetPath, dir);
      await fs.promises.mkdir(fullPath, { recursive: true });
    }
    
    console.log('📁 Created directory structure');
  }

  async copyFiles() {
    for (const file of this.filesToCopy) {
      const sourcePath = path.join(this.sourcePath, file);
      const targetPath = path.join(this.targetPath, file);
      
      if (fs.existsSync(sourcePath)) {
        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.promises.copyFile(sourcePath, targetPath);
        
        // Make scripts executable
        if (file.includes('.husky/') || file.includes('scripts/')) {
          await fs.promises.chmod(targetPath, '755');
        }
        
        console.log(`📄 Copied: ${file}`);
      }
    }
  }

  async updatePackageJson() {
    const packagePath = path.join(this.targetPath, 'package.json');
    
    if (!fs.existsSync(packagePath)) {
      console.log('⚠️  No package.json found, creating basic one');
      
      const basicPackage = {
        name: path.basename(this.targetPath),
        version: "1.0.0",
        type: "module",
        scripts: this.packageJsonUpdates.scripts,
        devDependencies: this.packageJsonUpdates.devDependencies
      };
      
      await fs.promises.writeFile(
        packagePath, 
        JSON.stringify(basicPackage, null, 2)
      );
      
      return;
    }
    
    const packageJson = JSON.parse(await fs.promises.readFile(packagePath, 'utf-8'));
    
    // Merge scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      ...this.packageJsonUpdates.scripts
    };
    
    // Merge devDependencies
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      ...this.packageJsonUpdates.devDependencies
    };
    
    await fs.promises.writeFile(
      packagePath, 
      JSON.stringify(packageJson, null, 2)
    );
    
    console.log('📦 Updated package.json');
  }

  async createCustomizedConfigs() {
    // Customize typedoc.json for target project
    const projectName = path.basename(this.targetPath);
    const typedocConfig = {
      "entryPoints": ["./src"],
      "entryPointStrategy": "expand",
      "out": "./docs/02-api/generated",
      "theme": "default",
      "name": `${projectName} API Documentation`,
      "includeVersion": true,
      "excludePrivate": false,
      "excludeProtected": false,
      "excludeExternals": true,
      "skipErrorChecking": true,
      "readme": "./docs/02-api/README.md",
      "categorizeByGroup": true,
      "defaultCategory": "Other",
      "categoryOrder": [
        "Context",
        "Hooks", 
        "Services",
        "Components",
        "Types",
        "Utils",
        "*"
      ],
      "sort": ["source-order"],
      "searchInComments": true,
      "cleanOutputDir": true,
      "titleLink": "/",
      "navigationLinks": {
        "Documentation": "/docs/",
        "GitHub": `https://github.com/your-org/${projectName}`
      }
    };
    
    await fs.promises.writeFile(
      path.join(this.targetPath, 'typedoc.json'),
      JSON.stringify(typedocConfig, null, 2)
    );
    
    console.log('⚙️  Created customized typedoc.json');
  }

  async generateSetupInstructions() {
    const projectName = path.basename(this.targetPath);
    const instructions = `# Documentation System Setup

## 🎉 Documentation System Installed!

The BoardOS documentation system has been successfully exported to your project.

## 📋 Next Steps

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Generate Initial Documentation
\`\`\`bash
npm run docs:generate
\`\`\`

### 3. Start Development with Live Docs
\`\`\`bash
npm run dev:docs
\`\`\`

### 4. View Documentation
- **Main Hub**: \`docs/index.md\`
- **API Docs**: \`docs/02-api/generated/index.html\`
- **Getting Started**: \`docs/00-getting-started/README.md\`

## 🔧 Customization Needed

### Update Project Information
Edit these files with your project details:
- \`docs/index.md\` - Main documentation hub
- \`docs/00-getting-started/README.md\` - Getting started guide
- \`typedoc.json\` - API documentation settings

### Add Your Content
1. **Architecture**: Document your system in \`docs/01-architecture/\`
2. **Features**: Describe key features in \`docs/04-features/\`
3. **Development**: Add dev guidelines in \`docs/05-development/\`
4. **Deployment**: Document deployment in \`docs/06-deployment/\`

## 🤖 AI Integration

The system creates AI-friendly context files automatically:
- \`docs/ai-context/components.aimd\`
- \`docs/ai-context/api.aimd\`
- \`docs/ai-context/business-logic.aimd\`

## 📊 Available Commands

\`\`\`bash
npm run docs:generate     # Generate all documentation
npm run docs:watch        # Watch files and auto-update
npm run docs:api         # Generate TypeScript API docs
npm run docs:build       # Complete build
npm run dev:docs         # Dev server + doc watching
\`\`\`

## 🔄 Automatic Updates

Documentation updates automatically when you:
- Edit code (real-time via file watcher)
- Commit changes (via git hooks)
- Add JSDoc comments (included in API docs)

## 📝 Writing Better Docs

Add JSDoc comments to your functions:
\`\`\`typescript
/**
 * Description of what this function does
 * @param param1 - Description of parameter
 * @returns Description of return value
 */
export function myFunction(param1: string): Promise<void> {
  // implementation
}
\`\`\`

## 🚀 Ready to Go!

Your documentation system is now set up and ready to use!

Run \`npm run dev:docs\` to start development with live documentation.
`;

    await fs.promises.writeFile(
      path.join(this.targetPath, 'DOCS_SETUP.md'),
      instructions
    );
    
    console.log('📖 Generated setup instructions');
  }
}

// CLI execution
if (require.main === module) {
  const targetPath = process.argv[2];
  
  if (!targetPath) {
    console.error('Usage: node export-docs-system.js /path/to/target/project');
    process.exit(1);
  }
  
  const exporter = new DocsSystemExporter(targetPath);
  exporter.export().catch(console.error);
}

module.exports = DocsSystemExporter;