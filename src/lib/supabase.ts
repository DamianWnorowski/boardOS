import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Types for our database entities
export type DbUser = Database['public']['Tables']['users']['Row'];
export type DbResource = Database['public']['Tables']['resources']['Row'];
export type DbJob = Database['public']['Tables']['jobs']['Row'];
export type DbAssignment = Database['public']['Tables']['assignments']['Row'];
export type DbMagnetRule = Database['public']['Tables']['magnet_interaction_rules']['Row'];
export type DbDropRule = Database['public']['Tables']['drop_rules']['Row'];
export type DbJobRowConfig = Database['public']['Tables']['job_row_configs']['Row'];
export type DbAuditLog = Database['public']['Tables']['audit_logs']['Row'];

// Insert types
export type DbUserInsert = Database['public']['Tables']['users']['Insert'];
export type DbResourceInsert = Database['public']['Tables']['resources']['Insert'];
export type DbJobInsert = Database['public']['Tables']['jobs']['Insert'];
export type DbAssignmentInsert = Database['public']['Tables']['assignments']['Insert'];

// API response types
export interface AssignResourceResponse {
  success: boolean;
  assignment?: DbAssignment;
  message?: string;
  error?: string;
}

export interface MoveGroupResponse {
  success: boolean;
  movedAssignments?: DbAssignment[];
  message?: string;
  error?: string;
}

// Helper functions for API calls
export const assignResourceToJob = async (
  resourceId: string,
  jobId: string,
  rowType: string,
  options: {
    attachedToAssignmentId?: string;
    truckConfig?: 'flowboy' | 'dump-trailer';
    position?: number;
    timeSlot?: {
      startTime: string;
      endTime: string;
      isFullDay: boolean;
    };
  } = {}
): Promise<AssignResourceResponse> => {
  const response = await fetch(`${supabaseUrl}/functions/v1/assign-resource`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resourceId,
      jobId,
      rowType,
      ...options
    })
  });

  return await response.json();
};

export const moveAssignmentGroup = async (
  assignmentIds: string[],
  targetJobId: string,
  targetRowType: string,
  targetPosition?: number
): Promise<MoveGroupResponse> => {
  const response = await fetch(`${supabaseUrl}/functions/v1/move-assignment-group`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assignmentIds,
      targetJobId,
      targetRowType,
      targetPosition
    })
  });

  return await response.json();
};

// Real-time subscription helpers
export const subscribeToTableChanges = (
  table: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`public:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
};

export const subscribeToAssignmentChanges = (callback: (payload: any) => void) => {
  return subscribeToTableChanges('assignments', callback);
};

export const subscribeToJobChanges = (callback: (payload: any) => void) => {
  return subscribeToTableChanges('jobs', callback);
};

export const subscribeToResourceChanges = (callback: (payload: any) => void) => {
  return subscribeToTableChanges('resources', callback);
};