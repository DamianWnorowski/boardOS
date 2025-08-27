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
    info: vi.fn(),
    debug: vi.fn()
  }
}));

import { supabase } from '../../lib/supabase';
import logger from '../../utils/logger';

describe('DatabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schedule Data Operations', () => {
    const mockDbResource = {
      id: '1',
      type: 'operator',
      class_type: 'employee',
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
      classType: 'employee',
      name: 'John Doe',
      identifier: 'OP001',
      location: 'Site A',
      onSite: true
    };

    describe('getAllScheduleData', () => {
      it('should fetch and transform all schedule data correctly', async () => {
        let callIndex = 0;
        const tableCalls = ['resources', 'jobs', 'assignments', 'magnet_interaction_rules', 'drop_rules'];
        const fromMock = vi.fn(() => {
          const currentTable = tableCalls[callIndex];
          callIndex++;
          
          const tableData = {
            'resources': [mockDbResource],
            'jobs': [],
            'assignments': [],
            'magnet_interaction_rules': [],
            'drop_rules': []
          };
          
          if (currentTable === 'assignments') {
            return {
              select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: tableData[currentTable] || [],
                  error: null
                }))
              }))
            };
          } else if (currentTable === 'resources' || currentTable === 'jobs') {
            return {
              select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: tableData[currentTable] || [],
                  error: null
                }))
              }))
            };
          } else {
            // For magnet_interaction_rules and drop_rules
            return {
              select: vi.fn(() => Promise.resolve({
                data: tableData[currentTable] || [],
                error: null
              }))
            };
          }
        });
        (supabase.from as any) = fromMock;

        const scheduleData = await DatabaseService.getAllScheduleData();
        
        expect(fromMock).toHaveBeenCalledWith('resources');
        expect(scheduleData.resources).toEqual([mockResource]);
        expect(scheduleData.employees).toBeDefined();
        expect(scheduleData.equipment).toBeDefined();
      });

      it('should handle errors when fetching schedule data', async () => {
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

        await expect(DatabaseService.getAllScheduleData()).rejects.toThrow('Database error');
        expect(logger.error).toHaveBeenCalledWith('Error loading schedule data:', error);
      });
    });

    describe('createResource', () => {
      it('should create and return transformed employee resource', async () => {
        const newResource = { ...mockResource, classType: 'employee' as const };
        delete (newResource as any).id;
        
        const fromMock = vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: '1',
                  type: 'operator',
                  name: 'John Doe',
                  employee_id: 'OP001'
                },
                error: null
              }))
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        const created = await DatabaseService.createResource(newResource);
        
        expect(fromMock).toHaveBeenCalledWith('employees');
        expect(created.name).toEqual('John Doe');
        expect(created.classType).toEqual('employee');
      });

      it('should create and return transformed equipment resource', async () => {
        const equipmentResource = { 
          type: 'paver' as const, 
          classType: 'equipment' as const,
          name: 'Paver 1',
          identifier: 'PV001'
        };
        
        const fromMock = vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: '1',
                  type: 'paver',
                  name: 'Paver 1',
                  identifier: 'PV001'
                },
                error: null
              }))
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        const created = await DatabaseService.createResource(equipmentResource);
        
        expect(fromMock).toHaveBeenCalledWith('equipment');
        expect(created.name).toEqual('Paver 1');
        expect(created.classType).toEqual('equipment');
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

        const newResource = { ...mockResource, classType: 'employee' as const };
        delete (newResource as any).id;

        await expect(DatabaseService.createResource(newResource)).rejects.toThrow('Creation failed');
        expect(logger.error).toHaveBeenCalledWith('Error creating employee:', error);
      });
    });

    describe('updateResource', () => {
      it('should update and return transformed employee resource', async () => {
        const employeeResource = { ...mockResource, classType: 'employee' as const };
        
        // Mock for the select query to get current employee data
        const selectMock = vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: '1',
                type: 'operator',
                name: 'John Doe',
                employee_id: 'OP001'
              },
              error: null
            }))
          }))
        }));
        
        // Mock for the update query
        const updateMock = vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: '1',
                  type: 'operator',
                  name: 'John Doe',
                  employee_id: 'OP001'
                },
                error: null
              }))
            }))
          }))
        }));
        
        const fromMock = vi.fn(() => ({
          select: selectMock,
          update: updateMock
        }));
        (supabase.from as any) = fromMock;

        const updated = await DatabaseService.updateResource(employeeResource);
        
        expect(fromMock).toHaveBeenCalledWith('employees');
        expect(updated.name).toEqual('John Doe');
        expect(updated.classType).toEqual('employee');
      });
    });

    describe('deleteResource', () => {
      it('should delete resource from both tables successfully', async () => {
        const fromMock = vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              error: null
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        await DatabaseService.deleteResource('1');
        
        // Should try to delete from both employees and equipment tables
        expect(fromMock).toHaveBeenCalledWith('employees');
        expect(fromMock).toHaveBeenCalledWith('equipment');
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

    describe('updateJob', () => {
      it('should update and return transformed job', async () => {
        const fromMock = vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: mockDbJob,
                  error: null
                }))
              }))
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        const updated = await DatabaseService.updateJob(mockJob);
        
        expect(fromMock).toHaveBeenCalledWith('jobs');
        expect(updated).toEqual(mockJob);
      });
    });

    describe('deleteJob', () => {
      it('should delete job successfully', async () => {
        const fromMock = vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              error: null
            }))
          }))
        }));
        (supabase.from as any) = fromMock;

        await DatabaseService.deleteJob('1');
        
        expect(fromMock).toHaveBeenCalledWith('jobs');
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
      truckConfig: null,
      attachments: []
    };

    // Note: getAssignments is now part of getAllScheduleData method

    describe('createAssignment', () => {
      it('should create and return transformed assignment', async () => {
        const newAssignment = { ...mockAssignment };
        delete (newAssignment as any).id;
        
        let callCount = 0;
        const fromMock = vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // First call for insert
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({
                    data: mockDbAssignment,
                    error: null
                  }))
                }))
              }))
            };
          } else {
            // Second call for getting attachments
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({
                  data: [],
                  error: null
                }))
              }))
            };
          }
        });
        (supabase.from as any) = fromMock;

        const created = await DatabaseService.createAssignment(newAssignment);
        
        expect(fromMock).toHaveBeenCalledWith('assignments');
        expect(created).toEqual(mockAssignment);
      });
    });
  });

  describe('Rules Management', () => {
    describe('updateMagnetRule', () => {
      it('should update magnet interaction rule', async () => {
        const rule: MagnetInteractionRule = {
          sourceType: 'operator',
          targetType: 'paver',
          canAttach: true,
          isRequired: true,
          maxCount: 1
        };

        const fromMock = vi.fn(() => ({
          upsert: vi.fn(() => Promise.resolve({
            error: null
          }))
        }));
        (supabase.from as any) = fromMock;

        await DatabaseService.updateMagnetRule(rule);
        
        expect(fromMock).toHaveBeenCalledWith('magnet_interaction_rules');
      });
    });

    describe('updateDropRule', () => {
      it('should update drop rule', async () => {
        const fromMock = vi.fn(() => ({
          upsert: vi.fn(() => Promise.resolve({
            error: null
          }))
        }));
        (supabase.from as any) = fromMock;

        await DatabaseService.updateDropRule('Equipment', ['paver', 'roller']);
        
        expect(fromMock).toHaveBeenCalledWith('drop_rules');
      });
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should subscribe to schedule changes', () => {
      const callbacks = {
        onResourceChange: vi.fn(),
        onJobChange: vi.fn(),
        onAssignmentChange: vi.fn()
      };
      const channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis()
      };
      (supabase.channel as any) = vi.fn(() => channelMock);

      const unsubscribe = DatabaseService.subscribeToScheduleChanges(callbacks);

      expect(supabase.channel).toHaveBeenCalledWith('resources-changes');
      expect(supabase.channel).toHaveBeenCalledWith('jobs-changes');
      expect(supabase.channel).toHaveBeenCalledWith('assignments-changes');
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Specialized Operations', () => {
    describe('Job Row Configs', () => {
      it('should update job row config', async () => {
        const config = {
          jobId: 'job1',
          rowType: 'Equipment' as const,
          isSplit: false,
          boxes: []
        };
        
        const fromMock = vi.fn(() => ({
          upsert: vi.fn(() => Promise.resolve({
            error: null
          }))
        }));
        (supabase.from as any) = fromMock;

        await DatabaseService.updateJobRowConfig(config);
        
        expect(fromMock).toHaveBeenCalledWith('job_row_configs');
      });

      it('should get job row configs', async () => {
        const fromMock = vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({
            data: [{
              job_id: 'job1',
              row_type: 'Equipment',
              is_split: false,
              boxes: []
            }],
            error: null
          }))
        }));
        (supabase.from as any) = fromMock;

        const configs = await DatabaseService.getJobRowConfigs();
        
        expect(fromMock).toHaveBeenCalledWith('job_row_configs');
        expect(configs).toHaveLength(1);
        expect(configs[0].jobId).toBe('job1');
      });
    });

    describe('Truck Driver Assignments', () => {
      it('should update truck driver assignment', async () => {
        const deleteMock = vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }));
        const insertMock = vi.fn(() => Promise.resolve({ error: null }));
        
        const fromMock = vi.fn(() => ({
          delete: deleteMock,
          insert: insertMock
        }));
        (supabase.from as any) = fromMock;

        await DatabaseService.updateTruckDriverAssignment('truck1', 'driver1');
        
        expect(fromMock).toHaveBeenCalledWith('truck_driver_assignments');
      });

      it('should get truck driver assignments', async () => {
        const fromMock = vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({
            data: [{ truck_id: 'truck1', driver_id: 'driver1' }],
            error: null
          }))
        }));
        (supabase.from as any) = fromMock;

        const assignments = await DatabaseService.getTruckDriverAssignments();
        
        expect(fromMock).toHaveBeenCalledWith('truck_driver_assignments');
        expect(assignments['truck1']).toBe('driver1');
      });
    });
  });

  describe('Audit Functions', () => {
    it('should fetch audit trail', async () => {
      const mockAuditData = [
        { id: '1', action: 'INSERT', timestamp: '2024-01-01T00:00:00Z' }
      ];

      // Create a chainable mock that resolves to the expected data structure
      const mockResult = Promise.resolve({ data: mockAuditData, error: null });
      const mockQuery = {
        select: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
        eq: vi.fn(),
        then: mockResult.then.bind(mockResult),
        catch: mockResult.catch.bind(mockResult)
      };
      
      // Set up the chaining after the object is created
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.order.mockReturnValue(mockQuery);
      mockQuery.limit.mockReturnValue(mockQuery);
      mockQuery.eq.mockReturnValue(mockQuery);
      
      const fromMock = vi.fn(() => mockQuery);
      (supabase.from as any) = fromMock;

      const audit = await DatabaseService.getAuditTrail('resource', '1', 10);
      
      expect(fromMock).toHaveBeenCalledWith('audit_logs');
      expect(audit).toEqual(mockAuditData);
    });

    it('should handle audit trail errors', async () => {
      const error = new Error('Audit failed');
      // Create a chainable mock that resolves with error
      const mockResult = Promise.resolve({ data: null, error });
      const mockQuery = {
        select: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
        eq: vi.fn(),
        then: mockResult.then.bind(mockResult),
        catch: mockResult.catch.bind(mockResult)
      };
      
      // Set up the chaining after the object is created
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.order.mockReturnValue(mockQuery);
      mockQuery.limit.mockReturnValue(mockQuery);
      mockQuery.eq.mockReturnValue(mockQuery);
      
      const fromMock = vi.fn(() => mockQuery);
      (supabase.from as any) = fromMock;

      await expect(DatabaseService.getAuditTrail()).rejects.toThrow('Audit failed');
      expect(logger.error).toHaveBeenCalledWith('Error fetching audit trail:', error);
    });
  });
});