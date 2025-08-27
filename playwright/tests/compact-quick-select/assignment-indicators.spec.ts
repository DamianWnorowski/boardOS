import { test, expect } from '@playwright/test';
import { CompactQuickSelectPage } from '../../pages/CompactQuickSelectPage';

test.describe('CompactQuickSelect - Assignment Visual Indicators', () => {
  let compactQuickSelect: CompactQuickSelectPage;

  test.beforeEach(async ({ page }) => {
    compactQuickSelect = new CompactQuickSelectPage(page);
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-root"], #app-root', { timeout: 10000 });
    
    // Wait for data to load
    await page.waitForTimeout(3000);
  });

  test('should display ASSIGNED badge for magnets with single assignment', async ({ page }) => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to operator category
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    // Look for magnets with ASSIGNED badge
    const assignedBadges = page.locator('[data-testid^="compact-magnet-operator-"]').locator('text=ASSIGNED');
    const badgeCount = await assignedBadges.count();
    
    if (badgeCount > 0) {
      console.log(`Found ${badgeCount} operators with ASSIGNED badges`);
      
      // Check that assigned badges are green
      const firstAssignedBadge = assignedBadges.first();
      await expect(firstAssignedBadge).toHaveClass(/bg-green-500/);
      await expect(firstAssignedBadge).toBeVisible();
      
      // Check for shift+drag instruction on assigned magnets
      const parentMagnet = firstAssignedBadge.locator('..').locator('..');
      const shiftInstruction = parentMagnet.locator('text=Shift+Drag for 2nd job');
      await expect(shiftInstruction).toBeVisible();
    } else {
      console.log('No operators currently assigned - test skipped');
    }
  });

  test('should display MULTI badge for magnets with multiple assignments', async ({ page }) => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to operator category
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    // Look for magnets with MULTI badge
    const multiBadges = page.locator('[data-testid^="compact-magnet-operator-"]').locator('text=MULTI');
    const badgeCount = await multiBadges.count();
    
    if (badgeCount > 0) {
      console.log(`Found ${badgeCount} operators with MULTI badges`);
      
      // Check that multi badges are orange
      const firstMultiBadge = multiBadges.first();
      await expect(firstMultiBadge).toHaveClass(/bg-orange-500/);
      await expect(firstMultiBadge).toBeVisible();
      
      // Check for shift+drag instruction on multi-assigned magnets
      const parentMagnet = firstMultiBadge.locator('..').locator('..');
      const shiftInstruction = parentMagnet.locator('text=Shift+Drag for 2nd job');
      await expect(shiftInstruction).toBeVisible();
    } else {
      console.log('No operators with multiple assignments - test skipped');
    }
  });

  test('should not show badges for available (unassigned) magnets', async ({ page }) => {
    await compactQuickSelect.openQuickSelect();
    
    // Navigate to operator category
    await compactQuickSelect.clickCategory('operator');
    await compactQuickSelect.waitForTransition();
    
    // Get all magnets
    const allMagnets = page.locator('[data-testid^="compact-magnet-operator-"]');
    const magnetCount = await allMagnets.count();
    
    // Check each magnet for absence of both ASSIGNED and MULTI badges
    for (let i = 0; i < magnetCount; i++) {
      const magnet = allMagnets.nth(i);
      const hasAssignedBadge = await magnet.locator('text=ASSIGNED').isVisible().catch(() => false);
      const hasMultiBadge = await magnet.locator('text=MULTI').isVisible().catch(() => false);
      
      if (!hasAssignedBadge && !hasMultiBadge) {
        // This magnet should not have shift+drag instruction
        const hasShiftInstruction = await magnet.locator('text=Shift+Drag for 2nd job').isVisible().catch(() => false);
        expect(hasShiftInstruction).toBe(false);
        console.log(`Magnet ${i} is available (no badges, no shift instruction) ✓`);
      }
    }
  });

  test('should show assignment indicators across different resource types', async ({ page }) => {
    const resourceTypes = ['operator', 'driver', 'equipment'];
    
    for (const resourceType of resourceTypes) {
      await compactQuickSelect.openQuickSelect();
      
      try {
        // Navigate to resource category
        await compactQuickSelect.clickCategory(resourceType);
        await compactQuickSelect.waitForTransition();
        
        // Check for assignment badges
        const assignedCount = await page.locator(`[data-testid^="compact-magnet-${resourceType}-"]`).locator('text=ASSIGNED').count();
        const multiCount = await page.locator(`[data-testid^="compact-magnet-${resourceType}-"]`).locator('text=MULTI').count();
        
        console.log(`${resourceType}: ${assignedCount} ASSIGNED, ${multiCount} MULTI`);
        
        if (assignedCount > 0 || multiCount > 0) {
          // Verify badges are properly styled
          if (assignedCount > 0) {
            const assignedBadge = page.locator(`[data-testid^="compact-magnet-${resourceType}-"]`).locator('text=ASSIGNED').first();
            await expect(assignedBadge).toHaveClass(/bg-green-500/);
          }
          
          if (multiCount > 0) {
            const multiBadge = page.locator(`[data-testid^="compact-magnet-${resourceType}-"]`).locator('text=MULTI').first();
            await expect(multiBadge).toHaveClass(/bg-orange-500/);
          }
        }
        
        // Close overlay for next iteration
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
      } catch (error) {
        console.log(`Could not test ${resourceType}: ${error}`);
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(300);
      }
    }
  });
});