---
title: Development Setup Guide
category: development
tags: [setup, development, environment, configuration]
related: [/05-development/workflow.md, /06-deployment/deployment-guide.md]
last-updated: 2025-08-29
---

# Development Setup Guide

## Quick Answer
Set up BoardOS development environment in 5 minutes with Node.js 18+, npm, and Supabase credentials. Clone, install, configure environment variables, and run `npm run dev`.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 18.0+ | JavaScript runtime |
| **npm** | 9.0+ | Package manager |
| **Git** | 2.30+ | Version control |
| **VS Code** | Latest | Recommended IDE |
| **Chrome** | Latest | Development browser |

### Optional Tools

- **PostgreSQL** (14+) - For local database development
- **Docker** - For containerized development
- **Postman** - For API testing
- **React DevTools** - Browser extension

## Initial Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/boardOS.git
cd boardOS

# Or using SSH
git clone git@github.com:your-org/boardOS.git
cd boardOS
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Or with specific registry
npm install --registry https://registry.npmjs.org/

# Install with exact versions (recommended)
npm ci
```

### 3. Environment Configuration

Create `.env.local` file in the project root:

```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your credentials
nano .env.local
```

Required environment variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Development Settings
VITE_ENABLE_DEBUG=true
VITE_LOG_LEVEL=debug
VITE_API_TIMEOUT=30000

# Optional: Feature Flags
VITE_ENABLE_MONTH_VIEW=true
VITE_ENABLE_EXPORT=true
VITE_ENABLE_REAL_TIME=true
```

### 4. Database Setup

#### Option A: Use Hosted Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Copy credentials to `.env.local`
4. Run migrations:

```bash
# Apply database migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

#### Option B: Local Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize local Supabase
supabase init

# Start local Supabase
supabase start

# Get local credentials
supabase status
```

### 5. Verify Setup

```bash
# Run setup verification
npm run verify-setup

# Expected output:
# ✅ Node.js version: 18.17.0
# ✅ npm version: 9.6.7
# ✅ Dependencies installed
# ✅ Environment variables configured
# ✅ Database connection successful
# ✅ Setup complete!
```

## Development Workflow

### Starting Development Server

```bash
# Start development server
npm run dev

# With specific port
PORT=3000 npm run dev

# With host binding (for network access)
npm run dev -- --host

# Output:
# VITE v4.4.9  ready in 487 ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: http://192.168.1.100:5173/
```

### Available Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext ts,tsx",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write src/**/*.{ts,tsx,css}",
    "typecheck": "tsc --noEmit",
    "docs:generate": "node scripts/generate-docs.cjs",
    "db:migrate": "supabase migration up",
    "db:reset": "supabase db reset",
    "analyze": "vite-bundle-visualizer"
  }
}
```

## IDE Configuration

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.turbo": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  }
}
```

### Recommended Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "mikestead.dotenv",
    "github.copilot",
    "eamodio.gitlens",
    "usernamehw.errorlens"
  ]
}
```

## Project Structure

```
boardOS/
├── src/
│   ├── components/       # React components
│   │   ├── board/       # Board components
│   │   ├── magnets/     # Magnet system
│   │   ├── modals/      # Modal dialogs
│   │   └── ui/          # Reusable UI
│   ├── context/         # React contexts
│   ├── hooks/           # Custom hooks
│   ├── services/        # Service layer
│   ├── types/           # TypeScript types
│   ├── utils/           # Utilities
│   ├── lib/            # External libraries
│   └── App.tsx         # Root component
├── public/             # Static assets
├── docs/               # Documentation
├── scripts/            # Build scripts
├── tests/              # Test files
└── supabase/           # Database files
    ├── migrations/     # SQL migrations
    ├── functions/      # Edge functions
    └── seed.sql       # Seed data
```

## Debugging Setup

### Browser DevTools

```javascript
// Enable debug mode in console
localStorage.setItem('DEBUG', 'true');
localStorage.setItem('LOG_LEVEL', 'debug');

// Enable React DevTools profiler
localStorage.setItem('REACT_PROFILER', 'true');

// View real-time WebSocket events
window.__SUPABASE_DEBUG__ = true;
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome Debug",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true,
      "runtimeArgs": ["--auto-open-devtools-for-tabs"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:debug"],
      "console": "integratedTerminal"
    }
  ]
}
```

## Common Issues and Solutions

### Issue: Dependencies Installation Fails

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock
rm -rf node_modules package-lock.json

# Reinstall with legacy peer deps
npm install --legacy-peer-deps
```

### Issue: Supabase Connection Errors

```bash
# Check Supabase status
curl -X GET "https://your-project.supabase.co/rest/v1/" \
  -H "apikey: your-anon-key"

# Test database connection
npm run db:test-connection

# Enable debug logging
export DEBUG=supabase:*
```

### Issue: TypeScript Errors

```bash
# Regenerate TypeScript definitions
npm run types:generate

# Clear TypeScript cache
rm -rf node_modules/.cache/typescript

# Restart TS server in VS Code
Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

### Issue: Vite HMR Not Working

```bash
# Use polling for file watching
npm run dev -- --force

# Or configure in vite.config.ts
export default {
  server: {
    watch: {
      usePolling: true
    }
  }
}
```

## Git Workflow

### Branch Naming Convention

```bash
# Feature branches
feature/add-calendar-export
feature/implement-drag-drop

# Bug fixes
fix/assignment-duplication
fix/mobile-touch-events

# Improvements
improve/database-performance
improve/build-optimization

# Documentation
docs/api-documentation
docs/setup-guide
```

### Commit Message Format

```bash
# Format: <type>(<scope>): <subject>

# Examples:
git commit -m "feat(calendar): add month view navigation"
git commit -m "fix(drag-drop): resolve assignment conflicts"
git commit -m "docs(api): update DatabaseService documentation"
git commit -m "perf(queries): optimize job fetching"

# Types:
# feat:     New feature
# fix:      Bug fix
# docs:     Documentation
# style:    Code style changes
# refactor: Code refactoring
# perf:     Performance improvements
# test:     Test updates
# chore:    Build/config changes
```

### Pre-commit Hooks

Install husky for automatic checks:

```bash
# Install husky
npm install --save-dev husky

# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run pre-commit"
```

Create `pre-commit` script:

```json
{
  "scripts": {
    "pre-commit": "npm run lint && npm run typecheck && npm run test:unit"
  }
}
```

## Performance Profiling

### React Profiler Setup

```typescript
// Wrap components with Profiler
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

<Profiler id="Board" onRender={onRenderCallback}>
  <Board />
</Profiler>
```

### Bundle Analysis

```bash
# Generate bundle analysis
npm run build -- --analyze

# Or use bundle visualizer
npm run analyze

# Review the report at:
# http://localhost:8888
```

## Testing Environment

### Unit Test Setup

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/components/Board.test.tsx
```

### E2E Test Setup

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Initialize Playwright
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e -- --ui
```

## Docker Development

### Docker Compose Setup

Create `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev -- --host

  postgres:
    image: postgres:14
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=boardos
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Running with Docker

```bash
# Start services
docker-compose -f docker-compose.dev.yml up

# Run in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## Next Steps

1. **Review Architecture**: Read [Architecture Overview](/docs/01-architecture/overview.md)
2. **Understand Features**: Explore [Feature Documentation](/docs/04-features/)
3. **Learn API**: Study [API Reference](/docs/02-api/)
4. **Run Tests**: Execute test suite with `npm test`
5. **Start Developing**: Create your first feature branch

## Support

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues
- **Discord**: [Join our Discord](#)
- **Email**: support@boardos.com

The development environment is now ready. Start the dev server with `npm run dev` and open http://localhost:5173 to begin development.