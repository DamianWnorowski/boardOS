/*
  # Fix Resources Table RLS Policy

  1. Security Updates
    - Drop all existing policies on resources table
    - Create comprehensive policies for authenticated users
    - Allow full CRUD operations for authenticated users
    
  2. Changes
    - INSERT policy for authenticated users to create resources
    - SELECT policy for authenticated users to read resources
    - UPDATE policy for authenticated users to modify resources  
    - DELETE policy for authenticated users to remove resources
*/

-- Drop all existing policies on resources table
DROP POLICY IF EXISTS "Authenticated users can delete resources" ON resources;
DROP POLICY IF EXISTS "Authenticated users can insert resources" ON resources;
DROP POLICY IF EXISTS "Authenticated users can read resources" ON resources;
DROP POLICY IF EXISTS "Authenticated users can update resources" ON resources;

-- Create comprehensive policies for authenticated users
CREATE POLICY "Allow authenticated users to insert resources"
  ON resources
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to select resources"
  ON resources
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update resources"
  ON resources
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete resources"
  ON resources
  FOR DELETE
  TO authenticated
  USING (true);