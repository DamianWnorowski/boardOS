import { test, expect } from '@playwright/test';
import { QuickSelectPage } from '../../pages/QuickSelectPage';

test.describe('Quick Select Basic Navigation', () => {
  let quickSelect: QuickSelectPage;

  test.beforeEach(async ({ page }) => {
    quickSelect = new QuickSelectPage(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
  });

  test('opens and closes quick select with keyboard', async () => {
    // Should start closed
    expect(await quickSelect.isVisible()).toBe(false);
    
    // Open with Tab
    await quickSelect.openQuickSelect();
    expect(await quickSelect.isVisible()).toBe(true);
    expect(await quickSelect.getCurrentMode()).toBe('category');
    
    // Close with Escape
    await quickSelect.closeQuickSelect();
    expect(await quickSelect.isVisible()).toBe(false);
  });

  test('shows category view initially', async () => {
    await quickSelect.openQuickSelect();
    
    expect(await quickSelect.getCurrentMode()).toBe('category');
    expect(await quickSelect.getTitle()).toBe('Select Resource Category');
    expect(await quickSelect.categoryGrid.isVisible()).toBe(true);
  });

  test('navigates between categories', async () => {
    await quickSelect.openQuickSelect();
    
    // Should start at index 0
    expect(await quickSelect.getSelectedIndex()).toBe(0);
    
    // Navigate forward
    await quickSelect.navigateNext();
    expect(await quickSelect.getSelectedIndex()).toBe(1);
    
    // Navigate backward
    await quickSelect.navigatePrevious();
    expect(await quickSelect.getSelectedIndex()).toBe(0);
  });

  test('shows equipment category with subcategory indicator', async () => {
    await quickSelect.openQuickSelect();
    
    const equipmentCategory = await quickSelect.getCategoryByName('equipment');
    expect(await equipmentCategory.isVisible()).toBe(true);
    
    // Should show subcategory indicator (arrow) in the top-right of the card
    const arrow = equipmentCategory.locator('.absolute.top-1.right-1', { hasText: '→' });
    expect(await arrow.isVisible()).toBe(true);
  });

  test('shows non-equipment categories without subcategory indicator', async () => {
    await quickSelect.openQuickSelect();
    
    const operatorCategory = await quickSelect.getCategoryByName('operator');
    expect(await operatorCategory.isVisible()).toBe(true);
    
    // Should not show subcategory indicator
    const arrow = operatorCategory.locator('.absolute.top-1.right-1', { hasText: '→' });
    expect(await arrow.isVisible()).toBe(false);
  });

  test('displays all expected categories', async () => {
    await quickSelect.openQuickSelect();
    
    const expectedCategories = [
      'equipment', 'operator', 'driver', 'laborer', 
      'foreman', 'truck', 'striper', 'privateDriver'
    ];
    
    for (const categoryName of expectedCategories) {
      const category = await quickSelect.getCategoryByName(categoryName);
      expect(await category.isVisible()).toBe(true);
    }
  });

  test('shows correct help text for category mode', async () => {
    await quickSelect.openQuickSelect();
    
    const helpText = await quickSelect.getHelpText();
    expect(helpText).toContain('Tab: Next');
    expect(helpText).toContain('Shift+Tab: Previous');
    expect(helpText).toContain('Enter: Select');
    expect(helpText).toContain('1-9: Quick Select');
    expect(helpText).toContain('Esc: Close');
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

  test('shows category icons and descriptions', async () => {
    await quickSelect.openQuickSelect();
    
    const equipmentCategory = await quickSelect.getCategoryByName('equipment');
    
    // Check for icon (now .text-lg instead of .text-2xl)
    const icon = equipmentCategory.locator('.text-lg').first();
    expect(await icon.isVisible()).toBe(true);
    
    // Check for name (now .text-xs.font-bold inside the card, not the selection indicator)
    const name = equipmentCategory.locator('.text-xs.font-bold.text-center');
    expect(await name.textContent()).toBe('Equipment');
    
    // Check for description (now outside the card)
    const description = equipmentCategory.locator('.text-xs.text-gray-500');
    expect(await description.isVisible()).toBe(true);
  });

  test('selection advances to next mode', async () => {
    await quickSelect.openQuickSelect();
    
    const initialMode = await quickSelect.getCurrentMode();
    expect(initialMode).toBe('category');
    
    // Select first category (Equipment)
    await quickSelect.selectCurrent();
    await quickSelect.waitForTransition();
    
    // Should advance to next mode
    const newMode = await quickSelect.getCurrentMode();
    expect(newMode).not.toBe('category');
    expect(['subcategory', 'magnets'].includes(newMode)).toBe(true);
  });

  test('handles keyboard shortcuts correctly', async ({ page }) => {
    // Test that Tab opens overlay when closed
    expect(await quickSelect.isVisible()).toBe(false);
    await page.keyboard.press('Tab');
    await quickSelect.overlay.waitFor({ state: 'visible' });
    expect(await quickSelect.isVisible()).toBe(true);
    
    // Test that Escape closes overlay
    await page.keyboard.press('Escape');
    await quickSelect.overlay.waitFor({ state: 'hidden' });
    expect(await quickSelect.isVisible()).toBe(false);
  });
});