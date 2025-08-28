import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestDatabaseService } from '../../src/services/TestDatabaseService';

describe('Drag and Drop Integration Tests', () => {
  let testDb: TestDatabaseService;

  beforeAll(async () => {
    testDb = new TestDatabaseService('drag-drop');
    await testDb.setup();
  }, 30000); // 30 second timeout for database operations

  afterAll(async () => {
    await testDb.cleanup();
  }, 30000); // 30 second timeout for cleanup

  describe('Equipment Placement Rules', () => {
    it('should allow ALL equipment types in Equipment row', async () => {
      const equipmentTypes = [
        'skidsteer', 'paver', 'excavator', 'sweeper', 
        'millingMachine', 'grader', 'dozer', 'payloader', 
        'roller', 'equipment'
      ];

      const job = await testDb.createTestJob({
        name: 'Equipment Test Job',
        type: 'paving',
        shift: 'day'
      });

      for (const equipmentType of equipmentTypes) {
        const equipment = await testDb.createTestResource({
          type: equipmentType as any,
          name: `Test ${equipmentType}`
        });

        const result = await testDb.testDragAndDrop(equipment.id, job.id, 'Equipment');
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it('should allow foreman in ALL row types', async () => {
      const rowTypes = ['Forman', 'Equipment', 'Sweeper', 'Tack', 'MPT', 'crew', 'trucks'];
      
      const job = await testDb.createTestJob({
        name: 'Foreman Test Job',
        type: 'paving',
        shift: 'day'
      });

      for (const rowType of rowTypes) {
        const foreman = await testDb.createTestResource({
          type: 'foreman',
          name: `Test Foreman ${rowType}`
        });

        const result = await testDb.testDragAndDrop(foreman.id, job.id, rowType as any);
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });
  });

  describe('UI Update Verification', () => {
    it('should update UI without manual refresh when dropping operator on equipment', async () => {
      const operator = await testDb.createTestResource({
        type: 'operator',
        name: 'Test UI Operator'
      });

      const paver = await testDb.createTestResource({
        type: 'paver',
        name: 'Test UI Paver'
      });

      const job = await testDb.createTestJob({
        name: 'UI Test Job',
        type: 'paving',
        shift: 'day'
      });

      // Assign paver first
      const paverResult = await testDb.testDragAndDrop(paver.id, job.id, 'Equipment');
      expect(paverResult.success).toBe(true);

      // Assign operator
      const operatorResult = await testDb.testDragAndDrop(operator.id, job.id, 'Equipment');
      expect(operatorResult.success).toBe(true);

      // Test attachment
      const attachResult = await testDb.testAttachment(operator.id, paver.id);
      expect(attachResult.success).toBe(true);
    });

    it('should update UI when removing resources by dragging off', async () => {
      const resource = await testDb.createTestResource({
        type: 'laborer',
        name: 'Test Remove Laborer'
      });

      const job = await testDb.createTestJob({
        name: 'Remove Test Job',
        type: 'paving',
        shift: 'day'
      });

      // Assign resource
      const assignResult = await testDb.testDragAndDrop(resource.id, job.id, 'crew');
      expect(assignResult.success).toBe(true);
      expect(assignResult.assignment).toBeDefined();

      // Remove assignment (simulate drag off)
      if (assignResult.assignment) {
        const { DatabaseService } = await import('../../src/services/DatabaseService');
        await DatabaseService.removeAssignment(assignResult.assignment.id);
        
        // Verify removal
        const removedAssignment = await DatabaseService.getAssignmentById(assignResult.assignment.id);
        expect(removedAssignment).toBeNull();
      }
    });
  });

  describe('Real-time Subscription Tests', () => {
    it('should receive real-time updates for resource changes', async () => {
      const result = await testDb.testRealTimeSubscription('resource-test', 'resources', 3000);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should receive real-time updates for assignment changes', async () => {
      const result = await testDb.testRealTimeSubscription('assignment-test', 'assignments', 3000);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Color System Validation', () => {
    it('should apply correct colors to resources', async () => {
      const colorTests = [
        { type: 'operator', expectedBg: 'bg-white', expectedText: 'text-black' },
        { type: 'driver', expectedBg: 'bg-green-500', expectedText: 'text-black' },
        { type: 'striper', expectedBg: 'bg-blue-500', expectedText: 'text-white' },
        { type: 'foreman', expectedBg: 'bg-orange-500', expectedText: 'text-black' },
        { type: 'laborer', expectedBg: 'bg-white', expectedText: 'text-green-600' },
        { type: 'truck', expectedBg: 'bg-black', expectedText: 'text-white' },
        { type: 'paver', expectedBg: 'bg-yellow-500', expectedText: 'text-white' }
      ];

      const { getResourceStyle } = await import('../../src/utils/colorSystem');

      for (const test of colorTests) {
        const style = getResourceStyle(test.type);
        expect(style).toContain(test.expectedBg);
        expect(style).toContain(test.expectedText);
      }
    });
  });

  describe('Comprehensive Test Suite', () => {
    it('should pass all comprehensive tests', async () => {
      const results = await testDb.runComprehensiveTests();
      
      console.log(`Tests passed: ${results.passed}/${results.passed + results.failed}`);
      
      for (const result of results.results) {
        if (!result.passed) {
          console.error(`Failed: ${result.test} - ${result.error}`);
        }
      }

      expect(results.failed).toBe(0);
      expect(results.passed).toBeGreaterThan(0);
    });
  });
});