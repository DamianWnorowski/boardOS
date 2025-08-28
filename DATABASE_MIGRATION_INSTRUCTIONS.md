# Database Migration Instructions

## How to Apply the Multi-Day Scheduling Migration

The migration file has been created at `supabase/migrations/20250826_add_schedule_support.sql`

### Method 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Run the Migration**
   - Copy the entire contents of `supabase/migrations/20250826_add_schedule_support.sql`
   - Paste it into the SQL editor
   - Click "Run" or press Ctrl+Enter

4. **Verify the Migration**
   - Check that all tables were created successfully
   - Look for any error messages in the output

### Method 2: Using Supabase CLI (If installed)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref eqbgcfdoyndocuomntdx

# Run the migration
supabase db push
```

### What This Migration Does

This migration adds multi-day scheduling support to BoardOS:

#### New Columns Added to Existing Tables
- `jobs.schedule_date` - The date a job is scheduled for
- `jobs.recurrence_pattern` - JSON pattern for recurring jobs
- `jobs.is_template` - Whether this job is a template
- `jobs.original_job_id` - Reference to template job
- `assignments.schedule_date` - Date for assignment

#### New Tables Created
- `schedules` - Manages multi-day construction schedules
- `schedule_templates` - Reusable job templates
- `schedule_jobs` - Links schedules to jobs
- `resource_availability` - Tracks when resources are available/unavailable
- `recurring_job_patterns` - Defines patterns for recurring jobs

#### New Views Created
- `scheduled_jobs_view` - Jobs with schedule information
- `resource_availability_summary` - Current resource availability

### Testing the Migration

After applying the migration, test that it works:

```sql
-- Check that new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name = 'schedule_date';

-- Check that new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('schedules', 'schedule_templates', 'resource_availability');

-- Test creating a job with a schedule date
INSERT INTO jobs (name, type, shift, schedule_date) 
VALUES ('Test Job', 'paving', 'day', '2025-08-27')
RETURNING *;
```

### Rollback (If needed)

If you need to rollback the migration:

```sql
-- Drop new columns from existing tables
ALTER TABLE jobs 
DROP COLUMN IF EXISTS schedule_date,
DROP COLUMN IF EXISTS recurrence_pattern,
DROP COLUMN IF EXISTS is_template,
DROP COLUMN IF EXISTS original_job_id;

ALTER TABLE assignments 
DROP COLUMN IF EXISTS schedule_date;

-- Drop new tables
DROP TABLE IF EXISTS recurring_job_patterns CASCADE;
DROP TABLE IF EXISTS resource_availability CASCADE;
DROP TABLE IF EXISTS schedule_jobs CASCADE;
DROP TABLE IF EXISTS schedule_templates CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;

-- Drop views
DROP VIEW IF EXISTS scheduled_jobs_view;
DROP VIEW IF EXISTS resource_availability_summary;
```

### Next Steps After Migration

Once the migration is applied:

1. **Test the app** - Make sure existing functionality still works
2. **Use new features** - The DatabaseService now has methods like:
   - `getJobsByDate(date)` - Get jobs for a specific date
   - `getJobsByDateRange(startDate, endDate)` - Get jobs for date range
   - `copyJobToDate(jobId, targetDate)` - Copy a job to another date
   - `getResourceAvailability(resourceId, date)` - Check if resource is available

3. **Week View** - The Week View component can now be implemented
4. **Templates** - Job templates can be created and reused

### Troubleshooting

If you encounter errors:

1. **Permission errors** - Make sure RLS is disabled or you have proper permissions
2. **Column already exists** - The migration may have partially run, check what exists
3. **Function not found** - Make sure `gen_random_uuid()` extension is enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

### Support

If you need help, check:
- Supabase documentation: https://supabase.com/docs
- Project repository issues
- Database logs in Supabase dashboard