/*
  # Temporary Admin Access for All Users

  This migration temporarily grants admin-level access to all authenticated users
  by updating RLS policies to be more permissive. This is for development/testing only.

  1. Policy Updates
    - Update all restrictive policies to allow all authenticated users
    - Maintain data security while removing role-based restrictions
    
  2. Temporary Nature
    - This should be reverted in production
    - All policies modified for development ease
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Foremen and admins can modify resources" ON public.resources;
DROP POLICY IF EXISTS "Foremen and admins can modify assignments" ON public.assignments;
DROP POLICY IF EXISTS "Only admins can modify magnet interaction rules" ON public.magnet_interaction_rules;
DROP POLICY IF EXISTS "Only admins can modify drop rules" ON public.drop_rules;
DROP POLICY IF EXISTS "Foremen and admins can modify job row configs" ON public.job_row_configs;
DROP POLICY IF EXISTS "Foremen and admins can modify truck driver assignments" ON public.truck_driver_assignments;

-- Create permissive policies for all authenticated users
CREATE POLICY "All authenticated users can modify resources" ON public.resources
  FOR ALL TO authenticated 
  USING (true);

CREATE POLICY "All authenticated users can modify assignments" ON public.assignments
  FOR ALL TO authenticated 
  USING (true);

CREATE POLICY "All authenticated users can modify jobs" ON public.jobs
  FOR ALL TO authenticated 
  USING (true);

CREATE POLICY "All authenticated users can modify magnet interaction rules" ON public.magnet_interaction_rules
  FOR ALL TO authenticated 
  USING (true);

CREATE POLICY "All authenticated users can modify drop rules" ON public.drop_rules
  FOR ALL TO authenticated 
  USING (true);

CREATE POLICY "All authenticated users can modify job row configs" ON public.job_row_configs
  FOR ALL TO authenticated 
  USING (true);

CREATE POLICY "All authenticated users can modify truck driver assignments" ON public.truck_driver_assignments
  FOR ALL TO authenticated 
  USING (true);

-- Also allow anonymous users to insert resources for initial population
CREATE POLICY "Anonymous users can insert resources for setup" ON public.resources
  FOR INSERT TO anon 
  WITH CHECK (true);