import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../DatabaseService';
import { Resource, Job, Assignment, MagnetInteractionRule, DropRule } from '../../types';

// Mock the supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis()
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    })),
    rpc: vi.fn()
  },
  DbResource: {},
  DbJob: {},
  DbAssignment: {},
  DbMagnetRule: {},
  DbDropRule: {}
}));

// Mock the logger
vi.mock('../../utils/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

import { supabase } from '../../lib/supabase';
import logger from '../../utils/logger';

describe('DatabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Resources CRUD', () => {
    const mockDbResource = {
      id: '1',
      type: 'operator',
      name: 'John Doe',
      identifier: 'OP001',
      model: null,
      vin: null,
      location: 'Site A',
      on_site: true
    };

    const mockResource: Resource = {
      id: '1',
      type: 'operator',
      name: 'John Doe',
      identifier: 'OP001',
      location: 'Site A',
      onSite: true
    };

    describe('getResources', () => {
      it('should fetch and transform resources correctly', async () => {
        const fromMock = vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [mockDbResource],
              error: null
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        const resources = await DatabaseService.getResources();
        
        expect(fromMock).toHaveBeenCalledWith('resources');
        expect(resources).toEqual([mockResource]);
      });

      it('should handle errors when fetching resources', async () => {
        const error = new Error('Database error');
        const fromMock = vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: null,
              error
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        await expect(DatabaseService.getResources()).rejects.toThrow('Database error');
        expect(logger.error).toHaveBeenCalledWith('Error fetching resources:', error);
      });
    });

    describe('createResource', () => {
      it('should create and return transformed resource', async () => {
        const newResource = { ...mockResource };
        delete (newResource as any).id;
        
        const fromMock = vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: mockDbResource,
                error: null
              }))
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        const created = await DatabaseService.createResource(newResource);
        
        expect(fromMock).toHaveBeenCalledWith('resources');
        expect(created).toEqual(mockResource);
      });

      it('should handle creation errors', async () => {
        const error = new Error('Creation failed');
        const fromMock = vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: null,
                error
              }))
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        await expect(DatabaseService.createResource({} as any)).rejects.toThrow('Creation failed');
        expect(logger.error).toHaveBeenCalledWith('Error creating resource:', error);
      });
    });

    describe('updateResource', () => {
      it('should update and return transformed resource', async () => {
        const fromMock = vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: mockDbResource,
                  error: null
                }))
              }))
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        const updated = await DatabaseService.updateResource(mockResource);
        
        expect(fromMock).toHaveBeenCalledWith('resources');
        expect(updated).toEqual(mockResource);
      });
    });

    describe('deleteResource', () => {
      it('should delete resource successfully', async () => {
        const fromMock = vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              error: null
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        await DatabaseService.deleteResource('1');
        
        expect(fromMock).toHaveBeenCalledWith('resources');
      });

      it('should handle deletion errors', async () => {
        const error = new Error('Deletion failed');
        const fromMock = vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              error
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        await expect(DatabaseService.deleteResource('1')).rejects.toThrow('Deletion failed');
        expect(logger.error).toHaveBeenCalledWith('Error deleting resource:', error);
      });
    });
  });

  describe('Jobs CRUD', () => {
    const mockDbJob = {
      id: '1',
      name: 'Test Job',
      job_number: 'J001',
      type: 'paving',
      shift: 'day',
      notes: 'Test notes',
      start_time: '08:00',
      finalized: false,
      plants: ['Plant A'],
      location: { address: '123 Main St', lat: 0, lng: 0 }
    };

    const mockJob: Job = {
      id: '1',
      name: 'Test Job',
      number: 'J001',
      type: 'paving',
      shift: 'day',
      notes: 'Test notes',
      startTime: '08:00',
      finalized: false,
      plants: ['Plant A'],
      location: { address: '123 Main St', lat: 0, lng: 0 }
    };

    describe('getJobs', () => {
      it('should fetch and transform jobs correctly', async () => {
        const fromMock = vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [mockDbJob],
              error: null
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        const jobs = await DatabaseService.getJobs();
        
        expect(fromMock).toHaveBeenCalledWith('jobs');
        expect(jobs).toEqual([mockJob]);
      });
    });

    describe('createJob', () => {
      it('should create and return transformed job', async () => {
        const newJob = { ...mockJob };
        delete (newJob as any).id;
        
        const fromMock = vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: mockDbJob,
                error: null
              }))
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        const created = await DatabaseService.createJob(newJob);
        
        expect(fromMock).toHaveBeenCalledWith('jobs');
        expect(created).toEqual(mockJob);
      });
    });
  });

  describe('Assignments CRUD', () => {
    const mockDbAssignment = {
      id: '1',
      resource_id: 'resource1',
      job_id: 'job1',
      row_type: 'crew',
      position: 0,
      attached_to_assignment_id: null,
      time_slot: { startTime: '08:00', endTime: '12:00', isFullDay: false },
      note: 'Test note',
      truck_config: null
    };

    const mockAssignment: Assignment = {
      id: '1',
      resourceId: 'resource1',
      jobId: 'job1',
      row: 'crew',
      position: 0,
      attachedTo: undefined,
      timeSlot: { startTime: '08:00', endTime: '12:00', isFullDay: false },
      note: 'Test note',
      truckConfig: undefined
    };

    describe('getAssignments', () => {
      it('should fetch and transform assignments correctly', async () => {
        const fromMock = vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [mockDbAssignment],
              error: null
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        const assignments = await DatabaseService.getAssignments();
        
        expect(fromMock).toHaveBeenCalledWith('assignments');
        expect(assignments).toEqual([mockAssignment]);
      });
    });

    describe('createAssignment', () => {
      it('should create and return transformed assignment', async () => {
        const newAssignment = { ...mockAssignment };
        delete (newAssignment as any).id;
        
        const fromMock = vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: mockDbAssignment,
                error: null
              }))
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        const created = await DatabaseService.createAssignment(newAssignment);
        
        expect(fromMock).toHaveBeenCalledWith('assignments');
        expect(created).toEqual(mockAssignment);
      });
    });
  });

  describe('Rules Management', () => {
    describe('getMagnetInteractionRules', () => {
      it('should fetch and transform magnet interaction rules', async () => {
        const mockDbRule = {
          source_type: 'operator',
          target_type: 'paver',
          can_attach: true,
          is_required: true,
          max_count: 1
        };

        const expectedRule: MagnetInteractionRule = {
          sourceType: 'operator',
          targetType: 'paver',
          canAttach: true,
          isRequired: true,
          maxCount: 1
        };

        const fromMock = vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [mockDbRule],
              error: null
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        const rules = await DatabaseService.getMagnetInteractionRules();
        
        expect(fromMock).toHaveBeenCalledWith('magnet_interaction_rules');
        expect(rules).toEqual([expectedRule]);
      });
    });

    describe('getDropRules', () => {
      it('should fetch and transform drop rules', async () => {
        const mockDbRule = {
          row_type: 'Equipment',
          allowed_types: ['paver', 'roller']
        };

        const expectedRule: DropRule = {
          rowType: 'Equipment',
          allowedTypes: ['paver', 'roller']
        };

        const fromMock = vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [mockDbRule],
              error: null
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        const rules = await DatabaseService.getDropRules();
        
        expect(fromMock).toHaveBeenCalledWith('drop_rules');
        expect(rules).toEqual([expectedRule]);
      });
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should subscribe to resources changes', () => {
      const callback = vi.fn();
      const channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis()
      };
      (supabase.channel as any) = vi.fn(() => channelMock);

      DatabaseService.subscribeToResources(callback);

      expect(supabase.channel).toHaveBeenCalledWith('resources-changes');
      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resources' },
        callback
      );
      expect(channelMock.subscribe).toHaveBeenCalled();
    });

    it('should subscribe to jobs changes', () => {
      const callback = vi.fn();
      const channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis()
      };
      (supabase.channel as any) = vi.fn(() => channelMock);

      DatabaseService.subscribeToJobs(callback);

      expect(supabase.channel).toHaveBeenCalledWith('jobs-changes');
      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        callback
      );
    });

    it('should subscribe to assignments changes', () => {
      const callback = vi.fn();
      const channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis()
      };
      (supabase.channel as any) = vi.fn(() => channelMock);

      DatabaseService.subscribeToAssignments(callback);

      expect(supabase.channel).toHaveBeenCalledWith('assignments-changes');
      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        callback
      );
    });
  });

  describe('Specialized Queries', () => {
    it('should fetch resources with assignments', async () => {
      const mockData = {
        id: '1',
        type: 'operator',
        name: 'John Doe',
        identifier: 'OP001',
        model: null,
        vin: null,
        location: 'Site A',
        on_site: true,
        assignments: [{
          id: 'a1',
          resource_id: '1',
          job_id: 'job1',
          row_type: 'crew',
          position: 0,
          attached_to_assignment_id: null,
          time_slot: null,
          note: null,
          truck_config: null
        }]
      };

      const fromMock = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [mockData],
            error: null
          }))
        }))
      }));
      (supabase.from as any) = fromMock;

      const result = await DatabaseService.getResourcesWithAssignments();
      
      expect(result).toHaveLength(1);
      expect(result[0].assignments).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('should fetch jobs with assignments', async () => {
      const mockData = {
        id: '1',
        name: 'Test Job',
        job_number: 'J001',
        type: 'paving',
        shift: 'day',
        notes: null,
        start_time: null,
        finalized: false,
        plants: [],
        location: null,
        assignments: [{
          id: 'a1',
          resource_id: 'r1',
          job_id: '1',
          row_type: 'Equipment',
          position: 0,
          attached_to_assignment_id: null,
          time_slot: null,
          note: null,
          truck_config: null
        }]
      };

      const fromMock = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [mockData],
            error: null
          }))
        }))
      }));
      (supabase.from as any) = fromMock;

      const result = await DatabaseService.getJobsWithAssignments();
      
      expect(result).toHaveLength(1);
      expect(result[0].assignments).toHaveLength(1);
      expect(result[0].name).toBe('Test Job');
    });
  });

  describe('Audit Functions', () => {
    it('should fetch audit trail', async () => {
      const mockAuditData = [
        { id: '1', action: 'INSERT', timestamp: '2024-01-01T00:00:00Z' }
      ];

      (supabase.rpc as any) = vi.fn(() => Promise.resolve({
        data: mockAuditData,
        error: null
      }));

      const audit = await DatabaseService.getAuditTrail('resource', '1', 10);
      
      expect(supabase.rpc).toHaveBeenCalledWith('get_audit_trail', {
        entity_type_param: 'resource',
        entity_id_param: '1',
        limit_param: 10
      });
      expect(audit).toEqual(mockAuditData);
    });

    it('should handle audit trail errors', async () => {
      const error = new Error('Audit failed');
      (supabase.rpc as any) = vi.fn(() => Promise.resolve({
        data: null,
        error
      }));

      await expect(DatabaseService.getAuditTrail('resource')).rejects.toThrow('Audit failed');
      expect(logger.error).toHaveBeenCalledWith('Error fetching audit trail:', error);
    });
  });
});