/*
  # Add Anonymous SELECT Policies for All Tables

  1. Problem
    - Resources were successfully inserted (366 count) using anon INSERT policy
    - But getAllScheduleData() returns 0 resources because anon users can't SELECT
    - App runs initially as anonymous user before authentication

  2. Solution
    - Add SELECT policies for anonymous users on all main tables
    - Allow anon users to read all data they can insert
    - Maintain security while enabling initial data access

  3. Tables Updated
    - resources: Allow anon SELECT for all resources
    - jobs: Allow anon SELECT for all jobs  
    - assignments: Allow anon SELECT for all assignments
    - magnet_interaction_rules: Allow anon SELECT for all rules
    - drop_rules: Allow anon SELECT for all drop rules
    - job_row_configs: Allow anon SELECT for all configs
    - truck_driver_assignments: Allow anon SELECT for all assignments
*/

-- Add anonymous SELECT policies for all main tables
CREATE POLICY "Allow anonymous users to read resources" ON resources
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous users to read jobs" ON jobs
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous users to read assignments" ON assignments
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous users to read magnet interaction rules" ON magnet_interaction_rules
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous users to read drop rules" ON drop_rules
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous users to read job row configs" ON job_row_configs
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous users to read truck driver assignments" ON truck_driver_assignments
  FOR SELECT TO anon USING (true);

-- Also add anonymous INSERT policies for jobs and assignments for development
CREATE POLICY "Allow anonymous users to insert jobs" ON jobs
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous users to insert assignments" ON assignments
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous users to insert magnet rules" ON magnet_interaction_rules
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous users to insert drop rules" ON drop_rules
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous users to insert job row configs" ON job_row_configs
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous users to insert truck driver assignments" ON truck_driver_assignments
  FOR INSERT TO anon WITH CHECK (true);