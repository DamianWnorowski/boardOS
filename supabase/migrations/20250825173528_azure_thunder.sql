/*
  # Update Jobs Table RLS Policy

  1. Policy Changes
    - Remove restrictive policy that only allows foremen/admins to modify jobs
    - Add policy allowing all authenticated users to create and modify jobs
    - Keep read access for all authenticated users

  2. Security
    - Authenticated users can perform all operations on jobs
    - Anonymous users still cannot access jobs data
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Foremen and admins can modify jobs" ON jobs;

-- Create new policy allowing all authenticated users to manage jobs
CREATE POLICY "Authenticated users can manage jobs"
  ON jobs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);