import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JobColumn from '../JobColumn';
import { SchedulerContext } from '../../../context/SchedulerContext';
import { Job } from '../../../types';

describe('JobColumn', () => {
  const baseJob: Job = { id: 'job-1', name: 'Job 1', type: 'paving', notes: 'Some notes' } as any;

  const renderWithContext = (job: Job, ctx: any) => {
    const value = {
      getJobNotes: () => [],
      assignments: [],
      getResourceById: () => undefined,
      removeJob: vi.fn(),
      finalizeJob: vi.fn(),
      unfinalizeJob: vi.fn(),
      ...ctx,
    } as any;
    render(
      <SchedulerContext.Provider value={value}>
        <JobColumn job={job} />
      </SchedulerContext.Provider>
    );
    return value;
  };

  test('toggles notes section', () => {
    renderWithContext(baseJob, {});
    expect(screen.queryByText(/Notes:/i)).toBeNull();
    fireEvent.click(screen.getByLabelText('Toggle notes'));
    expect(screen.getByText(/Notes:/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Toggle notes'));
    expect(screen.queryByText(/Notes:/i)).toBeNull();
  });

  test('finalize and unfinalize actions', () => {
    const assignments = [{ id: 'a1', jobId: 'job-1', resourceId: 'r1', row: 'crew' }];
    const finalizeJob = vi.fn();
    const unfinalizeJob = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    // Finalize
    renderWithContext(baseJob, { assignments, finalizeJob, unfinalizeJob });
    fireEvent.click(screen.getByTitle('Finalize job'));
    expect(finalizeJob).toHaveBeenCalledWith('job-1');

    // Unfinalize
    const jobFinal = { ...baseJob, finalized: true };
    renderWithContext(jobFinal, { assignments, finalizeJob, unfinalizeJob });
    fireEvent.click(screen.getByTitle('Unfinalize job'));
    expect(unfinalizeJob).toHaveBeenCalledWith('job-1');
  });

  test('exports job details', async () => {
    const jobFinal = { ...baseJob, finalized: true };
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    vi.spyOn(window, 'alert').mockReturnValue(undefined);

    renderWithContext(jobFinal, {});
    fireEvent.click(screen.getByText('Export'));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
  });
});
