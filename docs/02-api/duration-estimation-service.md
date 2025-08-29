---
title: DurationEstimationService API
category: api
tags: [duration, estimation, job-planning, production-rates]
related: [/02-api/database-service.md, /04-features/job-estimation.md]
last-updated: 2025-08-29
---

# DurationEstimationService API

## Quick Answer
DurationEstimationService provides intelligent job duration estimation and phase planning for construction projects using production rates, complexity factors, and job-specific parameters.

## Overview

The DurationEstimationService class calculates realistic project timelines based on historical production rates and job characteristics. It supports multiple construction types (milling, paving, drainage, excavation) and generates detailed project phases with daily targets and resource requirements.

## Core Features

- **Production Rate Calculations**: Industry-standard rates with complexity adjustments
- **Multi-Phase Job Planning**: Automatic phase sequencing for complex projects
- **Daily Target Setting**: Precise daily production goals per phase
- **Complexity Factoring**: Adjustable difficulty multipliers
- **End Date Prediction**: Accurate project completion estimates
- **Configurable Rates**: Admin-adjustable base production rates

## Base Production Rates

### Default Industry Rates

```typescript
private static readonly BASE_RATES = {
  milling: 22000,              // sq yards per day
  paving_highway: 2000,        // tons per day for highways
  paving_parking_lot: 800,     // tons per day (slower due to complexity)
  paving_residential: 1500,    // tons per day for residential
  excavation: 150,             // cubic yards per day
  drainage: 300,               // linear feet per day
  concrete: 50,                // cubic yards per day
};

// Access current rates
const rates = DurationEstimationService.getProductionRates();
console.log('Milling rate:', rates.milling); // 22000 sq yards/day
```

### Rate Configuration

```typescript
// Update rates for site-specific conditions
DurationEstimationService.updateBaseRates({
  milling: 18000,              // Reduced for difficult terrain
  paving_highway: 2200,        // Increased for experienced crew
  drainage: 250                // Reduced for complex underground work
});
```

## Duration Estimation Methods

### Milling Operations

```typescript
// Basic milling estimation
const millingDays = DurationEstimationService.estimateMillingDays(
  50000,    // sqYards - Total square yards to mill
  1.2       // complexity - 20% more difficult than average
);
// Returns: Math.ceil(50000 / (22000 / 1.2)) = 3 days

// Usage in job planning
const jobData = {
  type: 'milling',
  estimated_sqyards: 75000,
  complexity_factor: 1.5  // Challenging conditions
};
```

### Paving Operations

```typescript
// Highway paving
const pavingDays = DurationEstimationService.estimatePavingDays(
  500,        // tons - Total tonnage to pave
  'highway',  // jobCategory - Affects base rate selection
  1.0         // complexity - Standard conditions
);
// Uses paving_highway rate: Math.ceil(500 / 2000) = 1 day

// Parking lot paving (more complex)
const complexPaving = DurationEstimationService.estimatePavingDays(
  500,
  'parking_lot',  // Uses slower paving_parking_lot rate
  1.3             // 30% complexity increase
);
// Uses: Math.ceil(500 / (800 / 1.3)) = 1 day
```

### Job Category Rate Selection

```typescript
// Automatic rate selection based on job category
const getRateByCategory = (category: Job['job_category']) => {
  switch (category) {
    case 'parking_lot': return BASE_RATES.paving_parking_lot;    // 800
    case 'residential': return BASE_RATES.paving_residential;    // 1500
    case 'commercial': return BASE_RATES.paving_parking_lot;     // 800
    case 'municipal': return BASE_RATES.paving_residential;      // 1500
    default: return BASE_RATES.paving_highway;                   // 2000
  }
};
```

### Excavation and Infrastructure

```typescript
// Excavation estimation
const excavationDays = DurationEstimationService.estimateExcavationDays(
  300,    // cubicYards
  1.4     // complexity - Rocky soil conditions
);
// Returns: Math.ceil(300 / (150 / 1.4)) = 3 days

// Drainage work estimation  
const drainageDays = DurationEstimationService.estimateDrainageDays(
  1200,   // linearFeet - Pipe installation length
  1.1     // complexity - Minor obstacles
);
// Returns: Math.ceil(1200 / (300 / 1.1)) = 5 days

// Concrete work estimation
const concreteDays = DurationEstimationService.estimateConcreteDays(
  25,     // cubicYards
  1.0     // complexity - Standard conditions
);
// Returns: Math.ceil(25 / 50) = 1 day
```

## Complete Job Duration Calculation

### Single-Phase Jobs

```typescript
// Milling-only job
const millingJob = {
  type: 'milling',
  estimated_sqyards: 45000,
  complexity_factor: 1.2
};

const estimate = DurationEstimationService.calculateJobDuration(millingJob);
// Returns: { 
//   milling_days: 3,
//   total_days: 3 
// }
```

### Multi-Phase Jobs

```typescript
// Combined milling and paving job
const combinedJob = {
  type: 'both',
  estimated_sqyards: 30000,    // For milling phase
  estimated_tons: 800,         // For paving phase
  job_category: 'highway',
  complexity_factor: 1.1
};

const estimate = DurationEstimationService.calculateJobDuration(combinedJob);
// Returns: {
//   milling_days: 2,           // Math.ceil(30000 / (22000 / 1.1))
//   paving_days: 1,            // Math.ceil(800 / (2000 / 1.1))
//   total_days: 3              // Sequential execution
// }
```

### Complex Drainage Projects

```typescript
// Multi-phase drainage project
const drainageJob = {
  type: 'drainage',
  estimated_cubic_yards: 200,    // Excavation volume
  estimated_linear_feet: 800,    // Pipe length
  complexity_factor: 1.3
};

const estimate = DurationEstimationService.calculateJobDuration(drainageJob);
// Returns: {
//   excavation_days: 2,        // Math.ceil(200 / (150 / 1.3))
//   drainage_days: 4,          // Math.ceil(800 / (300 / 1.3))
//   concrete_days: 1,          // Math.ceil((200 * 0.1) / (50 / 1.3))
//   total_days: 7              // Sequential phases
// }
```

## Job Phase Generation

### Phase Planning with Dates

```typescript
// Generate detailed project phases
const phases = DurationEstimationService.generateJobPhases(
  {
    id: 'job-123',
    type: 'both',
    estimated_sqyards: 25000,
    estimated_tons: 600,
    job_category: 'highway'
  },
  '2025-09-01'  // Start date
);

// Returns structured phases:
[
  {
    id: 'job-123-milling',
    job_id: 'job-123',
    phase_type: 'milling',
    estimated_start: '2025-09-01',
    estimated_end: '2025-09-01',     // 1-day milling
    daily_target: 25000,             // All sq yards in one day
    daily_unit: 'sqyards',
    sequence_order: 1
  },
  {
    id: 'job-123-paving', 
    job_id: 'job-123',
    phase_type: 'paving',
    estimated_start: '2025-09-02',   // Day after milling
    estimated_end: '2025-09-02',     // 1-day paving
    daily_target: 600,               // All tons in one day
    daily_unit: 'tons',
    sequence_order: 2
  }
]
```

### Complex Multi-Phase Drainage

```typescript
// Detailed drainage project phases
const drainagePhases = DurationEstimationService.generateJobPhases(
  {
    id: 'drain-456',
    type: 'drainage',
    estimated_cubic_yards: 150,
    estimated_linear_feet: 900
  },
  '2025-09-15'
);

// Returns sequential phases:
[
  // Phase 1: Excavation
  {
    id: 'drain-456-excavation',
    phase_type: 'excavation',
    estimated_start: '2025-09-15',
    estimated_end: '2025-09-15',     // 1 day
    daily_target: 150,               // 150 cubic yards/day
    daily_unit: 'cubic_yards',
    sequence_order: 1
  },
  // Phase 2: Drainage Installation
  {
    id: 'drain-456-drainage',
    phase_type: 'drainage',
    estimated_start: '2025-09-16',
    estimated_end: '2025-09-18',     // 3 days
    daily_target: 300,               // 300 linear feet/day
    daily_unit: 'linear_feet',
    sequence_order: 2
  },
  // Phase 3: Concrete Work
  {
    id: 'drain-456-concrete',
    phase_type: 'concrete',
    estimated_start: '2025-09-19',
    estimated_end: '2025-09-19',     // 1 day
    daily_target: 15,                // 15 cubic yards/day (10% of excavation)
    daily_unit: 'cubic_yards',
    sequence_order: 3
  }
]
```

## Date Calculation Utilities

### End Date Prediction

```typescript
// Calculate project completion date
const endDate = DurationEstimationService.calculateEndDate(
  '2025-09-01',  // Start date
  5              // Total days duration
);
// Returns: '2025-09-05' (start date counts as day 1)

// Usage in project planning
const projectStart = '2025-10-01';
const jobEstimate = DurationEstimationService.calculateJobDuration(complexJob);
const projectEnd = DurationEstimationService.calculateEndDate(
  projectStart, 
  jobEstimate.total_days
);
```

### Working Days Calculation

```typescript
// Internal date utilities for phase planning
const addDaysToDate = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Sequential phase date calculation
let currentDate = new Date('2025-09-01');
phases.forEach(phase => {
  phase.estimated_start = formatDate(currentDate);
  const phaseEndDate = addDaysToDate(currentDate, phase.duration - 1);
  phase.estimated_end = formatDate(phaseEndDate);
  currentDate = addDaysToDate(phaseEndDate, 1); // Next phase starts day after
});
```

## Advanced Estimation Features

### Complexity Factor Application

```typescript
// Standard complexity factors
const complexityFactors = {
  easy: 0.8,          // 20% faster than standard
  standard: 1.0,      // Baseline production rate
  moderate: 1.3,      // 30% slower than standard
  difficult: 1.6,     // 60% slower than standard
  extreme: 2.0        // 100% slower than standard
};

// Apply complexity to duration calculation
const adjustedRate = BASE_RATES.milling / complexityFactor;
const duration = Math.ceil(sqYards / adjustedRate);
```

### Production Rate Customization

```typescript
// Site-specific rate adjustments
class SiteEstimationService extends DurationEstimationService {
  static updateRatesForSite(siteConditions: {
    weather: 'good' | 'poor',
    access: 'easy' | 'difficult',
    experience: 'high' | 'medium' | 'low'
  }) {
    let millingMultiplier = 1.0;
    let pavingMultiplier = 1.0;
    
    // Weather adjustments
    if (siteConditions.weather === 'poor') {
      millingMultiplier *= 0.8;  // 20% slower
      pavingMultiplier *= 0.7;   // 30% slower
    }
    
    // Access adjustments
    if (siteConditions.access === 'difficult') {
      millingMultiplier *= 0.9;  // 10% slower
      pavingMultiplier *= 0.9;
    }
    
    // Experience adjustments
    if (siteConditions.experience === 'high') {
      millingMultiplier *= 1.1;  // 10% faster
      pavingMultiplier *= 1.1;
    } else if (siteConditions.experience === 'low') {
      millingMultiplier *= 0.9;  // 10% slower
      pavingMultiplier *= 0.9;
    }
    
    this.updateBaseRates({
      milling: Math.round(this.BASE_RATES.milling * millingMultiplier),
      paving_highway: Math.round(this.BASE_RATES.paving_highway * pavingMultiplier)
    });
  }
}
```

## Integration Patterns

### Job Creation Integration

```typescript
// Integration with job creation workflow
const createJobWithEstimation = async (jobData: CreateJobData) => {
  // 1. Calculate duration estimate
  const estimate = DurationEstimationService.calculateJobDuration(jobData);
  
  // 2. Generate project phases
  const phases = DurationEstimationService.generateJobPhases(
    jobData,
    jobData.start_date
  );
  
  // 3. Calculate end date
  const endDate = DurationEstimationService.calculateEndDate(
    jobData.start_date,
    estimate.total_days
  );
  
  // 4. Create job with estimation data
  const job = await DatabaseService.createJob({
    ...jobData,
    estimated_duration: estimate.total_days,
    estimated_end_date: endDate,
    phases: phases
  });
  
  return job;
};
```

### Calendar Integration

```typescript
// Integrate with calendar scheduling
const scheduleJobOnCalendar = (job: Job, startDate: string) => {
  const estimate = DurationEstimationService.calculateJobDuration(job);
  const endDate = DurationEstimationService.calculateEndDate(startDate, estimate.total_days);
  
  return {
    id: job.id,
    title: job.name,
    start: startDate,
    end: endDate,
    duration: estimate.total_days,
    phases: DurationEstimationService.generateJobPhases(job, startDate)
  };
};
```

## Error Handling and Validation

### Input Validation

```typescript
// Validate estimation inputs
const validateEstimationInputs = (job: Partial<Job>): boolean => {
  switch (job.type) {
    case 'milling':
      return Boolean(job.estimated_sqyards && job.estimated_sqyards > 0);
    case 'paving':
      return Boolean(job.estimated_tons && job.estimated_tons > 0);
    case 'both':
      return Boolean(
        job.estimated_sqyards && job.estimated_sqyards > 0 &&
        job.estimated_tons && job.estimated_tons > 0
      );
    case 'drainage':
      return Boolean(
        job.estimated_cubic_yards && job.estimated_cubic_yards > 0 &&
        job.estimated_linear_feet && job.estimated_linear_feet > 0
      );
    default:
      return true; // Default case allows any job
  }
};
```

### Safe Estimation with Fallbacks

```typescript
// Safe estimation with error handling
const safeEstimateJobDuration = (job: Partial<Job>): JobEstimate => {
  try {
    // Validate inputs
    if (!validateEstimationInputs(job)) {
      console.warn('Invalid estimation inputs, using default duration');
      return { total_days: 1 };
    }
    
    // Perform estimation
    return DurationEstimationService.calculateJobDuration(job);
  } catch (error) {
    console.error('Estimation calculation failed:', error);
    // Return safe default
    return { total_days: 1 };
  }
};
```

## API Reference Summary

### Estimation Methods

| Method | Purpose | Parameters | Returns |
|--------|---------|------------|---------|
| `estimateMillingDays()` | Calculate milling duration | `sqYards, complexity?` | `number` |
| `estimatePavingDays()` | Calculate paving duration | `tons, category, complexity?` | `number` |
| `estimateExcavationDays()` | Calculate excavation duration | `cubicYards, complexity?` | `number` |
| `estimateDrainageDays()` | Calculate drainage duration | `linearFeet, complexity?` | `number` |
| `estimateConcreteDays()` | Calculate concrete duration | `cubicYards, complexity?` | `number` |

### Job Planning Methods

| Method | Purpose | Parameters | Returns |
|--------|---------|------------|---------|
| `calculateJobDuration()` | Complete job estimation | `job: Partial<Job>` | `JobEstimate` |
| `generateJobPhases()` | Create project phases | `job, startDate` | `JobPhase[]` |
| `calculateEndDate()` | Project completion date | `startDate, totalDays` | `string` |

### Configuration Methods

| Method | Purpose | Parameters | Returns |
|--------|---------|------------|---------|
| `getProductionRates()` | Get current rates | None | `BASE_RATES` object |
| `updateBaseRates()` | Update production rates | `rates: Partial<BASE_RATES>` | `void` |

### Type Definitions

```typescript
interface JobEstimate {
  total_days: number;
  milling_days?: number;
  paving_days?: number;
  excavation_days?: number;
  drainage_days?: number;
  concrete_days?: number;
}

interface JobPhase {
  id: string;
  job_id: string;
  phase_type: 'milling' | 'paving' | 'excavation' | 'drainage' | 'concrete';
  estimated_start: string;
  estimated_end: string;
  daily_target: number;
  daily_unit: 'sqyards' | 'tons' | 'cubic_yards' | 'linear_feet';
  sequence_order: number;
}
```

The DurationEstimationService provides sophisticated project planning capabilities that help construction teams create realistic schedules and resource allocation plans based on proven production rates and site-specific conditions.