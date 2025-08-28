-- Add audit logging for job changes
-- This migration creates audit logging capabilities for tracking all job modifications

-- Create job audit logs table
CREATE TABLE IF NOT EXISTS job_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID, -- Could reference auth.users if auth is implemented
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'date_changed', 'deleted', 'assigned', 'unassigned')),
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_audit_logs_job_id ON job_audit_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_audit_logs_user_id ON job_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_job_audit_logs_changed_at ON job_audit_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_audit_logs_action ON job_audit_logs(action);

-- Add comments
COMMENT ON TABLE job_audit_logs IS 'Audit trail for all job-related changes';
COMMENT ON COLUMN job_audit_logs.job_id IS 'Reference to the job that was changed';
COMMENT ON COLUMN job_audit_logs.user_id IS 'User who made the change';
COMMENT ON COLUMN job_audit_logs.action IS 'Type of action performed';
COMMENT ON COLUMN job_audit_logs.old_data IS 'Data before the change';
COMMENT ON COLUMN job_audit_logs.new_data IS 'Data after the change';
COMMENT ON COLUMN job_audit_logs.changed_at IS 'Timestamp when the change occurred';

-- Enable RLS
ALTER TABLE job_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for audit logs (readable by all authenticated users, but only system can write)
CREATE POLICY "Users can view audit logs" ON job_audit_logs
  FOR SELECT USING (true);

-- Create function to automatically log job changes
CREATE OR REPLACE FUNCTION log_job_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO job_audit_logs (job_id, action, new_data)
    VALUES (NEW.id, 'created', to_jsonb(NEW));
    RETURN NEW;
  END IF;
  
  -- Log UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO job_audit_logs (job_id, action, old_data, new_data)
    VALUES (NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  
  -- Log DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO job_audit_logs (job_id, action, old_data)
    VALUES (OLD.id, 'deleted', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic logging
DROP TRIGGER IF EXISTS trigger_log_job_changes ON jobs;
CREATE TRIGGER trigger_log_job_changes
  AFTER INSERT OR UPDATE OR DELETE ON jobs
  FOR EACH ROW EXECUTE FUNCTION log_job_changes();

-- Create view for easy audit log reading
CREATE OR REPLACE VIEW job_audit_view AS
SELECT 
  jal.id,
  jal.job_id,
  j.name as job_name,
  j.job_number,
  jal.user_id,
  jal.action,
  jal.old_data,
  jal.new_data,
  jal.changed_at,
  -- Extract specific changes for common fields
  CASE 
    WHEN jal.action = 'date_changed' THEN 
      CONCAT(
        'Date changed from ', 
        (jal.old_data->>'schedule_date'), 
        ' to ', 
        (jal.new_data->>'schedule_date')
      )
    WHEN jal.action = 'created' THEN 
      CONCAT('Job created: ', jal.new_data->>'name')
    WHEN jal.action = 'deleted' THEN 
      CONCAT('Job deleted: ', jal.old_data->>'name')
    ELSE 
      CONCAT('Job ', jal.action)
  END as description
FROM job_audit_logs jal
LEFT JOIN jobs j ON jal.job_id = j.id
ORDER BY jal.changed_at DESC;

-- Grant permissions
GRANT SELECT ON job_audit_view TO authenticated;
GRANT SELECT ON job_audit_logs TO authenticated;