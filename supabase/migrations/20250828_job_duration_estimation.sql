-- Add duration estimation fields to jobs table
-- This migration adds multi-day job planning with phase support

-- Add new fields to jobs table for duration estimation
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS estimated_sqyards DECIMAL,
ADD COLUMN IF NOT EXISTS estimated_tons DECIMAL,
ADD COLUMN IF NOT EXISTS estimated_cubic_yards DECIMAL,
ADD COLUMN IF NOT EXISTS estimated_linear_feet DECIMAL,
ADD COLUMN IF NOT EXISTS complexity_factor DECIMAL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS job_category TEXT CHECK (job_category IN ('highway', 'parking_lot', 'residential', 'commercial', 'municipal')),
ADD COLUMN IF NOT EXISTS actual_start_date DATE,
ADD COLUMN IF NOT EXISTS actual_end_date DATE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_end_date ON jobs(end_date);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(job_category);
CREATE INDEX IF NOT EXISTS idx_jobs_date_range ON jobs(schedule_date, end_date);

-- Create job_phases table for multi-phase jobs (like drainage: excavation -> drainage -> concrete)
CREATE TABLE IF NOT EXISTS job_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  phase_type TEXT NOT NULL CHECK (phase_type IN ('milling', 'paving', 'excavation', 'drainage', 'concrete', 'prep', 'finishing')),
  estimated_start DATE NOT NULL,
  estimated_end DATE NOT NULL,
  actual_start DATE,
  actual_end DATE,
  daily_target DECIMAL NOT NULL,
  daily_unit TEXT NOT NULL CHECK (daily_unit IN ('sqyards', 'tons', 'cubic_yards', 'linear_feet')),
  sequence_order INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, sequence_order)
);

-- Add indexes for job phases
CREATE INDEX IF NOT EXISTS idx_job_phases_job_id ON job_phases(job_id);
CREATE INDEX IF NOT EXISTS idx_job_phases_dates ON job_phases(estimated_start, estimated_end);
CREATE INDEX IF NOT EXISTS idx_job_phases_sequence ON job_phases(job_id, sequence_order);

-- Create production_rates table for configurable base rates
CREATE TABLE IF NOT EXISTS production_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type TEXT NOT NULL UNIQUE CHECK (rate_type IN (
    'milling', 'paving_highway', 'paving_parking_lot', 'paving_residential', 
    'excavation', 'drainage', 'concrete'
  )),
  rate_per_day DECIMAL NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('sqyards', 'tons', 'cubic_yards', 'linear_feet')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default production rates
INSERT INTO production_rates (rate_type, rate_per_day, unit, description) VALUES
('milling', 22000, 'sqyards', 'Standard milling rate per day'),
('paving_highway', 2000, 'tons', 'Highway paving rate per day'),
('paving_parking_lot', 800, 'tons', 'Parking lot paving rate (slower due to complexity)'),
('paving_residential', 1500, 'tons', 'Residential paving rate per day'),
('excavation', 150, 'cubic_yards', 'Standard excavation rate per day'),
('drainage', 300, 'linear_feet', 'Drainage installation rate per day'),
('concrete', 50, 'cubic_yards', 'Concrete placement rate per day')
ON CONFLICT (rate_type) DO NOTHING;

-- Create job_estimates table to store calculated estimates
CREATE TABLE IF NOT EXISTS job_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE UNIQUE,
  total_days INTEGER NOT NULL,
  milling_days INTEGER,
  paving_days INTEGER,
  excavation_days INTEGER,
  drainage_days INTEGER,
  concrete_days INTEGER,
  estimated_start DATE,
  estimated_end DATE,
  calculation_method TEXT DEFAULT 'automated',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for job estimates
CREATE INDEX IF NOT EXISTS idx_job_estimates_job_id ON job_estimates(job_id);
CREATE INDEX IF NOT EXISTS idx_job_estimates_dates ON job_estimates(estimated_start, estimated_end);

-- Create triggers for updated_at columns
CREATE TRIGGER update_job_phases_updated_at BEFORE UPDATE ON job_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_rates_updated_at BEFORE UPDATE ON production_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_estimates_updated_at BEFORE UPDATE ON job_estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create helpful views

-- View for jobs with their duration estimates
CREATE OR REPLACE VIEW jobs_with_estimates AS
SELECT 
  j.*,
  je.total_days,
  je.milling_days,
  je.paving_days,
  je.excavation_days,
  je.drainage_days,
  je.concrete_days,
  je.estimated_start,
  je.estimated_end,
  CASE 
    WHEN j.actual_start_date IS NOT NULL AND j.actual_end_date IS NOT NULL THEN 'completed'
    WHEN j.actual_start_date IS NOT NULL THEN 'in_progress'
    WHEN j.schedule_date IS NOT NULL THEN 'scheduled'
    ELSE 'unscheduled'
  END as job_status,
  CASE 
    WHEN j.actual_start_date IS NOT NULL AND j.actual_end_date IS NOT NULL THEN 
      j.actual_end_date::date - j.actual_start_date::date + 1
    WHEN j.actual_start_date IS NOT NULL THEN 
      CURRENT_DATE - j.actual_start_date::date + 1
    ELSE NULL
  END as actual_days_elapsed
FROM jobs j
LEFT JOIN job_estimates je ON j.id = je.job_id;

-- View for job phases with progress tracking
CREATE OR REPLACE VIEW job_phases_with_progress AS
SELECT 
  jp.*,
  j.name as job_name,
  j.type as job_type,
  CASE 
    WHEN jp.actual_start IS NOT NULL AND jp.actual_end IS NOT NULL THEN 'completed'
    WHEN jp.actual_start IS NOT NULL THEN 'in_progress'
    WHEN jp.estimated_start <= CURRENT_DATE THEN 'ready_to_start'
    ELSE 'future'
  END as phase_status,
  CASE 
    WHEN jp.actual_start IS NOT NULL AND jp.actual_end IS NOT NULL THEN 
      jp.actual_end::date - jp.actual_start::date + 1
    WHEN jp.actual_start IS NOT NULL THEN 
      CURRENT_DATE - jp.actual_start::date + 1
    ELSE NULL
  END as actual_days_elapsed,
  jp.estimated_end::date - jp.estimated_start::date + 1 as estimated_days
FROM job_phases jp
JOIN jobs j ON jp.job_id = j.id;

-- View for monthly job calendar data
CREATE OR REPLACE VIEW monthly_job_calendar AS
SELECT 
  j.id,
  j.name,
  j.type,
  j.job_category,
  j.schedule_date,
  j.end_date,
  j.shift,
  j.finalized,
  je.total_days,
  EXTRACT(YEAR FROM j.schedule_date) as year,
  EXTRACT(MONTH FROM j.schedule_date) as month,
  EXTRACT(DAY FROM j.schedule_date) as start_day,
  EXTRACT(DAY FROM COALESCE(j.end_date, j.schedule_date)) as end_day,
  -- Get assigned foreman
  (
    SELECT r.name 
    FROM assignments a 
    JOIN resources r ON a.resource_id = r.id 
    WHERE a.job_id = j.id AND r.type = 'foreman' 
    LIMIT 1
  ) as foreman_name,
  -- Count of assigned resources
  (
    SELECT COUNT(*) 
    FROM assignments a 
    WHERE a.job_id = j.id
  ) as resource_count
FROM jobs j
LEFT JOIN job_estimates je ON j.id = je.job_id
WHERE j.schedule_date IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE job_phases IS 'Tracks individual phases within multi-phase jobs (e.g., drainage: excavation -> drainage -> concrete)';
COMMENT ON TABLE production_rates IS 'Configurable base production rates for different types of work';
COMMENT ON TABLE job_estimates IS 'Calculated duration estimates for jobs based on scope and production rates';

COMMENT ON COLUMN jobs.end_date IS 'Estimated or actual end date of the job';
COMMENT ON COLUMN jobs.estimated_sqyards IS 'Square yards to be milled';
COMMENT ON COLUMN jobs.estimated_tons IS 'Tons of asphalt to be paved';
COMMENT ON COLUMN jobs.estimated_cubic_yards IS 'Cubic yards of excavation work';
COMMENT ON COLUMN jobs.estimated_linear_feet IS 'Linear feet of drainage work';
COMMENT ON COLUMN jobs.complexity_factor IS 'Multiplier for adjusting standard production rates (0.5-2.0)';
COMMENT ON COLUMN jobs.job_category IS 'Category affecting production rates (highway, parking_lot, etc.)';

-- Grant permissions
GRANT ALL ON job_phases TO authenticated;
GRANT ALL ON production_rates TO authenticated;
GRANT ALL ON job_estimates TO authenticated;
GRANT ALL ON jobs_with_estimates TO authenticated;
GRANT ALL ON job_phases_with_progress TO authenticated;
GRANT ALL ON monthly_job_calendar TO authenticated;