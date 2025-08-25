import { supabase, DbResource, DbJob, DbAssignment, DbMagnetRule, DbDropRule } from '../lib/supabase';
import { Resource, Job, Assignment, MagnetInteractionRule, DropRule, RowType, ResourceType, JobRowConfig } from '../types';
import logger from '../utils/logger';

/**
 * Complete database service for the schedule system
 * All schedule operations go through the database with real-time updates
 */
export class ScheduleService {
  
  // Transform database types to frontend types
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
      truckConfig: dbAssignment.truck_config as Assignment['truckConfig'],
      attachments: [] // Will be populated by getAttachedAssignments
    };
  }

  // Get all schedule data
  static async getAllScheduleData() {
    try {
      const [resourcesResult, jobsResult, assignmentsResult, rulesResult, dropRulesResult] = await Promise.all([
        supabase.from('resources').select('*').order('name'),
        supabase.from('jobs').select('*').order('created_at', { ascending: false }),
        supabase.from('assignments').select('*').order('created_at'),
        supabase.from('magnet_interaction_rules').select('*'),
        supabase.from('drop_rules').select('*')
      ]);

      if (resourcesResult.error) throw resourcesResult.error;
      if (jobsResult.error) throw jobsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      if (rulesResult.error) throw rulesResult.error;
      if (dropRulesResult.error) throw dropRulesResult.error;

      // Transform data
      const resources = resourcesResult.data.map(this.transformDbResource);
      const jobs = jobsResult.data.map(this.transformDbJob);
      const assignments = assignmentsResult.data.map(this.transformDbAssignment);
      
      // Add attachments to assignments
      const assignmentsWithAttachments = assignments.map(assignment => ({
        ...assignment,
        attachments: assignments
          .filter(a => a.attachedTo === assignment.id)
          .map(a => a.id)
      }));

      const magnetRules: MagnetInteractionRule[] = rulesResult.data.map(rule => ({
        sourceType: rule.source_type as ResourceType,
        targetType: rule.target_type as ResourceType,
        canAttach: rule.can_attach,
        isRequired: rule.is_required,
        maxCount: rule.max_count
      }));

      const dropRules: DropRule[] = dropRulesResult.data.map(rule => ({
        rowType: rule.row_type as RowType,
        allowedTypes: rule.allowed_types as ResourceType[]
      }));

      return {
        resources,
        jobs,
        assignments: assignmentsWithAttachments,
        magnetRules,
        dropRules
      };
    } catch (error) {
      logger.error('Error loading schedule data:', error);
      throw error;
    }
  }

  // Resource operations
  static async createResource(resource: Omit<Resource, 'id'>): Promise<Resource> {
    const { data, error } = await supabase
      .from('resources')
      .insert([{
        type: resource.type,
        name: resource.name,
        identifier: resource.identifier,
        model: resource.model,
        vin: resource.vin,
        location: resource.location,
        on_site: resource.onSite || false
      }])
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
      .update({
        type: resource.type,
        name: resource.name,
        identifier: resource.identifier,
        model: resource.model,
        vin: resource.vin,
        location: resource.location,
        on_site: resource.onSite || false
      })
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

  // Job operations
  static async createJob(job: Omit<Job, 'id'>): Promise<Job> {
    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        name: job.name,
        job_number: job.number,
        type: job.type,
        shift: job.shift || 'day',
        notes: job.notes,
        start_time: job.startTime,
        finalized: job.finalized || false,
        plants: job.plants || [],
        location: job.location
      }])
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
      .update({
        name: job.name,
        job_number: job.number,
        type: job.type,
        shift: job.shift,
        notes: job.notes,
        start_time: job.startTime,
        finalized: job.finalized,
        plants: job.plants,
        location: job.location
      })
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

  // Assignment operations
  static async createAssignment(assignment: Omit<Assignment, 'id' | 'attachments'>): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .insert([{
        resource_id: assignment.resourceId,
        job_id: assignment.jobId,
        row_type: assignment.row,
        position: assignment.position || 0,
        attached_to_assignment_id: assignment.attachedTo,
        time_slot: assignment.timeSlot,
        note: assignment.note,
        truck_config: assignment.truckConfig
      }])
      .select()
      .single();

    if (error) {
      logger.error('Error creating assignment:', error);
      throw error;
    }

    const transformedAssignment = this.transformDbAssignment(data);
    
    // Get attachments
    const { data: attachments } = await supabase
      .from('assignments')
      .select('id')
      .eq('attached_to_assignment_id', transformedAssignment.id);

    transformedAssignment.attachments = attachments?.map(a => a.id) || [];

    return transformedAssignment;
  }

  static async updateAssignment(assignment: Assignment): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .update({
        resource_id: assignment.resourceId,
        job_id: assignment.jobId,
        row_type: assignment.row,
        position: assignment.position,
        attached_to_assignment_id: assignment.attachedTo,
        time_slot: assignment.timeSlot,
        note: assignment.note,
        truck_config: assignment.truckConfig
      })
      .eq('id', assignment.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating assignment:', error);
      throw error;
    }

    const transformedAssignment = this.transformDbAssignment(data);
    
    // Get attachments
    const { data: attachments } = await supabase
      .from('assignments')
      .select('id')
      .eq('attached_to_assignment_id', transformedAssignment.id);

    transformedAssignment.attachments = attachments?.map(a => a.id) || [];

    return transformedAssignment;
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

  // Rule operations
  static async updateMagnetRule(rule: MagnetInteractionRule): Promise<void> {
    const { error } = await supabase
      .from('magnet_interaction_rules')
      .upsert({
        source_type: rule.sourceType,
        target_type: rule.targetType,
        can_attach: rule.canAttach,
        is_required: rule.isRequired,
        max_count: rule.maxCount
      }, {
        onConflict: 'source_type,target_type'
      });

    if (error) {
      logger.error('Error updating magnet rule:', error);
      throw error;
    }
  }

  static async updateDropRule(rowType: RowType, allowedTypes: ResourceType[]): Promise<void> {
    const { error } = await supabase
      .from('drop_rules')
      .upsert({
        row_type: rowType,
        allowed_types: allowedTypes
      }, {
        onConflict: 'row_type'
      });

    if (error) {
      logger.error('Error updating drop rule:', error);
      throw error;
    }
  }

  // Real-time subscriptions
  static subscribeToScheduleChanges(callbacks: {
    onResourceChange?: (payload: any) => void;
    onJobChange?: (payload: any) => void;
    onAssignmentChange?: (payload: any) => void;
    onRuleChange?: (payload: any) => void;
  }) {
    const channels = [];

    if (callbacks.onResourceChange) {
      const resourceChannel = supabase
        .channel('resources-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, callbacks.onResourceChange)
        .subscribe();
      channels.push(resourceChannel);
    }

    if (callbacks.onJobChange) {
      const jobChannel = supabase
        .channel('jobs-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, callbacks.onJobChange)
        .subscribe();
      channels.push(jobChannel);
    }

    if (callbacks.onAssignmentChange) {
      const assignmentChannel = supabase
        .channel('assignments-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, callbacks.onAssignmentChange)
        .subscribe();
      channels.push(assignmentChannel);
    }

    if (callbacks.onRuleChange) {
      const ruleChannel = supabase
        .channel('rules-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'magnet_interaction_rules' }, callbacks.onRuleChange)
        .subscribe();
      channels.push(ruleChannel);

      const dropRuleChannel = supabase
        .channel('drop-rules-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'drop_rules' }, callbacks.onRuleChange)
        .subscribe();
      channels.push(dropRuleChannel);
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }

  // Job row config operations
  static async updateJobRowConfig(config: JobRowConfig): Promise<void> {
    const { error } = await supabase
      .from('job_row_configs')
      .upsert({
        job_id: config.jobId,
        row_type: config.rowType,
        is_split: config.isSplit,
        boxes: config.boxes
      }, {
        onConflict: 'job_id,row_type'
      });

    if (error) {
      logger.error('Error updating job row config:', error);
      throw error;
    }
  }

  static async getJobRowConfigs(): Promise<JobRowConfig[]> {
    const { data, error } = await supabase
      .from('job_row_configs')
      .select('*');

    if (error) {
      logger.error('Error fetching job row configs:', error);
      throw error;
    }

    return data.map(config => ({
      jobId: config.job_id,
      rowType: config.row_type as RowType,
      isSplit: config.is_split,
      boxes: config.boxes as any[]
    }));
  }

  // Truck driver assignments
  static async updateTruckDriverAssignment(truckId: string, driverId: string): Promise<void> {
    // Remove any existing assignment for this driver
    await supabase
      .from('truck_driver_assignments')
      .delete()
      .eq('driver_id', driverId);

    // Remove any existing assignment for this truck
    await supabase
      .from('truck_driver_assignments')
      .delete()
      .eq('truck_id', truckId);

    // Create new assignment
    const { error } = await supabase
      .from('truck_driver_assignments')
      .insert([{
        truck_id: truckId,
        driver_id: driverId
      }]);

    if (error) {
      logger.error('Error updating truck driver assignment:', error);
      throw error;
    }
  }

  static async removeTruckDriverAssignment(truckId: string): Promise<void> {
    const { error } = await supabase
      .from('truck_driver_assignments')
      .delete()
      .eq('truck_id', truckId);

    if (error) {
      logger.error('Error removing truck driver assignment:', error);
      throw error;
    }
  }

  static async getTruckDriverAssignments(): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('truck_driver_assignments')
      .select('truck_id, driver_id');

    if (error) {
      logger.error('Error fetching truck driver assignments:', error);
      throw error;
    }

    return data.reduce((acc, assignment) => {
      acc[assignment.truck_id] = assignment.driver_id;
      return acc;
    }, {} as Record<string, string>);
  }
}