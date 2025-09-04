import { describe, it, expect } from 'vitest';
import { RuleValidator, ruleAnalyzer } from '../ruleValidator';
import { MagnetInteractionRule, DropRule, ResourceType, RowType } from '../../types';

describe('RuleValidator', () => {
  describe('validateMagnetRules', () => {
    it('should detect duplicate rules', () => {
      const rules: MagnetInteractionRule[] = [
        { sourceType: 'operator', targetType: 'paver', canAttach: true },
        { sourceType: 'operator', targetType: 'paver', canAttach: false }
      ];

      const result = RuleValidator.validateMagnetRules(rules);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate rules found for operator → paver');
    });

    it('should detect required rules that cannot attach', () => {
      const rules: MagnetInteractionRule[] = [
        { sourceType: 'operator', targetType: 'paver', canAttach: false, isRequired: true }
      ];

      const result = RuleValidator.validateMagnetRules(rules);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rule marked as required but canAttach is false: operator → paver');
    });

    it('should warn about missing operator rules for equipment', () => {
      const rules: MagnetInteractionRule[] = [
        { sourceType: 'driver', targetType: 'truck', canAttach: true }
      ];

      const result = RuleValidator.validateMagnetRules(rules);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('No operator rule found for paver'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('Add operator rule for paver'))).toBe(true);
    });

    it('should warn about missing driver rules for trucks', () => {
      const rules: MagnetInteractionRule[] = [
        { sourceType: 'operator', targetType: 'paver', canAttach: true }
      ];

      const result = RuleValidator.validateMagnetRules(rules);
      expect(result.warnings.some(w => w.includes('No driver rule found for trucks'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('Add driver rule for trucks'))).toBe(true);
    });

    it('should warn about unreasonably high maxCount values', () => {
      const rules: MagnetInteractionRule[] = [
        { sourceType: 'laborer', targetType: 'paver', canAttach: true, maxCount: 10 }
      ];

      const result = RuleValidator.validateMagnetRules(rules);
      expect(result.warnings.some(w => w.includes('High maxCount (10)'))).toBe(true);
    });

    it('should warn about zero maxCount on attachable rules', () => {
      const rules: MagnetInteractionRule[] = [
        { sourceType: 'laborer', targetType: 'paver', canAttach: true, maxCount: 0 }
      ];

      const result = RuleValidator.validateMagnetRules(rules);
      expect(result.warnings.some(w => w.includes('Rule allows attachment but maxCount is 0'))).toBe(true);
    });

    it('should validate valid rules without errors', () => {
      const rules: MagnetInteractionRule[] = [
        { sourceType: 'operator', targetType: 'paver', canAttach: true, isRequired: true },
        { sourceType: 'driver', targetType: 'truck', canAttach: true, isRequired: true },
        { sourceType: 'laborer', targetType: 'paver', canAttach: true, maxCount: 2 }
      ];

      const result = RuleValidator.validateMagnetRules(rules);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateDropRules', () => {
    it('should detect duplicate row types', () => {
      const dropRules: DropRule[] = [
        { rowType: 'Equipment', allowedTypes: ['paver', 'roller'] },
        { rowType: 'Equipment', allowedTypes: ['excavator'] }
      ];

      const result = RuleValidator.validateDropRules(dropRules);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Multiple drop rules found for row type: Equipment');
    });

    it('should warn about empty allowed types', () => {
      const dropRules: DropRule[] = [
        { rowType: 'Equipment', allowedTypes: [] }
      ];

      const result = RuleValidator.validateDropRules(dropRules);
      expect(result.warnings).toContain('Row type Equipment has no allowed resource types - nothing can be dropped here');
    });

    it('should warn about missing essential row types', () => {
      const dropRules: DropRule[] = [
        { rowType: 'Equipment', allowedTypes: ['paver'] }
      ];

      const result = RuleValidator.validateDropRules(dropRules);
      expect(result.warnings.some(w => w.includes('Missing drop rule for essential row type: Forman'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Missing drop rule for essential row type: crew'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Missing drop rule for essential row type: trucks'))).toBe(true);
    });

    it('should validate valid drop rules', () => {
      const dropRules: DropRule[] = [
        { rowType: 'Forman', allowedTypes: ['foreman'] },
        { rowType: 'Equipment', allowedTypes: ['paver', 'roller', 'excavator'] },
        { rowType: 'crew', allowedTypes: ['laborer', 'striper'] },
        { rowType: 'trucks', allowedTypes: ['truck'] }
      ];

      const result = RuleValidator.validateDropRules(dropRules);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('detectRuleConflicts', () => {
    it('should detect when magnet rules reference types not allowed in any row', () => {
      const magnetRules: MagnetInteractionRule[] = [
        { sourceType: 'operator', targetType: 'paver', canAttach: true }
      ];
      const dropRules: DropRule[] = [
        { rowType: 'Equipment', allowedTypes: ['paver'] }
        // operator is not in any drop rule
      ];

      const conflicts = RuleValidator.detectRuleConflicts(magnetRules, dropRules);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('missing_required');
      expect(conflicts[0].description).toContain('operator but it\'s not allowed in any row');
    });

    it('should detect when target types are not allowed in any row', () => {
      const magnetRules: MagnetInteractionRule[] = [
        { sourceType: 'operator', targetType: 'grader', canAttach: true }
      ];
      const dropRules: DropRule[] = [
        { rowType: 'Equipment', allowedTypes: ['paver'] },
        { rowType: 'crew', allowedTypes: ['operator'] }
      ];

      const conflicts = RuleValidator.detectRuleConflicts(magnetRules, dropRules);
      expect(conflicts.some(c => c.description.includes('grader but it\'s not allowed in any row'))).toBe(true);
    });

    it('should not detect conflicts when all types are properly allowed', () => {
      const magnetRules: MagnetInteractionRule[] = [
        { sourceType: 'operator', targetType: 'paver', canAttach: true }
      ];
      const dropRules: DropRule[] = [
        { rowType: 'Equipment', allowedTypes: ['paver', 'operator'] }
      ];

      const conflicts = RuleValidator.detectRuleConflicts(magnetRules, dropRules);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('getFullValidationReport', () => {
    it('should provide comprehensive validation report', () => {
      const magnetRules: MagnetInteractionRule[] = [
        { sourceType: 'operator', targetType: 'paver', canAttach: true },
        { sourceType: 'driver', targetType: 'truck', canAttach: true }
      ];
      const dropRules: DropRule[] = [
        { rowType: 'Equipment', allowedTypes: ['paver', 'operator'] },
        { rowType: 'trucks', allowedTypes: ['truck', 'driver'] }
      ];

      const report = RuleValidator.getFullValidationReport(magnetRules, dropRules);
      
      expect(report.magnetValidation).toBeDefined();
      expect(report.dropValidation).toBeDefined();
      expect(report.conflicts).toBeDefined();
      expect(report.overallValid).toBeDefined();
    });

    it('should mark overall as invalid when there are errors', () => {
      const magnetRules: MagnetInteractionRule[] = [
        { sourceType: 'operator', targetType: 'paver', canAttach: false, isRequired: true }
      ];
      const dropRules: DropRule[] = [
        { rowType: 'Equipment', allowedTypes: ['paver'] }
      ];

      const report = RuleValidator.getFullValidationReport(magnetRules, dropRules);
      expect(report.overallValid).toBe(false);
    });
  });
});

describe('ruleAnalyzer', () => {
  describe('getRuleStatistics', () => {
    it('should calculate rule statistics correctly', () => {
      const magnetRules: MagnetInteractionRule[] = [
        { sourceType: 'operator', targetType: 'paver', canAttach: true, isRequired: true },
        { sourceType: 'driver', targetType: 'truck', canAttach: true, isRequired: true },
        { sourceType: 'laborer', targetType: 'paver', canAttach: true, maxCount: 2 },
        { sourceType: 'foreman', targetType: 'equipment', canAttach: false }
      ];
      const dropRules: DropRule[] = [
        { rowType: 'Equipment', allowedTypes: ['paver', 'roller'] },
        { rowType: 'trucks', allowedTypes: ['truck'] }
      ];

      const stats = ruleAnalyzer.getRuleStatistics(magnetRules, dropRules);
      
      expect(stats.totalMagnetRules).toBe(4);
      expect(stats.attachableRules).toBe(3);
      expect(stats.requiredRules).toBe(2);
      expect(stats.dropRules).toBe(2);
      expect(stats.averageTypesPerRow).toBe(2);
      expect(stats.coverage.hasOperatorRules).toBe(true);
      expect(stats.coverage.hasDriverRules).toBe(true);
      expect(stats.coverage.hasLaborerRules).toBe(true);
      expect(stats.coverage.hasTruckRules).toBe(true);
      expect(stats.coverage.hasPaverRules).toBe(true);
    });

    it('should handle empty rules', () => {
      const stats = ruleAnalyzer.getRuleStatistics([], []);
      
      expect(stats.totalMagnetRules).toBe(0);
      expect(stats.attachableRules).toBe(0);
      expect(stats.requiredRules).toBe(0);
      expect(stats.dropRules).toBe(0);
      expect(stats.averageTypesPerRow).toBe(0);
      expect(stats.coverage.hasOperatorRules).toBe(false);
    });
  });

  describe('findUnusedResourceTypes', () => {
    it('should identify unused resource types', () => {
      const magnetRules: MagnetInteractionRule[] = [
        { sourceType: 'operator', targetType: 'paver', canAttach: true }
      ];
      const dropRules: DropRule[] = [
        { rowType: 'Equipment', allowedTypes: ['paver'] },
        { rowType: 'crew', allowedTypes: ['operator'] }
      ];

      const unused = ruleAnalyzer.findUnusedResourceTypes(magnetRules, dropRules);
      
      expect(unused.unusedInMagnetRules).toContain('driver');
      expect(unused.unusedInMagnetRules).toContain('truck');
      expect(unused.unusedInMagnetRules).toContain('roller');
      expect(unused.unusedInDropRules).toContain('driver');
      expect(unused.unusedInDropRules).toContain('truck');
      expect(unused.unusedInDropRules).toContain('roller');
    });

    it('should return empty arrays when all types are used', () => {
      const allTypes: ResourceType[] = [
        'operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver',
        'skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader',
        'dozer', 'payloader', 'roller', 'equipment', 'truck'
      ];

      const magnetRules: MagnetInteractionRule[] = [];
      const dropRules: DropRule[] = [
        { rowType: 'all' as RowType, allowedTypes: allTypes }
      ];

      // Add magnet rules for all types
      allTypes.forEach(type => {
        magnetRules.push({ sourceType: type, targetType: type, canAttach: true });
      });

      const unused = ruleAnalyzer.findUnusedResourceTypes(magnetRules, dropRules);
      
      expect(unused.unusedInMagnetRules).toHaveLength(0);
      expect(unused.unusedInDropRules).toHaveLength(0);
    });
  });
});