// TODO: These imports are for future test generation functionality
// import { test, expect } from '@playwright/test';
import { RuleFetcher, BusinessRule, TestScenario } from '../services/rule-fetcher.js';
// import { TestDataFactory } from '../fixtures/test-data.js';
// import { SchedulerPage } from '../pages/SchedulerPage.js';
// import { MagnetPage } from '../pages/MagnetPage.js';

export class DynamicTestGenerator {
  private ruleFetcher: RuleFetcher;

  constructor() {
    this.ruleFetcher = new RuleFetcher();
  }

  /**
   * Generate test code string from business rules
   */
  async generateTestCode(): Promise<string> {
    const rules = await this.ruleFetcher.fetchAllBusinessRules();
    const customBusinessRules = await this.ruleFetcher.fetchCustomRules();
    const allRules = [...rules, ...customBusinessRules];

    let testCode = `// Auto-generated tests from business rules
// Generated at: ${new Date().toISOString()}

import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../pages/SchedulerPage';
import { MagnetPage } from '../pages/MagnetPage';
import { TestDataFactory } from '../fixtures/test-data';

`;

    // Group rules by type for better organization
    const magnetRules = allRules.filter(r => r.type === 'magnet');
    const dropRules = allRules.filter(r => r.type === 'drop');
    const jobRowRules = allRules.filter(r => r.type === 'job_row');
    const customRules = allRules.filter(r => r.type === 'custom');

    // Generate magnet attachment tests
    if (magnetRules.length > 0) {
      testCode += this.generateMagnetTests(magnetRules);
    }

    // Generate drop rule tests
    if (dropRules.length > 0) {
      testCode += this.generateDropTests(dropRules);
    }

    // Generate job row configuration tests
    if (jobRowRules.length > 0) {
      testCode += this.generateJobRowTests(jobRowRules);
    }

    // Generate custom business rule tests
    if (customRules.length > 0) {
      testCode += this.generateCustomTests(customRules);
    }

    return testCode;
  }

  private generateMagnetTests(rules: BusinessRule[]): string {
    let code = `
test.describe('Dynamic Magnet Attachment Rules', () => {
  let schedulerPage: SchedulerPage;
  let magnetPage: MagnetPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    magnetPage = new MagnetPage(page);
    await schedulerPage.goto();
  });
`;

    rules.forEach(rule => {
      if (rule.testScenarios) {
        rule.testScenarios.forEach(scenario => {
          code += this.generateTestCase(scenario, 'magnet');
        });
      }
    });

    code += `});

`;
    return code;
  }

  private generateDropTests(rules: BusinessRule[]): string {
    let code = `
test.describe('Dynamic Drop Rules', () => {
  let schedulerPage: SchedulerPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
  });
`;

    rules.forEach(rule => {
      if (rule.testScenarios) {
        rule.testScenarios.forEach(scenario => {
          code += this.generateTestCase(scenario, 'drop');
        });
      }
    });

    code += `});

`;
    return code;
  }

  private generateJobRowTests(rules: BusinessRule[]): string {
    let code = `
test.describe('Dynamic Job Row Configuration', () => {
  let schedulerPage: SchedulerPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
  });
`;

    rules.forEach(rule => {
      if (rule.testScenarios) {
        rule.testScenarios.forEach(scenario => {
          code += this.generateTestCase(scenario, 'job_row');
        });
      }
    });

    code += `});

`;
    return code;
  }

  private generateCustomTests(rules: BusinessRule[]): string {
    let code = `
test.describe('Custom Business Rules', () => {
  let schedulerPage: SchedulerPage;
  let magnetPage: MagnetPage;

  test.beforeEach(async ({ page }) => {
    schedulerPage = new SchedulerPage(page);
    magnetPage = new MagnetPage(page);
    await schedulerPage.goto();
  });
`;

    rules.forEach(rule => {
      if (rule.testScenarios) {
        rule.testScenarios.forEach(scenario => {
          code += this.generateTestCase(scenario, 'custom');
        });
      }
    });

    code += `});

`;
    return code;
  }

  private generateTestCase(scenario: TestScenario, type: string): string {
    let code = `
  test('${scenario.name}', async ({ page }) => {
    // Setup test data
    const testData = ${JSON.stringify(scenario.setup(), null, 4).replace(/"([^"]+)":/g, '$1:')};
`;

    // Generate actions based on test type
    switch (type) {
      case 'magnet':
        code += this.generateMagnetActions(scenario);
        break;
      case 'drop':
        code += this.generateDropActions(scenario);
        break;
      case 'job_row':
        code += this.generateJobRowActions(scenario);
        break;
      case 'custom':
        code += this.generateCustomActions(scenario);
        break;
    }

    // Generate assertions
    code += `
    // Verify expected behavior: ${scenario.expectedBehavior}
`;
    scenario.assertions.forEach(assertion => {
      code += this.generateAssertion(assertion);
    });

    code += `  });

`;
    return code;
  }

  private generateMagnetActions(_scenario: TestScenario): string {
    // Generate magnet actions for scenario: ${_scenario?.name || 'unknown'}
    void _scenario; // Acknowledge parameter for ESLint
    return `
    // Perform magnet attachment
    if (testData.parent && testData.child) {
      await magnetPage.dragMagnetToTarget(testData.child.id, testData.parent.id);
      await page.waitForTimeout(500); // Wait for attachment
    }
    
    if (testData.children) {
      for (const child of testData.children) {
        await magnetPage.dragMagnetToTarget(child.id, testData.parent.id);
        await page.waitForTimeout(200);
      }
    }
`;
  }

  private generateDropActions(_scenario: TestScenario): string {
    // Generate drop actions for scenario: ${_scenario?.name || 'unknown'}
    void _scenario; // Acknowledge parameter for ESLint
    return `
    // Perform drop operation
    if (testData.resource && testData.target) {
      const targetRowType = testData.target.type || 'Equipment';
      await schedulerPage.dragResourceToJob(
        testData.resource.id,
        testData.target.id,
        targetRowType
      );
      await page.waitForTimeout(500);
    }
`;
  }

  private generateJobRowActions(_scenario: TestScenario): string {
    // Generate job row actions for scenario: ${_scenario?.name || 'unknown'}
    void _scenario; // Acknowledge parameter for ESLint
    return `
    // Test job row configuration
    if (testData.resource && testData.job && testData.row) {
      await schedulerPage.dragResourceToJob(
        testData.resource.id,
        testData.job.id,
        testData.row.type
      );
      await page.waitForTimeout(500);
    }
`;
  }

  private generateCustomActions(_scenario: TestScenario): string {
    // Custom actions based on the scenario name
    if (_scenario.name.includes('double shift')) {
      return `
    // Test double shift prevention
    if (testData.resource && testData.dayJob && testData.nightJob) {
      // Assign to day job first
      await schedulerPage.dragResourceToJob(
        testData.resource.id,
        testData.dayJob.id,
        'Crew'
      );
      await page.waitForTimeout(500);
      
      // Attempt to assign to night job
      await schedulerPage.dragResourceToJob(
        testData.resource.id,
        testData.nightJob.id,
        'Crew'
      );
      await page.waitForTimeout(500);
    }
`;
    } else if (_scenario.name.includes('finalize')) {
      return `
    // Test job finalization
    if (testData.job && testData.equipment) {
      // Add equipment without operator
      await schedulerPage.dragResourceToJob(
        testData.equipment.id,
        testData.job.id,
        'Equipment'
      );
      await page.waitForTimeout(500);
      
      // Attempt to finalize job
      const finalizeButton = page.locator('[data-testid="finalize-job"]');
      if (await finalizeButton.isVisible()) {
        await finalizeButton.click();
        await page.waitForTimeout(500);
      }
    }
`;
    }
    
    return `
    // Custom test action
    console.log('Executing custom test: ${_scenario.name}');
`;
  }

  private generateAssertion(assertion: unknown): string {
    switch (assertion.type) {
      case 'attachment':
        if (assertion.expected.attached !== undefined) {
          return `
    const isAttached = await magnetPage.verifyAttachment(
      '${assertion.expected.parentId}',
      '${assertion.expected.childId}'
    );
    expect(isAttached).toBe(${assertion.expected.attached});
`;
        } else if (assertion.expected.attachedCount !== undefined) {
          return `
    const attachedResources = await magnetPage.getAttachedResources(testData.parent.id);
    expect(attachedResources.length).toBe(${assertion.expected.attachedCount});
`;
        }
        break;

      case 'drop':
        return `
    const isAssigned = await schedulerPage.isResourceAssigned(
      testData.resource.id,
      testData.target?.id || testData.job?.id
    );
    expect(isAssigned).toBe(${assertion.expected.success});
`;

      case 'validation':
        if (assertion.expected.valid !== undefined) {
          return `
    // Check validation state
    const validationError = page.locator('[data-testid="validation-error"]');
    const hasError = await validationError.isVisible();
    expect(hasError).toBe(${!assertion.expected.valid});
`;
        } else if (assertion.expected.canAssign !== undefined) {
          return `
    // Verify assignment was prevented
    const isAssigned = await schedulerPage.isResourceAssigned(
      testData.resource.id,
      testData.nightJob.id
    );
    expect(isAssigned).toBe(${assertion.expected.canAssign});
`;
        } else if (assertion.expected.canFinalize !== undefined) {
          return `
    // Check finalization state
    const errorMessage = page.locator('[data-testid="finalize-error"]');
    const hasError = await errorMessage.isVisible();
    expect(hasError).toBe(${!assertion.expected.canFinalize});
`;
        }
        break;

      case 'ui':
        return `
    // UI assertion
    const element = page.locator('[data-testid="${assertion.expected.elementId}"]');
    expect(await element.isVisible()).toBe(${assertion.expected.visible || true});
`;

      default:
        return `
    // Custom assertion
    console.log('Assertion type: ${assertion.type}', ${JSON.stringify(assertion.expected)});
`;
    }

    return '';
  }

  /**
   * Write generated tests to file
   */
  async generateAndSaveTests(outputPath: string): Promise<void> {
    const testCode = await this.generateTestCode();
    const { promises: fs } = await import('fs');
    await fs.writeFile(outputPath, testCode, 'utf-8');
    console.log(`Generated dynamic tests saved to: ${outputPath}`);
  }

  /**
   * Generate tests on demand (can be called from npm script)
   */
  static async run(): Promise<void> {
    const generator = new DynamicTestGenerator();
    const outputPath = 'playwright/tests/dynamic/auto-generated-rules.spec.ts';
    
    try {
      await generator.generateAndSaveTests(outputPath);
      console.log('✅ Dynamic tests generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate dynamic tests:', error);
      process.exit(1);
    }
  }
}

// Allow running directly from command line
if (require.main === module) {
  DynamicTestGenerator.run();
}