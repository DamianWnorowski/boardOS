import { test, expect } from '@playwright/test';
import { QuickSelectPage } from '../../pages/QuickSelectPage';

test.describe('Quick Select Categories', () => {
  let quickSelect: QuickSelectPage;

  test.beforeEach(async ({ page }) => {
    quickSelect = new QuickSelectPage(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
  });

  test('displays all resource categories', async () => {
    await quickSelect.openQuickSelect();
    
    // Check that category grid is visible
    expect(await quickSelect.categoryGrid.isVisible()).toBe(true);
    
    // Verify key categories are present
    const equipmentCategory = await quickSelect.getCategoryByName('equipment');
    const operatorCategory = await quickSelect.getCategoryByName('operator');
    const driverCategory = await quickSelect.getCategoryByName('driver');
    const laborerCategory = await quickSelect.getCategoryByName('laborer');
    const foremanCategory = await quickSelect.getCategoryByName('foreman');
    const truckCategory = await quickSelect.getCategoryByName('truck');
    const striperCategory = await quickSelect.getCategoryByName('striper');
    const privateDriverCategory = await quickSelect.getCategoryByName('privatedriver');
    
    expect(await equipmentCategory.isVisible()).toBe(true);
    expect(await operatorCategory.isVisible()).toBe(true);
    expect(await driverCategory.isVisible()).toBe(true);
    expect(await laborerCategory.isVisible()).toBe(true);
    expect(await foremanCategory.isVisible()).toBe(true);
    expect(await truckCategory.isVisible()).toBe(true);
    expect(await striperCategory.isVisible()).toBe(true);
    expect(await privateDriverCategory.isVisible()).toBe(true);
  });

  test('shows category icons and descriptions', async () => {
    await quickSelect.openQuickSelect();
    
    const equipmentCategory = await quickSelect.getCategoryByName('equipment');
    
    // Check for icon (emoji)
    const icon = equipmentCategory.locator('.text-2xl').first();
    expect(await icon.isVisible()).toBe(true);
    const iconText = await icon.textContent();
    expect(iconText?.trim()).toBeTruthy();
    
    // Check for category name
    const name = equipmentCategory.locator('.font-medium');
    expect(await name.textContent()).toBe('Equipment');
    
    // Check for description
    const description = equipmentCategory.locator('.text-xs.text-gray-500');
    expect(await description.isVisible()).toBe(true);
    expect(await description.textContent()).toContain('Heavy machinery');
  });

  test('indicates which categories have subcategories', async () => {
    await quickSelect.openQuickSelect();
    
    // Equipment should have subcategory indicator (→)
    const equipmentCategory = await quickSelect.getCategoryByName('equipment');
    const subcategoryIndicator = equipmentCategory.locator('.text-blue-600', { hasText: '→' });
    expect(await subcategoryIndicator.isVisible()).toBe(true);
    
    // Operator should not have subcategory indicator
    const operatorCategory = await quickSelect.getCategoryByName('operator');
    const noIndicator = operatorCategory.locator('.text-blue-600', { hasText: '→' });
    expect(await noIndicator.isVisible()).toBe(false);
  });

  test('highlights selected category', async () => {
    await quickSelect.openQuickSelect();
    
    // First category should be selected by default
    const firstCategory = quickSelect.categoryGrid.locator('[data-testid^="category-"]').first();
    expect(await firstCategory.locator('.ring-blue-500').isVisible()).toBe(true);
    expect(await firstCategory.locator('.bg-blue-50').isVisible()).toBe(true);
    
    // Navigate to next category
    await quickSelect.navigateNext();
    
    // Second category should now be selected
    const secondCategory = quickSelect.categoryGrid.locator('[data-testid^="category-"]').nth(1);
    expect(await secondCategory.locator('.ring-blue-500').isVisible()).toBe(true);
    
    // First category should no longer be selected
    expect(await firstCategory.locator('.ring-blue-500').isVisible()).toBe(false);
  });

  test('shows selection indicator with number', async () => {
    await quickSelect.openQuickSelect();
    
    // First category should show "1" indicator
    const firstCategory = quickSelect.categoryGrid.locator('[data-testid^="category-"]').first();
    const indicator = firstCategory.locator('.bg-blue-500.text-white.rounded-full');
    expect(await indicator.isVisible()).toBe(true);
    expect(await indicator.textContent()).toBe('1');
    
    // Navigate to second category
    await quickSelect.navigateNext();
    
    // Second category should show "2" indicator
    const secondCategory = quickSelect.categoryGrid.locator('[data-testid^="category-"]').nth(1);
    const secondIndicator = secondCategory.locator('.bg-blue-500.text-white.rounded-full');
    expect(await secondIndicator.isVisible()).toBe(true);
    expect(await secondIndicator.textContent()).toBe('2');
  });

  test('equipment category navigates to subcategory view', async () => {
    await quickSelect.openQuickSelect();
    
    // Equipment should be first category, select it
    await quickSelect.selectCurrent();
    await quickSelect.waitForTransition();
    
    // Should now be in subcategory view
    expect(await quickSelect.getCurrentMode()).toBe('subcategory');
    expect(await quickSelect.getTitle()).toBe('Select Equipment Type');
    expect(await quickSelect.subcategoryGrid.isVisible()).toBe(true);
  });

  test('non-equipment categories navigate directly to magnets', async () => {
    await quickSelect.openQuickSelect();
    
    // Navigate to Operator category (typically second)
    await quickSelect.navigateNext();
    
    // Verify we're on Operator
    const operatorCategory = await quickSelect.getCategoryByName('operator');
    expect(await operatorCategory.locator('.ring-blue-500').isVisible()).toBe(true);
    
    await quickSelect.selectCurrent();
    await quickSelect.waitForTransition();
    
    // Should go directly to magnets view
    expect(await quickSelect.getCurrentMode()).toBe('magnets');
    expect(await quickSelect.getTitle()).toContain('Select Operator');
    expect(await quickSelect.magnetGrid.isVisible()).toBe(true);
  });

  test('category selection updates breadcrumb', async () => {
    await quickSelect.openQuickSelect();
    
    // Select Equipment category
    await quickSelect.selectCurrent();
    await quickSelect.waitForTransition();
    
    // Breadcrumb should show Equipment
    const breadcrumbText = await quickSelect.getBreadcrumbText();
    expect(breadcrumbText).toContain('Equipment');
    expect(breadcrumbText).toContain('🚜'); // Equipment icon
  });

  test('categories display in correct grid layout', async () => {
    await quickSelect.openQuickSelect();
    
    // Check grid layout
    const categoryGrid = quickSelect.categoryGrid;
    expect(await categoryGrid.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.display;
    })).toBe('grid');
    
    // Should have 4 columns (grid-cols-4)
    expect(await categoryGrid.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.gridTemplateColumns;
    })).toContain('1fr 1fr 1fr 1fr');
  });

  test('handles category hover states', async () => {
    await quickSelect.openQuickSelect();
    
    const firstCategory = quickSelect.categoryGrid.locator('[data-testid^="category-"]').first();
    
    // Hover over category
    await firstCategory.hover();
    
    // Should have hover styles applied
    expect(await firstCategory.locator('.hover\\:shadow-md').isVisible()).toBe(true);
  });

  test('category cards have proper accessibility attributes', async () => {
    await quickSelect.openQuickSelect();
    
    const equipmentCategory = await quickSelect.getCategoryByName('equipment');
    
    // Should have proper test ID
    expect(await equipmentCategory.getAttribute('data-testid')).toBe('category-equipment');
    
    // Should be keyboard focusable via cursor-pointer class
    expect(await equipmentCategory.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.cursor;
    })).toBe('pointer');
  });

  test('displays category count in status', async () => {
    await quickSelect.openQuickSelect();
    
    const statusText = await quickSelect.getStatusText();
    
    // Should show current position and total categories
    expect(statusText).toMatch(/1 of \d+ category/);
    expect(statusText).toContain('Equipment'); // First category name
    
    // Navigate and check update
    await quickSelect.navigateNext();
    const updatedStatus = await quickSelect.getStatusText();
    expect(updatedStatus).toMatch(/2 of \d+ category/);
  });

  test('quick select with numbers works for categories', async () => {
    await quickSelect.openQuickSelect();
    
    // Quick select category 3
    await quickSelect.quickSelectByNumber(3);
    await quickSelect.waitForTransition();
    
    // Should have advanced to next view or completed selection
    const currentMode = await quickSelect.getCurrentMode();
    expect(currentMode === 'subcategory' || currentMode === 'magnets' || !await quickSelect.isVisible()).toBe(true);
  });
});