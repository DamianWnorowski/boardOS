---
title: Environment Variables Configuration
category: deployment
tags: [environment, configuration, security, deployment]
related: [/06-deployment/supabase-setup.md, /06-deployment/production.md]
last-updated: 2025-08-29
---

# Environment Variables Configuration

## Quick Answer
BoardOS requires 2 essential environment variables (Supabase URL and Anon Key) with additional optional variables for production features like monitoring, analytics, and error tracking. Use `.env` files locally and secure secret management in production.

## Required Variables

### Core Configuration

```bash
# .env (REQUIRED)
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.[...]

# These are REQUIRED for the application to function
# Get these from your Supabase project dashboard
```

### Variable Descriptions

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_SUPABASE_URL` | ✅ Yes | Your Supabase project URL | `https://eqbgcfdoyndocuomntdx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Public anonymous key for client | `eyJhbGciOiJIUzI1NiIs...` |

## Optional Variables

### Production Features

```bash
# .env.production (OPTIONAL)

# Application Configuration
VITE_APP_URL=https://boardos.yourdomain.com
VITE_APP_NAME=BoardOS
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production

# Error Tracking
VITE_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1

# Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxx
VITE_POSTHOG_HOST=https://app.posthog.com

# Feature Flags
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PWA=true
VITE_ENABLE_OFFLINE=true

# API Configuration
VITE_API_TIMEOUT=30000
VITE_API_RETRY_COUNT=3
VITE_MAX_FILE_SIZE=10485760

# Map Services (if using location features)
VITE_MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxxx
VITE_GOOGLE_MAPS_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Environment-Specific Configurations

### Development Environment

```bash
# .env.development
VITE_SUPABASE_URL=https://[dev-project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...development-key...
VITE_APP_URL=http://localhost:5173
VITE_ENVIRONMENT=development
VITE_ENABLE_DEBUG=true
VITE_ENABLE_ANALYTICS=false
VITE_LOG_LEVEL=debug
VITE_HOT_RELOAD=true
```

### Staging Environment

```bash
# .env.staging
VITE_SUPABASE_URL=https://[staging-project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...staging-key...
VITE_APP_URL=https://staging.boardos.yourdomain.com
VITE_ENVIRONMENT=staging
VITE_ENABLE_DEBUG=true
VITE_ENABLE_ANALYTICS=true
VITE_LOG_LEVEL=info
```

### Testing Environment

```bash
# .env.test
VITE_SUPABASE_URL=https://[test-project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...test-key...
VITE_APP_URL=http://localhost:5173
VITE_ENVIRONMENT=test
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=false
VITE_USE_MOCK_DATA=true
```

## Server-Side Variables

### Backend Services (Never expose to client!)

```bash
# .env.server (NEVER commit or expose these)

# Supabase Service Role (Server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJ...service-role-key...

# Database Direct Connection
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# JWT Secrets
SUPABASE_JWT_SECRET=your-super-secret-jwt-secret

# Email Service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@boardos.com

# Cloud Storage
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1
AWS_BUCKET=boardos-backups

# Monitoring
DATADOG_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxx
NEW_RELIC_LICENSE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxx
```

## Security Best Practices

### 1. Never Commit Sensitive Variables

```bash
# .gitignore
.env
.env.local
.env.production
.env.*.local
.env.server

# Only commit example files
.env.example
```

### 2. Use Secret Management Services

#### Vercel
```bash
# Set via CLI
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production

# Or via vercel.json
{
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

#### GitHub Actions
```yaml
# .github/workflows/deploy.yml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

#### Docker
```dockerfile
# Use build args for build-time variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Or use runtime environment
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
```

### 3. Validate Required Variables

```typescript
// src/config/environment.ts
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
] as const;

function validateEnvironment() {
  const missing = requiredEnvVars.filter(
    key => !import.meta.env[key]
  );
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file'
    );
  }
  
  // Validate URL format
  try {
    new URL(import.meta.env.VITE_SUPABASE_URL);
  } catch {
    throw new Error('VITE_SUPABASE_URL must be a valid URL');
  }
  
  // Validate key format
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY.startsWith('eyJ')) {
    throw new Error('VITE_SUPABASE_ANON_KEY appears to be invalid');
  }
}

// Run validation on app start
validateEnvironment();
```

## Loading Environment Variables

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    define: {
      'process.env': env
    },
    // Validate required vars at build time
    plugins: [
      {
        name: 'validate-env',
        config() {
          if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
            throw new Error('Missing required environment variables');
          }
        }
      }
    ]
  };
});
```

### Runtime Access

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Access environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Type Safety

```typescript
// src/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL?: string
  readonly VITE_ENVIRONMENT?: 'development' | 'staging' | 'production'
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_ENABLE_DEBUG?: string
  readonly VITE_ENABLE_ANALYTICS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## Environment Templates

### .env.example
Create this file to help other developers:

```bash
# Copy this file to .env and fill in your values
# Required - Get these from Supabase dashboard
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional - Production features
VITE_APP_URL=http://localhost:5173
VITE_ENVIRONMENT=development
VITE_SENTRY_DSN=
VITE_ENABLE_DEBUG=true
VITE_ENABLE_ANALYTICS=false
```

### Setup Script

```bash
#!/bin/bash
# setup-env.sh

echo "Setting up BoardOS environment..."

# Check if .env exists
if [ -f .env ]; then
  echo "⚠️  .env file already exists. Skipping..."
else
  # Copy template
  cp .env.example .env
  echo "✅ Created .env file from template"
  
  # Prompt for required values
  read -p "Enter your Supabase URL: " SUPABASE_URL
  read -p "Enter your Supabase Anon Key: " SUPABASE_KEY
  
  # Update .env file
  sed -i "s|https://your-project.supabase.co|$SUPABASE_URL|g" .env
  sed -i "s|your-anon-key-here|$SUPABASE_KEY|g" .env
  
  echo "✅ Environment configured successfully"
fi

# Validate environment
node -e "
  require('dotenv').config();
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('❌ Missing:', missing.join(', '));
    process.exit(1);
  }
  console.log('✅ Environment validated successfully');
"
```

## CI/CD Configuration

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup environment
        run: |
          echo "VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}" >> .env
          echo "VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }}" >> .env
          echo "VITE_ENVIRONMENT=production" >> .env
      
      - name: Build
        run: |
          npm ci
          npm run build
      
      - name: Deploy
        run: |
          # Your deployment command
```

### Vercel
```json
// vercel.json
{
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  },
  "build": {
    "env": {
      "VITE_ENVIRONMENT": "production"
    }
  }
}
```

## Troubleshooting

### Common Issues

#### Variables Not Loading
```typescript
// Debug environment variables
console.log('Environment:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD
});
```

#### Build Failures
```bash
# Verify variables are set
echo "URL: $VITE_SUPABASE_URL"
echo "Key exists: $([ -z "$VITE_SUPABASE_ANON_KEY" ] && echo 'NO' || echo 'YES')"

# Build with explicit env
VITE_SUPABASE_URL=xxx VITE_SUPABASE_ANON_KEY=yyy npm run build
```

#### Runtime Errors
```typescript
// Fallback values for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
  (import.meta.env.DEV ? 'http://localhost:54321' : '');

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
  (import.meta.env.DEV ? 'eyJ...local-key...' : '');
```

## Best Practices Summary

1. **Use `.env.example`** - Document all variables
2. **Never commit secrets** - Use `.gitignore`
3. **Validate early** - Check variables on startup
4. **Use type safety** - Define TypeScript interfaces
5. **Separate environments** - Different configs per environment
6. **Secure production** - Use secret management services
7. **Prefix with VITE_** - For client-side variables in Vite
8. **Document variables** - Include descriptions and examples
9. **Provide defaults** - Where appropriate
10. **Monitor usage** - Log missing variables in production

Environment variables are critical for BoardOS configuration and security. Proper management ensures smooth deployments and secure operations.