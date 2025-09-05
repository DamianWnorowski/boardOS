import { ResourceType } from '../types';

/**
 * Defines which resource types can be attached to each other
 */
export interface AttachmentRule {
  sourceType: ResourceType;
  targetType: ResourceType;
  canAttach: boolean;
  isRequired?: boolean;
  maxCount?: number;
  skillRequirements?: string[];
}

/**
 * Defines the attachment rules between different resource types
 */
export const attachmentRules: AttachmentRule[] = [
  // Paver rules
  {
    sourceType: 'operator',
    targetType: 'paver',
    canAttach: true,
    isRequired: true,
    maxCount: 1
  },
  {
    sourceType: 'laborer',
    targetType: 'paver',
    canAttach: true,
    maxCount: 2,
    skillRequirements: ['screwman']
  },
  
  // General equipment rules
  ...['roller', 'excavator', 'sweeper', 'millingMachine', 'dozer', 'payloader', 'skidsteer'].map(type => ({
    sourceType: 'operator',
    targetType: type as ResourceType,
    canAttach: true,
    isRequired: true,
    maxCount: 1
  })),
  
  // Truck rules
  {
    sourceType: 'driver',
    targetType: 'truck',
    canAttach: true,
    isRequired: true,
    maxCount: 1
  },
  {
    sourceType: 'laborer',
    targetType: 'truck',
    canAttach: true,
    maxCount: 1
  }
];

/**
 * Check if a resource type can be attached to another
 */
export function canAttach(sourceType: ResourceType, targetType: ResourceType): boolean {
  const rule = attachmentRules.find(r => 
    r.sourceType === sourceType && r.targetType === targetType
  );
  
  return rule?.canAttach || false;
}

/**
 * Get required attachments for a resource type
 */
export function getRequiredAttachments(type: ResourceType): ResourceType[] {
  return attachmentRules
    .filter(r => r.targetType === type && r.isRequired)
    .map(r => r.sourceType);
}

/**
 * Get maximum allowed attachments of a specific type
 */
export function getMaxAttachments(sourceType: ResourceType, targetType: ResourceType): number {
  const rule = attachmentRules.find(r => 
    r.sourceType === sourceType && r.targetType === targetType
  );
  
  return rule?.maxCount || 0;
}

/**
 * Check if a resource has all required attachments
 */
export function hasRequiredAttachments(
  type: ResourceType, 
  attachedTypes: ResourceType[]
): boolean {
  const requiredTypes = getRequiredAttachments(type);
  
  return requiredTypes.every(reqType => 
    attachedTypes.includes(reqType)
  );
}

/**
 * Get all valid attachment types for a resource
 */
export function getValidAttachmentTypes(type: ResourceType): ResourceType[] {
  return attachmentRules
    .filter(r => r.targetType === type && r.canAttach)
    .map(r => r.sourceType);
}

/**
 * Check if a resource requires specific skills
 */
export function getRequiredSkills(
  sourceType: ResourceType, 
  targetType: ResourceType
): string[] {
  const rule = attachmentRules.find(r => 
    r.sourceType === sourceType && r.targetType === targetType
  );
  
  return rule?.skillRequirements || [];
}

/**
 * Validate an attachment group
 */
export function validateAttachmentGroup(
  mainType: ResourceType,
  attachedTypes: ResourceType[]
): { 
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check required attachments
  const requiredTypes = getRequiredAttachments(mainType);
  const missingRequired = requiredTypes.filter(type => 
    !attachedTypes.includes(type)
  );
  
  if (missingRequired.length > 0) {
    errors.push(`Missing required attachments: ${missingRequired.join(', ')}`);
  }
  
  // Check max counts
  const typeCounts = attachedTypes.reduce((counts, type) => {
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  Object.entries(typeCounts).forEach(([type, count]) => {
    const maxAllowed = getMaxAttachments(type as ResourceType, mainType);
    if (maxAllowed && count > maxAllowed) {
      errors.push(`Too many ${type} attachments (max: ${maxAllowed})`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}