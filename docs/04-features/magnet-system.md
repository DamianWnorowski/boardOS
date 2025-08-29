---
title: Magnet System
category: features
tags: [magnets, attachments, business-rules, resource-linking]
related: [/04-features/drag-and-drop.md, /02-api/database-service.md]
last-updated: 2025-08-29
---

# Magnet System

## Quick Answer
The Magnet System is BoardOS's core business logic engine that enforces safety rules and operational requirements through automatic resource attachments, ensuring equipment always has qualified operators and maintaining proper crew relationships.

## Overview

The Magnet System represents resources as "magnets" that can attract and attach to each other based on business rules. This metaphor provides an intuitive way to manage complex resource relationships like operator-equipment assignments, driver-truck pairings, and crew formations.

## Core Concepts

### Magnet Class Architecture

```typescript
class Magnet {
  id: string;
  type: ResourceType;
  status: MagnetStatus;
  jobId?: string;
  assignments: Assignment[];
  attachedMagnets: Magnet[];
  
  // Core magnet operations
  canAttachTo(target: Magnet): boolean;
  attachTo(target: Magnet): void;
  detachFrom(target: Magnet): void;
  
  // Business rule validation
  validateRequirements(): ValidationResult;
  getRequiredAttachments(): ResourceType[];
  getMissingRequirements(): Requirement[];
  
  // State management
  startDrag(): void;
  endDrag(): void;
  updatePosition(jobId: string, row: RowType): void;
}
```

### Magnet Status Types

```typescript
enum MagnetStatus {
  AVAILABLE = 'available',        // Not assigned
  ASSIGNED = 'assigned',          // Assigned to job
  ATTACHED = 'attached',          // Attached to another magnet
  DRAGGING = 'dragging',          // Being dragged
  INVALID = 'invalid',            // Missing requirements
  LOCKED = 'locked'               // Cannot be modified
}
```

## Attachment Rules Engine

### Rule Configuration

```typescript
interface MagnetInteractionRule {
  id: string;
  sourceType: ResourceType;       // Type that can attach
  targetType: ResourceType;       // Type to attach to
  canAttach: boolean;             // Is attachment allowed
  isRequired: boolean;            // Is attachment mandatory
  maxCount: number;               // Maximum attachments
  conditions?: RuleCondition[];   // Additional conditions
}

// Example rules
const interactionRules: MagnetInteractionRule[] = [
  {
    sourceType: 'operator',
    targetType: 'excavator',
    canAttach: true,
    isRequired: true,
    maxCount: 1
  },
  {
    sourceType: 'driver',
    targetType: 'truck',
    canAttach: true,
    isRequired: true,
    maxCount: 1
  },
  {
    sourceType: 'screwman',
    targetType: 'paver',
    canAttach: true,
    isRequired: false,
    maxCount: 2
  }
];
```

### Rule Validation

```typescript
class MagnetRuleValidator {
  validateAttachment(
    source: Magnet,
    target: Magnet
  ): ValidationResult {
    // 1. Check if rule exists
    const rule = this.findRule(source.type, target.type);
    if (!rule || !rule.canAttach) {
      return {
        valid: false,
        reason: 'Attachment not allowed between these types'
      };
    }
    
    // 2. Check max count
    const currentAttachments = target.attachedMagnets
      .filter(m => m.type === source.type).length;
    
    if (currentAttachments >= rule.maxCount) {
      return {
        valid: false,
        reason: `Maximum ${rule.maxCount} ${source.type}(s) already attached`
      };
    }
    
    // 3. Check conditions
    if (rule.conditions) {
      for (const condition of rule.conditions) {
        if (!this.evaluateCondition(condition, source, target)) {
          return {
            valid: false,
            reason: condition.failureMessage
          };
        }
      }
    }
    
    return { valid: true };
  }
}
```

## Safety Requirements

### Equipment Operator Requirements

```typescript
class EquipmentSafetyValidator {
  validateEquipmentSafety(equipment: Magnet): SafetyStatus {
    // Equipment must have operator before job assignment
    const hasOperator = equipment.attachedMagnets
      .some(m => m.type === 'operator');
    
    if (!hasOperator) {
      return {
        safe: false,
        violations: ['Equipment requires operator for safety'],
        canAssign: false
      };
    }
    
    // Check operator certifications
    const operator = equipment.attachedMagnets
      .find(m => m.type === 'operator');
    
    if (!this.hasRequiredCertifications(operator, equipment)) {
      return {
        safe: false,
        violations: ['Operator lacks required certifications'],
        canAssign: false
      };
    }
    
    return { safe: true, canAssign: true };
  }
}
```

### Truck Driver Requirements

```typescript
class TruckSafetyValidator {
  validateTruckSafety(truck: Magnet): SafetyStatus {
    const driver = truck.attachedMagnets
      .find(m => m.type === 'driver');
    
    if (!driver) {
      return {
        safe: false,
        violations: ['Truck requires driver'],
        canAssign: false
      };
    }
    
    // Check CDL requirements
    if (truck.subType === '10W' && !driver.hasCDL) {
      return {
        safe: false,
        violations: ['10W truck requires CDL-licensed driver'],
        canAssign: false
      };
    }
    
    return { safe: true, canAssign: true };
  }
}
```

## Automatic Attachment System

### Smart Attachment on Drop

```typescript
class AutoAttachmentHandler {
  async handleResourceDrop(
    resource: Resource,
    targetJob: Job,
    dropZone: DropZone
  ): Promise<AttachmentResult> {
    const magnet = new Magnet(resource);
    
    // 1. Find potential attachment targets
    const targets = this.findAttachmentTargets(magnet, targetJob);
    
    if (targets.length === 0) {
      // No attachment needed - assign directly
      return this.assignDirectly(magnet, targetJob, dropZone);
    }
    
    // 2. Prioritize targets
    const prioritizedTargets = this.prioritizeTargets(targets, magnet);
    
    // 3. Attempt attachment to best target
    for (const target of prioritizedTargets) {
      const validation = this.validator.validateAttachment(magnet, target);
      
      if (validation.valid) {
        return this.createAttachment(magnet, target, targetJob);
      }
    }
    
    // 4. Handle attachment failure
    return this.handleAttachmentFailure(magnet, targets);
  }
  
  private prioritizeTargets(
    targets: Magnet[],
    source: Magnet
  ): Magnet[] {
    return targets.sort((a, b) => {
      // Prioritize equipment without operators
      const aMissing = a.getMissingRequirements().length;
      const bMissing = b.getMissingRequirements().length;
      
      if (aMissing !== bMissing) {
        return bMissing - aMissing; // More missing = higher priority
      }
      
      // Then by proximity
      return this.calculateProximity(source, a) - 
             this.calculateProximity(source, b);
    });
  }
}
```

### Cascade Attachments

```typescript
class CascadeAttachmentManager {
  async createCascadeAttachment(
    primaryMagnet: Magnet,
    attachments: Magnet[],
    targetJob: Job
  ): Promise<CascadeResult> {
    const results: Assignment[] = [];
    
    // 1. Assign primary magnet
    const primaryAssignment = await this.assignMagnet(
      primaryMagnet,
      targetJob
    );
    results.push(primaryAssignment);
    
    // 2. Attach and assign secondaries
    for (const attachment of attachments) {
      // Create attachment relationship
      attachment.attachTo(primaryMagnet);
      
      // Create assignment linked to primary
      const secondaryAssignment = await this.assignMagnet(
        attachment,
        targetJob,
        primaryAssignment.id // Link to primary
      );
      
      results.push(secondaryAssignment);
    }
    
    return {
      success: true,
      assignments: results,
      primaryId: primaryAssignment.id
    };
  }
}
```

## Magnet Groups

### Group Formation

```typescript
class MagnetGroup {
  id: string;
  mainMagnet: Magnet;
  attachedMagnets: Magnet[];
  
  // Group operations
  moveGroup(targetJob: Job): Promise<void>;
  detachMember(magnet: Magnet): void;
  addMember(magnet: Magnet): boolean;
  
  // Validation
  validateGroup(): ValidationResult;
  canMoveAsGroup(): boolean;
  
  // Visualization
  getBoundingBox(): Rectangle;
  getLayoutPositions(): Map<Magnet, Position>;
}

// Group management
class MagnetGroupManager {
  createGroup(mainMagnet: Magnet): MagnetGroup {
    const group = new MagnetGroup();
    group.mainMagnet = mainMagnet;
    
    // Recursively add all attachments
    this.collectAttachments(mainMagnet, group);
    
    return group;
  }
  
  private collectAttachments(
    magnet: Magnet,
    group: MagnetGroup,
    visited = new Set<string>()
  ): void {
    if (visited.has(magnet.id)) return;
    visited.add(magnet.id);
    
    for (const attached of magnet.attachedMagnets) {
      group.attachedMagnets.push(attached);
      this.collectAttachments(attached, group, visited);
    }
  }
}
```

## Visual Feedback System

### Attachment Indicators

```typescript
const AttachmentIndicator: React.FC<{ magnet: Magnet }> = ({ magnet }) => {
  const getIndicatorStatus = () => {
    if (magnet.getMissingRequirements().length > 0) {
      return 'missing-requirements';
    }
    if (magnet.attachedMagnets.length > 0) {
      return 'has-attachments';
    }
    if (magnet.canAcceptAttachments()) {
      return 'can-accept';
    }
    return 'normal';
  };
  
  return (
    <div className={`attachment-indicator ${getIndicatorStatus()}`}>
      {magnet.getMissingRequirements().map(req => (
        <MissingRequirement key={req.type} requirement={req} />
      ))}
      {magnet.attachedMagnets.map(attached => (
        <AttachedMagnet key={attached.id} magnet={attached} />
      ))}
    </div>
  );
};
```

### Magnetic Field Visualization

```typescript
const MagneticField: React.FC<{ magnet: Magnet }> = ({ magnet }) => {
  const [fieldStrength, setFieldStrength] = useState(0);
  
  useEffect(() => {
    // Calculate field strength based on requirements
    const strength = magnet.getMissingRequirements().length * 20;
    setFieldStrength(Math.min(strength, 100));
  }, [magnet]);
  
  return (
    <div 
      className="magnetic-field"
      style={{
        background: `radial-gradient(circle, 
          rgba(59, 130, 246, ${fieldStrength / 100}) 0%, 
          transparent 70%)`
      }}
    >
      <div className="field-pulse" />
    </div>
  );
};
```

## Complex Attachment Scenarios

### Multi-Level Attachments

```typescript
class MultiLevelAttachment {
  // Paver → Screwman → Helper structure
  createMultiLevelStructure(
    paver: Magnet,
    screwmen: Magnet[],
    helpers: Magnet[]
  ): AttachmentStructure {
    const structure = new AttachmentStructure();
    
    // Level 1: Attach screwmen to paver
    for (const screwman of screwmen.slice(0, 2)) { // Max 2
      paver.attachTo(screwman);
      structure.addLevel1(screwman);
      
      // Level 2: Attach helpers to screwmen
      const screwmanHelpers = helpers.splice(0, 1); // 1 helper per screwman
      for (const helper of screwmanHelpers) {
        screwman.attachTo(helper);
        structure.addLevel2(helper, screwman);
      }
    }
    
    return structure;
  }
}
```

### Conditional Attachments

```typescript
class ConditionalAttachmentRules {
  evaluateConditions(
    source: Magnet,
    target: Magnet,
    context: JobContext
  ): boolean {
    // Time-based conditions
    if (context.shift === 'night' && source.type === 'operator') {
      return source.hasNightCertification;
    }
    
    // Job-type conditions
    if (context.jobType === 'highway' && target.type === 'truck') {
      return source.hasHighwayExperience;
    }
    
    // Weather conditions
    if (context.weather === 'rain' && target.type === 'equipment') {
      return source.hasWeatherTraining;
    }
    
    return true;
  }
}
```

## Performance Optimizations

### Attachment Cache

```typescript
class AttachmentCache {
  private cache = new Map<string, ValidationResult>();
  
  getCacheKey(source: Magnet, target: Magnet): string {
    return `${source.id}-${target.id}`;
  }
  
  getValidation(source: Magnet, target: Magnet): ValidationResult | null {
    const key = this.getCacheKey(source, target);
    return this.cache.get(key) || null;
  }
  
  setValidation(
    source: Magnet,
    target: Magnet,
    result: ValidationResult
  ): void {
    const key = this.getCacheKey(source, target);
    this.cache.set(key, result);
    
    // Expire after 5 minutes
    setTimeout(() => this.cache.delete(key), 5 * 60 * 1000);
  }
}
```

### Batch Attachment Operations

```typescript
class BatchAttachmentProcessor {
  async processBatchAttachments(
    operations: AttachmentOperation[]
  ): Promise<BatchResult> {
    // Sort operations to avoid conflicts
    const sorted = this.sortByDependency(operations);
    
    // Process in parallel where possible
    const groups = this.groupIndependentOperations(sorted);
    
    const results = await Promise.all(
      groups.map(group => this.processGroup(group))
    );
    
    return this.consolidateResults(results);
  }
}
```

## Integration with UI

### React Hook for Magnets

```typescript
const useMagnet = (resourceId: string) => {
  const magnet = useMemo(() => new Magnet(resourceId), [resourceId]);
  const [attachments, setAttachments] = useState<Magnet[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  
  const attachTo = useCallback(async (targetId: string) => {
    const target = getMagnet(targetId);
    const validation = validateAttachment(magnet, target);
    
    if (validation.valid) {
      await DatabaseService.attachResources(magnet.id, target.id);
      setAttachments(prev => [...prev, target]);
    }
    
    return validation;
  }, [magnet]);
  
  const detachFrom = useCallback(async (targetId: string) => {
    await DatabaseService.detachResources(magnet.id, targetId);
    setAttachments(prev => prev.filter(m => m.id !== targetId));
  }, [magnet]);
  
  useEffect(() => {
    setRequirements(magnet.getMissingRequirements());
  }, [attachments]);
  
  return {
    magnet,
    attachments,
    requirements,
    attachTo,
    detachFrom,
    canDrag: requirements.length === 0,
    isComplete: requirements.length === 0
  };
};
```

## Testing Magnet Rules

### Rule Testing Framework

```typescript
describe('Magnet Attachment Rules', () => {
  it('should require operator for equipment', () => {
    const excavator = new Magnet({ type: 'excavator' });
    const operator = new Magnet({ type: 'operator' });
    
    expect(excavator.getMissingRequirements()).toContainEqual({
      type: 'operator',
      required: true
    });
    
    excavator.attachTo(operator);
    expect(excavator.getMissingRequirements()).toHaveLength(0);
  });
  
  it('should limit paver to 2 screwmen', () => {
    const paver = new Magnet({ type: 'paver' });
    const screwmen = Array(3).fill(null).map(() => 
      new Magnet({ type: 'screwman' })
    );
    
    paver.attachTo(screwmen[0]); // Success
    paver.attachTo(screwmen[1]); // Success
    
    const result = paver.attachTo(screwmen[2]); // Should fail
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Maximum 2');
  });
});
```

The Magnet System provides a robust, intuitive framework for managing complex resource relationships while enforcing critical safety and operational requirements throughout the scheduling process.