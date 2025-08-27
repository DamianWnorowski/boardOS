import { useState, useCallback, useEffect } from 'react';
import { Magnet, MagnetStatus, magnetManager } from '../classes/Magnet';
import { ResourceType, TimeSlot } from '../types';

/**
 * Hook for working with a single magnet
 */
export function useMagnet(magnetId: string) {
  const [magnet, setMagnet] = useState<Magnet | undefined>(() => 
    magnetManager.getMagnet(magnetId)
  );
  
  // Force re-render when magnet changes
  const refreshMagnet = useCallback(() => {
    setMagnet(magnetManager.getMagnet(magnetId));
  }, [magnetId]);
  
  // Assign magnet to a job
  const assignToJob = useCallback((
    jobId: string, 
    rowId: string, 
    position: number, 
    timeSlot?: TimeSlot
  ): string | null => {
    const currentMagnet = magnetManager.getMagnet(magnetId);
    if (!currentMagnet) return null;
    
    const assignmentId = currentMagnet.assignToJob(jobId, rowId, position, timeSlot);
    refreshMagnet();
    return assignmentId;
  }, [magnetId, refreshMagnet]);
  
  // Remove an assignment
  const removeAssignment = useCallback((assignmentId: string) => {
    const currentMagnet = magnetManager.getMagnet(magnetId);
    if (!currentMagnet) return;
    
    currentMagnet.removeAssignment(assignmentId);
    refreshMagnet();
  }, [magnetId, refreshMagnet]);
  
  // Update a time slot
  const updateTimeSlot = useCallback((assignmentId: string, timeSlot: TimeSlot): boolean => {
    const currentMagnet = magnetManager.getMagnet(magnetId);
    if (!currentMagnet) return false;
    
    const result = currentMagnet.updateTimeSlot(assignmentId, timeSlot);
    refreshMagnet();
    return result;
  }, [magnetId, refreshMagnet]);
  
  // Handle dragging
  const startDrag = useCallback(() => {
    const currentMagnet = magnetManager.getMagnet(magnetId);
    if (!currentMagnet) return;
    
    currentMagnet.startDrag();
    refreshMagnet();
  }, [magnetId, refreshMagnet]);
  
  const endDrag = useCallback(() => {
    const currentMagnet = magnetManager.getMagnet(magnetId);
    if (!currentMagnet) return;
    
    currentMagnet.endDrag();
    refreshMagnet();
  }, [magnetId, refreshMagnet]);
  
  // Handle attachments
  const attachTo = useCallback((targetMagnetId: string): boolean => {
    return magnetManager.linkMagnets(magnetId, targetMagnetId);
  }, [magnetId]);
  
  const detachFrom = useCallback((targetMagnetId: string): boolean => {
    return magnetManager.unlinkMagnets(magnetId, targetMagnetId);
  }, [magnetId]);
  
  return {
    magnet,
    assignToJob,
    removeAssignment,
    updateTimeSlot,
    startDrag,
    endDrag,
    attachTo,
    detachFrom,
    refreshMagnet,
    isAssigned: magnet?.status !== MagnetStatus.Available,
    isMultiAssigned: magnet?.status === MagnetStatus.MultiAssigned,
    isDragging: magnet?.isDragging || false,
    hasRequiredAttachments: magnet && typeof magnet.hasRequiredAttachments === 'function' 
      ? magnet.hasRequiredAttachments(magnetManager.magnets) 
      : false
  };
}

/**
 * Hook for working with collections of magnets
 */
export function useMagnets() {
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Refresh the list of magnets
  const refreshMagnets = useCallback(() => {
    setMagnets([...magnetManager.magnets.values()]);
  }, []);
  
  // Initialize magnets from resources if needed
  useEffect(() => {
    if (loading && magnetManager.magnets.size === 0) {
      // This would be where you'd initialize from your resource data
      // For example:
      // resources.forEach(resource => {
      //   magnetManager.createMagnet(
      //     resource.id,
      //     resource.type,
      //     resource.name,
      //     resource.identifier,
      //     resource.model
      //   );
      // });
      
      refreshMagnets();
      setLoading(false);
    } else if (loading) {
      refreshMagnets();
      setLoading(false);
    }
  }, [loading, refreshMagnets]);
  
  // Create a new magnet
  const createMagnet = useCallback((
    resourceId: string,
    type: ResourceType,
    name: string,
    identifier?: string,
    model?: string
  ): Magnet => {
    const magnet = magnetManager.createMagnet(resourceId, type, name, identifier, model);
    refreshMagnets();
    return magnet;
  }, [refreshMagnets]);
  
  // Get magnets for a specific job and row
  const getMagnetsForJobRow = useCallback((jobId: string, rowId: string): Magnet[] => {
    return magnetManager.getMagnetsByJobRow(jobId, rowId);
  }, []);
  
  // Get available magnets (for resource pool)
  const getAvailableMagnets = useCallback((): Magnet[] => {
    return magnetManager.getAvailableMagnets();
  }, []);
  
  // Filter magnets by type
  const filterMagnetsByType = useCallback((type: ResourceType | null): Magnet[] => {
    if (!type) return [...magnetManager.magnets.values()];
    return magnetManager.getMagnetsByType(type);
  }, []);
  
  // Get magnets with incomplete attachments
  const getIncompleteMagnets = useCallback((): Magnet[] => {
    return magnetManager.getIncompleteMagnets();
  }, []);
  
  // Save the current magnet state
  const saveMagnets = useCallback((): void => {
    localStorage.setItem('scheduler-magnets', magnetManager.serialize());
  }, []);
  
  // Load magnets from storage
  const loadMagnets = useCallback((): void => {
    const data = localStorage.getItem('scheduler-magnets');
    if (data) {
      magnetManager.deserialize(data);
      refreshMagnets();
    }
  }, [refreshMagnets]);
  
  return {
    magnets,
    loading,
    createMagnet,
    getMagnetsForJobRow,
    getAvailableMagnets,
    filterMagnetsByType,
    getIncompleteMagnets,
    refreshMagnets,
    saveMagnets,
    loadMagnets
  };
}