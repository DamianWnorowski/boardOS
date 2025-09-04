import { test, expect } from '@playwright/test';
import { CompactQuickSelectPage } from '../../pages/CompactQuickSelectPage';

test.describe('Compact Quick Select - Keyboard Navigation', () => {
  let compactQuickSelect: CompactQuickSelectPage;

  test.beforeEach(async ({ page }) => {
    compactQuickSelect = new CompactQuickSelectPage(page);
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
  });

  test('maintains all keyboard shortcuts', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Tab navigation
    await compactQuickSelect.navigateNext();
    const selectedIndex = await compactQuickSelect.getSelectedIndex();
    expect(selectedIndex).toBe(1);
    
    // Shift+Tab navigation
    await compactQuickSelect.navigatePrevious();
    expect(await compactQuickSelect.getSelectedIndex()).toBe(0);
    
    // Enter to select
    await compactQuickSelect.selectCurrent();
    await compactQuickSelect.waitForTransition();
    
    // Should navigate to next level or close
    const isStillVisible = await compactQuickSelect.isVisible();
    if (isStillVisible) {
      expect(await compactQuickSelect.getCurrentMode()).not.toBe('category');
    }
  });

  test('number keys (1-9) work for quick selection', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Quick select with number 2
    await compactQuickSelect.quickSelectByNumber(2);
    await compactQuickSelect.waitForTransition();
    
    // Should have executed selection
    const isStillVisible = await compactQuickSelect.isVisible();
    if (isStillVisible) {
      expect(await compactQuickSelect.getCurrentMode()).not.toBe('category');
    }
  });

  test('Escape key closes overlay', async () => {
    await compactQuickSelect.openQuickSelect();
    expect(await compactQuickSelect.isVisible()).toBe(true);
    
    await compactQuickSelect.closeQuickSelect();
    expect(await compactQuickSelect.isVisible()).toBe(false);
  });

  test('Backspace navigates back through levels', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to equipment subcategories
    await compactQuickSelect.selectCurrent(); // Equipment
    await compactQuickSelect.waitForTransition();
    expect(await compactQuickSelect.getCurrentMode()).toBe('subcategory');
    
    // Go back to categories
    await compactQuickSelect.goBack();
    await compactQuickSelect.waitForTransition();
    expect(await compactQuickSelect.getCurrentMode()).toBe('category');
    
    // Go back again to close
    await compactQuickSelect.goBack();
    expect(await compactQuickSelect.isVisible()).toBe(false);
  });

  test('wraps selection at beginning and end', async () => {
    await compactQuickSelect.openQuickSelect();
    
    const options = await compactQuickSelect.getVisibleOptions();
    const optionCount = options.length;
    
    // Navigate to last item
    for (let i = 0; i < optionCount - 1; i++) {
      await compactQuickSelect.navigateNext();
    }
    expect(await compactQuickSelect.getSelectedIndex()).toBe(optionCount - 1);
    
    // Navigate forward should wrap to 0
    await compactQuickSelect.navigateNext();
    expect(await compactQuickSelect.getSelectedIndex()).toBe(0);
    
    // Navigate backward should wrap to last
    await compactQuickSelect.navigatePrevious();
    expect(await compactQuickSelect.getSelectedIndex()).toBe(optionCount - 1);
  });

  test('keyboard selection updates visual indicators', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate with keyboard
    await compactQuickSelect.navigateNext();
    
    // Check that visual selection indicator moved
    const selectedElement = await compactQuickSelect.getSelectedIndicator();
    expect(await selectedElement.isVisible()).toBe(true);
    
    // Check that it has the correct styling
    const className = await selectedElement.getAttribute('class');
    expect(className).toContain('ring-2');
    expect(className).toContain('ring-blue-400');
  });

  test('keyboard navigation works in subcategory view', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Go to equipment subcategories
    await compactQuickSelect.selectCurrent();
    await compactQuickSelect.waitForTransition();
    expect(await compactQuickSelect.getCurrentMode()).toBe('subcategory');
    
    // Navigate through subcategories
    const initialIndex = await compactQuickSelect.getSelectedIndex();
    await compactQuickSelect.navigateNext();
    const nextIndex = await compactQuickSelect.getSelectedIndex();
    
    expect(nextIndex).toBe((initialIndex + 1) % await compactQuickSelect.getVisibleOptions().then(opts => opts.length));
  });

  test('keyboard navigation works in magnets view', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to magnets (operators)
    await compactQuickSelect.navigateNext(); // Operator
    await compactQuickSelect.selectCurrent();
    await compactQuickSelect.waitForTransition();
    expect(await compactQuickSelect.getCurrentMode()).toBe('magnets');
    
    // Navigate through magnets
    const initialIndex = await compactQuickSelect.getSelectedIndex();
    await compactQuickSelect.navigateNext();
    const nextIndex = await compactQuickSelect.getSelectedIndex();
    
    const options = await compactQuickSelect.getVisibleOptions();
    if (options.length > 1) {
      expect(nextIndex).toBe((initialIndex + 1) % options.length);
    }
  });

  test('selecting magnet with Enter closes overlay', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to operators
    await compactQuickSelect.navigateNext(); // Operator
    await compactQuickSelect.selectCurrent();
    await compactQuickSelect.waitForTransition();
    
    if (await compactQuickSelect.getCurrentMode() === 'magnets') {
      // Select a magnet
      await compactQuickSelect.selectCurrent();
      await compactQuickSelect.waitForTransition();
      
      // Should close overlay
      expect(await compactQuickSelect.isVisible()).toBe(false);
    }
  });

  test('mixed keyboard and mouse interaction works', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Use keyboard to navigate
    await compactQuickSelect.navigateNext();
    const _keyboardIndex = await compactQuickSelect.getSelectedIndex();
    void _keyboardIndex; // Store index for potential future assertion
    
    // Use mouse to click equipment
    await compactQuickSelect.clickCategory('equipment');
    await compactQuickSelect.waitForTransition();
    
    expect(await compactQuickSelect.getCurrentMode()).toBe('subcategory');
    
    // Use keyboard to navigate subcategories
    await compactQuickSelect.navigateNext();
    
    // Use keyboard to select
    await compactQuickSelect.selectCurrent();
    await compactQuickSelect.waitForTransition();
    
    expect(await compactQuickSelect.getCurrentMode()).toBe('magnets');
  });

  test('keyboard shortcuts work across all modes', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Test in category mode
    await compactQuickSelect.navigateNext();
    expect(await compactQuickSelect.getSelectedIndex()).toBe(1);
    
    // Navigate to subcategory mode
    await compactQuickSelect.navigatePrevious(); // Back to equipment
    await compactQuickSelect.selectCurrent();
    await compactQuickSelect.waitForTransition();
    
    // Test in subcategory mode
    await compactQuickSelect.navigateNext();
    const subcategoryIndex = await compactQuickSelect.getSelectedIndex();
    expect(subcategoryIndex).toBeGreaterThanOrEqual(0);
    
    // Navigate to magnets mode
    await compactQuickSelect.selectCurrent();
    await compactQuickSelect.waitForTransition();
    
    if (await compactQuickSelect.getCurrentMode() === 'magnets') {
      // Test in magnets mode
      const magnetOptions = await compactQuickSelect.getVisibleOptions();
      if (magnetOptions.length > 1) {
        await compactQuickSelect.navigateNext();
        const magnetIndex = await compactQuickSelect.getSelectedIndex();
        expect(magnetIndex).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('status indicators update with keyboard navigation', async () => {
    await compactQuickSelect.openQuickSelect();
    
    // Check initial state
    let selectedIndex = await compactQuickSelect.getSelectedIndex();
    expect(selectedIndex).toBe(0);
    
    // Navigate and check selection indicator updates
    await compactQuickSelect.navigateNext();
    selectedIndex = await compactQuickSelect.getSelectedIndex();
    expect(selectedIndex).toBe(1);
    
    // Check visual indicator moved
    const indicator = await compactQuickSelect.getSelectedIndicator();
    expect(await indicator.isVisible()).toBe(true);
  });
});