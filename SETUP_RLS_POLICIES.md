# Setting Up Row Level Security Policies

Your Supabase database has Row Level Security (RLS) enabled, which is blocking operations. Follow these steps to fix it:

## Quick Fix (Development)

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/eqbgcfdoyndocuomntdx

2. **Navigate to SQL Editor** (in the left sidebar)

3. **Run this SQL command** to temporarily disable RLS (for development only):

```sql
-- QUICK FIX: Disable RLS on all tables (DEVELOPMENT ONLY)
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE magnet_interaction_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE drop_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_row_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE truck_driver_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
```

## Production Setup (Recommended)

For production, run the SQL script in `supabase/migrations/001_enable_rls_policies.sql` which:
- Keeps RLS enabled for security
- Creates permissive policies for anonymous users
- Allows all CRUD operations on schedule data

## Alternative: Using Service Role Key

If you need full database access without RLS restrictions, you can use the service role key instead of the anon key. However, this should NEVER be used in client-side code:

1. Find your service role key in Supabase Dashboard > Settings > API
2. Use it only in server-side/backend code
3. Never expose it in frontend applications

## Current Issue

The error "new row violates row-level security policy for table 'jobs'" means:
- RLS is enabled on the jobs table
- No policy exists that allows INSERT operations
- The anon key doesn't have permission to create jobs

Choose either the Quick Fix for immediate development or set up proper policies for production use.