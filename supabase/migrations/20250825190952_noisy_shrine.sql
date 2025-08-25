/*
# Allow anonymous inserts for initial resource population

1. Security Policy
  - Allow 'anon' role to insert resources for initial data seeding
  - Required for application startup when populating default resources

2. Changes
  - Add INSERT policy for anonymous users on resources table
  - Enable initial data population without authentication requirement
*/

-- Ensure RLS is enabled on resources table
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous users to insert resources for initial population
CREATE POLICY "Allow anon insert for initial resource population"
ON public.resources FOR INSERT
TO anon WITH CHECK (true);