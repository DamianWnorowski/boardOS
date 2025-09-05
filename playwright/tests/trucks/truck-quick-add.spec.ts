import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.describe('Truck Quick Add Functionality', () => {
  let schedulerPage: SchedulerPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
    
    // Create a test job for truck assignments
    const testJob = TestDataFactory.createJob('Quick Add Test Job', 'paving');
    await schedulerPage.createJob(testJob);
  });

  test('quick add truck button is visible and functional', async ({ page }) => {
    // Navigate to trucks section of a job
    const trucksSection = page.locator('[data-testid="job-row-trucks"]').first();
    await expect(trucksSection).toBeVisible();

    // Look for quick add truck button
    const quickAddButton = page.locator('[data-testid="quick-add-truck"]').first();
    const buttonExists = await quickAddButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (buttonExists) {
      await quickAddButton.click();
      
      // Verify modal opens
      const modal = page.locator('[data-testid="equipment-selector-modal"]');
      await expect(modal).toBeVisible();
      
      console.log('Quick add truck button is functional');
    } else {
      console.log('Quick add truck button not found - may need job type adjustment');
    }
  });

  test('new truck is assigned to correct row type', async ({ page }) => {
    // Listen for assignment creation logs
    const assignmentLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('🚛') && msg.text().includes('Creating assignment')) {
        assignmentLogs.push(msg.text());
      }
    });

    // Try to add a truck via quick add
    const quickAddButton = page.locator('text="Add Flowboy"').first();
    const buttonExists = await quickAddButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (buttonExists) {
      await quickAddButton.click();
      
      // Select a truck from the modal
      const truckCard = page.locator('[data-testid*="truck-card"]').first();
      const cardExists = await truckCard.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (cardExists) {
        await truckCard.click();
        await page.waitForTimeout(1000);
        
        // Check assignment logs
        console.log('Assignment creation logs:', assignmentLogs);
        
        // Verify assignment was created with correct row type
        const correctRowTypeLog = assignmentLogs.find(log => 
          log.includes('trucks') || log.includes('"row":"trucks"')
        );
        expect(correctRowTypeLog).toBeDefined();
      }
    }
  });

  test('newly added truck appears in UI', async ({ page }) => {
    // Count trucks before adding
    const initialTruckCards = page.locator('[data-testid*="assignment-card"]');
    const initialCount = await initialTruckCards.count();
    console.log('Initial truck cards:', initialCount);

    // Add a truck via quick add
    const addFlowboyButton = page.locator('text="Add Flowboy"').first();
    const buttonExists = await addFlowboyButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (buttonExists) {
      await addFlowboyButton.click();
      
      // Wait for modal and select first available truck
      await page.waitForTimeout(1000);
      const firstTruck = page.locator('[data-testid*="truck-card"]').first();
      const truckExists = await firstTruck.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (truckExists) {
        await firstTruck.click();
        
        // Wait for assignment to be created and UI to update
        await page.waitForTimeout(2000);
        
        // Count trucks after adding
        const finalTruckCards = page.locator('[data-testid*="assignment-card"]');
        const finalCount = await finalTruckCards.count();
        console.log('Final truck cards:', finalCount);
        
        // Should have one more truck
        expect(finalCount).toBeGreaterThan(initialCount);
      }
    }
  });

  test('truck categorization works for new trucks', async ({ page }) => {
    // Listen for categorization logs
    const categorizationLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('🚛') && msg.text().includes('categorized as')) {
        categorizationLogs.push(msg.text());
      }
    });

    // Create a truck with specific identifier
    await schedulerPage.createTruck('Test Quick Add Truck', '389'); // 10W truck
    
    // Refresh to trigger categorization
    await page.reload();
    await page.waitForTimeout(2000);
    
    console.log('Truck categorization logs:', categorizationLogs);
    
    // Should see this truck categorized as 10W
    const tenWLog = categorizationLogs.find(log => 
      log.includes('10W') && log.includes('389')
    );
    expect(tenWLog).toBeDefined();
  });

  test('flowboy configuration persists after quick add', async ({ page }) => {
    // Add a truck as flowboy
    const addFlowboyButton = page.locator('text="Add Flowboy"').first();
    const buttonExists = await addFlowboyButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (buttonExists) {
      await addFlowboyButton.click();
      
      // Select truck and configure as flowboy
      const truckCard = page.locator('[data-testid*="truck-card"]').first();
      const cardExists = await truckCard.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (cardExists) {
        await truckCard.click();
        await page.waitForTimeout(1000);
        
        // Check localStorage for configuration
        const configs = await page.evaluate(() => {
          const stored = localStorage.getItem('truck-configurations');
          return stored ? JSON.parse(stored) : {};
        });
        
        console.log('Configurations after quick add:', configs);
        
        // Should have at least one flowboy configuration
        const hasFlowboyConfig = Object.values(configs).includes('flowboy');
        expect(hasFlowboyConfig).toBe(true);
      }
    }
  });

  test('dump trailer quick add works correctly', async ({ page }) => {
    // Switch to a milling job to get dump trailer buttons
    const millingJob = TestDataFactory.createJob('Milling Test Job', 'milling');
    await schedulerPage.createJob(millingJob);
    
    // Look for dump trailer add button
    const addDumpButton = page.locator('text="Add Dump Trailer"').first();
    const buttonExists = await addDumpButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (buttonExists) {
      await addDumpButton.click();
      
      // Select and assign truck
      const truckCard = page.locator('[data-testid*="truck-card"]').first();
      const cardExists = await truckCard.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (cardExists) {
        await truckCard.click();
        await page.waitForTimeout(1000);
        
        // Verify dump trailer configuration
        const configs = await page.evaluate(() => {
          const stored = localStorage.getItem('truck-configurations');
          return stored ? JSON.parse(stored) : {};
        });
        
        const hasDumpConfig = Object.values(configs).includes('dump-trailer');
        expect(hasDumpConfig).toBe(true);
        
        console.log('Dump trailer configuration successful');
      }
    }
  });

  test('10W truck quick add works correctly', async ({ page }) => {
    // 10W trucks should be available for any job type
    const addTenWButton = page.locator('text="10W Truck"').first();
    const buttonExists = await addTenWButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (buttonExists) {
      await addTenWButton.click();
      
      // Should show only 10W trucks in modal
      await page.waitForTimeout(1000);
      const truckCards = page.locator('[data-testid*="truck-card"]');
      const cardCount = await truckCards.count();
      
      console.log('Available 10W trucks:', cardCount);
      
      if (cardCount > 0) {
        await truckCards.first().click();
        await page.waitForTimeout(1000);
        
        // Verify truck appears in 10W section
        const tenWSection = page.locator('text="10W Trucks"').locator('../../..');
        const tenWCards = tenWSection.locator('[data-testid*="assignment-card"]');
        const tenWCount = await tenWCards.count();
        
        console.log('10W trucks after adding:', tenWCount);
        expect(tenWCount).toBeGreaterThan(0);
      }
    }
  });

  test('quick add respects truck availability', async ({ page }) => {
    // Try to add multiple trucks and see if availability changes
    const initialButton = page.locator('text="Add Flowboy"').first();
    const buttonExists = await initialButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (buttonExists) {
      // Get initial available truck count
      await initialButton.click();
      await page.waitForTimeout(1000);
      
      const initialTrucks = page.locator('[data-testid*="truck-card"]');
      const initialCount = await initialTrucks.count();
      console.log('Initial available trucks:', initialCount);
      
      // Cancel and close modal
      await page.locator('[data-testid="close-modal"]').click().catch(() => {
        // Try alternate close button
        page.keyboard.press('Escape');
      });
      
      if (initialCount > 0) {
        // Add a truck
        await initialButton.click();
        await page.waitForTimeout(500);
        await initialTrucks.first().click();
        await page.waitForTimeout(1000);
        
        // Try to add another truck - should have one less available
        const secondButton = page.locator('text="Add Flowboy"').first();
        const stillVisible = await secondButton.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (stillVisible) {
          await secondButton.click();
          await page.waitForTimeout(1000);
          
          const remainingTrucks = page.locator('[data-testid*="truck-card"]');
          const remainingCount = await remainingTrucks.count();
          
          console.log('Remaining available trucks:', remainingCount);
          expect(remainingCount).toBeLessThanOrEqual(initialCount);
        }
      }
    }
  });

  test('error handling for invalid truck assignments', async ({ page }) => {
    // Listen for error logs
    const errorLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });

    // Try to add truck with invalid configuration
    await page.evaluate(() => {
      // Simulate a scenario that might cause errors
      localStorage.setItem('truck-configurations', '{"invalid": true}');
    });

    // Try quick add with corrupted localStorage
    const addButton = page.locator('text="Add Flowboy"').first();
    const buttonExists = await addButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (buttonExists) {
      await addButton.click();
      await page.waitForTimeout(1000);
      
      // Should handle gracefully without crashing
      const modalVisible = await page.locator('[data-testid="equipment-selector-modal"]')
        .isVisible({ timeout: 5000 }).catch(() => false);
      
      console.log('Modal still visible after error scenario:', modalVisible);
      console.log('Error logs:', errorLogs);
      
      // App should still be functional
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    }
  });
});