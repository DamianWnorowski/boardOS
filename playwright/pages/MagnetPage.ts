import { Page, Locator } from '@playwright/test';

export class MagnetPage {
  readonly page: Page;
  readonly truckDriverSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.truckDriverSection = page.locator('[data-testid="truck-driver-section"]');
  }

  // Get a truck card by ID
  async getTruckCard(truckId: string): Promise<Locator> {
    return this.page.locator(`[data-testid="truck-card-${truckId}"]`);
  }

  // Get a resource card by ID
  async getResourceCard(resourceId: string): Promise<Locator> {
    return this.page.locator(`[data-testid="resource-card-${resourceId}"]`);
  }

  // Get any draggable element by resource ID - updated to use proper selectors
  async getMagnet(resourceId: string): Promise<Locator> {
    // Try to find truck card first, then resource card
    const truckCard = this.page.locator(`[data-testid="truck-card-${resourceId}"]`);
    const resourceCard = this.page.locator(`[data-testid="resource-card-${resourceId}"]`);
    
    if (await truckCard.count() > 0) {
      return truckCard;
    } else if (await resourceCard.count() > 0) {
      return resourceCard;
    } else {
      // Fallback to data-resource-id attribute
      return this.page.locator(`[data-resource-id="${resourceId}"]`);
    }
  }

  async dragMagnetToTarget(sourceId: string, targetId: string) {
    const source = await this.getMagnet(sourceId);
    const target = await this.getMagnet(targetId);
    
    await source.dragTo(target);
  }

  async verifyAttachment(parentId: string, childId: string): Promise<boolean> {
    // Check if truck has driver by looking at data attributes
    const parentElement = await this.getMagnet(parentId);
    const hasDriver = await parentElement.getAttribute('data-has-driver');
    
    // If this is a truck-driver relationship, check the data attribute
    if (hasDriver !== null) {
      return hasDriver === 'true';
    }
    
    // For other attachment types, check if child exists near parent
    const parent = await this.getMagnet(parentId);
    const child = await this.getMagnet(childId);
    
    // Check if both elements are visible and close to each other
    const parentBounds = await parent.boundingBox();
    const childBounds = await child.boundingBox();
    
    if (!parentBounds || !childBounds) return false;
    
    // Consider attached if elements are within reasonable distance
    const distance = Math.sqrt(
      Math.pow(parentBounds.x - childBounds.x, 2) + 
      Math.pow(parentBounds.y - childBounds.y, 2)
    );
    
    return distance < 200; // 200px threshold for attachment
  }

  async getAttachedResources(parentId: string): Promise<string[]> {
    // For trucks, check if they have drivers
    const truckCard = await this.getTruckCard(parentId);
    const hasDriver = await truckCard.getAttribute('data-has-driver');
    
    if (hasDriver === 'true') {
      // Find the driver associated with this truck
      // This is a simplified approach - in real implementation you'd need
      // to query the truck-driver relationship
      return ['driver-id']; // Placeholder
    }
    
    return [];
  }

  async detachResource(childId: string) {
    const child = await this.getMagnet(childId);
    
    // Try to find a detach zone or empty area
    const detachZone = this.page.locator('[data-testid="detach-zone"]');
    
    if (await detachZone.count() > 0) {
      await child.dragTo(detachZone);
    } else {
      // Drag to an empty area
      await child.dragTo(this.page.locator('body'), { position: { x: 100, y: 100 } });
    }
  }

  async canAttach(parentType: string, childType: string): Promise<boolean> {
    // Check based on business rules
    const validAttachments = {
      'truck': ['driver', 'privateDriver'],
      'excavator': ['operator'],
      'paver': ['operator', 'screwman']
    };
    
    return validAttachments[parentType]?.includes(childType) || false;
  }

  async getAttachmentLimit(resourceType: string): Promise<number> {
    // Return attachment limits based on resource type
    const limits = {
      'truck': 1, // 1 driver
      'excavator': 1, // 1 operator
      'paver': 3, // 1 operator + 2 screwmen
      'skidsteer': 1 // 1 operator
    };
    
    return limits[resourceType] || 0;
  }

  async isAttachmentFull(parentId: string): Promise<boolean> {
    const parentElement = await this.getMagnet(parentId);
    const resourceType = await parentElement.getAttribute('data-resource-type') || '';
    
    const maxAttachments = await this.getAttachmentLimit(resourceType);
    const currentAttachments = await this.getAttachedResources(parentId);
    
    return currentAttachments.length >= maxAttachments;
  }

  async getVisualIndicator(magnetId: string) {
    const element = await this.getMagnet(magnetId);
    const resourceType = await element.getAttribute('data-resource-type');
    const hasDriver = await element.getAttribute('data-has-driver');
    const isAssigned = await element.getAttribute('data-assigned');
    const isDisabled = await element.getAttribute('data-disabled');
    
    return {
      hasOperator: resourceType === 'excavator' || resourceType === 'paver',
      hasDriver: hasDriver === 'true',
      hasScrewmen: resourceType === 'paver',
      isAttached: hasDriver === 'true',
      canAttach: !isDisabled,
      canReceiveAttachment: resourceType === 'truck' || resourceType === 'excavator' || resourceType === 'paver',
      isAssigned: isAssigned === 'true'
    };
  }

  // Helper methods for truck-specific operations
  async getTrucksByCategory(category: '10w' | 'trac' | 'other'): Promise<Locator[]> {
    const containerSelector = `[data-testid="${category}-trucks-container"]`;
    const container = this.page.locator(containerSelector);
    
    if (await container.count() === 0) return [];
    
    return await container.locator('[data-testid^="truck-card-"]').all();
  }

  async verifyTruckInCategory(truckId: string, category: '10w' | 'trac' | 'other'): Promise<boolean> {
    const trucks = await this.getTrucksByCategory(category);
    
    for (const truck of trucks) {
      const truckIdAttr = await truck.getAttribute('data-truck-id');
      if (truckIdAttr === truckId) {
        return true;
      }
    }
    
    return false;
  }
}