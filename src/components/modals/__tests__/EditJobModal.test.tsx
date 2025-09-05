import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EditJobModal from '../EditJobModal';
import { SchedulerContext } from '../../../context/SchedulerContext';
import { Job } from '../../../types';

describe('EditJobModal', () => {
  const job: Job = { id: 'job-1', name: 'Job 1', type: 'paving' } as any;

  test('updates job and closes', () => {
    const updateJob = vi.fn();
    const onClose = vi.fn();
    render(
      <SchedulerContext.Provider value={{ updateJob } as any}>
        <EditJobModal job={job} onClose={onClose} />
      </SchedulerContext.Provider>
    );

    fireEvent.change(screen.getByLabelText(/Job Name/i), { target: { value: 'Updated Job' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Job/i }));
    expect(updateJob).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
