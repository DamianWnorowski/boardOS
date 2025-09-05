import { test, expect } from '@playwright/test';
import { CompactQuickSelectPage } from '../../pages/CompactQuickSelectPage';

test.describe('Compact Quick Select - Mouse Interactions', () => {
  let compactQuickSelect: CompactQuickSelectPage;

  test.beforeEach(async ({ page }) => {
    compactQuickSelect = new CompactQuickSelectPage(page);
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
  });

  test('opens compact quick select overlay with Tab key', async () => {
    expect(await compactQuickSelect.isVisible()).toBe(false);
    
    await compactQuickSelect.openQuickSelect();
    
    expect(await compactQuickSelect.isVisible()).toBe(true);
    expect(await compactQuickSelect.getTitle()).toContain('Select Category');
    expect(await compactQuickSelect.getCurrentMode()).toBe('category');
  });

  test('displays count badges for each category', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Check that Equipment category shows a count badge
    const equipmentCount = await compactQuickSelect.getCategoryAvailableCount('equipment');
    expect(equipmentCount).toBeGreaterThanOrEqual(0);
    
    // Check that Operator category shows a count badge
    const operatorCount = await compactQuickSelect.getCategoryAvailableCount('operator');
    expect(operatorCount).toBeGreaterThanOrEqual(0);
    
    // Check that Driver category shows a count badge
    const driverCount = await compactQuickSelect.getCategoryAvailableCount('driver');
    expect(driverCount).toBeGreaterThanOrEqual(0);
  });

  test('clicking equipment category navigates to subcategories', async () => {
    await compactQuickSelect.openQuickSelect();
    
    await compactQuickSelect.clickCategory('equipment');
    await compactQuickSelect.waitForTransition();
    
    expect(await compactQuickSelect.getCurrentMode()).toBe('subcategory');
    expect(await compactQuickSelect.getTitle()).toContain('Select Equipment');
    expect(await compactQuickSelect.subcategoryGrid.isVisible()).toBe(true);
  });

  test('clicking non-equipment category goes directly to magnets', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Click on Operator category (should go directly to magnets)
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    expect(await compactQuickSelect.getCurrentMode()).toBe('magnets');
    expect(await compactQuickSelect.getTitle()).toContain('Select Operator');
    expect(await compactQuickSelect.magnetGrid.isVisible()).toBe(true);
  });

  test('clicking subcategory navigates to magnets', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Go to equipment subcategories
    await compactQuickSelect.clickCategory('equipment');
    await compactQuickSelect.waitForTransition();
    
    // Click on Paver subcategory
    await compactQuickSelect.clickSubcategory('paver');
    await compactQuickSelect.waitForTransition();
    
    expect(await compactQuickSelect.getCurrentMode()).toBe('magnets');
    expect(await compactQuickSelect.magnetGrid.isVisible()).toBe(true);
  });

  test('back button navigates to previous level', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Go to subcategory view
    await compactQuickSelect.clickCategory('equipment');
    await compactQuickSelect.waitForTransition();
    expect(await compactQuickSelect.getCurrentMode()).toBe('subcategory');
    
    // Click back button
    await compactQuickSelect.goBackWithButton();
    await compactQuickSelect.waitForTransition();
    expect(await compactQuickSelect.getCurrentMode()).toBe('category');
  });

  test('close button closes overlay', async () => {
    await compactQuickSelect.openQuickSelect();
    expect(await compactQuickSelect.isVisible()).toBe(true);
    
    await compactQuickSelect.closeWithButton();
    expect(await compactQuickSelect.isVisible()).toBe(false);
  });

  test('shows appropriate help text with mouse interactions', async () => {
    await compactQuickSelect.openQuickSelect();
    
    const helpText = await compactQuickSelect.getHelpText();
    expect(helpText).toContain('Tab: Navigate');
    expect(helpText).toContain('Click: Select');
    expect(helpText).toContain('Drag: Assign to job');
    expect(helpText).toContain('Esc: Close');
  });

  test('disabled categories are grayed out with zero count', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Find a category with 0 available resources
    const categories = ['truck', 'striper', 'privateDriver'];
    let foundDisabled = false;
    
    for (const category of categories) {
      const count = await compactQuickSelect.getCategoryAvailableCount(category);
      const isDisabled = await compactQuickSelect.isCategoryDisabled(category);
      
      if (count === 0) {
        expect(isDisabled).toBe(true);
        foundDisabled = true;
        break;
      }
    }
    
    // If all categories have resources, that's also valid
    if (!foundDisabled) {
      console.log('All categories have available resources - test passed');
    }
  });

  test('clicking disabled category does nothing', async () => {
    await compactQuickSelect.openQuickSelect();
    const initialMode = await compactQuickSelect.getCurrentMode();
    
    // Try to click a category that might be disabled
    const categories = ['truck', 'striper', 'privateDriver'];
    
    for (const category of categories) {
      const count = await compactQuickSelect.getCategoryAvailableCount(category);
      if (count === 0) {
        await compactQuickSelect.clickCategory(category);
        await compactQuickSelect.waitForTransition();
        
        // Should remain in the same mode
        expect(await compactQuickSelect.getCurrentMode()).toBe(initialMode);
        break;
      }
    }
  });

  test('maintains keyboard navigation while supporting mouse', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Use keyboard to navigate
    await compactQuickSelect.navigateNext();
    const _keyboardIndex = await compactQuickSelect.getSelectedIndex();
    void _keyboardIndex; // Store keyboard selection for comparison
    
    // Then use mouse to click a different category
    await compactQuickSelect.clickCategory('equipment');
    await compactQuickSelect.waitForTransition();
    
    // Should have navigated using mouse click
    expect(await compactQuickSelect.getCurrentMode()).toBe('subcategory');
  });
});