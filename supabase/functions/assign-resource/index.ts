import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AssignResourceRequest {
  resourceId: string;
  jobId: string;
  rowType: string;
  attachedToAssignmentId?: string;
  truckConfig?: 'flowboy' | 'dump-trailer';
  position?: number;
  timeSlot?: {
    startTime: string;
    endTime: string;
    isFullDay: boolean;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with user context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      resourceId,
      jobId,
      rowType,
      attachedToAssignmentId,
      truckConfig,
      position = 0,
      timeSlot
    }: AssignResourceRequest = await req.json();

    // 1. Get resource and user details
    const { data: resource, error: resourceError } = await supabaseClient
      .from('resources')
      .select(`
        *,
        users (
          id,
          role,
          certifications,
          skills,
          permissions
        )
      `)
      .eq('id', resourceId)
      .single();

    if (resourceError || !resource) {
      return new Response(
        JSON.stringify({ error: 'Resource not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    const user = resource.users;

    // 2. Determine target type if attaching to another assignment
    let targetType = null;
    let targetResource = null;
    if (attachedToAssignmentId) {
      const { data: targetAssignment, error: targetAssignmentError } = await supabaseClient
        .from('assignments')
        .select('resource_id')
        .eq('id', attachedToAssignmentId)
        .single();

      if (targetAssignmentError || !targetAssignment) {
        return new Response(
          JSON.stringify({ error: 'Target assignment not found' }),
          { status: 404, headers: corsHeaders }
        );
      }

      const { data: targetResourceData, error: targetResourceError } = await supabaseClient
        .from('resources')
        .select('type, name')
        .eq('id', targetAssignment.resource_id)
        .single();

      if (targetResourceError || !targetResourceData) {
        return new Response(
          JSON.stringify({ error: 'Target resource not found' }),
          { status: 404, headers: corsHeaders }
        );
      }

      targetType = targetResourceData.type;
      targetResource = targetResourceData;
    }

    // 3. Check magnet interaction rules if attaching
    if (targetType) {
      const { data: rule, error: ruleError } = await supabaseClient
        .from('magnet_interaction_rules')
        .select('*')
        .eq('source_type', resource.type)
        .eq('target_type', targetType)
        .single();

      if (ruleError && ruleError.code !== 'PGRST116') {
        console.error('Error fetching rule:', ruleError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch interaction rules' }),
          { status: 500, headers: corsHeaders }
        );
      }

      if (!rule || !rule.can_attach) {
        return new Response(
          JSON.stringify({ 
            error: `Cannot attach ${resource.type} to ${targetType}. Rule not found or attachment not allowed.` 
          }),
          { status: 403, headers: corsHeaders }
        );
      }

      // Check max count
      if (rule.max_count) {
        const { data: currentAttachments, error: attachmentsError } = await supabaseClient
          .from('assignments')
          .select('id')
          .eq('attached_to_assignment_id', attachedToAssignmentId);

        if (attachmentsError) {
          return new Response(
            JSON.stringify({ error: 'Failed to check current attachments' }),
            { status: 500, headers: corsHeaders }
          );
        }

        if (currentAttachments && currentAttachments.length >= rule.max_count) {
          return new Response(
            JSON.stringify({ 
              error: `Maximum ${rule.max_count} ${resource.type}(s) already attached to this ${targetType}.` 
            }),
            { status: 403, headers: corsHeaders }
          );
        }
      }

      // 4. Role-specific validation examples
      
      // Laborer driving truck - must have CDL
      if (resource.type === 'laborer' && targetType === 'truck') {
        if (!user || !user.certifications || !user.certifications.includes('CDL')) {
          return new Response(
            JSON.stringify({ 
              error: 'Laborer must have CDL certification to be assigned to a truck.' 
            }),
            { status: 403, headers: corsHeaders }
          );
        }
      }

      // Trader equipment access - must have proper qualifications
      if (user && user.role === 'trader' && ['paver', 'excavator', 'millingMachine'].includes(targetType)) {
        const requiredSkill = `${targetType} Operation`;
        if (!user.skills || !user.skills.includes(requiredSkill)) {
          return new Response(
            JSON.stringify({ 
              error: `Trader must be qualified for ${targetType} operation.` 
            }),
            { status: 403, headers: corsHeaders }
          );
        }
      }

      // Truck driver authorization for specific vehicles
      if (resource.type === 'driver' && targetType === 'truck') {
        // Example: Check if driver is authorized for this truck type
        if (targetResource && targetResource.name.includes('10W')) {
          if (!user || !user.skills || !user.skills.includes('Heavy Vehicle Operation')) {
            return new Response(
              JSON.stringify({ 
                error: 'Driver must be qualified for heavy vehicle operation to drive 10W trucks.' 
              }),
              { status: 403, headers: corsHeaders }
            );
          }
        }
      }
    }

    // 5. Check drop rules for the target row
    const { data: dropRule, error: dropRuleError } = await supabaseClient
      .from('drop_rules')
      .select('allowed_types')
      .eq('row_type', rowType)
      .single();

    if (dropRuleError && dropRuleError.code !== 'PGRST116') {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch drop rules' }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (dropRule && !dropRule.allowed_types.includes(resource.type)) {
      return new Response(
        JSON.stringify({ 
          error: `${resource.type} cannot be dropped into ${rowType} row.` 
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 6. Get job for default time slot
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('start_time')
      .eq('id', jobId)
      .single();

    const defaultTimeSlot = timeSlot || {
      startTime: job?.start_time || '07:00',
      endTime: '15:30',
      isFullDay: true
    };

    // 7. Create the assignment
    const { data: newAssignment, error: assignmentError } = await supabaseClient
      .from('assignments')
      .insert([{
        resource_id: resourceId,
        job_id: jobId,
        row_type: rowType,
        attached_to_assignment_id: attachedToAssignmentId,
        position,
        time_slot: defaultTimeSlot,
        truck_config: truckConfig
      }])
      .select()
      .single();

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError);
      return new Response(
        JSON.stringify({ error: 'Failed to create assignment' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 8. Log the successful assignment
    await supabaseClient
      .from('audit_logs')
      .insert({
        action: attachedToAssignmentId ? 'ATTACH_RESOURCE' : 'ASSIGN_RESOURCE',
        entity_type: 'assignment',
        entity_id: newAssignment.id,
        new_value: newAssignment,
        change_details: {
          resource_name: resource.name,
          resource_type: resource.type,
          job_id: jobId,
          row_type: rowType,
          attached_to: attachedToAssignmentId,
          truck_config: truckConfig
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        assignment: newAssignment,
        message: `Successfully assigned ${resource.name} to ${rowType} row.`
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in assign-resource function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});