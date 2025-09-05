---
title: API Reference
category: api
tags: [api, reference, typescript]
related: [/01-architecture/overview.md, /03-components/index.md]
last-updated: 2025-01-28
---

# API Reference

## Quick Answer
BoardOS API consists of database services, React contexts, custom hooks, and Supabase edge functions. All APIs are TypeScript-enabled with comprehensive type definitions.

## Core APIs

### [Database Service](database-service.md)
Primary data access layer for all database operations.
```typescript
import { DatabaseService } from '@/services/DatabaseService';
await DatabaseService.assignResource(resourceId, jobId, rowType);
```

### [React Contexts](contexts.md) 
Application state management through React Context API.
```typescript
import { useScheduler } from '@/context/SchedulerContext';
const { jobs, resources, assignments } = useScheduler();
```

### [Custom Hooks](hooks.md)
Reusable React hooks for common operations.
```typescript
import { useMagnet } from '@/hooks/useMagnet';
const { startDrag, assignToJob } = useMagnet(magnetId);
```

### [Supabase Edge Functions](supabase-edge.md)
Server-side functions for complex operations.
```typescript
const { data } = await supabase.functions.invoke('assign-resource', {
  body: { resourceId, jobId, rowType }
});
```

## Generated Documentation

The complete TypeScript API documentation is available at:
- **[Generated API Docs](generated/)** - Auto-generated from source code

## API Categories

| Category | Count | Documentation |
|----------|-------|---------------|
| Contexts | 5 | [contexts.md](contexts.md) |
| Hooks | 12 | [hooks.md](hooks.md) |
| Services | 3 | [database-service.md](database-service.md) |
| Edge Functions | 2 | [supabase-edge.md](supabase-edge.md) |

---

*API documentation is automatically generated from source code and kept in sync with changes.*