# Comprehensive People Database Design

## Overview
This database design provides a robust, scalable foundation for managing people and their associated information in a project management system. The schema follows best practices for data normalization, security, and performance.

## Database Schema

### Core Tables

#### 1. People Table
```sql
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    preferred_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    date_of_birth DATE,
    gender VARCHAR(20),
    nationality VARCHAR(100),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(100),
    profile_photo_url TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES people(id),
    updated_by UUID REFERENCES people(id)
);

-- Indexes for performance
CREATE INDEX idx_people_email ON people(email);
CREATE INDEX idx_people_employee_id ON people(employee_id);
CREATE INDEX idx_people_last_name ON people(last_name);
CREATE INDEX idx_people_active ON people(is_active);
CREATE INDEX idx_people_created_at ON people(created_at);

-- Full-text search index
CREATE INDEX idx_people_search ON people USING gin(
    to_tsvector('english', 
        coalesce(first_name, '') || ' ' || 
        coalesce(middle_name, '') || ' ' || 
        coalesce(last_name, '') || ' ' || 
        coalesce(preferred_name, '') || ' ' || 
        coalesce(employee_id, '')
    )
);
```

#### 2. Phone Numbers Table
```sql
CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    phone_type VARCHAR(20) DEFAULT 'mobile' CHECK (phone_type IN ('mobile', 'home', 'work', 'fax', 'other')),
    country_code VARCHAR(5) DEFAULT '+1',
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_phone_numbers_person_id ON phone_numbers(person_id);
CREATE INDEX idx_phone_numbers_primary ON phone_numbers(person_id, is_primary) WHERE is_primary = true;
CREATE UNIQUE INDEX idx_phone_numbers_unique_primary ON phone_numbers(person_id) WHERE is_primary = true;

-- Constraint to ensure only one primary phone per person
CREATE OR REPLACE FUNCTION enforce_single_primary_phone()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE phone_numbers 
        SET is_primary = false 
        WHERE person_id = NEW.person_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_primary_phone
    BEFORE INSERT OR UPDATE ON phone_numbers
    FOR EACH ROW EXECUTE FUNCTION enforce_single_primary_phone();
```

#### 3. Addresses Table
```sql
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    address_type VARCHAR(20) DEFAULT 'home' CHECK (address_type IN ('home', 'work', 'mailing', 'billing', 'other')),
    street_address_1 VARCHAR(255) NOT NULL,
    street_address_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United States',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_addresses_person_id ON addresses(person_id);
CREATE INDEX idx_addresses_primary ON addresses(person_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_addresses_location ON addresses USING gist(point(longitude, latitude)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE UNIQUE INDEX idx_addresses_unique_primary ON addresses(person_id) WHERE is_primary = true;

-- Constraint for single primary address
CREATE OR REPLACE FUNCTION enforce_single_primary_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE addresses 
        SET is_primary = false 
        WHERE person_id = NEW.person_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_primary_address
    BEFORE INSERT OR UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION enforce_single_primary_address();
```

#### 4. Professional Information Table
```sql
CREATE TABLE professional_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    job_title VARCHAR(200),
    department VARCHAR(100),
    manager_id UUID REFERENCES people(id),
    hire_date DATE,
    termination_date DATE,
    employment_status VARCHAR(50) DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'terminated', 'on_leave', 'contractor')),
    pay_grade VARCHAR(20),
    union_member BOOLEAN DEFAULT false,
    union_local VARCHAR(100),
    seniority_date DATE,
    work_location VARCHAR(200),
    shift_preference VARCHAR(20) DEFAULT 'day' CHECK (shift_preference IN ('day', 'night', 'both', 'flexible')),
    overtime_eligible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_professional_person_id ON professional_info(person_id);
CREATE INDEX idx_professional_manager ON professional_info(manager_id);
CREATE INDEX idx_professional_department ON professional_info(department);
CREATE INDEX idx_professional_status ON professional_info(employment_status);
CREATE INDEX idx_professional_hire_date ON professional_info(hire_date);

-- Unique constraint for one professional record per person
CREATE UNIQUE INDEX idx_professional_unique_person ON professional_info(person_id);
```

#### 5. Certifications Table
```sql
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    issuing_authority VARCHAR(200),
    category VARCHAR(100),
    is_required_renewal BOOLEAN DEFAULT true,
    renewal_period_months INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Base certifications data
INSERT INTO certifications (name, description, issuing_authority, category, renewal_period_months) VALUES
('CDL Class A', 'Commercial Driver License Class A', 'DMV', 'Driving', 48),
('CDL Class B', 'Commercial Driver License Class B', 'DMV', 'Driving', 48),
('HAZMAT Endorsement', 'Hazardous Materials Transportation', 'DMV', 'Safety', 24),
('OSHA 10-Hour', 'OSHA 10-Hour Safety Training', 'OSHA', 'Safety', 36),
('OSHA 30-Hour', 'OSHA 30-Hour Safety Training', 'OSHA', 'Safety', 36),
('First Aid/CPR', 'First Aid and CPR Certification', 'Red Cross', 'Medical', 24),
('Crane Operator', 'Mobile Crane Operator Certification', 'NCCCO', 'Equipment', 60),
('Forklift Operator', 'Forklift Operation Certification', 'OSHA', 'Equipment', 36);

CREATE INDEX idx_certifications_name ON certifications(name);
CREATE INDEX idx_certifications_category ON certifications(category);
```

#### 6. Person Certifications Junction Table
```sql
CREATE TABLE person_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
    certification_number VARCHAR(100),
    issue_date DATE NOT NULL,
    expiration_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'revoked')),
    issuing_office VARCHAR(200),
    renewal_reminder_sent BOOLEAN DEFAULT false,
    document_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_person_certifications_person_id ON person_certifications(person_id);
CREATE INDEX idx_person_certifications_cert_id ON person_certifications(certification_id);
CREATE INDEX idx_person_certifications_expiration ON person_certifications(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX idx_person_certifications_status ON person_certifications(status);

-- Unique constraint for one certification per person
CREATE UNIQUE INDEX idx_person_certifications_unique ON person_certifications(person_id, certification_id);
```

#### 7. Skills Table
```sql
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100),
    skill_level_required VARCHAR(50) DEFAULT 'basic' CHECK (skill_level_required IN ('basic', 'intermediate', 'advanced', 'expert')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Equipment operation skills
INSERT INTO skills (name, description, category) VALUES
('Paver Operation', 'Asphalt paver operation and control', 'Equipment'),
('Roller Operation', 'Compaction roller operation', 'Equipment'),
('Excavator Operation', 'Hydraulic excavator operation', 'Equipment'),
('Skid Steer Operation', 'Skid steer loader operation', 'Equipment'),
('Milling Machine Operation', 'Cold milling machine operation', 'Equipment'),
('Dozer Operation', 'Bulldozer operation and grading', 'Equipment'),
('Grader Operation', 'Motor grader operation', 'Equipment'),
('Sweeper Operation', 'Street sweeper operation', 'Equipment'),
('Truck Driving', 'Commercial truck driving', 'Driving'),
('Heavy Vehicle Operation', '10-Wheel truck and heavy equipment transport', 'Driving'),
('Screwman Work', 'Specialized paving screwman skills', 'Physical'),
('Groundman Work', 'Milling machine ground support', 'Physical'),
('Asphalt Raking', 'Manual asphalt raking and finishing', 'Physical'),
('Material Handling', 'Construction material handling and placement', 'Physical'),
('Safety Management', 'Site safety coordination and enforcement', 'Management'),
('Quality Control', 'Construction quality assurance and testing', 'Technical'),
('Survey Work', 'Construction surveying and layout', 'Technical'),
('Equipment Maintenance', 'Heavy equipment maintenance and repair', 'Technical');

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);
```

#### 8. Person Skills Junction Table
```sql
CREATE TABLE person_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(50) DEFAULT 'basic' CHECK (proficiency_level IN ('basic', 'intermediate', 'advanced', 'expert')),
    years_experience INTEGER,
    last_used_date DATE,
    assessment_date DATE,
    assessor_id UUID REFERENCES people(id),
    certification_required BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_person_skills_person_id ON person_skills(person_id);
CREATE INDEX idx_person_skills_skill_id ON person_skills(skill_id);
CREATE INDEX idx_person_skills_proficiency ON person_skills(proficiency_level);
CREATE UNIQUE INDEX idx_person_skills_unique ON person_skills(person_id, skill_id);
```

#### 9. Projects Table
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    project_number VARCHAR(100) UNIQUE,
    description TEXT,
    client_name VARCHAR(255),
    project_manager_id UUID REFERENCES people(id),
    start_date DATE,
    end_date DATE,
    estimated_end_date DATE,
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    budget DECIMAL(15,2),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    location_address TEXT,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_projects_manager ON projects(project_manager_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX idx_projects_location ON projects USING gist(point(location_longitude, location_latitude)) WHERE location_latitude IS NOT NULL;
```

#### 10. Project Assignments Table
```sql
CREATE TABLE project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    assignment_type VARCHAR(50) DEFAULT 'temporary' CHECK (assignment_type IN ('permanent', 'temporary', 'contractor', 'consultant')),
    start_date DATE NOT NULL,
    end_date DATE,
    allocation_percentage INTEGER DEFAULT 100 CHECK (allocation_percentage BETWEEN 1 AND 100),
    hourly_rate DECIMAL(10,2),
    is_lead BOOLEAN DEFAULT false,
    responsibilities TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_project_assignments_person ON project_assignments(person_id);
CREATE INDEX idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_dates ON project_assignments(start_date, end_date);
CREATE INDEX idx_project_assignments_active ON project_assignments(person_id, project_id) WHERE end_date IS NULL OR end_date > CURRENT_DATE;
```

#### 11. Audit Trail Table
```sql
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    changed_by UUID REFERENCES people(id),
    change_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Indexes for audit queries
CREATE INDEX idx_audit_trail_table_record ON audit_trail(table_name, record_id);
CREATE INDEX idx_audit_trail_changed_by ON audit_trail(changed_by);
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX idx_audit_trail_action ON audit_trail(action);
```

#### 12. Document Storage Table
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    document_date DATE,
    expiration_date DATE,
    is_confidential BOOLEAN DEFAULT false,
    access_level VARCHAR(50) DEFAULT 'standard' CHECK (access_level IN ('public', 'standard', 'confidential', 'restricted')),
    uploaded_by UUID REFERENCES people(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_documents_person_id ON documents(person_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_expiration ON documents(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX idx_documents_access_level ON documents(access_level);
```

### Utility Functions

#### 1. Updated At Trigger Function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phone_numbers_updated_at BEFORE UPDATE ON phone_numbers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_professional_info_updated_at BEFORE UPDATE ON professional_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_person_certifications_updated_at BEFORE UPDATE ON person_certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_person_skills_updated_at BEFORE UPDATE ON person_skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_assignments_updated_at BEFORE UPDATE ON project_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 2. Audit Trail Trigger Function
```sql
CREATE OR REPLACE FUNCTION create_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT[] := '{}';
    field_name TEXT;
BEGIN
    -- For INSERT operations
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_trail (
            table_name, 
            record_id, 
            action, 
            new_values, 
            changed_by
        ) VALUES (
            TG_TABLE_NAME, 
            NEW.id, 
            'INSERT', 
            to_jsonb(NEW), 
            COALESCE(NEW.created_by, NEW.updated_by)
        );
        RETURN NEW;
    END IF;

    -- For UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        -- Detect changed fields
        FOR field_name IN SELECT column_name FROM information_schema.columns 
                          WHERE table_name = TG_TABLE_NAME AND table_schema = 'public'
        LOOP
            IF to_jsonb(OLD) ->> field_name IS DISTINCT FROM to_jsonb(NEW) ->> field_name THEN
                changed_fields := array_append(changed_fields, field_name);
            END IF;
        END LOOP;

        IF array_length(changed_fields, 1) > 0 THEN
            INSERT INTO audit_trail (
                table_name, 
                record_id, 
                action, 
                old_values, 
                new_values, 
                changed_fields, 
                changed_by
            ) VALUES (
                TG_TABLE_NAME, 
                NEW.id, 
                'UPDATE', 
                to_jsonb(OLD), 
                to_jsonb(NEW), 
                changed_fields, 
                COALESCE(NEW.updated_by, NEW.created_by)
            );
        END IF;
        RETURN NEW;
    END IF;

    -- For DELETE operations
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_trail (
            table_name, 
            record_id, 
            action, 
            old_values
        ) VALUES (
            TG_TABLE_NAME, 
            OLD.id, 
            'DELETE', 
            to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to main tables
CREATE TRIGGER audit_people_trigger AFTER INSERT OR UPDATE OR DELETE ON people FOR EACH ROW EXECUTE FUNCTION create_audit_trail();
CREATE TRIGGER audit_professional_info_trigger AFTER INSERT OR UPDATE OR DELETE ON professional_info FOR EACH ROW EXECUTE FUNCTION create_audit_trail();
CREATE TRIGGER audit_project_assignments_trigger AFTER INSERT OR UPDATE OR DELETE ON project_assignments FOR EACH ROW EXECUTE FUNCTION create_audit_trail();
```

### Views for Common Queries

#### 1. Complete Person Information View
```sql
CREATE VIEW v_people_complete AS
SELECT 
    p.id,
    p.employee_id,
    p.first_name,
    p.middle_name,
    p.last_name,
    p.preferred_name,
    COALESCE(p.preferred_name, p.first_name || ' ' || p.last_name) AS display_name,
    p.email,
    p.date_of_birth,
    p.gender,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.emergency_contact_relationship,
    p.is_active,
    pi.job_title,
    pi.department,
    pi.employment_status,
    pi.hire_date,
    pi.union_member,
    pi.shift_preference,
    -- Primary phone number
    ph.phone_number AS primary_phone,
    ph.phone_type AS primary_phone_type,
    -- Primary address
    a.street_address_1 || COALESCE(', ' || a.street_address_2, '') AS primary_address,
    a.city || ', ' || a.state_province || ' ' || a.postal_code AS primary_city_state_zip,
    a.latitude AS primary_latitude,
    a.longitude AS primary_longitude,
    -- Counts
    (SELECT count(*) FROM phone_numbers WHERE person_id = p.id) AS total_phone_numbers,
    (SELECT count(*) FROM addresses WHERE person_id = p.id) AS total_addresses,
    (SELECT count(*) FROM person_certifications WHERE person_id = p.id AND status = 'active') AS active_certifications,
    (SELECT count(*) FROM person_skills WHERE person_id = p.id) AS total_skills,
    p.created_at,
    p.updated_at
FROM people p
LEFT JOIN professional_info pi ON p.id = pi.person_id
LEFT JOIN phone_numbers ph ON p.id = ph.person_id AND ph.is_primary = true
LEFT JOIN addresses a ON p.id = a.person_id AND a.is_primary = true;
```

#### 2. Active Project Assignments View
```sql
CREATE VIEW v_active_assignments AS
SELECT 
    pa.id,
    pa.person_id,
    p.first_name || ' ' || p.last_name AS person_name,
    p.employee_id,
    pa.project_id,
    pr.name AS project_name,
    pr.project_number,
    pa.role,
    pa.assignment_type,
    pa.start_date,
    pa.end_date,
    pa.allocation_percentage,
    pa.is_lead,
    pr.status AS project_status,
    CASE 
        WHEN pa.end_date IS NULL OR pa.end_date > CURRENT_DATE 
        THEN 'active' 
        ELSE 'completed' 
    END AS assignment_status
FROM project_assignments pa
JOIN people p ON pa.person_id = p.id
JOIN projects pr ON pa.project_id = pr.id
WHERE p.is_active = true
  AND (pa.end_date IS NULL OR pa.end_date > CURRENT_DATE);
```

#### 3. Certification Status View
```sql
CREATE VIEW v_certification_status AS
SELECT 
    pc.person_id,
    p.first_name || ' ' || p.last_name AS person_name,
    c.name AS certification_name,
    c.category,
    pc.issue_date,
    pc.expiration_date,
    pc.status,
    CASE 
        WHEN pc.expiration_date IS NULL THEN 'no_expiration'
        WHEN pc.expiration_date < CURRENT_DATE THEN 'expired'
        WHEN pc.expiration_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'valid'
    END AS expiration_status,
    pc.certification_number
FROM person_certifications pc
JOIN people p ON pc.person_id = p.id
JOIN certifications c ON pc.certification_id = c.id
WHERE p.is_active = true;
```

### Security and Access Control

#### Row Level Security (RLS) Policies
```sql
-- Enable RLS on all tables
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- People table policies
CREATE POLICY "Users can read all people profiles" ON people
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON people
    FOR UPDATE TO authenticated 
    USING (auth.uid()::text = id::text);

CREATE POLICY "HR and managers can update all profiles" ON people
    FOR UPDATE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM professional_info 
            WHERE person_id = auth.uid()::text::uuid 
            AND (
                job_title ILIKE '%hr%' OR 
                job_title ILIKE '%manager%' OR 
                job_title ILIKE '%director%' OR
                job_title ILIKE '%admin%'
            )
        )
    );

-- Contact information policies
CREATE POLICY "Users can manage their own contact info" ON phone_numbers
    FOR ALL TO authenticated 
    USING (person_id = auth.uid()::text::uuid);

CREATE POLICY "Users can manage their own addresses" ON addresses
    FOR ALL TO authenticated 
    USING (person_id = auth.uid()::text::uuid);

-- Professional info policies
CREATE POLICY "Users can read all professional info" ON professional_info
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own professional info" ON professional_info
    FOR UPDATE TO authenticated 
    USING (person_id = auth.uid()::text::uuid);

-- Project assignment policies
CREATE POLICY "Users can read assignments they're involved in" ON project_assignments
    FOR SELECT TO authenticated 
    USING (
        person_id = auth.uid()::text::uuid OR 
        project_id IN (
            SELECT project_id FROM project_assignments 
            WHERE person_id = auth.uid()::text::uuid AND is_lead = true
        )
    );

-- Documents policies  
CREATE POLICY "Users can manage their own documents" ON documents
    FOR ALL TO authenticated 
    USING (person_id = auth.uid()::text::uuid);

CREATE POLICY "HR can access all non-confidential documents" ON documents
    FOR SELECT TO authenticated 
    USING (
        is_confidential = false OR 
        person_id = auth.uid()::text::uuid OR
        EXISTS (
            SELECT 1 FROM professional_info 
            WHERE person_id = auth.uid()::text::uuid 
            AND job_title ILIKE '%hr%'
        )
    );
```

### Sample Queries

#### 1. Get Complete Person Profile
```sql
SELECT * FROM v_people_complete 
WHERE id = $1;
```

#### 2. Search People
```sql
SELECT 
    id,
    display_name,
    email,
    primary_phone,
    job_title,
    department,
    employment_status
FROM v_people_complete 
WHERE to_tsvector('english', 
    coalesce(first_name, '') || ' ' || 
    coalesce(middle_name, '') || ' ' || 
    coalesce(last_name, '') || ' ' || 
    coalesce(preferred_name, '') || ' ' || 
    coalesce(employee_id, '') || ' ' || 
    coalesce(job_title, '') || ' ' || 
    coalesce(department, '')
) @@ plainto_tsquery('english', $1)
AND is_active = true
ORDER BY display_name;
```

#### 3. Get People by Skills
```sql
SELECT DISTINCT
    p.id,
    p.first_name || ' ' || p.last_name AS name,
    p.email,
    ps.proficiency_level,
    ps.years_experience
FROM people p
JOIN person_skills ps ON p.id = ps.person_id
JOIN skills s ON ps.skill_id = s.id
WHERE s.name = $1
  AND p.is_active = true
  AND ps.proficiency_level IN ('intermediate', 'advanced', 'expert')
ORDER BY 
    CASE ps.proficiency_level 
        WHEN 'expert' THEN 1 
        WHEN 'advanced' THEN 2 
        WHEN 'intermediate' THEN 3 
        ELSE 4 
    END,
    ps.years_experience DESC NULLS LAST;
```

#### 4. Get Expiring Certifications
```sql
SELECT 
    p.first_name || ' ' || p.last_name AS person_name,
    p.email,
    ph.phone_number,
    c.name AS certification_name,
    pc.expiration_date,
    pc.expiration_date - CURRENT_DATE AS days_until_expiry
FROM person_certifications pc
JOIN people p ON pc.person_id = p.id
JOIN certifications c ON pc.certification_id = c.id
LEFT JOIN phone_numbers ph ON p.id = ph.person_id AND ph.is_primary = true
WHERE pc.status = 'active'
  AND pc.expiration_date IS NOT NULL
  AND pc.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
  AND p.is_active = true
ORDER BY pc.expiration_date;
```

#### 5. Get Project Team Members
```sql
SELECT 
    p.id,
    p.first_name || ' ' || p.last_name AS name,
    p.email,
    ph.phone_number,
    pa.role,
    pa.allocation_percentage,
    pa.is_lead,
    pa.start_date,
    pa.end_date
FROM project_assignments pa
JOIN people p ON pa.person_id = p.id
LEFT JOIN phone_numbers ph ON p.id = ph.person_id AND ph.is_primary = true
WHERE pa.project_id = $1
  AND (pa.end_date IS NULL OR pa.end_date > CURRENT_DATE)
  AND p.is_active = true
ORDER BY pa.is_lead DESC, pa.start_date;
```

#### 6. Get Available People for Assignment
```sql
WITH current_allocations AS (
    SELECT 
        person_id,
        SUM(allocation_percentage) AS total_allocation
    FROM project_assignments
    WHERE (end_date IS NULL OR end_date > CURRENT_DATE)
      AND start_date <= CURRENT_DATE
    GROUP BY person_id
)
SELECT 
    p.id,
    p.first_name || ' ' || p.last_name AS name,
    p.email,
    pi.job_title,
    pi.department,
    COALESCE(ca.total_allocation, 0) AS current_allocation,
    100 - COALESCE(ca.total_allocation, 0) AS available_allocation
FROM people p
LEFT JOIN professional_info pi ON p.id = pi.person_id
LEFT JOIN current_allocations ca ON p.id = ca.person_id
WHERE p.is_active = true
  AND pi.employment_status = 'active'
  AND COALESCE(ca.total_allocation, 0) < 100
ORDER BY available_allocation DESC, p.last_name;
```

## Entity Relationship Description

### Core Relationships:
1. **People** (1) → (0..n) **Phone Numbers**
2. **People** (1) → (0..n) **Addresses** 
3. **People** (1) → (0..1) **Professional Info**
4. **People** (n) ↔ (n) **Certifications** (via person_certifications)
5. **People** (n) ↔ (n) **Skills** (via person_skills)
6. **People** (n) ↔ (n) **Projects** (via project_assignments)
7. **People** (1) → (0..n) **Documents**
8. **Projects** (1) → (n) **Project Assignments**

### Key Design Decisions:

1. **UUID Primary Keys**: Ensures global uniqueness and better security
2. **Separate Contact Tables**: Allows multiple phone numbers and addresses per person
3. **Junction Tables**: Proper many-to-many relationships for skills and certifications
4. **Audit Trail**: Complete change tracking for compliance and debugging
5. **Soft Deletes**: Uses `is_active` flags instead of hard deletes
6. **Flexible Professional Info**: Accommodates various employment types
7. **Document Management**: Secure document storage with access controls
8. **Geographic Support**: Latitude/longitude for location-based queries

### Performance Optimizations:

1. **Strategic Indexing**: Indexes on frequently queried fields
2. **Composite Indexes**: Multi-column indexes for complex queries
3. **Partial Indexes**: Indexes with WHERE clauses for specific use cases
4. **GiST Indexes**: Spatial indexes for geographic queries
5. **Full-text Search**: Advanced text search capabilities
6. **Materialized Views**: For complex reporting queries (can be added as needed)

### Security Features:

1. **Row Level Security**: Fine-grained access control
2. **Role-based Permissions**: Different access levels for different user types
3. **Audit Logging**: Complete change tracking
4. **Data Classification**: Confidentiality levels for sensitive information
5. **IP and Session Tracking**: Security monitoring capabilities

This database design provides a solid foundation for comprehensive people management with room for future expansion and customization based on specific project requirements.