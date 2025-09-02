import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SchedulerProvider, useScheduler } from '../SchedulerContext';
import { DatabaseService } from '../../services/DatabaseService';

// Mock DatabaseService
vi.mock('../../services/DatabaseService', () => ({
  DatabaseService: {
    getAllScheduleData: vi.fn(),
    getTruckDriverAssignments: vi.fn(),
    getJobRowConfigs: vi.fn(),
    subscribeToScheduleChanges: vi.fn(() => () => {}),
    updateTruckDriverAssignment: vi.fn(),
    removeTruckDriverAssignment: vi.fn(),
    createAssignment: vi.fn(),
  },
}));

// Mock magnetManager
vi.mock('../../classes/Magnet', () => ({
  magnetManager: {
    clear: vi.fn(),
    setRulesAndColors: vi.fn(),
    createMagnet: vi.fn(),
    magnets: new Map(),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SchedulerProvider>{children}</SchedulerProvider>
);

describe('SchedulerContext Truck-Driver Operations', () => {
  const mockTruck = {
    id: 'truck-1',
    name: 'Truck 01',
    type: 'truck',
    identifier: '389',
  };

  const mockDriver = {
    id: 'driver-1',
    name: 'John Driver',
    type: 'driver',
    identifier: 'D01',
  };

  const mockJob = {
    id: 'job-1',
    name: 'Test Job',
    type: 'paving',
    startTime: '07:00',
    finalized: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    (DatabaseService.getAllScheduleData as any).mockResolvedValue({
      jobs: [mockJob],
      resources: [mockTruck, mockDriver],
      assignments: [],
      magnetRules: [],
      dropRules: [],
    });
    
    (DatabaseService.getTruckDriverAssignments as any).mockResolvedValue({});
    (DatabaseService.getJobRowConfigs as any).mockResolvedValue([]);
    (DatabaseService.updateTruckDriverAssignment as any).mockResolvedValue(undefined);
    (DatabaseService.removeTruckDriverAssignment as any).mockResolvedValue(undefined);
    (DatabaseService.createAssignment as any).mockResolvedValue({
      id: 'assignment-1',
      resourceId: 'truck-1',
      jobId: 'job-1',
      row: 'trucks',
      timeSlot: { startTime: '07:00', endTime: '15:30', isFullDay: true },
    });
  });

  it('should assign driver to truck with optimistic update', async () => {
    const { result } = renderHook(() => useScheduler(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.assignDriverToTruck('truck-1', 'driver-1');
    });

    expect(DatabaseService.updateTruckDriverAssignment).toHaveBeenCalledWith('truck-1', 'driver-1');
    expect(DatabaseService.getTruckDriverAssignments).toHaveBeenCalled(); // Reload call
  });

  it('should unassign driver from truck with optimistic update', async () => {
    // Setup initial assignment
    (DatabaseService.getTruckDriverAssignments as any).mockResolvedValue({
      'truck-1': 'driver-1'
    });

    const { result } = renderHook(() => useScheduler(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.unassignDriverFromTruck('truck-1');
    });

    expect(DatabaseService.removeTruckDriverAssignment).toHaveBeenCalledWith('truck-1');
    expect(DatabaseService.getTruckDriverAssignments).toHaveBeenCalled(); // Reload call
  });

  it('should handle truck assignment error and revert optimistic update', async () => {
    (DatabaseService.updateTruckDriverAssignment as any).mockRejectedValue(new Error('Assignment failed'));

    const { result } = renderHook(() => useScheduler(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.assignDriverToTruck('truck-1', 'driver-1');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    // Should have called getTruckDriverAssignments twice - once for revert after error
    expect(DatabaseService.getTruckDriverAssignments).toHaveBeenCalledTimes(2);
  });

  it('should automatically attach driver when truck is assigned to job', async () => {
    // Setup truck with assigned driver
    (DatabaseService.getTruckDriverAssignments as any).mockResolvedValue({
      'truck-1': 'driver-1'
    });

    // Mock creating both truck and driver assignments
    (DatabaseService.createAssignment as any)
      .mockResolvedValueOnce({
        id: 'truck-assignment-1',
        resourceId: 'truck-1',
        jobId: 'job-1',
        row: 'trucks',
        timeSlot: { startTime: '07:00', endTime: '15:30', isFullDay: true },
      })
      .mockResolvedValueOnce({
        id: 'driver-assignment-1',
        resourceId: 'driver-1',
        jobId: 'job-1',
        row: 'trucks',
        attachedTo: 'truck-assignment-1',
        timeSlot: { startTime: '07:00', endTime: '15:30', isFullDay: true },
      });

    const { result } = renderHook(() => useScheduler(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.assignResourceWithTruckConfig('truck-1', 'job-1', 'trucks');
    });

    // Should create two assignments - truck and attached driver
    expect(DatabaseService.createAssignment).toHaveBeenCalledTimes(2);
    
    // First call for truck
    expect(DatabaseService.createAssignment).toHaveBeenNthCalledWith(1, {
      resourceId: 'truck-1',
      jobId: 'job-1',
      row: 'trucks',
      position: 0,
      truckConfig: undefined,
      timeSlot: { startTime: '07:00', endTime: '15:30', isFullDay: true },
    });

    // Second call for driver attachment
    expect(DatabaseService.createAssignment).toHaveBeenNthCalledWith(2, {
      resourceId: 'driver-1',
      jobId: 'job-1',
      row: 'trucks',
      position: 0,
      attachedTo: 'truck-assignment-1',
      timeSlot: { startTime: '07:00', endTime: '15:30', isFullDay: true },
    });
  });

  it('should handle truck assignment when no driver is assigned', async () => {
    // No truck-driver assignments
    (DatabaseService.getTruckDriverAssignments as any).mockResolvedValue({});

    const { result } = renderHook(() => useScheduler(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.assignResourceWithTruckConfig('truck-1', 'job-1', 'trucks');
    });

    // Should only create truck assignment, no driver attachment
    expect(DatabaseService.createAssignment).toHaveBeenCalledTimes(1);
    expect(DatabaseService.createAssignment).toHaveBeenCalledWith({
      resourceId: 'truck-1',
      jobId: 'job-1',
      row: 'trucks',
      position: 0,
      truckConfig: undefined,
      timeSlot: { startTime: '07:00', endTime: '15:30', isFullDay: true },
    });
  });

  it('should continue with truck assignment even if driver attachment fails', async () => {
    // Setup truck with assigned driver
    (DatabaseService.getTruckDriverAssignments as any).mockResolvedValue({
      'truck-1': 'driver-1'
    });

    // Mock truck assignment success but driver attachment failure
    (DatabaseService.createAssignment as any)
      .mockResolvedValueOnce({
        id: 'truck-assignment-1',
        resourceId: 'truck-1',
        jobId: 'job-1',
        row: 'trucks',
        timeSlot: { startTime: '07:00', endTime: '15:30', isFullDay: true },
      })
      .mockRejectedValueOnce(new Error('Driver attachment failed'));

    const { result } = renderHook(() => useScheduler(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should not throw error - truck assignment should succeed
    await act(async () => {
      const assignmentId = await result.current.assignResourceWithTruckConfig('truck-1', 'job-1', 'trucks');
      expect(assignmentId).toBe('truck-assignment-1');
    });

    expect(DatabaseService.createAssignment).toHaveBeenCalledTimes(2);
  });
});