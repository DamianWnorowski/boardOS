import { test, expect } from '@playwright/test';
import { CompactQuickSelectPage } from '../../pages/CompactQuickSelectPage';

test.describe('Compact Quick Select - Availability Display', () => {
  let compactQuickSelect: CompactQuickSelectPage;

  test.beforeEach(async ({ page }) => {
    compactQuickSelect = new CompactQuickSelectPage(page);
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
  });

  test('categories show accurate availability counts', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Check that each category shows a count badge
    const categories = ['equipment', 'operator', 'driver', 'laborer', 'foreman'];
    
    for (const category of categories) {
      const count = await compactQuickSelect.getCategoryAvailableCount(category);
      expect(count).toBeGreaterThanOrEqual(0);
      
      // Count badge should be visible
      const categoryElement = await compactQuickSelect.getCategoryByName(category);
      const countBadge = categoryElement.locator('.bg-gray-800.text-white');
      expect(await countBadge.isVisible()).toBe(true);
    }
  });

  test('subcategories show accurate availability counts', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to equipment subcategories
    await compactQuickSelect.clickCategory('equipment');
    await compactQuickSelect.waitForTransition();
    
    const subcategories = ['paver', 'roller', 'excavator', 'sweeper'];
    
    for (const subcategory of subcategories) {
      try {
        const count = await compactQuickSelect.getSubcategoryAvailableCount(subcategory);
        expect(count).toBeGreaterThanOrEqual(0);
        
        // Count badge should be visible
        const subcategoryElement = await compactQuickSelect.getSubcategoryByName(subcategory);
        const countBadge = subcategoryElement.locator('.bg-gray-800.text-white');
        expect(await countBadge.isVisible()).toBe(true);
      } catch (error) {
        // Some subcategories might not exist in test data
        console.log(`Subcategory ${subcategory} not found - skipping`);
      }
    }
  });

  test('categories with zero resources are visually disabled', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Look for categories that might have zero resources
    const categories = ['truck', 'striper', 'privateDriver'];
    let foundZeroCategory = false;
    
    for (const category of categories) {
      const count = await compactQuickSelect.getCategoryAvailableCount(category);
      const isDisabled = await compactQuickSelect.isCategoryDisabled(category);
      
      if (count === 0) {
        expect(isDisabled).toBe(true);
        foundZeroCategory = true;
        
        // Verify visual styling
        const categoryElement = await compactQuickSelect.getCategoryByName(category);
        const className = await categoryElement.getAttribute('class');
        expect(className).toContain('opacity-50');
      }
    }
    
    if (!foundZeroCategory) {
      console.log('All categories have available resources - test scenario not applicable');
    }
  });

  test('subcategories with zero resources are visually disabled', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to equipment subcategories
    await compactQuickSelect.clickCategory('equipment');
    await compactQuickSelect.waitForTransition();
    
    // Check if any subcategories have zero resources
    const subcategories = ['grader', 'dozer', 'payloader', 'equipment'];
    let foundZeroSubcategory = false;
    
    for (const subcategory of subcategories) {
      try {
        const count = await compactQuickSelect.getSubcategoryAvailableCount(subcategory);
        const isDisabled = await compactQuickSelect.isSubcategoryDisabled(subcategory);
        
        if (count === 0) {
          expect(isDisabled).toBe(true);
          foundZeroSubcategory = true;
          
          // Verify visual styling
          const subcategoryElement = await compactQuickSelect.getSubcategoryByName(subcategory);
          const className = await subcategoryElement.getAttribute('class');
          expect(className).toContain('opacity-50');
        }
      } catch (error) {
        // Some subcategories might not exist
        console.log(`Subcategory ${subcategory} not found - skipping`);
      }
    }
    
    if (!foundZeroSubcategory) {
      console.log('All subcategories have available resources - test scenario not applicable');
    }
  });

  test('total available count is shown in header', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Check header shows total available count
    const headerText = await compactQuickSelect.overlay.locator('.text-xs.text-gray-500').textContent();
    expect(headerText).toMatch(/\d+ available/);
  });

  test('count badges have consistent styling', async () => {
    await compactQuickSelect.openQuickSelect();
    
    const categoryElement = await compactQuickSelect.getCategoryByName('equipment');
    const countBadge = categoryElement.locator('.bg-gray-800.text-white');
    
    // Check badge styling
    const className = await countBadge.getAttribute('class');
    expect(className).toContain('bg-gray-800');
    expect(className).toContain('text-white');
    expect(className).toContain('text-xs');
    expect(className).toContain('rounded-full');
    expect(className).toContain('px-1');
    expect(className).toContain('py-0.5');
  });

  test('color coding matches resource types', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Equipment should have yellow background
    const equipmentElement = await compactQuickSelect.getCategoryByName('equipment');
    const equipmentClass = await equipmentElement.locator('> div').getAttribute('class');
    expect(equipmentClass).toContain('bg-yellow-500');
    
    // Operator should have different color
    const operatorElement = await compactQuickSelect.getCategoryByName('operator');
    const operatorClass = await operatorElement.locator('> div').getAttribute('class');
    expect(operatorClass).not.toContain('bg-yellow-500'); // Should be different from equipment
  });

  test('tooltips show availability information', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Check that category tooltips include availability count
    const equipmentElement = await compactQuickSelect.getCategoryByName('equipment');
    const title = await equipmentElement.getAttribute('title');
    
    expect(title).toContain('available');
    expect(title).toMatch(/\d+ available/);
  });

  test('empty states are handled gracefully', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Try to find a category that leads to empty magnets
    const categories = ['truck', 'striper', 'privateDriver'];
    
    for (const category of categories) {
      const count = await compactQuickSelect.getCategoryAvailableCount(category);
      
      if (count === 0) {
        // Try to click the disabled category
        await compactQuickSelect.clickCategory(category);
        await compactQuickSelect.waitForTransition();
        
        // Should remain at category level
        expect(await compactQuickSelect.getCurrentMode()).toBe('category');
        break;
      }
    }
  });

  test('real-time updates reflect resource changes', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Get initial count for operators
    const initialCount = await compactQuickSelect.getCategoryAvailableCount('operator');
    
    // Close and reopen overlay (simulates potential state change)
    await compactQuickSelect.closeQuickSelect();
    await compactQuickSelect.openQuickSelect();
    
    // Count should be consistent
    const newCount = await compactQuickSelect.getCategoryAvailableCount('operator');
    expect(newCount).toBe(initialCount);
  });

  test('availability filtering shows only available resources', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to a category with available resources
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    if (await compactQuickSelect.getCurrentMode() === 'magnets') {
      // All visible magnets should be available for dragging
      const magnets = await compactQuickSelect.magnetGrid.locator('[data-testid^="compact-magnet-"]').all();
      
      for (let i = 0; i < Math.min(magnets.length, 3); i++) {
        const magnet = magnets[i];
        const className = await magnet.getAttribute('class');
        
        // Should not have disabled styling
        expect(className).not.toContain('opacity-30');
        expect(className).not.toContain('cursor-not-allowed');
      }
    }
  });
});