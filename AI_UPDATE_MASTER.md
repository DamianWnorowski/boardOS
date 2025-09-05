# boardOS - Master AI Update Document

## 🎯 Project Overview

**boardOS** (Rosemar_SiteOps) is a sophisticated construction workforce management and scheduling application built with React, TypeScript, and Supabase. The system uses a magnet-based drag-and-drop interface for managing personnel, equipment, and job assignments.

### Core Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + real-time subscriptions)
- **State Management**: Zustand + React Context
- **Testing**: Vitest + React Testing Library
- **Drag & Drop**: React DnD with multi-backend support

## 📁 Project Structure

```
boardOS/
├── src/
│   ├── components/          # React components
│   │   ├── board/          # Main scheduling board
│   │   ├── magnets/        # Magnet-related components
│   │   ├── modals/         # Modal dialogs
│   │   ├── resources/      # Resource management
│   │   ├── layout/         # Layout components
│   │   └── mobile/         # Mobile-specific components
│   ├── context/            # React contexts
│   ├── classes/            # Core business logic classes
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── data/               # Mock data and data utilities
│   ├── lib/                # External library configurations
│   └── services/           # API and service layers
├── supabase/               # Database migrations and functions
└── tests/                  # Test setup and configuration
```

## 🏗️ Core Business Logic

### Magnet System
- **Magnet Class** (`src/classes/Magnet.ts`): Core magnet functionality
- **Status Types**: Available, Assigned, MultiAssigned, InTransit
- **Categories**: Personnel, Equipment, Vehicle
- **Attachment System**: Hierarchical resource relationships

### Resource Types
```typescript
// Personnel
'operator' | 'driver' | 'striper' | 'foreman' | 'laborer' | 'privateDriver'

// Equipment
'skidsteer' | 'paver' | 'excavator' | 'sweeper' | 'millingMachine' | 
'grader' | 'dozer' | 'payloader' | 'roller' | 'equipment' | 'truck'
```

### Job Types
```typescript
'milling' | 'paving' | 'both' | 'other' | 'drainage' | 'stripping' | 'hired'
```

### Row Types
```typescript
'Forman' | 'Equipment' | 'Sweeper' | 'Tack' | 'MPT' | 'crew' | 'trucks'
```

## 🔧 Key Components

### State Management
- **SchedulerContext** (`src/context/SchedulerContext.tsx`): Main application state
- **ModalContext** (`src/context/ModalContext.tsx`): Modal management
- **DragContext** (`src/context/DragContext.tsx`): Drag and drop state
- **MobileContext** (`src/context/MobileContext.tsx`): Mobile detection

### Core Components
- **Board** (`src/components/board/Board.tsx`): Main scheduling interface
- **JobColumn** (`src/components/board/JobColumn.tsx`): Individual job columns
- **MagnetCard** (`src/components/magnets/MagnetCard.tsx`): Draggable resource cards
- **ResourceCard** (`src/components/resources/ResourceCard.tsx`): Resource pool items

### Modal System
- **AddJobModal**: Create new jobs
- **EditJobModal**: Modify existing jobs
- **TimeSlotModal**: Schedule time slots
- **MagnetSelectorModal**: Resource selection
- **EquipmentSelectorModal**: Equipment assignment

## 🗄️ Database Schema

### Core Tables
```sql
-- Users (extends Supabase auth)
users (id, full_name, email, phone_number, role, certifications, skills, permissions)

-- Resources (magnets)
resources (id, type, name, identifier, model, vin, location, on_site, user_id)

-- Jobs
jobs (id, name, job_number, type, shift, notes, start_time, finalized, plants, location)

-- Assignments
assignments (id, resource_id, job_id, row_type, position, attached_to_assignment_id, time_slot, note, truck_config)

-- Rules
magnet_interaction_rules (source_type, target_type, can_attach, is_required, max_count)
drop_rules (row_type, allowed_types)
job_row_configs (job_id, row_type, boxes, is_split)

-- Audit
audit_logs (id, table_name, record_id, action, old_values, new_values, user_id, timestamp)
```

## 🎨 UI/UX Patterns

### Design System
- **Colors**: Tailwind CSS color palette
- **Icons**: Lucide React icon library
- **Typography**: Tailwind typography classes
- **Spacing**: Consistent spacing scale
- **Responsive**: Mobile-first design approach

### Component Patterns
- **Error Boundaries**: Graceful error handling
- **Loading States**: Skeleton loaders and spinners
- **Empty States**: Helpful empty state messages
- **Form Validation**: Real-time validation feedback
- **Toast Notifications**: Success/error feedback

## 🧪 Testing Strategy

### Current Test Status
- **Total Files**: 138 source files
- **Components**: 86 React components
- **Test Coverage**: ~80-85% (varies by module)
- **Test Runner**: Vitest with React Testing Library
- **E2E Tests**: Playwright for end-to-end scenarios

### Test Structure
- **Unit Tests**: Business logic and utilities
- **Component Tests**: UI component behavior  
- **Integration Tests**: Context and state management
- **E2E Tests**: Critical user workflows with Playwright

### Testing Patterns
```typescript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup test data and mocks
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  // Test with longer timeout for async operations
  it('should handle async operations', async () => {
    // test code
  }, 10000);
});
```

### Mock Patterns for Supabase
```typescript
// Mock Supabase client in tests
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      // ... other methods
    }))
  }
}));
```

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage report
npm test -- --reporter=verbose  # Detailed output

# E2E tests
npm run test:e2e            # All browsers
npm run test:e2e:chrome     # Chrome only
npm run test:e2e:debug      # Debug mode
```

## 🔄 Development Workflow

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Git Hooks**: Pre-commit validation

### File Naming Conventions
- **Components**: PascalCase (e.g., `MagnetCard.tsx`)
- **Utilities**: camelCase (e.g., `jobUtils.ts`)
- **Types**: camelCase (e.g., `index.ts`)
- **Tests**: Same name + `.test.tsx` (e.g., `MagnetCard.test.tsx`)

### Import Organization
```typescript
// 1. React imports
import React from 'react';

// 2. Third-party libraries
import { v4 as uuidv4 } from 'uuid';

// 3. Internal imports (absolute paths)
import { useScheduler } from '@/context/SchedulerContext';

// 4. Relative imports
import './Component.css';
```

## 🚀 Performance Considerations

### Optimization Strategies
- **React.memo**: Prevent unnecessary re-renders
- **useMemo/useCallback**: Memoize expensive calculations
- **Virtual Scrolling**: For large lists
- **Lazy Loading**: Code splitting for routes
- **Image Optimization**: WebP format, proper sizing

### State Management
- **Immer**: Immutable updates for complex state
- **Selective Updates**: Only update changed parts
- **Debouncing**: For search and filter operations
- **Caching**: Local storage for user preferences

## 🔒 Security & Data Protection

### Authentication
- **Supabase Auth**: Built-in authentication
- **Row Level Security**: Database-level access control
- **Role-based Access**: User permissions system

### Data Validation
- **Input Sanitization**: Prevent XSS attacks
- **Type Validation**: Runtime type checking
- **Business Rule Validation**: Domain-specific validation

## 📱 Mobile Support

### Responsive Design
- **Breakpoints**: Tailwind responsive classes
- **Touch Interactions**: Gesture-based navigation
- **Mobile-specific Components**: Optimized for small screens
- **Offline Support**: Local storage for offline functionality

### Mobile Components
- **MobileSchedulerLayout**: Mobile-optimized layout
- **MobileDragLayer**: Touch drag and drop
- **MobileJobCard**: Simplified job cards
- **MobileResourcePool**: Compact resource display

## 🔧 Configuration & Environment

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Build Configuration
- **Vite**: Fast development and optimized builds
- **PostCSS**: CSS processing pipeline
- **Tailwind**: Utility-first CSS framework
- **TypeScript**: Static type checking

## 🐛 Common Issues & Solutions

### Known Issues & Fixes
1. **Drag and Drop on Mobile**: Touch backend configured in `utils/dndBackend.ts`
2. **Real-time Updates**: Optimized with Supabase subscriptions, performance monitored
3. **State Synchronization**: Race conditions prevented with optimistic updates
4. **Test Timeouts**: Some integration tests may timeout (increase timeout in test files)
5. **selectedDate undefined**: CompactQuickSelect component needs date context

### Quick Fixes for Common Errors
```bash
# Fix most ESLint errors automatically
npm run lint:fix

# Clear test cache if tests behave inconsistently  
rm -rf node_modules/.cache

# Restart dev server if HMR stops working
# Kill server with Ctrl+C, then npm run dev

# Reset database connection if Supabase errors occur
# Check .env file has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### Debugging Tools & Tips
- **Ctrl+Shift+D**: Toggle debug panel in app
- **React DevTools**: Component state inspection
- **Network Tab**: Monitor Supabase API calls
- **Console Logging**: Use logger utility from `utils/logger.ts`
- **Test Debugging**: Use `npm test -- --reporter=verbose` for detailed output

### Database Troubleshooting
```sql
-- Check if migration applied correctly
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'jobs' AND column_name = 'schedule_date';

-- Verify RLS policies if getting 401 errors
SELECT * FROM pg_policies WHERE tablename = 'resources';

-- Check real-time subscriptions
SELECT * FROM pg_replication_slots;
```

## 📈 Future Enhancements

### Planned Features
- **Advanced Reporting**: Analytics and insights
- **Calendar Integration**: External calendar sync
- **Notification System**: Real-time notifications
- **Advanced Rules Engine**: More complex business rules
- **API Integrations**: Third-party service connections

### Technical Debt
- **Component Refactoring**: Extract reusable components
- **Performance Optimization**: Reduce bundle size
- **Test Coverage**: Increase test coverage
- **Documentation**: Improve inline documentation

## ⚙️ Critical Features & Commands

### Database Migration Status
The multi-day scheduling migration has been successfully applied. Verify with:
```bash
npm run migration:check    # Verify migration status
npm run migration:test     # Test migration functionality
```

### Key Development Commands
```bash
# Development
npm run dev                # Start development server (port 5173)
npm run claude:start       # Claude AI session management
npm run claude:status      # Check current session status

# Testing & Quality
npm test                   # Run all tests
npm run lint               # ESLint code quality check
npm run typecheck          # TypeScript type checking

# Documentation
npm run docs:generate      # Generate component docs
npm run docs:ai-context    # Update AI context files
```

### Critical Business Rules
1. **Equipment Safety**: All equipment MUST have operators assigned
2. **Truck Requirements**: All trucks MUST have drivers before assignment
3. **Paver Crew Limits**: Max 2 screwmen per paver allowed
4. **Milling Limits**: Max 1 groundman per milling machine
5. **Shift Support**: Jobs support day shift, night shift, or both
6. **Job Protection**: Finalized jobs cannot be modified

### Week View Features (Post-Migration)
- ✅ **Multi-day Scheduling**: Create jobs on any future date
- ✅ **Drag to Copy**: Drag jobs between different days
- ✅ **Job Templates**: Save and reuse common job configurations
- ✅ **Resource Availability**: Track equipment maintenance and personnel vacation
- ✅ **Real-time Updates**: All changes sync instantly across views

## 🤖 AI Development Guidelines

### When Working with AI
1. **Provide Context**: Always reference this document and check CLAUDE.md
2. **Verify Migration**: Use `npm run migration:check` before making changes
3. **Test Changes**: Run `npm test` to ensure changes don't break functionality
4. **Follow Patterns**: Maintain consistency with existing code
5. **Document Changes**: Update relevant documentation

### AI-Friendly Patterns
- **Clear Function Names**: Descriptive, action-oriented names
- **Type Safety**: Use TypeScript interfaces and types
- **Modular Design**: Small, focused functions and components
- **Consistent Structure**: Follow established patterns
- **Error Handling**: Graceful error handling throughout

### Common AI Tasks
- **Component Creation**: New UI components following existing patterns
- **Business Logic**: Rule engine modifications (check attachment rules)
- **API Integration**: Database and external service connections
- **Testing**: Unit and integration tests (use existing test patterns)
- **Performance**: Optimization and refactoring
- **Bug Fixes**: Issue resolution and debugging

### Session Management
BoardOS includes comprehensive Claude AI session management:
- **Session Tracking**: Automatic session handoffs and context preservation
- **Progress Monitoring**: Track completed tasks and remaining work
- **Memory Management**: Persistent context across sessions
- **Quick Commands**: `npm run claude:start`, `claude:status`, `claude:handoff`

### AI Provider System
BoardOS includes a pluggable AI provider architecture for development assistance:

#### Available Providers
- **GeminiProvider** (`src/ai-providers/GeminiProvider.ts`): Google Gemini integration
- **CodexProvider** (`src/ai-providers/CodexProvider.ts`): OpenAI Codex interface (mock implementation)
- **IAIProvider** (`src/ai-providers/IAIProvider.ts`): Base interface for all providers

#### Provider Interface
```typescript
interface IAIProvider {
  generateText(prompt: string): Promise<string>;
  analyzeCode(code: string): Promise<CodeAnalysis>;
  manageContext(context: AIContext): Promise<void>;
}
```

#### Usage in Scripts
The AI providers are integrated into development scripts:
- **gemini-smart-start.js**: Intelligent session management with AI context
- **claude-smart-start.js**: Claude-specific session management
- Provider selection: `'gemini' | 'codex'` via environment or configuration

#### Integration Points
- Code analysis and quality assessment
- Context management for AI sessions
- Intelligent development workflow automation
- Session handoff and continuity management

## 📞 Support & Resources

### Documentation
- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

### Development Tools
- **VS Code Extensions**: Recommended extensions list
- **Browser DevTools**: Chrome/Firefox developer tools
- **Postman**: API testing and documentation
- **Figma**: Design system and mockups

---

**Last Updated**: 2025-09-05
**Version**: 0.1.0 (Production Ready)
**Migration Status**: ✅ Applied and Verified
**Dev Server**: ✅ Running on localhost:5173
**Database**: ✅ Multi-day scheduling operational

---

*This document is the authoritative source for BoardOS development. All obsolete session files and migration instructions have been removed. The system is fully operational with week view, job templates, and multi-day scheduling features.*
