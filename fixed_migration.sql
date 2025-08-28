-- FIXED MIGRATION: Handles existing columns and tables safely
-- This migration adds multi-day scheduling capabilities to BoardOS
-- Safe to run even if partially applied before

-- Function to safely add columns only if they don't exist
DO $$ 
BEGIN
    -- Add schedule_date to jobs table (only if it doesn't exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'jobs' AND column_name = 'schedule_date') THEN
        ALTER TABLE jobs ADD COLUMN schedule_date DATE DEFAULT CURRENT_DATE;
    END IF;
    
    -- Add recurrence_pattern to jobs table (only if it doesn't exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'jobs' AND column_name = 'recurrence_pattern') THEN
        ALTER TABLE jobs ADD COLUMN recurrence_pattern JSONB;
    END IF;
    
    -- Add is_template to jobs table (only if it doesn't exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'jobs' AND column_name = 'is_template') THEN
        ALTER TABLE jobs ADD COLUMN is_template BOOLEAN DEFAULT false;
    END IF;
    
    -- Add original_job_id to jobs table (only if it doesn't exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'jobs' AND column_name = 'original_job_id') THEN
        ALTER TABLE jobs ADD COLUMN original_job_id UUID REFERENCES jobs(id);
    END IF;
    
    -- Add schedule_date to assignments table (only if it doesn't exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assignments' AND column_name = 'schedule_date') THEN
        ALTER TABLE assignments ADD COLUMN schedule_date DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- Add indexes for performance (IF NOT EXISTS is safe)
CREATE INDEX IF NOT EXISTS idx_jobs_schedule_date ON jobs(schedule_date);
CREATE INDEX IF NOT EXISTS idx_jobs_template ON jobs(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_assignments_schedule ON assignments(job_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_assignments_resource_date ON assignments(resource_id, schedule_date);

-- Create schedules table for managing multi-day schedules
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_template BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create schedule_templates table for reusable job configurations
CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  job_config JSONB NOT NULL,
  resources JSONB,
  tags TEXT[],
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create schedule_jobs junction table
CREATE TABLE IF NOT EXISTS schedule_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  sequence_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, scheduled_date)
);

-- Create resource_availability table for tracking time off / unavailability
CREATE TABLE IF NOT EXISTS resource_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  availability_type TEXT NOT NULL CHECK (availability_type IN ('available', 'unavailable', 'vacation', 'sick', 'maintenance')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for resource availability
CREATE INDEX IF NOT EXISTS idx_resource_availability_dates ON resource_availability(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_resource_availability_resource ON resource_availability(resource_id);

-- Create recurring_job_patterns table
CREATE TABLE IF NOT EXISTS recurring_job_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
  pattern_config JSONB NOT NULL, -- Stores days of week, interval, etc.
  start_date DATE NOT NULL,
  end_date DATE,
  exceptions DATE[], -- Dates to skip
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at trigger function (CREATE OR REPLACE is safe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safely create triggers (drop if exists, then create)
DO $$ 
BEGIN
    -- Schedules trigger
    DROP TRIGGER IF EXISTS update_schedules_updated_at ON schedules;
    CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Schedule templates trigger  
    DROP TRIGGER IF EXISTS update_schedule_templates_updated_at ON schedule_templates;
    CREATE TRIGGER update_schedule_templates_updated_at BEFORE UPDATE ON schedule_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Resource availability trigger
    DROP TRIGGER IF EXISTS update_resource_availability_updated_at ON resource_availability;
    CREATE TRIGGER update_resource_availability_updated_at BEFORE UPDATE ON resource_availability
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Recurring job patterns trigger
    DROP TRIGGER IF EXISTS update_recurring_job_patterns_updated_at ON recurring_job_patterns;
    CREATE TRIGGER update_recurring_job_patterns_updated_at BEFORE UPDATE ON recurring_job_patterns
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- Add helpful views for common queries (CREATE OR REPLACE is safe)

-- View for jobs with their schedule information
CREATE OR REPLACE VIEW scheduled_jobs_view AS
SELECT 
  j.*,
  CASE 
    WHEN j.schedule_date = CURRENT_DATE THEN 'today'
    WHEN j.schedule_date = CURRENT_DATE + INTERVAL '1 day' THEN 'tomorrow'
    WHEN j.schedule_date = CURRENT_DATE - INTERVAL '1 day' THEN 'yesterday'
    WHEN j.schedule_date > CURRENT_DATE AND j.schedule_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'this_week'
    WHEN j.schedule_date < CURRENT_DATE THEN 'past'
    ELSE 'future'
  END as schedule_status,
  COUNT(a.id) as assignment_count
FROM jobs j
LEFT JOIN assignments a ON j.id = a.job_id
GROUP BY j.id;

-- View for resource availability summary
CREATE OR REPLACE VIEW resource_availability_summary AS
SELECT 
  r.id,
  r.name,
  r.type,
  ra.start_date,
  ra.end_date,
  ra.availability_type,
  ra.notes
FROM resources r
LEFT JOIN resource_availability ra ON r.id = ra.resource_id
WHERE ra.end_date >= CURRENT_DATE OR ra.end_date IS NULL;

-- Add comments for documentation
COMMENT ON TABLE schedules IS 'Manages multi-day construction schedules';
COMMENT ON TABLE schedule_templates IS 'Reusable job templates for quick scheduling';
COMMENT ON TABLE resource_availability IS 'Tracks when resources are available or unavailable';
COMMENT ON TABLE recurring_job_patterns IS 'Defines patterns for automatically recurring jobs';

COMMENT ON COLUMN jobs.schedule_date IS 'The date this job is scheduled for';
COMMENT ON COLUMN jobs.recurrence_pattern IS 'JSON object defining recurrence rules';
COMMENT ON COLUMN jobs.is_template IS 'Whether this job is a template for creating other jobs';
COMMENT ON COLUMN jobs.original_job_id IS 'Reference to the template job this was created from';

-- Grant permissions (these are safe to run multiple times)
DO $$ 
BEGIN
    -- Grant permissions on new tables
    GRANT ALL ON schedules TO authenticated;
    GRANT ALL ON schedule_templates TO authenticated;
    GRANT ALL ON schedule_jobs TO authenticated;
    GRANT ALL ON resource_availability TO authenticated;
    GRANT ALL ON recurring_job_patterns TO authenticated;
    GRANT ALL ON scheduled_jobs_view TO authenticated;
    GRANT ALL ON resource_availability_summary TO authenticated;
EXCEPTION WHEN others THEN
    -- Continue if permissions already exist
    NULL;
END $$;

-- Success message
SELECT 'Migration completed successfully!' as status;