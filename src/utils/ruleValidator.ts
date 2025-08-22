import { MagnetInteractionRule, DropRule, ResourceType, RowType } from '../types';

/**
 * Rule validation utility for ensuring consistency and detecting issues
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface RuleConflict {
  type: 'duplicate' | 'contradiction' | 'missing_required';
  description: string;
  affectedRules: MagnetInteractionRule[];
}

/**
 * Comprehensive rule validator
 */
export class RuleValidator {
  /**
   * Validate magnet interaction rules
   */
  static validateMagnetRules(rules: MagnetInteractionRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for duplicate rules
    const ruleMap = new Map<string, MagnetInteractionRule[]>();
    rules.forEach(rule => {
      const key = `${rule.sourceType}-${rule.targetType}`;
      if (!ruleMap.has(key)) {
        ruleMap.set(key, []);
      }
      ruleMap.get(key)!.push(rule);
    });

    ruleMap.forEach((ruleGroup, key) => {
      if (ruleGroup.length > 1) {
        errors.push(`Duplicate rules found for ${key.replace('-', ' → ')}`);
      }
    });

    // Check for required rules that can't attach
    const requiredButCantAttach = rules.filter(r => r.isRequired && !r.canAttach);
    requiredButCantAttach.forEach(rule => {
      errors.push(`Rule marked as required but canAttach is false: ${rule.sourceType} → ${rule.targetType}`);
    });

    // Check for missing operator rules for equipment
    const equipmentTypes: ResourceType[] = ['paver', 'roller', 'excavator', 'sweeper', 'millingMachine', 'dozer', 'payloader', 'skidsteer', 'grader', 'equipment'];
    equipmentTypes.forEach(equipmentType => {
      const hasOperatorRule = rules.some(r => 
        r.sourceType === 'operator' && r.targetType === equipmentType && r.canAttach
      );
      
      if (!hasOperatorRule) {
        warnings.push(`No operator rule found for ${equipmentType} - equipment may not be operable`);
        suggestions.push(`Add operator rule for ${equipmentType}`);
      }
    });

    // Check for missing driver rules for trucks
    const hasDriverRule = rules.some(r => 
      (r.sourceType === 'driver' || r.sourceType === 'privateDriver') && 
      r.targetType === 'truck' && r.canAttach
    );
    
    if (!hasDriverRule) {
      warnings.push('No driver rule found for trucks - vehicles may not be drivable');
      suggestions.push('Add driver rule for trucks');
    }

    // Check for unreasonably high maxCount values
    const highMaxCountRules = rules.filter(r => r.maxCount && r.maxCount > 5);
    highMaxCountRules.forEach(rule => {
      warnings.push(`High maxCount (${rule.maxCount}) for ${rule.sourceType} → ${rule.targetType} - verify if intentional`);
    });

    // Check for zero maxCount on canAttach rules
    const zeroMaxCountRules = rules.filter(r => r.canAttach && r.maxCount === 0);
    zeroMaxCountRules.forEach(rule => {
      warnings.push(`Rule allows attachment but maxCount is 0: ${rule.sourceType} → ${rule.targetType}`);
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate drop rules
   */
  static validateDropRules(dropRules: DropRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for duplicate row types
    const rowTypeCounts = new Map<RowType, number>();
    dropRules.forEach(rule => {
      rowTypeCounts.set(rule.rowType, (rowTypeCounts.get(rule.rowType) || 0) + 1);
    });

    rowTypeCounts.forEach((count, rowType) => {
      if (count > 1) {
        errors.push(`Multiple drop rules found for row type: ${rowType}`);
      }
    });

    // Check for empty allowed types
    const emptyRules = dropRules.filter(r => r.allowedTypes.length === 0);
    emptyRules.forEach(rule => {
      warnings.push(`Row type ${rule.rowType} has no allowed resource types - nothing can be dropped here`);
    });

    // Check for missing essential row types
    const essentialRows: RowType[] = ['Forman', 'Equipment', 'crew', 'trucks'];
    const definedRowTypes = new Set(dropRules.map(r => r.rowType));
    
    essentialRows.forEach(rowType => {
      if (!definedRowTypes.has(rowType)) {
        warnings.push(`Missing drop rule for essential row type: ${rowType}`);
        suggestions.push(`Add drop rule for ${rowType} row`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Detect rule conflicts between magnet and drop rules
   */
  static detectRuleConflicts(
    magnetRules: MagnetInteractionRule[], 
    dropRules: DropRule[]
  ): RuleConflict[] {
    const conflicts: RuleConflict[] = [];

    // Check if attachment rules reference resource types not allowed in any row
    const allAllowedTypes = new Set<ResourceType>();
    dropRules.forEach(dropRule => {
      dropRule.allowedTypes.forEach(type => allAllowedTypes.add(type));
    });

    magnetRules.forEach(magnetRule => {
      if (!allAllowedTypes.has(magnetRule.sourceType)) {
        conflicts.push({
          type: 'missing_required',
          description: `Magnet rule references ${magnetRule.sourceType} but it's not allowed in any row`,
          affectedRules: [magnetRule]
        });
      }
      
      if (!allAllowedTypes.has(magnetRule.targetType)) {
        conflicts.push({
          type: 'missing_required',
          description: `Magnet rule references ${magnetRule.targetType} but it's not allowed in any row`,
          affectedRules: [magnetRule]
        });
      }
    });

    return conflicts;
  }

  /**
   * Get comprehensive validation report
   */
  static getFullValidationReport(
    magnetRules: MagnetInteractionRule[],
    dropRules: DropRule[]
  ): {
    magnetValidation: ValidationResult;
    dropValidation: ValidationResult;
    conflicts: RuleConflict[];
    overallValid: boolean;
  } {
    const magnetValidation = this.validateMagnetRules(magnetRules);
    const dropValidation = this.validateDropRules(dropRules);
    const conflicts = this.detectRuleConflicts(magnetRules, dropRules);

    return {
      magnetValidation,
      dropValidation,
      conflicts,
      overallValid: magnetValidation.isValid && dropValidation.isValid && conflicts.length === 0
    };
  }
}

/**
 * Rule analysis utilities
 */
export const ruleAnalyzer = {
  /**
   * Get statistics about current rules
   */
  getRuleStatistics(magnetRules: MagnetInteractionRule[], dropRules: DropRule[]) {
    const attachableCount = magnetRules.filter(r => r.canAttach).length;
    const requiredCount = magnetRules.filter(r => r.isRequired).length;
    const rowsWithRules = dropRules.length;
    const totalAllowedTypes = dropRules.reduce((sum, rule) => sum + rule.allowedTypes.length, 0);

    return {
      totalMagnetRules: magnetRules.length,
      attachableRules: attachableCount,
      requiredRules: requiredCount,
      dropRules: rowsWithRules,
      averageTypesPerRow: rowsWithRules > 0 ? Math.round(totalAllowedTypes / rowsWithRules) : 0,
      coverage: {
        hasOperatorRules: magnetRules.some(r => r.sourceType === 'operator' && r.canAttach),
        hasDriverRules: magnetRules.some(r => r.sourceType === 'driver' && r.canAttach),
        hasLaborerRules: magnetRules.some(r => r.sourceType === 'laborer' && r.canAttach),
        hasTruckRules: magnetRules.some(r => r.targetType === 'truck' && r.canAttach),
        hasPaverRules: magnetRules.some(r => r.targetType === 'paver' && r.canAttach)
      }
    };
  },

  /**
   * Find unused resource types
   */
  findUnusedResourceTypes(magnetRules: MagnetInteractionRule[], dropRules: DropRule[]): {
    unusedInMagnetRules: ResourceType[];
    unusedInDropRules: ResourceType[];
  } {
    const allResourceTypes: ResourceType[] = [
      'operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver',
      'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader',
      'dozer', 'payloader', 'roller', 'equipment', 'truck'
    ];

    const usedInMagnetRules = new Set<ResourceType>();
    magnetRules.forEach(rule => {
      usedInMagnetRules.add(rule.sourceType);
      usedInMagnetRules.add(rule.targetType);
    });

    const usedInDropRules = new Set<ResourceType>();
    dropRules.forEach(rule => {
      rule.allowedTypes.forEach(type => usedInDropRules.add(type));
    });

    return {
      unusedInMagnetRules: allResourceTypes.filter(type => !usedInMagnetRules.has(type)),
      unusedInDropRules: allResourceTypes.filter(type => !usedInDropRules.has(type))
    };
  }
};