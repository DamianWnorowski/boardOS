/*
  # Allow Anonymous Resource Population

  1. Security Policy
    - Add policy for `anon` role to insert resources
    - Required for initial data population when app starts
    - Allows anonymous users to seed resource data

  This resolves the "new row violates row-level security policy for table 'resources'" error
  that occurs during initial resource population.
*/

-- Add policy to allow anonymous users to insert resources for initial population
CREATE POLICY "Allow anon insert for initial resource population"
ON public.resources FOR INSERT
TO anon WITH CHECK (true);