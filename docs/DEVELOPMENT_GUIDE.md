# BoardOS Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Run development server
npm run dev

# Run tests
npm test
```

## Development Workflow

### 1. Database Changes

When modifying the database:
1. Make changes in Supabase dashboard
2. Update TypeScript types in `src/types/`
3. Update `DatabaseService.ts` if needed
4. Add transform methods for new tables
5. Add subscription handlers in `SchedulerContext.tsx`

### 2. Adding New Features

#### Component Creation
```typescript
// src/components/category/NewComponent.tsx
import React from 'react';
import { useScheduler } from '../../context/SchedulerContext';

const NewComponent: React.FC = () => {
  const { data, actions } = useScheduler();
  // Component logic
};

export default NewComponent;
```

#### Add Tests
```typescript
// src/components/category/__tests__/NewComponent.test.tsx
import { render, screen } from '@testing-library/react';
import NewComponent from '../NewComponent';

describe('NewComponent', () => {
  it('renders correctly', () => {
    render(<NewComponent />);
    // Test assertions
  });
});
```

### 3. Real-time Subscriptions

#### Enable for New Table
```sql
-- In Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE your_table_name;
```

#### Add Subscription Handler
```typescript
// In DatabaseService.ts
if (callbacks.onYourTableChange) {
  const channel = supabase
    .channel('your-table-changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'your_table' 
    }, callbacks.onYourTableChange)
    .subscribe();
  channels.push(channel);
}
```

#### Handle in Context
```typescript
// In SchedulerContext.tsx
onYourTableChange: (payload) => {
  logger.info('📡 Your table change:', payload);
  if (payload.eventType === 'INSERT') {
    setYourData(prev => [...prev, transformData(payload.new)]);
  }
  // Handle UPDATE and DELETE
}
```

## Code Patterns

### State Management

Use context for shared state:
```typescript
const { 
  jobs,          // Read state
  addJob,        // Actions
  isLoading,     // UI state
  refreshData    // Utilities
} = useScheduler();
```

### Optimistic Updates

Update UI immediately, sync in background:
```typescript
// 1. Update local state immediately
setAssignments(prev => [...prev, newAssignment]);

// 2. Persist to database
await DatabaseService.createAssignment(newAssignment);

// 3. Background refresh for consistency
setTimeout(() => loadScheduleData(false), 1000);
```

### Error Handling

Always wrap async operations:
```typescript
try {
  const result = await DatabaseService.operation();
  logger.info('Success:', result);
} catch (err) {
  logger.error('Error:', err);
  setError(err.message);
  throw err; // Re-throw if needed
}
```

## Testing Guidelines

### Unit Tests
- Test pure functions in isolation
- Mock external dependencies
- Focus on business logic

### Component Tests
- Use React Testing Library
- Test user interactions
- Verify rendered output
- Mock contexts when needed

### Integration Tests
- Test component interactions
- Verify data flow
- Test real scenarios

## Debugging

### Console Logging

Structured logging with emojis:
```typescript
logger.info('✅ Operation successful');
logger.debug('🔍 Debug info:', data);
logger.error('❌ Error occurred:', error);
logger.info('📡 Real-time event:', payload);
logger.info('🔄 Refreshing data...');
```

### Browser DevTools

1. **Network Tab**: Monitor Supabase requests
2. **Console**: Check for subscription events
3. **React DevTools**: Inspect component state
4. **Redux DevTools**: Track context changes

### Common Issues

#### UI Not Updating
1. Check console for subscription logs
2. Verify realtime is enabled: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`
3. Use manual refresh button
4. Check network connection

#### Drag and Drop Not Working
1. Check console for drop rejection logs
2. Verify drop rules in database
3. Check if job is finalized
4. Ensure resources meet requirements

## Performance

### Optimization Tips

1. **Batch Operations**
   ```typescript
   // Good - single database call
   await Promise.all(items.map(item => process(item)));
   
   // Bad - sequential calls
   for (const item of items) {
     await process(item);
   }
   ```

2. **Memoization**
   ```typescript
   const expensiveValue = useMemo(() => 
     computeExpensive(deps), [deps]
   );
   ```

3. **Background Updates**
   ```typescript
   loadScheduleData(false); // No loading state
   ```

## Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables
Required for production:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never commit `.env` files!

### Database Migrations

1. Test in development
2. Create migration file
3. Apply to staging
4. Test thoroughly
5. Apply to production

## Best Practices

### TypeScript
- Use strict mode
- Define all types
- Avoid `any` type
- Prefer interfaces over types for objects

### React
- Functional components only
- Custom hooks for logic
- Memoize expensive operations
- Clean up effects

### Testing
- Test behavior, not implementation
- Write tests before fixing bugs
- Maintain high coverage
- Keep tests simple and focused

### Git Workflow
- Branch from main
- Meaningful commit messages
- PR with description
- Code review required
- Squash merge to main

## Resources

- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)

## Support

- Check `CHANGELOG.md` for recent changes
- Review `README.md` for setup
- Search existing issues
- Ask in development channel
- Create detailed bug reports