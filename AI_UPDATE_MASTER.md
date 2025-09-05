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

### Test Structure
- **Unit Tests**: Business logic and utilities
- **Component Tests**: UI component behavior
- **Integration Tests**: Context and state management
- **E2E Tests**: Critical user workflows

### Testing Patterns
```typescript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup test data
  });

  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
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

### Known Issues
1. **Drag and Drop on Mobile**: Requires touch backend configuration
2. **Real-time Updates**: May cause performance issues with large datasets
3. **State Synchronization**: Complex state updates can cause race conditions

### Debugging Tips
- **React DevTools**: Component state inspection
- **Redux DevTools**: State management debugging
- **Network Tab**: API request monitoring
- **Console Logging**: Strategic logging with logger utility

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

## 🤖 AI Development Guidelines

### When Working with AI
1. **Provide Context**: Always reference this document
2. **Specify Scope**: Clearly define what needs to be changed
3. **Test Changes**: Ensure all changes are tested
4. **Follow Patterns**: Maintain consistency with existing code
5. **Document Changes**: Update relevant documentation

### AI-Friendly Patterns
- **Clear Function Names**: Descriptive, action-oriented names
- **Type Safety**: Use TypeScript interfaces and types
- **Modular Design**: Small, focused functions and components
- **Consistent Structure**: Follow established patterns
- **Error Handling**: Graceful error handling throughout

### Common AI Tasks
- **Component Creation**: New UI components
- **Business Logic**: Rule engine modifications
- **API Integration**: Database and external service connections
- **Testing**: Unit and integration tests
- **Performance**: Optimization and refactoring
- **Bug Fixes**: Issue resolution and debugging

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

**Last Updated**: [Current Date]
**Version**: 1.0.0
**Maintainer**: Development Team

---

*This document should be updated whenever significant changes are made to the project architecture, patterns, or development guidelines.*
