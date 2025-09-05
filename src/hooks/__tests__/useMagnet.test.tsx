import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { TimeSlot } from '../../types';

vi.mock('../../classes/Magnet', () => {
  const MagnetStatus = {
    Available: 'available',
    Assigned: 'assigned',
    MultiAssigned: 'multiAssigned',
    InTransit: 'inTransit'
  } as const;

  const mockMagnet = {
    id: 'mock-magnet',
    assignments: [] as any[],
    status: MagnetStatus.Available,
    assignToJob: vi.fn((jobId: string, rowId: string, position: number, timeSlot?: TimeSlot) => {
      const id = `assign-${mockMagnet.assignments.length}`;
      mockMagnet.assignments.push({ id, jobId, rowId, position, timeSlot });
      mockMagnet.status = mockMagnet.assignments.length > 1 ? MagnetStatus.MultiAssigned : MagnetStatus.Assigned;
      return id;
    }),
    removeAssignment: vi.fn((id: string) => {
      mockMagnet.assignments = mockMagnet.assignments.filter(a => a.id !== id);
      mockMagnet.status = mockMagnet.assignments.length === 0 ? MagnetStatus.Available : MagnetStatus.Assigned;
    }),
    updateTimeSlot: vi.fn((id: string, timeSlot: TimeSlot) => {
      const assignment = mockMagnet.assignments.find(a => a.id === id);
      if (assignment) {
        assignment.timeSlot = timeSlot;
        return true;
      }
      return false;
    }),
    startDrag: vi.fn(),
    endDrag: vi.fn(),
    isDragging: false,
    hasRequiredAttachments: vi.fn().mockReturnValue(true)
  };

  const magnetManager = {
    getMagnet: vi.fn(() => mockMagnet),
    linkMagnets: vi.fn(),
    unlinkMagnets: vi.fn(),
    magnets: new Map()
  };

  return { Magnet: class {}, MagnetStatus, magnetManager, __mockMagnet: mockMagnet };
});

import { useMagnet } from '../useMagnet';
import { MagnetStatus, __mockMagnet } from '../../classes/Magnet';

describe('useMagnet', () => {
  beforeEach(() => {
    __mockMagnet.assignments = [];
    __mockMagnet.status = MagnetStatus.Available;
  });

  it('assigns, updates, and removes assignments', () => {
    const { result } = renderHook(() => useMagnet('mock-magnet'));

    let assignmentId = '';
    act(() => {
      assignmentId = result.current.assignToJob('job1', 'row1', 0, { startTime: '08:00', endTime: '10:00' })!;
    });
    expect(result.current.magnet?.status).toBe(MagnetStatus.Assigned);
    expect(__mockMagnet.assignments).toHaveLength(1);

    act(() => {
      const updated = result.current.updateTimeSlot(assignmentId, { startTime: '09:00', endTime: '11:00' });
      expect(updated).toBe(true);
    });
    expect(__mockMagnet.assignments[0].timeSlot).toEqual({ startTime: '09:00', endTime: '11:00' });

    act(() => {
      result.current.removeAssignment(assignmentId);
    });
    expect(__mockMagnet.assignments).toHaveLength(0);
    expect(result.current.magnet?.status).toBe(MagnetStatus.Available);
  });
});
