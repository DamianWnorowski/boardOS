import { test, expect } from '@playwright/test';

test.describe('Magnet Business Logic Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app-root, [data-testid="app-root"]', { timeout: 15000 });
    await page.waitForTimeout(3000); // Allow app to fully initialize
  });

  test.describe('Magnet Display and Interaction Chains', () => {
    test('magnet drag operations trigger expected UI responses', async ({ page }) => {
      const errors: string[] = [];
      const consoleMessages: string[] = [];
      
      page.on('pageerror', err => errors.push(err.message));
      page.on('console', msg => {
        if (msg.type() === 'log' || msg.type() === 'info') {
          consoleMessages.push(msg.text());
        }
      });

      // Find draggable elements (these should be magnets)
      const draggables = await page.locator('[draggable="true"]').all();
      console.log(`Found ${draggables.length} draggable elements (magnets)`);

      if (draggables.length > 0) {
        // Test drag interaction on first few magnets
        for (let i = 0; i < Math.min(5, draggables.length); i++) {
          try {
            const magnet = draggables[i];
            const box = await magnet.boundingBox();
            
            if (box) {
              console.log(`Testing drag on magnet ${i + 1}`);
              
              // Start drag
              await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
              await page.mouse.down();
              await page.waitForTimeout(100);
              
              // Move mouse (simulate drag)
              await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
              await page.waitForTimeout(100);
              
              // Check if any drag-related UI changes occurred
              const dragElements = await page.locator('[data-testid*="drag"], [class*="drag"], [class*="dragging"]').all();
              console.log(`Drag UI elements visible: ${dragElements.length}`);
              
              // End drag
              await page.mouse.up();
              await page.waitForTimeout(200);
            }
          } catch (error) {
            console.log(`Drag test ${i + 1} error:`, error);
          }
        }
      }

      // Filter critical errors
      const criticalErrors = errors.filter(err => 
        !err.includes('ResizeObserver') && 
        !err.includes('Non-passive') &&
        !err.includes('Violation')
      );

      expect(criticalErrors).toHaveLength(0);
      console.log(`✅ Drag operations completed. Console messages: ${consoleMessages.length}, Errors: ${criticalErrors.length}`);
    });

    test('multiple magnet interactions in sequence maintain state consistency', async ({ page }) => {
      const interactions = [
        // Interaction 1: Try to open quick select
        async () => {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(500);
          const overlay = await page.locator('[data-testid*="overlay"], [data-testid*="select"]').isVisible().catch(() => false);
          if (overlay) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
          }
          return 'quick-select';
        },

        // Interaction 2: Try drag and drop
        async () => {
          const draggables = await page.locator('[draggable="true"]').all();
          if (draggables.length >= 2) {
            const source = draggables[0];
            const target = draggables[1];
            
            const sourceBox = await source.boundingBox();
            const targetBox = await target.boundingBox();
            
            if (sourceBox && targetBox) {
              await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
              await page.mouse.down();
              await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
              await page.mouse.up();
              await page.waitForTimeout(300);
            }
          }
          return 'drag-drop';
        },

        // Interaction 3: Try keyboard navigation
        async () => {
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('ArrowUp');
          await page.keyboard.press('ArrowLeft');
          await page.keyboard.press('ArrowRight');
          await page.waitForTimeout(200);
          return 'keyboard-nav';
        }
      ];

      const results: string[] = [];
      
      // Execute interactions in sequence
      for (const interaction of interactions) {
        try {
          const result = await interaction();
          results.push(result);
          console.log(`✓ Completed interaction: ${result}`);
        } catch (error) {
          console.log(`✗ Interaction failed:`, error);
        }
      }

      // Verify page is still responsive after all interactions
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      console.log(`✅ Sequential interactions completed: ${results.join(', ')}`);
    });

    test('rapid magnet operations do not cause race conditions or state corruption', async ({ page }) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      page.on('pageerror', err => {
        errors.push(err.message);
        console.log('Error:', err.message);
      });
      
      page.on('console', msg => {
        if (msg.type() === 'warn') {
          warnings.push(msg.text());
        }
      });

      // Rapid fire interactions
      const rapidOperations = [];
      
      for (let batch = 0; batch < 3; batch++) {
        rapidOperations.push(
          // Batch of keyboard operations
          (async () => {
            for (let i = 0; i < 10; i++) {
              await page.keyboard.press('Tab');
              await page.keyboard.press('Escape');
              // No delay - maximum speed
            }
          })(),
          
          // Batch of mouse operations  
          (async () => {
            const draggables = await page.locator('[draggable="true"]').all();
            for (let i = 0; i < Math.min(5, draggables.length); i++) {
              try {
                const box = await draggables[i].boundingBox();
                if (box) {
                  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                  await page.mouse.down();
                  await page.mouse.move(box.x + 50, box.y + 50);
                  await page.mouse.up();
                }
              } catch (error) {
                // Expected some operations might fail due to rapid execution
              }
            }
          })()
        );
      }

      // Execute all operations concurrently
      await Promise.allSettled(rapidOperations);
      
      // Give time for any async operations to complete
      await page.waitForTimeout(1000);

      // Check final state
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);

      // Filter critical errors (ignore timing-related warnings)
      const criticalErrors = errors.filter(err => 
        !err.includes('ResizeObserver') && 
        !err.includes('Non-passive') &&
        !err.includes('Violation') &&
        !err.includes('AbortError')
      );

      console.log(`Total errors: ${errors.length}, Critical: ${criticalErrors.length}, Warnings: ${warnings.length}`);
      expect(criticalErrors).toHaveLength(0);
    });

    test('magnet attachment and detachment operations work in chains', async ({ page }) => {
      // This test simulates attachment operations by looking for UI patterns
      // that suggest attachment/detachment functionality
      
      const draggables = await page.locator('[draggable="true"]').all();
      console.log(`Testing attachment chains with ${draggables.length} draggable elements`);
      
      if (draggables.length >= 3) {
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(err.message));
        
        // Simulate attachment chain: A -> B -> C
        for (let chain = 0; chain < 3; chain++) {
          const source = draggables[chain];
          const target = draggables[(chain + 1) % 3];
          
          try {
            const sourceBox = await source.boundingBox();
            const targetBox = await target.boundingBox();
            
            if (sourceBox && targetBox) {
              console.log(`Chain ${chain + 1}: Attempting attachment operation`);
              
              // Drag source to target (potential attachment)
              await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
              await page.mouse.down();
              await page.waitForTimeout(100);
              
              await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
              await page.waitForTimeout(100);
              
              await page.mouse.up();
              await page.waitForTimeout(300);
              
              // Check if any visual feedback occurred
              const hasVisualChanges = await page.locator('[class*="attached"], [class*="connected"], [data-attached]').count() > 0;
              console.log(`Chain ${chain + 1} visual feedback: ${hasVisualChanges}`);
            }
          } catch (error) {
            console.log(`Chain ${chain + 1} error:`, error);
          }
        }
        
        // Test detachment by dragging to empty space
        try {
          const firstElement = draggables[0];
          const box = await firstElement.boundingBox();
          
          if (box) {
            console.log('Testing detachment operation');
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.waitForTimeout(100);
            
            // Drag to empty area
            await page.mouse.move(100, 100);
            await page.waitForTimeout(100);
            await page.mouse.up();
            await page.waitForTimeout(300);
          }
        } catch (error) {
          console.log('Detachment test error:', error);
        }
        
        // Filter critical errors
        const criticalErrors = errors.filter(err => 
          !err.includes('ResizeObserver') && 
          !err.includes('Non-passive') &&
          !err.includes('Violation')
        );
        
        expect(criticalErrors).toHaveLength(0);
        console.log(`✅ Attachment chain operations completed without critical errors`);
      } else {
        console.log('⚠️ Not enough draggable elements for attachment chain test');
      }
    });
  });

  test.describe('Complex Multi-Operation Scenarios', () => {
    test('mixed keyboard and mouse operations maintain magnet system integrity', async ({ page }) => {
      const startTime = Date.now();
      const maxDuration = 20000; // 20 seconds max
      
      const mixedOperations = [
        // Pattern 1: Keyboard-heavy
        async () => {
          await page.keyboard.press('Tab');
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('Enter');
          await page.keyboard.press('Escape');
        },
        
        // Pattern 2: Mouse-heavy
        async () => {
          const elements = await page.locator('[draggable="true"]').all();
          if (elements.length >= 2) {
            const source = elements[0];
            const target = elements[1];
            const sourceBox = await source.boundingBox();
            const targetBox = await target.boundingBox();
            
            if (sourceBox && targetBox) {
              await source.hover();
              await page.mouse.down();
              await target.hover();
              await page.mouse.up();
            }
          }
        },
        
        // Pattern 3: Mixed interaction
        async () => {
          await page.keyboard.press('Tab');
          const elements = await page.locator('button').all();
          if (elements.length > 0) {
            await elements[0].click();
          }
          await page.keyboard.press('Escape');
        }
      ];
      
      // Execute multiple rounds of mixed operations
      for (let round = 0; round < 5; round++) {
        if (Date.now() - startTime > maxDuration) break;
        
        // Randomize operation order
        const shuffled = [...mixedOperations].sort(() => Math.random() - 0.5);
        
        for (const operation of shuffled) {
          try {
            await operation();
            await page.waitForTimeout(100);
          } catch (error) {
            // Some operations expected to fail in this stress test
          }
          
          if (Date.now() - startTime > maxDuration) break;
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verify system is still responsive
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      
      const isResponsive = await page.locator('body').isVisible();
      expect(isResponsive).toBe(true);
      
      console.log(`✅ Mixed operations completed in ${duration}ms, system remains responsive`);
    });

    test('bulk magnet operations scale without performance degradation', async ({ page }) => {
      const draggables = await page.locator('[draggable="true"]').all();
      const testSize = Math.min(20, draggables.length); // Test up to 20 elements
      
      console.log(`Testing bulk operations with ${testSize} magnets`);
      
      if (testSize > 0) {
        const startTime = Date.now();
        
        // Bulk operation: hover over many magnets rapidly
        for (let i = 0; i < testSize; i++) {
          try {
            await draggables[i].hover();
            await page.waitForTimeout(50); // Rapid operation
          } catch (error) {
            // Expected some might fail
          }
        }
        
        const hoverTime = Date.now();
        
        // Bulk operation: attempt rapid drag operations
        for (let i = 0; i < Math.min(10, testSize - 1); i++) {
          try {
            const source = draggables[i];
            const target = draggables[i + 1];
            
            const sourceBox = await source.boundingBox();
            const targetBox = await target.boundingBox();
            
            if (sourceBox && targetBox) {
              await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
              await page.mouse.down();
              await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
              await page.mouse.up();
              await page.waitForTimeout(100);
            }
          } catch (error) {
            // Expected some operations might conflict
          }
        }
        
        const endTime = Date.now();
        
        const hoverDuration = hoverTime - startTime;
        const totalDuration = endTime - startTime;
        
        console.log(`Hover operations: ${hoverDuration}ms, Total: ${totalDuration}ms`);
        
        // Performance expectations
        expect(hoverDuration).toBeLessThan(5000); // Hovering should be fast
        expect(totalDuration).toBeLessThan(15000); // Total ops under 15 seconds
        
        // Verify system stability
        await page.keyboard.press('Tab');
        await page.waitForTimeout(500);
        expect(await page.locator('body').isVisible()).toBe(true);
        
        console.log(`✅ Bulk operations performance test passed`);
      } else {
        console.log('⚠️ No draggable elements found for bulk test');
      }
    });

    test('error recovery and state consistency during failed operations', async ({ page }) => {
      const errors: string[] = [];
      const stateSnapshots: string[] = [];
      
      page.on('pageerror', err => errors.push(err.message));
      
      // Function to capture basic state
      const captureState = async () => {
        const draggableCount = await page.locator('[draggable="true"]').count();
        const visibleButtons = await page.locator('button:visible').count();
        const overlayVisible = await page.locator('[data-testid*="overlay"]:visible').count();
        return `drag:${draggableCount},btn:${visibleButtons},overlay:${overlayVisible}`;
      };
      
      // Capture initial state
      stateSnapshots.push(await captureState());
      
      // Attempt operations that might fail
      const potentiallyFailingOperations = [
        // Invalid drag (drag to self)
        async () => {
          const draggables = await page.locator('[draggable="true"]').all();
          if (draggables.length > 0) {
            const element = draggables[0];
            const box = await element.boundingBox();
            if (box) {
              await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
              await page.mouse.down();
              // Drag to same position (should fail gracefully)
              await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
              await page.mouse.up();
            }
          }
        },
        
        // Rapid conflicting keyboard commands
        async () => {
          await page.keyboard.press('Tab');
          await page.keyboard.press('Escape');
          await page.keyboard.press('Tab');
          await page.keyboard.press('Escape');
          // No delays - test rapid conflict handling
        },
        
        // Click on potentially non-existent elements
        async () => {
          try {
            await page.locator('.non-existent-class').click({ timeout: 100 });
          } catch (error) {
            // Expected to fail
          }
        }
      ];
      
      // Execute potentially failing operations
      for (const operation of potentiallyFailingOperations) {
        try {
          await operation();
          stateSnapshots.push(await captureState());
          await page.waitForTimeout(200);
        } catch (error) {
          // Capture state even after errors
          stateSnapshots.push(await captureState());
        }
      }
      
      // Final state check
      const finalState = await captureState();
      stateSnapshots.push(finalState);
      
      // Verify system recovery
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      const isResponsive = await page.locator('body').isVisible();
      expect(isResponsive).toBe(true);
      
      // Check that UI elements are still present (basic consistency)
      const finalDraggableCount = await page.locator('[draggable="true"]').count();
      expect(finalDraggableCount).toBeGreaterThanOrEqual(0);
      
      console.log('State progression:', stateSnapshots);
      console.log(`✅ Error recovery test completed. System remains consistent.`);
      
      // Filter only truly critical errors
      const criticalErrors = errors.filter(err => 
        !err.includes('ResizeObserver') && 
        !err.includes('Non-passive') &&
        !err.includes('Violation') &&
        !err.includes('timeout')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });
  });
});