import { test, expect } from '@playwright/test';
import { CompactQuickSelectPage } from '../../pages/CompactQuickSelectPage';

test.describe('Compact Quick Select - Drag Preview', () => {
  let compactQuickSelect: CompactQuickSelectPage;

  test.beforeEach(async ({ page }) => {
    compactQuickSelect = new CompactQuickSelectPage(page);
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
    
    // Wait for data to load
    await page.waitForTimeout(3000);
  });

  test('drag preview appears when starting to drag magnet', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to operators
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    expect(await compactQuickSelect.getCurrentMode()).toBe('magnets');
    
    // Start dragging a magnet
    const magnetElement = await compactQuickSelect.getDraggableMagnetByType('operator', 0);
    const magnetBounds = await magnetElement.boundingBox();
    
    if (magnetBounds) {
      // Start drag but don't release
      await compactQuickSelect.page.mouse.move(
        magnetBounds.x + magnetBounds.width / 2, 
        magnetBounds.y + magnetBounds.height / 2
      );
      await compactQuickSelect.page.mouse.down();
      
      // Move slightly to trigger drag
      await compactQuickSelect.page.mouse.move(
        magnetBounds.x + magnetBounds.width / 2 + 5, 
        magnetBounds.y + magnetBounds.height / 2 + 5
      );
      
      // Wait for drag layer to appear
      await compactQuickSelect.page.waitForTimeout(200);
      
      // Check if overlay closed (expected behavior)
      const overlayVisible = await compactQuickSelect.isVisible();
      expect(overlayVisible).toBe(false);
      
      // Check if MagnetDragLayer is visible
      const dragLayer = compactQuickSelect.page.locator('[data-testid="magnet-drag-layer"]');
      await expect(dragLayer).toBeVisible({ timeout: 1000 });
      
      // Release the drag
      await compactQuickSelect.page.mouse.up();
    }
  });

  test('drag preview follows cursor movement', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to operators
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    // Start dragging a magnet
    const magnetElement = await compactQuickSelect.getDraggableMagnetByType('operator', 0);
    const magnetBounds = await magnetElement.boundingBox();
    
    if (magnetBounds) {
      const startX = magnetBounds.x + magnetBounds.width / 2;
      const startY = magnetBounds.y + magnetBounds.height / 2;
      
      // Start drag
      await compactQuickSelect.page.mouse.move(startX, startY);
      await compactQuickSelect.page.mouse.down();
      await compactQuickSelect.page.mouse.move(startX + 5, startY + 5);
      
      // Wait for drag layer to appear
      await compactQuickSelect.page.waitForTimeout(200);
      
      // Move cursor to different positions and check if drag layer follows
      const positions = [
        { x: startX + 100, y: startY + 50 },
        { x: startX + 200, y: startY + 100 },
        { x: startX + 150, y: startY + 200 }
      ];
      
      for (const position of positions) {
        await compactQuickSelect.page.mouse.move(position.x, position.y);
        await compactQuickSelect.page.waitForTimeout(100);
        
        // Check if drag layer is still visible after movement
        const dragLayer = compactQuickSelect.page.locator('[data-testid="magnet-drag-layer"]');
        await expect(dragLayer).toBeVisible();
        
        // Verify drag layer position is near cursor
        const dragLayerBounds = await dragLayer.boundingBox();
        if (dragLayerBounds) {
          // Allow some tolerance for positioning
          const tolerance = 50;
          expect(Math.abs(dragLayerBounds.x - position.x)).toBeLessThan(tolerance);
          expect(Math.abs(dragLayerBounds.y - position.y)).toBeLessThan(tolerance);
        }
      }
      
      // Release the drag
      await compactQuickSelect.page.mouse.up();
      
      // Drag layer should disappear after release
      const dragLayer = compactQuickSelect.page.locator('[data-testid="magnet-drag-layer"]');
      await expect(dragLayer).toBeHidden({ timeout: 1000 });
    }
  });

  test('drag preview shows correct magnet information', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to operators
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    // Get the first magnet's information
    const magnetElement = await compactQuickSelect.getDraggableMagnetByType('operator', 0);
    const originalMagnetText = await magnetElement.textContent();
    const magnetBounds = await magnetElement.boundingBox();
    
    if (magnetBounds && originalMagnetText) {
      // Start drag
      await compactQuickSelect.page.mouse.move(
        magnetBounds.x + magnetBounds.width / 2, 
        magnetBounds.y + magnetBounds.height / 2
      );
      await compactQuickSelect.page.mouse.down();
      await compactQuickSelect.page.mouse.move(
        magnetBounds.x + magnetBounds.width / 2 + 5, 
        magnetBounds.y + magnetBounds.height / 2 + 5
      );
      
      // Wait for drag layer
      await compactQuickSelect.page.waitForTimeout(200);
      
      // Check if drag layer shows the same magnet information
      const dragLayer = compactQuickSelect.page.locator('[data-testid="magnet-drag-layer"]');
      await expect(dragLayer).toBeVisible();
      
      const dragLayerText = await dragLayer.textContent();
      expect(dragLayerText).toContain(originalMagnetText?.trim());
      
      // Release the drag
      await compactQuickSelect.page.mouse.up();
    }
  });

  test('drag preview persists during entire drag operation', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to operators
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    // Start dragging a magnet
    const magnetElement = await compactQuickSelect.getDraggableMagnetByType('operator', 0);
    const magnetBounds = await magnetElement.boundingBox();
    
    if (magnetBounds) {
      const startX = magnetBounds.x + magnetBounds.width / 2;
      const startY = magnetBounds.y + magnetBounds.height / 2;
      
      // Start drag
      await compactQuickSelect.page.mouse.move(startX, startY);
      await compactQuickSelect.page.mouse.down();
      await compactQuickSelect.page.mouse.move(startX + 5, startY + 5);
      
      // Wait for drag layer
      await compactQuickSelect.page.waitForTimeout(200);
      
      const dragLayer = compactQuickSelect.page.locator('[data-testid="magnet-drag-layer"]');
      await expect(dragLayer).toBeVisible();
      
      // Simulate a long drag operation with multiple movements
      const movements = [
        { x: startX + 50, y: startY + 25 },
        { x: startX + 100, y: startY + 50 },
        { x: startX + 150, y: startY + 75 },
        { x: startX + 200, y: startY + 100 },
        { x: startX + 250, y: startY + 125 },
        { x: startX + 300, y: startY + 150 }
      ];
      
      for (let i = 0; i < movements.length; i++) {
        const movement = movements[i];
        await compactQuickSelect.page.mouse.move(movement.x, movement.y);
        await compactQuickSelect.page.waitForTimeout(150);
        
        // Verify drag layer is still visible throughout
        await expect(dragLayer).toBeVisible();
        
        // Log progress for debugging
        console.log(`Movement ${i + 1}/${movements.length}: Drag layer still visible`);
      }
      
      // Hold the drag for a moment at the final position
      await compactQuickSelect.page.waitForTimeout(500);
      await expect(dragLayer).toBeVisible();
      
      // Finally release
      await compactQuickSelect.page.mouse.up();
      
      // Verify drag layer disappears
      await expect(dragLayer).toBeHidden({ timeout: 1000 });
    }
  });

  test('drag preview works with different magnet types', async () => {
    await compactQuickSelect.openQuickSelect();
    
    const categories = [
      { name: 'operator', type: 'operator' },
      { name: 'driver', type: 'driver' },
      { name: 'laborer', type: 'laborer' }
    ];
    
    for (const category of categories) {
      // Navigate to category
      await compactQuickSelect.openQuickSelect();
      await compactQuickSelect.clickCategory(category.name);
      await compactQuickSelect.waitForTransition();
      
      if (await compactQuickSelect.getCurrentMode() === 'magnets') {
        // Try to drag first magnet of this type
        const magnetElement = await compactQuickSelect.getDraggableMagnetByType(category.type, 0);
        const magnetExists = await magnetElement.isVisible().catch(() => false);
        
        if (magnetExists) {
          const magnetBounds = await magnetElement.boundingBox();
          
          if (magnetBounds) {
            // Start drag
            await compactQuickSelect.page.mouse.move(
              magnetBounds.x + magnetBounds.width / 2, 
              magnetBounds.y + magnetBounds.height / 2
            );
            await compactQuickSelect.page.mouse.down();
            await compactQuickSelect.page.mouse.move(
              magnetBounds.x + magnetBounds.width / 2 + 5, 
              magnetBounds.y + magnetBounds.height / 2 + 5
            );
            
            // Check drag layer appears for this magnet type
            await compactQuickSelect.page.waitForTimeout(200);
            const dragLayer = compactQuickSelect.page.locator('[data-testid="magnet-drag-layer"]');
            await expect(dragLayer).toBeVisible();
            
            // Release drag
            await compactQuickSelect.page.mouse.up();
            
            console.log(`✅ Drag preview works for ${category.type}`);
          }
        } else {
          console.log(`⚠️ No ${category.type} magnets available for testing`);
        }
      }
      
      // Close overlay for next iteration
      await compactQuickSelect.page.keyboard.press('Escape');
      await compactQuickSelect.page.waitForTimeout(500);
    }
  });
});