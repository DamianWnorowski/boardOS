---
title: Testing Guide
category: testing
tags: [testing, vitest, react-testing-library, e2e, quality]
related: [/05-development/workflow.md, /05-development/setup-guide.md]
last-updated: 2025-08-29
---

# Testing Guide

## Quick Answer
BoardOS uses Vitest for unit testing, React Testing Library for component testing, and Playwright for E2E testing. Tests focus on business logic, user interactions, and critical paths with >80% coverage target.

## Testing Stack

- **Unit Testing**: Vitest
- **Component Testing**: React Testing Library
- **E2E Testing**: Playwright
- **Mocking**: MSW (Mock Service Worker)
- **Coverage**: V8 via Vitest

## Test Structure

```
src/
├── components/
│   ├── Board.tsx
│   └── Board.test.tsx
├── hooks/
│   ├── useMagnet.ts
│   └── useMagnet.test.ts
├── services/
│   ├── DatabaseService.ts
│   └── DatabaseService.test.ts
└── utils/
    ├── validation.ts
    └── validation.test.ts

e2e/
├── specs/
│   ├── scheduler.spec.ts
│   └── drag-drop.spec.ts
└── fixtures/
    └── test-data.ts
```

## Unit Testing

### Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

### Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock environment variables
beforeAll(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');
});

// Mock window methods
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### Business Logic Testing

```typescript
// src/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEquipmentOperator, validateTimeSlot } from './validation';

describe('Business Rule Validation', () => {
  describe('validateEquipmentOperator', () => {
    it('should require operator for excavator', () => {
      const equipment = { id: '1', type: 'excavator', name: 'EX-01' };
      const assignments = [];
      
      const result = validateEquipmentOperator(equipment, assignments);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requires an operator');
    });
    
    it('should pass when operator is attached', () => {
      const equipment = { id: '1', type: 'excavator', name: 'EX-01' };
      const assignments = [
        {
          id: 'a1',
          resourceId: 'op1',
          resourceType: 'operator',
          attachedTo: '1',
        },
      ];
      
      const result = validateEquipmentOperator(equipment, assignments);
      
      expect(result.valid).toBe(true);
    });
    
    it('should not require operator for trucks', () => {
      const truck = { id: '2', type: 'truck', name: 'T-01' };
      const assignments = [];
      
      const result = validateEquipmentOperator(truck, assignments);
      
      expect(result.valid).toBe(true);
    });
  });
  
  describe('validateTimeSlot', () => {
    it('should validate minimum duration', () => {
      const timeSlot = { start: '07:00', end: '09:00' }; // 2 hours
      const job = { shift: 'day', location: { type: 'onSite' } };
      
      const result = validateTimeSlot(timeSlot, job);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum 4 hours');
    });
    
    it('should validate maximum duration', () => {
      const timeSlot = { start: '06:00', end: '20:00' }; // 14 hours
      const job = { shift: 'day', location: { type: 'onSite' } };
      
      const result = validateTimeSlot(timeSlot, job);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum 12 hours');
    });
  });
});
```

## Component Testing

### Testing Utilities

```typescript
// src/test/utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { SchedulerProvider } from '@/context/SchedulerContext';
import { DragProvider } from '@/context/DragContext';

interface TestProviderProps {
  children: ReactNode;
  initialState?: Partial<SchedulerState>;
}

const TestProviders: React.FC<TestProviderProps> = ({ 
  children, 
  initialState 
}) => {
  return (
    <SchedulerProvider initialState={initialState}>
      <DragProvider>
        {children}
      </DragProvider>
    </SchedulerProvider>
  );
};

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    initialState?: Partial<SchedulerState>;
  }
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders initialState={options?.initialState}>
        {children}
      </TestProviders>
    ),
    ...options,
  });
}
```

### Component Tests

```typescript
// src/components/ResourceCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ResourceCard } from './ResourceCard';
import { renderWithProviders } from '@/test/utils';

describe('ResourceCard', () => {
  const mockResource = {
    id: 'r1',
    type: 'excavator',
    name: 'EX-01',
    identifier: 'EQ-001',
    onSite: false,
  };
  
  it('should render resource information', () => {
    renderWithProviders(<ResourceCard resource={mockResource} />);
    
    expect(screen.getByText('EX-01')).toBeInTheDocument();
    expect(screen.getByText('EQ-001')).toBeInTheDocument();
  });
  
  it('should handle drag start', () => {
    const onDragStart = vi.fn();
    renderWithProviders(
      <ResourceCard 
        resource={mockResource} 
        onDragStart={onDragStart}
      />
    );
    
    const card = screen.getByRole('article');
    fireEvent.dragStart(card);
    
    expect(onDragStart).toHaveBeenCalledWith(mockResource);
  });
  
  it('should show assignment status', () => {
    renderWithProviders(
      <ResourceCard 
        resource={mockResource} 
        isAssigned={true}
      />
    );
    
    expect(screen.getByText(/assigned/i)).toBeInTheDocument();
  });
  
  it('should indicate double shift with red border', () => {
    renderWithProviders(
      <ResourceCard 
        resource={mockResource} 
        hasDoubleShift={true}
      />
    );
    
    const card = screen.getByRole('article');
    expect(card).toHaveClass('border-red-500');
  });
});
```

### Hook Testing

```typescript
// src/hooks/useMagnet.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMagnet } from './useMagnet';
import { magnetManager } from '@/classes/Magnet';

vi.mock('@/classes/Magnet', () => ({
  magnetManager: {
    getMagnet: vi.fn(),
    linkMagnets: vi.fn(),
    unlinkMagnets: vi.fn(),
  },
}));

describe('useMagnet', () => {
  it('should initialize with magnet data', () => {
    const mockMagnet = {
      id: 'm1',
      type: 'operator',
      name: 'John Doe',
      status: 'available',
    };
    
    vi.mocked(magnetManager.getMagnet).mockReturnValue(mockMagnet);
    
    const { result } = renderHook(() => useMagnet('m1'));
    
    expect(result.current.magnet).toEqual(mockMagnet);
    expect(result.current.isAssigned).toBe(false);
  });
  
  it('should handle assignment', async () => {
    const mockMagnet = {
      id: 'm1',
      assignToJob: vi.fn().mockReturnValue('assignment-1'),
    };
    
    vi.mocked(magnetManager.getMagnet).mockReturnValue(mockMagnet);
    
    const { result } = renderHook(() => useMagnet('m1'));
    
    await act(async () => {
      const assignmentId = result.current.assignToJob(
        'job-1',
        'Equipment',
        0
      );
      expect(assignmentId).toBe('assignment-1');
    });
    
    expect(mockMagnet.assignToJob).toHaveBeenCalledWith(
      'job-1',
      'Equipment',
      0,
      undefined
    );
  });
  
  it('should handle drag operations', () => {
    const mockMagnet = {
      id: 'm1',
      startDrag: vi.fn(),
      endDrag: vi.fn(),
      isDragging: false,
    };
    
    vi.mocked(magnetManager.getMagnet).mockReturnValue(mockMagnet);
    
    const { result } = renderHook(() => useMagnet('m1'));
    
    act(() => {
      result.current.startDrag();
    });
    
    expect(mockMagnet.startDrag).toHaveBeenCalled();
    
    act(() => {
      result.current.endDrag();
    });
    
    expect(mockMagnet.endDrag).toHaveBeenCalled();
  });
});
```

## Integration Testing

### Database Service Testing

```typescript
// src/services/DatabaseService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseService } from './DatabaseService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('DatabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('assignResource', () => {
    it('should validate equipment has operator', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { type: 'excavator' },
        }),
      };
      
      vi.mocked(supabase.from).mockReturnValue(mockFrom);
      
      await expect(
        DatabaseService.assignResource('r1', 'j1', 'Equipment')
      ).rejects.toThrow('Equipment requires operator');
    });
    
    it('should create assignment when valid', async () => {
      const mockResource = { type: 'operator' };
      const mockAssignment = { 
        id: 'a1', 
        resource_id: 'r1', 
        job_id: 'j1' 
      };
      
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockResource }),
        insert: vi.fn().mockReturnThis(),
      };
      
      mockFrom.select.mockImplementation(() => ({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockAssignment }),
      }));
      
      vi.mocked(supabase.from).mockReturnValue(mockFrom);
      
      const result = await DatabaseService.assignResource(
        'r1', 
        'j1', 
        'Crew'
      );
      
      expect(result).toEqual(expect.objectContaining({
        id: 'a1',
        resourceId: 'r1',
        jobId: 'j1',
      }));
    });
  });
});
```

## E2E Testing with Playwright

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Tests

```typescript
// e2e/specs/scheduler.spec.ts
import { test, expect } from '@playwright/test';
import { setupTestData, cleanupTestData } from '../fixtures/test-data';

test.describe('Scheduler', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestData();
    await page.goto('/');
  });
  
  test.afterEach(async () => {
    await cleanupTestData();
  });
  
  test('should drag resource to job', async ({ page }) => {
    // Find excavator in resource pool
    const excavator = page.locator('[data-resource-id="ex-01"]');
    await expect(excavator).toBeVisible();
    
    // Find job row
    const jobRow = page.locator('[data-job-id="job-01"] [data-row="Equipment"]');
    await expect(jobRow).toBeVisible();
    
    // Perform drag and drop
    await excavator.dragTo(jobRow);
    
    // Verify assignment created
    await expect(
      jobRow.locator('[data-resource-id="ex-01"]')
    ).toBeVisible();
    
    // Verify resource removed from pool
    await expect(
      page.locator('.resource-pool [data-resource-id="ex-01"]')
    ).not.toBeVisible();
  });
  
  test('should enforce equipment-operator rule', async ({ page }) => {
    // Drag equipment without operator
    const equipment = page.locator('[data-resource-id="ex-01"]');
    const jobRow = page.locator('[data-job-id="job-01"] [data-row="Equipment"]');
    
    await equipment.dragTo(jobRow);
    
    // Should show error
    await expect(
      page.locator('.toast-error')
    ).toContainText('requires an operator');
    
    // Assignment should not be created
    await expect(
      jobRow.locator('[data-resource-id="ex-01"]')
    ).not.toBeVisible();
  });
  
  test('should handle double-shift assignment', async ({ page }) => {
    // Assign to day shift
    await page.locator('[data-resource-id="op-01"]').dragTo(
      page.locator('[data-job-id="day-job"] [data-row="Crew"]')
    );
    
    // Assign same resource to night shift
    await page.locator('[data-resource-id="op-01"]').dragTo(
      page.locator('[data-job-id="night-job"] [data-row="Crew"]')
    );
    
    // Should show double-shift indicator
    await expect(
      page.locator('[data-resource-id="op-01"]').first()
    ).toHaveClass(/border-red-500/);
  });
});
```

## Mock Data

### Test Fixtures

```typescript
// src/test/fixtures/mockData.ts
export const mockResources = [
  {
    id: 'r1',
    type: 'excavator',
    name: 'EX-01',
    identifier: 'EQ-001',
    onSite: false,
  },
  {
    id: 'r2',
    type: 'operator',
    name: 'John Doe',
    identifier: 'OP-001',
    onSite: true,
  },
  {
    id: 'r3',
    type: 'truck',
    name: 'Truck 01',
    identifier: 'T-001',
    classType: '10W',
  },
];

export const mockJobs = [
  {
    id: 'j1',
    name: 'Main Street Paving',
    type: 'street',
    shift: 'day',
    scheduleDate: new Date(),
    finalized: false,
  },
  {
    id: 'j2',
    name: 'Highway 101 Repair',
    type: 'highway',
    shift: 'night',
    scheduleDate: new Date(),
    finalized: false,
  },
];

export const mockAssignments = [
  {
    id: 'a1',
    resourceId: 'r1',
    jobId: 'j1',
    row: 'Equipment',
    position: 0,
  },
];
```

### Mock Service Worker

```typescript
// src/test/mocks/handlers.ts
import { rest } from 'msw';
import { mockResources, mockJobs } from '../fixtures/mockData';

export const handlers = [
  rest.get('*/resources', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ data: mockResources })
    );
  }),
  
  rest.get('*/jobs', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ data: mockJobs })
    );
  }),
  
  rest.post('*/assignments', async (req, res, ctx) => {
    const body = await req.json();
    
    // Validate business rules
    if (body.resource_type === 'excavator' && !body.has_operator) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Equipment requires operator' })
      );
    }
    
    return res(
      ctx.status(201),
      ctx.json({
        data: {
          id: 'new-assignment',
          ...body,
        },
      })
    );
  }),
];
```

## Test Commands

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:all": "npm run test:run && npm run test:e2e"
  }
}
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Testing Best Practices

1. **Test behavior, not implementation** - Focus on what users see
2. **Use Testing Library queries** - Prefer accessible queries
3. **Avoid testing framework code** - Test your logic
4. **Keep tests isolated** - Each test should be independent
5. **Use meaningful assertions** - Be specific about expectations
6. **Mock external dependencies** - Keep tests fast and reliable
7. **Test edge cases** - Include error scenarios
8. **Maintain test data** - Use factories for consistency
9. **Run tests frequently** - Catch issues early
10. **Monitor test coverage** - But don't chase 100%

## Coverage Goals

| Type | Target | Current |
|------|--------|---------|
| Statements | 80% | - |
| Branches | 80% | - |
| Functions | 80% | - |
| Lines | 80% | - |

Focus coverage on:
- Business logic (validation, calculations)
- Critical user paths (assignment, scheduling)
- Error handling
- Data transformations

Skip coverage for:
- UI-only components
- Third-party integrations
- Generated code
- Development tools

Testing ensures BoardOS reliability, maintainability, and confidence in deployments.