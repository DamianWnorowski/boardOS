import { Page, Locator } from '@playwright/test';

export class QuickSelectPage {
  readonly page: Page;
  readonly overlay: Locator;
  readonly title: Locator;
  readonly helpText: Locator;
  readonly breadcrumb: Locator;
  readonly statusText: Locator;
  readonly categoryGrid: Locator;
  readonly subcategoryGrid: Locator;
  readonly magnetGrid: Locator;

  constructor(page: Page) {
    this.page = page;
    this.overlay = page.locator('[data-testid="quick-select-overlay"]');
    this.title = this.overlay.locator('h2');
    this.helpText = this.overlay.locator('.text-gray-500').first();
    this.breadcrumb = page.locator('[data-testid="breadcrumb"]');
    this.statusText = this.overlay.locator('.text-center.text-sm.text-gray-600').last();
    this.categoryGrid = page.locator('[data-testid="quick-select-categories"]');
    this.subcategoryGrid = page.locator('[data-testid="equipment-subcategories"]');
    this.magnetGrid = page.locator('[data-testid="magnets-grid"]');
  }

  async openQuickSelect() {
    await this.page.keyboard.press('Tab');
    await this.overlay.waitFor({ state: 'visible' });
  }

  async closeQuickSelect() {
    await this.page.keyboard.press('Escape');
    await this.overlay.waitFor({ state: 'hidden' });
  }

  async navigateNext() {
    await this.page.keyboard.press('Tab');
  }

  async navigatePrevious() {
    await this.page.keyboard.press('Shift+Tab');
  }

  async selectCurrent() {
    await this.page.keyboard.press('Enter');
  }

  async goBack() {
    await this.page.keyboard.press('Backspace');
  }

  async quickSelectByNumber(number: number) {
    if (number < 1 || number > 9) {
      throw new Error('Quick select number must be between 1-9');
    }
    await this.page.keyboard.press(number.toString());
  }

  async getCategoryByName(name: string) {
    return this.categoryGrid.locator(`[data-testid="category-${name}"]`);
  }

  async getSubcategoryByName(name: string) {
    return this.subcategoryGrid.locator(`[data-testid="subcategory-${name.toLowerCase()}"]`);
  }

  async getMagnetByType(type: string, index: number = 0) {
    return this.magnetGrid.locator(`[data-testid="magnet-${type}-${index}"]`);
  }

  async getSelectedIndicator() {
    return this.overlay.locator('.bg-blue-500.text-white.rounded-full').first();
  }

  async isVisible() {
    return this.overlay.isVisible();
  }

  async getTitle() {
    return this.title.textContent();
  }

  async getHelpText() {
    return this.helpText.textContent();
  }

  async getBreadcrumbText() {
    return this.breadcrumb.isVisible() ? this.breadcrumb.textContent() : null;
  }

  async getStatusText() {
    return this.statusText.textContent();
  }

  async getCurrentMode() {
    const title = await this.getTitle();
    if (title?.includes('Select Resource Category')) return 'category';
    if (title?.includes('Select Equipment Type')) return 'subcategory';
    if (title?.includes('Select')) return 'magnets';
    return 'unknown';
  }

  async selectCategory(categoryName: string) {
    await this.openQuickSelect();
    const category = await this.getCategoryByName(categoryName);
    
    // Navigate to the category using keyboard
    let attempts = 0;
    while (attempts < 10) {
      const isSelected = await category.locator('.ring-blue-500').isVisible();
      if (isSelected) break;
      
      await this.navigateNext();
      attempts++;
    }
    
    await this.selectCurrent();
  }

  async selectSubcategory(subcategoryName: string) {
    const subcategory = await this.getSubcategoryByName(subcategoryName);
    
    // Navigate to the subcategory using keyboard
    let attempts = 0;
    while (attempts < 15) {
      const isSelected = await subcategory.locator('.ring-blue-500').isVisible();
      if (isSelected) break;
      
      await this.navigateNext();
      attempts++;
    }
    
    await this.selectCurrent();
  }

  async selectMagnet(index: number = 0) {
    // Navigate to the specific magnet using keyboard
    for (let i = 0; i < index; i++) {
      await this.navigateNext();
    }
    
    await this.selectCurrent();
  }

  async getVisibleOptions() {
    const mode = await this.getCurrentMode();
    
    switch (mode) {
      case 'category':
        return this.categoryGrid.locator('[data-testid^="category-"]').all();
      case 'subcategory':
        return this.subcategoryGrid.locator('[data-testid^="subcategory-"]').all();
      case 'magnets':
        return this.magnetGrid.locator('[data-testid^="magnet-"]').all();
      default:
        return [];
    }
  }

  async getSelectedIndex() {
    const selectedIndicator = await this.getSelectedIndicator();
    if (!await selectedIndicator.isVisible()) return -1;
    
    // Find which option has the selected indicator
    const options = await this.getVisibleOptions();
    for (let i = 0; i < options.length; i++) {
      const hasIndicator = await options[i].locator('.bg-blue-500.text-white.rounded-full').isVisible();
      if (hasIndicator) return i;
    }
    
    return -1;
  }

  async waitForTransition() {
    // Wait for any animations or transitions to complete
    await this.page.waitForTimeout(300);
  }
}