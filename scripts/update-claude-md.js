#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the staged files
const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  .split('\n')
  .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'));

if (stagedFiles.length === 0) {
  console.log('No TypeScript files changed, skipping CLAUDE.md update');
  process.exit(0);
}

// Get commit message (will be available after commit-msg hook)
const commitMessage = process.argv[2] || 'Code update';

// Get current date
const date = new Date().toISOString().split('T')[0];

// Read current CLAUDE.md
const claudePath = path.join(__dirname, '..', 'CLAUDE.md');
let claudeContent = fs.readFileSync(claudePath, 'utf8');

// Find the "Recent Fixes" section or create it
const recentFixesHeader = '## Recent Fixes';
if (!claudeContent.includes(recentFixesHeader)) {
  // Add after the Key Features section
  const keyFeaturesIndex = claudeContent.indexOf('## Key Features');
  if (keyFeaturesIndex !== -1) {
    const insertIndex = claudeContent.indexOf('\n\n', keyFeaturesIndex) + 2;
    claudeContent = 
      claudeContent.slice(0, insertIndex) +
      `${recentFixesHeader} (${date})\n\n` +
      claudeContent.slice(insertIndex);
  }
}

// Create update entry
const updateEntry = `\n### ${date} - ${commitMessage}\n`;
const filesList = stagedFiles.map(file => `- Modified: \`${file}\``).join('\n');

// Find where to insert the update
const fixesIndex = claudeContent.indexOf(recentFixesHeader);
if (fixesIndex !== -1) {
  const nextSectionIndex = claudeContent.indexOf('\n##', fixesIndex + 1);
  const insertPoint = claudeContent.indexOf('\n', fixesIndex) + 1;
  
  // Check if this date already exists
  if (!claudeContent.includes(`### ${date} -`)) {
    claudeContent = 
      claudeContent.slice(0, insertPoint) +
      updateEntry + filesList + '\n' +
      claudeContent.slice(insertPoint);
  }
}

// Write updated CLAUDE.md
fs.writeFileSync(claudePath, claudeContent);
console.log('✅ Updated CLAUDE.md with recent changes');