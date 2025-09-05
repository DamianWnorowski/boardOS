import { Assignment, TimeSlot } from '../types';
import logger from './logger';

/**
 * Advanced time conflict detection utility
 */

export interface TimeConflict {
  conflictingAssignments: Assignment[];
  overlapPeriod: {
    start: string;
    end: string;
  };
  severity: 'minor' | 'major' | 'critical';
}

/**
 * Convert time string to minutes for easier comparison
 */
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes back to time string
 */
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Check if two time slots overlap
 */
export const doTimeSlotsOverlap = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
  // If either is a full day, they always overlap
  if (slot1.isFullDay || slot2.isFullDay) return true;
  
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);
  
  // Check for overlap
  return start1 < end2 && start2 < end1;
};

/**
 * Get overlap period between two time slots
 */
export const getOverlapPeriod = (slot1: TimeSlot, slot2: TimeSlot): { start: string; end: string } | null => {
  if (!doTimeSlotsOverlap(slot1, slot2)) return null;
  
  if (slot1.isFullDay || slot2.isFullDay) {
    return { start: '00:00', end: '23:59' };
  }
  
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);
  
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  
  return {
    start: minutesToTime(overlapStart),
    end: minutesToTime(overlapEnd)
  };
};

/**
 * Detect all time conflicts for a resource across multiple assignments
 */
export const detectTimeConflicts = (
  resourceId: string, 
  assignments: Assignment[]
): TimeConflict[] => {
  const resourceAssignments = assignments.filter(a => a.resourceId === resourceId);
  const conflicts: TimeConflict[] = [];
  
  // Compare each assignment with every other assignment
  for (let i = 0; i < resourceAssignments.length; i++) {
    for (let j = i + 1; j < resourceAssignments.length; j++) {
      const assignment1 = resourceAssignments[i];
      const assignment2 = resourceAssignments[j];
      
      // Only check if both have time slots
      if (!assignment1.timeSlot || !assignment2.timeSlot) continue;
      
      if (doTimeSlotsOverlap(assignment1.timeSlot, assignment2.timeSlot)) {
        const overlapPeriod = getOverlapPeriod(assignment1.timeSlot, assignment2.timeSlot);
        
        if (overlapPeriod) {
          // Determine severity based on overlap duration
          const overlapDuration = timeToMinutes(overlapPeriod.end) - timeToMinutes(overlapPeriod.start);
          let severity: 'minor' | 'major' | 'critical' = 'minor';
          
          if (overlapDuration > 480) { // More than 8 hours
            severity = 'critical';
          } else if (overlapDuration > 240) { // More than 4 hours
            severity = 'major';
          }
          
          conflicts.push({
            conflictingAssignments: [assignment1, assignment2],
            overlapPeriod,
            severity
          });
        }
      }
    }
  }
  
  return conflicts;
};

/**
 * Validate a time slot assignment before creation
 */
export const validateTimeSlotAssignment = (
  resourceId: string,
  newTimeSlot: TimeSlot,
  existingAssignments: Assignment[],
  excludeAssignmentId?: string
): { isValid: boolean; conflicts: TimeConflict[]; warnings: string[] } => {
  const resourceAssignments = existingAssignments.filter(a => 
    a.resourceId === resourceId && 
    (!excludeAssignmentId || a.id !== excludeAssignmentId)
  );
  
  const warnings: string[] = [];
  const testAssignment: Assignment = {
    id: 'test',
    resourceId,
    jobId: 'test',
    row: 'crew',
    timeSlot: newTimeSlot
  };
  
  // Test for conflicts
  const conflicts = detectTimeConflicts(resourceId, [...resourceAssignments, testAssignment])
    .filter(conflict => conflict.conflictingAssignments.some(a => a.id === 'test'));
  
  // Add warnings for potential issues
  if (newTimeSlot.isFullDay && resourceAssignments.length > 0) {
    warnings.push('Full day assignment will conflict with all existing assignments');
  }
  
  const startTime = timeToMinutes(newTimeSlot.startTime);
  const endTime = timeToMinutes(newTimeSlot.endTime);
  
  if (startTime >= endTime) {
    warnings.push('End time must be after start time');
  }
  
  if (startTime < 360) { // Before 6:00 AM
    warnings.push('Very early start time - verify this is correct');
  }
  
  if (endTime > 1200) { // After 8:00 PM
    warnings.push('Very late end time - verify this is correct');
  }
  
  return {
    isValid: conflicts.length === 0,
    conflicts,
    warnings
  };
};

/**
 * Get all time conflicts across the entire schedule
 */
export const detectAllTimeConflicts = (assignments: Assignment[]): Map<string, TimeConflict[]> => {
  const conflictMap = new Map<string, TimeConflict[]>();
  
  // Get unique resource IDs
  const resourceIds = [...new Set(assignments.map(a => a.resourceId))];
  
  resourceIds.forEach(resourceId => {
    const conflicts = detectTimeConflicts(resourceId, assignments);
    if (conflicts.length > 0) {
      conflictMap.set(resourceId, conflicts);
      logger.warn(`Time conflicts detected for resource ${resourceId}`, { conflicts });
    }
  });
  
  return conflictMap;
};

/**
 * Auto-resolve minor time conflicts by adjusting times
 */
export const autoResolveConflicts = (
  assignments: Assignment[],
  resourceId: string
): Assignment[] => {
  const resourceAssignments = assignments.filter(a => a.resourceId === resourceId);
  const conflicts = detectTimeConflicts(resourceId, assignments);
  
  if (conflicts.length === 0) return assignments;
  
  // Sort assignments by start time
  const sortedAssignments = [...resourceAssignments].sort((a, b) => {
    const timeA = a.timeSlot ? timeToMinutes(a.timeSlot.startTime) : 0;
    const timeB = b.timeSlot ? timeToMinutes(b.timeSlot.startTime) : 0;
    return timeA - timeB;
  });
  
  // Adjust overlapping assignments
  const adjustedAssignments = [...assignments];
  
  for (let i = 1; i < sortedAssignments.length; i++) {
    const current = sortedAssignments[i];
    const previous = sortedAssignments[i - 1];
    
    if (current.timeSlot && previous.timeSlot && 
        doTimeSlotsOverlap(current.timeSlot, previous.timeSlot)) {
      
      // Adjust current assignment to start when previous ends
      const previousEnd = timeToMinutes(previous.timeSlot.endTime);
      const currentDuration = timeToMinutes(current.timeSlot.endTime) - timeToMinutes(current.timeSlot.startTime);
      
      const adjustedCurrent = {
        ...current,
        timeSlot: {
          ...current.timeSlot,
          startTime: minutesToTime(previousEnd),
          endTime: minutesToTime(previousEnd + currentDuration)
        }
      };
      
      const index = adjustedAssignments.findIndex(a => a.id === current.id);
      if (index !== -1) {
        adjustedAssignments[index] = adjustedCurrent;
      }
      
      logger.info(`Auto-resolved time conflict for assignment ${current.id}`, {
        originalStart: current.timeSlot.startTime,
        adjustedStart: adjustedCurrent.timeSlot.startTime
      });
    }
  }
  
  return adjustedAssignments;
};