#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function removeConsoleLogs(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Remove console.log statements (including multiline)
    const updatedContent = content
      .replace(/console\.log\([^)]*\);?\s*/g, '')
      .replace(/console\.log\([^)]*\n[^)]*\);?\s*/g, '')
      .replace(/console\.log\([^)]*\n[^)]*\n[^)]*\);?\s*/g, '');
    
    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

async function processDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let totalModified = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip test directories and node_modules
      if (entry.name === '__tests__' || entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      totalModified += await processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const modified = await removeConsoleLogs(fullPath);
      if (modified) {
        console.log(`✓ Cleaned: ${path.relative(process.cwd(), fullPath)}`);
        totalModified++;
      }
    }
  }
  
  return totalModified;
}

async function main() {
  console.log('🧹 Removing console.log statements from TypeScript files...\n');
  
  const srcPath = path.join(__dirname, 'src');
  const totalModified = await processDirectory(srcPath);
  
  console.log(`\n✅ Complete! Modified ${totalModified} files.`);
  console.log('💡 Tip: Run "npm run lint" to check for any remaining issues.');
}

main().catch(console.error);