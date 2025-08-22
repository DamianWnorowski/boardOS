/*
  # Seed Initial Data for Workforce Management System

  1. Default Rules
    - Standard magnet interaction rules for construction operations
    - Default drop rules for job rows
    
  2. Sample Data
    - Test users with different roles
    - Resources from existing personnel and equipment data
    - Default job configuration
*/

-- Insert default magnet interaction rules
INSERT INTO public.magnet_interaction_rules (source_type, target_type, can_attach, is_required, max_count) VALUES
-- Equipment operator requirements
('operator', 'paver', TRUE, TRUE, 1),
('operator', 'roller', TRUE, TRUE, 1),
('operator', 'excavator', TRUE, TRUE, 1),
('operator', 'sweeper', TRUE, TRUE, 1),
('operator', 'millingMachine', TRUE, TRUE, 1),
('operator', 'grader', TRUE, TRUE, 1),
('operator', 'dozer', TRUE, TRUE, 1),
('operator', 'payloader', TRUE, TRUE, 1),
('operator', 'skidsteer', TRUE, TRUE, 1),
('operator', 'equipment', TRUE, TRUE, 1),

-- Vehicle driver requirements
('driver', 'truck', TRUE, TRUE, 1),
('privateDriver', 'truck', TRUE, TRUE, 1),

-- Optional laborer attachments
('laborer', 'paver', TRUE, FALSE, 2), -- Screwmen
('laborer', 'millingMachine', TRUE, FALSE, 1), -- Groundman
('laborer', 'truck', TRUE, FALSE, 1); -- Can ride in truck

-- Insert default drop rules
INSERT INTO public.drop_rules (row_type, allowed_types) VALUES
('Forman', '{"foreman"}'),
('Equipment', '{"skidsteer", "paver", "excavator", "sweeper", "millingMachine", "grader", "dozer", "payloader", "roller", "equipment", "operator"}'),
('Sweeper', '{"sweeper", "operator"}'),
('Tack', '{"operator", "laborer", "truck"}'),
('MPT', '{"operator", "laborer", "truck"}'),
('crew', '{"operator", "driver", "striper", "foreman", "laborer", "privateDriver"}'),
('trucks', '{"truck", "driver", "privateDriver"}');

-- Audit trigger function for assignments
CREATE OR REPLACE FUNCTION audit_assignments_changes()
RETURNS TRIGGER AS $$
DECLARE
    _user_id UUID;
    _action TEXT;
    _old_value JSONB;
    _new_value JSONB;
    _change_details JSONB;
BEGIN
    -- Get the user ID from the JWT context (if available)
    BEGIN
        _user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        _user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        _action := 'CREATE_ASSIGNMENT';
        _new_value := to_jsonb(NEW);
        _old_value := NULL;
        _change_details := jsonb_build_object(
            'resource_id', NEW.resource_id,
            'job_id', NEW.job_id,
            'row_type', NEW.row_type
        );
    ELSIF TG_OP = 'UPDATE' THEN
        _action := 'UPDATE_ASSIGNMENT';
        _old_value := to_jsonb(OLD);
        _new_value := to_jsonb(NEW);
        _change_details := jsonb_build_object(
            'resource_id', NEW.resource_id,
            'job_id', NEW.job_id,
            'row_type', NEW.row_type
        );
    ELSIF TG_OP = 'DELETE' THEN
        _action := 'DELETE_ASSIGNMENT';
        _old_value := to_jsonb(OLD);
        _new_value := NULL;
        _change_details := jsonb_build_object(
            'resource_id', OLD.resource_id,
            'job_id', OLD.job_id,
            'row_type', OLD.row_type
        );
    END IF;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, change_details)
    VALUES (_user_id, _action, 'assignment', COALESCE(NEW.id, OLD.id), _old_value, _new_value, _change_details);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger for assignments
CREATE TRIGGER assignments_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.assignments
    FOR EACH ROW EXECUTE FUNCTION audit_assignments_changes();

-- Audit trigger function for jobs
CREATE OR REPLACE FUNCTION audit_jobs_changes()
RETURNS TRIGGER AS $$
DECLARE
    _user_id UUID;
    _action TEXT;
BEGIN
    BEGIN
        _user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        _user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        _action := 'CREATE_JOB';
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
        VALUES (_user_id, _action, 'job', NEW.id, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        _action := 'UPDATE_JOB';
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
        VALUES (_user_id, _action, 'job', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        _action := 'DELETE_JOB';
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value)
        VALUES (_user_id, _action, 'job', OLD.id, to_jsonb(OLD));
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger for jobs
CREATE TRIGGER jobs_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION audit_jobs_changes();

-- Audit trigger function for resources
CREATE OR REPLACE FUNCTION audit_resources_changes()
RETURNS TRIGGER AS $$
DECLARE
    _user_id UUID;
    _action TEXT;
BEGIN
    BEGIN
        _user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        _user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        _action := 'CREATE_RESOURCE';
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
        VALUES (_user_id, _action, 'resource', NEW.id, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        _action := 'UPDATE_RESOURCE';
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
        VALUES (_user_id, _action, 'resource', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        _action := 'DELETE_RESOURCE';
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value)
        VALUES (_user_id, _action, 'resource', OLD.id, to_jsonb(OLD));
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger for resources
CREATE TRIGGER resources_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.resources
    FOR EACH ROW EXECUTE FUNCTION audit_resources_changes();