// Auto-generated E2E tests from database rules
// Generated at: 2025-08-29T04:18:50.052Z
// DO NOT EDIT - This file is auto-generated

import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { MagnetPage } from '../../pages/MagnetPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.describe('Auto-generated Business Rules Tests', () => {

  test.describe('Magnet Attachment Rules', () => {
  test('operator can attach skidsteer', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createOperator();
    const target = TestDataFactory.createSkidsteer();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('operator respects max 1 skidsteer', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createSkidsteer({ name: 'skidsteer ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('operator requires skidsteer for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires skidsteer');
  });

  test('operator can attach paver', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createOperator();
    const target = TestDataFactory.createPaver();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('operator respects max 1 paver', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createPaver({ name: 'paver ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('operator requires paver for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires paver');
  });

  test('operator can attach excavator', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createOperator();
    const target = TestDataFactory.createExcavator();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('operator respects max 1 excavator', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createExcavator({ name: 'excavator ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('operator requires excavator for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires excavator');
  });

  test('operator can attach sweeper', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createOperator();
    const target = TestDataFactory.createSweeper();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('operator respects max 1 sweeper', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createSweeper({ name: 'sweeper ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('operator requires sweeper for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires sweeper');
  });

  test('operator can attach millingMachine', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createOperator();
    const target = TestDataFactory.createMillingMachine();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('operator respects max 1 millingMachine', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createMillingMachine({ name: 'millingMachine ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('operator requires millingMachine for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires millingMachine');
  });

  test('operator can attach grader', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createOperator();
    const target = TestDataFactory.createGrader();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('operator respects max 1 grader', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createGrader({ name: 'grader ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('operator requires grader for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires grader');
  });

  test('operator can attach dozer', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createOperator();
    const target = TestDataFactory.createDozer();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('operator respects max 1 dozer', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createDozer({ name: 'dozer ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('operator requires dozer for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires dozer');
  });

  test('operator can attach payloader', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createOperator();
    const target = TestDataFactory.createPayloader();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('operator respects max 1 payloader', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createPayloader({ name: 'payloader ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('operator requires payloader for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires payloader');
  });

  test('operator can attach roller', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createOperator();
    const target = TestDataFactory.createRoller();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('operator respects max 1 roller', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createRoller({ name: 'roller ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('operator requires roller for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires roller');
  });

  test('operator can attach equipment', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createOperator();
    const target = TestDataFactory.createEquipment();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('operator respects max 1 equipment', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createEquipment({ name: 'equipment ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('operator requires equipment for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createOperator();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires equipment');
  });

  test('driver can attach truck', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createDriver();
    const target = TestDataFactory.createTruck();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('driver respects max 1 truck', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createDriver();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createTruck({ name: 'truck ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('driver requires truck for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createDriver();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires truck');
  });

  test('laborer can attach paver', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createLaborer();
    const target = TestDataFactory.createPaver();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('laborer respects max 2 paver', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createLaborer();
    const targets = Array.from({ length: 3 }, (_, i) => 
      TestDataFactory.createPaver({ name: 'paver ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(2);
  });

  test('laborer can attach millingMachine', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createLaborer();
    const target = TestDataFactory.createMillingMachine();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('laborer respects max 1 millingMachine', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createLaborer();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createMillingMachine({ name: 'millingMachine ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('laborer can attach truck', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createLaborer();
    const target = TestDataFactory.createTruck();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('laborer respects max 1 truck', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createLaborer();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createTruck({ name: 'truck ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('privateDriver can attach truck', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.createPrivateDriver();
    const target = TestDataFactory.createTruck();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });

  test('privateDriver respects max 1 truck', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createPrivateDriver();
    const targets = Array.from({ length: 2 }, (_, i) => 
      TestDataFactory.createTruck({ name: 'truck ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(1);
  });

  test('privateDriver requires truck for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.createPrivateDriver();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires truck');
  });

  });

  test.describe('Drop Rules', () => {
  test('foreman can be dropped on Forman row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createForeman();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Forman');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('operator cannot be dropped on Forman row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createOperator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Forman');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('driver cannot be dropped on Forman row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createDriver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Forman');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('excavator cannot be dropped on Forman row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createExcavator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Forman');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('paver cannot be dropped on Forman row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createPaver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Forman');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('truck cannot be dropped on Forman row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createTruck();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Forman');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('skidsteer can be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createSkidsteer();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('paver can be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createPaver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('excavator can be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createExcavator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('sweeper can be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createSweeper();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('millingMachine can be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createMillingMachine();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('grader can be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createGrader();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('dozer can be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createDozer();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('payloader can be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createPayloader();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('roller can be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createRoller();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('equipment can be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createEquipment();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('operator can be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createOperator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('driver cannot be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createDriver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('truck cannot be dropped on Equipment row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createTruck();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Equipment');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('sweeper can be dropped on Sweeper row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createSweeper();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Sweeper');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('operator can be dropped on Sweeper row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createOperator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Sweeper');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('driver cannot be dropped on Sweeper row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createDriver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Sweeper');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('excavator cannot be dropped on Sweeper row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createExcavator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Sweeper');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('paver cannot be dropped on Sweeper row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createPaver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Sweeper');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('truck cannot be dropped on Sweeper row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createTruck();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Sweeper');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('operator can be dropped on Tack row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createOperator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Tack');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('laborer can be dropped on Tack row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createLaborer();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Tack');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('truck can be dropped on Tack row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createTruck();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Tack');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('driver cannot be dropped on Tack row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createDriver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Tack');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('excavator cannot be dropped on Tack row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createExcavator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Tack');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('paver cannot be dropped on Tack row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createPaver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'Tack');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('operator can be dropped on MPT row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createOperator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'MPT');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('laborer can be dropped on MPT row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createLaborer();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'MPT');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('truck can be dropped on MPT row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createTruck();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'MPT');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('driver cannot be dropped on MPT row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createDriver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'MPT');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('excavator cannot be dropped on MPT row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createExcavator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'MPT');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('paver cannot be dropped on MPT row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createPaver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'MPT');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('operator can be dropped on crew row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createOperator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'crew');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('driver can be dropped on crew row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createDriver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'crew');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('striper can be dropped on crew row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createStriper();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'crew');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('foreman can be dropped on crew row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createForeman();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'crew');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('laborer can be dropped on crew row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createLaborer();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'crew');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('privateDriver can be dropped on crew row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createPrivateDriver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'crew');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('excavator cannot be dropped on crew row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createExcavator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'crew');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('paver cannot be dropped on crew row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createPaver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'crew');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('truck cannot be dropped on crew row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createTruck();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'crew');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('truck can be dropped on trucks row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createTruck();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'trucks');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('driver can be dropped on trucks row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createDriver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'trucks');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('privateDriver can be dropped on trucks row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createPrivateDriver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'trucks');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });

  test('operator cannot be dropped on trucks row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createOperator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'trucks');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('excavator cannot be dropped on trucks row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createExcavator();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'trucks');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  test('paver cannot be dropped on trucks row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.createPaver();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', 'trucks');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });

  });

  test.describe('Custom Business Rules', () => {
    test('prevents double shift assignments', async ({ page }) => {
      const scheduler = new SchedulerPage(page);
      await scheduler.goto();
      
      const operator = TestDataFactory.createOperator();
      
      // Assign to day shift
      await scheduler.selectShift('day');
      await scheduler.dragResourceToJob(operator.id, 'Day Job', 'Crew');
      
      // Try to assign to night shift
      await scheduler.selectShift('night');
      await scheduler.dragResourceToJob(operator.id, 'Night Job', 'Crew');
      
      // Should not be assigned to night job
      const isInNightJob = await scheduler.isResourceAssigned(operator.id, 'Night Job');
      expect(isInNightJob).toBe(false);
      
      // Should show double shift warning
      const warning = page.locator('[data-testid="double-shift-warning"]');
      expect(await warning.isVisible()).toBe(true);
    });

    test('enforces equipment safety requirements', async ({ page }) => {
      const scheduler = new SchedulerPage(page);
      await scheduler.goto();
      
      const excavator = TestDataFactory.createExcavator();
      
      // Add equipment without operator
      await scheduler.dragResourceToJob(excavator.id, 'Test Job', 'Equipment');
      
      // Try to finalize
      const finalizeButton = page.locator('[data-testid="finalize-job"]');
      await finalizeButton.click();
      
      // Should show safety warning
      const warning = page.locator('[data-testid="safety-warning"]');
      expect(await warning.isVisible()).toBe(true);
      expect(await warning.textContent()).toContain('Equipment requires operator');
    });

    test('moves attached resources as a group', async ({ page }) => {
      const scheduler = new SchedulerPage(page);
      const magnet = new MagnetPage(page);
      await scheduler.goto();
      
      const truck = TestDataFactory.createTruck();
      const driver = TestDataFactory.createDriver();
      
      // Attach driver to truck
      await magnet.dragMagnetToTarget(driver.id, truck.id);
      
      // Assign truck to job
      await scheduler.dragResourceToJob(truck.id, 'Job A', 'Trucks');
      
      // Both should be in Job A
      expect(await scheduler.isResourceAssigned(truck.id, 'Job A')).toBe(true);
      expect(await scheduler.isResourceAssigned(driver.id, 'Job A')).toBe(true);
      
      // Move truck to Job B
      await scheduler.moveAssignment(truck.id, 'Job A', 'Job B', 'Trucks');
      
      // Both should move together
      expect(await scheduler.isResourceAssigned(truck.id, 'Job B')).toBe(true);
      expect(await scheduler.isResourceAssigned(driver.id, 'Job B')).toBe(true);
    });
  });

});