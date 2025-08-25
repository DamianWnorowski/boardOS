/*
  # Split Resources by Class Type

  1. New Tables
    - `employees` table for personnel with phone, skills, certifications, etc.
    - `equipment` table for machinery with model, year, vin, maintenance info, etc.
  2. Data Migration
    - Migrate existing employee resources to employees table
    - Migrate existing equipment resources to equipment table  
  3. Security
    - Enable RLS on both new tables
    - Add policies for authenticated users
  4. Indexes
    - Add performance indexes for common queries
*/

-- Create employees table for personnel
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type resource_type NOT NULL CHECK (type IN ('operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver')),
  name text NOT NULL,
  employee_id text UNIQUE,
  phone_number text,
  emergency_contact_name text,
  emergency_contact_phone text,
  email text,
  address text,
  hire_date date,
  role text DEFAULT 'laborer',
  certifications jsonb DEFAULT '[]'::jsonb,
  skills jsonb DEFAULT '[]'::jsonb,
  permissions jsonb DEFAULT '[]'::jsonb,
  performance_reviews jsonb DEFAULT '[]'::jsonb,
  training_records jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create equipment table for machinery and vehicles
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type resource_type NOT NULL CHECK (type IN ('skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck')),
  name text NOT NULL,
  identifier text, -- Unit number
  model text,
  make text,
  year integer,
  vin text,
  serial_number text,
  location text,
  on_site boolean DEFAULT false,
  acquisition_date date,
  purchase_price decimal(15,2),
  current_value decimal(15,2),
  fuel_type text,
  engine_hours integer DEFAULT 0,
  last_maintenance_date date,
  next_maintenance_date date,
  maintenance_notes text,
  insurance_policy text,
  registration_expiry date,
  inspection_date date,
  is_operational boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migrate existing employee data from resources
INSERT INTO employees (
  id,
  type,
  name,
  employee_id,
  phone_number,
  email,
  role,
  certifications,
  skills,
  permissions,
  is_active,
  created_at,
  updated_at
)
SELECT 
  id,
  type::resource_type,
  name,
  identifier as employee_id,
  null as phone_number, -- Will be populated later
  null as email, -- Will be populated later  
  type as role,
  '[]'::jsonb as certifications,
  '[]'::jsonb as skills,
  '[]'::jsonb as permissions,
  true as is_active,
  created_at,
  updated_at
FROM resources 
WHERE class_type = 'employee'
ON CONFLICT (id) DO NOTHING;

-- Migrate existing equipment data from resources
INSERT INTO equipment (
  id,
  type,
  name,
  identifier,
  model,
  vin,
  location,
  on_site,
  is_operational,
  is_active,
  created_at,
  updated_at
)
SELECT 
  id,
  type::resource_type,
  name,
  identifier,
  model,
  vin,
  location,
  on_site,
  true as is_operational,
  true as is_active,
  created_at,
  updated_at
FROM resources 
WHERE class_type = 'equipment'
ON CONFLICT (id) DO NOTHING;

-- Create view to maintain compatibility with existing code
CREATE OR REPLACE VIEW resources_unified AS
SELECT 
  id,
  type,
  'employee'::resource_class_type as class_type,
  name,
  employee_id as identifier,
  null as model,
  null as vin,
  null as location,
  false as on_site,
  null as user_id,
  created_at,
  updated_at
FROM employees
WHERE is_active = true

UNION ALL

SELECT 
  id,
  type,
  'equipment'::resource_class_type as class_type,
  name,
  identifier,
  model,
  vin,
  location,
  on_site,
  null as user_id,
  created_at,
  updated_at
FROM equipment
WHERE is_active = true;

-- Enable RLS on new tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Policies for employees table
CREATE POLICY "All authenticated users can read employees" ON employees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can modify employees" ON employees
  FOR ALL TO authenticated USING (true);

-- Policies for equipment table  
CREATE POLICY "All authenticated users can read equipment" ON equipment
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated users can modify equipment" ON equipment
  FOR ALL TO authenticated USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_type ON employees(type);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone_number);

CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type);
CREATE INDEX IF NOT EXISTS idx_equipment_identifier ON equipment(identifier);
CREATE INDEX IF NOT EXISTS idx_equipment_location ON equipment(location);
CREATE INDEX IF NOT EXISTS idx_equipment_on_site ON equipment(on_site);
CREATE INDEX IF NOT EXISTS idx_equipment_active ON equipment(is_active);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at 
  BEFORE UPDATE ON employees 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at 
  BEFORE UPDATE ON equipment 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit triggers for new tables
CREATE TRIGGER employees_audit_trigger 
  AFTER INSERT OR DELETE OR UPDATE ON employees 
  FOR EACH ROW EXECUTE FUNCTION audit_resources_changes();

CREATE TRIGGER equipment_audit_trigger 
  AFTER INSERT OR DELETE OR UPDATE ON equipment 
  FOR EACH ROW EXECUTE FUNCTION audit_resources_changes();