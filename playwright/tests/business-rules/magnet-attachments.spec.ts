import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { MagnetPage } from '../../pages/MagnetPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.describe('Magnet Attachment Business Rules', () => {
  let schedulerPage: SchedulerPage;
  let magnetPage: MagnetPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    magnetPage = new MagnetPage(page);
    await schedulerPage.goto();
  });

  test('excavator requires operator attachment', async ({ page }) => {
    const { excavator, operator } = TestDataFactory.createEquipmentOperatorScenario();

    // Drag excavator to job
    await schedulerPage.dragResourceToJob(excavator.id, 'Test Job', 'Equipment');

    // Check for warning about missing operator
    const warning = page.locator('[data-testid="equipment-warning"]');
    expect(await warning.isVisible()).toBe(true);
    expect(await warning.textContent()).toContain('requires operator');

    // Attach operator
    await magnetPage.dragMagnetToTarget(operator.id, excavator.id);

    // Warning should disappear
    expect(await warning.isVisible()).toBe(false);

    // Verify attachment
    const isAttached = await magnetPage.verifyAttachment(excavator.id, operator.id);
    expect(isAttached).toBe(true);
  });

  test('truck requires driver attachment', async ({ page }) => {
    const { truck, driver, job } = TestDataFactory.createTruckDriverScenario();

    // Navigate to trucks tab first
    await schedulerPage.switchToTrucksTab();
    
    // Wait for trucks section to load
    await page.waitForSelector('[data-testid="truck-driver-section"]');

    // Look for the truck card - use the proper truck-card selector
    const truckCard = page.locator(`[data-testid="truck-card-${truck.id}"]`);
    await expect(truckCard).toBeVisible({ timeout: 10000 });

    // Attach driver to truck first using the UI
    await magnetPage.dragMagnetToTarget(driver.id, truck.id);

    // Verify attachment worked
    const isAttached = await magnetPage.verifyAttachment(truck.id, driver.id);
    expect(isAttached).toBe(true);

    // Check visual indicator
    const indicators = await magnetPage.getVisualIndicator(truck.id);
    expect(indicators.hasDriver).toBe(true);
  });

  test('paver accepts maximum 2 screwmen', async ({ page: _page }) => {
    void _page; // Acknowledge unused page parameter
    const { paver, operator, screwmen } = TestDataFactory.createPaverScrewmenScenario();

    // Attach operator first (required)
    await magnetPage.dragMagnetToTarget(operator.id, paver.id);

    // Attach first screwman
    await magnetPage.dragMagnetToTarget(screwmen[0].id, paver.id);
    let attached = await magnetPage.getAttachedResources(paver.id);
    expect(attached).toContain(screwmen[0].id);

    // Attach second screwman
    await magnetPage.dragMagnetToTarget(screwmen[1].id, paver.id);
    attached = await magnetPage.getAttachedResources(paver.id);
    expect(attached).toContain(screwmen[1].id);
    expect(attached.length).toBe(3); // operator + 2 screwmen

    // Try to attach third screwman (should be rejected)
    await magnetPage.dragMagnetToTarget(screwmen[2].id, paver.id);
    attached = await magnetPage.getAttachedResources(paver.id);
    expect(attached).not.toContain(screwmen[2].id);
    expect(attached.length).toBe(3); // Still only 3

    // Check for max attachment indicator
    const isFull = await magnetPage.isAttachmentFull(paver.id);
    expect(isFull).toBe(true);
  });

  test('equipment cannot attach to equipment', async ({ page: _page }) => {
    void _page; // Acknowledge unused page parameter
    const excavator1 = TestDataFactory.createExcavator({ name: 'Excavator 1' });
    const excavator2 = TestDataFactory.createExcavator({ name: 'Excavator 2' });

    // Try to attach excavator to excavator
    await magnetPage.dragMagnetToTarget(excavator2.id, excavator1.id);

    // Should not be attached
    const isAttached = await magnetPage.verifyAttachment(excavator1.id, excavator2.id);
    expect(isAttached).toBe(false);
  });

  test('operator can attach to multiple equipment types', async ({ page: _page }) => {
    void _page; // Acknowledge unused page parameter
    const operator = TestDataFactory.createOperator();
    const excavator = TestDataFactory.createExcavator();
    const _paver = TestDataFactory.createPaver();
    void _paver; // Available for future test expansion

    // Check attachment capability
    const canAttachToExcavator = await magnetPage.canAttach('excavator', 'operator');
    const canAttachToPaver = await magnetPage.canAttach('paver', 'operator');

    expect(canAttachToExcavator).toBe(true);
    expect(canAttachToPaver).toBe(true);

    // Test actual attachment to excavator
    await magnetPage.dragMagnetToTarget(operator.id, excavator.id);
    const isAttachedToExcavator = await magnetPage.verifyAttachment(excavator.id, operator.id);
    expect(isAttachedToExcavator).toBe(true);
  });

  test('attached resources move together', async ({ page: _page }) => {
    void _page; // Acknowledge unused page parameter
    const { excavator, operator } = TestDataFactory.createEquipmentOperatorScenario();

    // Attach operator to excavator
    await magnetPage.dragMagnetToTarget(operator.id, excavator.id);

    // Drag excavator to job
    await schedulerPage.dragResourceToJob(excavator.id, 'Job 1', 'Equipment');

    // Both should be in the job
    const excavatorAssigned = await schedulerPage.isResourceAssigned(excavator.id, 'Job 1');
    const operatorAssigned = await schedulerPage.isResourceAssigned(operator.id, 'Job 1');

    expect(excavatorAssigned).toBe(true);
    expect(operatorAssigned).toBe(true);

    // Move excavator to another job
    await schedulerPage.moveAssignment(excavator.id, 'Job 1', 'Job 2', 'Equipment');

    // Both should move together
    const excavatorInJob2 = await schedulerPage.isResourceAssigned(excavator.id, 'Job 2');
    const operatorInJob2 = await schedulerPage.isResourceAssigned(operator.id, 'Job 2');

    expect(excavatorInJob2).toBe(true);
    expect(operatorInJob2).toBe(true);
  });

  test('detaching resources works correctly', async ({ page: _page }) => {
    void _page; // Acknowledge unused page parameter
    const { truck, driver } = TestDataFactory.createTruckDriverScenario();

    // Attach driver to truck
    await magnetPage.dragMagnetToTarget(driver.id, truck.id);
    let isAttached = await magnetPage.verifyAttachment(truck.id, driver.id);
    expect(isAttached).toBe(true);

    // Detach driver
    await magnetPage.detachResource(driver.id);

    // Should no longer be attached
    isAttached = await magnetPage.verifyAttachment(truck.id, driver.id);
    expect(isAttached).toBe(false);

    // Visual indicator should update
    const indicators = await magnetPage.getVisualIndicator(truck.id);
    expect(indicators.hasDriver).toBe(false);
  });

  test('auto-attachment triggers for required relationships', async ({ page }) => {
    // This tests the auto-attach feature where dropping an excavator 
    // near an available operator auto-attaches them

    const excavator = TestDataFactory.createExcavator();
    const operator = TestDataFactory.createOperator();

    // Place both in same job area
    await schedulerPage.dragResourceToJob(excavator.id, 'Test Job', 'Equipment');
    await schedulerPage.dragResourceToJob(operator.id, 'Test Job', 'Equipment');

    // Wait for auto-attachment
    await page.waitForTimeout(500);

    // Should be auto-attached
    const isAttached = await magnetPage.verifyAttachment(excavator.id, operator.id);
    expect(isAttached).toBe(true);
  });

  test('attachment limits are enforced visually', async ({ page: _page }) => {
    void _page; // Acknowledge unused page parameter
    const paver = TestDataFactory.createPaver();

    // Check attachment limit
    const limit = await magnetPage.getAttachmentLimit('paver');
    expect(limit).toBe(2); // Paver can have max 2 screwmen

    // Visual indicators before attachments
    const indicators = await magnetPage.getVisualIndicator(paver.id);
    expect(indicators.canReceiveAttachment).toBe(true);

    // After reaching limit, should show full indicator
    const screwmen = [
      TestDataFactory.createScrewman({ name: 'S1' }),
      TestDataFactory.createScrewman({ name: 'S2' })
    ];

    for (const screwman of screwmen) {
      await magnetPage.dragMagnetToTarget(screwman.id, paver.id);
    }

    const isFull = await magnetPage.isAttachmentFull(paver.id);
    expect(isFull).toBe(true);
  });
});