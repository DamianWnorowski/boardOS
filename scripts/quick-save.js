#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function exec(command, silent = false) {
  try {
    const result = execSync(command, { encoding: 'utf8' });
    if (!silent) console.log(result);
    return result;
  } catch (error) {
    if (!silent) console.error(`${colors.red}Error executing: ${command}${colors.reset}`);
    return null;
  }
}

function analyzeChanges() {
  const status = exec('git status --porcelain', true);
  if (!status || status.trim() === '') {
    return null;
  }

  const files = status.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const parts = line.trim().split(/\s+/);
      return parts[parts.length - 1];
    });

  // Smart commit type detection
  let type = 'chore';
  let message = 'update code';

  // Analyze file patterns
  const hasTests = files.some(f => f.includes('test') || f.includes('spec'));
  const hasDocs = files.some(f => f.includes('.md') || f.includes('docs/'));
  const hasComponents = files.some(f => f.includes('components/'));
  const hasFeature = files.some(f => f.includes('features/') || f.includes('pages/'));
  const hasConfig = files.some(f => f.includes('config') || f.includes('.json') || f.includes('.js') && f.includes('scripts/'));
  const hasStyles = files.some(f => f.includes('.css') || f.includes('styles/'));
  const hasFix = files.some(f => f.includes('fix')) || status.toLowerCase().includes('fix');

  // Determine type and message based on changes
  if (hasFix) {
    type = 'fix';
    message = 'resolve issues in ' + getAffectedAreas(files);
  } else if (hasTests) {
    type = 'test';
    message = 'update test coverage';
  } else if (hasDocs) {
    type = 'docs';
    message = 'update documentation';
  } else if (hasFeature || hasComponents) {
    type = 'feat';
    message = 'add ' + getAffectedAreas(files);
  } else if (hasStyles) {
    type = 'style';
    message = 'update styling';
  } else if (hasConfig) {
    type = 'chore';
    message = 'update configuration';
  } else if (files.length === 1) {
    // Single file change
    const file = files[0];
    const fileName = path.basename(file, path.extname(file));
    message = `update ${fileName}`;
    
    if (file.includes('Context')) type = 'refactor';
    else if (file.includes('Service')) type = 'feat';
    else if (file.includes('util')) type = 'chore';
  } else {
    // Multiple files
    message = `update ${files.length} files`;
  }

  return { type, message, files };
}

function getAffectedAreas(files) {
  const areas = new Set();
  
  files.forEach(file => {
    if (file.includes('components/')) {
      const component = file.split('components/')[1]?.split('/')[0];
      if (component) areas.add(component);
    } else if (file.includes('context/')) {
      areas.add('context');
    } else if (file.includes('services/')) {
      areas.add('services');
    } else if (file.includes('utils/')) {
      areas.add('utilities');
    } else if (file.includes('docs/')) {
      areas.add('documentation');
    } else if (file.includes('scripts/')) {
      areas.add('scripts');
    } else if (file.includes('playwright/')) {
      areas.add('tests');
    }
  });

  const areaList = Array.from(areas);
  if (areaList.length === 0) return 'application';
  if (areaList.length === 1) return areaList[0];
  if (areaList.length === 2) return `${areaList[0]} and ${areaList[1]}`;
  if (areaList.length > 5) return 'multiple areas';
  return `${areaList.slice(0, -1).join(', ')} and ${areaList.slice(-1)}`;
}

async function main() {
  console.log(`${colors.cyan}🚀 Quick Save - Auto Commit Tool${colors.reset}\n`);

  // Check for changes
  const changes = analyzeChanges();
  
  if (!changes) {
    console.log(`${colors.yellow}✨ No changes to commit - workspace is clean!${colors.reset}`);
    process.exit(0);
  }

  // Show what will be committed
  console.log(`${colors.bright}📝 Changes detected:${colors.reset}`);
  changes.files.forEach(file => {
    console.log(`  ${colors.blue}•${colors.reset} ${file}`);
  });

  // Construct commit message
  const commitMessage = `${changes.type}: ${changes.message}`;
  console.log(`\n${colors.bright}💬 Commit message:${colors.reset} ${colors.green}${commitMessage}${colors.reset}`);

  // Stage all changes
  console.log(`\n${colors.blue}📦 Staging all changes...${colors.reset}`);
  exec('git add -A', true);

  // Commit with the message
  console.log(`${colors.blue}💾 Committing...${colors.reset}`);
  const commitResult = exec(`git commit -m "${commitMessage}"`, true);

  if (commitResult) {
    // Extract commit hash
    const commitHash = commitResult.match(/\[[\w\s-]+\s+([a-f0-9]+)\]/)?.[1];
    console.log(`${colors.green}✅ Successfully committed!${colors.reset}`);
    
    if (commitHash) {
      console.log(`${colors.bright}Commit:${colors.reset} ${commitHash?.substring(0, 7)} - ${commitMessage}`);
    }

    // Show what the hooks did
    console.log(`\n${colors.cyan}🔄 Automated updates:${colors.reset}`);
    console.log(`  ${colors.green}✓${colors.reset} CLAUDE.md updated with changes`);
    console.log(`  ${colors.green}✓${colors.reset} Documentation regenerated`);
    console.log(`  ${colors.green}✓${colors.reset} AI context files updated`);
    console.log(`  ${colors.green}✓${colors.reset} Project statistics updated`);
  } else {
    console.log(`${colors.red}❌ Commit failed - check git status for issues${colors.reset}`);
    process.exit(1);
  }

  // Optional: Show current branch and suggest push
  const branch = exec('git branch --show-current', true)?.trim();
  if (branch && branch !== 'main' && branch !== 'master') {
    console.log(`\n${colors.yellow}📌 Current branch:${colors.reset} ${branch}`);
    console.log(`${colors.yellow}💡 Run 'git push' to sync with remote${colors.reset}`);
  }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error(`${colors.red}❌ Unexpected error:${colors.reset}`, error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}❌ Unhandled promise rejection:${colors.reset}`, error);
  process.exit(1);
});

// Run the script
main().catch(error => {
  console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
  process.exit(1);
});