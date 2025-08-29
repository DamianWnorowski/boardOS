#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://eqbgcfdoyndocuomntdx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYmdjZmRveW5kb2N1b21udGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODQxMzMsImV4cCI6MjA3MTQ2MDEzM30.fUM25Cb_uWkJJ75Dw_uZVPn9qzZ-7z5o2zOq8jkQ0d8';

const supabase = createClient(supabaseUrl, supabaseKey);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

// Track rule checksums to detect changes
let ruleChecksums = {
  magnet: '',
  drop: '',
  jobRow: ''
};

async function calculateChecksum(data) {
  const json = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

async function fetchCurrentRules() {
  const [magnetRules, dropRules, jobRowConfigs] = await Promise.all([
    supabase.from('magnet_interaction_rules').select('*').order('source_type'),
    supabase.from('drop_rules').select('*').order('row_type'),
    supabase.from('job_row_configs').select('*').order('row_type')
  ]);

  return {
    magnet: magnetRules.data || [],
    drop: dropRules.data || [],
    jobRow: jobRowConfigs.data || []
  };
}

async function checkForChanges() {
  try {
    const rules = await fetchCurrentRules();
    
    const newChecksums = {
      magnet: await calculateChecksum(rules.magnet),
      drop: await calculateChecksum(rules.drop),
      jobRow: await calculateChecksum(rules.jobRow)
    };

    const changes = [];
    
    if (newChecksums.magnet !== ruleChecksums.magnet && ruleChecksums.magnet !== '') {
      changes.push('Magnet interaction rules');
    }
    if (newChecksums.drop !== ruleChecksums.drop && ruleChecksums.drop !== '') {
      changes.push('Drop rules');
    }
    if (newChecksums.jobRow !== ruleChecksums.jobRow && ruleChecksums.jobRow !== '') {
      changes.push('Job row configurations');
    }

    if (changes.length > 0) {
      log(`🔄 Detected changes in: ${changes.join(', ')}`, colors.yellow);
      await regenerateTests();
    }

    // Update checksums
    ruleChecksums = newChecksums;
    
    return changes.length > 0;
  } catch (error) {
    log(`❌ Error checking for changes: ${error.message}`, colors.red);
    return false;
  }
}

async function regenerateTests() {
  log('🧪 Regenerating E2E tests...', colors.cyan);
  
  return new Promise((resolve, reject) => {
    const generate = spawn('npm', ['run', 'test:e2e:generate'], {
      stdio: 'inherit',
      shell: true
    });

    generate.on('close', (code) => {
      if (code === 0) {
        log('✅ Tests regenerated successfully!', colors.green);
        
        // Save regeneration timestamp
        const timestampFile = join(__dirname, '..', '.test-generation-timestamp');
        writeFileSync(timestampFile, new Date().toISOString());
        
        resolve();
      } else {
        log(`❌ Test regeneration failed with code ${code}`, colors.red);
        reject(new Error(`Test generation failed with code ${code}`));
      }
    });
  });
}

async function setupRealtimeSubscriptions() {
  log('📡 Setting up real-time subscriptions...', colors.blue);

  // Subscribe to magnet_interaction_rules changes
  supabase
    .channel('magnet-rules-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'magnet_interaction_rules' },
      async (payload) => {
        log(`🔔 Magnet rule ${payload.eventType}: ${payload.new?.source_type || payload.old?.source_type}`, colors.yellow);
        await checkForChanges();
      }
    )
    .subscribe();

  // Subscribe to drop_rules changes
  supabase
    .channel('drop-rules-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'drop_rules' },
      async (payload) => {
        log(`🔔 Drop rule ${payload.eventType}: ${payload.new?.row_type || payload.old?.row_type}`, colors.yellow);
        await checkForChanges();
      }
    )
    .subscribe();

  // Subscribe to job_row_configs changes
  supabase
    .channel('job-row-configs-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'job_row_configs' },
      async (payload) => {
        log(`🔔 Job row config ${payload.eventType}`, colors.yellow);
        await checkForChanges();
      }
    )
    .subscribe();

  log('✅ Real-time subscriptions active', colors.green);
}

async function main() {
  console.clear();
  log('🚀 BoardOS Test Auto-Regeneration Service', colors.bright + colors.cyan);
  log('=' .repeat(50), colors.cyan);
  
  // Initial checksum calculation
  log('📊 Fetching initial rule state...', colors.blue);
  const rules = await fetchCurrentRules();
  
  ruleChecksums = {
    magnet: await calculateChecksum(rules.magnet),
    drop: await calculateChecksum(rules.drop),
    jobRow: await calculateChecksum(rules.jobRow)
  };
  
  log(`   Magnet rules: ${rules.magnet.length}`, colors.reset);
  log(`   Drop rules: ${rules.drop.length}`, colors.reset);
  log(`   Job row configs: ${rules.jobRow.length}`, colors.reset);
  
  // Check if tests need initial generation
  try {
    const timestampFile = join(__dirname, '..', '.test-generation-timestamp');
    const lastGenerated = readFileSync(timestampFile, 'utf-8');
    const lastDate = new Date(lastGenerated);
    log(`📅 Tests last generated: ${lastDate.toLocaleString()}`, colors.reset);
  } catch (err) {
    log('⚠️  No previous test generation detected', colors.yellow);
    await regenerateTests();
  }
  
  // Set up real-time monitoring
  await setupRealtimeSubscriptions();
  
  // Also poll periodically as backup (every 5 minutes)
  setInterval(async () => {
    log('🔍 Periodic rule check...', colors.reset);
    await checkForChanges();
  }, 5 * 60 * 1000);
  
  log('\n👀 Watching for business rule changes...', colors.green);
  log('   Press Ctrl+C to stop\n', colors.reset);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('\n👋 Stopping rule watcher...', colors.yellow);
    process.exit(0);
  });
}

// Run the watcher
main().catch(err => {
  log(`❌ Fatal error: ${err.message}`, colors.red);
  process.exit(1);
});