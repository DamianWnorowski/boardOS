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

## Recent Fixes (2025-08-29)

### Latest Changes
- 8713f1f - test: update test coverage (4 seconds ago)
- 036c3d7 - fix: resolve issues in multiple areas (4 minutes ago)
- 6bba52f - fix: load full week of jobs when in week view (8 minutes ago)
- 09ba224 - test: validate git hooks for documentation system (4 hours ago)
- eeee0ac - Add: Complete monthly calendar view with intelligent job duration estimation and available jobs management (8 hours ago)

### Project Statistics
- **Total Files**: 117
- **Components**: 74
- **Hooks**: 3
- **Contexts**: 9
- **Services**: 5
- **Lines of Code**: 33,051

### Critical File Updates
- **src/context/SchedulerContext.tsx**: Updated 8 minutes ago
- **src/services/DatabaseService.ts**: Updated 4 hours ago
- **src/components/resources/AssignmentCard.tsx**: Updated 8 hours ago
- **src/utils/colorSystem.ts**: Updated 2 days ago

### Latest Changes
- 036c3d7 - fix: resolve issues in multiple areas (3 seconds ago)
- 6bba52f - fix: load full week of jobs when in week view (4 minutes ago)
- 09ba224 - test: validate git hooks for documentation system (4 hours ago)
- eeee0ac - Add: Complete monthly calendar view with intelligent job duration estimation and available jobs management (8 hours ago)
- 0aa1084 - Fix: Major test stabilization improvements (9 hours ago)

### Project Statistics
- **Total Files**: 117
- **Components**: 74
- **Hooks**: 3
- **Contexts**: 9
- **Services**: 5
- **Lines of Code**: 33,051

### Critical File Updates
- **src/context/SchedulerContext.tsx**: Updated 4 minutes ago
- **src/services/DatabaseService.ts**: Updated 4 hours ago
- **src/components/resources/AssignmentCard.tsx**: Updated 8 hours ago
- **src/utils/colorSystem.ts**: Updated 2 days ago

### Latest Changes
- 6bba52f - fix: load full week of jobs when in week view (4 seconds ago)
- 09ba224 - test: validate git hooks for documentation system (4 hours ago)
- eeee0ac - Add: Complete monthly calendar view with intelligent job duration estimation and available jobs management (8 hours ago)
- 0aa1084 - Fix: Major test stabilization improvements (9 hours ago)
- b2d1cc8 - Add comprehensive shift+drag visual indicators and e2e testing (33 hours ago)

### Project Statistics
- **Total Files**: 117
- **Components**: 74
- **Hooks**: 3
- **Contexts**: 9
- **Services**: 5
- **Lines of Code**: 33,051

### Critical File Updates
- **src/context/SchedulerContext.tsx**: Updated 4 seconds ago
- **src/services/DatabaseService.ts**: Updated 4 hours ago
- **src/components/resources/AssignmentCard.tsx**: Updated 8 hours ago
- **src/utils/colorSystem.ts**: Updated 2 days ago

### 2025-08-29 - Code update
- Modified: `src/context/SchedulerContext.tsx`

### 1. Equipment Colors
- All equipment types now use yellow background (`bg-yellow-500`) with black text
- Border color: `border-yellow-700`
- Located in: `src/utils/colorSystem.ts`

### 2. Optimistic UI Updates
Added immediate UI updates for:
- **Attachment operations**: `attachResources()`, `assignResourceWithAttachment()`
- **Removal operations**: `removeAssignment()` with immediate visual feedback
- **Move operations**: `moveAssignmentGroup()` for dragging between jobs
- All in: `src/context/SchedulerContext.tsx`

### 3. Debug UI Removal
- MobileDragLayer now only renders on mobile devices
- Fixed in: `src/App.tsx` (line 59)

### 4. Drop Handler Fixes
- Fixed async handling in `AssignmentCard.tsx` drop operations
- Added `.then()` callbacks for proper promise handling
- Added error catching with console logging

## Important Files
- **Main Context**: `src/context/SchedulerContext.tsx` - Core state management
- **Database Service**: `src/services/DatabaseService.ts` - Supabase integration
- **Assignment Card**: `src/components/resources/AssignmentCard.tsx` - Drag/drop logic
- **Color System**: `src/utils/colorSystem.ts` - Resource colors and styles

## Business Rules
- Equipment MUST have operators (safety requirement)
- Trucks MUST have drivers
- Pavers can have up to 2 screwmen
- Milling machines can have 1 groundman
- Resources can work multiple shifts (visual indicators for conflicts)

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