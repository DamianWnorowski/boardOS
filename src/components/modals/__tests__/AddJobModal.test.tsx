import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AddJobModal from '../AddJobModal';
import { SchedulerContext } from '../../../context/SchedulerContext';

describe('AddJobModal', () => {
  test('submits form and closes', () => {
    const addJob = vi.fn();
    const onClose = vi.fn();
    render(
      <SchedulerContext.Provider value={{ addJob } as any}>
        <AddJobModal onClose={onClose} />
      </SchedulerContext.Provider>
    );

    fireEvent.change(screen.getByLabelText(/Job Name/i), { target: { value: 'New Job' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Job/i }));
    expect(addJob).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test('closes on cancel', () => {
    const onClose = vi.fn();
    render(
      <SchedulerContext.Provider value={{ addJob: vi.fn() } as any}>
        <AddJobModal onClose={onClose} />
      </SchedulerContext.Provider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
