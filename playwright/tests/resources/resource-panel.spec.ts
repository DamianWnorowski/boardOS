import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.describe('Resource Panel', () => {
  let schedulerPage: SchedulerPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
  });

  test('displays resources by category', async ({ page: _page }) => {
    void _page;
    const resourcePanel = schedulerPage.resourcePanel;

    // Check categories are visible
    const categories = ['Operators', 'Drivers', 'Equipment', 'Trucks', 'Screwmen'];
    
    for (const category of categories) {
      const categorySection = resourcePanel.locator(`[data-testid="category-${category.toLowerCase()}"]`);
      expect(await categorySection.isVisible()).toBe(true);
    }
  });

  test('search filters resources correctly', async ({ page: _page }) => {
    void _page;
    await schedulerPage.searchResources('John');

    // Only matching resources should be visible
    const visibleResources = await schedulerPage.resourcePanel
      .locator('[data-resource-name]:visible')
      .all();

    for (const resource of visibleResources) {
      const name = await resource.getAttribute('data-resource-name');
      expect(name?.toLowerCase()).toContain('john');
    }

    // Clear search
    await schedulerPage.searchResources('');
    
    // All resources should be visible again
    const allResourcesCount = await schedulerPage.resourcePanel
      .locator('[data-resource-name]')
      .count();
    expect(allResourcesCount).toBeGreaterThan(visibleResources.length);
  });

  test('shows availability status correctly', async ({ page: _page }) => {
    void _page;
    const operator = TestDataFactory.createOperator({ name: 'Available Op' });
    
    // Initially available
    const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${operator.id}"]`);
    let availableStatus = await resource.getAttribute('data-available');
    expect(availableStatus).toBe('true');

    // Assign to job
    await schedulerPage.dragResourceToJob(operator.id, 'Test Job', 'Crew');

    // Should show as unavailable
    availableStatus = await resource.getAttribute('data-available');
    expect(availableStatus).toBe('false');

    // Visual indicator for assigned resources
    const assignedIndicator = resource.locator('[data-testid="assigned-indicator"]');
    expect(await assignedIndicator.isVisible()).toBe(true);
  });

  test('groups attached resources visually', async ({ page: _page }) => {
    void _page;
    const { excavator, operator } = TestDataFactory.createEquipmentOperatorScenario();

    // Simulate attachment
    const excavatorElement = schedulerPage.resourcePanel.locator(`[data-resource-id="${excavator.id}"]`);
    const operatorElement = schedulerPage.resourcePanel.locator(`[data-resource-id="${operator.id}"]`);

    // After attachment, they should be grouped
    await operatorElement.dragTo(excavatorElement);

    // Check for grouping indicator
    const groupIndicator = excavatorElement.locator('[data-testid="attachment-group"]');
    expect(await groupIndicator.isVisible()).toBe(true);

    // Operator should show as attached
    const attachedTo = await operatorElement.getAttribute('data-attached-to');
    expect(attachedTo).toBe(excavator.id);
  });

  test('filters by availability toggle', async ({ page }) => {
    const availabilityToggle = page.locator('[data-testid="availability-filter"]');
    
    // Show only available resources
    await availabilityToggle.click();
    await page.locator('[data-testid="filter-available"]').click();

    // Only available resources should be visible
    const visibleResources = await schedulerPage.resourcePanel
      .locator('[data-resource-id]:visible')
      .all();

    for (const resource of visibleResources) {
      const available = await resource.getAttribute('data-available');
      expect(available).toBe('true');
    }

    // Show only assigned resources
    await availabilityToggle.click();
    await page.locator('[data-testid="filter-assigned"]').click();

    // Only assigned resources should be visible
    const assignedResources = await schedulerPage.resourcePanel
      .locator('[data-resource-id]:visible')
      .all();

    for (const resource of assignedResources) {
      const available = await resource.getAttribute('data-available');
      expect(available).toBe('false');
    }
  });

  test('collapse and expand categories', async ({ page }) => {
    const operatorCategory = page.locator('[data-testid="category-operators"]');
    const collapseButton = operatorCategory.locator('[data-testid="collapse-toggle"]');

    // Collapse category
    await collapseButton.click();

    // Resources should be hidden
    const operatorResources = operatorCategory.locator('[data-resource-type="operator"]');
    expect(await operatorResources.first().isVisible()).toBe(false);

    // Expand category
    await collapseButton.click();

    // Resources should be visible again
    expect(await operatorResources.first().isVisible()).toBe(true);
  });

  test('shows resource details on hover', async ({ page }) => {
    const operator = TestDataFactory.createOperator({ 
      name: 'John Doe',
      identifier: 'OP-001'
    });

    const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${operator.id}"]`);
    
    // Hover to show details
    await resource.hover();

    const tooltip = page.locator('[data-testid="resource-tooltip"]');
    expect(await tooltip.isVisible()).toBe(true);
    expect(await tooltip.textContent()).toContain('John Doe');
    expect(await tooltip.textContent()).toContain('OP-001');
  });

  test('multi-select resources with Ctrl+Click', async ({ page }) => {
    const operators = [
      TestDataFactory.createOperator({ name: 'Op1' }),
      TestDataFactory.createOperator({ name: 'Op2' }),
      TestDataFactory.createOperator({ name: 'Op3' })
    ];

    // Select multiple resources with Ctrl+Click
    await page.keyboard.down('Control');
    
    for (const op of operators) {
      const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${op.id}"]`);
      await resource.click();
    }
    
    await page.keyboard.up('Control');

    // All should be selected
    for (const op of operators) {
      const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${op.id}"]`);
      const isSelected = await resource.getAttribute('data-selected');
      expect(isSelected).toBe('true');
    }

    // Batch action button should appear
    const batchButton = page.locator('[data-testid="batch-assign"]');
    expect(await batchButton.isVisible()).toBe(true);
  });

  test('resource count updates dynamically', async ({ page }) => {
    const categoryHeader = page.locator('[data-testid="category-operators"]');
    const countBadge = categoryHeader.locator('[data-testid="resource-count"]');

    // Get initial count
    const initialCount = await countBadge.textContent();
    const count = parseInt(initialCount || '0');

    // Assign a resource
    const operator = TestDataFactory.createOperator();
    await schedulerPage.dragResourceToJob(operator.id, 'Test Job', 'Crew');

    // Available count should decrease
    const availableCountBadge = categoryHeader.locator('[data-testid="available-count"]');
    const newAvailableCount = await availableCountBadge.textContent();
    expect(parseInt(newAvailableCount || '0')).toBe(count - 1);
  });

  test('quick actions menu on right-click', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${operator.id}"]`);

    // Right-click for context menu
    await resource.click({ button: 'right' });

    const contextMenu = page.locator('[data-testid="resource-context-menu"]');
    expect(await contextMenu.isVisible()).toBe(true);

    // Check available actions
    const actions = ['View Details', 'Assign to Job', 'Mark Unavailable', 'Edit'];
    for (const action of actions) {
      const actionItem = contextMenu.locator(`text="${action}"`);
      expect(await actionItem.isVisible()).toBe(true);
    }
  });

  test('drag preview shows resource info', async ({ page }) => {
    const operator = TestDataFactory.createOperator({ name: 'John Doe' });
    const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${operator.id}"]`);

    // Start dragging
    const box = await resource.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y);

      // Check drag preview
      const dragPreview = page.locator('[data-testid="drag-preview"]');
      expect(await dragPreview.isVisible()).toBe(true);
      expect(await dragPreview.textContent()).toContain('John Doe');

      await page.mouse.up();
    }
  });

  test('resource colors match type', async ({ page: _page }) => {
    void _page;
    // Check equipment has yellow background
    const equipment = await schedulerPage.resourcePanel.locator('[data-resource-type="excavator"]').first();
    const equipmentClasses = await equipment.getAttribute('class');
    expect(equipmentClasses).toContain('bg-yellow-500');

    // Check operators have different color
    const operator = await schedulerPage.resourcePanel.locator('[data-resource-type="operator"]').first();
    const operatorClasses = await operator.getAttribute('class');
    expect(operatorClasses).not.toContain('bg-yellow-500');
  });

  test('on-site indicator shows correctly', async ({ page: _page }) => {
    void _page;
    const operator = TestDataFactory.createOperator({ onSite: true });
    const resource = schedulerPage.resourcePanel.locator(`[data-resource-id="${operator.id}"]`);

    // Should show on-site badge
    const onSiteBadge = resource.locator('[data-testid="on-site-badge"]');
    expect(await onSiteBadge.isVisible()).toBe(true);
    expect(await onSiteBadge.textContent()).toContain('On Site');
  });
});