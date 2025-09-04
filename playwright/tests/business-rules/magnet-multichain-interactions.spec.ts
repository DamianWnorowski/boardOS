import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { MagnetPage } from '../../pages/MagnetPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.describe('Multichain Magnet Interactions', () => {
  let schedulerPage: SchedulerPage;
  let magnetPage: MagnetPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    magnetPage = new MagnetPage(page);
    await schedulerPage.goto();
  });

  test.describe('Sequential Attachment Operations', () => {
    test('build complete equipment chain without errors', async ({ page }) => {
      // Create resources
      const excavator = TestDataFactory.createExcavator({ name: 'Chain Excavator' });
      const operator = TestDataFactory.createOperator({ name: 'Chain Operator' });
      const truck1 = TestDataFactory.createTruck('10W', { name: 'Chain Truck 1' });
      const truck2 = TestDataFactory.createTruck('10W', { name: 'Chain Truck 2' });
      const driver1 = TestDataFactory.createDriver({ name: 'Chain Driver 1' });
      const driver2 = TestDataFactory.createDriver({ name: 'Chain Driver 2' });
      const job = TestDataFactory.createDayJob({ name: 'Chain Test Job' });

      // Step 1: Attach operator to excavator
      await magnetPage.dragMagnetToTarget(operator.id, excavator.id);
      let attached = await magnetPage.verifyAttachment(excavator.id, operator.id);
      expect(attached).toBe(true);
      
      // Verify no errors in console
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Step 2: Attach driver1 to truck1
      await magnetPage.dragMagnetToTarget(driver1.id, truck1.id);
      attached = await magnetPage.verifyAttachment(truck1.id, driver1.id);
      expect(attached).toBe(true);

      // Step 3: Attach driver2 to truck2
      await magnetPage.dragMagnetToTarget(driver2.id, truck2.id);
      attached = await magnetPage.verifyAttachment(truck2.id, driver2.id);
      expect(attached).toBe(true);

      // Step 4: Drag excavator group to job (should move operator too)
      await schedulerPage.dragResourceToJob(excavator.id, job.name, 'Equipment');
      
      // Verify both excavator and operator are in job
      const excavatorInJob = await schedulerPage.isResourceAssigned(excavator.id, job.name);
      const operatorInJob = await schedulerPage.isResourceAssigned(operator.id, job.name);
      expect(excavatorInJob).toBe(true);
      expect(operatorInJob).toBe(true);

      // Step 5: Drag truck1 group to job
      await schedulerPage.dragResourceToJob(truck1.id, job.name, 'Trucks');
      
      // Verify truck and driver moved together
      const truck1InJob = await schedulerPage.isResourceAssigned(truck1.id, job.name);
      const driver1InJob = await schedulerPage.isResourceAssigned(driver1.id, job.name);
      expect(truck1InJob).toBe(true);
      expect(driver1InJob).toBe(true);

      // Step 6: Drag truck2 group to same job
      await schedulerPage.dragResourceToJob(truck2.id, job.name, 'Trucks');
      
      // Verify all resources are in job
      const truck2InJob = await schedulerPage.isResourceAssigned(truck2.id, job.name);
      const driver2InJob = await schedulerPage.isResourceAssigned(driver2.id, job.name);
      expect(truck2InJob).toBe(true);
      expect(driver2InJob).toBe(true);

      // Verify no console errors occurred during chain operations
      expect(consoleErrors).toHaveLength(0);
    });

    test('handle paver with multiple attachments in sequence', async ({ page }) => {
      const paver = TestDataFactory.createPaver({ name: 'Multi-attach Paver' });
      const operator = TestDataFactory.createOperator({ name: 'Paver Operator' });
      const screwman1 = TestDataFactory.createScrewman({ name: 'Screwman Alpha' });
      const screwman2 = TestDataFactory.createScrewman({ name: 'Screwman Beta' });
      const screwman3 = TestDataFactory.createScrewman({ name: 'Screwman Gamma' });
      const job = TestDataFactory.createDayJob({ name: 'Paving Job' });

      // Monitor for errors
      const errors: string[] = [];
      page.on('pageerror', err => errors.push(err.message));

      // Attach operator first (required)
      await magnetPage.dragMagnetToTarget(operator.id, paver.id);
      expect(await magnetPage.verifyAttachment(paver.id, operator.id)).toBe(true);

      // Attach first screwman
      await magnetPage.dragMagnetToTarget(screwman1.id, paver.id);
      let attachedResources = await magnetPage.getAttachedResources(paver.id);
      expect(attachedResources).toContain(screwman1.id);
      expect(attachedResources).toHaveLength(2); // operator + 1 screwman

      // Attach second screwman
      await magnetPage.dragMagnetToTarget(screwman2.id, paver.id);
      attachedResources = await magnetPage.getAttachedResources(paver.id);
      expect(attachedResources).toContain(screwman2.id);
      expect(attachedResources).toHaveLength(3); // operator + 2 screwmen

      // Try to attach third screwman (should fail gracefully)
      await magnetPage.dragMagnetToTarget(screwman3.id, paver.id);
      attachedResources = await magnetPage.getAttachedResources(paver.id);
      expect(attachedResources).not.toContain(screwman3.id);
      expect(attachedResources).toHaveLength(3); // Still only 3

      // Move entire group to job
      await schedulerPage.dragResourceToJob(paver.id, job.name, 'Equipment');

      // Verify all attached resources moved
      expect(await schedulerPage.isResourceAssigned(paver.id, job.name)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(operator.id, job.name)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(screwman1.id, job.name)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(screwman2.id, job.name)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(screwman3.id, job.name)).toBe(false);

      // No errors should have occurred
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Concurrent Operations', () => {
    test('handle rapid successive attachments without race conditions', async ({ page }) => {
      const resources = {
        trucks: Array.from({ length: 5 }, (_, i) => 
          TestDataFactory.createTruck('10W', { name: `Rapid Truck ${i + 1}` })
        ),
        drivers: Array.from({ length: 5 }, (_, i) => 
          TestDataFactory.createDriver({ name: `Rapid Driver ${i + 1}` })
        )
      };

      const errors: string[] = [];
      page.on('pageerror', err => errors.push(err.message));

      // Rapidly attach all drivers to trucks without waiting
      const attachmentPromises = resources.trucks.map((truck, i) => 
        magnetPage.dragMagnetToTarget(resources.drivers[i].id, truck.id)
      );

      // Wait for all attachments to complete
      await Promise.all(attachmentPromises);

      // Verify all attachments succeeded
      for (let i = 0; i < resources.trucks.length; i++) {
        const attached = await magnetPage.verifyAttachment(
          resources.trucks[i].id, 
          resources.drivers[i].id
        );
        expect(attached).toBe(true);
      }

      // No race condition errors
      expect(errors).toHaveLength(0);
    });

    test('handle simultaneous detach and reattach operations', async ({ page }) => {
      const truck1 = TestDataFactory.createTruck('10W', { name: 'Swap Truck 1' });
      const truck2 = TestDataFactory.createTruck('10W', { name: 'Swap Truck 2' });
      const driver = TestDataFactory.createDriver({ name: 'Swap Driver' });

      // Initial attachment
      await magnetPage.dragMagnetToTarget(driver.id, truck1.id);
      expect(await magnetPage.verifyAttachment(truck1.id, driver.id)).toBe(true);

      // Detach and immediately reattach to different truck
      await magnetPage.detachResource(driver.id);
      await magnetPage.dragMagnetToTarget(driver.id, truck2.id);

      // Verify correct final state
      expect(await magnetPage.verifyAttachment(truck1.id, driver.id)).toBe(false);
      expect(await magnetPage.verifyAttachment(truck2.id, driver.id)).toBe(true);

      // Check for visual indicator updates
      const truck1Indicators = await magnetPage.getVisualIndicator(truck1.id);
      const truck2Indicators = await magnetPage.getVisualIndicator(truck2.id);
      expect(truck1Indicators.hasDriver).toBe(false);
      expect(truck2Indicators.hasDriver).toBe(true);
    });
  });

  test.describe('Chain Reactions', () => {
    test('cascade attachment updates through multiple levels', async ({ page }) => {
      // Create a complex hierarchy
      const mainPaver = TestDataFactory.createPaver({ name: 'Main Paver' });
      const operator = TestDataFactory.createOperator({ name: 'Lead Operator' });
      const assistantPaver = TestDataFactory.createPaver({ name: 'Assistant Paver' });
      const assistantOperator = TestDataFactory.createOperator({ name: 'Assistant Op' });
      const screwman = TestDataFactory.createScrewman({ name: 'Shared Screwman' });
      const truck = TestDataFactory.createTruck('10W', { name: 'Support Truck' });
      const driver = TestDataFactory.createDriver({ name: 'Support Driver' });

      // Build chain: driver -> truck, operator -> mainPaver, assistantOp -> assistantPaver
      await magnetPage.dragMagnetToTarget(driver.id, truck.id);
      await magnetPage.dragMagnetToTarget(operator.id, mainPaver.id);
      await magnetPage.dragMagnetToTarget(assistantOperator.id, assistantPaver.id);
      await magnetPage.dragMagnetToTarget(screwman.id, mainPaver.id);

      // Create jobs
      const job1 = TestDataFactory.createDayJob({ name: 'Chain Job 1' });
      const job2 = TestDataFactory.createDayJob({ name: 'Chain Job 2' });

      // Move main paver group to job1
      await schedulerPage.dragResourceToJob(mainPaver.id, job1.name, 'Equipment');

      // Verify cascade
      expect(await schedulerPage.isResourceAssigned(mainPaver.id, job1.name)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(operator.id, job1.name)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(screwman.id, job1.name)).toBe(true);

      // Move to different job - should cascade again
      await schedulerPage.moveAssignment(mainPaver.id, job1.name, job2.name, 'Equipment');

      // Verify all moved together
      expect(await schedulerPage.isResourceAssigned(mainPaver.id, job2.name)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(operator.id, job2.name)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(screwman.id, job2.name)).toBe(true);

      // Original job should be empty
      expect(await schedulerPage.isResourceAssigned(mainPaver.id, job1.name)).toBe(false);
      expect(await schedulerPage.isResourceAssigned(operator.id, job1.name)).toBe(false);
    });

    test('maintain attachment integrity during bulk operations', async ({ page }) => {
      // Create multiple equipment groups
      const groups = Array.from({ length: 3 }, (_, i) => ({
        excavator: TestDataFactory.createExcavator({ name: `Bulk Excavator ${i + 1}` }),
        operator: TestDataFactory.createOperator({ name: `Bulk Operator ${i + 1}` })
      }));

      // Attach all operators to excavators
      for (const group of groups) {
        await magnetPage.dragMagnetToTarget(group.operator.id, group.excavator.id);
      }

      const job = TestDataFactory.createDayJob({ name: 'Bulk Operation Job' });

      // Move all excavators to job in rapid succession
      const movePromises = groups.map(group => 
        schedulerPage.dragResourceToJob(group.excavator.id, job.name, 'Equipment')
      );
      await Promise.all(movePromises);

      // Verify all attachments maintained
      for (const group of groups) {
        expect(await magnetPage.verifyAttachment(group.excavator.id, group.operator.id)).toBe(true);
        expect(await schedulerPage.isResourceAssigned(group.excavator.id, job.name)).toBe(true);
        expect(await schedulerPage.isResourceAssigned(group.operator.id, job.name)).toBe(true);
      }
    });
  });

  test.describe('Complex Reassignment Scenarios', () => {
    test('swap attached resources between equipment without errors', async ({ page }) => {
      const excavator1 = TestDataFactory.createExcavator({ name: 'Swap Excavator 1' });
      const excavator2 = TestDataFactory.createExcavator({ name: 'Swap Excavator 2' });
      const operator1 = TestDataFactory.createOperator({ name: 'Swap Operator 1' });
      const operator2 = TestDataFactory.createOperator({ name: 'Swap Operator 2' });

      // Initial attachments
      await magnetPage.dragMagnetToTarget(operator1.id, excavator1.id);
      await magnetPage.dragMagnetToTarget(operator2.id, excavator2.id);

      // Detach both operators
      await magnetPage.detachResource(operator1.id);
      await magnetPage.detachResource(operator2.id);

      // Cross-attach (swap)
      await magnetPage.dragMagnetToTarget(operator1.id, excavator2.id);
      await magnetPage.dragMagnetToTarget(operator2.id, excavator1.id);

      // Verify swap completed correctly
      expect(await magnetPage.verifyAttachment(excavator1.id, operator2.id)).toBe(true);
      expect(await magnetPage.verifyAttachment(excavator2.id, operator1.id)).toBe(true);
      expect(await magnetPage.verifyAttachment(excavator1.id, operator1.id)).toBe(false);
      expect(await magnetPage.verifyAttachment(excavator2.id, operator2.id)).toBe(false);
    });

    test('reorganize multiple attachment groups across jobs', async ({ page }) => {
      // Create 3 jobs
      const jobs = [
        TestDataFactory.createDayJob({ name: 'Reorg Job A' }),
        TestDataFactory.createDayJob({ name: 'Reorg Job B' }),
        TestDataFactory.createDayJob({ name: 'Reorg Job C' })
      ];

      // Create 3 truck-driver pairs
      const truckPairs = Array.from({ length: 3 }, (_, i) => ({
        truck: TestDataFactory.createTruck('10W', { name: `Reorg Truck ${i + 1}` }),
        driver: TestDataFactory.createDriver({ name: `Reorg Driver ${i + 1}` })
      }));

      // Attach all pairs
      for (const pair of truckPairs) {
        await magnetPage.dragMagnetToTarget(pair.driver.id, pair.truck.id);
      }

      // Initially assign to job A
      for (const pair of truckPairs) {
        await schedulerPage.dragResourceToJob(pair.truck.id, jobs[0].name, 'Trucks');
      }

      // Redistribute: 1 to each job
      await schedulerPage.moveAssignment(truckPairs[1].truck.id, jobs[0].name, jobs[1].name, 'Trucks');
      await schedulerPage.moveAssignment(truckPairs[2].truck.id, jobs[0].name, jobs[2].name, 'Trucks');

      // Verify distribution and attachments maintained
      expect(await schedulerPage.isResourceAssigned(truckPairs[0].truck.id, jobs[0].name)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(truckPairs[0].driver.id, jobs[0].name)).toBe(true);

      expect(await schedulerPage.isResourceAssigned(truckPairs[1].truck.id, jobs[1].name)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(truckPairs[1].driver.id, jobs[1].name)).toBe(true);

      expect(await schedulerPage.isResourceAssigned(truckPairs[2].truck.id, jobs[2].name)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(truckPairs[2].driver.id, jobs[2].name)).toBe(true);

      // All attachments should remain intact
      for (const pair of truckPairs) {
        expect(await magnetPage.verifyAttachment(pair.truck.id, pair.driver.id)).toBe(true);
      }
    });
  });

  test.describe('Edge Cases and Error Prevention', () => {
    test('handle circular attachment attempts gracefully', async ({ page }) => {
      const operator1 = TestDataFactory.createOperator({ name: 'Circular Op 1' });
      const operator2 = TestDataFactory.createOperator({ name: 'Circular Op 2' });
      
      const errors: string[] = [];
      page.on('pageerror', err => errors.push(err.message));

      // Try to attach operator to operator (should fail gracefully)
      await magnetPage.dragMagnetToTarget(operator1.id, operator2.id);
      
      // Should not be attached
      expect(await magnetPage.verifyAttachment(operator2.id, operator1.id)).toBe(false);
      
      // No errors should occur
      expect(errors).toHaveLength(0);
    });

    test('maintain state consistency during failed operations', async ({ page }) => {
      const paver = TestDataFactory.createPaver({ name: 'State Test Paver' });
      const operator = TestDataFactory.createOperator({ name: 'State Test Op' });
      const screwmen = Array.from({ length: 4 }, (_, i) => 
        TestDataFactory.createScrewman({ name: `State Screwman ${i + 1}` })
      );

      // Attach operator
      await magnetPage.dragMagnetToTarget(operator.id, paver.id);

      // Attach 2 screwmen (within limit)
      await magnetPage.dragMagnetToTarget(screwmen[0].id, paver.id);
      await magnetPage.dragMagnetToTarget(screwmen[1].id, paver.id);

      // Try to attach 2 more (should fail for both)
      await magnetPage.dragMagnetToTarget(screwmen[2].id, paver.id);
      await magnetPage.dragMagnetToTarget(screwmen[3].id, paver.id);

      // Verify state is consistent
      const attached = await magnetPage.getAttachedResources(paver.id);
      expect(attached).toHaveLength(3); // operator + 2 screwmen
      expect(attached).toContain(operator.id);
      expect(attached).toContain(screwmen[0].id);
      expect(attached).toContain(screwmen[1].id);
      expect(attached).not.toContain(screwmen[2].id);
      expect(attached).not.toContain(screwmen[3].id);

      // Verify visual indicators are correct
      expect(await magnetPage.isAttachmentFull(paver.id)).toBe(true);
    });

    test('handle resource deletion while attached', async ({ page }) => {
      const truck = TestDataFactory.createTruck('10W', { name: 'Delete Test Truck' });
      const driver = TestDataFactory.createDriver({ name: 'Delete Test Driver' });
      
      // Attach driver to truck
      await magnetPage.dragMagnetToTarget(driver.id, truck.id);
      expect(await magnetPage.verifyAttachment(truck.id, driver.id)).toBe(true);

      // Simulate deletion of attached resource (detach first)
      await magnetPage.detachResource(driver.id);

      // Verify truck is in valid state
      const indicators = await magnetPage.getVisualIndicator(truck.id);
      expect(indicators.hasDriver).toBe(false);
      expect(indicators.canReceiveAttachment).toBe(true);

      // Should be able to attach new driver
      const newDriver = TestDataFactory.createDriver({ name: 'Replacement Driver' });
      await magnetPage.dragMagnetToTarget(newDriver.id, truck.id);
      expect(await magnetPage.verifyAttachment(truck.id, newDriver.id)).toBe(true);
    });

    test('preserve attachments during view changes', async ({ page }) => {
      const excavator = TestDataFactory.createExcavator({ name: 'View Test Excavator' });
      const operator = TestDataFactory.createOperator({ name: 'View Test Operator' });
      const job = TestDataFactory.createDayJob({ name: 'View Test Job' });

      // Attach and assign to job
      await magnetPage.dragMagnetToTarget(operator.id, excavator.id);
      await schedulerPage.dragResourceToJob(excavator.id, job.name, 'Equipment');

      // Switch views (day -> week -> month)
      await schedulerPage.switchView('week');
      await page.waitForTimeout(500);
      await schedulerPage.switchView('month');
      await page.waitForTimeout(500);
      await schedulerPage.switchView('day');

      // Verify attachment survived view changes
      expect(await magnetPage.verifyAttachment(excavator.id, operator.id)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(excavator.id, job.name)).toBe(true);
      expect(await schedulerPage.isResourceAssigned(operator.id, job.name)).toBe(true);
    });

    test('handle maximum attachment chains without performance degradation', async ({ page }) => {
      const startTime = Date.now();
      
      // Create large chain of resources
      const equipment = Array.from({ length: 10 }, (_, i) => 
        TestDataFactory.createExcavator({ name: `Perf Excavator ${i + 1}` })
      );
      const operators = Array.from({ length: 10 }, (_, i) => 
        TestDataFactory.createOperator({ name: `Perf Operator ${i + 1}` })
      );

      // Attach all in sequence
      for (let i = 0; i < equipment.length; i++) {
        await magnetPage.dragMagnetToTarget(operators[i].id, equipment[i].id);
      }

      const job = TestDataFactory.createDayJob({ name: 'Performance Test Job' });

      // Move all to job
      for (const equip of equipment) {
        await schedulerPage.dragResourceToJob(equip.id, job.name, 'Equipment');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (under 30 seconds for 10 pairs)
      expect(duration).toBeLessThan(30000);

      // Verify all attachments intact
      for (let i = 0; i < equipment.length; i++) {
        expect(await magnetPage.verifyAttachment(equipment[i].id, operators[i].id)).toBe(true);
      }
    });
  });
});