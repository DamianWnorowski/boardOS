import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MoveGroupRequest {
  assignmentIds: string[];
  targetJobId: string;
  targetRowType: string;
  targetPosition?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
      assignmentIds,
      targetJobId,
      targetRowType,
      targetPosition = 0
    }: MoveGroupRequest = await req.json();

    // 1. Get all assignments in the group
    const { data: assignments, error: assignmentsError } = await supabaseClient
      .from('assignments')
      .select(`
        *,
        resources (
          id,
          name,
          type
        )
      `)
      .in('id', assignmentIds);

    if (assignmentsError || !assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Assignments not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // 2. Identify primary assignment (not attached to anything)
    const primaryAssignment = assignments.find(a => !a.attached_to_assignment_id);
    const _attachedAssignments = assignments.filter(a => a.attached_to_assignment_id); // Available for attachment handling

    if (!primaryAssignment) {
      return new Response(
        JSON.stringify({ error: 'No primary assignment found in group' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Get target job for default time
    const { data: targetJob, error: _jobError } = await supabaseClient
      .from('jobs')
      .select('start_time')
      .eq('id', targetJobId)
      .single();

    const defaultStartTime = targetJob?.start_time || '07:00';

    // 4. Validate drop rules for primary assignment
    const { data: dropRule, error: _dropRuleError } = await supabaseClient
      .from('drop_rules')
      .select('allowed_types')
      .eq('row_type', targetRowType)
      .single();

    if (dropRule && !dropRule.allowed_types.includes(primaryAssignment.resources.type)) {
      return new Response(
        JSON.stringify({ 
          error: `${primaryAssignment.resources.type} cannot be dropped into ${targetRowType} row.` 
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 5. Begin transaction for atomic move
    const { data: movedAssignments, error: moveError } = await supabaseClient.rpc(
      'move_assignment_group_atomic',
      {
        assignment_ids: assignmentIds,
        target_job_id: targetJobId,
        target_row_type: targetRowType,
        target_position: targetPosition,
        default_start_time: defaultStartTime
      }
    );

    if (moveError) {
      console.error('Error moving assignment group:', moveError);
      return new Response(
        JSON.stringify({ error: 'Failed to move assignment group' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 6. Log the group move action
    await supabaseClient
      .from('audit_logs')
      .insert({
        action: 'MOVE_ASSIGNMENT_GROUP',
        entity_type: 'assignment_group',
        entity_id: primaryAssignment.id,
        change_details: {
          moved_assignments: assignmentIds,
          from_job_id: primaryAssignment.job_id,
          from_row_type: primaryAssignment.row_type,
          to_job_id: targetJobId,
          to_row_type: targetRowType,
          resources_moved: assignments.map(a => ({
            id: a.resources.id,
            name: a.resources.name,
            type: a.resources.type
          }))
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        movedAssignments,
        message: `Successfully moved ${assignments.length} resources to ${targetRowType} row.`
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in move-assignment-group function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});