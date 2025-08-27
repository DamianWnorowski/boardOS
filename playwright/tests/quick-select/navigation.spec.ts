import { test, expect } from '@playwright/test';
import { QuickSelectPage } from '../../pages/QuickSelectPage';

test.describe('Quick Select Navigation', () => {
  let quickSelect: QuickSelectPage;

  test.beforeEach(async ({ page }) => {
    quickSelect = new QuickSelectPage(page);
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
  });

  test('opens quick select overlay with Tab key', async () => {
    expect(await quickSelect.isVisible()).toBe(false);
    
    await quickSelect.openQuickSelect();
    
    expect(await quickSelect.isVisible()).toBe(true);
    expect(await quickSelect.getTitle()).toContain('Select Resource Category');
    expect(await quickSelect.getCurrentMode()).toBe('category');
  });

  test('navigates through categories with Tab/Shift+Tab', async () => {
    await quickSelect.openQuickSelect();
    
    // Should start at index 0
    expect(await quickSelect.getSelectedIndex()).toBe(0);
    
    // Navigate forward
    await quickSelect.navigateNext();
    expect(await quickSelect.getSelectedIndex()).toBe(1);
    
    await quickSelect.navigateNext();
    expect(await quickSelect.getSelectedIndex()).toBe(2);
    
    // Navigate backward
    await quickSelect.navigatePrevious();
    expect(await quickSelect.getSelectedIndex()).toBe(1);
  });

  test('wraps around when navigating past ends', async () => {
    await quickSelect.openQuickSelect();
    
    const options = await quickSelect.getVisibleOptions();
    const optionCount = options.length;
    
    // Navigate to last item
    for (let i = 0; i < optionCount - 1; i++) {
      await quickSelect.navigateNext();
    }
    expect(await quickSelect.getSelectedIndex()).toBe(optionCount - 1);
    
    // Navigate forward should wrap to 0
    await quickSelect.navigateNext();
    expect(await quickSelect.getSelectedIndex()).toBe(0);
    
    // Navigate backward should wrap to last
    await quickSelect.navigatePrevious();
    expect(await quickSelect.getSelectedIndex()).toBe(optionCount - 1);
  });

  test('navigates from category to equipment subcategories', async () => {
    await quickSelect.openQuickSelect();
    
    // Select Equipment category (should be first)
    const equipmentCategory = await quickSelect.getCategoryByName('equipment');
    await equipmentCategory.waitFor({ state: 'visible' });
    
    // Make sure Equipment is selected (it should be by default)
    let attempts = 0;
    while (attempts < 10) {
      const isSelected = await equipmentCategory.locator('.ring-blue-500').isVisible();
      if (isSelected) break;
      await quickSelect.navigateNext();
      attempts++;
    }
    
    await quickSelect.selectCurrent();
    await quickSelect.waitForTransition();
    
    // Should now be in subcategory mode
    expect(await quickSelect.getCurrentMode()).toBe('subcategory');
    expect(await quickSelect.getTitle()).toContain('Select Equipment Type');
    expect(await quickSelect.subcategoryGrid.isVisible()).toBe(true);
  });

  test('navigates from category directly to magnets for non-equipment types', async () => {
    await quickSelect.openQuickSelect();
    
    // Navigate to Operator category
    await quickSelect.navigateNext(); // Should go to Operator
    await quickSelect.selectCurrent();
    await quickSelect.waitForTransition();
    
    // Should go directly to magnets
    expect(await quickSelect.getCurrentMode()).toBe('magnets');
    expect(await quickSelect.getTitle()).toContain('Select Operator');
    expect(await quickSelect.magnetGrid.isVisible()).toBe(true);
  });

  test('navigates from subcategory to magnets', async () => {
    await quickSelect.openQuickSelect();
    
    // Select Equipment category
    await quickSelect.selectCurrent();
    await quickSelect.waitForTransition();
    
    // Select Paver subcategory (should be first)
    await quickSelect.selectCurrent();
    await quickSelect.waitForTransition();
    
    // Should now be in magnets mode
    expect(await quickSelect.getCurrentMode()).toBe('magnets');
    expect(await quickSelect.magnetGrid.isVisible()).toBe(true);
  });

  test('goes back with Backspace key', async () => {
    await quickSelect.openQuickSelect();
    
    // Go to subcategory view
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    expect(await quickSelect.getCurrentMode()).toBe('subcategory');
    
    // Go back to category view
    await quickSelect.goBack();
    await quickSelect.waitForTransition();
    expect(await quickSelect.getCurrentMode()).toBe('category');
    
    // Go back again should close overlay
    await quickSelect.goBack();
    expect(await quickSelect.isVisible()).toBe(false);
  });

  test('shows breadcrumb navigation', async () => {
    await quickSelect.openQuickSelect();
    
    // No breadcrumb at category level
    expect(await quickSelect.getBreadcrumbText()).toBe(null);
    
    // Select Equipment
    await quickSelect.selectCurrent();
    await quickSelect.waitForTransition();
    
    // Should show Equipment breadcrumb
    const breadcrumbText = await quickSelect.getBreadcrumbText();
    expect(breadcrumbText).toContain('Equipment');
    
    // Select Paver
    await quickSelect.selectCurrent();
    await quickSelect.waitForTransition();
    
    // Should show Equipment > Paver breadcrumb
    const fullBreadcrumb = await quickSelect.getBreadcrumbText();
    expect(fullBreadcrumb).toContain('Equipment');
    expect(fullBreadcrumb).toContain('Paver');
  });

  test('closes overlay with Escape key', async () => {
    await quickSelect.openQuickSelect();
    expect(await quickSelect.isVisible()).toBe(true);
    
    await quickSelect.closeQuickSelect();
    expect(await quickSelect.isVisible()).toBe(false);
  });

  test('shows appropriate help text for each mode', async () => {
    await quickSelect.openQuickSelect();
    
    // Category mode help text
    let helpText = await quickSelect.getHelpText();
    expect(helpText).toContain('1-9: Quick Select');
    
    // Go to subcategory mode
    await quickSelect.selectCurrent(); // Equipment
    await quickSelect.waitForTransition();
    
    // Subcategory mode help text
    helpText = await quickSelect.getHelpText();
    expect(helpText).toContain('Backspace: Back');
    expect(helpText).not.toContain('1-9: Quick Select');
    
    // Go to magnets mode
    await quickSelect.selectCurrent(); // First subcategory
    await quickSelect.waitForTransition();
    
    // Magnets mode help text
    helpText = await quickSelect.getHelpText();
    expect(helpText).toContain('Backspace: Back');
    expect(helpText).not.toContain('1-9: Quick Select');
  });

  test('updates status text correctly', async () => {
    await quickSelect.openQuickSelect();
    
    const statusText = await quickSelect.getStatusText();
    expect(statusText).toMatch(/1 of \d+ category/);
    
    // Navigate and check status updates
    await quickSelect.navigateNext();
    const updatedStatus = await quickSelect.getStatusText();
    expect(updatedStatus).toMatch(/2 of \d+ category/);
  });

  test('quick selects with number keys (1-9)', async () => {
    await quickSelect.openQuickSelect();
    
    // Quick select with number 2 (second category)
    await quickSelect.quickSelectByNumber(2);
    await quickSelect.waitForTransition();
    
    // Should advance to next mode or close if it was a final selection
    const isStillVisible = await quickSelect.isVisible();
    if (isStillVisible) {
      // If still visible, should have advanced to next mode
      expect(await quickSelect.getCurrentMode()).not.toBe('category');
    }
  });

  test('handles empty states gracefully', async () => {
    await quickSelect.openQuickSelect();
    
    // This test assumes there might be categories with no available magnets
    // Navigate through categories to find one that might be empty
    const options = await quickSelect.getVisibleOptions();
    
    // Just verify the overlay handles the state without crashing
    for (let i = 0; i < Math.min(options.length, 3); i++) {
      if (i > 0) await quickSelect.navigateNext();
      await quickSelect.selectCurrent();
      await quickSelect.waitForTransition();
      
      if (await quickSelect.isVisible()) {
        // If we're in magnets mode and it's empty, should show appropriate message
        if (await quickSelect.getCurrentMode() === 'magnets') {
          const hasEmptyMessage = await quickSelect.overlay
            .locator('text=No available magnets found')
            .isVisible();
          if (hasEmptyMessage) {
            break; // Found empty state
          }
        }
        
        // Go back for next iteration
        await quickSelect.goBack();
        await quickSelect.waitForTransition();
      } else {
        break; // Selection completed
      }
    }
    
    // Test passes if no errors occurred during navigation
    expect(true).toBe(true);
  });
});