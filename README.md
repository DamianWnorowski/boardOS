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

Execute all unit tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Check test coverage:

```bash
npm run test:coverage
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

## Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Update documentation for significant changes
4. Use TypeScript strictly
5. Follow the established component structure

## License

Private - Rosemar Construction