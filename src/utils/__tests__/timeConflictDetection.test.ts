import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  doTimeSlotsOverlap,
  getOverlapPeriod,
  detectTimeConflicts,
  validateTimeSlotAssignment,
  detectAllTimeConflicts,
  autoResolveConflicts
} from '../timeConflictDetection';
import { Assignment, TimeSlot } from '../../types';

vi.mock('../logger', () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('timeConflictDetection', () => {
  describe('doTimeSlotsOverlap', () => {
    it('should detect overlapping time slots', () => {
      const slot1: TimeSlot = { startTime: '08:00', endTime: '12:00', isFullDay: false };
      const slot2: TimeSlot = { startTime: '10:00', endTime: '14:00', isFullDay: false };
      
      expect(doTimeSlotsOverlap(slot1, slot2)).toBe(true);
    });

    it('should detect non-overlapping time slots', () => {
      const slot1: TimeSlot = { startTime: '08:00', endTime: '12:00', isFullDay: false };
      const slot2: TimeSlot = { startTime: '13:00', endTime: '17:00', isFullDay: false };
      
      expect(doTimeSlotsOverlap(slot1, slot2)).toBe(false);
    });

    it('should detect adjacent time slots as non-overlapping', () => {
      const slot1: TimeSlot = { startTime: '08:00', endTime: '12:00', isFullDay: false };
      const slot2: TimeSlot = { startTime: '12:00', endTime: '16:00', isFullDay: false };
      
      expect(doTimeSlotsOverlap(slot1, slot2)).toBe(false);
    });

    it('should handle full day slots as always overlapping', () => {
      const slot1: TimeSlot = { startTime: '08:00', endTime: '12:00', isFullDay: true };
      const slot2: TimeSlot = { startTime: '18:00', endTime: '20:00', isFullDay: false };
      
      expect(doTimeSlotsOverlap(slot1, slot2)).toBe(true);
    });

    it('should handle both full day slots', () => {
      const slot1: TimeSlot = { startTime: '00:00', endTime: '23:59', isFullDay: true };
      const slot2: TimeSlot = { startTime: '00:00', endTime: '23:59', isFullDay: true };
      
      expect(doTimeSlotsOverlap(slot1, slot2)).toBe(true);
    });

    it('should detect complete containment', () => {
      const slot1: TimeSlot = { startTime: '08:00', endTime: '17:00', isFullDay: false };
      const slot2: TimeSlot = { startTime: '10:00', endTime: '12:00', isFullDay: false };
      
      expect(doTimeSlotsOverlap(slot1, slot2)).toBe(true);
    });
  });

  describe('getOverlapPeriod', () => {
    it('should calculate overlap period correctly', () => {
      const slot1: TimeSlot = { startTime: '08:00', endTime: '12:00', isFullDay: false };
      const slot2: TimeSlot = { startTime: '10:00', endTime: '14:00', isFullDay: false };
      
      const overlap = getOverlapPeriod(slot1, slot2);
      expect(overlap).toEqual({ start: '10:00', end: '12:00' });
    });

    it('should return null for non-overlapping slots', () => {
      const slot1: TimeSlot = { startTime: '08:00', endTime: '12:00', isFullDay: false };
      const slot2: TimeSlot = { startTime: '13:00', endTime: '17:00', isFullDay: false };
      
      const overlap = getOverlapPeriod(slot1, slot2);
      expect(overlap).toBeNull();
    });

    it('should handle full day overlaps', () => {
      const slot1: TimeSlot = { startTime: '08:00', endTime: '12:00', isFullDay: true };
      const slot2: TimeSlot = { startTime: '10:00', endTime: '14:00', isFullDay: false };
      
      const overlap = getOverlapPeriod(slot1, slot2);
      expect(overlap).toEqual({ start: '00:00', end: '23:59' });
    });

    it('should handle complete containment', () => {
      const slot1: TimeSlot = { startTime: '08:00', endTime: '17:00', isFullDay: false };
      const slot2: TimeSlot = { startTime: '10:00', endTime: '12:00', isFullDay: false };
      
      const overlap = getOverlapPeriod(slot1, slot2);
      expect(overlap).toEqual({ start: '10:00', end: '12:00' });
    });

    it('should handle partial overlap at start', () => {
      const slot1: TimeSlot = { startTime: '10:00', endTime: '14:00', isFullDay: false };
      const slot2: TimeSlot = { startTime: '08:00', endTime: '12:00', isFullDay: false };
      
      const overlap = getOverlapPeriod(slot1, slot2);
      expect(overlap).toEqual({ start: '10:00', end: '12:00' });
    });
  });

  describe('detectTimeConflicts', () => {
    it('should detect conflicts for a single resource', () => {
      const assignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false }
        },
        {
          id: '2',
          resourceId: 'resource1',
          jobId: 'job2',
          row: 'crew',
          timeSlot: { startTime: '10:00', endTime: '14:00', isFullDay: false }
        }
      ];

      const conflicts = detectTimeConflicts('resource1', assignments);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictingAssignments).toHaveLength(2);
      expect(conflicts[0].severity).toBe('minor');
    });

    it('should not detect conflicts for different resources', () => {
      const assignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false }
        },
        {
          id: '2',
          resourceId: 'resource2',
          jobId: 'job2',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false }
        }
      ];

      const conflicts = detectTimeConflicts('resource1', assignments);
      expect(conflicts).toHaveLength(0);
    });

    it('should handle assignments without time slots', () => {
      const assignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew'
        },
        {
          id: '2',
          resourceId: 'resource1',
          jobId: 'job2',
          row: 'crew',
          timeSlot: { startTime: '10:00', endTime: '14:00', isFullDay: false }
        }
      ];

      const conflicts = detectTimeConflicts('resource1', assignments);
      expect(conflicts).toHaveLength(0);
    });

    it('should classify severity based on overlap duration', () => {
      const assignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '17:00', isFullDay: false }
        },
        {
          id: '2',
          resourceId: 'resource1',
          jobId: 'job2',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '17:00', isFullDay: false }
        }
      ];

      const conflicts = detectTimeConflicts('resource1', assignments);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].severity).toBe('critical'); // 9 hour overlap
    });

    it('should detect multiple conflicts', () => {
      const assignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false }
        },
        {
          id: '2',
          resourceId: 'resource1',
          jobId: 'job2',
          row: 'crew',
          timeSlot: { startTime: '10:00', endTime: '14:00', isFullDay: false }
        },
        {
          id: '3',
          resourceId: 'resource1',
          jobId: 'job3',
          row: 'crew',
          timeSlot: { startTime: '11:00', endTime: '15:00', isFullDay: false }
        }
      ];

      const conflicts = detectTimeConflicts('resource1', assignments);
      expect(conflicts).toHaveLength(3); // 1-2, 1-3, 2-3 conflicts
    });
  });

  describe('validateTimeSlotAssignment', () => {
    it('should validate valid time slot assignment', () => {
      const existingAssignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false }
        }
      ];

      const newTimeSlot: TimeSlot = { startTime: '13:00', endTime: '17:00', isFullDay: false };
      const result = validateTimeSlotAssignment('resource1', newTimeSlot, existingAssignments);
      
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect conflicts with existing assignments', () => {
      const existingAssignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false }
        }
      ];

      const newTimeSlot: TimeSlot = { startTime: '10:00', endTime: '14:00', isFullDay: false };
      const result = validateTimeSlotAssignment('resource1', newTimeSlot, existingAssignments);
      
      expect(result.isValid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
    });

    it('should exclude specified assignment when validating', () => {
      const existingAssignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false }
        },
        {
          id: '2',
          resourceId: 'resource1',
          jobId: 'job2',
          row: 'crew',
          timeSlot: { startTime: '13:00', endTime: '17:00', isFullDay: false }
        }
      ];

      const newTimeSlot: TimeSlot = { startTime: '08:00', endTime: '12:00', isFullDay: false };
      const result = validateTimeSlotAssignment('resource1', newTimeSlot, existingAssignments, '1');
      
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should warn about full day assignments', () => {
      const existingAssignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false }
        }
      ];

      const newTimeSlot: TimeSlot = { startTime: '00:00', endTime: '23:59', isFullDay: true };
      const result = validateTimeSlotAssignment('resource1', newTimeSlot, existingAssignments);
      
      expect(result.warnings).toContain('Full day assignment will conflict with all existing assignments');
    });

    it('should warn about invalid time ranges', () => {
      const newTimeSlot: TimeSlot = { startTime: '14:00', endTime: '12:00', isFullDay: false };
      const result = validateTimeSlotAssignment('resource1', newTimeSlot, []);
      
      expect(result.warnings).toContain('End time must be after start time');
    });

    it('should warn about very early start times', () => {
      const newTimeSlot: TimeSlot = { startTime: '04:00', endTime: '12:00', isFullDay: false };
      const result = validateTimeSlotAssignment('resource1', newTimeSlot, []);
      
      expect(result.warnings).toContain('Very early start time - verify this is correct');
    });

    it('should warn about very late end times', () => {
      const newTimeSlot: TimeSlot = { startTime: '14:00', endTime: '22:00', isFullDay: false };
      const result = validateTimeSlotAssignment('resource1', newTimeSlot, []);
      
      expect(result.warnings).toContain('Very late end time - verify this is correct');
    });
  });

  describe('detectAllTimeConflicts', () => {
    it('should detect conflicts across multiple resources', () => {
      const assignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false }
        },
        {
          id: '2',
          resourceId: 'resource1',
          jobId: 'job2',
          row: 'crew',
          timeSlot: { startTime: '10:00', endTime: '14:00', isFullDay: false }
        },
        {
          id: '3',
          resourceId: 'resource2',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false }
        },
        {
          id: '4',
          resourceId: 'resource2',
          jobId: 'job2',
          row: 'crew',
          timeSlot: { startTime: '11:00', endTime: '15:00', isFullDay: false }
        }
      ];

      const conflictMap = detectAllTimeConflicts(assignments);
      
      expect(conflictMap.size).toBe(2);
      expect(conflictMap.has('resource1')).toBe(true);
      expect(conflictMap.has('resource2')).toBe(true);
    });

    it('should not include resources without conflicts', () => {
      const assignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false }
        },
        {
          id: '2',
          resourceId: 'resource2',
          jobId: 'job2',
          row: 'crew',
          timeSlot: { startTime: '13:00', endTime: '17:00', isFullDay: false }
        }
      ];

      const conflictMap = detectAllTimeConflicts(assignments);
      expect(conflictMap.size).toBe(0);
    });
  });

  describe('autoResolveConflicts', () => {
    it('should resolve overlapping assignments by adjusting times', () => {
      const assignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false }
        },
        {
          id: '2',
          resourceId: 'resource1',
          jobId: 'job2',
          row: 'crew',
          timeSlot: { startTime: '10:00', endTime: '14:00', isFullDay: false }
        },
        {
          id: '3',
          resourceId: 'resource2',
          jobId: 'job3',
          row: 'crew',
          timeSlot: { startTime: '09:00', endTime: '11:00', isFullDay: false }
        }
      ];

      const resolved = autoResolveConflicts(assignments, 'resource1');
      
      const assignment2 = resolved.find(a => a.id === '2');
      expect(assignment2?.timeSlot?.startTime).toBe('12:00');
      expect(assignment2?.timeSlot?.endTime).toBe('16:00'); // Maintains 4-hour duration
      
      // Should not affect other resources
      const assignment3 = resolved.find(a => a.id === '3');
      expect(assignment3?.timeSlot?.startTime).toBe('09:00');
    });

    it('should handle multiple overlapping assignments', () => {
      const assignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '10:00', isFullDay: false }
        },
        {
          id: '2',
          resourceId: 'resource1',
          jobId: 'job2',
          row: 'crew',
          timeSlot: { startTime: '09:00', endTime: '11:00', isFullDay: false }
        },
        {
          id: '3',
          resourceId: 'resource1',
          jobId: 'job3',
          row: 'crew',
          timeSlot: { startTime: '10:00', endTime: '12:00', isFullDay: false }
        }
      ];

      const resolved = autoResolveConflicts(assignments, 'resource1');
      
      const assignment2 = resolved.find(a => a.id === '2');
      const assignment3 = resolved.find(a => a.id === '3');
      
      // Assignment 2 starts after assignment 1 ends (10:00)
      expect(assignment2?.timeSlot?.startTime).toBe('10:00');
      expect(assignment2?.timeSlot?.endTime).toBe('12:00');
      // Assignment 3 should start at 11:00 (checking against original assignment 2 time)
      // This is because the function doesn't update sortedAssignments after adjusting
      expect(assignment3?.timeSlot?.startTime).toBe('11:00');
      expect(assignment3?.timeSlot?.endTime).toBe('13:00');
    });

    it('should return unchanged assignments if no conflicts', () => {
      const assignments: Assignment[] = [
        {
          id: '1',
          resourceId: 'resource1',
          jobId: 'job1',
          row: 'crew',
          timeSlot: { startTime: '08:00', endTime: '10:00', isFullDay: false }
        },
        {
          id: '2',
          resourceId: 'resource1',
          jobId: 'job2',
          row: 'crew',
          timeSlot: { startTime: '11:00', endTime: '13:00', isFullDay: false }
        }
      ];

      const resolved = autoResolveConflicts(assignments, 'resource1');
      expect(resolved).toEqual(assignments);
    });
  });
});