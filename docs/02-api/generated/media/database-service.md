---
title: DatabaseService API
category: api
tags: [database, service, supabase, crud]
related: [/02-api/export-service.md, /02-api/duration-estimation-service.md]
last-updated: 2025-08-29
---

# DatabaseService API

## Quick Answer
DatabaseService is the primary data access layer providing complete CRUD operations, real-time subscriptions, and type-safe database interactions for all BoardOS entities.

## Overview

The DatabaseService class serves as the central database abstraction layer, handling all interactions with the Supabase PostgreSQL database. It provides type-safe operations for resources, jobs, assignments, and business rules with full real-time synchronization support.

## Core Features

- **Type-Safe Operations**: Complete TypeScript coverage with automatic transformations
- **Real-Time Subscriptions**: Live updates via Supabase channels
- **Optimistic Updates**: Immediate UI feedback with eventual consistency
- **Transaction Support**: Atomic operations for complex business logic
- **Audit Trail**: Comprehensive logging and change tracking
- **Multi-Tenant Support**: Organization-level data isolation

## Database Entity Operations

### Resource Management

```typescript
// Create new resource (employee or equipment)
const resource = await DatabaseService.createResource({
  type: 'operator',
  classType: 'employee',
  name: 'John Smith',
  identifier: 'JS001',
  onSite: false
});

// Update existing resource
await DatabaseService.updateResource({
  id: 'resource-uuid',
  name: 'John Smith Jr.',
  identifier: 'JS001-2',
  location: 'Main Yard'
});

// Delete resource
await DatabaseService.deleteResource('resource-uuid');
```

### Job Management

```typescript
// Create new job with schedule date
const job = await DatabaseService.createJob({
  name: 'Highway 101 Repaving',
  number: 'HW101-2025',
  type: 'paving',
  shift: 'day',
  location: {
    address: '123 Highway 101',
    coordinates: { lat: 40.7128, lng: -74.0060 }
  },
  plants: ['Central Plant', 'North Plant']
});

// Get jobs by date range
const jobs = await DatabaseService.getJobsByDateRange(
  new Date('2025-08-29'),
  new Date('2025-09-05')
);

// Update job date with audit logging
await DatabaseService.updateJobDate(
  'job-uuid',
  new Date('2025-09-01'),
  'user-uuid'
);
```

### Assignment Operations

```typescript
// Assign resource to job
const assignment = await DatabaseService.assignResource(
  'resource-uuid',
  'job-uuid',
  'Equipment'
);

// Create assignment with attachments
const assignment = await DatabaseService.createAssignment({
  resourceId: 'operator-uuid',
  jobId: 'job-uuid',
  row: 'Equipment',
  position: 0,
  attachedTo: 'equipment-assignment-uuid',
  timeSlot: {
    startTime: '07:00',
    onSiteTime: '07:30'
  }
});

// Get assignments by resource
const assignments = await DatabaseService.getAssignmentsByResourceId('resource-uuid');

// Attach resources (magnetic system)
await DatabaseService.attachResources(
  'source-assignment-uuid',
  'target-assignment-uuid'
);
```

## Data Transformation Layer

### Type Transformations

The service automatically transforms between database schema and application types:

```typescript
// Database → Application transformations
static transformDbResource(dbResource: DbResource): Resource {
  return {
    id: dbResource.id,
    type: dbResource.type as ResourceType,
    classType: dbResource.class_type,
    name: dbResource.name,
    identifier: dbResource.identifier || undefined,
    onSite: dbResource.on_site
  };
}

// Application → Database transformations (automatic)
const dbAssignment = {
  resource_id: assignment.resourceId,
  job_id: assignment.jobId,
  row_type: assignment.row,
  attached_to_assignment_id: assignment.attachedTo
};
```

### Employee and Equipment Specialized Operations

```typescript
// Employee-specific operations
const employee = await DatabaseService.createEmployee({
  type: 'operator',
  name: 'Jane Doe',
  employeeId: 'JD001',
  phoneNumber: '555-0123',
  certifications: ['CDL', 'Heavy Equipment'],
  skills: ['Excavator', 'Dozer'],
  isActive: true
});

// Equipment-specific operations  
const equipment = await DatabaseService.createEquipment({
  type: 'excavator',
  name: 'CAT 320',
  identifier: 'EX001',
  model: '320 GC',
  make: 'Caterpillar',
  vin: '1234567890',
  engineHours: 1250,
  isOperational: true
});
```

## Real-Time Subscriptions

### Multi-Channel Subscription Setup

```typescript
const unsubscribe = DatabaseService.subscribeToScheduleChanges({
  onResourceChange: (payload) => {
    console.log('Resource updated:', payload);
    updateResourcesState(payload);
  },
  
  onJobChange: (payload) => {
    console.log('Job updated:', payload);
    updateJobsState(payload);
  },
  
  onAssignmentChange: (payload) => {
    console.log('Assignment updated:', payload);
    updateAssignmentsState(payload);
  },
  
  onRuleChange: (payload) => {
    updateMagnetRules(payload);
  },
  
  onDropRuleChange: (payload) => {
    updateDropRules(payload);
  }
});

// Cleanup subscriptions
unsubscribe();
```

### Real-Time Event Types

| Event Type | Trigger | Payload |
|------------|---------|---------|
| `INSERT` | New record created | `{ new: Record, old: null }` |
| `UPDATE` | Record modified | `{ new: Record, old: OldRecord }` |
| `DELETE` | Record removed | `{ new: null, old: Record }` |

## Business Rules Management

### Magnet Interaction Rules

```typescript
// Update attachment rules
await DatabaseService.updateMagnetRule({
  sourceType: 'operator',
  targetType: 'excavator',
  canAttach: true,
  isRequired: true,
  maxCount: 1
});

// Get all magnet rules
const rules = await DatabaseService.getMagnetInteractionRules();
```

### Drop Rules Configuration

```typescript
// Configure allowed resource types per row
await DatabaseService.updateDropRule('Equipment', [
  'excavator', 'dozer', 'skidsteer'
]);

// Get drop rules
const dropRules = await DatabaseService.getDropRules();
```

## Advanced Features

### Job Row Configurations

```typescript
// Dynamic job layout configuration
await DatabaseService.updateJobRowConfig({
  jobId: 'job-uuid',
  rowType: 'Equipment',
  isSplit: true,
  boxes: [
    { id: 'box1', type: 'primary' },
    { id: 'box2', type: 'secondary' }
  ]
});
```

### Truck-Driver Assignments

```typescript
// Permanent vehicle-operator relationships
await DatabaseService.updateTruckDriverAssignment(
  'truck-uuid',
  'driver-uuid'
);

// Get all truck assignments
const assignments = await DatabaseService.getTruckDriverAssignments();
// Returns: { 'truck-uuid': 'driver-uuid' }
```

### Audit Trail

```typescript
// Get audit history
const auditTrail = await DatabaseService.getAuditTrail(
  'job',           // Entity type
  'job-uuid',      // Entity ID
  50               // Limit
);

// Automatic audit logging for job date changes
await DatabaseService.updateJobDate(jobId, newDate, userId);
// Creates audit entry automatically
```

## Error Handling and Logging

### Comprehensive Error Management

```typescript
try {
  const assignment = await DatabaseService.createAssignment(data);
} catch (error) {
  // Automatic error logging via logger utility
  logger.error('Assignment creation failed:', error);
  
  // Structured error handling
  if (error.code === 'PGRST116') {
    // Record not found
  } else if (error.code === '23505') {
    // Unique constraint violation
  }
}
```

### Debug Logging

```typescript
// Automatic debug logging for data transformations
logger.debug('Raw resources data from DB:', resourcesResult.data);
logger.debug('Transformed data:', {
  resourcesCount: resources.length,
  employeesCount: employees.length,
  equipmentCount: equipment.length
});
```

## Performance Optimizations

### Batch Operations

```typescript
// Efficient bulk data loading
const scheduleData = await DatabaseService.getAllScheduleData();
// Single call fetches: resources, jobs, assignments, rules, drop rules
```

### Optimized Queries

```typescript
// Date-aware job queries
const todayJobs = await DatabaseService.getJobsByDate(new Date());
// Includes legacy jobs (null schedule_date) for today only

const futureJobs = await DatabaseService.getJobsByDate(futureDate);
// Only jobs specifically scheduled for that date
```

## Integration Patterns

### Context Integration

```typescript
// Typical usage in React Context
const SchedulerContext = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  // Optimistic update pattern
  const assignResource = async (resourceId: string, jobId: string) => {
    // 1. Immediate UI update
    const tempAssignment = { id: 'temp', resourceId, jobId, row: 'Equipment' };
    setAssignments(prev => [...prev, tempAssignment]);
    
    // 2. Database operation
    try {
      const realAssignment = await DatabaseService.assignResource(resourceId, jobId, 'Equipment');
      setAssignments(prev => 
        prev.map(a => a.id === 'temp' ? realAssignment : a)
      );
    } catch (error) {
      // 3. Rollback on error
      setAssignments(prev => prev.filter(a => a.id !== 'temp'));
      throw error;
    }
  };
};
```

## Security Features

### Row Level Security

```sql
-- Automatic organization isolation
CREATE POLICY "org_jobs_policy" ON jobs
FOR ALL USING (organization_id = auth.organization_id());
```

### Type Safety

```typescript
// Compile-time type checking
const assignment: Assignment = {
  id: 'uuid',
  resourceId: 'resource-uuid',
  jobId: 'job-uuid',
  row: 'InvalidRow' // ❌ TypeScript error
};
```

## Migration and Compatibility

### Legacy Data Support

```typescript
// Handles both new and legacy job queries
const getJobsByDate = (date: Date) => {
  const today = new Date().toISOString().split('T')[0];
  const dateStr = date.toISOString().split('T')[0];
  
  if (dateStr === today) {
    // Include legacy jobs (null schedule_date) for today
    return supabase.from('jobs')
      .select('*')
      .or(`schedule_date.eq.${dateStr},schedule_date.is.null`);
  } else {
    // Specific date only
    return supabase.from('jobs')
      .select('*')
      .eq('schedule_date', dateStr);
  }
};
```

## API Reference Summary

### Core Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `getAllScheduleData()` | Load complete schedule state | `Promise<ScheduleData>` |
| `createResource(data)` | Create new resource | `Promise<Resource>` |
| `assignResource(resourceId, jobId, row)` | Assign resource to job | `Promise<Assignment>` |
| `subscribeToScheduleChanges(callbacks)` | Real-time subscriptions | `UnsubscribeFunction` |
| `updateJobDate(jobId, date, userId)` | Change job date with audit | `Promise<void>` |

### Transformation Methods

| Method | Purpose |
|--------|---------|
| `transformDbResource()` | DB → App resource type |
| `transformDbJob()` | DB → App job type |
| `transformDbAssignment()` | DB → App assignment type |

### Business Logic Methods

| Method | Purpose |
|--------|---------|
| `updateMagnetRule()` | Configure attachment rules |
| `updateDropRule()` | Configure drop permissions |
| `attachResources()` | Create resource attachments |

This comprehensive DatabaseService provides the foundation for all data operations in BoardOS, ensuring type safety, real-time synchronization, and robust error handling across the entire application.