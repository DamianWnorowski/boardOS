import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.describe('Job Management', () => {
  let schedulerPage: SchedulerPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
  });

  test('can create new job', async ({ page }) => {
    const newJobButton = page.locator('[data-testid="new-job-button"]');
    await newJobButton.click();

    // Fill job details
    const jobModal = page.locator('[data-testid="job-modal"]');
    await jobModal.locator('[data-testid="job-name"]').fill('Test Highway Project');
    await jobModal.locator('[data-testid="job-type"]').selectOption('highway');
    await jobModal.locator('[data-testid="job-shift"]').selectOption('night');
    await jobModal.locator('[data-testid="job-date"]').fill('2024-12-25');
    
    // Save job
    await jobModal.locator('[data-testid="save-job"]').click();

    // Verify job appears
    const job = await schedulerPage.getJob('Test Highway Project');
    expect(await job.isVisible()).toBe(true);
  });

  test('can edit existing job', async ({ page }) => {
    const job = await schedulerPage.getJob('Existing Job');
    await job.click({ button: 'right' }); // Right-click for context menu

    const editOption = page.locator('[data-testid="edit-job"]');
    await editOption.click();

    // Edit job details
    const jobModal = page.locator('[data-testid="job-modal"]');
    await jobModal.locator('[data-testid="job-notes"]').fill('Updated notes for this job');
    await jobModal.locator('[data-testid="save-job"]').click();

    // Verify changes
    await job.hover();
    const tooltip = page.locator('[data-testid="job-tooltip"]');
    expect(await tooltip.textContent()).toContain('Updated notes');
  });

  test('can delete job without assignments', async ({ page }) => {
    const job = await schedulerPage.getJob('Empty Job');
    await job.click({ button: 'right' });

    const deleteOption = page.locator('[data-testid="delete-job"]');
    await deleteOption.click();

    // Confirm deletion
    const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
    await confirmDialog.locator('[data-testid="confirm-button"]').click();

    // Job should be removed
    expect(await job.isVisible()).toBe(false);
  });

  test('cannot delete job with assignments', async ({ page }) => {
    const operator = TestDataFactory.createOperator();
    
    // Add assignment to job
    await schedulerPage.dragResourceToJob(operator.id, 'Job With Resources', 'Crew');

    const job = await schedulerPage.getJob('Job With Resources');
    await job.click({ button: 'right' });

    const deleteOption = page.locator('[data-testid="delete-job"]');
    
    // Delete option should be disabled or show warning
    const isDisabled = await deleteOption.isDisabled();
    if (!isDisabled) {
      await deleteOption.click();
      const warning = page.locator('[data-testid="delete-warning"]');
      expect(await warning.textContent()).toContain('remove all assignments first');
    } else {
      expect(isDisabled).toBe(true);
    }
  });

  test('can finalize job with complete crew', async ({ page }) => {
    const { excavator, operator } = TestDataFactory.createEquipmentOperatorScenario();

    // Add required resources
    await schedulerPage.dragResourceToJob(excavator.id, 'Ready Job', 'Equipment');
    await schedulerPage.dragResourceToJob(operator.id, 'Ready Job', 'Equipment');

    const job = await schedulerPage.getJob('Ready Job');
    const finalizeButton = job.locator('[data-testid="finalize-job"]');
    
    await finalizeButton.click();

    // Confirm finalization
    const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
    await confirmDialog.locator('[data-testid="confirm-button"]').click();

    // Job should show finalized state
    const jobState = await job.getAttribute('data-finalized');
    expect(jobState).toBe('true');

    // Should not accept new assignments
    const newOperator = TestDataFactory.createOperator();
    await schedulerPage.dragResourceToJob(newOperator.id, 'Ready Job', 'Crew');
    
    const isAssigned = await schedulerPage.isResourceAssigned(newOperator.id, 'Ready Job');
    expect(isAssigned).toBe(false);
  });

  test('cannot finalize job with incomplete requirements', async ({ page }) => {
    const excavator = TestDataFactory.createExcavator();
    
    // Add equipment without operator
    await schedulerPage.dragResourceToJob(excavator.id, 'Incomplete Job', 'Equipment');

    const job = await schedulerPage.getJob('Incomplete Job');
    const finalizeButton = job.locator('[data-testid="finalize-job"]');
    
    await finalizeButton.click();

    // Should show validation errors
    const errorDialog = page.locator('[data-testid="validation-errors"]');
    expect(await errorDialog.isVisible()).toBe(true);
    expect(await errorDialog.textContent()).toContain('Equipment requires operator');

    // Job should not be finalized
    const jobState = await job.getAttribute('data-finalized');
    expect(jobState).not.toBe('true');
  });

  test('can duplicate job with assignments', async ({ page }) => {
    // Setup original job with resources
    const operator = TestDataFactory.createOperator();
    await schedulerPage.dragResourceToJob(operator.id, 'Original Job', 'Crew');

    const job = await schedulerPage.getJob('Original Job');
    await job.click({ button: 'right' });

    const duplicateOption = page.locator('[data-testid="duplicate-job"]');
    await duplicateOption.click();

    // Set new date for duplicate
    const dateModal = page.locator('[data-testid="duplicate-date-modal"]');
    await dateModal.locator('[data-testid="new-date"]').fill('2024-12-26');
    await dateModal.locator('[data-testid="confirm-duplicate"]').click();

    // New job should appear with same resources
    await schedulerPage.selectDate(new Date('2024-12-26'));
    
    const duplicatedJob = await schedulerPage.getJob('Original Job (Copy)');
    expect(await duplicatedJob.isVisible()).toBe(true);

    // Check resources were copied
    const isResourceCopied = await schedulerPage.isResourceAssigned(operator.id, 'Original Job (Copy)');
    expect(isResourceCopied).toBe(true);
  });

  test('can filter jobs by type', async ({ page }) => {
    const filterDropdown = page.locator('[data-testid="job-type-filter"]');
    
    // Filter to highway jobs only
    await filterDropdown.selectOption('highway');

    // Only highway jobs should be visible
    const visibleJobs = await schedulerPage.jobBoard.locator('[data-job-type]').all();
    for (const job of visibleJobs) {
      const jobType = await job.getAttribute('data-job-type');
      expect(jobType).toBe('highway');
    }

    // Clear filter
    await filterDropdown.selectOption('all');
    
    // All jobs should be visible again
    const allJobsCount = await schedulerPage.jobBoard.locator('[data-job-type]').count();
    expect(allJobsCount).toBeGreaterThan(visibleJobs.length);
  });

  test('can search jobs by name', async ({ page }) => {
    const searchInput = page.locator('[data-testid="job-search"]');
    
    await searchInput.fill('Main Street');
    await page.waitForTimeout(300); // Debounce

    // Only matching jobs should be visible
    const visibleJobs = await schedulerPage.jobBoard.locator('[data-job-name]:visible').all();
    for (const job of visibleJobs) {
      const jobName = await job.getAttribute('data-job-name');
      expect(jobName?.toLowerCase()).toContain('main street');
    }
  });

  test('job rows maintain correct order', async ({ page: _page }) => {
    void _page;
    const job = await schedulerPage.getJob('Test Job');
    const rows = await job.locator('[data-row-type]').all();

    // Expected order based on job_row_configs
    const expectedOrder = ['Forman', 'Equipment', 'Crew', 'Trucks', 'Sweeper'];
    
    for (let i = 0; i < rows.length && i < expectedOrder.length; i++) {
      const rowType = await rows[i].getAttribute('data-row-type');
      expect(rowType).toBe(expectedOrder[i]);
    }
  });

  test('shift indicator shows correctly', async ({ page: _page }) => {
    void _page;
    // Check day shift job
    await schedulerPage.selectShift('day');
    const dayJob = await schedulerPage.getJob('Day Job');
    const dayShiftIcon = dayJob.locator('[data-testid="shift-icon-day"]');
    expect(await dayShiftIcon.isVisible()).toBe(true);

    // Check night shift job
    await schedulerPage.selectShift('night');
    const nightJob = await schedulerPage.getJob('Night Job');
    const nightShiftIcon = nightJob.locator('[data-testid="shift-icon-night"]');
    expect(await nightShiftIcon.isVisible()).toBe(true);
  });

  test('job capacity limits are enforced', async ({ page: _page }) => {
    void _page;
    const _job = await schedulerPage.getJob('Limited Capacity Job');
    void _job; // Job reference for future assertions
    const crewRow = await schedulerPage.getJobRow('Limited Capacity Job', 'Crew');

    // Add resources up to capacity
    const operators = Array.from({ length: 10 }, (_, i) => 
      TestDataFactory.createOperator({ name: `Op${i}` })
    );

    let assignedCount = 0;
    for (const op of operators) {
      await schedulerPage.dragResourceToJob(op.id, 'Limited Capacity Job', 'Crew');
      if (await schedulerPage.isResourceAssigned(op.id, 'Limited Capacity Job')) {
        assignedCount++;
      }
    }

    // Should stop at capacity limit (e.g., 8)
    expect(assignedCount).toBeLessThanOrEqual(8);

    // Row should show at capacity
    const rowCapacity = await crewRow.getAttribute('data-at-capacity');
    expect(rowCapacity).toBe('true');
  });
});