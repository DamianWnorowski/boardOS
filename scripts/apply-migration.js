#!/usr/bin/env node

/**
 * Script to apply database migration to Supabase
 * Run with: node apply-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://eqbgcfdoyndocuomntdx.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYmdjZmRveW5kb2N1b21udGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODQxMzMsImV4cCI6MjA3MTQ2MDEzM30.fUM25Cb_uWkJJ75Dw_uZVPn9qzZ-7z5o2zOq8jkQ0d8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250826_add_schedule_support.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    
    // Note: The Supabase client doesn't directly support running raw SQL migrations
    // This would typically be done through the Supabase dashboard or CLI
    console.log('\n⚠️  IMPORTANT: Supabase client cannot directly execute DDL statements.');
    console.log('\n📋 Please follow these steps to apply the migration:');
    console.log('\n1. Go to: https://supabase.com/dashboard/project/eqbgcfdoyndocuomntdx/sql/new');
    console.log('2. Copy and paste the migration from: supabase/migrations/20250826_add_schedule_support.sql');
    console.log('3. Click "Run" to execute the migration');
    console.log('\n✅ After applying, test with: npm run test:migration');
    
    // Test if migration has been applied
    console.log('\n🔍 Checking if migration is already applied...');
    const { data, error } = await supabase
      .from('jobs')
      .select('schedule_date')
      .limit(1);
    
    if (error && error.message.includes('column jobs.schedule_date does not exist')) {
      console.log('❌ Migration NOT applied - schedule_date column does not exist');
      console.log('⏳ Please apply the migration using the instructions above');
    } else if (error) {
      console.log('⚠️  Error checking migration status:', error.message);
    } else {
      console.log('✅ Migration appears to be already applied - schedule_date column exists!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Add a test command
async function testMigration() {
  try {
    console.log('🧪 Testing migration...');
    
    // Test 1: Check if schedule_date column exists
    const { error: jobsError } = await supabase
      .from('jobs')
      .select('schedule_date')
      .limit(1);
    
    if (jobsError && jobsError.message.includes('column jobs.schedule_date does not exist')) {
      console.log('❌ Test 1 FAILED: schedule_date column not found in jobs table');
      return false;
    }
    console.log('✅ Test 1 PASSED: schedule_date column exists in jobs table');
    
    // Test 2: Check if new tables exist
    const { error: schedulesError } = await supabase
      .from('schedules')
      .select('id')
      .limit(1);
    
    if (schedulesError && schedulesError.message.includes('relation "public.schedules" does not exist')) {
      console.log('❌ Test 2 FAILED: schedules table not found');
      return false;
    }
    console.log('✅ Test 2 PASSED: schedules table exists');
    
    // Test 3: Try to create a job with schedule_date
    const testDate = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        name: 'Migration Test Job',
        type: 'paving',
        shift: 'day',
        schedule_date: testDate,
        finalized: false
      })
      .select()
      .single();
    
    if (error) {
      console.log('❌ Test 3 FAILED: Could not create job with schedule_date:', error.message);
      return false;
    }
    
    console.log('✅ Test 3 PASSED: Successfully created job with schedule_date');
    
    // Clean up test job
    if (data) {
      await supabase.from('jobs').delete().eq('id', data.id);
      console.log('🧹 Test job cleaned up');
    }
    
    console.log('\n✨ All migration tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'test') {
  testMigration().then(success => {
    process.exit(success ? 0 : 1);
  });
} else {
  applyMigration();
}