---
title: Business Rules & Validation
category: features
tags: [business-rules, validation, constraints, scheduling]
related: [/04-features/magnet-system.md, /01-architecture/database-schema.md]
last-updated: 2025-08-29
---

# Business Rules & Validation

## Quick Answer
BoardOS enforces construction industry safety and operational rules through automated validation. Key rules include mandatory operator-equipment pairing, driver-truck assignments, shift conflict detection, and resource availability constraints.

## Core Business Rules

### 1. Equipment-Operator Requirements

#### Mandatory Operator Assignment
All equipment MUST have an operator for safety compliance.

```typescript
// Equipment types requiring operators
const EQUIPMENT_REQUIRING_OPERATOR = [
  'excavator',
  'paver', 
  'millingMachine',
  'grader',
  'dozer',
  'payloader',
  'roller',
  'sweeper',
  'skidsteer'
];

// Validation function
const validateEquipmentHasOperator = (
  equipment: Resource,
  assignments: Assignment[]
): ValidationResult => {
  if (!EQUIPMENT_REQUIRING_OPERATOR.includes(equipment.type)) {
    return { valid: true };
  }
  
  const hasOperator = assignments.some(a => 
    a.attachedTo === equipment.id && 
    resources.find(r => r.id === a.resourceId)?.type === 'operator'
  );
  
  if (!hasOperator) {
    return {
      valid: false,
      error: `${equipment.name} requires an operator for safety compliance`
    };
  }
  
  return { valid: true };
};
```

#### Operator Certification Requirements
Operators must be certified for specific equipment types.

```typescript
const OPERATOR_CERTIFICATIONS = {
  paver: ['paver-cert', 'heavy-equipment'],
  millingMachine: ['milling-cert', 'heavy-equipment'],
  excavator: ['excavator-cert', 'heavy-equipment'],
  grader: ['grader-cert', 'cdl-class-a']
};

const validateOperatorCertification = (
  operator: Employee,
  equipment: Equipment
): boolean => {
  const requiredCerts = OPERATOR_CERTIFICATIONS[equipment.type] || [];
  return requiredCerts.some(cert => 
    operator.certifications?.includes(cert)
  );
};
```

### 2. Vehicle-Driver Rules

#### Truck Driver Assignment
All trucks MUST have a qualified driver.

```typescript
// Driver requirements by vehicle type
const VEHICLE_DRIVER_REQUIREMENTS = {
  truck: {
    requiredType: 'driver',
    requiredLicense: 'cdl-class-a',
    maxHoursPerDay: 11 // DOT regulations
  },
  '10W': {
    requiredType: 'driver',
    requiredLicense: 'cdl-class-a',
    requiredEndorsements: ['tanker']
  },
  tracTrailer: {
    requiredType: 'driver',
    requiredLicense: 'cdl-class-a',
    requiredEndorsements: ['doubles', 'triples']
  }
};

const validateTruckDriver = (
  truck: Resource,
  driver: Employee
): ValidationResult => {
  const requirements = VEHICLE_DRIVER_REQUIREMENTS[truck.classType || truck.type];
  
  if (!requirements) {
    return { valid: true };
  }
  
  // Check license
  if (!driver.certifications?.includes(requirements.requiredLicense)) {
    return {
      valid: false,
      error: `Driver ${driver.name} lacks required ${requirements.requiredLicense}`
    };
  }
  
  // Check endorsements
  const missingEndorsements = requirements.requiredEndorsements?.filter(
    e => !driver.certifications?.includes(e)
  );
  
  if (missingEndorsements?.length) {
    return {
      valid: false,
      error: `Driver lacks endorsements: ${missingEndorsements.join(', ')}`
    };
  }
  
  return { valid: true };
};
```

### 3. Crew Attachment Limits

#### Paver Screwman Rules
Pavers can have 0-2 screwmen attached.

```typescript
const PAVER_CREW_LIMITS = {
  screwman: { min: 0, max: 2 },
  operator: { min: 1, max: 1 }
};

const validatePaverCrew = (
  paver: Resource,
  attachments: Assignment[]
): ValidationResult => {
  const screwmen = attachments.filter(a => {
    const resource = resources.find(r => r.id === a.resourceId);
    return resource?.type === 'screwman';
  });
  
  if (screwmen.length > PAVER_CREW_LIMITS.screwman.max) {
    return {
      valid: false,
      error: `Paver can have maximum ${PAVER_CREW_LIMITS.screwman.max} screwmen`
    };
  }
  
  return { valid: true };
};
```

#### Milling Machine Groundman Rules
Milling machines can have 0-1 groundman attached.

```typescript
const MILLING_CREW_LIMITS = {
  groundman: { min: 0, max: 1 },
  operator: { min: 1, max: 1 }
};

const validateMillingCrew = (
  millingMachine: Resource,
  attachments: Assignment[]
): ValidationResult => {
  const groundmen = attachments.filter(a => {
    const resource = resources.find(r => r.id === a.resourceId);
    return resource?.type === 'laborer' && a.role === 'groundman';
  });
  
  if (groundmen.length > MILLING_CREW_LIMITS.groundman.max) {
    return {
      valid: false,
      error: `Milling machine can have maximum 1 groundman`
    };
  }
  
  return { valid: true };
};
```

### 4. Shift & Scheduling Rules

#### Double Shift Detection
Resources can work multiple shifts with visual warnings.

```typescript
interface ShiftAssignment {
  resourceId: string;
  date: Date;
  shift: 'day' | 'night';
  jobId: string;
}

const detectShiftConflicts = (
  assignments: ShiftAssignment[]
): ConflictResult[] => {
  const conflicts: ConflictResult[] = [];
  const resourceShifts = new Map<string, ShiftAssignment[]>();
  
  // Group by resource and date
  assignments.forEach(assignment => {
    const key = `${assignment.resourceId}-${assignment.date.toDateString()}`;
    if (!resourceShifts.has(key)) {
      resourceShifts.set(key, []);
    }
    resourceShifts.get(key)!.push(assignment);
  });
  
  // Check for conflicts
  resourceShifts.forEach((shifts, key) => {
    if (shifts.length > 1) {
      const [resourceId, date] = key.split('-');
      
      // Double shift (day + night)
      const hasDay = shifts.some(s => s.shift === 'day');
      const hasNight = shifts.some(s => s.shift === 'night');
      
      if (hasDay && hasNight) {
        conflicts.push({
          type: 'double-shift',
          resourceId,
          date,
          severity: 'warning',
          message: 'Resource scheduled for both day and night shifts'
        });
      }
      
      // Multiple jobs same shift
      const dayJobs = shifts.filter(s => s.shift === 'day');
      if (dayJobs.length > 1) {
        conflicts.push({
          type: 'multi-job',
          resourceId,
          date,
          shift: 'day',
          severity: 'error',
          message: `Resource assigned to ${dayJobs.length} day jobs`
        });
      }
    }
  });
  
  return conflicts;
};
```

#### Visual Conflict Indicators
Border colors indicate scheduling status.

```typescript
const getAssignmentBorderColor = (
  resource: Resource,
  assignments: Assignment[]
): string => {
  const todayAssignments = assignments.filter(a => 
    a.resourceId === resource.id &&
    isSameDay(a.scheduleDate, new Date())
  );
  
  const dayShifts = todayAssignments.filter(a => 
    jobs.find(j => j.id === a.jobId)?.shift === 'day'
  );
  
  const nightShifts = todayAssignments.filter(a => 
    jobs.find(j => j.id === a.jobId)?.shift === 'night'
  );
  
  // Red: Double shift (day + night)
  if (dayShifts.length > 0 && nightShifts.length > 0) {
    return 'border-red-500';
  }
  
  // Teal: Multiple day jobs
  if (dayShifts.length > 1) {
    return 'border-teal-500';
  }
  
  // Orange: Night shift only
  if (nightShifts.length > 0 && dayShifts.length === 0) {
    return 'border-orange-500';
  }
  
  // Default: Single assignment
  return 'border-gray-300';
};
```

### 5. Job Organization Rules

#### Row Type Restrictions
Resources can only be placed in appropriate rows.

```typescript
const ROW_TYPE_RESTRICTIONS: Record<RowType, ResourceType[]> = {
  'Forman': ['foreman'],
  'Equipment': ['excavator', 'paver', 'millingMachine', 'grader', 'dozer', 
                'payloader', 'roller', 'skidsteer', 'equipment'],
  'Crew': ['operator', 'laborer', 'striper'],
  'Trucks': ['truck'],
  'Sweeper': ['sweeper'],
  'Tack': ['truck'], // Tack trucks
  'MPT': ['operator', 'laborer'] // Multi-purpose
};

const canDropResourceInRow = (
  resource: Resource,
  rowType: RowType
): boolean => {
  const allowedTypes = ROW_TYPE_RESTRICTIONS[rowType];
  return allowedTypes?.includes(resource.type) || false;
};
```

#### Job Finalization Rules
Finalized jobs cannot be modified.

```typescript
const validateJobModification = (
  job: Job,
  operation: 'add' | 'remove' | 'update'
): ValidationResult => {
  if (job.finalized) {
    return {
      valid: false,
      error: 'Cannot modify finalized job. Unfinalize first.'
    };
  }
  
  // Check job date
  const jobDate = new Date(job.scheduleDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (jobDate < today && operation !== 'remove') {
    return {
      valid: false,
      error: 'Cannot modify past jobs'
    };
  }
  
  return { valid: true };
};
```

### 6. Resource Availability Rules

#### Availability Checking
Resources must be available for assignment.

```typescript
const checkResourceAvailability = async (
  resourceId: string,
  date: Date,
  shift: 'day' | 'night'
): Promise<AvailabilityResult> => {
  // Check resource_availability table
  const { data: unavailable } = await supabase
    .from('resource_availability')
    .select('*')
    .eq('resource_id', resourceId)
    .lte('start_date', date)
    .gte('end_date', date)
    .neq('availability_type', 'available');
  
  if (unavailable?.length) {
    return {
      available: false,
      reason: unavailable[0].availability_type,
      notes: unavailable[0].notes
    };
  }
  
  // Check existing assignments
  const { data: assignments } = await supabase
    .from('assignments')
    .select('*, jobs(*)')
    .eq('resource_id', resourceId)
    .eq('schedule_date', date.toISOString().split('T')[0]);
  
  const conflictingAssignment = assignments?.find(a => 
    a.jobs?.shift === shift
  );
  
  if (conflictingAssignment) {
    return {
      available: false,
      reason: 'already-assigned',
      conflictingJob: conflictingAssignment.jobs?.name
    };
  }
  
  return { available: true };
};
```

#### Maintenance Schedules
Equipment unavailable during maintenance.

```typescript
const validateEquipmentMaintenance = (
  equipment: Equipment,
  date: Date
): ValidationResult => {
  // Check if maintenance is due
  if (equipment.nextMaintenanceDate && 
      new Date(equipment.nextMaintenanceDate) <= date) {
    return {
      valid: false,
      error: 'Equipment due for maintenance',
      severity: 'warning'
    };
  }
  
  // Check operational status
  if (!equipment.isOperational) {
    return {
      valid: false,
      error: 'Equipment is not operational',
      severity: 'error'
    };
  }
  
  // Check engine hours threshold
  const MAINTENANCE_HOURS_THRESHOLD = 250;
  if (equipment.engineHours && 
      equipment.engineHours % MAINTENANCE_HOURS_THRESHOLD > 240) {
    return {
      valid: false,
      error: 'Equipment approaching maintenance interval',
      severity: 'info'
    };
  }
  
  return { valid: true };
};
```

### 7. Time Slot Validation

#### On-Site vs Yard Time
Different time requirements for different locations.

```typescript
interface TimeSlotRule {
  location: 'onSite' | 'yard';
  shift: 'day' | 'night';
  defaultStart: string;
  defaultEnd: string;
  minDuration: number; // hours
  maxDuration: number; // hours
}

const TIME_SLOT_RULES: TimeSlotRule[] = [
  {
    location: 'onSite',
    shift: 'day',
    defaultStart: '07:00',
    defaultEnd: '15:30',
    minDuration: 4,
    maxDuration: 12
  },
  {
    location: 'yard',
    shift: 'day',
    defaultStart: '06:00',
    defaultEnd: '16:00',
    minDuration: 4,
    maxDuration: 12
  },
  {
    location: 'onSite',
    shift: 'night',
    defaultStart: '19:00',
    defaultEnd: '05:00',
    minDuration: 4,
    maxDuration: 10
  }
];

const validateTimeSlot = (
  timeSlot: TimeSlot,
  job: Job
): ValidationResult => {
  const rule = TIME_SLOT_RULES.find(r => 
    r.location === job.location?.type && 
    r.shift === job.shift
  );
  
  if (!rule) {
    return { valid: true }; // No specific rule
  }
  
  const start = parseTime(timeSlot.start);
  const end = parseTime(timeSlot.end);
  const duration = (end - start) / (1000 * 60 * 60); // hours
  
  if (duration < rule.minDuration) {
    return {
      valid: false,
      error: `Minimum ${rule.minDuration} hours required`
    };
  }
  
  if (duration > rule.maxDuration) {
    return {
      valid: false,
      error: `Maximum ${rule.maxDuration} hours allowed`
    };
  }
  
  return { valid: true };
};
```

### 8. Magnet Attachment Rules

#### Auto-Attachment Logic
Automatic pairing of related resources.

```typescript
const AUTO_ATTACH_RULES = [
  {
    source: 'operator',
    target: 'excavator',
    condition: 'available',
    priority: 1
  },
  {
    source: 'driver',
    target: 'truck',
    condition: 'pre-assigned', // Check truck_driver_assignments
    priority: 1
  },
  {
    source: 'screwman',
    target: 'paver',
    condition: 'available',
    priority: 2,
    maxAttachments: 2
  }
];

const performAutoAttachment = async (
  droppedResource: Resource,
  targetJob: Job,
  existingAssignments: Assignment[]
): Promise<Assignment[]> => {
  const attachments: Assignment[] = [];
  
  for (const rule of AUTO_ATTACH_RULES) {
    if (droppedResource.type === rule.target) {
      // Find available source resources
      const availableSources = await findAvailableResources(
        rule.source,
        targetJob.scheduleDate
      );
      
      // Apply attachment up to limit
      const attachCount = Math.min(
        availableSources.length,
        rule.maxAttachments || 1
      );
      
      for (let i = 0; i < attachCount; i++) {
        attachments.push({
          resourceId: availableSources[i].id,
          jobId: targetJob.id,
          attachedTo: droppedResource.id
        });
      }
    }
  }
  
  return attachments;
};
```

### 9. Data Validation Rules

#### Input Sanitization
Prevent invalid data entry.

```typescript
const VALIDATION_RULES = {
  jobName: {
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-\.]+$/,
    required: true
  },
  jobNumber: {
    pattern: /^[A-Z]{2,3}-\d{4,6}$/,
    example: 'ST-2024001'
  },
  resourceIdentifier: {
    pattern: /^[A-Z0-9\-]+$/,
    minLength: 3,
    maxLength: 20
  },
  phoneNumber: {
    pattern: /^\+?1?\d{10,11}$/,
    transform: (val: string) => val.replace(/\D/g, '')
  },
  timeFormat: {
    pattern: /^([01]\d|2[0-3]):([0-5]\d)$/,
    example: '14:30'
  }
};

const validateInput = <T extends keyof typeof VALIDATION_RULES>(
  field: T,
  value: string
): ValidationResult => {
  const rule = VALIDATION_RULES[field];
  
  if (rule.required && !value) {
    return { valid: false, error: `${field} is required` };
  }
  
  if (rule.minLength && value.length < rule.minLength) {
    return { valid: false, error: `Minimum ${rule.minLength} characters` };
  }
  
  if (rule.maxLength && value.length > rule.maxLength) {
    return { valid: false, error: `Maximum ${rule.maxLength} characters` };
  }
  
  if (rule.pattern && !rule.pattern.test(value)) {
    return { 
      valid: false, 
      error: `Invalid format. Example: ${rule.example || 'N/A'}` 
    };
  }
  
  return { valid: true };
};
```

### 10. Business Workflow Rules

#### Assignment Workflow
Step-by-step assignment process.

```typescript
const ASSIGNMENT_WORKFLOW = {
  steps: [
    'validateResource',
    'checkAvailability',
    'validateDropLocation',
    'checkAttachmentRequirements',
    'createAssignment',
    'autoAttachRelated',
    'updateTimeSlots',
    'notifyChanges'
  ]
};

const executeAssignmentWorkflow = async (
  resource: Resource,
  job: Job,
  row: RowType,
  position: number
): Promise<WorkflowResult> => {
  const results: StepResult[] = [];
  
  for (const step of ASSIGNMENT_WORKFLOW.steps) {
    try {
      const result = await executeStep(step, {
        resource,
        job,
        row,
        position
      });
      
      results.push({
        step,
        success: true,
        data: result
      });
      
      if (result.stopWorkflow) {
        break;
      }
    } catch (error) {
      results.push({
        step,
        success: false,
        error: error.message
      });
      
      // Rollback on critical failure
      if (isCriticalStep(step)) {
        await rollbackWorkflow(results);
        throw error;
      }
    }
  }
  
  return {
    success: results.every(r => r.success),
    results
  };
};
```

## Validation Error Handling

### User-Friendly Error Messages
```typescript
const ERROR_MESSAGES = {
  'equipment-no-operator': 'Equipment requires an operator for safety',
  'truck-no-driver': 'Truck requires a licensed driver',
  'resource-unavailable': 'Resource is not available on this date',
  'job-finalized': 'Cannot modify finalized job',
  'double-shift': 'Resource already assigned to both shifts',
  'invalid-row': 'Resource type not allowed in this row',
  'max-attachments': 'Maximum attachments reached'
};

const formatValidationError = (
  error: ValidationError
): UserMessage => {
  return {
    title: 'Validation Failed',
    message: ERROR_MESSAGES[error.code] || error.message,
    severity: error.severity || 'error',
    actions: getErrorActions(error)
  };
};
```

## Testing Business Rules

### Unit Tests
```typescript
describe('Business Rules', () => {
  it('should require operator for equipment', () => {
    const equipment = { type: 'excavator', id: 'e1' };
    const result = validateEquipmentHasOperator(equipment, []);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('requires an operator');
  });
  
  it('should allow max 2 screwmen on paver', () => {
    const paver = { type: 'paver', id: 'p1' };
    const attachments = [
      { resourceId: 's1', type: 'screwman' },
      { resourceId: 's2', type: 'screwman' },
      { resourceId: 's3', type: 'screwman' }
    ];
    const result = validatePaverCrew(paver, attachments);
    expect(result.valid).toBe(false);
  });
});
```

The business rules ensure safety compliance, operational efficiency, and data integrity throughout the scheduling system.