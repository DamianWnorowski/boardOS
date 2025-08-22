import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Board from '../Board';
import { SchedulerContext } from '../../../context/SchedulerContext';

describe('Board', () => {
  test('Add New Job button opens AddJobModal', () => {
    const contextValue = { jobs: [] } as any;
    render(
      <SchedulerContext.Provider value={contextValue}>
        <Board />
      </SchedulerContext.Provider>
    );

    expect(screen.queryByRole('heading', { name: /Add New Job/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Add New Job/i }));
    expect(screen.getByRole('heading', { name: /Add New Job/i })).toBeInTheDocument();
  });
});
