import { describe, it, expect } from 'vitest';
import {
  canAttach,
  getRequiredAttachments,
  getMaxAttachments,
  hasRequiredAttachments,
  getValidAttachmentTypes,
  getRequiredSkills,
  validateAttachmentGroup,
  attachmentRules
} from '../attachmentRules';
import { ResourceType } from '../../types';

describe('attachmentRules', () => {
  describe('canAttach', () => {
    it('should return true for valid operator to paver attachment', () => {
      expect(canAttach('operator', 'paver')).toBe(true);
    });

    it('should return true for valid driver to truck attachment', () => {
      expect(canAttach('driver', 'truck')).toBe(true);
    });

    it('should return true for laborer to paver attachment', () => {
      expect(canAttach('laborer', 'paver')).toBe(true);
    });

    it('should return false for invalid attachments', () => {
      expect(canAttach('paver', 'operator')).toBe(false);
      expect(canAttach('truck', 'driver')).toBe(false);
      expect(canAttach('foreman', 'paver')).toBe(false);
    });

    it('should return false for non-existent rules', () => {
      expect(canAttach('striper', 'excavator')).toBe(false);
    });
  });

  describe('getRequiredAttachments', () => {
    it('should return operator as required for paver', () => {
      const required = getRequiredAttachments('paver');
      expect(required).toContain('operator');
      expect(required).toHaveLength(1);
    });

    it('should return driver as required for truck', () => {
      const required = getRequiredAttachments('truck');
      expect(required).toContain('driver');
      expect(required).toHaveLength(1);
    });

    it('should return operator as required for all equipment types', () => {
      const equipmentTypes: ResourceType[] = ['roller', 'excavator', 'sweeper', 'millingMachine', 'dozer', 'payloader', 'skidsteer'];
      
      equipmentTypes.forEach(equipment => {
        const required = getRequiredAttachments(equipment);
        expect(required).toContain('operator');
        expect(required).toHaveLength(1);
      });
    });

    it('should return empty array for resources with no requirements', () => {
      expect(getRequiredAttachments('operator')).toEqual([]);
      expect(getRequiredAttachments('driver')).toEqual([]);
      expect(getRequiredAttachments('laborer')).toEqual([]);
    });
  });

  describe('getMaxAttachments', () => {
    it('should return 1 for operator to paver', () => {
      expect(getMaxAttachments('operator', 'paver')).toBe(1);
    });

    it('should return 2 for laborer to paver', () => {
      expect(getMaxAttachments('laborer', 'paver')).toBe(2);
    });

    it('should return 1 for driver to truck', () => {
      expect(getMaxAttachments('driver', 'truck')).toBe(1);
    });

    it('should return 1 for laborer to truck', () => {
      expect(getMaxAttachments('laborer', 'truck')).toBe(1);
    });

    it('should return 0 for invalid combinations', () => {
      expect(getMaxAttachments('paver', 'operator')).toBe(0);
      expect(getMaxAttachments('foreman', 'paver')).toBe(0);
    });
  });

  describe('hasRequiredAttachments', () => {
    it('should return true when paver has operator', () => {
      expect(hasRequiredAttachments('paver', ['operator'])).toBe(true);
      expect(hasRequiredAttachments('paver', ['operator', 'laborer'])).toBe(true);
    });

    it('should return false when paver lacks operator', () => {
      expect(hasRequiredAttachments('paver', [])).toBe(false);
      expect(hasRequiredAttachments('paver', ['laborer'])).toBe(false);
    });

    it('should return true when truck has driver', () => {
      expect(hasRequiredAttachments('truck', ['driver'])).toBe(true);
      expect(hasRequiredAttachments('truck', ['driver', 'laborer'])).toBe(true);
    });

    it('should return false when truck lacks driver', () => {
      expect(hasRequiredAttachments('truck', [])).toBe(false);
      expect(hasRequiredAttachments('truck', ['laborer'])).toBe(false);
    });

    it('should return true for resources with no requirements', () => {
      expect(hasRequiredAttachments('operator', [])).toBe(true);
      expect(hasRequiredAttachments('driver', [])).toBe(true);
      expect(hasRequiredAttachments('laborer', [])).toBe(true);
    });
  });

  describe('getValidAttachmentTypes', () => {
    it('should return operator and laborer for paver', () => {
      const valid = getValidAttachmentTypes('paver');
      expect(valid).toContain('operator');
      expect(valid).toContain('laborer');
      expect(valid).toHaveLength(2);
    });

    it('should return driver and laborer for truck', () => {
      const valid = getValidAttachmentTypes('truck');
      expect(valid).toContain('driver');
      expect(valid).toContain('laborer');
      expect(valid).toHaveLength(2);
    });

    it('should return only operator for equipment types', () => {
      const equipmentTypes: ResourceType[] = ['roller', 'excavator', 'sweeper'];
      
      equipmentTypes.forEach(equipment => {
        const valid = getValidAttachmentTypes(equipment);
        expect(valid).toEqual(['operator']);
      });
    });

    it('should return empty array for resources that cannot have attachments', () => {
      expect(getValidAttachmentTypes('operator')).toEqual([]);
      expect(getValidAttachmentTypes('driver')).toEqual([]);
    });
  });

  describe('getRequiredSkills', () => {
    it('should return screwman skill for laborer to paver', () => {
      const skills = getRequiredSkills('laborer', 'paver');
      expect(skills).toContain('screwman');
      expect(skills).toHaveLength(1);
    });

    it('should return empty array for operator to paver', () => {
      expect(getRequiredSkills('operator', 'paver')).toEqual([]);
    });

    it('should return empty array for driver to truck', () => {
      expect(getRequiredSkills('driver', 'truck')).toEqual([]);
    });

    it('should return empty array for invalid combinations', () => {
      expect(getRequiredSkills('foreman', 'paver')).toEqual([]);
      expect(getRequiredSkills('paver', 'operator')).toEqual([]);
    });
  });

  describe('validateAttachmentGroup', () => {
    it('should validate valid paver attachment group', () => {
      const result = validateAttachmentGroup('paver', ['operator', 'laborer']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid truck attachment group', () => {
      const result = validateAttachmentGroup('truck', ['driver', 'laborer']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required operator for paver', () => {
      const result = validateAttachmentGroup('paver', ['laborer']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required attachments: operator');
    });

    it('should detect missing required driver for truck', () => {
      const result = validateAttachmentGroup('truck', ['laborer']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required attachments: driver');
    });

    it('should detect too many laborers on paver', () => {
      const result = validateAttachmentGroup('paver', ['operator', 'laborer', 'laborer', 'laborer']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Too many laborer attachments (max: 2)');
    });

    it('should detect too many operators on equipment', () => {
      const result = validateAttachmentGroup('roller', ['operator', 'operator']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Too many operator attachments (max: 1)');
    });

    it('should detect multiple violations', () => {
      const result = validateAttachmentGroup('paver', ['laborer', 'laborer', 'laborer']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Missing required attachments: operator');
      expect(result.errors).toContain('Too many laborer attachments (max: 2)');
    });

    it('should validate resources with no requirements', () => {
      const result = validateAttachmentGroup('operator', []);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('attachmentRules array', () => {
    it('should have rules for all equipment types', () => {
      const equipmentTypes = ['paver', 'roller', 'excavator', 'sweeper', 'millingMachine', 'dozer', 'payloader', 'skidsteer'];
      
      equipmentTypes.forEach(equipment => {
        const hasRule = attachmentRules.some(rule => 
          rule.targetType === equipment && rule.sourceType === 'operator'
        );
        expect(hasRule).toBe(true);
      });
    });

    it('should have truck driver rules', () => {
      const hasTruckDriverRule = attachmentRules.some(rule => 
        rule.targetType === 'truck' && rule.sourceType === 'driver'
      );
      expect(hasTruckDriverRule).toBe(true);
    });

    it('should mark operator as required for all equipment', () => {
      const equipmentRules = attachmentRules.filter(rule => 
        rule.sourceType === 'operator' && rule.targetType !== 'truck'
      );
      
      equipmentRules.forEach(rule => {
        expect(rule.isRequired).toBe(true);
        expect(rule.maxCount).toBe(1);
      });
    });
  });
});