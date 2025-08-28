#!/usr/bin/env node

// Simple migration test
console.log('🔍 Testing database connection and migration status...\n');

// Use dynamic import to work with ES modules
(async () => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      'https://eqbgcfdoyndocuomntdx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYmdjZmRveW5kb2N1b21udGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODQxMzMsImV4cCI6MjA3MTQ2MDEzM30.fUM25Cb_uWkJJ75Dw_uZVPn9qzZ-7z5o2zOq8jkQ0d8'
    );

    console.log('✅ Supabase client created successfully');

    // Test 1: Check if jobs table has schedule_date column
    console.log('\n1️⃣ Checking jobs table for schedule_date column...');
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, name, schedule_date')
      .limit(1);

    if (jobsError) {
      if (jobsError.code === '42703') {
        console.log('❌ schedule_date column NOT found in jobs table');
        console.log('   Migration needs to be applied');
        console.log('\nTo apply migration:');
        console.log('1. Go to https://supabase.com/dashboard/project/eqbgcfdoyndocuomntdx/sql/new');
        console.log('2. Copy contents from supabase/migrations/20250826_add_schedule_support.sql');
        console.log('3. Execute the SQL');
        process.exit(1);
      } else {
        console.log('❌ Error checking jobs table:', jobsError.message);
        process.exit(1);
      }
    } else {
      console.log('✅ schedule_date column exists in jobs table');
      console.log('   Sample data:', jobs);
    }

    // Test 2: Check if schedules table exists
    console.log('\n2️⃣ Checking if schedules table exists...');
    const { data: schedules, error: schedulesError } = await supabase
      .from('schedules')
      .select('id')
      .limit(1);

    if (schedulesError) {
      if (schedulesError.code === '42P01') {
        console.log('❌ schedules table does NOT exist');
        console.log('   Migration needs to be applied');
        process.exit(1);
      } else {
        console.log('❌ Error checking schedules table:', schedulesError.message);
        process.exit(1);
      }
    } else {
      console.log('✅ schedules table exists');
    }

    console.log('\n🎉 Migration appears to be fully applied!');
    console.log('✅ All database schema changes are in place');

  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
})();