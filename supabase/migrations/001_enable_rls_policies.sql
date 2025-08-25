-- Enable Row Level Security on all tables
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE magnet_interaction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_row_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for anonymous users)
-- This allows all operations for anonymous users
-- You can make these more restrictive based on your needs

-- Resources policies
CREATE POLICY "Enable all access for resources" ON resources
    FOR ALL USING (true) WITH CHECK (true);

-- Jobs policies
CREATE POLICY "Enable all access for jobs" ON jobs
    FOR ALL USING (true) WITH CHECK (true);

-- Assignments policies
CREATE POLICY "Enable all access for assignments" ON assignments
    FOR ALL USING (true) WITH CHECK (true);

-- Magnet interaction rules policies
CREATE POLICY "Enable all access for magnet_interaction_rules" ON magnet_interaction_rules
    FOR ALL USING (true) WITH CHECK (true);

-- Drop rules policies
CREATE POLICY "Enable all access for drop_rules" ON drop_rules
    FOR ALL USING (true) WITH CHECK (true);

-- Job row configs policies
CREATE POLICY "Enable all access for job_row_configs" ON job_row_configs
    FOR ALL USING (true) WITH CHECK (true);

-- Truck driver assignments policies
CREATE POLICY "Enable all access for truck_driver_assignments" ON truck_driver_assignments
    FOR ALL USING (true) WITH CHECK (true);

-- Audit logs policies (read-only for anonymous users)
CREATE POLICY "Enable read access for audit_logs" ON audit_logs
    FOR SELECT USING (true);

-- Optional: If you want to allow anonymous users to insert audit logs
CREATE POLICY "Enable insert access for audit_logs" ON audit_logs
    FOR INSERT WITH CHECK (true);