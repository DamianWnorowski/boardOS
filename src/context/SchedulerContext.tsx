import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Job, Resource, Assignment, RowType, RowOverride, TimeSlot, ResourceType, MagnetInteractionRule, DropRule, JobRowConfig, ViewType } from '../types';
import { convertPersonnelToResources, convertEquipmentToResources } from '../data/resourceData';
import { isRowNeededForJobType } from '../utils/jobUtils';
import { logger } from '../utils/logger';
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
  currentView: ViewType;
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
  setCurrentView: (view: ViewType) => void;
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
  const [currentView, setCurrentViewState] = useState<ViewType>(() => {
    // Load from localStorage or default to 'day'
    const saved = localStorage.getItem('boardOS-view');
    return (saved as ViewType) || 'day';
  });
  const [filteredResourceType, setFilteredResourceType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPopulatedResources, setHasPopulatedResources] = useState<boolean>(false);

  // Use centralized color system
  const resourceColors = React.useMemo(() => getLegacyResourceColors(), []);

  // Load all data from database - with loading state for initial load
  const loadScheduleData = useCallback(async (showLoading = true, forDate?: Date) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      // Load jobs for specific date or all jobs
      let jobsData: Job[];
      let scheduleData: any; // Declare at function scope
      
      if (forDate && currentView === 'day') {
        // Load jobs only for the selected date in day view
        jobsData = await DatabaseService.getJobsByDate(forDate);
        // Load resources, assignments, etc. for day view
        scheduleData = await DatabaseService.getAllScheduleData();
        setResources(scheduleData.resources);
        setAssignments(scheduleData.assignments);
        setMagnetInteractionRules(scheduleData.magnetRules);
        setDropRules(scheduleData.dropRules);
      } else {
        // Load all jobs for week/month view or when no specific date
        scheduleData = await DatabaseService.getAllScheduleData();
        jobsData = scheduleData.jobs;
        setResources(scheduleData.resources);
        setAssignments(scheduleData.assignments);
        setMagnetInteractionRules(scheduleData.magnetRules);
        setDropRules(scheduleData.dropRules);
      }
      
      setJobs(jobsData);

      // Load truck driver assignments
      const truckDriverData = await DatabaseService.getTruckDriverAssignments();
      setTruckDriverAssignments(truckDriverData);

      // Load job row configs
      const jobRowConfigData = await DatabaseService.getJobRowConfigs();
      setJobRowConfigs(jobRowConfigData);

      // Set rules and colors in magnetManager BEFORE creating magnets
      magnetManager.setRulesAndColors(scheduleData.magnetRules, resourceColors);

      // Initialize magnets from loaded resources
      magnetManager.clear(); // Clear existing magnets
      scheduleData.resources.forEach(resource => {
        magnetManager.createMagnet(
          resource.id,
          resource.type,
          resource.name,
          resource.identifier,
          resource.model
        );
      });

      logger.info('Schedule data loaded from database', {
        jobs: scheduleData.jobs.length,
        resources: scheduleData.resources.length,
        assignments: scheduleData.assignments.length,
        rules: scheduleData.magnetRules.length,
        magnets: magnetManager.magnets.size
      });

    } catch (err: any) {
      logger.error('Error loading schedule data:', err);
      setError(err.message || 'Failed to load schedule data');
      
      // Fallback to default data if database is not available
      const fallbackResources = [...convertPersonnelToResources(), ...convertEquipmentToResources()];
      const fallbackRules = buildStandardConstructionRules();
      setResources(fallbackResources);
      setMagnetInteractionRules(fallbackRules);
      setDropRules(buildStandardDropRules());
      
      // Set rules and colors in magnetManager BEFORE creating magnets
      magnetManager.setRulesAndColors(fallbackRules, resourceColors);
      
      // Initialize magnets from fallback resources
      magnetManager.clear();
      fallbackResources.forEach(resource => {
        magnetManager.createMagnet(
          resource.id,
          resource.type,
          resource.name,
          resource.identifier,
          resource.model
        );
      });
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  // Reload data when selected date changes in day view
  useEffect(() => {
    if (currentView === 'day') {
      loadScheduleData(false, selectedDate); // Don't show loading spinner for date changes
    }
  }, [selectedDate, currentView, loadScheduleData]);

  // Check if resources need to be populated from the data files
  const checkAndPopulateResources = useCallback(async () => {
    // Prevent multiple population attempts
    if (hasPopulatedResources) {
      logger.debug('Resources already populated, skipping');
      return;
    }

    try {
      logger.debug('Checking if resources need to be populated...');
      const { data: existingResources, error } = await supabase
        .from('resources')
        .select('id')
        .limit(50); // Check for substantial data

      if (error) {
        logger.error('Error checking existing resources:', error);
        return;
      }

      logger.debug('Existing resources check result:', { count: existingResources?.length || 0 });

      // Only populate if we have fewer than 50 resources to avoid duplicates
      if (!existingResources || existingResources.length < 50) {
        logger.info('No resources found in database, populating from data files...');
        
        // Mark as started to prevent concurrent runs
        setHasPopulatedResources(true);
        
        const personnelResources = convertPersonnelToResources();
        const equipmentResources = convertEquipmentToResources();
        const allResources = [...personnelResources, ...equipmentResources];

        logger.debug('Resources to insert:', {
          personnelCount: personnelResources.length,
          equipmentCount: equipmentResources.length,
          totalCount: allResources.length
        });

        // Insert all resources in one operation to avoid partial inserts
        let insertedCount = 0;

        const { error: insertError } = await supabase
          .from('resources')
          .insert(allResources.map(resource => ({
            type: resource.type,
            class_type: resource.classType,
            name: resource.name,
            identifier: resource.identifier,
            model: resource.model,
            vin: resource.vin,
            location: resource.location,
            on_site: resource.onSite || false
          })));

        if (insertError) {
          logger.error('Error inserting resources:', insertError);
          setHasPopulatedResources(false); // Reset flag on error
        } else {
          insertedCount = allResources.length;
          logger.info('Successfully inserted all resources:', { count: insertedCount });
          // Reload data to get the newly inserted resources
          await loadScheduleData();
        }

      } else {
        logger.debug('Resources already exist in database, skipping population');
        setHasPopulatedResources(true); // Mark as completed since resources exist
      }
    } catch (err) {
      logger.error('Error in checkAndPopulateResources:', err);
      setHasPopulatedResources(false); // Reset flag on error
    }
  }, [loadScheduleData, hasPopulatedResources]);

  // Check and populate resources after initial load with debouncing
  useEffect(() => {
    // Only run if not loading, no error, no resources, and haven't populated yet
    if (!isLoading && !error && resources.length === 0 && !hasPopulatedResources) {
      // Add a small delay to prevent rapid-fire execution
      const timer = setTimeout(() => {
        checkAndPopulateResources();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, error, resources.length, hasPopulatedResources, checkAndPopulateResources]);

  // Set up real-time subscriptions
  useEffect(() => {
    logger.info('🔄 Setting up real-time subscriptions...');
    const cleanup = DatabaseService.subscribeToScheduleChanges({
      onResourceChange: (payload) => {
        logger.info('📡 Real-time resource change received:', payload);
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
        logger.info('📡 Real-time job change received:', payload);
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
        logger.info('📡 Real-time assignment change received:', payload);
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
      },
      onRuleChange: (payload) => {
        logger.info('📡 Real-time rule change received:', payload);
        if (payload.eventType === 'INSERT') {
          setMagnetInteractionRules(prev => [...prev, DatabaseService.transformDbMagnetRule(payload.new)]);
        } else if (payload.eventType === 'UPDATE') {
          setMagnetInteractionRules(prev => prev.map(r => 
            r.id === payload.new.id ? DatabaseService.transformDbMagnetRule(payload.new) : r
          ));
        } else if (payload.eventType === 'DELETE') {
          setMagnetInteractionRules(prev => prev.filter(r => r.id !== payload.old.id));
        }
      },
      onDropRuleChange: (payload) => {
        logger.info('📡 Real-time drop rule change received:', payload);
        if (payload.eventType === 'INSERT') {
          setDropRules(prev => [...prev, DatabaseService.transformDbDropRule(payload.new)]);
        } else if (payload.eventType === 'UPDATE') {
          setDropRules(prev => prev.map(r => 
            r.id === payload.new.id ? DatabaseService.transformDbDropRule(payload.new) : r
          ));
        } else if (payload.eventType === 'DELETE') {
          setDropRules(prev => prev.filter(r => r.id !== payload.old.id));
        }
      },
      onJobRowConfigChange: (payload) => {
        logger.info('📡 Real-time job row config change received:', payload);
        loadScheduleData(false); // Background reload without loading state
      },
      onTruckDriverAssignmentChange: (payload) => {
        logger.info('📡 Real-time truck driver assignment change received:', payload);
        // Reload truck driver assignments
        DatabaseService.getTruckDriverAssignments().then(data => {
          setTruckDriverAssignments(data);
        });
      }
    });

    return cleanup;
  }, [loadScheduleData]);

  // Update magnetManager with current rules and colors
  useEffect(() => {
    magnetManager.setRulesAndColors(magnetInteractionRules, resourceColors);
  }, [magnetInteractionRules, resourceColors]);

  // Job actions - all database operations
  const addJob = async (job: Omit<Job, 'id'>) => {
    try {
      const newJob = await DatabaseService.createJob(job);
      logger.info('Job created:', newJob.name);
      // Reload data to include the new job
      await loadScheduleData(false);
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
        // Optimistic update
        setJobs(prev => prev.map(j => 
          j.id === jobId ? { ...j, finalized: true } : j
        ));
        
        await DatabaseService.updateJob({ ...job, finalized: true });
        logger.info('Job finalized:', jobId);
      }
    } catch (err: any) {
      logger.error('Error finalizing job:', err);
      // Revert optimistic update on error
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, finalized: false } : j
      ));
      setError(`Failed to finalize job: ${err.message}`);
      throw err;
    }
  };

  const unfinalizeJob = async (jobId: string) => {
    try {
      const job = getJobById(jobId);
      if (job) {
        // Optimistic update
        setJobs(prev => prev.map(j => 
          j.id === jobId ? { ...j, finalized: false } : j
        ));
        
        await DatabaseService.updateJob({ ...job, finalized: false });
        logger.info('Job unfinalized:', jobId);
      }
    } catch (err: any) {
      logger.error('Error unfinalizing job:', err);
      // Revert optimistic update on error
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, finalized: true } : j
      ));
      setError(`Failed to unfinalize job: ${err.message}`);
      throw err;
    }
  };

  // Resource actions - all database operations
  const addResource = async (resource: Omit<Resource, 'id'>) => {
    try {
      const newResource = await DatabaseService.createResource(resource);
      logger.info('Resource created:', newResource.name);
      // Reload data to include the new resource
      await loadScheduleData(false);
      return newResource;
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
      // BUT allow second shift assignments (shift+drag)
      if (!isSecondShift) {
        const existingAssignment = assignments.find(a => 
          a.resourceId === resourceId && 
          a.jobId === jobId && 
          !a.attachedTo
        );

        if (existingAssignment) {
          logger.debug('Resource already assigned to this job, returning existing assignment');
          return existingAssignment.id;
        }
      } else {
        logger.debug('Second shift assignment - allowing duplicate resource on same job');
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
      
      logger.info('✅ Resource assigned with truck config:', resourceId, 'config:', truckConfig, 'assignment ID:', newAssignment.id);
      
      // Force immediate UI update
      setAssignments(prev => {
        logger.info('📝 Manually adding assignment to state:', newAssignment);
        return [...prev, newAssignment];
      });
      
      // Also trigger a background refresh after a short delay to ensure consistency
      setTimeout(() => {
        logger.info('🔄 Background refresh...');
        loadScheduleData(false); // false = no loading state
      }, 1000);
      
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
      
      // Optimistic update - remove from local state immediately
      logger.info('🚀 Optimistic update: removing assignment', assignmentId);
      const attachmentIds = assignment?.attachments || [];
      
      setAssignments(prev => {
        // Remove the assignment and all its attachments
        const idsToRemove = [assignmentId, ...attachmentIds];
        const filtered = prev.filter(a => !idsToRemove.includes(a.id));
        
        // Also remove this assignment from any parent's attachments array
        return filtered.map(a => {
          if (a.attachments?.includes(assignmentId)) {
            return {
              ...a,
              attachments: a.attachments.filter(id => id !== assignmentId)
            };
          }
          return a;
        });
      });
      
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
      // Revert optimistic update on error
      await loadScheduleData(false);
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
        // Check equipment permissions before allowing attachment
        const sourceResource = getResourceById(sourceAssignment.resourceId);
        const targetResource = getResourceById(targetAssignment.resourceId);
        
        if (sourceResource && targetResource && sourceResource.type === 'operator') {
          if (!canOperatorUseEquipment(sourceResource.id, targetResource.type)) {
            const errorMsg = `Operator ${sourceResource.name} is not authorized to operate ${targetResource.type} equipment`;
            logger.warn('Equipment permission denied:', errorMsg);
            setError(errorMsg);
            return;
          }
        }
        // Update source assignment to be attached to target
        const updatedSourceAssignment = {
          ...sourceAssignment,
          attachedTo: targetId,
          position: targetAssignment.position,
          timeSlot: targetAssignment.timeSlot
        };
        
        // Optimistic update - update local state immediately
        logger.info('🚀 Optimistic update: attaching', sourceId, 'to', targetId);
        setAssignments(prev => {
          const updated = prev.map(a => {
            if (a.id === sourceId) {
              logger.info('🚀 Updating source assignment:', sourceId);
              return updatedSourceAssignment;
            }
            if (a.id === targetId) {
              logger.info('🚀 Adding attachment to target:', targetId);
              return {
                ...a,
                attachments: [...(a.attachments || []), sourceId]
              };
            }
            return a;
          });
          logger.info('🚀 Assignments after optimistic update:', updated.length, 'total');
          return updated;
        });
        
        await DatabaseService.updateAssignment(updatedSourceAssignment);
        logger.info('Resources attached:', sourceId, 'to', targetId);
      }
    } catch (err: any) {
      logger.error('Error attaching resources:', err);
      setError(`Failed to attach resources: ${err.message}`);
      // Revert optimistic update on error by refreshing data
      await loadScheduleData(false);
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
      
      // Create temporary IDs for optimistic update
      const tempPrimaryId = `temp-move-${Date.now()}-${primaryAssignment.resourceId}`;
      const tempAttachedIds = attachedAssignments.map((a, i) => 
        `temp-move-${Date.now()}-${a.resourceId}-${i}`
      );
      
      // Optimistic update - remove old assignments and add new ones
      logger.info('🚀 Optimistic update: moving assignment group', assignmentGroup.map(a => a.id), 'to', jobId);
      
      setAssignments(prev => {
        // Remove old assignments
        const oldIds = assignmentGroup.map(a => a.id);
        const filtered = prev.filter(a => !oldIds.includes(a.id));
        
        // Add new temporary assignments
        const newPrimary: Assignment = {
          id: tempPrimaryId,
          resourceId: primaryAssignment.resourceId,
          jobId,
          row,
          position,
          timeSlot: {
            startTime: defaultStartTime,
            endTime: '15:30',
            isFullDay: true
          },
          truckConfig: primaryAssignment.truckConfig,
          attachments: tempAttachedIds
        };
        
        const newAttached = attachedAssignments.map((oldAssignment, i) => ({
          id: tempAttachedIds[i],
          resourceId: oldAssignment.resourceId,
          jobId,
          row,
          position,
          attachedTo: tempPrimaryId,
          timeSlot: newPrimary.timeSlot,
          attachments: []
        }));
        
        return [...filtered, newPrimary, ...newAttached];
      });
      
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
      
      const newAttachedAssignments = await Promise.all(newAttachedPromises);
      
      // Replace temporary IDs with real ones
      setAssignments(prev => prev.map(a => {
        if (a.id === tempPrimaryId) {
          return {
            ...newPrimaryAssignment,
            attachments: newAttachedAssignments.map(att => att.id)
          };
        }
        const tempIndex = tempAttachedIds.indexOf(a.id);
        if (tempIndex !== -1) {
          return newAttachedAssignments[tempIndex];
        }
        return a;
      }));
      
      // Remove old assignments from database
      await Promise.all(assignmentGroup.map(a => DatabaseService.deleteAssignment(a.id)));
      
      logger.info('Assignment group moved:', assignmentGroup.length, 'assignments to', jobId);
      return newPrimaryAssignment.id;
    } catch (err: any) {
      logger.error('Error moving assignment group:', err);
      setError(`Failed to move assignments: ${err.message}`);
      // Revert optimistic update on error
      await loadScheduleData(false);
      throw err;
    }
  };

  const assignResourceWithAttachment = async (resourceId: string, parentAssignmentId: string): Promise<string | null> => {
    try {
      const parentAssignment = getAssignmentById(parentAssignmentId);
      if (!parentAssignment) return null;

      // Check equipment permissions before allowing attachment
      const sourceResource = getResourceById(resourceId);
      const parentResource = getResourceById(parentAssignment.resourceId);
      
      if (sourceResource && parentResource && sourceResource.type === 'operator') {
        if (!canOperatorUseEquipment(sourceResource.id, parentResource.type)) {
          const errorMsg = `Operator ${sourceResource.name} is not authorized to operate ${parentResource.type} equipment`;
          logger.warn('Equipment permission denied:', errorMsg);
          setError(errorMsg);
          return null;
        }
      }
      
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
        
        // Optimistic update for existing assignment
        logger.info('🚀 Optimistic update: converting existing assignment to attached', existingJobRowAssignment.id);
        setAssignments(prev => prev.map(a => {
          if (a.id === existingJobRowAssignment.id) {
            logger.info('🚀 Converting to attached assignment:', existingJobRowAssignment.id);
            return updatedAssignment;
          }
          if (a.id === parentAssignmentId) {
            logger.info('🚀 Adding attachment to parent:', parentAssignmentId);
            return {
              ...a,
              attachments: [...(a.attachments || []), existingJobRowAssignment.id]
            };
          }
          return a;
        }));
        
        await DatabaseService.updateAssignment(updatedAssignment);
        return existingJobRowAssignment.id;
      }
      
      // Create temporary ID for optimistic update
      const tempId = `temp-${Date.now()}-${resourceId}`;
      const optimisticAssignment: Assignment = {
        id: tempId,
        resourceId,
        jobId: parentAssignment.jobId,
        row: parentAssignment.row,
        position: parentAssignment.position,
        attachedTo: parentAssignmentId,
        timeSlot: parentAssignment.timeSlot,
        attachments: []
      };
      
      // Optimistic update for new assignment
      logger.info('🚀 Optimistic update: creating new attached assignment with temp ID:', tempId);
      setAssignments(prev => [
        ...prev.map(a => {
          if (a.id === parentAssignmentId) {
            logger.info('🚀 Adding temp attachment to parent:', parentAssignmentId);
            return {
              ...a,
              attachments: [...(a.attachments || []), tempId]
            };
          }
          return a;
        }),
        optimisticAssignment
      ]);
      
      // Create new assignment already attached to parent
      const newAssignment = await DatabaseService.createAssignment({
        resourceId,
        jobId: parentAssignment.jobId,
        row: parentAssignment.row,
        position: parentAssignment.position,
        attachedTo: parentAssignmentId,
        timeSlot: parentAssignment.timeSlot
      });
      
      // Replace temporary assignment with real one
      setAssignments(prev => prev.map(a => {
        if (a.id === tempId) {
          return { ...newAssignment, attachments: [] };
        }
        if (a.id === parentAssignmentId) {
          return {
            ...a,
            attachments: a.attachments?.map(id => id === tempId ? newAssignment.id : id) || []
          };
        }
        return a;
      }));
      
      logger.info('Resource attached to assignment:', resourceId, 'to', parentAssignmentId);
      return newAssignment.id;
    } catch (err: any) {
      logger.error('Error creating attached assignment:', err);
      setError(`Failed to attach resource: ${err.message}`);
      // Revert optimistic update on error
      await loadScheduleData(false);
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

  // Equipment permission validation
  const canOperatorUseEquipment = (operatorId: string, equipmentType: ResourceType): boolean => {
    const operator = getResourceById(operatorId);
    if (!operator || operator.type !== 'operator') return true; // Non-operators or missing resources default to allowed
    
    // Check if operator has allowedEquipment permissions
    const allowedEquipment = operator.allowedEquipment;
    if (!allowedEquipment || allowedEquipment.length === 0) {
      // If no permissions set, allow all equipment (backward compatibility)
      return true;
    }
    
    // Check if the equipment type is in the allowed list
    return allowedEquipment.includes(equipmentType);
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

  // View management with localStorage persistence
  const setCurrentView = useCallback((view: ViewType) => {
    setCurrentViewState(view);
    localStorage.setItem('boardOS-view', view);
  }, []);

  // Refresh data function - background refresh without loading state
  const refreshData = async () => {
    await loadScheduleData(false);
  };

  const value: SchedulerContextType = {
    jobs,
    resources,
    assignments,
    rowOverrides,
    truckDriverAssignments,
    selectedDate,
    currentView,
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
    setCurrentView,
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