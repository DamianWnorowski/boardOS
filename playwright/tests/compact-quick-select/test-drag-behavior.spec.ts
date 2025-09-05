import { test, expect } from '@playwright/test';
import { CompactQuickSelectPage } from '../../pages/CompactQuickSelectPage';

test.describe('Test Drag Behavior Fix', () => {
  let compactQuickSelect: CompactQuickSelectPage;

  test.beforeEach(async ({ page }) => {
    compactQuickSelect = new CompactQuickSelectPage(page);
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
    
    // Wait for data to load
    await page.waitForTimeout(3000);
  });

  test('press and hold should activate drag and show console messages', async ({ page }) => {
    // Listen for console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log('BROWSER CONSOLE:', text);
    });
    
    await compactQuickSelect.openQuickSelect();
    console.log('✅ Overlay opened');
    
    // Navigate to operator category  
    await compactQuickSelect.clickCategory('operator');
    console.log('✅ Clicked operator category');
    
    await page.waitForTimeout(500);
    
    // Check if overlay is still visible
    const overlayVisible = await compactQuickSelect.isVisible();
    console.log('Overlay visible after category click:', overlayVisible);
    
    if (overlayVisible) {
      // Find first operator magnet
      const firstMagnet = page.locator('[data-testid="compact-magnet-operator-0"]').first();
      const magnetVisible = await firstMagnet.isVisible();
      console.log('First magnet visible:', magnetVisible);
      
      if (magnetVisible) {
        const bounds = await firstMagnet.boundingBox();
        console.log('✅ Magnet bounds:', bounds);
        
        if (bounds) {
          console.log('🎯 Starting press and hold test...');
          
          // Move to the magnet center
          await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          
          // Press down and HOLD (don't release immediately)
          await page.mouse.down();
          console.log('✅ Mouse pressed down');
          
          // Wait a moment to see if drag starts
          await page.waitForTimeout(100);
          
          // Move mouse slightly to trigger drag
          await page.mouse.move(bounds.x + bounds.width / 2 + 5, bounds.y + bounds.height / 2 + 5);
          console.log('✅ Mouse moved slightly while holding');
          
          // Wait for drag to process
          await page.waitForTimeout(300);
          
          // Check console messages for drag activation
          const dragStartMessages = consoleMessages.filter(msg => 
            msg.includes('🎯 Drag starting for:') || 
            msg.includes('🎯 handleDragStart called')
          );
          
          console.log('Found drag messages:', dragStartMessages.length);
          dragStartMessages.forEach(msg => console.log('  -', msg));
          
          // Check if overlay closed (which indicates drag started)
          const overlayClosedAfterDrag = !(await compactQuickSelect.isVisible());
          console.log('✅ Overlay closed after drag start:', overlayClosedAfterDrag);
          
          // Check if drag layer is visible
          const dragLayer = page.locator('[data-testid="magnet-drag-layer"]');
          const dragLayerVisible = await dragLayer.isVisible();
          console.log('✅ Drag layer visible:', dragLayerVisible);
          
          // Release the mouse
          await page.mouse.up();
          console.log('✅ Mouse released');
          
          // Verify drag worked
          expect(dragStartMessages.length).toBeGreaterThan(0);
          expect(overlayClosedAfterDrag).toBe(true);
          
        } else {
          throw new Error('Could not get magnet bounds');
        }
      } else {
        throw new Error('First magnet not visible');
      }
    } else {
      throw new Error('Overlay not visible after category click');
    }
  });
});