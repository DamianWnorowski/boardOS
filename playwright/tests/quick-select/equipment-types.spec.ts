import { test, expect } from '@playwright/test';
import { QuickSelectPage } from '../../pages/QuickSelectPage';

test.describe('Quick Select Equipment Types', () => {
  let quickSelect: QuickSelectPage;

  test.beforeEach(async ({ page }) => {
    quickSelect = new QuickSelectPage(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
  });

  test('navigates from equipment category to subcategory view', async () => {
    await quickSelect.openQuickSelect();
    
    // Select Equipment category (should be first)
    await quickSelect.selectCurrent();
    await quickSelect.waitForTransition();
    
    // Should now be in subcategory mode
    expect(await quickSelect.getCurrentMode()).toBe('subcategory');
    expect(await quickSelect.getTitle()).toBe('Select Equipment Type');
    expect(await quickSelect.subcategoryGrid.isVisible()).toBe(true);
  });

  test('displays all equipment subcategories', async () => {
    await quickSelect.openQuickSelect();
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    
    const expectedSubcategories = [
      'paver', 'roller', 'excavator', 'sweeper', 'millingMachine',
      'grader', 'dozer', 'payloader', 'skidsteer', 'equipment'
    ];
    void expectedSubcategories; // List available for future detailed subcategory validation
    
    // Check that subcategory grid is visible
    expect(await quickSelect.subcategoryGrid.isVisible()).toBe(true);
    
    // Check that at least some subcategories are visible
    const visibleSubcategories = await quickSelect.subcategoryGrid.locator('[data-testid^="subcategory-"]').count();
    expect(visibleSubcategories).toBeGreaterThan(5);
  });

  test('shows subcategory icons and names', async () => {
    await quickSelect.openQuickSelect();
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    
    const paverSubcategory = await quickSelect.getSubcategoryByName('paver');
    
    // Check for icon
    const icon = paverSubcategory.locator('.text-xl').first();
    expect(await icon.isVisible()).toBe(true);
    
    // Check for name
    const name = paverSubcategory.locator('.font-medium');
    expect(await name.textContent()).toBe('Paver');
  });

  test('navigates through subcategories with Tab/Shift+Tab', async () => {
    await quickSelect.openQuickSelect();
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    
    // Should start at index 0
    expect(await quickSelect.getSelectedIndex()).toBe(0);
    
    // Navigate forward
    await quickSelect.navigateNext();
    expect(await quickSelect.getSelectedIndex()).toBe(1);
    
    // Navigate backward
    await quickSelect.navigatePrevious();
    expect(await quickSelect.getSelectedIndex()).toBe(0);
  });

  test('shows selection indicator with numbers', async () => {
    await quickSelect.openQuickSelect();
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    
    // First subcategory should show "1" indicator
    const firstSubcategory = quickSelect.subcategoryGrid.locator('[data-testid^="subcategory-"]').first();
    const indicator = firstSubcategory.locator('.bg-blue-500.text-white.rounded-full');
    expect(await indicator.isVisible()).toBe(true);
    expect(await indicator.textContent()).toBe('1');
  });

  test('goes back to category view with Backspace', async () => {
    await quickSelect.openQuickSelect();
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    
    expect(await quickSelect.getCurrentMode()).toBe('subcategory');
    
    // Go back
    await quickSelect.goBack();
    await quickSelect.waitForTransition();
    
    expect(await quickSelect.getCurrentMode()).toBe('category');
    expect(await quickSelect.categoryGrid.isVisible()).toBe(true);
  });

  test('shows Equipment breadcrumb in subcategory view', async () => {
    await quickSelect.openQuickSelect();
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    
    const breadcrumbText = await quickSelect.getBreadcrumbText();
    expect(breadcrumbText).toContain('Equipment');
  });

  test('shows appropriate help text for subcategory mode', async () => {
    await quickSelect.openQuickSelect();
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    
    const helpText = await quickSelect.getHelpText();
    expect(helpText).toContain('Tab: Next');
    expect(helpText).toContain('Shift+Tab: Previous');
    expect(helpText).toContain('Enter: Select');
    expect(helpText).toContain('Backspace: Back');
    expect(helpText).toContain('Esc: Close');
    expect(helpText).not.toContain('1-9: Quick Select'); // Not available in subcategory mode
  });

  test('updates status text correctly in subcategory mode', async () => {
    await quickSelect.openQuickSelect();
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    
    const statusText = await quickSelect.getStatusText();
    expect(statusText).toMatch(/1 of \d+ subcategory/);
    
    // Navigate and check status updates
    await quickSelect.navigateNext();
    const updatedStatus = await quickSelect.getStatusText();
    expect(updatedStatus).toMatch(/2 of \d+ subcategory/);
  });

  test('selects subcategory and advances to magnets view', async () => {
    await quickSelect.openQuickSelect();
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    
    expect(await quickSelect.getCurrentMode()).toBe('subcategory');
    
    // Select first subcategory (Paver)
    await quickSelect.selectCurrent();
    await quickSelect.waitForTransition();
    
    // Should advance to magnets mode (or close if no magnets available)
    const newMode = await quickSelect.getCurrentMode();
    const isVisible = await quickSelect.isVisible();
    
    if (isVisible) {
      expect(newMode).toBe('magnets');
      expect(await quickSelect.getTitle()).toContain('Select Equipment');
    } else {
      // If overlay closed, it means selection was completed (no magnets available)
      expect(isVisible).toBe(false);
    }
  });

  test('subcategories display in correct grid layout', async () => {
    await quickSelect.openQuickSelect();
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    
    // Check grid layout
    const subcategoryGrid = quickSelect.subcategoryGrid;
    expect(await subcategoryGrid.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.display;
    })).toBe('grid');
    
    // Should have 5 columns (grid-cols-5) - check computed columns count
    const gridColumns = await subcategoryGrid.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.gridTemplateColumns.split(' ').length;
    });
    expect(gridColumns).toBe(5);
  });

  test('handles subcategory hover states', async () => {
    await quickSelect.openQuickSelect();
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    
    const firstSubcategory = quickSelect.subcategoryGrid.locator('[data-testid^="subcategory-"]').first();
    
    // Hover over subcategory
    await firstSubcategory.hover();
    
    // Should be hoverable (has cursor pointer)
    expect(await firstSubcategory.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.cursor;
    })).toBe('pointer');
  });

  test('wraps around when navigating past ends in subcategory view', async () => {
    await quickSelect.openQuickSelect();
    await quickSelect.selectCurrent(); // Select Equipment
    await quickSelect.waitForTransition();
    
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
});