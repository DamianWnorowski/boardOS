/*
  # Fix RLS Policies for All Tables

  1. Enable RLS
    - Ensure RLS is enabled on all application tables
  
  2. Create Comprehensive Policies
    - Allow authenticated users full CRUD access to all main tables
    - Allow read-only access to audit logs
    - Remove conflicting policies first
  
  3. Security
    - Authenticated users can perform all operations
    - Anonymous users have no access (except where explicitly allowed)
*/

-- Enable RLS for all relevant tables
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magnet_interaction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_row_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS for employees and equipment tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees' AND table_schema = 'public') THEN
        ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment' AND table_schema = 'public') THEN
        ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Policies for 'jobs' table
DROP POLICY IF EXISTS "Allow authenticated users to read jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow authenticated users to insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow authenticated users to update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow authenticated users to delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can read jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "All authenticated users can modify jobs" ON public.jobs;

CREATE POLICY "Authenticated users can read jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (true);

-- Policies for 'resources' table
DROP POLICY IF EXISTS "Allow authenticated users to read resources" ON public.resources;
DROP POLICY IF EXISTS "Allow authenticated users to insert resources" ON public.resources;
DROP POLICY IF EXISTS "Allow authenticated users to update resources" ON public.resources;
DROP POLICY IF EXISTS "Allow authenticated users to delete resources" ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can read resources" ON public.resources;
DROP POLICY IF EXISTS "All authenticated users can modify resources" ON public.resources;
DROP POLICY IF EXISTS "Anonymous users can read resources" ON public.resources;
DROP POLICY IF EXISTS "Anonymous users can insert resources" ON public.resources;
DROP POLICY IF EXISTS "Anonymous users can insert resources for setup" ON public.resources;

CREATE POLICY "Authenticated users can read resources"
  ON public.resources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert resources"
  ON public.resources FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update resources"
  ON public.resources FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete resources"
  ON public.resources FOR DELETE
  TO authenticated
  USING (true);

-- Policies for 'assignments' table
DROP POLICY IF EXISTS "Allow authenticated users to read assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow authenticated users to insert assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow authenticated users to update assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow authenticated users to delete assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can read assignments" ON public.assignments;
DROP POLICY IF EXISTS "All authenticated users can modify assignments" ON public.assignments;

CREATE POLICY "Authenticated users can read assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert assignments"
  ON public.assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assignments"
  ON public.assignments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete assignments"
  ON public.assignments FOR DELETE
  TO authenticated
  USING (true);

-- Policies for 'magnet_interaction_rules' table
DROP POLICY IF EXISTS "Allow authenticated users to read magnet_interaction_rules" ON public.magnet_interaction_rules;
DROP POLICY IF EXISTS "Allow authenticated users to insert magnet_interaction_rules" ON public.magnet_interaction_rules;
DROP POLICY IF EXISTS "Allow authenticated users to update magnet_interaction_rules" ON public.magnet_interaction_rules;
DROP POLICY IF EXISTS "Allow authenticated users to delete magnet_interaction_rules" ON public.magnet_interaction_rules;
DROP POLICY IF EXISTS "Authenticated users can read magnet interaction rules" ON public.magnet_interaction_rules;
DROP POLICY IF EXISTS "All authenticated users can modify magnet interaction rules" ON public.magnet_interaction_rules;

CREATE POLICY "Authenticated users can read magnet interaction rules"
  ON public.magnet_interaction_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert magnet interaction rules"
  ON public.magnet_interaction_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update magnet interaction rules"
  ON public.magnet_interaction_rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete magnet interaction rules"
  ON public.magnet_interaction_rules FOR DELETE
  TO authenticated
  USING (true);

-- Policies for 'drop_rules' table
DROP POLICY IF EXISTS "Allow authenticated users to read drop_rules" ON public.drop_rules;
DROP POLICY IF EXISTS "Allow authenticated users to insert drop_rules" ON public.drop_rules;
DROP POLICY IF EXISTS "Allow authenticated users to update drop_rules" ON public.drop_rules;
DROP POLICY IF EXISTS "Allow authenticated users to delete drop_rules" ON public.drop_rules;
DROP POLICY IF EXISTS "Authenticated users can read drop rules" ON public.drop_rules;
DROP POLICY IF EXISTS "All authenticated users can modify drop rules" ON public.drop_rules;

CREATE POLICY "Authenticated users can read drop rules"
  ON public.drop_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert drop rules"
  ON public.drop_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update drop rules"
  ON public.drop_rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete drop rules"
  ON public.drop_rules FOR DELETE
  TO authenticated
  USING (true);

-- Policies for 'job_row_configs' table
DROP POLICY IF EXISTS "Allow authenticated users to read job_row_configs" ON public.job_row_configs;
DROP POLICY IF EXISTS "Allow authenticated users to insert job_row_configs" ON public.job_row_configs;
DROP POLICY IF EXISTS "Allow authenticated users to update job_row_configs" ON public.job_row_configs;
DROP POLICY IF EXISTS "Allow authenticated users to delete job_row_configs" ON public.job_row_configs;
DROP POLICY IF EXISTS "Authenticated users can read job row configs" ON public.job_row_configs;
DROP POLICY IF EXISTS "All authenticated users can modify job row configs" ON public.job_row_configs;

CREATE POLICY "Authenticated users can read job row configs"
  ON public.job_row_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert job row configs"
  ON public.job_row_configs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update job row configs"
  ON public.job_row_configs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete job row configs"
  ON public.job_row_configs FOR DELETE
  TO authenticated
  USING (true);

-- Policies for 'truck_driver_assignments' table
DROP POLICY IF EXISTS "Allow authenticated users to read truck_driver_assignments" ON public.truck_driver_assignments;
DROP POLICY IF EXISTS "Allow authenticated users to insert truck_driver_assignments" ON public.truck_driver_assignments;
DROP POLICY IF EXISTS "Allow authenticated users to update truck_driver_assignments" ON public.truck_driver_assignments;
DROP POLICY IF EXISTS "Allow authenticated users to delete truck_driver_assignments" ON public.truck_driver_assignments;
DROP POLICY IF EXISTS "Authenticated users can read truck driver assignments" ON public.truck_driver_assignments;
DROP POLICY IF EXISTS "All authenticated users can modify truck driver assignments" ON public.truck_driver_assignments;

CREATE POLICY "Authenticated users can read truck driver assignments"
  ON public.truck_driver_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert truck driver assignments"
  ON public.truck_driver_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update truck driver assignments"
  ON public.truck_driver_assignments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete truck driver assignments"
  ON public.truck_driver_assignments FOR DELETE
  TO authenticated
  USING (true);

-- Policies for 'employees' table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to read employees" ON public.employees;
        DROP POLICY IF EXISTS "Allow authenticated users to insert employees" ON public.employees;
        DROP POLICY IF EXISTS "Allow authenticated users to update employees" ON public.employees;
        DROP POLICY IF EXISTS "Allow authenticated users to delete employees" ON public.employees;
        DROP POLICY IF EXISTS "All authenticated users can read employees" ON public.employees;
        DROP POLICY IF EXISTS "All authenticated users can modify employees" ON public.employees;

        CREATE POLICY "Authenticated users can read employees"
          ON public.employees FOR SELECT
          TO authenticated
          USING (true);

        CREATE POLICY "Authenticated users can insert employees"
          ON public.employees FOR INSERT
          TO authenticated
          WITH CHECK (true);

        CREATE POLICY "Authenticated users can update employees"
          ON public.employees FOR UPDATE
          TO authenticated
          USING (true)
          WITH CHECK (true);

        CREATE POLICY "Authenticated users can delete employees"
          ON public.employees FOR DELETE
          TO authenticated
          USING (true);
    END IF;
END $$;

-- Policies for 'equipment' table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to read equipment" ON public.equipment;
        DROP POLICY IF EXISTS "Allow authenticated users to insert equipment" ON public.equipment;
        DROP POLICY IF EXISTS "Allow authenticated users to update equipment" ON public.equipment;
        DROP POLICY IF EXISTS "Allow authenticated users to delete equipment" ON public.equipment;
        DROP POLICY IF EXISTS "All authenticated users can read equipment" ON public.equipment;
        DROP POLICY IF EXISTS "All authenticated users can modify equipment" ON public.equipment;

        CREATE POLICY "Authenticated users can read equipment"
          ON public.equipment FOR SELECT
          TO authenticated
          USING (true);

        CREATE POLICY "Authenticated users can insert equipment"
          ON public.equipment FOR INSERT
          TO authenticated
          WITH CHECK (true);

        CREATE POLICY "Authenticated users can update equipment"
          ON public.equipment FOR UPDATE
          TO authenticated
          USING (true)
          WITH CHECK (true);

        CREATE POLICY "Authenticated users can delete equipment"
          ON public.equipment FOR DELETE
          TO authenticated
          USING (true);
    END IF;
END $$;

-- Policies for 'audit_logs' table (read-only for authenticated users)
DROP POLICY IF EXISTS "Allow authenticated users to read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Prevent direct audit log modification" ON public.audit_logs;
DROP POLICY IF EXISTS "Only admins can read audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Prevent direct audit log modification"
  ON public.audit_logs FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);