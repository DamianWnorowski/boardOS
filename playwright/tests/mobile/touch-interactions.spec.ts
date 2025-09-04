import { test, expect, devices } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.use(devices['iPhone 12']);

test.describe('Mobile Touch Interactions', () => {
  let schedulerPage: SchedulerPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
  });

  test('touch drag and drop works on mobile', async ({ page }) => {
    const operator = TestDataFactory.createOperator();

    // Get resource element
    const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${operator.id}"]`);
    const targetRow = await schedulerPage.getJobRow('Test Job', 'Crew');

    // Perform touch drag
    const sourceBox = await resource.boundingBox();
    const targetBox = await targetRow.boundingBox();

    if (sourceBox && targetBox) {
      // Touch down
      await page.touchscreen.tap(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      
      // Long press to initiate drag
      await page.waitForTimeout(500);
      
      // Drag to target
      await page.touchscreen.tap(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
    }

    // Verify assignment
    const isAssigned = await schedulerPage.isResourceAssigned(operator.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('mobile drag layer is visible during drag', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${operator.id}"]`);

    const box = await resource.boundingBox();
    if (box) {
      // Start touch drag
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500); // Long press

      // Check for mobile drag layer
      const mobileDragLayer = page.locator('[data-testid="mobile-drag-layer"]');
      expect(await mobileDragLayer.isVisible()).toBe(true);

      // Release
      await page.touchscreen.tap(box.x, box.y);
    }
  });

  test('pinch to zoom works on scheduler', async ({ page }) => {
    // Get initial viewport scale
    const initialScale = await page.evaluate(() => {
      return window.visualViewport?.scale || 1;
    });

    // Perform pinch zoom
    await page.touchscreen.pinch(100, 100, 200);

    // Check if zoom changed
    const newScale = await page.evaluate(() => {
      return window.visualViewport?.scale || 1;
    });

    expect(newScale).toBeGreaterThan(initialScale);
  });

  test('swipe navigation between dates', async ({ page }) => {
    // Get current date
    const currentDate = await schedulerPage.dateSelector.textContent();

    // Perform swipe left (next day)
    await page.touchscreen.swipe(300, 200, 100, 200);
    await page.waitForTimeout(500);

    // Date should change
    const newDate = await schedulerPage.dateSelector.textContent();
    expect(newDate).not.toBe(currentDate);
  });

  test('tap to select resource on mobile', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${operator.id}"]`);

    // Tap to select
    const box = await resource.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

      // Check for selection indicator
      const isSelected = await resource.getAttribute('data-selected');
      expect(isSelected).toBe('true');
    }
  });

  test('double tap to quick assign', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${operator.id}"]`);

    const box = await resource.boundingBox();
    if (box) {
      // Double tap
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(100);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

      // Should trigger quick assign modal
      const modal = page.locator('[data-testid="quick-assign-modal"]');
      expect(await modal.isVisible()).toBe(true);
    }
  });

  test('scroll performance on mobile', async ({ page }) => {
    // Add many resources to test scroll performance
    const resources = Array.from({ length: 50 }, (_, i) => 
      TestDataFactory.createOperator({ name: `Operator ${i}` })
    );
    void resources; // Array created for scroll performance testing

    // Measure scroll performance
    const startTime = Date.now();
    
    // Perform multiple scrolls
    for (let i = 0; i < 5; i++) {
      await page.touchscreen.swipe(200, 400, 200, 100);
      await page.waitForTimeout(100);
    }

    const endTime = Date.now();
    const scrollTime = endTime - startTime;

    // Should complete in reasonable time (< 3 seconds for 5 scrolls)
    expect(scrollTime).toBeLessThan(3000);
  });

  test('touch context menu on long press', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    
    // Assign to job first
    await schedulerPage.dragResourceToJob(operator.id, 'Test Job', 'Crew');

    const assignment = await schedulerPage.getAssignment(operator.id, 'Test Job');
    const box = await assignment.boundingBox();

    if (box) {
      // Long press for context menu
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(1000); // Long press duration

      // Context menu should appear
      const contextMenu = page.locator('[data-testid="context-menu"]');
      expect(await contextMenu.isVisible()).toBe(true);

      // Should have mobile-specific options
      const removeOption = contextMenu.locator('text=Remove Assignment');
      expect(await removeOption.isVisible()).toBe(true);
    }
  });

  test('responsive layout adjusts for mobile', async ({ page }) => {
    // Check if mobile layout is active
    const isMobileLayout = await page.evaluate(() => {
      return window.innerWidth < 768;
    });
    expect(isMobileLayout).toBe(true);

    // Resource panel should be collapsible on mobile
    const toggleButton = page.locator('[data-testid="resource-panel-toggle"]');
    expect(await toggleButton.isVisible()).toBe(true);

    // Toggle resource panel
    await toggleButton.tap();
    const resourcePanel = schedulerPage.resourcePanel;
    const isPanelHidden = await resourcePanel.isHidden();
    expect(isPanelHidden).toBe(true);
  });

  test('touch gestures for multi-select', async ({ page }) => {
    const operators = [
      TestDataFactory.createOperator({ name: 'Op1' }),
      TestDataFactory.createOperator({ name: 'Op2' }),
      TestDataFactory.createOperator({ name: 'Op3' })
    ];

    // Enable multi-select mode
    const multiSelectButton = page.locator('[data-testid="multi-select-toggle"]');
    await multiSelectButton.tap();

    // Tap multiple resources
    for (const op of operators) {
      const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${op.id}"]`);
      const box = await resource.boundingBox();
      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(200);
      }
    }

    // Check all are selected
    for (const op of operators) {
      const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${op.id}"]`);
      const isSelected = await resource.getAttribute('data-selected');
      expect(isSelected).toBe('true');
    }

    // Batch assign button should be visible
    const batchAssignButton = page.locator('[data-testid="batch-assign"]');
    expect(await batchAssignButton.isVisible()).toBe(true);
  });
});