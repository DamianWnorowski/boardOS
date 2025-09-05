import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Use environment variables or test config
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://eqbgcfdoyndocuomntdx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export interface MagnetRule {
  id: string;
  parent_type: string;
  child_type: string;
  max_children: number | null;
  required: boolean;
  auto_attach: boolean;
  description: string;
}

export interface DropRule {
  id: string;
  resource_type: string;
  target_type: string;
  is_allowed: boolean;
  requires_attachment: boolean;
  description: string;
}

export interface JobRowConfig {
  id: string;
  job_type: string;
  row_type: string;
  allowed_resource_types: string[];
  position: number;
  is_required: boolean;
}

export interface BusinessRule {
  type: 'magnet' | 'drop' | 'job_row' | 'custom';
  rule: MagnetRule | DropRule | JobRowConfig | unknown;
  testScenarios?: TestScenario[];
}

export interface TestScenario {
  name: string;
  setup: () => unknown;
  expectedBehavior: string;
  assertions: Array<{
    type: 'attachment' | 'drop' | 'validation' | 'ui';
    expected: unknown;
  }>;
}

export class RuleFetcher {
  private supabase;
  private useMockData: boolean = false;

  constructor() {
    if (!supabaseKey) {
      console.log('Using mock data for testing (no Supabase key found)');
      this.useMockData = true;
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  async fetchMagnetRules(): Promise<MagnetRule[]> {
    if (this.useMockData) {
      return this.getMockMagnetRules();
    }

    const { data, error } = await this.supabase
      .from('magnet_interaction_rules')
      .select('*')
      .order('parent_type', { ascending: true });

    if (error) {
      console.error('Error fetching magnet rules, using mock data:', error);
      return this.getMockMagnetRules();
    }

    return data || [];
  }

  private getMockMagnetRules(): MagnetRule[] {
    try {
      const mockConfig = await import('../config/test-rules.json');
      return mockConfig.mockRules.magnetRules;
    } catch (err) {
      console.error('Could not load mock rules:', err);
      return [];
    }
  }

  async fetchDropRules(): Promise<DropRule[]> {
    if (this.useMockData) {
      return this.getMockDropRules();
    }

    const { data, error } = await this.supabase
      .from('drop_rules')
      .select('*')
      .order('resource_type', { ascending: true });

    if (error) {
      console.error('Error fetching drop rules, using mock data:', error);
      return this.getMockDropRules();
    }

    return data || [];
  }

  private getMockDropRules(): DropRule[] {
    try {
      const mockConfig = await import('../config/test-rules.json');
      return mockConfig.mockRules.dropRules;
    } catch (err) {
      console.error('Could not load mock rules:', err);
      return [];
    }
  }

  async fetchJobRowConfigs(): Promise<JobRowConfig[]> {
    if (this.useMockData) {
      return this.getMockJobRowConfigs();
    }

    const { data, error } = await this.supabase
      .from('job_row_configs')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching job row configs, using mock data:', error);
      return this.getMockJobRowConfigs();
    }

    return data || [];
  }

  private getMockJobRowConfigs(): JobRowConfig[] {
    try {
      const mockConfig = await import('../config/test-rules.json');
      return mockConfig.mockRules.jobRowConfigs;
    } catch (err) {
      console.error('Could not load mock configs:', err);
      return [];
    }
  }

  async fetchAllBusinessRules(): Promise<BusinessRule[]> {
    const [magnetRules, dropRules, jobRowConfigs] = await Promise.all([
      this.fetchMagnetRules(),
      this.fetchDropRules(),
      this.fetchJobRowConfigs()
    ]);

    const rules: BusinessRule[] = [];

    // Convert magnet rules to business rules with test scenarios
    magnetRules.forEach(rule => {
      rules.push({
        type: 'magnet',
        rule,
        testScenarios: this.generateMagnetTestScenarios(rule)
      });
    });

    // Convert drop rules to business rules
    dropRules.forEach(rule => {
      rules.push({
        type: 'drop',
        rule,
        testScenarios: this.generateDropTestScenarios(rule)
      });
    });

    // Convert job row configs to business rules
    jobRowConfigs.forEach(config => {
      rules.push({
        type: 'job_row',
        rule: config,
        testScenarios: this.generateJobRowTestScenarios(config)
      });
    });

    return rules;
  }

  private generateMagnetTestScenarios(rule: MagnetRule): TestScenario[] {
    const scenarios: TestScenario[] = [];

    // Test successful attachment
    scenarios.push({
      name: `${rule.parent_type} can attach ${rule.child_type}`,
      setup: () => ({
        parent: { type: rule.parent_type, id: `${rule.parent_type}-1` },
        child: { type: rule.child_type, id: `${rule.child_type}-1` }
      }),
      expectedBehavior: `${rule.child_type} should attach to ${rule.parent_type}`,
      assertions: [
        {
          type: 'attachment',
          expected: { attached: true, parentId: `${rule.parent_type}-1`, childId: `${rule.child_type}-1` }
        }
      ]
    });

    // Test max children limit if applicable
    if (rule.max_children) {
      scenarios.push({
        name: `${rule.parent_type} respects max ${rule.max_children} ${rule.child_type}`,
        setup: () => ({
          parent: { type: rule.parent_type, id: `${rule.parent_type}-1` },
          children: Array.from({ length: rule.max_children + 1 }, (_, i) => ({
            type: rule.child_type,
            id: `${rule.child_type}-${i + 1}`
          }))
        }),
        expectedBehavior: `Should only allow ${rule.max_children} ${rule.child_type} to attach`,
        assertions: [
          {
            type: 'attachment',
            expected: { 
              attachedCount: rule.max_children,
              rejectedCount: 1
            }
          }
        ]
      });
    }

    // Test required attachment
    if (rule.required) {
      scenarios.push({
        name: `${rule.parent_type} requires ${rule.child_type}`,
        setup: () => ({
          parent: { type: rule.parent_type, id: `${rule.parent_type}-1` }
        }),
        expectedBehavior: `${rule.parent_type} should show warning without ${rule.child_type}`,
        assertions: [
          {
            type: 'validation',
            expected: { 
              valid: false,
              warningMessage: `${rule.parent_type} requires ${rule.child_type}`
            }
          }
        ]
      });
    }

    return scenarios;
  }

  private generateDropTestScenarios(rule: DropRule): TestScenario[] {
    const scenarios: TestScenario[] = [];

    if (rule.is_allowed) {
      scenarios.push({
        name: `${rule.resource_type} can drop on ${rule.target_type}`,
        setup: () => ({
          resource: { type: rule.resource_type, id: `${rule.resource_type}-1` },
          target: { type: rule.target_type, id: 'target-1' }
        }),
        expectedBehavior: `${rule.resource_type} should successfully drop on ${rule.target_type}`,
        assertions: [
          {
            type: 'drop',
            expected: { 
              success: true,
              resourceId: `${rule.resource_type}-1`,
              targetId: 'target-1'
            }
          }
        ]
      });
    } else {
      scenarios.push({
        name: `${rule.resource_type} cannot drop on ${rule.target_type}`,
        setup: () => ({
          resource: { type: rule.resource_type, id: `${rule.resource_type}-1` },
          target: { type: rule.target_type, id: 'target-1' }
        }),
        expectedBehavior: `${rule.resource_type} should be rejected from ${rule.target_type}`,
        assertions: [
          {
            type: 'drop',
            expected: { 
              success: false,
              errorMessage: `${rule.resource_type} cannot be assigned to ${rule.target_type}`
            }
          }
        ]
      });
    }

    return scenarios;
  }

  private generateJobRowTestScenarios(config: JobRowConfig): TestScenario[] {
    const scenarios: TestScenario[] = [];

    // Test allowed resource types
    config.allowed_resource_types.forEach(resourceType => {
      scenarios.push({
        name: `${config.row_type} row accepts ${resourceType}`,
        setup: () => ({
          job: { type: config.job_type, id: 'job-1' },
          row: { type: config.row_type, position: config.position },
          resource: { type: resourceType, id: `${resourceType}-1` }
        }),
        expectedBehavior: `${resourceType} should be accepted in ${config.row_type} row`,
        assertions: [
          {
            type: 'drop',
            expected: {
              success: true,
              rowType: config.row_type,
              resourceType: resourceType
            }
          }
        ]
      });
    });

    // Test rejected resource types
    const commonTypes = ['operator', 'driver', 'excavator', 'paver', 'truck'];
    const rejectedTypes = commonTypes.filter(t => !config.allowed_resource_types.includes(t));
    
    rejectedTypes.forEach(resourceType => {
      scenarios.push({
        name: `${config.row_type} row rejects ${resourceType}`,
        setup: () => ({
          job: { type: config.job_type, id: 'job-1' },
          row: { type: config.row_type, position: config.position },
          resource: { type: resourceType, id: `${resourceType}-1` }
        }),
        expectedBehavior: `${resourceType} should be rejected from ${config.row_type} row`,
        assertions: [
          {
            type: 'drop',
            expected: {
              success: false,
              errorMessage: `${resourceType} not allowed in ${config.row_type} row`
            }
          }
        ]
      });
    });

    return scenarios;
  }

  // Custom business rules that aren't in database
  async fetchCustomRules(): Promise<BusinessRule[]> {
    return [
      {
        type: 'custom',
        rule: {
          name: 'double-shift-prevention',
          description: 'Resources cannot work both day and night shifts on the same date'
        },
        testScenarios: [
          {
            name: 'Prevent double shift assignment',
            setup: () => ({
              resource: { type: 'operator', id: 'op-1' },
              dayJob: { id: 'job-day', shift: 'day' },
              nightJob: { id: 'job-night', shift: 'night' }
            }),
            expectedBehavior: 'Resource assigned to day shift cannot be assigned to night shift',
            assertions: [
              {
                type: 'validation',
                expected: {
                  canAssign: false,
                  reason: 'double-shift'
                }
              }
            ]
          }
        ]
      },
      {
        type: 'custom',
        rule: {
          name: 'equipment-safety',
          description: 'Equipment must have operator before job can be finalized'
        },
        testScenarios: [
          {
            name: 'Cannot finalize job with unattended equipment',
            setup: () => ({
              job: { id: 'job-1', finalized: false },
              equipment: { type: 'excavator', id: 'ex-1', hasOperator: false }
            }),
            expectedBehavior: 'Job finalization should fail with unattended equipment',
            assertions: [
              {
                type: 'validation',
                expected: {
                  canFinalize: false,
                  errors: ['Equipment requires operator']
                }
              }
            ]
          }
        ]
      }
    ];
  }
}