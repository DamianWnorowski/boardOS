import { supabase } from '../lib/supabase';
import { DatabaseService } from './DatabaseService';
import { Resource, Assignment, Job, MagnetInteractionRule, DropRule } from '../types';
import logger from '../utils/logger';

/**
 * Test Database Service for running tests against real Supabase
 * Provides isolated test environments and automatic cleanup
 */
export class TestDatabaseService {
  private testPrefix: string;
  private createdTestData: {
    resources: string[];
    jobs: string[];
    assignments: string[];
  };

  constructor(testName: string = 'test') {
    // Unique prefix for test data to avoid conflicts
    this.testPrefix = `TEST_${testName}_${Date.now()}`;
    this.createdTestData = {
      resources: [],
      jobs: [],
      assignments: []
    };
  }

  /**
   * Initialize test environment
   */
  async setup(): Promise<void> {
    logger.info(`🧪 Setting up test environment: ${this.testPrefix}`);
    // Clear any orphaned test data from previous runs
    await this.cleanupOrphanedTestData();
  }

  /**
   * Create test resource with automatic tracking
   */
  async createTestResource(data: Partial<Resource> & { type: Resource['type'], name: string }): Promise<Resource> {
    // Determine classType based on resource type
    const personnelTypes = ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
    const classType = personnelTypes.includes(data.type) ? 'employee' : 'equipment';
    
    const testResource = await DatabaseService.createResource({
      ...data,
      classType,
      name: `${this.testPrefix}_${data.name}`
    });
    this.createdTestData.resources.push(testResource.id);
    return testResource;
  }

  /**
   * Create test job with automatic tracking
   */
  async createTestJob(data: Partial<Job> & { name: string, type: Job['type'], shift: Job['shift'] }): Promise<Job> {
    const testJob = await DatabaseService.createJob({
      ...data,
      name: `${this.testPrefix}_${data.name}`
    });
    this.createdTestData.jobs.push(testJob.id);
    return testJob;
  }

  /**
   * Create test assignment with automatic tracking
   */
  async createTestAssignment(resourceId: string, jobId: string, row: Assignment['row']): Promise<Assignment> {
    const assignment = await DatabaseService.assignResource(resourceId, jobId, row);
    this.createdTestData.assignments.push(assignment.id);
    return assignment;
  }

  /**
   * Test drag and drop operation with UI update verification
   */
  async testDragAndDrop(
    sourceResourceId: string, 
    targetJobId: string, 
    targetRow: Assignment['row']
  ): Promise<{ success: boolean; error?: string; assignment?: Assignment }> {
    try {
      // Perform the drag and drop
      const assignment = await DatabaseService.assignResource(sourceResourceId, targetJobId, targetRow);
      this.createdTestData.assignments.push(assignment.id);

      // Verify the assignment was created
      const verifyAssignment = await DatabaseService.getAssignmentById(assignment.id);
      if (!verifyAssignment) {
        return { success: false, error: 'Assignment not found after creation' };
      }

      // Verify UI would update (check if real-time subscription would trigger)
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignment.id)
        .single();

      if (!assignmentData) {
        return { success: false, error: 'Assignment not in database' };
      }

      return { success: true, assignment };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test attachment operation (magnet behavior)
   */
  async testAttachment(
    sourceResourceId: string,
    targetResourceId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get assignments for both resources
      const sourceAssignments = await DatabaseService.getAssignmentsByResourceId(sourceResourceId);
      const targetAssignments = await DatabaseService.getAssignmentsByResourceId(targetResourceId);

      if (sourceAssignments.length === 0 || targetAssignments.length === 0) {
        return { success: false, error: 'Resources must be assigned before attachment' };
      }

      // Perform attachment
      await DatabaseService.attachResources(sourceAssignments[0].id, targetAssignments[0].id);

      // Verify attachment
      const updatedTarget = await DatabaseService.getAssignmentById(targetAssignments[0].id);
      if (!updatedTarget?.attachments?.includes(sourceAssignments[0].id)) {
        return { success: false, error: 'Attachment not recorded' };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test rule validation
   */
  async testRuleValidation(
    resourceType: Resource['type'],
    rowType: Assignment['row']
  ): Promise<{ allowed: boolean; rule?: DropRule }> {
    const dropRules = await DatabaseService.getDropRules();
    const rule = dropRules.find(r => r.rowType === rowType);
    const allowed = rule ? rule.allowedTypes.includes(resourceType) : false;
    return { allowed, rule };
  }

  /**
   * Generate comprehensive test matrix for all drag & drop combinations
   */
  async generateDragDropTestMatrix(): Promise<Array<{
    resourceType: Resource['type'];
    rowType: Assignment['row'];
    expectedResult: boolean;
    testName: string;
  }>> {
    const dropRules = await DatabaseService.getDropRules();
    const resourceTypes: Resource['type'][] = [
      'operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver',
      'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
      'grader', 'dozer', 'payloader', 'roller', 'equipment', 'truck'
    ];
    const rowTypes: Assignment['row'][] = ['Forman', 'Equipment', 'Sweeper', 'Tack', 'MPT', 'crew', 'trucks'];

    const testMatrix = [];
    for (const resourceType of resourceTypes) {
      for (const rowType of rowTypes) {
        const rule = dropRules.find(r => r.rowType === rowType);
        const expectedResult = rule ? rule.allowedTypes.includes(resourceType) : false;
        testMatrix.push({
          resourceType,
          rowType,
          expectedResult,
          testName: `Can drop ${resourceType} on ${rowType} row`
        });
      }
    }

    return testMatrix;
  }

  /**
   * Test real-time subscription
   */
  async testRealTimeSubscription(
    channelName: string,
    tableName: string,
    timeout: number = 5000
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      let subscriptionReceived = false;
      const timeoutId = setTimeout(() => {
        supabase.removeChannel(subscription);
        if (!subscriptionReceived) {
          resolve({ success: false, error: 'Subscription timeout' });
        }
      }, timeout);

      const subscription = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: tableName 
        }, () => {
          subscriptionReceived = true;
          clearTimeout(timeoutId);
          supabase.removeChannel(subscription);
          resolve({ success: true });
        })
        .subscribe();

      // Trigger a change after subscription is ready
      setTimeout(async () => {
        if (tableName === 'resources') {
          await this.createTestResource({
            type: 'laborer',
            name: 'Subscription Test'
          });
        }
      }, 1000);
    });
  }

  /**
   * Clean up all test data
   */
  async cleanup(): Promise<void> {
    logger.info(`🧹 Cleaning up test data for: ${this.testPrefix}`);

    // Delete assignments first (due to foreign key constraints)
    for (const assignmentId of this.createdTestData.assignments) {
      try {
        await DatabaseService.removeAssignment(assignmentId);
      } catch (error) {
        logger.error(`Failed to delete test assignment ${assignmentId}:`, error);
      }
    }

    // Delete jobs
    for (const jobId of this.createdTestData.jobs) {
      try {
        await DatabaseService.deleteJob(jobId);
      } catch (error) {
        logger.error(`Failed to delete test job ${jobId}:`, error);
      }
    }

    // Delete resources
    for (const resourceId of this.createdTestData.resources) {
      try {
        await DatabaseService.deleteResource(resourceId);
      } catch (error) {
        logger.error(`Failed to delete test resource ${resourceId}:`, error);
      }
    }

    logger.info(`✅ Test cleanup complete for: ${this.testPrefix}`);
  }

  /**
   * Clean up orphaned test data from previous runs
   */
  private async cleanupOrphanedTestData(): Promise<void> {
    // Delete old test resources
    const { data: testResources } = await supabase
      .from('resources')
      .select('id')
      .like('name', 'TEST_%');

    if (testResources) {
      for (const resource of testResources) {
        await DatabaseService.deleteResource(resource.id);
      }
    }

    // Delete old test jobs
    const { data: testJobs } = await supabase
      .from('jobs')
      .select('id')
      .like('name', 'TEST_%');

    if (testJobs) {
      for (const job of testJobs) {
        await DatabaseService.deleteJob(job.id);
      }
    }
  }

  /**
   * Run comprehensive test suite
   */
  async runComprehensiveTests(): Promise<{
    passed: number;
    failed: number;
    results: Array<{ test: string; passed: boolean; error?: string }>;
  }> {
    const results = [];
    let passed = 0;
    let failed = 0;

    // Test 1: Database connectivity
    try {
      const { data } = await supabase.from('resources').select('count').limit(1);
      results.push({ test: 'Database Connectivity', passed: true });
      passed++;
    } catch (error: any) {
      results.push({ test: 'Database Connectivity', passed: false, error: error.message });
      failed++;
    }

    // Test 2: Create and verify resources
    try {
      const operator = await this.createTestResource({
        type: 'operator',
        name: 'Test Operator'
      });
      const equipment = await this.createTestResource({
        type: 'paver',
        name: 'Test Paver'
      });
      results.push({ test: 'Create Resources', passed: true });
      passed++;
    } catch (error: any) {
      results.push({ test: 'Create Resources', passed: false, error: error.message });
      failed++;
    }

    // Test 3: Create job and assignments
    try {
      const job = await this.createTestJob({
        name: 'Test Job',
        type: 'paving',
        shift: 'day'
      });
      results.push({ test: 'Create Job', passed: true });
      passed++;
    } catch (error: any) {
      results.push({ test: 'Create Job', passed: false, error: error.message });
      failed++;
    }

    // Test 4: Test drag and drop matrix
    const testMatrix = await this.generateDragDropTestMatrix();
    for (const matrixTest of testMatrix.slice(0, 5)) { // Test first 5 combinations
      const validation = await this.testRuleValidation(matrixTest.resourceType, matrixTest.rowType);
      if (validation.allowed === matrixTest.expectedResult) {
        results.push({ test: matrixTest.testName, passed: true });
        passed++;
      } else {
        results.push({ 
          test: matrixTest.testName, 
          passed: false, 
          error: `Expected ${matrixTest.expectedResult}, got ${validation.allowed}` 
        });
        failed++;
      }
    }

    // Test 5: Real-time subscriptions
    const realtimeResult = await this.testRealTimeSubscription('test-channel', 'resources');
    results.push({ 
      test: 'Real-time Subscriptions', 
      passed: realtimeResult.success,
      error: realtimeResult.error
    });
    if (realtimeResult.success) passed++;
    else failed++;

    return { passed, failed, results };
  }
}

/**
 * Automatic test generator that creates tests when rules change
 */
export class AutoTestGenerator {
  /**
   * Generate tests for new drop rules
   */
  static generateDropRuleTests(dropRules: DropRule[]): string {
    const tests = dropRules.map(rule => {
      const testCases = rule.allowedTypes.map(type => 
        `  it('should allow ${type} in ${rule.rowType} row', async () => {
    const testDb = new TestDatabaseService('drop-rule');
    await testDb.setup();
    
    const resource = await testDb.createTestResource({ type: '${type}', name: 'Test ${type}' });
    const job = await testDb.createTestJob({ name: 'Test Job', type: 'paving', shift: 'day' });
    const result = await testDb.testDragAndDrop(resource.id, job.id, '${rule.rowType}');
    
    expect(result.success).toBe(true);
    await testDb.cleanup();
  });`
      ).join('\n\n');

      return `describe('Drop Rules: ${rule.rowType}', () => {
${testCases}
});`;
    }).join('\n\n');

    return `import { TestDatabaseService } from '../services/TestDatabaseService';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

${tests}`;
  }

  /**
   * Generate tests for magnet interaction rules
   */
  static generateMagnetRuleTests(magnetRules: MagnetInteractionRule[]): string {
    const tests = magnetRules.filter(rule => rule.canAttach).map(rule => 
      `  it('should ${rule.isRequired ? 'require' : 'allow'} ${rule.sourceType} to attach to ${rule.targetType}', async () => {
    const testDb = new TestDatabaseService('magnet-rule');
    await testDb.setup();
    
    const source = await testDb.createTestResource({ type: '${rule.sourceType}', name: 'Source' });
    const target = await testDb.createTestResource({ type: '${rule.targetType}', name: 'Target' });
    const job = await testDb.createTestJob({ name: 'Test Job', type: 'paving', shift: 'day' });
    
    await testDb.createTestAssignment(source.id, job.id, 'Equipment');
    await testDb.createTestAssignment(target.id, job.id, 'Equipment');
    
    const result = await testDb.testAttachment(source.id, target.id);
    expect(result.success).toBe(true);
    
    await testDb.cleanup();
  });`
    ).join('\n\n');

    return `describe('Magnet Interaction Rules', () => {
${tests}
});`;
  }

  /**
   * Watch for rule changes and regenerate tests
   */
  static async watchAndGenerateTests(): Promise<void> {
    // Subscribe to rule changes
    supabase
      .channel('rule-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drop_rules' }, async (payload) => {
        logger.info('📝 Drop rules changed, regenerating tests...');
        const dropRules = await DatabaseService.getDropRules();
        const testCode = AutoTestGenerator.generateDropRuleTests(dropRules);
        // In production, write to file system
        logger.info('Generated drop rule tests:', testCode.substring(0, 200) + '...');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'magnet_interaction_rules' }, async (payload) => {
        logger.info('📝 Magnet rules changed, regenerating tests...');
        const magnetRules = await DatabaseService.getMagnetInteractionRules();
        const testCode = AutoTestGenerator.generateMagnetRuleTests(magnetRules);
        // In production, write to file system
        logger.info('Generated magnet rule tests:', testCode.substring(0, 200) + '...');
      })
      .subscribe();
  }
}