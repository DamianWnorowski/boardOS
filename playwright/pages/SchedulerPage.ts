import { Page, Locator } from '@playwright/test';

export class SchedulerPage {
  readonly page: Page;
  readonly jobBoard: Locator;
  readonly resourcePanel: Locator;
  readonly dateSelector: Locator;
  readonly shiftToggle: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.jobBoard = page.locator('[data-testid="job-board"]');
    this.resourcePanel = page.locator('[data-testid="resource-panel"]');
    this.dateSelector = page.locator('[data-testid="date-selector"]');
    this.shiftToggle = page.locator('[data-testid="shift-toggle"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForSelector('#app-root', { timeout: 10000 });
  }

  async selectDate(date: Date) {
    await this.dateSelector.click();
    const dateString = date.toISOString().split('T')[0];
    await this.page.locator(`[data-date="${dateString}"]`).click();
  }

  async selectShift(shift: 'day' | 'night') {
    const currentShift = await this.shiftToggle.getAttribute('data-shift');
    if (currentShift !== shift) {
      await this.shiftToggle.click();
    }
  }

  async searchResources(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(300); // Debounce
  }

  async getJob(jobName: string): Promise<Locator> {
    return this.jobBoard.locator(`[data-job-name="${jobName}"]`);
  }

  async getJobRow(jobName: string, rowType: string): Promise<Locator> {
    const job = await this.getJob(jobName);
    return job.locator(`[data-row-type="${rowType}"]`);
  }

  async dragResourceToJob(
    resourceId: string,
    jobName: string,
    rowType: string
  ) {
    const resource = this.resourcePanel.locator(`[data-resource-id="${resourceId}"]`);
    const targetRow = await this.getJobRow(jobName, rowType);
    
    await resource.dragTo(targetRow);
  }

  async getAssignment(resourceId: string, jobName: string): Promise<Locator> {
    const job = await this.getJob(jobName);
    return job.locator(`[data-assignment-resource="${resourceId}"]`);
  }

  async removeAssignment(resourceId: string, jobName: string) {
    const assignment = await this.getAssignment(resourceId, jobName);
    const dropZone = this.page.locator('[data-testid="remove-drop-zone"]');
    
    await assignment.dragTo(dropZone);
  }

  async moveAssignment(
    resourceId: string,
    fromJob: string,
    toJob: string,
    toRow: string
  ) {
    const assignment = await this.getAssignment(resourceId, fromJob);
    const targetRow = await this.getJobRow(toJob, toRow);
    
    await assignment.dragTo(targetRow);
  }

  async createSecondShift(resourceId: string, fromJob: string, toJob: string) {
    const assignment = await this.getAssignment(resourceId, fromJob);
    const targetJob = await this.getJob(toJob);
    
    // Ctrl+drag for second shift
    await this.page.keyboard.down('Control');
    await assignment.dragTo(targetJob);
    await this.page.keyboard.up('Control');
  }

  async isResourceAssigned(resourceId: string, jobName: string): Promise<boolean> {
    const assignment = await this.getAssignment(resourceId, jobName);
    return await assignment.isVisible();
  }

  async getAssignmentIndicators(resourceId: string, jobName: string) {
    const assignment = await this.getAssignment(resourceId, jobName);
    const classes = await assignment.getAttribute('class') || '';
    
    return {
      hasDoubleShift: classes.includes('border-red'),
      hasMultipleDayJobs: classes.includes('border-teal'),
      hasNightShift: classes.includes('border-orange'),
      isOnSite: await assignment.locator('.bg-green-500').isVisible(),
      hasYardTime: await assignment.locator('.bg-blue-500').isVisible()
    };
  }

  async waitForRealTimeUpdate() {
    // Wait for Supabase subscription update
    await this.page.waitForTimeout(500);
  }

  async getResourceCount(type: string): Promise<number> {
    const resources = await this.resourcePanel.locator(`[data-resource-type="${type}"]`).all();
    return resources.length;
  }

  async getAvailableResources(type: string) {
    return this.resourcePanel.locator(`[data-resource-type="${type}"][data-available="true"]`);
  }

  async getAssignedResources(type: string) {
    return this.jobBoard.locator(`[data-resource-type="${type}"]`);
  }
}