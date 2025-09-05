import { test, expect } from '@playwright/test';
import { CompactQuickSelectPage } from '../../pages/CompactQuickSelectPage';

test.describe('Simple Drag Test', () => {
  let compactQuickSelect: CompactQuickSelectPage;

  test.beforeEach(async ({ page }) => {
    compactQuickSelect = new CompactQuickSelectPage(page);
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
    
    // Wait for data to load
    await page.waitForTimeout(3000);
  });

  test('test drag behavior with console logging', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => console.log('CONSOLE:', msg.text()));
    
    await compactQuickSelect.openQuickSelect();
    console.log('Overlay opened');
    
    // Navigate to operator category
    await compactQuickSelect.clickCategory('operator');
    console.log('Clicked operator category');
    
    // Add a small wait
    await page.waitForTimeout(1000);
    
    // Check if overlay is still visible
    const overlayVisible = await compactQuickSelect.isVisible();
    console.log('Overlay visible after category click:', overlayVisible);
    
    if (overlayVisible) {
      // Try to find and drag first operator magnet
      const firstMagnet = page.locator('[data-testid="compact-magnet-operator-0"]').first();
      const magnetVisible = await firstMagnet.isVisible();
      console.log('First magnet visible:', magnetVisible);
      
      if (magnetVisible) {
        const bounds = await firstMagnet.boundingBox();
        console.log('Magnet bounds:', bounds);
        
        if (bounds) {
          console.log('Starting drag operation...');
          
          // Move to the magnet
          await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          console.log('Moved to magnet center');
          
          // Press down
          await page.mouse.down();
          console.log('Mouse down');
          
          // Check overlay status
          await page.waitForTimeout(200);
          const overlayAfterMouseDown = await compactQuickSelect.isVisible();
          console.log('Overlay visible after mouse down:', overlayAfterMouseDown);
          
          // Move mouse slightly to trigger drag layer
          await page.mouse.move(bounds.x + bounds.width / 2 + 10, bounds.y + bounds.height / 2 + 10);
          console.log('Moved mouse slightly');
          
          await page.waitForTimeout(300);
          
          // Check drag layer
          const dragLayer = page.locator('[data-testid="magnet-drag-layer"]');
          const dragLayerVisible = await dragLayer.isVisible();
          console.log('Drag layer visible:', dragLayerVisible);
          
          // Check overlay again
          const overlayAfterMove = await compactQuickSelect.isVisible();
          console.log('Overlay visible after move:', overlayAfterMove);
          
          // Add assertions to make test pass/fail properly
          expect(overlayAfterMouseDown).toBe(false); // Overlay should close when drag starts
          expect(dragLayerVisible).toBe(true); // Drag layer should be visible
          
          // Release
          await page.mouse.up();
          console.log('Mouse released');
        }
      }
    }
  });
});