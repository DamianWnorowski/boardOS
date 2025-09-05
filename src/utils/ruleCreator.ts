import { ResourceType, MagnetInteractionRule, DropRule, RowType } from '../types';

/**
 * Modular rule creator utility for building scheduling rules
 */

export interface RuleTemplate {
  name: string;
  description: string;
  rules: MagnetInteractionRule[];
}

export interface DropRuleTemplate {
  name: string;
  description: string;
  rowType: RowType;
  allowedTypes: ResourceType[];
}

/**
 * Rule creator class for building magnet interaction rules
 */
export class MagnetRuleCreator {
  private rules: MagnetInteractionRule[] = [];

  /**
   * Add a basic attachment rule
   */
  addAttachmentRule(
    sourceType: ResourceType,
    targetType: ResourceType,
    options: {
      canAttach?: boolean;
      isRequired?: boolean;
      maxCount?: number;
    } = {}
  ): this {
    const rule: MagnetInteractionRule = {
      sourceType,
      targetType,
      canAttach: options.canAttach ?? true,
      isRequired: options.isRequired ?? false,
      maxCount: options.maxCount ?? 1
    };

    // Remove existing rule for this pair if it exists
    this.rules = this.rules.filter(r => 
      !(r.sourceType === sourceType && r.targetType === targetType)
    );

    this.rules.push(rule);
    return this;
  }

  /**
   * Add a required operator rule for equipment
   */
  addRequiredOperator(equipmentType: ResourceType): this {
    return this.addAttachmentRule('operator', equipmentType, {
      canAttach: true,
      isRequired: true,
      maxCount: 1
    });
  }

  /**
   * Add a required driver rule for vehicles
   */
  addRequiredDriver(vehicleType: ResourceType): this {
    return this.addAttachmentRule('driver', vehicleType, {
      canAttach: true,
      isRequired: true,
      maxCount: 1
    }).addAttachmentRule('privateDriver', vehicleType, {
      canAttach: true,
      isRequired: true,
      maxCount: 1
    });
  }

  /**
   * Add optional laborer attachment
   */
  addOptionalLaborer(targetType: ResourceType, maxCount: number = 1): this {
    return this.addAttachmentRule('laborer', targetType, {
      canAttach: true,
      isRequired: false,
      maxCount
    });
  }

  /**
   * Add multiple similar rules at once
   */
  addBulkRules(
    sourceType: ResourceType,
    targetTypes: ResourceType[],
    options: {
      canAttach?: boolean;
      isRequired?: boolean;
      maxCount?: number;
    } = {}
  ): this {
    targetTypes.forEach(targetType => {
      this.addAttachmentRule(sourceType, targetType, options);
    });
    return this;
  }

  /**
   * Remove a specific rule
   */
  removeRule(sourceType: ResourceType, targetType: ResourceType): this {
    this.rules = this.rules.filter(r => 
      !(r.sourceType === sourceType && r.targetType === targetType)
    );
    return this;
  }

  /**
   * Clear all rules
   */
  clear(): this {
    this.rules = [];
    return this;
  }

  /**
   * Get all created rules
   */
  getRules(): MagnetInteractionRule[] {
    return [...this.rules];
  }

  /**
   * Create rules from a template
   */
  fromTemplate(template: RuleTemplate): this {
    this.rules = [...template.rules];
    return this;
  }

  /**
   * Merge with existing rules (useful for extending defaults)
   */
  mergeWith(existingRules: MagnetInteractionRule[]): MagnetInteractionRule[] {
    const mergedRules = [...existingRules];
    
    this.rules.forEach(newRule => {
      const existingIndex = mergedRules.findIndex(r => 
        r.sourceType === newRule.sourceType && r.targetType === newRule.targetType
      );
      
      if (existingIndex !== -1) {
        mergedRules[existingIndex] = newRule;
      } else {
        mergedRules.push(newRule);
      }
    });
    
    return mergedRules;
  }
}

/**
 * Advanced rule creator with job-specific optimizations
 */
export class AdvancedRuleCreator extends MagnetRuleCreator {
  /**
   * Create rules optimized for a specific job type
   */
  createJobSpecificRules(jobType: 'milling' | 'paving' | 'both' | 'drainage' | 'stripping' | 'hired' | 'other'): this {
    // Start with base safety rules
    this.addRequiredOperator('paver')
        .addRequiredOperator('millingMachine')
        .addRequiredDriver('truck');
    
    switch (jobType) {
      case 'paving':
        this.addRequiredOperator('paver')
            .addRequiredOperator('roller')
            .addOptionalLaborer('paver', 2) // Screwmen
            .addRequiredDriver('truck')
            .addOptionalLaborer('truck', 1);
        break;
        
      case 'milling':
        this.addRequiredOperator('millingMachine')
            .addRequiredOperator('skidsteer')
            .addOptionalLaborer('millingMachine', 1) // Groundman
            .addRequiredDriver('truck');
        break;
        
      case 'both':
        this.addRequiredOperator('millingMachine')
            .addRequiredOperator('paver')
            .addRequiredOperator('roller')
            .addRequiredOperator('skidsteer')
            .addOptionalLaborer('paver', 2) // Screwmen
            .addOptionalLaborer('millingMachine', 1) // Groundman
            .addRequiredDriver('truck')
            .addOptionalLaborer('truck', 1);
        break;
        
      case 'drainage':
      case 'stripping':
        this.addRequiredOperator('excavator')
            .addRequiredOperator('skidsteer')
            .addRequiredDriver('truck')
            .addOptionalLaborer('truck', 1);
        break;
        
      case 'hired':
        // Minimal rules for hired operations
        this.addRequiredDriver('truck');
        break;
        
      default: // 'other'
        // Basic equipment operations
        this.addRequiredOperator('equipment')
            .addRequiredDriver('truck');
        break;
    }
    
    return this;
  }
  
  /**
   * Add conditional rules based on available resources
   */
  addConditionalRules(availableResourceTypes: ResourceType[]): this {
    const hasOperators = availableResourceTypes.includes('operator');
    const hasDrivers = availableResourceTypes.includes('driver');
    const hasLaborers = availableResourceTypes.includes('laborer');
    
    // Only add rules for available resource types
    if (hasOperators) {
      const equipmentTypes = availableResourceTypes.filter(type => 
        ['paver', 'roller', 'excavator', 'sweeper', 'millingMachine', 'dozer', 'payloader', 'skidsteer', 'grader', 'equipment'].includes(type)
      );
      this.addBulkRules('operator', equipmentTypes, { canAttach: true, isRequired: true, maxCount: 1 });
    }
    
    if (hasDrivers && availableResourceTypes.includes('truck')) {
      this.addRequiredDriver('truck');
    }
    
    if (hasLaborers) {
      if (availableResourceTypes.includes('paver')) {
        this.addOptionalLaborer('paver', 2);
      }
      if (availableResourceTypes.includes('millingMachine')) {
        this.addOptionalLaborer('millingMachine', 1);
      }
    }
    
    return this;
  }
  
  /**
   * Create safety-focused rules that prevent dangerous operations
   */
  addSafetyRules(): this {
    // Equipment without operators is dangerous
    const dangerousEquipment = ['paver', 'millingMachine', 'excavator', 'dozer'];
    dangerousEquipment.forEach(equipmentType => {
      this.addRequiredOperator(equipmentType);
    });
    
    // Vehicles without drivers cannot operate
    this.addRequiredDriver('truck');
    
    return this;
  }
}

/**
 * Drop rule creator class
 */
export class DropRuleCreator {
  private rules: DropRule[] = [];

  /**
   * Add a drop rule for a specific row type
   */
  addDropRule(rowType: RowType, allowedTypes: ResourceType[]): this {
    // Remove existing rule for this row type
    this.rules = this.rules.filter(r => r.rowType !== rowType);
    
    this.rules.push({ rowType, allowedTypes });
    return this;
  }

  /**
   * Add personnel-only row
   */
  addPersonnelRow(rowType: RowType): this {
    const personnelTypes: ResourceType[] = ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
    return this.addDropRule(rowType, personnelTypes);
  }

  /**
   * Add equipment-only row
   */
  addEquipmentRow(rowType: RowType): this {
    const equipmentTypes: ResourceType[] = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment'];
    return this.addDropRule(rowType, equipmentTypes);
  }

  /**
   * Add vehicle-only row
   */
  addVehicleRow(rowType: RowType): this {
    const vehicleTypes: ResourceType[] = ['truck'];
    return this.addDropRule(rowType, vehicleTypes);
  }

  /**
   * Add mixed row (equipment + operators)
   */
  addMixedEquipmentRow(rowType: RowType): this {
    const mixedTypes: ResourceType[] = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment', 'operator'];
    return this.addDropRule(rowType, mixedTypes);
  }

  /**
   * Get all created drop rules
   */
  getRules(): DropRule[] {
    return [...this.rules];
  }

  /**
   * Clear all rules
   */
  clear(): this {
    this.rules = [];
    return this;
  }
}

/**
 * Pre-built rule templates for common scenarios
 */
export const ruleTemplates: Record<string, RuleTemplate> = {
  standardConstruction: {
    name: 'Standard Construction Rules',
    description: 'Basic rules for typical construction operations',
    rules: new MagnetRuleCreator()
      // Equipment operator requirements
      .addRequiredOperator('paver')
      .addRequiredOperator('roller')
      .addRequiredOperator('excavator')
      .addRequiredOperator('sweeper')
      .addRequiredOperator('millingMachine')
      .addRequiredOperator('dozer')
      .addRequiredOperator('payloader')
      .addRequiredOperator('skidsteer')
      .addRequiredOperator('grader')
      .addRequiredOperator('equipment')
      
      // Vehicle driver requirements
      .addRequiredDriver('truck')
      
      // Optional laborer attachments
      .addOptionalLaborer('paver', 2) // Screwmen
      .addOptionalLaborer('millingMachine', 1) // Groundman
      .addOptionalLaborer('truck', 1) // Laborer can ride in truck
      
      .getRules()
  },

  pavingOperations: {
    name: 'Paving Operations',
    description: 'Rules specific to paving operations',
    rules: new MagnetRuleCreator()
      .addRequiredOperator('paver')
      .addRequiredOperator('roller')
      .addOptionalLaborer('paver', 2) // Screwmen
      .addRequiredDriver('truck')
      .addOptionalLaborer('truck', 1)
      .getRules()
  },

  millingOperations: {
    name: 'Milling Operations', 
    description: 'Rules specific to milling operations',
    rules: new MagnetRuleCreator()
      .addRequiredOperator('millingMachine')
      .addRequiredOperator('skidsteer')
      .addOptionalLaborer('millingMachine', 1) // Groundman
      .addRequiredDriver('truck')
      .getRules()
  },

  minimumSafety: {
    name: 'Minimum Safety Requirements',
    description: 'Bare minimum rules to ensure safe operations',
    rules: new MagnetRuleCreator()
      .addRequiredOperator('paver')
      .addRequiredOperator('millingMachine')
      .addRequiredDriver('truck')
      .getRules()
  }
};

/**
 * Pre-built drop rule templates
 */
export const dropRuleTemplates: Record<string, DropRuleTemplate[]> = {
  standard: [
    {
      name: 'Foreman Row',
      description: 'Only foremen allowed',
      rowType: 'Forman',
      allowedTypes: ['foreman']
    },
    {
      name: 'Equipment Row',
      description: 'Equipment and operators',
      rowType: 'Equipment',
      allowedTypes: ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment', 'operator']
    },
    {
      name: 'Sweeper Row',
      description: 'Sweepers and operators',
      rowType: 'Sweeper',
      allowedTypes: ['sweeper', 'operator']
    },
    {
      name: 'Tack Row',
      description: 'Tack crew and equipment',
      rowType: 'Tack',
      allowedTypes: ['operator', 'laborer', 'truck']
    },
    {
      name: 'MPT Row',
      description: 'MPT crew and equipment',
      rowType: 'MPT',
      allowedTypes: ['operator', 'laborer', 'truck']
    },
    {
      name: 'Crew Row',
      description: 'All personnel types',
      rowType: 'crew',
      allowedTypes: ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver']
    },
    {
      name: 'Trucks Row',
      description: 'Trucks and drivers',
      rowType: 'trucks',
      allowedTypes: ['truck', 'driver', 'privateDriver']
    }
  ]
};

/**
 * Utility functions for rule management
 */
export const ruleUtils = {
  /**
   * Create rules for a specific job type
   */
  createJobTypeRules(jobType: 'milling' | 'paving' | 'both' | 'other'): MagnetInteractionRule[] {
    const creator = createEnhancedMagnetRules();
    
    switch (jobType) {
      case 'paving':
        return creator
          .createJobSpecificRules('paving')
          .getRules();
          
      case 'milling':
        return creator
          .createJobSpecificRules('milling')
          .getRules();
          
      case 'both':
        return creator
          .createJobSpecificRules('both')
          .getRules();
          
      default:
        return creator
          .addSafetyRules()
          .getRules();
    }
  },

  /**
   * Validate rules for consistency
   */
  validateRules(rules: MagnetInteractionRule[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required attachments that don't have corresponding rules
    const requiredRules = rules.filter(r => r.isRequired);
    requiredRules.forEach(rule => {
      const hasCorrespondingRule = rules.some(r => 
        r.sourceType === rule.sourceType && 
        r.targetType === rule.targetType && 
        r.canAttach
      );
      
      if (!hasCorrespondingRule) {
        errors.push(`Required rule ${rule.sourceType} -> ${rule.targetType} has canAttach set to false`);
      }
    });
    
    // Check for conflicting maxCount values
    const ruleGroups = new Map<string, MagnetInteractionRule[]>();
    rules.forEach(rule => {
      const key = `${rule.sourceType}-${rule.targetType}`;
      if (!ruleGroups.has(key)) {
        ruleGroups.set(key, []);
      }
      ruleGroups.get(key)!.push(rule);
    });
    
    ruleGroups.forEach((groupRules, key) => {
      if (groupRules.length > 1) {
        errors.push(`Duplicate rules found for ${key}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Get rule suggestions based on resource types
   */
  suggestRules(resourceTypes: ResourceType[]): MagnetInteractionRule[] {
    const suggestions: MagnetInteractionRule[] = [];
    const personnelTypes = ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'];
    const equipmentTypes = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment'];
    const vehicleTypes = ['truck'];
    
    const availablePersonnel = resourceTypes.filter(type => personnelTypes.includes(type));
    const availableEquipment = resourceTypes.filter(type => equipmentTypes.includes(type));
    const availableVehicles = resourceTypes.filter(type => vehicleTypes.includes(type));
    
    // Suggest operator rules for equipment
    if (availablePersonnel.includes('operator')) {
      availableEquipment.forEach(equipmentType => {
        suggestions.push({
          sourceType: 'operator',
          targetType: equipmentType,
          canAttach: true,
          isRequired: true,
          maxCount: 1
        });
      });
    }
    
    // Suggest driver rules for vehicles
    if (availablePersonnel.includes('driver')) {
      availableVehicles.forEach(vehicleType => {
        suggestions.push({
          sourceType: 'driver',
          targetType: vehicleType,
          canAttach: true,
          isRequired: true,
          maxCount: 1
        });
      });
    }
    
    // Suggest laborer rules for specialized equipment
    if (availablePersonnel.includes('laborer')) {
      if (availableEquipment.includes('paver')) {
        suggestions.push({
          sourceType: 'laborer',
          targetType: 'paver',
          canAttach: true,
          isRequired: false,
          maxCount: 2 // Screwmen
        });
      }
      
      if (availableEquipment.includes('millingMachine')) {
        suggestions.push({
          sourceType: 'laborer',
          targetType: 'millingMachine',
          canAttach: true,
          isRequired: false,
          maxCount: 1 // Groundman
        });
      }
      
      availableVehicles.forEach(vehicleType => {
        suggestions.push({
          sourceType: 'laborer',
          targetType: vehicleType,
          canAttach: true,
          isRequired: false,
          maxCount: 1 // Can ride in vehicle
        });
      });
    }
    
    return suggestions;
  },

  /**
   * Export rules to JSON
   */
  exportRules(rules: MagnetInteractionRule[]): string {
    return JSON.stringify(rules, null, 2);
  },

  /**
   * Import rules from JSON
   */
  importRules(jsonString: string): MagnetInteractionRule[] {
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error importing rules:', error);
      return [];
    }
  }
};

/**
 * Factory function to create a new rule creator
 */
export const createMagnetRules = (): MagnetRuleCreator => {
  return new MagnetRuleCreator();
};

/**
 * Factory function to create an advanced rule creator
 */
export const createAdvancedMagnetRules = (): AdvancedRuleCreator => {
  return new AdvancedRuleCreator();
};

/**
 * Factory function to create enhanced rule creator with validation
 */
export const createEnhancedMagnetRules = (): EnhancedRuleCreator => {
  return new AdvancedRuleCreator();
};

/**
 * Factory function to create drop rules
 */
export const createDropRules = (): DropRuleCreator => {
  return new DropRuleCreator();
};

/**
 * Rule preset factory for common scenarios
 */
export const rulePresets = {
  /**
   * Create rules for a small operation (minimal equipment)
   */
  smallOperation: (): MagnetInteractionRule[] => {
    return createAdvancedMagnetRules()
      .addSafetyRules()
      .addOptionalLaborer('truck', 1)
      .getRules();
  },
  
  /**
   * Create rules for large highway projects
   */
  highwayProject: (): MagnetInteractionRule[] => {
    return createAdvancedMagnetRules()
      .createJobSpecificRules('both')
      .addSafetyRules()
      // Additional highway-specific rules
      .addAttachmentRule('striper', 'truck', { canAttach: true, isRequired: false, maxCount: 1 })
      .addAttachmentRule('foreman', 'equipment', { canAttach: true, isRequired: false, maxCount: 1 })
      .getRules();
  },
  
  /**
   * Create rules for maintenance operations
   */
  maintenance: (): MagnetInteractionRule[] => {
    return createAdvancedMagnetRules()
      .addRequiredOperator('skidsteer')
      .addRequiredOperator('sweeper')
      .addRequiredDriver('truck')
      .addOptionalLaborer('truck', 2) // More laborers for maintenance work
      .getRules();
  }
};

/**
 * Helper to build standard construction rules using the modular approach
 */
export const buildStandardConstructionRules = (): MagnetInteractionRule[] => {
  return createMagnetRules()
    // All equipment needs operators
    .addBulkRules('operator', [
      'paver', 'roller', 'excavator', 'sweeper', 'millingMachine',
      'dozer', 'payloader', 'skidsteer', 'grader', 'equipment'
    ], { canAttach: true, isRequired: true, maxCount: 1 })
    
    // Trucks need drivers
    .addAttachmentRule('driver', 'truck', { canAttach: true, isRequired: true, maxCount: 1 })
    .addAttachmentRule('privateDriver', 'truck', { canAttach: true, isRequired: true, maxCount: 1 })
    
    // Specialized laborer attachments
    .addOptionalLaborer('paver', 2) // Screwmen
    .addOptionalLaborer('millingMachine', 1) // Groundman
    .addOptionalLaborer('truck', 1) // Can ride in truck
    
    .getRules();
};

/**
 * Helper to build standard drop rules using the modular approach
 */
export const buildStandardDropRules = (): DropRule[] => {
  // All equipment types that can go in Equipment row
  const allEquipmentTypes: ResourceType[] = [
    'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
    'grader', 'dozer', 'payloader', 'roller', 'equipment'
  ];
  
  return createDropRules()
    .addDropRule('Forman', ['foreman'])
    // Equipment row: ALL equipment can go here per business requirement, plus operators and foreman
    .addDropRule('Equipment', [...allEquipmentTypes, 'operator', 'foreman'])
    .addDropRule('Sweeper', ['sweeper', 'operator', 'foreman'])
    .addDropRule('Tack', ['operator', 'laborer', 'truck', 'foreman'])
    .addDropRule('MPT', ['operator', 'laborer', 'truck', 'foreman'])
    // Crew row: all personnel types including foreman
    .addDropRule('crew', ['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver'])
    .addDropRule('trucks', ['truck', 'driver', 'privateDriver', 'foreman'])
    .getRules();
};