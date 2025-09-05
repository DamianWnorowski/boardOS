/**
 * Environment Variable Validation for BoardOS
 * Validates required environment variables at runtime and build time
 */

// Required environment variables with their validation rules
const ENV_SCHEMA = {
  // Supabase configuration (required)
  VITE_SUPABASE_URL: {
    required: true,
    validate: (value: string) => {
      const urlPattern = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;
      return urlPattern.test(value);
    },
    errorMessage: 'VITE_SUPABASE_URL must be a valid Supabase URL (https://your-project.supabase.co)',
  },
  
  VITE_SUPABASE_ANON_KEY: {
    required: true,
    validate: (value: string) => {
      // Basic JWT structure validation
      const jwtPattern = /^[A-Za-z0-9_-]{2,}(?:\.[A-Za-z0-9_-]{2,}){2}$/;
      return jwtPattern.test(value) && value.length > 100;
    },
    errorMessage: 'VITE_SUPABASE_ANON_KEY must be a valid Supabase anonymous key',
  },
  
  // Optional configuration
  VITE_GOOGLE_MAPS_API_KEY: {
    required: false,
    validate: (value: string) => {
      // Google Maps API key pattern
      return /^AIza[0-9A-Za-z_-]{35}$/.test(value);
    },
    errorMessage: 'VITE_GOOGLE_MAPS_API_KEY must be a valid Google Maps API key',
  },
  
  VITE_SENTRY_DSN: {
    required: false,
    validate: (value: string) => {
      // Sentry DSN pattern
      return /^https:\/\/[a-f0-9]{32}@[a-z0-9.-]+\.ingest\.sentry\.io\/[0-9]+$/.test(value);
    },
    errorMessage: 'VITE_SENTRY_DSN must be a valid Sentry DSN',
  },
  
  VITE_APP_URL: {
    required: false,
    validate: (value: string) => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
      } catch {
        return false;
      }
    },
    errorMessage: 'VITE_APP_URL must be a valid URL',
  },
  
  VITE_ENVIRONMENT: {
    required: false,
    validate: (value: string) => {
      return ['development', 'staging', 'production'].includes(value);
    },
    errorMessage: 'VITE_ENVIRONMENT must be one of: development, staging, production',
  },
} as const;

// Environment validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: Record<string, string | undefined>;
}

// Validation error class
export class EnvironmentValidationError extends Error {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message);
    this.name = 'EnvironmentValidationError';
  }
}

/**
 * Validates all environment variables according to schema
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config: Record<string, string | undefined> = {};
  
  // Check each environment variable
  Object.entries(ENV_SCHEMA).forEach(([key, schema]) => {
    const value = import.meta.env[key];
    config[key] = value;
    
    // Check if required variable is missing
    if (schema.required && (!value || value.trim() === '')) {
      errors.push(`Missing required environment variable: ${key}`);
      return;
    }
    
    // Validate value format if present
    if (value && value.trim() !== '') {
      if (!schema.validate(value)) {
        const error = schema.errorMessage || `Invalid format for ${key}`;
        errors.push(error);
      }
    } else if (!schema.required) {
      warnings.push(`Optional environment variable ${key} is not set`);
    }
  });
  
  // Additional security checks
  if (import.meta.env.PROD) {
    // Production-specific validations
    if (config.VITE_SUPABASE_URL?.includes('localhost')) {
      errors.push('Production build cannot use localhost Supabase URL');
    }
    
    if (!config.VITE_SENTRY_DSN) {
      warnings.push('VITE_SENTRY_DSN not set - error tracking disabled in production');
    }
    
    if (config.VITE_ENVIRONMENT !== 'production') {
      warnings.push('VITE_ENVIRONMENT should be set to "production" for production builds');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Validates environment and throws on errors (for app initialization)
 */
export function validateEnvironmentOrThrow(): void {
  const result = validateEnvironment();
  
  if (!result.isValid) {
    console.group('🔴 Environment Validation Failed');
    result.errors.forEach(error => console.error(`❌ ${error}`));
    console.groupEnd();
    
    throw new EnvironmentValidationError(
      `Environment validation failed with ${result.errors.length} error(s)`,
      result.errors
    );
  }
  
  // Log warnings in development
  if (import.meta.env.DEV && result.warnings.length > 0) {
    console.group('⚠️ Environment Warnings');
    result.warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
    console.groupEnd();
  }
  
  // Log success in development
  if (import.meta.env.DEV) {
    console.log('✅ Environment validation passed');
  }
}

/**
 * Gets a validated environment variable with type safety
 */
export function getEnvVar<T extends keyof typeof ENV_SCHEMA>(
  key: T,
  fallback?: string
): string {
  const value = import.meta.env[key];
  const schema = ENV_SCHEMA[key];
  
  if (!value || value.trim() === '') {
    if (schema.required) {
      throw new EnvironmentValidationError(
        `Missing required environment variable: ${key}`,
        [`Missing required environment variable: ${key}`]
      );
    }
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    return '';
  }
  
  if (!schema.validate(value)) {
    throw new EnvironmentValidationError(
      `Invalid environment variable: ${key}`,
      [schema.errorMessage || `Invalid format for ${key}`]
    );
  }
  
  return value;
}

/**
 * Runtime configuration object with validated environment variables
 */
export const config = {
  // Supabase
  supabaseUrl: () => getEnvVar('VITE_SUPABASE_URL'),
  supabaseAnonKey: () => getEnvVar('VITE_SUPABASE_ANON_KEY'),
  
  // Optional services
  googleMapsApiKey: () => getEnvVar('VITE_GOOGLE_MAPS_API_KEY', ''),
  sentryDsn: () => getEnvVar('VITE_SENTRY_DSN', ''),
  appUrl: () => getEnvVar('VITE_APP_URL', 'http://localhost:5173'),
  
  // Environment info
  environment: () => getEnvVar('VITE_ENVIRONMENT', 'development'),
  isDevelopment: () => import.meta.env.DEV,
  isProduction: () => import.meta.env.PROD,
  
  // Build info (injected by Vite)
  buildTime: () => (globalThis as any).__BUILD_TIME__ || new Date().toISOString(),
  version: () => (globalThis as any).__VERSION__ || '0.1.0',
};

// Export validation result for use in main app
let cachedValidation: ValidationResult | null = null;

export function getCachedValidation(): ValidationResult {
  if (!cachedValidation) {
    cachedValidation = validateEnvironment();
  }
  return cachedValidation;
}