import { Page, Locator } from '@playwright/test';

export class CompactQuickSelectPage {
  readonly page: Page;
  readonly overlay: Locator;
  readonly title: Locator;
  readonly helpText: Locator;
  readonly backButton: Locator;
  readonly closeButton: Locator;
  readonly categoryGrid: Locator;
  readonly subcategoryGrid: Locator;
  readonly magnetGrid: Locator;

  constructor(page: Page) {
    this.page = page;
    this.overlay = page.locator('[data-testid="compact-quick-select"]');
    this.title = this.overlay.locator('h2');
    this.helpText = this.overlay.locator('.text-gray-500').last();
    this.backButton = this.overlay.locator('button[title="Go back"]');
    this.closeButton = this.overlay.locator('button[title="Close (Esc)"]');
    this.categoryGrid = page.locator('[data-testid="compact-categories"]');
    this.subcategoryGrid = page.locator('[data-testid="compact-subcategories"]');
    this.magnetGrid = page.locator('[data-testid="compact-magnets"]');
  }

  async openQuickSelect() {
    await this.page.keyboard.press('Tab');
    await this.overlay.waitFor({ state: 'visible' });
  }

  async closeQuickSelect() {
    await this.page.keyboard.press('Escape');
    await this.overlay.waitFor({ state: 'hidden' });
  }

  async closeWithButton() {
    await this.closeButton.click();
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

  async goBackWithButton() {
    await this.backButton.click();
  }

  async quickSelectByNumber(number: number) {
    if (number < 1 || number > 9) {
      throw new Error('Quick select number must be between 1-9');
    }
    await this.page.keyboard.press(number.toString());
  }

  async getCategoryByName(name: string) {
    return this.categoryGrid.locator(`[data-testid="compact-category-${name}"]`);
  }

  async getSubcategoryByName(name: string) {
    return this.subcategoryGrid.locator(`[data-testid="compact-subcategory-${name.toLowerCase()}"]`);
  }

  async getMagnetByType(type: string, index: number = 0) {
    return this.magnetGrid.locator(`[data-testid="compact-magnet-${type}-${index}"]`);
  }

  async getDraggableMagnetByType(type: string, index: number = 0) {
    return this.magnetGrid.locator(`[data-testid="compact-magnet-${type}-${index}"]`);
  }

  async getSelectedIndicator() {
    return this.overlay.locator('.ring-2.ring-blue-400').first();
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

  async getCurrentMode() {
    const title = await this.getTitle();
    if (title?.includes('Select Category')) return 'category';
    if (title?.includes('Select Equipment')) return 'subcategory';
    if (title?.includes('Select')) return 'magnets';
    return 'unknown';
  }

  async clickCategory(categoryName: string) {
    const category = await this.getCategoryByName(categoryName);
    await category.click();
  }

  async clickSubcategory(subcategoryName: string) {
    const subcategory = await this.getSubcategoryByName(subcategoryName);
    await subcategory.click();
  }

  async clickMagnet(type: string, index: number = 0) {
    const magnet = await this.getMagnetByType(type, index);
    await magnet.click();
  }

  async dragMagnetTo(type: string, targetSelector: string, index: number = 0) {
    const draggableMagnet = await this.getDraggableMagnetByType(type, index);
    const target = this.page.locator(targetSelector);
    
    await draggableMagnet.dragTo(target);
  }

  async startDragMagnet(type: string, index: number = 0) {
    const draggableMagnet = await this.getDraggableMagnetByType(type, index);
    const box = await draggableMagnet.boundingBox();
    
    if (box) {
      await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await this.page.mouse.down();
      // Move slightly to start drag
      await this.page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2 + 5);
    }
  }

  async getCategoryAvailableCount(categoryName: string) {
    const category = await this.getCategoryByName(categoryName);
    const countBadge = category.locator('.bg-gray-800.text-white').first();
    const count = await countBadge.textContent();
    return count ? parseInt(count) : 0;
  }

  async getSubcategoryAvailableCount(subcategoryName: string) {
    const subcategory = await this.getSubcategoryByName(subcategoryName);
    const countBadge = subcategory.locator('.bg-gray-800.text-white').first();
    const count = await countBadge.textContent();
    return count ? parseInt(count) : 0;
  }

  async isCategoryDisabled(categoryName: string) {
    const category = await this.getCategoryByName(categoryName);
    const opacity = await category.getAttribute('class');
    return opacity?.includes('opacity-50') || false;
  }

  async isSubcategoryDisabled(subcategoryName: string) {
    const subcategory = await this.getSubcategoryByName(subcategoryName);
    const opacity = await subcategory.getAttribute('class');
    return opacity?.includes('opacity-50') || false;
  }

  async getVisibleOptions() {
    const mode = await this.getCurrentMode();
    
    switch (mode) {
      case 'category':
        return this.categoryGrid.locator('[data-testid^="compact-category-"]').all();
      case 'subcategory':
        return this.subcategoryGrid.locator('[data-testid^="compact-subcategory-"]').all();
      case 'magnets':
        return this.magnetGrid.locator('[data-testid^="compact-magnet-"]').all();
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
      const hasIndicator = await options[i].locator('.ring-2.ring-blue-400').isVisible();
      if (hasIndicator) return i;
    }
    
    return -1;
  }

  async waitForTransition() {
    // Wait for any animations or transitions to complete
    await this.page.waitForTimeout(300);
  }

  async waitForOverlayClosed() {
    await this.overlay.waitFor({ state: 'hidden' });
  }
}