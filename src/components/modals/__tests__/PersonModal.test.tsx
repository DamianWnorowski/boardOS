import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PersonModal from '../PersonModal';
import { SchedulerProvider } from '../../../context/SchedulerContext';
import { Assignment, Resource } from '../../../types';

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

// Mock Portal component
vi.mock('../../common/Portal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="portal">{children}</div>
}));

const mockAssignment: Assignment = {
  id: 'test-assignment',
  resourceId: 'test-operator',
  jobId: 'test-job',
  row: 'crew',
  position: 0,
  timeSlot: { startTime: '08:00', endTime: '15:30', isFullDay: true },
  attachments: []
};

const mockOperator: Resource = {
  id: 'test-operator',
  name: 'John Doe',
  type: 'operator',
  classType: 'employee',
  identifier: 'OP001',
  onSite: true,
  location: 'Site A',
  allowedEquipment: ['paver', 'roller'],
  certifications: ['cdl'],
  skills: ['paver', 'screwman']
};

const mockSchedulerContext = {
  getResourceById: vi.fn(() => mockOperator),
  getJobById: vi.fn(() => ({ id: 'test-job', name: 'Test Job', shift: 'day' })),
  updateAssignmentNote: vi.fn(),
  updateResource: vi.fn(),
  toggleResourceOnSite: vi.fn(),
  isWorkingDouble: vi.fn(() => false),
  getResourceDoubleShiftJobs: vi.fn(() => ({ dayJob: undefined, nightJob: undefined }))
};

// Mock useScheduler hook
vi.mock('../../../context/SchedulerContext', async () => {
  const actual = await vi.importActual('../../../context/SchedulerContext');
  return {
    ...actual,
    useScheduler: () => mockSchedulerContext
  };
});

const MockedSchedulerProvider = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>; // Simplified mock provider
};

describe('PersonModal Equipment Permissions', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (assignment = mockAssignment) => {
    return render(
      <MockedSchedulerProvider>
        <PersonModal assignment={assignment} onClose={mockOnClose} />
      </MockedSchedulerProvider>
    );
  };

  it('displays current equipment permissions in stats tab', async () => {
    renderModal();
    
    // Check if equipment permissions section is shown
    expect(screen.getByText('Equipment Permissions')).toBeInTheDocument();
    expect(screen.getByText('Paver')).toBeInTheDocument();
    expect(screen.getByText('Roller')).toBeInTheDocument();
    expect(screen.getByText('Operator is authorized to operate these equipment types')).toBeInTheDocument();
  });

  it('shows equipment permissions checkbox list in edit tab', async () => {
    renderModal();
    
    // Switch to edit tab
    fireEvent.click(screen.getByText('Edit'));
    
    // Should show equipment permissions section
    await waitFor(() => {
      expect(screen.getByText('Allowed Equipment')).toBeInTheDocument();
    });
    
    // Check for some equipment types
    expect(screen.getByText('Skidsteer')).toBeInTheDocument();
    expect(screen.getByText('Paver')).toBeInTheDocument();
    expect(screen.getByText('Excavator')).toBeInTheDocument();
  });

  it('allows toggling equipment permissions', async () => {
    renderModal();
    
    // Switch to edit tab
    fireEvent.click(screen.getByText('Edit'));
    
    await waitFor(() => {
      expect(screen.getByText('Allowed Equipment')).toBeInTheDocument();
    });
    
    // Click on excavator to add permission
    const excavatorLabel = screen.getByText('Excavator').closest('label')!;
    fireEvent.click(excavatorLabel);
    
    // Click save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    // Should call updateResource with updated permissions
    expect(mockSchedulerContext.updateResource).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedEquipment: expect.arrayContaining(['excavator'])
      })
    );
  });

  it('saves all arrays properly when saving changes', async () => {
    renderModal();
    
    // Switch to edit tab
    fireEvent.click(screen.getByText('Edit'));
    
    // Make a change to trigger save
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'John Smith' } });
    
    // Click save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    
    // Should call updateResource with all arrays properly formatted
    expect(mockSchedulerContext.updateResource).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'John Smith',
        allowedEquipment: expect.any(Array),
        certifications: expect.any(Array),
        skills: expect.any(Array)
      })
    );
  });

  it('shows warning message when operator has no equipment permissions', async () => {
    // Mock operator with no permissions
    const operatorNoPermissions = {
      ...mockOperator,
      allowedEquipment: []
    };
    mockSchedulerContext.getResourceById.mockReturnValue(operatorNoPermissions);
    
    renderModal();
    
    // Switch to edit tab
    fireEvent.click(screen.getByText('Edit'));
    
    await waitFor(() => {
      expect(screen.getByText('No equipment selected - operator cannot operate any equipment')).toBeInTheDocument();
    });
  });

  it('does not show equipment permissions section for equipment resources', async () => {
    // Create equipment resource instead of operator
    const mockEquipment: Resource = {
      id: 'test-paver',
      name: 'Paver 1',
      type: 'paver',
      classType: 'equipment',
      identifier: 'PV001',
      onSite: true,
      location: 'Site A'
    };

    const equipmentAssignment: Assignment = {
      ...mockAssignment,
      resourceId: 'test-paver'
    };

    mockSchedulerContext.getResourceById.mockReturnValue(mockEquipment);
    
    renderModal(equipmentAssignment);
    
    // Should not show equipment permissions section
    expect(screen.queryByText('Equipment Permissions')).not.toBeInTheDocument();
    
    // Switch to edit tab
    fireEvent.click(screen.getByText('Edit'));
    
    // Should not show equipment permissions section in edit tab either
    expect(screen.queryByText('Allowed Equipment')).not.toBeInTheDocument();
  });
});