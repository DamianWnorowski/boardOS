import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SchedulerProvider, useScheduler } from '../SchedulerContext';
import type { RowType, Resource } from '../../types';

// Mock the DatabaseService to prevent real database calls
const mockStorage = {
  jobs: [] as any[],
  resources: [] as any[],
  assignments: [] as any[]
};

vi.mock('../../services/DatabaseService', () => ({
  DatabaseService: {
    loadJobs: vi.fn(() => Promise.resolve(mockStorage.jobs)),
    loadResources: vi.fn(() => Promise.resolve(mockStorage.resources)),
    loadAssignments: vi.fn(() => Promise.resolve(mockStorage.assignments)),
    loadJobRowConfigs: vi.fn(() => Promise.resolve([])),
    getJobsByDate: vi.fn(() => Promise.resolve(mockStorage.jobs)),
    getAllScheduleData: vi.fn(() => {
      console.log('getAllScheduleData called, returning:', mockStorage.jobs.length, 'jobs');
      return Promise.resolve({
        jobs: mockStorage.jobs,
        resources: mockStorage.resources,
        assignments: mockStorage.assignments,
        magnetRules: [],
        dropRules: []
      });
    }),
    getTruckDriverAssignments: vi.fn(() => Promise.resolve({})),
    getJobRowConfigs: vi.fn(() => Promise.resolve([])),
    createJob: vi.fn((job) => {
      const newJob = { ...job, id: `job-${Date.now()}` };
      mockStorage.jobs.push(newJob);
      return Promise.resolve(newJob);
    }),
    createResource: vi.fn((resource) => {
      const newResource = { ...resource, id: resource.id || `res-${Date.now()}` };
      mockStorage.resources.push(newResource);
      return Promise.resolve(newResource);
    }),
    createAssignment: vi.fn((assignment) => {
      const newAssignment = { ...assignment, id: `assign-${Date.now()}` };
      mockStorage.assignments.push(newAssignment);
      return Promise.resolve(newAssignment);
    }),
    updateResource: vi.fn((resource) => {
      const index = mockStorage.resources.findIndex(r => r.id === resource.id);
      if (index !== -1) mockStorage.resources[index] = resource;
      return Promise.resolve();
    }),
    updateAssignment: vi.fn((assignment) => {
      const index = mockStorage.assignments.findIndex(a => a.id === assignment.id);
      if (index !== -1) mockStorage.assignments[index] = assignment;
      return Promise.resolve();
    }),
    deleteAssignment: vi.fn(() => Promise.resolve()),
    updateJob: vi.fn((job) => {
      const index = mockStorage.jobs.findIndex(j => j.id === job.id);
      if (index !== -1) mockStorage.jobs[index] = job;
      return Promise.resolve();
    }),
    attachAssignments: vi.fn(() => Promise.resolve()),
    detachAssignments: vi.fn(() => Promise.resolve()),
    subscribeToScheduleChanges: vi.fn(() => () => {}), // Return a cleanup function
  }
}));

// Helper component to expose context for testing
const Consumer: React.FC = () => {
   
  const ctx = useScheduler();
  (Consumer as any).context = ctx; // store context on component for access in tests
  return null;
};

describe('SchedulerContext', () => {
  beforeEach(() => {
    // Reset mock data arrays
    mockStorage.jobs.length = 0;
    mockStorage.resources.length = 0; 
    mockStorage.assignments.length = 0;
    
    // Add initial test data
    mockStorage.jobs.push({
      id: 'test-job-1',
      name: 'Test Job',
      type: 'paving',
      notes: 'Test job for assignments'
    });
    
    mockStorage.resources.push({
      id: 'test-resource-1',
      name: 'Test Resource',
      type: 'operator',
      classType: 'employee',
      identifier: 'TR001',
      onSite: true,
      location: 'Site A'
    });
    
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      })
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('allows core scheduler actions and persists them to localStorage', async () => {
    render(
      <SchedulerProvider>
        <Consumer />
      </SchedulerProvider>
    );

    const ctx = (Consumer as any).context;
    
    // Wait for initial load
    await act(async () => {
      // Give the context time to initialize
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    console.log('Initial jobs:', ctx.jobs.map((j: any) => ({ id: j.id, name: j.name })));

    // addJob
    await act(async () => {
      await ctx.addJob({ name: 'New Job', type: 'paving', notes: 'Test' });
    });
    console.log('Jobs after addJob:', ctx.jobs.map((j: any) => ({ id: j.id, name: j.name })));
    expect(ctx.jobs.some((j: any) => j.name === 'New Job')).toBe(true);
    let persisted = JSON.parse(localStorage.getItem('scheduler-data')!);
    expect(persisted.jobs.some((j: any) => j.name === 'New Job')).toBe(true);

    // toggleResourceOnSite
    const resourceId = ctx.resources[0].id;
    const initialOnSite = ctx.resources[0].onSite;
    await act(async () => {
      ctx.toggleResourceOnSite(resourceId);
    });
    expect(ctx.resources.find((r: any) => r.id === resourceId)?.onSite).toBe(!initialOnSite);
    persisted = JSON.parse(localStorage.getItem('scheduler-data')!);
    expect(persisted.resources.find((r: any) => r.id === resourceId)?.onSite).toBe(!initialOnSite);

    // assignResource
    const jobId = ctx.jobs[0].id;
    let assignmentId: string | undefined;
    await act(async () => {
      assignmentId = ctx.assignResource(resourceId, jobId, 'crew' as RowType);
    });
    expect(ctx.assignments.find((a: any) => a.id === assignmentId)).toBeTruthy();
    persisted = JSON.parse(localStorage.getItem('scheduler-data')!);
    expect(persisted.assignments.find((a: any) => a.id === assignmentId)).toBeTruthy();

    // finalizeJob and unfinalizeJob
    await act(async () => {
      ctx.finalizeJob(jobId);
    });
    expect(ctx.jobs.find((j: any) => j.id === jobId)?.finalized).toBe(true);
    persisted = JSON.parse(localStorage.getItem('scheduler-data')!);
    expect(persisted.jobs.find((j: any) => j.id === jobId)?.finalized).toBe(true);

    await act(async () => {
      ctx.unfinalizeJob(jobId);
    });
    expect(ctx.jobs.find((j: any) => j.id === jobId)?.finalized).toBe(false);
    persisted = JSON.parse(localStorage.getItem('scheduler-data')!);
    expect(persisted.jobs.find((j: any) => j.id === jobId)?.finalized).toBe(false);
  });

  describe('Equipment Permission System', () => {
    it('should allow operators with proper equipment permissions to attach', async () => {
      const ctx = (Consumer as any).context;
      
      // Create an operator with paver permissions
      const operatorWithPermissions: Resource = {
        id: 'op1',
        name: 'John Doe',
        type: 'operator',
        classType: 'employee',
        identifier: 'OP001',
        allowedEquipment: ['paver', 'roller'],
        onSite: true,
        location: 'Site A'
      };

      // Create paver equipment
      const paverEquipment: Resource = {
        id: 'pv1',
        name: 'Paver 1',
        type: 'paver',
        classType: 'equipment',
        identifier: 'PV001',
        onSite: true,
        location: 'Site A'
      };

      await act(async () => {
        // Add resources first
        await ctx.addResource(operatorWithPermissions);
        await ctx.addResource(paverEquipment);
        
        // Assign both to the same job
        const jobId = ctx.jobs[0]?.id;
        if (jobId) {
          const operatorAssignmentId = await ctx.assignResource('op1', jobId, 'crew');
          const paverAssignmentId = await ctx.assignResource('pv1', jobId, 'Equipment');
          
          // Should be able to attach operator to paver
          await ctx.attachResources(paverAssignmentId, operatorAssignmentId);
          
          // Verify attachment was successful
          const operatorAssignment = ctx.getAssignmentById(operatorAssignmentId);
          expect(operatorAssignment?.attachedTo).toBe(paverAssignmentId);
        }
      });
    });

    it('should prevent operators without proper equipment permissions from attaching', async () => {
      const ctx = (Consumer as any).context;
      
      // Create an operator without paver permissions
      const operatorWithoutPermissions: Resource = {
        id: 'op2',
        name: 'Jane Smith',
        type: 'operator',
        classType: 'employee',
        identifier: 'OP002',
        allowedEquipment: ['roller'], // Only roller, not paver
        onSite: true,
        location: 'Site A'
      };

      // Create paver equipment
      const paverEquipment: Resource = {
        id: 'pv2',
        name: 'Paver 2',
        type: 'paver',
        classType: 'equipment',
        identifier: 'PV002',
        onSite: true,
        location: 'Site A'
      };

      await act(async () => {
        // Add resources first
        await ctx.addResource(operatorWithoutPermissions);
        await ctx.addResource(paverEquipment);
        
        // Assign both to the same job
        const jobId = ctx.jobs[0]?.id;
        if (jobId) {
          const operatorAssignmentId = await ctx.assignResource('op2', jobId, 'crew');
          const paverAssignmentId = await ctx.assignResource('pv2', jobId, 'Equipment');
          
          // Attempt to attach operator to paver should fail
          await ctx.attachResources(paverAssignmentId, operatorAssignmentId);
          
          // Verify attachment was prevented
          const operatorAssignment = ctx.getAssignmentById(operatorAssignmentId);
          expect(operatorAssignment?.attachedTo).toBeUndefined();
          
          // Should set an error
          expect(ctx.error).toContain('not authorized to operate paver equipment');
        }
      });
    });

    it('should allow operators with no restrictions (backward compatibility)', async () => {
      const ctx = (Consumer as any).context;
      
      // Create an operator with no allowedEquipment specified
      const operatorNoRestrictions: Resource = {
        id: 'op3',
        name: 'Bob Wilson',
        type: 'operator',
        classType: 'employee',
        identifier: 'OP003',
        // allowedEquipment not specified - should allow all
        onSite: true,
        location: 'Site A'
      };

      // Create paver equipment
      const paverEquipment: Resource = {
        id: 'pv3',
        name: 'Paver 3',
        type: 'paver',
        classType: 'equipment',
        identifier: 'PV003',
        onSite: true,
        location: 'Site A'
      };

      await act(async () => {
        // Add resources first  
        await ctx.addResource(operatorNoRestrictions);
        await ctx.addResource(paverEquipment);
        
        // Assign both to the same job
        const jobId = ctx.jobs[0]?.id;
        if (jobId) {
          const operatorAssignmentId = await ctx.assignResource('op3', jobId, 'crew');
          const paverAssignmentId = await ctx.assignResource('pv3', jobId, 'Equipment');
          
          // Should be able to attach operator to paver (backward compatibility)
          await ctx.attachResources(paverAssignmentId, operatorAssignmentId);
          
          // Verify attachment was successful
          const operatorAssignment = ctx.getAssignmentById(operatorAssignmentId);
          expect(operatorAssignment?.attachedTo).toBe(paverAssignmentId);
        }
      });
    });

    it('should allow operators with empty permissions array (backward compatibility)', async () => {
      const ctx = (Consumer as any).context;
      
      // Create an operator with empty allowedEquipment array
      const operatorEmptyPermissions: Resource = {
        id: 'op4',
        name: 'Alice Johnson',
        type: 'operator',
        classType: 'employee',
        identifier: 'OP004',
        allowedEquipment: [], // Empty array - should allow all
        onSite: true,
        location: 'Site A'
      };

      // Create paver equipment
      const paverEquipment: Resource = {
        id: 'pv4',
        name: 'Paver 4',
        type: 'paver',
        classType: 'equipment',
        identifier: 'PV004',
        onSite: true,
        location: 'Site A'
      };

      await act(async () => {
        // Add resources first
        await ctx.addResource(operatorEmptyPermissions);
        await ctx.addResource(paverEquipment);
        
        // Assign both to the same job
        const jobId = ctx.jobs[0]?.id;
        if (jobId) {
          const operatorAssignmentId = await ctx.assignResource('op4', jobId, 'crew');
          const paverAssignmentId = await ctx.assignResource('pv4', jobId, 'Equipment');
          
          // Should be able to attach operator to paver (backward compatibility)
          await ctx.attachResources(paverAssignmentId, operatorAssignmentId);
          
          // Verify attachment was successful
          const operatorAssignment = ctx.getAssignmentById(operatorAssignmentId);
          expect(operatorAssignment?.attachedTo).toBe(paverAssignmentId);
        }
      });
    });
  });
});

