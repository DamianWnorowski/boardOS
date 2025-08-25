import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Job, Resource, Assignment, RowType, RowOverride, TimeSlot, ResourceType, MagnetInteractionRule, DropRule, JobRowConfig } from '../types';
import { convertPersonnelToResources, convertEquipmentToResources } from '../data/resourceData';
import { isRowNeededForJobType } from '../utils/jobUtils';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { magnetManager } from '../classes/Magnet';
import { buildStandardConstructionRules, buildStandardDropRules } from '../utils/ruleCreator';
import { getLegacyResourceColors } from '../utils/colorSystem';
import { DatabaseService } from '../services/DatabaseService';
import { supabase } from '../lib/supabase';

interface SchedulerContextType {
  jobs: Job[];
  resources: Resource[];
  assignments: Assignment[];
  rowOverrides: RowOverride[];
  selectedDate: Date;
  filteredResourceType: string | null;
  searchTerm: string;
  truckDriverAssignments: Record<string, string>;
  magnetInteractionRules: MagnetInteractionRule[];
  dropRules: DropRule[];
  jobRowConfigs: JobRowConfig[];
  isLoading: boolean;
  error: string | null;
  
  // Job actions
  addJob: (job: Omit<Job, 'id'>) => Promise<void>;
  updateJob: (job: Job) => Promise<void>;
  removeJob: (jobId: string) => Promise<void>;
  finalizeJob: (jobId: string) => Promise<void>;
  unfinalizeJob: (jobId: string) => Promise<void>;
  
  // Resource actions
  addResource: (resource: Omit<Resource, 'id'>) => Promise<void>;
  updateResource: (resource: Resource) => Promise<void>;
  removeResource: (resourceId: string) => Promise<void>;
  toggleResourceOnSite: (resourceId: string) => Promise<void>;
  
  // Assignment actions
  assignResource: (resourceId: string, jobId: string, row: RowType, position?: number) => Promise<string>;
  assignResourceWithTruckConfig: (resourceId: string, jobId: string, row: RowType, truckConfig?: 'flowboy' | 'dump-trailer', position?: number, isSecondShift?: boolean) => Promise<string>;
  updateAssignment: (assignment: Assignment) => Promise<void>;
  removeAssignment: (assignmentId: string) => Promise<void>;
  attachResources: (targetId: string, sourceId: string) => Promise<void>;
  detachResources: (assignmentId: string) => Promise<void>;
  updateTimeSlot: (assignmentId: string, timeSlot: TimeSlot) => Promise<void>;
  updateAssignmentNote: (assignmentId: string, note: string) => Promise<void>;
  cleanupOrphanedData: () => Promise<void>;
  
  // Row override actions
  toggleRowEnabled: (jobId: string, rowType: RowType) => void;
  isRowEnabled: (jobId: string, rowType: RowType) => boolean;
  
  // Combined actions
  moveAssignmentGroup: (assignments: Assignment[], jobId: string, row: RowType, position?: number) => Promise<string>;
  assignResourceWithAttachment: (resourceId: string, parentAssignmentId: string) => Promise<string | null>;
  
  // Filter actions
  setSelectedDate: (date: Date) => void;
  setFilteredResourceType: (type: string | null) => void;
  setSearchTerm: (term: string) => void;
  
  // Truck-driver assignment actions
  assignDriverToTruck: (truckId: string, driverId: string) => Promise<void>;
  unassignDriverFromTruck: (truckId: string) => Promise<void>;
  getTruckDriver: (truckId: string) => Resource | undefined;
  getDriverTruck: (driverId: string) => Resource | undefined;
  
  // Helper functions
  getResourcesByAssignment: (jobId: string, row: RowType) => Assignment[];
  getAvailableResources: () => Resource[];
  getResourceById: (id: string) => Resource | undefined;
  getJobById: (id: string) => Job | undefined;
  getAssignmentById: (id: string) => Assignment | undefined;
  getAssignmentByResource: (resourceId: string) => Assignment | undefined;
  getAttachedAssignments: (assignmentId: string) => Assignment[];
  hasMultipleJobAssignments: (resourceId: string) => boolean;
  getResourceOtherAssignments: (resourceId: string, excludeAssignmentId: string) => Assignment[];
  hasTimeConflict: (resourceId: string, timeSlot: TimeSlot, excludeAssignmentId?: string) => boolean;
  getJobNotes: (jobId: string) => Array<{assignment: Assignment, resource: Resource, note: string}>;
  isWorkingDouble: (resourceId: string) => boolean;
  getResourceDoubleShiftJobs: (resourceId: string) => { dayJob?: Job, nightJob?: Job };
  
  // Rule management actions
  updateMagnetInteractionRule: (rule: MagnetInteractionRule) => Promise<void>;
  getMagnetInteractionRule: (sourceType: ResourceType, targetType: ResourceType) => MagnetInteractionRule | undefined;
  getRequiredAttachmentsForType: (targetType: ResourceType) => ResourceType[];
  getMaxAttachmentsForType: (sourceType: ResourceType, targetType: ResourceType) => number;
  canMagnetAttachTo: (sourceType: ResourceType, targetType: ResourceType) => boolean;
  updateDropRule: (rowType: RowType, allowedTypes: ResourceType[]) => Promise<void>;
  getDropRule: (rowType: RowType) => ResourceType[];
  canDropOnRow: (resourceType: ResourceType, rowType: RowType) => boolean;
  
  // Job row config actions
  updateJobRowConfig: (config: JobRowConfig) => Promise<void>;
  getJobRowConfig: (jobId: string, rowType: RowType) => JobRowConfig | undefined;
  splitJobRow: (jobId: string, rowType: RowType, box1Name: string, box2Name: string) => Promise<void>;
  unsplitJobRow: (jobId: string, rowType: RowType) => Promise<void>;
  
  // Data refresh
  refreshData: () => Promise<void>;
}

export const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export const SchedulerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Database-driven state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [magnetInteractionRules, setMagnetInteractionRules] = useState<MagnetInteractionRule[]>([]);
  const [dropRules, setDropRules] = useState<DropRule[]>([]);
  const [jobRowConfigs, setJobRowConfigs] = useState<JobRowConfig[]>([]);
  const [truckDriverAssignments, setTruckDriverAssignments] = useState<Record<string, string>>({});
  
  // Local UI state (not persisted)
  const [rowOverrides, setRowOverrides] = useState<RowOverride[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filteredResourceType, setFilteredResourceType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Use centralized color system
  const resourceColors = React.useMemo(() => getLegacyResourceColors(), []);

  // Load all data from database on mount
  const loadScheduleData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load all schedule data
      const scheduleData = await DatabaseService.getAllScheduleData();
      
      setJobs(scheduleData.jobs);
      setResources(scheduleData.resources);
      setAssignments(scheduleData.assignments);
      setMagnetInteractionRules(scheduleData.magnetRules);
      setDropRules(scheduleData.dropRules);

      // Load truck driver assignments
      const truckDriverData = await DatabaseService.getTruckDriverAssignments();
      setTruckDriverAssignments(truckDriverData);

      // Load job row configs
      const jobRowConfigData = await DatabaseService.getJobRowConfigs();
      setJobRowConfigs(jobRowConfigData);

      logger.info('Schedule data loaded from database', {
        jobs: scheduleData.jobs.length,
        resources: scheduleData.resources.length,
        assignments: scheduleData.assignments.length,
        rules: scheduleData.magnetRules.length
      });

    } catch (err: any) {
      logger.error('Error loading schedule data:', err);
      setError(err.message || 'Failed to load schedule data');
      
      // Fallback to default data if database is not available
      setResources([...convertPersonnelToResources(), ...convertEquipmentToResources()]);
      setMagnetInteractionRules(buildStandardConstructionRules());
      setDropRules(buildStandardDropRules());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  // Check if resources need to be populated from the data files
  const checkAndPopulateResources = useCallback(async () => {
    try {
      const { data: existingResources, error } = await supabase
        .from('resources')
        .select('id')
        .limit(1);

      if (error) {
        logger.error('Error checking existing resources:', error);
        return;
      }

      // If no resources exist, populate from data files
      if (!existingResources || existingResources.length === 0) {
        logger.info('No resources found in database, populating from data files...');
        
        const personnelResources = convertPersonnelToResources();
        const equipmentResources = convertEquipmentToResources();
        const allResources = [...personnelResources, ...equipmentResources];

        // Insert all resources
        const { error: insertError } = await supabase
          .from('resources')
          .insert(allResources.map(resource => ({
            type: resource.type,
            name: resource.name,
            identifier: resource.identifier,
            model: resource.model,
            vin: resource.vin,
            location: resource.location,
            on_site: resource.onSite || false
          })));

        if (insertError) {
          logger.error('Error populating resources:', insertError);
        } else {
          logger.info('Successfully populated resources from data files', {
            count: allResources.length
          });
          // Reload data to get the newly inserted resources
          await loadScheduleData();
        }
      }
    } catch (err) {
      logger.error('Error in checkAndPopulateResources:', err);
    }
  }, [loadScheduleData]);

  // Check and populate resources after initial load
  useEffect(() => {
    if (!isLoading && !error && resources.length === 0) {
      checkAndPopulateResources();
    }
  }, [isLoading, error, resources.length, checkAndPopulateResources]);

  // Set up real-time subscriptions
  useEffect(() => {
    const cleanup = DatabaseService.subscribeToScheduleChanges({
      onResourceChange: (payload) => {
        logger.debug('Real-time resource change:', payload);
        if (payload.eventType === 'INSERT') {
          setResources(prev => [...prev, DatabaseService.transformDbResource(payload.new)]);
        } else if (payload.eventType === 'UPDATE') {
          setResources(prev => prev.map(r => 
            r.id === payload.new.id ? DatabaseService.transformDbResource(payload.new) : r
          ));
        } else if (payload.eventType === 'DELETE') {
          setResources(prev => prev.filter(r => r.id !== payload.old.id));
        }
      },
      onJobChange: (payload) => {
        logger.debug('Real-time job change:', payload);
        if (payload.eventType === 'INSERT') {
          setJobs(prev => [...prev, DatabaseService.transformDbJob(payload.new)]);
        } else if (payload.eventType === 'UPDATE') {
          setJobs(prev => prev.map(j => 
            j.id === payload.new.id ? DatabaseService.transformDbJob(payload.new) : j
          ));
        } else if (payload.eventType === 'DELETE') {
          setJobs(prev => prev.filter(j => j.id !== payload.old.id));
        }
      },
      onAssignmentChange: (payload) => {
        logger.debug('Real-time assignment change:', payload);
        if (payload.eventType === 'INSERT') {
          const newAssignment = DatabaseService.transformDbAssignment(payload.new);
          setAssignments(prev => {
            // Get attachments for this assignment
            const attachments = prev
              .filter(a => a.attachedTo === newAssignment.id)
              .map(a => a.id);
            return [...prev, { ...newAssignment, attachments }];
          });
        } else if (payload.eventType === 'UPDATE') {
          setAssignments(prev => prev.map(a => {
            if (a.id === payload.new.id) {
              const updatedAssignment = DatabaseService.transformDbAssignment(payload.new);
              return {
                ...updatedAssignment,
                attachments: prev.find(existing => existing.id === a.id)?.attachments || []
              };
            }
            return a;
          }));
        } else if (payload.eventType === 'DELETE') {
          setAssignments(prev => prev.filter(a => a.id !== payload.old.id));
        }
      }
    });

    return cleanup;
  }, []);

  // Update magnetManager with current rules and colors
  useEffect(() => {
    magnetManager.setRulesAndColors(magnetInteractionRules, resourceColors);
  }, [magnetInteractionRules, resourceColors]);

  // Job actions - all database operations
  const addJob = async (job: Omit<Job, 'id'>) => {
    try {
      const newJob = await DatabaseService.createJob(job);
      logger.info('Job created:', newJob.name);
    } catch (err: any) {
      logger.error('Error creating job:', err);
      setError(`Failed to create job: ${err.message}`);
      throw err;
    }
  };

  const updateJob = async (job: Job) => {
    try {
      await DatabaseService.updateJob(job);
      logger.info('Job updated:', job.name);
    } catch (err: any) {
      logger.error('Error updating job:', err);
      setError(`Failed to update job: ${err.message}`);
      throw err;
    }
  };

  const removeJob = async (jobId: string) => {
    try {
      await DatabaseService.deleteJob(jobId);
      logger.info('Job removed:', jobId);
    } catch (err: any) {
      logger.error('Error removing job:', err);
      setError(`Failed to remove job: ${err.message}`);
      throw err;
    }
  };

  const finalizeJob = async (jobId: string) => {
    try {
      const job = getJobById(jobId);
      if (job) {
        await DatabaseService.updateJob({ ...job, finalized: true });
        logger.info('Job finalized:', jobId);
      }
    } catch (err: any) {
      logger.error('Error finalizing job:', err);
      setError(`Failed to finalize job: ${err.message}`);
      throw err;
    }
  };

  const unfinalizeJob = async (jobId: string) => {
    try {
      const job = getJobById(jobId);
      if (job) {
        await DatabaseService.updateJob({ ...job, finalized: false });
        logger.info('Job unfinalized:', jobId);
      }
    } catch (err: any) {
      logger.error('Error unfinalizing job:', err);
      setError(`Failed to unfinalize job: ${err.message}`);
      throw err;
    }
  };

  // Resource actions - all database operations
  const addResource = async (resource: Omit<Resource, 'id'>) => {
    try {
      const newResource = await DatabaseService.createResource(resource);
      logger.info('Resource created:', newResource.name);
    } catch (err: any) {
      logger.error('Error creating resource:', err);
      setError(`Failed to create resource: ${err.message}`);
      throw err;
    }
  };

  const updateResource = async (resource: Resource) => {
    try {
      await DatabaseService.updateResource(resource);
      logger.info('Resource updated:', resource.name);
    } catch (err: any) {
      logger.error('Error updating resource:', err);
      setError(`Failed to update resource: ${err.message}`);
      throw err;
    }
  };

  const removeResource = async (resourceId: string) => {
    try {
      await DatabaseService.deleteResource(resourceId);
      logger.info('Resource removed:', resourceId);
    } catch (err: any) {
      logger.error('Error removing resource:', err);
      setError(`Failed to remove resource: ${err.message}`);
      throw err;
    }
  };

  const toggleResourceOnSite = async (resourceId: string) => {
    try {
      const resource = getResourceById(resourceId);
      if (resource) {
        const updatedResource = { ...resource, onSite: !resource.onSite };
        await DatabaseService.updateResource(updatedResource);
        logger.info('Resource on-site status toggled:', resource.name, 'onSite:', updatedResource.onSite);
      }
    } catch (err: any) {
      logger.error('Error toggling resource on-site status:', err);
      setError(`Failed to update resource: ${err.message}`);
      throw err;
    }
  };

  // Assignment actions - all database operations
  const assignResource = async (resourceId: string, jobId: string, row: RowType, position?: number): Promise<string> => {
    try {
      const job = getJobById(jobId);
      const defaultStartTime = job?.startTime || '07:00';
      
      const newAssignment = await DatabaseService.createAssignment({
        resourceId,
        jobId,
        row,
        position: position || 0,
        timeSlot: { startTime: defaultStartTime, endTime: '15:30', isFullDay: true }
      });
      
      logger.info('Resource assigned:', resourceId, 'to job:', jobId);
      return newAssignment.id;
    } catch (err: any) {
      logger.error('Error assigning resource:', err);
      setError(`Failed to assign resource: ${err.message}`);
      throw err;
    }
  };

  const assignResourceWithTruckConfig = async (
    resourceId: string, 
    jobId: string, 
    row: RowType, 
    truckConfig?: 'flowboy' | 'dump-trailer', 
    position?: number,
    isSecondShift: boolean = false
  ): Promise<string> => {
    try {
      // Check if resource is already assigned to this job to prevent duplicates
      const existingAssignment = assignments.find(a => 
        a.resourceId === resourceId && 
        a.jobId === jobId && 
        !a.attachedTo
      );

      if (existingAssignment) {
        logger.debug('Resource already assigned to this job, returning existing assignment');
        return existingAssignment.id;
      }

      const job = getJobById(jobId);
      const defaultStartTime = job?.startTime || '07:00';
      
      const newAssignment = await DatabaseService.createAssignment({
        resourceId,
        jobId,
        row,
        position: position || 0,
        truckConfig,
        timeSlot: { startTime: defaultStartTime, endTime: '15:30', isFullDay: true }
      });
      
      logger.info('Resource assigned with truck config:', resourceId, 'config:', truckConfig);
      return newAssignment.id;
    } catch (err: any) {
      logger.error('Error assigning resource with truck config:', err);
      setError(`Failed to assign resource: ${err.message}`);
      throw err;
    }
  };

  const updateAssignment = async (assignment: Assignment) => {
    try {
      await DatabaseService.updateAssignment(assignment);
      logger.info('Assignment updated:', assignment.id);
    } catch (err: any) {
      logger.error('Error updating assignment:', err);
      setError(`Failed to update assignment: ${err.message}`);
      throw err;
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      // Get assignment to check for attachments
      const assignment = getAssignmentById(assignmentId);
      if (assignment?.attachments?.length) {
        // Remove all attached assignments first
        await Promise.all(
          assignment.attachments.map(id => DatabaseService.deleteAssignment(id))
        );
      }
      
      await DatabaseService.deleteAssignment(assignmentId);
      logger.info('Assignment removed:', assignmentId);
    } catch (err: any) {
      logger.error('Error removing assignment:', err);
      setError(`Failed to remove assignment: ${err.message}`);
      throw err;
    }
  };

  const updateTimeSlot = async (assignmentId: string, timeSlot: TimeSlot) => {
    try {
      const assignment = getAssignmentById(assignmentId);
      if (assignment) {
        const updatedAssignment = { ...assignment, timeSlot };
        await DatabaseService.updateAssignment(updatedAssignment);
        logger.info('Time slot updated:', assignmentId);
      }
    } catch (err: any) {
      logger.error('Error updating time slot:', err);
      setError(`Failed to update time slot: ${err.message}`);
      throw err;
    }
  };

  const updateAssignmentNote = async (assignmentId: string, note: string) => {
    try {
      const assignment = getAssignmentById(assignmentId);
      if (assignment) {
        const updatedAssignment = { ...assignment, note: note.trim() || undefined };
        await DatabaseService.updateAssignment(updatedAssignment);
        logger.info('Assignment note updated:', assignmentId);
      }
    } catch (err: any) {
      logger.error('Error updating assignment note:', err);
      setError(`Failed to update note: ${err.message}`);
      throw err;
    }
  };

  const attachResources = async (targetId: string, sourceId: string) => {
    try {
      const targetAssignment = getAssignmentById(targetId);
      const sourceAssignment = getAssignmentById(sourceId);
      
      if (targetAssignment && sourceAssignment) {
        // Update source assignment to be attached to target
        const updatedSourceAssignment = {
          ...sourceAssignment,
          attachedTo: targetId,
          position: targetAssignment.position,
          timeSlot: targetAssignment.timeSlot
        };
        
        await DatabaseService.updateAssignment(updatedSourceAssignment);
        logger.info('Resources attached:', sourceId, 'to', targetId);
      }
    } catch (err: any) {
      logger.error('Error attaching resources:', err);
      setError(`Failed to attach resources: ${err.message}`);
      throw err;
    }
  };

  const detachResources = async (assignmentId: string) => {
    try {
      const assignment = getAssignmentById(assignmentId);
      if (!assignment) return;

      if (assignment.attachedTo) {
        // This is an attached assignment - detach it from its parent
        const updatedAssignment = { ...assignment, attachedTo: undefined };
        await DatabaseService.updateAssignment(updatedAssignment);
      } else if (assignment.attachments?.length) {
        // This is a parent - detach all its children
        await Promise.all(
          assignment.attachments.map(async (attachedId) => {
            const attachedAssignment = getAssignmentById(attachedId);
            if (attachedAssignment) {
              const updatedAttached = { ...attachedAssignment, attachedTo: undefined };
              await DatabaseService.updateAssignment(updatedAttached);
            }
          })
        );
      }
      
      logger.info('Resources detached:', assignmentId);
    } catch (err: any) {
      logger.error('Error detaching resources:', err);
      setError(`Failed to detach resources: ${err.message}`);
      throw err;
    }
  };

  const moveAssignmentGroup = async (assignmentGroup: Assignment[], jobId: string, row: RowType, position?: number): Promise<string> => {
    try {
      const primaryAssignment = assignmentGroup[0];
      const attachedAssignments = assignmentGroup.slice(1);
      
      // Get the job to use its default start time
      const job = getJobById(jobId);
      const defaultStartTime = job?.startTime || '07:00';
      
      // Create new primary assignment
      const newPrimaryAssignment = await DatabaseService.createAssignment({
        resourceId: primaryAssignment.resourceId,
        jobId,
        row,
        position,
        timeSlot: {
          startTime: defaultStartTime,
          endTime: '15:30',
          isFullDay: true
        },
        truckConfig: primaryAssignment.truckConfig
      });
      
      // Create new attached assignments
      const newAttachedPromises = attachedAssignments.map(oldAssignment =>
        DatabaseService.createAssignment({
          resourceId: oldAssignment.resourceId,
          jobId,
          row,
          position,
          attachedTo: newPrimaryAssignment.id,
          timeSlot: newPrimaryAssignment.timeSlot
        })
      );
      
      await Promise.all(newAttachedPromises);
      
      // Remove old assignments
      await Promise.all(assignmentGroup.map(a => DatabaseService.deleteAssignment(a.id)));
      
      logger.info('Assignment group moved:', assignmentGroup.length, 'assignments to', jobId);
      return newPrimaryAssignment.id;
    } catch (err: any) {
      logger.error('Error moving assignment group:', err);
      setError(`Failed to move assignments: ${err.message}`);
      throw err;
    }
  };

  const assignResourceWithAttachment = async (resourceId: string, parentAssignmentId: string): Promise<string | null> => {
    try {
      const parentAssignment = getAssignmentById(parentAssignmentId);
      if (!parentAssignment) return null;
      
      // Check if resource is already assigned to the same job/row
      const existingJobRowAssignment = assignments.find(a => 
        a.resourceId === resourceId && 
        a.jobId === parentAssignment.jobId && 
        a.row === parentAssignment.row &&
        !a.attachedTo
      );
      
      if (existingJobRowAssignment) {
        // Convert existing assignment to attached assignment
        const updatedAssignment = {
          ...existingJobRowAssignment,
          attachedTo: parentAssignmentId,
          position: parentAssignment.position,
          timeSlot: parentAssignment.timeSlot
        };
        
        await DatabaseService.updateAssignment(updatedAssignment);
        return existingJobRowAssignment.id;
      }
      
      // Create new assignment already attached to parent
      const newAssignment = await DatabaseService.createAssignment({
        resourceId,
        jobId: parentAssignment.jobId,
        row: parentAssignment.row,
        position: parentAssignment.position,
        attachedTo: parentAssignmentId,
        timeSlot: parentAssignment.timeSlot
      });
      
      logger.info('Resource attached to assignment:', resourceId, 'to', parentAssignmentId);
      return newAssignment.id;
    } catch (err: any) {
      logger.error('Error creating attached assignment:', err);
      setError(`Failed to attach resource: ${err.message}`);
      throw err;
    }
  };

  const cleanupOrphanedData = async () => {
    try {
      // Database foreign key constraints should handle most cleanup automatically
      // This is mainly for local storage cleanup now
      logger.info('Cleanup completed - database constraints handle orphaned data automatically');
    } catch (err: any) {
      logger.error('Error during cleanup:', err);
    }
  };

  // Truck-driver assignment actions
  const assignDriverToTruck = async (truckId: string, driverId: string) => {
    try {
      await DatabaseService.updateTruckDriverAssignment(truckId, driverId);
      logger.info('Driver assigned to truck:', driverId, 'to', truckId);
    } catch (err: any) {
      logger.error('Error assigning driver to truck:', err);
      setError(`Failed to assign driver: ${err.message}`);
      throw err;
    }
  };

  const unassignDriverFromTruck = async (truckId: string) => {
    try {
      await DatabaseService.removeTruckDriverAssignment(truckId);
      logger.info('Driver unassigned from truck:', truckId);
    } catch (err: any) {
      logger.error('Error unassigning driver from truck:', err);
      setError(`Failed to unassign driver: ${err.message}`);
      throw err;
    }
  };

  // Rule management actions - all database operations
  const updateMagnetInteractionRule = async (rule: MagnetInteractionRule) => {
    try {
      await DatabaseService.updateMagnetRule(rule);
      logger.info('Magnet interaction rule updated:', rule.sourceType, '->', rule.targetType);
    } catch (err: any) {
      logger.error('Error updating magnet rule:', err);
      setError(`Failed to update rule: ${err.message}`);
      throw err;
    }
  };

  const updateDropRule = async (rowType: RowType, allowedTypes: ResourceType[]) => {
    try {
      await DatabaseService.updateDropRule(rowType, allowedTypes);
      logger.info('Drop rule updated:', rowType, 'allows:', allowedTypes);
    } catch (err: any) {
      logger.error('Error updating drop rule:', err);
      setError(`Failed to update drop rule: ${err.message}`);
      throw err;
    }
  };

  const updateJobRowConfig = async (config: JobRowConfig) => {
    try {
      await DatabaseService.updateJobRowConfig(config);
      logger.info('Job row config updated:', config.jobId, config.rowType);
    } catch (err: any) {
      logger.error('Error updating job row config:', err);
      setError(`Failed to update row config: ${err.message}`);
      throw err;
    }
  };

  const splitJobRow = async (jobId: string, rowType: RowType, box1Name: string, box2Name: string) => {
    try {
      const newConfig: JobRowConfig = {
        jobId,
        rowType,
        isSplit: true,
        boxes: [
          {
            id: `${jobId}-${rowType}-box1`,
            name: box1Name,
            allowedTypes: ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck'],
            maxCount: 10,
            attachmentRules: []
          },
          {
            id: `${jobId}-${rowType}-box2`,
            name: box2Name,
            allowedTypes: ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'],
            maxCount: 10,
            attachmentRules: []
          }
        ]
      };
      
      await updateJobRowConfig(newConfig);
    } catch (err: any) {
      logger.error('Error splitting job row:', err);
      setError(`Failed to split row: ${err.message}`);
      throw err;
    }
  };

  const unsplitJobRow = async (jobId: string, rowType: RowType) => {
    try {
      // Remove the job row config from database
      const { error } = await supabase
        .from('job_row_configs')
        .delete()
        .eq('job_id', jobId)
        .eq('row_type', rowType);
      
      if (error) throw error;
      
      logger.info('Job row unsplit:', jobId, rowType);
    } catch (err: any) {
      logger.error('Error unsplitting job row:', err);
      setError(`Failed to unsplit row: ${err.message}`);
      throw err;
    }
  };

  // Row override actions (these stay local as they're UI-specific)
  const toggleRowEnabled = (jobId: string, rowType: RowType) => {
    const existingOverride = rowOverrides.find(
      o => o.jobId === jobId && o.rowType === rowType
    );
    
    if (existingOverride) {
      setRowOverrides(rowOverrides.map(o => 
        (o.jobId === jobId && o.rowType === rowType)
          ? { ...o, enabled: !o.enabled }
          : o
      ));
    } else {
      setRowOverrides([
        ...rowOverrides,
        { jobId, rowType, enabled: false }
      ]);
    }
  };

  const isRowEnabled = (jobId: string, rowType: RowType): boolean => {
    const override = rowOverrides.find(
      o => o.jobId === jobId && o.rowType === rowType
    );
    
    if (override !== undefined) {
      return override.enabled;
    }
    
    const job = getJobById(jobId);
    if (job) {
      return isRowNeededForJobType(rowType, job.type);
    }
    
    return true;
  };

  // Helper functions (computed from state)
  const getResourcesByAssignment = (jobId: string, row: RowType) => {
    if (jobId && row) {
      return assignments.filter(a => a.jobId === jobId && a.row === row);
    }
    return assignments;
  };

  const getAvailableResources = () => {
    return resources.filter(r => {
      if (searchTerm && !r.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !r.identifier?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      if (filteredResourceType && r.type !== filteredResourceType) {
        return false;
      }
      
      return true;
    });
  };

  const getResourceById = (id: string) => {
    return resources.find(r => r.id === id);
  };

  const getJobById = (id: string) => {
    return jobs.find(j => j.id === id);
  };

  const getAssignmentById = (id: string) => {
    return assignments.find(a => a.id === id);
  };

  const getAssignmentByResource = (resourceId: string) => {
    return assignments.find(a => a.resourceId === resourceId);
  };

  const getAttachedAssignments = (assignmentId: string) => {
    return assignments.filter(a => a.attachedTo === assignmentId);
  };

  const hasMultipleJobAssignments = (resourceId: string) => {
    const resourceAssignments = assignments.filter(a => a.resourceId === resourceId);
    const uniqueJobIds = new Set(resourceAssignments.map(a => a.jobId));
    return uniqueJobIds.size > 1;
  };

  const getResourceOtherAssignments = (resourceId: string, excludeAssignmentId: string) => {
    return assignments.filter(a => 
      a.resourceId === resourceId && a.id !== excludeAssignmentId
    );
  };

  const hasTimeConflict = (resourceId: string, timeSlot: TimeSlot, excludeAssignmentId?: string) => {
    const resourceAssignments = assignments.filter(a => 
      a.resourceId === resourceId && (!excludeAssignmentId || a.id !== excludeAssignmentId)
    );
    return resourceAssignments.length > 0;
  };

  const getJobNotes = (jobId: string) => {
    return assignments
      .filter(a => a.jobId === jobId && a.note && a.note.trim())
      .map(assignment => {
        const resource = getResourceById(assignment.resourceId);
        return {
          assignment,
          resource: resource!,
          note: assignment.note!
        };
      })
      .filter(item => item.resource);
  };

  const isWorkingDouble = (resourceId: string) => {
    const resourceAssignments = assignments.filter(a => a.resourceId === resourceId);
    const jobIds = resourceAssignments.map(a => a.jobId);
    const resourceJobs = jobIds.map(id => getJobById(id)).filter(Boolean) as Job[];
    
    const hasDayJob = resourceJobs.some(job => job.shift === 'day');
    const hasNightJob = resourceJobs.some(job => job.shift === 'night');
    
    return hasDayJob && hasNightJob;
  };

  const getResourceDoubleShiftJobs = (resourceId: string) => {
    const resourceAssignments = assignments.filter(a => a.resourceId === resourceId);
    const jobIds = resourceAssignments.map(a => a.jobId);
    const resourceJobs = jobIds.map(id => getJobById(id)).filter(Boolean) as Job[];
    
    const dayJob = resourceJobs.find(job => job.shift === 'day');
    const nightJob = resourceJobs.find(job => job.shift === 'night');
    
    return { dayJob, nightJob };
  };

  const getTruckDriver = (truckId: string): Resource | undefined => {
    const driverId = truckDriverAssignments[truckId];
    if (!driverId) return undefined;
    return getResourceById(driverId);
  };

  const getDriverTruck = (driverId: string): Resource | undefined => {
    const truckId = Object.keys(truckDriverAssignments).find(
      key => truckDriverAssignments[key] === driverId
    );
    if (!truckId) return undefined;
    return getResourceById(truckId);
  };

  // Rule helper functions
  const getMagnetInteractionRule = (sourceType: ResourceType, targetType: ResourceType) => {
    return magnetInteractionRules.find(r => r.sourceType === sourceType && r.targetType === targetType);
  };

  const getRequiredAttachmentsForType = (targetType: ResourceType): ResourceType[] => {
    return magnetInteractionRules
      .filter(r => r.targetType === targetType && r.isRequired)
      .map(r => r.sourceType);
  };

  const getMaxAttachmentsForType = (sourceType: ResourceType, targetType: ResourceType): number => {
    const rule = magnetInteractionRules.find(r => r.sourceType === sourceType && r.targetType === targetType);
    return rule?.maxCount || 0;
  };

  const canMagnetAttachTo = (sourceType: ResourceType, targetType: ResourceType): boolean => {
    const rule = magnetInteractionRules.find(r => r.sourceType === sourceType && r.targetType === targetType);
    return rule?.canAttach || false;
  };

  const getDropRule = (rowType: RowType): ResourceType[] => {
    const rule = dropRules.find(r => r.rowType === rowType);
    return rule?.allowedTypes || [];
  };

  const canDropOnRow = (resourceType: ResourceType, rowType: RowType): boolean => {
    const allowedTypes = getDropRule(rowType);
    return allowedTypes.includes(resourceType);
  };

  const getJobRowConfig = (jobId: string, rowType: RowType) => {
    return jobRowConfigs.find(c => c.jobId === jobId && c.rowType === rowType);
  };

  // Refresh data function
  const refreshData = async () => {
    await loadScheduleData();
  };

  const value: SchedulerContextType = {
    jobs,
    resources,
    assignments,
    rowOverrides,
    truckDriverAssignments,
    selectedDate,
    filteredResourceType,
    searchTerm,
    magnetInteractionRules,
    dropRules,
    jobRowConfigs,
    isLoading,
    error,
    
    // Job actions
    addJob,
    updateJob,
    removeJob,
    finalizeJob,
    unfinalizeJob,
    
    // Resource actions
    addResource,
    updateResource,
    removeResource,
    toggleResourceOnSite,
    
    // Assignment actions
    assignResource,
    assignResourceWithTruckConfig,
    assignResourceWithAttachment,
    updateAssignment,
    removeAssignment,
    updateTimeSlot,
    updateAssignmentNote,
    cleanupOrphanedData,
    attachResources,
    detachResources,
    moveAssignmentGroup,
    
    // Row override actions
    toggleRowEnabled,
    isRowEnabled,
    
    // Filter actions
    setSelectedDate,
    setFilteredResourceType,
    setSearchTerm,
    
    // Truck-driver assignment actions
    assignDriverToTruck,
    unassignDriverFromTruck,
    getTruckDriver,
    getDriverTruck,
    
    // Helper functions
    getResourcesByAssignment,
    getAvailableResources,
    getResourceById,
    getJobById,
    getAssignmentById,
    getAssignmentByResource,
    getAttachedAssignments,
    hasMultipleJobAssignments,
    getResourceOtherAssignments,
    hasTimeConflict,
    getJobNotes,
    isWorkingDouble,
    getResourceDoubleShiftJobs,
    
    // Rule management actions
    updateMagnetInteractionRule,
    getMagnetInteractionRule,
    getRequiredAttachmentsForType,
    getMaxAttachmentsForType,
    canMagnetAttachTo,
    updateDropRule,
    getDropRule,
    canDropOnRow,
    
    // Job row config actions
    updateJobRowConfig,
    getJobRowConfig,
    splitJobRow,
    unsplitJobRow,
    
    // Data management
    refreshData
  };

  return (
    <SchedulerContext.Provider value={value}>
      {children}
    </SchedulerContext.Provider>
  );
};

export const useScheduler = () => {
  const context = useContext(SchedulerContext);
  
  if (context === undefined) {
    throw new Error('useScheduler must be used within a SchedulerProvider');
  }
  
  return context;
};