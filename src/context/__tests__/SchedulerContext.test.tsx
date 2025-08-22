import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SchedulerProvider, useScheduler } from '../SchedulerContext';
import type { RowType } from '../../types';

// Helper component to expose context for testing
const Consumer: React.FC = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ctx = useScheduler();
  (Consumer as any).context = ctx; // store context on component for access in tests
  return null;
};

describe('SchedulerContext', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      })
    };
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('allows core scheduler actions and persists them to localStorage', async () => {
    render(
      <SchedulerProvider>
        <Consumer />
      </SchedulerProvider>
    );

    const ctx = (Consumer as any).context;

    // addJob
    await act(async () => {
      ctx.addJob({ name: 'New Job', type: 'paving', notes: 'Test' });
    });
    expect(ctx.jobs.some((j: any) => j.name === 'New Job')).toBe(true);
    let persisted = JSON.parse(localStorage.getItem('scheduler-data')!);
    expect(persisted.jobs.some((j: any) => j.name === 'New Job')).toBe(true);

    // toggleResourceOnSite
    const resourceId = ctx.resources[0].id;
    const initialOnSite = ctx.resources[0].onSite;
    await act(async () => {
      ctx.toggleResourceOnSite(resourceId);
    });
    expect(ctx.resources.find((r: any) => r.id === resourceId)?.onSite).toBe(!initialOnSite);
    persisted = JSON.parse(localStorage.getItem('scheduler-data')!);
    expect(persisted.resources.find((r: any) => r.id === resourceId)?.onSite).toBe(!initialOnSite);

    // assignResource
    const jobId = ctx.jobs[0].id;
    let assignmentId: string | undefined;
    await act(async () => {
      assignmentId = ctx.assignResource(resourceId, jobId, 'crew' as RowType);
    });
    expect(ctx.assignments.find((a: any) => a.id === assignmentId)).toBeTruthy();
    persisted = JSON.parse(localStorage.getItem('scheduler-data')!);
    expect(persisted.assignments.find((a: any) => a.id === assignmentId)).toBeTruthy();

    // finalizeJob and unfinalizeJob
    await act(async () => {
      ctx.finalizeJob(jobId);
    });
    expect(ctx.jobs.find((j: any) => j.id === jobId)?.finalized).toBe(true);
    persisted = JSON.parse(localStorage.getItem('scheduler-data')!);
    expect(persisted.jobs.find((j: any) => j.id === jobId)?.finalized).toBe(true);

    await act(async () => {
      ctx.unfinalizeJob(jobId);
    });
    expect(ctx.jobs.find((j: any) => j.id === jobId)?.finalized).toBe(false);
    persisted = JSON.parse(localStorage.getItem('scheduler-data')!);
    expect(persisted.jobs.find((j: any) => j.id === jobId)?.finalized).toBe(false);
  });
});

