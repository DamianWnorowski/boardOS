# Changelog

All notable changes to BoardOS will be documented in this file.

## [1.1.0] - 2025-01-25

### Added
- **Real-time Database Subscriptions**
  - Complete WebSocket integration for all tables
  - Automatic UI updates when database changes
  - Subscription handlers for resources, jobs, assignments, rules, and configs
  - Console logging for debugging subscription events

- **Optimistic UI Updates**
  - Immediate visual feedback on user actions
  - Background sync ensures data consistency
  - No waiting for server confirmation

- **Manual Refresh Button**
  - Blue refresh button in top-right corner
  - Forces data synchronization
  - Shows spinning animation during refresh

- **Enhanced Test Coverage**
  - Added 10 new test files
  - Coverage increased to ~70% of components
  - Tests for: ruleValidator, attachmentRules, timeConflictDetection, DatabaseService, contexts, and components

### Changed
- **UI Refresh Behavior**
  - Eliminated screen blanking during data refresh
  - Loading screen only shows on initial page load
  - Background data fetching without UI interruption
  - Separate `loadScheduleData(showLoading)` parameter

- **Drop Zone Hit Boxes**
  - Expanded drop targets to entire row area
  - Can now drop magnets anywhere within a row
  - Improved drag-and-drop user experience

### Fixed
- **Database Permission Issues**
  - Created SQL scripts for RLS management
  - Fixed SQL syntax errors in RLS disable script
  - Added comprehensive setup documentation

- **Test Failures**
  - Fixed logical issues in time calculation tests
  - Corrected mock object structures
  - Added missing context providers
  - Reduced test failures from 93 to 62

### Technical Details
- **Files Modified**
  - `SchedulerContext.tsx`: Added subscription handlers and background refresh
  - `DatabaseService.ts`: Enhanced with transform methods and logging
  - `JobRow.tsx`: Expanded drop zone to full row area
  - `App.tsx`: Added refresh button and state management
  - `SchedulerLayout.tsx` & `MobileSchedulerLayout.tsx`: Prevent blanking on refresh

- **New SQL Scripts**
  - `scripts/sql/enable_realtime.sql`: Enable Supabase realtime for all tables
  - `scripts/sql/disable_rls_fixed.sql`: Corrected RLS disable script

## [1.0.0] - 2025-01-24

### Initial Release
- Core scheduling functionality
- Drag-and-drop interface
- Magnetic resource attachments
- Job and resource management
- Mobile and desktop support
- Supabase integration
- Basic test suite

## Development Roadmap

### Planned Features
- [ ] Offline mode with sync
- [ ] Advanced filtering and search
- [ ] Bulk operations
- [ ] Export/Import functionality
- [ ] Performance optimizations
- [ ] Extended mobile features
- [ ] Audit logging UI
- [ ] User authentication
- [ ] Multi-tenancy support
- [ ] API documentation

### Known Issues
- Some test failures in complex component tests (JobRow, AssignmentCard)
- Real-time may require manual enable in Supabase dashboard
- Mobile drag sometimes requires refresh after drop

### Migration Notes

#### From 1.0.0 to 1.1.0
1. Run `scripts/sql/enable_realtime.sql` in Supabase dashboard
2. Update environment variables if needed
3. Clear browser cache for best performance
4. No database schema changes required