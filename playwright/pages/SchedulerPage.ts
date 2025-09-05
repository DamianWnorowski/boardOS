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
    this.resourcePanel = page.locator('aside'); // Sidebar contains resources
    this.dateSelector = page.locator('[data-testid="date-selector"]');
    this.shiftToggle = page.locator('[data-testid="shift-toggle"]');
    this.searchInput = page.locator('input[placeholder*="Search"]');
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
    // Try to find resource card or truck card
    const resourceCard = this.page.locator(`[data-testid="resource-card-${resourceId}"]`);
    const truckCard = this.page.locator(`[data-testid="truck-card-${resourceId}"]`);
    
    let resource;
    if (await resourceCard.count() > 0) {
      resource = resourceCard;
    } else if (await truckCard.count() > 0) {
      resource = truckCard;
    } else {
      // Fallback to data-resource-id
      resource = this.page.locator(`[data-resource-id="${resourceId}"]`);
    }
    
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

  // Truck-specific operations
  async switchToTrucksTab() {
    const trucksTab = this.page.locator('button:has-text("Trucks & Drivers")');
    await trucksTab.click();
  }

  async getTruckDriverSection() {
    return this.page.locator('[data-testid="truck-driver-section"]');
  }

  async getTruckCard(truckId: string) {
    return this.page.locator(`[data-testid="truck-card-${truckId}"]`);
  }

  async switchView(view: 'day' | 'week' | 'month') {
    const viewButton = this.page.locator(`button:has-text("${view.charAt(0).toUpperCase() + view.slice(1)}")`);
    await viewButton.click();
  }

  async openQuickAddModal() {
    const addButton = this.page.locator('button:has-text("Add Resource")').or(
      this.page.locator('button[aria-label*="Add"]')
    );
    await addButton.click();
  }

  // Date and multi-day operations
  async setDate(date: Date) {
    const dateInput = this.page.locator('input[type="date"]').or(this.dateSelector);
    const dateString = date.toISOString().split('T')[0];
    await dateInput.fill(dateString);
    await this.page.waitForTimeout(500); // Wait for data to load
  }

  async copyJobToDate(jobName: string, targetDate: Date) {
    const job = await this.getJob(jobName);
    const copyButton = job.locator('button[aria-label*="Copy"]').or(
      job.locator('button:has-text("Copy")')
    );
    
    if (await copyButton.count() > 0) {
      await copyButton.click();
      
      // Select target date in modal
      const dateInput = this.page.locator('.modal input[type="date"]');
      const dateString = targetDate.toISOString().split('T')[0];
      await dateInput.fill(dateString);
      
      // Confirm copy
      const confirmButton = this.page.locator('.modal button:has-text("Copy")');
      await confirmButton.click();
    }
  }

  // Advanced resource operations
  async getResourceByName(resourceName: string): Promise<Locator> {
    return this.page.locator(`[data-resource-name="${resourceName}"]`);
  }

  async verifyChainAssignment(parentResourceId: string, childResourceIds: string[], jobName: string): Promise<boolean> {
    const parentAssigned = await this.isResourceAssigned(parentResourceId, jobName);
    const childrenAssigned = await Promise.all(
      childResourceIds.map(childId => this.isResourceAssigned(childId, jobName))
    );
    
    return parentAssigned && childrenAssigned.every(assigned => assigned);
  }

  // Performance monitoring
  async measureOperationTime<T>(operation: () => Promise<T>): Promise<{ result: T; time: number }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    
    return {
      result,
      time: endTime - startTime
    };
  }

  // Error monitoring
  async monitorConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    this.page.on('pageerror', err => {
      errors.push(err.message);
    });

    return errors;
  }

  // Wait for specific UI updates
  async waitForAssignmentUpdate(resourceId: string, jobName: string, timeout: number = 5000) {
    await this.page.waitForSelector(`[data-assignment-resource="${resourceId}"]`, { timeout });
    await this.waitForRealTimeUpdate();
  }

  async waitForChainUpdate(parentId: string, childIds: string[], timeout: number = 5000) {
    // Wait for all chain members to be updated
    const selectors = [parentId, ...childIds].map(id => `[data-resource-id="${id}"]`);
    await Promise.all(selectors.map(selector => 
      this.page.waitForSelector(selector, { timeout })
    ));
    await this.waitForRealTimeUpdate();
  }
}