-- Add RLS policies for employees table to fix test failures
-- This fixes the "new row violates row-level security policy for table 'employees'" error

-- Enable RLS on employees table if not already enabled
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable all access for employees" ON employees;

-- Create policy for full access (matches other tables)
CREATE POLICY "Enable all access for employees" ON employees
    FOR ALL USING (true) WITH CHECK (true);

-- Verify the policy was created
SELECT tablename, policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'employees';