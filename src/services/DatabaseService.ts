import { supabase, DbResource, DbJob, DbAssignment, DbMagnetRule, DbDropRule } from '../lib/supabase';
import { Resource, Job, Assignment, MagnetInteractionRule, DropRule, RowType, ResourceType, JobRowConfig, Employee, Equipment } from '../types';
import logger from '../utils/logger';

/**
 * Complete database service for the schedule system
 * All schedule operations go through the database with real-time updates
 */
export class DatabaseService {
  
  // Transform database types for employees
  static transformDbEmployee(dbEmployee: any): Employee {
    return {
      id: dbEmployee.id,
      userId: dbEmployee.user_id,
      type: dbEmployee.type,
      name: dbEmployee.name,
      employeeId: dbEmployee.employee_id,
      phoneNumber: dbEmployee.phone_number,
      emergencyContactName: dbEmployee.emergency_contact_name,
      emergencyContactPhone: dbEmployee.emergency_contact_phone,
      email: dbEmployee.email,
      address: dbEmployee.address,
      hireDate: dbEmployee.hire_date,
      role: dbEmployee.role,
      certifications: dbEmployee.certifications || [],
      skills: dbEmployee.skills || [],
      permissions: dbEmployee.permissions || [],
      performanceReviews: dbEmployee.performance_reviews || [],
      trainingRecords: dbEmployee.training_records || [],
      isActive: dbEmployee.is_active,
      createdAt: dbEmployee.created_at,
      updatedAt: dbEmployee.updated_at
    };
  }

  // Transform database types for equipment
  static transformDbEquipment(dbEquipment: any): Equipment {
    return {
      id: dbEquipment.id,
      type: dbEquipment.type,
      name: dbEquipment.name,
      identifier: dbEquipment.identifier,
      model: dbEquipment.model,
      make: dbEquipment.make,
      year: dbEquipment.year,
      vin: dbEquipment.vin,
      serialNumber: dbEquipment.serial_number,
      location: dbEquipment.location,
      onSite: dbEquipment.on_site,
      acquisitionDate: dbEquipment.acquisition_date,
      purchasePrice: dbEquipment.purchase_price,
      currentValue: dbEquipment.current_value,
      fuelType: dbEquipment.fuel_type,
      engineHours: dbEquipment.engine_hours,
      lastMaintenanceDate: dbEquipment.last_maintenance_date,
      nextMaintenanceDate: dbEquipment.next_maintenance_date,
      maintenanceNotes: dbEquipment.maintenance_notes,
      insurancePolicy: dbEquipment.insurance_policy,
      registrationExpiry: dbEquipment.registration_expiry,
      inspectionDate: dbEquipment.inspection_date,
      isOperational: dbEquipment.is_operational,
      isActive: dbEquipment.is_active,
      createdAt: dbEquipment.created_at,
      updatedAt: dbEquipment.updated_at
    };
  }

  // Transform database types to frontend types
  static transformDbResource(dbResource: DbResource): Resource {
    return {
      id: dbResource.id,
      type: dbResource.type as ResourceType,
      classType: dbResource.class_type,
      name: dbResource.name,
      identifier: dbResource.identifier || undefined,
      model: dbResource.model || undefined,
      vin: dbResource.vin || undefined,
      location: dbResource.location || undefined,
      onSite: dbResource.on_site
    };
  }

  static transformDbJob(dbJob: DbJob): Job {
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

  static transformDbAssignment(dbAssignment: DbAssignment): Assignment {
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
        supabase.from('jobs').select('*').order('name'),
        supabase.from('assignments').select('*').order('created_at'),
        supabase.from('magnet_interaction_rules').select('*'),
        supabase.from('drop_rules').select('*')
      ]);
      
      if (resourcesResult.error) {
        logger.error('Error fetching resources:', resourcesResult.error);
        throw resourcesResult.error;
      }
      if (jobsResult.error) throw jobsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      if (rulesResult.error) throw rulesResult.error;
      if (dropRulesResult.error) throw dropRulesResult.error;

      logger.debug('Raw resources data from DB:', resourcesResult.data);
      // Transform resources data
      const resources: Resource[] = resourcesResult.data.map(this.transformDbResource);
      
      // Split into employees and equipment for compatibility
      const employees = resources.filter(r => r.classType === 'employee').map(r => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        name: r.name,
        employeeId: r.identifier,
        role: r.type,
        certifications: [],
        skills: [],
        permissions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      const equipment = resources.filter(r => r.classType === 'equipment').map(r => ({
        id: r.id,
        type: r.type,
        name: r.name,
        identifier: r.identifier,
        model: r.model,
        vin: r.vin,
        location: r.location,
        onSite: r.onSite || false,
        isOperational: true,
        isActive: true,
        engineHours: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      logger.debug('Transformed data:', {
        resourcesCount: resources.length,
        employeesCount: employees.length,
        equipmentCount: equipment.length
      });
      
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
        employees,
        equipment,
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

  // Employee operations
  static async createEmployee(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .insert([{
        user_id: employee.userId,
        type: employee.type,
        name: employee.name,
        employee_id: employee.employeeId,
        phone_number: employee.phoneNumber,
        emergency_contact_name: employee.emergencyContactName,
        emergency_contact_phone: employee.emergencyContactPhone,
        email: employee.email,
        address: employee.address,
        hire_date: employee.hireDate,
        role: employee.role,
        certifications: employee.certifications,
        skills: employee.skills,
        permissions: employee.permissions,
        performance_reviews: employee.performanceReviews,
        training_records: employee.trainingRecords,
        is_active: employee.isActive
      }])
      .select()
      .single();

    if (error) {
      logger.error('Error creating employee:', error);
      throw error;
    }

    return this.transformDbEmployee(data);
  }

  static async updateEmployee(employee: Employee): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .update({
        user_id: employee.userId,
        type: employee.type,
        name: employee.name,
        employee_id: employee.employeeId,
        phone_number: employee.phoneNumber,
        emergency_contact_name: employee.emergencyContactName,
        emergency_contact_phone: employee.emergencyContactPhone,
        email: employee.email,
        address: employee.address,
        hire_date: employee.hireDate,
        role: employee.role,
        certifications: employee.certifications,
        skills: employee.skills,
        permissions: employee.permissions,
        performance_reviews: employee.performanceReviews,
        training_records: employee.trainingRecords,
        is_active: employee.isActive
      })
      .eq('id', employee.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating employee:', error);
      throw error;
    }

    return this.transformDbEmployee(data);
  }

  // Equipment operations
  static async createEquipment(equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment> {
    const { data, error } = await supabase
      .from('equipment')
      .insert([{
        type: equipment.type,
        name: equipment.name,
        identifier: equipment.identifier,
        model: equipment.model,
        make: equipment.make,
        year: equipment.year,
        vin: equipment.vin,
        serial_number: equipment.serialNumber,
        location: equipment.location,
        on_site: equipment.onSite,
        acquisition_date: equipment.acquisitionDate,
        purchase_price: equipment.purchasePrice,
        current_value: equipment.currentValue,
        fuel_type: equipment.fuelType,
        engine_hours: equipment.engineHours,
        last_maintenance_date: equipment.lastMaintenanceDate,
        next_maintenance_date: equipment.nextMaintenanceDate,
        maintenance_notes: equipment.maintenanceNotes,
        insurance_policy: equipment.insurancePolicy,
        registration_expiry: equipment.registrationExpiry,
        inspection_date: equipment.inspectionDate,
        is_operational: equipment.isOperational,
        is_active: equipment.isActive
      }])
      .select()
      .single();

    if (error) {
      logger.error('Error creating equipment:', error);
      throw error;
    }

    return this.transformDbEquipment(data);
  }

  static async updateEquipment(equipment: Equipment): Promise<Equipment> {
    const { data, error } = await supabase
      .from('equipment')
      .update({
        type: equipment.type,
        name: equipment.name,
        identifier: equipment.identifier,
        model: equipment.model,
        make: equipment.make,
        year: equipment.year,
        vin: equipment.vin,
        serial_number: equipment.serialNumber,
        location: equipment.location,
        on_site: equipment.onSite,
        acquisition_date: equipment.acquisitionDate,
        purchase_price: equipment.purchasePrice,
        current_value: equipment.currentValue,
        fuel_type: equipment.fuelType,
        engine_hours: equipment.engineHours,
        last_maintenance_date: equipment.lastMaintenanceDate,
        next_maintenance_date: equipment.nextMaintenanceDate,
        maintenance_notes: equipment.maintenanceNotes,
        insurance_policy: equipment.insurancePolicy,
        registration_expiry: equipment.registrationExpiry,
        inspection_date: equipment.inspectionDate,
        is_operational: equipment.isOperational,
        is_active: equipment.isActive
      })
      .eq('id', equipment.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating equipment:', error);
      throw error;
    }

    return this.transformDbEquipment(data);
  }

  // Resource operations
  static async createResource(resource: Omit<Resource, 'id'>): Promise<Resource> {
    // Route to appropriate table based on class type
    if (resource.classType === 'employee') {
      const employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
        type: resource.type as any,
        name: resource.name,
        employeeId: resource.identifier,
        role: resource.type,
        certifications: [],
        skills: [],
        permissions: [],
        isActive: true
      };
      const created = await this.createEmployee(employee);
      return {
        id: created.id,
        type: created.type,
        classType: 'employee',
        name: created.name,
        identifier: created.employeeId,
        onSite: false
      };
    } else {
      const equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'> = {
        type: resource.type as any,
        name: resource.name,
        identifier: resource.identifier,
        model: resource.model,
        vin: resource.vin,
        location: resource.location,
        onSite: resource.onSite || false,
        isOperational: true,
        isActive: true,
        engineHours: 0
      };
      const created = await this.createEquipment(equipment);
      return {
        id: created.id,
        type: created.type,
        classType: 'equipment',
        name: created.name,
        identifier: created.identifier,
        model: created.model,
        vin: created.vin,
        location: created.location,
        onSite: created.onSite
      };
    }
  }

  static async updateResource(resource: Resource): Promise<Resource> {
    // Route to appropriate table based on class type
    if (resource.classType === 'employee') {
      // Get current employee data first
      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('*')
        .eq('id', resource.id)
        .single();
        
      if (currentEmployee) {
        const employee: Employee = {
          ...this.transformDbEmployee(currentEmployee),
          name: resource.name,
          employeeId: resource.identifier
        };
        const updated = await this.updateEmployee(employee);
        return {
          id: updated.id,
          type: updated.type,
          classType: 'employee',
          name: updated.name,
          identifier: updated.employeeId,
          onSite: false
        };
      }
    } else {
      // Get current equipment data first
      const { data: currentEquipment } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', resource.id)
        .single();
        
      if (currentEquipment) {
        const equipment: Equipment = {
          ...this.transformDbEquipment(currentEquipment),
          name: resource.name,
          identifier: resource.identifier,
          model: resource.model,
          vin: resource.vin,
          location: resource.location,
          onSite: resource.onSite || false
        };
        const updated = await this.updateEquipment(equipment);
        return {
          id: updated.id,
          type: updated.type,
          classType: 'equipment',
          name: updated.name,
          identifier: updated.identifier,
          model: updated.model,
          vin: updated.vin,
          location: updated.location,
          onSite: updated.onSite
        };
      }
    }
    
    throw new Error('Resource not found');
  }

  static async deleteResource(id: string): Promise<void> {
    // Try deleting from both tables (one will succeed, one will fail - that's ok)
    await supabase.from('employees').delete().eq('id', id);
    await supabase.from('equipment').delete().eq('id', id);
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
    logger.debug('📝 Creating assignment in database:', assignment);
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

    logger.debug('📝 Assignment created in database:', data);
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
    logger.debug('🗑️ Deleting assignment from database:', id);
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting assignment:', error);
      throw error;
    }
    
    logger.debug('✅ Assignment deleted from database:', id);
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
    logger.debug('🔔 Setting up real-time subscriptions...');
    const channels = [];

    // Use single channel with multiple listeners for better reliability
    const mainChannel = supabase.channel(`schedule-changes-${Date.now()}`);

    if (callbacks.onResourceChange) {
      mainChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, (payload) => {
          logger.debug('🔔 Resource subscription triggered:', payload);
          callbacks.onResourceChange!(payload);
      });
      logger.debug('🔔 Resource listener added');
    }

    if (callbacks.onJobChange) {
      mainChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload) => {
          logger.debug('🔔 Job subscription triggered:', payload);
          callbacks.onJobChange!(payload);
      });
      logger.debug('🔔 Job listener added');
    }

    if (callbacks.onAssignmentChange) {
      mainChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, (payload) => {
          logger.debug('🔔 Assignment subscription triggered:', payload);
        logger.debug('🔔 Assignment payload details:', {
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old
        });
          callbacks.onAssignmentChange!(payload);
      });
      logger.debug('🔔 Assignment listener added');
    }

    if (callbacks.onRuleChange) {
      mainChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'magnet_interaction_rules' }, (payload) => {
          logger.debug('🔔 Magnet rule subscription triggered:', payload);
          callbacks.onRuleChange!(payload);
      });
      
      mainChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'drop_rules' }, (payload) => {
          logger.debug('🔔 Drop rule subscription triggered:', payload);
          callbacks.onRuleChange!(payload);
      });
      logger.debug('🔔 Rule listeners added');
    }

    // Subscribe to the main channel
    mainChannel.subscribe((status) => {
      logger.debug('🔔 Channel subscription status:', status);
      if (status === 'SUBSCRIBED') {
        logger.debug('🔔 Successfully subscribed to real-time changes');
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('🔔 Real-time subscription error');
      }
    });
    
    channels.push(mainChannel);
    logger.debug('🔔 All subscriptions setup complete');
    
    return () => {
      logger.debug('🔔 Cleaning up subscriptions...');
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

  // Audit trail
  static async getAuditTrail(entityType?: string, entityId?: string, limit: number = 50) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching audit trail:', error);
      throw error;
    }

    return data;
  }
}