# BoardOS Project Memory

## Project Overview
- **Name**: BoardOS (Construction Scheduler)
- **Type**: Real-time drag-and-drop construction job scheduling application
- **Tech Stack**: React 18 + TypeScript + Vite + Supabase + Tailwind CSS
- **Database**: PostgreSQL with real-time subscriptions via Supabase

## Key Features
- Drag-and-drop resource scheduling with magnetic attachments
- Real-time UI updates via Supabase subscriptions
- Optimistic UI updates for instant feedback
- Multi-shift assignment support (day/night)
- Mobile and desktop support

## Recent Fixes (2025-09-02)

### Latest Changes
- **Z-Index Management System**: Implemented centralized modal layering with ModalContext and standardized z-index constants
- **Job Rules Configuration**: Consolidated redundant Drop Zone Rules into Row Configuration for cleaner UI
- **Modal Layering Fix**: Fixed MasterSettingsModal and child modals appearing behind each other
- **WeekViewCompact infinite loop fix**: Fixed "Maximum update depth exceeded" error preventing week view from rendering
- **View synchronization fix**: Fixed date synchronization when switching between Week and Day views
- **Truck-driver attachment fix**: Trucks with assigned drivers now automatically attach drivers when assigned to jobs  
- **Resource availability fix**: Resource pool now shows date-specific availability instead of global
- **Screwman button behavior**: Screwman button now disappears after 1st attachment, 2nd screwman requires manual drag
- **Truck-driver UI updates**: Driver assignments now show immediately without requiring manual refresh
- Week view fix: Fixed "last week" showing only one day instead of full week
- Data reloading fix: Job creation and other operations maintain date filtering
- Refresh button fix: Manual refresh now respects current view date filtering
- OpenStreetMap integration: Location selector now uses OpenStreetMap instead of Google Maps
- Equipment colors: All equipment now uses yellow background with black text

### Project Statistics
- **Total Files**: 117
- **Components**: 74
- **Hooks**: 3
- **Contexts**: 9
- **Services**: 5
- **Lines of Code**: 33,115

### Critical File Updates (2025-09-02)
- **src/utils/zIndexLayers.ts**: New centralized z-index constants for consistent layering
- **src/context/ModalContext.tsx**: Enhanced with proper z-index management for modal stacking
- **src/components/modals/MasterSettingsModal.tsx**: Fixed z-index issues and removed redundant Drop Zone Rules
- **src/components/modals/ResourceTypeSelectorModal.tsx**: New modal for unified resource type selection
- **src/components/board/WeekViewCompact.tsx**: Fixed infinite rendering loop with useMemo
- **src/context/SchedulerContext.tsx**: View synchronization, truck-driver auto-attachment, optimistic UI updates
- **src/components/layout/Sidebar.tsx**: Date-specific resource availability filtering
- **src/components/resources/TruckDriverSection.tsx**: Date-specific resource availability filtering  
- **src/components/resources/AssignmentCard.tsx**: Screwman button behavior modification
- **src/components/modals/LocationSelector.tsx**: Complete OpenStreetMap integration
- **src/services/DatabaseService.ts**: Updated database operations
- **src/utils/colorSystem.ts**: Equipment color standardization

### Testing Infrastructure
**New Test Files Added (2025-09-02)**:
- `src/context/__tests__/SchedulerContext.view-sync.test.tsx` - View synchronization tests (6 tests)
- `src/context/__tests__/SchedulerContext.truck-driver.test.tsx` - Truck-driver operations tests (6 tests)  
- `src/components/layout/__tests__/Sidebar.availability.test.tsx` - Resource availability filtering tests (6 tests)

**Test Coverage Areas**:
- View switching and data loading synchronization
- Optimistic UI updates for truck-driver assignments
- Date-specific resource availability filtering
- Error handling and recovery patterns
- Edge cases (missing dates, empty assignments)

### Performance Optimizations

#### 1. WeekViewCompact Memoization Fix (2025-09-02)
**Problem**: "Maximum update depth exceeded" error causing infinite re-renders
**Solution**: Memoized weekDates calculation to prevent recreation on every render
```typescript
const weekDates = useMemo(() => {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setDate(current.getDate() - current.getDay());
  for (let i = 0; i < 7; i++) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}, [startDate]);
```
**File**: `src/components/board/WeekViewCompact.tsx:21-32`

#### 2. Equipment Colors
- All equipment types now use yellow background (`bg-yellow-500`) with black text
- Border color: `border-yellow-700`
- Located in: `src/utils/colorSystem.ts`

#### 3. Optimistic UI Updates
Added immediate UI updates for:
- **Attachment operations**: `attachResources()`, `assignResourceWithAttachment()`
- **Removal operations**: `removeAssignment()` with immediate visual feedback
- **Move operations**: `moveAssignmentGroup()` for dragging between jobs
- **Truck-driver operations**: `assignDriverToTruck()`, `unassignDriverFromTruck()`
- All in: `src/context/SchedulerContext.tsx`

## Important Files
- **Main Context**: `src/context/SchedulerContext.tsx` - Core state management
- **Database Service**: `src/services/DatabaseService.ts` - Supabase integration
- **Assignment Card**: `src/components/resources/AssignmentCard.tsx` - Drag/drop logic
- **Color System**: `src/utils/colorSystem.ts` - Resource colors and styles

## Business Rules
- Equipment MUST have operators (safety requirement)
- Trucks MUST have drivers (automatically attached when truck assigned to job)
- Pavers can have up to 2 screwmen (button shows for 1st, 2nd requires manual drag for special cases)
- Milling machines can have 1 groundman
- Resources can work multiple shifts (visual indicators for conflicts)
- Resource availability is date-specific (only shows as unavailable on actual assignment dates)

## Development Commands
```bash
npm install          # Install dependencies
npm run dev         # Start development server (port 5173)
npm run build       # Production build
npm test            # Run tests
```

## Environment Variables
```env
VITE_SUPABASE_URL=https://eqbgcfdoyndocuomntdx.supabase.co
VITE_SUPABASE_ANON_KEY=[key]
```

## Testing Notes
When testing drag and drop:
1. Check browser console for debug logs (🚀 = optimistic updates)
2. Verify immediate UI updates without manual refresh
3. Test attachment by dropping operators on yellow equipment cards
4. Test removal by dragging assignments off jobs
5. Test moving by dragging between different jobs

## Recent Fixes Summary

### Week View Data Loading Fix (2025-09-02)
Fixed an issue where navigating to "last week" only showed jobs for one day instead of the entire week.

- **Problem**: Week view only displayed jobs for one day when navigating between weeks
- **Root Cause**: Race condition between WeekViewCompact filtering jobs and SchedulerContext loading new week data
- **Solution**: Synchronized WeekViewCompact with SchedulerContext loading state
- **Files Modified**: `src/components/board/WeekViewCompact.tsx`

### Resource Availability Fix (2025-09-02)
Fixed resource sidebar showing equipment/personnel as "available" even when assigned to jobs on other dates.

- **Problem**: Resources showed as available even when assigned to jobs on different dates
- **Root Cause**: Sidebar displayed all resources instead of filtering out assigned ones
- **Solution**: Updated Sidebar to only show truly unassigned resources across all dates
- **Files Modified**: `src/components/layout/Sidebar.tsx`

### Data Reloading with Date Filtering (2025-09-02)
Fixed issue where creating jobs or other data operations would load all jobs instead of maintaining date filters.

- **Problem**: After creating a job on a specific day, all jobs would load instead of maintaining the selected date filter
- **Root Cause**: Multiple functions called `loadScheduleData(false)` without passing the current date
- **Solution**: Added `reloadDataForCurrentView()` helper function used consistently across all data operations
- **Files Modified**: `src/context/SchedulerContext.tsx`

### Refresh Button Date Filtering Fix (2025-09-02)
Fixed manual refresh button to respect current view's date filtering.

- **Problem**: Manual refresh button loaded all jobs regardless of current date filter
- **Root Cause**: `refreshData` function didn't pass current date to `loadScheduleData`
- **Solution**: Updated `refreshData` to maintain date filtering for day/week views
- **Files Modified**: `src/context/SchedulerContext.tsx`

### OpenStreetMap Integration (2025-09-02)
Replaced Google Maps with OpenStreetMap for location selection, removing API key requirements.

- **Problem**: Location selector used Google Maps API requiring API keys and configuration
- **Root Cause**: Dependency on Google Maps API across multiple components
- **Solution**: Complete replacement with Leaflet + OpenStreetMap + Nominatim geocoding
- **Files Modified**: 
  - `src/components/modals/LocationSelector.tsx` (complete rewrite)
  - `src/components/board/JobColumn.tsx` (location links)
  - `src/components/modals/SendSMSModal.tsx` (SMS location links)

### WeekViewCompact Infinite Loop Fix (2025-09-02)
Fixed critical rendering issue causing "Maximum update depth exceeded" error.

- **Problem**: WeekViewCompact was stuck in infinite re-render loop when calculating week dates
- **Root Cause**: `weekDates` calculation was recreating array on every render, causing `useEffect` to trigger infinitely
- **Solution**: Memoized `weekDates` calculation with `useMemo` hook, dependency only on `startDate`
- **Files Modified**: `src/components/board/WeekViewCompact.tsx:21-32`

### Equipment Color Standardization (2025-09-02)
Updated all equipment types to use consistent yellow background with black text.

- **Problem**: Equipment colors were inconsistent (yellow background with white text)
- **Solution**: Updated all equipment types to use `bg-yellow-500 text-black`
- **Files Modified**: `src/utils/colorSystem.ts`

### Date Synchronization Between Views (2025-09-02)
Fixed an issue where switching from month view to daily view after navigating to a previous month would not update the daily view to show the correct date context.

- **Problem**: When users navigate to previous month and switch to daily view, the dates weren't changing correctly
- **Root Cause**: Month navigation sets `selectedDate` to the 1st of the month, but daily view wasn't adjusting appropriately 
- **Solution**: Enhanced `setCurrentView` function in SchedulerContext with intelligent date adjustment logic
- **Files Modified**: `src/context/SchedulerContext.tsx` (lines 1388-1416)
- **Documentation Updated**: 
  - `docs/04-features/calendar-views.md` (added View Synchronization section)
  - `docs/01-architecture/state-management.md` (updated SchedulerContext documentation)

## Recently Fixed Issues

### Z-Index Management System (2025-09-02)
- ✅ **Centralized Modal Layering**: All modals now use ModalContext for proper z-index management
- ✅ **Fixed Modal Conflicts**: MasterSettingsModal and child modals now layer correctly
- ✅ **Standardized Constants**: Created `zIndexLayers.ts` for consistent UI layering
- ✅ **Eliminated Hardcoded Values**: Replaced 22+ hardcoded z-index values with dynamic system
- ✅ **Job Rules Consolidation**: Removed redundant Drop Zone Rules section, consolidated into Row Configuration

### Critical Rendering Issues
- ✅ **WeekViewCompact infinite loop**: Fixed "Maximum update depth exceeded" error (2025-09-02)
- ✅ **Week view data loading**: Fixed race condition showing only one day (2025-09-02)
- ✅ **Modal Parameter Error**: Fixed getZIndex() calls missing required ID parameter (2025-09-02)

### Data Loading & Synchronization
- ✅ **View synchronization**: Fixed date context when switching between views (2025-09-02)
- ✅ **Refresh button**: Now maintains current date filtering (2025-09-02)
- ✅ **Job creation**: Maintains date filtering after adding new jobs (2025-09-02)
- ✅ **Configuration persistence**: Job Rules Configuration now saves and loads properly (2025-09-02)

### Resource Management
- ✅ **Resource availability**: Now shows date-specific availability (2025-09-02)
- ✅ **Truck-driver assignments**: Immediate UI updates without manual refresh (2025-09-02)
- ✅ **Auto-driver attachment**: Drivers automatically attach when trucks assigned to jobs (2025-09-02)
- ✅ **Screwman button behavior**: Disappears after 1st attachment, 2nd requires manual drag (2025-09-02)
- ✅ **Resource Type Selection**: New unified modal for adding resource types to job configurations (2025-09-02)

### UI/UX Improvements
- ✅ **Equipment colors**: Standardized to yellow background with black text (2025-09-02)
- ✅ **OpenStreetMap integration**: Replaced Google Maps, removed API key requirements (2025-09-02)
- ✅ **Job Rules Interface**: Eliminated redundant sections, streamlined resource type management (2025-09-02)

## Z-Index Management Architecture

### Layer Hierarchy (2025-09-02)
```typescript
// src/utils/zIndexLayers.ts
Z_INDEX_LAYERS = {
  BASE: 0,              // Base application
  DROPDOWN: 10,         // Dropdown menus
  TOOLTIP: 20,          // Tooltips and hover elements
  CARD_BADGE: 30,       // Resource card indicators
  CARD_INDICATOR: 40,   // Time/status indicators
  OVERLAY: 50,          // QuickSelect overlays
  FLOATING_PANEL: 60,   // Floating UI panels
  DEBUG_PANEL: 9999,    // Debug panel
  MODAL_BASE: 1000,     // Modal starting point
  MODAL_INCREMENT: 10,  // Modal stacking increment
}
```

### Modal Stacking System
- **ModalContext**: Manages modal z-index dynamically based on opening order
- **Automatic Layering**: Each new modal gets `MODAL_BASE + (index * MODAL_INCREMENT)`
- **Child Modal Priority**: Child modals (like ResourceTypeSelectorModal) use higher z-index
- **Consistent Behavior**: All modals participate in the same stacking system

### Implementation Pattern
```typescript
// Modal component pattern:
const { getZIndex } = useModal();
style={{ zIndex: getZIndex('modal-id') }}

// Non-modal UI elements:
import { getZIndexClass } from '../../utils/zIndexLayers';
className={`${getZIndexClass('OVERLAY')}`}
```

## Known Issues
- None currently after recent fixes

## Database Schema
### Core Tables
- **resources**: Equipment, vehicles, personnel catalog
- **jobs**: Construction projects with shifts (day/night)
- **assignments**: Resource-to-job mappings with attachments
- **magnet_interaction_rules**: Auto-attachment business logic
- **drop_rules**: UI interaction permissions
- **job_row_configs**: Dynamic job layout configurations
- **truck_driver_assignments**: Vehicle-operator relationships

### Supabase Edge Functions
- `/assign-resource`: Complex assignment validation
- `/move-assignment-group`: Atomic group movements

### Real-time Subscriptions Required
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE resources;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
-- Add all other tables for real-time
```

## Resource Types
### Personnel
- `operator`, `driver`, `striper`, `foreman`, `laborer`, `privateDriver`

### Equipment (Yellow bg/black text)
- `skidsteer`, `paver`, `excavator`, `sweeper`, `millingMachine`
- `grader`, `dozer`, `payloader`, `roller`, `equipment`

### Vehicles
- `truck` (subtypes: 10W tag trailers, Trac with flowboy/dump-trailer)

## Job Organization
### Row Types
- `Forman`: Only foremen allowed
- `Equipment`: Equipment + operators
- `Crew`: All personnel types
- `Trucks`: Trucks + drivers
- `Sweeper`: Sweepers + operators
- `Tack`, `MPT`: Specialized rows

## Drag & Drop Behavior
### Desktop
- **Normal Drag**: Move assignment (removes from original)
- **Ctrl+Drag**: Create second shift (keeps original)
- **Drag off job**: Remove assignment (with optimistic update)

### Visual Indicators
- **Red Border**: Double shift (day + night)
- **Teal Border**: Multiple day jobs
- **Orange Border**: Night shift only
- **Green Time Badge**: On-site time
- **Blue Time Badge**: Yard departure time

## Testing Checklist
1. Drag/drop across devices
2. Magnet attachment rules
3. Time conflict detection
4. Multi-shift assignments
5. Real-time sync
6. Mobile touch interactions
7. Optimistic UI updates

## Component Patterns
```typescript
// Optimistic Update Pattern
setAssignments(prev => {
  // Update immediately
  return prev.map(/* ... */);
});
await DatabaseService.operation();
// Real-time subscription confirms

// Error Recovery Pattern
try {
  // Optimistic update
  await operation();
} catch (err) {
  await loadScheduleData(false); // Revert
}
```

## Architecture Guidelines
- Max 200 lines per component file
- Use optimistic updates for all database operations
- Maintain real-time subscriptions for live updates
- Follow existing color system patterns
- Always await async operations in drop handlers
- Use `.then()` for promise chains in drag/drop