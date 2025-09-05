import { test, expect } from '@playwright/test';
import { CompactQuickSelectPage } from '../../pages/CompactQuickSelectPage';

test.describe('CompactQuickSelect - Shift+Drag Initiation', () => {
  let compactQuickSelect: CompactQuickSelectPage;

  test.beforeEach(async ({ page }) => {
    compactQuickSelect = new CompactQuickSelectPage(page);
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
    
    // Wait for data to load
    await page.waitForTimeout(3000);
  });

  test('should initiate drag when shift key is held during mouse down', async ({ page }) => {
    // Listen for console messages to verify drag initiation
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('DRAG ITEM FUNCTION CALLED') || 
          text.includes('DRAGGING STATE CHANGED') ||
          text.includes('canDrag check') ||
          text.includes('MOUSE DOWN') ||
          text.includes('DRAG START EVENT') ||
          text.includes('Updated shift state') ||
          text.includes('Prevented default')) {
        consoleMessages.push(text);
      }
    });
    
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to operator category
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    // Find any magnet
    const anyMagnet = page.locator('[data-testid^="compact-magnet-operator-"]').first();
    const magnetExists = await anyMagnet.isVisible();
    
    if (magnetExists) {
      const bounds = await anyMagnet.boundingBox();
      
      if (bounds) {
        // Test normal drag initiation first
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.down();
        
        // React DnD requires mouse movement to initiate drag
        await page.mouse.move(bounds.x + bounds.width / 2 + 10, bounds.y + bounds.height / 2 + 10);
        
        await page.waitForTimeout(100);
        
        // Check if normal drag initiated
        const normalDragMessages = consoleMessages.filter(msg => 
          msg.includes('DRAG ITEM FUNCTION CALLED') || msg.includes('DRAGGING STATE CHANGED')
        );
        
        await page.mouse.up();
        
        console.log('Normal drag messages:', normalDragMessages.length);
        
        // Clear messages for shift test
        consoleMessages.length = 0;
        
        await page.waitForTimeout(500);
        
        // Now test shift+drag initiation - use Playwright's modifier in mouse actions
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        
        // Use Playwright's built-in modifier support
        await page.mouse.down({ modifiers: ['Shift'] });
        
        // React DnD requires mouse movement to initiate drag
        await page.mouse.move(bounds.x + bounds.width / 2 + 10, bounds.y + bounds.height / 2 + 10);
        
        await page.waitForTimeout(100);
        
        // Check if shift+drag initiated
        const shiftDragMessages = consoleMessages.filter(msg => 
          msg.includes('DRAG ITEM FUNCTION CALLED') || msg.includes('DRAGGING STATE CHANGED')
        );
        
        console.log('Shift+drag messages:', shiftDragMessages.length);
        console.log('All messages during shift+drag:', consoleMessages);
        
        // The test: both normal drag and shift+drag should initiate successfully
        expect(normalDragMessages.length).toBeGreaterThan(0);
        expect(shiftDragMessages.length).toBeGreaterThan(0);
        
        // Clean up
        await page.mouse.up();
      }
    } else {
      console.log('No magnets found for drag initiation test');
    }
  });

  test('should show drag layer when shift+drag is initiated', async ({ page }) => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to operator category
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    // Find any magnet
    const anyMagnet = page.locator('[data-testid^="compact-magnet-operator-"]').first();
    const magnetExists = await anyMagnet.isVisible();
    
    if (magnetExists) {
      const bounds = await anyMagnet.boundingBox();
      
      if (bounds) {
        // Test shift+drag and check for drag layer
        await page.keyboard.down('Shift');
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width / 2 + 50, bounds.y + bounds.height / 2 + 50);
        
        await page.waitForTimeout(200);
        
        // Check if drag layer is visible
        const dragLayer = page.locator('[data-testid="magnet-drag-layer"]');
        const dragLayerVisible = await dragLayer.isVisible().catch(() => false);
        
        console.log('Drag layer visible during shift+drag:', dragLayerVisible);
        
        // Clean up
        await page.mouse.up();
        await page.keyboard.up('Shift');
        
        // The drag layer should appear during shift+drag
        expect(dragLayerVisible).toBe(true);
      }
    }
  });
});