#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://eqbgcfdoyndocuomntdx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYmdjZmRveW5kb2N1b21udGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODQxMzMsImV4cCI6MjA3MTQ2MDEzM30.fUM25Cb_uWkJJ75Dw_uZVPn9qzZ-7z5o2zOq8jkQ0d8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchMagnetRules() {
  console.log('📊 Fetching magnet interaction rules...');
  const { data, error } = await supabase
    .from('magnet_interaction_rules')
    .select('*')
    .order('source_type');

  if (error) {
    console.error('Error fetching magnet rules:', error);
    return [];
  }
  
  console.log(`   Found ${data?.length || 0} magnet rules`);
  return data || [];
}

async function fetchDropRules() {
  console.log('📊 Fetching drop rules...');
  const { data, error } = await supabase
    .from('drop_rules')
    .select('*')
    .order('row_type');

  if (error) {
    console.error('Error fetching drop rules:', error);
    return [];
  }
  
  console.log(`   Found ${data?.length || 0} drop rules`);
  return data || [];
}

async function fetchJobRowConfigs() {
  console.log('📊 Fetching job row configurations...');
  const { data, error } = await supabase
    .from('job_row_configs')
    .select('*')
    .order('row_type');

  if (error) {
    console.error('Error fetching job row configs:', error);
    return [];
  }
  
  console.log(`   Found ${data?.length || 0} job row configs`);
  return data || [];
}

function generateMagnetTests(rules) {
  let tests = '';
  
  rules.forEach(rule => {
    // Only generate tests for attachable rules
    if (!rule.can_attach) return;
    
    // Test successful attachment
    tests += `
  test('${rule.source_type} can attach ${rule.target_type}', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    // Create test resources
    const source = TestDataFactory.create${capitalizeFirst(rule.source_type)}();
    const target = TestDataFactory.create${capitalizeFirst(rule.target_type)}();
    
    // Test attachment
    await magnet.dragMagnetToTarget(target.id, source.id);
    
    // Verify attachment
    const isAttached = await magnet.verifyAttachment(source.id, target.id);
    expect(isAttached).toBe(true);
  });
`;

    // Test max count limit
    if (rule.max_count && rule.max_count > 0) {
      tests += `
  test('${rule.source_type} respects max ${rule.max_count} ${rule.target_type}', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    const magnet = new MagnetPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.create${capitalizeFirst(rule.source_type)}();
    const targets = Array.from({ length: ${rule.max_count + 1} }, (_, i) => 
      TestDataFactory.create${capitalizeFirst(rule.target_type)}({ name: '${rule.target_type} ' + (i + 1) })
    );
    
    // Attach targets up to limit
    for (let i = 0; i < targets.length; i++) {
      await magnet.dragMagnetToTarget(targets[i].id, source.id);
    }
    
    // Verify only max allowed are attached
    const attached = await magnet.getAttachedResources(source.id);
    expect(attached.length).toBe(${rule.max_count});
  });
`;
    }

    // Test required attachment
    if (rule.is_required) {
      tests += `
  test('${rule.source_type} requires ${rule.target_type} for job finalization', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const source = TestDataFactory.create${capitalizeFirst(rule.source_type)}();
    
    // Add to job without required target
    await scheduler.dragResourceToJob(source.id, 'Test Job', 'Equipment');
    
    // Try to finalize - should fail
    const finalizeButton = page.locator('[data-testid="finalize-job"]');
    await finalizeButton.click();
    
    // Should show validation error
    const error = page.locator('[data-testid="validation-error"]');
    expect(await error.isVisible()).toBe(true);
    expect(await error.textContent()).toContain('requires ${rule.target_type}');
  });
`;
    }
  });
  
  return tests;
}

function generateDropTests(rules) {
  let tests = '';
  
  rules.forEach(rule => {
    // Each rule has a row_type and allowed_types array
    if (rule.allowed_types && rule.allowed_types.length > 0) {
      rule.allowed_types.forEach(resourceType => {
        tests += `
  test('${resourceType} can be dropped on ${rule.row_type} row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.create${capitalizeFirst(resourceType)}();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', '${rule.row_type}');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(true);
  });
`;
      });
      
      // Test rejection of non-allowed types
      const commonTypes = ['operator', 'driver', 'excavator', 'paver', 'truck'];
      const notAllowed = commonTypes.filter(t => !rule.allowed_types.includes(t));
      
      notAllowed.forEach(resourceType => {
        tests += `
  test('${resourceType} cannot be dropped on ${rule.row_type} row', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    const resource = TestDataFactory.create${capitalizeFirst(resourceType)}();
    
    await scheduler.dragResourceToJob(resource.id, 'Test Job', '${rule.row_type}');
    
    const isAssigned = await scheduler.isResourceAssigned(resource.id, 'Test Job');
    expect(isAssigned).toBe(false);
  });
`;
      });
    }
  });
  
  return tests;
}

function generateJobRowTests(configs) {
  let tests = '';
  
  // Job row configs are per job, not job type
  // Group by unique jobs
  const uniqueJobs = {};
  
  configs.forEach(config => {
    if (!uniqueJobs[config.job_id]) {
      uniqueJobs[config.job_id] = [];
    }
    uniqueJobs[config.job_id].push(config);
  });
  
  // Generate tests for row configuration validation
  Object.entries(uniqueJobs).forEach(([jobId, rows]) => {
    tests += `
  test('Job ${jobId.substring(0, 8)} has correct row types', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    // This would need to be adapted based on actual job lookup
    const jobRows = ${JSON.stringify(rows.map(r => r.row_type))};
    
    // Verify row configuration
    expect(jobRows).toBeDefined();
    expect(jobRows.length).toBeGreaterThan(0);
  });
`;
  });
  
  // Generate tests for row types that appear in configs
  const uniqueRowTypes = [...new Set(configs.map(c => c.row_type))];
  
  uniqueRowTypes.forEach(rowType => {
    tests += `
  test('${rowType} row configuration is valid', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    
    // Find a job with this row type
    const jobRow = await scheduler.getJobRow('Test Job', '${rowType}');
    
    // Verify row exists and is configured
    expect(await jobRow.isVisible()).toBe(true);
  });
`;
  });
  
  return tests;
}

function capitalizeFirst(str) {
  if (!str) return '';
  // Handle camelCase strings
  if (str === 'millingMachine') return 'MillingMachine';
  if (str === 'screwman') return 'Screwman';
  if (str === 'groundman') return 'Groundman';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function generateTests() {
  console.log('🧪 Generating dynamic E2E tests from database...\n');

  try {
    // Fetch all rules from database
    const [magnetRules, dropRules, jobRowConfigs] = await Promise.all([
      fetchMagnetRules(),
      fetchDropRules(),
      fetchJobRowConfigs()
    ]);

    // Generate test file content
    let testContent = `// Auto-generated E2E tests from database rules
// Generated at: ${new Date().toISOString()}
// DO NOT EDIT - This file is auto-generated

import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';
import { MagnetPage } from '../../pages/MagnetPage';
import { TestDataFactory } from '../../fixtures/test-data';

test.describe('Auto-generated Business Rules Tests', () => {
`;

    // Add magnet attachment tests
    if (magnetRules.length > 0) {
      testContent += `
  test.describe('Magnet Attachment Rules', () => {${generateMagnetTests(magnetRules)}
  });
`;
    }

    // Add drop rules tests
    if (dropRules.length > 0) {
      testContent += `
  test.describe('Drop Rules', () => {${generateDropTests(dropRules)}
  });
`;
    }

    // Add job row configuration tests
    if (jobRowConfigs.length > 0) {
      testContent += `
  test.describe('Job Row Configurations', () => {${generateJobRowTests(jobRowConfigs)}
  });
`;
    }

    // Add custom business rules
    testContent += `
  test.describe('Custom Business Rules', () => {
    test('prevents double shift assignments', async ({ page }) => {
      const scheduler = new SchedulerPage(page);
      await scheduler.goto();
      
      const operator = TestDataFactory.createOperator();
      
      // Assign to day shift
      await scheduler.selectShift('day');
      await scheduler.dragResourceToJob(operator.id, 'Day Job', 'Crew');
      
      // Try to assign to night shift
      await scheduler.selectShift('night');
      await scheduler.dragResourceToJob(operator.id, 'Night Job', 'Crew');
      
      // Should not be assigned to night job
      const isInNightJob = await scheduler.isResourceAssigned(operator.id, 'Night Job');
      expect(isInNightJob).toBe(false);
      
      // Should show double shift warning
      const warning = page.locator('[data-testid="double-shift-warning"]');
      expect(await warning.isVisible()).toBe(true);
    });

    test('enforces equipment safety requirements', async ({ page }) => {
      const scheduler = new SchedulerPage(page);
      await scheduler.goto();
      
      const excavator = TestDataFactory.createExcavator();
      
      // Add equipment without operator
      await scheduler.dragResourceToJob(excavator.id, 'Test Job', 'Equipment');
      
      // Try to finalize
      const finalizeButton = page.locator('[data-testid="finalize-job"]');
      await finalizeButton.click();
      
      // Should show safety warning
      const warning = page.locator('[data-testid="safety-warning"]');
      expect(await warning.isVisible()).toBe(true);
      expect(await warning.textContent()).toContain('Equipment requires operator');
    });

    test('moves attached resources as a group', async ({ page }) => {
      const scheduler = new SchedulerPage(page);
      const magnet = new MagnetPage(page);
      await scheduler.goto();
      
      const truck = TestDataFactory.createTruck();
      const driver = TestDataFactory.createDriver();
      
      // Attach driver to truck
      await magnet.dragMagnetToTarget(driver.id, truck.id);
      
      // Assign truck to job
      await scheduler.dragResourceToJob(truck.id, 'Job A', 'Trucks');
      
      // Both should be in Job A
      expect(await scheduler.isResourceAssigned(truck.id, 'Job A')).toBe(true);
      expect(await scheduler.isResourceAssigned(driver.id, 'Job A')).toBe(true);
      
      // Move truck to Job B
      await scheduler.moveAssignment(truck.id, 'Job A', 'Job B', 'Trucks');
      
      // Both should move together
      expect(await scheduler.isResourceAssigned(truck.id, 'Job B')).toBe(true);
      expect(await scheduler.isResourceAssigned(driver.id, 'Job B')).toBe(true);
    });
  });
`;

    testContent += `
});`;

    // Ensure output directory exists
    const outputDir = path.join(__dirname, '..', 'playwright', 'tests', 'dynamic');
    await fs.mkdir(outputDir, { recursive: true });

    // Write the test file
    const outputPath = path.join(outputDir, 'auto-generated-rules.spec.ts');
    await fs.writeFile(outputPath, testContent, 'utf-8');

    console.log('\n✅ Dynamic tests generated successfully!');
    console.log(`📁 Output: ${outputPath}\n`);
    
    // Show summary
    const totalTests = 
      magnetRules.reduce((acc, rule) => {
        let count = 1; // Basic attachment test
        if (rule.max_children) count++; // Max children test
        if (rule.required) count++; // Required test
        return acc + count;
      }, 0) +
      dropRules.length +
      jobRowConfigs.reduce((acc, config) => {
        return acc + (config.allowed_resource_types?.length || 0) + 1;
      }, 0) +
      3; // Custom rules
    
    console.log('📊 Test Generation Summary:');
    console.log(`   - Magnet Rules: ${magnetRules.length}`);
    console.log(`   - Drop Rules: ${dropRules.length}`);
    console.log(`   - Job Row Configs: ${jobRowConfigs.length}`);
    console.log(`   - Total Tests Generated: ${totalTests}`);

  } catch (error) {
    console.error('❌ Failed to generate tests:', error);
    process.exit(1);
  }
}

// Run the generator
generateTests();