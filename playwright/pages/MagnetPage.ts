import { Page, Locator } from '@playwright/test';

export class MagnetPage {
  readonly page: Page;
  readonly magnetContainer: Locator;
  readonly attachmentIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.magnetContainer = page.locator('[data-testid="magnet-container"]');
    this.attachmentIndicator = page.locator('[data-testid="attachment-indicator"]');
  }

  async getMagnet(resourceId: string): Promise<Locator> {
    return this.magnetContainer.locator(`[data-magnet-id="${resourceId}"]`);
  }

  async dragMagnetToTarget(magnetId: string, targetId: string) {
    const magnet = await this.getMagnet(magnetId);
    const target = await this.getMagnet(targetId);
    
    await magnet.dragTo(target);
  }

  async verifyAttachment(parentId: string, childId: string): Promise<boolean> {
    const parent = await this.getMagnet(parentId);
    const attachedChildren = parent.locator(`[data-attached-to="${parentId}"]`);
    const hasChild = await attachedChildren.locator(`[data-magnet-id="${childId}"]`).isVisible();
    
    return hasChild;
  }

  async getAttachedResources(parentId: string): Promise<string[]> {
    const parent = await this.getMagnet(parentId);
    const attached = await parent.locator('[data-attached-to]').all();
    
    const ids: string[] = [];
    for (const element of attached) {
      const id = await element.getAttribute('data-magnet-id');
      if (id) ids.push(id);
    }
    
    return ids;
  }

  async detachResource(childId: string) {
    const child = await this.getMagnet(childId);
    const dropZone = this.page.locator('[data-testid="detach-zone"]');
    
    await child.dragTo(dropZone);
  }

  async canAttach(parentType: string, childType: string): Promise<boolean> {
    // This would check the UI indicators or attempt a drag and verify
    const testParent = await this.magnetContainer.locator(`[data-resource-type="${parentType}"]`).first();
    const testChild = await this.magnetContainer.locator(`[data-resource-type="${childType}"]`).first();
    
    if (!testParent || !testChild) return false;
    
    // Check for attachment eligibility indicators
    const parentClasses = await testParent.getAttribute('class') || '';
    const childClasses = await testChild.getAttribute('class') || '';
    
    return parentClasses.includes('can-receive-attachment') && 
           childClasses.includes('can-attach');
  }

  async getAttachmentLimit(resourceType: string): Promise<number> {
    const resource = await this.magnetContainer.locator(`[data-resource-type="${resourceType}"]`).first();
    const limitAttr = await resource.getAttribute('data-attachment-limit');
    
    return limitAttr ? parseInt(limitAttr, 10) : 0;
  }

  async isAttachmentFull(parentId: string): Promise<boolean> {
    const parent = await this.getMagnet(parentId);
    const isFull = await parent.getAttribute('data-attachment-full');
    
    return isFull === 'true';
  }

  async getVisualIndicator(magnetId: string) {
    const magnet = await this.getMagnet(magnetId);
    const classes = await magnet.getAttribute('class') || '';
    
    return {
      hasOperator: classes.includes('has-operator'),
      hasDriver: classes.includes('has-driver'),
      hasScrewmen: classes.includes('has-screwmen'),
      isAttached: classes.includes('is-attached'),
      canAttach: classes.includes('can-attach'),
      canReceiveAttachment: classes.includes('can-receive-attachment')
    };
  }
}