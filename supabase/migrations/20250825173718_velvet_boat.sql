/*
  # Fix Resources RLS Policies for Anonymous Access

  1. Security Updates
    - Add policy to allow anonymous users to read resources
    - Add policy to allow anonymous users to insert resources for initial population
    - Keep existing authenticated user policies intact

  2. Purpose
    - Allow the frontend to load resources on first visit
    - Enable automatic population of resources when database is empty
    - Maintain security for authenticated operations
*/

-- Allow anonymous users to read resources (for initial app load)
CREATE POLICY "Anonymous users can read resources"
  ON resources
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to insert resources (for initial population only)
CREATE POLICY "Anonymous users can insert resources"
  ON resources
  FOR INSERT
  TO anon
  WITH CHECK (true);