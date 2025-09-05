# BoardOS - Construction Scheduler

A real-time drag-and-drop construction job scheduling application with magnetic resource attachments.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL with real-time subscriptions)
- **UI**: Tailwind CSS + Framer Motion
- **DnD**: react-dnd with multi-backend support (desktop + mobile)
- **Testing**: Vitest + React Testing Library

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

#### Enable Realtime (Required for UI updates)

Run this SQL in your Supabase Dashboard SQL Editor:

```sql
-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE resources;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE magnet_interaction_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE drop_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE job_row_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE truck_driver_assignments;
```

#### Row Level Security

For development, disable RLS by running `disable_rls_fixed.sql`:

```sql
ALTER TABLE IF EXISTS resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS jobs DISABLE ROW LEVEL SECURITY;
-- ... (all tables)
```

For production, use `supabase/migrations/001_enable_rls_policies.sql` to enable RLS with proper policies.

## Running the Application

### Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Testing

Execute unit tests (single run):

```bash
npm test -- --run
```

Run tests in watch mode:

```bash
npm test
```

Check test coverage:

```bash
npm test -- --coverage
```

Optional reporters (examples):

```bash
# compact dot reporter
npm test -- --run --reporter=dot

# verbose output
npm test -- --run --reporter=verbose
```

End-to-end tests (Playwright):

```bash
npm run test:e2e           # run all browsers per config
npm run test:e2e:chrome    # run Chromium only
```

CI-friendly sequence:

```bash
npm run lint:check && npm run typecheck && npm test -- --run
```

## Key Features

### 1. Magnetic Resource System
- Resources can magnetically attach to each other based on configurable rules
- Operators automatically attach to equipment
- Visual indicators show attachment relationships

### 2. Real-time Updates
- All database changes instantly reflect in the UI
- No page refresh required
- Background data syncing without screen blanking

### 3. Drag and Drop
- Desktop: Mouse drag and drop
- Mobile: Touch-enabled dragging
- Visual feedback during drag operations

### 4. Job Management
- Multiple job types: Paving, Milling, Both
- Day/Night shift support
- Finalized job protection
- Row-based resource organization

### 5. Resource Types
- **Personnel**: Foreman, Operator, Laborer, Mechanic, Office
- **Equipment**: Paver, Roller, Skidsteer, Milling Machine, Sweeper
- **Vehicles**: Trucks (Flowboy, Dump Trailer, 10W configurations)

## Architecture

### Frontend Structure

```
src/
├── components/       # React components
│   ├── board/       # Job board components
│   ├── resources/   # Resource cards and magnets
│   ├── modals/      # Modal dialogs
│   └── mobile/      # Mobile-specific components
├── context/         # React contexts
│   ├── SchedulerContext.tsx  # Main data management
│   ├── DragContext.tsx       # Drag state management
│   └── ModalContext.tsx      # Modal state management
├── services/        # Backend services
│   └── DatabaseService.ts    # Supabase integration
├── utils/           # Utility functions
└── types/           # TypeScript definitions
```

### Database Schema

- **resources**: All equipment and personnel
- **jobs**: Job definitions with type, shift, location
- **assignments**: Links resources to jobs with position and row
- **magnet_interaction_rules**: Defines attachment rules
- **drop_rules**: Controls which resources can be placed in which rows
- **job_row_configs**: Split row configurations
- **truck_driver_assignments**: Driver-truck relationships

## UI Controls

### Desktop
- **Drag & Drop**: Click and drag resources between jobs
- **Ctrl+Drag**: Create second shift assignment (keeps original)
- **Refresh Button**: Manual data sync (blue button, top-right)
- **Database Test**: Access database testing tools (green button, top-right)

### Mobile
- **Touch Drag**: Long-press to start dragging
- **Tab Navigation**: Switch between Jobs, Resources, Schedule views
- **Responsive Layout**: Optimized for mobile screens

## Troubleshooting

### UI Not Updating
1. Check browser console for real-time subscription logs
2. Verify Supabase Realtime is enabled (see Database Setup)
3. Use the Refresh button to manually sync
4. Check network connection to Supabase

### Database Errors
- **401 Unauthorized**: RLS is enabled, run disable_rls_fixed.sql
- **Syntax Errors**: Ensure you're using the correct SQL file version
- **Connection Failed**: Verify environment variables are set correctly

### Drag and Drop Issues
- Ensure resources have drivers assigned (for trucks)
- Check drop rules for the target row
- Verify job is not finalized
- Check console for detailed drop rejection reasons

## Development Notes

### Real-time Subscriptions
The app uses Supabase real-time subscriptions for instant updates:
- Resources, Jobs, Assignments update immediately
- Rules and configurations sync in real-time
- Background refresh without UI interruption

### Optimistic Updates
- UI updates immediately on user actions
- Background sync ensures consistency
- No loading screens during refreshes (after initial load)

### Testing Coverage
Current coverage: ~70% of components have tests
- Unit tests for utilities and rules
- Component tests with React Testing Library
- Mock Supabase client for isolated testing

## Documentation

Comprehensive documentation is available in the `docs/` directory:

### 📚 Core Documentation
- **[Getting Started](docs/00-getting-started/README.md)** - Quick setup and installation
- **[Architecture Overview](docs/01-architecture/overview.md)** - System design and patterns
- **[API Reference](docs/02-api/README.md)** - Complete API documentation
- **[Component Library](docs/03-components/index.md)** - All UI components
- **[Features Guide](docs/04-features/)** - Feature documentation

### 🏗️ Architecture Guides
- **[Data Flow](docs/01-architecture/data-flow.md)** - How data moves through the system
- **[State Management](docs/01-architecture/state-management.md)** - Context and state patterns
- **[Database Schema](docs/01-architecture/database-schema.md)** - Complete database documentation
- **[Security](docs/01-architecture/security.md)** - Authentication and authorization

### 🔧 Development
- **[Setup Guide](docs/05-development/setup-guide.md)** - Development environment setup
- **[Development Workflow](docs/05-development/workflow.md)** - Git workflow and best practices
- **[Testing Guide](docs/07-testing/testing-guide.md)** - Testing strategies and patterns

### 🚀 Deployment
- **[Production Deployment](docs/06-deployment/production.md)** - Deploy to production
- **[Supabase Setup](docs/06-deployment/supabase-setup.md)** - Database configuration
- **[Environment Variables](docs/06-deployment/environment-variables.md)** - Configuration guide
- **[Monitoring](docs/06-deployment/monitoring.md)** - Observability and monitoring

### 📋 Feature Documentation
- **[Business Rules](docs/04-features/business-rules.md)** - Validation and constraints
- **[Drag & Drop System](docs/04-features/drag-and-drop.md)** - DnD implementation
- **[Magnet System](docs/04-features/magnet-system.md)** - Resource attachment logic
- **[Real-time Sync](docs/04-features/real-time-sync.md)** - Live updates

### 🔌 API Documentation
- **[Database Service](docs/02-api/database-service.md)** - Core data operations
- **[React Contexts](docs/02-api/contexts.md)** - State management contexts
- **[Custom Hooks](docs/02-api/hooks.md)** - Reusable React hooks

## Contributing

See our [Development Workflow Guide](docs/05-development/workflow.md) for detailed contribution guidelines:

1. Fork and clone the repository
2. Create a feature branch following naming conventions
3. Write tests for new features
4. Submit a pull request with the template
5. Respond to code review feedback

## Quick Commands

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run preview            # Preview production build

# Testing
npm test                   # Run unit tests
npm run test:watch         # Watch mode for tests
npm run test:coverage      # Generate coverage report
npm run test:e2e           # Run E2E tests with Playwright

# Code Quality
npm run lint               # Run ESLint
npm run type-check         # TypeScript type checking
npm run format             # Format with Prettier

# Documentation
npm run docs:generate      # Generate component docs
npm run docs:serve         # Serve documentation locally
```

## Support

For issues and questions:
- Check the [Troubleshooting Guide](#troubleshooting) above
- Review [Business Rules Documentation](docs/04-features/business-rules.md)
- See [Testing Guide](docs/07-testing/testing-guide.md) for test-related issues

## License

Private - Rosemar Construction
