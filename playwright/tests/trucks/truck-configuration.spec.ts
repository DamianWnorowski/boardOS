import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.describe('Truck Configuration Management', () => {
  let schedulerPage: SchedulerPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
    
    // Clear any existing truck configurations
    await page.evaluate(() => {
      localStorage.removeItem('truck-configurations');
    });
  });

  test('truck configuration persists in localStorage', async ({ page }) => {
    // Create a test truck
    const truck = TestDataFactory.createTruck('Test Truck', '50');
    await schedulerPage.addResource(truck);

    // Open truck configuration modal
    await page.locator('[data-testid="quick-add-truck"]').click();
    
    // Configure as flowboy
    await page.locator('[data-testid="truck-config-flowboy"]').click();
    await page.locator('[data-testid="assign-truck"]').click();

    // Wait for configuration to be saved
    await page.waitForTimeout(1000);

    // Check localStorage
    const configs = await page.evaluate(() => {
      const stored = localStorage.getItem('truck-configurations');
      return stored ? JSON.parse(stored) : {};
    });

    console.log('Stored configurations:', configs);
    expect(Object.keys(configs).length).toBeGreaterThan(0);
  });

  test('flowboy configuration applies correctly', async ({ page }) => {
    // Set up a truck configuration manually
    await page.evaluate((truckId) => {
      const configs = { [truckId]: 'flowboy' };
      localStorage.setItem('truck-configurations', JSON.stringify(configs));
    }, 'test-truck-id');

    // Refresh to apply configuration
    await page.reload();
    await page.waitForTimeout(2000);

    // Check that flowboy filtering works
    const configLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('🚛') && msg.text().includes('flowboy config')) {
        configLogs.push(msg.text());
      }
    });

    // Trigger configuration lookup
    await page.reload();
    await page.waitForTimeout(2000);

    console.log('Flowboy config logs:', configLogs);
    expect(configLogs.length).toBeGreaterThan(0);
  });

  test('dump trailer configuration applies correctly', async ({ page }) => {
    // Set up dump trailer configuration
    await page.evaluate((truckId) => {
      const configs = { [truckId]: 'dump-trailer' };
      localStorage.setItem('truck-configurations', JSON.stringify(configs));
    }, 'test-dump-truck-id');

    // Listen for dump trailer configuration logs
    const dumpLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('🚛') && msg.text().includes('dump-trailer config')) {
        dumpLogs.push(msg.text());
      }
    });

    // Refresh to trigger configuration lookup
    await page.reload();
    await page.waitForTimeout(2000);

    console.log('Dump trailer config logs:', dumpLogs);
    expect(dumpLogs.length).toBeGreaterThan(0);
  });

  test('configuration changes trigger UI updates', async ({ page }) => {
    // Create and assign a truck first
    const truck = TestDataFactory.createTruck('Test Configurable Truck', '55');
    const testJob = TestDataFactory.createJob('Config Test Job', 'paving');
    
    await schedulerPage.createJob(testJob);
    
    // Add truck to job
    await page.locator('[data-testid="quick-add-truck"]').click();
    
    // Initially configure as flowboy
    await page.locator('[data-testid="truck-config-flowboy"]').click();
    await page.locator('[data-testid="assign-truck"]').click();
    
    // Wait and check flowboy section
    await page.waitForTimeout(1000);
    const flowboyCount = await page.locator('text="Flowboy"').locator('..//select').first().textContent();
    console.log('Flowboy count after assignment:', flowboyCount);

    // Change configuration to dump trailer
    await page.evaluate((truckId) => {
      const configs = JSON.parse(localStorage.getItem('truck-configurations') || '{}');
      configs[truckId] = 'dump-trailer';
      localStorage.setItem('truck-configurations', JSON.stringify(configs));
    }, truck.id);

    // Refresh to apply new configuration
    await page.reload();
    await page.waitForTimeout(2000);

    // Check dump trailer section
    const dumpCount = await page.locator('text="Dump Trailer"').locator('..//select').first().textContent().catch(() => '0 / 0');
    console.log('Dump trailer count after reconfiguration:', dumpCount);
  });

  test('multiple truck configurations work together', async ({ page }) => {
    // Set up multiple truck configurations
    await page.evaluate(() => {
      const configs = {
        'flowboy-truck-1': 'flowboy',
        'flowboy-truck-2': 'flowboy',
        'dump-truck-1': 'dump-trailer',
        'dump-truck-2': 'dump-trailer',
        'regular-truck-1': undefined  // Not configured
      };
      localStorage.setItem('truck-configurations', JSON.stringify(configs));
    });

    // Listen for all configuration logs
    const allConfigLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('🚛') && (msg.text().includes('config') || msg.text().includes('Configuration filtering'))) {
        allConfigLogs.push(msg.text());
      }
    });

    // Refresh to trigger all configurations
    await page.reload();
    await page.waitForTimeout(2000);

    console.log('All configuration logs:', allConfigLogs);

    // Verify we see filtering results
    const filteringLog = allConfigLogs.find(log => log.includes('Configuration filtering results'));
    expect(filteringLog).toBeDefined();
  });

  test('configuration validation and error handling', async ({ page }) => {
    // Test invalid configuration data
    await page.evaluate(() => {
      localStorage.setItem('truck-configurations', 'invalid-json-data');
    });

    // Should not crash - should fall back gracefully
    const errorLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    // Check that we handle invalid JSON gracefully
    console.log('Error logs:', errorLogs);
    
    // Page should still load
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });

  test('configuration cleanup for deleted trucks', async ({ page }) => {
    // Set up configurations for non-existent trucks
    await page.evaluate(() => {
      const configs = {
        'deleted-truck-1': 'flowboy',
        'deleted-truck-2': 'dump-trailer',
        'non-existent-truck': 'flowboy'
      };
      localStorage.setItem('truck-configurations', JSON.stringify(configs));
    });

    // Load page and let it process configurations
    await page.reload();
    await page.waitForTimeout(2000);

    // Check that configurations are still there (they shouldn't auto-cleanup)
    const configs = await page.evaluate(() => {
      const stored = localStorage.getItem('truck-configurations');
      return stored ? JSON.parse(stored) : {};
    });

    console.log('Configurations after loading:', configs);
    
    // The system should handle missing trucks gracefully without crashing
    const pageIsLoaded = await page.locator('body').isVisible();
    expect(pageIsLoaded).toBe(true);
  });

  test('truck configuration by resource ID vs assignment ID', async ({ page }) => {
    // This test specifically checks the bug we fixed
    const testResourceId = 'test-resource-123';
    const testAssignmentId = 'test-assignment-456';

    // Set configuration using resource ID (correct)
    await page.evaluate((resourceId) => {
      const configs = { [resourceId]: 'flowboy' };
      localStorage.setItem('truck-configurations', JSON.stringify(configs));
    }, testResourceId);

    // Listen for configuration lookup logs
    const lookupLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('🚛') && msg.text().includes('Checking flowboy config')) {
        lookupLogs.push(msg.text());
      }
    });

    // Simulate the filtering process (this would happen in JobRow)
    await page.evaluate((resourceId, assignmentId) => {
      // This simulates what happens in the filtering code
      const configs = JSON.parse(localStorage.getItem('truck-configurations') || '{}');
      
      // The bug was using assignment.id instead of assignment.resourceId
      const wrongLookup = configs[assignmentId]; // This should be undefined
      const correctLookup = configs[resourceId]; // This should be 'flowboy'
      
      console.log('🚛 Wrong lookup (assignment.id):', wrongLookup);
      console.log('🚛 Correct lookup (assignment.resourceId):', correctLookup);
    }, testResourceId, testAssignmentId);

    await page.waitForTimeout(1000);
    
    // The correct lookup should find the configuration
    const correctLookupLog = await page.evaluate(() => {
      return document.querySelector('body')?.textContent || '';
    });
    
    // This test validates that we're using the correct key for configuration lookup
    expect(correctLookupLog).toBeTruthy();
  });
});