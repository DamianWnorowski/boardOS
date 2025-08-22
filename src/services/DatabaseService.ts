import { supabase, DbResource, DbJob, DbAssignment, DbMagnetRule, DbDropRule } from '../lib/supabase';
import { Resource, Job, Assignment, MagnetInteractionRule, DropRule, RowType, ResourceType } from '../types';
import logger from '../utils/logger';

/**
 * Database service layer for interacting with Supabase
 * Handles data transformation between frontend types and database types
 */
export class DatabaseService {
  
  // Transform database resource to frontend resource
  private static transformDbResource(dbResource: DbResource): Resource {
    return {
      id: dbResource.id,
      type: dbResource.type as ResourceType,
      name: dbResource.name,
      identifier: dbResource.identifier || undefined,
      model: dbResource.model || undefined,
      vin: dbResource.vin || undefined,
      location: dbResource.location || undefined,
      onSite: dbResource.on_site
    };
  }

  // Transform frontend resource to database resource
  private static transformResource(resource: Omit<Resource, 'id'>): any {
    return {
      type: resource.type,
      name: resource.name,
      identifier: resource.identifier,
      model: resource.model,
      vin: resource.vin,
      location: resource.location,
      on_site: resource.onSite || false
    };
  }

  // Transform database job to frontend job
  private static transformDbJob(dbJob: DbJob): Job {
    return {
      id: dbJob.id,
      name: dbJob.name,
      number: dbJob.job_number || undefined,
      type: dbJob.type as Job['type'],
      shift: dbJob.shift as 'day' | 'night',
      notes: dbJob.notes || undefined,
      startTime: dbJob.start_time || undefined,
      finalized: dbJob.finalized,
      plants: (dbJob.plants as string[]) || [],
      location: dbJob.location as Job['location'] || undefined
    };
  }

  // Transform frontend job to database job
  private static transformJob(job: Omit<Job, 'id'>): any {
    return {
      name: job.name,
      job_number: job.number,
      type: job.type,
      shift: job.shift || 'day',
      notes: job.notes,
      start_time: job.startTime,
      finalized: job.finalized || false,
      plants: job.plants || [],
      location: job.location
    };
  }

  // Transform database assignment to frontend assignment
  private static transformDbAssignment(dbAssignment: DbAssignment): Assignment {
    return {
      id: dbAssignment.id,
      resourceId: dbAssignment.resource_id,
      jobId: dbAssignment.job_id,
      row: dbAssignment.row_type as RowType,
      position: dbAssignment.position || 0,
      attachedTo: dbAssignment.attached_to_assignment_id || undefined,
      timeSlot: dbAssignment.time_slot as Assignment['timeSlot'],
      note: dbAssignment.note || undefined,
      truckConfig: dbAssignment.truck_config as Assignment['truckConfig']
    };
  }

  // Transform frontend assignment to database assignment
  private static transformAssignment(assignment: Omit<Assignment, 'id'>): any {
    return {
      resource_id: assignment.resourceId,
      job_id: assignment.jobId,
      row_type: assignment.row,
      position: assignment.position || 0,
      attached_to_assignment_id: assignment.attachedTo,
      time_slot: assignment.timeSlot,
      note: assignment.note,
      truck_config: assignment.truckConfig
    };
  }

  // CRUD Operations for Resources
  static async getResources(): Promise<Resource[]> {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('name');

    if (error) {
      logger.error('Error fetching resources:', error);
      throw error;
    }

    return data.map(this.transformDbResource);
  }

  static async createResource(resource: Omit<Resource, 'id'>): Promise<Resource> {
    const { data, error } = await supabase
      .from('resources')
      .insert([this.transformResource(resource)])
      .select()
      .single();

    if (error) {
      logger.error('Error creating resource:', error);
      throw error;
    }

    return this.transformDbResource(data);
  }

  static async updateResource(resource: Resource): Promise<Resource> {
    const { data, error } = await supabase
      .from('resources')
      .update(this.transformResource(resource))
      .eq('id', resource.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating resource:', error);
      throw error;
    }

    return this.transformDbResource(data);
  }

  static async deleteResource(id: string): Promise<void> {
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting resource:', error);
      throw error;
    }
  }

  // CRUD Operations for Jobs
  static async getJobs(): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching jobs:', error);
      throw error;
    }

    return data.map(this.transformDbJob);
  }

  static async createJob(job: Omit<Job, 'id'>): Promise<Job> {
    const { data, error } = await supabase
      .from('jobs')
      .insert([this.transformJob(job)])
      .select()
      .single();

    if (error) {
      logger.error('Error creating job:', error);
      throw error;
    }

    return this.transformDbJob(data);
  }

  static async updateJob(job: Job): Promise<Job> {
    const { data, error } = await supabase
      .from('jobs')
      .update(this.transformJob(job))
      .eq('id', job.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating job:', error);
      throw error;
    }

    return this.transformDbJob(data);
  }

  static async deleteJob(id: string): Promise<void> {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting job:', error);
      throw error;
    }
  }

  // CRUD Operations for Assignments
  static async getAssignments(): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching assignments:', error);
      throw error;
    }

    return data.map(this.transformDbAssignment);
  }

  static async createAssignment(assignment: Omit<Assignment, 'id'>): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .insert([this.transformAssignment(assignment)])
      .select()
      .single();

    if (error) {
      logger.error('Error creating assignment:', error);
      throw error;
    }

    return this.transformDbAssignment(data);
  }

  static async updateAssignment(assignment: Assignment): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .update(this.transformAssignment(assignment))
      .eq('id', assignment.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating assignment:', error);
      throw error;
    }

    return this.transformDbAssignment(data);
  }

  static async deleteAssignment(id: string): Promise<void> {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting assignment:', error);
      throw error;
    }
  }

  // Rules Management
  static async getMagnetInteractionRules(): Promise<MagnetInteractionRule[]> {
    const { data, error } = await supabase
      .from('magnet_interaction_rules')
      .select('*')
      .order('source_type, target_type');

    if (error) {
      logger.error('Error fetching magnet interaction rules:', error);
      throw error;
    }

    return data.map(rule => ({
      sourceType: rule.source_type as ResourceType,
      targetType: rule.target_type as ResourceType,
      canAttach: rule.can_attach,
      isRequired: rule.is_required,
      maxCount: rule.max_count
    }));
  }

  static async getDropRules(): Promise<DropRule[]> {
    const { data, error } = await supabase
      .from('drop_rules')
      .select('*')
      .order('row_type');

    if (error) {
      logger.error('Error fetching drop rules:', error);
      throw error;
    }

    return data.map(rule => ({
      rowType: rule.row_type as RowType,
      allowedTypes: rule.allowed_types as ResourceType[]
    }));
  }

  // Real-time subscriptions
  static subscribeToResources(callback: (payload: any) => void) {
    return supabase
      .channel('resources-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, callback)
      .subscribe();
  }

  static subscribeToJobs(callback: (payload: any) => void) {
    return supabase
      .channel('jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, callback)
      .subscribe();
  }

  static subscribeToAssignments(callback: (payload: any) => void) {
    return supabase
      .channel('assignments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, callback)
      .subscribe();
  }

  // Specialized queries
  static async getResourcesWithAssignments(): Promise<Array<Resource & { assignments: Assignment[] }>> {
    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        assignments (*)
      `)
      .order('name');

    if (error) {
      logger.error('Error fetching resources with assignments:', error);
      throw error;
    }

    return data.map(item => ({
      ...this.transformDbResource(item),
      assignments: (item.assignments || []).map(this.transformDbAssignment)
    }));
  }

  static async getJobsWithAssignments(): Promise<Array<Job & { assignments: Assignment[] }>> {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        assignments (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching jobs with assignments:', error);
      throw error;
    }

    return data.map(item => ({
      ...this.transformDbJob(item),
      assignments: (item.assignments || []).map(this.transformDbAssignment)
    }));
  }

  // Audit functions
  static async getAuditTrail(entityType: string, entityId?: string, limit: number = 50) {
    const { data, error } = await supabase.rpc('get_audit_trail', {
      entity_type_param: entityType,
      entity_id_param: entityId,
      limit_param: limit
    });

    if (error) {
      logger.error('Error fetching audit trail:', error);
      throw error;
    }

    return data;
  }

  // Validation functions
  static async validateAssignment(
    resourceId: string,
    jobId: string,
    rowType: RowType,
    attachedToAssignmentId?: string,
    timeSlot?: any
  ) {
    const { data, error } = await supabase.rpc('validate_assignment_rules', {
      p_resource_id: resourceId,
      p_job_id: jobId,
      p_row_type: rowType,
      p_attached_to_assignment_id: attachedToAssignmentId,
      p_time_slot: timeSlot
    });

    if (error) {
      logger.error('Error validating assignment:', error);
      throw error;
    }

    return data[0]; // Returns first validation result
  }
}