import { ResourceType, RowType, MagnetInteractionRule, DropRule } from '../types';

export interface JobTypeConfiguration {
  id: string;
  name: string;
  description: string;
  type: 'paving' | 'milling' | 'both' | 'drainage' | 'concrete' | 'excavation' | 'stripping' | 'custom';
  icon?: string;
  defaultRows: JobRowConfiguration[];
  dropRules: DropRule[];
  isCustom?: boolean;
}

export interface JobRowConfiguration {
  rowType: RowType;
  enabled: boolean;
  required: boolean;
  allowedResources: ResourceType[];
  requiredResources: ResourceType[];
  maxCount?: number;
  description?: string;
  customName?: string;
}

/**
 * Default job type configurations with industry-standard row setups and rules
 */
export const DEFAULT_JOB_CONFIGURATIONS: Record<string, JobTypeConfiguration> = {
  paving: {
    id: 'paving',
    name: 'Paving',
    description: 'Asphalt paving operations',
    type: 'paving',
    icon: '🛣️',
    defaultRows: [
      {
        rowType: 'Forman',
        enabled: true,
        required: true,
        allowedResources: ['foreman'],
        requiredResources: ['foreman'],
        maxCount: 1,
        description: 'Foreman to supervise paving operations'
      },
      {
        rowType: 'Equipment',
        enabled: true,
        required: true,
        allowedResources: ['paver', 'roller', 'operator'],
        requiredResources: ['paver', 'operator'],
        description: 'Paver and compaction equipment with operators'
      },
      {
        rowType: 'crew',
        enabled: true,
        required: true,
        allowedResources: ['laborer', 'striper'],
        requiredResources: ['laborer'],
        description: 'Ground crew for paving support and quality control'
      },
      {
        rowType: 'trucks',
        enabled: true,
        required: true,
        allowedResources: ['truck', 'driver'],
        requiredResources: ['truck', 'driver'],
        description: 'Material haul trucks with drivers'
      },
      {
        rowType: 'Tack',
        enabled: true,
        required: false,
        allowedResources: ['truck', 'driver'],
        requiredResources: [],
        description: 'Tack coat application (optional)'
      }
    ],
    dropRules: [
      {
        rowType: 'Forman',
        allowedTypes: ['foreman']
      },
      {
        rowType: 'Equipment',
        allowedTypes: ['paver', 'roller', 'operator']
      },
      {
        rowType: 'crew',
        allowedTypes: ['laborer', 'striper']
      },
      {
        rowType: 'trucks',
        allowedTypes: ['truck', 'driver']
      },
      {
        rowType: 'Tack',
        allowedTypes: ['truck', 'driver']
      }
    ]
  },

  milling: {
    id: 'milling',
    name: 'Milling',
    description: 'Asphalt milling and removal operations',
    type: 'milling',
    icon: '⚒️',
    defaultRows: [
      {
        rowType: 'Forman',
        enabled: true,
        required: true,
        allowedResources: ['foreman'],
        requiredResources: ['foreman'],
        maxCount: 1,
        description: 'Foreman to supervise milling operations'
      },
      {
        rowType: 'Equipment',
        enabled: true,
        required: true,
        allowedResources: ['millingMachine', 'operator'],
        requiredResources: ['millingMachine', 'operator'],
        description: 'Milling machine with certified operator'
      },
      {
        rowType: 'crew',
        enabled: true,
        required: true,
        allowedResources: ['laborer'],
        requiredResources: ['laborer'],
        description: 'Ground crew for traffic control and cleanup'
      },
      {
        rowType: 'trucks',
        enabled: true,
        required: true,
        allowedResources: ['truck', 'driver'],
        requiredResources: ['truck', 'driver'],
        description: 'Haul trucks for millings removal'
      },
      {
        rowType: 'Sweeper',
        enabled: true,
        required: true,
        allowedResources: ['sweeper', 'operator'],
        requiredResources: ['sweeper', 'operator'],
        description: 'Street sweeper for cleanup operations'
      }
    ],
    dropRules: [
      {
        rowType: 'Forman',
        allowedTypes: ['foreman']
      },
      {
        rowType: 'Equipment',
        allowedTypes: ['millingMachine', 'operator']
      },
      {
        rowType: 'crew',
        allowedTypes: ['laborer']
      },
      {
        rowType: 'trucks',
        allowedTypes: ['truck', 'driver']
      },
      {
        rowType: 'Sweeper',
        allowedTypes: ['sweeper', 'operator']
      }
    ]
  },

  both: {
    id: 'both',
    name: 'Mill & Pave',
    description: 'Combined milling and paving operations',
    type: 'both',
    icon: '🔄',
    defaultRows: [
      {
        rowType: 'Forman',
        enabled: true,
        required: true,
        allowedResources: ['foreman'],
        requiredResources: ['foreman'],
        maxCount: 1,
        description: 'Foreman to supervise both milling and paving'
      },
      {
        rowType: 'Equipment',
        enabled: true,
        required: true,
        allowedResources: ['millingMachine', 'paver', 'roller', 'operator'],
        requiredResources: ['millingMachine', 'paver', 'operator'],
        description: 'Milling machine, paver, and compaction equipment'
      },
      {
        rowType: 'crew',
        enabled: true,
        required: true,
        allowedResources: ['laborer', 'striper'],
        requiredResources: ['laborer'],
        description: 'Ground crew for both operations'
      },
      {
        rowType: 'trucks',
        enabled: true,
        required: true,
        allowedResources: ['truck', 'driver'],
        requiredResources: ['truck', 'driver'],
        description: 'Trucks for millings removal and material delivery'
      },
      {
        rowType: 'Sweeper',
        enabled: true,
        required: true,
        allowedResources: ['sweeper', 'operator'],
        requiredResources: ['sweeper', 'operator'],
        description: 'Sweeper for cleanup between operations'
      },
      {
        rowType: 'Tack',
        enabled: true,
        required: false,
        allowedResources: ['truck', 'driver'],
        requiredResources: [],
        description: 'Tack coat application before paving'
      }
    ],
    dropRules: [
      {
        rowType: 'Forman',
        allowedTypes: ['foreman']
      },
      {
        rowType: 'Equipment',
        allowedTypes: ['millingMachine', 'paver', 'roller', 'sweeper', 'operator']
      },
      {
        rowType: 'crew',
        allowedTypes: ['laborer', 'striper']
      },
      {
        rowType: 'trucks',
        allowedTypes: ['truck', 'driver']
      },
      {
        rowType: 'Sweeper',
        allowedTypes: ['sweeper', 'operator']
      },
      {
        rowType: 'Tack',
        allowedTypes: ['truck', 'driver']
      }
    ]
  },

  drainage: {
    id: 'drainage',
    name: 'Drainage',
    description: 'Storm drain installation and maintenance',
    type: 'drainage',
    icon: '🌧️',
    defaultRows: [
      {
        rowType: 'Forman',
        enabled: true,
        required: true,
        allowedResources: ['foreman'],
        requiredResources: ['foreman'],
        maxCount: 1,
        description: 'Foreman to supervise drainage work'
      },
      {
        rowType: 'Equipment',
        enabled: true,
        required: true,
        allowedResources: ['excavator', 'operator'],
        requiredResources: ['excavator', 'operator'],
        description: 'Excavator for trenching and pipe installation'
      },
      {
        rowType: 'crew',
        enabled: true,
        required: true,
        allowedResources: ['laborer'],
        requiredResources: ['laborer'],
        description: 'Crew for pipe laying and backfill'
      },
      {
        rowType: 'trucks',
        enabled: true,
        required: true,
        allowedResources: ['truck', 'driver'],
        requiredResources: ['truck', 'driver'],
        description: 'Material delivery and spoils removal'
      }
    ],
    dropRules: [
      {
        rowType: 'Forman',
        allowedTypes: ['foreman']
      },
      {
        rowType: 'Equipment',
        allowedTypes: ['excavator', 'operator']
      },
      {
        rowType: 'crew',
        allowedTypes: ['laborer']
      },
      {
        rowType: 'trucks',
        allowedTypes: ['truck', 'driver']
      }
    ]
  },

  concrete: {
    id: 'concrete',
    name: 'Concrete',
    description: 'Concrete paving and structures',
    type: 'concrete',
    icon: '🏗️',
    defaultRows: [
      {
        rowType: 'Forman',
        enabled: true,
        required: true,
        allowedResources: ['foreman'],
        requiredResources: ['foreman'],
        maxCount: 1,
        description: 'Foreman to supervise concrete operations'
      },
      {
        rowType: 'Equipment',
        enabled: true,
        required: false,
        allowedResources: ['equipment', 'operator'],
        requiredResources: [],
        description: 'Concrete finishing equipment (optional)'
      },
      {
        rowType: 'crew',
        enabled: true,
        required: true,
        allowedResources: ['laborer'],
        requiredResources: ['laborer'],
        description: 'Concrete finishing crew'
      },
      {
        rowType: 'trucks',
        enabled: true,
        required: true,
        allowedResources: ['truck', 'driver'],
        requiredResources: ['truck', 'driver'],
        description: 'Concrete delivery trucks'
      }
    ],
    dropRules: [
      {
        rowType: 'Forman',
        allowedTypes: ['foreman']
      },
      {
        rowType: 'Equipment',
        allowedTypes: ['equipment', 'operator']
      },
      {
        rowType: 'crew',
        allowedTypes: ['laborer']
      },
      {
        rowType: 'trucks',
        allowedTypes: ['truck', 'driver']
      }
    ]
  },

  excavation: {
    id: 'excavation',
    name: 'Excavation',
    description: 'General excavation and earthwork',
    type: 'excavation',
    icon: '⛏️',
    defaultRows: [
      {
        rowType: 'Forman',
        enabled: true,
        required: true,
        allowedResources: ['foreman'],
        requiredResources: ['foreman'],
        maxCount: 1,
        description: 'Foreman to supervise excavation work'
      },
      {
        rowType: 'Equipment',
        enabled: true,
        required: true,
        allowedResources: ['excavator', 'dozer', 'operator'],
        requiredResources: ['excavator', 'operator'],
        description: 'Heavy equipment for excavation and grading'
      },
      {
        rowType: 'crew',
        enabled: true,
        required: true,
        allowedResources: ['laborer'],
        requiredResources: ['laborer'],
        description: 'Ground crew for support operations'
      },
      {
        rowType: 'trucks',
        enabled: true,
        required: true,
        allowedResources: ['truck', 'driver'],
        requiredResources: ['truck', 'driver'],
        description: 'Haul trucks for material transport'
      }
    ],
    dropRules: [
      {
        rowType: 'Forman',
        allowedTypes: ['foreman']
      },
      {
        rowType: 'Equipment',
        allowedTypes: ['excavator', 'dozer', 'operator']
      },
      {
        rowType: 'crew',
        allowedTypes: ['laborer']
      },
      {
        rowType: 'trucks',
        allowedTypes: ['truck', 'driver']
      }
    ]
  },

  stripping: {
    id: 'stripping',
    name: 'Stripping',
    description: 'Pavement marking and striping operations',
    type: 'stripping',
    icon: '🎨',
    defaultRows: [
      {
        rowType: 'Forman',
        enabled: true,
        required: true,
        allowedResources: ['foreman'],
        requiredResources: ['foreman'],
        maxCount: 1,
        description: 'Foreman to supervise striping operations'
      },
      {
        rowType: 'Equipment',
        enabled: true,
        required: false,
        allowedResources: ['equipment', 'operator'],
        requiredResources: [],
        description: 'Striping equipment (if mechanical)'
      },
      {
        rowType: 'crew',
        enabled: true,
        required: true,
        allowedResources: ['striper', 'laborer'],
        requiredResources: ['striper'],
        description: 'Striping crew for line painting'
      },
      {
        rowType: 'trucks',
        enabled: true,
        required: true,
        allowedResources: ['truck', 'driver'],
        requiredResources: ['truck', 'driver'],
        description: 'Equipment and material transport'
      }
    ],
    dropRules: [
      {
        rowType: 'Forman',
        allowedTypes: ['foreman']
      },
      {
        rowType: 'Equipment',
        allowedTypes: ['equipment', 'operator']
      },
      {
        rowType: 'crew',
        allowedTypes: ['striper', 'laborer']
      },
      {
        rowType: 'trucks',
        allowedTypes: ['truck', 'driver']
      }
    ]
  }
};

/**
 * Utility class for managing job rules configurations
 */
export class JobRulesConfigurationManager {
  
  /**
   * Get configuration for a specific job type
   */
  static getConfiguration(jobType: string): JobTypeConfiguration | null {
    return DEFAULT_JOB_CONFIGURATIONS[jobType] || null;
  }

  /**
   * Get all available job type configurations
   */
  static getAllConfigurations(): JobTypeConfiguration[] {
    return Object.values(DEFAULT_JOB_CONFIGURATIONS);
  }

  /**
   * Get all standard job types (excluding custom ones)
   */
  static getStandardJobTypes(): JobTypeConfiguration[] {
    return Object.values(DEFAULT_JOB_CONFIGURATIONS).filter(config => !config.isCustom);
  }

  /**
   * Create a custom job configuration
   */
  static createCustomJobConfiguration(
    id: string,
    name: string,
    description: string,
    baseTemplate?: string
  ): JobTypeConfiguration {
    let baseConfig = baseTemplate ? DEFAULT_JOB_CONFIGURATIONS[baseTemplate] : null;
    
    if (!baseConfig) {
      // Default minimal configuration
      baseConfig = {
        id: 'basic',
        name: 'Basic',
        description: 'Basic job configuration',
        type: 'custom',
        defaultRows: [
          {
            rowType: 'Forman',
            enabled: true,
            required: true,
            allowedResources: ['foreman'],
            requiredResources: ['foreman']
          },
          {
            rowType: 'crew',
            enabled: true,
            required: true,
            allowedResources: ['laborer'],
            requiredResources: ['laborer']
          }
        ],
        dropRules: [
          { rowType: 'Forman', allowedTypes: ['foreman'] },
          { rowType: 'crew', allowedTypes: ['laborer'] }
        ]
      };
    }

    return {
      ...baseConfig,
      id,
      name,
      description,
      type: 'custom',
      isCustom: true
    };
  }

  /**
   * Validate a job configuration
   */
  static validateConfiguration(config: JobTypeConfiguration): boolean {
    if (!config.id || !config.name) return false;
    if (!config.defaultRows || config.defaultRows.length === 0) return false;
    if (!config.dropRules || config.dropRules.length === 0) return false;
    return true;
  }

  /**
   * Get row configuration for a specific row type in a job
   */
  static getRowConfiguration(jobType: string, rowType: RowType): JobRowConfiguration | null {
    const config = this.getConfiguration(jobType);
    if (!config) return null;
    return config.defaultRows.find(row => row.rowType === rowType) || null;
  }
}

/**
 * Global magnet interaction rules that define which resource types can attach to others
 * These are universal compatibility rules that apply across all job types
 */
export const GLOBAL_MAGNET_RULES: MagnetInteractionRule[] = [
  // Operators can attach to all equipment types
  {
    sourceType: 'operator',
    targetType: 'paver',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  {
    sourceType: 'operator',
    targetType: 'roller',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  {
    sourceType: 'operator',
    targetType: 'millingMachine',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  {
    sourceType: 'operator',
    targetType: 'excavator',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  {
    sourceType: 'operator',
    targetType: 'dozer',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  {
    sourceType: 'operator',
    targetType: 'payloader',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  {
    sourceType: 'operator',
    targetType: 'sweeper',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  {
    sourceType: 'operator',
    targetType: 'skidsteer',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  {
    sourceType: 'operator',
    targetType: 'grader',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  
  // Drivers can attach to trucks
  {
    sourceType: 'driver',
    targetType: 'truck',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  
  // Laborers can support equipment operations
  {
    sourceType: 'laborer',
    targetType: 'paver',
    canAttach: true,
    isRequired: false,
    maxCount: 2
  },
  {
    sourceType: 'laborer',
    targetType: 'millingMachine',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  {
    sourceType: 'laborer',
    targetType: 'excavator',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  
  // Foremen can attach to any resource for supervision
  {
    sourceType: 'foreman',
    targetType: 'paver',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  {
    sourceType: 'foreman',
    targetType: 'truck',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  },
  
  // Stripers can attach to striping-related equipment
  {
    sourceType: 'striper',
    targetType: 'truck',
    canAttach: true,
    isRequired: false,
    maxCount: 1
  }
];

export default JobRulesConfigurationManager;
