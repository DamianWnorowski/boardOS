/*
  # Add INSERT policy for jobs table

  1. Security
    - Add policy for authenticated users to insert jobs
    - Allows all authenticated users to create new jobs

  This resolves the RLS policy violation when creating jobs.
*/

-- Add INSERT policy for authenticated users to create jobs
CREATE POLICY "Allow authenticated users to insert jobs" 
ON jobs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);