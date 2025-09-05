-- Add RLS policies for equipment table to fix test failures
-- This fixes the "new row violates row-level security policy for table 'equipment'" error

-- Enable RLS on equipment table if not already enabled
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable all access for equipment" ON equipment;

-- Create policy for full access (matches other tables)
CREATE POLICY "Enable all access for equipment" ON equipment
    FOR ALL USING (true) WITH CHECK (true);

-- Verify the policy was created
SELECT tablename, policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'equipment';