/**
 * Database Context Collector
 * Analyzes database state, migrations, and Supabase configuration
 */

import ClaudeHelpers from '../utils/claude-helpers.js';
import fs from 'fs/promises';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

export class DatabaseCollector {
  constructor() {
    this.name = 'DatabaseCollector';
    this.version = '1.0.0';
  }

  /**
   * Collect comprehensive database context
   */
  async collect() {
    const startTime = Date.now();
    
    try {
      const [
        supabaseConfig,
        migrations,
        schema,
        environment,
        connections
      ] = await Promise.all([
        this.analyzeSupabaseConfig(),
        this.analyzeMigrations(),
        this.analyzeSchema(),
        this.analyzeEnvironment(),
        this.analyzeConnections()
      ]);

      const context = {
        metadata: {
          collector: this.name,
          version: this.version,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime
        },
        
        supabase: supabaseConfig,
        migrations,
        schema,
        environment,
        connections,
        
        analysis: {
          health: this.calculateDatabaseHealth(supabaseConfig, migrations, environment),
          migrationStatus: this.analyzeMigrationStatus(migrations),
          configurationIssues: this.identifyConfigIssues(supabaseConfig, environment),
          recommendations: this.generateRecommendations(supabaseConfig, migrations, environment)
        },
        
        insights: {
          setupComplete: this.assessSetupCompleteness(supabaseConfig, migrations),
          realtimeCapabilities: this.assessRealtimeCapabilities(supabaseConfig, schema),
          securityPosture: this.assessSecurityPosture(supabaseConfig, environment)
        }
      };

      return context;
      
    } catch (error) {
      return {
        error: error.message,
        collector: this.name,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Analyze Supabase configuration
   */
  async analyzeSupabaseConfig() {
    // Check for Supabase project files and configuration
    const config = {
      projectExists: false,
      configFiles: {},
      clientSetup: false,
      projectUrl: null,
      hasAnonKey: false,
      hasServiceKey: false
    };

    // Check config.toml
    const configPath = 'supabase/config.toml';
    if (await ClaudeHelpers.fileExists(configPath)) {
      config.configFiles.configToml = true;
      config.projectExists = true;
      
      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        config.projectId = this.extractProjectId(configContent);
      } catch (error) {
        // Continue without detailed config
      }
    }

    // Check for client setup in code
    const packageJson = await ClaudeHelpers.readJsonSafe('package.json');
    if (packageJson?.dependencies?.['@supabase/supabase-js']) {
      config.clientSetup = true;
    }

    // Check environment variables
    const envFiles = ['.env', '.env.local', '.env.production'];
    for (const envFile of envFiles) {
      if (await ClaudeHelpers.fileExists(envFile)) {
        try {
          const envContent = await fs.readFile(envFile, 'utf-8');
          if (envContent.includes('SUPABASE_URL') || envContent.includes('VITE_SUPABASE_URL')) {
            config.projectUrl = this.extractEnvValue(envContent, 'SUPABASE_URL') || 
                               this.extractEnvValue(envContent, 'VITE_SUPABASE_URL');
          }
          if (envContent.includes('SUPABASE_ANON_KEY') || envContent.includes('VITE_SUPABASE_ANON_KEY')) {
            config.hasAnonKey = true;
          }
          if (envContent.includes('SUPABASE_SERVICE_ROLE_KEY')) {
            config.hasServiceKey = true;
          }
        } catch (error) {
          continue;
        }
      }
    }

    // Check for Supabase client initialization
    const clientFiles = await this.findSupabaseClientFiles();
    config.clientFiles = clientFiles;
    config.isInitialized = clientFiles.length > 0;

    return config;
  }

  /**
   * Analyze database migrations
   */
  async analyzeMigrations() {
    const migrations = {
      directory: 'supabase/migrations',
      files: [],
      applied: [],
      pending: [],
      hasInitialSchema: false,
      lastMigration: null
    };

    const migrationDir = 'supabase/migrations';
    if (await ClaudeHelpers.fileExists(migrationDir)) {
      try {
        const files = await fs.readdir(migrationDir);
        const migrationFiles = files
          .filter(f => f.endsWith('.sql'))
          .sort()
          .map(file => ({
            name: file,
            timestamp: this.extractTimestamp(file),
            path: path.join(migrationDir, file),
            description: this.extractMigrationDescription(file)
          }));

        migrations.files = migrationFiles;
        migrations.hasInitialSchema = migrationFiles.some(f => 
          f.name.includes('initial') || f.name.includes('schema')
        );

        if (migrationFiles.length > 0) {
          migrations.lastMigration = migrationFiles[migrationFiles.length - 1];
        }

        // Check for migration status tracking
        const statusFile = 'MIGRATION_STATUS.md';
        if (await ClaudeHelpers.fileExists(statusFile)) {
          try {
            const statusContent = await fs.readFile(statusFile, 'utf-8');
            migrations.statusTracking = this.parseMigrationStatus(statusContent);
          } catch (error) {
            // Continue without status
          }
        }

      } catch (error) {
        migrations.error = 'Could not read migration directory';
      }
    }

    return migrations;
  }

  /**
   * Analyze database schema
   */
  async analyzeSchema() {
    const schema = {
      tables: [],
      views: [],
      functions: [],
      policies: [],
      triggers: [],
      hasRLS: false,
      hasRealtime: false
    };

    // Look for schema definitions in migrations or separate files
    const schemaFiles = await this.findSchemaFiles();
    
    for (const file of schemaFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        // Extract table definitions
        const tableMatches = content.match(/CREATE TABLE\s+(\w+)/gi) || [];
        schema.tables.push(...tableMatches.map(match => 
          match.replace(/CREATE TABLE\s+/i, '').trim()
        ));

        // Extract view definitions
        const viewMatches = content.match(/CREATE VIEW\s+(\w+)/gi) || [];
        schema.views.push(...viewMatches.map(match => 
          match.replace(/CREATE VIEW\s+/i, '').trim()
        ));

        // Extract function definitions
        const functionMatches = content.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)/gi) || [];
        schema.functions.push(...functionMatches.map(match => 
          match.replace(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+/i, '').trim()
        ));

        // Check for RLS
        if (content.includes('ROW LEVEL SECURITY') || content.includes('ENABLE RLS')) {
          schema.hasRLS = true;
        }

        // Check for realtime
        if (content.includes('supabase_realtime') || content.includes('REPLICA IDENTITY')) {
          schema.hasRealtime = true;
        }

        // Extract policies
        const policyMatches = content.match(/CREATE POLICY\s+"([^"]+)"/gi) || [];
        schema.policies.push(...policyMatches.map(match => 
          match.match(/"([^"]+)"/)[1]
        ));

        // Extract triggers
        const triggerMatches = content.match(/CREATE TRIGGER\s+(\w+)/gi) || [];
        schema.triggers.push(...triggerMatches.map(match => 
          match.replace(/CREATE TRIGGER\s+/i, '').trim()
        ));

      } catch (error) {
        continue;
      }
    }

    // Remove duplicates
    schema.tables = [...new Set(schema.tables)];
    schema.views = [...new Set(schema.views)];
    schema.functions = [...new Set(schema.functions)];
    schema.policies = [...new Set(schema.policies)];
    schema.triggers = [...new Set(schema.triggers)];

    // Analyze table relationships and business objects
    schema.businessObjects = this.identifyBusinessObjects(schema.tables);
    schema.relationships = this.analyzeTableRelationships(schemaFiles);

    return schema;
  }

  /**
   * Analyze environment setup
   */
  async analyzeEnvironment() {
    const env = {
      variables: {},
      files: [],
      isConfigured: false,
      hasLocalDev: false,
      hasProduction: false
    };

    const envFiles = ['.env', '.env.local', '.env.development', '.env.production', '.env.example'];
    
    for (const envFile of envFiles) {
      if (await ClaudeHelpers.fileExists(envFile)) {
        env.files.push(envFile);
        
        try {
          const content = await fs.readFile(envFile, 'utf-8');
          const variables = this.parseEnvVariables(content);
          
          env.variables[envFile] = variables;
          
          // Check configuration completeness
          const hasSupabaseUrl = variables.some(v => v.name.includes('SUPABASE_URL'));
          const hasSupabaseKey = variables.some(v => v.name.includes('SUPABASE') && v.name.includes('KEY'));
          
          if (hasSupabaseUrl && hasSupabaseKey) {
            env.isConfigured = true;
            
            if (envFile.includes('local') || envFile.includes('development')) {
              env.hasLocalDev = true;
            }
            if (envFile.includes('production')) {
              env.hasProduction = true;
            }
          }
          
        } catch (error) {
          continue;
        }
      }
    }

    return env;
  }

  /**
   * Analyze database connections and health
   */
  async analyzeConnections() {
    const connections = {
      canConnect: false,
      lastChecked: new Date().toISOString(),
      error: null,
      latency: null,
      pooling: false
    };

    // Try to check connection (simplified - would need actual DB connection)
    // For now, just check if connection logic exists in code
    const hasConnectionLogic = await this.checkForConnectionLogic();
    connections.hasConnectionCode = hasConnectionLogic;

    // Check for connection pooling
    const packageJson = await ClaudeHelpers.readJsonSafe('package.json');
    if (packageJson?.dependencies?.['@supabase/supabase-js']) {
      connections.usingSupabaseClient = true;
    }

    return connections;
  }

  // Helper methods

  async findSupabaseClientFiles() {
    const result = await ClaudeHelpers.execSafe('grep -r "createClient\\|supabase" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . | grep -v node_modules | head -10');
    
    if (!result.stdout) return [];
    
    return result.stdout.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [file] = line.split(':');
        return file;
      })
      .filter(file => file && !file.includes('node_modules'));
  }

  async findSchemaFiles() {
    const files = [];
    
    // Migration files
    const migrationDir = 'supabase/migrations';
    if (await ClaudeHelpers.fileExists(migrationDir)) {
      try {
        const migrationFiles = await fs.readdir(migrationDir);
        files.push(...migrationFiles
          .filter(f => f.endsWith('.sql'))
          .map(f => path.join(migrationDir, f))
        );
      } catch (error) {
        // Continue
      }
    }

    // Schema files
    const schemaPaths = ['schema.sql', 'database.sql', 'supabase/schema.sql'];
    for (const schemaPath of schemaPaths) {
      if (await ClaudeHelpers.fileExists(schemaPath)) {
        files.push(schemaPath);
      }
    }

    return files;
  }

  extractProjectId(configContent) {
    const match = configContent.match(/project_id\s*=\s*"([^"]+)"/);
    return match ? match[1] : null;
  }

  extractEnvValue(envContent, varName) {
    const regex = new RegExp(`${varName}\\s*=\\s*["']?([^"'\\n]+)["']?`, 'i');
    const match = envContent.match(regex);
    return match ? match[1] : null;
  }

  extractTimestamp(filename) {
    const match = filename.match(/^(\d{14})/);
    if (match) {
      const timestamp = match[1];
      return new Date(
        timestamp.substr(0, 4) + '-' +
        timestamp.substr(4, 2) + '-' +
        timestamp.substr(6, 2) + 'T' +
        timestamp.substr(8, 2) + ':' +
        timestamp.substr(10, 2) + ':' +
        timestamp.substr(12, 2) + 'Z'
      ).toISOString();
    }
    return null;
  }

  extractMigrationDescription(filename) {
    // Extract description from filename like "20231201120000_create_users_table.sql"
    const parts = filename.split('_');
    if (parts.length > 1) {
      return parts.slice(1).join(' ').replace('.sql', '').replace(/_/g, ' ');
    }
    return filename.replace('.sql', '');
  }

  parseMigrationStatus(content) {
    const status = {
      applied: [],
      pending: [],
      errors: []
    };

    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('✅') || line.includes('APPLIED')) {
        status.applied.push(line.trim());
      } else if (line.includes('⏳') || line.includes('PENDING')) {
        status.pending.push(line.trim());
      } else if (line.includes('❌') || line.includes('ERROR')) {
        status.errors.push(line.trim());
      }
    }

    return status;
  }

  parseEnvVariables(content) {
    const variables = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [name, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        
        variables.push({
          name: name.trim(),
          hasValue: value.trim().length > 0,
          isSecret: name.includes('KEY') || name.includes('SECRET') || name.includes('PASSWORD')
        });
      }
    }
    
    return variables;
  }

  identifyBusinessObjects(tables) {
    const businessObjects = [];
    
    // Common business object patterns
    const patterns = {
      'Users/Auth': ['users', 'profiles', 'accounts', 'auth'],
      'Content': ['posts', 'articles', 'content', 'media'],
      'Commerce': ['products', 'orders', 'payments', 'customers'],
      'Scheduling': ['jobs', 'assignments', 'resources', 'schedules'],
      'Communication': ['messages', 'notifications', 'comments'],
      'System': ['logs', 'audit', 'settings', 'configs']
    };

    for (const [category, keywords] of Object.entries(patterns)) {
      const matchingTables = tables.filter(table => 
        keywords.some(keyword => table.toLowerCase().includes(keyword))
      );
      
      if (matchingTables.length > 0) {
        businessObjects.push({
          category,
          tables: matchingTables,
          count: matchingTables.length
        });
      }
    }

    return businessObjects;
  }

  analyzeTableRelationships(schemaFiles) {
    const relationships = [];
    
    // This is a simplified analysis - would need proper SQL parsing for completeness
    for (const file of schemaFiles.slice(0, 5)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Look for foreign key constraints
        const fkMatches = content.match(/FOREIGN KEY\s*\([^)]+\)\s*REFERENCES\s+(\w+)/gi) || [];
        relationships.push(...fkMatches.map(match => {
          const referencedTable = match.match(/REFERENCES\s+(\w+)/i)[1];
          return {
            type: 'foreign_key',
            references: referencedTable,
            file: path.basename(file)
          };
        }));
        
      } catch (error) {
        continue;
      }
    }

    return relationships;
  }

  async checkForConnectionLogic() {
    const result = await ClaudeHelpers.execSafe('grep -r "createClient\\|supabase\\|database" --include="*.ts" --include="*.js" . | grep -v node_modules | head -5');
    return result.stdout && result.stdout.length > 0;
  }

  // Analysis methods

  calculateDatabaseHealth(supabaseConfig, migrations, environment) {
    let score = 100;
    
    // Configuration health
    if (!supabaseConfig.isInitialized) score -= 30;
    if (!supabaseConfig.hasAnonKey) score -= 20;
    if (!supabaseConfig.projectUrl) score -= 25;
    
    // Migration health
    if (migrations.files.length === 0) score -= 20;
    if (migrations.files.length > 0 && !migrations.statusTracking) score -= 10;
    
    // Environment health
    if (!environment.isConfigured) score -= 25;
    if (environment.files.length === 0) score -= 15;
    
    score = Math.max(0, score);
    
    let status;
    if (score >= 80) status = 'HEALTHY';
    else if (score >= 60) status = 'NEEDS_ATTENTION';
    else if (score >= 40) status = 'UNHEALTHY';
    else status = 'CRITICAL';

    return {
      score,
      status,
      factors: {
        configuration: supabaseConfig.isInitialized,
        migrations: migrations.files.length > 0,
        environment: environment.isConfigured
      }
    };
  }

  analyzeMigrationStatus(migrations) {
    return {
      total: migrations.files.length,
      hasInitialSchema: migrations.hasInitialSchema,
      lastMigration: migrations.lastMigration?.timestamp || null,
      needsApplying: migrations.pending?.length || 0,
      hasErrors: migrations.statusTracking?.errors?.length || 0,
      isUpToDate: migrations.pending?.length === 0 && migrations.statusTracking?.errors?.length === 0
    };
  }

  identifyConfigIssues(supabaseConfig, environment) {
    const issues = [];
    
    if (!supabaseConfig.projectUrl) {
      issues.push({
        type: 'MISSING_PROJECT_URL',
        severity: 'critical',
        message: 'Supabase project URL not configured',
        fix: 'Add SUPABASE_URL to environment variables'
      });
    }
    
    if (!supabaseConfig.hasAnonKey) {
      issues.push({
        type: 'MISSING_ANON_KEY',
        severity: 'critical',
        message: 'Supabase anonymous key not configured',
        fix: 'Add SUPABASE_ANON_KEY to environment variables'
      });
    }
    
    if (!supabaseConfig.isInitialized) {
      issues.push({
        type: 'CLIENT_NOT_INITIALIZED',
        severity: 'high',
        message: 'Supabase client not properly initialized',
        fix: 'Create Supabase client instance in your code'
      });
    }
    
    if (environment.files.length === 0) {
      issues.push({
        type: 'NO_ENV_CONFIG',
        severity: 'high',
        message: 'No environment configuration files found',
        fix: 'Create .env file with Supabase configuration'
      });
    }
    
    if (!environment.hasLocalDev && environment.hasProduction) {
      issues.push({
        type: 'MISSING_LOCAL_CONFIG',
        severity: 'medium',
        message: 'Production config exists but no local development config',
        fix: 'Create .env.local for local development'
      });
    }
    
    return issues;
  }

  generateRecommendations(supabaseConfig, migrations, environment) {
    const recommendations = [];
    
    if (migrations.files.length === 0) {
      recommendations.push({
        type: 'INITIAL_MIGRATION',
        priority: 'high',
        message: 'Create initial database migration',
        action: 'Run `supabase migration new initial_schema`',
        benefit: 'Establishes database schema versioning'
      });
    }
    
    if (!migrations.statusTracking && migrations.files.length > 0) {
      recommendations.push({
        type: 'MIGRATION_TRACKING',
        priority: 'medium',
        message: 'Set up migration status tracking',
        action: 'Create MIGRATION_STATUS.md to track applied migrations',
        benefit: 'Better visibility into database state'
      });
    }
    
    if (!supabaseConfig.hasServiceKey) {
      recommendations.push({
        type: 'SERVICE_ROLE_KEY',
        priority: 'medium',
        message: 'Configure service role key for admin operations',
        action: 'Add SUPABASE_SERVICE_ROLE_KEY to environment',
        benefit: 'Enables server-side operations bypassing RLS'
      });
    }
    
    if (!environment.hasProduction && environment.hasLocalDev) {
      recommendations.push({
        type: 'PRODUCTION_CONFIG',
        priority: 'low',
        message: 'Set up production environment configuration',
        action: 'Create .env.production with production database settings',
        benefit: 'Prepares for production deployment'
      });
    }

    // Check for specific BoardOS recommendations
    if (supabaseConfig.isInitialized && migrations.files.length > 0) {
      recommendations.push({
        type: 'REALTIME_SETUP',
        priority: 'medium',
        message: 'Enable realtime subscriptions for live updates',
        action: 'Configure realtime policies and enable on tables',
        benefit: 'Enables real-time UI updates for drag-and-drop scheduling'
      });
    }
    
    return recommendations;
  }

  assessSetupCompleteness(supabaseConfig, migrations) {
    const completeness = {
      score: 0,
      steps: {
        projectCreated: supabaseConfig.projectExists,
        clientConfigured: supabaseConfig.isInitialized,
        environmentSetup: supabaseConfig.hasAnonKey && supabaseConfig.projectUrl,
        migrationsCreated: migrations.files.length > 0,
        schemaApplied: migrations.hasInitialSchema
      }
    };
    
    const totalSteps = Object.keys(completeness.steps).length;
    const completedSteps = Object.values(completeness.steps).filter(Boolean).length;
    completeness.score = Math.round((completedSteps / totalSteps) * 100);
    
    return completeness;
  }

  assessRealtimeCapabilities(supabaseConfig, schema) {
    return {
      clientSupportsRealtime: supabaseConfig.isInitialized,
      tablesWithRealtime: schema.hasRealtime,
      realtimeEnabled: schema.hasRealtime && supabaseConfig.isInitialized,
      subscriptionCapable: schema.tables.length > 0 && supabaseConfig.isInitialized
    };
  }

  assessSecurityPosture(supabaseConfig, environment) {
    const security = {
      score: 100,
      issues: [],
      features: {
        rowLevelSecurity: false, // Would need to check actual schema
        environmentVariables: environment.isConfigured,
        keyRotation: false, // Would need to check key age
        serviceRoleProtected: supabaseConfig.hasServiceKey
      }
    };
    
    // Check for common security issues
    if (!environment.isConfigured) {
      security.score -= 30;
      security.issues.push('Environment variables not properly configured');
    }
    
    if (!supabaseConfig.hasServiceKey) {
      security.score -= 10;
      security.issues.push('Service role key not configured (limits admin capabilities)');
    }
    
    // Check for exposed secrets in code
    const hasHardcodedSecrets = supabaseConfig.clientFiles.some(file => {
      // This would need actual file content analysis
      return false; // Simplified for now
    });
    
    if (hasHardcodedSecrets) {
      security.score -= 50;
      security.issues.push('Potential hardcoded secrets in client files');
    }
    
    return security;
  }
}

export default DatabaseCollector;