/*
  # Stored Procedures for Complex Operations

  1. Atomic Operations
    - move_assignment_group_atomic: Safely move groups of assignments
    - validate_assignment_rules: Comprehensive validation function
    
  2. Helper Functions
    - check_time_conflicts: Detect scheduling conflicts
    - get_user_permissions: Get effective permissions for a user
*/

-- Function to atomically move an assignment group
CREATE OR REPLACE FUNCTION move_assignment_group_atomic(
    assignment_ids UUID[],
    target_job_id UUID,
    target_row_type row_type,
    target_position INTEGER DEFAULT 0,
    default_start_time TEXT DEFAULT '07:00'
)
RETURNS TABLE (
    id UUID,
    resource_id UUID,
    job_id UUID,
    row_type row_type,
    position INTEGER,
    attached_to_assignment_id UUID
) AS $$
DECLARE
    old_assignment RECORD;
    new_assignment_id UUID;
    new_assignment_ids UUID[] := '{}';
    attachment_mapping JSONB := '{}';
BEGIN
    -- Get all assignments to move
    FOR old_assignment IN 
        SELECT a.*, r.name as resource_name, r.type as resource_type
        FROM assignments a
        JOIN resources r ON a.resource_id = r.id
        WHERE a.id = ANY(assignment_ids)
        ORDER BY CASE WHEN a.attached_to_assignment_id IS NULL THEN 0 ELSE 1 END
    LOOP
        -- Generate new assignment ID
        new_assignment_id := uuid_generate_v4();
        new_assignment_ids := array_append(new_assignment_ids, new_assignment_id);
        
        -- Create new assignment
        INSERT INTO assignments (
            id,
            resource_id,
            job_id,
            row_type,
            position,
            attached_to_assignment_id,
            time_slot,
            note,
            truck_config
        ) VALUES (
            new_assignment_id,
            old_assignment.resource_id,
            target_job_id,
            target_row_type,
            target_position,
            CASE 
                WHEN old_assignment.attached_to_assignment_id IS NULL THEN NULL
                ELSE (attachment_mapping->old_assignment.attached_to_assignment_id::text)::UUID
            END,
            jsonb_build_object(
                'startTime', default_start_time,
                'endTime', '15:30',
                'isFullDay', true
            ),
            old_assignment.note,
            old_assignment.truck_config
        );
        
        -- Store mapping for attached assignments
        IF old_assignment.attached_to_assignment_id IS NULL THEN
            attachment_mapping := attachment_mapping || jsonb_build_object(old_assignment.id::text, new_assignment_id);
        END IF;
        
        -- Log the move in audit trail
        INSERT INTO audit_logs (
            action,
            entity_type,
            entity_id,
            old_value,
            new_value,
            change_details
        ) VALUES (
            'MOVE_ASSIGNMENT',
            'assignment',
            new_assignment_id,
            to_jsonb(old_assignment),
            jsonb_build_object(
                'id', new_assignment_id,
                'job_id', target_job_id,
                'row_type', target_row_type,
                'resource_id', old_assignment.resource_id
            ),
            jsonb_build_object(
                'from_job_id', old_assignment.job_id,
                'from_row_type', old_assignment.row_type,
                'to_job_id', target_job_id,
                'to_row_type', target_row_type,
                'resource_name', old_assignment.resource_name,
                'resource_type', old_assignment.resource_type
            )
        );
    END LOOP;
    
    -- Delete old assignments
    DELETE FROM assignments WHERE id = ANY(assignment_ids);
    
    -- Return new assignments
    RETURN QUERY
    SELECT a.id, a.resource_id, a.job_id, a.row_type, a.position, a.attached_to_assignment_id
    FROM assignments a
    WHERE a.id = ANY(new_assignment_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate assignment rules comprehensively
CREATE OR REPLACE FUNCTION validate_assignment_rules(
    p_resource_id UUID,
    p_job_id UUID,
    p_row_type row_type,
    p_attached_to_assignment_id UUID DEFAULT NULL,
    p_time_slot JSONB DEFAULT NULL
)
RETURNS TABLE (
    is_valid BOOLEAN,
    error_message TEXT,
    validation_details JSONB
) AS $$
DECLARE
    resource_record RECORD;
    target_record RECORD;
    rule_record RECORD;
    conflict_count INTEGER;
    attachment_count INTEGER;
    details JSONB := '{}';
BEGIN
    -- Get resource details
    SELECT r.*, u.role, u.certifications, u.skills
    INTO resource_record
    FROM resources r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.id = p_resource_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Resource not found', '{"code": "RESOURCE_NOT_FOUND"}'::jsonb;
        RETURN;
    END IF;

    details := details || jsonb_build_object('resource_type', resource_record.type);

    -- Check drop rules
    SELECT allowed_types INTO details
    FROM drop_rules
    WHERE row_type = p_row_type;

    IF FOUND AND NOT (details->>'allowed_types')::resource_type[] @> ARRAY[resource_record.type] THEN
        RETURN QUERY SELECT FALSE, 
            format('Resource type %s not allowed in %s row', resource_record.type, p_row_type),
            details || '{"code": "DROP_RULE_VIOLATION"}'::jsonb;
        RETURN;
    END IF;

    -- If attaching to another assignment, check interaction rules
    IF p_attached_to_assignment_id IS NOT NULL THEN
        -- Get target resource
        SELECT r.*, a.id as assignment_id
        INTO target_record
        FROM assignments a
        JOIN resources r ON a.resource_id = r.id
        WHERE a.id = p_attached_to_assignment_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, 'Target assignment not found', details || '{"code": "TARGET_NOT_FOUND"}'::jsonb;
            RETURN;
        END IF;

        details := details || jsonb_build_object('target_type', target_record.type);

        -- Check interaction rule
        SELECT * INTO rule_record
        FROM magnet_interaction_rules
        WHERE source_type = resource_record.type AND target_type = target_record.type;

        IF NOT FOUND OR NOT rule_record.can_attach THEN
            RETURN QUERY SELECT FALSE,
                format('Cannot attach %s to %s', resource_record.type, target_record.type),
                details || '{"code": "ATTACHMENT_NOT_ALLOWED"}'::jsonb;
            RETURN;
        END IF;

        -- Check max count
        SELECT COUNT(*) INTO attachment_count
        FROM assignments
        WHERE attached_to_assignment_id = p_attached_to_assignment_id;

        IF rule_record.max_count > 0 AND attachment_count >= rule_record.max_count THEN
            RETURN QUERY SELECT FALSE,
                format('Maximum %s attachments (%s) reached for %s', 
                       resource_record.type, rule_record.max_count, target_record.type),
                details || jsonb_build_object('code', 'MAX_COUNT_EXCEEDED', 'current_count', attachment_count, 'max_count', rule_record.max_count);
            RETURN;
        END IF;

        -- Role-specific validations
        IF resource_record.type = 'laborer' AND target_record.type = 'truck' THEN
            IF resource_record.certifications IS NULL OR NOT resource_record.certifications ? 'CDL' THEN
                RETURN QUERY SELECT FALSE,
                    'Laborer must have CDL certification to be assigned to a truck',
                    details || '{"code": "CERTIFICATION_REQUIRED", "required": "CDL"}'::jsonb;
                RETURN;
            END IF;
        END IF;
    END IF;

    -- Check for time conflicts if time slot provided
    IF p_time_slot IS NOT NULL THEN
        SELECT COUNT(*) INTO conflict_count
        FROM assignments a
        WHERE a.resource_id = p_resource_id 
        AND a.job_id != p_job_id
        AND a.time_slot IS NOT NULL
        AND (
            (p_time_slot->>'isFullDay')::boolean = true OR
            (a.time_slot->>'isFullDay')::boolean = true OR
            (
                (p_time_slot->>'startTime')::time < (a.time_slot->>'endTime')::time AND
                (a.time_slot->>'startTime')::time < (p_time_slot->>'endTime')::time
            )
        );

        IF conflict_count > 0 THEN
            RETURN QUERY SELECT FALSE,
                'Time conflict with existing assignment',
                details || jsonb_build_object('code', 'TIME_CONFLICT', 'conflicts', conflict_count);
            RETURN;
        END IF;
    END IF;

    -- All validations passed
    RETURN QUERY SELECT TRUE, 'Assignment valid', details || '{"code": "VALIDATION_PASSED"}'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE (
    role TEXT,
    certifications JSONB,
    skills JSONB,
    permissions JSONB,
    effective_permissions TEXT[]
) AS $$
DECLARE
    user_record RECORD;
    effective_perms TEXT[] := '{}';
BEGIN
    SELECT u.role, u.certifications, u.skills, u.permissions
    INTO user_record
    FROM users u
    WHERE u.id = user_uuid;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Build effective permissions based on role
    CASE user_record.role
        WHEN 'admin' THEN
            effective_perms := array['all'];
        WHEN 'foreman' THEN
            effective_perms := array['manage_jobs', 'assign_resources', 'view_reports'];
        WHEN 'operator' THEN
            effective_perms := array['view_assignments', 'update_status'];
        WHEN 'driver' THEN
            effective_perms := array['view_assignments', 'update_location'];
        ELSE
            effective_perms := array['view_assignments'];
    END CASE;

    -- Add custom permissions from user.permissions
    IF user_record.permissions IS NOT NULL THEN
        SELECT array_agg(value::text) INTO effective_perms
        FROM (
            SELECT unnest(effective_perms) as value
            UNION
            SELECT jsonb_array_elements_text(user_record.permissions)
        ) combined;
    END IF;

    RETURN QUERY SELECT 
        user_record.role,
        user_record.certifications,
        user_record.skills,
        user_record.permissions,
        effective_perms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit trail for a specific entity
CREATE OR REPLACE FUNCTION get_audit_trail(
    entity_type_param TEXT,
    entity_id_param UUID,
    limit_param INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    user_name TEXT,
    action TEXT,
    timestamp TIMESTAMPTZ,
    old_value JSONB,
    new_value JSONB,
    change_details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        COALESCE(u.full_name, 'System') as user_name,
        al.action,
        al.timestamp,
        al.old_value,
        al.new_value,
        al.change_details
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.entity_type = entity_type_param
    AND (entity_id_param IS NULL OR al.entity_id = entity_id_param)
    ORDER BY al.timestamp DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;