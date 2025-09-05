import { test } from '@playwright/test';
import { CompactQuickSelectPage } from '../../pages/CompactQuickSelectPage';

test.describe('Debug Magnets', () => {
  let compactQuickSelect: CompactQuickSelectPage;

  test.beforeEach(async ({ page }) => {
    compactQuickSelect = new CompactQuickSelectPage(page);
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
    
    // Wait for data to load
    await page.waitForTimeout(3000);
  });

  test('check what magnets are available', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Check what categories are available
    console.log('Available categories:');
    const categories = await compactQuickSelect.page.locator('[data-testid^="compact-category-"]').all();
    for (let i = 0; i < categories.length; i++) {
      const categoryId = await categories[i].getAttribute('data-testid');
      const text = await categories[i].textContent();
      console.log(`Category ${i}: ${categoryId} - "${text?.trim()}"`);
    }
    
    // Try to navigate to operator category
    try {
      await compactQuickSelect.clickCategory('operator');
      await compactQuickSelect.waitForTransition();
      console.log('Successfully navigated to operator category');
      
      const mode = await compactQuickSelect.getCurrentMode();
      console.log('Current mode:', mode);
      
      if (mode === 'magnets') {
        console.log('Available operator magnets:');
        const magnets = await compactQuickSelect.page.locator('[data-testid^="compact-magnet-operator-"]').all();
        console.log('Found', magnets.length, 'operator magnets');
        
        for (let i = 0; i < magnets.length; i++) {
          const magnetId = await magnets[i].getAttribute('data-testid');
          const text = await magnets[i].textContent();
          console.log(`Magnet ${i}: ${magnetId} - "${text?.trim()}"`);
        }
        
        // Try to drag the first one if it exists
        if (magnets.length > 0) {
          console.log('Attempting to drag first magnet...');
          const firstMagnet = magnets[0];
          const bounds = await firstMagnet.boundingBox();
          
          if (bounds) {
            console.log('Magnet bounds:', bounds);
            
            // Move to magnet and start drag
            await compactQuickSelect.page.mouse.move(
              bounds.x + bounds.width / 2,
              bounds.y + bounds.height / 2
            );
            await compactQuickSelect.page.mouse.down();
            
            // Check if overlay closes
            await compactQuickSelect.page.waitForTimeout(200);
            const overlayVisible = await compactQuickSelect.isVisible();
            console.log('Overlay visible after mousedown:', overlayVisible);
            
            // Check if drag layer appears
            const dragLayer = compactQuickSelect.page.locator('[data-testid="magnet-drag-layer"]');
            const dragLayerVisible = await dragLayer.isVisible();
            console.log('Drag layer visible:', dragLayerVisible);
            
            // Move mouse slightly and check again
            await compactQuickSelect.page.mouse.move(
              bounds.x + bounds.width / 2 + 10,
              bounds.y + bounds.height / 2 + 10
            );
            await compactQuickSelect.page.waitForTimeout(200);
            
            const dragLayerVisibleAfterMove = await dragLayer.isVisible();
            console.log('Drag layer visible after move:', dragLayerVisibleAfterMove);
            
            // Release
            await compactQuickSelect.page.mouse.up();
          }
        }
      } else if (mode === 'subcategory') {
        console.log('Need to select subcategory first');
        const subcategories = await compactQuickSelect.page.locator('[data-testid^="compact-subcategory-"]').all();
        console.log('Available subcategories:', subcategories.length);
        
        if (subcategories.length > 0) {
          // Click first subcategory
          await subcategories[0].click();
          await compactQuickSelect.waitForTransition();
          
          const newMode = await compactQuickSelect.getCurrentMode();
          console.log('Mode after subcategory:', newMode);
          
          if (newMode === 'magnets') {
            const magnets = await compactQuickSelect.page.locator('[data-testid^="compact-magnet-"]').all();
            console.log('Found', magnets.length, 'magnets after subcategory selection');
          }
        }
      }
      
    } catch (error) {
      console.log('Error navigating to operator:', error);
    }
  });
});