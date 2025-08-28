# 🚨 APPLY DATABASE MIGRATION NOW 🚨

**This is the MOST CRITICAL step to unblock all multi-day features!**

## Quick Steps (5 minutes)

### 1. Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/eqbgcfdoyndocuomntdx/sql/new

### 2. Copy Migration SQL
Copy the ENTIRE contents of:
```
supabase/migrations/20250826_add_schedule_support.sql
```

### 3. Paste and Run
1. Paste the SQL into the editor
2. Click the **RUN** button
3. Wait for "Success" message (should take ~10 seconds)

### 4. Verify Migration
Run this command to verify:
```bash
npm run test:migration
```

Or manually check in SQL editor:
```sql
-- Check if schedule_date column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name = 'schedule_date';
```

## What This Enables

Once applied, these features will work:
- ✅ **Week View** - See and manage 7 days at once
- ✅ **Job Copying** - Drag jobs to different dates
- ✅ **Templates** - Save and reuse job configurations
- ✅ **Recurring Jobs** - Set up daily/weekly patterns
- ✅ **Resource Availability** - Track vacation/maintenance

## Impact

Without this migration:
- ❌ Week view shows all jobs on today
- ❌ Cannot create jobs for future dates
- ❌ Cannot use job templates
- ❌ Multi-day scheduling blocked

**TIME REQUIRED: 5 minutes**
**PRIORITY: IMMEDIATE**
**IMPACT: Unblocks ALL multi-day features**