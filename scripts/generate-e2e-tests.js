#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateDynamicTests() {
  console.log('🧪 Generating dynamic E2E tests from business rules...\n');

  try {
    // Dynamically import the TypeScript file
    const { DynamicTestGenerator } = await import('../playwright/generators/test-generator.ts');
    
    const generator = new DynamicTestGenerator();
    
    // Ensure output directory exists
    const outputDir = join(__dirname, '..', 'playwright', 'tests', 'dynamic');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = join(outputDir, 'auto-generated-rules.spec.ts');
    
    // Generate and save tests
    await generator.generateAndSaveTests(outputPath);
    
    console.log('✅ Dynamic tests generated successfully!');
    console.log(`📁 Output: ${outputPath}\n`);
    
    // Show summary
    const rules = await generator.ruleFetcher.fetchAllBusinessRules();
    const customRules = await generator.ruleFetcher.fetchCustomRules();
    
    console.log('📊 Test Generation Summary:');
    console.log(`   - Magnet Rules: ${rules.filter(r => r.type === 'magnet').length}`);
    console.log(`   - Drop Rules: ${rules.filter(r => r.type === 'drop').length}`);
    console.log(`   - Job Row Rules: ${rules.filter(r => r.type === 'job_row').length}`);
    console.log(`   - Custom Rules: ${customRules.length}`);
    console.log(`   - Total Test Scenarios: ${[...rules, ...customRules].reduce((acc, r) => acc + (r.testScenarios?.length || 0), 0)}`);
    
  } catch (error) {
    console.error('❌ Failed to generate dynamic tests:', error);
    process.exit(1);
  }
}

// Check if database is accessible
async function checkDatabaseConnection() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://eqbgcfdoyndocuomntdx.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseKey) {
      console.warn('⚠️  Warning: VITE_SUPABASE_ANON_KEY not set. Using mock data for test generation.');
      return false;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('magnet_interaction_rules').select('count').single();
    
    if (error) {
      console.warn('⚠️  Warning: Could not connect to database. Using mock data for test generation.');
      return false;
    }
    
    return true;
  } catch (err) {
    console.warn('⚠️  Warning: Database check failed. Using mock data for test generation.');
    return false;
  }
}

// Run the generator
(async () => {
  console.log('🔍 Checking database connection...');
  const hasDb = await checkDatabaseConnection();
  
  if (hasDb) {
    console.log('✅ Database connected. Fetching live business rules.\n');
  } else {
    console.log('📦 Using mock business rules for test generation.\n');
  }
  
  await generateDynamicTests();
})();