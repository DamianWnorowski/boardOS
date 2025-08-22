/*
  # Workforce Management Database Schema

  1. New Tables
    - `users` - Extended user profiles with roles and certifications
    - `resources` - Individual resources (magnets) including personnel, equipment, vehicles
    - `jobs` - Job details and configuration
    - `assignments` - Resource assignments to jobs with hierarchical attachments
    - `magnet_interaction_rules` - Rules for how different magnet types can interact
    - `drop_rules` - Rules for what can be dropped into which row
    - `job_row_configs` - Job-specific row layout configurations
    - `audit_logs` - Comprehensive audit trail for all changes

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Protect audit logs from direct modification

  3. Performance
    - Add indexes for frequently queried columns
    - Include triggers for automatic timestamp updates
    - Optimize for real-time subscriptions
*/

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE resource_type AS ENUM (
    'operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver',
    'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader',
    'dozer', 'payloader', 'roller', 'equipment', 'truck'
);

CREATE TYPE row_type AS ENUM (
    'Forman', 'Equipment', 'Sweeper', 'Tack', 'MPT', 'crew', 'trucks'
);

-- 1. Users/Employees (Personnel Profiles)
-- This table extends Supabase's built-in auth.users table
CREATE TABLE public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    role TEXT NOT NULL DEFAULT 'laborer',
    certifications JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Resources (Magnet Instances)
CREATE TABLE public.resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type resource_type NOT NULL,
    name TEXT NOT NULL,
    identifier TEXT,
    model TEXT,
    vin TEXT,
    location TEXT,
    on_site BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Jobs
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    job_number TEXT,
    type TEXT NOT NULL DEFAULT 'paving',
    shift TEXT NOT NULL DEFAULT 'day',
    notes TEXT,
    start_time TEXT DEFAULT '07:00',
    finalized BOOLEAN DEFAULT FALSE,
    plants JSONB DEFAULT '[]'::jsonb,
    location JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Assignments
CREATE TABLE public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    row_type row_type NOT NULL,
    position INTEGER DEFAULT 0,
    attached_to_assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
    time_slot JSONB DEFAULT '{"startTime": "07:00", "endTime": "15:30", "isFullDay": true}'::jsonb,
    note TEXT,
    truck_config TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Magnet Interaction Rules
CREATE TABLE public.magnet_interaction_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type resource_type NOT NULL,
    target_type resource_type NOT NULL,
    can_attach BOOLEAN NOT NULL DEFAULT TRUE,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    max_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_type, target_type)
);

-- 6. Drop Rules
CREATE TABLE public.drop_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    row_type row_type NOT NULL UNIQUE,
    allowed_types resource_type[] NOT NULL DEFAULT '{}'::resource_type[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Job Row Configurations
CREATE TABLE public.job_row_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    row_type row_type NOT NULL,
    is_split BOOLEAN NOT NULL DEFAULT FALSE,
    boxes JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (job_id, row_type)
);

-- 8. Audit Logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    change_details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Truck Driver Assignments (Many-to-many relationship)
CREATE TABLE public.truck_driver_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    truck_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (truck_id, driver_id)
);

-- Performance Indexes
CREATE INDEX idx_resources_type ON public.resources (type);
CREATE INDEX idx_resources_user_id ON public.resources (user_id);
CREATE INDEX idx_jobs_type_shift ON public.jobs (type, shift);
CREATE INDEX idx_assignments_resource_job_row ON public.assignments (resource_id, job_id, row_type);
CREATE INDEX idx_assignments_attached_to ON public.assignments (attached_to_assignment_id);
CREATE INDEX idx_assignments_job_id ON public.assignments (job_id);
CREATE INDEX idx_magnet_rules_source_target ON public.magnet_interaction_rules (source_type, target_type);
CREATE INDEX idx_audit_logs_user_action_entity ON public.audit_logs (user_id, action, entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX idx_job_row_configs_job_row ON public.job_row_configs (job_id, row_type);
CREATE INDEX idx_truck_driver_assignments_truck ON public.truck_driver_assignments (truck_id);
CREATE INDEX idx_truck_driver_assignments_driver ON public.truck_driver_assignments (driver_id);

-- Trigger function to update 'updated_at' timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables that need updated_at tracking
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON public.resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_magnet_rules_updated_at
    BEFORE UPDATE ON public.magnet_interaction_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drop_rules_updated_at
    BEFORE UPDATE ON public.drop_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_row_configs_updated_at
    BEFORE UPDATE ON public.job_row_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magnet_interaction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_row_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_driver_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can read all user profiles"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Resources policies
CREATE POLICY "Authenticated users can read resources"
    ON public.resources
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Foremen and admins can modify resources"
    ON public.resources
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('foreman', 'admin')
        )
    );

-- Jobs policies
CREATE POLICY "Authenticated users can read jobs"
    ON public.jobs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Foremen and admins can modify jobs"
    ON public.jobs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('foreman', 'admin')
        )
    );

-- Assignments policies
CREATE POLICY "Authenticated users can read assignments"
    ON public.assignments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Foremen and admins can modify assignments"
    ON public.assignments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('foreman', 'admin')
        )
    );

-- Rules policies (read-only for most users)
CREATE POLICY "Authenticated users can read magnet interaction rules"
    ON public.magnet_interaction_rules
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can modify magnet interaction rules"
    ON public.magnet_interaction_rules
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Authenticated users can read drop rules"
    ON public.drop_rules
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can modify drop rules"
    ON public.drop_rules
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Job row configs policies
CREATE POLICY "Authenticated users can read job row configs"
    ON public.job_row_configs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Foremen and admins can modify job row configs"
    ON public.job_row_configs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('foreman', 'admin')
        )
    );

-- Audit logs policies
CREATE POLICY "Only admins can read audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Prevent direct audit log modification"
    ON public.audit_logs
    FOR ALL
    TO authenticated
    USING (false);

-- Truck driver assignments policies
CREATE POLICY "Authenticated users can read truck driver assignments"
    ON public.truck_driver_assignments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Foremen and admins can modify truck driver assignments"
    ON public.truck_driver_assignments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('foreman', 'admin')
        )
    );