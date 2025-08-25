import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Board from '../Board';
import { SchedulerContext } from '../../../context/SchedulerContext';
import { ModalContext } from '../../../context/ModalContext';

// Mock the AddJobModal component
vi.mock('../modals/AddJobModal', () => ({
  default: ({ onClose, zIndex }: { onClose: () => void; zIndex: number }) => (
    <div style={{ zIndex }}>
      <h1>Add New Job</h1>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('Board', () => {
  // Mock context values
  const mockSchedulerContext = {
    jobs: [],
    resources: [],
    assignments: [],
    addJob: vi.fn(),
    removeJob: vi.fn(),
    updateJob: vi.fn(),
    addResource: vi.fn(),
    removeResource: vi.fn(),
    assignResource: vi.fn(),
    removeAssignment: vi.fn(),
    getJobById: vi.fn(),
    getResourceById: vi.fn(),
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

  const renderBoard = () => {
    return render(
      <SchedulerContext.Provider value={mockSchedulerContext as any}>
        <ModalContext.Provider value={mockModalContext as any}>
          <Board />
        </ModalContext.Provider>
      </SchedulerContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Add New Job button opens AddJobModal', () => {
    renderBoard();

    expect(screen.queryByRole('heading', { name: /Add New Job/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Add New Job/i }));
    expect(screen.getByRole('heading', { name: /Add New Job/i })).toBeInTheDocument();
    expect(mockModalContext.openModal).toHaveBeenCalledWith('add-job');
  });

  test('closes AddJobModal when cancel button is clicked', () => {
    renderBoard();

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /Add New Job/i }));
    expect(screen.getByRole('heading', { name: /Add New Job/i })).toBeInTheDocument();

    // Close modal via Cancel button
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockModalContext.closeModal).toHaveBeenCalledWith('add-job');
  });
});
