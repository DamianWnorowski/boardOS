import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.describe('Core Drag and Drop Functionality', () => {
  let schedulerPage: SchedulerPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
  });

  test('can drag operator to job', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    
    await schedulerPage.dragResourceToJob(
      operator.id,
      'Test Job',
      'Crew'
    );

    const isAssigned = await schedulerPage.isResourceAssigned(operator.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('can drag equipment to job', async ({ page }) => {
    const excavator = TestDataFactory.createExcavator();
    
    await schedulerPage.dragResourceToJob(
      excavator.id,
      'Test Job',
      'Equipment'
    );

    const isAssigned = await schedulerPage.isResourceAssigned(excavator.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('can move assignment between jobs', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    
    // First assign to job 1
    await schedulerPage.dragResourceToJob(
      operator.id,
      'Job 1',
      'Crew'
    );

    // Then move to job 2
    await schedulerPage.moveAssignment(
      operator.id,
      'Job 1',
      'Job 2',
      'Crew'
    );

    const isInJob1 = await schedulerPage.isResourceAssigned(operator.id, 'Job 1');
    const isInJob2 = await schedulerPage.isResourceAssigned(operator.id, 'Job 2');
    
    expect(isInJob1).toBe(false);
    expect(isInJob2).toBe(true);
  });

  test('can remove assignment by dragging off job', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    
    // Assign to job
    await schedulerPage.dragResourceToJob(
      operator.id,
      'Test Job',
      'Crew'
    );

    // Remove assignment
    await schedulerPage.removeAssignment(operator.id, 'Test Job');

    const isAssigned = await schedulerPage.isResourceAssigned(operator.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('can create second shift with Ctrl+drag', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    
    // Assign to day job
    await schedulerPage.dragResourceToJob(
      operator.id,
      'Day Job',
      'Crew'
    );

    // Create second shift
    await schedulerPage.createSecondShift(operator.id, 'Day Job', 'Night Job');

    const isInDayJob = await schedulerPage.isResourceAssigned(operator.id, 'Day Job');
    const isInNightJob = await schedulerPage.isResourceAssigned(operator.id, 'Night Job');
    
    expect(isInDayJob).toBe(true);
    expect(isInNightJob).toBe(true);

    // Check for double shift indicator
    const indicators = await schedulerPage.getAssignmentIndicators(operator.id, 'Day Job');
    expect(indicators.hasDoubleShift).toBe(true);
  });

  test('shows visual feedback during drag', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${operator.id}"]`);
    
    // Start drag
    const box = await resource.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      
      // Check for drag preview
      const dragPreview = page.locator('[data-testid="drag-preview"]');
      expect(await dragPreview.isVisible()).toBe(true);
      
      await page.mouse.up();
    }
  });

  test('respects drop zones', async ({ page }) => {
    const foreman = TestDataFactory.createOperator({ type: 'foreman' });
    
    // Try to drop foreman in Equipment row (should fail)
    await schedulerPage.dragResourceToJob(
      foreman.id,
      'Test Job',
      'Equipment'
    );

    const isInEquipmentRow = await schedulerPage.isResourceAssigned(foreman.id, 'Test Job');
    expect(isInEquipmentRow).toBe(false);

    // Drop in correct row (Forman)
    await schedulerPage.dragResourceToJob(
      foreman.id,
      'Test Job',
      'Forman'
    );

    const isInForemanRow = await schedulerPage.isResourceAssigned(foreman.id, 'Test Job');
    expect(isInForemanRow).toBe(true);
  });

  test('handles rapid consecutive drags', async ({ page }) => {
    const operators = [
      TestDataFactory.createOperator({ name: 'Op1' }),
      TestDataFactory.createOperator({ name: 'Op2' }),
      TestDataFactory.createOperator({ name: 'Op3' })
    ];

    // Rapidly drag all operators
    for (const op of operators) {
      await schedulerPage.dragResourceToJob(op.id, 'Test Job', 'Crew');
      // No wait between drags
    }

    // Verify all assignments
    for (const op of operators) {
      const isAssigned = await schedulerPage.isResourceAssigned(op.id, 'Test Job');
      expect(isAssigned).toBe(true);
    }
  });

  test('updates UI optimistically', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    
    // Spy on console logs for optimistic update indicator
    page.on('console', msg => {
      if (msg.text().includes('🚀')) {
        console.log('Optimistic update detected:', msg.text());
      }
    });

    await schedulerPage.dragResourceToJob(
      operator.id,
      'Test Job',
      'Crew'
    );

    // Assignment should be visible immediately (optimistic)
    const assignment = await schedulerPage.getAssignment(operator.id, 'Test Job');
    expect(await assignment.isVisible()).toBe(true);

    // Wait for real-time confirmation
    await schedulerPage.waitForRealTimeUpdate();
    
    // Should still be visible after server confirmation
    expect(await assignment.isVisible()).toBe(true);
  });

  test('handles drag cancellation', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${operator.id}"]`);
    
    // Start drag
    const box = await resource.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 100);
      
      // Cancel with ESC
      await page.keyboard.press('Escape');
      
      // Resource should not be assigned
      const assignments = await schedulerPage.getAssignedResources('operator').count();
      expect(assignments).toBe(0);
    }
  });
});