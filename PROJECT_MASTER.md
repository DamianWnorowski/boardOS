# BoardOS Project Master Documentation

## Project Overview

BoardOS is a comprehensive construction scheduler application built with React, TypeScript, and Supabase. It features drag-and-drop functionality for resource management, real-time updates, and a sophisticated rule-based assignment system.

## Recent Updates (2025-01-26)

### 🤖 AUTOMATED CLAUDE CONTEXT SYSTEM - REVOLUTIONARY UPDATE

**The biggest advancement in Claude session management**

#### Problem Solved

The old Claude handoff system was fundamentally broken - it used **hardcoded fake memories** and **surface-level guessing** instead of real intelligence transfer. When Claude hit token limits, it couldn't think properly to create handoffs, so scripts ran outside the conversation and fabricated context.

#### Solution: Real Intelligence Transfer

Implemented a complete automated context management system with **genuine intelligence continuity**:

**Core Components:**

- `scripts/claude-context-manager.js` - Real-time context tracking with file watchers
- `scripts/claude-monitor.js` - Token usage monitoring with 80% early warnings
- `scripts/claude-bridge.js` - Intelligent session continuity with context verification
- Git hooks for automatic context capture on commits/checkouts
- VSCode integration for seamless development workflow
- Structured context schema (`.claude/context-schema.json`) for data validation

**New npm Scripts:**

```bash
npm run claude:context:watch    # Real-time tracking (background)
npm run claude:context:update   # One-time context capture  
npm run claude:monitor          # Check token usage
npm run claude:bridge           # Load previous context intelligently
npm run claude:analyze          # Complete context analysis
```

**Key Advantages:**

- ✅ **Real Intelligence** - Actual context, not hardcoded guesses
- ✅ **Early Handoffs** - Before token degradation, while Claude coherent
- ✅ **Automatic Operation** - No manual intervention required
- ✅ **Verifiable Context** - New Claude can verify/correct inherited data
- ✅ **True Continuity** - Seamless transitions between sessions

**Files Created:**

- `scripts/claude-context-manager.js` (425 lines)
- `scripts/claude-monitor.js` (312 lines)
- `scripts/claude-bridge.js` (628 lines)
- `scripts/test-automated-context.js` (test suite)
- `.claude/context-schema.json` (structured data schema)
- `.git/hooks/post-commit`, `.git/hooks/pre-push`, `.git/hooks/post-checkout`
- `.vscode/tasks.json` (VSCode integration)
- `CLAUDE.md` (comprehensive project memory)

This system represents a **paradigm shift** from theatrical fake handoffs to genuine AI context continuity.

### 1. Color System Overhaul

**File:** `src/utils/colorSystem.ts`

- **Equipment** (all types): Yellow background with white text (`bg-yellow-500 text-white`)
- **Operator**: White background with black text (`bg-white text-black`)
- **Driver**: Green background with black text (`bg-green-500 text-black`)
- **Striper**: Blue background with white text (`bg-blue-500 text-white`)
- **Foreman**: Orange background with black text (`bg-orange-500 text-black`)
- **Truck**: Black background with white text (`bg-black text-white`)
- **Laborer**: White background with green text (`bg-white text-green-600`)
- **Private Driver**: Indigo background with white text (`bg-indigo-500 text-white`)
- Fixed bug in `getShiftStatusBorder()` by adding missing `resourceType` parameter

### 2. Business Rules Updates

**File:** `src/utils/ruleCreator.ts`

- **Equipment Row**: Now accepts ALL equipment types (skidsteer, paver, excavator, sweeper, millingMachine, grader, dozer, payloader, roller, equipment)
- **Foreman Flexibility**: Foreman can now be placed in ANY row type (Forman, Equipment, Sweeper, Tack, MPT, crew, trucks)
- Updated `buildStandardDropRules()` function to enforce these new rules

### 3. Operator Equipment Permissions System

**New Feature:** Operators can now have specific equipment permissions

**Files Modified:**

- `src/types/index.ts`: Added `allowedEquipment?: string[]` to Employee interface
- `src/components/ui/EquipmentCheckboxList.tsx`: New component for managing equipment permissions with checkboxes
- `supabase/migrations/20250126_add_allowed_equipment.sql`: Database migration to add allowed_equipment column

**Implementation:**

- Checkbox UI for selecting which equipment types an operator can operate
- Database storage for equipment permissions
- Ready for integration with PersonModal for operator editing

### 4. Testing Infrastructure

**New Testing System:** Comprehensive real-database testing with automatic test generation

**New Files:**

- `src/services/TestDatabaseService.ts`: Service for isolated database testing

  - Test data tracking and cleanup
  - Drag & drop testing utilities
  - Real-time subscription testing
  - Comprehensive test suite runner
- `tests/integration/dragDrop.test.ts`: Integration tests covering:

  - Equipment placement rules
  - Foreman flexibility
  - UI update verification
  - Real-time subscriptions
  - Color system validation

**Features:**

- `AutoTestGenerator` class for automatic test generation when rules change
- Test matrix generation for all drag & drop combinations
- Real database testing (not mocks)
- Automatic cleanup of test data

### 5. UI Update Fixes

**File:** `src/context/SchedulerContext.tsx`

- Added optimistic updates for immediate UI feedback
- Fixed async handling in drag & drop operations
- Improved attachment, removal, and move operations
- No more manual refresh needed after drag & drop
- **NEW**: Added optimistic updates to `finalizeJob()` and `unfinalizeJob()` functions
  - UI updates instantly when finalizing/unfinalizing jobs
  - Reverts on error for consistent state

**File:** `src/components/resources/AssignmentCard.tsx`

- Fixed duplicate `canDrop` key error
- Added proper error handling with `.then()` callbacks
- Improved attachment operation feedback

**File:** `src/App.tsx`

- Fixed MobileDragLayer to only show on mobile devices
- Removed debug UI from desktop view

## Architecture

### Core Technologies

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: React Context (SchedulerContext)
- **Database**: Supabase (PostgreSQL)
- **Drag & Drop**: react-dnd
- **Styling**: Tailwind CSS
- **Testing**: Vitest + React Testing Library

### Key Components

#### SchedulerContext (`src/context/SchedulerContext.tsx`)

Central state management for the entire application:

- Resource management (employees and equipment)
- Job and assignment handling
- Rule enforcement (drop rules and magnet interactions)
- Real-time subscriptions
- Optimistic UI updates

#### Assignment System

- **AssignmentCard**: Visual representation of resources assigned to jobs
- **Magnet System**: Automatic attachment of operators to equipment
- **Drop Rules**: Enforces which resources can be placed in which rows
- **Row Types**: Forman, Equipment, Sweeper, Tack, MPT, crew, trucks

#### Color System (`src/utils/colorSystem.ts`)

- Consistent color coding for resource types
- Border styles for shift status (day/night/double)
- Helper functions for style retrieval

#### Rule System (`src/utils/ruleCreator.ts`)

- Modular rule creation with `MagnetRuleCreator` and `DropRuleCreator`
- Pre-built templates for common scenarios
- Job-specific rule optimization
- Safety rule enforcement

## Database Schema

### Key Tables

- `employees`: Personnel with roles, permissions, and allowed equipment
- `equipment`: Machinery and vehicles
- `jobs`: Construction jobs with type, shift, and location
- `assignments`: Links resources to jobs with row and position
- `drop_rules`: Defines which resources can be placed where
- `magnet_interaction_rules`: Defines attachment requirements

### Real-time Subscriptions

- Resources changes
- Job updates
- Assignment modifications
- Rule changes

## Testing Strategy

### Unit Tests

- Component testing with React Testing Library
- Service layer testing
- Utility function testing

### Integration Tests

- Real database operations
- Drag & drop workflows
- Real-time subscription verification
- Rule validation

### Test Automation

- Automatic test generation when rules change
- Comprehensive test matrix for all combinations
- Cleanup and isolation for test data

## Development Workflow

### Commands

```bash
npm run dev          # Start development server
npm test            # Run tests
npm run build       # Build for production
npm run preview     # Preview production build
```

### Environment Variables

Required in `.env`:

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API (optional)

## Known Issues & Solutions

### Fixed Issues

1. **UI not updating after drag & drop**: Resolved with optimistic updates
2. **Duplicate key errors in AssignmentCard**: Fixed by removing duplicate definitions
3. **Debug UI showing on desktop**: Conditionally rendered based on device
4. **Missing resourceType parameter**: Fixed in getShiftStatusBorder function
5. **Job finalization not updating UI**: Added optimistic updates to finalizeJob/unfinalizeJob

### Pending Enhancements

1. Integrate EquipmentCheckboxList into PersonModal
2. Implement operator equipment restrictions in assignment logic
3. Add UI for managing operator permissions
4. Expand test coverage for new features

## Best Practices

### Code Organization

- Components in feature-based folders
- Services for external interactions
- Utils for pure functions
- Types centralized in `src/types/index.ts`

### State Management

- Use SchedulerContext for global state
- Local state for component-specific data
- Optimistic updates for better UX

### Testing

- Test with real database, not mocks
- Automatic test generation for rules
- Clean up test data after each run
- Test all drag & drop combinations

## Future Roadmap

### Short-term

- [ ] Complete operator equipment permission UI
- [ ] Add visual feedback for rule violations
- [ ] Implement undo/redo functionality
- [ ] Add keyboard shortcuts

### Long-term

- [ ] Mobile app with offline support
- [ ] Advanced scheduling algorithms
- [ ] Resource optimization suggestions
- [ ] Historical data analytics
- [ ] Multi-company support

## Contact & Support

For questions or issues, please refer to the GitHub repository or contact the development team.

---

*Last Updated: January 26, 2025 - 4:07 PM*
*Latest Fix: Job finalization UI updates*
