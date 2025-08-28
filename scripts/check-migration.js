#!/usr/bin/env node

/**
 * Check if the database migration has been applied
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://eqbgcfdoyndocuomntdx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_ANON_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigration() {
  console.log('🔍 Checking database migration status...\n');
  
  try {
    // Check if schedule_date column exists on jobs table
    const { data: jobsSchema, error: jobsError } = await supabase
      .from('jobs')
      .select('schedule_date')
      .limit(1);

    if (jobsError && jobsError.code === '42703') {
      console.log('❌ Migration NOT applied: schedule_date column missing on jobs table');
      console.log('   Run the migration SQL in Supabase dashboard');
      return false;
    } else if (jobsError) {
      console.log('⚠️  Error checking jobs table:', jobsError.message);
    } else {
      console.log('✅ Jobs table has schedule_date column');
    }

    // Check if schedule_date column exists on assignments table
    const { data: assignmentsSchema, error: assignmentsError } = await supabase
      .from('assignments')
      .select('schedule_date')
      .limit(1);

    if (assignmentsError && assignmentsError.code === '42703') {
      console.log('❌ Migration PARTIAL: schedule_date column missing on assignments table');
      return false;
    } else if (assignmentsError) {
      console.log('⚠️  Error checking assignments table:', assignmentsError.message);
    } else {
      console.log('✅ Assignments table has schedule_date column');
    }

    // Check if schedules table exists
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('schedules')
      .select('id')
      .limit(1);

    if (schedulesError && schedulesError.code === '42P01') {
      console.log('❌ Migration PARTIAL: schedules table does not exist');
      return false;
    } else if (schedulesError) {
      console.log('⚠️  Error checking schedules table:', schedulesError.message);
    } else {
      console.log('✅ Schedules table exists');
    }

    console.log('\n🎉 Migration appears to be fully applied!');
    return true;
    
  } catch (error) {
    console.error('💥 Error checking migration:', error.message);
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkMigration()
    .then(success => {
      if (!success) {
        console.log('\n📋 To apply migration:');
        console.log('1. Open Supabase dashboard SQL editor');
        console.log('2. Copy contents from: supabase/migrations/20250826_add_schedule_support.sql');
        console.log('3. Execute the SQL');
        console.log('4. Run this script again to verify');
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(() => process.exit(1));
}

export { checkMigration };