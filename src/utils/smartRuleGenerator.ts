import { ResourceType, Resource, Employee, Equipment, MagnetInteractionRule, DropRule, RowType } from '../types';

export interface GeneratedRule {
  id: string;
  type: 'magnet_interaction' | 'drop_rule' | 'operator_requirement';
  description: string;
  confidence: number; // 0-1, how confident we are in this rule
  category: 'safety' | 'efficiency' | 'business' | 'suggested';
  rule: MagnetInteractionRule | { rowType: RowType; allowedType: ResourceType } | any;
  reasoning: string;
}

export interface RuleGenerationOptions {
  generateSafetyRules: boolean;
  generateEfficiencyRules: boolean;
  generateBusinessRules: boolean;
  strictMode: boolean; // Only generate high-confidence rules
}

/**
 * Smart rule generator that analyzes resource properties to suggest magnet interaction rules,
 * drop rules, and other business logic rules based on construction industry standards.
 */
export class SmartRuleGenerator {
  
  /**
   * Generate all applicable rules for a resource based on its properties
   */
  static generateRulesForResource(
    resource: Partial<Resource & Employee & Equipment>,
    options: RuleGenerationOptions = {
      generateSafetyRules: true,
      generateEfficiencyRules: true,
      generateBusinessRules: true,
      strictMode: false
    }
  ): GeneratedRule[] {
    const rules: GeneratedRule[] = [];
    const isPersonnel = resource.classType === 'employee';
    const isEquipment = resource.classType === 'equipment';

    if (isPersonnel) {
      rules.push(...this.generatePersonnelRules(resource as Employee & Resource, options));
    }

    if (isEquipment) {
      rules.push(...this.generateEquipmentRules(resource as Equipment & Resource, options));
    }

    // Filter by confidence level if strict mode is enabled
    if (options.strictMode) {
      return rules.filter(rule => rule.confidence >= 0.8);
    }

    return rules;
  }

  /**
   * Generate rules for personnel resources
   */
  private static generatePersonnelRules(
    resource: Employee & Resource,
    options: RuleGenerationOptions
  ): GeneratedRule[] {
    const rules: GeneratedRule[] = [];
    const { type: _type, skills: _skills = [], certifications: _certifications = [], allowedEquipment: _allowedEquipment = [] } = resource;
    void _type; void _skills; void _certifications; void _allowedEquipment; // Acknowledge unused destructured values for future use
    // Destructured values available for future rule generation enhancements

    // Generate drop rules based on personnel type
    rules.push(...this.generatePersonnelDropRules(resource, options));

    // Generate magnet attachment rules based on skills and certifications
    rules.push(...this.generatePersonnelMagnetRules(resource, options));

    // Generate safety-based rules
    if (options.generateSafetyRules) {
      rules.push(...this.generateSafetyRules(resource, options));
    }

    return rules;
  }

  /**
   * Generate rules for equipment resources
   */
  private static generateEquipmentRules(
    resource: Equipment & Resource,
    options: RuleGenerationOptions
  ): GeneratedRule[] {
    const rules: GeneratedRule[] = [];

    // Generate operator requirements based on equipment type
    rules.push(...this.generateOperatorRequirements(resource, options));

    // Generate attachment rules for equipment
    rules.push(...this.generateEquipmentMagnetRules(resource, options));

    return rules;
  }

  /**
   * Generate drop rules for personnel - where they can be placed on job rows
   */
  private static generatePersonnelDropRules(
    resource: Employee & Resource,
    _options: RuleGenerationOptions // Future use for customizing rule generation
  ): GeneratedRule[] {
    void _options; // Acknowledge unused parameter for future implementation
    const rules: GeneratedRule[] = [];
    const { type } = resource;

    // High-confidence drop rules based on personnel type
    switch (type) {
      case 'foreman':
        rules.push({
          id: `drop_${resource.id}_foreman`,
          type: 'drop_rule',
          description: `${resource.name} can be placed in Foreman row`,
          confidence: 0.95,
          category: 'business',
          rule: { rowType: 'Forman' as RowType, allowedType: type },
          reasoning: 'Foremen belong in the Foreman row for proper job hierarchy'
        });
        break;

      case 'operator':
        rules.push({
          id: `drop_${resource.id}_equipment`,
          type: 'drop_rule',
          description: `${resource.name} can be placed in Equipment row`,
          confidence: 0.9,
          category: 'business',
          rule: { rowType: 'Equipment' as RowType, allowedType: type },
          reasoning: 'Operators are needed to run equipment in the Equipment row'
        });
        break;

      case 'driver':
        rules.push({
          id: `drop_${resource.id}_trucks`,
          type: 'drop_rule',
          description: `${resource.name} can be placed in Trucks row`,
          confidence: 0.9,
          category: 'business',
          rule: { rowType: 'trucks' as RowType, allowedType: type },
          reasoning: 'Drivers operate trucks in the Trucks row'
        });
        break;

      case 'laborer':
      case 'striper':
        rules.push({
          id: `drop_${resource.id}_crew`,
          type: 'drop_rule',
          description: `${resource.name} can be placed in Crew row`,
          confidence: 0.85,
          category: 'business',
          rule: { rowType: 'crew' as RowType, allowedType: type },
          reasoning: 'General laborers and stripers work in the Crew row'
        });
        break;
    }

    return rules;
  }

  /**
   * Generate magnet attachment rules for personnel based on their capabilities
   */
  private static generatePersonnelMagnetRules(
    resource: Employee & Resource,
    _options: RuleGenerationOptions // Future use for rule customization
  ): GeneratedRule[] {
    void _options; // Acknowledge unused parameter for future implementation
    const rules: GeneratedRule[] = [];
    const { type, skills: _skills = [], certifications = [], allowedEquipment = [] } = resource;
    void _skills; // Acknowledge unused destructured value for future use
    // Skills available for advanced rule generation

    // Generate rules based on allowed equipment
    allowedEquipment.forEach(equipType => {
      const equipResourceType = equipType as ResourceType;
      rules.push({
        id: `magnet_${resource.id}_${equipType}`,
        type: 'magnet_interaction',
        description: `${resource.name} can operate ${equipType}`,
        confidence: 0.9,
        category: 'business',
        rule: {
          sourceType: type,
          targetType: equipResourceType,
          canAttach: true,
          isRequired: this.isOperatorRequired(equipResourceType),
          maxCount: 1
        },
        reasoning: `${resource.name} is certified/trained to operate this equipment type`
      });
    });

    // Generate rules based on certifications
    certifications.forEach(cert => {
      const equipmentTypes = this.getEquipmentForCertification(cert);
      equipmentTypes.forEach(equipType => {
        if (!allowedEquipment.includes(equipType)) { // Don't duplicate rules
          rules.push({
            id: `magnet_${resource.id}_cert_${equipType}`,
            type: 'magnet_interaction',
            description: `${resource.name} can operate ${equipType} (certified: ${cert})`,
            confidence: 0.85,
            category: 'business',
            rule: {
              sourceType: type,
              targetType: equipType,
              canAttach: true,
              isRequired: this.isOperatorRequired(equipType),
              maxCount: 1
            },
            reasoning: `Certification "${cert}" qualifies for operating ${equipType}`
          });
        }
      });
    });

    return rules;
  }

  /**
   * Generate safety-based rules
   */
  private static generateSafetyRules(
    resource: Employee & Resource,
    _options: RuleGenerationOptions // Future use for safety rule customization
  ): GeneratedRule[] {
    void _options; // Acknowledge unused parameter for future implementation
    const rules: GeneratedRule[] = [];
    const { certifications = [] } = resource;

    // OSHA certification requirements
    if (certifications.includes('OSHA 30')) {
      rules.push({
        id: `safety_${resource.id}_supervisor`,
        type: 'magnet_interaction',
        description: `${resource.name} can supervise work (OSHA 30 certified)`,
        confidence: 0.7,
        category: 'safety',
        rule: {
          sourceType: resource.type,
          targetType: 'foreman' as ResourceType,
          canAttach: true,
          maxCount: 1
        },
        reasoning: 'OSHA 30 certification qualifies for supervisory roles'
      });
    }

    return rules;
  }

  /**
   * Generate operator requirements for equipment
   */
  private static generateOperatorRequirements(
    resource: Equipment & Resource,
    _options: RuleGenerationOptions // Future use for operator requirement customization
  ): GeneratedRule[] {
    void _options; // Acknowledge unused parameter for future implementation
    const rules: GeneratedRule[] = [];
    const { type } = resource;

    // Equipment that requires operators
    const requiresOperator = [
      'paver', 'millingMachine', 'excavator', 'grader', 
      'dozer', 'payloader', 'roller', 'skidsteer'
    ];

    if (requiresOperator.includes(type)) {
      rules.push({
        id: `operator_req_${resource.id}`,
        type: 'magnet_interaction',
        description: `${resource.name} requires an operator`,
        confidence: 0.95,
        category: 'safety',
        rule: {
          sourceType: 'operator' as ResourceType,
          targetType: type,
          canAttach: true,
          isRequired: true,
          maxCount: 1
        },
        reasoning: 'Heavy equipment requires a certified operator for safe operation'
      });
    }

    // Trucks require drivers
    if (type === 'truck') {
      rules.push({
        id: `driver_req_${resource.id}`,
        type: 'magnet_interaction',
        description: `${resource.name} requires a driver`,
        confidence: 0.95,
        category: 'safety',
        rule: {
          sourceType: 'driver' as ResourceType,
          targetType: type,
          canAttach: true,
          isRequired: true,
          maxCount: 1
        },
        reasoning: 'Trucks require a licensed driver for legal operation'
      });
    }

    return rules;
  }

  /**
   * Generate equipment-specific magnet rules
   */
  private static generateEquipmentMagnetRules(
    resource: Equipment & Resource,
    _options: RuleGenerationOptions // Available for rule customization
  ): GeneratedRule[] {
    void _options; // Acknowledge unused parameter for future implementation
    const rules: GeneratedRule[] = [];
    const { type, compatibleAttachments = [] } = resource;

    // Generate rules for compatible attachments
    compatibleAttachments.forEach(attachmentType => {
      rules.push({
        id: `magnet_${resource.id}_attachment_${attachmentType}`,
        type: 'magnet_interaction',
        description: `${attachmentType} can attach to ${resource.name}`,
        confidence: 0.8,
        category: 'efficiency',
        rule: {
          sourceType: attachmentType,
          targetType: type,
          canAttach: true,
          maxCount: this.getMaxAttachments(type, attachmentType)
        },
        reasoning: 'Equipment compatibility based on manufacturer specifications'
      });
    });

    // Special rules for specific equipment types
    if (type === 'paver') {
      // Pavers can have screwmen
      rules.push({
        id: `magnet_${resource.id}_screwman`,
        type: 'magnet_interaction',
        description: `Screwmen can work with ${resource.name}`,
        confidence: 0.85,
        category: 'efficiency',
        rule: {
          sourceType: 'laborer' as ResourceType,
          targetType: type,
          canAttach: true,
          maxCount: 2 // Pavers can have up to 2 screwmen
        },
        reasoning: 'Pavers benefit from screwmen for quality control and efficiency'
      });
    }

    return rules;
  }

  /**
   * Determine if an operator is required for specific equipment
   */
  private static isOperatorRequired(equipmentType: ResourceType): boolean {
    const requiresOperator = [
      'paver', 'millingMachine', 'excavator', 'grader', 
      'dozer', 'payloader', 'roller', 'skidsteer'
    ];
    return requiresOperator.includes(equipmentType);
  }

  /**
   * Get equipment types that can be operated with a specific certification
   */
  private static getEquipmentForCertification(certification: string): ResourceType[] {
    const certificationMap: Record<string, ResourceType[]> = {
      'Heavy Equipment Operator': ['excavator', 'dozer', 'payloader', 'grader'],
      'Paving Machine Operator': ['paver'],
      'Milling Machine Operator': ['millingMachine'],
      'Roller Operator': ['roller'],
      'CDL Class A': ['truck'],
      'CDL Class B': ['truck'],
      'Crane Operator': ['equipment'], // Generic equipment for cranes
      'Forklift Operator': ['skidsteer'] // Similar operation
    };

    return certificationMap[certification] || [];
  }

  /**
   * Get maximum number of attachments for specific equipment combinations
   */
  private static getMaxAttachments(equipmentType: ResourceType, attachmentType: ResourceType): number {
    // Default max attachments
    const maxMap: Record<string, Record<string, number>> = {
      'paver': {
        'laborer': 2, // Up to 2 screwmen
        'operator': 1
      },
      'millingMachine': {
        'laborer': 1, // 1 groundman
        'operator': 1
      },
      'truck': {
        'driver': 1
      }
    };

    return maxMap[equipmentType]?.[attachmentType] || 1;
  }

  /**
   * Analyze existing rules to detect conflicts and suggest improvements
   */
  static analyzeExistingRules(
    existingMagnetRules: MagnetInteractionRule[],
    _existingDropRules: DropRule[] // Available for conflict analysis implementation
  ): {
    conflicts: string[];
    suggestions: string[];
    coverage: number; // Percentage of common scenarios covered
  } {
    void _existingDropRules; // Acknowledge unused parameter for future implementation
    const conflicts: string[] = [];
    const suggestions: string[] = [];

    // Check for circular dependencies
    existingMagnetRules.forEach(rule => {
      const reverse = existingMagnetRules.find(r => 
        r.sourceType === rule.targetType && r.targetType === rule.sourceType
      );
      if (reverse && rule.isRequired && reverse.isRequired) {
        conflicts.push(`Circular dependency: ${rule.sourceType} ↔ ${rule.targetType}`);
      }
    });

    // Check for missing safety rules
    const safetyEquipment = ['paver', 'millingMachine', 'excavator', 'grader', 'dozer'];
    safetyEquipment.forEach(equipType => {
      const hasOperatorRule = existingMagnetRules.some(r => 
        r.targetType === equipType && r.sourceType === 'operator' && r.isRequired
      );
      if (!hasOperatorRule) {
        suggestions.push(`Consider requiring operators for ${equipType} equipment`);
      }
    });

    // Calculate coverage (simplified)
    const expectedRules = 20; // Rough estimate of common rules
    const coverage = Math.min((existingMagnetRules.length / expectedRules) * 100, 100);

    return { conflicts, suggestions, coverage };
  }

  /**
   * Generate a complete rule set for a standard construction company
   */
  static generateStandardConstructionRules(): GeneratedRule[] {
    const rules: GeneratedRule[] = [];

    // Standard operator requirements
    const heavyEquipment = ['paver', 'millingMachine', 'excavator', 'grader', 'dozer', 'payloader', 'roller'];
    heavyEquipment.forEach(equipType => {
      rules.push({
        id: `std_operator_${equipType}`,
        type: 'magnet_interaction',
        description: `${equipType.charAt(0).toUpperCase() + equipType.slice(1)} requires operator`,
        confidence: 0.95,
        category: 'safety',
        rule: {
          sourceType: 'operator' as ResourceType,
          targetType: equipType as ResourceType,
          canAttach: true,
          isRequired: true,
          maxCount: 1
        },
        reasoning: 'Industry standard safety requirement for heavy equipment'
      });
    });

    // Standard truck-driver requirements
    rules.push({
      id: 'std_truck_driver',
      type: 'magnet_interaction',
      description: 'Trucks require drivers',
      confidence: 0.95,
      category: 'safety',
      rule: {
        sourceType: 'driver' as ResourceType,
        targetType: 'truck' as ResourceType,
        canAttach: true,
        isRequired: true,
        maxCount: 1
      },
      reasoning: 'Legal requirement for vehicle operation'
    });

    return rules;
  }
}

export default SmartRuleGenerator;