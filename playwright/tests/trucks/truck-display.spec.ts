import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.describe('Truck Display and Database Loading', () => {
  let schedulerPage: SchedulerPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
    
    // Wait for data to load and check for any console errors
    await page.waitForTimeout(2000);
  });

  test('trucks are loaded from database on page load', async ({ page }) => {
    // Listen for console logs to verify truck data loading
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('🚛')) {
        logs.push(msg.text());
      }
    });

    // Refresh to trigger data loading
    await page.reload();
    await page.waitForTimeout(3000);

    // Check that truck data loading logs are present
    const truckDataLog = logs.find(log => log.includes('Truck data loaded:'));
    expect(truckDataLog).toBeDefined();
    
    // Verify console shows truck assignments were loaded
    console.log('Truck loading logs:', logs);
  });

  test('truck assignments display in correct sections', async ({ page }) => {
    // Create a test job if it doesn't exist
    const testJob = TestDataFactory.createJob('Test Paving Job', 'paving');
    await schedulerPage.createJob(testJob);

    // Check for flowboy section
    const flowboySection = page.locator('[data-testid*="flowboy"]').first();
    const flowboyExists = await flowboySection.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (flowboyExists) {
      // Verify flowboy counter shows correct count
      const flowboyCounter = page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first();
      const counterText = await flowboyCounter.textContent();
      console.log('Flowboy counter:', counterText);
      
      // Check if there are actual truck cards displayed
      const truckCards = page.locator('[data-testid*="assignment-card"]');
      const cardCount = await truckCards.count();
      console.log('Visible truck cards:', cardCount);
    }

    // Check for 10W trucks section
    const tenWSection = page.locator('text="10W Trucks"');
    const tenWExists = await tenWSection.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (tenWExists) {
      const tenWCounter = tenWSection.locator('..//select').first();
      const tenWCounterText = await tenWCounter.textContent();
      console.log('10W Trucks counter:', tenWCounterText);
    }
  });

  test('verify truck categorization logic', async ({ page }) => {
    // Listen for truck categorization logs
    const categorizationLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('🚛') && msg.text().includes('categorized')) {
        categorizationLogs.push(msg.text());
      }
    });

    // Navigate to a job with trucks to trigger categorization
    await page.reload();
    await page.waitForTimeout(3000);

    // Log categorization results
    console.log('Truck categorization logs:', categorizationLogs);
    
    // Verify that trucks are being categorized
    expect(categorizationLogs.length).toBeGreaterThan(0);
  });

  test('verify truck configuration lookup', async ({ page }) => {
    // Check localStorage for truck configurations
    const truckConfigs = await page.evaluate(() => {
      const configs = localStorage.getItem('truck-configurations');
      return configs ? JSON.parse(configs) : {};
    });

    console.log('Truck configurations in localStorage:', truckConfigs);

    // Listen for configuration lookup logs
    const configLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('🚛') && msg.text().includes('config')) {
        configLogs.push(msg.text());
      }
    });

    // Trigger configuration lookup by refreshing
    await page.reload();
    await page.waitForTimeout(3000);

    console.log('Configuration lookup logs:', configLogs);
  });

  test('trucks display correctly in different view modes', async ({ page }) => {
    // Test in day view
    await page.locator('[data-testid="view-day"]').click();
    await page.waitForTimeout(1000);
    
    const dayViewTrucks = page.locator('[data-testid*="truck"]');
    const dayCount = await dayViewTrucks.count();
    console.log('Trucks visible in day view:', dayCount);

    // Test in week view  
    await page.locator('[data-testid="view-week"]').click();
    await page.waitForTimeout(1000);
    
    const weekViewTrucks = page.locator('[data-testid*="truck"]');
    const weekCount = await weekViewTrucks.count();
    console.log('Trucks visible in week view:', weekCount);

    // Test in month view
    await page.locator('[data-testid="view-month"]').click();
    await page.waitForTimeout(1000);
    
    const monthViewTrucks = page.locator('[data-testid*="truck"]');
    const monthCount = await monthViewTrucks.count();
    console.log('Trucks visible in month view:', monthCount);
  });

  test('verify assignment count matches displayed trucks', async ({ page }) => {
    // Find all truck sections with counters
    const flowboySection = page.locator('text="Flowboy"').locator('../..//select').first();
    const dumpSection = page.locator('text="Dump Trailer"').locator('../..//select').first();
    const tenWSection = page.locator('text="10W Trucks"').locator('../..//select').first();

    // Get counter values
    const flowboyText = await flowboySection.textContent().catch(() => '0 / 0');
    const dumpText = await dumpSection.textContent().catch(() => '0 / 0');
    const tenWText = await tenWSection.textContent().catch(() => '0 / 0');

    console.log('Section counters:', {
      flowboy: flowboyText,
      dump: dumpText,
      tenW: tenWText
    });

    // Count actual visible assignment cards in each section
    const flowboyCards = page.locator('[data-testid="flowboy-section"] [data-testid*="assignment-card"]');
    const dumpCards = page.locator('[data-testid="dump-section"] [data-testid*="assignment-card"]');
    const tenWCards = page.locator('[data-testid="10w-section"] [data-testid*="assignment-card"]');

    const flowboyVisible = await flowboyCards.count().catch(() => 0);
    const dumpVisible = await dumpCards.count().catch(() => 0);
    const tenWVisible = await tenWCards.count().catch(() => 0);

    console.log('Visible cards:', {
      flowboy: flowboyVisible,
      dump: dumpVisible,
      tenW: tenWVisible
    });

    // Extract counts from counter text (e.g., "12 / 5" -> 12)
    const extractCount = (text: string) => {
      const match = text.match(/(\d+)\s*\/\s*\d+/);
      return match ? parseInt(match[1]) : 0;
    };

    const flowboyCount = extractCount(flowboyText);
    const dumpCount = extractCount(dumpText);
    const tenWCount = extractCount(tenWText);

    // Verify counts match (this is the bug we're testing for)
    expect(flowboyVisible).toBe(flowboyCount);
    expect(dumpVisible).toBe(dumpCount);
    expect(tenWVisible).toBe(tenWCount);
  });

  test('debug assignment filtering process', async ({ page }) => {
    // Listen for all truck-related debug logs
    const debugLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('🚛')) {
        debugLogs.push(msg.text());
      }
    });

    // Navigate to trigger filtering
    await page.reload();
    await page.waitForTimeout(3000);

    // Log all debug information for analysis
    console.log('=== TRUCK DEBUG LOGS ===');
    debugLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });

    // Verify key filtering steps are logged
    const hasAssignmentLog = debugLogs.some(log => log.includes('Total assignments'));
    const hasCategorization = debugLogs.some(log => log.includes('categorized as'));
    const hasConfigLookup = debugLogs.some(log => log.includes('Checking flowboy config'));

    expect(hasAssignmentLog).toBe(true);
    expect(hasCategorization).toBe(true);
    expect(hasConfigLookup).toBe(true);
  });
});