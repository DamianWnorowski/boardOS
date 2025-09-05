import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { MagnetPage } from '../../pages/MagnetPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.describe('Advanced Multi-Chained Moves', () => {
  let schedulerPage: SchedulerPage;
  let magnetPage: MagnetPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    magnetPage = new MagnetPage(page);
    await schedulerPage.goto();
  });

  test('should move basic truck-driver chain between jobs', async ({ page: _ }) => {
    // Create basic truck-driver chain
    const truck = TestDataFactory.createTruck('10W', { name: 'Test Chain Truck' });
    const driver = TestDataFactory.createDriver({ name: 'Test Chain Driver' });
    const sourceJob = TestDataFactory.createDayJob({ name: 'Source Chain Job' });
    const targetJob = TestDataFactory.createDayJob({ name: 'Target Chain Job' });

    // Build chain
    await magnetPage.dragMagnetToTarget(driver.id, truck.id);
    expect(await magnetPage.verifyAttachment(truck.id, driver.id)).toBe(true);

    // Assign to source job
    await schedulerPage.dragResourceToJob(truck.id, sourceJob.name, 'Trucks');
    
    // Verify both assigned
    expect(await schedulerPage.isResourceAssigned(truck.id, sourceJob.name)).toBe(true);
    expect(await schedulerPage.isResourceAssigned(driver.id, sourceJob.name)).toBe(true);

    // Move chain to target job
    await schedulerPage.moveAssignment(truck.id, sourceJob.name, targetJob.name, 'Trucks');

    // Verify chain moved together
    expect(await schedulerPage.isResourceAssigned(truck.id, targetJob.name)).toBe(true);
    expect(await schedulerPage.isResourceAssigned(driver.id, targetJob.name)).toBe(true);
    
    // Verify source job is empty
    expect(await schedulerPage.isResourceAssigned(truck.id, sourceJob.name)).toBe(false);
    expect(await schedulerPage.isResourceAssigned(driver.id, sourceJob.name)).toBe(false);
  });

  test('should handle equipment chain with operator', async ({ page: _ }) => {
    // Create equipment chain
    const excavator = TestDataFactory.createExcavator({ name: 'Chain Excavator' });
    const operator = TestDataFactory.createOperator({ name: 'Chain Operator' });
    const job = TestDataFactory.createDayJob({ name: 'Equipment Job' });

    // Build chain
    await magnetPage.dragMagnetToTarget(operator.id, excavator.id);
    expect(await magnetPage.verifyAttachment(excavator.id, operator.id)).toBe(true);

    // Assign chain to job
    await schedulerPage.dragResourceToJob(excavator.id, job.name, 'Equipment');
    
    // Verify both moved together
    expect(await schedulerPage.isResourceAssigned(excavator.id, job.name)).toBe(true);
    expect(await schedulerPage.isResourceAssigned(operator.id, job.name)).toBe(true);

    // Verify attachment maintained
    expect(await magnetPage.verifyAttachment(excavator.id, operator.id)).toBe(true);
  });

  test('should preserve multiple attachments in paver chain', async ({ page: _ }) => {
    const paver = TestDataFactory.createPaver({ name: 'Multi Chain Paver' });
    const operator = TestDataFactory.createOperator({ name: 'Paver Operator' });
    const screwman1 = TestDataFactory.createScrewman({ name: 'Screwman One' });
    const screwman2 = TestDataFactory.createScrewman({ name: 'Screwman Two' });
    const job = TestDataFactory.createDayJob({ name: 'Paving Job' });

    // Build complex chain
    await magnetPage.dragMagnetToTarget(operator.id, paver.id);
    await magnetPage.dragMagnetToTarget(screwman1.id, paver.id);
    await magnetPage.dragMagnetToTarget(screwman2.id, paver.id);

    // Verify all attachments
    expect(await magnetPage.verifyAttachment(paver.id, operator.id)).toBe(true);
    expect(await magnetPage.verifyAttachment(paver.id, screwman1.id)).toBe(true);
    expect(await magnetPage.verifyAttachment(paver.id, screwman2.id)).toBe(true);

    // Move entire chain to job
    await schedulerPage.dragResourceToJob(paver.id, job.name, 'Equipment');

    // Verify all resources moved
    expect(await schedulerPage.isResourceAssigned(paver.id, job.name)).toBe(true);
    expect(await schedulerPage.isResourceAssigned(operator.id, job.name)).toBe(true);
    expect(await schedulerPage.isResourceAssigned(screwman1.id, job.name)).toBe(true);
    expect(await schedulerPage.isResourceAssigned(screwman2.id, job.name)).toBe(true);

    // Verify attachments maintained
    expect(await magnetPage.verifyAttachment(paver.id, operator.id)).toBe(true);
    expect(await magnetPage.verifyAttachment(paver.id, screwman1.id)).toBe(true);
    expect(await magnetPage.verifyAttachment(paver.id, screwman2.id)).toBe(true);
  });

  test('should handle rapid chain operations without errors', async ({ page }) => {
    const truck1 = TestDataFactory.createTruck('10W', { name: 'Rapid Truck 1' });
    const truck2 = TestDataFactory.createTruck('10W', { name: 'Rapid Truck 2' });
    const driver = TestDataFactory.createDriver({ name: 'Rapid Driver' });
    const job = TestDataFactory.createDayJob({ name: 'Rapid Job' });

    // Monitor for errors
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    // Rapid attachment operations
    await magnetPage.dragMagnetToTarget(driver.id, truck1.id);
    await magnetPage.detachResource(driver.id);
    await magnetPage.dragMagnetToTarget(driver.id, truck2.id);

    // Final state should be driver attached to truck2
    expect(await magnetPage.verifyAttachment(truck1.id, driver.id)).toBe(false);
    expect(await magnetPage.verifyAttachment(truck2.id, driver.id)).toBe(true);

    // Move to job and verify
    await schedulerPage.dragResourceToJob(truck2.id, job.name, 'Trucks');
    expect(await schedulerPage.isResourceAssigned(truck2.id, job.name)).toBe(true);
    expect(await schedulerPage.isResourceAssigned(driver.id, job.name)).toBe(true);

    // No errors should have occurred
    expect(errors).toHaveLength(0);
  });

  test('should maintain chain integrity during view switches', async ({ page: _ }) => {
    const truck = TestDataFactory.createTruck('10W', { name: 'View Switch Truck' });
    const driver = TestDataFactory.createDriver({ name: 'View Switch Driver' });
    const job = TestDataFactory.createDayJob({ name: 'View Switch Job' });

    // Build chain and assign
    await magnetPage.dragMagnetToTarget(driver.id, truck.id);
    await schedulerPage.dragResourceToJob(truck.id, job.name, 'Trucks');

    // Switch through different views
    await schedulerPage.switchView('week');
    await schedulerPage.switchView('month');
    await schedulerPage.switchView('day');

    // Verify chain integrity after view changes
    expect(await magnetPage.verifyAttachment(truck.id, driver.id)).toBe(true);
    expect(await schedulerPage.isResourceAssigned(truck.id, job.name)).toBe(true);
    expect(await schedulerPage.isResourceAssigned(driver.id, job.name)).toBe(true);
  });
});