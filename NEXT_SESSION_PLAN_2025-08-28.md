# BoardOS Next Session Plan & Documentation
**Last Updated**: 2025-08-27 22:00
**Project**: BoardOS Construction Scheduler
**Current Version**: 0.1.0

## 🎯 Executive Summary

BoardOS is a real-time drag-and-drop construction job scheduling application. The multi-day scheduling infrastructure is complete but awaiting database migration. Once applied, the system will support full week/month views with job templates and resource availability tracking.

## 📊 Current State Analysis

### System Health
```
Component           Status      Notes
─────────────────────────────────────────────
Dev Server          ✅ Running   Port 5175
Tests               ⚠️  81% Pass  56/304 failing
ESLint              ⚠️  357 Err   Down from 400+
Database Migration  ❌ Pending   Blocks multi-day
Week View           ✅ Ready     Awaiting migration
Performance         ✅ Good      11ms test runtime
Production Build    ✅ Ready     After migration
```

### Recent Session Achievements (2025-08-27)
1. **Test Infrastructure**: Fixed timeout issues (2min → 11sec)
2. **Code Quality**: Removed all console.logs, fixed critical ESLint
3. **Migration Tools**: Created automated checking scripts
4. **Week View**: Component complete, needs migration to function

## 🚀 PRIORITY ACTION ITEMS

### 🔴 CRITICAL - Do First (30 minutes)

#### 1. Apply Database Migration
```bash
# Step 1: Check current status
npm run check:migration

# Step 2: Go to Supabase Dashboard
https://supabase.com/dashboard/project/eqbgcfdoyndocuomntdx/sql/new

# Step 3: Copy and paste entire contents of:
supabase/migrations/20250826_add_schedule_support.sql

# Step 4: Click "Run" and wait for success

# Step 5: Verify migration
npm run test:migration
```

**What This Enables:**
- Jobs on different dates
- Week view functionality  
- Job copying between days
- Resource availability tracking
- Recurring job patterns

### 🟡 HIGH PRIORITY - Core Fixes (1 hour)

#### 2. Fix Failing Tests
```bash
# Current status: 248 passing, 56 failing

# Priority 1: DatabaseService tests (7 failures)
- Update mock implementations
- Fix getAllScheduleData expectations
- Correct transform method types

# Priority 2: Component tests (20+ failures)  
- AssignmentCard: Fix duplicate text queries
- JobRow: Update import paths
- SchedulerContext: Fix localStorage mocks

# Priority 3: Integration tests (2 failures)
- Real-time subscription mocks
- Comprehensive test assertions
```

#### 3. ESLint Cleanup
```bash
# Auto-fix what we can (saves ~100 errors)
npx eslint . --fix

# Manual fixes needed for:
- Replace 'any' types (222 instances)
- Remove unused variables (160 instances)  
- Fix empty destructuring patterns
- Convert require() to imports
```

### 🟢 MEDIUM PRIORITY - Features (1.5 hours)

#### 4. Complete Week View
```javascript
// After migration, implement:
- Job count badges per day
- Drag to copy between days
- Keyboard navigation (←→ for weeks)
- Today button highlight
- Weekend differentiation
```

#### 5. Job Templates System
```javascript
// New features to add:
- Save job as template
- Load template on any date
- Template library modal
- Quick apply templates
- Default crew configurations
```

#### 6. Resource Availability
```javascript
// Track resource status:
- Mark vacation/sick days
- Equipment maintenance windows
- Visual unavailable indicators
- Prevent invalid assignments
- Availability calendar view
```

## 📁 Project Structure Reference

```
boardOS/
├── src/
│   ├── components/
│   │   ├── board/
│   │   │   ├── WeekView.tsx       # Multi-day view (ready)
│   │   │   ├── JobColumn.tsx      # Single job display
│   │   │   └── JobRow.tsx         # Resource row (needs cleanup)
│   │   ├── debug/
│   │   │   └── DebugPanel.tsx     # Ctrl+Shift+D panel
│   │   └── resources/
│   │       └── AssignmentCard.tsx # Drag/drop cards
│   ├── context/
│   │   └── SchedulerContext.tsx   # Core state (needs optimization)
│   ├── services/
│   │   ├── DatabaseService.ts     # Supabase integration
│   │   └── ExportService.ts       # PDF generation
│   └── types/
│       └── index.ts               # TypeScript definitions
├── supabase/
│   └── migrations/
│       └── 20250826_add_schedule_support.sql  # MUST APPLY
├── apply-migration.js             # Migration checker
└── remove-console-logs.js        # Cleanup utility
```

## 🛠️ Development Workflow

### Start Development
```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Tests in watch mode  
npm run test:watch

# Terminal 3: Check migration status
npm run check:migration
```

### Before Committing
```bash
# 1. Fix auto-fixable issues
npx eslint . --fix

# 2. Remove console.logs
node remove-console-logs.js

# 3. Run tests
npm test

# 4. Check types
npx tsc --noEmit
```

### Debugging Tools
- **Ctrl+Shift+D**: Toggle debug panel
- **Chrome DevTools**: Network tab for Supabase calls
- **React DevTools**: Component tree inspection

## 🧪 Testing Strategy

### Current Test Status
```
Category            Passing  Failing  Coverage
───────────────────────────────────────────────
Unit Tests          198      36       68%
Integration Tests   45       18       45%
Component Tests     5        2        82%
──────────────────────────────────────────────
Total              248      56       65%
```

### Test Priorities
1. **Fix mock implementations** - Many tests fail due to outdated mocks
2. **Add Week View tests** - New component needs coverage
3. **Update integration tests** - Real-time subscriptions need proper mocking
4. **Add E2E tests** - Critical user journeys need automation

## 🔧 Performance Optimization Plan

### Current Issues
1. **HMR Page Reloads** - SchedulerContext causes full refreshes
2. **Re-render Storms** - Drag operations trigger unnecessary renders
3. **Bundle Size** - 2.3MB uncompressed (needs splitting)

### Optimization Tasks
```javascript
// 1. Memoize expensive operations
const memoizedJobs = useMemo(() => 
  sortJobsByPriority(jobs), [jobs]
);

// 2. Add React.memo to heavy components
export default React.memo(JobRow, (prev, next) => 
  prev.jobId === next.jobId
);

// 3. Implement virtual scrolling
import { FixedSizeList } from 'react-window';
```

## 📋 Session Checklist

### Pre-Session Setup
- [ ] Pull latest changes: `git pull`
- [ ] Install dependencies: `npm install`
- [ ] Check Node version: `node -v` (should be 18+)
- [ ] Verify .env file has Supabase keys
- [ ] Dev server runs: `npm run dev`

### During Session
- [ ] Apply database migration FIRST
- [ ] Run tests frequently: `npm test`
- [ ] Check ESLint after changes: `npm run lint`
- [ ] Use debug panel: Ctrl+Shift+D
- [ ] Test in both Chrome and Firefox

### Post-Session
- [ ] All tests passing (>80%)
- [ ] ESLint errors <100
- [ ] Create session summary
- [ ] Update CLAUDE.md with changes
- [ ] Commit with descriptive message

## 🎮 Keyboard Shortcuts

```
Action                  Shortcut           Context
──────────────────────────────────────────────────
Toggle Debug Panel      Ctrl+Shift+D       Global
Create Second Shift     Ctrl+Drag          Assignment
Remove Assignment       Double Click       Assignment
Copy Job               Alt+Drag           Week View
Navigate Weeks         ← →                Week View
Jump to Today          T                  Week View
Print Schedule         Ctrl+P             Global
Export PDF             Ctrl+E             Global
```

## 🚨 Known Issues & Workarounds

### Issue 1: Migration Not Applied
**Impact**: Week view shows all jobs on today
**Solution**: Apply migration via Supabase dashboard

### Issue 2: HMR Full Page Reload  
**Impact**: Lost component state during development
**Workaround**: Save frequently, use localStorage

### Issue 3: Test Timeouts
**Impact**: Tests hang on coverage generation
**Solution**: Use `npm test` (no coverage)

### Issue 4: Drag Ghost Image
**Impact**: Default browser drag image shows
**Solution**: Implement custom drag preview

## 📈 Success Metrics

### Session Success = All Green
- ✅ Database migration applied
- ✅ Week view shows jobs on correct dates  
- ✅ Can create jobs on future dates
- ✅ Can drag jobs between days
- ✅ Tests >80% passing
- ✅ ESLint errors <100
- ✅ No console.logs in production code

### Stretch Goals
- 🎯 Month view skeleton implemented
- 🎯 Job templates working
- 🎯 Resource availability tracking
- 🎯 Keyboard navigation complete
- 🎯 Performance optimizations done

## 💡 Quick Wins Available

### 5-Minute Fixes
1. Run ESLint auto-fix: `npx eslint . --fix` (fixes ~100 errors)
2. Remove console.logs: `node remove-console-logs.js`
3. Update test snapshots: `npm test -- -u`

### 15-Minute Improvements  
1. Add React.memo to JobRow and JobColumn
2. Fix import paths in test files
3. Add loading states to async operations
4. Implement error boundaries

### 30-Minute Features
1. Add keyboard navigation to Week View
2. Implement job count badges
3. Create template selector modal
4. Add resource filter sidebar

## 📝 Notes & Context

### Business Rules Reminders
- Equipment MUST have operators (safety requirement)
- Trucks MUST have drivers assigned
- Pavers can have max 2 screwmen
- Milling machines can have 1 groundman
- Jobs can be day shift, night shift, or both

### Technical Decisions Made
- Real-time updates via Supabase subscriptions
- Optimistic UI updates for instant feedback
- LocalStorage for draft preservation
- PDF generation client-side with jsPDF
- Drag-and-drop with react-dnd

### Future Considerations
- Authentication system (Supabase Auth ready)
- Team collaboration (real-time cursors)
- Mobile app (React Native compatible)
- Offline support (service worker + IndexedDB)
- Analytics dashboard (job completion rates)

## 🎉 End State Vision

By end of session, BoardOS should be a production-ready scheduling system with:
- Full multi-day/week/month scheduling
- Drag-and-drop between any days
- Job templates for common configurations  
- Resource availability tracking
- Clean, maintainable codebase
- Comprehensive test coverage
- Professional documentation
- Deployment-ready build

**The goal**: A tool construction companies will actually want to use daily!

## 🤝 Handoff Notes

If someone else continues this work:
1. **MUST DO FIRST**: Apply database migration
2. **Check**: `CLAUDE.md` for project conventions
3. **Read**: `DATABASE_MIGRATION_INSTRUCTIONS.md` 
4. **Review**: `SESSION_SUMMARY_2025-08-27.md`
5. **Test**: Everything works with `npm run dev`

---

**Ready to build? Let's make BoardOS amazing! 🚀**