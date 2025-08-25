import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import JobColumn from '../JobColumn';
import { SchedulerContext } from '../../../context/SchedulerContext';
import { ModalContext } from '../../../context/ModalContext';
import { Job } from '../../../types';

// Mock JobRow component
vi.mock('../JobRow', () => ({
  default: ({ jobId, rowType, label }: { jobId: string; rowType: string; label: string }) => (
    <div data-testid={`job-row-${rowType}`}>
      Job Row: {label} for {jobId}
    </div>
  ),
}));

// Mock modals
vi.mock('../modals/JobNotesModal', () => ({
  default: ({ job, onClose, zIndex }: { job: Job; onClose: () => void; zIndex: number }) => (
    <div data-testid="job-notes-modal" style={{ zIndex }}>
      <h2>Job Notes for {job.name}</h2>
      <button onClick={onClose}>Close Notes</button>
    </div>
  ),
}));

describe('JobColumn', () => {
  const baseJob: Job = { id: 'job-1', name: 'Job 1', type: 'paving', notes: 'Some notes' } as any;

  const mockSchedulerContext = {
    getJobNotes: vi.fn(() => []),
    assignments: [],
    getResourceById: vi.fn(() => undefined),
    removeJob: vi.fn(),
    finalizeJob: vi.fn(),
    unfinalizeJob: vi.fn(),
    jobs: [],
    resources: [],
    addJob: vi.fn(),
    updateJob: vi.fn(),
    addResource: vi.fn(),
    removeResource: vi.fn(),
    assignResource: vi.fn(),
    removeAssignment: vi.fn(),
    getJobById: vi.fn(),
    getAssignmentById: vi.fn(),
    getResourcesByAssignment: vi.fn(),
    getAttachedAssignments: vi.fn(),
  };

  const mockModalContext = {
    modalState: { openModals: [], baseZIndex: 1000 },
    openModal: vi.fn(() => 1010),
    closeModal: vi.fn(),
    closeAllModals: vi.fn(),
    getZIndex: vi.fn(() => 1010),
  };

  const renderWithContext = (job: Job, ctx: any = {}) => {
    const value = {
      ...mockSchedulerContext,
      ...ctx,
    } as any;
    render(
      <SchedulerContext.Provider value={value}>
        <ModalContext.Provider value={mockModalContext as any}>
          <JobColumn job={job} />
        </ModalContext.Provider>
      </SchedulerContext.Provider>
    );
    return value;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('toggles notes section', () => {
    const jobWithNotes = { ...baseJob, notes: 'Test notes content' };
    renderWithContext(jobWithNotes, {});
    
    // Initially notes should not be visible
    expect(screen.queryByText(/Notes:/i)).toBeNull();
    
    // Click toggle to expand notes
    fireEvent.click(screen.getByLabelText('Toggle notes'));
    expect(screen.getByText(/Notes:/i)).toBeInTheDocument();
    expect(screen.getByText('Test notes content')).toBeInTheDocument();
    
    // Click toggle again to collapse notes
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

  test('shows finalized indicator for finalized jobs', () => {
    const jobFinal = { ...baseJob, finalized: true };
    renderWithContext(jobFinal, {});
    
    expect(screen.getByText('FINALIZED')).toBeInTheDocument();
    expect(screen.getByText('Send SMS')).toBeInTheDocument();
  });
});
