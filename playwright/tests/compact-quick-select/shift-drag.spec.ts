import { test, expect } from '@playwright/test';
import { CompactQuickSelectPage } from '../../pages/CompactQuickSelectPage';

test.describe('CompactQuickSelect - Shift+Drag Functionality', () => {
  let compactQuickSelect: CompactQuickSelectPage;

  test.beforeEach(async ({ page }) => {
    compactQuickSelect = new CompactQuickSelectPage(page);
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
    
    // Wait for data to load
    await page.waitForTimeout(3000);
  });

  test('should detect shift key during drag for unassigned magnet', async ({ page }) => {
    // Listen for console messages to verify shift detection
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('DRAG ITEM FUNCTION CALLED') || text.includes('Shift held:')) {
        consoleMessages.push(text);
      }
    });
    
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to operator category
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    // Find an unassigned magnet (no ASSIGNED or MULTI badge)
    const allMagnets = page.locator('[data-testid^="compact-magnet-operator-"]');
    const magnetCount = await allMagnets.count();
    
    let unassignedMagnet = null;
    for (let i = 0; i < magnetCount; i++) {
      const magnet = allMagnets.nth(i);
      const hasAssignedBadge = await magnet.locator('text=ASSIGNED').isVisible().catch(() => false);
      const hasMultiBadge = await magnet.locator('text=MULTI').isVisible().catch(() => false);
      
      if (!hasAssignedBadge && !hasMultiBadge) {
        unassignedMagnet = magnet;
        break;
      }
    }
    
    if (unassignedMagnet) {
      const bounds = await unassignedMagnet.boundingBox();
      
      if (bounds) {
        // Perform shift+drag
        await page.keyboard.down('Shift');
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width / 2 + 10, bounds.y + bounds.height / 2 + 10);
        
        await page.waitForTimeout(300);
        
        // Check if shift was detected
        const shiftDetectedMessages = consoleMessages.filter(msg => 
          msg.includes('Shift held: true')
        );
        
        expect(shiftDetectedMessages.length).toBeGreaterThan(0);
        console.log('✓ Shift key detected during drag');
        
        // Clean up
        await page.mouse.up();
        await page.keyboard.up('Shift');
      }
    } else {
      console.log('No unassigned magnets found for shift+drag test');
    }
  });

  test('should detect shift key during drag for assigned magnet', async ({ page }) => {
    // Listen for console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('DRAG ITEM FUNCTION CALLED') || text.includes('Shift held:')) {
        consoleMessages.push(text);
      }
    });
    
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to operator category
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    // Find an assigned magnet (has ASSIGNED badge)
    const assignedMagnets = page.locator('[data-testid^="compact-magnet-operator-"]').filter({
      has: page.locator('text=ASSIGNED')
    });
    
    const assignedCount = await assignedMagnets.count();
    
    if (assignedCount > 0) {
      const assignedMagnet = assignedMagnets.first();
      const bounds = await assignedMagnet.boundingBox();
      
      if (bounds) {
        // Perform shift+drag
        await page.keyboard.down('Shift');
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width / 2 + 10, bounds.y + bounds.height / 2 + 10);
        
        await page.waitForTimeout(300);
        
        // Check if shift was detected
        const shiftDetectedMessages = consoleMessages.filter(msg => 
          msg.includes('Shift held: true')
        );
        
        expect(shiftDetectedMessages.length).toBeGreaterThan(0);
        console.log('✓ Shift key detected during drag of assigned magnet');
        
        // Clean up
        await page.mouse.up();
        await page.keyboard.up('Shift');
      }
    } else {
      console.log('No assigned magnets found for shift+drag test');
    }
  });

  test('should not detect shift key during normal drag', async ({ page }) => {
    // Listen for console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('DRAG ITEM FUNCTION CALLED') || text.includes('Shift held:')) {
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
        // Perform normal drag (without shift)
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width / 2 + 10, bounds.y + bounds.height / 2 + 10);
        
        await page.waitForTimeout(300);
        
        // Check that shift was NOT detected
        const shiftDetectedMessages = consoleMessages.filter(msg => 
          msg.includes('Shift held: true')
        );
        const normalDragMessages = consoleMessages.filter(msg => 
          msg.includes('Shift held: false')
        );
        
        expect(shiftDetectedMessages.length).toBe(0);
        expect(normalDragMessages.length).toBeGreaterThan(0);
        console.log('✓ Normal drag detected (no shift key)');
        
        // Clean up
        await page.mouse.up();
      }
    }
  });
});