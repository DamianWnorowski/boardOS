import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SchedulerProvider, useScheduler } from '../SchedulerContext';
import { DatabaseService } from '../../services/DatabaseService';

// Mock DatabaseService
vi.mock('../../services/DatabaseService', () => ({
  DatabaseService: {
    getAllScheduleData: vi.fn(),
    getJobsByDate: vi.fn(),
    getJobsByDateRange: vi.fn(),
    getTruckDriverAssignments: vi.fn(),
    getJobRowConfigs: vi.fn(),
    subscribeToScheduleChanges: vi.fn(() => () => {}),
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

describe('SchedulerContext View Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    (DatabaseService.getAllScheduleData as any).mockResolvedValue({
      jobs: [],
      resources: [],
      assignments: [],
      magnetRules: [],
      dropRules: [],
    });
    
    (DatabaseService.getJobsByDate as any).mockResolvedValue([]);
    (DatabaseService.getJobsByDateRange as any).mockResolvedValue([]);
    (DatabaseService.getTruckDriverAssignments as any).mockResolvedValue({});
    (DatabaseService.getJobRowConfigs as any).mockResolvedValue([]);
  });

  it('should load date-specific data when switching to day view', async () => {
    const { result } = renderHook(() => useScheduler(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const testDate = new Date('2025-09-02');
    result.current.setSelectedDate(testDate);

    await act(async () => {
      await result.current.setCurrentView('day');
    });

    expect(DatabaseService.getJobsByDate).toHaveBeenCalledWith(testDate);
  });

  it('should load week range data when switching to week view', async () => {
    const { result } = renderHook(() => useScheduler(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const testDate = new Date('2025-09-02'); // Monday
    result.current.setSelectedDate(testDate);

    await act(async () => {
      await result.current.setCurrentView('week');
    });

    // Should call getJobsByDateRange with Sunday to Saturday range
    expect(DatabaseService.getJobsByDateRange).toHaveBeenCalled();
    const [weekStart, weekEnd] = (DatabaseService.getJobsByDateRange as any).mock.calls[0];
    
    // Week should start on Sunday (day 0)
    expect(weekStart.getDay()).toBe(0);
    // Week should end on Saturday (day 6) 
    expect(weekEnd.getDay()).toBe(6);
  });

  it('should load all data when switching to month view', async () => {
    const { result } = renderHook(() => useScheduler(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setCurrentView('month');
    });

    expect(DatabaseService.getAllScheduleData).toHaveBeenCalled();
  });

  it('should adjust date when switching from month to day view', async () => {
    const { result } = renderHook(() => useScheduler(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Set to first day of current month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    result.current.setSelectedDate(firstOfMonth);

    // Switch to month view first
    await act(async () => {
      await result.current.setCurrentView('month');
    });

    // Switch to day view - should adjust date from 1st to today if current month
    await act(async () => {
      await result.current.setCurrentView('day');
    });

    const today = new Date();
    if (firstOfMonth.getMonth() === today.getMonth() && firstOfMonth.getFullYear() === today.getFullYear()) {
      // Should have adjusted to today's date
      expect(result.current.selectedDate.getDate()).toBe(today.getDate());
    }
  });

  it('should maintain date when switching from month to day view for different month', async () => {
    const { result } = renderHook(() => useScheduler(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Set to first day of previous month
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    previousMonth.setDate(1);
    result.current.setSelectedDate(previousMonth);

    // Switch to month view first
    await act(async () => {
      await result.current.setCurrentView('month');
    });

    // Switch to day view - should adjust to a reasonable day in that month
    await act(async () => {
      await result.current.setCurrentView('day');
    });

    // Should have maintained the month but adjusted the day
    expect(result.current.selectedDate.getMonth()).toBe(previousMonth.getMonth());
    expect(result.current.selectedDate.getDate()).toBeGreaterThan(1);
  });

  it('should persist view selection in localStorage', async () => {
    const mockSetItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    
    const { result } = renderHook(() => useScheduler(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setCurrentView('week');
    });

    expect(mockSetItem).toHaveBeenCalledWith('boardOS-view', 'week');
    
    mockSetItem.mockRestore();
  });
});