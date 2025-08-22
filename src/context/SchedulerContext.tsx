import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Job, Resource, Assignment, RowType, RowOverride, TimeSlot, ResourceType, MagnetInteractionRule, DropRule, JobRowConfig } from '../types';
import { mockJobs, mockResources, mockAssignments } from '../data/mockData';
import { convertPersonnelToResources, convertEquipmentToResources } from '../data/resourceData';
import { isRowNeededForJobType } from '../utils/jobUtils';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { magnetManager } from '../classes/Magnet';
import { buildStandardConstructionRules, buildStandardDropRules } from '../utils/ruleCreator';

// Deep equality comparison utility
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  // Handle arrays
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  // Handle objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
};

// Safe wrappers for localStorage access to support non-browser environments
const safeLocalStorage = {
  getItem: (key: string) =>
    typeof window !== 'undefined' ? window.localStorage.getItem(key) : null,
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  }
};

interface SchedulerContextType {
  jobs: Job[];
  resources: Resource[];
  assignments: Assignment[];
  rowOverrides: RowOverride[];
  selectedDate: Date;
  filteredResourceType: string | null;
  searchTerm: string;
  truckDriverAssignments: Record<string, string>; // truckId -> driverId
  magnetInteractionRules: MagnetInteractionRule[];
  dropRules: DropRule[];
  jobRowConfigs: JobRowConfig[];
  
  // Job actions
  addJob: (job: Omit<Job, 'id'>) => void;
  updateJob: (job: Job) => void;
  removeJob: (jobId: string) => void;
  finalizeJob: (jobId: string) => void;
  unfinalizeJob: (jobId: string) => void;
  
  // Resource actions
  addResource: (resource: Omit<Resource, 'id'>) => void;
  updateResource: (resource: Resource) => void;
  removeResource: (resourceId: string) => void;
  toggleResourceOnSite: (resourceId: string) => void;
  
  // Assignment actions
  assignResource: (resourceId: string, jobId: string, row: RowType, position?: number) => string;
  assignResourceWithTruckConfig: (resourceId: string, jobId: string, row: RowType, truckConfig?: 'flowboy' | 'dump-trailer', position?: number) => string;
  updateAssignment: (assignment: Assignment) => void;
  removeAssignment: (assignmentId: string) => void;
  attachResources: (targetId: string, sourceId: string) => void;
  detachResources: (assignmentId: string) => void;
  updateTimeSlot: (assignmentId: string, timeSlot: TimeSlot) => void;
  updateAssignmentNote: (assignmentId: string, note: string) => void;
  cleanupOrphanedData: () => void;
  
  // Row override actions
  toggleRowEnabled: (jobId: string, rowType: RowType) => void;
  isRowEnabled: (jobId: string, rowType: RowType) => boolean;
  
  // Combined actions
  
  // Combined actions
  moveAssignmentGroup,
  assignResourceWithAttachment,
  
  // Filter actions
  setSelectedDate: (date: Date) => void;
  setFilteredResourceType: (type: string | null) => void;
  setSearchTerm: (term: string) => void;
  
  // Truck-driver assignment actions
  assignDriverToTruck: (truckId: string, driverId: string) => void;
  unassignDriverFromTruck: (truckId: string) => void;
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
  updateMagnetInteractionRule: (rule: MagnetInteractionRule) => void;
  getMagnetInteractionRule: (sourceType: ResourceType, targetType: ResourceType) => MagnetInteractionRule | undefined;
  getRequiredAttachmentsForType: (targetType: ResourceType) => ResourceType[];
  getMaxAttachmentsForType: (sourceType: ResourceType, targetType: ResourceType) => number;
  canMagnetAttachTo: (sourceType: ResourceType, targetType: ResourceType) => boolean;
  updateDropRule: (rowType: RowType, allowedTypes: ResourceType[]) => void;
  getDropRule: (rowType: RowType) => ResourceType[];
  canDropOnRow: (resourceType: ResourceType, rowType: RowType) => boolean;
  
  // Job row config actions
  updateJobRowConfig: (config: JobRowConfig) => void;
  getJobRowConfig: (jobId: string, rowType: RowType) => JobRowConfig | undefined;
  splitJobRow: (jobId: string, rowType: RowType, box1Name: string, box2Name: string) => void;
  unsplitJobRow: (jobId: string, rowType: RowType) => void;
}

export const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

// Default test job
const testJob: Job = {
  id: `job-${uuidv4()}`,
  name: 'Test Job',
  type: 'paving',
  shift: 'day',
  notes: 'This is a test job'
};

// Use the modular rule creator to build default rules
const defaultMagnetInteractionRules: MagnetInteractionRule[] = buildStandardConstructionRules();
const defaultDropRules: DropRule[] = buildStandardDropRules();

export const SchedulerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>([testJob]);
  const [resources, setResources] = useState<Resource[]>([
    ...convertPersonnelToResources(),
    ...convertEquipmentToResources()
  ]);
  const [assignments, setAssignments] = useState<Assignment[]>(mockAssignments);
  const [rowOverrides, setRowOverrides] = useState<RowOverride[]>([]);
  const [truckDriverAssignments, setTruckDriverAssignments] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filteredResourceType, setFilteredResourceType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [magnetInteractionRules, setMagnetInteractionRules] = useState<MagnetInteractionRule[]>(defaultMagnetInteractionRules);
  const [dropRules, setDropRules] = useState<DropRule[]>(defaultDropRules);
  const [jobRowConfigs, setJobRowConfigs] = useState<JobRowConfig[]>([]);

  // Store previous state for deep comparison
  const previousStateRef = useRef<any>(null);

  // Stable resource colors object to prevent unnecessary re-renders
  const resourceColors = React.useMemo(() => ({
    operator: { color: 'bg-white', borderColor: 'border-gray-400' },
    driver: { color: 'bg-green-500', borderColor: 'border-green-700' },
    privateDriver: { color: 'bg-red-500', borderColor: 'border-red-700' },
    laborer: { color: 'bg-white', borderColor: 'border-green-600' },
    striper: { color: 'bg-white', borderColor: 'border-blue-600' },
    foreman: { color: 'bg-orange-500', borderColor: 'border-orange-700' },
    truck: { color: 'bg-black text-white', borderColor: 'border-gray-300' },
    skidsteer: { color: 'bg-yellow-400', borderColor: 'border-yellow-600' },
    paver: { color: 'bg-yellow-400', borderColor: 'border-yellow-600' },
    excavator: { color: 'bg-yellow-400', borderColor: 'border-yellow-600' },
    sweeper: { color: 'bg-yellow-400', borderColor: 'border-yellow-600' },
    millingMachine: { color: 'bg-yellow-400', borderColor: 'border-yellow-600' },
    grader: { color: 'bg-yellow-400', borderColor: 'border-yellow-600' },
    dozer: { color: 'bg-yellow-400', borderColor: 'border-yellow-600' },
    payloader: { color: 'bg-yellow-400', borderColor: 'border-yellow-600' },
    roller: { color: 'bg-yellow-400', borderColor: 'border-yellow-600' },
    equipment: { color: 'bg-yellow-400', borderColor: 'border-yellow-600' },
  }), []);
  // Load data from localStorage if available
  useEffect(() => {
    const savedData = safeLocalStorage.getItem('scheduler-data');
    if (savedData) {
      try {
        const {
          jobs: savedJobs,
          resources: savedResources,
          assignments: savedAssignments,
          rowOverrides: savedRowOverrides,
          truckDriverAssignments: savedTruckDriverAssignments,
          magnetInteractionRules: savedMagnetInteractionRules,
          dropRules: savedDropRules,
          jobRowConfigs: savedJobRowConfigs
        } = JSON.parse(savedData);
        if (savedJobs && savedJobs.length > 0) setJobs(savedJobs);
        if (savedResources) {
          // Ensure all resources have onSite property set
          const resourcesWithOnSite = savedResources.map((resource: Resource) => ({
            ...resource,
            onSite: resource.onSite ?? false // Default to false if undefined
          }));
          setResources(resourcesWithOnSite);
        }
        if (savedAssignments) setAssignments(savedAssignments);
        if (savedRowOverrides) setRowOverrides(savedRowOverrides);
        if (savedTruckDriverAssignments) setTruckDriverAssignments(savedTruckDriverAssignments);
        if (savedMagnetInteractionRules) setMagnetInteractionRules(savedMagnetInteractionRules);
        if (savedDropRules) setDropRules(savedDropRules);
        if (savedJobRowConfigs) setJobRowConfigs(savedJobRowConfigs);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  // Save data to localStorage on changes
  useEffect(() => {
    const currentState = {
      jobs,
      resources,
      assignments,
      rowOverrides,
      truckDriverAssignments,
      magnetInteractionRules,
      dropRules,
      jobRowConfigs
    };
    
    // Only save if data has actually changed
    if (!deepEqual(currentState, previousStateRef.current)) {
      safeLocalStorage.setItem('scheduler-data', JSON.stringify(currentState));
      previousStateRef.current = currentState;
    }
  }, [jobs, resources, assignments, rowOverrides, truckDriverAssignments, magnetInteractionRules, dropRules, jobRowConfigs]);

  // Update magnetManager with current rules and colors
  useEffect(() => {
    magnetManager.setRulesAndColors(magnetInteractionRules, resourceColors);
  }, [magnetInteractionRules, resourceColors]);

  // Job actions
  const addJob = (job: Omit<Job, 'id'>) => {
    const newJob = { ...job, id: `job-${uuidv4()}` };
    setJobs([...jobs, newJob as Job]);
  };

  const updateJob = (job: Job) => {
    // Get the previous job to check if start time changed
    const previousJob = jobs.find(j => j.id === job.id);
    const startTimeChanged = previousJob && previousJob.startTime !== job.startTime;
    
    setJobs(jobs.map(j => j.id === job.id ? job : j));
    
    // If start time changed, update all assignments for this job to use new default time
    if (startTimeChanged && job.startTime) {
      setAssignments(prev => prev.map(assignment => {
        if (assignment.jobId === job.id) {
          return {
            ...assignment,
            timeSlot: {
              ...assignment.timeSlot,
              startTime: job.startTime!,
              endTime: '15:30', // Keep consistent end time
              isFullDay: true
            }
          };
        }
        return assignment;
      }));
    }
  };

  const removeJob = (jobId: string) => {
    setJobs(jobs.filter(job => job.id !== jobId));
    setAssignments(assignments.filter(assign => assign.jobId !== jobId));
    setRowOverrides(rowOverrides.filter(override => override.jobId !== jobId));
  };

  // Finalize job - marks it as complete and ready for export
  const finalizeJob = (jobId: string) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, finalized: true } : j));
  };

  // Unfinalize job - allows editing again
  const unfinalizeJob = (jobId: string) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, finalized: false } : j));
  };

  // Resource actions
  const addResource = (resource: Omit<Resource, 'id'>) => {
    const newResource = { ...resource, id: `${resource.type}-${uuidv4()}` };
    setResources([...resources, newResource as Resource]);
  };

  const updateResource = (resource: Resource) => {
    setResources(resources.map(r => r.id === resource.id ? resource : r));
  };

  const toggleResourceOnSite = (resourceId: string) => {
    console.log('🔄 toggleResourceOnSite called for resourceId:', resourceId);
    const resource = resources.find(r => r.id === resourceId);
    console.log('   - Current resource:', resource?.name, 'onSite:', resource?.onSite);
    setResources(resources.map(r => 
      r.id === resourceId ? { 
        ...r, 
        onSite: !r.onSite 
      } : r
    ));
    const updatedResource = resources.find(r => r.id === resourceId);
    console.log('   ✅ Updated onSite to:', !resource?.onSite);
  };

  const removeResource = (resourceId: string) => {
    setResources(resources.filter(resource => resource.id !== resourceId));
    setAssignments(assignments.filter(assign => assign.resourceId !== resourceId));
  };
  
  // Check if two time slots overlap
  const doTimeSlotsOverlap = (slot1: TimeSlot, slot2: TimeSlot) => {
    // If either is a full day, they always overlap
    if (slot1.isFullDay || slot2.isFullDay) return true;
    
    // Convert times to minutes for easier comparison
    const getMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const start1 = getMinutes(slot1.startTime);
    const end1 = getMinutes(slot1.endTime);
    const start2 = getMinutes(slot2.startTime);
    const end2 = getMinutes(slot2.endTime);
    
    // Check for overlap
    return start1 < end2 && start2 < end1;
  };
  
  // Check if a resource has a time conflict
  const hasTimeConflict = (resourceId: string, timeSlot: TimeSlot, excludeAssignmentId?: string) => {
    // Since resources are unique, any existing assignment is a conflict
    const resourceAssignments = assignments.filter(a => 
      a.resourceId === resourceId && (!excludeAssignmentId || a.id !== excludeAssignmentId)
    );
    
    return resourceAssignments.length > 0;
  };
  
  // Truck-driver assignment functions
  const assignDriverToTruck = (truckId: string, driverId: string) => {
    // Remove any existing assignment for this driver
    const updatedAssignments = { ...truckDriverAssignments };
    
    // Remove driver from any other truck
    Object.keys(updatedAssignments).forEach(key => {
      if (updatedAssignments[key] === driverId) {
        delete updatedAssignments[key];
      }
    });
    
    // Assign driver to this truck
    updatedAssignments[truckId] = driverId;
    setTruckDriverAssignments(updatedAssignments);
  };
  
  const unassignDriverFromTruck = (truckId: string) => {
    const updatedAssignments = { ...truckDriverAssignments };
    delete updatedAssignments[truckId];
    setTruckDriverAssignments(updatedAssignments);
  };
  
  const getTruckDriver = (truckId: string): Resource | undefined => {
    const driverId = truckDriverAssignments[truckId];
    if (!driverId) return undefined;
    return resources.find(r => r.id === driverId);
  };
  
  const getDriverTruck = (driverId: string): Resource | undefined => {
    const truckId = Object.keys(truckDriverAssignments).find(
      key => truckDriverAssignments[key] === driverId
    );
    if (!truckId) return undefined;
    return resources.find(r => r.id === truckId);
  };
  
  // Update time slot for an assignment
  const updateTimeSlot = (assignmentId: string, timeSlot: TimeSlot) => {
    setAssignments(assignments.map(a => {
      if (a.id === assignmentId) {
        return { ...a, timeSlot };
      }
      return a;
    }));
  };

  // Update assignment note
  const updateAssignmentNote = (assignmentId: string, note: string) => {
    setAssignments(assignments.map(a => {
      if (a.id === assignmentId) {
        return { ...a, note: note.trim() || undefined };
      }
      return a;
    }));
  };

  // Get all notes for a job
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

  // Check if a resource is working both day and night shifts
  const isWorkingDouble = (resourceId: string) => {
    const resourceAssignments = assignments.filter(a => a.resourceId === resourceId);
    const jobIds = resourceAssignments.map(a => a.jobId);
    const resourceJobs = jobIds.map(id => getJobById(id)).filter(Boolean) as Job[];
    
    const hasDayJob = resourceJobs.some(job => job.shift === 'day');
    const hasNightJob = resourceJobs.some(job => job.shift === 'night');
    
    return hasDayJob && hasNightJob;
  };

  // Get the day and night jobs for a resource working double
  const getResourceDoubleShiftJobs = (resourceId: string) => {
    const resourceAssignments = assignments.filter(a => a.resourceId === resourceId);
    const jobIds = resourceAssignments.map(a => a.jobId);
    const resourceJobs = jobIds.map(id => getJobById(id)).filter(Boolean) as Job[];
    
    const dayJob = resourceJobs.find(job => job.shift === 'day');
    const nightJob = resourceJobs.find(job => job.shift === 'night');
    
    return { dayJob, nightJob };
  };

  // Rule management functions
  const updateMagnetInteractionRule = (rule: MagnetInteractionRule) => {
    setMagnetInteractionRules(prevRules => {
      const existingIndex = prevRules.findIndex(
        r => r.sourceType === rule.sourceType && r.targetType === rule.targetType
      );

      if (existingIndex !== -1) {
        const updatedRules = [...prevRules];
        updatedRules[existingIndex] = rule;
        return updatedRules;
      } else {
        return [...prevRules, rule];
      }
    });
  };

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

  // Drop rule functions
  const updateDropRule = (rowType: RowType, allowedTypes: ResourceType[]) => {
    setDropRules(prevRules => {
      const existingIndex = prevRules.findIndex(r => r.rowType === rowType);
      
      if (existingIndex !== -1) {
        const updatedRules = [...prevRules];
        updatedRules[existingIndex] = { rowType, allowedTypes };
        return updatedRules;
      } else {
        return [...prevRules, { rowType, allowedTypes }];
      }
    });
  };

  const getDropRule = (rowType: RowType): ResourceType[] => {
    const rule = dropRules.find(r => r.rowType === rowType);
    return rule?.allowedTypes || [];
  };

  const canDropOnRow = (resourceType: ResourceType, rowType: RowType): boolean => {
    const allowedTypes = getDropRule(rowType);
    return allowedTypes.includes(resourceType);
  };

  // Job row config functions
  const updateJobRowConfig = (config: JobRowConfig) => {
    setJobRowConfigs(prevConfigs => {
      const existingIndex = prevConfigs.findIndex(
        c => c.jobId === config.jobId && c.rowType === config.rowType
      );
      
      if (existingIndex !== -1) {
        const updatedConfigs = [...prevConfigs];
        updatedConfigs[existingIndex] = config;
        return updatedConfigs;
      } else {
        return [...prevConfigs, config];
      }
    });
  };

  const getJobRowConfig = (jobId: string, rowType: RowType) => {
    return jobRowConfigs.find(c => c.jobId === jobId && c.rowType === rowType);
  };

  const splitJobRow = (jobId: string, rowType: RowType, box1Name: string, box2Name: string) => {
    const newConfig: JobRowConfig = {
      jobId,
      rowType,
      isSplit: true,
      boxes: [
        {
          id: `${jobId}-${rowType}-box1`,
          name: box1Name,
          allowedTypes: ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck'], // Equipment/vehicles only
          maxCount: 10,
          attachmentRules: []
        },
        {
          id: `${jobId}-${rowType}-box2`,
          name: box2Name,
          allowedTypes: ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'], // Personnel only
          maxCount: 10,
          attachmentRules: []
        }
      ]
    };
    
    updateJobRowConfig(newConfig);
  };

  const unsplitJobRow = (jobId: string, rowType: RowType) => {
    setJobRowConfigs(prevConfigs => 
      prevConfigs.filter(c => !(c.jobId === jobId && c.rowType === rowType))
    );
  };

  const addJobRowBox = (jobId: string, rowType: RowType, boxName: string, allowedTypes: ResourceType[]) => {
    const existingConfig = getJobRowConfig(jobId, rowType);
    
    if (!existingConfig) {
      // Create new config with single box
      const newConfig: JobRowConfig = {
        jobId,
        rowType,
        isSplit: true,
        boxes: [{
          id: `${jobId}-${rowType}-box1`,
          name: boxName,
          allowedTypes,
          maxCount: 10,
          attachmentRules: []
        }]
      };
      updateJobRowConfig(newConfig);
    } else {
      // Add box to existing config
      const newBox: JobRowBox = {
        id: `${jobId}-${rowType}-box${existingConfig.boxes.length + 1}`,
        name: boxName,
        allowedTypes,
        maxCount: 10,
        attachmentRules: []
      };
      
      const updatedConfig = {
        ...existingConfig,
        boxes: [...existingConfig.boxes, newBox]
      };
      
      updateJobRowConfig(updatedConfig);
    }
  };

  const removeJobRowBox = (jobId: string, rowType: RowType, boxId: string) => {
    const existingConfig = getJobRowConfig(jobId, rowType);
    if (!existingConfig) return;

    const updatedBoxes = existingConfig.boxes.filter(box => box.id !== boxId);
    
    if (updatedBoxes.length === 0) {
      // If no boxes left, remove the config entirely
      unsplitJobRow(jobId, rowType);
    } else {
      const updatedConfig = {
        ...existingConfig,
        boxes: updatedBoxes,
        isSplit: updatedBoxes.length > 0
      };
      
      updateJobRowConfig(updatedConfig);
    }
  };

  const updateJobRowBoxAttachmentRule = (jobId: string, rowType: RowType, boxId: string, rule: BoxAttachmentRule) => {
    const existingConfig = getJobRowConfig(jobId, rowType);
    if (!existingConfig) return;

    const updatedConfig = {
      ...existingConfig,
      boxes: existingConfig.boxes.map(box => {
        if (box.id !== boxId) return box;

        const existingRuleIndex = (box.attachmentRules || []).findIndex(
          r => r.sourceType === rule.sourceType && r.targetType === rule.targetType
        );

        const updatedRules = [...(box.attachmentRules || [])];
        if (existingRuleIndex !== -1) {
          updatedRules[existingRuleIndex] = rule;
        } else {
          updatedRules.push(rule);
        }

        return {
          ...box,
          attachmentRules: updatedRules
        };
      })
    };

    updateJobRowConfig(updatedConfig);
  };

  // Create an assignment that's already attached to a parent assignment
  const assignResourceWithAttachment = (resourceId: string, parentAssignmentId: string): string | null => {
    const parentAssignment = assignments.find(a => a.id === parentAssignmentId);
    if (!parentAssignment) return null;
    
    console.log('📎 assignResourceWithAttachment called:', {
      resourceId,
      parentAssignmentId,
      parentAssignment: parentAssignment.resourceId
    });
    
    // Check if resource is already assigned to the same job/row
    const existingJobRowAssignment = assignments.find(a => 
      a.resourceId === resourceId && 
      a.jobId === parentAssignment.jobId && 
      a.row === parentAssignment.row &&
      !a.attachedTo
    );
    
    if (existingJobRowAssignment) {
      console.log('📎 Found existing assignment, converting to attached:', existingJobRowAssignment.id);
      // Convert existing assignment to attached assignment
      setAssignments(prev => prev.map(a => {
        if (a.id === existingJobRowAssignment.id) {
          return {
            ...a,
            attachedTo: parentAssignmentId,
            position: parentAssignment.position,
            timeSlot: parentAssignment.timeSlot
          };
        }
        if (a.id === parentAssignmentId) {
          return {
            ...a,
            attachments: [...(a.attachments || []), existingJobRowAssignment.id]
          };
        }
        return a;
      }));
      
      return existingJobRowAssignment.id;
    }
    
    // Check if resource is already attached to this parent
    const existingAttachment = assignments.find(a => 
      a.resourceId === resourceId && a.attachedTo === parentAssignmentId
    );
    
    if (existingAttachment) {
      console.log('📎 Resource already attached to this parent:', existingAttachment.id);
      return existingAttachment.id;
    }
    
    // Remove any existing standalone assignment for this resource in other jobs/rows
    setAssignments(prev => prev.filter(a => 
      !(a.resourceId === resourceId && !a.attachedTo)
    ));
    
    // Create new assignment already attached to parent
    const newAssignment: Assignment = {
      id: `assign-${uuidv4()}`,
      resourceId,
      jobId: parentAssignment.jobId,
      row: parentAssignment.row,
      position: parentAssignment.position,
      attachedTo: parentAssignmentId,
      timeSlot: parentAssignment.timeSlot // Inherit parent's time slot
    };
    
    console.log('📎 Creating new attached assignment:', newAssignment.id);
    
    // Update assignments to add the new one and update parent's attachments
    setAssignments(prev => {
      const updated = prev.map(a => {
        if (a.id === parentAssignmentId) {
          return {
            ...a,
            attachments: [...(a.attachments || []), newAssignment.id]
          };
        }
        return a;
      });
      
      return [...updated, newAssignment];
    });
    
    return newAssignment.id;
  };

  // Move an assignment group (primary + attachments) to a new job/row
  const moveAssignmentGroup = (assignments: Assignment[], jobId: string, row: RowType, position?: number) => {
    const primaryAssignment = assignments[0];
    const attachedAssignments = assignments.slice(1);
    
    // Get the job to use its default start time
    const job = getJobById(jobId);
    const defaultStartTime = job?.startTime || '07:00';
    
    // Handle truck configuration preservation
    let truckConfig = null;
    if (primaryAssignment) {
      const resource = getResourceById(primaryAssignment.resourceId);
      if (resource?.type === 'truck') {
        const truckConfigs = JSON.parse(safeLocalStorage.getItem('truck-configurations') || '{}');
        truckConfig = truckConfigs[primaryAssignment.id];
      }
    }
    
    // Create new primary assignment
    const newPrimaryAssignment: Assignment = {
      id: `assign-${uuidv4()}`,
      resourceId: primaryAssignment.resourceId,
      jobId,
      row,
      position,
      timeSlot: {
        startTime: defaultStartTime,
        endTime: '15:30',
        isFullDay: true
      },
      attachments: attachedAssignments.map(a => `assign-${uuidv4()}`) // Generate new IDs for attachments
    };
    
    // Create new attached assignments
    const newAttachedAssignments: Assignment[] = attachedAssignments.map((oldAssignment, index) => ({
      id: newPrimaryAssignment.attachments![index],
      resourceId: oldAssignment.resourceId,
      jobId,
      row,
      position,
      attachedTo: newPrimaryAssignment.id,
      timeSlot: newPrimaryAssignment.timeSlot
    }));
    
    const allNewAssignments = [newPrimaryAssignment, ...newAttachedAssignments];
    const resourceIdsToRemove = assignments.map(a => a.resourceId);
    
    // Store truck configuration with new assignment ID
    if (truckConfig) {
      const truckConfigs = JSON.parse(safeLocalStorage.getItem('truck-configurations') || '{}');
      truckConfigs[newPrimaryAssignment.id] = truckConfig;
      // Remove old configuration
      delete truckConfigs[primaryAssignment.id];
      safeLocalStorage.setItem('truck-configurations', JSON.stringify(truckConfigs));
    }
    
    // Remove old assignments and add new ones in single update
    setAssignments(prev => {
      // Remove all existing assignments for these resources
      const withoutOldAssignments = prev.filter(a => 
        !resourceIdsToRemove.includes(a.resourceId)
      );
      // Add all new assignments
      return [...withoutOldAssignments, ...allNewAssignments];
    });
    
    return newPrimaryAssignment.id;
  };

  // Assignment actions
  const assignResource = (resourceId: string, jobId: string, row: RowType, position?: number) => {
    logger.debug('assignResource called', { resourceId, jobId, row, position });
   
    return assignResourceWithTruckConfig(resourceId, jobId, row, undefined, position);
  };

  const assignResourceWithTruckConfig = (resourceId: string, jobId: string, row: RowType, truckConfig?: 'flowboy' | 'dump-trailer', position?: number) => {
    logger.debug('assignResourceWithTruckConfig called', { resourceId, jobId, row, truckConfig, position });
   
    // Check if this is a truck and clean up invalid configurations
    const resource = getResourceById(resourceId);
    
    // Get the job to use its default start time
    const job = getJobById(jobId);
    const defaultStartTime = job?.startTime || '07:00';
    
    // Check if resource is already assigned to this job/row
    const existingAssignment = assignments.find(a => 
      a.resourceId === resourceId && a.jobId === jobId && a.row === row && !a.attachedTo
    );
    
    if (existingAssignment) {
      // If already assigned to same job/row, just return the ID
      logger.debug('Existing assignment found', { assignmentId: existingAssignment.id });
      return existingAssignment.id;
    }
    
    const currentJobShift = job?.shift || 'day';
    const existingAssignments = assignments.filter(a => a.resourceId === resourceId && !a.attachedTo);
    
    const hasConflictingAssignment = existingAssignments.some(a => {
      const assignedJob = getJobById(a.jobId);
      return assignedJob?.shift === currentJobShift;
    });
    
    if (hasConflictingAssignment) {
      // Remove existing assignments for the same shift only
      setAssignments(prev => {
        const filtered = prev.filter(a => {
          if (a.resourceId !== resourceId || a.attachedTo) return true; // Keep attached assignments
          const assignedJob = getJobById(a.jobId);
          return assignedJob?.shift !== currentJobShift;
        });
        return filtered;
      });
    }
    
    // Create a new assignment
    const newAssignment: Assignment = {
      id: `assign-${uuidv4()}`,
      resourceId,
      jobId,
      row,
      position,
      truckConfig, // Store truck config directly in assignment
      timeSlot: {
        startTime: defaultStartTime,
        endTime: '15:30',
        isFullDay: true
      }
    };
    
    logger.debug('Created new assignment', newAssignment);
   
    // Add the new assignment (existing assignments for different shifts are preserved)
    setAssignments(prev => [...prev, newAssignment]);
    
    logger.debug('Returning assignment ID', { assignmentId: newAssignment.id });
    return newAssignment.id; // Return the new assignment ID
  };

  const updateAssignment = (assignment: Assignment) => {
    setAssignments(assignments.map(a => a.id === assignment.id ? assignment : a));
  };

  const removeAssignment = (assignmentId: string) => {
    logger.debug('Removing assignment', { assignmentId });
    
    setAssignments(prev => {
      const assignment = prev.find(a => a.id === assignmentId);
      if (!assignment) return prev;

      // Collect all assignment IDs that need to be removed
      const idsToRemove = new Set([assignmentId]);
      
      // Add attached assignments to removal list
      if (assignment.attachments?.length) {
        assignment.attachments.forEach(id => idsToRemove.add(id));
      }

      // Remove assignments and clean up references atomically
      return prev
        .filter(a => !idsToRemove.has(a.id))
        .map(a => {
          // Clean up parent references
          if (a.attachedTo && idsToRemove.has(a.attachedTo)) {
            return { ...a, attachedTo: undefined };
          }
          // Clean up attachment arrays
          if (a.attachments?.some(id => idsToRemove.has(id))) {
            return { 
              ...a, 
              attachments: a.attachments.filter(id => !idsToRemove.has(id))
            };
          }
          return a;
        });
    });
  };

  // Clean up orphaned data
  const cleanupOrphanedData = () => {
    logger.info('Running orphaned data cleanup');
    
    // Clean up truck configurations for non-existent assignments
    const truckConfigs = JSON.parse(safeLocalStorage.getItem('truck-configurations') || '{}');
    const validAssignmentIds = new Set(assignments.map(a => a.id));
    
    let cleanedConfigs = false;
    Object.keys(truckConfigs).forEach(assignmentId => {
      if (!validAssignmentIds.has(assignmentId)) {
        delete truckConfigs[assignmentId];
        cleanedConfigs = true;
      }
    });
    
    if (cleanedConfigs) {
      safeLocalStorage.setItem('truck-configurations', JSON.stringify(truckConfigs));
      logger.info('Cleaned up orphaned truck configurations');
    }
  };

  // Attach resources horizontally
  const attachResources = (targetId: string, sourceId: string) => {
    console.log('🔗 attachResources called:', { targetId, sourceId });
    
    // Prevent duplicate attachments
    const existingAttachment = assignments.find(a => 
      a.id === sourceId && a.attachedTo === targetId
    );
    
    if (existingAttachment) {
      console.log('🔗 Resources already attached, skipping');
      return;
    }
    
    // This function is now simplified - only for drag/drop of existing assignments
    setAssignments(prev => {
      const targetAssignment = prev.find(a => a.id === targetId);
      const sourceAssignment = prev.find(a => a.id === sourceId);
      
      console.log('🔗 Found assignments:', {
        target: targetAssignment?.resourceId,
        source: sourceAssignment?.resourceId
      });
    
      if (!targetAssignment || !sourceAssignment || targetId === sourceId) {
        console.log('🚫 attachResources failed - missing assignments or same ID');
        return prev;
      }
    
      // Ensure they're in the same job and row
      if (targetAssignment.jobId !== sourceAssignment.jobId || 
          targetAssignment.row !== sourceAssignment.row) {
        console.log('🚫 attachResources failed - different job/row');
        return prev;
      }
      
      console.log('✅ Proceeding with attachment');
      
      return prev.map(a => {
        // Update target assignment to include source in attachments
        if (a.id === targetId) {
          const updatedAttachments = [...(a.attachments || [])];
          if (!updatedAttachments.includes(sourceId)) {
            updatedAttachments.push(sourceId);
          }
          return {
            ...a,
            attachments: updatedAttachments
          };
        }
        // Update source assignment to be attached to target
        if (a.id === sourceId) {
          return {
            ...a,
            attachedTo: targetId,
            position: targetAssignment.position,
            timeSlot: targetAssignment.timeSlot // Inherit parent's time slot
          };
        }
        // If source was previously attached to another parent, remove it
        if (sourceAssignment.attachedTo && a.id === sourceAssignment.attachedTo && sourceAssignment.attachedTo !== targetId) {
          return {
            ...a,
            attachments: a.attachments?.filter(attachId => attachId !== sourceId)
          };
        }
        return a;
      });
    });
  };
  
  // Detach a resource from its group
  const detachResources = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    
    if (!assignment) return;
    
    if (assignment.attachedTo) {
      // This is an attached assignment - detach it from its parent
      setAssignments(assignments.map(a => {
        if (a.id === assignment.attachedTo) {
          return {
            ...a,
            attachments: a.attachments?.filter(id => id !== assignmentId)
          };
        }
        if (a.id === assignmentId) {
          return {
            ...a,
            attachedTo: undefined
          };
        }
        return a;
      }));
    } else if (assignment.attachments?.length) {
      // This is a parent - detach all its children
      setAssignments(assignments.map(a => {
        if (assignment.attachments?.includes(a.id)) {
          return {
            ...a,
            attachedTo: undefined
          };
        }
        if (a.id === assignmentId) {
          return {
            ...a,
            attachments: undefined
          };
        }
        return a;
      }));
    }
  };

  // Row override actions
  const toggleRowEnabled = (jobId: string, rowType: RowType) => {
    const existingOverride = rowOverrides.find(
      o => o.jobId === jobId && o.rowType === rowType
    );
    
    // Determine if the row will be disabled after this toggle
    let willBeDisabled = false;
    
    if (existingOverride) {
      // If toggling an existing override, it will be disabled if currently enabled
      willBeDisabled = existingOverride.enabled;
      
      // Toggle the existing override
      setRowOverrides(rowOverrides.map(o => 
        (o.jobId === jobId && o.rowType === rowType)
          ? { ...o, enabled: !o.enabled }
          : o
      ));
    } else {
      // Creating a new override defaults to disabled, so it will be disabled
      willBeDisabled = true;
      
      // Create a new override (default to disabled since we're toggling off)
      setRowOverrides([
        ...rowOverrides,
        { jobId, rowType, enabled: false }
      ]);
    }
    
    // If the row is being disabled, remove all assignments from that row
    if (willBeDisabled) {
      const assignmentsToRemove = assignments.filter(a => 
        a.jobId === jobId && a.row === rowType
      );
      
      // Remove each assignment (this will also handle cleaning up attachments)
      assignmentsToRemove.forEach(assignment => {
        removeAssignment(assignment.id);
      });
    }
  };
  
  const isRowEnabled = (jobId: string, rowType: RowType): boolean => {
    const override = rowOverrides.find(
      o => o.jobId === jobId && o.rowType === rowType
    );
    
    // If there's an override, use its value
    if (override !== undefined) {
      return override.enabled;
    }
    
    // If no override, check if row is needed for this job type
    const job = getJobById(jobId);
    if (job) {
      const isNeeded = isRowNeededForJobType(rowType, job.type);
      // Needed rows are enabled by default, not needed rows are disabled by default
      return isNeeded;
    }
    
    // Fallback to enabled by default
    return true;
  };

  // Helper functions
  const getResourcesByAssignment = (jobId: string, row: RowType) => {
    if (jobId && row) {
      return assignments.filter(a => a.jobId === jobId && a.row === row);
    }
    // If no jobId/row provided, return all assignments
    return assignments;
  };

  const getAvailableResources = () => {
    // Resources can be assigned to multiple jobs (day/night shifts)
    // A resource is only unavailable if assigned to the same shift type
    const assignedResourceIds = new Set(assignments.map(a => a.resourceId));
    
    return resources.filter(r => {
      // Apply search filter
      if (searchTerm && !r.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !r.identifier?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Apply type filter
      if (filteredResourceType && r.type !== filteredResourceType) {
        return false;
      }
      
      // Resource is always available for assignment (can work multiple shifts)
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
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment?.attachments?.length) {
      return assignment.attachments
        .map(id => assignments.find(a => a.id === id))
        .filter(Boolean) as Assignment[];
    }
    return [];
  };
  
  // Check if a resource is assigned to multiple jobs
  const hasMultipleJobAssignments = (resourceId: string) => {
    const resourceAssignments = assignments.filter(a => a.resourceId === resourceId);
    
    // Get unique job IDs for this resource
    const uniqueJobIds = new Set(resourceAssignments.map(a => a.jobId));
    
    // Resource is multi-assigned if it has more than one unique job
    return uniqueJobIds.size > 1;
  };
  
  // Get other assignments for a resource
  const getResourceOtherAssignments = (resourceId: string, excludeAssignmentId: string) => {
    // Get all assignments for this resource excluding the current one
    return assignments.filter(a => 
      a.resourceId === resourceId && a.id !== excludeAssignmentId
    );
  };

  const value = {
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
    attachResources,
    detachResources,
    updateTimeSlot,
    updateAssignmentNote,
    cleanupOrphanedData,
    
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
    moveAssignmentGroup,
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
    addJobRowBox,
    removeJobRowBox,
    updateJobRowBoxAttachmentRule
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