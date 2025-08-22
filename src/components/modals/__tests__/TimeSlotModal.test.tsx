import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TimeSlotModal from '../TimeSlotModal';
import { SchedulerContext } from '../../../context/SchedulerContext';
import { Assignment } from '../../../types';

describe('TimeSlotModal', () => {
  const assignment: Assignment = { id: 'a1', resourceId: 'r1', jobId: 'j1', row: 'crew' } as any;

  test('saves schedule and closes', () => {
    const updateTimeSlot = vi.fn();
    const onClose = vi.fn();
    const contextValue = {
      getResourceById: () => ({ name: 'Res' }),
      getJobById: () => ({ name: 'Job' }),
      updateAssignment: vi.fn(),
      updateTimeSlot,
    } as any;
    render(
      <SchedulerContext.Provider value={contextValue}>
        <TimeSlotModal assignment={assignment} otherAssignments={[]} onClose={onClose} />
      </SchedulerContext.Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Save Schedule/i }));
    expect(updateTimeSlot).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
