# Master AI Project Guide - Construction Scheduler

## Project Overview

This is a comprehensive drag-and-drop construction scheduling application built with React, TypeScript, and Supabase. The application manages personnel, equipment, and vehicle assignments for construction jobs with sophisticated rule-based interactions.

## Core Purpose

The scheduler allows construction companies to:
- Create and manage construction jobs (milling, paving, drainage, etc.)
- Assign personnel and equipment to jobs using drag-and-drop
- Enforce safety and operational rules through magnet interaction systems
- Track resources across multiple shifts and job sites
- Generate job reports and SMS notifications to crew members

## Project Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Drag & Drop**: react-dnd with multi-backend support (mouse + touch)
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **State Management**: React Context + useState (no external state library)
- **Animation**: Framer Motion
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library

### File Structure Overview

```
src/
├── components/           # UI components organized by feature
│   ├── board/           # Main scheduling board components
│   ├── resources/       # Resource cards and management
│   ├── modals/          # Modal dialogs for configuration
│   ├── mobile/          # Mobile-specific components
│   ├── layout/          # Layout and navigation components
│   └── common/          # Shared components (ErrorBoundary, Portal)
├── context/             # React Context providers
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── utils/               # Utility functions and helpers
├── data/                # Mock data and resource definitions
├── classes/             # Object-oriented classes (Magnet system)
├── services/            # Database service layer
└── lib/                 # External service integrations (Supabase)
```

## Core Data Models

### Primary Entities

1. **Job**: A construction project with specific requirements
   - Types: milling, paving, both, drainage, stripping, hired, other
   - Shifts: day, night
   - Has location, start time, notes, plant assignments

2. **Resource**: Personnel, equipment, or vehicles
   - Personnel: operator, driver, foreman, laborer, striper, privateDriver
   - Equipment: paver, roller, excavator, sweeper, millingMachine, etc.
   - Vehicles: truck (with subcategories like 10W, Trac, etc.)

3. **Assignment**: Links a resource to a job in a specific row
   - Contains position, time slot, attachments, notes
   - Can be attached to other assignments (operator → equipment)

### Key Type Definitions

```typescript
// Core entities
interface Job {
  id: string;
  name: string;
  type: 'milling' | 'paving' | 'both' | 'drainage' | 'stripping' | 'hired' | 'other';
  shift: 'day' | 'night';
  startTime?: string;
  location?: { address: string; lat: number; lng: number };
  plants?: string[]; // For paving jobs
  finalized?: boolean;
}

interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  identifier?: string; // Unit number for equipment
  onSite?: boolean; // Location status for equipment/vehicles
}

interface Assignment {
  id: string;
  resourceId: string;
  jobId: string;
  row: RowType; // Which row in the job board
  attachedTo?: string; // Parent assignment ID
  timeSlot?: TimeSlot;
  truckConfig?: 'flowboy' | 'dump-trailer';
}
```

## Context Providers & State Management

### SchedulerContext
The main state provider managing all application data:
- Jobs, resources, assignments
- Magnet interaction rules and drop rules
- Truck-driver assignments
- Row configurations

### Other Contexts
- **MobileContext**: Device detection and responsive behavior
- **DragContext**: Drag operation state and Ctrl key detection
- **ModalContext**: Modal z-index management
- **ModalProvider**: Modal state management

## Key Features & Systems

### 1. Magnet Interaction System
Advanced rule-based attachment system that enforces safety and operational requirements:

```typescript
interface MagnetInteractionRule {
  sourceType: ResourceType; // What attaches
  targetType: ResourceType; // What it attaches to
  canAttach: boolean;
  isRequired?: boolean; // Must have this attachment
  maxCount?: number; // Maximum allowed attachments
}
```

**Examples**:
- Operators are required for equipment (paver needs operator)
- Drivers are required for trucks
- Laborers can attach to pavers as "screwmen" (max 2)
- Equipment without operators shows visual warnings

### 2. Drop Rules System
Controls what resource types can be dropped into specific job rows:

```typescript
interface DropRule {
  rowType: RowType; // 'Forman', 'Equipment', 'crew', etc.
  allowedTypes: ResourceType[]; // What can be dropped here
}
```

### 3. Multi-Shift Support
Resources can be assigned to multiple jobs:
- Day shift + Night shift = "Working Double"
- Visual indicators show double-shift status
- Ctrl+drag creates second assignments
- Time conflict detection prevents overlaps

### 4. Truck Configuration System
Special handling for different truck types:
- **Trac Trucks**: Can be configured as Flowboy (F/B) or Dump Trailer (D/T)
- **10W Trucks**: Heavy trucks for equipment transport
- **Regular Trucks**: General purpose vehicles

### 5. Real-time Synchronization
- Supabase real-time subscriptions for multi-user collaboration
- Automatic conflict resolution
- Audit trail for all changes

## Component Architecture

### Board Components
- **Board**: Main container with job columns
- **JobColumn**: Individual job with row layout
- **JobRow**: Specific row within a job (Equipment, Crew, etc.)

### Resource Components
- **ResourceCard**: Draggable resource representation
- **AssignmentCard**: Resource assigned to a job with attachments
- **TemplateCard**: Placeholder for adding specific equipment

### Drag & Drop System
- **Multi-backend**: Mouse + touch support
- **MobileDragLayer**: Visual feedback during drag operations
- **ItemTypes**: RESOURCE and ASSIGNMENT drag types

## Database Schema

### Core Tables
1. **users**: Personnel with roles, certifications, skills
2. **resources**: Equipment, vehicles, personnel catalog
3. **jobs**: Construction projects with specifications
4. **assignments**: Resource-to-job mappings
5. **magnet_interaction_rules**: Attachment rules
6. **drop_rules**: Row-specific drop permissions
7. **audit_logs**: Change tracking for compliance

### Key Relationships
- Users ↔ Resources (personnel link to user profiles)
- Resources → Assignments ← Jobs (many-to-many through assignments)
- Assignments can reference other assignments (attachments)

## Business Rules & Logic

### Safety Rules
- Equipment must have operators before assignment
- Trucks must have drivers
- Off-site equipment shows warnings
- Time conflict prevention

### Operational Rules
- Job-specific row requirements (milling jobs don't need tack rows)
- Equipment attachment limits (max 2 screwmen per paver)
- Truck capacity management (flowboy vs dump trailer counts)

### Time Management
- Default job start times
- Individual assignment time overrides
- Visual time indicators (blue = yard departure, green = job site)
- Multi-shift scheduling

## Key Functions & Hooks

### Core Actions
```typescript
// Job management
addJob(job: Omit<Job, 'id'>): void
updateJob(job: Job): void
removeJob(jobId: string): void
finalizeJob(jobId: string): void

// Resource assignment
assignResource(resourceId: string, jobId: string, row: RowType): string
attachResources(targetId: string, sourceId: string): void
moveAssignmentGroup(assignments: Assignment[], jobId: string, row: RowType): string

// Rule management
updateMagnetInteractionRule(rule: MagnetInteractionRule): void
canMagnetAttachTo(sourceType: ResourceType, targetType: ResourceType): boolean
```

### Custom Hooks
- **useOptimizedScheduler**: Performance-optimized context access
- **useMagnet**: Individual magnet state management
- **useJobData**: Job-specific data filtering
- **useResourcePool**: Resource categorization and filtering

## Testing Strategy

### Test Coverage
- Unit tests for core classes (Magnet system)
- Component tests for key UI elements
- Integration tests for context providers
- Database function tests via Supabase edge functions

### Test Files Location
- `src/components/**/__tests__/`: Component tests
- `src/classes/__tests__/`: Class unit tests
- `src/hooks/__tests__/`: Hook tests
- `tests/setup.ts`: Global test configuration

## Mobile Support

### Responsive Design
- Separate mobile layouts (`MobileSchedulerLayout`)
- Touch-optimized drag and drop
- Tab-based navigation for mobile
- Responsive breakpoints and touch targets

### Mobile-Specific Components
- **MobileJobCard**: Expandable job cards
- **MobileResourcePool**: Touch-friendly resource browser
- **MobileDragLayer**: Visual feedback for touch drags

## Configuration & Rules

### Rule Templates
Pre-built rule sets for common scenarios:
- **Standard Construction**: Basic safety rules
- **Paving Operations**: Paving-specific requirements
- **Milling Operations**: Milling-specific requirements
- **Highway Projects**: Large-scale operation rules

### Customization
- Job-specific row configurations
- Dynamic rule generation based on available resources
- Import/export rule configurations
- Split-row layouts for complex jobs

## Performance Optimizations

### Techniques Used
- Memoized computations with useMemo
- Debounced search inputs
- Stable callback references
- Virtualization for large lists
- Optimized re-rendering strategies

### Performance Hooks
- **useDebounce**: Search input optimization
- **useStableCallback**: Prevent unnecessary re-renders
- **useMemoizedFilter**: Large array filtering
- **usePerformanceMonitor**: Development performance tracking

## Development Workflow

### Local Development
```bash
npm install          # Install dependencies
npm run dev         # Start development server
npm test            # Run test suite
npm run build       # Production build
```

### Database Development
- Supabase local development environment
- Edge functions for complex operations
- Real-time subscription management
- Migration-based schema changes

## Error Handling

### Error Boundaries
- Component-level error catching
- Graceful degradation
- Development error details
- User-friendly error messages

### Logging System
- Structured logging with context
- Development vs production modes
- Performance monitoring
- Error tracking and debugging

## Key Architectural Decisions

### State Management
- Context-based state instead of Redux for simplicity
- Local state with localStorage persistence
- Real-time sync with Supabase
- Optimistic updates with rollback capability

### Drag & Drop
- react-dnd for consistency and accessibility
- Multi-backend support for mouse and touch
- Custom drag layers for mobile feedback
- Rule-based drop validation

### Database Design
- Row Level Security (RLS) for multi-tenant support
- Audit logging for compliance
- Edge functions for complex business logic
- Type-safe database operations

## Common Patterns

### Adding New Features
1. Define types in `src/types/index.ts`
2. Add database schema if needed
3. Create service layer functions
4. Add context actions
5. Build UI components
6. Add tests
7. Update documentation

### Creating New Rules
1. Use `MagnetRuleCreator` or `DropRuleCreator` classes
2. Add validation with `RuleValidator`
3. Create templates for reuse
4. Test rule interactions
5. Document business logic

### Adding New Resource Types
1. Update `ResourceType` enum
2. Add to resource color mappings
3. Update rule systems
4. Add UI support
5. Update database enums

## Troubleshooting

### Common Issues
- **Drag not working**: Check backend configuration and touch detection
- **Rules not enforcing**: Verify rule definitions and validation
- **Performance issues**: Check memoization and re-render patterns
- **Database errors**: Verify RLS policies and edge function permissions

### Debug Tools
- React DevTools for component inspection
- Performance monitoring hooks
- Console logging with structured data
- Database test page for connectivity validation

## API Integration

### Supabase Edge Functions
- `assign-resource`: Complex assignment creation with validation
- `move-assignment-group`: Atomic group movement operations
- Custom RPC functions for complex queries

### External APIs
- Google Maps for location selection
- SMS services for crew notifications
- Print/export services for job reports

This guide should help AI understand the project's structure, purpose, and key systems for effective development and maintenance tasks.