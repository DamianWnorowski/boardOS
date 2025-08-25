-- Enable Realtime for all tables
-- Run this in Supabase SQL Editor

-- First, check if realtime is enabled for tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Enable realtime for all necessary tables
ALTER PUBLICATION supabase_realtime ADD TABLE resources;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE magnet_interaction_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE drop_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE job_row_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE truck_driver_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment;

-- Verify realtime is enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';