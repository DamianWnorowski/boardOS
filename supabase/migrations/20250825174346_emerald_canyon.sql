/*
  # Add Jobs Insert Policy

  1. Security
    - Allow authenticated users to create new jobs
    - Enable INSERT operations on jobs table for authenticated role

  This policy allows any authenticated user to create new jobs in the system.
*/

-- Allow authenticated users to create jobs
CREATE POLICY "Allow authenticated users to create jobs" 
ON public.jobs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);