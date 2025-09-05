#!/usr/bin/env node

import { execSync } from 'child_process';
import readline from 'readline';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function exec(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    return null;
  }
}

async function getCommitType() {
  const types = [
    { value: 'feat', description: 'A new feature' },
    { value: 'fix', description: 'A bug fix' },
    { value: 'docs', description: 'Documentation only changes' },
    { value: 'style', description: 'Changes that do not affect the meaning of the code' },
    { value: 'refactor', description: 'A code change that neither fixes a bug nor adds a feature' },
    { value: 'perf', description: 'A code change that improves performance' },
    { value: 'test', description: 'Adding missing tests or correcting existing tests' },
    { value: 'chore', description: 'Changes to the build process or auxiliary tools' }
  ];

  console.log(`\n${colors.bright}Select commit type:${colors.reset}`);
  types.forEach((type, index) => {
    console.log(`  ${colors.blue}${index + 1})${colors.reset} ${colors.green}${type.value}${colors.reset} - ${type.description}`);
  });

  return new Promise((resolve) => {
    rl.question(`\n${colors.yellow}Enter number (1-${types.length}) or type name: ${colors.reset}`, (answer) => {
      const index = parseInt(answer) - 1;
      if (index >= 0 && index < types.length) {
        resolve(types[index].value);
      } else {
        const type = types.find(t => t.value === answer);
        resolve(type ? type.value : 'chore');
      }
    });
  });
}

async function getCommitMessage() {
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}Enter commit message: ${colors.reset}`, (answer) => {
      resolve(answer || 'Update code');
    });
  });
}

async function main() {
  // Check for changes
  const status = exec('git status --porcelain');
  
  if (!status || status.trim() === '') {
    console.log(`${colors.yellow}No changes to commit${colors.reset}`);
    process.exit(0);
  }

  // Show changes
  console.log(`\n${colors.bright}Changes to be committed:${colors.reset}`);
  console.log(status);

  // Get all changed files
  const files = status.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const parts = line.trim().split(/\s+/);
      return parts[parts.length - 1];
    });

  // Automatically detect commit type based on files
  let suggestedType = 'chore';
  if (files.some(f => f.includes('test') || f.includes('spec'))) {
    suggestedType = 'test';
  } else if (files.some(f => f.includes('.md') || f.includes('docs/'))) {
    suggestedType = 'docs';
  } else if (files.some(f => f.includes('fix') || status.includes('fix'))) {
    suggestedType = 'fix';
  } else if (files.some(f => f.includes('feat') || f.includes('components/') || f.includes('pages/'))) {
    suggestedType = 'feat';
  }

  console.log(`\n${colors.bright}Suggested type: ${colors.green}${suggestedType}${colors.reset}`);
  
  // Get commit type
  const type = await getCommitType();
  
  // Get commit message
  const message = await getCommitMessage();
  
  // Construct full commit message
  const fullMessage = `${type}: ${message}`;
  
  console.log(`\n${colors.bright}Committing:${colors.reset} ${fullMessage}`);
  
  // Add all changes
  console.log(`${colors.blue}Adding all changes...${colors.reset}`);
  exec('git add -A');
  
  // Commit
  console.log(`${colors.blue}Committing...${colors.reset}`);
  const commitResult = exec(`git commit -m "${fullMessage}"`);
  
  if (commitResult) {
    console.log(`${colors.green}✅ Successfully committed!${colors.reset}`);
    console.log(commitResult);
  } else {
    console.log(`${colors.red}❌ Commit failed${colors.reset}`);
  }
  
  rl.close();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Cancelled${colors.reset}`);
  rl.close();
  process.exit(0);
});

main().catch(error => {
  console.error(`${colors.red}Error:${colors.reset}`, error);
  rl.close();
  process.exit(1);
});