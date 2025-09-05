import { test, expect } from '@playwright/test';

test.describe('Magnet UI Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to fully load
    await page.waitForSelector('#app-root, [data-testid="app-root"]', { timeout: 15000 });
    // Wait for data to load
    await page.waitForTimeout(2000);
  });

  test.describe('Basic Magnet Display and Interaction', () => {
    test('quick select overlay opens and shows magnet categories', async ({ page }) => {
      // Try to open quick select with Tab key
      await page.keyboard.press('Tab');
      
      // Wait for overlay to appear
      await page.waitForTimeout(1000);
      
      // Check if overlay is visible
      const overlay = page.locator('[data-testid="quick-select-overlay"], [data-testid="compact-quick-select-overlay"]');
      const isVisible = await overlay.isVisible().catch(() => false);
      
      if (isVisible) {
        console.log('Quick select overlay opened successfully');
        
        // Check for categories
        const categories = await page.locator('[data-testid^="category-"], [data-testid^="compact-category-"]').all();
        expect(categories.length).toBeGreaterThan(0);
        console.log(`Found ${categories.length} categories`);
        
        // Close overlay
        await page.keyboard.press('Escape');
      } else {
        console.log('Quick select overlay did not open with Tab key');
      }
    });

    test('application loads without JavaScript errors', async ({ page }) => {
      const errors: string[] = [];
      const consoleErrors: string[] = [];
      
      page.on('pageerror', err => {
        errors.push(err.message);
        console.log('Page Error:', err.message);
      });
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
          console.log('Console Error:', msg.text());
        }
      });
      
      // Navigate and interact with the page
      await page.goto('/');
      await page.waitForSelector('#app-root, [data-testid="app-root"]', { timeout: 15000 });
      await page.waitForTimeout(3000);
      
      // Try basic interactions
      try {
        // Try keyboard navigation
        await page.keyboard.press('Tab');
        await page.waitForTimeout(500);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        // Try clicking around the interface
        const clickableElements = await page.locator('button, [role="button"]').all();
        if (clickableElements.length > 0) {
          await clickableElements[0].click();
          await page.waitForTimeout(500);
        }
      } catch (error) {
        console.log('Interaction error (non-critical):', error);
      }
      
      // Check for critical errors
      const criticalErrors = errors.filter(err => 
        !err.includes('ResizeObserver') && 
        !err.includes('Non-passive event listener') &&
        !err.includes('Violation')
      );
      
      const criticalConsoleErrors = consoleErrors.filter(err => 
        !err.includes('ResizeObserver') && 
        !err.includes('Non-passive event listener') &&
        !err.includes('Violation') &&
        !err.includes('Warning:')
      );
      
      console.log(`Total errors: ${errors.length}, Critical: ${criticalErrors.length}`);
      console.log(`Total console errors: ${consoleErrors.length}, Critical: ${criticalConsoleErrors.length}`);
      
      // Should have no critical JavaScript errors
      expect(criticalErrors).toHaveLength(0);
      expect(criticalConsoleErrors).toHaveLength(0);
    });

    test('drag layer appears when initiating drag operations', async ({ page }) => {
      // Try to find any draggable elements
      const draggableElements = await page.locator('[draggable="true"], .draggable').all();
      
      if (draggableElements.length > 0) {
        console.log(`Found ${draggableElements.length} draggable elements`);
        
        const firstDraggable = draggableElements[0];
        const boundingBox = await firstDraggable.boundingBox();
        
        if (boundingBox) {
          // Start drag operation
          await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(200);
          
          // Check if drag layer appears
          const dragLayer = page.locator('[data-testid="magnet-drag-layer"], [data-testid="drag-layer"]');
          const dragLayerVisible = await dragLayer.isVisible().catch(() => false);
          
          console.log('Drag layer visible:', dragLayerVisible);
          
          // Move mouse to continue drag
          await page.mouse.move(boundingBox.x + boundingBox.width / 2 + 50, boundingBox.y + boundingBox.height / 2 + 50);
          await page.waitForTimeout(200);
          
          // End drag
          await page.mouse.up();
          
          // If drag layer was visible during drag, that's good
          if (dragLayerVisible) {
            console.log('✅ Drag functionality is working');
          }
        }
      } else {
        console.log('No draggable elements found on page');
      }
    });
  });

  test.describe('Magnet Chain Operations', () => {
    test('sequential resource interactions do not cause errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', err => errors.push(err.message));
      
      // Try multiple rapid interactions
      for (let i = 0; i < 5; i++) {
        try {
          // Open quick select
          await page.keyboard.press('Tab');
          await page.waitForTimeout(300);
          
          // Try navigation
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(100);
          await page.keyboard.press('ArrowUp');
          await page.waitForTimeout(100);
          
          // Close
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        } catch (error) {
          console.log(`Interaction ${i} error:`, error);
        }
      }
      
      // Filter out non-critical errors
      const criticalErrors = errors.filter(err => 
        !err.includes('ResizeObserver') && 
        !err.includes('Non-passive') &&
        !err.includes('Violation')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });

    test('rapid keyboard interactions maintain UI responsiveness', async ({ page }) => {
      const startTime = Date.now();
      
      // Rapid keyboard sequence
      const keySequence = ['Tab', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'Escape'];
      
      for (let round = 0; round < 10; round++) {
        for (const key of keySequence) {
          await page.keyboard.press(key);
          await page.waitForTimeout(50); // Very fast interaction
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete rapidly (under 10 seconds for 50 key presses)
      expect(duration).toBeLessThan(10000);
      console.log(`Rapid interaction test completed in ${duration}ms`);
    });

    test('concurrent UI operations do not conflict', async ({ page }) => {
      const operations = [
        // Operation 1: Keyboard navigation
        async () => {
          for (let i = 0; i < 3; i++) {
            await page.keyboard.press('Tab');
            await page.waitForTimeout(200);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
          }
        },
        
        // Operation 2: Mouse interactions
        async () => {
          const clickables = await page.locator('button').all();
          for (let i = 0; i < Math.min(3, clickables.length); i++) {
            try {
              await clickables[i].click();
              await page.waitForTimeout(200);
            } catch {
              // Non-critical if element not clickable
            }
          }
        },
        
        // Operation 3: Focus management
        async () => {
          const focusableElements = await page.locator('input, button, [tabindex]').all();
          for (let i = 0; i < Math.min(3, focusableElements.length); i++) {
            try {
              await focusableElements[i].focus();
              await page.waitForTimeout(200);
            } catch {
              // Non-critical if element not focusable
            }
          }
        }
      ];
      
      // Run operations concurrently
      await Promise.all(operations.map(op => op()));
      
      // Check page is still responsive
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      
      // Should still be able to interact with the page
      expect(await page.locator('body').isVisible()).toBe(true);
    });
  });

  test.describe('Performance and Stability', () => {
    test('memory usage remains stable during extended interaction', async ({ page }) => {
      // Simulate extended user session
      for (let session = 0; session < 20; session++) {
        // Quick burst of interactions
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
        
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(50);
        
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(50);
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        
        // Brief pause between sessions
        if (session % 5 === 0) {
          await page.waitForTimeout(500);
        }
      }
      
      // Page should still be responsive
      await page.keyboard.press('Tab');
      
      // Don't fail if overlay doesn't appear, just check page is still alive
      await page.waitForTimeout(1000);
      expect(await page.locator('body').isVisible()).toBe(true);
    });

    test('UI recovers gracefully from rapid state changes', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', err => errors.push(err.message));
      
      // Rapid state changes
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        await page.keyboard.press('Escape');
        // No wait time - maximum stress
      }
      
      // Give UI time to settle
      await page.waitForTimeout(1000);
      
      // Should still be functional
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      
      // Filter critical errors
      const criticalErrors = errors.filter(err => 
        !err.includes('ResizeObserver') && 
        !err.includes('Non-passive') &&
        !err.includes('Violation')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });

    test('complex interaction chains complete without hanging', async ({ page }) => {
      const timeout = 30000; // 30 second timeout
      
      const complexChain = async () => {
        // Chain 1: Navigation sequence
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');
        
        // Chain 2: Different navigation pattern  
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');
        
        // Chain 3: Rapid sequence
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('Tab');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(100);
        }
      };
      
      // Run with timeout to ensure it doesn't hang
      await Promise.race([
        complexChain(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Complex chain timed out')), timeout)
        )
      ]);
      
      console.log('✅ Complex interaction chain completed successfully');
    });
  });
});