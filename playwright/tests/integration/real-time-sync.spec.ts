import { test, expect, Browser, Page } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.describe('Real-time Synchronization', () => {
  let browser1: Browser;
  let browser2: Browser;
  let page1: Page;
  let page2: Page;
  let scheduler1: SchedulerPage;
  let scheduler2: SchedulerPage;

  test.beforeAll(async ({ browser }) => {
    // Create two browser contexts to simulate two users
    browser1 = browser;
    browser2 = browser;
  });

  test.beforeEach(async () => {
    const context1 = await browser1.newContext();
    const context2 = await browser2.newContext();
    
    page1 = await context1.newPage();
    page2 = await context2.newPage();
    
    scheduler1 = new SchedulerPage(page1);
    scheduler2 = new SchedulerPage(page2);
    
    // Both users navigate to scheduler
    await scheduler1.goto();
    await scheduler2.goto();
  });

  test.afterEach(async () => {
    await page1.close();
    await page2.close();
  });

  test('assignment appears in real-time for other users', async () => {
    const operator = TestDataFactory.createOperator();

    // User 1 makes an assignment
    await scheduler1.dragResourceToJob(operator.id, 'Test Job', 'Crew');

    // Wait for real-time update
    await scheduler2.waitForRealTimeUpdate();

    // User 2 should see the assignment
    const isVisibleToUser2 = await scheduler2.isResourceAssigned(operator.id, 'Test Job');
    expect(isVisibleToUser2).toBe(true);
  });

  test('removal updates in real-time', async () => {
    const operator = TestDataFactory.createOperator();

    // User 1 assigns
    await scheduler1.dragResourceToJob(operator.id, 'Test Job', 'Crew');
    await scheduler2.waitForRealTimeUpdate();

    // Verify both see it
    expect(await scheduler1.isResourceAssigned(operator.id, 'Test Job')).toBe(true);
    expect(await scheduler2.isResourceAssigned(operator.id, 'Test Job')).toBe(true);

    // User 2 removes
    await scheduler2.removeAssignment(operator.id, 'Test Job');
    await scheduler1.waitForRealTimeUpdate();

    // Both should see removal
    expect(await scheduler1.isResourceAssigned(operator.id, 'Test Job')).toBe(false);
    expect(await scheduler2.isResourceAssigned(operator.id, 'Test Job')).toBe(false);
  });

  test('concurrent edits are handled correctly', async () => {
    const operator1 = TestDataFactory.createOperator({ name: 'Op1' });
    const operator2 = TestDataFactory.createOperator({ name: 'Op2' });

    // Both users drag different resources simultaneously
    await Promise.all([
      scheduler1.dragResourceToJob(operator1.id, 'Test Job', 'Crew'),
      scheduler2.dragResourceToJob(operator2.id, 'Test Job', 'Crew')
    ]);

    // Wait for sync
    await Promise.all([
      scheduler1.waitForRealTimeUpdate(),
      scheduler2.waitForRealTimeUpdate()
    ]);

    // Both assignments should be visible to both users
    expect(await scheduler1.isResourceAssigned(operator1.id, 'Test Job')).toBe(true);
    expect(await scheduler1.isResourceAssigned(operator2.id, 'Test Job')).toBe(true);
    expect(await scheduler2.isResourceAssigned(operator1.id, 'Test Job')).toBe(true);
    expect(await scheduler2.isResourceAssigned(operator2.id, 'Test Job')).toBe(true);
  });

  test('conflict resolution for same resource', async () => {
    const operator = TestDataFactory.createOperator();

    // Both users try to assign same resource to different jobs
    const [_result1, _result2] = await Promise.all([ // Results not inspected as we check final state
      scheduler1.dragResourceToJob(operator.id, 'Job A', 'Crew'),
      scheduler2.dragResourceToJob(operator.id, 'Job B', 'Crew')
    ]);
    void _result1; void _result2; // Acknowledge unused results

    await Promise.all([
      scheduler1.waitForRealTimeUpdate(),
      scheduler2.waitForRealTimeUpdate()
    ]);

    // Only one assignment should succeed (last write wins)
    const inJobA = await scheduler1.isResourceAssigned(operator.id, 'Job A');
    const inJobB = await scheduler1.isResourceAssigned(operator.id, 'Job B');

    // Exactly one should be true
    expect(inJobA !== inJobB).toBe(true);

    // Both users should see the same state
    expect(await scheduler2.isResourceAssigned(operator.id, 'Job A')).toBe(inJobA);
    expect(await scheduler2.isResourceAssigned(operator.id, 'Job B')).toBe(inJobB);
  });

  test('job finalization syncs across users', async () => {
    // User 1 adds resources
    const operator = TestDataFactory.createOperator();
    await scheduler1.dragResourceToJob(operator.id, 'Test Job', 'Crew');

    // User 1 finalizes job
    const finalizeButton = page1.locator('[data-testid="finalize-job"]');
    if (await finalizeButton.isVisible()) {
      await finalizeButton.click();
    }

    await scheduler2.waitForRealTimeUpdate();

    // User 2 should see finalized state
    const jobElement = await scheduler2.getJob('Test Job');
    const isFinalizedClass = await jobElement.getAttribute('data-finalized');
    expect(isFinalizedClass).toBe('true');

    // User 2 should not be able to modify
    const newOperator = TestDataFactory.createOperator();
    await scheduler2.dragResourceToJob(newOperator.id, 'Test Job', 'Crew');
    
    // Assignment should fail
    const isAssigned = await scheduler2.isResourceAssigned(newOperator.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('attachment groups sync correctly', async () => {
    const { excavator, operator } = TestDataFactory.createEquipmentOperatorScenario();

    // User 1 creates attachment and assigns to job
    const _magnetPage1 = page1.locator('[data-testid="magnet-container"]');
    void _magnetPage1; // Available for future magnet operations
    
    // Simulate attachment (this would use MagnetPage in real scenario)
    await scheduler1.dragResourceToJob(excavator.id, 'Test Job', 'Equipment');
    await scheduler1.dragResourceToJob(operator.id, 'Test Job', 'Equipment');

    await scheduler2.waitForRealTimeUpdate();

    // User 2 should see both resources
    expect(await scheduler2.isResourceAssigned(excavator.id, 'Test Job')).toBe(true);
    expect(await scheduler2.isResourceAssigned(operator.id, 'Test Job')).toBe(true);

    // User 2 moves the group
    await scheduler2.moveAssignment(excavator.id, 'Test Job', 'Another Job', 'Equipment');

    await scheduler1.waitForRealTimeUpdate();

    // User 1 should see both moved
    expect(await scheduler1.isResourceAssigned(excavator.id, 'Another Job')).toBe(true);
    expect(await scheduler1.isResourceAssigned(operator.id, 'Another Job')).toBe(true);
  });

  test('resource availability updates in real-time', async () => {
    const operator = TestDataFactory.createOperator();

    // Check initial availability for both users
    const available1 = await scheduler1.getAvailableResources('operator');
    const available2 = await scheduler2.getAvailableResources('operator');
    
    const initialCount1 = await available1.count();
    const initialCount2 = await available2.count();
    
    expect(initialCount1).toBe(initialCount2);

    // User 1 assigns resource
    await scheduler1.dragResourceToJob(operator.id, 'Test Job', 'Crew');
    await scheduler2.waitForRealTimeUpdate();

    // Available count should decrease for both
    const newCount1 = await available1.count();
    const newCount2 = await available2.count();
    
    expect(newCount1).toBe(initialCount1 - 1);
    expect(newCount2).toBe(initialCount2 - 1);
  });

  test('date/shift changes sync across users', async () => {
    // User 1 changes to night shift
    await scheduler1.selectShift('night');

    // Add assignment in night shift
    const operator = TestDataFactory.createOperator();
    await scheduler1.dragResourceToJob(operator.id, 'Night Job', 'Crew');

    // User 2 switches to night shift
    await scheduler2.selectShift('night');
    await scheduler2.waitForRealTimeUpdate();

    // Should see the night assignment
    const isVisible = await scheduler2.isResourceAssigned(operator.id, 'Night Job');
    expect(isVisible).toBe(true);
  });

  test('optimistic updates with rollback on error', async () => {
    const operator = TestDataFactory.createOperator();

    // Simulate network error by intercepting request
    await page1.route('**/supabase.co/**', route => {
      if (route.request().method() === 'POST') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // User 1 tries to assign (will fail)
    await scheduler1.dragResourceToJob(operator.id, 'Test Job', 'Crew');

    // Should show optimistically
    let isAssigned = await scheduler1.isResourceAssigned(operator.id, 'Test Job');
    expect(isAssigned).toBe(true);

    // Wait for rollback
    await page1.waitForTimeout(2000);

    // Should be rolled back
    isAssigned = await scheduler1.isResourceAssigned(operator.id, 'Test Job');
    expect(isAssigned).toBe(false);

    // User 2 should never see the failed assignment
    const isVisibleToUser2 = await scheduler2.isResourceAssigned(operator.id, 'Test Job');
    expect(isVisibleToUser2).toBe(false);
  });

  test('bulk operations sync efficiently', async () => {
    const operators = Array.from({ length: 10 }, (_, i) => 
      TestDataFactory.createOperator({ name: `Op${i}` })
    );

    // User 1 performs bulk assignment
    const startTime = Date.now();
    
    for (const op of operators) {
      await scheduler1.dragResourceToJob(op.id, 'Test Job', 'Crew');
    }

    // Wait for all updates to sync
    await scheduler2.waitForRealTimeUpdate();
    await page2.waitForTimeout(1000); // Extra wait for bulk sync

    const syncTime = Date.now() - startTime;

    // All should be visible to User 2
    let visibleCount = 0;
    for (const op of operators) {
      if (await scheduler2.isResourceAssigned(op.id, 'Test Job')) {
        visibleCount++;
      }
    }

    expect(visibleCount).toBe(operators.length);
    
    // Should sync in reasonable time (< 5 seconds for 10 items)
    expect(syncTime).toBeLessThan(5000);
  });
});