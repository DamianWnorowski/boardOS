import { useMemo, useCallback } from 'react';
import { useScheduler } from '../context/SchedulerContext';
import { useDebounce, useMemoizedFilter } from '../utils/performanceUtils';
import logger from '../utils/logger';

/**
 * Optimized hook that memoizes expensive computations
 * and provides stable references for components
 */
export const useOptimizedScheduler = () => {
  const context = useScheduler();
  
  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(context.searchTerm, 300);
  
  // Memoize expensive computations
  const memoizedData = useMemo(() => {
    const assignedResourceIds = new Set(context.assignments.map(a => a.resourceId));
    
    const availableResources = useMemoizedFilter(context.resources, (r) => {
      // Apply search filter
      if (debouncedSearchTerm && 
          !r.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) && 
          !r.identifier?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) {
        return false;
      }
      
      // Apply type filter
      if (context.filteredResourceType && r.type !== context.filteredResourceType) {
        return false;
      }
      
      // Resource is available only if not assigned anywhere
      return !assignedResourceIds.has(r.id);
    }, [debouncedSearchTerm, context.filteredResourceType]);

    const resourcesByType = context.resources.reduce((groups, resource) => {
      if (!groups[resource.type]) {
        groups[resource.type] = [];
      }
      groups[resource.type].push(resource);
      return groups;
    }, {} as Record<string, typeof context.resources>);

    const assignmentsByJob = context.assignments.reduce((groups, assignment) => {
      if (!groups[assignment.jobId]) {
        groups[assignment.jobId] = [];
      }
      groups[assignment.jobId].push(assignment);
      return groups;
    }, {} as Record<string, typeof context.assignments>);

    return {
      assignedResourceIds,
      availableResources,
      resourcesByType,
      assignmentsByJob,
      totalJobs: context.jobs.length,
      totalResources: context.resources.length,
      totalAssignments: context.assignments.length
    };
  }, [
    context.assignments,
    context.resources,
    debouncedSearchTerm,
    context.filteredResourceType,
    context.jobs.length
  ]);

  // Stable callback references
  const stableCallbacks = useMemo(() => ({
    addJob: context.addJob,
    updateJob: context.updateJob,
    removeJob: context.removeJob,
    assignResource: context.assignResource,
    removeAssignment: context.removeAssignment,
    toggleResourceOnSite: context.toggleResourceOnSite,
    updateAssignmentNote: context.updateAssignmentNote
  }), [
    context.addJob,
    context.updateJob,
    context.removeJob,
    context.assignResource,
    context.removeAssignment,
    context.toggleResourceOnSite,
    context.updateAssignmentNote
  ]);

  return {
    ...context,
    ...memoizedData,
    ...stableCallbacks
  };
};

/**
 * Hook for job-specific data to avoid unnecessary re-renders
 */
export const useJobData = (jobId: string) => {
  const { assignments, resources, getJobById } = useScheduler();
  
  return useMemo(() => {
    const job = getJobById(jobId);
    const jobAssignments = assignments.filter(a => a.jobId === jobId);
    const assignedResources = jobAssignments.map(a => resources.find(r => r.id === a.resourceId)).filter(Boolean);
    
    return {
      job,
      assignments: jobAssignments,
      resources: assignedResources,
      assignmentCount: jobAssignments.length
    };
  }, [jobId, assignments, resources, getJobById]);
};

/**
 * Hook for resource pool data with optimized filtering
 */
export const useResourcePool = () => {
  const { resources, assignments, searchTerm, filteredResourceType } = useScheduler();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  return useMemo(() => {
    const assignedResourceIds = new Set(assignments.map(a => a.resourceId));
    
    const categorizedResources = resources.reduce((categories, resource) => {
      // Apply filters
      if (debouncedSearchTerm && 
          !resource.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) && 
          !resource.identifier?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) {
        return categories;
      }
      
      if (filteredResourceType && resource.type !== filteredResourceType) {
        return categories;
      }

      const isAssigned = assignedResourceIds.has(resource.id);
      const category = resource.type;
      
      if (!categories[category]) {
        categories[category] = { available: [], assigned: [] };
      }
      
      if (isAssigned) {
        categories[category].assigned.push(resource);
      } else {
        categories[category].available.push(resource);
      }
      
      return categories;
    }, {} as Record<string, { available: typeof resources; assigned: typeof resources }>);

    return categorizedResources;
  }, [resources, assignments, debouncedSearchTerm, filteredResourceType]);
};