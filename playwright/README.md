# BoardOS E2E Testing with Playwright

## Overview

This directory contains the comprehensive end-to-end testing suite for BoardOS, featuring **dynamic test generation** that automatically creates tests from your database business rules.

## Key Features

### 🎯 Dynamic Test Generation
- Tests are automatically generated from database rules
- No need to manually update tests when business rules change
- Reads from `magnet_interaction_rules`, `drop_rules`, and `job_row_configs` tables
- Generates hundreds of test scenarios automatically

### 🔄 Real-time Testing
- Tests real-time synchronization between multiple users
- Validates Supabase subscriptions
- Tests optimistic UI updates

### 📱 Mobile Testing
- Touch interactions
- Responsive layouts
- Mobile-specific gestures

## Quick Start

```bash
# Install Playwright
npm run playwright:install

# Generate dynamic tests from database
npm run test:e2e:generate

# Run all E2E tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Debug tests
npm run test:e2e:debug
```

## Test Structure

```
playwright/
├── fixtures/          # Test data factories and helpers
│   ├── auth.ts       # Authentication helpers
│   └── test-data.ts  # Dynamic test data generation
├── pages/            # Page Object Models
│   ├── SchedulerPage.ts
│   ├── MagnetPage.ts
│   └── CompactQuickSelectPage.ts
├── services/         # Test services
│   └── rule-fetcher.ts  # Fetches business rules from database
├── generators/       # Dynamic test generators
│   └── test-generator.ts # Creates tests from rules
└── tests/           # Test specifications
    ├── core/        # Core functionality tests
    ├── business-rules/  # Business logic tests
    ├── mobile/      # Mobile-specific tests
    ├── integration/ # Integration tests
    └── dynamic/     # Auto-generated tests (git-ignored)
```

## Dynamic Test Generation

### How It Works

1. **Fetch Rules**: The system connects to your Supabase database and fetches all business rules
2. **Generate Scenarios**: Each rule is converted into multiple test scenarios
3. **Create Test Code**: TypeScript test code is generated with proper assertions
4. **Run Tests**: Generated tests run alongside static tests

### Example Generated Test

```typescript
test('excavator can attach operator', async ({ page }) => {
  // Setup test data
  const testData = {
    parent: { type: 'excavator', id: 'excavator-1' },
    child: { type: 'operator', id: 'operator-1' }
  };

  // Perform magnet attachment
  await magnetPage.dragMagnetToTarget(testData.child.id, testData.parent.id);
  
  // Verify expected behavior
  const isAttached = await magnetPage.verifyAttachment(
    'excavator-1',
    'operator-1'
  );
  expect(isAttached).toBe(true);
});
```

### Regenerating Tests

Run this command whenever business rules change:

```bash
npm run test:e2e:generate
```

This will:
- Connect to your database
- Fetch latest rules
- Generate new test file at `playwright/tests/dynamic/auto-generated-rules.spec.ts`
- Show summary of generated tests

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Specific Browser
```bash
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Mobile Tests
```bash
npm run test:e2e:mobile
```

### Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Interactive UI Mode
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug
```

## Test Categories

### Core Tests
- Drag and drop functionality
- Resource assignment
- Job management
- UI responsiveness

### Business Rules Tests
- Equipment-operator attachment requirements
- Truck-driver relationships
- Paver screwmen limits
- Double shift prevention
- Job finalization rules

### Mobile Tests
- Touch interactions
- Swipe gestures
- Pinch to zoom
- Long press context menus
- Responsive layouts

### Integration Tests
- Real-time synchronization
- Multi-user collaboration
- Conflict resolution
- Optimistic updates with rollback

## Writing New Tests

### Static Tests

Create new test files in appropriate directories:

```typescript
// playwright/tests/core/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { SchedulerPage } from '../../pages/SchedulerPage';

test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    // Your test logic
  });
});
```

### Page Objects

Add new page objects for new UI components:

```typescript
// playwright/pages/MyNewPage.ts
export class MyNewPage {
  constructor(private page: Page) {}
  
  async doSomething() {
    // Page interaction logic
  }
}
```

## Environment Setup

### Required Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### Database Requirements

For dynamic test generation, ensure these tables exist:
- `magnet_interaction_rules`
- `drop_rules`
- `job_row_configs`

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Install Playwright
  run: npm run playwright:install

- name: Generate Dynamic Tests
  run: npm run test:e2e:generate

- name: Run E2E Tests
  run: npm run test:e2e
  
- name: Upload Test Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Debugging Failed Tests

### View Test Report
```bash
npm run test:e2e:report
```

### Update Snapshots
```bash
npm run test:e2e:update-snapshots
```

### Record New Tests
```bash
npm run playwright:codegen
```

## Best Practices

1. **Keep Tests Independent**: Each test should be able to run in isolation
2. **Use Page Objects**: Encapsulate page interactions in page objects
3. **Generate Don't Write**: Use dynamic generation for business rule tests
4. **Test User Flows**: Focus on real user scenarios
5. **Mobile First**: Always test mobile interactions
6. **Real-time Matters**: Test multi-user scenarios

## Troubleshooting

### Tests Fail After Rule Changes
```bash
npm run test:e2e:generate  # Regenerate tests
npm run test:e2e          # Run updated tests
```

### Connection Issues
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Ensure dev server is running: `npm run dev`
- Check network connectivity to Supabase

### Slow Tests
- Use `fullyParallel: true` in config
- Increase workers for faster execution
- Consider splitting large test files

## Contributing

When adding new features:
1. Add page objects for new UI components
2. Write static tests for UI interactions
3. Update rule-fetcher.ts for new business rules
4. Regenerate dynamic tests
5. Run full test suite before committing